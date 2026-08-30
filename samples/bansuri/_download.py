import urllib.request, ssl, re, os

ctx = ssl.create_default_context()
RAW = os.path.join(os.path.dirname(__file__), "_raw")
OUT = os.path.dirname(__file__)
os.makedirs(RAW, exist_ok=True)

pages = {
    "lower-sa": "https://freesound.org/people/sankalp/sounds/179695/",
    "middle-sa": "https://freesound.org/people/sankalp/sounds/179696/",
    "rag-jog": "https://freesound.org/people/Ninad_P/sounds/448458/",
}

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, context=ctx, timeout=60).read()

for key, page in pages.items():
    html = get(page).decode("utf-8", "replace")
    lic = re.findall(r"creativecommons.org/licenses/[^\s\"']+", html)
    lic2 = re.findall(r"CC[0-9A-Z\- ]{0,20}", html)
    print(key, "license urls", lic[:3], "cc hits", lic2[:5])
    hq = re.findall(r"https://cdn\.freesound\.org/previews/\d+/\d+_[^-]+-hq\.mp3", html)
    hq = list(dict.fromkeys(hq))
    print(" hq", hq)
    if hq:
        data = get(hq[0])
        path = os.path.join(RAW, key + ".mp3")
        open(path, "wb").write(data)
        print(" wrote", path, len(data))

# Also search sankalp for more bansuri
search = "https://freesound.org/search/?q=bansuri+sankalp&f=username%3Asankalp"
try:
    html = get(search).decode("utf-8", "replace")
    ids = re.findall(r"/people/sankalp/sounds/(\d+)/", html)
    print("sankalp search ids", list(dict.fromkeys(ids))[:20])
except Exception as e:
    print("search fail", e)
