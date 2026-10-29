import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { collectVideoValidation, STREAMS, SETTINGS } from '../next/video-validation.js';
import { collectWebGLValidation, EXTENSIONS } from '../next/webgl-validation.js';
import { collectWebGPUValidation, FEATURES } from '../next/webgpu-validation.js';
import { bounded } from '../next/outcomes.js';
const tests = [];
async function test(name, fn) { await fn(); tests.push(name); console.log('PASS', name); }
const realTimer = globalThis.setTimeout;
const fastTimers = () => { globalThis.setTimeout = (fn, ms) => realTimer(fn, Math.min(ms, 10)); };
const resetTimers = () => { globalThis.setTimeout = realTimer; };
let behavior = 'good', claimMode = false, closed = 0, framesClosed = 0, configurations = 0;
class Decoder {
  constructor(cb) { this.cb = cb; }
  static async isConfigSupported(config) {
    if (claimMode === 'error') throw Error('query failed');
    if (claimMode === 'hang') return new Promise(() => {});
    return { supported: claimMode, config };
  }
  configure() { configurations++; if (behavior === 'error') throw Error('configure failed'); }
  decode(chunk) {
    if (behavior === 'hang') return;
    this.cb.output({ timestamp: chunk.timestamp, codedWidth: 128, codedHeight: 66,
      visibleRect: { width: behavior === 'wrong' ? 63 : 64, height: 64 }, displayWidth: 64, displayHeight: 64,
      close() { framesClosed++; } });
  }
  flush() { return behavior === 'hang' ? new Promise(() => {}) : Promise.resolve(); }
  close() { closed++; }
}
await test('Six fixed streams, added payload hashes and H264 SPS profile bytes', () => {
  assert.equal(STREAMS.length, 6); assert.equal(SETTINGS.repetitions, 3);
  for (const s of STREAMS.slice(3)) assert.equal(crypto.createHash('sha256').update(Buffer.from(s.dataBase64, 'base64')).digest('hex'), s.sha256);
  assert.deepEqual(STREAMS.slice(3).map(s => s.config.codec), ['avc1.42C00A','avc1.4D400A','vp8']);
  const old = fs.readFileSync(new URL('./v5-video-validation-reference.js', import.meta.url),'utf8');
  for (const s of STREAMS.slice(0,3)) assert.ok(old.includes(s.dataBase64));
});
await test('Absent decoder retains six claims and 18 explicit attempts', async () => {
  const r = await collectVideoValidation(); assert.equal(r.value.codecs.length, 6);
  for (const s of r.value.codecs) { assert.equal(s.claim.status,'api_absent'); assert.equal(s.actual.repetitions.length,3); assert.equal(s.actual.outcome,'api_absent'); }
});
globalThis.VideoDecoder = Decoder; globalThis.EncodedVideoChunk = class { constructor(o) { Object.assign(this,o); } };
for (const mode of [false, true, 'error', 'hang', 'absent']) {
  await test('Independent decode after claim '+mode, async () => {
    const method = Decoder.isConfigSupported;
    claimMode = mode; if (mode === 'absent') Decoder.isConfigSupported = undefined;
    if (mode === 'hang') fastTimers();
    const r = await collectVideoValidation(); resetTimers(); Decoder.isConfigSupported = method;
    for (const c of r.value.codecs) { assert.equal(c.actual.outcome,'decoded'); assert.equal(c.actual.repetitions.length,3); }
    assert.equal(r.value.codecs[0].comparison, mode === false ? 'claim_no_validation_yes' : mode === true ? 'claim_yes_validation_yes' : 'claim_unknown_validation_yes');
  });
}
for (const mode of ['wrong','error','hang']) await test('Decode '+mode+' stays inconclusive and closes decoders', async () => {
  behavior = mode; claimMode = true; fastTimers(); const before = closed;
  const r = await collectVideoValidation(); resetTimers();
  assert.equal(closed-before,18); r.value.codecs.forEach(c => { assert.equal(c.comparison,'validation_unknown'); assert.equal(c.actual.outcome,mode === 'hang' ? 'timed_out':'error'); });
});
await test('WebGL null contexts retain identical checklist and unknown outcomes', async () => {
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  const r=await collectWebGLValidation(); assert.equal(r.value.contexts.length,2);
  r.value.contexts.forEach(c => { assert.equal(c.checks.length,EXTENSIONS.length); assert.equal(c.context.status,'unknown'); });
});
await test('WebGL exercises unadvertised extension; errors never become unsupported', async () => {
  let setting, calls=[];
  const ext = { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 1, TEXTURE_MAX_ANISOTROPY_EXT: 2 };
  const gl = { NO_ERROR:0, TEXTURE_2D:3553, getSupportedExtensions:()=>[], isContextLost:()=>false, getError:()=>0,
    getExtension(id) { calls.push(id); if (id==='EXT_float_blend') throw Error('driver'); return id==='EXT_texture_filter_anisotropic' ? ext:null; },
    createTexture:()=>({}), deleteTexture(){}, bindTexture(){}, getParameter:()=>4,
    texParameterf(t,p,v){setting=v;}, getTexParameter:()=>setting };
  document.createElement=()=>({getContext:()=>gl});
  const r=await collectWebGLValidation();
  r.value.contexts.forEach(c=>{
    const a=c.checks.find(x=>x.id==='EXT_texture_filter_anisotropic'); assert.equal(a.reported.supported,false); assert.equal(a.behavioral.status,'exercised');
    assert.equal(c.checks.find(x=>x.id==='EXT_float_blend').activation.status,'error');
    assert.equal(c.checks.find(x=>x.id==='WEBGL_draw_buffers').activation.status,'unsupported');
  }); assert.ok(calls.length>=EXTENSIONS.length*2);
});
function navigatorWith(gpu) { Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu}}); }
await test('WebGPU API absent and null adapter preserve fixed rows', async()=>{
  for (const gpu of [undefined,{requestAdapter:async()=>null}]) { navigatorWith(gpu); const r=await collectWebGPUValidation(); assert.equal(r.value.checks.length,FEATURES.length); assert.equal(r.value.checks[0].activation.status,gpu?'unknown':'api_absent'); }
});
await test('WebGPU requests every fixed feature despite false claims; rejection remains error', async()=>{
  const calls=[]; navigatorWith({ requestAdapter:async()=>({features:new Set(),requestDevice:async opts=>{calls.push(opts.requiredFeatures[0]);throw Error('rejected');}})});
  const r=await collectWebGPUValidation(); assert.deepEqual(calls,FEATURES);
  r.value.checks.forEach(c=>{ assert.equal(c.reported.supported,false);assert.equal(c.activation.status,'error');assert.equal(c.behavioral.status,'not_attempted'); });
});
await test('WebGPU f16 pipeline dispatch/readback and device cleanup', async()=>{
  let destroyed=0,dispatches=0;
  navigatorWith({requestAdapter:async()=>({features:new Set(FEATURES),requestDevice:async({requiredFeatures})=>({
    features:new Set(requiredFeatures), lost:new Promise(()=>{}),destroy(){destroyed++;},pushErrorScope(){},popErrorScope:async()=>null,
    createShaderModule:()=>({}),createComputePipelineAsync:async()=>({getBindGroupLayout:()=>({})}),
    createBuffer:()=>({destroy(){},mapAsync:async()=>{},getMappedRange:()=>new Float32Array([3]).buffer,unmap(){}}),
    createBindGroup:()=>({}),createCommandEncoder:()=>({beginComputePass:()=>({setPipeline(){},setBindGroup(){},dispatchWorkgroups(){dispatches++;},end(){}}),copyBufferToBuffer(){},finish:()=>({})}),queue:{submit(){}}
  })})});
  const r=await collectWebGPUValidation(); assert.equal(destroyed,FEATURES.length);assert.equal(dispatches,1);
  assert.equal(r.value.checks.find(c=>c.id==='shader-f16').behavioral.status,'exercised');
});
await test('Adapter timeout retains timed_out and late device-style cleanup works', async()=>{
  fastTimers(); navigatorWith({requestAdapter:()=>new Promise(()=>{})}); const r=await collectWebGPUValidation();resetTimers();
  assert.equal(r.value.checks[0].activation.status,'timed_out');
  let cleaned=false; const r2=await bounded(()=>new Promise(resolve=>realTimer(()=>resolve({}),20)),1,()=>{cleaned=true;});
  assert.equal(r2.status,'timed_out'); await new Promise(resolve=>realTimer(resolve,30));assert.equal(cleaned,true);
});
await test('Every stream hash and H264 SPS bytes match its declared configuration', () => {
  for (const stream of STREAMS) {
    const data = Buffer.from(stream.dataBase64, 'base64');
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), stream.sha256);
    if (stream.config.codec.startsWith('avc1.')) {
      const offset = data.indexOf(Buffer.from([0,0,0,1,0x67]));
      assert.ok(offset >= 0);
      assert.equal(data.subarray(offset+5,offset+8).toString('hex').toUpperCase(), stream.config.codec.slice(5));
    }
  }
});
await test('Schedules exactly match all fixed graphics and video stages', async () => {
  const { CHECK_SCHEDULE, FAMILIES, EXPERIMENT } = await import('../next-runner.js');
  assert.equal(FAMILIES.length, 10); assert.equal(EXPERIMENT.frozen, true);
  assert.deepEqual(CHECK_SCHEDULE.videoValidation, STREAMS.flatMap(s => [s.id+'/claim', ...Array.from({length:SETTINGS.repetitions},(_,i)=>s.id+'/decode/'+i)]));
  assert.deepEqual(CHECK_SCHEDULE.webglValidation, ['webgl','webgl2'].flatMap(c=>EXTENSIONS.flatMap(id=>['reported','activation','behavioral'].map(stage=>c+'/'+id+'/'+stage))));
  assert.deepEqual(CHECK_SCHEDULE.webgpuValidation, FEATURES.flatMap(id=>['reported','activation','behavioral'].map(stage=>id+'/'+stage)));
});
await test('Common outcomes preserve missing APIs, errors, timeout, unknown and unattempted', async () => {
  const { collectionOutcome } = await import('../next/outcomes.js');
  for (const status of ['api_absent','timed_out','unknown','not_attempted','test_error']) assert.equal(collectionOutcome({status}),status);
  assert.equal(collectionOutcome({status:'error'}),'test_error');
  assert.equal(collectionOutcome({status:'unsupported'}),'results_returned');
});
await test('Requested device missing its feature does not run f16 behavior; cleanup failure stays local', async () => {
  navigatorWith({requestAdapter:async()=>({features:new Set(FEATURES), requestDevice:async()=>({features:new Set(), destroy(){throw Error('cleanup');}})})});
  const r = await collectWebGPUValidation();
  for (const row of r.value.checks) {
    assert.equal(row.requestable,true); assert.equal(row.granted,false);
    assert.equal(row.activation.status,'unknown'); assert.equal(row.behavioral.status,'not_attempted');
    assert.equal(row.cleanupError,'cleanup');
  }
});
await test('Every supplemental advertised WebGL extension receives an activation attempt', async () => {
  const calls=[];
  document.createElement=()=>({getContext:()=>({getSupportedExtensions:()=>['future-extension'], getExtension(id){calls.push(id);return null;}, isContextLost:()=>false})});
  const r=await collectWebGLValidation();
  assert.equal(calls.filter(id=>id==='future-extension').length,2);
  assert.equal(r.value.contexts[0].supplemental[0].reported.supported,true);
});
await test('Unadvertised TypeError is a negative observation with original exception details', async()=>{
  navigatorWith({requestAdapter:async()=>({features:new Set(),requestDevice:async()=>{throw new TypeError('Type error');}})});
  const r=await collectWebGPUValidation();
  const { collectionOutcome } = await import('../next/outcomes.js');
  for (const row of r.value.checks) {
    assert.equal(row.activation.status,'unsupported'); assert.equal(row.requestable,false); assert.equal(row.granted,false);
    assert.deepEqual(row.activation.exception,{name:'TypeError',message:'Type error'});
    assert.equal(row.behavioral.status,'not_attempted'); assert.equal(collectionOutcome(row.activation),'results_returned');
  }
});
await test('Fresh request adapter determines classification when advertisement changes', async()=>{
  for (const initialAdvertises of [true,false]) {
    let count=0;
    navigatorWith({requestAdapter:async()=>({features:new Set((count++===0 ? initialAdvertises : !initialAdvertises) ? FEATURES : []),requestDevice:async()=>{throw new TypeError('Type error');}})});
    const r=await collectWebGPUValidation();
    for(const row of r.value.checks) {
      assert.equal(row.reported.supported,initialAdvertises);
      assert.equal(row.activation.status,initialAdvertises?'unsupported':'error');
      assert.equal(row.requestable,initialAdvertises?false:null);
    }
  }
});
await test('Unreadable features and missing requestDevice never become negative capability claims', async()=>{
  for(const broken of ['features','method']) {
    let count=0;
    navigatorWith({requestAdapter:async()=>{
      const initial=count++===0;
      return { get features(){if(!initial && broken==='features') throw Error('unreadable');return new Set();},
        requestDevice:broken==='method'?undefined:async()=>{throw new TypeError('Type error');} };
    }});
    const r=await collectWebGPUValidation();
    r.value.checks.forEach(row=>{assert.equal(row.activation.status,'error');assert.equal(row.requestable,null);assert.equal(row.granted,null);});
  }
});
await test('Unadvertised device request timeout stays unknown, not a negative result', async()=>{
  navigatorWith({requestAdapter:async()=>({features:new Set(),requestDevice:()=>new Promise(()=>{})})});
  fastTimers(); const r=await collectWebGPUValidation(); resetTimers();
  r.value.checks.forEach(row=>{assert.equal(row.activation.status,'timed_out');assert.equal(row.requestable,null);assert.equal(row.granted,null);});
});
console.log(`${tests.length} checks passed; simulated APIs, not real GPU/browser evidence.`);
