/**
 * Oplegging op metselwerk — geconcentreerde last op een metselwerkwand volgens
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018 §6.1.3.
 *
 * Methodiek exact gespiegeld aan de de referentie-uitwerking-referentieberekening
 * (3BM Bouwtechniek, document1.pdf, de referentie-uitwerking 2027.3.02):
 *   f_k  = K·f_b^α·f_m^β                                (3.2)
 *   h_c  = h − h_k                                       (effectieve hoogte)
 *   l_efm = a_L + min(a_1; ½·h_c/tan60) + min(L_r; ½·h_c/tan60)
 *   β    = (1 + 0,3·a_1/h_c)·(1,5 − 1,1·A_b/A_ef) ≤ β_max = min(1,25+a_1/2h_c; 1,5)
 *   N_Rdc = β·A_b·f_d                                    (6.10)
 *   N_Ed  = N_Edc + a_L·q_Edc                            (incl. wandlast over oplegging)
 *   UC    = N_Ed / N_Rdc                                 (6.9)
 *
 * De variabelenamen komen exact overeen met OplegMetselwerkDesigner.tsx.
 *
 * ⚠ Openstaand (zie noten onderaan): de factoren K/α/β zijn alleen voor
 * cellenbeton geverifieerd tegen de referentie; de overige steensoorten staan
 * op standaard EN-waarden (0,7/0,3) en moeten nog tegen NB:2018 worden getoetst.
 */

