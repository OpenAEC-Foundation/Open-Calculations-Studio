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
 *   • e_k = 0 zolang λ ≤ λ_c = 27 (NB bij 6.1.2.2(2)); φ_∞ (tabel NB-3) telt
 *     pas daarboven, waar de wand al niet aan §5.5.1.4 voldoet.
 *   • K, α en β uit tabel NB-2: metselmortel altijd α = 0,65 / β = 0,25;
 *     lijmmortel per steensoort. Getoetst: lijmmortel op baksteen (set 8) en op
 *     cellenbeton (oplegmodule).
 *   • f_b ≤ 75 (metselmortel) / 50 (lijmmortel) en f_m ≤ 20 (NB bij 3.6.1.2);
 *     f_m ≤ 2·f_b bij metselmortel alleen in de norm-stand (register punt 14).
 *   • γ_M volgens tabel NB-1: gelijk voor CC2 en CC3 (set 9); CC1 0,2 lager.
 *   • Een verticale randsteuning vervalt bij L_v ≥ 15·t (n = 3, set 4) resp.
 *     L_v ≥ 30·t (n = 4, set 7 blijft n = 4 bij L_v = 2000 < 3600).
 *   • ρ_2 = 0,75 vervalt zodra de excentriciteit aan de kop e_t = |M_1Ed|/|N_Ed|
 *     groter is dan 0,25·t (§5.5.1.2(11)(i), set 10: 50 > 30 mm → ρ_2 = 1,00).
 *     De regel kijkt alléén naar de kop, niet naar M_2Ed.
 *   • ρ_3/ρ_4 rekenen met L_v, niet met ℓ.
 *   • Lage-belastingstak N_Ed/(ℓ·t·f_d) ≤ 0,1 (set 6): e_i wordt begrensd op
 *     t/2 − N_Ed/(2·ℓ·f_d) en het afgekapte deel komt als ΔM = (e_i,f − e_i)·N_Ed
 *     terug in M_Ed,mc = M_mEd + (ΔM_t + ΔM_b)/2.
 *   • De minimale-excentriciteitstoets rekent met ρ_2 = 1,00 maar behoudt de
 *     verticale randsteuning (set 7: h_ef2 = ρ_4·h = 1000, niet h = 2800), toetst
 *     N_Ed,max, en wordt overgeslagen zodra de eerste toets al niet voldoet
 *     (sets 3, 4, 9).
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
 *
 * Variabelenamen komen exact overeen met MetselwerkwandDesigner.tsx.
 */

