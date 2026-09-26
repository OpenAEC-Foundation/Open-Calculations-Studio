/**
 * Oplegging op metselwerk — geconcentreerde last op een metselwerkwand volgens
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018 §6.1.3.
 *
 * Methodiek gespiegeld aan de referentieberekeningen metselwerk-oplegging-1
 * en -2 (scripts/check-opleg-metselwerk.mjs):
 *   f_k  = K·f_b^α·f_m^β                                (3.2)
 *   h_c  = h − h_k                                       (effectieve hoogte)
 *   l_efm = a_L + min(a_1; ½·h_c/tan60) + min(L_r; ½·h_c/tan60)
 *   β    = (1 + 0,3·a_1/h_c)·(1,5 − 1,1·A_b/A_ef) ≤ β_max = min(1,25+a_1/2h_c; 1,5)
 *          alleen voor steengroep 1 en A_b/A_ef ≤ 0,45; anders β = 1,0
 *   N_Rdc = β·A_b·f_d                                    (6.10)
 *   N_Ed  = N_Edc + a_L·q_Edc                            (incl. wandlast over oplegging)
 *   UC    = N_Ed / N_Rdc                                 (6.9)
 *
 * De variabelenamen komen exact overeen met OplegMetselwerkDesigner.tsx.
 *
 * K, α en β komen uit tabel NB-2 (NEN-EN 1996-1-1 NB:2018). De grens
 * f_m ≤ 2·f_b bij metselmortel past het referentieprogramma niet toe; die geldt
 * alleen in de norm-stand, en de referentiestand meldt het verschil in rood
 * (register punt 14).
 *
 * Het belaste vlak A_b: de referentie-uitwerking neemt de hele plaat a_L·a_t,
 * ook als die breder is dan de wand (referentie 2: a_t = 160 op t = 150).
 * Volgens §6.1.3(2) telt alleen het deel op de wand; de plaat ligt gecentreerd
 * onder de last (exc). Steekt de plaat uit, dan rekent de norm-stand met
 * a_L·a_t,ef en meldt de referentiestand dat de uitkomst te gunstig is
 * (register: "Metselwerk — het belaste vlak telt de hele oplegplaat").
 *
 * Buiten de referenties, volgens de norm:
 *   • De vergroting β geldt alleen voor steengroep 1 (§6.1.3(2)); bij groep 2
 *     is β = 1,0 (§6.1.3(3)). De referentiebladen gebruiken geen groep 2; of
 *     het referentieprogramma β bij groep 2 toepast, is niet vastgesteld.
 *   • Boven A_b/A_ef = 0,45, de grens van (6.11), rekent het blad zonder
 *     vergroting: de veilige kant.
 *   • Het eindoordeel telt de nevenvoorwaarden mee: e ≤ t/4 (§6.1.3(4)) en een
 *     oplegging van ten minste 90 mm (§8.1.6(1)), gemeten op het deel van de
 *     plaat dat op de wand ligt (min(a_L; a_t,ef)). Trek keurt af.
 *   • De toets op halve hoogte (§6.1.3(5), volgens §6.1.2) staat niet in dit
 *     blad; die hoort in de module Dragende metselwerkwand.
 *   • Een langsvoeg (mortelvoeg evenwijdig aan het wandvlak) geeft K maal 0,8
 *     (§3.6.1.2(6)). De factor geldt voor metselmortel; met lijmmortel meldt
 *     het blad dat de norm geen f_k geeft.
 */

