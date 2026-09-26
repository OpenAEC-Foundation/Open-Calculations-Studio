/**
 * Tweepaals poer — kolom op twee palen, volgens NEN-EN 1992-1-1 met NB.
 *
 * Staafwerkmodel (§6.5, §9.8.1(2)): twee drukdiagonalen van de kolom naar de
 * palen en een trekband onderin, met opgebogen einden boven de palen.
 *
 *   • Paalreacties uit de kolomlast, het kolommoment in de richting van de
 *     paalrij, het eigen gewicht van de poer (γ_G van 6.10a, veilige kant) en
 *     de afwijking van de paalpositie in het werk (9.8.1(1)); getoetst aan het
 *     draagvermogen per paal uit NEN 9997-1 (7.1), als dat is ingevuld.
 *   • De kolomknoop ligt op 2D/(3π) van het hart bij een ronde kolom en op a/4
 *     bij een rechthoekige. De knoop onder de kolom is hydrostatisch
 *     (6.5.4(8)): zijn hoogte is u = a_k/2·cot θ, dus z = d − u/2 en met
 *     tan θ = z/a volgt z = ½(d + √(d² − a_k·a)). Een ronde kolom telt daarbij
 *     als het vierkant met dezelfde oppervlakte. Past de knoop niet
 *     (d² ≤ a_k·a), dan voldoet de poer niet.
 *   • Trekband F_td = R_Ed·a/z met de zwaarst belaste paal voor beide helften.
 *   • Knopen: onder de kolom (6.60) met k_1 = 1,0, met een plastisch drukblok
 *     waarvan de resultante op e_k = M_Ed/F_Ed ligt (een ronde kolom als het
 *     vierkant a_k); valt de resultante buiten a_k/2, dan krijgt de
 *     kolomwapening trek en is de knoop niet getoetst. Boven de paal (6.61)
 *     met k_2 = 0,85; daar zowel de oplegspanning als de diagonaal aan de
 *     knoop (figuur 6.27, u = 2·y_s). De verhoging van 6.5.4(5) is niet benut.
 *   • Verankering vanaf de binnenkant van de paal (6.5.4(7)), langs de
 *     staafas (8.4.3(3)): recht deel, ombuiging en opgebogen deel tot onder de
 *     dekking. α_5 uit de druk van de paal, gespreid onder 45° tot de trekband
 *     (9.8.1(5)); α_2 = α_3 = α_4 = 1. De doorndiameter volgt tabel 8.1Na en
 *     (8.1) met de volle staafkracht; de ombuiging moet voorbij het paalhart
 *     liggen, zodat de trekband boven de paal recht doorloopt. Beide met de
 *     paal e_paal naar de kop van de poer verschoven (9.8.1(1)). Het
 *     opgebogen einde is ten minste 5φ (figuur 8.1) en moet in de poer passen.
 *   • Dwarskracht met a_v tussen kolomrand en paalrand: V_Rd,c (6.2a/b) met
 *     β = a_v/2d en a_v ≥ 0,5·d (6.2.2(6)), of de beugels in het middendeel
 *     0,75·a_v van de werkelijke a_v (6.19): alleen die kruisen de scheur
 *     tussen kolom en paal. De bovengrens (6.5)/(6.9) zonder β.
 *   • Scheurwijdte (7.3.4) met de staalspanning uit de trekband (7.3.1(8))
 *     onder de frequente combinatie (tabel 7.1N van de NB). k_x = 1. Een
 *     betonoppervlak dat niet te inspecteren is krijgt w_max = 0,2 mm: een
 *     eigen, strengere aanname.
 *   • Detaillering: φ_min (9.8.1(3)), vrije ruimte (8.2(2), d_g = 32 mm
 *     aangenomen), A_s,min (9.2.1.1), de trekband binnen de drukspreiding
 *     boven de paal en de beugelafstanden (9.2.2(6) en (8), NB).
 *
 * Niet getoetst: de dwarsrichting (koppelbalken of ingeklemde palen), een
 * trekpaal of trek in de kolomvoet (dan zegt de slotregel "niet volledig
 * getoetst"), de dwarstrek in de drukdiagonalen (6.5.3(3)), de verankering
 * van de paalwapening, huidwapening (7.3.3(3)) en bovenwapening.
 *
 * Geen referentieberekening beschikbaar; scripts/check-poer.mjs rekent de
 * uitkomsten onafhankelijk na en legt een handberekening vast.
 *
 * Variabelenamen komen exact overeen met TweepaalsPoerDesigner.tsx.
 */

