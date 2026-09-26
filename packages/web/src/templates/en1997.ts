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

/**
 * NEN 9997-1 §6 — Draagvermogen funderingsstrook.
 *
 * Partiële factoren uit tabel A.4a, voor funderingen op staal onafhankelijk
 * van de gevolgklasse: γ_φ' op tan φ', γ_c' op c'. In de q- en de γ-term werkt
 * γ_γ op het totale volumiek gewicht, onder de grondwaterstand het verzadigde,
 * en gaat de waterdruk er ongefactoreerd af: σ'_v;z;d = Σ d·γ_k/γ_γ − u
 * (6.5.2.2(g)) en γ'_d = γ_sat;k/γ_γ − γ_w;d met γ_w;d = 10 kN/m³ (6.5.2.2(o)).
 * De grondwaterstand is de hoogste te verwachten (6.5.2.2(c)); droog alleen
 * als die dieper ligt dan de invloedsdiepte.
 *
 * Bij |e_B| > B/6 meldt het blad de bijzondere maatregelen van 6.5.4(1)P en
 * telt het de plaatsingsafwijking van 0,1 m mee (6.5.4(2)), tenzij de gebruiker
 * speciale zorg bij de uitvoering kiest. De kier onder de zool (6.5.4(a):
 * volgens de OPMERKING een glijvlak onder V_d met σ'_v;z;d = 0) en de
 * randdetaillering rekent het blad niet; het oordeel is dan "niet aangetoond".
 *
 * De inclinatiefactoren volgen bijlage D (D.4) zonder de term A'·c'·cot φ',
 * niet 6.5.2.2(j): volgens de OPMERKING bij (j) in het algemeen aan de veilige
 * kant, zie docs/afwijkingen-referentie.md. Ze gebruiken dezelfde V_Ed als de
 * toets. De i-factoren, B_eff en σ'_max;d zijn ten minste nul: bij H_d ≥ V_Ed,
 * e_Bd ≥ B/2 of een negatief effectief gewicht (γ_sat;k < γ_γ·γ_w;d = 11 kN/m³,
 * slap veen) wordt R_d nul en het oordeel "voldoet niet", niet een UC die door
 * een even macht of een negatief teken weer gunstig uitvalt. Invoer met
 * eenheden; de rekenkern rekent om. De slotzin
 * "Maatgevende UC = …" is wat de rapportkop leest. scripts/check-en1997.mjs
 * rekent het na.
 */
