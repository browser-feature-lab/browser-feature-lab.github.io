"use strict";

/*
 * capability-verify.js  -  FAMILY: claimed capability vs demonstrated capability
 * -------------------------------------------------------------------------------
 * The PI's instruction: read first what it says it supports, store that, then
 * actually test it, and store whether it worked. yes or no.
 *
 * Why this is a different kind of test from everything else in the run.
 *
 * Every other family asks the browser a question and writes down the answer.
 * This one asks the same question twice, by two different routes, and writes
 * down whether the answers match:
 *
 *   the CLAIM     canPlayType, MediaSource.isTypeSupported,
 *                 mediaCapabilities.decodingInfo, VideoDecoder.isConfigSupported,
 *                 document.fonts.check
 *                 - all of these are lookup tables. Cheap to read, and cheap
 *                   to rewrite: they are strings and booleans, exactly the
 *                   sort of thing a persona is assembled from.
 *
 *   the REALITY   configure a real decoder and flush it; encode a real frame
 *                 and count the bytes that come out; render text and measure
 *                 how wide it actually got.
 *                 - these go through the codec and the font stack. To fake
 *                   them you would have to ship a codec, not edit a string.
 *
 * A browser wearing a persona it does not have gets caught in the gap. A
 * profile claiming Safari on macOS inherits Safari's HEVC answer, because that
 * is what the persona says; if it is really Chromium on Linux the decoder will
 * not configure. Claim yes, reality no. That mismatch is not a version
 * artefact or an MDN imprecision - it is the browser contradicting itself
 * about something it cannot bluff.
 *
 * The inverse is also recorded and is just as interesting: claim no, reality
 * yes means the tool suppressed an answer without removing the capability.
 *
 * ---------------------------------------------------------------------------
 * TIMEOUT DISCIPLINE. media.js once hung a whole run on HEVC, inside a
 * Promise.all over four codecs, and the run could not be restarted without
 * killing the browser. Nothing here runs concurrently, every await has its own
 * timeout, and a global deadline stops the family cold rather than letting one
 * codec take the run down. A probe that times out is recorded as "timeout",
 * which is data, not an error.
 */

const ok = (value, detail) => ({ status: "ok", value: value, detail: detail });

const STEP_TIMEOUT_MS = 4000;
const BUDGET_MS = 45000;

/*
 * Resolves to a sentinel instead of hanging. Deliberately never rejects: a
 * codec that never answers must not be able to reject its way out of the loop.
 */
function withTimeout(promise, ms, label) {
  return new Promise(resolve => {
    let settled = false;
    const done = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done({ timedOut: true, label: label }), ms);
    Promise.resolve(promise).then(
      value => done({ value: value }),
      error => done({ error: String((error && error.name) || "") + ": " + String((error && error.message) || error) })
    );
  });
}

/* --------------------------------------------------------------------------
 * Codec table. Chosen because the answers genuinely differ by platform, which
 * is what makes a mismatch meaningful:
 *   - HEVC  : Safari/macOS yes, most Chromium builds no. The single most
 *             diagnostic codec, and the one that hung the old run.
 *   - AV1   : recent everywhere, absent on older and on some stripped builds.
 *   - ALAC / AAC : Apple-leaning.
 *   - VP8/VP9/Opus/Vorbis : Chromium and Firefox yes, historically Safari no.
 * ------------------------------------------------------------------------ */
