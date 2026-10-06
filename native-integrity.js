"use strict";

/*
 * native-integrity.js  -  FAMILY: native function / property integrity
 * ---------------------------------------------------------------------
 * Every other family in this run asks "what does this browser have?".
 * This one asks "is what it has actually the browser's?".
 *
 * A spoofing tool cannot change what Chromium compiled. What it CAN do is
 * stand in front of it: replace navigator.userAgent's getter, wrap
 * canvas.toDataURL so the pixels come out slightly different, swap
 * WebGLRenderingContext.prototype.getParameter so UNMASKED_RENDERER lies.
 * Each of those leaves marks, because a JavaScript function cannot
 * perfectly impersonate a C++ one:
 *
 *   1. Source.      Function.prototype.toString on a real native returns
 *                   "function x() { [native code] }". A replacement returns
 *                   its own source, unless the tool also patched toString -
 *                   which is itself detectable, and is checked below.
 *   2. Arity.       Natives have a spec-fixed .length. A wrapper written as
 *                   function (...args) reports 0. This is what the PI means
 *                   by "native parameters", and it survives a patched
 *                   toString, because tools that fake the source rarely
 *                   bother to fake the arity too.
 *   3. Location.    A WebIDL attribute lives as an accessor on the interface
 *                   prototype. Object.defineProperty(navigator, "userAgent",
 *                   ...) puts a property on the INSTANCE instead, shadowing
 *                   the real one. The value is then whatever they want, but
 *                   the property is standing in the wrong place.
 *   4. Shape.       Real accessors are configurable and enumerable with a
 *                   getter and no setter. Redefinitions routinely come out
 *                   as data properties, or non-enumerable, or writable.
 *
 * Deliberately NOT encoded here: a table of what each value "should" be.
 * The whole project's method is that ground truth comes from real reference
 * browsers, not from assumptions baked into the probe. So this records the
 * facts - arity, location, shape, nativeness - and lets analyze.mjs diff them
 * against the references. The only things flagged outright are the ones that
 * are wrong on their face and need nobody's permission to be suspicious.
 */

/*
 * Captured before anything else and used through .call for the rest of the
 * run. If the page has replaced Function.prototype.toString, we want the
 * replacement - reading it through a target function would hide that.
 */
const toStr = Function.prototype.toString;
const getOwnDesc = Object.getOwnPropertyDescriptor;
const getProto = Object.getPrototypeOf;
const getOwnNames = Object.getOwnPropertyNames;

const NATIVE_SOURCE = /^\s*function[^(]*\([^)]*\)\s*\{\s*\[native code\]\s*\}\s*$/;

const ok = (value, detail) => ({ status: "ok", value: value, detail: detail });
const unavailable = reason => ({ status: "unavailable", reason: reason });

/*
 * Targets. Two kinds:
 *   instance: true  - path is rooted at a live object (navigator, screen).
 *                     A property found at depth 0 is an instance shadow.
 *   instance: false - path is rooted at a prototype or namespace, where
 *                     depth 0 is where the property belongs.
 *
 * The list is the set of things anti-detect and fingerprinting tools are
 * actually known to patch, not everything that exists.
 */
