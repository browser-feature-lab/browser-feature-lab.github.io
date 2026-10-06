"use strict";

/*
 * media.js  -  FAMILY: media / codec capability
 * ---------------------------------------------
 * Queries navigator.mediaCapabilities.decodingInfo for a fixed set of codecs
 * at 1080p. The interesting field for coherence work is `powerEfficient`: it
 * reflects whether a HARDWARE decoder path exists, which is tied to the real
 * GPU/SoC media block rather than to the declared persona. `supported` and
 * `smooth` are also recorded.
 *
 * These are platform-capability signals, not hardware identity. Codec support
 * also varies by OS, browser build, and DRM/config, so treat them as
 * corroborating rather than decisive.
 */

import { ok, unavailable } from "./common.js";

const CASES = [
  ["vp9-1080p", 'video/webm; codecs="vp09.00.10.08"'],
  ["av1-1080p", 'video/mp4; codecs="av01.0.08M.08"'],
  ["h264-1080p", 'video/mp4; codecs="avc1.640028"'],
  ["hevc-1080p", 'video/mp4; codecs="hvc1.1.6.L120.B0"']
];

export async function collectMedia() {
  if (!navigator.mediaCapabilities) {
    return unavailable("MediaCapabilities unavailable");
  }

  const entries = await Promise.all(
    CASES.map(async ([name, contentType]) => {
      try {
        const result = await navigator.mediaCapabilities.decodingInfo({
          type: "file",
          video: {
            contentType,
            width: 1920,
            height: 1080,
            bitrate: 8_000_000,
            framerate: 30
          }
        });

        return [
          name,
          {
            supported: result.supported,
            smooth: result.smooth,
            powerEfficient: result.powerEfficient
          }
        ];
      } catch (error) {
        return [name, { error: String(error?.message || error) }];
      }
    })
  );

  return ok(
    Object.fromEntries(entries),
    "Codec vectors are platform evidence; powerEfficient tracks a hardware " +
      "decoder path. Not hardware identity on their own.",
    "medium"
  );
}
