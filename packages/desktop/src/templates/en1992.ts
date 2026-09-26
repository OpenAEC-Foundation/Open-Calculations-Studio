/**
 * EN 1992-1-1 (Eurocode 2) -- Betonconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1992-1-1:2005+A1:2015+NB:2016+A1:2020
 *
 * De invoer staat als vaste waarde in de bladtekst. Elk toetsblad sluit af met
 * UC_max en de slotzin "Maatgevende UC = …", die de afdruk als oordeel leest.
 * Controle: scripts/check-en1992.mjs.
 */

// ---------------------------------------------------------------------------
// 1. Materiaaleigenschappen -- EN 1992-1-1 Tabel 3.1 / art. 3.1
// ---------------------------------------------------------------------------

/** EN 1992-1-1 Tabel 3.1 -- Materiaaleigenschappen beton */
export const ec2Materiaal = `# Materiaaleigenschappen — EN 1992-1-1 tabel 3.1

## Beton

@select sterkteklasse "Betonsterkteklasse (Tabel 3.1)"
C12/15 -- f_ck=12 = 12
C16/20 -- f_ck=16 = 16
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
C55/67 -- f_ck=55 = 55
C60/75 -- f_ck=60 = 60
C70/85 -- f_ck=70 = 70
C80/95 -- f_ck=80 = 80
C90/105 -- f_ck=90 = 90
@end

f_ck = sterkteklasse * 1 N/mm^2
f_cm = f_ck + 8 N/mm^2

#if sterkteklasse < 51
  f_ctm = 0.30 * sterkteklasse^(2/3) * 1 N/mm^2
#else
  f_ctm = 2.12 * ln(1 + f_cm / (10 N/mm^2)) * 1 N/mm^2
#end if

f_ctk005 = 0.7 * f_ctm to N/mm^2
f_ctk095 = 1.3 * f_ctm to N/mm^2
E_cm = 22000 * (f_cm / (10 N/mm^2))^0.3 * 1 N/mm^2

## Partiële factoren (tabel 2.1N / NB)

gamma_C = 1.5
gamma_S = 1.15
alpha_cc = 1.0', NB'
alpha_ct = 1.0', NB'

## Rekenwaarden (art. 3.1.6)

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2', (3.15)'
f_ctd = alpha_ct * f_ctk005 / gamma_C to N/mm^2', (3.16)'

## Betonstaal

@select staalsoort "Betonstaalsoort"
B500B -- f_yk=500 = 500
B500A -- f_yk=500 = 500
B400 -- f_yk=400 = 400
@end

f_yk = staalsoort * 1 N/mm^2
E_s = 200000 N/mm^2
f_yd = f_yk / gamma_S to N/mm^2', art. 3.2.7'

## Rechthoekig spanningsblok (art. 3.1.7, formules 3.19-3.22)

#if sterkteklasse < 51
  lambda = 0.8', voor f_ck ≤ 50 MPa'
  eta = 1.0', voor f_ck ≤ 50 MPa'
#else
  lambda = 0.8 - (sterkteklasse - 50) / 400
  eta = 1.0 - (sterkteklasse - 50) / 200
#end if

nu = 0.6 * (1 - f_ck / (250 N/mm^2))', reductiefactor dwarskracht (6.6N)'
`;

