/**
 * Modern (bar/pill) cover visual — style object + System-scope library.
 * A "modern style" is a FLAT object (no layered stacks like the Button Styles Library —
 * state variation is handled by the fill_open/closed/moving colours, so no `when` layers).
 * Stored in its own shared HA system store so styles can be reused across covers/cards
 * by `lib:<slug>` reference. System scope only (per project rule).
 */
import {clamp} from './dividers.js';

// ---- style shape + defaults -------------------------------------------------
export const MODERN_STYLE_DEFAULT = {
  bar_radius: 14,           // px corner radius of the track/bar
  bar_border_width: 0,
  bar_border_color: 'rgba(255,255,255,0.12)',
  track_color: 'rgba(120,120,120,0.35)',   // empty portion
  track_opacity: 1,         // 0-1
  // fill: a gradient (when enabled) or a solid colour chosen per state
  fill_mode: 'state',       // 'state' (solid per state) | 'gradient'
  fill_open: '#3ea6ff',
  fill_closed: 'rgba(120,120,120,0.5)',
  fill_moving: '#8ad4ff',
  fill_gradient: { stops: [{ pos: 0, color: '#00e0ff' }, { pos: 100, color: '#0066ff' }] },
  fill_opacity: 1,
  // handle (the draggable knob at the fill boundary)
  handle_show: true,
  handle_shape: 'pill',     // pill | round | square | diamond | line (matches Color Manager shapes + a wide pill)
  handle_size: 34,          // px — pill width / round-square-diamond diameter
  handle_thickness: 6,      // px — pill/line height
  handle_color: 'rgba(255,255,255,0.85)',
  handle_opacity: 1,        // 0-1
  handle_radius: 4,
  handle_border: true,      // subtle dark outline like the Color Manager handle
  handle_glow: false,
  handle_glow_color: '',    // '' => follow the active fill colour
  // bar glow (around the whole bar) — shown when open/active
  glow_enabled: false,
  glow_color: '',           // '' => follow the active fill colour
  glow_blur: 16,
  glow_spread: 1,
  glow_opacity: 0.55,
  glow_condition: 'when_open', // 'never' | 'when_open' | 'always'
  glow_target: 'bar',          // 'bar' (whole bar) | 'fill' (only the open/filled section)
  // secondary thin tilt bar (only rendered when the cover supports tilt)
  tilt_show: true,
  tilt_color: 'rgba(255,255,255,0.5)',
  tilt_thickness: 5,        // px
};

// ---- built-in styles (match the reference looks) ----------------------------
const NEON_SLUG = '__modern_neon__';
const GLASS_SLUG = '__modern_glass__';
const IOS_SLUG = '__modern_ios__';
const MINIMAL_SLUG = '__modern_minimal__';

const BUILTIN_MODERN_STYLES = {
  [NEON_SLUG]: { name: 'Neon', groups: {
    bar_radius: 12, track_color: 'rgba(90,20,30,0.55)',
    fill_mode: 'state', fill_open: '#54e08a', fill_closed: 'rgba(90,90,90,0.45)', fill_moving: '#7be0a5',
    handle_show: true, handle_color: 'rgba(255,255,255,0.9)',
    glow_enabled: true, glow_color: '', glow_blur: 18, glow_spread: 1, glow_opacity: 0.7, glow_condition: 'when_open',
    tilt_show: true, tilt_color: 'rgba(255,255,255,0.55)',
  } },
  [IOS_SLUG]: { name: 'iOS', groups: {
    bar_radius: 16, track_color: 'rgba(120,120,120,0.35)',
    fill_mode: 'gradient', fill_gradient: { stops: [{ pos: 0, color: '#00e5ff' }, { pos: 100, color: '#2b8fff' }] },
    handle_show: false,
    glow_enabled: false, glow_condition: 'never',
    tilt_show: true,
  } },
  [GLASS_SLUG]: { name: 'Glass', groups: {
    bar_radius: 10, track_color: 'rgba(60,60,60,0.55)',
    fill_mode: 'state', fill_open: 'rgba(230,230,230,0.85)', fill_closed: 'rgba(120,120,120,0.55)', fill_moving: 'rgba(230,230,230,0.7)',
    handle_show: true, handle_color: 'rgba(255,255,255,0.85)',
    glow_enabled: false, glow_condition: 'never', tilt_show: true,
  } },
  [MINIMAL_SLUG]: { name: 'Minimal', groups: {
    bar_radius: 8, track_color: 'rgba(120,120,120,0.3)',
    fill_mode: 'state', fill_open: 'var(--primary-color, #2196F3)', fill_closed: 'rgba(120,120,120,0.45)', fill_moving: 'var(--primary-color, #2196F3)',
    handle_show: true, handle_color: 'rgba(255,255,255,0.8)', tilt_show: false,
  } },
};
export function builtinModernStyles() { return BUILTIN_MODERN_STYLES; }
function isBuiltinModernSlug(slug) { return !!BUILTIN_MODERN_STYLES[slug]; }

