/**
 * EN 1995-1-1 (Eurocode 5) — Houtconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1995-1-1:2005+A2:2014+NB:2013
 *
 * Materiaalwaarden: EN 338 (massief) en EN 14080 (gelamineerd), per blad in
 * één verborgen matrix. k_mod volgt klimaatklasse × belastingduurklasse
 * (tabel 3.1), γ_M het houttype (tabel 2.3 NB).
 *
 * Elk toetsblad sluit af met de slotzin "Maatgevende UC = …", die de afdruk
 * als oordeel leest. Controle: scripts/check-eurocode5.mjs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Buiging (Bending) — EN 1995-1-1 §6.1.6
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.6 — Buiging */
export const ec5Buiging = `# Toetsing Buiging — EN 1995-1-1 §6.1.6

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C14 = 1
C16 = 2
C18 = 3
C20 = 4
C22 = 5
C24 = 6
C27 = 7
C30 = 8
C35 = 9
C40 = 10
D30 = 11
D35 = 12
D40 = 13
D50 = 14
GL20h = 15
GL24h = 16
GL28h = 17
GL32h = 18
GL36h = 19
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | γ_M] — γ_M 1,3 massief en 1,25 gelamineerd (tabel 2.3 NB)
materialen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19 |14; 16; 18; 20; 22; 24; 27; 30; 35; 40; 30; 35; 40; 50; 20; 24; 28; 32; 36 |1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.3; 1.25; 1.25; 1.25; 1.25; 1.25]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 3)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke buigsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_mk
gamma_M
k_mod

'Rekenwaarde buigsterkte (art. 2.4.1, formule 2.14):<span class="alleen-scherm"></span>

f_md = k_mod * f_mk / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

'Weerstandsmoment:<span class="alleen-scherm"></span>

W_y = b * h^2 / 6 to mm^3

'Traagheidsmoment:<span class="alleen-scherm"></span>

I_y = b * h^3 / 12 to mm^4

## Belasting

L = 3000 mm
q_d = 5.0 kN/m

'Maatgevend moment (gelijkmatig verdeelde belasting):<span class="alleen-scherm"></span>

M_Ed = q_d * L^2 / 8 to kN*m

## Toetsing buiging (art. 6.1.6, formule 6.11)

'Buigspanning:<span class="alleen-scherm"></span>

sigma_md = M_Ed / W_y to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_buiging = sigma_md / f_md

#if UC_buiging ≤ 1
  '<b>Maatgevende UC = 'UC_buiging'</b><span style="color: green"> ≤ 1,0 → <b>buiging voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_buiging'</b><span style="color: red"> > 1,0 → <b>buiging voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Afschuiving (Shear) — EN 1995-1-1 §6.1.7
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.7 — Afschuiving */
export const ec5Afschuiving = `# Toetsing Afschuiving — EN 1995-1-1 §6.1.7

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke afschuifsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_vk
gamma_M
k_mod

'Rekenwaarde afschuifsterkte (formule 2.14):<span class="alleen-scherm"></span>

f_vd = k_mod * f_vk / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

'Scheurfactor k_cr voor een ligger met een prismatische doorsnede (NB art. 6.1.7(2)):<span class="alleen-scherm"></span>

k_cr = 1.0

'Effectieve breedte (formule 6.13a):<span class="alleen-scherm"></span>

b_ef = k_cr * b to mm

## Belasting

L = 3000 mm
q_d = 5.0 kN/m

'Maatgevende dwarskracht:<span class="alleen-scherm"></span>

V_Ed = q_d * L / 2 to kN

## Toetsing afschuiving (art. 6.1.7, formule 6.13)

'Schuifspanning (rechthoekige doorsnede):<span class="alleen-scherm"></span>

tau_d = 3/2 * V_Ed / (b_ef * h) to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_afschuiving = tau_d / f_vd

#if UC_afschuiving ≤ 1
  '<b>Maatgevende UC = 'UC_afschuiving'</b><span style="color: green"> ≤ 1,0 → <b>afschuiving voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_afschuiving'</b><span style="color: red"> > 1,0 → <b>afschuiving voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Druk evenwijdig aan de vezel — EN 1995-1-1 §6.1.4
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.4 — Druk evenwijdig aan de vezel */
export const ec5Druk = `# Toetsing Druk Evenwijdig — EN 1995-1-1 §6.1.4

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_c0k = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke druksterkte evenwijdig, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_c0k
gamma_M
k_mod

'Rekenwaarde druksterkte (formule 2.14):<span class="alleen-scherm"></span>

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

## Doorsnede

b = 100 mm
h = 100 mm

'Oppervlakte:<span class="alleen-scherm"></span>

A = b * h to mm^2

## Belasting

N_Ed = 50 kN

## Toetsing druk evenwijdig (art. 6.1.4, formule 6.2)

'Drukspanning:<span class="alleen-scherm"></span>

sigma_c0d = N_Ed / A to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_druk = sigma_c0d / f_c0d

#if UC_druk ≤ 1
  '<b>Maatgevende UC = 'UC_druk'</b><span style="color: green"> ≤ 1,0 → <b>druk evenwijdig voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_druk'</b><span style="color: red"> > 1,0 → <b>druk evenwijdig voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Druk loodrecht op de vezel — EN 1995-1-1 §6.1.5
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.5 — Druk loodrecht op de vezel */
export const ec5DrukLoodrecht = `# Toetsing Druk Loodrecht — EN 1995-1-1 §6.1.5

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_c90k = hlookup(materialen; sterkteklasse; 1; 5)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
gelamineerd = hlookup(materialen; sterkteklasse; 1; 9)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke druksterkte loodrecht, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_c90k
gamma_M
k_mod

'Rekenwaarde druksterkte loodrecht (formule 2.14):<span class="alleen-scherm"></span>

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

## Geometrie oplegging

'Breedte ligger:<span class="alleen-scherm"></span>

b = 70 mm

'Opleggingslengte (werkelijke contactlengte):<span class="alleen-scherm"></span>

L_opl = 100 mm

@select zijden "Ligging oplegging (art. 6.1.5(1))"
Eindoplegging, balkeinde minder dan 30 mm voorbij de oplegging = 1
Tussenoplegging, of balkeinde minstens 30 mm voorbij de oplegging = 2
@end

@select steunpunttype "Type ondersteuning (art. 6.1.5(3) en (4))"
Discrete oplegging, afstand tot volgende oplegging minstens 2h = 1
Doorgaande ondersteuning, afstand tussen lasten minstens 2h = 2
Overig = 3
@end

#hide
k_c90_massief = if(steunpunttype ≡ 1; 1.5; if(steunpunttype ≡ 2; 1.25; 1.0))
k_c90_gelam = if(steunpunttype ≡ 1; if(L_opl ≤ 400 mm; 1.75; 1.0); if(steunpunttype ≡ 2; 1.5; 1.0))
k_c90 = if(gelamineerd ≡ 1; k_c90_gelam; k_c90_massief)
#show

'Factor k_c90 (art. 6.1.5(3) en (4)):<span class="alleen-scherm"></span>

k_c90

'Effectieve contactlengte (art. 6.1.5(1)):<span class="alleen-scherm"></span>

L_ef = L_opl + zijden * min(30 mm; L_opl) to mm

'Effectief contactoppervlak (formule 6.4):<span class="alleen-scherm"></span>

A_ef = b * L_ef to mm^2

## Belasting

'Oplegreactie:<span class="alleen-scherm"></span>

F_c90d = 15 kN

## Toetsing druk loodrecht (art. 6.1.5, formule 6.3)

'Drukspanning loodrecht (formule 6.4):<span class="alleen-scherm"></span>

sigma_c90d = F_c90d / A_ef to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_c90 = sigma_c90d / (k_c90 * f_c90d)

#if UC_c90 ≤ 1
  '<b>Maatgevende UC = 'UC_c90'</b><span style="color: green"> ≤ 1,0 → <b>druk loodrecht voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_c90'</b><span style="color: red"> > 1,0 → <b>druk loodrecht voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Knik (Buckling) — EN 1995-1-1 §6.3.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.3.2 — Knik (kolommen aan druk) */
