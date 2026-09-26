"""Maakt packages/desktop/src/templates/nl-windgebieden.geojson: de windgebieden I, II en III
volgens de nationale bijlage bij NEN-EN 1991-1-4 (figuur NB.1):

  I   Markermeer, IJsselmeer, Waddenzee, Waddeneilanden en de provincie Noord-Holland ten
      noorden van de gemeenten Heemskerk, Uitgeest, Wormerland, Purmerend en Edam-Volendam
  II  het resterende deel van Noord-Holland (waartoe ook Zaanstad behoort), het vasteland van
      Groningen en Friesland, en de provincies Flevoland, Zuid-Holland en Zeeland
  III het resterende deel van Nederland

De grenzen zijn dus provinciegrenzen, behalve die tussen gebied I en II in Noord-Holland.
Die volgt de noordgrens van de vijf genoemde gemeenten; tussen Uitgeest en Wormerland, die
elkaar niet raken, is dat de noordgrens van Zaanstad.

Bronnen:
- nl-provincies.geojson (naast dit script): CBS-provinciegrenzen via PDOK, alleen land.
- de CBS-gemeentegrenzen van 2015 via PDOK, met Beemster en Zeevang nog als eigen gemeente,
  zoals in de tijd dat de bijlage de grens vastlegde. Het script haalt ze zelf op en bewaart
  ze in de tijdelijke map.

De meren en de Waddenzee zijn met de hand getekend, ruim over de kust heen, en daarna met
het land weggeknipt: ze sluiten zo precies op de kustlijn aan.

Vereist Python 3 met shapely 2.  Draaien:  python scripts/windgebieden/genereer.py
"""
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

from shapely.geometry import shape, mapping, Polygon
from shapely.ops import unary_union

sys.stdout.reconfigure(encoding="utf-8")

HIER = Path(__file__).resolve().parent
UIT = HIER.parents[1] / "packages" / "desktop" / "src" / "templates" / "nl-windgebieden.geojson"
GEMEENTEN_URL = (
    "https://service.pdok.nl/cbs/gebiedsindelingen/2015/wfs/v1_0?service=WFS&version=2.0.0"
    "&request=GetFeature&typeNames=gebiedsindelingen:gemeente_gegeneraliseerd"
    "&outputFormat=application/json&srsName=EPSG:4326"
    "&bbox=52.20,4.45,53.20,5.35,urn:ogc:def:crs:EPSG::4326"
)
GEMEENTEN_CACHE = Path(tempfile.gettempdir()) / "cbs-gemeenten-2015-noord-holland.geojson"


def laad_gemeenten():
    if not GEMEENTEN_CACHE.exists():
        with urllib.request.urlopen(GEMEENTEN_URL, timeout=60) as antwoord:
            GEMEENTEN_CACHE.write_bytes(antwoord.read())
    return json.loads(GEMEENTEN_CACHE.read_text(encoding="utf-8"))


prov = {f["properties"]["statnaam"]: shape(f["geometry"])
        for f in json.loads((HIER / "nl-provincies.geojson").read_text(encoding="utf-8"))["features"]}
gem = {f["properties"]["statnaam"]: shape(f["geometry"]).buffer(0)
       for f in laad_gemeenten()["features"]}

NH = prov["Noord-Holland"]
GRENS = {"Heemskerk", "Uitgeest", "Wormerland", "Purmerend", "Edam-Volendam"}
KETEN = GRENS | {"Zaanstad"}

# Noord-Hollandse gemeenten: het representatieve punt ligt in de provincie (land).
nh_gem = {n: s for n, s in gem.items() if NH.buffer(0.01).contains(s.representative_point())}
# Texel ligt los van het vasteland; als Waddeneiland hoort het sowieso bij gebied I.
nh_gem.setdefault("Texel", gem["Texel"])

# Vanaf Den Helder over gedeelde grenzen, zonder de grensketen over te steken.
noord, rand = {"Den Helder"}, ["Den Helder"]
while rand:
    huidig = rand.pop()
    for n, s in nh_gem.items():
        if n in noord or n in KETEN:
            continue
        if s.buffer(0.0008).intersects(nh_gem[huidig]):
            noord.add(n)
            rand.append(n)
noord.add("Texel")
print("gebied I in Noord-Holland:", ", ".join(sorted(noord)))
print("gebied II in Noord-Holland:", ", ".join(sorted(set(nh_gem) - noord)))

def delen(geom):
    return list(geom.geoms) if hasattr(geom, "geoms") else [geom]


