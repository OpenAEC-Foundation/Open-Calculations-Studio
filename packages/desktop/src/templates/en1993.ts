/**
 * NEN-EN 1993-1-1 (Eurocode 3) — Staalconstructies: Algemene regels
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1993-1-1:2006+A1:2014+NB:2016
 *
 * Partiele factoren conform Nederlandse Nationale Bijlage:
 *   gamma_M0 = 1,00   gamma_M1 = 1,00   gamma_M2 = 1,25
 *
 * Tabel 3.1 van de A1:2014-versie: S355 volgens EN 10025-2 (t ≤ 40 mm) heeft
 * f_u = 490 N/mm²; 510 N/mm² geldt alleen voor buisprofielen (EN 10210-1 en
 * EN 10219-1).
 *
 * Elk toetsblad sluit af met de slotzin "Maatgevende UC = …", die de rapportkop
 * als oordeel leest. scripts/check-en1993.mjs rekent de toetsbladen na.
 */

// ---------------------------------------------------------------------------
// 1. Materiaaleigenschappen — EN 1993-1-1 Tabel 3.1 / art. 3.2.6
// ---------------------------------------------------------------------------

/** EN 1993-1-1 Tabel 3.1 — Materiaaleigenschappen staal */
export const ec3Materiaal = `# Materiaaleigenschappen Staal — EN 1993-1-1 Tabel 3.1

## Staalsoort (t <= 40 mm)

@select staalsoort "Staalsoort (tabel 3.1, t <= 40 mm)"
S235 — f_y=235, f_u=360 = 235
S275 — f_y=275, f_u=430 = 275
S355 — f_y=355, f_u=490 = 355
S450 — f_y=440, f_u=550 = 440
@end

Vloeigrens (tabel 3.1):

f_y = staalsoort * 1 N/mm^2

#if staalsoort == 235
f_u = 360 N/mm^2
#end if
#if staalsoort == 275
f_u = 430 N/mm^2
#end if
#if staalsoort == 355
f_u = 490 N/mm^2
#end if
#if staalsoort == 440
f_u = 550 N/mm^2
#end if

## Elastische constanten (art. 3.2.6)

Elasticiteitsmodulus:

E = 210000 N/mm^2

Schuifmodulus:

G = 81000 N/mm^2

Poisson-verhouding:

nu = 0.3

## Partiele factoren (art. 6.1, NB tabel NB.2)

gamma_M0 = 1.00
gamma_M1 = 1.00
gamma_M2 = 1.25

## Rekenwaarden

Rekenwaarde vloeigrens:

f_yd = f_y / gamma_M0 to N/mm^2

## Epsilon (tabel 5.2)

epsilon = sqrt(235 / f_y * 1 N/mm^2)
`;

// ---------------------------------------------------------------------------
// 2. Doorsnedeclassificatie — EN 1993-1-1 Tabel 5.2
// ---------------------------------------------------------------------------

/** EN 1993-1-1 Tabel 5.2 — Doorsnedeclassificatie */
export const ec3Classificatie = `# Doorsnedeclassificatie — EN 1993-1-1 Tabel 5.2

## Staalsoort

@select staalsoort "Staalsoort"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2

epsilon = sqrt(235 / f_y * 1 N/mm^2)

## Profielgegevens (I/H-profiel)

h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm

## Belasting

@select belasting "Belasting van de doorsnede"
Buiging om de sterke as = 1
Zuivere druk = 2
Druk met buiging om de sterke as = 3
@end

#if belasting == 3
A = 5381 mm^2
I_y = 83560000 mm^4
N_Ed = 200 kN
M_Ed = 50 kN*m
#end if

## Lijf (tabel 5.2, inwendig plaatveld)

c_w = h - 2 * t_f - 2 * r to mm
c_w_over_tw = c_w / t_w

#hide
#if belasting == 1
alpha_w = 0.5
psi_w = -1
#else if belasting == 2
alpha_w = 1
psi_w = 1
#else
alpha_w = min(1; 0.5 * (1 + N_Ed / (c_w * t_w * f_y)))
sigma_1 = N_Ed / A + M_Ed * c_w / (2 * I_y)
sigma_2 = N_Ed / A - M_Ed * c_w / (2 * I_y)
psi_w = max(sigma_2 / max(sigma_1; 0.001 N/mm^2); -3)
#end if
lim_w1 = if(alpha_w > 0.5; 396 * epsilon / (13 * alpha_w - 1); 36 * epsilon / alpha_w)
lim_w2 = if(alpha_w > 0.5; 456 * epsilon / (13 * alpha_w - 1); 41.5 * epsilon / alpha_w)
lim_w3 = if(psi_w > -1; 42 * epsilon / (0.67 + 0.33 * psi_w); 62 * epsilon * (1 - psi_w) * sqrt(-psi_w))
klasse_w = if(c_w_over_tw ≤ lim_w1; 1; if(c_w_over_tw ≤ lim_w2; 2; if(c_w_over_tw ≤ lim_w3; 3; 4)))
#show
'α = 'alpha_w', ψ = 'psi_w': grenzen c/t ≤ 'lim_w1' (klasse 1), 'lim_w2' (klasse 2) en 'lim_w3' (klasse 3) → lijf in klasse <b>'klasse_w'</b>.

## Flens (tabel 5.2, uitwendig plaatveld onder druk)

c_f = (b - t_w - 2 * r) / 2 to mm
c_f_over_tf = c_f / t_f

#hide
lim_f1 = 9 * epsilon
lim_f2 = 10 * epsilon
lim_f3 = 14 * epsilon
klasse_f = if(c_f_over_tf ≤ lim_f1; 1; if(c_f_over_tf ≤ lim_f2; 2; if(c_f_over_tf ≤ lim_f3; 3; 4)))
#show
'Grenzen c/t ≤ 9ε = 'lim_f1', 10ε = 'lim_f2' en 14ε = 'lim_f3' → flens in klasse <b>'klasse_f'</b>.

## Doorsnedeklasse

klasse = max(klasse_w; klasse_f)', de ongunstigste van lijf en flens (5.5.2(6))'
`;

