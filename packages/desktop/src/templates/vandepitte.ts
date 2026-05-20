/**
 * Prof. D. Vandepitte — Berekening van Constructies, Boekdeel I
 * Ifc-Calc rekenmodule templates
 *
 * Formules en verwijzingen conform het boek:
 * "Berekening van Constructies" door Prof. D. Vandepitte
 * Boekdeel I — Universiteit Gent
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schuifspanningen — Formule van Jourawsky (Hoofdstuk 2, art. 2.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 2 — Schuifspanningen door dwarskrachten */
export const vandepitteSchuifspanning = `# Schuifspanningen door Dwarskrachten — Formule van Jourawsky
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 2, art. 2.4

De schuifspanning in een dunwandig profiel wordt bepaald met de formule
van Jourawsky (Hfd. 2, formule 4):

  tau(s) = V * S_z(s) / (I_z * t(s))

waarbij S_z het statisch moment is van het deel van de doorsnede begrepen
tussen de vrije rand (s=0) en het langsvlakje ter plaatse van de berekening.

## Profielkeuze

@select profieltype "Type doorsnede"
Rechthoekige doorsnede (lambda = 3/2) = 1
I-profiel (belast in vlak van het lijf) = 2
Cirkelvormige doorsnede (lambda = 4/3) = 3
@end

## Doorsnede-eigenschappen

@select invoermethode "Invoer doorsnede"
Rechthoekig b x h = 1
Handmatige invoer I_z en S_z,max = 2
@end

#if invoermethode == 1
Breedte en hoogte van de rechthoekige doorsnede:

b = 200 mm
h = 400 mm

Traagheidsmoment:

I_z = b * h^3 / 12 to mm^4

Statisch moment (maximaal, ter hoogte van de neutrale lijn):

S_zmax = b * h^2 / 8 to mm^3

Wanddikte ter plaatse van de neutrale lijn:

t = b to mm
#else
Handmatig ingevoerde waarden:

I_z = 83560000 mm^4
S_zmax = 628400 mm^3
t = 7.1 mm
#end if

## Belasting

@select belastingtype "Type belastingschema"
Gelijkmatig verdeeld (q) = 1
Puntlast in het midden (F) = 2
@end

Overspanning:

L = 6000 mm

#if belastingtype == 1
Verdeelde belasting:

q = 25 kN/m

Maximale dwarskracht (bij oplegging):

V_max = q * L / 2 to kN
#else
Puntlast:

F = 100 kN

Maximale dwarskracht:

V_max = F / 2 to kN
#end if

## Schuifspanning (Jourawsky, Hfd. 2, formule 4)

Maximale schuifspanning (ter hoogte van de neutrale lijn):

tau_max = V_max * S_zmax / (I_z * t) to N/mm^2

Vormfactor lambda voor de schuifspanning (Hfd. 2, art. 1.1):

Vandepitte definieert lambda als de factor waarmee de gemiddelde
schuifspanning (V/A) moet worden vermenigvuldigd om de maximale
schuifspanning te verkrijgen. Voor een rechthoekige doorsnede
is lambda = 3/2, voor een cirkelvormige doorsnede lambda = 4/3.

#if profieltype == 1
Voor een rechthoekige doorsnede geldt lambda = 3/2:

A_bruto = b * h to mm^2

tau_controle = 3/2 * V_max / A_bruto to N/mm^2
#end if

#if profieltype == 3
Voor een cirkelvormige doorsnede geldt lambda = 4/3:

A_bruto = b * h to mm^2

tau_controle = 4/3 * V_max / A_bruto to N/mm^2
#end if

## Toelaatbare spanning

Toelaatbare schuifspanning (afhankelijk van materiaal):

tau_toel = 100 N/mm^2

Unity check:

UC_schijf = tau_max / tau_toel

#if UC_schijf < 1
  Schuifspanning voldoet (UC < 1.0).
#else
  Schuifspanning voldoet NIET!
#end if

## Overzicht

@svg
<svg width="500" height="300" viewBox="0 0 500 300">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
      <polygon points="0 8, 8 8, 4 0" fill="#059669"/>
    </marker>
  </defs>
  <!-- Doorsnede rechthoek -->
  <rect x="50" y="40" width="100" height="220" fill="#e8e0d0" stroke="#374151" stroke-width="2"/>
  <!-- Neutrale lijn -->
  <line x1="30" y1="150" x2="170" y2="150" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="175" y="154" font-size="11" fill="#3b82f6">N.L.</text>
  <!-- Tau verdeling parabolisch -->
  <path d="M 150,40 Q 210,150 150,260" fill="none" stroke="#dc2626" stroke-width="2"/>
  <line x1="150" y1="150" x2="210" y2="150" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrowDown)" transform="rotate(-90,180,150)"/>
  <text x="215" y="154" font-size="11" fill="#dc2626">tau_max</text>
  <!-- Afmetingen -->
  <line x1="50" y1="275" x2="150" y2="275" stroke="#6b7280" stroke-width="1"/>
  <line x1="50" y1="270" x2="50" y2="280" stroke="#6b7280" stroke-width="1"/>
  <line x1="150" y1="270" x2="150" y2="280" stroke="#6b7280" stroke-width="1"/>
  <text x="100" y="290" text-anchor="middle" font-size="11" fill="#6b7280">b = {{b}} mm</text>
  <line x1="25" y1="40" x2="25" y2="260" stroke="#6b7280" stroke-width="1"/>
  <line x1="20" y1="40" x2="30" y2="40" stroke="#6b7280" stroke-width="1"/>
  <line x1="20" y1="260" x2="30" y2="260" stroke="#6b7280" stroke-width="1"/>
  <text x="15" y="155" text-anchor="middle" font-size="11" fill="#6b7280" transform="rotate(-90,15,155)">h = {{h}} mm</text>
  <!-- Formule -->
  <text x="350" y="80" text-anchor="middle" font-size="13" fill="#1e40af" font-weight="bold">Jourawsky</text>
  <text x="350" y="110" text-anchor="middle" font-size="12" fill="#374151">tau = V * S_z / (I_z * t)</text>
  <text x="350" y="150" text-anchor="middle" font-size="12" fill="#dc2626">tau_max = {{tau_max}} N/mm2</text>
  <text x="350" y="180" text-anchor="middle" font-size="12" fill="#374151">V_max = {{V_max}} kN</text>
  <text x="350" y="220" text-anchor="middle" font-size="14" fill="#059669" font-weight="bold">UC = {{UC_schijf}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Doorbuiging inclusief dwarskrachten (Hoofdstuk 2, art. 1.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 2 — Doorbuiging met effect van dwarskrachten */
export const vandepitteDoorbuiging = `# Doorbuiging inclusief Dwarskrachteffect
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 2, art. 1.2

