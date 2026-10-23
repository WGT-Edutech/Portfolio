/*!
 * Portfolio site config  (config.js)
 *
 * ONE self-contained file. No dependencies, no build step.
 * Reads ?cfg=<base64url> from the page URL and exposes it as window.PortfolioConfig.
 *
 *   <script src="config.js"></script>
 *   <script>
 *     var CFG = window.PortfolioConfig;
 *     // if (CFG.applied) rebuild geometry / textures / dom as needed
 *     var ringRadius = CFG.params.P_RING;
 *   </script>
 *
 * With NO ?cfg= parameter: CFG.applied === false and CFG.params === DEFAULTS,
 * so `CFG.params.X || default` is always the default — behaviour is unchanged.
 */
(function (root) {
  'use strict';

  var FORMAT_VERSION = 1;

  // ── Defaults (kept in sync with the schema by the test suite) ──────────
  var DEFAULTS = {
    P_COUNT: 200, P_RING: 7, P_X: 0, P_Y: 0, P_Z: 0, P_SIZE: 0.65, P_BREATH: 0.8, P_SPEED: 0.4,
    P_IW: 0.55, P_PULSE_SPEED: 0.6, P_PULSE_AMP: 0.5, P_COLOR: '#c84bff', P_OPACITY: 1,
    P_ORBIT_SPEED: 0.5,
    B_COUNT: 250, B_RING: 10, B_X: 0, B_Y: 0, B_Z: -2, B_IW: 0.55,
    B_SIZE: 0.7, B_PULSE_SPEED: 0.525, B_PULSE_AMP: 0.65, B_COLOR: '#ff2dbe',
    B_SPEED: 0.4, B_BREATH: 0.8,
    M_MAG_X: 28, M_MAG_Y: 16, M_MAG_Z: 2, M_FORCE_NEAR: 12, M_FORCE_FAR: 20,
    M_LERP_NEAR: 0.12, M_FORCE_BG: 14, M_FORCE_BG_MAX: 18, M_LERP_BG: 0.14, M_SMOOTH: 0.35,
    VP_RADIUS: 150, VP_W_MIN: 400, VP_W_MAX: 1000, VP_OPS_MIN: 9, VP_OPS_MAX: 40,
    DNA_COUNT: 13, DNA_LERP: 0.08, DNA_SPINS: 12, DNA_TILT: 25,
    DNA_GLOW_1: 7, DNA_GLOW_2: 18, DNA_GLOW_3: 38, DNA_COLOR: '#a06ef7', DNA_BASE_OPACITY: 0.25,
    G_CARD_W: 420, G_CARD_H: 280, G_ACTIVE_TZ: 120, G_SIDE_TX: 370, G_SIDE_TZ: -130,
    G_SIDE_RY: 32, G_FAR_TX: 550, G_FAR_TZ: -230, G_FAR_RY: 42, G_BACK_TZ: -400,
    G_STIFF: 0.08, G_DAMP: 0.72, G_REFLECT_OPACITY: 0.55,
    R1_H: 1000, R2_H: 1100, R3_H: 1000, R4_H: 500, R5_H: 120, R6_H: 2300,
    AUTO_DELAY: 4000, AUTO_SPEED_DIV: 80, AUTO_ENABLED: true,
    CAM_FOV: 48, CAM_X: 0, CAM_Y: 0.8, CAM_Z: 7,
    VP_POINT_X: 50, VP_POINT_Y: 50, VP_DEPTH: 1200, ELEMENTS: '',
    ACCENT: '#8b5cf6', TEXT: '#f4f1ea', VP_COLOR: '#5b4dff'
  };

  // ── base64url helpers (Node + browser) ─────────────────────────────────
  function hasBuffer() { return typeof Buffer !== 'undefined' && Buffer.from; }

  function b64urlEncode(str) {
    var b64;
    if (hasBuffer()) { b64 = Buffer.from(str, 'utf8').toString('base64'); }
    else { b64 = btoa(unescape(encodeURIComponent(str))); }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    if (typeof s !== 'string') return null;
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
      if (hasBuffer()) { return Buffer.from(b64, 'base64').toString('utf8'); }
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) { return null; }
  }

  // ── decode ?cfg= ───────────────────────────────────────────────────────
  function readFromURL(href) {
    var s = typeof href === 'string' ? href : String((root && root.location && root.location.href) || '');
    var m = s.match(/[?&]cfg=([^&#]+)/);
    if (!m) return null;
    var json = b64urlDecode(decodeURIComponent(m[1]));
    if (json === null) return null;
    var payload;
    try { payload = JSON.parse(json); } catch (e) { return null; }
    if (!payload || typeof payload !== 'object') return null;
    if (payload.v !== FORMAT_VERSION) return null;
    if (!payload.d || typeof payload.d !== 'object') return null;
    return payload.d;   // delta: { KEY: value, ... }
  }

  // ── merge delta over defaults ──────────────────────────────────────────
  function merge(delta) {
    var params = {};
    Object.keys(DEFAULTS).forEach(function (k) { params[k] = DEFAULTS[k]; });
    if (delta && typeof delta === 'object') {
      Object.keys(delta).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) params[k] = delta[k];
      });
    }
    return params;
  }

  // ── read once at load ──────────────────────────────────────────────────
  var delta = readFromURL();
  var params = merge(delta);

  // A rebuild is needed only when a structural key actually changed.
  function anyChanged(keys) {
    if (!delta) return false;
    for (var i = 0; i < keys.length; i++) {
      if (delta[keys[i]] !== undefined) return true;
    }
    return false;
  }

  var GEOMETRY_KEYS = ['P_COUNT', 'B_COUNT'];
  var TEXTURE_KEYS  = ['P_HUE', 'B_HUE'];
  var DOM_KEYS      = ['DNA_COUNT'];
  var CSS_KEYS      = ['G_CARD_W', 'G_CARD_H', 'G_REFLECT_OPACITY'];
  var SCROLL_KEYS   = ['R1_H', 'R2_H', 'R3_H', 'R4_H', 'R5_H', 'R6_H'];

  var api = {
    applied: !!delta && Object.keys(delta).length > 0,
    version: FORMAT_VERSION,
    params: params,
    delta: delta || {},
    defaults: DEFAULTS,
    changed: function (key) { return !!(delta && delta[key] !== undefined); },
    anyChanged: anyChanged,
    needsGeometry: anyChanged(GEOMETRY_KEYS),
    needsTexture: anyChanged(TEXTURE_KEYS),
    needsDom: anyChanged(DOM_KEYS),
    needsCss: anyChanged(CSS_KEYS),
    needsScroll: anyChanged(SCROLL_KEYS),
    // convenience: true when the config should be surfaced in the UI
    describe: function () {
      return Object.keys(delta || {}).map(function (k) {
        return k + ': ' + String(DEFAULTS[k]) + ' -> ' + String(delta[k]);
      });
    },
    _internals: { b64urlEncode: b64urlEncode, b64urlDecode: b64urlDecode, readFromURL: readFromURL }
  };

  root.PortfolioConfig = api;

  if (typeof module === 'object' && module.exports) { module.exports = api; }
})(typeof self !== 'undefined' ? self : this);