// ---------------------------------------------------------------------------
// 3. Trekweerstand — EN 1993-1-1 art. 6.2.3
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.2.3 — Trekweerstand */
export const ec3Trek = `# Trekweerstand — EN 1993-1-1 art. 6.2.3

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235, f_u=360 = 235
S275 — f_y=275, f_u=430 = 275
S355 — f_y=355, f_u=490 = 355
S450 — f_y=440, f_u=550 = 440
@end

f_y = staalsoort * 1 N/mm^2

#if staalsoort == 235
f_u = 360 N/mm^2
#end if
#if staalsoort == 275
f_u = 430 N/mm^2
#end if
#if staalsoort == 355
f_u = 490 N/mm^2
#end if
#if staalsoort == 440
f_u = 550 N/mm^2
#end if

gamma_M0 = 1.00
gamma_M2 = 1.25

## Doorsnede

Bruto oppervlak:

A = 5381 mm^2

Netto oppervlak (met aftrek boutgaten):

A_net = 4800 mm^2

## Belasting

N_Ed = 400 kN

## Trekweerstand (formules 6.6 en 6.7)

N_plRd = A * f_y / gamma_M0 to kN', (6.6), bruto doorsnede'
N_uRd = 0.9 * A_net * f_u / gamma_M2 to kN', (6.7), netto doorsnede'
N_tRd = min(N_plRd; N_uRd) to kN

## Unity check

UC_trek = N_Ed / N_tRd

#if UC_trek ≤ 1
'<b>Maatgevende UC = 'UC_trek'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_trek'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 4. Drukweerstand — EN 1993-1-1 art. 6.2.4
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.2.4 — Drukweerstand */
export const ec3Druk = `# Drukweerstand — EN 1993-1-1 art. 6.2.4

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M0 = 1.00

## Doorsnede

@select dwarsdoorsnede_klasse "Doorsnedeklasse (art. 5.5.2)"
Klasse 1 = 1
Klasse 2 = 2
Klasse 3 = 3
Klasse 4 (effectief oppervlak) = 4
@end

Bruto oppervlak:

A = 5381 mm^2

## Belasting

N_Ed = 500 kN

## Drukweerstand (formules 6.10 en 6.11)

#if dwarsdoorsnede_klasse ≤ 3
N_cRd = A * f_y / gamma_M0 to kN', (6.10), klasse 1, 2 en 3'
#else
A_eff = ?*(mm^2)', effectief oppervlak bij zuivere druk, volgens NEN-EN 1993-1-5 §4.3'
N_cRd = A_eff * f_y / gamma_M0 to kN', (6.11), klasse 4'
#end if

## Unity check

UC_druk = N_Ed / N_cRd

#if UC_druk ≤ 1
'<b>Maatgevende UC = 'UC_druk'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_druk'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 5. Buigweerstand — EN 1993-1-1 art. 6.2.5
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.2.5 — Buigweerstand */
export const ec3Buiging = `# Buigweerstand — EN 1993-1-1 art. 6.2.5

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M0 = 1.00

## Doorsnede

@select dwarsdoorsnede_klasse "Doorsnedeklasse"
Klasse 1 — plastisch (W_pl) = 1
Klasse 2 — plastisch (W_pl) = 2
Klasse 3 — elastisch (W_el) = 3
@end

Plastisch weerstandsmoment (y-as):

W_ply = 628400 mm^3

Elastisch weerstandsmoment (y-as):

W_ely = 557300 mm^3

## Belasting

L = 6000 mm
q_d = 20 kN/m

Maatgevend moment (veldmoment, gelijkmatig verdeeld):

M_Ed = q_d * L^2 / 8 to kN*m

## Buigweerstand (formule 6.13 / 6.14)

#if dwarsdoorsnede_klasse < 3
Klasse 1 of 2 - plastische buigweerstand (formule 6.13):

M_cRd = W_ply * f_y / gamma_M0 to kN*m
#else
Klasse 3 - elastische buigweerstand (formule 6.14):

M_cRd = W_ely * f_y / gamma_M0 to kN*m
#end if

## Unity check

UC_buiging = M_Ed / M_cRd

#if UC_buiging ≤ 1
'<b>Maatgevende UC = 'UC_buiging'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_buiging'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 6. Dwarskrachtweerstand — EN 1993-1-1 art. 6.2.6
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.2.6 — Dwarskrachtweerstand */
export const ec3Dwarskracht = `# Dwarskrachtweerstand — EN 1993-1-1 art. 6.2.6

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M0 = 1.00

## Profielgegevens (I/H-profiel)

h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm

Profieloppervlak:

A = 5381 mm^2

## Afschuifoppervlak A_v (art. 6.2.6(3), gewalste I/H-profielen)

eta = 1.0

h_w = h - 2 * t_f to mm', hoogte van het lijf tussen de flenzen'
A_v = max(A - 2 * b * t_f + (t_w + 2 * r) * t_f; eta * h_w * t_w) to mm^2', 6.2.6(3)a, ten minste η·h_w·t_w'

## Belasting

L = 6000 mm
q_d = 20 kN/m

V_Ed = q_d * L / 2 to kN

## Plastische dwarskrachtweerstand (formule 6.18)

V_plRd = A_v * (f_y / sqrt(3)) / gamma_M0 to kN

#hide
epsilon = sqrt(235 / f_y * 1 N/mm^2)
#show
'Plooi door afschuiving (6.2.6(6)): h<sub>w</sub>/t<sub>w</sub> = 'h_w / t_w' tegen 72ε/η = '72 * epsilon / eta' (6.22).

## Unity check

UC_dwarskracht = V_Ed / V_plRd

