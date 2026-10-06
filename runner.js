"use strict";

/*
 * runner.js
 * ---------
 * Orchestrates every probe family into one result document per browser
 * configuration, and records the *persona* the browser advertises alongside
 * the raw surface it actually exposes.
 *
 * The persona block is what makes the offline comparison possible. A probe
 * result on its own says "SomeFeature is present". Only together with
 * "this browser claims to be Chrome 120 on Windows" does that become
 * "claims 120, but exposes an API that shipped in 131".
 *
 * COLLECTION ONLY. Nothing here decides whether a browser is genuine.
 */

/*
 * Families are loaded with dynamic import() at run time rather than static
 * imports at the top of this file, and that is deliberate.
 *
 * With static imports, the seven probe modules form one module graph: if any
 * single module fails to parse or throws while evaluating — which is exactly
 * what happens when a module written against Chromium is opened in Firefox —
 * the whole graph fails, this file never evaluates, and the page's click
 * handler is never attached. The symptom is a button that does nothing and no
 * indication of why.
 *
 * Loading each family separately means a module that is broken in one engine
 * costs you that one family, reported as `unavailable` with the reason
 * attached, while the other six still produce data. For a study that
 * deliberately runs the same code across different engines, that isolation is
 * not a nicety.
 */
/*
 * No optional chaining or nullish coalescing in this file, for the same reason
 * as index.html: a parse error here is fatal to the entire run, and this is
 * the module that reports which OTHER modules an engine could not handle. It
 * has to outlive them. See the note in index.html.
 */
const nullish = (value, fallback) => (value === null || value === undefined) ? fallback : value;
const message = error => String((error && error.message) || error);

/*
 * No single family may stall the whole run.
 *
 * Some platform queries return a promise that simply never settles rather than
 * resolving or rejecting — navigator.mediaCapabilities.decodingInfo() for HEVC
 * on some OS/browser combinations is one, and it hung a Firefox-on-macOS run
 * indefinitely at the media family. Since media.js awaits Promise.all over its
 * cases, one unsettled promise there means the page waits forever and nothing
 * is ever saved.
 *
 * The guard lives here rather than in any one probe because the failure mode
 * is generic: any family that touches the platform can hit it. A family that
 * exceeds the budget is recorded as unavailable and the run carries on.
 *
 * Note the hung promise is not cancelled — it cannot be. It keeps running in
 * the background and is simply no longer waited on.
 */
const FAMILY_TIMEOUT_MS = 45000;

