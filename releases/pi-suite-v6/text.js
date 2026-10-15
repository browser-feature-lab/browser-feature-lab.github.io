"use strict";

/*
 * text-rendering.js
 * -----------------
 * Collects deterministic text-layout and rasterization evidence.
 *
 * This probe does not classify CoreText, DirectWrite, FreeType, an OS, or a
 * device. Compare its raw results offline against genuine controls collected
 * with compatible browser engines and versions.
 */

const WIDTH = 1000;
const HEIGHT = 160;
const REPETITIONS = 3;

const TESTS = Object.freeze([
  {
    id: "generic-sans",
    font: "32px sans-serif",
    text: "Hamburgefontsiv 0123456789"
  },
  {
    id: "generic-serif",
    font: "32px serif",
    text: "Hamburgefontsiv 0123456789"
  },
  {
    id: "generic-mono",
    font: "32px monospace",
    text: "MWil1|., 0123456789"
  },
  {
    id: "system-ui",
    font: "32px system-ui",
    text: "AaBbGgQq 😀 é Ω Ж"
  },
  {
    id: "emoji",
    font: "32px sans-serif",
    text: "😀☺️❤️👍🏽🧑‍💻"
  }
]);

function hex(bytes) {
  return [...bytes]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) {
    return null;
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return hex(new Uint8Array(digest));
}

function serializeMetric(value) {
  return Number.isFinite(value)
    ? value
    : null;
}

function extractMetrics(metrics) {
  return {
    width:
      serializeMetric(metrics.width),

    actualBoundingBoxLeft:
      serializeMetric(
        metrics.actualBoundingBoxLeft
      ),

    actualBoundingBoxRight:
      serializeMetric(
        metrics.actualBoundingBoxRight
      ),

    actualBoundingBoxAscent:
      serializeMetric(
        metrics.actualBoundingBoxAscent
      ),

    actualBoundingBoxDescent:
      serializeMetric(
        metrics.actualBoundingBoxDescent
      ),

    fontBoundingBoxAscent:
      serializeMetric(
        metrics.fontBoundingBoxAscent
      ),

    fontBoundingBoxDescent:
      serializeMetric(
        metrics.fontBoundingBoxDescent
      ),

    emHeightAscent:
      serializeMetric(
        metrics.emHeightAscent
      ),

    emHeightDescent:
      serializeMetric(
        metrics.emHeightDescent
      ),

    hangingBaseline:
      serializeMetric(
        metrics.hangingBaseline
      ),

    alphabeticBaseline:
      serializeMetric(
        metrics.alphabeticBaseline
      ),

    ideographicBaseline:
      serializeMetric(
        metrics.ideographicBaseline
      )
  };
}

function analyzePixels(data, width, height) {
  let nonTransparentPixels = 0;
  let grayscalePixels = 0;
  let coloredPixels = 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  const colors = new Set();

  for (
    let offset = 0;
    offset < data.length;
    offset += 4
  ) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];

    if (alpha === 0) {
      continue;
    }

    nonTransparentPixels++;

    if (
      red === green &&
      green === blue
    ) {
      grayscalePixels++;
    } else {
      coloredPixels++;
    }

    colors.add(
      `${red},${green},${blue},${alpha}`
    );

    const pixelIndex = offset / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    nonTransparentPixels,
    grayscalePixels,
    coloredPixels,
    uniqueColorCount: colors.size,

    boundingBox:
      nonTransparentPixels > 0
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
          }
        : null
  };
}

function configureContext(
  context,
  test
) {
  context.clearRect(
    0,
    0,
    WIDTH,
    HEIGHT
  );

  context.globalAlpha = 1;
  context.globalCompositeOperation =
    "source-over";

  context.fillStyle =
    "rgba(0, 0, 0, 1)";

  context.strokeStyle =
    "rgba(0, 0, 0, 1)";

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.direction = "ltr";

  context.fontKerning = "auto";
  context.fontStretch = "normal";
  context.fontVariantCaps = "normal";
  context.letterSpacing = "0px";
  context.wordSpacing = "0px";

  context.font = test.font;
}

async function renderTest(
  canvas,
  context,
  test
) {
  configureContext(context, test);

  const metrics =
    extractMetrics(
      context.measureText(test.text)
    );

  context.fillText(
    test.text,
    20,
    90
  );

  const imageData =
    context.getImageData(
      0,
      0,
      WIDTH,
      HEIGHT
    );

  const bytes =
    new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength
    );

  return {
    id: test.id,
    font: test.font,
    text: test.text,
    metrics,
    hash: await sha256(bytes),
    pixels: analyzePixels(
      imageData.data,
      WIDTH,
      HEIGHT
    )
  };
}

