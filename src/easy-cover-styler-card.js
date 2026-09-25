/**
 * Easy Cover Styler Card for Home Assistant (formerly Flex Cover Card / Enhanced Shutter Card)
 * HA-dev-page for cover:
 * https://developers.home-assistant.io/docs/core/entity/cover
 *
 * Version: 2026.09.24.83  (CARD_VERSION in constants.js is the single source of truth)
 *   2026.09.24.83 — Rebranded **Flex Cover Card → Easy Cover Styler Card** (new card type `custom:easy-cover-styler-card`, element `easy-cover-styler`, editor renamed, display name + docs updated). Migration: the previous `custom:flex-cover-card` and original `custom:enhanced-shutter-card` types keep working via built-in aliases; the visual editor migrates a saved `type:` to the new one. Moved **Design Mode** under the Appearance → Card divider with a short description.
 *   2026.09.24.82 — Consolidated all Collapse Toggle settings into one group under Panel Layout
 *   2026.09.24.81 — Renamed 'partial' → Favorite Position (default icon mdi:star-circle); standard buttons → Movement Control Buttons; merged Disable End Buttons into that group
 *   2026.09.24.80 — Consolidated control settings — visuals in Element Layout & Style, movement/limits/presets in Controls Behavior; removed Cover Elements panel; Title Case throughout
 *   2026.09.24.79 — Editor formatting: panel titles and subtitle dividers now use Title Case (Cover Panels, Area Selector Panel, Group Panel/Control, Auto-Generate, Position Presets, Tilt Angles, Per-Area & Per-Entity Presets, etc.).
 *   2026.09.24.78 — The individual-covers collapse toggle icon is now customisable — set a custom mdi, size and colour (Appearance → Collapse Toggle); blank keeps the chevron.
 *   2026.09.24.77 — Editor: removed the icon from the editor title; renamed 'Passive mode' to **Design Mode** ('Disables control commands during card design') and moved it to the top of Panel Layout; renamed 'Cover Images' -> **Styling** and 'Spacing' -> 'Padding Between Panel Sections'. Fixed: the group↔covers gap ('Add Padding, Group ↔ Individual Panels') now only spaces the group/area panel from the first cover instead of every cover.
 *   2026.09.24.76 — Controls & Info polish: compact subpanel rows (single 40px line, like the Color card); fixed the duplicate show/hide eye on each subpanel; removed the Controls/Info sub-dividers. New option: when the Position Value is on the handle, the Open/Closed end-state text can move to the centre / above / below the bar while the numeric % stays on the handle.
 *   2026.09.24.75 — Editor: renamed 'Controls & Info Positions' -> **Controls & Info**, and each element (Up/Stop/Down, slider, tilt, presets, name, Position Value, battery, signal) is now its own **expandable subpanel** (Color-card Buttons style) — collapsed row shows the eye show/hide + a chevron; expanding reveals that element's placement and options.
 *   2026.09.24.74 — Position Value split into two independent readouts to remove the header/panel conflict: a **Header** Position Value (show in header + row + size/weight/colour/box, under Header) and a **Panel** Position Value (its own show eye + placement around the image/on-handle + size/weight/colour, under Controls & Info). Both can be shown at once or independently; legacy placement configs migrate to the panel readout.
 *   2026.09.24.73 — Modern bar fixes: the handle no longer straddles the bar edge (clamped fully inside), so the on-handle % is no longer clipped; the bar stops clipping when the readout is on the handle; and the on-handle % now follows the configured Status colour instead of always white.
 *   2026.09.22.72 — Positions panel polish: removed 'Info —' from subtitles; the show/hide eye now sits on the far right of each row; the panel now lives under the 'Individual Panels' divider; moved the header-row layout options back into the Header panel (renamed 'Header & Status' -> 'Header'); on/at-handle position readout now works on the Classic visual too (tracks the slat edge), so the '(modern)' notes were dropped.
 *   2026.09.22.71 — Editor reorg: new top-level **Controls & Info Positions** panel gathers every placement (controls sides + orientation, name/position/battery/signal position) with a per-row **eye** show/hide toggle — the scattered show/hide switches were removed from Cover Elements, Header & Status and Cover Images. Renamed 'Layout & Positioning' → **Panel Layout** (card structure only). Header & Status now holds just sources + text styles.
 *   2026.09.22.70 — Status items on any side: Battery and Signal icons can now be placed Left or Right of the image (in addition to the Top/Bottom header rows), rendering beside the window/bar.
 *   2026.09.22.69 — Position readout placement (unified 'Open % placement'): show the % on any side of the image (Top/Bottom/Left/Right — both Classic and Modern) or, on Modern bars, on the handle / at the handle (left, right, above, below). Supersedes the modern-only value placement (kept as back-compat).
 *   2026.09.22.68 — Up/Stop/Down and % preset buttons each get a layout option: Auto (follow their side) / Horizontal row / Vertical column — so you can force the position buttons horizontal or vertical regardless of which side they sit on.
 *   2026.09.22.67 — 2D placement (first step): each control cluster (Up/Stop/Down, slider, tilt, % presets) can now be placed **Top** or **Bottom** of the window/bar in addition to Left/Right — top/bottom render as a horizontal row that conforms to orientation. Enables mixed layouts like image-1 (% buttons and controls above/below). Non-breaking: existing left/right (before/after) layouts unchanged.
 *   2026.09.22.66 — FIX: modern bars using a Slider Styles library reference (`modern_style: lib:<slug>`) rendered as the default style on the live card — the card never subscribed to the Slider Styles library (only the editor did), so `lib:` refs resolved to defaults. The card now subscribes to it and bumps a styleVersion so the per-cover <flex-cover> elements re-render when the library loads. (Also covers % buttons that reference the Button Styles library from inside a cover.)
 *   2026.09.22.65 — TDBU guidance: clarified the Top-rail entity setting for Motion Blinds-style shades (card goes on the Bottom rail cover; set the Top rail cover here; band shows between both rails' current_position).
 *   2026.09.22.64 — Modern bar travel styles: generalized the fill to a band model. **Center-out** (double-curtain) — fill opens from the middle with two handles; **Top-down/bottom-up** scaffolding — shows the band between the bottom rail (this cover) and a top-rail entity's position (new 'Top-rail entity' setting), with two handles. Single (default) unchanged. Works with vertical + horizontal orientation.
 *   2026.09.22.63 — Modern bar rotation 2a — horizontal orientation: with Closing direction Left/Right the modern bar fills along the X axis (fill anchored left, width=position), the handle/tilt bar/on-handle value rotate to match, and drag maps horizontally (reuses the direction-aware picker). Vertical (Down) unchanged. Set a wide base width/height for a good horizontal shape.
 *   2026.09.22.62 — Modern bar: new 'Open % placement' option — on the handle, or beside the bar (left/right) tracking the handle height (in addition to the default header position). Renamed the 'image' cover visual to **Classic**.
 *   2026.09.22.61 — Modern bar refinements: glow can target the whole bar or only the open (filled) section; Track gains an opacity option; Bar Fill opacity now applies to gradients too (via element opacity); renamed Fill→Bar Fill and split a dedicated Track subsection; preview no longer shows a stray tilt bar; Handle radius now applies to pill/square/line; Line handle honours the size/width slider (centered).
 *   2026.09.22.60 — Slider Styles builder: live **preview** (open/moving/closed bars) while editing; added handle **shape** (pill/round/square/diamond/line), **opacity** and **outline** to match the Color Manager card's handle options. Editor reorg: Covers wrapping / collapse settings moved under **Cover panels**; **Buttons position** moved into the **Element placement** section, which now sits at the bottom of Layout & Positioning.
 *   2026.09.22.59 — Phase 2: replaced the free 'Cover element order' drag list with deterministic per-control **Element placement** dropdowns (Up/Stop/Down, Slider, Tilt, Presets → Before/After the window). Legacy `cover_order` still renders correctly and is auto-migrated to the new positions (then removed) when the card is edited.
 *   2026.09.22.58 — Slider Styles library editor: create/edit/duplicate/delete custom modern-bar styles (bar radius/border, track colour, per-state fill colours OR gradient stops, handle size/thickness/colour/glow, bar glow, tilt bar) with four-mode colour + gradient controls, saved to the shared System-scope store and selectable from Cover Images → Modern style. Generic color/slider/switch/select/gradient renderers now accept get/set overrides so they target the draft object.
 *   2026.09.22.57 — New **Modern bar** cover visual (Phase 1): `cover_visual: modern` renders the cover as a rounded track filled to the position with an optional handle, a thin secondary tilt bar, and state-driven fill colours — reusing the existing picker drag (drag = set position). Built-in styles (Neon/iOS/Glass/Minimal) + a System-scope Slider Styles library store/resolver (`modernStyles.js`). Editor: Cover Images panel gains a Visual style toggle + Modern style picker; image slots hide in modern mode.
 *   2026.09.22.56 — Editor: renamed the cover-type field to 'Preset - applied default' and put the four image dropdowns under a 'Preset Overrides' subsection; moved 'Rotate slat image with direction' into the Direction subsection. New bundled image esc-screen2.png (denser window-screen mesh) as a slat option. README trimmed to the visual-editor workflow (removed image-filename tables and the YAML key reference).
 *   2026.09.22.55 — Editor clarity: moved the cover-type preset into the Cover Images panel (top), relabeled 'Cover type (fills the images below)'; the image dropdowns' empty choice is now 'Automatic (from cover type)' and the bundled option labels no longer say '(default)', which collided with that empty choice.
 *   2026.09.22.54 — New bundled image **esc-screen.png** — a fine semi-transparent window/insect screen mesh (like the shade tint but see-through). Added as a Slat image option and a new **screen** cover-type preset (selectable globally and per-area/entity).
 *   2026.09.22.53 — Per-area/entity presets now also drive the **Group panel** image: an area's aggregate ('All'/Group) control inherits that area's preset, so its image matches the area's covers. Added the 'Shade — dark tint' overlay as a selectable option in the Slat image dropdown (it's a colour, so it wasn't in the image list before).
 *   2026.09.22.52 — Image/background pickers are now real dropdowns: each Window / View / Slat / Bottom-bar field is a <select> listing 'Human name (filename.png)', plus a Default option and a 'Custom image / path / colour…' option that reveals a text box for full paths or CSS colours. (Replaced the datalist, which filtered out the other options after the first pick.)
 *   2026.09.22.51 — Editor image/background pickers now show friendly labels (e.g. 'Window frame — white, with roller box', 'Outside — city skyline at dusk', 'Curtain — red') instead of raw filenames — the bundled image lists carry a label per file and the datalist renders it.
 *   2026.09.22.50 — FIX two preset bugs surfaced by per-area presets: (1) the roller-shutter preset was the entire CONFIG_DEFAULT, so applying it per-area reset all card-level layout settings back to default — it is now a small preset (images + rotate/stretch/direction only); (2) presets set a fixed name (Shade/Awning/…) that clobbered each cover's real entity name — removed, so auto-generated covers keep their friendly name.
 *   2026.09.22.49 — FIX: cover & group panels rendered empty after the rebrand — the child element template still emitted the old <enhanced-shutter> tag while the element is now registered as <flex-cover>. Synced the template tag.
 *   2026.09.22.48 — Point the card's documentation link at the new repo (github.com/Ltek/flex-cover-card).
 *   2026.09.22.47 — Performance: single-pass cover index groups auto-collected covers by area & label in one scan (was O(areas × entities) rescans); auto-filter classes computed once per build instead of per entity; `getUniqueKeysFromObjects` uses a Set; `getTextSize` reuses one shared measuring canvas instead of allocating one per call. No behavior change.
 *   2026.09.22.46 — Per-area & per-entity image presets: new `area_presets` and `entity_presets` maps assign a cover-type preset (Window / Balcony Door / Curtain / etc., each carrying its own images) to every auto-collected cover in an area, or to specific cover entities. Precedence: card defaults → card YAML → cover-type preset → area preset → entity preset → inline entity config. Editor gets a 'Per-area & per-entity presets' section in Cover Images with area/entity pickers.
 *   2026.09.22.45 — Integrated window / balcony-door / outside-view / curtain images from pic-shutter-card (used with permission; Apache-2.0 base from hass-shutter-card) — 23 new bundled images. New cover-type presets: **Window**, **Balcony Door (Left/Right)**. Image fields now offer the bundled files as autocomplete suggestions. Added NOTICE + README credits.
 *   v1.45.0 — Rebranded **Enhanced Shutter Card → Flex Cover Card** (new card type `custom:flex-cover-card`, editor + build output renamed; legacy `custom:enhanced-shutter-card` still works). Repo cleanup: removed integration manifest, dev test, info/ and unused lit-debug/empty debug modules; Archive snapshots no longer tracked.
 *   v1.44.0 — partial-close % moved above the preset color options; color controls gain Transparent (and 'None' for borders); fixed Custom CSS not showing its text box; % value buttons can use a shared Button Style.
 *   v1.43.0 — control icons (up/stop/down/partial/tilt) get a color + custom mdi overrides; % preset icon-style gets an icon color; value-style % buttons get background/border/text color + weight/size. All colors via the four-mode control.
 *   v1.42.0 — inline area/group panels never collapse (only the cover members do); split Group panel settings into their own editor sub-group; collapse toggle label + show/hide count are configurable.
 *   v1.41.0 — Layout panel split into Cover panels / Area Selector panel groups; Area Selector + Group panel are now 'inline with cover panels' toggles (both off = group beside the menu); show-area-selector toggle now authoritative (legacy migrated); group name can follow the selected area; unified 'Area Selector panel' terminology.
 *   v1.40.0 — orientation (vertical/horizontal) decoupled from the area selector (now a show/hide toggle on either); new Group panel position 'Beside the menu' gives the image-1 layout (buttons+group row 1, covers row 2); editor: 'Card' divider, Appearance panel absorbs area-menu/group/name-cleaner, images panel renamed Cover Images.
 *   v1.39.0 — new Layout & Positioning panel consolidates all structural knobs (card/covers direction, wrapping, rows/columns, area button placement, buttons position, element order, group sticky); element-local positions stay with their feature.
 *   v1.38.0 — space-around-button-group padding (separates the control buttons from the image/other elements); split Header & Status battery and signal into their own sub-groups.
 *   v1.37.0 — up/stop/down buttons now have a user-adjustable padding (was a fixed ~6px built-in box); set to 0 to tighten.
 *   v1.36.0 — editor reorganized into Card Layout / Area Menu / Group Panel / Individual Panels sections; sub-group dividers added within Cover Elements & Appearance.
 *   v1.35.0 — button text/row wrap + fixed columns; cover panel per-side padding + covers-per-row grid.
 *   v1.34.0 — area buttons Above/Left, fixed; covers scroll independently (no wrap).
 *   v1.33.0 — area/cover stack direction + sticky group panel; strip room name from labels.
 *   v1.32.0 — fix divider/button-style application; full divider editor + button styles library editor.
 *   v1.31.0 — area buttons via shared Button Styles Library.
 *   v1.30.0 — editor chrome matches the Color card: header (name + version),
 *            per-panel icons, group separators.
 *   v1.29.0 — dividers between individual covers — full divider suite (style, color, thickness, length, gradient patterns, label/icon) ported from the EES/Color engine.
 *   v1.28.0 — area layout: separate Group control panel (name + hide) and collapsible covers row.
 *   v1.27.0 — padding: controls↔image gap and header↔image gap inside each cover.
 *   v1.26.0 — battery/signal placement: per-item row (top/bottom) and column (left/center/right); header row is now a 3-column grid.
 *   v1.25.0 — editor restructured: Entity Filters (+manual list), Header & Status, Cover Elements, Appearance, Scaling & Sizing, Controls Behavior, with grouped dividers.
 *   v1.24.0 — fix: preset value buttons show the entered % (was inverted); broaden battery/signal auto-discovery to match by name when device_class is missing.
 *   v1.23.0 — reorder the elements inside each cover (buttons / slider / shade image / tilt / presets) (#8).
 *   v1.22.0 — preset buttons can show percentage values instead of icons (#7); configurable preset percentages.
 *   v1.21.0 — header: same-line works top or bottom; new header alignment, order and item spacing.
 *   v1.20.0 — position % is plain text now (no highlight box) with color/weight/size options.
 *   v1.19.0 — editor: battery/signal source is a dropdown (Auto / Off / Custom entity).
 *   v1.18.0 — editor: all value options are sliders with a value readout.
 *   v1.17.0 — hide battery/signal icons (show_battery / show_signal).
 *   v1.16.0 — editor: dark color-scheme + styled dropdown options (readable) and control focus/hover.
 *   v1.15.0 — editor: expose show_group_members, images base path, and the
 *            "treat as closed below %" threshold.
 *   v1.14.0 — editor: unified accordion (opening a panel closes the others).
 *   v1.13.0 — editor: read-only YAML preview panel.
 *   v1.12.0 — editor: scaling is Off / Auto / Custom-factor (was on/off only).
 *   v1.11.0 — font styles (name size/weight/color, position size) + cover
 *            spacing; four-mode color control in the editor.
 *   v1.10.0 — editor: manual Covers list (add/reorder/remove with a cover picker).
 *   v1.9.0 — Entity name cleaner: strip configured words/substrings and
 *            optionally title-case auto-derived cover names.
 *   v1.8.0 — visual editor (getConfigElement): schema-driven, ltek design
 *            language; card-level options for layout, auto-generate, header,
 *            buttons/sliders, appearance, scaling and behavior.
 *   v1.7.1 — fix: area-selector layout CSS now applied on the card element
 *            (buttons column + All on row 1, covers horizontal on row 2);
 *            auto-gen skips HA cover group-helpers.
 *   v1.7.0 — auto-generate covers by area/label, group/area-wide set-position
 *            fan-out, and an optional area-selector layout.
 */

