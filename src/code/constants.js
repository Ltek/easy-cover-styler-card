import {
  setDebug,
  getDebug,
  isRunningLocally,
} from './functions.js';


export const NONE = 'none';

export const HORIZONTAL = 'horizontal';
export const VERTICAL = 'vertical';
export const TOP = 'top';
export const BOTTOM = 'bottom';
export const UP = 'up';
export const DOWN = 'down';
export const LEFT = 'left';
export const RIGHT = 'right';
export const HA_TITLE_FONT = 'Roboto, Noto, sans-serif';
export const DISPLAY_DECIMALS = 0;

export const ESC_CLASS_BASE_NAME = 'esc-shutter';
export const ESC_CLASS_SHUTTER_SEPARATE = `${ESC_CLASS_BASE_NAME}-separate`
export const ESC_CLASS_TOP = `${ESC_CLASS_BASE_NAME}-${TOP}`;
export const ESC_CLASS_MIDDLE = `${ESC_CLASS_BASE_NAME}-middle`;
export const ESC_CLASS_BOTTOM = `${ESC_CLASS_BASE_NAME}-${BOTTOM}`;
export const ESC_CLASS_TOP_BOTTOM = `${ESC_CLASS_BASE_NAME}-${TOP}-${BOTTOM}`;
export const ESC_CLASS_LABEL = `${ESC_CLASS_BASE_NAME}-label`;
export const ESC_CLASS_POSITION = `${ESC_CLASS_BASE_NAME}-position`;
export const ESC_CLASS_LABEL_DISABLED = `${ESC_CLASS_LABEL}-disabled`;
export const ESC_CLASS_BUTTONS = `${ESC_CLASS_BASE_NAME}-buttons`;
export const ESC_CLASS_SHUTTER = `${ESC_CLASS_BASE_NAME}`;

export const ESC_CLASS_HA_ICON = `${ESC_CLASS_BASE_NAME}-ha-icon`;
export const ESC_CLASS_HA_ICON_LOCK = `${ESC_CLASS_HA_ICON}-lock`;
export const ESC_CLASS_HA_ICON_TILT = `${ESC_CLASS_HA_ICON}-tilt`;

export const ESC_CLASS_ICON_LEFT = `${ESC_CLASS_BASE_NAME}-icon-${LEFT}`;
export const ESC_CLASS_ICON_RIGHT = `${ESC_CLASS_BASE_NAME}-icon-${RIGHT}`;
export const ESC_CLASS_TOP_ICON_TEXT = `${ESC_CLASS_BASE_NAME}-icon-text`;


export const ESC_CLASS_SELECTOR = `${ESC_CLASS_BASE_NAME}-selector`;
export const ESC_CLASS_SELECTOR_PICTURE = `${ESC_CLASS_BASE_NAME}-selector-picture`;
export const ESC_CLASS_SELECTOR_PICKER = `${ESC_CLASS_BASE_NAME}-selector-picker`;
export const ESC_CLASS_SELECTOR_PARTIAL = `${ESC_CLASS_BASE_NAME}-selector-partial`;
export const ESC_CLASS_SELECTOR_SLIDE = `${ESC_CLASS_BASE_NAME}-selector-slide`;
export const ESC_CLASS_SELECTOR_SLIDE_SLATS = `${ESC_CLASS_SELECTOR_SLIDE}-slats`;
export const ESC_CLASS_SELECTOR_SLIDE_EDGE = `${ESC_CLASS_SELECTOR_SLIDE}-edge`;

export const ESC_CLASS_MOVEMENT_OVERLAY = `${ESC_CLASS_BASE_NAME}-movement-overlay`; // esc-shutter-movement-overlay
export const ESC_CLASS_MOVEMENT_UP = `${ESC_CLASS_BASE_NAME}-movement-up`; // esc-shutter-movement-up
export const ESC_CLASS_MOVEMENT_DOWN = `${ESC_CLASS_BASE_NAME}-movement-down`; // esc-shutter-movement-down


export const ESC_CLASS_TILT = `${ESC_CLASS_BASE_NAME}-tilt`;
export const ESC_CLASS_TILT_CONTAINER = `${ESC_CLASS_TILT}-container`;
export const ESC_CLASS_TILT_CLASS = `${ESC_CLASS_TILT}-class`;
export const ESC_CLASS_TILT_LINE = `${ESC_CLASS_TILT}-line`;
export const ESC_CLASS_TILT_SLAT1 = `${ESC_CLASS_TILT}-slat1`;
export const ESC_CLASS_TILT_SLAT2 = `${ESC_CLASS_TILT}-slat2`;
export const ESC_CLASS_TILT_SLAT3 = `${ESC_CLASS_TILT}-slat3`;
export const ESC_CLASS_TILT_EDGE = `${ESC_CLASS_TILT}-slat-edge`;

// v1.7.0 area-selector layout
export const ESC_CLASS_AREA_LAYOUT = `${ESC_CLASS_BASE_NAME}-area-layout`;
export const ESC_CLASS_AREA_TOPBAR = `${ESC_CLASS_BASE_NAME}-area-topbar`;
export const ESC_CLASS_AREA_BUTTONS = `${ESC_CLASS_BASE_NAME}-area-buttons`;
export const ESC_CLASS_AREA_BUTTON = `${ESC_CLASS_BASE_NAME}-area-button`;
export const ESC_CLASS_AREA_BUTTON_ACTIVE = `${ESC_CLASS_BASE_NAME}-area-button-active`;
export const ESC_CLASS_AREA_ALL = `${ESC_CLASS_BASE_NAME}-area-all`;
export const ESC_CLASS_AREA_COVERS = `${ESC_CLASS_BASE_NAME}-area-covers`;
export const ESC_CLASS_AREA_COVERS_TOGGLE = `${ESC_CLASS_BASE_NAME}-area-covers-toggle`;
export const ESC_CLASS_AREA_GROUP_INLINE = `${ESC_CLASS_BASE_NAME}-area-group-inline`;
export const ESC_CLASS_AREA_MAIN = `${ESC_CLASS_BASE_NAME}-area-main`;

export const ESC_CLASS_SLIDER = `${ESC_CLASS_TILT}-slider`;
export const ESC_CLASS_SLIDER_WRAP = `${ESC_CLASS_SLIDER}-wrap`;
export const ESC_CLASS_SLIDER_CLASS = `${ESC_CLASS_SLIDER}-class`;


export const FONT_SIZE_LABEL = 20;
export const LINE_HEIGHT_LABEL = 30;
export const UNITY= 'px';
export const FONT_SIZE_POSITION = 14;
export const MARGIN_POSITION = 5;
export const ICON_SIZE = 24;
export const ICON_DIV_SIZE = 34;
export const LINE_HEIGHT_POSITION = 20;
export const SELECTOR_MARGIN = 4;

export const ESC_FEATURE_OPEN              = 0b00000001; // 1
export const ESC_FEATURE_CLOSE             = 0b00000010; // 2
export const ESC_FEATURE_SET_POSITION      = 0b00000100; // 4
export const ESC_FEATURE_STOP              = 0b00001000; // 8
export const ESC_FEATURE_OPEN_TILT         = 0b00010000; // 16
export const ESC_FEATURE_CLOSE_TILT        = 0b00100000; // 32
export const ESC_FEATURE_STOP_TILT         = 0b01000000; // 64
export const ESC_FEATURE_SET_TILT_POSITION = 0b10000000; // 128

export const ESC_FEATURE_ALL               = 0b11111111; // 255
export const ESC_FEATURE_NO_TILT           = 0b00001111; // 15

export const ACTION_SHUTTER_OPEN = 'open_cover';
export const ACTION_SHUTTER_OPEN_TILT = 'open_cover_tilt';
export const ACTION_SHUTTER_CLOSE = 'close_cover';
export const ACTION_SHUTTER_CLOSE_TILT = 'close_cover_tilt';
export const ACTION_SHUTTER_STOP = 'stop_cover';
export const ACTION_SHUTTER_STOP_TILT = 'stop_cover_tilt';
export const ACTION_SHUTTER_SET_POS = 'set_cover_position';
export const ACTION_SHUTTER_SET_POS_TILT = 'set_cover_tilt_position';

export const SHUTTER_STATE_OPEN = 'open';
export const SHUTTER_STATE_CLOSED = 'closed';
export const SHUTTER_STATE_OPENING = 'opening';
export const SHUTTER_STATE_CLOSING = 'closing';
export const SHUTTER_STATE_PARTIAL_OPEN = 'partial_open'; // speudo state


export const SHUTTER_STATES = [
  SHUTTER_STATE_OPEN,
  SHUTTER_STATE_CLOSED,
  SHUTTER_STATE_OPENING,
  SHUTTER_STATE_CLOSING
];


export const UNAVAILABLE = 'unavailable';

export const SHUTTER_OPEN_PCT = 100;
export const SHUTTER_CLOSED_PCT = 0;

export const SEPARATE_LENGHT = 100;
export const SEPARATE_BORDER_WIDTH = 2;
export const SEPARATE_MARGIN_TB=1;
export const SEPARATE_MARGIN_LR=5;
export const CARD_PADDING=6;
export const ICON_SIZE_LOCK=10;

export const LOCALIZE_TEXT= {
  // Search for this in Lokalise.com : component::cover::entity_component::_::state::
  [SHUTTER_STATE_OPEN]:    'component.cover.entity_component._.state.open',
  [SHUTTER_STATE_CLOSED]:  'component.cover.entity_component._.state.closed',
  [SHUTTER_STATE_CLOSING]: 'component.cover.entity_component._.state.closing',
  [SHUTTER_STATE_OPENING]: 'component.cover.entity_component._.state.opening',
  [ACTION_SHUTTER_OPEN]:       'ui.card.cover.open_cover',
  [ACTION_SHUTTER_OPEN_TILT]:  'ui.card.cover.open_cover_tilt',
  [ACTION_SHUTTER_STOP]:       'ui.card.cover.stop_cover',
  [ACTION_SHUTTER_CLOSE]:      'ui.card.cover.close_cover',
  [ACTION_SHUTTER_CLOSE_TILT]: 'ui.card.cover.close_cover_tilt',

  [UNAVAILABLE]: 'state.default.unavailable',
};
export const CONFIG_NAME = 'name';
export const CONFIG_PASSIVE_MODE = 'passive_mode';
export const CONFIG_COVER_VISUAL = 'cover_visual';   // 'image' (image stack) | 'modern' (bar/pill slider)
export const CONFIG_MODERN_STYLE = 'modern_style';   // built-in slug, lib:<slug>, or inline style object
export const CONFIG_MODERN_VALUE_POS = 'modern_value_position'; // where the % shows on a modern bar: 'default'|'on-handle'|'at-handle-left'|'at-handle-right'
export const CONFIG_POSITION_PLACEMENT = 'position_placement'; // PANEL Position Value placement: top|bottom|left|right|on-handle|at-handle-left|-right|-above|-below
export const CONFIG_PANEL_POS_SHOW = 'panel_position_show';     // show the PANEL position value (independent of the header readout)
export const CONFIG_PANEL_POS_SIZE = 'panel_position_size';     // 0 = follow default
export const CONFIG_PANEL_POS_WEIGHT = 'panel_position_weight';
export const CONFIG_PANEL_POS_COLOR = 'panel_position_color';
export const CONFIG_PANEL_POS_END = 'panel_position_end'; // where Open/Closed text goes when on-handle: handle|center|above|below (% stays on handle)
export const CONFIG_MODERN_TRAVEL = 'modern_travel';       // 'single' | 'center' (center-out) | 'tdbu' (top-down/bottom-up)
export const CONFIG_MODERN_SECOND_ENTITY = 'modern_second_entity'; // tdbu: entity giving the OTHER rail's position (top rail)
export const CONFIG_IMAGE_MAP = 'image_map';
export const CONFIG_WINDOW_IMAGE = 'window_image';
export const CONFIG_VIEW_IMAGE = 'view_image';
export const CONFIG_SHUTTER_SLAT_IMAGE = 'shutter_slat_image';
export const CONFIG_SHUTTER_BOTTOM_IMAGE = 'shutter_bottom_image';
export const CONFIG_ROTATE_SLATS_SHUTTER_IMAGE = 'rotate_slat_image';
export const CONFIG_STRETCH_EDGE_SHUTTER_IMAGE = 'stretch_bottom_image';
export const CONFIG_BASE_HEIGHT_PX = 'base_height_px';
export const CONFIG_BASE_WIDTH_PX = 'base_width_px';
export const CONFIG_RESIZE_HEIGHT_PCT = 'resize_height_pct';
export const CONFIG_RESIZE_WIDTH_PCT = 'resize_width_pct';

