/**
 * NEN 9997-1 (Eurocode 7) — Geotechnisch ontwerp
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN 9997-1:2016+C2:2017 (NEN-EN 1997-1 met Nationale Bijlage)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Funderingsstrook — NEN 9997-1 §6 / Bijlage D
// ─────────────────────────────────────────────────────────────────────────────

/** NEN 9997-1 §6 — Draagvermogen funderingsstrook */
export const en1997Funderingsstrook = `# Draagvermogen Funderingsstrook — NEN 9997-1 §6 / Bijlage D

## Gevolgklasse en partiele factoren

@select gevolgklasse "Gevolgklasse (Bijlage A, tabel A.1)"
CC1 — Lage gevolgen = 1
CC2 — Middelmatige gevolgen = 2
CC3 — Grote gevolgen = 3
@end

Partiele factoren grondweerstanden (Bijlage A, tabel A.3b):

#if gevolgklasse == 1
gamma_Rv = 1.0
gamma_phi = 1.15
gamma_c = 1.5
#end if

#if gevolgklasse == 2
gamma_Rv = 1.0
gamma_phi = 1.20
gamma_c = 1.65
#end if

#if gevolgklasse == 3
gamma_Rv = 1.0
gamma_phi = 1.25
gamma_c = 1.8
#end if

## Grondparameters

Effectieve wrijvingshoek (karakteristiek):

phi_k = 25 deg

Effectieve cohesie (karakteristiek):

c_k = 0 kPa

Volumegewicht grond:

gamma_grond = 18 kN/m^3

Volumegewicht grond onder grondwaterniveau:

gamma_grond_eff = 10 kN/m^3

@select grondwater "Grondwaterniveau t.o.v. funderingszool"
Boven funderingszool (droog) = 1
Op funderingszool = 2
Ter hoogte bovenkant fundering = 3
@end

## Funderingsgeometrie

Breedte funderingsstrook:

B = 600 mm

Funderingsdiepte onder maaiveld:

D = 800 mm

Lengte funderingsstrook (per strekkende meter):

L_f = 1000 mm

## Effectieve afmetingen (art. 6.5.4)

Excentriciteit belasting in breedte-richting:

e_B = 0 mm

Effectieve breedte:

B_eff = B - 2 * e_B to mm

Effectieve oppervlak per m':

A_eff = B_eff * L_f to mm^2

## Rekenwaarde grondparameters (DA3)

Rekenwaarde wrijvingshoek:

phi_d_deg = atan(tan(phi_k * pi / 180) / gamma_phi) * 180 / pi

Rekenwaarde cohesie:

c_d = c_k / gamma_c to kPa

## Draagkrachtfactoren (Bijlage D, formules D.1-D.3)

N_q = exp(pi * tan(phi_d_deg * pi / 180)) * (tan(45 * pi / 180 + phi_d_deg * pi / 360))^2

N_c = (N_q - 1) / tan(phi_d_deg * pi / 180)

N_gamma = 2 * (N_q - 1) * tan(phi_d_deg * pi / 180)

## Vormfactoren (Bijlage D, strook: s = 1.0)

Strookfundering: alle vormfactoren = 1.0:

s_c = 1.0
s_q = 1.0
s_gamma = 1.0

## Inclinatiefactoren

@select inclinatie "Horizontale belasting"
Geen (i = 1.0) = 1
Aanwezig = 2
@end

#if inclinatie == 1
i_c = 1.0
i_q = 1.0
i_gamma = 1.0
#else
Horizontale kracht H_d:

H_d = 5 kN/m

Verticale kracht V_d voor inclinatie:

V_d_incl = 80 kN/m

Inclinatiefactor (Bijlage D, formule D.10):

m_exp = 2.0
i_q = (1 - H_d / V_d_incl)^m_exp
i_gamma = (1 - H_d / V_d_incl)^(m_exp + 1)

#if c_d > 0
i_c = i_q - (1 - i_q) / (N_c * tan(phi_d_deg * pi / 180))
#else
i_c = 1.0
#end if
#end if

## Grondspanning naast fundering

Effectieve grondspanning op funderingsniveau:

#if grondwater == 1
q_eff = gamma_grond * D / 1000 to kPa
gamma_eff = gamma_grond to kN/m^3
#end if

#if grondwater == 2
q_eff = gamma_grond * D / 1000 to kPa
gamma_eff = gamma_grond_eff to kN/m^3
#end if

#if grondwater == 3
q_eff = gamma_grond_eff * D / 1000 to kPa
gamma_eff = gamma_grond_eff to kN/m^3
#end if

## Draagvermogen (Bijlage D, formule D.1)

R_over_A = c_d * N_c * s_c * i_c + q_eff * N_q * s_q * i_q + 0.5 * gamma_eff * B_eff / 1000 * N_gamma * s_gamma * i_gamma to kPa

Draagvermogen per m' strook:

R_d = R_over_A * B_eff / 1000 to kN/m

## Belasting

Verticale belasting per m' strook (rekenwaarde):

V_Ed = 80 kN/m

## Toetsing (art. 6.5.2, formule 6.1)

Unity check:

UC = V_Ed / R_d

#if UC < 1
  Draagvermogen funderingsstrook voldoet (UC = {{UC}}).
#else
  Draagvermogen funderingsstrook voldoet NIET (UC = {{UC}})!
#end if

## Overzicht

@svg
<svg width="500" height="300" viewBox="0 0 500 300">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="soil" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="2" cy="2" r="1" fill="#a3a3a3"/>
      <circle cx="7" cy="7" r="0.8" fill="#b3b3b3"/>
    </pattern>
    <pattern id="concrete" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#9ca3af" stroke-width="0.5"/>
    </pattern>
  </defs>
  <!-- Grond -->
  <rect x="20" y="80" width="460" height="200" fill="url(#soil)" stroke="none"/>
  <rect x="20" y="80" width="460" height="200" fill="#d4b896" fill-opacity="0.5" stroke="none"/>
  <!-- Maaiveld lijn -->
  <line x1="20" y1="80" x2="480" y2="80" stroke="#6b7280" stroke-width="2"/>
  <text x="485" y="84" font-size="10" fill="#6b7280">MV</text>
  <!-- Grondwater -->
  <line x1="20" y1="180" x2="480" y2="180" stroke="#3b82f6" stroke-width="1" stroke-dasharray="6"/>
  <text x="485" y="184" font-size="10" fill="#3b82f6">GW</text>
  <!-- Funderingsstrook -->
  <rect x="170" y="140" width="160" height="40" fill="url(#concrete)" stroke="#374151" stroke-width="2"/>
  <rect x="170" y="140" width="160" height="40" fill="#b0b0b0" fill-opacity="0.5" stroke="none"/>
  <!-- Wand erboven -->
  <rect x="220" y="30" width="60" height="110" fill="#d4a574" stroke="#8b6914" stroke-width="1.5"/>
  <!-- Belasting -->
  <line x1="250" y1="5" x2="250" y2="25" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)"/>
  <text x="250" y="4" text-anchor="middle" font-size="10" fill="#dc2626">V_Ed = {{V_Ed}} kN/m</text>
  <!-- Maat B -->
  <line x1="170" y1="195" x2="330" y2="195" stroke="#6b7280" stroke-width="1"/>
  <line x1="170" y1="190" x2="170" y2="200" stroke="#6b7280" stroke-width="1"/>
  <line x1="330" y1="190" x2="330" y2="200" stroke="#6b7280" stroke-width="1"/>
  <text x="250" y="210" text-anchor="middle" font-size="10" fill="#6b7280">B = {{B}} mm</text>
  <!-- Maat D -->
  <line x1="145" y1="80" x2="145" y2="160" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="140" y1="80" x2="150" y2="80" stroke="#6b7280" stroke-width="1"/>
  <line x1="140" y1="160" x2="150" y2="160" stroke="#6b7280" stroke-width="1"/>
  <text x="135" y="125" text-anchor="middle" font-size="10" fill="#6b7280" transform="rotate(-90,135,125)">D = {{D}} mm</text>
  <!-- Resultaten -->
  <text x="420" y="240" text-anchor="middle" font-size="11" fill="#374151">R_d = {{R_d}} kN/m</text>
  <text x="420" y="260" text-anchor="middle" font-size="13" fill="#059669" font-weight="bold">UC = {{UC}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Paaldraagvermogen — NEN 9997-1 §7
// ─────────────────────────────────────────────────────────────────────────────

/** NEN 9997-1 §7 — Axiaal draagvermogen paalfundering */
export const en1997Paaldraagvermogen = `# Axiaal Draagvermogen Paalfundering — NEN 9997-1 §7

