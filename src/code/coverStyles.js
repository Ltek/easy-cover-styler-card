/**
 * Cover Style library — named bundles of PER-COVER settings (images, control/info placement,
 * rotation, sizing) that can be assigned to areas or individual covers, so one card can show
 * roller shades, cellular shades and curtains together under one shared visual theme.
 *
 * Design notes (see docs/COVER_STYLE_LIBRARY_SPEC.md):
 *  - Library-only: styles live in the shared System store. Built-ins are read-only; duplicate to edit.
 *  - A Cover Style LINKS to its slider (modern-bar) settings via `slider_source` rather than holding a
 *    copy: one definition in the library, and editing it updates every style using it. There is no
 *    "detach to a frozen copy" counterpart — a second look is a second library entry, which stays
 *    reusable and discoverable where a hidden copy would not be.
 *  - Nothing can drift, so there is no staleness concept. (Earlier builds embedded a copy to dodge the
 *    v66 "lib: ref renders as default" bug; that was really a SUBSCRIPTION bug, fixed properly in
 *    v144 when every library learned to notify all of its listeners instead of only the first.)
 *  - Portability comes from the EXPORT carrying its referenced library entries, not from embedding.
 *  - Card-level looks (colors, fonts, area/%-button styles, divider style, scaling) are NOT in a style.
 */
import { bumpLibRev } from './libRev.js';
import * as C from './constants.js';
import { resolveModernStyle } from './modernStyles.js';
import { migrateImageKeys } from './imagePaths.js';
import { stripDeadKeys } from './deadKeys.js';

