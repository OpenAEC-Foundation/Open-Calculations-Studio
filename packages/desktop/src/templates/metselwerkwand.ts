/**
 * Dragende (ongewapende) metselwerkwand op druk volgens
 * NEN-EN 1996-1-1:2006+A1:2013+NB:2018 §5.5.1 + §6.1.2 + bijlage G.
 *
 * Gecalibreerd op 14 referentieberekeningen, alle exact gereproduceerd. Basis:
 * ℓ = 1000, h = 2800, t = 120 mm, N_Ed = N_Ed,max = 200 kN, kalkzandsteen <25%
 * CS12 + M15, categorie I, CC2, n = 2.
 *   1  alle M = 0                    → Φ_i = 0,900  Φ_m = 0,605  UC = 0,79
 *                                      + min.exc.: Φ_m2 = 0,360 → 200/151,07 = 1,32
 *   2  M_1Ed = 5                     → Φ_i,t = 0,506  N_Rd,t = 211,91  UC = 0,94
 *   3  M_mEd = 5                     → e_mk = 29,7  Φ_m = 0,201  UC = 2,37
 *   4  N=300 N_max=150 M=7/5/3 n=3   → n → 2 (L_v ≥ 15t)  Φ = 0,533/0,756/0,334  UC = 2,14
 *   5  M_mEd = 1                     → e_m = 9,7  Φ_m = 0,539  N_Rd,m = 225,77  UC = 0,89
 *   6  N_Ed = 30                     → lage-belastingstak, e_cap = 55,7  UC = 0,12
 *   7  n = 4, L_v = 2000             → ρ_4 = 0,36  h_ef = 1000  Φ_m = 0,839  UC = 0,57
 *                                      + min.exc. met ρ_4: h_ef2 = 1000 → UC = 0,62
 *   8  baksteen<25% fb18 + lijm L12,5→ f_k = 9,00  f_d = 5,29  UC = 0,52 / 0,87
 *   9  CC3 + M5                      → f_k = 4,51  γ_M = 1,70  UC = 1,04
 *  10  M = 10/5/7                     → e_t = 50 > 0,25t → ρ_2 = 1,00  h_ef = 2800
 *                                      Φ = 0,063/0,313/0,075  N_Rd = 26,39  UC = 7,58
 *  11-14 dezelfde wand met elk van de vier ondersteuningsopties → alle vier
 *                                      identiek aan set 10 (de e_t-overschrijving
 *                                      wint, dus ρ_2 = 1,00 ongeacht de optie)
 *
 * Uit de referentiebladen afgeleide keuzes van de referentie-uitwerking:
 *   • E = 700·f_k (NB bij 3.7.2(2)) — bevestigd op f_k = 5,94 / 9,00 / 4,51.
 *   • e_k = 0 zolang λ ≤ λ_c = 27 (NB bij 6.1.2.2(2)).
 *   • K, α en β uit tabel NB-2: metselmortel altijd α = 0,65 / β = 0,25;
 *     lijmmortel per steensoort. Getoetst: lijmmortel op baksteen (set 8) en op
 *     cellenbeton (oplegmodule).
 *   • f_b ≤ 75 (metselmortel) / 50 (lijmmortel) en f_m ≤ 20 (NB bij 3.6.1.2);
 *     f_m ≤ 2·f_b bij metselmortel alleen in de norm-stand (register punt 14).
 *     De referentiestand meldt het verschil in rood.
 *   • γ_M volgens tabel NB-1: gelijk voor CC2 en CC3 (set 9); CC1 0,2 lager.
 *   • Een verticale randsteuning vervalt bij L_v ≥ 15·t (n = 3, set 4) resp.
 *     L_v ≥ 30·t (n = 4, set 7 blijft n = 4 bij L_v = 2000 < 3600). L_v is de
 *     lengte l uit (5.6)-(5.9): van de vrije rand tot de steun bij n = 3,
 *     tussen de steunen bij n = 4.
 *   • ρ_2 = 0,75 vervalt zodra de excentriciteit aan de kop e_t = |M_1Ed|/|N_Ed|
 *     groter is dan 0,25·t (§5.5.1.2(11)(i), set 10: 50 > 30 mm → ρ_2 = 1,00).
 *     De regel kijkt alléén naar de kop, niet naar M_2Ed. De ρ_2 per
 *     ondersteuningsoptie is daardoor niet tegen een referentie vastgesteld
 *     (sets 11-14 hebben allemaal e_t > 0,25·t).
 *   • Lage-belastingstak N_Ed/(ℓ·t·f_d) ≤ 0,1 (set 6): e_i wordt begrensd op
 *     t/2 − N_Ed/(2·ℓ·f_d) en het afgekapte deel komt als ΔM = (e_i,f − e_i)·N_Ed
 *     terug in M_Ed,mc = |M_mEd| + (ΔM_t + ΔM_b)/2. De absolute waarde houdt het
 *     restmoment ongunstig, ongeacht het teken van M_mEd; de rest van het blad
 *     rekent ook tekenloos.
 *   • De minimale-excentriciteitstoets rekent met ρ_2 = 1,00 maar behoudt de
 *     verticale randsteuning (set 7: h_ef2 = ρ_4·h = 1000, niet h = 2800), en
 *     wordt overgeslagen zodra de eerste toets al niet voldoet (sets 3, 4, 9).
 *     De maatgevende UC kan dan te laag uitvallen (set 9: 1,04 in plaats van
 *     1,74); het oordeel blijft "voldoet niet". De norm-stand voert de toets
 *     altijd uit, behalve bij trek (register: "Metselwerkwand — de
 *     minimale-excentriciteitstoets vervalt na een eerste afkeur").
 *     Loopt de eerste toets wél, dan draait deze ook als e_m groter is dan
 *     e_m2: dat is niet tegen een referentie vastgesteld, maar de veilige kant.
 *   • N_Rd = min(N_Rd,t; N_Rd,b; N_Rd,m); UC = N_Ed/N_Rd.
 *
 * Buiten de referenties, volgens de norm (check-metselwerkwand.mjs):
 *   • Een vloer aan één zijde klemt alleen in bij een oplegging van ten minste
 *     ⅔·t (beton, §5.5.1.2(11)(i)); een houten vloer aan één zijde telt pas als
 *     steun bij ⅔·t en 85 mm (§5.5.1.2(11)(ii)). De opties 5 en 6 dekken de
 *     kortere opleggingen af en rekenen met ρ_2 = 1,00.
 *   • Φ wordt niet kleiner dan nul. Valt de resultante buiten de doorsnede
 *     (e ≥ t/2), dan is N_Rd = 0 en de UC oneindig. Eerder gaf een negatieve
 *     Φ een negatieve N_Rd, een negatieve UC en dus "voldoet".
 *   • Trek (N_Ed of N_Ed,max negatief) keurt het blad af: ongewapend metselwerk
 *     neemt geen trek op.
 *   • Bij een doorsnede A = ℓ·t < 0,1 m² gaat f_d maal (0,7 + 3·A) (§6.1.2.1(3),
 *     (6.3)). ℓ is daarom de werkelijke lengte van de wand of het penant; alle
 *     referentiesets hebben A = 0,12 m².
 *   • De minimale-excentriciteitstoets rekent met max(N_Ed; N_Ed,max): de NB bij
 *     5.5.1.1(5) vraagt de grootste normaalkracht, dus nooit minder dan N_Ed.
 *   • ρ_3 volgens (5.7) is niet kleiner dan 0,3. Dat grijpt pas in bij n = 3
 *     met L_v < 0,2·h; geen referentieset komt daar.
 *   • De minimale-excentriciteitstoets is een capaciteitstoets (NB bij
 *     5.5.1.1(5) en 6.1.2.2(1)(ii)). De grens λ ≤ 27 van §5.5.1.4(2) hoort bij
 *     h_ef volgens §5.5.1.2 (stap 5); bij h_ef2 telt boven λ_c = 27 alleen e_k
 *     mee. Alle referentiesets hebben λ_2 ≤ 27.
 *   • φ_∞ volgt uit tabel NB-3 (NB bij 3.7.4(2)) via steensoort en morteltype;
 *     betonsteen rekent met 1,9/1,7, lichtbetonsteen (2,0) kent het blad niet.
 *     φ_∞ telt in de minimale-excentriciteitstoets ook bij een wand die aan
 *     §5.5.1.4 voldoet. Eerder was φ_∞ vrije invoer (in het beeld standaard 0).
 *   • Een langsvoeg (mortelvoeg evenwijdig aan het wandvlak) geeft K maal 0,8
 *     (§3.6.1.2(6)). De factor geldt voor metselmortel; met lijmmortel meldt
 *     het blad dat de norm geen f_k geeft.
 *
 * Variabelenamen komen exact overeen met MetselwerkwandDesigner.tsx.
 */