export const IMAGE_TYPES = [
  CONFIG_WINDOW_IMAGE,
  CONFIG_VIEW_IMAGE,
  CONFIG_SHUTTER_SLAT_IMAGE,
  CONFIG_SHUTTER_BOTTOM_IMAGE,
];

export const HA_CARD_NAME = "easy-cover-styler-card";
// Back-compat aliases for existing dashboards. Both previous card types keep working via thin
// subclasses registered in the entry file. Remove once every dashboard has migrated.
export const HA_CARD_NAME_LEGACY_FLEX = "flex-cover-card";       // previous rebrand
export const HA_CARD_NAME_LEGACY_ESC  = "enhanced-shutter-card"; // original name
export const HA_CARD_NAME_LEGACIES = [HA_CARD_NAME_LEGACY_FLEX, HA_CARD_NAME_LEGACY_ESC];
// Deprecated single-alias export kept so any external reference still resolves.
export const HA_CARD_NAME_LEGACY = HA_CARD_NAME_LEGACY_ESC;
export const HA_SHUTTER_NAME = `easy-cover-styler`;
// Legacy child element tags — kept registered so a cached/half-rendered card never emits an
// unknown element. Remove alongside the legacy card aliases.
export const HA_SHUTTER_NAME_LEGACIES = ['flex-cover', 'enhanced-shutter'];
export const HA_EDITOR_NAME = "easy-cover-styler-card-editor";
export const CARD_DISPLAY_NAME = "Easy Cover Styler Card";
export const CARD_VERSION = '2026.09.24.83';   // single source of truth (editor header + console banner)
export const HA_HUI_VIEW = 'hui-view';
export const SPACE = ' ';

export const UNKNOWN = 'unknown';
export const NOT_KNOWN =[UNAVAILABLE,UNKNOWN,undefined, null ];


export const MOUSEUP = 'mouse-up';
export const MOUSEDOWN = 'mouse-down';
export const MOUSEMOVE = 'mouse-move';

export const ADD_EVENT = 'add';
export const REMOVE_EVENT = 'remove';


export const IS_HORIZONTAL = [LEFT,RIGHT];
export const IS_VERTICAL = [UP,DOWN];

export const AUTO = 'auto';

export const AUTO_TL = `${AUTO}-${TOP}-${LEFT}`;
export const AUTO_TR = `${AUTO}-${TOP}-${RIGHT}`;
export const AUTO_BL = `${AUTO}-${BOTTOM}-${LEFT}`;
export const AUTO_BR = `${AUTO}-${BOTTOM}-${RIGHT}`;

export const POSITIONS =[AUTO,AUTO_BL,AUTO_BR,AUTO_TL,AUTO_TR,LEFT,RIGHT,TOP,BOTTOM,NONE];


/*
    from https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/#sizing-in-sections-view
    for getLayoutOptions() {
      size off cells.
      width:
         layout: between 80px and 120px depending on the screen size
      height: 56px
      gap between cells: 8px

    for getGridOptions() (used here)
      width:
         layout: between 27px and 40px depending on the screen size (width for code: size is LayoutWidth/3 )
      height: 56px
      gap between cells: 8px
*/
export const HA_GRID_PX_HEIGHT = 56;
export const HA_GRID_PX_WIDTH = 24; // beween 17 and 30 ???
export const HA_GRID_PX_GAP = 8;

export const ENTITY_REGISTRY_LIST = "config/entity_registry/list";

export const DEVICE_CLASS_BATTERY = "battery";
export const DEVICE_CLASS_SIGNAL = "signal_strength";

export const DEVICES_CLASSES_SUB_ENTITIES =[DEVICE_CLASS_BATTERY, DEVICE_CLASS_SIGNAL];
export const PORTRAIT ="P";
export const LANDSCAPE ="L";

// derived from:
// https://github.com/home-assistant/core/blob/dev/homeassistant/components/cover/const.py
//               lines 20-27 (class CoverEntityFeatures(enum.IntFlag)):
export const ESC_CLASS_SHUTTERS = `${ESC_CLASS_BASE_NAME}s`;
export const ESC_CLASS_SHUTTER_FLEX = `${ESC_CLASS_BASE_NAME}-flex`; // esc-shutter-flex
export const ESC_CLASS_TITLE_DISABLED = `${ESC_CLASS_BASE_NAME}-title-disabled`
export const ESC_CLASS_TILT_BUTTONS = `${ESC_CLASS_BASE_NAME}-tilt-buttons`;
export const ESC_CLASS_BUTTONS_TOP = `${ESC_CLASS_BUTTONS}-${TOP}`;
export const ESC_CLASS_BUTTONS_BOTTOM = `${ESC_CLASS_BUTTONS}-${BOTTOM}`;
export const ESC_CLASS_BUTTONS_LEFT = `${ESC_CLASS_BUTTONS}-${LEFT}`;
export const ESC_CLASS_BUTTONS_RIGHT = `${ESC_CLASS_BUTTONS}-${RIGHT}`;
export const ESC_CLASS_BUTTON = `${ESC_CLASS_BASE_NAME}-button`;


export const ICON_BUTTON_SIZE = 36; // original: 48

// just to suppress warnings for legal settings (global, not used by ESC)
export const CONFIG_CARD_MOD = "card_mod"; // !!customElements.get('card-mod')
export const CONFIG_TYPE = "type";

export const CONFIG_STACKED = "stacked";
export const CONFIG_SHUTTER_PRESET = 'shutter_preset';
export const CONFIG_TITLE = "title";
export const CONFIG_ENTITIES = 'entities';
export const CONFIG_ID = "id";
export const CONFIG_GROUP = "group";

// --- v1.7.0: auto-generate (by area/label) + area-selector layout ---
export const CONFIG_LAYOUT = 'layout';
export const CONFIG_AREAS = 'areas';
export const CONFIG_LABELS = 'labels';
export const CONFIG_AUTO_FILTER = 'auto_filter';   // { device_class:[...], exclude:[...] }
export const CONFIG_AREA_NAMES = 'area_names';     // { area_id: "Display Name" }
export const CONFIG_LABEL_NAMES = 'label_names';   // { label_id: "Display Name" }
export const CONFIG_AREA_PRESETS = 'area_presets';   // { area_id|name: { shutter_preset|window_image|... } } per-area image/style overrides
export const CONFIG_ENTITY_PRESETS = 'entity_presets'; // { entity_id: { shutter_preset|window_image|... } } per-entity image/style overrides
export const CONFIG_POSITION_PRESETS = 'position_presets'; // [] = card default preset buttons
export const CONFIG_PARTIAL_BUTTONS_STYLE = 'partial_buttons_style'; // icons | values
export const PARTIAL_STYLE_ICONS = 'icons';
export const PARTIAL_STYLE_VALUES = 'values';
export const ESC_PARTIAL_PRESETS_DEFAULT = [100, 75, 50, 25, 10, 0];

// v1.23.0: order of the elements inside a cover (#8)
export const CONFIG_COVER_ORDER = 'cover_order';
export const COVER_SEG_STANDARD = 'standard'; // up/stop/down buttons
export const COVER_SEG_SLIDER = 'slider';     // open/close slider
export const COVER_SEG_WINDOW = 'window';     // shade image
export const COVER_SEG_TILT = 'tilt';         // tilt controls
export const COVER_SEG_PRESETS = 'presets';   // position preset buttons
export const COVER_ORDER_DEFAULT = [COVER_SEG_STANDARD, COVER_SEG_SLIDER, COVER_SEG_WINDOW, COVER_SEG_TILT, COVER_SEG_PRESETS];
// Phase 2: deterministic per-control placement (relative to the window) — replaces the free cover_order list.
export const CONFIG_STANDARD_POSITION = 'standard_position'; // 'before' | 'after' the window
export const CONFIG_SLIDER_POSITION = 'slider_position';
export const CONFIG_TILT_POSITION = 'tilt_position';
export const CONFIG_PRESETS_POSITION = 'presets_position';
export const ESC_STANDARD_POSITION = 'before';
export const ESC_SLIDER_POSITION = 'before';
export const ESC_TILT_POSITION = 'after';
export const ESC_PRESETS_POSITION = 'after';
export const CONFIG_STANDARD_ORIENTATION = 'standard_orientation'; // auto | row | column
export const CONFIG_PRESETS_ORIENTATION = 'presets_orientation';   // auto | row | column
export const ESC_STANDARD_ORIENTATION = 'auto';
export const ESC_PRESETS_ORIENTATION = 'auto';
export const CONFIG_ALL_LABEL = 'all_label';       // name of the per-area/label aggregate control
// v1.28.0: group control + collapsible covers (area layout)
export const CONFIG_SHOW_ALL_CONTROL = 'show_all_control';       // show the per-area "All" group control
export const CONFIG_COVERS_COLLAPSIBLE = 'covers_collapsible';   // let the covers row collapse
export const CONFIG_COVERS_START_COLLAPSED = 'covers_start_collapsed';
// v1.33.0: area layout arrangement
export const CONFIG_AREA_BUTTONS_DIR = 'area_buttons_direction'; // column | row (legacy)
export const CONFIG_AREA_BUTTONS_PLACEMENT = 'area_buttons_placement'; // above | left
// v1.35.0: button sizing/wrap + cover panel padding + covers grid
export const CONFIG_AREA_BUTTON_WRAP = 'area_button_wrap';           // wrap text inside a button
export const CONFIG_AREA_BUTTONS_WRAP_MODE = 'area_buttons_wrap_mode'; // nowrap | wrap | grid
export const CONFIG_AREA_BUTTONS_COLUMNS = 'area_buttons_columns';   // grid columns (0 = n/a)
export const CONFIG_COVERS_WRAP_MODE = 'covers_wrap_mode';           // scroll | wrap | grid
export const CONFIG_COVERS_COLUMNS = 'covers_columns';               // grid columns (0 = auto)
export const CONFIG_COVER_PAD_TOP = 'cover_pad_top';
export const CONFIG_COVER_PAD_RIGHT = 'cover_pad_right';
export const CONFIG_COVER_PAD_BOTTOM = 'cover_pad_bottom';
export const CONFIG_COVER_PAD_LEFT = 'cover_pad_left';
export const CONFIG_COVERS_DIRECTION = 'covers_direction';       // row | column
export const CONFIG_GROUP_WITH_COVERS = 'group_with_covers';     // group control joins the covers flow (leftmost/topmost)
export const CONFIG_GROUP_STICKY = 'group_sticky';               // sticky (fixed) vs scroll with covers
// v1.29.0: dividers between individual covers (full divider suite)
export const CONFIG_SHOW_COVER_DIVIDERS = 'show_cover_dividers';
export const CONFIG_DIVIDER_STYLE = 'divider_style';             // solid | dashed | dotted
export const CONFIG_DIVIDER_COLOR = 'divider_color';             // four-mode color
export const CONFIG_DIVIDER_THICKNESS = 'divider_thickness';     // px
export const CONFIG_DIVIDER_LENGTH = 'divider_length';           // %
export const CONFIG_DIVIDER_GRADIENT = 'divider_gradient';       // bool
export const CONFIG_DIVIDER_GRADIENT_PATTERN = 'divider_gradient_pattern'; // preset index
export const CONFIG_DIVIDER_LABEL = 'divider_label';
export const CONFIG_DIVIDER_ICON = 'divider_icon';
export const CONFIG_DIVIDER_TEXT_POSITION = 'divider_text_position'; // above | on | below
export const CONFIG_DIVIDER_JUSTIFY = 'divider_justify';         // left | center | right
export const CONFIG_DIVIDER_PAD = 'divider_pad';                 // px padding around the divider
export const CONFIG_DIVIDER_TEXT_SIZE = 'divider_text_size';
export const CONFIG_DIVIDER_TEXT_WEIGHT = 'divider_text_weight';
export const CONFIG_DIVIDER_TEXT_COLOR_MODE = 'divider_text_color_mode'; // line | theme | fixed
export const CONFIG_DIVIDER_TEXT_COLOR = 'divider_text_color';
export const CONFIG_DIVIDER_ICON_SIZE = 'divider_icon_size';
export const CONFIG_DIVIDER_ICON_COLOR_MODE = 'divider_icon_color_mode'; // text | theme | fixed
export const CONFIG_DIVIDER_ICON_COLOR = 'divider_icon_color';
export const CONFIG_DIVIDER_INDENT = 'divider_indent';
export const CONFIG_DIVIDER_CONTENT_JUSTIFY = 'divider_content_justify'; // left | center | right
export const CONFIG_DIVIDER_MIRROR_CENTER = 'divider_mirror_center';
export const CONFIG_DIVIDER_HIDE_LINE = 'divider_hide_line';
export const CONFIG_DIVIDER_STOPS = 'divider_stops';             // custom gradient stops [{pos,color}]
// v1.31.0: area-selector button styling via the shared Button Styles Library
export const CONFIG_AREA_BUTTON_STYLE = 'area_button_style';     // '' | built-in slug | 'lib:<slug>'