function makeCanvas() {
  const canvas =
    document.createElement("canvas");

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  return canvas;
}

async function collectMainThread() {
  const repetitions = [];

  for (
    let repetition = 0;
    repetition < REPETITIONS;
    repetition++
  ) {
    const canvas = makeCanvas();

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: true,
          willReadFrequently: true
        }
      );

    if (!context) {
      throw new Error(
        "2d-context-unavailable"
      );
    }

    const tests = [];

    for (const test of TESTS) {
      tests.push(
        await renderTest(
          canvas,
          context,
          test
        )
      );
    }

    repetitions.push({
      repetition,
      tests
    });
  }

  return repetitions;
}

function summarizeStability(repetitions) {
  return TESTS.map(test => {
    const results =
      repetitions.map(repetition =>
        repetition.tests.find(
          result =>
            result.id === test.id
        )
      );

    const hashes =
      results.map(result =>
        result?.hash ?? null
      );

    const uniqueHashes =
      [...new Set(hashes)];

    return {
      id: test.id,
      hashes,
      uniqueHashCount:
        uniqueHashes.length,
      stable:
        uniqueHashes.length === 1
    };
  });
}

function makeWorkerSource() {
  return `
"use strict";

function hex(bytes) {
  return [...bytes]
    .map(value =>
      value
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

async function sha256(bytes) {
  if (!self.crypto?.subtle) {
    return null;
  }

  const digest =
    await self.crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return hex(
    new Uint8Array(digest)
  );
}

function serializeMetric(value) {
  return Number.isFinite(value)
    ? value
    : null;
}

function extractMetrics(metrics) {
  return {
    width:
      serializeMetric(metrics.width),

    actualBoundingBoxLeft:
      serializeMetric(
        metrics.actualBoundingBoxLeft
      ),

    actualBoundingBoxRight:
      serializeMetric(
        metrics.actualBoundingBoxRight
      ),

    actualBoundingBoxAscent:
      serializeMetric(
        metrics.actualBoundingBoxAscent
      ),

    actualBoundingBoxDescent:
      serializeMetric(
        metrics.actualBoundingBoxDescent
      ),

    fontBoundingBoxAscent:
      serializeMetric(
        metrics.fontBoundingBoxAscent
      ),

    fontBoundingBoxDescent:
      serializeMetric(
        metrics.fontBoundingBoxDescent
      ),

    emHeightAscent:
      serializeMetric(
        metrics.emHeightAscent
      ),

    emHeightDescent:
      serializeMetric(
        metrics.emHeightDescent
      ),

    hangingBaseline:
      serializeMetric(
        metrics.hangingBaseline
      ),

    alphabeticBaseline:
      serializeMetric(
        metrics.alphabeticBaseline
      ),

    ideographicBaseline:
      serializeMetric(
        metrics.ideographicBaseline
      )
  };
}

function analyzePixels(
  data,
  width,
  height
) {
  let nonTransparentPixels = 0;
  let grayscalePixels = 0;
  let coloredPixels = 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  const colors = new Set();

  for (
    let offset = 0;
    offset < data.length;
    offset += 4
  ) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];

    if (alpha === 0) continue;

    nonTransparentPixels++;

    if (
      red === green &&
      green === blue
    ) {
      grayscalePixels++;
    } else {
      coloredPixels++;
    }

    colors.add(
      red + "," +
      green + "," +
      blue + "," +
      alpha
    );

    const pixelIndex =
      offset / 4;

    const x =
      pixelIndex % width;

    const y =
      Math.floor(
        pixelIndex / width
      );

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    nonTransparentPixels,
    grayscalePixels,
    coloredPixels,
    uniqueColorCount:
      colors.size,

    boundingBox:
      nonTransparentPixels > 0
        ? {
            x: minX,
            y: minY,
            width:
              maxX - minX + 1,
            height:
              maxY - minY + 1
          }
        : null
  };
}

function configureContext(
  context,
  test,
  width,
  height
) {
  context.clearRect(
    0,
    0,
    width,
    height
  );

  context.globalAlpha = 1;

  context.globalCompositeOperation =
    "source-over";

  context.fillStyle =
    "rgba(0, 0, 0, 1)";

  context.strokeStyle =
    "rgba(0, 0, 0, 1)";

  context.textAlign = "left";

  context.textBaseline =
    "alphabetic";

  context.direction = "ltr";

  context.fontKerning = "auto";
  context.fontStretch = "normal";
  context.fontVariantCaps = "normal";
  context.letterSpacing = "0px";
  context.wordSpacing = "0px";

  context.font = test.font;
}

self.onmessage = async event => {
  try {
    const {
      width,
      height,
      tests
    } = event.data;

    if (
      typeof OffscreenCanvas !==
      "function"
    ) {
      self.postMessage({
        status: "unavailable",
        reason:
          "offscreen-canvas-unavailable"
      });

      return;
    }

    const canvas =
      new OffscreenCanvas(
        width,
        height
      );

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: true,
          willReadFrequently: true
        }
      );

    if (!context) {
      throw new Error(
        "offscreen-2d-context-unavailable"
      );
    }

    const results = [];

    for (const test of tests) {
      configureContext(
        context,
        test,
        width,
        height
      );

      const metrics =
        extractMetrics(
          context.measureText(
            test.text
          )
        );

      context.fillText(
        test.text,
        20,
        90
      );

      const imageData =
        context.getImageData(
          0,
          0,
          width,
          height
        );

      const bytes =
        new Uint8Array(
          imageData.data.buffer,
          imageData.data.byteOffset,
          imageData.data.byteLength
        );

      results.push({
        id: test.id,
        font: test.font,
        text: test.text,
        metrics,
        hash:
          await sha256(bytes),
        pixels:
          analyzePixels(
            imageData.data,
            width,
            height
          )
      });
    }

    self.postMessage({
      status: "ok",
      results
    });
  } catch (error) {
    self.postMessage({
      status: "failed",
      reason: String(
        error?.message || error
      )
    });
  }
};
`;
}

