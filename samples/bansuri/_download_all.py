import urllib.request, ssl, re, os, json

ctx = ssl.create_default_context()
RAW = os.path.join(os.path.dirname(__file__), "_raw")
os.makedirs(RAW, exist_ok=True)

ids = ["179693", "179694", "179695", "179696", "179697", "179698"]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, context=ctx, timeout=60).read()

for sid in ids:
    page = f"https://freesound.org/people/sankalp/sounds/{sid}/"
    html = get(page).decode("utf-8", "replace")
    title = re.search(r"<h1[^>]*>\s*(.*?)\s*</h1>", html, re.S)
    title = re.sub(r"\s+", " ", title.group(1)).strip() if title else "?"
    desc = re.search(r'property="og:description" content="([^"]*)"', html)
    desc = desc.group(1) if desc else ""
    lic = re.findall(r"creativecommons.org/licenses/[^\s\"']+", html)
    hq = list(dict.fromkeys(re.findall(r"https://cdn\.freesound\.org/previews/\d+/\d+_[^-]+-hq\.mp3", html)))
    print(sid, title, "|", desc[:120], "|", lic[:1], "|", hq[:1])
    if hq:
        data = get(hq[0])
        # sanitize filename from title
        safe = re.sub(r"[^a-zA-Z0-9]+", "-", title).strip("-").lower() or sid
        path = os.path.join(RAW, f"{sid}-{safe}.mp3")
        open(path, "wb").write(data)
        print("  wrote", os.path.basename(path), len(data))