function withTimeout(promise, ms, label) {
  let timer;

  const timeout = new Promise(resolve => {
    timer = setTimeout(
      () => resolve({
        status: "unavailable",
        reason:
          `${label} did not finish within ${ms} ms and was abandoned. This ` +
          "usually means a platform query returned a promise that never " +
          "settles, rather than the probe being slow."
      }),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const FAMILIES = Object.freeze([
  { id: "engineSurface", label: "Engine / build surface", module: "./engine-surface.js", export: "collectEngineSurface" },
  { id: "bcdSurface", label: "BCD feature surface", module: "./bcd-surface.js", export: "collectBcdSurface" },
  { id: "bcdSurfaceWorker", label: "BCD feature surface (worker)", module: "./worker-surface.js", export: "collectBcdSurfaceWorker" },
  { id: "bcdSurfaceIframe", label: "BCD feature surface (iframe)", module: "./iframe-surface.js", export: "collectBcdSurfaceIframe", timeoutMs: 120000 },
  { id: "bcdSurfaceServiceWorker", label: "BCD feature surface (service worker)", module: "./sw-surface.js", export: "collectBcdSurfaceServiceWorker", timeoutMs: 150000 },
  { id: "nativeIntegrity", label: "Native function integrity", module: "./native-integrity.js", export: "collectNativeIntegrity" },
  { id: "webgpu", label: "WebGPU adapter surface", module: "./webgpu-surface.js", export: "collectWebgpu" },
  { id: "capabilities", label: "Categorical capabilities", module: "./categorical-capabilities.js", export: "collectCategoricalCapabilities" },
  { id: "capabilityVerify", label: "Claimed vs actual capability", module: "./capability-verify.js", export: "collectCapabilityVerify", timeoutMs: 60000 },
  { id: "audio", label: "Audio", module: "./audio.js", export: "collectAudio" },
  { id: "media", label: "Media", module: "./media.js", export: "collectMedia" },
  { id: "text", label: "Text rendering", module: "./text.js", export: "collectTextRendering" },
  { id: "videoDecode", label: "Video decode", module: "./video-decode.js", export: "collectVideoDecode" }
]);

/**
 * Load one family's collector. Returns the function, or a description of why
 * it could not be loaded — never throws.
 */
async function loadFamily(family) {
  let namespace;

  try {
    namespace = await import(family.module);
  } catch (error) {
    return {
      error:
        `module ${family.module} failed to load: ` +
        `${message(error)}. This usually means the module ` +
        "uses syntax or a top-level global this engine does not have."
    };
  }

  const collector = namespace ? namespace[family.export] : undefined;

  if (typeof collector !== "function") {
    return { error: `module ${family.module} has no export "${family.export}"` };
  }

  return { collector };
}

/*
 * Brand lists from UA-CH carry a deliberate GREASE entry with a random-looking
 * brand and version. Filter those out before trying to read a version, or the
 * claimed version becomes noise.
 */
const GREASE = /not[\s\-_.:;/"'?)(]*a[\s\-_.:;/"'?)(]*brand/i;

const UA_PATTERNS = Object.freeze([
  { name: "Edge", re: /Edg(?:e|A|iOS)?\/(\d+)(?:\.(\d+))?/ },
  { name: "Opera", re: /OPR\/(\d+)(?:\.(\d+))?/ },
  { name: "Samsung Internet", re: /SamsungBrowser\/(\d+)(?:\.(\d+))?/ },
  { name: "Firefox", re: /(?:Firefox|FxiOS)\/(\d+)(?:\.(\d+))?/ },
  { name: "Chrome", re: /(?:Chrome|CriOS|Chromium)\/(\d+)(?:\.(\d+))?/ },
  { name: "Safari", re: /Version\/(\d+)(?:\.(\d+))?.*Safari\// }
]);

function parseUserAgent(ua) {
  for (const { name, re } of UA_PATTERNS) {
    const match = re.exec(ua);
    if (match) {
      return {
        name,
        major: Number(match[1]),
        version: match[2] ? `${match[1]}.${match[2]}` : match[1]
      };
    }
  }

  return { name: null, major: null, version: null };
}

async function collectPersona() {
  const ua = navigator.userAgent || "";
  const fromUa = parseUserAgent(ua);

  let highEntropy = null;
  let brands = null;

  const uaData = navigator.userAgentData;

  if (uaData) {
    brands = (uaData.brands || []).filter(b => !GREASE.test(b.brand || ""));

    try {
      highEntropy = await uaData.getHighEntropyValues([
        "architecture",
        "bitness",
        "model",
        "platform",
        "platformVersion",
        "uaFullVersion",
        "fullVersionList",
        "wow64",
        "formFactors"
      ]);
    } catch (error) {
      highEntropy = { __err: message(error) };
    }
  }

  /*
   * Prefer the UA-CH full version list where present: it is the field an
   * anti-detect browser is most likely to set consistently, which makes a
   * disagreement with the UA string itself a finding in its own right.
   */
  let fromBrands = { name: null, major: null, version: null };

  const list = (highEntropy && highEntropy.fullVersionList) || brands;
  if (Array.isArray(list)) {
    const pick =
      list.find(b => /^(Google Chrome|Microsoft Edge|Opera|Brave)$/i.test(b.brand)) ||
      list.find(b => !GREASE.test(b.brand || "")) ||
      null;

    if (pick) {
      fromBrands = {
        name: pick.brand,
        major: Number(String(pick.version).split(".")[0]),
        version: String(pick.version)
      };
    }
  }

  return {
    userAgent: ua,
    appVersion: navigator.appVersion,
    platform: navigator.platform,
    vendor: navigator.vendor,
    vendorSub: navigator.vendorSub,
    product: navigator.product,
    productSub: navigator.productSub,
    oscpu: nullish(navigator.oscpu, null),
    buildID: nullish(navigator.buildID, null),
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : null,
    hardwareConcurrency: nullish(navigator.hardwareConcurrency, null),
    deviceMemory: nullish(navigator.deviceMemory, null),
    timeZone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        return null;
      }
    })(),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio
    },
    webdriver: nullish(navigator.webdriver, null),

    /*
     * Secure context is load-bearing for comparability, not a footnote.
     * Around 1,500 of the ~10,400 probed features are secure-context gated —
     * ServiceWorker, SubtleCrypto, WebUSB, WebHID, Bluetooth, Credential
     * Management, PaymentRequest, the sensor APIs. A browser reached over
     * http://127.0.0.1 has them; the same browser reached over
     * http://192.168.x.x does not, because only localhost is a trustworthy
     * origin over plain HTTP.
     *
     * Two runs collected over different origins are therefore not comparable
     * at all, and the difference looks exactly like an engine that is missing
     * 1,500 features. Recording the origin makes that detectable instead of
     * silently wrong.
     */
    secureContext: typeof isSecureContext === "boolean" ? isSecureContext : null,
    origin: location.origin,
    uaData: uaData ? { brands, mobile: uaData.mobile, platform: uaData.platform } : null,
    highEntropy,

    /*
     * Two independent readings of "who do you say you are". They are kept
     * apart on purpose: a browser whose UA string and UA-CH brand list
     * disagree has already failed a consistency check that costs nothing to
     * run, and that disagreement is a finding in itself.
     */
    claimed: (() => {
      const agrees =
        !fromBrands.major ||
        !fromUa.major ||
        fromBrands.major === fromUa.major;

      /*
       * When the two disagree, resolve to the HIGHER claimed version. The
       * offline diff flags features that exist but should not have shipped
       * yet, so the higher claim is the one that yields the fewest such
       * flags. Taking the generous reading means a premature feature is a
       * finding under *either* interpretation of the persona, rather than an
       * artefact of having picked the stricter one.
       */
      const resolved =
        !fromBrands.major ? fromUa
        : !fromUa.major ? fromBrands
        : fromBrands.major >= fromUa.major ? fromBrands : fromUa;

      return { fromUserAgent: fromUa, fromBrands, resolved, agrees };
    })()
  };
}

/**
 * Run every probe family.
 *
 * @param {object}   options
 * @param {string}   options.label      Name for this configuration, e.g. "gologin-default".
 * @param {string[]} options.only       Family ids to run; omit for all.
 * @param {Function} options.onProgress Called as ({ index, total, family, status }).
 */
export async function runAll(options = {}) {
  const { label = "unlabelled", only = null, onProgress = () => {} } = options;

  const families = only ? FAMILIES.filter(f => only.includes(f.id)) : FAMILIES;

  const document_ = {
    schema: "browser-engine-tests/result@1",
    label,
    collectedAt: new Date().toISOString(),
    persona: await collectPersona(),
    probes: {}
  };

  let index = 0;

  for (const family of families) {
    index += 1;
    onProgress({ index, total: families.length, family, status: "running" });

    const started = performance.now();

    const { collector, error: loadError } = await loadFamily(family);

    if (loadError) {
      document_.probes[family.id] = { status: "unavailable", reason: loadError };
    } else {
      try {
        /*
         * Families are run in sequence, not in parallel. Several of them time
         * things or contend for the audio/video pipeline, and running them
         * concurrently would let one family's load perturb another's numbers.
         */
        document_.probes[family.id] = await withTimeout(
          Promise.resolve(collector()),
          family.timeoutMs || FAMILY_TIMEOUT_MS,
          family.label
        );
      } catch (error) {
        document_.probes[family.id] = {
          status: "failed",
          error: message(error)
        };
      }
    }

    document_.probes[family.id].elapsedMs = Math.round(performance.now() - started);

    onProgress({ index, total: families.length, family, status: "done" });
  }

  return document_;
}
