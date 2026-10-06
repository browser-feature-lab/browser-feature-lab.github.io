# Browser suite: pi-suite-v2

This replaces the unpublished pi-suite-v1 reporting draft. Nothing has been published by
this update. Publish the contents of this package together, with index.html
at the GitHub Pages publishing root and data/feature-manifest.json under data/.
The local website source is browser_spoofing/docs. The older development page
under code/browser-engine-tests has not been converted to this suite.

## Fixed sequence

1. engineSurface — PI engine/build observations
2. bcdSurface — frozen MDN presence checklist
3. capabilities — PI reported capabilities, font measurements and battery query
4. audio — PI offline audio rendering
5. media — PI media support queries
6. text — PI text rendering, including its internal worker test
7. videoDecode — PI decoding of embedded H.264, VP9 and AV1 samples

common.js is the PI's shared helper, not an eighth test. All seven PI files
are byte-for-byte unchanged from Git HEAD. No other legacy probe family runs.
The suite uses the PI collectors' existing default inputs and repetitions.
The browser identity and URL ?only= setting never select different groups.

## Collection

Open the same HTTPS URL, enter a configuration label, click Run all tests,
and Download JSON. One timestamped JSON file contains all seven group keys,
the suite order, timeout budgets, browser identity and experiment ID.
There is no server-side upload. Keep pi-suite-v2 results separate from older
experiments. Do not regenerate the manifest or change code during collection.
Record actual browser version and OS from the test platform in the label/log;
the browser's self-reported identity is a claim, not independent ground truth.

An unavailable API is not a failed capability claim. Loading failures,
timeouts and thrown errors remain recorded. A group returning status ok means
it returned data, not that every nested check worked; preserve nested errors
and unsupported outcomes. The PI code itself may omit nested values when APIs
are unavailable. The fixed guarantee here is the same suite and procedure,
with all seven group results retained, not successful measurements everywhere.

Each group has a 45-second budget, except video decoding at 300 seconds.
Browser identity has a 10-second budget. Loading is covered by group budgets.
These guards bound asynchronous waits; they cannot interrupt blocking code.
A timed-out collector may continue in the background, affecting subsequent
measurements. Such runs set requiresReload: true; keep them separately for
review, download the diagnostic JSON, then reload before retrying. Do not
interpret a timed-out group as a negative support result.

## MDN checklist

MDN 7.3.17 has 10,396 frozen entries. Existing annotations exclude 1,029
unreliable or other-context entries from page-only measurement; all IDs remain.
The other 9,367 checks use the same procedure in every browser. Values are true
(present), false (absent), or null (could not check), with reasons. A checksum
rejects a changed manifest. Presence does not establish correct operation.
The local offline analyzer was already updated to abstain on null results.

## Interpretation limits

Audio, text and video actively render or decode fixed inputs. This is a static
hosted website, but these are not merely feature-presence checks. Video also
records timing. Use this scope as requested, without calling all measurements
non-behavioural. Environmental values, such as battery level, vary between runs.

The media collector asks about four formats at 1080p; video-decode checks three
embedded streams at 64 by 64 pixels with different codec configurations. Do not
compare these directly as matched claim/validation pairs. video-decode queries
support for each of its own stream configurations, but skips actual decoding
when that query returns false. Therefore it cannot discover 'claims unsupported
but actually decodes' cases. This integration does not redesign those PI tests.

## Verification and trial before research collection

Automated runner tests passed using mocked collectors: fixed order, all seven
keys, ignored filtering, MDN options, preserved PI defaults, missing APIs,
loading failures, collector errors, timeouts and a hung identity request.
Page script syntax passed. All PI files match Git HEAD in both source and docs.
These are not real-browser execution results. Local browser preview was denied
previously and was not retried or bypassed.

Trial the published candidate in ordinary Chrome, Firefox and Safari, including
the oldest planned versions. Run twice per browser; save both JSONs. Check the
pi-suite-v2 ID, seven group keys, timeout flags and nested unavailable/error
records. Confirm the download works. Review expected support differences and
repeatability before freezing the candidate for full research collection.

