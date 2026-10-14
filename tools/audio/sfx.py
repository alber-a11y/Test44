"""Procedural sound effects."""
import numpy as np
from synth import *  # noqa: F401,F403
from synth import SR, rng


def whoosh(dur=0.25, f0=3000, f1=800, gain=1.0):
    n = noise(dur, 'pink')
    return sweep_bandpass(n, f0, f1, q=1.5) * env_adsr(dur, 0.02, dur * 0.3, 0.5, dur * 0.6) * gain


def thud(freq=90, dur=0.25, drop=0.5):
    f = freq * np.exp(-t_axis(dur) * (1 / drop) * 3) + freq * 0.4
    return sine(f, dur) * env_exp(dur, dur * 0.35)


def ping(freq, dur=0.3, decay=0.12):
    return (sine(freq, dur) + 0.4 * sine(freq * 2.01, dur) * env_exp(dur, decay * 0.5)) * env_exp(dur, decay)


def clang(base=520, dur=0.45):
    ratios = [1, 2.76, 5.4, 8.93, 1.5]
    out = sum(sine(base * r, dur) * env_exp(dur, 0.15 / (1 + i * 0.4)) / (1 + i * 0.5) for i, r in enumerate(ratios))
    return out + highpass(noise(dur), 3000) * env_exp(dur, 0.01) * 0.6


def grunt(f0=150, f1=95, dur=0.32, vowel=((650, 1.0), (1080, 0.7), (2500, 0.25))):
    f = np.linspace(f0, f1, int(dur * SR)) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t_axis(dur)))
    src = saw(f, dur) + noise(dur) * 0.15
    return formant(src, vowel) * env_adsr(dur, 0.02, 0.08, 0.6, dur * 0.5) * 1.6


def chime(notes, step=0.06, dur=0.7, decay=0.25, bright=1.0):
    total = step * len(notes) + dur
    out = np.zeros(int(total * SR))
    for i, m in enumerate(notes):
        f = midi_hz(m)
        s = fm(f, 3.5, 1.2 * bright, dur, env_exp(dur, decay * 0.6)) * env_exp(dur, decay)
        a = int(i * step * SR)
        out[a:a + len(s)] += s
    return out


def explosion(dur=1.3, big=False):
    n = noise(dur, 'brown')
    body = sweep_lowpass(n, 2500 if big else 1800, 120, 24) * env_exp(dur, 0.35 if big else 0.25, 0.003)
    sub = thud(70 if big else 85, dur, 0.4) * (1.2 if big else 0.9)
    crack = highpass(noise(0.12), 1500) * env_exp(0.12, 0.02)
    out = mix((body, 1.0), (sub, 0.9), (crack, 0.6))
    if big:
        deb = np.zeros(len(out))
        for _ in range(14):
            a = int(rng.uniform(0.15, 0.9) * SR)
            c = highpass(noise(0.05), 2500) * env_exp(0.05, 0.01) * rng.uniform(0.1, 0.35)
            deb[a:a + len(c)] += c
        out = out + deb
    return distort(out, 1.6)