# Het noordelijke deel, geknipt op de (land)provincie, zodat het naadloos op de rest aansluit.
# Provincie- en gemeentegrenzen zijn verschillend vereenvoudigd: langs de kust blijven na het
# knippen snippers over. Elke snipper gaat naar de kant waar hij het dichtst bij ligt, anders
# ligt er gebied II op de dijk bij Den Oever.
noord_gem = unary_union([nh_gem[n] for n in noord])
zuid_gem = unary_union([nh_gem[n] for n in set(nh_gem) - noord])
nh_noord = noord_gem.buffer(0.0005).intersection(NH)
rest = NH.difference(nh_noord)
naar_noord = [p for p in delen(rest) if p.distance(noord_gem) < p.distance(zuid_gem)]
nh_noord = unary_union([nh_noord, *naar_noord])
nh_zuid = unary_union([p for p in delen(rest) if p.distance(noord_gem) >= p.distance(zuid_gem)])
print("snippers langs de noordkust naar gebied I:", len(naar_noord))


def eilanden_en_vasteland(geom):
    """Het grootste deel is het vasteland; de losse delen ten noorden ervan de eilanden."""
    stukken = sorted(delen(geom), key=lambda p: p.area, reverse=True)
    return stukken[0], [p for p in stukken[1:] if p.centroid.y > 53.2]


fr_vast, fr_eil = eilanden_en_vasteland(prov["Fryslân"])
gr_vast, gr_eil = eilanden_en_vasteland(prov["Groningen"])
print("Waddeneilanden: Fryslân", len(fr_eil), "· Groningen", len(gr_eil), "· Noord-Holland 1")

land = unary_union(list(prov.values()))
meren = Polygon([
    (4.93, 52.95), (5.10, 53.02), (5.30, 53.10), (5.42, 53.12), (5.47, 53.02), (5.45, 52.93),
    (5.40, 52.86), (5.62, 52.87), (5.78, 52.85), (5.70, 52.72), (5.665, 52.64), (5.635, 52.605),
    (5.60, 52.52), (5.48, 52.49), (5.36, 52.43), (5.22, 52.37), (5.08, 52.33), (4.98, 52.36),
    (4.99, 52.43), (4.99, 52.49), (4.99, 52.62), (5.03, 52.67), (5.20, 52.73), (5.08, 52.78),
    (5.04, 52.86), (4.93, 52.95),
]).difference(land)
wadden = Polygon([
    (4.72, 53.00), (4.78, 53.14), (4.96, 53.22), (5.05, 53.30), (5.20, 53.38), (5.45, 53.42),
    (5.70, 53.45), (5.95, 53.47), (6.20, 53.49), (6.50, 53.52), (6.85, 53.50), (7.05, 53.40),
    (7.20, 53.30), (7.00, 53.30), (6.85, 53.40), (6.60, 53.40), (6.35, 53.42), (6.10, 53.40),
    (5.85, 53.38), (5.60, 53.30), (5.45, 53.20), (5.38, 53.10), (5.20, 53.00), (5.05, 52.90),
    (4.85, 52.88), (4.70, 52.96), (4.72, 53.00),
]).difference(land).difference(meren)

kenmerken = []


def voeg_toe(geom, gebied, naam, soort="land"):
    geom = geom.simplify(0.0003, preserve_topology=True)
    # Snippers die bij het knippen overblijven, tellen niet mee.
    geom = unary_union([p for p in delen(geom) if p.area > 1e-6])
    if geom.is_empty:
        return
    kenmerken.append({"type": "Feature", "properties": {"gebied": gebied, "naam": naam, "soort": soort},
                      "geometry": mapping(geom)})


voeg_toe(nh_noord, 1, "Noord-Holland, ten noorden van de grensgemeenten")
for p in fr_eil:
    voeg_toe(p, 1, "Waddeneiland (Fryslân)")
for p in gr_eil:
    voeg_toe(p, 1, "Waddeneiland (Groningen)")
voeg_toe(nh_zuid, 2, "Noord-Holland, zuidelijk deel")
voeg_toe(fr_vast, 2, "Fryslân, vasteland")
voeg_toe(gr_vast, 2, "Groningen, vasteland")
for n in ("Flevoland", "Zuid-Holland", "Zeeland"):
    voeg_toe(prov[n], 2, n)
for n in ("Drenthe", "Overijssel", "Gelderland", "Utrecht", "Noord-Brabant", "Limburg"):
    voeg_toe(prov[n], 3, n)
voeg_toe(meren, 1, "IJsselmeer en Markermeer", "water")
voeg_toe(wadden, 1, "Waddenzee", "water")


def afronden(obj):
    if isinstance(obj, float):
        return round(obj, 5)
    if isinstance(obj, (list, tuple)):
        return [afronden(o) for o in obj]
    if isinstance(obj, dict):
        return {k: afronden(v) for k, v in obj.items()}
    return obj


tekst = json.dumps({"type": "FeatureCollection", "features": afronden(kenmerken)},
                   ensure_ascii=False, separators=(",", ":"))
UIT.write_text(tekst, encoding="utf-8", newline="")
print(f"{UIT.name}: {len(tekst) // 1000} kB, {len(kenmerken)} vlakken")
