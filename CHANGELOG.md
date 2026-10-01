# Changelog — Easy Cover Styler Card

Build numbers are `vYYYY.MM.DD.N`, where `N` is a monotonic counter that never
resets. Newest first.

---

## v2026.10.01.191

- **README credits reworded.** The card is no longer described as a "modernized fork": it began as a
  fork of hass-shutter-card and has since been rewritten. The credits now cover what still ships —
  the bundled artwork from hass-shutter-card and pic-shutter-card.
- **The published ZIP now holds only what the GitHub repo needs:** the built card and its images,
  `hacs.json`, README (and its image), CHANGELOG and LICENSE. Source, build config, tools and design
  docs are no longer included. No code changes.

## v2026.10.01.190

- **Fixed: the editor leaked library listeners.** `render()` registered four new "library changed"
  listeners (Button Styles, Slider Styles, Cover Styles, Frame Styles) on every render. The editor
  renders on every Home Assistant state update, so for as long as it was open the library sets grew
  by four per state change, and each listener kept an old copy of the editor in memory. Lit merges
  the resulting update requests into one render, so this did not freeze the page the way the Color
  and Entity cards did. It did grow memory without limit. Measured: 2,000 renders left 10,000
  listeners (the Frame Styles library has two scopes, so it counts double).
  - **Fix:** the editor creates one listener, reused on every render. It is removed when the editor
    leaves the page and added back when it returns, with one update if a library changed in between.
    After the same 2,000 renders: 5 listeners.
- **Fixed: a card removed from the page stayed registered with the libraries.** The card already
  subscribed only once, but never unsubscribed, so a removed card stayed in memory and was still
  rebuilt by every Cover Style update. It now unsubscribes on disconnect and resubscribes when it
  returns, catching up once if it missed a change.
- New `libRev.js`: one counter, bumped on every library update, so a card or editor can tell what it
  missed while away. Each library module gained an `off…Library(fn)` and a listener count.
- Checked and not a problem: there are no window or document listeners and no `setInterval`.
- Regression test: `/shared/user/code/_tests/cover-card-leak.test.mjs`, now part of the publish gate.
  It fails 6/6 against v189.

## v2026.09.30.189

- **README corrected:** Position Buttons (not the old Partial-close button); images are chosen in a
  Cover Style's Image Slider group (there is no Cover Images panel); "the header" is now Cover Name;
  image credits no longer mention the `psc-` filename prefix, dropped in v2026.09.24.140.
- **Editor hints corrected:** the Button Styles and Slider Styles libraries pointed at panels that no
  longer exist ("Group control → Area button style", "Cover Images → Modern style"). They now name
  Covers & Styles → Area Button Style, a Cover Style's Position Buttons, and a Cover Style's Color
  Slider group.

## v2026.09.30.188

- README: added the Collapse Toggle options (v186) to the feature list. No code changes.

## v2026.09.30.187

- **Individual Panels Scale** (Appearance → Individual Cover Panels): scales every individual cover
  panel by the same amount, so the set stays uniform however many covers there are. `covers_scale`,
  default 100%. The gaps between panels stay fixed.
