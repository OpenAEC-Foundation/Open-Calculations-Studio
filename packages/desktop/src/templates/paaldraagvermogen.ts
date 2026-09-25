/**
 * Paaldraagvermogen — NEN 9997-1:2016+C2:2017, art. 7.6.2.3 (Koppejan).
 *
 * Per sondering het puntdraagvermogen uit de gemiddelde conusweerstanden
 * over de trajecten I, II en III (7.6.2.3(e)) en de schachtwrijving over ΔL
 * (7.6.2.3(c) en (i)), met α_p, α_s en α_t uit tabel 7.c. Karakteristiek met
 * ξ3 en ξ4 uit tabel A.10a of A.10b, rekenwaarde met γ_t uit tabel A.6 tot en
 * met A.8. Negatieve kleef volgens 7.3.2.2(d) als belasting op de paal, met
 * γ_f;nk = 1,0. Toets F_c;d + F_nk;d ≤ R_c;d (7.1).
 *
 * De blokken per sondering (1–6) en per laag met negatieve kleef (1–5) zijn
 * gelijk van opbouw; een wijziging hoort in alle blokken tegelijk. Geen
 * referentieberekening beschikbaar; scripts/check-paal.mjs rekent de
 * uitkomsten onafhankelijk na. Status in de catalogus: controleren.
 */