// v1.9.0: entity name cleaner
export const CONFIG_CLEAN_NAMES = 'clean_names';       // master toggle
export const CONFIG_NAME_REMOVE = 'name_remove';       // string list: substrings to strip from the name
export const CONFIG_NAME_CAPITALIZE = 'name_capitalize'; // title-case each word
export const CONFIG_NAME_STRIP_AREA = 'name_strip_area'; // remove the room/area name from the label (default on)
export const CONFIG_AREA_NAME_KEY = '_area_name';        // internal: the resolved area name for a cover

// v1.17.0: hide battery / signal icons
export const CONFIG_SHOW_BATTERY = 'show_battery';
export const CONFIG_SHOW_SIGNAL = 'show_signal';
// v1.26.0: per-item battery/signal placement (#8)
export const CONFIG_BATTERY_ALIGN = 'battery_align';       // left | center | right
export const CONFIG_SIGNAL_ALIGN = 'signal_align';
export const CONFIG_BATTERY_POSITION = 'battery_position'; // '' = follow icons_position, else top|bottom
export const CONFIG_SIGNAL_POSITION = 'signal_position';
export const ESC_CLASS_ICON_CELL = `${ESC_CLASS_BASE_NAME}-icon-cell`;

// v1.11.0: font styles + spacing (0 / '' = inherit, emit nothing)
export const CONFIG_NAME_TEXT_SIZE = 'name_text_size';       // px
export const CONFIG_NAME_TEXT_WEIGHT = 'name_text_weight';   // normal|bold|500…
export const CONFIG_NAME_TEXT_COLOR = 'name_text_color';     // four-mode color
export const CONFIG_POSITION_TEXT_SIZE = 'position_text_size'; // px
export const CONFIG_POSITION_TEXT_COLOR = 'position_text_color';
export const CONFIG_POSITION_TEXT_WEIGHT = 'position_text_weight';
export const CONFIG_POSITION_BACKGROUND = 'position_background'; // keep the highlight box behind the % text
export const CONFIG_COVER_GAP = 'cover_gap';                 // px, spacing between covers (area layout)
export const CONFIG_COLLAPSE_ICON = 'collapse_icon';         // mdi for the individual-covers expand/collapse toggle ('' = chevron)
export const CONFIG_COLLAPSE_ICON_SIZE = 'collapse_icon_size';   // px (0 = default)
export const CONFIG_COLLAPSE_ICON_COLOR = 'collapse_icon_color'; // '' = inherit
// v1.27.0: internal padding
export const CONFIG_CONTROLS_GAP = 'controls_gap';           // px, horizontal gap between controls and the image
export const CONFIG_CONTROLS_BUTTON_PAD = 'controls_button_padding'; // px around each up/stop/down icon (6 = built-in default; 0 = none)
export const CONFIG_CONTROLS_BUTTON_MARGIN = 'controls_button_margin'; // px around the whole button group (space to image/other elements)
// v1.43.0: control-icon + %-button visual styling
export const CONFIG_CONTROL_ICON_COLOR = 'control_icon_color';
export const CONFIG_ICON_UP = 'icon_up';
export const CONFIG_ICON_DOWN = 'icon_down';
export const CONFIG_ICON_STOP = 'icon_stop';
export const CONFIG_ICON_PARTIAL = 'icon_partial';
export const CONFIG_ICON_TILT_UP = 'icon_tilt_up';
export const CONFIG_ICON_TILT_DOWN = 'icon_tilt_down';
export const CONFIG_PCT_ICON_COLOR = 'pct_icon_color';
export const CONFIG_PCT_BUTTON_BG = 'pct_button_bg';
export const CONFIG_PCT_BUTTON_BORDER = 'pct_button_border';
export const CONFIG_PCT_BUTTON_COLOR = 'pct_button_color';
export const CONFIG_PCT_BUTTON_WEIGHT = 'pct_button_weight';
export const CONFIG_PCT_BUTTON_SIZE = 'pct_button_size';
export const CONFIG_PCT_BUTTON_STYLE = 'pct_button_style'; // shared Button Styles library ref for value buttons
export const CONFIG_HEADER_IMAGE_GAP = 'header_image_gap';   // px, vertical gap between header text and the image

// layout modes for CONFIG_LAYOUT
export const LAYOUT_STACK = 'stack';   // default: existing flat vertical/horizontal stack
export const LAYOUT_AREAS = 'areas';   // area-selector layout (buttons + full-area "All" + covers)
// v1.40.0: orientation + area selector decoupled; group placement
export const CONFIG_ORIENTATION = 'orientation';           // vertical | horizontal (how covers stack)
export const CONFIG_SHOW_AREA_SELECTOR = 'show_area_selector'; // show the area/label button menu on either orientation
export const CONFIG_GROUP_PLACEMENT = 'group_placement';   // menu = beside the buttons (row 1); covers = inline first cover
export const GROUP_PLACE_MENU = 'menu';
export const GROUP_PLACE_COVERS = 'covers';
// v1.41.0: inline toggles + group-name-from-area
export const CONFIG_AREA_MENU_INLINE = 'area_menu_inline';   // area selector menu flows inline with the cover panels
export const CONFIG_GROUP_INLINE = 'group_inline';           // group panel flows inline with the cover panels
export const CONFIG_GROUP_NAME_FROM_AREA = 'group_name_from_area'; // group control name = selected area's name
export const CONFIG_COLLAPSE_LABEL = 'collapse_label';       // custom label for the collapse toggle
export const CONFIG_COLLAPSE_SHOW_COUNT = 'collapse_show_count'; // show the cover count on the collapse toggle

export const HA_ALERT_SUCCESS = 'success';
export const HA_ALERT_WARNING = 'warning';
export const HA_ALERT_ERROR = 'error';
export const HA_ALERT_INFO = 'info';

export const CONFIG_DEBUG = 'debug';
export const CONFIG_ENTITY_ID = 'entity';
export const CONFIG_HEIGHT_PX = 'height_px';
export const CONFIG_WIDTH_PX = 'width_px';

export const CONFIG_SUPPORTED_FEATURES = 'supported_features';
export const CONFIG_BATTERY_ENTITY_ID = 'battery_entity';
export const CONFIG_SIGNAL_ENTITY_ID = 'signal_entity';

export const CONFIG_SHOW_GROUP_MEMBERS = 'show_group_members';


export const CONFIG_SCALE_ICONS = 'scale_icons';
export const CONFIG_SCALE_TEXTS = 'scale_texts';
export const CONFIG_SCALE_BUTTONS = 'scale_buttons';
export const CONFIG_OFFSET_OPENED_PCT = 'top_offset_pct'; // TODO  rename: top->opened
export const CONFIG_OFFSET_CLOSED_PCT = 'bottom_offset_pct'; // TODO rename bottom->closed
export const CONFIG_BUTTONS_POSITION = 'buttons_position';
export const CONFIG_NAME_POSITION = 'name_position';
export const CONFIG_OPENING_POSITION = 'opening_position';
export const CONFIG_ICONS_POSITION = 'icons_position';

export const CONFIG_INLINE_HEADER = 'inline_header';
// v1.21.0: header alignment / order / spacing
export const CONFIG_HEADER_ALIGN = 'header_align';   // left | center | right
export const CONFIG_HEADER_ORDER = 'header_order';   // name | position
export const CONFIG_HEADER_GAP = 'header_gap';       // px between name and position
export const HEADER_ALIGN_MAP = { left: 'flex-start', center: 'center', right: 'flex-end' };

export const CONFIG_INVERT_PCT       = 'invert_percentage'; // deprecated
export const CONFIG_INVERT_PCT_COVER = 'invert_percentage_cover'; // new
export const CONFIG_INVERT_PCT_UI    = 'invert_percentage_ui'; //

export const CONFIG_INVERT_PCT_TILT_UI    = 'invert_percentage_tilt_ui'; //
export const CONFIG_INVERT_PCT_TILT_COVER = 'invert_percentage_tilt_cover'; // new

export const CONFIG_INVERT_OPEN_CLOSE       = 'invert_open_close'; // deprecated
export const CONFIG_INVERT_OPEN_CLOSE_UI    = 'invert_open_close_ui'; // new
export const CONFIG_INVERT_OPEN_CLOSE_COVER = 'invert_open_close_cover';

export const CONFIG_SHOW_TILT = 'show_tilt'; // deprecated
export const CONFIG_TILT_ANGLE_MIN = 'tilt_angle_min';
export const CONFIG_TILT_ANGLE_MAX = 'tilt_angle_max';

export const CONFIG_CLOSING_DIRECTION = 'closing_direction'
export const CONFIG_PARTIAL_CLOSE_PCT = 'partial_close_percentage';
export const CONFIG_OFFSET_IS_CLOSED_PCT = 'offset_closed_percentage'; // TODO rename
export const CONFIG_ALWAYS_PCT = 'always_percentage';
//======
export const CONFIG_NAME_DISABLED = 'name_disabled'; //deprecated SHOW 1
export const CONFIG_OPENING_DISABLED = 'opening_disabled';  // deprecated SHOW 2
export const CONFIG_TILT_SLIDER_ONLY = 'tilt_slider_only';  // deprecated SHOW 4
export const CONFIG_DISABLE_STANDARD_BUTTONS = 'disable_standard_buttons'; // deprecated SHOW 5
export const CONFIG_DISABLE_PARTIAL_OPEN_BUTTONS = 'disable_partial_open_buttons'; // deprecated SHOW 6

export const CONFIG_SHOW_NAME = 'show_name'; // new    SHOW 1
export const CONFIG_SHOW_OPENING = "show_opening"; //new SHOW 2
export const CONFIG_SHOW_TILT_BUTTONS = 'show_tilt_buttons'; // SHOW 4
export const CONFIG_SHOW_STANDARD_BUTTONS = 'show_standard_buttons'; //SHOW 5
export const CONFIG_SHOW_PARTIAL_OPEN_BUTTONS = 'show_partial_open_buttons';//SHOW 6