Vandepitte toont (Hfd. 2, formule 2) dat de doorbuiging bestaat uit twee delen:
- v_2 : doorbuiging door buigmomenten (M/EI)
- v_1 : doorbuiging door dwarskrachten (lambda*V/GA)

De differentiaalvergelijking luidt (formule 2):

  (d2v/dx2) = M/EI + lambda*p/GA

## Materiaal

@select materiaal "Materiaal"
Staal S235 (E=210000, G=81000) = 1
Staal S355 (E=210000, G=81000) = 2
Hout C24 (E=11000, G=690) = 3
Beton C30/37 (E=33000, G=13750) = 4
Aluminium (E=70000, G=26000) = 5
@end

#if materiaal == 1
E = 210000 N/mm^2
G = 81000 N/mm^2
#end if

#if materiaal == 2
E = 210000 N/mm^2
G = 81000 N/mm^2
#end if

#if materiaal == 3
E = 11000 N/mm^2
G = 690 N/mm^2
#end if

#if materiaal == 4
E = 33000 N/mm^2
G = 13750 N/mm^2
#end if

#if materiaal == 5
E = 70000 N/mm^2
G = 26000 N/mm^2
#end if

## Doorsnede

@select doorsnedevorm "Doorsnede"
Rechthoekig (lambda = 6/5) = 1
I-profiel (lambda ~ A/A_lijf) = 2
@end