export const tweepaalsPoer = `"Tweepaals poer — EN 1992-1-1 §6.5 en §9.8.1

'<i>Kolom op twee palen, gerekend als staafwerk: twee drukdiagonalen van de kolom naar de palen en een trekband onderin, met opgebogen einden boven de palen.</i><span class="alleen-scherm"></span>

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

# 1. Geometrie

@select kolomvorm "Vorm van de kolom"
  Ronde kolom = 1
  Rechthoekige kolom = 2
@end

@select paalvorm "Vorm van de paal"
  Rechthoekige paal = 1
  Ronde paal = 2
@end

d_kolom = ?*(mm)', kolomdiameter, of de kolommaat langs de paalrij<span class="kolom-2"></span>'
#if kolomvorm ≡ 2
    b_kolom = ?*(mm)', kolommaat dwars op de paalrij<span class="kolom-2"></span>'
#end if
b_paal = ?*(mm)', paaldiameter, of de paalmaat langs de paalrij<span class="kolom-2"></span>'
#if paalvorm ≡ 1
    l_paal = ?*(mm)', paalmaat dwars op de paalrij<span class="kolom-2"></span>'
#end if
b_poer = ?*(mm)', breedte van de poer<span class="kolom-3"></span>'
h_poer = ?*(mm)', hoogte van de poer<span class="kolom-3"></span>'
l_hoh = ?*(mm)', hart-op-hartafstand van de palen<span class="kolom-3"></span>'
oversteek = ?*(mm)', van het paalhart tot de kop van de poer<span class="kolom-2"></span>'
e_paal = ?*(mm)', afwijking van de paalpositie in het werk (9.8.1(1))<span class="kolom-2"></span>'

# 2. Beton en wapening

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
@end

@select betonstaal "Betonstaalsoort"
  B500A = 1
  B500B = 2
  B500C = 3
@end

@select betonoppervlak "Betonoppervlak"
  Controleerbaar = 1
  Niet controleerbaar = 2
@end

c_dek = ?*(mm)', betondekking op de beugels<span class="kolom-3"></span>'
n_langs = ?', aantal staven in de trekband<span class="kolom-3"></span>'
d_langs = ?*(mm)', staafdiameter van de trekband<span class="kolom-3"></span>'
n_sneden = ?', aantal beugelsneden<span class="kolom-3"></span>'
d_beugel = ?*(mm)', beugeldiameter<span class="kolom-3"></span>'
s_beugel = ?*(mm)', beugelafstand<span class="kolom-3"></span>'

#hide
f_ck = betonklasse*N/mm^2
f_yk = 500 N/mm^2
f_ctm = 0.30*betonklasse^(2/3)*N/mm^2
E_s = 200000 N/mm^2
E_cm = 22000*((betonklasse + 8)/10)^0.3*N/mm^2
#show
f_cd = f_ck/1.5', α_cc = 1,0 (NB)<span class="kolom-4"></span>'
f_ctd = 0.7*f_ctm/1.5', α_ct = 1,0 (NB)<span class="kolom-4"></span>'
ν_k = 1 - betonklasse/250', ν′ (6.57N)<span class="kolom-4"></span>'
f_yd = f_yk/1.15', B500A/B/C<span class="kolom-4"></span>'

# 3. Belasting

F_Ed = ?*(kN)', rekenwaarde van de kolomlast<span class="kolom-2"></span>'
M_Ed = ?*(kN*m)', rekenwaarde van het kolommoment in de richting van de paalrij<span class="kolom-2"></span>'
F_fr = ?*(kN)', kolomlast in de frequente combinatie, voor de scheurwijdte (NB bij 7.3.1(5))<span class="kolom-2"></span>'
R_cd = ?*(kN)', rekenwaarde van het draagvermogen per paal (NEN 9997-1); 0 = niet toetsen<span class="kolom-2"></span>'

#hide
x_k0 = if(kolomvorm ≡ 1; 2*d_kolom/(3*pi); d_kolom/4)
ok_inv = if(h_poer > c_dek + d_beugel + d_langs/2 and l_hoh > 2*x_k0 and e_paal ≥ 0 mm and oversteek > c_dek + e_paal and b_poer > 0 mm and d_kolom > 0 mm and b_paal > 0 mm and n_langs ≥ 1 and d_langs > 0 mm and s_beugel > 0 mm and F_Ed ≥ 0 kN and F_fr ≥ 0 kN; 1; 0)
#show
#if kolomvorm ≡ 2
    #hide
    ok_inv = if(b_kolom > 0 mm; ok_inv; 0)
    #show
#end if
#if paalvorm ≡ 1
    #hide
    ok_inv = if(l_paal > 0 mm; ok_inv; 0)
    #show
#end if

#if ok_inv ≡ 0
    '<b style="color:#b91c1c">De invoer is onvolledig of past niet: de poer moet hoger zijn dan dekking, beugel en halve staaf, de palen verder uit elkaar dan de kolomknopen, de oversteek groter dan dekking plus paalafwijking, en alle maten, aantallen en lasten positief.</b>
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de poer is niet getoetst: invoer onvolledig</b></span>
#else
    # 4. Paalreacties

    #hide
    γ_G = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
    #show
    l_poer = l_hoh + 2*oversteek', lengte van de poer<span class="kolom-3"></span>'
    G_k = 25 kN/m^3*l_poer*b_poer*h_poer to kN', eigen gewicht<span class="kolom-3"></span>'
    γ_G', 6.10a bij de gevolgklasse, veilige kant<span class="kolom-3"></span>'
    M_tot = abs(M_Ed) + (F_Ed + γ_G*G_k)*e_paal to kN*m', kolommoment plus de paalafwijking'
    R_Ed = (F_Ed + γ_G*G_k)/2 + M_tot/l_hoh to kN', zwaarst belaste paal'
    R_Ed,min = (F_Ed + γ_G*G_k)/2 - M_tot/l_hoh to kN', minst belaste paal'
    #hide
    ok_druk = 1
    UC_paal = 0
    #show
    #if R_Ed,min < 0 kN
        #hide
        ok_druk = 0
        #show
        '<b style="color:#b45309">Een paal krijgt trek. Het staafwerk hieronder gaat uit van twee drukpalen; de trekpaal, zijn verankering in de poer en de bovenwapening zijn niet getoetst.</b>
    #end if
    #if R_cd > 0 kN
        UC_paal = R_Ed/R_cd', draagvermogen van de paal, NEN 9997-1 (7.1)'
    #else
        '<i>Het draagvermogen van de paal is niet getoetst (R<sub>cd</sub> = 0).</i>
    #end if

    # 5. Staafwerkmodel (§6.5)

    y_s = c_dek + d_beugel + d_langs/2', hart van de trekband boven de onderkant<span class="kolom-3"></span>'
    d = h_poer - y_s'<span class="kolom-3"></span>'
    #if kolomvorm ≡ 1
        a_k = sqrt(pi)/2*d_kolom', vierkant met dezelfde oppervlakte<span class="kolom-3"></span>'
        x_k = 2*d_kolom/(3*pi)', zwaartepunt van de halve kolom<span class="kolom-3"></span>'
    #else
        a_k = d_kolom', langs de paalrij<span class="kolom-3"></span>'
        x_k = d_kolom/4', zwaartepunt van de halve kolom<span class="kolom-3"></span>'
    #end if
    a = l_hoh/2 - x_k', van de kolomknoop tot het paalhart<span class="kolom-3"></span>'
    z = (d + sqrt(max(d^2 - a_k*a; 0 mm^2)))/2', hefboomsarm met een hydrostatische knoop onder de kolom (6.5.4(8))<span class="alleen-scherm">: knoophoogte u = a<sub>k</sub>/2·cot θ, z = d − u/2 en tan θ = z/a</span>'
    #hide
    ok_knoop = 1
    #show
    #if d^2 ≤ a_k*a
        #hide
        ok_knoop = 0
        #show
        '<b style="color:#b91c1c">De knoop onder de kolom past niet in de poer (d² ≤ a<sub>k</sub>·a): de poer is te laag voor dit staafwerk.</b>
    #end if
    θ = atan(z/a)*180/pi', hoek van de drukdiagonaal in graden<span class="kolom-3"></span>'
    F_td = R_Ed*a/z to kN', trekband<span class="kolom-3"></span>'
    A_s,nodig = F_td/f_yd to mm^2'<span class="kolom-3"></span>'
    A_s = n_langs*pi/4*d_langs^2 to mm^2'<span class="kolom-3"></span>'
    s_h = (b_poer - 2*(c_dek + d_beugel) - d_langs)/max(n_langs - 1; 1)', h.o.h. van de staven<span class="kolom-3"></span>'
    UC_trek = A_s,nodig/A_s', trekband (6.5.3)'

    # 6. Knopen (§6.5.4)

    #if kolomvorm ≡ 1
        A_k = pi/4*d_kolom^2 to mm^2'<span class="kolom-3"></span>'
    #else
        A_k = d_kolom*b_kolom to mm^2'<span class="kolom-3"></span>'
    #end if
    e_k = abs(M_Ed)/max(F_Ed; 1 kN) to mm', excentriciteit van de kolomlast<span class="kolom-3"></span>'
    σ_Rd,1 = ν_k*f_cd', k<sub>1</sub> = 1,0 (6.60)<span class="kolom-3"></span>'
    #hide
    UC_kn,1 = 0
    #show
    #if 2*e_k < a_k
        σ_Ed,1 = F_Ed/(A_k*(1 - 2*e_k/a_k)) to N/mm^2', drukblok onder de kolom met de resultante op e<sub>k</sub><span class="kolom-2"></span>'
        UC_kn,1 = σ_Ed,1/σ_Rd,1', knoop onder de kolom'
    #else
        #hide
        ok_druk = 0
        #show
        '<b style="color:#b45309">De kolomlast valt buiten de halve kolommaat (2·e<sub>k</sub> ≥ a<sub>k</sub>): de kolomwapening krijgt trek en de knoop onder de kolom is niet getoetst.</b>
    #end if
    #if paalvorm ≡ 1
        A_p = b_paal*l_paal to mm^2'<span class="kolom-3"></span>'
        a_p = b_paal'<span class="kolom-3"></span>'
        b_p = l_paal'<span class="kolom-3"></span>'
    #else
        A_p = pi/4*b_paal^2 to mm^2'<span class="kolom-3"></span>'
        a_p = sqrt(A_p) to mm', vierkant met dezelfde oppervlakte<span class="kolom-3"></span>'
        b_p = a_p'<span class="kolom-3"></span>'
    #end if
    σ_p = R_Ed/A_p to N/mm^2', oplegspanning op de paal<span class="kolom-2"></span>'
    w_2 = (a_p*z + 2*y_s*a)/sqrt(z^2 + a^2) to mm', a<sub>p</sub>·sin θ + u·cos θ met u = 2·y<sub>s</sub> (figuur 6.27)<span class="kolom-2"></span>'
    σ_d = R_Ed*sqrt(z^2 + a^2)/(z*w_2*min(b_p; b_poer)) to N/mm^2', drukdiagonaal aan de paalknoop<span class="kolom-2"></span>'
    σ_Rd,2 = 0.85*ν_k*f_cd', k<sub>2</sub> = 0,85 met beugels of haarspelden om de knoop (6.61, NB)<span class="kolom-2"></span>'
    UC_kn,2 = max(σ_p; σ_d)/σ_Rd,2', knoop boven de paal'

    # 7. Verankering en ombuiging (§8.3, §8.4, §9.8.1)

    #hide
    η_2 = if(d_langs ≤ 32 mm; 1; (132 - d_langs/(1 mm))/100)
    #show
    f_bd = 2.25*η_2*f_ctd', (8.2), η<sub>1</sub> = 1 onderin<span class="kolom-3"></span>'
    σ_sd = F_td/A_s to N/mm^2'<span class="kolom-3"></span>'
    l_b,rqd = d_langs/4*σ_sd/f_bd to mm', (8.3)<span class="kolom-3"></span>'
    p = R_Ed/((a_p + 2*y_s)*(b_p + 2*y_s)) to N/mm^2', druk uit de paal, onder 45° gespreid tot de trekband (9.8.1(5))<span class="kolom-2"></span>'
    α_5 = min(1; max(0.7; 1 - 0.04*p/(N/mm^2)))', tabel 8.2<span class="kolom-2"></span>'
    c_d = min((s_h - d_langs)/2; c_dek + d_beugel)', figuur 8.3, gebogen staaf<span class="kolom-2"></span>'
    α_1 = if(c_d > 3*d_langs; 0.7; 1)', tabel 8.2; α<sub>2</sub> = α<sub>3</sub> = α<sub>4</sub> = 1<span class="kolom-2"></span>'
    l_b,min = max(0.3*l_b,rqd; 10*d_langs; 100 mm)', (8.6)<span class="kolom-2"></span>'
    l_bd = max(α_1*α_5*l_b,rqd; l_b,min)', (8.4)<span class="kolom-2"></span>'
    φ_m,tab = if(d_langs ≤ 16 mm; 4; 5)*d_langs', tabel 8.1Na<span class="kolom-3"></span>'
    F_bt = F_td/n_langs', volle staafkracht (veilige kant)<span class="kolom-3"></span>'
    a_b = min(s_h/2; c_dek + d_beugel + d_langs/2)', (8.1)<span class="kolom-3"></span>'
    φ_m,bet = F_bt*(1/a_b + 1/(2*d_langs))/min(f_cd; 55/1.5*N/mm^2) to mm', (8.1)<span class="kolom-2"></span>'
    φ_m = max(φ_m,tab; φ_m,bet)', doorndiameter<span class="kolom-2"></span>'
    o_min = oversteek - e_paal', de paal e<sub>paal</sub> naar de kop verschoven (9.8.1(1))<span class="kolom-2"></span>'
    UC_rol = (φ_m/2 + d_langs)/(o_min - c_dek)', de ombuiging ligt voorbij het paalhart'
    r_b = φ_m/2 + d_langs/2', staafas in de ombuiging<span class="kolom-3"></span>'
    l_1 = o_min + a_p/2 - c_dek - φ_m/2 - d_langs', recht, vanaf de binnenkant van de paal (6.5.4(7))<span class="kolom-3"></span>'
    l_v = h_poer - c_dek - y_s - r_b', opgebogen, tot onder de dekking<span class="kolom-3"></span>'
    l_b,besch = l_1 + pi*r_b/2 + l_v', beschikbaar langs de staafas (8.4.3(3))<span class="kolom-2"></span>'
    l_v,nodig = max(l_bd - l_1 - pi*r_b/2; 5*d_langs)', opgebogen deel dat ten minste nodig is, ≥ 5φ (figuur 8.1)<span class="kolom-2"></span>'
    UC_ank = l_bd/l_b,besch', verankering van de trekband'

    # 8. Dwarskracht (§6.2.2(6), §6.2.3(8))

    a_v = max(l_hoh/2 - d_kolom/2 - b_paal/2; 0 mm)', van de kolomrand tot de paalrand<span class="kolom-2"></span>'
    β = min(1; max(a_v; 0.5*d)/(2*d))', met a<sub>v</sub> ten minste 0,5·d<span class="kolom-2"></span>'
    k = min(2; 1 + sqrt(200 mm/d))'<span class="kolom-3"></span>'
    ρ_l = min(0.02; A_s/(b_poer*d))'<span class="kolom-3"></span>'
    v_Rd,c = max(0.12*k*(100*ρ_l*betonklasse)^(1/3); 0.035*k^1.5*sqrt(betonklasse))*N/mm^2', (6.2a), (6.2b)<span class="kolom-3"></span>'
    V_Rd,c = v_Rd,c*b_poer*d to kN'<span class="kolom-3"></span>'
    n_bg = floor(0.75*a_v/s_beugel)', beugels in het middendeel 0,75·a<sub>v</sub><span class="kolom-3"></span>'
    V_Rd,s = n_bg*n_sneden*pi/4*d_beugel^2*f_yd to kN', (6.19)<span class="kolom-3"></span>'
    UC_V = β*R_Ed/max(V_Rd,c; V_Rd,s)', V<sub>Ed</sub> = R<sub>Ed</sub>, met β'
    V_Rd,max = 0.5*0.6*ν_k*f_cd*b_poer*0.9*d to kN', (6.5) en (6.9) met θ = 45° en z = 0,9·d<span class="kolom-2"></span>'
    UC_Vmax = R_Ed/V_Rd,max', zonder β<span class="kolom-2"></span>'

    # 9. Scheurwijdte (§7.3.4)

    R_fr = (F_fr + G_k)/2 + (abs(M_Ed) + (F_fr + G_k)*e_paal)/l_hoh to kN', frequent, met M<sub>Ed</sub> zelf (veilige kant)<span class="kolom-2"></span>'
    σ_s = R_fr*a/(z*A_s) to N/mm^2', uit de trekband (7.3.1(8))<span class="kolom-2"></span>'
    h_c,ef = min(2.5*y_s; h_poer/2)', (h − x)/3 niet benut<span class="kolom-3"></span>'
    ρ_p,eff = A_s/(b_poer*h_c,ef)', (7.10)<span class="kolom-3"></span>'
    c_s = c_dek + d_beugel', dekking op de trekband<span class="kolom-3"></span>'
    #if s_h > 5*(c_s + d_langs/2)
        s_r,max = 1.3*h_poer', (7.14) met x = 0<span class="kolom-2"></span>'
    #else
        s_r,max = 3.4*c_s + 0.8*0.5*0.425*d_langs/ρ_p,eff', (7.11)<span class="kolom-2"></span>'
    #end if
    ε_sm = max((σ_s - 0.4*f_ctm/ρ_p,eff*(1 + E_s/E_cm*ρ_p,eff))/E_s; 0.6*σ_s/E_s)', ε<sub>sm</sub> − ε<sub>cm</sub> (7.9), k<sub>t</sub> = 0,4<span class="kolom-2"></span>'
    w_k = s_r,max*ε_sm to mm', (7.8)<span class="kolom-2"></span>'
    #if betonoppervlak ≡ 1
        w_max = 0.3 mm', tabel 7.1N (NB), XC2–XC4, k<sub>x</sub> = 1<span class="kolom-2"></span>'
    #else
        w_max = 0.2 mm', niet te inspecteren: strenger aangehouden (veilige kant)<span class="kolom-2"></span>'
    #end if
    UC_w = w_k/w_max', scheurwijdte'

    # 10. Detaillering (§8.2, §9.2, §9.8.1(3))

    a_vrij = s_h - d_langs', vrije ruimte; ≥ max(φ; d<sub>g</sub> + 5; 20) met d<sub>g</sub> = 32 mm (8.2(2))<span class="kolom-2"></span>'
    A_s,min = max(0.26*f_ctm/f_yk; 0.0013)*b_poer*d to mm^2', (9.1N), strenger dan de NB (veilige kant)<span class="kolom-2"></span>'
    b_band = b_poer - 2*(c_dek + d_beugel)', breedte van de trekband<span class="kolom-2"></span>'
    b_zone = b_p + 2*y_s', drukspreiding boven de paal<span class="kolom-2"></span>'
    s_t = (b_poer - 2*c_dek - d_beugel)/max(n_sneden - 1; 1)', tussen de beugelsneden<span class="kolom-2"></span>'
    #hide
    s_l,max = min(0.75*d; 300 mm)
    s_t,max = if(R_Ed > 0.5*V_Rd,max; min(0.75*d; 500 mm); 500 mm)
    ok_det = 1
    #show
    '<i>Beugels: s ≤ 's_l,max' mm (9.2.2(6), NB) en s<sub>t</sub> ≤ 's_t,max' mm (9.2.2(8), NB); het opgebogen einde ten minste 'l_v,nodig' mm boven de ombuiging.</i>
    #if d_langs < 8 mm
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">De staafdiameter is kleiner dan φ<sub>min</sub> = 8 mm (9.8.1(3), NB).</b>
    #end if
    #if n_langs > 1 and a_vrij < max(d_langs; 37 mm)
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">De vrije ruimte tussen de staven is te klein (8.2(2)).</b>
    #end if
    #if A_s < A_s,min
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">De trekband is kleiner dan de minimumwapening (9.2.1.1, 9.8.1(3)).</b>
    #end if
    #if l_v < 5*d_langs
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">Het opgebogen einde past niet in de hoogte van de poer: l<sub>v</sub> < 5φ (figuur 8.1).</b>
    #end if
    #if b_band > b_zone
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">De trekband is breder dan de drukspreiding boven de paal: concentreer de staven boven de palen (9.8.1(3)).</b>
    #end if
    #if s_beugel > s_l,max or s_t > s_t,max
        #hide
        ok_det = 0
        #show
        '<b style="color:#b91c1c">De beugelafstand is groter dan 9.2.2 toelaat.</b>
    #end if

    # 11. Samenvatting

    #hide
    M_dwars = (F_Ed + γ_G*G_k)*e_paal to kN*m
    UC_max = max(UC_paal; UC_trek; UC_kn,1; UC_kn,2; UC_ank; UC_rol; UC_V; UC_Vmax; UC_w)
    maatg = if(UC_max ≡ UC_paal; "paal"; if(UC_max ≡ UC_trek; "trekband"; if(UC_max ≡ UC_kn,1; "knoop onder de kolom"; if(UC_max ≡ UC_kn,2; "knoop boven de paal"; if(UC_max ≡ UC_ank; "verankering"; if(UC_max ≡ UC_rol; "ombuiging"; if(UC_max ≡ UC_V; "dwarskracht"; if(UC_max ≡ UC_Vmax; "dwarskracht, bovengrens"; "scheurwijdte"))))))))
    #show
    '<i>Dwars op de paalrij heeft de poer geen stijfheid: een moment of de paalafwijking in die richting (tot 'M_dwars' kNm) gaat via koppelbalken of ingeklemde palen en is hier niet getoetst.</i>
    '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Toets</th><th style="text-align:left; padding:3px 8px;">Norm</th><th style="text-align:right; padding:3px 8px;">UC</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
    #if R_cd > 0 kN
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Draagvermogen paal</td><td style="padding:3px 8px;">NEN 9997-1 (7.1)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_paal)'">'UC_paal'</td><td style="padding:3px 8px; color:'kleur(UC_paal)'">'oordeel(UC_paal)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Draagvermogen paal</td><td style="padding:3px 8px;">NEN 9997-1 (7.1)</td><td style="padding:3px 8px; text-align:right; color:#9ca3af;">—</td><td style="padding:3px 8px; color:#9ca3af;">niet getoetst</td></tr>
    #end if
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Trekband</td><td style="padding:3px 8px;">§6.5.3</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_trek)'">'UC_trek'</td><td style="padding:3px 8px; color:'kleur(UC_trek)'">'oordeel(UC_trek)'</td></tr>
    #if 2*e_k < a_k
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,1)'">'UC_kn,1'</td><td style="padding:3px 8px; color:'kleur(UC_kn,1)'">'oordeel(UC_kn,1)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:#9ca3af;">—</td><td style="padding:3px 8px; color:#9ca3af;">niet getoetst</td></tr>
    #end if
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop boven de paal</td><td style="padding:3px 8px;">(6.61)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,2)'">'UC_kn,2'</td><td style="padding:3px 8px; color:'kleur(UC_kn,2)'">'oordeel(UC_kn,2)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Verankering trekband</td><td style="padding:3px 8px;">§8.4, §9.8.1(5)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_ank)'">'UC_ank'</td><td style="padding:3px 8px; color:'kleur(UC_ank)'">'oordeel(UC_ank)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Ombuiging voorbij het paalhart</td><td style="padding:3px 8px;">§8.3</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_rol)'">'UC_rol'</td><td style="padding:3px 8px; color:'kleur(UC_rol)'">'oordeel(UC_rol)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarskracht</td><td style="padding:3px 8px;">§6.2.2(6), §6.2.3(8)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_V)'">'UC_V'</td><td style="padding:3px 8px; color:'kleur(UC_V)'">'oordeel(UC_V)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarskracht, bovengrens</td><td style="padding:3px 8px;">(6.5), (6.9)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_Vmax)'">'UC_Vmax'</td><td style="padding:3px 8px; color:'kleur(UC_Vmax)'">'oordeel(UC_Vmax)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Scheurwijdte</td><td style="padding:3px 8px;">§7.3.4</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_w)'">'UC_w'</td><td style="padding:3px 8px; color:'kleur(UC_w)'">'oordeel(UC_w)'</td></tr>
    #if ok_det ≡ 1
        '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2, §9.8.1(3)</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#047857;">voldoet</td></tr>
    #else
        '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2, §9.8.1(3)</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#b91c1c;">voldoet niet</td></tr>
    #end if
    '</table>
    UC_max'<span class="alleen-scherm"></span>'
    #if ok_knoop ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de knoop onder de kolom past niet in de poer (hoofdstuk 5) → <b>de poer voldoet niet</b></span>
    #else if ok_det ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg'), maar de detaillering past niet (hoofdstuk 10) → <b>de poer voldoet niet</b></span>
    #else if UC_max > 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg') > 1,0 → <b>de poer voldoet niet</b></span>
    #else if ok_druk ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ('maatg') ≤ 1,0, maar een paal of de kolomvoet krijgt trek → <b>de poer is niet volledig getoetst</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0 → <b>de poer voldoet</b></span>
    #end if
#end if
`;
