/**
 * Easy Cover Styler Card — visual editor
 *
 * Built to the shared ltek card design language (CARD_DESIGN_SYSTEM.md):
 * top-level <details> panels (accent border when open), label+control rows,
 * muted hints, four-mode color control, byte-stable output (a key is written
 * only when it differs from the card default; setting it back to the default
 * deletes the key).
 *
 * This card is a Lit/shadow-DOM fork, so the editor is a LitElement whose
 * static styles carry the (byte-identical) --ltek-* token block.
 */
import {classicArt, coveredPct} from './coverArt.js';
import {LitElement, html, css, unsafeCSS} from './lit/lit-core.min.js';
import * as C from './constants.js';
import {defImagePathOrColor} from './functions.js';
import {migrateImageValue} from './imagePaths.js';
import {scanMediaImages, clearMediaImageCache, isMediaRef, resolveMediaRef, MEDIA_BASE_DIR} from './mediaImages.js';
import {migrateConfig} from './migrate.js';
import {ensureFrameLibrary, offFrameLibrary, frameLibraryMap, builtinFrames} from './frames.js';
import {libRev} from './libRev.js';
import {buildSchema} from './editorSchema.js';
import {ensureButtonStyleLibrary, offButtonStyleLibrary, buttonStyleLibraryMap, saveButtonStyleLibrary, slugifyStyleName, newButtonStyleEntry, builtinButtonStyles, buttonAppearanceFromStack, areaButtonStyle, areaButtonIcon as _bsIcon} from './buttonStyles.js';
import {ensureModernStyleLibrary, offModernStyleLibrary, modernStyleLibraryMap, builtinModernStyles, saveModernStyleLibrary, slugifyModernName, newModernStyleEntry, MODERN_STYLE_DEFAULT, resolveModernStyle, modernFillPaint, modernFillOpacity, modernTrackColor, modernBarGlow, modernHandleStyle, setModernStyleDraft} from './modernStyles.js';
import {ensureCoverStyleLibrary, offCoverStyleLibrary, coverStyleLibraryMap, builtinCoverStyles, saveCoverStyleLibrary,
  slugifyCoverStyleName, isBuiltinCoverStyleSlug, newCoverStyleEntry, coverStyleEntry,   linkSliderStyle,
  builtinCoverStyleSlug, resolveCoverStyle,
  COVER_STYLE_KEYS, setCoverStyleDraft} from './coverStyles.js';

// theme-variable list for the four-mode color control (same list/order, every card)
export const AT_THEME_COLORS = [
  ['var(--primary-color)', 'Primary'],
  ['var(--accent-color)', 'Accent'],
  ['var(--primary-text-color)', 'Primary text'],
  ['var(--secondary-text-color)', 'Secondary text'],
  ['var(--disabled-text-color)', 'Disabled text'],
  ['var(--state-active-color)', 'State active'],
  ['var(--error-color)', 'Error'],
  ['var(--warning-color)', 'Warning'],
  ['var(--success-color)', 'Success'],
  ['var(--info-color)', 'Info'],
];

const STATES_FOR_STYLE = [C.SHUTTER_STATE_OPENING, C.SHUTTER_STATE_OPEN, C.SHUTTER_STATE_CLOSED,
  C.SHUTTER_STATE_CLOSING, C.SHUTTER_STATE_PARTIAL_OPEN];


// v2026.09.24.160: TEMPORARY authoring mode for the four built-in Cover Styles. While true, a built-in
// opens straight into the editor and saving stores it in the library under its own slug (the library
// shadows the code definition, see coverStyleEntry). Once the final JSON is baked into
// coverStyles.js#buildBuiltins, set this to false: built-ins become read-only, duplicate-only again.
const BUILTINS_EDITABLE = true;

export class EnhancedShutterCardEditor extends LitElement {
  static properties = {
    hass: {attribute: false},
    _config: {state: true},
    _openPanels: {state: true},
    _styleSlug: {state: true},
    _styleDraft: {state: true},
    _colorSel: {state: true},
    _imgSel: {state: true},
    _modernSlug: {state: true},
    _modernDraft: {state: true},
    _posOpen: {state: true},
    _pick: {state: true},
    _csSlug: {state: true},
    _csOpen: {state: true},
    _csDraft: {state: true},
  };

  constructor() {
    super();
    // v2026.10.01.190: ONE library listener for the editor's lifetime. render() used to pass four
    // fresh arrows on every render, and the editor renders on every hass update, so the library
    // Sets grew by four per state change for as long as the editor was open — each one holding an
    // old copy of the editor. requestUpdate() already coalesces into one render per microtask.
    this._onLibUpdate = () => { if (!this._libDetached) this.requestUpdate(); };
    this._libDetached = false;
    this._libRevAtDetach = 0;
    this._config = {};
    this._openPanels = {};
    this._styleSlug = null;   // slug being edited in the Button Styles library (null = list view)
    this._styleDraft = null;  // working copy of the entry being edited
    this._colorSel = {};      // transient per-field color-mode selection (keeps 'Custom CSS' box visible)
    this._imgSel = {};        // transient per-field 'custom' flag for image selects (keeps the text box visible)
    this._modernSlug = null;  // slug being edited in the Slider Styles library (null = list view)
    this._modernPreviewSlug = null;  // v180: library row whose inline preview is open
    this._btnPreviewSlug = null;     // v183: same, for Button Styles
    this._modernReadOnly = false;    // v184: a built-in slider style open for viewing
    this._styleReadOnly = false;     // v183: a built-in button style open for viewing
    this._modernDraft = null; // working copy of the slider-style entry being edited
    this._posOpen = {};       // expand state for the Controls & Info element subpanels
    this._pick = {};          // transient per-picker {q, open} state (not persisted)
    this._csSlug = null;      // Cover Style being edited (null = list view)
    this._csOpen = { visual: true }; // which style-editor groups are expanded
    this._csDraft = null;     // working copy of that Cover Style
  }

  setConfig(config) {
    // v2026.09.24.137: the legacy migration chain moved to migrate.js so the CARD runs it on load
    // too, not just when someone opens the editor. See that file for why that matters.
    this._config = migrateConfig(config);
  }

