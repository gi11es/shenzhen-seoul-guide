#!/usr/bin/env python3
"""Inline Leaflet + config + places.json (+ enrich.json overlay) + events.json into one self-contained index.html."""
import pathlib, json, math
from urllib.parse import quote
d = pathlib.Path(__file__).parent

# --- WGS-84 -> GCJ-02 (China datum used by Apple/Amap). Mainland only; HK/Macau/overseas stay WGS-84. ---
_A, _EE = 6378245.0, 0.00669342162296594323
def _tlat(x, y):
    r = -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    r += (20.0*math.sin(6.0*x*math.pi) + 20.0*math.sin(2.0*x*math.pi)) * 2.0/3.0
    r += (20.0*math.sin(y*math.pi) + 40.0*math.sin(y/3.0*math.pi)) * 2.0/3.0
    r += (160.0*math.sin(y/12.0*math.pi) + 320.0*math.sin(y*math.pi/30.0)) * 2.0/3.0
    return r
def _tlng(x, y):
    r = 300.0 + x + 2.0*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    r += (20.0*math.sin(6.0*x*math.pi) + 20.0*math.sin(2.0*x*math.pi)) * 2.0/3.0
    r += (20.0*math.sin(x*math.pi) + 40.0*math.sin(x/3.0*math.pi)) * 2.0/3.0
    r += (150.0*math.sin(x/12.0*math.pi) + 300.0*math.sin(x/30.0*math.pi)) * 2.0/3.0
    return r
def wgs2gcj(lat, lng):
    dlat, dlng = _tlat(lng-105.0, lat-35.0), _tlng(lng-105.0, lat-35.0)
    radlat = lat/180.0*math.pi
    magic = 1 - _EE*math.sin(radlat)**2
    sm = math.sqrt(magic)
    dlat = (dlat*180.0) / ((_A*(1-_EE))/(magic*sm)*math.pi)
    dlng = (dlng*180.0) / (_A/sm*math.cos(radlat)*math.pi)
    return lat+dlat, lng+dlng
def read(p): return (d / p).read_text(encoding='utf-8')
def readj(p, default):
    fp = d / p
    return json.loads(fp.read_text(encoding='utf-8')) if fp.exists() else default

def clean(x):
    """Strip em-dashes (user preference) and decode stray HTML entities in all strings."""
    if isinstance(x, str):
        return x.replace('—', ', ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    if isinstance(x, list): return [clean(i) for i in x]
    if isinstance(x, dict): return {k: clean(v) for k, v in x.items()}
    return x

places = readj('places.json', [])
enrich = readj('enrich.json', {})           # optional overlay: { id: {photos, phone, wechat} }
for p in places:
    e = enrich.get(p['id'])
    if not e: continue
    if 'photos' in e: p['photos'] = e['photos']   # enrich overrides (corrections, drops)
    if e.get('phone')   and not p.get('phone'):   p['phone']   = e['phone']
    if e.get('wechat')  and not p.get('wechat'):  p['wechat']  = e['wechat']
    if e.get('commute') and not p.get('commute'): p['commute'] = e['commute']
    if e.get('hours')   and not p.get('hours'):   p['hours']   = e['hours']
    if e.get('video')   and not p.get('video'):   p['video']   = e['video']
    if e.get('price') is not None and p.get('price') is None: p['price'] = e['price']
events = readj('events.json', [])           # optional: list of dated events

places, events = clean(places), clean(events)
for p in places:                                 # Apple Maps link, GCJ-02 for mainland pins
    glat, glng = (wgs2gcj(p['lat'], p['lng']) if p['city'] == 'SZ' else (p['lat'], p['lng']))
    p['maplink'] = f"https://maps.apple.com/?ll={glat:.6f},{glng:.6f}&q={quote(p['name'])}"
data_extra = ('const LOCATIONS = ' + json.dumps(places, ensure_ascii=False) + ';\n'
              'const EVENTS = '    + json.dumps(events, ensure_ascii=False) + ';')

html = read('index.template.html')
slots = {
    '/*__LEAFLET_CSS__*/': read('vendor/leaflet.css'),
    '/*__APP_CSS__*/':     read('app.css'),
    '/*__LEAFLET_JS__*/':  read('vendor/leaflet.js'),
    '/*__DATA_JS__*/':     read('data.js') + '\n' + data_extra,
    '/*__APP_JS__*/':      read('app.js'),
}
for k, v in slots.items():
    html = html.replace(k, v)
out = d / 'index.html'
out.write_text(html, encoding='utf-8')
by_city = {}
for p in places: by_city[p['city']] = by_city.get(p['city'], 0) + 1
missing = sum(1 for p in places if not p.get('photos'))
print(f'Wrote {out} ({out.stat().st_size//1024} KB) | {len(places)} places {by_city} | {len(events)} events | {missing} without photos')
