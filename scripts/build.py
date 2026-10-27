"""Build a GitHub Pages artifact from an explicit public-file allowlist."""
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'dist'
if DEST.is_symlink():
    raise SystemExit('Refusing to replace a symlinked dist directory.')
if DEST.exists():
    shutil.rmtree(DEST)
DEST.mkdir()
for filename in ['index.html','.nojekyll']:
    shutil.copy2(ROOT/filename,DEST/filename)
shutil.copytree(ROOT/'assets',DEST/'assets')
files=[p for p in DEST.rglob('*') if p.is_file()]
size=sum(p.stat().st_size for p in files)
print(f'Built dist/: {len(files)} public files, {size/1024/1024:.1f} MiB.')
print('No codex-workspace files, raw JSONL records, scripts, or Git metadata are included.')
