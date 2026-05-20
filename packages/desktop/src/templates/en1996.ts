/**
 * EN 1996-1-1 (Eurocode 6) — Metselwerkconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Druksterkte metselwerk — EN 1996-1-1 §3.6.1
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §3.6.1 — Karakteristieke druksterkte metselwerk */
export const en1996Druksterkte = `# Druksterkte Metselwerk — EN 1996-1-1 §3.6.1

## Steentype en morteltype

@select steentype "Steentype (tabel 3.3 NB)"
Baksteen groep 1 = 1
Baksteen groep 2 = 2
Kalkzandsteen (KZS) = 3
Cellenbeton = 4
Betonsteen = 5
@end

@select morteltype "Morteltype (art. 3.6.1.2)"
Mortel voor algemeen gebruik = 1
Dunbed-/lijmmortel = 2
@end

Genormaliseerde druksterkte steen f_b (EN 772-1):

f_b = 15 N/mm^2

#if morteltype == 1
Mortelsterkte f_m (N/mm^2):

f_m = 5 N/mm^2
#end if

## Constante K (tabel 3.3 NB)

#if steentype == 1
#if morteltype == 1
Factor K (baksteen groep 1, mortel voor alg. gebruik):

K = 0.55
alpha = 0.7
beta = 0.3
#else
Factor K (baksteen groep 1, lijmmortel):

K = 0.75
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 2
#if morteltype == 1
Factor K (baksteen groep 2, mortel voor alg. gebruik):

K = 0.45
alpha = 0.7
beta = 0.3
#else
Factor K (baksteen groep 2, lijmmortel):

K = 0.70
alpha = 0.7
beta = 0
#end if
#end if

#if steentype == 3
#if morteltype == 1
Factor K (KZS, mortel voor alg. gebruik):

K = 0.55
alpha = 0.7
beta = 0.3
#else
Factor K (KZS, lijmmortel):

K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 4
#if morteltype == 1
Factor K (cellenbeton, mortel voor alg. gebruik):

K = 0.55
alpha = 0.7
beta = 0.3
#else
Factor K (cellenbeton, lijmmortel):

K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 5
#if morteltype == 1
Factor K (betonsteen, mortel voor alg. gebruik):

K = 0.55
alpha = 0.7
beta = 0.3
#else
Factor K (betonsteen, lijmmortel):

K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

## Karakteristieke druksterkte (formule 3.1)

#if morteltype == 1
Karakteristieke druksterkte (formule 3.2):

f_k = K * f_b^alpha * f_m^beta to N/mm^2
#else
Karakteristieke druksterkte (lijmmortel, formule 3.3/3.4):

f_k = K * f_b^alpha to N/mm^2
#end if

## Elasticiteitsmodulus (art. 3.7.2 NB)

Factor K_E (NB waarde = 700, niet 1000):

K_E = 700

Elasticiteitsmodulus metselwerk:

E = K_E * f_k to N/mm^2
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Drukwand — EN 1996-1-1 §6.1.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §6.1.2 — Wand belast op druk */
export const en1996Drukwand = `# Toetsing Drukwand — EN 1996-1-1 §6.1.2

## Steentype en morteltype

@select steentype "Steentype (tabel 3.3 NB)"
Baksteen groep 1 = 1
Baksteen groep 2 = 2
Kalkzandsteen (KZS) = 3
Cellenbeton = 4
Betonsteen = 5
@end

@select morteltype "Morteltype"
Mortel voor algemeen gebruik = 1
Dunbed-/lijmmortel = 2
@end

Genormaliseerde druksterkte steen f_b:

f_b = 15 N/mm^2

#if morteltype == 1
Mortelsterkte f_m:

f_m = 5 N/mm^2
#end if

## Karakteristieke druksterkte (art. 3.6.1)

#if steentype == 1
#if morteltype == 1
K = 0.55
alpha = 0.7
beta = 0.3
#else
K = 0.75
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 2
#if morteltype == 1
K = 0.45
alpha = 0.7
beta = 0.3
#else
K = 0.70
alpha = 0.7
beta = 0
#end if
#end if

#if steentype == 3
#if morteltype == 1
K = 0.55
alpha = 0.7
beta = 0.3
#else
K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 4
#if morteltype == 1
K = 0.55
alpha = 0.7
beta = 0.3
#else
K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

#if steentype == 5
#if morteltype == 1
K = 0.55
alpha = 0.7
beta = 0.3
#else
K = 0.80
alpha = 0.85
beta = 0
#end if
#end if

#if morteltype == 1
f_k = K * f_b^alpha * f_m^beta to N/mm^2
#else
f_k = K * f_b^alpha to N/mm^2
#end if

## Partiele factor (tabel 2.3 NB)

@select categorie "Uitvoeringscategorie (tabel 2.3 NB)"
Categorie I (gamma_M = 1.7) = 1.7
Categorie II (gamma_M = 2.0) = 2.0
Categorie III (gamma_M = 2.2) = 2.2
@end

gamma_M = categorie * 1

Rekenwaarde druksterkte:

f_d = f_k / gamma_M to N/mm^2

## Geometrie wand

Wandhoogte (verdiepingshoogte):

h = 2700 mm

Wanddikte:

t = 100 mm

@select oplegging_boven "Oplegging bovenzijde (tabel 5.1)"
Betonvloer beide zijden (rho_2 = 0.75) = 0.75
Betonvloer een zijde (rho_2 = 0.75) = 0.75
Houten vloer (rho_2 = 1.0) = 1.00
Vrije rand (rho_2 = 1.0) = 1.00
@end

Reductiefactor rho_2 (tabel 5.1):

rho_2 = oplegging_boven * 1

Effectieve wandhoogte (formule 5.3):

h_ef = rho_2 * h to mm

Effectieve wanddikte:

t_ef = t to mm

## Slankheid (art. 5.5.1.4)

Slankheid:

slankheid = h_ef / t_ef

#if slankheid > 27
  FOUT: slankheid > 27, wand voldoet NIET aan art. 5.5.1.4!
#end if

#if slankheid < 27
  Slankheid {{slankheid}} <= 27 (voldoet).
#end if

## Excentriciteiten (art. 6.1.2.1)

Initiele excentriciteit (formule 6.5):

e_init = h_ef / 450 to mm

Excentriciteit door belasting (M_Ed/N_Ed):

e_belasting = 0 mm

Totale excentriciteit aan kop/voet:

e_top = e_init + e_belasting to mm

## Capaciteitsreductiefactor Phi (art. 6.1.2.1)

Excentriciteitsverhouding:

e_ratio = e_top / t

Phi_1 (formule 6.4, aan kop/voet):

Phi_1 = 1 - 2 * e_top / t

Phi_2 (formule 6.4, op halve hoogte, vereenvoudigd):

Phi_2 = 1 - 2 * e_top / t

Maatgevende Phi (kleinste waarde):

#if Phi_1 < Phi_2
Phi = Phi_1
#else
Phi = Phi_2
#end if

## Belasting

Normaalkracht per strekkende meter wand:

N_Ed = 50 kN/m

## Draagvermogen (formule 6.2)

Rekenwaarde draagvermogen per m' wand:

N_Rd = Phi * t * f_d to kN/m

## Toetsing (art. 6.1.2)

Unity check:

UC_druk = N_Ed / N_Rd

#if UC_druk < 1
  Drukwand voldoet (UC = {{UC_druk}}).
#else
  Drukwand voldoet NIET (UC = {{UC_druk}})!
#end if

## Overzicht

