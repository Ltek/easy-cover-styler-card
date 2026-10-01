// Legacy config migration — ONE implementation, called by BOTH the card and the editor.
//
// It used to live only in the editor's setConfig, which meant a card was migrated only if someone
// opened it for editing; a card left alone kept relying on the legacy read path in classes.js
// forever. Now the card migrates on load too, which is what makes removing that read path safe.
//
// Every step is idempotent: it converts a legacy key then deletes it, so running this on an
// already-migrated config is a no-op.
import * as C from './constants.js';
import {coverStyleEntry, builtinCoverStyleSlug} from './coverStyles.js';
import {migrateImageKeys} from './imagePaths.js';
import {DEAD_KEYS, migrateControlSpacing} from './deadKeys.js';

// Legacy keys that carry per-cover overrides. If one of these SURVIVES migration it means the entry
// was not a plain cover-type reference (it also set images/positions), so it cannot be expressed as
// a built-in Cover Style. Nothing reads them any more, so say so loudly rather than dropping it
// silently — the fix is to recreate that look as a Cover Style.
const LEGACY_OVERRIDE_KEYS = [C.CONFIG_AREA_PRESETS, C.CONFIG_ENTITY_PRESETS];



// ---------------------------------------------------------------------------
// v2026.09.24.145: layout presets are retired. They were a BASE LAYER under the card config, which
// is what made "unticking a checkbox does nothing" possible (deleting a key let the preset's value
// resurface — the Allow Collapsing bug). By the end they also wrote 19 keys that Cover Styles own,
// so a preset was a second source of truth for those.
//
// The table is kept HERE, frozen, purely so an existing `layout_preset` can be baked into the config
// once. After that the key is dropped and nothing consults a preset again.
const _areaMenuCommon = {
  [C.CONFIG_AREA_BUTTONS_WRAP_MODE]: 'wrap', [C.CONFIG_AREA_BUTTONS_COLUMNS]: 4,
  [C.CONFIG_AREA_BUTTONS_PLACEMENT]: C.LEFT, [C.CONFIG_GROUP_WITH_COVERS]: true,
};
const _barControls = {
  [C.CONFIG_STANDARD_ORIENTATION]: 'column', [C.CONFIG_PRESETS_ORIENTATION]: 'column',
  [C.CONFIG_BUTTONS_POSITION]: 'auto-top-left', [C.CONFIG_ICONS_POSITION]: C.BOTTOM,
  [C.CONFIG_POSITION_PLACEMENT]: 'on-handle', [C.CONFIG_PANEL_POS_END]: 'above',
};
const _allOn = {
  [C.CONFIG_SHOW_AREA_SELECTOR]: true, [C.CONFIG_SHOW_DIVIDERS]: true,
};
const LEGACY_LAYOUT_PRESETS = [
  { id: 'preset_1', name: 'Preset 1',
    hint: 'Horizontal covers that auto-wrap, area-button menu column, collapsible individual covers. (from view: shades)',
    config: {
      [C.CONFIG_STACKED]: C.HORIZONTAL, [C.CONFIG_ORIENTATION]: C.HORIZONTAL,
      [C.CONFIG_PANEL_ROTATION]: C.PANEL_ROTATION_NORMAL,
      [C.CONFIG_COVERS_WRAP_MODE]: 'wrap', [C.CONFIG_COVERS_COLUMNS]: 0,
      [C.CONFIG_COVERS_COLLAPSIBLE]: true,
      [C.CONFIG_AREA_MENU_INLINE]: false, [C.CONFIG_GROUP_INLINE]: false,
      [C.CONFIG_BUTTONS_POSITION]: 'auto',
      ..._areaMenuCommon,
    },
    toggles: _allOn },
  { id: 'preset_2', name: 'Preset 2',
    hint: 'Area buttons C.INLINE with the covers, inline group panel, bar-style control placement, collapsible covers. (from view: shades-mod)',
    config: {
      [C.CONFIG_STACKED]: C.HORIZONTAL, [C.CONFIG_ORIENTATION]: C.HORIZONTAL,
      [C.CONFIG_PANEL_ROTATION]: C.PANEL_ROTATION_NORMAL,
      [C.CONFIG_COVERS_COLLAPSIBLE]: true,
      [C.CONFIG_AREA_MENU_INLINE]: true, [C.CONFIG_GROUP_INLINE]: true,
      [C.CONFIG_STANDARD_POSITION]: C.BOTTOM, [C.CONFIG_SLIDER_POSITION]: C.TOP, [C.CONFIG_PRESETS_POSITION]: 'before',
      ..._barControls, ..._areaMenuCommon,
    },
    toggles: _allOn },
  { id: 'preset_3', name: 'Preset 3',
    hint: 'Area buttons in their own menu column (not inline), covers auto-wrap, bar-style control placement, collapsible covers. (from view: shades2)',
    config: {
      [C.CONFIG_STACKED]: C.HORIZONTAL, [C.CONFIG_ORIENTATION]: C.HORIZONTAL,
      [C.CONFIG_PANEL_ROTATION]: C.PANEL_ROTATION_NORMAL,
      [C.CONFIG_COVERS_WRAP_MODE]: 'wrap', [C.CONFIG_COVERS_COLUMNS]: 0,
      [C.CONFIG_COVERS_COLLAPSIBLE]: true,
      [C.CONFIG_AREA_MENU_INLINE]: false, [C.CONFIG_GROUP_INLINE]: false,
      [C.CONFIG_STANDARD_POSITION]: C.BOTTOM, [C.CONFIG_SLIDER_POSITION]: C.TOP, [C.CONFIG_PRESETS_POSITION]: 'before',
      ..._barControls, ..._areaMenuCommon,
    },
    toggles: _allOn },
  { id: 'preset_4', name: 'Preset 4',
    hint: 'Horizontal area-button bar on top, inline group panel, bar-style control placement, no collapse. (from view: shades3)',
    config: {
      [C.CONFIG_STACKED]: C.HORIZONTAL, [C.CONFIG_ORIENTATION]: C.HORIZONTAL,
      [C.CONFIG_PANEL_ROTATION]: C.PANEL_ROTATION_NORMAL,
      [C.CONFIG_COVERS_COLLAPSIBLE]: false,
      [C.CONFIG_AREA_MENU_INLINE]: false, [C.CONFIG_AREA_BUTTONS_ROW]: true, [C.CONFIG_GROUP_INLINE]: true,
      ..._barControls, ..._areaMenuCommon,
    },
    toggles: _allOn },
];

