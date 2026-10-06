"use strict";

/*
 * video-decode.js - fixed-input WebCodecs decoder probe
 * -----------------------------------------------------
 * Decodes embedded H.264, VP9, and AV1 key frames. Each codec receives the
 * same encoded key-frame payload four times with monotonically increasing
 * timestamps. The probe emits raw support, output ordering, frame metadata,
 * native-plane and RGBA hashes, callback latency, and flush timing.
 *
 * No runtime classifier. Interpret only against genuine controls collected
 * with the same browser engine/version and this exact probe revision.
 */

const DEFAULTS = Object.freeze({
  repetitions: 3,
  framesPerRepetition: 4,
  frameIntervalUs: 250_000,
  timeoutMs: 15_000
});

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
    dataBase64: "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"
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

function base64Bytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function hex(bytes) {
  return [...bytes]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) return null;

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hex(new Uint8Array(digest));
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function rectValue(rect) {
  if (!rect) return null;

  return {
    x: finite(rect.x),
    y: finite(rect.y),
    width: finite(rect.width),
    height: finite(rect.height)
  };
}

function colorSpaceValue(colorSpace) {
  if (!colorSpace) return null;

  return {
    primaries: colorSpace.primaries ?? null,
    transfer: colorSpace.transfer ?? null,
    matrix: colorSpace.matrix ?? null,
    fullRange: colorSpace.fullRange ?? null
  };
}

function frameMetadata(frame) {
  return {
    format: frame.format ?? null,
    codedWidth: finite(frame.codedWidth),
    codedHeight: finite(frame.codedHeight),
    codedRect: rectValue(frame.codedRect),
    visibleRect: rectValue(frame.visibleRect),
    displayWidth: finite(frame.displayWidth),
    displayHeight: finite(frame.displayHeight),
    timestamp: finite(frame.timestamp),
    duration: finite(frame.duration),
    colorSpace: colorSpaceValue(frame.colorSpace)
  };
}

async function nativeFrameBytes(frame) {
  try {
    if (!frame.format) {
      return {
        status: "unavailable",
        reason: "frame-format-null"
      };
    }

    const size = frame.allocationSize();
    const bytes = new Uint8Array(size);
    const layout = await frame.copyTo(bytes);

    return {
      status: "ok",
      byteLength: bytes.byteLength,
      hash: await sha256(bytes),
      layout: layout.map(plane => ({
        offset: plane.offset,
        stride: plane.stride
      }))
    };
  } catch (error) {
    return {
      status: "failed",
      reason: String(error?.message || error)
    };
  }
}