#if UC_dwarskracht > 0.5
'<b style="color:#b45309">V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub>: de interactie met buiging (6.2.8) moet apart worden getoetst.</b>
#end if
#if h_w / t_w > 72 * epsilon / eta
'<b>Maatgevende UC = 'UC_dwarskracht'</b><span style="color: red"> → <b>voldoet niet</b>: h<sub>w</sub>/t<sub>w</sub> > 72ε/η, dus het lijf moet op plooi door afschuiving worden getoetst (NEN-EN 1993-1-5 hoofdstuk 5); dat valt buiten dit blad.</span>
#else if UC_dwarskracht ≤ 1
'<b>Maatgevende UC = 'UC_dwarskracht'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_dwarskracht'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 7. Gecombineerde buiging en normaalkracht — EN 1993-1-1 art. 6.2.9
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.2.9 — Buiging met normaalkracht */
export const ec3BuigingNormaalkracht = `# Buiging met Normaalkracht — EN 1993-1-1 art. 6.2.9

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M0 = 1.00
epsilon = sqrt(235 / f_y * 1 N/mm^2)

## Profielgegevens (gewalst I/H-profiel)

A = 5381 mm^2
h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm
I_y = 83560000 mm^4

W_ply = 628400 mm^3
W_plz = 98520 mm^3
W_ely = 557300 mm^3
W_elz = 80500 mm^3

## Belasting

N_Ed = 200 kN
M_yEd = 50 kN*m
M_zEd = 5 kN*m

## Doorsnedeklasse (tabel 5.2)

c_f = (b - t_w - 2 * r) / 2 to mm', uitstekend deel van de flens'
c_w = h - 2 * t_f - 2 * r to mm', vlak deel van het lijf'

#hide
k_f = c_f / t_f / epsilon
klasse_f = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
alpha_w = min(1; 0.5 * (1 + N_Ed / (c_w * t_w * f_y)))
sigma_1 = N_Ed / A + M_yEd * c_w / (2 * I_y)
sigma_2 = N_Ed / A - M_yEd * c_w / (2 * I_y)
psi_w = max(sigma_2 / max(sigma_1; 0.001 N/mm^2); -3)
g_1 = if(alpha_w > 0.5; 396 / (13 * alpha_w - 1); 36 / alpha_w)
g_2 = if(alpha_w > 0.5; 456 / (13 * alpha_w - 1); 41.5 / alpha_w)
g_3 = if(psi_w > -1; 42 / (0.67 + 0.33 * psi_w); 62 * (1 - psi_w) * sqrt(-psi_w))
k_w = c_w / t_w / epsilon
klasse_w = if(k_w ≤ g_1; 1; if(k_w ≤ g_2; 2; if(k_w ≤ g_3; 3; 4)))
#show
'Flens onder druk: c/t = 'c_f / t_f' = 'k_f'·ε → klasse 'klasse_f'.
'Lijf onder druk en buiging (α = 'alpha_w', ψ = 'psi_w'): c/t = 'c_w / t_w' = 'k_w'·ε, grenzen 'g_1'·ε, 'g_2'·ε en 'g_3'·ε → klasse 'klasse_w'.
klasse = max(klasse_f; klasse_w)', doorsnedeklasse'

## Weerstanden

N_plRd = A * f_y / gamma_M0 to kN
M_plyRd = W_ply * f_y / gamma_M0 to kN*m
M_plzRd = W_plz * f_y / gamma_M0 to kN*m

#if klasse ≤ 2
## Klasse 1 en 2: gereduceerde momentweerstand (art. 6.2.9.1)

n = N_Ed / N_plRd
a_param = min((A - 2 * b * t_f) / A; 0.5)', 6.2.9.1(5)'

M_NyRd = max(min(M_plyRd * (1 - n) / (1 - 0.5 * a_param); M_plyRd); 0 kN*m) to kN*m', (6.36)'

#if n > a_param
M_NzRd = max(M_plzRd * (1 - ((n - a_param) / (1 - a_param))^2); 0 kN*m) to kN*m', (6.38)'
#else
M_NzRd = M_plzRd to kN*m', (6.37)'
#end if

beta_exp = max(1; 5 * n)', (6.41): α = 2 en β = 5n, ten minste 1'

UC_MN = (M_yEd / M_NyRd)^2 + (M_zEd / M_NzRd)^beta_exp', (6.41)'
#else if klasse == 3
## Klasse 3: elastische toets (art. 6.2.9.2, formule 6.42)

M_elyRd = W_ely * f_y / gamma_M0 to kN*m
M_elzRd = W_elz * f_y / gamma_M0 to kN*m

UC_MN = N_Ed / N_plRd + M_yEd / M_elyRd + M_zEd / M_elzRd', (6.42)'
#end if

## Unity check

#if klasse ≡ 4
'<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>voldoet niet</b>: de doorsnede valt in klasse 4. Daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die dit blad niet uitrekent.</span>
#else if UC_MN ≤ 1
'<b>Maatgevende UC = 'UC_MN'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_MN'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 8. Kipstabiliteit (LTB) — EN 1993-1-1 art. 6.3.2
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.3.2 — Lateraal-torsieknikken (kip) */
export const ec3Kip = `# Lateraal-Torsieknikken (Kip) — EN 1993-1-1 art. 6.3.2

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M1 = 1.00
epsilon = sqrt(235 / f_y * 1 N/mm^2)

## Profielgegevens (I/H-profiel)

@select fabricage "Profiel"
Gewalst = 1
Gelast = 2
@end

h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm
I_z = 6038000 mm^4
I_t = 201000 mm^4
I_w = 126000000000 mm^6

W_ply = 628400 mm^3
W_ely = 557300 mm^3

E = 210000 N/mm^2
G = 81000 N/mm^2

## Doorsnedeklasse (tabel 5.2, buiging)

#hide
k_f = (b - t_w - 2 * r) / 2 / t_f / epsilon
k_w = (h - 2 * t_f - 2 * r) / t_w / epsilon
klasse_f = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
klasse_w = if(k_w ≤ 72; 1; if(k_w ≤ 83; 2; if(k_w ≤ 124; 3; 4)))
#show
'Flens onder druk: c/t = 'k_f'·ε → klasse 'klasse_f'; lijf bij buiging: c/t = 'k_w'·ε → klasse 'klasse_w'.
klasse = max(klasse_f; klasse_w)
#if klasse ≡ 4
'<b style="color:#b91c1c">Klasse 4: daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die dit blad niet uitrekent.</b>
#end if
#hide
W_y = if(klasse ≤ 2; W_ply; W_ely)
#show
W_y', W_pl,y bij klasse 1 en 2, W_el,y bij klasse 3 (6.3.2.1(3))'

## Systeem

Kiplengte (lengte tussen de gaffels):

L_cr = 4000 mm

## Kritiek kipmoment M_cr

@select C1_factor "Momentverloop"
Constant moment (C_1 = 1.0) = 1.0
Gelijkmatig verdeelde belasting (C_1 = 1.13) = 1.13
Puntlast midden (C_1 = 1.35) = 1.35
@end

@select aangrijping "Aangrijpingspunt van de last"
Op de gedrukte flens (destabiliserend) = 1
In het dwarskrachtcentrum = 0
Op de getrokken flens (stabiliserend) = -1
@end

#hide
C_1 = C1_factor * 1
C_2 = if(C1_factor == 1.13; 0.45; if(C1_factor == 1.35; 0.55; 0))
z_g = aangrijping * h / 2
#show
#if C_2 > 0
'Ligger met gaffels: C<sub>1</sub> = 'C_1' en C<sub>2</sub> = 'C_2'; de last grijpt aan op z<sub>g</sub> = 'z_g' mm van het dwarskrachtcentrum, positief naar de gedrukte flens.
#else
'Ligger met gaffels, constant moment zonder dwarsbelasting: C<sub>1</sub> = 'C_1' en C<sub>2</sub>·z<sub>g</sub> = 0.
#end if

