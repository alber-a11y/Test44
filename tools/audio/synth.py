"""Tiny offline synthesis toolkit (numpy/scipy) used to generate all game audio."""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(1234)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def silence(dur):
    return np.zeros(int(dur * SR))


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ oscillators
def sine(freq, dur, phase=0.0):
    t = t_axis(dur)
    if np.isscalar(freq):
        return np.sin(2 * np.pi * freq * t + phase)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(ph + phase)


def saw(freq, dur, harmonics=None):
    """Band-limited sawtooth via additive synthesis (freq may be an array)."""
    t = t_axis(dur)
    f = np.full(len(t), freq) if np.isscalar(freq) else freq[: len(t)]
    ph = 2 * np.pi * np.cumsum(f) / SR
    fmax = float(np.max(f))
    n = harmonics or max(1, int(min(40, (SR / 2.2) / max(fmax, 1))))
    out = np.zeros(len(t))
    for k in range(1, n + 1):
        out += np.sin(k * ph) / k * ((-1) ** (k + 1))
    return out * (2 / np.pi)


def square(freq, dur, harmonics=None):
    t = t_axis(dur)
    f = np.full(len(t), freq) if np.isscalar(freq) else freq[: len(t)]
    ph = 2 * np.pi * np.cumsum(f) / SR
    n = harmonics or max(1, int(min(30, (SR / 2.2) / max(float(np.max(f)), 1))))
    out = np.zeros(len(t))
    for k in range(1, n + 1, 2):
        out += np.sin(k * ph) / k
    return out * (4 / np.pi)


def triangle(freq, dur):
    t = t_axis(dur)
    f = np.full(len(t), freq) if np.isscalar(freq) else freq[: len(t)]
    ph = 2 * np.pi * np.cumsum(f) / SR
    out = np.zeros(len(t))
    for i, k in enumerate(range(1, 16, 2)):
        out += ((-1) ** i) * np.sin(k * ph) / (k * k)
    return out * (8 / np.pi ** 2)


def noise(dur, color='white'):
    n = rng.standard_normal(int(dur * SR))
    if color == 'pink':
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        n = signal.lfilter(b, a, n) * 3
    elif color == 'brown':
        n = highpass(np.cumsum(n), 25)
    return n / (np.max(np.abs(n)) + 1e-9)


def fm(carrier, ratio, index, dur, index_env=None):
    t = t_axis(dur)
    mod_i = index if index_env is None else index * index_env
    mod = np.sin(2 * np.pi * carrier * ratio * t) * mod_i
    return np.sin(2 * np.pi * carrier * t + mod)


def pluck(freq, dur, decay=0.996, bright=0.5):
    """Karplus-Strong plucked string."""
    n = int(dur * SR)
    period = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, period)
    # soften the excitation for a warmer lute tone
    buf = signal.lfilter([bright, 1 - bright], [1], buf)
    out = np.zeros(n)
    idx = 0
    b = buf.copy()
    for i in range(n):
        out[i] = b[idx]
        nxt = (idx + 1) % period
        b[idx] = decay * 0.5 * (b[idx] + b[nxt])
        idx = nxt
    return out


def pluck_fast(freq, dur, decay=0.996, bright=0.5):
    """Vectorised-ish Karplus-Strong (block processing per period)."""
    n = int(dur * SR)
    period = max(2, int(round(SR / freq)))
    buf = rng.uniform(-1, 1, period)
    buf = signal.lfilter([bright, 1 - bright], [1], buf)
    blocks = int(np.ceil(n / period)) + 1
    out = np.empty(blocks * period)
    cur = buf
    for k in range(blocks):
        out[k * period:(k + 1) * period] = cur
        cur = decay * 0.5 * (cur + np.roll(cur, -1))
    return out[:n]


