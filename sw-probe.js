"use strict";

/*
 * sw-probe.js
 * -----------
 * Runs the BCD feature probe inside a ServiceWorkerGlobalScope.
 *
 * skipWaiting/claim are here so the worker activates on its first install
 * instead of waiting for a navigation that will never come - the page that
 * registered it is the page that wants the answer, and it is waiting.
 */

import { collectBcdSurface } from "./bcd-surface.js";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  const port = event.ports && event.ports[0];
  if (!port) return;

  const manifestUrl =
    (event.data && event.data.manifestUrl) || "./data/feature-manifest.json";

  /*
   * waitUntil keeps the worker alive for the whole probe. Without it the
   * browser is free to shut an idle service worker down mid-scan.
   */
  event.waitUntil(
    collectBcdSurface({ manifestUrl: manifestUrl })
      .then(result => port.postMessage(result))
      .catch(error =>
        port.postMessage({
          status: "failed",
          error: String((error && error.message) || error)
        })
      )
  );
});