export const metselwerkwand = `"Dragende metselwerkwand — druk (EN 1996-1-1 §6.1.2)

# 1. Geometrie & randsteuning

@select ondersteuning "Ondersteuning boven/onder (bepaalt ρ₂)"
  wand met aan beide zijden betonvloer of -dak = 1
  betonvloer of -dak aan één zijde, oplegging ten minste ⅔·t = 2
  wand met aan beide zijden houten vloer of dak = 3
  houten vloer of dak aan één zijde, oplegging ten minste ⅔·t en 85 mm = 4
  betonvloer of -dak aan één zijde, oplegging korter dan ⅔·t = 5
  houten vloer of dak aan één zijde, kortere oplegging = 6
@end

@select n_rand "Aantal gesteunde randen n"
  2 (boven + onder) = 2
  3 (+ één verticale rand) = 3
  4 (+ twee verticale randen) = 4
@end

l_w = ?*(mm)', werkelijke lengte ℓ van de wand of het penant'
h_w = ?*(mm)', wandhoogte h'
t_w = ?*(mm)', wanddikte t'
L_v = ?*(mm)', lengte l: van de vrije rand tot de verticale steun (n = 3) of tussen de verticale steunen (n = 4)'

# 2. Metselwerk

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
'Kolommen: [id | K_metsel | K_lijm | α_lijm | β_lijm | φ_∞ metsel | φ_∞ lijm]:
'K, α en β uit tabel NB-2, φ_∞ uit tabel NB-3 (NB bij 3.7.4(2)).
'Metselmortel heeft altijd α = 0,65 en β = 0,25. Tegen een referentie getoetst:
'kalkzandsteen<25%+metselmortel (set 1-6, 9), baksteen<25%+lijmmortel (set 8) en
'cellenbeton<25%+lijmmortel (oplegmodule).
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0 |0.7; 0.7; 1.1; 1.1; 1.9; 1.9; 0.6 |0.5; 0.5; 0.8; 0.8; 1.7; 1.7; 0.5]
K_tab = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 3); hlookup(steenmat; steensoort; 1; 2))
'§3.6.1.2(6): met een langsvoeg K maal 0,8.
K = K_tab*if(langsvoeg ≡ 2; 0.8; 1)
alfa = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
bexp = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
phi_inf = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 7); hlookup(steenmat; steensoort; 1; 6))
'EN 771-1 t/m 6 kent alleen categorie I en II.
gam_base = if(steencategorie ≡ 1; 1.7; 2.2)
gam_M = gam_base - if(CC ≡ 1; 0.2; 0)
'NB bij 3.6.1.2: f_b hoogstens 75 N/mm² bij metselmortel en 50 N/mm² bij
'lijmmortel; f_m hoogstens 20 N/mm², en bij metselmortel ook hoogstens 2·f_b.
'Die laatste grens past het referentieprogramma niet toe (oplegreferentie 2:
'fb 5 met M15 geeft daar f_k = 3,36 in plaats van 3,04) — register punt 14.
f_beff = min(f_b; if(morteltype ≡ 1; 75; 50))
f_meff_XC = min(f_m; 20)
f_meff_nb = min(f_m; 20; if(morteltype ≡ 1; 2*f_beff; 20))
f_meff = if(rekenwijze ≡ 1; f_meff_XC; f_meff_nb)
K_E = 700
'§6.1.2.1(3): bij een doorsnede kleiner dan 0,1 m² gaat f_d maal (0,7 + 3·A).
A_w = l_w*t_w to m^2
#show

#if langsvoeg ≡ 2
    K', factor K: tabel NB-2 maal 0,8 voor de langsvoeg (§3.6.1.2(6))'
    #if morteltype ≡ 2
        '<span style="color: #b45309"><b>Let op:</b> §3.6.1.2(6) geeft de factor 0,8 alleen voor metselmortel;
        'voor lijmmortel met een langsvoeg geeft de norm geen f<sub>k</sub>. Dit blad rekent ook dan met 0,8·K.</span>
    #end if
#else
    K', factor K (tabel NB-2)'
#end if
alfa', exponent α'
bexp', exponent β'
gam_M
f_k = K*f_beff^alfa*f_meff^bexp*N/mm^2', karakteristieke druksterkte metselwerk (3.2)'
#if rekenwijze ≡ 1 and f_meff_XC > f_meff_nb
    '<span style="color: red"><b>Let op:</b> f<sub>m</sub> is groter dan 2·f<sub>b</sub>. Met de rekenwijze "de
    'referentie-uitwerking volgen" rekent het blad met f<sub>m</sub> = 'f_meff_XC' N/mm², volgens de NB bij 3.6.1.2
    'met 2·f<sub>b</sub> = 'f_meff_nb' N/mm²: f<sub>k</sub> is te hoog en de uitkomst te gunstig.</span>
#end if
#if A_w < 0.1*m^2
    A_w = l_w*t_w to m^2', doorsnede van de wand of het penant, kleiner dan 0,1 m²'
    k_A = 0.7 + 3*A_w/m^2', reductie voor een kleine doorsnede (6.3)'
    f_d = k_A*f_k/gam_M', rekenwaarde druksterkte (3.1) met (6.3)'
#else
    f_d = f_k/gam_M', rekenwaarde druksterkte (3.1)'
#end if
E_mw = K_E*f_k', elasticiteitsmodulus E = 700·f_k (NB bij 3.7.2(2))'
phi_inf', eindkruipcoëfficiënt φ_∞ (NB bij 3.7.4(2), tabel NB-3); telt alleen boven λ_c = 27'

# 3. Belastingen (rekenwaarden)

N_Ed = ?*(kN)', normaalkracht'
N_Ed_max = ?*(kN)', grootste normaalkracht uit de fundamentele combinaties (NB bij 5.5.1.1(5)), niet kleiner dan N_Ed'
M_1Ed = ?*(kN*m)', moment aan de kop'
M_mEd = ?*(kN*m)', moment op halve hoogte'
M_2Ed = ?*(kN*m)', moment aan de voet'

# 4. Effectieve hoogte — §5.5.1.2

#hide
'Terugval op n = 2 zodra de gesteunde rand te ver weg staat.
n_lim = if(n_rand ≡ 4; 30*t_w; 15*t_w)
n_eff = if(n_rand ≡ 2; 2; if(L_v ≥ n_lim; 2; n_rand))
N_min = max(abs(N_Ed); 0.001*kN)
#show
e_t0 = abs(M_1Ed)/N_min to mm', eerste-orde excentriciteit aan de kop (bepaalt of ρ_2 = 0,75 mag)'
e_grens = 0.25*t_w', grens waarboven de inklemming vervalt (§5.5.1.2(11)(i))'
#hide
'Beton (optie 1-2) → 0,75; hout (optie 3-4) → 1,00. Een vloer aan één zijde met
'een te korte oplegging (optie 5-6) klemt niet in → 1,00.
rho_2 = if(ondersteuning ≤ 2; if(e_t0 > e_grens; 1.0; 0.75); 1.0)
rho_3 = if(h_w ≤ 3.5*L_v; rho_2/(1 + (rho_2*h_w/(3*L_v))^2); max(1.5*L_v/h_w; 0.3))
rho_4 = if(h_w ≤ 1.15*L_v; rho_2/(1 + (rho_2*h_w/L_v)^2); 0.5*L_v/h_w)
rho_n = if(n_eff ≡ 3; rho_3; if(n_eff ≡ 4; rho_4; rho_2))
'Idem met ρ₂ = 1,00 — voor de minimale-excentriciteitstoets vervalt de gunstige
'inklemming boven/onder, maar de verticale randsteuning blijft staan.
rho_3m = if(h_w ≤ 3.5*L_v; 1/(1 + (h_w/(3*L_v))^2); max(1.5*L_v/h_w; 0.3))
rho_4m = if(h_w ≤ 1.15*L_v; 1/(1 + (h_w/L_v)^2); 0.5*L_v/h_w)
rho_nm = if(n_eff ≡ 3; rho_3m; if(n_eff ≡ 4; rho_4m; 1.0))
#show
#if ondersteuning ≤ 2 and e_t0 > e_grens
    '<i>e<sub>t</sub> > 0,25·t: de inklemming vervalt, ρ<sub>2</sub> = 1,00 (§5.5.1.2(11)(i)).</i>
#end if
#if ondersteuning ≡ 5
    '<i>De betonvloer ligt aan één zijde op met minder dan ⅔·t: die klemt de wand niet in
    '(§5.5.1.2(11)(i)), dus ρ<sub>2</sub> = 1,00.</i>
#else if ondersteuning ≡ 6
    '<span style="color: #b45309"><b>Let op:</b> een houten vloer aan één zijde telt pas als steun
    'bij een oplegging van ten minste ⅔·t en 85 mm (§5.5.1.2(11)(ii)). Dit blad rekent met
    'ρ<sub>2</sub> = 1,00 en gaat ervan uit dat de wandkop op een andere manier zijdelings is
    'gesteund, bijvoorbeeld met muurankers.</span>
#end if
#if n_eff < n_rand
    '<i>L<sub>v</sub> ≥ 'n_lim' mm (15·t bij n = 3, 30·t bij n = 4): de verticale rand telt niet mee, n = 2.</i>
#end if
n_eff', aantal gesteunde randen na toetsing van L_v'
rho_2', ρ_2 (§5.5.1.2(11))'
rho_n', ρ_n, bij n = 3 of 4 volgens (5.6)-(5.9) met l = L_v'
h_ef = rho_n*h_w', effectieve hoogte (5.2)'
t_ef = t_w', effectieve dikte — enkelvoudig blad'
e_init = h_ef/450', initiële excentriciteit (§5.5.1.1(4))'

# 5. Slankheid — §5.5.1.4

lam = h_ef/t_ef', slankheid'
UC_lam = lam/27
#if lam ≤ 27
    'λ = h<sub>ef</sub>/t<sub>ef</sub> = 'lam' ≤ 27 — u.c. = 'UC_lam'<span style="color: green"> → <b>voldoet</b></span>
#else
    'λ = h<sub>ef</sub>/t<sub>ef</sub> = 'lam' > 27 — u.c. = 'UC_lam'<span style="color: red"> → <b>voldoet niet</b></span>
#end if

# 6. Excentriciteit aan kop en voet — §6.1.2.2 (6.4)/(6.5)

ratio_N = N_Ed/(l_w*t_w*f_d)', N_Ed/(ℓ·t·f_d); bij ten hoogste 0,1 wordt e_i begrensd op e_cap'
#if ratio_N ≤ 0.1
    e_cap = t_w/2 - N_Ed/(2*l_w*f_d) to mm', grens-excentriciteit; het afgekapte deel telt als ΔM op halve hoogte'
#end if

e_t = M_1Ed/N_min to mm', excentriciteit aan de kop'
#if ratio_N > 0.1
    e_it = max(abs(e_t) + e_init; 0.05*t_w)', excentriciteit kop (6.5)'
#else
    e_itf = max(abs(e_t) + e_init; 0.05*t_w)', excentriciteit kop vóór begrenzing (6.5)'
    e_it = min(e_itf; e_cap)', maatgevende excentriciteit kop, begrensd op e_cap'
    dM_t = (e_itf - e_it)*N_Ed to kN*m', restmoment kop'
#end if
Phi_it = max(1 - 2*e_it/t_w; 0)', reductiefactor kop (6.4), niet kleiner dan nul'
N_Rdt = Phi_it*l_w*t_w*f_d to kN', capaciteit aan de kop (6.2)'

e_b = M_2Ed/N_min to mm', excentriciteit aan de voet'
#if ratio_N > 0.1
    e_ib = max(abs(e_b) + e_init; 0.05*t_w)', excentriciteit voet (6.5)'
#else
    e_ibf = max(abs(e_b) + e_init; 0.05*t_w)', excentriciteit voet vóór begrenzing (6.5)'
    e_ib = min(e_ibf; e_cap)', maatgevende excentriciteit voet, begrensd op e_cap'
    dM_b = (e_ibf - e_ib)*N_Ed to kN*m', restmoment voet'
#end if
Phi_ib = max(1 - 2*e_ib/t_w; 0)', reductiefactor voet (6.4), niet kleiner dan nul'
N_Rdb = Phi_ib*l_w*t_w*f_d to kN', capaciteit aan de voet (6.2)'

# 7. Excentriciteit op halve hoogte — §6.1.2.2 + bijlage G

#if ratio_N > 0.1
    M_Edmc = abs(M_mEd)', maatgevend moment op halve hoogte'
#else
    M_Edmc = abs(M_mEd) + (dM_t + dM_b)/2', maatgevend moment op halve hoogte, met de restmomenten'
#end if
e_m = abs(M_Edmc)/N_min + e_init to mm', eerste-orde excentriciteit halve hoogte (6.7)'
#if lam ≤ 27
    e_k = 0*mm', kruip-excentriciteit, nul bij λ ≤ λ_c = 27 (NB bij 6.1.2.2(2))'
#else
    e_k = 0.002*phi_inf*lam*sqrt(t_w*e_m)', kruip-excentriciteit (6.8)'
#end if
e_mk = max(abs(e_m) + e_k; 0.05*t_ef)', totale excentriciteit halve hoogte (6.6)'
A_1 = 1 - 2*e_mk/t_w', (G.2)'
lam_F = (h_ef/t_ef)*sqrt(f_k/E_mw)', slankheidsparameter (G.4)'
u_m = (lam_F - 0.063)/(0.73 - 1.17*e_mk/t_ef)', (G.3)'
Phi_m = max(A_1*exp(-u_m^2/2); 0)', reductiefactor halve hoogte (G.1), niet kleiner dan nul'
N_Rdm = Phi_m*l_w*t_w*f_d to kN', capaciteit op halve hoogte (6.2)'

# 8. Toetsing — §6.1.2.1 (6.1)

N_Rd = min(N_Rdt; N_Rdb; N_Rdm)', maatgevende capaciteit'
#if N_Ed < 0 kN or N_Ed_max < 0 kN
    '<span style="color: red"><b>Trek</b>: ongewapend metselwerk neemt geen trek op, en dit blad
    'toetst alleen druk → <b>voldoet niet</b></span>
    #hide
    UC_1 = 1/0
    #show
#else if N_Rd > 0 kN
    UC_1 = N_Ed/N_Rd
    #if UC_1 ≤ 1.0
        'UC = N<sub>Ed</sub>/N<sub>Rd</sub> = 'UC_1'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC = N<sub>Ed</sub>/N<sub>Rd</sub> = 'UC_1'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    '<span style="color: red">N<sub>Rd</sub> = 0: de resultante valt buiten de wanddoorsnede
    '(e ≥ t/2), dus de wand kan deze belasting niet afdragen → <b>voldoet niet</b></span>
    #hide
    UC_1 = 1/0
    #show
#end if

# 9. Minimale excentriciteit — NB bij 5.5.1.1(5)

'<i>Grootste normaalkracht, ρ<sub>2</sub> = 1,00 (een verticale randsteuning blijft meetellen) en een
'constante eerste-orde excentriciteit van ten minste 10 mm en h<sub>ef</sub>/300. Dit is een toets op
'capaciteit (NB bij 6.1.2.2(1)(ii)): de grens λ ≤ 27 staat in stap 5, hier telt daarboven alleen e<sub>k</sub>.</i>
h_ef2 = rho_nm*h_w', effectieve hoogte met rho_2 = 1,00 (5.2)'
e_m2 = max(10*mm; h_ef2/300)', constante minimale excentriciteit'

#if UC_1 ≤ 1.0 or (rekenwijze ≡ 0 and N_Ed ≥ 0 kN)
    lam_2 = h_ef2/t_ef', slankheid bij ρ_2 = 1,00'
    #if lam_2 ≤ 27
        e_k2 = 0*mm', kruip-excentriciteit bij h_ef2, nul bij λ ≤ λ_c = 27'
    #else
        e_k2 = 0.002*phi_inf*lam_2*sqrt(t_w*e_m2)', kruip-excentriciteit bij h_ef2 (6.8)'
    #end if
    e_mk2 = max(e_m2 + e_k2; 0.05*t_w)', (6.6)'
    A_12 = 1 - 2*e_mk2/t_w', (G.2)'
    lam_F2 = (h_ef2/t_ef)*sqrt(f_k/E_mw)', (G.4)'
    u_2 = (lam_F2 - 0.063)/(0.73 - 1.17*e_mk2/t_w)', (G.3)'
    Phi_m2 = max(A_12*exp(-u_2^2/2); 0)', (G.1), niet kleiner dan nul'
    N_Rdm2 = Phi_m2*l_w*t_w*f_d to kN', (6.2)'
    N_mx = max(N_Ed; N_Ed_max)', normaalkracht voor deze toets, ten minste N_Ed'
    #if N_Ed_max < N_Ed
        '<span style="color: #b45309"><b>Let op:</b> N<sub>Ed,max</sub> is kleiner dan N<sub>Ed</sub>; de toets rekent met N<sub>Ed</sub>.</span>
    #end if
    #if N_Rdm2 > 0 kN
        UC_2 = N_mx/N_Rdm2
        #if UC_2 ≤ 1.0
            'UC = N<sub>mx</sub>/N<sub>Rd,m2</sub> = 'UC_2'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            'UC = N<sub>mx</sub>/N<sub>Rd,m2</sub> = 'UC_2'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #else
        '<span style="color: red">N<sub>Rd,m2</sub> = 0: de minimale excentriciteit reikt tot buiten
        'de wanddoorsnede → <b>voldoet niet</b></span>
        #hide
        UC_2 = 1/0
        #show
    #end if
#else
    'Niet uitgevoerd: de wand voldoet al niet op de eerste toets.
    #hide
    UC_2 = 0
    #show
#end if

# 10. Samenvatting

UC_max = max(UC_lam; UC_1; UC_2)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Dragende metselwerkwand voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Dragende metselwerkwand voldoet niet</b></span>
#end if
`;