const VIDEO_CODECS = [
  { id: "h264-baseline", codec: "avc1.42E01E", mime: 'video/mp4; codecs="avc1.42E01E"' },
  { id: "h264-high", codec: "avc1.640028", mime: 'video/mp4; codecs="avc1.640028"' },
  { id: "vp8", codec: "vp8", mime: 'video/webm; codecs="vp8"' },
  { id: "vp9", codec: "vp09.00.10.08", mime: 'video/webm; codecs="vp09.00.10.08"' },
  { id: "av1", codec: "av01.0.04M.08", mime: 'video/mp4; codecs="av01.0.04M.08"' },
  { id: "hevc", codec: "hev1.1.6.L93.B0", mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' }
];

const AUDIO_CODECS = [
  { id: "aac-lc", codec: "mp4a.40.2", mime: 'audio/mp4; codecs="mp4a.40.2"', rate: 48000, channels: 2 },
  { id: "opus", codec: "opus", mime: 'audio/webm; codecs="opus"', rate: 48000, channels: 2 },
  { id: "vorbis", codec: "vorbis", mime: 'audio/webm; codecs="vorbis"', rate: 48000, channels: 2 },
  { id: "mp3", codec: "mp3", mime: "audio/mpeg", rate: 48000, channels: 2 },
  { id: "flac", codec: "flac", mime: 'audio/ogg; codecs="flac"', rate: 48000, channels: 2 },
  { id: "alac", codec: "alac", mime: 'audio/mp4; codecs="alac"', rate: 48000, channels: 2 }
];

/*
 * Fonts that ship with exactly one desktop platform. A profile claiming macOS
 * that cannot render Helvetica Neue is not running on macOS, whatever its user
 * agent says. Generic families are the control: every platform has them, so a
 * run where the controls fail means the measurement is broken, not the browser.
 */
/*
 * Fonts, bucketed by the platform FAMILY they identify.
 *
 * "Apple" rather than macOS and iOS separately, on purpose. The two share
 * almost the whole Apple font stack, so no font set separates them reliably -
 * an iPhone scores on Helvetica Neue and Menlo and simply misses the
 * macOS-only Geneva and Lucida Grande, which reads as a partial Apple score
 * rather than as a different platform. Claiming to tell them apart by font
 * would be inventing precision the method does not have. Desktop-versus-phone
 * is answered by the pointer/hover evidence instead, which actually can.
 *
 * Generic families are the control: every platform has them, so a run where
 * the controls fail means the measurement is broken, not the browser.
 */
const FONTS = [
  { id: "helvetica-neue", family: "Helvetica Neue", platform: "Apple" },
  { id: "menlo", family: "Menlo", platform: "Apple" },
  { id: "geneva", family: "Geneva", platform: "Apple" },
  { id: "lucida-grande", family: "Lucida Grande", platform: "Apple" },
  { id: "segoe-ui", family: "Segoe UI", platform: "Windows" },
  { id: "calibri", family: "Calibri", platform: "Windows" },
  { id: "tahoma", family: "Tahoma", platform: "Windows" },
  { id: "ms-gothic", family: "MS Gothic", platform: "Windows" },
  { id: "dejavu-sans", family: "DejaVu Sans", platform: "Linux" },
  { id: "liberation-sans", family: "Liberation Sans", platform: "Linux" },
  { id: "ubuntu", family: "Ubuntu", platform: "Linux" },
  /* Android ships the Roboto/Noto/Droid stack and none of the above */
  { id: "roboto", family: "Roboto", platform: "Android" },
  { id: "noto-sans", family: "Noto Sans", platform: "Android" },
  { id: "droid-sans", family: "Droid Sans", platform: "Android" },
  { id: "roboto-condensed", family: "Roboto Condensed", platform: "Android" },
  { id: "control-sans-serif", family: "sans-serif", platform: "control" },
  { id: "control-monospace", family: "monospace", platform: "control" }
];

/* ---------------------------- the CLAIM side ---------------------------- */

async function claimVideo(entry, deadline) {
  const claim = {};

  try {
    const el = document.createElement("video");
    claim.canPlayType = el.canPlayType(entry.mime);
  } catch (error) {
    claim.canPlayType = null;
  }

  try {
    claim.mediaSource =
      typeof MediaSource !== "undefined" && MediaSource.isTypeSupported
        ? MediaSource.isTypeSupported(entry.mime)
        : null;
  } catch (error) {
    claim.mediaSource = null;
  }

  /*
   * decodingInfo is the call that hung. It gets its own timeout and is never
   * awaited alongside anything else.
   */
  if (typeof navigator !== "undefined" && navigator.mediaCapabilities && Date.now() < deadline) {
    const r = await withTimeout(
      navigator.mediaCapabilities.decodingInfo({
        type: "file",
        video: { contentType: entry.mime, width: 640, height: 480, bitrate: 1000000, framerate: 30 }
      }),
      STEP_TIMEOUT_MS,
      "decodingInfo " + entry.id
    );
    claim.decodingInfo = r.timedOut ? "timeout" : r.error ? null : !!(r.value && r.value.supported);
    if (r.value) {
      claim.decodingInfoSmooth = !!r.value.smooth;
      claim.decodingInfoPowerEfficient = !!r.value.powerEfficient;
    }
  } else {
    claim.decodingInfo = null;
  }

  if (typeof VideoDecoder !== "undefined" && VideoDecoder.isConfigSupported && Date.now() < deadline) {
    const r = await withTimeout(
      VideoDecoder.isConfigSupported({ codec: entry.codec, codedWidth: 640, codedHeight: 480 }),
      STEP_TIMEOUT_MS,
      "isConfigSupported " + entry.id
    );
    claim.webCodecs = r.timedOut ? "timeout" : r.error ? null : !!(r.value && r.value.supported);
  } else {
    claim.webCodecs = null;
  }

  if (typeof VideoEncoder !== "undefined" && VideoEncoder.isConfigSupported && Date.now() < deadline) {
    const r = await withTimeout(
      VideoEncoder.isConfigSupported({
        codec: entry.codec, width: 640, height: 480, bitrate: 1000000, framerate: 30
      }),
      STEP_TIMEOUT_MS,
      "encoder isConfigSupported " + entry.id
    );
    claim.webCodecsEncode = r.timedOut ? "timeout" : r.error ? null : !!(r.value && r.value.supported);
  } else {
    claim.webCodecsEncode = null;
  }
  claim.verdictCodecEncode = summariseClaim([claim.webCodecsEncode]);

  /*
   * Claims are grouped by LAYER, and the verdict compared against reality is
   * the one from the same layer as the test. This is not a detail - pooling
   * them produced five false accusations against honest browsers.
   *
   *   container layer  canPlayType, MediaSource.isTypeSupported,
   *                    decodingInfo, encodingInfo, MediaRecorder
   *                    - can this whole PIPELINE handle this file: container,
   *                      codec, and hardware path together.
   *   codec layer      VideoDecoder/VideoEncoder/AudioEncoder.isConfigSupported
   *                    - can this raw CODEC be configured, container aside.
   *
   * Safari says no to HEVC at the container layer and yes at the codec layer,
   * and both are true: it will not play an HEVC file through <video>, and it
   * will decode hev1 through WebCodecs. Since the reality test configures a
   * WebCodecs decoder, only the codec-layer claim is its counterpart.
   *
   * The divergence between the two layers is kept as an observation, because a
   * browser whose layers disagree differently from every reference browser is
   * worth a look - but it is not by itself a contradiction.
   */
  claim.verdictCodec = summariseClaim([claim.webCodecs]);
  claim.verdictContainer = summariseClaim([
    claim.decodingInfo,
    claim.mediaSource,
    claim.canPlayType === "probably" || claim.canPlayType === "maybe"
      ? true
      : claim.canPlayType === "" ? false : null
  ]);
  claim.layersDiverge =
    claim.verdictCodec !== "unknown" &&
    claim.verdictContainer !== "unknown" &&
    claim.verdictCodec !== claim.verdictContainer;
  claim.verdict = claim.verdictCodec;
  return claim;
}

function summariseClaim(values) {
  let sawTrue = false;
  let sawFalse = false;
  for (const v of values) {
    if (v === true) sawTrue = true;
    else if (v === false) sawFalse = true;
  }
  if (sawTrue && !sawFalse) return "yes";
  if (sawFalse && !sawTrue) return "no";
  if (sawTrue && sawFalse) return "mixed";
  return "unknown";
}

/* --------------------------- the REALITY side --------------------------- */

/*
 * Configure a real decoder and flush it. configure() only throws synchronously
 * for a malformed config; an unsupported codec closes the decoder with
 * NotSupportedError asynchronously, which surfaces as a rejected flush(). So
 * flush resolving is the codec layer saying yes.
 *
 * ponytail: this proves the decoder ACCEPTS the codec, not that it decodes a
 * real bitstream - that would mean shipping sample clips for six codecs. The
 * encode round-trip below does prove end-to-end for anything encodable. Add
 * per-codec sample chunks if a browser is ever found faking at the configure
 * level.
 */
async function realVideoDecode(entry, deadline) {
  /*
   * "unknown", not "no". If WebCodecs itself is absent, the capability was not
   * tested and not refuted - the instrument is missing, not the codec. Safari
   * shipped MediaRecorder long before AudioEncoder, so scoring an absent API
   * as a failed test would manufacture a claim/reality mismatch on an honest
   * browser for every codec at once.
   */
  if (typeof VideoDecoder === "undefined") return { verdict: "unknown", how: "VideoDecoder absent - not testable" };
  if (Date.now() >= deadline) return { verdict: "unknown", how: "budget exhausted" };

  let decoder = null;
  try {
    decoder = new VideoDecoder({ output: () => {}, error: () => {} });
    decoder.configure({ codec: entry.codec, codedWidth: 640, codedHeight: 480 });
  } catch (error) {
    try { if (decoder && decoder.state !== "closed") decoder.close(); } catch (e) {}
    return { verdict: "no", how: "configure threw", error: String((error && error.name) || error) };
  }

  const r = await withTimeout(decoder.flush(), STEP_TIMEOUT_MS, "decode flush " + entry.id);
  try { if (decoder.state !== "closed") decoder.close(); } catch (e) {}

  if (r.timedOut) return { verdict: "unknown", how: "flush timed out" };
  if (r.error) return { verdict: "no", how: "decoder rejected", error: r.error };
  return { verdict: "yes", how: "decoder configured and flushed" };
}

/*
 * A genuine round trip: draw a frame, encode it, count the bytes. No assets
 * needed, and nothing short of a real encoder produces a chunk.
 */
async function realVideoEncode(entry, deadline) {
  /*
   * "unknown", not "no". If WebCodecs itself is absent, the capability was not
   * tested and not refuted - the instrument is missing, not the codec. Safari
   * shipped MediaRecorder long before AudioEncoder, so scoring an absent API
   * as a failed test would manufacture a claim/reality mismatch on an honest
   * browser for every codec at once.
   */
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
    return { verdict: "unknown", how: "VideoEncoder absent - not testable" };
  }
  if (Date.now() >= deadline) return { verdict: "unknown", how: "budget exhausted" };

  let encoder = null;
  let frame = null;
  const chunks = [];
  let bytes = 0;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { verdict: "unknown", how: "no 2d context" };
    /* Gradient rather than flat fill: a flat frame can encode to almost nothing. */
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, "#0b3d91");
    grad.addColorStop(1, "#f5a623");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    encoder = new VideoEncoder({
      output: chunk => { chunks.push(chunk); bytes += chunk.byteLength; },
      error: () => {}
    });
    encoder.configure({ codec: entry.codec, width: 640, height: 480, bitrate: 1000000, framerate: 30 });
    frame = new VideoFrame(canvas, { timestamp: 0 });
    encoder.encode(frame, { keyFrame: true });
  } catch (error) {
    try { if (frame) frame.close(); } catch (e) {}
    try { if (encoder && encoder.state !== "closed") encoder.close(); } catch (e) {}
    return { verdict: "no", how: "encode setup threw", error: String((error && error.name) || error) };
  }

  const r = await withTimeout(encoder.flush(), STEP_TIMEOUT_MS, "encode flush " + entry.id);
  try { if (frame) frame.close(); } catch (e) {}
  try { if (encoder.state !== "closed") encoder.close(); } catch (e) {}

  if (r.timedOut) return { verdict: "unknown", how: "encode flush timed out" };
  if (r.error) return { verdict: "no", how: "encoder rejected", error: r.error };
  if (chunks.length === 0) return { verdict: "no", how: "no chunks produced" };
  return { verdict: "yes", how: "encoded " + chunks.length + " chunk(s), " + bytes + " bytes" };
}