export const CONFIG_SHOW_TILT_SLIDER = 'show_tilt_slider'; // new SHOW 3 new
export const CONFIG_SHOW_OPEN_CLOSE_SLIDER = 'show_open_close_slider'; // new SHOW 3 new
export const CONFIG_SHOW_WINDOW = 'show_window'; // SHOW 7 new
//======
export const CONFIG_DISABLE_END_BUTTONS = 'disable_end_buttons'; // grey out the endbuttons when not functional

export const CONFIG_PICKER_OVERLAP_PX = 'picker_overlap_px';
export const CONFIG_CURRENT_POSITION = 'current_position';

export const CONFIG_BUTTON_STOP_HIDE_STATES = 'button_stop_hide_states';
export const CONFIG_BUTTON_OPENED_HIDE_STATES = 'button_up_hide_states';  // TODO rename up->opened
export const CONFIG_BUTTON_CLOSED_HIDE_STATES = 'button_down_hide_states'; // TODO rename down->closed

export const invertBoolean = (value) => !value;
export const DEPRECATED={
  [CONFIG_NAME_DISABLED]: {new: CONFIG_SHOW_NAME, value: invertBoolean},
  [CONFIG_OPENING_DISABLED]: {new: CONFIG_SHOW_OPENING, value: invertBoolean},
  [CONFIG_TILT_SLIDER_ONLY]: {new: CONFIG_SHOW_TILT_BUTTONS, value: invertBoolean},
  [CONFIG_SHOW_TILT]: {new: CONFIG_SHOW_TILT_SLIDER}, // only name change, value remains the same
  [CONFIG_DISABLE_STANDARD_BUTTONS]: {new: CONFIG_SHOW_STANDARD_BUTTONS, value: invertBoolean},
  [CONFIG_DISABLE_PARTIAL_OPEN_BUTTONS]: {new: CONFIG_SHOW_PARTIAL_OPEN_BUTTONS, value: invertBoolean},
};
export const REMOVED={
  [CONFIG_INVERT_PCT]: {new: CONFIG_INVERT_PCT_COVER}, // april 2026 v1.6.0 // jan 2026 1.4.0-alpha
  [CONFIG_INVERT_OPEN_CLOSE]: {new: CONFIG_INVERT_OPEN_CLOSE_UI}, // april 2026 v1.6.0 // jan 2026 1.4.0-alpha
};
export const ICONCOLORS = {
      '-1': "grey",
      0: "red",
      1: "#FF4D00",// deep orange,
      2: "#FF7F00", // amber
      3: "orange",
      4: "#66B266", // sligly dim green
      5: "green",
    };

export const Z_INDEX_PARTIAL = 5;
export const Z_INDEX_PICKER  = 3;
export const Z_INDEX_PICTURE = 1;
export const Z_INDEX_MOVEMENT_ICON = 2;  // !important ??
export const Z_INDEX_SLIDE  = -1;
export const Z_INDEX_OVERLAY =-1;

export const ESC_ENTITY_ID = null;

export const ESC_BATTERY_ENTITY_ID = null;
export const ESC_SIGNAL_ENTITY_ID = null;

export const ESC_SHOW_GROUP_MEMBERS = false;

export const ESC_SUPPORTED_FEATURES = ESC_FEATURE_ALL;

export const ESC_AWNING = 'awning';
export const ESC_CURTAIN = 'curtain';
export const ESC_TEST = 'test';
export const ESC_COMPACT = 'compact';
export const ESC_SHADE = 'shade';
export const ESC_SCREEN = 'screen';
export const ESC_BLIND = 'blind';
export const ESC_ROLLER_SHUTTER = 'roller-shutter';
// window/door presets (art from pic-shutter-card, used with permission; base roller art Apache-2.0 hass-shutter-card)
export const ESC_WINDOW = 'window-shutter';
export const ESC_BALCONY_L = 'balcony-door-left';
export const ESC_BALCONY_R = 'balcony-door-right';
export const ESC_TYPES =
  [ESC_AWNING, ESC_CURTAIN, ESC_ROLLER_SHUTTER,ESC_SHADE,ESC_SCREEN,ESC_BLIND,ESC_WINDOW,ESC_BALCONY_L,ESC_BALCONY_R];

export const ESC_SHUTTER_PRESET = ESC_ROLLER_SHUTTER;
export const ESC_STACKED = VERTICAL;

// v1.7.0 auto-generate / layout defaults
export const ESC_LAYOUT = LAYOUT_STACK;
export const ESC_ORIENTATION = 'vertical';
export const ESC_SHOW_AREA_SELECTOR = false;
export const ESC_GROUP_PLACEMENT = 'menu';
export const ESC_AREA_MENU_INLINE = false;
export const ESC_GROUP_INLINE = false;
export const ESC_GROUP_NAME_FROM_AREA = false;
export const ESC_COLLAPSE_LABEL = '';
export const ESC_COLLAPSE_SHOW_COUNT = true;
export const ESC_AUTO_DEVICE_CLASSES = ['blind','shade','curtain','awning','shutter','shutters','window'];
export const ESC_AUTO_EXCLUDE_DEVICE_CLASSES = ['garage','gate','door'];
export const ESC_POSITION_PRESETS = []; // empty -> keep the card's built-in preset buttons
export const ESC_PARTIAL_BUTTONS_STYLE = 'icons';
export const ESC_COVER_ORDER = [];
export const ESC_ALL_LABEL = 'All';
export const ESC_SHOW_ALL_CONTROL = true;
export const ESC_COVERS_COLLAPSIBLE = false;
export const ESC_COVERS_START_COLLAPSED = false;
export const ESC_AREA_BUTTONS_DIR = 'column';
export const ESC_AREA_BUTTONS_PLACEMENT = 'above';
export const ESC_AREA_BUTTON_WRAP = false;
export const ESC_AREA_BUTTONS_WRAP_MODE = 'nowrap';
export const ESC_AREA_BUTTONS_COLUMNS = 0;
export const ESC_COVERS_WRAP_MODE = 'scroll';
export const ESC_COVERS_COLUMNS = 0;
export const ESC_COVER_PAD_TOP = 0;
export const ESC_COVER_PAD_RIGHT = 0;
export const ESC_COVER_PAD_BOTTOM = 0;
export const ESC_COVER_PAD_LEFT = 0;
export const ESC_COVERS_DIRECTION = 'row';
export const ESC_GROUP_WITH_COVERS = false;
export const ESC_GROUP_STICKY = false;
export const ESC_SHOW_COVER_DIVIDERS = false;
export const ESC_DIVIDER_STYLE = 'solid';
export const ESC_DIVIDER_COLOR = '';
export const ESC_DIVIDER_THICKNESS = 1;
export const ESC_DIVIDER_LENGTH = 100;
export const ESC_DIVIDER_GRADIENT = false;
export const ESC_DIVIDER_GRADIENT_PATTERN = 0;
export const ESC_DIVIDER_LABEL = '';
export const ESC_DIVIDER_ICON = '';
export const ESC_DIVIDER_TEXT_POSITION = 'on';
export const ESC_DIVIDER_JUSTIFY = 'center';
export const ESC_DIVIDER_PAD = 8;
export const ESC_DIVIDER_TEXT_SIZE = 13;
export const ESC_DIVIDER_TEXT_WEIGHT = '600';
export const ESC_DIVIDER_TEXT_COLOR_MODE = 'line';
export const ESC_DIVIDER_TEXT_COLOR = '';
export const ESC_DIVIDER_ICON_SIZE = 0;
export const ESC_DIVIDER_ICON_COLOR_MODE = 'text';
export const ESC_DIVIDER_ICON_COLOR = '';
export const ESC_DIVIDER_INDENT = 0;
export const ESC_DIVIDER_CONTENT_JUSTIFY = 'center';
export const ESC_DIVIDER_MIRROR_CENTER = false;
export const ESC_DIVIDER_HIDE_LINE = false;
export const ESC_DIVIDER_STOPS = null;
export const ESC_AREA_BUTTON_STYLE = '';
export const ESC_SHOW_BATTERY = true;
export const ESC_SHOW_SIGNAL = true;
export const ESC_BATTERY_ALIGN = 'left';
export const ESC_SIGNAL_ALIGN = 'right';
export const ESC_BATTERY_POSITION = ''; // '' = follow icons_position
export const ESC_SIGNAL_POSITION = '';
export const ESC_CLEAN_NAMES = false;
export const ESC_NAME_REMOVE = [];
export const ESC_NAME_CAPITALIZE = false;
export const ESC_NAME_STRIP_AREA = true;   // strip the room/area name by default
export const ESC_AREA_NAME_VALUE = '';
export const ESC_NAME_TEXT_SIZE = 0;
export const ESC_NAME_TEXT_WEIGHT = '';
export const ESC_NAME_TEXT_COLOR = '';
export const ESC_POSITION_TEXT_SIZE = 0;
export const ESC_POSITION_TEXT_COLOR = '';
export const ESC_POSITION_TEXT_WEIGHT = '';
export const ESC_POSITION_BACKGROUND = false; // highlight box removed by default (v1.20.0)
export const ESC_COVER_GAP = 0;
export const ESC_CONTROLS_GAP = 0;
export const ESC_CONTROLS_BUTTON_PAD = 6;   // matches the built-in 36px box / 24px icon
export const ESC_CONTROLS_BUTTON_MARGIN = 0;
export const ESC_CONTROL_ICON_COLOR = '';
export const ESC_ICON_UP = ''; export const ESC_ICON_DOWN = ''; export const ESC_ICON_STOP = '';
export const ESC_ICON_PARTIAL = ''; export const ESC_ICON_TILT_UP = ''; export const ESC_ICON_TILT_DOWN = '';
export const ESC_PCT_ICON_COLOR = '';
export const ESC_PCT_BUTTON_BG = ''; export const ESC_PCT_BUTTON_BORDER = ''; export const ESC_PCT_BUTTON_COLOR = '';
export const ESC_PCT_BUTTON_WEIGHT = ''; export const ESC_PCT_BUTTON_SIZE = 0;
export const ESC_PCT_BUTTON_STYLE = '';
export const ESC_HEADER_IMAGE_GAP = 0;
export const ESC_NAME = null;
export const ESC_PASSIVE_MODE = false;
// Pinned to the literal HACS folder name rather than derived from HA_CARD_NAME. The bundled images
// live on disk under the community folder matching the *repo* name; deriving this from HA_CARD_NAME
// meant every card-type rebrand silently changed the default image path and broke existing installs
// until they reinstalled under the new repo folder. Update HACS_COMMUNITY_FOLDER by hand if/when the
// repo itself is renamed and reinstalled.
const HACS_COMMUNITY_FOLDER = 'easy-cover-styler-card';
export const ESC_IMAGE_MAP = `/local/community/${HACS_COMMUNITY_FOLDER}`;
// Legacy install folder — still present for users who haven't reinstalled under the new repo name.
// Used as a fallback base path when an image fails to load from ESC_IMAGE_MAP. Remove once the
// legacy card-type aliases are removed.
export const ESC_IMAGE_MAP_LEGACY = `/local/community/${HA_CARD_NAME_LEGACY_FLEX}`;
export const ESC_COVER_VISUAL = 'image';   // default: classic image stack
export const ESC_MODERN_STYLE = '';         // '' => MODERN_STYLE_DEFAULT
export const ESC_MODERN_VALUE_POS = 'default';
export const ESC_POSITION_PLACEMENT = 'bottom';
export const ESC_PANEL_POS_SHOW = false;
export const ESC_PANEL_POS_SIZE = 0;
export const ESC_PANEL_POS_WEIGHT = '';
export const ESC_PANEL_POS_COLOR = '';
export const ESC_PANEL_POS_END = 'handle';
export const ESC_MODERN_TRAVEL = 'single';
export const ESC_MODERN_SECOND_ENTITY = '';
export const ESC_IMAGE_WINDOW = 'esc-window.png';
export const ESC_IMAGE_VIEW = 'esc-view.png';
export const ESC_IMAGE_SHUTTER_SLAT   = 'esc-shutter-slat.png';
export const ESC_IMAGE_SHUTTER_BOTTOM = 'esc-shutter-bottom.png';
export const ESC_ROTATE_MAIN_SHUTTER_IMAGE = true; // true: rotate slat image, false: use slat image as is
export const ESC_STRETCH_EDGE_SHUTTER_IMAGE = true; // true: stretch bottom image, false: use bottom image as is
export const ESC_BASE_HEIGHT_PX = 150; // image-height
export const ESC_BASE_WIDTH_PX = 150;  // image-width
export const ESC_RESIZE_HEIGHT_PCT = 100;
export const ESC_RESIZE_WIDTH_PCT  = 100;