export const oplegMetselwerk = `"Oplegging op metselwerk — geconcentreerde last (EN 1996-1-1 §6.1.3)

'<i>Toetsing van een geconcentreerde oplegging (liggereinde/latei in een keep) op
'een ongewapende metselwerkwand. De last spreidt onder 60° over de effectieve
'hoogte h<sub>c</sub> = h − h<sub>k</sub>; op halve hoogte ontstaat de effectieve
'lengte l<sub>efm</sub>. Methodiek conform NEN-EN 1996-1-1+NB §6.1.3 (de referentie-uitwerking).</i>

# 1. Metselwerk & materiaal

@select overspanning "Overspanningrichting"
  Loodrecht = 1
  Evenwijdig = 2
@end

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

f_m = ?', mortelsterkte f_m [N/mm²] — M-klasse (metselmortel) of L-klasse (lijmmortel); bij lijmmortel niet van invloed op f_k (β=0)'

@select steencategorie "Steencategorie / uitvoeringsklasse (basis γ_M)"
  Categorie I = 1
  Categorie II = 2
  Categorie III = 3
@end

#hide
'Steenmatrix: [id | K_metsel | K_lijm]. f_k = K·f_b^α·f_m^β.
'Metselmortel: α=0,65 · β=0,25 · K = 0,6 (groep 1 <25%) / 0,5 (groep 2 <55%/<60%).
'Lijmmortel:   α=0,85 · β=0   · K per steensoort (EN-tabel; cellenbeton<25% = 0,8 geverifieerd).
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.75; 0.70; 0.80; 0.70; 0.80; 0.70; 0.80]
K_metsel = hlookup(steenmat; steensoort; 1; 2)
K_lijm = hlookup(steenmat; steensoort; 1; 3)
K = if(morteltype ≡ 2; K_lijm; K_metsel)
α = if(morteltype ≡ 2; 0.85; 0.65)
β_exp = if(morteltype ≡ 2; 0; 0.25)
'γ_M = basis(categorie), alleen CC1 verlaagt met 0,2 (CC2 = CC3 = basis). Gekalibreerd:
'Cat I → CC1=1,5 · CC2=1,7 · CC3=1,7; Cat II → CC1=2,0. base: I=1,7 · II=2,2 · III=2,7(geëxtrapoleerd).
γ_base = if(steencategorie ≡ 1; 1.7; if(steencategorie ≡ 2; 2.2; 2.7))
γ_M = γ_base - if(CC ≡ 1; 0.2; 0)
'Referentie past de bovengrens f_m ≤ 2·f_b NIET toe (alleen ≤ 20 N/mm²).
f_m_eff = min(f_m; 20)
#show

f_k = K*f_b^α*f_m_eff^β_exp', karakteristieke druksterkte metselwerk (form. 3.2) [N/mm²]'
f_k
f_d = f_k/γ_M', rekenwaarde druksterkte (3.1) [N/mm²]'
f_d

# 2. Geometrie

h = ?', wandhoogte [mm]'
t = ?', wanddikte [mm]'
a_L = ?', lengte oplegging (in het wandvlak) [mm]'
a_t = ?', breedte oplegging (over de wanddikte) [mm]'
h_k = ?', hoogte keep — verdiepte balk [mm]'
a_1 = ?', afstand van het wandeinde tot de nabije rand van de oplegging [mm]'
L_r = ?', wandlengte rechts van de oplegging [mm]'
exc = ?', excentriciteit van de last t.o.v. het wandhart [mm]'

h_c = h - h_k', effectieve hoogte tot het lastniveau (onderkant keep)'
h_c

# 3. Belasting

N_Edc = ?', geconcentreerde last (F-last) [kN]'
q_Edc = ?', verdeelde wandlast (Q-last) [kN/m]'

# 4. Lastspreiding (60°, op ½·h_c)

'<i>De last spreidt onder 60° vanaf de oplegplaat (onderkant keep). De effectieve
'lengte l<sub>efm</sub> wordt op halve effectieve hoogte bepaald en begrensd door
'het wandeinde (a<sub>1</sub>) en de beschikbare wandlengte (L<sub>r</sub>).</i>

#hide
tan60 = 1.7320508
reach = 0.5*h_c/tan60', horizontale spreiding per zijde [mm]'
links = min(a_1; reach)', l_efm;1'
rechts = min(L_r; reach)', l_efm;2'
#show
l_efm = a_L + links + rechts', effectieve lengte (= b_opl + l_efm;1 + l_efm;2)'
l_efm

# 5. Toetsing geconcentreerde last — art. 6.1.3

A_b = a_L*a_t', belaste (opleg)vlak [mm²]'
A_ef = l_efm*t', effectief vlak [mm²]'
A_b
A_ef

#hide
ratio_Ab = A_b/A_ef
β_calc = (1 + 0.3*a_1/h_c)*(1.5 - 1.1*ratio_Ab)
β_max = min(1.25 + a_1/(2*h_c); 1.5)
#show
β = max(1.0; min(β_calc; β_max))', verhogingsfactor geconcentreerde last (6.11)'
β
N_Rdc = β*A_b*f_d/1000', opnamecapaciteit lokale oplegging [kN] (6.10)'
N_Rdc
N_Ed = N_Edc + a_L/1000*q_Edc', rekenlast incl. wandlast over de oplegging [kN]'
N_Ed

UC = N_Ed/N_Rdc
#if UC ≤ 1.0
    'UC = N<sub>Ed</sub>/N<sub>Rdc</sub> = 'UC'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span> (6.9)
#else
    'UC = N<sub>Ed</sub>/N<sub>Rdc</sub> = 'UC'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span> (6.9)
#end if

# 6. Nevenvoorwaarden

'<b>Geldigheid methode 6.1.3 — verhouding vlakken:</b>
ratio_Ab = A_b/A_ef
#if ratio_Ab ≤ 0.45
    'A<sub>b</sub>/A<sub>ef</sub> = 'ratio_Ab'<span style="color: green"> ≤ 0,45 → <b>voldoet</b></span>
#else
    'A<sub>b</sub>/A<sub>ef</sub> = 'ratio_Ab'<span style="color: red"> > 0,45 → methode niet geldig</span>
#end if

'<b>Detaillering — art. 8.1.6(1): minimale oplegmaat ≥ 90 mm:</b>
opleg_min = min(a_L; a_t)
#if opleg_min ≥ 90
    'min(a<sub>L</sub>; a<sub>t</sub>) = 'opleg_min' mm<span style="color: green"> ≥ 90 mm → <b>voldoet</b></span>
#else
    'min(a<sub>L</sub>; a<sub>t</sub>) = 'opleg_min' mm<span style="color: red"> < 90 mm → <b>voldoet niet</b></span>
#end if

'<b>Excentriciteit — voorwaarde e ≤ t/4:</b>
#if abs(exc) ≤ t/4
    'e = 'abs(exc)' mm<span style="color: green"> ≤ t/4 = 't/4' mm → <b>voldoet</b></span>
#else
    'e = 'abs(exc)' mm<span style="color: red"> > t/4 = 't/4' mm → buiten toepassingsgebied</span>
#end if

# 7. Samenvatting

#if UC ≤ 1.0
    '<b>UC = 'UC'</b><span style="color: green"> ≤ 1,0 → <b>Oplegging voldoet</b></span>
#else
    '<b>UC = 'UC'</b><span style="color: red"> > 1,0 → <b>Oplegging voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten / open punten (status t.o.v. de referentie-uitwerking-referenties):
'<ul>
'<li><b>Metselmortel (M-klasse):</b> f_k = K·f_b<sup>0,65</sup>·f_m<sup>0,25</sup>; K per steengroep
'(groep 1 &lt;25% = 0,6 · groep 2 &lt;55%/&lt;60% = 0,5). Gecheckt: KZS&lt;25%, cellenbeton&lt;25% (K=0,6)
'en baksteen&lt;55% (K=0,5). Baksteen&lt;25%, betonsteen en KZS&lt;55% volgen het groep-patroon.</li>
'<li><b>Lijmmortel (L-klasse):</b> f_k = K·f_b<sup>0,85</sup> (β=0, f_m valt weg); K per steensoort
'(EN-tabel). Gecheckt: cellenbeton&lt;25% (K=0,8). Overige lijm-K's nog te bevestigen.</li>
'<li><b>γ_M — afhankelijk van categorie én CC:</b> basiswaarde per categorie (I=1,7 · II=2,2 ·
'III=2,7), waarbij alleen CC1 met 0,2 verlaagt (CC2 = CC3 = basis). Geverifieerd: Cat I CC1=1,5,
'CC2=1,7, CC3=1,7 en Cat II CC1=2,0. Cat III (basis 2,7) en Cat II CC2/CC3 geëxtrapoleerd.</li>
'<li><b>f<sub>m</sub>-bovengrens:</b> de referentie past de EN-eis f<sub>m</sub> ≤ 2·f<sub>b</sub>
'(§3.6.1.2) NIET toe (alleen f<sub>m</sub> ≤ 20). Hier idem om de referentie te reproduceren —
'<b>afwijkend van de norm</b>; controleer of dit gewenst is.</li>
'<li><b>N<sub>Ed</sub>:</b> de wandlast draagt mee via N<sub>Ed</sub> = N<sub>Edc</sub> + a<sub>L</sub>·q<sub>Edc</sub>.</li>
'<li><b>l<sub>efm</sub>:</b> spreiding 60° over ½·h<sub>c</sub> met h<sub>c</sub> = h − h<sub>k</sub>,
'begrensd door wandeinde (a<sub>1</sub>, mag 0 zijn) en beschikbare wandlengte.</li>
'<li><b>art. 8.1.6:</b> de referentie-uitwerking toont één oplegmaat (oriëntatie-afhankelijk); hier de
'kleinste maat min(a<sub>L</sub>; a<sub>t</sub>) ≥ 90 mm getoetst (zelfde conclusie).</li>
'</ul></i>
`;