b = 200 mm
h = 400 mm

Oppervlakte:

A = b * h to mm^2

Traagheidsmoment:

I = b * h^3 / 12 to mm^4

Vormfactor lambda voor dwarskrachtdoorbuiging (Hfd. 2, art. 1.1):

Vandepitte: voor een rechthoekige doorsnede is lambda = 6/5.
Voor een I-profiel is lambda bij benadering gelijk aan A/(A_lijf),
ofwel de totale oppervlakte gedeeld door het lijfoppervlak.

lambda = 1.2

## Belasting en geometrie

@select belastinggeval "Belastinggeval"
Gelijkmatig verdeelde belasting q = 1
Puntlast F in het midden = 2
@end

L = 5000 mm

#if belastinggeval == 1
q = 15 kN/m

## Doorbuiging door buigmomenten (Hfd. 2, art. 1.2.1)

v_2 = 5 * q * L^4 / (384 * E * I) to mm

## Doorbuiging door dwarskrachten (Hfd. 2, formule 3)

v_1 = lambda * q * L^2 / (8 * G * A) to mm
#else
F = 50 kN

## Doorbuiging door buigmomenten

v_2 = F * L^3 / (48 * E * I) to mm

## Doorbuiging door dwarskrachten (Hfd. 2, art. 1.2.2)

v_1 = lambda * F * L / (4 * G * A) to mm
#end if

## Totale doorbuiging

v_totaal = v_2 + v_1 to mm

Aandeel dwarskrachten:

aandeel_V = v_1 / v_totaal * 100

Vandepitte merkt op (Hfd. 2, art. 1.3.1) dat v_1 gewoonlijk klein is
t.o.v. v_2. Voor I-profielen met lambda ~ 3 en h/L = 0,1 is v_1
slechts 3,1% van v_2. Voor zeer korte staven kan het aandeel echter
aanzienlijk zijn.

Verhouding h/L:

ratio_hL = h / L

#if ratio_hL < 0.1
  De verhouding h/L < 1/10: het dwarskrachteffect is verwaarloosbaar (< 3%).
#else
  De verhouding h/L >= 1/10: houd rekening met het dwarskrachteffect!
#end if

## Grenswaarde

Toelaatbare doorbuiging (L/250):

v_toel = L / 250 to mm

UC_doorbuiging = v_totaal / v_toel

#if UC_doorbuiging < 1
  Doorbuiging voldoet (UC < 1.0).