## Collection outcome reporting (version 2)

Use collection[groupId].outcome for collection coverage tables. The legacy raw
probes[groupId].status is preserved for compatibility and MUST NOT be used to
count timeouts as absent APIs. Individual feature answers remain under probes.

- results_returned: the collector returned a report. This is not a support verdict.
- api_absent: a runner precondition directly found a required API missing.
  It establishes only that the API is not exposed here, not that the browser
  lacks the underlying physical hardware or codec.
- timed_out: the whole group did not return within the waiting limit; support unknown.
- test_error: a thrown error, module load/parse failure, invalid result, or collector
  inability to produce a report without direct evidence of an absent API.
- not_attempted: a scheduled group has not started. A normally completed download
  has zero such groups. If the page itself cannot load or is closed, no download
  may exist; record that attempt separately in the pilot log.

collectionSummary contains scheduled (always seven) and one count for each
outcome. Those five counts add to scheduled. Each collection record also includes
its reason, elapsedMs and timeoutMs. timeoutPolicy labels the limits as provisional
operational pilot limits; they are not validated support thresholds. No browser
gets a different limit for the same group. Limits have not changed in this update.

Inner checks can still report errors, unsupported results or their own timeouts
inside a returned report. These stay visible in the raw report and are not
silently promoted to group-level API absence or a group timeout. The outcome table
measures report collection, not successful execution of every subcheck.

Browser identity is metadata and does not count as an eighth test. An identity
timeout is recorded separately and requires reload, but does not change group
counts. Do not merge old experiment versions into a pi-suite-v2 coverage table.

## Pilot log

Use this candidate in Chrome, Firefox and Safari before research collection.
Record the actual browser version and OS, experiment ID, run label, and whether
the page loaded and JSON downloaded. Repeat each twice with a fresh page load.
Use the same page and inputs. Check seven collection rows, totals adding to seven,
and reasons for incomplete groups. Retain errors and timeouts; never silently
remove those attempts from the denominator. Review nested test outcomes too.

The goal of the pilot is to diagnose compatibility problems and assess whether
waiting limits are sensible. It cannot establish support from elapsed time.
If the protocol changes after the pilot, issue a new experiment ID before the
full dataset. No real-browser pilot has yet been performed for this candidate.

Extra automated checks passed for v2: mutually exclusive collection categories,
counts adding to seven, equal budgets across mocked identities, generic failures
not counted as absent APIs, and nested test failures retained under returned data.

## File hashes for this candidate

c02947cd624c43b92f0e64871350b7a12398b3d7ba6ba857215e7b10e4a7afe6  index.html
0030d2589b119f7feab07018a6ad5195d8a8c9d6db86ce28619b4a61448e9f6a  runner.js
99e40623a866432efc8948b4e3f0519e0c753e7480dbe0f20da2f9d8d45f6e03  bcd-surface.js
6dd8992ce326416f8535651641eec086e77e41fe26897335d9bf466e5198520d  data/feature-manifest.json
c5c15827851b9022fb4d983dd412f493c0639973a1dc9d80fb0976dafbb62b76  engine-surface.js
631a25e85dae8d3538e9d464af6d83545c349ccc64a5b3f779fc872c0e45f68c  categorical-capabilities.js
5d221d96b5fabe45b4252f07cbff045f550efa5751e823b332acb9285966407d  audio.js
9aaffe1c2c8a352ae901d52db372e27bfe2e6717f995588c9764fdd894b2083b  media.js
025a5f818fc3623fc7f73d2139b5c59ec4e51ab57790c30c0fb773af0c46c0ce  text.js
e1ef0d4375819ad1ccf0fc8b580fdc8138a73924e81d9f0c63fdc89d7e7203dc  video-decode.js
ce779f3908b241356fa99ad926aefeb093e3f4713d4028538f77f4b9723bc88e  common.js