export const ec5Knik = `# Toetsing Knik — EN 1995-1-1 §6.3.2

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_c0k = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
E_005 = hlookup(materialen; sterkteklasse; 1; 7)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
beta_c = if(hlookup(materialen; sterkteklasse; 1; 9) ≡ 1; 0.1; 0.2)
#show

'Karakteristieke druksterkte evenwijdig en E_005 (EN 338 / EN 14080), partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_c0k
E_005
gamma_M
k_mod

'Rekenwaarde druksterkte:<span class="alleen-scherm"></span>

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

'Factor beta_c (formule 6.29): 0,2 massief, 0,1 gelamineerd:<span class="alleen-scherm"></span>

beta_c

## Doorsnede

b = 100 mm
h = 100 mm

A = b * h to mm^2

## Systeem

'Kniklengte:<span class="alleen-scherm"></span>

L_k = 3000 mm

## Knikberekening (art. 6.3.2)

'Slankheid om de zwakke as (kleinste afmeting van de doorsnede):<span class="alleen-scherm"></span>

lambda_z = L_k / (min(b; h) / sqrt(12))

'Relatieve slankheid (formule 6.22):<span class="alleen-scherm"></span>

lambda_relz = lambda_z / pi * sqrt(f_c0k / E_005)

'Factor k_z (formule 6.28):<span class="alleen-scherm"></span>

k_z = 0.5 * (1 + beta_c * (lambda_relz - 0.3) + lambda_relz^2)

'Knikfactor k_cz (formule 6.26, ten hoogste 1 volgens art. 6.3.2(2)):<span class="alleen-scherm"></span>

k_cz = min(1; 1 / (k_z + sqrt(k_z^2 - lambda_relz^2)))

## Belasting

N_Ed = 80 kN

## Toetsing knik (art. 6.3.2, formule 6.23 vereenvoudigd)

'Drukspanning:<span class="alleen-scherm"></span>

sigma_c0d = N_Ed / A to N/mm^2

'Unity check knik:<span class="alleen-scherm"></span>

UC_knik = sigma_c0d / (k_cz * f_c0d)

#if lambda_relz < 0.3
  Relatieve slankheid < 0,3: k_c = 1 (art. 6.3.2(2)).
#end if

#if UC_knik ≤ 1
  '<b>Maatgevende UC = 'UC_knik'</b><span style="color: green"> ≤ 1,0 → <b>knik voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_knik'</b><span style="color: red"> > 1,0 → <b>knik voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Doorbuiging (Deflection) — EN 1995-1-1 §7.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §7.2 — Doorbuiging */
export const ec5Doorbuiging = `# Toetsing Doorbuiging — EN 1995-1-1 §7.2 / §2.2.3

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingcat "Belastingcategorie van de veranderlijke belasting (tabel NB.2 — A1.1)"
A — woon- en verblijfsruimtes = 1
B — kantoorruimtes = 2
C — bijeenkomstruimtes = 3
D — winkelruimtes = 4
E — opslagruimtes = 5
F — verkeersruimte, voertuig ≤ 25 kN = 6
G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
H — daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

@select toepassing "Grens bijkomende doorbuiging (NB bij NEN-EN 1990, A1.4.3(3))"
Vloer, of dak dat intensief door personen wordt gebruikt — 0,003·L = 1
Vloer met scheurgevoelige scheidingswanden — L/500 = 2
Overig dak — L/250 = 3
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'ψ-factoren (NEN-EN 1990 tabel NB.2 — A1.1): [categorie | ψ_0 | ψ_1 | ψ_2]
psi_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0 |0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2 |0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0]
E_mean = hlookup(materialen; sterkteklasse; 1; 6)*N/mm^2
k_def = if(klimaatklasse ≡ 1; 0.60; if(klimaatklasse ≡ 2; 0.80; 2.00))
psi_1 = hlookup(psi_tabel; belastingcat; 1; 3)
psi_2 = hlookup(psi_tabel; belastingcat; 1; 4)
'Bijkomende doorbuiging w_2 + w_3 (A1.4.3(3)): bij een vloer of een intensief gebruikt dak
'de frequente combinatie (6.15b), dus w_3 = ψ_1·w_inst,Q; bij een overig dak de
'karakteristieke (6.14b), dus w_3 = w_inst,Q.
psi_w3 = if(toepassing ≡ 3; 1; psi_1)
grens_bij = if(toepassing ≡ 2; 1/500; if(toepassing ≡ 3; 1/250; 0.003))
#show

'Gemiddelde elasticiteitsmodulus (EN 338 / EN 14080), kruipfactor (tabel 3.2) en quasi-blijvende factor (NEN-EN 1990 tabel NB.2 — A1.1):<span class="alleen-scherm"></span>

E_mean
k_def
psi_2

## Doorsnede

b = 70 mm
h = 200 mm

'Traagheidsmoment:<span class="alleen-scherm"></span>

I_y = b * h^3 / 12 to mm^4

## Systeem en belasting

'Overspanning:<span class="alleen-scherm"></span>

L = 4000 mm

'Blijvende belasting (karakteristiek):<span class="alleen-scherm"></span>

g_k = 1.0 kN/m

'Veranderlijke belasting (karakteristiek):<span class="alleen-scherm"></span>

q_k = 2.5 kN/m

## Ogenblikkelijke doorbuiging (w_inst)

'Doorbuiging onder blijvende belasting:<span class="alleen-scherm"></span>

w_inst_G = 5 * g_k * L^4 / (384 * E_mean * I_y) to mm

'Doorbuiging onder veranderlijke belasting:<span class="alleen-scherm"></span>

w_inst_Q = 5 * q_k * L^4 / (384 * E_mean * I_y) to mm

## Uiteindelijke doorbuiging met kruip (formule 2.3-2.4)

'Uiteindelijke doorbuiging onder G (formule 2.3):<span class="alleen-scherm"></span>

w_fin_G = w_inst_G * (1 + k_def) to mm

'Uiteindelijke doorbuiging onder Q (formule 2.4):<span class="alleen-scherm"></span>

w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm

'Totale uiteindelijke doorbuiging:<span class="alleen-scherm"></span>

w_fin = w_fin_G + w_fin_Q to mm

'Netto doorbuiging (formule 7.2, zonder zeeg):<span class="alleen-scherm"></span>

w_netfin = w_fin to mm

## Bijkomende doorbuiging (NB bij NEN-EN 1990, A1.4.3(2) en (3))

'Kruipdeel onder de quasi-blijvende combinatie (w<sub>2</sub>) en deel door de veranderlijke belasting (w<sub>3</sub>, met ψ = ψ<sub>1</sub> frequent of 1,0 karakteristiek):<span class="alleen-scherm"></span>

psi_w3

w_2 = k_def * (w_inst_G + psi_2 * w_inst_Q) to mm

w_3 = psi_w3 * w_inst_Q to mm

w_bij = w_2 + w_3 to mm

## Grenswaarden (NB 7.2(2): NB bij NEN-EN 1990, A1.4.3)

'Grenswaarde w<sub>bij</sub> (A1.4.3(3)):<span class="alleen-scherm"></span>

w_bij_lim = grens_bij * L to mm

'Grenswaarde w<sub>net,fin</sub> als het uiterlijk van belang is (L/250, A1.4.3(4)):<span class="alleen-scherm"></span>

w_netfin_lim = L / 250 to mm

## Unity checks

UC_bij = w_bij / w_bij_lim

UC_netfin = w_netfin / w_netfin_lim

#if UC_bij ≤ 1
  w_bij voldoet ({{w_bij}} mm < {{w_bij_lim}} mm).
#else
  w_bij voldoet NIET!
#end if

#if UC_netfin ≤ 1
  w_net,fin voldoet ({{w_netfin}} mm < {{w_netfin_lim}} mm).
#else
  w_net,fin voldoet NIET!
#end if