export const metselwerkwand = `"Dragende metselwerkwand — druk (EN 1996-1-1 §6.1.2)

'<i>Ongewapende dragende metselwerkwand, belast door een normaalkracht
'N<sub>Ed</sub> en de eindmomenten M<sub>1Ed</sub> (kop), M<sub>mEd</sub> (midden)
'en M<sub>2Ed</sub> (voet). Getoetst worden de slankheid (§5.5.1.4) en de
'capaciteit aan kop, voet en op halve hoogte via de reductiefactor Φ
'(§6.1.2.2 + bijlage G). Belastingen zijn <b>rekenwaarden</b>.</i>

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

l_w = ?*(mm)', wandlengte ℓ'
h_w = ?*(mm)', wandhoogte h'
t_w = ?*(mm)', wanddikte t'
L_v = ?*(mm)', afstand tot de gesteunde (verticale) rand'

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

f_m = ?', mortelsterkte f_m [N/mm²] — M-klasse (metselmortel) of L-klasse (lijmmortel); bij lijmmortel niet van invloed op f_k (β=0)'

@select steencategorie "Steencategorie / uitvoeringsklasse (basis γ_M)"
  Categorie I = 1
  Categorie II = 2
@end

phi_inf = ?', eindkruipcoëfficiënt φ_∞ (tabel NB-3); telt alleen bij een slankheid boven λ_c = 27'

#hide
'Kolommen: [id | K_metsel | K_lijm | α_lijm | β_lijm], alle uit tabel NB-2.
'Metselmortel heeft altijd α = 0,65 en β = 0,25. Tegen een referentie getoetst:
'kalkzandsteen<25%+metselmortel (set 1-6, 9), baksteen<25%+lijmmortel (set 8) en
'cellenbeton<25%+lijmmortel (oplegmodule).
steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0]
K = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 3); hlookup(steenmat; steensoort; 1; 2))
alfa = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
bexp = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
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
#show

K', factor K (steengroep + morteltype)'
alfa', exponent α'
bexp', exponent β'
gam_M
f_k = K*f_beff^alfa*f_meff^bexp*N/mm^2', karakteristieke druksterkte metselwerk (3.2)'
f_k
f_d = f_k/gam_M', rekenwaarde druksterkte (3.1)'
f_d
E_mw = K_E*f_k', elasticiteitsmodulus E = 700·f_k (NB:2018)'
E_mw

# 3. Belastingen (rekenwaarden)

N_Ed = ?*(kN)', normaalkracht'
N_Ed_max = ?*(kN)', maximale normaalkracht — alléén voor de minimale-excentriciteitstoets'
M_1Ed = ?*(kN*m)', moment aan de kop'
M_mEd = ?*(kN*m)', moment op halve hoogte'
M_2Ed = ?*(kN*m)', moment aan de voet'

# 4. Effectieve hoogte — §5.5.1.2

'<i>ρ<sub>2</sub> = 0,75 bij inklemming door betonvloeren — maar alléén zolang de
'excentriciteit aan de kop e<sub>t</sub> = |M<sub>1Ed</sub>|/|N<sub>Ed</sub>| niet groter is dan
'0,25·t; daarboven vervalt de inklemming en wordt ρ<sub>2</sub> = 1,00 (§5.5.1.2(11)(i)). Een
'betonvloer aan één zijde klemt alleen in bij een oplegging van ten minste ⅔·t. Een
'verticale randsteuning telt alleen mee zolang L<sub>v</sub> < 15·t (n = 3) respectievelijk
'L<sub>v</sub> < 30·t (n = 4); daarboven valt de wand terug op n = 2. ρ<sub>3</sub> en
'ρ<sub>4</sub> volgen uit (5.6)-(5.9) met L<sub>v</sub> als afstand tussen de stijve randen.</i>
#hide
'Terugval op n = 2 zodra de gesteunde rand te ver weg staat.
n_lim = if(n_rand ≡ 4; 30*t_w; 15*t_w)
n_eff = if(n_rand ≡ 2; 2; if(L_v ≥ n_lim; 2; n_rand))
N_min = max(abs(N_Ed); 0.001*kN)
#show
e_t0 = abs(M_1Ed)/N_min to mm', eerste-orde excentriciteit aan de kop (bepaalt of ρ_2 = 0,75 mag)'
e_t0
e_grens = 0.25*t_w', grens waarboven de inklemming vervalt (§5.5.1.2(11))'
e_grens
#hide
'Beton (optie 1-2) → 0,75; hout (optie 3-4) → 1,00. Een vloer aan één zijde met
'een te korte oplegging (optie 5-6) klemt niet in → 1,00.
rho_2 = if(ondersteuning ≤ 2; if(e_t0 > e_grens; 1.0; 0.75); 1.0)
rho_3 = if(h_w ≤ 3.5*L_v; rho_2/(1 + (rho_2*h_w/(3*L_v))^2); 1.5*L_v/h_w)
rho_4 = if(h_w ≤ 1.15*L_v; rho_2/(1 + (rho_2*h_w/L_v)^2); 0.5*L_v/h_w)
rho_n = if(n_eff ≡ 3; rho_3; if(n_eff ≡ 4; rho_4; rho_2))
'Idem met ρ₂ = 1,00 — voor de minimale-excentriciteitstoets vervalt de gunstige
'inklemming boven/onder, maar de verticale randsteuning blijft staan.
rho_3m = if(h_w ≤ 3.5*L_v; 1/(1 + (h_w/(3*L_v))^2); 1.5*L_v/h_w)
rho_4m = if(h_w ≤ 1.15*L_v; 1/(1 + (h_w/L_v)^2); 0.5*L_v/h_w)
rho_nm = if(n_eff ≡ 3; rho_3m; if(n_eff ≡ 4; rho_4m; 1.0))
#show
#if ondersteuning ≡ 5
    '<i>De betonvloer ligt aan één zijde op met minder dan ⅔·t: die klemt de wand niet in
    '(§5.5.1.2(11)(i)), dus ρ<sub>2</sub> = 1,00.</i>
#else if ondersteuning ≡ 6
    '<span style="color: #b45309"><b>Let op:</b> een houten vloer aan één zijde telt pas als steun
    'bij een oplegging van ten minste ⅔·t en 85 mm (§5.5.1.2(11)(ii)). Dit blad rekent met
    'ρ<sub>2</sub> = 1,00 en gaat ervan uit dat de wandkop op een andere manier zijdelings is
    'gesteund, bijvoorbeeld met muurankers.</span>
#end if
n_eff', aantal gesteunde randen na toetsing van L_v'
rho_2
rho_n
h_ef = rho_n*h_w', effectieve hoogte (5.2)'
t_ef = t_w', effectieve dikte — enkelvoudig blad'
h_ef
t_ef
e_init = h_ef/450', initiële excentriciteit (§5.5.1.1(4))'
e_init

# 5. Slankheid — §5.5.1.4

lam = h_ef/t_ef', slankheid'
UC_lam = lam/27
#if lam ≤ 27
    'λ = h<sub>ef</sub>/t<sub>ef</sub> = 'lam' ≤ 27 — u.c. = 'UC_lam'<span style="color: green"> → <b>voldoet</b></span>
#else
    'λ = h<sub>ef</sub>/t<sub>ef</sub> = 'lam' > 27 — u.c. = 'UC_lam'<span style="color: red"> → <b>voldoet niet</b></span>
#end if

# 6. Excentriciteit aan kop en voet — §6.1.2.2 (6.4)/(6.5)

'<i>Bij N<sub>Ed</sub>/(ℓ·t·f<sub>d</sub>) ≤ 0,1 begrenst de referentie-uitwerking de excentriciteit op
'de waarde die nog binnen de doorsnede past, t/2 − N<sub>Ed</sub>/(2·ℓ·f<sub>d</sub>); het
'afgekapte deel komt als restmoment ΔM terug op halve hoogte.</i>
ratio_N = N_Ed/(l_w*t_w*f_d)', N_Ed/(ℓ·t·f_d) — bepaalt welke tak geldt'
ratio_N
e_cap = t_w/2 - N_Ed/(2*l_w*f_d) to mm', grens-excentriciteit bij de lage-belastingstak'

e_t = M_1Ed/N_min to mm', excentriciteit aan de kop'
e_itf = max(abs(e_t) + e_init; 0.05*t_w)', excentriciteit kop vóór begrenzing (6.5)'
#if ratio_N > 0.1
    e_it = e_itf', maatgevende excentriciteit kop, niet begrensd'
#else
    e_it = min(e_itf; e_cap)', maatgevende excentriciteit kop, begrensd op e_cap'
#end if
e_t
e_itf
e_it
dM_t = (e_itf - e_it)*N_Ed to kN*m', restmoment kop'
Phi_it = max(1 - 2*e_it/t_w; 0)', reductiefactor kop (6.4), niet kleiner dan nul'
Phi_it
N_Rdt = Phi_it*l_w*t_w*f_d to kN', capaciteit aan de kop (6.2)'
N_Rdt

e_b = M_2Ed/N_min to mm', excentriciteit aan de voet'
e_ibf = max(abs(e_b) + e_init; 0.05*t_w)', excentriciteit voet vóór begrenzing (6.5)'
#if ratio_N > 0.1
    e_ib = e_ibf', maatgevende excentriciteit voet, niet begrensd'
#else
    e_ib = min(e_ibf; e_cap)', maatgevende excentriciteit voet, begrensd op e_cap'
#end if
e_b
e_ibf
e_ib
dM_b = (e_ibf - e_ib)*N_Ed to kN*m', restmoment voet'
Phi_ib = max(1 - 2*e_ib/t_w; 0)', reductiefactor voet (6.4), niet kleiner dan nul'
Phi_ib
N_Rdb = Phi_ib*l_w*t_w*f_d to kN', capaciteit aan de voet (6.2)'
N_Rdb

# 7. Excentriciteit op halve hoogte — §6.1.2.2 + bijlage G

'<i>M<sub>Ed,mc</sub> = M<sub>mEd</sub> + (ΔM<sub>t</sub> + ΔM<sub>b</sub>)/2, met de
'restmomenten uit de begrenzing hierboven. De kruip-excentriciteit e<sub>k</sub> mag nul zijn zolang
'de slankheid niet boven λ<sub>c</sub> = 27 komt (NB bij 6.1.2.2(2)); daarboven volgt hij uit (6.7).</i>
M_Edmc = M_mEd + (dM_t + dM_b)/2', maatgevend moment op halve hoogte'
e_Edm = M_Edmc/N_min to mm
e_m = abs(e_Edm) + e_init', eerste-orde excentriciteit halve hoogte'
e_Edm
e_m
#if lam ≤ 27
    e_k = 0*mm', kruip-excentriciteit, nul bij λ ≤ λ_c = 27'
#else
    e_k = 0.002*phi_inf*lam*sqrt(t_w*e_m)', kruip-excentriciteit (6.7)'
#end if
e_k
e_mk = max(abs(e_m) + e_k; 0.05*t_ef)', totale excentriciteit halve hoogte (6.6)'
e_mk

A_1 = 1 - 2*e_mk/t_w', (G.2)'
A_1
lam_F = (h_ef/t_ef)*sqrt(f_k/E_mw)', slankheidsparameter (G.4)'
lam_F
u_m = (lam_F - 0.063)/(0.73 - 1.17*e_mk/t_ef)', (G.3)'
u_m
Phi_m = max(A_1*exp(-u_m^2/2); 0)', reductiefactor halve hoogte (G.1), niet kleiner dan nul'
Phi_m
N_Rdm = Phi_m*l_w*t_w*f_d to kN', capaciteit op halve hoogte (6.2)'
N_Rdm

# 8. Toetsing — §6.1.2.1 (6.1)

N_Rd = min(N_Rdt; N_Rdb; N_Rdm)', maatgevende capaciteit'
N_Rd
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

# 9. Constante minimale eerste-orde excentriciteit

'<i>Naast de werkelijke excentriciteit wordt de wand getoetst op een constante
'minimale eerste-orde excentriciteit met N<sub>Ed,max</sub>. Daarbij vervalt de gunstige
'inklemming boven/onder (ρ<sub>2</sub> = 1,00); een verticale randsteuning blijft wél
'meetellen. de referentie-uitwerking slaat deze toets over zodra de vorige al niet voldoet.</i>
h_ef2 = rho_nm*h_w', effectieve hoogte met rho_2 = 1,00 (5.2)'
e_m2 = max(10*mm; h_ef2/300)', constante minimale excentriciteit'
h_ef2
e_m2

#if UC_1 ≤ 1.0
    lam_2 = h_ef2/t_ef
    UC_lam2 = lam_2/27
    #if lam_2 ≤ 27
        'λ = h<sub>ef2</sub>/t<sub>ef</sub> = 'lam_2' ≤ 27 — u.c. = 'UC_lam2'<span style="color: green"> → <b>voldoet</b></span>
    #else
        'λ = h<sub>ef2</sub>/t<sub>ef</sub> = 'lam_2' > 27 — u.c. = 'UC_lam2'<span style="color: red"> → <b>voldoet niet</b></span>
    #end if
    #if lam_2 ≤ 27
        e_k2 = 0*mm', kruip-excentriciteit bij h_ef2, nul bij λ ≤ λ_c = 27'
    #else
        e_k2 = 0.002*phi_inf*lam_2*sqrt(t_w*e_m2)', kruip-excentriciteit bij h_ef2 (6.7)'
    #end if
    e_mk2 = max(e_m2 + e_k2; 0.05*t_w)', (6.6)'
    e_mk2
    A_12 = 1 - 2*e_mk2/t_w', (G.2)'
    A_12
    lam_F2 = (h_ef2/t_ef)*sqrt(f_k/E_mw)', (G.4)'
    lam_F2
    u_2 = (lam_F2 - 0.063)/(0.73 - 1.17*e_mk2/t_w)', (G.3)'
    u_2
    Phi_m2 = max(A_12*exp(-u_2^2/2); 0)', (G.1), niet kleiner dan nul'
    Phi_m2
    N_Rdm2 = Phi_m2*l_w*t_w*f_d to kN', (6.2)'
    N_Rdm2
    #if N_Rdm2 > 0 kN
        UC_2 = N_Ed_max/N_Rdm2
        #if UC_2 ≤ 1.0
            'UC = N<sub>Ed,max</sub>/N<sub>Rd,m2</sub> = 'UC_2'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            'UC = N<sub>Ed,max</sub>/N<sub>Rd,m2</sub> = 'UC_2'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #else
        '<span style="color: red">N<sub>Rd,m2</sub> = 0: de minimale excentriciteit reikt tot buiten
        'de wanddoorsnede → <b>voldoet niet</b></span>
        #hide
        UC_2 = 1/0
        #show
    #end if
    UC_lam2m = UC_lam2
#else
    'Niet uitgevoerd: de wand voldoet al niet op de werkelijke excentriciteit.
    UC_2 = 0
    UC_lam2m = 0
#end if

# 10. Samenvatting

UC_max = max(UC_lam; UC_lam2m; UC_1; UC_2)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Dragende metselwerkwand voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Dragende metselwerkwand voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Gecalibreerd op 14 referentieberekeningen (kalkzandsteen CS12/M15 en baksteen fb18/L12,5,
'categorie I, CC2 en CC3, n = 2/3/4, N<sub>Ed</sub> = 30 tot 300 kN, M = 0 tot 10 kNm): alle exact
'gereproduceerd.</li>
'<li>ρ<sub>2</sub> = 0,75 geldt alléén zolang e<sub>t</sub> = |M<sub>1Ed</sub>|/|N<sub>Ed</sub>| ≤ 0,25·t;
'daarboven vervalt de inklemming en wordt ρ<sub>2</sub> = 1,00 (§5.5.1.2(11)(i)). De regel kijkt
'alleen naar de kop.</li>
'<li><b>Nog niet geverifieerd:</b> de ρ<sub>2</sub> per ondersteuningsoptie. De vier
'referentiebladen met elk een andere optie hebben allemaal e<sub>t</sub> = 50 mm > 0,25·t,
'waardoor ρ<sub>2</sub> = 1,00 wordt ongeacht de keuze — ze zijn vanaf blad 2 identiek. Dit blad
'volgt EN 1996-1-1 §5.5.1.2(11): beton (optie 1-2) → 0,75, hout (optie 3-4) → 1,00.</li>
'<li>Een vloer aan één zijde klemt de wand alleen in bij een oplegging van ten minste ⅔·t; een
'houten vloer aan één zijde telt pas als steun bij ⅔·t en 85 mm. Met een kortere oplegging
'(optie 5-6) rekent het blad met ρ<sub>2</sub> = 1,00; bij hout moet de wandkop dan op een andere
'manier zijdelings gesteund zijn.</li>
'<li>Φ wordt niet kleiner dan nul. Valt de resultante buiten de doorsnede (e ≥ t/2), dan is
'N<sub>Rd</sub> = 0 en de UC oneindig. Trek keurt het blad af: ongewapend metselwerk neemt geen
'trek op.</li>
'<li>E = 700·f<sub>k</sub> (NB bij 3.7.2). De kruip-excentriciteit e<sub>k</sub> is nul zolang
'λ ≤ λ<sub>c</sub> = 27 (NB bij 6.1.2.2(2)); boven die slankheid voldoet de wand al niet aan §5.5.1.4.</li>
'<li>K, α en β komen uit tabel NB-2 en hangen af van steensoort en morteltype. Tegen een referentie
'getoetst zijn kalkzandsteen + metselmortel, baksteen + lijmmortel en cellenbeton + lijmmortel.</li>
'<li>f<sub>m</sub> ≤ 2·f<sub>b</sub> bij metselmortel (NB bij 3.6.1.2) past het referentieprogramma niet
'toe; in de norm-stand wel (register punt 14).</li>
'<li>Een verticale randsteuning vervalt zodra L<sub>v</sub> ≥ 15·t (n = 3) respectievelijk
'L<sub>v</sub> ≥ 30·t (n = 4); beide grenzen zijn geverifieerd.</li>
'<li>N<sub>Ed,max</sub> komt uitsluitend voor in de minimale-excentriciteitstoets. Die toets
'behoudt de verticale randsteuning en wordt overgeslagen zodra de eerste toets al niet voldoet —
'precies zoals de referentie-uitwerking rapporteert.</li>
'<li>Nog niet vastgelegd: of die extra toets óók loopt wanneer de werkelijke excentriciteit
'gróter is dan de minimale (e<sub>m</sub> > e<sub>m2</sub>) en de eerste toets tóch voldoet. Dit blad
'voert hem dan uit — de veilige kant. Een referentie met bijvoorbeeld M<sub>mEd</sub> = 5 kNm en
'N<sub>Ed</sub> = 60 kN zou dat beslissen.</li>
'</ul></i>
`;
