# PI suite v7 unified development — ui-r2 candidate

This is an unpublished UI compatibility candidate. It repairs the unified results table and download recovery, with collector bytes unchanged. See `COMPATIBILITY.md` and package-root `DEPLOYMENT.md`. Deploy only the `releases/pi-suite-v7-unified-dev/` directory. Do not replace or modify `releases/pi-suite-v6/` or `releases/pi-suite-v7-dev/`.

## Contents and execution

The ten v6 groups run through the byte-identical frozen runner: engineSurface, bcdSurface (10,396 entries, BCD 7.3.17), capabilities, audio, media, text, videoDecode, videoValidation, webglValidation, webgpuValidation. HTMLVideoElement playback then runs ten baseline files and four exploratory files. The exploratory inventory is retained; unimplemented inventory entries are not tests.

The full original releases are preserved under `baseline/` and `playback/`. `data/feature-manifest.json` is an identical copy needed by the original v6 runner's document-relative fetch. The new `playback.js` extracts the published helper logic and adds module-relative URLs, bounded network/control waits, strict verified-media gating, and per-sample exception capture. No codec strings, samples, dimensions, claim algorithms, or frame-readback thresholds were changed.

All packaged files listed in `integrity.json` are checked before a unified run. Media are checked again immediately before playback. Missing crypto, missing files, or hash mismatches stop collection rather than imply unsupported features. Integrity is consistency against a local manifest, not a signed trust guarantee; there is a fetch-to-playback race if hosted files change mid-run. Serve immutable release files.

## Exports

`pi-suite-v7-unified-dev/result@1` is a new envelope, not a v6 replacement schema. `baseline` holds the original `browser-engine-tests/result@2` document unmodified, including its frozen experiment identity, ten-group schedule, timeout policy, per-check observations, and collection outcomes. Download original v6 JSON extracts that object for existing analysis tools. The outer experiment is explicitly not frozen.

`playback.results` contains ten baseline samples; `playback.exploratoryResults` contains four exploratory samples. Both retain claims, media-capability answers, integrity and behavior separately. `provenance` records the source commit and per-file hashes; `integrity` records the checked package manifest hash. A completed envelope means collection finished, not that codecs or features are supported. Incomplete exports retain available evidence and errors. CSV summarizes group outcomes and playback rows only; use JSON for analysis.

## Comparison protocol

Use a fixed build hash, HTTPS origin, browser/OS versions, hardware, profile and settings; retain run labels and environment metadata. Keep the tab foreground. Save full JSON after each run. Compare the nested v6 results with frozen v6 exports by group/check ID, accounting for origin and context. The new wrapper UI and preceding integrity fetches are changed execution conditions even though collector bytes are identical. Claims and playback observations must not be merged into one support score. MPEG-1/MPEG-2 and generic QuickTime MIME claims remain codec-ambiguous. Pixel checksums are observations, not reference-image validation.

For reproducibility collect at least three independently launched sessions per target configuration. The copied video-only reference also retains its original three-round button, which tests within-session consistency only. Unified runs are one complete run per click. A v6 timeout retains the original timeout semantics and requires reload before another run; an unresolved v6 promise may still run in the background. Playback control waits have a 7-second bound and fetches a 15-second bound; timed-out queries may remain pending. Do not infer feature absence from collection failures.

## Deploy and verify

No deployment is authorized by this delivery. Follow package-root `DEPLOYMENT.md` after explicit push/publish instruction. Preview the included release locally; run `python3 verify.py` in this directory. A separate path `releases/pi-suite-v7-unified-dev-ui-r2/` is recommended for eventual staging so the current unified release also remains available. Renaming the release directory does not rename its schema/experiment identity; use `provenance.runnerRevision` and the manifest digest to identify the build. Never replace frozen v6 or standalone v7-dev.

The source commit in provenance remains pinned. The parent manifest digest ties this candidate to its input. The current manifest includes every release file except itself. Package SHA-256 is supplied outside the ZIP to avoid recursive hashing.
