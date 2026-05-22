/**
 * Toetsing van een stalen gevelkolom op windbelasting + normaalkracht +
 * kip volgens EN 1993-1-1 §6.2 + §6.3.2.4 (simplified slenderness method).
 *
 * Profielen 1–18: IPE 80 t/m IPE 600
 * Profielen 19–42: HEA 100 t/m HEA 1000
 *
 * Doorsnede-eigenschappen volgens "Stahl im Hochbau" / steelconstruction.info,
 * eenheden hieronder in mm / mm² / mm³ / mm⁴.
 */

export const stalenGevelkolom = `"Stalen gevelkolom — toetsing wind + N + kip

'<i>Toetsing van een enkelvoudig opgelegde stalen gevelkolom belast door
'winddruk + axiaal, inclusief kip via de vereenvoudigde slankheidsmethode
'(EN 1993-1-1 §6.3.2.4).</i>

# 1. Profielkeuze

@select profile "Staalprofiel"
  IPE 80 = 1
  IPE 100 = 2
  IPE 120 = 3
  IPE 140 = 4
  IPE 160 = 5
  IPE 180 = 6
  IPE 200 = 7
  IPE 220 = 8
  IPE 240 = 9
  IPE 270 = 10
  IPE 300 = 11
  IPE 330 = 12
  IPE 360 = 13
  IPE 400 = 14
  IPE 450 = 15
  IPE 500 = 16
  IPE 550 = 17
  IPE 600 = 18
  HEA 100 = 19
  HEA 120 = 20
  HEA 140 = 21
  HEA 160 = 22
  HEA 180 = 23
  HEA 200 = 24
  HEA 220 = 25
  HEA 240 = 26
  HEA 260 = 27
  HEA 280 = 28
  HEA 300 = 29
  HEA 320 = 30
  HEA 340 = 31
  HEA 360 = 32
  HEA 400 = 33
  HEA 450 = 34
  HEA 500 = 35
  HEA 550 = 36
  HEA 600 = 37
  HEA 650 = 38
  HEA 700 = 39
  HEA 800 = 40
  HEA 900 = 41
  HEA 1000 = 42
@end

@select staalkwaliteit "Staalkwaliteit"
  S235 = 235
  S275 = 275
  S355 = 355
@end

f_y = staalkwaliteit N/mm^2
γ_M0 = 1.0
γ_M1 = 1.0

#hide
'Profielmatrix — kolomvolgorde:
'  1: id   2: h(mm)   3: b(mm)   4: t_w(mm)
'  5: t_f(mm)   6: A(mm²)   7: W_el,y(mm³)   8: I_y(mm⁴)
profiles = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30; 31; 32; 33; 34; 35; 36; 37; 38; 39; 40; 41; 42 |80; 100; 120; 140; 160; 180; 200; 220; 240; 270; 300; 330; 360; 400; 450; 500; 550; 600; 96; 114; 133; 152; 171; 190; 210; 230; 250; 270; 290; 310; 330; 350; 390; 440; 490; 540; 590; 640; 690; 790; 890; 990 |46; 55; 64; 73; 82; 91; 100; 110; 120; 135; 150; 160; 170; 180; 190; 200; 210; 220; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300 |3.8; 4.1; 4.4; 4.7; 5.0; 5.3; 5.6; 5.9; 6.2; 6.6; 7.1; 7.5; 8.0; 8.6; 9.4; 10.2; 11.1; 12.0; 5.0; 5.0; 5.5; 6.0; 6.0; 6.5; 7.0; 7.5; 7.5; 8.0; 8.5; 9.0; 9.5; 10.0; 11.0; 11.5; 12.0; 12.5; 13.0; 13.5; 14.5; 15.0; 16.0; 16.5 |5.2; 5.7; 6.3; 6.9; 7.4; 8.0; 8.5; 9.2; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5; 14.6; 16.0; 17.2; 19.0; 8.0; 8.0; 8.5; 9.0; 9.5; 10.0; 11.0; 12.0; 12.5; 13.0; 14.0; 15.5; 16.5; 17.5; 19.0; 21.0; 23.0; 24.0; 25.0; 26.0; 27.0; 28.0; 30.0; 31.0 |764; 1030; 1320; 1640; 2010; 2390; 2850; 3340; 3910; 4590; 5380; 6260; 7270; 8450; 9880; 11600; 13400; 15600; 2120; 2530; 3140; 3880; 4530; 5380; 6430; 7680; 8680; 9730; 11300; 12400; 13300; 14300; 15900; 17800; 19800; 21200; 22600; 24200; 26000; 28600; 32000; 34700 |20000; 34200; 53000; 77300; 109000; 146000; 194000; 252000; 324000; 429000; 557000; 713000; 904000; 1156000; 1500000; 1928000; 2441000; 3069000; 73000; 106000; 156000; 220000; 294000; 389000; 515000; 675000; 836000; 1013000; 1260000; 1479000; 1678000; 1891000; 2311000; 2896000; 3550000; 4146000; 4787000; 5474000; 6241000; 7682000; 9485000; 11190000 |801000; 1710000; 3180000; 5410000; 8690000; 13170000; 19430000; 27720000; 38920000; 57900000; 83560000; 117700000; 162700000; 231300000; 337400000; 482000000; 671200000; 920800000; 3490000; 6060000; 10330000; 16730000; 25100000; 36920000; 54100000; 77630000; 104500000; 136700000; 182600000; 229300000; 276900000; 330900000; 450700000; 637200000; 869700000; 1119000000; 1412000000; 1752000000; 2153000000; 3034000000; 4221000000; 5538000000]

h = hlookup(profiles; profile; 1; 2)*mm
b_profile = hlookup(profiles; profile; 1; 3)*mm
t_w = hlookup(profiles; profile; 1; 4)*mm
t_f = hlookup(profiles; profile; 1; 5)*mm
A = hlookup(profiles; profile; 1; 6)*mm^2
W_el,y = hlookup(profiles; profile; 1; 7)*mm^3
I_y = hlookup(profiles; profile; 1; 8)*mm^4
#show

'<h6>Gekozen profieleigenschappen</h6>
h
b_profile
t_w
t_f
A
W_el,y
I_y

# 2. Geometrie en belastingbreedte

L = ?*(m)', verdiepingshoogte (m) — kniklengte van de kolom'
b_belast = ?*(m)', belastingbreedte (m) — c.t.c. tussen kolommen'
n_kipsteunen = ?', aantal tussenliggende kipsteunen (regels/vloeren)'

L_LT = L/(n_kipsteunen + 1)', afstand tussen kipsteunen — lengte voor kipcontrole'

# 3. Windbelasting

q_wind = ?*(kN/m^2)', wind-rekenwaarde uit project-uitgangspunten'

q_line = q_wind*b_belast', lijnlast op de kolom (kN/m)'

# 4. Optredende krachten

N_Ed = ?*(kN)', axiale rekenwaarde — drukkracht door bovenliggende verdiepingen'
M_Ed = q_line*L^2/8', buigend moment in het midden bij gelijkmatige lijnlast'
V_Ed = q_line*L/2', dwarskracht aan de oplegging'

# 5. Schema en M/V-lijnen

'<h6>5.1 Belastingsschema</h6>
#hide
q_arrows_n = 8', aantal q-pijltjes in het schema
q_x_left = 60
q_x_top = 40
q_y_top = q_x_top + 0
q_y_bottom = 360
col_x = 200
arrow_len = 80
#show
'<svg viewbox="0 0 480 440" xmlns="http://www.w3.org/2000/svg" style="font-size:13px; width:100%; max-height:440px;">
'  <line x1="'col_x'" y1="'q_y_top'" x2="'col_x'" y2="'q_y_bottom'" style="stroke:#1E40AF; stroke-width:3"/>
'  <polygon points="'col_x - 12','q_y_bottom + 18' 'col_x + 12','q_y_bottom + 18' 'col_x','q_y_bottom + 4'" style="fill:#1E40AF"/>
'  <line x1="'col_x - 25'" y1="'q_y_top'" x2="'col_x + 25'" y2="'q_y_top'" style="stroke:#1E40AF; stroke-width:3"/>
'  <line x1="'col_x - 25'" y1="'q_y_top - 6'" x2="'col_x + 25'" y2="'q_y_top - 6'" style="stroke:#1E40AF; stroke-width:1; stroke-dasharray:4 2"/>
#for i = 0 : q_arrows_n
'  <line x1="'q_x_left'" y1="'q_y_top + (q_y_bottom - q_y_top)*i/q_arrows_n'" x2="'q_x_left + arrow_len'" y2="'q_y_top + (q_y_bottom - q_y_top)*i/q_arrows_n'" style="stroke:#DC2626; stroke-width:2"/>
'  <polygon points="'q_x_left + arrow_len','q_y_top + (q_y_bottom - q_y_top)*i/q_arrows_n - 5' 'q_x_left + arrow_len + 10','q_y_top + (q_y_bottom - q_y_top)*i/q_arrows_n' 'q_x_left + arrow_len','q_y_top + (q_y_bottom - q_y_top)*i/q_arrows_n + 5'" style="fill:#DC2626"/>
#loop
'  <line x1="'q_x_left'" y1="'q_y_top'" x2="'q_x_left'" y2="'q_y_bottom'" style="stroke:#DC2626; stroke-width:2"/>
'  <text x="20" y="'(q_y_top + q_y_bottom)/2'" text-anchor="middle" transform="rotate(-90, 20, '(q_y_top + q_y_bottom)/2')" style="fill:#DC2626; font-weight:600">q = 'q_line'</text>
'  <text x="'col_x + 30'" y="'(q_y_top + q_y_bottom)/2'" style="fill:#1E40AF; font-weight:600">L = 'L'</text>
'  <text x="'col_x + 30'" y="'q_y_top - 10'" style="fill:#525252">N = 'N_Ed'</text>
'  <line x1="'col_x'" y1="'q_y_top - 30'" x2="'col_x'" y2="'q_y_top - 10'" style="stroke:#525252; stroke-width:2"/>
'  <polygon points="'col_x - 6','q_y_top - 14' 'col_x + 6','q_y_top - 14' 'col_x','q_y_top - 4'" style="fill:#525252"/>
'  <text x="'col_x + 60'" y="'q_y_bottom + 30'" style="fill:#525252; font-size:11px">b<tspan baseline-shift="sub">belast</tspan> = 'b_belast'</text>
'</svg>'

'<h6>5.2 M-lijn (buigend moment) en V-lijn (dwarskracht)</h6>
#hide
dia_x_left = 50
dia_x_right = 430
dia_mid = (dia_x_left + dia_x_right)/2
mline_y_base = 100
mline_y_max = 50
vline_y_base = 280
vline_y_max = 50
#show
'<svg viewbox="0 0 480 350" xmlns="http://www.w3.org/2000/svg" style="font-size:13px; width:100%; max-height:380px;">
'  <text x="'dia_x_left'" y="30" style="fill:#525252; font-weight:600">M-lijn</text>
'  <line x1="'dia_x_left'" y1="'mline_y_base'" x2="'dia_x_right'" y2="'mline_y_base'" style="stroke:#525252; stroke-width:1.5"/>
'  <polygon points="'dia_x_left','mline_y_base - 4' 'dia_x_left + 6','mline_y_base + 6' 'dia_x_left - 6','mline_y_base + 6'" style="fill:#525252"/>
'  <polygon points="'dia_x_right','mline_y_base - 4' 'dia_x_right + 6','mline_y_base + 6' 'dia_x_right - 6','mline_y_base + 6'" style="fill:#525252"/>
'  <path d="M 'dia_x_left' 'mline_y_base' Q 'dia_mid' 'mline_y_max - (mline_y_base - mline_y_max)' 'dia_x_right' 'mline_y_base'" style="fill:#7C3AED; fill-opacity:0.15; stroke:#7C3AED; stroke-width:2"/>
'  <text x="'dia_mid'" y="'mline_y_max - 5'" text-anchor="middle" style="fill:#7C3AED; font-weight:700">M<tspan baseline-shift="sub">Ed</tspan> = 'M_Ed'</text>
'  <text x="'dia_mid'" y="'mline_y_base + 18'" text-anchor="middle" style="fill:#525252; font-size:11px">parabool — max in het midden</text>
'  <text x="'dia_x_left'" y="'vline_y_base - 90'" style="fill:#525252; font-weight:600">V-lijn</text>
'  <line x1="'dia_x_left'" y1="'vline_y_base'" x2="'dia_x_right'" y2="'vline_y_base'" style="stroke:#525252; stroke-width:1.5"/>
'  <polygon points="'dia_x_left','vline_y_base - 4' 'dia_x_left + 6','vline_y_base + 6' 'dia_x_left - 6','vline_y_base + 6'" style="fill:#525252"/>
'  <polygon points="'dia_x_right','vline_y_base - 4' 'dia_x_right + 6','vline_y_base + 6' 'dia_x_right - 6','vline_y_base + 6'" style="fill:#525252"/>
'  <polygon points="'dia_x_left','vline_y_base' 'dia_x_left','vline_y_base - vline_y_max' 'dia_mid','vline_y_base' 'dia_x_left','vline_y_base'" style="fill:#16A34A; fill-opacity:0.2; stroke:#16A34A; stroke-width:2"/>
'  <polygon points="'dia_x_right','vline_y_base' 'dia_x_right','vline_y_base + vline_y_max' 'dia_mid','vline_y_base' 'dia_x_right','vline_y_base'" style="fill:#16A34A; fill-opacity:0.2; stroke:#16A34A; stroke-width:2"/>
'  <text x="'dia_x_left + 15'" y="'vline_y_base - vline_y_max - 5'" style="fill:#16A34A; font-weight:700">+V<tspan baseline-shift="sub">Ed</tspan> = 'V_Ed'</text>
'  <text x="'dia_x_right - 80'" y="'vline_y_base + vline_y_max + 15'" style="fill:#16A34A; font-weight:700">−V<tspan baseline-shift="sub">Ed</tspan> = 'V_Ed'</text>
'</svg>'

# 6. Toetsing buiging — §6.2.5

M_c,Rd = W_el,y*f_y/γ_M0' (elastische weerstand om y-as)
UC_M = M_Ed/M_c,Rd

#if UC_M ≤ 1.0
    'UC<sub>M</sub> = 'UC_M = M_Ed/M_c,Rd'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>M</sub> = 'UC_M = M_Ed/M_c,Rd'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 7. Toetsing dwarskracht — §6.2.6

A_v = A - 2*b_profile*t_f + (t_w + 2*0)*t_f', schuifvlak (vereenvoudigd voor I-profielen)
V_pl,Rd = A_v*(f_y/sqrt(3))/γ_M0
UC_V = V_Ed/V_pl,Rd

#if UC_V ≤ 1.0
    'UC<sub>V</sub> = 'UC_V = V_Ed/V_pl,Rd'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>V</sub> = 'UC_V = V_Ed/V_pl,Rd'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 8. Toetsing druk — §6.2.4

N_c,Rd = A*f_y/γ_M0
UC_N = N_Ed/N_c,Rd

#if UC_N ≤ 1.0
    'UC<sub>N</sub> = 'UC_N = N_Ed/N_c,Rd'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>N</sub> = 'UC_N = N_Ed/N_c,Rd'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 9. Kipcontrole — §6.3.2.4 (vereenvoudigde slankheidsmethode)

'<i>Vereenvoudigde methode voor de kniklengte tussen de kipsteunen.
'k<sub>c</sub> = 0,94 (uniform belaste, simpel opgelegde lengte tussen steunen, Tabel 6.6).
'k<sub>fl</sub> = 1,10 (verlaagde drukflens — Aanbevolen waarde NB).</i>

#hide
ε = sqrt(235 N/mm^2/f_y)
λ_1 = 93.9*ε
A_f = b_profile*t_f', flensoppervlak (compressie flens)
A_w_eff = (h - 2*t_f)*t_w/3', 1/3 van het web bijdragend aan de "T"
i_f,z = sqrt((b_profile^3*t_f/12)/(A_f + A_w_eff))', traagheidsstraal van flens+1/3web om z-as
k_c = 0.94
k_fl = 1.10
λ_c0 = 0.5
#show

'L<sub>LT</sub> = L / (n<sub>kipsteunen</sub> + 1) = 'L_LT' (afstand tussen kipsteunen)'

i_f,z
λ_f = (k_c*L_LT)/(i_f,z*λ_1)', §6.3.2.4 (5)
'λ̄<sub>f</sub> = 'λ_f' (slankheid drukflens)'

#if λ_f ≤ λ_c0
    'λ̄<sub>f</sub> ≤ λ̄<sub>c0</sub> = 0,5 → <b>geen kipcontrole nodig</b>: M<sub>b,Rd</sub> = M<sub>c,Rd</sub>
    M_b,Rd = M_c,Rd
#else
    'λ̄<sub>f</sub> > λ̄<sub>c0</sub> = 0,5 → kipcontrole nodig
    #if h/b_profile ≤ 2
        α_LT = 0.34', buigingsknik-kromme b (Tabel 6.5, h/b ≤ 2)
    #else
        α_LT = 0.49', buigingsknik-kromme c (Tabel 6.5, h/b > 2)
    #end if
    φ_LT = 0.5*(1 + α_LT*(λ_f - 0.2) + λ_f^2)
    χ_LT = 1/(φ_LT + sqrt(φ_LT^2 - λ_f^2))
    #if χ_LT > 1.0
        χ_LT = 1.0
    #end if
    'χ<sub>LT</sub> = 'χ_LT
    M_b,Rd = k_fl*χ_LT*W_el,y*f_y/γ_M1
#end if

UC_LT = M_Ed/M_b,Rd
#if UC_LT ≤ 1.0
    'UC<sub>kip</sub> = M<sub>Ed</sub>/M<sub>b,Rd</sub> = 'UC_LT'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>kip</sub> = M<sub>Ed</sub>/M<sub>b,Rd</sub> = 'UC_LT'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 10. Verplaatsingstoets (BGT) — §7.2 + NEN-EN 1993-1-1 NB Tabel B.1

'<i>Toetsing van horizontale verplaatsing onder karakteristieke windbelasting
'(BGT karakteristieke combinatie). Voor gevelelementen is de gangbare grens
'δ ≤ L/300; voor algemene constructies δ ≤ L/250.</i>

E = 210000 N/mm^2', E-modulus staal'

q_wind,kar = q_wind/1.5', terug naar karakteristieke wind (γ_Q,wind = 1.5)'
q_kar,line = q_wind,kar*b_belast

δ_max = 5*q_kar,line*L^4/(384*E*I_y)', maximale doorbuiging midden bij UDL'

@select VerplGrens "Verplaatsingsgrens"
  L/300 (gevel) = 300
  L/250 (algemeen) = 250
  L/200 (ruimer) = 200
@end

δ_lim = L/VerplGrens

UC_δ = δ_max/δ_lim

#if UC_δ ≤ 1.0
    'UC<sub>δ</sub> = δ<sub>max</sub>/δ<sub>lim</sub> = 'UC_δ'<span style="color: green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>δ</sub> = δ<sub>max</sub>/δ<sub>lim</sub> = 'UC_δ'<span style="color: red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 11. Gecombineerde toetsing — §6.2.9 + §6.3.3 (vereenvoudigd, klasse 3)

UC_combi = N_Ed/N_c,Rd + M_Ed/M_b,Rd

#if UC_combi ≤ 1.0
    'UC<sub>M+N+kip</sub> = 'UC_combi' <span style="color: green">≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>M+N+kip</sub> = 'UC_combi' <span style="color: red">> 1.0 → <b>Voldoet NIET</b></span>
#end if

'<hr/>
'<i>Vereenvoudigingen in deze toetsing:
'<ul>
'<li>Kniklengte = staaflengte L (geen aparte knikcontrole §6.3.1) — voor een
'gevelkolom met c.t.c. vloer is de kniklengte meestal gelijk aan de
'verdiepingshoogte.</li>
'<li>Kipcontrole via §6.3.2.4 vereenvoudigde slankheidsmethode i.p.v. de
'gedetailleerde §6.3.2.2 M<sub>cr</sub>-berekening. Conservatief voor
'rolprofielen onder gelijkmatig belasting.</li>
'<li>Dwarskrachtreductie van de momentcapaciteit (§6.2.8) is verwaarloosd
'omdat UC<sub>V</sub> meestal &lt; 0.5 blijft.</li>
'<li>Elastische weerstand (klasse 3) — voor klasse 1/2 kun je W<sub>pl,y</sub> gebruiken
'in plaats van W<sub>el,y</sub> voor circa 10–15% extra capaciteit.</li>
'</ul></i>
`;
