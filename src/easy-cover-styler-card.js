/**
 * Easy Cover Styler Card for Home Assistant (formerly Flex Cover Card / Enhanced Shutter Card)
 * HA-dev-page for cover:
 * https://developers.home-assistant.io/docs/core/entity/cover
 *
 * Version: 2026.09.24.153  (CARD_VERSION in constants.js is the single source of truth)
 *
 * Release history: see CHANGELOG.md in the repo root.
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


