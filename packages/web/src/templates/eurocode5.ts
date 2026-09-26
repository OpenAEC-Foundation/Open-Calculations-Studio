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

Karakteristieke buigsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):

f_mk
gamma_M
k_mod

Rekenwaarde buigsterkte (art. 2.4.1, formule 2.14):

f_md = k_mod * f_mk / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

Weerstandsmoment:

W_y = b * h^2 / 6 to mm^3

Traagheidsmoment:

I_y = b * h^3 / 12 to mm^4

## Belasting

L = 3000 mm
q_d = 5.0 kN/m

Maatgevend moment (gelijkmatig verdeelde belasting):

M_Ed = q_d * L^2 / 8 to kN*m

## Toetsing buiging (art. 6.1.6, formule 6.11)

Buigspanning:

sigma_md = M_Ed / W_y to N/mm^2

Unity check:

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

Karakteristieke afschuifsterkte, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):

f_vk
gamma_M
k_mod

Rekenwaarde afschuifsterkte (formule 2.14):

f_vd = k_mod * f_vk / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

Scheurfactor k_cr voor een ligger met een prismatische doorsnede (NB art. 6.1.7(2)):

k_cr = 1.0

Effectieve breedte (formule 6.13a):

b_ef = k_cr * b to mm

## Belasting

L = 3000 mm
q_d = 5.0 kN/m

Maatgevende dwarskracht:

V_Ed = q_d * L / 2 to kN

## Toetsing afschuiving (art. 6.1.7, formule 6.13)

Schuifspanning (rechthoekige doorsnede):

tau_d = 3/2 * V_Ed / (b_ef * h) to N/mm^2

Unity check:

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

Karakteristieke druksterkte evenwijdig, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):

f_c0k
gamma_M
k_mod

Rekenwaarde druksterkte (formule 2.14):

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

## Doorsnede

b = 100 mm
h = 100 mm

Oppervlakte:

A = b * h to mm^2

## Belasting

N_Ed = 50 kN

## Toetsing druk evenwijdig (art. 6.1.4, formule 6.2)

Drukspanning:

sigma_c0d = N_Ed / A to N/mm^2

Unity check:

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

Karakteristieke druksterkte loodrecht, partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):

f_c90k
gamma_M
k_mod

Rekenwaarde druksterkte loodrecht (formule 2.14):

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

## Geometrie oplegging

Breedte ligger:

b = 70 mm

Opleggingslengte (werkelijke contactlengte):

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

Factor k_c90 (art. 6.1.5(3) en (4)):

k_c90

Effectieve contactlengte (art. 6.1.5(1)):

L_ef = L_opl + zijden * min(30 mm; L_opl) to mm

Effectief contactoppervlak (formule 6.4):

A_ef = b * L_ef to mm^2

## Belasting

Oplegreactie:

F_c90d = 15 kN

## Toetsing druk loodrecht (art. 6.1.5, formule 6.3)

Drukspanning loodrecht (formule 6.4):

sigma_c90d = F_c90d / A_ef to N/mm^2

Unity check:

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

Karakteristieke druksterkte evenwijdig en E_005 (EN 338 / EN 14080), partiele factor (tabel 2.3 NB) en modificatiefactor (tabel 3.1):

f_c0k
E_005
gamma_M
k_mod

Rekenwaarde druksterkte:

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

Factor beta_c (formule 6.29): 0,2 massief, 0,1 gelamineerd:

beta_c

## Doorsnede

b = 100 mm
h = 100 mm

A = b * h to mm^2

## Systeem

Kniklengte:

L_k = 3000 mm

## Knikberekening (art. 6.3.2)

Slankheid om de zwakke as (kleinste afmeting van de doorsnede):

lambda_z = L_k / (min(b; h) / sqrt(12))

Relatieve slankheid (formule 6.22):

lambda_relz = lambda_z / pi * sqrt(f_c0k / E_005)

Factor k_z (formule 6.28):

k_z = 0.5 * (1 + beta_c * (lambda_relz - 0.3) + lambda_relz^2)

Knikfactor k_cz (formule 6.26, ten hoogste 1 volgens art. 6.3.2(2)):

k_cz = min(1; 1 / (k_z + sqrt(k_z^2 - lambda_relz^2)))

## Belasting

N_Ed = 80 kN

## Toetsing knik (art. 6.3.2, formule 6.23 vereenvoudigd)

Drukspanning:

sigma_c0d = N_Ed / A to N/mm^2

Unity check knik:

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

'Gemiddelde elasticiteitsmodulus (EN 338 / EN 14080), kruipfactor (tabel 3.2) en quasi-blijvende factor (NEN-EN 1990 tabel NB.2 — A1.1):

E_mean
k_def
psi_2

## Doorsnede

b = 70 mm
h = 200 mm

Traagheidsmoment:

I_y = b * h^3 / 12 to mm^4

## Systeem en belasting

Overspanning:

L = 4000 mm

Blijvende belasting (karakteristiek):

g_k = 1.0 kN/m

Veranderlijke belasting (karakteristiek):

q_k = 2.5 kN/m

## Ogenblikkelijke doorbuiging (w_inst)

Doorbuiging onder blijvende belasting:

