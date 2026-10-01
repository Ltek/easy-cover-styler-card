# Cover Style Library — Spec

**Status:** current as of v2026.09.29.185. Describes the model as built, not the original plan.
**Card:** Easy Cover Styler Card (`custom:easy-cover-styler-card`).
**Code:** `src/code/coverStyles.js` (keys, built-ins, store, resolve), `classes.js`
(`#coverStyleRefFor` / `#presetOverridesFor`), `editor.js` (Cover Style editor, export/import).

---

## 1. Goal

One card shows covers of **different physical types** in one Area Button Menu while sharing one
card-level theme. Reference case (the author's house):

| Style | Areas |
|---|---|
| Roller shades | Kitchen, Living Room |
| Cellular shades | Playroom, Master Bedroom, Guest Bedroom, Master Bathroom |
| Curtain (different control layout) | Theater |

Colours, button styles, fonts and dividers stay identical across all of them.

---

## 2. What a Cover Style owns — `COVER_STYLE_KEYS` (88 keys)

A Cover Style is a named, **sparse** bundle of per-cover settings. The authoritative list is
`COVER_STYLE_KEYS`; the groups are:

| Group | Keys (abridged) |
|---|---|
| Visual + images | `cover_visual`, `image_map`, window / view / slat / bottom image, rotate-slats, stretch-edge |
| Rotation | `panel_rotation` (absorbed the legacy `area_orientation` map) |
| Control placement | standard / slider / tilt / presets position, standard + presets orientation, `buttons_position` |
| Info placement | `name_position`, `name_align`, `position_placement`, `position_align`, `panel_position_end`, `icons_position`, battery / signal position + align |
| Header text | name size / weight / colour, `always_percentage`, `header_on_cover`, name↔cover and readout↔cover gaps |
| Show / hide | name, window, standard buttons, open/close slider, tilt buttons / slider, partial-open buttons, panel position, battery, signal |
| Control look | control icon colour, button padding / margin, the six mdi icon overrides |
| Readout styling | panel position size / weight / colour |
| Preset (%) buttons | partial-buttons style, icon colour, `pct_button_style` (lib ref), bg / border / text colour / weight / size |
| In-panel spacing | controls gap, header↔image gap |
| Geometry / behaviour | closing direction, base width / height px, resize %, tilt angle min / max, favourite %, opened / closed / is-closed offsets |
| Cover type behaviour | `modern_travel`, the six invert flags, `position_presets`, disable end buttons, per-state hide lists |

### Invariants (tested — `/shared/user/code/_tests/cover-card.test.mjs`)

- **Single ownership.** No key is editable in both the card editor and a Cover Style. A key lives
  in exactly one place.
- **No entity ids inside a style.** A shared style must never carry another system's sensor or
  entity: battery / signal entities, `modern_second_entity` (TDBU top rail) and similar stay
  card-level. TDBU top-rail entities are assigned per cover via `tdbu_top_entities`.
- **Sparse.** `groups` holds only the keys the style sets. The editor's field setter deletes a
  cleared key, so anything the style does not set falls through to the card.
- **No undefined keys.** The list is built from constants, so a deleted constant would show up as
  `undefined`. The tests check for this.

### Not in a Cover Style (card-level)

Colours, fonts, area-button style, divider style, scaling, entity filters, area-menu placement,
group-panel placement, Design Mode, and every entity id.

---

## 3. Library

- **System-scope store** `easy_cover_styler_cover_styles` (HA `frontend/*_system_data`), same
  pattern as the Button Styles and Slider Styles libraries. Entry shape:
  `{ name, groups: {…}, slider: null, slider_source: '<slider ref>' }`.
- **Four built-ins** (v155): **Color Slider** (`__cs_modern_bar__`), **Roller Shutter**
  (`__cs_roller_shutter__`), **Curtain** (`__cs_curtain__`) and **Shade** (`__cs_shade__`, deliberately
  visual-agnostic — it does not set `cover_visual`). Retired built-in slugs are remapped by
  `remapRetiredStyles()` in `migrate.js`. A library entry with a built-in's slug wins over the
  built-in (`coverStyleEntry`). "Cellular" is made by duplicating Shade and changing its images.
- **Built-ins are currently editable in place** (`BUILTINS_EDITABLE = true` in `editor.js`) while
  their definitions are being authored; they will be baked into `buildBuiltins` and locked again.
- **Every listener is notified.** `ensureCoverStyleLibrary(hass, onChange)` keeps a *set* of
  listeners, so the card, its preview and the editor all refresh on a change. (Before v144 only the
  first subscriber was told, and a saved style did not refresh the preview beside the editor.)
- **Live drafts** (v181). While a style is open in the editor, `setCoverStyleDraft(slug, entry)`
  publishes its unsaved values; `coverStyleEntry()` checks drafts first, so the card in the dashboard
  editor's preview pane follows every edit. Nothing is written to HA until Save; Cancel, or leaving
  the editor, clears the draft. Slider Styles have the same mechanism (`setModernStyleDraft`). A
  brand-new, unsaved style has nothing referencing it, so it only shows in its own small preview.
- **The card must repaint on a library change.** `styleVersion` is a reactive card property (v183).
  It used to be a plain field, and the card's `shouldUpdate()` ignores an update that names no changed
  property, so slider/button library edits never reached a card that was already drawn.
- **One drawing function** (v179). Image covers are drawn by `classicArt()` in `coverArt.js` for both
  the live card and the style editor's preview, with sizes as a share of the window (no measured image
  sizes), so the two cannot disagree. Venetian tilt still uses its own slat renderer.

