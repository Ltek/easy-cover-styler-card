/**
 * Button Styles Library — shared with the Color Light & Scene Manager card.
 * Reads the SAME HA system-frontend store (`color_light_manager_button_styles`), so styles
 * created in that card's Button Styles library are usable here by `lib:<slug>` reference.
 * Library/stack functions ported (behavior-preserving) from color-light-manager-card v254;
 * the render applicator is adapted for the area-selector buttons (no live-light color — the
 * button's "own color" is the theme accent, and "active" = the selected area).
 */
import {clamp} from './dividers.js';

export const BUTTON_STYLE_GROUPS = {
  layout: ['layout', 'columns', 'gap', 'wrap'],
  background: ['button_style'],
  border: ['button_border_enabled', 'button_border_width', 'button_border_color', 'button_border_color_mode', 'button_border_sides'],
  gradient: ['button_border_gradient', 'button_border_gradient_color_mode'],
  glow: ['button_glow_enabled', 'button_glow_color', 'button_glow_color_mode', 'button_glow_intensity', 'button_glow_condition', 'button_glow_blur', 'button_glow_spread', 'button_glow_opacity'],
  shadow: ['button_shadow_enabled', 'button_shadow_color', 'button_shadow_x', 'button_shadow_y', 'button_shadow_blur', 'button_shadow_spread', 'button_shadow_opacity'],
  text: ['button_font_size', 'button_name_weight', 'button_name_color', 'button_name_color_mode', 'button_name_wrap', 'button_icon_gap'],
  icon: ['button_icon', 'button_icon_size', 'button_icon_color', 'button_icon_color_mode'],
  sizing: ['button_border_radius', 'button_height', 'button_max_width'],
};
const GROUP_KEYS = Object.keys(BUTTON_STYLE_GROUPS);
const KEY_GROUP = (() => { const m = {}; GROUP_KEYS.forEach(g => BUTTON_STYLE_GROUPS[g].forEach(k => { m[k] = g; })); return m; })();
function layerOwnedGroups(groups) {
  const owned = new Set();
  Object.keys(groups || {}).forEach(k => { const g = KEY_GROUP[k]; if (g) owned.add(g); });
  return owned;
}

export function fixtureRefSlug(ref) {
  return (typeof ref === 'string' && ref.startsWith('lib:')) ? ref.slice(4) : null;
}

const BTN_STYLE_LIB_KEY = 'color_light_manager_button_styles';
const BTN_STYLE_LIBRARY = { system: { map: null, loaded: false, subscribed: false } };

function _btnStyleNormalize(slug, p) {
  const name = p.name || slug;
  const kind = (p.kind === 'frame') ? 'frame' : 'button';
  let layers;
  if (Array.isArray(p.layers)) {
    layers = p.layers.map(l => ({
      groups: (l && l.groups && typeof l.groups === 'object') ? l.groups : {},
      ...(l && l.when && typeof l.when === 'object' ? { when: l.when } : {}),
      ...(l && l.hidden ? { hidden: true } : {}),
      ...(l && l.label != null && String(l.label).trim() ? { label: String(l.label) } : {}),
    }));
  } else {
    layers = [{ groups: (p.settings && typeof p.settings === 'object') ? p.settings : {} }];
  }
  if (kind === 'button' && layers.length) {
    const effBelow = {};
    layers = layers.map((l, idx) => {
      const owned = layerOwnedGroups(l.groups);
      const effHere = { ...effBelow, ...l.groups };
      let groups = l.groups;
      if (idx > 0 && owned.size) {
        groups = {};
        owned.forEach(g => BUTTON_STYLE_GROUPS[g].forEach(k => { if (effHere[k] !== undefined) groups[k] = effHere[k]; }));
      }
      Object.keys(l.groups).forEach(k => { effBelow[k] = l.groups[k]; });
      return { ...l, groups };
    });
  }
  return { slug, name, kind, layers };
}
function _btnStyleParseValue(value) {
  const map = {};
  if (!value || typeof value !== 'object') return map;
  const presets = ('color_light_manager_button_styles' in value && value.presets && typeof value.presets === 'object') ? value.presets : value;
  Object.keys(presets).forEach(slug => { const p = presets[slug]; if (p && typeof p === 'object') map[slug] = _btnStyleNormalize(slug, p); });
  return map;
}
export function ensureButtonStyleLibrary(hass, onChange) {
  const st = BTN_STYLE_LIBRARY.system;
  if (!hass || !hass.connection || st.subscribed) return;
  const conn = hass.connection;
  if (typeof conn.subscribeMessage === 'function') {
    st.subscribed = true;
    try {
      conn.subscribeMessage((ev) => { st.map = _btnStyleParseValue(ev && ev.value); st.loaded = true; if (typeof onChange === 'function') { try { onChange(); } catch (e) {} } },
        { type: 'frontend/subscribe_system_data', key: BTN_STYLE_LIB_KEY });
    } catch (e) { st.subscribed = false; }
  }
}
export function buttonStyleLibraryMap() { return BTN_STYLE_LIBRARY.system.map || {}; }

