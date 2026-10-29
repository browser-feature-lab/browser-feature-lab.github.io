# ui-r2 compatibility audit — 2026-10-28

## Scope and evidence

This is a UI/export repair of the supplied unified development package. Its revision is `ui-r2-2026-10-28` in `provenance.json`. The measurement schema remains `pi-suite-v7-unified-dev/result@1`: no observations, status meanings, collector payloads or required result fields changed. Provenance gains additive revision metadata. The original commit field still identifies source collectors, not a newly published commit.

The confirmed Windows 10 Chrome 80 failure occurred after collection: `show()` used `tbody.replaceChildren()` before enabling downloads. That DOM method arrived in Chrome 86, Firefox 78 and Safari 14. This wrapper now clears rows with `removeChild`, builds them with `appendChild`, and enables exports before attempting presentation. Display errors remain UI messages; they do not rewrite scientific observations or mark completed collection incomplete.

Downloads remain synchronous actions from the user's click. The anchor is attached to the document, clicked, and removed; its Blob URL is retained for 60 seconds. Save exceptions leave results available for retry. Browser settings or a remote-session download policy can still block a save without throwing; verify the actual downloaded file. There is no added clipboard, File System Access, service worker, Blob streaming, or popup dependency.

## Oldest candidate matrix (not a support certification)

| Platform | First candidate | Important boundary |
|---|---|---|
| Windows 10 / macOS | Chrome 80 | Explicit user regression target; optional chaining and nullish coalescing available |
| Windows 10 / macOS | Firefox 74 (also test ESR 78) | Firefox 73 and ESR 68 cannot parse all preserved collectors |
| macOS Catalina | Safari 13.1 | Safari 13.0 and older cannot parse all preserved collectors |
| iPhone | iOS 13.4 / Safari 13.1 engine | iOS 13.0–13.3 are below the syntax floor |
| Android | Chrome 80, if the device/browser pairing is available | Confirm installed version, not just session label |
| Android | Firefox 79, if available | Desktop Firefox 74 is not an Android version equivalence |

These are conservative early-2020-era targets inferred from syntax and APIs, not executed historical-browser passes. Test newer versions too, particularly Chrome 86 and Safari 14 around the old table API boundary. Do not silently substitute a newer available BrowserStack version and call it the old target. iOS browser labels do not establish an independent desktop engine comparison.

## Syntax and API inventory

- The 17 executable runtime modules and the embedded text-worker source parse as ES2020 plus numeric separators. Numeric separators appear in preserved collector code and predate the selected desktop floors. ES module imports, dynamic import, `import.meta.url`, async functions, object spread and destructuring are required. No top-level await, logical assignment, private fields or later grammar is introduced.
- Optional chaining and nullish coalescing are present in `unified.js`, `playback.js`, and multiple frozen collectors (including `common.js`, `text.js`, `media.js`, `video-decode.js`, and `categorical-capabilities.js`). Removing them only from the UI would not make older engines valid targets. Supporting pre-floor engines requires a separately identified collector variant and study protocol; it is outside this UI-only repair.
- `globalThis`, `Object.fromEntries`, `Object.entries/values`, `Array.from`, `Set`, `includes`, `padStart`, and Promise `finally/race/all` are within the selected desktop floors. No `replaceAll`, `Array.at`, `structuredClone`, `Promise.any/allSettled`, or `replaceChildren` is needed by the runtime path. Test scripts run in modern Node and may use modern APIs.
- Integrity requires native `crypto.subtle`, HTTPS or localhost, `fetch`, `AbortController`, `TextDecoder`, typed arrays and URL resolution. The original integrity gate is preserved; unavailable crypto/network/hash failures yield an incomplete, downloadable envelope. Do not bypass it for an old browser.
- Collection probes intentionally inspect newer APIs such as WebCodecs, WebGPU, OffscreenCanvas and media capabilities. Their absence is part of the evidence, not a UI compatibility defect. Frozen runner guards, timeouts and error outcomes are unchanged. No global polyfills, prototype patches, feature inventory edits, codec-string edits or sample replacements are shipped.
- `requestVideoFrameCallback` and its cancellation are guarded in the unchanged playback adapter. Unsupported codec/contentType diagnostics can be expected observations. A 404 must be checked by URL: a favicon miss is different from a missing module, manifest or sample. Required package-file failures stop integrity verification.
- Startup is a small module loader that catches import/evaluation failures. Browsers without modules get a `nomodule` message. Browsers too old even for dynamic import retain the initial loading-failure guidance. No unsupported browser receives fabricated feature results.
- CSS uses system fonts, ordinary layout and tables. Older engines may ignore `overflow-wrap:anywhere`; this affects line wrapping, not collection/export. Frozen reference pages are not retrofitted; their UI bytes remain preserved.

## Reference sources

- [MDN Element compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Element.json) — replaceChildren versions.
- [V8 optional chaining](https://v8.dev/features/optional-chaining) — Chrome 80, Firefox 74, Safari 13.1 syntax boundary.
- [MDN nullish coalescing data](https://github.com/mdn/browser-compat-data/blob/main/javascript/operators/nullish_coalescing.json).
- [MDN iOS release mapping](https://github.com/mdn/browser-compat-data/blob/main/browsers/safari_ios.json) — iOS 13.4 corresponds to Safari 13.1.

See package-root `VALIDATION.md` for actual executed tests and `DEPLOYMENT.md` for the BrowserStack procedure. Parser checks and simulated missing methods do not verify Chrome 80 downloads.