M_cr = C_1 * pi^2 * E * I_z / L_cr^2 * (sqrt(I_w / I_z + L_cr^2 * G * I_t / (pi^2 * E * I_z) + (C_2 * z_g)^2) - C_2 * z_g) to kN*m

## Relatieve slankheid (art. 6.3.2.2(1))

lambda_LT = sqrt(W_y * f_y / M_cr)

## Kipfactor

@select methode "Methode (art. 6.3.2)"
Algemene methode (art. 6.3.2.2) = 1
Gewalste of gelijkwaardig gelaste profielen (art. 6.3.2.3) = 2
@end

#hide
alpha_LT = if(methode == 1; if(fabricage == 1; if(h / b ≤ 2; 0.21; 0.34); if(h / b ≤ 2; 0.49; 0.76)); if(fabricage == 1; if(h / b ≤ 2; 0.34; 0.49); if(h / b ≤ 2; 0.49; 0.76)))
#show
'Kipkromme 'if(alpha_LT == 0.21; "a"; if(alpha_LT == 0.34; "b"; if(alpha_LT == 0.49; "c"; "d")))' volgens tabel 'if(methode == 1; "6.4"; "6.5")' (h/b = 'h / b'): α<sub>LT</sub> = 'alpha_LT'.

#if methode == 1
Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT^2)

chi_LT = min(1; 1 / (Phi_LT + sqrt(Phi_LT^2 - lambda_LT^2)))', (6.56)'
#else
lambda_LT0 = 0.4', NB bij 6.3.2.3(1)'
beta_LT = 0.75

Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta_LT * lambda_LT^2)

chi_LT = min(1; 1 / lambda_LT^2; 1 / (Phi_LT + sqrt(Phi_LT^2 - beta_LT * lambda_LT^2)))', (6.57)'
#end if

## Belasting

M_Ed = 80 kN*m

## Kipweerstand (formule 6.55)

M_bRd = chi_LT * W_y * f_y / gamma_M1 to kN*m

## Unity check

UC_kip = M_Ed / M_bRd

#if klasse ≡ 4
'<b>Maatgevende UC = 'UC_kip'</b><span style="color: red"> → <b>voldoet niet</b>: de doorsnede valt in klasse 4, en die valt buiten dit blad.</span>
#else if UC_kip ≤ 1
'<b>Maatgevende UC = 'UC_kip'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_kip'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 9. Knik (flexural buckling) — EN 1993-1-1 art. 6.3.1
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 6.3.1 — Knik van op druk belaste staven */
export const ec3Knik = `# Knik (Flexural Buckling) — EN 1993-1-1 art. 6.3.1

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1)"
S235 — f_y=235 = 235
S275 — f_y=275 = 275
S355 — f_y=355 = 355
S450 — f_y=440 = 440
@end

f_y = staalsoort * 1 N/mm^2
gamma_M1 = 1.00
E = 210000 N/mm^2

## Profielgegevens

A = 5381 mm^2
I_y = 83560000 mm^4
I_z = 6038000 mm^4
h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm

Traagheidsstralen:

i_y = sqrt(I_y / A) to mm
i_z = sqrt(I_z / A) to mm

## Systeem

Kniklengte om sterke as (y-y):

L_cry = 6000 mm

Kniklengte om zwakke as (z-z):

L_crz = 6000 mm

## Knikkromme (tabel 6.1 en 6.2)

@select doorsnede "Doorsnede (tabel 6.2)"
Gewalst I- of H-profiel = 1
Gelast I-profiel = 2
Buisprofiel, warmgevormd = 3
Buisprofiel, koudgevormd = 4
U-, T- of massief profiel = 5
Hoekprofiel = 6
@end

#hide
kr_y = if(doorsnede == 1; if(h / b > 1.2 and t_f ≤ 40 mm; 1; if(t_f ≤ 100 mm; 2; 4)); if(doorsnede == 2; if(t_f ≤ 40 mm; 2; 3); if(doorsnede == 3; 1; if(doorsnede == 6; 2; 3))))
kr_z = if(doorsnede == 1; if(h / b > 1.2 and t_f ≤ 40 mm; 2; if(t_f ≤ 100 mm; 3; 4)); if(doorsnede == 2; if(t_f ≤ 40 mm; 3; 4); if(doorsnede == 3; 1; if(doorsnede == 6; 2; 3))))
alfa(k) = if(k == 1; 0.21; if(k == 2; 0.34; if(k == 3; 0.49; 0.76)))
kromme(k) = if(k == 1; "a"; if(k == 2; "b"; if(k == 3; "c"; "d")))
alpha_y = alfa(kr_y)
alpha_z = alfa(kr_z)
#show
'Kromme <b>'kromme(kr_y)'</b> om de y-as (α = 'alpha_y') en <b>'kromme(kr_z)'</b> om de z-as (α = 'alpha_z'), kolom S235 t/m S420 van tabel 6.2.

## Doorsnedeklasse bij zuivere druk (tabel 5.2)

#if doorsnede ≤ 2
#hide
epsilon = sqrt(235 / f_y * 1 N/mm^2)
c_w = h - 2 * t_f - 2 * r
c_f = (b - t_w - 2 * r) / 2
lambda_pw = c_w / t_w / (28.4 * epsilon * 2)
lambda_pf = c_f / t_f / (28.4 * epsilon * sqrt(0.43))
rho_w = if(c_w / t_w ≤ 42 * epsilon; 1; min(1; (lambda_pw - 0.22) / lambda_pw^2))
rho_f = if(c_f / t_f ≤ 14 * epsilon; 1; min(1; (lambda_pf - 0.188) / lambda_pf^2))
#show
'Lijf: c/t = 'c_w / t_w' tegen 42ε = '42 * epsilon'; flens: c/t = 'c_f / t_f' tegen 14ε = '14 * epsilon'.
#if min(rho_w; rho_f) < 1
'Klasse 4: effectieve breedte volgens NEN-EN 1993-1-5 §4.4, ψ = 1 en k<sub>σ</sub> = 4 (lijf) of 0,43 (flens): ρ<sub>w</sub> = 'rho_w', ρ<sub>f</sub> = 'rho_f'.
#if rho_f ≡ 1
A_eff = A - (1 - rho_w) * c_w * t_w to mm^2
#else if rho_w ≡ 1
A_eff = A - 4 * (1 - rho_f) * c_f * t_f to mm^2
#else
A_eff = A - (1 - rho_w) * c_w * t_w - 4 * (1 - rho_f) * c_f * t_f to mm^2
#end if
#else
'Klasse 1, 2 of 3: het bruto oppervlak telt.
#hide
A_eff = A
#show
#end if
#else
@select klasse_druk "Doorsnedeklasse bij zuivere druk"
Klasse 1, 2 of 3 = 3
Klasse 4 = 4
@end
#if klasse_druk ≡ 4
A_eff = ?*(mm^2)', effectief oppervlak volgens NEN-EN 1993-1-5 §4.3'
#else
#hide
A_eff = A
#show
#end if
#end if

## Relatieve slankheid (formule 6.50, bij klasse 4 6.51)

lambda1 = pi * sqrt(E / f_y)

#if A_eff < A
lambda_bar_y = L_cry / (i_y * lambda1) * sqrt(A_eff / A)
lambda_bar_z = L_crz / (i_z * lambda1) * sqrt(A_eff / A)
#else
lambda_bar_y = L_cry / (i_y * lambda1)
lambda_bar_z = L_crz / (i_z * lambda1)
#end if

## Knikfactoren (formule 6.49)

### Sterke as (y-y)

Phi_y = 0.5 * (1 + alpha_y * (lambda_bar_y - 0.2) + lambda_bar_y^2)

chi_y = min(1; 1 / (Phi_y + sqrt(Phi_y^2 - lambda_bar_y^2)))

### Zwakke as (z-z)

Phi_z = 0.5 * (1 + alpha_z * (lambda_bar_z - 0.2) + lambda_bar_z^2)

chi_z = min(1; 1 / (Phi_z + sqrt(Phi_z^2 - lambda_bar_z^2)))

## Maatgevende knikfactor

chi = min(chi_y; chi_z)

#if chi_y < chi_z
Knik om de sterke as (y-y) is maatgevend.
#else
Knik om de zwakke as (z-z) is maatgevend.
#end if

## Belasting

N_Ed = 500 kN

## Knikweerstand (formule 6.47, bij klasse 4 6.48)

#if A_eff < A
N_bRd = chi * A_eff * f_y / gamma_M1 to kN
#else
N_bRd = chi * A * f_y / gamma_M1 to kN
#end if

## Unity check

UC_knik = N_Ed / N_bRd

#if doorsnede ≥ 5 and A_eff < A
'<b>Maatgevende UC = 'UC_knik'</b><span style="color: red"> → <b>voldoet niet</b>: de doorsnede valt in klasse 4 en is niet dubbelsymmetrisch; het extra moment ΔM = N<sub>Ed</sub>·e<sub>N</sub> (6.3.1.1(2)) valt buiten dit blad.</span>
#else if UC_knik ≤ 1
'<b>Maatgevende UC = 'UC_knik'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_knik'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 10. Doorbuiging — EN 1993-1-1 art. 7.2 / NEN-EN 1990 bijlage A1.4
// ---------------------------------------------------------------------------

/** EN 1993-1-1 art. 7.2 — Doorbuigingscontrole */
export const ec3Doorbuiging = `# Doorbuigingscontrole — EN 1993-1-1 art. 7.2

