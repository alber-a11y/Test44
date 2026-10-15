"""Seamless ambient loops per biome."""
import numpy as np
from synth import SR, noise, lowpass, highpass, bandpass, sine, env_exp, t_axis, fm
from synth import rng

DUR = 20.0


def loopify(x, xf=1.5):
    """Crossfade the end into the start for a seamless loop."""
    n = int(xf * SR)
    out = x[: len(x) - n].copy()
    fade = np.linspace(0, 1, n)
    out[:n] = out[:n] * fade + x[len(x) - n:] * (1 - fade)
    return out


def slow_lfo(n, rate, depth):
    return 1 - depth + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * np.arange(n) / SR + rng.uniform(0, 6)))


def wind(d, gain=1.0, lo=200, hi=900):
    x = bandpass(noise(d, 'pink'), lo, hi)
    return x * slow_lfo(len(x), 0.08, 0.6) * gain


def bird(f0):
    d = 0.35
    t = t_axis(d)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 14 * t)) * (1 + 0.3 * t)
    return sine(f, d) * env_exp(d, 0.08, 0.01)


def scatter(base, events, gain):
    for at, s in events:
        i = int(at * SR)
        e = min(len(base), i + len(s))
        base[i:e] += s[: e - i] * gain


def meadow():
    d = DUR + 1.5
    x = wind(d, 0.25, 250, 1200)
    ev = []
    for _ in range(14):
        at = rng.uniform(0, d - 2)
        f = rng.uniform(2500, 4200)
        for k in range(rng.integers(2, 5)):
            ev.append((at + k * 0.18, bird(f * rng.uniform(0.95, 1.05))))
    scatter(x, ev, 0.08)
    # crickets
    t = t_axis(d)
    cr = sine(4300, d) * (np.sin(2 * np.pi * 28 * t) > 0.6) * slow_lfo(len(t), 0.3, 0.8)
    return x + cr * 0.012


def canyon():
    d = DUR + 1.5
    x = wind(d, 0.5, 150, 700) + wind(d, 0.15, 900, 2500)
    ev = [(rng.uniform(0, d - 3), fm(1800, 1.5, 0.8, 1.2, env_exp(1.2, 0.3)) * env_exp(1.2, 0.5)) for _ in range(3)]  # distant hawk
    scatter(x, ev, 0.05)
    return x


def coast():
    d = DUR + 1.5
    n = int(d * SR)
    t = np.arange(n) / SR
    surf = lowpass(noise(d, 'pink'), 1200)
    waves = np.clip(np.sin(2 * np.pi * t / 6.5) * 0.5 + 0.5, 0, 1) ** 2
    x = surf * (0.25 + 0.75 * waves) * 0.6 + wind(d, 0.12)
    ev = [(rng.uniform(0, d - 1), bird(rng.uniform(1300, 1700))) for _ in range(5)]  # gulls
    scatter(x, ev, 0.07)
    return x


def snow():
    d = DUR + 1.5
    return wind(d, 0.6, 300, 1500) + highpass(noise(d), 4000) * slow_lfo(int(d * SR), 0.12, 0.9) * 0.05


def ashlands():
    d = DUR + 1.5
    rumble = lowpass(noise(d, 'brown'), 120) * 0.6
    x = rumble + wind(d, 0.2, 200, 600)
    n = int(d * SR)
    crackle = highpass(noise(d), 1500) * (rng.random(n) > 0.997) * 0.6
    return x + crackle


AMBIENCE = {'meadow': meadow, 'canyon': canyon, 'coast': coast, 'snow': snow, 'ashlands': ashlands}
