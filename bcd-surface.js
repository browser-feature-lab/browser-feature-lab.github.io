"use strict";

/*
 * bcd-surface.js  -  FAMILY: engine / API surface vs. MDN compat ground truth
 * ---------------------------------------------------------------------------
 * Probes the *presence* of a large set of web-platform and JavaScript features
 * whose introduction version is documented by MDN browser-compat-data (BCD).
 *
 * The manifest (data/feature-manifest.json) is generated offline by
 * tools/build-ground-truth.mjs. This module deliberately contains no knowledge
 * of which browser should have which feature: it only reports what is present.
 * Comparison against BCD happens offline, in tools/analyze.mjs.
 *
 * Why presence is load-bearing here:
 *   An anti-detect browser advertises a persona (say "Chrome 120") through the
 *   UA string, UA-CH, and assorted navigator fields. The underlying engine is a
 *   different build. Every feature BCD says landed in Chrome 121..N is then a
 *   one-bit oracle: if the persona claims 120 and the feature is present, the
 *   persona is contradicted by its own engine. Enough such bits bracket the
 *   real engine version.
 *
 * RAW SURFACE ONLY. No scoring, no classification.
 */

/*
 * The result envelope is duplicated here rather than imported from common.js,
 * and this file avoids optional chaining and nullish coalescing. Both choices
 * exist so that this family has no dependency an older engine could choke on:
 * common.js uses modern syntax, and importing it would make this module fail
 * wherever that syntax is unsupported. Of all the families, this is the one
 * whose job is measuring what an engine does and does not have, so it is the
 * one that most needs to run on engines that have less.
 */
const ok = (value, detail, confidence = "high") => ({ status: "ok", value, detail, confidence });
const unavailable = reason => ({ status: "unavailable", reason });
const failed = error => ({ status: "failed", error: String((error && error.message) || error) });
const nullish = (value, fallback) => (value === null || value === undefined) ? fallback : value;

/*
 * BCD spells well-known symbols "@@iterator"; map the ones that appear.
 *
 * Object.create(null) is load-bearing, not style. With a normal object
 * literal, `"toString" in SYMBOLS` is TRUE — inherited from Object.prototype —
 * so a lookup for the ordinary method name "toString" returned
 * Object.prototype.toString, a function, which was then used as a property
 * key. Every feature named toString, valueOf, constructor, hasOwnProperty or
 * toLocaleString silently read as absent. A null-prototype map has nothing to
 * inherit, so a name is found only if it was actually put there.
 */
const SYMBOLS = Object.assign(Object.create(null), {
  "@@iterator": Symbol.iterator,
  "@@asyncIterator": Symbol.asyncIterator,
  "@@hasInstance": Symbol.hasInstance,
  "@@toPrimitive": Symbol.toPrimitive,
  "@@toStringTag": Symbol.toStringTag,
  "@@species": Symbol.species,
  "@@unscopables": Symbol.unscopables,
  "@@match": Symbol.match,
  "@@matchAll": Symbol.matchAll,
  "@@replace": Symbol.replace,
  "@@search": Symbol.search,
  "@@split": Symbol.split,
  "@@isConcatSpreadable": Symbol.isConcatSpreadable,
  "@@asyncDispose": Symbol.asyncDispose,
  "@@dispose": Symbol.dispose
});

const key = name => (SYMBOLS[name] !== undefined ? SYMBOLS[name] : name);

/** `property in object`, never throwing, for hostile/exotic receivers. */
function has(object, property) {
  if (object == null) return false;

  const resolved = key(property);
  if (resolved === undefined) return false;

  try {
    return resolved in Object(object);
  } catch {
    return false;
  }
}

/*
 * Resolve a dotted target against the global object. BCD nests real objects
 * several levels deep (Intl.DateTimeFormat, Temporal.PlainDate,
 * WebAssembly.Module), so the manifest may hand us "Intl.DateTimeFormat" as a
 * single target. Walks with `in` guards so a missing intermediate yields
 * undefined instead of throwing.
 */
/*
 * Where to find a live instance of an interface.
 *
 * Checking `Interface.prototype` is not enough, and for some interfaces it is
 * actively wrong. In Chrome `Window.prototype` has THREE own properties and
 * `Location.prototype` has one: `alert`, `document`, `location.href` and
 * hundreds of others live on the instance itself, because [Global] and
 * [LegacyUnforgeable] interfaces put their members there. Probing only the
 * prototype reported all of them missing — roughly a hundred false absences
 * per run, which is what made a stock browser look like it was hiding things.
 *
 * These are all cheap, already-constructed singletons; nothing here builds an
 * object or has a side effect.
 */