// ---- which config keys a Cover Style owns -----------------------------------
export const COVER_STYLE_KEYS = [
  // visual + images
  C.CONFIG_COVER_VISUAL, C.CONFIG_IMAGE_MAP,
  C.CONFIG_WINDOW_IMAGE, C.CONFIG_VIEW_IMAGE, C.CONFIG_SHUTTER_SLAT_IMAGE, C.CONFIG_SHUTTER_BOTTOM_IMAGE,
  C.CONFIG_ROTATE_SLATS_SHUTTER_IMAGE, C.CONFIG_STRETCH_EDGE_SHUTTER_IMAGE,
  // rotation (merged in — supersedes the legacy per-area area_orientation map)
  C.CONFIG_PANEL_ROTATION,
  // control placement
  C.CONFIG_STANDARD_POSITION, C.CONFIG_SLIDER_POSITION, C.CONFIG_TILT_POSITION, C.CONFIG_PRESETS_POSITION,
  C.CONFIG_STANDARD_ORIENTATION, C.CONFIG_PRESETS_ORIENTATION, C.CONFIG_BUTTONS_POSITION,
  // info placement
  C.CONFIG_NAME_POSITION, C.CONFIG_ICONS_POSITION, C.CONFIG_NAME_ALIGN, C.CONFIG_POS_ALIGN,
  C.CONFIG_POSITION_PLACEMENT, C.CONFIG_PANEL_POS_END,
  C.CONFIG_BATTERY_POSITION, C.CONFIG_SIGNAL_POSITION, C.CONFIG_BATTERY_ALIGN, C.CONFIG_SIGNAL_ALIGN,
  // header: text styles + row layout (entity IDs for battery/signal stay card-level — a shared
  // style must never carry another system's sensor)
  C.CONFIG_NAME_TEXT_SIZE, C.CONFIG_NAME_TEXT_WEIGHT, C.CONFIG_NAME_TEXT_COLOR, C.CONFIG_ALWAYS_PCT, C.CONFIG_HEADER_ON_COVER, C.CONFIG_NAME_COVER_GAP, C.CONFIG_POS_COVER_GAP,
  // per-element show/hide (the eyes) — part of the panel's look
  C.CONFIG_SHOW_NAME, C.CONFIG_SHOW_WINDOW, C.CONFIG_SHOW_STANDARD_BUTTONS,
  C.CONFIG_SHOW_OPEN_CLOSE_SLIDER, C.CONFIG_SHOW_TILT_BUTTONS, C.CONFIG_SHOW_TILT_SLIDER,
  C.CONFIG_SHOW_PARTIAL_OPEN_BUTTONS, C.CONFIG_PANEL_POS_SHOW,
  C.CONFIG_SHOW_BATTERY, C.CONFIG_SHOW_SIGNAL,
  // control look: icon colour, custom mdi overrides, button padding/margin
  C.CONFIG_CONTROL_ICON_COLOR,
  C.CONFIG_ICON_UP, C.CONFIG_ICON_DOWN, C.CONFIG_ICON_STOP, C.CONFIG_ICON_PARTIAL,
  C.CONFIG_ICON_TILT_UP, C.CONFIG_ICON_TILT_DOWN,
  // panel position readout styling
  C.CONFIG_PANEL_POS_SIZE, C.CONFIG_PANEL_POS_WEIGHT, C.CONFIG_PANEL_POS_COLOR,
  // preset (%) buttons: style + colours. NOTE pct_button_style is a lib: ref to the Button Styles
  // library, so unlike the embedded slider it can degrade on another system.
  C.CONFIG_PARTIAL_BUTTONS_STYLE, C.CONFIG_PCT_ICON_COLOR, C.CONFIG_PCT_BUTTON_STYLE,
  C.CONFIG_PCT_BUTTON_BG, C.CONFIG_PCT_BUTTON_BORDER, C.CONFIG_PCT_BUTTON_COLOR,
  C.CONFIG_PCT_BUTTON_WEIGHT, C.CONFIG_PCT_BUTTON_SIZE,
  // in-panel spacing (between the panel's own sections) C.CONFIG_HEADER_IMAGE_GAP,
  // behaviour/geometry that belongs to the physical cover
  C.CONFIG_CLOSING_DIRECTION, C.CONFIG_BASE_WIDTH_PX, C.CONFIG_BASE_HEIGHT_PX,
  C.CONFIG_RESIZE_WIDTH_PCT, C.CONFIG_RESIZE_HEIGHT_PCT,
  C.CONFIG_TILT_ANGLE_MIN, C.CONFIG_TILT_ANGLE_MAX, C.CONFIG_PARTIAL_CLOSE_PCT,
  C.CONFIG_OFFSET_OPENED_PCT, C.CONFIG_OFFSET_CLOSED_PCT, C.CONFIG_OFFSET_IS_CLOSED_PCT,
  // how this cover type behaves: travel model, inversion, presets, per-state button hiding.
  // NOTE modern_second_entity (the TDBU top-rail entity id) is deliberately NOT here — entity ids
  // must never travel inside a shared style.
  C.CONFIG_MODERN_TRAVEL,
  C.CONFIG_INVERT_PCT_UI, C.CONFIG_INVERT_PCT_COVER,
  C.CONFIG_INVERT_OPEN_CLOSE_UI, C.CONFIG_INVERT_OPEN_CLOSE_COVER,
  C.CONFIG_INVERT_PCT_TILT_UI, C.CONFIG_INVERT_PCT_TILT_COVER,
  C.CONFIG_POSITION_PRESETS, C.CONFIG_DISABLE_END_BUTTONS,
  C.CONFIG_BUTTON_OPENED_HIDE_STATES, C.CONFIG_BUTTON_CLOSED_HIDE_STATES, C.CONFIG_BUTTON_STOP_HIDE_STATES,
  C.CONFIG_BUTTON_UP_HIDE, C.CONFIG_BUTTON_DOWN_HIDE, C.CONFIG_BUTTON_STOP_HIDE,
  C.CONFIG_BUTTON_UP_STATE_COLOR, C.CONFIG_BUTTON_DOWN_STATE_COLOR, C.CONFIG_BUTTON_STOP_STATE_COLOR,
  C.CONFIG_CONTROLS_BUTTON_GAP, C.CONFIG_CONTROLS_PAD_TOP, C.CONFIG_CONTROLS_PAD_RIGHT,
  C.CONFIG_CONTROLS_PAD_BOTTOM, C.CONFIG_CONTROLS_PAD_LEFT,
  C.CONFIG_PCT_BUTTON_GAP, C.CONFIG_PCT_PAD_TOP, C.CONFIG_PCT_PAD_RIGHT, C.CONFIG_PCT_PAD_BOTTOM, C.CONFIG_PCT_PAD_LEFT,
  C.CONFIG_LC_SHOW_TIME, C.CONFIG_LC_SHOW_AGO, C.CONFIG_LC_PLACEMENT, C.CONFIG_LC_ALIGN,
  C.CONFIG_LC_SIZE, C.CONFIG_LC_WEIGHT, C.CONFIG_LC_COLOR, C.CONFIG_LC_COVER_GAP,
];

