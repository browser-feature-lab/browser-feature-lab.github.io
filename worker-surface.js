"use strict";

/*
 * worker-surface.js  -  FAMILY: BCD feature surface, worker context
 * ------------------------------------------------------------------
 * Spawns a module worker that runs the same BCD probe against the worker
 * global scope, and returns its result envelope unchanged.
 *
 * Kept separate from the worker script itself so that a browser without module
 * worker support degrades to `unavailable` rather than taking the run down.
 */

const unavailable = reason => ({ status: "unavailable", reason });

const WORKER_TIMEOUT_MS = 120000;

export function collectBcdSurfaceWorker(options = {}) {
  if (typeof Worker === "undefined") {
    return Promise.resolve(unavailable("Worker constructor is not available"));
  }

  const manifestUrl = new URL(
    options.manifestUrl || "./data/feature-manifest.json",
    location.href
  ).href;

  return new Promise(resolve => {
    let worker;
    let settled = false;

    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (worker) worker.terminate();
      } catch {
        /* terminating a dead worker is not an error worth reporting */
      }
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(unavailable(`worker did not respond within ${WORKER_TIMEOUT_MS} ms`)),
      WORKER_TIMEOUT_MS
    );

    try {
      /*
       * Module workers are required: the probe is an ES module and imports
       * bcd-surface.js. Engines without `{ type: "module" }` support throw
       * here rather than failing silently later.
       */
      worker = new Worker("./bcd-worker.js", { type: "module" });
    } catch (error) {
      finish(unavailable(`module worker could not start: ${String((error && error.message) || error)}`));
      return;
    }

    worker.onmessage = event => finish(event.data);

    worker.onerror = event =>
      finish(unavailable(`worker error: ${(event && event.message) || "unknown"}`));

    worker.onmessageerror = () => finish(unavailable("worker message could not be deserialised"));

    try {
      worker.postMessage({ manifestUrl });
    } catch (error) {
      finish(unavailable(`could not post to worker: ${String((error && error.message) || error)}`));
    }
  });
}
