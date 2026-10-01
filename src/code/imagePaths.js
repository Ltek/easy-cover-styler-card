// Image path migration, deliberately in its own module.
//
// Both migrate.js (card configs) and coverStyles.js (saved styles in HA storage) need this, and
// migrate.js already imports coverStyles.js — putting it in either of them creates an import cycle.
// Cycles in this codebase are a known hazard: a module-scope reference to a not-yet-initialised
// binding throws a ReferenceError that `node --check` cannot see and that renders the card blank.
// This module imports constants only, so it can never take part in one.
import * as C from './constants.js';

// ---------------------------------------------------------------------------
// v2026.09.24.140: images moved into per-type folders under images/ and lost their esc-/psc-
// prefixes. Stored values name a file, so every card config AND every saved Cover Style has to be
// rewritten — the library lives in HA storage, so this runs when a style is resolved too.
const IMAGE_PATH_MAP = {
  'esc-awning-bottom.png': 'bottoms/awning-bottom.png',
  'esc-awning.png': 'slats/awning.png',
  'esc-blind.png': 'slats/blind.png',
  'esc-curtain-black.png': 'slats/curtain-black.png',
  'esc-curtain-grey.png': 'slats/curtain-grey.png',
  'esc-curtain.png': 'slats/curtain.png',
  'esc-frame-window-black.png': 'frames/frame-window-black.png',
  'esc-frame-window-grey.png': 'frames/frame-window-grey.png',
  'esc-screen.png': 'slats/screen.png',
  'esc-screen2.png': 'slats/screen2.png',
  'esc-shutter-bottom-black.png': 'bottoms/shutter-bottom-black.png',
  'esc-shutter-bottom-dark.png': 'bottoms/shutter-bottom-dark.png',
  'esc-shutter-bottom-mid.png': 'bottoms/shutter-bottom-mid.png',
  'esc-shutter-bottom.png': 'bottoms/shutter-bottom.png',
  'esc-shutter-bottom2.png': 'bottoms/shutter-bottom2.png',
  'esc-shutter-bottom3.png': 'bottoms/shutter-bottom3.png',
  'esc-shutter-slat-black.png': 'slats/shutter-slat-black.png',
  'esc-shutter-slat-dark.png': 'slats/shutter-slat-dark.png',
  'esc-shutter-slat-mid.png': 'slats/shutter-slat-mid.png',
  'esc-shutter-slat.png': 'slats/shutter-slat.png',
  'esc-shutter-slat2.png': 'slats/shutter-slat2.png',
  'esc-shutter-slat3.png': 'slats/shutter-slat3.png',
  'esc-view.png': 'views/view.png',
  'esc-view2.png': 'views/view2.png',
  'esc-window-black.png': 'frames/window-black.png',
  'esc-window-grey.png': 'frames/window-grey.png',
  'esc-window.png': 'frames/window.png',
  'esc-window2.png': 'frames/window2.png',
  'esc-window3.png': 'frames/window3.png',
  'gele_rechthoek.png': 'bottoms/gele_rechthoek.png',
  'psc-art.png': 'slats/art.png',
  'psc-art1.png': 'slats/art1.png',
  'psc-art3.png': 'slats/art3.png',
  'psc-art4.png': 'slats/art4.png',
  'psc-art_city.png': 'slats/art_city.png',
  'psc-frame_win1.png': 'frames/frame_win1.png',
  'psc-frame_win1_2.png': 'frames/frame_win1_2.png',
  'psc-frame_win2.png': 'frames/frame_win2.png',
  'psc-frame_window.png': 'frames/frame_window.png',
  'psc-outside_window.png': 'views/outside_window.png',
  'psc-outside_window1.png': 'views/outside_window1.png',
  'psc-outside_window2.png': 'views/outside_window2.png',
  'psc-outside_window3.png': 'views/outside_window3.png',
  'psc-outside_window4.png': 'views/outside_window4.png',
  'psc-outside_window5.png': 'views/outside_window5.png',
  'psc-outwin1.png': 'views/outwin1.png',
  'psc-outwin2.png': 'views/outwin2.png',
  'psc-outwin3.png': 'views/outwin3.png',
  'psc-pic_balcon_l.png': 'views/pic_balcon_l.png',
  'psc-pic_balcon_r.png': 'views/pic_balcon_r.png',
  'rode_rechthoek.png': 'slats/rode_rechthoek.png',
};
// These three solid-colour PNGs were dropped in v136 (superseded by the Custom colour control).
// Rather than break a config that used one, map it to the colour it actually was — sampled from the
// original pixels, so the cover keeps the same appearance with no file behind it.
const IMAGE_TO_COLOUR = {
  'psc-liteblue.png': '#1baef2',
  'psc-litegreen.png': '#bbfbcf',
  'psc-purple.png': '#e491ff',
};
const IMAGE_KEYS = [C.CONFIG_WINDOW_IMAGE, C.CONFIG_VIEW_IMAGE,
  C.CONFIG_SHUTTER_SLAT_IMAGE, C.CONFIG_SHUTTER_BOTTOM_IMAGE];

// Rewrite one stored image value. Anything already foldered, absolute, or a colour is returned as-is,
// which is what makes this safe to run repeatedly.
export function migrateImageValue(v) {
  if (typeof v !== 'string' || !v) return v;
  if (IMAGE_TO_COLOUR[v]) return IMAGE_TO_COLOUR[v];
  if (IMAGE_PATH_MAP[v]) return IMAGE_PATH_MAP[v];
  return v;
}
// Rewrite the image slots of any object holding them (a card config or a Cover Style group).
export function migrateImageKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  let out = null;
  IMAGE_KEYS.forEach((k) => {
    const v = obj[k];
    const nv = migrateImageValue(v);
    if (nv !== v) { out = out || { ...obj }; out[k] = nv; }
  });
  return out || obj;
}