  // --- value helpers -------------------------------------------------------
  _default(key) {
    return C.CONFIG_DEFAULT[key];
  }
  // effective config = the same resolver the card runtime uses (legacy divider map + preset overlay),
  // cached by _config identity so locked bucket-A fields display their resolved preset values.
  _effective() {
    if (this.__effSrc !== this._config) { this.__effSrc = this._config; this.__eff = C.resolveLayoutConfig(this._config); }
    return this.__eff;
  }
  _value(key) {
    const v = this._effective()[key];
    return v === undefined ? this._default(key) : v;
  }
  // raw (unresolved) value straight from the user config — used where we must read the stored value,
  // not the preset-resolved one (e.g. the customize flag and preset id themselves).
  _raw(key) {
    const v = this._config[key];
    return v === undefined ? this._default(key) : v;
  }
  // byte-stable write: delete when equal to default (or empty), else set
  _emit(newConfig) {
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: {config: newConfig},
      bubbles: true,
      composed: true,
    }));
  }
  _isDefault(key, value) {
    const d = this._default(key);
    const matchesDefault = Array.isArray(value)
      ? (Array.isArray(d) ? JSON.stringify(value) === JSON.stringify(d) : value.length === 0)
      : (value === d || value === '' || value === null || value === undefined);
    if (!matchesDefault) return false;
    // v145: with layout presets retired there is no base layer beneath the config, so a key that
    // equals the default can always be dropped — nothing can resurface underneath it. (This block
    // existed only to stop a preset overriding a checkbox the user had just unticked.)
    return true;
  }
  _set(key, value) {
    const next = { ...this._config };
    if (this._isDefault(key, value)) {
      delete next[key];
    } else {
      next[key] = value;
    }
    this._emit(next);
  }
  // nested object write (e.g. auto_filter.exclude); prunes empty objects
  _setNested(key, subKey, value) {
    const next = { ...this._config };
    const obj = { ...(next[key] || {}) };
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete obj[subKey];
    } else {
      obj[subKey] = value;
    }
    if (Object.keys(obj).length === 0) delete next[key];
    else next[key] = obj;
    this._emit(next);
  }
  _nestedValue(key, subKey, fallback) {
    const v = this._config[key]?.[subKey];
    return v === undefined ? fallback : v;
  }

  // Read/write a field's value. If the field carries get/set closures (used by the
  // Slider Styles library editor to target a draft object), use those instead of config.
  _val(f) { return f.get ? f.get() : this._value(f.key); }
  _put(f, v) { if (f.set) f.set(v); else this._set(f.key, v); }

  // --- generic field renderers --------------------------------------------
  // Boolean row: checkbox FIRST, then the label (design reference) — no label column.
  _rowSwitch(f) {
    const checked = !!this._val(f);
    return html`
      <div class="row row-bool">
        <label class="ecs-check" title=${f.hint || ''}>
          <input type="checkbox" .checked=${checked} @change=${(e) => this._put(f, e.target.checked)}>
          <span>${f.label}</span>
        </label>
      </div>`;
  }
  // v2026.09.24.164: what an UNSET style key actually resolves to. Style keys have no field in the
  // card editor (each is owned by the style alone), so "use card setting" pointed at a control that
  // does not exist. The value comes from the card's YAML if one is written there — older cards often
  // still carry these — and otherwise from the built-in default. Say which, and name the value.
  _csUnsetLabel(f) {
    const card = this._config || {};
    const fromYaml = Object.prototype.hasOwnProperty.call(card, f.key);
    const v = fromYaml ? card[f.key] : C.CONFIG_DEFAULT[f.key];
    const opt = (f.options || []).map(o => (Array.isArray(o) ? o : [o, o])).find(([ov]) => String(ov) === String(v));
    const shown = opt ? opt[1] : (v === '' || v === undefined || v === null ? 'none' : String(v));
    return fromYaml ? `Not set \u2014 card YAML: ${shown}` : `Not set \u2014 default: ${shown}`;
  }
  // v2026.09.24.171: pick a frame from the shared Frame Library (read-only here). Frames are made
  // and edited in the Color or Entity card; this card only links to them.
  _rowFramePicker(f) {
    const cur = String(this._value(f.key) || '');
    const lib = frameLibraryMap(), bi = builtinFrames();
    const libSlugs = Object.keys(lib).sort((a, b) => String(lib[a].name || a).localeCompare(String(lib[b].name || b)));
    const known = !cur || bi[cur] || lib[cur.replace(/^lib:/, '')];
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => this._set(f.key, e.target.value)}>
          <option value="" ?selected=${!cur}>Choose a frame…</option>
          <optgroup label="Built-in">
            ${Object.keys(bi).map(k => html`<option value=${k} ?selected=${cur === k}>${bi[k].name}</option>`)}
          </optgroup>
          ${libSlugs.length ? html`<optgroup label="Frame Library">
            ${libSlugs.map(k => html`<option value=${'lib:' + k} ?selected=${cur === 'lib:' + k}>${lib[k].name || k}</option>`)}
          </optgroup>` : ''}
          ${known ? '' : html`<option value=${cur} selected>Missing: ${cur}</option>`}
        </select>
      </div>
      <div class="hint" style="margin:-2px 0 6px;">Frames come from the shared <b>Frame Style</b> library. ${libSlugs.length
        ? html`It is shared with the Color and Entity cards — edit a frame there and every card using it updates.`
        : html`Create frames in the Color or Entity card; they appear here automatically.`}</div>`;
  }
  _rowSelect(f) {
    // In the Cover Style editor an unset key is NOT the built-in default — at runtime it falls
    // through to the card. Show that honestly, and let the user return a key to it.
    const inherits = !!(f.csInherit && f.isSet && !f.isSet());
    const cur = inherits ? '' : this._val(f);
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => {
          const v = e.target.value;
          if (f.csInherit && v === '') { this._put(f, ''); this.requestUpdate(); return; }   // '' deletes the key
          this._put(f, f.bool ? (v === 'true') : (f.num ? Number(v) : v));
        }}>
          ${f.csInherit ? html`<option value="" ?selected=${inherits}>${this._csUnsetLabel(f)}</option>` : ''}
          ${f.options.map(o => {
            const [val, lbl] = Array.isArray(o) ? o : [o, o];
            return html`<option value=${val} ?selected=${String(cur) === String(val)}>${lbl}</option>`;
          })}
        </select>
      </div>`;
  }
  // v2026.09.24.154: 3-way (or n-way) segmented control for mutually exclusive choices.
  // f.options = [[value, label], ...]; the pressed segment is the current value.
  _rowSegmented(f) {
    const cur = String(this._val(f) ?? '');
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="seg" role="radiogroup" aria-label=${f.label}>
          ${f.options.map(([val, lbl]) => html`
            <button type="button" class="seg-btn ${cur === String(val) ? 'on' : ''}" role="radio"
              aria-checked=${cur === String(val) ? 'true' : 'false'}
              @click=${() => this._put(f, val)}>${lbl}</button>`)}
        </div>
      </div>`;
  }
  // Cross-axis alignment row for an item placed on a side of the cover. The labels follow the side
  // it currently sits on; placements with no cross axis (on/at the handle) show nothing.
  _csAlignRow(alignKey, placementKey, label) {
    const place = String(this._csField(placementKey, {}).get() || '').toLowerCase();
    let opts = null;
    if (place === C.TOP || place === C.BOTTOM) opts = [[C.ALIGN_START, 'Left'], [C.ALIGN_CENTER, 'Center'], [C.ALIGN_END, 'Right']];
    else if (place === C.LEFT || place === C.RIGHT) opts = [[C.ALIGN_START, 'Top'], [C.ALIGN_CENTER, 'Middle'], [C.ALIGN_END, 'Bottom']];
    if (!opts) return '';
    return this._rowSegmented(this._csField(alignKey, { label, options: opts,
      hint: 'Where the item sits along the side it is placed on. Left/Center/Right follow the cover when Align to Cover is on.' }));
  }
  _rowNumber(f) {
    const cur = this._value(f.key);
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <input type="number" .value=${cur ?? ''} min=${f.min ?? ''} max=${f.max ?? ''} step=${f.step ?? 1}
          @input=${(e) => this._set(f.key, e.target.value === '' ? this._default(f.key) : Number(e.target.value))}>
      </div>`;
  }
  _rowText(f) {
    const cur = this._val(f) ?? '';
    const sugg = Array.isArray(f.suggestions) ? f.suggestions : null;
    const listId = sugg ? `esc-sugg-${f.key}` : undefined;
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <input type="text" .value=${cur} placeholder=${f.placeholder || ''}
          list=${listId}
          @input=${(e) => this._set(f.key, e.target.value)}>
        ${sugg ? html`<datalist id=${listId}>${sugg.map(v => {
            const val = (v && typeof v === 'object') ? v.value : v;
            const lab = (v && typeof v === 'object') ? v.label : '';
            return html`<option value=${val} label=${lab}>${lab}</option>`;
          })}</datalist>` : ''}
      </div>`;
  }
  // real dropdown of bundled images (label + filename) with a Default and a Custom option.
  // Custom reveals a text box so a full path or CSS color can still be entered.
  // f.options: [{value, label}]
  // Resolve a media: reference for the preview. Signed urls cannot be built synchronously, so fetch
  // once, cache, and re-render. Returns '' until it arrives (the slot simply renders empty).
  _csMediaUrl(ref) {
    this._csMediaUrls = this._csMediaUrls || {};
    if (this._csMediaUrls[ref] === undefined) {
      this._csMediaUrls[ref] = '';
      resolveMediaRef(this.hass, ref).then((url) => {
        if (!url) return;
        this._csMediaUrls = { ...(this._csMediaUrls || {}), [ref]: url };
        this.requestUpdate();
      });
    }
    return this._csMediaUrls[ref];
  }
  // Which type folder a picker's images live in — also the folder browsed under the media dir.
  _imageFolderFor(f) {
    const first = (Array.isArray(f.options) ? f.options : []).map(o => o.value).find(v => v && v.includes('/'));
    return first ? first.split('/')[0] : '';
  }
  // Kick off a media browse for this picker once, then re-render when it returns. Cached in
  // mediaImages.js, so this is one websocket call per folder per editor session.
  _mediaOptionsFor(f) {
    const folder = this._imageFolderFor(f);
    if (!folder || !this.hass) return null;
    this._mediaOpts = this._mediaOpts || {};
    if (this._mediaOpts[folder] === undefined) {
      this._mediaOpts[folder] = null;   // in flight: render bundled-only for now
      scanMediaImages(this.hass, folder).then((list) => {
        this._mediaOpts = { ...(this._mediaOpts || {}), [folder]: list };
        this.requestUpdate();
      });
    }
    return this._mediaOpts[folder];
  }
  _rowImageSelect(f) {
    const cur = this._val(f) ?? '';
    const folder = this._imageFolderFor(f);
    const media = this._mediaOptionsFor(f);
    const opts = [...(Array.isArray(f.options) ? f.options : []), ...(media || [])];
    const known = new Set(opts.map(o => o.value));
    const forced = this._imgSel && this._imgSel[f.key];
    // A value that is not a bundled filename is either a COLOUR or a custom path. The renderer
    // already paints a non-filename slat value, so a flat colour needs no image file at all.
    const looksColour = (v) => v !== '' && !isMediaRef(v)
      && !/\.(png|jpe?g|gif|webp|svg)$/i.test(v) && !/^\/|^https?:/i.test(v);
    const mode = forced ? forced
      : (cur === '' ? 'default'
        : (known.has(cur) ? cur : (looksColour(cur) ? '__colour__' : '__custom__')));
    const onSelect = (v) => {
      if (v === '__custom__' || v === '__colour__') {
        this._imgSel = { ...(this._imgSel || {}), [f.key]: v };
        // entering colour mode from an image value seeds a colour so the control has something valid
        if (v === '__colour__' && !looksColour(cur)) this._put(f, f.seedHex || '#888888');
        return;
      }
      const next = { ...(this._imgSel || {}) }; delete next[f.key]; this._imgSel = next;
      this._put(f, v === '__default__' ? '' : v);
    };
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="color-ctrl">
          <select @change=${(e) => onSelect(e.target.value)}>
            <option value="__default__" ?selected=${mode === 'default'}>${f.defaultLabel || 'Automatic (from cover type)'}</option>
            ${opts.map(o => html`<option value=${o.value} ?selected=${mode === o.value}>${o.label} (${o.value})</option>`)}
            ${f.allowColour === false ? '' : html`
              <option value="__colour__" ?selected=${mode === '__colour__'}>Custom colour…</option>`}
            <option value="__custom__" ?selected=${mode === '__custom__'}>Custom image / path…</option>
          </select>
          ${mode === '__custom__' ? html`
            <input type="text" .value=${cur} placeholder=${f.placeholder || 'filename.png or /local/…'}
              @input=${(e) => this._put(f, e.target.value)}>` : ''}
          ${mode === '__colour__' ? this._colourSubControl(f, cur) : ''}
        </div>
      </div>
      ${folder ? html`<div class="hint" style="margin:-2px 0 6px;">
        ${media === null ? html`Looking for extra images in the media folder…`
          : media.length ? html`${media.length} extra image${media.length === 1 ? '' : 's'} found in
              <code>${MEDIA_BASE_DIR}/${folder}</code> under your media folder.
              <a href="#" @click=${(e) => { e.preventDefault(); clearMediaImageCache(); this._mediaOpts = {}; this.requestUpdate(); }}>Rescan</a>`
            : html`Drop extra images in <code>${MEDIA_BASE_DIR}/${folder}</code> under your media
              folder and they appear here.
              <a href="#" @click=${(e) => { e.preventDefault(); clearMediaImageCache(); this._mediaOpts = {}; this.requestUpdate(); }}>Rescan</a>`}
      </div>` : ''}`;
  }
  // chip list backed by an array config key (areas/labels) or a nested key
  _rowChips(f) {
    const items = (f.nested ? this._nestedValue(f.key, f.nested, []) : this._value(f.key)) || [];
    const list = Array.isArray(items) ? items : [];
    const commit = (arr) => f.nested ? this._setNested(f.key, f.nested, arr) : this._set(f.key, arr);
    const add = (e) => {
      const inp = this.renderRoot.querySelector(`#add-${f.key}-${f.nested || ''}`);
      const val = (inp?.value || '').trim();
      if (!val) return;
      if (!list.includes(val)) commit([...list, val]);
      if (inp) inp.value = '';
    };
    return html`
      <div class="chips-field">
        ${f.labelCheck ? html`
          <label class="ecs-check" title=${f.hint || ''}>
            <input type="checkbox" .checked=${!!this._value(f.labelCheck)}
              @change=${(e) => this._set(f.labelCheck, e.target.checked)}><span>${f.label}</span></label>`
          : html`<label class="row-label" title=${f.hint || ''}>${f.label}</label>`}
        ${(f.labelCheck && !this._value(f.labelCheck)) ? '' : html`
        <div class="chips">
          ${list.map(v => html`<span class="chip">${v}<button class="chip-x" @click=${() => commit(list.filter(x => x !== v))}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button></span>`)}
        </div>
        <div class="chip-add">
          <input id="add-${f.key}-${f.nested || ''}" type="text" placeholder=${f.placeholder || 'Add…'}
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(e); } }}>
          <button class="add-btn" @click=${add}>Add</button>
        </div>`}
      </div>`;
  }
  // multi-select of fixed options backed by an array key (hide-states)
  // v2026.09.24.168: one compact block per button. Line 1: label + state chips. Line 2 (indented):
  // the colour control, with "Hide completely" pushed to the right.
  _rowBtnVis(label, statesKey, colorKey, hideKey, options) {
    const st = this._csField(statesKey, {});
    const cur = st.get() || [];
    const list = Array.isArray(cur) ? cur : [];
    const hide = this._csField(hideKey, {});
    const toggle = (val) => {
      st.set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
      if (hide.isSet && !hide.isSet()) hide.set(false);   // explicit: recolour, not hide
      this.requestUpdate();
    };
    return html`
      <div class="btnvis">
        <div class="btnvis-line">
          <span class="row-label">${label} \u2014</span>
          <div class="multi">
            ${options.map(val => html`
              <button class="multi-opt ${list.includes(val) ? 'on' : ''}" @click=${() => toggle(val)}>${val}</button>`)}
          </div>
        </div>
        <div class="btnvis-line btnvis-sub">
          ${this._rowColor(this._csField(colorKey, { label: 'Color', defaultLabel: 'Default' }))}
          <label class="ecs-check btnvis-hide">
            <input type="checkbox" .checked=${!!hide.get()}
              @change=${(e) => { hide.set(e.target.checked); this.requestUpdate(); }}><span>Hide completely</span></label>
        </div>
      </div>`;
  }
  _rowMulti(f) {
    // v2026.09.24.168: read/write through _val/_put, not _value/_set. The latter always target the
    // CARD config, so in the Cover Style editor picking Button Visibility states wrote them onto the
    // card instead of the style being edited (the same bug class v115 fixed for images/checkboxes).
    const cur = this._val(f) || [];
    const list = Array.isArray(cur) ? cur : [];
    const toggle = (val) => {
      const next = list.includes(val) ? list.filter(x => x !== val) : [...list, val];
      this._put(f, next);
      this.requestUpdate();
    };
    return html`
      <div class="chips-field">
        ${f.labelCheck ? html`
          <label class="ecs-check" title=${f.hint || ''}>
            <input type="checkbox" .checked=${!!this._value(f.labelCheck)}
              @change=${(e) => this._set(f.labelCheck, e.target.checked)}><span>${f.label}</span></label>`
          : html`<label class="row-label" title=${f.hint || ''}>${f.label}</label>`}
        <div class="multi">
          ${f.options.map(val => html`
            <button class="multi-opt ${list.includes(val) ? 'on' : ''}" @click=${() => toggle(val)}>${val}</button>`)}
        </div>
      </div>`;
  }

  // ordered, editable list of explicit cover entities
  _entitiesList() {
    const e = this._config[C.CONFIG_ENTITIES];
    return Array.isArray(e) ? e : [];
  }
  _entityIdOf(entry) {
    return (typeof entry === 'object' && entry) ? (entry.entity || '') : (entry || '');
  }
  _commitEntities(arr) {
    const next = { ...this._config };
    if (!arr || arr.length === 0) delete next[C.CONFIG_ENTITIES];
    else next[C.CONFIG_ENTITIES] = arr;
    this._emit(next);
  }
  // ===== ONE search picker, used by every "pick from a list" field =========================
  // Mirrors the Color card's _renderEntitySearchPicker: a filter input plus a scrollable list of
  // clickable rows that stays COLLAPSED until you focus/type (so long lists don't dominate the
  // panel). Rows show a friendly name + the raw id (+ an optional tag). Clicking a row adds it.
  //   candidates : [{id, name, tag}]
  //   chosen     : [id]  (already-picked ids, filtered out of the list)
  //   pick(id)   : add handler
  _searchPicker(pickerKey, candidates, chosen, placeholder, pick, trailing) {
    const st = (this._pick && this._pick[pickerKey]) || {};
    const q = (st.q || '').trim().toLowerCase();
    const open = !!st.open;
    const set = (patch) => { this._pick = { ...(this._pick || {}), [pickerKey]: { ...st, ...patch } }; };
    const chosenSet = new Set(chosen || []);
    const remaining = (candidates || [])
      .filter(c => !chosenSet.has(c.id))
      .filter(c => !q || `${c.name} ${c.id}`.toLowerCase().includes(q));
    return html`
      <div class="ecs-picker">
        <div class="ecs-picker-row-input">
          <input class="ecs-picker-input" type="text" autocomplete="off" placeholder=${placeholder}
            .value=${st.q || ''}
            @focus=${() => set({ open: true })}
            @input=${(e) => set({ open: true, q: e.target.value })}
            @blur=${() => setTimeout(() => set({ open: false }), 150)}>
          ${trailing || ''}
        </div>
        ${open ? html`
          <div class="ecs-picker-list">
            ${remaining.length ? remaining.map(c => html`
              <div class="ecs-picker-row" @mousedown=${(e) => { e.preventDefault(); pick(c.id); set({ q: '', open: false }); }}>
                <span class="ecs-picker-name">${c.name}</span>
                ${c.id !== c.name ? html`<span class="ecs-picker-id">${c.id}</span>` : html`<span class="ecs-picker-id"></span>`}
                ${c.tag ? html`<span class="ecs-picker-tag">${c.tag}</span>` : ''}
                <span class="ecs-picker-add">+</span>
              </div>`)
              : html`<div class="hint" style="padding:8px;">Nothing left to add.</div>`}
          </div>` : ''}
      </div>`;
  }
  // chosen-items list shared by every picker field (optional reordering)
  _pickedRows(list, labelOf, commit, reorder) {
    return list.map((v, i) => html`
      <div class="ent-row">
        <span class="ecs-picker-name" style="flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title=${v}>${labelOf(v)}</span>
        ${v !== labelOf(v) ? html`<span class="ecs-picker-id">${v}</span>` : ''}
        ${reorder ? html`
          <button class="ent-ic" title="Move up" @click=${() => reorder(i, -1)}>↑</button>
          <button class="ent-ic" title="Move down" @click=${() => reorder(i, 1)}>↓</button>` : ''}
        <button class="ent-ic del" title="Remove" @click=${() => commit(list.filter((_, k) => k !== i))}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
      </div>`);
  }
  // ---- candidate sources --------------------------------------------------
  _coverIds() {
    return this.hass ? Object.keys(this.hass.states).filter(id => id.startsWith('cover.')) : [];
  }
  _friendly(id) {
    return this.hass?.states?.[id]?.attributes?.friendly_name || id;
  }
  _pickCandidates(kind) {
    if (kind === 'entity') {
      return this._coverIds()
        .map(id => ({ id, name: this._friendly(id), tag: this.hass.states[id]?.attributes?.device_class || '' }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    if (kind === 'area') {
      return Object.values(this.hass?.areas || {})
        .map(a => ({ id: a.name, name: a.name })).filter(a => a.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (kind === 'label') {
      return Object.values(this.hass?.labels || {})
        .map(l => ({ id: l.name || l.label_id, name: l.name || l.label_id })).filter(l => l.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (kind === 'deviceClass') {
      return [...new Set(this._coverIds()
        .map(id => this.hass.states[id]?.attributes?.device_class).filter(Boolean))]
        .sort().map(c => ({ id: c, name: c }));
    }
    return [];
  }
  // Generic picker-backed list field. Replaces the old chips / free-text entity inputs so Areas,
  // Labels, device classes and Covers all use the same control.
  //   f.kind   : 'entity' | 'area' | 'label' | 'deviceClass'
  //   f.nested : optional sub-key (e.g. auto_filter.device_class)
  //   f.reorder: allow ↑↓ (used for the explicit Covers list)
  _rowPickList(f) {
    const isEntities = f.key === C.CONFIG_ENTITIES;
    const raw = isEntities ? this._entitiesList()
      : ((f.nested ? this._nestedValue(f.key, f.nested, []) : this._value(f.key)) || []);
    const list = (Array.isArray(raw) ? raw : []).map(v => isEntities ? this._entityIdOf(v) : v);
    const commit = (arr) => {
      if (isEntities) return this._commitEntities(arr);
      if (f.nested) return this._setNested(f.key, f.nested, arr);
      return this._set(f.key, arr);
    };
    const reorder = f.reorder ? (i, dir) => {
      const j = i + dir; if (j < 0 || j >= list.length) return;
      const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; commit(a);
    } : null;
    const labelOf = (v) => f.kind === 'entity' ? this._friendly(v) : v;
    const pickerKey = `${f.key}:${f.nested || ''}`;
    return html`
      <div class="ent-field">
        ${f.label ? html`<label class="row-label" title=${f.hint || ''}>${f.label}</label>` : ''}
        ${this._searchPicker(pickerKey, this._pickCandidates(f.kind), list, f.placeholder || 'Search…',
          (id) => { if (!list.includes(id)) commit([...list, id]); })}
        ${this._pickedRows(list, labelOf, commit, reorder)}
      </div>`;
  }

  // four-mode color control (Inherit / Theme / Custom / CSS) — CARD_DESIGN_SYSTEM.md §3
  // The four-mode colour control from §3 of the design system, without the row/label wrapper so it
  // can sit inside another field (here: the image picker's Custom colour mode).
  _colourSubControl(f, cur) {
    const key = f.key;
    const sub = (this._colourSub && this._colourSub[key]) || this._colorMode(cur);
    const setSub = (m) => {
      this._colourSub = { ...(this._colourSub || {}), [key]: m };
      if (m === 'transparent') this._put(f, 'transparent');
      else if (m === 'theme') this._put(f, (this._colorMode(cur) === 'theme' && cur) || AT_THEME_COLORS[0][0]);
      else if (m === 'custom') this._put(f, /^#[0-9a-fA-F]{3,8}$/.test(cur) ? cur : (f.seedHex || '#888888'));
      else this._put(f, this._colorMode(cur) === 'css' ? cur : '');
    };
    return html`
      <select @change=${(e) => setSub(e.target.value)}>
        <option value="theme" ?selected=${sub === 'theme'}>Theme color</option>
        <option value="custom" ?selected=${sub === 'custom'}>Custom color</option>
        <option value="transparent" ?selected=${sub === 'transparent'}>Transparent</option>
        <option value="css" ?selected=${sub === 'css'}>Custom CSS</option>
      </select>
      ${sub === 'theme' ? html`
        <select @change=${(e) => this._put(f, e.target.value)}>
          ${AT_THEME_COLORS.map(([v, l]) => html`<option value=${v} ?selected=${v === cur}>${l}</option>`)}
        </select>` : ''}
      ${sub === 'custom' ? html`
        <input type="color" .value=${/^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#888888'}
          @input=${(e) => this._put(f, e.target.value)}>` : ''}
      ${sub === 'css' ? html`
        <input type="text" .value=${cur === 'transparent' ? '' : cur} placeholder="rgba(0,0,0,0.5), tomato…"
          @input=${(e) => this._put(f, e.target.value)}>` : ''}`;
  }
  _colorMode(cur) {
    cur = cur == null ? '' : String(cur);
    if (cur === '') return 'default';
    if (cur === 'transparent') return 'transparent';
    if (/^#[0-9a-fA-F]{3,8}$/.test(cur)) return 'custom';
    if (/^var\(/.test(cur) && AT_THEME_COLORS.some(([v]) => v === cur)) return 'theme';
    return 'css';
  }
  _rowColor(f) {
    const cur = this._val(f) || '';
    // transient per-field mode so 'Custom CSS' (empty value) keeps its text box showing
    const sel = this._colorSel && this._colorSel[f.key];
    const mode = sel || this._colorMode(cur);
    const setMode = (m) => {
      this._colorSel = { ...(this._colorSel || {}), [f.key]: m };
      if (m === 'default') this._put(f, '');
      else if (m === 'transparent') this._put(f, 'transparent');
      else if (m === 'theme') this._put(f, (this._colorMode(cur) === 'theme' && cur) || AT_THEME_COLORS[0][0]);
      else if (m === 'custom') this._put(f, /^#[0-9a-fA-F]{6}$/.test(cur) ? cur : (f.seedHex || '#cccccc'));
      else this._put(f, this._colorMode(cur) === 'css' ? cur : '');
    };
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="color-ctrl">
          <select @change=${(e) => setMode(e.target.value)}>
            <option value="default" ?selected=${mode === 'default'}>${f.defaultLabel || 'Inherit'}</option>
            ${f.allowTransparent ? html`<option value="transparent" ?selected=${mode === 'transparent'}>${f.transparentLabel || 'Transparent'}</option>` : ''}
            <option value="theme" ?selected=${mode === 'theme'}>Theme color</option>
            <option value="custom" ?selected=${mode === 'custom'}>Custom color</option>
            <option value="css" ?selected=${mode === 'css'}>Custom CSS</option>
          </select>
          ${mode === 'theme' ? html`
            <select @change=${(e) => this._put(f, f.bool
          ? (e.target.value === 'true')
          : (f.num ? Number(e.target.value) : e.target.value))}>
              ${AT_THEME_COLORS.map(([v, l]) => html`<option value=${v} ?selected=${v === cur}>${l}</option>`)}
            </select>` : ''}
          ${mode === 'custom' ? html`
            <input type="color" .value=${/^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#cccccc'}
              @input=${(e) => this._put(f, e.target.value)}>` : ''}
          ${mode === 'css' ? html`
            <input type="text" .value=${cur === 'transparent' ? '' : cur} placeholder="tomato, rgba(…)"
              @input=${(e) => this._put(f, e.target.value)}>` : ''}
        </div>
      </div>`;
  }

  // scale control: Off (false) / Auto (true) / Custom (number factor)
  _rowScale(f) {
    const cur = this._value(f.key);
    const mode = cur === true ? 'auto' : (typeof cur === 'number' ? 'custom' : 'off');
    const setMode = (m) => {
      if (m === 'off') this._set(f.key, false);
      else if (m === 'auto') this._set(f.key, true);
      else this._set(f.key, typeof cur === 'number' ? cur : 1);
    };
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="color-ctrl nowrap">
          <select @change=${(e) => setMode(e.target.value)}>
            <option value="off" ?selected=${mode === 'off'}>Off</option>
            <option value="auto" ?selected=${mode === 'auto'}>Auto</option>
            <option value="custom" ?selected=${mode === 'custom'}>Custom factor</option>
          </select>
          ${mode === 'custom' ? html`
            <input type="range" min="0.2" max="3" step="0.1" .value=${typeof cur === 'number' ? cur : 1}
              @input=${(e) => this._set(f.key, Number(e.target.value))}>
            <span class="slider-val">${(typeof cur === 'number' ? cur : 1)}×</span>` : ''}
        </div>
      </div>`;
  }

  _rowSlider(f) {
    const cur = Number(this._val(f) ?? 0);
    const unit = f.unit || '';
    const show = (f.zeroLabel && cur === 0) ? f.zeroLabel : `${cur}${unit}`;
    return html`
      <div class="slider-row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <input type="range" min=${f.min ?? 0} max=${f.max ?? 100} step=${f.step ?? 1} .value=${cur}
          @input=${(e) => this._put(f, Number(e.target.value))}>
        <span class="slider-val">${show}</span>
      </div>`;
  }

  // battery/signal source: Auto (auto-discover) / Off / Custom (entity id or mdi:icon)
  _rowEntityCombo(f) {
    const cur = this._value(f.key) || '';
    const mode = cur === 'auto' ? 'auto' : (cur === '' ? 'off' : 'custom');
    const sensors = this.hass ? Object.keys(this.hass.states).filter(id => id.startsWith('sensor.')).sort() : [];
    const setMode = (m) => {
      if (m === 'auto') this._set(f.key, 'auto');
      else if (m === 'off') this._set(f.key, '');
      else this._set(f.key, mode === 'custom' ? cur : 'sensor.');
    };
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="color-ctrl">
          <select @change=${(e) => setMode(e.target.value)}>
            <option value="auto" ?selected=${mode === 'auto'}>Auto (discover)</option>
            <option value="off" ?selected=${mode === 'off'}>Off</option>
            <option value="custom" ?selected=${mode === 'custom'}>Custom…</option>
          </select>
          ${mode === 'custom' ? html`
            <input type="text" list="esc-sensor-list" .value=${cur} placeholder="sensor.… or mdi:…"
              @input=${(e) => this._set(f.key, e.target.value)}>
            <datalist id="esc-sensor-list">${sensors.map(id => html`<option value=${id}></option>`)}</datalist>` : ''}
        </div>
      </div>`;
  }

  // reorderable list of fixed items (cover internals order)
  _rowOrder(f) {
    const def = f.items.map(i => i[0]);
    const stored = this._value(f.key);
    const cur = (Array.isArray(stored) && stored.length) ? [...stored] : [...def];
    const full = [...cur, ...def.filter(k => !cur.includes(k))];
    const label = (k) => (f.items.find(i => i[0] === k) || [k, k])[1];
    const commit = (arr) => this._set(f.key, JSON.stringify(arr) === JSON.stringify(def) ? [] : arr);
    const move = (i, dir) => {
      const j = i + dir; if (j < 0 || j >= full.length) return;
      const a = [...full]; [a[i], a[j]] = [a[j], a[i]]; commit(a);
    };
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${full.map((k, i) => html`
          <div class="ent-row">
            <span style="flex:1 1 auto;">${label(k)}</span>
            <button class="ent-ic" title="Move up" @click=${() => move(i, -1)}>↑</button>
            <button class="ent-ic" title="Move down" @click=${() => move(i, 1)}>↓</button>
          </div>`)}
      </div>`;
  }

  // dropdown of built-in + shared-library button styles (area selector buttons)
  _rowButtonStyle(f) {
    const cur = this._value(f.key) || '';
    const opts = [['', 'Default (card style)'], ['__basic_theme__', 'Basic Theme (built-in)'], ['__neon_lux__', 'Neon Lux (built-in)']];
    const map = buttonStyleLibraryMap();
    Object.keys(map).forEach(slug => opts.push(['lib:' + slug, `${map[slug].name || slug} (library)`]));
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => this._set(f.key, e.target.value)}>
          ${opts.map(([v, l]) => html`<option value=${v} ?selected=${String(cur) === String(v)}>${l}</option>`)}
        </select>
      </div>`;
  }

  // per-stop gradient editor: list of {pos,color}; empty = fall back to the preset pattern
  _rowGradientStops(f) {
    const stops = Array.isArray(this._val(f)) ? this._val(f) : [];
    const commit = (arr) => this._put(f, arr);
    const add = () => commit([...stops, { pos: stops.length ? 100 : 0, color: '#2196F3' }]);
    const setStop = (i, patch) => commit(stops.map((s, k) => k === i ? { ...s, ...patch } : s));
    const del = (i) => commit(stops.filter((_, k) => k !== i));
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${stops.map((s, i) => html`
          <div class="ent-row">
            <input type="range" min="0" max="100" step="1" style="flex:1 1 auto;" .value=${Number(s.pos) || 0}
              @input=${(e) => setStop(i, { pos: Number(e.target.value) })}>
            <span class="slider-val">${Number(s.pos) || 0}%</span>
            <input type="color" .value=${/^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : '#2196F3'}
              @input=${(e) => setStop(i, { color: e.target.value })}>
            <button class="ent-ic del" title="Remove" @click=${() => del(i)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>`)}
        <div class="chip-add"><button class="add-btn" @click=${add}>+ Stop</button></div>
      </div>`;
  }

  // map of area-name|entity-id → { shutter_preset } — per-area / per-entity image presets.
  // f.kind: 'area' | 'entity'
  _rowPresetMap(f) {
    const raw = this._value(f.key);
    const map = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const presets = [...C.ESC_TYPES, C.ESC_COMPACT];
    const keyOptions = f.kind === 'area'
      ? (this.hass ? Object.values(this.hass.areas || {}).map(a => a.name).filter(Boolean).sort() : [])
      : (this.hass ? Object.keys(this.hass.states).filter(id => id.startsWith('cover.')).sort() : []);
    const entries = Object.keys(map);
    const setEntry = (k, preset) => this._setNested(f.key, k, preset ? { [C.CONFIG_SHUTTER_PRESET]: preset } : null);
    const addId = `pm-add-${f.key}`, presetId = `pm-preset-${f.key}`, listId = `pm-list-${f.key}`;
    const add = () => {
      const kIn = this.renderRoot.querySelector(`#${addId}`);
      const k = (kIn?.value || '').trim();
      const p = this.renderRoot.querySelector(`#${presetId}`)?.value || presets[0];
      if (!k) return;
      setEntry(k, p);
      if (kIn) kIn.value = '';
    };
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${entries.length ? entries.map(k => html`
          <div class="ent-row">
            <span style="flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title=${k}>${k}</span>
            <select @change=${(e) => setEntry(k, e.target.value)}>
              ${presets.map(p => html`<option value=${p} ?selected=${map[k]?.[C.CONFIG_SHUTTER_PRESET] === p}>${p}</option>`)}
            </select>
            <button class="ent-ic del" title="Remove" @click=${() => setEntry(k, null)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>`) : ''}
        <div class="chip-add">
          <input id=${addId} type="text" list=${listId} placeholder=${f.kind === 'area' ? 'area name…' : 'cover.…'}
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}>
          <datalist id=${listId}>${keyOptions.map(o => html`<option value=${o}></option>`)}</datalist>
          <select id=${presetId}>${presets.map(p => html`<option value=${p}>${p}</option>`)}</select>
          <button class="add-btn" @click=${add}>Add</button>
        </div>
      </div>`;
  }

  // per-area panel-rotation override map (v2026.09.24.84): { area name/id: 'normal'|'left'|'right' }.
  // Simpler than _rowPresetMap — the value is a plain rotation string, not a nested preset object.
  _rowOrientationMap(f) {
    const raw = this._value(f.key);
    const map = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const rotations = [
      [C.PANEL_ROTATION_NORMAL, 'Normal'], [C.PANEL_ROTATION_LEFT, 'Left'], [C.PANEL_ROTATION_RIGHT, 'Right'],
    ];
    const areaNames = this.hass ? Object.values(this.hass.areas || {}).map(a => a.name).filter(Boolean).sort() : [];
    const entries = Object.keys(map);
    const setEntry = (k, rotation) => this._setNested(f.key, k, rotation && rotation !== C.PANEL_ROTATION_NORMAL ? rotation : null);
    const addId = `om-add-${f.key}`, rotId = `om-rot-${f.key}`, listId = `om-list-${f.key}`;
    const add = () => {
      const kIn = this.renderRoot.querySelector(`#${addId}`);
      const k = (kIn?.value || '').trim();
      const r = this.renderRoot.querySelector(`#${rotId}`)?.value || C.PANEL_ROTATION_LEFT;
      if (!k) return;
      setEntry(k, r);
      if (kIn) kIn.value = '';
    };
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${entries.length ? entries.map(k => html`
          <div class="ent-row">
            <span style="flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title=${k}>${k}</span>
            <select @change=${(e) => setEntry(k, e.target.value)}>
              ${rotations.map(([val, lbl]) => html`<option value=${val} ?selected=${(map[k] || C.PANEL_ROTATION_NORMAL) === val}>${lbl}</option>`)}
            </select>
            <button class="ent-ic del" title="Remove" @click=${() => setEntry(k, null)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>`) : ''}
        <div class="chip-add">
          <input id=${addId} type="text" list=${listId} placeholder="area name…"
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}>
          <datalist id=${listId}>${areaNames.map(o => html`<option value=${o}></option>`)}</datalist>
          <select id=${rotId}>${rotations.filter(([val]) => val !== C.PANEL_ROTATION_NORMAL).map(([val, lbl]) => html`<option value=${val}>${lbl}</option>`)}</select>
          <button class="add-btn" @click=${add}>Add</button>
        </div>
      </div>`;
  }

  // layout preset selector (v2026.09.24.87): one-click bundles of placement/orientation keys.
  // Applying writes each layout key (defaults pruned) in a single emit; the dropdown reflects the
  // active preset, or "Custom" once any layout key is tweaked away from a preset's values.
  _activePreset(list) {
    return list.find(p =>
      Object.entries(p.config).every(([k, v]) => this._value(k) === v));
  }
  _applyPreset(list, id) {
    const preset = list.find(p => p.id === id);
    if (!preset) return;
    const next = { ...this._config };
    for (const [k, v] of Object.entries(preset.config)) {
      if (this._isDefault(k, v)) delete next[k]; else next[k] = v;
    }
    this._emit(next);
  }

  // generic compact checkbox row (v2026.09.24.97): several boolean keys as inline checkboxes on one
  // line — far denser than a stack of switches. items: [{key, label, default?}]. `boolTrueDefault`
  // items treat undefined as checked (for show_* keys that default on).
  _rowCheckRow(f) {
    const items = (f.items || []).filter(it => !it.when || it.when(this));
    // items may address a sub-key of an object-valued config key (e.g. auto_filter.exclude_hidden)
    const get = (it) => it.nested ? this._nestedValue(it.key, it.nested, it.def ?? false) : this._val(it);
    const put = (it, v) => it.nested
      ? this._setNested(it.key, it.nested, (it.def && !v) ? false : (v || null))
      : this._put(it, v);
    const cb = (it) => {
      const on = !!get(it);
      return html`<label class="ecs-check" title=${it.hint || ''}>
        <input type="checkbox" .checked=${on} @change=${(e) => put(it, e.target.checked)}>
        <span>${it.label}</span></label>`;
    };
    return html`
      <div class="ecs-check-row">
        ${f.label ? html`<span class="row-label">${f.label}</span>` : ''}
        <div class="ecs-check-items">${items.map(cb)}</div>
      </div>`;
  }

  // compact divider-sides matrix (v2026.09.24.91): two rows (Group / Individual), each with four
  // Left/Right/Top/Bottom checkboxes inline — far denser than one switch per side.
  _rowDividerSides(f) {
    const cb = (key, label) => {
      const on = !!this._value(key);
      return html`<label class="ecs-check"><input type="checkbox" .checked=${on}
        @change=${(ev) => this._set(key, ev.target.checked)}><span>${label}</span></label>`;
    };
    const rowFor = (label, keys) => html`
      <div class="ecs-check-row">
        <span class="row-label">${label}</span>
        <div class="ecs-check-items">
          ${cb(keys[0], 'Left')}${cb(keys[1], 'Right')}${cb(keys[2], 'Top')}${cb(keys[3], 'Bottom')}
        </div>
      </div>`;
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || 'Draw a divider on each ticked side. Left/Right are vertical lines, Top/Bottom horizontal.'}>${f.label}</label>
        ${rowFor('Group', [C.CONFIG_GROUP_DIVIDER_LEFT, C.CONFIG_GROUP_DIVIDER_RIGHT, C.CONFIG_GROUP_DIVIDER_TOP, C.CONFIG_GROUP_DIVIDER_BOTTOM])}
        ${rowFor('Individual', [C.CONFIG_IND_DIVIDER_LEFT, C.CONFIG_IND_DIVIDER_RIGHT, C.CONFIG_IND_DIVIDER_TOP, C.CONFIG_IND_DIVIDER_BOTTOM])}
      </div>`;
  }

  // modern (bar) style picker: Default + built-in slugs + library entries (lib:<slug>)
  _rowModernStyle(f) {
    const cur = this._value(f.key);
    const curStr = (typeof cur === 'string') ? cur : '';
    const builtins = builtinModernStyles();
    const lib = modernStyleLibraryMap();
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => this._set(f.key, e.target.value === '__default__' ? '' : e.target.value)}>
          <option value="__default__" ?selected=${!curStr}>Default (built-in)</option>
          <optgroup label="Built-in">
            ${Object.keys(builtins).map(slug => html`<option value=${slug} ?selected=${curStr === slug}>${builtins[slug].name}</option>`)}
          </optgroup>
          ${Object.keys(lib).length ? html`<optgroup label="Library">
            ${Object.keys(lib).map(slug => html`<option value=${'lib:' + slug} ?selected=${curStr === 'lib:' + slug}>${lib[slug].name || slug}</option>`)}
          </optgroup>` : ''}
        </select>
      </div>`;
  }

  // eye toggle for an element's show/hide (boolean config key; default = shown)
  _eyeToggle(key) {
    const shown = this._value(key) !== false;
    return html`<ha-icon-button class="eye-btn" title=${shown ? 'Shown — click to hide' : 'Hidden — click to show'}
      @click=${(e) => { e.stopPropagation(); this._set(key, !shown); }}>
      <ha-icon icon=${shown ? 'mdi:eye' : 'mdi:eye-off'} style=${shown ? '' : 'opacity:0.45;'}></ha-icon>
    </ha-icon-button>`;
  }
  _togglePos(id) { this._posOpen = { ...(this._posOpen || {}), [id]: !(this._posOpen || {})[id] }; }
  // expandable element subpanel (Color-card Buttons style): collapsed row with eye + chevron; expands its fields
  _renderExpandItem(f) {
    const open = !!(this._posOpen && this._posOpen[f.id]);
    const shown = f.eyeKey ? (this._value(f.eyeKey) !== false) : true;
    return html`
      <div class="pos-item ${open ? 'open' : ''}">
        <div class="pos-item-head" @click=${() => this._togglePos(f.id)}>
          ${f.icon ? html`<ha-icon class="pos-item-ic" icon=${f.icon}></ha-icon>` : ''}
          <span class="pos-item-title" style=${shown ? '' : 'opacity:0.5;'}>${f.label}</span>
          ${f.eyeKey ? this._eyeToggle(f.eyeKey) : ''}
          <ha-icon class="pos-chev" icon="mdi:chevron-down"></ha-icon>
        </div>
        ${open ? html`<div class="pos-item-body">
          ${(f.fields || []).filter(x => !x.when || x.when(this)).map(x => this._renderField(x))}
        </div>` : ''}
      </div>`;
  }

  _renderField(f) {
    let inner = this._renderFieldInner(f);
    // rows carrying an eyeKey get a show/hide eye button on the far right (after the control).
    // 'item' rows render their own eye in the header — don't double it.
    if (f.eyeKey && f.type !== 'item') {
      inner = html`<div class="eye-row" style="display:flex;align-items:center;gap:6px;">
        <div style="flex:1 1 auto;min-width:0;">${inner}</div>${this._eyeToggle(f.eyeKey)}</div>`;
    }
    return inner;
  }

  _renderFieldInner(f) {
    switch (f.type) {
      case 'group':       return html`<div class="group-title">${f.label}</div>`;
      case 'note':        return html`<div class="hint" style="padding:4px 0 8px;">${f.label}</div>`;
      case 'eye':         return html`<div class="row"><label class="row-label" title=${f.hint || ''}>${f.label}</label>${this._eyeToggle(f.key)}</div>`;
      case 'item':        return this._renderExpandItem(f);
      case 'presetMap':   return this._rowPresetMap(f);
      case 'imageSelect': return this._rowImageSelect(f);
      case 'modernStyle': return this._rowModernStyle(f);
      case 'buttonStyle': return this._rowButtonStyle(f);
      case 'orientationMap': return this._rowOrientationMap(f);
      case 'dividerSides': return this._rowDividerSides(f);
      case 'checkRow': return this._rowCheckRow(f);
      case 'gradientStops': return this._rowGradientStops(f);
      case 'color':       return this._rowColor(f);
      case 'framePicker': return this._rowFramePicker(f);
      case 'entityCombo': return this._rowEntityCombo(f);
      case 'order':    return this._rowOrder(f);
      case 'scale':    return this._rowScale(f);
      case 'slider':   return this._rowSlider(f);
      case 'switch':   return this._rowSwitch(f);
      case 'select':   return this._rowSelect(f);
      case 'number':   return this._rowNumber(f);
      case 'text':     return this._rowText(f);
      case 'chips':    return this._rowChips(f);
      case 'multi':    return this._rowMulti(f);
      case 'entities': return this._rowPickList({...f, kind: 'entity', reorder: true});
      case 'pickList': return this._rowPickList(f);
      case 'coverStyleDefault': return this._rowCoverStyleDefault(f);
      case 'coverStyleAreas': return this._rowCoverStyleAreas(f);
      case 'coverStyleEntities': return this._rowCoverStyleEntities(f);
      case 'coverSources': return this._rowCoverSources(f);
      case 'tdbuMap': return this._rowTdbuMap(f);
      default:         return html``;
    }
  }

  // unified accordion: opening one panel closes the others (CARD_DESIGN_SYSTEM.md §2)
  _togglePanel(id) {
    const willOpen = !this._openPanels[id];
    this._openPanels = willOpen ? { [id]: true } : {};
  }

  _renderPanel(panel) {
    const open = !!this._openPanels[panel.id];
    return html`
      <details class="panel ${open ? 'open' : ''}" ?open=${open}
        @toggle=${(e) => { if (e.target.open !== open) this._togglePanel(panel.id); }}>
        <summary class="panel-sum">
          <ha-icon class="panel-ic" icon=${panel.icon || 'mdi:cog-outline'}></ha-icon>
          <span class="panel-sum-title">${panel.title}</span>
          <ha-icon class="panel-chev" icon="mdi:chevron-down"></ha-icon>
        </summary>
        <div class="panel-body">
          ${panel.hint ? html`<div class="hint">${panel.hint}</div>` : ''}
          ${panel.fields.filter(f => !f.when || f.when(this)).map(f => this._renderField(f))}
        </div>
      </details>`;
  }

  // minimal YAML dump for the (flat + shallow) card config shape
  _configYaml() {
    const cfg = this._config || {};
    const scalar = (v) => typeof v === 'string'
      ? (/[:#]|^\s|\s$|^$/.test(v) ? JSON.stringify(v) : v)
      : String(v);
    const lines = [];
    for (const [k, v] of Object.entries(cfg)) {
      if (Array.isArray(v)) {
        if (v.length === 0) { lines.push(`${k}: []`); continue; }
        lines.push(`${k}:`);
        for (const item of v) {
          if (item && typeof item === 'object') {
            const es = Object.entries(item);
            lines.push(`  - ${es[0][0]}: ${scalar(es[0][1])}`);
            for (let i = 1; i < es.length; i++) lines.push(`    ${es[i][0]}: ${scalar(es[i][1])}`);
          } else lines.push(`  - ${scalar(item)}`);
        }
      } else if (v && typeof v === 'object') {
        lines.push(`${k}:`);
        for (const [sk, sv] of Object.entries(v)) {
          if (Array.isArray(sv)) { lines.push(`  ${sk}:`); sv.forEach(x => lines.push(`    - ${scalar(x)}`)); }
          else lines.push(`  ${sk}: ${scalar(sv)}`);
        }
      } else {
        lines.push(`${k}: ${scalar(v)}`);
      }
    }
    return lines.join('\n');
  }
  _renderYamlPanel() {
    const open = !!this._openPanels['yaml'];
    return html`
      <details class="panel ${open ? 'open' : ''}" ?open=${open}
        @toggle=${(e) => { if (e.target.open !== open) this._togglePanel('yaml'); }}>
        <summary class="panel-sum">YAML preview</summary>
        <div class="panel-body">
          <div class="hint">Read-only. Only settings that differ from the defaults are written.</div>
          <pre class="yaml">${this._configYaml()}</pre>
        </div>
      </details>`;
  }

  _renderGroupDivider(label) {
    return html`<div class="ed-group-divider"><span>${label}</span></div>`;
  }

  render() {
    if (!this._config) return html``;
    this._subscribeLibraries();
    const schema = buildSchema(C);
    // No 'Card' divider: with the panels consolidated, everything above Libraries is card-level.
    const GROUPS = { positions: 'Individual Panels' };
    return html`
      <div class="ed">
        <div class="ed-header">
          <span class="ed-title">${C.CARD_DISPLAY_NAME}</span>
          <span class="ed-build">${C.CARD_VERSION}</span>
        </div>
        ${this._rowSwitch({key: C.CONFIG_PASSIVE_MODE, label: 'Design Mode'})}
        <div class="hint" style="margin:-6px 0 10px;">Enable this to edit the design without sending cover commands.</div>
        ${schema.filter(p => !p.when || p.when(this)).map(p => html`
          ${GROUPS[p.id] ? this._renderGroupDivider(GROUPS[p.id]) : ''}
          ${this._renderPanel(p)}`)}
        ${this._renderGroupDivider('Libraries')}
        ${this._renderButtonStyleLibrary()}
        ${this._renderModernStyleLibrary()}
        ${this._renderCoverStyleLibrary()}
        ${this._renderYamlPanel()}
      </div>`;
  }

  // ===== Button Styles library (create/edit presets in the shared store) =====
  _styleGroups() { return (this._styleDraft && this._styleDraft.layers && this._styleDraft.layers[0] && this._styleDraft.layers[0].groups) || {}; }
  _styleG(k) { return this._styleGroups()[k]; }
  _styleSetG(k, v) {
    if (this._styleReadOnly) return;
    const d = JSON.parse(JSON.stringify(this._styleDraft));
    d.layers[0].groups[k] = v;
    this._styleDraft = d;
  }
  _styleActiveGlow() { return !!(this._styleDraft && this._styleDraft.layers && this._styleDraft.layers.length > 1); }
  _styleToggleActiveGlow(on) {
    const d = JSON.parse(JSON.stringify(this._styleDraft));
    d.layers = [d.layers[0]];
    if (on) d.layers.push({ groups: { button_glow_enabled: true, button_glow_color: '#2196F3', button_glow_color_mode: 'fixed', button_glow_blur: 8, button_glow_spread: 2, button_glow_opacity: 0.5, button_glow_condition: 'when_active' }, when: { type: 'button_active' }, label: 'Active glow' });
    this._styleDraft = d;
  }
  _styleNew() {
    this._styleSlug = '__new__';
    this._styleDraft = newButtonStyleEntry('New style');
  }
  _styleEdit(slug) {
    const e = buttonStyleLibraryMap()[slug];
    if (!e) return;
    this._styleSlug = slug;
    this._styleDraft = JSON.parse(JSON.stringify(e));
  }
  _styleClose() { this._styleSlug = null; this._styleDraft = null; this._styleReadOnly = false; }
  _styleSave() {
    if (!this.hass || !this._styleDraft || this._styleReadOnly) return;
    const map = { ...buttonStyleLibraryMap() };
    let slug = this._styleSlug;
    if (slug === '__new__') slug = slugifyStyleName(this._styleDraft.name);
    map[slug] = { name: this._styleDraft.name || slug, kind: 'button', layers: this._styleDraft.layers };
    saveButtonStyleLibrary(this.hass, map).then(() => this.requestUpdate()).catch(() => {});
    this._styleClose();
  }
  _styleDuplicate(slug) {
    const e = buttonStyleLibraryMap()[slug]; if (!e) return;
    this._styleSlug = '__new__';
    this._styleDraft = { ...JSON.parse(JSON.stringify(e)), name: `${e.name || slug} copy` };
  }
  _styleDelete(slug) {
    if (!this.hass) return;
    const map = { ...buttonStyleLibraryMap() }; delete map[slug];
    saveButtonStyleLibrary(this.hass, map).then(() => this.requestUpdate()).catch(() => {});
  }

  // bound appearance controls (write into the draft's base-layer groups)
  _sbSwitch(k, label) {
    return html`<div class="row"><label class="row-label">${label}</label>
      <input type="checkbox" class="ecs-switch-cb" .checked=${!!this._styleG(k)} @change=${(e) => this._styleSetG(k, e.target.checked)}></div>`;
  }
  _sbSelect(k, label, opts) {
    const cur = this._styleG(k);
    return html`<div class="row"><label class="row-label">${label}</label>
      <select @change=${(e) => this._styleSetG(k, e.target.value)}>
        ${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html`<option value=${v} ?selected=${String(cur) === String(v)}>${l}</option>`; })}
      </select></div>`;
  }
  _sbSlider(k, label, min, max, step, unit) {
    const cur = Number(this._styleG(k)) || 0;
    return html`<div class="slider-row"><label class="row-label">${label}</label>
      <input type="range" min=${min} max=${max} step=${step} .value=${cur} @input=${(e) => this._styleSetG(k, Number(e.target.value))}>
      <span class="slider-val">${cur}${unit || ''}</span></div>`;
  }
  _sbColor(k, label) {
    const cur = this._styleG(k) || '';
    const mode = this._colorMode(cur);
    const setMode = (m) => {
      if (m === 'default') this._styleSetG(k, '');
      else if (m === 'theme') this._styleSetG(k, (mode === 'theme' && cur) || AT_THEME_COLORS[0][0]);
      else if (m === 'custom') this._styleSetG(k, /^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#2196F3');
      else this._styleSetG(k, mode === 'css' ? cur : '');
    };
    return html`<div class="row"><label class="row-label">${label}</label>
      <div class="color-ctrl">
        <select @change=${(e) => setMode(e.target.value)}>
          <option value="default" ?selected=${mode === 'default'}>None</option>
          <option value="theme" ?selected=${mode === 'theme'}>Theme</option>
          <option value="custom" ?selected=${mode === 'custom'}>Custom</option>
          <option value="css" ?selected=${mode === 'css'}>CSS</option>
        </select>
        ${mode === 'theme' ? html`<select @change=${(e) => this._styleSetG(k, e.target.value)}>${AT_THEME_COLORS.map(([v, l]) => html`<option value=${v} ?selected=${v === cur}>${l}</option>`)}</select>` : ''}
        ${mode === 'custom' ? html`<input type="color" .value=${/^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#2196F3'} @input=${(e) => this._styleSetG(k, e.target.value)}>` : ''}
        ${mode === 'css' ? html`<input type="text" .value=${cur} @input=${(e) => this._styleSetG(k, e.target.value)}>` : ''}
      </div></div>`;
  }
  _renderStyleEditor() {
    const ro = !!this._styleReadOnly;
    return html`
      <div class="hint">${ro
        ? html`Built-in style — settings are shown read-only. Duplicate it to make an editable copy.`
        : html`Editing a shared Button Style. Saved to the same library the Color Light &amp; Scene Manager card uses.`}</div>
      ${this._renderButtonPreview(this._styleDraft)}
      <fieldset ?disabled=${ro} style="border:0;padding:0;margin:0;min-width:0;">
      <div class="row"><label class="row-label">Name</label>
        <input type="text" .value=${this._styleDraft.name || ''} @input=${(e) => { const d = { ...this._styleDraft, name: e.target.value }; this._styleDraft = d; }}></div>
      <div class="group-title">Background</div>
      ${this._sbSelect('button_style', 'Fill', [['theme', 'Theme surface'], ['solid', 'Solid (accent)'], ['transparent', 'Transparent'], ['tinted', 'Tinted'], ['tile', 'Tile']])}
      ${this._sbSlider('button_border_radius', 'Corner radius', 0, 30, 1, 'px')}
      ${this._sbSlider('button_height', 'Min height', 0, 80, 1, 'px')}
      ${this._sbSlider('button_max_width', 'Max width (0=auto)', 0, 400, 5, 'px')}
      <div class="group-title">Border</div>
      ${this._sbSwitch('button_border_enabled', 'Border')}
      ${this._sbSlider('button_border_width', 'Border width', 0, 8, 1, 'px')}
      ${this._sbSelect('button_border_color_mode', 'Border color', [['fixed', 'Custom'], ['match', 'Accent']])}
      ${this._sbColor('button_border_color', 'Border color value')}
      <div class="group-title">Glow</div>
      ${this._sbSwitch('button_glow_enabled', 'Glow')}
      ${this._sbSelect('button_glow_condition', 'When', [['always', 'Always'], ['when_active', 'When active']])}
      ${this._sbColor('button_glow_color', 'Glow color')}
      ${this._sbSlider('button_glow_blur', 'Glow blur', 0, 40, 1, 'px')}
      ${this._sbSlider('button_glow_spread', 'Glow spread', -10, 20, 1, 'px')}
      ${this._sbSlider('button_glow_opacity', 'Glow opacity', 0, 1, 0.05, '')}
      <div class="group-title">Shadow</div>
      ${this._sbSwitch('button_shadow_enabled', 'Drop shadow')}
      ${this._sbSlider('button_shadow_y', 'Shadow Y', 0, 30, 1, 'px')}
      ${this._sbSlider('button_shadow_blur', 'Shadow blur', 0, 40, 1, 'px')}
      ${this._sbSlider('button_shadow_opacity', 'Shadow opacity', 0, 1, 0.05, '')}
      <div class="group-title">Text &amp; icon</div>
      ${this._sbSlider('button_font_size', 'Text size', 8, 30, 1, 'px')}
      ${this._sbSelect('button_name_weight', 'Text weight', [['400', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold']])}
      ${this._sbSelect('button_name_color_mode', 'Text color', [['inherit', 'Inherit'], ['fixed', 'Custom'], ['match', 'Accent']])}
      ${this._sbColor('button_name_color', 'Text color value')}
      <div class="row"><label class="row-label">Icon (mdi:…)</label>
        <input type="text" .value=${this._styleG('button_icon') || ''} @input=${(e) => this._styleSetG('button_icon', e.target.value)}></div>
      ${this._sbSlider('button_icon_size', 'Icon size (0=auto)', 0, 48, 1, 'px')}
      <div class="group-title">Overlay</div>
      <div class="row"><label class="row-label">Add glow when active</label>
        <input type="checkbox" class="ecs-switch-cb" .checked=${this._styleActiveGlow()} @change=${(e) => this._styleToggleActiveGlow(e.target.checked)}></div>
      </fieldset>
      <div class="style-actions">
        ${ro ? html`<button class="ent-ic" @click=${() => this._styleClose()}>Close</button>` : html`
        <button class="add-btn" @click=${() => this._styleSave()}>Save</button>
        <button class="ent-ic" @click=${() => this._styleClose()}>Cancel</button>`}
      </div>`;
  }
  // v2026.09.24.183: sample area buttons (normal + active) for any button style stack
  _renderButtonPreview(stack, compact = false) {
    const accent = 'var(--primary-color, #2196F3)';
    const one = (active, label) => {
      const appr = buttonAppearanceFromStack(stack, active);
      const ic = _bsIcon(appr, active, accent);
      const base = `box-sizing:border-box;white-space:nowrap;text-align:center;font-family:inherit;font-size:15px;
        padding:${compact ? '8px 12px' : '12px 16px'};border:1px solid var(--divider-color,#3a3a3a);border-radius:10px;
        color:${active ? accent : 'var(--primary-text-color,#e1e1e1)'};cursor:default;`;
      return html`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="${base}${areaButtonStyle(appr, active, accent)}">${ic ? html`<ha-icon icon=${ic.icon} style=${ic.style}></ha-icon> ` : ''}Kitchen</div>
        <span class="hint">${label}</span></div>`;
    };
    return html`<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;padding:${compact ? '6px 0 8px' : '10px 0 4px'};">
      ${one(false, 'Normal')}${one(true, 'Active')}</div>`;
  }
  _btnPreviewBtn(slug) {
    const on = this._btnPreviewSlug === slug;
    return html`<button class="ent-ic" title=${on ? 'Hide preview' : 'Preview'}
      @click=${() => { this._btnPreviewSlug = on ? null : slug; this.requestUpdate(); }}>
      <ha-icon icon=${on ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></ha-icon></button>`;
  }
  // built-ins open read-only: every setting is visible, nothing can be changed or saved
  _styleView(slug) {
    const b = builtinButtonStyles()[slug]; if (!b) return;
    this._styleSlug = slug; this._styleReadOnly = true;
    this._styleDraft = { name: b.name, kind: 'button', layers: JSON.parse(JSON.stringify(b.layers)) };
  }
  _renderButtonStyleLibrary() {
    const open = !!this._openPanels['btnlib'];
    const map = buttonStyleLibraryMap();
    const builtins = builtinButtonStyles();
    return html`
      <details class="panel ${open ? 'open' : ''}" ?open=${open}
        @toggle=${(e) => { if (e.target.open !== open) this._togglePanel('btnlib'); }}>
        <summary class="panel-sum">
          <ha-icon class="panel-ic" icon="mdi:palette-swatch"></ha-icon>
          <span class="panel-sum-title">Button Styles</span>
          <ha-icon class="panel-chev" icon="mdi:chevron-down"></ha-icon>
        </summary>
        <div class="panel-body">
          <div class="hint">Shared library (same store as the Color Light &amp; Scene Manager card). Use a style from Covers &amp; Styles → Area Button Style, or in a Cover Style's Position Buttons.</div>
          ${this._styleDraft ? this._renderStyleEditor() : html`
            <div class="chip-add"><button class="add-btn" @click=${() => this._styleNew()}>New style</button></div>
            ${Object.keys(builtins).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:lock-outline"></ha-icon>
                <span style="flex:1 1 auto;">${builtins[slug].name} <span class="hint">built-in</span></span>
                ${this._btnPreviewBtn(slug)}
                <button class="ent-ic" title="View settings (read-only)" @click=${() => this._styleView(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => { this._styleSlug = '__new__'; this._styleDraft = { name: builtins[slug].name + ' copy', kind: 'button', layers: JSON.parse(JSON.stringify(builtins[slug].layers)) }; }}>⧉</button>
              </div>${this._btnPreviewSlug === slug ? this._renderButtonPreview(builtins[slug], true) : ''}`)}
            ${Object.keys(map).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:palette-swatch-outline"></ha-icon>
                <span style="flex:1 1 auto;">${map[slug].name || slug} <span class="hint">${(map[slug].layers || []).length} layer(s)</span></span>
                ${this._btnPreviewBtn(slug)}
                <button class="ent-ic" title="Edit" @click=${() => this._styleEdit(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => this._styleDuplicate(slug)}>⧉</button>
                <button class="ent-ic del" title="Delete" @click=${() => this._styleDelete(slug)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
              </div>${this._btnPreviewSlug === slug ? this._renderButtonPreview(map[slug], true) : ''}`)}
          `}
        </div>
      </details>`;
  }

  // ===== Slider Styles library (modern bar visuals; shared System-scope store) =====
  _mGroups() { return (this._modernDraft && this._modernDraft.groups) || {}; }
  _mG(k) { const g = this._mGroups(); return (k in g) ? g[k] : MODERN_STYLE_DEFAULT[k]; }
  _mSetG(k, v) { if (this._modernReadOnly) return; const d = JSON.parse(JSON.stringify(this._modernDraft)); d.groups[k] = v; this._modernDraft = d; }
  // pseudo-field bound to a draft group key, usable by the generic get/set-aware renderers
  _mField(key, extra) { return { key: 'm:' + key, get: () => this._mG(key), set: (v) => this._mSetG(key, v), ...extra }; }
  _modernNew() { this._modernSlug = '__new__'; this._modernDraft = newModernStyleEntry('New slider style'); }
  _modernEdit(slug) { const e = modernStyleLibraryMap()[slug]; if (!e) return; this._modernSlug = slug; this._modernDraft = JSON.parse(JSON.stringify(e)); }
  _modernClose() { this._modernSlug = null; this._modernDraft = null; this._modernReadOnly = false; }
  // v2026.09.24.184: built-ins open read-only — every setting visible, nothing can change or save
  _modernView(slug) {
    const b = builtinModernStyles()[slug]; if (!b) return;
    this._modernSlug = slug; this._modernReadOnly = true;
    this._modernDraft = { name: b.name, groups: JSON.parse(JSON.stringify(b.groups)) };
  }
  _modernSave() {
    if (!this.hass || !this._modernDraft || this._modernReadOnly) return;
    const map = { ...modernStyleLibraryMap() };
    let slug = this._modernSlug;
    if (slug === '__new__') slug = slugifyModernName(this._modernDraft.name);
    map[slug] = { name: this._modernDraft.name || slug, groups: this._modernDraft.groups };
    saveModernStyleLibrary(this.hass, map).then(() => this.requestUpdate()).catch(() => {});
    this._modernClose();
  }
  _modernDuplicate(slug) { const e = modernStyleLibraryMap()[slug]; if (!e) return; this._modernSlug = '__new__'; this._modernDraft = { name: `${e.name || slug} copy`, groups: JSON.parse(JSON.stringify(e.groups || {})) }; }
  _modernDelete(slug) { if (!this.hass) return; const map = { ...modernStyleLibraryMap() }; delete map[slug]; saveModernStyleLibrary(this.hass, map).then(() => this.requestUpdate()).catch(() => {}); }
  // live preview of the draft style (open / opening / closed states)
  // v2026.09.24.180: renders ANY style's groups (the draft, a built-in or a library entry), so every
  // row of the library can show the same preview the style editor does. `compact` is the in-list size.
  _renderModernPreview(groups = this._modernDraft && this._modernDraft.groups, compact = false) {
    const style = resolveModernStyle(groups || {});
    const bw = compact ? 34 : 52, bh = compact ? 80 : 120;
    const bar = (pct, state, label) => {
      const fill = modernFillPaint(style, state);
      const glow = modernBarGlow(style, state);
      const glowOnFill = glow && style.glow_target === 'fill';
      const rad = Number(style.bar_radius) || 0;
      const brd = Number(style.bar_border_width) > 0 ? `border:${style.bar_border_width}px solid ${style.bar_border_color};` : '';
      const barStyle = `width:${bw}px;height:${bh}px;position:relative;border-radius:${rad}px;overflow:${glowOnFill ? 'visible' : 'hidden'};background:${modernTrackColor(style)};${brd}${(glow && !glowOnFill) ? `box-shadow:${glow};` : ''}`;
      const fillStyle = `position:absolute;left:0;right:0;bottom:0;height:${pct}%;background:${fill};opacity:${modernFillOpacity(style)};${glowOnFill ? `box-shadow:${glow};border-radius:0 0 ${rad}px ${rad}px;` : ''}`;
      return html`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="${barStyle}"><div style="${fillStyle}"></div>${style.handle_show ? html`<div style="${modernHandleStyle(style, pct, fill)}"></div>` : ''}</div>
        <span class="hint">${label}</span></div>`;
    };
    return html`<div style="display:flex;gap:${compact ? 14 : 18}px;justify-content:center;padding:${compact ? '6px 0 8px' : '10px 0 4px'};">
      ${bar(70, 'open', 'Open')}${bar(45, 'opening', 'Moving')}${bar(12, 'closed', 'Closed')}
    </div>`;
  }
  _renderModernStyleEditor() {
    const gradient = this._mG('fill_mode') === 'gradient';
    const handle = !!this._mG('handle_show');
    const glow = !!this._mG('glow_enabled');
    const tilt = !!this._mG('tilt_show');
    const ro = !!this._modernReadOnly;
    return html`
      <div class="hint">${ro
        ? html`Built-in style — settings are shown read-only. Duplicate it to make an editable copy.`
        : html`Custom modern-bar style. Saved to the shared Slider Styles library; use it from a Cover Style's Color Slider group.`}</div>
      <fieldset ?disabled=${ro} style="border:0;padding:0;margin:0;min-width:0;">
      <div class="row"><label class="row-label">Name</label>
        <input type="text" .value=${this._modernDraft.name || ''} @input=${(e) => { this._modernDraft = { ...this._modernDraft, name: e.target.value }; }}></div>
      ${this._renderModernPreview()}
      <div class="group-title">Track</div>
      ${this._rowSlider(this._mField('bar_radius', { label: 'Corner radius', min: 0, max: 40, step: 1, unit: 'px' }))}
      ${this._rowColor(this._mField('track_color', { label: 'Track (empty) colour', allowTransparent: true }))}
      ${this._rowSlider(this._mField('track_opacity', { label: 'Track opacity', min: 0, max: 1, step: 0.05 }))}
      ${this._rowSlider(this._mField('bar_border_width', { label: 'Border width', min: 0, max: 8, step: 1, unit: 'px' }))}
      ${this._mG('bar_border_width') > 0 ? this._rowColor(this._mField('bar_border_color', { label: 'Border colour' })) : ''}
      <div class="group-title">Bar Fill</div>
      ${this._rowSelect(this._mField('fill_mode', { label: 'Fill mode', options: [['state', 'Per state (solid)'], ['gradient', 'Gradient']] }))}
      ${gradient ? this._rowGradientStops({ key: 'm:fill_grad', label: 'Fill gradient', get: () => (this._mG('fill_gradient') || {}).stops || [], set: (arr) => this._mSetG('fill_gradient', { stops: arr }) }) : html`
        ${this._rowColor(this._mField('fill_open', { label: 'Open colour' }))}
        ${this._rowColor(this._mField('fill_closed', { label: 'Closed colour' }))}
        ${this._rowColor(this._mField('fill_moving', { label: 'Moving colour' }))}
      `}
      ${this._rowSlider(this._mField('fill_opacity', { label: 'Fill opacity', min: 0, max: 1, step: 0.05 }))}
      <div class="group-title">Handle</div>
      ${this._rowSwitch(this._mField('handle_show', { label: 'Show handle' }))}
      ${handle ? html`
        ${this._rowSelect(this._mField('handle_shape', { label: 'Handle shape', options: [['pill', 'Pill'], ['round', 'Round'], ['square', 'Square'], ['diamond', 'Diamond'], ['line', 'Line']] }))}
        ${this._rowSlider(this._mField('handle_size', { label: 'Handle size / width', min: 8, max: 80, step: 1, unit: 'px' }))}
        ${(this._mG('handle_shape') === 'pill' || this._mG('handle_shape') === 'line') ? this._rowSlider(this._mField('handle_thickness', { label: 'Handle thickness', min: 2, max: 30, step: 1, unit: 'px' })) : ''}
        ${this._rowSlider(this._mField('handle_radius', { label: 'Handle radius', min: 0, max: 20, step: 1, unit: 'px' }))}
        ${this._rowColor(this._mField('handle_color', { label: 'Handle colour' }))}
        ${this._rowSlider(this._mField('handle_opacity', { label: 'Handle opacity', min: 0, max: 1, step: 0.05 }))}
        ${this._rowSwitch(this._mField('handle_border', { label: 'Handle outline' }))}
        ${this._rowSwitch(this._mField('handle_glow', { label: 'Handle glow' }))}
        ${this._mG('handle_glow') ? this._rowColor(this._mField('handle_glow_color', { label: 'Handle glow colour (blank=fill)' })) : ''}
      ` : ''}
      <div class="group-title">Bar glow</div>
      ${this._rowSwitch(this._mField('glow_enabled', { label: 'Glow' }))}
      ${glow ? html`
        ${this._rowSelect(this._mField('glow_condition', { label: 'When', options: [['never', 'Never'], ['when_open', 'When open'], ['always', 'Always']] }))}
        ${this._rowSelect(this._mField('glow_target', { label: 'Glow area', options: [['bar', 'Whole bar'], ['fill', 'Open section only']] }))}
        ${this._rowColor(this._mField('glow_color', { label: 'Glow colour (blank=fill)' }))}
        ${this._rowSlider(this._mField('glow_blur', { label: 'Glow blur', min: 0, max: 40, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._mField('glow_spread', { label: 'Glow spread', min: -5, max: 20, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._mField('glow_opacity', { label: 'Glow opacity', min: 0, max: 1, step: 0.05 }))}
      ` : ''}
      <div class="group-title">Tilt bar</div>
      ${this._rowSwitch(this._mField('tilt_show', { label: 'Show tilt bar (tilt covers)' }))}
      ${tilt ? html`
        ${this._rowColor(this._mField('tilt_color', { label: 'Tilt bar colour' }))}
        ${this._rowSlider(this._mField('tilt_thickness', { label: 'Tilt bar thickness', min: 2, max: 20, step: 1, unit: 'px' }))}
      ` : ''}
      </fieldset>
      <div class="style-actions">
        ${ro ? html`<button class="ent-ic" @click=${() => this._modernClose()}>Close</button>` : html`
        ${this._modernSlug !== '__new__' ? html`<span class="hint" style="align-self:center;flex:1 1 auto;">Cards using this style follow your changes as you edit. Save to keep them; Cancel reverts.</span>` : ''}
        <button class="add-btn" @click=${() => this._modernSave()}>Save</button>
        <button class="ent-ic" @click=${() => this._modernClose()}>Cancel</button>`}
      </div>`;
  }
  _modernPreviewBtn(slug) {
    const on = this._modernPreviewSlug === slug;
    return html`<button class="ent-ic" title=${on ? 'Hide preview' : 'Preview'}
      @click=${() => { this._modernPreviewSlug = on ? null : slug; this.requestUpdate(); }}>
      <ha-icon icon=${on ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></ha-icon></button>`;
  }
  _modernPreviewRow(slug, groups) {
    return this._modernPreviewSlug === slug ? this._renderModernPreview(groups, true) : '';
  }
  _renderModernStyleLibrary() {
    const open = !!this._openPanels['sliderlib'];
    const map = modernStyleLibraryMap();
    const builtins = builtinModernStyles();
    return html`
      <details class="panel ${open ? 'open' : ''}" ?open=${open}
        @toggle=${(e) => { if (e.target.open !== open) this._togglePanel('sliderlib'); }}>
        <summary class="panel-sum">
          <ha-icon class="panel-ic" icon="mdi:tune-variant"></ha-icon>
          <span class="panel-sum-title">Slider Styles</span>
          <ha-icon class="panel-chev" icon="mdi:chevron-down"></ha-icon>
        </summary>
        <div class="panel-body">
          <div class="hint">Custom looks for the Modern bar visual. Use one from a Cover Style's Color Slider group.</div>
          ${this._modernDraft ? this._renderModernStyleEditor() : html`
            <div class="chip-add"><button class="add-btn" @click=${() => this._modernNew()}>New style</button></div>
            ${Object.keys(builtins).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:lock-outline"></ha-icon>
                <span style="flex:1 1 auto;">${builtins[slug].name} <span class="hint">built-in</span></span>
                ${this._modernPreviewBtn(slug)}
                <button class="ent-ic" title="View settings (read-only)" @click=${() => this._modernView(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => { this._modernSlug = '__new__'; this._modernDraft = { name: builtins[slug].name + ' copy', groups: JSON.parse(JSON.stringify(builtins[slug].groups)) }; }}>⧉</button>
              </div>${this._modernPreviewRow(slug, builtins[slug].groups)}`)}
            ${Object.keys(map).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:tune-variant"></ha-icon>
                <span style="flex:1 1 auto;">${map[slug].name || slug}</span>
                ${this._modernPreviewBtn(slug)}
                <button class="ent-ic" title="Edit" @click=${() => this._modernEdit(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => this._modernDuplicate(slug)}>⧉</button>
                <button class="ent-ic del" title="Delete" @click=${() => this._modernDelete(slug)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
              </div>${this._modernPreviewRow(slug, map[slug].groups)}`)}
          `}
        </div>
      </details>`;
  }

  // ===== Covers on this card: sources + per-row Cover Style (v117) ==========
  // ONE control that replaces the separate Areas / Labels / Covers pickers AND the style
  // assignment maps. A single search box plus a scope dropdown (Area | Label | Cover | Group)
  // decides what you are searching and which config key the pick lands in:
  //   Area  -> areas[]            Label -> labels[]
  //   Cover -> entities[]         Group -> entities[] (candidates limited to cover group helpers)
  // Each row then carries its own Cover Style; "Default" writes nothing, so the row simply falls
  // back to cover_style_default (and the YAML stays clean).
  _coverSourceScopes() {
    return [['area', 'Area'], ['label', 'Label'], ['entity', 'Cover'], ['group', 'Group']];
  }
  _isGroupCover(id) {
    const a = this.hass?.states?.[id]?.attributes;
    return !!(a && Array.isArray(a.entity_id) && a.entity_id.length);
  }
  _sourceCandidates(scope) {
    if (scope === 'group') {
      return this._coverIds().filter(id => this._isGroupCover(id))
        .map(id => ({ id, name: this._friendly(id), tag: 'group' }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    return this._pickCandidates(scope === 'entity' ? 'entity' : scope);
  }
  // rows currently configured, flattened across the three source keys
  _coverSourceRows() {
    const arr = (k) => { const v = this._value(k); return Array.isArray(v) ? v : []; };
    const rows = [];
    arr(C.CONFIG_AREAS).forEach(v => rows.push({ scope: 'area', value: v }));
    arr(C.CONFIG_LABELS).forEach(v => rows.push({ scope: 'label', value: v }));
    (this._entitiesList() || []).forEach(e => {
      const id = this._entityIdOf(e);
      rows.push({ scope: this._isGroupCover(id) ? 'group' : 'entity', value: id });
    });
    return rows;
  }
  _addCoverSource(scope, value) {
    const next = { ...this._config };
    if (scope === 'area' || scope === 'label') {
      const key = scope === 'area' ? C.CONFIG_AREAS : C.CONFIG_LABELS;
      const cur = Array.isArray(this._value(key)) ? this._value(key) : [];
      if (cur.includes(value)) return;
      next[key] = [...cur, value];
      this._emit(next);
      return;
    }
    const cur = this._entitiesList() || [];
    if (cur.some(e => this._entityIdOf(e) === value)) return;
    this._commitEntities([...cur, value]);
  }
  _removeCoverSource(scope, value) {
    const pm = this._value(C.CONFIG_AREA_PANELS);
    if (pm && Object.keys(pm).some(x => String(x).toLowerCase() === String(value).toLowerCase())) {
      this._setRowPanels({ value }, C.AREA_PANELS_BOTH);
    }
    if (scope === 'area' || scope === 'label') {
      const key = scope === 'area' ? C.CONFIG_AREAS : C.CONFIG_LABELS;
      const cur = Array.isArray(this._value(key)) ? this._value(key) : [];
      const left = cur.filter(v => v !== value);
      const next = { ...this._config };
      if (left.length) next[key] = left; else delete next[key];
      // also drop any style assignment that pointed at it
      const cs = { ...(this._value(C.CONFIG_COVER_STYLES) || {}) };
      let touched = false;
      Object.keys(cs).forEach(ref => {
        const keep = (cs[ref] || []).filter(v => String(v).toLowerCase() !== String(value).toLowerCase());
        if (keep.length !== (cs[ref] || []).length) { touched = true; if (keep.length) cs[ref] = keep; else delete cs[ref]; }
      });
      if (touched) { if (Object.keys(cs).length) next[C.CONFIG_COVER_STYLES] = cs; else delete next[C.CONFIG_COVER_STYLES]; }
      this._emit(next);
      return;
    }
    this._commitEntities((this._entitiesList() || []).filter(e => this._entityIdOf(e) !== value));
    const m = { ...(this._value(C.CONFIG_COVER_STYLES_ENTITIES) || {}) };
    if (m[value]) {
      delete m[value];
      const next = { ...this._config };
      if (Object.keys(m).length) next[C.CONFIG_COVER_STYLES_ENTITIES] = m; else delete next[C.CONFIG_COVER_STYLES_ENTITIES];
      this._emit(next);
    }
  }
  // which style a row currently uses ('' = Default)
  _rowStyleRef(row) {
    if (row.scope === 'area' || row.scope === 'label') {
      const cs = this._value(C.CONFIG_COVER_STYLES) || {};
      const hit = Object.keys(cs).find(ref => (cs[ref] || [])
        .some(v => String(v).toLowerCase() === String(row.value).toLowerCase()));
      return hit || '';
    }
    return (this._value(C.CONFIG_COVER_STYLES_ENTITIES) || {})[row.value] || '';
  }
  _setRowStyle(row, ref) {
    const next = { ...this._config };
    if (row.scope === 'area' || row.scope === 'label') {
      const cs = { ...(this._value(C.CONFIG_COVER_STYLES) || {}) };
      // remove from any style it's currently under
      Object.keys(cs).forEach(k => {
        const keep = (cs[k] || []).filter(v => String(v).toLowerCase() !== String(row.value).toLowerCase());
        if (keep.length) cs[k] = keep; else delete cs[k];
      });
      if (ref) cs[ref] = [...(cs[ref] || []), row.value];
      if (Object.keys(cs).length) next[C.CONFIG_COVER_STYLES] = cs; else delete next[C.CONFIG_COVER_STYLES];
    } else {
      const m = { ...(this._value(C.CONFIG_COVER_STYLES_ENTITIES) || {}) };
      if (ref) m[row.value] = ref; else delete m[row.value];
      if (Object.keys(m).length) next[C.CONFIG_COVER_STYLES_ENTITIES] = m; else delete next[C.CONFIG_COVER_STYLES_ENTITIES];
    }
    this._emit(next);
  }
  // ===== Per-row panels (v2026.09.24.179) =====================================
  // Each Area / Label / Cover row picks which panels its screen shows. Nothing stored = both.
  _rowPanels(row) {
    const m = this._value(C.CONFIG_AREA_PANELS) || {};
    const want = String(row.value).toLowerCase();
    const k = Object.keys(m).find(x => String(x).toLowerCase() === want);
    const v = k === undefined ? '' : m[k];
    return (v === C.AREA_PANELS_GROUP || v === C.AREA_PANELS_INDIVIDUAL) ? v : C.AREA_PANELS_BOTH;
  }
  _setRowPanels(row, v) {
    const m = { ...(this._value(C.CONFIG_AREA_PANELS) || {}) };
    const want = String(row.value).toLowerCase();
    Object.keys(m).forEach(x => { if (String(x).toLowerCase() === want) delete m[x]; });
    if (v === C.AREA_PANELS_GROUP || v === C.AREA_PANELS_INDIVIDUAL) m[row.value] = v;
    const next = { ...this._config };
    if (Object.keys(m).length) next[C.CONFIG_AREA_PANELS] = m; else delete next[C.CONFIG_AREA_PANELS];
    this._emit(next);
  }
  // true when at least one row shows this panel ('group' | 'individual'); with no rows yet the card
  // shows both, so both count as shown
  _anyRowShows(which) {
    const rows = this._coverSourceRows();
    if (!rows.length) return true;
    const hide = which === C.AREA_PANELS_GROUP ? C.AREA_PANELS_INDIVIDUAL : C.AREA_PANELS_GROUP;
    return rows.some(r => this._rowPanels(r) !== hide);
  }
  _rowCoverSources(f) {
    const st = (this._pick && this._pick.sources) || {};
    const scope = st.scope || 'area';
    const rows = this._coverSourceRows();
    const chosen = rows.filter(r => r.scope === scope || (scope === 'entity' && r.scope === 'group')
      || (scope === 'group' && r.scope === 'entity')).map(r => r.value);
    const opts = this._coverStyleOptions();
    const scopeLabel = (sc) => (this._coverSourceScopes().find(([v]) => v === sc) || [, sc])[1];
    const nameOf = (row) => (row.scope === 'entity' || row.scope === 'group') ? this._friendly(row.value) : row.value;
    // the scope dropdown rides on the search input's row
    const scopeSelect = html`
      <select class="ecs-scope" @change=${(e) => {
        this._pick = { ...(this._pick || {}), sources: { ...st, scope: e.target.value, q: '', open: false } };
      }}>
        ${this._coverSourceScopes().map(([v, l]) => html`<option value=${v} ?selected=${scope === v}>${l}</option>`)}
      </select>`;
    const expandMap = this._value(C.CONFIG_GROUP_EXPAND) || {};
    const setExpand = (id, on) => {
      const m = { ...expandMap };
      if (on) m[id] = true; else delete m[id];
      const next = { ...this._config };
      if (Object.keys(m).length) next[C.CONFIG_GROUP_EXPAND] = m; else delete next[C.CONFIG_GROUP_EXPAND];
      this._emit(next);
    };
    return html`
      <div class="ent-field">
        ${f.label ? html`<label class="row-label" title=${f.hint || ''}>${f.label}</label>` : ''}
        ${this._searchPicker('sources', this._sourceCandidates(scope), chosen,
          `Search ${scopeLabel(scope).toLowerCase()}s…`, (id) => this._addCoverSource(scope, id), scopeSelect)}
        ${this._rowCoverStyleDefault({ label: 'Default Cover Style',
          hint: 'Used by every row set to Default. None keeps the card-level settings.' })}
        ${rows.length ? rows.map(row => html`
          <div class="ent-row">
            <span class="ecs-picker-tag">${scopeLabel(row.scope)}</span>
            <span class="ecs-picker-name" style="flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
              title=${row.value}>${nameOf(row)}</span>
            ${row.scope === 'group' ? html`
              <label class="ecs-check" title="Show this group's member covers individually instead of just the group">
                <input type="checkbox" .checked=${!!expandMap[row.value]}
                  @change=${(e) => setExpand(row.value, e.target.checked)}><span>Expand</span></label>` : ''}
            <select title="Panels shown for this row" @change=${(e) => this._setRowPanels(row, e.target.value)}>
              <option value=${C.AREA_PANELS_BOTH} ?selected=${this._rowPanels(row) === C.AREA_PANELS_BOTH}>Group + Individual</option>
              <option value=${C.AREA_PANELS_GROUP} ?selected=${this._rowPanels(row) === C.AREA_PANELS_GROUP}>Group only</option>
              <option value=${C.AREA_PANELS_INDIVIDUAL} ?selected=${this._rowPanels(row) === C.AREA_PANELS_INDIVIDUAL}>Individual only</option>
            </select>
            <select title="Cover Style for this row" @change=${(e) => this._setRowStyle(row, e.target.value)}>
              <option value="" ?selected=${!this._rowStyleRef(row)}>Default</option>
              ${opts.map(([ref, name]) => html`<option value=${ref} ?selected=${this._rowStyleRef(row) === ref}>${name}</option>`)}
            </select>
            <button class="ent-ic del" title="Remove" @click=${() => this._removeCoverSource(row.scope, row.value)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>`)
          : html`<div class="hint">Nothing added yet — search above to add an Area, Label, Cover or Group.</div>`}
      </div>`;
  }

  // ===== Cover Style export / import (v2026.09.24.133) ======================
  // Envelope carries a version stamp so a future key rename can migrate on import rather than
  // silently dropping settings.
  #CS_ENVELOPE_V = 1;
  // Image slots name files from the card's BUNDLED set. A style pointing at anything else will not
  // resolve on another install, so warn instead of failing silently on the far side.
  #csCustomImages(entries) {
    const slots = [C.CONFIG_WINDOW_IMAGE, C.CONFIG_VIEW_IMAGE, C.CONFIG_SHUTTER_SLAT_IMAGE, C.CONFIG_SHUTTER_BOTTOM_IMAGE];
    const bundled = new Set(Object.values(C.ESC_PRESET || {}).flatMap(p => slots.map(k => p?.[k]).filter(Boolean)));
    const out = new Set();
    entries.forEach(e => slots.forEach(k => {
      const v = e?.[k];
      if (v && !bundled.has(v)) out.add(v);
    }));
    return [...out];
  }
  _csExport(slug) {
    const map = coverStyleLibraryMap();
    // a built-in may have no saved edit yet — export its effective definition either way
    const one = slug ? { [slug]: coverStyleEntry(slug) } : map;
    const entries = Object.values(one).filter(Boolean);
    if (!entries.length) { alert('Nothing to export — no saved Cover Styles yet.'); return; }
    // v2026.09.24.148: styles LINK to their slider/button looks, so the export carries those entries
    // with it. That is what replaces the old "detach to a frozen copy" idea: the reference stays
    // intact and the export is still self-contained, without a second state on every style.
    const requires = this.#csRequiredLibraries(entries);
    const payload = { kind: 'easy-cover-styler/cover-styles', v: this.#CS_ENVELOPE_V, styles: one,
      ...(Object.keys(requires).length ? { requires } : {}) };
    const custom = this.#csCustomImages(entries);
    const note = slug
      ? `Cover Style "${one[slug]?.name || slug}". Paste it into another card's Cover Styles → Import.`
      : `All ${entries.length} saved Cover Style(s). Built-ins are included only if you have edited them.`;
    const nDeps = Object.values(requires).reduce((a, m) => a + Object.keys(m).length, 0);
    let warn = custom.length
      ? ` NOTE: these image slots are not part of the bundled set and will not resolve on another install: ${custom.join(', ')}.`
      : '';
    this._exportJson(JSON.stringify(payload, null, 2),
      note + (nDeps ? ` Includes ${nDeps} referenced library style(s) so it stands alone.` : '') + warn);
  }
  // Library entries these styles point at, bundled so the export stands alone.
  #csRequiredLibraries(entries) {
    const out = {};
    const sliders = {}, buttons = {};
    const sMap = modernStyleLibraryMap(), bMap = buttonStyleLibraryMap();
    const slug = (r) => String(r || '').replace(/^lib:/, '');
    entries.forEach((e) => {
      const sRef = e && e.slider_source;
      if (sRef && sMap[slug(sRef)]) sliders[slug(sRef)] = sMap[slug(sRef)];
      const bRef = (e && e.groups) ? e.groups[C.CONFIG_PCT_BUTTON_STYLE] : '';
      if (bRef && bMap[slug(bRef)]) buttons[slug(bRef)] = bMap[slug(bRef)];
    });
    // built-ins ship in code, so they are deliberately NOT bundled
    if (Object.keys(sliders).length) out.slider_styles = sliders;
    if (Object.keys(buttons).length) out.button_styles = buttons;
    return out;
  }
  // Install bundled dependencies, never overwriting an existing entry of the same name.
  #csInstallRequired(requires) {
    const added = [];
    const put = (map, saver, incoming, label) => {
      if (!incoming || typeof incoming !== 'object') return;
      const next = { ...map };
      let n = 0;
      Object.keys(incoming).forEach((k) => { if (!next[k]) { next[k] = incoming[k]; n++; } });
      if (n) { saver(this.hass, next); added.push(`${n} ${label}`); }
    };
    put(modernStyleLibraryMap(), saveModernStyleLibrary, requires.slider_styles, 'slider style(s)');
    put(buttonStyleLibraryMap(), saveButtonStyleLibrary, requires.button_styles, 'button style(s)');
    return added;
  }
  _csImport() {
    this._importJson('Paste an exported Cover Style JSON. Existing styles with the same id are kept — imports are renamed rather than overwritten.', (raw) => {
      let data;
      try { data = JSON.parse(raw); }
      catch (e) { alert('That is not valid JSON.'); return; }
      // accept either the envelope or a bare { slug: entry } map
      const styles = (data && data.styles && typeof data.styles === 'object') ? data.styles : data;
      if (!styles || typeof styles !== 'object' || Array.isArray(styles)) { alert('No Cover Styles found in that JSON.'); return; }
      if (data && data.v && Number(data.v) > this.#CS_ENVELOPE_V) {
        if (!confirm(`That export was made by a newer card version (v${data.v}). Import anyway? Unknown settings will be ignored.`)) return;
      }
      const map = { ...coverStyleLibraryMap() };
      const builtins = builtinCoverStyles();
      let added = 0; const renamed = [];
      Object.keys(styles).forEach(slug => {
        const entry = styles[slug];
        if (!entry || typeof entry !== 'object') return;
        // never let an import shadow a built-in, and never overwrite an existing style
        let target = slug;
        if (builtins[target] || map[target]) {
          const base = slugifyCoverStyleName(entry.name || slug) || 'cover-style';
          let n = 2; target = `${base}-${n}`;
          while (builtins[target] || map[target]) { n++; target = `${base}-${n}`; }
          renamed.push(`${slug} → ${target}`);
        }
        map[target] = { ...entry, slug: target };
        added++;
      });
      if (!added) { alert('Nothing imported.'); return; }
      const deps = this.#csInstallRequired((data && data.requires) || {});
      saveCoverStyleLibrary(this.hass, map);
      this.requestUpdate();
      alert(`Imported ${added} Cover Style(s).`
        + (deps.length ? `\nAlso added: ${deps.join(', ')}.` : '')
        + (renamed.length ? `\n\nRenamed to avoid clashes:\n${renamed.join('\n')}` : '')
        + `\n\nAssign them under Covers & Styles.`);
    });
  }

  // ===== Shared JSON export/import modal (design system §2) ==================
  // Ported verbatim in behaviour from the Color card so both cards transfer JSON identically.
  #esc(t) { return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // Native <dialog> + showModal(): renders in the browser's TOP LAYER, which is above HA's own
  // <ha-dialog>. A plain z-index div on document.body renders BEHIND the config editor (the
  // "modal hides behind the editor" bug) because the editor is itself in the top layer.
  _showModal(contentEl) {
    const dlg = document.createElement('dialog');
    dlg.style.cssText = 'padding:0;border:none;background:transparent;max-width:none;max-height:none;';
    const st = document.createElement('style');
    st.textContent = 'dialog::backdrop{background:rgba(0,0,0,0.55);}';
    dlg.appendChild(st);
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--ha-card-background,var(--card-background-color,#1c1c1c));'
      + 'color:var(--primary-text-color,#e1e1e1);border:1px solid var(--divider-color,#444);'
      + 'border-radius:12px;max-width:640px;width:min(640px,92vw);max-height:85vh;overflow:auto;'
      + 'padding:16px;box-sizing:border-box;box-shadow:0 8px 40px rgba(0,0,0,0.5);';
    box.appendChild(contentEl);
    dlg.appendChild(box);
    const close = () => { try { dlg.close(); } catch (e) {} if (dlg.parentNode) dlg.parentNode.removeChild(dlg); };
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });   // Esc
    document.body.appendChild(dlg);
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    return { close, box };
  }
  _tryCopyTextarea(ta) {
    try { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); return document.execCommand('copy'); }
    catch (e) { return false; }
  }
  get #taCss() {
    return 'width:100%;box-sizing:border-box;height:220px;font-family:var(--code-font-family,monospace);'
      + 'font-size:12px;padding:8px;border-radius:6px;border:1px solid var(--divider-color,#444);'
      + 'background:var(--secondary-background-color,#2a2a2a);color:var(--primary-text-color,#e1e1e1);resize:vertical;';
  }
  get #btnCss() { return 'padding:8px 14px;border:none;border-radius:6px;background:var(--primary-color,#2196F3);color:#fff;cursor:pointer;font-size:13px;'; }
  get #btnCss2() { return 'padding:8px 14px;border:1px solid var(--divider-color,#444);border-radius:6px;background:transparent;color:var(--primary-text-color,#e1e1e1);cursor:pointer;font-size:13px;'; }
  // Transfer is through a VISIBLE textarea, not the clipboard API: inside HA's editor dialog the
  // async clipboard rejects with "Document is not focused", and execCommand's user gesture expires
  // in async callbacks. The focused textarea sidesteps the problem entirely.
  _exportJson(text, note) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Export</div>
      <div style="font-size:12px;color:var(--secondary-text-color,#888);margin-bottom:10px;">${this.#esc(note || 'Copy this JSON.')}</div>
      <textarea readonly style="${this.#taCss}"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
        <button class="esc-modal-copy" style="${this.#btnCss}">Copy to clipboard</button>
        <button class="esc-modal-close" style="${this.#btnCss2}">Close</button>
      </div>`;
    const ta = wrap.querySelector('textarea');
    ta.value = text;
    const modal = this._showModal(wrap);
    setTimeout(() => { ta.focus(); ta.select(); }, 50);
    const copyBtn = wrap.querySelector('.esc-modal-copy');
    copyBtn.onclick = () => {
      const ok = this._tryCopyTextarea(ta)
        || (navigator.clipboard && navigator.clipboard.writeText && (navigator.clipboard.writeText(ta.value), true));
      copyBtn.textContent = ok ? 'Copied ✓' : 'Press Ctrl/Cmd+C';
      setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; }, 1500);
    };
    wrap.querySelector('.esc-modal-close').onclick = () => modal.close();
  }
  _importJson(promptLabel, onText) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Import</div>
      <div style="font-size:12px;color:var(--secondary-text-color,#888);margin-bottom:10px;">${this.#esc(promptLabel || 'Paste the exported JSON below.')}</div>
      <textarea placeholder="Paste JSON here…" style="${this.#taCss}"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
        <button class="esc-modal-paste" style="${this.#btnCss2}margin-right:auto;">Paste from clipboard</button>
        <button class="esc-modal-import" style="${this.#btnCss}">Import</button>
        <button class="esc-modal-close" style="${this.#btnCss2}">Close</button>
      </div>`;
    const ta = wrap.querySelector('textarea');
    const modal = this._showModal(wrap);
    setTimeout(() => ta.focus(), 50);
    wrap.querySelector('.esc-modal-paste').onclick = async () => {
      try { ta.value = await navigator.clipboard.readText(); }
      catch (e) { ta.placeholder = 'Clipboard blocked — paste with Ctrl/Cmd+V'; ta.focus(); }
    };
    wrap.querySelector('.esc-modal-import').onclick = () => {
      const raw = (ta.value || '').trim();
      if (!raw) return;
      modal.close();
      onText(raw);
    };
    wrap.querySelector('.esc-modal-close').onclick = () => modal.close();
  }

  // ===== TDBU top-rail entities (v2026.09.24.128) ===========================
  // A Cover Style says a cover IS top-down/bottom-up; the CARD says which entity drives its top
  // rail, because entity ids must never travel inside a shared style. One field per TDBU cover.

  // Which Cover Style ref applies to a cover — mirrors the card's precedence
  // (card default -> area/label assignment -> entity assignment).
  _styleRefForCover(entityId) {
    const cfg = this._config || {};
    let ref = cfg[C.CONFIG_COVER_STYLE_DEFAULT] || '';
    const areaName = this._areaNameForEntity(entityId);
    const byStyle = cfg[C.CONFIG_COVER_STYLES];
    if (byStyle && typeof byStyle === 'object' && areaName) {
      Object.keys(byStyle).forEach(slug => {
        const list = Array.isArray(byStyle[slug]) ? byStyle[slug] : [];
        if (list.some(v => String(v).toLowerCase() === String(areaName).toLowerCase())) ref = slug;
      });
    }
    const byEntity = cfg[C.CONFIG_COVER_STYLES_ENTITIES];
    if (byEntity && typeof byEntity === 'object' && byEntity[entityId]) ref = byEntity[entityId];
    return ref;
  }
  _areaNameForEntity(entityId) {
    const e = this.hass?.entities?.[entityId];
    const areaId = e?.area_id || this.hass?.devices?.[e?.device_id]?.area_id || null;
    if (!areaId) return null;
    return this.hass?.areas?.[areaId]?.name || areaId;
  }
  // Covers on this card (areas/labels expanded) whose resolved Cover Style is TDBU.
  _tdbuCovers() {
    const cfg = this._config || {};
    const wanted = new Set();
    const areas = (Array.isArray(cfg[C.CONFIG_AREAS]) ? cfg[C.CONFIG_AREAS] : []).map(a => String(a).toLowerCase());
    const labels = (Array.isArray(cfg[C.CONFIG_LABELS]) ? cfg[C.CONFIG_LABELS] : []).map(l => String(l).toLowerCase());
    (this._coverIds() || []).forEach(id => {
      const an = this._areaNameForEntity(id);
      if (an && areas.includes(String(an).toLowerCase())) wanted.add(id);
      const ls = this.hass?.entities?.[id]?.labels || [];
      if (ls.some(l => labels.includes(String(this.hass?.labels?.[l]?.name || l).toLowerCase()))) wanted.add(id);
    });
    (this._entitiesList() || []).forEach(e => { const id = this._entityIdOf(e); if (id) wanted.add(id); });
    return [...wanted].filter(id => {
      const st = resolveCoverStyle(this._styleRefForCover(id));
      return st && st[C.CONFIG_MODERN_TRAVEL] === 'tdbu';
    }).sort((a, b) => String(this._friendly(a)).localeCompare(String(this._friendly(b))));
  }
  _tdbuMap() {
    const m = this._value(C.CONFIG_TDBU_TOP_ENTITIES);
    return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
  }
  _setTdbu(coverId, topId) {
    const m = { ...this._tdbuMap() };
    if (topId) m[coverId] = topId; else delete m[coverId];
    const next = { ...this._config };
    if (Object.keys(m).length) next[C.CONFIG_TDBU_TOP_ENTITIES] = m;
    else delete next[C.CONFIG_TDBU_TOP_ENTITIES];
    this._emit(next);
  }
  // Guess each unmapped cover's top rail: a sibling cover id with a top-ish suffix.
  _autoDetectTdbu(covers) {
    const ids = new Set(this._coverIds() || []);
    const sfx = ['_top', '_top_rail', '_toprail', '_upper', '_top_down'];
    const m = { ...this._tdbuMap() };
    let found = 0;
    covers.forEach(id => {
      if (m[id]) return;
      const base = id.replace(/^cover\./, '');
      for (const sx of sfx) {
        const cand = `cover.${base}${sx}`;
        if (ids.has(cand) && cand !== id) { m[id] = cand; found++; return; }
      }
    });
    if (!found) { alert('No matching top-rail entities found. Expected a sibling cover ending in _top (or _upper).'); return; }
    const next = { ...this._config };
    next[C.CONFIG_TDBU_TOP_ENTITIES] = m;
    this._emit(next);
  }
  _rowTdbuMap(f) {
    const covers = this._tdbuCovers();
    const map = this._tdbuMap();
    const legacy = this._value(C.CONFIG_MODERN_SECOND_ENTITY);
    if (!covers.length) {
      return html`
        <div class="ent-field">
          <div class="hint">No top-down/bottom-up covers on this card yet. Set <b>Travel</b> to
          <b>Top-down / bottom-up</b> in a Cover Style (Libraries → Cover Styles), and every cover
          using that style will appear here so you can name its top-rail entity.</div>
          ${legacy ? html`<div class="hint" style="margin-top:6px;">Carried over from the old single
            field: <b>${legacy}</b>. It still applies to every TDBU cover until you map them
            individually here.</div>` : ''}
        </div>`;
    }
    const unmapped = covers.filter(id => !map[id]).length;
    return html`
      <div class="ent-field">
        <div class="hint">Put the card on the <b>bottom</b> rail entity and name the <b>top</b> rail
        entity for each cover below.</div>
        ${unmapped ? html`
          <div class="row" style="margin-top:6px;">
            <button class="add-btn" @click=${() => this._autoDetectTdbu(covers)}>
              Auto-detect (${unmapped} unmapped)</button>
          </div>` : ''}
        ${covers.map(id => html`
          <div class="ent-row">
            <span class="ecs-picker-name" style="flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
              title=${id}>${this._friendly(id)}</span>
            <input type="text" .value=${map[id] || ''} placeholder=${legacy || 'cover.\u2026 (top rail)'}
              @change=${(e) => this._setTdbu(id, e.target.value.trim())}>
            ${map[id] ? html`<button class="ent-ic del" title="Clear"
              @click=${() => this._setTdbu(id, '')}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>` : ''}
          </div>`)}
      </div>`;
  }

  // ===== Cover Style assignment (Phase 4) ==================================
  // All styles (built-in + library) as [ref, label] for the assignment dropdowns.
  _coverStyleOptions() {
    const out = [];
    const b = builtinCoverStyles();
    Object.keys(b).forEach(slug => out.push([slug, b[slug].name]));
    const m = coverStyleLibraryMap();
    Object.keys(m).forEach(slug => out.push([slug, m[slug].name || slug]));
    return out;
  }
  _coverStyleLabel(ref) {
    const slug = String(ref || '').replace(/^lib:/, '');
    const e = coverStyleEntry(slug);
    return (e && e.name) || slug;
  }
  _rowCoverStyleDefault(f) {
    const cur = this._value(C.CONFIG_COVER_STYLE_DEFAULT) || '';
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => this._set(C.CONFIG_COVER_STYLE_DEFAULT, e.target.value)}>
          <option value="" ?selected=${!cur}>None (card settings)</option>
          ${this._coverStyleOptions().map(([ref, name]) => html`
            <option value=${ref} ?selected=${cur === ref}>${name}</option>`)}
        </select>
      </div>`;
  }
  // style -> [areas]. One row per assigned style; areas are chips with a search-picker to add.
  _rowCoverStyleAreas(f) {
    const raw = this._value(C.CONFIG_COVER_STYLES);
    const map = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const commit = (m) => {
      const next = { ...this._config };
      const clean = {};
      Object.keys(m).forEach(k => { if (Array.isArray(m[k]) && m[k].length) clean[k] = m[k]; });
      if (Object.keys(clean).length) next[C.CONFIG_COVER_STYLES] = clean;
      else delete next[C.CONFIG_COVER_STYLES];
      this._emit(next);
    };
    const assigned = Object.keys(map);
    const areaCands = this._pickCandidates('area');
    const unusedStyles = this._coverStyleOptions().filter(([ref]) => !assigned.includes(ref));
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${assigned.length ? assigned.map(ref => html`
          <div class="cs-assign">
            <div class="cs-assign-head">
              <ha-icon class="panel-ic" icon="mdi:palette-swatch-variant"></ha-icon>
              <span class="cs-assign-name">${this._coverStyleLabel(ref)}</span>
              <button class="ent-ic del" title="Remove this style assignment"
                @click=${() => { const m = { ...map }; delete m[ref]; commit(m); }}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
            </div>
            <div class="chips">
              ${(map[ref] || []).map(a => html`<span class="chip">${a}<button class="chip-x"
                @click=${() => commit({ ...map, [ref]: (map[ref] || []).filter(x => x !== a) })}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button></span>`)}
            </div>
            ${this._searchPicker(`csa:${ref}`, areaCands, Object.values(map).flat(), 'Search areas…',
              (id) => commit({ ...map, [ref]: [...(map[ref] || []), id] }))}
          </div>`) : html`<div class="hint">No styles assigned — every cover uses the default below.</div>`}
        ${unusedStyles.length ? html`
          <div class="chip-add">
            <select @change=${(e) => { const v = e.target.value; if (v) commit({ ...map, [v]: [] }); e.target.value = ''; }}>
              <option value="">+ Assign a Cover Style…</option>
              ${unusedStyles.map(([ref, name]) => html`<option value=${ref}>${name}</option>`)}
            </select>
          </div>` : ''}
      </div>`;
  }
  // entity -> style. One row per cover, with a style dropdown.
  _rowCoverStyleEntities(f) {
    const raw = this._value(C.CONFIG_COVER_STYLES_ENTITIES);
    const map = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const commit = (m) => {
      const next = { ...this._config };
      const clean = {};
      Object.keys(m).forEach(k => { if (m[k]) clean[k] = m[k]; });
      if (Object.keys(clean).length) next[C.CONFIG_COVER_STYLES_ENTITIES] = clean;
      else delete next[C.CONFIG_COVER_STYLES_ENTITIES];
      this._emit(next);
    };
    const chosen = Object.keys(map);
    const opts = this._coverStyleOptions();
    return html`
      <div class="ent-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        ${chosen.map(id => html`
          <div class="ent-row">
            <span class="ecs-picker-name" style="flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
              title=${id}>${this._friendly(id)}</span>
            <select @change=${(e) => commit({ ...map, [id]: e.target.value })}>
              ${opts.map(([ref, name]) => html`<option value=${ref} ?selected=${map[id] === ref}>${name}</option>`)}
            </select>
            <button class="ent-ic del" title="Remove" @click=${() => { const m = { ...map }; delete m[id]; commit(m); }}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>`)}
        ${this._searchPicker('cse', this._pickCandidates('entity'), chosen, 'Search covers…',
          (id) => commit({ ...map, [id]: (opts[0] && opts[0][0]) || '' }))}
      </div>`;
  }

  // ===== Cover Styles library (Phase 3) ====================================
  _csNew() { this._csSlug = '__new__'; this._csDraft = this._csFillAll(newCoverStyleEntry('New cover style'), false); this._csBeginTracking(); }
  _csEdit(slug) {
    const e = coverStyleLibraryMap()[slug] || (BUILTINS_EDITABLE ? builtinCoverStyles()[slug] : null);
    if (!e) return;
    this._csSlug = slug; this._csDraft = JSON.parse(JSON.stringify(e)); delete this._csDraft.builtin; this._csBeginTracking();
  }
  // v2026.09.24.166: FULL-SPEC styles. Every Cover Style key gets an explicit value, so a style
  // never depends on a hidden code default or on stray keys in some card's YAML — it looks the same
  // on every card, and the change tracker shows everything it does.
  //   useCard=false : fill gaps from the built-in defaults (new / duplicated styles)
  //   useCard=true  : fill gaps from what the style CURRENTLY resolves to on this card — the card's
  //                   YAML if the key is written there, else the default — so nothing visibly changes
  _csFillAll(draft, useCard) {
    const card = useCard ? (this._config || {}) : {};
    const g = { ...((draft && draft.groups) || {}) };
    COVER_STYLE_KEYS.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(g, k)) return;
      const v = Object.prototype.hasOwnProperty.call(card, k) ? card[k] : C.CONFIG_DEFAULT[k];
      if (v !== undefined) g[k] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    });
    // a style that leaves its slider to the card should keep the look it has here, too
    const d = { ...draft, groups: g };
    if (useCard && !d.slider && !d.slider_source && card[C.CONFIG_MODERN_STYLE]) d.slider_source = card[C.CONFIG_MODERN_STYLE];
    return d;
  }
  _csFillAllInPlace() {
    if (!this._csDraft) return;
    const before = Object.keys((this._csDraft.groups) || {}).length;
    this._csDraft = this._csFillAll(this._csDraft, true);
    this._csFilled = Object.keys(this._csDraft.groups).length - before;
    this.requestUpdate();
  }
  _csDuplicate(slug) {
    const e = coverStyleEntry(slug);
    if (!e) return;
    this._csSlug = '__new__';
    this._csDraft = this._csFillAll(newCoverStyleEntry(`${e.name || slug} copy`, slug), false);    this._csBeginTracking();
  }
  _csView(slug) {
    const e = coverStyleEntry(slug);
    if (!e) return;
    // read-only: built-ins can be previewed but not edited (duplicate to customise)
    this._csSlug = slug;
    this._csDraft = { ...JSON.parse(JSON.stringify(e)), builtin: true, slug };
  }
  _csClose() { this._csSlug = null; this._csDraft = null; }
  // Persist the draft into the library. Returns the promise so callers can react.
  // Shared by Save and 'Apply to card preview' — the only difference is whether the editor closes.
  _csPersistDraft() {
    if (!this.hass || !this._csDraft) return Promise.resolve(null);
    const name = this._csDraft.name || 'Cover style';
    const slug = (this._csSlug && this._csSlug !== '__new__') ? this._csSlug : slugifyCoverStyleName(name);
    const map = { ...coverStyleLibraryMap() };
    map[slug] = { name, groups: this._csDraft.groups || {}, slider: this._csDraft.slider || null,
      slider_source: this._csDraft.slider_source || '' };
    // keep editing the same entry afterwards, so a new style does not reopen as '__new__'
    this._csSlug = slug;
    return saveCoverStyleLibrary(this.hass, map).then(() => { this.requestUpdate(); return slug; });
  }
  _csSave() {
    this._csPersistDraft().then(() => this._csClose()).catch(() => {});
  }
  // v2026.09.24.143: the small builder preview cannot show how a style reads inside a real panel
  // (header placement, control layout, dividers, scaling all come from the card). Saving the draft is
  // enough to refresh the dashboard preview in place: the card subscribes to the Cover Style library
  // and rebuilds its per-cover configs when it changes (v124), so the panel behind the editor
  // re-renders with this style — no reload, and the editor stays open.
  // v2026.09.24.181: the card in the dashboard's preview pane follows the open draft automatically.
  // Every edit replaces the draft object, so a changed reference means "publish". Closing the editor
  // (Save or Cancel) clears it, and the card falls back to the saved library entry.
  updated(changed) {
    if (super.updated) super.updated(changed);
    const cs = (this._csDraft && this._csSlug && this._csSlug !== '__new__') ? this._csSlug : null;
    if (this._liveCsSlug && this._liveCsSlug !== cs) setCoverStyleDraft(this._liveCsSlug, null);
    if (cs && (this._liveCsRef !== this._csDraft || this._liveCsSlug !== cs)) setCoverStyleDraft(cs, { ...this._csDraft });
    this._liveCsSlug = cs; this._liveCsRef = cs ? this._csDraft : null;

    const ms = (this._modernDraft && this._modernSlug && this._modernSlug !== '__new__' && !this._modernReadOnly) ? this._modernSlug : null;
    if (this._liveMsSlug && this._liveMsSlug !== ms) setModernStyleDraft(this._liveMsSlug, null);
    if (ms && (this._liveMsRef !== this._modernDraft || this._liveMsSlug !== ms)) setModernStyleDraft(ms, this._modernDraft.groups || {});
    this._liveMsSlug = ms; this._liveMsRef = ms ? this._modernDraft : null;
  }
  // Safe on every render: the listener is the same function each time, and a Set holds it once.
  _subscribeLibraries() {
    if (!this.hass || this._libDetached) return;
    ensureButtonStyleLibrary(this.hass, this._onLibUpdate);
    ensureModernStyleLibrary(this.hass, this._onLibUpdate);
    ensureCoverStyleLibrary(this.hass, this._onLibUpdate);
    ensureFrameLibrary(this.hass, this._onLibUpdate);
  }
  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback();
    if (!this._libDetached) return;
    this._libDetached = false;
    this._subscribeLibraries();
    if (libRev() !== this._libRevAtDetach) this.requestUpdate();   // missed a change while away
  }
  disconnectedCallback() {
    if (super.disconnectedCallback) super.disconnectedCallback();
    [offButtonStyleLibrary, offModernStyleLibrary, offCoverStyleLibrary, offFrameLibrary].forEach(off => off(this._onLibUpdate));
    this._libDetached = true;
    this._libRevAtDetach = libRev();
    // leaving the editor abandons the draft — never leave an unsaved look on the card
    if (this._liveCsSlug) setCoverStyleDraft(this._liveCsSlug, null);
    if (this._liveMsSlug) setModernStyleDraft(this._liveMsSlug, null);
    this._liveCsSlug = this._liveMsSlug = null;
  }

  _csDelete(slug) {
    if (!this.hass) return;
    const e = coverStyleLibraryMap()[slug];
    if (!confirm(`Delete the Cover Style "${(e && e.name) || slug}"?\n\nAny area or cover assigned to it falls back to the default. This cannot be undone.`)) return;
    const map = { ...coverStyleLibraryMap() };
    delete map[slug];
    saveCoverStyleLibrary(this.hass, map).then(() => this.requestUpdate()).catch(() => {});
  }
  // draft field helpers — a Cover Style stores only the keys it actually sets (sparse => byte-stable)
  _csField(key, opts) {
    const groups = (this._csDraft && this._csDraft.groups) || {};
    return {
      key, ...opts,
      get: () => (Object.prototype.hasOwnProperty.call(groups, key) ? groups[key] : C.CONFIG_DEFAULT[key]),
      // v2026.09.24.162: lets a dropdown show "Use card setting" for a key the style leaves unset,
      // instead of displaying the built-in default as if the style had chosen it.
      csInherit: true,
      isSet: () => Object.prototype.hasOwnProperty.call(groups, key),
      set: (v) => {
        const g = { ...groups };
        if (v === '' || v === null || v === undefined) delete g[key]; else g[key] = v;
        this._csDraft = { ...this._csDraft, groups: g };
      },
    };
  }
  // Live preview of the Cover Style draft at three positions. Classic styles stack the real image
  // slots (view behind, slat covering the open fraction, bottom bar at the edge); modern styles draw
  // the embedded bar. Mirrors how the card composes a cover, without instantiating one.
  _renderCoverStylePreview() {
    const d = this._csDraft || {};
    const g = d.groups || {};
    // v2026.09.24.161: resolve like the live card does — a key the style sets wins, an unset key falls
    // through to the CARD's config, and only then to the built-in default. The preview used to skip the
    // card entirely, so a sparse style (one that leaves e.g. the slider to the card) previewed as bare
    // defaults while the real card, correctly, used the card's own value.
    const card = this._config || {};
    const val = (k) => (Object.prototype.hasOwnProperty.call(g, k) ? g[k]
      : (Object.prototype.hasOwnProperty.call(card, k) ? card[k] : C.CONFIG_DEFAULT[k]));
    const isModern = val(C.CONFIG_COVER_VISUAL) === 'modern';
    const rotation = val(C.CONFIG_PANEL_ROTATION);
    const dir = String(val(C.CONFIG_CLOSING_DIRECTION) || 'down');
    const base = String(val(C.CONFIG_IMAGE_MAP) || C.ESC_IMAGE_MAP);
    // v2026.09.24.142: this used its OWN copy of the path rule, and that copy still had the pre-v140
    // bug — "contains a '/' means absolute" — so every foldered value (slats/…, frames/…) was emitted
    // unprefixed and resolved against the dashboard url instead of the image folder, breaking the
    // preview for every style. Use the one shared helper so the rule cannot diverge again.
    const src = (v) => {
      const s2 = String(v || '');
      if (!s2) return '';
      if (isMediaRef(s2)) return this._csMediaUrl(s2);   // signed url, fetched once and cached
      // v2026.09.24.158: the preview reads the DRAFT raw, so a style still holding pre-v140 flat
      // filenames ('esc-shutter-slat.png') produced <base>/esc-shutter-slat.png and 404'd — broken
      // image icons in the preview while the live card rendered fine, because resolveCoverStyle()
      // migrates paths and the preview never did.
      const r = defImagePathOrColor(base, migrateImageValue(s2));
      return r.includes('.') ? r : '';                  // a colour resolves to itself, not a file
    };
    const paint = (v) => { const s2 = String(v || ''); return (s2 && !s2.includes('.')) ? s2 : ''; };
    const W = 62, H = 104;

    // v2026.09.24.179: drawn by the SAME function as the live card (coverArt.js), so the two
    // cannot disagree. Offsets land the cover where the live card puts it.
    const offA = val(C.CONFIG_OFFSET_OPENED_PCT), offB = val(C.CONFIG_OFFSET_CLOSED_PCT);
    const classic = (pct) => html`
      <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;border-radius:3px;background:#20303a;">
        ${classicArt({
          W, H, dir,
          rotate: !!val(C.CONFIG_ROTATE_SLATS_SHUTTER_IMAGE),
          len: coveredPct(pct, offA, offB) + '%',
          view: src(val(C.CONFIG_VIEW_IMAGE)) || paint(val(C.CONFIG_VIEW_IMAGE)),
          slat: src(val(C.CONFIG_SHUTTER_SLAT_IMAGE)) || paint(val(C.CONFIG_SHUTTER_SLAT_IMAGE)),
          bottom: src(val(C.CONFIG_SHUTTER_BOTTOM_IMAGE)) || paint(val(C.CONFIG_SHUTTER_BOTTOM_IMAGE)),
          frame: src(val(C.CONFIG_WINDOW_IMAGE)),
          stretchBottom: !!val(C.CONFIG_STRETCH_EDGE_SHUTTER_IMAGE),
        })}
      </div>`;

    const modern = (pct, state) => {
      // v2026.09.24.154: since v148 a Cover Style LINKS its slider (slider = null, slider_source =
      // '<slug>'), so `d.slider` is null for every linked style and the preview resolved nothing but
      // defaults — the bar/gradient/glow settings appeared to be ignored. resolveModernStyle() takes
      // an inline object OR a ref, so pass the source when there is no inline copy.
      // style's own slider (inline or linked) first, else the card's modern_style — same precedence
      // as the renderer, where the style's modern_style key simply overrides the card's
      const style = resolveModernStyle(d.slider || d.slider_source || val(C.CONFIG_MODERN_STYLE) || undefined);
      const fill = modernFillPaint(style, state);
      const glow = modernBarGlow(style, state);
      const onFill = glow && style.glow_target === 'fill';
      const rad = Number(style.bar_radius) || 0;
      const brd = Number(style.bar_border_width) > 0
        ? `border:${style.bar_border_width}px solid ${style.bar_border_color};` : '';
      return html`
        <div style="width:${Math.min(W, 46)}px;height:${H}px;position:relative;border-radius:${rad}px;
          overflow:${onFill ? 'visible' : 'hidden'};background:${modernTrackColor(style)};${brd}
          ${(glow && !onFill) ? `box-shadow:${glow};` : ''}">
          <div style="position:absolute;left:0;right:0;bottom:0;height:${pct}%;background:${fill};
            opacity:${modernFillOpacity(style)};${onFill ? `box-shadow:${glow};` : ''}"></div>
          ${style.handle_show ? html`<div style="${modernHandleStyle(style, pct, fill)}"></div>` : ''}
        </div>`;
    };

    // A rotate() transform does not change the element's layout box, so rotated tiles would overlap
    // their neighbours. Reserve the SWAPPED footprint on an outer box and rotate inside it — the
    // same approach sizeRotationWrapper() uses on the real card.
    const tileW = isModern ? Math.min(W, 46) : W;
    const spun = rotation === 'left' || rotation === 'right';
    const boxStyle = spun ? `width:${H}px;height:${tileW}px;` : `width:${tileW}px;height:${H}px;`;
    const cell = (pct, state, label) => html`
      <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
        <div class="cs-prev-box" style=${boxStyle}>
          <div class="cs-prev-rot" data-rot=${rotation || 'normal'}>
            ${isModern ? modern(pct, state) : classic(pct)}
          </div>
        </div>
        <span class="hint">${label}</span>
      </div>`;

    return html`
      <div class="cs-prev">
        ${cell(100, 'open', 'Open')}${cell(50, 'opening', '50%')}${cell(0, 'closed', 'Closed')}
      </div>
      <div class="hint" style="text-align:center;">Preview — closing direction <b>${dir}</b>${rotation && rotation !== 'normal' ? html`, rotated <b>${rotation}</b>` : ''}.</div>`;
  }
  // One-click migration: fold this card's own visual settings into a new Cover Style and assign it as
  // the card default. Explicit (not automatic) because it writes to the shared library — that needs a
  // live connection and the user's intent. Only keys the card actually sets are copied.
  _csAdoptCardSettings() {
    if (!this.hass) return;
    const own = COVER_STYLE_KEYS.filter(k => Object.prototype.hasOwnProperty.call(this._config, k));
    if (!own.length) { alert('This card has no panel-level visual settings to move.'); return; }
    const title = (this._config[C.CONFIG_TITLE] || 'Card') + ' Style';
    if (!confirm(`Create a Cover Style "${title}" from this card's ${own.length} visual setting(s) and use it as the card default?\n\nThe settings move out of the card into the style. Appearance stays the same.`)) return;
    const groups = {};
    own.forEach(k => { groups[k] = this._config[k]; });
    const slug = slugifyCoverStyleName(title);
    const map = { ...coverStyleLibraryMap() };
    map[slug] = { name: title, groups, slider: null, slider_source: '' };
    saveCoverStyleLibrary(this.hass, map).then(() => {
      const next = { ...this._config };
      own.forEach(k => { delete next[k]; });
      next[C.CONFIG_COVER_STYLE_DEFAULT] = slug;
      this._emit(next);
      this.requestUpdate();
    }).catch(() => alert('Could not save to the Cover Styles library.'));
  }

  // ===== Change tracker (v2026.09.24.145) ===================================
  // A Cover Style is SPARSE: a key exists in the draft only if the style sets it. So "what does this
  // style define?" needs no tracking machinery — it is Object.keys(draft.groups). "What did I change
  // in this session?" is a diff against the snapshot taken when the editor opened. Both are shown,
  // labelled distinctly, because they answer different questions.
  _csSnapshot() {
    // taken once per editing session, by _csEdit/_csNew/_csDuplicate via _csBeginTracking()
    return this._csOpenSnapshot || {};
  }
  _csBeginTracking() {
    const g = (this._csDraft && this._csDraft.groups) || {};
    this._csOpenSnapshot = { ...g };
    this._csTrackOpen = false;
  }
  // keys this style sets, plus which of those are new/changed since the editor opened
  _csChangeSummary() {
    const g = (this._csDraft && this._csDraft.groups) || {};
    const snap = this._csSnapshot();
    const keys = Object.keys(g).sort();
    const changed = new Set();
    keys.forEach((k) => { if (JSON.stringify(g[k]) !== JSON.stringify(snap[k])) changed.add(k); });
    // a key removed during this session is a change too
    const removed = Object.keys(snap).filter((k) => !(k in g));
    return { keys, changed, removed };
  }
  _csIsSet(key) {
    const g = (this._csDraft && this._csDraft.groups) || {};
    return Object.prototype.hasOwnProperty.call(g, key);
  }
  // Clear one key => the style stops defining it and the card value applies again.
  _csClearKey(key) {
    if (!this._csDraft) return;
    const g = { ...(this._csDraft.groups || {}) };
    delete g[key];
    this._csDraft = { ...this._csDraft, groups: g };
    this.requestUpdate();
  }
  _csRevertKey(key) {
    const snap = this._csSnapshot();
    if (!this._csDraft) return;
    const g = { ...(this._csDraft.groups || {}) };
    if (Object.prototype.hasOwnProperty.call(snap, key)) g[key] = snap[key]; else delete g[key];
    this._csDraft = { ...this._csDraft, groups: g };
    this.requestUpdate();
  }
  _csPretty(v) {
    if (v === true) return 'on';
    if (v === false) return 'off';
    if (Array.isArray(v)) return v.join(', ') || '(empty)';
    const s2 = String(v ?? '');
    return s2 === '' ? '(blank)' : s2;
  }
  _renderCsTracker() {
    const { keys, changed, removed } = this._csChangeSummary();
    const open = !!this._csTrackOpen;
    const n = keys.length;
    const nChanged = changed.size + removed.length;
    return html`
      <div class="cs-track">
        <div class="cs-track-head" @click=${() => { this._csTrackOpen = !open; this.requestUpdate(); }}>
          <span class="cs-track-count">${n} setting${n === 1 ? '' : 's'} defined</span>
          ${nChanged ? html`<span class="hint">· ${nChanged} changed now</span>` : ''}
          <span style="flex:1 1 auto;"></span>
          <ha-icon icon=${open ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
        </div>
        ${!open ? '' : html`
          <div class="cs-track-list">
            ${n === 0 && !removed.length ? html`<div class="hint">This style defines nothing yet, so
              every cover using it looks exactly like the card's own settings. Anything you set below
              is listed here.</div>` : ''}
            ${keys.map((k) => html`
              <div class="cs-track-row ${changed.has(k) ? 'new' : ''}">
                <span class="k" title=${k}>${k}</span>
                <span class="v" title=${this._csPretty((this._csDraft.groups || {})[k])}>${this._csPretty((this._csDraft.groups || {})[k])}</span>
                ${changed.has(k) ? html`<ha-icon-button class="ent-ic" title="Undo this change"
                  @click=${(e) => { e.stopPropagation(); this._csRevertKey(k); }}><ha-icon icon="mdi:backspace"></ha-icon></ha-icon-button>` : ''}
                <button class="ent-ic del" title="Stop defining this — the card's own value applies again"
                  @click=${(e) => { e.stopPropagation(); this._csClearKey(k); }}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
              </div>`)}
            ${removed.map((k) => html`
              <div class="cs-track-row">
                <span class="k" title=${k} style="text-decoration:line-through;">${k}</span>
                <span class="v">removed</span>
                <ha-icon-button class="ent-ic" title="Put it back"
                  @click=${(e) => { e.stopPropagation(); this._csRevertKey(k); }}><ha-icon icon="mdi:backspace"></ha-icon></ha-icon-button>
              </div>`)}
          </div>`}
      </div>`;
  }

  _csGroup(id, label, bodyFn) {
    const open = !!(this._csOpen || {})[id];
    return html`
      <div class="cs-grp ${open ? 'open' : ''}">
        <div class="cs-grp-head" @click=${() => { this._csOpen = { ...(this._csOpen || {}), [id]: !open }; }}>
          <span class="cs-grp-title">${label}</span>
          <ha-icon class="cs-grp-chev" icon="mdi:chevron-down"></ha-icon>
        </div>
        ${open ? html`<div class="cs-grp-body">${bodyFn()}</div>` : ''}
      </div>`;
  }
  // Built-in styles are read-only: show the live preview plus the values they set, and offer
  // Duplicate as the way to customise (design-system library pattern).
  _renderCoverStyleReadonly(d) {
    const g = d.groups || {};
    const pretty = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    const keys = Object.keys(g);
    return html`
      <div class="hint"><b>${d.name}</b> — built-in style (read-only). Duplicate it to make your own
        editable copy.</div>
      ${this._renderCoverStylePreview()}
      ${keys.length ? html`
        <div class="group-title">Sets these values</div>
        ${keys.map(k => html`
          <div class="ent-row">
            <span class="ecs-picker-name" style="flex:1 1 auto;">${pretty(k)}</span>
            <span class="ecs-picker-id">${String(g[k])}</span>
          </div>`)}`
        : html`<div class="hint">This style relies entirely on the card defaults.</div>`}
      ${d.slider ? html`<div class="hint">Includes an embedded slider look${d.slider_source
        ? html` from <b>${(builtinModernStyles()[d.slider_source] || {}).name || d.slider_source}</b>` : ''}.</div>` : ''}
      <div class="style-actions">
        <button class="add-btn" @click=${() => this._csDuplicate(d.slug)}>Duplicate to edit</button>
        <button class="ent-ic" @click=${() => this._csClose()}>Close</button>
      </div>`;
  }
  _renderCoverStyleEditor() {
    const d = this._csDraft;
    if (d.builtin) return this._renderCoverStyleReadonly(d);
    const sliderName = d.slider_source
      ? ((builtinModernStyles()[d.slider_source] && builtinModernStyles()[d.slider_source].name)
        || (modernStyleLibraryMap()[String(d.slider_source).replace(/^lib:/, '')] || {}).name
        || d.slider_source)
      : '';
    const modernVisual = this._csDraft.groups && this._csDraft.groups[C.CONFIG_COVER_VISUAL] === 'modern';
    return html`
      ${this._renderCsTracker()}
      ${(() => {
        const n = Object.keys((this._csDraft && this._csDraft.groups) || {}).length;
        const total = COVER_STYLE_KEYS.length;
        return n < total ? html`<div class="chip-add">
          <button class="add-btn" title="Give every setting an explicit value, taken from what this style currently resolves to on this card, so it looks the same everywhere"
            @click=${() => this._csFillAllInPlace()}>Fill in every setting (${total - n} unset)</button>
          ${this._csFilled ? html`<span class="hint" style="align-self:center;">Filled ${this._csFilled} — save to keep them.</span>` : ''}
        </div>` : html`<div class="hint">Fully specified — every setting has a value.</div>`;
      })()}
      <div class="hint">A Cover Style holds the per-cover look: images, control &amp; info placement, rotation and
        sizing. Colors, fonts and button/divider styles stay card-level, so every style shares your theme.</div>
      <div class="row"><label class="row-label">Name</label>
        <input type="text" .value=${d.name || ''} @input=${(e) => { this._csDraft = { ...d, name: e.target.value }; }}></div>
      ${this._renderCoverStylePreview()}
      ${this._csGroup('visual', 'Visual', () => html`
        ${this._rowSelect(this._csField(C.CONFIG_COVER_VISUAL, { label: 'Visual Type', type: 'select',
          options: [['image', 'Image Slider'], ['modern', 'Color Slider']] }))}
        ${this._rowSelect(this._csField(C.CONFIG_PANEL_ROTATION, { label: 'Panel Rotation', type: 'select',
          options: [[C.PANEL_ROTATION_NORMAL, 'Normal'], [C.PANEL_ROTATION_LEFT, 'Left'], [C.PANEL_ROTATION_RIGHT, 'Right']] }))}
        ${this._rowSelect(this._csField(C.CONFIG_CLOSING_DIRECTION, { label: 'Closing Direction', type: 'select',
          options: [C.DOWN, C.UP, C.LEFT, C.RIGHT] }))}`)}

      ${modernVisual ? this._csGroup('slider', 'Color Slider', () => html`
        <div class="row">
          <label class="row-label">Source</label>
          <span class="hint" style="flex:1 1 auto;">${sliderName
            ? html`Linked to <b>${sliderName}</b> — always current.`
            : 'No slider style chosen yet.'}</span>
        </div>
        <div class="row">
          <label class="row-label">Slider Style</label>
          <select @change=${(e) => { const v = e.target.value; if (v) { this._csDraft = linkSliderStyle(this._csDraft, v); this.requestUpdate(); } }}>
            <option value="">${d.slider_source ? 'Change slider style…' : 'Choose a slider style…'}</option>
            <optgroup label="Built-in">
              ${Object.keys(builtinModernStyles()).map(sl => html`<option value=${sl}>${builtinModernStyles()[sl].name}</option>`)}
            </optgroup>
            ${Object.keys(modernStyleLibraryMap()).length ? html`<optgroup label="Library">
              ${Object.keys(modernStyleLibraryMap()).map(sl => html`<option value=${'lib:' + sl}>${modernStyleLibraryMap()[sl].name || sl}</option>`)}
            </optgroup>` : ''}
          </select>
        </div>
        <div class="hint">Values are read-only here — they live in the <b>Slider Styles</b> library, so
          editing them there updates every Cover Style using this slider. Want a different look for
          one style? Create another Slider Style and point this at it.</div>`)
        : this._csGroup('images', 'Image Slider', () => html`
        ${this._rowSlider(this._csField(C.CONFIG_BASE_WIDTH_PX, { label: 'Base Width', type: 'slider', min: 20, max: 400, step: 5, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_BASE_HEIGHT_PX, { label: 'Base Height', type: 'slider', min: 20, max: 400, step: 5, unit: 'px' }))}
        ${this._rowImageSelect(this._csField(C.CONFIG_WINDOW_IMAGE, { label: 'Window Image', type: 'imageSelect', options: C.BUNDLED_WINDOW_IMAGES, allowColour: false }))}
        ${this._rowImageSelect(this._csField(C.CONFIG_VIEW_IMAGE, { label: 'View Image / Colour', type: 'imageSelect', options: C.BUNDLED_VIEW_IMAGES, seedHex: '#20303a' }))}
        ${this._rowImageSelect(this._csField(C.CONFIG_SHUTTER_SLAT_IMAGE, { label: 'Slat Image / Colour', type: 'imageSelect', options: C.BUNDLED_SLAT_IMAGES, seedHex: '#888888' }))}
        ${this._rowImageSelect(this._csField(C.CONFIG_SHUTTER_BOTTOM_IMAGE, { label: 'Bottom-Bar Image', type: 'imageSelect', options: C.BUNDLED_BOTTOM_IMAGES, allowColour: false }))}
        ${this._rowCheckRow({ label: 'Image Options', items: [
          this._csField(C.CONFIG_ROTATE_SLATS_SHUTTER_IMAGE, { label: 'Rotate Slat With Direction' }),
          this._csField(C.CONFIG_STRETCH_EDGE_SHUTTER_IMAGE, { label: 'Stretch Bottom Image' }),
        ] })}
        ${this._rowText(this._csField(C.CONFIG_IMAGE_MAP, { label: 'Images Base Path', type: 'text' }))}`)}
      ${this._csGroup('show', 'Show / Hide', () => html`
        ${this._rowCheckRow({ label: '', items: [
          this._csField(C.CONFIG_SHOW_WINDOW, { label: 'Cover' }),
          this._csField(C.CONFIG_SHOW_NAME, { label: 'Name' }),
          this._csField(C.CONFIG_SHOW_STANDARD_BUTTONS, { label: 'Movement Buttons' }),
          this._csField(C.CONFIG_SHOW_OPEN_CLOSE_SLIDER, { label: 'Slider' }),
        ] })}
        ${this._rowCheckRow({ label: '', items: [
          this._csField(C.CONFIG_SHOW_TILT_BUTTONS, { label: 'Tilt' }),
          this._csField(C.CONFIG_SHOW_TILT_SLIDER, { label: 'Tilt Slider' }),
          this._csField(C.CONFIG_SHOW_PARTIAL_OPEN_BUTTONS, { label: 'Position Buttons' }),
          this._csField(C.CONFIG_PANEL_POS_SHOW, { label: 'Position Readout' }),
          this._csField(C.CONFIG_LC_SHOW_TIME, { label: 'Last Changed Time' }),
          this._csField(C.CONFIG_LC_SHOW_AGO, { label: 'Last Changed Ago' }),
        ] })}
        ${this._rowCheckRow({ label: '', items: [
          this._csField(C.CONFIG_SHOW_BATTERY, { label: 'Battery' }),
          this._csField(C.CONFIG_SHOW_SIGNAL, { label: 'Signal' }),
        ] })}
        <div class="hint">Tilt controls also hide automatically when the cover doesn't report tilt support.</div>`)}
      ${this._csGroup('name', 'Cover Name', () => html`
        ${this._rowSelect(this._csField(C.CONFIG_NAME_POSITION, { label: 'Placement', type: 'select',
          options: [['top', 'Top of image'], ['bottom', 'Bottom of image'], ['left', 'Left of image'], ['right', 'Right of image']] }))}
        ${this._csAlignRow(C.CONFIG_NAME_ALIGN, C.CONFIG_NAME_POSITION, 'Alignment')}
        ${this._rowSlider(this._csField(C.CONFIG_NAME_TEXT_SIZE, { label: 'Size', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', zeroLabel: 'Default' }))}
        ${this._rowSelect(this._csField(C.CONFIG_NAME_TEXT_WEIGHT, { label: 'Weight', type: 'select', options: [['normal', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['bold', 'Bold']] }))}
        ${this._rowColor(this._csField(C.CONFIG_NAME_TEXT_COLOR, { label: 'Color', defaultLabel: 'Theme' }))}
        ${this._rowSlider(this._csField(C.CONFIG_NAME_COVER_GAP, { label: 'Name \u2194 Cover Gap', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', zeroLabel: 'Default',
          hint: 'Distance from the cover, applied on whichever side the name sits. When the readout shares that side, the outer item\'s gap also sets the space between them.' }))}
        ${this._rowSwitch(this._csField(C.CONFIG_HEADER_ON_COVER, { label: 'Align to Cover (otherwise, to Panel)',
          hint: 'Top/bottom Left/Center/Right are measured against the cover image rather than the whole panel. Applies when the controls sit beside the cover.' }))}`)}
      ${this._csGroup('controls', 'Control Placement', () => html`
        <div class="group-title">Movement Buttons</div>
        ${this._rowSelect(this._csField(C.CONFIG_STANDARD_POSITION, { label: 'Placement', type: 'select', options: [['before', 'Left / before'], ['after', 'Right / after'], ['top', 'Top'], ['bottom', 'Bottom']] }))}
        ${this._rowSelect(this._csField(C.CONFIG_STANDARD_ORIENTATION, { label: 'Layout', type: 'select', options: [['auto', 'Auto'], ['row', 'Horizontal row'], ['column', 'Vertical column']] }))}
        <div class="group-title">Position Buttons</div>
        ${this._rowSelect(this._csField(C.CONFIG_PRESETS_POSITION, { label: 'Placement', type: 'select', options: [['before', 'Left / before'], ['after', 'Right / after'], ['top', 'Top'], ['bottom', 'Bottom']] }))}
        ${this._rowSelect(this._csField(C.CONFIG_PRESETS_ORIENTATION, { label: 'Layout', type: 'select', options: [['auto', 'Auto'], ['row', 'Horizontal row'], ['column', 'Vertical column']] }))}
        <div class="group-title">Sliders</div>
        ${this._rowSelect(this._csField(C.CONFIG_SLIDER_POSITION, { label: 'Slider', type: 'select', options: [['before', 'Left / before'], ['after', 'Right / after'], ['top', 'Top'], ['bottom', 'Bottom']] }))}
        ${this._rowSelect(this._csField(C.CONFIG_TILT_POSITION, { label: 'Tilt', type: 'select', options: [['before', 'Left / before'], ['after', 'Right / after'], ['top', 'Top'], ['bottom', 'Bottom']] }))}`)}
      ${this._csGroup('controlsLook', 'Directional Controls', () => html`
        ${this._rowColor(this._csField(C.CONFIG_CONTROL_ICON_COLOR, { label: 'Icon Color', defaultLabel: 'Theme' }))}
        <div class="group-title">Button Spacing</div>
        ${this._rowSlider(this._csField(C.CONFIG_CONTROLS_BUTTON_GAP, { label: 'Padding Between Buttons', type: 'slider', min: 0, max: 40, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_CONTROLS_PAD_TOP, { label: 'Padding Top', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_CONTROLS_PAD_RIGHT, { label: 'Padding Right', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_CONTROLS_PAD_BOTTOM, { label: 'Padding Bottom', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_CONTROLS_PAD_LEFT, { label: 'Padding Left', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        <div class="group-title">Icons</div>
        ${this._rowText(this._csField(C.CONFIG_ICON_UP, { label: 'Up Icon', type: 'text', placeholder: 'mdi:arrow-up' }))}
        ${this._rowText(this._csField(C.CONFIG_ICON_STOP, { label: 'Stop Icon', type: 'text', placeholder: 'mdi:stop' }))}
        ${this._rowText(this._csField(C.CONFIG_ICON_DOWN, { label: 'Down Icon', type: 'text', placeholder: 'mdi:arrow-down' }))}
        ${this._rowText(this._csField(C.CONFIG_ICON_PARTIAL, { label: 'Favorite Icon', type: 'text', placeholder: 'mdi:star-circle' }))}
        ${this._rowText(this._csField(C.CONFIG_ICON_TILT_UP, { label: 'Tilt-Up Icon', type: 'text', placeholder: 'mdi:arrow-top-right' }))}
        ${this._rowText(this._csField(C.CONFIG_ICON_TILT_DOWN, { label: 'Tilt-Down Icon', type: 'text', placeholder: 'mdi:arrow-bottom-left' }))}
        <div class="group-title">Button Visibility</div>
        ${this._rowSwitch(this._csField(C.CONFIG_DISABLE_END_BUTTONS, { label: 'Disable Up / Down at the end of travel',
          hint: 'Greys out Up when fully open and Down when fully closed, so they cannot be pressed. The button stays visible.' }))}
        <div class="hint">Pick the states in which each button reacts. By default it changes colour so it
          stays visible and usable; tick "Hide completely" to remove it instead.</div>
        ${this._rowBtnVis('Up Button', C.CONFIG_BUTTON_OPENED_HIDE_STATES, C.CONFIG_BUTTON_UP_STATE_COLOR, C.CONFIG_BUTTON_UP_HIDE, STATES_FOR_STYLE)}
        ${this._rowBtnVis('Down Button', C.CONFIG_BUTTON_CLOSED_HIDE_STATES, C.CONFIG_BUTTON_DOWN_STATE_COLOR, C.CONFIG_BUTTON_DOWN_HIDE, STATES_FOR_STYLE)}
        ${this._rowBtnVis('Stop Button', C.CONFIG_BUTTON_STOP_HIDE_STATES, C.CONFIG_BUTTON_STOP_STATE_COLOR, C.CONFIG_BUTTON_STOP_HIDE, STATES_FOR_STYLE)}`)}
      ${this._csGroup('presetBtns', 'Position Buttons', () => html`
        ${this._rowSelect(this._csField(C.CONFIG_PARTIAL_BUTTONS_STYLE, { label: 'Button Type', type: 'select',
          options: [[C.PARTIAL_STYLE_ICONS, 'Icons'], [C.PARTIAL_STYLE_VALUES, 'Values (20%, 50%\u2026)']] }))}
        ${this._rowChips(this._csField(C.CONFIG_POSITION_PRESETS, { label: 'Preset Percentages', type: 'chips',
          placeholder: 'Default: 25, 50, 75 \u2014 add a value to override',
          hint: 'Leave empty to use the default 25, 50, 75.' }))}
        ${this._rowColor(this._csField(C.CONFIG_PCT_ICON_COLOR, { label: 'Icon Color', defaultLabel: 'Theme' }))}
        <div class="group-title">Button Spacing</div>
        ${this._rowSlider(this._csField(C.CONFIG_PCT_BUTTON_GAP, { label: 'Padding Between Buttons', type: 'slider', min: 0, max: 40, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_PCT_PAD_TOP, { label: 'Padding Top', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_PCT_PAD_RIGHT, { label: 'Padding Right', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_PCT_PAD_BOTTOM, { label: 'Padding Bottom', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowSlider(this._csField(C.CONFIG_PCT_PAD_LEFT, { label: 'Padding Left', type: 'slider', min: 0, max: 60, step: 1, unit: 'px' }))}
        ${this._rowButtonStyle(this._csField(C.CONFIG_PCT_BUTTON_STYLE, { label: 'Button Style (Library)', hint: 'A shared look from the Button Styles library. Any setting below that you fill in overrides it.' }))}
        ${this._rowColor(this._csField(C.CONFIG_PCT_BUTTON_BG, { label: 'Background', defaultLabel: 'Theme', allowTransparent: true }))}
        ${this._rowColor(this._csField(C.CONFIG_PCT_BUTTON_BORDER, { label: 'Border', defaultLabel: 'Theme', allowTransparent: true }))}
        ${this._rowColor(this._csField(C.CONFIG_PCT_BUTTON_COLOR, { label: 'Text Color', defaultLabel: 'Theme' }))}
        ${this._rowSelect(this._csField(C.CONFIG_PCT_BUTTON_WEIGHT, { label: 'Text Weight', type: 'select', options: [['normal', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['bold', 'Bold']] }))}
        ${this._rowSlider(this._csField(C.CONFIG_PCT_BUTTON_SIZE, { label: 'Text Size', type: 'slider', min: 0, max: 30, step: 1, unit: 'px', zeroLabel: 'Default' }))}
        <div class="hint">A Button Style from the library is a reference \u2014 it may fall back to defaults on a system that doesn't have it.</div>
`)}
      ${this._csGroup('posReadout', 'Position Readout', () => html`
        ${this._rowSelect(this._csField(C.CONFIG_POSITION_PLACEMENT, { label: 'Placement', type: 'select',
          options: [['top', 'Top of image'], ['bottom', 'Bottom of image'], ['left', 'Left of image'], ['right', 'Right of image'],
            ['on-handle', 'On the handle'], ['at-handle-left', 'At handle — left'], ['at-handle-right', 'At handle — right'],
            ['at-handle-above', 'At handle — above'], ['at-handle-below', 'At handle — below']] }))}
        ${this._csAlignRow(C.CONFIG_POS_ALIGN, C.CONFIG_POSITION_PLACEMENT, 'Alignment')}
        ${this._rowSlider(this._csField(C.CONFIG_PANEL_POS_SIZE, { label: 'Size', type: 'slider', min: 0, max: 40, step: 1, unit: 'px', zeroLabel: 'Default' }))}
        ${this._rowSelect(this._csField(C.CONFIG_PANEL_POS_WEIGHT, { label: 'Weight', type: 'select', options: [['normal', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['bold', 'Bold']] }))}
        ${this._rowColor(this._csField(C.CONFIG_PANEL_POS_COLOR, { label: 'Color', defaultLabel: 'Theme' }))}
        ${this._rowSlider(this._csField(C.CONFIG_POS_COVER_GAP, { label: 'Readout \u2194 Cover Gap', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', zeroLabel: 'Default',
          hint: 'Distance from the cover, applied on whichever side the readout sits. When the name shares that side, the outer item\'s gap also sets the space between them.' }))}
        ${this._rowSwitch(this._csField(C.CONFIG_HEADER_ON_COVER, { label: 'Align to Cover (otherwise, to Panel)',
          hint: 'Shared with the Cover Name, so the two always align against the same thing.' }))}`)}
      ${this._csGroup('lastChanged', 'Last Changed', () => html`
        <div class="hint">When the cover last moved, as a clock time (12:02 PM) and/or time since
          (3 h 12 m). Turn each on under Show / Hide.</div>
        ${this._rowSelect(this._csField(C.CONFIG_LC_PLACEMENT, { label: 'Placement', type: 'select',
          options: [['top', 'Top of image'], ['bottom', 'Bottom of image'], ['left', 'Left of image'], ['right', 'Right of image'],
            ['on-handle', 'On the handle'], ['at-handle-left', 'At handle \u2014 left'], ['at-handle-right', 'At handle \u2014 right'],
            ['at-handle-above', 'At handle \u2014 above'], ['at-handle-below', 'At handle \u2014 below']] }))}
        ${this._csAlignRow(C.CONFIG_LC_ALIGN, C.CONFIG_LC_PLACEMENT, 'Alignment')}
        ${this._rowSlider(this._csField(C.CONFIG_LC_SIZE, { label: 'Size', type: 'slider', min: 0, max: 40, step: 1, unit: 'px', zeroLabel: 'Default' }))}
        ${this._rowSelect(this._csField(C.CONFIG_LC_WEIGHT, { label: 'Weight', type: 'select', options: [['normal', 'Normal'], ['500', 'Medium'], ['600', 'Semibold'], ['bold', 'Bold']] }))}
        ${this._rowColor(this._csField(C.CONFIG_LC_COLOR, { label: 'Color', defaultLabel: 'Default' }))}
        ${this._rowSlider(this._csField(C.CONFIG_LC_COVER_GAP, { label: 'Last Changed \u2194 Cover Gap', type: 'slider', min: 0, max: 60, step: 1, unit: 'px', zeroLabel: 'Default',
          hint: 'Distance from the cover, applied on whichever side it sits. When it shares a side with the name or readout, the outer item\'s gap also sets the space between them.' }))}`)}
      ${this._csGroup('behavior', 'Behavior', () => html`
        ${this._rowSelect(this._csField(C.CONFIG_MODERN_TRAVEL, { label: 'Travel Style', type: 'select',
          options: [['single', 'Single (one edge)'], ['center', 'Center-out (two panels)'], ['tdbu', 'Top-down / bottom-up']] }))}
        ${this._rowSlider(this._csField(C.CONFIG_PARTIAL_CLOSE_PCT, { label: 'Favorite Position', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }))}
        ${this._rowSlider(this._csField(C.CONFIG_OFFSET_IS_CLOSED_PCT, { label: 'Treat As Closed Below', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }))}
        ${this._rowSlider(this._csField(C.CONFIG_OFFSET_OPENED_PCT, { label: 'Top Offset', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }))}
        ${this._rowSlider(this._csField(C.CONFIG_OFFSET_CLOSED_PCT, { label: 'Bottom Offset', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }))}
        ${this._rowSlider(this._csField(C.CONFIG_TILT_ANGLE_MIN, { label: 'Tilt Angle Min', type: 'slider', min: 0, max: 360, step: 5, unit: '°' }))}
        ${this._rowSlider(this._csField(C.CONFIG_TILT_ANGLE_MAX, { label: 'Tilt Angle Max', type: 'slider', min: 0, max: 360, step: 5, unit: '°' }))}
        ${this._rowCheckRow({ label: 'Invert Percentage', items: [
          this._csField(C.CONFIG_INVERT_PCT_UI, { label: 'UI' }),
          this._csField(C.CONFIG_INVERT_PCT_COVER, { label: 'Device' }),
        ] })}
        ${this._rowCheckRow({ label: 'Invert Open / Close', items: [
          this._csField(C.CONFIG_INVERT_OPEN_CLOSE_UI, { label: 'UI' }),
          this._csField(C.CONFIG_INVERT_OPEN_CLOSE_COVER, { label: 'Device' }),
        ] })}
        ${this._rowCheckRow({ label: 'Invert Tilt %', items: [
          this._csField(C.CONFIG_INVERT_PCT_TILT_UI, { label: 'UI' }),
          this._csField(C.CONFIG_INVERT_PCT_TILT_COVER, { label: 'Device' }),
        ] })}`)}



      <div class="style-actions">
        <span class="hint" style="align-self:center;flex:1 1 auto;">The editor's card preview follows your changes as you edit. Save to keep them; Cancel reverts.</span>
        <button class="add-btn" @click=${() => this._csSave()}>Save</button>
        <button class="ent-ic" @click=${() => this._csClose()}>Cancel</button>
      </div>`;
  }
  _renderCoverStyleLibrary() {
    const open = !!this._openPanels['coverstylelib'];
    const map = coverStyleLibraryMap();
    const builtins = builtinCoverStyles();
    return html`
      <details class="panel ${open ? 'open' : ''}" ?open=${open}
        @toggle=${(e) => { if (e.target.open !== open) this._togglePanel('coverstylelib'); }}>
        <summary class="panel-sum">
          <ha-icon class="panel-ic" icon="mdi:palette-swatch-variant"></ha-icon>
          <span class="panel-sum-title">Cover Styles</span>
          <ha-icon class="panel-chev" icon="mdi:chevron-down"></ha-icon>
        </summary>
        <div class="panel-body">
          <div class="hint">Per-cover looks you can assign to areas or individual covers — so roller shades,
            cellular shades and curtains can share one card. Duplicate a built-in to make your own.</div>
          ${this._csDraft ? this._renderCoverStyleEditor() : html`
            <div class="chip-add">
              <button class="add-btn" @click=${() => this._csNew()}>+ Cover Style</button>
              <button class="add-btn" title="Move this card's own visual settings into a new Cover Style"
                @click=${() => this._csAdoptCardSettings()}>Adopt this card's settings</button>
              <button class="add-btn" title="Export every saved Cover Style as JSON"
                @click=${() => this._csExport(null)}>Export all</button>
              <button class="add-btn" title="Import Cover Styles from exported JSON"
                @click=${() => this._csImport()}>Import</button>
            </div>
            ${Object.keys(builtins).map(slug => html`
              <div class="ent-row" style="cursor:pointer;"
                title=${BUILTINS_EDITABLE ? 'Edit this built-in style' : 'Preview this built-in style'}
                @click=${(e) => { if (e.target.closest('button')) return; BUILTINS_EDITABLE ? this._csEdit(slug) : this._csView(slug); }}>
                <ha-icon class="panel-ic" icon=${BUILTINS_EDITABLE ? 'mdi:pencil-outline' : 'mdi:lock-outline'}></ha-icon>
                <span style="flex:1 1 auto;">${(coverStyleEntry(slug) || builtins[slug]).name}
                  <span class="hint">built-in${(BUILTINS_EDITABLE && coverStyleLibraryMap()[slug]) ? ' \u00b7 edited' : ''}</span></span>
                <span class="ecs-picker-id" title=${`Style id used in YAML: ${slug}`}>id: ${slug}</span>
                ${BUILTINS_EDITABLE
                  ? html`<button class="ent-ic" title="Edit" @click=${() => this._csEdit(slug)}>✎</button>
                    <button class="ent-ic" title="Export this style as JSON" @click=${() => this._csExport(slug)}><ha-icon icon="mdi:export-variant"></ha-icon></button>`
                  : html`<button class="ent-ic" title="Preview" @click=${() => this._csView(slug)}>👁</button>`}
                <button class="ent-ic" title="Duplicate" @click=${() => this._csDuplicate(slug)}>⧉</button>
              </div>`)}
            ${Object.keys(map).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:palette-swatch-variant"></ha-icon>
                <span style="flex:1 1 auto;">${map[slug].name || slug}''</span>
                <span class="ecs-picker-id"
                  title=${`Style id used in YAML: ${slug}. It stays fixed when you rename the style, so existing assignments keep working.`}>id: ${slug}</span>
                <button class="ent-ic" title="Edit" @click=${() => this._csEdit(slug)}>✎</button>
                <button class="ent-ic" title="Export this style as JSON" @click=${() => this._csExport(slug)}><ha-icon icon="mdi:export-variant"></ha-icon></button>
                <button class="ent-ic" title="Duplicate" @click=${() => this._csDuplicate(slug)}>⧉</button>
                <button class="ent-ic del" title="Delete" @click=${() => this._csDelete(slug)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
              </div>`)}
          `}
        </div>
      </details>`;
  }

  static get styles() {
    return css`${unsafeCSS(EnhancedShutterCardEditor.CSS)}`;
  }
}

// --ltek-* editor-chrome tokens (byte-identical block across cards) + editor layout
EnhancedShutterCardEditor.CSS = `
  .ed {
    /* Font sizes (by role, not by pixel) */
    --ltek-fs-panel-title: 16px;
    --ltek-fs-header: 15px;
    --ltek-fs-group: 14px;
    --ltek-fs-label: 13px;
    --ltek-fs-body: 12px;
    --ltek-fs-small: 11px;
    --ltek-fs-tiny: 10px;
    /* Font weights */
    --ltek-fw-normal: 400;
    --ltek-fw-medium: 500;
    --ltek-fw-semibold: 600;
    --ltek-fw-bold: 700;
    /* Text colors */
    --ltek-c-text: var(--primary-text-color, #e1e1e1);
    --ltek-c-label: #ccc;
    --ltek-c-muted: #888;
    --ltek-c-accent: var(--primary-color, #2196F3);
    /* Accent tints */
    --ltek-c-accent-fade: rgba(var(--rgb-primary-color,33,150,243),0.12);
    --ltek-c-accent-fade-soft: rgba(var(--rgb-primary-color,33,150,243),0.08);
    --ltek-c-error-fade: rgba(244,67,54,0.15);
    /* Status colors */
    --ltek-c-error: var(--error-color, #f44336);
    --ltek-c-success: var(--success-color, #4caf50);
    --ltek-c-warning: var(--warning-color, #ffb300);
    --ltek-c-info: var(--info-color, #2196F3);
    /* Second accent */
    --ltek-c-accent-lib: #7fd18a;
    --ltek-c-on-accent: #fff;
    /* Action icons */
    --ltek-c-icon: #aaa;
    --ltek-c-icon-hover: #fff;
    /* Surfaces */
    --ltek-c-surface: rgba(255,255,255,0.015);
    --ltek-c-surface-raised: rgba(255,255,255,0.02);
    /* Borders */
    --ltek-c-panel-border: #3a3a3a;
    --ltek-c-border: #444;
    --ltek-c-border-soft: #333;
    /* Radii */
    --ltek-r-panel: 12px;
    --ltek-r-card: 10px;
    --ltek-r-md: 8px;
    --ltek-r-ctrl: 6px;
    /* Spacing scale (4px base) */
    --ltek-sp-1: 4px;  --ltek-sp-2: 6px;  --ltek-sp-3: 8px;
    --ltek-sp-4: 10px; --ltek-sp-5: 12px; --ltek-sp-6: 16px;
    /* Control padding */
    --ltek-ctrl-pad: 6px 10px;
    /* Icon sizes */
    --ltek-icon-sm: 16px;
    --ltek-icon-lg: 20px;
    /* Slider row geometry */
    --ltek-slider-val-w: 44px;

    display: flex;
    flex-direction: column;
    gap: var(--ltek-sp-3);
    color: var(--ltek-c-text);
    font-size: var(--ltek-fs-body);
    /* make native controls (select popups, date/number spinners) render dark & readable */
    color-scheme: dark;
  }
  .panel {
    border: 1px solid var(--ltek-c-panel-border);
    border-radius: var(--ltek-r-panel);
    background: var(--ltek-c-surface);
  }
  .panel.open { border-color: var(--ltek-c-accent); }
  .panel-sum {
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    gap: var(--ltek-sp-3);
    padding: 14px 16px;
    font-size: var(--ltek-fs-panel-title);
    font-weight: var(--ltek-fw-bold);
    color: var(--ltek-c-text);
  }
  .panel-sum-title { flex: 1 1 auto; }
  .panel-ic { color: var(--ltek-c-accent); --mdc-icon-size: var(--ltek-icon-lg); width: 20px; height: 20px; flex-shrink: 0; }
  .panel-chev { color: var(--secondary-text-color, #999); --mdc-icon-size: 22px; transition: transform 0.2s ease; }
  .panel.open .panel-chev { transform: rotate(180deg); color: var(--ltek-c-accent); }
  .panel.open .panel-sum { color: var(--ltek-c-accent); }
  .panel-sum::-webkit-details-marker { display: none; }
  /* editor top header: card name + version */
  .ed-header {
    display: flex; align-items: center; gap: var(--ltek-sp-3);
    padding: 2px 2px 10px; border-bottom: 1px solid var(--divider-color, #333); margin-bottom: 4px;
  }
  .ed-header ha-icon { --mdc-icon-size: 22px; color: var(--ltek-c-accent); }
  .ed-title { font-size: var(--ltek-fs-header); font-weight: var(--ltek-fw-bold); color: var(--ltek-c-text); }
  .ed-build { margin-left: auto; font-size: var(--ltek-fs-small); color: var(--ltek-c-muted); font-family: var(--code-font-family, monospace); }
  /* group separators between panel clusters */
  .ed-group-divider {
    display: flex; align-items: center; gap: 10px; margin: 12px 2px 6px;
    color: var(--ltek-c-accent); font-size: var(--ltek-fs-label); font-weight: var(--ltek-fw-bold);
    letter-spacing: 0.02em; text-transform: uppercase;
  }
  .ed-group-divider::before, .ed-group-divider::after {
    content: ''; flex: 1; height: 2px; opacity: 0.5;
    background: linear-gradient(to right, transparent, var(--ltek-c-accent));
  }
  .ed-group-divider::before { background: linear-gradient(to left, transparent, var(--ltek-c-accent)); }
  .panel-body {
    display: flex;
    flex-direction: column;
    gap: var(--ltek-sp-3);
    padding: 0 var(--ltek-sp-5) var(--ltek-sp-5);
    min-width: 0;
  }
  /* nothing inside a panel may push past its border */
  .panel-body, .panel-body * { box-sizing: border-box; }
  .panel-body > * { min-width: 0; max-width: 100%; }
  .hint {
    color: var(--ltek-c-muted);
    font-size: var(--ltek-fs-small);
    line-height: 1.4;
  }
  .group-title {
    margin-top: var(--ltek-sp-4);
    padding-top: var(--ltek-sp-3);
    border-top: 1px solid var(--ltek-c-border-soft);
    color: var(--ltek-c-accent);
    font-size: var(--ltek-fs-group);
    font-weight: var(--ltek-fw-semibold);
  }
  .panel-body > .group-title:first-child,
  .panel-body > .hint + .group-title { border-top: none; margin-top: 0; padding-top: 0; }
  .row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ltek-sp-4);
    min-height: 32px;
  }
  /* label column: fixed-ish so controls line up in a column next to their labels (not pushed right) */
  /* Canonical field row (matches the Color card's .cpce-row): the label is CONTENT width and the
     control sits immediately beside it, separated only by the row gap. No fixed label column —
     that pushed controls far from short labels. */
  .row > .row-label { flex: 0 0 auto; }
  /* the control takes the remaining width and is allowed to shrink (prevents overflowing the panel) */
  .row > *:not(.row-label) { flex: 1 1 auto; min-width: 0; max-width: 100%; }
  /* boolean rows are checkbox-first with no label column */
  .row.row-bool { justify-content: flex-start; }
  .row.row-bool > .ecs-check { flex: 0 1 auto; }
  .row-label {
    font-size: var(--ltek-fs-label);
    font-weight: var(--ltek-fw-normal);
    color: var(--ltek-c-label);
  }
  select, input[type="text"], input[type="number"] {
    background: var(--card-background-color, #1c1c1c);
    color: var(--ltek-c-text);
    border: 1px solid var(--ltek-c-border);
    border-radius: var(--ltek-r-ctrl);
    padding: var(--ltek-ctrl-pad);
    font-size: var(--ltek-fs-body);
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }
  select:hover, input[type="text"]:hover, input[type="number"]:hover { border-color: var(--ltek-c-accent); }
  select:focus, input:focus { outline: none; border-color: var(--ltek-c-accent); }
  /* the dropdown popup list: force an opaque dark surface with readable text */
  select option {
    background: var(--card-background-color, #1c1c1c);
    color: var(--ltek-c-text);
  }
  .chips-field { display: flex; flex-direction: column; gap: var(--ltek-sp-2); }
  /* segmented control (mutually exclusive options) */
  .seg { display: inline-flex; flex: 0 1 auto !important; border: 1px solid var(--ltek-c-border); border-radius: var(--ltek-r-ctrl); overflow: hidden; }
  .seg-btn {
    background: transparent; color: var(--ltek-c-text); border: 0; border-left: 1px solid var(--ltek-c-border);
    padding: var(--ltek-ctrl-pad); font-size: var(--ltek-fs-body); cursor: pointer; min-width: 64px;
  }
  .seg-btn:first-child { border-left: 0; }
  .seg-btn:hover { background: var(--ltek-c-accent-fade-soft); }
  .seg-btn.on { background: var(--ltek-c-accent-fade); color: var(--ltek-c-accent); font-weight: var(--ltek-fw-semibold); }
  .seg-btn:focus-visible { outline: 2px solid var(--ltek-c-accent); outline-offset: -2px; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--ltek-sp-2); }
  .chip {
    display: inline-flex; align-items: center; gap: var(--ltek-sp-1);
    background: var(--ltek-c-accent-fade);
    border: 1px solid var(--ltek-c-accent);
    color: var(--ltek-c-text);
    border-radius: 999px;
    padding: 2px 4px 2px 10px;
    font-size: var(--ltek-fs-small);
  }
  .chip-x, .add-btn, .multi-opt {
    cursor: pointer;
    background: none;
    border: none;
    color: var(--ltek-c-icon);
    font-size: var(--ltek-fs-small);
  }
  .chip-x:hover { color: var(--ltek-c-error); }
  .chip-add { display: flex; gap: var(--ltek-sp-2); }
  .chip-add input { flex: 1 1 auto; }
  .add-btn {
    border: 1px dashed var(--ltek-c-accent);
    border-radius: var(--ltek-r-ctrl);
    color: var(--ltek-c-accent);
    padding: 4px 12px;
  }
  .multi { display: flex; flex-wrap: wrap; gap: var(--ltek-sp-2); }
  .multi-opt {
    border: 1px solid var(--ltek-c-border);
    border-radius: var(--ltek-r-ctrl);
    padding: 4px 10px;
    color: var(--ltek-c-label);
  }
  .multi-opt.on {
    border-color: var(--ltek-c-accent);
    background: var(--ltek-c-accent-fade);
    color: var(--ltek-c-accent);
  }
  .ent-field { display: flex; flex-direction: column; gap: var(--ltek-sp-2); }
  /* compact checkbox row (Show toggles, name cleaner, …) — box before label, wraps */
  .ecs-check-row { display: flex; align-items: center; gap: var(--ltek-sp-4); padding: 2px 0; flex-wrap: wrap; min-height: 32px; }
  .ecs-check-row > .row-label { flex: 0 0 auto; }
  .ecs-check-items { display: flex; flex-wrap: wrap; gap: var(--ltek-sp-3) var(--ltek-sp-6); flex: 1 1 auto; }
  .ecs-check { display: inline-flex; align-items: center; gap: var(--ltek-sp-2); cursor: pointer;
    font-size: var(--ltek-fs-label); color: var(--ltek-c-label); font-weight: var(--ltek-fw-normal); }
  .ecs-check input[type="checkbox"] { width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: var(--ltek-c-accent); flex: 0 0 auto; }
  /* boolean row control — native checkbox (matches the Color card), replaces ha-switch */
  input.ecs-switch-cb { width: 18px; height: 18px; margin: 0; cursor: pointer; accent-color: var(--ltek-c-accent); flex: 0 0 auto; }
  /* Cover Style editor: collapsible groups */
  .cs-grp { border-top: 1px solid var(--ltek-c-border-soft); }
  .cs-grp-head { display: flex; align-items: center; gap: var(--ltek-sp-2); padding: 8px 2px; cursor: pointer; }
  .cs-grp-head:hover { background: var(--ltek-c-accent-fade-soft); }
  .cs-grp-title { flex: 1 1 auto; font-size: var(--ltek-fs-group); font-weight: var(--ltek-fw-bold); color: var(--ltek-c-accent);
    /* v168: collapsible sub-section headings are UPPERCASE, matching the Color card's
       .cpce-collapse-head and the Entity card's .seed-ed-substyle-sum. Group subtitles inside a
       section (.group-title) stay mixed-case accent — that contrast is what separates the levels. */
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .btnvis { display: flex; flex-direction: column; gap: var(--ltek-sp-2); padding: var(--ltek-sp-2) 0; }
  .btnvis-line { display: flex; align-items: center; gap: var(--ltek-sp-3); flex-wrap: wrap; }
  .btnvis-sub { padding-left: var(--ltek-sp-6); }
  .btnvis-sub > .row { flex: 0 1 auto; }
  .btnvis-hide { margin-left: auto; }
  .cs-grp-chev { color: var(--secondary-text-color, #999); --mdc-icon-size: 20px; transition: transform .2s ease; }
  .cs-grp.open .cs-grp-chev { transform: rotate(180deg); }
  .cs-grp-body { padding: 0 0 8px; display: flex; flex-direction: column; gap: var(--ltek-sp-3); }
  /* Cover Style builder preview */
  .cs-prev {
    display: flex; gap: 18px; justify-content: center; align-items: flex-end;
    padding: 12px 0 6px; margin-bottom: var(--ltek-sp-2);
    border: 1px solid var(--ltek-c-border-soft); border-radius: var(--ltek-r-md);
    background: var(--ltek-c-surface-raised);
  }
  .cs-prev-box { display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
  .cs-prev-rot { display: inline-flex; flex: 0 0 auto; }
  .cs-prev-rot[data-rot="left"]  { transform: rotate(-90deg); }
  .cs-prev-rot[data-rot="right"] { transform: rotate(90deg); }
  /* Cover Style assignment rows */
  .cs-assign {
    border: 1px solid var(--ltek-c-border-soft); border-radius: var(--ltek-r-md);
    padding: var(--ltek-sp-3); margin-bottom: var(--ltek-sp-2);
    background: var(--ltek-c-surface-raised);
  }
  .cs-assign-head { display: flex; align-items: center; gap: var(--ltek-sp-2); margin-bottom: var(--ltek-sp-2); }
  .cs-assign-name { flex: 1 1 auto; font-size: var(--ltek-fs-label); font-weight: var(--ltek-fw-medium); color: var(--ltek-c-text); }
  /* ONE search picker for every pick-from-a-list field (Areas, Labels, device classes, Covers).
     The list is hidden until the input is focused/typed into, so long lists never dominate a panel. */
  .ecs-picker { position: relative; display: flex; flex-direction: column; gap: var(--ltek-sp-2); }
  .ecs-picker-row-input { display: flex; align-items: center; gap: var(--ltek-sp-2); }
  .ecs-picker-row-input > .ecs-picker-input { flex: 1 1 auto; min-width: 0; }
  .ecs-scope { flex: 0 0 auto; min-width: 96px; }
  .ecs-picker-list {
    max-height: 210px; overflow-y: auto;
    border: 1px solid var(--ltek-c-border); border-radius: var(--ltek-r-ctrl);
    background: var(--card-background-color, #1c1c1c);
    padding: 2px 4px;
  }
  .ecs-picker-row {
    display: flex; align-items: center; gap: var(--ltek-sp-3);
    padding: 5px 4px; border-top: 1px solid var(--ltek-c-border-soft);
    font-size: var(--ltek-fs-label); color: var(--ltek-c-text); cursor: pointer;
  }
  .ecs-picker-row:first-child { border-top: none; }
  .ecs-picker-row:hover { background: var(--ltek-c-accent-fade-soft); }
  .ecs-picker-name { font-weight: var(--ltek-fw-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ecs-picker-id {
    flex: 1 1 auto; min-width: 0; font-size: var(--ltek-fs-small); color: var(--ltek-c-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ecs-picker-tag {
    flex: 0 0 auto; font-size: var(--ltek-fs-tiny); color: var(--ltek-c-muted);
    border: 1px solid var(--ltek-c-border-soft); border-radius: 10px; padding: 1px 7px;
  }
  .ecs-picker-add {
    flex: 0 0 auto; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
    border-radius: var(--ltek-r-ctrl);
    background: var(--ltek-c-accent); color: var(--ltek-c-on-accent);
    font-size: 16px; line-height: 1;
  }
  /* Starter Preset change indicator */
  /* Starter Presets: a setting changed away from the active preset gets a revert (⌫) button */
  .cs-link { border: 1px dashed var(--ltek-c-border-soft); border-radius: var(--ltek-r-md);
    padding: var(--ltek-sp-2) var(--ltek-sp-3); margin: var(--ltek-sp-2) 0; }
  .cs-link-state { display: flex; align-items: flex-start; gap: var(--ltek-sp-2);
    font-size: var(--ltek-fs-label); color: var(--ltek-c-label); margin-bottom: var(--ltek-sp-2); }
  .cs-link-state ha-icon { --mdc-icon-size: var(--ltek-icon-sm); flex: 0 0 auto; margin-top: 1px; }
  /* Change tracker (v145): a style is SPARSE, so "what this style defines" is simply the keys
     present in the draft. Set fields are marked rather than recoloured, so the accent colour keeps
     meaning "group heading" and nothing competes with it. */
  .cs-track { border: 1px solid var(--ltek-c-border-soft); border-radius: var(--ltek-r-md);
    background: var(--ltek-c-surface-raised); padding: var(--ltek-sp-2) var(--ltek-sp-3);
    margin-bottom: var(--ltek-sp-2); }
  .cs-track-head { display: flex; align-items: center; gap: var(--ltek-sp-2); cursor: pointer; }
  .cs-track-count { font-weight: var(--ltek-fw-semibold); }
  .cs-track-list { display: flex; flex-direction: column; gap: 2px; margin-top: var(--ltek-sp-2); }
  .cs-track-row { display: flex; align-items: center; gap: var(--ltek-sp-2);
    font-size: var(--ltek-fs-label); padding: 2px 0; }
  .cs-track-row .k { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cs-track-row .v { color: var(--ltek-c-label); font-variant-numeric: tabular-nums;
    max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cs-track-row.new .k::before { content: '● '; color: var(--ltek-c-accent); }
  /* a field this style defines gets a leading marker, not a colour change */
  .cs-set > .row-label::before, .cs-set > .ecs-check > span::before { content: '● ';
    color: var(--ltek-c-accent); }
  .preset-revert {
    flex: 0 0 auto; color: var(--ltek-c-accent);
    --mdc-icon-button-size: 26px; --mdc-icon-size: 17px;
  }
  .preset-revert:hover { color: var(--ltek-c-icon-hover); }
  /* compact divider-sides matrix */
  .ecs-div-row { display: flex; align-items: center; gap: 14px; padding: 2px 0; }
  .ecs-div-lbl { flex: 0 0 78px; color: var(--ltek-c-text); font-size: var(--ltek-fs-label); }
  .ecs-cb-wrap { display: inline-flex; align-items: center; gap: 3px; color: var(--ltek-c-muted); font-size: var(--ltek-fs-small); }
  .ecs-cb input { margin: 0; cursor: pointer; }
  .ent-row {
    display: flex; align-items: center; gap: var(--ltek-sp-2);
    background: var(--ltek-c-surface-raised);
    border-radius: var(--ltek-r-card);
    padding: var(--ltek-sp-2) var(--ltek-sp-3);
  }
  .ent-row input { flex: 1 1 auto; min-width: 0; }
  .ent-ic {
    cursor: pointer; background: none; border: none;
    color: var(--ltek-c-icon); font-size: var(--ltek-fs-label); padding: 0 4px;
  }
  .ent-ic:hover { color: var(--ltek-c-icon-hover); }
  .ent-ic ha-icon { --mdc-icon-size: var(--ltek-icon-sm); display: block; }
  .chip-x ha-icon { --mdc-icon-size: 14px; display: block; }
  .ent-ic.del:hover { color: var(--ltek-c-error); }
  .style-actions { display: flex; gap: var(--ltek-sp-3); align-items: center; margin-top: var(--ltek-sp-4); }
  /* Controls & Info expandable element subpanels (Color-card Buttons style) */
  .pos-item { border: 1px solid var(--divider-color, rgba(255,255,255,0.08)); border-radius: 8px; margin: 4px 0; overflow: hidden; }
  .pos-item.open { border-color: var(--ltek-c-accent); }
  .pos-item-head { display: flex; align-items: center; gap: var(--ltek-sp-3); height: 40px; padding: 0 6px 0 10px; cursor: pointer; }
  .pos-item-head:hover { background: var(--ltek-c-accent-fade-soft); }
  .pos-item-ic { color: var(--ltek-c-accent); --mdc-icon-size: 18px; flex: none; }
  .pos-item-title { flex: 1 1 auto; font-size: var(--ltek-fs-label); color: var(--ltek-c-text); }
  .pos-chev { --mdc-icon-size: 18px; color: var(--ltek-c-icon); transition: transform 0.15s ease; flex: none; }
  .pos-item.open .pos-chev { transform: rotate(180deg); }
  .pos-item-body { padding: 2px 10px 8px; }
  .eye-btn { --mdc-icon-button-size: 28px; --mdc-icon-size: 18px; color: var(--ltek-c-icon); flex: none; }
  .slider-row {
    display: flex; align-items: center; gap: var(--ltek-sp-4); min-height: 32px;
  }
  .slider-row .row-label { flex: 0 0 auto; }
  .slider-row input[type="range"] { flex: 1 1 auto; min-width: 80px; accent-color: var(--ltek-c-accent); }
  /* Slider value readout — shared --ltek- spec: bold, fixed width, right-aligned, tabular-nums so
     it never jitters while dragging, and always on the SAME row as its slider. */
  .slider-val {
    flex: 0 0 var(--ltek-slider-val-w);
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ltek-c-text);
    font-size: var(--ltek-fs-body);
    font-weight: var(--ltek-fw-semibold);
    white-space: nowrap;
  }
  .color-ctrl { display: flex; gap: var(--ltek-sp-2); align-items: center; flex-wrap: wrap; }
  /* A slider + its value readout must never break across lines (colour rows still wrap freely). */
  .color-ctrl.nowrap { flex-wrap: nowrap; min-width: 0; }
  .color-ctrl input[type="range"] { flex: 1 1 auto; min-width: 80px; accent-color: var(--ltek-c-accent); }
  .color-ctrl input[type="color"] { width: 44px; height: 30px; padding: 0; border-radius: var(--ltek-r-ctrl); min-width: 44px; }
  pre.yaml {
    margin: 0;
    padding: var(--ltek-sp-3);
    background: var(--ltek-c-surface-raised);
    border: 1px solid var(--ltek-c-border-soft);
    border-radius: var(--ltek-r-md);
    font-size: var(--ltek-fs-small);
    color: var(--ltek-c-text);
    white-space: pre-wrap;
    word-break: break-word;
  }
`;