- **Border** (Appearance → Card): **Theme** (your Home Assistant theme's card border and shadow),
  **None** (no border or shadow), or **Frame Style**. `card_border`, default Theme. The frame picker
  only appears for Frame Style. A card that already had a frame is set to Frame Style on load.
- **Frame → Frame Style**, with a note that frames come from the shared Frame Style library. Its
  "None" option is gone — choosing no frame is now Border → Theme or None.

## v2026.09.30.186

- **Collapse Toggle: Show Divider Line** (Layout → Collapse Toggle). Untick to hide the line above
  the toggle. `collapse_line`, default on.
- **Collapse Toggle: Space Above Toggle** slider. The gap between the area buttons / group panel and
  the toggle was a fixed 12px; it is now `collapse_gap` (0–60px, default 12).

## v2026.09.29.185

- **Documentation brought up to date:** README (four built-ins, per-row panels, alignment, scaling,
  card padding, live editing, library previews; retired Easy Presets / eleven-built-in text removed),
  Cover Style Library spec (built-ins, live drafts, reactive repaint, shared drawing), Layout Presets
  spec marked retired, and the cross-card design system (library list UI and live-editing rules).
- **Version date corrected.** Builds 178–184 kept the `2026.09.24` date although they were made on
  2026-09-28/29; from this build the date is the day of the build, as the versioning rule requires.
  No code changes.

## v2026.09.24.184

- **Built-in Slider Styles get the preview and the read-only view.** Each built-in (Neon, iOS,
  Glass, Minimal) now has the eye button (show/hide preview) and the pencil, which opens every
  setting read-only with only a Close button. v180 had meant to add the eye here but it landed on
  the Button Styles row instead — which is also why that eye did nothing until v183.

## v2026.09.24.183

- **Slider (and Button) Style changes now repaint the card immediately**, including the large card
  in the dashboard editor's preview pane while you edit. Root cause: the card's library callback
  bumped a counter that was not a reactive property, and the card's update filter ignores an update
  that names no changed property — so library changes never reached a card that was already drawn.
  `styleVersion` is now reactive.
- **Button Styles library:** the eye button now shows/hides a preview (a sample area button,
  normal and active) — it was wired to the Slider library's toggle and did nothing. User styles
  get the same preview.
- **Built-in Button Styles can be viewed:** the pencil opens every setting read-only (with a
  preview); only Close is offered. Duplicate to make an editable copy.
- The Button Style editor shows the same live preview at the top while editing.

## v2026.09.24.182

- **Area Buttons Scale** (Appearance → Area Buttons Panel): scales the area buttons panel at one
  rate, like Group Panel Scale. `area_buttons_scale`, default 100%.
- **Card Padding** (Appearance → Card Padding): one slider per side, `card_pad_top/right/bottom/left`.
  An unset side keeps the built-in 6px, so existing cards look the same.
- **Alignment for the Individual Cover Panels** (Layout → Cover Panels): Start, Center on Group
  Panel (the individual panels line up on the middle of the group panel beside them), or Center on
  Card (also centred within the card). `covers_align`.
- **Alignment for the Area Buttons panel** (Layout → Area Buttons Panel): Start, Center on Cover
  Panels, or Center on Card. `area_buttons_align`.

## v2026.09.24.181

- **The editor's card preview follows style edits live.** While a Cover Style or a Slider Style
  is open, its unsaved values are shown on the card in the dashboard editor's preview pane as you
  change them (debounced). Nothing is written until Save; Cancel, or closing the editor, reverts the
  card to the saved style. Editing a Slider Style updates every cover whose Cover Style links it.
- **"Refresh Editor Card" removed** from the Cover Style editor — it is no longer needed.
- A brand-new style (not saved yet) has nothing referencing it, so it only shows in the style's
  own small preview until it is saved and assigned.

## v2026.09.24.180

- **Every Slider Style can be previewed from the library list.** Each row — the four built-ins
  (Neon, iOS, Glass, Minimal) and your own styles — has an eye button that opens the same
  Open / Moving / Closed bars the style editor shows, at a compact size. One preview is open at a
  time. Built-ins previously had no way to see them without duplicating first.

## v2026.09.24.179

- **One drawing method for the live card and the editor preview.** Image covers (window, view,
  fabric, bottom bar) are now drawn by a single shared function (`src/code/coverArt.js`), so the
  preview and the card can no longer disagree. Sizes are percentages of the window rather than
  measured image sizes, so there is nothing to measure late — this fixes the curtain drawn at
  part height. Sideways covers stand the fabric and bottom bar upright natively instead of rotating
  the whole cover. Dragging, the Favorite-position marker and the overlays are unchanged.
  Venetian blinds that show tilt still use their own slat renderer.
- **Panels are chosen per row.** Each Area / Label / Cover row in *Covers & Styles* has a Panels
  dropdown: Group + Individual (default), Group only, or Individual only — so one card can show
  different panels on different area screens. Stored as `area_panels`. The card-wide Group Panel and
  Individual Panels checkboxes are removed (`show_all_control` / `show_individual_panels` are
  stripped from existing configs and not converted).
- **Area Buttons are on by default.** Switch them off with `show_area_selector: false`.

## v2026.09.24.178

- **A late-measured image now rebuilds the card, not just redraws it.** v177 redrew once a
  missed image arrived, but some sizes are only worked out when the card is built, so a
  curtain could appear at part height until something else (such as changing the style)
  rebuilt it. The card now rebuilds itself when that happens. At most one rebuild is
  queued at a time, and an image that fails to load never triggers one.

## v2026.09.24.177

- **Images with no measured size now fix themselves.** Slats are drawn from each image's
  measured size, and an image that was never measured draws at zero — no fabric, so a
  closed curtain looks open. If a panel asks for a size that isn't known yet, the card now
  measures that image on the spot and redraws once it arrives, whatever the reason it was
  missed. The browser console (debug level) logs "measuring late: <file>" when this
  happens, and a warning if the file cannot be loaded at all.

## v2026.09.24.176

- **Fixed: a cover could look fully open on the dashboard while the editor showed it
  closed.** Card setup can run twice at load — once before the Cover Style library has
  arrived, and again when it does. If the first run finished last, it replaced the image
  measurements with its own older set, which did not include images only a style uses
  (e.g. `slats/curtain-black.png`). Those measured as 0×0, so the curtain drew with no
  fabric. The editor was unaffected because its preview is built after the library has
  loaded. Now only the newest run applies its results.

## v2026.09.24.175

- **Removed the v166 button-hide upgrade step entirely.** Old settings are no longer
  converted; a state list without *Hide completely* ticked always means recolour.
- **Directional Controls regrouped.** The icon fields have their own **Icons** heading, and
  *Disable At Limits* moved under **Button Visibility** as "Disable Up / Down at the end of
  travel" — it greys out Up when fully open and Down when fully closed. It previously sat
  under the Button Spacing heading, which it has nothing to do with.

## v2026.09.24.174

- **Fixed: movement buttons disappearing instead of changing colour.** The v166 upgrade
  step that ticks *Hide completely* for button-state lists written before v166 ran on
  **every** load, not once. So a state list saved after v166 with Hide left unticked —
  which means "recolour" — was turned into a hide the next time it loaded, and the button
  vanished. It now only touches data from before v166, and never runs on saved Cover
  Styles. Picking states in the style editor also writes an explicit "not hidden" so a
  style is never ambiguous.
- Flags the old step already wrote are **not** undone automatically; untick *Hide
  completely* where you want recolour instead.

## v2026.09.24.173

- **Card Scale** (Appearance → Scaling). One slider, 50–200%, scales the whole card at one
  rate — every panel, button, text and the frame. Applied with CSS `zoom`, like Group
  Panel Scale, so the dashboard reflows around the card rather than the card overflowing
  its slot. The per-element scales still apply on top. Nothing is written at 100%.

## v2026.09.24.172

- **Last Changed readout** — when the cover last moved, as a clock time (`12:02 PM`)
  and/or time since (`3 h 12 m`), in the same formats as the Easy Entity Styler card. Its
  own **Last Changed** section mirrors Position Readout: the same nine placements (four
  sides, on the handle, and four beside it), alignment, size, weight, colour and a gap to
  the cover. Two Show / Hide toggles, **Last Changed Time** and **Last Changed Ago**,
  turn each part on. The group panel reports the most recent change among its members.
  It reuses the Position Readout's placement code rather than a copy of it.
- **Naming:** in Show / Hide, *Buttons* is now **Movement Buttons** and *Presets* is
  **Position Buttons**, matching their sections. The README uses "position buttons" too.

## v2026.09.24.171

- **Card Frame from the shared Frame Library** (Appearance → Card → Frame). The Color and
  Entity cards already share one frame library (`ltek_frame_library`); this card now links
  to it, so one frame can style the whole dashboard and editing it in either of those
  cards updates every card using it. Read-only here: frames are created and edited in the
  Color or Entity card. Three built-ins (Accent Outline, Soft Shadow, Neon Glow) keep the
  picker useful without them.
- Supports the full frame model — border per side and per corner, glow, drop shadow,
  background, and gradient edges. Card level only; dividers already separate the panels.
  An explicit Background setting still wins over a frame's own background, and a frame
  that has been deleted from the library shows as "Missing" rather than silently clearing.

## v2026.09.24.170

- **Card background colour** (Appearance → Card → Background), using the standard
  four-mode colour control plus Transparent: Theme card background (default) /
  Transparent / Theme colour / Custom colour / Custom CSS. It sets `--ha-card-background`
  as well as the background itself, so HA's own card chrome and any theme rule reading
  that variable stay consistent. Card-level, not a Cover Style key.

## v2026.09.24.169

- **Position Buttons have their own spacing:** Padding Between Buttons and Padding Top /
  Right / Bottom / Left, the same controls as Directional Controls. Both button groups
  share one container class, so since v166 the Directional Controls padding had also been
  applied to the position buttons; they now use their own values. Defaults keep the old
  look (4px between buttons, no padding).
- **Control Placement reorganised** into Movement Buttons, Position Buttons and Sliders,
  each with its Placement and Layout next to each other. "Preset" is now "Position".

## v2026.09.24.168

- **Fixed: Button Visibility states were saved to the card, not the style.** The
  multi-select control read and wrote the card config directly, so in the Cover Style
  editor your state picks went onto the card instead of the style being edited — the
  same bug class v115 fixed for images and checkboxes. It now writes to the draft.
- **Button Visibility is compact:** one block per button — label and state chips on the
  first line, then the colour control with **Hide completely** on the right.
- **Collapsible sub-section headings are uppercase** (e.g. DIRECTIONAL CONTROLS),
  matching the Color and Entity cards. Group subtitles inside a section stay mixed-case
  accent, which is what separates the two levels.

## v2026.09.24.167

- **Button Visibility colour now defaults to Theme → Disabled text**, shown through the
  normal Theme mode and theme dropdown. v166 put "Disabled text" in the mode dropdown's
  first slot, which read like a fourth mode rather than a theme colour. That first slot
  is now labelled "Default".

## v2026.09.24.166

- **Directional Controls spacing reworked.** *Button Padding*, *Space Around Buttons* and
  *Controls ↔ Cover Gap* overlapped and were hard to reason about. They are replaced by
  **Padding Between Buttons** plus **Padding Top / Right / Bottom / Left** around the
  button group. The side facing the cover is the old controls-to-cover gap. Existing
  values convert on load: the gap moves to the cover-facing side (worked out from the
  button position), the old margin goes on every side, and button padding above the old
  default becomes extra space between buttons. The default of 6px on the right matches
  the old default layout.
- **Button Visibility.** Each of Up / Down / Stop has its own row: the states it reacts
  in (same choices as before), a four-mode colour, and **Hide button completely**. By
  default a button in one of those states is now *recoloured* — to the theme's
  disabled-text colour unless you pick one — so it stays visible and usable. An existing
  non-empty list is given Hide on load, so buttons you had hidden stay hidden.
- **Full-spec Cover Styles.** New and duplicated styles now start with every setting
  given an explicit value. A **Fill in every setting** action in the style editor fills
  the gaps in an existing style from what it currently shows on this card (the card's
  YAML where a key is written there, else the default), so nothing visibly changes.

## v2026.09.24.165

- **Retired settings are removed from card YAML and from saved Cover Styles.** Sixteen
  keys whose code is gone (`opening_position`, `position_text_*`, `show_opening`,
  `header_order`, `header_gap`, `header_align`, `inline_header`, `position_background`,
  `opening_disabled`, `layout_preset`, `covers_direction`, `show_group_members`,
  `area_menu_style`, `area_orientation`) were verified unread by the renderer and are now
  stripped on load. They were harmless to rendering but still showed up in the YAML and
  inflated the style editor's "N settings defined" count.
- Stripping runs **after** every conversion, so the keys whose value still matters are
  carried forward first: `layout_preset` is baked in, and `header_align` left/right
  becomes `name_align` — for saved styles as well as card configs.
- Settings that are still valid are left alone, including style-owned ones that sit in
  card YAML from older cards.

## v2026.09.24.164

- **The unset option in Cover Style dropdowns now says where the value comes from.**
  v162 labelled it "Use card setting", but none of the 88 style keys has a field in the
  card editor — each is owned by the style alone — so the label pointed at a control that
  does not exist. It now reads **"Not set — default: Normal"**, or **"Not set — card YAML:
  Color Slider"** when the card's YAML still carries that key (older cards often do,
  from before the settings moved into styles).

## v2026.09.24.163

- **Separate padding for the Group Panel and the individual panels.** Both used to share
  one `.esc-cover-pad` wrapper, so the Cover Panel Padding sliders padded every panel,
  group included. The group panel now has its own **Group Panel Padding** (top / right /
  bottom / left), and the existing sliders are renamed **Individual Panel Padding**.
  **Padding Between Panel Sections** stays — it is the space *between* the group and the
  individual panels, not padding inside either.
- Existing cards keep their look: where individual padding was set and no group padding
  exists, it is copied onto the group panel once on load.

## v2026.09.24.162

- **Style dropdowns now show "Use card setting" when the style leaves a key unset.** An
  unset dropdown used to display the built-in default as if the style had chosen it —
  misleading, because at runtime an unset key comes from the card, not from that
  default. Picking "Use card setting" removes the key from the style. The three weight
  dropdowns lost their own blank "Default" entry, which this replaces.

## v2026.09.24.161

- **Fixed: the Cover Style preview ignored the card's own settings.** A style is sparse —
  anything it leaves unset falls through to the card. The live card does that; the
  preview skipped the card and went straight to the built-in defaults. So a style that
  leaves its slider look to the card (`slider: null`, no source) previewed as a bare
  default bar while the real card correctly used the card's `modern_style`. The preview
  now resolves every setting the same way the card does: style, then card, then default.

## v2026.09.24.160

- **Built-in Cover Styles are directly editable** (temporary authoring mode). Click a
  built-in to open it in the editor; saving stores it in the library under its own slug,
  which shadows the shipped definition. Each built-in row has an Export button so the
  final JSON can be baked back into the code. The v155 lock/unlock/reset scheme is gone.
  One flag, `BUILTINS_EDITABLE` in `editor.js`, controls this; once the built-ins are
  baked in it will be set to `false`, making them read-only and duplicate-only again.

## v2026.09.24.159

