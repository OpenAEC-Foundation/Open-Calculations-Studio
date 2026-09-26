/**
 * Opdrijven en drijvend lichaam — drie verwante berekeningen op één blad.
 * Een keuze bovenin bepaalt welk deel actief is.
 *
 * 1. Opdrijven van een kelder of bak (UPL), NEN 9997-1 2.4.7.4 en 10.2:
 *      V_dst;d ≤ G_stb;d + R_d                                      (2.8)
 *    • V_dst;d: de opwaartse waterdruk op de onderkant bij de rekenwaarde van
 *      de waterstand h_d (NB bij NEN-EN 1990 A1.3.1(2); rechtstreeks, of met
 *      (NB.4) h_d = h_k + k·(h_k − h_m) met k = 1), maal γ_G;dst.
 *    • G_stb;d: eigen gewicht van de bak plus overige blijvende belasting en
 *      ballast, maal γ_G;stb. Veranderlijke belasting telt niet mee (gunstig).
 *    • R_d: trekpalen, n·R_t;k/γ_s;t met γ_s;t = 1,40 (tabel A.16).
 *    • Factoren: UPL volgens tabel A.15 (1,0 en 0,9), of EQU volgens NEN-EN
 *      1990 tabel NB.3 – A1.2(A) (1,1 en 0,9). NEN 9997-1 10.2(2) wijst voor
 *      opdrijven (2.8) aan; EQU is de strengere keuze.
 *    Niet getoetst: het omhoogkomen van een grondkluit met de palen
 *    (7.6.3.1(4)) en de sterkte van vloer en wanden onder de waterdruk
 *    (STR, 10.2 opmerking 1). Wandwrijving is niet meegeteld (veilige kant).
 *    Een waterstand boven de bak valt buiten het blad.
 *
 * 2. Zwaartepunt van belastingen: tot tien lasten F_i in (x_i; y_i; z_i) →
 *    resultante R = ΣF_i, zwaartepunt x_R = ΣF_i·x_i/R (idem y, z) en de
 *    excentriciteit en het moment R·e t.o.v. een referentiepunt. Geen toets.
 *
 * 3. Drijvend lichaam: een rechthoekige betonbak (wanden 1–4, vloer, eventueel
 *    een dek) met blijvende lasten uit de tabel van deel 2, gemeten vanuit het
 *    midden van de bak (x, y) en de onderkant (z).
 *    • Diepgang d = ΣG/(γ_w·l·b) (Archimedes); drukkingspunt KB = d/2.
 *    • Gewichtszwaartepunt KG = ΣG·z/ΣG; metacentrum BM = I/V = b²/(12·d)
 *      dwars en l²/(12·d) langs; GM = KB + BM − KG > 0.
 *    • Scheefstand met de kleine-hoekbenadering φ = M/(Δ·GM): in rust door de
 *      excentriciteit van G, en onder een veranderlijke last met wind of met
 *      een excentrische last (personen aan één zijde). Wind en excentrische
 *      last werken aan de kant van de scheefstand in rust (veilige kant).
 *    • Vrijboord aan de lage hoek: f = h − d − φ·b/2 − θ·l/2 ≥ f_min.
 *    Gerekend met karakteristieke waarden (γ = 1,0): scheefstand en vrijboord
 *    zijn gebruikseisen; de grenswaarden φ_max, f_min en GM_min zijn invoer.
 *    Niet beschouwd: vrije vloeistofoppervlakken, golven en andere dynamische
 *    effecten, grote hoeken (de benadering geldt zolang de kim onder water en
 *    de dekrand boven water blijft; dat wordt bewaakt).
 *
 * De omschrijving van een last staat in het parametrische beeld; het blad
 * nummert de lasten.
 *
 * Geen referentieberekening beschikbaar; scripts/check-opdrijven.mjs rekent
 * per deel een voorbeeld met de hand na en de uitkomsten onafhankelijk.
 *
 * Variabelenamen komen exact overeen met OpdrijvenDesigner.tsx.
 */

