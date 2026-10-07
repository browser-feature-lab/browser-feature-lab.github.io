"use strict";
// Claim vs. actual validation. The embedded inputs below are copied
// unchanged from the PI's video-decode.js; that original file is not modified.
// No support-query answer selects or suppresses a decoding attempt.
const SETTINGS = Object.freeze({ repetitions: 3, frames: 4, intervalUs: 250000,
  claimTimeoutMs: 5000, decodeTimeoutMs: 15000 });

const STREAMS = Object.freeze([
  {
    id: "h264-high-annexb",
    config: {
      codec: "avc1.64000A",
      codedWidth: 64,
      codedHeight: 64,
      hardwareAcceleration: "no-preference",
      optimizeForLatency: false
    },
    dataBase64: "AAAAAQkQAAAAAWdkEAqsuITYCIAAAAMAgAAABEIAAAABaO4PLIsAAAEGBf//WtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0xIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMzMgbWU9dW1oIHN1Ym1lPTEwIHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTAgbWVfcmFuZ2U9MjQgY2hyb21hX21lPTEgdHJlbGxpcz0yIDh4OGRjdD0xIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD0xIGtleWludF9taW49MSBzY2VuZWN1dD0wIGludHJhX3JlZnJlc2g9MCByYz1jcmYgbWJ0cmVlPTAgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAFliIQn2WdRpNpaLqRuTbbxEikTC7Y/tK3DfrLH2OKshKk7/KB3Zv7wkH4DXvuH2wHfv7P7ymD9cxiu1ieWye9xJ5SMltb1ETfK1oKmPnknblJrJCSQRvuEKpv8KTYI50IQQw6tzUqtEcaWsg/oPbR/nKMVf32o57wNktFzYK/WleLWWrTVgiKNDDjkybA3ku67T0OMGk6E5HTryFq/cKW1ARAAzYiwybY3TnK2SYB9tWm+rbq7VTCRFIznZycmLXLDi/K/L8toxWoZZjrr5hnBc2ch48tlj7/daiUUKuRmx0bN8qACS1qmG0OGA0cGLtH5GKuqiipDWJmMCYuLLTdhaHk3lDD1LF44WTCRXKUJWd8p5oIDr0DQEHr6VuWxfriTuRU6f1HaMBYRPWiihyjBdnOLFzsHirgUXZcc1GmeuIDoAofEgIS0MizwOCBEL1GFA7hj0O2G6Ywr6rV6mvRmu/GpBsFntHBedRNRemlskKz4BgS45KHKuwot4A6z9csvGctQ1ALunEiRy0l+wwe5xgDfO97HBJ+7gXq8DElQPNj5w9c/91WCjsLgXQWSJh0Mb6d/EU/DcTWz/MKL/raI/F2KfBnZsfN43R8e52xB+0NmLuoKqOTkQjtiQRqC0QnxaUpzSQWNDPaeVv456UiMc7gvd87M8DI3RGMc5CI4cZvQlkQiCQ99OnHXYZ8qzJ/RywnxXuFiUOpVS5yxNwtZWepdDbLpLCWEjUee5Ur60Scu6P0dXWspFD8rH7tOaQRaRF568kMvuJBJjFCC9rCNF4NRVQvj7j/TeqQ8e+K6eOcAz6b71iWlFabSf9qAP6Ngi351oaij79KoA/PIVMvo6k7TqlGeTQ9JkeIpOPzJQBWcWOXHNvnxdvXzDzf2QuKNNnWSIl2cmcZWkc0jFUaD0H3JiHi21+asSDPykW9g/vM/0/D5IGDGCOamT93Ho/mB0OJKmcrwNcwOwrIQ/L6FqyPT9v6IWUiRkoJQC5wgWTutvcLy0keoEBeqT0Ir27m1BpIxAZCxwwwUDg845WR1H9QQ7eIFKoBLH6dRklNogDc27QorEm8tOLzxPWmark3zSNnMq3y2ft2EQ7D9TBoSUheu99Ykp1nkQwP2+Ey4MTSD7ejVA8W939yIv51Gz5um1aIj7pPB9rufErgvEU+4U730h+xXEeF54EbrxzmfLoWJLwNTxkeXz4msvzObL5O3xFOuKz9sWoCK9eQZadMd+8e4DtAilYa3c48+Zt6UtbRE6aBVRqx2ZlvIqHpIwyULVAk6weH3VNTRyRqQuJA7by1jc5DOZMn/uP5+sGFrTQpNSnEJ8Ixj/nVeb+oc2Hsk1+b4J2k8vXXDu8FoC5Bl9A+9B/32jwuOQk/FAiyZDSdZ4QDwwAlN4CtUAEye1VkpEptRxc5vJrYQXQsh29blru5pr1eRsIY/QpSfHsmWuhsADNaEwaYYhG6HzSxJskILmazf+wRwsBT6hlCLTu8WvInNO++C0oC8RWVHZMBEcPY1fpPtS80YhlRDocCaseQrL4Ps3kSjwlradJn/Ms2E3oC2qbOcJekxsyTcgnadLLwLgTCj2XDcRcgRhBa0yKXDvYFCvqBlQL7vXkXy8yBdYVCcH6venCohiazeH2NCY5mhCPOslP84OPnb9GQECzfLG4oaqnrCa0k0VUIUAPxS7mOQHG93AR+llGO2n8LzL4wOnpL05eDzpgtvLqxC2uM40oKJA0W+lWaWX6Hnk6E="
  },
  {
    id: "vp9-profile0-lossless",
    config: {
      codec: "vp09.00.10.08",
      codedWidth: 64,
      codedHeight: 64,
      hardwareAcceleration: "no-preference",
      optimizeForLatency: false
    },
    dataBase64: "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"
  },
  {
    id: "av1-main-lossless",
    config: {
      codec: "av01.0.00M.08",
      codedWidth: 64,
      codedHeight: 64,
      hardwareAcceleration: "no-preference",
      optimizeForLatency: false
    },
    dataBase64: "EgAKCgAAAAKv/5tfMAgyxAQUADAACCGjCgIICNtxwP6QSVkT+gzKzHsAEvY9iBoErLkvQYR5RX5CmWIlb9KdX7hv/atZB3Ps0u1jgUugNI7p1PVXwl5cZZoK2+nUKTPjJSu4NpJW2O6KQKdoMjb/vBM5heDpXo1G6ksuJg51D4zXnVqHdLmu74via+g+lnPZdLjMddPUjMrSvO4iM12bd5rO4M5AsU+D+/KTNcs8EBjuvJsShPswicyp+8nAttB99RbreqstRkvcMs2q9rjti0v9fq7DcxpXGbGPLhpp8ekIwc66ybIxt/oto7vV3EB4+HzHV6k82HBtOcu/AO6exUKQsbt1YHvTgFtbhmNIngqJq6zhupjwLgch/QCx/292t8AdMHpX5Cf2P3WwdOMI+uV/wged5BxDxouoPmpWEFL8/HtUnAarUoxYb9PlUpjK/NdORsiOXaq4d787Vs7RkpWI2NUX9MT7t8rvb5SvnEoz3NCcSeJUlfBl9s1VdJH3IoeuK2kaTmX9GnBdU6Qdjg1aaWSgOcZcCVTrLurT//bIqngOjMq//wLFtEJfgqoe7Ju6KRyZOYjB0ckOlEOyYwciQ+k1J6SxmpMLWVTc2I9e/BTt9uf3rFhpUnO1EYtVWRydg3ku6wvDQJkllGuofCvFTn9eho3M1Pd12oJ9Arsz07JI7y5dWJ//5dADHYgf86h+Yy401iqTBLH332s9jApc5C+iv4op49sPrmMh9C1W8sqmflpSOFBkLqdhB4KkNAy3oCPNkVhGiMiYmeILQB5+6x0w"
  }
]);