function bakeLayoutPreset(c) {
  const id = c[C.CONFIG_LAYOUT_PRESET];
  if (!id) return;
  const preset = LEGACY_LAYOUT_PRESETS.find((p) => p.id === id);
  delete c[C.CONFIG_LAYOUT_PRESET];
  if (!preset) return;
  // The user's own value always won over the preset, so only fill keys the config does not set.
  const base = { ...preset.config, ...(preset.toggles || {}) };
  Object.keys(base).forEach((k) => { if (c[k] === undefined) c[k] = base[k]; });
}

// v2026.09.24.148: a Cover Style used to EMBED a copy of its slider values. Styles now LINK instead,
// so drop the copy wherever a source is recorded — the library becomes the single definition. A copy
// with NO source is left alone: there is nothing to link it to, and discarding it would silently
// change how that style looks.
// v2026.09.24.154: keys whose code is gone. The constants were deleted with the code, so the key
// names are literal here — this list is the only place they still exist.
export const RETIRED_KEYS = [
  'position_text_size', 'position_text_color', 'position_text_weight', 'position_background',
  'show_opening', 'opening_disabled', 'opening_position', 'inline_header',
  'header_order', 'header_gap', 'header_align',
];
// header_align (left|center|right, YAML-only since the editor dropped it) carries forward into
// name_align, which now does that job. Everything else is dropped.
export function migrateRetiredHeaderKeys(c) {
  const ha = c.header_align;
  if ((ha === 'left' || ha === 'right') && c[C.CONFIG_NAME_ALIGN] === undefined) {
    c[C.CONFIG_NAME_ALIGN] = ha === 'left' ? C.ALIGN_START : C.ALIGN_END;
  }
  RETIRED_KEYS.forEach((k) => { delete c[k]; });
  return c;
}