const TARGETS = [
  /* --- identity: the values a persona is built out of --- */
  ["navigator.userAgent", true], ["navigator.appVersion", true],
  ["navigator.platform", true], ["navigator.vendor", true],
  ["navigator.oscpu", true], ["navigator.product", true],
  ["navigator.language", true], ["navigator.languages", true],
  ["navigator.hardwareConcurrency", true], ["navigator.deviceMemory", true],
  ["navigator.maxTouchPoints", true], ["navigator.webdriver", true],
  ["navigator.plugins", true], ["navigator.mimeTypes", true],
  ["navigator.userAgentData", true], ["navigator.doNotTrack", true],
  ["navigator.cookieEnabled", true], ["navigator.pdfViewerEnabled", true],

  /* --- screen and viewport --- */
  ["screen.width", true], ["screen.height", true],
  ["screen.availWidth", true], ["screen.availHeight", true],
  ["screen.colorDepth", true], ["screen.pixelDepth", true],
  ["screen.orientation", true],

  /* --- canvas: the classic fingerprint, and the classic patch --- */
  ["HTMLCanvasElement.prototype.toDataURL", false],
  ["HTMLCanvasElement.prototype.toBlob", false],
  ["HTMLCanvasElement.prototype.getContext", false],
  ["OffscreenCanvas.prototype.convertToBlob", false],
  ["CanvasRenderingContext2D.prototype.getImageData", false],
  ["CanvasRenderingContext2D.prototype.measureText", false],
  ["CanvasRenderingContext2D.prototype.fillText", false],
  ["CanvasRenderingContext2D.prototype.isPointInPath", false],

  /* --- WebGL: where the GPU strings get rewritten --- */
  ["WebGLRenderingContext.prototype.getParameter", false],
  ["WebGLRenderingContext.prototype.getExtension", false],
  ["WebGLRenderingContext.prototype.getSupportedExtensions", false],
  ["WebGLRenderingContext.prototype.getShaderPrecisionFormat", false],
  ["WebGLRenderingContext.prototype.readPixels", false],
  ["WebGL2RenderingContext.prototype.getParameter", false],
  ["WebGL2RenderingContext.prototype.getExtension", false],

  /* --- audio fingerprint --- */
  ["AudioBuffer.prototype.getChannelData", false],
  ["AudioBuffer.prototype.copyFromChannel", false],
  ["AnalyserNode.prototype.getFloatFrequencyData", false],
  ["AnalyserNode.prototype.getByteFrequencyData", false],
  ["OfflineAudioContext.prototype.startRendering", false],
  ["BaseAudioContext.prototype.createOscillator", false],

  /* --- fonts and layout: how font lists get hidden --- */
  ["Element.prototype.getBoundingClientRect", false],
  ["Element.prototype.getClientRects", false],
  ["Range.prototype.getBoundingClientRect", false],
  ["HTMLElement.prototype.offsetWidth", false],
  ["HTMLElement.prototype.offsetHeight", false],
  ["FontFaceSet.prototype.check", false],
  ["Document.prototype.fonts", false],

  /* --- time and locale --- */
  ["Date.prototype.getTimezoneOffset", false],
  ["Date.prototype.toString", false],
  ["Intl.DateTimeFormat.prototype.resolvedOptions", false],
  ["Intl.DateTimeFormat.prototype.format", false],
  ["performance.now", true],
  ["Performance.prototype.now", false],

  /* --- media capability claims: the four families instruction 3 covers --- */
  ["HTMLMediaElement.prototype.canPlayType", false],
  ["MediaSource.isTypeSupported", false],
  ["MediaCapabilities.prototype.decodingInfo", false],
  ["MediaCapabilities.prototype.encodingInfo", false],
  ["MediaRecorder.isTypeSupported", false],
  ["SpeechSynthesis.prototype.getVoices", false],

  /* --- WebRTC: patched to stop local IP leaks --- */
  ["RTCPeerConnection.prototype.createOffer", false],
  ["RTCPeerConnection.prototype.createDataChannel", false],
  ["RTCPeerConnection.prototype.setLocalDescription", false],
  ["MediaDevices.prototype.enumerateDevices", false],

  /* --- misc surfaces tools reach for --- */
  ["Navigator.prototype.sendBeacon", false],
  ["Navigator.prototype.getBattery", false],
  ["Permissions.prototype.query", false],
  ["StorageManager.prototype.estimate", false],
  ["Crypto.prototype.getRandomValues", false],
  /*
   * Not marked as instances: Window is a [Global] interface, so by spec its
   * members live as own properties of the object itself. depth 0 is correct
   * here and is not a shadow.
   */
  ["window.matchMedia", false],
  ["window.devicePixelRatio", false],

  /*
   * Meta. If a tool patches Function.prototype.toString to make its other
   * patches look native, this is where it shows: toString cannot report
   * itself as native while lying about everything else without also lying
   * about itself, and the self-check below catches the attempt either way.
   */
  ["Function.prototype.toString", false],
  ["Object.getOwnPropertyDescriptor", false],
  ["Object.defineProperty", false],
  ["Reflect.get", false],
  ["Proxy", false],
  ["Error.captureStackTrace", false]
];