#else
  Doorbuiging voldoet NIET!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Knikken van drukstaven — Euler (Hoofdstuk 5, art. 5.2-5.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 5 — Knikken van drukstaven (Euler) */
export const vandepitteKnikken = `# Knikken van Drukstaven — Theorie van Euler
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 5, art. 5.2-5.4

De kritieke knikbelasting volgens Euler (Hfd. 5, art. 5.2.2.3):

  P_k = n^2 * pi^2 * E * I / l^2

met de kniklengte l_k = l / n, oftewel (Hfd. 5, art. 5.4.6):

  P_k = pi^2 * E * I / l_k^2

De kniklengte l_k hangt af van de randvoorwaarden (Hfd. 5, art. 5.4):
- Staaf a (inklemming-vrij):     l_k = 2 * l
- Staaf b (scharnier-scharnier): l_k = l
- Staaf c (inklemming-inklemming): l_k = l / 2
- Staaf d (inklemming-scharnier): l_k = 0.699 * l

## Materiaal

@select materiaal "Materiaal"
Staal S235 (E=210000, f_y=235) = 1
Staal S355 (E=210000, f_y=355) = 2
Hout C24 (E=11000, f_c=21) = 3
Aluminium 6061-T6 (E=70000, f_y=240) = 4
@end

#if materiaal == 1
E = 210000 N/mm^2
f_y = 235 N/mm^2
#end if

#if materiaal == 2
E = 210000 N/mm^2
f_y = 355 N/mm^2
#end if

#if materiaal == 3
E = 11000 N/mm^2
f_y = 21 N/mm^2
#end if

#if materiaal == 4
E = 70000 N/mm^2
f_y = 240 N/mm^2
#end if

## Doorsnede

@select doorsnedevorm "Doorsnedevorm"
Rechthoekig b x h = 1
Cirkelvormig (diameter D) = 2
Buisprofiel (D x t) = 3
@end

#if doorsnedevorm == 1
b = 100 mm
h = 100 mm

A = b * h to mm^2
I_min = b * h^3 / 12 to mm^4

#if b < h
I_min = h * b^3 / 12 to mm^4
#end if

Traagheidsstraal:

i_min = sqrt(I_min / A) to mm
#end if

#if doorsnedevorm == 2
D = 100 mm

A = pi / 4 * D^2 to mm^2
I_min = pi / 64 * D^4 to mm^4
i_min = D / 4 to mm
#end if

#if doorsnedevorm == 3
D = 114.3 mm
t_w = 6.3 mm

A = pi / 4 * (D^2 - (D - 2*t_w)^2) to mm^2
I_min = pi / 64 * (D^4 - (D - 2*t_w)^4) to mm^4
i_min = sqrt(I_min / A) to mm
#end if

## Randvoorwaarden en systeemlengte

@select randvoorwaarden "Randvoorwaarden (Hfd. 5, art. 5.4)"
Staaf a: inklemming-vrij (beta_k = 2.0) = 2.0
Staaf b: scharnier-scharnier (beta_k = 1.0) = 1.0
Staaf c: inklemming-inklemming (beta_k = 0.5) = 0.5
Staaf d: inklemming-scharnier (beta_k = 0.699) = 0.699
@end

Systeemlengte:

l = 3000 mm

Factor beta_k (Hfd. 5, art. 5.4.6):

beta_k = randvoorwaarden * 1

Kniklengte:

l_k = beta_k * l to mm

## Eulerse knikbelasting (Hfd. 5, art. 5.2.2.3)

P_E = pi^2 * E * I_min / l_k^2 to kN

## Slankheid

Slankheid:

lambda = l_k / i_min

Grensslankheid (overgang plastisch-elastisch knikken):

lambda_grens = pi * sqrt(E / f_y)

#if lambda > lambda_grens
  Elastisch knikken is maatgevend (lambda > lambda_grens).
  De Euler-formule is geldig.
#else
  Plastisch knikken: de Euler-formule overschat het draagvermogen.
  Gebruik een knikcurve (bijv. Eurocode).
#end if

## Kritieke spanning

sigma_E = P_E / A to N/mm^2

Verhouding sigma_E / f_y:

ratio = sigma_E / f_y

## Belasting en toetsing

Normaalkracht (ontwerp):

N_Ed = 150 kN

Drukspanning:

sigma_d = N_Ed / A to N/mm^2

Unity check (op Euler knikbelasting):

UC_knik = N_Ed / P_E

#if UC_knik < 1
  Knikstabiliteit voldoet (UC < 1.0).
#else
  Knikstabiliteit voldoet NIET!
#end if

## Overzicht

@svg
<svg width="550" height="380" viewBox="0 0 550 380">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#a3a3a3" stroke-width="0.8"/>
    </pattern>
  </defs>
  <!-- Staaf a: inklemming-vrij -->
  <rect x="30" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="55" y1="340" x2="55" y2="100" stroke="#1e40af" stroke-width="3"/>
  <line x1="45" y1="100" x2="65" y2="100" stroke="#dc2626" stroke-width="2"/>
  <line x1="55" y1="100" x2="55" y2="75" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,55,87)"/>
  <text x="55" y="65" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="55" y="370" text-anchor="middle" font-size="10" fill="#374151">a: l_k=2l</text>
  <!-- Staaf b: scharnier-scharnier -->
  <polygon points="175,340 168,355 182,355" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="175" y1="340" x2="175" y2="100" stroke="#1e40af" stroke-width="3"/>
  <polygon points="175,100 168,85 182,85" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="175" y1="85" x2="175" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,175,72)"/>
  <text x="175" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="175" y="370" text-anchor="middle" font-size="10" fill="#374151">b: l_k=l</text>
  <!-- Staaf c: inklemming-inklemming -->
  <rect x="270" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="295" y1="340" x2="295" y2="100" stroke="#1e40af" stroke-width="3"/>
  <rect x="270" y="90" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="295" y1="90" x2="295" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,295,75)"/>
  <text x="295" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="295" y="370" text-anchor="middle" font-size="10" fill="#374151">c: l_k=l/2</text>
  <!-- Staaf d: inklemming-scharnier -->
  <rect x="390" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="415" y1="340" x2="415" y2="100" stroke="#1e40af" stroke-width="3"/>
  <polygon points="415,100 408,85 422,85" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="415" y1="85" x2="415" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,415,72)"/>
  <text x="415" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="415" y="370" text-anchor="middle" font-size="10" fill="#374151">d: l_k=0.7l</text>
  <!-- Resultaten -->
  <text x="490" y="140" font-size="12" fill="#374151">P_E = {{P_E}} kN</text>
  <text x="490" y="165" font-size="12" fill="#374151">lambda = {{lambda}}</text>
  <text x="490" y="190" font-size="12" fill="#374151">l_k = {{l_k}} mm</text>
  <text x="490" y="230" font-size="14" fill="#059669" font-weight="bold">UC = {{UC_knik}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Doorbuiging van liggers — Analogieen van Mohr (Hoofdstuk 1, art. 2.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 1 — Doorbuiging met analogieen van Mohr */
export const vandepitteMohr = `# Doorbuiging van Liggers — Analogieen van Mohr
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 1, art. 2.1

Vandepitte behandelt de analogieen van Mohr voor het berekenen van
elastische verplaatsingen en verdraaiingen van liggers (Hfd. 1, art. 2.1).

Het gereduceerde momentenvlak M/EI wordt beschouwd als een fictieve
belasting op een hulpligger L'. De doorbuiging in een punt U is dan
gelijk aan het buigend moment in U van de fictieve balk L'.

## Voorbeelden (Hfd. 1, art. 2.1.6)

### Prismatische ligger met overkraging

@select belastinggeval "Belastinggeval"
Puntlast P aan uiteinde overkraging = 1
Gelijkmatig verdeelde belasting q = 2
@end

## Geometrie

Overspanning (tussen steunpunten):

L = 6000 mm

Lengte overkraging:

a = 2000 mm

## Materiaal en doorsnede

E = 210000 N/mm^2

Traagheidsmoment:

I = 83560000 mm^4

EI = E * I to kN*mm^2

#if belastinggeval == 1
## Puntlast P op overkraging

P = 10 kN

### Doorbuiging in D (midden van overspanning)

Vandepitte (Hfd. 1, art. 2.1.6, voorbeeld 1):
Met de eerste analogie van Mohr is het buigend moment in D
van de fictieve balk gelijk aan de doorbuiging a_1:

a_1 = P * a * L^2 / (16 * EI) to mm

Richting: naar boven (de balk buigt omhoog in het midden wanneer
de overkraging naar beneden wordt belast).

### Verdraaiing bij steunpunt B

theta_1 = P * a * L / (6 * EI)

#if a < L
  Opmerking: de formule is geldig voor a < L.
#end if

### Doorbuiging aan het uiteinde C van de overkraging

Doorbuiging door rotatie bij B plus lokale doorbuiging:

a_C = P * a^2 * (a + L) / (3 * EI) to mm

#else
## Gelijkmatig verdeelde belasting q

q = 10 kN/m

### Doorbuiging in het midden van de overspanning

M_max = q * L^2 / 8 to kN*m

a_1 = 5 * q * L^4 / (384 * EI) to mm

### Doorbuiging aan het uiteinde van de overkraging

a_C = q * a^2 / (24 * EI) * (4 * a^2 + 3 * a * L) to mm

#end if

## Grenswaarde

Toelaatbare doorbuiging (L/250):

v_toel = L / 250 to mm

#if belastinggeval == 1
UC_doorbuiging = a_C / v_toel
#else
UC_doorbuiging = a_1 / v_toel
#end if

#if UC_doorbuiging < 1
  Doorbuiging voldoet (UC < 1.0).
#else
  Doorbuiging voldoet NIET!
#end if

## Overzicht

@svg
<svg width="600" height="220" viewBox="0 0 600 220">
  <defs>
    <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
    </marker>
  </defs>
  <!-- Balk -->
  <line x1="80" y1="100" x2="520" y2="100" stroke="#1e40af" stroke-width="3"/>
  <!-- Oplegging links (scharnier) A -->
  <polygon points="80,100 65,130 95,130" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="60" y1="133" x2="100" y2="133" stroke="#374151" stroke-width="2"/>
  <text x="80" y="148" text-anchor="middle" font-size="11" fill="#374151">A</text>
  <!-- Oplegging rechts (rol) B -->
  <polygon points="400,100 385,130 415,130" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="392" cy="135" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <circle cx="408" cy="135" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="382" y1="143" x2="418" y2="143" stroke="#374151" stroke-width="2"/>
  <text x="400" y="158" text-anchor="middle" font-size="11" fill="#374151">B</text>
  <!-- Punt C (einde overkraging) -->
  <text x="520" y="92" text-anchor="middle" font-size="11" fill="#374151">C</text>
  <!-- Punt D (midden overspanning) -->
  <text x="240" y="92" text-anchor="middle" font-size="11" fill="#374151">D</text>
  <circle cx="240" cy="100" r="3" fill="#3b82f6"/>
  <!-- Belasting op overkraging -->
  <line x1="520" y1="45" x2="520" y2="95" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowRed)"/>
  <text x="520" y="38" text-anchor="middle" font-size="12" fill="#dc2626">P</text>
  <!-- Maat overspanning -->
  <line x1="80" y1="175" x2="400" y2="175" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="80" y1="169" x2="80" y2="181" stroke="#6b7280" stroke-width="1"/>
  <line x1="400" y1="169" x2="400" y2="181" stroke="#6b7280" stroke-width="1"/>
  <text x="240" y="192" text-anchor="middle" font-size="11" fill="#6b7280">L = {{L}} mm</text>
  <!-- Maat overkraging -->
  <line x1="400" y1="175" x2="520" y2="175" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="520" y1="169" x2="520" y2="181" stroke="#6b7280" stroke-width="1"/>
  <text x="460" y="192" text-anchor="middle" font-size="11" fill="#6b7280">a = {{a}} mm</text>
  <!-- Doorbuigingslijn -->
  <path d="M 80,100 Q 240,95 400,100 Q 460,108 520,115" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6"/>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Eigenfrequentie van liggers (Hoofdstuk 8, art. 8.2-8.3)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 8 — Eigenfrequentie van liggers */
