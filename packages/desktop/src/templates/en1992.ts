/**
 * EN 1992-1-1 (Eurocode 2) -- Betonconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1992-1-1:2005+A1:2015+NB:2016+A1:2020
 */

// ---------------------------------------------------------------------------
// 1. Materiaaleigenschappen -- EN 1992-1-1 Tabel 3.1 / art. 3.1
// ---------------------------------------------------------------------------

/** EN 1992-1-1 Tabel 3.1 -- Materiaaleigenschappen beton */
export const ec2Materiaal = `# Materiaaleigenschappen -- EN 1992-1-1 Tabel 3.1

## Betoneigenschappen

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

Karakteristieke cilinderdruksterkte (Tabel 3.1):

f_ck = sterkteklasse * 1 N/mm^2

Gemiddelde cilinderdruksterkte (Tabel 3.1):

f_cm = f_ck + 8 N/mm^2

Gemiddelde treksterkte (Tabel 3.1, formule 3.1):

#if f_ck < 51
  f_ctm = 0.30 * f_ck^(2/3) * 1 N/mm^2
#else
  f_ctm = 2.12 * ln(1 + f_cm / (10 N/mm^2)) * 1 N/mm^2
#end if

5%-fractielwaarde treksterkte:

f_ctk005 = 0.7 * f_ctm to N/mm^2

95%-fractielwaarde treksterkte:

f_ctk095 = 1.3 * f_ctm to N/mm^2

Elasticiteitsmodulus (Tabel 3.1):

E_cm = 22000 * (f_cm / (10 N/mm^2))^0.3 * 1 N/mm^2

## Partiele factoren (Tabel 2.1N / NB)

Partiele factor beton:

gamma_C = 1.5

Partiele factor betonstaal:

gamma_S = 1.15

Factor alpha_cc (NB):

alpha_cc = 1.0

Factor alpha_ct (NB):

alpha_ct = 1.0

## Rekenwaarden (art. 3.1.6)

Rekenwaarde druksterkte (formule 3.15):

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2

Rekenwaarde treksterkte (formule 3.16):

f_ctd = alpha_ct * f_ctk005 / gamma_C to N/mm^2

## Betonstaal

@select staalsoort "Betonstaalsoort"
B500B -- f_yk=500 = 500
B500A -- f_yk=500 = 500
B400 -- f_yk=400 = 400
@end

Karakteristieke vloeigrens:

f_yk = staalsoort * 1 N/mm^2

Elasticiteitsmodulus staal:

E_s = 200000 N/mm^2

Rekenwaarde vloeigrens (art. 3.2.7):

f_yd = f_yk / gamma_S to N/mm^2

## Rechthoekig spanningsblok (art. 3.1.7, formules 3.19-3.22)

#if f_ck < 51
  lambda = 0.8 (voor f_ck <= 50 MPa)
  eta = 1.0 (voor f_ck <= 50 MPa)
#else
  lambda = 0.8 - (f_ck - 50 N/mm^2) / (400 N/mm^2)
  eta = 1.0 - (f_ck - 50 N/mm^2) / (200 N/mm^2)
#end if

Reductiefactor dwarskracht (formule 6.6N):

nu = 0.6 * (1 - f_ck / (250 N/mm^2))
`;

