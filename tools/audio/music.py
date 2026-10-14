"""Procedural medieval-fantasy music: rule-based composition + simple instrument synthesis."""
import numpy as np
from synth import SR, midi_hz, pluck_fast, sine, noise, env_adsr, env_exp, lowpass, highpass, bandpass, t_axis, fm, formant, stereo_reverb, place, distort
import numpy.random as npr

MODES = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'harmonic': [0, 2, 3, 5, 7, 8, 11],
}


def saw_fast(f, dur):
    t = t_axis(dur)
    ph = np.cumsum(np.full(len(t), f) if np.isscalar(f) else f) / SR
    return 2 * (ph % 1.0) - 1


# ------------------------------------------------------------------ instruments (mono)
def lute(m, dur, vel=1.0):
    d = dur + 0.8
    x = pluck_fast(midi_hz(m), d, 0.9965, 0.55)
    x = lowpass(x, 3800) * env_adsr(d, 0.002, 0.05, 0.9, 0.4)
    return x * vel


def harp(m, dur, vel=1.0):
    d = dur + 1.5
    x = pluck_fast(midi_hz(m), d, 0.998, 0.4)
    return lowpass(x, 5000) * env_adsr(d, 0.002, 0.1, 0.9, 0.8) * vel


def flute(m, dur, vel=1.0):
    d = dur + 0.15
    t = t_axis(d)
    f0 = midi_hz(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) * 3, 0, 1)
    f = f0 * vib
    tone = sine(f, d) + 0.22 * sine(f * 2, d) + 0.06 * sine(f * 3, d)
    breath = bandpass(noise(d), f0 * 0.8, f0 * 2.5) * 0.08
    return (tone + breath) * env_adsr(d, 0.05, 0.1, 0.8, 0.12) * vel * 0.8


def strings(m, dur, vel=1.0):
    d = dur + 0.6
    f = midi_hz(m)
    t = t_axis(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * t)
    x = sum(saw_fast(f * vib * dt, d) for dt in (0.997, 1.0, 1.004)) / 3
    x = lowpass(x, min(2600, f * 6))
    return x * env_adsr(d, 0.25, 0.2, 0.85, 0.5) * vel * 0.6


def brass(m, dur, vel=1.0):
    d = dur + 0.25
    f = midi_hz(m)
    x = saw_fast(f, d) * 0.7 + saw_fast(f * 1.003, d) * 0.3
    e = env_adsr(d, 0.06, 0.15, 0.75, 0.2)
    bright = lowpass(x, min(3500, f * 8)) * e
    soft = lowpass(x, f * 2.5) * e
    return (soft * 0.6 + bright * 0.4 * e) * vel * 0.7


def cello(m, dur, vel=1.0):
    d = dur + 0.3
    f = midi_hz(m)
    x = saw_fast(f, d) * 0.6 + saw_fast(f * 1.002, d) * 0.4
    return lowpass(x, min(900, f * 5)) * env_adsr(d, 0.04, 0.15, 0.8, 0.25) * vel * 0.9


def choir(m, dur, vel=1.0):
    d = dur + 0.8
    f = midi_hz(m)
    t = t_axis(d)
    x = sum(saw_fast(f * dt * (1 + 0.005 * np.sin(2 * np.pi * (4.5 + k) * t)), d) for k, dt in enumerate((0.996, 1.0, 1.005)))
    x = formant(x, ((730, 1.0), (1090, 0.5), (2440, 0.2)), 0.12)
    return x * env_adsr(d, 0.4, 0.3, 0.85, 0.7) * vel * 1.3


def bell(m, dur, vel=1.0):
    d = dur + 1.2
    return fm(midi_hz(m), 3.5, 1.5, d, env_exp(d, 0.4)) * env_exp(d, 0.8) * vel * 0.5


# ------------------------------------------------------------------ percussion
def drum_big(vel=1.0):
    d = 0.7
    f = 58 * np.exp(-t_axis(d) * 5) + 42
    return (sine(f, d) * env_exp(d, 0.28) + lowpass(noise(d), 300) * env_exp(d, 0.06) * 0.5) * vel


def drum_tom(vel=1.0, pitch=120):
    d = 0.35
    f = pitch * np.exp(-t_axis(d) * 6) + pitch * 0.6
    return (sine(f, d) * env_exp(d, 0.12) + bandpass(noise(d), 200, 1500) * env_exp(d, 0.04) * 0.4) * vel