const INSTANCE_SOURCES = Object.assign(Object.create(null), {
  Window: () => globalThis,
  WorkerGlobalScope: () => globalThis,
  DedicatedWorkerGlobalScope: () => globalThis,
  SharedWorkerGlobalScope: () => globalThis,
  Document: () => globalThis.document,
  Location: () => globalThis.location,
  Navigator: () => globalThis.navigator,
  WorkerNavigator: () => globalThis.navigator,
  WorkerLocation: () => globalThis.location,
  Screen: () => globalThis.screen,
  History: () => globalThis.history,
  Console: () => globalThis.console,
  Performance: () => globalThis.performance,
  Storage: () => globalThis.localStorage,
  CSS: () => globalThis.CSS,
  Crypto: () => globalThis.crypto,
  SubtleCrypto: () => globalThis.crypto && globalThis.crypto.subtle,
  CustomElementRegistry: () => globalThis.customElements,
  VisualViewport: () => globalThis.visualViewport,
  Navigation: () => globalThis.navigation,
  Scheduler: () => globalThis.scheduler,
  SpeechSynthesis: () => globalThis.speechSynthesis,
  CacheStorage: () => globalThis.caches,
  IDBFactory: () => globalThis.indexedDB,
  GPU: () => globalThis.navigator && globalThis.navigator.gpu,
  Clipboard: () => globalThis.navigator && globalThis.navigator.clipboard,
  Permissions: () => globalThis.navigator && globalThis.navigator.permissions,
  MediaDevices: () => globalThis.navigator && globalThis.navigator.mediaDevices,
  Geolocation: () => globalThis.navigator && globalThis.navigator.geolocation,
  StorageManager: () => globalThis.navigator && globalThis.navigator.storage,
  MediaCapabilities: () => globalThis.navigator && globalThis.navigator.mediaCapabilities,
  WakeLock: () => globalThis.navigator && globalThis.navigator.wakeLock,
  UserActivation: () => globalThis.navigator && globalThis.navigator.userActivation,
  NavigatorUAData: () => globalThis.navigator && globalThis.navigator.userAgentData,
  Serial: () => globalThis.navigator && globalThis.navigator.serial,
  Bluetooth: () => globalThis.navigator && globalThis.navigator.bluetooth,
  HID: () => globalThis.navigator && globalThis.navigator.hid,
  USB: () => globalThis.navigator && globalThis.navigator.usb
});

function instanceOf(name) {
  const source = INSTANCE_SOURCES[name];
  if (!source) return undefined;

  try {
    return source();
  } catch {
    return undefined;
  }
}

function globalValue(path) {
  try {
    let current = globalThis;

    for (const segment of String(path).split(".")) {
      if (current == null) return undefined;
      current = current[segment];
    }

    return current;
  } catch {
    return undefined;
  }
}

/*
 * Probe kinds. The manifest gives an explicit kind per feature so that this
 * side stays a dumb switch: no path parsing, no eval, nothing that could be
 * influenced by manifest content beyond the fixed set below.
 */