// ---------------------------------------------------------------------------
// 2. Buigingsweerstand -- EN 1992-1-1 art. 6.1
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.1 -- Buiging rechthoekige doorsnede */
export const ec2Buiging = `# Buigingsweerstand — EN 1992-1-1 art. 6.1

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2

@select staalsoort "Betonstaalsoort"
B500B -- f_yk=500 = 500
B500A -- f_yk=500 = 500
@end

f_yk = staalsoort * 1 N/mm^2
E_s = 200000 N/mm^2

gamma_C = 1.5
gamma_S = 1.15
alpha_cc = 1.0

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2
f_yd = f_yk / gamma_S to N/mm^2
eps_yd = f_yd / E_s

lambda = 0.8', (3.19)'
eta = 1.0', (3.21)'
eps_cu3 = 0.0035', tabel 3.1'

## Doorsnede

b = 300 mm
h = 500 mm
d_1 = 50 mm
d = h - d_1 to mm

A_s = 1257 mm^2', aanwezige trekwapening'

## Belasting

M_Ed = 200 kN*m

## Benodigde wapening (rechthoekig spanningsblok)

mu_Ed = M_Ed / (b * d^2 * eta * f_cd)
mu_lim = lambda * 0.45 * (1 - lambda * 0.45 / 2)', bij x_u/d = 0,45'

#if mu_Ed > mu_lim
  Drukwapening nodig: mu_Ed > mu_lim.
#end if

zeta = 1 - sqrt(max(1 - 2 * mu_Ed; 0))', drukzone λx/d'
z_req = d * (1 - zeta / 2) to mm
A_s_req = M_Ed / (z_req * f_yd) to mm^2

## Momentweerstand bij de aanwezige wapening

x_y = A_s * f_yd / (lambda * eta * f_cd * b) to mm', drukzonehoogte als het staal vloeit'

#if x_y / d ≤ eps_cu3 / (eps_cu3 + eps_yd)
  x_u = x_y to mm
  sigma_sd = f_yd to N/mm^2', het staal vloeit'
#else
  Het staal vloeit niet: x_u en sigma_sd volgen uit de rekverdeling.
  F_c = lambda * eta * f_cd * b to N/mm
  F_s = A_s * E_s * eps_cu3 to N
  x_u = (sqrt(F_s^2 + 4 * F_c * F_s * d) - F_s) / (2 * F_c) to mm
  sigma_sd = E_s * eps_cu3 * (d - x_u) / x_u to N/mm^2
#end if

#if x_u / d > 0.45
  Let op: x_u/d > 0,45, beperkte rotatiecapaciteit (art. 5.6.3(2)).
#end if

z = d - lambda * x_u / 2 to mm
M_Rd = A_s * sigma_sd * z to kN*m

## Minimumwapening (art. 9.2.1.1)

f_ctm = 0.30 * sterkteklasse^(2/3) * 1 N/mm^2
A_smin = max(0.26 * f_ctm / f_yk * b * d; 0.0013 * b * d) to mm^2', (9.1N)'

## Toetsing

UC_buiging = M_Ed / M_Rd
UC_min = A_smin / A_s
UC_max = max(UC_buiging; UC_min)

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 3. Dwarskrachtweerstand zonder beugels -- EN 1992-1-1 art. 6.2.2
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.2.2 -- Dwarskracht zonder beugels */
export const ec2DwarskrachtZonder = `# Dwarskracht zonder beugels — EN 1992-1-1 art. 6.2.2

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2

gamma_C = 1.5
alpha_cc = 1.0

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2

## Doorsnede

b_w = 300 mm
h = 500 mm
d = 450 mm

A_sl = 1257 mm^2', langswapening in de trekzone'

## Belasting

V_Ed = 120 kN
N_Ed = 0 kN', druk positief'

## Dwarskrachtweerstand (formule 6.2a/b, NB)

C_Rdc = 0.18 / gamma_C
k_1 = 0.15

k_shear = min(1 + sqrt(200 mm / d); 2)
rho_l = min(A_sl / (b_w * d); 0.02)
sigma_cp = min(N_Ed / (b_w * h); 0.2 * f_cd) to N/mm^2
v_min = 0.035 * k_shear^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2 to N/mm^2', (6.3N)'

V_Rdc = max(C_Rdc * k_shear * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2; v_min) * b_w * d + k_1 * sigma_cp * b_w * d to kN

## Toetsing