UC_max = max(UC_bij; UC_netfin)

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>doorbuiging voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>doorbuiging voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Volledige houten balk toetsing — Gecombineerde controle
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 Complete — Volledige houten balk toetsing */
export const ec5HoutenBalk = `# Volledige Toetsing Houten Balk — EN 1995-1-1

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse van de veranderlijke belasting (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
f_c90k = hlookup(materialen; sterkteklasse; 1; 5)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 6)*N/mm^2
E_005 = hlookup(materialen; sterkteklasse; 1; 7)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
gelamineerd = hlookup(materialen; sterkteklasse; 1; 9)
k_mod_Q = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
k_mod_G = hlookup(kmod_tabel; 1; 1; if(klimaatklasse ≡ 3; 3; 2))
k_def = if(klimaatklasse ≡ 1; 0.60; if(klimaatklasse ≡ 2; 0.80; 2.00))
#show

'Karakteristieke waarden (EN 338 / EN 14080), partiele factor (tabel 2.3 NB), modificatiefactoren blijvend en veranderlijk (tabel 3.1) en kruipfactor (tabel 3.2):<span class="alleen-scherm"></span>

f_mk
f_vk
f_c90k
E_mean
E_005
gamma_M
k_mod_G
k_mod_Q
k_def

## Doorsnede

b = 70 mm
h = 200 mm

'Weerstandsmoment:<span class="alleen-scherm"></span>

W_y = b * h^2 / 6 to mm^3

'Traagheidsmomenten:<span class="alleen-scherm"></span>

I_y = b * h^3 / 12 to mm^4

I_z = h * b^3 / 12 to mm^4

## Systeem

'Overspanning:<span class="alleen-scherm"></span>

L = 4000 mm

'Opleggingslengte:<span class="alleen-scherm"></span>

L_opl = 100 mm

@select zijden "Balkeinde op de oplegging (art. 6.1.5(1))"
Minder dan 30 mm voorbij de oplegging = 1
Minstens 30 mm voorbij de oplegging = 2
@end

## Belasting

'Karakteristieke lijnlasten, blijvend en veranderlijk:<span class="alleen-scherm"></span>

g_k = 1.5 kN/m
q_k = 2.0 kN/m

@select belastingcat "Belastingcategorie (tabel NB.2 — A1.1)"
A — woon- en verblijfsruimtes = 1
B — kantoorruimtes = 2
C — bijeenkomstruimtes = 3
D — winkelruimtes = 4
E — opslagruimtes = 5
F — verkeersruimte, voertuig ≤ 25 kN = 6
G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
H — daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

@select toepassing "Grens bijkomende doorbuiging (NB bij NEN-EN 1990, A1.4.3(3))"
Vloer, of dak dat intensief door personen wordt gebruikt — 0,003·L = 1
Vloer met scheurgevoelige scheidingswanden — L/500 = 2
Overig dak — L/250 = 3
@end

#hide
'ψ-factoren (NEN-EN 1990 tabel NB.2 — A1.1): [categorie | ψ_0 | ψ_1 | ψ_2]
psi_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0 |0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2 |0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0]
psi_0 = hlookup(psi_tabel; belastingcat; 1; 2)
psi_1 = hlookup(psi_tabel; belastingcat; 1; 3)
psi_2 = hlookup(psi_tabel; belastingcat; 1; 4)
'w_3 in de bijkomende doorbuiging (A1.4.3(3)): frequent (6.15b) bij een vloer of een
'intensief gebruikt dak, karakteristiek (6.14b) bij een overig dak.
psi_w3 = if(toepassing ≡ 3; 1; psi_1)
grens_bij = if(toepassing ≡ 2; 1/500; if(toepassing ≡ 3; 1/250; 0.003))
gamma_Ga = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
gamma_Gb = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
gamma_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
#show

'Belastingfactoren (NEN-EN 1990 tabel NB.4 en NB.5 — A1.2(B), gevolgklasse CC{{CC}}) en combinatiefactoren (tabel NB.2 — A1.1):<span class="alleen-scherm"></span>

gamma_Ga
gamma_Gb
gamma_Q
psi_0
psi_2

'Rekenwaarde lijnlast (formule 6.10a en 6.10b; alleen blijvende belasting met k_mod blijvend, art. 3.1.3(2)):<span class="alleen-scherm"></span>

q_da = gamma_Ga * g_k + gamma_Q * psi_0 * q_k to kN/m

q_db = gamma_Gb * g_k + gamma_Q * q_k to kN/m

q_dG = gamma_Ga * g_k to kN/m

#if q_dG / k_mod_G > max(q_da; q_db) / k_mod_Q
  Maatgevend is de combinatie met alleen blijvende belasting.
  q_d = q_dG to kN/m
  k_mod = k_mod_G
#else
  q_d = max(q_da; q_db) to kN/m
  k_mod = k_mod_Q
#end if

## Rekenwaarden materiaal (art. 2.4.1, formule 2.14)

f_md = k_mod * f_mk / gamma_M to N/mm^2

f_vd = k_mod * f_vk / gamma_M to N/mm^2

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

## Snedekrachten

'Maatgevend moment:<span class="alleen-scherm"></span>

M_Ed = q_d * L^2 / 8 to kN*m

'Maatgevende dwarskracht:<span class="alleen-scherm"></span>

V_Ed = q_d * L / 2 to kN

'Oplegreactie:<span class="alleen-scherm"></span>

F_opl = V_Ed to kN

---

## 1. Buiging (art. 6.1.6, formule 6.11)

sigma_md = M_Ed / W_y to N/mm^2

UC_buiging = sigma_md / f_md

#if UC_buiging ≤ 1
  [OK] Buiging voldoet (UC = {{UC_buiging}}).
#else
  [NIET OK] Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if

---

## 2. Afschuiving (art. 6.1.7, formule 6.13)

'Scheurfactor k_cr voor een ligger met een prismatische doorsnede (NB art. 6.1.7(2)):<span class="alleen-scherm"></span>

k_cr = 1.0

b_ef = k_cr * b to mm

tau_d = 3/2 * V_Ed / (b_ef * h) to N/mm^2

UC_afschuiving = tau_d / f_vd

#if UC_afschuiving ≤ 1
  [OK] Afschuiving voldoet (UC = {{UC_afschuiving}}).
#else
  [NIET OK] Afschuiving voldoet NIET (UC = {{UC_afschuiving}})!
#end if

---

## 3. Druk loodrecht op oplegging (art. 6.1.5, formule 6.3)

#hide
k_c90 = if(gelamineerd ≡ 1; if(L_opl ≤ 400 mm; 1.75; 1.0); 1.5)
#show

'Factor k_c90 bij een discrete oplegging (art. 6.1.5(4)):<span class="alleen-scherm"></span>

k_c90

'Effectieve contactlengte (art. 6.1.5(1)):<span class="alleen-scherm"></span>

L_ef = L_opl + zijden * min(30 mm; L_opl) to mm

A_ef = b * L_ef to mm^2

sigma_c90d = F_opl / A_ef to N/mm^2

UC_c90 = sigma_c90d / (k_c90 * f_c90d)

#if UC_c90 ≤ 1
  [OK] Druk loodrecht voldoet (UC = {{UC_c90}}).
#else
  [NIET OK] Druk loodrecht voldoet NIET (UC = {{UC_c90}})!
#end if

---

## 4. Kipstabiliteit (art. 6.3.3, formule 6.33)

'Kiplengte (tabel 6.1), gelijkmatige belasting op de drukrand:<span class="alleen-scherm"></span>

l_ef = 0.9 * L + 2 * h to mm

#if gelamineerd ≡ 1
  'Kritische buigspanning (formule 6.31), G_005 volgens EN 14080:<span class="alleen-scherm"></span>
  G_005 = 540 N/mm^2
  I_tor = h * b^3 / 3 * (1 - 0.63 * b / h) to mm^4
  sigma_mcrit = pi * sqrt(E_005 * I_z * G_005 * I_tor) / (l_ef * W_y) to N/mm^2
#else
  'Kritische buigspanning voor massief naaldhout (formule 6.32):<span class="alleen-scherm"></span>
  sigma_mcrit = 0.78 * b^2 / (h * l_ef) * E_005 to N/mm^2
#end if

'Relatieve slankheid bij buiging (formule 6.30):<span class="alleen-scherm"></span>

lambda_relm = sqrt(f_mk / sigma_mcrit)

'Kipfactor k_crit (formule 6.34):<span class="alleen-scherm"></span>

#if lambda_relm ≤ 0.75
  k_crit = 1.0
#else if lambda_relm ≤ 1.4
  k_crit = 1.56 - 0.75 * lambda_relm
#else
  k_crit = 1 / lambda_relm^2
#end if

UC_kip = sigma_md / (k_crit * f_md)

#if UC_kip ≤ 1
  [OK] Kipstabiliteit voldoet (UC = {{UC_kip}}).
#else
  [NIET OK] Kipstabiliteit voldoet NIET (UC = {{UC_kip}})!
#end if

---

## 5. Doorbuiging (art. 7.2 / art. 2.2.3)

'Ogenblikkelijke doorbuiging onder de karakteristieke lasten:<span class="alleen-scherm"></span>

w_inst_G = 5 * g_k * L^4 / (384 * E_mean * I_y) to mm
w_inst_Q = 5 * q_k * L^4 / (384 * E_mean * I_y) to mm

'Uiteindelijke doorbuiging met kruip (formule 2.3, 2.4):<span class="alleen-scherm"></span>

w_fin_G = w_inst_G * (1 + k_def) to mm
w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm
w_netfin = w_fin_G + w_fin_Q to mm

'Bijkomende doorbuiging w<sub>2</sub> + w<sub>3</sub> (NB bij NEN-EN 1990, A1.4.3(2) en (3)), met ψ = ψ<sub>1</sub> frequent of 1,0 karakteristiek:<span class="alleen-scherm"></span>

psi_w3

w_bij = k_def * (w_inst_G + psi_2 * w_inst_Q) + psi_w3 * w_inst_Q to mm

'Grenswaarden (NB 7.2(2): NB bij NEN-EN 1990, A1.4.3(3) en (4)):<span class="alleen-scherm"></span>

w_bij_lim = grens_bij * L to mm

w_netfin_lim = L / 250 to mm

UC_bij = w_bij / w_bij_lim

UC_doorbuiging = w_netfin / w_netfin_lim

#if UC_bij ≤ 1
  [OK] Bijkomende doorbuiging voldoet ({{w_bij}} mm < {{w_bij_lim}} mm).
#else
  [NIET OK] Bijkomende doorbuiging voldoet NIET!
#end if

#if UC_doorbuiging ≤ 1
  [OK] Doorbuiging voldoet ({{w_netfin}} mm < {{w_netfin_lim}} mm).
#else
  [NIET OK] Doorbuiging voldoet NIET!
#end if

---

## Samenvatting

#hide
UC_max = max(UC_buiging; UC_afschuiving; UC_c90; UC_kip; UC_doorbuiging; UC_bij)
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Buiging</td><td style="padding:4px 8px;">§6.1.6</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_buiging)'">'UC_buiging'</td><td style="padding:4px 8px; color:'kleur(UC_buiging)'">'oordeel(UC_buiging)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving</td><td style="padding:4px 8px;">§6.1.7</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_afschuiving)'">'UC_afschuiving'</td><td style="padding:4px 8px; color:'kleur(UC_afschuiving)'">'oordeel(UC_afschuiving)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk loodrecht</td><td style="padding:4px 8px;">§6.1.5</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_c90)'">'UC_c90'</td><td style="padding:4px 8px; color:'kleur(UC_c90)'">'oordeel(UC_c90)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kip</td><td style="padding:4px 8px;">§6.3.3</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_kip)'">'UC_kip'</td><td style="padding:4px 8px; color:'kleur(UC_kip)'">'oordeel(UC_kip)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Doorbuiging w<sub>net,fin</sub></td><td style="padding:4px 8px;">§7.2, A1.4.3(4)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_doorbuiging)'">'UC_doorbuiging'</td><td style="padding:4px 8px; color:'kleur(UC_doorbuiging)'">'oordeel(UC_doorbuiging)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Bijkomende doorbuiging w<sub>bij</sub></td><td style="padding:4px 8px;">A1.4.3(3)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_bij)'">'UC_bij'</td><td style="padding:4px 8px; color:'kleur(UC_bij)'">'oordeel(UC_bij)'</td></tr>
'</table>

#if UC_max ≤ 1
'<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de balk voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de balk voldoet niet</b></span>
#end if

## Overzicht

@svg
<svg width="600" height="280" viewBox="0 0 600 280">
  <defs>
    <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
    </marker>
    <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="4" refY="0" orient="auto">
      <polygon points="0 6, 8 6, 4 0" fill="#059669"/>
    </marker>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#a3a3a3" stroke-width="0.8"/>
    </pattern>
  </defs>
  <!-- Balk -->
  <rect x="60" y="110" width="480" height="30" fill="#c8956c" stroke="#8b6914" stroke-width="1.5" rx="2"/>
  <!-- Doorsnede label -->
  <text x="300" y="130" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">{{b}} x {{h}} mm</text>
  <!-- Oplegging links (scharnier) -->
  <polygon points="60,140 45,170 75,170" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="40" y1="173" x2="80" y2="173" stroke="#374151" stroke-width="2"/>
  <rect x="40" y="173" width="40" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Oplegging rechts (rol) -->
  <polygon points="540,140 525,170 555,170" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="532" cy="175" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <circle cx="548" cy="175" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="522" y1="183" x2="558" y2="183" stroke="#374151" stroke-width="2"/>
  <rect x="522" y="183" width="36" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Verdeelde belasting -->
  <line x1="60" y1="60" x2="540" y2="60" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="120" y1="60" x2="120" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="200" y1="60" x2="200" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="280" y1="60" x2="280" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="360" y1="60" x2="360" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="440" y1="60" x2="440" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <text x="300" y="50" text-anchor="middle" font-size="12" fill="#dc2626" font-style="italic">q_d = {{q_d}} kN/m</text>
  <!-- Oplegreacties -->
  <line x1="60" y1="210" x2="60" y2="185" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="60" y="225" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <line x1="540" y1="210" x2="540" y2="185" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="540" y="225" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <!-- Doorbuigingslijn (gestippeld) -->
  <path d="M 60,140 Q 300,160 540,140" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="300" y="170" text-anchor="middle" font-size="10" fill="#6366f1">w = {{w_netfin}} mm</text>
  <!-- Momentverdeling -->
  <text x="300" y="255" text-anchor="middle" font-size="11" fill="#1e40af" font-weight="bold">M_Ed = {{M_Ed}} kN*m</text>
  <!-- Maat overspanning -->
  <line x1="60" y1="240" x2="540" y2="240" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="60" y1="234" x2="60" y2="246" stroke="#6b7280" stroke-width="1"/>
  <line x1="540" y1="234" x2="540" y2="246" stroke="#6b7280" stroke-width="1"/>
  <text x="300" y="238" text-anchor="middle" font-size="11" fill="#6b7280">L = {{L}} mm</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 8. Wringing (Torsion) — EN 1995-1-1 §6.1.8
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.8 — Wringing */
export const ec5Wringing = `# Toetsing Wringing — EN 1995-1-1 §6.1.8

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke afschuifsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_vk
gamma_M
k_mod