async function claimAudio(entry, deadline) {
  const claim = {};
  try {
    const el = document.createElement("audio");
    claim.canPlayType = el.canPlayType(entry.mime);
  } catch (error) {
    claim.canPlayType = null;
  }
  try {
    claim.mediaRecorder =
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported
        ? MediaRecorder.isTypeSupported(entry.mime)
        : null;
  } catch (error) {
    claim.mediaRecorder = null;
  }
  if (typeof navigator !== "undefined" && navigator.mediaCapabilities && Date.now() < deadline) {
    const r = await withTimeout(
      navigator.mediaCapabilities.encodingInfo({
        type: "record",
        audio: { contentType: entry.mime, channels: String(entry.channels), bitrate: 128000, samplerate: entry.rate }
      }),
      STEP_TIMEOUT_MS,
      "encodingInfo " + entry.id
    );
    claim.encodingInfo = r.timedOut ? "timeout" : r.error ? null : !!(r.value && r.value.supported);
  } else {
    claim.encodingInfo = null;
  }
  if (typeof AudioEncoder !== "undefined" && AudioEncoder.isConfigSupported && Date.now() < deadline) {
    const r = await withTimeout(
      AudioEncoder.isConfigSupported({
        codec: entry.codec, sampleRate: entry.rate, numberOfChannels: entry.channels, bitrate: 128000
      }),
      STEP_TIMEOUT_MS,
      "audio isConfigSupported " + entry.id
    );
    claim.webCodecs = r.timedOut ? "timeout" : r.error ? null : !!(r.value && r.value.supported);
  } else {
    claim.webCodecs = null;
  }
  /*
   * Encode and decode are different capabilities and must not be pooled.
   * canPlayType answers "can you PLAY this", which is true for mp3 and vorbis
   * in every browser, while AudioEncoder cannot ENCODE either of them - not a
   * contradiction, just two different questions. Pooling them produced a
   * "mixed" verdict that hid whichever answer mattered.
   */
  claim.verdictEncode = summariseClaim([claim.webCodecs]);
  claim.verdictEncodeContainer = summariseClaim([claim.encodingInfo, claim.mediaRecorder]);
  claim.layersDiverge =
    claim.verdictEncode !== "unknown" &&
    claim.verdictEncodeContainer !== "unknown" &&
    claim.verdictEncode !== claim.verdictEncodeContainer;
  claim.verdictDecode = summariseClaim([
    claim.canPlayType === "probably" || claim.canPlayType === "maybe"
      ? true
      : claim.canPlayType === "" ? false : null
  ]);
  claim.verdict = claim.verdictEncode;
  return claim;
}

