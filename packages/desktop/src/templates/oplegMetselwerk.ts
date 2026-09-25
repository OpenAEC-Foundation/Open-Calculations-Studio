/**
 * Oplegging op metselwerk — geconcentreerde last op een metselwerkwand volgens
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018 §6.1.3.
 *
 * Methodiek exact gespiegeld aan de referentieberekening
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
 * K, α en β komen uit tabel NB-2 (NEN-EN 1996-1-1 NB:2018). De grens
 * f_m ≤ 2·f_b bij metselmortel past het referentieprogramma niet toe; die geldt
 * alleen in de norm-stand (register punt 14).
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

@select steencategorie "Steencategorie (γ_M, tabel NB-1)"
  Categorie I = 1
  Categorie II = 2
@end

#hide
'Steenmatrix uit tabel NB-2: [id | K_metsel | K_lijm | α_lijm | β_lijm].
'Metselmortel heeft altijd α = 0,65 en β = 0,25.
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0]
K_metsel = hlookup(steenmat; steensoort; 1; 2)
K_lijm = hlookup(steenmat; steensoort; 1; 3)
K = if(morteltype ≡ 2; K_lijm; K_metsel)
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
f_m_eff_XC = min(f_m; 20)
f_m_eff_nb = min(f_m; 20; if(morteltype ≡ 1; 2*f_b_eff; 20))
f_m_eff = if(rekenwijze ≡ 1; f_m_eff_XC; f_m_eff_nb)
#show

f_k = K*f_b_eff^α*f_m_eff^β_exp', karakteristieke druksterkte metselwerk (form. 3.2) [N/mm²]'
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
'<i>Aandachtspunten / open punten (status ten opzichte van de referentieberekeningen):
'<ul>
'<li><b>K, α en β</b> uit tabel NB-2: metselmortel altijd α = 0,65 en β = 0,25 met K = 0,6
'(groep 1) of 0,5 (groep 2); lijmmortel per steensoort. Tegen een referentie getoetst:
'kalkzandsteen, cellenbeton en baksteen met metselmortel, cellenbeton met lijmmortel.</li>
'<li><b>γ<sub>M</sub></b> uit tabel NB-1: categorie I 1,7 en II 2,2 bij CC2 en CC3, bij CC1 0,2
'lager. Een categorie III kennen de stenennormen niet.</li>
'<li><b>f<sub>m</sub> ≤ 2·f<sub>b</sub></b> bij metselmortel (NB bij 3.6.1.2) past het
'referentieprogramma niet toe; in de norm-stand wel (register punt 14).</li>
'<li><b>N<sub>Ed</sub>:</b> de wandlast draagt mee via N<sub>Ed</sub> = N<sub>Edc</sub> + a<sub>L</sub>·q<sub>Edc</sub>.</li>
'<li><b>l<sub>efm</sub>:</b> spreiding 60° over ½·h<sub>c</sub> met h<sub>c</sub> = h − h<sub>k</sub>,
'begrensd door wandeinde (a<sub>1</sub>, mag 0 zijn) en beschikbare wandlengte.</li>
'<li><b>art. 8.1.6:</b> de referentie-uitwerking toont één oplegmaat (oriëntatie-afhankelijk); hier de
'kleinste maat min(a<sub>L</sub>; a<sub>t</sub>) ≥ 90 mm getoetst (zelfde conclusie).</li>
'</ul></i>
`;
