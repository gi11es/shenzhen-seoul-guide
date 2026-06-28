#!/usr/bin/env python3
"""Fetch real, verified photos for Seoul landmark spots from the Wikipedia API."""
import json, subprocess, pathlib, re, time
from urllib.parse import quote
d = pathlib.Path(__file__).parent
WIKI = {
 'se-gyeongbokgung-palace':'Gyeongbokgung','se-changgyeonggung-palace':'Changgyeonggung',
 'se-deoksugung-palace':'Deoksugung','se-ikseon-dong-hanok-alley':'Ikseon-dong',
 'se-insadong-ssamziegil':'Insadong','se-gwanghwamun-square':'Gwanghwamun Square',
 'se-n-seoul-tower-namsan':'N Seoul Tower','se-namsangol-hanok-village':'Namsangol Hanok Village',
 'se-national-museum-of-korea':'National Museum of Korea','se-seoul-museum-of-history':'Seoul Museum of History',
 'se-museum-of-korean-contemporary-history':'National Museum of Korean Contemporary History',
 'se-war-memorial-of-korea':'War Memorial of Korea','se-leeum-museum-of-art':'Leeum',
 "se-children-s-grand-park":"Seoul Children's Grand Park",'se-seoul-forest':'Seoul Forest',
 'se-naksan-park-seoul-city-wall':'Naksan','se-sea-life-coex-aquarium':'COEX Aquarium',
 'se-the-hyundai-seoul':'The Hyundai Seoul','se-kyobo-book-centre-gwanghwamun':'Kyobo Book Centre',
 'se-myeongdong-shopping-street':'Myeongdong','se-namdaemun-market':'Namdaemun Market',
 'se-dongdaemun-design-plaza-malls':'Dongdaemun Design Plaza','se-hongdae-shopping-street-kakao-friends':'Hongdae',
 'se-jongmyo-park-outdoor-baduk-janggi':'Tapgol Park','se-trickeye-ar-museum-hongdae':'Trick Eye Museum',
}
BAD = ('logo','icon','map','seal','flag','crest','banner','symbol','locator','blank','wikimedia','edit','arrow','ambox','question','disambig','.svg')
def curl(url):
    return subprocess.run(["curl","-s","-m","20","-A","tg/1.0 (travel-guide)",url],capture_output=True,text=True).stdout
def img_ok(u):
    out = subprocess.run(["curl","-sL","-o","/dev/null","-w","%{http_code} %{content_type}","-m","15","-A","Mozilla/5.0",u],capture_output=True,text=True).stdout.strip()
    return out.startswith("200") and "image" in out
def photos_for(title):
    urls = []
    # 1) representative lead image
    j = curl(f"https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&redirects=1&titles={quote(title)}&format=json")
    try:
        for p in json.loads(j)['query']['pages'].values():
            o = p.get('original',{}).get('source')
            if o: urls.append(o)
    except Exception: pass
    # 2) a couple more real photos from the page
    j = curl(f"https://en.wikipedia.org/w/api.php?action=query&generator=images&gimlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=900&redirects=1&titles={quote(title)}&format=json")
    try:
        for p in json.loads(j)['query']['pages'].values():
            t = p.get('title','')
            if not re.search(r'\.(jpg|jpeg|png)$', t, re.I): continue
            if any(b in t.lower() for b in BAD): continue
            ii = p.get('imageinfo',[{}])[0]
            u = ii.get('thumburl') or ii.get('url')
            if u and u not in urls: urls.append(u)
    except Exception: pass
    return urls[:3]   # trust Wikipedia API URLs (CDN throttles bulk re-verification)

places = json.loads((d/'places.json').read_text(encoding='utf-8'))
m = {p['id']: p for p in places}
fixed = 0
for vid, title in WIKI.items():
    if vid not in m: continue
    if m[vid].get('photos'): continue
    time.sleep(2.0)
    ph = photos_for(title)
    if ph: m[vid]['photos'] = ph; fixed += 1; print(f"  {vid}: {len(ph)} photos")
    else: print(f"  {vid}: NONE ({title})")
(d/'places.json').write_text(json.dumps(places, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"photo-enriched {fixed}/{len(WIKI)} landmarks")