/* Real audio encode: synthesise a tone, encode it, count the bytes out. */
async function realAudioEncode(entry, deadline) {
  /*
   * "unknown", not "no". If WebCodecs itself is absent, the capability was not
   * tested and not refuted - the instrument is missing, not the codec. Safari
   * shipped MediaRecorder long before AudioEncoder, so scoring an absent API
   * as a failed test would manufacture a claim/reality mismatch on an honest
   * browser for every codec at once.
   */
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") {
    return { verdict: "unknown", how: "AudioEncoder absent - not testable" };
  }
  if (Date.now() >= deadline) return { verdict: "unknown", how: "budget exhausted" };

  let encoder = null;
  let data = null;
  let chunks = 0;
  let bytes = 0;

  try {
    const frames = 1024;
    const samples = new Float32Array(frames * entry.channels);
    for (let i = 0; i < frames; i++) {
      const v = Math.sin((2 * Math.PI * 440 * i) / entry.rate);
      for (let c = 0; c < entry.channels; c++) samples[i * entry.channels + c] = v;
    }
    encoder = new AudioEncoder({
      output: chunk => { chunks++; bytes += chunk.byteLength; },
      error: () => {}
    });
    encoder.configure({
      codec: entry.codec, sampleRate: entry.rate, numberOfChannels: entry.channels, bitrate: 128000
    });
    data = new AudioData({
      format: "f32", sampleRate: entry.rate, numberOfFrames: frames,
      numberOfChannels: entry.channels, timestamp: 0, data: samples
    });
    encoder.encode(data);
  } catch (error) {
    try { if (data) data.close(); } catch (e) {}
    try { if (encoder && encoder.state !== "closed") encoder.close(); } catch (e) {}
    return { verdict: "no", how: "audio encode setup threw", error: String((error && error.name) || error) };
  }

  const r = await withTimeout(encoder.flush(), STEP_TIMEOUT_MS, "audio encode flush " + entry.id);
  try { if (data) data.close(); } catch (e) {}
  try { if (encoder.state !== "closed") encoder.close(); } catch (e) {}

  if (r.timedOut) return { verdict: "unknown", how: "flush timed out" };
  if (r.error) return { verdict: "no", how: "encoder rejected", error: r.error };
  if (chunks === 0) return { verdict: "no", how: "no chunks produced" };
  return { verdict: "yes", how: "encoded " + chunks + " chunk(s), " + bytes + " bytes" };
}

