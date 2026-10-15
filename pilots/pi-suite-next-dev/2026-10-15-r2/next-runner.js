"use strict";
import { collectionOutcome } from "./next/outcomes.js";

/* Fixed PI tests plus MDN feature collection. Browser identity is metadata and never
 * selects the checklist. Change the experiment version when changing checks. */
export const EXPERIMENT = Object.freeze({
  id: "pi-suite-next-dev",
  frozen: false,
  collectorRevision: 2,
  context: "window (text also checks a worker)",
  featureCount: 10396,
  bcdVersion: "7.3.17",
  manifestSha256: "6dd8992ce326416f8535651641eec086e77e41fe26897335d9bf466e5198520d"
});

export const CHECK_SCHEDULE = Object.freeze({
  "videoValidation": [
    "h264-high-annexb/claim",
    "h264-high-annexb/decode/0",
    "h264-high-annexb/decode/1",
    "h264-high-annexb/decode/2",
    "vp9-profile0-lossless/claim",
    "vp9-profile0-lossless/decode/0",
    "vp9-profile0-lossless/decode/1",
    "vp9-profile0-lossless/decode/2",
    "av1-main-lossless/claim",
    "av1-main-lossless/decode/0",
    "av1-main-lossless/decode/1",
    "av1-main-lossless/decode/2",
    "h264-baseline-annexb/claim",
    "h264-baseline-annexb/decode/0",
    "h264-baseline-annexb/decode/1",
    "h264-baseline-annexb/decode/2",
    "h264-main-annexb/claim",
    "h264-main-annexb/decode/0",
    "h264-main-annexb/decode/1",
    "h264-main-annexb/decode/2",
    "vp8-lossy/claim",
    "vp8-lossy/decode/0",
    "vp8-lossy/decode/1",
    "vp8-lossy/decode/2"
  ],
  "webglValidation": [
    "webgl/ANGLE_instanced_arrays/reported",
    "webgl/ANGLE_instanced_arrays/activation",
    "webgl/ANGLE_instanced_arrays/behavioral",
    "webgl/EXT_blend_minmax/reported",
    "webgl/EXT_blend_minmax/activation",
    "webgl/EXT_blend_minmax/behavioral",
    "webgl/EXT_color_buffer_float/reported",
    "webgl/EXT_color_buffer_float/activation",
    "webgl/EXT_color_buffer_float/behavioral",
    "webgl/EXT_color_buffer_half_float/reported",
    "webgl/EXT_color_buffer_half_float/activation",
    "webgl/EXT_color_buffer_half_float/behavioral",
    "webgl/EXT_disjoint_timer_query/reported",
    "webgl/EXT_disjoint_timer_query/activation",
    "webgl/EXT_disjoint_timer_query/behavioral",
    "webgl/EXT_disjoint_timer_query_webgl2/reported",
    "webgl/EXT_disjoint_timer_query_webgl2/activation",
    "webgl/EXT_disjoint_timer_query_webgl2/behavioral",
    "webgl/EXT_float_blend/reported",
    "webgl/EXT_float_blend/activation",
    "webgl/EXT_float_blend/behavioral",
    "webgl/EXT_frag_depth/reported",
    "webgl/EXT_frag_depth/activation",
    "webgl/EXT_frag_depth/behavioral",
    "webgl/EXT_shader_texture_lod/reported",
    "webgl/EXT_shader_texture_lod/activation",
    "webgl/EXT_shader_texture_lod/behavioral",
    "webgl/EXT_sRGB/reported",
    "webgl/EXT_sRGB/activation",
    "webgl/EXT_sRGB/behavioral",
    "webgl/EXT_texture_compression_bptc/reported",
    "webgl/EXT_texture_compression_bptc/activation",
    "webgl/EXT_texture_compression_bptc/behavioral",
    "webgl/EXT_texture_compression_rgtc/reported",
    "webgl/EXT_texture_compression_rgtc/activation",
    "webgl/EXT_texture_compression_rgtc/behavioral",
    "webgl/EXT_texture_filter_anisotropic/reported",
    "webgl/EXT_texture_filter_anisotropic/activation",
    "webgl/EXT_texture_filter_anisotropic/behavioral",
    "webgl/KHR_parallel_shader_compile/reported",
    "webgl/KHR_parallel_shader_compile/activation",
    "webgl/KHR_parallel_shader_compile/behavioral",
    "webgl/OES_element_index_uint/reported",
    "webgl/OES_element_index_uint/activation",
    "webgl/OES_element_index_uint/behavioral",
    "webgl/OES_standard_derivatives/reported",
    "webgl/OES_standard_derivatives/activation",
    "webgl/OES_standard_derivatives/behavioral",
    "webgl/OES_texture_float/reported",
    "webgl/OES_texture_float/activation",
    "webgl/OES_texture_float/behavioral",
    "webgl/OES_texture_float_linear/reported",
    "webgl/OES_texture_float_linear/activation",
    "webgl/OES_texture_float_linear/behavioral",
    "webgl/OES_texture_half_float/reported",
    "webgl/OES_texture_half_float/activation",
    "webgl/OES_texture_half_float/behavioral",
    "webgl/OES_texture_half_float_linear/reported",
    "webgl/OES_texture_half_float_linear/activation",
    "webgl/OES_texture_half_float_linear/behavioral",
    "webgl/OES_vertex_array_object/reported",
    "webgl/OES_vertex_array_object/activation",
    "webgl/OES_vertex_array_object/behavioral",
    "webgl/WEBGL_color_buffer_float/reported",
    "webgl/WEBGL_color_buffer_float/activation",
    "webgl/WEBGL_color_buffer_float/behavioral",
    "webgl/WEBGL_compressed_texture_astc/reported",
    "webgl/WEBGL_compressed_texture_astc/activation",
    "webgl/WEBGL_compressed_texture_astc/behavioral",
    "webgl/WEBGL_compressed_texture_etc/reported",
    "webgl/WEBGL_compressed_texture_etc/activation",
    "webgl/WEBGL_compressed_texture_etc/behavioral",
    "webgl/WEBGL_compressed_texture_etc1/reported",
    "webgl/WEBGL_compressed_texture_etc1/activation",
    "webgl/WEBGL_compressed_texture_etc1/behavioral",
    "webgl/WEBGL_compressed_texture_pvrtc/reported",
    "webgl/WEBGL_compressed_texture_pvrtc/activation",
    "webgl/WEBGL_compressed_texture_pvrtc/behavioral",
    "webgl/WEBGL_compressed_texture_s3tc/reported",
    "webgl/WEBGL_compressed_texture_s3tc/activation",
    "webgl/WEBGL_compressed_texture_s3tc/behavioral",
    "webgl/WEBGL_compressed_texture_s3tc_srgb/reported",
    "webgl/WEBGL_compressed_texture_s3tc_srgb/activation",
    "webgl/WEBGL_compressed_texture_s3tc_srgb/behavioral",
    "webgl/WEBGL_debug_renderer_info/reported",
    "webgl/WEBGL_debug_renderer_info/activation",
    "webgl/WEBGL_debug_renderer_info/behavioral",
    "webgl/WEBGL_debug_shaders/reported",
    "webgl/WEBGL_debug_shaders/activation",
    "webgl/WEBGL_debug_shaders/behavioral",
    "webgl/WEBGL_depth_texture/reported",
    "webgl/WEBGL_depth_texture/activation",
    "webgl/WEBGL_depth_texture/behavioral",
    "webgl/WEBGL_draw_buffers/reported",
    "webgl/WEBGL_draw_buffers/activation",
    "webgl/WEBGL_draw_buffers/behavioral",
    "webgl/WEBGL_lose_context/reported",
    "webgl/WEBGL_lose_context/activation",
    "webgl/WEBGL_lose_context/behavioral",
    "webgl/WEBGL_multi_draw/reported",
    "webgl/WEBGL_multi_draw/activation",
    "webgl/WEBGL_multi_draw/behavioral",
    "webgl2/ANGLE_instanced_arrays/reported",
    "webgl2/ANGLE_instanced_arrays/activation",
    "webgl2/ANGLE_instanced_arrays/behavioral",
    "webgl2/EXT_blend_minmax/reported",
    "webgl2/EXT_blend_minmax/activation",
    "webgl2/EXT_blend_minmax/behavioral",
    "webgl2/EXT_color_buffer_float/reported",
    "webgl2/EXT_color_buffer_float/activation",
    "webgl2/EXT_color_buffer_float/behavioral",
    "webgl2/EXT_color_buffer_half_float/reported",
    "webgl2/EXT_color_buffer_half_float/activation",
    "webgl2/EXT_color_buffer_half_float/behavioral",
    "webgl2/EXT_disjoint_timer_query/reported",
    "webgl2/EXT_disjoint_timer_query/activation",
    "webgl2/EXT_disjoint_timer_query/behavioral",
    "webgl2/EXT_disjoint_timer_query_webgl2/reported",
    "webgl2/EXT_disjoint_timer_query_webgl2/activation",
    "webgl2/EXT_disjoint_timer_query_webgl2/behavioral",
    "webgl2/EXT_float_blend/reported",
    "webgl2/EXT_float_blend/activation",
    "webgl2/EXT_float_blend/behavioral",
    "webgl2/EXT_frag_depth/reported",
    "webgl2/EXT_frag_depth/activation",
    "webgl2/EXT_frag_depth/behavioral",
    "webgl2/EXT_shader_texture_lod/reported",
    "webgl2/EXT_shader_texture_lod/activation",
    "webgl2/EXT_shader_texture_lod/behavioral",
    "webgl2/EXT_sRGB/reported",
    "webgl2/EXT_sRGB/activation",
    "webgl2/EXT_sRGB/behavioral",
    "webgl2/EXT_texture_compression_bptc/reported",
    "webgl2/EXT_texture_compression_bptc/activation",
    "webgl2/EXT_texture_compression_bptc/behavioral",
    "webgl2/EXT_texture_compression_rgtc/reported",
    "webgl2/EXT_texture_compression_rgtc/activation",
    "webgl2/EXT_texture_compression_rgtc/behavioral",
    "webgl2/EXT_texture_filter_anisotropic/reported",
    "webgl2/EXT_texture_filter_anisotropic/activation",
    "webgl2/EXT_texture_filter_anisotropic/behavioral",
    "webgl2/KHR_parallel_shader_compile/reported",
    "webgl2/KHR_parallel_shader_compile/activation",
    "webgl2/KHR_parallel_shader_compile/behavioral",
    "webgl2/OES_element_index_uint/reported",
    "webgl2/OES_element_index_uint/activation",
    "webgl2/OES_element_index_uint/behavioral",
    "webgl2/OES_standard_derivatives/reported",
    "webgl2/OES_standard_derivatives/activation",
    "webgl2/OES_standard_derivatives/behavioral",
    "webgl2/OES_texture_float/reported",
    "webgl2/OES_texture_float/activation",
    "webgl2/OES_texture_float/behavioral",
    "webgl2/OES_texture_float_linear/reported",
    "webgl2/OES_texture_float_linear/activation",
    "webgl2/OES_texture_float_linear/behavioral",
    "webgl2/OES_texture_half_float/reported",
    "webgl2/OES_texture_half_float/activation",
    "webgl2/OES_texture_half_float/behavioral",
    "webgl2/OES_texture_half_float_linear/reported",
    "webgl2/OES_texture_half_float_linear/activation",
    "webgl2/OES_texture_half_float_linear/behavioral",
    "webgl2/OES_vertex_array_object/reported",
    "webgl2/OES_vertex_array_object/activation",
    "webgl2/OES_vertex_array_object/behavioral",
    "webgl2/WEBGL_color_buffer_float/reported",
    "webgl2/WEBGL_color_buffer_float/activation",
    "webgl2/WEBGL_color_buffer_float/behavioral",
    "webgl2/WEBGL_compressed_texture_astc/reported",
    "webgl2/WEBGL_compressed_texture_astc/activation",
    "webgl2/WEBGL_compressed_texture_astc/behavioral",
    "webgl2/WEBGL_compressed_texture_etc/reported",
    "webgl2/WEBGL_compressed_texture_etc/activation",
    "webgl2/WEBGL_compressed_texture_etc/behavioral",
    "webgl2/WEBGL_compressed_texture_etc1/reported",
    "webgl2/WEBGL_compressed_texture_etc1/activation",
    "webgl2/WEBGL_compressed_texture_etc1/behavioral",
    "webgl2/WEBGL_compressed_texture_pvrtc/reported",
    "webgl2/WEBGL_compressed_texture_pvrtc/activation",
    "webgl2/WEBGL_compressed_texture_pvrtc/behavioral",
    "webgl2/WEBGL_compressed_texture_s3tc/reported",
    "webgl2/WEBGL_compressed_texture_s3tc/activation",
    "webgl2/WEBGL_compressed_texture_s3tc/behavioral",
    "webgl2/WEBGL_compressed_texture_s3tc_srgb/reported",
    "webgl2/WEBGL_compressed_texture_s3tc_srgb/activation",
    "webgl2/WEBGL_compressed_texture_s3tc_srgb/behavioral",
    "webgl2/WEBGL_debug_renderer_info/reported",
    "webgl2/WEBGL_debug_renderer_info/activation",
    "webgl2/WEBGL_debug_renderer_info/behavioral",
    "webgl2/WEBGL_debug_shaders/reported",
    "webgl2/WEBGL_debug_shaders/activation",
    "webgl2/WEBGL_debug_shaders/behavioral",
    "webgl2/WEBGL_depth_texture/reported",
    "webgl2/WEBGL_depth_texture/activation",
    "webgl2/WEBGL_depth_texture/behavioral",
    "webgl2/WEBGL_draw_buffers/reported",
    "webgl2/WEBGL_draw_buffers/activation",
    "webgl2/WEBGL_draw_buffers/behavioral",
    "webgl2/WEBGL_lose_context/reported",
    "webgl2/WEBGL_lose_context/activation",
    "webgl2/WEBGL_lose_context/behavioral",
    "webgl2/WEBGL_multi_draw/reported",
    "webgl2/WEBGL_multi_draw/activation",
    "webgl2/WEBGL_multi_draw/behavioral"
  ],
  "webgpuValidation": [
    "depth-clip-control/reported",
    "depth-clip-control/activation",
    "depth-clip-control/behavioral",
    "depth32float-stencil8/reported",
    "depth32float-stencil8/activation",
    "depth32float-stencil8/behavioral",
    "texture-compression-bc/reported",
    "texture-compression-bc/activation",
    "texture-compression-bc/behavioral",
    "texture-compression-bc-sliced-3d/reported",
    "texture-compression-bc-sliced-3d/activation",
    "texture-compression-bc-sliced-3d/behavioral",
    "texture-compression-etc2/reported",
    "texture-compression-etc2/activation",
    "texture-compression-etc2/behavioral",
    "texture-compression-astc/reported",
    "texture-compression-astc/activation",
    "texture-compression-astc/behavioral",
    "texture-compression-astc-sliced-3d/reported",
    "texture-compression-astc-sliced-3d/activation",
    "texture-compression-astc-sliced-3d/behavioral",
    "timestamp-query/reported",
    "timestamp-query/activation",
    "timestamp-query/behavioral",
    "indirect-first-instance/reported",
    "indirect-first-instance/activation",
    "indirect-first-instance/behavioral",
    "shader-f16/reported",
    "shader-f16/activation",
    "shader-f16/behavioral",
    "rg11b10ufloat-renderable/reported",
    "rg11b10ufloat-renderable/activation",
    "rg11b10ufloat-renderable/behavioral",
    "bgra8unorm-storage/reported",
    "bgra8unorm-storage/activation",
    "bgra8unorm-storage/behavioral",
    "float32-filterable/reported",
    "float32-filterable/activation",
    "float32-filterable/behavioral",
    "float32-blendable/reported",
    "float32-blendable/activation",
    "float32-blendable/behavioral",
    "clip-distances/reported",
    "clip-distances/activation",
    "clip-distances/behavioral",
    "dual-source-blending/reported",
    "dual-source-blending/activation",
    "dual-source-blending/behavioral",
    "subgroups/reported",
    "subgroups/activation",
    "subgroups/behavioral"
  ]
});

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
        timedOut: true,
        collectionOutcome: "timed_out",
        reason: `${label} did not return within the ${ms} ms waiting limit. ` +
          "Support is unknown. This is a collection limit, not evidence that a feature is absent."
      }),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const FAMILIES = Object.freeze([
  { id: "engineSurface", label: "Engine / build", module: "./engine-surface.js", export: "collectEngineSurface" },
  { id: "bcdSurface", label: "MDN feature checklist", module: "./bcd-surface.js", export: "collectBcdSurface" },
  { id: "capabilities", label: "Reported capabilities", module: "./categorical-capabilities.js", export: "collectCategoricalCapabilities" },
  { id: "audio", label: "Audio rendering", module: "./audio.js", export: "collectAudio" },
  { id: "media", label: "Reported media support", module: "./media.js", export: "collectMedia" },
  { id: "text", label: "Text rendering", module: "./text.js", export: "collectTextRendering" },
  { id: "videoDecode", label: "Video decoding", module: "./video-decode.js", export: "collectVideoDecode", timeoutMs: 300000 },
  { id: "videoValidation", label: "Claim vs. actual validation", module: "./next/video-validation.js", export: "collectVideoValidation", timeoutMs: 360000 }
,
  { id: "webglValidation", label: "WebGL reported / actual use", module: "./next/webgl-validation.js", export: "collectWebGLValidation", timeoutMs: 45000 },
  { id: "webgpuValidation", label: "WebGPU reported / actual use", module: "./next/webgpu-validation.js", export: "collectWebGPUValidation", timeoutMs: 360000 }
].map(family => Object.freeze(family)));

