// Frame Library — READ-ONLY consumer (v2026.09.24.171).
//
// The Color and Entity cards share one frame library in HA storage under 'ltek_frame_library'. This
// card LINKS to it rather than keeping its own, so one frame can style the whole dashboard and
// editing it (in either of those cards) updates every card using it. Frames are created and edited
// there; this module only reads and renders them — porting the ~400-line frame builder here would
// have meant a third copy to keep in sync.
//
// Applied at CARD level only. Dividers already separate the panels, so per-panel frames would be a
// second way of doing that and would add another layer to the spacing model.
//
// Only import: libRev.js, itself a leaf with no imports, so this module still cannot take part in
// an import cycle.

export const FRAME_LIB_KEY = 'ltek_frame_library';
import { bumpLibRev } from './libRev.js';

const SCOPES = ['system', 'user'];                 // 'system' is the other cards' default
const STORE = { system: { map: null, subscribed: false, listeners: new Set() },
                user:   { map: null, subscribed: false, listeners: new Set() } };

// A few built-ins so the picker is never empty for someone who installs only this card.
// Colour 'accent' stands in for the other cards' follow_icon: there is no section icon here.
const BUILTIN_PREFIX = '__fr_';
const BUILTIN_FRAMES = {
  [`${BUILTIN_PREFIX}accent_outline__`]: { name: 'Accent Outline',
    border: { color: 'accent', width: 1, radius: 12, sides: ['top', 'bottom', 'left', 'right'] },
    glow: { color: 'accent', intensity: 1.0, borders_only: true } },
  [`${BUILTIN_PREFIX}soft_shadow__`]: { name: 'Soft Shadow',
    border: { color: 'var(--divider-color, #333)', width: 1, radius: 12, sides: ['top', 'bottom', 'left', 'right'] },
    shadow: { color: '#000000', x: 0, y: 4, blur: 14, spread: 0, opacity: 0.35 } },
  [`${BUILTIN_PREFIX}neon_glow__`]: { name: 'Neon Glow',
    border: { color: 'accent', width: 1, radius: 14, sides: ['top', 'bottom', 'left', 'right'] },
    glow: { color: 'accent', intensity: 1.6, borders_only: false } },
};
export const builtinFrames = () => BUILTIN_FRAMES;

function parse(value) {
  const map = {};
  if (!value || typeof value !== 'object') return map;
  const presets = ('seed_frame_presets' in value && value.presets && typeof value.presets === 'object')
    ? value.presets : value;
  Object.keys(presets).forEach((slug) => {
    const p = presets[slug];
    if (p && typeof p === 'object' && (p.glow || p.shadow || p.border || p.background || p.edges)) map[slug] = p;
  });
  return map;
}

// Subscribe once per scope; notify EVERY listener (the v144 rule — a library that keeps only the
// first callback silently starves the card or the editor).
export function ensureFrameLibrary(hass, onChange) {
  SCOPES.forEach((scope) => {
    const st = STORE[scope];
    if (typeof onChange === 'function') st.listeners.add(onChange);
    if (!hass || !hass.connection || st.subscribed) return;
    if (typeof hass.connection.subscribeMessage !== 'function') return;
    st.subscribed = true;
    try {
      hass.connection.subscribeMessage((ev) => {
        st.map = parse(ev && ev.value);
        bumpLibRev();
        st.listeners.forEach((fn) => { try { fn(); } catch (e) {} });
      }, { type: `frontend/subscribe_${scope}_data`, key: FRAME_LIB_KEY });
    } catch (e) { st.subscribed = false; }
  });
}

// Library frames from both scopes; system wins on a slug clash, as it is the shared default.
export function frameLibraryMap() {
  return { ...(STORE.user.map || {}), ...(STORE.system.map || {}) };
}
export function frameEntry(ref) {
  const r = String(ref || '');
  if (!r) return null;
  if (BUILTIN_FRAMES[r]) return BUILTIN_FRAMES[r];
  return frameLibraryMap()[r.replace(/^lib:/, '')] || null;
}

