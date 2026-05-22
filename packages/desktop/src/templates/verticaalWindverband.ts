/**
 * Toetsing van een verticaal windverband (vertical bracing) — trek-only.
 *
 * Conform praktijk: een windverband-diagonaal werkt als trekstaaf. Het
 * profiel is meestal een strip (platte staal) of een hoeklijn. De
 * "drukdiagonaal" in een X-kruis wordt verwaarloosd (slap).
 *
 * Toets: §6.2.3 trek + net cross-section bij boutaansluiting + §7.2 BGT.
 */

export const verticaalWindverband = `"Verticaal windverband — trekstaaftoetsing

'<i>Toetsing van de trekstaaf (strip of hoeklijn) in een verticaal windverband.
'De getrokken diagonaal voert de horizontale wind-shear af naar de fundering;
'de tegenovergestelde diagonaal in een X-kruis wordt slap en niet meegerekend.
'Toets volgens EN 1993-1-1 §6.2.3 (trek, bruto + netto doorsnede).</i>

# 1. Profielkeuze

@select verbandtype "Verbandtype"
  Enkele diagonaal = 1
  X-kruis (trek-only) = 2
@end

@select profile "Profiel (id)"
  Strip 30×5  (A = 150 mm²) = 1
  Strip 40×5  (A = 200 mm²) = 2
  Strip 50×5  (A = 250 mm²) = 3
  Strip 60×5  (A = 300 mm²) = 4
  Strip 60×8  (A = 480 mm²) = 5
  Strip 60×10 (A = 600 mm²) = 6
  Strip 80×6  (A = 480 mm²) = 7
  Strip 80×8  (A = 640 mm²) = 8
  Strip 80×10 (A = 800 mm²) = 9
  Strip 100×8  (A = 800 mm²) = 10
  Strip 100×10 (A = 1000 mm²) = 11
  Strip 100×12 (A = 1200 mm²) = 12
  Strip 120×10 (A = 1200 mm²) = 13
  Strip 120×12 (A = 1440 mm²) = 14
  Strip 150×12 (A = 1800 mm²) = 15
  L 30×30×3   (A = 175 mm²) = 16
  L 40×40×4   (A = 308 mm²) = 17
  L 50×50×5   (A = 480 mm²) = 18
  L 50×50×6   (A = 569 mm²) = 19
  L 60×60×6   (A = 691 mm²) = 20
  L 60×60×8   (A = 905 mm²) = 21
  L 70×70×7   (A = 940 mm²) = 22
  L 80×80×8   (A = 1230 mm²) = 23
  L 80×80×10  (A = 1510 mm²) = 24
  L 90×90×9   (A = 1550 mm²) = 25
  L 100×100×10 (A = 1920 mm²) = 26
  L 100×100×12 (A = 2270 mm²) = 27
  L 120×120×12 (A = 2750 mm²) = 28
  L 150×150×12 (A = 3480 mm²) = 29
  L 150×150×15 (A = 4300 mm²) = 30
@end

@select staalkwaliteit "Staalkwaliteit"
  S235 = 235
  S275 = 275
  S355 = 355
@end

f_y = staalkwaliteit N/mm^2
f_u = if(staalkwaliteit ≡ 235; 360; if(staalkwaliteit ≡ 275; 430; 510)) N/mm^2', treksterkte EN 10025'
γ_M0 = 1.0
γ_M2 = 1.25', voor netto doorsnede met boutgat'

#hide
'Profielmatrix: [id | A (mm²)]
profiles = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30 |150; 200; 250; 300; 480; 600; 480; 640; 800; 800; 1000; 1200; 1200; 1440; 1800; 175; 308; 480; 569; 691; 940; 905; 1230; 1510; 1550; 1920; 2270; 2750; 3480; 4300]
A = hlookup(profiles; profile; 1; 2)*mm^2
#show

'<h6>Gekozen profiel</h6>
A

# 2. Geometrie van de stabiliteitsbeun

b = ?*(m)', breedte van de beun (h.o.h. tussen kolommen)'
h = ?*(m)', verdiepingshoogte van de beun'

L_d = sqrt(b^2 + h^2)', diagonaal-systemlengte'
α = atan(h/b)', hoek van de diagonaal met de horizontale (rad)'
α_deg = α*180/pi
cos_α = b/L_d
sin_α = h/L_d

# 3. Windkracht op de beun

F_h = ?*(kN)', totale horizontale wind-rekenwaarde op deze beun (UGT)'

# 4. Kracht in de getrokken diagonaal (ontbinding)

#if verbandtype ≡ 1
    'Enkele diagonaal — neemt de volledige horizontale kracht op
    type_label = "enkele diagonaal"
#else
    'X-kruis trek-only — slechts één diagonaal werkt per windrichting
    type_label = "X-kruis (trek-only)"
#end if

'De horizontale wind F<sub>h</sub> wordt langs de diagonaal ontbonden:
'  F<sub>t,Ed</sub> = F<sub>h</sub> / cos α   (langs de diagonaal)
'  F<sub>v</sub>   = F<sub>t,Ed</sub> · sin α   (verticaal — drukt op kolom + fundering)

F_t,Ed = F_h/cos_α', trekkracht in de werkende diagonaal'
F_v = F_t,Ed*sin_α', verticale reactiecomponent in de getrokken hoekpunten'

# 5. Schema-tekening — aanzicht in XZ-vlak

'<i>Rechthoekige stabiliteitsbeun met kruis-windverband. Aan de top wordt
'F<sub>h</sub> aangebracht (rood). De getrokken diagonaal (groen, dik) voert
'de kracht af; de tegenovergestelde diagonaal (lichtgrijs gestippeld) wordt
'slap. Rechts naast het kruis is het krachtdriehoekje getoond met de
'ontbinding F<sub>t</sub> = √(F<sub>h</sub>² + F<sub>v</sub>²).</i>

#hide
sw = 260', breedte van het frame in svg-pixels
sh = 200', hoogte
x0 = 70
x1 = x0 + sw
y0 = 40
y1 = y0 + sh
mid_x = (x0 + x1)/2
mid_y = (y0 + y1)/2
'Krachtdriehoek rechts van de beun
tri_x = x1 + 50
tri_y = mid_y
tri_w = 70
tri_h = tri_w*sh/sw
#show
'<svg viewbox="0 0 480 320" xmlns="http://www.w3.org/2000/svg" style="font-size:13px; width:100%; max-height:340px;">
'  <line x1="'x0'" y1="'y0 - 12'" x2="'x1'" y2="'y0 - 12'" style="stroke:#525252; stroke-width:1; stroke-dasharray:6 3"/>
'  <line x1="'x0'" y1="'y1 + 12'" x2="'x1'" y2="'y1 + 12'" style="stroke:#525252; stroke-width:1; stroke-dasharray:6 3"/>
'  <line x1="'x0'" y1="'y0'" x2="'x0'" y2="'y1'" style="stroke:#1E40AF; stroke-width:4"/>
'  <line x1="'x1'" y1="'y0'" x2="'x1'" y2="'y1'" style="stroke:#1E40AF; stroke-width:4"/>
'  <line x1="'x0'" y1="'y0'" x2="'x1'" y2="'y0'" style="stroke:#1E40AF; stroke-width:4"/>
'  <line x1="'x0'" y1="'y1'" x2="'x1'" y2="'y1'" style="stroke:#1E40AF; stroke-width:4"/>
'  <line x1="'x0'" y1="'y1'" x2="'x1'" y2="'y0'" style="stroke:#16A34A; stroke-width:3"/>
'  <line x1="'x0'" y1="'y0'" x2="'x1'" y2="'y1'" style="stroke:#94A3B8; stroke-width:1.5; stroke-dasharray:5 4"/>
'  <text x="'mid_x - 36'" y="'mid_y - 8'" style="fill:#16A34A; font-weight:700">F<tspan baseline-shift="sub">t,Ed</tspan></text>
'  <text x="'mid_x + 6'" y="'mid_y + 22'" style="fill:#94A3B8; font-size:11px; font-style:italic">slap</text>
'  <line x1="'x0 - 60'" y1="'y0'" x2="'x0 - 12'" y2="'y0'" style="stroke:#DC2626; stroke-width:3"/>
'  <polygon points="'x0 - 12','y0 - 6' 'x0 - 2','y0' 'x0 - 12','y0 + 6'" style="fill:#DC2626"/>
'  <text x="'x0 - 64'" y="'y0 + 4'" text-anchor="end" style="fill:#DC2626; font-weight:700">F<tspan baseline-shift="sub">h</tspan></text>
'  <text x="'(x0 + x1)/2'" y="'y0 - 22'" text-anchor="middle" style="fill:#525252">b = 'b'</text>
'  <text x="'x0 - 18'" y="'(y0 + y1)/2'" text-anchor="end" style="fill:#525252">h = 'h'</text>
'  <text x="20" y="'y1 + 30'" style="fill:#525252; font-size:11px">type: 'type_label' · α = 'α_deg'°</text>
'  <g transform="translate('tri_x', 'tri_y')">
'    <line x1="0" y1="0" x2="'tri_w'" y2="0" style="stroke:#DC2626; stroke-width:2"/>
'    <polygon points="'tri_w - 6',-4 'tri_w','0 'tri_w - 6',4" style="fill:#DC2626"/>
'    <text x="'tri_w/2'" y="-6" text-anchor="middle" style="fill:#DC2626; font-size:11px; font-weight:600">F<tspan baseline-shift="sub">h</tspan></text>
'    <line x1="'tri_w'" y1="0" x2="'tri_w'" y2="'tri_h'" style="stroke:#7C3AED; stroke-width:2"/>
'    <polygon points="'tri_w - 4','tri_h - 6' 'tri_w','tri_h' 'tri_w + 4','tri_h - 6'" style="fill:#7C3AED"/>
'    <text x="'tri_w + 6'" y="'tri_h/2 + 4'" style="fill:#7C3AED; font-size:11px; font-weight:600">F<tspan baseline-shift="sub">v</tspan></text>
'    <line x1="0" y1="0" x2="'tri_w'" y2="'tri_h'" style="stroke:#16A34A; stroke-width:2.5"/>
'    <polygon points="'tri_w - 8','tri_h - 4' 'tri_w','tri_h' 'tri_w - 4','tri_h - 10'" style="fill:#16A34A"/>
'    <text x="'tri_w/2 - 28'" y="'tri_h/2 + 4'" style="fill:#16A34A; font-size:11px; font-weight:600">F<tspan baseline-shift="sub">t,Ed</tspan></text>
'  </g>
'  <text x="'tri_x'" y="'tri_y - 30'" style="fill:#525252; font-size:11px; font-weight:600">Krachtdriehoek</text>
'  <g transform="translate(20, 280)">
'    <line x1="0" y1="0" x2="36" y2="0" style="stroke:#525252; stroke-width:1.5"/>
'    <polygon points="32,-4 40,0 32,4" style="fill:#525252"/>
'    <text x="44" y="4" style="fill:#525252; font-size:12px; font-weight:600">X</text>
'    <line x1="0" y1="0" x2="0" y2="-36" style="stroke:#525252; stroke-width:1.5"/>
'    <polygon points="-4,-32 0,-40 4,-32" style="fill:#525252"/>
'    <text x="-12" y="-30" style="fill:#525252; font-size:12px; font-weight:600">Z</text>
'  </g>
'</svg>'

'Krachtwaarden uit de ontbinding:
'  F<sub>h</sub> = 'F_h'  (toegepaste wind, horizontaal)
'  F<sub>t,Ed</sub> = F<sub>h</sub> / cos α = 'F_t,Ed'
'  F<sub>v</sub> = F<sub>t,Ed</sub> · sin α = 'F_v'

# 6. Trekcontrole — §6.2.3 (bruto doorsnede)

N_pl,Rd = A*f_y/γ_M0
UC_t = F_t,Ed/N_pl,Rd

#if UC_t ≤ 1.0
    'UC<sub>t,bruto</sub> = F<sub>t,Ed</sub>/N<sub>pl,Rd</sub> = 'UC_t'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>t,bruto</sub> = F<sub>t,Ed</sub>/N<sub>pl,Rd</sub> = 'UC_t'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 7. Netto doorsnede bij boutaansluiting — §6.2.3 (2)

'<i>Verlaag de bruto-doorsnede met boutgaten. Bij excentrische aansluiting
'van een hoeklijn aan één been past §3.10.3 (effectieve netto doorsnede)
'extra reductiefactoren — niet in deze sheet.</i>

d_bout = ?*(mm)', boutgatdiameter (0 = geen bouten / volledig gelast)'
n_bouten = ?', aantal boutgaten in dezelfde dwarsdoorsnede'
t_aansluit = ?*(mm)', dikte op de aansluiting (strip-dikte of hoeklijn-been)'

A_net = A - n_bouten*d_bout*t_aansluit
N_u,Rd = 0.9*A_net*f_u/γ_M2', §6.2.3 (2) netto-doorsnede met γ_M2'

#if A_net ≤ 0
    '<span style="color: red"><b>Aantal/diameter bouten te groot: A<sub>net</sub> ≤ 0</b></span>
    UC_net = 9.99
#else
    UC_net = F_t,Ed/N_u,Rd
    A_net
    N_u,Rd
    #if UC_net ≤ 1.0
        'UC<sub>t,netto</sub> = F<sub>t,Ed</sub>/N<sub>u,Rd</sub> = 'UC_net'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
    #else
        'UC<sub>t,netto</sub> = F<sub>t,Ed</sub>/N<sub>u,Rd</sub> = 'UC_net'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
    #end if
#end if

'<hr/>
'<i>Vereenvoudigingen en aandachtspunten:
'<ul>
'<li>Trek-only ontwerp — drukcontrole en BGT-verplaatsing zijn bewust niet
'opgenomen. Geldig voor strippen en niet-stijve hoeklijnen die onder druk
'slap worden.</li>
'<li>Bij hoeklijn aangesloten op één been geldt §3.10.3 — effectieve netto
'doorsnede (β-factoren). Sheet rekent met volle A<sub>net</sub>.</li>
'<li>Verbindingen niet getoetst — bouten op afschuiving, blok-shear,
'lasdoorsneden uit EN 1993-1-8.</li>
'</ul></i>
`;