// Preconditions describe whether a test can run, never select another test.
function unavailableReason(id) {
  if (id === "audio" && typeof OfflineAudioContext !== "function") return "Offline audio rendering is not available";
  if (id === "audio" && !(globalThis.crypto && crypto.subtle)) return "Audio hashing is not available; use HTTPS";
  if (id === "media" && !(navigator.mediaCapabilities && typeof navigator.mediaCapabilities.decodingInfo === "function")) return "Media capability queries are not available";
  if (id === "videoDecode" && (typeof VideoDecoder !== "function" || typeof EncodedVideoChunk !== "function")) return "WebCodecs video decoding is not available";
  return null;
}

async function runFamily(family) {
  const reason = unavailableReason(family.id);
  if (reason) return { status: "unavailable", collectionOutcome: "api_absent", reason };
  const loaded = await loadFamily(family);
  if (loaded.error) return { status: "unavailable", collectionOutcome: "test_error", reason: loaded.error };
  const options = family.id === "bcdSurface"
    ? { expectedManifestSha256: EXPERIMENT.manifestSha256 } : {};
  const result = await loaded.collector(options);
  if (!result || !["ok", "failed", "unavailable"].includes(result.status)) {
    throw new Error("Collector returned an invalid result");
  }
  return result;
}

// Collection outcomes never replace or reinterpret individual feature answers.
export const OUTCOME_LABELS = Object.freeze({
  results_returned: "Results returned",
  api_absent: "Required API absent",
  timed_out: "Timed out — support unknown",
  test_error: "Test / loading error",
  unknown: "Unknown / inconclusive",
  not_attempted: "Not attempted"
});

