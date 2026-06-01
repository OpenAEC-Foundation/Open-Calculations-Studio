/**
 * Toetsing van een geconcentreerde belasting (oplegging) op een metselwerkwand,
 * conform NEN-EN 1996-1-1:2006+A1:2013 + NB (Nationale Bijlage).
 *
 * Hoofdartikel: §6.1.3 — Geconcentreerde belastingen onder opleggingen
 *
 * Toepassing: stalen ligger / houten balk / betonlatei die rust op een
 *   metselwerkwand. De kracht onder de oplegging concentreert zich lokaal,
 *   maar verspreidt zich op halve hoogte van de wand-boven-de-oplegging.
 *   De karakteristieke druksterkte f_k mag verhoogd worden met factor β
 *   wanneer de oplegging op afstand van de wandeinden zit én A_b klein is
 *   ten opzichte van het verspreide oppervlak A_ef.
 *
 * Sheet-structuur:
 *   1. Materiaal — steensoort + mortel → f_k (formule 3.2/3.3) → f_d
 *   2. Geometrie wand + oplegging — t, h_c, a, L_b
 *   3. β-factor §6.1.3(3) — verhoging met begrenzingen
 *   4. Capaciteit + UC — N_Rdc = β·A_b·f_d
 *   5. Voorwaardencheck — randvoorwaarden uit §6.1.3(1) en (4)
 *   6. SVG-schema van de oplegging
 */