// ---------------------------------------------------------------------------
// 2. Buigingsweerstand -- EN 1992-1-1 art. 6.1
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.1 -- Buiging rechthoekige doorsnede */
export const ec2Buiging = `# Buigingsweerstand -- EN 1992-1-1 art. 6.1

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

Partiele factoren (Tabel 2.1N / NB):

gamma_C = 1.5
gamma_S = 1.15
alpha_cc = 1.0

Rekenwaarden:

f_cd = alpha_cc * f_ck / gamma_C to N/mm^2
f_yd = f_yk / gamma_S to N/mm^2

Spanningsblokparameters (art. 3.1.7):

lambda = 0.8
eta = 1.0

## Doorsnede

b = 300 mm
h = 500 mm
d_1 = 50 mm

Effectieve hoogte:

d = h - d_1 to mm

## Belasting

Maatgevend buigend moment:

M_Ed = 200 kN*m

## Buigingsberekening (rechthoekig spanningsblok)

Relatief moment:

mu_Ed = M_Ed / (b * d^2 * eta * f_cd)

Grenswaarde relatief moment (x_u/d = 0.45 voor voldoende ductiliteit):

mu_lim = lambda * 0.45 * (1 - lambda * 0.45 / 2)

#if mu_Ed > mu_lim
  Drukwapening nodig! mu_Ed > mu_lim.
#end if

Relatieve drukhoogte:

zeta = 1 - sqrt(1 - 2 * mu_Ed)

x_u = zeta * d to mm

Hefboomsarm:

z = d * (1 - lambda * zeta / 2) to mm

Benodigde wapening (uit M_Ed = z * A_s * f_yd):

A_s_req = M_Ed / (z * f_yd) to mm^2

Momentweerstand bij gegeven wapening:

A_s = A_s_req to mm^2

M_Rd = z * A_s * f_yd to kN*m

## Toetsing

UC_buiging = M_Ed / M_Rd

#if UC_buiging < 1
  Buiging voldoet (UC = {{UC_buiging}}).
#else
  Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if

## Minimumwapening (art. 9.2.1.1)

f_ctm = 0.30 * f_ck^(2/3) * 1 N/mm^2

A_smin1 = 0.26 * f_ctm / f_yk * b * d to mm^2
A_smin2 = 0.0013 * b * d to mm^2

#if A_smin1 > A_smin2
  A_smin = A_smin1 (maatgevend).
#else
  A_smin = A_smin2 (maatgevend).
#end if

#if A_s < A_smin1
  Let op: A_s < A_s,min!
#else
  Minimumwapening voldoet.
#end if
`;

// ---------------------------------------------------------------------------
// 3. Dwarskrachtweerstand zonder beugels -- EN 1992-1-1 art. 6.2.2
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.2.2 -- Dwarskracht zonder beugels */
export const ec2DwarskrachtZonder = `# Dwarskracht zonder beugels -- EN 1992-1-1 art. 6.2.2

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

Langswapening in trekzone:

A_sl = 1257 mm^2

## Belasting

V_Ed = 120 kN
N_Ed = 0 kN

## Dwarskrachtweerstand zonder beugels (formule 6.2.a/b)

Coefficienten (NB):

C_Rdc = 0.18 / gamma_C

k_1 = 0.15

Schaalfactor k (art. 6.2.2):

k_shear = 1 + sqrt(200 mm / d)

#if k_shear > 2
  k_shear is begrensd tot 2,0.
#end if

Wapeningsverhouding langswapening:

rho_l = A_sl / (b_w * d)

#if rho_l > 0.02
  rho_l is begrensd tot 0,02.
#end if

Betondrukspanning door normaalkracht:

sigma_cp = N_Ed / (b_w * h) to N/mm^2

V_Rdc = (C_Rdc * k_shear * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2 + k_1 * sigma_cp) * b_w * d to kN

Minimumwaarde (formule 6.2.b):

v_min = 0.035 * k_shear^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2

V_Rdc_min = (v_min + k_1 * sigma_cp) * b_w * d to kN

#if V_Rdc < V_Rdc_min
  V_Rdc verhoogd naar minimumwaarde.
#end if

## Toetsing

UC_dwarskracht = V_Ed / V_Rdc

#if UC_dwarskracht < 1
  Geen beugels nodig (UC = {{UC_dwarskracht}}).
#else
  Beugels vereist! V_Ed > V_Rd,c (UC = {{UC_dwarskracht}}).
#end if
`;