UC_dwarskracht = V_Ed / V_Rdc
UC_max = UC_dwarskracht

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>, geen dwarskrachtwapening nodig
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span> zonder beugels: dwarskrachtwapening nodig (art. 6.2.3)
#end if
`;

// ---------------------------------------------------------------------------
// 4. Dwarskrachtweerstand met beugels -- EN 1992-1-1 art. 6.2.3
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.2.3 -- Dwarskracht met beugels */
export const ec2DwarskrachtMet = `# Dwarskracht met beugels — EN 1992-1-1 art. 6.2.3

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2

@select staalsoort "Betonstaalsoort beugels"
B500B -- f_ywk=500 = 500
B500A -- f_ywk=500 = 500
@end

f_ywk = staalsoort * 1 N/mm^2

gamma_C = 1.5
gamma_S = 1.15
alpha_cc = 1.0

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2
f_ywd = f_ywk / gamma_S to N/mm^2

## Doorsnede

b_w = 300 mm
h = 600 mm
d = 550 mm

z = 0.9 * d to mm', art. 6.2.3(1)'

## Beugels

@select beugeldia "Beugeldiameter"
dia6 -- A=28.3 = 28.3
dia8 -- A=50.3 = 50.3
dia10 -- A=78.5 = 78.5
dia12 -- A=113.1 = 113.1
@end

A_sw1 = beugeldia * 1 mm^2', per beugelpoot'
n_poten = 2
A_sw = n_poten * A_sw1 to mm^2
s = 200 mm', hart-op-hartafstand'

## Drukdiagonaalhoek theta

@select theta_keuze "Hoek betondrukdiagonaal theta"
theta = 21.8 graden (cot = 2.5) = 2.5
theta = 26.6 graden (cot = 2.0) = 2.0
theta = 30 graden (cot = 1.73) = 1.73
theta = 35 graden (cot = 1.43) = 1.43
theta = 40 graden (cot = 1.19) = 1.19
theta = 45 graden (cot = 1.0) = 1.0
@end

cot_theta = theta_keuze * 1
tan_theta = 1 / cot_theta

## Belasting

V_Ed = 300 kN

## Dwarskrachtweerstand

V_Rds = A_sw / s * z * f_ywd * cot_theta to kN', beugels (6.8)'

alpha_cw = 1.0', niet voorgespannen'
nu_1 = 0.6 * (1 - f_ck / (250 N/mm^2))', (6.6N), NB: ν_1 = ν'

V_Rdmax = alpha_cw * b_w * z * nu_1 * f_cd / (cot_theta + tan_theta) to kN', drukdiagonaal (6.9)'

s_max = 0.75 * d to mm', art. 9.2.2(6)'

## Toetsing

UC_Vrds = V_Ed / V_Rds
UC_Vrdmax = V_Ed / V_Rdmax
UC_s = s / s_max
UC_max = max(UC_Vrds; UC_Vrdmax; UC_s)

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 5. Pons (punching shear) -- EN 1992-1-1 art. 6.4
// ---------------------------------------------------------------------------

/**
 * EN 1992-1-1 art. 6.4 -- Pons.
 *
 * Rand- en hoekkolom liggen gelijk met de plaatrand. Dan gelden de
 * controle-omtrek van figuur 6.15 en de kolomomtrek u_0 van art. 6.4.5(3); de
 * β-waarden van figuur 6.21N horen bij die kleinere omtrek. De keuzewaarden
 * blijven 1.15/1.40/1.50, zodat opgeslagen bladen hun keuze houden.
 */
