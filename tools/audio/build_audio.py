"""Render every sound effect and music track into public/assets/audio (mp3)."""
import os
import subprocess
import sys
import tempfile
import wave
from multiprocessing import Pool

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from synth import SR, normalize, fade  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'audio')


def write_mp3(name, data, bitrate):
    os.makedirs(OUT, exist_ok=True)
    data = np.clip(data, -1, 1)
    ch = 1 if data.ndim == 1 else 2
    pcm = (data * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        path = f.name
    with wave.open(path, 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    dst = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-codec:a', 'libmp3lame', '-b:a', bitrate, dst], check=True)
    os.unlink(path)
    print(f'{name}.mp3  {os.path.getsize(dst) // 1024} KB')


def do_track(name):
    from music import compose
    t = compose(name)
    write_mp3('music_' + name, t.render(), '96k')


def main():
    only = sys.argv[1:]
    if not only or 'sfx' in only:
        from sfx import build_all
        for name, data in build_all().items():
            write_mp3(name, fade(normalize(data, 0.85), 0.001, 0.02), '64k')
    if not only or 'amb' in only:
        from ambience import AMBIENCE, loopify
        for name, fn in AMBIENCE.items():
            x = loopify(fn())
            write_mp3('amb_' + name, normalize(x, 0.6), '48k')
    if not only or 'music' in only:
        from music import TRACKS
        names = [t for t in TRACKS if not only or t in only or 'music' in only]
        with Pool(min(len(names), os.cpu_count() or 2)) as p:
            p.map(do_track, names)


if __name__ == '__main__':
    main()
