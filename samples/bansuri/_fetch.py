import os, ssl, urllib.request, zipfile, io, struct, wave

RAW = os.path.join(os.path.dirname(__file__), "_raw")
os.makedirs(RAW, exist_ok=True)
ctx = ssl.create_default_context()

candidates = [
    ("art7557.bin", "https://www.musical-artifacts.com/artifacts/7557/download"),
    ("fs179695.mp3", "https://freesound.org/data/previews/179/179695_2398405-hq.mp3"),
    ("fs179696.mp3", "https://freesound.org/data/previews/179/179696_2398405-hq.mp3"),
    ("fs448458.mp3", "https://freesound.org/data/previews/448/448458_9151636-hq.mp3"),
    # sankalp middle/lower may use different preview ids — try common patterns later
]

def fetch(name, url):
    path = os.path.join(RAW, name)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SangeetBasuri/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=90) as r:
        data = r.read()
        ctype = r.headers.get("Content-Type", "")
    open(path, "wb").write(data)
    print("OK", name, len(data), ctype)
    return path, data, ctype

for name, url in candidates:
    try:
        fetch(name, url)
    except Exception as e:
        print("FAIL", name, e)

# Inspect artifact
art = os.path.join(RAW, "art7557.bin")
if os.path.exists(art) and os.path.getsize(art) > 1000:
    with open(art, "rb") as f:
        head = f.read(16)
    print("art magic", head[:8])
    try:
        with zipfile.ZipFile(art) as z:
            print("zip members", z.namelist()[:30])
            z.extractall(os.path.join(RAW, "art7557"))
    except zipfile.BadZipFile:
        # maybe raw sf2
        if head[:4] == b"RIFF":
            os.rename(art, os.path.join(RAW, "Bansuri_Raw.sf2"))
            print("renamed to sf2")
        else:
            print("unknown artifact format")

print("listing", os.listdir(RAW))