## Gevolgklasse en partiele factoren

@select gevolgklasse "Gevolgklasse (Bijlage A)"
CC1 — Lage gevolgen = 1
CC2 — Middelmatige gevolgen = 2
CC3 — Grote gevolgen = 3
@end

@select paaltype "Type paal (tabel 7.b NB)"
Grondverdringende paal (gedrukt) = 1
Grondverdringende paal (geboord) = 2
Schroefpaal = 3
Boorpaal = 4
@end

Partiele factoren paaldraagvermogen (tabel 7.b NB):

#if gevolgklasse == 1
gamma_b = 1.2
gamma_s = 1.2
#end if

#if gevolgklasse == 2
gamma_b = 1.25
gamma_s = 1.25
#end if

#if gevolgklasse == 3
gamma_b = 1.3
gamma_s = 1.3
#end if

## Correlatiefactoren (tabel A.10 NB)

Aantal sonderingen:

n_sond = 3

@select xi_keuze "Correlatiefactoren xi (tabel A.10)"
1 sondering (xi_3=1.39, xi_4=1.39) = 1
2 sonderingen (xi_3=1.27, xi_4=1.23) = 2
3 sonderingen (xi_3=1.20, xi_4=1.15) = 3
5 sonderingen (xi_3=1.12, xi_4=1.06) = 5
7 sonderingen (xi_3=1.08, xi_4=1.02) = 7
10 sonderingen (xi_3=1.05, xi_4=1.00) = 10
@end

