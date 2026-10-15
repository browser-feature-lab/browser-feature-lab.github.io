import { result, errorText, bounded, claim } from './outcomes.js';
export const FEATURES = Object.freeze([
  'depth-clip-control', 'depth32float-stencil8', 'texture-compression-bc',
  'texture-compression-bc-sliced-3d', 'texture-compression-etc2', 'texture-compression-astc',
  'texture-compression-astc-sliced-3d', 'timestamp-query', 'indirect-first-instance',
  'shader-f16', 'rg11b10ufloat-renderable', 'bgra8unorm-storage', 'float32-filterable',
  'float32-blendable', 'clip-distances', 'dual-source-blending', 'subgroups'
]);
export const WAIT_MS = 5000;
async function exercise(device, id) {
  if (id !== 'shader-f16') return result('not_attempted', 'No curated feature-specific execution test');
  const resources = [];
  let closed = false;
  const work = bounded(async () => {
    device.pushErrorScope('validation');
    try {
      const module = device.createShaderModule({ code: `enable f16;
        @group(0) @binding(0) var<storage, read_write> output: array<f32>;
        @compute @workgroup_size(1) fn main() { let a = f16(1.5); output[0] = f32(a + a); }` });
      const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
      if (closed) return result('unknown', 'Operation completed after deadline');
      // STORAGE|COPY_SRC and MAP_READ|COPY_DST; numeric flags avoid missing globals in older engines.
      const storage = device.createBuffer({ size: 4, usage: 128 | 4 }); resources.push(storage);
      const readback = device.createBuffer({ size: 4, usage: 1 | 8 }); resources.push(readback);
      const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: storage } }] });
      const encoder = device.createCommandEncoder(); const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.dispatchWorkgroups(1); pass.end();
      encoder.copyBufferToBuffer(storage, 0, readback, 0, 4); device.queue.submit([encoder.finish()]);
      await readback.mapAsync(1);
      if (closed) return result('unknown', 'Readback completed after deadline');
      const value = new Float32Array(readback.getMappedRange())[0]; readback.unmap();
      const error = await device.popErrorScope();
      return !error && value === 3 ? result('exercised', 'f16 compute dispatched and read back 3', { value })
        : result('error', error ? error.message : 'Unexpected compute output', { value });
    } catch (e) { return result('error', errorText(e)); }
  }, WAIT_MS);
  try {
    const r = await Promise.race([work, device.lost.then(info => result('unknown', 'Device lost', { detail: info.message }))]);
    return r.status === 'returned' ? r.value : r;
  } finally { closed = true; resources.forEach(r => { try { r.destroy(); } catch (_) {} }); }
}
async function check(gpu, id, reported) {
  const row = { id, reported: claim(reported, id), activation: result('not_attempted', 'Not started'), behavioral: result('not_attempted', 'No device'), requestable: null, granted: null };
  // Adapters can be consumed after requestDevice. Use identical fresh-adapter options
  // for each row; retain its advertised list to detect adapter availability changes.
  const fresh = await bounded(() => gpu.requestAdapter(), WAIT_MS);
  if (fresh.status !== 'returned' || !fresh.value) {
    row.activation = fresh.status === 'returned' ? result('unknown', 'Fresh adapter returned null') : fresh;
    return row;
  }
  const adapter = fresh.value;
  try { row.requestAdapterFeatures = Array.from(adapter.features).sort(); }
  catch (e) { row.requestAdapterFeaturesError = errorText(e); }
  // Attempt requiredFeatures even when advertised false/unknown. One device per feature.
  const requested = await bounded(() => adapter.requestDevice({ requiredFeatures: [id] }), WAIT_MS, d => d.destroy());
  if (requested.status !== 'returned') { row.activation = requested; return row; }
  row.requestable = true;
  const device = requested.value;
  try {
    row.deviceFeatures = Array.from(device.features).sort();
    row.granted = device.features.has(id);
    row.activation = row.granted ? result('granted', 'Required feature exposed by device')
      : result('unknown', 'Device did not expose requested feature');
    row.behavioral = row.granted ? await exercise(device, id) : result('not_attempted', 'Required feature was not granted');
  } catch (e) { row.activation = result('error', errorText(e)); }
  finally { try { device.destroy(); } catch (e) { row.cleanupError = errorText(e); } }
  return row;
}
export async function collectWebGPUValidation() {
  const gpu = typeof navigator === 'undefined' ? null : navigator.gpu;
  const requested = !gpu || typeof gpu.requestAdapter !== 'function'
    ? result('api_absent', 'WebGPU adapter API absent')
    : await bounded(() => gpu.requestAdapter(), WAIT_MS);
  const adapter = requested.status === 'returned' ? requested.value : null;
  let reported = requested.status === 'returned' ? result('unknown', 'Adapter returned null; no unsupported inference') : requested;
  if (adapter) {
    try { reported = { status: 'returned', value: Array.from(adapter.features).sort() }; }
    catch (e) { reported = result('error', errorText(e)); }
  }
  const checks = [];
  for (const id of FEATURES) checks.push(adapter ? await check(gpu, id, reported) : {
    id, reported: claim(reported, id), activation: result(reported.status, reported.reason),
    behavioral: result('not_attempted', 'No adapter'), requestable: null, granted: null
  });
  // Supplemental discovery is separate from the fixed primary denominator.
  // A fixed 16-row cap bounds pathological/spoofed lists; overflow remains explicit.
  const supplemental = [];
  for (const id of reported.status === 'returned' ? reported.value.filter(f => !FEATURES.includes(f)) : []) {
    supplemental.push(supplemental.length < 16 ? await check(gpu, id, reported) : { id, reported: claim(reported, id), activation: result('not_attempted', 'Supplemental 16-feature cap reached'), behavioral: result('not_attempted', 'Outside supplemental budget'), requestable: null, granted: null });
  }
  return { status: 'ok', value: { revision: 2, apiPresent: !!gpu, waitMs: WAIT_MS, adapter: adapter ? result('available', 'Adapter obtained') : reported, reported, checks, supplemental },
    confidence: 'low', detail: 'Request rejection is an error, not proof of unsupported hardware. Only f16 has an execution/readback test. Reported lists never suppress scheduled requests.' };
}