// Persist the full library map to the shared system store.
export function saveButtonStyleLibrary(hass, map) {
  if (!hass || !hass.connection || typeof hass.connection.sendMessagePromise !== 'function') return Promise.reject(new Error('No connection'));
  const presets = {};
  Object.keys(map || {}).forEach(slug => {
    const e = map[slug] || {};
    const layers = (Array.isArray(e.layers) ? e.layers : []).map(l => ({ groups: l.groups || {}, ...(l.when ? { when: l.when } : {}), ...(l.hidden ? { hidden: true } : {}), ...(l.label != null && String(l.label).trim() ? { label: String(l.label) } : {}) }));
    presets[slug] = { name: e.name || slug, kind: e.kind === 'frame' ? 'frame' : 'button', layers, ...(e.note ? { note: e.note } : {}) };
  });
  const value = { color_light_manager_button_styles: BTN_STYLE_LIB_VERSION, presets };
  // optimistic local update so the UI reflects immediately
  BTN_STYLE_LIBRARY.system.map = {};
  Object.keys(map || {}).forEach(slug => { BTN_STYLE_LIBRARY.system.map[slug] = _btnStyleNormalize(slug, map[slug]); });
  return hass.connection.sendMessagePromise({ type: 'frontend/set_system_data', key: BTN_STYLE_LIB_KEY, value });
}
const BTN_STYLE_LIB_VERSION = 1;
export function slugifyStyleName(name) {
  const base = String(name || 'style').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'style';
  const map = buttonStyleLibraryMap();
  let slug = base, n = 2;
  while (map[slug] || slug.startsWith('__')) { slug = `${base}_${n++}`; }
  return slug;
}
// A fresh library entry: single base layer seeded from Basic Theme.
export function newButtonStyleEntry(name) {
  return { name: name || 'New style', kind: 'button', layers: [{ groups: JSON.parse(JSON.stringify(BUILTIN_BASIC_THEME_GROUPS)) }] };
}