// A style entry: { name, groups: {<config key>: value, …}, slider: {…}, slider_source: slug }
// `groups` holds only the keys the style actually sets (sparse => byte-stable).

const CS_LIB_KEY = 'easy_cover_styler_cover_styles';
const CS_LIB_VERSION = 1;
const CS_LIBRARY = { system: { map: null, loaded: false, subscribed: false } };
// v2026.09.24.181: LIVE DRAFT. While a style is open in the editor, its unsaved values are published
// here so the card in the dashboard editor's preview pane shows them as you type. Nothing is written
// to Home Assistant; Save stores the style as before, Cancel clears the draft and the card reverts.
// The editor and the preview card are the same bundle in the same page, so this module state is shared.
const CS_DRAFTS = new Map();
let _csdTimer = null;
function _csdNotify(st) {
  clearTimeout(_csdTimer);
  _csdTimer = setTimeout(() => {
    (st.listeners || new Set()).forEach((fn) => { try { fn(); } catch (e) {} });
  }, 300);
}
/** Publish (entry) or clear (null) the unsaved draft of one Cover Style. */
export function setCoverStyleDraft(slug, entry) {
  if (!slug || slug === '__new__') return;
  if (entry) CS_DRAFTS.set(slug, entry); else if (!CS_DRAFTS.delete(slug)) return;
  _csdNotify(CS_LIBRARY.system);
}


const BUILTIN_PREFIX = '__cs_';
export const COVER_STYLE_DEFAULT_SLUG = '__cs_modern_bar__';

const prettify = (s) => String(s || '')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (m) => m.toUpperCase());

export function builtinCoverStyleSlug(type) {
  return `${BUILTIN_PREFIX}${String(type).replace(/[^a-z0-9]+/gi, '_')}__`;
}

