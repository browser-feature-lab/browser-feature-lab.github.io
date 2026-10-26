// Adapted from the pinned published v7 HTML; see provenance.json.
const $ = id => document.getElementById(id);
const tnow = () => performance.now();
const errObj = e => ({name:e?.name||'Error',message:String(e?.message||e)});
async function bounded(promise, ms) {
 let timer; try { return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Collection timed out; support unknown'),{name:'TimeoutError'})),ms)})]); }
 finally {clearTimeout(timer)}
}
async function fetchAsset(path) {
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
 try { const response=await fetch(new URL('./playback/'+path,import.meta.url),{cache:'no-store',signal:controller.signal});
 const bytes=await response.arrayBuffer(); return {ok:response.ok,status:response.status,arrayBuffer:async()=>bytes}; }
 finally {clearTimeout(timer)}
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function shaHex(buf){if(!crypto?.subtle)return Promise.resolve(null);return crypto.subtle.digest('SHA-256',buf).then(bytes=>Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join(''))}
function familyTitle(f){return ({h264:'H.264',hevc:'HEVC / H.265',vp8:'VP8',vp9:'VP9',av1:'AV1',h263:'H.263',mpeg4part2:'MPEG-4 Part 2',mpeg1:'MPEG-1',mpeg2:'MPEG-2',theora:'Theora'})[f]||f}
function persona(){return {userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,webdriver:navigator.webdriver??null,origin:location.origin,secureContext:window.isSecureContext,screen:{width:screen.width,height:screen.height}}}
function claimOne(type){const el=document.createElement('video');try{return {type,answer:el.canPlayType(type)||'',status:'ok'}}catch(e){return {type,status:'error',error:errObj(e)}}}
async function mediaCapability(type,sample){
 if(!navigator.mediaCapabilities?.decodingInfo)return {status:'api_absent'};
 // File playback only. A MIME-only codec-ambiguous result does not distinguish MPEG1/MPEG2.
 const config={type:'file',video:{contentType:type,width:sample.expectedWidth,height:sample.expectedHeight,bitrate:350000,framerate:sample.generation.fps}};
 try{let answer=await Promise.race([navigator.mediaCapabilities.decodingInfo(config),wait(7000).then(()=>({timeout:true}))]);
   if(answer.timeout)return {status:'timed_out'};
   return {status:'answered',supported:answer.supported,smooth:answer.smooth,powerEfficient:answer.powerEfficient};
 }catch(e){return {status:'error',exception:errObj(e)}}
}
async function verifyFile(sample){
 try{
  const res=await fetchAsset(sample.file);
  if(!res.ok)return {status:'fetch_error',httpStatus:res.status};
  const buf=await res.arrayBuffer();
  const actual=await shaHex(buf);
  if(actual===null)return {status:'unverified_crypto_unavailable',bytes:buf.byteLength};
  return {status:actual===sample.fileSha256?'verified':'hash_mismatch',sha256:actual,bytes:buf.byteLength};
 }catch(e){return {status:'fetch_error',exception:errObj(e)}}
}
function readPixels(video){
 try{
  const cn=document.createElement('canvas');cn.width=16;cn.height=16;
  const ctx=cn.getContext('2d',{willReadFrequently:true});if(!ctx)return {status:'canvas_unavailable'};
  ctx.drawImage(video,0,0,16,16);
  const rgba=ctx.getImageData(0,0,16,16).data;
  let hash=2166136261>>>0, min=255,max=0;
  for(let i=0;i<rgba.length;i++){hash=Math.imul(hash^rgba[i],16777619)>>>0;min=Math.min(min,rgba[i]);max=Math.max(max,rgba[i]);}
  return {status:'frame_pixels_read',sampledPixelHash:'fnv1a32-'+hash.toString(16).padStart(8,'0'),min,max,
    note:'Observational 16x16 checksum; NO reference pixel correctness checked.'};
 }catch(e){return {status:'canvas_error',exception:errObj(e)}}
}
async function playRealFile(sample){
 const video=$('player');video.pause();video.removeAttribute('src');video.load();
 video.muted=true;video.playsInline=true;video.preload='auto';
 const started=tnow();let framesPresented=0;let rvfcId=null;let mediaError=null;
 const onFrame=(now,meta)=>{framesPresented=Math.max(framesPresented,meta.presentedFrames||0);if(video.requestVideoFrameCallback)rvfcId=video.requestVideoFrameCallback(onFrame)};
 if(video.requestVideoFrameCallback)rvfcId=video.requestVideoFrameCallback(onFrame);
 let settled=false;
 const initial=await new Promise(resolve=>{
  let timeout;
  function finish(status){if(settled)return;settled=true;clearTimeout(timeout);video.removeEventListener('loadeddata',ready);video.removeEventListener('error',error);resolve(status)}
  function ready(){finish('loadeddata')}
  function error(){mediaError=video.error?{code:video.error.code,message:video.error.message}:null;finish('media_error')}
  video.addEventListener('loadeddata',ready);video.addEventListener('error',error);
  timeout=setTimeout(()=>finish('load_timeout'),8000);
  video.src=new URL('./playback/'+sample.file,import.meta.url).href;video.load();
 });
 let pixels={status:'not_tested'},playStatus='not_attempted',progressed=false,playError=null;
 const foundWidth=video.videoWidth,foundHeight=video.videoHeight;
 if(initial==='loadeddata'){
    pixels=readPixels(video);
    const pos0=video.currentTime;
    try{
      // Begin playback, then check media time advanced. Avoid Promise hang.
      const tryPlay=video.play();if(tryPlay?.catch)tryPlay.catch(e=>{playError=errObj(e)});
      const until=tnow()+3300;
      while(tnow()<until){await wait(95);if(video.currentTime>pos0+0.15||video.ended){progressed=true;break}if(playError)break}
      playStatus=progressed?'time_progressed':playError?'play_rejected':'no_progress';
    }catch(e){playStatus='play_rejected';playError=errObj(e)}
 }
 if(video.cancelVideoFrameCallback&&rvfcId!==null){try{video.cancelVideoFrameCallback(rvfcId)}catch(e){}}
 video.pause();video.removeAttribute('src');video.load();
 let status=initial;
 if(initial==='loadeddata')status=(pixels.status==='frame_pixels_read' && progressed)?'playback_and_frame_observed':
     pixels.status==='frame_pixels_read'?'frame_observed_no_progress':'loadeddata_without_frame_readback';
 return {status,load:initial,width:foundWidth,height:foundHeight,
   dimensionsMatch:foundWidth===sample.expectedWidth&&foundHeight===sample.expectedHeight,
   pixels,playStatus,progressed,presentedFramesReported:framesPresented,
   requestVideoFrameCallbackAvailable:typeof video.requestVideoFrameCallback==='function',
   playError,mediaError,elapsedMs:Math.round(tnow()-started)};
}
async function controls(){
 const tests={unknownMediaType:claimOne('video/x-made-up-media-type'),badCodec:claimOne('video/mp4; codecs="no_such_codec_x123"')};
 if(navigator.mediaCapabilities?.decodingInfo){
  try{const v=await bounded(navigator.mediaCapabilities.decodingInfo({type:'file',video:{contentType:'video/webm; codecs="vp8"',width:0,height:180,bitrate:350000,framerate:12}}),7000);
      tests.zeroWidth={status:'answered',value:v};
  }catch(e){tests.zeroWidth={status:e.name==='TimeoutError'?'timed_out':'rejected',exception:errObj(e)}}
 }else tests.zeroWidth={status:'api_absent'};
 return tests;
}

export async function collectPlayback({onProgress=()=>{}}={}) {
 const [core,extra,queue]=await Promise.all(['media_manifest.json','exploratory_media_manifest.json','exploratory_families.json'].map(async path=>{
  const r=await fetchAsset(path);if(!r.ok)throw Error(path+': HTTP '+r.status);return JSON.parse(new TextDecoder().decode(await r.arrayBuffer()));
 }));
 if(core.samples.length!==10||extra.samples.length!==4||new Set([...core.samples,...extra.samples].map(s=>s.family)).size!==14)throw Error('Invalid 10 + 4 schedule');
 const report={schema:'pi-suite-v7-unified-dev/playback@1',semantics:'HTMLVideoElement playback and observational canvas readback; not WebCodecs or reference-pixel correctness. No family-wide compatibility conclusion.',controlChecks:await controls(),results:[],exploratoryResults:[],exploratoryFamilies:queue};
 for(const [index,s] of [...core.samples,...extra.samples].entries()) {
  const scope=index<10?'baseline':'exploratory_only';
  onProgress({index:index+1,total:14,family:s.family});
  let r={family:s.family,mime:s.mime,file:s.file,sampleSha256:s.fileSha256,scope,note:s.note};
  try {
   r.claims=[claimOne(s.mime)];
   if(s.family==='mpeg4part2')r.claims.push(claimOne('video/mp4'));
   if(s.family==='h263')r.claims.push(claimOne('video/3gpp; codecs="s263"'));
   r.mediaCapabilities=await mediaCapability(s.mime,s);
   r.integrity=await verifyFile(s);
   r.behavior=r.integrity.status==='verified'?await playRealFile(s):{status:'not_attempted_integrity_failed'};
  } catch(e) {r.behavior={status:'test_error',exception:errObj(e)}}
  (index<10?report.results:report.exploratoryResults).push(r);
 }
 return report;
}
