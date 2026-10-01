// Retired config keys — nothing in the renderer reads any of these any more.
//
// They linger in two places: card YAML, and Cover Styles saved in HA storage. They are harmless to
// rendering but not to people: they still appear in the YAML, inflate the style editor's "N settings
// defined" count, and look like settings that should do something. Stripped on load from both.
//
// Deliberately a leaf module with NO imports, so both migrate.js and coverStyles.js can use it
// without forming an import cycle (a cycle here renders the card blank; see imagePaths.js).
export const DEAD_KEYS = [
  // v137-138: legacy layout / grouping
  'covers_direction', 'show_group_members', 'area_menu_style', 'area_orientation',
  // v145: layout presets (bakeLayoutPreset converts the value first, so this only drops the key)
  'layout_preset',
  // v152: the header's duplicate position text, superseded by Position Readout
  'show_opening', 'position_text_size', 'position_text_weight', 'position_text_color',
  'header_order', 'header_gap', 'opening_position',
  // v154: header alignment, superseded by name_align / position_align. header_align is CONVERTED to
  // name_align by migrateRetiredHeaderKeys() first; stripping only happens after that.
  'header_align', 'inline_header', 'position_background', 'opening_disabled',
  // v166: replaced by controls_button_gap + controls_pad_* (migrateControlSpacing converts first)
  'controls_gap', 'controls_button_padding', 'controls_button_margin',
  // v179: the card-wide Group Panel / Individual Panels switches, now per row (area_panels)
  'show_all_control', 'show_individual_panels',
];

// Returns a copy without dead keys, or the same object when there was nothing to remove.
// header_align is the one retired key whose VALUE still matters: left/right carries forward into
// name_align (mirrors migrateRetiredHeaderKeys for card configs, so a saved style converts the same
// way). Literals, not constants, to keep this module import-free.
export function stripDeadKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  obj = migrateControlSpacing(obj);
  let out = null;
  const ha = obj.header_align;
  if ((ha === 'left' || ha === 'right') && obj['name_align'] === undefined) {
    out = { ...obj, 'name_align': ha === 'left' ? 'start' : 'end' };
  }
  for (const k of DEAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out || obj, k)) { out = out || { ...obj }; delete out[k]; }
  }
  return out || obj;
}

// v2026.09.24.166: convert the three overlapping control-spacing settings. Only keys actually present
// are converted, so a sparse style keeps falling through for anything it never set.
//   controls_button_margin m  -> +m on every side of the button group
//   controls_gap g            -> the side of the group FACING the cover (from buttons_position)
//   controls_button_padding p -> the button box stays at the old default (icon + 2x6); anything
//                                above 6 becomes extra space between buttons (2 x (p-6))
export function migrateControlSpacing(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const has = (k) => Object.prototype.hasOwnProperty.call(obj, k);
  const bpRaw = String(obj.buttons_position || '');
  const nonLeft = has('buttons_position') && !/left/.test(bpRaw) && bpRaw !== 'auto' && bpRaw !== '';
  // already on the new keys (or converted before) -> never touch it again; this is what keeps the
  // conversion idempotent, since buttons_position alone would otherwise re-trigger it every load
  if (['controls_pad_top', 'controls_pad_right', 'controls_pad_bottom', 'controls_pad_left'].some(has)) return obj;
  if (!has('controls_gap') && !has('controls_button_margin') && !has('controls_button_padding') && !nonLeft) return obj;
  const out = { ...obj };
  const pad = { top: 0, right: 0, bottom: 0, left: 0 };
  const facing = /right/.test(bpRaw) ? 'left' : bpRaw === 'top' ? 'bottom' : bpRaw === 'bottom' ? 'top' : 'right';
  const g = has('controls_gap') ? (Number(obj.controls_gap) || 0) : 6;   // 6 was the old default
  pad[facing] += g;
  const m = Number(obj.controls_button_margin) || 0;
  Object.keys(pad).forEach((k) => { pad[k] += m; });
  out.controls_pad_top = pad.top; out.controls_pad_right = pad.right;
  out.controls_pad_bottom = pad.bottom; out.controls_pad_left = pad.left;
  const p = Number(obj.controls_button_padding);
  if (Number.isFinite(p) && p > 6 && !has('controls_button_gap')) out.controls_button_gap = 2 * (p - 6);
  return out;
}