def tabor(vel=1.0):
    d = 0.2
    return (bandpass(noise(d), 900, 5000) * env_exp(d, 0.05) * 0.8 + sine(190, d) * env_exp(d, 0.04) * 0.5) * vel


def shaker(vel=1.0):
    d = 0.09
    return highpass(noise(d), 5000) * env_exp(d, 0.025) * vel * 0.5


def tambourine(vel=1.0):
    d = 0.25
    jingles = sum(sine(f, d) * env_exp(d, 0.06) for f in (6200, 7400, 8900)) * 0.15
    return (highpass(noise(d), 6000) * env_exp(d, 0.05) * 0.6 + jingles) * vel


def timpani(m, vel=1.0):
    d = 1.4
    f = midi_hz(m) * (1 + 0.04 * np.exp(-t_axis(d) * 8))
    return (sine(f, d) * env_exp(d, 0.5) + sine(f * 1.5, d) * env_exp(d, 0.2) * 0.3 + lowpass(noise(d), 500) * env_exp(d, 0.03) * 0.5) * vel


# ------------------------------------------------------------------ composition
class Track:
    def __init__(self, name, bpm, root, mode, prog, bars, seed, style):
        self.name, self.bpm, self.root, self.mode, self.prog, self.bars, self.style = name, bpm, root, mode, prog, bars, style
        self.r = npr.default_rng(seed)
        self.beat = 60.0 / bpm
        self.scale = MODES[mode]
        self.len_s = bars * 4 * self.beat
        self.out = np.zeros((int((self.len_s + 4) * SR), 2))

    def deg(self, d, octave=0):
        """Scale degree (0-based, may exceed 6) -> midi note."""
        o, k = divmod(d, 7)
        return self.root + 12 * (o + octave) + self.scale[k]

    def chord(self, bar):
        d = self.prog[bar % len(self.prog)]
        return [d, d + 2, d + 4]

    def add(self, inst, note, beat_pos, beats, vel=1.0, pan=0.0, gain=1.0):
        x = inst(note, beats * self.beat, vel)
        place(self.out, x, beat_pos * self.beat, gain, pan)

    def hit(self, sound, beat_pos, gain=1.0, pan=0.0):
        place(self.out, sound, beat_pos * self.beat, gain, pan)

    # ---- layers
    def pad(self, inst, bars, octave=0, gain=0.35, pan_spread=0.5):
        for b in bars:
            ch = self.chord(b)
            for i, d in enumerate(ch):
                self.add(inst, self.deg(d, octave), b * 4, 4, 0.8, (i - 1) * pan_spread, gain)

    def bass(self, inst, bars, pattern=(0, 2), octave=-2, gain=0.6):
        for b in bars:
            root = self.chord(b)[0]
            for p in pattern:
                self.add(inst, self.deg(root, octave), b * 4 + p, 1.8 if len(pattern) <= 2 else 0.9, 0.9, 0, gain)

    def arp(self, inst, bars, pattern, octave=0, gain=0.4, pan=-0.3, step=0.5):
        for b in bars:
            ch = self.chord(b) + [self.chord(b)[0] + 7]
            for i, idx in enumerate(pattern):
                if idx is None:
                    continue
                self.add(inst, self.deg(ch[idx % len(ch)], octave), b * 4 + i * step, step * 1.5, 0.7 + 0.3 * (i % 2 == 0), pan, gain)

    def melody(self, inst, bars, octave=1, gain=0.5, pan=0.15, density=0.6, motif_len=2):
        """Motif-based melody: generate motifs of `motif_len` bars and repeat with variation."""
        rhythms = [
            [(0, 1), (1, 1), (2, 1.5), (3.5, 0.5)],
            [(0, 1.5), (1.5, 0.5), (2, 2)],
            [(0, 0.5), (0.5, 0.5), (1, 1), (2, 1), (3, 1)],
            [(0, 2), (2, 1), (3, 1)],
            [(0, 1), (1, 0.5), (1.5, 0.5), (2, 2)],
            [(0, 0.75), (0.75, 0.25), (1, 1), (2, 0.5), (2.5, 0.5), (3, 1)],
        ]
        motifs = {}
        bars = list(bars)
        for bi, b in enumerate(bars):
            key = (bi // motif_len) % 2
            pos_in = bi % motif_len
            ch = self.chord(b)
            if (key, pos_in) not in motifs:
                rh = rhythms[self.r.integers(len(rhythms))] if self.r.random() < density + 0.3 else rhythms[3]
                steps = []
                cur = ch[self.r.integers(3)]
                for (s, l) in rh:
                    if s in (0, 2):
                        # strong beat: nearest chord tone
                        opts = [c + 7 * k for c in ch for k in (-1, 0, 1)]
                        cur = min(opts, key=lambda c: abs(c - cur) + self.r.random() * 2)
                    else:
                        cur += int(self.r.choice([-1, 1, -2, 2, 0], p=[0.35, 0.35, 0.1, 0.1, 0.1]))
                    steps.append((s, l, cur - ch[0]))
                motifs[(key, pos_in)] = steps
            # variation on repeats
            vary = bi >= motif_len * 2 and self.r.random() < 0.35
            for (s, l, rel) in motifs[(key, pos_in)]:
                d = ch[0] + rel + (int(self.r.choice([-1, 1])) if vary and self.r.random() < 0.3 else 0)
                d = max(-3, min(11, d))
                self.add(inst, self.deg(d, octave), b * 4 + s, l, 0.8 + 0.2 * (s == 0), pan, gain)

    def drums(self, bars, kind='march', gain=0.7):
        for b in bars:
            base = b * 4
            if kind == 'march':
                for s in (0, 2):
                    self.hit(drum_big(0.9), base + s, gain)
                for s in (1, 3):
                    self.hit(tabor(0.8), base + s, gain * 0.6, 0.2)
                for s in np.arange(0, 4, 0.5):
                    self.hit(shaker(0.6 + 0.4 * (s % 1 == 0)), base + s, gain * 0.5, -0.4)
            elif kind == 'gallop':
                for s in (0, 0.75, 1, 2, 2.75, 3):
                    self.hit(drum_tom(0.8, 110 if s in (0, 2) else 150), base + s, gain * 0.7, 0.1)
                self.hit(drum_big(1.0), base, gain)
                for s in np.arange(0, 4, 0.5):
                    self.hit(shaker(0.7), base + s, gain * 0.4, -0.3)
            elif kind == 'light':
                self.hit(drum_tom(0.7, 100), base, gain * 0.6)
                self.hit(drum_tom(0.5, 140), base + 2.5, gain * 0.5)
                for s in (1, 3):
                    self.hit(tambourine(0.6), base + s, gain * 0.35, 0.3)
            elif kind == 'six8':
                for s in (0, 2):
                    self.hit(drum_tom(0.8, 105), base + s, gain * 0.7)
                for s in np.arange(0, 4, 2 / 3):
                    self.hit(shaker(0.7), base + s, gain * 0.45, -0.3)
                self.hit(tambourine(0.7), base + 1.333, gain * 0.35, 0.3)
                self.hit(tambourine(0.7), base + 3.333, gain * 0.35, 0.3)
            elif kind == 'war':
                for s in (0, 1.5, 2, 3.5):
                    self.hit(drum_big(1.0), base + s, gain)
                for s in (1, 3):
                    self.hit(tabor(1.0), base + s, gain * 0.7, 0.15)
                for s in np.arange(0, 4, 0.25):
                    self.hit(shaker(0.5 + 0.5 * (s % 1 == 0)), base + s, gain * 0.35, -0.35)

    def timp(self, bars, gain=0.6):
        for b in bars:
            r = self.chord(b)[0]
            self.hit(timpani(self.deg(r, -2), 1.0), b * 4, gain)
            if b % 2 == 1:
                self.hit(timpani(self.deg(r + 4, -2), 0.8), b * 4 + 3, gain * 0.8)

    def render(self):
        wet = stereo_reverb(self.out[:, 0] * 0.5 + self.out[:, 1] * 0.5, 2.4, 1.0, 6000)
        n = len(self.out)
        mixd = self.out + wet[:n] * 0.22
        # seamless loop: fold the tail past the loop point back onto the start
        L = int(self.len_s * SR)
        loop = mixd[:L].copy()
        tail = mixd[L:]
        k = min(len(tail), L)
        loop[:k] += tail[:k]
        loop = highpass(loop.T, 30).T
        peak = np.max(np.abs(loop)) + 1e-9
        loop = np.tanh(loop / peak * 1.3) / np.tanh(1.3) * 0.9
        return loop


def compose(name):
    if name == 'menu':
        T = Track('menu', 84, 55, 'major', [0, 4, 5, 3, 0, 4, 3, 4], 16, 11, 'calm')
        all_b = range(16)
        T.pad(strings, all_b, 0, 0.28)
        T.arp(harp, all_b, [0, 1, 2, 3, 2, 1, 0, 1], 0, 0.32, -0.35)
        T.bass(cello, all_b, (0,), -2, 0.45)
        T.melody(flute, range(4, 16), 1, 0.42, 0.2, 0.5)
        for b in (0, 8):
            T.hit(timpani(T.deg(0, -2), 0.6), b * 4, 0.4)
        return T
    if name == 'meadow':
        T = Track('meadow', 118, 50, 'dorian', [0, 6, 5, 6, 0, 3, 4, 4], 24, 21, 'march')
        all_b = range(24)
        T.drums(range(2, 24), 'march', 0.65)
        T.bass(cello, all_b, (0, 2), -2, 0.5)
        T.arp(lute, all_b, [0, 2, 1, 2, 0, 2, 1, 3], 0, 0.36, -0.3)
        T.pad(strings, range(8, 24), 0, 0.22)
        T.melody(flute, range(4, 16), 1, 0.45, 0.15, 0.7)
        T.melody(brass, range(16, 24), 0, 0.38, 0.1, 0.5)
        return T
    if name == 'canyon':
        T = Track('canyon', 108, 52, 'phrygian', [0, 1, 0, 6, 5, 1, 0, 0], 24, 31, 'gallop')
        all_b = range(24)
        T.drums(range(0, 24), 'gallop', 0.65)
        T.bass(cello, all_b, (0, 0.75, 2, 2.75), -2, 0.45)
        T.arp(lute, all_b, [0, None, 2, 1, 0, None, 3, 2], 0, 0.36, -0.3)
        T.pad(strings, range(4, 24), -1, 0.22)
        T.melody(brass, range(8, 24), 0, 0.4, 0.15, 0.55)
        T.timp([b for b in all_b if b % 4 == 0], 0.5)
        return T
    if name == 'coast':
        T = Track('coast', 100, 55, 'mixolydian', [0, 6, 3, 0, 4, 6, 3, 4], 24, 41, 'six8')
        all_b = range(24)
        T.drums(range(2, 24), 'six8', 0.6)
        T.bass(cello, all_b, (0, 2), -2, 0.45)
        T.arp(harp, all_b, [0, 1, 2, 3, 2, 1], 0, 0.34, -0.35, 2 / 3)
        T.pad(strings, range(8, 24), 0, 0.2)
        T.melody(flute, range(4, 24), 1, 0.42, 0.2, 0.65)
        return T
    if name == 'snow':
        T = Track('snow', 92, 57, 'minor', [0, 5, 2, 6, 0, 3, 4, 4], 24, 51, 'light')
        all_b = range(24)
        T.drums(range(4, 24), 'light', 0.55)
        T.pad(strings, all_b, 0, 0.3)
        T.pad(choir, range(8, 24), 0, 0.12, 0.6)
        T.arp(bell, all_b, [0, 2, 1, 3, None, 2, 1, None], 1, 0.22, 0.3)
        T.bass(cello, all_b, (0,), -2, 0.45)
        T.melody(flute, range(8, 24), 1, 0.38, -0.1, 0.45)
        return T
    if name == 'ashlands':
        T = Track('ashlands', 126, 48, 'harmonic', [0, 5, 3, 4, 0, 5, 6, 4], 24, 61, 'war')
        all_b = range(24)
        T.drums(all_b, 'war', 0.7)
        T.bass(cello, all_b, (0, 0.5, 1.5, 2, 3), -2, 0.45)
        T.pad(choir, range(4, 24), 0, 0.16, 0.6)
        T.arp(lute, all_b, [0, 0, 2, 0, 1, 0, 2, 3], -1, 0.3, -0.3)
        T.melody(brass, range(8, 24), 0, 0.42, 0.1, 0.6)
        T.timp([b for b in all_b if b % 2 == 0], 0.5)
        return T
    if name == 'boss':
        T = Track('boss', 138, 50, 'harmonic', [0, 0, 5, 4, 0, 0, 3, 4], 16, 71, 'war')
        all_b = range(16)
        T.drums(all_b, 'war', 0.75)
        T.timp(all_b, 0.6)
        T.bass(cello, all_b, (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5), -2, 0.4)
        T.pad(choir, all_b, 0, 0.18, 0.6)
        T.pad(brass, range(4, 16), -1, 0.22)
        T.melody(brass, range(8, 16), 0, 0.45, 0.1, 0.6, 1)
        return T
    raise ValueError(name)


TRACKS = ['menu', 'meadow', 'canyon', 'coast', 'snow', 'ashlands', 'boss']