'Rekenwaarde afschuifsterkte (formule 2.14):<span class="alleen-scherm"></span>

f_vd = k_mod * f_vk / gamma_M to N/mm^2

## Doorsnede

@select vorm "Vorm van de doorsnede (art. 6.1.8)"
Rechthoekig = 1
Rond = 2
@end

#if vorm ≡ 2
  'Diameter:<span class="alleen-scherm"></span>
  d = 150 mm
  'Wringweerstandsmoment van een massieve ronde doorsnede:<span class="alleen-scherm"></span>
  W_tor = pi * d^3 / 16 to mm^3
  'Vormfactor voor een ronde doorsnede (formule 6.15):<span class="alleen-scherm"></span>
  k_shape = 1.2
#else
  b = 100 mm
  h = 200 mm
  'Grootste en kleinste afmeting van de doorsnede:<span class="alleen-scherm"></span>
  h_1 = max(b; h) to mm
  b_1 = min(b; h) to mm
  #hide
  'Saint-Venant: τ_max = T/(α·h·b²), met de reeksoplossing over n = 1, 3 en 5.
  r_tor = h_1 / b_1
  k_It = (1 - 192/(pi^5*r_tor) * (tanh(pi*r_tor/2) + tanh(3*pi*r_tor/2)/3^5 + tanh(5*pi*r_tor/2)/5^5)) / 3
  k_tau = 1 - 8/pi^2 * (1/cosh(pi*r_tor/2) + 1/(3^2*cosh(3*pi*r_tor/2)) + 1/(5^2*cosh(5*pi*r_tor/2)))
  #show
  'Factor α voor de grootste schuifspanning bij wringing van een rechthoek (Saint-Venant, τ<sub>tor</sub> = T/(α·h·b²)); 0,208 bij een vierkant, 0,246 bij h/b = 2 en 1/3 bij een dunne strook:<span class="alleen-scherm"></span>
  alpha_tor = k_It / k_tau
  W_tor = alpha_tor * h_1 * b_1^2 to mm^3
  'Vormfactor voor een rechthoekige doorsnede (formule 6.15):<span class="alleen-scherm"></span>
  k_shape = min(1 + 0.15 * h_1 / b_1; 2.0)