export const ESC_DEBUG = getDebug() || false;
export const ESC_SCALE_ICONS = true;
export const ESC_SCALE_TEXTS = false;
export const ESC_SCALE_BUTTONS = false;
export const ESC_OPENED_OFFSET_PCT = 13;
export const ESC_CLOSED_OFFSET_PCT = 0;
export const ESC_BUTTONS_POSITION = LEFT;
export const ESC_NAME_POSITION =TOP;
export const ESC_NAME_DISABLED = false;
export const ESC_SHOW_NAME = true;
export const ESC_OPENING_POSITION = TOP;
export const ESC_ICONS_POSITION = TOP;
export const ESC_OPENING_DISABLED = false;
export const ESC_SHOW_OPENING = true;
export const ESC_INLINE_HEADER = false;
export const ESC_HEADER_ALIGN = 'center';
export const ESC_HEADER_ORDER = 'name';
export const ESC_HEADER_GAP = 0;

export const ESC_INVERT_PCT_UI = false;
export const ESC_INVERT_PCT_COVER = false;
export const ESC_INVERT_OPEN_CLOSE_UI = false
export const ESC_INVERT_OPEN_CLOSE_COVER = false

export const ESC_INVERT_PCT_TILT_UI    = false;
export const ESC_INVERT_PCT_TILT_COVER = false;

export const ESC_TILT_SLIDER_ONLY = false; // deprecated
export const ESC_SHOW_OPEN_CLOSE_SLIDER = false;
export const ESC_SHOW_TILT_SLIDER = true;
export const ESC_SHOW_TILT_BUTTONS = true;

export const ESC_SHOW_TILT = true;
export const ESC_TILT_ANGLE_MIN = 0;
export const ESC_TILT_ANGLE_MAX = 180;

export const ESC_CLOSING_DIRECTION = DOWN;
export const ESC_PARTIAL_CLOSE_PCT = 0;
export const ESC_OFFSET_CLOSED_PCT = 0;
export const ESC_ALWAYS_PCT = false;
export const ESC_DISABLE_END_BUTTONS = false;
export const ESC_DISABLE_STANDARD_BUTTONS = false;
export const ESC_SHOW_STANDARD_BUTTONS = true;
export const ESC_DISABLE_PARTIAL_OPEN_BUTTONS = true;
export const ESC_SHOW_PARTIAL_OPEN_BUTTONS = false;
export const ESC_SHOW_WINDOW = true;
export const ESC_PICKER_OVERLAP_PX = 20;
export const ESC_CURRENT_POSITION = 0;

export const ESC_MIN_RESIZE_WIDTH_PCT  =  20;
export const ESC_MAX_RESIZE_WIDTH_PCT  = 500;
export const ESC_MIN_RESIZE_HEIGHT_PCT =  20;
export const ESC_MAX_RESIZE_HEIGHT_PCT = 500;

export const ESC_BUTTON_STOP_HIDE_STATES = [];
export const ESC_BUTTON_OPENED_HIDE_STATES = [];
export const ESC_BUTTON_CLOSED_HIDE_STATES = [];

export const INVERT_OPEN_CLOSE_SETTING ={
  [SHUTTER_STATE_OPEN]: SHUTTER_STATE_CLOSED,
  [SHUTTER_STATE_CLOSED]: SHUTTER_STATE_OPEN,
  [SHUTTER_STATE_OPENING]: SHUTTER_STATE_CLOSING,
  [SHUTTER_STATE_CLOSING]: SHUTTER_STATE_OPENING,
  [ACTION_SHUTTER_OPEN]: ACTION_SHUTTER_CLOSE,
  [ACTION_SHUTTER_CLOSE]: ACTION_SHUTTER_OPEN,
  [SHUTTER_OPEN_PCT]: SHUTTER_CLOSED_PCT,
  [SHUTTER_CLOSED_PCT]: SHUTTER_OPEN_PCT,
  [UP]: DOWN,
  [DOWN]: UP,
};

