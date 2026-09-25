/**
 * EN 1996-1-1 (Eurocode 6) — Metselwerkconstructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018
 *
 * Normbladen: ze volgen de norm met de Nederlandse bijlage, zonder de
 * splitsingen naar een referentie-uitwerking die de modules hebben. De
 * waarden staan als voorbeeld in de bladtekst en zijn daar aan te passen.
 * K, α en β komen uit tabel NB-2 en γ_M uit tabel NB-1, net als in de modules
 * Dragende metselwerkwand en Oplegging op metselwerk; dezelfde wand geeft in
 * een normblad en in een module dus dezelfde f_k.
 *
 * Het blad Wand op druk staat met zijn voorbeeldwaarden gelijk aan
 * referentieset 1 van de wandmodule; scripts/check-en1996.mjs houdt dat vast.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Druksterkte metselwerk — EN 1996-1-1 §3.6.1
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §3.6.1 — Karakteristieke druksterkte metselwerk */
export const en1996Druksterkte = `# Druksterkte metselwerk — EN 1996-1-1 §3.6.1

'<i>Karakteristieke druksterkte van metselwerk volgens formule (3.2), met K, α en β uit
'tabel NB-2 en de grenzen op f<sub>b</sub> en f<sub>m</sub> uit de Nederlandse bijlage. Pas de
'waarden hieronder aan in de bladtekst.</i>

## Steen en mortel

@select steensoort "Steensoort (holtepercentage → steengroep)"
  Baksteen <25% = 1
  Baksteen <55% = 2
  Kalkzandsteen <25% = 3
  Kalkzandsteen <55% = 4
  Betonsteen <25% = 5
  Betonsteen <60% = 6
  Cellenbeton <25% = 7
@end

@select morteltype "Morteltype"
  Metselmortel = 1
  Lijmmortel = 2
@end

f_b = 12', genormaliseerde druksterkte van de steen [N/mm²] (NEN-EN 772-1)'
f_m = 15', mortelsterkte [N/mm²]: M-klasse bij metselmortel, L-klasse bij lijmmortel'

@select steencategorie "Steencategorie (γ_M, tabel NB-1)"
  Categorie I = 1
  Categorie II = 2
@end

#hide
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0 |1; 2; 1; 2; 1; 2; 1]
K = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 3); hlookup(steenmat; steensoort; 1; 2))
alfa = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
bexp = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
groep = hlookup(steenmat; steensoort; 1; 6)
'NB bij 3.6.1.2: f_b hoogstens 75 (metselmortel) of 50 N/mm² (lijmmortel);
'f_m hoogstens 20 N/mm², bij metselmortel ook hoogstens 2·f_b.
f_beff = min(f_b; if(morteltype ≡ 1; 75; 50))
f_meff = min(f_m; 20; if(morteltype ≡ 1; 2*f_beff; 20))
gam_M = if(steencategorie ≡ 1; 1.7; 2.2) - if(CC ≡ 1; 0.2; 0)
#show

## Karakteristieke druksterkte — formule (3.2)

K', tabel NB-2'
alfa', exponent α'
bexp', exponent β'
f_beff', f_b na de grens van de NB'
f_meff', f_m na de grenzen van de NB'
f_k = K*f_beff^alfa*f_meff^bexp*N/mm^2', karakteristieke druksterkte (3.2)'

## Rekenwaarde en elasticiteitsmodulus

gam_M', partiële factor, tabel NB-1'
f_d = f_k/gam_M', rekenwaarde druksterkte (2.4.1)'
E_mw = 700*f_k', elasticiteitsmodulus, K_E = 700 (NB bij 3.7.2(2))'
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Drukwand — EN 1996-1-1 §6.1.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §6.1.2 — Wand belast op druk */
export const en1996Drukwand = `# Wand op druk — EN 1996-1-1 §6.1.2

'<i>Ongewapende enkelbladige wand, gesteund aan boven- en onderzijde (n = 2), gerekend
'op een strook van 1 m. Getoetst worden de slankheid (§5.5.1.4), de reductiefactor Φ
'aan kop en voet (6.4) en op halve hoogte (bijlage G), en de extra toets met een
'minimale excentriciteit uit de Nederlandse bijlage (NB bij 5.5.1.1(5)). Pas de
'waarden hieronder aan in de bladtekst.</i>

## Metselwerk

@select steensoort "Steensoort (holtepercentage → steengroep)"
  Baksteen <25% = 1
  Baksteen <55% = 2
  Kalkzandsteen <25% = 3
  Kalkzandsteen <55% = 4
  Betonsteen <25% = 5
  Betonsteen <60% = 6
  Cellenbeton <25% = 7