#end if

## Belasting

'Rekenwaarde van het wringend moment:<span class="alleen-scherm"></span>

T_Ed = 1.0 kN*m

## Toetsing wringing (art. 6.1.8, formule 6.14)

'Schuifspanning door wringing:<span class="alleen-scherm"></span>

tau_tord = T_Ed / W_tor to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_wringing = tau_tord / (k_shape * f_vd)

'<i class="ook-afdruk">Wringing en dwarskracht samen: EN 1995-1-1 geeft daarvoor geen interactieregel; toets de afschuiving (§6.1.7) apart.</i>

#if UC_wringing ≤ 1
  '<b>Maatgevende UC = 'UC_wringing'</b><span style="color: green"> ≤ 1,0 → <b>wringing voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_wringing'</b><span style="color: red"> > 1,0 → <b>wringing voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 9. Ligger met een eenzijdig taps verlopende hoogte — EN 1995-1-1 §6.4.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.4.2 — Tapse ligger (eenzijdig taps verlopende hoogte) */
export const ec5TapseLigger = `# Toetsing Tapse Ligger — EN 1995-1-1 §6.4.2

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd | f_t,90,k]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1 |0.4; 0.4; 0.4; 0.5; 0.5; 0.5]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
'De lagere k_mod van tabel NB.1 geldt voor 6.1.3, 6.4.3(6) en (7), 6.4.4 en 6.4.5, niet voor 6.4.2.
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
f_c90k = hlookup(materialen; sterkteklasse; 1; 5)*N/mm^2
f_t90k = hlookup(materialen; sterkteklasse; 1; 10)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke sterkten (EN 338 / EN 14080), partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_mk
f_vk
f_c90k
f_t90k
gamma_M
k_mod

'Rekenwaarden (art. 2.4.1, formule 2.14):<span class="alleen-scherm"></span>

f_md = k_mod * f_mk / gamma_M to N/mm^2

f_vd = k_mod * f_vk / gamma_M to N/mm^2

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

f_t90d = k_mod * f_t90k / gamma_M to N/mm^2

## Geometrie

'Ligger op twee steunpunten met een rechte en een tapse rand (figuur 6.8). Breedte, hoogte bij het lage einde en hoogte bij het hoge einde:<span class="alleen-scherm"></span>

b = 140 mm
h_0 = 300 mm
h_1 = 600 mm

'Overspanning:<span class="alleen-scherm"></span>

L = 8000 mm

'Helling van de tapse rand ten opzichte van de vezelrichting:<span class="alleen-scherm"></span>

tan_alpha = (h_1 - h_0) / L

alpha = atan(tan_alpha)*180/pi*deg

@select tapserand "Spanning langs de tapse rand"
Druk — tapse rand aan de gedrukte zijde (formule 6.40) = 1
Trek — tapse rand aan de getrokken zijde (formule 6.39) = 2
@end

'<i>Bij een ligger op twee steunpunten onder neerwaartse belasting is de bovenrand gedrukt: ligt de tapse rand boven, kies dan druk.</i><span class="alleen-scherm"></span>

## Belasting

q_d = 6.0 kN/m

## Plaats van de grootste buigspanning

'Bij een gelijkmatig verdeelde belasting ligt de grootste spanning niet in het midden maar op x = L·h<sub>0</sub>/(h<sub>0</sub> + h<sub>1</sub>), gemeten vanaf het lage einde:<span class="alleen-scherm"></span>

x_m = L * h_0 / (h_0 + h_1) to mm

h_x = h_0 + x_m * tan_alpha to mm

M_Ed = q_d * x_m * (L - x_m) / 2 to kN*m

## Toetsing buigspanning (art. 6.4.2, formule 6.37 en 6.38)

'Buigspanning aan de rechte en aan de tapse rand (formule 6.37):<span class="alleen-scherm"></span>

sigma_m0d = 6 * M_Ed / (b * h_x^2) to N/mm^2

sigma_mad = sigma_m0d to N/mm^2

#if tapserand ≡ 1
  'Factor k_m,α bij druk langs de tapse rand (formule 6.40):<span class="alleen-scherm"></span>
  k_malpha = 1 / sqrt(1 + (f_md / (1.5 * f_vd) * tan_alpha)^2 + (f_md / f_c90d * tan_alpha^2)^2)
#else
  'Factor k_m,α bij trek langs de tapse rand (formule 6.39):<span class="alleen-scherm"></span>
  k_malpha = 1 / sqrt(1 + (f_md / (0.75 * f_vd) * tan_alpha)^2 + (f_md / f_t90d * tan_alpha^2)^2)
#end if

'Unity check aan de tapse rand (formule 6.38):<span class="alleen-scherm"></span>

UC_taps = sigma_mad / (k_malpha * f_md)

'Unity check aan de rechte rand (formule 6.11):<span class="alleen-scherm"></span>

UC_recht = sigma_m0d / f_md

## Toetsing afschuiving bij het lage einde (art. 6.1.7, formule 6.13)

'De dwarskracht is bij de opleggingen het grootst en de hoogte bij het lage einde het kleinst: daar is de schuifspanning maatgevend.<span class="alleen-scherm"></span>

V_Ed = q_d * L / 2 to kN

'Scheurfactor k_cr voor een ligger met een rechthoekige doorsnede (NB art. 6.1.7(2)):<span class="alleen-scherm"></span>

k_cr = 1.0

tau_d = 1.5 * V_Ed / (k_cr * b * h_0) to N/mm^2

UC_v = tau_d / f_vd

UC_max = max(UC_taps; UC_recht; UC_v)

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>tapse ligger voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>tapse ligger voldoet niet</b></span>
#end if

'<i class="ook-afdruk">Niet getoetst: kip (§6.3.3), doorbuiging (§7.2) en de oplegdruk (§6.1.5).</i>
`;