// ---- shared System store ----------------------------------------------------
// Shared HA system-data store key. Intentionally kept stable across the Flex Cover → Easy Cover
// Styler rebrand: it is an internal storage key (not user-facing branding), and renaming it would
// orphan every slider style users have already saved. Leave as-is.
const MODERN_LIB_KEY = 'flex_cover_slider_styles';
const MODERN_LIB_VERSION = 1;
const MODERN_LIBRARY = { system: { map: null, loaded: false, subscribed: false } };

export function modernRefSlug(ref) {
  return (typeof ref === 'string' && ref.startsWith('lib:')) ? ref.slice(4) : null;
}
function _normalize(slug, p) {
  return { slug, name: p.name || slug, groups: (p.groups && typeof p.groups === 'object') ? p.groups : (p.settings || {}) };
}
function _parseValue(value) {
  const map = {};
  if (!value || typeof value !== 'object') return map;
  const presets = (value.presets && typeof value.presets === 'object') ? value.presets : value;
  Object.keys(presets).forEach(slug => { const p = presets[slug]; if (p && typeof p === 'object' && slug !== MODERN_LIB_KEY) map[slug] = _normalize(slug, p); });
  return map;
}
export function ensureModernStyleLibrary(hass, onChange) {
  const st = MODERN_LIBRARY.system;
  if (!hass || !hass.connection || st.subscribed) return;
  const conn = hass.connection;
  if (typeof conn.subscribeMessage === 'function') {
    st.subscribed = true;
    try {
      conn.subscribeMessage((ev) => { st.map = _parseValue(ev && ev.value); st.loaded = true; if (typeof onChange === 'function') { try { onChange(); } catch (e) {} } },
        { type: 'frontend/subscribe_system_data', key: MODERN_LIB_KEY });
    } catch (e) { st.subscribed = false; }
  }
}
export function modernStyleLibraryMap() { return MODERN_LIBRARY.system.map || {}; }
export function saveModernStyleLibrary(hass, map) {
  if (!hass || !hass.connection || typeof hass.connection.sendMessagePromise !== 'function') return Promise.reject(new Error('No connection'));
  const presets = {};
  Object.keys(map || {}).forEach(slug => { const e = map[slug] || {}; presets[slug] = { name: e.name || slug, groups: e.groups || {} }; });
  const value = { [MODERN_LIB_KEY]: MODERN_LIB_VERSION, presets };
  MODERN_LIBRARY.system.map = {};
  Object.keys(map || {}).forEach(slug => { MODERN_LIBRARY.system.map[slug] = _normalize(slug, map[slug]); });
  return hass.connection.sendMessagePromise({ type: 'frontend/set_system_data', key: MODERN_LIB_KEY, value });
}
export function slugifyModernName(name) {
  const base = String(name || 'style').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'style';
  const map = modernStyleLibraryMap();
  let slug = base, n = 2;
  while (map[slug] || slug.startsWith('__')) { slug = `${base}_${n++}`; }
  return slug;
}
export function newModernStyleEntry(name) {
  return { name: name || 'New slider style', groups: JSON.parse(JSON.stringify(MODERN_STYLE_DEFAULT)) };
}

// ---- resolve a reference / inline object to a full style --------------------
export function resolveModernStyle(ref) {
  let groups = null;
  if (ref && typeof ref === 'object') groups = ref;                 // inline object
  else {
    const slug = modernRefSlug(ref) || (isBuiltinModernSlug(ref) ? ref : null);
    if (slug) {
      const src = isBuiltinModernSlug(slug) ? BUILTIN_MODERN_STYLES[slug] : modernStyleLibraryMap()[slug];
      groups = src ? src.groups : null;
    }
  }
  return { ...MODERN_STYLE_DEFAULT, ...(groups || {}) };
}

