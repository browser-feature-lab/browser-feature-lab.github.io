# pi-suite-v3 — independent video validation pilot

Upload this package's contents to the publishing root of
https://github.com/browser-feature-lab/browser-feature-lab.github.io
The website address remains https://browser-feature-lab.github.io/.
Do not upload to Mashequr/browser-test-site. Preserve the data folder.
No remote changes were made when preparing this package.

## What changed

The original seven groups remain in the same order: engineSurface, bcdSurface,
capabilities, audio, media, text, videoDecode. An eighth group, videoValidation,
runs last. All seven PI files are unchanged from Git HEAD. The added source
video-validation.js copies the three embedded samples and decoder configurations
exactly from the PI's video-decode.js; automated equality checks verified this.
This file is maintained separately. Do not edit the original PI files.

The original videoDecode still follows its original procedure, including skipping
decode when support is reported false. The new videoValidation tests independently.
For each H.264, VP9 and AV1 configuration, it records the support answer, then
attempts decoding three times, four frames each time. A false answer, query error,
query timeout or missing query method does not suppress decoding. If the decoding
API itself is absent, all samples retain explicit api_absent records instead.
Every browser receives the same samples, configurations, order and limits.

The page displays reported support beside the three actual attempt outcomes.
This is not a comparison against the separate media collector's 1080p queries.

## What outcomes mean

Each claim is answered (true or false), timed_out, error, or api_absent.
Each decoding repetition is decoded, error, timed_out or api_absent, with details.
Decoded requires all four expected frames with matching timestamps and dimensions.
This confirms frame production, not pixel correctness. Frames are closed promptly,
and the decoder is closed after success, error or timeout. A decoding error does
not prove general lack of codec support. A timeout is inconclusive.

The comparison may report claim_yes_decode_yes, claim_no_decode_yes,
claim_unknown or inconclusive. Mixed repetition results are retained as mixed.
These are observations, not an accusation of spoofing or proof of the cause.
Do not score an error or timeout as an unsupported codec.

## Time limits

The original group budgets remain: 45 seconds each except original videoDecode
at 300 seconds. New videoValidation has a 180-second group budget. Internally its
claim queries have 5 seconds and decoding attempts have 15 seconds each. These
are provisional operational waiting limits, identical across browsers for each
step, not scientifically validated support thresholds. The nested waits total
at most 150 seconds before overhead, beneath the outer 180-second budget.
Promises cannot interrupt blocking JavaScript. A support query that timed out may
settle later; its late answer is ignored. New decoding timeouts close the decoder.
Original collector timeouts still cannot cancel their work; requiresReload records
outer timeouts and such runs require review before reuse.

## Fixed collection reporting

Use collection[groupId].outcome for group coverage: results_returned, api_absent,
timed_out, test_error, not_attempted. These counts add to eight scheduled groups.
Results returned means a report exists, not that all nested checks passed.
Individual claims, attempts, errors and timeouts stay under probes.
The JSON result schema remains result@2; experiment ID is now pi-suite-v3.
Do not combine v2 and v3 as if they used the same procedure.

## MDN and file preservation

The MDN 7.3.17 manifest is unchanged: 10,396 entries, with 1,029 fixed exclusions
for unreliable or other-context checks. Its checksum is checked by the runner.
Feature presence remains true/false/null (unknown), distinct from group outcomes.
Keep the previous pilot JSON files. The v2 package is retained as a working backup.
The simplified publishing source is browser_spoofing/docs; the old development
page in code/browser-engine-tests is not the publishing source for this version.

## Verification and next pilot

Automated tests (using simulated browser APIs, not real-browser execution) passed:
exact sample/configuration equality; false/error/timed-out/missing claim queries
still followed by decoding; 36 frames attempted for all three samples; API absence;
constructor/configuration/callback failures; incomplete and wrong-timestamp frames;
decoding timeouts; cleanup; eight-group order and counts; unchanged PI files;
page script syntax. No real-browser run of v3 has yet been collected.

1. Upload to the correct repository above and wait for the website to show pi-suite-v3.
2. Run Safari with label safari-mac-v3-pilot-1 and download the JSON.
3. Inspect videoValidation's claim and actual outcomes, not only the green group labels.
4. Repeat the small pilot twice per browser (Chrome, Firefox, Safari) with fresh
   page loads and unique labels. Keep every attempted run, including failures.
5. Review differences before freezing this version for full research collection.

## Candidate file hashes

31787ddc84f72cb540b0008cb4593d486a73cb7aa0455bf3036140a631d9c495  index.html
73cc3b18e62fba51440645d53d77bf66e71867b8eff6dadf6081b1fad4cd860a  runner.js
99e40623a866432efc8948b4e3f0519e0c753e7480dbe0f20da2f9d8d45f6e03  bcd-surface.js
6dd8992ce326416f8535651641eec086e77e41fe26897335d9bf466e5198520d  data/feature-manifest.json
c5c15827851b9022fb4d983dd412f493c0639973a1dc9d80fb0976dafbb62b76  engine-surface.js
631a25e85dae8d3538e9d464af6d83545c349ccc64a5b3f779fc872c0e45f68c  categorical-capabilities.js
5d221d96b5fabe45b4252f07cbff045f550efa5751e823b332acb9285966407d  audio.js
9aaffe1c2c8a352ae901d52db372e27bfe2e6717f995588c9764fdd894b2083b  media.js
025a5f818fc3623fc7f73d2139b5c59ec4e51ab57790c30c0fb773af0c46c0ce  text.js
e1ef0d4375819ad1ccf0fc8b580fdc8138a73924e81d9f0c63fdc89d7e7203dc  video-decode.js
ce779f3908b241356fa99ad926aefeb093e3f4713d4028538f77f4b9723bc88e  common.js
0d2301b4943b548d0191816d428d1774b3928e0b786dab4aee6ee514425172d0  video-validation.js