export const vandepitteEigenfrequentie = `# Eigenfrequentie van Liggers
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 8, art. 8.2-8.3

De eigenfrequentie van een elastisch opgestaafde massa is (Hfd. 8, formule 154):

  f = 1/(2*pi) * sqrt(K/m)

waarbij K de veerstijfheid is en m de massa.

## Systeem

@select systeem "Type systeem (Hfd. 8, art. 8.2.3)"
Kraagbalk met puntmassa aan het uiteinde = 1
Ligger op twee steunpunten met puntmassa in het midden = 2
Elastisch ingeklemde staaf met verdeelde massa = 3
@end

## Materiaal en doorsnede

E = 210000 N/mm^2

Traagheidsmoment:

I = 83560000 mm^4

Overspanning:

L = 6000 mm

#if systeem == 1
## Kraagbalk met puntmassa (Hfd. 8, art. 8.2.3, formule 157)

Massa aan het uiteinde:

m = 500 kg

Veerstijfheid kraagbalk: K = 3*EI/L^3

K = 3 * E * I / L^3 to N/mm

De statische doorbuiging onder eigen gewicht:

u_st = m * 9.81 / K to mm

Eigenfrequentie (formule 157):

f = 1 / (2 * pi) * sqrt(K * 1000 / m) to Hz

Benadering met de statische doorbuiging (Hfd. 8, formule 154):

f_controle = 1 / (2 * pi) * sqrt(9810 / u_st) to Hz

#end if

#if systeem == 2
## Ligger met puntmassa in het midden (Hfd. 8, art. 8.2.3, formule 157)

Massa in het midden:

m = 500 kg

Veerstijfheid: K = 48*EI/L^3

K = 48 * E * I / L^3 to N/mm

De statische doorbuiging:

u_st = m * 9.81 / K to mm

Eigenfrequentie (formule 157):

f = 1 / (2 * pi) * sqrt(K * 1000 / m) to Hz

Benadering:

f_controle = 1 / (2 * pi) * sqrt(9810 / u_st) to Hz

#end if

#if systeem == 3
## Elastisch ingeklemde staaf met verdeelde massa (Hfd. 8, art. 8.8)

Vandepitte geeft voor een ingeklemde staaf met gelijkmatig verdeelde
massa de eigenfrequentie (Hfd. 8, formule 163-164):

  f_1 = c_1^2 / (2*pi) * sqrt(EI / (m_bar * L^4))

met c_1 = 4.730 voor de eerste eigenfrequentie.

Massa per lengte-eenheid:

m_bar = 50 kg/m

Eerste eigenwaarde (Hfd. 8, art. 8.8):

c_1 = 4.730

De eigenfrequentie van een ingeklemde staaf is (Hfd. 8, formule 164):

De verhouding t.o.v. een ligger op twee steunpunten bedraagt:
33/140 bij benadering (Hfd. 8, formule 164).

f = c_1^2 / (2 * pi) * sqrt(E * I / (m_bar * L^4)) to Hz

#end if

## Beoordeling

#if f > 5
  Eigenfrequentie > 5 Hz: geen dynamische problemen te verwachten
  bij voetgangersbelasting.
#else
  Eigenfrequentie <= 5 Hz: risico op resonantie met voetgangersbelasting!
  Nader dynamisch onderzoek is nodig.
#end if

#if f > 3
  Eigenfrequentie > 3 Hz: geen problemen bij normale vloerbelasting.
#else
  Eigenfrequentie <= 3 Hz: trillingshinder is waarschijnlijk!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Virtuele Arbeid — Berekening van verplaatsingen (Hoofdstuk 1, art. 1.1-1.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 1 — Beginsel van de virtuele arbeid */
export const vandepitteVirtueleArbeid = `# Beginsel van de Virtuele Arbeid
Bron: Prof. D. Vandepitte — Berekening van Constructies, Deel I, Hoofdstuk 1, art. 1.1-1.4

