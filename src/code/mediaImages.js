// Media-folder image discovery (v2026.09.24.141).
//
// WHY THIS EXISTS
// `/local` (the www folder) is served without auth, which is why bundled images render from a plain
// path — but Home Assistant serves it with directory indexing OFF and exposes no API that lists it.
// So images under /local can be USED but never DISCOVERED.
//
// The media source integration is the opposite: it can be browsed over the websocket API, so files
// dropped there can be discovered automatically. That is the whole point of this module — mirror the
// same slats/ bottoms/ frames/ views/ layout under the media folder and anything you add shows up in
// the pickers without a card update.
//
// WHY VALUES ARE STORED AS `media:<type>/<file>`
// resolve_media hands back a SIGNED, EXPIRING url. Storing that in a card config or a Cover Style
// would work today and 404 next week. So the stored value is a stable reference and the signed url is
// fetched fresh each time the card builds its image set.
//
// FAILURE IS ALWAYS SOFT
// No media folder, integration unavailable, permissions, older HA — every path returns an empty list
// rather than throwing, so the pickers keep working with the bundled images alone.
import * as C from './constants.js';

export const MEDIA_PREFIX = 'media:';
// Mirrors the bundled layout so the same value shape works in both places.
export const MEDIA_ROOT = 'media-source://media_source/local';
export const MEDIA_BASE_DIR = 'images';

export const isMediaRef = (v) => typeof v === 'string' && v.startsWith(MEDIA_PREFIX);
export const mediaRefPath = (v) => (isMediaRef(v) ? v.slice(MEDIA_PREFIX.length) : v);

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

// type folder -> discovered [{ value, label }]; also caches the empty result so a missing folder is
// not re-browsed on every render.
const cache = new Map();
let warned = false;

function contentId(typeFolder) {
  return `${MEDIA_ROOT}/${MEDIA_BASE_DIR}/${typeFolder}`;
}

/** Browse one type folder. Resolves to [] on ANY failure — never throws. */
export async function scanMediaImages(hass, typeFolder) {
  if (!hass || !typeFolder) return [];
  if (cache.has(typeFolder)) return cache.get(typeFolder);
  let found = [];
  try {
    const res = await hass.callWS({
      type: 'media_source/browse_media',
      media_content_id: contentId(typeFolder),
    });
    const kids = (res && res.children) || [];
    found = kids
      .filter((k) => !k.can_expand && IMAGE_RE.test(String(k.media_content_id || '')))
      .map((k) => {
        // the browse id ends with the real path; keep only the file name for the label
        const id = String(k.media_content_id);
        const file = id.slice(id.lastIndexOf('/') + 1);
        return { value: `${MEDIA_PREFIX}${typeFolder}/${file}`, label: `${k.title || file} (media)` };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (e) {
    // Expected whenever the folder or the integration is absent. Say it once, at debug level, so it
    // is discoverable when someone is looking but silent otherwise.
    if (!warned) {
      warned = true;
      console.debug('[easy-cover-styler-card] media image folders not available '
        + `(looked for ${MEDIA_BASE_DIR}/<type> under the media folder): ${e && e.message}`);
    }
    found = [];
  }
  cache.set(typeFolder, found);
  return found;
}

/** Discard the cache so a newly-added file is picked up without a page reload. */
export function clearMediaImageCache() { cache.clear(); }

/**
 * Turn a stored `media:` reference into a url the browser can load.
 * Returns '' when it cannot be resolved, which lets the caller fall back to its default image.
 */
export async function resolveMediaRef(hass, value) {
  if (!hass || !isMediaRef(value)) return '';
  const path = mediaRefPath(value);
  try {
    const res = await hass.callWS({
      type: 'media_source/resolve_media',
      media_content_id: `${MEDIA_ROOT}/${MEDIA_BASE_DIR}/${path}`,
    });
    return (res && res.url) || '';
  } catch (e) {
    console.warn(`[easy-cover-styler-card] could not resolve media image "${value}": ${e && e.message}`);
    return '';
  }
}

/** Resolve every media reference in one pass; returns a { ref -> url } map. */
export async function resolveMediaRefs(hass, values) {
  const refs = [...new Set((values || []).filter(isMediaRef))];
  const out = {};
  await Promise.all(refs.map(async (r) => { out[r] = await resolveMediaRef(hass, r); }));
  return out;
}