export const ec2Pons = `# Ponsweerstand — EN 1992-1-1 art. 6.4

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2

gamma_C = 1.5
alpha_cc = 1.0

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2

## Plaat

h = 250 mm
d_y = 200 mm
d_z = 190 mm
d_eff = (d_y + d_z) / 2 to mm', (6.32)'

rho_ly = 0.008
rho_lz = 0.008
rho_l = min(sqrt(rho_ly * rho_lz); 0.02)', art. 6.4.4(1)'

## Kolom

@select kolomtype "Kolomtype (rand- en hoekkolom gelijk met de plaatrand)"
Middenkolom (beta = 1.15) = 1.15
Randkolom (beta = 1.40) = 1.40
Hoekkolom (beta = 1.50) = 1.50
@end

beta_pons = kolomtype * 1', figuur 6.21N'

c_1 = 400 mm', loodrecht op de vrije rand (figuur 6.20a)'
c_2 = 400 mm', evenwijdig aan de vrije rand'

## Belasting

V_Ed = 500 kN

## Controle-omtrek u_1 op 2d (art. 6.4.2, figuur 6.13 en 6.15)

#if kolomtype < 1.3
  u_1 = 2 * (c_1 + c_2) + 4 * pi * d_eff to mm
#else if kolomtype < 1.45
  u_1 = 2 * c_1 + c_2 + 2 * pi * d_eff to mm
#else
  u_1 = c_1 + c_2 + pi * d_eff to mm
#end if

v_Ed = beta_pons * V_Ed / (u_1 * d_eff) to N/mm^2', (6.38)'

## Ponsweerstand zonder ponswapening (art. 6.4.4)

C_Rdc = 0.18 / gamma_C
k_pons = min(1 + sqrt(200 mm / d_eff); 2)
v_min = 0.035 * k_pons^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2 to N/mm^2', (6.3N)'
v_Rdc = max(C_Rdc * k_pons * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2; v_min) to N/mm^2', (6.47)'

## Maximale ponsweerstand langs de kolom (art. 6.4.5(3), NB)

#if kolomtype < 1.3
  u_0 = 2 * (c_1 + c_2) to mm
#else if kolomtype < 1.45
  u_0 = min(c_2 + 3 * d_eff; c_2 + 2 * c_1) to mm
#else
  u_0 = min(3 * d_eff; c_1 + c_2) to mm
#end if

nu = 0.6 * (1 - f_ck / (250 N/mm^2))', (6.6N)'
v_Rdmax = 0.4 * nu * f_cd to N/mm^2
v_Ed0 = beta_pons * V_Ed / (u_0 * d_eff) to N/mm^2

## Toetsing

UC_pons = v_Ed / v_Rdc
UC_vRdmax = v_Ed0 / v_Rdmax
UC_max = max(UC_pons; UC_vRdmax)

#if UC_vRdmax > 1
  Drukdiagonaal langs de kolom bezwijkt: grotere kolom of dikkere plaat nodig.
#end if
#if UC_pons > 1
  Ponswapening nodig (6.52); die is in dit blad niet uitgewerkt.
#end if

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 6. Scheurwijdte -- EN 1992-1-1 art. 7.3.4
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 7.3.4 -- Scheurwijdte */
export const ec2Scheurwijdte = `# Scheurwijdteberekening — EN 1992-1-1 art. 7.3.4

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2
f_cm = f_ck + 8 N/mm^2
f_ctm = 0.30 * sterkteklasse^(2/3) * 1 N/mm^2
f_cteff = f_ctm to N/mm^2', treksterkte bij het ontstaan van de scheur'

E_s = 200000 N/mm^2
E_cm = 22000 * (f_cm / (10 N/mm^2))^0.3 * 1 N/mm^2
alpha_e = E_s / E_cm

## Doorsnede en wapening

b = 300 mm
h = 500 mm
d = 450 mm

phi = 16 mm', staafdiameter langswapening'
c = 35 mm', betondekking op de langswapening'
A_s = 1257 mm^2', aanwezige trekwapening'

## Belasting (BGT)

M_Ed_bgt = 120 kN*m

@select belastingduur "Type belasting"
Langdurend (k_t = 0.4) = 0.4
Kortdurend (k_t = 0.6) = 0.6
@end

k_t = belastingduur * 1

phi_kr = 2.5', kruipcoëfficiënt φ(∞,t_0) (bijlage B), alleen bij langdurende belasting'

## Staalspanning in de gescheurde doorsnede

#if k_t < 0.5
  alpha_eL = alpha_e * (1 + phi_kr)', E_s/E_c,eff (art. 7.4.3(5))'
