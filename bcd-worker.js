"use strict";

/*
 * bcd-worker.js
 * -------------
 * Runs the BCD feature probe inside a worker global scope.
 *
 * Two reasons this exists.
 *
 * 1. Correctness. WorkerGlobalScope, WorkerNavigator, WorkerLocation and
 *    FileReaderSync do not exist in a page. Probed from one they are absent by
 *    definition, and BCD says they should be there, so every run manufactured
 *    ~85 "missing" features that were only ever an artefact of where the probe
 *    was standing.
 *
 * 2. Signal. A worker gets its own global scope, built by the same engine but
 *    reached by a different path. Spoofing tools that patch the page's globals
 *    do not always patch the worker's. A browser whose window and worker
 *    surfaces disagree about the engine is telling on itself, and the
 *    disagreement is far harder to fake than any single value.
 */

import { collectBcdSurface } from "./bcd-surface.js";

self.onmessage = async event => {
  try {
    const result = await collectBcdSurface({
      manifestUrl: (event.data && event.data.manifestUrl) || "./data/feature-manifest.json"
    });
    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      status: "failed",
      error: String((error && error.message) || error)
    });
  }
};