// ---- built-in, read-only styles ---------------------------------------------
// Seeded programmatically from the existing cover-type presets (ESC_PRESET) so a built-in Cover
// Style renders exactly like today's `shutter_preset` of the same name.
function buildBuiltins() {
  // v2026.09.24.155: FOUR curated built-ins, not eleven thin cover-type stubs. The old set was
  // generated from the legacy ESC_PRESET table, so most set only 3-8 keys and several were near
  // duplicates — and because a built-in could not be overridden, a bad default in any of them was
  // unfixable. These four are deliberate examples, each demonstrating options a user would reach
  // for, and any of them can now be unlocked (overridden in the library) and reset back to here.
  const out = {};

  // 1. Color Slider — no images at all. Handle-attached readout, controls in a column beside the bar.
  out[COVER_STYLE_DEFAULT_SLUG] = {
    name: 'Color Slider',
    builtin: true,
    groups: {
      [C.CONFIG_COVER_VISUAL]: 'modern',
      [C.CONFIG_POSITION_PLACEMENT]: 'on-handle',
      [C.CONFIG_PANEL_POS_END]: 'above',
      [C.CONFIG_PANEL_POS_SHOW]: true,
      [C.CONFIG_NAME_POSITION]: C.TOP,
      [C.CONFIG_NAME_COVER_GAP]: 6,
      [C.CONFIG_STANDARD_POSITION]: C.BOTTOM,
      [C.CONFIG_STANDARD_ORIENTATION]: 'column',
      [C.CONFIG_BASE_WIDTH_PX]: 50,
    },
    slider: null,
    slider_source: '__modern_neon__',   // ships in code, so it always resolves
  };

  // 2. Roller Shutter — the full image stack: frame, outdoor view, slats and a bottom bar.
  out[builtinCoverStyleSlug('roller-shutter')] = {
    name: 'Roller Shutter',
    builtin: true,
    groups: {
      [C.CONFIG_COVER_VISUAL]: 'image',
      [C.CONFIG_WINDOW_IMAGE]: 'frames/window.png',
      [C.CONFIG_VIEW_IMAGE]: 'views/view.png',
      [C.CONFIG_SHUTTER_SLAT_IMAGE]: 'slats/shutter-slat.png',
      [C.CONFIG_SHUTTER_BOTTOM_IMAGE]: 'bottoms/shutter-bottom.png',
      [C.CONFIG_CLOSING_DIRECTION]: C.DOWN,
      [C.CONFIG_NAME_POSITION]: C.TOP,
      [C.CONFIG_NAME_COVER_GAP]: 4,
      [C.CONFIG_POSITION_PLACEMENT]: C.BOTTOM,
      [C.CONFIG_PANEL_POS_SHOW]: true,
      [C.CONFIG_POS_COVER_GAP]: 4,
    },
    slider: null,
    slider_source: '',
  };

  // 3. Curtain — closes sideways, and shows off a SIDE-placed name (left) with the readout opposite.
  out[builtinCoverStyleSlug('curtain')] = {
    name: 'Curtain',
    builtin: true,
    groups: {
      [C.CONFIG_COVER_VISUAL]: 'image',
      [C.CONFIG_WINDOW_IMAGE]: 'frames/window.png',
      [C.CONFIG_VIEW_IMAGE]: 'views/view.png',
      [C.CONFIG_SHUTTER_SLAT_IMAGE]: 'slats/curtain.png',
      [C.CONFIG_CLOSING_DIRECTION]: C.LEFT,
      [C.CONFIG_NAME_POSITION]: C.LEFT,
      [C.CONFIG_NAME_COVER_GAP]: 8,
      [C.CONFIG_POSITION_PLACEMENT]: C.RIGHT,
      [C.CONFIG_PANEL_POS_SHOW]: true,
      [C.CONFIG_POS_COVER_GAP]: 8,
    },
    slider: null,
    slider_source: '',
  };

  // 4. Shade — the MINIMAL, visual-agnostic one. Deliberately does NOT set cover_visual: a shade is a
  // cover type, not a visual choice, so it inherits whatever the card is set to (v156 regression: an
  // earlier version forced 'image', which silently flipped a modern-bar card to images). Its showcase
  // is a COLOUR slat rather than an image file, which simply has no effect in Color Slider mode.
  out[builtinCoverStyleSlug('shade')] = {
    name: 'Shade',
    builtin: true,
    groups: {
      [C.CONFIG_SHUTTER_SLAT_IMAGE]: 'var(--primary-color)',
      [C.CONFIG_VIEW_IMAGE]: 'views/view.png',
      [C.CONFIG_CLOSING_DIRECTION]: C.DOWN,
      [C.CONFIG_SHOW_WINDOW]: true,
      [C.CONFIG_NAME_POSITION]: C.TOP,
      [C.CONFIG_NAME_COVER_GAP]: 4,
      [C.CONFIG_PANEL_POS_SHOW]: false,
      [C.CONFIG_BASE_WIDTH_PX]: 70,
    },
    slider: null,
    slider_source: '',
  };
  return out;
}
let _builtins = null;
export function builtinCoverStyles() {
  if (!_builtins) _builtins = buildBuiltins();
  return _builtins;
}
export function isBuiltinCoverStyleSlug(slug) { return !!builtinCoverStyles()[slug]; }
export function coverStyleRefSlug(ref) {
  return (typeof ref === 'string' && ref.startsWith('lib:')) ? ref.slice(4) : null;
}

