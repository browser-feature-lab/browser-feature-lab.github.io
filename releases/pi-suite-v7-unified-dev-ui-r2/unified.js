import {runAll,FAMILIES} from './baseline/next-runner.js';
import {collectPlayback} from './playback.js';
export const SCHEMA='pi-suite-v7-unified-dev/result@1';
const $=id=>document.getElementById(id);
export async function verifyIntegrity() {
 if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable. Use HTTPS or localhost.');
 async function bytes(path) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {const r=await fetch(new URL(path,import.meta.url),{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(path+': HTTP '+r.status);return await r.arrayBuffer()}
  finally {clearTimeout(timer)}
 }
 const raw=await bytes('./integrity.json'), manifest=JSON.parse(new TextDecoder().decode(raw));
 const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 const files=Object.entries(manifest.files);
 for(let i=0;i<files.length;i+=8)await Promise.all(files.slice(i,i+8).map(async([path,expected])=>{if(await sha(await bytes('./'+path))!==expected)throw Error('Integrity mismatch: '+path)}));
 return {status:'verified',algorithm:'SHA-256',manifestSha256:await sha(raw),verifiedFileCount:files.length,note:'Consistency with packaged manifest, not an authenticated signature. Files may change after verification.'};
}
export function toCSV(result) {
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['group','scope','sample','collection_outcome','claim','behavior','integrity','sample_sha256']];
 for(const [id,c] of Object.entries(result.baseline?.collection||{}))rows.push([id,'v6','',c.outcome,'','','','']);
 for(const r of [...(result.playback?.results||[]),...(result.playback?.exploratoryResults||[])])rows.push(['htmlVideoPlayback',r.scope,r.family,'results_returned',r.claims?.[0]?.answer,r.behavior?.status,r.integrity?.status,r.sampleSha256]);
 return rows.map(row=>row.map(q).join(',')).join('\r\n');
}
let busy=false,last=null,reload=false;
function save(name,value,type) {
 const url=URL.createObjectURL(new Blob([value],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';
 // Connected anchors work in older Firefox; retain the URL while download starts.
 try {document.body.appendChild(a);a.click()}
 finally {if(a.parentNode)a.parentNode.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),60000)}
}
function exportResult(kind) {
 if(!last)return;
 try {
  if(kind==='json')save(filename()+'.json',JSON.stringify(last,null,2),'application/json');
  else if(kind==='csv')save(filename()+'.csv',toCSV(last),'text/csv');
  else if(last.baseline)save(filename()+'__v6.json',JSON.stringify(last.baseline,null,2),'application/json');
 } catch(e) {$('status').textContent='Export failed: '+String(e?.message||e)+'. Results remain available; retry the download.'}
}
export async function runUnified(label,onProgress=()=>{}) {
 const result={schema:SCHEMA,experiment:{id:'pi-suite-v7-unified-dev',frozen:false},label,startedAt:new Date().toISOString(),completedAt:null,status:'running',integrity:null,provenance:null,baseline:null,playback:null,errors:[],requiresReload:false};
 try {
  onProgress('Verifying packaged files…');result.integrity=await verifyIntegrity();
  result.provenance=await (await fetch(new URL('./provenance.json',import.meta.url),{cache:'no-store'})).json();
  result.baseline=await runAll({label,onProgress:p=>onProgress(`${p.index}/11 · ${p.family.label}: ${p.status}`)});
  result.requiresReload=!!result.baseline.requiresReload;
  onProgress('11/11 · HTMLVideoElement playback');
  result.playback=await collectPlayback({onProgress:p=>onProgress(`11/11 · Playback ${p.index}/14: ${p.family}`)});
  result.status='completed';
 } catch(e) {result.status='incomplete';result.errors.push(String(e?.message||e));result.requiresReload=true}
 result.completedAt=new Date().toISOString();return result;
}
function show(result) {
 const tbody=$('results');while(tbody.firstChild)tbody.removeChild(tbody.firstChild);
 const add=(a,b,c)=>{const tr=document.createElement('tr');for(const value of [a,b,c]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}tbody.appendChild(tr)};
 for(const [id,c] of Object.entries(result.baseline?.collection||{}))add(id,c.outcome,c.reason);
 for(const r of [...(result.playback?.results||[]),...(result.playback?.exploratoryResults||[])])add(r.family+' · '+r.scope,r.behavior?.status||'unknown',r.integrity?.status||'unverified');
}
$('run').onclick=async()=>{
 if(busy||reload)return;busy=true;last=null;$('run').disabled=true;$('json').disabled=true;$('csv').disabled=true;$('baselinejson').disabled=true;
 try {
 last=await runUnified($('label').value||'unlabelled',message=>{$('status').textContent=message});
 reload=last.requiresReload;
 // Preserve downloads even if table rendering fails. UI errors are not observations.
 $('json').disabled=false;$('csv').disabled=false;$('baselinejson').disabled=!last.baseline;
 let displayError=null;
 try {show(last)} catch(e) {displayError=String(e?.message||e)}
 $('status').textContent=last.status==='completed'?'Finished: 10 original groups + 14 playback samples. Returned reports do not establish support for every feature.':'Incomplete: '+last.errors.join('; ');
 if(reload)$('status').textContent+=' Reload before another run.';
 if(displayError)$('status').textContent+=' Results table could not be displayed: '+displayError+'. Downloads remain available.';
 } catch(e) {reload=true;$('status').textContent='Runner error: '+String(e?.message||e)+'. Reload before another run.'}
 finally {busy=false;$('run').disabled=reload}
};
const filename=()=>('pi-suite-v7-unified-dev__'+last.label.replace(/[^a-z0-9_-]/gi,'-').slice(0,70)+'__'+last.startedAt.replace(/[:.]/g,'-'));
$('json').onclick=()=>exportResult('json');
$('csv').onclick=()=>exportResult('csv');
$('baselinejson').onclick=()=>exportResult('baseline');
$('groups').textContent=FAMILIES.map(f=>f.label).join(' · ')+' · HTMLVideoElement playback (10 baseline + 4 exploratory)';
$('run').disabled=false;
$('status').textContent='Ready. Keep this tab visible. Some groups may take several minutes.';