## Materiaal

E = 210000 N/mm^2

## Profielgegevens

Traagheidsmoment (sterke as):

I_y = 83560000 mm^4

## Systeem

L = 6000 mm', overspanning, ligger op twee steunpunten'

## Belasting (karakteristiek)

g_k = 5 kN/m', blijvend'
q_k = 10 kN/m', veranderlijk'

## Doorbuiging (karakteristieke combinatie)

delta_G = 5 * g_k * L^4 / (384 * E * I_y) to mm
delta_Q = 5 * q_k * L^4 / (384 * E * I_y) to mm

w_max = delta_G + delta_Q to mm', eindwaarde; staal kruipt niet'
w_bij = delta_Q to mm', bijkomend: alleen de veranderlijke belasting'

## Grenswaarden (NB bij NEN-EN 1990, A1.4)

@select grenswaarde "Toelaatbare doorbuiging w_max"
L/250 — algemeen = 250
L/300 — vloerligger = 300
L/350 — draagconstructie onder glas = 350
L/500 — beperkende eis = 500
@end

@select grens_bij "Toelaatbare bijkomende doorbuiging w_bij"
0.003 × L — vloer = 0.003
0.002 × L — vloer met brosse scheidingswanden of afwerking = 0.002
0.004 × L — dak = 0.004
@end

w_max_lim = L / grenswaarde to mm
w_bij_lim = grens_bij * L to mm

## Unity check

UC_w_max = w_max / w_max_lim
UC_w_bij = w_bij / w_bij_lim

#hide
UC_max = max(UC_w_max; UC_w_bij)
#show
#if UC_max ≤ 1
'<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 11. Volledige stalen ligger toetsing — Gecombineerde controle
// ---------------------------------------------------------------------------