// ---- shared System store (same pattern as the Slider/Button style libraries) -
function _normalize(slug, p) {
  return {
    slug,
    name: p.name || slug,
    builtin: !!p.builtin,
    groups: (p.groups && typeof p.groups === 'object') ? stripDeadKeys(p.groups) : {},   // v165
    slider: (p.slider && typeof p.slider === 'object') ? p.slider : null,
    slider_source: p.slider_source || '',
  };
}
function _parseValue(value) {
  const map = {};
  if (!value || typeof value !== 'object') return map;
  const presets = (value.presets && typeof value.presets === 'object') ? value.presets : value;
  Object.keys(presets).forEach((slug) => {
    const p = presets[slug];
    if (p && typeof p === 'object' && slug !== CS_LIB_KEY) map[slug] = _normalize(slug, p);
  });
  return map;
}
export function ensureCoverStyleLibrary(hass, onChange) {
  const st = CS_LIBRARY.system;
  // v2026.09.24.144: keep a LIST of listeners. The old code subscribed once and captured only that
  // first caller's callback, so whichever of the card or the editor reached here first won the
  // subscription and the other was never told about a change. In practice the editor usually won,
  // which is why saving a style did not refresh the card preview beside it — the preview only picked
  // the change up when the element was recreated.
  st.listeners = st.listeners || new Set();
  if (typeof onChange === 'function') st.listeners.add(onChange);
  if (!hass || !hass.connection || st.subscribed) return;
  const conn = hass.connection;
  if (typeof conn.subscribeMessage === 'function') {
    st.subscribed = true;
    try {
      conn.subscribeMessage((ev) => {
        st.map = _parseValue(ev && ev.value);
        st.loaded = true;
        bumpLibRev();
        st.listeners.forEach((fn) => { try { fn(); } catch (e) {} });
      }, { type: 'frontend/subscribe_system_data', key: CS_LIB_KEY });
    } catch (e) { st.subscribed = false; }
  }
}
export function coverStyleLibraryMap() { return CS_LIBRARY.system.map || {}; }
export function saveCoverStyleLibrary(hass, map) {
  if (!hass || !hass.connection || typeof hass.connection.sendMessagePromise !== 'function') {
    return Promise.reject(new Error('No connection'));
  }
  const presets = {};
  Object.keys(map || {}).forEach((slug) => {
    // v155: a built-in slug IS persisted when present — that saved copy is the unlock/override.
    // Reset simply removes it from the map before saving.
    const e = map[slug] || {};
    presets[slug] = {
      name: e.name || slug,
      groups: e.groups || {},
      // v148: drop an embedded slider copy when a source is recorded (see migrate.js rationale)
      slider: (e.slider && e.slider_source) ? null : (e.slider || null),
      slider_source: e.slider_source || '',
    };
  });
  const value = { [CS_LIB_KEY]: CS_LIB_VERSION, presets };
  CS_LIBRARY.system.map = {};
  Object.keys(presets).forEach((slug) => { CS_LIBRARY.system.map[slug] = _normalize(slug, presets[slug]); });
  return hass.connection.sendMessagePromise({ type: 'frontend/set_system_data', key: CS_LIB_KEY, value });
}
export function slugifyCoverStyleName(name) {
  const base = String(name || 'style').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'style';
  const map = coverStyleLibraryMap();
  let slug = base, n = 2;
  while (map[slug] || slug.startsWith('__')) slug = `${base}_${n++}`;
  return slug;
}
// v155: the LIBRARY wins over a built-in of the same slug — a saved copy shadows the shipped one.
// v160 uses this for authoring the built-ins in place (see BUILTINS_EDITABLE in editor.js). Order used to be the reverse, so an override was
// silently ignored and a bad built-in default was unfixable.
export function coverStyleEntry(slug) {
  return CS_DRAFTS.get(slug) || coverStyleLibraryMap()[slug] || builtinCoverStyles()[slug] || null;
}
export function newCoverStyleEntry(name, fromSlug) {
  const src = fromSlug ? coverStyleEntry(fromSlug) : null;
  return {
    name: name || 'New cover style',
    groups: src ? JSON.parse(JSON.stringify(src.groups || {})) : {},
    slider: (src && src.slider) ? JSON.parse(JSON.stringify(src.slider)) : null,
    slider_source: src ? (src.slider_source || '') : '',
  };
}

