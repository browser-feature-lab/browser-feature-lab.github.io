# pi-suite-v4 — Claim vs. actual validation pilot

Upload this package's contents to the publishing root of
https://github.com/browser-feature-lab/browser-feature-lab.github.io
The website address remains https://browser-feature-lab.github.io/.
Do not upload to Mashequr/browser-test-site. Preserve the data folder.

## What changed in v4

The existing videoValidation family is now presented as **Claim vs. actual validation**.
Only presentation, comparison labels and version metadata changed. The decoding
procedure, fixed samples, configurations, repetitions, order and limits remain v3's.
The collector revision is now 2; its claim and actual records remain unchanged.

## Existing fixed procedure

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

The comparison reports claim_yes_validation_yes or claim_no_validation_yes when
all three repetitions decode successfully and the claim is known. A successful
validation with an unavailable claim reports claim_unknown_validation_yes.
All other outcomes report validation_unknown, including errors, timeouts, absent
APIs and mixed repetitions. The existing decoder has no definitive validation
failure outcome, so no error is relabelled as validation_failed.
Mixed repetition results are retained as mixed.
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
The JSON result schema remains result@2; experiment ID is now pi-suite-v4.
Keep experiment versions separate when analyzing their results.

## MDN and file preservation

The MDN 7.3.17 manifest is unchanged: 10,396 entries, with 1,029 fixed exclusions
for unreliable or other-context checks. Its checksum is checked by the runner.
Feature presence remains true/false/null (unknown), distinct from group outcomes.
Keep the previous pilot JSON files. The v2 package is retained as a working backup.
The simplified publishing source is browser_spoofing/docs; the old development
page in code/browser-engine-tests is not the publishing source for this version.

## Verification and next pilot

V4 sanity checks use simulated browser APIs to check independent decoding after
false, errored, timed-out or absent claims; explicit comparisons; decoding errors,
timeouts and missing APIs; fixed suite settings; script syntax; and unchanged PI
files and samples. These checks do not replace real-browser pilots.

1. Confirm the published website shows pi-suite-v4.
2. Run one Chrome, one Firefox and one Safari pilot with fresh page loads and
   unique labels, then download each JSON file.
3. Review videoValidation's claims, attempts and comparisons before freezing the
   website for full research collection. Keep every attempted run, including errors.