export const oplegMetselwerk = `"Oplegging op metselwerk — geconcentreerde last (EN 1996-1-1 §6.1.3)

# 1. Metselwerk & materiaal

@select steensoort "Steensoort (holtepercentage → steengroep)"
  Baksteen <25% = 1
  Baksteen <55% = 2
  Kalkzandsteen <25% = 3
  Kalkzandsteen <55% = 4
  Betonsteen <25% = 5
  Betonsteen <60% = 6
  Cellenbeton <25% = 7
@end

f_b = ?', genormaliseerde druksterkte steen f_b [N/mm²] — fb-waarde (baksteen/betonsteen), CS-klasse (kalkzandsteen, CS12→12) of G-klasse (cellenbeton, G2→2)'

@select morteltype "Morteltype"
  Metselmortel = 1
  Lijmmortel = 2
@end

f_m = ?', mortelsterkte f_m [N/mm²] — M-klasse (metselmortel) of L-klasse (lijmmortel); bij lijmmortel alleen van invloed bij baksteen ≤ 25 % (β = 0,1, tabel NB-2)'

@select langsvoeg "Mortelvoeg evenwijdig aan het wandvlak (langsvoeg)"
  geen: in elke laag reikt één steen over de volle wanddikte = 1
  wel, over de hele wandlengte of een deel ervan (bijvoorbeeld een steense wand met strekkenlagen) = 2
@end

@select steencategorie "Steencategorie (γ_M, tabel NB-1)"
  Categorie I = 1
  Categorie II = 2
@end

#hide
'Steenmatrix uit tabel NB-2: [id | K_metsel | K_lijm | α_lijm | β_lijm | steengroep].
'Metselmortel heeft altijd α = 0,65 en β = 0,25. Groep 1 bij ten hoogste 25 % holten.
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0 |1; 2; 1; 2; 1; 2; 1]
groep = hlookup(steenmat; steensoort; 1; 6)
K_metsel = hlookup(steenmat; steensoort; 1; 2)
K_lijm = hlookup(steenmat; steensoort; 1; 3)
'§3.6.1.2(6): met een langsvoeg K maal 0,8.
K = if(morteltype ≡ 2; K_lijm; K_metsel)*if(langsvoeg ≡ 2; 0.8; 1)
α = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
β_exp = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
'γ_M uit tabel NB-1: categorie I 1,7 en II 2,2 bij CC2 en CC3; bij CC1 0,2 lager.
γ_base = if(steencategorie ≡ 1; 1.7; 2.2)
γ_M = γ_base - if(CC ≡ 1; 0.2; 0)
'NB bij 3.6.1.2: f_b hoogstens 75 N/mm² (metselmortel) of 50 N/mm² (lijmmortel);
'f_m hoogstens 20 N/mm², en bij metselmortel ook hoogstens 2·f_b. Die laatste
'grens past het referentieprogramma niet toe (referentie 2: fb 5 met M15 geeft
'daar f_k = 3,36 in plaats van 3,04) — register punt 14.
f_b_eff = min(f_b; if(morteltype ≡ 1; 75; 50))
f_m_eff_ref = min(f_m; 20)
f_m_eff_nb = min(f_m; 20; if(morteltype ≡ 1; 2*f_b_eff; 20))
f_m_eff = if(rekenwijze ≡ 1; f_m_eff_ref; f_m_eff_nb)
#show

#if langsvoeg ≡ 2
    K', factor K: tabel NB-2 maal 0,8 voor de langsvoeg (§3.6.1.2(6))'
    #if morteltype ≡ 2
        '<span style="color: #b45309"><b>Let op:</b> §3.6.1.2(6) geeft de factor 0,8 alleen voor metselmortel;
        'voor lijmmortel met een langsvoeg geeft de norm geen f<sub>k</sub>. Dit blad rekent ook dan met 0,8·K.</span>
    #end if
#end if
f_k = K*f_b_eff^α*f_m_eff^β_exp', karakteristieke druksterkte metselwerk (form. 3.2) [N/mm²]'
#if rekenwijze ≡ 1 and f_m_eff_ref > f_m_eff_nb
    '<span style="color: red"><b>Let op:</b> f<sub>m</sub> is groter dan 2·f<sub>b</sub>. Met de rekenwijze "de
    'referentie-uitwerking volgen" rekent het blad met f<sub>m</sub> = 'f_m_eff_ref' N/mm², volgens de NB bij 3.6.1.2
    'met 2·f<sub>b</sub> = 'f_m_eff_nb' N/mm²: f<sub>k</sub> is te hoog en de uitkomst te gunstig.</span>
#end if
f_d = f_k/γ_M', rekenwaarde druksterkte (3.1) [N/mm²]'

# 2. Geometrie

h = ?', wandhoogte [mm]'
t = ?', wanddikte [mm]'
a_L = ?', lengte oplegging (in het wandvlak) [mm]'
a_t = ?', breedte oplegging (over de wanddikte) [mm]'
h_k = ?', hoogte keep — verdiepte balk [mm]'
a_1 = ?', afstand van het wandeinde tot de nabije rand van de oplegging [mm]'
L_r = ?', wandlengte rechts van de oplegging [mm]'
exc = ?', excentriciteit van de last t.o.v. het wandhart; de oplegplaat ligt gecentreerd onder de last [mm]'

h_c = h - h_k', effectieve hoogte tot het lastniveau (onderkant keep)'
#if h_c ≤ 0
    '<span style="color: red">De keep is even hoog als of hoger dan de wand: h<sub>c</sub> ≤ 0.</span>
#end if

# 3. Belasting

N_Edc = ?', geconcentreerde last (F-last) [kN]'
q_Edc = ?', verdeelde wandlast (Q-last) [kN/m]'

# 4. Lastspreiding (60°, op ½·h_c)

#hide
tan60 = 1.7320508
reach = 0.5*h_c/tan60', horizontale spreiding per zijde [mm]'
links = min(a_1; reach)', l_efm;1'
rechts = min(L_r; reach)', l_efm;2'
#show
l_efm = a_L + links + rechts', effectieve lengte (= b_opl + l_efm;1 + l_efm;2)'

# 5. Toetsing geconcentreerde last — art. 6.1.3

#if abs(exc) + a_t/2 > t/2
    a_t_ef = max(0; min(t/2; exc + a_t/2) - max(-t/2; exc - a_t/2))', deel van de plaat dat op de wand ligt [mm]'
    A_b_ref = a_L*a_t', hele plaat [mm²]'
    A_b_nb = a_L*a_t_ef', alleen het deel op de wand, §6.1.3(2) [mm²]'
    A_b = if(rekenwijze ≡ 1; A_b_ref; A_b_nb)', belast vlak [mm²]'
    #if rekenwijze ≡ 1
        '<span style="color: red"><b>Let op:</b> de oplegplaat steekt buiten de wand. Met de rekenwijze "de
        'referentie-uitwerking volgen" telt de hele plaat mee, volgens §6.1.3(2) alleen het deel op de wand
        '(A<sub>b,nb</sub>): deze uitkomst is te gunstig.</span>
    #end if
#else
    A_b = a_L*a_t', belast vlak [mm²]'
#end if
A_ef = l_efm*t', effectief vlak [mm²]'
ratio_Ab = A_b/A_ef', verhouding belast en effectief vlak'

#if groep ≡ 2
    '<i>Groep 2-stenen: geen vergroting voor een geconcentreerde last (§6.1.3(3)).</i>
    β = 1.0', verhogingsfactor'
#else if ratio_Ab > 0.45
    '<i>A<sub>b</sub>/A<sub>ef</sub> is groter dan 0,45, de grens van (6.11): dit blad rekent
    'zonder vergroting.</i>
    β = 1.0', verhogingsfactor'
#else
    β_calc = (1 + 0.3*a_1/h_c)*(1.5 - 1.1*ratio_Ab)', (6.11)'
    β_max = min(1.25 + a_1/(2*h_c); 1.5)', bovengrens (6.11)'
    β = max(1.0; min(β_calc; β_max))', verhogingsfactor geconcentreerde last (6.11)'
#end if
N_Rdc = β*A_b*f_d/1000', opnamecapaciteit lokale oplegging [kN] (6.10)'
N_Ed = N_Edc + a_L/1000*q_Edc', rekenlast incl. wandlast over de oplegging [kN]'

#if N_Ed < 0
    '<span style="color: red"><b>Trek</b>: de last trekt aan de oplegging, en deze toets geldt alleen
    'voor druk → <b>voldoet niet</b></span>
    #hide
    UC = 1/0
    #show
#else
    UC = N_Ed/N_Rdc
    #if UC ≤ 1.0
        'UC = N<sub>Ed</sub>/N<sub>Rdc</sub> = 'UC'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span> (6.9)
    #else
        'UC = N<sub>Ed</sub>/N<sub>Rdc</sub> = 'UC'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span> (6.9)
    #end if
#end if

# 6. Nevenvoorwaarden

'<b>Detaillering — §8.1.6(1): oplegging ten minste 90 mm:</b>
#if abs(exc) + a_t/2 > t/2
    opleg_min = min(a_L; a_t_ef)', alleen het deel van de plaat op de wand [mm]'
#else
    opleg_min = min(a_L; a_t)
#end if
#if opleg_min ≥ 90
    'oplegging 'opleg_min' mm<span style="color: green"> ≥ 90 mm → <b>voldoet</b></span>
#else
    'oplegging 'opleg_min' mm<span style="color: red"> < 90 mm → <b>voldoet niet</b></span>
#end if

'<b>Excentriciteit — §6.1.3(4), e ≤ t/4:</b>
#if abs(exc) ≤ t/4
    'e = 'abs(exc)' mm<span style="color: green"> ≤ t/4 = 't/4' mm → <b>voldoet</b></span>
#else
    'e = 'abs(exc)' mm<span style="color: red"> > t/4 = 't/4' mm → <b>voldoet niet</b></span>
#end if

#if groep ≡ 2
    '<b>§6.1.3(6):</b> de last hoort op groep 1-stenen of ander massief materiaal te liggen, met
    'een spreiding van 60° tot de onderkant daarvan. Bij groep 2-stenen dus een massief oplegblok
    'of een massieve laag onder de oplegging.
#end if

'<i>§6.1.3(5): toets de wand daarnaast op halve hoogte volgens §6.1.2, met de overige verticale lasten.</i>

# 7. Samenvatting

#if UC ≤ 1.0 and opleg_min ≥ 90 and abs(exc) ≤ t/4 and h_c > 0
    '<b>Maatgevende UC = 'UC'</b><span style="color: green"> ≤ 1,0 → <b>Oplegging voldoet</b></span>
#else if UC ≤ 1.0
    '<b>Maatgevende UC = 'UC'</b> ≤ 1,0, maar een nevenvoorwaarde is niet vervuld<span style="color: red"> → <b>Oplegging voldoet niet</b></span>
#else
    '<b>Maatgevende UC = 'UC'</b><span style="color: red"> > 1,0 → <b>Oplegging voldoet niet</b></span>
#end if
`;
