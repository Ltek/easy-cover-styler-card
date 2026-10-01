import * as C from './constants.js';
import {isMediaRef, resolveMediaRefs} from './mediaImages.js';
import {xyPair} from './xyPair.js';
import {
  defImagePathOrColor,
  isUrl
} from './functions.js';

export class EscImages {
    #escImageInfo = {};
    #uniqueImages = new Set();   // unique srcs to load — Set handles deduplication automatically
    #dimensions = new Map();     // src → xyPair(width, height)
    #srcImageType = new Map();   // src → image_type, needed for fallback lookup on load error
    #resolvedSrc = new Map();    // original src → actual src to use
    // v2026.09.24.177: called when an image had to be measured late (see #getImageSize).
    #onLate = null;
    #pending = new Set();
    #warned = new Set();
    constructor(shutterCfgs, onLate = null) {
        this.#onLate = typeof onLate === 'function' ? onLate : null;

        for (const imageType of C.IMAGE_TYPES) {
            let imageRefs = {};

            for (const shutterCfg of shutterCfgs) {

                let map = shutterCfg.imageMap();
                let image = shutterCfg.getImage(imageType);
                // v141: a `media:` reference is a stable pointer, not a path — hold it as-is here and
                // swap in the signed url during processImages(). Passing it through
                // defImagePathOrColor() would mangle it (no leading '/', so it would be treated as
                // relative to the image map).
                image = isMediaRef(image) ? image : defImagePathOrColor(map, image);


                if (image) {
                    let src = image.replace(/([^:]\/)\/+/g, "/").trim();
                    // Set.add is a no-op for duplicates — no if/else needed
                    this.#uniqueImages.add(src);
                    // Only record the first image_type seen for this src (used for fallback)
                    if (!this.#srcImageType.has(src)) {
                        this.#srcImageType.set(src, imageType);
                    }
                    imageRefs[shutterCfg.id()] = { src };
                } else {
                    imageRefs[shutterCfg.id()] = { src: '' };
                }
            }

            this.#escImageInfo[imageType] = imageRefs;
        }
    }

    // --- src getters ---

