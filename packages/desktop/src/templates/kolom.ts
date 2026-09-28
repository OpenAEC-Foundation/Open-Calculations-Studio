/**
 * Houten kolom op druk + buiging volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking (KOLOMBEREKENING): druk ∥ vezel §6.1.4,
 * gecombineerde druk + buiging §6.2.4, afschuiving §6.1.7, knik §6.3.2 en
 * kip + knik §6.3.3. KolomDesigner.tsx leest de uitkomsten van dit blad.
 * Belastingen zijn rekenwaarden, dus dit blad kent geen belastingcombinaties.
 *
 * Gecalibreerd op zes referentieberekeningen — zie scripts/check-kolom.mjs.
 *
 * Uit de referentiebladen afgeleide keuzes van de referentie-uitwerking:
 *   • M_y,Ed is het **werkelijke extreem** van het momentenverloop, niet
 *     max|M_A;M_B| + q_z·L²/8. Met M_A = 5, M_B = 3, q_z = 2 en L = 3200 ligt het
 *     maximum op x = 1287,5 mm en is M = 6,658 kNm; de superpositie zou 7,56
 *     geven. Bij een negatieve q_z ligt het negatieve extreem in het veld, dus
 *     telt |M_veld|. V_Ed = |q_z|·L/2 + |M_A − M_B|/L (document4: 3,2 + 0,625).
 *   • k_h werkt op de buigsterkte: om de y-as met h, om de z-as met b, beide op de
 *     ruwe f_m,k (niet cumulatief). document4 (44×144) geeft f_m,y,d = 11,17
 *     (k_h = 1,008) en f_m,z,d = 14,16 N/mm² (k_h = 1,278). f_c,0,d krijgt géén
 *     k_h, en λ_rel,m rekent met de ruwe f_m,k = 24.
 *   • l_ef (§6.3.3) = 0,9·L + 2h, begrensd op L — met de KOLOMLENGTE, niet met de
 *     ingevoerde ongesteunde lengte L_cr. document4 heeft L_cr = 1600 en rekent
 *     toch met 0,9 × 3200 + 2 × 144 = 3168 mm. Splitspunt: de norm-stand neemt
 *     max(L; L_cr).
 *   • Afschuiving over de volle breedte: τ_d = V_Ed·S_y/(b·I_y). Dat is k_cr =
 *     1,0, de waarde voor een prismatische doorsnede (NB art. 6.1.7(2)); geen
 *     splitspunt, beide standen rekenen zo.
 *   • Klimaatklasse 2 geeft exact dezelfde uitkomsten als klasse 1 (document5):
 *     k_mod is voor beide gelijk en dit blad toetst geen doorbuiging.
 *   • Dit blad kent geen belasting om de zwakke as; de termen met σ_m,z,d vallen
 *     daarom uit (6.19), (6.20), (6.23) en (6.24) weg.
 *
 * Toepassingen (keuze kolomsoort). De eerste is het blad hierboven en de
 * standaard: een blad van vóór deze keuze rekent na bijwerken precies zo.
 *   1  kolom — belastingen als rekenwaarden;
 *   2  gevelstijl — wind loodrecht op de gevel als verdeelde last plus een
 *      normaalkracht. q_p uit de projectgegevens (windgebied, terreincategorie,
 *      ontwerplevensduur; dezelfde keten als de stalen gevelkolom) of zelf
 *      ingevuld; c_pe zelf ingevuld, c_pi = +0,2 of −0,3 (7.2.9(6)) en de
 *      ongunstigste van druk en zuiging. Wind is kort (tabel 2.2 NB), dus k_mod
 *      voor kort in de combinatie met wind (3.1.3(2)); de combinatie zonder wind
 *      toetst de grootste normaalkracht op knik met k_mod van de gekozen klasse;
 *   3  stempel — tijdelijke ondersteuning onder een juk: blijvende en
 *      veranderlijke last (lijnlast × h.o.h. of puntlast), 6.10a/6.10b bij de
 *      gevolgklasse, belastingsduurklasse kort, beide einden scharnierend. Als
 *      optie een stalen schroefstempel: de waarde uit de tabel van de leverancier
 *      bij de uitschuiflengte vult de gebruiker in — een toelaatbare last tegen de
 *      karakteristieke combinatie (6.14b), of een rekenwaarde tegen N_Ed.
 * Voor 2 en 3 bestaat geen referentieblad; check-kolom.mjs rekent ze met de hand na.
 */