#else
  alpha_eL = alpha_e
#end if

rho = A_s / (b * d)
x = d * (sqrt((alpha_eL * rho)^2 + 2 * alpha_eL * rho) - alpha_eL * rho) to mm
sigma_s = M_Ed_bgt / ((d - x / 3) * A_s) to N/mm^2

## Effectief trekgebied (art. 7.3.2(3), figuur 7.1)

h_cef = min(2.5 * (h - d); (h - x) / 3; h / 2) to mm
rho_peff = A_s / (b * h_cef)', (7.10)'

## Scheurafstand en scheurwijdte (NB)

k_1 = 0.8
k_2 = 0.5
k_3 = 3.4
k_4 = 0.425

s_rmax = k_3 * c + k_1 * k_2 * k_4 * phi / rho_peff to mm', (7.11)'
eps_sm = max((sigma_s - k_t * f_cteff / rho_peff * (1 + alpha_e * rho_peff)) / E_s; 0.6 * sigma_s / E_s)', ε_sm − ε_cm (7.9)'
w_k = s_rmax * eps_sm to mm', (7.8)'

@select milieuklasse "Milieuklasse"
X0 / XC1 (w_max = 0.4 mm) = 0.4
XC2 / XC3 / XC4 (w_max = 0.3 mm) = 0.3
XD1 / XD2 / XD3 / XS1 / XS2 / XS3 (w_max = 0.3 mm) = 0.3
@end

w_max = milieuklasse * 1 mm', tabel 7.1N'

## Toetsing

UC_scheur = w_k / w_max
UC_max = UC_scheur

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
`;

// ---------------------------------------------------------------------------
// 7. Doorbuiging (slankheidscontrole) -- EN 1992-1-1 art. 7.4.2
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 7.4.2 -- Doorbuiging (slankheidscontrole) */
export const ec2Doorbuiging = `# Doorbuigingscontrole — EN 1992-1-1 art. 7.4.2

## Materiaal

@select sterkteklasse "Betonsterkteklasse"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2

f_yk = 500 N/mm^2

## Constructief systeem (Tabel 7.4N)

@select systeem "Constructief systeem"
Vrij opgelegde balk / plaat (K=1.0) = 1.0
Eindoverspanning doorgaand (K=1.3) = 1.3
Tussenoverspanning doorgaand (K=1.5) = 1.5
Vlakke plaatvloer (K=1.2) = 1.2
Uitkraging (K=0.4) = 0.4
@end

K_sys = systeem * 1

## Doorsnede

b = 300 mm
h = 500 mm
d = 450 mm
L = 6000 mm', overspanning'

## Wapening

A_s_req = 1200 mm^2', benodigde trekwapening'
A_s_prov = 1257 mm^2', aanwezige trekwapening'
A_s2 = 0 mm^2', drukwapening'

rho = A_s_req / (b * d)
rho_prime = A_s2 / (b * d)
rho_0 = sqrt(f_ck / (1 N/mm^2)) / 1000

## Grenswaarde l/d (formule 7.16)

#if rho < rho_0
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho + 3.2 * sqrt(f_ck / (1 N/mm^2)) * (rho_0 / rho - 1)^(3/2))', (7.16a)'
#else
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / (rho - rho_prime) + 1/12 * sqrt(f_ck / (1 N/mm^2)) * sqrt(rho_prime / rho_0))', (7.16b)'
#end if

corr_staal = 500 / (f_yk / (1 N/mm^2)) * A_s_prov / A_s_req', (7.17)'

ld_toel = ld_basis * corr_staal
ld_werk = L / d

## Toetsing

UC_doorbuiging = ld_werk / ld_toel
UC_max = UC_doorbuiging

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span> via het slankheidscriterium
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span> via het slankheidscriterium; nadere berekening nodig (art. 7.4.3)
#end if
`;

// ---------------------------------------------------------------------------
// 8. Volledige betonbalk toetsing -- Gecombineerde controle
// ---------------------------------------------------------------------------

/** EN 1992-1-1 Complete -- Volledige betonbalk toetsing */
export const ec2BetonBalk = `# Volledige toetsing betonbalk — EN 1992-1-1