@end

@select morteltype "Morteltype"
  Metselmortel = 1
  Lijmmortel = 2
@end

f_b = 12', genormaliseerde druksterkte van de steen [N/mm²]'
f_m = 15', mortelsterkte [N/mm²]'

@select steencategorie "Steencategorie (γ_M, tabel NB-1)"
  Categorie I = 1
  Categorie II = 2
@end

phi_inf = 1.5', eindkruipcoëfficiënt φ_∞ (tabel NB-3), telt alleen boven λ_c = 27'

#hide
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0 |1; 2; 1; 2; 1; 2; 1]
K = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 3); hlookup(steenmat; steensoort; 1; 2))
alfa = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
bexp = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
groep = hlookup(steenmat; steensoort; 1; 6)
'NB bij 3.6.1.2: f_b hoogstens 75 (metselmortel) of 50 N/mm² (lijmmortel);
'f_m hoogstens 20 N/mm², bij metselmortel ook hoogstens 2·f_b.
f_beff = min(f_b; if(morteltype ≡ 1; 75; 50))
f_meff = min(f_m; 20; if(morteltype ≡ 1; 2*f_beff; 20))
gam_M = if(steencategorie ≡ 1; 1.7; 2.2) - if(CC ≡ 1; 0.2; 0)
#show
f_k = K*f_beff^alfa*f_meff^bexp*N/mm^2', karakteristieke druksterkte (3.2), tabel NB-2'
gam_M', tabel NB-1'
f_d = f_k/gam_M', rekenwaarde druksterkte'
E_mw = 700*f_k', elasticiteitsmodulus (NB bij 3.7.2(2))'

## Wand en belasting

h_w = 2800*mm', verdiepingshoogte'
t_w = 120*mm', wanddikte'
l_w = 1000*mm', rekenstrook van 1 m'

@select ondersteuning "Ondersteuning boven en onder (bepaalt ρ₂, §5.5.1.2(11))"
  betonvloer of -dak aan beide zijden = 1
  betonvloer of -dak aan één zijde, oplegging ten minste ⅔·t = 2
  houten vloer of dak = 3
  vloer aan één zijde met een kortere oplegging = 4
@end

N_Ed = 200*kN', normaalkracht op de strook: de grootste uit de fundamentele combinaties'
M_1Ed = 0*kN*m', moment aan de kop, op de strook'
M_mEd = 0*kN*m', moment op halve hoogte, op de strook'
M_2Ed = 0*kN*m', moment aan de voet, op de strook'

## Effectieve hoogte en slankheid — §5.5.1

#hide
N_min = max(abs(N_Ed); 0.001*kN)
#show
e_t0 = abs(M_1Ed)/N_min to mm', excentriciteit aan de kop'
#if ondersteuning ≤ 2
    #if e_t0 > 0.25*t_w
        'e<sub>t</sub> is groter dan 0,25·t: de inklemming vervalt (§5.5.1.2(11)(i)).
        rho_2 = 1.0', (5.4)'
    #else
        rho_2 = 0.75', betonvloer, (5.3)'
    #end if
#else
    rho_2 = 1.0', geen inklemming, (5.5)'
#end if
h_ef = rho_2*h_w', effectieve hoogte (5.2)'
t_ef = t_w', effectieve dikte, enkelbladig (5.5.1.3(1))'
lam = h_ef/t_ef', slankheid'
UC_lam = lam/27', §5.5.1.4: ten hoogste 27'

## Kop en voet — §6.1.2.2

e_init = h_ef/450', initiële excentriciteit (5.5.1.1(4))'
e_it = max(abs(M_1Ed)/N_min + e_init; 0.05*t_w) to mm', excentriciteit kop (6.5)'
Phi_it = max(1 - 2*e_it/t_w; 0)', reductiefactor kop (6.4), niet kleiner dan nul'
e_ib = max(abs(M_2Ed)/N_min + e_init; 0.05*t_w) to mm', excentriciteit voet (6.5)'
Phi_ib = max(1 - 2*e_ib/t_w; 0)', reductiefactor voet (6.4), niet kleiner dan nul'

## Halve hoogte — bijlage G

e_m = abs(M_mEd)/N_min + e_init to mm', eerste-orde excentriciteit (6.7)'
#if lam ≤ 27
    e_k = 0*mm', kruipexcentriciteit, nul bij λ ≤ λ_c = 27 (NB bij 6.1.2.2(2))'
#else
    e_k = 0.002*phi_inf*lam*sqrt(t_w*e_m)', kruipexcentriciteit (6.8)'