// // local copy of RELEASE 3.0.1 of Lit-element:
// https://www.jsdelivr.com/package/gh/lit/dist

const VERSION = C.CARD_VERSION;

import {LitElement, html, css, unsafeCSS } from './code/lit/lit-core.min.js';
import * as C from './code/constants.js';

import {
  EnhancedShutterCardNew,
  EnhancedShutter,
} from './code/classes.js';

import {
  setDebug,
  isRunningLocally,
} from'./code/functions.js';

const IS_LOCAL = isRunningLocally();
const DEBUG = VERSION.includes('b') && IS_LOCAL;

setDebug(DEBUG);

import * as HtmlBlocks from './code/htmlBlocks.js';
import {EscImages} from './code/escImages.js';
import {EnhancedShutterCardEditor} from './code/editor.js';



const define = (name, ctor) => { if (name && !customElements.get(name)) customElements.define(name, ctor); };

define(C.HA_CARD_NAME, EnhancedShutterCardNew);
define(C.HA_SHUTTER_NAME, EnhancedShutter);
define(C.HA_EDITOR_NAME, EnhancedShutterCardEditor);

// Back-compat: existing dashboards using the previous card types (`custom:flex-cover-card` and the
// original `custom:enhanced-shutter-card`) keep working. A custom element name can only map to one
// class, so each legacy tag gets its own thin subclass. Child element tags are likewise re-registered
// so a cached/half-rendered legacy card never emits an unknown element.
// TODO(migration): remove these legacy registrations once all dashboards have moved to
// `custom:easy-cover-styler-card`.
C.HA_CARD_NAME_LEGACIES.forEach((legacy) => define(legacy, class extends EnhancedShutterCardNew {}));
C.HA_SHUTTER_NAME_LEGACIES.forEach((legacy) => define(legacy, class extends EnhancedShutter {}));

window.customCards = window.customCards || [];
window.customCards.push({
  type: C.HA_CARD_NAME,
  name: C.CARD_DISPLAY_NAME,
  preview: true,
  description: "A flexible cover card for shutters, blinds, awnings, curtains, windows and doors",
  documentationURL: "https://github.com/Ltek/easy-cover-styler-card"
});

console.info(
  `%c ${C.CARD_DISPLAY_NAME.toUpperCase()} %c Version ${VERSION}`,
  'color: white; background: green; font-weight: 700',
  'color: black;background: white; font-weight: bold'
);


