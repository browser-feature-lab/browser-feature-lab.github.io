"use strict";

/*
 * audio.js  -  FAMILY: audio processing signature
 * -----------------------------------------------
 * Renders a fixed oscillator -> DynamicsCompressor graph through an
 * OfflineAudioContext and hashes a fixed window of the output. The signature
 * is driven by the platform's float processing + browser build, and is a
 * well-studied, deterministic, GPU-independent witness (works where WebGPU is
 * absent). It is rendered twice to record within-run stability (`stable`).
 *
 * We keep the hash for compact same-run stability checking, but the raw window
 * (`samples`) is also returned so offline analysis can compare distributions
 * rather than only exact-match hashes. Never treat the hash as identity on its
 * own.
 */

import { ok, failed, sha256 } from "./common.js";

async function renderOnce() {
  const context = new OfflineAudioContext(1, 44100, 44100);

  const oscillator = context.createOscillator();
  const compressor = context.createDynamicsCompressor();

  oscillator.type = "triangle";
  oscillator.frequency.value = 10000;

  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;

  oscillator.connect(compressor).connect(context.destination);
  oscillator.start(0);

  const rendered = await context.startRendering();
  return rendered.getChannelData(0).slice(4500, 5200);
}

export async function collectAudio() {
  try {
    const [first, second] = await Promise.all([renderOnce(), renderOnce()]);
    const [firstHash, secondHash] = await Promise.all([
      sha256(first.buffer),
      sha256(second.buffer)
    ]);

    return ok(
      {
        sampleRate: 44100,
        window: [4500, 5200],
        hash: firstHash,
        stable: firstHash === secondHash,
        // A short numeric preview of the window for offline distributional use.
        samples: Array.from(first.slice(0, 32))
      },
      "Deterministic audio-stack signature; GPU-independent. Compare against " +
        "genuine platform profiles offline; hash alone is never attribution.",
      firstHash === secondHash ? "medium" : "low"
    );
  } catch (error) {
    return failed(error);
  }
}
