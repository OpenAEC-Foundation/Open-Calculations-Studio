/**
 * Betondoorsnede — rechthoekige gewapende doorsnede volgens NEN-EN 1992-1-1
 * met de Nederlandse nationale bijlage.
 *
 * Drie wapeningslagen (onder, midden, boven) en gesloten beugels. Getoetst:
 * - buiging met normaalkracht (§6.1): rechthoekig spanningsblok (3.19)–(3.22),
 *   rekken volgens figuur 6.1 (spil B tot x = h, daarna spil C op h/2 met
 *   ε_c3), staal met horizontale tak (3.2.7(2)b), dus zonder rekgrens. De
 *   drukzonehoogte volgt uit N_Rd(x) = N_Ed door te halveren; M_Rd om het
 *   zwaartepunt van de betondoorsnede. Ook gespiegeld, zodat een grote trek- of
 *   drukkracht die een minimummoment vraagt (M_Rd,min) niet onopgemerkt blijft.
 *   Bij druk is het moment ten minste N_Ed·e_0 met e_0 = max(h/30; 20 mm)
 *   (6.1(4)), in de richting van M_Ed; bij M_Ed = 0 naar beide kanten, want
 *   bij ongelijke wapening is de ene kant zwakker. Verdrongen beton is
 *   verwaarloosd. Het moment voor de langswapening is M_Ed plus de
 *   verschuiving |V_Ed|·a_l (9.2.1.3(2), hetzelfde als ΔF_td (6.18)), ten
 *   hoogste M_Ed,max (6.2.3(7)). M_Ed,max = 0 betekent: dit is de doorsnede
 *   met het grootste moment, dus geen toeslag, zoals het blad vóór deze regel
 *   rekende;
 * - dwarskracht (§6.2): V_Rd,c (6.2a/b), V_Rd,s (6.8) en V_Rd,max (6.9) met
 *   cot θ zo groot als (6.7N) en de drukdiagonalen toelaten;
 * - wringing (§6.3.2), alleen bij T_Ed ≠ 0: (6.31) of anders (6.29), de
 *   beugelsnede voor dwarskracht plus wringing en de langswapening (6.28). Die
 *   langswapening gaat naar rato van de omtrek af van de lagen bij de buiging;
 *   de vermindering in de drukzone (6.3.2(3)) is niet benut;
 * - wapeningsregels: A_s,min volgens de NB bij 9.2.1.1(1), de kleinste van
 *   A_s,min1 (het scheurmoment bij de excentriciteit van M en N) en
 *   A_s,min2 (1,25 × de nodige wapening), beide als enkelvoudig gewapende
 *   doorsnede met het spanningsblok (§6.1); A_s,max, ρ_w,min (9.5N), s_l,max
 *   en s_t,max volgens de NB bij 9.2.2(6) en (8); bij wringing ook 9.2.3(3)
 *   en (4);
 * - scheurwijdte (§7.3.4) onder de frequente combinatie (NB bij 7.3.1(5),
 *   geamendeerde tabel 7.1N): gescheurde doorsnede met α = E_s/E_c,eff,
 *   (7.8)–(7.11) met de bovengrens van s_r,max, of (7.14). Zonder de
 *   vergroting van w_max met k_x: de veilige kant.
 *
 * Optioneel (mk_lijn = 1, standaard uit) de M-κ-lijn, informatief en buiten
 * het oordeel: zonder normaalkracht en met N_Ed, beton op druk met het
 * parabool-rechthoekdiagram (3.17), ongescheurd lineair-elastisch (ideële
 * doorsnede met E_cm) tot f_ctm, gescheurd zonder trek in het beton; staal
 * bilineair met f_yd. De punten scheuren, vloeien (buitenste getrokken laag op
 * ε_yd) en uiterste toestand (ε_cu2, of ε_c2 op 3/7·h bij volledige druk,
 * figuur 6.1) en een tekening van de lijn. Staat de keuze uit, of ontbreekt
 * ze in een ouder blad, dan rekent het blad precies als daarvoor.
 *
 * Een positief moment geeft trek onderin, een negatief bovenin: de berekening
 * spiegelt de lagen. De scheurwijdte kiest de trekzijde van M_fr zelf; bij
 * trek met een kleine excentriciteit is dat de zijde waar de resultante ligt
 * ten opzichte van het zwaartepunt van de wapening. N_fr = M_fr = 0 betekent:
 * geen BGT-toets; het blad meldt dat.
 *
 * Op papier is het blad beknopter dan op het scherm (PrintDocument.css): een
 * tussenresultaat staat op het scherm als formule (alleen-scherm) en op
 * papier als kale waarde in een kolom (alleen-afdruk); de toetsregels staan
 * op beide als formule met de ingevulde waarden.
 *
 * Variabelenamen komen exact overeen met BetondoorsnedeDesigner.tsx; dat beeld
 * leest de uitkomsten uit dit blad. Controle: scripts/check-betondoorsnede.mjs.
 */

