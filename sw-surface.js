"use strict";

/*
 * sw-surface.js  -  FAMILY: BCD feature surface, service worker context
 * ----------------------------------------------------------------------
 * Registers a short-lived service worker, runs the same BCD probe inside its
 * global scope, then unregisters it.
 *
 * Why a fourth context. A service worker is the furthest global from the page:
 * no DOM, no window, its own lifecycle, and it is started by the browser
 * itself rather than by the document. It is also the context anti-detect
 * tooling is least likely to have patched, because patching it means shipping
 * code into a worker the tool did not spawn. ServiceWorkerGlobalScope,
 * Clients, WindowClient, FetchEvent and PushEvent exist nowhere else, so BCD
 * entries for them are only truthfully answerable from here.
 *
 * Two hard requirements, both of which degrade to `unavailable` rather than
 * failing the run: a secure context (127.0.0.1 counts, a LAN IP does not), and
 * module service worker support, since the probe is an ES module.
 */

const unavailable = reason => ({ status: "unavailable", reason });

const SW_TIMEOUT_MS = 120000;
const SW_ACTIVATION_TIMEOUT_MS = 30000;

export async function collectBcdSurfaceServiceWorker(options = {}) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return unavailable("navigator.serviceWorker is not available");
  }
  if (typeof isSecureContext === "boolean" && !isSecureContext) {
    return unavailable("service workers require a secure context (use 127.0.0.1, not a LAN address)");
  }
  if (typeof MessageChannel === "undefined") {
    return unavailable("MessageChannel is not available");
  }

  const manifestUrl = new URL(
    options.manifestUrl || "./data/feature-manifest.json",
    location.href
  ).href;

  let registration = null;
  try {
    registration = await navigator.serviceWorker.register(options.scriptUrl || "./sw-probe.js", {
      type: "module",
      scope: "./"
    });
  } catch (error) {
    return unavailable(
      "service worker could not register: " + String((error && error.message) || error)
    );
  }

  try {
    const worker = await waitForActive(registration);
    if (!worker) return unavailable("service worker never reached the activated state");
    return await ask(worker, manifestUrl);
  } catch (error) {
    return unavailable("service worker probe failed: " + String((error && error.message) || error));
  } finally {
    /*
     * Always tear down. A probe worker left registered would be started again
     * on the next page load, before the runner asks for it, and would sit in
     * the origin's registration list confusing later runs.
     */
    try {
      await registration.unregister();
    } catch (error) {
      /* nothing useful to do if the browser will not let go of it */
    }
  }
}

function waitForActive(registration) {
  if (registration.active) return Promise.resolve(registration.active);

  const pending = registration.installing || registration.waiting;
  if (!pending) return Promise.resolve(null);

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(registration.active || null), SW_ACTIVATION_TIMEOUT_MS);

    pending.addEventListener("statechange", () => {
      if (pending.state === "activated") finish(pending);
      else if (pending.state === "redundant") finish(null);
    });
  });
}

function ask(worker, manifestUrl) {
  return new Promise(resolve => {
    let settled = false;
    const channel = new MessageChannel();

    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        channel.port1.close();
      } catch (error) {
        /* closing a dead port is not an error worth reporting */
      }
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(unavailable("service worker did not respond within " + SW_TIMEOUT_MS + " ms")),
      SW_TIMEOUT_MS
    );

    channel.port1.onmessage = event => finish(event.data);
    channel.port1.onmessageerror = () =>
      finish(unavailable("service worker message could not be deserialised"));

    try {
      worker.postMessage({ manifestUrl: manifestUrl }, [channel.port2]);
    } catch (error) {
      finish(
        unavailable("could not post to service worker: " + String((error && error.message) || error))
      );
    }
  });
}