/*
 * Fonts. document.fonts.check is the claim. Reality is measured: render the
 * same string in the candidate family with a generic fallback behind it, and
 * in the generic alone. If the widths differ against EVERY generic, the
 * candidate really rendered - a missing font falls back and the widths match.
 * Three generics because two strings can coincidentally measure the same.
 */
function verifyFonts() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const SAMPLE = "mmmmmmmmmmlli WW@#%&1Ii0Oo";
  const GENERICS = ["monospace", "sans-serif", "serif"];
  const SIZE = "72px";

  const baseline = {};
  for (const g of GENERICS) {
    ctx.font = SIZE + " " + g;
    baseline[g] = ctx.measureText(SAMPLE).width;
  }

  /*
   * The method depends on the three generics measuring differently from one
   * another. On a system where they collapse to the same font, every candidate
   * would look installed. Detect that and report nothing rather than everything.
   */
  const genericsDistinct =
    baseline.monospace !== baseline["sans-serif"] &&
    baseline["sans-serif"] !== baseline.serif &&
    baseline.monospace !== baseline.serif;
  if (!genericsDistinct) return { degenerate: true, baseline: baseline };

  return FONTS.map(font => {
    let claim = null;
    try {
      claim = document.fonts && document.fonts.check
        ? document.fonts.check(SIZE + ' "' + font.family + '"')
        : null;
    } catch (error) {
      claim = null;
    }

    /*
     * Presence test, and the reasoning matters because the obvious version is
     * wrong.
     *
     * The obvious version - render "Candidate, generic" and check it differs
     * from "generic" alone - fails silently whenever the candidate IS that
     * generic's default on this system. Liberation Sans measured identical to
     * sans-serif on the Linux box this was written on, despite being installed,
     * and Helvetica Neue on macOS and Segoe UI on Windows are the same story.
     * Those are precisely the fonts that identify a platform, so the naive test
     * reports every interesting font missing and manufactures a spoofing
     * finding out of a measurement artefact.
     *
     * The reliable form uses the fallback chain itself. Declare the candidate
     * in front of all three generics:
     *   installed -> the candidate always wins, so all three measure the SAME.
     *   missing   -> each falls through to its own generic, and those three
     *                differ from each other, so the measurements differ.
     * It needs no per-font baseline and cannot be fooled by a candidate that
     * happens to match one generic.
     */
    const widths = {};
    for (const g of GENERICS) {
      ctx.font = SIZE + ' "' + font.family + '", ' + g;
      widths[g] = ctx.measureText(SAMPLE).width;
    }
    const measured = GENERICS.map(g => widths[g]);
    const allSame = measured.every(w => w === measured[0]);

    /* A generic family IS its own fallback, so the control can only be "same". */
    const isControl = font.platform === "control";
    const actual = isControl ? "yes" : allSame ? "yes" : "no";

    return {
      id: font.id,
      family: font.family,
      platform: font.platform,
      /*
       * Recorded, but NOT the claim. document.fonts.check answers "will this
       * font-face declaration resolve to something usable", and a missing
       * family resolves to the fallback, so it returns true for almost any
       * name - it said yes to MS Gothic on a Linux box with no MS Gothic.
       * Kept because a browser whose check() disagrees with everyone else's
       * is itself worth seeing, but it decides nothing.
       */
      fontsCheck: claim === null ? "unknown" : claim ? "yes" : "no",
      actual: actual,
      widths: widths,
      baseline: baseline
    };
  });
}