w_inst_G = 5 * g_k * L^4 / (384 * E_mean * I_y) to mm

Doorbuiging onder veranderlijke belasting:

w_inst_Q = 5 * q_k * L^4 / (384 * E_mean * I_y) to mm

## Uiteindelijke doorbuiging met kruip (formule 2.3-2.4)

Uiteindelijke doorbuiging onder G (formule 2.3):

w_fin_G = w_inst_G * (1 + k_def) to mm

Uiteindelijke doorbuiging onder Q (formule 2.4):

w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm

Totale uiteindelijke doorbuiging:

w_fin = w_fin_G + w_fin_Q to mm

Netto doorbuiging (formule 7.2, zonder zeeg):

w_netfin = w_fin to mm

## Bijkomende doorbuiging (NB bij NEN-EN 1990, A1.4.3(2) en (3))

'Kruipdeel onder de quasi-blijvende combinatie (w<sub>2</sub>) en deel door de veranderlijke belasting (w<sub>3</sub>, met ψ = ψ<sub>1</sub> frequent of 1,0 karakteristiek):

psi_w3

w_2 = k_def * (w_inst_G + psi_2 * w_inst_Q) to mm

w_3 = psi_w3 * w_inst_Q to mm

w_bij = w_2 + w_3 to mm

## Grenswaarden (NB 7.2(2): NB bij NEN-EN 1990, A1.4.3)

'Grenswaarde w<sub>bij</sub> (A1.4.3(3)):

w_bij_lim = grens_bij * L to mm

'Grenswaarde w<sub>net,fin</sub> als het uiterlijk van belang is (L/250, A1.4.3(4)):

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

Karakteristieke waarden (EN 338 / EN 14080), partiele factor (tabel 2.3 NB), modificatiefactoren blijvend en veranderlijk (tabel 3.1) en kruipfactor (tabel 3.2):

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

Weerstandsmoment:

W_y = b * h^2 / 6 to mm^3

Traagheidsmomenten:

I_y = b * h^3 / 12 to mm^4

I_z = h * b^3 / 12 to mm^4

## Systeem

Overspanning:

L = 4000 mm

Opleggingslengte:

L_opl = 100 mm

@select zijden "Balkeinde op de oplegging (art. 6.1.5(1))"
Minder dan 30 mm voorbij de oplegging = 1
Minstens 30 mm voorbij de oplegging = 2
@end

## Belasting

Karakteristieke lijnlasten, blijvend en veranderlijk:

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

'Belastingfactoren (NEN-EN 1990 tabel NB.4 en NB.5 — A1.2(B), gevolgklasse CC{{CC}}) en combinatiefactoren (tabel NB.2 — A1.1):

gamma_Ga
gamma_Gb
gamma_Q
psi_0
psi_2

Rekenwaarde lijnlast (formule 6.10a en 6.10b; alleen blijvende belasting met k_mod blijvend, art. 3.1.3(2)):

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

Maatgevend moment:

M_Ed = q_d * L^2 / 8 to kN*m

Maatgevende dwarskracht:

V_Ed = q_d * L / 2 to kN

Oplegreactie:

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

Scheurfactor k_cr voor een ligger met een prismatische doorsnede (NB art. 6.1.7(2)):

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

Factor k_c90 bij een discrete oplegging (art. 6.1.5(4)):

k_c90

Effectieve contactlengte (art. 6.1.5(1)):

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

Kiplengte (tabel 6.1), gelijkmatige belasting op de drukrand:

l_ef = 0.9 * L + 2 * h to mm

#if gelamineerd ≡ 1
  Kritische buigspanning (formule 6.31), G_005 volgens EN 14080:
  G_005 = 540 N/mm^2
  I_tor = h * b^3 / 3 * (1 - 0.63 * b / h) to mm^4
  sigma_mcrit = pi * sqrt(E_005 * I_z * G_005 * I_tor) / (l_ef * W_y) to N/mm^2
#else
  Kritische buigspanning voor massief naaldhout (formule 6.32):
  sigma_mcrit = 0.78 * b^2 / (h * l_ef) * E_005 to N/mm^2
#end if

Relatieve slankheid bij buiging (formule 6.30):

lambda_relm = sqrt(f_mk / sigma_mcrit)

Kipfactor k_crit (formule 6.34):

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

Ogenblikkelijke doorbuiging onder de karakteristieke lasten:

w_inst_G = 5 * g_k * L^4 / (384 * E_mean * I_y) to mm
w_inst_Q = 5 * q_k * L^4 / (384 * E_mean * I_y) to mm

Uiteindelijke doorbuiging met kruip (formule 2.3, 2.4):

w_fin_G = w_inst_G * (1 + k_def) to mm
w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm
w_netfin = w_fin_G + w_fin_Q to mm

'Bijkomende doorbuiging w<sub>2</sub> + w<sub>3</sub> (NB bij NEN-EN 1990, A1.4.3(2) en (3)), met ψ = ψ<sub>1</sub> frequent of 1,0 karakteristiek:

psi_w3

w_bij = k_def * (w_inst_G + psi_2 * w_inst_Q) + psi_w3 * w_inst_Q to mm

'Grenswaarden (NB 7.2(2): NB bij NEN-EN 1990, A1.4.3(3) en (4)):

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