const message = error => String((error && error.message) || error);

async function bounded(action, ms) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(action).then(value => ({ status: "returned", value }),
        error => ({ status: "error", reason: message(error) })),
      new Promise(resolve => { timer = setTimeout(() => resolve({ status: "timed_out",
        reason: "No answer within the waiting limit; support remains unknown" }), ms); })
    ]);
  } finally { clearTimeout(timer); }
}

async function readClaim(stream) {
  const started = performance.now();
  if (typeof VideoDecoder !== "function" || typeof VideoDecoder.isConfigSupported !== "function") {
    return { status: "api_absent", supported: null, reason: "Support-query API not exposed", elapsedMs: 0 };
  }
  const result = await bounded(() => VideoDecoder.isConfigSupported({ ...stream.config }), SETTINGS.claimTimeoutMs);
  const elapsedMs = Math.round(performance.now() - started);
  if (result.status !== "returned") return { ...result, supported: null, elapsedMs };
  if (!result.value || typeof result.value.supported !== "boolean") {
    return { status: "error", supported: null, reason: "Invalid support-query response", elapsedMs };
  }
  return { status: "answered", supported: result.value.supported,
    returnedConfig: result.value.config || null, elapsedMs };
}

async function attemptDecode(stream, repetition) {
  const started = performance.now();
  const expectedTimestamps = Array.from({ length: SETTINGS.frames }, (_, i) => i * SETTINGS.intervalUs);
  if (typeof VideoDecoder !== "function" || typeof EncodedVideoChunk !== "function") {
    return { repetition, status: "api_absent", attempted: false, outputFrames: 0,
      reason: "Decoding API not exposed", elapsedMs: 0 };
  }
  let decoder;
  let finished = false;
  const frames = [];
  const errors = [];
  const result = await bounded(async () => {
    const binary = atob(stream.dataBase64);
    const data = Uint8Array.from(binary, c => c.charCodeAt(0));
    let rejectCallback;
    const callbackFailure = new Promise((_, reject) => { rejectCallback = reject; });
    // Attach a handler immediately even if configure/decode throws synchronously.
    callbackFailure.catch(() => {});
    decoder = new VideoDecoder({
      output(frame) {
        try {
          if (!finished) frames.push({ timestamp: frame.timestamp,
            codedWidth: frame.codedWidth, codedHeight: frame.codedHeight });
        } catch (error) {
          if (!finished) { errors.push(message(error)); rejectCallback(error); }
        } finally { frame.close(); }
      },
      error(error) {
        if (!finished) { errors.push(message(error)); rejectCallback(error); }
      }
    });
    decoder.configure({ ...stream.config });
    for (const timestamp of expectedTimestamps) {
      decoder.decode(new EncodedVideoChunk({ type: "key", timestamp,
        duration: SETTINGS.intervalUs, data }));
    }
    await Promise.race([decoder.flush(), callbackFailure]);
  }, SETTINGS.decodeTimeoutMs);
  finished = true;
  if (decoder) { try { decoder.close(); } catch (_) { /* already closed */ } }
  const timestamps = frames.map(f => f.timestamp).sort((a,b) => a-b);
  const complete = frames.length === SETTINGS.frames &&
    JSON.stringify(timestamps) === JSON.stringify(expectedTimestamps) &&
    frames.every(f => f.codedWidth === stream.config.codedWidth && f.codedHeight === stream.config.codedHeight);
  const status = result.status === "timed_out" ? "timed_out"
    : result.status === "error" || errors.length || !complete ? "error" : "decoded";
  return { repetition, status, attempted: true, inputFrames: SETTINGS.frames,
    outputFrames: frames.length, expectedTimestamps, frames, errors,
    reason: result.reason || (status === "error" ? "Expected frames were not all returned with matching timestamps and dimensions" : null),
    elapsedMs: Math.round(performance.now() - started) };
}

