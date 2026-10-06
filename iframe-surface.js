"use strict";

/*
 * iframe-surface.js  -  FAMILY: BCD feature surface, iframe context
 * -----------------------------------------------------------------
 * Loads a same-origin child document and runs the same BCD probe inside it.
 *
 * Why a third context. A nested browsing context gets a brand new Window,
 * built by the same engine but created after the page's own scripts have
 * already run. Tooling that rewrites the top-level window - by injecting a
 * content script, by patching globals at document_start, by swapping a
 * property descriptor - has to do that work again for every child frame, and
 * frequently does not. Where the page and the frame disagree about the engine,
 * the disagreement is the finding.
 *
 * Kept separate from the child document so that a browser which cannot create
 * the frame degrades to `unavailable` rather than taking the run down.
 */

const unavailable = reason => ({ status: "unavailable", reason });

const IFRAME_TIMEOUT_MS = 120000;

export function collectBcdSurfaceIframe(options = {}) {
  if (typeof document === "undefined" || !document.body) {
    return Promise.resolve(unavailable("no document to attach a frame to"));
  }

  const manifestUrl = new URL(
    options.manifestUrl || "./data/feature-manifest.json",
    location.href
  ).href;
  const probeUrl = new URL(options.probeUrl || "./iframe-probe.html", location.href).href;

  /* Correlates our reply with ours alone; other frames on the page may chat. */
  const token = "iframe-probe-" + Math.random().toString(36).slice(2);

  return new Promise(resolve => {
    let settled = false;
    let frame = null;

    const onMessage = event => {
      if (event.origin !== location.origin) return;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || data.token !== token) return;
      finish(data.result);
    };

    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      try {
        if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      } catch (error) {
        /* removing an already-detached frame is not an error worth reporting */
      }
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(unavailable("iframe did not respond within " + IFRAME_TIMEOUT_MS + " ms")),
      IFRAME_TIMEOUT_MS
    );

    window.addEventListener("message", onMessage);

    try {
      frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("title", "engine probe");
      /*
       * Deliberately NOT sandboxed. A sandbox without allow-same-origin gives
       * the frame an opaque origin, which strips exactly the secure-context and
       * storage-backed APIs the probe is trying to count. The frame is our own
       * document on our own origin; there is nothing to isolate it from.
       */
      frame.style.cssText =
        "position:absolute;left:-9999px;top:0;width:0;height:0;border:0;visibility:hidden";
      frame.src = probeUrl;
      frame.onload = () => {
        try {
          frame.contentWindow.postMessage({ token: token, manifestUrl: manifestUrl }, location.origin);
        } catch (error) {
          finish(unavailable("could not post to iframe: " + String((error && error.message) || error)));
        }
      };
      frame.onerror = () => finish(unavailable("iframe failed to load"));
      document.body.appendChild(frame);
    } catch (error) {
      finish(unavailable("iframe could not be created: " + String((error && error.message) || error)));
    }
  });
}
