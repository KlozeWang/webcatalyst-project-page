"""Export public site assets from the supplied local manuscript and demo records.

Run only when refreshing source material. The published site needs no Python API.
Raw model responses, endpoints, request metadata and local working files stay out
of the public export. Generated HTML is copied verbatim, with SHA-256 provenance.
"""
from pathlib import Path
import hashlib, json, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'codex-workspace'
VIDEO = WORK / 'video'
V2 = VIDEO / 'v2'
sys.path.insert(0, str(VIDEO / '.deps'))
import pypdfium2 as pdfium
import imageio_ffmpeg
from PIL import Image

FF = imageio_ffmpeg.get_ffmpeg_exe()
ASSETS = ROOT / 'assets'
MODELS = [
    ('webcatalyst', 'WebCatalyst', 'qwen-35b-a3b-ours'),
    ('qwen', 'Qwen3.6-35B-A3B', 'qwen-35b-a3b-origin'),
    ('claude', 'Claude Opus 4.7', 'claude-opus-4-7'),
    ('codex', 'GPT-5.3-Codex', 'gpt-5.3-codex'),
    ('gpt-mini', 'GPT-5.4-mini', 'gpt-5.4-mini'),
    ('gemini', 'Gemini 3.1 Pro Preview', 'gemini-3.1-pro-preview'),
]
TITLES = [
    'Obby adventure', 'Math playground', 'Platform shooter', 'Battle royale',
    'Football league', '3D shooter', 'Neon tic-tac-toe', 'Digging game',
    'Shadow fighter', 'Tunis adventure', 'French learning', 'Echo Runner',
    'Ramp collector', 'ASCII art', 'Habit Tree', 'Eldoria quest',
    'Battle Royale 3D', 'Sky Runner', 'Collaborative storytelling', 'Base defense',
    'Ninja fighter', 'Open-world arena', 'Duel arena', 'Mario platformer',
    'Metro Exodus', 'Imposter party', 'MOJO storefront', 'Pathfinding chase',
    'Snake', 'Car racing', 'Darts', 'Photo puzzle', 'Dance scene',
    'Scientific calculator', 'Sprint Rush', 'Wild West adventure', 'FitFlux',
    'Remote controller', 'Save system', 'Deck builder', 'Temple Runner',
    'Lansana games', 'Super Mario', 'Cosmic Defender', 'Game shop interface',
    'Gesture blocks', 'Football card duel', 'Indian driving arena',
    'Security learning', 'Rabbit Race',
]
FEATURED = [17, 39, 14, 16, 24, 40]
CATEGORIES = {17: '3D flight', 39: 'Strategy', 14: 'Beyond games',
              16: '3D action', 24: 'Exploration', 40: '3D runner'}
prompts, provenance = {}, []
for slug, label, folder in MODELS:
    for row in map(json.loads, (WORK / 'demo' / folder / 'results.jsonl').read_text().splitlines()):
        gid = int(row['id'])
        item = prompts.setdefault(gid, dict(id=gid, title=TITLES[gid],
            category=CATEGORIES.get(gid, 'Interactive HTML'), prompt=row['prompt'],
            outputs={}, recordings={}, posters={}))
        assert item['prompt'] == row['prompt'], f'Prompt mismatch: {gid}'
        if row.get('html'):
            rel = f'assets/demos/{gid}/{slug}.html'
            path = ROOT / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(row['html'])
            item['outputs'][slug] = rel
            provenance.append(dict(prompt_id=gid, model=label, file=rel,
                                   sha256=hashlib.sha256(path.read_bytes()).hexdigest()))

def clip(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return
    subprocess.run([FF, '-y', '-v', 'error', '-i', str(source), '-an',
        '-vf', 'scale=min(960\\,iw):-2,fps=24', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)], check=True)

for gid in FEATURED:
    for slug, label, folder in (MODELS if gid == 17 else MODELS[:2]):
        if gid == 17:
            src = V2 / 'hero' / f'{folder}.mp4'
        elif gid in [14, 39]:
            src = VIDEO / 'clips' / f'{"dom-40" if slug == "webcatalyst" else "ref-0"}-{gid}.mp4'
        else:
            src = V2 / 'mosaic' / f'{"ours" if slug == "webcatalyst" else "base"}-{gid}.mp4'
        rel = f'assets/media/{gid}-{slug}.mp4'
        clip(src, ROOT / rel)
        prompts[gid]['recordings'][slug] = rel
        poster = f'assets/images/{gid}-{slug}.webp'
        subprocess.run([FF, '-y', '-v', 'error', '-ss', '6', '-i', str(ROOT / rel),
            '-frames:v', '1', '-vf', 'scale=800:-2', '-quality', '85', str(ROOT / poster)], check=True)
        prompts[gid]['posters'][slug] = poster

catalog = dict(models=[dict(id=s, label=l) for s,l,_ in MODELS],
               featured=FEATURED, prompts=[prompts[k] for k in sorted(prompts)])
(ASSETS / 'data/demos.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2))
(ASSETS / 'data/provenance.json').write_text(json.dumps(provenance, indent=2))
shutil.copy2(WORK / 'paper.pdf', ASSETS / 'WebCatalyst.pdf')
shutil.copy2(V2 / 'WebCatalyst_Explainer_EN_1080p_v7.mp4', ASSETS / 'media/webcatalyst-explainer.mp4')
# Use the examples wall after its narration captions have cleared.
subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-ss', '288',
    '-i', str(ASSETS / 'media/webcatalyst-explainer.mp4'), '-frames:v', '1',
    '-vf', 'scale=1920:-2', '-q:v', '2', str(ASSETS / 'images/video-poster.jpg')], check=True)
# The film already has burned-in captions; keep a downloadable subtitle file.
shutil.copy2(V2 / 'WebCatalyst.en.srt', ASSETS / 'media/webcatalyst.en.srt')
shutil.copy2(V2 / 'source/ablation-data-calibrated.json', ASSETS / 'data/training-dynamics.json')
shutil.copy2(V2 / 'assets/tsinghua-official.png', ASSETS / 'images/tsinghua.png')
shutil.copy2(V2 / 'assets/microsoft-official.svg', ASSETS / 'images/microsoft.svg')
shutil.copy2(V2 / 'source/logo-sources.json', ASSETS / 'data/logo-sources.json')
# Figure 2 is cropped from the supplied manuscript at publication resolution.
doc = pdfium.PdfDocument(WORK / 'paper.pdf')
page = doc[3].render(scale=3).to_pil()
w, h = page.size
page.crop((round(w*.135), round(h*.085), round(w*.865), round(h*.445))).save(ASSETS / 'images/framework.png')
print(f'Exported {len(prompts)} prompts, {len(provenance)} unmodified HTML outputs and all media.')