Het beginsel van de virtuele arbeid (Hfd. 1, formule 3):

De totale virtuele arbeid van alle inwendige krachten R_i,
voor elke mogelijke combinatie van virtuele verplaatsingen
vanuit de vervormingstoestand, is nul:

  SOM(F_i * delta_i) + SOM(R_i * delta_i) = 0

## Toepassing: Doorbuiging van een vakwerkstaaf

De virtuele arbeid bij virtuele rek (Hfd. 1, art. 1.3):
In een staaf met trekkracht n en virtuele rek delta_epsilon,
is de virtuele arbeid per eenheid van lengte: -n * delta_epsilon.

## Vakwerk

@select vakwerktype "Type vakwerk"
Eenvoudige driehoek = 1
Warren vakwerk (6 velden) = 2
@end

Aantal staven:

n_staven = 11

Overspanning:

L = 12000 mm

Hoogte vakwerk:

H = 2000 mm

## Materiaal

E = 210000 N/mm^2

## Staafkrachten (voorbeeld)

Oppervlakte bovenrand:

A_boven = 2000 mm^2

Oppervlakte onderrand:

A_onder = 2000 mm^2

Oppervlakte diagonaal:

A_diag = 1000 mm^2

## Belasting

Puntlast op knoop (midden onderrand):

