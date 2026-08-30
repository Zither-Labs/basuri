"""Re-export longer sustained bansuri Sa anchors from Freesound CC BY sources."""
import os, json, math
import numpy as np
import soundfile as sf
import librosa

RAW = os.path.join(os.path.dirname(__file__), "_raw")
OUT = os.path.dirname(__file__)
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def hz_to_midi(hz):
    return 69 + 12 * math.log2(hz / 440.0)

def midi_name(m):
    m = int(round(m))
    return NOTE_NAMES[((m % 12) + 12) % 12] + str(m // 12 - 1)

def write_mp3(path, y, sr):
    peak = np.max(np.abs(y)) or 1.0
    y = (y / peak) * 0.9
    sf.write(path, y, sr, format="MP3")

def fund(y, sr):
    a = int(len(y) * 0.2)
    b = int(len(y) * 0.8)
    f0 = librosa.yin(y[a:b], fmin=120, fmax=1400, sr=sr)
    f0 = f0[np.isfinite(f0)]
    return float(np.median(f0)) if len(f0) else None

# Remove weak staccato slices
for fn in os.listdir(OUT):
    if fn.endswith(".mp3") and not fn.startswith("sa-") and not fn.startswith("phrase-"):
        os.remove(os.path.join(OUT, fn))
        print("removed", fn)

pairs = []
for fn in os.listdir(RAW):
    p = os.path.join(RAW, fn)
    if "179695" in fn or fn.startswith("lower"):
        pairs.append(("lower", p))
    elif "179696" in fn or fn.startswith("middle"):
        pairs.append(("middle", p))
    elif "179694" in fn:
        pairs.append(("octaves", p))

meta = {"samples": [], "sources": [
    {
        "artist": "sankalp (Freesound)",
        "license": "CC BY 4.0",
        "urls": [
            "https://freesound.org/people/sankalp/sounds/179695/",
            "https://freesound.org/people/sankalp/sounds/179696/",
            "https://freesound.org/people/sankalp/sounds/179694/",
            "https://freesound.org/people/sankalp/sounds/179693/",
        ],
        "notes": "Real bansuri long tones and scale phrases; cropped for practice playback.",
    },
    {
        "artist": "Ninad_P (Freesound)",
        "license": "CC0 1.0",
        "urls": ["https://freesound.org/people/Ninad_P/sounds/448458/"],
        "notes": "Short Rag Jog phrase demo.",
    },
]}

anchors = []
for role, path in pairs:
    if role == "octaves":
        y, sr = librosa.load(path, sr=44100, mono=True)
        y, _ = librosa.effects.trim(y, top_db=28)
        # split roughly in half (two strong tones in file)
        mid = len(y) // 2
        chunks = [("oct-low", y[:mid]), ("oct-high", y[mid:])]
        for r, chunk in chunks:
            chunk, _ = librosa.effects.trim(chunk, top_db=26)
            if len(chunk) < sr * 0.5:
                continue
            # take up to 2.5s from 10% in
            a = int(0.08 * len(chunk))
            clip = chunk[a:a + int(2.5 * sr)]
            fade = int(0.05 * sr)
            clip = clip.copy()
            clip[:fade] *= np.linspace(0, 1, fade)
            clip[-fade:] *= np.linspace(1, 0, fade)
            f0 = fund(clip, sr)
            midi = hz_to_midi(f0)
            name = midi_name(midi)
            out = f"sa-{r}-{name.replace('#','s')}.mp3"
            write_mp3(os.path.join(OUT, out), clip, sr)
            entry = {"file": out, "midi": round(midi), "hz": round(f0, 2), "role": r}
            meta["samples"].append(entry)
            anchors.append(entry)
            print(entry)
        continue

    y, sr = librosa.load(path, sr=44100, mono=True)
    y, _ = librosa.effects.trim(y, top_db=28)
    a = int(0.12 * sr)
    clip = y[a:a + int(2.8 * sr)]
    fade = int(0.05 * sr)
    clip = clip.copy()
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    f0 = fund(clip, sr)
    midi = hz_to_midi(f0)
    name = midi_name(midi)
    out = f"sa-{role}-{name.replace('#','s')}.mp3"
    # remove older sa-lower/middle files with different names
    for old in os.listdir(OUT):
        if old.startswith(f"sa-{role}-") and old.endswith(".mp3"):
            os.remove(os.path.join(OUT, old))
    write_mp3(os.path.join(OUT, out), clip, sr)
    entry = {"file": out, "midi": round(midi), "hz": round(f0, 2), "role": role}
    meta["samples"].append(entry)
    anchors.append(entry)
    print(entry)

# phrases
for src_name, out_name in [
    ("rag-jog.mp3", "phrase-rag-jog.mp3"),
]:
    src = os.path.join(RAW, src_name)
    if os.path.exists(src):
        open(os.path.join(OUT, out_name), "wb").write(open(src, "rb").read())
        meta["samples"].append({"file": out_name, "role": "phrase"})

# major scale phrase from 179693
for fn in os.listdir(RAW):
    if "179693" in fn:
        y, sr = librosa.load(os.path.join(RAW, fn), sr=44100, mono=True)
        y, _ = librosa.effects.trim(y, top_db=28)
        write_mp3(os.path.join(OUT, "phrase-major-scale.mp3"), y[: int(min(len(y), 10 * sr))], sr)
        meta["samples"].append({"file": "phrase-major-scale.mp3", "role": "phrase"})
        break

open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8").write(json.dumps(meta, indent=2))
print("anchors", anchors)