// ---- CSS helpers ------------------------------------------------------------
function cssColorWithAlpha(color, op) {
  op = clamp(Number(op), 0, 1); if (!Number.isFinite(op)) op = 1;
  const m = /^#([0-9a-fA-F]{6})$/.exec(String(color || ''));
  if (m) { const n = parseInt(m[1], 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${op})`; }
  if (op >= 1) return color;
  return `color-mix(in srgb, ${color} ${Math.round(op * 100)}%, transparent)`;
}
function gradientCss(stops) {
  const s = (Array.isArray(stops) ? stops : [])
    .map(x => ({ pos: clamp(Number(x.pos) || 0, 0, 100), color: String(x.color || 'transparent') }))
    .sort((a, b) => a.pos - b.pos);
  if (s.length < 2) return null;
  // painted bottom→top so 0% is the bottom of the fill
  return `linear-gradient(to top, ${s.map(x => `${x.color} ${x.pos}%`).join(', ')})`;
}

// pick the fill paint for the current cover state (opacity is applied on the fill element,
// via modernFillOpacity, so it works for gradients too — don't bake it in here)
export function modernFillPaint(style, state) {
  if (style.fill_mode === 'gradient') {
    const g = gradientCss(style.fill_gradient && style.fill_gradient.stops);
    if (g) return g;
  }
  const moving = state === 'opening' || state === 'closing';
  const closed = state === 'closed';
  return moving ? style.fill_moving : (closed ? style.fill_closed : style.fill_open);
}
export function modernFillOpacity(style) {
  const o = Number(style.fill_opacity);
  return Number.isFinite(o) ? clamp(o, 0, 1) : 1;
}
export function modernTrackColor(style) {
  return cssColorWithAlpha(style.track_color, style.track_opacity);
}
// active fill colour (for glow tinting) — a solid colour even in gradient mode
export function modernActiveColor(style, state) {
  if (style.fill_mode === 'gradient') {
    const st = (style.fill_gradient && style.fill_gradient.stops) || [];
    return (st[st.length - 1] && st[st.length - 1].color) || style.fill_open;
  }
  const moving = state === 'opening' || state === 'closing';
  return moving ? style.fill_moving : style.fill_open;
}
export function modernBarGlow(style, state) {
  const cond = style.glow_condition || 'never';
  const open = state !== 'closed';
  if (!style.glow_enabled || cond === 'never' || (cond === 'when_open' && !open)) return '';
  const color = style.glow_color || modernActiveColor(style, state);
  return `0 0 ${Number(style.glow_blur) || 16}px ${Number(style.glow_spread) || 1}px ${cssColorWithAlpha(color, style.glow_opacity)}`;
}
// Inline style for the handle knob at fill boundary `pct`% (bottom-anchored vertical bar).
// Shapes mirror the Color Manager card: round | square | line | diamond, plus a wide `pill`.
export function modernHandleStyle(style, pct, fillColor, axis = 'v') {
  const isH = axis === 'h';
  const shape = style.handle_shape || 'pill';
  const color = cssColorWithAlpha(style.handle_color || 'rgba(255,255,255,0.85)', style.handle_opacity);
  const outline = style.handle_border ? 'border:2px solid rgba(0,0,0,0.3);box-shadow:0 1px 4px rgba(0,0,0,0.4);' : '';
  const glow = style.handle_glow ? `box-shadow:0 0 8px 1px ${cssColorWithAlpha(style.handle_glow_color || fillColor, 0.8)};` : '';
  const sz = Number(style.handle_size) || 34, th = Number(style.handle_thickness) || 6;
  const rad = Number.isFinite(Number(style.handle_radius)) ? Number(style.handle_radius) : 3;
  const diamond = shape === 'diamond';
  // width/height: pill & line have a long axis (sz) across the bar and a short axis (th) along travel
  let w, h, br;
  if (shape === 'round') { w = h = sz; br = '50%'; }
  else if (shape === 'square') { w = h = sz; br = `${rad}px`; }
  else if (diamond) { w = h = Math.round(sz * 0.8); br = `${Math.min(rad, 3)}px`; }
  else { // pill | line — long axis spans the cross-direction of travel
    if (isH) { w = th; h = sz; } else { w = sz; h = th; }
    br = `${rad}px`;
  }
  // position along the travel axis at pct%, clamped so the whole knob stays inside the bar
  // (was straddling the edge at 0/100%, which clipped the on-handle value)
  const halfTravel = ((isH ? w : h) / 2);
  const at = `clamp(${halfTravel}px, ${pct}%, calc(100% - ${halfTravel}px))`;
  const along = isH ? `left:${at};` : `bottom:${at};`;
  const cross = isH ? 'top:50%;' : 'left:50%;';
  const shift = isH ? 'translate(-50%,-50%)' : 'translate(-50%,50%)';
  const tf = `transform:${shift}${diamond ? ' rotate(45deg)' : ''};`;
  return `position:absolute;${along}${cross}${tf}width:${w}px;height:${h}px;border-radius:${br};background:${color};${outline}${glow}`;
}
export { cssColorWithAlpha as modernColorWithAlpha, gradientCss as modernGradientCss };
