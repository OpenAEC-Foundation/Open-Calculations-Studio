/**
 * NEN-EN 1993-1-1 (Eurocode 3) — Staalconstructies: Algemene regels
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1993-1-1:2006+A1:2014+NB:2016
 *
 * Partiele factoren conform Nederlandse Nationale Bijlage:
 *   gamma_M0 = 1,00   gamma_M1 = 1,00   gamma_M2 = 1,25
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

epsilon = sqrt(235 / f_y)

## Samenvatting

| Eigenschap | Waarde |
|---|---|
| f_y | {{f_y}} N/mm^2 |
| f_u | {{f_u}} N/mm^2 |
| E | {{E}} N/mm^2 |
| epsilon | {{epsilon}} |
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

epsilon = sqrt(235 / f_y)

## Profielgegevens (I/H-profiel)

h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm

## Classificatie lijf bij buiging (tabel 5.2, inwendig plaatveld)

Hoogte lijf:

c_w = h - 2 * t_f - 2 * r to mm

Slankheid lijf:

c_w_over_tw = c_w / t_w

Grenswaarden lijf bij buiging (tabel 5.2):
- Klasse 1: c/t <= 72 * epsilon
- Klasse 2: c/t <= 83 * epsilon
- Klasse 3: c/t <= 124 * epsilon

lim_w1 = 72 * epsilon
lim_w2 = 83 * epsilon
lim_w3 = 124 * epsilon

#if c_w_over_tw < lim_w1
  Lijf is Klasse 1 (c/t = {{c_w_over_tw}} < {{lim_w1}}).
#else
  #if c_w_over_tw < lim_w2
    Lijf is Klasse 2 (c/t = {{c_w_over_tw}} < {{lim_w2}}).
  #else
    #if c_w_over_tw < lim_w3
      Lijf is Klasse 3 (c/t = {{c_w_over_tw}} < {{lim_w3}}).
    #else
      Lijf is Klasse 4 (c/t = {{c_w_over_tw}} > {{lim_w3}}).
    #end if
  #end if
#end if

## Classificatie flens bij druk (tabel 5.2, uitwendig plaatveld)

Uitstekende flens:

c_f = (b - t_w - 2 * r) / 2 to mm

Slankheid flens:

c_f_over_tf = c_f / t_f

Grenswaarden flens bij druk (tabel 5.2):
- Klasse 1: c/t <= 9 * epsilon
- Klasse 2: c/t <= 10 * epsilon
- Klasse 3: c/t <= 14 * epsilon

lim_f1 = 9 * epsilon
lim_f2 = 10 * epsilon
lim_f3 = 14 * epsilon

#if c_f_over_tf < lim_f1
  Flens is Klasse 1 (c/t = {{c_f_over_tf}} < {{lim_f1}}).
#else
  #if c_f_over_tf < lim_f2
    Flens is Klasse 2 (c/t = {{c_f_over_tf}} < {{lim_f2}}).
  #else
    #if c_f_over_tf < lim_f3
      Flens is Klasse 3 (c/t = {{c_f_over_tf}} < {{lim_f3}}).
    #else
      Flens is Klasse 4 (c/t = {{c_f_over_tf}} > {{lim_f3}}).
    #end if
  #end if
#end if

## Totale classificatie doorsnede

De doorsnedeklasse wordt bepaald door de ongunstigste klasse
van lijf en flens (art. 5.5.2).
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

## Plastische trekweerstand bruto doorsnede (formule 6.6)

N_plRd = A * f_y / gamma_M0 to kN

## Breukweerstand netto doorsnede (formule 6.7)

N_uRd = 0.9 * A_net * f_u / gamma_M2 to kN

## Maatgevende trekweerstand

#if N_plRd < N_uRd
N_tRd = N_plRd to kN
Plastische weerstand is maatgevend (formule 6.6).
#else
N_tRd = N_uRd to kN
Breukweerstand netto doorsnede is maatgevend (formule 6.7).
#end if

## Unity check

UC_trek = N_Ed / N_tRd

#if UC_trek < 1
  [OK] Trekweerstand voldoet (UC = {{UC_trek}}).
#else
  [NIET OK] Trekweerstand voldoet NIET (UC = {{UC_trek}})!
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

## Drukweerstand (formule 6.10)

Voor klasse 1, 2 en 3:

N_cRd = A * f_y / gamma_M0 to kN

## Unity check

UC_druk = N_Ed / N_cRd

#if UC_druk < 1
  [OK] Drukweerstand voldoet (UC = {{UC_druk}}).
#else
  [NIET OK] Drukweerstand voldoet NIET (UC = {{UC_druk}})!
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

#if UC_buiging < 1
  [OK] Buigweerstand voldoet (UC = {{UC_buiging}}).
#else
  [NIET OK] Buigweerstand voldoet NIET (UC = {{UC_buiging}})!
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

Hoogte lijf (hart-op-hart flenzen):

h_w = h - 2 * t_f to mm

Afschuifoppervlak (formule 6.18, noot):

A_v = A - 2 * b * t_f + (t_w + 2 * r) * t_f to mm^2

Minimumwaarde (art. 6.2.6(3)):

A_v_min = eta * h_w * t_w to mm^2

#if A_v < A_v_min
A_v = A_v_min to mm^2
Minimum afschuifoppervlak is maatgevend.
#end if

## Belasting

L = 6000 mm
q_d = 20 kN/m

V_Ed = q_d * L / 2 to kN

## Plastische dwarskrachtweerstand (formule 6.18)

V_plRd = A_v * (f_y / sqrt(3)) / gamma_M0 to kN

## Unity check

UC_dwarskracht = V_Ed / V_plRd

#if UC_dwarskracht < 1
  [OK] Dwarskrachtweerstand voldoet (UC = {{UC_dwarskracht}}).
#else
  [NIET OK] Dwarskrachtweerstand voldoet NIET (UC = {{UC_dwarskracht}})!
#end if

#if UC_dwarskracht > 0.5
  Let op: V_Ed > 0,5 * V_plRd. Interactie buiging-dwarskracht
  moet worden gecontroleerd (art. 6.2.8).
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

## Profielgegevens (I/H-profiel)

A = 5381 mm^2
h = 300 mm
b = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm

W_ply = 628400 mm^3
W_plz = 98520 mm^3

## Belasting

N_Ed = 200 kN
M_yEd = 50 kN*m
M_zEd = 5 kN*m

## Weerstanden

Plastische normaalkrachtweerstand:

N_plRd = A * f_y / gamma_M0 to kN

Plastische momentweerstand:

M_plyRd = W_ply * f_y / gamma_M0 to kN*m
M_plzRd = W_plz * f_y / gamma_M0 to kN*m

## Gereduceerde momentweerstand (art. 6.2.9.1, I/H-profielen, formule 6.36)

Verhouding normaalkracht:

n = N_Ed / N_plRd

Parameter a (formule 6.36):

a_param = (A - 2 * b * t_f) / A

#if a_param > 0.5
a_param = 0.5
#end if

Gereduceerde momentweerstand om sterke as (formule 6.36):

M_NyRd = M_plyRd * (1 - n) / (1 - 0.5 * a_param) to kN*m

#if M_NyRd > M_plyRd
M_NyRd = M_plyRd to kN*m
#end if

Gereduceerde momentweerstand om zwakke as (formule 6.38):

#if n > a_param
M_NzRd = M_plzRd * (1 - ((n - a_param) / (1 - a_param))^2) to kN*m
#else
M_NzRd = M_plzRd to kN*m
#end if

## Interactie tweezijdige buiging (formule 6.41)

Exponenten (I/H-profiel, formule 6.41):

alpha_exp = 2
beta_exp = 1

#if n > 1
  beta_exp = 1
#else
  beta_exp = 5 * n
  #if beta_exp < 1
    beta_exp = 1
  #end if
#end if

Interactie-formule:

UC_MN = (M_yEd / M_NyRd)^alpha_exp + (M_zEd / M_NzRd)^beta_exp

#if UC_MN < 1
  [OK] Buiging + normaalkracht voldoet (UC = {{UC_MN}}).
#else
  [NIET OK] Buiging + normaalkracht voldoet NIET (UC = {{UC_MN}})!
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

## Profielgegevens (I/H-profiel)

h = 300 mm
b = 150 mm
I_z = 6038000 mm^4
I_t = 201000 mm^4
I_w = 126000000000 mm^6

W_ply = 628400 mm^3

E = 210000 N/mm^2
G = 81000 N/mm^2

## Systeem

Kiplengte (afstand zijdelingse steunen):

L_cr = 4000 mm

## Methode

@select methode "Methode (art. 6.3.2)"
Algemene methode (art. 6.3.2.2) = 1
Methode voor gewalste profielen (art. 6.3.2.3) = 2
@end

## Kritiek kipmoment M_cr

Momentverdeling factor C_1:

@select C1_factor "Momentverdeling (C_1)"
Constant moment (C_1 = 1.0) = 1.0
Gelijkmatig verdeelde belasting (C_1 = 1.13) = 1.13
Puntlast midden (C_1 = 1.35) = 1.35
@end

C_1 = C1_factor * 1

Kritiek kipmoment (analytisch, dubbelzijdig symmetrisch profiel):

M_cr = C_1 * pi^2 * E * I_z / L_cr^2 * sqrt(I_w / I_z + L_cr^2 * G * I_t / (pi^2 * E * I_z)) to kN*m

## Relatieve slankheid (formule 6.56)

lambda_LT = sqrt(W_ply * f_y / M_cr)

#if lambda_LT < 0.4
  Relatieve slankheid < 0,4: kip is niet maatgevend (art. 6.3.2.3(1)).
  chi_LT = 1.0
#end if

## Knipcurve (tabel 6.5)

@select kipcurve "Kipcurve (tabel 6.3/6.5)"
a - alpha_LT = 0.21 = 0.21
b - alpha_LT = 0.34 = 0.34
c - alpha_LT = 0.49 = 0.49
d - alpha_LT = 0.76 = 0.76
@end

alpha_LT = kipcurve * 1

Tabel 6.5 (gewalste I-profielen):
- h/b <= 2: kipcurve b (alpha_LT = 0,34)
- h/b > 2: kipcurve c (alpha_LT = 0,49)

h_over_b = h / b

#if methode == 1
## Algemene methode (art. 6.3.2.2, formule 6.56)

Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT^2)

chi_LT = 1 / (Phi_LT + sqrt(Phi_LT^2 - lambda_LT^2))

#if chi_LT > 1
chi_LT = 1.0
#end if

#else
## Methode voor gewalste profielen (art. 6.3.2.3, formule 6.57)

lambda_LT0 = 0.4
beta_LT = 0.75

Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta_LT * lambda_LT^2)

chi_LT = 1 / (Phi_LT + sqrt(Phi_LT^2 - beta_LT * lambda_LT^2))

#if chi_LT > 1
chi_LT = 1.0
#end if

#if chi_LT > 1 / lambda_LT^2
Begrensd op 1/lambda_LT^2.
#end if

#end if

## Belasting

M_Ed = 80 kN*m

## Kipweerstand (formule 6.55)

M_bRd = chi_LT * W_ply * f_y / gamma_M1 to kN*m

## Unity check

UC_kip = M_Ed / M_bRd

#if UC_kip < 1
  [OK] Kipstabiliteit voldoet (UC = {{UC_kip}}).
#else
  [NIET OK] Kipstabiliteit voldoet NIET (UC = {{UC_kip}})!
#end if

## Samenvatting

| Parameter | Waarde |
|---|---|
| M_cr | {{M_cr}} kN*m |
| lambda_LT | {{lambda_LT}} |
| chi_LT | {{chi_LT}} |
| M_bRd | {{M_bRd}} kN*m |
| UC kip | {{UC_kip}} |
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

Traagheidsstralen:

i_y = sqrt(I_y / A) to mm
i_z = sqrt(I_z / A) to mm

## Systeem

Kniklengte om sterke as (y-y):

L_cry = 6000 mm

Kniklengte om zwakke as (z-z):

L_crz = 6000 mm

## Knikcurve (tabel 6.1 en 6.2)

@select knikcurve_y "Knikcurve y-y (tabel 6.2)"
a0 - alpha = 0.13 = 0.13
a - alpha = 0.21 = 0.21
b - alpha = 0.34 = 0.34
c - alpha = 0.49 = 0.49
d - alpha = 0.76 = 0.76
@end

@select knikcurve_z "Knikcurve z-z (tabel 6.2)"
a0 - alpha = 0.13 = 0.13
a - alpha = 0.21 = 0.21
b - alpha = 0.34 = 0.34
c - alpha = 0.49 = 0.49
d - alpha = 0.76 = 0.76
@end

alpha_y = knikcurve_y * 1
alpha_z = knikcurve_z * 1

Tabel 6.2 (gewalste I-profielen, t_f <= 40 mm):
- h/b > 1,2: y-y: curve a, z-z: curve b
- h/b <= 1,2: y-y: curve b, z-z: curve c

## Relatieve slankheid (formule 6.50)

lambda1 = pi * sqrt(E / f_y)

Slankheid y-y:

lambda_bar_y = L_cry / (i_y * lambda1)

Slankheid z-z:

lambda_bar_z = L_crz / (i_z * lambda1)

## Knikfactoren (formules 6.49)

### Sterke as (y-y)

Phi_y = 0.5 * (1 + alpha_y * (lambda_bar_y - 0.2) + lambda_bar_y^2)

chi_y = 1 / (Phi_y + sqrt(Phi_y^2 - lambda_bar_y^2))

#if chi_y > 1
chi_y = 1.0
#end if

### Zwakke as (z-z)

Phi_z = 0.5 * (1 + alpha_z * (lambda_bar_z - 0.2) + lambda_bar_z^2)

chi_z = 1 / (Phi_z + sqrt(Phi_z^2 - lambda_bar_z^2))

#if chi_z > 1
chi_z = 1.0
#end if

## Maatgevende knikfactor

#if chi_y < chi_z
chi = chi_y
Knik om de sterke as (y-y) is maatgevend.
#else
chi = chi_z
Knik om de zwakke as (z-z) is maatgevend.
#end if

## Belasting

N_Ed = 500 kN

## Knikweerstand (formule 6.47)

N_bRd = chi * A * f_y / gamma_M1 to kN

## Unity check

UC_knik = N_Ed / N_bRd

#if UC_knik < 1
  [OK] Knikweerstand voldoet (UC = {{UC_knik}}).
#else
  [NIET OK] Knikweerstand voldoet NIET (UC = {{UC_knik}})!
#end if

## Samenvatting

| As | lambda_bar | Phi | chi | N_bRd |
|---|---|---|---|---|
| y-y | {{lambda_bar_y}} | {{Phi_y}} | {{chi_y}} | |
| z-z | {{lambda_bar_z}} | {{Phi_z}} | {{chi_z}} | |
| Maatgevend | | | {{chi}} | {{N_bRd}} kN |
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

Overspanning:

L = 6000 mm

## Belasting (karakteristiek)

Blijvende belasting:

g_k = 5 kN/m

Veranderlijke belasting:

q_k = 10 kN/m

Combinatiefactor (NEN-EN 1990, categorie A):

psi_0 = 0.4
psi_1 = 0.5
psi_2 = 0.3

## Doorbuiging onder karakteristieke belasting

Doorbuiging onder blijvende belasting:

delta_G = 5 * g_k * L^4 / (384 * E * I_y) to mm

Doorbuiging onder veranderlijke belasting:

delta_Q = 5 * q_k * L^4 / (384 * E * I_y) to mm

Totale doorbuiging (frequente combinatie):

delta_freq = delta_G + psi_1 * delta_Q to mm

Totale doorbuiging (karakteristieke combinatie):

delta_kar = delta_G + delta_Q to mm

## Grenswaarden (NEN-EN 1990 bijlage A1.4 / NB)

@select grenswaarde "Grenswaarde doorbuiging"
L/250 — algemeen = 250
L/300 — vloerligger = 300
L/350 — draagconstructie onder glas = 350
L/500 — beperkende eis = 500
@end

Toelaatbare doorbuiging:

delta_lim = L / grenswaarde to mm

## Unity check

UC_doorbuiging = delta_kar / delta_lim

#if UC_doorbuiging < 1
  [OK] Doorbuiging voldoet ({{delta_kar}} mm < {{delta_lim}} mm, UC = {{UC_doorbuiging}}).
#else
  [NIET OK] Doorbuiging voldoet NIET ({{delta_kar}} mm > {{delta_lim}} mm, UC = {{UC_doorbuiging}})!
#end if
`;

// ---------------------------------------------------------------------------
// 11. Volledige stalen ligger toetsing — Gecombineerde controle
// ---------------------------------------------------------------------------

/** EN 1993-1-1 — Volledige toetsing stalen I/H-ligger */
export const ec3StalenLigger = `# Volledige Toetsing Stalen Ligger — EN 1993-1-1

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

## Profielgegevens

@select profiel "Profiel"
IPE 200 — h=200, b=100, A=2848 = 200
IPE 240 — h=240, b=120, A=3912 = 240
IPE 270 — h=270, b=135, A=4594 = 270
IPE 300 — h=300, b=150, A=5381 = 300
IPE 330 — h=330, b=160, A=6261 = 330
IPE 360 — h=360, b=170, A=7273 = 360
IPE 400 — h=400, b=180, A=8446 = 400
IPE 450 — h=450, b=190, A=9882 = 450
IPE 500 — h=500, b=200, A=11550 = 500
IPE 550 — h=550, b=210, A=13440 = 550
IPE 600 — h=600, b=220, A=15600 = 600
HEA 200 — h=190, b=200, A=5383 = 1200
HEA 300 — h=290, b=300, A=11253 = 1300
HEB 200 — h=200, b=200, A=7808 = 2200
HEB 300 — h=300, b=300, A=14908 = 2300
@end

Profielgegevens (handmatig aanpassen bij ander profiel):

h_p = 300 mm
b_p = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
r = 15 mm
A_p = 5381 mm^2
I_y = 83560000 mm^4
I_z = 6038000 mm^4
I_t = 201000 mm^4
I_w = 126000000000 mm^6
W_ply = 628400 mm^3
W_ely = 557300 mm^3
W_plz = 98520 mm^3
W_elz = 80500 mm^3

epsilon = sqrt(235 / f_y)

## Systeem en belasting

Overspanning:

L = 6000 mm

Kiplengte (afstand zijdelingse steunen):

L_kip = 6000 mm

Gelijkmatig verdeelde belasting (rekenwaarde UGT):

q_d = 25 kN/m

Karakteristieke belasting (BGT):

q_k = 17 kN/m

---

## Krachtwerking

Maatgevend moment:

M_Ed = q_d * L^2 / 8 to kN*m

Maatgevende dwarskracht:

V_Ed = q_d * L / 2 to kN

---

## 1. Doorsnedeclassificatie (tabel 5.2)

Lijf (inwendig plaatveld, buiging):

c_w = h_p - 2 * t_f - 2 * r to mm
c_w_tw = c_w / t_w
lim_w1 = 72 * epsilon

#if c_w_tw < lim_w1
  Lijf is Klasse 1 ({{c_w_tw}} < {{lim_w1}}).
#else
  Lijf voldoet niet aan Klasse 1.
#end if

Flens (uitwendig plaatveld):

c_f = (b_p - t_w - 2 * r) / 2 to mm
c_f_tf = c_f / t_f
lim_f1 = 9 * epsilon

#if c_f_tf < lim_f1
  Flens is Klasse 1 ({{c_f_tf}} < {{lim_f1}}).
#else
  Flens voldoet niet aan Klasse 1.
#end if

---

## 2. Buigweerstand (art. 6.2.5, formule 6.13)

M_cRd = W_ply * f_y / gamma_M0 to kN*m

UC_buiging = M_Ed / M_cRd

#if UC_buiging < 1
  [OK] Buiging voldoet (UC = {{UC_buiging}}).
#else
  [NIET OK] Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if

---

## 3. Dwarskrachtweerstand (art. 6.2.6, formule 6.18)

h_w = h_p - 2 * t_f to mm
A_v = A_p - 2 * b_p * t_f + (t_w + 2 * r) * t_f to mm^2

V_plRd = A_v * (f_y / sqrt(3)) / gamma_M0 to kN

UC_dwarskracht = V_Ed / V_plRd

#if UC_dwarskracht < 1
  [OK] Dwarskracht voldoet (UC = {{UC_dwarskracht}}).
#else
  [NIET OK] Dwarskracht voldoet NIET (UC = {{UC_dwarskracht}})!
#end if

---

## 4. Interactie buiging-dwarskracht (art. 6.2.8)

#if UC_dwarskracht > 0.5
  V_Ed > 0,5 * V_plRd: reductie buigweerstand nodig (formule 6.29).

  rho_VM = (2 * V_Ed / V_plRd - 1)^2

  Gereduceerde vloeigrens in de schuifzone:

  f_y_red = (1 - rho_VM) * f_y to N/mm^2
#else
  V_Ed <= 0,5 * V_plRd: geen interactie buiging-dwarskracht (art. 6.2.8(2)).
#end if

---

## 5. Kipstabiliteit (art. 6.3.2.3)

Momentverdeling C_1 (q-belasting):

C_1 = 1.13

Kritiek kipmoment:

M_cr = C_1 * pi^2 * E * I_z / L_kip^2 * sqrt(I_w / I_z + L_kip^2 * G * I_t / (pi^2 * E * I_z)) to kN*m

Relatieve slankheid:

lambda_LT = sqrt(W_ply * f_y / M_cr)

h_over_b = h_p / b_p

Kipcurve (tabel 6.5, gewalste I-profielen):

#if h_over_b < 2
  h/b <= 2: kipcurve b, alpha_LT = 0,34.
  alpha_LT = 0.34
#else
  h/b > 2: kipcurve c, alpha_LT = 0,49.
  alpha_LT = 0.49
#end if

Methode gewalste profielen (art. 6.3.2.3):

lambda_LT0 = 0.4
beta_LT = 0.75

Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta_LT * lambda_LT^2)

chi_LT = 1 / (Phi_LT + sqrt(Phi_LT^2 - beta_LT * lambda_LT^2))

#if chi_LT > 1
chi_LT = 1.0
#end if

Kipweerstand (formule 6.55):

M_bRd = chi_LT * W_ply * f_y / gamma_M1 to kN*m

UC_kip = M_Ed / M_bRd

#if UC_kip < 1
  [OK] Kipstabiliteit voldoet (UC = {{UC_kip}}).
#else
  [NIET OK] Kipstabiliteit voldoet NIET (UC = {{UC_kip}})!
#end if

---

## 6. Doorbuiging (art. 7.2 / NEN-EN 1990)

Toelaatbare doorbuiging (L/250):

delta_lim = L / 250 to mm

Optredende doorbuiging (karakteristiek):

delta = 5 * q_k * L^4 / (384 * E * I_y) to mm

UC_doorbuiging = delta / delta_lim

#if UC_doorbuiging < 1
  [OK] Doorbuiging voldoet ({{delta}} mm < {{delta_lim}} mm).
#else
  [NIET OK] Doorbuiging voldoet NIET!
#end if

---

## Samenvatting

| Toetsing | UC | Referentie |
|---|---|---|
| Buiging (6.2.5) | {{UC_buiging}} | formule 6.13 |
| Dwarskracht (6.2.6) | {{UC_dwarskracht}} | formule 6.18 |
| Kip (6.3.2) | {{UC_kip}} | formule 6.55 |
| Doorbuiging (7.2) | {{UC_doorbuiging}} | NEN-EN 1990 |

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
  <text x="330" y="165" text-anchor="middle" font-size="10" fill="#6366f1">delta = {{delta}} mm</text>
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