#end if
e_mk = max(e_m + e_k; 0.05*t_w)', totale excentriciteit (6.6)'
A_1 = 1 - 2*e_mk/t_w', (G.2)'
lam_F = lam*sqrt(f_k/E_mw)', (G.4)'
u_m = (lam_F - 0.063)/(0.73 - 1.17*e_mk/t_ef)', (G.3)'
Phi_m = max(A_1*exp(-u_m^2/2); 0)', reductiefactor halve hoogte (G.1), niet kleiner dan nul'

## Toetsing — §6.1.2.1

N_Rdt = Phi_it*l_w*t_w*f_d to kN', kop (6.2)'
N_Rdb = Phi_ib*l_w*t_w*f_d to kN', voet (6.2)'
N_Rdm = Phi_m*l_w*t_w*f_d to kN', halve hoogte (6.2)'
N_Rd = min(N_Rdt; N_Rdb; N_Rdm)', maatgevende capaciteit'
#if N_Ed < 0 kN
    '<span style="color: red"><b>Trek</b>: ongewapend metselwerk neemt geen trek op → <b>voldoet niet</b></span>
    #hide
    UC_1 = 1/0
    #show
#else if N_Rd > 0 kN
    UC_1 = N_Ed/N_Rd', (6.1)'
#else
    '<span style="color: red">N<sub>Rd</sub> = 0: de resultante valt buiten de wanddoorsnede
    '(e ≥ t/2) → <b>voldoet niet</b></span>
    #hide
    UC_1 = 1/0
    #show
#end if

## Minimale excentriciteit — NB bij 5.5.1.1(5)

'<i>Naast de toets met de werkelijke momenten eist de Nederlandse bijlage een toets met de
'grootste normaalkracht, ρ<sub>2</sub> = 1,00 en een over de hoogte constante eerste-orde
'excentriciteit van ten minste 10 mm en h<sub>ef</sub>/300.</i>
h_ef2 = h_w', effectieve hoogte met ρ_2 = 1,00'
lam_2 = h_ef2/t_ef', slankheid bij ρ_2 = 1,00'
e_m2 = max(10*mm; h_ef2/300)', constante excentriciteit'
#if lam_2 ≤ 27
    e_k2 = 0*mm', kruipexcentriciteit, nul bij λ ≤ λ_c = 27'
#else
    e_k2 = 0.002*phi_inf*lam_2*sqrt(t_w*e_m2)', kruipexcentriciteit (6.8)'
#end if
e_mk2 = max(e_m2 + e_k2; 0.05*t_w)', (6.6)'
A_12 = 1 - 2*e_mk2/t_w', (G.2)'
lam_F2 = lam_2*sqrt(f_k/E_mw)', (G.4)'
u_2 = (lam_F2 - 0.063)/(0.73 - 1.17*e_mk2/t_ef)', (G.3)'
Phi_m2 = max(A_12*exp(-u_2^2/2); 0)', (G.1), niet kleiner dan nul'
N_Rdm2 = Phi_m2*l_w*t_w*f_d to kN', (6.2)'
#if N_Ed < 0 kN
    #hide
    UC_2 = 1/0
    #show
#else if N_Rdm2 > 0 kN
    UC_2 = N_Ed/N_Rdm2
#else
    '<span style="color: red">N<sub>Rd,m2</sub> = 0 → <b>voldoet niet</b></span>
    #hide
    UC_2 = 1/0
    #show
#end if

## Samenvatting

UC_max = max(UC_lam; UC_1; UC_2)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>Wand op druk voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>Wand op druk voldoet niet</b></span>
#end if