// ─────────────────────────────────────────────────────────────────────────────
// 10. Ligger met een uitkeping bij het steunpunt — EN 1995-1-1 §6.5.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.5.2 — Uitkeping bij de oplegging */
export const ec5Uitkeping = `# Toetsing Uitkeping bij de Oplegging — EN 1995-1-1 §6.5.2

## Materiaal

@select sterkteklasse "Sterkteklasse (EN 338 / EN 14080)"
C18 = 1
C24 = 2
C30 = 3
GL24h = 4
GL28h = 5
GL32h = 6
@end

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Materiaalmatrix: [id | f_m,k | f_v,k | f_c,0,k | f_c,90,k | E_0,mean | E_0,05 | γ_M | gelamineerd]
materialen = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |18; 21; 23; 24; 28; 32 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.3; 1.3; 1.3; 1.25; 1.25; 1.25 |0; 0; 0; 1; 1; 1]
'k_mod (tabel 3.1): [duurklasse | klimaatklasse 1 en 2 | klimaatklasse 3]
kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
gamma_M = hlookup(materialen; sterkteklasse; 1; 8)
gelamineerd = hlookup(materialen; sterkteklasse; 1; 9)
k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
#show

'Karakteristieke afschuifsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):<span class="alleen-scherm"></span>

f_vk
gamma_M
k_mod

'Rekenwaarde afschuifsterkte (formule 2.14):<span class="alleen-scherm"></span>

f_vd = k_mod * f_vk / gamma_M to N/mm^2

## Doorsnede en uitkeping (figuur 6.11)

'Breedte en volle hoogte van de ligger:<span class="alleen-scherm"></span>

b = 100 mm
h = 250 mm

'Resterende hoogte ter plaatse van de uitkeping:<span class="alleen-scherm"></span>

h_ef = 175 mm

@select zijde "Ligging van de uitkeping (figuur 6.11)"
Aan dezelfde zijde als de oplegging (figuur 6.11a) = 1
Aan de zijde tegenover de oplegging (figuur 6.11b) = 2
@end

#if zijde ≡ 1
  'Afstand van de werklijn van de oplegreactie tot de hoek van de uitkeping:<span class="alleen-scherm"></span>
  x = 60 mm
  'Helling i van een afgeschuinde uitkeping (figuur 6.11a); 0 bij een haakse uitkeping:<span class="alleen-scherm"></span>
  i_uk = 0
#end if

'Scheurfactor k_cr voor een ligger met een prismatische doorsnede (NB art. 6.1.7(2)):<span class="alleen-scherm"></span>

k_cr = 1.0

'Effectieve breedte (formule 6.13a):<span class="alleen-scherm"></span>

b_ef = k_cr * b to mm

'Verhouding van de resterende en de volle hoogte:<span class="alleen-scherm"></span>

alpha = h_ef / h

## Reductiefactor k_v (art. 6.5.2(2))

#if zijde ≡ 1
  #hide
  k_n = if(gelamineerd ≡ 1; 6.5; 5.0)
  #show
  'Factor k_n (formule 6.63): 5 voor massief hout, 6,5 voor gelijmd gelamineerd hout:<span class="alleen-scherm"></span>
  k_n
  'Reductiefactor (formule 6.62), met h in mm en ten hoogste 1:<span class="alleen-scherm"></span>
  k_v = min(1; k_n * (1 + 1.1 * i_uk^1.5 / sqrt(h/mm)) / (sqrt(h/mm) * (sqrt(alpha * (1 - alpha)) + 0.8 * x / h * sqrt(1/alpha - alpha^2))))
#else
  'Uitkeping aan de zijde tegenover de oplegging (formule 6.61):<span class="alleen-scherm"></span>
  k_v = 1.0
#end if

## Belasting

'Dwarskracht bij de oplegging (rekenwaarde):<span class="alleen-scherm"></span>

V_Ed = 12 kN

## Toetsing afschuiving bij de uitkeping (art. 6.5.2, formule 6.60)

'Schuifspanning over de resterende hoogte:<span class="alleen-scherm"></span>

tau_d = 1.5 * V_Ed / (b_ef * h_ef) to N/mm^2

'Unity check:<span class="alleen-scherm"></span>

UC_uitkeping = tau_d / (k_v * f_vd)

#if UC_uitkeping ≤ 1
  '<b>Maatgevende UC = 'UC_uitkeping'</b><span style="color: green"> ≤ 1,0 → <b>uitkeping voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_uitkeping'</b><span style="color: red"> > 1,0 → <b>uitkeping voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 11. Vloer- en dakbeschot — EN 1995-1-1 §6.1.6 en §7.2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EN 1995-1-1 §6.1.6 en §7.2 — Vloer- en dakbeschot: planken of plaatmateriaal
 * op balken of sporen, als doorgaande ligger met gelijke velden (de
 * hart-op-hartafstand). Blijvende last op alle velden, de veranderlijke last
 * en de puntlast op de ongunstigste plaats (NEN-EN 1991-1-1, 6.2.1(1)); de
 * coëfficiënten komen uit de driemomentenvergelijking, naar boven afgerond, en
 * "vier of meer velden" is de omhullende over vier en meer. Veld en steunpunt
 * apart, g en q (of Q) opgeteld: bij de puntlast een veilige bovengrens. De
 * puntlast Q_k van de gebruikscategorie staat los van q_k (6.2.1(3)) en werkt
 * op de verdeelbreedte b_v. k_mod en k_def per materiaal (tabel 3.1 en 3.2),
 * γ_M per materiaal (tabel 2.3), k_h voor massief hout met de plankdikte als
 * hoogte (3.2(3)); plaatmateriaal met eigen f_m,k en E als invoer.
 */
export const ec5Beschot = `# Toetsing Vloer- en Dakbeschot — EN 1995-1-1 §6.1.6 / §7.2

'<i>Planken of plaatmateriaal op balken of sporen, gerekend als ligger over de balken met de hart-op-hartafstand als overspanning. Buiging en doorbuiging onder de gelijkmatig verdeelde belasting q<sub>k</sub> per meter breedte, en apart onder de puntlast Q<sub>k</sub> van de gebruikscategorie over de verdeelbreedte b<sub>v</sub>: de puntlast wordt niet met q<sub>k</sub> gecombineerd (NEN-EN 1991-1-1, 6.2.1(3)).</i><span class="alleen-scherm"></span>

## Materiaal

@select materiaal "Materiaal van het beschot"
Massief hout: planken (EN 338) = 1
Multiplex (EN 636) = 2
OSB/3 of OSB/4 (EN 300) = 3
Spaanplaat P5 (EN 312) = 4
Spaanplaat P7 (EN 312) = 5
@end

#if materiaal ≡ 1
  @select sterkteklasse "Sterkteklasse (EN 338)"
  C14 = 1
  C16 = 2
  C18 = 3
  C20 = 4
  C22 = 5
  C24 = 6
  C27 = 7
  C30 = 8
  @end
#else
  'Karakteristieke buigsterkte en gemiddelde elasticiteitsmodulus bij buiging van de plaat, in de overspanningsrichting (productverklaring of EN 12369-1; de waarden hieronder zijn een voorbeeld):
  f_m_plaat = 14.8 N/mm^2
  E_plaat = 4930 N/mm^2
  #if materiaal ≡ 2
    '<i>Multiplex in klimaatklasse 2: type EN 636-2 of EN 636-3; in klimaatklasse 3: type EN 636-3 (tabel 3.1).</i><span class="alleen-scherm"></span>
  #end if
#end if

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog, binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten, onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse van de veranderlijke belasting (tabel 2.1)"
Blijvend (> 10 jaar) = 1
Lang (6 mnd - 10 jaar) = 2
Middellang (1 week - 6 mnd) = 3
Kort (< 1 week) = 4
Zeer kort = 5
@end

#hide
'Massief hout (EN 338): [klasse | f_m,k | E_0,mean]
hout = [1; 2; 3; 4; 5; 6; 7; 8 |14; 16; 18; 20; 22; 24; 27; 30 |7000; 8000; 9000; 9500; 10000; 11000; 11500; 12000]
'k_mod (tabel 3.1), sleutel 10 × materiaal + klimaatklasse: [sleutel | blijvend | lang | middellang | kort | zeer kort]; 0 = niet toegestaan.
kmod_tabel = [11; 12; 13; 21; 22; 23; 31; 32; 33; 41; 42; 43; 51; 52; 53 |0.60; 0.60; 0.50; 0.60; 0.60; 0.50; 0.40; 0.30; 0; 0.30; 0.20; 0; 0.40; 0.30; 0 |0.70; 0.70; 0.55; 0.70; 0.70; 0.55; 0.50; 0.40; 0; 0.45; 0.30; 0; 0.50; 0.40; 0 |0.80; 0.80; 0.65; 0.80; 0.80; 0.65; 0.70; 0.55; 0; 0.65; 0.45; 0; 0.70; 0.55; 0 |0.90; 0.90; 0.70; 0.90; 0.90; 0.70; 0.90; 0.70; 0; 0.85; 0.60; 0; 0.90; 0.70; 0 |1.10; 1.10; 0.90; 1.10; 1.10; 0.90; 1.10; 0.90; 0; 1.10; 0.80; 0; 1.10; 0.90; 0]
'k_def (tabel 3.2) per klimaatklasse en γ_M (tabel 2.3): [materiaal | klasse 1 | klasse 2 | klasse 3 | γ_M]
kdef_tabel = [1; 2; 3; 4; 5 |0.60; 0.80; 1.50; 2.25; 1.50 |0.80; 1.00; 2.25; 3.00; 2.25 |2.00; 2.50; 0; 0; 0 |1.3; 1.2; 1.2; 1.3; 1.3]
sleutel = 10 * materiaal + klimaatklasse
k_mod_G = hlookup(kmod_tabel; sleutel; 1; 2)
k_mod_Q = hlookup(kmod_tabel; sleutel; 1; belastingduurklasse + 1)
k_def = hlookup(kdef_tabel; materiaal; 1; klimaatklasse + 1)
gamma_M = hlookup(kdef_tabel; materiaal; 1; 5)
#show

