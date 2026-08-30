import urllib.request, ssl, re, json

ctx = ssl.create_default_context()
urls = [
    "https://freesound.org/people/sankalp/sounds/179695/",
    "https://freesound.org/people/sankalp/sounds/179696/",
    "https://freesound.org/people/Ninad_P/sounds/448458/",
    "https://www.musical-artifacts.com/artifacts/7557",
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, context=ctx, timeout=30).read().decode("utf-8", "replace")
        previews = re.findall(r"https://[^\s\"']+previews[^\s\"']+\.(?:mp3|ogg)", html)
        # also media.freesound.org
        media = re.findall(r"https://[^\s\"']*freesound[^\s\"']*\.(?:mp3|ogg|wav)", html)
        print("URL", url)
        print(" previews", list(dict.fromkeys(previews))[:8])
        print(" media", list(dict.fromkeys(media))[:8])
        print(" has download", "download" in html.lower())
        # musical artifacts download button
        dl = re.findall(r'href="([^"]*download[^"]*)"', html)
        print(" dl hrefs", dl[:8])
    except Exception as e:
        print("FAIL", url, e)