- **Group Panel Scale** (Appearance → Group Panel). One slider, 50–200%, scales every
  element in the group ("All") panel at the same rate. Applied with CSS `zoom` rather
  than `transform: scale()`: zoom changes the layout box, so the covers beside the panel
  reflow to make room, whereas a transform leaves the original footprint reserved and
  overlaps its neighbours. Card-level, not a Cover Style key. At 100% nothing is emitted,
  so existing configs are unchanged.

## v2026.09.24.158

- **Fixed: the Cover Style preview showed broken images.** The preview reads the draft
  RAW, while `resolveCoverStyle()` migrates image paths (v140) — so a style still
  holding pre-v140 flat filenames produced `<base>/esc-shutter-slat.png` and 404'd. The
  live card rendered fine, which is why this looked like a preview-only fault. The
  preview now migrates names the same way.
- **Up / Down / Stop hide-states and Disable At Limits moved** out of Behavior into
  **Directional Controls**, next to the buttons they actually hide.

## v2026.09.24.157

- **Fixed a v155 regression: the Shade built-in silently flipped a Color Slider card to
  images.** The pre-v155 `__cs_shade__` set only three keys and notably did *not* set
  `cover_visual`, so a card configured as `cover_visual: modern` kept its bars. The
  rewritten one set `cover_visual: 'image'` explicitly, and a style overrides card
  config — so selecting Shade as the default style turned a modern-bar card into image
  covers. Shade is now **visual-agnostic**: it does not set `cover_visual` at all and
  inherits whatever the card is. Its showcase is still a *colour* slat rather than an
  image file, which simply has no effect in Color Slider mode.
- Roller Shutter, Curtain and Color Slider still declare their visual type deliberately
  — images or a bar are the whole point of those three, and a style that names images
  would be meaningless on a card left in bar mode.

## v2026.09.24.156

- **Fixed: a group's "All" panel showed a different Cover Style than its covers.** The
  aggregate always resolved its style from `memberIds[0]` — correct for an area group,
  where the members share the area, but wrong for an explicitly listed group: the
  assignment sits on the **group entity** while its members carry none. So the All panel
  fell through to the card's own defaults (a roller shutter) while the covers below it
  correctly showed the assigned style. An entity-derived group now records the entity
  its style comes from, and the aggregate uses that; it still targets the members for
  control. Area groups are unaffected.

## v2026.09.24.155

- **Built-ins cut from 11 to 4, and they can now be unlocked.** The old set was
  generated from the legacy `ESC_PRESET` table, so most set only 3–8 keys and several
  were near duplicates — and because a built-in could not be overridden, a bad default
  in any of them was unfixable. The four survivors are deliberate examples:
  **Color Slider** (no images, handle-attached readout), **Roller Shutter** (the full
  image stack — frame, view, slats, bottom bar), **Curtain** (closes sideways, with a
  side-placed name and the readout opposite), and **Shade** (minimal, with a *colour*
  slat instead of an image file).
- **Unlock / Reset.** A built-in can be unlocked: a copy is saved to your library under
  the same slug and used instead of the shipped one. A library entry now takes
  precedence over a built-in of the same slug — the order used to be the reverse, which
  is why an override was silently ignored. Reset simply deletes that copy, falling back
  to the code definition, which stays the source of truth. Styles you created yourself
  are never touched by either action.
- **Retired slugs are remapped** on load, so existing assignments keep rendering:
  awning / blind / window-shutter / balcony-door-* → Roller Shutter, screen → Shade,
  compact → Color Slider. Where two retired slugs map to the same survivor their area
  lists merge rather than one overwriting the other.

## v2026.09.24.154

**Name and Position Readout alignment.** Each gains an Alignment control (a 3-way segmented control — the options are mutually exclusive) whose labels follow the side the item sits on: Left / Center / Right when placed top or bottom, Top / Middle / Bottom when placed left or right, hidden for handle-attached readouts. New keys `name_align` / `position_align` (`start | center | end`, default `center`), both Cover Style keys.

**'Center on Cover' is now 'Align to Cover', and actually aligns to the cover.** The v134/v153 version padded the header by the width of ONE column of movement buttons, so it was only right when that was all that sat beside the cover — with presets, the slider, tilt or a side-placed name/readout it was off-centre, and the top/bottom readout ignored it entirely (it centred on the whole row). Top/bottom Name and Readout now render inside the cover's own grid column: the middle row becomes a three-row grid and the cover's cell is a subgrid spanning all three, so Left/Center/Right are measured against the cover frame no matter what is beside it, and the buttons' row height is unchanged. Buttons on the right are reproduced by reversing DOM order (grid has no row-reverse). Applies only when the controls are beside the cover, as before.

**Dead code removed.** `htmlBlockState`, and the accessors / constants / defaults / CSS for `position_text_*`, `show_opening`, `opening_disabled`, `opening_position`, `header_order`, `header_gap`, `header_align`, `inline_header`, and `position_background` (which only styled the retired state block and had no editor control). `migrateConfig()` strips them from card config; `header_align: left/right` carries forward as `name_align: start/end`. Cover Style keys: 87 -> 88 (+name_align, +position_align, -position_background).

**Docs.** `docs/COVER_STYLE_LIBRARY_SPEC.md` rewritten to the current model (88 keys, single ownership, no entity ids in a style, linked sliders, precedence without the legacy preset layers).

**Tests now persist** in `/shared/user/code/_tests/` (load probe + DOM stub + `cover-card.test.mjs`) instead of being rewritten each session.

## v2026.09.24.154

- **Fixed: a Cover Style assigned to a group entity did nothing.** An expanded group
  renders its MEMBERS, not the group's own panel — but the style was applied to that
  unrendered panel, while each member resolved its own (absent) assignment. Members now
  inherit the group's style, with a member's own assignment still winning.
- **Fixed: the Color Slider preview ignored the slider's look.** It resolved
  `d.slider` only, but since v148 a style LINKS its slider (`slider: null`,
  `slider_source: '<slug>'`), so every linked style previewed as bare defaults — bar
  radius, gradient and glow all appeared to be ignored. It now falls back to the
  source ref, which `resolveModernStyle()` already accepts.
- **Fixed: the preview mis-tiled a rotated slat (awning).** `rotate_slat_image` turns
  the slat 90° on the real card; the preview ignored the flag, so the strip repeated
  along the wrong axis and looked mis-scaled. A rotated slat now tiles on the other
  axis.

## v2026.09.24.153

FIX the name always sat ~16px off the cover with no way to close it: the header row carried a baked-in 8px top AND bottom padding. Now 0, so the Name section's gap slider is the only thing that puts space there. FIX the view image STILL escaping the window frame — v150 sized the background to the frame, but the frame picture also carries max-width:100%, so in a narrow panel the picture shrinks while the background does not. The container itself is now sized to the frame, so the background cannot be larger than the box it paints into whatever the panel does. **'Align Over Cover, Not Card' is now 'Center on Cover (otherwise, Center on Panel)', defaults ON, and appears on BOTH Cover Name and Position Readout** — they share the key, so the two always centre the same way and stay aligned with each other.

## v2026.09.24.152

**Header retired; Name and Position Readout are now two symmetric sections.** The header row was rendering a SECOND position text beside the name, with its own size/weight/colour/order/gap keys — a duplicate of Position Readout, which is the richer system (9 placements including handle-attached). Position Readout is now the only way position is displayed, and the header's state block plus position_text_*, show_opening, header_order, header_gap and opening_position are gone. The header row carries the name alone, and **Cover Name** is its own section with Placement / Size / Weight / Color / Gap — gaining LEFT and RIGHT placement by reusing the readout's existing side buckets rather than a parallel implementation. Fixed a pre-existing bug in the header's size calculation while removing it: xyName measured openingPosition() and xyState measured namePosition(), i.e. the two were swapped. Cover Style keys drop from 93 to 87.

## v2026.09.24.151

**Readout <-> Cover Gap**, the twin of v150's Name <-> Cover Gap. Both are applied on the side FACING the cover, which is what makes ONE gap per item enough to control all three distances the panel needs: Name-to-cover, Readout-to-cover, and Name-to-Readout when they share a side (the outer item's gap separates it from the inner one, the inner one's gap separates it from the cover). The readout's gap folds into panelPosStyle() and picks the margin side from its placement, so it works for top/bottom/left/right; a handle-attached readout deliberately gets none, since it is absolutely positioned against the bar and a margin would do nothing.

## v2026.09.24.150

FIX **the view image spilled outside the window frame.** The outdoor view is the panel container's BACKGROUND, painted with cover-sizing, but that container grows to fit its contents while the frame picture inside is exactly --esc-window-width x --esc-window-height — so whenever the container was taller or wider than the frame, the view bled past its edges. It is now painted at exactly the frame's size, centred to match the frame picture, and no longer repeats. Naming, so the active visual is obvious: **Cover Visual -> Visual Type** with options **Image Slider** / **Color Slider**, and the matching sections renamed **Image Slider** and **Color Slider**; **Controls Look -> Directional Controls**; **Preset Buttons -> Position Buttons**; the **Position Value** toggle is **Position Readout**, matching its section. New **Name <-> Cover Gap** in Header, separate from the header block's own gap. Base Width/Height moved to the top of Image Slider; the two gap sliders moved into the sections they belong to, retiring the catch-all Sizing group. Position Buttons puts Button Type above Preset Percentages, and the Percentages box now states its default. Dropped the redundant Elements/More/Status row labels in Show / Hide.

## v2026.09.24.149

