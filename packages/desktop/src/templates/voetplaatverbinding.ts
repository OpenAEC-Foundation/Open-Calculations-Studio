/**
 * Toetsing van een voetplaatverbinding (kolomvoet / base plate) volgens
 * EN 1993-1-8 §6.2.5 (effectieve-oppervlaktemethode / T-stuk) in combinatie
 * met EN 1992-1-1 §6.7 (geconcentreerde druk op beton) en EN 1992-4 / Tabel 3.4
 * voor de ankers (trek + afschuiving + interactie).
 *
 * Parametrisch zij- en bovenaanzicht. De ankerverdeling (6 layouts) stuurt
 * zowel de tekening als het aantal ankers / de inwendige hefboomsarm.
 *
 * Profielen: HEB 100–400, HEA 100–400, IPE 200–400.
 * Doorsnede-eigenschappen volgens de Europese profieltabellen (mm / mm²).
 */

export const voetplaatverbinding = `"Voetplaatverbinding — toetsing volgens EN 1993-1-8 + EN 1992

'<i>Toetsing van een kolomvoet (voetplaat met ankers op een betonblok) volgens
'de effectieve-oppervlaktemethode EN 1993-1-8 §6.2.5, met de geconcentreerde
'drukweerstand van het beton uit EN 1992-1-1 §6.7 en de ankertoetsing uit
'EN 1993-1-8 Tabel 3.4 / EN 1992-4. Alle invoer is parametrisch; de
'ankerverdeling stuurt de tekening én de mechanica.</i>

# 1. Kolom & staalsoort

@select profile "Staalprofiel kolom"
  HEB 100 = 1
  HEB 120 = 2
  HEB 140 = 3
  HEB 160 = 4
  HEB 180 = 5
  HEB 200 = 6
  HEB 220 = 7
  HEB 240 = 8
  HEB 260 = 9
  HEB 280 = 10
  HEB 300 = 11
  HEB 320 = 12
  HEB 340 = 13
  HEB 360 = 14
  HEB 400 = 15
  HEA 100 = 16
  HEA 120 = 17
  HEA 140 = 18
  HEA 160 = 19
  HEA 180 = 20
  HEA 200 = 21
  HEA 220 = 22
  HEA 240 = 23
  HEA 260 = 24
  HEA 280 = 25
  HEA 300 = 26
  HEA 320 = 27
  HEA 340 = 28
  HEA 360 = 29
  HEA 400 = 30
  IPE 200 = 31
  IPE 220 = 32
  IPE 240 = 33
  IPE 270 = 34
  IPE 300 = 35
  IPE 330 = 36
  IPE 360 = 37
  IPE 400 = 38
@end

@select staalsoort "Staalsoort kolom + voetplaat"
  S235 = 235
  S275 = 275
  S355 = 355
@end

a_las = ?*(mm)', hoeklas a — keeldikte van de las kolom→voetplaat (mm)'

f_y = staalsoort N/mm^2', vloeigrens staal'
f_u = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490)) N/mm^2', treksterkte NEN-EN 1993-1-1:2025 tabel 3.1 (t ≤ 40 mm)'
β_w = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))', correlatiefactor las (Tabel 4.1)'
γ_M0 = 1.0
γ_M2 = 1.25', voor lassen + ankers (netto/breuk)'

#hide
'Profielmatrix — kolommen: 1:id  2:h(mm)  3:b(mm)  4:t_w(mm)  5:t_f(mm)  6:A(mm²)
profiles = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30; 31; 32; 33; 34; 35; 36; 37; 38 |100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 320; 340; 360; 400; 96; 114; 133; 152; 171; 190; 210; 230; 250; 270; 290; 310; 330; 350; 390; 200; 220; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 100; 110; 120; 135; 150; 160; 170; 180 |6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 10.5; 11; 11.5; 12; 12.5; 13.5; 5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8; 8.5; 9; 9.5; 10; 11; 5.6; 5.9; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |10; 11; 12; 13; 14; 15; 16; 17; 17.5; 18; 19; 20.5; 21.5; 22.5; 24; 8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 13; 14; 15.5; 16.5; 17.5; 19; 8.5; 9.2; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |2600; 3400; 4300; 5430; 6530; 7810; 9100; 10600; 11840; 13140; 14910; 16130; 17090; 18060; 19780; 2120; 2530; 3140; 3880; 4530; 5380; 6430; 7680; 8680; 9730; 11300; 12400; 13300; 14300; 15900; 2850; 3340; 3910; 4590; 5380; 6260; 7270; 8450]

h = hlookup(profiles; profile; 1; 2)*mm
b_kolom = hlookup(profiles; profile; 1; 3)*mm
t_w = hlookup(profiles; profile; 1; 4)*mm
t_f = hlookup(profiles; profile; 1; 5)*mm
A_kolom = hlookup(profiles; profile; 1; 6)*mm^2
#show

'<h6>Gekozen profieleigenschappen</h6>
h
b_kolom
t_w
t_f
A_kolom

# 2. Voetplaat & ankerverdeling

@select layout "Ankerverdeling"
  Plaat = profiel, 2 ankers = 1
  Plaat = profiel, 4 ankers = 2
  Plaat > profiel, 4 ankers = 3
  Plaat > profiel, 6 ankers (eerlijk verdeeld) = 4
  6 ankers — meer dichtheid links = 5
  Plaat > profiel, 6 ankers — meer dichtheid rechts = 6
@end

t_p = ?*(mm)', dikte voetplaat (mm)'
c_rand = ?*(mm)', overstek voetplaat voorbij profiel, per zijde (mm)'
d_extra = ?*(mm)', extra plaatlengte bij "plaat > profiel" (mm) — anders 0'
a_anker = ?*(mm)', hart anker tot plaatrand (mm)'

#hide
n_anker = if(layout ≡ 1; 2; if(layout ≡ 2; 4; if(layout ≡ 3; 4; 6)))
plaat_langer = if(layout ≡ 3; 1; if(layout ≡ 4; 1; if(layout ≡ 6; 1; 0)))
#show

'Aantal ankers in deze verdeling:
n_anker

b_p = b_kolom + 2*c_rand', breedte voetplaat (loodrecht op kolom-h)'
d_p = h + 2*c_rand + plaat_langer*d_extra', lengte voetplaat (langs kolom-h)'

b_p
d_p

# 3. Ankers

@select ankertype "Type anker"
  Ankerbout (ingegoten) = 1
  Hamerkopbout = 2
  Chemisch anker = 3
  Mechanisch anker = 4
@end

@select Manker "Ankermaat (M)"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
  M27 = 27
  M30 = 30
  M36 = 36
@end

@select ankerklasse "Sterkteklasse anker"
  4.6 = 46
  5.6 = 56
  8.8 = 88
  10.9 = 109
@end

@select gatspeling "Normale gatspeling"
  Ja (normale gaten) = 1
  Nee (overmaat) = 0
@end

@select wrijving "Wrijvingsweerstand meenemen"
  Ja = 1
  Nee = 0
@end

@select verankerbasis "Verankeringslengte baseren op"
  Vloeigrens = 1
  Trekspanning = 2
@end

n_v = ?', aantal bouten belast op afschuiving'

#hide
d_anker = Manker*mm', nominale ankerdiameter'
A_s = if(Manker ≡ 12; 84.3; if(Manker ≡ 16; 157; if(Manker ≡ 20; 245; if(Manker ≡ 24; 353; if(Manker ≡ 27; 459; if(Manker ≡ 30; 561; 817))))))*mm^2
f_yb = if(ankerklasse ≡ 46; 240; if(ankerklasse ≡ 56; 300; if(ankerklasse ≡ 88; 640; 900))) N/mm^2
f_ub = if(ankerklasse ≡ 46; 400; if(ankerklasse ≡ 56; 500; if(ankerklasse ≡ 88; 800; 1000))) N/mm^2
β_gat = if(gatspeling ≡ 1; 1.0; 0.7)', reductie afschuiving bij overmaat gaten'
#show

'Spanningsoppervlak en sterktes van het gekozen anker:
A_s
f_yb
f_ub

# 4. Beton & fundering

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
@end

@select betonstaal "Betonstaalsoort"
  B500A = 500
  B500B = 500
@end

@select gescheurd "Gescheurd beton"
  Ja (gescheurd) = 1
  Nee (ongescheurd) = 0
@end

h_b = ?*(mm)', hoogte betonblok / fundering (mm)'
h_ef = ?*(mm)', effectieve verankeringsdiepte anker (mm)'
t_g = ?*(mm)', dikte ondersabeling / grout (mm)'
c_min = ?*(mm)', dekking betonstaal (mm)'

f_ck = betonklasse N/mm^2
α_cc = 1.0', NL Nationale Bijlage'
γ_c = 1.5
f_cd = α_cc*f_ck/γ_c', rekenwaarde druksterkte beton'
f_cd

# 5. Belasting

N_Ed = ?*(kN)', axiale rekenwaarde — drukkracht (+) op de kolomvoet (UGT)'
M_Ed = ?*(kN*m)', buigend moment op de kolomvoet (UGT)'
V_Ed = ?*(kN)', dwarskracht (afschuiving) op de kolomvoet (UGT)'

@select statisch "Constructie"
  Statisch bepaald = 1
  Statisch onbepaald = 2
@end

# 6. Schema — zijaanzicht

'<i>Zijaanzicht: stalen kolom op de voetplaat (dikte t<sub>p</sub>), op een
'grout-/sabellaag (t<sub>g</sub>), verankerd in het betonblok (hoogte h<sub>b</sub>)
'met ankers tot verankeringsdiepte h<sub>ef</sub>. De normaalkracht N drukt verticaal.</i>

#hide
fnd_x0 = 60
fnd_x1 = 420
fnd_y0 = 190
fnd_y1 = 330
grout_y0 = 178
plate_x0 = 110
plate_x1 = 370
plate_y0 = 160
plate_y1 = 178
col_x0 = 175
col_x1 = 305
col_y0 = 45
col_cx = (col_x0 + col_x1)/2
anc_xl = 150
anc_xr = 330
anc_yb = 300
#show
'<svg viewbox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" style="font-size:12px; width:100%; max-height:380px;">
'  <rect x="'fnd_x0'" y="'fnd_y0'" width="'fnd_x1 - fnd_x0'" height="'fnd_y1 - fnd_y0'" style="fill:#E5E7EB; stroke:#9CA3AF; stroke-width:1.5"/>
'  <rect x="'plate_x0'" y="'grout_y0'" width="'plate_x1 - plate_x0'" height="'plate_y0 - grout_y0'" style="fill:#D1D5DB; stroke:#9CA3AF; stroke-width:1"/>
'  <rect x="'plate_x0'" y="'plate_y0'" width="'plate_x1 - plate_x0'" height="'plate_y1 - plate_y0'" style="fill:#9CA3AF; stroke:#4B5563; stroke-width:1.5"/>
'  <rect x="'col_x0'" y="'col_y0'" width="'col_x1 - col_x0'" height="'plate_y0 - col_y0'" style="fill:#DBEAFE; stroke:#1E40AF; stroke-width:2"/>
'  <line x1="'col_cx'" y1="'col_y0'" x2="'col_cx'" y2="'plate_y0'" style="stroke:#1E40AF; stroke-width:2"/>
'  <line x1="'anc_xl'" y1="'plate_y0'" x2="'anc_xl'" y2="'anc_yb'" style="stroke:#525252; stroke-width:3"/>
'  <line x1="'anc_xr'" y1="'plate_y0'" x2="'anc_xr'" y2="'anc_yb'" style="stroke:#525252; stroke-width:3"/>
'  <path d="M 'anc_xl' 'anc_yb' q 0 12 14 12" style="fill:none; stroke:#525252; stroke-width:3"/>
'  <path d="M 'anc_xr' 'anc_yb' q 0 12 -14 12" style="fill:none; stroke:#525252; stroke-width:3"/>
'  <line x1="'col_cx'" y1="15" x2="'col_cx'" y2="'col_y0 - 4'" style="stroke:#DC2626; stroke-width:3"/>
'  <polygon points="'col_cx - 7','col_y0 - 14' 'col_cx + 7','col_y0 - 14' 'col_cx','col_y0 - 2'" style="fill:#DC2626"/>
'  <text x="'col_cx + 12'" y="28" style="fill:#DC2626; font-weight:700">N<tspan baseline-shift="sub">Ed</tspan> = 'N_Ed'</text>
'  <text x="'plate_x1 + 6'" y="'(grout_y0 + plate_y1)/2 + 4'" style="fill:#4B5563">t<tspan baseline-shift="sub">p</tspan> = 't_p'</text>
'  <text x="'plate_x1 + 6'" y="'(plate_y0 + fnd_y0)/2 + 4'" style="fill:#4B5563">t<tspan baseline-shift="sub">g</tspan> = 't_g'</text>
'  <line x1="'anc_xr + 26'" y1="'plate_y1'" x2="'anc_xr + 26'" y2="'anc_yb'" style="stroke:#16A34A; stroke-width:1"/>
'  <polygon points="'anc_xr + 22','plate_y1 + 4' 'anc_xr + 30','plate_y1 + 4' 'anc_xr + 26','plate_y1'" style="fill:#16A34A"/>
'  <polygon points="'anc_xr + 22','anc_yb - 4' 'anc_xr + 30','anc_yb - 4' 'anc_xr + 26','anc_yb'" style="fill:#16A34A"/>
'  <text x="'anc_xr + 32'" y="'(plate_y1 + anc_yb)/2'" style="fill:#16A34A; font-weight:600">h<tspan baseline-shift="sub">ef</tspan> = 'h_ef'</text>
'  <line x1="'fnd_x0 - 8'" y1="'fnd_y0'" x2="'fnd_x0 - 8'" y2="'fnd_y1'" style="stroke:#9CA3AF; stroke-width:1"/>
'  <text x="'fnd_x0 - 10'" y="'(fnd_y0 + fnd_y1)/2'" text-anchor="end" style="fill:#6B7280">h<tspan baseline-shift="sub">b</tspan> = 'h_b'</text>
'  <line x1="'plate_x0'" y1="'fnd_y1 + 14'" x2="'plate_x1'" y2="'fnd_y1 + 14'" style="stroke:#4B5563; stroke-width:1"/>
'  <text x="'(plate_x0 + plate_x1)/2'" y="'fnd_y1 + 28'" text-anchor="middle" style="fill:#4B5563">d<tspan baseline-shift="sub">p</tspan> = 'd_p'</text>
'</svg>'

# 7. Schema — bovenaanzicht (ankerverdeling)

'<i>Bovenaanzicht: voetplaat (grijs), kolomprofiel als blauwe H, ankers als
'cirkels. De positie en het aantal volgen de gekozen ankerverdeling.</i>

#hide
cx = 240
cy = 180
hw = 78
hh = 64
fx0 = cx - hw
fx1 = cx + hw
fy0 = cy - hh
fy1 = cy + hh
ftf = 13', flensdikte in pixels
fweb = 7', halve webdikte in pixels
pw = if(plaat_langer ≡ 1; 150; 102)
ph = 92
px0 = cx - pw
px1 = cx + pw
py0 = cy - ph
py1 = cy + ph
ai = 16
axL = px0 + ai
axR = px1 - ai
ayT = py0 + ai
ayB = py1 - ai
axL2 = px0 + ai + 50
axR2 = px1 - ai - 50
#show
'<svg viewbox="0 0 480 370" xmlns="http://www.w3.org/2000/svg" style="font-size:12px; width:100%; max-height:380px;">
'  <rect x="'px0'" y="'py0'" width="'px1 - px0'" height="'py1 - py0'" style="fill:#F3F4F6; stroke:#6B7280; stroke-width:1.5"/>
'  <rect x="'fx0'" y="'fy0'" width="'ftf'" height="'fy1 - fy0'" style="fill:#BFDBFE; stroke:#1E40AF; stroke-width:1.5"/>
'  <rect x="'fx1 - ftf'" y="'fy0'" width="'ftf'" height="'fy1 - fy0'" style="fill:#BFDBFE; stroke:#1E40AF; stroke-width:1.5"/>
'  <rect x="'fx0'" y="'cy - fweb'" width="'fx1 - fx0'" height="'2*fweb'" style="fill:#BFDBFE; stroke:#1E40AF; stroke-width:1.5"/>
#if layout ≡ 1
'  <circle cx="'cx'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'cx'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
#if layout ≡ 2
'  <circle cx="'axL'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
#if layout ≡ 3
'  <circle cx="'axL'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
#if layout ≡ 4
'  <circle cx="'axL'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'cx'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'cx'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
#if layout ≡ 5
'  <circle cx="'axL'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL2'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL2'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
#if layout ≡ 6
'  <circle cx="'axL'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR2'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayT'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axL'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR2'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
'  <circle cx="'axR'" cy="'ayB'" r="7" style="fill:#fff; stroke:#525252; stroke-width:2"/>
#end if
'  <line x1="'px1 + 14'" y1="'py0'" x2="'px1 + 14'" y2="'py1'" style="stroke:#16A34A; stroke-width:1"/>
'  <text x="'px1 + 18'" y="'cy'" style="fill:#16A34A; font-weight:600">b<tspan baseline-shift="sub">p</tspan> = 'b_p'</text>
'  <line x1="'px0'" y1="'py1 + 16'" x2="'px1'" y2="'py1 + 16'" style="stroke:#16A34A; stroke-width:1"/>
'  <text x="'cx'" y="'py1 + 30'" text-anchor="middle" style="fill:#16A34A; font-weight:600">d<tspan baseline-shift="sub">p</tspan> = 'd_p'</text>
'  <text x="'cx'" y="'fy0 - 8'" text-anchor="middle" style="fill:#1E40AF; font-size:11px">profiel h × b</text>
'</svg>'

# 8. Drukweerstand beton — EN 1993-1-8 §6.2.5 + EN 1992-1-1 §6.7

'<i>Centrische drukverbinding. Het belaste oppervlak A<sub>c0</sub> (voetplaat) mag
'de verhoogde betondruk f<sub>jd</sub> opnemen dankzij spreiding in het betonblok.
'De effectieve drukprent onder de flenzen + lijf wordt bepaald met de bijkomende
'stuikbreedte c (3-T-stukkenmethode).</i>

'<h6>8.1 Randcondities (druk-randeffect)</h6>
'h<sub>b</sub> = 'h_b' · 2·d<sub>p</sub> = '2*d_p' · 2·b<sub>p</sub> = '2*b_p'
#if h_b < 2*d_p
    'h<sub>b</sub> &lt; 2·d<sub>p</sub> → drukspreiding begrensd door randeffect (verwerkt in A<sub>c1</sub>).
#end if

'<h6>8.2 Druksterkte beton</h6>
A_c0 = b_p*d_p', belast oppervlak = voetplaat (A_c0 = b_1·d_1)'
b_2 = min(b_p + h_b; 3*b_p)', spreidingsbreedte (begrensd)'
d_2 = min(d_p + h_b; 3*d_p)', spreidingslengte (begrensd)'
A_c1 = b_2*d_2', spreidingsoppervlak'
k_j = min(3; sqrt(A_c1/A_c0))', concentratiefactor §6.7'
F_Rdu = A_c0*f_cd*k_j', geconcentreerde drukweerstand EN 1992-1-1 (6.63)'
f_jd = 2/3*F_Rdu/A_c0', rekenwaarde voegdruksterkte (β_j = 2/3)'

A_c0
A_c1
k_j
F_Rdu
f_jd

'<h6>8.3 Voorwaarde voegmateriaal (grout)</h6>
t_g,max = 0.2*min(b_p; d_p)
#if t_g ≤ t_g,max
    't<sub>g</sub> = 't_g' ≤ 0,2·min[b<sub>p</sub>; d<sub>p</sub>] = 't_g,max'<span style="color: green"> → OK</span>
#else
    't<sub>g</sub> = 't_g' > 0,2·min[b<sub>p</sub>; d<sub>p</sub>] = 't_g,max'<span style="color: red"> → grout te dik</span>
#end if
f_gr,k,min = 0.2*f_ck', minimale karakteristieke groutsterkte (≥ 0,2·f_ck)'
f_gr,k,min

'<h6>8.4 Bijkomende stuikbreedte</h6>
c = t_p*sqrt(f_y/(3*f_jd))', §6.2.5(4) — f_yd = f_y/γ_M0'
c

'<h6>8.5 Afmetingen drukprent (T-stukken)</h6>
c_p = (d_p - h)/2', plaatoverstek voorbij de flens, in de richting van d_p'
b_eff,f = t_f + c + min(c; c_p)', T-stuk 1 en 3 — naar buiten begrensd door het overstek c_p'
l_eff,f = min(b_kolom + 2*c; b_p)', lengte, begrensd door plaatbreedte'
A_pr,f = b_eff,f*l_eff,f', drukprent per flens'
b_eff,w = t_w + 2*c', breedte drukprent onder lijf (T-stuk 2)'
l_eff,w = max(0 mm; h - 2*t_f - 2*c)', lengte lijfstrook tussen de flenzen'
A_pr,w = b_eff,w*l_eff,w', drukprent lijf'
A_prent = 2*A_pr,f + A_pr,w', totale drukprent'
c_p
b_eff,f
l_eff,f
A_pr,f
A_pr,w
A_prent

N_Rd,c = f_jd*A_prent', drukweerstand kolomvoet'
N_Rd,c

#if N_Ed ≤ 0 kN
    'N<sub>Ed</sub> ≤ 0 → geen druk op het beton; drukweerstand niet maatgevend.
    UC_druk = 0
#else
    UC_druk = N_Ed/N_Rd,c
    #if UC_druk ≤ 1.0
        'UC<sub>druk</sub> = N<sub>Ed</sub>/N<sub>Rd,c</sub> = 'UC_druk'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
    #else
        'UC<sub>druk</sub> = N<sub>Ed</sub>/N<sub>Rd,c</sub> = 'UC_druk'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
    #end if
#end if

'<h6>8.6 Splijtwapening drukzijde</h6>
#if N_Ed ≤ 0 kN
    'Geen drukkracht → splijtwapening niet van toepassing.
#else
    σ_prent = N_Ed/A_prent', drukspanning op de drukprent'
    σ_c1 = N_Ed/A_c1', drukspanning op het spreidingsoppervlak'
    σ_prent
    σ_c1
    #if σ_prent ≤ f_cd
        #if σ_c1 ≤ f_gr,k,min
            '<span style="color: green">σ<sub>prent</sub> ≤ f<sub>cd</sub> en σ<sub>c1</sub> ≤ 0,2·f<sub>ck</sub> → geen splijtwapening nodig.</span>
        #else
            '<span style="color: red">σ<sub>c1</sub> > 0,2·f<sub>ck</sub> → splijtwapening nodig.</span>
        #end if
    #else
        '<span style="color: red">σ<sub>prent</sub> > f<sub>cd</sub> → splijtwapening nodig.</span>
    #end if
#end if

# 9. Voetplaatdikte (buiging overstek) — §6.2.5

'<i>Het overstek van de voetplaat werkt als uitkraging onder de voegdruk
'f<sub>jd</sub>. Vereiste plaatdikte uit de elastische randspanning.</i>

t_p,req = c_rand*sqrt(3*f_jd/f_y)', minimale plaatdikte uit overstek-buiging'
t_p,req

UC_plaat = t_p,req/t_p
#if UC_plaat ≤ 1.0
    'UC<sub>plaat</sub> = t<sub>p,req</sub>/t<sub>p</sub> = 'UC_plaat'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>plaat</sub> = t<sub>p,req</sub>/t<sub>p</sub> = 'UC_plaat'<span style="color: red"> > 1.0 → <b>plaat te dun</b></span>
#end if

# 10. Ankers op trek — EN 1993-1-8 Tabel 3.4

'<i>Een buigend moment kan trek in de ankers aan één zijde veroorzaken. De
'inwendige hefboomsarm z is de afstand tussen de uiterste ankerrijen.</i>

z = d_p - 2*a_anker', hefboomsarm ankergroep'
z
n_trek = if(n_anker ≡ 2; 1; 2)', aantal ankers aan de trekzijde'

F_t,totaal = max(0 kN; M_Ed/z - N_Ed/2)', trekkracht aan de getrokken zijde'
F_t,totaal
F_t,anker = F_t,totaal/n_trek', trek per anker'

F_t,Rd = 0.9*f_ub*A_s/γ_M2', trekweerstand anker (k_2 = 0.9)'
F_t,Rd

#if F_t,anker ≤ 0 kN
    'Geen trek in de ankers (drukkracht overheerst) → trektoets niet maatgevend.
    UC_trek = 0
#else
    UC_trek = F_t,anker/F_t,Rd
    #if UC_trek ≤ 1.0
        'UC<sub>trek</sub> = F<sub>t,anker</sub>/F<sub>t,Rd</sub> = 'UC_trek'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
    #else
        'UC<sub>trek</sub> = F<sub>t,anker</sub>/F<sub>t,Rd</sub> = 'UC_trek'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
    #end if
#end if

# 11. Ankers op afschuiving + wrijving — §6.2.2

'<i>De dwarskracht wordt eerst door wrijving onder de voetplaat opgenomen
'(C<sub>f,d</sub> = 0,20 voor zandcement-grout, EN 1993-1-8 §6.2.2(6)); de rest
'door de ankers die op afschuiving meedoen.</i>

C_fd = 0.20', wrijvingscoëfficiënt voetplaat/grout'
F_f,Rd = if(wrijving ≡ 1; C_fd*max(0 kN; N_Ed); 0 kN)', wrijvingsweerstand'
F_f,Rd

F_v,Rd1 = 0.6*β_gat*f_ub*A_s/γ_M2', afschuifweerstand per anker (α_v = 0,6)'
F_v,Rd1

V_Rd,tot = n_v*F_v,Rd1 + F_f,Rd', totale afschuifweerstand'
V_Rd,tot

#if V_Ed ≤ 0 kN
    'V<sub>Ed</sub> = 0 → afschuiving niet maatgevend.
    UC_afsch = 0
#else
    UC_afsch = V_Ed/V_Rd,tot
    #if UC_afsch ≤ 1.0
        'UC<sub>afsch</sub> = V<sub>Ed</sub>/V<sub>Rd,tot</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
    #else
        'UC<sub>afsch</sub> = V<sub>Ed</sub>/V<sub>Rd,tot</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
    #end if
#end if

# 12. Gecombineerd trek + afschuiving — Tabel 3.4

'<i>Interactie voor een anker dat tegelijk trek en afschuiving krijgt:
'F<sub>v</sub>/F<sub>v,Rd</sub> + F<sub>t</sub>/(1,4·F<sub>t,Rd</sub>) ≤ 1,0.</i>

#hide
Fv_per = if(n_v ≤ 0; 0 kN; V_Ed/max(1; n_v))
Ft_per = max(0 kN; F_t,anker)
#show
UC_combi = Fv_per/F_v,Rd1 + Ft_per/(1.4*F_t,Rd)
#if UC_combi ≤ 1.0
    'UC<sub>trek+afsch</sub> = 'UC_combi'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>trek+afsch</sub> = 'UC_combi'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 13. Hoeklassen flens en lijf — EN 1993-1-8 §4.5.2

'<i>Bepaling van de benodigde keeldikte (richtingsmethode). De maatgevende
'flenskracht F<sub>t,max,Ed</sub> volgt uit normaalkracht + moment; de keeldikte
'wordt per flens en lijf bepaald en met de gekozen lasdikte a vergeleken.</i>

F_t,max,Ed = abs(N_Ed)/2 + abs(M_Ed)/(h - t_f)', maatgevende flenskracht'
F_t,max,Ed
A_f = b_kolom*t_f', flensoppervlak'
A_w = (h - 2*t_f)*t_w', lijfoppervlak'
σ_Ed = F_t,max,Ed/A_f', normaalspanning in de flenslas (statisch bepaald)'
τ_w,Ed = abs(V_Ed)/A_w', schuifspanning in de lijflas (sterke as)'
σ_Ed
τ_w,Ed

a_f,req = sqrt(2*σ_Ed^2)*(t_f/2)*β_w*γ_M2/f_u', benodigde keel flens'
a_w,req = sqrt(2*σ_Ed^2 + 3*τ_w,Ed^2)*(t_w/2)*β_w*γ_M2/f_u', benodigde keel lijf'
a_req = max(3 mm; max(a_f,req; a_w,req))', incl. minimum keel 3 mm'
a_f,req
a_w,req
a_req

UC_las = a_req/a_las
#if UC_las ≤ 1.0
    'UC<sub>las</sub> = a<sub>req</sub>/a = 'UC_las'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>las</sub> = a<sub>req</sub>/a = 'UC_las'<span style="color: red"> > 1.0 → <b>las te klein</b></span>
#end if

# 14. Verankeringslengte anker — EN 1992-1-1 §8.4

'<i>Vereiste verankeringslengte om de ankerkracht via aanhechting in het beton
'over te dragen. Basis = vloeigrens of treksterkte van het anker.</i>

f_ctk = 0.7*0.3*(f_ck/(1 N/mm^2))^(2/3)*(1 N/mm^2)', f_ctk;0,05'
f_ctd = f_ctk/γ_c
η_1 = if(gescheurd ≡ 1; 0.7; 1.0)', aanhechtingscondities'
f_bd = 2.25*η_1*f_ctd', aanhechtspanning §8.4.2'
f_bd

σ_sd = if(verankerbasis ≡ 1; f_yb; f_ub)', te ontwikkelen spanning'
l_b,req = (d_anker/4)*(σ_sd/f_bd)', basisverankeringslengte §8.4.3 (rechte aanhechting)'
l_b,req

#if ankertype ≡ 3
    'Chemisch/aanhechtingsanker → verankering door aanhechting is maatgevend.
    UC_verank = l_b,req/h_ef
    #if UC_verank ≤ 1.0
        'UC<sub>verank</sub> = l<sub>b,req</sub>/h<sub>ef</sub> = 'UC_verank'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
    #else
        'UC<sub>verank</sub> = l<sub>b,req</sub>/h<sub>ef</sub> = 'UC_verank'<span style="color: red"> > 1.0 → <b>verankering te kort</b></span>
    #end if
#else
    'Ingegoten ankerbout / hamerkopbout / mechanisch anker → verankering via
    'ankerkop of expansie (kegelbreuk EN 1992-4), niet via rechte aanhechting.
    'De l<sub>b,req</sub> hierboven is alleen indicatief. <b>Toets de betonbreukmodi
    'volgens EN 1992-4 apart</b> (kegel-, splijt-, uittrek- en randbreuk).
    UC_verank = 0
#end if

# 15. Samenvatting unity checks

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Toets</th><th style="text-align:right">UC</th></tr>
'<tr><td style="padding:2px 12px 2px 0">Drukweerstand beton</td><td style="text-align:right">'UC_druk'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Voetplaatdikte</td><td style="text-align:right">'UC_plaat'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Ankers op trek</td><td style="text-align:right">'UC_trek'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Ankers op afschuiving</td><td style="text-align:right">'UC_afsch'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Trek + afschuiving</td><td style="text-align:right">'UC_combi'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Laskeel</td><td style="text-align:right">'UC_las'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Verankeringslengte</td><td style="text-align:right">'UC_verank'</td></tr>
'</table>

UC_max = max(UC_druk; UC_plaat; UC_trek; UC_afsch; UC_combi; UC_las; UC_verank)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>verbinding voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>verbinding voldoet NIET</b></span>
#end if

'<hr/>
'<i>Vereenvoudigingen en aandachtspunten:
'<ul>
'<li>Drukweerstand via de effectieve-oppervlaktemethode (§6.2.5); de
'spreidingsoppervlakte A<sub>c1</sub> is begrensd op 3·A<sub>c0</sub> en op
'A<sub>c0</sub> + h<sub>b</sub>-spreiding. Werkelijke randafstanden van het
'betonblok (randeffect) zijn niet getoetst — controleer h &lt; 2·d<sub>p</sub>.</li>
'<li>Ankertrek vereenvoudigd met een star plaatmodel (hefboomsarm z tussen de
'uiterste ankerrijen). Betonbreukmodi van EN 1992-4 (kegelbreuk, splijten,
'uittrekken, randbreuk) zijn <b>niet</b> opgenomen — bij trek/moment apart
'toetsen.</li>
'<li>Wrijvingsweerstand alleen meegenomen bij drukkracht (N<sub>Ed</sub> &gt; 0).</li>
'<li>Lascontrole vereenvoudigd (resultante trek + afschuiving op de totale
'lasomtrek) i.p.v. de volledige spanningscomponenten van §4.5.3.2.</li>
'<li>Tweede-orde-effecten, scheefstand en de stijfheid van de verbinding
'(§6.3) zijn niet beschouwd.</li>
'</ul></i>
`;