function collectWorker() {
  if (
    typeof Worker !== "function"
  ) {
    return Promise.resolve({
      status: "unavailable",
      reason: "worker-unavailable"
    });
  }

  return new Promise(resolve => {
    const url =
      URL.createObjectURL(
        new Blob(
          [makeWorkerSource()],
          {
            type: "text/javascript"
          }
        )
      );

    const worker =
      new Worker(url);

    const finish = result => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timeout =
      setTimeout(
        () => {
          finish({
            status: "failed",
            reason:
              "worker-text-rendering-timeout"
          });
        },
        15000
      );

    worker.onerror = event => {
      finish({
        status: "failed",
        reason:
          event.message ||
          "worker-text-rendering-failed"
      });
    };

    worker.onmessage = event => {
      finish(event.data);
    };

    worker.postMessage({
      width: WIDTH,
      height: HEIGHT,
      tests: TESTS
    });
  });
}

function compareMainAndWorker(
  mainThread,
  worker
) {
  if (
    worker.status !== "ok" ||
    !mainThread.length
  ) {
    return null;
  }

  const mainResults =
    mainThread[0].tests;

  return TESTS.map(test => {
    const main =
      mainResults.find(
        result =>
          result.id === test.id
      );

    const workerResult =
      worker.results.find(
        result =>
          result.id === test.id
      );

    return {
      id: test.id,

      hashEqual:
        main?.hash != null &&
        main.hash ===
          workerResult?.hash,

      metricsEqual:
        JSON.stringify(
          main?.metrics
        ) ===
        JSON.stringify(
          workerResult?.metrics
        ),

      pixelStatisticsEqual:
        JSON.stringify(
          main?.pixels
        ) ===
        JSON.stringify(
          workerResult?.pixels
        )
    };
  });
}

export async function collectTextRendering() {
  try {
    const mainThread =
      await collectMainThread();

    const worker =
      await collectWorker();

    const stability =
      summarizeStability(
        mainThread
      );

    const mainWorkerComparison =
      compareMainAndWorker(
        mainThread,
        worker
      );

    return {
      status: "ok",

      value: {
        canvas: {
          width: WIDTH,
          height: HEIGHT,
          backingScale:
            "fixed-css-independent-bitmap"
        },

        environment: {
          devicePixelRatio:
            globalThis.devicePixelRatio ??
            null,

          colorDepth:
            globalThis.screen?.colorDepth ??
            null,

          pixelDepth:
            globalThis.screen?.pixelDepth ??
            null
        },

        repetitions: REPETITIONS,
        tests: TESTS,
        mainThread,
        stability,
        worker,
        mainWorkerComparison
      },

      detail:
        "Text layout and rasterization surface. " +
        "Compare raw results offline against genuine " +
        "same-browser and same-version OS controls.",

      confidence: "low"
    };
  } catch (error) {
    return {
      status: "failed",
      reason: String(
        error?.message || error
      )
    };
  }
}