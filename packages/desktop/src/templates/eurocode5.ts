/**
 * EN 1995-1-1 (Eurocode 5) — Houtconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1995-1-1:2005+A2:2014+NB:2013
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Buiging (Bending) — EN 1995-1-1 §6.1.6
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.6 — Buiging */
export const ec5Buiging = `# Toetsing Buiging — EN 1995-1-1 §6.1.6

## Materiaal

@select houttype "Type hout"
Gezaagd hout = 1
Gelijmd gelamineerd hout = 2
@end

@select houtsoort "Houtsoort / sterkteklasse"
C14 = 14
C16 = 16
C18 = 18
C20 = 20
C22 = 22
C24 = 24
C27 = 27
C30 = 30
C35 = 35
C40 = 40
D30 = 30
D35 = 35
D40 = 40
D50 = 50
GL20h = 20
GL24h = 24
GL28h = 28
GL32h = 32
GL36h = 36
@end

Karakteristieke buigsterkte (EN 338 / EN 14080):

f_mk = houtsoort * 1 N/mm^2

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

Partiele factor (tabel 2.3 NB):

gamma_M = 1.3

Modificatiefactor k_mod (tabel 3.1):

k_mod = 0.8

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

#if UC_buiging < 1
  Buiging voldoet (UC = {{UC_buiging}}).
#else
  Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Afschuiving (Shear) — EN 1995-1-1 §6.1.7
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.7 — Afschuiving */
export const ec5Afschuiving = `# Toetsing Afschuiving — EN 1995-1-1 §6.1.7

## Materiaal

@select houttype "Type hout"
Gezaagd hout = 1
Gelijmd gelamineerd hout = 2
@end

@select houtsoort "Houtsoort / sterkteklasse"
C18 = 18
C24 = 24
C30 = 30
GL24h = 24
GL28h = 28
GL32h = 32
@end

Karakteristieke afschuifsterkte f_v,k (EN 338):

f_vk = 3.5 N/mm^2

gamma_M = 1.3
k_mod = 0.8

Rekenwaarde afschuifsterkte (formule 2.14):

f_vd = k_mod * f_vk / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

Scheurfactor k_cr (NB art. 6.1.7):

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

#if UC_afschuiving < 1
  Afschuiving voldoet (UC = {{UC_afschuiving}}).
