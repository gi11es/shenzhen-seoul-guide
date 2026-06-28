#!/usr/bin/env python3
"""Apply the WGS-84 coordinate corrections from the 6 audit chunks."""
import json, pathlib
d = pathlib.Path(__file__).parent
FIX = {
 "sz-pick-peticano":(22.4845,113.9128),"sz-wooderful":(22.5404202,113.9705796),"sz-teppan-kyoku":(22.4743,113.9103),
 "sz-walk-sushi-kyoto":(22.4742,113.9104),"sz-fishing-lianghang":(22.6035098,113.8095821),
 "sz-kpfun":(22.530640,114.023620),"sz-gg-creative":(22.489735,113.912876),"sz-24histories-academy":(22.664026,114.095382),
 "sz-pick-17bread":(22.488129,113.910159),"sz-pick-crabxingji":(22.520623,113.933250),"sz-hk-k11ecoast":(22.474325,113.910248),
 "sz-hk-yewai":(22.520240,113.930262),"sz-disiyuansu":(22.525953,113.983003),"sz-lib-shufang":(22.539506,113.924645),
 "sz-pet-k11cat":(22.475312,113.907993),"sz-interactive-qingqing":(22.506818,113.895766),"sz-teppan-open":(22.481409,113.910357),
 "sz-walk-ramen-sumo":(22.474253,113.910370),"sz-clothesmkt-baima":(22.550380,114.115018),"sz-fishing-nanao":(22.533190,114.485396),
 "sz-pick-nanshan-museum":(22.5379,113.919),"sz-hk-innate":(22.4848,113.9128),"sz-nantou-makers":(22.5448,113.9181),
 "sz-lib-egret":(22.486,113.9471),"sz-gelato-creamstory":(22.4894,113.9133),"sz-walk-churrasco-latina":(22.4843,113.9128),
 "sz-fishing-7star":(22.5673,114.5336),
 "sz-xichong":(22.47933,114.52639),"sz-xinggaodu":(22.63427,114.06320),"sz-pick-mekong":(22.48503,113.92714),
 "sz-hk-houhaihui":(22.51934,113.93606),"sz-chess-pengcheng":(22.53924,113.91753),"sz-massage-lesbobos":(22.48462,113.91484),
 "sz-teppan-tairyo":(22.48714,113.91092),"sz-sichuan-yuyue":(22.48598,113.91295),"sz-xian-laowanhui":(22.48866,113.91113),
 "sz-toymkt-sungang":(22.56048,114.10369),
 "sz-dental":(22.4876,113.9204),"sz-pick-longbar":(22.5101,113.9379),"sz-pick-octloft":(22.5412,113.9886),
 "sz-hk-talentpark":(22.5137,113.9442),"sz-bell-nature":(22.4848,113.9125),"sz-chess-zhiteng":(22.5629,113.977),
 "sz-massage-lispa":(22.4806,113.921),"sz-pet-supaw":(22.5148,113.9207),"sz-sichuan-tanyu":(22.4859,113.913),
 "sz-xian-tanqinji":(22.4936,113.9221),"sz-cruise-gba1":(22.4719,113.9088),
 "sz-nantou-1820":(22.543447,113.914540),"sz-aqila-spa":(22.534545,113.917140),"gm-shuiwan1979":(22.492169,113.913973),
 "sz-batiaoyou-1":(22.511081,113.923290),"sz-hk-bollywood":(22.520190,113.933495),"sz-meland":(22.545000,113.951300),
 "sz-teppan-wangshunge":(22.485907,113.912967),"sz-clothesmkt-nanyou":(22.513558,113.918280),"sz-cruise-bridge":(22.471891,113.908843),
}
places = json.loads((d/'places.json').read_text(encoding='utf-8'))
m = {p['id']: p for p in places}
n = 0
for vid,(la,ln) in FIX.items():
    if vid in m:
        m[vid]['lat'] = la; m[vid]['lng'] = ln; n += 1
(d/'places.json').write_text(json.dumps(places, ensure_ascii=False, indent=1), encoding='utf-8')
print('coords corrected for', n, 'of', len(FIX))