export const en1997Funderingsstrook = `# Draagvermogen Funderingsstrook — NEN 9997-1 §6 / Bijlage D

## Partiële factoren (tabel A.4a)

gamma_phi = 1.15', op tan φ′'
gamma_c = 1.6', op c′'
gamma_gamma = 1.1', op het volumiek gewicht'
gamma_Rv = 1.0

## Grondparameters

Effectieve wrijvingshoek (karakteristiek):

phi_k = 25', in graden'

Effectieve cohesie (karakteristiek):

c_k = 0 kPa

Volumegewicht grond boven de grondwaterstand:

gamma_grond = 18 kN/m^3

Verzadigd volumegewicht grond onder de grondwaterstand:

gamma_sat = 20 kN/m^3

@select grondwater "Hoogste grondwaterstand (6.5.2.2(c)); ligt hij ertussen: kies de hogere"
Dieper dan de invloedsdiepte onder de zool (droog) = 1
Op de funderingszool = 2
Op maaiveld = 3
@end

## Funderingsgeometrie

Breedte funderingsstrook:

B = 600 mm

Funderingsdiepte onder maaiveld:

D = 800 mm

Lengte funderingsstrook (per strekkende meter):

L_f = 1000 mm

## Effectieve afmetingen (6.5.2.2(b) en 6.5.4)

Excentriciteit belasting in breedte-richting:

e_B = 0 mm

#if abs(e_B) > B / 6
'<b style="color:#b91c1c">e<sub>B</sub> > B/6: bijzondere maatregelen nodig (6.5.4(1)P); de kier onder de zool (6.5.4(a)) is niet in deze toets opgenomen.</b>
@select afwijking "Plaatsingsafwijking (6.5.4(2))"
0,1 m in rekening = 1
Geen: bij de uitvoering is er speciale zorg aan besteed = 0
@end
e_Bd = abs(e_B) + afwijking * 100 mm to mm
#else
e_Bd = abs(e_B) to mm
#end if

Effectieve breedte:

B_eff = if(B - 2 * e_Bd > 0 mm; B - 2 * e_Bd; 0 mm) to mm

Effectieve oppervlak per m':

A_eff = B_eff * L_f to mm^2

## Rekenwaarde grondparameters (DA3)

Rekenwaarde wrijvingshoek:

phi_d_deg = atan(tan(phi_k * pi / 180) / gamma_phi) * 180 / pi

Rekenwaarde cohesie:

c_d = c_k / gamma_c to kPa

## Draagkrachtfactoren (6.5.2.2(i))

N_q = exp(pi * tan(phi_d_deg * pi / 180)) * (tan(45 * pi / 180 + phi_d_deg * pi / 360))^2

N_c = (N_q - 1) / tan(phi_d_deg * pi / 180)

N_gamma = 2 * (N_q - 1) * tan(phi_d_deg * pi / 180)

## Vormfactoren (Bijlage D, strook: s = 1.0)

Strookfundering: alle vormfactoren = 1.0:

s_c = 1.0
s_q = 1.0
s_gamma = 1.0

## Belasting

Verticale belasting per m' strook (rekenwaarde):

V_Ed = 80 kN/m

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

Inclinatiefactoren volgens D.4 zonder A′·c′·cot φ′ (volgens de OPMERKING bij 6.5.2.2(j) in het algemeen aan de veilige kant), met dezelfde V_Ed als de toets:

m_exp = 2.0
i_q = max(1 - H_d / V_Ed; 0)^m_exp
i_gamma = max(1 - H_d / V_Ed; 0)^(m_exp + 1)

#if c_d > 0 kPa
i_c = max(i_q - (1 - i_q) / (N_c * tan(phi_d_deg * pi / 180)); 0)
#else
i_c = 1.0
#end if
#end if

## Grondspanning naast fundering

Rekenwaarde effectieve grondspanning op funderingsniveau (6.5.2.2(g)) en effectief volumiek gewicht onder de zool (6.5.2.2(o)):

gamma_w = 10 kN/m^3', γ_w;d'

#if grondwater == 3
u_w = gamma_w * D to kPa', waterdruk op aanlegniveau'
q_eff = gamma_sat * D / gamma_gamma - u_w to kPa
#else
q_eff = gamma_grond * D / gamma_gamma to kPa
#end if

#if grondwater == 1
gamma_eff = gamma_grond / gamma_gamma to kN/m^3
#else
gamma_eff = gamma_sat / gamma_gamma - gamma_w to kN/m^3
#end if

## Draagvermogen (6.5.2.2(i))

R_over_A = c_d * N_c * s_c * i_c + q_eff * N_q * s_q * i_q + 0.5 * gamma_eff * B_eff * N_gamma * s_gamma * i_gamma to kPa

Draagvermogen per m' strook:

R_d = max(R_over_A; 0 kPa) * B_eff / gamma_Rv to kN/m

## Toetsing (art. 6.5.2, formule 6.1)

UC_max = V_Ed / R_d

#if UC_max ≤ 1 and abs(e_B) > B / 6
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ≤ 1,0, maar e<sub>B</sub> > B/6: de kier onder de zool (6.5.4(a)) en de bijzondere maatregelen (6.5.4(1)P) zijn niet getoetst → <b>niet aangetoond</b></span>
#else if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>draagvermogen voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>draagvermogen voldoet niet</b></span>
#end if

## Overzicht

#hide
y_gw = if(grondwater == 1; 265; if(grondwater == 2; 180; 80))
#show

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
  <line x1="20" y1="{{y_gw}}" x2="480" y2="{{y_gw}}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="6"/>
  <text x="485" y="{{y_gw}}" dy="12" font-size="10" fill="#3b82f6">GW</text>
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
  <text x="420" y="260" text-anchor="middle" font-size="13" fill="#374151" font-weight="bold">UC = {{UC_max}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Paaldraagvermogen — NEN 9997-1 §7
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEN 9997-1 §7 — Axiaal draagvermogen paalfundering: alleen een verwijzing.
 *
 * Het paaldraagvermogen rekent de module Paaldraagvermogen (paaldraagvermogen.ts)
 * volgens art. 7.6.2.3, met tabel 7.c, tabel A.10a/A.10b en γ_t, en die heeft een
 * controlescript. Een tweede, vereenvoudigde uitwerking hier zou ernaast gaan
 * afwijken; dit blad rekent daarom niet zelf.
 */
export const en1997Paaldraagvermogen = `# Axiaal Draagvermogen Paalfundering — NEN 9997-1 §7

'Dit normblad rekent niet zelf. Het draagvermogen op druk volgens art. 7.6.2.3 (Koppejan, tabel 7.c, tabel A.10 en γ<sub>t</sub>, met negatieve kleef volgens 7.3.2.2) staat in de module <b>Paaldraagvermogen</b>; voeg die in via de catalogus.
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Zetting, indicatief — NEN 9997-1 §6.6
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEN 9997-1 §6.6 — Indicatieve zakking met een 1:2-spreiding of een
 * invloedsfactor, geen berekening volgens 6.6 of bijlage F. De grenswaarde is
 * geen vaste keuze maar invoer: hij moet met de ontwerper van de bovenbouw
 * zijn overeengekomen (2.4.8(5)P) en in het ontwerp vastgelegd (2.4.9(1)P).
 * Invoer met eenheden; de rekenkern rekent om. scripts/check-en1997.mjs
 * rekent het na.
 */