# ------------------------------------------------------------------ envelopes & filters
def env_adsr(dur, a=0.01, d=0.1, s=0.7, r=0.2):
    n = int(dur * SR)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    ns = max(0, n - na - nd - nr)
    e = np.concatenate([
        np.linspace(0, 1, max(na, 1), endpoint=False),
        np.linspace(1, s, max(nd, 1), endpoint=False),
        np.full(ns, s),
        np.linspace(s, 0, max(nr, 1)),
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def env_exp(dur, decay, attack=0.002):
    t = t_axis(dur)
    e = np.exp(-t / max(decay, 1e-4))
    na = int(attack * SR)
    if na > 0:
        e[:na] *= np.linspace(0, 1, na)
    return e


def lowpass(x, cutoff, order=2):
    cutoff = min(cutoff, SR / 2 * 0.95)
    b, a = signal.butter(order, cutoff / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def highpass(x, cutoff, order=2):
    b, a = signal.butter(order, cutoff / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    hi = min(hi, SR / 2 * 0.95)
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def sweep_lowpass(x, f0, f1, steps=32):
    """Time-varying lowpass by processing in blocks (cheap filter sweep)."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, steps + 1).astype(int)
    zi = None
    for i in range(steps):
        fc = f0 * (f1 / f0) ** (i / max(1, steps - 1))
        b, a = signal.butter(2, min(fc, SR / 2 * 0.95) / (SR / 2), 'low')
        seg = x[edges[i]:edges[i + 1]]
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        y, zi = signal.lfilter(b, a, seg, zi=zi)
        out[edges[i]:edges[i + 1]] = y
    return out


def sweep_bandpass(x, f0, f1, q=2.0, steps=32):
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, steps + 1).astype(int)
    for i in range(steps):
        fc = f0 * (f1 / f0) ** (i / max(1, steps - 1))
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.9)
        b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
        out[edges[i]:edges[i + 1]] = signal.lfilter(b, a, x[edges[i]:edges[i + 1]])
    return out


def formant(x, formants=((700, 1.0), (1150, 0.6), (2600, 0.3)), bw=0.18):
    out = np.zeros(len(x))
    for f, g in formants:
        out += bandpass(x, f * (1 - bw), f * (1 + bw)) * g
    return out


def distort(x, drive=2.0):
    return np.tanh(x * drive) / np.tanh(drive)


# ------------------------------------------------------------------ space
_ir_cache = {}


def reverb(x, room=1.8, wet=0.25, damp=5000, pre=0.012):
    key = (room, damp)
    if key not in _ir_cache:
        n = int(room * SR)
        t = np.arange(n) / SR
        ir = rng.standard_normal(n) * np.exp(-t * (6.9 / room))
        ir = lowpass(ir, damp)
        ir[: int(pre * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        _ir_cache[key] = ir
    ir = _ir_cache[key]
    y = signal.fftconvolve(x, ir)[: len(x) + len(ir)]
    dry = np.pad(x, (0, len(y) - len(x)))
    return dry * (1 - wet) + y * wet


def stereo_reverb(x, room=2.2, wet=0.28, damp=5500):
    l = reverb(x, room, wet, damp)
    _ir_cache.pop((room, damp), None)
    r = reverb(x, room, wet, damp)
    _ir_cache.pop((room, damp), None)
    m = max(len(l), len(r))
    return np.stack([np.pad(l, (0, m - len(l))), np.pad(r, (0, m - len(r)))], 1)


# ------------------------------------------------------------------ mixing
def mix(*parts):
    n = max(len(p) for p, _ in parts) if parts else 0
    out = np.zeros(n) if parts and parts[0][0].ndim == 1 else np.zeros((n, 2))
    for p, gain in parts:
        if out.ndim == 2 and p.ndim == 1:
            p = np.stack([p, p], 1)
        out[: len(p)] += p * gain
    return out


def place(dst, src, at, gain=1.0, pan=0.0):
    """Add src into dst at time `at` seconds (dst stereo, src mono or stereo)."""
    i = int(at * SR)
    if i >= len(dst):
        return
    if src.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        src = np.stack([src * l, src * r], 1) * 1.414
    end = min(len(dst), i + len(src))
    dst[i:end] += src[: end - i] * gain


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return x * (peak / m)


def fade(x, fin=0.002, fout=0.01):
    n = len(x)
    a, b = int(fin * SR), int(fout * SR)
    e = np.ones(n)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if b:
        e[-b:] = np.linspace(1, 0, b)
    return x * (e if x.ndim == 1 else e[:, None])