// ---------------------------------------------------------------------------
// 4. Dwarskrachtweerstand met beugels -- EN 1992-1-1 art. 6.2.3
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.2.3 -- Dwarskracht met beugels */
export const ec2DwarskrachtMet = `# Dwarskracht met beugels -- EN 1992-1-1 art. 6.2.3

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

Hefboomsarm (aanname z = 0.9d):

z = 0.9 * d to mm

## Beugels

@select beugeldia "Beugeldiameter"
dia6 -- A=28.3 = 28.3
dia8 -- A=50.3 = 50.3
dia10 -- A=78.5 = 78.5
dia12 -- A=113.1 = 113.1
@end

Oppervlakte per beugelpoot:

A_sw1 = beugeldia * 1 mm^2

Aantal poten:

n_poten = 2

A_sw = n_poten * A_sw1 to mm^2

Hart-op-hart afstand beugels:

s = 200 mm

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

## Dwarskrachtweerstand beugels (formule 6.8)

V_Rds = A_sw / s * z * f_ywd * cot_theta to kN

## Maximale dwarskrachtweerstand drukdiagonaal (formule 6.9)

Niet-voorgespannen constructie:

alpha_cw = 1.0

Reductiefactor (formule 6.6N, NB: v_1 = v):

nu_1 = 0.6 * (1 - f_ck / (250 N/mm^2))

V_Rdmax = alpha_cw * b_w * z * nu_1 * f_cd / (cot_theta + tan_theta) to kN

## Toetsing

Maatgevend is de kleinste waarde:

#if V_Rds < V_Rdmax
  V_Rd = V_Rds (beugels maatgevend).
#else
  V_Rd = V_Rdmax (drukdiagonaal maatgevend).
#end if

UC_Vrds = V_Ed / V_Rds
UC_Vrdmax = V_Ed / V_Rdmax

#if UC_Vrds < 1
  Beugels voldoen (UC = {{UC_Vrds}}).
#else
  Beugels voldoen NIET (UC = {{UC_Vrds}})! Meer beugels of kleinere s nodig.
#end if

#if UC_Vrdmax < 1
  Drukdiagonaal voldoet (UC = {{UC_Vrdmax}}).
#else
  Drukdiagonaal voldoet NIET (UC = {{UC_Vrdmax}})! Grotere doorsnede of kleiner theta nodig.
#end if

## Maximale beugel h.o.h. (art. 9.2.2)

s_max = 0.75 * d to mm

#if s > s_max
  Let op: beugel h.o.h. s = {{s}} mm > s_max = {{s_max}} mm!
#else
  Beugel h.o.h. voldoet (s = {{s}} mm <= {{s_max}} mm).
#end if
`;