F = 100 kN

## Doorbuiging met de methode van de virtuele arbeid (Hfd. 1, art. 1.5)

De doorbuiging a in het punt en de richting van de virtuele
eenheidskracht wordt berekend als:

  a = SOM( N_i * n_i * L_i / (E * A_i) )

waarbij:
- N_i = staafkracht door werkelijke belasting
- n_i = staafkracht door virtuele eenheidslast
- L_i = lengte van de staaf
- E * A_i = axiale stijfheid

Voorbeeld (vereenvoudigd): doorbuiging door bovenrandstaaf:

N_boven = F * L / (4 * H) to kN

n_boven = 1 * L / (4 * H) to kN/kN

L_boven = L / 2 to mm

delta_boven = N_boven * n_boven * L_boven / (E * A_boven) to mm

Voorbeeld: doorbuiging door onderrandstaaf:

N_onder = F * L / (4 * H) to kN

n_onder = 1 * L / (4 * H) to kN/kN

L_onder = L / 2 to mm

delta_onder = N_onder * n_onder * L_onder / (E * A_onder) to mm

Voorbeeld: doorbuiging door diagonaal:

L_diag = sqrt(H^2 + (L/4)^2) to mm

N_diag = F / 2 * L_diag / H to kN

n_diag = 1 / 2 * L_diag / H to kN/kN