@svg
<svg width="400" height="320" viewBox="0 0 400 320">
  <defs>
    <marker id="en1996pijl" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="en1996arcering" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#a3a3a3" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect x="80" y="270" width="160" height="15" fill="url(#en1996arcering)" stroke="#374151" stroke-width="1.5"/>
  <rect x="130" y="50" width="60" height="220" fill="#d4a574" stroke="#8b6914" stroke-width="1.5"/>
  <line x1="130" y1="80" x2="190" y2="80" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="110" x2="190" y2="110" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="140" x2="190" y2="140" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="170" x2="190" y2="170" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="200" x2="190" y2="200" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="230" x2="190" y2="230" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="130" y1="260" x2="190" y2="260" stroke="#b8956c" stroke-width="0.5"/>
  <line x1="160" y1="10" x2="160" y2="45" stroke="#dc2626" stroke-width="2" marker-end="url(#en1996pijl)"/>
  <text x="160" y="8" text-anchor="middle" font-size="11" fill="#dc2626">N_Ed = {{N_Ed}} kN per m</text>
  <line x1="110" y1="50" x2="110" y2="270" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="105" y1="50" x2="115" y2="50" stroke="#6b7280" stroke-width="1"/>
  <line x1="105" y1="270" x2="115" y2="270" stroke="#6b7280" stroke-width="1"/>
  <text x="100" y="165" text-anchor="middle" font-size="10" fill="#6b7280" transform="rotate(-90,100,165)">h = {{h_w}} mm</text>
  <line x1="130" y1="295" x2="190" y2="295" stroke="#6b7280" stroke-width="1"/>
  <line x1="130" y1="290" x2="130" y2="300" stroke="#6b7280" stroke-width="1"/>
  <line x1="190" y1="290" x2="190" y2="300" stroke="#6b7280" stroke-width="1"/>
  <text x="160" y="310" text-anchor="middle" font-size="10" fill="#6b7280">t = {{t_w}} mm</text>
  <text x="300" y="80" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="bold">EN 1996-1-1</text>
  <text x="300" y="110" text-anchor="middle" font-size="11" fill="#374151">f_k = {{f_k}} N/mm2</text>
  <text x="300" y="130" text-anchor="middle" font-size="11" fill="#374151">f_d = {{f_d}} N/mm2</text>
  <text x="300" y="155" text-anchor="middle" font-size="11" fill="#374151">h_ef = {{h_ef}} mm</text>
  <text x="300" y="175" text-anchor="middle" font-size="11" fill="#374151">N_Rd = {{N_Rd}} kN per m</text>
  <text x="300" y="210" text-anchor="middle" font-size="13" fill="#059669" font-weight="bold">UC = {{UC_max}}</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Afschuiving metselwerk — EN 1996-1-1 §6.2
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §6.2 — Afschuiving metselwerk */
export const en1996Afschuiving = `# Afschuiving metselwerk — EN 1996-1-1 §6.2

'<i>Afschuiving in het vlak van een ongewapende wand: V<sub>Ed</sub> ≤ V<sub>Rd</sub> = f<sub>vd</sub>·t·l<sub>c</sub>
'(6.13). De schuifsterkte volgt uit (3.5) of (3.6) met de bovengrens van de Nederlandse
'bijlage, f<sub>vlt</sub> = 0,065·f<sub>b</sub>. Pas de waarden hieronder aan in de bladtekst.</i>

## Metselwerk

f_b = 12', genormaliseerde druksterkte van de steen [N/mm²]'
f_vk0 = 0.20', initiële schuifsterkte f_vk0 [N/mm²]'
'<i>De Nederlandse bijlage laat f<sub>vk0</sub> bepalen met NEN-EN 1052-3 of, zonder
'afschuifproeven, gelijk nemen aan f<sub>xk1</sub>: de hechtsterkte uit de proef volgens
'NEN-EN 1052-5 (NB bij 3.6.2(6) en 3.6.4(5)). Bij cellenbeton is f<sub>xk1</sub> = 0,1·f<sub>k</sub>
'met metselmortel en 0,15·f<sub>k</sub> met lijmmortel (NB bij 3.6.4(7)).</i>

@select stootvoegen "Stootvoegen"
  gevuld, formule (3.5) = 1
  ongevuld maar dicht tegen elkaar, formule (3.6) = 2
@end

@select steencategorie "Steencategorie (γ_M, tabel NB-1)"
  Categorie I = 1
  Categorie II = 2
@end

#hide
gam_M = if(steencategorie ≡ 1; 1.7; 2.2) - if(CC ≡ 1; 0.2; 0)
#show
gam_M', tabel NB-1'

## Wand en belasting

t_w = 100*mm', wanddikte'
l_c = 3000*mm', lengte van het gedrukte deel van de wand'
N_Ed = 80*kN', normaalkracht op het gedrukte deel, uit dezelfde combinatie als V_Ed'
V_Ed = 15*kN', schuifkracht in het vlak van de wand'

## Schuifsterkte — §3.6.2

sig_d = N_Ed/(t_w*l_c) to N/mm^2', gemiddelde drukspanning op het gedrukte deel'
#if stootvoegen ≡ 1
    f_vk1 = f_vk0*N/mm^2 + 0.4*sig_d', (3.5)'
#else
    f_vk1 = 0.5*f_vk0*N/mm^2 + 0.4*sig_d', (3.6)'
#end if
f_vlt = 0.065*f_b*N/mm^2', bovengrens (NB bij 3.6.2(3) en (4))'
f_vk = min(f_vk1; f_vlt)', karakteristieke schuifsterkte'
f_vd = f_vk/gam_M', rekenwaarde schuifsterkte'

## Toetsing — §6.2

V_Rd = f_vd*t_w*l_c to kN', (6.13)'
#if V_Rd > 0 kN
    UC_max = abs(V_Ed)/V_Rd', (6.12)'
#else
    '<span style="color: red">V<sub>Rd</sub> = 0: geen schuifsterkte → <b>voldoet niet</b></span>
    #hide
    UC_max = 1/0
    #show
#end if
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>Afschuiving voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>Afschuiving voldoet niet</b></span>
#end if

'<i>σ<sub>d</sub> hoort bij de belastingscombinatie van V<sub>Ed</sub>; neem daarvoor de kleinste
'gelijktijdige normaalkracht. Een deel van de wand dat op trek staat, telt niet mee in l<sub>c</sub>
'(§6.2(2)).</i>
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Slankheid en stabiliteit — EN 1996-1-1 §5.5.1
// ─────────────────────────────────────────────────────────────────────────────

/** EN 1996-1-1 §5.5.1 — Slankheid en effectieve hoogte */
export const en1996Slankheid = `# Slankheid en effectieve hoogte — EN 1996-1-1 §5.5.1