export const opdrijven = `"Opdrijven en drijvend lichaam — NEN 9997-1 (2.8) en drijfstabiliteit

'<i>Drie verwante berekeningen op één blad: opdrijven van een kelder of bak, het zwaartepunt van een groep lasten, en een drijvende bak met diepgang, metacentrische hoogte, scheefstand en vrijboord.</i><span class="alleen-scherm"></span>

@select deel "Berekening"
  Opdrijven van een kelder of bak (UPL) = 1
  Zwaartepunt van belastingen = 2
  Drijvend lichaam: diepgang, stabiliteit en vrijboord = 3
@end

#if deel ≠ 2
    # 1. Bak

    '<i>Maten buitenwerks; x langs de lengte en y over de breedte vanuit het midden, z vanaf de onderkant. Wand 1 en 2 zijn de langswanden bij y = −b/2 en +b/2 over de volle lengte, wand 3 en 4 de kopwanden bij x = −l/2 en +l/2 ertussen.</i>
    l_bak = ?*(m)', lengte<span class="kolom-3"></span>'
    b_bak = ?*(m)', breedte<span class="kolom-3"></span>'
    h_bak = ?*(m)', hoogte<span class="alleen-scherm">, onderkant vloer tot bovenkant</span><span class="kolom-3"></span>'
    t_vl = ?*(m)', vloer<span class="kolom-4"></span>'
    t_dak = ?*(m)'<span class="alleen-scherm">, dak of dek, 0 = open bak</span><span class="kolom-4"></span>'
    γ_c = ?*(kN/m^3)', beton<span class="kolom-4"></span>'
    γ_w = ?*(kN/m^3)', water<span class="kolom-4"></span>'
    t_w1 = ?*(m)'<span class="alleen-scherm">, wand 1, langs, y = −b/2</span><span class="kolom-4"></span>'
    t_w2 = ?*(m)'<span class="alleen-scherm">, wand 2, langs, y = +b/2</span><span class="kolom-4"></span>'
    t_w3 = ?*(m)'<span class="alleen-scherm">, wand 3, kop, x = −l/2</span><span class="kolom-4"></span>'
    t_w4 = ?*(m)'<span class="alleen-scherm">, wand 4, kop, x = +l/2</span><span class="kolom-4"></span>'
    #hide
    h_wand = h_bak - t_vl - t_dak
    l_kop = b_bak - t_w1 - t_w2
    ok_geo = if(l_bak > 0 m and b_bak > 0 m and t_vl > 0 m and t_dak ≥ 0 m and t_w1 ≥ 0 m and t_w2 ≥ 0 m and t_w3 ≥ 0 m and t_w4 ≥ 0 m and h_wand > 0 m and l_kop > 0 m and l_bak - t_w3 - t_w4 > 0 m and γ_c > 0 kN/m^3 and γ_w > 0 kN/m^3; 1; 0)
    #show
#end if

#if deel ≡ 1
    # 2. Waterstand, ballast en trekpalen

    @select waterstand "Rekenwaarde van de waterstand"
      Rechtstreeks ingevoerd = 1
      Uit de karakteristieke en de gemiddelde waterstand met (NB.4) = 2
    @end
    '<i>h<sub>d</sub>: rekenwaarde van de waterstand boven de onderkant van de vloer (NB bij NEN-EN 1990 A1.3.1(2)); bij gevolgklasse CC'CC' hoort de kans P<sub>e</sub> uit tabel NB.7.</i>
    #if waterstand ≡ 1
        h_d = ?*(m)'<span class="alleen-scherm">, rekenwaarde van de waterstand boven de onderkant van de vloer</span><span class="kolom-3"></span>'
    #else
        h_k = ?*(m)'<span class="alleen-scherm">, karakteristieke hoge waterstand</span><span class="kolom-4"></span>'
        h_m = ?*(m)'<span class="alleen-scherm">, gemiddelde waterstand</span><span class="kolom-4"></span>'
        h_d = h_k + (h_k - h_m)', (NB.4), k = 1<span class="kolom-2"></span>'
    #end if
    G_ov = ?*(kN)', overig<span class="alleen-scherm">: afwerking, installaties, bovenbouw; in een bouwfase alleen wat dan al aanwezig is</span><span class="kolom-4"></span>'
    G_bal = ?*(kN)', ballast<span class="kolom-4"></span>'
    n_tp = ?', trekpalen<span class="alleen-scherm">, aantal, 0 = geen</span><span class="kolom-4"></span>'
    R_t,k = ?*(kN)', per paal<span class="alleen-scherm">, karakteristieke trekweerstand met het groepseffect (7.6.3)</span><span class="kolom-4"></span>'
    @select factoren "Partiële factoren"
      UPL volgens NEN 9997-1 tabel A.15 = 1
      EQU volgens NEN-EN 1990 tabel NB.3 – A1.2(A) = 2
    @end

    #hide
    ok_inv = if(ok_geo ≡ 1 and h_d ≥ 0 m and h_d ≤ h_bak and n_tp ≥ 0 and R_t,k ≥ 0 kN and G_ov ≥ 0 kN and G_bal ≥ 0 kN; 1; 0)
    #show
    #if ok_inv ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig of past niet: lengte, breedte, vloer en beton- en watergewicht positief, de wanden passen in de bak (h > vloer + dak, b > wand 1 + wand 2, l > wand 3 + wand 4), de waterstand tussen de onderkant en de bovenkant van de bak en lasten en trekweerstand niet negatief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>het opdrijven is niet getoetst: invoer onvolledig</b></span>
    #else
        # 3. Gewicht van de bak

        V_vd = l_bak*b_bak*(t_vl + t_dak)', vloer en dak'
        V_wl = l_bak*(t_w1 + t_w2)*h_wand', langswanden'
        V_wk = l_kop*(t_w3 + t_w4)*h_wand', kopwanden'
        V_c = V_vd + V_wl + V_wk', betonvolume'
        G_bak = γ_c*V_c to kN'<span class="kolom-2"></span>'
        G_stb,k = G_bak + G_ov + G_bal', blijvend, weerstandbiedend'

        # 4. Opdrijven (2.8)

        A_g = l_bak*b_bak', grondvlak<span class="kolom-2"></span>'
        U_k = γ_w*h_d*A_g to kN', waterdruk op de onderkant bij h<sub>d</sub>'
        #if factoren ≡ 1
            γ_G,dst = 1.0', tabel A.15<span class="alleen-scherm">, aandrijvend</span><span class="kolom-3"></span>'
            γ_G,stb = 0.9', tabel A.15<span class="alleen-scherm">, weerstandbiedend</span><span class="kolom-3"></span>'
        #else
            γ_G,dst = 1.1', tabel NB.3<span class="alleen-scherm"> – A1.2(A), ongunstig</span><span class="kolom-3"></span>'
            γ_G,stb = 0.9', tabel NB.3<span class="alleen-scherm"> – A1.2(A), gunstig</span><span class="kolom-3"></span>'
        #end if
        γ_s,t = 1.4', tabel A.16<span class="alleen-scherm">, trekweerstand van een paal</span><span class="kolom-3"></span>'
        V_dst,d = γ_G,dst*U_k'<span class="kolom-2"></span>'
        G_stb,d = γ_G,stb*G_stb,k'<span class="kolom-2"></span>'
        R_d = n_tp*R_t,k/γ_s,t', trekpalen<span class="kolom-2"></span>'
        UC_upl = V_dst,d/(G_stb,d + R_d)', V<sub>dst;d</sub> ≤ G<sub>stb;d</sub> + R<sub>d</sub> (2.8)'
        ΔG_k = max(V_dst,d - G_stb,d - R_d; 0 kN)/γ_G,stb', extra ballast nodig<span class="alleen-scherm"> om te voldoen (karakteristiek)</span>'
        #if factoren ≡ 2
            '<i>NEN 9997-1 10.2(2) wijst voor opdrijven vergelijking (2.8) met tabel A.15 aan (1,0 op de waterdruk bij h<sub>d</sub>); de EQU-set legt 1,1 op de waterdruk en is strenger.</i><span class="alleen-scherm"></span>
        #end if
        #if n_tp > 0
            '<i>Alleen het uittrekken van de palen; het omhoogkomen van een grondkluit met de palen (7.6.3.1(4)) is niet getoetst.</i>
        #end if
        '<i>Niet getoetst: vloer en wanden onder de waterdruk (STR, 10.2 opmerking 1). Wandwrijving is niet meegeteld.</i><span class="alleen-scherm"></span>

        UC_max = UC_upl'<span class="alleen-scherm"></span>'
        #if UC_max ≤ 1.0
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> (opdrijven) ≤ 1,0 → <b>de bak voldoet</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> (opdrijven) > 1,0 → <b>de bak voldoet niet</b>: 'ΔG_k' kN extra ballast nodig</span>
        #end if
    #end if
#end if

#if deel ≠ 1
    #if deel ≡ 2
        # 1. Lasten en zwaartepunt

        '<i>Tot tien lasten met hun grootte en aangrijpingspunt (x; y; z). Een negatieve last trekt af, bijvoorbeeld een sparing. De omschrijving per last staat in het parametrische beeld.</i><span class="alleen-scherm"></span>
    #else
        # 2. Opbouw, inrichting en zwaartepunt

        '<i>Blijvende lasten op de bak: opbouw, inrichting, installaties, ballast. x en y vanuit het midden van de bak, z vanaf de onderkant. De omschrijving per last staat in het parametrische beeld.</i><span class="alleen-scherm"></span>
    #end if
    n_last = ?', aantal lasten, 0 tot en met 10<span class="alleen-scherm"></span>'
    #hide
    n_L = min(10; max(0; round(n_last)))
    F_1 = 0 kN
    x_1 = 0 m
    y_1 = 0 m
    z_1 = 0 m
    F_2 = 0 kN
    x_2 = 0 m
    y_2 = 0 m
    z_2 = 0 m
    F_3 = 0 kN
    x_3 = 0 m
    y_3 = 0 m
    z_3 = 0 m
    F_4 = 0 kN
    x_4 = 0 m
    y_4 = 0 m
    z_4 = 0 m
    F_5 = 0 kN
    x_5 = 0 m
    y_5 = 0 m
    z_5 = 0 m
    F_6 = 0 kN
    x_6 = 0 m
    y_6 = 0 m
    z_6 = 0 m
    F_7 = 0 kN
    x_7 = 0 m
    y_7 = 0 m
    z_7 = 0 m
    F_8 = 0 kN
    x_8 = 0 m
    y_8 = 0 m
    z_8 = 0 m
    F_9 = 0 kN
    x_9 = 0 m
    y_9 = 0 m
    z_9 = 0 m
    F_10 = 0 kN
    x_10 = 0 m
    y_10 = 0 m
    z_10 = 0 m
    #show
    #if n_L ≥ 1
        F_1 = ?*(kN)', last 1<span class="alleen-scherm"></span>'
        x_1 = ?*(m)'<span class="alleen-scherm"></span>'
        y_1 = ?*(m)'<span class="alleen-scherm"></span>'
        z_1 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 2
        F_2 = ?*(kN)', last 2<span class="alleen-scherm"></span>'
        x_2 = ?*(m)'<span class="alleen-scherm"></span>'
        y_2 = ?*(m)'<span class="alleen-scherm"></span>'
        z_2 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 3
        F_3 = ?*(kN)', last 3<span class="alleen-scherm"></span>'
        x_3 = ?*(m)'<span class="alleen-scherm"></span>'
        y_3 = ?*(m)'<span class="alleen-scherm"></span>'
        z_3 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 4
        F_4 = ?*(kN)', last 4<span class="alleen-scherm"></span>'
        x_4 = ?*(m)'<span class="alleen-scherm"></span>'
        y_4 = ?*(m)'<span class="alleen-scherm"></span>'
        z_4 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 5
        F_5 = ?*(kN)', last 5<span class="alleen-scherm"></span>'
        x_5 = ?*(m)'<span class="alleen-scherm"></span>'
        y_5 = ?*(m)'<span class="alleen-scherm"></span>'
        z_5 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 6
        F_6 = ?*(kN)', last 6<span class="alleen-scherm"></span>'
        x_6 = ?*(m)'<span class="alleen-scherm"></span>'
        y_6 = ?*(m)'<span class="alleen-scherm"></span>'
        z_6 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 7
        F_7 = ?*(kN)', last 7<span class="alleen-scherm"></span>'
        x_7 = ?*(m)'<span class="alleen-scherm"></span>'
        y_7 = ?*(m)'<span class="alleen-scherm"></span>'
        z_7 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 8
        F_8 = ?*(kN)', last 8<span class="alleen-scherm"></span>'
        x_8 = ?*(m)'<span class="alleen-scherm"></span>'
        y_8 = ?*(m)'<span class="alleen-scherm"></span>'
        z_8 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 9
        F_9 = ?*(kN)', last 9<span class="alleen-scherm"></span>'
        x_9 = ?*(m)'<span class="alleen-scherm"></span>'
        y_9 = ?*(m)'<span class="alleen-scherm"></span>'
        z_9 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #if n_L ≥ 10
        F_10 = ?*(kN)', last 10<span class="alleen-scherm"></span>'
        x_10 = ?*(m)'<span class="alleen-scherm"></span>'
        y_10 = ?*(m)'<span class="alleen-scherm"></span>'
        z_10 = ?*(m)'<span class="alleen-scherm"></span>'
    #end if
    #hide
    R_L = F_1 + F_2 + F_3 + F_4 + F_5 + F_6 + F_7 + F_8 + F_9 + F_10
    S_Lx = F_1*x_1 + F_2*x_2 + F_3*x_3 + F_4*x_4 + F_5*x_5 + F_6*x_6 + F_7*x_7 + F_8*x_8 + F_9*x_9 + F_10*x_10 to kN*m
    S_Ly = F_1*y_1 + F_2*y_2 + F_3*y_3 + F_4*y_4 + F_5*y_5 + F_6*y_6 + F_7*y_7 + F_8*y_8 + F_9*y_9 + F_10*y_10 to kN*m
    S_Lz = F_1*z_1 + F_2*z_2 + F_3*z_3 + F_4*z_4 + F_5*z_5 + F_6*z_6 + F_7*z_7 + F_8*z_8 + F_9*z_9 + F_10*z_10 to kN*m
    #show
#end if

#if deel ≡ 2
    #if n_L ≡ 0 or abs(R_L) < 0.000001 kN
        '<b style="color:#b91c1c">Geen lasten, of de lasten heffen elkaar op (resultante nul): er is geen zwaartepunt.</b>
    #else
        '<table style="border-collapse:collapse; font-size:0.9em;">
        '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Last</th><th style="text-align:right; padding:2px 8px;">F [kN]</th><th style="text-align:right; padding:2px 8px;">x [m]</th><th style="text-align:right; padding:2px 8px;">y [m]</th><th style="text-align:right; padding:2px 8px;">z [m]</th><th style="text-align:right; padding:2px 8px;">F·x [kNm]</th><th style="text-align:right; padding:2px 8px;">F·y [kNm]</th><th style="text-align:right; padding:2px 8px;">F·z [kNm]</th></tr>
        #if n_L ≥ 1
            '<tr><td style="padding:1px 8px;">1</td><td style="text-align:right; padding:1px 8px;">'F_1'</td><td style="text-align:right; padding:1px 8px;">'x_1'</td><td style="text-align:right; padding:1px 8px;">'y_1'</td><td style="text-align:right; padding:1px 8px;">'z_1'</td><td style="text-align:right; padding:1px 8px;">'F_1*x_1/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_1*y_1/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_1*z_1/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 2
            '<tr><td style="padding:1px 8px;">2</td><td style="text-align:right; padding:1px 8px;">'F_2'</td><td style="text-align:right; padding:1px 8px;">'x_2'</td><td style="text-align:right; padding:1px 8px;">'y_2'</td><td style="text-align:right; padding:1px 8px;">'z_2'</td><td style="text-align:right; padding:1px 8px;">'F_2*x_2/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_2*y_2/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_2*z_2/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 3
            '<tr><td style="padding:1px 8px;">3</td><td style="text-align:right; padding:1px 8px;">'F_3'</td><td style="text-align:right; padding:1px 8px;">'x_3'</td><td style="text-align:right; padding:1px 8px;">'y_3'</td><td style="text-align:right; padding:1px 8px;">'z_3'</td><td style="text-align:right; padding:1px 8px;">'F_3*x_3/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_3*y_3/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_3*z_3/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 4
            '<tr><td style="padding:1px 8px;">4</td><td style="text-align:right; padding:1px 8px;">'F_4'</td><td style="text-align:right; padding:1px 8px;">'x_4'</td><td style="text-align:right; padding:1px 8px;">'y_4'</td><td style="text-align:right; padding:1px 8px;">'z_4'</td><td style="text-align:right; padding:1px 8px;">'F_4*x_4/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_4*y_4/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_4*z_4/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 5
            '<tr><td style="padding:1px 8px;">5</td><td style="text-align:right; padding:1px 8px;">'F_5'</td><td style="text-align:right; padding:1px 8px;">'x_5'</td><td style="text-align:right; padding:1px 8px;">'y_5'</td><td style="text-align:right; padding:1px 8px;">'z_5'</td><td style="text-align:right; padding:1px 8px;">'F_5*x_5/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_5*y_5/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_5*z_5/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 6
            '<tr><td style="padding:1px 8px;">6</td><td style="text-align:right; padding:1px 8px;">'F_6'</td><td style="text-align:right; padding:1px 8px;">'x_6'</td><td style="text-align:right; padding:1px 8px;">'y_6'</td><td style="text-align:right; padding:1px 8px;">'z_6'</td><td style="text-align:right; padding:1px 8px;">'F_6*x_6/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_6*y_6/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_6*z_6/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 7
            '<tr><td style="padding:1px 8px;">7</td><td style="text-align:right; padding:1px 8px;">'F_7'</td><td style="text-align:right; padding:1px 8px;">'x_7'</td><td style="text-align:right; padding:1px 8px;">'y_7'</td><td style="text-align:right; padding:1px 8px;">'z_7'</td><td style="text-align:right; padding:1px 8px;">'F_7*x_7/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_7*y_7/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_7*z_7/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 8
            '<tr><td style="padding:1px 8px;">8</td><td style="text-align:right; padding:1px 8px;">'F_8'</td><td style="text-align:right; padding:1px 8px;">'x_8'</td><td style="text-align:right; padding:1px 8px;">'y_8'</td><td style="text-align:right; padding:1px 8px;">'z_8'</td><td style="text-align:right; padding:1px 8px;">'F_8*x_8/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_8*y_8/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_8*z_8/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 9
            '<tr><td style="padding:1px 8px;">9</td><td style="text-align:right; padding:1px 8px;">'F_9'</td><td style="text-align:right; padding:1px 8px;">'x_9'</td><td style="text-align:right; padding:1px 8px;">'y_9'</td><td style="text-align:right; padding:1px 8px;">'z_9'</td><td style="text-align:right; padding:1px 8px;">'F_9*x_9/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_9*y_9/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_9*z_9/(kN*m)'</td></tr>
        #end if
        #if n_L ≥ 10
            '<tr><td style="padding:1px 8px;">10</td><td style="text-align:right; padding:1px 8px;">'F_10'</td><td style="text-align:right; padding:1px 8px;">'x_10'</td><td style="text-align:right; padding:1px 8px;">'y_10'</td><td style="text-align:right; padding:1px 8px;">'z_10'</td><td style="text-align:right; padding:1px 8px;">'F_10*x_10/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_10*y_10/(kN*m)'</td><td style="text-align:right; padding:1px 8px;">'F_10*z_10/(kN*m)'</td></tr>
        #end if
        '<tr style="border-top:1px solid #374151;"><td style="padding:1px 8px;"><b>Σ</b></td><td style="text-align:right; padding:1px 8px;"><b>'R_L'</b></td><td></td><td></td><td></td><td style="text-align:right; padding:1px 8px;"><b>'S_Lx'</b></td><td style="text-align:right; padding:1px 8px;"><b>'S_Ly'</b></td><td style="text-align:right; padding:1px 8px;"><b>'S_Lz'</b></td></tr>
        '</table>
        R = R_L', resultante<span class="kolom-2"></span>'
        x_R = S_Lx/R_L to m'<span class="alleen-scherm">, ΣF·x/R</span><span class="kolom-2"></span>'
        y_R = S_Ly/R_L to m'<span class="alleen-scherm">, ΣF·y/R</span><span class="kolom-2"></span>'
        z_R = S_Lz/R_L to m'<span class="alleen-scherm">, ΣF·z/R</span><span class="kolom-2"></span>'

        # 2. Excentriciteit t.o.v. het referentiepunt

        x_ref = ?*(m)', referentiepunt<span class="kolom-3"></span>'
        y_ref = ?*(m)'<span class="kolom-3"></span>'
        z_ref = ?*(m)'<span class="kolom-3"></span>'
        e_x = x_R - x_ref'<span class="kolom-2"></span>'
        e_y = y_R - y_ref'<span class="kolom-2"></span>'
        e_z = z_R - z_ref'<span class="kolom-2"></span>'
        M_ex = R_L*e_x to kN*m'<span class="alleen-scherm">, moment door e<sub>x</sub></span><span class="kolom-2"></span>'
        M_ey = R_L*e_y to kN*m'<span class="alleen-scherm">, moment door e<sub>y</sub></span><span class="kolom-2"></span>'
        '<b>Resultante R = 'R_L' kN in (x; y; z) = ('x_R'; 'y_R'; 'z_R') m, excentriciteit ('e_x'; 'e_y'; 'e_z') m t.o.v. het referentiepunt.</b>
    #end if
#end if

#if deel ≡ 3
    #hide
    G_vl = γ_c*l_bak*b_bak*t_vl to kN
    G_dk = γ_c*l_bak*b_bak*t_dak to kN
    G_w1 = γ_c*l_bak*t_w1*h_wand to kN
    G_w2 = γ_c*l_bak*t_w2*h_wand to kN
    G_w3 = γ_c*l_kop*t_w3*h_wand to kN
    G_w4 = γ_c*l_kop*t_w4*h_wand to kN
    z_wand = t_vl + h_wand/2
    y_w1 = -b_bak/2 + t_w1/2
    y_w2 = b_bak/2 - t_w2/2
    x_w3 = -l_bak/2 + t_w3/2
    x_w4 = l_bak/2 - t_w4/2
    y_kop = (t_w1 - t_w2)/2
    G_tot = G_vl + G_dk + G_w1 + G_w2 + G_w3 + G_w4 + R_L
    ok_g = if(ok_geo ≡ 1 and G_tot > 0 kN; 1; 0)
    #show
    #if ok_g ≡ 1
        '<table style="border-collapse:collapse; font-size:0.9em;">
        '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Onderdeel</th><th style="text-align:right; padding:2px 8px;">G [kN]</th><th style="text-align:right; padding:2px 8px;">x [m]</th><th style="text-align:right; padding:2px 8px;">y [m]</th><th style="text-align:right; padding:2px 8px;">z [m]</th></tr>
        '<tr><td style="padding:1px 8px;">Vloer</td><td style="text-align:right; padding:1px 8px;">'G_vl'</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">'t_vl/2'</td></tr>
        #if t_dak > 0 m
            '<tr><td style="padding:1px 8px;">Dek</td><td style="text-align:right; padding:1px 8px;">'G_dk'</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">'h_bak - t_dak/2'</td></tr>
        #end if
        '<tr><td style="padding:1px 8px;">Wand 1</td><td style="text-align:right; padding:1px 8px;">'G_w1'</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">'y_w1'</td><td style="text-align:right; padding:1px 8px;">'z_wand'</td></tr>
        '<tr><td style="padding:1px 8px;">Wand 2</td><td style="text-align:right; padding:1px 8px;">'G_w2'</td><td style="text-align:right; padding:1px 8px;">0</td><td style="text-align:right; padding:1px 8px;">'y_w2'</td><td style="text-align:right; padding:1px 8px;">'z_wand'</td></tr>
        '<tr><td style="padding:1px 8px;">Wand 3</td><td style="text-align:right; padding:1px 8px;">'G_w3'</td><td style="text-align:right; padding:1px 8px;">'x_w3'</td><td style="text-align:right; padding:1px 8px;">'y_kop'</td><td style="text-align:right; padding:1px 8px;">'z_wand'</td></tr>
        '<tr><td style="padding:1px 8px;">Wand 4</td><td style="text-align:right; padding:1px 8px;">'G_w4'</td><td style="text-align:right; padding:1px 8px;">'x_w4'</td><td style="text-align:right; padding:1px 8px;">'y_kop'</td><td style="text-align:right; padding:1px 8px;">'z_wand'</td></tr>
        #if n_L ≥ 1
            '<tr><td style="padding:1px 8px;">Last 1</td><td style="text-align:right; padding:1px 8px;">'F_1'</td><td style="text-align:right; padding:1px 8px;">'x_1'</td><td style="text-align:right; padding:1px 8px;">'y_1'</td><td style="text-align:right; padding:1px 8px;">'z_1'</td></tr>
        #end if
        #if n_L ≥ 2
            '<tr><td style="padding:1px 8px;">Last 2</td><td style="text-align:right; padding:1px 8px;">'F_2'</td><td style="text-align:right; padding:1px 8px;">'x_2'</td><td style="text-align:right; padding:1px 8px;">'y_2'</td><td style="text-align:right; padding:1px 8px;">'z_2'</td></tr>
        #end if
        #if n_L ≥ 3
            '<tr><td style="padding:1px 8px;">Last 3</td><td style="text-align:right; padding:1px 8px;">'F_3'</td><td style="text-align:right; padding:1px 8px;">'x_3'</td><td style="text-align:right; padding:1px 8px;">'y_3'</td><td style="text-align:right; padding:1px 8px;">'z_3'</td></tr>
        #end if
        #if n_L ≥ 4
            '<tr><td style="padding:1px 8px;">Last 4</td><td style="text-align:right; padding:1px 8px;">'F_4'</td><td style="text-align:right; padding:1px 8px;">'x_4'</td><td style="text-align:right; padding:1px 8px;">'y_4'</td><td style="text-align:right; padding:1px 8px;">'z_4'</td></tr>
        #end if
        #if n_L ≥ 5
            '<tr><td style="padding:1px 8px;">Last 5</td><td style="text-align:right; padding:1px 8px;">'F_5'</td><td style="text-align:right; padding:1px 8px;">'x_5'</td><td style="text-align:right; padding:1px 8px;">'y_5'</td><td style="text-align:right; padding:1px 8px;">'z_5'</td></tr>
        #end if
        #if n_L ≥ 6
            '<tr><td style="padding:1px 8px;">Last 6</td><td style="text-align:right; padding:1px 8px;">'F_6'</td><td style="text-align:right; padding:1px 8px;">'x_6'</td><td style="text-align:right; padding:1px 8px;">'y_6'</td><td style="text-align:right; padding:1px 8px;">'z_6'</td></tr>
        #end if
        #if n_L ≥ 7
            '<tr><td style="padding:1px 8px;">Last 7</td><td style="text-align:right; padding:1px 8px;">'F_7'</td><td style="text-align:right; padding:1px 8px;">'x_7'</td><td style="text-align:right; padding:1px 8px;">'y_7'</td><td style="text-align:right; padding:1px 8px;">'z_7'</td></tr>
        #end if
        #if n_L ≥ 8
            '<tr><td style="padding:1px 8px;">Last 8</td><td style="text-align:right; padding:1px 8px;">'F_8'</td><td style="text-align:right; padding:1px 8px;">'x_8'</td><td style="text-align:right; padding:1px 8px;">'y_8'</td><td style="text-align:right; padding:1px 8px;">'z_8'</td></tr>
        #end if
        #if n_L ≥ 9
            '<tr><td style="padding:1px 8px;">Last 9</td><td style="text-align:right; padding:1px 8px;">'F_9'</td><td style="text-align:right; padding:1px 8px;">'x_9'</td><td style="text-align:right; padding:1px 8px;">'y_9'</td><td style="text-align:right; padding:1px 8px;">'z_9'</td></tr>
        #end if
        #if n_L ≥ 10
            '<tr><td style="padding:1px 8px;">Last 10</td><td style="text-align:right; padding:1px 8px;">'F_10'</td><td style="text-align:right; padding:1px 8px;">'x_10'</td><td style="text-align:right; padding:1px 8px;">'y_10'</td><td style="text-align:right; padding:1px 8px;">'z_10'</td></tr>
        #end if
        #hide
        S_x = G_w3*x_w3 + G_w4*x_w4 + S_Lx to kN*m
        S_y = G_w1*y_w1 + G_w2*y_w2 + (G_w3 + G_w4)*y_kop + S_Ly to kN*m
        S_z = G_vl*t_vl/2 + G_dk*(h_bak - t_dak/2) + (G_w1 + G_w2 + G_w3 + G_w4)*z_wand + S_Lz to kN*m
        #show
        '<tr style="border-top:1px solid #374151;"><td style="padding:1px 8px;"><b>Totaal</b></td><td style="text-align:right; padding:1px 8px;"><b>'G_tot'</b></td><td style="text-align:right; padding:1px 8px;"><b>'S_x/G_tot'</b></td><td style="text-align:right; padding:1px 8px;"><b>'S_y/G_tot'</b></td><td style="text-align:right; padding:1px 8px;"><b>'S_z/G_tot'</b></td></tr>
        '</table>
        G_tot', met opbouw en inrichting<span class="kolom-2"></span>'
        G_bak = G_tot - R_L'<span class="alleen-scherm">, eigen gewicht van de bak</span><span class="kolom-2"></span>'
        x_G = S_x/G_tot to m'<span class="alleen-scherm">, ΣG·x/ΣG</span><span class="kolom-2"></span>'
        y_G = S_y/G_tot to m'<span class="alleen-scherm">, ΣG·y/ΣG</span><span class="kolom-2"></span>'
        z_G = S_z/G_tot to m'<span class="alleen-scherm">, ΣG·z/ΣG</span><span class="kolom-2"></span>'
    #end if

    # 3. Veranderlijke belasting, wind en eisen

    '<i>Q<sub>v</sub>: veranderlijke vloerbelasting met ψ, centrisch, op hoogte z<sub>Q</sub>. F<sub>w</sub>: windkracht dwars met arm a<sub>w</sub> tot het afmeerpunt of de halve diepgang. P<sub>e</sub>: excentrische last (personen aan één zijde) op e<sub>P</sub> uit het midden en hoogte z<sub>P</sub>. De eisen φ<sub>max</sub> (in graden), f<sub>min</sub> en GM<sub>min</sub> volgen uit wat voor het drijvende bouwwerk geldt. Karakteristieke waarden (γ = 1,0): scheefstand en vrijboord zijn gebruikseisen.</i>
    Q_v = ?*(kN)'<span class="alleen-scherm">, veranderlijke vloerbelasting, met ψ verrekend, centrisch</span><span class="kolom-4"></span>'
    z_Q = ?*(m)'<span class="alleen-scherm">, hoogte van Q<sub>v</sub> boven de onderkant</span><span class="kolom-4"></span>'
    F_w = ?*(kN)'<span class="alleen-scherm">, windkracht dwars op de bak</span><span class="kolom-4"></span>'
    a_w = ?*(m)'<span class="alleen-scherm">, arm van de windkracht</span><span class="kolom-4"></span>'
    P_e = ?*(kN)'<span class="alleen-scherm">, excentrische last, bijvoorbeeld personen aan één zijde</span><span class="kolom-4"></span>'
    e_P = ?*(m)'<span class="alleen-scherm">, afstand dwars tot het midden</span><span class="kolom-4"></span>'
    z_P = ?*(m)'<span class="alleen-scherm">, hoogte boven de onderkant</span><span class="kolom-4"></span>'
    φ_max = ?'<span class="alleen-scherm">, toelaatbare scheefstand in graden</span><span class="kolom-4"></span>'
    f_min = ?*(m)'<span class="alleen-scherm">, minimaal vrijboord</span><span class="kolom-4"></span>'
    GM_min = ?*(m)'<span class="alleen-scherm">, minimale metacentrische hoogte</span><span class="kolom-4"></span>'

    #hide
    ok_inv = if(ok_g ≡ 1 and φ_max > 0 and Q_v ≥ 0 kN and P_e ≥ 0 kN and F_w ≥ 0 kN and f_min ≥ 0 m and GM_min ≥ 0 m; 1; 0)
    #show
    #if ok_inv ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig of past niet: lengte, breedte, vloer en beton- en watergewicht positief, de wanden passen in de bak (h > vloer + dek, b > wand 1 + wand 2, l > wand 3 + wand 4), een positief totaalgewicht, φ<sub>max</sub> groter dan 0 en lasten en eisen niet negatief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de bak is niet getoetst: invoer onvolledig</b></span>
    #else
        # 4. Drijven in rust

        A_w = l_bak*b_bak', waterlijnvlak<span class="kolom-2"></span>'
        d_0 = G_tot/(γ_w*A_w) to m'<span class="alleen-scherm">, diepgang (Archimedes)</span><span class="kolom-2"></span>'
        KB_0 = d_0/2'<span class="alleen-scherm">, drukkingspunt B</span><span class="kolom-2"></span>'
        BM_0 = b_bak^2/(12*d_0) to m'<span class="alleen-scherm">, I/V met I = l·b³/12 en V = l·b·d</span><span class="kolom-2"></span>'
        KM_0 = KB_0 + BM_0', metacentrum M'
        GM_0 = KM_0 - z_G'<span class="alleen-scherm">, metacentrische hoogte, KG = z<sub>G</sub></span><span class="kolom-2"></span>'
        C_0 = G_tot*GM_0 to kN*m'<span class="alleen-scherm">, stijfheid tegen scheefstand, M/φ per radiaal</span><span class="kolom-2"></span>'
        GML_0 = KB_0 + l_bak^2/(12*d_0) - z_G to m', in de lengterichting'

        # 5. Veranderlijke belasting

        '<i>Dezelfde formules met de waterverplaatsing Δ en het zwaartepunt KG van de toestand. Wind: Δ = G + Q<sub>v</sub>, M = G·|y<sub>G</sub>| + F<sub>w</sub>·a<sub>w</sub>. Excentrische last: Δ = G + Q<sub>v</sub> + P<sub>e</sub>, M = G·|y<sub>G</sub>| + P<sub>e</sub>·|e<sub>P</sub>|. In rust: M = G·|y<sub>G</sub>|. Scheefstand φ = M/(Δ·GM), trim θ = G·|x<sub>G</sub>|/(Δ·GM<sub>L</sub>), vrijboord aan de lage hoek f = h − d − φ·b/2 − θ·l/2.</i>
        Δ_w = G_tot + Q_v'<span class="alleen-scherm"></span>'
        KG_w = (G_tot*z_G + Q_v*z_Q)/Δ_w to m'<span class="alleen-scherm"></span>'
        d_w = Δ_w/(γ_w*A_w) to m'<span class="alleen-scherm"></span>'
        GM_w = d_w/2 + b_bak^2/(12*d_w) - KG_w to m'<span class="alleen-scherm"></span>'
        GML_w = d_w/2 + l_bak^2/(12*d_w) - KG_w to m'<span class="alleen-scherm"></span>'
        M_w = G_tot*abs(y_G) + F_w*a_w to kN*m'<span class="alleen-scherm"></span>'
        Δ_p = G_tot + Q_v + P_e'<span class="alleen-scherm"></span>'
        KG_p = (G_tot*z_G + Q_v*z_Q + P_e*z_P)/Δ_p to m'<span class="alleen-scherm"></span>'
        d_p = Δ_p/(γ_w*A_w) to m'<span class="alleen-scherm"></span>'
        GM_p = d_p/2 + b_bak^2/(12*d_p) - KG_p to m'<span class="alleen-scherm"></span>'
        GML_p = d_p/2 + l_bak^2/(12*d_p) - KG_p to m'<span class="alleen-scherm"></span>'
        M_p = G_tot*abs(y_G) + P_e*abs(e_P) to kN*m'<span class="alleen-scherm"></span>'
        M_0 = G_tot*abs(y_G) to kN*m'<span class="alleen-scherm"></span>'
        #hide
        ok_stab = if(GM_0 > 0 m and GM_w > 0 m and GM_p > 0 m and GML_0 > 0 m and GML_w > 0 m and GML_p > 0 m; 1; 0)
        #show
        #if ok_stab ≡ 0
            '<b style="color:#b91c1c">De bak is instabiel: in minstens één toestand is GM ≤ 0 (G ligt boven het metacentrum). Scheefstand en vrijboord zijn niet bepaald.</b>
            '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de bak voldoet niet: instabiel (GM ≤ 0)</b></span>
        #else
            φ_0 = M_0/(G_tot*GM_0)*180/pi', scheefstand in rust, in graden<span class="alleen-scherm"></span>'
            φ_w = M_w/(Δ_w*GM_w)*180/pi', met wind, in graden<span class="alleen-scherm"></span>'
            φ_p = M_p/(Δ_p*GM_p)*180/pi', met de excentrische last, in graden<span class="alleen-scherm"></span>'
            δ_0 = (M_0/(G_tot*GM_0)*b_bak + G_tot*abs(x_G)/(G_tot*GML_0)*l_bak)/2 to m', inzakken van de lage hoek<span class="alleen-scherm"></span>'
            δ_w = (M_w/(Δ_w*GM_w)*b_bak + G_tot*abs(x_G)/(Δ_w*GML_w)*l_bak)/2 to m'<span class="alleen-scherm"></span>'
            δ_p = (M_p/(Δ_p*GM_p)*b_bak + G_tot*abs(x_G)/(Δ_p*GML_p)*l_bak)/2 to m'<span class="alleen-scherm"></span>'
            f_0 = h_bak - d_0 - δ_0', vrijboord aan de lage hoek<span class="alleen-scherm"></span>'
            f_w = h_bak - d_w - δ_w'<span class="alleen-scherm"></span>'
            f_p = h_bak - d_p - δ_p'<span class="alleen-scherm"></span>'
            '<table style="border-collapse:collapse; font-size:0.9em;">
            '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Toestand</th><th style="text-align:right; padding:2px 8px;">Δ [kN]</th><th style="text-align:right; padding:2px 8px;">d [m]</th><th style="text-align:right; padding:2px 8px;">KG [m]</th><th style="text-align:right; padding:2px 8px;">GM [m]</th><th style="text-align:right; padding:2px 8px;">M [kNm]</th><th style="text-align:right; padding:2px 8px;">φ [°]</th><th style="text-align:right; padding:2px 8px;">f [m]</th></tr>
            '<tr><td style="padding:1px 8px;">In rust</td><td style="text-align:right; padding:1px 8px;">'G_tot'</td><td style="text-align:right; padding:1px 8px;">'d_0'</td><td style="text-align:right; padding:1px 8px;">'z_G'</td><td style="text-align:right; padding:1px 8px;">'GM_0'</td><td style="text-align:right; padding:1px 8px;">'M_0'</td><td style="text-align:right; padding:1px 8px;">'φ_0'</td><td style="text-align:right; padding:1px 8px;">'f_0'</td></tr>
            '<tr><td style="padding:1px 8px;">Q<sub>v</sub> en wind</td><td style="text-align:right; padding:1px 8px;">'Δ_w'</td><td style="text-align:right; padding:1px 8px;">'d_w'</td><td style="text-align:right; padding:1px 8px;">'KG_w'</td><td style="text-align:right; padding:1px 8px;">'GM_w'</td><td style="text-align:right; padding:1px 8px;">'M_w'</td><td style="text-align:right; padding:1px 8px;">'φ_w'</td><td style="text-align:right; padding:1px 8px;">'f_w'</td></tr>
            '<tr><td style="padding:1px 8px;">Q<sub>v</sub> en P<sub>e</sub></td><td style="text-align:right; padding:1px 8px;">'Δ_p'</td><td style="text-align:right; padding:1px 8px;">'d_p'</td><td style="text-align:right; padding:1px 8px;">'KG_p'</td><td style="text-align:right; padding:1px 8px;">'GM_p'</td><td style="text-align:right; padding:1px 8px;">'M_p'</td><td style="text-align:right; padding:1px 8px;">'φ_p'</td><td style="text-align:right; padding:1px 8px;">'f_p'</td></tr>
            '</table>
            #hide
            ok_klein = if(δ_0 ≤ d_0 and δ_w ≤ d_w and δ_p ≤ d_p; 1; 0)
            #show
            #if ok_klein ≡ 0
                '<b style="color:#b45309">De hoge hoek van de kim komt boven water (φ·b/2 + θ·l/2 > d): de kleine-hoekbenadering geldt daar niet meer.</b>
            #end if
            #if max(d_0; d_w; d_p) ≥ h_bak
                '<b style="color:#b91c1c">De diepgang is groter dan de hoogte van de bak: de bak zinkt.</b>
            #end if

            # 6. Toetsing

            UC_GM = GM_min/min(GM_0; GM_w; GM_p)', metacentrische hoogte, GM ≥ GM<sub>min</sub>'
            UC_φ = max(φ_0; φ_w; φ_p)/φ_max', scheefstand, φ ≤ φ<sub>max</sub>'
            f_kl = min(f_0; f_w; f_p)', kleinste vrijboord'
            UC_f = (h_bak - f_kl + f_min)/h_bak', vrijboord, f ≥ f<sub>min</sub><span class="alleen-scherm">: benodigde hoogte d + δ + f<sub>min</sub> gedeeld door h</span>'
            #hide
            UC_max = max(UC_GM; UC_φ; UC_f)
            maatg = if(UC_max ≡ UC_f; "vrijboord"; if(UC_max ≡ UC_φ; "scheefstand"; "metacentrische hoogte"))
            #show
            UC_max'<span class="alleen-scherm"></span>'
            #if ok_klein ≡ 0 and UC_max ≤ 1.0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ('maatg') ≤ 1,0, maar de kim komt boven water → <b>de bak is niet volledig getoetst</b></span>
            #else if UC_max ≤ 1.0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0 → <b>de bak voldoet</b></span>
            #else
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg') > 1,0 → <b>de bak voldoet niet</b></span>
            #end if
        #end if
    #end if
#end if
`;
