"""Validate local navigation, public assets, model coverage and HTML provenance."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib,json

ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=set();self.references=[];self.duplicates=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if 'id' in data:
            if data['id'] in self.ids:self.duplicates.append(data['id'])
            self.ids.add(data['id'])
        for key in ['src','href','poster','data-zoom']:
            if data.get(key):self.references.append(data[key])

d=Document();d.feed((ROOT/'index.html').read_text())
assert not d.duplicates, d.duplicates
errors=[]
for ref in d.references:
    u=urlsplit(ref)
    if u.scheme or u.netloc:continue
    if u.path and not (ROOT/unquote(u.path)).is_file():errors.append(f'Missing asset: {ref}')
    if not u.path and u.fragment and u.fragment not in d.ids:errors.append(f'Missing anchor: {ref}')
catalog=json.loads((ROOT/'assets/data/demos.json').read_text())
assert len(catalog['prompts'])==50 and len(catalog['models'])==6
for prompt in catalog['prompts']:
    assert len(prompt['outputs'])==6,(prompt['id'],'missing model output')
    for kind in ['outputs','recordings','posters']:
        for path in prompt[kind].values():
            if not (ROOT/path).is_file():errors.append(f'Missing demo asset: {path}')
provenance=json.loads((ROOT/'assets/data/provenance.json').read_text())
for item in provenance:
    assert hashlib.sha256((ROOT/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
for p in (ROOT/'assets').rglob('*'):
    if p.is_file() and p.stat().st_size>=100*1024*1024:errors.append(f'File exceeds GitHub limit: {p}')
assert not errors,'\n'.join(errors)
print(f'Passed: {len(d.references)} page references; 50 prompts × 6 models; 300 source hashes; media paths and file sizes.')