/*
 * The real claim for text rendering is the operating system the browser says
 * it is running on, because that is what determines which fonts should exist.
 * Nothing here is spoofable by editing a string: the fonts either rasterise to
 * different widths or they do not.
 *
 * A profile whose user agent says macOS, with no macOS font present and a full
 * set of Linux ones, has been contradicted by its own font stack.
 */
function declaredPlatform() {
  const out = { platform: null, userAgent: null, uaDataPlatform: null, verdict: "unknown" };
  try { out.platform = navigator.platform || null; } catch (error) {}
  try { out.userAgent = navigator.userAgent || null; } catch (error) {}
  try {
    out.uaDataPlatform =
      navigator.userAgentData && navigator.userAgentData.platform
        ? navigator.userAgentData.platform
        : null;
  } catch (error) {}

  const hay = [out.platform, out.userAgent, out.uaDataPlatform].join(" ").toLowerCase();

  /*
   * ORDER IS LOAD-BEARING: every mobile platform advertises itself inside a
   * desktop token, so the specific test must run before the general one.
   *
   *   iPhone  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)"
   *           - contains "Mac OS X", so testing /mac/ first calls it macOS.
   *   Android "Mozilla/5.0 (Linux; Android 10; K)", platform "Linux armv81"
   *           - contains "Linux", so testing /linux/ first calls it Linux.
   *
   * Checking desktop first mislabelled every phone we collected.
   */
  if (/iphone|ipad|ipod/.test(hay)) out.verdict = "iOS";
  else if (/android/.test(hay)) out.verdict = "Android";
  else if (/windows|win32|win64/.test(hay)) out.verdict = "Windows";
  else if (/cros/.test(hay)) out.verdict = "ChromeOS";
  else if (/mac|darwin/.test(hay)) out.verdict = "macOS";
  else if (/linux|x11|ubuntu/.test(hay)) out.verdict = "Linux";

  /*
   * Form factor, taken from the input device rather than from any string. A
   * phone has a coarse pointer and cannot hover; a desktop has a fine pointer
   * and can. Independent evidence for the same claim, and unlike the user
   * agent it is not a string anybody edits.
   */
  try {
    if (typeof matchMedia === "function") {
      out.pointerCoarse = matchMedia("(pointer: coarse)").matches;
      out.canHover = matchMedia("(hover: hover)").matches;
      out.formFactor =
        out.pointerCoarse && !out.canHover ? "mobile"
          : !out.pointerCoarse && out.canHover ? "desktop"
          : "unclear";
    }
  } catch (error) {
    out.formFactor = "unclear";
  }
  return out;
}

