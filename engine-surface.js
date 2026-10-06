"use strict";

/*
 * engine-surface.js  -  FAMILY: engine / build surface
 * ----------------------------------------------------
 * Static, non-timing values that mostly reflect the JavaScript engine, browser
 * build, ICU data, feature configuration, or runtime policy:
 *   - property enumeration order on built-in prototypes,
 *   - native-function serialization (Function.prototype.toString output),
 *   - engine-generated error text and stack grammar (locations normalized),
 *   - browser-family globals often inherited from the real engine,
 *   - Intl / number formatting and deterministic Math outputs.
 *
 * This module RETURNS RAW SURFACE ONLY. It does not score or name an engine
 * family. (The previous build had a weighted engine classifier; it has been
 * removed on purpose - we collect signals, we do not classify.) Interpretation
 * is offline, as a vector against genuine reference distributions.
 */

import { ok, failed } from "./common.js";

const nativeString = fn => {
  try {
    return Function.prototype.toString.call(fn);
  } catch (error) {
    return `__err:${error?.message}`;
  }
};

const ownNames = object => {
  try {
    return Object.getOwnPropertyNames(object);
  } catch {
    return ["__err"];
  }
};

const protoNames = object => {
  try {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(object));
  } catch {
    return ["__err"];
  }
};

export function collectEngineSurface() {
  try {
    const result = {};

    // Property enumeration order. Built-in property sets and their order vary
    // across engines/versions; redefining spoofed properties can also disturb
    // natural position.
    result.order = {
      navigatorProto: protoNames(navigator),
      navigatorOwn: ownNames(navigator),
      windowHead: ownNames(window).slice(0, 120),
      windowProto: protoNames(window),
      documentProto: protoNames(document),
      screenProto: protoNames(screen),
      locationProto: protoNames(location)
    };

    // Native-function serialization. Wrapped/overridden functions can expose
    // wrapper source instead of the expected native representation.
    result.tostr = {
      eval: nativeString(eval),
      fetch: nativeString(typeof fetch !== "undefined" ? fetch : function () {}),
      getContext: nativeString(HTMLCanvasElement.prototype.getContext),
      toDataURL: nativeString(HTMLCanvasElement.prototype.toDataURL),
      getParameter: (() => {
        try {
          return nativeString(WebGLRenderingContext.prototype.getParameter);
        } catch {
          return "__noWebGL";
        }
      })(),
      appendChild: nativeString(Node.prototype.appendChild),
      addEventListener: nativeString(EventTarget.prototype.addEventListener),
      functionToString: nativeString(Function.prototype.toString),
      boundFn: nativeString(function () {}.bind(null))
    };

    // Error text and stack structure. URLs and numbers are normalized so the
    // shape is preserved without page-specific locations.
    const rawStack = (() => {
      try {
        throw new Error("x");
      } catch (error) {
        return error.stack || "";
      }
    })();

    const stackShape = rawStack
      .split("\n")
      .slice(0, 3)
      .map(line =>
        line
          .replace(/https?:\/\/[^\s)]+/g, "URL")
          .replace(/file:\/\/[^\s)]+/g, "FILE")
          .replace(/\d+/g, "N")
      );

    result.err = {
      typeMessage: (() => {
        try {
          null.x;
        } catch (error) {
          return error.message;
        }
      })(),
      typeName: (() => {
        try {
          null.x;
        } catch (error) {
          return error.constructor.name;
        }
      })(),
      rangeMessage: (() => {
        try {
          new Array(-1);
        } catch (error) {
          return error.message;
        }
      })(),
      syntaxMessage: (() => {
        try {
          eval("({");
        } catch (error) {
          return error.message;
        }
      })(),
      stackShape,
      stackHasColumns: /:\d+:\d+(?:\)?$)/m.test(rawStack),
      toStringProto: Error.prototype.toString.call(new Error("m")),
      // Compatibility/API fields only; present across engines. Recorded, not
      // interpreted as engine indicators.
      captureStackTrace: typeof Error.captureStackTrace,
      stackTraceLimit:
        "stackTraceLimit" in Error ? Error.stackTraceLimit : "__absent"
    };

    // Browser-family globals; often inherited from the real engine even when
    // the outward persona is changed.
    result.globals = {
      chromeObject: typeof window.chrome,
      chromeKeys: (() => {
        try {
          return Object.keys(window.chrome || {});
        } catch {
          return "__err";
        }
      })(),
      InstallTrigger: typeof window.InstallTrigger,
      mozInnerScreenX: "mozInnerScreenX" in window,
      webkitStorageInfo: "webkitStorageInfo" in window,
      opr: typeof window.opr,
      oscpu: "oscpu" in navigator ? "present" : "__absent",
      buildID: "buildID" in navigator ? "present" : "__absent",
      taintEnabled: typeof navigator.taintEnabled,
      productSub: navigator.productSub
    };

    // Number / Intl formatting. Reflects engine + ICU + locale + timezone +
    // packaging. Never engine-only.
    result.format = {
      toFixedEdge: (0.1).toFixed(20),
      bigToString: (1e21).toString(),
      smallExp: (1e-7).toString(),
      maxPrecision: (1.7976931348623157e308).toString(),
      intlNumbering: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().numberingSystem;
        } catch {
          return "__err";
        }
      })(),
      intlPluralAr: (() => {
        try {
          return new Intl.PluralRules("ar-EG").select(0);
        } catch {
          return "__err";
        }
      })(),
      currency: (() => {
        try {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
          }).format(1234.5);
        } catch {
          return "__err";
        }
      })(),
      dateEpoch: new Date(0).toTimeString()
    };

    // Deterministic Math outputs. May vary with engine numerics / system math
    // library. Candidate engine/backend evidence only.
    result.math = {
      acos: Math.acos(0.123456789).toString(),
      sinh: Math.sinh(1).toString(),
      tan: Math.tan(-1e300).toString(),
      pow: Math.pow(Math.PI, -100).toString()
    };

    return ok(
      result,
      "Engine/build surface vector. Also influenced by ICU, locale, timezone, " +
        "extensions, feature flags, and policy. Not an engine label.",
      "medium"
    );
  } catch (error) {
    return failed(error);
  }
}