const BTN_STYLE_BASIC_SLUG = '__basic_theme__';
const BTN_STYLE_NEON_SLUG = '__neon_lux__';
export const BUILTIN_BASIC_THEME_GROUPS = {
  layout: 'columns', columns: 3, gap: 8, wrap: true,
  button_style: 'theme',
  button_border_enabled: false, button_border_width: 1, button_border_color: '#2196F3', button_border_color_mode: 'fixed', button_border_sides: ['top', 'bottom', 'left', 'right'],
  button_border_gradient: { enabled: false, width: 1, sides: { top: false, bottom: true, left: false, right: false }, stops: [{ pos: 0, color: 'transparent' }, { pos: 50, color: 'match' }, { pos: 100, color: 'transparent' }] },
  button_border_gradient_color_mode: 'fixed',
  button_glow_enabled: false, button_glow_color: '#2196F3', button_glow_color_mode: 'fixed', button_glow_intensity: 1, button_glow_condition: 'when_active', button_glow_blur: 8, button_glow_spread: 2, button_glow_opacity: 0.5,
  button_shadow_enabled: false, button_shadow_color: '#000000', button_shadow_x: 0, button_shadow_y: 4, button_shadow_blur: 12, button_shadow_spread: 0, button_shadow_opacity: 0.35,
  button_font_size: 14, button_name_weight: '400', button_name_color: '', button_name_color_mode: 'inherit', button_height: 44, button_icon_gap: 8, button_name_wrap: true, button_max_width: 0,
  button_icon: '', button_icon_size: 0, button_icon_color: '', button_icon_color_mode: '',
  button_border_radius: 8,
};
const BUILTIN_BASIC_THEME_ACTIVE_GLOW = {
  button_glow_enabled: true, button_glow_color: '#2196F3', button_glow_color_mode: 'fixed', button_glow_intensity: 1, button_glow_condition: 'when_active', button_glow_blur: 8, button_glow_spread: 2, button_glow_opacity: 0.5,
};
const BUILTIN_NEON_LUX_GROUPS = {
  layout: 'columns', columns: 6, gap: 7, wrap: true,
  button_style: 'transparent',
  button_border_enabled: false, button_border_width: 1, button_border_color: '#2196F3', button_border_color_mode: 'match', button_border_sides: ['top', 'bottom'],
  button_border_gradient: { enabled: true, width: 1, sides: { top: true, bottom: true, left: false, right: false }, stops: [{ pos: 0, color: 'transparent' }, { pos: 50, color: 'match' }, { pos: 100, color: 'transparent' }] },
  button_border_gradient_color_mode: 'fixed',
  button_glow_enabled: true, button_glow_color: '#2196F3', button_glow_color_mode: 'fixed', button_glow_intensity: 1, button_glow_condition: 'when_active', button_glow_blur: 8, button_glow_spread: 2, button_glow_opacity: 0.5,
  button_shadow_enabled: true, button_shadow_color: '#000000', button_shadow_x: 0, button_shadow_y: 4, button_shadow_blur: 12, button_shadow_spread: 4, button_shadow_opacity: 0.56,
  button_font_size: 14, button_name_weight: '400', button_name_color: '', button_name_color_mode: 'inherit', button_name_wrap: true, button_icon_gap: 4,
  button_icon: '', button_icon_size: 0, button_icon_color: '#2196F3', button_icon_color_mode: '',
  button_border_radius: 8, button_height: 30, button_max_width: 115,
};
const BUILTIN_BUTTON_STYLES = {
  [BTN_STYLE_BASIC_SLUG]: { name: 'Basic Theme', layers: [
    { groups: BUILTIN_BASIC_THEME_GROUPS },
    { groups: BUILTIN_BASIC_THEME_ACTIVE_GLOW, when: { type: 'button_active' }, label: 'Active glow' },
  ] },
  [BTN_STYLE_NEON_SLUG]: { name: 'Neon Lux', layers: [{ groups: BUILTIN_NEON_LUX_GROUPS }] },
};
export function builtinButtonStyles() { return BUILTIN_BUTTON_STYLES; }
function isBuiltinButtonSlug(slug) { return !!BUILTIN_BUTTON_STYLES[slug]; }
function builtinButtonStack(slug) {
  const key = BUILTIN_BUTTON_STYLES[slug] ? slug : BTN_STYLE_BASIC_SLUG;
  const def = BUILTIN_BUTTON_STYLES[key];
  return { slug: key, name: def.name, kind: 'button', builtin: true, layers: JSON.parse(JSON.stringify(def.layers)) };
}
export function buttonStyleStack(slug) {
  if (isBuiltinButtonSlug(slug)) return builtinButtonStack(slug);
  return buttonStyleLibraryMap()[slug];
}
// active-layer flatten (last-writer-wins per group); isActive(when) decides conditional layers
function flattenButtonStack(stack, isActive) {
  if (!stack || !Array.isArray(stack.layers)) return { ...BUILTIN_BASIC_THEME_GROUPS };
  const hasActiveBase = stack.layers.some(l => !l.hidden && (!l.when || !l.when.type) && l.groups && Object.keys(l.groups).length);
  const acc = hasActiveBase ? {} : { ...BUILTIN_BASIC_THEME_GROUPS };
  stack.layers.forEach(l => {
    if (l.hidden) return;
    if (l.when && typeof isActive === 'function' && !isActive(l.when)) return;
    const g = l.groups || {};
    Object.keys(g).forEach(k => { acc[k] = g[k]; });
  });
  return acc;
}