def build_all():
    S = {}
    # ---- weapons
    tw = pluck_fast(196, 0.25, 0.985, 0.7) * env_exp(0.25, 0.08)
    S['arrow'] = mix((whoosh(0.28, 4200, 1500), 0.7), (tw, 0.5))
    S['bolt'] = mix((pluck_fast(98, 0.45, 0.99, 0.6) * env_exp(0.45, 0.12), 0.8), (whoosh(0.4, 2500, 600), 0.6), (thud(140, 0.15), 0.6))
    creak = bandpass(saw(np.linspace(180, 120, int(0.25 * SR)), 0.25), 300, 1400) * env_adsr(0.25, 0.02, 0.1, 0.5, 0.1)
    S['catapult'] = mix((creak, 0.35), (thud(70, 0.45), 1.0), (whoosh(0.5, 900, 300), 0.6))
    S['boom'] = explosion(1.1)
    S['boom_big'] = explosion(1.8, big=True)
    S['magic'] = mix((chime([84, 88, 91], 0.03, 0.45, 0.12), 0.5), (sweep_bandpass(noise(0.4), 2000, 8000, 3) * env_exp(0.4, 0.15), 0.4))
    zz = np.sign(sine(np.linspace(60, 40, int(0.35 * SR)), 0.35)) * (rng.random(int(0.35 * SR)) > 0.4)
    S['zap'] = mix((highpass(noise(0.35), 1800) * env_exp(0.35, 0.08) * (rng.random(int(0.35 * SR)) > 0.5), 0.8), (lowpass(zz.astype(float), 3000) * env_exp(0.35, 0.12), 0.5))
    crackle = highpass(noise(0.7), 900) * (rng.random(int(0.7 * SR)) > 0.92)
    S['fire'] = mix((lowpass(noise(0.7, 'pink'), 1600) * env_adsr(0.7, 0.05, 0.2, 0.6, 0.35), 0.7), (crackle * env_adsr(0.7, 0.01, 0.2, 0.7, 0.3), 0.4))
    S['hit'] = mix((thud(160, 0.12, 0.2), 0.8), (lowpass(noise(0.08), 2500) * env_exp(0.08, 0.02), 0.7))
    S['hit_metal'] = clang(620, 0.35)
    S['deflect'] = mix((clang(980, 0.3), 0.6), (ping(2600, 0.2, 0.05), 0.4))
    S['sword'] = mix((clang(760, 0.28) * 0.6, 1.0), (whoosh(0.15, 5000, 2000), 0.4))
    # ---- creatures
    S['death'] = mix((grunt(170, 90, 0.35), 0.7), (thud(110, 0.2), 0.4))
    roar_f = np.linspace(110, 70, int(1.0 * SR)) * (1 + 0.06 * np.sin(2 * np.pi * 6 * t_axis(1.0)))
    roar = distort(formant(saw(roar_f, 1.0) + noise(1.0) * 0.3, ((500, 1.0), (900, 0.8), (2400, 0.3))) * env_adsr(1.0, 0.08, 0.2, 0.7, 0.5) * 2, 2.5)
    S['roar'] = roar
    trumpet_f = np.concatenate([np.linspace(300, 520, int(0.25 * SR)), np.linspace(520, 380, int(0.6 * SR))])
    trumpet = formant(saw(trumpet_f, 0.85) + noise(0.85) * 0.2, ((800, 1), (1600, 0.6), (3000, 0.3))) * env_adsr(0.85, 0.05, 0.2, 0.7, 0.3)
    S['death_big'] = mix((trumpet, 0.6), (thud(60, 0.7, 0.5), 1.0), (lowpass(noise(0.6, 'brown'), 300) * env_exp(0.6, 0.2), 0.6))
    # ---- economy & UI
    S['coin'] = mix((ping(1975, 0.25, 0.06), 0.6), (np.pad(ping(2637, 0.3, 0.09), (int(0.05 * SR), 0)), 0.6))
    coins = np.zeros(int(0.9 * SR))
    for i in range(9):
        p = ping(rng.uniform(1800, 3200), 0.25, 0.05)
        a = int(i * 0.07 * SR + rng.uniform(0, 0.02) * SR)
        coins[a:a + len(p)] += p * rng.uniform(0.4, 0.8)
    S['coins'] = coins
    knock = lambda f: bandpass(noise(0.08), f * 0.7, f * 1.4) * env_exp(0.08, 0.015) + sine(f * 0.5, 0.08) * env_exp(0.08, 0.02)
    b = np.zeros(int(0.9 * SR))
    for i, f in enumerate([700, 650, 760]):
        k = knock(f)
        a = int(i * 0.14 * SR)
        b[a:a + len(k)] += k
    S['build'] = mix((b, 1.0), (np.pad(chime([79, 83, 86, 91], 0.05, 0.5, 0.15), (int(0.42 * SR), 0)), 0.35))
    S['upgrade'] = chime([72, 76, 79, 84, 88], 0.06, 0.6, 0.2)
    S['sell'] = mix((chime([88, 84, 79], 0.07, 0.4, 0.1), 0.5), (S['coins'][: int(0.5 * SR)], 0.5))
    S['click'] = mix((bandpass(noise(0.04), 1500, 5000) * env_exp(0.04, 0.006), 0.8), (sine(900, 0.04) * env_exp(0.04, 0.01), 0.4))
    S['open'] = sine(np.linspace(500, 900, int(0.09 * SR)), 0.09) * env_exp(0.09, 0.03)
    e1 = square(150, 0.12) * env_adsr(0.12, 0.005, 0.02, 0.7, 0.04)
    S['error'] = lowpass(np.concatenate([e1, silence(0.03), square(110, 0.16) * env_adsr(0.16, 0.005, 0.02, 0.7, 0.06)]), 1800) * 0.6
    S['step'] = mix((lowpass(noise(0.07, 'pink'), 1200) * env_exp(0.07, 0.02), 0.8), (sine(200, 0.05) * env_exp(0.05, 0.01), 0.2))
    S['swish'] = whoosh(0.3, 5000, 1200)
    # ---- horns & stingers
    def horn(m, dur, vib=5.0):
        f = midi_hz(m) * (1 + 0.008 * np.sin(2 * np.pi * vib * t_axis(dur)))
        tone = saw(f, dur)
        fenv = env_adsr(dur, 0.12, 0.2, 0.7, 0.3)
        y = np.zeros(len(tone))
        blocks = 24
        edges = np.linspace(0, len(tone), blocks + 1).astype(int)
        for i in range(blocks):
            fc = 400 + 2400 * fenv[min(edges[i], len(fenv) - 1)]
            y[edges[i]:edges[i + 1]] = lowpass(tone[edges[i]:edges[i + 1] + 400], fc)[: edges[i + 1] - edges[i]]
        return y * env_adsr(dur, 0.1, 0.2, 0.8, 0.35)
    S['horn'] = reverb(mix((horn(45, 1.4), 0.8), (horn(52, 1.4), 0.5)), 1.6, 0.3)
    S['wave'] = S['horn']
    drum = lambda: thud(55, 0.6, 0.6) + lowpass(noise(0.6, 'brown'), 400) * env_exp(0.6, 0.1) * 0.6
    boss = np.zeros(int(2.6 * SR))
    for i, at in enumerate([0, 0.35, 0.7, 1.2]):
        d = drum()
        a = int(at * SR)
        boss[a:a + len(d)] += d
    brass = mix((horn(38, 1.6), 0.7), (horn(41, 1.6), 0.5), (horn(45, 1.6), 0.4))
    boss[int(1.0 * SR):int(1.0 * SR) + len(brass)] += brass[: len(boss) - int(1.0 * SR)]
    S['boss'] = reverb(distort(boss, 1.4), 2.0, 0.3)
    S['leak'] = reverb(mix((fm(110, 1.4, 2.0, 1.2, env_exp(1.2, 0.4)) * env_exp(1.2, 0.5), 0.8), (thud(80, 0.4), 0.5)), 1.5, 0.25)
    def fanfare(notes, durs, base_oct=0):
        out = np.zeros(int((sum(durs) + 1.2) * SR))
        at = 0.0
        for m, d in zip(notes, durs):
            tone = mix((horn(m + base_oct, d + 0.25, 6), 0.7), (horn(m + base_oct + 12, d + 0.25, 6), 0.25))
            a = int(at * SR)
            out[a:a + len(tone)] += tone
            at += d
        return out
    S['victory'] = reverb(fanfare([60, 64, 67, 72, 67, 72], [0.16, 0.16, 0.16, 0.45, 0.16, 0.9]), 2.2, 0.3)
    S['defeat'] = reverb(fanfare([62, 61, 60, 55], [0.35, 0.35, 0.35, 1.1], -12), 2.2, 0.3)
    S['heal'] = reverb(chime([76, 79, 83, 88, 91], 0.07, 0.8, 0.3, 0.6), 1.5, 0.3)
    ice = chime([96, 100, 103, 98, 101], 0.03, 0.4, 0.1, 1.5)
    S['freeze'] = reverb(mix((ice, 0.5), (whoosh(0.8, 6000, 2500), 0.6)), 1.4, 0.3)
    S['meteor'] = mix((whoosh(0.9, 3000, 300, 1.0), 0.8), (lowpass(noise(0.9, 'brown'), 250) * env_adsr(0.9, 0.5, 0.2, 0.8, 0.2), 0.6))
    S['stars'] = reverb(chime([91, 95, 98], 0.04, 0.5, 0.12, 1.2), 1.2, 0.3)
    S['reward'] = reverb(mix((chime([72, 76, 79, 84, 88, 91], 0.05, 0.9, 0.3), 0.6), (S['coins'], 0.4)), 1.8, 0.25)
    S['unlock'] = reverb(mix((chime([67, 72, 76, 79, 84, 88, 91, 96], 0.06, 1.0, 0.35), 0.6), (fanfare([67, 72], [0.15, 0.6]), 0.4)), 2.0, 0.3)
    return S