#if xi_keuze == 1
xi_3 = 1.39
xi_4 = 1.39
#end if

#if xi_keuze == 2
xi_3 = 1.27
xi_4 = 1.23
#end if

#if xi_keuze == 3
xi_3 = 1.20
xi_4 = 1.15
#end if

#if xi_keuze == 5
xi_3 = 1.12
xi_4 = 1.06
#end if

#if xi_keuze == 7
xi_3 = 1.08
xi_4 = 1.02
#end if

#if xi_keuze == 10
xi_3 = 1.05
xi_4 = 1.00
#end if

## Paalgeometrie

Paaldiameter (equivalente diameter):

D_paal = 250 mm

Paallengte (vanaf maaiveld):

L_paal = 12000 mm

Paalvoetoppervlak:

A_b = pi / 4 * D_paal^2 to mm^2

Omtrek paal:

O_paal = pi * D_paal to mm

## Puntdraagvermogen (art. 7.6.2.3)

Rekenwaarde conusweerstand gemiddeld aan paalpunt q_c;I;gem:

q_c_punt = 15 MPa

@select alpha_p "Puntdraagvermogenfactor alpha_p (tabel 7.d NB)"
Grondverdringend, zand/grind (alpha_p = 1.0) = 1.0
Grondverdringend, klei (alpha_p = 0.7) = 0.7
Schroefpaal, zand/grind (alpha_p = 0.8) = 0.8
Boorpaal, zand/grind (alpha_p = 0.5) = 0.5
Boorpaal, klei (alpha_p = 0.5) = 0.5
@end

alpha_p = alpha_p_keuze * 1

Puntdraagvermogen (karakteristiek per sondering):

q_b_max = alpha_p * q_c_punt to MPa