export async function collectVideoValidation() {
  const codecs = [];
  for (const stream of STREAMS) {
    const claim = await readClaim(stream);
    const repetitions = [];
    for (let i = 0; i < SETTINGS.repetitions; i++) {
      repetitions.push(await attemptDecode(stream, i));
    }
    const statuses = [...new Set(repetitions.map(r => r.status))];
    const decodeOutcome = statuses.length === 1 ? statuses[0] : "mixed";
    codecs.push({ id: stream.id, requestedConfig: stream.config, claim,
      actual: { outcome: decodeOutcome, repetitions },
      comparison: decodeOutcome !== "decoded" ? "validation_unknown"
        : claim.status !== "answered" ? "claim_unknown_validation_yes"
        : claim.supported ? "claim_yes_validation_yes" : "claim_no_validation_yes" });
  }
  const apiAbsent = typeof VideoDecoder !== "function" || typeof EncodedVideoChunk !== "function";
  return { status: apiAbsent ? "unavailable" : "ok",
    ...(apiAbsent ? { collectionOutcome: "api_absent", reason: "Decoding API not exposed" } : {}),
    value: { revision: 2, settings: SETTINGS, codecs },
    detail: "Support claims and decoding attempts are independent. Decoded means the expected frames, timestamps and dimensions were returned, not that pixel correctness was verified. Errors and timeouts are inconclusive about general codec support. No browser authenticity verdict.",
    confidence: "low" };
}
