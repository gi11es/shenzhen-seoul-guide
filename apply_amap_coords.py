#!/usr/bin/env python3
"""From-scratch coordinate re-derivation.
SZ results are raw Amap GCJ-02 -> convert to WGS-84 for the OSM map.
HK/Seoul results are native WGS-84 -> store as-is."""
import json, math, pathlib
d = pathlib.Path(__file__).parent
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
def gcj2wgs(lat, lng):                     # iterative inverse (~cm accuracy)
    wlat, wlng = lat, lng
    for _ in range(4):
        glat, glng = wgs2gcj(wlat, wlng)
        wlat += lat - glat
        wlng += lng - glng
    return wlat, wlng

places = json.loads((d/'places.json').read_text(encoding='utf-8'))
city = {p['id']: p['city'] for p in places}
m = {p['id']: p for p in places}
results = {}
for f in sorted((d/'coord_results').glob('*.json')):
    results.update(json.loads(f.read_text(encoding='utf-8')))

applied = conv = 0
big = []
for vid, c in results.items():
    if vid not in m: continue
    la, ln = c['lat'], c['lng']
    if city[vid] == 'SZ':
        la, ln = gcj2wgs(la, ln); conv += 1
    old = (m[vid]['lat'], m[vid]['lng'])
    m[vid]['lat'] = round(la, 6); m[vid]['lng'] = round(ln, 6)
    dist = math.hypot((old[0]-la)*111000, (old[1]-ln)*102000)  # rough meters
    if dist > 250: big.append((vid, round(dist)))
    applied += 1
(d/'places.json').write_text(json.dumps(places, ensure_ascii=False, indent=1), encoding='utf-8')
missing = [p['id'] for p in places if p['id'] not in results and p['city'] in ('SZ','HK','SEOUL')]
print(f'applied {applied} ({conv} SZ gcj->wgs) | moved >250m: {len(big)}')
print('not re-derived (kept old):', missing)