R_b_cal = q_b_max * A_b / 1000 to kN

## Schachtdraagvermogen (art. 7.6.2.3)

@select alpha_s "Schachtwrijvingsfactor alpha_s (tabel 7.e NB)"
Zand, grondverdringend (alpha_s = 0.010) = 0.010
Zand, boorpaal (alpha_s = 0.006) = 0.006
Klei, grondverdringend (alpha_s = 0.025) = 0.025
Klei, boorpaal (alpha_s = 0.020) = 0.020
@end

Gemiddelde conusweerstand langs schacht q_c;z;gem:

q_c_schacht = 5 MPa

Schachtlengte in dragende laag:

L_schacht = 10000 mm

Schachtdraagvermogen (karakteristiek per sondering):

R_s_cal = alpha_s * q_c_schacht * O_paal * L_schacht / 1000 to kN

## Totaal draagvermogen (art. 7.6.2.1)

Karakteristiek draagvermogen per sondering:

R_c_cal = R_b_cal + R_s_cal to kN

Karakteristiek draagvermogen (met correlatiefactoren, formule 7.2/7.3):

R_c_k_gem = R_c_cal / xi_3 to kN

R_c_k_min = R_c_cal / xi_4 to kN

Maatgevend karakteristiek draagvermogen (kleinste waarde):

#if R_c_k_gem < R_c_k_min
R_c_k = R_c_k_gem to kN
#else
R_c_k = R_c_k_min to kN
#end if

## Rekenwaarde draagvermogen (formule 7.1)

R_b_d = R_b_cal / (xi_3 * gamma_b) to kN

R_s_d = R_s_cal / (xi_3 * gamma_s) to kN

Totaal rekenwaarde draagvermogen:

R_c_d = R_b_d + R_s_d to kN

## Belasting

Rekenwaarde drukbelasting op paal:

F_c_d = 300 kN

## Toetsing (formule 7.1)

Unity check:

UC = F_c_d / R_c_d

#if UC < 1
  Paaldraagvermogen voldoet (UC = {{UC}}).
#else
  Paaldraagvermogen voldoet NIET (UC = {{UC}})!
#end if

## Verdeling punt / schacht

Aandeel punt:

aandeel_punt = R_b_d / R_c_d * 100

Aandeel schacht:

aandeel_schacht = R_s_d / R_c_d * 100

## Overzicht