export function migrateCoverStyleEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  if (entry.slider && entry.slider_source) return { ...entry, slider: null };
  return entry;
}

// v2026.09.24.155: the built-ins were cut from 11 to 4. Remap the retired slugs onto the nearest
// survivor so existing assignments keep rendering something sensible rather than falling back to the
// card's bare settings. A user-created style is never touched — only these known built-in slugs.
const RETIRED_BUILTIN_STYLES = {
  '__cs_awning__': '__cs_roller_shutter__',
  '__cs_screen__': '__cs_shade__',
  '__cs_blind__': '__cs_roller_shutter__',
  '__cs_window_shutter__': '__cs_roller_shutter__',
  '__cs_balcony_door_left__': '__cs_roller_shutter__',
  '__cs_balcony_door_right__': '__cs_roller_shutter__',
  '__cs_compact__': '__cs_modern_bar__',
};
function remapRetiredStyles(c) {
  const to = (ref) => RETIRED_BUILTIN_STYLES[String(ref || '')] || ref;
  if (c[C.CONFIG_COVER_STYLE_DEFAULT]) c[C.CONFIG_COVER_STYLE_DEFAULT] = to(c[C.CONFIG_COVER_STYLE_DEFAULT]);
  const byStyle = c[C.CONFIG_COVER_STYLES];
  if (byStyle && typeof byStyle === 'object') {
    const next = {};
    Object.keys(byStyle).forEach((ref) => {
      const t = to(ref);
      // two retired slugs can map to the same survivor — merge their area lists rather than losing one
      next[t] = [...new Set([...(next[t] || []), ...(Array.isArray(byStyle[ref]) ? byStyle[ref] : [])])];
    });
    c[C.CONFIG_COVER_STYLES] = next;
  }
  const byEnt = c[C.CONFIG_COVER_STYLES_ENTITIES];
  if (byEnt && typeof byEnt === 'object') {
    const next = {};
    Object.keys(byEnt).forEach((id) => { next[id] = to(byEnt[id]); });
    c[C.CONFIG_COVER_STYLES_ENTITIES] = next;
  }
}

// v2026.09.24.163: cover_pad_* used to pad the group panel too. Now it is individual panels only, so
// copy it onto the new group_pad_* once — only when no group padding is set — so an existing card's
// group panel keeps the padding it already had.
function splitPanelPadding(c) {
  const sides = ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
  const hasGroup = sides.some((sd) => c[C['CONFIG_GROUP_PAD_' + sd]] !== undefined);
  if (hasGroup) return;
  sides.forEach((sd) => {
    const v = c[C['CONFIG_COVER_PAD_' + sd]];
    if (v !== undefined && Number(v) !== 0) c[C['CONFIG_GROUP_PAD_' + sd]] = v;
  });
}

