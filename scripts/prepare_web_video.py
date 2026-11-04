"""Create the small inline video from the checked-in 1080p master.

Requires FFmpeg. GitHub Actions runs this before validation and deployment.
The original master, soundtrack, captions, and poster remain unchanged.
"""
from pathlib import Path
import argparse
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/media/webcatalyst-explainer.mp4'
TARGET = ROOT / 'assets/media/webcatalyst-explainer-720p.mp4'


def prepare(ffmpeg=None, force=False):
    if not force and TARGET.exists() and TARGET.stat().st_mtime >= max(
        SOURCE.stat().st_mtime, Path(__file__).stat().st_mtime
    ):
        return
    ffmpeg = ffmpeg or shutil.which('ffmpeg')
    bundled = ROOT / 'codex-workspace/video/.deps/imageio_ffmpeg/binaries'
    if not ffmpeg and bundled.exists():
        ffmpeg = next((str(p) for p in bundled.glob('ffmpeg-*') if p.is_file()), None)
    if not ffmpeg:
        raise SystemExit('Install FFmpeg, then run python3 scripts/prepare_web_video.py.')
    temporary = TARGET.with_suffix('.part.mp4')
    try:
        subprocess.run([
            ffmpeg, '-hide_banner', '-loglevel', 'warning', '-y', '-i', str(SOURCE),
            '-map', '0:v:0', '-map', '0:a:0', '-map_metadata', '-1', '-map_chapters', '-1',
            '-vf', 'scale=1280:720,fps=24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
            # Constrained Baseline avoids CABAC/B-frame/reference-frame issues in
            # Safari's hardware decoder. Bound the stream to H.264 level 3.1.
            '-profile:v', 'baseline', '-level:v', '3.1', '-pix_fmt', 'yuv420p',
            '-bf', '0', '-refs', '1', '-maxrate', '4000k', '-bufsize', '8000k',
            '-tag:v', 'avc1', '-g', '48', '-keyint_min', '24',
            '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-ac', '2',
            '-movflags', '+faststart', str(temporary),
        ], check=True)
        temporary.replace(TARGET)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'Prepared inline video: {TARGET.stat().st_size / 1024 / 1024:.1f} MiB')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', help='Path to the FFmpeg executable')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    prepare(args.ffmpeg, args.force)
