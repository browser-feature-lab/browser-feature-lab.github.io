// Only startup presentation. Do not install shims into the measured browser.
import('./unified.js').catch(function(error) {
 document.getElementById('status').textContent=
  'Runner could not load. This build requires Chrome 80+, Firefox 74+, or Safari 13.1+ / iOS 13.4+ syntax and HTTPS or localhost. ' +
  'A network error can also prevent loading. Record this as a runner failure, not feature absence. Details: ' + String(error && error.message || error);
});
