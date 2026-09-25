/**
 * Verticaal windverband: de diagonaal van een stabiliteitsvak, als strip of
 * gelijkzijdig hoekprofiel, volgens NEN-EN 1993-1-1 en NEN-EN 1993-1-8 met de
 * Nederlandse nationale bijlagen.
 *
 * De horizontale kracht is de wind (karakteristiek, maal γ_Q bij de
 * gevolgklasse) plus de kracht uit de scheefstand van de gestabiliseerde
 * kolommen (5.3.2). Getoetst: trek op de bruto doorsnede (6.6) en op de netto
 * doorsnede bij de aansluiting — strip volgens (6.7), hoekprofiel aan één been
 * volgens EN 1993-1-8 (3.11) tot (3.13) —, bij een enkele diagonaal ook druk
 * volgens 6.3.1 met de effectieve slankheid van bijlage BB.1.2, en de
 * horizontale verplaatsing volgens de NB bij EN 1990 A1.4.3.
 *
 * Profielen: strippen (id 1–15) en gelijkzijdige hoekprofielen volgens
 * EN 10056-1 (id 16–30). Geen referentieberekening beschikbaar;
 * scripts/check-windverband.mjs rekent de uitkomsten onafhankelijk na.
 */

export const verticaalWindverband = `"Verticaal windverband — EN 1993-1-1 en EN 1993-1-8

'<i>De diagonaal van een stabiliteitsvak voert de horizontale kracht op het vak af naar de fundering. In een X-kruis werkt per windrichting alleen de getrokken diagonaal; de andere wordt slap. Een enkele diagonaal krijgt bij de ene windrichting trek en bij de andere druk. Getoetst worden trek op de bruto en de netto doorsnede, bij een enkele diagonaal ook knik, en de horizontale verplaatsing van het vak.</i>

# 1. Profiel en materiaal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select verbandtype "Werking van de diagonaal"
  X-kruis of tegengestelde diagonalen, alleen trek = 1
  Enkele diagonaal, trek en druk = 2
@end

@select profile "Profiel"
  Strip 30 × 5 = 1
  Strip 40 × 5 = 2
  Strip 50 × 5 = 3
  Strip 60 × 5 = 4
  Strip 60 × 8 = 5
  Strip 60 × 10 = 6
  Strip 80 × 6 = 7
  Strip 80 × 8 = 8
  Strip 80 × 10 = 9
  Strip 100 × 8 = 10
  Strip 100 × 10 = 11
  Strip 100 × 12 = 12
  Strip 120 × 10 = 13
  Strip 120 × 12 = 14
  Strip 150 × 12 = 15
  L 30 × 30 × 3 = 16
  L 40 × 40 × 4 = 17
  L 50 × 50 × 5 = 18
  L 50 × 50 × 6 = 19
  L 60 × 60 × 6 = 20
  L 60 × 60 × 8 = 21
  L 70 × 70 × 7 = 22
  L 80 × 80 × 8 = 23
  L 80 × 80 × 10 = 24
  L 90 × 90 × 9 = 25
  L 100 × 100 × 10 = 26
  L 100 × 100 × 12 = 27
  L 120 × 120 × 12 = 28
  L 150 × 150 × 12 = 29
  L 150 × 150 × 15 = 30
@end

@select staalkwaliteit "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

f_y = staalkwaliteit*N/mm^2', tabel 3.1, t ≤ 40 mm'
#hide
fu_tab = if(staalkwaliteit ≡ 235; 360; if(staalkwaliteit ≡ 275; 430; 490))
#show
f_u = fu_tab*N/mm^2', tabel 3.1'
E = 210000 N/mm^2
γ_M0 = 1.0
γ_M1 = 1.0
γ_M2 = 1.25', NB bij 6.1(1) en EN 1993-1-8 tabel 2.1'
ε = sqrt(235 N/mm^2/f_y)

#hide
'Profieltabel: id | soort (1 strip, 2 hoek) | b | t (mm) | A (cm²) | e (cm) | I_y | I_v (cm⁴)
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30 |1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2; 2 |30; 40; 50; 60; 60; 60; 80; 80; 80; 100; 100; 100; 120; 120; 150; 30; 40; 50; 50; 60; 60; 70; 80; 80; 90; 100; 100; 120; 150; 150 |5; 5; 5; 5; 8; 10; 6; 8; 10; 8; 10; 12; 10; 12; 12; 3; 4; 5; 6; 6; 8; 7; 8; 10; 9; 10; 12; 12; 12; 15 |1.5; 2; 2.5; 3; 4.8; 6; 4.8; 6.4; 8; 8; 10; 12; 12; 14.4; 18; 1.74; 3.08; 4.8; 5.69; 6.91; 9.03; 9.4; 12.3; 15.1; 15.5; 19.2; 22.7; 27.5; 34.8; 43 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0.835; 1.12; 1.4; 1.45; 1.69; 1.77; 1.97; 2.26; 2.34; 2.54; 2.82; 2.9; 3.4; 4.12; 4.25 |1.125; 2.66667; 5.20833; 9; 14.4; 18; 25.6; 34.1333; 42.6667; 66.6667; 83.3333; 100; 144; 172.8; 337.5; 1.4; 4.47; 11; 12.8; 22.8; 29.2; 42.3; 72.2; 87.5; 116; 177; 207; 368; 737; 898 |0.03125; 0.0416667; 0.0520833; 0.0625; 0.256; 0.5; 0.144; 0.341333; 0.666667; 0.426667; 0.833333; 1.44; 1; 1.728; 2.16; 0.583; 1.86; 4.54; 5.33; 9.43; 12.2; 17.6; 29.9; 36.4; 47.8; 73; 85.7; 152; 303; 370]
soort = hlookup(profielen; profile; 1; 2)
b_p = hlookup(profielen; profile; 1; 3)*mm
t_p = hlookup(profielen; profile; 1; 4)*mm
A = hlookup(profielen; profile; 1; 5)*cm^2
e_p = hlookup(profielen; profile; 1; 6)*cm
I_y = hlookup(profielen; profile; 1; 7)*cm^4
I_v = hlookup(profielen; profile; 1; 8)*cm^4
#show
#if soort ≡ 1
    'Strip: b = 'b_p' mm, t = 't_p' mm, A = 'A' cm².
#else
    'Gelijkzijdig hoekprofiel: b = 'b_p' mm, t = 't_p' mm, A = 'A' cm², e = 'e_p' cm, I<sub>y</sub> = I<sub>z</sub> = 'I_y' cm⁴, I<sub>v</sub> = 'I_v' cm⁴.
#end if

# 2. Geometrie

b_v = ?*(m)', breedte van het vak, hart op hart van de kolommen'
h_v = ?*(m)', hoogte van het vak'
L_d = sqrt(b_v^2 + h_v^2)', lengte van de diagonaal, van knoop tot knoop'
cos_α = b_v/L_d
sin_α = h_v/L_d
α = atan(h_v/b_v)*180/pi', hoek met de horizontaal, in graden'

# 3. Belasting

'<i>De windkracht is karakteristiek; de rekenwaarde volgt met γ<sub>Q</sub> bij de gevolgklasse uit de projectgegevens. Daarbij komt de kracht uit de scheefstand van de kolommen die dit verband stabiliseert: H = φ·V<sub>Ed</sub> met φ = φ<sub>0</sub>·α<sub>h</sub>·α<sub>m</sub> (5.5). Die mag vervallen als de horizontale rekenbelasting ten minste 0,15·V<sub>Ed</sub> is (5.3.2(4)B).</i>
F_w,k = ?*(kN)', karakteristieke windkracht op dit vak'
V_Ed = ?*(kN)', verticale rekenbelasting op de kolommen die dit verband stabiliseert'
m_k = ?', aantal kolommen dat die belasting draagt'
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))', tabel NB.4 of NB.5 van NEN-EN 1990'
F_w,Ed = γ_Q*F_w,k to kN
α_h = min(max(2/sqrt(h_v/(1 m)); 2/3); 1)', hoogte h in m (5.3.2(3))'
α_m = sqrt(0.5*(1 + 1/max(m_k; 1)))
φ = α_h*α_m/200', initiële scheefstand, φ_0 = 1/200'
#if F_w,Ed ≥ 0.15*V_Ed
    H_imp = 0 kN', mag vervallen: F_w,Ed ≥ 0,15·V_Ed'
#else
    H_imp = φ*V_Ed to kN', equivalente horizontale kracht uit de scheefstand'
#end if
F_h,Ed = F_w,Ed + H_imp to kN', horizontale rekenkracht op het vak'
N_Ed = F_h,Ed/cos_α to kN', normaalkracht in de werkende diagonaal'
F_v,Ed = N_Ed*sin_α to kN', verticale component op kolom en fundering'

# 4. Aansluiting

@select aansluiting "Aansluiting van de diagonaal"
  Gelast = 0
  Gebout, één bout = 1
  Gebout, twee bouten achter elkaar = 2
  Gebout, drie of meer bouten achter elkaar = 3
@end

#if aansluiting ≥ 1
    d_0 = ?*(mm)', gatdiameter'
    p_1 = ?*(mm)', steek van de bouten in de krachtrichting'
    e_2 = ?*(mm)', randafstand loodrecht op de kracht, in het aangesloten been of de strip'
    #if soort ≡ 1
        n_d = ?', aantal gaten naast elkaar in één doorsnede van de strip'
    #end if
#end if

# 5. Trek (§6.2.3 en EN 1993-1-8 §3.10.3)

N_pl,Rd = A*f_y/γ_M0 to kN', bruto doorsnede (6.6)'
#if aansluiting ≡ 0
    '<i>Gelast: de netto doorsnede speelt niet mee. Voor een gelijkzijdig hoekprofiel dat met één been is aangelast, is de effectieve doorsnede de bruto doorsnede (EN 1993-1-8 §4.13).</i>
    N_t,Rd = N_pl,Rd
#else if soort ≡ 1
    A_net = A - n_d*d_0*t_p to mm^2', netto doorsnede'
    N_u,Rd = 0.9*A_net*f_u/γ_M2 to kN', (6.7)'
    N_t,Rd = min(N_pl,Rd; N_u,Rd)
#else
    '<i>Een hoekprofiel dat met één been en één rij bouten is aangesloten, mag centrisch belast worden gerekend met een effectieve netto doorsnede (EN 1993-1-8 §3.10.3(2)); β volgt uit tabel 3.8, lineair tussen p<sub>1</sub> = 2,5·d<sub>0</sub> en 5,0·d<sub>0</sub>.</i>
    A_net = A - d_0*t_p to mm^2', netto doorsnede, één gat'
    #if aansluiting ≡ 1
        N_u,Rd = 2.0*(e_2 - 0.5*d_0)*t_p*f_u/γ_M2 to kN', (3.11), één bout'
    #else if aansluiting ≡ 2
        β_2 = 0.4 + 0.3*min(max((p_1/d_0 - 2.5)/2.5; 0); 1)', tabel 3.8'
        N_u,Rd = β_2*A_net*f_u/γ_M2 to kN', (3.12), twee bouten'
    #else
        β_3 = 0.5 + 0.2*min(max((p_1/d_0 - 2.5)/2.5; 0); 1)', tabel 3.8'
        N_u,Rd = β_3*A_net*f_u/γ_M2 to kN', (3.13), drie of meer bouten'
    #end if
    N_t,Rd = min(N_pl,Rd; N_u,Rd)
#end if
UC_t = N_Ed/N_t,Rd', trek'

# 6. Druk (§6.3.1 en bijlage BB.1.2)

#hide
ok_druk = 1
UC_c = 0
#show
#if verbandtype ≡ 1
    '<i>In een X-kruis of met tegengestelde diagonalen werkt een diagonaal alleen op trek: bij de andere windrichting neemt de andere diagonaal het over. Een druktoets is dan niet nodig; de gedrukte diagonaal mag slap worden.</i>
#else if soort ≡ 1
    #hide
    ok_druk = 0
    #show
    '<b style="color:#b91c1c">Een strip kan de druk bij omkerende wind niet opnemen. Kies een X-kruis of tegengestelde diagonalen, of een hoekprofiel.</b>
#else if aansluiting ≡ 1
    #hide
    ok_druk = 0
    #show
    '<b style="color:#b91c1c">Met één bout moet de excentriciteit van de aansluiting in de druktoets worden meegenomen (BB.1.2(2)); dat doet deze module niet. Sluit aan met ten minste twee bouten of met een las.</b>
#else
    '<i>Tabel 5.2, gelijkzijdig hoekprofiel: klasse 3 zolang b/t ≤ 11,5·ε. Met ten minste twee bouten of een las zijn de uiteinden voldoende ingeklemd om de excentriciteit te verwaarlozen; dan geldt de effectieve slankheid van (BB.1), met de lengte van knoop tot knoop. Kromme b voor hoekprofielen (tabel 6.2).</i>
    k_b = b_p/t_p/ε', b/t, uitgedrukt in ε'
    #if k_b > 11.5
        #hide
        ok_druk = 0
        #show
        '<b style="color:#b91c1c">b/t = 'k_b'·ε > 11,5·ε: het hoekprofiel valt onder druk in klasse 4; de effectieve doorsnede van NEN-EN 1993-1-5 zit niet in deze module. Kies een dikker profiel of een lagere staalsoort.</b>
    #else
        λ_1 = 93.9*ε
        i_v = sqrt(I_v/A) to mm', kleinste traagheidsstraal'
        i_y = sqrt(I_y/A) to mm', om een as evenwijdig aan een been'
        λ_v = L_d/(i_v*λ_1)
        λ_y = L_d/(i_y*λ_1)
        λ_eff = max(0.35 + 0.7*λ_v; 0.50 + 0.7*λ_y)', (BB.1), maatgevend van v-v en y-y'
        Φ = 0.5*(1 + 0.34*(λ_eff - 0.2) + λ_eff^2)
        χ = min(1; 1/(Φ + sqrt(Φ^2 - λ_eff^2)))
        N_b,Rd = χ*A*f_y/γ_M1 to kN
        UC_c = N_Ed/N_b,Rd', druk'
    #end if
#end if

# 7. Horizontale verplaatsing (BGT)

'<i>De verplaatsing van de bovenkant van het vak door de verlenging van de diagonaal onder de karakteristieke wind: u = F<sub>w,k</sub>·L<sub>d</sub>/(E·A·cos²α). De vervorming van kolommen en regels is niet meegenomen.</i>
u_h = F_w,k*L_d/(E*A*cos_α^2) to mm

@select grens_u "Toelaatbare horizontale verplaatsing (NB bij EN 1990, A1.4.3)"
  h/300 — per bouwlaag, of één bouwlaag = 300
  h/150 — industriegebouw met één bouwlaag = 150
  h/500 — over de hele hoogte van het gebouw = 500
@end

u_lim = h_v/grens_u to mm
UC_u = u_h/u_lim

# 8. Tekening

#hide
x0 = 90
x1 = 330
y0 = 60
y1 = 260
tx = 395
ty = 110
tw = 60
th = tw*h_v/b_v
tschaal = min(1; 120/th)
tw2 = tw*tschaal
th2 = th*tschaal
#show
'<svg viewbox="0 0 480 320" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:340px;">
'  <!-- het vak: kolommen en regels -->
'  <line x1="'x0'" y1="'y0'" x2="'x0'" y2="'y1'" style="stroke:#334155; stroke-width:4"/>
'  <line x1="'x1'" y1="'y0'" x2="'x1'" y2="'y1'" style="stroke:#334155; stroke-width:4"/>
'  <line x1="'x0'" y1="'y0'" x2="'x1'" y2="'y0'" style="stroke:#334155; stroke-width:3"/>
'  <!-- de werkende diagonaal: trek bij wind van links -->
'  <line x1="'x0'" y1="'y1'" x2="'x1'" y2="'y0'" style="stroke:#047857; stroke-width:3.2"/>
'  <text x="'(x0 + x1)/2 - 28'" y="'(y0 + y1)/2 - 10'" text-anchor="end" style="fill:#047857; font-weight:700; stroke:#fff; stroke-width:3; paint-order:stroke">trek</text>
#if verbandtype ≡ 1
    '  <line x1="'x0'" y1="'y0'" x2="'x1'" y2="'y1'" style="stroke:#94a3b8; stroke-width:1.4; stroke-dasharray:6 4"/>
    '  <text x="'(x0 + x1)/2 + 30'" y="'(y0 + y1)/2 + 26'" style="fill:#64748b; font-style:italic; stroke:#fff; stroke-width:3; paint-order:stroke">slap</text>
#else
    '  <text x="'(x0 + x1)/2 - 28'" y="'(y0 + y1)/2 + 4'" text-anchor="end" style="fill:#b91c1c; font-style:italic; stroke:#fff; stroke-width:3; paint-order:stroke">druk bij wind van rechts</text>
#end if
'  <!-- scharnieren -->
'  <polygon points="'x0','y1' 'x0 - 10','y1 + 16' 'x0 + 10','y1 + 16'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'x1','y1' 'x1 - 10','y1 + 16' 'x1 + 10','y1 + 16'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <line x1="'x0 - 16'" y1="'y1 + 16'" x2="'x1 + 16'" y2="'y1 + 16'" style="stroke:#92400e; stroke-width:1.2"/>
'  <!-- horizontale kracht -->
'  <line x1="'x0 - 64'" y1="'y0'" x2="'x0 - 12'" y2="'y0'" style="stroke:#b91c1c; stroke-width:3"/>
'  <polygon points="'x0 - 3','y0' 'x0 - 14','y0 - 6' 'x0 - 14','y0 + 6'" style="fill:#b91c1c"/>
'  <text x="'x0 - 38'" y="'y0 - 10'" text-anchor="middle" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">h,Ed</tspan> = 'F_h,Ed' kN</text>
'  <!-- maten -->
'  <text x="'(x0 + x1)/2'" y="'y1 + 34'" text-anchor="middle" style="fill:#1e40af">b = 'b_v' m</text>
'  <text x="'x1 + 12'" y="'(y0 + y1)/2 + 4'" style="fill:#1e40af">h = 'h_v' m</text>
'  <text x="'x0 + 34'" y="'y1 - 8'" style="fill:#047857">α = 'α'°</text>
'  <!-- krachtendriehoek -->
'  <text x="'tx'" y="'ty - 16'" style="fill:#475569; font-weight:700">krachten</text>
'  <line x1="'tx'" y1="'ty'" x2="'tx + tw2'" y2="'ty'" style="stroke:#b91c1c; stroke-width:2"/>
'  <line x1="'tx + tw2'" y1="'ty'" x2="'tx + tw2'" y2="'ty + th2'" style="stroke:#7c3aed; stroke-width:2"/>
'  <line x1="'tx'" y1="'ty'" x2="'tx + tw2'" y2="'ty + th2'" style="stroke:#047857; stroke-width:2.6"/>
'  <text x="'tx + tw2/2'" y="'ty - 4'" text-anchor="middle" style="fill:#b91c1c">F<tspan baseline-shift="sub" font-size="8">h</tspan></text>
'  <text x="'tx + tw2 + 5'" y="'ty + th2/2 + 4'" style="fill:#7c3aed">F<tspan baseline-shift="sub" font-size="8">v</tspan></text>
'  <text x="'tx - 4'" y="'ty + th2/2 + 10'" text-anchor="end" style="fill:#047857">N</text>
'  <text x="'tx'" y="'ty + th2 + 20'" style="fill:#475569">N = 'N_Ed' kN</text>
'  <text x="'tx'" y="'ty + th2 + 34'" style="fill:#475569">F<tspan baseline-shift="sub" font-size="8">v</tspan> = 'F_v,Ed' kN</text>
'</svg>'

# 9. Samenvatting

#hide
UC_max = max(UC_t; UC_c; UC_u)
#show
UC_max', grootste van de toetsen hieronder'
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek</td><td style="padding:4px 8px;">§6.2.3, EN 1993-1-8 §3.10.3</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_t)'">'UC_t'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_t)'">'oordeel(UC_t)'</td></tr>
#if verbandtype ≡ 2
    #if ok_druk ≡ 1
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk (knik)</td><td style="padding:4px 8px;">§6.3.1, BB.1.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_c)'">'UC_c'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_c)'">'oordeel(UC_c)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk (knik)</td><td style="padding:4px 8px;">§6.3.1, BB.1.2</td><td style="padding:4px 8px; text-align:right; color:#b91c1c">—</td><td style="padding:4px 8px; color:#b91c1c">niet getoetst</td></tr>
    #end if
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Horizontale verplaatsing</td><td style="padding:4px 8px;">EN 1990 A1.4.3</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_u)'">'UC_u'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_u)'">'oordeel(UC_u)'</td></tr>
'</table>

#if ok_druk ≡ 0
    '<b style="color:#b91c1c">Het verband voldoet niet: de druk bij omkerende wind is met deze keuze niet op te nemen of niet te toetsen (zie hoofdstuk 6).</b>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het verband voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het verband voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten en vereenvoudigingen:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>De bouten zelf (afschuiving en stuik) en het uitscheuren van de boutgroep (EN 1993-1-8 §3.10.2) zijn niet getoetst; daarvoor is er een apart rekenblad voor bouten.</li><li>De kolommen, de regels en de fundering krijgen de verticale component F<sub>v,Ed</sub>; die zijn hier niet getoetst.</li><li>De scheefstand is voor één bouwlaag gerekend, met de hoogte van het vak voor α<sub>h</sub>. Stabiliseert het verband meer lagen, vul dan de totale verticale belasting in.</li><li>De verplaatsing telt alleen de verlenging van de diagonaal. Met slappe kolomvoeten of verbindingen met speling wordt ze groter.</li><li>Een hoekprofiel dat aan één been is aangesloten, is onder druk gerekend met de effectieve slankheid van BB.1.2; die geldt als de aansluitingen de verdraaiing van de uiteinden voldoende beperken.</li></ul>
`;
