// Independent software decode of the exact embedded payloads; no re-encoding.
// Usage: node tools/next/verify-native-video.mjs /absolute/path/to/ffmpeg [output-directory]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { STREAMS } from '../next/video-validation.js';
const ffmpeg = process.argv[2];
if (!ffmpeg) throw Error('Supply an FFmpeg executable path');
const out = path.resolve(process.argv[3] || 'work/native-video-verification');
fs.mkdirSync(out, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function run(args) {
  const r = spawnSync(ffmpeg,args,{encoding:null,timeout:60000,maxBuffer:10*1024*1024});
  if(r.error || r.status!==0) throw Error(String(r.error || r.stderr));
  return r;
}
function ivf(data, fourcc, count) {
  const h=Buffer.alloc(32);h.write('DKIF');h.writeUInt16LE(32,6);h.write(fourcc,8);
  h.writeUInt16LE(64,12);h.writeUInt16LE(64,14);h.writeUInt32LE(4,16);h.writeUInt32LE(1,20);h.writeUInt32LE(count,24);
  const parts=[h];
  for(let i=0;i<count;i++){const f=Buffer.alloc(12);f.writeUInt32LE(data.length);f.writeBigUInt64LE(BigInt(i),4);parts.push(f,data);}
  return Buffer.concat(parts);
}
const report={ verifier:'FFmpeg software decoding (independent of browser WebCodecs)',
  version:run(['-version']).stdout.toString().split('\n')[0],
  executableSha256:sha(fs.readFileSync(ffmpeg)), samples:[] };
const expectedProfiles=['High','Profile 0','Main','Constrained Baseline','Main',null];
for (const [index,s] of STREAMS.entries()) {
  const data=Buffer.from(s.dataBase64,'base64'); assert.equal(sha(data),s.sha256);
  const h264=s.config.codec.startsWith('avc1');
  const fourcc=s.config.codec.startsWith('vp09')?'VP90':s.config.codec.startsWith('av01')?'AV01':'VP80';
  const runs=[];
  for(const count of [1,4]) {
    const input=path.join(out,`${s.id}-${count}.${h264?'h264':'ivf'}`);
    fs.writeFileSync(input,h264?Buffer.concat(Array(count).fill(data)):ivf(data,fourcc,count));
    const args=['-hide_banner','-nostdin','-v','info','-xerror','-err_detect','explode','-hwaccel','none',
      '-f',h264?'h264':'ivf','-i',input,'-map','0:v:0','-vf','showinfo','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','pipe:1'];
    const r=run(args), log=r.stderr.toString();
    fs.writeFileSync(path.join(out,`${s.id}-${count}.log`),log);
    const frames=log.split('\n').filter(l=>/Parsed_showinfo.* n:\s*\d+/.test(l));
    assert.equal(frames.length,count,s.id+' frame count');
    assert.ok(frames.every(l=>/fmt:yuv420p/.test(l)&&/s:64x64/.test(l)),s.id+' native pixel format/size');
    assert.equal(r.stdout.length,count*64*64*3/2,s.id+' output bytes');
    if(expectedProfiles[index]) assert.ok(log.includes('('+expectedProfiles[index]+')'),s.id+' profile');
    const hashes=Array.from({length:count},(_,i)=>sha(r.stdout.subarray(i*6144,(i+1)*6144)));
    assert.equal(new Set(hashes).size,1,s.id+' repeated keyframe pixels');
    runs.push({inputFrames:count,outputFrames:frames.length,decodedBytes:r.stdout.length,pixelFormat:'yuv420p',width:64,height:64,frameSha256:hashes,args,stream:log.split('\n').find(l=>/Stream #0:0.*Video:/.test(l))});
  }
  assert.equal(runs[0].frameSha256[0],runs[1].frameSha256[0]);
  report.samples.push({id:s.id,codec:s.config.codec,payloadSha256:sha(data),status:'passed',runs});
  console.log('PASS',s.id,'single frame and four repeated frames; 64x64 yuv420p');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log('All six embedded samples passed native decoding:',path.join(out,'report.json'));