export function migrateConfig(config) {
  const c = { ...(config || {}) };
  // v2026.09.30.187: Border mode. A card that already has a frame keeps it (Frame Style mode).
  if (c[C.CONFIG_CARD_FRAME] && c[C.CONFIG_CARD_BORDER] === undefined) c[C.CONFIG_CARD_BORDER] = C.CARD_BORDER_FRAME;
    // v2026.09.24.120 migration: legacy cover-type presets -> Cover Style assignments.
    // Only entries whose ONLY key is `shutter_preset` are converted (they map 1:1 onto a built-in
    // Cover Style). Anything that also sets images/positions is left alone and keeps working through
    // the legacy read path, so nothing is half-migrated.
    {
      const onlyPreset = (o) => o && typeof o === 'object'
        && Object.keys(o).length === 1 && typeof o[C.CONFIG_SHUTTER_PRESET] === 'string';
      const styleFor = (type) => builtinCoverStyleSlug(type);
      // card-level default cover type -> default Cover Style
      if (typeof c[C.CONFIG_SHUTTER_PRESET] === 'string' && c[C.CONFIG_SHUTTER_PRESET]
          && !c[C.CONFIG_COVER_STYLE_DEFAULT]) {
        const slug = styleFor(c[C.CONFIG_SHUTTER_PRESET]);
        if (coverStyleEntry(slug)) { c[C.CONFIG_COVER_STYLE_DEFAULT] = slug; delete c[C.CONFIG_SHUTTER_PRESET]; }
      }
      // per-area presets -> cover_styles { styleRef: [areas] }
      const ap = c[C.CONFIG_AREA_PRESETS];
      if (ap && typeof ap === 'object') {
        const styles = { ...(c[C.CONFIG_COVER_STYLES] || {}) };
        const leftover = {};
        Object.keys(ap).forEach((area) => {
          if (!onlyPreset(ap[area])) { leftover[area] = ap[area]; return; }
          const slug = styleFor(ap[area][C.CONFIG_SHUTTER_PRESET]);
          if (!coverStyleEntry(slug)) { leftover[area] = ap[area]; return; }
          const list = styles[slug] || [];
          if (!list.some(v => String(v).toLowerCase() === String(area).toLowerCase())) list.push(area);
          styles[slug] = list;
        });
        if (Object.keys(styles).length) c[C.CONFIG_COVER_STYLES] = styles;
        if (Object.keys(leftover).length) c[C.CONFIG_AREA_PRESETS] = leftover; else delete c[C.CONFIG_AREA_PRESETS];
      }
      // per-entity presets -> cover_styles_entities { entity: styleRef }
      const ep = c[C.CONFIG_ENTITY_PRESETS];
      if (ep && typeof ep === 'object') {
        const ents = { ...(c[C.CONFIG_COVER_STYLES_ENTITIES] || {}) };
        const leftover = {};
        Object.keys(ep).forEach((id) => {
          if (!onlyPreset(ep[id])) { leftover[id] = ep[id]; return; }
          const slug = styleFor(ep[id][C.CONFIG_SHUTTER_PRESET]);
          if (!coverStyleEntry(slug)) { leftover[id] = ep[id]; return; }
          ents[id] = slug;
        });
        if (Object.keys(ents).length) c[C.CONFIG_COVER_STYLES_ENTITIES] = ents;
        if (Object.keys(leftover).length) c[C.CONFIG_ENTITY_PRESETS] = leftover; else delete c[C.CONFIG_ENTITY_PRESETS];
      }
    }
    // Build 4 migration: legacy `show_cover_dividers` (single "between panels" toggle) → the per-side
    // model. Maps to ind_divider_left when no per-side key is set, then drops the legacy key.
    if (c[C.CONFIG_SHOW_COVER_DIVIDERS] !== undefined) {
      if (c[C.CONFIG_SHOW_COVER_DIVIDERS] === true) {
        const hasSide = c[C.CONFIG_IND_DIVIDER_LEFT] || c[C.CONFIG_IND_DIVIDER_RIGHT]
          || c[C.CONFIG_IND_DIVIDER_TOP] || c[C.CONFIG_IND_DIVIDER_BOTTOM];
        if (!hasSide) c[C.CONFIG_IND_DIVIDER_LEFT] = true;
      }
      delete c[C.CONFIG_SHOW_COVER_DIVIDERS];
    }
    // migrate legacy layout:areas → the explicit show_area_selector toggle (so it can be turned off)
    if (c[C.CONFIG_LAYOUT] === C.LAYOUT_AREAS && c[C.CONFIG_SHOW_AREA_SELECTOR] === undefined) {
      c[C.CONFIG_SHOW_AREA_SELECTOR] = true;
      delete c[C.CONFIG_LAYOUT];
    }
    // migrate legacy free cover_order → deterministic per-control before/after-window positions
    if (Array.isArray(c[C.CONFIG_COVER_ORDER]) && c[C.CONFIG_COVER_ORDER].length) {
      const ord = c[C.CONFIG_COVER_ORDER];
      const win = ord.indexOf(C.COVER_SEG_WINDOW);
      const posOf = (seg, def) => { const i = ord.indexOf(seg); if (i < 0 || win < 0) return def; return i < win ? 'before' : 'after'; };
      const set = (key, seg, def) => { const v = posOf(seg, def); if (v !== C.CONFIG_DEFAULT[key]) c[key] = v; };
      set(C.CONFIG_STANDARD_POSITION, C.COVER_SEG_STANDARD, 'before');
      set(C.CONFIG_SLIDER_POSITION, C.COVER_SEG_SLIDER, 'before');
      set(C.CONFIG_TILT_POSITION, C.COVER_SEG_TILT, 'after');
      set(C.CONFIG_PRESETS_POSITION, C.COVER_SEG_PRESETS, 'after');
      delete c[C.CONFIG_COVER_ORDER];
    }
    // migrate a previously-configured panel placement (position_placement / legacy modern_value_position)
    // to the new independent panel Position Value show flag so it keeps rendering
    if (c[C.CONFIG_PANEL_POS_SHOW] === undefined) {
      const pp = c[C.CONFIG_POSITION_PLACEMENT];
      const mv = c[C.CONFIG_MODERN_VALUE_POS];
      const legacy = (v) => v && v !== 'default';
      if (legacy(pp) || legacy(mv)) {
        c[C.CONFIG_PANEL_POS_SHOW] = true;
        if (!legacy(pp) && legacy(mv)) c[C.CONFIG_POSITION_PLACEMENT] = mv;
      }
    }
  bakeLayoutPreset(c);
  remapRetiredStyles(c);
  splitPanelPadding(c);
  migrateRetiredHeaderKeys(c);   // converts header_align -> name_align, THEN drops its keys
  // image paths (v140) — card-level slots, plus any legacy preset blobs still carrying them
  Object.assign(c, migrateImageKeys(c));
  [C.CONFIG_AREA_PRESETS, C.CONFIG_ENTITY_PRESETS].forEach((key) => {
    const blob = c[key];
    if (!blob || typeof blob !== 'object') return;
    const next = {};
    Object.keys(blob).forEach((k) => { next[k] = migrateImageKeys(blob[k]); });
    c[key] = next;
  });
  Object.assign(c, migrateControlSpacing(c));
  // LAST: every conversion above has already read what it needs from a legacy key
  DEAD_KEYS.forEach((k) => { delete c[k]; });
  return c;
}

// Warn once per distinct leftover so the console is not spammed on every render.
const warned = new Set();
export function warnLegacyLeftovers(config) {
  LEGACY_OVERRIDE_KEYS.forEach((k) => {
    const v = config?.[k];
    if (!v || typeof v !== 'object' || !Object.keys(v).length) return;
    const sig = k + ':' + Object.keys(v).sort().join(',');
    if (warned.has(sig)) return;
    warned.add(sig);
    console.warn(`[easy-cover-styler-card] "${k}" still contains ${Object.keys(v).join(', ')}. `
      + 'These entries set more than a cover type, so they could not be converted automatically and '
      + 'are NO LONGER APPLIED. Recreate the look as a Cover Style (Libraries -> Cover Styles) and '
      + 'assign it under Covers & Styles, then remove the key.');
  });
}