export const CONFIG_DEFAULT ={
  [CONFIG_SUPPORTED_FEATURES]: ESC_SUPPORTED_FEATURES,
  [CONFIG_TYPE]: "",
  [CONFIG_TITLE]: "",
  [CONFIG_ID]:"",
  [CONFIG_GROUP]: "",
  [CONFIG_ENTITIES]: "",
  [CONFIG_CARD_MOD]: !!customElements.get('card-mod'),

  [CONFIG_DEBUG]: ESC_DEBUG,
  [CONFIG_STACKED]: ESC_STACKED,

  [CONFIG_LAYOUT]: ESC_LAYOUT,
  [CONFIG_ORIENTATION]: ESC_ORIENTATION,
  [CONFIG_SHOW_AREA_SELECTOR]: ESC_SHOW_AREA_SELECTOR,
  [CONFIG_GROUP_PLACEMENT]: ESC_GROUP_PLACEMENT,
  [CONFIG_AREA_MENU_INLINE]: ESC_AREA_MENU_INLINE,
  [CONFIG_GROUP_INLINE]: ESC_GROUP_INLINE,
  [CONFIG_GROUP_NAME_FROM_AREA]: ESC_GROUP_NAME_FROM_AREA,
  [CONFIG_COLLAPSE_LABEL]: ESC_COLLAPSE_LABEL,
  [CONFIG_COLLAPSE_SHOW_COUNT]: ESC_COLLAPSE_SHOW_COUNT,
  [CONFIG_AREAS]: null,
  [CONFIG_LABELS]: null,
  [CONFIG_AUTO_FILTER]: null,
  [CONFIG_AREA_NAMES]: null,
  [CONFIG_LABEL_NAMES]: null,
  [CONFIG_AREA_PRESETS]: null,
  [CONFIG_ENTITY_PRESETS]: null,
  [CONFIG_POSITION_PRESETS]: ESC_POSITION_PRESETS,
  [CONFIG_PARTIAL_BUTTONS_STYLE]: ESC_PARTIAL_BUTTONS_STYLE,
  [CONFIG_COVER_ORDER]: ESC_COVER_ORDER,
  [CONFIG_STANDARD_POSITION]: ESC_STANDARD_POSITION,
  [CONFIG_SLIDER_POSITION]: ESC_SLIDER_POSITION,
  [CONFIG_TILT_POSITION]: ESC_TILT_POSITION,
  [CONFIG_PRESETS_POSITION]: ESC_PRESETS_POSITION,
  [CONFIG_STANDARD_ORIENTATION]: ESC_STANDARD_ORIENTATION,
  [CONFIG_PRESETS_ORIENTATION]: ESC_PRESETS_ORIENTATION,
  [CONFIG_ALL_LABEL]: ESC_ALL_LABEL,
  [CONFIG_SHOW_ALL_CONTROL]: ESC_SHOW_ALL_CONTROL,
  [CONFIG_COVERS_COLLAPSIBLE]: ESC_COVERS_COLLAPSIBLE,
  [CONFIG_COVERS_START_COLLAPSED]: ESC_COVERS_START_COLLAPSED,
  [CONFIG_AREA_BUTTONS_DIR]: ESC_AREA_BUTTONS_DIR,
  [CONFIG_AREA_BUTTONS_PLACEMENT]: ESC_AREA_BUTTONS_PLACEMENT,
  [CONFIG_AREA_BUTTON_WRAP]: ESC_AREA_BUTTON_WRAP,
  [CONFIG_AREA_BUTTONS_WRAP_MODE]: ESC_AREA_BUTTONS_WRAP_MODE,
  [CONFIG_AREA_BUTTONS_COLUMNS]: ESC_AREA_BUTTONS_COLUMNS,
  [CONFIG_COVERS_WRAP_MODE]: ESC_COVERS_WRAP_MODE,
  [CONFIG_COVERS_COLUMNS]: ESC_COVERS_COLUMNS,
  [CONFIG_COVER_PAD_TOP]: ESC_COVER_PAD_TOP,
  [CONFIG_COVER_PAD_RIGHT]: ESC_COVER_PAD_RIGHT,
  [CONFIG_COVER_PAD_BOTTOM]: ESC_COVER_PAD_BOTTOM,
  [CONFIG_COVER_PAD_LEFT]: ESC_COVER_PAD_LEFT,
  [CONFIG_COVERS_DIRECTION]: ESC_COVERS_DIRECTION,
  [CONFIG_GROUP_WITH_COVERS]: ESC_GROUP_WITH_COVERS,
  [CONFIG_GROUP_STICKY]: ESC_GROUP_STICKY,
  [CONFIG_SHOW_COVER_DIVIDERS]: ESC_SHOW_COVER_DIVIDERS,
  [CONFIG_DIVIDER_STYLE]: ESC_DIVIDER_STYLE,
  [CONFIG_DIVIDER_COLOR]: ESC_DIVIDER_COLOR,
  [CONFIG_DIVIDER_THICKNESS]: ESC_DIVIDER_THICKNESS,
  [CONFIG_DIVIDER_LENGTH]: ESC_DIVIDER_LENGTH,
  [CONFIG_DIVIDER_GRADIENT]: ESC_DIVIDER_GRADIENT,
  [CONFIG_DIVIDER_GRADIENT_PATTERN]: ESC_DIVIDER_GRADIENT_PATTERN,
  [CONFIG_DIVIDER_LABEL]: ESC_DIVIDER_LABEL,
  [CONFIG_DIVIDER_ICON]: ESC_DIVIDER_ICON,
  [CONFIG_DIVIDER_TEXT_POSITION]: ESC_DIVIDER_TEXT_POSITION,
  [CONFIG_DIVIDER_JUSTIFY]: ESC_DIVIDER_JUSTIFY,
  [CONFIG_DIVIDER_PAD]: ESC_DIVIDER_PAD,
  [CONFIG_DIVIDER_TEXT_SIZE]: ESC_DIVIDER_TEXT_SIZE,
  [CONFIG_DIVIDER_TEXT_WEIGHT]: ESC_DIVIDER_TEXT_WEIGHT,
  [CONFIG_DIVIDER_TEXT_COLOR_MODE]: ESC_DIVIDER_TEXT_COLOR_MODE,
  [CONFIG_DIVIDER_TEXT_COLOR]: ESC_DIVIDER_TEXT_COLOR,
  [CONFIG_DIVIDER_ICON_SIZE]: ESC_DIVIDER_ICON_SIZE,
  [CONFIG_DIVIDER_ICON_COLOR_MODE]: ESC_DIVIDER_ICON_COLOR_MODE,
  [CONFIG_DIVIDER_ICON_COLOR]: ESC_DIVIDER_ICON_COLOR,
  [CONFIG_DIVIDER_INDENT]: ESC_DIVIDER_INDENT,
  [CONFIG_DIVIDER_CONTENT_JUSTIFY]: ESC_DIVIDER_CONTENT_JUSTIFY,
  [CONFIG_DIVIDER_MIRROR_CENTER]: ESC_DIVIDER_MIRROR_CENTER,
  [CONFIG_DIVIDER_HIDE_LINE]: ESC_DIVIDER_HIDE_LINE,
  [CONFIG_DIVIDER_STOPS]: ESC_DIVIDER_STOPS,
  [CONFIG_AREA_BUTTON_STYLE]: ESC_AREA_BUTTON_STYLE,
  [CONFIG_SHOW_BATTERY]: ESC_SHOW_BATTERY,
  [CONFIG_SHOW_SIGNAL]: ESC_SHOW_SIGNAL,
  [CONFIG_BATTERY_ALIGN]: ESC_BATTERY_ALIGN,
  [CONFIG_SIGNAL_ALIGN]: ESC_SIGNAL_ALIGN,
  [CONFIG_BATTERY_POSITION]: ESC_BATTERY_POSITION,
  [CONFIG_SIGNAL_POSITION]: ESC_SIGNAL_POSITION,
  [CONFIG_CLEAN_NAMES]: ESC_CLEAN_NAMES,
  [CONFIG_NAME_REMOVE]: ESC_NAME_REMOVE,
  [CONFIG_NAME_CAPITALIZE]: ESC_NAME_CAPITALIZE,
  [CONFIG_NAME_STRIP_AREA]: ESC_NAME_STRIP_AREA,
  [CONFIG_AREA_NAME_KEY]: ESC_AREA_NAME_VALUE,
  [CONFIG_NAME_TEXT_SIZE]: ESC_NAME_TEXT_SIZE,
  [CONFIG_NAME_TEXT_WEIGHT]: ESC_NAME_TEXT_WEIGHT,
  [CONFIG_NAME_TEXT_COLOR]: ESC_NAME_TEXT_COLOR,
  [CONFIG_POSITION_TEXT_SIZE]: ESC_POSITION_TEXT_SIZE,
  [CONFIG_POSITION_TEXT_COLOR]: ESC_POSITION_TEXT_COLOR,
  [CONFIG_POSITION_TEXT_WEIGHT]: ESC_POSITION_TEXT_WEIGHT,
  [CONFIG_POSITION_BACKGROUND]: ESC_POSITION_BACKGROUND,
  [CONFIG_COVER_GAP]: ESC_COVER_GAP,
  [CONFIG_COLLAPSE_ICON]: '',
  [CONFIG_COLLAPSE_ICON_SIZE]: 0,
  [CONFIG_COLLAPSE_ICON_COLOR]: '',
  [CONFIG_CONTROLS_GAP]: ESC_CONTROLS_GAP,
  [CONFIG_CONTROLS_BUTTON_PAD]: ESC_CONTROLS_BUTTON_PAD,
  [CONFIG_CONTROLS_BUTTON_MARGIN]: ESC_CONTROLS_BUTTON_MARGIN,
  [CONFIG_CONTROL_ICON_COLOR]: ESC_CONTROL_ICON_COLOR,
  [CONFIG_ICON_UP]: ESC_ICON_UP, [CONFIG_ICON_DOWN]: ESC_ICON_DOWN, [CONFIG_ICON_STOP]: ESC_ICON_STOP,
  [CONFIG_ICON_PARTIAL]: ESC_ICON_PARTIAL, [CONFIG_ICON_TILT_UP]: ESC_ICON_TILT_UP, [CONFIG_ICON_TILT_DOWN]: ESC_ICON_TILT_DOWN,
  [CONFIG_PCT_ICON_COLOR]: ESC_PCT_ICON_COLOR,
  [CONFIG_PCT_BUTTON_BG]: ESC_PCT_BUTTON_BG, [CONFIG_PCT_BUTTON_BORDER]: ESC_PCT_BUTTON_BORDER, [CONFIG_PCT_BUTTON_COLOR]: ESC_PCT_BUTTON_COLOR,
  [CONFIG_PCT_BUTTON_WEIGHT]: ESC_PCT_BUTTON_WEIGHT, [CONFIG_PCT_BUTTON_SIZE]: ESC_PCT_BUTTON_SIZE,
  [CONFIG_PCT_BUTTON_STYLE]: ESC_PCT_BUTTON_STYLE,
  [CONFIG_HEADER_IMAGE_GAP]: ESC_HEADER_IMAGE_GAP,

  [CONFIG_SHUTTER_PRESET]: ESC_SHUTTER_PRESET,
  [CONFIG_ENTITY_ID]: ESC_ENTITY_ID,
  [CONFIG_SHOW_GROUP_MEMBERS]: ESC_SHOW_GROUP_MEMBERS,

  [CONFIG_BATTERY_ENTITY_ID]: ESC_BATTERY_ENTITY_ID,
  [CONFIG_SIGNAL_ENTITY_ID]: ESC_SIGNAL_ENTITY_ID,

  [CONFIG_NAME]: ESC_NAME,
  [CONFIG_PASSIVE_MODE]: ESC_PASSIVE_MODE,
  [CONFIG_COVER_VISUAL]: ESC_COVER_VISUAL,
  [CONFIG_MODERN_STYLE]: ESC_MODERN_STYLE,
  [CONFIG_MODERN_VALUE_POS]: ESC_MODERN_VALUE_POS,
  [CONFIG_POSITION_PLACEMENT]: ESC_POSITION_PLACEMENT,
  [CONFIG_PANEL_POS_SHOW]: ESC_PANEL_POS_SHOW,
  [CONFIG_PANEL_POS_SIZE]: ESC_PANEL_POS_SIZE,
  [CONFIG_PANEL_POS_WEIGHT]: ESC_PANEL_POS_WEIGHT,
  [CONFIG_PANEL_POS_COLOR]: ESC_PANEL_POS_COLOR,
  [CONFIG_PANEL_POS_END]: ESC_PANEL_POS_END,
  [CONFIG_MODERN_TRAVEL]: ESC_MODERN_TRAVEL,
  [CONFIG_MODERN_SECOND_ENTITY]: ESC_MODERN_SECOND_ENTITY,
  [CONFIG_IMAGE_MAP]: ESC_IMAGE_MAP,
  [CONFIG_WINDOW_IMAGE]: ESC_IMAGE_WINDOW,
  [CONFIG_VIEW_IMAGE]: ESC_IMAGE_VIEW,
  [CONFIG_SHUTTER_SLAT_IMAGE]: ESC_IMAGE_SHUTTER_SLAT,
  [CONFIG_SHUTTER_BOTTOM_IMAGE]: ESC_IMAGE_SHUTTER_BOTTOM,
  [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: ESC_ROTATE_MAIN_SHUTTER_IMAGE,
  [CONFIG_STRETCH_EDGE_SHUTTER_IMAGE]: ESC_STRETCH_EDGE_SHUTTER_IMAGE,
  [CONFIG_BASE_HEIGHT_PX]: ESC_BASE_HEIGHT_PX,
  [CONFIG_BASE_WIDTH_PX]: ESC_BASE_WIDTH_PX,
  [CONFIG_RESIZE_HEIGHT_PCT]: ESC_RESIZE_HEIGHT_PCT,
  [CONFIG_RESIZE_WIDTH_PCT]: ESC_RESIZE_WIDTH_PCT,

  [CONFIG_SCALE_ICONS]: ESC_SCALE_ICONS,
  [CONFIG_SCALE_BUTTONS]: ESC_SCALE_BUTTONS,
  [CONFIG_SCALE_TEXTS]: ESC_SCALE_TEXTS,
  [CONFIG_OFFSET_OPENED_PCT]: ESC_OPENED_OFFSET_PCT,
  [CONFIG_OFFSET_CLOSED_PCT]: ESC_CLOSED_OFFSET_PCT,
  [CONFIG_BUTTONS_POSITION]: ESC_BUTTONS_POSITION,
  [CONFIG_NAME_POSITION]: ESC_NAME_POSITION,
  [CONFIG_OPENING_POSITION]: ESC_OPENING_POSITION,
  [CONFIG_ICONS_POSITION]: ESC_ICONS_POSITION,
  [CONFIG_INLINE_HEADER]: ESC_INLINE_HEADER,
  [CONFIG_HEADER_ALIGN]: ESC_HEADER_ALIGN,
  [CONFIG_HEADER_ORDER]: ESC_HEADER_ORDER,
  [CONFIG_HEADER_GAP]: ESC_HEADER_GAP,

  [CONFIG_INVERT_PCT]   : ESC_INVERT_PCT_UI,
  [CONFIG_INVERT_PCT_UI]   : ESC_INVERT_PCT_UI,
  [CONFIG_INVERT_PCT_COVER]: ESC_INVERT_PCT_COVER,
  [CONFIG_INVERT_OPEN_CLOSE]   : ESC_INVERT_OPEN_CLOSE_UI,
  [CONFIG_INVERT_OPEN_CLOSE_UI]   : ESC_INVERT_OPEN_CLOSE_UI,
  [CONFIG_INVERT_OPEN_CLOSE_COVER]: ESC_INVERT_OPEN_CLOSE_COVER,

  [CONFIG_INVERT_PCT_TILT_UI]: ESC_INVERT_PCT_TILT_UI,
  [CONFIG_INVERT_PCT_TILT_COVER]: ESC_INVERT_PCT_TILT_COVER,

  [CONFIG_SHOW_TILT]: ESC_SHOW_TILT,  // deprecated
  [CONFIG_TILT_ANGLE_MIN]: ESC_TILT_ANGLE_MIN,
  [CONFIG_TILT_ANGLE_MAX]: ESC_TILT_ANGLE_MAX,

  [CONFIG_CLOSING_DIRECTION]: ESC_CLOSING_DIRECTION,
  [CONFIG_PARTIAL_CLOSE_PCT]: ESC_PARTIAL_CLOSE_PCT,
  [CONFIG_OFFSET_IS_CLOSED_PCT]: ESC_OFFSET_CLOSED_PCT,
  [CONFIG_ALWAYS_PCT]: ESC_ALWAYS_PCT,
  [CONFIG_DISABLE_END_BUTTONS]: ESC_DISABLE_END_BUTTONS,
// ===================
  [CONFIG_NAME_DISABLED]: ESC_NAME_DISABLED,   // deprecated
  [CONFIG_OPENING_DISABLED]: ESC_OPENING_DISABLED,  // deprecated
  [CONFIG_TILT_SLIDER_ONLY]: ESC_TILT_SLIDER_ONLY, // deprecated
  [CONFIG_DISABLE_STANDARD_BUTTONS]: ESC_DISABLE_STANDARD_BUTTONS, // deprecated
  [CONFIG_DISABLE_PARTIAL_OPEN_BUTTONS]: ESC_DISABLE_PARTIAL_OPEN_BUTTONS, // deprecated

  [CONFIG_SHOW_NAME]: ESC_SHOW_NAME, // replace
  [CONFIG_SHOW_OPENING]: ESC_SHOW_OPENING, // replace
  [CONFIG_SHOW_TILT_BUTTONS]: ESC_SHOW_TILT_BUTTONS, // replace
  [CONFIG_SHOW_STANDARD_BUTTONS]: ESC_SHOW_STANDARD_BUTTONS, // replace
  [CONFIG_SHOW_PARTIAL_OPEN_BUTTONS]: ESC_SHOW_PARTIAL_OPEN_BUTTONS, // replace

  [CONFIG_SHOW_WINDOW]: ESC_SHOW_WINDOW, // new
  [CONFIG_SHOW_TILT_SLIDER]: ESC_SHOW_TILT_SLIDER, // new
  [CONFIG_SHOW_OPEN_CLOSE_SLIDER]: ESC_SHOW_OPEN_CLOSE_SLIDER, // new
//==========================
  [CONFIG_PICKER_OVERLAP_PX]: ESC_PICKER_OVERLAP_PX,
  [CONFIG_CURRENT_POSITION]: ESC_CURRENT_POSITION,

  [CONFIG_BUTTON_STOP_HIDE_STATES]: ESC_BUTTON_STOP_HIDE_STATES,
  [CONFIG_BUTTON_OPENED_HIDE_STATES]: ESC_BUTTON_OPENED_HIDE_STATES,
  [CONFIG_BUTTON_CLOSED_HIDE_STATES]: ESC_BUTTON_CLOSED_HIDE_STATES,
// Home assistant key words, not used but to prevent warnings
  ['view_layout']: null,
  ['grid_options']: null,



};
export const ESC_PRESET = {
  // Baseline roller shutter. Must be a SMALL object (only the keys that define the look),
  // NOT the whole CONFIG_DEFAULT — otherwise applying it as a per-area/entity preset would
  // reset every card-level setting (width, button style, presets…) back to default.
  [ESC_ROLLER_SHUTTER]: {
    [CONFIG_WINDOW_IMAGE]: ESC_IMAGE_WINDOW,
    [CONFIG_VIEW_IMAGE]: ESC_IMAGE_VIEW,
    [CONFIG_SHUTTER_SLAT_IMAGE]: ESC_IMAGE_SHUTTER_SLAT,
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: ESC_IMAGE_SHUTTER_BOTTOM,
    [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: true,
    [CONFIG_STRETCH_EDGE_SHUTTER_IMAGE]: true,
    [CONFIG_CLOSING_DIRECTION]: DOWN,
  },
  [ESC_AWNING]: {
    [CONFIG_INVERT_OPEN_CLOSE_UI]: true,
    [CONFIG_INVERT_PCT_UI]: true,
    [CONFIG_SHUTTER_SLAT_IMAGE]: 'esc-awning.png',
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: 'esc-awning-bottom.png',
    [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: true,
    [CONFIG_STRETCH_EDGE_SHUTTER_IMAGE]: false,
    [CONFIG_OFFSET_CLOSED_PCT]: 50,
    [CONFIG_CLOSING_DIRECTION]: DOWN,
  },
  [ESC_CURTAIN]: {
    [CONFIG_CLOSING_DIRECTION]: RIGHT,
    [CONFIG_SHUTTER_SLAT_IMAGE]: 'esc-curtain.png',
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: '',
    [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: false,
  },
  [ESC_SHADE]: {
    [CONFIG_SHUTTER_SLAT_IMAGE]: '#00000080',
    [CONFIG_CLOSING_DIRECTION]: DOWN,
    [CONFIG_SHOW_TILT]: false,
  },
  // Insect/window screen: fine semi-transparent mesh, like a shade but see-through.
  [ESC_SCREEN]: {
    [CONFIG_SHUTTER_SLAT_IMAGE]: 'esc-screen.png',
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: '',
    [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: false,
    [CONFIG_STRETCH_EDGE_SHUTTER_IMAGE]: false,
    [CONFIG_CLOSING_DIRECTION]: DOWN,
    [CONFIG_SHOW_TILT]: false,
  },
  [ESC_BLIND]: {
    [CONFIG_CLOSING_DIRECTION]: RIGHT,
    [CONFIG_SHUTTER_SLAT_IMAGE]: 'esc-blind.png',
    [CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]: false,
    [CONFIG_WINDOW_IMAGE]: 'esc-window2.png',
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: '',
  },
  [ESC_TEST]: {
    [CONFIG_WINDOW_IMAGE]: '',
    [CONFIG_OFFSET_OPENED_PCT]: 2,
    [CONFIG_SHUTTER_SLAT_IMAGE]: 'rode_rechthoek.png',
    [CONFIG_SHUTTER_BOTTOM_IMAGE]: 'gele_rechthoek.png',
    [CONFIG_NAME]: 'Test',
  },
  [ESC_COMPACT]: {
    [CONFIG_SHOW_NAME]: true,
    [CONFIG_SHOW_OPENING]: true,
    [CONFIG_SHOW_STANDARD_BUTTONS]: true,
    [CONFIG_SHOW_WINDOW]: false,
    [CONFIG_SHOW_TILT_BUTTONS]: true,
    [CONFIG_SHOW_TILT_SLIDER]: true,
    [CONFIG_SHOW_OPEN_CLOSE_SLIDER]: true,
    [CONFIG_SHOW_PARTIAL_OPEN_BUTTONS]: false,
  },
  // Roller shutter over a window frame with a city view behind (art from pic-shutter-card).
  [ESC_WINDOW]: {
    [CONFIG_WINDOW_IMAGE]: 'psc-frame_window.png',
    [CONFIG_VIEW_IMAGE]: 'psc-outside_window.png',
    [CONFIG_CLOSING_DIRECTION]: DOWN,
  },
  // Balcony door as the backdrop; the roller shutter rolls down over it. Door art is a tall ~233x610 image.
  [ESC_BALCONY_L]: {
    [CONFIG_WINDOW_IMAGE]: '',
    [CONFIG_VIEW_IMAGE]: 'psc-pic_balcon_l.png',
    [CONFIG_BASE_WIDTH_PX]: 150,
    [CONFIG_BASE_HEIGHT_PX]: 393,
    [CONFIG_CLOSING_DIRECTION]: DOWN,
  },
  [ESC_BALCONY_R]: {
    [CONFIG_WINDOW_IMAGE]: '',
    [CONFIG_VIEW_IMAGE]: 'psc-pic_balcon_r.png',
    [CONFIG_BASE_WIDTH_PX]: 150,
    [CONFIG_BASE_HEIGHT_PX]: 393,
    [CONFIG_CLOSING_DIRECTION]: DOWN,
  }
}

// Bundled images offered as editor suggestions, grouped by slot.
// { value: filename, label: friendly description } — the editor shows the label so the
// picker is readable. esc-* ship with the card; psc-* are from pic-shutter-card (used with permission).
export const BUNDLED_WINDOW_IMAGES = [
  { value: 'esc-window.png',        label: 'Window frame — grey' },
  { value: 'esc-window2.png',       label: 'Window frame — brown' },
  { value: 'esc-window3.png',       label: 'Window frame — green' },
  { value: 'psc-frame_window.png',  label: 'Window frame — white, with roller box' },
  { value: 'psc-frame_win1.png',    label: 'Window frame — white, style 1' },
  { value: 'psc-frame_win1_2.png',  label: 'Window frame — white, style 1b' },
  { value: 'psc-frame_win2.png',    label: 'Window frame — white, style 2' },
];
export const BUNDLED_VIEW_IMAGES = [
  { value: 'esc-view.png',            label: 'Background view — 1' },
  { value: 'esc-view2.png',           label: 'Background view — 2' },
  { value: 'psc-outside_window.png',  label: 'Outside — city skyline at dusk' },
  { value: 'psc-outside_window1.png', label: 'Outside — scene 1' },
  { value: 'psc-outside_window2.png', label: 'Outside — scene 2' },
  { value: 'psc-outside_window3.png', label: 'Outside — scene 3' },
  { value: 'psc-outside_window4.png', label: 'Outside — scene 4' },
  { value: 'psc-outside_window5.png', label: 'Outside — scene 5' },
  { value: 'psc-outwin1.png',         label: 'Outside — window scene 1' },
  { value: 'psc-outwin2.png',         label: 'Outside — window scene 2' },
  { value: 'psc-outwin3.png',         label: 'Outside — window scene 3' },
  { value: 'psc-pic_balcon_l.png',    label: 'Balcony door — left' },
  { value: 'psc-pic_balcon_r.png',    label: 'Balcony door — right' },
];
export const BUNDLED_SLAT_IMAGES = [
  { value: 'esc-shutter-slat.png',  label: 'Roller shutter slat — grey' },
  { value: 'esc-shutter-slat2.png', label: 'Roller shutter slat — brown' },
  { value: 'esc-shutter-slat3.png', label: 'Roller shutter slat — green' },
  { value: 'esc-awning.png',        label: 'Awning fabric — red/white' },
  { value: 'esc-curtain.png',       label: 'Curtain — red' },
  { value: 'esc-blind.png',         label: 'Venetian blind slats' },
  { value: '#00000080',             label: 'Shade — dark tint (semi-transparent)' },
  { value: 'esc-screen.png',        label: 'Window screen mesh (semi-transparent)' },
  { value: 'esc-screen2.png',       label: 'Window screen mesh — dense (semi-transparent)' },
  { value: 'psc-art.png',           label: 'Curtain art — abstract' },
  { value: 'psc-art1.png',          label: 'Curtain art — abstract 1' },
  { value: 'psc-art3.png',          label: 'Curtain art — abstract 3' },
  { value: 'psc-art4.png',          label: 'Curtain art — abstract 4' },
  { value: 'psc-art_city.png',      label: 'Curtain art — city' },
  { value: 'psc-purple.png',        label: 'Solid colour — purple' },
  { value: 'psc-liteblue.png',      label: 'Solid colour — light blue' },
  { value: 'psc-litegreen.png',     label: 'Solid colour — light green' },
];
export const BUNDLED_BOTTOM_IMAGES = [
  { value: 'esc-shutter-bottom.png',  label: 'Roller bottom bar — grey' },
  { value: 'esc-shutter-bottom2.png', label: 'Roller bottom bar — brown' },
  { value: 'esc-shutter-bottom3.png', label: 'Roller bottom bar — green' },
  { value: 'esc-awning-bottom.png',   label: 'Awning bottom bar' },
];
export const ICON_MARGIN_LR = 3;
export const ICON_MARGIN_TB = 8;

export const Globals={
  huiView: null,
  screenOrientation: {value:LANDSCAPE },
}

export const SHUTTER_CSS =`

      .${ESC_CLASS_SHUTTER} {
        overflow: visible;
        position: relative;
      }
      .${ESC_CLASS_MIDDLE} {
        display: flex;
        flex-flow: var(--esc-flex-flow-middle);
        justify-content: center;
        align-items: center;
        gap: var(--esc-controls-gap, 0px);
        padding: var(--esc-header-image-gap, 0px) 0;
        max-width: 100%;
        max-height: 100%;
        margin: auto;
      }
      .${ESC_CLASS_BUTTONS} {
        display: flex;
        flex: none;
        flex-flow: var(--esc-buttons-flex-flow);
        justify-content: center;
        align-items: center;
        max-width: 100%;
        margin: var(--esc-controls-btn-margin, 0);
      }
      .${ESC_CLASS_TILT_BUTTONS} {
        display: flex;
        flex: none;
        flex-flow: var(--esc-buttons-flex-flow-tilt);
        justify-content: center;
        align-items: center;
        max-width: 100%;
      }
      .esc-shutter-middle-stack {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .esc-shutter-zone-tb {
        display: flex;
        flex-flow: row wrap;
        justify-content: center;
        align-items: center;
        gap: 4px;
        margin: 2px 0;
      }
      .esc-shutter-pos-side {
        align-self: center;
        text-align: center;
        white-space: nowrap;
        padding: 2px 4px;
      }
      /* controls placed in a top/bottom zone render as a horizontal row (conform to orientation) */
      .esc-shutter-zone-tb .${ESC_CLASS_BUTTONS},
      .esc-shutter-zone-tb .${ESC_CLASS_TILT_BUTTONS} {
        flex-flow: row;
      }
      .${ESC_CLASS_BUTTONS_TOP} {
        flex-flow: row;
      }
      .${ESC_CLASS_BUTTONS_BOTTOM} {
        flex-flow: row;
      }
      .${ESC_CLASS_BUTTONS_LEFT} {
        flex-flow: column;
      }
      .${ESC_CLASS_BUTTONS_RIGHT} {
        flex-flow: column;
      }
      .${ESC_CLASS_BUTTONS} ha-icon-button {
        display: inline-block;
        width: min-content;
      }
      .${ESC_CLASS_SELECTOR} {
        max-width: 100%;
        margin: ${SELECTOR_MARGIN}px;
        justify-content: center;
        position: relative;
        align-items: center;
        overflow: var(--esc-overflow); /* prevents image overflow */
        background-color: var(--esc-window-background-color);
        background-image: var(--esc-window-background-image);
        background-size: cover;
        background-position: center;
        flex: none;
      }
      .${ESC_CLASS_SELECTOR}.esc-modern {
        background: none;
        overflow: visible;
      }
      .${ESC_CLASS_SELECTOR_PICTURE} {
        width: var(--esc-window-width);
        height: var(--esc-window-height);
        max-width: 100%;
        z-index: ${Z_INDEX_PICTURE};
        justify-content: center;
        position: relative;
        margin: auto;
        line-height: 0;
        image-rendering: auto;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        image-rendering: -webkit-optimize-contrast;
      }
      .${ESC_CLASS_SELECTOR_PICTURE}>img {
        justify-content: center;
        margin: auto;
        width: 100%;
        height: 100%;
      }
      .${ESC_CLASS_SELECTOR_PICKER} {
        z-index: ${Z_INDEX_PICKER};
        position: absolute;
        left: -50%;
        width: 100%;
        top: var(--esc-picker-top);
        height: var(--esc-picker-height);
        cursor: pointer;
        transform-origin: center;
        transform: var(--esc-transform-picker);
        touch-action: none;
        user-select: none;
      }
      .${ESC_CLASS_SELECTOR_SLIDE} {
        z-index: ${Z_INDEX_SLIDE};
        text-align: start;` /* align to left, solves #104 */ +`
        position: absolute;
        left: -50%;
        width: 100%;
        overflow: var(--esc-overflow);
        bottom: 100%;
        transform-origin: bottom;
        transform: var(--esc-transform-slide);
        image-rendering: auto;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        image-rendering: -webkit-optimize-contrast;
      }


      .${ESC_CLASS_SELECTOR_SLIDE_SLATS} {
        height: var(--esc-slide-slats-height);
        background-position: var(--esc-slide-background-main-position);
        background-image: var(--esc-slide-background-main-image);
        background-color: var(--esc-slide-background-main-color);
        background-repeat: repeat;
        background-size: var(--esc-slide-background-slats-size);
        transform: var(--esc-transform-undo-slats-rotate);
      }
      .${ESC_CLASS_TILT_SLAT1} {
        height: var(--esc-slide-slats-height);
        display: flex;
        flex-direction: column-reverse;
        overflow: var(--esc-overflow);
      }
      .${ESC_CLASS_TILT_SLAT2} {
        height: var(--esc-slat-height);
        width: 100%;
        flex-shrink: 0;
        overflow: var(--esc-overflow);
        perspective: 500px;
      }
      .${ESC_CLASS_TILT_EDGE} {
        z-index: 1;
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
        background-color: grey;
      }
      .${ESC_CLASS_TILT_SLAT3} {
        z-index: 2;
        position: absolute;
        height: var(--esc-tilt-slat-height);
        width: var(--esc-tilt-slat-width);
        background-size: var(--esc-tilt-slat-background-size);
        transform-origin: var(--esc-tilt-slat-origin);
        transform: rotateX(var(--esc-tilt-angle-deg)) var(--esc-transform-tilt-slat-rotate);
        background-repeat: repeat;
        background-position: var(--esc-slide-background-main-position);
        background-color: var(--esc-slide-background-main-color);
        background-image: var(--esc-slide-background-main-image);
      }
      .${ESC_CLASS_SELECTOR_SLIDE_EDGE} {
        height: var(--esc-slide-edge-height);
        background-position: var(--esc-slide-background-edge-position);
        background-image: var(--esc-slide-background-edge-image);
        background-color: var(--esc-slide-background-edge-color);
        background-repeat: repeat;
        background-size: var(--esc-slide-background-edge-size);
      }
      .${ESC_CLASS_SELECTOR_PARTIAL} {
        z-index: ${Z_INDEX_PARTIAL};
        position: absolute;
        top: 0;
        left: -50%;
        width: 100%;
        height: 1px;
        background-color: grey;
        transform-origin: center center;
        transform: var(--esc-transform-partial);
      }
      .${ESC_CLASS_MOVEMENT_OVERLAY} {
        z-index: ${Z_INDEX_OVERLAY};
        display: var(--esc-movement-overlay-display);
        top : 0;
        height: 100%;
        width: 100%;
        position: absolute;
        background-color: rgba(0,0,0,0.3);
        text-align: center;
        --mdc-icon-size: 60px;
        transform-origin: center center;
      }
      .${ESC_CLASS_MOVEMENT_UP},
      .${ESC_CLASS_MOVEMENT_DOWN} {
        z-index: ${Z_INDEX_MOVEMENT_ICON} !important;
        transform: var(--esc-transform-movement);
        position: absolute;
        display: block;
      }
      .${ESC_CLASS_MOVEMENT_UP} {
        display: var(--esc-movement-overlay-up-display);
      }
      .${ESC_CLASS_MOVEMENT_DOWN} {
        display: var(--esc-movement-overlay-down-display);
      }
      .${ESC_CLASS_TOP_BOTTOM} {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        width: 100%;
        white-space: nowrap;
      }
      .${ESC_CLASS_ICON_CELL} {
        display: flex;
        align-items: center;
        gap: calc(${ICON_MARGIN_LR}px);
      }
      .${ESC_CLASS_ICON_CELL}-left { grid-column: 1; justify-content: flex-start; }
      .${ESC_CLASS_ICON_CELL}-center { grid-column: 2; justify-content: center; }
      .${ESC_CLASS_ICON_CELL}-right { grid-column: 3; justify-content: flex-end; }
      .${ESC_CLASS_TOP}, .${ESC_CLASS_BOTTOM} {
        display: flex;
        flex: 1 1 auto;
        flex-flow: var(--esc-flex-name_opening-flow);
        align-items: center;
        justify-content: var(--esc-header-align, center);
        gap: var(--esc-header-gap, 0px);
        white-space: nowrap;
        position: relative;
        text-align: center;
        padding-top: calc(${8}px*var(--esc-text-scale));
        padding-bottom: calc(${8}px*var(--esc-text-scale));
      }
      .${ESC_CLASS_LABEL} {
        clear: both;
        font-size: var(--esc-name-font-size, calc(${FONT_SIZE_LABEL}px*var(--esc-text-scale)));
        font-weight: var(--esc-name-font-weight, inherit);
        color: var(--esc-name-color, inherit);
        line-height: calc(${LINE_HEIGHT_LABEL}px*var(--esc-text-scale));
        bottom: 0;
        position: relative;
        cursor: pointer;
      }
      .${ESC_CLASS_LABEL_DISABLED} {
        color: var(--secondary-text-color);
      }
      .${ESC_CLASS_TITLE_DISABLED} {
        display: none;
      }
      .${ESC_CLASS_POSITION} {
        vertical-align: top;
        clear: both;
        color: var(--esc-position-color, inherit);
        font-weight: var(--esc-position-weight, inherit);
        font-size: var(--esc-position-font-size, calc(${FONT_SIZE_POSITION}px*var(--esc-text-scale)));
        line-height: calc(${LINE_HEIGHT_POSITION}px*var(--esc-text-scale));
        height:      calc(${LINE_HEIGHT_POSITION}px*var(--esc-text-scale));
        border-radius: 5px;
        margin: ${MARGIN_POSITION}px;

      }
      .${ESC_CLASS_POSITION}>span {
        background-color: var(--esc-position-bg, transparent);
        padding: 2px 5px 2px 5px;
      }
      .${ESC_CLASS_HA_ICON} {
        padding-bottom: 10px;
        color: var(--esc-control-icon-color, inherit);
      }
      ha-icon-button {
        transform: var(--esc-button-rotate);
      }
      .${ESC_CLASS_HA_ICON_TILT} {
        padding-bottom: 10px;
        color: var(--esc-control-icon-color, inherit);
      }
      /* v1.43.0: color the % preset icon-style buttons */
      .esc-shutter-pct-icons ha-icon-button { color: var(--esc-pct-icon-color, inherit); }
      .${ESC_CLASS_HA_ICON_LOCK} {
        position: relative;
        top: -0.3em;
        --mdc-icon-size: ${ICON_SIZE_LOCK}px;
      }
      .blankDiv{
        width: calc(var(--mdc-icon-size)*1.5);
        height: 1px;
      }
      .${ESC_CLASS_ICON_LEFT}, .${ESC_CLASS_ICON_RIGHT} {
        --mdc-icon-size: var(--esc-icon-size-wifi-battery, 24px);
        margin: var(--esc-icons-margins);
        display: inline-block;
        text-align: center;
        width: var(--esc-icon-div-size);
      }
      .${ESC_CLASS_ICON_LEFT} {
        color: var(--esc-top-left-color);
        left: -3px;
      }
      .${ESC_CLASS_ICON_RIGHT} {
        color: var(--esc-top-right-color);
        right: -3px;
      }
      .${ESC_CLASS_TOP_ICON_TEXT} {
        text-align: center;
        line-height: var(--esc-top-icon-text-line-height);
        font-size: var(--esc-top-icon-text-font-size);
      }

    .${ESC_CLASS_SLIDER_WRAP} {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .${ESC_CLASS_SLIDER_CLASS} {
      writing-mode: var(--esc-slider-writing-mode);
      direction: var(--esc-slider-direction);
      zoom: var(--esc-button-scale);
    }

    .${ESC_CLASS_TILT_CONTAINER} {
      position: relative;
      box-sizing: border-box;
      border: 1px solid grey;
      border-radius: 5px;
      display: flex;
      flex: none;
      flex-flow: var(--esc-buttons-flex-flow-tilt);
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
    }

    .${ESC_CLASS_TILT_CLASS} {
      width: calc(var(--esc-button-scale)*${ICON_SIZE}px);
      height: calc(var(--esc-button-scale)*${ICON_SIZE}px);
      position: relative;
      transform: rotate(var(--esc-tilt-angle-deg-graph));
    }

    .${ESC_CLASS_TILT_LINE} {
      width: calc(var(--esc-button-scale)*2px);
      height: calc(var(--esc-button-scale)*${ICON_BUTTON_SIZE-ICON_SIZE/2}px);
      background: red;
      position: absolute;
      top: calc(var(--esc-button-scale)*${ -(ICON_BUTTON_SIZE-ICON_SIZE)/2 +ICON_SIZE/4}px);
      left: calc(var(--esc-button-scale)*${ICON_SIZE/2}px);
      transform: translateX(-50%);
    }

    /* v1.22.0: value-label position buttons (#7) */
    .esc-shutter-pct-values {
      display: flex;
      flex-wrap: wrap;
      gap: calc(var(--esc-button-scale)*4px);
      align-content: center;
      justify-content: center;
    }
    .esc-shutter-pct-btn {
      cursor: pointer;
      font-family: ${HA_TITLE_FONT};
      font-size: var(--esc-pct-btn-size, calc(${FONT_SIZE_POSITION}px*var(--esc-button-scale)));
      font-weight: var(--esc-pct-btn-weight, 400);
      color: var(--esc-pct-btn-color, var(--primary-text-color));
      background: var(--esc-pct-btn-bg, var(--secondary-background-color));
      border: 1px solid var(--esc-pct-btn-border, var(--divider-color));
      border-radius: 6px;
      padding: 4px 8px;
      min-width: calc(var(--esc-button-scale)*34px);
    }
    .esc-shutter-pct-btn:hover { border-color: var(--primary-color); }
    .esc-shutter-pct-btn:disabled { opacity: 0.4; cursor: default; }
`;
