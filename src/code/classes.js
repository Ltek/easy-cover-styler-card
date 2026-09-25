import * as C from './constants.js';
//import {EscImages} from './escImages.js';
import {LitElement, html, css, unsafeCSS } from './lit/lit-core.min.js';

import {
  boundary,
  findElementInBody,
  findElement,
  console_log,
  getDebug,
  resizeDebugger
} from './functions.js';

import * as HtmlBlocks from './htmlBlocks.js';
import {EscImages} from './escImages.js';
import {xyPair} from './xyPair.js';
import {dividerLineHtml, dividerVerticalHtml, DIVIDER_GRADIENT_PATTERNS} from './dividers.js';
import {ensureButtonStyleLibrary, resolveButtonAppearance, areaButtonStyle, areaButtonIcon} from './buttonStyles.js';
import {ensureModernStyleLibrary} from './modernStyles.js';


export class EnhancedShutterCardNew extends LitElement{
  //reactive properties
  constructor() {
    super(); //  mandetory by Lit-element

    //this.isShutterConfigLoaded = false;
    this.initializeReady = false;

    this.shutterCfgs = [];
    this.areaGroups = [];       // v1.7.0: [{key,name,memberIds,members:[shutterCfg],aggregate:shutterCfg}]
    this.selectedArea = null;   // v1.7.0: active area/label key for the 'areas' layout
    this.coversCollapsed = null; // v1.28.0: collapse state of the covers row
    this.screenOrientation= C.LANDSCAPE ;
    //this.escImagesLoaded = false;
    this.gridPixelWidth = C.HA_GRID_PX_WIDTH;

    this.gridPixelHeight = C.HA_GRID_PX_HEIGHT;
    this.gridPixelGap = C.HA_GRID_PX_GAP;
    this.gridContainer = null;
    this.isResizeInProgress = false;
    this.isSubEntitiesChecked = false;
    this.initializeStarted = false;
    this.messageManager= new MessageManager();
  }
  static properties = {
    // reactive variables from Home Assistant Card
    hass: {type: Object},
    config: {type: Object},
    // local reactive variables

    initializeReady: {type: Boolean, state: true},
    shutterCfgs: {type: Array, state: true},
    selectedArea: {state: true},
    coversCollapsed: {state: true},
    screenOrientation: {type: Object, state: true},
    gridPixelWidth: {type: Number, state: true},
  };

  set hass(hass) {

    const oldHass = this._hass;
    this._hass = hass;
    if (!this.initializeStarted) {
      this.initializeStarted = true;
      this.cardInitialize(); // run once
      // subscribe to the shared style libraries so lib:<slug> references resolve/update live.
      // Bump styleVersion so the child <flex-cover> elements (which resolve modern/% styles at
      // render time) actually re-render when a library arrives after first paint.
      const onLib = () => { this.styleVersion = (this.styleVersion || 0) + 1; this.requestUpdate(); };
      ensureButtonStyleLibrary(hass, onLib);
      ensureModernStyleLibrary(hass, onLib);
    }
    this.requestUpdate('hass', oldHass);
  }
  get hass() {
    return this._hass;
  }
  async cardInitialize() {
    // ✅ Safe to use hass here, runs exactly once
    try {
      this.#defAllShutterConfig();
      //this.isShutterConfigLoaded = this.#defAllShutterConfig();
      const aggregateCfgs = this.areaGroups.map(g => g.aggregate).filter(Boolean);
      this.escImages = new EscImages([...this.shutterCfgs, ...aggregateCfgs]);

      await this.resolveSubEntities();
      await this.escImages.processImages();
    } catch (err) {
      console.warn('Error during initialization:', err);
    } finally {
      this.initializeReady = true;
        console_log('initialize Is Ready');

      if (this.isConnected) {
        // HA will re-call these methods on your card in response of this event:
        // getGridOptions()   ← recalculates layout
        // getCardSize()      ← recalculates legacy size (if defined)
        console_log('Force getGridOptions()');
        this.dispatchEvent(new CustomEvent('card-updated', { bubbles: true }));
      }
    }
  }
  #defAllShutterConfig()
  {
    const cardConfig = this.#buildConfig(C.CONFIG_DEFAULT,this.config);
    this.cardCfg = new cardCfg(cardConfig);
    if (this.coversCollapsed === null) this.coversCollapsed = this.cardCfg.coversStartCollapsed();
    let id =0;
    this.shutterCfgs = [];
    this.areaGroups = [];

    // A "group" is one area/label bucket, or a single implicit bucket built from
    // the explicit entities list. The area-selector layout renders one tab per group;
    // the stack layout just flattens every group's members into shutterCfgs.
    const groups = this.#defineGroups(cardConfig);

    groups.forEach(group => {
      const members = [];
      (group.entityIds || []).forEach(entry => {
        // entry is a raw entity_id (auto-generated) or a subConfig object (explicit entities:)
        const subConfig = (typeof entry === 'object' && entry !== null) ? entry : { [C.CONFIG_ENTITY_ID]: entry };
        const baseEntity = subConfig.entity ? new haEntity(this.hass,subConfig.entity) : null;
        const isAreaGroup = group.key && group.key.startsWith('area:');
        const areaNameFor = (entId) => isAreaGroup ? group.name : this.#entityAreaName(entId);
        const overrides = this.#presetOverridesFor(subConfig.entity);
        const newSubConfig = {...overrides, ...subConfig, id: id++, [C.CONFIG_AREA_NAME_KEY]: areaNameFor(subConfig.entity)};
        const shutterConfig = this.#buildConfig(cardConfig,newSubConfig);
        const cfg = new shutterCfg(this.hass,shutterConfig);
        let counter =1;
        if (cfg.showGroupMembers() && baseEntity && baseEntity.isGroup()){
          const groupEntities = baseEntity.getAttributes().entity_id || [];
          const entitiesInGroup = groupEntities.filter(entityId => this.hass.states[entityId]);
          entitiesInGroup.forEach(entityId => {
            const memberOverrides = this.#presetOverridesFor(entityId);
            const memberSub = {...memberOverrides, ...subConfig, entity: entityId, group: subConfig.entity, id: id++, [C.CONFIG_AREA_NAME_KEY]: areaNameFor(entityId)};
            const memberConfig = this.#buildConfig(cardConfig,memberSub);
            if (memberConfig.name) memberConfig.name = memberConfig.name.replace("@", counter++);
            const memberCfg = new shutterCfg(this.hass,memberConfig);
            members.push(memberCfg);
            this.shutterCfgs.push(memberCfg);
          });
        }else{
          members.push(cfg);
          this.shutterCfgs.push(cfg);
        }
      });

      if (!members.length) return; // skip empty areas/labels

      // Aggregate "All" control: fans open/close/stop/set-position to every member,
      // and displays the members' average position (see haAggregateEntity).
      const memberIds = members.map(m => m.entityId()).filter(Boolean);
      const aggName = this.cardCfg.groupNameFromArea() ? group.name : (cardConfig[C.CONFIG_ALL_LABEL] || C.ESC_ALL_LABEL);
      // The group/aggregate panel belongs to the area, so it inherits that area's preset
      // (image/style) — so the Group image matches the covers when a per-area preset is set.
      const aggAreaPreset = this.#areaPresetFor(memberIds[0]);
      const aggSub = { ...aggAreaPreset, [C.CONFIG_ENTITY_ID]: memberIds[0], [C.CONFIG_NAME]: aggName, id: id++ };
      const aggConfig = this.#buildConfig(cardConfig, aggSub);
      const aggregate = new shutterCfg(this.hass, aggConfig);
      aggregate.setAggregate(memberIds, new haAggregateEntity(this.hass, memberIds));

      this.areaGroups.push({ key: group.key, name: group.name, memberIds, members, aggregate });
    });

    // default the selected area/label for the area-selector layout
    if (this.areaGroups.length &&
        (this.selectedArea === null || !this.areaGroups.some(g => g.key === this.selectedArea))) {
      this.selectedArea = this.areaGroups[0].key;
    }
    return true;
  }
  // v1.7.0: build the list of area/label buckets (or one implicit bucket from entities:)
  #defineGroups(cardConfig){
    const areas = this.config[C.CONFIG_AREAS];
    const labels = this.config[C.CONFIG_LABELS];
    const areaNames = this.config[C.CONFIG_AREA_NAMES] || {};
    const labelNames = this.config[C.CONFIG_LABEL_NAMES] || {};

    if (Array.isArray(areas) && areas.length){
      const { byArea } = this.#coverIndex(this.#autoFilterClasses());
      return areas.map(a => {
        const areaId = this.#resolveAreaId(a);
        const entityIds = (byArea.get(areaId) || []).slice().sort();
        if (!entityIds.length) this.messageManager.addMessage(`No covers found for area: [${a}]`, C.HA_ALERT_WARNING, 'General');
        return { key: `area:${areaId || a}`, name: areaNames[a] || areaNames[areaId] || this.#areaName(areaId) || String(a), entityIds };
      });
    }
    if (Array.isArray(labels) && labels.length){
      const { byLabel } = this.#coverIndex(this.#autoFilterClasses());
      return labels.map(l => {
        const labelId = this.#resolveLabelId(l);
        const entityIds = (byLabel.get(labelId) || []).slice().sort();
        if (!entityIds.length) this.messageManager.addMessage(`No covers found for label: [${l}]`, C.HA_ALERT_WARNING, 'General');
        return { key: `label:${labelId || l}`, name: labelNames[l] || labelNames[labelId] || this.#labelName(labelId) || String(l), entityIds };
      });
    }
    // no auto-generation: single implicit bucket from the explicit entities list
    const entities = Array.isArray(this.config.entities) ? this.config.entities : [];
    return [{ key: 'all', name: cardConfig[C.CONFIG_TITLE] || C.ESC_ALL_LABEL, entityIds: entities }];
  }
  #autoFilterClasses(){
    const f = this.config[C.CONFIG_AUTO_FILTER] || {};
    const allow = Array.isArray(f.device_class) ? f.device_class.map(s => String(s).toLowerCase()) : null;
    const exclude = Array.isArray(f.exclude) ? f.exclude.map(s => String(s).toLowerCase()) : C.ESC_AUTO_EXCLUDE_DEVICE_CLASSES;
    return { allow, exclude };
  }
  #passesAutoFilter(entityId, filter){
    const { allow, exclude } = filter || this.#autoFilterClasses();
    const dc = String(this.hass.states[entityId]?.attributes?.device_class || '').toLowerCase();
    if (exclude && exclude.includes(dc)) return false;
    if (allow && allow.length) return allow.includes(dc);
    return true; // default: any non-excluded cover
  }
  // Single pass over hass.entities: filtered cover ids grouped by area_id and by label.
  // Replaces the old per-area/per-label rescans (was O(areas × entities)).
  #coverIndex(filter){
    const byArea = new Map(), byLabel = new Map();
    if (!this.hass?.entities) return { byArea, byLabel };
    const devices = this.hass.devices || {};
    for (const e of Object.values(this.hass.entities)){
      const id = e.entity_id;
      if (!id || !id.startsWith('cover.')) continue;
      if (!this.hass.states[id]) continue;
      if (!this.#passesAutoFilter(id, filter)) continue;
      if (this.#isCoverGroup(id)) continue;
      const areaId = e.area_id || devices[e.device_id]?.area_id || null;
      if (areaId){
        const arr = byArea.get(areaId); arr ? arr.push(id) : byArea.set(areaId, [id]);
      }
      if (Array.isArray(e.labels)){
        for (const l of e.labels){
          const arr = byLabel.get(l); arr ? arr.push(id) : byLabel.set(l, [id]);
        }
      }
    }
    return { byArea, byLabel };
  }
  // auto-gen skips cover group-helpers (the card already provides its own "All" aggregate)
  #isCoverGroup(entityId){
    return Array.isArray(this.hass.states[entityId]?.attributes?.entity_id);
  }
  #resolveAreaId(input){
    if (!input) return null;
    const areas = this.hass?.areas || {};
    if (areas[input]) return input;
    const lower = String(input).toLowerCase();
    const match = Object.values(areas).find(a =>
      String(a.area_id).toLowerCase() === lower || String(a.name || '').toLowerCase() === lower);
    return match ? match.area_id : input;
  }
  #areaName(areaId){
    return this.hass?.areas?.[areaId]?.name || null;
  }
  // resolve a cover entity's area display name (entity area, else its device's area)
  #entityAreaName(entityId){
    if (!entityId || !this.hass) return '';
    const e = this.hass.entities?.[entityId];
    const areaId = e?.area_id || this.hass.devices?.[e?.device_id]?.area_id || null;
    return areaId ? (this.hass.areas?.[areaId]?.name || '') : '';
  }
  // resolve a cover entity's area_id (entity area, else its device's area)
  #areaIdForEntity(entityId){
    if (!entityId || !this.hass) return null;
    const e = this.hass.entities?.[entityId];
    return e?.area_id || this.hass.devices?.[e?.device_id]?.area_id || null;
  }
  // per-area image/style preset for a cover's area, keyed by area_id OR area name (case-insensitive)
  #areaPresetFor(entityId){
    const map = this.config?.[C.CONFIG_AREA_PRESETS];
    if (!map || typeof map !== 'object') return {};
    const areaId = this.#areaIdForEntity(entityId);
    if (!areaId) return {};
    let hit = map[areaId];
    if (!hit){
      const name = this.hass?.areas?.[areaId]?.name;
      if (name){
        const lower = name.toLowerCase();
        const key = Object.keys(map).find(k => k.toLowerCase() === lower);
        hit = key ? map[key] : null;
      }
    }
    return (hit && typeof hit === 'object') ? hit : {};
  }
  // per-entity image/style preset, keyed by entity_id
  #entityPresetFor(entityId){
    const map = this.config?.[C.CONFIG_ENTITY_PRESETS];
    if (!map || typeof map !== 'object' || !entityId) return {};
    const hit = map[entityId];
    return (hit && typeof hit === 'object') ? hit : {};
  }
  // combined per-area + per-entity overrides (entity wins over area). Applied below the
  // cover's own inline config so an explicit `entities:` entry still takes precedence.
  #presetOverridesFor(entityId){
    if (!entityId) return {};
    return { ...this.#areaPresetFor(entityId), ...this.#entityPresetFor(entityId) };
  }
  #resolveLabelId(input){
    if (!input) return null;
    const labels = this.hass?.labels || {};
    if (labels[input]) return input;
    const lower = String(input).toLowerCase();
    const match = Object.values(labels).find(l =>
      String(l.label_id).toLowerCase() === lower || String(l.name || '').toLowerCase() === lower);
    if (match) return match.label_id;
    const known = new Set();
    Object.values(this.hass?.entities || {}).forEach(e => (e.labels || []).forEach(l => known.add(l)));
    const found = [...known].find(labelId => String(labelId).toLowerCase() === lower);
    return found || input;
  }
  #labelName(labelId){
    return this.hass?.labels?.[labelId]?.name || null;
  }

  #buildConfig(configBase,configSub)
  {
    const id = configSub.id === undefined ? 'General' : configSub.id;

    if (typeof configSub !== 'object' || configSub === null){
      configSub={[C.CONFIG_ENTITY_ID]: configSub};
    }
    let unknownKeys = this.getUniqueKeysFromObjects(configSub,configBase);
    // handle unknown keywords
    if (unknownKeys.length > 0){
      unknownKeys.forEach((key) =>
      {
        this.messageManager.addMessage(
          `Unknown keyword: [${key}], check your input!`,
          C.HA_ALERT_WARNING,
          id
        );
      });
    };
    // handle PRESET TYPE
    //
    let shutterPreset = (configSub[C.CONFIG_SHUTTER_PRESET] || '').toLowerCase();
    let configPreset = { ...(C.ESC_PRESET[shutterPreset] || {}) };

    let newConfigSub = { ...configSub };

    // check deprecated and removed
    // TODO: combine:
    Object.keys(C.DEPRECATED).forEach(key => {
      if (newConfigSub[key] != null) {
        let oldKey = C.DEPRECATED[key];
        this.messageManager.addMessage(
          `Deprecated: [${key}], use '${oldKey.new}'!`,
          C.HA_ALERT_WARNING,
          id
        );
        this.replaceKey(newConfigSub, key,oldKey);
      }
    });

    Object.keys(C.REMOVED).forEach(key => {
      if (newConfigSub[key] != null) {
        let oldKey = C.REMOVED[key];
        this.messageManager.addMessage(
          `Removed: [${key}], use '${oldKey.new}'!`,
          C.HA_ALERT_ERROR,
          id
        );
        this.replaceKey(newConfigSub, key,oldKey);
      }
    });

    let config = { ...configBase, ...configPreset, ...newConfigSub};

    return config;
  }
  replaceKey(newConfigSub, key,oldKey){
        if (oldKey.value){
          // correct value with function
          newConfigSub[oldKey.new] = oldKey.value(newConfigSub[key]);
        }else{
          // take same value
          newConfigSub[oldKey.new] = newConfigSub[key];
        }
        delete newConfigSub[key];
  }
  getUniqueKeysFromObjects(obj1, obj2) {
    // keys in obj1 not present in obj2 (Set lookup — obj2 is CONFIG_DEFAULT with ~150 keys,
    // and this runs for every shutter/member/aggregate)
    const keysObj2 = new Set(Object.keys(obj2));
    return Object.keys(obj1).filter(key => !keysObj2.has(key));
  }
  getCardFlexDirection(){
    return this.cardCfg.orientation() === 'horizontal' ? 'row' : 'column';
  }
  getCoverEntities(){
    let keys = this.shutterCfgs.map(cfg=>cfg.entityId());
    return keys;
  }