/** EN 1993-1-1 — Volledige toetsing stalen I/H-ligger */
export const ec3StalenLigger = `# Volledige Toetsing Stalen Ligger — EN 1993-1-1

'Gewalst I- of H-profiel op twee steunpunten met gaffels, onder een gelijkmatig verdeelde belasting.

## Staalsoort

@select staalsoort "Staalsoort (tabel 3.1, t <= 40 mm)"
S235 — f_y=235, f_u=360 = 235
S275 — f_y=275, f_u=430 = 275
S355 — f_y=355, f_u=490 = 355
S450 — f_y=440, f_u=550 = 440
@end

f_y = staalsoort * 1 N/mm^2
E = 210000 N/mm^2
G = 81000 N/mm^2

gamma_M0 = 1.00
gamma_M1 = 1.00

epsilon = sqrt(235 / f_y * 1 N/mm^2)

## Profielgegevens

@select profiel "Profiel"
IPE 300 = 300
IPE 200 = 200
IPE 240 = 240
IPE 270 = 270
IPE 330 = 330
IPE 360 = 360
IPE 400 = 400
IPE 450 = 450
IPE 500 = 500
IPE 550 = 550
IPE 600 = 600
HEA 200 = 1200
HEA 300 = 1300
HEB 200 = 2200
HEB 300 = 2300
@end

#hide
// id | h | b | t_w | t_f | r (mm) | A (cm²) | I_y | I_z (cm⁴) | W_el,y | W_pl,y (cm³) | I_t (cm⁴)
profielen = [200; 240; 270; 300; 330; 360; 400; 450; 500; 550; 600; 1200; 1300; 2200; 2300 |200; 240; 270; 300; 330; 360; 400; 450; 500; 550; 600; 190; 290; 200; 300 |100; 120; 135; 150; 160; 170; 180; 190; 200; 210; 220; 200; 300; 200; 300 |5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6; 9.4; 10.2; 11.1; 12; 6.5; 8.5; 9; 11 |8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5; 14.6; 16; 17.2; 19; 10; 14; 15; 19 |12; 15; 15; 15; 18; 18; 21; 21; 21; 24; 24; 18; 27; 18; 27 |28.5; 39.1; 45.9; 53.8; 62.6; 72.7; 84.5; 98.8; 116; 134; 156; 53.8; 112; 78.1; 149 |1940; 3890; 5790; 8360; 11770; 16270; 23130; 33740; 48200; 67120; 92080; 3690; 18260; 5700; 25170 |142; 284; 420; 604; 788; 1040; 1320; 1680; 2140; 2670; 3390; 1340; 6310; 2000; 8560 |194; 324; 429; 557; 713; 904; 1160; 1500; 1930; 2440; 3070; 389; 1260; 570; 1680 |221; 367; 484; 628; 804; 1020; 1310; 1700; 2190; 2780; 3510; 430; 1380; 642; 1870 |6.98; 12.9; 15.9; 20.1; 28.2; 37.3; 51.1; 66.9; 89.3; 123; 165; 20.98; 85.2; 59.3; 185]
h_p = hlookup(profielen; profiel; 1; 2) * mm
b_p = hlookup(profielen; profiel; 1; 3) * mm
t_w = hlookup(profielen; profiel; 1; 4) * mm
t_f = hlookup(profielen; profiel; 1; 5) * mm
r = hlookup(profielen; profiel; 1; 6) * mm
A_p = hlookup(profielen; profiel; 1; 7) * cm^2
I_y = hlookup(profielen; profiel; 1; 8) * cm^4
I_z = hlookup(profielen; profiel; 1; 9) * cm^4
W_ely = hlookup(profielen; profiel; 1; 10) * cm^3
W_ply = hlookup(profielen; profiel; 1; 11) * cm^3
I_t = hlookup(profielen; profiel; 1; 12) * cm^4
#show
'<table style="border-collapse:collapse; font-size:0.95em; margin:2px 0 6px 0;">
'<tr><td style="padding:3px 8px;">h = 'h_p' mm</td><td style="padding:3px 8px;">b = 'b_p' mm</td><td style="padding:3px 8px;">t<sub>w</sub> = 't_w' mm</td><td style="padding:3px 8px;">t<sub>f</sub> = 't_f' mm</td></tr>
'<tr><td style="padding:3px 8px;">r = 'r' mm</td><td style="padding:3px 8px;">A = 'A_p' cm²</td><td style="padding:3px 8px;">I<sub>y</sub> = 'I_y' cm⁴</td><td style="padding:3px 8px;">I<sub>z</sub> = 'I_z' cm⁴</td></tr>
'<tr><td style="padding:3px 8px;">W<sub>el,y</sub> = 'W_ely' cm³</td><td style="padding:3px 8px;">W<sub>pl,y</sub> = 'W_ply' cm³</td><td style="padding:3px 8px;">I<sub>t</sub> = 'I_t' cm⁴</td><td style="padding:3px 8px;"></td></tr>
'</table>
I_w = I_z * (h_p - t_f)^2 / 4 to cm^6', welvingsconstante, benadering voor I-profielen (NB.NB.4.1)'

## Systeem en belasting

L = 6000 mm', overspanning'
n_st = 0', aantal kipsteunen van de gedrukte flens tussen de gaffels, op gelijke afstand'
q_d = 25 kN/m', gelijkmatig verdeelde belasting, rekenwaarde (UGT)'
g_k = 7 kN/m', blijvend, karakteristiek (BGT)'
q_k = 10 kN/m', veranderlijk, karakteristiek (BGT)'

@select aangrijping "Aangrijpingspunt van de last"
Op de bovenflens (destabiliserend) = 1
In het dwarskrachtcentrum = 0
Op de onderflens (stabiliserend) = -1
@end

M_Ed = q_d * L^2 / 8 to kN*m
V_Ed = q_d * L / 2 to kN

---

## 1. Doorsnedeklasse (tabel 5.2, buiging)

c_w = h_p - 2 * t_f - 2 * r to mm', vlak deel van het lijf'
c_f = (b_p - t_w - 2 * r) / 2 to mm', uitstekend deel van de flens'

#hide
k_w = c_w / t_w / epsilon
k_f = c_f / t_f / epsilon
klasse_w = if(k_w ≤ 72; 1; if(k_w ≤ 83; 2; if(k_w ≤ 124; 3; 4)))
klasse_f = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
#show
'Lijf bij buiging: c/t = 'c_w / t_w' = 'k_w'·ε → klasse 'klasse_w'; flens onder druk: c/t = 'c_f / t_f' = 'k_f'·ε → klasse 'klasse_f'.
klasse = max(klasse_w; klasse_f)', doorsnedeklasse'
#if klasse ≡ 4
'<b style="color:#b91c1c">De doorsnede valt in klasse 4. Daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die dit blad niet uitrekent.</b>
#end if
#hide
W_y = if(klasse ≤ 2; W_ply; W_ely)
#show
W_y', W_pl,y bij klasse 1 en 2, W_el,y bij klasse 3'

---

## 2. Buigweerstand (art. 6.2.5)

M_cRd = W_y * f_y / gamma_M0 to kN*m', (6.13) of (6.14)'

UC_buiging = M_Ed / M_cRd

---

## 3. Dwarskrachtweerstand (art. 6.2.6)

h_w = h_p - 2 * t_f to mm
A_v = max(A_p - 2 * b_p * t_f + (t_w + 2 * r) * t_f; h_w * t_w) to mm^2', 6.2.6(3)a, ten minste η·h_w·t_w met η = 1'

V_plRd = A_v * (f_y / sqrt(3)) / gamma_M0 to kN', (6.18)'

UC_dwarskracht = V_Ed / V_plRd

#if UC_dwarskracht ≤ 0.5
'V<sub>Ed</sub> ≤ 0,5·V<sub>pl,Rd</sub>: de buigweerstand hoeft voor de dwarskracht niet te worden verminderd (6.2.8(2)).
#hide
UC_MV = 0
#show
#else
rho_V = (2 * V_Ed / V_plRd - 1)^2', 6.2.8(3), bij de oplegging'
M_x0 = M_Ed * (1 - (V_plRd / (2 * V_Ed))^2) to kN*m', grootste moment waar V_Ed(x) > 0,5·V_pl,Rd'
M_VRd = min(max(W_y - rho_V * h_w^2 * t_w / 4; 0 mm^3) * f_y / gamma_M0; M_cRd) to kN*m', (6.30); bij klasse 3 aan de veilige kant'
UC_MV = M_x0 / M_VRd
#end if

---

## 4. Kipstabiliteit (art. 6.3.2.3, bijlage NB.NB)

#hide
alpha_LT = if(h_p / b_p ≤ 2; 0.34; 0.49)
#show
'Kipkromme 'if(h_p / b_p ≤ 2; "b"; "c")' (tabel 6.5, gewalst I-profiel, h/b = 'h_p / b_p'): α<sub>LT</sub> = 'alpha_LT'; λ̄<sub>LT,0</sub> = 0,4 en β = 0,75 (NB bij 6.3.2.3(1)).

#if n_st < 1
#hide
C_1 = 1.13
C_2 = 0.45
z_g = aangrijping * h_p / 2
#show
'Gelijkmatige last, gaffels aan de einden, geen kipsteunen: C<sub>1</sub> = 1,13 en C<sub>2</sub> = 0,45 (tabel NB.NB.1, geval 2); de last grijpt aan op z<sub>g</sub> = 'z_g' mm van het dwarskrachtcentrum, positief naar de gedrukte flens.

M_cr = C_1 * pi^2 * E * I_z / L^2 * (sqrt(I_w / I_z + L^2 * G * I_t / (pi^2 * E * I_z) + (C_2 * z_g)^2) - C_2 * z_g) to kN*m

lambda_LT = sqrt(W_y * f_y / M_cr)

Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.4) + 0.75 * lambda_LT^2)

chi_LT = min(1; 1 / lambda_LT^2; 1 / (Phi_LT + sqrt(Phi_LT^2 - 0.75 * lambda_LT^2)))', (6.57)'
#else
#hide
N_v = floor(n_st) + 1
#show
L_st = L / N_v to mm', afstand tussen de kipsteunen'
'Per veld: L<sub>kip</sub> = (1,4 − 0,8·β)·L<sub>st</sub>, tussen 1,0 en 1,4·L<sub>st</sub>; C<sub>1</sub> = 1,75 − 1,05·β + 0,3·β² ≤ 2,3 en C<sub>2</sub> = 0 (NB.NB.4.3, tabel NB.NB.1 geval 1), met β de verhouding van de eindmomenten van het veld. De kleinste χ<sub>LT</sub> geldt (NB.NB.2); de ligger is symmetrisch.
#hide
Mcr(Lk; C1) = C1 * pi^2 * E * I_z / Lk^2 * sqrt(I_w / I_z + Lk^2 * G * I_t / (pi^2 * E * I_z))
chi_lt(lam) = min(1; 1 / lam^2; 1 / (0.5 * (1 + alpha_LT * (lam - 0.4) + 0.75 * lam^2) + sqrt((0.5 * (1 + alpha_LT * (lam - 0.4) + 0.75 * lam^2))^2 - 0.75 * lam^2)))
chi_LT = 1
#show
'<table style="border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:1.5px solid #374151;"><th style="padding:3px 8px;">Veld</th><th style="padding:3px 8px; text-align:right;">β</th><th style="padding:3px 8px; text-align:right;">L<sub>kip</sub> (mm)</th><th style="padding:3px 8px; text-align:right;">C<sub>1</sub></th><th style="padding:3px 8px; text-align:right;">M<sub>cr</sub> (kNm)</th><th style="padding:3px 8px; text-align:right;">λ̄<sub>LT</sub></th><th style="padding:3px 8px; text-align:right;">χ<sub>LT</sub></th></tr>
#for i = 1 : ceil(N_v / 2)
#hide
m_a = (i - 1) * (N_v - i + 1)
m_b = i * (N_v - i)
beta_v = min(m_a; m_b) / max(m_a; m_b)
L_kip_v = min(max(1.4 - 0.8 * beta_v; 1); 1.4) * L_st to mm
C_1v = min(1.75 - 1.05 * beta_v + 0.3 * beta_v^2; 2.3)
M_cr_v = Mcr(L_kip_v; C_1v) to kN*m
lambda_v = sqrt(W_y * f_y / M_cr_v)
chi_v = chi_lt(lambda_v)
chi_LT = min(chi_LT; chi_v)
#show
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">'i'</td><td style="padding:3px 8px; text-align:right;">'beta_v'</td><td style="padding:3px 8px; text-align:right;">'L_kip_v'</td><td style="padding:3px 8px; text-align:right;">'C_1v'</td><td style="padding:3px 8px; text-align:right;">'M_cr_v'</td><td style="padding:3px 8px; text-align:right;">'lambda_v'</td><td style="padding:3px 8px; text-align:right;">'chi_v'</td></tr>
#loop
'</table>
chi_LT', kleinste waarde van de velden'
#end if

M_bRd = chi_LT * W_y * f_y / gamma_M1 to kN*m', (6.55)'

UC_kip = M_Ed / M_bRd

---

## 5. Doorbuiging (art. 7.2, NB bij NEN-EN 1990 A1.4)

@select grens_bij "Toelaatbare bijkomende doorbuiging"
0.003 × L — vloer = 0.003
0.002 × L — vloer met brosse scheidingswanden of afwerking = 0.002
0.004 × L — dak = 0.004
@end

w_max = 5 * (g_k + q_k) * L^4 / (384 * E * I_y) to mm', eindwaarde; staal kruipt niet'
w_bij = 5 * q_k * L^4 / (384 * E * I_y) to mm', bijkomend: alleen de veranderlijke belasting'

UC_w_max = w_max / (0.004 * L)', grens 0,004·L'
UC_w_bij = w_bij / (grens_bij * L)

---

## Samenvatting

#hide
UC_max = max(UC_buiging; UC_dwarskracht; UC_MV; UC_kip; UC_w_max; UC_w_bij)
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Buiging</td><td style="padding:4px 8px;">§6.2.5</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_buiging)'">'UC_buiging'</td><td style="padding:4px 8px; color:'kleur(UC_buiging)'">'oordeel(UC_buiging)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Dwarskracht</td><td style="padding:4px 8px;">§6.2.6</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_dwarskracht)'">'UC_dwarskracht'</td><td style="padding:4px 8px; color:'kleur(UC_dwarskracht)'">'oordeel(UC_dwarskracht)'</td></tr>
#if UC_dwarskracht > 0.5
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Buiging met dwarskracht</td><td style="padding:4px 8px;">§6.2.8</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_MV)'">'UC_MV'</td><td style="padding:4px 8px; color:'kleur(UC_MV)'">'oordeel(UC_MV)'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kip</td><td style="padding:4px 8px;">§6.3.2.3, NB.NB</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_kip)'">'UC_kip'</td><td style="padding:4px 8px; color:'kleur(UC_kip)'">'oordeel(UC_kip)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Doorbuiging w<sub>max</sub> / w<sub>bij</sub></td><td style="padding:4px 8px;">§7.2</td><td style="padding:4px 8px; text-align:right; color:'kleur(max(UC_w_max; UC_w_bij))'">'UC_w_max' / 'UC_w_bij'</td><td style="padding:4px 8px; color:'kleur(max(UC_w_max; UC_w_bij))'">'oordeel(max(UC_w_max; UC_w_bij))'</td></tr>
'</table>

#if klasse ≡ 4
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de ligger voldoet niet</b>: de doorsnede valt in klasse 4, en die valt buiten dit blad.</span>
#else if UC_max ≤ 1
'<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de ligger voldoet</b></span>
#else
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de ligger voldoet niet</b></span>
#end if

## Overzicht

@svg
<svg width="600" height="300" viewBox="0 0 600 300">
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
  <!-- I-profiel doorsnede -->
  <rect x="20" y="80" width="60" height="4" fill="#60a5fa" stroke="#1e40af" stroke-width="1"/>
  <rect x="20" y="156" width="60" height="4" fill="#60a5fa" stroke="#1e40af" stroke-width="1"/>
  <rect x="47" y="84" width="6" height="72" fill="#60a5fa" stroke="#1e40af" stroke-width="1"/>
  <text x="50" y="75" text-anchor="middle" font-size="10" fill="#1e40af">{{b_p}}x{{h_p}}</text>
  <!-- Balk -->
  <rect x="120" y="115" width="420" height="20" fill="#60a5fa" stroke="#1e40af" stroke-width="1.5" rx="2"/>
  <!-- Oplegging links (scharnier) -->
  <polygon points="120,135 105,165 135,165" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="100" y1="168" x2="140" y2="168" stroke="#374151" stroke-width="2"/>
  <rect x="100" y="168" width="40" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Oplegging rechts (rol) -->
  <polygon points="540,135 525,165 555,165" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="532" cy="170" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <circle cx="548" cy="170" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="522" y1="178" x2="558" y2="178" stroke="#374151" stroke-width="2"/>
  <rect x="522" y="178" width="36" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Verdeelde belasting -->
  <line x1="120" y1="65" x2="540" y2="65" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="180" y1="65" x2="180" y2="110" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="270" y1="65" x2="270" y2="110" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="330" y1="65" x2="330" y2="110" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="390" y1="65" x2="390" y2="110" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="480" y1="65" x2="480" y2="110" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <text x="330" y="55" text-anchor="middle" font-size="12" fill="#dc2626" font-style="italic">q_d = {{q_d}} kN/m</text>
  <!-- Oplegreacties -->
  <line x1="120" y1="205" x2="120" y2="180" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="120" y="218" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <line x1="540" y1="205" x2="540" y2="180" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="540" y="218" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <!-- Doorbuigingslijn -->
  <path d="M 120,135 Q 330,155 540,135" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="330" y="165" text-anchor="middle" font-size="10" fill="#6366f1">w_max = {{w_max}} mm</text>
  <!-- Maat overspanning -->
  <line x1="120" y1="240" x2="540" y2="240" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="120" y1="234" x2="120" y2="246" stroke="#6b7280" stroke-width="1"/>
  <line x1="540" y1="234" x2="540" y2="246" stroke="#6b7280" stroke-width="1"/>
  <text x="330" y="256" text-anchor="middle" font-size="11" fill="#6b7280">L = {{L}} mm</text>
  <!-- Momentverdeling -->
  <text x="330" y="280" text-anchor="middle" font-size="11" fill="#1e40af" font-weight="bold">M_Ed = {{M_Ed}} kN*m</text>
</svg>
@end
`;