@svg
<svg width="400" height="320" viewBox="0 0 400 320">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#a3a3a3" stroke-width="0.6"/>
    </pattern>
  </defs>
  <!-- Fundering -->
  <rect x="80" y="270" width="160" height="15" fill="url(#hatch)" stroke="#374151" stroke-width="1.5"/>
  <!-- Wand -->
  <rect x="130" y="50" width="60" height="220" fill="#d4a574" stroke="#8b6914" stroke-width="1.5"/>
  <!-- Metselwerk textuur -->
  <line x1="130" y1="80" x2="190" y2="80" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="110" x2="190" y2="110" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="140" x2="190" y2="140" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="170" x2="190" y2="170" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="200" x2="190" y2="200" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="230" x2="190" y2="230" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="260" x2="190" y2="260" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="160" y1="50" x2="160" y2="80" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="145" y1="80" x2="145" y2="110" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="175" y1="80" x2="175" y2="110" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="160" y1="110" x2="160" y2="140" stroke="#b8956c" stroke-width="0.5"/>
  <!-- Belasting pijl -->
  <line x1="160" y1="10" x2="160" y2="45" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)"/>
  <text x="160" y="8" text-anchor="middle" font-size="11" fill="#dc2626">N_Ed = {{N_Ed}} kN/m</text>
  <!-- Maat h -->
  <line x1="110" y1="50" x2="110" y2="270" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="105" y1="50" x2="115" y2="50" stroke="#6b7280" stroke-width="1"/>
  <line x1="105" y1="270" x2="115" y2="270" stroke="#6b7280" stroke-width="1"/>
  <text x="100" y="165" text-anchor="middle" font-size="10" fill="#6b7280" transform="rotate(-90,100,165)">h = {{h}} mm</text>
  <!-- Maat t -->
  <line x1="130" y1="295" x2="190" y2="295" stroke="#6b7280" stroke-width="1"/>
  <line x1="130" y1="290" x2="130" y2="300" stroke="#6b7280" stroke-width="1"/>
  <line x1="190" y1="290" x2="190" y2="300" stroke="#6b7280" stroke-width="1"/>
  <text x="160" y="310" text-anchor="middle" font-size="10" fill="#6b7280">t = {{t}} mm</text>
  <!-- Resultaten -->
  <text x="300" y="80" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="bold">EN 1996-1-1</text>
  <text x="300" y="110" text-anchor="middle" font-size="11" fill="#374151">f_k = {{f_k}} N/mm2</text>
  <text x="300" y="130" text-anchor="middle" font-size="11" fill="#374151">f_d = {{f_d}} N/mm2</text>
  <text x="300" y="155" text-anchor="middle" font-size="11" fill="#374151">Phi = {{Phi}}</text>
  <text x="300" y="175" text-anchor="middle" font-size="11" fill="#374151">N_Rd = {{N_Rd}} kN/m</text>
  <text x="300" y="210" text-anchor="middle" font-size="13" fill="#059669" font-weight="bold">UC = {{UC_druk}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Afschuiving metselwerk — EN 1996-1-1 §6.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §6.2 — Afschuiving metselwerk */
export const en1996Afschuiving = `# Toetsing Afschuiving Metselwerk — EN 1996-1-1 §6.2

## Materiaal

@select steentype "Steentype"
Baksteen groep 1 = 1
Kalkzandsteen (KZS) = 2
Cellenbeton = 3
Betonsteen = 4
@end

Karakteristieke afschuifhechting f_vk,0 (tabel 3.4 NB):

#if steentype == 1
f_vk0 = 0.15 N/mm^2
#end if

#if steentype == 2
f_vk0 = 0.15 N/mm^2
#end if

#if steentype == 3
f_vk0 = 0.15 N/mm^2
#end if

#if steentype == 4
f_vk0 = 0.15 N/mm^2
#end if

@select categorie "Uitvoeringscategorie"
Categorie I (gamma_M = 1.7) = 1.7
Categorie II (gamma_M = 2.0) = 2.0
Categorie III (gamma_M = 2.2) = 2.2
@end

gamma_M = categorie * 1

## Geometrie

Wanddikte:

t = 100 mm

Wandlengte (schuifwand):

L_w = 3000 mm

Doorsnede schuifwand:

A_s = t * L_w to mm^2

## Belasting

Normaalkracht op schuifwand:

N_Ed = 80 kN

Horizontale kracht (wind, etc.):

V_Ed = 15 kN

## Afschuifsterkte (formule 3.5)

Gemiddelde normaalspanning:

sigma_d = N_Ed / A_s to N/mm^2

Karakteristieke afschuifsterkte (formule 3.5):

f_vk = f_vk0 + 0.4 * sigma_d to N/mm^2

Bovengrens f_vk (art. 3.6.2):

f_vk_max = 0.045 * f_b to N/mm^2

Genormaliseerde druksterkte steen:

f_b = 15 N/mm^2

#if f_vk > f_vk_max
  f_vk wordt begrensd op {{f_vk_max}} N/mm^2 (bovengrens).
#end if

Rekenwaarde afschuifsterkte:

f_vd = f_vk / gamma_M to N/mm^2

## Toetsing (formule 6.13)

Schuifspanning:

tau_d = V_Ed / A_s to N/mm^2

Unity check:

UC_afschuiving = tau_d / f_vd

#if UC_afschuiving < 1
  Afschuiving voldoet (UC = {{UC_afschuiving}}).
#else
  Afschuiving voldoet NIET (UC = {{UC_afschuiving}})!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Slankheid en stabiliteit — EN 1996-1-1 §5.5.1
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §5.5.1 — Slankheid en effectieve hoogte */
export const en1996Slankheid = `# Slankheid en Effectieve Hoogte — EN 1996-1-1 §5.5.1

## Geometrie

Wandhoogte (vrije hoogte):

h = 2700 mm

Wanddikte:

t = 100 mm

Wandlengte:

L_w = 4000 mm

## Effectieve hoogte (art. 5.5.1.2)

@select oplegging "Type vloeroplegging (tabel 5.1)"
Betonvloer tweezijdig (rho_2 = 0.75) = 0.75
Betonvloer eenzijdig (rho_2 = 0.75) = 0.75
Houten vloer (rho_2 = 1.0) = 1.0
Vrije bovenkant (rho_2 = 2.0) = 2.0
@end

rho_2 = oplegging * 1

Effectieve hoogte (formule 5.3):

h_ef = rho_2 * h to mm

## Effectieve dikte (art. 5.5.1.3)

@select wandtype "Type wand"
Enkelblads wand (rho_t = 1.0) = 1.0
Spouwmuur met spouwankers (rho_t = 0.7) = 0.7
@end

rho_t = wandtype * 1

Effectieve dikte (formule 5.10):

t_ef = rho_t * t to mm

## Slankheidscontrole (art. 5.5.1.4)

Slankheid:

lambda = h_ef / t_ef

Grenswaarde slankheid:

lambda_max = 27

UC_slankheid = lambda / lambda_max

#if lambda < 27
  Slankheid {{lambda}} <= 27: voldoet.
#else
  Slankheid {{lambda}} > 27: voldoet NIET!
#end if

## Initiele excentriciteit (art. 5.5.1.1)

e_init = h_ef / 450 to mm

Verhouding e/t:

e_ratio = e_init / t

#if e_ratio > 0.33
  Excentriciteitsverhouding e/t > 1/3: ongunstig!
#else
  Excentriciteitsverhouding e/t = {{e_ratio}} (< 1/3, voldoet).
#end if
`;