export const en1997Zetting = `# Zetting, indicatief — NEN 9997-1 §6.6

'<i>Indicatieve zakking (elastisch, één laag), geen berekening volgens 6.6 of bijlage F.</i>

## Funderingsgeometrie

Breedte fundering:

B = 1000 mm

Lengte fundering:

L_f = 1000 mm

Funderingsdiepte:

D = 800 mm

## Grondopbouw en parameters

@select grondtype "Type grond onder fundering"
Zand, los, of klei, vast (E_s = 10 MPa) = 10
Zand, matig dicht (E_s = 20 MPa) = 20
Zand, vast (E_s = 40 MPa) = 40
Klei, slap (E_s = 2 MPa) = 2
Klei, matig vast (E_s = 5 MPa) = 5
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

sigma_0 = F_k / A_f to kPa

Eigen grondspanning op funderingsniveau:

sigma_v0 = gamma_grond * D to kPa

## Zakking, elastisch

@select zettingsmethode "Berekeningsmethode"
1:2 methode (vereenvoudigd) = 1
Boussinesq (invloedsfactor) = 2
@end

#if zettingsmethode == 1
## Vereenvoudigde 1:2 methode

Gemiddelde spanning over de samendrukbare laag (spreiding 1:2, op H_laag/2):

sigma_gem = F_k / ((B + H_laag / 2) * (L_f + H_laag / 2)) to kPa

Zetting (1:2 methode):

s = sigma_gem * H_laag / E_s to mm
#else
## Boussinesq methode

Invloedsfactor I_s (afhankelijk van B/L en H/B):

I_s = 0.85

Zetting (Boussinesq):

s = sigma_0 * B / E_s * I_s to mm
#end if

## Grenswaarde (2.4.8(5)P en 2.4.9(1)P)

Grenswaarde van de zakking, overeen te komen met de ontwerper van de bovenbouw:

s_max = 25 mm

UC_max = s / s_max

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>indicatieve zakking voldoet</b></span>; rotatie (2.4.9) niet getoetst
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>indicatieve zakking voldoet niet</b></span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Glijdingscontrole — NEN 9997-1 §6.5.3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEN 9997-1 §6.5.3 — Glijding van een funderingsstrook.
 *
 * Gedraineerd met δ_d = φ'_cv;d (in het werk gestort) of 2/3·φ'_cv;d (glad
 * prefab), c' verwaarloosd (6.5.3(10)); γ_φ' uit tabel A.4a, onafhankelijk van
 * de gevolgklasse. Op klei of veen daarnaast ongedraineerd (6.4a), ten hoogste
 * 0,4·V_d (6.5). scripts/check-en1997.mjs rekent het na.
 */
export const en1997Glijding = `# Glijdingscontrole — NEN 9997-1 §6.5.3

## Partiële factoren (tabel A.4a)

gamma_phi = 1.15', op tan φ′'
gamma_Rh = 1.0

## Grondparameters

Kritieke-toestandshoek van inwendige wrijving (karakteristiek):

phi_cv_k = 25', φ′_cv;k in graden'

@select uitvoering "Fundering"
In het werk gestort (δ_d = φ′_cv;d) = 1
Glad prefab (δ_d = 2/3·φ′_cv;d) = 2
@end

## Rekenwaarden

phi_cv_d = atan(tan(phi_cv_k * pi / 180) / gamma_phi) * 180 / pi

#if uitvoering == 1
delta_d = phi_cv_d', 6.5.3(10)'
#else
delta_d = 2 / 3 * phi_cv_d', 6.5.3(10)'
#end if

## Funderingsgeometrie

Breedte funderingsstrook:

B = 600 mm

Lengte (per strekkende meter):

L_f = 1000 mm

## Belasting

Verticale belasting (rekenwaarde, gunstig):

V_Ed = 60 kN/m

Horizontale belasting (rekenwaarde):

H_Ed = 10 kN/m

## Gedraineerd (formule 6.3a)

R_h = V_Ed * tan(delta_d * pi / 180) / gamma_Rh to kN/m', c′ verwaarloosd (6.5.3(10))'

UC_dr = H_Ed / R_h

## Ongedraineerd (formules 6.4a en 6.5)

@select ondergrond "Ondergrond onder de zool"
Zand of grind: alleen gedraineerd = 1
Klei of veen: ook ongedraineerd = 2
@end

#if ondergrond == 2
c_uk = 50 kPa
gamma_cu = 1.35', op c_u'
R_hu = min(B * c_uk / gamma_cu; 0.4 * V_Ed) to kN/m', (6.4a), ten hoogste 0,4·V_d (6.5)'
UC_ud = H_Ed / R_hu
#end if

## Toetsing (art. 6.5.3)

#if ondergrond == 2
UC_max = max(UC_dr; UC_ud)
#else
UC_max = UC_dr
#end if

#if UC_max ≤ 1
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>glijding voldoet</b></span>
#else
  '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>glijding voldoet niet</b></span>
#end if
`;