const PROBES = Object.freeze({
  /*
   * api.Foo / javascript.builtins.Foo -> is the name defined at all?
   *
   * Tested with `in`, not `typeof x !== "undefined"`. The global `undefined`
   * is itself a documented BCD feature, and its value is of course undefined,
   * so a typeof test reports the one global that definitely exists as absent.
   * `NaN` and `Infinity` have the same shape of problem if their values are
   * ever used as the test.
   */
  global(entry) {
    const path = String(entry.target).split(".");
    let owner = globalThis;

    for (let index = 0; index < path.length - 1; index += 1) {
      owner = owner == null ? undefined : owner[path[index]];
      if (owner == null) return false;
    }

    return has(owner, path[path.length - 1]);
  },

  /*
   * api.Foo.bar / javascript.builtins.Foo.bar. BCD does not consistently
   * distinguish instance from static members, and several interfaces expose a
   * name in both places, so probe both and report where it landed. `where`
   * is itself a signal: an engine that patches a method onto the instance
   * rather than the prototype shows up here.
   */
  member(entry) {
    const owner = globalValue(entry.target);
    const instance = instanceOf(entry.target);

    if (owner === undefined && instance === undefined) return false;

    const onProto = owner !== undefined && has(owner.prototype, entry.member);
    const onCtor = owner !== undefined && has(owner, entry.member);
    const onInstance = instance !== undefined && has(instance, entry.member);

    if (!onProto && !onCtor && !onInstance) return false;

    /*
     * Report WHERE the member was found, not just that it exists. An engine
     * that patches a method onto the instance when it belongs on the
     * prototype has left a fingerprint of its own, and that is exactly the
     * kind of tampering this study is looking for.
     */
    if (onProto) return onCtor ? "both" : "proto";
    if (onCtor) return "static";
    return "instance";
  },

  /*
   * api.Foo.Foo -> the constructor.
   *
   * Recorded but NOT scored; the generator marks these unreliable. There is
   * no safe way to ask "is this constructible" from script:
   *
   *   Reflect.construct(String, [], Foo) never invokes Foo's own [[Construct]],
   *   so an "Illegal constructor" stub passes — verified against Chrome 141,
   *   where `new CustomElementRegistry()` throws but the trick reports present,
   *   which is how a 141 build appeared to expose a Chrome 146 feature.
   *
   *   Reflect.construct(Foo, []) does invoke it, but then a legitimate
   *   constructor rejecting zero arguments also throws TypeError — the same
   *   signal, opposite meaning — and constructing arbitrary interfaces has
   *   real side effects (Worker spawns a thread, Notification prompts).
   *
   * So the value below is evidence to read by hand, not a bit to count.
   */
  ctor(entry) {
    const owner = globalValue(entry.target);
    if (typeof owner !== "function") return false;

    /*
     * Presence of a callable is not proof of constructability; an interface
     * that only exists as an illegal-constructor stub reads differently from
     * one that is genuinely instantiable. Reflect.construct with a bogus
     * new.target probes constructability without running the constructor
     * body.
     */
    try {
      Reflect.construct(String, [], owner);
      return true;
    } catch (error) {
      /*
       * An interface object can exist long before it becomes constructible.
       * `CustomElementRegistry` has been a global for years, but
       * `new CustomElementRegistry()` only started working in Chrome 146.
       * Counting the bare interface object as the constructor feature made a
       * Chromium 141 look like it was exposing a Chrome 146 API.
       *
       * A TypeError here is the "Illegal constructor" case: the feature is
       * not present. Any other error means the constructor ran and objected
       * to its arguments, which means it exists.
       */
      return error instanceof TypeError ? false : true;
    }
  },

  /* api.Foo.bar_event -> the onbar handler slot. */
  event(entry) {
    const owner = globalValue(entry.target);
    if (owner === undefined) return false;

    const handler = `on${entry.member}`;

    return (
      has(owner.prototype, handler) ||
      has(owner, handler) ||
      has(globalThis, handler)
    );
  },

  /* css.properties.foo -> does the engine claim to parse it? */
  css(entry) {
    try {
      return CSS.supports(entry.target, "initial");
    } catch {
      return false;
    }
  },

  /* css.properties.foo.bar_value -> a specific declared value. */
  cssValue(entry) {
    try {
      return CSS.supports(entry.target, entry.member);
    } catch {
      return false;
    }
  }
});

export async function collectBcdSurface(options = {}) {
  try {
    const manifestUrl = options.manifestUrl || "./data/feature-manifest.json";

    let manifest;
    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) {
        return unavailable(
          `feature manifest HTTP ${response.status} at ${manifestUrl}; ` +
            "run `npm run build:truth` first"
        );
      }
      manifest = await response.json();
    } catch (error) {
      return unavailable(
        `feature manifest unreadable (${(error && error.message) || error}). This module needs ` +
          "the page served over http(s); file:// will not work."
      );
    }

    const entries = manifest ? manifest.features : null;
    if (!Array.isArray(entries) || entries.length === 0) {
      return unavailable("feature manifest contained no features");
    }

    const present = {};
    const detail = {};
    let supported = 0;
    let skipped = 0;

    const started = performance.now();

    for (const entry of entries) {
      const probe = PROBES[entry.kind];

      if (!probe) {
        skipped += 1;
        continue;
      }

      let outcome;
      try {
        outcome = probe(entry);
      } catch {
        outcome = false;
      }

      /*
       * Store the compact form: true/false for the common case, and the
       * string variant ("proto" | "static" | "both" | "not-constructible")
       * only where it carries extra information. Keeps the payload small
       * enough to move around as JSON across thousands of features.
       */
      if (outcome === false) {
        present[entry.id] = false;
      } else if (outcome === true) {
        present[entry.id] = true;
        supported += 1;
      } else {
        present[entry.id] = true;
        detail[entry.id] = outcome;
        supported += 1;
      }
    }

    const elapsedMs = performance.now() - started;

    return ok(
      {
        manifest: {
          version: nullish(manifest.manifestVersion, null),
          bcdVersion: nullish(manifest.bcdVersion, null),
          generatedAt: nullish(manifest.generatedAt, null),
          mode: nullish(manifest.mode, null)
        },
        counts: {
          probed: entries.length - skipped,
          skipped,
          supported,
          absent: entries.length - skipped - supported
        },
        elapsedMs: Math.round(elapsedMs),
        present,
        detail
      },
      "Feature presence against the MDN browser-compat-data manifest. " +
        "Presence is a property of the engine build, not of the advertised " +
        "persona; the two are compared offline. Extensions, enterprise " +
        "policy, feature flags and origin trials can also move these bits.",
      "high"
    );
  } catch (error) {
    return failed(error);
  }
}