FIX **adding a Cover or Group to the list did nothing when the card also used Areas or Labels.** #defineGroups() was an if/else chain: any area short-circuited it and returned area groups only, so everything in `entities:` was silently dropped. The editor lists Areas, Labels, Covers and Groups in ONE combined list, which reads as 'all of these are shown', so the UI and the engine disagreed. The three sources now COMBINE — each explicitly listed cover or group becomes its own selectable group (one editor row, one thing on the card), named from its friendly name, and anything an area already pulled in is skipped rather than shown twice. A card with no areas or labels still produces the single implicit bucket it always did, so classic single-card layouts are unchanged.

## v2026.09.24.148

**Detach removed; library styles are ALWAYS linked.** v147's two-form model was over-built: detaching only existed to make an export portable, and the better fix is for the EXPORT to carry its dependencies — the reference then stays intact and the export still stands alone. The other case detaching appeared to solve, 'one style needs to look different', is better served by a second library entry, which stays reusable and discoverable where a hidden frozen copy does not. Removing it also removes everything it dragged along: the staleness/drift concept (a reference cannot be out of date), the read-only-while-linked awkwardness, the export warning about linked refs, the link/detach controls, and a second state on every style forever. The `__cs_modern_bar__` built-in now LINKS to the neon slider instead of carrying a snapshot of it. Stored styles that embedded a copy are converted to linked wherever a source was recorded, on library load as well as in migration; a copy with no source is left alone, since there is nothing to link it to. Export gained a `requires` block carrying referenced slider/button library entries, and import installs anything missing without ever overwriting an existing entry. CARD_DESIGN_SYSTEM.md replaced with 'always link', including why not to build embed-with-auto-sync and why not to offer detach.

## v2026.09.24.147