---

## 4. Slider look is LINKED, never embedded

A Cover Style points at a Slider Style through `slider_source` (e.g. `__modern_neon__` or
`lib:<slug>`). `resolveCoverStyle()` emits it as `modern_style: <ref>`, which is resolved from the
library at render time, so editing the Slider Style updates every Cover Style linked to it.

- There is no "copy values in" or "detach" operation. A second look is a second library entry,
  which stays reusable and easy to find.
- `slider` as an inline object is a **legacy read only**: older entries embedded a copy. Saving or
  migrating drops it whenever a `slider_source` exists.
- `pct_button_style` is likewise a `lib:` reference to the Button Styles library.
- **Portability comes from the export**, not from embedding. `_csExport` bundles the referenced
  Slider / Button Style entries with the Cover Styles, so an export stands alone on another system.

---

## 5. Assignment

Assignment lives on the **card**, not in the style, so a style stays portable:

```yaml
cover_style_default: lib:roller          # optional — see precedence
cover_styles:                            # style -> areas OR labels (id or name, case-insensitive)
  lib:roller:   [Kitchen, Living Room]
  lib:cellular: [Playroom, Master Bedroom, Guest Bedroom, Master Bathroom]
  lib:curtain:  [Theater]
cover_styles_entities:                   # per-cover override
  cover.odd_one_out: lib:curtain
```

The group (aggregate) panel takes the style of its area's first member.

---

## 6. Precedence (low → high)

```
card config
  -> cover_style_default          (opt-in: unset = no Cover Style at all)
  -> area / label assignment      (cover_styles)
  -> entity assignment            (cover_styles_entities)
  -> tdbu_top_entities            (per-cover top-rail entity, never in a style)
  -> inline `entities:` config    (explicit per-cover YAML always wins)
```

Cover Styles are the **only** source of per-cover overrides. The legacy `area_presets` /
`entity_presets` / `area_orientation` read path was removed in v137, and layout presets were
retired in v145. `migrateConfig()` runs on load in **both** the card and the editor. It converts
legacy keys once, and `warnLegacyLeftovers()` reports anything it could not convert, so nothing
disappears without a warning.

---

## 7. Retired keys

These keys have no code behind them. `migrateConfig()` strips them from card config
(`RETIRED_KEYS` in `migrate.js`):

`position_text_size`, `position_text_color`, `position_text_weight`, `position_background`,
`show_opening`, `opening_disabled`, `opening_position`, `inline_header`, `header_order`,
`header_gap`, `header_align`.

The Position Readout (`position_placement` + `panel_position_*`) is the single way position is
shown (v152). `header_align` carries forward: `left` / `right` become `name_align: start` / `end`.

---

## 8. Name / Readout alignment (v154)

`name_align` and `position_align` take `start | center | end`. The labels depend on the side the
item is on:

| Placed | start / center / end means |
|---|---|
| top, bottom | Left / Center / Right |
| left, right | Top / Middle / Bottom |
| on / at the handle | (no cross axis — control hidden) |

With **Align to Cover** (`header_on_cover`) on and the controls beside the cover, top/bottom items
render *inside the cover's own grid column*, so Left/Center/Right are measured against the cover's
frame whatever else sits beside it. The middle row becomes a three-row grid, and the cover's cell is
a subgrid spanning all three rows, so the text does not change the height of the buttons' row.
With it off, alignment is against the panel: the name uses the header row's left / centre / right
cell, and a non-centred readout gets its own full-width line.