'<i>Effectieve hoogte met ρ<sub>2</sub>, ρ<sub>3</sub> of ρ<sub>4</sub> (§5.5.1.2), effectieve dikte
'(§5.5.1.3) en de grens λ ≤ 27 (§5.5.1.4). Pas de waarden hieronder aan in de bladtekst.</i>

## Wand

h_w = 2700*mm', vrije verdiepingshoogte'
t_w = 100*mm', dikte van het (dragende) blad'
L_v = 4000*mm', afstand tussen de verticale steunen'

@select ondersteuning "Ondersteuning boven en onder (§5.5.1.2(11))"
  betonvloer of -dak aan beide zijden = 1
  betonvloer of -dak aan één zijde, oplegging ten minste ⅔·t = 2
  houten vloer of dak = 3
  vloer aan één zijde met een kortere oplegging = 4
@end

@select n_rand "Gesteunde randen n"
  2 (boven en onder) = 2
  3 (en één verticale rand) = 3
  4 (en twee verticale randen) = 4
@end

'<i>ρ<sub>2</sub> = 0,75 geldt alleen zolang de excentriciteit aan de kop niet groter is dan
'0,25·t (§5.5.1.2(11)(i)); is die groter, kies dan een ondersteuning zonder inklemming.</i>

## Effectieve hoogte — §5.5.1.2

#if ondersteuning ≤ 2
    rho_2 = 0.75', betonvloer, (5.3)'
#else
    rho_2 = 1.0', geen inklemming, (5.5)'
#end if
#hide
n_lim = if(n_rand ≡ 4; 30*t_w; 15*t_w)
n_eff = if(n_rand ≡ 2; 2; if(L_v ≥ n_lim; 2; n_rand))
#show
n_eff', gesteunde randen: een verticale rand vervalt bij L_v ≥ 15·t (n = 3) of 30·t (n = 4)'
#if n_eff ≡ 3
    #if h_w ≤ 3.5*L_v
        rho_n = rho_2/(1 + (rho_2*h_w/(3*L_v))^2)', ρ_3 (5.6)'
    #else
        rho_n = 1.5*L_v/h_w', ρ_3 (5.7)'
    #end if
#else if n_eff ≡ 4
    #if h_w ≤ 1.15*L_v
        rho_n = rho_2/(1 + (rho_2*h_w/L_v)^2)', ρ_4 (5.8)'
    #else
        rho_n = 0.5*L_v/h_w', ρ_4 (5.9)'
    #end if
#else
    rho_n = rho_2', ρ_2'
#end if
h_ef = rho_n*h_w', effectieve hoogte (5.2)'

## Effectieve dikte — §5.5.1.3

t_ef = t_w', enkelbladige wand, of het dragende blad van een spouwmuur'
'<i>Bij een spouwmuur waarvan maar één blad dragend is, geldt k<sub>tef</sub> = 0 (NB bij
'5.5.1.3(3)): t<sub>ef</sub> is dan de dikte van het dragende blad.</i>

## Slankheid — §5.5.1.4

lam = h_ef/t_ef', slankheid'
UC_max = lam/27', grens 27'
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>Slankheid voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>Slankheid voldoet niet</b></span>
#end if

e_init = h_ef/450', initiële excentriciteit (5.5.1.1(4)), voor de toets op druk'
`;