// ---- slider link ------------------------------------------------------------
// Point a style at a Slider Style. There is no "copy the values in" counterpart: a second look is a
// second library entry, which stays reusable and discoverable, unlike a hidden frozen copy.
export function linkSliderStyle(entry, sliderRef) {
  return { ...(entry || {}), slider: null, slider_source: sliderRef || '' };
}
function _stable(o) {
  const src = o || {};
  return JSON.stringify(Object.keys(src).sort().reduce((a, k) => { a[k] = src[k]; return a; }, {}));
}
/** Copy a Slider Style's resolved values into a Cover Style (one-way: library -> cover style). */
/** True when the embedded copy no longer matches its source (shows "source has changed"). */

// ---- resolve a style reference to plain per-cover config keys ----------------
/**
 * Returns a flat object of config keys ready to merge into a per-cover config.
 * The embedded slider block is emitted as an INLINE `modern_style` object — resolveModernStyle()
 * already accepts inline objects, so the renderer needs no changes and nothing resolves by slug
 * at render time.
 */
export function resolveCoverStyle(ref) {
  const slug = coverStyleRefSlug(ref) || (typeof ref === 'string' ? ref : '');
  const entry = slug ? coverStyleEntry(slug) : null;
  if (!entry) return {};
  const out = {};
  const groups = entry.groups || {};
  COVER_STYLE_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(groups, k)) out[k] = groups[k];
  });
  // carry any extra keys the style legitimately set (e.g. invert flags from the awning preset)
  Object.keys(groups).forEach((k) => { if (!(k in out)) out[k] = groups[k]; });
  // v2026.09.24.140: saved styles live in HA storage and still name pre-folder image files, so
  // rewrite their image slots on the way out. Idempotent — an already-foldered value is untouched.
  Object.assign(out, migrateImageKeys(out));
  // v2026.09.24.147: two forms, and the existing fields already express both.
  //   slider = {…}            DETACHED — frozen inline values, portable, does not follow the library
  //   slider = null + source  LINKED   — resolved from the library at render time, so editing the
  //                                      Button/Slider Style updates every style linked to it
  // resolveModernStyle() accepts either an object or a ref, so the renderer needs no branch.
  // v2026.09.24.148: a style LINKS to its slider — one definition, in the library, and editing it
  // updates every style using it. `slider` as an inline object is a legacy read only (older entries
  // embedded a copy); nothing creates one any more, and migration drops it when a source exists.
  if (entry.slider_source) out[C.CONFIG_MODERN_STYLE] = entry.slider_source;
  else if (entry.slider) out[C.CONFIG_MODERN_STYLE] = entry.slider;
  return out;
}

// v2026.10.01.190: remove a listener added by the ensure function. Callers pass ONE stable function per
// card/editor instance and remove it when that instance leaves the page.
export function offCoverStyleLibrary(fn) {
  Object.values(CS_LIBRARY).forEach((st) => { if (st && st.listeners) st.listeners.delete(fn); });
}
export function coverStyleListenerCount() {
  return Object.values(CS_LIBRARY).reduce((n, st) => n + ((st && st.listeners) ? st.listeners.size : 0), 0);
}