// ---------------------------------------------------------------------------
// 5. Pons (punching shear) -- EN 1992-1-1 art. 6.4
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 6.4 -- Pons */
export const ec2Pons = `# Ponsweerstand -- EN 1992-1-1 art. 6.4

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

Plaatdikte:

h = 250 mm

Effectieve hoogten in twee richtingen:

d_y = 200 mm
d_z = 190 mm

Gemiddelde effectieve hoogte (formule 6.32):

d_eff = (d_y + d_z) / 2 to mm

## Kolom

@select kolomtype "Kolomtype"
Middenkolom (beta = 1.15) = 1.15
Randkolom (beta = 1.40) = 1.40
Hoekkolom (beta = 1.50) = 1.50
@end

Belastingverdelingsfactor beta (figuur 6.21N):

beta_pons = kolomtype * 1

Kolomafmetingen:

c_1 = 400 mm
c_2 = 400 mm

## Wapening in plaat

Wapeningsverhouding y-richting:

rho_ly = 0.008

Wapeningsverhouding z-richting:

rho_lz = 0.008

Geometrisch gemiddelde (art. 6.4.4):

rho_l = sqrt(rho_ly * rho_lz)

#if rho_l > 0.02
  rho_l begrensd tot 0,02.
#end if

## Belasting

Ponskracht:

V_Ed = 500 kN

## Eerste controle-omtrek u_1 (art. 6.4.2)

Omtrek op afstand 2d van kolom (rechthoekige kolom):

u_1 = 2 * (c_1 + c_2) + 2 * pi * 2 * d_eff to mm

Schuifspanning (formule 6.38):

v_Ed = beta_pons * V_Ed / (u_1 * d_eff) to N/mm^2

## Ponsweerstand zonder ponswapening (art. 6.4.4, formule 6.47)

C_Rdc = 0.18 / gamma_C

k_pons = 1 + sqrt(200 mm / d_eff)

#if k_pons > 2
  k_pons begrensd tot 2,0.
#end if

v_Rdc = C_Rdc * k_pons * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2

Minimumwaarde:

v_min = 0.035 * k_pons^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2

#if v_Rdc < v_min
  v_Rdc verhoogd naar v_min.
#end if

## Maximale ponsweerstand (art. 6.4.5, NB)

Kolomrand-omtrek:

u_0 = 2 * (c_1 + c_2) to mm

nu = 0.6 * (1 - f_ck / (250 N/mm^2))

v_Rdmax = 0.4 * nu * f_cd to N/mm^2

v_Ed0 = beta_pons * V_Ed / (u_0 * d_eff) to N/mm^2

## Toetsing

UC_pons = v_Ed / v_Rdc

UC_max = v_Ed0 / v_Rdmax

#if UC_max > 1
  Maximale ponsweerstand overschreden! Grotere kolom of dikkere plaat nodig (UC = {{UC_max}}).
#end if

#if UC_pons < 1
  Geen ponswapening nodig (UC = {{UC_pons}}).
#else
  Ponswapening vereist (UC = {{UC_pons}}).
#end if
`;

// ---------------------------------------------------------------------------
// 6. Scheurwijdte -- EN 1992-1-1 art. 7.3.4
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 7.3.4 -- Scheurwijdte */
export const ec2Scheurwijdte = `# Scheurwijdteberekening -- EN 1992-1-1 art. 7.3.4

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
f_ctm = 0.30 * f_ck^(2/3) * 1 N/mm^2

Effectieve treksterkte op moment van scheuren:

f_cteff = f_ctm to N/mm^2

E_s = 200000 N/mm^2
E_cm = 22000 * (f_cm / (10 N/mm^2))^0.3 * 1 N/mm^2

Verhouding elasticiteitsmoduli:

alpha_e = E_s / E_cm

## Doorsnede

b = 300 mm
h = 500 mm
d = 450 mm

## Wapening

Staafdiameter langswapening:

phi = 16 mm

Betondekking op langswapening:

c = 35 mm

Aanwezige trekwapening:

A_s = 1257 mm^2

## Effectief trekspanningsgebied (figuur 7.1)

Hoogte effectief trekgebied h_c,ef (kleinste van):

h_cef_1 = 2.5 * (h - d) to mm
h_cef_2 = (h - d) / 3 to mm
h_cef_3 = h / 2 to mm

h_cef = h_cef_1 to mm

Effectief trekoppervlak:

A_ceff = b * h_cef to mm^2

Effectieve wapeningsverhouding (formule 7.10):

rho_peff = A_s / A_ceff

## Staalspanning onder BGT-belasting

M_Ed_bgt = 120 kN*m

Hefboomsarm (gescheurde doorsnede, aanname):

z = 0.9 * d to mm

Staalspanning:

sigma_s = M_Ed_bgt / (z * A_s) to N/mm^2

## Berekening scheurafstand (formule 7.11, NB)

Coefficienten (NB):

k_1 = 0.8
k_2 = 0.5
k_3 = 3.4
k_4 = 0.425

Maximale scheurafstand (formule 7.11):

s_rmax = k_3 * c + k_1 * k_2 * k_4 * phi / rho_peff to mm

## Rek-verschil (formule 7.9)

@select belastingduur "Type belasting"
Langdurend (k_t = 0.4) = 0.4
Kortdurend (k_t = 0.6) = 0.6
@end

k_t = belastingduur * 1

eps_verschil = (sigma_s - k_t * f_cteff / rho_peff * (1 + alpha_e * rho_peff)) / E_s

eps_minimum = 0.6 * sigma_s / E_s

#if eps_verschil < eps_minimum
  Rek-verschil verhoogd naar minimum 0.6 * sigma_s / E_s.
#end if

## Scheurwijdte (formule 7.8)

w_k = s_rmax * eps_verschil to mm

#if eps_verschil < eps_minimum
  w_k = s_rmax * eps_minimum to mm
#end if

## Grenswaarde (Tabel 7.1N)

@select milieuklasse "Milieuklasse"
X0 / XC1 (w_max = 0.4 mm) = 0.4
XC2 / XC3 / XC4 (w_max = 0.3 mm) = 0.3
XD1 / XD2 / XD3 / XS1 / XS2 / XS3 (w_max = 0.3 mm) = 0.3
@end

w_max = milieuklasse * 1 mm

UC_scheur = w_k / w_max

#if UC_scheur < 1
  Scheurwijdte voldoet (w_k = {{w_k}} mm <= {{w_max}} mm).
#else
  Scheurwijdte voldoet NIET (w_k = {{w_k}} mm > {{w_max}} mm)!
#end if
`;