**Linked vs detached library styles**, the same way for sliders and buttons. Researching the sibling cards showed both use library REFERENCES and accept graceful degradation (the Color card's own comment: 'one profile powers many buttons and editing it updates them all'); this card's embedded slider was the outlier. A reference gives cross-style sync for free — no snapshot, no fingerprint, no three-way diff, no single-writer problem — all of which an embed-plus-auto-sync design would have needed, and without the snapshot auto-sync would silently destroy local edits. Both slots now take either form: LINKED resolves from the library every render, DETACHED holds frozen inline values that survive an export. resolveModernStyle() already accepted both, so existing embedded sliders keep working with NO migration; resolveButtonAppearance() gained the same inline branch. One shared control shows which form is active and offers 'Copy values in (detach)' / 'Re-link to library'. Drift is now only reported for a detached copy, since a linked style cannot be out of date. Export warns about linked references as well as non-bundled images — that silent degradation was the real gap. Detaching a button style captures the FLATTENED stack, so it stops following its parents; stated at the point of detaching. CARD_DESIGN_SYSTEM.md documents the whole pattern as required behaviour for every card using the libraries.

## v2026.09.24.146

FIX **Button Type = Icons ignored Preset Percentages.** It emitted a hardcoded 2x3 grid of all six shutter icons at fixed values (100/75/50/25/10/0) regardless of the style, so 'Icons' disagreed with 'Values', which honoured the list. Now one button per configured percentage: the icon is the nearest visual match from the six fixed closure steps, while the click and the label use the percentage actually configured — the icons can only approximate an arbitrary value, so the action follows the value rather than the picture. Panel sizing follows the real button count instead of the retired fixed grid.

## v2026.09.24.145

**Layout presets retired.** By the end they differed on only 6 card-level keys while writing 19 that Cover Styles own, so a preset was a second source of truth. More importantly they were a BASE LAYER beneath the config, which is what made 'unticking a checkbox does nothing' possible (deleting a key let the preset's value resurface — the Allow Collapsing bug); that whole class of bug is now structurally impossible, and the v127 special case guarding against it is gone along with LAYOUT_PRESETS, PRESET_TRACKED_KEYS, the preset picker and the revert indicator. An existing `layout_preset` is baked into the config once by migrateConfig() — your own values still win — and the key is dropped, so cards keep their look. **New Change Tracker in the Cover Style editor:** a collapsible panel listing every setting the style defines with its value, marking which changed in this session, offering per-key undo (back to how it was when you opened it) and per-key clear (stop defining it, so the card value applies again). No tracking machinery was needed — a style is sparse, so what it defines IS its key set. Fields the style defines get a leading marker rather than a colour change, so the accent colour keeps meaning 'group heading'.

## v2026.09.24.144

FIX **a style library could only ever notify ONE listener.** All three ensure*StyleLibrary() functions subscribed once and captured only the first caller's callback, so whichever of the card or the editor got there first won the subscription and the other was never told a style had changed. The editor usually won, which is why saving a style did not refresh the card in the editor's preview pane — it only picked the change up when the element was recreated. They now keep a listener set and notify every one; fixed for Cover, Button and Slider styles together since all three shared the flaw. The action is renamed **Refresh Editor Card** to make clear it rebuilds the editor's preview card, not the small style preview, and it also re-emits the card config as a fallback nudge. Preset Percentages now default to **25, 50, 75** when a Cover Style leaves them unset (was 100/75/50/25/10/0), noted in the field.

## v2026.09.24.143

FIX **a library Button Style silently wiped the individual Preset Button settings**. Those settings reach the CSS as --esc-pct-btn-* variables (used as defaults), while a library style is applied INLINE — and inline always wins, so picking a Button Style discarded every colour/weight/size you had set. The explicit values are now layered ON TOP of the library look, with the border override changing only the colour so the library's width and style survive. FIX the builder preview stretched the slat image to fill the covered area (object-fit:fill), which is why it looked out of scale; it now TILES at the image's natural aspect along the movement axis, matching how the real panel repeats slats. New **Apply to card preview** action in the style editor: saves the draft so the dashboard panel behind the editor re-renders with the style (the card subscribes to the library and rebuilds on change) without closing the editor — the small builder preview cannot show header placement, control layout, dividers or scaling, which all come from the card. Preset Buttons: 'Button Style' renamed **Button Type**, and **Preset Percentages** moved here out of Behavior.

## v2026.09.24.142

FIX the Cover Style builder preview was blank for every style after v140. The preview carried its OWN copy of the image-path rule, and that copy still had the pre-v140 bug — treating any value containing '/' as already absolute — so every foldered value (slats/…, frames/…) was emitted unprefixed and resolved against the dashboard url instead of the image folder. v140 fixed the shared helper in functions.js but not this duplicate. The preview now calls that one shared helper, so the rule cannot diverge again, and an audit confirmed no third copy exists. Media references are resolved asynchronously in the preview too, since a signed url cannot be built synchronously.

## v2026.09.24.141

**Media-folder image discovery.** Mirror the images/slats|bottoms|frames|views layout under your Home Assistant media folder and anything you drop there appears in the pickers automatically, with no card update. /local can be USED but never LISTED (directory indexing is off and no API exposes it), so discovery goes through the media source browse API, which is the only listable location. Stored values are a stable `media:<type>/<file>` reference, NOT the url: resolve_media returns a SIGNED, EXPIRING url, so storing one would work today and 404 later — the signed url is fetched fresh each time the card builds its image set, before dimensions are measured. Every failure path is soft: no media folder, no integration, older HA or a permissions problem all yield an empty list and the bundled images keep working. Each picker shows what it found (or how to add files) with a Rescan link, so a failure is visible rather than mysterious.

## v2026.09.24.140

**Images reorganised into per-type folders.** All 51 bundled images moved under `images/` into slats/ bottoms/ frames/ views/, and the esc-/psc- prefixes are gone (zero name collisions after stripping). A stored value is now '<type>/<file>.png' resolved against one image-map base, so the whole set can be relocated or mirrored elsewhere without touching a saved value. defImagePathOrColor() was fixed for this: its old rule treated ANY value containing '/' as absolute, which would have dropped the map prefix from every foldered value; it now only treats http(s):// , // and /-prefixed values as absolute. Stored values are migrated in both places that hold them — card configs and saved Cover Styles, which live in HA storage — and the migration is idempotent. The three solid-colour PNGs dropped in v136 map to the colour they actually were, sampled from the original pixels, so a config using one keeps its appearance with no file behind it. Unreferenced tilt.png removed. The image-path map lives in its own imagePaths.js because migrate.js already imports coverStyles.js and putting it in either would have created an import cycle (the failure mode there is a module-scope ReferenceError that renders the card blank and is invisible to a syntax check). NOTE: this changes the folder layout your HACS install needs — copy the images/ tree over.

## v2026.09.24.139

**12 new bundled cover images**, generated by recolouring the existing assets so they match the originals rather than looking pasted in: window frames in mid grey and black (plain and with roller box), roller shutter slats in mid grey / dark grey / black with matching bottom bars, and curtains in grey and black. Recolouring happens in LUMINANCE space (tools/recolour.py), so every fold, highlight and bevel from the source survives and the alpha channel is copied through untouched — verified pixel-for-pixel. NOTE: new images need the PNGs in your HACS folder, not just the JS.

## v2026.09.24.138

Two more legacy keys deleted. **show_group_members** was an all-or-nothing card-level switch superseded by the per-group `group_expand` map in v118; group expansion is now per-group only. **covers_direction** had no editor control at all and silently outranked the Orientation selector — it is what made Orientation look broken before v126 — so Orientation is now unconditionally authoritative for the covers flow. Both keys, their defaults and their accessors are gone.

## v2026.09.24.137

**Legacy cleanup pass.** The migration chain moved out of the editor into a new src/code/migrate.js and is now run by the CARD on load as well. That was the blocker: migration only happened when someone opened a card for editing, so an untouched card depended on the legacy read path forever. With the card migrating on load, that read path is gone — #areaPresetFor / #entityPresetFor / #areaOrientationFor are deleted and Cover Styles are the only source of per-cover overrides. A legacy entry that sets MORE than a cover type still cannot be expressed as a built-in style, so it is left in place and reported with a console warning naming the areas involved, rather than being dropped silently. Also deleted: CONFIG_AREA_MENU_STYLE / AREA_MENU_STYLES / AREA_MENU_STYLE_KEYS (dead since the v125 dropdown removal) and CONFIG_AREA_ORIENTATION (only the deleted read path used it).

## v2026.09.24.136

**Slat / View image pickers gain a real colour control.** Removed the three baked solid-colour PNGs (psc-purple / psc-liteblue / psc-litegreen) and the fixed '#00000080' Shade tint: a flat colour needs no image file, and three PNGs could never cover the colours people actually want. The picker now offers **Custom colour…** backed by the design system's four-mode control (theme colour / colour picker / transparent / custom CSS), alongside a separate Custom image / path option. Offered only for the Slat and View slots, which the renderer paints when the value is not a filename; Window and Bottom-Bar are drawn from an image source only, so they no longer pretend to accept a colour.

## v2026.09.24.135

'Align Over Cover, Not Card' actually works now. The v132/v134 approach was built on a wrong model: it gave the header the cover's width and pushed it with an auto margin. That cannot work, because .esc-shutter (the panel root) is a plain BLOCK that is wider than its content, and .esc-shutter-middle CENTRES the [buttons][cover] row inside it — so there is no edge for an auto margin to snap to. Traced end to end instead: the style resolves, the flag reaches the config and the class is applied correctly (all verified), so the fault was purely the CSS. The header is full width with justify-content, so padding the BUTTON side by the full button-column width (icon box + controls gap + button margins) moves the header's centre by exactly half that — landing it on the cover's centre for buttons on either side.

## v2026.09.24.134

FIX 'Align Over Cover, Not Card' did nothing. The guard was inverted: buttonGroupInRow() is TRUE when the control buttons sit LEFT or RIGHT of the cover — which is precisely when the cover is inset and the header needs the offset — but v132 only applied the class when it was false. It now also resolves the buttons side via getButtonsPosition() (buttonsPosition() can still read 'auto'), and the CSS carries a max-width so flex-grow cannot stretch the header past the cover width.

## v2026.09.24.133

**Cover Style export / import.** Per-style export, Export all, and Import in the Cover Styles library, using the design system's shared JSON modal ported from the Color card: a native <dialog> + showModal() so it renders in the browser's top layer ABOVE HA's editor dialog, with transfer through a visible textarea because the async clipboard rejects with 'Document is not focused' inside that dialog. Envelope is { kind, v: 1, styles } — the version stamp lets a later key rename migrate rather than silently drop settings, and a newer-than-known v asks before importing. Import never overwrites or shadows: a colliding id (including a built-in) is imported under a fresh slug and the renames are reported. Exports warn when a style points at image files outside the bundled set, since those will not resolve on another install. Built-ins are never exported — they ship with the card.

## v2026.09.24.132

**Fixes the intermittent wrong-size cover images.** cardInitialize() replaced this.escImages with a fresh instance and only measured the images one await later, while #defAllShutterConfig() had already republished shutterCfgs synchronously. Any render landing in that window read xyPair(0,0) for every image dimension, and the slat geometry derives from those numbers — so a CLOSED roller shutter drew no slat and looked open, and a screen slat came out half width. Intermittent because it depended purely on render timing. The new image set is now measured before it is published, and a library-triggered rebuild gates the render again (v124 had deliberately left it renderable to avoid a flash — that was what exposed the window). **Editor preview no longer loses your place:** the dashboard editor rebuilds its preview element on every config change, dropping the selected area, so the last pick is remembered per card shape in module scope (transient UI state, never written to config). **New Cover Style option 'Align Over Cover, Not Card'** for the header: constrains the header box to the cover's width and pushes it to the cover's side, so the name/position centres over the cover image rather than the whole panel. No-op when the buttons sit in a row, since the cover already spans the width.

## v2026.09.24.131

**Exclude Hidden Entities now defaults ON** (untick to write `exclude_hidden: false` and pull hidden covers back in). **Legacy boolean-string coercion:** dropdowns written before v127 stored the STRING 'true'/'false', and `!!'false'` is TRUTHY — so a card carrying e.g. `area_buttons_row: 'false'` behaved as if the setting were ON. Any key whose default is a boolean now coerces those strings back to real booleans on read, so old configs fix themselves without re-picking anything. 'Remove Words / Substrings' hides its chip list and input when unchecked.

## v2026.09.24.130

New **Exclude Hidden Entities** filter (`auto_filter.exclude_hidden`): skips covers hidden in HA's entity settings, reading `hidden_by` on the registry entry and `hidden_entity` on the state attributes. **Opt-in**, so upgrading never silently drops a cover an existing card already shows. Applies to Area/Label auto-discovery only — an explicitly listed cover is always honoured. Disabled entities needed no flag: they have no state object, so the existing state guard already skipped them. checkRow items can now address a sub-key of an object-valued config key. Removed the top 'Card' section divider, redundant now that the panels are consolidated.

## v2026.09.24.129

Editor row conformance with the shared design system. Field labels are now CONTENT width so every control sits directly beside its label; the old fixed 190px label column stranded short labels far from their inputs (the Color card's .cpce-row was the reference). Slider value readouts can no longer wrap to a second line — the shared control group's flex-wrap was pushing the readout down once a <select> joined it, now scoped via a nowrap modifier so colour rows keep wrapping; readouts are bold/tabular per spec. All 12 delete glyphs replaced with mdi:trash-can-outline icon buttons (red on hover) matching the other cards. Entity Name Cleaner: 'Remove Room Name' is now 'Remove Area from Name', Capitalize is always available, and the 'Remove Words / Substrings' label carries the Clean Up Names checkbox so one row serves both purposes. Dropped the redundant 'Collapsing' row label.

## v2026.09.24.128

**Per-cover TDBU top-rail entities.** The single card-level 'Top-Rail Entity' field could only ever name ONE entity, so a card showing several top-down/bottom-up covers was unservable. New card key `tdbu_top_entities` maps each cover to its own top-rail entity. Controls Behavior now lists every cover on the card whose Cover Style has Travel = top-down/bottom-up, each with its own field, plus an **Auto-detect** button that finds sibling `_top` / `_upper` entities. When no TDBU cover exists the section explains how to enable one instead of showing a dead field. Division of ownership holds: the Cover Style says a cover IS tdbu, the card says WHICH entity drives its top rail — entity ids never travel inside a shared style. The legacy single `modern_second_entity` key is still honoured as a fallback for one-cover cards.

## v2026.09.24.127

THREE real bug fixes. (1) Boolean-backed dropdowns wrote the STRING 'true'/'false' instead of a boolean, so the new **Area Buttons Orientation** selector never took effect (the coercion was another v107 rollback casualty). (2) **Any checkbox whose off-value equalled the built-in default could not be turned off while a Starter Preset enabled it** — _set() drops default-valued keys to keep the YAML clean, but the preset is a BASE, so dropping the key let the preset's value resurface. 'Allow Collapsing' was the reported case; the fix now keeps the key written explicitly whenever removing it would not resolve back to the chosen value. (3) Rotated tiles in the Cover Style preview overlapped their neighbours because rotate() does not change an element's layout box; the preview now reserves the swapped footprint, matching sizeRotationWrapper() on the real card. Editor: dedicated **Appearance** panel (Card Title, Group Panel, Scaling, Entity Name Cleaner) split back out of Layout.

## v2026.09.24.126

Re-applies three fixes silently lost in the v107 rollback to the v100 baseline: (1) the covers flow direction follows the **Orientation** selector again (`covers_direction` had reverted to defaulting to 'row', so Orientation did nothing); (2) the horizontal area-buttons CSS applies in **every** placement, not only the top bar, so Orientation works for inline and left menus too; (3) divider side checkboxes read **Left / Right / Top / Bottom** instead of L/R/T/B. Editor: divider + 'Cover Entities' subtitle added to Covers & Styles; Dividers renamed **Dividers & Spacing**.

## v2026.09.24.125

Editor consolidation: **Appearance** and **Scaling & Sizing** merged into **Layout & Appearance**; panel padding moved into the renamed **Dividers** panel; **Area Button Style** moved to the top of Covers & Styles. Relabels: 'Covers wrapping' and 'Button rows' are both now 'Row/Column Alignment'; 'Area Selector Panel' is 'Area Buttons Panel'; the Horizontal Bar checkbox became an **Orientation** dropdown (Vertical/Horizontal); dropped the redundant 'Menu Options', 'Divider Sides' and 'Placement' labels. Removed the **Area Menu Style** dropdown — it was a bundle that silently also changed the collapsible setting, and the explicit Inline + Orientation controls now cover every case. Vertical area-button menus with text-wrap off now widen to fit the longest label instead of clipping at a fixed width. Editor is down to four panels.

## v2026.09.24.124

FIX: a card whose Cover Style came from the **library** (rather than a built-in) rendered unstyled on the live dashboard while looking correct in the editor preview. Cover Styles are resolved when the per-cover configs are BUILT, but the library arrives asynchronously after that first build, and the library callback only re-rendered — so the unstyled config stuck. The Cover Style library now rebuilds the configs when it lands or changes (built-in styles were unaffected because they live in code and resolve synchronously).

## v2026.09.24.123

Cover Styles now own **everything inside a cover panel** (91 keys): the Styling and Element Layout & Style panels are gone, Controls Behavior is reduced to the one entity-id field, and Sizing keeps only card-level items (scaling, panel padding, group gap). Absorbed: images, control/info placement, control icon colour + custom mdi overrides, button padding, preset-button styling, position-readout styling, in-panel spacing, panel rotation, travel model, inversion, position presets, favorite position, limits, tilt angles and per-state button hiding. Verified **single ownership** — no key is editable in both the style and the card. Entity ids (battery/signal source, TDBU top rail) deliberately stay card-level so a shared style never carries another system's entities. Style editor groups: Visual, Slider/Images, Show-Hide, Header, Control Placement, Controls Look, Preset Buttons, Position Readout, Behavior, Sizing.

## v2026.09.24.122

Cover Styles absorb the **Header** and the **per-element show/hide** eyes, per the rule that everything inside a single cover panel belongs to the style (structure between panels stays in Panel Layout). The card's Header panel is gone; battery/signal **sources stay card-level** because entity ids must never travel inside a shared style. The style editor is now organised into collapsible groups (Visual · Slider/Images · Show-Hide · Header · Control Placement · Sizing) with the live preview pinned above, and a new **Adopt this card's settings** action folds a card's own panel-level visual settings into a new Cover Style and assigns it as the card default — explicit rather than automatic, since it writes to the shared library.

## v2026.09.24.121

Cover Styles list now labels the style id ("id: cellular") instead of showing a bare slug, with a tooltip noting that the id stays fixed when you rename a style so existing assignments keep working.

## v2026.09.24.120

**Legacy preset migration**: opening a card in the editor now converts the old cover-type presets to Cover Style assignments — card-level `shutter_preset` becomes `cover_style_default`, `area_presets` becomes `cover_styles` (style -> areas) and `entity_presets` becomes `cover_styles_entities`, with the migrated keys dropped. Only entries whose sole key is `shutter_preset` convert (they map 1:1 onto a built-in style); anything that also sets images/positions, or names an unknown type, is left untouched and keeps working through the legacy read path, which is deliberately still in place until the migration is proven. The migration is idempotent. Also: built-in Cover Styles are now previewable — click a built-in (or its eye button) to see the live Open/50%/Closed preview plus the values it sets, read-only, with 'Duplicate to edit'.

## v2026.09.24.119

**Cover Style builder preview**: the Cover Styles editor now shows a live Open / 50% / Closed preview of the style you're editing. Classic styles stack the real image slots (view behind, slat covering the closed fraction, bottom bar at the edge, window frame on top) and honour the closing direction (down/up/left/right); modern styles draw the embedded bar with its fill/track/handle/glow. Panel rotation is applied to the preview too, so a rotated style looks right before you assign it.

## v2026.09.24.118

Covers & Styles polish: the scope dropdown (Area/Label/Cover/Group) now sits ON the search row; **Default Cover Style** moved directly under the search box; **Expand cover groups** is now a per-group checkbox on that group's own row (new `group_expand` map overriding the card-level flag); removed the legacy 'Per-Area & Per-Entity Presets' group and the per-area rotation map from the editor (both still read from YAML for back-compat). FIX: the v107 rollback to the v100 baseline had silently reverted the themed appearance defaults, so covers rendered with unstyled white arrows/large white text — restored name/position text colour+size, control icon colour, preset-button colour/border/size, panel position colour and controls gap.

## v2026.09.24.117

Merged **Entity Filters** and **Cover Style assignment** into one **Covers & Styles** section. A single search box plus a scope dropdown (Area | Label | Cover | Group) decides what you're searching and where the pick lands (areas / labels / entities); each row in the list below then carries its own **Cover Style**, defaulting to Default (which writes nothing, so YAML stays clean). Re-assigning a row moves it between styles instead of duplicating, and removing a row also clears its style assignment. Cover Styles can now be assigned to **Labels** as well as Areas (resolution matches entity labels by id or name). Device-class filters and 'expand cover groups' stay in the same section under Filters.

## v2026.09.24.116

Cover Style Library **Phase 4**: assignment UI under Appearance -> Cover Styles. **By Area** shows one card per assigned style with its areas as removable chips plus a search picker to add more; **By Cover** overrides an individual cover; **Default Cover Style** covers anything unassigned (None = keep card settings). Empty rows are pruned so nothing unused is written to YAML. The legacy per-area/per-entity preset group is now labelled (legacy).

## v2026.09.24.115

Cover Style Library **Phase 3**: new **Cover Styles** library panel (under Libraries) to create / edit / duplicate / delete styles. Built-ins are read-only and duplicable (that's how you make e.g. "Cellular" from "Shade"). The editor covers visual + rotation + closing direction, images (classic) or the adopted slider look (modern), control placement and sizing. Slider values are read-only inside a Cover Style with a **From <name> - up to date / source has changed** indicator plus **Update from Slider Style** (one-way: edit in the Slider library, then re-adopt). Also fixed a latent bug: the image-select and check-row renderers wrote straight to the card config, so they now honour get/set overrides and can safely target a draft object.

## v2026.09.24.114

Cover Style Library **Phase 2** (card-side resolution). New config keys: `cover_styles` ({ styleRef: [areas] }), `cover_styles_entities` ({ entity: styleRef }) and `cover_style_default`. A cover resolves its style as default -> area assignment -> entity assignment (later wins), and the style's per-cover keys are applied UNDER the legacy area_presets/entity_presets and under the inline `entities:` config, so existing configs render unchanged. The group/"All" panel inherits its area's style. The card now subscribes to the Cover Style library so edits propagate live. **Opt-in:** with no cover_styles* keys set, nothing is applied and behaviour is identical to v113. Assignment UI comes in Phase 4.

## v2026.09.24.113

Cover Style Library **Phase 1** (data model + store, no UI yet): new src/code/coverStyles.js defines a Cover Style as a named bundle of PER-COVER settings (images, control/info placement, panel rotation, sizing) so one card can mix roller shades, cellular shades and curtains under one shared theme. Built-in read-only styles are seeded from the existing cover-type presets (Awning, Curtain, Roller Shutter, Shade, Screen, Blind, Window Shutter, Balcony Door L/R, Compact) plus a Modern Bar (Default). A style EMBEDS its slider settings (recording slider_source for provenance) instead of referencing them — self-contained, and it removes the v66 class of bug where a lib: ref resolved to defaults; the embedded block is emitted as an inline modern_style object so the renderer needed no changes. Drift vs the source is detected by diff (no fingerprint field). Unit + integration tested; assignment UI comes in Phase 2. See docs/COVER_STYLE_LIBRARY_SPEC.md.

## v2026.09.24.112

ONE search picker for every Entity Filters field. Areas, Labels, Only/Exclude Device Classes and Covers all now use the same control, modelled on the Color card's _renderEntitySearchPicker: a filter input whose list stays collapsed until focused/typed, clickable rows showing name + id (+ device-class tag), and the chosen items listed below with remove (and reorder for Covers). Replaces the old chip inputs and the free-text datalist box.

## v2026.09.24.111

Entity Filters: the Covers list is now a **searchable add-picker** matching the Color card's Default Entities control — a search box + device-class filter, a scrollable list of matching covers (friendly name + entity id + device-class tag) each with a **+** to add, and the chosen covers listed below with reorder/remove. Replaces the free-text + datalist box.

## v2026.09.24.110

Editor layout fixes to match the design reference: boolean rows are now **checkbox-then-label** (no label column) like the Color/EES cards; inputs and dropdowns now fill the remaining row width and may shrink, so they no longer overflow the panel border; added box-sizing/min-width containment inside panels.

## v2026.09.24.109

Visual editor layout pass: controls (dropdowns, text, sliders) now sit directly NEXT TO their label in a consistent label column instead of being right-justified across the panel. Grouped every remaining related boolean cluster into compact multi-option checkbox rows: Invert (Percentage / Open-Close / Tilt %, each UI+Device), Collapsing, Area Menu Options, Group Options, Image Options, and the header Position Value options.

## v2026.09.24.108

**Starter Presets** replace locked presets. Nothing is locked and the Customize switch is gone: picking a preset writes its layout values straight into the config, and every setting stays editable. Any setting changed away from the active preset now shows an **mdi:backspace** button that reverts just that setting back to the preset value (with a confirmation). Removed the locking machinery (customize flag, locked-key overlay, read-only field plumbing) — what's in the YAML is what renders.

## v2026.09.24.107

RESET to the v100 baseline (v101-v106 reverted). Replaced the layout presets with four numbered presets (Preset 1-4) captured from the reference dashboard views in view.yaml: 1=shades, 2=shades-mod (inline menu), 3=shades2 (menu column), 4=shades3 (horizontal button bar). Presets carry LAYOUT only - not colors/styles, and not the Cover Visual (image vs modern bar), which stays a user choice. New cards no longer get a preset forced on them (that produced duplicate 'All' panels on an entities-only stub). Carried forward one genuine fix: setConfig now rebuilds cardCfg so editor changes (Orientation, placements) apply without a page reload.

## v2026.09.24.100

Conformance pass cont.: audited every editor renderer against the design system — token block byte-identical, sliders use the tabular readout token, four-mode color control complete, add buttons dashed-accent, sub-panels boxed with accent border. Minor fixes: 'Add cover/stop' → '+ Cover/+ Stop' per the +Label convention. No Lovelace text. Editor now matches the Color/EES cards.

## v2026.09.24.99

Editor conformance pass to the shared card design system: boolean toggles now use native accent-colored checkboxes (matching the Color Light & Scene Manager card) instead of ha-switch; chevron color aligned (secondary-text idle, accent when open). Token block confirmed byte-identical to the Color card.

## v2026.09.24.98

Editor fixes: removed the duplicate 'Show group control' from Appearance (it lives in Layout); checkbox rows now put the box before the label with cleaner styling; corrected show/hide gating — Group Panel options follow the Group Panel checkbox, Collapse Toggle follows Individual Panels, Area Selector Panel subtitle/options follow Area Buttons.

## v2026.09.24.97

Easy Presets polish: Cover Visual is no longer preset-owned (always user-choosable); the four Show toggles are now one compact checkbox row (Group Panel always available); added a how-to note for Preset + Customize; converted the Entity Name Cleaner switches to a checkbox row too.

## v2026.09.24.96

Easy Presets refactor Build 4: new cards default to the classic_vertical preset in Easy Mode; editor migrates legacy show_cover_dividers to the per-side model (ind_divider_left) and drops the legacy key; README documents Easy Presets / Customize / quick toggles. Completes the Easy Presets refactor.

## v2026.09.24.95

Easy Presets refactor Build 3: editor now persists layout_preset + adds the Customize checkbox; the preset dropdown seeds the quick toggles and clears bucket-A overrides; preset-owned layout fields show a lock badge and are read-only unless Customize is on. Shared resolveLayoutConfig used by both runtime and editor. Removed the old apply-keys 'Custom' behaviour.

## v2026.09.24.94

Easy Presets refactor Build 2: new quick toggles **Show Individual Panels** (hide individuals → group-only) and **Show Dividers** (master gate over the per-side matrix). Legacy `show_cover_dividers: true` now maps to ind_divider_left so pre-split configs show dividers again.

## v2026.09.24.93

Easy Presets refactor Build 1: added the layout_preset + customize state model and a runtime preset overlay in cardCfg (bucket-A layout keys resolve from the active preset; locked in Easy Mode, seeded when customize on). No preset selected = unchanged behaviour. Flipped area_button_wrap default to true. Editor UI/lock come in later builds. See docs/LAYOUT_PRESETS_SPEC.md.

## v2026.09.24.92

New option **Rotate Buttons With Panels** (Area Selector Panel): when the view is rotated left/right, the area button menu is physically rotated to match the covers instead of re-flowing to an upright horizontal row (the previous, still-default behaviour). Shared rotation-sizing util now drives both the cover panels and the area button bar.

## v2026.09.24.91

Individual panels now have the same per-side dividers as the group panel (Left/Right/Top/Bottom), and both are set via a compact single-row checkbox matrix (Group row + Individual row) instead of switches — far denser. Each ticked side draws a divider on that edge of the panel(s). Retired the old single 'between panels' toggle.

## v2026.09.24.90

Split divider placement: **show_cover_dividers** now means "between individual panels" only, and the group/aggregate panel gets its own per-side dividers (Group Divider — Left/Right/Top/Bottom). Lets you draw a single divider between the group and the whole set of individuals (Group→Right in a row) without a line between every panel. All dividers still share one style. Editor: Cover Dividers panel gains a Placement group.

## v2026.09.24.89

Added a **Modern Area Bar (Horizontal)** layout preset (horizontal modern bars + wrapping area top bar + inline group + gradient dividers). Reproduces the arrangement only (no colors/library styles).

## v2026.09.24.88

Layout presets reworked per feedback: the Layout Preset dropdown is now 4 focused core arrangements (Classic Vertical, Compact Row, Compact Row — Rotated Left/Right) that only touch orientation/rotation/positions. Area buttons and group panel are now independent **Show Area Buttons** / **Show Group Panel** checkboxes, plus an **Area Menu Style** dropdown (Inline / Column + Collapsible / Top Bar — Horizontal). New horizontal area-button bar option. Removed the redundant Area Grid / Sidebar Menu / standalone Rotated presets.

## v2026.09.24.87

New **Layout Preset** selector at the top of Panel Layout — one click applies a common placement/orientation bundle (Classic Vertical, Compact Row, Rotated Left/Right, Area Grid, Sidebar Menu), then you can fine-tune. Only layout keys change (colors/images/entities untouched); the dropdown shows the active preset or "Custom" once tweaked.

## v2026.09.24.86

Area button panel now matches a rotated view: when the selected area's Panel Rotation is left/right, the area buttons re-flow to a horizontal, upright, wrapping row (text NOT rotated) so the layout stays coherent with the rotated covers. The group/aggregate panel now also inherits the per-area rotation.

## v2026.09.24.85

Panel Rotation reworked (Option A): rotation now happens INSIDE each panel and the panel's own box is sized (via JS measurement) to the rotated content's swapped footprint, so sibling covers/containers reserve correct space — fixes the overlap from v84's whole-element wrapper. Still visual-only (drag-to-set-position under rotation not yet remapped).

## v2026.09.24.84

BREAKING: removed the legacy `custom:flex-cover-card` / `custom:enhanced-shutter-card` card-type aliases, their child-tag aliases, and the editor's auto-migration — `custom:easy-cover-styler-card` is now the only supported type; update any dashboard YAML still on the old types. **Design Mode** moved out of any expandable panel entirely — it now sits right under the editor header, always visible. New **Panel Rotation** (Panel Layout → normal/left/right) rotates each cover's image/bar and all its controls & info as one unit; overridable per Area (Appearance → Per-Area & Per-Entity Presets → Panel Rotation By Area) so a whole screen/view can share one rotation. First pass is visual-only (CSS `writing-mode` rotate, no JS measurement) — drag-to-set-position under left/right rotation is not yet remapped (follow-up).

## v2026.09.24.83

Rebranded **Flex Cover Card → Easy Cover Styler Card** (new card type `custom:easy-cover-styler-card`, element `easy-cover-styler`, editor renamed, display name + docs updated). Migration: the previous `custom:flex-cover-card` and original `custom:enhanced-shutter-card` types keep working via built-in aliases; the visual editor migrates a saved `type:` to the new one. Moved **Design Mode** under the Appearance → Card divider with a short description.

## v2026.09.24.82

Consolidated all Collapse Toggle settings into one group under Panel Layout

## v2026.09.24.81

Renamed 'partial' → Favorite Position (default icon mdi:star-circle); standard buttons → Movement Control Buttons; merged Disable End Buttons into that group

## v2026.09.24.80

Consolidated control settings — visuals in Element Layout & Style, movement/limits/presets in Controls Behavior; removed Cover Elements panel; Title Case throughout

## v2026.09.24.79

Editor formatting: panel titles and subtitle dividers now use Title Case (Cover Panels, Area Selector Panel, Group Panel/Control, Auto-Generate, Position Presets, Tilt Angles, Per-Area & Per-Entity Presets, etc.).

## v2026.09.24.78

The individual-covers collapse toggle icon is now customisable — set a custom mdi, size and colour (Appearance → Collapse Toggle); blank keeps the chevron.

## v2026.09.24.77

Editor: removed the icon from the editor title; renamed 'Passive mode' to **Design Mode** ('Disables control commands during card design') and moved it to the top of Panel Layout; renamed 'Cover Images' -> **Styling** and 'Spacing' -> 'Padding Between Panel Sections'. Fixed: the group↔covers gap ('Add Padding, Group ↔ Individual Panels') now only spaces the group/area panel from the first cover instead of every cover.

## v2026.09.24.76

Controls & Info polish: compact subpanel rows (single 40px line, like the Color card); fixed the duplicate show/hide eye on each subpanel; removed the Controls/Info sub-dividers. New option: when the Position Value is on the handle, the Open/Closed end-state text can move to the centre / above / below the bar while the numeric % stays on the handle.

## v2026.09.24.75

Editor: renamed 'Controls & Info Positions' -> **Controls & Info**, and each element (Up/Stop/Down, slider, tilt, presets, name, Position Value, battery, signal) is now its own **expandable subpanel** (Color-card Buttons style) — collapsed row shows the eye show/hide + a chevron; expanding reveals that element's placement and options.

## v2026.09.24.74

Position Value split into two independent readouts to remove the header/panel conflict: a **Header** Position Value (show in header + row + size/weight/colour/box, under Header) and a **Panel** Position Value (its own show eye + placement around the image/on-handle + size/weight/colour, under Controls & Info). Both can be shown at once or independently; legacy placement configs migrate to the panel readout.

## v2026.09.24.73

Modern bar fixes: the handle no longer straddles the bar edge (clamped fully inside), so the on-handle % is no longer clipped; the bar stops clipping when the readout is on the handle; and the on-handle % now follows the configured Status colour instead of always white.

## v2026.09.22.72

Positions panel polish: removed 'Info —' from subtitles; the show/hide eye now sits on the far right of each row; the panel now lives under the 'Individual Panels' divider; moved the header-row layout options back into the Header panel (renamed 'Header & Status' -> 'Header'); on/at-handle position readout now works on the Classic visual too (tracks the slat edge), so the '(modern)' notes were dropped.

## v2026.09.22.71

Editor reorg: new top-level **Controls & Info Positions** panel gathers every placement (controls sides + orientation, name/position/battery/signal position) with a per-row **eye** show/hide toggle — the scattered show/hide switches were removed from Cover Elements, Header & Status and Cover Images. Renamed 'Layout & Positioning' → **Panel Layout** (card structure only). Header & Status now holds just sources + text styles.

## v2026.09.22.70

Status items on any side: Battery and Signal icons can now be placed Left or Right of the image (in addition to the Top/Bottom header rows), rendering beside the window/bar.

## v2026.09.22.69

Position readout placement (unified 'Open % placement'): show the % on any side of the image (Top/Bottom/Left/Right — both Classic and Modern) or, on Modern bars, on the handle / at the handle (left, right, above, below). Supersedes the modern-only value placement (kept as back-compat).

## v2026.09.22.68

Up/Stop/Down and % preset buttons each get a layout option: Auto (follow their side) / Horizontal row / Vertical column — so you can force the position buttons horizontal or vertical regardless of which side they sit on.

## v2026.09.22.67

2D placement (first step): each control cluster (Up/Stop/Down, slider, tilt, % presets) can now be placed **Top** or **Bottom** of the window/bar in addition to Left/Right — top/bottom render as a horizontal row that conforms to orientation. Enables mixed layouts like image-1 (% buttons and controls above/below). Non-breaking: existing left/right (before/after) layouts unchanged.

## v2026.09.22.66

FIX: modern bars using a Slider Styles library reference (`modern_style: lib:<slug>`) rendered as the default style on the live card — the card never subscribed to the Slider Styles library (only the editor did), so `lib:` refs resolved to defaults. The card now subscribes to it and bumps a styleVersion so the per-cover <flex-cover> elements re-render when the library loads. (Also covers % buttons that reference the Button Styles library from inside a cover.)

## v2026.09.22.65

TDBU guidance: clarified the Top-rail entity setting for Motion Blinds-style shades (card goes on the Bottom rail cover; set the Top rail cover here; band shows between both rails' current_position).

## v2026.09.22.64

Modern bar travel styles: generalized the fill to a band model. **Center-out** (double-curtain) — fill opens from the middle with two handles; **Top-down/bottom-up** scaffolding — shows the band between the bottom rail (this cover) and a top-rail entity's position (new 'Top-rail entity' setting), with two handles. Single (default) unchanged. Works with vertical + horizontal orientation.

## v2026.09.22.63

Modern bar rotation 2a — horizontal orientation: with Closing direction Left/Right the modern bar fills along the X axis (fill anchored left, width=position), the handle/tilt bar/on-handle value rotate to match, and drag maps horizontally (reuses the direction-aware picker). Vertical (Down) unchanged. Set a wide base width/height for a good horizontal shape.

## v2026.09.22.62

Modern bar: new 'Open % placement' option — on the handle, or beside the bar (left/right) tracking the handle height (in addition to the default header position). Renamed the 'image' cover visual to **Classic**.

## v2026.09.22.61

Modern bar refinements: glow can target the whole bar or only the open (filled) section; Track gains an opacity option; Bar Fill opacity now applies to gradients too (via element opacity); renamed Fill→Bar Fill and split a dedicated Track subsection; preview no longer shows a stray tilt bar; Handle radius now applies to pill/square/line; Line handle honours the size/width slider (centered).

## v2026.09.22.60

Slider Styles builder: live **preview** (open/moving/closed bars) while editing; added handle **shape** (pill/round/square/diamond/line), **opacity** and **outline** to match the Color Manager card's handle options. Editor reorg: Covers wrapping / collapse settings moved under **Cover panels**; **Buttons position** moved into the **Element placement** section, which now sits at the bottom of Layout & Positioning.

## v2026.09.22.59

Phase 2: replaced the free 'Cover element order' drag list with deterministic per-control **Element placement** dropdowns (Up/Stop/Down, Slider, Tilt, Presets → Before/After the window). Legacy `cover_order` still renders correctly and is auto-migrated to the new positions (then removed) when the card is edited.

## v2026.09.22.58

Slider Styles library editor: create/edit/duplicate/delete custom modern-bar styles (bar radius/border, track colour, per-state fill colours OR gradient stops, handle size/thickness/colour/glow, bar glow, tilt bar) with four-mode colour + gradient controls, saved to the shared System-scope store and selectable from Cover Images → Modern style. Generic color/slider/switch/select/gradient renderers now accept get/set overrides so they target the draft object.

## v2026.09.22.57

New **Modern bar** cover visual (Phase 1): `cover_visual: modern` renders the cover as a rounded track filled to the position with an optional handle, a thin secondary tilt bar, and state-driven fill colours — reusing the existing picker drag (drag = set position). Built-in styles (Neon/iOS/Glass/Minimal) + a System-scope Slider Styles library store/resolver (`modernStyles.js`). Editor: Cover Images panel gains a Visual style toggle + Modern style picker; image slots hide in modern mode.

## v2026.09.22.56

Editor: renamed the cover-type field to 'Preset - applied default' and put the four image dropdowns under a 'Preset Overrides' subsection; moved 'Rotate slat image with direction' into the Direction subsection. New bundled image esc-screen2.png (denser window-screen mesh) as a slat option. README trimmed to the visual-editor workflow (removed image-filename tables and the YAML key reference).

## v2026.09.22.55

Editor clarity: moved the cover-type preset into the Cover Images panel (top), relabeled 'Cover type (fills the images below)'; the image dropdowns' empty choice is now 'Automatic (from cover type)' and the bundled option labels no longer say '(default)', which collided with that empty choice.

## v2026.09.22.54

New bundled image **esc-screen.png** — a fine semi-transparent window/insect screen mesh (like the shade tint but see-through). Added as a Slat image option and a new **screen** cover-type preset (selectable globally and per-area/entity).

## v2026.09.22.53

Per-area/entity presets now also drive the **Group panel** image: an area's aggregate ('All'/Group) control inherits that area's preset, so its image matches the area's covers. Added the 'Shade — dark tint' overlay as a selectable option in the Slat image dropdown (it's a colour, so it wasn't in the image list before).

## v2026.09.22.52

Image/background pickers are now real dropdowns: each Window / View / Slat / Bottom-bar field is a <select> listing 'Human name (filename.png)', plus a Default option and a 'Custom image / path / colour…' option that reveals a text box for full paths or CSS colours. (Replaced the datalist, which filtered out the other options after the first pick.)

## v2026.09.22.51

Editor image/background pickers now show friendly labels (e.g. 'Window frame — white, with roller box', 'Outside — city skyline at dusk', 'Curtain — red') instead of raw filenames — the bundled image lists carry a label per file and the datalist renders it.

## v2026.09.22.50

FIX two preset bugs surfaced by per-area presets: (1) the roller-shutter preset was the entire CONFIG_DEFAULT, so applying it per-area reset all card-level layout settings back to default — it is now a small preset (images + rotate/stretch/direction only); (2) presets set a fixed name (Shade/Awning/…) that clobbered each cover's real entity name — removed, so auto-generated covers keep their friendly name.

## v2026.09.22.49

FIX: cover & group panels rendered empty after the rebrand — the child element template still emitted the old <enhanced-shutter> tag while the element is now registered as <flex-cover>. Synced the template tag.

## v2026.09.22.48

Point the card's documentation link at the new repo (github.com/Ltek/flex-cover-card).

## v2026.09.22.47

Performance: single-pass cover index groups auto-collected covers by area & label in one scan (was O(areas × entities) rescans); auto-filter classes computed once per build instead of per entity; `getUniqueKeysFromObjects` uses a Set; `getTextSize` reuses one shared measuring canvas instead of allocating one per call. No behavior change.

## v2026.09.22.46

Per-area & per-entity image presets: new `area_presets` and `entity_presets` maps assign a cover-type preset (Window / Balcony Door / Curtain / etc., each carrying its own images) to every auto-collected cover in an area, or to specific cover entities. Precedence: card defaults → card YAML → cover-type preset → area preset → entity preset → inline entity config. Editor gets a 'Per-area & per-entity presets' section in Cover Images with area/entity pickers.

## v2026.09.22.45

Integrated window / balcony-door / outside-view / curtain images from pic-shutter-card (used with permission; Apache-2.0 base from hass-shutter-card) — 23 new bundled images. New cover-type presets: **Window**, **Balcony Door (Left/Right)**. Image fields now offer the bundled files as autocomplete suggestions. Added NOTICE + README credits. per-panel icons, group separators. "treat as closed below %" threshold. spacing; four-mode color control in the editor. optionally title-case auto-derived cover names. language; card-level options for layout, auto-generate, header, buttons/sliders, appearance, scaling and behavior. (buttons column + All on row 1, covers horizontal on row 2); auto-gen skips HA cover group-helpers. fan-out, and an optional area-selector layout.
