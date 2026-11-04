"""Build a GitHub Pages artifact from an explicit public-file allowlist."""
from pathlib import Path
import shutil
import hashlib

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
# A deployment may re-encode the film with a different FFmpeg version. Never
# reuse a media URL for different bytes: Safari caches MP4 byte ranges/indexes.
# Fingerprint the actual build outputs, including all player links/options.
html=(DEST/'index.html').read_text()
for filename in ['webcatalyst-explainer-720p.mp4','webcatalyst-explainer.mp4']:
    media=DEST/'assets/media'/filename
    digest=hashlib.sha256(media.read_bytes()).hexdigest()[:16]
    versioned=media.with_name(f'{media.stem}.{digest}{media.suffix}')
    shutil.copy2(media,versioned)
    html=html.replace(f'assets/media/{filename}',f'assets/media/{versioned.name}')
(DEST/'index.html').write_text(html)
files=[p for p in DEST.rglob('*') if p.is_file()]
size=sum(p.stat().st_size for p in files)
print(f'Built dist/: {len(files)} public files, {size/1024/1024:.1f} MiB.')
print('No codex-workspace files, raw JSONL records, scripts, or Git metadata are included.')