// ---------------------------------------------------------------------------
// 7. Doorbuiging (slankheidscontrole) -- EN 1992-1-1 art. 7.4.2
// ---------------------------------------------------------------------------

/** EN 1992-1-1 art. 7.4.2 -- Doorbuiging (slankheidscontrole) */
export const ec2Doorbuiging = `# Doorbuigingscontrole -- EN 1992-1-1 art. 7.4.2

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

Overspanning:

L = 6000 mm

## Wapeningsverhouding

Benodigde trekwapening:

A_s_req = 1200 mm^2

Aanwezige trekwapening:

A_s_prov = 1257 mm^2

Drukwapening:

A_s2 = 0 mm^2

Trekwapeningsverhouding:

rho = A_s_req / (b * d)

Drukwapeningsverhouding:

rho_prime = A_s2 / (b * d)

Referentiewapeningsverhouding:

rho_0 = sqrt(f_ck / (1 N/mm^2)) / 1000

## Grenswaarde slankheid l/d (formule 7.16)

#if rho < rho_0
  Laag wapeningspercentage (rho <= rho_0), formule 7.16.a is maatgevend.
#else
  Hoog wapeningspercentage (rho > rho_0), formule 7.16.b is maatgevend.
#end if

Basiswaarde l/d (vereenvoudigd, Tabel 7.4N):

#if rho < rho_0
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho + 3.2 * sqrt(f_ck / (1 N/mm^2)) * (rho_0 / rho - 1)^(3/2))
#else
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / (rho - rho_prime) + 1/12 * sqrt(f_ck / (1 N/mm^2)) * sqrt(rho_prime / rho_0))
#end if

Correctie voor f_yk en A_s,prov / A_s,req (formule 7.17):

corr_staal = 500 / (f_yk / (1 N/mm^2)) * A_s_prov / A_s_req

ld_toel = ld_basis * corr_staal

## Werkelijke slankheid

ld_werk = L / d

## Toetsing

UC_doorbuiging = ld_werk / ld_toel

#if UC_doorbuiging < 1
  Doorbuiging voldoet via slankheidscriterium (l/d = {{ld_werk}} <= {{ld_toel}}).
#else
  Doorbuiging voldoet NIET via slankheidscriterium (l/d = {{ld_werk}} > {{ld_toel}})! Nadere berekening vereist.
#end if
`;

// ---------------------------------------------------------------------------
// 8. Volledige betonbalk toetsing -- Gecombineerde controle
// ---------------------------------------------------------------------------