function isNativeSource(fn) {
  try {
    return NATIVE_SOURCE.test(toStr.call(fn));
  } catch (error) {
    /* a Proxy whose get trap throws, or a revoked one */
    return null;
  }
}

function describeFunction(fn) {
  const record = { type: "function", native: isNativeSource(fn) };
  try { record.name = fn.name; } catch (error) { record.name = null; }
  try { record.arity = fn.length; } catch (error) { record.arity = null; }
  try {
    /*
     * A native function owns exactly length and name (plus prototype when it
     * is a constructor). Extra own properties mean something wrapped it, and
     * bound functions and Proxies both show up here.
     */
    record.ownProps = getOwnNames(fn).sort();
  } catch (error) {
    record.ownProps = null;
  }
  try {
    /* Per-function toString override: the cheap way to fake one native. */
    record.ownToString = Object.prototype.hasOwnProperty.call(fn, "toString");
  } catch (error) {
    record.ownToString = null;
  }
  if (record.native === false) {
    try {
      /* Truncated: we want the shape of the patch, not a copy of their tool. */
      record.source = String(toStr.call(fn)).slice(0, 400);
    } catch (error) {
      /* already covered by native === null */
    }
  }
  return record;
}

function describeTarget(path, isInstance) {
  const parts = path.split(".");
  const key = parts.pop();

  let owner;
  try {
    owner = typeof globalThis === "undefined" ? undefined : globalThis;
    for (let i = 0; i < parts.length; i++) {
      if (owner === null || owner === undefined) return { found: false, reason: "path missing at " + parts[i] };
      owner = owner[parts[i]];
    }
  } catch (error) {
    return { found: false, reason: "path threw: " + String((error && error.message) || error) };
  }
  if (owner === null || owner === undefined) return { found: false, reason: "owner is " + String(owner) };

  /* Walk the chain to find where the property actually lives. */
  let holder = owner;
  let depth = 0;
  let desc = null;
  while (holder !== null && holder !== undefined && depth < 16) {
    try {
      desc = getOwnDesc(holder, key);
    } catch (error) {
      return { found: false, reason: "descriptor lookup threw" };
    }
    if (desc) break;
    try { holder = getProto(holder); } catch (error) { break; }
    depth++;
  }
  if (!desc) return { found: false, reason: "not present" };

  const out = {
    found: true,
    depth: depth,
    configurable: desc.configurable,
    enumerable: desc.enumerable
  };
  try {
    const ctor = holder && holder.constructor;
    out.holder = ctor && ctor.name ? ctor.name : null;
  } catch (error) {
    out.holder = null;
  }

  if (typeof desc.get === "function" || typeof desc.set === "function") {
    out.kind = "accessor";
    if (desc.get) out.get = describeFunction(desc.get);
    out.hasSetter = typeof desc.set === "function";
    if (desc.set) out.set = describeFunction(desc.set);
  } else if (typeof desc.value === "function") {
    out.kind = "method";
    out.writable = desc.writable;
    const fn = describeFunction(desc.value);
    for (const k in fn) out[k] = fn[k];
  } else {
    out.kind = "value";
    out.writable = desc.writable;
    out.valueType = desc.value === null ? "null" : typeof desc.value;
  }

  /*
   * The instance-shadow tell. For a path rooted at a live object, a WebIDL
   * attribute belongs on the interface prototype, so depth 0 means somebody
   * put a property directly on the instance to stand in front of the real
   * one. This is what Object.defineProperty(navigator, "userAgent", ...)
   * leaves behind, and it is the single most common spoofing artefact.
   */
  out.instanceShadow = isInstance === true && depth === 0;

  return out;
}

