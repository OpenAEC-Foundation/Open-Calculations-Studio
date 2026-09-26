/**
 * Stalen gevelkolom op wind en normaalkracht, volgens NEN-EN 1993-1-1 met de
 * Nederlandse nationale bijlage.
 *
 * Scharnierend aan beide einden (gaffels), wind via de gevelregels op de
 * buitenflens. De wind volgt uit NEN-EN 1991-1-4 met NB: q_p uit windgebied,
 * terreincategorie en gebouwhoogte (dezelfde keten als de gording), c_pe voor
 * een verticale gevel uit tabel NB.6 – 7.1 en c_pi = +0,2 of −0,3. Bij een
 * ontwerplevensduur boven 50 jaar q_p met c_prob (opmerking 4 bij 4.2, K uit
 * tabel NB.2; A1.1(2) van de NB bij NEN-EN 1990); een zelf ingevulde q_p of
 * netto druk niet. Getoetst: doorsnedeklasse (tabel 5.2), doorsnede (§6.2), knik
 * en torsieknik (§6.3.1, NB bij 6.3.1.4), kip met M_cr volgens bijlage NB.NB en
 * χ_LT volgens §6.3.2.3, druk met buiging volgens bijlage B (§6.3.3) en de
 * doorbuiging. Winddruk en windzuiging apart: bij druk is de buitenflens
 * gedrukt en steunen de regels die, bij zuiging is de binnenflens gedrukt.
 * Twee combinaties: N_Ed hoort bij wind als hoofdbelasting (§6.2.9 en
 * bijlage B), N_Ed,max bij de combinatie zonder wind (knik zonder buiging).
 * Valt het lijf bij zuivere druk in klasse 4, dan telt voor die knik A_eff
 * volgens NEN-EN 1993-1-5 §4.4, met χ op het bruto oppervlak.
 *
 * Profielen IPE 80–600, HEA 100–1000 en HEB 100–400 (id's 1–18, 19–42 en
 * 43–57). I_w volgt uit de benadering I_z·(h − t_f)²/4 van bijlage NB.NB.
 * Geen referentieberekening beschikbaar; scripts/check-gevelkolom.mjs rekent
 * de uitkomsten onafhankelijk na.
 */

