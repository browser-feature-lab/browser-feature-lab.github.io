"use strict";

/*
 * common.js
 * ---------
 * Shared helpers used by every probe family. Nothing here measures anything on
 * its own; it only defines the uniform result envelope and a few primitives.
 *
 * Result envelope (every probe returns exactly one of these shapes):
 *
 *   { status: "ok",          value, detail, confidence }
 *   { status: "unavailable", reason }
 *   { status: "failed",      error }
 *
 * `detail` is a human-readable interpretation boundary for the field.
 * `confidence` is a coarse self-report of how load-bearing the value is; it is
 * descriptive only and is never used to classify a device.
 *
 * IMPORTANT: this codebase COLLECTS SIGNALS ONLY. It does not decide whether a
 * browser is genuine or spoofed, and it contains no classifier. Interpretation
 * happens offline against genuine control distributions.
 */

const utf8 = new TextEncoder();

export const ok = (value, detail, confidence = "high") => ({
  status: "ok",
  value,
  detail,
  confidence
});

export const unavailable = reason => ({
  status: "unavailable",
  reason
});

export const failed = error => ({
  status: "failed",
  error: String(error?.message || error)
});

export const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

/** SHA-256 of a string, object (JSON), or ArrayBuffer -> lowercase hex. */
export async function sha256(input) {
  const bytes =
    input instanceof ArrayBuffer
      ? input
      : utf8.encode(
          typeof input === "string"
            ? input
            : JSON.stringify(input) ?? "null"
        );

  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Median of a numeric array, or null when empty. */
export function median(values) {
  if (!values.length) return null;

  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Median absolute deviation about `center` (defaults to the median). */
export function mad(values, center = median(values)) {
  return center == null
    ? null
    : median(values.map(value => Math.abs(value - center)));
}

/** Most frequent value -> [value, count]. Ties resolve to first-seen-most. */
export function mode(values) {
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1])[0] || [null, 0];
}

/** Fisher-Yates copy; used to randomize probe ordering against drift. */
export function shuffled(values) {
  const output = values.slice();

  for (let index = output.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [output[index], output[swap]] = [output[swap], output[index]];
  }

  return output;
}