## Beschot en overspanning

'Dikte van het beschot:<span class="alleen-scherm"></span>

t = 22 mm

'Hart-op-hartafstand van de balken of sporen, de overspanning van het beschot:<span class="alleen-scherm"></span>

L = 600 mm

@select velden "Het beschot loopt door over (zonder stoot boven een tussenliggende balk)"
Eén veld: op twee balken = 1
Twee velden = 2
Drie velden = 3
Vier of meer velden = 4
@end

'<i>Een stoot van planken of platen boven een balk onderbreekt de doorgaande werking. Liggen er stoten boven de balken, ook verspringend, dan is één veld de veilige keuze.</i><span class="alleen-scherm"></span>

'Verdeelbreedte b<sub>v</sub>: de breedte van het beschot die de puntlast Q<sub>k</sub> draagt:<span class="alleen-scherm"></span>

b_v = 300 mm

'<i>De puntlast werkt op 0,1 × 0,1 m (NB bij 6.3.1.2; bij C2 op 0,5 × 0,5 m). Bij losse planken is b<sub>v</sub> de breedte van de planken die de last samen dragen, bij plaatmateriaal de breedte waarover de plaat de last spreidt.</i><span class="alleen-scherm"></span>

#hide
'Doorgaande ligger met gelijke velden (driemomentenvergelijking), naar boven afgerond. [velden | M veld, g op alle velden | M steunpunt, g | w, g | M veld, q ongunstig geplaatst | M steunpunt, q | w, q | M veld, puntlast op de ongunstigste plaats | M steunpunt, puntlast | w, puntlast]
'M = k·w·L² of k·F·L en w = k·w·L⁴/EI of k·F·L³/EI; "vier of meer" is de omhullende over vier en meer velden.
coef = [1; 2; 3; 4 |0.1250; 0.07032; 0.08000; 0.07791 |0; 0.1250; 0.1000; 0.1072 |0.01303; 0.005417; 0.006885; 0.006572 |0.1250; 0.09571; 0.1013; 0.1001 |0; 0.1250; 0.1167; 0.1206 |0.01303; 0.009151; 0.009918; 0.009756 |0.2500; 0.2075; 0.2050; 0.2048 |0; 0.09623; 0.1027; 0.1032 |0.02084; 0.01510; 0.01473; 0.01470]
k_gf = hlookup(coef; velden; 1; 2)
k_gs = hlookup(coef; velden; 1; 3)
k_wg = hlookup(coef; velden; 1; 4)
k_qf = hlookup(coef; velden; 1; 5)
k_qs = hlookup(coef; velden; 1; 6)
k_wq = hlookup(coef; velden; 1; 7)
k_Qf = hlookup(coef; velden; 1; 8)
k_Qs = hlookup(coef; velden; 1; 9)
k_wQ = hlookup(coef; velden; 1; 10)
b_m = 1000 mm
#show

## Materiaaleigenschappen

#if materiaal ≡ 1
  #hide
  f_mk = hlookup(hout; sterkteklasse; 1; 2)*N/mm^2
  E_mean = hlookup(hout; sterkteklasse; 1; 3)*N/mm^2
  #show
  'Hoogtefactor voor massief hout met de plankdikte als hoogte bij buiging (art. 3.2(3), formule 3.1):<span class="alleen-scherm"></span>
  k_h = min((150 mm / t)^0.2; 1.3)
#else
  #hide
  f_mk = f_m_plaat
  E_mean = E_plaat
  #show
  'Plaatmateriaal: geen hoogtefactor.
  k_h = 1.0
#end if

'Karakteristieke buigsterkte en elasticiteitsmodulus, partiële factor (tabel 2.3), modificatiefactoren blijvend en veranderlijk (tabel 3.1) en kruipfactor (tabel 3.2):<span class="alleen-scherm"></span>

f_mk
E_mean
gamma_M
k_mod_G
k_mod_Q
k_def

#if k_mod_Q ≡ 0
  '<b style="color:#b91c1c">Dit plaatmateriaal mag in klimaatklasse 'klimaatklasse' niet worden toegepast (tabel 3.1 en 3.2).</b>
  '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>het beschot voldoet niet: dit materiaal is in deze klimaatklasse niet toegestaan</b></span>