export async function collectNativeIntegrity() {
  if (typeof globalThis === "undefined") return unavailable("no global object");

  const started = Date.now();
  const entries = {};
  const flags = [];
  const counts = { probed: 0, missing: 0, nonNative: 0, instanceShadow: 0, oddShape: 0 };

  /*
   * Self-check first. Everything below is measured THROUGH toString, so if
   * toString is not itself native, every other nativeness answer in this
   * family is worth less and the analyzer needs to know that.
   */
  const toStringIsNative = isNativeSource(toStr);
  const meta = {
    functionToStringIsNative: toStringIsNative,
    /* toString of toString: a patch that special-cases itself fails here */
    functionToStringSelfReport: (function () {
      try { return String(toStr.call(toStr)).slice(0, 200); } catch (error) { return null; }
    })(),
    getOwnPropertyDescriptorIsNative: isNativeSource(getOwnDesc),
    definePropertyIsNative: isNativeSource(Object.defineProperty),
    /* Prototype chains that spoofing sometimes rearranges wholesale */
    navigatorProtoIntact: (function () {
      try {
        return typeof Navigator === "function" && getProto(navigator) === Navigator.prototype;
      } catch (error) { return null; }
    })(),
    screenProtoIntact: (function () {
      try {
        return typeof Screen === "function" && getProto(screen) === Screen.prototype;
      } catch (error) { return null; }
    })()
  };

  if (toStringIsNative === false) {
    flags.push({ path: "Function.prototype.toString", issue: "toStringPatched" });
  }
  if (meta.navigatorProtoIntact === false) {
    flags.push({ path: "navigator", issue: "prototypeDetached" });
  }
  if (meta.screenProtoIntact === false) {
    flags.push({ path: "screen", issue: "prototypeDetached" });
  }

  for (let i = 0; i < TARGETS.length; i++) {
    const path = TARGETS[i][0];
    const isInstance = TARGETS[i][1];
    const key = path.slice(path.lastIndexOf(".") + 1);
    let record;
    try {
      record = describeTarget(path, isInstance);
    } catch (error) {
      record = { found: false, reason: "probe threw: " + String((error && error.message) || error) };
    }
    entries[path] = record;
    counts.probed++;

    if (!record.found) { counts.missing++; continue; }

    const fnPart = record.kind === "accessor" ? record.get : record;
    if (fnPart && fnPart.native === false) {
      counts.nonNative++;
      flags.push({ path: path, issue: "nonNativeSource", arity: fnPart.arity, name: fnPart.name });
    }
    if (record.instanceShadow) {
      counts.instanceShadow++;
      flags.push({ path: path, issue: "instanceShadow", kind: record.kind });
    }
    /*
     * A WebIDL attribute that has become a plain data property. Real ones are
     * accessors on the prototype; this shape means it was redefined.
     */
    if (isInstance && record.kind === "value" && record.depth === 0) {
      counts.oddShape++;
      flags.push({ path: path, issue: "accessorReplacedByValue" });
    }
    if (fnPart && fnPart.ownToString === true) {
      flags.push({ path: path, issue: "ownToStringOverride" });
    }

    /*
     * The two tells below survive a patched Function.prototype.toString, which
     * is the whole point of having them. A tool that fakes the source string
     * has to fake these separately, and in practice does not.
     *
     * methodHasPrototype: a WebIDL operation is not a constructor and owns no
     * .prototype. A stand-in written as `function (...args) {...}` does.
     *
     * nameMismatch: a native method's .name is its own property name. A
     * wrapper inherits the name of whatever variable it was assigned from,
     * or is empty for an anonymous one.
     */
    if (record.kind === "method" && path.indexOf(".prototype.") !== -1) {
      if (record.ownProps && record.ownProps.indexOf("prototype") !== -1) {
        counts.oddShape++;
        flags.push({ path: path, issue: "methodHasPrototype", name: record.name });
      }
      if (typeof record.name === "string" && record.name !== key) {
        counts.oddShape++;
        flags.push({ path: path, issue: "nameMismatch", name: record.name, expected: key });
      }
    }
  }

  return ok(
    { meta: meta, counts: counts, flags: flags, entries: entries, elapsedMs: Date.now() - started },
    counts.nonNative + counts.instanceShadow === 0
      ? "no tampering detected in " + counts.probed + " targets"
      : counts.nonNative + " non-native, " + counts.instanceShadow + " instance-shadowed"
  );
}