export const betondoorsnede = `"Betondoorsnede — EN 1992-1-1 §6.1, §6.2, §6.3 en §7.3.4

'<i>Rechthoekige gewapende doorsnede met drie wapeningslagen en gesloten beugels. Getoetst: buiging met normaalkracht (§6.1), dwarskracht en wringing (§6.2 en §6.3), de wapeningsregels van §9.2 en in de BGT de scheurwijdte (§7.3.4) onder de frequente combinatie (NB). Een positief moment geeft trek onderin; een normaalkracht is positief bij druk.</i><span class="alleen-scherm"></span>

# 1. Doorsnede en materiaal

b_dsn = ?*(mm)', breedte b<span class="kolom-3"></span>'
h_dsn = ?*(mm)', hoogte h<span class="kolom-3"></span>'
c_dek = ?*(mm)', dekking op de beugel<span class="kolom-3"></span>'

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
@end

@select betonstaal "Betonstaalsoort"
  B500A = 1
  B500B = 2
  B500C = 3
@end

#hide
b = b_dsn
h = h_dsn
c = c_dek
f_ck = betonklasse*N/mm^2
f_yk = 500 N/mm^2
E_s = 200000 N/mm^2
γ_C = 1.5
γ_S = 1.15
λ = 0.8
η = 1.0
ε_cu3 = 0.0035
ε_c3 = 0.00175
f_ctm = 0.3*betonklasse^(2/3)*N/mm^2
E_cm = 22000*((betonklasse + 8)/10)^0.3*N/mm^2
#show
f_cd = f_ck/γ_C', α<sub>cc</sub> = 1,0 (NB)<span class="kolom-3"></span>'
f_yd = f_yk/γ_S'<span class="kolom-3"></span>'
f_ctm', tabel 3.1<span class="kolom-3"></span>'
'γ<sub>C</sub> = 1,5 en γ<sub>S</sub> = 1,15 (tabel 2.1N); λ = 0,8 en η = 1,0 (3.19)–(3.22); ε<sub>cu3</sub> = 3,5 ‰ en ε<sub>c3</sub> = 1,75 ‰ (tabel 3.1); staal met horizontale tak (3.2.7(2)b).

# 2. Wapening

n_onder = ?', onder: aantal<span class="kolom-4"></span>'
d_onder = ?*(mm)', Ø<span class="kolom-4"></span>'
n_midden = ?', midden (0 = geen)<span class="kolom-4"></span>'
d_midden = ?*(mm)', Ø<span class="kolom-4"></span>'
n_boven = ?', boven: aantal<span class="kolom-4"></span>'
d_boven = ?*(mm)', Ø<span class="kolom-4"></span>'
d_beugel = ?*(mm)', beugel Ø<span class="kolom-4"></span>'
s_beugel = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
n_sneden = ?', beugelsneden<span class="kolom-4"></span>'

#hide
A_s,o = n_onder*pi/4*d_onder^2 to mm^2
A_s,m = n_midden*pi/4*d_midden^2 to mm^2
A_s,b = n_boven*pi/4*d_boven^2 to mm^2
a_o = h - c - d_beugel - d_onder/2
a_b = c + d_beugel + d_boven/2
a_m = (a_o + a_b)/2
A_s,tot = A_s,o + A_s,m + A_s,b
b_i = b - 2*(c + d_beugel)
past = if(A_s,tot > 0 mm^2 and n_onder*d_onder ≤ b_i and n_midden*d_midden ≤ b_i and n_boven*d_boven ≤ b_i and a_o - d_onder/2 > a_b + d_boven/2 and n_sneden ≥ 2 and s_beugel > 0 mm and d_beugel > 0 mm; 1; 0)
#show
A_s,o', n·π·Ø²/4<span class="kolom-3"></span>'
A_s,m'<span class="kolom-3"></span>'
A_s,b'<span class="kolom-3"></span>'
a_o', h − c − Ø<sub>bgl</sub> − Ø/2, vanaf de bovenrand<span class="kolom-3"></span>'
a_m'<span class="kolom-3"></span>'
a_b', c + Ø<sub>bgl</sub> + Ø/2<span class="kolom-3"></span>'

# 3. Belastingen

N_Ed = ?*(kN)', UGT, druk +<span class="kolom-4"></span>'
M_Ed = ?*(kN*m)', + trek onder<span class="kolom-4"></span>'
V_Ed = ?*(kN)'<span class="kolom-4"></span>'
T_Ed = ?*(kN*m)'<span class="kolom-4"></span>'
M_Ed,max = ?*(kN*m)', grootste in de ligger; 0 = deze doorsnede<span class="kolom-4"></span>'
N_fr = ?*(kN)', BGT, frequent (NB)<span class="kolom-4"></span>'
M_fr = ?*(kN*m)'<span class="kolom-4"></span>'
φ_kr = ?', kruip φ(∞,t<sub>0</sub>)<span class="kolom-4"></span>'

@select milieuklasse "Milieuklasse (tabel 7.1N)"
  X0 of XC1 = 1
  XC2, XC3 of XC4 = 2
  XD of XS = 3
@end

@select belastingduur "Duur van de BGT-belasting"
  Langdurend = 1
  Kortdurend = 2
@end

@select mk_lijn "Moment-krommingslijn (informatief, hoofdstuk 8)"
  Niet berekenen = 0
  Berekenen, zonder en met N_Ed = 1
@end

#if past ≡ 0
    '<b style="color:#b91c1c">Er is geen wapening, de staven of de beugels passen niet in de doorsnede, of de beugel heeft minder dan twee sneden: er valt niets te toetsen.</b>
    '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
#else
    #hide
    'Trekzijde bij de UGT: die van M_Ed; bij M_Ed = 0 die van M_Ed,max (de verschoven momentenlijn), anders die van M_fr.
    s_U = if(M_Ed < 0 kN*m; -1; if(M_Ed > 0 kN*m; 1; if(M_Ed,max < 0 kN*m; -1; if(M_Ed,max > 0 kN*m; 1; if(M_fr < 0 kN*m; -1; 1)))))
    A_sl = if(s_U > 0; A_s,o; A_s,b)
    d = if(s_U > 0; a_o; h - a_b)
    T_ = abs(T_Ed)/(1 kN*m)
    uc(a; r) = if(a ≤ 0*r; 0; a/r)
    #show

    # 4. Dwarskracht (§6.2) en wringing (§6.3)

    'Trek aan de 'if(s_U > 0; "onderzijde"; "bovenzijde")': d = 'd' mm, A<sub>sl</sub> = 'A_sl' mm².
    #hide
    z = 0.9*d
    ν = 0.6*(1 - betonklasse/250)
    A_sw = n_sneden*pi/4*d_beugel^2 to mm^2
    t_ef = min(max(b*h/(2*(b + h)); 2*max(a_b; h - a_o)); b/2)
    A_k = (b - t_ef)*(h - t_ef) to mm^2
    u_k = 2*(b + h - 2*t_ef)
    q_θ = abs(V_Ed)/(b*z*ν*f_cd) + abs(T_Ed)/(2*ν*f_cd*A_k*t_ef)
    cot_θ = if(q_θ ≤ 1/2.9; 2.5; if(q_θ < 0.5; (1/q_θ + sqrt(max(1/q_θ^2 - 4; 0)))/2; 1))
    #show
    k_V = min(1 + sqrt(200 mm/d); 2)', (6.2)<span class="alleen-scherm"></span>'
    ρ_l = min(A_sl/(b*d); 0.02)'<span class="alleen-scherm"></span>'
    σ_cp = min(N_Ed/(b*h); 0.2*f_cd) to N/mm^2'<span class="alleen-scherm"></span>'
    v_min = 0.035*k_V^1.5*sqrt(betonklasse)*N/mm^2', (6.3N)<span class="alleen-scherm"></span>'
    v_Rd,c = max(0.18/γ_C*k_V*(100*ρ_l*betonklasse)^(1/3)*N/mm^2; v_min)', C<sub>Rd,c</sub> = 0,18/γ<sub>C</sub> (NB)<span class="alleen-scherm"></span>'
    k_V'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    ρ_l'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    σ_cp'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    v_min'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    v_Rd,c', max(C<sub>Rd,c</sub>·k·(100·ρ<sub>l</sub>·f<sub>ck</sub>)<sup>1/3</sup>; v<sub>min</sub>), C<sub>Rd,c</sub> = 0,18/γ<sub>C</sub> (NB)<span class="alleen-afdruk"></span>'
    #if v_Rd,c + 0.15*σ_cp > 0 N/mm^2
        V_Rd,c = (v_Rd,c + 0.15*σ_cp)*b*d to kN', (6.2a/b), k<sub>1</sub> = 0,15'
    #else
        V_Rd,c = 0 kN', de trekkracht heft (6.2a/b) op'
    #end if
    z', 0,9·d<span class="kolom-4"></span>'
    ν', (6.6N)<span class="kolom-4"></span>'
    A_sw', alle sneden<span class="kolom-4"></span>'
    #if T_ > 0
        t_ef', A/u, ten minste 2× de randafstand van de langsstaven (6.3.2(1))<span class="alleen-scherm"></span>'
        t_ef', (6.3.2(1))<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        A_k'<span class="kolom-4"></span>'
        u_k'<span class="kolom-4"></span>'
    #end if
    cot_θ', zo groot als 1 ≤ cot θ ≤ 2,5 (6.7N) en de drukdiagonalen toelaten<span class="kolom-2"></span>'
    V_Rd,s = A_sw/s_beugel*z*f_yd*cot_θ to kN', (6.8)'
    V_Rd,max = b*z*ν*f_cd/(cot_θ + 1/cot_θ) to kN', (6.9), α<sub>cw</sub> = 1'
    #if T_ > 0
        T_Rd,c = 2*A_k*t_ef*0.7*f_ctm/γ_C to kN*m', f<sub>ctd</sub> (3.16), α<sub>ct</sub> = 1,0 (NB)'
        T_Rd,max = 2*ν*f_cd*A_k*t_ef/(cot_θ + 1/cot_θ) to kN*m', (6.30)'
        UC_Vmax = abs(T_Ed)/T_Rd,max + abs(V_Ed)/V_Rd,max', drukdiagonalen (6.29)'
        #if V_Rd,c > 0 kN or abs(V_Ed) > 0 kN
            UC_631 = abs(T_Ed)/T_Rd,c + abs(V_Ed)/V_Rd,c', (6.31)'
        #else
            UC_631 = abs(T_Ed)/T_Rd,c', (6.31) zonder dwarskracht'
        #end if
        #if UC_631 ≤ 1
            UC_V = UC_631', alleen minimumwapening nodig (6.3.2(5))'
            #hide
            A_sl,T = 0 mm^2
            bw = 0
            #show
        #else
            UC_V = (abs(V_Ed)/(z*f_yd*cot_θ*n_sneden) + abs(T_Ed)/(2*A_k*f_yd*cot_θ))/(pi/4*d_beugel^2/s_beugel)', één snede: (6.8) plus wringing'
            A_sl,T = abs(T_Ed)*u_k*cot_θ/(2*A_k*f_yd) to mm^2', langswapening voor wringing (6.28)'
            #hide
            bw = 1
            #show
        #end if
    #else
        UC_Vmax = abs(V_Ed)/V_Rd,max', drukdiagonalen (6.9)'
        #if abs(V_Ed) ≤ V_Rd,c and V_Rd,c > 0 kN
            UC_V = abs(V_Ed)/V_Rd,c', geen rekenkundige dwarskrachtwapening nodig (6.2.1(4))'
            #hide
            bw = 0
            #show
        #else
            UC_V = abs(V_Ed)/V_Rd,s', beugels (6.8)'
            #hide
            bw = if(abs(V_Ed) > 0 kN; 1; 0)
            #show
        #end if
        #hide
        A_sl,T = 0 mm^2
        #show
    #end if
    #hide
    'Langswapening voor wringing naar rato van de omtrek over de lagen: onder en boven elk de liggende wand
    'plus een kwart van beide staande wanden (de helft zonder tussenlaag); de tussenlaag de rest van de staande wanden.
    b_k = b - t_ef
    h_k = h - t_ef
    A_T,o = A_sl,T*(b_k + if(n_midden > 0; h_k/2; h_k))/u_k
    A_T,m = A_sl,T*if(n_midden > 0; h_k; 0 mm)/u_k
    A_T,b = A_T,o
    UC_Tl = max(uc(A_T,o; A_s,o); uc(A_T,m; A_s,m); uc(A_T,b; A_s,b))
    #show
    #if A_sl,T > 0 mm^2
        'Naar rato van de omtrek: A<sub>T</sub> = 'A_T,o' mm² onder, 'A_T,m' mm² midden en 'A_T,b' mm² boven; die gaan bij de buiging af van de lagen (6.3.2(3)).
        UC_Tl', grootste A<sub>T</sub>/A<sub>s</sub> van de lagen'
    #end if

    # 5. Buiging met normaalkracht (§6.1)

    #hide
    'Lagen gezien vanaf de gedrukte rand: 1 aan de trekzijde, 2 aan de drukzijde, m in het midden.
    A_s1 = max(if(s_U > 0; A_s,o - A_T,o; A_s,b - A_T,b); 0 mm^2)
    A_sm = max(A_s,m - A_T,m; 0 mm^2)
    A_s2 = max(if(s_U > 0; A_s,b - A_T,b; A_s,o - A_T,o); 0 mm^2)
    a_1 = d
    a_mid = if(s_U > 0; a_m; h - a_m)
    a_2 = if(s_U > 0; a_b; h - a_o)
    'Halveren op N_Rd(x) = N_Ed, kaal in N en mm; x = h·t/(1 − t), zodat 0 < t < 1 alle x > 0 dekt.
    'Eerst met de gedrukte rand tegenover de trekzijde van M_Ed, dan gespiegeld: die tweede geeft het
    'moment dat de doorsnede bij deze normaalkracht naar de andere kant opneemt.
    b_ = b/mm
    h_ = h/mm
    fcd_ = f_cd/(N/mm^2)
    fyd_ = f_yd/(N/mm^2)
    A1_ = A_s1/mm^2
    Am_ = A_sm/mm^2
    A2_ = A_s2/mm^2
    a1_ = a_1/mm
    am_ = a_mid/mm
    a2_ = a_2/mm
    N_ = N_Ed/N
    εx(a; x) = if(x ≤ h_; ε_cu3*(x - a)/x; ε_c3*(x - a)/(x - h_/2))
    σx(a; x) = min(max(200000*εx(a; x); -fyd_); fyd_)
    NR(x; p; q; r) = η*fcd_*b_*min(λ*x; h_) + A1_*σx(p; x) + Am_*σx(q; x) + A2_*σx(r; x)
    MR(x; p; q; r) = η*fcd_*b_*min(λ*x; h_)*(h_ - min(λ*x; h_))/2 + A1_*σx(p; x)*(h_/2 - p) + Am_*σx(q; x)*(h_/2 - q) + A2_*σx(r; x)*(h_/2 - r)
    t_a = 0
    t_b = 1
    u_a = 0
    u_b = 1
    #for i = 1 : 56
        t_m = (t_a + t_b)/2
        r_m = NR(h_*t_m/(1 - t_m); a1_; am_; a2_) - N_
        t_a = if(r_m < 0; t_m; t_a)
        t_b = if(r_m < 0; t_b; t_m)
        u_m = (u_a + u_b)/2
        v_m = NR(h_*u_m/(1 - u_m); h_ - a1_; h_ - am_; h_ - a2_) - N_
        u_a = if(v_m < 0; u_m; u_a)
        u_b = if(v_m < 0; u_b; u_m)
    #loop
    x_ = h_*(t_a + t_b)/2/(1 - (t_a + t_b)/2)
    x2_ = h_*(u_a + u_b)/2/(1 - (u_a + u_b)/2)
    M_Rd,t = MR(x2_; h_ - a1_; h_ - am_; h_ - a2_)*N*mm to kN*m
    M_Rd,min = max(-M_Rd,t; 0 kN*m)
    #show
    #if M_Ed,max ≡ 0 kN*m
        M_Ed,v = abs(M_Ed)', M<sub>Ed,max</sub> = 0: de doorsnede met het grootste moment, dus geen toeslag voor ΔF<sub>td</sub> (6.2.3(7))'
    #else
        #if bw ≡ 1
            a_l = z*cot_θ/2', (9.2): ΔF<sub>td</sub> = 0,5·V<sub>Ed</sub>·cot θ (6.18)<span class="kolom-2"></span>'
        #else
            a_l = d', zonder rekenkundige dwarskrachtwapening (6.2.2(5))<span class="kolom-2"></span>'
        #end if
        M_Ed,v = min(abs(M_Ed) + abs(V_Ed)*a_l; max(abs(M_Ed,max); abs(M_Ed))) to kN*m', verschoven momentenlijn (9.2.1.3(2)), ten hoogste M<sub>Ed,max</sub> (6.2.3(7))'
    #end if
    #if N_Ed > 0 kN
        N_Rd,max = η*f_cd*b*h + (A_s1 + A_sm + A_s2)*min(E_s*ε_c3; f_yd) to kN', geheel gedrukt, spil C (figuur 6.1)<span class="alleen-scherm"></span>'
        N_Rd,max', η·f<sub>cd</sub>·b·h + ΣA<sub>s</sub>·min(E<sub>s</sub>·ε<sub>c3</sub>; f<sub>yd</sub>), spil C (figuur 6.1)<span class="alleen-afdruk"></span>'
        UC_N = N_Ed/N_Rd,max
        e_0 = max(h/30; 20 mm)', minimale excentriciteit (6.1(4))<span class="kolom-2"></span>'
        M_e0 = N_Ed*e_0 to kN*m'<span class="kolom-2"></span>'
    #else if N_Ed < 0 kN
        N_Rd,min = -(A_s1 + A_sm + A_s2)*f_yd to kN', alleen de wapening, op trek<span class="alleen-scherm"></span>'
        N_Rd,min', −ΣA<sub>s</sub>·f<sub>yd</sub>, alleen de wapening<span class="alleen-afdruk"></span>'
        UC_N = N_Ed/N_Rd,min
        #hide
        M_e0 = 0 kN*m
        #show
    #else
        #hide
        UC_N = 0
        M_e0 = 0 kN*m
        #show
    #end if
    #if UC_N ≥ 1
        '<b style="color:#b91c1c">De normaalkracht alleen is al groter dan de doorsnede opneemt.</b>
        #hide
        UC_M = UC_N
        #show
    #else if A_s1 + A_sm + A_s2 ≤ 0 mm^2 and N_Ed ≤ 0 kN and M_Ed,v > 0 kN*m
        '<b style="color:#b91c1c">Na aftrek van de langswapening voor wringing blijft er voor de buiging geen wapening over.</b>
        #hide
        UC_M = 1/0
        #show
        UC_M
    #else
        #hide
        x_u = x_*mm
        σ_s1 = σx(a1_; x_)*N/mm^2
        σ_sm = σx(am_; x_)*N/mm^2
        σ_s2 = σx(a2_; x_)*N/mm^2
        ε_s1 = -εx(a1_; x_)*1000
        y_c = min(λ*x_u; h)
        #show
        'Vanaf de gedrukte rand: laag 1 (trekzijde) op a<sub>1</sub> = 'a_1' mm, de tussenlaag op 'a_mid' mm en laag 2 op a<sub>2</sub> = 'a_2' mm.
        x_u', uit F<sub>c</sub> + ΣF<sub>s</sub> = N<sub>Ed</sub><span class="kolom-3"></span>'
        y_c', λ·x<sub>u</sub> ≤ h<span class="kolom-3"></span>'
        ε_s1', ‰ rek in laag 1; ε<sub>yd</sub> = 2,17 ‰<span class="kolom-3"></span>'
        F_c = η*f_cd*b*y_c to kN'<span class="alleen-scherm"></span>'
        F_s1 = A_s1*σ_s1 to kN'<span class="alleen-scherm"></span>'
        F_sm = A_sm*σ_sm to kN'<span class="alleen-scherm"></span>'
        F_s2 = A_s2*σ_s2 to kN'<span class="alleen-scherm"></span>'
        F_c', η·f<sub>cd</sub>·b·y<sub>c</sub><span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        F_s1', A<sub>s1</sub>·σ<sub>s1</sub><span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        F_sm'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        F_s2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        M_Rd = F_c*(h - y_c)/2 + F_s1*(h/2 - a_1) + F_sm*(h/2 - a_mid) + F_s2*(h/2 - a_2) to kN*m', om het zwaartepunt, druk positief<span class="alleen-scherm"></span>'
        M_Rd', F<sub>c</sub>·(h − y<sub>c</sub>)/2 + ΣF<sub>s</sub>·(h/2 − a), om het zwaartepunt<span class="alleen-afdruk"></span>'
        #if M_Rd ≤ 0 kN*m
            '<b style="color:#b91c1c">Bij deze normaalkracht neemt de doorsnede naar deze kant geen moment op.</b>
            #hide
            UC_M = 1/0
            #show
            UC_M
        #else if N_Ed > 0 kN and M_Ed ≡ 0 kN*m
            'M<sub>Ed</sub> = 0: N<sub>Ed</sub>·e<sub>0</sub> naar beide kanten (6.1(4)).
            #if M_Rd,t ≤ 0 kN*m
                '<b style="color:#b91c1c">Naar de andere kant neemt de doorsnede bij deze normaalkracht geen moment op.</b>
                #hide
                UC_M = 1/0
                #show
                UC_M
            #else if M_Ed,v ≡ 0 kN*m
                M_Rd,t', de andere kant op, gedrukt aan de zijde van laag 1<span class="kolom-2"></span>'
                UC_M = M_e0/min(M_Rd; M_Rd,t)', de zwakste kant'
            #else
                M_Rd,t', de andere kant op, gedrukt aan de zijde van laag 1<span class="kolom-2"></span>'
                UC_M = max(max(M_Ed,v; M_e0)/M_Rd; M_e0/M_Rd,t)', M<sub>Ed,v</sub> naar de trekzijde, N<sub>Ed</sub>·e<sub>0</sub> ook de andere kant op'
            #end if
        #else if M_Rd,min > max(M_Ed,v; M_e0)
            M_Rd,min', <b style="color:#b91c1c">het kleinste moment in de richting van M<sub>Ed</sub> dat bij deze normaalkracht evenwicht geeft</b>'
            UC_M = M_Rd,min/max(M_Ed,v; M_e0)
        #else if N_Ed > 0 kN
            UC_M = max(M_Ed,v; M_e0)/M_Rd', M<sub>Ed,v</sub> ten minste N<sub>Ed</sub>·e<sub>0</sub>'
        #else
            UC_M = M_Ed,v/M_Rd
        #end if
    #end if

    # 6. Wapeningsregels (§9.2)

    #hide
    'A_s,min volgens de NB bij 9.2.1.1(1): de kleinste van A_s,min1 en A_s,min2. Beide als de trekwapening
    'die een enkelvoudig gewapende doorsnede met het spanningsblok (§6.1) nodig heeft; boven μ_l vloeit het
    'staal niet meer en neemt drukwapening op a_2 het meerdere op. Kaal in N en mm, m om het zwaartepunt
    '(≥ 0, in de richting van de trekzijde), n druk positief.
    'M_E,min en N_E,min: het paar met de excentriciteit e = m/|n| van M_Ed,v en N_Ed waarbij de rand
    'net scheurt, M/W − N/A_c = f_ctm. Met D = m − n·h/6 (h/6 = W/A_c): M = W·f_ctm·m/D en N = W·f_ctm·n/D;
    'zonder normaalkracht M = W·f_ctm. Bij druk en D ≤ 0 ligt de resultante in de kern en scheurt niets.
    W_ = b_*h_^2/6
    fctm_ = f_ctm/(N/mm^2)
    mv_ = M_Ed,v/(N*mm)
    D_ = mv_ - N_*h_/6
    ξ_l = ε_cu3/(ε_cu3 + fyd_/200000)
    μ_l = λ*ξ_l*(1 - λ*ξ_l/2)
    ms(m; n) = m + n*(a1_ - h_/2)
    Fc(m; n) = η*fcd_*b_*a1_*(1 - sqrt(1 - 2*min(ms(m; n)/(η*fcd_*b_*a1_^2); μ_l)))
    An(m; n) = if(ms(m; n) ≤ 0; (m - n*(h_/2 - a2_))/((a1_ - a2_)*fyd_); max((Fc(m; n) + max(ms(m; n) - μ_l*η*fcd_*b_*a1_^2; 0)/(a1_ - a2_) - n)/fyd_; 0))
    #show
    #if N_Ed > 0 kN and D_ ≤ 0
        '<i>De resultante van M<sub>Ed,v</sub> en N<sub>Ed</sub> ligt in de kern (e ≤ h/6): de doorsnede scheurt niet, A<sub>s,min1</sub> = 0.</i>
        #hide
        A_s,min1 = 0 mm^2
        #show
    #else
        #hide
        M_E,min = if(N_Ed ≡ 0 kN; W_*fctm_; W_*fctm_*mv_/D_)*N*mm to kN*m
        N_E,min = if(N_Ed ≡ 0 kN; 0; W_*fctm_*N_/D_)*N to kN
        A_s,min1 = An(M_E,min/(N*mm); N_E,min/N)*mm^2
        #show
        M_E,min', W·f<sub>ctm</sub> bij de excentriciteit van M<sub>Ed,v</sub> en N<sub>Ed</sub><span class="kolom-4"></span>'
        N_E,min'<span class="kolom-4"></span>'
        A_s,min1', volgens 6.1<span class="kolom-4"></span>'
    #end if
    #hide
    A_s,min2 = 1.25*An(mv_; N_)*mm^2
    #show
    A_s,min2', 1,25 × nodig in de UGT<span class="kolom-4"></span>'
    A_s,min = min(A_s,min1; A_s,min2)', NB bij 9.2.1.1(1)<span class="kolom-2"></span>'
    #hide
    UC_As,min = uc(A_s,min; A_sl)
    #show
    UC_As,min', A<sub>s,min</sub>/A<sub>sl</sub>, trekzijde<span class="kolom-2"></span>'
    UC_As,max = A_s,tot/(0.04*b*h)', 9.2.1.1(3)'
    #hide
    ρ_w = A_sw/(s_beugel*b)
    ρ_w,min = 0.08*sqrt(betonklasse)/500
    #show
    ρ_w', A<sub>sw</sub>/(s·b)<span class="kolom-4"></span>'
    ρ_w,min', (9.5N)<span class="kolom-4"></span>'
    UC_ρw = ρ_w,min/ρ_w'<span class="kolom-2"></span>'
    #if bw ≡ 1 and T_ > 0
        s_l,max = min(0.75*d; 300 mm; 2*(b + h)/8; b; h)', NB bij 9.2.2(6); u/8, b en h (9.2.3(3))<span class="kolom-2"></span>'
    #else if T_ > 0
        s_l,max = min(300 mm; 2*(b + h)/8; b; h)', zonder rekenkundige wapening (NB bij 9.2.2(6)); u/8, b en h (9.2.3(3))<span class="kolom-2"></span>'
    #else if bw ≡ 1
        s_l,max = min(0.75*d; 300 mm)', NB bij 9.2.2(6)<span class="kolom-2"></span>'
    #else
        s_l,max = 300 mm', zonder rekenkundige dwarskrachtwapening (NB bij 9.2.2(6))<span class="kolom-2"></span>'
    #end if
    UC_sl = s_beugel/s_l,max'<span class="kolom-2"></span>'
    #hide
    s_t = (b - 2*c - d_beugel)/(n_sneden - 1)
    s_t,max = if(abs(V_Ed) ≤ 0.5*V_Rd,max; 500 mm; min(0.75*d; 500 mm))
    #show
    s_t', afstand van de sneden<span class="kolom-4"></span>'
    s_t,max', NB bij 9.2.2(8)<span class="kolom-4"></span>'
    UC_st = s_t/s_t,max'<span class="kolom-2"></span>'
    #if T_ > 0
        #hide
        s_T = max(if(n_midden ≥ 2; (a_o - a_b)/2; a_o - a_b); if(n_onder ≥ 2; (b_i - d_onder)/(n_onder - 1); 0 mm); if(n_boven ≥ 2; (b_i - d_boven)/(n_boven - 1); 0 mm))
        #show
        #if n_onder ≥ 2 and n_boven ≥ 2
            s_T', grootste h.o.h. van de langsstaven langs de beugel<span class="kolom-2"></span>'
            UC_sl,T = s_T/(350 mm)', wringing, 9.2.3(4)<span class="kolom-2"></span>'
        #else
            '<b style="color:#b91c1c">Bij wringing hoort in elke hoek een langsstaaf (9.2.3(4)); onder of boven liggen er minder dan twee.</b>
            #hide
            UC_sl,T = 1/0
            #show
            UC_sl,T
        #end if
    #else
        #hide
        UC_sl,T = 0
        #show
    #end if

    # 7. Scheurwijdte (§7.3.4)

    #if N_fr ≡ 0 kN and M_fr ≡ 0 kN*m
        '<i>Geen frequente belasting ingevuld (N<sub>fr</sub> = M<sub>fr</sub> = 0): de scheurwijdte is niet getoetst.</i>
        #hide
        UC_w = 0
        #show
    #else
        #hide
        'Trekzijde bij de BGT: die van M_fr. Bij trek (N_fr < 0) de zijde waar de resultante ligt ten opzichte
        'van het zwaartepunt van de wapening: bij een kleine excentriciteit is dat de andere zijde dan die van M_fr.
        y_s = if(A_s,tot > 0 mm^2; (A_s,o*(a_o - h/2) + A_s,m*(a_m - h/2) + A_s,b*(a_b - h/2))/A_s,tot; 0 mm)
        s_Q = if(N_fr < 0 kN; if(M_fr/abs(N_fr) ≥ y_s; 1; -1); if(M_fr < 0 kN*m; -1; if(M_fr > 0 kN*m; 1; s_U)))
        A_s,fr = if(s_Q > 0; A_s,o; A_s,b)
        A_Q2 = if(s_Q > 0; A_s,b; A_s,o)
        d_fr = if(s_Q > 0; a_o; h - a_b)
        a_Qm = if(s_Q > 0; a_m; h - a_m)
        a_Q2 = if(s_Q > 0; a_b; h - a_o)
        Ø_fr = if(s_Q > 0; d_onder; d_boven)
        n_Q = if(s_Q > 0; n_onder; n_boven)
        k_t = if(belastingduur ≡ 1; 0.4; 0.6)
        φ_t = if(belastingduur ≡ 1; φ_kr; 0)
        α_e = E_s/E_cm
        α_L = α_e*(1 + φ_t)
        #show
        E_cm', tabel 3.1<span class="kolom-3"></span>'
        α_e', E<sub>s</sub>/E<sub>cm</sub><span class="kolom-3"></span>'
        α_L', E<sub>s</sub>/E<sub>c,eff</sub>, E<sub>c,eff</sub> = E<sub>cm</sub>/(1 + φ) bij langdurend<span class="kolom-3"></span>'
        #hide
        'Gescheurde doorsnede, lineair elastisch, beton zonder trek: zoek x met N·S1(x) = M·S0(x),
        'S0 en S1 de nulde en eerste orde van de spanningsverdeling per eenheid van de spanningsgradiënt.
        B1_ = A_s,fr/mm^2
        Bm_ = A_s,m/mm^2
        B2_ = A_Q2/mm^2
        q1_ = d_fr/mm
        qm_ = a_Qm/mm
        q2_ = a_Q2/mm
        Nq_ = N_fr/N
        Mq_ = s_Q*M_fr/(N*mm)
        xc(x) = min(max(x; 0); h_)
        S0(x) = b_*(x*xc(x) - xc(x)^2/2) + α_L*(B1_*(x - q1_) + Bm_*(x - qm_) + B2_*(x - q2_))
        S1(x) = b_*(x*h_/2*xc(x) - (x + h_/2)*xc(x)^2/2 + xc(x)^3/3) + α_L*(B1_*(x - q1_)*(h_/2 - q1_) + Bm_*(x - qm_)*(h_/2 - qm_) + B2_*(x - q2_)*(h_/2 - q2_))
        ΣαA = α_L*(B1_ + Bm_ + B2_)
        x_0 = (sqrt(ΣαA^2 + 2*b_*α_L*(B1_*q1_ + Bm_*qm_ + B2_*q2_)) - ΣαA)/b_
        g(x) = Nq_*S1(x) - Mq_*S0(x)
        x_L = if(Nq_ < 0; -1000*h_; x_0)
        x_R = if(Nq_ > 0; h_; x_0)
        #for i = 1 : 56
            x_M = (x_L + x_R)/2
            g_M = g(x_M)
            x_L = if(g_M > 0; x_M; x_L)
            x_R = if(g_M > 0; x_R; x_M)
        #loop
        x_q = (x_L + x_R)/2
        k_q = if(abs(Mq_) > 0; Mq_/S1(x_q); if(Nq_ ≡ 0; 0; Nq_/S0(x_q)))
        x_fr = x_q*mm
        σ_s = α_L*k_q*(q1_ - x_q)*N/mm^2
        #show
        #if σ_s ≤ 0 N/mm^2
            '<i>Geen trek in de wapening onder de frequente combinatie: geen scheuren.</i>
            #hide
            UC_w = 0
            #show
        #else
            'Trek aan de 'if(s_Q > 0; "onderzijde"; "bovenzijde")': 'n_Q'Ø'Ø_fr', d<sub>fr</sub> = 'd_fr' mm.
            #if x_fr > 0 mm
                x_fr', gescheurde doorsnede<span class="kolom-3"></span>'
            #else
                '<i>De doorsnede is geheel getrokken.</i><span class="kolom-3"></span>
            #end if
            σ_s', aan de trekzijde<span class="kolom-3"></span>'
            #hide
            c_l = c + d_beugel
            s_Ø = if(n_Q > 1; (b - 2*c_l - Ø_fr)/(n_Q - 1); b)
            k_2 = if(x_fr > 0 mm; 0.5; (h - 2*x_fr)/(2*(h - x_fr)))
            #show
            k_t', 0,4 langdurend, 0,6 kort<span class="kolom-3"></span>'
            #if x_fr > 0 mm
                h_c,ef = min(2.5*(h - d_fr); (h - x_fr)/3; h/2)', figuur 7.1<span class="alleen-scherm"></span>'
                h_c,ef', min(2,5·(h − d<sub>fr</sub>); (h − x<sub>fr</sub>)/3; h/2), figuur 7.1<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
            #else
                h_c,ef = min(2.5*(h - d_fr); h/2)', figuur 7.1, geheel getrokken<span class="kolom-2"></span>'
                k_2', (7.13)<span class="kolom-2"></span>'
            #end if
            ρ_p,eff = A_s,fr/(b*h_c,ef)', (7.10)<span class="kolom-2"></span>'
            #if s_Ø ≤ 5*(c_l + Ø_fr/2)
                s_r,max = min(3.4*c_l + 0.8*k_2*0.425*Ø_fr/ρ_p,eff; max(50 - 0.8*betonklasse; 15)*Ø_fr)', (7.11), c<sub>l</sub> = c + Ø<sub>bgl</sub>, ten hoogste max(50 − 0,8·f<sub>ck</sub>; 15)·Ø (NB)'
            #else
                s_r,max = 1.3*(h - max(x_fr; 0 mm))', (7.14): staven verder dan 5(c + Ø/2) uit elkaar'
            #end if
            Δε_sm = max((σ_s - k_t*f_ctm/ρ_p,eff*(1 + α_e*ρ_p,eff))/E_s; 0.6*σ_s/E_s)', ε<sub>sm</sub> − ε<sub>cm</sub> (7.9)<span class="alleen-scherm"></span>'
            Δε_sm', ε<sub>sm</sub> − ε<sub>cm</sub> (7.9)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
            w_k = s_r,max*Δε_sm to mm', (7.8)'
            #hide
            w_max = if(milieuklasse ≡ 1; 0.4; if(milieuklasse ≡ 2; 0.3; 0.2))*mm
            #show
            w_max', geamendeerde tabel 7.1N (NB), zonder k<sub>x</sub><span class="kolom-2"></span>'
            UC_w = w_k/w_max'<span class="kolom-2"></span>'
        #end if
    #end if

    #if mk_lijn ≡ 1

        # 8. M-κ-lijn

        '<i>Informatief: de lijn telt niet mee in het oordeel. Beton op druk met het parabool-rechthoekdiagram (3.17) met f<sub>cd</sub>, n = 2, ε<sub>c2</sub> = 2,0 ‰ en ε<sub>cu2</sub> = 3,5 ‰ (tabel 3.1). Ongescheurd lineair-elastisch met E<sub>cm</sub> (ideële doorsnede, α<sub>e</sub> = E<sub>s</sub>/E<sub>cm</sub>) tot f<sub>ctm</sub> aan de getrokken rand; gescheurd zonder trek in het beton, dus zonder tension stiffening. Staal bilineair met f<sub>yd</sub> en een horizontale tak zonder rekgrens (3.2.7(2)b). De drie lagen volledig, zonder aftrek voor wringing; verdrongen beton verwaarloosd. Gedrukt aan de rand tegenover de trekzijde van de UGT. Vloeien: de buitenste getrokken laag bereikt ε<sub>yd</sub>. Uiterste toestand: ε<sub>cu2</sub> aan de gedrukte rand, of ε<sub>c2</sub> op 3/7·h als de doorsnede geheel gedrukt is (figuur 6.1). Bij druk ligt de lijn met N = N<sub>Ed</sub> bij κ = 0 op M = N·(h/2 − y<sub>i</sub>), met y<sub>i</sub> het zwaartepunt van de ideële doorsnede.</i><span class="alleen-scherm"></span>
        #hide
        'Diepten van de lagen vanaf de gedrukte rand, kaal in N en mm; κ in 1/mm.
        A1k_ = if(s_U > 0; A_s,o; A_s,b)/mm^2
        Amk_ = A_s,m/mm^2
        A2k_ = if(s_U > 0; A_s,b; A_s,o)/mm^2
        p1_ = if(s_U > 0; a_o; h - a_b)/mm
        pm_ = if(s_U > 0; a_m; h - a_m)/mm
        p2_ = if(s_U > 0; a_b; h - a_o)/mm
        Ecm_ = E_cm/(N/mm^2)
        fctm_ = f_ctm/(N/mm^2)
        εc2 = 0.002
        εcu2 = 0.0035
        εyd_ = fyd_/200000
        'Parabool-rechthoek (3.17) met n = 2: Fc = ∫σ dε en Gc = ∫σ·ε dε vanaf 0, nul bij trek.
        Fc(t) = if(t ≤ 0; 0; if(t ≤ εc2; fcd_*(t^2/εc2 - t^3/(3*εc2^2)); fcd_*(2*εc2/3 + t - εc2)))
        Gc(t) = if(t ≤ 0; 0; if(t ≤ εc2; fcd_*(2*t^3/(3*εc2) - t^4/(4*εc2^2)); fcd_*(5*εc2^2/12 + (t^2 - εc2^2)/2)))
        σk(t) = min(max(200000*t; -fyd_); fyd_)
        'N en M om h/2 (druk positief) bij rek t aan de gedrukte rand en kromming k.
        Nk(t; k) = b_/k*(Fc(t) - Fc(t - k*h_)) + A1k_*σk(t - k*p1_) + Amk_*σk(t - k*pm_) + A2k_*σk(t - k*p2_)
        Mk(t; k) = b_/k*((h_/2 - t/k)*(Fc(t) - Fc(t - k*h_)) + (Gc(t) - Gc(t - k*h_))/k) + A1k_*σk(t - k*p1_)*(h_/2 - p1_) + Amk_*σk(t - k*pm_)*(h_/2 - pm_) + A2k_*σk(t - k*p2_)*(h_/2 - p2_)
        'Ideële doorsnede: oppervlakte, zwaartepunt vanaf de gedrukte rand en traagheidsmoment.
        αk_ = 200000/Ecm_
        Ai_ = b_*h_ + αk_*(A1k_ + Amk_ + A2k_)
        yi_ = (b_*h_^2/2 + αk_*(A1k_*p1_ + Amk_*pm_ + A2k_*p2_))/Ai_
        Ii_ = b_*h_^3/12 + b_*h_*(h_/2 - yi_)^2 + αk_*(A1k_*(p1_ - yi_)^2 + Amk_*(pm_ - yi_)^2 + A2k_*(p2_ - yi_)^2)
        py_ = if(A1k_ > 0; p1_; if(Amk_ > 0; pm_; p2_))
        Nmk_ = fcd_*b_*h_ + (A1k_ + Amk_ + A2k_)*σk(εc2)
        Nmn_ = -(A1k_ + Amk_ + A2k_)*fyd_
        #show
        mkPunten$(0; 0)
        #hide
        EI_I = Ecm_*Ii_*N*mm^2 to kN*m^2
        y_i = yi_*mm
        M_r,0 = mk_mr,0*N*mm to kN*m
        κ_r,0 = mk_kr,0/mm to m^-1
        M_y,0 = mk_my,0*N*mm to kN*m
        κ_y,0 = mk_ky,0/mm to m^-1
        EI_y,0 = M_y,0/κ_y,0 to kN*m^2
        μ_κ,0 = mk_ku,0/mk_ky,0
        M_u,0 = mk_mu,0*N*mm to kN*m
        κ_u,0 = mk_ku,0/mm to m^-1
        #show
        EI_I', ongescheurd: E<sub>cm</sub>·I<sub>i</sub><span class="kolom-2"></span>'
        y_i', zwaartepunt van de ideële doorsnede vanaf de gedrukte rand<span class="kolom-2"></span>'
        '<b>Zonder normaalkracht</b>
        M_r,0', scheuren<span class="kolom-4"></span>'
        κ_r,0'<span class="kolom-4"></span>'
        #if mk_vl,0 ≡ 1
            M_y,0', vloeien<span class="kolom-4"></span>'
            κ_y,0'<span class="kolom-4"></span>'
        #else
            '<i>De getrokken wapening vloeit niet vóór de uiterste toestand.</i>
        #end if
        M_u,0', uiterste toestand<span class="kolom-4"></span>'
        κ_u,0'<span class="kolom-4"></span>'
        #if mk_vl,0 ≡ 1
            EI_y,0', gescheurd: secans tot vloeien<span class="kolom-2"></span>'
            μ_κ,0', κ<sub>u</sub>/κ<sub>y</sub><span class="kolom-2"></span>'
        #end if
        #hide
        mk_metN = if(N_Ed ≠ 0 kN and N_ > 0.999*Nmn_ and N_ < 0.999*Nmk_; 1; 0)
        #show
        #if mk_metN ≡ 1
            mkPunten$(N; N_)
            #hide
            M_0,N = mk_m0,N*N*mm to kN*m
            M_r,N = mk_mr,N*N*mm to kN*m
            κ_r,N = mk_kr,N/mm to m^-1
            M_y,N = mk_my,N*N*mm to kN*m
            κ_y,N = mk_ky,N/mm to m^-1
            μ_κ,N = mk_ku,N/mk_ky,N
            M_u,N = mk_mu,N*N*mm to kN*m
            κ_u,N = mk_ku,N/mm to m^-1
            #show
            '<b>Met N<sub>Ed</sub> = 'N_Ed' kN</b>
            M_0,N', bij κ = 0<span class="kolom-4"></span>'
            #if mk_rok,N ≡ 1
                M_r,N', scheuren<span class="kolom-4"></span>'
                κ_r,N'<span class="kolom-4"></span>'
            #else
                '<i>Door de trekkracht al gescheurd bij κ = 0.</i>
            #end if
            #if mk_vl,N ≡ 1
                M_y,N', vloeien<span class="kolom-4"></span>'
                κ_y,N'<span class="kolom-4"></span>'
            #else
                '<i>De getrokken wapening vloeit niet vóór de uiterste toestand.</i>
            #end if
            M_u,N', uiterste toestand<span class="kolom-4"></span>'
            κ_u,N'<span class="kolom-4"></span>'
            #if mk_vl,N ≡ 1
                μ_κ,N', κ<sub>u</sub>/κ<sub>y</sub><span class="kolom-2"></span>'
            #end if
        #else if N_Ed ≠ 0 kN
            '<i>N<sub>Ed</sub> ligt buiten het bereik van de doorsnede: geen lijn met normaalkracht.</i>
        #end if
        #hide
        mkLijn$(0)
        #show
        #if mk_metN ≡ 1
            #hide
            mkLijn$(N)
            #show
        #else
            #hide
            mk_K,N = mk_K,0
            mk_M,N = mk_M,0
            mk_ku,N = mk_ku,0
            mk_mr,N = mk_mr,0
            mk_m0,N = mk_m0,0
            #show
        #end if
        #hide
        mk_kmax = max(mk_ku,0; mk_ku,N)
        mk_mmax = max(max(mk_M,0); max(mk_M,N); mk_mr,0; mk_mr,N; 0)*1.08
        mk_mmin = min(min(mk_M,0); min(mk_M,N); mk_m0,0; mk_m0,N; 0)
        mk_mmin = mk_mmin - 0.05*(mk_mmax - mk_mmin)
        Xk(k) = 60 + 400*k/mk_kmax
        Ym(m) = 222 - 200*(m - mk_mmin)/(mk_mmax - mk_mmin)
        #show
        '<svg viewbox="0 0 480 262" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:282px;">
        '<line x1="60" y1="'Ym(0)'" x2="465" y2="'Ym(0)'" style="stroke:#6b7280; stroke-width:1"/>
        '<line x1="60" y1="16" x2="60" y2="226" style="stroke:#6b7280; stroke-width:1"/>
        #for i = 1 : 4
            '<line x1="'Xk(i*mk_kmax/4)'" y1="'Ym(0) - 3'" x2="'Xk(i*mk_kmax/4)'" y2="'Ym(0) + 3'" style="stroke:#6b7280; stroke-width:1"/>
            '<text x="'Xk(i*mk_kmax/4)'" y="'Ym(0) + 14'" text-anchor="middle" style="fill:#374151">'i*mk_kmax/4*1000'</text>
            '<line x1="57" y1="'Ym(i*mk_mmax/4)'" x2="63" y2="'Ym(i*mk_mmax/4)'" style="stroke:#6b7280; stroke-width:1"/>
            '<text x="54" y="'Ym(i*mk_mmax/4) + 3'" text-anchor="end" style="fill:#374151">'i*mk_mmax/4/1000000'</text>
        #loop
        '<text x="465" y="'Ym(0) - 6'" text-anchor="end" style="fill:#374151">κ [1/m]</text>
        '<text x="66" y="14" style="fill:#374151">M [kNm]</text>
        mkTeken$(0; "#2563eb")
        #if mk_metN ≡ 1
            mkTeken$(N; "#d97706")
        #end if
        '</svg>'
        '<span class="alleen-scherm"><span style="display:inline-block; width:14px; border-top:3px solid #2563eb; vertical-align:middle"></span>&nbsp;N = 0 &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #d97706; vertical-align:middle"></span>&nbsp;N = N<sub>Ed</sub> &nbsp;&nbsp; doorlopend: de gevolgde lijn, stippel: gescheurd onder het scheurmoment, streep: de sprong bij het scheuren; r scheuren, y vloeien, u uiterste toestand</span>
    #end if

    #if mk_lijn ≡ 1

        # 9. Samenvatting

    #else

        # 8. Samenvatting

    #end if

    UC_max = max(UC_N; UC_M; UC_V; UC_Vmax; UC_Tl; UC_As,min; UC_As,max; UC_ρw; UC_sl; UC_st; UC_sl,T; UC_w)'<span class="alleen-scherm"></span>'
    UC_max', grootste van de toetsen hierboven<span class="alleen-afdruk"></span>'
    #if UC_max ≤ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

#def mkPunten$(sfx$; nwP$)
#hide
mk_N,sfx = nwP
Nt = mk_N,sfx
mk_kB,sfx = $Find{Nk(εcu2; k) - Nt @ k = 0.000000001 : 1}
mk_kC,sfx = $Find{Nk(εc2 + 3*k*h_/7; k) - Nt @ k = 0.000000001 : 7*εc2/(4*h_)}
mk_C,sfx = if(mk_kB,sfx*h_ < εcu2; 1; 0)
mk_ku,sfx = if(mk_C,sfx ≡ 1; mk_kC,sfx; mk_kB,sfx)
mk_eu,sfx = if(mk_C,sfx ≡ 1; εc2 + 3*mk_ku,sfx*h_/7; εcu2)
mk_mu,sfx = Mk(mk_eu,sfx; mk_ku,sfx)
mk_vl,sfx = if(mk_eu,sfx - mk_ku,sfx*py_ ≤ -εyd_; 1; 0)
mk_ky,sfx = if(mk_vl,sfx ≡ 1; $Find{Nk(k*py_ - εyd_; k) - Nt @ k = 0.000000000001 : mk_ku,sfx}; mk_ku,sfx)
mk_my,sfx = if(mk_vl,sfx ≡ 1; Mk(mk_ky,sfx*py_ - εyd_; mk_ky,sfx); mk_mu,sfx)
mk_ei,sfx = Nt/(Ecm_*Ai_)
mk_rok,sfx = if(mk_ei,sfx + fctm_/Ecm_ > 0; 1; 0)
mk_kr,sfx = max((mk_ei,sfx + fctm_/Ecm_)/(h_ - yi_); 0)
mk_m0,sfx = Ecm_*mk_ei,sfx*Ai_*(h_/2 - yi_)
mk_mr,sfx = mk_m0,sfx + Ecm_*mk_kr,sfx*Ii_
#show
#end def

#def mkLijn$(sfx$)
Nt = mk_N,sfx
mk_ka,sfx = if(mk_rok,sfx ≡ 1; max(mk_kr,sfx; mk_ku,sfx/1000); mk_ku,sfx/1000)
t_a = $Find{Nk(t; mk_ka,sfx) - Nt @ t = -0.01 : mk_ka,sfx*h_ + 0.01}
mk_K,sfx = [mk_ka,sfx]
mk_M,sfx = [Mk(t_a; mk_ka,sfx)]
#for j = 1 : 24
    κ_j = if(mk_vl,sfx ≡ 1 and mk_ky,sfx > mk_ka,sfx; if(j ≤ 12; mk_ka,sfx + (mk_ky,sfx - mk_ka,sfx)*j/12; mk_ky,sfx + (mk_ku,sfx - mk_ky,sfx)*(j - 12)/12); mk_ka,sfx + (mk_ku,sfx - mk_ka,sfx)*j/24)
    t_j = $Find{Nk(t; κ_j) - Nt @ t = -0.01 : κ_j*h_ + 0.01}
    mk_K,sfx = concat(mk_K,sfx; [κ_j])
    mk_M,sfx = concat(mk_M,sfx; [Mk(t_j; κ_j)])
#loop
#end def

#def mkTeken$(sfx$; klP$)
#hide
kl_ = klP
MR_ = if(mk_rok,sfx ≡ 1; mk_mr,sfx; mk_mmin - 1)
#show
#if mk_rok,sfx ≡ 1
    '<line x1="'Xk(0)'" y1="'Ym(mk_m0,sfx$)'" x2="'Xk(mk_kr,sfx$)'" y2="'Ym(mk_mr,sfx$)'" style="stroke:'kl_'; stroke-width:1.8"/>
    '<circle cx="'Xk(mk_kr,sfx$)'" cy="'Ym(mk_mr,sfx$)'" r="3" style="fill:'kl_'"/>
    '<text x="'Xk(mk_kr,sfx$) - 4'" y="'Ym(mk_mr,sfx$) - 5'" text-anchor="end" style="fill:'kl_'">r</text>
#end if
#for j = 1 : 24
    #hide
    k1_ = mk_K,sfx.(j)
    k2_ = mk_K,sfx.(j + 1)
    m1_ = mk_M,sfx.(j)
    m2_ = mk_M,sfx.(j + 1)
    t_ = if(m2_ ≠ m1_; min(max((MR_ - m1_)/(m2_ - m1_); 0); 1); 0)
    km_ = k1_ + t_*(k2_ - k1_)
    #show
    #if j ≡ 1 and mk_rok,sfx ≡ 1 and m1_ ≥ MR_
        '<line x1="'Xk(mk_kr,sfx$)'" y1="'Ym(MR_)'" x2="'Xk(k1_)'" y2="'Ym(m1_)'" style="stroke:'kl_'; stroke-width:1; stroke-dasharray:4 3"/>
    #end if
    #if m1_ ≥ MR_ and m2_ ≥ MR_
        '<line x1="'Xk(k1_)'" y1="'Ym(m1_)'" x2="'Xk(k2_)'" y2="'Ym(m2_)'" style="stroke:'kl_'; stroke-width:1.8"/>
    #else if m1_ < MR_ and m2_ < MR_
        '<line x1="'Xk(k1_)'" y1="'Ym(m1_)'" x2="'Xk(k2_)'" y2="'Ym(m2_)'" style="stroke:'kl_'; stroke-width:1; stroke-dasharray:2 3"/>
    #else if m1_ < MR_
        '<line x1="'Xk(k1_)'" y1="'Ym(m1_)'" x2="'Xk(km_)'" y2="'Ym(MR_)'" style="stroke:'kl_'; stroke-width:1; stroke-dasharray:2 3"/>
        '<line x1="'Xk(km_)'" y1="'Ym(MR_)'" x2="'Xk(k2_)'" y2="'Ym(m2_)'" style="stroke:'kl_'; stroke-width:1.8"/>
        '<line x1="'Xk(mk_kr,sfx$)'" y1="'Ym(MR_)'" x2="'Xk(km_)'" y2="'Ym(MR_)'" style="stroke:'kl_'; stroke-width:1; stroke-dasharray:4 3"/>
    #else
        '<line x1="'Xk(k1_)'" y1="'Ym(m1_)'" x2="'Xk(km_)'" y2="'Ym(MR_)'" style="stroke:'kl_'; stroke-width:1.8"/>
        '<line x1="'Xk(km_)'" y1="'Ym(MR_)'" x2="'Xk(k2_)'" y2="'Ym(m2_)'" style="stroke:'kl_'; stroke-width:1; stroke-dasharray:2 3"/>
    #end if
#loop
#if mk_vl,sfx ≡ 1
    '<circle cx="'Xk(mk_ky,sfx$)'" cy="'Ym(mk_my,sfx$)'" r="3" style="fill:'kl_'"/>
    '<text x="'Xk(mk_ky,sfx$) + 2'" y="'Ym(mk_my,sfx$) + 13'" style="fill:'kl_'">y</text>
#end if
'<circle cx="'Xk(mk_ku,sfx$)'" cy="'Ym(mk_mu,sfx$)'" r="3" style="fill:'kl_'"/>
'<text x="'Xk(mk_ku,sfx$) - 4'" y="'Ym(mk_mu,sfx$) - 5'" text-anchor="end" style="fill:'kl_'">u</text>
#end def
`;