/*
* OVERRIDE FUNCTIONS LIT ELEMENT
*/
  shouldUpdate(changedProperties) {
    let doUpdate =false;

    changedProperties.forEach((oldValue, propName) => {
      // console.log(`Card shouldUpdate, Property [${propName}] changed. oldValue: ${oldValue} newValue: ${this[propName]}`);
      switch (propName){
        case ("initializeReady"):
          if (this.initializeReady){
            doUpdate =true;
          }
          break;
        case 'hass':
        /* On hass update, check if there is a cover change */
          this.shutterCfgs.forEach(cfg =>{
            const coverEntityId = cfg.entityId();
            const currentShutterEntity =cfg.getCoverEntity();
            if (currentShutterEntity) {
              const liveCoverEntity = new haEntity(this.hass,coverEntityId);
              let shutterStateOld= cfg.getCoverState();
              let shutterStateNew= cfg.getCoverState(liveCoverEntity);

              if (shutterStateNew != shutterStateOld){
                doUpdate =true;
                cfg.updateCoverEntity(liveCoverEntity);
              }

              for (let type of C.DEVICES_CLASSES_SUB_ENTITIES) {
                const subEntity = cfg.subEntity[type];
                const currentEntity = subEntity?.entity;
                if (currentEntity) {
                  const entityId = subEntity?.entityId;
                  const liveEntity = new haEntity(this.hass,entityId);
                  if (liveEntity && liveEntity.getState() !== currentEntity.getState() ){
                    doUpdate =true;
                    subEntity.update(liveEntity);
                  }
                }
              }
            }
          });

          // refresh the aggregate "All" controls (area-selector layout)
          this.areaGroups.forEach(group => {
            if (!group.aggregate) return;
            const liveAgg = new haAggregateEntity(this.hass, group.memberIds);
            if (group.aggregate.getCoverState(liveAgg) != group.aggregate.getCoverState()){
              doUpdate = true;
              group.aggregate.updateCoverEntity(liveAgg);
            }
          });

          break;
        default:
          /* On any other property change, do the update */
          if (oldValue !== undefined) doUpdate = true;
      }
    });
    return doUpdate;
  }
  willUpdate(changedProperties){
    super.willUpdate(changedProperties);
  }
  update(changedProperties){
    super.update(changedProperties);
    /*
    changedProperties.forEach((oldValue, propName) => {
      console_log(`Card Update, Property ${propName} changed. oldValue: ${oldValue}; new: ${this[propName]}`);
    });
    /**/
  }
  render()
  {
    if (!this.config || !this.hass || !this.initializeReady){
      return html`
       <ha-card>
          Waiting for Card to initialize...
       </ha-card>
      `;
    }
    let showMessages = this.messageManager.countMessages() && this.inEditor();
    let htmlParts = new htmlCard(this);
    let shutterSeparateBlock= new HtmlBlocks.htmlBlockShutterSeparate(this.cardCfg);

    // v1.40.0: area selector (buttons menu) — shown on either orientation; group beside the menu (image-1) or inline with covers
    if (this.cardCfg.showAreaSelector() && this.areaGroups.length){
      const group = this.areaGroups.find(g => g.key === this.selectedArea) || this.areaGroups[0];
      const isColumn = this.cardCfg.orientation() === 'vertical';
      const menuInline = this.cardCfg.areaMenuInline();
      const groupInline = this.cardCfg.groupInline();
      const showAll = group.aggregate && this.cardCfg.showAllControl();
      const sticky = this.cardCfg.groupSticky();
      const stickyCls = sticky ? (isColumn ? ' sticky-v' : ' sticky-h') : '';
      const collapsed = this.cardCfg.coversCollapsible() && this.coversCollapsed;
      const btnMode = this.cardCfg.areaButtonsWrapMode();
      const btnModeCls = btnMode === 'wrap' ? ' btns-wrap' : btnMode === 'grid' ? ' btns-grid' : '';
      const btnTextCls = this.cardCfg.areaButtonWrap() ? ' btns-text-wrap' : '';
      const coversMode = this.cardCfg.coversWrapMode();
      const coversCls = coversMode === 'wrap' ? ' covers-wrap' : coversMode === 'grid' ? ' covers-grid' : (isColumn ? ' scroll-v' : ' scroll-h');
      const inlineGroup = showAll && groupInline;   // group inside the covers flow
      const topbarButtons = !menuInline;            // area menu in its own top bar unless inline
      const topbarGroup = showAll && !groupInline;  // group beside the menu (top bar) unless inline
      const hasTopbar = topbarButtons || topbarGroup;
      const anyInline = menuInline || inlineGroup;
      const buttons = html`
        <div class="${C.ESC_CLASS_AREA_BUTTONS}${btnModeCls}${btnTextCls}">
          ${this.areaGroups.map(g => {
            const active = g.key === group.key;
            const ref = this.cardCfg.areaButtonStyle();
            const appr = ref ? resolveButtonAppearance(ref, active) : null;
            const st = appr ? areaButtonStyle(appr, active, 'var(--primary-color, #2196F3)') : '';
            const ic = appr ? areaButtonIcon(appr, active, 'var(--primary-color, #2196F3)') : null;
            return html`
              <button
                class="${C.ESC_CLASS_AREA_BUTTON}${active ? ' ' + C.ESC_CLASS_AREA_BUTTON_ACTIVE : ''}"
                style=${st || ''}
                @click=${() => { this.selectedArea = g.key; }}
              >${ic ? html`<ha-icon icon=${ic.icon} style=${ic.style}></ha-icon> ` : ''}${g.name}</button>`;
          })}
        </div>`;
      const cnt = group.members.length;
      const clabel = this.cardCfg.collapseLabel() || (cnt === 1 ? 'cover' : 'covers');
      const ctext = (this.cardCfg.collapseShowCount() ? `${cnt} ` : '') + clabel;
      const cIcon = this.cardCfg.collapseIcon();
      const cIconName = cIcon ? cIcon : `mdi:chevron-${this.coversCollapsed ? 'down' : 'up'}`;
      const cIconSize = Number(this.cardCfg.collapseIconSize());
      const cIconColor = this.cardCfg.collapseIconColor();
      const cIconStyle = `${cIconSize > 0 ? `--mdc-icon-size:${cIconSize}px;` : ''}${cIconColor ? `color:${cIconColor};` : ''}`;
      const toggle = this.cardCfg.coversCollapsible() ? html`
        <button class="${C.ESC_CLASS_AREA_COVERS_TOGGLE}${this.coversCollapsed ? '' : ' open'}"
          @click=${() => { this.coversCollapsed = !this.coversCollapsed; }}>
          <ha-icon icon="${cIconName}" style="${cIconStyle}"></ha-icon>
          <span>${ctext}</span>
        </button>` : '';
      // inline area menu / group live in the covers row but are NEVER collapsed — only the members collapse
      const covers = html`
        <div class="${C.ESC_CLASS_AREA_COVERS}${coversCls}">
          ${menuInline ? buttons : ''}
          ${inlineGroup ? html`<div class="${C.ESC_CLASS_AREA_GROUP_INLINE} esc-cover-pad${stickyCls}">${this.#renderShutterEl(group.aggregate)}</div>` : ''}
          ${collapsed ? '' : group.members.map((cfg, i) => html`
            ${(anyInline || i > 0) && this.cardCfg.showCoverDividers() ? this.#renderCoverDivider(!isColumn) : ''}
            <div class="esc-cover-pad">${this.#renderShutterEl(cfg)}</div>`)}
        </div>`;
      const body = html`
        <div class="${C.ESC_CLASS_AREA_LAYOUT} placement-menu">
          ${hasTopbar ? html`
            <div class="${C.ESC_CLASS_AREA_TOPBAR}">
              ${topbarButtons ? buttons : ''}
              ${topbarGroup ? html`<div class="${C.ESC_CLASS_AREA_ALL} esc-cover-pad">${this.#renderShutterEl(group.aggregate)}</div>` : ''}
            </div>` : ''}
          <div class="${C.ESC_CLASS_AREA_MAIN}">${toggle}${covers}</div>
        </div>`;
      return html`
        ${showMessages ? html`${this.messageManager.displayGroupMessages('General')} ` : ''}
        <ha-card .header=${this.config.title} style="${htmlParts.defStyleVarsCard()}">
          ${body}
        </ha-card>
      `;
    }

    let htmlout = html`
        ${showMessages ? html`${this.messageManager.displayGroupMessages('GridSize')} ` : ''}
        ${showMessages ? html`${this.messageManager.displayGroupMessages('General')} ` : ''}
        <ha-card .header=${this.config.title}>
          <div
            class="${C.ESC_CLASS_SHUTTERS}"
            style = "${htmlParts.defStyleVarsCard()}"
          >
            ${this.shutterCfgs.map((cfg, i) => {
                // update the live states and attributes
                return html`
                  ${i > 0 && this.cardCfg.showCoverDividers() ? this.#renderCoverDivider(this.cardCfg.stacked() !== C.VERTICAL) : ''}
                  <div class="${C.ESC_CLASS_SHUTTER_FLEX}">
                    ${this.#renderShutterEl(cfg)}
                    ${showMessages ? html`${this.messageManager.displayGroupMessages( cfg.id())} ` : ''}
                  </div>
                  ${this.cardCfg.showCoverDividers() ? '' : shutterSeparateBlock.show()}
                `;
              }
            )}
          </div>
        </ha-card>
      `;
    return htmlout;
  }
  // v1.29.0: a divider between covers (vertical for a row layout, horizontal for a column)
  #renderCoverDivider(vertical){
    const spec = this.cardCfg.coverDividerSpec();
    const el = document.createElement('div');
    el.className = vertical ? 'esc-cover-divider esc-cover-divider-v' : 'esc-cover-divider esc-cover-divider-h';
    el.innerHTML = vertical ? dividerVerticalHtml(spec, {}) : dividerLineHtml(spec, {scale: 1});
    return el;
  }
  // single reusable <easy-cover-styler> child element, shared by both layouts (tag = HA_SHUTTER_NAME).
  // NOTE: Lit tagged-template tag names must be static literals, so this cannot interpolate
  // C.HA_SHUTTER_NAME. Keep this tag in sync with that constant if it ever changes.
  #renderShutterEl(cfg){
    return html`
      <easy-cover-styler
        .react_ShutterState=${cfg.getCoverState()}
        .react_BatteryState=${cfg.getState(cfg.getBatteryEntity())}
        .react_SignalState=${cfg.getState(cfg.getSignalEntity())}
        .react_ScreenOrientation=${this.screenOrientation}
        .react_InitializeReady=${this.initializeReady}
        .react_StyleVersion=${this.styleVersion || 0}

        .hass=${this.hass}
        .cfg=${cfg}
        .escImages=${this.escImages}
      >
      </easy-cover-styler>
    `;
  }
  firstUpdated() {
  }
  updated(changedProperties) {
    super.updated(changedProperties);
  }
  getGrid(){
      this.getGridOptions('internal from getGrid()');
  }
  defGridContainer(){
      let el = this;
      while (el) {
        //const tagName = el.tagName || '(unknown)';
        //const id = el.id || '(no id)';
        //const classList = el.classList?.value || '(no class)';

        if (
            el.classList?.contains('container')) {
          break;
        }

        el = el.parentElement || el.getRootNode()?.host;
      }
      this.gridContainer = el;

      return el;
  }
  connectedCallback() {
    super.connectedCallback();

    //this.defGridContainer();
    //this.getGridOptionsInternal();
    /* get element of hui-view to detect resizing */
    C.Globals.huiView = findElementInBody(C.HA_HUI_VIEW);

    this.startResizeObserver();
  }
  startResizeObserver() {
    const onResize = (entries) => {
      /* Things todo when resize is detected */
      if (getDebug()) resizeDebugger(entries,this.cardCfg.title());
      if (!this.isResizeInProgress) {
        entries.forEach(entry => {
          this.checkOrientation(entry); // check orientation on huiView resize
        });
      }
      if (this.initializeReady && this.config && this.shutterCfgs?.length){
        console_log('Call getGrid');
        this.getGrid();
      }
    }
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(C.Globals.huiView);
  }


  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  checkOrientation(element) {
    // Check the orientation based on the window and div visibility

    this.isResizeInProgress = true; // Set flag to indicate a resize operation is in progress

    // Get the window size
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get the bounding rect of the element
    const rect = element.contentRect;

    // Calculate the visible width and height of the element within the viewport
    const visibleWidth = Math.max(0, Math.min(rect.right, windowWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0));

    // Determine the orientation based on visible area and window size
    C.Globals.screenOrientation = {value: visibleWidth*1.4 > visibleHeight ? C.LANDSCAPE : C.PORTRAIT};
    this.screenOrientation = C.Globals.screenOrientation.value;

    // After orientation check is done, reset the flag
    this.isResizeInProgress = false;
  }
  closestElement(selector, base = this) {
  // from https://stackoverflow.com/questions/54520554/custom-element-getrootnode-closest-function-crossing-multiple-parent-shadowd
    function __closestFrom(el) {
      if (!el || el === document || el === window) return null;
      let found = el.closest(selector);
      return found ? found : __closestFrom(el.getRootNode().host);
    }
    return __closestFrom(base);
  }


  static get styles() {
    const CSS = `
      .${C.ESC_CLASS_SHUTTERS} {
        display: flex;
        flex-direction: var(--esc-card-flex-direction);
        overflow-x: auto;
        overflow-y: hidden;
        padding: ${C.CARD_PADDING}${C.UNITY};
      }
      .${C.ESC_CLASS_SHUTTER_FLEX} {
        margin: 0 auto;
      }
      .${C.ESC_CLASS_SHUTTER_SEPARATE}-${C.VERTICAL}:not(:last-child) {
        box-sizing: border-box;
        border: ${C.SEPARATE_BORDER_WIDTH}px solid var(--divider-color);

        width: ${C.SEPARATE_LENGHT}${C.UNITY};
        margin-top: ${C.SEPARATE_MARGIN_TB}${C.UNITY};
        margin-left: auto;
        margin-right: auto;
        margin-bottom: ${C.SEPARATE_MARGIN_TB}${C.UNITY};
      }
      .${C.ESC_CLASS_SHUTTER_SEPARATE}-${C.HORIZONTAL}:not(:last-child) {
        box-sizing: border-box;
        border: ${C.SEPARATE_BORDER_WIDTH}px solid var(--divider-color);

        height: ${C.SEPARATE_LENGHT}${C.UNITY};
        margin-top: auto;
        margin-left: ${C.SEPARATE_MARGIN_LR}${C.UNITY};
        margin-right:${C.SEPARATE_MARGIN_LR}${C.UNITY};
        margin-bottom: auto;
      }

      /* ---- v1.7.0 area-selector layout (ltek card design language) ---- */
      .${C.ESC_CLASS_AREA_LAYOUT} {
        display: flex;
        gap: 12px;
        padding: ${C.CARD_PADDING}${C.UNITY};
      }
      .${C.ESC_CLASS_AREA_LAYOUT}.placement-above { flex-direction: column; }
      .${C.ESC_CLASS_AREA_LAYOUT}.placement-left { flex-direction: row; align-items: flex-start; }
      /* buttons are FIXED (they don't scroll with the covers) and never wrap */
      .${C.ESC_CLASS_AREA_BUTTONS} {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: nowrap;
        gap: 8px;
        align-content: flex-start;
      }
      .placement-above > .${C.ESC_CLASS_AREA_BUTTONS} { flex-direction: row; overflow-x: auto; }
      .placement-left  > .${C.ESC_CLASS_AREA_BUTTONS} { flex-direction: column; overflow-y: auto; min-width: 140px; }
      /* v1.40.0: image-1 arrangement — area buttons + group in a top bar, covers below */
      .${C.ESC_CLASS_AREA_LAYOUT}.placement-menu { flex-direction: column; }
      .placement-menu > .${C.ESC_CLASS_AREA_TOPBAR} {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .placement-menu > .${C.ESC_CLASS_AREA_TOPBAR} > .${C.ESC_CLASS_AREA_BUTTONS} { flex-direction: column; min-width: 140px; }
      .${C.ESC_CLASS_AREA_COVERS} > .${C.ESC_CLASS_AREA_BUTTONS} { flex-direction: column; min-width: 140px; }
      .${C.ESC_CLASS_AREA_MAIN} {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .${C.ESC_CLASS_AREA_BUTTON} {
        box-sizing: border-box;
        white-space: nowrap;
        text-align: center;
        cursor: pointer;
        font-family: ${C.HA_TITLE_FONT};
        font-size: 15px;
        font-weight: 500;
        color: var(--primary-text-color, #e1e1e1);
        background: var(--ha-card-background, var(--card-background-color, rgba(255,255,255,0.02)));
        border: 1px solid var(--divider-color, #3a3a3a);
        border-radius: 10px;
        padding: 12px 16px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .placement-left .${C.ESC_CLASS_AREA_BUTTON} { width: 100%; }
      .${C.ESC_CLASS_AREA_BUTTON}:hover {
        background: var(--ltek-c-accent-fade-soft, rgba(var(--rgb-primary-color,33,150,243),0.08));
      }
      .${C.ESC_CLASS_AREA_BUTTON_ACTIVE} {
        border-color: var(--primary-color, #2196F3);
        background: var(--ltek-c-accent-fade, rgba(var(--rgb-primary-color,33,150,243),0.12));
        color: var(--primary-color, #2196F3);
        font-weight: 700;
      }
      .${C.ESC_CLASS_AREA_ALL} {
        display: flex;
        align-items: flex-start;
      }
      .${C.ESC_CLASS_AREA_COVERS} {
        display: flex;
        flex-direction: var(--esc-covers-dir, row);
        gap: 16px;
        align-items: flex-start;
      }
      /* cover_gap = extra space ONLY between the group/area panel and the first individual panel
         (both margins set; only the one on the active flex axis affects layout) */
      .${C.ESC_CLASS_AREA_GROUP_INLINE} { margin-inline-end: var(--esc-cover-gap, 0px); margin-block-end: var(--esc-cover-gap, 0px); }
      .${C.ESC_CLASS_AREA_TOPBAR} { margin-block-end: var(--esc-cover-gap, 0px); }
      .${C.ESC_CLASS_AREA_COVERS}.scroll-h { flex-wrap: nowrap; overflow-x: auto; }
      .${C.ESC_CLASS_AREA_COVERS}.scroll-v { flex-wrap: nowrap; overflow-y: auto; max-height: 70vh; }
      .${C.ESC_CLASS_AREA_COVERS}.covers-wrap { flex-wrap: wrap; }
      .${C.ESC_CLASS_AREA_COVERS}.covers-grid { display: grid; grid-template-columns: repeat(var(--esc-covers-cols, 3), minmax(0, 1fr)); }
      /* v1.35.0: button text wrap + button wrap/grid modes */
      .${C.ESC_CLASS_AREA_BUTTONS}.btns-text-wrap .${C.ESC_CLASS_AREA_BUTTON} { white-space: normal; }
      .placement-above > .${C.ESC_CLASS_AREA_BUTTONS}.btns-wrap { flex-wrap: wrap; overflow-x: visible; }
      .placement-above > .${C.ESC_CLASS_AREA_BUTTONS}.btns-grid { display: grid; grid-template-columns: repeat(var(--esc-area-btn-cols, 3), minmax(0, 1fr)); overflow-x: visible; }
      /* v1.35.0: per-cover padding */
      .esc-cover-pad { padding: var(--esc-cover-pad, 0); box-sizing: border-box; }
      .${C.ESC_CLASS_SHUTTER_FLEX} { padding: var(--esc-cover-pad, 0); }
      .${C.ESC_CLASS_AREA_GROUP_INLINE} { flex: 0 0 auto; }
      .${C.ESC_CLASS_AREA_GROUP_INLINE}.sticky-h {
        position: sticky; left: 0; z-index: 2;
        background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
      }
      .${C.ESC_CLASS_AREA_GROUP_INLINE}.sticky-v {
        position: sticky; top: 0; z-index: 2;
        background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
      }
      .${C.ESC_CLASS_AREA_COVERS_TOGGLE} {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
        background: none;
        border: none;
        border-top: 1px solid var(--divider-color, #3a3a3a);
        padding: 8px 4px 0;
        color: var(--secondary-text-color, #9b9b9b);
        font-family: ${C.HA_TITLE_FONT};
        font-size: 13px;
      }
      .${C.ESC_CLASS_AREA_COVERS_TOGGLE}:hover { color: var(--primary-text-color, #e1e1e1); }
      .esc-cover-divider-v { align-self: stretch; display: flex; }
      .esc-cover-divider-h { width: 100%; }
    `;
    return css`${unsafeCSS(CSS)}`;
  }
  async getDeviceEntities(entityIds) {
    let deviceEntities = null;
    try {
      const registry = await this.hass.callWS({ type: C.ENTITY_REGISTRY_LIST });
      const deviceIds = [
        ...new Set(
          registry
            .filter(e => entityIds.includes(e.entity_id))
            .map(e => e.device_id)
            .filter(Boolean)
        ),
      ];
      deviceEntities = registry.filter(e => deviceIds.includes(e.device_id));
    } catch (e) {
      console.warn("device-group-card: entity registry lookup failed", e);

    }
    return deviceEntities;
  }

  async resolveSubEntities() {

    const entityIds = this.getCoverEntities();
    // strict: match by device_class
    const hasDeviceClass = (entry, targetClass) =>
      this.hass.states[entry.entity_id]?.attributes?.device_class === targetClass;
    // fallback: match by entity_id / friendly-name keywords (device_class is often missing on
    // battery-level sensors). e.g. sensor.somfy_shade_battery_level_..., ..._rssi_...
    const KEYWORDS = {
      [C.DEVICE_CLASS_BATTERY]: /(?:^|[_\s-])(?:batt|battery)/i,
      [C.DEVICE_CLASS_SIGNAL]: /(?:rssi|signal|link[_\s-]?quality|lqi|dbm)/i,
    };
    const matchesKeyword = (entry, type) => {
      const st = this.hass.states[entry.entity_id];
      if (!st) return false;
      const hay = `${entry.entity_id} ${st.attributes?.friendly_name || ''}`;
      return KEYWORDS[type] ? KEYWORDS[type].test(hay) : false;
    };

    for (const cfg of this.shutterCfgs) {
      const entityId = cfg.entityId();
      let siblings =null;

      for (const type of C.DEVICES_CLASSES_SUB_ENTITIES) {
        const subEntity = cfg.subEntity[type];
        if (subEntity.entityId === C.AUTO){
          if (!this.deviceEntities) {
            this.deviceEntities = await this.getDeviceEntities(entityIds);
          }
          if (!siblings){
            const primary = this.deviceEntities.find(e => e.entity_id === entityId);
            // siblings: all entities of the device of the primary entity
            siblings = this.deviceEntities.filter(
              e => e.device_id === primary?.device_id && e.entity_id !== entityId
            );
          }
          // prefer an exact device_class match, then fall back to a keyword match
          const subId = (siblings.find(e => hasDeviceClass(e, type))
                      || siblings.find(e => matchesKeyword(e, type)))?.entity_id ?? null;
          subEntity.set(subId);

        }
     }
   }
   return true;
  }
/*
* OVERRIDE FUNCTIONS HA CARD
*/
  static getConfigElement() {
    return document.createElement(C.HA_EDITOR_NAME);
  }
  setConfig(config)
  {
    // Covers can be supplied explicitly (entities:) OR auto-generated (areas:/labels:).
    if (!config.entities && !config.areas && !config.labels) {
      throw new Error('You need to define entities, areas, or labels');
    }
    this.config = config;
  }
  getCardSize() {
    const count = Array.isArray(this.config.entities) ? this.config.entities.length : 1;
    console_log('getCardSize called, number of entities:', count);
    return count + 1;
  }

  //Section layout : we compute the size of the card. (experimental)


  getGridOptions(text="from External"){
    /*
      This is called **early and synchronously** by HA — before `setConfig()` and definitely before `hass`:

      getGridOptions()   ← HA calls this first, no hass, no config
      setConfig(config)  ← config arrives
      set hass(hass)     ← hass arrives
    */
    let options = this.getGridOptionsInternal(text);
    return options;
  }

  getGridOptionsInternal(text){

    //const debug=0;
    if (!this.gridContainer){
      this.defGridContainer();
    }
    let options={};
    let tempCardName="";

    let sizeCard = new xyPair();

    console_log(`getGridOptionsInternal: ${text}; cols  & rows:`,this.nbCols,this.nbRows,this.gridPixelHeight,this.gridPixelWidth,this.previousGridWidth);


    if (this.initializeReady &&
        this.gridContainer &&
        this.config &&
        this.shutterCfgs?.length
      ){
      this.previousGridWidth = this.gridPixelWidth;
      const style = getComputedStyle(this.gridContainer);
      const columns = style.getPropertyValue('grid-template-columns');
      this.gridPixelWidth = (parseFloat(columns.split(/\s+/)[0]));

      if (!this.nbCols || !this.nbRows || this.previousGridWidth !== this.gridPixelWidth){
        let separate=false;

        let shutterSeparateBlock= new HtmlBlocks.htmlBlockShutterSeparate(this.cardCfg);
        let sizeSeparate = shutterSeparateBlock.size();
        let cardTitleSize = new HtmlBlocks.htmlBlockCardTitle(this.cardCfg);
        let sizeTitle = cardTitleSize.size();

        this.shutterCfgs.forEach(cfg =>{

          let block = {cfg: cfg,escImages: this.escImages};
          console_log(`${cfg.friendlyName()} HtmLblock for Size`);
          let shutterBlock = new HtmlBlocks.htmlBlockShutter(block);

          if (separate){
            if (this.cardCfg.stacked() == C.VERTICAL){
              sizeCard = shutterBlock.gridAddVertical(sizeCard,sizeSeparate);
            }else{
              sizeCard = shutterBlock.gridAddHorizontal(sizeCard,sizeSeparate);
            }
          }else{
            sizeCard = shutterBlock.gridAddVertical(sizeCard,sizeTitle);
          }

          if (this.cardCfg.stacked() == C.VERTICAL){
            sizeCard = shutterBlock.gridAddVertical(sizeCard,shutterBlock.size());
          }else{
            sizeCard = shutterBlock.gridAddHorizontal(sizeCard,shutterBlock.size());
          }
        separate=true;

        });
        sizeCard = cardTitleSize.gridAddBoth(sizeCard,new xyPair(2*C.CARD_PADDING,2*C.CARD_PADDING)); // padding Card


        this.nbRows= Math.ceil((sizeCard.y()+this.gridPixelGap)/(this.gridPixelHeight+this.gridPixelGap));
        this.nbCols= Math.ceil((sizeCard.x()+this.gridPixelGap)/(this.gridPixelWidth+this.gridPixelGap));

        let message = `GridSize: rows: ${this.nbRows}, columns: ${this.nbCols}`;
        console_log('Message 2:', message);
        this.messageManager.addMessage(message, C.HA_ALERT_SUCCESS, 'GridSize');

        console_log('Calc rows and cols',this.nbRows,this.nbCols);
      }else{
        console_log('No recalc rows and cols');
      }
// version v1.6.1b0: (temporary) removed due to issue #168
/*
      const divCard= this.closestElement('div.card');

      if (divCard){

        divCard.style.setProperty('--row-size',this.nbRows);
        divCard.style.setProperty('--column-size',this.nbCols);
      }else{
        console.warn(`Could not find div.card to set CSS variables. Cardname: '${tempCardName}'`);
      }
*/

      /*
      * Calculate the number of rows and columns
      * Use sizes from calculated cardSize and HA grid sizes
      */
      //console.log('=====>Size Card: ', sizeCard);
      let min_rows= this.nbRows;
      let min_cols = this.nbCols;

      if (this.inEditor()) {
        min_rows = 4;
        min_cols = 4;
      }

      options = {
        rows: this.nbRows,
        columns: this.nbCols,
        min_rows: min_rows,
        min_columns: min_cols,
        // max_rows: 6,
        // max_columns: 28,
      };
    }else{
        console_log('ShutterCard  .. no content yet ??.. No (new) nbRows and nbCols calculated');
    }
    console_log('options: ',options);
    return options;
  }
  inEditor(){
    return this.closestElement('hui-dialog-edit-card') !== null;
  }
  // ############################################################################################################
  static getStubConfig(hass, unusedEntities, allEntities) {
    //Search for a cover entity unused first then in all entities.
    let entityId = unusedEntities.find((eid) => eid.split(".")[0] === "cover" );
    if (!entityId) {
      entityId = allEntities.find((eid) => eid.split(".")[0] === "cover");
    }
    //let entity = hass.states[entityId];
    return {
      "entities": [{
        "entity": entityId,
        "name": "My First Easy Cover Styler Card",
        "top_offset_pct": 13,
        "button_up_hide_states": [
          C.SHUTTER_STATE_OPEN,
          C.SHUTTER_STATE_OPENING,
          C.SHUTTER_STATE_CLOSING
        ],
        "button_stop_hide_states": [
          C.SHUTTER_STATE_OPEN,
          C.SHUTTER_STATE_CLOSED,
          C.SHUTTER_STATE_PARTIAL_OPEN
        ],
        "button_down_hide_states": [
          C.SHUTTER_STATE_CLOSED,
          C.SHUTTER_STATE_OPENING,
          C.SHUTTER_STATE_CLOSING
        ]
      }]
    };
  }
}


export class EnhancedShutter extends LitElement
{
  // loaded from EnhancedShutterCardNew():
  // - react_ShutterState
  // - react_BatteryState
  // - react_SignalState
  // - react_ScreenOrientation

  // - hass
  // - cfg
  // - escImages

  //reactive properties
    static properties = {
    // reactive variables from parent card
    react_ShutterState: {type: String},        // for detecting state of shutter (open close etc)
    react_BatteryState: {type: String},        // for detecting battery state change
    react_SignalState: {type: String},         // for detecting signal state change
    react_ScreenOrientation: {type: Object},   // for change in screen orientation  by resize window or rotate device
    react_InitializeReady: {type: Boolean},
    react_StyleVersion: {type: Number},         // bumped when a shared style library loads, so lib:<slug> styles re-resolve
    cfg: {attribute: false},                    // v1.7.0: reactive so the area-selector layout re-renders when the active area swaps a reused element's cfg

    // local reactive variables
    react_ShutterPosition: {state: true},      // for dragging shutter onscreen
    react_TiltPosition: {state: true},         // for dragging tilt-shutter onscreen
    react_ResizeDivShutterSelector: {state: true,type: Boolean}, // for detecting resize of shutter div by responsive design
  };
  constructor(){
    super(); //  mandetory by Lit-element

    this.screenPosition=-1;
    this.actualScreenPosition=-1; // position on the computerscreen
    this.actualTiltPosition=-1; // real tilt position
    this.positionText ='';
    this.action = '#';

    this[C.ESC_CLASS_SELECTOR]=null;
  }
  shouldUpdate(changedProperties)
  {
    // console.log('  Cover shouldUpdate Start: ',this.cfg.friendlyName());
    changedProperties.forEach((oldValue, propName) => { // eslint-disable-line no-unused-vars
        // console.log(`  Cover shouldUpdate, Property [${propName}] changed. oldValue: ${oldValue} newValue: ${this[propName]}`);
    });
    let doUpdate =(this.react_InitializeReady) ? true : false;
    return doUpdate;
  }
  connectedCallback() {
    super.connectedCallback();
    this.cfg.enhancedShutter=this;
    //let test=1;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  startResizeObserver() {
    const onResize = (entries) => {
      if (getDebug()) resizeDebugger(entries,this.cfg.friendlyName());

      /* Things todo when resize is detected */
      entries.forEach(entry =>{
        // keep size due to start-up sizing problem in card-editor.
        // TODO this should be solved by some async/await, but don't know how (yet)
        this.actualWidthEdit = Math.floor(entry.contentRect.width);
        this.actualHeightEdit= Math.floor(entry.contentRect.height);
      })
      this.react_ResizeDivShutterSelector = !this.react_ResizeDivShutterSelector;
    }
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(this[C.ESC_CLASS_SELECTOR]);
  }
  update(changedProperties) {
    if (this.cfg) this.cfg.enhancedShutter = this; // keep the back-ref current when cfg swaps (area-selector layout)
    super.update(changedProperties);  // this calls the render() function.
    /*
    changedProperties.forEach((oldValue, propName) => {
      console_log(`${this.cfg.friendlyName()}: Shutter Update, Property ${propName} changed. oldValue: ${oldValue}; new: ${this[propName]}`);
    });
    /**/
    this.action='cover-update';
  }

  render()
  {
    //let entityId = this.cfg.entityId();
    //let positionText;
    //console.log('action: ',this.action);
    if (this.action=='user-drag-picker'){
      // position from screen-dragging shown
      this.actualScreenPosition = this.screenPosition;  // old
      this.actualShutterPosition = this.react_ShutterPosition;
      this.actualTiltPosition = this.cfg.currentBaseTiltPosition();
    }else if (this.action=='user-drag-slider'){
      // position from screen-dragging shown
      this.actualScreenPosition =  this.defScreenPositionFromCurrentPosition(this.react_ShutterPosition);
      this.actualShutterPosition = this.react_ShutterPosition;
      this.actualTiltPosition = this.cfg.currentBaseTiltPosition();
    }else if (this.action=='user-drag-tilt'){
      // tilt position from slider-dragging shown
      this.actualScreenPosition =  this.defScreenPositionFromCurrentPosition(); //old
      this.actualShutterPosition = this.cfg.currentDevicePosition();
      this.actualTiltPosition = this.react_TiltPosition;
    }else{
      // physical position cover shown.
      this.actualScreenPosition =  this.defScreenPositionFromCurrentPosition();
      this.actualShutterPosition = this.cfg.currentDevicePosition()?? 0;
      this.actualTiltPosition = this.cfg.currentDeviceTiltPosition() ?? 0;
    }
    this.react_TiltPosition = this.actualTiltPosition; // TODO: logical not needed, but actual it does: check
    this.react_ShutterPosition = this.actualShutterPosition;
    //console_log(`Render Cover ${this.cfg.friendlyName()}, action: ${this.action}, actualScreenPosition: ${this.actualScreenPosition}, actualShutterPosition: ${this.actualShutterPosition}, actualTiltPosition: ${this.actualTiltPosition}`);
    //console_log(`${this.cfg.friendlyName()} HtmLblock for Show`);
    const shutterBlock = new HtmlBlocks.htmlBlockShutter(this);

    return shutterBlock.show(this);

  }
  firstUpdated() {
    // openClosePicker
    const openClosePicker = findElement(this, `.${C.ESC_CLASS_SELECTOR_PICKER}`);
    if (openClosePicker) {
      this.manageEvents(C.ADD_EVENT, C.MOUSEDOWN, openClosePicker, this.mouseDownOpenClosePicker);

    }
    // openCloseSlider
    if (this.cfg.showOpenCloseSliderBlock() && this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)){
      this.openCloseSlider = findElement(this,`.${C.ESC_CLASS_SLIDER_CLASS}.openclose`);
      if (this.openCloseSlider) {
        this.manageEvents(C.ADD_EVENT, C.MOUSEDOWN, this.openCloseSlider, this.mouseDownOpenCloseSlider);
      }
    }
    // tiltSlider
    if (this.cfg.canTilt()&& this.cfg.showTiltSliderBlock()){
      this.tiltSlider = findElement(this,`.${C.ESC_CLASS_SLIDER_CLASS}.tilt`);
      if (this.tiltSlider) {
        this.manageEvents(C.ADD_EVENT, C.MOUSEDOWN, this.tiltSlider, this.mouseDownTiltSlider);
      }
    }
    // main window
    this[C.ESC_CLASS_SELECTOR] = findElement(this, `.${C.ESC_CLASS_SELECTOR}`);
    if (this[C.ESC_CLASS_SELECTOR]) {
      this.startResizeObserver();
    }
  }

  manageEvents(action, mouseState, target, handler) {

    const EVENTS = {
      [C.MOUSEDOWN]: ['touchstart', 'mousedown', 'pointerdown'],
      [C.MOUSEMOVE]: ['touchmove', 'mousemove', 'pointermove'],
      [C.MOUSEUP]:   ['touchend', 'mouseup', 'pointerup']
    };
    const eventMethod = {
       [C.ADD_EVENT]:    target.addEventListener.bind(target),
       [C.REMOVE_EVENT]: target.removeEventListener.bind(target)
    }
    for (const type of EVENTS[mouseState]) {
      if (mouseState === C.MOUSEDOWN && type === 'touchstart' && action === C.ADD_EVENT) {
        // Workaround: reattach touchstart as non-passive
        target.removeEventListener(type, handler);
        eventMethod[action](type, handler, { passive: false });
      } else {
        //method(type, handler);
        eventMethod[action](type, handler);
      }
    }
  }
  getOverflow(){
    return 'hidden';
    return this.cfg.debug()?'visible':'hidden';
  }

  getTiltAngleDeg(sliderPosition){
    const angleDeg = this.getTiltAngle(sliderPosition)+'deg';
    return angleDeg;
  }
  getTiltAngleDegGraph(sliderPosition){
    const angleDeg =Math.min(-4,(Math.max(-176,this.getTiltAngle(sliderPosition))))+this.tiltIconRotate2()+'deg';
    return angleDeg;
  }
  getTiltAngle(sliderPosition){
    const angle = -(this.cfg.tiltAngleMin() + (sliderPosition / 100) * (this.cfg.tiltAngleMax() - this.cfg.tiltAngleMin()));
    return angle;
  }

  updated(changedProperties) {
    // after update and render
    super.updated(changedProperties);
    if (this.cfg.canTilt()){
      if (this.tiltSlider) this.tiltSlider.value = this.react_TiltPosition  ; // TODO !!!!! Special ..Bug ??...
    }
    if (this.cfg.showOpenCloseSliderBlock()){
      if (this.openCloseSlider) this.openCloseSlider.value = this.react_ShutterPosition; // TODO !!!!! Special ..Bug ??...
    }
    this.action='cover-updated';
  }


/**
 * TRANSFORM FUNCTIONS
 */

  transformDiv(screenPosition){
    // TODO: improve handling screenPosition
    const size_x = this.actualGlobalWidthPx();
    const size_y = this.actualGlobalHeightPx();
    const size_global = new xyPair(size_x,size_y);
    const size_local=this.cfg.switchAxis(size_global);
    return [
      this.cfg.transformTranslate(size_global.x()/2,size_global.y()/2), // to mid-point
      this.cfg.transformRotate(), // rotate around div transform-origin
      this.cfg.transformScale(size_global.x,size_global.y), // correct local sizes
      this.cfg.transformTranslate(0,-size_local.y()/2 + screenPosition),  // Move to correct position
    ].join(C.SPACE);
  }
  transformPicker(screenPosition){
    // TODO: improve handling screenPosition
    const size_x = this.actualGlobalWidthPx();
    const size_y = this.actualGlobalHeightPx();
    const size_global = new xyPair(size_x,size_y);
    const size_local=this.cfg.switchAxis(size_global);
    return [
      this.cfg.transformTranslate(size_global.x()/2,size_global.y()/2), // to mid-point
      this.cfg.transformRotate(), // rotate around div transform-origin
      this.cfg.transformScalePicker(size_global.x(),size_global.y()), // correct local width of the Picker
      this.cfg.transformTranslate(0,-size_local.y()/2 + screenPosition),  // Move to correct position

    ].join(C.SPACE);
  }
  transformSlide(screenPosition){
    // TODO: improve handling screenPosition
    const size_x = this.actualGlobalWidthPx();
    const size_y = this.actualGlobalHeightPx();
    const size_global = new xyPair(size_x,size_y);
    const size_local=this.cfg.switchAxis(size_global);
    return [
      this.cfg.transformTranslate(size_global.x()/2,size_global.y()/2), // to mid-point
      this.cfg.transformRotate(), // rotate around div transform-origin
      //this.cfg.transformScale(size_global.x(),size_global.y()), // correct local width of the Picker
      this.cfg.transformScalePicker(size_global.x(),size_global.y()), // correct local width of the Picker
      this.cfg.transformTranslate(0,-size_local.y()/2 + screenPosition),  // Move to correct position

    ].join(C.SPACE);
  }
  transformUndoSlatsRotate(){

    let rotate;
    let size_x;
    let size_y;
    if (this.cfg.rotateSlatsImage()){
      size_x = 1;
      size_y = 1;
      rotate =  0;
    }else{
      size_x = this.actualGlobalWidthPx();
      size_y = this.slatsSlideHeightPx();
      rotate = -this.cfg.getCloseAngle();
    }
    return [
      this.cfg.transformRotate(rotate), // rotate around div transform-origin
      this.cfg.transformScale(size_x,size_y), // correct local width of the main
    ].join(C.SPACE);
  }
  transformTiltSlatRotate(){
    // --esc-transform-tilt-slat-rotate
    let rotate;
    if (this.cfg.rotateSlatsImage()){
      rotate = 0;
    }else{
      rotate = -90;
    }
    return [
      this.cfg.transformRotate(rotate), // rotate around div transform-origin
    ].join(C.SPACE);
  }
  sliderWritingMode(){
    const mode= this.cfg.buttonGroupInRow() ? 'vertical-rl' : 'horizontal';
    return mode;
  }
  sliderDirection(){
    const direction= this.cfg.buttonGroupInRow() ? 'rtl' : 'ltr';
    return direction;
  }
  tiltIconRotate2(){
    let rotate= this.cfg.buttonGroupInRow() ? 0 : -90;
    return rotate;
  }
  tiltIconRotate3(){
    let rotate= -this.tiltIconRotate2();
    return this.cfg.transformRotate(rotate);
  }
  tiltSlatOrigin(){
    // --esc-tilt-slat-origin
    let origin;
    if (this.cfg.rotateSlatsImage()) {
      origin = '50% 50%';
    }else{
      const width = ((this.shutterSlatSize().x())/2)+C.UNITY;
      origin = `${width} ${width}`;
    }
    return origin;
  }
  transformPartial(){
    const size_x = this.actualGlobalWidthPx();
    const size_y = this.actualGlobalHeightPx();
    const size_global = new xyPair(size_x,size_y);
    const size_local=this.cfg.switchAxis(size_global);
    const position = this.defScreenPositionFromCurrentPosition(this.cfg.calcOffset(this.cfg.partial()));
    return [
      this.cfg.transformTranslate(size_global.x()/2,size_global.y()/2), // to mid-point
      this.cfg.transformRotate(), // rotate around div transform-origin
      this.cfg.transformScale(size_global.x(),size_global.y()), // correct local sizes
      this.cfg.transformTranslate(0,-size_local.y()/2+position),  // Move to correct position
    ].join(C.SPACE);
  }
  transformMovement(){
    const size_x = this.actualGlobalWidthPx();
    const size_y = this.actualGlobalHeightPx();
    const size_global = new xyPair(size_x,size_y);
    const size_local=this.cfg.switchAxis(size_global);
    const position = this.offsetOpenedPx()+this.coverSizeMovingDirectionPx()/2.0;
    return [
      'translate(-50%, -50%)',
      this.cfg.transformTranslate(size_global.x()/2,size_global.y()/2), // to mid-point
      this.cfg.transformRotate(), // rotate around div transform-origin
      this.cfg.transformTranslate(0,-size_local.y()/2+position),  // Move to correct position
    ].join(C.SPACE);
  }

  coverSizeMovingDirectionPx(){
    return this.cfg.verticalMovement() ? this.coverHeightPx():this.coverWidthPx();
  }
  windowSizeMovingDirectionPx(){
    return this.cfg.verticalMovement()
      ? this.actualGlobalHeightPx()
      : this.actualGlobalWidthPx();
  }
  slatsSizeMovingDirectionPx(){
    const value = this.cfg.rotateSlatsImage()
      ? this.slideHeightPx()-this.shutterBottomSize().y()
      : this.slideHeightPx();
    return value;
  }

  coverHeightPx(){
    return this.actualGlobalHeightPx()-this.offsetClosedPx() - this.offsetOpenedPx();
  }
  coverWidthPx(){
    return this.actualGlobalWidthPx()-this.offsetClosedPx() - this.offsetOpenedPx();
  }
  shutterBottomSize(){
    const imageSize = this.escImages.getShutterBottomImageSize(this.cfg.id());
    return imageSize;
  };

  shutterMainBackgroundPosition(){

    const direction=this.cfg.unrollUnfoldDirection();
    const dirs={
      [C.DOWN]:C.BOTTOM,
      [C.UP]:C.TOP,
      [C.LEFT]:C.LEFT,
      [C.RIGHT]:C.RIGHT
    };
    const position = this.cfg.rotateSlatsImage() ? C.BOTTOM : dirs[direction] || C.BOTTOM;
    return position;
  }
  shutterEdgeBackgroundPosition(){
    const position = C.BOTTOM
    return position;
  }
  shutterSlatSizePercentage(){
    let imageSize = new xyPair();
    let imagePercentage = new xyPair();
    imageSize.fill2(this.shutterSlatSize());
    if (this.cfg.rotateSlatsImage()) {
      imagePercentage.fill2(this.sizePercentageSlat(imageSize));
    }else{
      //if (!this.cfg.verticalMovement()) imageSize =  new xyPair(imageSize.y(), imageSize.x());
      if (!this.cfg.verticalMovement()) imageSize.switch();
      imagePercentage.fill2(this.sizePercentageSlat(imageSize));
      //if (!this.cfg.verticalMovement()) imagePercentage = new xyPair(imagePercentage.y(), imagePercentage.x());
      if (!this.cfg.verticalMovement()) imagePercentage.switch();
      imagePercentage.fill("50%","50%");
    }
    let sizeText = `${imagePercentage.x()} ${imagePercentage.y()}`;
    return sizeText;
  }
  shutterSlatsSizePercentage(){
    let imageSize = new xyPair();
    let imagePercentage = new xyPair();
    imageSize.fill2(this.shutterSlatSize());
    if (this.cfg.rotateSlatsImage()) {
      imagePercentage.fill2(this.sizePercentage(imageSize));
    }else{
      //if (!this.cfg.verticalMovement()) imageSize =  new xyPair(imageSize.y(), imageSize.x());
      if (!this.cfg.verticalMovement()) imageSize.switch();
      imagePercentage.fill2(this.sizePercentage(imageSize));
      //if (!this.cfg.verticalMovement()) imagePercentage = new xyPair(imagePercentage.y(), imagePercentage.x());
      if (!this.cfg.verticalMovement()) imagePercentage.switch();
    }
    let sizeText = `${imagePercentage.x()} ${imagePercentage.y()}`;
    return sizeText;
  }
  canShowTilt(){
    // when no size, no Tilt show possible
    return this.slatSizeMovingDirectionPx()? true:false;
  }
  slatSizeMovingDirectionPx(){
    //const value = this.cfg.verticalMovement() || this.cfg.rotateSlatsImage()
    const value = this.cfg.rotateSlatsImage()
      ? this.shutterSlatSize().y()
      : this.shutterSlatSize().x();
    return value;
  }
  shutterSlatSize(){
    let imageSize = this.escImages.getShutterSlatImageSize(this.cfg.id())
    return imageSize;
  }


  shutterBottomSizePercentage(){
    const imageSize = this.escImages.getShutterBottomImageSize(this.cfg.id())
    let size;
    if (this.cfg.stretchEdgeImage()){
      size= `100% ${imageSize.y()}px`;
    }else{
      size= `${imageSize.x()}px ${imageSize.y()}px`;
    }
    return size;
  }
  sizePercentage(imageSize){
    let width;
    let height = this.slatsSlideHeightPx();
    if (this.cfg.verticalMovement()) {
      width = this.cfg.windowWidthPx();
    }else{
      width = this.cfg.windowHeightPx();
    }
    let x = 100/(width/imageSize.x())+ "%"; // TODO stretch_bottom_image
    let y = 100/(height/imageSize.y())+ "%"; // TODO stretch_bottom_image
    let size = new xyPair(x,y);
    return size;

  }
  sizePercentageSlat(imageSize){
    let width;
    let height = this.shutterSlatSize().y();
    if (this.cfg.verticalMovement()) {
      width = this.cfg.windowWidthPx();
    }else{
      width = this.cfg.windowHeightPx();
    }

    // let factor = width / imageSize.x;
    let x = `calc(100% / (${width}/${imageSize.x()}))`; // TODO stretch_bottom_image
    let y = `calc(100% / (${height}/${imageSize.y()}))`; // TODO stretch_bottom_image
    let size = new xyPair(x,y);
    return size;

  }


  offsetOpenedPx(){
    return Math.round(this.cfg.offsetOpenedPct()/ 100 * this.windowSizeMovingDirectionPx());
  }
  offsetClosedPx(){
    return Math.round(this.cfg.offsetClosedPct())/ 100 * this.windowSizeMovingDirectionPx();
  }
  /**
   *
   * @returns Netto local height of the slats-part (= total - edge)
   */
  slatsSlideHeightPx(){
    return this.slideHeightPx()-this.shutterBottomSize().y();
  }
  /**
   * @return Local height of the slide-part
   */
  slideHeightPx(){
    const size = this.windowSizeMovingDirectionPx();
    return size;
  }
  slatHeightPx(){
    return this.slatSizeMovingDirectionPx();
  }
  slatHeightPx1(){
    return this.slatsSizeMovingDirectionPx();
  }
  coverOpenedPx(){
    return this.offsetOpenedPx();
  }
  coverClosedPx(){
    const size_global = new xyPair(this.actualGlobalWidthPx(),this.actualGlobalHeightPx());
    const size_local=this.cfg.switchAxis(size_global);

    return size_local.y()-this.offsetClosedPx();
  }
  tiltSlatHeightPx(){
    let value;
    if (this.cfg.rotateSlatsImage()){
      value = this.shutterSlatSize().y();
    }else{
      value =this.slatHeightPx1();
    }
    return value;
  }
  tiltSlatWidthPx(){
    let value;

    if (this.cfg.rotateSlatsImage()){
      value = '100%';
    }else{
      value = (this.shutterSlatSize().x()/this.cfg.windowWidthPx()*100)+'%';
    }
    return value;
  }
  tiltSlatBackgroundSize(){
    let value;
    if (this.cfg.rotateSlatsImage()){
      value = this.shutterSlatSizePercentage();
    }else{
      value = '100% '+(this.shutterSlatSize().y()/this.cfg.windowHeightPx()*100)+'%';
    }
    return value;
  }

  defScreenPositionFromCurrentPosition(currentDevicePosition=this.cfg.currentDevicePosition()) {

    let visiblePosition = this.cfg.visiblePosition(currentDevicePosition);
    let screenPosition = this.offsetOpenedPx() + (this.coverSizeMovingDirectionPx() * (this.cfg.invertPosition(visiblePosition)) / 100) ;
    return screenPosition;

  }

  actualGlobalWidthPx() {
    let width;
    if (this.actualWidthEdit) {
      width = this.actualWidthEdit; // Should be solved by an async /await / promise ...
    }else{
      width = this[C.ESC_CLASS_SELECTOR]?.getBoundingClientRect()?.width ?? this.cfg.windowWidthPx();
    }
    return width;

  }
  actualGlobalHeightPx() {
    let height;
    if (this.actualHeightEdit) {
      height = this.actualHeightEdit; // Should be solved an by asymc /await / promise ...
    }else{
      height = this[C.ESC_CLASS_SELECTOR]?.getBoundingClientRect()?.height ?? this.cfg.windowHeightPx();
    }
    return height;
  }

 //##########################################

  doHassMoreInfoOpen(entityIdValue) {
    if (!this.cfg.passiveMode()){
      let e = new Event('hass-more-info', { composed: true});
      e.detail= { entityId : entityIdValue};
      this.dispatchEvent(e);
    }
  }
  doOnclick(command, position=null) {

    this.action='user-pick-on-click';
    let entityId= this.cfg.getTargetEntities();

    if (position !==null) position = this.cfg.applyInvertToPosition(position);

    const services ={
      [C.ACTION_SHUTTER_OPEN] : {'args': ''},
      [C.ACTION_SHUTTER_CLOSE] : {'args': ''},
      [C.ACTION_SHUTTER_STOP] : {'args': ''},
      [C.ACTION_SHUTTER_SET_POS] : {'args': {position: position}},
      [C.ACTION_SHUTTER_OPEN_TILT] : {'args': ''},
      [C.ACTION_SHUTTER_CLOSE_TILT] : {'args': ''},
      [C.ACTION_SHUTTER_SET_POS_TILT] : {'args': {tilt_position: position}},
    }
    //console.log('=> doOnclick: command:',command,'position:',position,'entityId:',entityId);
    this.callHassCoverService(entityId,command,services[command].args);
  }
  getBasePickPoint(event){
    /* get picked point */
    this.basePickPoint = this.getPoint(event);
    /* get current shutter position on screen */
    this.basePickPoint.shutterScreenPos = this.defScreenPositionFromCurrentPosition();

  }

  getShutterOnScreenPosition(event){
    const screenPosition = this.getScreenPosFromPickPoint(event);
    const shutterPosition = this.getShutterPosFromScreenPos(screenPosition);
    return shutterPosition; // between 0-100
  }
  getTiltOnScreenPosition(){
    // since Tilt uses Slider, event is not needed
    const  tiltPosition = parseFloat(this.tiltSlider.value) ?? 0;
    return tiltPosition; // between 0-100
  }
  getOpenCloseOnScreenPosition(){
    // since Tilt uses Slider, event is not needed
    const  shutterPosition =  parseFloat(this.openCloseSlider.value) ?? 0;
    return shutterPosition; // between 0-100
  }

  getShutterPosFromScreenPos(screenPosition){
    let shutterPosition = C.SHUTTER_OPEN_PCT - Math.round((screenPosition - this.offsetOpenedPx()) * (this.cfg.offset()) / this.coverSizeMovingDirectionPx());
    return shutterPosition;
  }

  getScreenPosFromPickPoint(event){
    const pickPoint = this.getPoint(event);
    let delta = new xyPair(pickPoint.coord.x() - this.basePickPoint.coord.x() ,
                           pickPoint.coord.y() - this.basePickPoint.coord.y());
    let delta_local = this.cfg.rotateBackOrtho(delta);

    let newScreenPosition =
      Math.round(boundary(
        this.basePickPoint.shutterScreenPos+delta_local.y(),
        this.coverOpenedPx(),
        this.coverClosedPx()
      ));
    return newScreenPosition;
  }
  getPoint(event){
    let point ={
      x: event.pageX ,
      y: event.pageY,
      coord: new xyPair(event.pageX,event.pageY),
      movementVertical: this.cfg.verticalMovement(),
      closingDir: this.cfg.unrollUnfoldDirection()
    };
    return point;
  }
/**
 * MOUSE DOWN
 */
  mouseDownOpenClosePicker = (event) =>
  {
    if (event.pageY === undefined || this.cfg.passiveMode()) return;
    if (event.cancelable) {
      //Disable default drag event
      event.preventDefault();
    }
    this.action='user-drag-picker';
    this.getBasePickPoint(event);
    this.manageEvents(C.ADD_EVENT, C.MOUSEMOVE, this, this.mouseMoveOpenClosePicker);
    this.manageEvents(C.ADD_EVENT, C.MOUSEUP, window, this.mouseUpOpenClosePicker);
  };
  mouseDownTiltSlider = () => {
    this.action='user-drag-tilt';
    this.manageEvents(C.ADD_EVENT, C.MOUSEMOVE, this, this.mouseMoveTiltSlider);
    this.manageEvents(C.ADD_EVENT, C.MOUSEUP, window, this.mouseUpTiltSlider);
  }
  mouseDownOpenCloseSlider = () => {
    this.action='user-drag-slider';
    this.manageEvents(C.ADD_EVENT, C.MOUSEMOVE, this, this.mouseMoveOpenCloseSlider);
    this.manageEvents(C.ADD_EVENT, C.MOUSEUP, window, this.mouseUpOpenCloseSlider);
  }
/**
 * MOUSE MOVE
 */
  mouseMoveOpenClosePicker = (event) =>
  {
    if (event.pageY === undefined) return;
    this.action='user-drag-picker';
    this.screenPosition = this.getScreenPosFromPickPoint(event); //old
    this.react_ShutterPosition = this.getShutterOnScreenPosition(event);
    const tiltPosition = this.cfg.currentDeviceTiltPosition();
    this.positionText = this.cfg.computePositionText(this.react_ShutterPosition,tiltPosition);
    //console.log('mouseMoveOpenClosePicker:',this.react_ShutterPosition,tiltPosition,this.positionText);
  };
  mouseMoveTiltSlider = (event) => { // mouseMoveTilt
    this.action='user-drag-tilt';
    this.react_TiltPosition = this.getTiltOnScreenPosition(event);
    const shutterPosition = this.cfg.currentDevicePosition();
    this.positionText = this.cfg.computePositionText(shutterPosition,this.react_TiltPosition);
    //console.log('mouseMoveTiltSlider:',shutterPosition,this.react_TiltPosition,this.positionText);
  }
  mouseMoveOpenCloseSlider = (event) => { // mouseMoveTilt
    this.action='user-drag-slider';
    this.react_ShutterPosition = this.getOpenCloseOnScreenPosition(event); // TODO
    const tiltPosition = this.cfg.currentDeviceTiltPosition();
    this.positionText = this.cfg.computePositionText(this.react_ShutterPosition,tiltPosition);
    //console.log('mouseMoveOpenCloseSlider:',this.react_ShutterPosition,tiltPosition,this.positionText);
  }
/**
 * MOUSE UP
 */

  mouseUpTiltSlider = (event) => {
    this.action='user-drag-tilt';
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEMOVE, this, this.mouseMoveTiltSlider);
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEUP, window, this.mouseUpTiltSlider);
    this.react_TiltPosition = this.getTiltOnScreenPosition(event)
    this.sendTilt(this.react_TiltPosition);
  }
  mouseUpOpenCloseSlider = (event) => {
    this.action='user-drag-slider';
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEMOVE, this, this.mouseMoveOpenCloseSlider);
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEUP, window, this.mouseUpOpenCloseSlider);
    this.react_ShutterPosition =  this.getOpenCloseOnScreenPosition(event);
    this.sendOpenClose(this.react_ShutterPosition);
  }
  mouseUpOpenClosePicker = (event) => {
    if (event.pageY === undefined) return;
    this.action='user-drag-picker';
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEMOVE, this, this.mouseMoveOpenClosePicker);
    this.manageEvents(C.REMOVE_EVENT, C.MOUSEUP, window, this.mouseUpOpenClosePicker);
    this.react_ShutterPosition = this.getShutterOnScreenPosition(event);
    this.sendOpenClose(this.react_ShutterPosition);
  };
  sendOpenClose(shutterPosition){
    if (this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)){
      // send position to shutter (or all members of an aggregate)
      this.sendShutterPosition(this.cfg.getTargetEntities(), shutterPosition);
    }else{
      // no ESC_FEATURE_SET_POSITION, so send open- or close-action
      const actionToSend = (shutterPosition > 50) ? C.ACTION_SHUTTER_OPEN : C.ACTION_SHUTTER_CLOSE;
      this.callHassCoverService(this.cfg.getTargetEntities(),actionToSend);
      //this.requestUpdate();
    }
  }
  sendTilt(tiltPosition){
    if (this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_TILT_POSITION)){
      // send tilt position to shutter (or all members of an aggregate)
      this.sendShutterTiltPosition(this.cfg.getTargetEntities(), tiltPosition);
    }else{
      // no ESC_FEATURE_SET_TILT_POSITION, so send open- or close-action
      const actionToSend = (tiltPosition > 50) ? C.ACTION_SHUTTER_OPEN_TILT : C.ACTION_SHUTTER_CLOSE_TILT;
      this.callHassCoverService(this.cfg.getTargetEntities(),actionToSend);
      //this.requestUpdate();
    }
  }

  sendShutterPosition( entityId, position)
  {
    this.callHassCoverService(entityId,C.ACTION_SHUTTER_SET_POS, { position: this.cfg.applyInvertToPosition(position) });
  }
  sendShutterTiltPosition( entityId, position)
  {
    this.callHassCoverService(entityId,C.ACTION_SHUTTER_SET_POS_TILT, { tilt_position: this.cfg.applyInvertToTiltPosition(position) });
  }
  callHassCoverService(entityId,command,args='')
  {
    if (!this.cfg.passiveMode()){
      const domain= 'cover';
      if (this.checkServiceAvailability(domain, command)) {
        this.hass.callService(domain, command, {
          entity_id: entityId,
          ...args
        });
      } else {
        console.warn(`Service '${domain}'-'${command}' not available`);
      }
    }
  }
  checkServiceAvailability(serviceDomain, serviceName) {
    const services = this.hass.services;
    let check = services[serviceDomain]?.[serviceName] !== undefined;
    return check;
  }

  static get styles() {
    return css`${unsafeCSS(C.SHUTTER_CSS)}
    `
  }
}
export class cardCfg {