delta_diag = N_diag * n_diag * L_diag / (E * A_diag) to mm

Benadering totale doorbuiging (2x boven + 2x onder + 2x diag):

delta_totaal = 2 * delta_boven + 2 * delta_onder + 2 * delta_diag to mm

## Grenswaarde

v_toel = L / 300 to mm

UC = delta_totaal / v_toel

#if UC < 1
  Doorbuiging van het vakwerk voldoet (UC < 1.0).
#else
  Doorbuiging van het vakwerk voldoet NIET!
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// Export bundel
// ─────────────────────────────────────────────────────────────────────────────

export const vandepitteFormules: { id: string; label: string; template: string }[] = [
  {
    id: 'vdp-schuifspanning',
    label: 'Vandepitte: Schuifspanningen (Jourawsky)',
    template: vandepitteSchuifspanning,
  },
  {
    id: 'vdp-doorbuiging',
    label: 'Vandepitte: Doorbuiging met dwarskrachteffect',
    template: vandepitteDoorbuiging,
  },
  {
    id: 'vdp-knikken',
    label: 'Vandepitte: Knikken (Euler)',
    template: vandepitteKnikken,
  },
  {
    id: 'vdp-mohr',
    label: 'Vandepitte: Doorbuiging (Mohr)',
    template: vandepitteMohr,
  },
  {
    id: 'vdp-eigenfrequentie',
    label: 'Vandepitte: Eigenfrequentie',
    template: vandepitteEigenfrequentie,
  },
  {
    id: 'vdp-virtuele-arbeid',
    label: 'Vandepitte: Virtuele Arbeid (vakwerk)',
    template: vandepitteVirtueleArbeid,
  },
];