#hide
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

## Materiaal

@select sterkteklasse "Betonsterkteklasse (Tabel 3.1)"
C20/25 -- f_ck=20 = 20
C25/30 -- f_ck=25 = 25
C28/35 -- f_ck=28 = 28
C30/37 -- f_ck=30 = 30
C35/45 -- f_ck=35 = 35
C40/50 -- f_ck=40 = 40
C45/55 -- f_ck=45 = 45
C50/60 -- f_ck=50 = 50
@end

f_ck = sterkteklasse * 1 N/mm^2
f_cm = f_ck + 8 N/mm^2
f_ctm = 0.30 * sterkteklasse^(2/3) * 1 N/mm^2
E_cm = 22000 * (f_cm / (10 N/mm^2))^0.3 * 1 N/mm^2

@select staalsoort "Betonstaalsoort"
B500B -- f_yk=500 = 500
B500A -- f_yk=500 = 500
@end

f_yk = staalsoort * 1 N/mm^2
E_s = 200000 N/mm^2

gamma_C = 1.5
gamma_S = 1.15
alpha_cc = 1.0

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2
f_yd = f_yk / gamma_S to N/mm^2

## Doorsnede en wapening

b = 300 mm
h = 600 mm
d_1 = 50 mm
d = h - d_1 to mm

phi = 20 mm', staafdiameter'
n_staven = 4
A_s = n_staven * pi / 4 * phi^2 to mm^2

## Systeem en belasting

L = 7000 mm', vrij opgelegde overspanning'
q_d = 30 kN/m', UGT'
q_qp = 20 kN/m', quasi-blijvend: g_k + ψ_2·q_k (NEN-EN 1990, 6.16b)'

M_Ed = q_d * L^2 / 8 to kN*m
V_Ed = q_d * L / 2 to kN
M_qp = q_qp * L^2 / 8 to kN*m

---

## 1. Buiging (art. 6.1)

lambda = 0.8
eta = 1.0
eps_cu3 = 0.0035
eps_yd = f_yd / E_s

x_y = A_s * f_yd / (lambda * eta * f_cd * b) to mm', drukzonehoogte als het staal vloeit'

#if x_y / d ≤ eps_cu3 / (eps_cu3 + eps_yd)
  x_u = x_y to mm
  sigma_sd = f_yd to N/mm^2', het staal vloeit'
#else
  Het staal vloeit niet: x_u en sigma_sd volgen uit de rekverdeling.
  F_c = lambda * eta * f_cd * b to N/mm
  F_s = A_s * E_s * eps_cu3 to N
  x_u = (sqrt(F_s^2 + 4 * F_c * F_s * d) - F_s) / (2 * F_c) to mm
  sigma_sd = E_s * eps_cu3 * (d - x_u) / x_u to N/mm^2
#end if

#if x_u / d > 0.45
  Let op: x_u/d > 0,45, beperkte rotatiecapaciteit (art. 5.6.3(2)).
#end if

z = d - lambda * x_u / 2 to mm
M_Rd = A_s * sigma_sd * z to kN*m

UC_buiging = M_Ed / M_Rd

---

## 2. Dwarskracht (art. 6.2)

C_Rdc = 0.18 / gamma_C
k_shear = min(1 + sqrt(200 mm / d); 2)
rho_l = min(A_s / (b * d); 0.02)
v_min = 0.035 * k_shear^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2 to N/mm^2', (6.3N)'
V_Rdc = max(C_Rdc * k_shear * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2; v_min) * b * d to kN', (6.2a/b)'

phi_w = 8 mm', beugel, tweesnedig'
A_sw = 2 * pi / 4 * phi_w^2 to mm^2
s_w = 200 mm
f_ywd = f_yd to N/mm^2
z_v = 0.9 * d to mm', art. 6.2.3(1)'
cot_theta = 2.5
tan_theta = 1 / cot_theta