async function rgbaFrameBytes(frame) {
  try {
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    let canvas;

    if (typeof OffscreenCanvas === "function") {
      canvas = new OffscreenCanvas(width, height);
    } else if (globalThis.document?.createElement) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    } else {
      return {
        status: "unavailable",
        reason: "canvas-unavailable"
      };
    }

    const context = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true
    });

    if (!context) {
      return {
        status: "unavailable",
        reason: "2d-context-unavailable"
      };
    }

    context.drawImage(frame, 0, 0, width, height);

    const image = context.getImageData(0, 0, width, height);
    const bytes = new Uint8Array(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength
    );

    return {
      status: "ok",
      format: "RGBA-canvas-readback",
      byteLength: bytes.byteLength,
      hash: await sha256(bytes)
    };
  } catch (error) {
    return {
      status: "failed",
      reason: String(error?.message || error)
    };
  }
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label}-timeout`)),
      timeoutMs
    );

    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

async function decodeRepetition(stream, repetition, config) {
  const payload = base64Bytes(stream.dataBase64);
  const enqueuedAt = new Map();
  const outputs = [];
  const errors = [];
  const pendingOutputs = [];

  let callbackIndex = 0;

  const decoder = new VideoDecoder({
    output(frame) {
      const callbackAt = performance.now();
      const metadata = frameMetadata(frame);
      const enqueueTime = enqueuedAt.get(frame.timestamp);
      const outputIndex = callbackIndex++;

      const processing = (async () => {
        /*
         * Keep these sequential. Concurrent copyTo() and drawImage() against
         * the same VideoFrame are not consistently implemented.
         */
        const native = await nativeFrameBytes(frame);
        const rgba = await rgbaFrameBytes(frame);

        outputs.push({
          callbackIndex: outputIndex,
          timestamp: frame.timestamp,
          callbackLatencyMs:
            enqueueTime == null ? null : callbackAt - enqueueTime,
          metadata,
          native,
          rgba
        });
      })()
        .catch(error => {
          errors.push({
            phase: "output-processing",
            callbackIndex: outputIndex,
            timestamp: frame.timestamp,
            message: String(error?.message || error)
          });
        })
        .finally(() => frame.close());

      pendingOutputs.push(processing);
    },

    error(error) {
      errors.push({
        phase: "decoder-callback",
        message: String(error?.message || error)
      });
    }
  });

  const startedAt = performance.now();
  let flushMs = null;

  try {
    decoder.configure(stream.config);

    for (
      let index = 0;
      index < config.framesPerRepetition;
      index++
    ) {
      const timestamp = index * config.frameIntervalUs;

      enqueuedAt.set(timestamp, performance.now());

      decoder.decode(
        new EncodedVideoChunk({
          type: "key",
          timestamp,
          duration: config.frameIntervalUs,
          data: payload
        })
      );
    }

    const flushStartedAt = performance.now();

    await withTimeout(
      decoder.flush(),
      config.timeoutMs,
      "decoder-flush"
    );

    flushMs = performance.now() - flushStartedAt;

    await withTimeout(
      Promise.all(pendingOutputs),
      config.timeoutMs,
      "frame-processing"
    );
  } catch (error) {
    errors.push({
      phase: "decode-run",
      message: String(error?.message || error)
    });
  } finally {
    try {
      decoder.close();
    } catch {
      // Decoder may already be closed after an error callback.
    }
  }

  outputs.sort(
    (left, right) => left.callbackIndex - right.callbackIndex
  );

  const outputTimestamps = outputs.map(
    output => output.timestamp
  );

  const expectedTimestamps = Array.from(
    { length: config.framesPerRepetition },
    (_, index) => index * config.frameIntervalUs
  );

  return {
    repetition,
    inputFrames: config.framesPerRepetition,
    inputBytesPerFrame: payload.byteLength,
    outputFrames: outputs.length,
    outputTimestamps,
    expectedTimestamps,
    outputOrderMatchesInput:
      JSON.stringify(outputTimestamps) ===
      JSON.stringify(expectedTimestamps),
    flushMs,
    totalMs: performance.now() - startedAt,
    errors,
    outputs
  };
}

async function probeStream(stream, config, onProgress) {
  const payload = base64Bytes(stream.dataBase64);

  const encodedPayload = {
    byteLength: payload.byteLength,
    sha256: await sha256(payload)
  };

  let support;

  try {
    support = await VideoDecoder.isConfigSupported(
      stream.config
    );
  } catch (error) {
    return {
      id: stream.id,
      status: "failed",
      encodedPayload,
      reason:
        `support-check: ${String(error?.message || error)}`
    };
  }

  if (!support.supported) {
    return {
      id: stream.id,
      status: "unsupported",
      encodedPayload,
      requestedConfig: stream.config,
      returnedConfig: support.config ?? null,
      repetitions: []
    };
  }

  const repetitions = [];

  for (
    let repetition = 0;
    repetition < config.repetitions;
    repetition++
  ) {
    onProgress?.({
      stage: "video-decode",
      codec: stream.id,
      repetition: repetition + 1,
      repetitions: config.repetitions
    });

    repetitions.push(
      await decodeRepetition(
        stream,
        repetition,
        config
      )
    );
  }

  return {
    id: stream.id,
    status: "ok",
    encodedPayload,
    requestedConfig: stream.config,
    returnedConfig: support.config ?? null,
    repetitions
  };
}

export async function collectVideoDecode(options = {}) {
  if (typeof globalThis.VideoDecoder !== "function") {
    return {
      status: "unavailable",
      reason: "webcodecs-video-decoder-unavailable"
    };
  }

  const config = {
    ...DEFAULTS,
    ...options
  };

  const onProgress =
    typeof options.onProgress === "function"
      ? options.onProgress
      : null;

  const codecs = [];

  for (const stream of STREAMS) {
    codecs.push(
      await probeStream(stream, config, onProgress)
    );
  }

  return {
    status: "ok",
    value: {
      probeRevision: 1,
      embeddedSource: {
        dimensions: [64, 64],
        pixelFormat: "yuv420p",
        generator: "FFmpeg-6.1.1-testsrc2",
        repeatedKeyFramePerCodec: true
      },
      config: {
        repetitions: config.repetitions,
        framesPerRepetition:
          config.framesPerRepetition,
        frameIntervalUs:
          config.frameIntervalUs,
        timeoutMs: config.timeoutMs
      },
      codecs
    },
    detail:
      "Fixed-input WebCodecs decoding evidence. Native hashes describe " +
      "decoded planes; RGBA hashes also include browser color conversion " +
      "and canvas readback. Compare offline against same-engine/version " +
      "controls.",
    confidence: "low"
  };
}

export const videoDecodeDefaults = DEFAULTS;

export const videoDecodeStreams = STREAMS.map(stream => ({
  id: stream.id,
  config: stream.config
}));