export const opleggingMetselwerk = `"Oplegging op metselwerk — toetsing EN 1996-1-1 §6.1.3

'<i>Geconcentreerde belasting op een metselwerkwand (stalen ligger, houten
'balk of betonlatei die op de wand rust). De kracht onder de oplegging mag
'lokaal verhoogd worden met factor β t.o.v. de gewone druksterkte, omdat
'de last zich op halve hoogte boven de oplegging verspreid heeft.</i>

# 1. Materiaal

@select steentype "Steentype (tabel 3.3 NB)"
  Baksteen groep 1 (massief) = 1
  Baksteen groep 2 (vertikaal geperforeerd) = 2
  Kalkzandsteen (KZS) = 3
  Cellenbeton = 4
  Betonsteen (lichtbeton) = 5
@end

@select morteltype "Morteltype"
  Mortel voor algemeen gebruik (M5 / M10) = 1
  Dunbed-/lijmmortel = 2
@end

f_b = ?*(N/mm^2)', genormaliseerde druksterkte steen f_b — EN 772-1 (typ. 10–25 N/mm²)'

#if morteltype ≡ 1
    f_m = ?*(N/mm^2)', mortelsterkte f_m (M5 ≈ 5; M10 ≈ 10 N/mm²)'
#end if

#hide
'Factor K + exponenten uit tabel 3.3 NB (formule 3.2/3.3 EN 1996-1-1)
#if steentype ≡ 1
    #if morteltype ≡ 1
        K = 0.55
        α_K = 0.7
        β_K = 0.3
    #else
        K = 0.75
        α_K = 0.85
        β_K = 0
    #end if
#else if steentype ≡ 2
    #if morteltype ≡ 1
        K = 0.45
        α_K = 0.7
        β_K = 0.3
    #else
        K = 0.70
        α_K = 0.7
        β_K = 0
    #end if
#else if steentype ≡ 3
    #if morteltype ≡ 1
        K = 0.55
        α_K = 0.7
        β_K = 0.3
    #else
        K = 0.80
        α_K = 0.85
        β_K = 0
    #end if
#else if steentype ≡ 4
    #if morteltype ≡ 1
        K = 0.55
        α_K = 0.7
        β_K = 0.3
    #else
        K = 0.80
        α_K = 0.85
        β_K = 0
    #end if
#else
    #if morteltype ≡ 1
        K = 0.55
        α_K = 0.7
        β_K = 0.3
    #else
        K = 0.80
        α_K = 0.85
        β_K = 0
    #end if
#end if
#show

'<i>Exponenten formule 3.2/3.3 (Tabel 3.3 NB):</i> K = 'K'    α<sub>K</sub> = 'α_K'    β<sub>K</sub> = 'β_K

#if morteltype ≡ 1
    'Karakteristieke druksterkte (formule 3.2):
    f_k = K*(f_b/(1 N/mm^2))^α_K*(f_m/(1 N/mm^2))^β_K*N/mm^2
#else
    'Karakteristieke druksterkte (formule 3.3, lijmmortel):
    f_k = K*(f_b/(1 N/mm^2))^α_K*N/mm^2
#end if

@select categorie "Uitvoeringscategorie (tabel 2.3 NB)"
  Categorie I (gamma_M = 1.7) = 17
  Categorie II (gamma_M = 2.0) = 20
  Categorie III (gamma_M = 2.2) = 22
@end

γ_M = categorie/10

'Rekenwaarde druksterkte:
f_d = f_k/γ_M

# 2. Geometrie wand + oplegging

t = ?*(mm)', wanddikte t (mm)'
h_c = ?*(mm)', hoogte van wand BOVEN de oplegging tot bovenste belastingverdeling (mm)'
a_1 = ?*(mm)', afstand vanaf einde wand tot dichtstbijzijnde rand oplegging (mm) — 0 = oplegging aan wandeinde'

L_b = ?*(mm)', opleglengte langs de wand (mm)'
b_opl = ?*(mm)', oplegbreedte loodrecht op de wand (mm) — vaak gelijk aan t'

'<b>Belast oppervlak onder oplegging:</b>
A_b = L_b*b_opl

'<b>Effectief verspreid oppervlak op halve hoogte boven oplegging:</b>
'Vereenvoudigd: L_efm = L_b + h_c (last verspreidt zich onder 45°,
'maar voor h_c boven oplegging slechts halve hoogte → L_b + h_c)
'Begrensd door wandlengte (hier conservatief niet begrensd).
L_efm = L_b + h_c
A_ef = L_efm*t

'<b>Verhoudingen:</b>
a_h = a_1/h_c', verhouding a/h_c (excentriciteit)'
A_ratio = A_b/A_ef', verhouding A_b/A_ef'

# 3. β-factor §6.1.3(3)

'<i>β verhoogt de toelaatbare druk onder geconcentreerde opleggingen.
'Geldigheid (§6.1.3(1)+(4)):
'  • excentriciteit oplegging ≤ t/4
'  • a_1/h_c ≤ 1.0 (anders gewone drukcheck §6.1.2)
'  • klein A_b/A_ef → grootste verhoging</i>

'Basisformule (6.10):
β_calc = (1 + 0.3*a_h)*(1.5 - 1.1*A_ratio)

'Bovengrens 1 (formule 6.10): β ≤ 1.25 + a_1/(2·h_c)
β_lim1 = 1.25 + a_h/2

'Bovengrens 2 (algemeen): β ≤ 1.5
β_lim2 = 1.5

'Bovengrens 3: 1.5·A_ef/A_b (geometrisch onmogelijk meer)
β_lim3 = if(A_ratio > 0; 1.5/A_ratio; 1.5)

'Ondergrens: β ≥ 1.0 (geen verhoging onder ongunstige condities)
β_min = 1.0

'Maatgevende β: minimum van alle bovengrenzen, maar ≥ 1.0
β = max(β_min; min(β_calc; min(β_lim1; min(β_lim2; β_lim3))))

'β<sub>calc</sub> = (1 + 0.3·a/h_c)·(1.5 − 1.1·A_b/A_ef) = 'β_calc
'β ≤ 1.25 + a/(2·h_c) = 'β_lim1
'β ≤ 1.5 (absolute bovengrens) = 'β_lim2
'β ≤ 1.5·A_ef/A_b (geometrische bovengrens) = 'β_lim3
'<b>Maatgevende β = 'β'</b>

# 4. Capaciteit + unity check

N_Edc = ?*(kN)', geconcentreerde belasting onder oplegging N_Edc (kN)'

'<i>Rekenwaarde capaciteit (formule 6.9):</i>
N_Rdc = β*A_b*f_d

UC = N_Edc/N_Rdc

'σ<sub>onder oplegging</sub> = N<sub>Edc</sub>/A<sub>b</sub> = 'N_Edc/A_b
'β·f<sub>d</sub> = 'β*f_d' (toelaatbare drukspanning lokaal)
'N<sub>Rdc</sub> = β·A<sub>b</sub>·f<sub>d</sub> = 'N_Rdc

#if UC ≤ 1.0
    'UC = N<sub>Edc</sub>/N<sub>Rdc</sub> = 'UC'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC = N<sub>Edc</sub>/N<sub>Rdc</sub> = 'UC'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 5. Voorwaardencheck §6.1.3(1)

'<i>Bij overschrijding van deze voorwaarden geldt §6.1.3 NIET en moet de
'oplegging als gewone wandbelasting (§6.1.2) getoetst worden — meestal
'met een conservatievere uitkomst.</i>

'<b>5.1 Verhouding a_1/h_c</b>
#if a_h ≤ 1.0
    'a<sub>1</sub>/h<sub>c</sub> = 'a_h'<span style="color:green"> ≤ 1.0 → toepasbaar</span>
#else
    'a<sub>1</sub>/h<sub>c</sub> = 'a_h'<span style="color:red"> > 1.0 → §6.1.3 niet toepasbaar, gebruik §6.1.2</span>
#end if

'<b>5.2 Verhouding A_b/A_ef</b>
#if A_ratio ≤ 0.45
    'A<sub>b</sub>/A<sub>ef</sub> = 'A_ratio'<span style="color:green"> ≤ 0.45 → gunstig (grote verhoging mogelijk)</span>
#else if A_ratio ≤ 0.90
    'A<sub>b</sub>/A<sub>ef</sub> = 'A_ratio' (tussen 0.45 en 0.90 — toepasbaar)
#else
    'A<sub>b</sub>/A<sub>ef</sub> = 'A_ratio'<span style="color:red"> > 0.90 → β ≈ 1.0, geen voordeel</span>
#end if

'<b>5.3 Maximum A_b ≤ 2·t² (§6.1.3(1))</b>
A_b_max = 2*t^2
#if A_b ≤ A_b_max
    'A<sub>b</sub> = 'A_b' ≤ 2·t² = 'A_b_max'<span style="color:green"> → voldoet</span>
#else
    'A<sub>b</sub> = 'A_b' > 2·t² = 'A_b_max'<span style="color:red"> → A_b te groot, gebruik §6.1.2 i.p.v. §6.1.3</span>
#end if

# 6. Schema oplegging

@svg
<svg width="540" height="380" viewBox="0 0 540 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="brick" patternUnits="userSpaceOnUse" width="40" height="20">
      <rect width="40" height="20" fill="#d4a574"/>
      <line x1="0" y1="0" x2="40" y2="0" stroke="#8b6914" stroke-width="0.6"/>
      <line x1="0" y1="10" x2="40" y2="10" stroke="#8b6914" stroke-width="0.6"/>
      <line x1="20" y1="0" x2="20" y2="10" stroke="#8b6914" stroke-width="0.6"/>
      <line x1="0" y1="10" x2="0" y2="20" stroke="#8b6914" stroke-width="0.6"/>
      <line x1="40" y1="10" x2="40" y2="20" stroke="#8b6914" stroke-width="0.6"/>
    </pattern>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#a3a3a3" stroke-width="0.6"/>
    </pattern>
    <marker id="arrDn" markerWidth="10" markerHeight="10" refX="5" refY="9" orient="auto">
      <polygon points="0 0, 10 0, 5 9" fill="#dc2626"/>
    </marker>
    <marker id="dimL" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
      <polygon points="0 4, 8 0, 8 8" fill="#6b7280"/>
    </marker>
    <marker id="dimR" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
      <polygon points="8 4, 0 0, 0 8" fill="#6b7280"/>
    </marker>
  </defs>

  <!-- Wand metselwerk (vooraanzicht) -->
  <rect x="60" y="60" width="420" height="240" fill="url(#brick)" stroke="#5b4a2b" stroke-width="1.5"/>

  <!-- Last-verspreidings-driehoek (45°, op halve hoogte → trapezium) -->
  <polygon points="180,240 320,240 350,170 150,170"
           fill="rgba(220,38,38,0.10)" stroke="#dc2626"
           stroke-width="1" stroke-dasharray="4 3"/>

  <!-- Oplegging (stalen plaat / latei) -->
  <rect x="180" y="232" width="140" height="10" fill="#374151" stroke="#1f2937" stroke-width="1"/>

  <!-- Steunpunt boven oplegging — schematisch ligger-uiteinde -->
  <rect x="200" y="210" width="100" height="22" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <text x="250" y="225" text-anchor="middle" font-size="10" fill="#1f2937" font-weight="bold">ligger</text>

  <!-- N_Edc pijl naar beneden -->
  <line x1="250" y1="170" x2="250" y2="208" stroke="#dc2626" stroke-width="2.5" marker-end="url(#arrDn)"/>
  <text x="250" y="160" text-anchor="middle" font-size="12" fill="#dc2626" font-weight="bold">N_Edc = {{N_Edc}} kN</text>

  <!-- Maatlijnen onder de wand -->
  <!-- a_1 -->
  <line x1="60" y1="320" x2="180" y2="320" stroke="#6b7280" stroke-width="0.8" marker-start="url(#dimL)" marker-end="url(#dimR)"/>
  <line x1="60" y1="305" x2="60" y2="335" stroke="#6b7280" stroke-width="0.6"/>
  <line x1="180" y1="305" x2="180" y2="335" stroke="#6b7280" stroke-width="0.6"/>
  <text x="120" y="335" text-anchor="middle" font-size="11" fill="#374151">a₁ = {{a_1}} mm</text>

  <!-- L_b -->
  <line x1="180" y1="320" x2="320" y2="320" stroke="#6b7280" stroke-width="0.8" marker-start="url(#dimL)" marker-end="url(#dimR)"/>
  <line x1="320" y1="305" x2="320" y2="335" stroke="#6b7280" stroke-width="0.6"/>
  <text x="250" y="335" text-anchor="middle" font-size="11" fill="#374151">L_b = {{L_b}} mm</text>

  <!-- Maatlijn rechts: h_c -->
  <line x1="500" y1="60" x2="500" y2="237" stroke="#6b7280" stroke-width="0.8" marker-start="url(#dimL)" marker-end="url(#dimR)" transform="rotate(0)"/>
  <text x="510" y="150" font-size="11" fill="#374151" transform="rotate(90,510,150)">h_c = {{h_c}} mm</text>

  <!-- Wand-label -->
  <text x="120" y="100" font-size="11" fill="#5b4a2b" font-weight="bold">metselwerk wand</text>
  <text x="120" y="115" font-size="10" fill="#5b4a2b">t = {{t}} mm</text>

  <!-- Resultaten rechts -->
  <text x="380" y="85" font-size="12" fill="#1e40af" font-weight="bold">EN 1996-1-1 §6.1.3</text>
  <text x="380" y="102" font-size="10" fill="#374151">f_k = {{f_k}} N/mm²</text>
  <text x="380" y="116" font-size="10" fill="#374151">f_d = {{f_d}} N/mm²</text>
  <text x="380" y="130" font-size="10" fill="#374151">A_b = {{A_b}} mm²</text>
  <text x="380" y="144" font-size="10" fill="#374151">A_ef = {{A_ef}} mm²</text>
  <text x="380" y="160" font-size="11" fill="#1e40af" font-weight="bold">β = {{β}}</text>
  <text x="380" y="178" font-size="10" fill="#374151">N_Rdc = {{N_Rdc}}</text>

  <!-- UC onderaan -->
  <text x="270" y="368" text-anchor="middle" font-size="13" fill="#059669" font-weight="bold">UC = {{UC}}</text>
</svg>
@end

'<hr/>
'<i>Toelichting verspreiding & vereenvoudigingen:
'<ul>
'<li>Verspreidingshoek 45° wordt expliciet aangenomen in §6.1.3, op
'halve hoogte van de wand boven de oplegging. L<sub>efm</sub> = L<sub>b</sub> + h<sub>c</sub>
'is vereenvoudigd voor enkele oplegging midden in de wand; bij meerdere
'opleggingen of een rand-oplegging worden de bijdragen begrensd door
'de halve wandlengte resp. tot het wandeinde.</li>
'<li>Eccentriciteit van de oplegging (M/N) niet in deze sheet — §6.1.3
'vereist e ≤ t/4. Bij grotere e_top moet de combinatie (§6.1.2 +
'verhoging) opnieuw worden uitgewerkt.</li>
'<li>De wand zelf (drukcheck §6.1.2, slankheid §5.5.1.4) moet separaat
'worden getoetst — deze sheet behandelt uitsluitend de lokale
'oplegcontrole.</li>
'<li>γ<sub>M</sub> volgt uitvoeringscategorie I/II/III NB tabel 2.3.</li>
'</ul></i>
`;