/* ------------------------------- driver -------------------------------- */

export async function collectCapabilityVerify(options = {}) {
  const started = Date.now();
  const deadline = started + (options.budgetMs || BUDGET_MS);

  const video = [];
  const audio = [];

  /* Strictly sequential. One codec must never be able to stall another. */
  for (const entry of VIDEO_CODECS) {
    const claim = await claimVideo(entry, deadline);
    const decode = await realVideoDecode(entry, deadline);
    const encode = await realVideoEncode(entry, deadline);
    video.push({
      id: entry.id,
      codec: entry.codec,
      mime: entry.mime,
      claim: claim,
      decode: decode,
      encode: encode,
      /* The headline: does the browser do what it says it does? */
      decodeAgrees: claim.verdictCodec === "unknown" || decode.verdict === "unknown"
        ? null
        : (claim.verdictCodec === "yes") === (decode.verdict === "yes"),
      encodeAgrees: claim.verdictCodecEncode === "unknown" || encode.verdict === "unknown"
        ? null
        : (claim.verdictCodecEncode === "yes") === (encode.verdict === "yes")
    });
  }

  for (const entry of AUDIO_CODECS) {
    const claim = await claimAudio(entry, deadline);
    const encode = await realAudioEncode(entry, deadline);
    audio.push({
      id: entry.id,
      codec: entry.codec,
      mime: entry.mime,
      claim: claim,
      encode: encode,
      encodeAgrees: claim.verdictEncode === "unknown" || encode.verdict === "unknown"
        ? null
        : (claim.verdictEncode === "yes") === (encode.verdict === "yes")
    });
  }

  let text = null;
  let textDegenerate = false;
  try {
    const result = verifyFonts();
    if (result && result.degenerate) { textDegenerate = true; text = null; }
    else text = result;
  } catch (error) {
    text = null;
  }

  /* Mismatches are the finding; everything else is context. */
  const mismatches = [];
  for (const v of video) {
    if (v.decodeAgrees === false) {
      mismatches.push({ family: "videoDecode", id: v.id, claim: v.claim.verdictCodec, actual: v.decode.verdict, how: v.decode.how });
    }
    if (v.encodeAgrees === false) {
      mismatches.push({ family: "videoEncode", id: v.id, claim: v.claim.verdictCodecEncode, actual: v.encode.verdict, how: v.encode.how });
    }
  }
  for (const a of audio) {
    if (a.encodeAgrees === false) {
      mismatches.push({ family: "audioEncode", id: a.id, claim: a.claim.verdictEncode, actual: a.encode.verdict, how: a.encode.how });
    }
  }
  /*
   * Text is judged in aggregate, not per font. One missing font means nothing -
   * users uninstall fonts, and distributions differ. A whole platform's set
   * missing while another platform's set is present is the finding.
   */
  const declared = declaredPlatform();

  /*
   * Which platform's fonts actually rendered. A persona claiming macOS with
   * only Linux fonts present has been caught by the font stack rather than by
   * anything it chose to report.
   */
  const fontsByPlatform = {};
  if (text) {
    for (const t of text) {
      if (t.platform === "control") continue;
      const bucket = (fontsByPlatform[t.platform] = fontsByPlatform[t.platform] || { present: 0, total: 0 });
      bucket.total++;
      if (t.actual === "yes") bucket.present++;
    }
  }

  const controlsOk = text ? text.filter(t => t.platform === "control").every(t => t.actual === "yes") : null;

  /*
   * Which platform the fonts point at: the one with the highest share of its
   * own set present. Requires a real majority and a clear winner, so a sparse
   * or locked-down font stack reports "inconclusive" rather than guessing.
   */
  let fontEvidence = { verdict: "inconclusive", scores: {} };
  if (text && controlsOk) {
    let best = null;
    let runnerUp = 0;
    for (const platform of Object.keys(fontsByPlatform)) {
      const b = fontsByPlatform[platform];
      const score = b.total ? b.present / b.total : 0;
      fontEvidence.scores[platform] = Math.round(score * 100) / 100;
      if (!best || score > best.score) {
        if (best) runnerUp = best.score;
        best = { platform: platform, score: score };
      } else if (score > runnerUp) {
        runnerUp = score;
      }
    }
    if (best && best.score >= 0.5 && best.score > runnerUp) fontEvidence.verdict = best.platform;
  }

  /*
   * The headline for this family. Claim is what the browser says it runs on;
   * reality is what its font stack can actually rasterise.
   */
  /* macOS and iOS share one font family; see the FONTS comment. */
  const FAMILY_OF = {
    macos: "Apple", ios: "Apple", windows: "Windows",
    linux: "Linux", android: "Android", chromeos: "Linux"
  };
  const claimedFamily = FAMILY_OF[String(declared.verdict).toLowerCase()] || null;

  const platformCheck = {
    claim: declared.verdict,
    claimedFamily: claimedFamily,
    actual: fontEvidence.verdict,
    agrees:
      claimedFamily === null || fontEvidence.verdict === "inconclusive"
        ? null
        : claimedFamily === fontEvidence.verdict,
    /*
     * A second, independent check: does the claimed platform match the input
     * device? A user agent saying iPhone, from something with a fine pointer
     * that can hover, is a desktop wearing a phone's name.
     */
    formFactorAgrees:
      declared.formFactor == null || declared.formFactor === "unclear" || claimedFamily === null
        ? null
        : declared.verdict === "iOS" || declared.verdict === "Android"
          ? declared.formFactor === "mobile"
          : declared.formFactor === "desktop",
    declared: declared,
    evidence: fontEvidence
  };
  if (platformCheck.formFactorAgrees === false) {
    mismatches.push({
      family: "text",
      id: "form-factor",
      claim: declared.verdict,
      actual: declared.formFactor,
      how: "declared platform and input device disagree (pointer/hover)"
    });
  }
  if (platformCheck.agrees === false) {
    mismatches.push({
      family: "text",
      id: "platform",
      claim: platformCheck.claim,
      actual: platformCheck.actual,
      how: "declared OS has no matching font set; fonts point at " + platformCheck.actual
    });
  }

  return ok(
    {
      video: video,
      audio: audio,
      text: text,
      fontsByPlatform: fontsByPlatform,
      controlsOk: controlsOk,
      textDegenerate: textDegenerate,
      platformCheck: platformCheck,
      mismatches: mismatches,
      counts: {
        videoProbed: video.length,
        audioProbed: audio.length,
        fontsProbed: text ? text.length : 0,
        mismatches: mismatches.length
      },
      elapsedMs: Date.now() - started
    },
    mismatches.length === 0
      ? "claims and reality agree"
      : mismatches.length + " claim/reality mismatch(es)"
  );
}