  #cfg={};

  constructor(cfg)
  {
    this.stacked(cfg[C.CONFIG_STACKED]);
    this.title(cfg[C.CONFIG_TITLE]);
    this.layout(cfg[C.CONFIG_LAYOUT]);
    this.coverGap(cfg[C.CONFIG_COVER_GAP]);
    this.showAllControl(cfg[C.CONFIG_SHOW_ALL_CONTROL]);
    this.coversCollapsible(cfg[C.CONFIG_COVERS_COLLAPSIBLE]);
    this.coversStartCollapsed(cfg[C.CONFIG_COVERS_START_COLLAPSED]);
    this.showCoverDividers(cfg[C.CONFIG_SHOW_COVER_DIVIDERS]);
    this.areaButtonStyle(cfg[C.CONFIG_AREA_BUTTON_STYLE]);
    this.areaButtonsDir(cfg[C.CONFIG_AREA_BUTTONS_DIR]);
    this.areaButtonsPlacement(cfg[C.CONFIG_AREA_BUTTONS_PLACEMENT]);
    [C.CONFIG_AREA_BUTTON_WRAP, C.CONFIG_AREA_BUTTONS_WRAP_MODE, C.CONFIG_AREA_BUTTONS_COLUMNS,
     C.CONFIG_COVERS_WRAP_MODE, C.CONFIG_COVERS_COLUMNS,
     C.CONFIG_COVER_PAD_TOP, C.CONFIG_COVER_PAD_RIGHT, C.CONFIG_COVER_PAD_BOTTOM, C.CONFIG_COVER_PAD_LEFT,
     C.CONFIG_COLLAPSE_LABEL, C.CONFIG_COLLAPSE_SHOW_COUNT]
      .forEach(k => this.#storeKey(k, cfg[k]));
    this.coversDirection(cfg[C.CONFIG_COVERS_DIRECTION]);
    this.groupWithCovers(cfg[C.CONFIG_GROUP_WITH_COVERS]);
    this.groupSticky(cfg[C.CONFIG_GROUP_STICKY]);
    // v1.40.0: orientation + area-selector decoupled (derive from legacy layout/stacked when unset)
    const legacyAreas = cfg[C.CONFIG_LAYOUT] === C.LAYOUT_AREAS;
    // authoritative: use the explicit toggle when present; only fall back to legacy layout when it's absent
    const sasCfg = cfg[C.CONFIG_SHOW_AREA_SELECTOR];
    this.#storeKey(C.CONFIG_SHOW_AREA_SELECTOR, sasCfg === true || (sasCfg === undefined && legacyAreas));
    let orient = cfg[C.CONFIG_ORIENTATION];
    if (orient !== 'vertical' && orient !== 'horizontal') {
      orient = legacyAreas ? (cfg[C.CONFIG_COVERS_DIRECTION] === 'column' ? 'vertical' : 'horizontal')
                           : (cfg[C.CONFIG_STACKED] === C.HORIZONTAL ? 'horizontal' : 'vertical');
    }
    this.#storeKey(C.CONFIG_ORIENTATION, orient);
    // group_inline: new key, else derive from legacy group_placement === 'covers'
    const gi = cfg[C.CONFIG_GROUP_INLINE] === true ||
      (cfg[C.CONFIG_GROUP_INLINE] === undefined && cfg[C.CONFIG_GROUP_PLACEMENT] === C.GROUP_PLACE_COVERS);
    this.#storeKey(C.CONFIG_GROUP_INLINE, gi);
    this.#storeKey(C.CONFIG_AREA_MENU_INLINE, cfg[C.CONFIG_AREA_MENU_INLINE] === true);
    this.#storeKey(C.CONFIG_GROUP_NAME_FROM_AREA, cfg[C.CONFIG_GROUP_NAME_FROM_AREA] === true);
    // store all divider_* keys so coverDividerSpec() can read them back
    [C.CONFIG_DIVIDER_STYLE, C.CONFIG_DIVIDER_COLOR, C.CONFIG_DIVIDER_THICKNESS, C.CONFIG_DIVIDER_LENGTH,
     C.CONFIG_DIVIDER_GRADIENT, C.CONFIG_DIVIDER_GRADIENT_PATTERN, C.CONFIG_DIVIDER_LABEL, C.CONFIG_DIVIDER_ICON,
     C.CONFIG_DIVIDER_TEXT_POSITION, C.CONFIG_DIVIDER_JUSTIFY, C.CONFIG_DIVIDER_PAD,
     C.CONFIG_DIVIDER_TEXT_SIZE, C.CONFIG_DIVIDER_TEXT_WEIGHT, C.CONFIG_DIVIDER_TEXT_COLOR_MODE, C.CONFIG_DIVIDER_TEXT_COLOR,
     C.CONFIG_DIVIDER_ICON_SIZE, C.CONFIG_DIVIDER_ICON_COLOR_MODE, C.CONFIG_DIVIDER_ICON_COLOR,
     C.CONFIG_DIVIDER_INDENT, C.CONFIG_DIVIDER_CONTENT_JUSTIFY, C.CONFIG_DIVIDER_MIRROR_CENTER,
     C.CONFIG_DIVIDER_HIDE_LINE, C.CONFIG_DIVIDER_STOPS].forEach(k => { if (k !== undefined) this.#storeKey(k, cfg[k]); });

    Object.preventExtensions(this);
  }

  /*
   ** getters/setters
   */
  #getCfg(key,value= null){
    if (value!== null && this.#cfg[key]!=value){
      this.#cfg[key]= value;
    }
    return this.#cfg[key];
  }
  #storeKey(key, value){ if (key !== undefined && value !== undefined) this.#cfg[key] = value; }
  stacked(value = null){
    return this.#getCfg(C.CONFIG_STACKED,value);
  }
  title(value = null){
    return this.#getCfg(C.CONFIG_TITLE,value);
  }
  layout(value = null){
    return this.#getCfg(C.CONFIG_LAYOUT,value);
  }
  coverGap(value = null){
    return this.#getCfg(C.CONFIG_COVER_GAP,value);
  }
  collapseIcon(value = null){ return this.#getCfg(C.CONFIG_COLLAPSE_ICON, value); }
  collapseIconSize(value = null){ return this.#getCfg(C.CONFIG_COLLAPSE_ICON_SIZE, value); }
  collapseIconColor(value = null){ return this.#getCfg(C.CONFIG_COLLAPSE_ICON_COLOR, value); }
  showAllControl(value = null){ return this.#getCfg(C.CONFIG_SHOW_ALL_CONTROL, value); }
  coversCollapsible(value = null){ return this.#getCfg(C.CONFIG_COVERS_COLLAPSIBLE, value); }
  coversStartCollapsed(value = null){ return this.#getCfg(C.CONFIG_COVERS_START_COLLAPSED, value); }
  showCoverDividers(value = null){ return this.#getCfg(C.CONFIG_SHOW_COVER_DIVIDERS, value); }
  areaButtonStyle(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTON_STYLE, value); }
  areaButtonsDir(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTONS_DIR, value); }
  areaButtonsPlacement(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTONS_PLACEMENT, value); }
  areaButtonWrap(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTON_WRAP, value); }
  areaButtonsWrapMode(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTONS_WRAP_MODE, value); }
  areaButtonsColumns(value = null){ return this.#getCfg(C.CONFIG_AREA_BUTTONS_COLUMNS, value); }
  coversWrapMode(value = null){ return this.#getCfg(C.CONFIG_COVERS_WRAP_MODE, value); }
  coversColumns(value = null){ return this.#getCfg(C.CONFIG_COVERS_COLUMNS, value); }
  coverPad(){
    return [this.#getCfg(C.CONFIG_COVER_PAD_TOP), this.#getCfg(C.CONFIG_COVER_PAD_RIGHT),
            this.#getCfg(C.CONFIG_COVER_PAD_BOTTOM), this.#getCfg(C.CONFIG_COVER_PAD_LEFT)].map(v => Number(v) || 0);
  }
  coversDirection(value = null){ return this.#getCfg(C.CONFIG_COVERS_DIRECTION, value); }
  groupWithCovers(value = null){ return this.#getCfg(C.CONFIG_GROUP_WITH_COVERS, value); }
  groupSticky(value = null){ return this.#getCfg(C.CONFIG_GROUP_STICKY, value); }
  showAreaSelector(){ return !!this.#getCfg(C.CONFIG_SHOW_AREA_SELECTOR); }
  orientation(){ return this.#getCfg(C.CONFIG_ORIENTATION) || 'vertical'; }
  groupPlacement(){ return this.#getCfg(C.CONFIG_GROUP_PLACEMENT) || C.GROUP_PLACE_MENU; }
  areaMenuInline(){ return !!this.#getCfg(C.CONFIG_AREA_MENU_INLINE); }
  groupInline(){ return !!this.#getCfg(C.CONFIG_GROUP_INLINE); }
  groupNameFromArea(){ return !!this.#getCfg(C.CONFIG_GROUP_NAME_FROM_AREA); }
  collapseLabel(){ return this.#getCfg(C.CONFIG_COLLAPSE_LABEL) || ''; }
  collapseShowCount(){ const v = this.#getCfg(C.CONFIG_COLLAPSE_SHOW_COUNT); return v === undefined ? true : !!v; }
  // assemble a divider-engine spec from the flat divider_* config keys
  coverDividerSpec(){
    const color = this.#getCfg(C.CONFIG_DIVIDER_COLOR) || 'var(--divider-color)';
    const gradient = !!this.#getCfg(C.CONFIG_DIVIDER_GRADIENT);
    const spec = {
      line_style: this.#getCfg(C.CONFIG_DIVIDER_STYLE),
      color,
      thickness: this.#getCfg(C.CONFIG_DIVIDER_THICKNESS),
      length: this.#getCfg(C.CONFIG_DIVIDER_LENGTH),
      gradient,
      label: this.#getCfg(C.CONFIG_DIVIDER_LABEL),
      icon: this.#getCfg(C.CONFIG_DIVIDER_ICON),
      text_position: this.#getCfg(C.CONFIG_DIVIDER_TEXT_POSITION),
      justify: this.#getCfg(C.CONFIG_DIVIDER_JUSTIFY),
      content_justify: this.#getCfg(C.CONFIG_DIVIDER_CONTENT_JUSTIFY) || this.#getCfg(C.CONFIG_DIVIDER_JUSTIFY),
      pad_v: this.#getCfg(C.CONFIG_DIVIDER_PAD),
      text_size: this.#getCfg(C.CONFIG_DIVIDER_TEXT_SIZE),
      text_weight: this.#getCfg(C.CONFIG_DIVIDER_TEXT_WEIGHT),
      text_color_mode: this.#getCfg(C.CONFIG_DIVIDER_TEXT_COLOR_MODE),
      text_color: this.#getCfg(C.CONFIG_DIVIDER_TEXT_COLOR),
      icon_size: this.#getCfg(C.CONFIG_DIVIDER_ICON_SIZE),
      icon_color_mode: this.#getCfg(C.CONFIG_DIVIDER_ICON_COLOR_MODE),
      icon_color: this.#getCfg(C.CONFIG_DIVIDER_ICON_COLOR),
      indent: this.#getCfg(C.CONFIG_DIVIDER_INDENT),
      mirror_center: !!this.#getCfg(C.CONFIG_DIVIDER_MIRROR_CENTER),
      hide_line: !!this.#getCfg(C.CONFIG_DIVIDER_HIDE_LINE),
    };
    if (gradient) {
      const custom = this.#getCfg(C.CONFIG_DIVIDER_STOPS);
      if (Array.isArray(custom) && custom.length >= 2) {
        spec.stops = custom.map(s => ({ pos: s.pos, color: s.color === null ? color : s.color }));
      } else {
        const idx = Number(this.#getCfg(C.CONFIG_DIVIDER_GRADIENT_PATTERN)) || 0;
        const pat = DIVIDER_GRADIENT_PATTERNS[idx] || DIVIDER_GRADIENT_PATTERNS[0];
        spec.stops = pat.stops.map(s => ({ pos: s.pos, color: s.color === null ? color : s.color }));
      }
    }
    return spec;
  }
}
export class shutterCfg {

  #cfg={};
  #coverEntity=null;
  #localize={};
  subEntity={};
  #group=null;
  #id=null;
  #targetEntities=null;   // v1.7.0: fan-out targets for the aggregate "All" control
  #isAggregate=false;
  enhancedShutter=null;

  constructor(hass,escConfig)
  {
    let entityId = this.entityId(escConfig[C.CONFIG_ENTITY_ID] ? escConfig[C.CONFIG_ENTITY_ID] : escConfig);

    this.hass = hass;

    this.#group=escConfig[C.CONFIG_GROUP];
    this.#id=escConfig[C.CONFIG_ID];

    this.#setLocalize(hass.localize);
    this.setCoverEntity(hass,entityId);

    this.showGroupMembers(escConfig[C.CONFIG_SHOW_GROUP_MEMBERS]);

    this.imageMap(escConfig[C.CONFIG_IMAGE_MAP]);

    this.windowImage(escConfig[C.CONFIG_WINDOW_IMAGE]);
    this.viewImage(escConfig[C.CONFIG_VIEW_IMAGE]);
    this.shutterSlatImage(escConfig[C.CONFIG_SHUTTER_SLAT_IMAGE]);
    this.shutterBottomImage(escConfig[C.CONFIG_SHUTTER_BOTTOM_IMAGE]);
    this.coverVisual(escConfig[C.CONFIG_COVER_VISUAL]);
    this.modernStyle(escConfig[C.CONFIG_MODERN_STYLE]);
    this.modernValuePos(escConfig[C.CONFIG_MODERN_VALUE_POS]);
    this.positionPlacement(escConfig[C.CONFIG_POSITION_PLACEMENT]);
    this.panelPosShow(escConfig[C.CONFIG_PANEL_POS_SHOW]);
    this.panelPosSize(escConfig[C.CONFIG_PANEL_POS_SIZE]);
    this.panelPosWeight(escConfig[C.CONFIG_PANEL_POS_WEIGHT]);
    this.panelPosColor(escConfig[C.CONFIG_PANEL_POS_COLOR]);
    this.panelPosEnd(escConfig[C.CONFIG_PANEL_POS_END]);
    this.modernTravel(escConfig[C.CONFIG_MODERN_TRAVEL]);
    this.modernSecondEntity(escConfig[C.CONFIG_MODERN_SECOND_ENTITY]);

    this.batteryEntityId(escConfig[C.CONFIG_BATTERY_ENTITY_ID]);
    this.signalEntityId(escConfig[C.CONFIG_SIGNAL_ENTITY_ID]);

    this.subEntity[C.DEVICE_CLASS_BATTERY] = new haSubEntity(hass,C.DEVICE_CLASS_BATTERY,this.batteryEntityId());
    this.subEntity[C.DEVICE_CLASS_SIGNAL]  = new haSubEntity(hass,C.DEVICE_CLASS_SIGNAL,this.signalEntityId());
    this.debug(!!escConfig[C.CONFIG_DEBUG]);

    const explicitName = escConfig[C.CONFIG_NAME];
    let resolvedName = explicitName || this.getCoverEntity()?.getFriendlyName() || C.UNKNOWN;
    if (!explicitName) {
      if (escConfig[C.CONFIG_NAME_STRIP_AREA] && escConfig[C.CONFIG_AREA_NAME_KEY]) {
        resolvedName = this.#stripArea(resolvedName, escConfig[C.CONFIG_AREA_NAME_KEY]);
      }
      if (escConfig[C.CONFIG_CLEAN_NAMES]) {
        resolvedName = this.#cleanName(resolvedName, escConfig);
      }
    }
    this.friendlyName(resolvedName);

    this.supportedFeatures(escConfig[C.CONFIG_SUPPORTED_FEATURES]);
    this.invertPercentageCover(escConfig[C.CONFIG_INVERT_PCT_COVER]);
    this.invertPercentageUi(escConfig[C.CONFIG_INVERT_PCT_UI]);
    this.invertPercentageTiltCover(escConfig[C.CONFIG_INVERT_PCT_TILT_COVER]);
    this.invertPercentageTiltUi(escConfig[C.CONFIG_INVERT_PCT_TILT_UI]);
    this.invertOpenCloseUi(escConfig[C.CONFIG_INVERT_OPEN_CLOSE_UI]);
    this.invertOpenCloseCover(escConfig[C.CONFIG_INVERT_OPEN_CLOSE_COVER]);
    this.passiveMode(escConfig[C.CONFIG_PASSIVE_MODE]);

    this.unrollUnfoldDirection(escConfig[C.CONFIG_CLOSING_DIRECTION]);

    let base_height_px = escConfig[C.CONFIG_BASE_HEIGHT_PX];
    let resize_height_pct = escConfig[C.CONFIG_RESIZE_HEIGHT_PCT];
    this.windowHeightPx(Math.round(boundary(resize_height_pct,C.ESC_MIN_RESIZE_HEIGHT_PCT,C.ESC_MAX_RESIZE_HEIGHT_PCT) / 100 * base_height_px));

    let base_width_px  = escConfig[C.CONFIG_BASE_WIDTH_PX];
    let resize_width_pct  = escConfig[C.CONFIG_RESIZE_WIDTH_PCT];
    this.windowWidthPx(Math.round(boundary(resize_width_pct, C.ESC_MIN_RESIZE_WIDTH_PCT ,C.ESC_MAX_RESIZE_WIDTH_PCT)  / 100 * base_width_px));

    this.rotateSlatsImage(escConfig[C.CONFIG_ROTATE_SLATS_SHUTTER_IMAGE]);
    this.stretchEdgeImage(escConfig[C.CONFIG_STRETCH_EDGE_SHUTTER_IMAGE]);

    this.scaleButtons(escConfig[C.CONFIG_SCALE_BUTTONS]);
    this.scaleIcons(escConfig[C.CONFIG_SCALE_ICONS]);
    this.scaleTexts(escConfig[C.CONFIG_SCALE_TEXTS]);

    this.partial(boundary(escConfig[C.CONFIG_PARTIAL_CLOSE_PCT]));
    this.offset(boundary(escConfig[C.CONFIG_OFFSET_IS_CLOSED_PCT]));

    this.offsetOpenedPct(boundary(escConfig[C.CONFIG_OFFSET_OPENED_PCT]));
    this.offsetClosedPct(boundary(escConfig[C.CONFIG_OFFSET_CLOSED_PCT]));

    //this.showTilt(!!escConfig[C.CONFIG_SHOW_TILT]);

    this.tiltAngleMin(escConfig[C.CONFIG_TILT_ANGLE_MIN]);
    this.tiltAngleMax(escConfig[C.CONFIG_TILT_ANGLE_MAX]);

    this.defButtonPosition(escConfig);

    this.namePosition(escConfig[C.CONFIG_NAME_POSITION]);

    this.iconsPosition(escConfig[C.CONFIG_ICONS_POSITION]);

    this.openingPosition(escConfig[C.CONFIG_OPENING_POSITION]);

    this.inlineHeader(escConfig[C.CONFIG_INLINE_HEADER]);
    this.headerAlign(escConfig[C.CONFIG_HEADER_ALIGN]);
    this.headerOrder(escConfig[C.CONFIG_HEADER_ORDER]);
    this.headerGap(escConfig[C.CONFIG_HEADER_GAP]);

    this.alwaysPercentage(!!escConfig[C.CONFIG_ALWAYS_PCT]);
    this.disableEndButtons(!!escConfig[C.CONFIG_DISABLE_END_BUTTONS]);
    this.pickerOverlapPx(C.ESC_PICKER_OVERLAP_PX);

    this.showName(escConfig[C.CONFIG_SHOW_NAME]);
    this.showOpening(escConfig[C.CONFIG_SHOW_OPENING]);
    this.showTiltButtonBlock(escConfig[C.CONFIG_SHOW_TILT_BUTTONS]);
    this.showStandardButtons(escConfig[C.CONFIG_SHOW_STANDARD_BUTTONS]);
    this.showPartialOpenButtons(escConfig[C.CONFIG_SHOW_PARTIAL_OPEN_BUTTONS]);
    this.partialButtonsStyle(escConfig[C.CONFIG_PARTIAL_BUTTONS_STYLE]);
    this.positionPresets(escConfig[C.CONFIG_POSITION_PRESETS]);
    this.coverOrder(escConfig[C.CONFIG_COVER_ORDER]);
    this.standardPosition(escConfig[C.CONFIG_STANDARD_POSITION]);
    this.sliderPosition(escConfig[C.CONFIG_SLIDER_POSITION]);
    this.tiltPosition(escConfig[C.CONFIG_TILT_POSITION]);
    this.presetsPosition(escConfig[C.CONFIG_PRESETS_POSITION]);
    this.standardOrientation(escConfig[C.CONFIG_STANDARD_ORIENTATION]);
    this.presetsOrientation(escConfig[C.CONFIG_PRESETS_ORIENTATION]);

    this.showTiltSliderBlock(escConfig[C.CONFIG_SHOW_TILT_SLIDER]);
    this.showOpenCloseSliderBlock(escConfig[C.CONFIG_SHOW_OPEN_CLOSE_SLIDER]);
    this.showWindow(escConfig[C.CONFIG_SHOW_WINDOW]);

    this.showBattery(escConfig[C.CONFIG_SHOW_BATTERY]);
    this.showSignal(escConfig[C.CONFIG_SHOW_SIGNAL]);
    this.batteryAlign(escConfig[C.CONFIG_BATTERY_ALIGN]);
    this.signalAlign(escConfig[C.CONFIG_SIGNAL_ALIGN]);
    this.batteryPosition(escConfig[C.CONFIG_BATTERY_POSITION]);
    this.signalPosition(escConfig[C.CONFIG_SIGNAL_POSITION]);

    this.nameTextSize(escConfig[C.CONFIG_NAME_TEXT_SIZE]);
    this.nameTextWeight(escConfig[C.CONFIG_NAME_TEXT_WEIGHT]);
    this.nameTextColor(escConfig[C.CONFIG_NAME_TEXT_COLOR]);
    this.positionTextSize(escConfig[C.CONFIG_POSITION_TEXT_SIZE]);
    this.positionTextColor(escConfig[C.CONFIG_POSITION_TEXT_COLOR]);
    this.positionTextWeight(escConfig[C.CONFIG_POSITION_TEXT_WEIGHT]);
    this.positionBackground(escConfig[C.CONFIG_POSITION_BACKGROUND]);
    this.controlsGap(escConfig[C.CONFIG_CONTROLS_GAP]);
    this.headerImageGap(escConfig[C.CONFIG_HEADER_IMAGE_GAP]);
    this.controlButtonPadding(escConfig[C.CONFIG_CONTROLS_BUTTON_PAD]);
    this.controlButtonMargin(escConfig[C.CONFIG_CONTROLS_BUTTON_MARGIN]);
    [C.CONFIG_CONTROL_ICON_COLOR, C.CONFIG_ICON_UP, C.CONFIG_ICON_DOWN, C.CONFIG_ICON_STOP, C.CONFIG_ICON_PARTIAL,
     C.CONFIG_ICON_TILT_UP, C.CONFIG_ICON_TILT_DOWN, C.CONFIG_PCT_ICON_COLOR, C.CONFIG_PCT_BUTTON_BG,
     C.CONFIG_PCT_BUTTON_BORDER, C.CONFIG_PCT_BUTTON_COLOR, C.CONFIG_PCT_BUTTON_WEIGHT, C.CONFIG_PCT_BUTTON_SIZE,
     C.CONFIG_PCT_BUTTON_STYLE]
      .forEach(k => { if (escConfig[k] !== undefined) this.#cfg[k] = escConfig[k]; });

    this.buttonStopHideStates(escConfig[C.CONFIG_BUTTON_STOP_HIDE_STATES]  ? escConfig[C.CONFIG_BUTTON_STOP_HIDE_STATES] : C.ESC_BUTTON_STOP_HIDE_STATES);
    this.buttonOpenHideStates(escConfig[C.CONFIG_BUTTON_OPENED_HIDE_STATES]  ? escConfig[C.CONFIG_BUTTON_OPENED_HIDE_STATES] : C.ESC_BUTTON_OPENED_HIDE_STATES);
    this.buttonCloseHideStates(escConfig[C.CONFIG_BUTTON_CLOSED_HIDE_STATES]  ? escConfig[C.CONFIG_BUTTON_CLOSED_HIDE_STATES] : C.ESC_BUTTON_CLOSED_HIDE_STATES);

    Object.preventExtensions(this);
  }

  /*
   ** getters/setters
   */
  #getCfg(key,value= null){
    if (value!== null && this.#cfg[key]!=value){
      this.#cfg[key]= value;
    }
    return this.#cfg[key];
  }
  isCoverFeatureActive(feature=C.ESC_FEATURE_ALL){
    const features =(this.getCoverEntity()?.getSupportedFeatures() ?? C.ESC_FEATURE_NO_TILT) & feature & this.supportedFeatures();
    return Boolean(features);
  }
  #setLocalize(localize){
    this.#localize=localize;
  }
  getLocalize(text){
    return this.#localize(text);
  }
  setCoverEntity(hass,entityId){
    this.#coverEntity = entityId ? new haEntity(hass,entityId) : null;
  }
  updateCoverEntity(haEntity){
    this.#coverEntity = haEntity;
  }
  getCoverEntity(){
    return this.#coverEntity;
  }
  getCoverState(haEntity=this.getCoverEntity()){
     let coverState = `${haEntity.getState()}-${haEntity.getCurrentPosition()}-${haEntity.getCurrentTiltPosition()}`;
     return coverState;
  }
  getState(haEntity){
     const state = C.NOT_KNOWN.includes(haEntity?.getState()) ? C.UNAVAILABLE : haEntity.getState();
     return state;
  }
  getBatteryEntity(){
    const entity = this.subEntity[C.DEVICE_CLASS_BATTERY].entity;
    return entity;
  }
  // Get SignalInfo
  getSignalEntity(){
    const entity = this.subEntity[C.DEVICE_CLASS_SIGNAL].entity;
    return entity;
  }
  showBattery(value = null){ return this.#getCfg(C.CONFIG_SHOW_BATTERY, value); }
  showSignal(value = null){ return this.#getCfg(C.CONFIG_SHOW_SIGNAL, value); }
  batteryAlign(value = null){ return this.#getCfg(C.CONFIG_BATTERY_ALIGN, value); }
  signalAlign(value = null){ return this.#getCfg(C.CONFIG_SIGNAL_ALIGN, value); }
  batteryPosition(value = null){ return this.#getCfg(C.CONFIG_BATTERY_POSITION, value); }
  signalPosition(value = null){ return this.#getCfg(C.CONFIG_SIGNAL_POSITION, value); }
  batteryPositionEff(){ return this.batteryPosition() || this.iconsPosition(); }
  signalPositionEff(){ return this.signalPosition() || this.iconsPosition(); }
  batteryIconActive(){ return this.showBattery() && !!this.getBatteryEntity(); }
  signalIconActive(){ return this.showSignal() && !!this.getSignalEntity(); }
  getIconsActive(){
    return (this.batteryIconActive() || this.signalIconActive()) ? true : false;
  }

  batteryLevel(){
    let state = this.subEntity[C.DEVICE_CLASS_BATTERY].entity?.getState() ?? C.UNAVAILABLE;
    state = parseFloat(state).toFixed(C.DISPLAY_DECIMALS);
    return C.NOT_KNOWN.includes (state) ? '?' : state ;
  }
  signalLevel(){
    let state = this.subEntity[C.DEVICE_CLASS_SIGNAL].entity?.getState() ?? C.UNAVAILABLE;
    state = parseFloat(state).toFixed(C.DISPLAY_DECIMALS);
    return  C.  NOT_KNOWN.includes (state) ? '?' : state ;
  }
  batteryUnit(){
    let unit = this.subEntity[C.DEVICE_CLASS_BATTERY].entity?.getUnitOfMeasurement() ?? C.UNAVAILABLE;
    return C.NOT_KNOWN.includes (unit) ? '?' : unit ;
  }
  signalUnit(){
    let unit = this.subEntity[C.DEVICE_CLASS_SIGNAL].entity?.getUnitOfMeasurement() ?? C.UNAVAILABLE;
    return C.NOT_KNOWN.includes (unit) ? '?' : unit ;
  }

  rotateOrtho(coord,angle=this.getCloseAngle()){
    switch (angle){
      case (90):
        return new xyPair(-coord.y(),coord.x() );
      case (180):
        return new xyPair(-coord.x(),-coord.y());
      case (270):
        return new xyPair(coord.y(),-coord.x());
      case (360):
      case (0):
        return new xyPair(coord.x(),coord.y());
      default:
        throw new Error(`Angle must be a multiple of 90 degrees. (angle= ${angle})`);
    }
  }
  rotateBackOrtho(coord,angle=this.getCloseAngle()){
    switch (angle){
      case (90):
        return new xyPair(coord.y(),-coord.x());
      case (180):
        return new xyPair(-coord.x(),-coord.y());
      case (270):
        return new xyPair(-coord.y(),coord.x());
      case (360):
      case (0):
        return new xyPair(coord.x(),coord.y());
      default:
        throw new Error(`Angle must be a multiple of 90 degrees. (angle= ${angle})`);
    }
  }
  switchAxis(coord,angle=this.getCloseAngle()){
    switch (angle){
      case (90):
      case (270):
        return new xyPair(coord.y(),coord.x() );
      case (360):
      case (180):
      case (0):
        return new xyPair(coord.x(),coord.y() );
      default:
       throw new Error(`Angle must be a multiple of 90 degrees. (angle= ${angle})`);
    }
  }



  viewImageRotate(){
    let transform =this.transformRotate();
    return transform;
  }
  buttonRotate(){
    let r = this.getCloseAngle() % 180;
    let transform = this.transformRotate(r);
    return transform;
  }
  transformScalePicker(x = this.actualGlobalWidthPx(),y = this.actualGlobalHeightPx()){
    let transform =`${this.verticalMovement() ? '': `scale(${y/x},1)`}`;
    return transform;
  }
  transformScale(x = this.actualGlobalWidthPx(),y = this.actualGlobalHeightPx()){
    let transform =`${this.verticalMovement() ? '': `scale(${y/x},${x/y})`}`;
    return transform;
   }
  transformTranslate(x=this.actualGlobalWidthPx(),y=this.actualGlobalHeightPx()){
    let transform =`translate(${x}px,${y}px)`;
    return transform;
  }
  transformRotate(r = this.getCloseAngle()){
    let transform =`rotate(${r}deg)`;
    return transform;
  }

  showName(value = null){
    return this.#getCfg(C.CONFIG_SHOW_NAME,value);
  }
  showOpening(value = null){
    return this.#getCfg(C.CONFIG_SHOW_OPENING,value);
   }
  showTiltButtonBlock(value = null){
    return this.#getCfg(C.CONFIG_SHOW_TILT_BUTTONS,value);
  }
  showStandardButtons(value = null){
    return this.#getCfg(C.CONFIG_SHOW_STANDARD_BUTTONS,value);
  }
  showPartialOpenButtons(value = null){
    const show = this.#getCfg(C.CONFIG_SHOW_PARTIAL_OPEN_BUTTONS,value);
    return show && this.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION);
  }
  partialButtonsStyle(value = null){ return this.#getCfg(C.CONFIG_PARTIAL_BUTTONS_STYLE, value); }
  positionPresets(value = null){ return this.#getCfg(C.CONFIG_POSITION_PRESETS, value); }
  coverOrder(value = null){ return this.#getCfg(C.CONFIG_COVER_ORDER, value); }
  standardPosition(value = null){ return this.#getCfg(C.CONFIG_STANDARD_POSITION, value); }
  sliderPosition(value = null){ return this.#getCfg(C.CONFIG_SLIDER_POSITION, value); }
  tiltPosition(value = null){ return this.#getCfg(C.CONFIG_TILT_POSITION, value); }
  presetsPosition(value = null){ return this.#getCfg(C.CONFIG_PRESETS_POSITION, value); }
  standardOrientation(value = null){ return this.#getCfg(C.CONFIG_STANDARD_ORIENTATION, value); }
  presetsOrientation(value = null){ return this.#getCfg(C.CONFIG_PRESETS_ORIENTATION, value); }
  // inline flex-flow override for a button cluster; '' when auto (let CSS/zone decide)
  buttonFlexFlow(orientation){ return (orientation === 'row' || orientation === 'column') ? `flex-flow:${orientation};` : ''; }
  // Deterministic middle-segment order derived from per-control before/after-window positions.
  // Legacy cover_order (if set) still wins for back-compat.
  coverSegmentOrder(){
    const legacy = this.coverOrder();
    if (Array.isArray(legacy) && legacy.length){
      return [...legacy, ...C.COVER_ORDER_DEFAULT.filter(k => !legacy.includes(k))];
    }
    const before = [], after = [];
    ([[C.COVER_SEG_STANDARD, this.standardPosition()],
      [C.COVER_SEG_SLIDER, this.sliderPosition()],
      [C.COVER_SEG_TILT, this.tiltPosition()],
      [C.COVER_SEG_PRESETS, this.presetsPosition()]]
    ).forEach(([seg, pos]) => { (pos === 'before' ? before : after).push(seg); });
    return [...before, C.COVER_SEG_WINDOW, ...after];
  }

  showTiltSliderBlock(value = null){
    return this.#getCfg(C.CONFIG_SHOW_TILT_SLIDER,value);
  }
  showOpenCloseSliderBlock(value = null){
    return this.#getCfg(C.CONFIG_SHOW_OPEN_CLOSE_SLIDER,value);
  }
  showWindow(value = null){
    return this.#getCfg(C.CONFIG_SHOW_WINDOW,value);
  }
  coverVisual(value = null){ return this.#getCfg(C.CONFIG_COVER_VISUAL, value); }
  modernStyle(value = null){ return this.#getCfg(C.CONFIG_MODERN_STYLE, value); }
  modernValuePos(value = null){ return this.#getCfg(C.CONFIG_MODERN_VALUE_POS, value); }
  positionPlacement(value = null){ return this.#getCfg(C.CONFIG_POSITION_PLACEMENT, value); }
  panelPosShow(value = null){ return this.#getCfg(C.CONFIG_PANEL_POS_SHOW, value); }
  panelPosSize(value = null){ return this.#getCfg(C.CONFIG_PANEL_POS_SIZE, value); }
  panelPosWeight(value = null){ return this.#getCfg(C.CONFIG_PANEL_POS_WEIGHT, value); }
  panelPosColor(value = null){ return this.#getCfg(C.CONFIG_PANEL_POS_COLOR, value); }
  panelPosEnd(value = null){ return this.#getCfg(C.CONFIG_PANEL_POS_END, value); }
  // the PANEL Position Value placement (only when panelPosShow); legacy modern_value_position seeds it
  effectivePositionPlacement(){
    if (this.panelPosShow() !== true) return 'default';
    const p = this.positionPlacement();
    return (p && p !== 'default') ? p : 'bottom';
  }
  // inline text style for the panel position value element
  panelPosStyle(){
    const parts = [];
    const sz = Number(this.panelPosSize()); if (sz > 0) parts.push(`font-size:${sz}px`);
    const w = this.panelPosWeight(); if (w) parts.push(`font-weight:${w}`);
    const c = this.panelPosColor(); if (c) parts.push(`color:${c}`);
    return parts.length ? parts.join(';') + ';' : '';
  }
  modernTravel(value = null){ return this.#getCfg(C.CONFIG_MODERN_TRAVEL, value); }
  modernSecondEntity(value = null){ return this.#getCfg(C.CONFIG_MODERN_SECOND_ENTITY, value); }
  isModern(){ return this.coverVisual() === 'modern'; }


  buttonsPosition(value = null){
    return this.#getCfg(C.CONFIG_BUTTONS_POSITION,value);
  }
  supportedFeatures(value = null){
    return this.#getCfg(C.CONFIG_SUPPORTED_FEATURES,value);
  }
  disableEndButtons(value = null){
    return this.#getCfg(C.CONFIG_DISABLE_END_BUTTONS,value);
  }
  entityId(value = null){
    return this.#getCfg(C.CONFIG_ENTITY_ID,value);
  }
  batteryEntityId(value = null){
    return this.#getCfg(C.CONFIG_BATTERY_ENTITY_ID,value);
  }
  signalEntityId(value = null){
    return this.#getCfg(C.CONFIG_SIGNAL_ENTITY_ID,value);
  }

  getImage(imageType){
    let image;
    switch (imageType){
      case C.CONFIG_WINDOW_IMAGE:
        image = this.windowImage();
        break;
      case C.CONFIG_VIEW_IMAGE:
        image = this.viewImage();
        break;
      case C.CONFIG_SHUTTER_SLAT_IMAGE:
        image = this.shutterSlatImage();
        break;
      case C.CONFIG_SHUTTER_BOTTOM_IMAGE:
        image = this.shutterBottomImage();
        break;
      default:
        throw new Error(`Unknown imageType: ${imageType}`);
    }
    return image;
  }
  group(){
    return this.#group

  }
  id(){
    return this.#id;
  }
  // v1.7.0: mark this cfg as the per-area/label aggregate and point it at its members
  setAggregate(entityIds, aggregateEntity=null){
    this.#isAggregate = true;
    this.#targetEntities = Array.isArray(entityIds) ? entityIds : [entityIds];
    if (aggregateEntity) this.updateCoverEntity(aggregateEntity);
  }
  isAggregate(){
    return this.#isAggregate;
  }
  // service targets: the member list for an aggregate, else this cover alone
  getTargetEntities(){
    if (this.#isAggregate && this.#targetEntities?.length) return this.#targetEntities;
    return [this.entityId()];
  }
  showGroupMembers(value = null){
    return this.#getCfg(C.CONFIG_SHOW_GROUP_MEMBERS,value);
  }
  imageMap(value = null){
    return this.#getCfg(C.CONFIG_IMAGE_MAP,value);
  }
  windowImage(value = null){
    return this.#getCfg(C.CONFIG_WINDOW_IMAGE,value);
  }
  viewImage(value = null){
    return this.#getCfg(C.CONFIG_VIEW_IMAGE,value);
  }
  shutterSlatImage(value = null){
    return this.#getCfg(C.CONFIG_SHUTTER_SLAT_IMAGE,value);
  }
  shutterBottomImage(value = null){
    return this.#getCfg(C.CONFIG_SHUTTER_BOTTOM_IMAGE,value);
  }

  friendlyName(value = null){
    return this.#getCfg(C.CONFIG_NAME,value);
  }
  // v1.11.0: font styles
  nameTextSize(value = null){ return this.#getCfg(C.CONFIG_NAME_TEXT_SIZE, value); }
  nameTextWeight(value = null){ return this.#getCfg(C.CONFIG_NAME_TEXT_WEIGHT, value); }
  nameTextColor(value = null){ return this.#getCfg(C.CONFIG_NAME_TEXT_COLOR, value); }
  positionTextSize(value = null){ return this.#getCfg(C.CONFIG_POSITION_TEXT_SIZE, value); }
  positionTextColor(value = null){ return this.#getCfg(C.CONFIG_POSITION_TEXT_COLOR, value); }
  positionTextWeight(value = null){ return this.#getCfg(C.CONFIG_POSITION_TEXT_WEIGHT, value); }
  positionBackground(value = null){ return this.#getCfg(C.CONFIG_POSITION_BACKGROUND, value); }
  controlsGap(value = null){ return this.#getCfg(C.CONFIG_CONTROLS_GAP, value); }
  headerImageGap(value = null){ return this.#getCfg(C.CONFIG_HEADER_IMAGE_GAP, value); }
  controlButtonPadding(value = null){ return this.#getCfg(C.CONFIG_CONTROLS_BUTTON_PAD, value); }
  controlButtonMargin(value = null){ return this.#getCfg(C.CONFIG_CONTROLS_BUTTON_MARGIN, value); }
  // visual box for up/stop/down: icon size + user padding (default 6 ≈ the built-in 36/24 box)
  controlButtonBoxPx(){
    const pad = Number(this.controlButtonPadding());
    return this.iconSize() + 2 * (Number.isFinite(pad) ? pad : 6);
  }
  // emit only the vars that are actually set, so unconfigured text keeps its default look
  fontStyleVars(){
    let out = '';
    const size = Number(this.nameTextSize());
    if (size > 0) out += `--esc-name-font-size:${size}px;`;
    const weight = this.nameTextWeight();
    if (weight) out += `--esc-name-font-weight:${weight};`;
    const color = this.nameTextColor();
    if (color) out += `--esc-name-color:${color};`;
    const psize = Number(this.positionTextSize());
    if (psize > 0) out += `--esc-position-font-size:${psize}px;`;
    const pcolor = this.positionTextColor();
    if (pcolor) out += `--esc-position-color:${pcolor};`;
    const pweight = this.positionTextWeight();
    if (pweight) out += `--esc-position-weight:${pweight};`;
    if (this.positionBackground()) out += `--esc-position-bg:var(--secondary-background-color);`;
    const cgap = Number(this.controlsGap());
    if (cgap > 0) out += `--esc-controls-gap:${cgap}px;`;
    const higap = Number(this.headerImageGap());
    if (higap > 0) out += `--esc-header-image-gap:${higap}px;`;
    const bmargin = Number(this.controlButtonMargin());
    if (bmargin > 0) out += `--esc-controls-btn-margin:${bmargin}px;`;
    const cic = this.controlIconColor(); if (cic) out += `--esc-control-icon-color:${cic};`;
    const pic = this.pctIconColor(); if (pic) out += `--esc-pct-icon-color:${pic};`;
    const pbg = this.pctButtonBg(); if (pbg) out += `--esc-pct-btn-bg:${pbg};`;
    const pbd = this.pctButtonBorder(); if (pbd) out += `--esc-pct-btn-border:${pbd};`;
    const pcbc = this.pctButtonColor(); if (pcbc) out += `--esc-pct-btn-color:${pcbc};`;
    const pbw = this.pctButtonWeight(); if (pbw) out += `--esc-pct-btn-weight:${pbw};`;
    const pbs = Number(this.pctButtonSize()); if (pbs > 0) out += `--esc-pct-btn-size:${pbs}px;`;
    return out;
  }
  controlIconColor(){ return this.#getCfg(C.CONFIG_CONTROL_ICON_COLOR); }
  iconUp(){ return this.#getCfg(C.CONFIG_ICON_UP); }
  iconDown(){ return this.#getCfg(C.CONFIG_ICON_DOWN); }
  iconStop(){ return this.#getCfg(C.CONFIG_ICON_STOP); }
  iconPartial(){ return this.#getCfg(C.CONFIG_ICON_PARTIAL); }
  iconTiltUp(){ return this.#getCfg(C.CONFIG_ICON_TILT_UP); }
  iconTiltDown(){ return this.#getCfg(C.CONFIG_ICON_TILT_DOWN); }
  pctIconColor(){ return this.#getCfg(C.CONFIG_PCT_ICON_COLOR); }
  pctButtonBg(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_BG); }
  pctButtonBorder(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_BORDER); }
  pctButtonColor(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_COLOR); }
  pctButtonWeight(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_WEIGHT); }
  pctButtonSize(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_SIZE); }
  pctButtonStyle(){ return this.#getCfg(C.CONFIG_PCT_BUTTON_STYLE); }
  // v1.33.0: remove the room/area name from a cover's friendly name
  #stripArea(name, area){
    if (!area) return name;
    const esc = String(area).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let out = String(name).replace(new RegExp(esc, 'ig'), ' ');
    out = out.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—:_]+|[\s\-–—:_]+$/g, '').trim();
    return out || String(name);
  }
  // v1.9.0: entity name cleaner — strip configured substrings, optional title-case
  #cleanName(name, escConfig){
    let out = String(name);
    const remove = escConfig[C.CONFIG_NAME_REMOVE];
    if (Array.isArray(remove)) {
      remove.forEach(term => {
        if (!term) return;
        const esc = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(esc, 'gi'), ' ');
      });
    }
    out = out.replace(/\s+/g, ' ').trim();
    if (escConfig[C.CONFIG_NAME_CAPITALIZE]) {
      out = out.replace(/\b\w/g, c => c.toUpperCase());
    }
    return out || String(name);
  }
  debug(value = null){
    return this.#getCfg(C.CONFIG_DEBUG,value);
  }
  invertPercentageUi(value = null){
    return this.#getCfg(C.CONFIG_INVERT_PCT_UI,value);
  }
  invertPercentageCover(value = null){
    return this.#getCfg(C.CONFIG_INVERT_PCT_COVER,value);
  }
  invertPercentageTiltUi(value = null){
    return this.#getCfg(C.CONFIG_INVERT_PCT_TILT_UI,value);
  }
  invertPercentageTiltCover(value = null){
    return this.#getCfg(C.CONFIG_INVERT_PCT_TILT_COVER,value);
  }
  invertOpenCloseUi(value = null){
    return this.#getCfg(C.CONFIG_INVERT_OPEN_CLOSE_UI,value);
  }
  invertOpenCloseCover(value = null){
    return this.#getCfg(C.CONFIG_INVERT_OPEN_CLOSE_COVER,value);
  }

  passiveMode(value = null){
    let mode = this.#getCfg(C.CONFIG_PASSIVE_MODE,value)
    if (value!== null && mode) console.warn('Passive mode, no action');
    return mode;
  }
  windowHeightPx(value = null){
    return this.#getCfg(C.CONFIG_HEIGHT_PX,value);
  }
  windowWidthPx(value = null){
    return this.#getCfg(C.CONFIG_WIDTH_PX,value);
  }
  partial(value = null){
    let partial = this.#getCfg(C.CONFIG_PARTIAL_CLOSE_PCT,value);
    if (partial == C.SHUTTER_OPEN_PCT ||  partial == C.SHUTTER_CLOSED_PCT) partial = 0;
    partial = this.invertPosition(partial);
    // only when cover can set position
    return this.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION) ? partial : 0;
  }
  offset(value = null){
    let offset = this.#getCfg(C.CONFIG_OFFSET_IS_CLOSED_PCT,value);
    if (offset == C.SHUTTER_OPEN_PCT ||  offset == C.SHUTTER_CLOSED_PCT) offset = 0;
    offset = this.invertPosition(offset);
    // only when cover can set position
    return this.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION) ? offset : 0;
  }
  partialActive(){
    return this.partial() !=C.SHUTTER_OPEN_PCT && this.partial() != C.SHUTTER_CLOSED_PCT;
  }
  offsetActive(){
    return this.offset() !=C.SHUTTER_OPEN_PCT && this.offset() != C.SHUTTER_CLOSED_PCT;
  }

  rotateSlatsImage(value = null){
    return this.#getCfg(C.CONFIG_ROTATE_SLATS_SHUTTER_IMAGE,value);
  }
  stretchEdgeImage(value = null){
    return this.#getCfg(C.CONFIG_STRETCH_EDGE_SHUTTER_IMAGE,value);
  }
  scaleButtons(value = null){
    return this.#getCfg(C.CONFIG_SCALE_BUTTONS,value);
  }
  scaleIcons(value = null){
    return this.#getCfg(C.CONFIG_SCALE_ICONS,value);
  }
  scaleTexts(value = null){
    return this.#getCfg(C.CONFIG_SCALE_TEXTS,value);
  }
  offsetOpenedPct(value = null){
    return this.#getCfg(C.CONFIG_OFFSET_OPENED_PCT,value);
  }
  offsetClosedPct(value = null){
    return this.#getCfg(C.CONFIG_OFFSET_CLOSED_PCT,value);
  }
  //showTilt(value=null){
  //  return (this.#getCfg(C.CONFIG_SHOW_TILT,value)) && this.canTilt()
 // }
  canTilt(){
    return this.isCoverFeatureActive(C.ESC_FEATURE_OPEN_TILT | C.ESC_FEATURE_CLOSE_TILT | C.ESC_FEATURE_SET_TILT_POSITION ) ;

  }
  tiltAngleMin(value = null){
    return this.#getCfg(C.CONFIG_TILT_ANGLE_MIN,value );
  }
  tiltAngleMax(value = null){
    return this.#getCfg(C.CONFIG_TILT_ANGLE_MAX,value );
  }


  unrollUnfoldDirection(value = null){
    return this.#getCfg(C.CONFIG_CLOSING_DIRECTION,value);
  }
  buttonStopHideStates(value = null){
    return this.#getCfg(C.CONFIG_BUTTON_STOP_HIDE_STATES,value);
  }
  buttonOpenCloseHideStates(upDown){
    upDown = this.applyInvertForButtonOpenCloseHideStates(upDown);
    if (upDown == C.UP) return this.buttonOpenHideStates();
    if (upDown == C.DOWN) return this.buttonCloseHideStates();
  }



  buttonOpenHideStates(value = null){
    return this.#getCfg(C.CONFIG_BUTTON_OPENED_HIDE_STATES,value);
  }

  buttonCloseHideStates(value = null){
    return this.#getCfg(C.CONFIG_BUTTON_CLOSED_HIDE_STATES,value);
  }

  namePosition(value = null){
    return this.#getCfg(C.CONFIG_NAME_POSITION,value);
  }
  inlineHeader(value = null){
    return this.#getCfg(C.CONFIG_INLINE_HEADER,value);
  }
  headerAlign(value = null){ return this.#getCfg(C.CONFIG_HEADER_ALIGN, value); }
  headerOrder(value = null){ return this.#getCfg(C.CONFIG_HEADER_ORDER, value); }
  headerGap(value = null){ return this.#getCfg(C.CONFIG_HEADER_GAP, value); }
  headerAlignCss(){ return C.HEADER_ALIGN_MAP[this.headerAlign()] || 'center'; }
  openingPosition(value = null){
    if (value !== null  && this.#getCfg(C.CONFIG_OPENING_POSITION,value) === null)
    {
      value = this.#getCfg(C.CONFIG_NAME_POSITION);
    }
    return this.#getCfg(C.CONFIG_OPENING_POSITION,value);
  }
  iconsPosition(value = null){
    return this.#getCfg(C.CONFIG_ICONS_POSITION,value);
  }
  alwaysPercentage(value = null){
    return this.#getCfg(C.CONFIG_ALWAYS_PCT,value);
  }
  pickerOverlapPx(value = null){
    return this.#getCfg(C.CONFIG_PICKER_OVERLAP_PX,value);
  }
  /*
  ** end getters/setters
  */
  verticalMovement(){
    return C.IS_VERTICAL.includes(this.unrollUnfoldDirection());
  }


  currentUiPosition(position = this.currentDevicePosition()){
    position = this.applyInvertToUiPosition(position);
    return position;
  }
  currentDevicePosition(){
    let position = this.currentBasePosition();
    position = this.applyInvertToPosition(position);
    return position;
  }
  currentBasePosition(){
    let position;
    if (this.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)){
      // known position
      position = this.getCoverEntity()?.getCurrentPosition() ?? 0;
    }else{
      // unknown position, so estimate from state
      position= this.getCoverEntity()?.getState()==C.SHUTTER_STATE_OPEN ? C.SHUTTER_OPEN_PCT :  C.SHUTTER_CLOSED_PCT;
    }
    return position;
  }

  currentUiTiltPosition(position = this.currentDeviceTiltPosition()){
    position = this.applyInvertToUiTiltPosition(position);
    return position;
  }
  currentDeviceTiltPosition(){
    let position = this.currentBaseTiltPosition();
    position = this.applyInvertToTiltPosition(position);
    return position;
  }
  currentBaseTiltPosition(){
    let position;
    if (this.canTilt()){
      // known position
      position = this.getCoverEntity()?.getCurrentTiltPosition() ?? null;
    }else{
      position= null;
    }
    return position;
  }

  applyInvertToPosition(position){
    if (this.invertPercentageCover()) position= this.invertPosition(position);
    return position;
  }
  applyInvertToTiltPosition(tiltPosition){
    if (this.invertPercentageTiltCover()) tiltPosition= this.invertPosition(tiltPosition);
    return tiltPosition;
  }
  applyInvertToUiPosition(position){
    if (this.invertPercentageUi()) position = this.invertPosition(position);
    return position;
  }
  applyInvertToUiTiltPosition(position){
    if (this.invertPercentageTiltUi()) position = this.invertPosition(position);
    return position;
  }
  invertPosition(position){
    position = 100-position;
    return position;
  }

  applyInvertForPositionToText(setting,debug=false){
    //setting = this.applyInvertOpenCloseUi(setting,debug);
    //setting = this.applyInvertOpenCloseCover(setting,debug);
    setting = this.applyInvertPercentageUi(setting,debug);
    setting = this.applyInvertPercentageCover(setting,debug);
    return setting;
  }
  applyInvertForOverlayDisplay(setting,debug=false){
    //setting = this.applyInvertOpenCloseUi(setting,debug);
    //setting = this.applyInvertOpenCloseCover(setting,debug);
    //setting = this.applyInvertPercentageUi(setting,debug);
    setting = this.applyInvertPercentageCover(setting,debug);
    return setting;
  }
applyInvertForShowButtonUpDownLabel(setting,debug=false){
    setting = this.applyInvertOpenCloseUi(setting,debug);
    setting = this.applyInvertDirection(setting,debug);
    return setting;
  }
  applyInvertForShowButtonUpDownClick(setting,debug){
    setting = this.applyInvertDirection(setting,debug);
    setting = this.applyInvertOpenCloseCover(setting,debug);
    return setting;
  }
  applyInvertForButtonOpenCloseHideStates(setting,debug=false){
    setting = this.applyInvertOpenCloseUi(setting,debug);
    setting = this.applyInvertDirection(setting,debug);
    return setting;
  }
  applyInvertNone(setting){
    return setting;
  }
  applyInvertOpenCloseAndPercentage(setting,debug=false){
    setting = this.applyInvertOpenCloseUi(setting,debug);
    setting = this.applyInvertPercentageCover(setting,debug);
    return setting;
  }
  applyInvertAll(setting,debug=false){
    setting = this.applyInvertOpenCloseUi(setting,debug);
    setting = this.applyInvertPercentageCover(setting,debug);
    setting = this.applyInvertDirection(setting,debug);
    setting = this.applyInvertOpenCloseCover(setting,debug);
    return setting;
  }

  applyInvertDirection(setting){
    if (this.#invertDirection()) setting = Object.keys(C.INVERT_OPEN_CLOSE_SETTING).includes(setting) ? C.INVERT_OPEN_CLOSE_SETTING[setting] : setting;
    return setting;
  }

  applyInvertOpenCloseUi(setting){
    if (this.invertOpenCloseUi()) setting = Object.keys(C.INVERT_OPEN_CLOSE_SETTING).includes(setting) ? C.INVERT_OPEN_CLOSE_SETTING[setting] : setting;
    return setting;
  }
  applyInvertOpenCloseCover(setting){
    if (this.invertOpenCloseCover()) setting = Object.keys(C.INVERT_OPEN_CLOSE_SETTING).includes(setting) ? C.INVERT_OPEN_CLOSE_SETTING[setting] : setting;
    return setting;
  }
  applyInvertPercentageCover(setting){
    if (this.invertPercentageCover()) setting = Object.keys(C.INVERT_OPEN_CLOSE_SETTING).includes(setting) ? C.INVERT_OPEN_CLOSE_SETTING[setting] : setting;
    return setting;
  }
  applyInvertPercentageUi(setting){
    if (this.invertPercentageUi()) setting = Object.keys(C.INVERT_OPEN_CLOSE_SETTING).includes(setting) ? C.INVERT_OPEN_CLOSE_SETTING[setting] : setting;
    return setting;
  }

  #invertDirection(){
    return this.unrollUnfoldDirection() == C.RIGHT || this.unrollUnfoldDirection() == C.UP;
  }

  getCloseAngle(){
    const direction= {
      [C.DOWN]:0,
      [C.LEFT]:90,
      [C.RIGHT]:270,
      [C.UP]:180
    };
    return direction[this.unrollUnfoldDirection()] || 0;
  }

  getOrientation(){
    return C.Globals.screenOrientation.value; // global variable !!
  }

  positionToState(position = this.currentDevicePosition()){
    // see for position and state definition:
    //  https://www.home-assistant.io/integrations/cover.template/#combining-value_template-and-position_template

    let state = this.getCoverEntity().getState() || C.UNAVAILABLE;
    let escState;
    if (state !== C.SHUTTER_STATE_OPENING && state !== C.SHUTTER_STATE_CLOSING) {
      //  shutter is not moving,
      if (position != C.SHUTTER_OPEN_PCT && position != C.SHUTTER_CLOSED_PCT){
        // shutter is not 0% or 100%
        escState= C.SHUTTER_STATE_PARTIAL_OPEN;
      }else{
        // shutter is 0% or 100%
        escState = position ? this.applyInvertOpenCloseUi(C.SHUTTER_STATE_OPEN) : this.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED);
      }
    }else  {
      //  shutter is moving,
      escState = this.applyInvertForPositionToText(state);
    }
    // solve issue #54
    if (position == this.applyInvertToPosition(C.SHUTTER_OPEN_PCT) && escState == (this.applyInvertOpenCloseAndPercentage(C.SHUTTER_STATE_OPENING))) {
      escState = this.applyInvertOpenCloseAndPercentage(C.SHUTTER_STATE_OPEN);

    }else if (position == this.applyInvertToPosition(C.SHUTTER_CLOSED_PCT) && escState== (this.applyInvertOpenCloseAndPercentage(C.SHUTTER_STATE_CLOSING))) {
      escState = this.applyInvertOpenCloseAndPercentage(C.SHUTTER_STATE_CLOSED);
    }
    return escState;
  }

  buttonsLeftActive(){
    if (this.showStandardButtons() || this.partialActive())
      return true;
    else
      return false;
  }

  buttonGroupInRow(){
    return this.getButtonsPosition() == C.LEFT || this.getButtonsPosition() == C.RIGHT;
  }
  buttonsContainerReversed(){
    return this.getButtonsPosition() == C.BOTTOM || this.getButtonsPosition() == C.RIGHT;
  }
  disabledGlobaly() {
    return false;
    // return (C.NOT_KNOWN.includes(this.getCoverEntity().getState()));
  }
  coverButtonUpDisabled(){
    let disabled = false;
    if (this.disableEndButtons()) {
      if (this.coverIsClosed()) {
        disabled = false;
      } else if (this.coverIsOpen()) {
        disabled = true;
      }
    }
    return disabled;
  }
  coverButtonDownDisabled(){
    let disabled = false;
    if (this.disableEndButtons()) {
      if (this.coverIsClosed()) {
        disabled = true;
      } else if (this.coverIsOpen()) {
        disabled = false;
      }
    }
    return disabled;
  }
  coverButtonDisabled(upDown) {
    const isUp = upDown === C.UP;
    const isDown = upDown === C.DOWN;
    const inverted = this.#invertDirection();

    if (isUp) {
      return inverted ? this.coverButtonDownDisabled() : this.coverButtonUpDisabled();
    }
    if (isDown) {
      return inverted ? this.coverButtonUpDisabled() : this.coverButtonDownDisabled();
    }
    return false;
  }


  getButtonsPosition() {
    let position = this.buttonsPosition();
    if (position.startsWith(C.AUTO)) {
      const isLandscape = this.getOrientation() === C.LANDSCAPE ;
      const isTopOrLeft = position === C.AUTO || position === C.AUTO_TL || position === C.AUTO_BL;
      position = isLandscape ? (isTopOrLeft ? C.LEFT : C.RIGHT) : (isTopOrLeft ? C.TOP : C.BOTTOM);
    }
    return position;
  }

  defButtonPosition(config) {
    const buttonsPosition = config[C.CONFIG_BUTTONS_POSITION]?.toLowerCase();
    this.buttonsPosition(C.POSITIONS.includes(buttonsPosition) ? buttonsPosition : C.ESC_BUTTONS_POSITION);
  }

  positionToText(position){
    let text;
    if (this.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)) {
      // position support
      if (typeof position === 'number') {
        if (this.alwaysPercentage()) {
          text = position + '%';

        }else{
          const UiPosition = this.applyInvertToUiPosition(position)
          let state= this.positionToState(UiPosition);
//          if (!this.debug()){
            if (state != C.SHUTTER_STATE_PARTIAL_OPEN){
              text = this.getLocalize(C.LOCALIZE_TEXT[(state)]);
            } else{
              text = position.toFixed(C.DISPLAY_DECIMALS) + '%';
            }
//          }else{
//            text = `Dev: ${this.getCoverEntity().getState()} (${this.currentDevicePosition()}%)\nCard: ${state} (${position}%)`;
//          }
        }
      } else {
        text = this.getLocalize(C.LOCALIZE_TEXT[C.UNAVAILABLE]);
      }
    }else{
      // no position support, so only open/closed
      if (this.applyInvertToPosition(position) > 50 ) {
        text = this.getLocalize(C.LOCALIZE_TEXT[this.applyInvertForPositionToText(C.SHUTTER_STATE_OPEN)]);
      } else {
        text = this.getLocalize(C.LOCALIZE_TEXT[this.applyInvertForPositionToText(C.SHUTTER_STATE_CLOSED)]);
      }
    }
    return text;
  }
  computePositionText(position,tiltPosition){
    let positionText;
    if (C.NOT_KNOWN.includes(this.getCoverEntity().getState())){
      positionText = this.getLocalize(C.LOCALIZE_TEXT[C.UNAVAILABLE]);
    }else{
      let displayPosition = this.visiblePosition(position);
      displayPosition = this.currentUiPosition(displayPosition);
      positionText = this.positionToText(displayPosition);
      if (this.offsetActive()) {
        positionText += ` (${this.currentUiPosition(position).toFixed(C.DISPLAY_DECIMALS)}%)`;
      }
      if (this.canTilt()) {
        tiltPosition = this.currentUiTiltPosition(tiltPosition).toFixed(C.DISPLAY_DECIMALS);
        positionText += ` / Tilt: ${tiltPosition}%`;
      }
    }
    return positionText;
  }
  visiblePosition(currentDevicePosition) {
    // compute visible position from current position and offset
    let visiblePosition;
    //const offset =this.offset();
    visiblePosition = this.calcVisualOffset(currentDevicePosition)
    return visiblePosition;
  }

  calcOffset(pct){
    let pct2;
    if (this.offsetActive()){
      pct2 =  Math.round(100 -  this.invertPosition(pct) * this.offset() / 100 );
      return pct2;
    }else{
      return pct;
    }
  }
  calcVisualOffset(pct){
    let pct2;
    if (this.offsetActive()) {
      pct2 = Math.max(0, Math.round((pct - this.invertPosition(this.offset())) * 100 / this.offset() ));
      return pct2;
    }else{
      return pct;
    }
  }
  coverIsOpen(){
    return (this.currentDevicePosition() == C.SHUTTER_OPEN_PCT);
  }
  coverIsClosed(){
    return (this.currentDevicePosition() == C.SHUTTER_CLOSED_PCT);
  }
  iconScaleFactor(){
    let scale_setting = this.scaleIcons();
    let scale = 1.0;
    switch(typeof(scale_setting)){
      case 'boolean':
        scale = scale_setting ? Math.min(this.windowWidthPx()/C.ESC_BASE_WIDTH_PX*1.25,1) : 1;
        break;
      case 'number':
        scale = boundary(scale_setting,0.1,2);
        break;
    }
    return scale;
  }
  textScaleFactor(){
    let scale_setting = this.scaleTexts();
    let scale = 1.0;
    switch(typeof(scale_setting)){
      case 'boolean':
        scale = scale_setting ? this.windowWidthPx()/C.ESC_BASE_WIDTH_PX : scale;
        break;
      case 'number':
        scale = boundary(scale_setting,0.1,2);
        break;
    }
    return scale;
  }
  iconScalePercent(){
    return Math.round(this.iconScaleFactor()*100)+'%';
  }

  iconButtonSize(){
    let size = C.ICON_BUTTON_SIZE;

    let scale_setting = this.scaleButtons();
    switch(typeof(scale_setting)){
      case 'boolean':
        if (scale_setting){
          let px;
          if (this.buttonGroupInRow()){
            px = this.windowHeightPx();
          }else{
            px = this.windowWidthPx();
          }
          size = Math.min(px/3.0,C.ICON_BUTTON_SIZE); // buttons fit in 1/3 of the size
        }
        break;
      case 'number':
        size = boundary(scale_setting,0.1,2)*C.ICON_BUTTON_SIZE;
        break;
    }
    return size;
  }
  buttonScaleFactor(){
    let scale=1;
    let scale_setting = this.scaleButtons();
    switch(typeof(scale_setting)){
      case 'boolean':
        if (scale_setting){
          let px;
          if (this.buttonGroupInRow()){
            px = this.windowHeightPx();
          }else{
            px = this.windowWidthPx();
          }
          scale = Math.min(px/3.0/C.ICON_BUTTON_SIZE,1);
        }
        break;
      case 'number':
        scale = boundary(scale_setting,0.1,2);
        break;
    }
    return scale;
  }
  iconSize(){
    let size = C.ICON_SIZE;

    let scale_setting = this.scaleButtons();
    switch(typeof(scale_setting)){
      case 'boolean':
        if (scale_setting){
          let px;
          if (this.buttonGroupInRow()){
            px = this.windowHeightPx();
          }else{
            px = this.windowWidthPx();
          }
          size = Math.min(px/(3.0*C.ICON_BUTTON_SIZE/C.ICON_SIZE),C.ICON_SIZE); // buttons fit in 1/3 of the size
        }
        break;
      case 'number':
        size = boundary(scale_setting,0.1,2)*C.ICON_SIZE;
        break;
    }
    return size;
  }
  iconSizeWifiBattery(){
    let size = C.ICON_SIZE;
    let scale_setting = this.scaleIcons();
    switch(typeof(scale_setting)){
      case 'boolean':
        if (scale_setting){
          let px = this.windowWidthPx();
          size = Math.min(px/6.0,C.ICON_SIZE);
        }
        break;
      case 'number':
        size = boundary(scale_setting,0.1,2)*C.ICON_SIZE;
        break;
    }
    return size;
  }
  batteryLevelText(){
    let level = this.batteryLevel();
    let unit = this.batteryUnit();
    return level+unit;
  }
  signalLevelText(){
    let level = this.signalLevel();
    let unit = this.signalUnit();
    return level+unit;
  }
  batteryLevelIcon(){

    let level = this.batteryLevel();
    let icon;
    let roundedLevel = Math.round(level / 10) * 10;
    roundedLevel = isNaN(roundedLevel) ? -1 : Math.min(roundedLevel,100);

    switch (roundedLevel) {
      case -1:
        icon = 'mdi:battery-off-outline'; // mdi:battery should have an alias of mdi:battery-100, doesn't work in current HASS
        break;
      case 100:
        icon = 'mdi:battery'; // mdi:battery should have an alias of mdi:battery-100, doesn't work in current HASS
        break;
      case 0:
        icon = 'mdi:battery-outline'; // mdi:battery-outline should have an alias of mdi:battery-0, doesn't work in current HASS
        break;
      default:
        icon = 'mdi:battery-' + roundedLevel;
    }
    return icon;
  }
  batteryIconColor(){
    let level = this.batteryLevel();
    let roundedLevel = Math.round(level / 20);
    roundedLevel = isNaN(roundedLevel) ? -1 : roundedLevel;
    return C.ICONCOLORS[roundedLevel];
  }
  signalIconColor(){
    let iconLevelIndex= this.signalLevelIndex();
    return C.ICONCOLORS[iconLevelIndex];
  }
  signalLevelIndex(){
    let level = this.signalLevel();
    let unit = this.signalUnit();
    if (unit != '?' && level != '?'){
      const unitType ={
        'dB': {max: 100, min: 0},
        'dBm': {max: -40, min: -90},
        'lqi': {max: 255, min: 0}, // from Z2M values are 0-255 ??
        '%': {max: 100, min: 0},
        '?': {max: 100, min: 0}
      };
      let delta= unitType[unit].max-unitType[unit].min;
      let levelPercentage = (level-unitType[unit].min) / delta * 100;
      let levelIndex =Math.round(levelPercentage / 20);

      return levelIndex;
    }
    return -1;
  }
  signalLevelIcon(){
    let unit = this.signalUnit();
    let icon = 'mdi:wifi-strength-off-outline';
    if (unit != '?'){
      const iconStrength = {
        99: "alert-outline",
        0: "off-outline",
        1: "outline",
        2: "1",
        3: "2",
        4: "3",
        5: "4",
      };
      let iconLevelIndex= this.signalLevelIndex();
      icon = 'mdi:wifi-strength-'+iconStrength[iconLevelIndex];
    }
    return icon;
  }

}
export class htmlCard{
  constructor(enhancedShutterCard){
    this.enhancedShutterCard=enhancedShutterCard;
  }
  defStyleVarsCard(){
    const cardCfg = this.enhancedShutterCard.cardCfg;
    const gap = Number(cardCfg?.coverGap?.() || 0);
    const btnDir = cardCfg?.areaButtonsDir?.() === 'row' ? 'row' : 'column';
    const coversDir = cardCfg?.coversDirection?.() === 'column' ? 'column' : 'row';
    const btnCols = Number(cardCfg?.areaButtonsColumns?.() || 0);
    const covCols = Number(cardCfg?.coversColumns?.() || 0);
    const [pt, pr, pb, pl] = cardCfg?.coverPad?.() || [0, 0, 0, 0];
    return `
      --esc-card-flex-direction: ${this.enhancedShutterCard.getCardFlexDirection()};
      ${gap > 0 ? `--esc-cover-gap:${gap}px;` : ''}
      --esc-area-buttons-dir: ${btnDir};
      --esc-covers-dir: ${coversDir};
      ${btnCols > 0 ? `--esc-area-btn-cols:${btnCols};` : ''}
      ${covCols > 0 ? `--esc-covers-cols:${covCols};` : ''}
      ${(pt || pr || pb || pl) ? `--esc-cover-pad:${pt}px ${pr}px ${pb}px ${pl}px;` : ''}
    `;
  }
}

export class haEntity{
  #state;
  #attributes;
  //#lastChanged;
  //#lastUpdated;
  // #context;
  #entityId;
  constructor(hass,entityId)
  {
    let entityInfo = hass.states[entityId];
    if (typeof entityInfo !== "undefined") {
      this.#state = entityInfo.state;
      this.#attributes = entityInfo.attributes;
      //this.#lastChanged = entityInfo.last_changed;
      //this.#lastUpdated =  entityInfo.last_updated;
      //this.#context =  entityInfo.context;
      this.#entityId = entityInfo.entity_id;
    }else{
      console.warn('haEntity: Entity [', entityId, '] not found');
      this.#state = C.UNAVAILABLE;
      this.#attributes = C.UNAVAILABLE;
      this.#entityId = entityId || C.UNAVAILABLE;
      //this.#lastChanged = C.UNAVAILABLE;
      //this.#lastUpdated = C.UNAVAILABLE;
      //this.#context = C.UNAVAILABLE;
    }
  };

  getState(){
    return this.#state || C.UNAVAILABLE;
  }
  getAttributes(){
    return this.#attributes || C.UNAVAILABLE;
  }
  getEntityId(){
    return this.#entityId || C.UNAVAILABLE;
  }
  getCurrentPosition(){
    return this.getAttributes()?.current_position ?? null;
  }
  getCurrentTiltPosition(){
    return this.getAttributes()?.current_tilt_position ?? null;
  }
  getFriendlyName(){
    return this.getAttributes()?.friendly_name ?? C.UNAVAILABLE;
  }
  getSupportedFeatures(){
    return this.getAttributes()?.supported_features ?? null;
  }
  getUnitOfMeasurement(){
    return this.getAttributes()?.unit_of_measurement ?? C.UNAVAILABLE;
  }
  isGroup(){
    return this.getAttributes()?.entity_id !== undefined;
  }
}
// v1.7.0: synthetic cover entity that aggregates a set of covers (the "All" control).
// Duck-typed to haEntity's public interface; reads hass.states live so it stays fresh.
export class haAggregateEntity{
  constructor(hass, entityIds){
    this.hass = hass;
    this.entityIds = Array.isArray(entityIds) ? entityIds : [];
  }
  #liveStates(){
    return this.entityIds.map(id => this.hass?.states?.[id]).filter(Boolean);
  }
  #avg(getter){
    const vals = this.#liveStates().map(getter).filter(v => v !== null && v !== undefined && !isNaN(v));
    if (!vals.length) return null;
    return Math.round(vals.reduce((a,b) => a + Number(b), 0) / vals.length);
  }
  getEntityId(){ return this.entityIds[0] || C.UNAVAILABLE; }
  getState(){
    const states = this.#liveStates().map(s => s.state);
    if (!states.length || states.every(s => C.NOT_KNOWN.includes(s))) return C.UNAVAILABLE;
    if (states.some(s => s === C.SHUTTER_STATE_OPENING)) return C.SHUTTER_STATE_OPENING;
    if (states.some(s => s === C.SHUTTER_STATE_CLOSING)) return C.SHUTTER_STATE_CLOSING;
    if (states.every(s => s === C.SHUTTER_STATE_CLOSED)) return C.SHUTTER_STATE_CLOSED;
    return C.SHUTTER_STATE_OPEN;
  }
  getCurrentPosition(){ return this.#avg(s => s.attributes?.current_position); }
  getCurrentTiltPosition(){ return this.#avg(s => s.attributes?.current_tilt_position); }
  getSupportedFeatures(){
    const features = this.#liveStates().reduce((acc,s) => acc | (s.attributes?.supported_features || 0), 0);
    return features || C.ESC_FEATURE_NO_TILT;
  }
  getAttributes(){
    return {
      current_position: this.getCurrentPosition(),
      current_tilt_position: this.getCurrentTiltPosition(),
      supported_features: this.getSupportedFeatures(),
      device_class: this.#liveStates()[0]?.attributes?.device_class,
    };
  }
  getFriendlyName(){ return C.ESC_ALL_LABEL; }
  getUnitOfMeasurement(){ return C.UNAVAILABLE; }
  isGroup(){ return false; }
}
export class MessageManager {
  constructor() {
    this.messageGroup = {};
  }

  // Add a message with subject
  addMessage(text, type= 'warning',subject = 'General') {
    const message = new Message(text, type, subject);
    if (!this.messageGroup[subject]) {
      this.messageGroup[subject] = { messages: []};
    }
    this.messageGroup[subject].messages.push(message);
    if (type == 'warning' || type == 'error'){
      console.warn(`${C.CARD_DISPLAY_NAME} (${subject}): "${message.text}"`);
//    }else{
//      console.info(`${C.CARD_DISPLAY_NAME} (${subject}): "${message.text}"`);
    }
  }

  // Display messages grouped by subject
  displayMessages() {
    let display= [];
    for (const subject in this.messageGroup) {
      const messages = this.messageGroup[subject].messages;

      if (messages.length > 0) {
        messages.forEach((message) => {
          //display.push (html`${message}`);
          display.push (message);
        });
      }
    }
    return html`${display.map(item => html`<ha-alert alert-type="${item.severity}">${item.text}</ha-alert>`)}`;
  }
  displayGroupMessages(subject) {
    let display= [];
    const messages = this.messageGroup[subject]?.messages ?? [];

    if (messages.length > 0) {
      messages.forEach((message) => {
          //display.push (html`${message}`);
          display.push (message);
      });
    }
    return html`${display.map(item => html`<ha-alert alert-type="${item.severity}">${item.text}</ha-alert>`)}`;
  }
  countMessages(){
    let counter=0;
    for (const subject in this.messageGroup) {
      counter += this.messageGroup[subject].messages.length;
    }
    return counter;
  }
}
export class Message {
  constructor(text, severity = C.HA_ALERT_INFO, subject = 'General') {
    this.text = text;
    this.severity = severity;
    this.subject = subject;
  }
}
export class haSubEntity{

  constructor(hass,type,entityId=false){
    this.hass= hass;
    this.type=type;
    this.entityId = entityId;
    //this.entity = this.set(entityId);
    this.set(entityId);
  }
  set(entityId){
    if (entityId && entityId !==C.AUTO){
      this.entity = new haEntity(this.hass,entityId);
      this.entityId=entityId;
    }
  }
  get(){
    return this.entity
  }
  update(haEntity){
    this.entity=haEntity;
  }
}