// ---------------------------------------------------------------------------
// Export bundel
// ---------------------------------------------------------------------------

export const ec3Formules: { id: string; label: string; template: string }[] = [
  {
    id: 'ec3-materiaal',
    label: 'EC3: Materiaaleigenschappen (tabel 3.1)',
    template: ec3Materiaal,
  },
  {
    id: 'ec3-classificatie',
    label: 'EC3: Doorsnedeclassificatie (tabel 5.2)',
    template: ec3Classificatie,
  },
  {
    id: 'ec3-trek',
    label: 'EC3: Trekweerstand (art. 6.2.3)',
    template: ec3Trek,
  },
  {
    id: 'ec3-druk',
    label: 'EC3: Drukweerstand (art. 6.2.4)',
    template: ec3Druk,
  },
  {
    id: 'ec3-buiging',
    label: 'EC3: Buigweerstand (art. 6.2.5)',
    template: ec3Buiging,
  },
  {
    id: 'ec3-dwarskracht',
    label: 'EC3: Dwarskrachtweerstand (art. 6.2.6)',
    template: ec3Dwarskracht,
  },
  {
    id: 'ec3-buiging-normaalkracht',
    label: 'EC3: Buiging + normaalkracht (art. 6.2.9)',
    template: ec3BuigingNormaalkracht,
  },
  {
    id: 'ec3-kip',
    label: 'EC3: Kipstabiliteit / LTB (art. 6.3.2)',
    template: ec3Kip,
  },
  {
    id: 'ec3-knik',
    label: 'EC3: Knik / Flexural buckling (art. 6.3.1)',
    template: ec3Knik,
  },
  {
    id: 'ec3-doorbuiging',
    label: 'EC3: Doorbuiging (art. 7.2)',
    template: ec3Doorbuiging,
  },
  {
    id: 'ec3-stalen-ligger',
    label: 'EC3: Volledige stalen ligger toetsing',
    template: ec3StalenLigger,
  },
];
