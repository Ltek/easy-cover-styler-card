import {html} from './lit/lit-core.min.js';
import * as C from './constants.js';
import {htmlShutter} from './htmlShutter.js';
import {xyPair} from './xyPair.js';
import {classicArt} from './coverArt.js';
import {normalizeIcon} from './dividers.js';
import {resolveButtonAppearance, areaButtonStyle} from './buttonStyles.js';
import {resolveModernStyle, modernFillPaint, modernFillOpacity, modernTrackColor, modernBarGlow, modernHandleStyle} from './modernStyles.js';
import {
  getTextSize,
  console_log
} from './functions.js';


export class htmlBlock
{
  #xySize = new xyPair();
  #htmlString = ''

  constructor(shutter){
    //this.enhancedShutter=enhancedShutter;
    this.shutter =shutter;
    this.cfg=shutter.cfg;
    this.escImages= shutter.escImages ?? {};
    this.actualScreenPosition = shutter.actualScreenPosition;
    this.actualTiltPosition = shutter.actualTiltPosition;
    this.actualShutterPosition = shutter.actualShutterPosition;
    //console_log("====>>>",shutter.actualScreenPosition,shutter.actualTiltPosition,shutter.actualShutterPosition);
  }
  show(){
    if (!this.#htmlString) this.defineHtml();
    return this.#htmlString;
  }
  size(){
    if (!this.#xySize.size()) {
      this.defineSize()
      this.displaySize(this.#xySize);
    }else{
      this.displaySize(this.#xySize);
    }
    this.displaySize(this.#xySize);
    return this.#xySize;
  }
  displaySize(xy){
    console_log (this.constructor.name,xy.x(),xy.y());
  }
  defineSize(){
    this.setXySize(new xyPair(-1,-1));
  }
  setXySize(xy){
    this.#xySize = xy;
  }
  defineHtml(){
    this.setHtmlString(html``);
  }
  setHtmlString(htmlString){
    this.#htmlString = htmlString;
  }
  showTopBottomDiv(position){
    const batteryIconBlock = new htmlBlockBatteryIcon(this.shutter);
    const signalIconBlock = new htmlBlockSignalIcon(this.shutter);
    const nameAndStateBlock = new htmlBlockNameAndState(this.shutter);

    // v1.26.0: battery/signal each have their own row (top/bottom) and column (left/center/right)
    const batteryHere = this.cfg.batteryIconActive() && this.cfg.batteryPositionEff() === position;
    const signalHere = this.cfg.signalIconActive() && this.cfg.signalPositionEff() === position;
    const bAlign = this.cfg.batteryAlign();
    const sAlign = this.cfg.signalAlign();
    // v154: the name takes the left/centre/right cell chosen by name_align
    const nameCell = this.cfg.nameAlignCell();
    const cell = (align) => html`
      ${align === nameCell ? nameAndStateBlock.show(position) : ''}
      ${batteryHere && bAlign === align ? batteryIconBlock.show() : ''}
      ${signalHere && sAlign === align ? signalIconBlock.show() : ''}
    `;
    return html`
        <div class="${C.ESC_CLASS_TOP_BOTTOM}">
          <div class="${C.ESC_CLASS_ICON_CELL} ${C.ESC_CLASS_ICON_CELL}-left">${cell('left')}</div>
          <div class="${C.ESC_CLASS_ICON_CELL} ${C.ESC_CLASS_ICON_CELL}-center">${cell('center')}</div>
          <div class="${C.ESC_CLASS_ICON_CELL} ${C.ESC_CLASS_ICON_CELL}-right">${cell('right')}</div>
        </div>
    `;
  }
  sizeTopBottomDiv(position){
    const batteryIconBlock = new htmlBlockBatteryIcon(this.shutter);
    const signalIconBlock = new htmlBlockSignalIcon(this.shutter);
    const nameAndStateBlock = new htmlBlockNameAndState(this.shutter);

    let xyBattery = this.cfg.batteryIconActive() && this.cfg.batteryPositionEff() === position ? batteryIconBlock.size() : new xyPair();
    let xySignal  = this.cfg.signalIconActive() && this.cfg.signalPositionEff() === position ? signalIconBlock.size() : new xyPair();
    let xyNameAndState = nameAndStateBlock.size(position);

    let xy = this.gridAddHorizontal(xyBattery,xyNameAndState);
    xy = this.gridAddHorizontal(xy,xySignal);
    return xy;
  }
  gridAddVertical(size1,size2){ //  xyPair's
    return new xyPair (Math.max(size1.x(),size2.x()),size1.y()+size2.y())
  };
  gridAddHorizontal(size1,size2){ //  xyPair's
    return new xyPair(size1.x()+size2.x(),Math.max(size1.y(),size2.y()));
  }
  gridAddBoth(size1,size2){ //  xyPair's
    return new xyPair(size1.x()+size2.x(),size1.y()+size2.y());
  }
  sizeButton(){
    /*
    * size standard-buttons
    */
   let xy;
    if (this.cfg.showStandardButtons()) {
      const haButtonSize = this.cfg.iconButtonSize();
      xy = new xyPair(haButtonSize,haButtonSize);
    }else{
      xy = new xyPair();
    }
    return xy;
  }
  sizeIcon(){
    let xy= new xyPair(C.ICON_DIV_SIZE+2*C.ICON_MARGIN_LR,C.ICON_DIV_SIZE+2*C.ICON_MARGIN_TB);
    return xy;
  }
}
export class htmlBlockShutter extends htmlBlock{
  defineHtml(){
    const entityId = this.cfg.entityId();
    const htmlParts = new htmlShutter(this.shutter);
    const topBlock = new htmlBlockTop(this.shutter);
    const middleBlock = new htmlBlockMiddle(this.shutter);
    const bottomBlock = new htmlBlockBottom(this.shutter);

    // v2026.09.24.84 (Option A): rotate the panel content in place. The rotation lives INSIDE the
    // panel so the outer .esc-shutter box auto-sizes to the rotated content's swapped footprint —
    // sibling covers/containers then lay out around a correctly-sized panel (no overlap). CSS-only:
    // .ecs-rot gets writing-mode:vertical-* (swaps its layout box w<->h); .ecs-rot-inner resets
    // writing-mode and applies the visual 90° turn. See .ecs-rot rules in SHUTTER_CSS.
    const rotation = this.cfg.panelRotation ? this.cfg.panelRotation() : C.PANEL_ROTATION_NORMAL;
    const rotated = rotation === C.PANEL_ROTATION_LEFT || rotation === C.PANEL_ROTATION_RIGHT;
    const content = html`
      ${topBlock.show()}
      ${middleBlock.show()}
      ${bottomBlock.show()}
    `;
    const body = rotated
      ? html`<div class="ecs-rot" data-rotation=${rotation}><div class="ecs-rot-inner">${content}</div></div>`
      : content;

    this.setHtmlString(html`
      <div
        class=${C.ESC_CLASS_SHUTTER}
        data-shutter="${entityId}"
        style = "${htmlParts.defStyleVarsShutter()}"
      >
        ${body}
      </div>
    `);

  }
  defineSize(){
    const topBlock = new htmlBlockTop(this.shutter);
    const middleBlock = new htmlBlockMiddle(this.shutter);
    const bottomBlock = new htmlBlockBottom(this.shutter);

    let xyTopDiv = topBlock.size();
    let xyMiddleDiv = middleBlock.size();
    let xyBottomDiv =bottomBlock.size();

    let xy = this.gridAddVertical(xyTopDiv,xyMiddleDiv);
    this.setXySize(this.gridAddVertical(xy,xyBottomDiv));
  }
}
export class htmlBlockCardTitle extends htmlBlock{
  constructor(cfg){
    //this.enhancedShutter=enhancedShutter;
    let block = {cfg: cfg};
    super(block);
  }
  defineHtml(){
    // dummy code, done by HA
    this.setHtmlString(html``);
  }
  defineSize(){

    let xy = new xyPair();

    let title = this.cfg.title();
    if (title){
      const haCardTitleFontHeight= 24;
      const haTitleHeightPx = 76;
      const titleSize= getTextSize(title,C.HA_TITLE_FONT,haCardTitleFontHeight);
      xy = new xyPair(titleSize.width,haTitleHeightPx);
    }
    this.setXySize(xy);
  }

}
export class htmlBlockShutterSeparate extends htmlBlock{
  constructor(cfg){
    //this.enhancedShutter=enhancedShutter;
    let block = {cfg: cfg};
    super(block);
  }
  defineHtml(){
    this.setHtmlString (html`
      <div class="${C.ESC_CLASS_SHUTTER_SEPARATE}-${this.cfg.stacked()}"></div>
    `);
  }
  defineSize(){
    let xy = this.cfg.stacked()===C.VERTICAL
      ? new xyPair(C.SEPARATE_LENGHT,C.SEPARATE_MARGIN_TB*2+C.SEPARATE_BORDER_WIDTH*2)
      : new xyPair(C.SEPARATE_MARGIN_LR*2+C.SEPARATE_BORDER_WIDTH*2,C.SEPARATE_LENGHT);
    this.setXySize(xy);
  }
}
export class htmlBlockBatteryIcon extends htmlBlock{

  defineHtml(){
    this.setHtmlString(html`
        ${this.cfg.getIconsActive() ? html`
          ${this.cfg.getBatteryEntity() ? html`
            <div class="${C.ESC_CLASS_ICON_LEFT}">
              <ha-icon
                icon=${this.cfg.batteryLevelIcon()}
                class="${C.ESC_CLASS_HA_ICON}"
              >
              </ha-icon>
              <div class="${C.ESC_CLASS_TOP_ICON_TEXT}">
                ${this.cfg.batteryLevelText()}
              </div>
            </div>
            ` : html`
            <div class="${C.ESC_CLASS_ICON_LEFT}">
              <ha-icon
                icon="mdi:blank"
                class="${C.ESC_CLASS_HA_ICON}"
              >
              </ha-icon>
            </div>`
          }
          ` : html``
        }
    `);

  }
  defineSize(){
    let xy= this.sizeIcon();
    this.setXySize(xy);
  }
}
export class htmlBlockSignalIcon extends htmlBlock{

  defineHtml(){
    // dummy code, done by HA
    this.setHtmlString(html`
      ${this.cfg.getIconsActive() ? html`
        ${this.cfg.getSignalEntity() ? html`
          <div class="${C.ESC_CLASS_ICON_RIGHT}">
            <ha-icon
              icon=${this.cfg.signalLevelIcon()}
              class="${C.ESC_CLASS_HA_ICON}"
            >
            </ha-icon>
            <div class="${C.ESC_CLASS_TOP_ICON_TEXT}">
              ${this.cfg.signalLevelText()}
            </div>
          </div>
          ` : html`
          <div class="${C.ESC_CLASS_ICON_RIGHT}">
            <ha-icon
              icon="mdi:blank"
              class="${C.ESC_CLASS_HA_ICON}"
            >
            </ha-icon>
          </div>`
        }
        ` : ''
      }
    `);
  }
  defineSize(){
    let xy = this.sizeIcon();
    this.setXySize(xy);
  }
}
export class htmlBlockNameAndState extends htmlBlock{

  show(position=C.TOP){
    const escClassName = position === C.TOP ? C.ESC_CLASS_TOP : C.ESC_CLASS_BOTTOM;
    // v2026.09.24.152: this row now carries the NAME only. It used to render a SECOND position text
    // alongside it, with its own size/weight/colour/order/gap keys — a duplicate of Position Readout,
    // which is the richer system (9 placements, handle-attached variants). Position Readout is now the
    // single way position is shown; header_order / header_gap / position_text_* / show_opening and the
    // header's own state block are gone with it.
    const nameBlock = new htmlBlockName(this.shutter);
    // v2026.09.24.154: when anchored to the cover the name renders inside the cover's own column
    // (htmlBlockMiddle), so the header row leaves it out. That replaces the v134/v153 padding offset,
    // which assumed exactly one column of movement buttons beside the cover.
    const anchored = !!(this.cfg.coverAnchored && this.cfg.coverAnchored());
    const nameHere = this.cfg.namePosition() === position && !anchored;
    const nameEl = nameHere ? nameBlock.show() : html``;
    return html`
      <div class = "${escClassName}" style="justify-content:${this.cfg.alignFlex(this.cfg.nameAlign())};">
        ${nameEl}
      </div>
    `;
  }
  size(position=C.TOP){

    // v2026.09.24.152: the header row holds the NAME only now, so its size must not reserve space for
    // the retired position text (that would leave a permanent blank strip).
    const nameBlock = new htmlBlockName(this.shutter);
    let xy = this.cfg.namePosition() === position ? nameBlock.size() : new xyPair();
    xy = this.gridAddVertical(xy, new xyPair(0, 16)); // padding = 16
    this.displaySize(xy);
    return xy;
  }
}
export class htmlBlockName extends htmlBlock{
  defineHtml(){
    // dummy code, done by HA
    this.setHtmlString(html`
      ${this.cfg.showName()
        ? html`
          <div class="${C.ESC_CLASS_LABEL} ${this.cfg.disabledGlobaly() ? `${C.ESC_CLASS_LABEL_DISABLED}` : ''}"
            @click="${() => this.shutter.doHassMoreInfoOpen(this.cfg.entityId())}"
            title="${this.cfg.getCoverEntity().getFriendlyName()}"
          >
            ${this.cfg.friendlyName()}
            ${this.cfg.passiveMode() ? html`
              <span class="${C.ESC_CLASS_HA_ICON_LOCK}">
                <ha-icon icon="mdi:lock"></ha-icon>
              </span>
            `:''}
          </div>
          `
        : html``
      }
    `);
  }
  defineSize(){
    let xy= new xyPair();
    const shutterTitleHeight = C.FONT_SIZE_LABEL * this.cfg.textScaleFactor();

    if (this.cfg.showName()){
      let titleSize = getTextSize(this.cfg.friendlyName(),C.HA_TITLE_FONT,shutterTitleHeight,'400');
      let x1 = titleSize.width;
      let y1 = C.LINE_HEIGHT_LABEL * this.cfg.textScaleFactor();
      xy = new xyPair(x1,y1);
      if (this.cfg.passiveMode()) {
        xy = this.gridAddHorizontal(xy,new xyPair(C.ICON_SIZE_LOCK,C.ICON_SIZE_LOCK));
      }
    }
    this.setXySize(xy);
  }
}
export class htmlBlockTop extends htmlBlock{
  defineHtml(){
    // dummy code, done by HA
    this.setHtmlString(this.showTopBottomDiv(C.TOP));
  }
  defineSize(){
    let xy = this.sizeTopBottomDiv(C.TOP);
    this.setXySize(xy);
  }
}
export class htmlBlockMiddle extends htmlBlock{

  featurePosition = this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION);

  defineHtml(){
    // dummy code, done by HA

    const leftButtonsBlock = new htmlBlockLeftButtons(this.shutter);
    const openCloseSliderBlock = new htmlBlockOpenCloseSlider(this.shutter);
    const centralWindowBlock = new htmlBlockCentralWindow(this.shutter);
    const tiltSectionBlock = new htmlBlockTiltSection(this.shutter);
    const rightButtonsBlock = new htmlBlockRightButtons(this.shutter);

    // v1.23.0: render the cover's internal segments in a user-configurable order (#8)
    const segments = {
      [C.COVER_SEG_STANDARD]: this.cfg.buttonsLeftActive() ? leftButtonsBlock.show() : html``,
      [C.COVER_SEG_SLIDER]: (this.cfg.showOpenCloseSliderBlock() && this.featurePosition) ? openCloseSliderBlock.show() : html``,
      [C.COVER_SEG_WINDOW]: centralWindowBlock.show(),
      [C.COVER_SEG_TILT]: this.cfg.canTilt() ? tiltSectionBlock.show() : html``,
      [C.COVER_SEG_PRESETS]: this.cfg.showPartialOpenButtons() ? rightButtonsBlock.show() : html``,
    };
    // deterministic per-control placement (before/after window); legacy cover_order still honored
    const finalOrder = (this.cfg.coverSegmentOrder && this.cfg.coverSegmentOrder())
      || [...C.COVER_ORDER_DEFAULT];
    // per-element side: 'top'/'bottom' pull the element into a zone above/below the window
    // (rendered as a horizontal row); 'before'/'after' stay in the left→right middle flex.
    const sideOf = {
      [C.COVER_SEG_STANDARD]: this.cfg.standardPosition(),
      [C.COVER_SEG_SLIDER]:   this.cfg.sliderPosition(),
      [C.COVER_SEG_TILT]:     this.cfg.tiltPosition(),
      [C.COVER_SEG_PRESETS]:  this.cfg.presetsPosition(),
    };
    const top = [], bottom = [];
    const midOrder = finalOrder.filter(k => {
      if (sideOf[k] === C.TOP) { top.push(segments[k]); return false; }
      if (sideOf[k] === C.BOTTOM) { bottom.push(segments[k]); return false; }
      return true; // window + before/after stay in the middle flex
    });
    const windowEl = segments[C.COVER_SEG_WINDOW];
    const midEls = midOrder.map(k => segments[k] || html``);
    // v2026.09.24.154: cross-axis alignment for the Name and the Position Readout.
    //   placed top/bottom  -> Left / Center / Right   (justify along the row)
    //   placed left/right  -> Top / Middle / Bottom   (align-self in the cover row)
    // "Align to Cover" (header_on_cover) with the cover in a row: top/bottom items are ANCHORED to the
    // cover's own column (grid below), so Left/Center/Right are measured against the cover's edges no
    // matter what sits beside it. This replaces the v153 padding offset, which only compensated for
    // one column of movement buttons and ignored presets/slider/tilt/side items entirely.
    const anchored = !!(this.cfg.coverAnchored && this.cfg.coverAnchored());
    const anchorTop = [], anchorBottom = [];   // outer item first (top) / inner item first (bottom)
    const topLines = [], bottomLines = [];     // panel-wide rows for non-centre alignment when not anchored
    const line = (el, align) => html`<div class="esc-anchor-line" style="justify-content:${this.cfg.alignFlex(align)};">${el}</div>`;
    const sideStyle = (align) => `align-self:${this.cfg.alignFlex(align)};`;

    // Position readout placed on a side of the image (top/bottom/left/right) — a standalone element
    const posPlace = this.cfg.effectivePositionPlacement ? this.cfg.effectivePositionPlacement() : 'default';
    if ([C.TOP, C.BOTTOM, C.LEFT, C.RIGHT].includes(posPlace)){
      const pAlign = this.cfg.posAlign();
      const txt = this.cfg.computePositionText(this.shutter.actualShutterPosition, this.shutter.actualTiltPosition);
      const side = (posPlace === C.LEFT || posPlace === C.RIGHT) ? sideStyle(pAlign) : '';
      const posEl = html`<div class="esc-shutter-pos-side" style="${this.cfg.panelPosStyle()}${side}">${txt}</div>`;
      if (posPlace === C.TOP || posPlace === C.BOTTOM) {
        const isTop = posPlace === C.TOP;
        if (anchored) (isTop ? anchorTop : anchorBottom).push(line(posEl, pAlign));
        else if (pAlign === C.ALIGN_CENTER) { if (isTop) top.unshift(posEl); else bottom.push(posEl); }
        else (isTop ? topLines : bottomLines).push(line(posEl, pAlign));
      }
      else if (posPlace === C.LEFT) midEls.unshift(posEl);
      else midEls.push(posEl);
    }
    // v2026.09.24.172: Last Changed readout on a side of the image — identical rules to the readout.
    const lcPlace = this.cfg.effectiveLcPlacement ? this.cfg.effectiveLcPlacement() : 'default';
    if ([C.TOP, C.BOTTOM, C.LEFT, C.RIGHT].includes(lcPlace)){
      const lAlign = this.cfg.lcAlign();
      const txt = this.cfg.lcText();
      if (txt) {
        const side = (lcPlace === C.LEFT || lcPlace === C.RIGHT) ? sideStyle(lAlign) : '';
        const lcEl = html`<div class="esc-shutter-lc-side" style="${this.cfg.lcStyle()}${side}">${txt}</div>`;
        if (lcPlace === C.TOP || lcPlace === C.BOTTOM) {
          const isTop = lcPlace === C.TOP;
          if (anchored) (isTop ? anchorTop : anchorBottom).push(line(lcEl, lAlign));
          else if (lAlign === C.ALIGN_CENTER) { if (isTop) top.unshift(lcEl); else bottom.push(lcEl); }
          else (isTop ? topLines : bottomLines).push(line(lcEl, lAlign));
        }
        else if (lcPlace === C.LEFT) midEls.unshift(lcEl);
        else midEls.push(lcEl);
      }
    }
    // v2026.09.24.152: the NAME uses the same four buckets. Left/right always place here; top/bottom
    // place here only when anchored to the cover — otherwise they stay in the header rows, which
    // pick the left/centre/right cell from name_align.
    const namePlace = String(this.cfg.namePosition() || '').toLowerCase();
    if (this.cfg.showName()){
      const nAlign = this.cfg.nameAlign();
      if (namePlace === C.LEFT || namePlace === C.RIGHT){
        const nameEl = html`<div class="esc-shutter-name-side" style="${this.cfg.nameSideStyle ? this.cfg.nameSideStyle() : ''}${sideStyle(nAlign)}">${new htmlBlockName(this.shutter).show()}</div>`;
        if (namePlace === C.LEFT) midEls.unshift(nameEl); else midEls.push(nameEl);
      } else if (anchored && (namePlace === C.TOP || namePlace === C.BOTTOM)){
        const nameEl = line(new htmlBlockName(this.shutter).show(), nAlign);
        // the name is the OUTER item: above the readout at the top, below it at the bottom
        if (namePlace === C.TOP) anchorTop.unshift(nameEl); else anchorBottom.push(nameEl);
      }
    }
    // battery / signal icons placed on the LEFT or RIGHT of the image (top/bottom stay in the header rows)
    const addSideIcon = (posEff, el) => { if (posEff === C.LEFT) midEls.unshift(el); else if (posEff === C.RIGHT) midEls.push(el); };
    if (this.cfg.batteryIconActive()) addSideIcon(this.cfg.batteryPositionEff(), new htmlBlockBatteryIcon(this.shutter).show());
    if (this.cfg.signalIconActive()) addSideIcon(this.cfg.signalPositionEff(), new htmlBlockSignalIcon(this.shutter).show());

    let mid;
    if (anchored && (anchorTop.length || anchorBottom.length)){
      // Three-row grid: row 2 is the ordinary cover row; the cover's cell spans rows 1-3 with a
      // subgrid so its top/bottom items share rows 1/3 WITHOUT changing row 2's height — the buttons
      // beside the cover stay centred on the cover, not on cover+text. The grid has no row-reverse, so
      // a reversed row (buttons on the RIGHT) is reproduced by reversing the DOM order instead.
      const anchorEl = html`
        <div class="esc-cover-anchor">
          ${anchorTop.length ? html`<div class="esc-anchor-top">${anchorTop}</div>` : ''}
          ${windowEl}
          ${anchorBottom.length ? html`<div class="esc-anchor-bottom">${anchorBottom}</div>` : ''}
        </div>`;
      const els = midEls.map(e => (e === windowEl ? anchorEl : e));
      if (this.cfg.buttonsContainerReversed()) els.reverse();
      mid = html`<div class="${C.ESC_CLASS_MIDDLE} esc-mid-anchored">${els}</div>`;
    } else {
      mid = html`<div class="${C.ESC_CLASS_MIDDLE}">${midEls}</div>`;
    }
    // No top/bottom zones → emit the plain middle (byte-identical to before)
    this.setHtmlString((top.length || bottom.length || topLines.length || bottomLines.length)
      ? html`
        <div class="esc-shutter-middle-stack">
          ${topLines}
          ${top.length ? html`<div class="esc-shutter-zone-tb">${top}</div>` : ''}
          ${mid}
          ${bottom.length ? html`<div class="esc-shutter-zone-tb">${bottom}</div>` : ''}
          ${bottomLines}
        </div>`
      : mid);
  }
  defineSize(){
    const leftButtonsBlock = new htmlBlockLeftButtons(this.shutter);
    const openCloseSliderBlock = new htmlBlockOpenCloseSlider(this.shutter);
    const centralWindowBlock = new htmlBlockCentralWindow(this.shutter);
    const tiltSectionBlock = new htmlBlockTiltSection(this.shutter);
    const rightButtonsBlock = new htmlBlockRightButtons(this.shutter);

    let xyLeftButtons = leftButtonsBlock.size();
    let xyOpenCloseSlider = this.cfg.showOpenCloseSliderBlock() && this.featurePosition ? openCloseSliderBlock.size() : new xyPair();
    let xyCentralWindow = centralWindowBlock.size();
    let xyTiltSection = this.cfg.canTilt() ? tiltSectionBlock.size(): new xyPair();
    let xyRightButtons = this.cfg.showPartialOpenButtons() ? rightButtonsBlock.size() : new xyPair();

    let xyRight = this.gridAddBoth(xyTiltSection,xyRightButtons);
    let xy;
    if (this.cfg.buttonGroupInRow()){
      xy = this.gridAddHorizontal(xyLeftButtons,xyOpenCloseSlider);
      xy = this.gridAddHorizontal(xy,xyCentralWindow);
      xy = this.gridAddHorizontal(xy,xyRight);
    }else{
      xy = this.gridAddVertical(xyLeftButtons,xyOpenCloseSlider);
      xy = this.gridAddVertical(xy,xyCentralWindow);
      xy = this.gridAddVertical(xy,xyRight);

    }
    this.setXySize(xy);

  }
}
export class htmlBlockBottom extends htmlBlock{
  defineHtml(){
    // dummy code, done by HA
    this.setHtmlString(this.showTopBottomDiv(C.BOTTOM));
  }
  defineSize(){
    let xy = this.sizeTopBottomDiv(C.BOTTOM);
    this.setXySize(xy);
  }
}
export class htmlBlockLeftButtons extends htmlBlock{
  defineHtml(){
    // dummy code, done by HA

    const buttonUpBlock = new htmlBlockButtonUp(this.shutter);
    const buttonDownBlock = new htmlBlockButtonDown(this.shutter);
    const buttonStopBlock = new htmlBlockButtonStop(this.shutter);
    const buttonPartialBlock = new htmlBlockButtonPartial(this.shutter);
    this.setHtmlString(html`
      ${this.cfg.buttonsLeftActive()
      ? html`
        <div class="${C.ESC_CLASS_BUTTONS}" style="${this.cfg.buttonFlexFlow(this.cfg.standardOrientation())}">
          ${buttonUpBlock.show()}
          ${buttonStopBlock.show()}
          ${buttonDownBlock.show()}
          ${buttonPartialBlock.show()}
        </div>
        ` : html`
        <div class='blankDiv'></div>
      `}
    `);
  }
  defineSize(){
    const buttonUpBlock = new htmlBlockButtonUp(this.shutter);
    const buttonStopBlock = new htmlBlockButtonStop(this.shutter);
    const buttonDownBlock = new htmlBlockButtonDown(this.shutter);
    const buttonPartialBlock = new htmlBlockButtonPartial(this.shutter);

    let xyButtonUpBlock = buttonUpBlock.size();
    let xyButtonStopBlock = buttonStopBlock.size();
    let xyButtonDownBlock = buttonDownBlock.size();
    let xyButtonPartialBlock = this.cfg.partialActive() ? buttonPartialBlock.size() : new xyPair();

    let xy = this.gridAddVertical(xyButtonUpBlock,xyButtonStopBlock);
    xy = this.gridAddVertical(xy,xyButtonDownBlock);
    xy = this.gridAddVertical(xy,xyButtonPartialBlock);

    if (!this.cfg.buttonGroupInRow()) xy.switch();

    this.setXySize(xy);
  }
  showButtonUpDown(feature,action,upDown,icon){

    return html`
      ${this.cfg.showStandardButtons() &&
        this.cfg.buttonVisibility(upDown === C.UP ? 'up' : 'down') !== 'hide' &&
         this.cfg.isCoverFeatureActive(feature)
      ? html`
        <ha-icon-button
          label="${this.cfg.getLocalize(C.LOCALIZE_TEXT[this.cfg.applyInvertForShowButtonUpDownLabel(action)])}"
          .disabled=${this.cfg.disabledGlobaly() || this.cfg.coverButtonDisabled(upDown)}
          @click=${()=> this.shutter.doOnclick(`${this.cfg.applyInvertForShowButtonUpDownClick(action,true)}`)} >
          <ha-icon
            class="${C.ESC_CLASS_HA_ICON}"
            style="${this.#visStyle(upDown === C.UP ? 'up' : 'down')}"
            icon="${icon}">
          </ha-icon>
        </ha-icon-button>
      `
      : ''}
    `;
  }
  // inline colour when the button is in a configured state and set to recolour rather than hide
  #visStyle(which){
    const v = this.cfg.buttonVisibility(which);
    return (v && v.mode === 'recolor') ? `color:${v.color};` : '';
  }
}
export class htmlBlockButtonUp extends htmlBlockLeftButtons{
  defineHtml(){
    this.setHtmlString(this.showButtonUpDown(C.ESC_FEATURE_OPEN,C.ACTION_SHUTTER_OPEN,C.UP,this.cfg.iconUp() ? normalizeIcon(this.cfg.iconUp()) : 'mdi:arrow-up'));
  }
  defineSize(){
    let xy = this.cfg.showStandardButtons() ? this.sizeButton() : new xyPair();
    this.setXySize(xy);
  }
}
export class htmlBlockButtonStop extends htmlBlockLeftButtons{
  defineHtml(){
    const action = C.ACTION_SHUTTER_STOP;
    const feature = C.ESC_FEATURE_STOP;
    const icon = this.cfg.iconStop() ? normalizeIcon(this.cfg.iconStop()) : "mdi:stop"

    this.setHtmlString(html`
      ${this.cfg.showStandardButtons() &&
        this.cfg.buttonVisibility('stop') !== 'hide' &&
         this.cfg.isCoverFeatureActive(feature)
      ? html`
        <ha-icon-button
          label="${this.cfg.getLocalize(C.LOCALIZE_TEXT[action])}"
          .disabled=${this.cfg.disabledGlobaly()}
          @click=${()=> this.shutter.doOnclick(`${action}`)} >
          <ha-icon
            class="${C.ESC_CLASS_HA_ICON}"
            style="${(() => { const v = this.cfg.buttonVisibility('stop'); return (v && v.mode === 'recolor') ? `color:${v.color};` : ''; })()}"
            icon="${icon}">
          </ha-icon>
        </ha-icon-button>
      `
      : ''
    }`);
  }
  defineSize(){
    let xy =this.cfg.showStandardButtons() ? this.sizeButton() : new xyPair();
    this.setXySize(xy);
  }

}
export class htmlBlockButtonDown extends htmlBlockLeftButtons{
  defineHtml(){
    this.setHtmlString(this.showButtonUpDown(C.ESC_FEATURE_CLOSE,C.ACTION_SHUTTER_CLOSE,C.DOWN,this.cfg.iconDown() ? normalizeIcon(this.cfg.iconDown()) : 'mdi:arrow-down'))
  }
  defineSize(){
    let xy =this.cfg.showStandardButtons() ? this.sizeButton() : new xyPair();
    this.setXySize(xy);
  }
}
export class htmlBlockButtonPartial extends htmlBlockLeftButtons{
  defineHtml(){
    this.setHtmlString(html`
      ${this.cfg.partialActive() && this.cfg.showStandardButtons() /* TODO localize texts */
        ? html`
          <ha-icon-button
            label="Favorite position (${C.SHUTTER_OPEN_PCT- this.cfg.partial()}%)"
            .disabled=${this.cfg.disabledGlobaly()}
            @click="${()=> this.shutter.doOnclick(`${C.ACTION_SHUTTER_SET_POS}`, this.cfg.calcOffset(this.cfg.partial()))}" >
            <ha-icon class="${C.ESC_CLASS_HA_ICON}" icon="${this.cfg.iconPartial() ? normalizeIcon(this.cfg.iconPartial()) : 'mdi:star-circle'}"></ha-icon>
          </ha-icon-button>
        ` : ''}
    `);
  }
  defineSize(){
    let xy =  this.cfg.showStandardButtons()? this.sizeButton() : new xyPair(0,0) ;
    this.setXySize(xy);
  }
}
export class htmlBlockTiltButtons extends htmlBlock{
  defineHtml(){
    const buttonTiltUpBlock = new htmlBlockButtonTiltUp(this.shutter);
    const tiltPositionBlock = new htmlBlockTiltPosition(this.shutter);
    const buttonTiltDownBlock = new htmlBlockButtonTiltDown(this.shutter);
    this.setHtmlString(html`
      <div class="${C.ESC_CLASS_TILT_BUTTONS}">
        ${buttonTiltUpBlock.show()}
        ${tiltPositionBlock.show()}
        ${buttonTiltDownBlock.show()}
      </div>
    `);
  }
  showButtonTilt(action,icon){
    return html`
          <ha-icon-button
            label="${this.cfg.getLocalize(C.LOCALIZE_TEXT[action])}"
            .disabled=${this.cfg.disabledGlobaly()}
            @click="${()=> this.shutter.doOnclick(`${action}`)}">
            <ha-icon class="${C.ESC_CLASS_HA_ICON_TILT}" icon="${icon}"></ha-icon>
          </ha-icon-button>
    `;
  }
  defineSize(){
    const buttonTiltUpBlock = new htmlBlockButtonTiltUp(this.shutter);
    const tiltPositionBlock = new htmlBlockTiltPosition(this.shutter);
    const buttonTiltDownBlock = new htmlBlockButtonTiltDown(this.shutter);

    let xyButtonTiltUp = buttonTiltUpBlock.size();
    let xyTiltPosition = tiltPositionBlock.size();
    let xyButtonTiltDown = buttonTiltDownBlock.size();
    let xy;

    if (!this.cfg.buttonGroupInRow()) {
       xy = this.gridAddHorizontal(xyButtonTiltUp,xyTiltPosition);
       xy = this.gridAddHorizontal(xy,xyButtonTiltDown);
    }else{
       xy = this.gridAddVertical(xyButtonTiltUp,xyTiltPosition);
       xy = this.gridAddVertical(xy,xyButtonTiltDown);
    }
    this.setXySize(xy);
  }

}
export class htmlBlockButtonTiltDown extends htmlBlockTiltButtons{
  defineHtml(){
    const icon = this.cfg.iconTiltDown() ? normalizeIcon(this.cfg.iconTiltDown())
      : (this.cfg.buttonGroupInRow() ? "mdi:arrow-bottom-right":"mdi:arrow-bottom-left");
    this.setHtmlString(this.showButtonTilt(C.ACTION_SHUTTER_CLOSE_TILT,icon));
  }
  defineSize(){
    let xy = this.sizeButton();
    this.setXySize(xy);
  }
}
export class htmlBlockButtonTiltUp extends htmlBlockTiltButtons{
  defineHtml(){
    const icon = this.cfg.iconTiltUp() ? normalizeIcon(this.cfg.iconTiltUp())
      : (this.cfg.buttonGroupInRow() ? "mdi:arrow-top-right":"mdi:arrow-bottom-right");
    this.setHtmlString(this.showButtonTilt(C.ACTION_SHUTTER_OPEN_TILT,icon));
  }
  defineSize(){
    let xy = this.sizeButton();
    this.setXySize(xy);
  }
}
export class htmlBlockTiltPosition extends htmlBlockTiltButtons{
  defineHtml(){
    this.setHtmlString(html`
      <div class="${C.ESC_CLASS_TILT_CONTAINER}">
        <div class="${C.ESC_CLASS_TILT_CLASS}">
          <div class="${C.ESC_CLASS_TILT_LINE}"></div>
        </div>
        <div class="${C.ESC_CLASS_TILT_CLASS}">
          <div class="${C.ESC_CLASS_TILT_LINE}"></div>
        </div>
        <div class="${C.ESC_CLASS_TILT_CLASS}">
          <div class="${C.ESC_CLASS_TILT_LINE}"></div>
        </div>
      </div>
    `);
  }
  defineSize(){
    // question on box-sizing: border-box: can't see difference ..??
    let size = C.ICON_SIZE* this.cfg.buttonScaleFactor();
    let xy = new xyPair(size,3*size);
    if (!this.cfg.buttonGroupInRow()) xy.switch();
    this.setXySize(xy);
  }
}
export class htmlBlockTiltSlider extends htmlBlock{
  defineHtml(){
    this.setHtmlString(html`
      <div class="${C.ESC_CLASS_SLIDER_WRAP}">
        <input type="range" class ="${C.ESC_CLASS_SLIDER_CLASS} tilt" min="0" max="100" value="${this.actualTiltPosition}">
      </div>
    `);
  }
  defineSize(){
    /**
     * questions about size due to browswer definitions of <input> html
     */
    let width= 20; //default of chrome WATCH OUT POSSIBLE WRONG FOR ROTATING
    let height = 129; // default
    let zoom = this.cfg.buttonScaleFactor();

    let xy = new xyPair(zoom*width,zoom*height);
    if (!this.cfg.buttonGroupInRow()) xy.switch();
    this.setXySize(xy);
  }
}
export class htmlBlockOpenCloseSlider extends htmlBlock{
  defineHtml(){
    this.setHtmlString(html`
      <div class="${C.ESC_CLASS_SLIDER_WRAP}">
        <input type="range" class ="${C.ESC_CLASS_SLIDER_CLASS} openclose" min="0" max="100" value="${this.actualScreenPosition}">
      </div>
    `);
  }
  defineSize(){
    /**
     * questions about size due to browswer definitions of <input> html
     */
    let width= 20; //default of chrome WATCH OUT POSSIBLE WRONG FOR ROTATING
    let height = 129; // default
    let zoom = this.cfg.buttonScaleFactor();

    let xy = new xyPair(zoom*width,zoom*height);
    if (!this.cfg.buttonGroupInRow()) xy.switch();
    this.setXySize(xy);
  }
}
export class htmlBlockTiltSection extends htmlBlock{

  tilt_position = this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_TILT_POSITION)
  defineHtml(){
    const tiltSliderBlock= new htmlBlockTiltSlider(this.shutter);
    const tiltButtonsBlock = new htmlBlockTiltButtons(this.shutter);
    this.setHtmlString(html`
        ${this.cfg.showTiltButtonBlock() ? tiltButtonsBlock.show() : html``}
        ${this.cfg.showTiltSliderBlock() && this.tilt_position ? tiltSliderBlock.show() :html``}
    `);
  }
  defineSize(){
    let xy = new xyPair();
    const tiltSliderBlock= new htmlBlockTiltSlider(this.shutter);
    const tiltButtonsBlock = new htmlBlockTiltButtons(this.shutter);
    let xyTiltSlider = tiltSliderBlock.size();
    let xyTiltButtons = tiltButtonsBlock.size();

    if (this.cfg.buttonGroupInRow()){
      xy = this.cfg.showTiltButtonBlock() ? this.gridAddHorizontal(xy,xyTiltButtons) : xy;
      xy = this.cfg.showTiltSliderBlock() && this.tilt_position ? this.gridAddHorizontal(xy,xyTiltSlider) :xy;
    }else{
      xy = this.cfg.showTiltButtonBlock() ? this.gridAddVertical(xy,xyTiltButtons) : xy;
      xy = this.cfg.showTiltSliderBlock() && this.tilt_position ? this.gridAddVertical(xy,xyTiltSlider) : xy;

    }
    this.setXySize(xy);
  }
}
export class htmlBlockCentralWindow extends htmlBlock{
  defineHtml(){
    if (this.cfg.showWindow() && this.cfg.isModern && this.cfg.isModern()){
      this.setHtmlString(this.showModern());
      return;
    }
    this.setHtmlString(html`
      ${this.cfg.showWindow()
      ? (() => { const ov = this.allOverlays();
          const ep = (this.cfg.effectivePositionPlacement && this.cfg.effectivePositionPlacement()) || '';
          const atSide = ep === 'on-handle' || ep.indexOf('at-handle-') === 0;
          return html`
        <div class="${C.ESC_CLASS_SELECTOR}" ?data-art=${this.#useArt()} style=${atSide ? 'overflow:visible;' : ''}>
          <div class="${C.ESC_CLASS_SELECTOR_PICTURE}">
            ${this.#useArt() ? this.showArt() : html`
              ${this.escImages.getWindowImageSrc(this.cfg.id()) ? html`<img src= "${this.escImages.getWindowImageSrc(this.cfg.id())}">` : ''}
              ${this.showSlide()}`}
            ${this.cfg.partialActive()
              ? html`<div class="${C.ESC_CLASS_SELECTOR_PARTIAL}"></div>`
              : ''}
            <div class="${C.ESC_CLASS_MOVEMENT_OVERLAY}">
              <ha-icon class="${C.ESC_CLASS_MOVEMENT_UP}" icon="mdi:arrow-up">
              </ha-icon>
              <ha-icon class="${C.ESC_CLASS_MOVEMENT_DOWN}" icon="mdi:arrow-down">
              </ha-icon>
            </div>
            ${ov.onHandle}
          </div>
          ${ov.atHandle}
          ${this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)
            ? html`<div class="${C.ESC_CLASS_SELECTOR_PICKER}"></div>`
            : ''}
        </div>
      `; })() : html``}
    `);
  }
  // Modern bar/pill visual — a rounded track filled to the cover position, with an optional
  // handle + thin secondary tilt bar. Kept inside .esc-selector so the resize observer and the
  // existing .esc-selector-picker drag layer (drag → set_cover_position) work unchanged.
  showModern(){
    const style = resolveModernStyle(this.cfg.modernStyle());
    // live open % (updates during drag because render() re-runs on react_ShutterPosition)
    let pct = Number(this.shutter.actualShutterPosition);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    // cover state for the state-driven fill colour
    let st = pct <= 0 ? 'closed' : 'open';
    try { const s = this.cfg.getCoverEntity() && this.cfg.getCoverEntity().getState && this.cfg.getCoverEntity().getState();
      if (s === 'opening' || s === 'closing') st = s; } catch (e) {}
    // orientation: vertical (down/up) or horizontal (left/right) — mirrors Classic's closing_direction
    const isH = !(this.cfg.verticalMovement && this.cfg.verticalMovement());
    const fill = modernFillPaint(style, st);
    const glow = modernBarGlow(style, st);
    const glowOnFill = glow && style.glow_target === 'fill';
    // on-handle readout sits inside the bar, so don't clip it
    const onHandleValue = (this.cfg.effectivePositionPlacement && this.cfg.effectivePositionPlacement()) === 'on-handle';
    const noClip = glowOnFill || onHandleValue;
    const border = Number(style.bar_border_width) > 0 ? `border:${style.bar_border_width}px solid ${style.bar_border_color};` : '';
    const rad = Number(style.bar_radius) || 0;
    const barStyle = `width:var(--esc-window-width);height:var(--esc-window-height);max-width:100%;position:relative;`
      + `border-radius:${rad}px;overflow:${noClip ? 'visible' : 'hidden'};background:${modernTrackColor(style)};${border}`
      + ((glow && !glowOnFill) ? `box-shadow:${glow};` : '');
    // Travel model → one or more "open/lit" bands [lo,hi] (% along travel) + handle positions.
    //   single    : one band anchored at the start (0..pct), one handle
    //   center    : one band centred, growing as it opens, two handles (double-curtain / center-out)
    //   tdbu      : band between the bottom rail (this cover) and the top rail (a 2nd entity), two handles
    const travel = (this.cfg.modernTravel && this.cfg.modernTravel()) || 'single';
    let bands, handles;
    if (travel === 'center'){
      const half = pct / 2;
      bands = [[50 - half, 50 + half]];
      handles = [50 - half, 50 + half];
    } else if (travel === 'tdbu'){
      let top = 100;
      const se = this.cfg.modernSecondEntity && this.cfg.modernSecondEntity();
      if (se && this.hass && this.hass.states[se]){
        const p = Number(this.hass.states[se].attributes && this.hass.states[se].attributes.current_position);
        if (Number.isFinite(p)) top = Math.max(0, Math.min(100, p));
      }
      const lo = Math.min(pct, top), hi = Math.max(pct, top);
      bands = [[lo, hi]];
      handles = [pct, top];
    } else {
      bands = [[0, pct]];
      handles = [pct];
    }
    const fillOpacity = modernFillOpacity(style);
    const bandStyle = ([lo, hi]) => (isH
        ? `position:absolute;top:0;bottom:0;left:${lo}%;width:${hi - lo}%;`
        : `position:absolute;left:0;right:0;bottom:${lo}%;height:${hi - lo}%;`)
      + `background:${fill};opacity:${fillOpacity};transition:all .18s ease;`
      + (noClip ? `border-radius:${rad}px;` : '')          // bar isn't clipping → round the fill itself
      + (glowOnFill ? `box-shadow:${glow};` : '');
    const fillDivs = bands.map(b => html`<div class="esc-modern-fill" style="${bandStyle(b)}"></div>`);
    const handleDivs = style.handle_show
      ? handles.map(hp => html`<div class="esc-modern-handle" style="${modernHandleStyle(style, hp, fill, isH ? 'h' : 'v')}"></div>`)
      : [];
    // secondary tilt bar (perpendicular thin line)
    let tiltHtml = html``;
    if (style.tilt_show && this.cfg.canTilt && this.cfg.canTilt()){
      let tpct = Number(this.shutter.actualTiltPosition);
      if (!Number.isFinite(tpct)) tpct = 0;
      tpct = Math.max(0, Math.min(100, tpct));
      const tth = Number(style.tilt_thickness)||5;
      const tiltStyle = (isH
          ? `position:absolute;top:10%;bottom:10%;width:${tth}px;left:calc(${tpct}% - ${tth/2}px);`
          : `position:absolute;left:10%;right:10%;height:${tth}px;bottom:calc(${tpct}% - ${tth/2}px);`)
        + `border-radius:2px;background:${style.tilt_color};`;
      tiltHtml = html`<div class="esc-modern-tilt" style="${tiltStyle}"></div>`;
    }
    // Open-% on/at-handle overlay (side placements are drawn outside the window by htmlBlockMiddle)
    const { onHandle: onHandleVal, atHandle: atHandleVal } = this.allOverlays();
    return html`
      <div class="${C.ESC_CLASS_SELECTOR} esc-modern">
        <div class="esc-modern-bar" style="${barStyle}">
          ${fillDivs}
          ${tiltHtml}
          ${handleDivs}
          ${onHandleVal}
        </div>
        ${atHandleVal}
        ${this.cfg.isCoverFeatureActive(C.ESC_FEATURE_SET_POSITION)
          ? html`<div class="${C.ESC_CLASS_SELECTOR_PICKER}"></div>`
          : ''}
      </div>
    `;
  }
  // Open-% readout that tracks the shade edge — on the handle, or beside it (left/right/above/below).
  // Used by both the Modern bar and the Classic window. Returns {onHandle, atHandle} template pieces.
  // Position Readout + Last Changed overlays together, for the two call sites that draw them.
  allOverlays(){
    const a = this.valueOverlay();
    const lcP = this.cfg.effectiveLcPlacement ? this.cfg.effectiveLcPlacement() : 'default';
    if (lcP === 'default') return a;
    const b = this.valueOverlay({ placement: lcP, txt: this.cfg.lcText(), style: this.cfg.lcStyle(), noEnd: true });
    return { onHandle: html`${a.onHandle}${b.onHandle}`, atHandle: html`${a.atHandle}${b.atHandle}` };
  }
  // v2026.09.24.172: parameterised so the Last Changed readout reuses the SAME placement engine.
  //   spec = { placement, txt, style, noEnd }  — omit for the Position Readout (unchanged behaviour)
  valueOverlay(spec){
    spec = spec || {};
    const placement = spec.placement != null ? spec.placement
      : (this.cfg.effectivePositionPlacement ? this.cfg.effectivePositionPlacement() : 'default');
    if (placement !== 'on-handle' && placement.indexOf('at-handle-') !== 0) return { onHandle: html``, atHandle: html`` };
    const isH = !(this.cfg.verticalMovement && this.cfg.verticalMovement());
    let pct = Number(this.shutter.actualShutterPosition);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    const txt = spec.txt != null ? spec.txt
      : this.cfg.computePositionText(this.shutter.actualShutterPosition, this.shutter.actualTiltPosition);
    if (!txt) return { onHandle: html``, atHandle: html`` };
    const base = 'position:absolute;white-space:nowrap;font-size:calc(11px*var(--esc-button-scale,1));pointer-events:none;z-index:3;';
    // clamp so a readout sitting on the handle stays fully inside the bar (~10px half-height)
    const clamped = `clamp(10px, ${pct}%, calc(100% - 10px))`;
    const along = isH ? `left:${clamped};` : `bottom:${clamped};`;
    // panel Position Value text style (size/weight/colour) — appended so it wins over the fallbacks
    const pstyle = spec.style != null ? spec.style : (this.cfg.panelPosStyle ? this.cfg.panelPosStyle() : '');
    if (placement === 'on-handle'){
      const onStyle = `color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.7);font-weight:600;${pstyle}`;
      // Open/Closed end-state text can leave the handle → center / above / below the bar (% stays on handle)
      // (last-changed text never contains '%', so it must opt out or it would be treated as end-state)
      const isEnd = !spec.noEnd && txt.indexOf('%') === -1;
      const endPlace = this.cfg.panelPosEnd ? this.cfg.panelPosEnd() : 'handle';
      if (isEnd && endPlace !== 'handle'){
        if (endPlace === 'center'){
          return { onHandle: html`<div class="esc-modern-value" style="${base}left:50%;top:50%;transform:translate(-50%,-50%);${onStyle}">${txt}</div>`, atHandle: html`` };
        }
        const css = endPlace === 'above' ? 'left:50%;bottom:100%;margin-bottom:4px;transform:translateX(-50%);'
                                         : 'left:50%;top:100%;margin-top:4px;transform:translateX(-50%);';
        return { onHandle: html``, atHandle: html`<div class="esc-modern-value" style="${base}${css}${onStyle}">${txt}</div>` };
      }
      const cross = isH ? 'top:50%;transform:translate(-50%,-50%);' : 'left:50%;transform:translate(-50%,50%);';
      return { onHandle: html`<div class="esc-modern-value" style="${base}${along}${cross}${onStyle}">${txt}</div>`, atHandle: html`` };
    }
    const dir = placement.slice('at-handle-'.length); // left|right|above|below
    let css;
    if (!isH){
      css = dir === 'left'  ? 'right:100%;margin-right:6px;transform:translateY(50%);'
          : dir === 'right' ? 'left:100%;margin-left:6px;transform:translateY(50%);'
          : dir === 'above' ? 'left:50%;transform:translate(-50%,-120%);'
          :                   'left:50%;transform:translate(-50%,160%);';
    } else {
      css = dir === 'above' ? 'bottom:100%;margin-bottom:4px;transform:translateX(-50%);'
          : dir === 'below' ? 'top:100%;margin-top:4px;transform:translateX(-50%);'
          : dir === 'left'  ? 'top:50%;transform:translate(-115%,-50%);'
          :                   'top:50%;transform:translate(15%,-50%);';
    }
    return { onHandle: html``, atHandle: html`<div class="esc-modern-value" style="${base}${along}${css}color:var(--primary-text-color);${pstyle}">${txt}</div>` };
  }
  defineSize(){
    let xy = new xyPair();
    if (this.cfg.showWindow()){
      let x = this.cfg.windowWidthPx() + 2 * C.SELECTOR_MARGIN;
      let y = this.cfg.windowHeightPx() + 2 * C.SELECTOR_MARGIN;
      xy.fill(x,y);
    }
    this.setXySize(xy);
  }
  // v2026.09.24.179: the classic cover is drawn by the SAME function as the editor preview
  // (coverArt.js). Venetian tilt still uses its own slat renderer, since it animates each slat.
  #useArt(){
    return !(this.cfg.canTilt() && this.shutter && typeof this.shutter.canShowTilt === 'function' && this.shutter.canShowTilt());
  }
  showArt(){
    const id = this.cfg.id();
    const img = this.escImages;
    // covered length = where the leading edge is on screen, as a share of the window. Both come from
    // the same measurement, so zoom and scaling cancel out, and a drag shows live.
    const sh = this.shutter || {};
    const vert = this.cfg.verticalMovement ? this.cfg.verticalMovement() : true;
    const full = Number(typeof sh.windowSizeMovingDirectionPx === 'function' ? sh.windowSizeMovingDirectionPx()
      : (vert ? this.cfg.windowHeightPx() : this.cfg.windowWidthPx())) || 0;
    const pos = Number(sh.actualScreenPosition);
    const pct = (full > 0 && Number.isFinite(pos)) ? Math.max(0, Math.min(100, pos / full * 100)) : 0;
    let bottomPx = 0;
    try { bottomPx = Number(img.getShutterBottomImageSize(id)?.y?.()) || 0; } catch (e) {}
    return classicArt({
      W: this.cfg.windowWidthPx(), H: this.cfg.windowHeightPx(),
      dir: this.cfg.unrollUnfoldDirection(),
      rotate: !!this.cfg.rotateSlatsImage(),
      len: pct + '%',
      view: img.getViewImageSrc(id) || '',
      slat: img.getShutterSlatImageSrc(id) || '',
      bottom: img.getShutterBottomImageSrc(id) || '',
      frame: img.getWindowImageSrc(id) || '',
      stretchBottom: !!this.cfg.stretchEdgeImage(),
      bottomPx,
    });
  }
  showSlide(){
     return html`
        <div class="${C.ESC_CLASS_SELECTOR_SLIDE}">
          ${this.showSlideSlats(this.shutter)}
          <div class="${C.ESC_CLASS_SELECTOR_SLIDE_EDGE}"></div>
        </div>
      `;
  }
  showSlideSlats(){
    // Only Tilt when SHowTilt and there is a size
    const output = this.cfg.canTilt() && this.shutter.canShowTilt()
     ? html`
        ${this.showSlatsTilt()}
      `
     : html`
        ${this.showSlats()}
      `;
    return output;
  }
  showSlatsTilt(){

    const sizeSlide = this.shutter.windowSizeMovingDirectionPx();
    const sizeSlat = this.shutter.slatSizeMovingDirectionPx() ;

    //const sizeSlat = new xyPair(100,51);
    const number = sizeSlat ? Math.ceil(sizeSlide / sizeSlat): 1;

    return html`
      <div class="${C.ESC_CLASS_TILT_SLAT1}">
      ${Array.from({ length: number }, () =>
        html`
          <div class="${C.ESC_CLASS_TILT_SLAT2}">
            <div class="${C.ESC_CLASS_TILT_EDGE}"></div>
            <div class="${C.ESC_CLASS_TILT_SLAT3}">
            </div>
          </div>
          `
      )}
      </div>
    `;
  }
  showSlats(){

    return html`
        <div class="${C.ESC_CLASS_SELECTOR_SLIDE_SLATS}">
        </div>
      `;
  }
}
export class htmlBlockRightButtons extends htmlBlock{
  defineHtml(){
    // v1.22.0: value-label buttons instead of icons (#7)
    if (this.cfg.partialButtonsStyle && this.cfg.partialButtonsStyle() === C.PARTIAL_STYLE_VALUES){
      const presetsCfg = this.cfg.positionPresets ? this.cfg.positionPresets() : [];
      const presets = (Array.isArray(presetsCfg) && presetsCfg.length) ? presetsCfg : C.ESC_PARTIAL_PRESETS_DEFAULT;
      // optional shared Button Styles library ref applied to each value button
      const styleRef = this.cfg.pctButtonStyle && this.cfg.pctButtonStyle();
      const appr = styleRef ? resolveButtonAppearance(styleRef, false) : null;
      const libStyle = appr ? areaButtonStyle(appr, false, 'var(--primary-color, #2196F3)') : '';
      // v2026.09.24.143: the individual Preset Button settings reach the CSS as --esc-pct-btn-*
      // VARIABLES, which a library Button Style silently beat because that is applied INLINE and
      // inline always wins. So picking a Button Style wiped every colour/size you had set. The
      // explicitly-set values are the more specific intent, so re-apply them ON TOP of the library
      // look; anything left unset still falls through to the library, then to the theme.
      let ovr = '';
      const _bg = this.cfg.pctButtonBg && this.cfg.pctButtonBg();
      if (_bg) ovr += `background:${_bg};`;
      const _bd = this.cfg.pctButtonBorder && this.cfg.pctButtonBorder();
      if (_bd) ovr += `border-color:${_bd};`;      // keep the library's width/style, change the colour
      const _col = this.cfg.pctButtonColor && this.cfg.pctButtonColor();
      if (_col) ovr += `color:${_col};`;
      const _wt = this.cfg.pctButtonWeight && this.cfg.pctButtonWeight();
      if (_wt) ovr += `font-weight:${_wt};`;
      const _sz = Number(this.cfg.pctButtonSize && this.cfg.pctButtonSize());
      if (_sz > 0) ovr += `font-size:${_sz}px;`;
      const pctStyle = (libStyle || '') + ovr;
      this.setHtmlString(html`
        <div class="${C.ESC_CLASS_BUTTONS} esc-shutter-pct-values" style="${this.cfg.buttonFlexFlow(this.cfg.presetsOrientation())}">
          ${presets.map(p => {
            const pct = Number(p);
            return html`
              <button class="esc-shutter-pct-btn"
                style=${pctStyle || ''}
                ?disabled=${this.cfg.disabledGlobaly()}
                @click=${() => this.shutter.doOnclick(`${C.ACTION_SHUTTER_SET_POS}`, this.cfg.calcOffset(pct))}>
                ${pct}%
              </button>`;
          })}
        </div>
      `);
      return;
    }
    const icons= {
      0: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4Z",
      1: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9Z",
      2: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9M8 12H16V14H8V12Z",
      3: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9M8 12H16V14H8V12M8 15H16V17H8V15Z",
      4: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9M8 12H16V14H8V12M8 15H16V17H8V15M8 18H16V20H8V18Z",
      5: "M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V20H8V18Z",

    }
    const pct= {
      0: C.SHUTTER_OPEN_PCT,
      1: 75,
      2: 50,
      3: 25,
      4: 10,
      5: C.SHUTTER_CLOSED_PCT,
    }

    const pointer={
      0: 0,  // up
      1: 1,  // middle
      2: 1,  // middle
      3: 1,  // middle
      4: 1,  // middle
      5: 2,  // down
    };

    const labels={
      0: `Fully ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_OPEN)}`,
      1: `Partially ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)} ( ${this.cfg.invertPosition(pct[1])}% )`,
      2: `Partially ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)} ( ${this.cfg.invertPosition(pct[2])}% )`,
      3: `Partially ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)} ( ${this.cfg.invertPosition(pct[3])}% )`,
      4: `Partially ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)} ( ${this.cfg.invertPosition(pct[4])}% )`,
      5: `Fully ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)}`,
    };

    const disabled = {
      0: this.cfg.disabledGlobaly() || this.cfg.coverButtonUpDisabled(), // up
      1: this.cfg.disabledGlobaly(), // middle
      2: this.cfg.disabledGlobaly() || this.cfg.coverButtonDownDisabled(), // down
    };
    const click = Object.fromEntries(
      [0, 1, 2, 3, 4, 5].map(j => [j, () => this.shutter.doOnclick(`${C.ACTION_SHUTTER_SET_POS}`, this.cfg.calcOffset(pct[j]))])
    );

    // v2026.09.24.146: previously this emitted a fixed 2x3 grid of ALL six icons, whatever the style's
    // Preset Percentages said — so 'Icons' ignored the value list that 'Values' honoured. Now one
    // button per configured percentage: the icon is picked as the nearest visual match from the set,
    // while the CLICK and the label use the percentage the user actually asked for (the icons only
    // come in six fixed closure steps, so they can only ever approximate an arbitrary value).
    const wanted = this.#pctIconButtons();
    this.setHtmlString(html`
        <div class="${C.ESC_CLASS_BUTTONS} esc-shutter-pct-icons" style="${this.cfg.buttonFlexFlow(this.cfg.presetsOrientation())}">
          ${wanted.map(b => html`
            <ha-icon-button
              label=${b.label}
              .disabled=${disabled[pointer[b.idx]]}
              @click=${() => this.shutter.doOnclick(`${C.ACTION_SHUTTER_SET_POS}`, this.cfg.calcOffset(b.pct))}
              path=${icons[b.idx]}>
            </ha-icon-button>
          `)}
        </div>
    `);
  }
  // One entry per configured percentage: { pct, idx (nearest icon), label }.
  #pctIconButtons(){
    const nominal = [C.SHUTTER_OPEN_PCT, 75, 50, 25, 10, C.SHUTTER_CLOSED_PCT];
    const cfgList = this.cfg.positionPresets ? this.cfg.positionPresets() : [];
    const list = (Array.isArray(cfgList) && cfgList.length) ? cfgList : C.ESC_PARTIAL_PRESETS_DEFAULT;
    return list
      // a chips input yields strings, and Number('') / Number(null) are both 0 — which would turn a
      // blank entry into a spurious "fully closed" button. Reject blanks explicitly, then clamp.
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .map(v => Number(v))
      .filter(v => Number.isFinite(v))
      .map(v => Math.max(C.SHUTTER_CLOSED_PCT, Math.min(C.SHUTTER_OPEN_PCT, v)))
      .map((pct) => {
        let idx = 0;
        nominal.forEach((nv, i) => { if (Math.abs(nv - pct) < Math.abs(nominal[idx] - pct)) idx = i; });
        const open = pct >= C.SHUTTER_OPEN_PCT, shut = pct <= C.SHUTTER_CLOSED_PCT;
        const label = open ? `Fully ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_OPEN)}`
          : shut ? `Fully ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)}`
            : `Partially ${this.cfg.applyInvertOpenCloseUi(C.SHUTTER_STATE_CLOSED)} ( ${this.cfg.invertPosition(pct)}% )`;
        return { pct, idx, label };
      });
  }
  defineSize(){
    const haButtonSize = this.cfg.iconButtonSize();
    // size follows the actual button count, not the retired fixed 2x3 grid
    const n = Math.max(1, this.#pctIconButtons().length);
    let xy = new xyPair(haButtonSize, haButtonSize * n);
    if (!this.cfg.buttonGroupInRow()){
      xy.switch();
    }
    this.setXySize(xy);
  }
}