function collectionRecord(probe, family) {
  const outcome = probe.timedOut ? "timed_out" : probe.collectionOutcome ||
    (probe.status === "ok" ? "results_returned" : probe.status === "unavailable" ? "unknown" : "test_error");
  return {
    outcome,
    reason: probe.reason || probe.error || (probe.status === "ok"
      ? "The group returned a report; individual checks may still be unsupported, inconclusive, or report errors."
      : "The test could not produce a report; this does not establish feature absence."),
    timeoutMs: family.timeoutMs || FAMILY_TIMEOUT_MS,
    elapsedMs: probe.elapsedMs
  };
}

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
 * Run every group in the fixed suite; browser claims never select groups.
 *
 * @param {object}   options
 * @param {string}   options.label      Name for this configuration, e.g. "gologin-default".
 * @param {Function} options.onProgress Called as ({ index, total, family, status }).
 */
export async function runAll(options = {}) {
  const { label = "unlabelled", onProgress = () => {} } = options;

  const families = FAMILIES;

  const document_ = {
    schema: "browser-engine-tests/result@2",
    experiment: EXPERIMENT,
    label,
    collectedAt: new Date().toISOString(),
    persona: null,
    suite: FAMILIES.map(f => ({ id: f.id, timeoutMs: f.timeoutMs || FAMILY_TIMEOUT_MS })),
    timeoutPolicy: {
      status: "provisional-pilot",
      basis: "Operational waiting limits, not validated thresholds for feature support",
      scope: "Whole group including module loading; the same group has the same limit in every browser",
      identityTimeoutMs: 10000
    },
    checkSchedule: CHECK_SCHEDULE,
    checkCollection: {},
    collection: {},
    probes: {}
  };

  for (const family of families) {
    document_.collection[family.id] = {
      outcome: "not_attempted", reason: "This scheduled group has not started",
      timeoutMs: family.timeoutMs || FAMILY_TIMEOUT_MS, elapsedMs: null
    };
  }

  try {
    document_.persona = await withTimeout(collectPersona(), 10000, "Browser identity");
  } catch (error) {
    document_.persona = { status: "unavailable", reason: message(error) };
  }

  let index = 0;

  for (const family of families) {
    index += 1;
    onProgress({ index, total: families.length, family, status: "running" });

    const started = performance.now();

    try {
      // The budget covers loading AND collection. A timed-out asynchronous
      // collector cannot be cancelled here; retain that fact in the result.
      document_.probes[family.id] = await withTimeout(
        runFamily(family), family.timeoutMs || FAMILY_TIMEOUT_MS, family.label
      );
    } catch (error) {
      document_.probes[family.id] = { status: "failed", error: message(error) };
    }

    document_.probes[family.id].elapsedMs = Math.round(performance.now() - started);

    document_.collection[family.id] = collectionRecord(document_.probes[family.id], family);
    if (CHECK_SCHEDULE[family.id]) {
      const probe = document_.probes[family.id];
      const coverage = document_.collection[family.id];
      const actual = {};
      const value = probe.value || {};
      for (const codec of value.codecs || []) {
        actual[codec.id + '/claim'] = codec.claim;
        for (const r of codec.actual.repetitions) actual[codec.id + '/decode/' + r.repetition] = r;
      }
      for (const context of value.contexts || []) for (const row of context.checks) {
        for (const stage of ['reported','activation','behavioral']) actual[context.kind + '/' + row.id + '/' + stage] = row[stage];
      }
      for (const row of value.checks || []) for (const stage of ['reported','activation','behavioral']) actual[row.id + '/' + stage] = row[stage];
      document_.checkCollection[family.id] = CHECK_SCHEDULE[family.id].map(id => {
        const result = actual[id] || { status: coverage.outcome === 'results_returned' ? 'unknown' : coverage.outcome,
          reason: 'No individual observation retained: ' + coverage.reason };
        return { id, outcome: collectionOutcome(result), result };
      });
    }
    onProgress({ index, total: families.length, family, status: "done", collection: document_.collection[family.id] });
  }

  document_.collectionSummary = { scheduled: families.length };
  for (const outcome of Object.keys(OUTCOME_LABELS)) {
    document_.collectionSummary[outcome] = families.filter(f => document_.collection[f.id].outcome === outcome).length;
  }
  document_.requiresReload = Object.values(document_.probes).some(p => p.timedOut === true)
    || document_.persona.timedOut === true;
  return document_;
}