@svg
<svg width="400" height="380" viewBox="0 0 400 380">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="soil2" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="3" cy="3" r="1" fill="#a3a3a3"/>
      <circle cx="8" cy="8" r="0.8" fill="#b3b3b3"/>
    </pattern>
  </defs>
  <!-- Grond -->
  <rect x="20" y="50" width="360" height="300" fill="url(#soil2)"/>
  <rect x="20" y="50" width="360" height="300" fill="#d4b896" fill-opacity="0.5"/>
  <!-- Maaiveld -->
  <line x1="20" y1="50" x2="380" y2="50" stroke="#6b7280" stroke-width="2"/>
  <text x="385" y="54" font-size="10" fill="#6b7280">MV</text>
  <!-- Dragende laag -->
  <rect x="20" y="260" width="360" height="90" fill="#8B7355" fill-opacity="0.4"/>
  <text x="385" y="300" font-size="9" fill="#8B7355">Zand</text>
  <!-- Paal -->
  <rect x="175" y="50" width="30" height="280" fill="#b0b0b0" stroke="#374151" stroke-width="1.5"/>
  <!-- Belasting -->
  <line x1="190" y1="10" x2="190" y2="45" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)"/>
  <text x="190" y="8" text-anchor="middle" font-size="10" fill="#dc2626">F_c,d = {{F_c_d}} kN</text>
  <!-- Schachtwrijving pijlen -->
  <line x1="160" y1="100" x2="170" y2="90" stroke="#059669" stroke-width="1.5"/>
  <line x1="160" y1="150" x2="170" y2="140" stroke="#059669" stroke-width="1.5"/>
  <line x1="160" y1="200" x2="170" y2="190" stroke="#059669" stroke-width="1.5"/>
  <line x1="160" y1="250" x2="170" y2="240" stroke="#059669" stroke-width="1.5"/>
  <line x1="160" y1="300" x2="170" y2="290" stroke="#059669" stroke-width="1.5"/>
  <line x1="220" y1="100" x2="210" y2="90" stroke="#059669" stroke-width="1.5"/>
  <line x1="220" y1="150" x2="210" y2="140" stroke="#059669" stroke-width="1.5"/>
  <line x1="220" y1="200" x2="210" y2="190" stroke="#059669" stroke-width="1.5"/>
  <line x1="220" y1="250" x2="210" y2="240" stroke="#059669" stroke-width="1.5"/>
  <line x1="220" y1="300" x2="210" y2="290" stroke="#059669" stroke-width="1.5"/>
  <text x="140" y="200" text-anchor="end" font-size="9" fill="#059669">R_s</text>
  <!-- Puntdruk -->
  <line x1="175" y1="340" x2="190" y2="350" stroke="#1e40af" stroke-width="2"/>
  <line x1="205" y1="340" x2="190" y2="350" stroke="#1e40af" stroke-width="2"/>
  <text x="190" y="365" text-anchor="middle" font-size="9" fill="#1e40af">R_b</text>
  <!-- Maat L -->
  <line x1="145" y1="50" x2="145" y2="330" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="140" y1="50" x2="150" y2="50" stroke="#6b7280" stroke-width="1"/>
  <line x1="140" y1="330" x2="150" y2="330" stroke="#6b7280" stroke-width="1"/>
  <text x="135" y="190" text-anchor="middle" font-size="9" fill="#6b7280" transform="rotate(-90,135,190)">L = {{L_paal}} mm</text>
  <!-- Resultaten -->
  <text x="310" y="100" text-anchor="middle" font-size="11" fill="#374151">R_b,d = {{R_b_d}} kN</text>
  <text x="310" y="120" text-anchor="middle" font-size="11" fill="#374151">R_s,d = {{R_s_d}} kN</text>
  <text x="310" y="145" text-anchor="middle" font-size="11" fill="#1e40af" font-weight="bold">R_c,d = {{R_c_d}} kN</text>
  <text x="310" y="175" text-anchor="middle" font-size="13" fill="#059669" font-weight="bold">UC = {{UC}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Zetting — NEN 9997-1 §6.6 / Bijlage F
// ─────────────────────────────────────────────────────────────────────────────

/** NEN 9997-1 §6.6 / Bijlage F — Zettingsberekening */
export const en1997Zetting = `# Zettingsberekening — NEN 9997-1 §6.6 / Bijlage F

## Funderingsgeometrie

Breedte fundering:

B = 1000 mm

Lengte fundering:

L_f = 1000 mm

Funderingsdiepte:

D = 800 mm

## Grondopbouw en parameters

@select grondtype "Type grond onder fundering"
Zand, los (E_s = 10 MPa) = 10
Zand, matig dicht (E_s = 20 MPa) = 20
Zand, vast (E_s = 40 MPa) = 40
Klei, slap (E_s = 2 MPa) = 2
Klei, matig vast (E_s = 5 MPa) = 5
Klei, vast (E_s = 10 MPa) = 10
@end

Samendrukbaarheidsmodulus E_s (samendrukkingsmodulus):

E_s = grondtype * 1 MPa

Dikte samendrukbare laag onder fundering:

H_laag = 3000 mm

Volumegewicht grond:

gamma_grond = 18 kN/m^3

## Belasting (karakteristiek / quasi-permanent)

Verticale kracht op fundering (karakteristiek):

F_k = 100 kN

Effectief funderingsoppervlak:

A_f = B * L_f to mm^2

## Grondspanning

Contactspanning (additioneel, boven eigen grondgewicht):

sigma_0 = F_k / A_f * 1000 to kPa

Eigen grondspanning op funderingsniveau:

sigma_v0 = gamma_grond * D / 1000 to kPa

## Zetting met elastische methode (Bijlage F)

@select zettingsmethode "Berekeningsmethode"
1:2 methode (vereenvoudigd) = 1
Boussinesq (invloedsfactor) = 2
@end

#if zettingsmethode == 1
## Vereenvoudigde 1:2 methode

De spanning neemt af met de diepte. Bij de 1:2 methode wordt
de extra spanning op diepte z geschat als:

  delta_sigma(z) = F_k / ((B + z) * (L_f + z))

Gemiddelde spanning over de samendrukbare laag:

sigma_gem = F_k / ((B + H_laag / 2) * (L_f + H_laag / 2)) * 1e6 to kPa

Zetting (1:2 methode):

s = sigma_gem * H_laag / (E_s * 1000) to mm
#else
## Boussinesq methode

Invloedsfactor I_s (afhankelijk van B/L en H/B):

I_s = 0.85

Zetting (Boussinesq):

s = sigma_0 * B / (E_s * 1000) * I_s to mm
#end if

## Grenswaarde

@select grenswaarde "Grenswaarde zetting"
Fundering gebouw (25 mm) = 25
Fundering machines (10 mm) = 10
Fundering scheidingswand (15 mm) = 15
@end

s_max = grenswaarde * 1 mm

Unity check:

UC = s / s_max

#if UC < 1
  Zetting voldoet ({{s}} mm < {{s_max}} mm, UC = {{UC}}).
#else
  Zetting voldoet NIET ({{s}} mm > {{s_max}} mm, UC = {{UC}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Glijdingscontrole — NEN 9997-1 §6.5.3
// ─────────────────────────────────────────────────────────────────────────────

/** NEN 9997-1 §6.5.3 — Schuifweerstand funderingsstrook */
export const en1997Glijding = `# Glijdingscontrole — NEN 9997-1 §6.5.3

## Gevolgklasse

@select gevolgklasse "Gevolgklasse"
CC1 — Lage gevolgen = 1
CC2 — Middelmatige gevolgen = 2
CC3 — Grote gevolgen = 3
@end

Partiele factor grondweerstand (Bijlage A):

#if gevolgklasse == 1
gamma_Rh = 1.0
gamma_phi = 1.15
gamma_c = 1.5
#end if

#if gevolgklasse == 2
gamma_Rh = 1.0
gamma_phi = 1.20
gamma_c = 1.65
#end if

#if gevolgklasse == 3
gamma_Rh = 1.0
gamma_phi = 1.25
gamma_c = 1.8
#end if

## Grondparameters

Effectieve wrijvingshoek (karakteristiek):

phi_k = 25 deg

Effectieve cohesie (karakteristiek):

c_k = 0 kPa

## Rekenwaarden

Rekenwaarde wrijvingshoek:

phi_d_deg = atan(tan(phi_k * pi / 180) / gamma_phi) * 180 / pi

Rekenwaarde cohesie:

c_d = c_k / gamma_c to kPa

## Funderingsgeometrie

Breedte funderingsstrook:

B = 600 mm

Lengte (per strekkende meter):

L_f = 1000 mm

Contactoppervlak:

A_f = B * L_f to mm^2

## Belasting

Verticale belasting (rekenwaarde, gunstig):

V_Ed = 60 kN/m

Horizontale belasting (rekenwaarde):

H_Ed = 10 kN/m

## Schuifweerstand (formule 6.2)

Wrijvingsweerstand:

R_frictie = V_Ed * tan(phi_d_deg * pi / 180) to kN/m

Cohesieweerstand:

R_cohesie = c_d * A_f / 1e6 to kN/m

Totale schuifweerstand:

R_h = R_frictie + R_cohesie to kN/m

## Toetsing (art. 6.5.3)

Unity check:

UC = H_Ed / R_h

#if UC < 1
  Glijding voldoet (UC = {{UC}}).
#else
  Glijding voldoet NIET (UC = {{UC}})!
#end if
`;
