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
import {LitElement, html, css, unsafeCSS} from './lit/lit-core.min.js';
import * as C from './constants.js';
import {buildSchema} from './editorSchema.js';
import {ensureButtonStyleLibrary, buttonStyleLibraryMap, saveButtonStyleLibrary, slugifyStyleName, newButtonStyleEntry, builtinButtonStyles} from './buttonStyles.js';
import {ensureModernStyleLibrary, modernStyleLibraryMap, builtinModernStyles, saveModernStyleLibrary, slugifyModernName, newModernStyleEntry, MODERN_STYLE_DEFAULT, resolveModernStyle, modernFillPaint, modernFillOpacity, modernTrackColor, modernBarGlow, modernHandleStyle} from './modernStyles.js';

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
  };

  constructor() {
    super();
    this._config = {};
    this._openPanels = {};
    this._styleSlug = null;   // slug being edited in the Button Styles library (null = list view)
    this._styleDraft = null;  // working copy of the entry being edited
    this._colorSel = {};      // transient per-field color-mode selection (keeps 'Custom CSS' box visible)
    this._imgSel = {};        // transient per-field 'custom' flag for image selects (keeps the text box visible)
    this._modernSlug = null;  // slug being edited in the Slider Styles library (null = list view)
    this._modernDraft = null; // working copy of the slider-style entry being edited
    this._posOpen = {};       // expand state for the Controls & Info element subpanels
  }

  setConfig(config) {
    const c = { ...config };
    // migrate legacy card types (flex-cover-card / enhanced-shutter-card) → the new canonical type,
    // so re-saving an existing card in the editor writes `custom:easy-cover-styler-card`.
    // TODO(migration): remove once all dashboards have migrated.
    if (typeof c.type === 'string') {
      const legacyTypes = C.HA_CARD_NAME_LEGACIES.map((n) => `custom:${n}`);
      if (legacyTypes.includes(c.type)) c.type = `custom:${C.HA_CARD_NAME}`;
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
    this._config = c;
  }

  // --- value helpers -------------------------------------------------------
  _default(key) {
    return C.CONFIG_DEFAULT[key];
  }
  _value(key) {
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
    if (Array.isArray(value)) return Array.isArray(d) ? JSON.stringify(value) === JSON.stringify(d) : value.length === 0;
    return value === d || value === '' || value === null || value === undefined;
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
  _rowSwitch(f) {
    const checked = !!this._val(f);
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <ha-switch .checked=${checked} @change=${(e) => this._put(f, e.target.checked)}></ha-switch>
      </div>`;
  }
  _rowSelect(f) {
    const cur = this._val(f);
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <select @change=${(e) => this._put(f, e.target.value)}>
          ${f.options.map(o => {
            const [val, lbl] = Array.isArray(o) ? o : [o, o];
            return html`<option value=${val} ?selected=${String(cur) === String(val)}>${lbl}</option>`;
          })}
        </select>
      </div>`;
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
    const cur = this._value(f.key) ?? '';
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
  _rowImageSelect(f) {
    const cur = this._value(f.key) ?? '';
    const opts = Array.isArray(f.options) ? f.options : [];
    const known = new Set(opts.map(o => o.value));
    const forcedCustom = this._imgSel && this._imgSel[f.key];
    // 'default' when empty, a bundled value when it matches, else 'custom'
    const mode = forcedCustom ? 'custom'
      : (cur === '' ? 'default' : (known.has(cur) ? cur : 'custom'));
    const onSelect = (v) => {
      if (v === '__custom__') {
        this._imgSel = { ...(this._imgSel || {}), [f.key]: true };
        return; // keep current value; reveal the text box
      }
      const next = { ...(this._imgSel || {}) }; delete next[f.key]; this._imgSel = next;
      this._set(f.key, v === '__default__' ? '' : v);
    };
    return html`
      <div class="row">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="color-ctrl">
          <select @change=${(e) => onSelect(e.target.value)}>
            <option value="__default__" ?selected=${mode === 'default'}>${f.defaultLabel || 'Automatic (from cover type)'}</option>
            ${opts.map(o => html`<option value=${o.value} ?selected=${mode === o.value}>${o.label} (${o.value})</option>`)}
            <option value="__custom__" ?selected=${mode === 'custom'}>Custom image / path / colour…</option>
          </select>
          ${mode === 'custom' ? html`
            <input type="text" .value=${cur} placeholder=${f.placeholder || 'filename.png, /local/…, or a colour'}
              @input=${(e) => this._set(f.key, e.target.value)}>` : ''}
        </div>
      </div>`;
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
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
        <div class="chips">
          ${list.map(v => html`<span class="chip">${v}<button class="chip-x" @click=${() => commit(list.filter(x => x !== v))}>✕</button></span>`)}
        </div>
        <div class="chip-add">
          <input id="add-${f.key}-${f.nested || ''}" type="text" placeholder=${f.placeholder || 'Add…'}
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(e); } }}>
          <button class="add-btn" @click=${add}>Add</button>
        </div>
      </div>`;
  }
  // multi-select of fixed options backed by an array key (hide-states)
  _rowMulti(f) {
    const cur = this._value(f.key) || [];
    const list = Array.isArray(cur) ? cur : [];
    const toggle = (val) => {
      const next = list.includes(val) ? list.filter(x => x !== val) : [...list, val];
      this._set(f.key, next);
    };
    return html`
      <div class="chips-field">
        <label class="row-label" title=${f.hint || ''}>${f.label}</label>
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
  _rowEntities(f) {
    const list = this._entitiesList();
    const covers = this.hass ? Object.keys(this.hass.states).filter(id => id.startsWith('cover.')).sort() : [];
    const add = () => {
      const inp = this.renderRoot.querySelector('#add-entity');
      const v = (inp?.value || '').trim();
      if (!v) return;
      this._commitEntities([...list, v]);
      if (inp) inp.value = '';
    };
    const move = (i, dir) => {
      const j = i + dir; if (j < 0 || j >= list.length) return;
      const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; this._commitEntities(a);
    };
    const setId = (i, val) => {
      const a = [...list];
      a[i] = (typeof a[i] === 'object' && a[i]) ? { ...a[i], entity: val } : val;
      this._commitEntities(a);
    };
    return html`
      <div class="ent-field">
        <div class="chip-add">
          <input id="add-entity" type="text" list="esc-cover-list" placeholder="cover.…"
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}>
          <datalist id="esc-cover-list">${covers.map(id => html`<option value=${id}></option>`)}</datalist>
          <button class="add-btn" @click=${add}>Add cover</button>
        </div>
        ${list.map((entry, i) => html`
          <div class="ent-row">
            <input type="text" .value=${this._entityIdOf(entry)} @input=${(e) => setId(i, e.target.value)}>
            <button class="ent-ic" title="Move up" @click=${() => move(i, -1)}>↑</button>
            <button class="ent-ic" title="Move down" @click=${() => move(i, 1)}>↓</button>
            <button class="ent-ic del" title="Remove" @click=${() => this._commitEntities(list.filter((_, k) => k !== i))}>✕</button>
          </div>`)}
      </div>`;
  }

  // four-mode color control (Inherit / Theme / Custom / CSS) — CARD_DESIGN_SYSTEM.md §3
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
            <select @change=${(e) => this._put(f, e.target.value)}>
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
        <div class="color-ctrl">
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
            <button class="ent-ic del" title="Remove" @click=${() => del(i)}>✕</button>
          </div>`)}
        <div class="chip-add"><button class="add-btn" @click=${add}>Add stop</button></div>
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
            <button class="ent-ic del" title="Remove" @click=${() => setEntry(k, null)}>✕</button>
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
    const inner = this._renderFieldInner(f);
    // rows carrying an eyeKey get a show/hide eye button on the far right (after the control).
    // 'item' rows render their own eye in the header — don't double it.
    if (f.eyeKey && f.type !== 'item') {
      return html`<div class="eye-row" style="display:flex;align-items:center;gap:6px;">
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
      case 'gradientStops': return this._rowGradientStops(f);
      case 'color':       return this._rowColor(f);
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
      case 'entities': return this._rowEntities(f);
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
    if (this.hass) ensureButtonStyleLibrary(this.hass, () => this.requestUpdate());
    if (this.hass) ensureModernStyleLibrary(this.hass, () => this.requestUpdate());
    const schema = buildSchema(C);
    const GROUPS = { layout: 'Card', positions: 'Individual Panels' };
    return html`
      <div class="ed">
        <div class="ed-header">
          <span class="ed-title">${C.CARD_DISPLAY_NAME}</span>
          <span class="ed-build">${C.CARD_VERSION}</span>
        </div>
        ${schema.filter(p => !p.when || p.when(this)).map(p => html`
          ${GROUPS[p.id] ? this._renderGroupDivider(GROUPS[p.id]) : ''}
          ${this._renderPanel(p)}`)}
        ${this._renderGroupDivider('Libraries')}
        ${this._renderButtonStyleLibrary()}
        ${this._renderModernStyleLibrary()}
        ${this._renderYamlPanel()}
      </div>`;
  }

  // ===== Button Styles library (create/edit presets in the shared store) =====
  _styleGroups() { return (this._styleDraft && this._styleDraft.layers && this._styleDraft.layers[0] && this._styleDraft.layers[0].groups) || {}; }
  _styleG(k) { return this._styleGroups()[k]; }
  _styleSetG(k, v) {
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
  _styleClose() { this._styleSlug = null; this._styleDraft = null; }
  _styleSave() {
    if (!this.hass || !this._styleDraft) return;
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
      <ha-switch .checked=${!!this._styleG(k)} @change=${(e) => this._styleSetG(k, e.target.checked)}></ha-switch></div>`;
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
    return html`
      <div class="hint">Editing a shared Button Style. Saved to the same library the Color Light &amp; Scene Manager card uses.</div>
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
        <ha-switch .checked=${this._styleActiveGlow()} @change=${(e) => this._styleToggleActiveGlow(e.target.checked)}></ha-switch></div>
      <div class="style-actions">
        <button class="add-btn" @click=${() => this._styleSave()}>Save</button>
        <button class="ent-ic" @click=${() => this._styleClose()}>Cancel</button>
      </div>`;
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
          <div class="hint">Shared library (same store as the Color Light &amp; Scene Manager card). Reference a style from Group control → Area button style.</div>
          ${this._styleDraft ? this._renderStyleEditor() : html`
            <div class="chip-add"><button class="add-btn" @click=${() => this._styleNew()}>New style</button></div>
            ${Object.keys(builtins).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:lock-outline"></ha-icon>
                <span style="flex:1 1 auto;">${builtins[slug].name} <span class="hint">built-in</span></span>
                <button class="ent-ic" title="Duplicate" @click=${() => { this._styleSlug = '__new__'; this._styleDraft = { name: builtins[slug].name + ' copy', kind: 'button', layers: JSON.parse(JSON.stringify(builtins[slug].layers)) }; }}>⧉</button>
              </div>`)}
            ${Object.keys(map).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:palette-swatch-outline"></ha-icon>
                <span style="flex:1 1 auto;">${map[slug].name || slug} <span class="hint">${(map[slug].layers || []).length} layer(s)</span></span>
                <button class="ent-ic" title="Edit" @click=${() => this._styleEdit(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => this._styleDuplicate(slug)}>⧉</button>
                <button class="ent-ic del" title="Delete" @click=${() => this._styleDelete(slug)}>✕</button>
              </div>`)}
          `}
        </div>
      </details>`;
  }

  // ===== Slider Styles library (modern bar visuals; shared System-scope store) =====
  _mGroups() { return (this._modernDraft && this._modernDraft.groups) || {}; }
  _mG(k) { const g = this._mGroups(); return (k in g) ? g[k] : MODERN_STYLE_DEFAULT[k]; }
  _mSetG(k, v) { const d = JSON.parse(JSON.stringify(this._modernDraft)); d.groups[k] = v; this._modernDraft = d; }
  // pseudo-field bound to a draft group key, usable by the generic get/set-aware renderers
  _mField(key, extra) { return { key: 'm:' + key, get: () => this._mG(key), set: (v) => this._mSetG(key, v), ...extra }; }
  _modernNew() { this._modernSlug = '__new__'; this._modernDraft = newModernStyleEntry('New slider style'); }
  _modernEdit(slug) { const e = modernStyleLibraryMap()[slug]; if (!e) return; this._modernSlug = slug; this._modernDraft = JSON.parse(JSON.stringify(e)); }
  _modernClose() { this._modernSlug = null; this._modernDraft = null; }
  _modernSave() {
    if (!this.hass || !this._modernDraft) return;
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
  _renderModernPreview() {
    const style = resolveModernStyle(this._modernDraft.groups);
    const bar = (pct, state, label) => {
      const fill = modernFillPaint(style, state);
      const glow = modernBarGlow(style, state);
      const glowOnFill = glow && style.glow_target === 'fill';
      const rad = Number(style.bar_radius) || 0;
      const brd = Number(style.bar_border_width) > 0 ? `border:${style.bar_border_width}px solid ${style.bar_border_color};` : '';
      const barStyle = `width:52px;height:120px;position:relative;border-radius:${rad}px;overflow:${glowOnFill ? 'visible' : 'hidden'};background:${modernTrackColor(style)};${brd}${(glow && !glowOnFill) ? `box-shadow:${glow};` : ''}`;
      const fillStyle = `position:absolute;left:0;right:0;bottom:0;height:${pct}%;background:${fill};opacity:${modernFillOpacity(style)};${glowOnFill ? `box-shadow:${glow};border-radius:0 0 ${rad}px ${rad}px;` : ''}`;
      return html`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="${barStyle}"><div style="${fillStyle}"></div>${style.handle_show ? html`<div style="${modernHandleStyle(style, pct, fill)}"></div>` : ''}</div>
        <span class="hint">${label}</span></div>`;
    };
    return html`<div style="display:flex;gap:18px;justify-content:center;padding:10px 0 4px;">
      ${bar(70, 'open', 'Open')}${bar(45, 'opening', 'Moving')}${bar(12, 'closed', 'Closed')}
    </div>`;
  }
  _renderModernStyleEditor() {
    const gradient = this._mG('fill_mode') === 'gradient';
    const handle = !!this._mG('handle_show');
    const glow = !!this._mG('glow_enabled');
    const tilt = !!this._mG('tilt_show');
    return html`
      <div class="hint">Custom modern-bar style. Saved to the shared Slider Styles library; reference it from Cover Images → Modern style.</div>
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
      <div class="style-actions">
        <button class="add-btn" @click=${() => this._modernSave()}>Save</button>
        <button class="ent-ic" @click=${() => this._modernClose()}>Cancel</button>
      </div>`;
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
          <div class="hint">Custom looks for the Modern bar visual. Reference from Cover Images → Modern style.</div>
          ${this._modernDraft ? this._renderModernStyleEditor() : html`
            <div class="chip-add"><button class="add-btn" @click=${() => this._modernNew()}>New style</button></div>
            ${Object.keys(builtins).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:lock-outline"></ha-icon>
                <span style="flex:1 1 auto;">${builtins[slug].name} <span class="hint">built-in</span></span>
                <button class="ent-ic" title="Duplicate" @click=${() => { this._modernSlug = '__new__'; this._modernDraft = { name: builtins[slug].name + ' copy', groups: JSON.parse(JSON.stringify(builtins[slug].groups)) }; }}>⧉</button>
              </div>`)}
            ${Object.keys(map).map(slug => html`
              <div class="ent-row"><ha-icon class="panel-ic" icon="mdi:tune-variant"></ha-icon>
                <span style="flex:1 1 auto;">${map[slug].name || slug}</span>
                <button class="ent-ic" title="Edit" @click=${() => this._modernEdit(slug)}>✎</button>
                <button class="ent-ic" title="Duplicate" @click=${() => this._modernDuplicate(slug)}>⧉</button>
                <button class="ent-ic del" title="Delete" @click=${() => this._modernDelete(slug)}>✕</button>
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
  .panel-chev { color: #999; --mdc-icon-size: 22px; transition: transform 0.2s ease; }
  .panel.open .panel-chev { transform: rotate(180deg); }
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
  }
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
    justify-content: space-between;
    gap: var(--ltek-sp-5);
    min-height: 32px;
  }
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
    min-width: 160px;
  }
  select:hover, input[type="text"]:hover, input[type="number"]:hover { border-color: var(--ltek-c-accent); }
  select:focus, input:focus { outline: none; border-color: var(--ltek-c-accent); }
  /* the dropdown popup list: force an opaque dark surface with readable text */
  select option {
    background: var(--card-background-color, #1c1c1c);
    color: var(--ltek-c-text);
  }
  .chips-field { display: flex; flex-direction: column; gap: var(--ltek-sp-2); }
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
  .slider-val {
    flex: 0 0 var(--ltek-slider-val-w);
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ltek-c-text);
    font-size: var(--ltek-fs-body);
  }
  .color-ctrl { display: flex; gap: var(--ltek-sp-2); align-items: center; flex-wrap: wrap; }
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
