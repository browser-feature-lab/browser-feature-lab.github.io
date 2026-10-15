// Unknown support is never collapsed into unsupported.
export const result = (status, reason, extra = {}) => ({ status, reason, ...extra });
export const errorText = e => String(e && e.message || e);
export async function bounded(action, ms, lateCleanup = () => {}) {
  let timer, expired = false;
  const work = Promise.resolve().then(action).then(value => {
    if (expired) { try { lateCleanup(value); } catch (_) {} }
    return { status: 'returned', value };
  }, e => result('error', errorText(e), { exception: { name: String(e && e.name || 'Error'), message: errorText(e) } }));
  try {
    return await Promise.race([work, new Promise(resolve => {
      timer = setTimeout(() => { expired = true; resolve(result('timed_out', 'Waiting limit exceeded; support unknown')); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
export function claim(list, id) {
  return list.status === 'returned'
    ? { status: 'answered', supported: list.value.includes(id) }
    : { status: list.status, supported: null, reason: list.reason };
}

// Common collection vocabulary; the original result remains the measurement.
export function collectionOutcome(observation) {
  if (!observation) return 'unknown';
  const status = observation.status;
  if (['api_absent', 'timed_out', 'unknown', 'not_attempted', 'test_error'].includes(status)) return status;
  if (status === 'error' || status === 'failed') return 'test_error';
  if (['answered', 'returned', 'obtained', 'unsupported', 'granted', 'exercised', 'decoded', 'available'].includes(status)) return 'results_returned';
  return 'unknown';
}