    getWindowImageSrc(id) {
        return this.#getImageSrc(C.CONFIG_WINDOW_IMAGE, id);
    }
    getViewImageSrc(id) {
        return this.#getImageSrc(C.CONFIG_VIEW_IMAGE, id);
    }
    getShutterSlatImageSrc(id) {
        return this.#getImageSrc(C.CONFIG_SHUTTER_SLAT_IMAGE, id);
    }
    getShutterBottomImageSrc(id) {
        return this.#getImageSrc(C.CONFIG_SHUTTER_BOTTOM_IMAGE, id);
    }
    #getImageSrc(image_type, id) {
        let src = this.#escImageInfo[image_type][id]?.src ?? '';
        src = this.#resolvedSrc.get(src) ?? src;
        return src;
    }

    // --- size getters ---

    getWindowImageSize(id) {
        return this.#getImageSize(C.CONFIG_WINDOW_IMAGE, id);
    }
    getViewImageSize(id) {
        return this.#getImageSize(C.CONFIG_VIEW_IMAGE, id);
    }
    getShutterSlatImageSize(id) {
        return this.#getImageSize(C.CONFIG_SHUTTER_SLAT_IMAGE, id);
    }
    getShutterBottomImageSize(id) {
        return this.#getImageSize(C.CONFIG_SHUTTER_BOTTOM_IMAGE, id);
    }
    #getImageSize(image_type, id) {
        const info = this.#escImageInfo[image_type] || {};
        const src = info[id]?.src;
        if (!src) {
            // a cover drawn with an id this set never saw — say so once, it explains a missing image
            if (!(id in info) && !this.#warned.has(image_type + id)) {
                this.#warned.add(image_type + id);
                console.debug('[easy-cover-styler-card] no image entry for cover id', id, image_type);
            }
            return new xyPair(0, 0);
        }
        const d = this.#dimensions.get(src);
        if (d) return d;
        // v2026.09.24.177: SELF-HEAL. An image with no measured size draws at 0 — for a slat that is
        // "no fabric", a closed curtain that looks open. Whatever the cause (a load that lost a race,
        // a slow response), measure it now and ask the card to redraw instead of staying wrong.
        if (isUrl(src) && !this.#pending.has(src)) {
            this.#pending.add(src);
            console.debug('[easy-cover-styler-card] measuring late:', src);
            const img = new Image();
            img.onload = () => {
                this.#dimensions.set(src, new xyPair(img.width, img.height));
                this.#pending.delete(src);
                if (this.#onLate) { try { this.#onLate(); } catch (e) {} }
            };
            img.onerror = () => {
                this.#pending.delete(src);
                console.warn('[easy-cover-styler-card] image failed to load:', src);
            };
            img.src = src;
        }
        return new xyPair(0, 0);
    }

    // --- loading ---

    async processImages(hass) {
        try {
            await this.#resolveMediaSources(hass);
            await this.#readImageDimensions();
        } catch (error) {
            console.error('Failed to load image dimensions:', error);
        }
    }

    // Swap every `media:` reference for a freshly signed url. Done before dimensions are read so the
    // measured size belongs to the real file. A ref that cannot be resolved is dropped to '' and the
    // existing per-type default takes over.
    async #resolveMediaSources(hass) {
        const refs = [...this.#uniqueImages].filter(isMediaRef);
        if (!refs.length) return;
        const urls = await resolveMediaRefs(hass, refs);
        refs.forEach((ref) => {
            const url = urls[ref] || '';
            this.#uniqueImages.delete(ref);
            if (url) {
                this.#uniqueImages.add(url);
                if (!this.#srcImageType.has(url) && this.#srcImageType.has(ref)) {
                    this.#srcImageType.set(url, this.#srcImageType.get(ref));
                }
            }
            this.#srcImageType.delete(ref);
            // point every cover that referenced it at the resolved url
            for (const imageType of C.IMAGE_TYPES) {
                const byId = this.#escImageInfo[imageType] || {};
                Object.keys(byId).forEach((id) => { if (byId[id] && byId[id].src === ref) byId[id].src = url; });
            }
        });
    }

    async #readImageDimensions() {
        const promises = [];

        for (const src of this.#uniqueImages) {
            if (!isUrl(src)) continue;

            const promise = new Promise((resolve) => {
                const img = new Image();

                img.onload = () => {
                    this.#dimensions.set(src, new xyPair(img.width, img.height));
                    this.#resolvedSrc.set(src, src); // original src is fine
                    resolve();
                };

                img.onerror = () => {
                    // Arrow function: `this` correctly refers to the EscImages instance
                    const imageType = this.#srcImageType.get(src);
                    const defaultFile = C.CONFIG_DEFAULT[imageType];
                    const fallbackSrc = `${C.ESC_IMAGE_MAP}/${defaultFile}`;
                    console.warn(`Failed to load image: ${src}, using default: ${fallbackSrc}`);

                    const fallbackImg = new Image();

                    fallbackImg.onload = () => {
                        // Store fallback dimensions under the original src key
                        // so all existing references in #escImageInfo remain valid
                        this.#dimensions.set(src, new xyPair(fallbackImg.width, fallbackImg.height));
                        this.#resolvedSrc.set(src, fallbackSrc); // ← remap src
                        resolve();
                    };
                    fallbackImg.onerror = () => {
                        // Fallback also failed — store zero size and move on.
                        // Never reject: we want Promise.all to load as much as possible.
                        this.#dimensions.set(src, new xyPair(0, 0));
                        this.#resolvedSrc.set(src, fallbackSrc); // ← remap src
                        resolve();
                    };
                    fallbackImg.src = fallbackSrc;
                };

                img.src = src;
            });

            promises.push(promise);
        }

        await Promise.all(promises);
    }
}
