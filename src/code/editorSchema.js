/**
 * Editor schema for the Easy Cover Styler Card visual editor.
 * One entry per top-level panel; each field maps to a card config key.
 * Field types: group | switch | select | number | text | chips | multi | entities
 *            | color | scale | slider | entityCombo | order.
 * `group` is a heading/divider inside a panel (no key).
 * `nested` (chips) writes into an object key (e.g. auto_filter.exclude).
 * `when(editor)` conditionally shows a field.
 */
import {DIVIDER_GRADIENT_PATTERNS} from './dividers.js';

export function buildSchema(C) {
  const GRAD_PATTERNS = DIVIDER_GRADIENT_PATTERNS.map((p, i) => [String(i), p.name]);
  const DIVIDER_SIDE_KEYS = [
    C.CONFIG_GROUP_DIVIDER_LEFT, C.CONFIG_GROUP_DIVIDER_RIGHT, C.CONFIG_GROUP_DIVIDER_TOP, C.CONFIG_GROUP_DIVIDER_BOTTOM,
    C.CONFIG_IND_DIVIDER_LEFT, C.CONFIG_IND_DIVIDER_RIGHT, C.CONFIG_IND_DIVIDER_TOP, C.CONFIG_IND_DIVIDER_BOTTOM,
  ];
  const dividersOn = (ed) => DIVIDER_SIDE_KEYS.some(k => !!ed._value(k));
  const dividerGrad = (ed) => dividersOn(ed) && !!ed._value(C.CONFIG_DIVIDER_GRADIENT);
  const STATES = [
    C.SHUTTER_STATE_OPENING, C.SHUTTER_STATE_OPEN, C.SHUTTER_STATE_CLOSED,
    C.SHUTTER_STATE_CLOSING, C.SHUTTER_STATE_PARTIAL_OPEN,
  ];
  const TB = [[C.TOP, 'Top'], [C.BOTTOM, 'Bottom']];
  const SIDE = [['before', 'Left / before'], ['after', 'Right / after'], ['top', 'Top'], ['bottom', 'Bottom']];
  const ORIENT = [['auto', 'Auto (follow side)'], ['row', 'Horizontal row'], ['column', 'Vertical column']];
  const WEIGHTS = [['', 'Default'], ['normal', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['bold', 'Bold']];
  const isAreas = (ed) => !!ed._value(C.CONFIG_SHOW_AREA_SELECTOR) || ed._value(C.CONFIG_LAYOUT) === C.LAYOUT_AREAS;
  // v179: panels are chosen per row (area_panels). A group/individual section is relevant when ANY
  // row shows that panel.
  const groupOn = (ed) => ed._anyRowShows(C.AREA_PANELS_GROUP);
  const indivOn = (ed) => ed._anyRowShows(C.AREA_PANELS_INDIVIDUAL);
  const collapseOn = (ed) => isAreas(ed) && indivOn(ed) && !!ed._value(C.CONFIG_COVERS_COLLAPSIBLE);
  const isModern = (ed) => ed._value(C.CONFIG_COVER_VISUAL) === 'modern';
  const isImageVis = (ed) => !isModern(ed);
  const cleanOn = (ed) => !!ed._value(C.CONFIG_CLEAN_NAMES);
  const presetsOn = (ed) => !!ed._value(C.CONFIG_SHOW_PARTIAL_OPEN_BUTTONS);
  const valuesStyle = (ed) => presetsOn(ed) && ed._value(C.CONFIG_PARTIAL_BUTTONS_STYLE) === C.PARTIAL_STYLE_VALUES;

  return [
    {
      id: 'layout',
      icon: 'mdi:view-grid-plus-outline',
      title: 'Layout',
      hint: 'Card structure — panel arrangement and wrapping, the area buttons panel and the group panel.',
      fields: [
        {type: 'checkRow', label: 'Show', items: [
          {key: C.CONFIG_SHOW_AREA_SELECTOR, label: 'Area Buttons'},
          {key: C.CONFIG_SHOW_DIVIDERS, label: 'Dividers'},
        ]},
        {type: 'group', label: 'Cover Panels'},
        {key: C.CONFIG_ORIENTATION, label: 'Orientation', type: 'select',
          options: [['vertical', 'Vertical'], ['horizontal', 'Horizontal']],
          hint: 'How the cover panels stack — independent of the area selector.'},
        {key: C.CONFIG_COVERS_WRAP_MODE, label: 'Row/Column Alignment', type: 'select',
          options: [['scroll', 'Single line (scroll)'], ['wrap', 'Auto-wrap'], ['grid', 'Fixed columns']], when: (ed) => isAreas(ed) && indivOn(ed)},
        {key: C.CONFIG_COVERS_COLUMNS, label: 'Covers per row', type: 'slider', min: 1, max: 10, step: 1,
          when: (ed) => isAreas(ed) && indivOn(ed) && ed._value(C.CONFIG_COVERS_WRAP_MODE) === 'grid'},
        {key: C.CONFIG_COVERS_ALIGN, label: 'Alignment', type: 'select', when: (ed) => isAreas(ed) && indivOn(ed),
          options: [['start', 'Start'], ['center-group', 'Center on Group Panel'], ['center-card', 'Center on Card']],
          hint: 'Center on Group Panel lines the individual panels up on the middle of the group panel beside them. Center on Card also centres them within the card.'},
        {type: 'group', label: 'Collapse Toggle', when: (ed) => isAreas(ed) && indivOn(ed)},
        {type: 'checkRow', when: (ed) => isAreas(ed) && indivOn(ed), items: [
          {key: C.CONFIG_COVERS_COLLAPSIBLE, label: 'Allow Collapsing'},
          {key: C.CONFIG_COVERS_START_COLLAPSED, label: 'Start Collapsed', when: collapseOn},
          {key: C.CONFIG_COLLAPSE_SHOW_COUNT, label: 'Show Cover Count', when: collapseOn},
          {key: C.CONFIG_COLLAPSE_LINE, label: 'Show Divider Line', when: collapseOn},
        ]},
        {key: C.CONFIG_COLLAPSE_GAP, label: 'Space Above Toggle', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', when: collapseOn,
          hint: 'Space between the area buttons / group panel and the collapse toggle.'},
        {key: C.CONFIG_COLLAPSE_LABEL, label: 'Collapse Toggle Label', type: 'text', placeholder: 'covers', when: collapseOn},
        {key: C.CONFIG_COLLAPSE_ICON, label: 'Toggle Icon (Blank = Chevron)', type: 'text', placeholder: 'mdi:chevron-down', when: collapseOn},
        {key: C.CONFIG_COLLAPSE_ICON_SIZE, label: 'Toggle Icon Size', type: 'slider', min: 0, max: 48, step: 1, unit: 'px', zeroLabel: 'Default', when: collapseOn},
        {key: C.CONFIG_COLLAPSE_ICON_COLOR, label: 'Toggle Icon Color', type: 'color', defaultLabel: 'Inherit', when: collapseOn},
        {type: 'group', label: 'Area Buttons Panel', when: isAreas},
        {key: C.CONFIG_AREA_BUTTONS_ROW, label: 'Orientation', type: 'select', when: isAreas, bool: true,
          options: [[false, 'Vertical'], [true, 'Horizontal']],
          hint: 'How the area buttons stack.'},
        {type: 'checkRow', when: isAreas, items: [
          {key: C.CONFIG_AREA_MENU_INLINE, label: 'Inline With Covers'},
          {key: C.CONFIG_AREA_BUTTONS_ROTATE, label: 'Rotate With Panels'},
          {key: C.CONFIG_AREA_BUTTON_WRAP, label: 'Wrap Button Text'},
        ]},
        {key: C.CONFIG_AREA_BUTTONS_WRAP_MODE, label: 'Row/Column Alignment', type: 'select',
          options: [['nowrap', 'Single row (scroll)'], ['wrap', 'Auto-wrap rows'], ['grid', 'Fixed columns']], when: isAreas},
        {key: C.CONFIG_AREA_BUTTONS_COLUMNS, label: 'Button columns', type: 'slider', min: 1, max: 8, step: 1,
          when: (ed) => isAreas(ed) && ed._value(C.CONFIG_AREA_BUTTONS_WRAP_MODE) === 'grid'},
        {key: C.CONFIG_AREA_BUTTONS_ALIGN, label: 'Alignment', type: 'select', when: isAreas,
          options: [['start', 'Start'], ['center-covers', 'Center on Cover Panels'], ['center-card', 'Center on Card']],
          hint: 'Center on Cover Panels lines the buttons up on the middle of the panels beside them. Center on Card centres the button panel within the card.'},
        {type: 'group', label: 'Group Panel', when: groupOn},
        {type: 'checkRow', label: 'Group Options', when: groupOn, items: [
          {key: C.CONFIG_GROUP_INLINE, label: 'Inline With Covers'},
          {key: C.CONFIG_GROUP_STICKY, label: 'Fixed While Scrolling'},
        ]},
      ],
    },
    {
      id: 'appearance',
      icon: 'mdi:palette-outline',
      title: 'Appearance',
      hint: 'Card title, background, frame and padding, panel scaling and entity name cleanup.',
      fields: [
        {type: 'group', label: 'Card'},
        {key: C.CONFIG_TITLE, label: 'Title', type: 'text'},
        {key: C.CONFIG_CARD_BACKGROUND, label: 'Background', type: 'color',
          defaultLabel: 'Theme card background', allowTransparent: true, seedHex: '#1c1c1c'},
        {key: C.CONFIG_CARD_BORDER, label: 'Border', type: 'select',
          options: [[C.CARD_BORDER_THEME, 'Theme'], [C.CARD_BORDER_NONE, 'None'], [C.CARD_BORDER_FRAME, 'Frame Style']],
          hint: 'Theme uses your Home Assistant theme\'s card border and shadow. None removes both. Frame Style uses a frame from the Frame Style library.'},
        {key: C.CONFIG_CARD_FRAME, label: 'Frame Style', type: 'framePicker',
          when: (ed) => ed._value(C.CONFIG_CARD_BORDER) === C.CARD_BORDER_FRAME},
        {type: 'group', label: 'Card Padding'},
        {key: C.CONFIG_CARD_PAD_TOP, label: 'Padding Top', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_CARD_PAD_RIGHT, label: 'Padding Right', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_CARD_PAD_BOTTOM, label: 'Padding Bottom', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_CARD_PAD_LEFT, label: 'Padding Left', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {type: 'group', label: 'Group Panel', when: groupOn},
        {key: C.CONFIG_GROUP_NAME_FROM_AREA, label: 'Use the selected area name', type: 'switch',
          when: groupOn,
          hint: 'Group panel shows the active area button\'s name instead of a fixed name.'},
        {key: C.CONFIG_ALL_LABEL, label: 'Group panel name', type: 'text',
          when: (ed) => groupOn(ed) && !ed._value(C.CONFIG_GROUP_NAME_FROM_AREA)},
        {key: C.CONFIG_GROUP_SCALE, label: 'Group Panel Scale', type: 'slider', min: 50, max: 200, step: 5, unit: '%',
          when: groupOn, hint: 'Scales everything in the group panel at one rate. The covers beside it reflow to make room.'},
        {type: 'group', label: 'Area Buttons Panel', when: isAreas},
        {type: 'group', label: 'Individual Cover Panels', when: indivOn},
        {key: C.CONFIG_COVERS_SCALE, label: 'Individual Panels Scale', type: 'slider', min: 50, max: 200, step: 5, unit: '%',
          when: indivOn, hint: 'Scales every individual cover panel by the same amount, so the set stays uniform however many covers there are.'},
        {key: C.CONFIG_AREA_BUTTONS_SCALE, label: 'Area Buttons Scale', type: 'slider', min: 50, max: 200, step: 5, unit: '%',
          when: isAreas, hint: 'Scales the area buttons panel at one rate — buttons, text and icons. The panels beside it reflow to make room.'},
        {type: 'group', label: 'Scaling'},
        {key: C.CONFIG_CARD_SCALE, label: 'Card Scale', type: 'slider', min: 50, max: 200, step: 5, unit: '%',
          hint: 'Scales the whole card at one rate — every panel, button, text and the frame. The per-element scales below still apply on top.'},
        {key: C.CONFIG_SCALE_TEXTS, label: 'Scale texts', type: 'scale'},
        {key: C.CONFIG_SCALE_BUTTONS, label: 'Scale buttons', type: 'scale'},
        {key: C.CONFIG_SCALE_ICONS, label: 'Scale icons', type: 'scale'},
        {type: 'group', label: 'Entity Name Cleaner'},
        {type: 'checkRow', items: [
          {key: C.CONFIG_NAME_STRIP_AREA, label: 'Remove Area from Name'},
          {key: C.CONFIG_NAME_CAPITALIZE, label: 'Capitalize'},
        ]},
        // The chips label doubles as the Clean Up Names toggle: one row instead of a checkbox that
        // only exists to reveal the input directly beneath it.
        {key: C.CONFIG_NAME_REMOVE, label: 'Remove Words / Substrings', type: 'chips',
          placeholder: 'e.g. Cover, Shade…', labelCheck: C.CONFIG_CLEAN_NAMES,
          hint: 'Tick to clean up entity names, then list any words or substrings to strip out.'},
      ],
    },
    {
      id: 'filters',
      icon: 'mdi:tune-variant',
      title: 'Covers & Styles',
      hint: 'What this card shows, and how each part looks. Search for an Area, Label, Cover or Group, then give each row a Cover Style (Default uses the fallback below).',
      fields: [
        {key: C.CONFIG_AREA_BUTTON_STYLE, label: 'Area Button Style', type: 'buttonStyle', when: isAreas,
          hint: 'Uses the shared Button Styles library — or a built-in.'},
        {type: 'group', label: 'Cover Entities'},
        {type: 'coverSources', label: '', presetKeys: []},
        {type: 'group', label: 'Status Sources'},
        {key: C.CONFIG_BATTERY_ENTITY_ID, label: 'Battery Source', type: 'entityCombo',
          hint: 'Entity ids stay on the card (never inside a shared Cover Style).'},
        {key: C.CONFIG_SIGNAL_ENTITY_ID, label: 'Signal Source', type: 'entityCombo'},
        {type: 'group', label: 'Filters'},
        {key: C.CONFIG_AUTO_FILTER, nested: 'device_class', label: 'Only These Device Classes', type: 'pickList',
          kind: 'deviceClass', placeholder: 'Search device classes…',
          hint: 'Applies to Areas/Labels. Leave empty to include all cover classes except the excluded ones.'},
        {key: C.CONFIG_AUTO_FILTER, nested: 'exclude', label: 'Exclude Device Classes', type: 'pickList', kind: 'deviceClass', placeholder: 'Search device classes…'},
        {type: 'checkRow', items: [
          {key: C.CONFIG_AUTO_FILTER, nested: C.AUTO_FILTER_EXCLUDE_HIDDEN, label: 'Exclude Hidden Entities', def: true,
            hint: 'Skip covers hidden in HA\u2019s entity settings (Visibility off). Applies to Areas and Labels; a cover you list explicitly is always shown. Disabled entities are always skipped.'},
        ]},
      ],
    },
    {
      id: 'dividers',
      icon: 'mdi:minus',
      title: 'Dividers & Spacing',
      hint: 'Dividers between panels, and the padding around them. All dividers share one style.',
      fields: [
        {type: 'dividerSides', label: '', presetKeys: [
          C.CONFIG_GROUP_DIVIDER_LEFT, C.CONFIG_GROUP_DIVIDER_RIGHT, C.CONFIG_GROUP_DIVIDER_TOP, C.CONFIG_GROUP_DIVIDER_BOTTOM,
          C.CONFIG_IND_DIVIDER_LEFT, C.CONFIG_IND_DIVIDER_RIGHT, C.CONFIG_IND_DIVIDER_TOP, C.CONFIG_IND_DIVIDER_BOTTOM]},
        {type: 'group', label: 'Line', when: dividersOn},
        {key: C.CONFIG_DIVIDER_HIDE_LINE, label: 'Hide line (content only)', type: 'switch', when: dividersOn},
        {key: C.CONFIG_DIVIDER_STYLE, label: 'Line style', type: 'select',
          options: [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_COLOR, label: 'Line color', type: 'color', defaultLabel: 'Theme divider', when: dividersOn},
        {key: C.CONFIG_DIVIDER_THICKNESS, label: 'Thickness', type: 'slider', min: 1, max: 12, step: 1, unit: 'px', when: dividersOn},
        {key: C.CONFIG_DIVIDER_LENGTH, label: 'Length', type: 'slider', min: 5, max: 100, step: 1, unit: '%', when: dividersOn},
        {key: C.CONFIG_DIVIDER_JUSTIFY, label: 'Line position', type: 'select',
          options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_PAD, label: 'Padding', type: 'slider', min: 0, max: 40, step: 1, unit: 'px', when: dividersOn},
        {type: 'group', label: 'Gradient', when: dividersOn},
        {key: C.CONFIG_DIVIDER_GRADIENT, label: 'Gradient line', type: 'switch', when: dividersOn},
        {key: C.CONFIG_DIVIDER_GRADIENT_PATTERN, label: 'Preset pattern', type: 'select', options: GRAD_PATTERNS, when: dividerGrad},
        {key: C.CONFIG_DIVIDER_STOPS, label: 'Custom stops', type: 'gradientStops', when: dividerGrad,
          hint: 'Override the preset with your own stops (add ≥2). Empty = use the preset above.'},
        {key: C.CONFIG_DIVIDER_MIRROR_CENTER, label: 'Mirror around centered content', type: 'switch', when: dividerGrad},
        {type: 'group', label: 'Text', when: dividersOn},
        {key: C.CONFIG_DIVIDER_LABEL, label: 'Label', type: 'text', when: dividersOn},
        {key: C.CONFIG_DIVIDER_TEXT_POSITION, label: 'Content position', type: 'select',
          options: [['above', 'Above'], ['on', 'On the line'], ['below', 'Below']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_CONTENT_JUSTIFY, label: 'Content alignment', type: 'select',
          options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_INDENT, label: 'Indent', type: 'slider', min: 0, max: 200, step: 2, unit: 'px', when: dividersOn},
        {key: C.CONFIG_DIVIDER_TEXT_SIZE, label: 'Text size', type: 'slider', min: 8, max: 40, step: 1, unit: 'px', when: dividersOn},
        {key: C.CONFIG_DIVIDER_TEXT_WEIGHT, label: 'Text weight', type: 'select', options: WEIGHTS, when: dividersOn},
        {key: C.CONFIG_DIVIDER_TEXT_COLOR_MODE, label: 'Text color', type: 'select',
          options: [['line', 'Match line'], ['theme', 'Theme'], ['fixed', 'Custom']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_TEXT_COLOR, label: 'Text color value', type: 'color', defaultLabel: 'None',
          when: (ed) => dividersOn(ed) && ['theme', 'fixed'].includes(ed._value(C.CONFIG_DIVIDER_TEXT_COLOR_MODE))},
        {type: 'group', label: 'Icon', when: dividersOn},
        {key: C.CONFIG_DIVIDER_ICON, label: 'Icon (mdi:…)', type: 'text', when: dividersOn},
        {key: C.CONFIG_DIVIDER_ICON_SIZE, label: 'Icon size', type: 'slider', min: 0, max: 48, step: 1, unit: 'px', zeroLabel: 'Auto', when: dividersOn},
        {key: C.CONFIG_DIVIDER_ICON_COLOR_MODE, label: 'Icon color', type: 'select',
          options: [['text', 'Match text'], ['theme', 'Theme'], ['fixed', 'Custom']], when: dividersOn},
        {key: C.CONFIG_DIVIDER_ICON_COLOR, label: 'Icon color value', type: 'color', defaultLabel: 'None',
          when: (ed) => dividersOn(ed) && ['theme', 'fixed'].includes(ed._value(C.CONFIG_DIVIDER_ICON_COLOR_MODE))},
        {type: 'group', label: 'Group Panel Padding', when: groupOn},
        {key: C.CONFIG_GROUP_PAD_TOP, label: 'Padding Top', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', when: groupOn},
        {key: C.CONFIG_GROUP_PAD_RIGHT, label: 'Padding Right', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', when: groupOn},
        {key: C.CONFIG_GROUP_PAD_BOTTOM, label: 'Padding Bottom', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', when: groupOn},
        {key: C.CONFIG_GROUP_PAD_LEFT, label: 'Padding Left', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', when: groupOn},
        {type: 'group', label: 'Individual Panel Padding'},
        {key: C.CONFIG_COVER_PAD_TOP, label: 'Padding Top', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_COVER_PAD_RIGHT, label: 'Padding Right', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_COVER_PAD_BOTTOM, label: 'Padding Bottom', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {key: C.CONFIG_COVER_PAD_LEFT, label: 'Padding Left', type: 'slider', min: 0, max: 60, step: 1, unit: 'px'},
        {type: 'group', label: 'Padding Between Panel Sections'},
        {key: C.CONFIG_COVER_GAP, label: 'Group ↔ Individual Panels', type: 'slider', min: 0, max: 80, step: 1, unit: 'px'},
      ],
    },
    {
      id: 'behavior',
      icon: 'mdi:cog-outline',
      title: 'Controls Behavior',
      hint: 'How a cover behaves is part of its Cover Style. Only settings naming a specific entity stay on the card — top-down/bottom-up covers name their top-rail entity here.',
      fields: [
        {type: 'note', label: 'Movement direction, travel model, inversion, position presets, favorite position, limits, tilt angles and per-state button hiding now live in the Cover Style — edit them under Libraries \u2192 Cover Styles.'},
        {type: 'group', label: 'Top-Rail Entities (TDBU)'},
        {type: 'tdbuMap', label: ''},
      ],
    },
  ];
}
