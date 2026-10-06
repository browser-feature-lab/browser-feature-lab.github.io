"use strict";

/*
 * webgpu-surface.js  -  FAMILY: WebGPU adapter surface
 * ------------------------------------------------------
 * Records what WebGPU discloses about the GPU and the driver stack.
 *
 * Why this is worth its own family:
 *
 * WebGPU reaches the GPU through a completely different code path from WebGL.
 * Anti-detect browsers have spent years learning to rewrite the WebGL
 * UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL strings, because those are
 * what fingerprinting scripts have historically read. GPUAdapterInfo is newer
 * and is not always covered by the same patching, so the two can be made to
 * disagree — and a disagreement between them is close to conclusive, since a
 * machine has one GPU.
 *
 * The failure modes are informative in both directions:
 *   - WebGPU passthrough while WebGL is spoofed  -> the real adapter leaks
 *   - WebGPU absent while the persona claims a version that shipped it
 *     -> suppression, itself an anomaly
 *   - backend disagreeing with the claimed OS (Metal on Windows, D3D12 on
 *     macOS) -> the persona and the driver stack are from different machines
 *
 * RAW SURFACE ONLY. No scoring.
 */

const ok = (value, detail, confidence = "high") => ({ status: "ok", value, detail, confidence });
const unavailable = reason => ({ status: "unavailable", reason });
const failed = error => ({ status: "failed", error: String((error && error.message) || error) });

/* GPUSupportedLimits is not a plain object; its values live on the prototype. */
function readLimits(limits) {
  if (!limits) return null;

  const out = {};

  try {
    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(limits))) {
      if (name === "constructor") continue;
      const value = limits[name];
      if (typeof value === "number") out[name] = value;
    }
  } catch {
    return "__err";
  }

  return out;
}

function readFeatures(features) {
  if (!features) return null;

  try {
    /* Sorted so the set is comparable across runs regardless of iteration order. */
    return [...features].sort();
  } catch {
    return "__err";
  }
}

/*
 * The WebGL strings, read here as well as in the other families, so that the
 * WebGL/WebGPU comparison lives in one record and does not depend on joining
 * two families together offline.
 */
function readWebglStrings() {
  let canvas;

  try {
    canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { available: false };

    const debug = gl.getExtension("WEBGL_debug_renderer_info");

    return {
      available: true,
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : "__noExtension",
      unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "__noExtension"
    };
  } catch (error) {
    return { available: false, error: String((error && error.message) || error) };
  } finally {
    try {
      if (canvas) canvas.width = canvas.height = 0;
    } catch {
      /* nothing to release */
    }
  }
}

export async function collectWebgpu() {
  try {
    const webgl = readWebglStrings();

    if (typeof navigator === "undefined" || !navigator.gpu) {
      return ok(
        { supported: false, webgl },
        "navigator.gpu absent. Note the claimed browser version: WebGPU has " +
          "shipped in Chromium since 113 and in Firefox since 141, so absence " +
          "under a newer persona is itself an inconsistency rather than a gap " +
          "in the measurement.",
        "high"
      );
    }

    const preferredCanvasFormat = (() => {
      try {
        return navigator.gpu.getPreferredCanvasFormat();
      } catch (error) {
        return `__err:${(error && error.message) || error}`;
      }
    })();

    const wgslFeatures = (() => {
      try {
        return navigator.gpu.wgslLanguageFeatures
          ? [...navigator.gpu.wgslLanguageFeatures].sort()
          : "__absent";
      } catch {
        return "__err";
      }
    })();

    /*
     * Both power preferences are requested. On a dual-GPU machine they can
     * resolve to different adapters, and a spoofing layer that rewrites only
     * the default one leaves the other reporting the truth.
     */
    const adapters = {};

    for (const preference of ["high-performance", "low-power"]) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: preference });

        if (!adapter) {
          adapters[preference] = { available: false };
          continue;
        }

        const info = adapter.info || null;

        adapters[preference] = {
          available: true,
          /*
           * vendor and architecture are exposed by default; device and
           * description are usually empty without a browser flag, so an
           * engine that populates them is itself unusual.
           */
          info: info
            ? {
                vendor: info.vendor,
                architecture: info.architecture,
                device: info.device,
                description: info.description,
                subgroupMinSize: info.subgroupMinSize,
                subgroupMaxSize: info.subgroupMaxSize,
                isFallbackAdapter: info.isFallbackAdapter
              }
            : "__noInfo",
          features: readFeatures(adapter.features),
          limits: readLimits(adapter.limits)
        };
      } catch (error) {
        adapters[preference] = {
          available: false,
          error: String((error && error.message) || error)
        };
      }
    }

    return ok(
      { supported: true, preferredCanvasFormat, wgslFeatures, adapters, webgl },
      "WebGPU adapter disclosure alongside the WebGL strings, so the two " +
        "accounts of the same GPU can be compared directly. Adapter limits " +
        "and feature sets track the real driver and hardware tier, and are " +
        "considerably harder to forge coherently than a vendor string.",
      "high"
    );
  } catch (error) {
    return failed(error);
  }
}