export const stalenGevelkolom = `"Stalen gevelkolom — EN 1993-1-1 §6.2 en §6.3

'<i>Gevelkolom, scharnierend met gaffels aan beide einden, belast door wind en een drukkracht. Winddruk en windzuiging apart: bij winddruk is de buitenflens gedrukt en steunen de regels die flens, bij windzuiging is de binnenflens gedrukt en tussen de einden vrij.</i>

# 1. Profiel en materiaal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

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
  HEB 100 = 43
  HEB 120 = 44
  HEB 140 = 45
  HEB 160 = 46
  HEB 180 = 47
  HEB 200 = 48
  HEB 220 = 49
  HEB 240 = 50
  HEB 260 = 51
  HEB 280 = 52
  HEB 300 = 53
  HEB 320 = 54
  HEB 340 = 55
  HEB 360 = 56
  HEB 400 = 57
@end

@select staalkwaliteit "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

f_y = staalkwaliteit*N/mm^2', tabel 3.1, t ≤ 40 mm'
E = 210000 N/mm^2
G = 81000 N/mm^2
γ_M0 = 1.0
γ_M1 = 1.0', NB bij 6.1(1)'

#hide
'Profieltabel: id | h | b | t_w | t_f | r (mm) | A (cm²) | I_y | I_z (cm⁴) | W_el,y | W_pl,y (cm³) | I_t (cm⁴)
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30; 31; 32; 33; 34; 35; 36; 37; 38; 39; 40; 41; 42; 43; 44; 45; 46; 47; 48; 49; 50; 51; 52; 53; 54; 55; 56; 57 |80; 100; 120; 140; 160; 180; 200; 220; 240; 270; 300; 330; 360; 400; 450; 500; 550; 600; 96; 114; 133; 152; 171; 190; 210; 230; 250; 270; 290; 310; 330; 350; 390; 440; 490; 540; 590; 640; 690; 790; 890; 990; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 320; 340; 360; 400 |46; 55; 64; 73; 82; 91; 100; 110; 120; 135; 150; 160; 170; 180; 190; 200; 210; 220; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300 |3.8; 4.1; 4.4; 4.7; 5; 5.3; 5.6; 5.9; 6.2; 6.6; 7.1; 7.5; 8; 8.6; 9.4; 10.2; 11.1; 12; 5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8; 8.5; 9; 9.5; 10; 11; 11.5; 12; 12.5; 13; 13.5; 14.5; 15; 16; 16.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 10.5; 11; 11.5; 12; 12.5; 13.5 |5.2; 5.7; 6.3; 6.9; 7.4; 8; 8.5; 9.2; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5; 14.6; 16; 17.2; 19; 8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 13; 14; 15.5; 16.5; 17.5; 19; 21; 23; 24; 25; 26; 27; 28; 30; 31; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 18; 19; 20.5; 21.5; 22.5; 24 |5; 7; 7; 7; 9; 9; 12; 12; 15; 15; 15; 18; 18; 21; 21; 21; 24; 24; 12; 12; 12; 15; 15; 18; 18; 21; 24; 24; 27; 27; 27; 27; 27; 27; 27; 27; 27; 27; 27; 30; 30; 30; 12; 12; 12; 15; 15; 18; 18; 21; 24; 24; 27; 27; 27; 27; 27 |7.64; 10.3; 13.2; 16.4; 20.1; 23.9; 28.5; 33.4; 39.1; 45.9; 53.8; 62.6; 72.7; 84.5; 98.8; 116; 134; 156; 21.2; 25.3; 31.4; 38.8; 45.3; 53.8; 64.3; 76.8; 86.8; 97.3; 112; 124.4; 133.5; 142.8; 159; 178; 197.5; 211.8; 226.5; 241.6; 260.5; 285.8; 320.5; 346.8; 26; 34; 43; 54.3; 65.3; 78.1; 91; 106; 118; 131; 149; 161.3; 170.9; 180.6; 197.8 |80.1; 171; 318; 541; 869; 1320; 1940; 2770; 3890; 5790; 8360; 11770; 16270; 23130; 33740; 48200; 67120; 92080; 349; 606; 1030; 1670; 2510; 3690; 5410; 7760; 10450; 13670; 18260; 22930; 27690; 33090; 45070; 63720; 86970; 111900; 141200; 175200; 215300; 303400; 422100; 553800; 450; 864; 1510; 2490; 3830; 5700; 8090; 11260; 14920; 19270; 25170; 30820; 36660; 43190; 57680 |8.49; 15.9; 27.7; 44.9; 68.3; 101; 142; 205; 284; 420; 604; 788; 1040; 1320; 1680; 2140; 2670; 3390; 134; 231; 389; 616; 925; 1340; 1950; 2770; 3670; 4760; 6310; 6990; 7440; 7890; 8560; 9465; 10370; 10820; 11270; 11720; 12180; 12640; 13550; 14000; 167; 318; 550; 889; 1360; 2000; 2840; 3920; 5130; 6590; 8560; 9240; 9690; 10140; 10820 |20; 34.2; 53; 77.3; 109; 146; 194; 252; 324; 429; 557; 713; 904; 1160; 1500; 1930; 2440; 3070; 72.8; 106; 155; 220; 294; 389; 515; 675; 836; 1010; 1260; 1480; 1680; 1890; 2310; 2896; 3550; 4146; 4787; 5474; 6241; 7682; 9485; 11190; 89.9; 144; 216; 311; 426; 570; 736; 938; 1150; 1380; 1680; 1930; 2160; 2400; 2880 |23.2; 39.4; 60.7; 88.3; 124; 166; 221; 285; 367; 484; 628; 804; 1020; 1310; 1700; 2190; 2780; 3510; 83; 119; 174; 245; 325; 430; 569; 745; 920; 1110; 1380; 1630; 1850; 2090; 2560; 3216; 3949; 4622; 5350; 6136; 7032; 8699; 10810; 12820; 104; 165; 246; 354; 481; 642; 827; 1050; 1280; 1530; 1870; 2150; 2410; 2680; 3230 |0.7; 1.2; 1.74; 2.45; 3.6; 4.79; 6.98; 9.07; 12.9; 15.9; 20.1; 28.2; 37.3; 51.1; 66.9; 89.3; 123; 165; 5.24; 5.99; 8.13; 12.2; 14.8; 20.98; 28.5; 41.6; 52.4; 62.1; 85.2; 108; 127; 149; 189; 243.8; 309.3; 351.5; 397.8; 448.3; 513.9; 596.9; 736.8; 822.4; 9.25; 13.8; 20.1; 31.2; 42.2; 59.3; 76.6; 103; 124; 144; 185; 225; 257; 293; 356]
h = hlookup(profielen; profile; 1; 2)*mm
b_p = hlookup(profielen; profile; 1; 3)*mm
t_w = hlookup(profielen; profile; 1; 4)*mm
t_f = hlookup(profielen; profile; 1; 5)*mm
r = hlookup(profielen; profile; 1; 6)*mm
A = hlookup(profielen; profile; 1; 7)*cm^2
I_y = hlookup(profielen; profile; 1; 8)*cm^4
I_z = hlookup(profielen; profile; 1; 9)*cm^4
W_el,y = hlookup(profielen; profile; 1; 10)*cm^3
W_pl,y = hlookup(profielen; profile; 1; 11)*cm^3
I_t = hlookup(profielen; profile; 1; 12)*cm^4
#show
'<table style="border-collapse:collapse; font-size:0.95em; margin:2px 0 6px 0;">
'<tr><td style="padding:3px 8px;">h = 'h' mm</td><td style="padding:3px 8px;">b = 'b_p' mm</td><td style="padding:3px 8px;">t<sub>w</sub> = 't_w' mm</td><td style="padding:3px 8px;">t<sub>f</sub> = 't_f' mm</td></tr>
'<tr><td style="padding:3px 8px;">r = 'r' mm</td><td style="padding:3px 8px;">A = 'A' cm²</td><td style="padding:3px 8px;">I<sub>y</sub> = 'I_y' cm⁴</td><td style="padding:3px 8px;">I<sub>z</sub> = 'I_z' cm⁴</td></tr>
'<tr><td style="padding:3px 8px;">W<sub>el,y</sub> = 'W_el,y' cm³</td><td style="padding:3px 8px;">W<sub>pl,y</sub> = 'W_pl,y' cm³</td><td style="padding:3px 8px;">I<sub>t</sub> = 'I_t' cm⁴</td><td style="padding:3px 8px;"></td></tr>
'</table>
I_w = I_z*(h - t_f)^2/4 to cm^6', welvingsconstante, benadering voor I-profielen (NB.NB.4.1)'
ε = sqrt(235 N/mm^2/f_y)

# 2. Geometrie

L = ?*(m)', lengte van de kolom tussen de scharnieren'
b_belast = ?*(m)', belastingbreedte: hart-op-hartafstand van de kolommen'
n_r = ?', aantal gevelregels tussen de einden, op gelijke afstand'

@select regelsteun "De regels houden de buitenflens zijdelings vast (gekoppeld aan een windverband)"
  Ja = 1
  Nee = 0
@end

L_st = L/(n_r + 1)', afstand tussen de regels'
#hide
k_st = if(regelsteun ≡ 1 and n_r ≥ 1; 1; 0)
L_cr,z = if(k_st ≡ 1; L_st; L)
#show
L_cr,y = L', kniklengte om de y-as'
L_cr,z', kniklengte om de z-as: L_st als de regels de flens steunen, anders L'
#if L < 5*h
    '<b style="color:#b45309">L/h < 5: de rekenregels van bijlage NB.NB gelden hier niet (NB.NB.1(2)); toets de gedrukte rand volgens NB.NB.4.2(3).</b>
#end if

# 3. Wind (NEN-EN 1991-1-4 met NB)

@select windbron "Wind op de gevel"
  Uit de projectgegevens = 1
  q_p zelf invullen = 2
  Netto druk en zuiging zelf invullen = 3
@end

#if windbron ≡ 3
    w_d,hand = ?*(kN/m^2)', netto winddruk op de gevel'
    w_z,hand = ?*(kN/m^2)', netto windzuiging op de gevel, als positieve waarde'
    w_d,k = w_d,hand
    w_z,k = w_z,hand
#else
    z_wind = ?*(m)', hoogte van het gebouw, referentiehoogte z_e (figuur 7.4)'
    d_geb = ?*(m)', diepte van het gebouw, loodrecht op deze gevel'
    a_hoek = ?*(m)', afstand van de kolom tot de dichtstbijzijnde hoek van het gebouw'
#end if
#if windbron ≡ 1
    #hide
    vb0_ruw = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
    z0_ruw = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
    zmin_ruw = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
    ze_ruw = max(z_wind/(1*m); zmin_ruw)
    verh = ze_ruw/z0_ruw
    K_prob = if(windgebied ≡ 1; 0.2; if(windgebied ≡ 2; 0.234; 0.281))
    t_prob = max(DesignLife; 50)
    cprob_ruw = sqrt((1 - K_prob*log(-log(1 - 1/t_prob)))/(1 - K_prob*log(-log(0.98))))
    vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*cprob_ruw*vb0_ruw
    #show
    v_b0 = vb0_ruw*(m/s)', basiswindsnelheid (tabel NB.1); c_dir = c_season = 1'
    #if DesignLife > 50
        c_prob = cprob_ruw', ontwerplevensduur boven 50 jaar: (4.2) met p = 1/t, K uit tabel NB.2 en n = 0,5 (opmerking 4 bij 4.2)'
    #end if
    z_e = ze_ruw*(m)', gehanteerde hoogte, ten minste z_min (tabel NB.3-4.1)'
    k_r = 0.19*(z0_ruw/0.05)^0.07', terreinfactor (4.5)'
    c_r = k_r*log(verh)', ruwheidsfactor (4.4); c_o = 1'
    v_m = vm_ruw*(m/s)', gemiddelde windsnelheid (4.3)'
    I_v = 1/log(verh)', turbulentie-intensiteit (4.7); k_l = 1'
    q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', extreme stuwdruk (4.8), ρ = 1,25 kg/m³'
#else if windbron ≡ 2
    q_wind_hand = ?*(kN/m^2)', extreme stuwdruk, zelf ingevuld'
    q_p = q_wind_hand
#end if
#if windbron ≠ 3
    A_bel = b_belast*L to m^2', belaste oppervlakte; onder 10 m² tussen c_pe,1 en c_pe,10 (figuur 7.2)'
    hd = z_wind/d_geb', verhouding h/d van het gebouw'
    e_w = min(d_geb; 2*z_wind)', maat e bij wind evenwijdig aan de gevel'
    x_r = max(a_hoek - b_belast/2; 0 m)', afstand van de rand van het belaste vlak tot de hoek'
    #hide
    cpe(c1; c10) = if(A_bel ≥ 10 m^2; c10; if(A_bel ≤ 1 m^2; c1; c1 - (c1 - c10)*log10(A_bel/(1 m^2))))
    zone = if(x_r < e_w/5; 1; if(x_r < e_w; 2; 3))
    #show
    c_pe,D = cpe(1.0; 0.8)', zone D, loefzijde (tabel NB.6 – 7.1)'
    c_pe,E = -0.5 - 0.2*min(max(hd - 1; 0); 4)/4', zone E, lijzijde; lineair tussen h/d = 1 en 5'
    #hide
    c_pe,zij = if(zone ≡ 1; cpe(-1.4; -1.2); if(zone ≡ 2; cpe(-1.1; -0.8); -0.5))
    #show
    'Zone bij wind evenwijdig aan de gevel: <b>'if(zone ≡ 1; "A"; if(zone ≡ 2; "B"; "C"))'</b> (figuur 7.5).
    c_pe,zij', zijgevel'
    c_pe,z = min(c_pe,zij; c_pe,E)', ongunstigste zuiging'
    w_d,k = (c_pe,D + 0.3)*q_p', netto druk, met c_pi = −0,3 (onderdruk binnen)'
    w_z,k = (0.2 - c_pe,z)*q_p', netto zuiging, met c_pi = +0,2 (overdruk binnen, 7.2.9(6))'
#end if

# 4. Belasting op de kolom

'<i>Twee combinaties: met wind als hoofdbelasting, en zonder wind met de grootste drukkracht (ψ<sub>0</sub> = 0 voor wind).</i>
N_Ed = ?*(kN)', drukkracht in de combinatie met wind als hoofdbelasting, rekenwaarde'
N_Ed,max = ?*(kN)', grootste drukkracht, in de combinatie zonder wind; bij 0 of minder dan N_Ed telt N_Ed'
#hide
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
#show
γ_Q', bij de gevolgklasse uit de projectgegevens (tabel NB.4 of NB.5 van NEN-EN 1990)'
q_d,Ed = γ_Q*w_d,k*b_belast to kN/m', winddruk op de kolom'
q_z,Ed = γ_Q*w_z,k*b_belast to kN/m', windzuiging op de kolom'
M_d,Ed = q_d,Ed*L^2/8 to kN*m', bij winddruk'
M_z,Ed = q_z,Ed*L^2/8 to kN*m', bij windzuiging'
M_Ed = max(M_d,Ed; M_z,Ed) to kN*m
V_Ed = max(q_d,Ed; q_z,Ed)*L/2 to kN

# 5. Doorsnedeklasse (tabel 5.2)

c_f = (b_p - t_w - 2*r)/2', uitstekend deel van de flens'
c_w = h - 2*t_f - 2*r', vlak deel van het lijf'
#hide
k_f = c_f/t_f/ε
f_klasse = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
α_w = min(1; 0.5*(1 + N_Ed/(c_w*t_w*f_y)))
σ_1 = N_Ed/A + M_Ed*c_w/(2*I_y)
σ_2 = N_Ed/A - M_Ed*c_w/(2*I_y)
ψ_w = max(σ_2/max(σ_1; 0.001 N/mm^2); -3)
g_1 = if(α_w > 0.5; 396/(13*α_w - 1); 36/α_w)
g_2 = if(α_w > 0.5; 456/(13*α_w - 1); 41.5/α_w)
g_3 = if(ψ_w > -1; 42/(0.67 + 0.33*ψ_w); 62*(1 - ψ_w)*sqrt(-ψ_w))
k_w = c_w/t_w/ε
w_klasse = if(k_w ≤ g_1; 1; if(k_w ≤ g_2; 2; if(k_w ≤ g_3; 3; 4)))
#show
'Flens, uitstekend deel onder druk: c/t = 'c_f/t_f' = 'k_f'·ε → klasse 'f_klasse'.
'Lijf onder druk en buiging (α = 'α_w', ψ = 'ψ_w'): c/t = 'c_w/t_w' = 'k_w'·ε, grenzen 'g_1'·ε, 'g_2'·ε en 'g_3'·ε → klasse 'w_klasse'.
klasse = max(f_klasse; w_klasse)', doorsnedeklasse'
#if klasse ≡ 4
    '<b style="color:#b91c1c">De doorsnede valt in klasse 4. Daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die deze module niet uitrekent: kies een ander profiel.</b>
#end if
#hide
W_y = if(klasse ≤ 2; W_pl,y; W_el,y)
#show
W_y', W_pl,y in klasse 1 en 2, W_el,y in klasse 3'

# 6. Doorsnede (§6.2)

N_pl,Rd = A*f_y/γ_M0 to kN
M_c,Rd = W_y*f_y/γ_M0 to kN*m
A_f = (2*b_p - t_w - 2*r)*t_f to mm^2', flensdeel buiten het lijf en de afrondingen'
A_v,a = A - A_f to mm^2', afschuifoppervlak van een gewalst I-profiel (6.2.6(3)a)'
A_v = max(A_v,a; (h - 2*t_f)*t_w) to mm^2', ten minste η·h_w·t_w, met η = 1'
V_pl,Rd = A_v*f_y/(sqrt(3)*γ_M0) to kN
UC_V = V_Ed/V_pl,Rd', dwarskracht bij de oplegging'
#if V_Ed ≤ 0.5*V_pl,Rd
    '<i>V<sub>Ed</sub> ≤ 0,5·V<sub>pl,Rd</sub>: het momentdraagvermogen hoeft voor de dwarskracht niet te worden verminderd (6.2.8(2)).</i>
#else
    '<b style="color:#b45309">V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub>: de vermindering volgens 6.2.8(3) is niet uitgewerkt. Toets de doorsnede waar moment en dwarskracht samen groot zijn apart.</b>
#end if
'<h6>Buiging met normaalkracht in het midden</h6>
#if klasse ≤ 2
    n = N_Ed/N_pl,Rd
    a_w = min((A - 2*b_p*t_f)/A; 0.5)
    #if N_Ed ≤ min(0.25*N_pl,Rd; 0.5*(h - 2*t_f)*t_w*f_y/γ_M0)
        M_N,Rd = M_c,Rd', geen vermindering door de normaalkracht (6.33 en 6.34)'
    #else
        M_N,Rd = max(min(M_c,Rd*(1 - n)/(1 - 0.5*a_w); M_c,Rd); 0 kN*m) to kN*m', (6.36)'
    #end if
    #if n < 1
        UC_d = M_Ed/M_N,Rd
    #else
        UC_d = n + M_Ed/M_c,Rd', de normaalkracht alleen is al groter dan N_pl,Rd'
    #end if
#else
    UC_d = N_Ed/N_pl,Rd + M_Ed/M_c,Rd', (6.42), elastisch'
#end if

# 7. Knik (§6.3.1)

'Tabel 6.2, gewalst I-profiel met h/b = 'h/b_p': kromme 'if(h/b_p > 1.2; "a"; "b")' om de y-as en 'if(h/b_p > 1.2; "b"; "c")' om de z-as.
#hide
α_y = if(h/b_p > 1.2; 0.21; 0.34)
α_z = if(h/b_p > 1.2; 0.34; 0.49)
#show
N_cr,y = pi^2*E*I_y/L_cr,y^2 to kN
λ_y = sqrt(A*f_y/N_cr,y)', relatieve slankheid om de y-as'
Φ_y = 0.5*(1 + α_y*(λ_y - 0.2) + λ_y^2)
χ_y = min(1; 1/(Φ_y + sqrt(Φ_y^2 - λ_y^2)))
N_cr,z = pi^2*E*I_z/L_cr,z^2 to kN
λ_z = sqrt(A*f_y/N_cr,z)', relatieve slankheid om de z-as'
Φ_z = 0.5*(1 + α_z*(λ_z - 0.2) + λ_z^2)
χ_z = min(1; 1/(Φ_z + sqrt(Φ_z^2 - λ_z^2)))
#if k_st ≡ 1
    '<h6>Torsieknik om de door de regels vastgehouden as</h6>
    '<i>De regels grijpen op de buitenflens aan (NB bij 6.3.1.4(5)): het profiel draait om de as van de regels, op a = h/2 van het zwaartepunt, met gaffels aan de einden; kromme als om de z-as (6.3.1.4(3)).</i>
    a_r = h/2', afstand van de as van de regels tot het zwaartepunt'
    i_s = sqrt((I_y + I_z)/A + a_r^2) to mm', traagheidsstraal om de as van de regels'
    K_z = pi^2*E*I_z*a_r^2/L^2 to kN*m^2', zijdelingse buiging, meegedraaid om de as van de regels'
    K_w = pi^2*E*I_w/L^2 to kN*m^2', welving'
    K_t = G*I_t to kN*m^2', wringing'
    N_cr,TF = (K_z + K_w + K_t)/i_s^2 to kN
    λ_TF = sqrt(A*f_y/N_cr,TF)
    Φ_TF = 0.5*(1 + α_z*(λ_TF - 0.2) + λ_TF^2)
    χ_TF = min(1; 1/(Φ_TF + sqrt(Φ_TF^2 - λ_TF^2)))
#else
    '<i>Zonder steun van de regels hoeft een gewalst I-profiel niet op torsieknik of torsiestabiliteit te worden getoetst (NB bij 6.3.1.4(4) en (5)).</i>
    #hide
    λ_TF = 0
    χ_TF = 1
    #show
#end if
χ_zT = min(χ_z; χ_TF)', zijdelings: buigknik om z of torsieknik'
λ_zT = max(λ_z; λ_TF)
'<h6>Knik zonder buiging, met de grootste drukkracht</h6>
#hide
λ_p,w = c_w/t_w/(28.4*ε*2)
ρ_w = if(c_w/t_w ≤ 42*ε; 1; min(1; (λ_p,w - 0.22)/λ_p,w^2))
#show
#if ρ_w < 1
    '<i>Bij zuivere druk valt het lijf in klasse 4 (c/t > 42ε): effectieve breedte volgens NEN-EN 1993-1-5 §4.4 met ψ = 1 en k<sub>σ</sub> = 4. χ blijft bepaald met het bruto oppervlak; dat ligt aan de veilige kant.</i>
    λ_p,w', plaatslankheid van het lijf'
    ρ_w', reductiefactor van het lijf (§4.4(2))'
    A_eff = A - (1 - ρ_w)*c_w*t_w to cm^2', effectief oppervlak bij zuivere druk'
#else
    #hide
    A_eff = A
    #show
#end if
N_max = max(N_Ed; N_Ed,max) to kN', grootste drukkracht van de twee combinaties'
N_b,Rd = min(χ_y; χ_zT)*A_eff*f_y/γ_M1 to kN', (6.47), bij klasse 4 (6.48)'
UC_N = N_max/N_b,Rd

# 8. Kip (§6.3.2.3 en bijlage NB.NB)

'<i>M<sub>cr</sub> volgens bijlage NB.NB, met k<sub>red</sub> = 1 voor een gewalst profiel (NB.NB.4); C<sub>2</sub> is negatief bij een last op de gedrukte flens. Kipkromme 'if(h/b_p ≤ 2; "b"; "c")' (tabel 6.5, h/b = 'h/b_p'), λ̄<sub>LT,0</sub> = 0,4 en β = 0,75 (NB bij 6.3.2.3).</i>
S = sqrt(E*I_w/(G*I_t)) to m
#hide
α_LT = if(h/b_p ≤ 2; 0.34; 0.49)
M_cr(Lk; C1; C2) = pi*C1/Lk*(sqrt(1 + pi^2*S^2*(C2^2 + 1)/Lk^2) + pi*C2*S/Lk)*sqrt(E*I_z*G*I_t)
χ_lt(λ) = min(1; 1/λ^2; 1/(0.5*(1 + α_LT*(λ - 0.4) + 0.75*λ^2) + sqrt((0.5*(1 + α_LT*(λ - 0.4) + 0.75*λ^2))^2 - 0.75*λ^2)))
#show
'<h6>Winddruk: de buitenflens is gedrukt</h6>
#if k_st ≡ 1
    '<i>Per veld tussen de regels: L<sub>kip</sub> = (1,4 − 0,8·β)·L<sub>st</sub>, tussen 1,0 en 1,4·L<sub>st</sub>, C<sub>1</sub> = 1,75 − 1,05·β + 0,3·β² ≤ 2,3 en C<sub>2</sub> = 0 (tabel NB.NB.1, geval 1), met β de verhouding van de eindmomenten van het veld. De kleinste χ<sub>LT</sub> geldt (NB.NB.2); de kolom is symmetrisch, dus de tabel toont de onderste helft.</i>
    N_v = n_r + 1', aantal velden'
    #hide
    χ_LT,d = 1
    #show
    '<table style="border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:3px 8px;">Veld</th><th style="padding:3px 8px; text-align:right;">β</th><th style="padding:3px 8px; text-align:right;">L<sub>kip</sub> (m)</th><th style="padding:3px 8px; text-align:right;">C<sub>1</sub></th><th style="padding:3px 8px; text-align:right;">M<sub>cr</sub> (kNm)</th><th style="padding:3px 8px; text-align:right;">λ̄<sub>LT</sub></th><th style="padding:3px 8px; text-align:right;">χ<sub>LT</sub></th></tr>
    #for i = 1 : ceil(N_v/2)
        #hide
        m_a = (i - 1)*(N_v - i + 1)
        m_b = i*(N_v - i)
        β_v = min(m_a; m_b)/max(m_a; m_b)
        L_kip,v = min(max(1.4 - 0.8*β_v; 1); 1.4)*L_st
        C_1,v = min(1.75 - 1.05*β_v + 0.3*β_v^2; 2.3)
        M_cr,v = M_cr(L_kip,v; C_1,v; 0) to kN*m
        λ_LT,v = sqrt(W_y*f_y/M_cr,v)
        χ_LT,v = χ_lt(λ_LT,v)
        χ_LT,d = min(χ_LT,d; χ_LT,v)
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">'i'</td><td style="padding:3px 8px; text-align:right;">'β_v'</td><td style="padding:3px 8px; text-align:right;">'L_kip,v'</td><td style="padding:3px 8px; text-align:right;">'C_1,v'</td><td style="padding:3px 8px; text-align:right;">'M_cr,v'</td><td style="padding:3px 8px; text-align:right;">'λ_LT,v'</td><td style="padding:3px 8px; text-align:right;">'χ_LT,v'</td></tr>
    #loop
    '</table>
    χ_LT,d', kleinste waarde van de velden'
#else
    '<i>Gedrukte flens vrij tussen de gaffels, last op die flens: C<sub>1</sub> = 1,13 en C<sub>2</sub> = −0,45 (tabel NB.NB.1, geval 2), geëxtrapoleerd naar het buitenvlak (NB.NB.4.3).</i>
    C_2,d = -0.45*h/(h - t_f)
    M_cr,d = M_cr(L; 1.13; C_2,d) to kN*m
    λ_LT,d = sqrt(W_y*f_y/M_cr,d)
    χ_LT,d = χ_lt(λ_LT,d)
#end if
M_b,Rd,d = χ_LT,d*W_y*f_y/γ_M1 to kN*m
UC_LT,d = M_d,Ed/M_b,Rd,d
'<h6>Windzuiging: de binnenflens is gedrukt</h6>
'<i>L<sub>kip</sub> = L, last op de getrokken flens: C<sub>1</sub> = 1,13 en C<sub>2</sub> = +0,45 (tabel NB.NB.1, geval 2); de steun van de regels aan die flens is verwaarloosd.</i>
M_cr,z = M_cr(L; 1.13; 0.45) to kN*m
λ_LT,z = sqrt(W_y*f_y/M_cr,z)
χ_LT,z = χ_lt(λ_LT,z)
M_b,Rd,z = χ_LT,z*W_y*f_y/γ_M1 to kN*m
UC_LT,z = M_z,Ed/M_b,Rd,z

# 9. Druk met buiging (§6.3.3, bijlage B)

'<i>k<sub>yy</sub> en k<sub>zy</sub> uit tabel B.2 (NB bij 6.3.3(5)); C<sub>my</sub> = 0,95 (tabel B.3); C<sub>mLT</sub> = 0,95 over de hele lengte, 1,0 per veld tussen de regels. Aan de z-kant telt min(χ<sub>z</sub>; χ<sub>TF</sub>).</i>
N_Rk = A*f_y to kN
n_y = N_Ed/(χ_y*N_Rk/γ_M1)
n_z = N_Ed/(χ_zT*N_Rk/γ_M1)
C_my = 0.95
#hide
C_mLT,d = if(k_st ≡ 1; 1.0; 0.95)
#show
C_mLT,d', winddruk'
C_mLT,z = 0.95', windzuiging'
#if klasse ≤ 2
    #hide
    k_yy = C_my*min(1 + (λ_y - 0.2)*n_y; 1 + 0.8*n_y)
    k_zy(Cm) = if(λ_zT < 0.4; min(0.6 + λ_zT; 1 - 0.1*λ_zT*n_z/(Cm - 0.25)); max(1 - 0.1*λ_zT*n_z/(Cm - 0.25); 1 - 0.1*n_z/(Cm - 0.25)))
    #show
#else
    #hide
    k_yy = C_my*min(1 + 0.6*λ_y*n_y; 1 + 0.6*n_y)
    k_zy(Cm) = max(1 - 0.05*λ_zT*n_z/(Cm - 0.25); 1 - 0.05*n_z/(Cm - 0.25))
    #show
#end if
k_yy', tabel B.2'
#hide
k_zy,d = k_zy(C_mLT,d)
k_zy,z = k_zy(C_mLT,z)
#show
k_zy,d', winddruk'
k_zy,z', windzuiging'
'<h6>Winddruk</h6>
UC_661,d = n_y + k_yy*M_d,Ed/M_b,Rd,d', (6.61)'
UC_662,d = n_z + k_zy,d*M_d,Ed/M_b,Rd,d', (6.62)'
'<h6>Windzuiging</h6>
UC_661,z = n_y + k_yy*M_z,Ed/M_b,Rd,z', (6.61)'
UC_662,z = n_z + k_zy,z*M_z,Ed/M_b,Rd,z', (6.62)'

# 10. Doorbuiging (§7.2)

q_k = max(w_d,k; w_z,k)*b_belast to kN/m', karakteristieke wind op de kolom'
δ_max = 5*q_k*L^4/(384*E*I_y) to mm', doorbuiging in het midden'

@select VerplGrens "Toelaatbare doorbuiging"
  L/300 = 300
  L/250 = 250
  L/200 = 200
@end

δ_lim = L/VerplGrens to mm
UC_δ = δ_max/δ_lim

# 11. Tekening

#hide
'Links het aanzicht van de kolom met de gevel, de regels en de wind; ernaast de momentenlijn. Rechts twee horizontale doorsneden: welke flens gedrukt is, en of de regel die flens steunt.
ky0 = 50
ky1 = 318
kx = 196
sy(t) = ky0 + (ky1 - ky0)*t
mx0 = 250
mamp = 70
q_max = max(q_d,Ed; q_z,Ed)
dx = 452
dy1 = 96
dy2 = 250
#show
'<svg viewbox="0 0 520 350" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:370px;">
'  <!-- wind op de gevel -->
#for i = 0 : 10
'  <line x1="92" y1="'sy(i/10)'" x2="'kx - 36'" y2="'sy(i/10)'" style="stroke:#2563eb; stroke-width:1.6"/>
'  <polygon points="'kx - 27','sy(i/10)' 'kx - 37','sy(i/10) - 4' 'kx - 37','sy(i/10) + 4'" style="fill:#2563eb"/>
#loop
'  <line x1="92" y1="'ky0'" x2="92" y2="'ky1'" style="stroke:#2563eb; stroke-width:2"/>
'  <text x="86" y="'sy(0.5) - 4'" text-anchor="end" style="fill:#2563eb; font-weight:700">q<tspan baseline-shift="sub" font-size="8">Ed</tspan> = 'q_max'</text>
'  <text x="86" y="'sy(0.5) + 10'" text-anchor="end" style="fill:#2563eb">kN/m</text>
'  <!-- gevelbekleding -->
'  <line x1="'kx - 24'" y1="'ky0 - 6'" x2="'kx - 24'" y2="'ky1 + 6'" style="stroke:#94a3b8; stroke-width:2.4"/>
'  <!-- de kolom in aanzicht: twee flenzen -->
'  <rect x="'kx - 8'" y="'ky0'" width="16" height="'ky1 - ky0'" style="fill:#e2e8f0; stroke:none"/>
'  <line x1="'kx - 8'" y1="'ky0'" x2="'kx - 8'" y2="'ky1'" style="stroke:#334155; stroke-width:2.2"/>
'  <line x1="'kx + 8'" y1="'ky0'" x2="'kx + 8'" y2="'ky1'" style="stroke:#334155; stroke-width:2.2"/>
#if n_r ≥ 1
    #for i = 1 : n_r
    '  <rect x="'kx - 23'" y="'sy(i/(n_r + 1)) - 5'" width="15" height="10" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    #loop
    '  <text x="'kx + 13'" y="'sy(1/(n_r + 1)) + 4'" style="fill:#92400e; stroke:#fff; stroke-width:3; paint-order:stroke">regel</text>
#end if
'  <!-- scharnieren -->
'  <polygon points="'kx','ky1' 'kx - 9','ky1 + 15' 'kx + 9','ky1 + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <line x1="'kx - 13'" y1="'ky1 + 15'" x2="'kx + 13'" y2="'ky1 + 15'" style="stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'kx','ky0' 'kx - 9','ky0 - 15' 'kx + 9','ky0 - 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <!-- normaalkracht -->
'  <line x1="'kx'" y1="'ky0 - 44'" x2="'kx'" y2="'ky0 - 24'" style="stroke:#b91c1c; stroke-width:2.6"/>
'  <polygon points="'kx','ky0 - 17' 'kx - 5','ky0 - 27' 'kx + 5','ky0 - 27'" style="fill:#b91c1c"/>
#if N_Ed,max > N_Ed
'  <text x="'kx + 9'" y="'ky0 - 30'" style="fill:#b91c1c; font-weight:700">N<tspan baseline-shift="sub" font-size="8">Ed</tspan> = 'N_Ed' kN; N<tspan baseline-shift="sub" font-size="8">Ed,max</tspan> = 'N_Ed,max' kN</text>
#else
'  <text x="'kx + 9'" y="'ky0 - 30'" style="fill:#b91c1c; font-weight:700">N<tspan baseline-shift="sub" font-size="8">Ed</tspan> = 'N_Ed' kN</text>
#end if
'  <text x="'kx + 13'" y="'sy(0.5) + 26'" style="fill:#334155; stroke:#fff; stroke-width:3; paint-order:stroke">L = 'L' m</text>
'  <!-- momentenlijn, gevuld aan de trekzijde -->
'  <line x1="'mx0'" y1="'ky0'" x2="'mx0'" y2="'ky1'" style="stroke:#374151; stroke-width:1.4"/>
#for i = 0 : 19
'  <polygon points="'mx0','sy(i/20)' 'mx0 + mamp*4*(i/20)*(1 - i/20)','sy(i/20)' 'mx0 + mamp*4*((i + 1)/20)*(1 - (i + 1)/20)','sy((i + 1)/20)' 'mx0','sy((i + 1)/20)'" style="fill:rgba(239,68,68,0.22); stroke:none"/>
'  <line x1="'mx0 + mamp*4*(i/20)*(1 - i/20)'" y1="'sy(i/20)'" x2="'mx0 + mamp*4*((i + 1)/20)*(1 - (i + 1)/20)'" y2="'sy((i + 1)/20)'" style="stroke:#dc2626; stroke-width:2; stroke-linecap:round"/>
#loop
'  <circle cx="'mx0 + mamp'" cy="'sy(0.5)'" r="2.6" style="fill:#dc2626"/>
'  <text x="'mx0 + mamp + 6'" y="'sy(0.5) + 4'" style="fill:#dc2626; font-weight:700; stroke:#fff; stroke-width:3; paint-order:stroke">'M_Ed' kNm</text>
'  <text x="'mx0'" y="'ky0 - 10'" style="fill:#dc2626; font-weight:700">M-lijn</text>
'  <!-- doorsnede bij winddruk: de buitenflens is gedrukt -->
'  <text x="'dx - 20'" y="'dy1 - 34'" text-anchor="middle" style="fill:#334155; font-weight:700">winddruk</text>
'  <line x1="'dx - 40'" y1="'dy1 - 24'" x2="'dx - 40'" y2="'dy1 + 24'" style="stroke:#94a3b8; stroke-width:2.4"/>
'  <line x1="'dx - 74'" y1="'dy1'" x2="'dx - 50'" y2="'dy1'" style="stroke:#2563eb; stroke-width:2"/>
'  <polygon points="'dx - 43','dy1' 'dx - 52','dy1 - 4' 'dx - 52','dy1 + 4'" style="fill:#2563eb"/>
#if n_r ≥ 1
    '  <rect x="'dx - 38'" y="'dy1 - 5'" width="14" height="10" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
#end if
'  <line x1="'dx - 22'" y1="'dy1'" x2="'dx + 22'" y2="'dy1'" style="stroke:#334155; stroke-width:2.6"/>
'  <line x1="'dx - 22'" y1="'dy1 - 15'" x2="'dx - 22'" y2="'dy1 + 15'" style="stroke:#dc2626; stroke-width:4.5"/>
'  <line x1="'dx + 22'" y1="'dy1 - 15'" x2="'dx + 22'" y2="'dy1 + 15'" style="stroke:#334155; stroke-width:4.5"/>
'  <text x="'dx - 20'" y="'dy1 + 40'" text-anchor="middle" style="fill:#dc2626">'if(k_st ≡ 1; "gedrukte flens gesteund"; "gedrukte flens vrij")'</text>
'  <!-- doorsnede bij windzuiging: de binnenflens is gedrukt en vrij -->
'  <text x="'dx - 20'" y="'dy2 - 34'" text-anchor="middle" style="fill:#334155; font-weight:700">windzuiging</text>
'  <line x1="'dx - 40'" y1="'dy2 - 24'" x2="'dx - 40'" y2="'dy2 + 24'" style="stroke:#94a3b8; stroke-width:2.4"/>
'  <line x1="'dx - 50'" y1="'dy2'" x2="'dx - 70'" y2="'dy2'" style="stroke:#2563eb; stroke-width:2"/>
'  <polygon points="'dx - 77','dy2' 'dx - 68','dy2 - 4' 'dx - 68','dy2 + 4'" style="fill:#2563eb"/>
#if n_r ≥ 1
    '  <rect x="'dx - 38'" y="'dy2 - 5'" width="14" height="10" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
#end if
'  <line x1="'dx - 22'" y1="'dy2'" x2="'dx + 22'" y2="'dy2'" style="stroke:#334155; stroke-width:2.6"/>
'  <line x1="'dx - 22'" y1="'dy2 - 15'" x2="'dx - 22'" y2="'dy2 + 15'" style="stroke:#334155; stroke-width:4.5"/>
'  <line x1="'dx + 22'" y1="'dy2 - 15'" x2="'dx + 22'" y2="'dy2 + 15'" style="stroke:#dc2626; stroke-width:4.5"/>
'  <text x="'dx - 20'" y="'dy2 + 40'" text-anchor="middle" style="fill:#dc2626">gedrukte flens vrij</text>
'  <text x="'dx - 40'" y="'ky1 + 22'" text-anchor="middle" style="fill:#64748b">buiten</text>
'  <text x="'dx + 22'" y="'ky1 + 22'" text-anchor="middle" style="fill:#64748b">binnen</text>
'</svg>'

# 12. Samenvatting

#hide
UC_max = max(UC_V; UC_d; UC_N; UC_LT,d; UC_LT,z; UC_661,d; UC_662,d; UC_661,z; UC_662,z; UC_δ)
#show
UC_max', grootste van de toetsen hieronder'
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Dwarskracht</td><td style="padding:4px 8px;">§6.2.6</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_V)'">'UC_V'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_V)'">'oordeel(UC_V)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Doorsnede, buiging met normaalkracht</td><td style="padding:4px 8px;">§6.2.9</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_d)'">'UC_d'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_d)'">'oordeel(UC_d)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Knik en torsieknik, grootste N</td><td style="padding:4px 8px;">§6.3.1</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_N)'">'UC_N'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_N)'">'oordeel(UC_N)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kip, winddruk / windzuiging</td><td style="padding:4px 8px;">§6.3.2.3, NB.NB</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(max(UC_LT,d; UC_LT,z))'">'UC_LT,d' / 'UC_LT,z'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(max(UC_LT,d; UC_LT,z))'">'oordeel(max(UC_LT,d; UC_LT,z))'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk met buiging, winddruk</td><td style="padding:4px 8px;">(6.61) / (6.62)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(max(UC_661,d; UC_662,d))'">'UC_661,d' / 'UC_662,d'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(max(UC_661,d; UC_662,d))'">'oordeel(max(UC_661,d; UC_662,d))'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk met buiging, windzuiging</td><td style="padding:4px 8px;">(6.61) / (6.62)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(max(UC_661,z; UC_662,z))'">'UC_661,z' / 'UC_662,z'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(max(UC_661,z; UC_662,z))'">'oordeel(max(UC_661,z; UC_662,z))'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Doorbuiging</td><td style="padding:4px 8px;">§7.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_δ)'">'UC_δ'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_δ)'">'oordeel(UC_δ)'</td></tr>
'</table>

#if klasse ≡ 4
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de kolom voldoet niet</b>: de doorsnede valt in klasse 4, en die valt buiten deze module.</span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de kolom voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de kolom voldoet niet</b></span>
#end if

'<hr/>
'<i>Uitgangspunten:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Gaffels aan beide einden; eigen gewicht, excentriciteit van N en het tweede-orde-effect van de doorbuiging niet meegenomen.</li><li>De regels steunen de buitenflens alleen als ze aan een vast punt zijn gekoppeld, zoals een windverband.</li><li>Steun van de regels aan de getrokken flens en de factor f uit 6.3.2.3(2) verwaarloosd; beide aan de veilige kant.</li><li>Wind gelijkmatig over de hoogte, met q<sub>p</sub> op de gebouwhoogte; bij een dominante opening (7.2.9(5)) de netto wind zelf invullen.</li><li>Verbindingen en regels niet getoetst.</li></ul>
`;