export const paaldraagvermogen = `"Paaldraagvermogen — NEN 9997-1 art. 7.6.2.3

'<i>Draagvermogen op druk van een paal uit sonderingen volgens de methode van Koppejan (NEN 9997-1 art. 7.6.2.3): per sondering het puntdraagvermogen en de schachtwrijving, daaruit de karakteristieke waarde met de correlatiefactoren ξ en de rekenwaarde met γ_t. De negatieve kleef telt mee als belasting op de paal (7.3.2.2).</i>

# 1. Paal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select paaltype "Paaltype en wijze van installeren (tabel 7.c)"
  Betonpaal, geprefabriceerd, geheid = 1
  Betonpaal in de grond gevormd, mantelbuis teruggeheid = 2
  Betonpaal in de grond gevormd, mantelbuis getrild = 3
  Betonpaal in de grond gevormd, schroefpunt, geschroefd = 4
  Avegaarpaal, geschroefd = 5
  Boorpaal met steunvloeistof = 6
  Stalen buispaal, gesloten punt, geheid = 7
  Stalen profiel of open buis, geheid = 8
  Stalen paal met schroefpunt, geschroefd = 9
  Groutschil rond buis met schroefpunt, geschroefd = 10
  Houten paal, constante doorsnede, geheid = 11
  Houten paal, taps, geheid = 12
@end

#hide
'Tabel 7.c: [type | α_p | α_s | α_t | in de grond gevormd (δ = φ)]
tab7c = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12 |0.7; 0.7; 0.7; 0.63; 0.56; 0.35; 0.70; 0.70; 0.56; 0.63; 0.7; 0.7 |0.010; 0.014; 0.012; 0.009; 0.006; 0.006; 0.010; 0.006; 0.006; 0.009; 0.010; 0.012 |0.007; 0.012; 0.010; 0.009; 0.0045; 0.0045; 0.007; 0.004; 0.0045; 0.009; 0.007; 0.007 |0; 1; 1; 1; 1; 1; 0; 0; 0; 1; 0; 0]
α_p = hlookup(tab7c; paaltype; 1; 2)
α_s = hlookup(tab7c; paaltype; 1; 3)
α_t = hlookup(tab7c; paaltype; 1; 4)
insitu = hlookup(tab7c; paaltype; 1; 5)
#show
α_p', paalklassefactor voor de punt'
α_s', schachtwrijving in zand en grind'

@select vorm "Doorsnede van de paalvoet"
  Rond = 1
  Vierkant = 2
  Rechthoekig = 3
@end
#if vorm ≡ 1
    D = ?*(mm)', middellijn'
    A_b = pi/4*D^2 to m^2', oppervlak van de paalpunt'
    O_s = pi*D to m', omtrek van de schacht'
    D_eq = D to m', equivalente middellijn'
    #hide
    s_p = 1
    #show
#else if vorm ≡ 2
    a_p = ?*(mm)', zijde'
    A_b = a_p^2 to m^2', oppervlak van de paalpunt'
    O_s = 4*a_p to m', omtrek van de schacht'
    D_eq = sqrt(4*A_b/pi) to m', equivalente middellijn: gelijk oppervlak'
    #hide
    s_p = 1
    #show
#else
    a_p = ?*(mm)', kleinste zijde'
    b_p = ?*(mm)', grootste zijde'
    A_b = a_p*b_p to m^2', oppervlak van de paalpunt'
    O_s = 2*(a_p + b_p) to m', omtrek van de schacht'
    D_eq = if(b_p > 1.5*a_p; a_p; sqrt(4*A_b/pi)) to m', equivalente middellijn; a als b > 1,5a (7.6.2.3(e))'
    s_p = ?', factor s voor de rechthoekige paalvoet (7.6.2.3(h))'
#end if
β = ?', paalvoetvormfactor (7.6.2.3(g), figuur 7.i); 1 zonder verbrede voet'

z_kop = ?*(m)', paalkopniveau t.o.v. NAP'
z_punt = ?*(m)', paalpuntniveau t.o.v. NAP'
L_paal = z_kop - z_punt to m', paallengte'

@select stijf "Het bouwwerk"
  Is niet stijf: geen herverdeling tussen de palen = 0
  Is stijf: belasting gaat van zwakke naar sterke palen = 1
@end

# 2. Draagvermogen per sondering

'<i>Per sondering de gemiddelde conusweerstanden over de trajecten I, II en III (7.6.2.3(e)) en de gemiddelde conusweerstand over het deel van de schacht met positieve schachtwrijving (7.6.2.3(i)). Pieken boven 12 MPa worden afgesnoten; bij een laag dikker dan 1 m op de laagste waarde in die laag, ten hoogste 15 MPa.</i>

n_s = ?', aantal sonderingen (1 tot en met 6)'
#if n_s ≥ 1
    '<h6>Sondering 1</h6>
    q_cI,1 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,1 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,1 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,1 = min(0.5*α_p*β*s_p*((q_cI,1 + q_cII,1)/2 + q_cIII,1); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,1 = A_b*q_bmax,1 to kN', puntdraagvermogen'
    q_cs,1 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_1 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,1 = O_s*α_s*min(q_cs,1; 15 MPa)*ΔL_1 to kN', schachtwrijving'
    R_ccal,1 = R_bcal,1 + R_scal,1 to kN', maximumdraagkracht bij sondering 1'
    #hide
    R_telt,1 = R_ccal,1
    R_laag,1 = R_ccal,1
    #show
#else
    #hide
    R_telt,1 = 0 kN
    R_laag,1 = 10^9 kN
    q_bmax,1 = 0 MPa
    R_bcal,1 = 0 kN
    R_scal,1 = 0 kN
    R_ccal,1 = 0 kN
    #show
#end if
#if n_s ≥ 2
    '<h6>Sondering 2</h6>
    q_cI,2 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,2 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,2 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,2 = min(0.5*α_p*β*s_p*((q_cI,2 + q_cII,2)/2 + q_cIII,2); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,2 = A_b*q_bmax,2 to kN', puntdraagvermogen'
    q_cs,2 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_2 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,2 = O_s*α_s*min(q_cs,2; 15 MPa)*ΔL_2 to kN', schachtwrijving'
    R_ccal,2 = R_bcal,2 + R_scal,2 to kN', maximumdraagkracht bij sondering 2'
    #hide
    R_telt,2 = R_ccal,2
    R_laag,2 = R_ccal,2
    #show
#else
    #hide
    R_telt,2 = 0 kN
    R_laag,2 = 10^9 kN
    q_bmax,2 = 0 MPa
    R_bcal,2 = 0 kN
    R_scal,2 = 0 kN
    R_ccal,2 = 0 kN
    #show
#end if
#if n_s ≥ 3
    '<h6>Sondering 3</h6>
    q_cI,3 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,3 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,3 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,3 = min(0.5*α_p*β*s_p*((q_cI,3 + q_cII,3)/2 + q_cIII,3); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,3 = A_b*q_bmax,3 to kN', puntdraagvermogen'
    q_cs,3 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_3 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,3 = O_s*α_s*min(q_cs,3; 15 MPa)*ΔL_3 to kN', schachtwrijving'
    R_ccal,3 = R_bcal,3 + R_scal,3 to kN', maximumdraagkracht bij sondering 3'
    #hide
    R_telt,3 = R_ccal,3
    R_laag,3 = R_ccal,3
    #show
#else
    #hide
    R_telt,3 = 0 kN
    R_laag,3 = 10^9 kN
    q_bmax,3 = 0 MPa
    R_bcal,3 = 0 kN
    R_scal,3 = 0 kN
    R_ccal,3 = 0 kN
    #show
#end if
#if n_s ≥ 4
    '<h6>Sondering 4</h6>
    q_cI,4 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,4 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,4 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,4 = min(0.5*α_p*β*s_p*((q_cI,4 + q_cII,4)/2 + q_cIII,4); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,4 = A_b*q_bmax,4 to kN', puntdraagvermogen'
    q_cs,4 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_4 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,4 = O_s*α_s*min(q_cs,4; 15 MPa)*ΔL_4 to kN', schachtwrijving'
    R_ccal,4 = R_bcal,4 + R_scal,4 to kN', maximumdraagkracht bij sondering 4'
    #hide
    R_telt,4 = R_ccal,4
    R_laag,4 = R_ccal,4
    #show
#else
    #hide
    R_telt,4 = 0 kN
    R_laag,4 = 10^9 kN
    q_bmax,4 = 0 MPa
    R_bcal,4 = 0 kN
    R_scal,4 = 0 kN
    R_ccal,4 = 0 kN
    #show
#end if
#if n_s ≥ 5
    '<h6>Sondering 5</h6>
    q_cI,5 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,5 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,5 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,5 = min(0.5*α_p*β*s_p*((q_cI,5 + q_cII,5)/2 + q_cIII,5); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,5 = A_b*q_bmax,5 to kN', puntdraagvermogen'
    q_cs,5 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_5 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,5 = O_s*α_s*min(q_cs,5; 15 MPa)*ΔL_5 to kN', schachtwrijving'
    R_ccal,5 = R_bcal,5 + R_scal,5 to kN', maximumdraagkracht bij sondering 5'
    #hide
    R_telt,5 = R_ccal,5
    R_laag,5 = R_ccal,5
    #show
#else
    #hide
    R_telt,5 = 0 kN
    R_laag,5 = 10^9 kN
    q_bmax,5 = 0 MPa
    R_bcal,5 = 0 kN
    R_scal,5 = 0 kN
    R_ccal,5 = 0 kN
    #show
#end if
#if n_s ≥ 6
    '<h6>Sondering 6</h6>
    q_cI,6 = ?*(MPa)', traject I: onder de paalpunt, 0,7 tot 4·D_eq, gekozen op de laagste q_b,max'
    q_cII,6 = ?*(MPa)', traject II: terug naar de paalpunt, nooit hoger dan de waarde eronder'
    q_cIII,6 = ?*(MPa)', traject III: tot 8·D_eq boven de paalpunt, nooit hoger dan de waarde eronder'
    q_bmax,6 = min(0.5*α_p*β*s_p*((q_cI,6 + q_cII,6)/2 + q_cIII,6); 15 MPa)', (7.6.2.3(e)), ten hoogste 15 MPa'
    R_bcal,6 = A_b*q_bmax,6 to kN', puntdraagvermogen'
    q_cs,6 = ?*(MPa)', gemiddelde afgesnoten conusweerstand over ΔL (7.6.2.3(i))'
    ΔL_6 = ?*(m)', lengte met positieve schachtwrijving (7.6.2.3(c))'
    R_scal,6 = O_s*α_s*min(q_cs,6; 15 MPa)*ΔL_6 to kN', schachtwrijving'
    R_ccal,6 = R_bcal,6 + R_scal,6 to kN', maximumdraagkracht bij sondering 6'
    #hide
    R_telt,6 = R_ccal,6
    R_laag,6 = R_ccal,6
    #show
#else
    #hide
    R_telt,6 = 0 kN
    R_laag,6 = 10^9 kN
    q_bmax,6 = 0 MPa
    R_bcal,6 = 0 kN
    R_scal,6 = 0 kN
    R_ccal,6 = 0 kN
    #show
#end if

# 3. Karakteristieke waarde en rekenwaarde

#hide
ksi = [1; 2; 3; 4; 5; 6 |1.39; 1.32; 1.30; 1.28; 1.28; 1.275 |1.39; 1.32; 1.30; 1.03; 1.03; 1.02 |1.26; 1.20; 1.18; 1.17; 1.17; 1.16 |1.26; 0.96; 0.94; 0.93; 0.93; 0.925]
n_ξ = min(max(n_s; 1); 6)
#show
R_ccal,gem = (R_telt,1 + R_telt,2 + R_telt,3 + R_telt,4 + R_telt,5 + R_telt,6)/n_s to kN', gemiddelde (R_c;cal)_gem'
R_ccal,min = min(R_laag,1; R_laag,2; R_laag,3; R_laag,4; R_laag,5; R_laag,6) to kN', laagste (R_c;cal)_min'
#if stijf ≡ 1
    ξ_3 = hlookup(ksi; n_ξ; 1; 4)', tabel A.10b (stijf bouwwerk)'
    ξ_4 = hlookup(ksi; n_ξ; 1; 5)', tabel A.10b'
#else
    ξ_3 = hlookup(ksi; n_ξ; 1; 2)', tabel A.10a (niet-stijf bouwwerk)'
    ξ_4 = hlookup(ksi; n_ξ; 1; 3)', tabel A.10a'
#end if
R_ck = min(R_ccal,gem/ξ_3; R_ccal,min/ξ_4) to kN', (7.8)'
#if n_s ≥ 2
    VC = sqrt((if(n_s ≥ 1; (R_ccal,1 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 2; (R_ccal,2 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 3; (R_ccal,3 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 4; (R_ccal,4 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 5; (R_ccal,5 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 6; (R_ccal,6 - R_ccal,gem)^2; 0 kN^2))/(n_s - 1))/R_ccal,gem', variatiecoëfficiënt van de draagkracht'
    #if VC > 0.12
        '<b style="color:#b91c1c">De variatiecoëfficiënt is groter dan 12 %: de ξ-waarden van tabel A.10 gelden dan niet. Deel het terrein op in gebieden met gelijksoortige sonderingen.</b>
    #end if
#else
    #hide
    VC = 0
    #show
#end if
γ_t = 1.2', tabel A.6, A.7 of A.8: berekend uit sonderingen'
R_cd = R_ck/γ_t to kN', rekenwaarde van de draagkracht'

# 4. Negatieve kleef

@select nk "Negatieve kleef (7.3.2.2)"
  Niet in rekening: maaiveldzakking na het installeren ten hoogste 0,1 m = 0
  In rekening: alleenstaande paal of palen in één rij (7.3.2.2(d)) = 1
@end
#if nk ≡ 1
    '<i>De negatieve kleef werkt in de samendrukbare lagen boven de draagkrachtige laag, van boven naar beneden: F<sub>nk;k</sub> = O<sub>s</sub>·Σ K<sub>0</sub>·tan δ·∫σ′<sub>v</sub> dz, met K<sub>0</sub> = 1 − sin φ′, δ = φ′ voor in de grond gevormde palen en 0,75·φ′ voor geprefabriceerde betonpalen, houten palen en palen met een stalen omhulling, en K<sub>0</sub>·tan δ ten minste 0,25.</i>
    z_mv = ?*(m)', bovenkant van de bovenste laag (maaiveld) t.o.v. NAP'
    d_gw = ?*(m)', grondwaterstand onder die bovenkant'
    q_mv = ?*(kPa)', gelijkmatige bovenbelasting op het maaiveld'
    n_l = ?', aantal lagen met negatieve kleef (1 tot en met 5)'
    #hide
    γ_w = 10 kN/m^3
    f_δ = if(insitu ≡ 1; 1; 0.75)
    #show
    #if n_l ≥ 1
        '<h6>Laag 1</h6>
        d_1 = ?*(m)', dikte'
        γ_1 = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand'
        γ_sat,1 = ?*(kN/m^3)', volumiek gewicht onder de grondwaterstand'
        φ_1 = ?', effectieve hoek van inwendige wrijving φ′_k, in graden'
        #hide
        z_t,1 = 0 m
        z_b,1 = z_t,1 + d_1
        a_1 = min(max(d_gw - z_t,1; 0 m); d_1)
        b_1 = d_1 - a_1
        σ_t,1 = q_mv
        σ_m,1 = σ_t,1 + γ_1*a_1
        σ_b,1 = σ_m,1 + (γ_sat,1 - γ_w)*b_1
        #show
        S_v,1 = (σ_t,1 + σ_m,1)/2*a_1 + (σ_m,1 + σ_b,1)/2*b_1 to kN/m', ∫σ′_v dz over de laag'
        K_0,1 = 1 - sin(φ_1*pi/180)', (7.3.2.2(d)), OCR = 1'
        δ_1 = f_δ*φ_1', wrijvingshoek paal–grond, in graden'
        c_nk,1 = max(K_0,1*tan(δ_1*pi/180); 0.25)', K_0·tan δ, ten minste 0,25'
        F_nk,1 = O_s*c_nk,1*S_v,1 to kN', bijdrage van laag 1'
    #else
        #hide
        z_b,1 = 0 m
        σ_b,1 = q_mv
        F_nk,1 = 0 kN
        #show
    #end if
    #if n_l ≥ 2
        '<h6>Laag 2</h6>
        d_2 = ?*(m)', dikte'
        γ_2 = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand'
        γ_sat,2 = ?*(kN/m^3)', volumiek gewicht onder de grondwaterstand'
        φ_2 = ?', effectieve hoek van inwendige wrijving φ′_k, in graden'
        #hide
        z_t,2 = z_b,1
        z_b,2 = z_t,2 + d_2
        a_2 = min(max(d_gw - z_t,2; 0 m); d_2)
        b_2 = d_2 - a_2
        σ_t,2 = σ_b,1
        σ_m,2 = σ_t,2 + γ_2*a_2
        σ_b,2 = σ_m,2 + (γ_sat,2 - γ_w)*b_2
        #show
        S_v,2 = (σ_t,2 + σ_m,2)/2*a_2 + (σ_m,2 + σ_b,2)/2*b_2 to kN/m', ∫σ′_v dz over de laag'
        K_0,2 = 1 - sin(φ_2*pi/180)', (7.3.2.2(d)), OCR = 1'
        δ_2 = f_δ*φ_2', wrijvingshoek paal–grond, in graden'
        c_nk,2 = max(K_0,2*tan(δ_2*pi/180); 0.25)', K_0·tan δ, ten minste 0,25'
        F_nk,2 = O_s*c_nk,2*S_v,2 to kN', bijdrage van laag 2'
    #else
        #hide
        z_b,2 = z_b,1
        σ_b,2 = σ_b,1
        F_nk,2 = 0 kN
        #show
    #end if
    #if n_l ≥ 3
        '<h6>Laag 3</h6>
        d_3 = ?*(m)', dikte'
        γ_3 = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand'
        γ_sat,3 = ?*(kN/m^3)', volumiek gewicht onder de grondwaterstand'
        φ_3 = ?', effectieve hoek van inwendige wrijving φ′_k, in graden'
        #hide
        z_t,3 = z_b,2
        z_b,3 = z_t,3 + d_3
        a_3 = min(max(d_gw - z_t,3; 0 m); d_3)
        b_3 = d_3 - a_3
        σ_t,3 = σ_b,2
        σ_m,3 = σ_t,3 + γ_3*a_3
        σ_b,3 = σ_m,3 + (γ_sat,3 - γ_w)*b_3
        #show
        S_v,3 = (σ_t,3 + σ_m,3)/2*a_3 + (σ_m,3 + σ_b,3)/2*b_3 to kN/m', ∫σ′_v dz over de laag'
        K_0,3 = 1 - sin(φ_3*pi/180)', (7.3.2.2(d)), OCR = 1'
        δ_3 = f_δ*φ_3', wrijvingshoek paal–grond, in graden'
        c_nk,3 = max(K_0,3*tan(δ_3*pi/180); 0.25)', K_0·tan δ, ten minste 0,25'
        F_nk,3 = O_s*c_nk,3*S_v,3 to kN', bijdrage van laag 3'
    #else
        #hide
        z_b,3 = z_b,2
        σ_b,3 = σ_b,2
        F_nk,3 = 0 kN
        #show
    #end if
    #if n_l ≥ 4
        '<h6>Laag 4</h6>
        d_4 = ?*(m)', dikte'
        γ_4 = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand'
        γ_sat,4 = ?*(kN/m^3)', volumiek gewicht onder de grondwaterstand'
        φ_4 = ?', effectieve hoek van inwendige wrijving φ′_k, in graden'
        #hide
        z_t,4 = z_b,3
        z_b,4 = z_t,4 + d_4
        a_4 = min(max(d_gw - z_t,4; 0 m); d_4)
        b_4 = d_4 - a_4
        σ_t,4 = σ_b,3
        σ_m,4 = σ_t,4 + γ_4*a_4
        σ_b,4 = σ_m,4 + (γ_sat,4 - γ_w)*b_4
        #show
        S_v,4 = (σ_t,4 + σ_m,4)/2*a_4 + (σ_m,4 + σ_b,4)/2*b_4 to kN/m', ∫σ′_v dz over de laag'
        K_0,4 = 1 - sin(φ_4*pi/180)', (7.3.2.2(d)), OCR = 1'
        δ_4 = f_δ*φ_4', wrijvingshoek paal–grond, in graden'
        c_nk,4 = max(K_0,4*tan(δ_4*pi/180); 0.25)', K_0·tan δ, ten minste 0,25'
        F_nk,4 = O_s*c_nk,4*S_v,4 to kN', bijdrage van laag 4'
    #else
        #hide
        z_b,4 = z_b,3
        σ_b,4 = σ_b,3
        F_nk,4 = 0 kN
        #show
    #end if
    #if n_l ≥ 5
        '<h6>Laag 5</h6>
        d_5 = ?*(m)', dikte'
        γ_5 = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand'
        γ_sat,5 = ?*(kN/m^3)', volumiek gewicht onder de grondwaterstand'
        φ_5 = ?', effectieve hoek van inwendige wrijving φ′_k, in graden'
        #hide
        z_t,5 = z_b,4
        z_b,5 = z_t,5 + d_5
        a_5 = min(max(d_gw - z_t,5; 0 m); d_5)
        b_5 = d_5 - a_5
        σ_t,5 = σ_b,4
        σ_m,5 = σ_t,5 + γ_5*a_5
        σ_b,5 = σ_m,5 + (γ_sat,5 - γ_w)*b_5
        #show
        S_v,5 = (σ_t,5 + σ_m,5)/2*a_5 + (σ_m,5 + σ_b,5)/2*b_5 to kN/m', ∫σ′_v dz over de laag'
        K_0,5 = 1 - sin(φ_5*pi/180)', (7.3.2.2(d)), OCR = 1'
        δ_5 = f_δ*φ_5', wrijvingshoek paal–grond, in graden'
        c_nk,5 = max(K_0,5*tan(δ_5*pi/180); 0.25)', K_0·tan δ, ten minste 0,25'
        F_nk,5 = O_s*c_nk,5*S_v,5 to kN', bijdrage van laag 5'
    #else
        #hide
        z_b,5 = z_b,4
        σ_b,5 = σ_b,4
        F_nk,5 = 0 kN
        #show
    #end if
    F_nk,k = F_nk,1 + F_nk,2 + F_nk,3 + F_nk,4 + F_nk,5 to kN', karakteristieke negatieve kleef'
    γ_fnk = 1.0', berekend volgens 7.3.2.2(d)'
    F_nk,d = γ_fnk*F_nk,k to kN
    #hide
    z_draag = z_mv - z_b,5
    #show
#else
    #hide
    F_nk,d = 0 kN
    z_mv = z_kop
    z_draag = z_kop
    n_l = 0
    #show
#end if

# 5. Toetsing (7.1)

F_c,d = ?*(kN)', rekenwaarde van de belasting op de paalkop (inclusief K_FI)'
F_s,d = F_c,d + F_nk,d to kN', belasting inclusief negatieve kleef'
UC = F_s,d/R_cd', F_c;d + F_nk;d ≤ R_c;d'

# 6. Tekening

#hide
'Verticaal: van het hoogste van paalkop en maaiveld tot 4·D_eq onder de paalpunt, plus marge.
z_top = max(z_kop; z_mv)
z_bot = z_punt - max(4*D_eq; 1 m) - 0.5 m
sch = 380/max((z_top - z_bot)/(1 m); 1)
Y(z) = 30 + (z_top - z)/(1 m)*sch
px = 250
pw = max(8; min(40; D_eq/(1 m)*sch*1.5))
#show
'<svg viewbox="0 0 480 440" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:450px;">
'  <!-- draagkrachtige laag -->
'  <rect x="60" y="'Y(z_draag)'" width="360" height="'Y(z_bot) - Y(z_draag)'" style="fill:#fde68a; stroke:none; opacity:0.55"/>
'  <text x="66" y="'Y(z_draag) + 14'" style="fill:#92400e">draagkrachtige laag</text>
#if nk ≡ 1
    '  <!-- lagen met negatieve kleef -->
    '  <rect x="60" y="'Y(z_mv)'" width="360" height="'Y(z_draag) - Y(z_mv)'" style="fill:#d6c7a1; stroke:none; opacity:0.55"/>
    '  <text x="66" y="'Y(z_mv) + 14'" style="fill:#6b4f1d">samendrukbare lagen</text>
    '  <line x1="60" y1="'Y(z_mv)'" x2="420" y2="'Y(z_mv)'" style="stroke:#374151; stroke-width:1.4"/>
    '  <text x="424" y="'Y(z_mv) + 4'" style="fill:#374151">NAP 'z_mv'</text>
    '  <line x1="60" y1="'Y(z_mv - d_gw)'" x2="160" y2="'Y(z_mv - d_gw)'" style="stroke:#2563eb; stroke-width:1; stroke-dasharray:5 3"/>
    '  <text x="66" y="'Y(z_mv - d_gw) - 3'" style="fill:#2563eb">grondwater</text>
    '  <line x1="'px - pw/2 - 14'" y1="'Y(z_mv) + 12'" x2="'px - pw/2 - 14'" y2="'Y(z_draag) - 6'" style="stroke:#b91c1c; stroke-width:1.6"/>
    '  <polygon points="'px - pw/2 - 14','Y(z_draag) - 2' 'px - pw/2 - 18','Y(z_draag) - 10' 'px - pw/2 - 10','Y(z_draag) - 10'" style="fill:#b91c1c"/>
    '  <text x="'px - pw/2 - 20'" y="'(Y(z_mv) + Y(z_draag))/2'" text-anchor="end" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">nk;d</tspan> = 'F_nk,d' kN</text>
#end if
'  <line x1="60" y1="'Y(z_draag)'" x2="420" y2="'Y(z_draag)'" style="stroke:#92400e; stroke-width:1"/>
'  <!-- trajecten I, II en III rond de paalpunt -->
'  <rect x="'px - pw/2 - 30'" y="'Y(z_punt)'" width="'pw + 60'" height="'Y(z_punt - 4*D_eq) - Y(z_punt)'" style="fill:#fca5a5; opacity:0.35; stroke:#b91c1c; stroke-width:0.6; stroke-dasharray:3 2"/>
'  <rect x="'px - pw/2 - 30'" y="'Y(z_punt + 8*D_eq)'" width="'pw + 60'" height="'Y(z_punt) - Y(z_punt + 8*D_eq)'" style="fill:#93c5fd; opacity:0.30; stroke:#2563eb; stroke-width:0.6; stroke-dasharray:3 2"/>
'  <text x="'px + pw/2 + 34'" y="'(Y(z_punt) + Y(z_punt - 4*D_eq))/2 + 4'" style="fill:#b91c1c">I en II: tot 4·D<tspan baseline-shift="sub" font-size="8">eq</tspan> eronder</text>
'  <text x="'px + pw/2 + 34'" y="'(Y(z_punt) + Y(z_punt + 8*D_eq))/2 + 4'" style="fill:#2563eb">III: 8·D<tspan baseline-shift="sub" font-size="8">eq</tspan> erboven</text>
'  <!-- de paal -->
'  <rect x="'px - pw/2'" y="'Y(z_kop)'" width="'pw'" height="'Y(z_punt) - Y(z_kop)'" style="fill:#cbd5e1; stroke:#334155; stroke-width:1.4"/>
'  <text x="'px - pw/2 - 6'" y="'Y(z_kop) + 4'" text-anchor="end" style="fill:#334155">NAP 'z_kop'</text>
'  <text x="'px - pw/2 - 6'" y="'Y(z_punt) + 4'" text-anchor="end" style="fill:#334155; font-weight:700">NAP 'z_punt'</text>
'  <!-- belasting op de paalkop -->
'  <line x1="'px'" y1="'Y(z_kop) - 26'" x2="'px'" y2="'Y(z_kop) - 7'" style="stroke:#b91c1c; stroke-width:2.6"/>
'  <polygon points="'px','Y(z_kop) - 1' 'px - 5','Y(z_kop) - 11' 'px + 5','Y(z_kop) - 11'" style="fill:#b91c1c"/>
'  <text x="'px + 8'" y="'Y(z_kop) - 16'" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">c;d</tspan> = 'F_c,d' kN</text>
'  <!-- draagkracht onder de punt -->
'  <line x1="'px'" y1="'Y(z_punt) + 30'" x2="'px'" y2="'Y(z_punt) + 7'" style="stroke:#047857; stroke-width:2.6"/>
'  <polygon points="'px','Y(z_punt) + 1' 'px - 5','Y(z_punt) + 11' 'px + 5','Y(z_punt) + 11'" style="fill:#047857"/>
'  <text x="'px + 8'" y="'Y(z_punt) + 30'" style="fill:#047857; font-weight:700">R<tspan baseline-shift="sub" font-size="8">c;d</tspan> = 'R_cd' kN</text>
'</svg>'

# 7. Samenvatting

'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Grootheid</th><th style="text-align:right; padding:4px 8px;">Waarde</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Maximumdraagkracht, gemiddeld en laagst</td><td style="padding:4px 8px; text-align:right;">'R_ccal,gem' / 'R_ccal,min' kN</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Karakteristiek R<sub>c;k</sub> (ξ<sub>3</sub> = 'ξ_3', ξ<sub>4</sub> = 'ξ_4')</td><td style="padding:4px 8px; text-align:right;">'R_ck' kN</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Rekenwaarde R<sub>c;d</sub> (γ<sub>t</sub> = 'γ_t')</td><td style="padding:4px 8px; text-align:right;">'R_cd' kN</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Belasting F<sub>c;d</sub> + F<sub>nk;d</sub></td><td style="padding:4px 8px; text-align:right;">'F_c,d' + 'F_nk,d' = 'F_s,d' kN</td></tr>
'</table>

#if UC ≤ 1.0
    '<b>Maatgevende UC = 'UC'</b><span style="color: green"> ≤ 1,0 → <b>de paal voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC'</b><span style="color: red"> > 1,0 → <b>de paal voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten en vereenvoudigingen:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>De gemiddelde conusweerstanden over de trajecten I, II en III en over ΔL komen uit de sonderingen; bepaal ze volgens 7.6.2.3(e) en (i) tot en met (k), met de reducties voor grof zand en grind waar dat van toepassing is.</li><li>ΔL is het deel van de schacht waarover positieve schachtwrijving meetelt (7.6.2.3(c)); in de lagen met negatieve kleef telt ze niet mee. Schachtwrijving in klei, leem en veen (tabel 7.d) is hier niet opgenomen.</li><li>Negatieve kleef in een paalgroep (7.3.2.2(e)) is niet uitgewerkt: de berekening volgens (d) ligt voor palen binnen een groep aan de veilige kant.</li><li>Het eigen gewicht van de paal en de gronddruk op paalpuntniveau zijn tegen elkaar weggestreept (7.6.2.1(2)); bij veel negatieve kleef of een lichte grond is dat niet toegestaan.</li><li>De zakking van de paal (7.6.4), het ponsen in een slappe laag onder de punt (7.6.2.1(11)) en de sterkte van de paal zelf zijn niet getoetst.</li></ul>
`;