const ACCENT = 'var(--accent-color, var(--primary-color))';
const col = (c) => (c === 'accent' || c === 'match' || !c ? ACCENT : c === 'theme' ? 'var(--divider-color, #333)' : c);
function rgba(color, opacity) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(color || ''));
  if (!m) return col(color);                         // theme vars / named colours: opacity not applicable
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Number(opacity) >= 0 ? Number(opacity) : 1})`;
}

// Inline CSS for the card element, or '' for no frame / an unknown ref (a missing frame degrades to
// the plain card rather than throwing).
export function frameCss(ref) {
  const fx = frameEntry(ref);
  if (!fx) return '';
  const out = [];
  const shadows = [];
  const bsides = (fx.border && Array.isArray(fx.border.sides)) ? fx.border.sides : ['top', 'bottom', 'left', 'right'];
  if (fx.glow) {
    const c = col(fx.glow.follow_icon ? 'accent' : fx.glow.color);
    const k = Number(fx.glow.intensity) || 1;
    const blur = 12 * k, spread = -4 * k, off = 4 * k;
    if (!fx.glow.borders_only) shadows.push(`0 0 ${blur}px ${spread}px ${c}`);
    else {
      if (bsides.includes('top')) shadows.push(`0 -${off}px ${blur}px ${spread}px ${c}`);
      if (bsides.includes('bottom')) shadows.push(`0 ${off}px ${blur}px ${spread}px ${c}`);
      if (bsides.includes('left')) shadows.push(`-${off}px 0 ${blur}px ${spread}px ${c}`);
      if (bsides.includes('right')) shadows.push(`${off}px 0 ${blur}px ${spread}px ${c}`);
    }
  }
  if (fx.shadow) {
    const s = fx.shadow;
    const c = s.follow_icon ? ACCENT : rgba(s.color || '#000000', s.opacity != null ? s.opacity : 0.35);
    shadows.push(`${Number(s.x) || 0}px ${s.y != null ? Number(s.y) : 4}px ${s.blur != null ? Number(s.blur) : 12}px ${Number(s.spread) || 0}px ${c}`);
  }
  if (shadows.length) out.push(`box-shadow:${shadows.join(', ')}`);
  if (fx.border) {
    const b = fx.border;
    const c = col(b.follow_icon ? 'accent' : b.color);
    const w = b.width != null ? Number(b.width) : 1;
    const r = b.radius != null ? Number(b.radius) : 12;
    ['top', 'right', 'bottom', 'left'].forEach((sd) => {
      out.push(`border-${sd}:${bsides.includes(sd) ? `${w}px solid ${c}` : 'none'}`);
    });
    const cn = Array.isArray(b.corners) && b.corners.length === 4 ? b.corners : [true, true, true, true];
    out.push(`border-radius:${cn[0] ? r : 0}px ${cn[1] ? r : 0}px ${cn[2] ? r : 0}px ${cn[3] ? r : 0}px`);
  }
  if (fx.background) {
    const mode = fx.background.mode || 'custom';
    if (mode === 'transparent') out.push('background:transparent', '--ha-card-background:transparent');
    else if (mode !== 'theme' && fx.background.color) out.push(`background:${fx.background.color}`, `--ha-card-background:${fx.background.color}`);
  }
  if (fx.edges) {
    const imgs = [], sizes = [], pos = [];
    const dir = { top: 'to right', bottom: 'to right', left: 'to bottom', right: 'to bottom' };
    ['top', 'bottom', 'left', 'right'].forEach((sd) => {
      const e = fx.edges[sd];
      if (!e || !e.enabled) return;
      let stops;
      if (e.gradient === false) { const c = col(e.color || 'match'); stops = `${c} 0%, ${c} 100%`; }
      else if (Array.isArray(e.stops) && e.stops.length) {
        stops = e.stops.length === 1 ? `${col(e.stops[0].color)} 0%, ${col(e.stops[0].color)} 100%`
          : e.stops.map((s) => `${col(s.color)} ${s.pos}%`).join(', ');
      } else return;
      imgs.push(`linear-gradient(${dir[sd]}, ${stops})`);
      const th = e.thickness || 1;
      sizes.push(sd === 'top' || sd === 'bottom' ? `100% ${th}px` : `${th}px 100%`);
      pos.push(sd);
    });
    if (imgs.length) {
      out.push(`background-image:${imgs.join(', ')}`, `background-size:${sizes.join(', ')}`,
        `background-position:${pos.join(', ')}`, `background-repeat:${imgs.map(() => 'no-repeat').join(', ')}`);
    }
  }
  return out.length ? out.join(';') + ';' : '';
}

// v2026.10.01.190: remove a listener added by the ensure function. Callers pass ONE stable function per
// card/editor instance and remove it when that instance leaves the page.
export function offFrameLibrary(fn) {
  Object.values(STORE).forEach((st) => { if (st && st.listeners) st.listeners.delete(fn); });
}
export function frameListenerCount() {
  return Object.values(STORE).reduce((n, st) => n + ((st && st.listeners) ? st.listeners.size : 0), 0);
}
