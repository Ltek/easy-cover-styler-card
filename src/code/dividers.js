/**
 * Divider engine — ported verbatim (behavior-preserving) from the Easy Entity Styler
 * and Color Light & Scene Manager cards, so the full divider option-suite matches.
 * Pure functions, no `this`. Produces an HTML string; the card embeds it via a DOM node.
 */

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function normalizeIcon(icon) {
  const s = String(icon || '').trim();
  if (!s) return '';
  return s.includes(':') ? s : `mdi:${s}`;
}

export function optNumber(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function escapeHtml(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const DIVIDER_GRADIENT_PATTERNS = [
  { name: 'Solid → Transparent (fade out right)', stops: [{ pos: 0, color: null }, { pos: 100, color: 'transparent' }] },
  { name: 'Transparent → Solid (fade in right)', stops: [{ pos: 0, color: 'transparent' }, { pos: 100, color: null }] },
  { name: 'Transparent → Solid → Transparent (center glow)', stops: [{ pos: 0, color: 'transparent' }, { pos: 50, color: null }, { pos: 100, color: 'transparent' }] },
  { name: 'Solid → Transparent → Solid (center gap)', stops: [{ pos: 0, color: null }, { pos: 50, color: 'transparent' }, { pos: 100, color: null }] },
  { name: 'Solid → Transparent → Solid (mirror center)', stops: [{ pos: 0, color: null }, { pos: 35, color: 'transparent' }, { pos: 65, color: 'transparent' }, { pos: 100, color: null }] },
  { name: 'Transparent → Solid → Transparent (mirror center)', stops: [{ pos: 0, color: 'transparent' }, { pos: 35, color: null }, { pos: 65, color: null }, { pos: 100, color: 'transparent' }] },
  { name: 'Two-color (left → right)', stops: [{ pos: 0, color: '#2196F3' }, { pos: 100, color: '#e91e63' }] },
  { name: 'Two-color (mirror center)', stops: [{ pos: 0, color: '#2196F3' }, { pos: 50, color: '#e91e63' }, { pos: 100, color: '#2196F3' }] },
  { name: 'Rainbow', stops: [{ pos: 0, color: '#ff0000' }, { pos: 25, color: '#ffff00' }, { pos: 50, color: '#00ff00' }, { pos: 75, color: '#00ffff' }, { pos: 100, color: '#ff00ff' }] },
  { name: 'Rainbow (mirror center)', stops: [{ pos: 0, color: '#ff0000' }, { pos: 17, color: '#ffff00' }, { pos: 34, color: '#00ff00' }, { pos: 50, color: '#00ffff' }, { pos: 66, color: '#00ff00' }, { pos: 83, color: '#ffff00' }, { pos: 100, color: '#ff0000' }] },
];

// A divider's gradient stops → linear-gradient CSS. `reverse` mirrors for the right segment.
// `axis` = 'to right' (horizontal) or 'to bottom' (vertical divider variant).
export function dividerGradientCss(section, fallbackColor, reverse, axis) {
  const stops = (Array.isArray(section && section.stops) ? section.stops : [])
    .map(s => ({ pos: clamp(Number(s.pos) || 0, 0, 100), color: s.color === 'theme' ? 'var(--divider-color)' : String(s.color || 'transparent') }))
    .sort((a, b) => a.pos - b.pos);
  if (stops.length < 2) return null;
  let dir = axis || 'to right';
  if (reverse) dir = dir === 'to bottom' ? 'to top' : 'to left';
  return `linear-gradient(${dir}, ${stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
}

// Full horizontal divider (line + optional label/icon on/above/below), all options honored.
export function dividerLineHtml(section, cfg) {
  cfg = cfg || {};
  const color = section.color || cfg.divider_color || 'var(--divider-color)';
  const thickness = Number(section.thickness) || Number(cfg.divider_thickness) || 1;
  const length = clamp(Number(section.length) || Number(cfg.divider_length) || 100, 5, 100);
  const style = section.line_style || 'solid';
  const justify = section.justify || 'center';
  const scale = Number(cfg.scale) || 1.0;
  const flexJustify = justify === 'left' ? 'flex-start' : justify === 'right' ? 'flex-end' : 'center';
  const grad = section.gradient ? dividerGradientCss(section, color) : null;
  let lineStyle;
  if (grad) lineStyle = `height:${thickness}px;background:${grad};border-radius:${thickness}px;`;
  else if (style === 'dashed' || style === 'dotted') lineStyle = `height:0;border-top:${thickness}px ${style} ${color};`;
  else lineStyle = `height:${thickness}px;background:${color};border-radius:${thickness}px;`;
  const hideLine = section.hide_line === true, hideText = section.hide_text === true, hideIcon = section.hide_icon === true;
  const label = (!hideText && section.label != null) ? String(section.label) : '';
  const icon = (!hideIcon && section.icon) ? normalizeIcon(section.icon) : '';
  const padV = optNumber(section.pad_v);
  const base = padV !== null ? padV : 8;
  const padTop = optNumber(section.pad_top); const padBottom = optNumber(section.pad_bottom);
  const pt = padTop !== null ? padTop : base;
  const pb = padBottom !== null ? padBottom : base;
  const pad = pt === pb ? `padding:calc(${pt}px * ${scale}) 0;` : `padding:calc(${pt}px * ${scale}) 0 calc(${pb}px * ${scale});`;
  const position = section.text_position || 'on';
  const contentJustify = section.content_justify || justify;
  const cFlex = contentJustify === 'left' ? 'flex-start' : contentJustify === 'right' ? 'flex-end' : 'center';
  const indent = clamp(Number(section.indent) || 0, 0, 200);
  const lineRow = hideLine ? '' : `<div style="display:flex;justify-content:${flexJustify};"><div style="width:${length}%;${lineStyle}"></div></div>`;
  if (!label && !icon) return `<div style="${pad}">${lineRow || '<div style="height:0;"></div>'}</div>`;
  const tSize = Number(section.text_size) || 13;
  const tWeight = section.text_weight || '600';
  const tMode = section.text_color_mode || (section.text_color ? 'fixed' : 'line');
  let lineColor = color;
  if (tMode === 'line' && section.gradient && Array.isArray(section.stops)) {
    const realStop = section.stops.find(s => s && s.color && s.color !== 'transparent' && s.color !== 'theme');
    if (realStop) lineColor = realStop.color;
    else { const themeStop = section.stops.find(s => s && s.color === 'theme'); if (themeStop) lineColor = 'var(--divider-color)'; }
  }
  const themeVar = v => (/^var\(/.test(v || '') ? v : 'var(--primary-text-color)');
  const tColor = tMode === 'fixed' ? (section.text_color || '#ffffff') : tMode === 'theme' ? themeVar(section.text_color) : lineColor;
  const iSize = Number(section.icon_size) || (tSize + 4);
  const iMode = section.icon_color_mode || (section.icon_color ? 'fixed' : 'text');
  const iColor = iMode === 'fixed' ? (section.icon_color || '#ffffff') : iMode === 'theme' ? themeVar(section.icon_color) : tColor;
  const gap = 8;
  const contentHtml = `<span style="display:inline-flex;align-items:center;gap:calc(${gap}px * ${scale});flex-shrink:0;white-space:nowrap;">
    ${icon ? `<ha-icon icon="${escapeHtml(icon)}" style="--mdc-icon-size:calc(${iSize}px * ${scale});color:${iColor};"></ha-icon>` : ''}
    ${label ? `<span style="font-size:calc(${tSize}px * ${scale});font-weight:${tWeight};color:${tColor};">${escapeHtml(label)}</span>` : ''}
  </span>`;
  const indentStyle = indent ? (contentJustify === 'right' ? `padding-right:${indent}px;` : contentJustify === 'center' ? '' : `padding-left:${indent}px;`) : '';
  const contentRow = `<div style="display:flex;justify-content:${cFlex};${indentStyle}">${contentHtml}</div>`;
  if (position === 'on' && !hideLine) {
    const seg = `<div style="flex:1;${lineStyle}"></div>`;
    let segRight = seg;
    if (grad && contentJustify === 'center' && section.mirror_center) {
      const gradR = dividerGradientCss(section, color, true);
      segRight = `<div style="flex:1;height:${thickness}px;background:${gradR};border-radius:${thickness}px;"></div>`;
    }
    const inner = contentJustify === 'left' ? `${contentHtml}${seg}` : contentJustify === 'right' ? `${seg}${contentHtml}` : `${seg}${contentHtml}${segRight}`;
    return `<div style="display:flex;justify-content:${flexJustify};${pad}">
      <div style="width:${length}%;display:flex;align-items:center;gap:calc(${gap}px * ${scale});${indent ? `padding:0 ${indent}px;` : ''}">${inner}</div>
    </div>`;
  }
  const stack = (position === 'above') ? `${contentRow}${lineRow}` : `${lineRow}${contentRow}`;
  return `<div style="display:flex;flex-direction:column;gap:calc(4px * ${scale});${pad}">${stack}</div>`;
}

// Vertical divider variant (line only), for separating covers laid out in a row.
export function dividerVerticalHtml(section, cfg) {
  cfg = cfg || {};
  const color = section.color || (cfg && cfg.divider_color) || 'var(--divider-color)';
  const thickness = Number(section.thickness) || 1;
  const length = clamp(Number(section.length) || 100, 5, 100);
  const style = section.line_style || 'solid';
  const grad = section.gradient ? dividerGradientCss(section, color, false, 'to bottom') : null;
  let lineStyle;
  if (grad) lineStyle = `width:${thickness}px;background:${grad};border-radius:${thickness}px;`;
  else if (style === 'dashed' || style === 'dotted') lineStyle = `width:0;border-left:${thickness}px ${style} ${color};`;
  else lineStyle = `width:${thickness}px;background:${color};border-radius:${thickness}px;`;
  if (section.hide_line === true) return `<div style="width:0;"></div>`;
  const padV = optNumber(section.pad_v);
  const p = padV !== null ? padV : 0;
  return `<div style="display:flex;align-items:center;height:100%;padding:0 ${p}px;">
    <div style="height:${length}%;min-height:24px;${lineStyle}"></div>
  </div>`;
}

// Byte-stable normalize: keep only keys that differ from the implicit defaults.
export function normalizeDividerSection(s) {
  s = s || {};
  const out = {};
  const setStr = (k) => { if (s[k] != null && String(s[k]) !== '') out[k] = String(s[k]); };
  const setNum = (k) => { const n = optNumber(s[k]); if (n !== null) out[k] = n; };
  const setEnum = (k, allowed) => { if (allowed.includes(s[k])) out[k] = s[k]; };
  const setBool = (k) => { if (s[k] === true) out[k] = true; };
  setStr('label'); setStr('icon'); setStr('color'); setStr('text_color'); setStr('icon_color'); setStr('text_weight');
  setNum('thickness'); setNum('length'); setNum('indent'); setNum('pad_v'); setNum('pad_top'); setNum('pad_bottom');
  setNum('text_size'); setNum('icon_size');
  setEnum('line_style', ['solid', 'dashed', 'dotted']);
  setEnum('justify', ['left', 'center', 'right']);
  setEnum('text_position', ['above', 'on', 'below']);
  setEnum('content_justify', ['left', 'center', 'right']);
  setEnum('text_color_mode', ['line', 'theme', 'fixed']);
  setEnum('icon_color_mode', ['text', 'theme', 'fixed']);
  setBool('hide_line'); setBool('hide_text'); setBool('hide_icon'); setBool('mirror_center'); setBool('gradient');
  if (Array.isArray(s.stops)) out.stops = s.stops.map(st => ({ pos: clamp(Number(st.pos) || 0, 0, 100), color: String(st.color || 'transparent') }));
  return out;
}