#else
  Afschuiving voldoet NIET (UC = {{UC_afschuiving}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Druk evenwijdig aan de vezel — EN 1995-1-1 §6.1.4
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.4 — Druk evenwijdig aan de vezel */
export const ec5Druk = `# Toetsing Druk Evenwijdig — EN 1995-1-1 §6.1.4

## Materiaal

@select houtsoort "Houtsoort / sterkteklasse"
C18 = 18
C24 = 21
C30 = 23
GL24h = 24
GL28h = 26.5
GL32h = 29
@end

Karakteristieke druksterkte evenwijdig f_c,0,k (EN 338):

f_c0k = houtsoort * 1 N/mm^2

gamma_M = 1.3
k_mod = 0.8

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

#if UC_druk < 1
  Druk evenwijdig voldoet (UC = {{UC_druk}}).
#else
  Druk evenwijdig voldoet NIET (UC = {{UC_druk}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Druk loodrecht op de vezel — EN 1995-1-1 §6.1.5
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.1.5 — Druk loodrecht op de vezel */
export const ec5DrukLoodrecht = `# Toetsing Druk Loodrecht — EN 1995-1-1 §6.1.5

## Materiaal

@select houtsoort "Houtsoort / sterkteklasse"
C18 = 2.2
C24 = 2.5
C30 = 2.7
GL24h = 2.5
GL28h = 2.5
GL32h = 3.3
@end

Karakteristieke druksterkte loodrecht f_c,90,k (EN 338):

f_c90k = houtsoort * 1 N/mm^2

gamma_M = 1.3
k_mod = 0.8

Rekenwaarde druksterkte loodrecht (formule 2.14):

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

## Geometrie oplegging

Breedte ligger:

b = 70 mm

Opleggingslengte (werkelijke contactlengte):

L_opl = 100 mm

@select steunpunttype "Type steunpunt (art. 6.1.5)"
Discreet steunpunt (k_c90 = 1.5) = 1.5
Continu steunpunt (k_c90 = 1.25) = 1.25
Standaard (k_c90 = 1.0) = 1.0
@end

Factor k_c,90:

k_c90 = steunpunttype * 1

Effectieve contactlengte (vergroot met max 30 mm per zijde):

L_ef = L_opl + 2 * 30 mm

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

#if UC_c90 < 1
  Druk loodrecht voldoet (UC = {{UC_c90}}).
#else
  Druk loodrecht voldoet NIET (UC = {{UC_c90}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Knik (Buckling) — EN 1995-1-1 §6.3.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §6.3.2 — Knik (kolommen aan druk) */
export const ec5Knik = `# Toetsing Knik — EN 1995-1-1 §6.3.2

## Materiaal

@select houtsoort "Houtsoort / sterkteklasse"
C18 = 18
C24 = 24
C30 = 30
GL24h = 24
GL28h = 28
GL32h = 32
@end

Karakteristieke druksterkte evenwijdig f_c,0,k:

f_c0k = houtsoort * 1 N/mm^2

Elasticiteitsmodulus 5-percentielwaarde E_0,05 (EN 338):

E_005 = 7400 N/mm^2

gamma_M = 1.3
k_mod = 0.8

Rekenwaarde druksterkte:

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

@select houttype "Type hout (voor beta_c)"
Gezaagd hout (beta_c = 0.2) = 0.2
Gelijmd gelamineerd hout (beta_c = 0.1) = 0.1
@end

Factor beta_c (art. 6.3.2, formule 6.29):

beta_c = houttype * 1

## Doorsnede

b = 100 mm
h = 100 mm

A = b * h to mm^2

Traagheidsmoment om zwakke as:

I_z = h * b^3 / 12 to mm^4

## Systeem

Kniklengte:

L_k = 3000 mm

## Knikberekening (art. 6.3.2)

Slankheid (zwakke as):

lambda_z = L_k / (b / sqrt(12))

Relatieve slankheid (formule 6.22):

lambda_relz = lambda_z / pi * sqrt(f_c0k / E_005)

Factor k_z (formule 6.28):

k_z = 0.5 * (1 + beta_c * (lambda_relz - 0.3) + lambda_relz^2)

Knikfactor k_c,z (formule 6.26):

k_cz = 1 / (k_z + sqrt(k_z^2 - lambda_relz^2))

## Belasting

N_Ed = 80 kN

## Toetsing knik (art. 6.3.2, formule 6.23 vereenvoudigd)

Drukspanning:

sigma_c0d = N_Ed / A to N/mm^2

Unity check knik:

UC_knik = sigma_c0d / (k_cz * f_c0d)

#if UC_knik < 1
  Knik voldoet (UC = {{UC_knik}}).
#else
  Knik voldoet NIET (UC = {{UC_knik}})!
#end if

#if lambda_relz < 0.3
  Opmerking: relatieve slankheid < 0,3; knik niet maatgevend (art. 6.3.2(2)).
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Doorbuiging (Deflection) — EN 1995-1-1 §7.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 §7.2 — Doorbuiging */
export const ec5Doorbuiging = `# Toetsing Doorbuiging — EN 1995-1-1 §7.2 / §2.2.3

## Materiaal

@select houtsoort "Houtsoort / sterkteklasse"
C18 = 9000
C24 = 11000
C30 = 12000
GL24h = 11500
GL28h = 12600
GL32h = 13700
@end

Gemiddelde elasticiteitsmodulus E_mean (EN 338):

E_mean = houtsoort * 1 N/mm^2

@select klimaatklasse "Klimaatklasse"
Klasse 1 (k_def = 0.60) = 0.60
Klasse 2 (k_def = 0.80) = 0.80
Klasse 3 (k_def = 2.00) = 2.00
@end

Vervormingsfactor k_def (tabel 3.2):

k_def = klimaatklasse * 1

Quasi-blijvende factor psi_2 (NEN-EN 1990, cat. A woning):

psi_2 = 0.3

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

Totale ogenblikkelijke doorbuiging:

w_inst = w_inst_G + w_inst_Q to mm

## Uiteindelijke doorbuiging met kruip (formule 2.3-2.4)

Uiteindelijke doorbuiging onder G (formule 2.3):

w_fin_G = w_inst_G * (1 + k_def) to mm

Uiteindelijke doorbuiging onder Q (formule 2.4):

w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm

Totale uiteindelijke doorbuiging:

w_fin = w_fin_G + w_fin_Q to mm

Netto doorbuiging (formule 7.2, zonder zeeg):

w_netfin = w_fin to mm

## Grenswaarden (tabel 7.2 / NEN-EN 1990 NB)

Grenswaarde w_inst (L/300):

w_inst_lim = L / 300 to mm

Grenswaarde w_net,fin (L/250):

w_netfin_lim = L / 250 to mm

Grenswaarde w_fin (L/150):

w_fin_lim = L / 150 to mm

## Unity checks

UC_inst = w_inst / w_inst_lim

UC_netfin = w_netfin / w_netfin_lim

UC_fin = w_fin / w_fin_lim

#if UC_inst < 1
  w_inst voldoet ({{w_inst}} mm < {{w_inst_lim}} mm).
#else
  w_inst voldoet NIET!
#end if

#if UC_netfin < 1
  w_net,fin voldoet ({{w_netfin}} mm < {{w_netfin_lim}} mm).
#else
  w_net,fin voldoet NIET!
#end if

#if UC_fin < 1
  w_fin voldoet ({{w_fin}} mm < {{w_fin_lim}} mm).
#else
  w_fin voldoet NIET!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Volledige houten balk toetsing — Gecombineerde controle
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1995-1-1 Complete — Volledige houten balk toetsing */
export const ec5HoutenBalk = `# Volledige Toetsing Houten Balk — EN 1995-1-1

## Projectgegevens

@select gevolgklasse "Constructiegevolgklasse (CC)"
CC1 — Lage gevolgen = 1
CC2 — Middelmatige gevolgen = 2
CC3 — Grote gevolgen = 3
@end

## Materiaal

@select houttype "Type hout"
Gezaagd hout (gamma_M = 1.3) = 1.3
Gelijmd gelamineerd hout (gamma_M = 1.25) = 1.25
@end

@select sterkteklasse "Sterkteklasse"
C18 — f_mk=18 f_vk=3.4 f_c0k=18 f_c90k=2.2 E=9000 E005=6000 = 18
C24 — f_mk=24 f_vk=4.0 f_c0k=21 f_c90k=2.5 E=11000 E005=7400 = 24
C30 — f_mk=30 f_vk=4.0 f_c0k=23 f_c90k=2.7 E=12000 E005=8000 = 30
GL24h — f_mk=24 f_vk=3.5 f_c0k=24 f_c90k=2.5 E=11500 E005=9600 = 124
GL28h — f_mk=28 f_vk=3.5 f_c0k=26.5 f_c90k=2.5 E=12600 E005=10500 = 128
GL32h — f_mk=32 f_vk=3.5 f_c0k=29 f_c90k=3.3 E=13700 E005=11100 = 132
@end

Karakteristieke waarden (EN 338 / EN 14080):

f_mk = 24 N/mm^2
f_vk = 4.0 N/mm^2
f_c0k = 21 N/mm^2
f_c90k = 2.5 N/mm^2
E_mean = 11000 N/mm^2
E_005 = 7400 N/mm^2

@select klimaatklasse "Klimaatklasse (art. 2.3.1.3)"
Klasse 1 — droog binnenklimaat = 1
Klasse 2 — beschut buitenklimaat = 2
Klasse 3 — buiten onbeschermd = 3
@end

@select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
Blijvend (> 10 jaar, k_mod=0.60) = 0.60
Lang (6 mnd-10 jaar, k_mod=0.70) = 0.70
Middellang (1 wk-6 mnd, k_mod=0.80) = 0.80
Kort (< 1 week, k_mod=0.90) = 0.90
Zeer kort (k_mod=1.10) = 1.10
@end

Partiele factor (tabel 2.3):

gamma_M = houttype * 1

Modificatiefactor (tabel 3.1):

k_mod = belastingduurklasse * 1

## Rekenwaarden materiaal (art. 2.4.1, formule 2.14)

f_md = k_mod * f_mk / gamma_M to N/mm^2

f_vd = k_mod * f_vk / gamma_M to N/mm^2

f_c0d = k_mod * f_c0k / gamma_M to N/mm^2

f_c90d = k_mod * f_c90k / gamma_M to N/mm^2

## Doorsnede

b = 70 mm
h = 200 mm

Oppervlakte:

A = b * h to mm^2

Weerstandsmoment:

W_y = b * h^2 / 6 to mm^3

Traagheidsmoment:

I_y = b * h^3 / 12 to mm^4

I_z = h * b^3 / 12 to mm^4

## Systeem

Overspanning:

L = 4000 mm

Opleggingslengte:

L_opl = 100 mm

## Belasting (rekenwaarden)

Gelijkmatig verdeelde belasting:

q_d = 5.0 kN/m

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

#if UC_buiging < 1
  [OK] Buiging voldoet (UC = {{UC_buiging}}).
#else
  [NIET OK] Buiging voldoet NIET (UC = {{UC_buiging}})!
#end if

---

## 2. Afschuiving (art. 6.1.7, formule 6.13)

Scheurfactor (NB):

k_cr = 1.0

b_ef = k_cr * b to mm

tau_d = 3/2 * V_Ed / (b_ef * h) to N/mm^2

UC_afschuiving = tau_d / f_vd

#if UC_afschuiving < 1
  [OK] Afschuiving voldoet (UC = {{UC_afschuiving}}).
#else
  [NIET OK] Afschuiving voldoet NIET (UC = {{UC_afschuiving}})!
#end if

---

## 3. Druk loodrecht op oplegging (art. 6.1.5, formule 6.3)

k_c90 = 1.5

L_ef = L_opl + 2 * 30 mm

A_ef = b * L_ef to mm^2

sigma_c90d = F_opl / A_ef to N/mm^2

UC_c90 = sigma_c90d / (k_c90 * f_c90d)

#if UC_c90 < 1
  [OK] Druk loodrecht voldoet (UC = {{UC_c90}}).
#else
  [NIET OK] Druk loodrecht voldoet NIET (UC = {{UC_c90}})!
#end if

---

## 4. Kipstabiliteit (art. 6.3.3, formule 6.33)

Meewerkende lengte (tabel 6.1, q-belasting):

l_ef = 0.9 * L to mm

Kritische buigspanning voor gezaagd hout (formule 6.32):

sigma_mcrit = 0.78 * b^2 / (h * l_ef) * E_005 to N/mm^2

Relatieve slankheid bij buiging (formule 6.30):

lambda_relm = sqrt(f_mk / sigma_mcrit)

Kipfactor k_crit (formule 6.34):

#if lambda_relm < 0.75
  k_crit = 1.0 (elastisch bereik, geen kip).
#else
  #if lambda_relm < 1.4
    Inelastisch kipbereik.
  #else
    Elastisch kipbereik.
  #end if
#end if

k_crit = 1.0

UC_kip = sigma_md / (k_crit * f_md)

#if UC_kip < 1
  [OK] Kipstabiliteit voldoet (UC = {{UC_kip}}).
#else
  [NIET OK] Kipstabiliteit voldoet NIET (UC = {{UC_kip}})!
#end if

---

## 5. Doorbuiging (art. 7.2 / art. 2.2.3)

Vervormingsfactor k_def (tabel 3.2, klasse 1):

k_def = 0.60

psi_2 = 0.3

Verdeling belasting (aanname 60% blijvend, 40% veranderlijk):

g_k = 0.6 * q_d / 1.35 to kN/m
q_k = 0.4 * q_d / 1.5 to kN/m

Ogenblikkelijke doorbuiging:

w_inst_G = 5 * g_k * L^4 / (384 * E_mean * I_y) to mm
w_inst_Q = 5 * q_k * L^4 / (384 * E_mean * I_y) to mm
w_inst = w_inst_G + w_inst_Q to mm

Uiteindelijke doorbuiging met kruip (formule 2.3, 2.4):

w_fin_G = w_inst_G * (1 + k_def) to mm
w_fin_Q = w_inst_Q * (1 + psi_2 * k_def) to mm
w_fin = w_fin_G + w_fin_Q to mm
w_netfin = w_fin to mm

Grenswaarden (tabel 7.2):

w_inst_lim = L / 300 to mm
w_netfin_lim = L / 250 to mm

UC_doorbuiging = w_netfin / w_netfin_lim

#if UC_doorbuiging < 1
  [OK] Doorbuiging voldoet ({{w_netfin}} mm < {{w_netfin_lim}} mm).
#else
  [NIET OK] Doorbuiging voldoet NIET!
#end if

---

## Samenvatting

| Toetsing | UC | Resultaat |
|---|---|---|
| Buiging (6.1.6) | {{UC_buiging}} | |
| Afschuiving (6.1.7) | {{UC_afschuiving}} | |
| Druk loodrecht (6.1.5) | {{UC_c90}} | |
| Kip (6.3.3) | {{UC_kip}} | |
| Doorbuiging (7.2) | {{UC_doorbuiging}} | |

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
