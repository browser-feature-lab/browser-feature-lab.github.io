"""Run with Python 3; no third-party dependencies."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
manifest=read(root/'integrity.json')
for name,expected in manifest['files'].items():
 assert sha(root/name)==expected, 'Package mismatch: '+name
provenance=read(root/'provenance.json')
for folder,source in provenance['sources'].items():
 for name,expected in source['files'].items():assert sha(root/folder/name)==expected, 'Source mismatch: '+folder+'/'+name
for name,expected in read(root/'baseline/freeze-lock.json')['files'].items():assert sha(root/'baseline'/name)==expected,name
build=read(root/'playback/buildinfo.json')
for name,key in [('index.html','runnerSha256'),('media_manifest.json','manifestSha256'),('exploratory_media_manifest.json','extraManifestSha256'),('exploratory_families.json','exploreSha256')]:assert sha(root/'playback'/name)==build[key],name
families=[]
for name,count in [('media_manifest.json',10),('exploratory_media_manifest.json',4)]:
 samples=read(root/'playback'/name)['samples'];assert len(samples)==count
 for sample in samples:
  p=root/'playback'/sample['file'];assert sha(p)==sample['fileSha256'],str(p)
  assert p.stat().st_size==sample['bytes'],str(p)
  families.append(sample['family'])
assert len(set(families))==14
assert sha(root/'data/feature-manifest.json')==sha(root/'baseline/data/feature-manifest.json')
print('PASS:',len(manifest['files']),'packaged hashes; both source copies; upstream metadata; 14 media hashes/sizes; BCD alias')