#else
  'Rekenwaarden buigsterkte, alleen blijvende belasting en met de veranderlijke belasting (art. 2.4.1, formule 2.14):<span class="alleen-scherm"></span>

  f_md_G = k_mod_G * k_h * f_mk / gamma_M to N/mm^2
  f_md_Q = k_mod_Q * k_h * f_mk / gamma_M to N/mm^2

  ## Belasting

  'Blijvende belasting: het eigen gewicht van het beschot en de afwerking (karakteristiek):<span class="alleen-scherm"></span>

  g_k = 0.25 kN/m^2

  @select gebruikscategorie "Gebruikscategorie (NEN-EN 1991-1-1, tabel NB.1 – 6.2 en NB.4 – 6.10)"
  A — vloer, niet-gemeenschappelijk: q_k 1,75 kN/m², Q_k 3 kN = 1
  A — trap, niet-gemeenschappelijk: q_k 2,0 kN/m², Q_k 3 kN = 2
  A — balkon, niet-gemeenschappelijk: q_k 2,5 kN/m², Q_k 3 kN = 3
  A — gemeenschappelijke vloer, trap of balkon: q_k 3,0 kN/m², Q_k 3 kN = 4
  B — kantoorruimte: q_k 2,5 kN/m², Q_k 3 kN = 5
  C1 — ruimte met tafels: q_k 4,0 kN/m², Q_k 3 kN = 6
  C2 — vaste zitplaatsen: q_k 4,0 kN/m², Q_k 7 kN = 7
  C3, C4 en C5: q_k 5,0 kN/m², Q_k 7 kN = 8
  D — winkelruimte: q_k 4,0 kN/m², Q_k 7 kN = 9
  H — dak, niet toegankelijk: q_k 1,0 kN/m², Q_k 1,5 kN = 10
  @end

  @select toepassing "Grens bijkomende doorbuiging (NB bij NEN-EN 1990, A1.4.3(3))"
  Vloer, of dak dat intensief door personen wordt gebruikt — 0,003·L = 1
  Vloer met scheurgevoelige scheidingswanden — L/500 = 2
  Overig dak — L/250 = 3
  @end

  #hide
  'Gebruiksbelasting per categorie (NEN-EN 1991-1-1) en ψ-factoren (NEN-EN 1990 tabel NB.2 — A1.1): [categorie | q_k | Q_k | ψ_0 | ψ_1 | ψ_2]
  cat_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |1.75; 2.0; 2.5; 3.0; 2.5; 4.0; 4.0; 5.0; 4.0; 1.0 |3; 3; 3; 3; 3; 3; 7; 7; 7; 1.5 |0.4; 0.4; 0.4; 0.4; 0.5; 0.4; 0.4; 0.4; 0.4; 0 |0.5; 0.5; 0.5; 0.5; 0.5; 0.7; 0.7; 0.7; 0.7; 0 |0.3; 0.3; 0.3; 0.3; 0.3; 0.6; 0.6; 0.6; 0.6; 0]
  q_k = hlookup(cat_tabel; gebruikscategorie; 1; 2)*kN/m^2
  Q_k = hlookup(cat_tabel; gebruikscategorie; 1; 3)*kN
  psi_0 = hlookup(cat_tabel; gebruikscategorie; 1; 4)
  psi_1 = hlookup(cat_tabel; gebruikscategorie; 1; 5)
  psi_2 = hlookup(cat_tabel; gebruikscategorie; 1; 6)
  'w_3 in de bijkomende doorbuiging (A1.4.3(3)): frequent (6.15b) bij een vloer of een
  'intensief gebruikt dak, karakteristiek (6.14b) bij een overig dak.
  psi_w3 = if(toepassing ≡ 3; 1; psi_1)
  grens_bij = if(toepassing ≡ 2; 1/500; if(toepassing ≡ 3; 1/250; 0.003))
  gamma_Ga = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
  gamma_Gb = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
  gamma_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
  #show

  'Gelijkmatig verdeelde en geconcentreerde gebruiksbelasting van de categorie:<span class="alleen-scherm"></span>

  q_k
  Q_k

  #if gebruikscategorie ≡ 10
    '<i>Dak: q<sub>k</sub> = 1,0 kN/m² geldt bij een helling onder 15°; bij een steiler dak is q<sub>k</sub> kleiner (tabel NB.4 – 6.10) en ligt het blad aan de veilige kant.</i><span class="alleen-scherm"></span>
  #end if

  'Belastingfactoren (NEN-EN 1990 tabel NB.4 en NB.5 — A1.2(B), gevolgklasse CC{{CC}}) en combinatiefactoren (tabel NB.2 — A1.1):<span class="alleen-scherm"></span>

  gamma_Ga
  gamma_Gb
  gamma_Q
  psi_0

  ## Buiging onder q_k (art. 6.1.6, formule 6.11)

  'Karakteristieke momenten in een strook van 1 m breedte, in het veld en boven een steunpunt; g<sub>k</sub> op alle velden, q<sub>k</sub> op de ongunstigste velden (NEN-EN 1991-1-1, 6.2.1(1)):<span class="alleen-scherm"></span>

  M_gf = k_gf * g_k * b_m * L^2 to kN*m
  M_gs = k_gs * g_k * b_m * L^2 to kN*m
  M_qf = k_qf * q_k * b_m * L^2 to kN*m
  M_qs = k_qs * q_k * b_m * L^2 to kN*m

  'Rekenwaarden (formule 6.10a en 6.10b, en alleen blijvende belasting met k<sub>mod</sub> blijvend, art. 3.1.3(2)), per combinatie het grootste van veld en steunpunt:<span class="alleen-scherm"></span>

  M_da = max(gamma_Ga * M_gf + gamma_Q * psi_0 * M_qf; gamma_Ga * M_gs + gamma_Q * psi_0 * M_qs) to kN*m
  M_db = max(gamma_Gb * M_gf + gamma_Q * M_qf; gamma_Gb * M_gs + gamma_Q * M_qs) to kN*m
  M_dG = gamma_Ga * max(M_gf; M_gs) to kN*m

  W_m = b_m * t^2 / 6 to mm^3

  sigma_mq = max(M_da; M_db) / W_m to N/mm^2
  sigma_mG = M_dG / W_m to N/mm^2

  UC_mq = max(sigma_mq / f_md_Q; sigma_mG / f_md_G)

  ## Buiging onder de puntlast Q_k (art. 6.1.6, formule 6.11)

  'De strook met de verdeelbreedte b<sub>v</sub> draagt Q<sub>k</sub> op de ongunstigste plaats en zijn deel van g<sub>k</sub>. Het grootste veldmoment van g en van Q vallen niet op dezelfde plaats: opgeteld zijn ze een veilige bovengrens.<span class="alleen-scherm"></span>

  M_gfv = k_gf * g_k * b_v * L^2 to kN*m
  M_gsv = k_gs * g_k * b_v * L^2 to kN*m
  M_Qf = k_Qf * Q_k * L to kN*m
  M_Qs = k_Qs * Q_k * L to kN*m

  M_dav = max(gamma_Ga * M_gfv + gamma_Q * psi_0 * M_Qf; gamma_Ga * M_gsv + gamma_Q * psi_0 * M_Qs) to kN*m
  M_dbv = max(gamma_Gb * M_gfv + gamma_Q * M_Qf; gamma_Gb * M_gsv + gamma_Q * M_Qs) to kN*m
  M_dGv = gamma_Ga * max(M_gfv; M_gsv) to kN*m

  W_v = b_v * t^2 / 6 to mm^3

  sigma_mQ = max(M_dav; M_dbv) / W_v to N/mm^2
  sigma_mGv = M_dGv / W_v to N/mm^2

  UC_mQ = max(sigma_mQ / f_md_Q; sigma_mGv / f_md_G)

  ## Doorbuiging (art. 7.2, NB bij NEN-EN 1990 A1.4.3)

  'Ogenblikkelijke doorbuiging met de coëfficiënten k·w·L⁴/EI en k·F·L³/EI; de doorbuiging onder g<sub>k</sub> is per strookbreedte gelijk:<span class="alleen-scherm"></span>

  I_m = b_m * t^3 / 12 to mm^4
  I_v = b_v * t^3 / 12 to mm^4

  w_G = k_wg * g_k * b_m * L^4 / (E_mean * I_m) to mm
  w_q = k_wq * q_k * b_m * L^4 / (E_mean * I_m) to mm
  w_Q = k_wQ * Q_k * L^3 / (E_mean * I_v) to mm

  'Kruipdeel onder de quasi-blijvende combinatie (w<sub>2</sub>) en deel door de veranderlijke belasting (w<sub>3</sub>, met ψ<sub>1</sub> frequent of 1,0 karakteristiek); uiteindelijke doorbuiging met formule 2.3 en 2.4:<span class="alleen-scherm"></span>

  psi_2
  psi_w3

  w_bij_q = k_def * (w_G + psi_2 * w_q) + psi_w3 * w_q to mm
  w_fin_q = w_G * (1 + k_def) + w_q * (1 + psi_2 * k_def) to mm

  w_bij_Q = k_def * (w_G + psi_2 * w_Q) + psi_w3 * w_Q to mm
  w_fin_Q = w_G * (1 + k_def) + w_Q * (1 + psi_2 * k_def) to mm

  'Grenswaarden (NB 7.2(2): NB bij NEN-EN 1990, A1.4.3(3) en (4)), met de hart-op-hartafstand als overspanning:<span class="alleen-scherm"></span>

  w_bij_lim = grens_bij * L to mm
  w_fin_lim = L / 250 to mm

  UC_bij_q = w_bij_q / w_bij_lim
  UC_fin_q = w_fin_q / w_fin_lim
  UC_bij_Q = w_bij_Q / w_bij_lim
  UC_fin_Q = w_fin_Q / w_fin_lim

  ## Samenvatting

  #hide
  UC_max = max(UC_mq; UC_mQ; UC_bij_q; UC_fin_q; UC_bij_Q; UC_fin_Q)
  kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
  oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
  #show
  '<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
  '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Buiging onder q<sub>k</sub></td><td style="padding:4px 8px;">§6.1.6</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_mq)'">'UC_mq'</td><td style="padding:4px 8px; color:'kleur(UC_mq)'">'oordeel(UC_mq)'</td></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Buiging onder Q<sub>k</sub></td><td style="padding:4px 8px;">§6.1.6</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_mQ)'">'UC_mQ'</td><td style="padding:4px 8px; color:'kleur(UC_mQ)'">'oordeel(UC_mQ)'</td></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Bijkomende doorbuiging onder q<sub>k</sub></td><td style="padding:4px 8px;">A1.4.3(3)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_bij_q)'">'UC_bij_q'</td><td style="padding:4px 8px; color:'kleur(UC_bij_q)'">'oordeel(UC_bij_q)'</td></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">w<sub>net,fin</sub> onder q<sub>k</sub></td><td style="padding:4px 8px;">§7.2, A1.4.3(4)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_fin_q)'">'UC_fin_q'</td><td style="padding:4px 8px; color:'kleur(UC_fin_q)'">'oordeel(UC_fin_q)'</td></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Bijkomende doorbuiging onder Q<sub>k</sub></td><td style="padding:4px 8px;">A1.4.3(3)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_bij_Q)'">'UC_bij_Q'</td><td style="padding:4px 8px; color:'kleur(UC_bij_Q)'">'oordeel(UC_bij_Q)'</td></tr>
  '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">w<sub>net,fin</sub> onder Q<sub>k</sub></td><td style="padding:4px 8px;">§7.2, A1.4.3(4)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_fin_Q)'">'UC_fin_Q'</td><td style="padding:4px 8px; color:'kleur(UC_fin_Q)'">'oordeel(UC_fin_Q)'</td></tr>
  '</table>

  #if UC_max ≤ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het beschot voldoet</b></span>
  #else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het beschot voldoet niet</b></span>
  #end if

  '<i class="ook-afdruk">Niet getoetst: afschuiving, de bevestiging van het beschot op de balken, trillingen (§7.3) en de balken zelf; de systeemsterkte k<sub>sys</sub> (§6.6) is niet toegepast. Bij een dak zijn sneeuw en de lijnlast van 2 kN/m uit tabel NB.4 – 6.10 niet meegenomen.</i>
#end if
`;