V_Rds = A_sw / s_w * z_v * f_ywd * cot_theta to kN', (6.8)'

nu_1 = 0.6 * (1 - f_ck / (250 N/mm^2))', (6.6N)'
alpha_cw = 1.0

V_Rdmax = alpha_cw * b * z_v * nu_1 * f_cd / (cot_theta + tan_theta) to kN', (6.9)'

#if V_Ed ≤ V_Rdc
  Geen rekenkundige dwarskrachtwapening nodig; minimumbeugels volgens art. 9.2.2.
  UC_dwarskracht = V_Ed / V_Rdc
#else
  UC_dwarskracht = V_Ed / V_Rds
#end if

UC_Vrdmax = V_Ed / V_Rdmax

---

## 3. Scheurwijdte (art. 7.3.4)

@select milieuklasse "Milieuklasse"
X0 / XC1 (w_max = 0.4 mm) = 0.4
XC2 / XC3 / XC4 (w_max = 0.3 mm) = 0.3
XD / XS (w_max = 0.3 mm) = 0.3
@end

w_max = milieuklasse * 1 mm', tabel 7.1N'
c_nom = 35 mm', dekking op de langswapening'
phi_kr = 2.5', kruipcoëfficiënt φ(∞,t_0) (bijlage B)'

alpha_e = E_s / E_cm
alpha_eL = alpha_e * (1 + phi_kr)', E_s/E_c,eff (art. 7.4.3(5))'
rho_s = A_s / (b * d)
x_bgt = d * (sqrt((alpha_eL * rho_s)^2 + 2 * alpha_eL * rho_s) - alpha_eL * rho_s) to mm', gescheurde doorsnede'
sigma_s = M_qp / ((d - x_bgt / 3) * A_s) to N/mm^2

h_cef = min(2.5 * (h - d); (h - x_bgt) / 3; h / 2) to mm', art. 7.3.2(3)'
rho_peff = A_s / (b * h_cef)', (7.10)'

k_t = 0.4', langdurend'
eps_sm = max((sigma_s - k_t * f_ctm / rho_peff * (1 + alpha_e * rho_peff)) / E_s; 0.6 * sigma_s / E_s)', (7.9)'

k_1 = 0.8
k_2 = 0.5
k_3 = 3.4
k_4 = 0.425

s_rmax = k_3 * c_nom + k_1 * k_2 * k_4 * phi / rho_peff to mm', (7.11)'
w_k = s_rmax * eps_sm to mm', (7.8)'

UC_scheur = w_k / w_max

---

## 4. Doorbuiging (art. 7.4.2, slankheidscontrole)

@select systeem "Constructief systeem (Tabel 7.4N)"
Vrij opgelegd (K=1.0) = 1.0
Eindoverspanning doorgaand (K=1.3) = 1.3
Tussenoverspanning doorgaand (K=1.5) = 1.5
@end

K_sys = systeem * 1

rho_doorb = A_s / (b * d)
rho_0 = sqrt(f_ck / (1 N/mm^2)) / 1000

#if rho_doorb < rho_0
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho_doorb + 3.2 * sqrt(f_ck / (1 N/mm^2)) * (rho_0 / rho_doorb - 1)^(3/2))', (7.16a)'
#else
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho_doorb)', (7.16b)'
#end if

ld_toel = ld_basis * 500 / (f_yk / (1 N/mm^2))
ld_werk = L / d

UC_doorbuiging = ld_werk / ld_toel

---

## Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Toetsing</th><th style="text-align:right; padding-right:14px">UC</th><th style="text-align:left">Oordeel</th></tr>
'<tr><td style="padding:2px 12px 2px 0">Buiging (6.1)</td><td style="text-align:right; padding-right:14px">'UC_buiging'</td><td>'oordeel(UC_buiging)'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Dwarskracht, V<sub>Rd,c</sub> of beugels (6.2.2/6.2.3)</td><td style="text-align:right; padding-right:14px">'UC_dwarskracht'</td><td>'oordeel(UC_dwarskracht)'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Drukdiagonaal (6.9)</td><td style="text-align:right; padding-right:14px">'UC_Vrdmax'</td><td>'oordeel(UC_Vrdmax)'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Scheurwijdte (7.3.4)</td><td style="text-align:right; padding-right:14px">'UC_scheur'</td><td>'oordeel(UC_scheur)'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">Doorbuiging (7.4.2)</td><td style="text-align:right; padding-right:14px">'UC_doorbuiging'</td><td>'oordeel(UC_doorbuiging)'</td></tr>
'</table>

UC_max = max(UC_buiging; UC_dwarskracht; UC_Vrdmax; UC_scheur; UC_doorbuiging)

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
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
  <!-- Balk -->
  <rect x="60" y="110" width="480" height="40" fill="#b0b0b0" stroke="#505050" stroke-width="1.5" rx="1"/>
  <!-- Doorsnede label -->
  <text x="300" y="135" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">{{b}} x {{h}} mm</text>
  <!-- Wapening onderaan (cirkels) -->
  <circle cx="120" cy="140" r="4" fill="#333" stroke="#111" stroke-width="1"/>
  <circle cx="200" cy="140" r="4" fill="#333" stroke="#111" stroke-width="1"/>
  <circle cx="400" cy="140" r="4" fill="#333" stroke="#111" stroke-width="1"/>
  <circle cx="480" cy="140" r="4" fill="#333" stroke="#111" stroke-width="1"/>
  <!-- Oplegging links (scharnier) -->
  <polygon points="60,150 45,180 75,180" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="40" y1="183" x2="80" y2="183" stroke="#374151" stroke-width="2"/>
  <rect x="40" y="183" width="40" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Oplegging rechts (rol) -->
  <polygon points="540,150 525,180 555,180" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="532" cy="185" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <circle cx="548" cy="185" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="522" y1="193" x2="558" y2="193" stroke="#374151" stroke-width="2"/>
  <rect x="522" y="193" width="36" height="8" fill="url(#hatch)" stroke="none"/>
  <!-- Verdeelde belasting -->
  <line x1="60" y1="60" x2="540" y2="60" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="120" y1="60" x2="120" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="200" y1="60" x2="200" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="280" y1="60" x2="280" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="360" y1="60" x2="360" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="440" y1="60" x2="440" y2="105" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <text x="300" y="50" text-anchor="middle" font-size="12" fill="#dc2626" font-style="italic">q_d = {{q_d}} kN/m</text>
  <!-- Oplegreacties -->
  <line x1="60" y1="220" x2="60" y2="195" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="60" y="235" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <line x1="540" y1="220" x2="540" y2="195" stroke="#059669" stroke-width="2" marker-end="url(#arrowGreen)"/>
  <text x="540" y="235" text-anchor="middle" font-size="10" fill="#059669">{{V_Ed}} kN</text>
  <!-- Momentverdeling -->
  <text x="300" y="270" text-anchor="middle" font-size="11" fill="#1e40af" font-weight="bold">M_Ed = {{M_Ed}} kN*m</text>
  <!-- Maat overspanning -->
  <line x1="60" y1="250" x2="540" y2="250" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="60" y1="244" x2="60" y2="256" stroke="#6b7280" stroke-width="1"/>
  <line x1="540" y1="244" x2="540" y2="256" stroke="#6b7280" stroke-width="1"/>
  <text x="300" y="248" text-anchor="middle" font-size="11" fill="#6b7280">L = {{L}} mm</text>
  <!-- Wapening label -->
  <text x="300" y="290" text-anchor="middle" font-size="10" fill="#333">A_s = {{A_s}} mm^2 ({{n_staven}} dia {{phi}} mm)</text>
</svg>
@end
`;