export const kolom = `"Houten kolom — druk + buiging (EN 1995-1-1 §6.3.2/§6.3.3)

@select kolomsoort "Toepassing"
  Kolom, belastingen als rekenwaarden = 1
  Gevelstijl, wind loodrecht op de gevel met normaalkracht = 2
  Stempel, tijdelijke ondersteuning = 3
@end
#if kolomsoort ≡ 3
    @select stempeltype "Stempel"
      Houten stempel = 1
      Stalen schroefstempel = 2
    @end
    #hide
    hout = if(stempeltype ≡ 1; 1; 0)
    #show
#else
    #hide
    hout = 1
    #show
#end if

#if kolomsoort ≡ 2
'<i>Gevelstijl met onderscharnier en bovenoplegging, belast door wind loodrecht op de gevel en
'een normaalkracht N<sub>Ed</sub>. Het blad rekent de wind om naar een verdeelde last q<sub>z,Ed</sub> op de stijl.</i>
#else if kolomsoort ≡ 3
'<i>Stempel onder een juk: een tijdelijke ondersteuning, aan beide einden scharnierend, alleen op druk
'belast en met een korte belastingsduur.</i>
#else
'<i>Kolom met onderscharnier en bovenoplegging, belast door N<sub>Ed</sub>, eindmomenten en
'een verdeelde dwarslast q<sub>z,Ed</sub>. Belastingen zijn rekenwaarden.</i>
#end if

#if hout ≡ 1
# 1. Profiel & materiaal

@select profiel "Profielnaam (b×h)"
  38×140 = 1
  45×145 = 2
  45×195 = 3
  63×175 = 4
  75×175 = 5
  75×225 = 6
  100×100 = 7
  100×200 = 8
  100×300 = 9
  150×150 = 10
  44×144 = 11
  44×194 = 12
@end

@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
@end

@select klimaatklasse "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

#if kolomsoort ≡ 3
    #hide
    duurklasse = 3
    #show
#else
@select duurklasse "Belastingsduurklasse"
  Blijvend = 1
  Middellang = 2
  Kort = 3
@end
#end if

#hide
'Profielmatrix [id | b(mm) | h(mm)]
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12 |38; 45; 45; 63; 75; 75; 100; 100; 100; 150; 44; 44 |140; 145; 195; 175; 175; 225; 100; 200; 300; 150; 144; 194]
'Materiaalmatrix [id | f_m,k | f_c,0,k | f_v,k | E_0,mean | E_0,05]
materialen = [1; 2; 3 |18; 24; 30 |18; 21; 23 |3.4; 4.0; 4.0 |9000; 11000; 12000 |6000; 7400; 8000]
'k_mod gezaagd hout [duurklasse | klimaatklasse 1-2 | klimaatklasse 3]
kmods = [1; 2; 3 |0.60; 0.80; 0.90 |0.50; 0.65; 0.70]
b_k = hlookup(profielen; profiel; 1; 2)*mm
h_k = hlookup(profielen; profiel; 1; 3)*mm
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_c0k = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
f_vk = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 5)*N/mm^2
E_005 = hlookup(materialen; sterkteklasse; 1; 6)*N/mm^2
γ_M = 1.30
k_m = 0.7
beta_c = 0.2
k_cr = 1.0
'Een gevelstijl rekent met wind en een stempel is tijdelijk: beide met k_mod voor kort.
duur_k = if(kolomsoort ≡ 1; duurklasse; 3)
k_mod = if(klimaatklasse ≡ 3; hlookup(kmods; duur_k; 1; 3); hlookup(kmods; duur_k; 1; 2))
k_mod_N = if(klimaatklasse ≡ 3; hlookup(kmods; duurklasse; 1; 3); hlookup(kmods; duurklasse; 1; 2))
k_hy = if(h_k < 150*mm; min((150*mm/h_k)^0.2; 1.3); 1)
k_hz = if(b_k < 150*mm; min((150*mm/b_k)^0.2; 1.3); 1)
#show

'<h6>Gekozen profiel en materiaal</h6>
b_k
h_k
f_mk
f_c0k
f_vk
E_005
#if kolomsoort ≡ 2
    '<i>Wind is een korte belasting (tabel 2.2 NB): in de combinatie met wind geldt k<sub>mod</sub> voor kort (art. 3.1.3(2)). De gekozen belastingsduurklasse hoort bij de combinatie zonder wind (§9.4).</i>
#else if kolomsoort ≡ 3
    '<i>Een stempel is een tijdelijke ondersteuning: belastingsduurklasse kort (tabel 2.1), dus k<sub>mod</sub> voor kort.</i>
    '<i>Staat de stempel langer dan een week, reken hem dan als kolom met de passende belastingsduurklasse.</i><span class="alleen-scherm"></span>
#end if
k_mod
k_hy', hoogtefactor §3.2(3) met h, alleen op de buigsterkte'
k_hz', met b'
f_myd = k_mod*f_mk*k_hy/γ_M', rekenwaarde buigsterkte om de y-as'
f_mzd = k_mod*f_mk*k_hz/γ_M', rekenwaarde buigsterkte om de z-as'
f_c0d = k_mod*f_c0k/γ_M', rekenwaarde druksterkte ∥ vezel'
f_vd = k_mod*f_vk/γ_M', rekenwaarde afschuifsterkte'

# 2. Doorsnede-eigenschappen

A = b_k*h_k
I_y = b_k*h_k^3/12', traagheidsmoment sterke as'
I_z = h_k*b_k^3/12', traagheidsmoment zwakke as'
W_y = I_y/(h_k/2)
S_y = b_k*h_k^2/8', statisch moment halve doorsnede'
i_y = sqrt(I_y/A)', traagheidsstraal om de y-as'
i_z = sqrt(I_z/A)', traagheidsstraal om de z-as'
#else
# 1. Stalen schroefstempel

'<i>Het draagvermogen van een stalen schroefstempel staat per uitschuiflengte in de tabel van de leverancier; knik van de buis en de sterkte van de schroef zitten in die waarde. Het blad toetst de last in de stempel tegen de waarde die hieronder is ingevuld.</i>

@select stempelwaarde "Soort waarde in de tabel"
  Toelaatbare last (gebruiksbelasting) = 1
  Rekenwaarde van het draagvermogen = 2
@end

# 2. Waarde bij de uitschuiflengte

F_tabel = ?*(kN)', waarde uit de tabel bij de uitschuiflengte L (§3)'
'<i>Valt de uitschuiflengte tussen twee tabelregels, neem dan de regel met de grotere lengte: die geeft de kleinere last.</i><span class="alleen-scherm"></span>
#end if

# 3. Geometrie

L = ?*(mm)', kolomlengte'
#if kolomsoort ≡ 3
    '<i>L is de lengte van de stempel tussen voet en juk, bij een stalen schroefstempel de uitschuiflengte. Beide einden zijn scharnierend en de stempel is tussen de einden niet gesteund: L<sub>cr,y</sub> = L<sub>cr,z</sub> = L.</i>
    #hide
    Lcr_y = L
    Lcr_z = L
    Lcr = L
    #show
#else
Lcr_y = ?*(mm)', kniklengte om de y-as'
Lcr_z = ?*(mm)', kniklengte om de z-as'
Lcr = ?*(mm)', ongesteunde lengte (kip)'
#end if

#if kolomsoort ≡ 1
# 4. Belastingen (rekenwaarden)
#else
# 4. Belastingen
#end if

#if kolomsoort ≡ 3
    @select stempellast "Belasting op de stempel"
      Lijnlast op het juk × hart-op-hartafstand van de stempels = 1
      Puntlast op de stempel = 2
    @end
    #if stempellast ≡ 1
        g_juk = ?*(kN/m)', blijvende lijnlast op het juk, karakteristiek'
        q_juk = ?*(kN/m)', veranderlijke lijnlast op het juk, karakteristiek'
        a_stempel = ?*(m)', hart-op-hartafstand van de stempels onder het juk'
        F_Gk = g_juk*a_stempel to kN', blijvende last per stempel'
        F_Qk = q_juk*a_stempel to kN', veranderlijke last per stempel'
    #else
        F_Gk_st = ?*(kN)', blijvende puntlast, karakteristiek'
        F_Qk_st = ?*(kN)', veranderlijke puntlast, karakteristiek'
        #hide
        F_Gk = F_Gk_st
        F_Qk = F_Qk_st
        #show
    #end if
    psi_0 = ?', ψ<sub>0</sub> van de veranderlijke last: tabel NB.2 – A1.1 van NEN-EN 1990, tijdens de uitvoering NEN-EN 1991-1-6 bijlage A1'
    #hide
    γ_Ga = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
    γ_Gb = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
    γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
    M_yA_Ed = 0*(kN*m)
    M_yB_Ed = 0*(kN*m)
    q_z_Ed = 0*(kN/m)
    #show
    γ_Ga', 6.10a, bij de gevolgklasse uit de projectgegevens (tabel NB.4 of NB.5 van NEN-EN 1990)'
    γ_Gb', 6.10b'
    γ_Q
    N_Ed_a = γ_Ga*F_Gk + γ_Q*psi_0*F_Qk to kN', (6.10a)'
    N_Ed_b = γ_Gb*F_Gk + γ_Q*F_Qk to kN', (6.10b)'
    N_Ed = max(N_Ed_a; N_Ed_b) to kN', rekenwaarde van de drukkracht in de stempel'
    #if hout ≡ 1
        '<i>De stempel is alleen op druk belast: de toetsen met buiging en afschuiving (§7, §8 en §10) dragen niets bij en knik (§9) is maatgevend.</i><span class="alleen-scherm"></span>
    #else if stempelwaarde ≡ 1
        F_rep = F_Gk + F_Qk to kN', karakteristieke combinatie (6.14b), zonder belastingsfactoren'
    #end if
#else
N_Ed = ?*(kN)', normaalkracht (druk)'
#if kolomsoort ≡ 2
    N_Ed_max = ?*(kN)', grootste normaalkracht, in de combinatie zonder wind'
    '<i>N<sub>Ed</sub> hoort bij de combinatie met wind als hoofdbelasting, N<sub>Ed,max</sub> bij de combinatie zonder wind (ψ<sub>0</sub> = 0 voor wind); beide zijn rekenwaarden.</i>
    '<h6>Wind loodrecht op de gevel (NEN-EN 1991-1-4 met NB)</h6>
    @select qp_bron "Extreme stuwdruk q_p"
      Uit de projectgegevens (windgebied en terreincategorie) = 1
      Zelf invullen = 2
    @end
    #if qp_bron ≡ 1
        z_gevel = ?*(m)', hoogte van het gebouw, referentiehoogte z<sub>e</sub> (figuur 7.4)'
        #hide
        vb0_ruw = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
        z0_ruw = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
        zmin_ruw = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
        ze_ruw = max(z_gevel/(1*m); zmin_ruw)
        verh = ze_ruw/z0_ruw
        K_prob = if(windgebied ≡ 1; 0.2; if(windgebied ≡ 2; 0.234; 0.281))
        t_prob = max(DesignLife; 50)
        cprob_ruw = sqrt((1 - K_prob*log(-log(1 - 1/t_prob)))/(1 - K_prob*log(-log(0.98))))
        vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*cprob_ruw*vb0_ruw
        #show
        v_b0 = vb0_ruw*(m/s)', basiswindsnelheid (tabel NB.1); c_dir = c_season = 1'
        #if DesignLife > 50
            c_prob = cprob_ruw', ontwerplevensduur boven 50 jaar: (4.2) met p = 1/t, K uit tabel NB.2 en n = 0,5 (opmerking 4 bij 4.2)'
        #end if
        z_e = ze_ruw*(m)', gehanteerde hoogte, ten minste z_min (tabel NB.3-4.1)'
        k_r = 0.19*(z0_ruw/0.05)^0.07', terreinfactor (4.5)'
        c_r = k_r*log(verh)', ruwheidsfactor (4.4); c_o = 1'
        v_m = vm_ruw*(m/s)', gemiddelde windsnelheid (4.3)'
        I_v = 1/log(verh)', turbulentie-intensiteit (4.7); k_l = 1'
        q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', extreme stuwdruk (4.8), ρ = 1,25 kg/m³'
    #else
        q_p_in = ?*(kN/m^2)', extreme stuwdruk, zelf ingevuld'
        #hide
        q_p = q_p_in
        #show
    #end if
    c_pe_d = ?', c<sub>pe</sub> bij winddruk op de gevel; zone D: +0,8 tot +1,0 (tabel NB.6 – 7.1)'
    c_pe_z = ?', c<sub>pe</sub> bij windzuiging; zone A: −1,2 tot −1,4, B: −0,8 tot −1,1, E: −0,5 tot −0,7'
    b_gevel = ?*(m)', belaste breedte: hart-op-hartafstand van de stijlen'
    '<i>Van c<sub>pe</sub> telt de grootte; c<sub>pe</sub> hoort bij de belaste oppervlakte (figuur 7.2).</i><span class="alleen-scherm"></span>
    w_d = (abs(c_pe_d) + 0.3)*q_p to kN/m^2', netto winddruk, met c<sub>pi</sub> = −0,3'
    w_z = (abs(c_pe_z) + 0.2)*q_p to kN/m^2', netto windzuiging, met c<sub>pi</sub> = +0,2 (7.2.9(6))'
    w_k = max(w_d; w_z) to kN/m^2', ongunstigste van druk en zuiging'
    #hide
    γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
    M_yA_Ed = 0*(kN*m)
    M_yB_Ed = 0*(kN*m)
    #show
    γ_Q', bij de gevolgklasse uit de projectgegevens (tabel NB.4 of NB.5 van NEN-EN 1990)'
    q_z_Ed = γ_Q*w_k*b_gevel to kN/m', rekenwaarde van de windlast op de stijl'
    '<i class="ook-afdruk">De kiptoets (§10) neemt aan dat de gedrukte rand over de kiplengte vrij is; steunt de gevelbekleding die rand bij winddruk, dan ligt dat aan de veilige kant.</i><span class="alleen-scherm"></span>
#else
M_yA_Ed = ?*(kN*m)', moment bovenzijde A'
M_yB_Ed = ?*(kN*m)', moment onderzijde B'
q_z_Ed = ?*(kN/m)', verdeelde dwarslast'
#end if
#end if

#hide
'Zonder kolomlengte rekent de houten kolom niet: een leeg veld of een nul gaf
'overal NaN in plaats van een uitkomst.
ok_inv = if(hout ≡ 1; bool(L > 0 mm); 1)
'De toetsing hieronder staat zonder inspringen: de takken _ref en _nb horen op
'de eerste kolom (scripts/check-rekenwijze.mjs).
#show
#if ok_inv ≡ 0
    '<b style="color:#b91c1c">De invoer is onvolledig: de kolomlengte groter dan 0.</b>
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>'if(kolomsoort ≡ 2; "de gevelstijl"; if(kolomsoort ≡ 3; "de stempel"; "de kolom"))' is niet getoetst: invoer onvolledig</b></span>
#else
#if hout ≡ 1
# 5. Snedekrachten en spanningen

'<i>M<sub>y,Ed</sub> is het grootste absolute moment langs de kolom: aan een van de einden of
'in het veld op x* = L/2 + (M<sub>B</sub>−M<sub>A</sub>)/(q<sub>z</sub>L).</i>
#hide
'Geen deling door nul als er geen dwarslast is; die tak valt hieronder toch weg.
q_veilig = if(q_z_Ed ≡ 0*(kN/m); 1*(kN/m); q_z_Ed)
dx = (M_yB_Ed - M_yA_Ed)/(q_veilig*L) to mm
x_rauw = if(q_z_Ed ≡ 0*(kN/m); L/2; L/2 + dx)
x_m = min(L; max(0*mm; x_rauw))', plaats van het extreem'
M_veld = M_yA_Ed*(1 - x_m/L) + M_yB_Ed*(x_m/L) + q_z_Ed*x_m*(L - x_m)/2 to kN*m
#show
M_yEd = max(abs(M_veld); abs(M_yA_Ed); abs(M_yB_Ed)) to kN*m
V_Ed = abs(q_z_Ed)*L/2 + abs(M_yA_Ed - M_yB_Ed)/L to kN

σ_c0d = N_Ed/A to N/mm^2', drukspanning ∥ vezel'
σ_myd = M_yEd/W_y to N/mm^2', buigspanning om de y-as'
#hide
τ_d = V_Ed*S_y/(k_cr*b_k*I_y) to N/mm^2
#show
τ_d', schuifspanning V·S/(k_cr·b·I) met k_cr = 1,0 (NB art. 6.1.7(2))'

# 6. Druk ∥ vezel — §6.1.4 (6.2)

UC_62 = σ_c0d/f_c0d
#if UC_62 ≤ 1.0
    'UC<sub>6.2</sub> = σ<sub>c,0,d</sub>/f<sub>c,0,d</sub> = 'UC_62'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.2</sub> = σ<sub>c,0,d</sub>/f<sub>c,0,d</sub> = 'UC_62'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 7. Gecombineerde buig- en axiale drukspanningen — §6.2.4

UC_619 = (σ_c0d/f_c0d)^2 + σ_myd/f_myd
UC_620 = (σ_c0d/f_c0d)^2 + k_m*σ_myd/f_myd
#if UC_619 ≤ 1.0
    'UC<sub>6.19</sub> = (σ<sub>c,0,d</sub>/f<sub>c,0,d</sub>)² + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_619'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.19</sub> = (σ<sub>c,0,d</sub>/f<sub>c,0,d</sub>)² + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_619'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if
#if UC_620 ≤ 1.0
    'UC<sub>6.20</sub> = (σ<sub>c,0,d</sub>/f<sub>c,0,d</sub>)² + k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_620'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.20</sub> = (σ<sub>c,0,d</sub>/f<sub>c,0,d</sub>)² + k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_620'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 8. Afschuiving — §6.1.7 (6.13)

UC_613 = τ_d/f_vd
#if UC_613 ≤ 1.0
    'UC<sub>6.13</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_613'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.13</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_613'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 9. Knik — §6.3.2

'<h6>9.1 Slankheid (6.21)/(6.22)</h6>
λ_y = Lcr_y/i_y
λ_z = Lcr_z/i_z
λ_rel_y = λ_y/pi*sqrt(f_c0k/E_005)', (6.21)'
λ_rel_z = λ_z/pi*sqrt(f_c0k/E_005)', (6.22)'

'<h6>9.2 Knikreductiefactoren (6.25)-(6.28), β<sub>c</sub> = 0,2</h6>
k_y = 0.5*(1 + beta_c*(λ_rel_y - 0.3) + λ_rel_y^2)', (6.27)'
k_z = 0.5*(1 + beta_c*(λ_rel_z - 0.3) + λ_rel_z^2)', (6.28)'
#if λ_rel_y ≤ 0.3
    k_cy = 1', λ_rel,y ≤ 0,3'
#else
    k_cy = 1/(k_y + sqrt(k_y^2 - λ_rel_y^2))', (6.25)'
#end if
#if λ_rel_z ≤ 0.3
    k_cz = 1', λ_rel,z ≤ 0,3'
#else
    k_cz = 1/(k_z + sqrt(k_z^2 - λ_rel_z^2))', (6.26)'
#end if

'<h6>9.3 Toetsing (6.23)/(6.24)</h6>
UC_623 = σ_c0d/(k_cy*f_c0d) + σ_myd/f_myd
UC_624 = σ_c0d/(k_cz*f_c0d) + k_m*σ_myd/f_myd
#if UC_623 ≤ 1.0
    'UC<sub>6.23</sub> = σ<sub>c,0,d</sub>/(k<sub>c,y</sub>f<sub>c,0,d</sub>) + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_623'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.23</sub> = σ<sub>c,0,d</sub>/(k<sub>c,y</sub>f<sub>c,0,d</sub>) + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_623'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if
#if UC_624 ≤ 1.0
    'UC<sub>6.24</sub> = σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) + k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_624'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.24</sub> = σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) + k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_624'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if
#if kolomsoort ≡ 2
    '<h6>9.4 Zonder wind: de grootste normaalkracht, zonder buiging</h6>
    k_mod_N', bij de gekozen belastingsduurklasse (§1)'
    f_c0d_N = k_mod_N*f_c0k/γ_M to N/mm^2
    σ_c0d_N = N_Ed_max/A to N/mm^2
    UC_N = σ_c0d_N/(min(k_cy; k_cz)*f_c0d_N)
    #if UC_N ≤ 1.0
        'UC<sub>N</sub> = σ<sub>c,0,d</sub>/(k<sub>c</sub>f<sub>c,0,d</sub>) = 'UC_N'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>N</sub> = σ<sub>c,0,d</sub>/(k<sub>c</sub>f<sub>c,0,d</sub>) = 'UC_N'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#end if

# 10. Kip in combinatie met knik — §6.3.3

'<i>Kiplengte volgens tabel 6.1: 0,9·L + 2h (last aan de drukzijde), begrensd op de lengte zelf.</i>
#hide
L_kip_ref = L
L_kip_nb = max(L; Lcr)
L_kip = if(rekenwijze ≡ 1; L_kip_ref; L_kip_nb)
#show
#if rekenwijze ≡ 1
    L_kip', de kolomlengte L'
    #if Lcr > L
        '<b>Let op:</b> L<sub>cr</sub> > L telt hier niet mee; controleer de kipsteun met de hand.
    #end if
#else
    L_kip', max(L; L_cr)'
#end if
l_ef = min(0.9*L_kip + 2*h_k; L_kip)', kiplengte'
σ_mcrit = 0.78*b_k^2/(h_k*l_ef)*E_005 to N/mm^2', kritieke buigspanning (6.32)'
λ_rel_m = sqrt(f_mk/σ_mcrit)', relatieve slankheid kip (6.30)'
#if λ_rel_m ≤ 0.75
    k_crit = 1', (6.34)'
#else if λ_rel_m ≤ 1.4
    k_crit = 1.56 - 0.75*λ_rel_m', (6.34)'
#else
    k_crit = 1/λ_rel_m^2', (6.34)'
#end if
UC_635 = (σ_myd/(k_crit*f_myd))^2 + σ_c0d/(k_cz*f_c0d)
#if UC_635 ≤ 1.0
    'UC<sub>6.35</sub> = (σ<sub>m,d</sub>/(k<sub>crit</sub>f<sub>m,d</sub>))² + σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) = 'UC_635'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.35</sub> = (σ<sub>m,d</sub>/(k<sub>crit</sub>f<sub>m,d</sub>))² + σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) = 'UC_635'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if
#else
# 5. Toetsing stalen schroefstempel

#if stempelwaarde ≡ 1
    '<i>Een toelaatbare last is een gebruiksbelasting: de toets rekent met de karakteristieke combinatie, zonder belastingsfactoren.</i>
    UC_st = F_rep/max(F_tabel; 0.001*kN)
    #if UC_st ≤ 1.0
        'UC<sub>st</sub> = F<sub>rep</sub>/F<sub>tabel</sub> = 'UC_st'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>st</sub> = F<sub>rep</sub>/F<sub>tabel</sub> = 'UC_st'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    UC_st = N_Ed/max(F_tabel; 0.001*kN)
    #if UC_st ≤ 1.0
        'UC<sub>st</sub> = N<sub>Ed</sub>/F<sub>tabel</sub> = 'UC_st'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>st</sub> = N<sub>Ed</sub>/F<sub>tabel</sub> = 'UC_st'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#end if
#end if

#if hout ≡ 1
# 11. Samenvatting
#else
# 6. Samenvatting
#end if

#if kolomsoort ≡ 2
UC_max = max(UC_62; UC_619; UC_620; UC_613; UC_623; UC_624; UC_635; UC_N)
#else if hout ≡ 1
UC_max = max(UC_62; UC_619; UC_620; UC_613; UC_623; UC_624; UC_635)
#else
UC_max = UC_st
#end if
#if UC_max ≤ 1.0
    #if kolomsoort ≡ 2
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Gevelstijl voldoet</b></span>
    #else if kolomsoort ≡ 3
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Stempel voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Kolom voldoet</b></span>
    #end if
#else
    #if kolomsoort ≡ 2
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Gevelstijl voldoet niet</b></span>
    #else if kolomsoort ≡ 3
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Stempel voldoet niet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Kolom voldoet niet</b></span>
    #end if
#end if
#end if
`;