/** EN 1992-1-1 Complete -- Volledige betonbalk toetsing */
export const ec2BetonBalk = `# Volledige Toetsing Betonbalk -- EN 1992-1-1

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
f_ctm = 0.30 * f_ck^(2/3) * 1 N/mm^2
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
f_ctd = 0.7 * f_ctm / gamma_C to N/mm^2

## Doorsnede

b = 300 mm
h = 600 mm
d_1 = 50 mm

Effectieve hoogte:

d = h - d_1 to mm

Weerstandsmoment (ongescheurd):

W = b * h^2 / 6 to mm^3

Traagheidsmoment (ongescheurd):

I = b * h^3 / 12 to mm^4

## Wapening

Staafdiameter:

phi = 20 mm

Aantal staven:

n_staven = 4

Trekwapening:

A_s = n_staven * pi / 4 * phi^2 to mm^2

## Systeem en belasting

Overspanning:

L = 7000 mm

Gelijkmatig verdeelde belasting (UGT):

q_d = 30 kN/m

Maatgevend moment:

M_Ed = q_d * L^2 / 8 to kN*m

Maatgevende dwarskracht:

V_Ed = q_d * L / 2 to kN

---

## 1. Buiging (art. 6.1)

lambda = 0.8
eta = 1.0

Relatief moment:

mu_Ed = M_Ed / (b * d^2 * eta * f_cd)

Relatieve drukhoogte:

zeta = 1 - sqrt(1 - 2 * mu_Ed)

Drukhoogte:

x_u = zeta * d to mm

Hefboomsarm:

z = d * (1 - lambda * zeta / 2) to mm

Momentweerstand:

M_Rd = z * A_s * f_yd to kN*m

UC_buiging = M_Ed / M_Rd

#if UC_buiging < 1
  [OK] Buiging voldoet (UC = {{UC_buiging}}).
#else
  [NIET OK] Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if

---

## 2. Dwarskracht zonder beugels (art. 6.2.2)

C_Rdc = 0.18 / gamma_C

k_shear = 1 + sqrt(200 mm / d)

#if k_shear > 2
  k_shear begrensd tot 2,0.
#end if

rho_l = A_s / (b * d)

V_Rdc = C_Rdc * k_shear * (100 * rho_l * f_ck / (1 N/mm^2))^(1/3) * 1 N/mm^2 * b * d to kN

v_min = 0.035 * k_shear^(3/2) * sqrt(f_ck / (1 N/mm^2)) * 1 N/mm^2

V_Rdc_min = v_min * b * d to kN

#if V_Ed < V_Rdc
  [OK] Geen beugels nodig (V_Ed = {{V_Ed}} kN < V_Rd,c = {{V_Rdc}} kN).
#else
  [ACTIE] Beugels vereist (V_Ed = {{V_Ed}} kN > V_Rd,c = {{V_Rdc}} kN).
#end if

---

## 3. Dwarskracht met beugels (art. 6.2.3)

Beugelwapening (tweesnedig):

phi_w = 8 mm

A_sw = 2 * pi / 4 * phi_w^2 to mm^2

Beugel h.o.h.:

s_w = 200 mm

f_ywd = f_yd to N/mm^2

Hoek drukdiagonaal (aanname cot theta = 2.5):

cot_theta = 2.5
tan_theta = 1 / cot_theta

V_Rds = A_sw / s_w * z * f_ywd * cot_theta to kN

nu_1 = 0.6 * (1 - f_ck / (250 N/mm^2))
alpha_cw = 1.0

V_Rdmax = alpha_cw * b * z * nu_1 * f_cd / (cot_theta + tan_theta) to kN

UC_Vrds = V_Ed / V_Rds
UC_Vrdmax = V_Ed / V_Rdmax

#if UC_Vrds < 1
  [OK] Beugels voldoen (UC = {{UC_Vrds}}).
#else
  [NIET OK] Meer beugels nodig (UC = {{UC_Vrds}})!
#end if

#if UC_Vrdmax < 1
  [OK] Drukdiagonaal voldoet (UC = {{UC_Vrdmax}}).
#else
  [NIET OK] Drukdiagonaal voldoet NIET (UC = {{UC_Vrdmax}})!
#end if

---

## 4. Scheurwijdte (art. 7.3.4, vereenvoudigd)

@select milieuklasse "Milieuklasse"
X0 / XC1 (w_max = 0.4 mm) = 0.4
XC2 / XC3 / XC4 (w_max = 0.3 mm) = 0.3
XD / XS (w_max = 0.3 mm) = 0.3
@end

w_max = milieuklasse * 1 mm

Betondekking:

c_nom = 35 mm

Effectief trekgebied (h_c,ef = 2.5*(h-d)):

h_cef = 2.5 * (h - d) to mm

A_ceff = b * h_cef to mm^2

rho_peff = A_s / A_ceff

BGT belasting (quasi-blijvend, aanname 50% van UGT):

M_bgt = 0.5 * M_Ed to kN*m

sigma_s = M_bgt / (z * A_s) to N/mm^2

k_t = 0.4

alpha_e = E_s / E_cm

eps_smcm = (sigma_s - k_t * f_ctm / rho_peff * (1 + alpha_e * rho_peff)) / E_s

eps_min = 0.6 * sigma_s / E_s

k_3 = 3.4
k_4 = 0.425
k_1 = 0.8
k_2 = 0.5

s_rmax = k_3 * c_nom + k_1 * k_2 * k_4 * phi / rho_peff to mm

#if eps_smcm > eps_min
  w_k = s_rmax * eps_smcm to mm
#else
  w_k = s_rmax * eps_min to mm
#end if

UC_scheur = w_k / w_max

#if UC_scheur < 1
  [OK] Scheurwijdte voldoet (w_k = {{w_k}} mm <= {{w_max}} mm).
#else
  [NIET OK] Scheurwijdte voldoet NIET (w_k = {{w_k}} mm > {{w_max}} mm)!
#end if

---

## 5. Doorbuiging (art. 7.4.2, slankheidscontrole)

@select systeem "Constructief systeem (Tabel 7.4N)"
Vrij opgelegd (K=1.0) = 1.0
Eindoverspanning doorgaand (K=1.3) = 1.3
Tussenoverspanning doorgaand (K=1.5) = 1.5
@end

K_sys = systeem * 1

rho_doorb = A_s / (b * d)

rho_0 = sqrt(f_ck / (1 N/mm^2)) / 1000

#if rho_doorb < rho_0
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho_doorb + 3.2 * sqrt(f_ck / (1 N/mm^2)) * (rho_0 / rho_doorb - 1)^(3/2))
#else
  ld_basis = K_sys * (11 + 1.5 * sqrt(f_ck / (1 N/mm^2)) * rho_0 / rho_doorb)
#end if

ld_toel = ld_basis * 500 / (f_yk / (1 N/mm^2))

ld_werk = L / d

UC_doorbuiging = ld_werk / ld_toel

#if UC_doorbuiging < 1
  [OK] Doorbuiging voldoet (l/d = {{ld_werk}} <= {{ld_toel}}).
#else
  [NIET OK] Doorbuiging voldoet NIET (l/d = {{ld_werk}} > {{ld_toel}})!
#end if

---

## Samenvatting

| Toetsing | UC | Resultaat |
|---|---|---|
| Buiging (6.1) | {{UC_buiging}} | |
| Dwarskracht beugels (6.2.3) | {{UC_Vrds}} | |
| Drukdiagonaal (6.2.3) | {{UC_Vrdmax}} | |
| Scheurwijdte (7.3.4) | {{UC_scheur}} | |
| Doorbuiging (7.4.2) | {{UC_doorbuiging}} | |

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
