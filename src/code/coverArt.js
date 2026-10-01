// Classic (image) cover art — ONE drawing function for the live card AND the editor preview
// (v2026.09.24.179). They used to draw covers two different ways and kept disagreeing; now they
// cannot, because it is the same code.
//
// Layers, bottom to top: view (image or colour) -> cover box -> window frame.
// The cover box is anchored to the edge the cover starts from and is `len` long along the closing
// direction, clipping everything inside it. Its fabric (slat image, tiled) and the bottom bar are
// pinned to the box's LEADING edge, so they travel with it the way a real cover does.
//
// Sizes are percentages of the window, never measured image sizes, so the drawing is correct on the
// first frame — there is nothing to measure late. (The old live renderer computed pixel sizes from
// each image's measured dimensions; an image measured late drew the cover at the wrong size.)
//
// Only the drawing lives here. Dragging, the Favorite-position marker and the overlays are separate
// layers the live card keeps around this. Venetian tilt keeps its own slat renderer.
import {html} from './lit/lit-core.min.js';

// a file reference (possibly a signed media URL with a query string) vs a CSS colour
export const isImageFile = (v) => typeof v === 'string' && v.trim() !== '' && (
  /^(data:|blob:|https?:|\/|\.\/|\.\.\/)/i.test(v.trim()) || /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(v));

/**
 * @param {object} o
 *   W, H          window size in CSS px (only used to size the turned layers of sideways covers)
 *   dir           closing direction: 'down' | 'up' | 'left' | 'right'
 *   rotate        "Rotate Slat With Direction": turn the slat strip 90deg for sideways travel
 *   len           covered length along the closing direction, as a CSS length ('37.5%')
 *   view, slat, bottom, frame   resolved image URL, or a CSS colour, or '' for none
 *   stretchBottom stretch the bottom bar across the full width
 *   bottomPx      the bottom bar's thickness in px when known (else it scales with its width)
 */
export function classicArt(o) {
  const W = Number(o.W) || 0, H = Number(o.H) || 0;
  const dir = o.dir === 'up' || o.dir === 'left' || o.dir === 'right' ? o.dir : 'down';
  const horiz = dir === 'left' || dir === 'right';

  // the edge the cover starts from, and the length it covers
  const anchor = { down: 'top:0;left:0;right:0;', up: 'bottom:0;left:0;right:0;',
    right: 'left:0;top:0;bottom:0;', left: 'right:0;top:0;bottom:0;' }[dir];
  const box = `position:absolute;overflow:hidden;${anchor}${horiz ? 'width:' : 'height:'}${o.len};`;
  // the leading edge, where the fabric is pinned and the bottom bar sits
  const lead = { down: 'bottom', up: 'top', right: 'right', left: 'left' }[dir];

  // --- fabric -------------------------------------------------------------------------------
  let fabric = '';
  if (isImageFile(o.slat)) {
    const img = `background-image:url("${o.slat}");`;
    if (!horiz) {
      // strip spans the width, repeats down the cover
      fabric = html`<div style="position:absolute;inset:0;${img}background-repeat:repeat-y;
        background-size:100% auto;background-position:center ${lead};"></div>`;
    } else if (!o.rotate) {
      // upright strip (a curtain fold) spans the height, repeats across
      fabric = html`<div style="position:absolute;inset:0;${img}background-repeat:repeat-x;
        background-size:auto 100%;background-position:${lead} center;"></div>`;
    } else {
      // a strip drawn for downward travel, turned 90deg: lay it out on a layer the size of the
      // window with its axes swapped, then rotate the layer into place. After the turn the layer's
      // local top is the screen's right side, so pin the pattern to whichever local edge is leading.
      const at = dir === 'right' ? `left:calc(100% - ${W}px);` : 'left:0;';
      fabric = html`<div style="position:absolute;top:0;${at}width:${H}px;height:${W}px;${img}
        background-repeat:repeat-y;background-size:100% auto;
        background-position:center ${dir === 'right' ? 'top' : 'bottom'};
        transform-origin:top left;transform:translateX(${W}px) rotate(90deg);"></div>`;
    }
  } else if (o.slat) {
    fabric = html`<div style="position:absolute;inset:0;background:${o.slat};"></div>`;
  }

  // --- bottom bar, on the leading edge --------------------------------------------------------
  // Drawn as for downward travel — a full-width bar `t` px thick — and stood upright for sideways
  // travel. Stretch fills the width with one copy; otherwise the image repeats at its own aspect.
  // With no known thickness a stretched bar keeps the image's aspect (an <img> at full width) and
  // a repeating bar uses 8px, which is what the bundled bars are drawn at to within a pixel.
  let bottom = '';
  if (o.bottom) {
    const file = isImageFile(o.bottom);
    const px = Number(o.bottomPx) > 0 ? Number(o.bottomPx) : 0;
    const t = px || 8;
    const bar = (w) => html`<div style="width:${w};height:${t}px;${file
      ? `background-image:url("${o.bottom}");background-repeat:repeat-x;background-size:${o.stretchBottom ? '100% 100%' : 'auto 100%'};`
      : `background:${o.bottom};`}"></div>`;
    if (!horiz) {
      bottom = html`<div style="position:absolute;left:0;right:0;${lead}:0;line-height:0;pointer-events:none;">
        ${(file && o.stretchBottom && !px)
          ? html`<img src=${o.bottom} style="display:block;width:100%;height:auto;">`
          : bar('100%')}</div>`;
    } else {
      bottom = html`<div style="position:absolute;top:0;bottom:0;${lead}:0;width:${t}px;pointer-events:none;">
        <div style="position:absolute;top:0;left:0;transform-origin:top left;transform:translateX(${t}px) rotate(90deg);">
          ${bar(H + 'px')}</div></div>`;
    }
  }

  const view = isImageFile(o.view)
    ? html`<img src=${o.view} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;">`
    : (o.view ? html`<div style="position:absolute;inset:0;background:${o.view};"></div>` : '');
  const frame = isImageFile(o.frame)
    ? html`<img src=${o.frame} style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;">`
    : '';

  return html`<div class="esc-art" style="position:absolute;inset:0;overflow:hidden;">
    ${view}<div class="esc-art-cover" style="${box}">${fabric}${bottom}</div>${frame}
  </div>`;
}

// Covered length (% of the window) from the open % and the two travel offsets — the same maths the
// live card's screen position uses, so the preview lands the cover in the same place.
export function coveredPct(openPct, offsetOpenedPct, offsetClosedPct) {
  const a = Math.max(0, Number(offsetOpenedPct) || 0);
  const b = Math.max(0, Number(offsetClosedPct) || 0);
  const open = Math.max(0, Math.min(100, Number(openPct) || 0));
  return Math.max(0, Math.min(100, a + (100 - a - b) * (100 - open) / 100));
}