// ---- CSS helpers (adapted) --------------------------------------------------
const SIDES = ['top', 'bottom', 'left', 'right'];
function buttonBorderSides(cfg) {
  const s = cfg && cfg.button_border_sides;
  return Array.isArray(s) ? SIDES.filter(k => s.includes(k)) : SIDES.slice();
}
function buttonBorderCss(width, color, sides) {
  const on = new Set(Array.isArray(sides) ? sides : SIDES);
  if (!on.size) return 'border:none;';
  if (on.size === 4) return `border:${width}px solid ${color};`;
  return SIDES.map(s => `border-${s}:${on.has(s) ? `${width}px solid ${color}` : 'none'};`).join('');
}
function resolveButtonColor(mode, fixedColor, matchColor, fallbackMode) {
  const m = mode || fallbackMode || 'fixed';
  if (m === 'none') return null;
  if (m === 'match') return matchColor != null ? matchColor : null;
  return fixedColor || null;
}
function cssColorWithAlpha(color, op) {
  op = clamp(Number(op), 0, 1); if (!Number.isFinite(op)) op = 1;
  const m = /^#([0-9a-fA-F]{6})$/.exec(String(color || ''));
  if (m) { const n = parseInt(m[1], 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${op})`; }
  if (op >= 1) return color;
  return `color-mix(in srgb, ${color} ${Math.round(op * 100)}%, transparent)`;
}
function gradientBorderBackground(g, matchColor) {
  if (!g || !g.enabled) return null;
  const resolveMatch = matchColor || '#2196F3';
  const stops = (Array.isArray(g.stops) ? g.stops : [])
    .map(s => ({ pos: clamp(Number(s.pos) || 0, 0, 100), color: s.color === 'match' ? resolveMatch : String(s.color || 'transparent') }))
    .sort((a, b) => a.pos - b.pos);
  if (stops.length < 2) return null;
  const w = Number(g.width) || 2;
  const sides = g.sides || {};
  const horiz = `linear-gradient(to right, ${stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  const vert = `linear-gradient(to bottom, ${stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  const imgs = [], sizes = [], positions = [];
  const add = (on, img, size, pos) => { if (on) { imgs.push(img); sizes.push(size); positions.push(pos); } };
  add(sides.top, horiz, `100% ${w}px`, 'top'); add(sides.bottom, horiz, `100% ${w}px`, 'bottom');
  add(sides.left, vert, `${w}px 100%`, 'left'); add(sides.right, vert, `${w}px 100%`, 'right');
  if (!imgs.length) return null;
  return { image: imgs.join(', '), size: sizes.join(', '), position: positions.join(', '), repeat: imgs.map(() => 'no-repeat').join(', ') };
}

// Resolve a `lib:<slug>` / built-in-slug reference to a flattened appearance for the given active state.
export function resolveButtonAppearance(ref, isActive) {
  const slug = fixtureRefSlug(ref) || (isBuiltinButtonSlug(ref) ? ref : null);
  const stack = slug ? buttonStyleStack(slug) : null;
  if (!stack) return null;
  return flattenButtonStack(stack, (when) => {
    if (!when || !when.type) return true;
    if (when.type === 'button_active') return !!isActive;
    if (when.type === 'button_off') return !isActive;
    return true; // light_* / section_* conditions are irrelevant for area buttons → treat as met
  });
}

// Build inline CSS for an area-selector button from a flattened appearance object.
// `accent` is the button's "own color" (theme accent) used by every `match` mode.
export function areaButtonStyle(cfg, isActive, accent) {
  accent = accent || 'var(--primary-color, #2196F3)';
  const parts = [];
  // border
  let border = '';
  if (cfg.button_border_enabled) {
    const w = Number(cfg.button_border_width) || 1;
    const color = resolveButtonColor(cfg.button_border_color_mode, cfg.button_border_color || '#2196F3', accent, 'fixed');
    border = color ? buttonBorderCss(w, color, buttonBorderSides(cfg)) : 'border:none;';
  }
  // glow + shadow → box-shadow
  const shadows = [];
  if (cfg.button_glow_enabled) {
    const cond = cfg.button_glow_condition || 'never';
    const glow = cond === 'always' || (cond === 'when_active' && isActive);
    if (glow) {
      const color = resolveButtonColor(cfg.button_glow_color_mode, cfg.button_glow_color || '#2196F3', accent, 'fixed') || accent;
      const intensity = Number(cfg.button_glow_intensity) || 1;
      const blur = Number.isFinite(Number(cfg.button_glow_blur)) ? Number(cfg.button_glow_blur) : 12 * intensity;
      const spread = Number.isFinite(Number(cfg.button_glow_spread)) ? Number(cfg.button_glow_spread) : -2 * intensity;
      const op = Number.isFinite(Number(cfg.button_glow_opacity)) ? clamp(Number(cfg.button_glow_opacity), 0, 1) : 1;
      shadows.push(`0 0 ${blur}px ${spread}px ${cssColorWithAlpha(color, op)}`);
    }
  }
  if (cfg.button_shadow_enabled) {
    const op = clamp(Number(cfg.button_shadow_opacity), 0, 1);
    shadows.push(`${Number(cfg.button_shadow_x) || 0}px ${Number(cfg.button_shadow_y) || 0}px ${Number(cfg.button_shadow_blur) || 0}px ${Number(cfg.button_shadow_spread) || 0}px ${cssColorWithAlpha(cfg.button_shadow_color || '#000000', Number.isFinite(op) ? op : 0.35)}`);
  }
  // fill
  const style = cfg.button_style || 'theme';
  let fillCss = '';
  const gbColor = resolveButtonColor(cfg.button_border_gradient_color_mode, cfg.button_border_color || '#2196F3', accent, 'match');
  const gb = gbColor ? gradientBorderBackground(cfg.button_border_gradient, gbColor) : null;
  let fill;
  if (style === 'transparent') fill = null;
  else if (style === 'theme') fill = 'var(--ha-card-background, var(--card-background-color, #1c1c1c))';
  else if (style === 'tinted' || style === 'tile') fill = null; // handled below as gradient tint
  else fill = accent; // solid
  if (style === 'tinted' || style === 'tile') {
    const tint = `linear-gradient(135deg, ${cssColorWithAlpha(accent, 0.35)}, ${cssColorWithAlpha(accent, 0.06)})`;
    fillCss = gb
      ? `background-image:${gb.image}, ${tint};background-size:${gb.size}, auto;background-position:${gb.position}, center;background-repeat:${gb.repeat}, no-repeat;background-color:transparent;`
      : `background:${tint};`;
  } else if (gb) {
    fillCss = `background-image:${gb.image};background-size:${gb.size};background-position:${gb.position};background-repeat:${gb.repeat};background-color:${fill || 'transparent'};`;
  } else {
    fillCss = fill ? `background:${fill};` : 'background:transparent;';
  }
  // sizing
  const radius = Number(cfg.button_border_radius);
  if (Number.isFinite(radius)) parts.push(`border-radius:${radius}px`);
  const h = Number(cfg.button_height); if (h > 0) parts.push(`min-height:${h}px`);
  const mw = Number(cfg.button_max_width); if (mw > 0) parts.push(`max-width:${mw}px`);
  // text
  const fs = Number(cfg.button_font_size); if (fs > 0) parts.push(`font-size:${fs}px`);
  parts.push(`font-weight:${cfg.button_name_weight || '600'}`);
  const nameColor = (cfg.button_name_color_mode === 'fixed') ? (cfg.button_name_color || '')
    : (cfg.button_name_color_mode === 'match') ? accent : '';
  if (nameColor) parts.push(`color:${nameColor}`);
  if (shadows.length) parts.push(`box-shadow:${shadows.join(', ')}`);
  return `${fillCss}${border}${parts.join(';')};`;
}

// Icon for the button, if the style sets one; returns {icon, style} or null.
export function areaButtonIcon(cfg, isActive, accent) {
  const icon = cfg.button_icon && String(cfg.button_icon).trim();
  if (!icon) return null;
  accent = accent || 'var(--primary-color, #2196F3)';
  const size = Number(cfg.button_icon_size) || 0;
  const color = cfg.button_icon_color_mode ? resolveButtonColor(cfg.button_icon_color_mode, cfg.button_icon_color || '#2196F3', accent, 'none') : null;
  const s = `${size > 0 ? `--mdc-icon-size:${size}px;` : ''}${color ? `color:${color};` : ''}`;
  return { icon, style: s };
}
