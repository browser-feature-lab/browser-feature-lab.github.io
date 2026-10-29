# pi-suite-v6 — frozen October 15, 2026

Permanent release URL: https://browser-feature-lab.github.io/releases/pi-suite-v6/

This release preserves the verified 2026-10-15-r3-verified runtime. It changes only the experiment metadata, page heading/version text, and JSON download prefix. The collector revision remains 3, WebGPU revision 3, independent video validation revision 5, and WebGL revision 1. No formal collection was started during publication.

## Expected downloaded metadata

- schema: browser-engine-tests/result@2
- experiment.id: pi-suite-v6
- experiment.frozen: true
- experiment.collectorRevision: 3
- experiment.buildId: pi-suite-v6-2026-10-15
- experiment.frozenAt: 2026-10-15
- experiment.validatedFrom: 2026-10-15-r3-verified
- experiment.featureCount: 10396
- experiment.bcdVersion: 7.3.17
- experiment.manifestSha256: 6dd8992ce326416f8535651641eec086e77e41fe26897335d9bf466e5198520d

Downloads start with pi-suite-v6__. Save them separately from v5 and pilot data. API absence, null adapters, errors and timeouts remain legitimate observations rather than general support verdicts.

## Frozen procedure and schema

release-contract.json is the authoritative ordered inventory: ten group descriptors and their waiting limits; 24 independent-video, 204 WebGL and 51 WebGPU scheduled stages; six video payload hashes/configurations; BCD identity; outcome vocabulary; and curated behavioral subsets. The BCD manifest contains the same 10,396 entries. Every browser gets the same fixed schedule. Supplemental graphics discoveries remain separate from the fixed denominator, with the same 16-request WebGPU supplemental cap.

result.schema.json validates the result envelope, exact experiment metadata, group schedule, fixed check IDs and collection outcomes. Family-specific payloads intentionally remain extensible: their precise tested field semantics are pinned by the unchanged collector source and the contract. It does not purport to validate all possible legacy PI payload variants or infer correctness from a returned group.

Top-level fields: schema, experiment, label, collectedAt, persona, suite, timeoutPolicy, checkSchedule, checkCollection, collection, probes, collectionSummary, requiresReload. collection provides one outcome/reason/timeout/elapsed record per group. probes retains the original family result and optional value. checkCollection provides id, normalized outcome, and the unchanged detailed result for each scheduled new check. A group loading failure or timeout can omit its value, but scheduled fallback records remain.

Common outcomes: results_returned, api_absent, timed_out, test_error, unknown, not_attempted. Returned results can include negative support observations. Feature errors/timeouts do not imply unsupported hardware.

Video: each sample retains requestedConfig, sampleSha256, independent claim, three actual repetitions (four frames each), and comparison. Expected timestamps and visible/display dimensions are checked; pixel correctness is not. Claim false/error/timeout never suppresses decoding.

WebGL: contexts retain reported lists, fixed checks and supplemental discoveries. Each row separates reported, activation, behavioral. The anisotropic-state and vertex-array checks are limited state smoke tests, not full rendering validation.

WebGPU: initial and fresh request-adapter features remain distinct. Rows retain reported, activation, behavioral, requestable and granted, plus device features or exception diagnostics where available. Only TypeError for a feature absent on the fresh request adapter (with a callable requestDevice) yields unsupported/false/false. The exception name/message are preserved. This maps to results_returned. Advertised-feature rejection, operational failure or unreadable feature lists remain error/inconclusive; timeout remains timed_out with null booleans. Only shader-f16 is behaviorally exercised via compute/readback. Other features explicitly retain not_attempted behavior.

Waiting limits are identical to r3: 45 seconds by default; original videoDecode 300 seconds; independent videoValidation and WebGPU each 360 seconds; WebGL 45 seconds; persona 10 seconds. Individual video claim/decode waits are 5/15 seconds; GPU adapter/device/behavior waits are 5 seconds. The runtime timeoutPolicy.status string remains provisional-pilot, and the page retains its pilot-limit explanation, deliberately unchanged: these are operational waiting limits, not scientific support thresholds. Freezing fixes the values; it does not change that interpretation.

## Provenance and integrity

freeze-lock.json records SHA-256 for every release file except itself, plus inherited r3 hashes and any changed runtime files. Its own hash is pinned in the separate deployment verification report. Do not overwrite this release; future changes require a new release path/version.

Validated source commit: e4cbdb7355f05afd7f8b824ded5268948c4b0f3e.
Verified Safari pilot SHA-256: f600b640de8d18476f76dce25abf2ac6362f2922f2923c8107b5604618ef97e1. Its actual file and all other saved results remain private and unmodified.

## Verification

Run node verification/sanity.mjs for the 25 simulations against this release. Its only adaptation from the development test is imports/reference paths and the frozen=true assertion. verification/v5-video-validation-reference.js is a test-only unchanged reference copy; the runtime does not import it.

Run node verification/verify-native-video.mjs /path/to/ffmpeg /path/to/scratch for independent native sample verification. All six exact payloads passed software decoding as one and four repeated frames (twelve runs), with correct 64×64 yuv420p output, detected profiles, counts, and consistent frame hashes. Native tool/version/hash/arguments and results are in verification/native-report.json. No re-encoding was performed. Syntax verification covered all shipped JavaScript plus both inline page scripts. These simulations/native checks do not replace browser evidence; the verified Safari pilot supplied that evidence before freezing.
