/**
 * Poer — op twee, drie of vier palen, of op staal. Eén blad, een keuze bovenin
 * (poertype) bepaalt welk deel rekent. De eerste keuze is de tweepaals poer:
 * een blad van vóór die keuze rekent na "Bladen bijwerken" precies als
 * voorheen.
 *
 * ── Tweepaals poer (poertype 2), NEN-EN 1992-1-1 met NB ──────────────────────
 *
 * Staafwerkmodel (§6.5, §9.8.1(2)): twee drukdiagonalen van de kolom naar de
 * palen en een trekband onderin, met opgebogen einden boven de palen.
 *
 *   • Paalreacties uit de kolomlast, het kolommoment in de richting van de
 *     paalrij, het eigen gewicht van de poer (γ_G van 6.10a, veilige kant) en
 *     de afwijking van de paalpositie in het werk (9.8.1(1)); getoetst aan het
 *     draagvermogen per paal uit NEN 9997-1 (7.1), als dat is ingevuld.
 *   • De kolomknoop ligt op 2D/(3π) van het hart bij een ronde kolom en op
 *     d_kolom/4 bij een rechthoekige; met de zwaarst belaste paal voor beide helften
 *     ligt dat aan de veilige kant, ook bij een moment.
 *   • Onder de kolom een plastisch drukblok met de resultante op
 *     e_k = M_Ed/F_Ed: bij een rechthoekige kolom de lengte c_k = a_k − 2·e_k,
 *     bij een ronde het cirkelsegment met zijn zwaartepunt op e_k (c_k is dan
 *     de oppervlakte gedeeld door de knoopbreedte b_k: het vierkant a_k met
 *     dezelfde oppervlakte, of de kolombreedte op e_k als die kleiner is; het
 *     scheidingsvlak tussen de knoophelften ligt niet voorbij het zwaartepunt,
 *     dus nooit smaller dan b_k).
 *     Valt de resultante buiten de halve kolommaat, dan krijgt de
 *     kolomwapening trek en is de knoop niet getoetst.
 *   • De knoop onder de kolom is hydrostatisch (6.5.4(8)): het verticale vlak
 *     tussen de twee knoophelften draagt F_td onder dezelfde spanning als het
 *     drukblok, dus u = F_td·c_k/F_Ed.
 *     Met z = d − u/2 en F_td = R_Ed·a/z volgt z = ½(d + √(d² − 2·R_Ed·a·c_k/F_Ed)).
 *     Zonder moment en met R_Ed = F_Ed/2 is dat ½(d + √(d² − a_k·a)). Past de
 *     knoop niet (d² ≤ 2·R_Ed·a·c_k/F_Ed), dan voldoet de poer niet.
 *   • Trekband F_td = R_Ed·a/z met de zwaarst belaste paal voor beide helften.
 *   • Knopen: onder de kolom (6.60) met k_1 = 1,0, op het drukblok (en daarmee
 *     op alle vlakken van de hydrostatische knoop). Boven de paal (6.61)
 *     met k_2 = 0,85; daar zowel de oplegspanning als de diagonaal aan de
 *     knoop (figuur 6.27, u = 2·y_s). De verhoging van 6.5.4(5) is niet benut.
 *   • Dwarstrek in de drukdiagonaal (6.5.3(3)) in het vlak van het staafwerk:
 *     (6.59) met h = L_d/2 en a de smalste kant van de diagonaal (aan de
 *     kolomknoop of aan de paalknoop). (6.59) geeft ook bij een gedeeltelijke
 *     discontinuïteit (6.58) de grootste waarde. Opgenomen door de beugels
 *     over de horizontale lengte a van de diagonaal, met hun component
 *     loodrecht op de diagonaal (cos θ).
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
 *     onder de frequente combinatie (tabel 7.1N van de NB). Bij een moment met
 *     de hefboomsarm van het drukblok over de hele kolom: het kortere plastische
 *     blok geldt alleen in de UGT, in de BGT horen de drukstaven bij de
 *     elasticiteitstheorie (5.6.4(2)). k_x = 1. w_max is
 *     0,3 mm bij X0 tot en met XC4 (bij X0/XC1 staat de NB 0,4 toe) en 0,2 mm
 *     bij XD en XS. Een betonoppervlak dat niet te inspecteren is krijgt
 *     w_max = 0,2 mm: een eigen, strengere aanname.
 *   • Detaillering: φ_min (9.8.1(3)), vrije ruimte (8.2(2), d_g = 32 mm
 *     aangenomen), A_s,min (NB bij 9.2.1.1(1): de kleinste van A_s,min1 voor
 *     M_E,min = W·f_ctm bij zuivere buiging en A_s,min2 = 1,25·A_s,nodig), de
 *     trekband binnen de drukspreiding boven de paal en de beugelafstanden
 *     (9.2.2(6) en (8), NB).
 *
 * Niet getoetst: de dwarsrichting (koppelbalken of ingeklemde palen), een
 * trekpaal of trek in de kolomvoet (dan zegt de slotregel "niet volledig
 * getoetst"), de dwarstrek uit het vlak van het staafwerk (de spreiding van
 * de diagonaal over de poerbreedte), de verankering van de paalwapening,
 * huidwapening (7.3.3(3)) en bovenwapening.
 *
 * ── Drie- en vierpaals poer (poertype 3 en 4) ─────────────────────────────────
 *
 * Ruimtelijk staafwerk met de kolom in het zwaartepunt van de palen: drie
 * palen in een gelijkzijdige driehoek (x langs de zijde met twee palen, y naar
 * de derde), of vier in een rechthoek. De poer bij drie palen is een driehoek
 * met afgeschuinde hoeken, elke rand op de oversteek van de paalharten.
 *
 *   • Paalreacties van een stijve poer: R_i = N/n + M_x·x_i/Σx² + M_y·y_i/Σy²,
 *     de zwaarste paal bij elk teken van de momenten. De paalafwijking
 *     e_paal verschuift de paalgroep in de ongunstigste richting: bij vier
 *     palen N·e/2·√(1/l_x² + 1/l_y²), bij drie 2·N·e/(√3·l). R_Ed,min is
 *     een ondergrens; is die negatief, dan zegt de slotregel "niet volledig
 *     getoetst".
 *   • Kolomknoop in het zwaartepunt van het deel van de kolom dat op één
 *     diagonaal afdraagt: een kwart kolom bij vier palen (2D/(3π) of b/4 in x
 *     en y), een sector van 120° bij drie (√3·D/(2π), bij een rechthoekige
 *     kolom van de ingeschreven cirkel: veilige kant).
 *   • Drukblok: rechthoekig (c_x − 2e_x)·(c_y − 2e_y), of rond het
 *     cirkelsegment met zijn zwaartepunt op e = √(e_x² + e_y²) zoals bij twee
 *     palen, met als knooplengte in beide richtingen de langste zijde van het
 *     blok (de richting van e ligt niet vast ten opzichte van de palen).
 *   • Hydrostatische knoop onder de kolom: een verticaal vlak door de knoop
 *     draagt de horizontale componenten van de diagonalen aan één kant onder de
 *     spanning van het drukblok: bij vier palen 2·R·a_x/z en 2·R·a_y/z, bij
 *     drie R·a/z loodrecht op y en √3/2·R·a/z loodrecht op x. Het zwaarste vlak
 *     geeft de knoophoogte u en z = ½(d + √(d² − 2q)), q = u·z.
 *   • Trekbanden: bij vier palen langs de randen (F_td,x = R·a_x/z en
 *     F_td,y = R·a_y/z) of over de diagonalen (R·a/z); bij drie langs de
 *     zijden (R·a/(√3·z): twee banden onder 30° met de diagonaal). Twee lagen
 *     kruisen boven de paal: y_s = c + φ, het hart ertussen. Elke band ligt
 *     binnen de drukspreiding boven de paal (9.8.1(3), (5)) en binnen de poer.
 *   • Knopen (6.60) en verankering, ombuiging en opgebogen einde zoals bij
 *     twee palen, met de kleinste paalmaat (of het vierkant met dezelfde
 *     oppervlakte) en de oversteek min de paalafwijking; langs een diagonaal
 *     of een schuine zijde ligt de rand verder weg (veilige kant). Boven de
 *     paal zijn bij drie palen en bij banden langs de randen trekbanden in
 *     twee richtingen verankerd: (6.62) met k_3 = 0,75. Bij banden over de
 *     diagonalen (6.61) met k_2 = 0,85, maar alleen als de gebruiker
 *     haarspelden loodrecht op het vlak bevestigt (voorwaarde van de NB);
 *     anders 0,75.
 *   • Dwarskracht over de volle breedte tussen kolom en paalrij (6.2.2(6))
 *     zonder dwarskrachtwapening, met ρ_l van de trekbanden uitgesmeerd over
 *     de poer, en de bovengrens (6.5). Bij drie palen de doorsnede langs de
 *     zijde met twee palen (breedte l + 2·oversteek) en die voor de derde paal.
 *   • Pons (6.4.4(2)) rond de kolom en rond de paal, op de controle-omtrek zo
 *     ver van de kolom als kan zonder een paal te omsluiten, ten hoogste 2d:
 *     zolang de dwarskracht gelijk blijft neemt de weerstand u·2d/a af met a.
 *     V_Ed rond de kolom is de som van de paalreacties (het eigen gewicht
 *     binnen de omtrek niet afgetrokken), het moment met (6.51); rond de paal
 *     de zwaarste paalreactie met de omtrek bij de hoek van de poer
 *     afgesneden (figuur 6.15), de paal e_paal naar de rand verschoven, en
 *     dan β = 1,5 voor een hoek (figuur 6.21N, NB). Langs de kolom en de paal
 *     (6.53); ligt de paalrand dichter dan d bij de randen (6.4.2(5)), dan
 *     als hoekkolom u_0 = 3d ≤ c_1 + c_2 (6.4.5(3)) met β = 1,5.
 *   • Scheurwijdte zoals bij twee palen, met de trekband over de breedte van
 *     zijn band; A_s,min (NB bij 9.2.1.1(1)) per richting over de breedte van
 *     de poer.
 *
 * Niet getoetst: de dwarstrek in de drukdiagonalen (6.5.3(3): het blad kent
 * geen wapening die haar opneemt, en trek in het beton telt in een staafwerk
 * niet mee; de slotregel zegt het erbij), een trekpaal,
 * bovenwapening, de verankering van de paalwapening en huidwapening.
 *
 * ── Poer op staal (poertype 1) ────────────────────────────────────────────────
 *
 * Een rechthoekige poer met de kolom in het midden.
 *
 *   • Op druk: draagvermogen volgens NEN 9997-1 6.5.2.2 met de formules van
 *     het normblad strookfundering (en1997.ts): tabel A.4a (γ_φ = 1,15,
 *     γ_c = 1,6, γ_γ = 1,1), σ'_v;z;d en γ' bij de hoogste grondwaterstand,
 *     de hellingsfactoren van D.4 zonder A'·c'·cot φ', en daarbij de
 *     vormfactoren van D.4 voor een rechthoek. Eigen gewicht en grond op de
 *     poer met γ_G (6.10a) op de last; de excentriciteit, de helling en het
 *     glijden met 0,9 daarop (veilige kant). Bij e > B/6 de speciale
 *     maatregelen van 6.5.4(1)P, de plaatsingsafwijking van 0,1 m (6.5.4(2),
 *     een keuze zoals in het normblad) en de kier (6.5.4(a)): het kleinste van
 *     glijvlak g1 en g2 (σ'_v;z;d = 0, alleen V_d). Glijden (6.3a) met
 *     δ_d = φ'_cv;d bij een horizontale kracht.
 *   • Grondspanning lineair, per richting over de volle breedte; bij e > B/6
 *     een driehoek over 3·(B/2 − e). Een kier in beide richtingen is benaderd:
 *     dan "niet volledig getoetst".
 *   • Beton: buiging op 0,15·b binnen de kolomrand (9.8.2.2(3)) met de
 *     netto grondspanning, rechthoekig drukblok; verankering van rechte
 *     staven op x = h/2 (9.8.2.2(5), (9.13) met z_i = 0,9d); dwarskracht op d
 *     van de kolomrand (6.2); pons op de ongunstigste omtrek binnen 2d
 *     (6.48)–(6.51), gezocht op dUC/da = 0, en langs de kolom (6.53);
 *     detaillering (φ_min, s ≤ 2h en ≤ 250 mm, vrije ruimte, A_s,min).
 *   • Op trek: evenwicht (2.8) met tabel A.15 (UPL) of NB.3 – A1.2(A) (EQU),
 *     het gewicht van de poer en de grond recht erboven; buiging bovenin
 *     (9.8.2.1(3)), dwarskracht en pons omhoog met de bovenwapening.
 *
 * Niet getoetst bij staal: zakking, algehele stabiliteit, scheurwijdte, trek
 * in het bovenvlak bij druk, en bij trek de verankering van de kolomwapening.
 *
 * Geen referentieberekening beschikbaar; scripts/check-poer.mjs rekent de
 * uitkomsten onafhankelijk na en legt handberekeningen vast.
 *
 * Variabelenamen komen exact overeen met TweepaalsPoerDesigner.tsx. De titel
 * houdt "Tweepaals poer": daarop kiest designerKeuze.tsx het beeld.
 */

export const tweepaalsPoer = `"Tweepaals poer, drie- of vierpaals poer, poer op staal — EN 1992-1-1 §6.4, §6.5, §9.8 en NEN 9997-1

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select poertype "Soort poer"
  Tweepaals poer = 2
  Driepaals poer, palen in een gelijkzijdige driehoek = 3
  Vierpaals poer, palen in een rechthoek = 4
  Poer op staal = 1
@end

#if poertype ≡ 2
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

    @select betonoppervlak "Milieuklasse en betonoppervlak (tabel 7.1N)"
      X0 tot en met XC4, te inspecteren = 1
      X0 tot en met XC4, niet te inspecteren = 2
      XD of XS = 3
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
    ok_inv = if(h_poer > c_dek + d_beugel + d_langs/2 and l_hoh > 2*x_k0 and e_paal ≥ 0 mm and oversteek > c_dek + e_paal and b_poer > 0 mm and d_kolom > 0 mm and b_paal > 0 mm and n_langs ≥ 1 and d_langs > 0 mm and s_beugel > 0 mm and F_Ed > 0 kN and F_fr ≥ 0 kN; 1; 0)
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
            A_k = pi/4*d_kolom^2 to mm^2'<span class="kolom-3"></span>'
        #else
            a_k = d_kolom', langs de paalrij<span class="kolom-3"></span>'
            x_k = d_kolom/4', zwaartepunt van de halve kolom<span class="kolom-3"></span>'
            A_k = d_kolom*b_kolom to mm^2'<span class="kolom-3"></span>'
        #end if
        a = l_hoh/2 - x_k', van de kolomknoop tot het paalhart<span class="kolom-3"></span>'
        e_k = abs(M_Ed)/F_Ed to mm', excentriciteit van de kolomlast<span class="kolom-3"></span>'
        #hide
        ok_kolom = if(2*e_k < d_kolom; 1; 0)
        A_blok = A_k
        #show
        #if ok_kolom ≡ 1 and e_k > 0 mm
            #if kolomvorm ≡ 1
                #hide
                ε_ = 2*e_k/d_kolom
                α_ = $Find{2/3*sin(t)^3/(t - sin(t)*cos(t)) - ε_ @ t = 0.001 : 3.2}
                #show
                A_blok = d_kolom^2/4*(α_ - sin(α_)*cos(α_)) to mm^2', plastisch drukblok: het cirkelsegment met zijn zwaartepunt op e<sub>k</sub><span class="kolom-2"></span>'
                b_k = min(a_k; 2*sqrt(d_kolom^2/4 - e_k^2))', breedte van de knoop: a<sub>k</sub>, of de kolombreedte op e<sub>k</sub> als die kleiner is<span class="kolom-2"></span>'
                c_k = A_blok/b_k', lengte van het drukblok bij de breedte b<sub>k</sub><span class="kolom-2"></span>'
            #else
                c_k = d_kolom - 2*e_k', plastisch drukblok met de resultante op e<sub>k</sub><span class="kolom-2"></span>'
                A_blok = b_kolom*c_k to mm^2'<span class="kolom-2"></span>'
            #end if
        #else if ok_kolom ≡ 1
            c_k = a_k', drukblok over de hele kolom<span class="kolom-3"></span>'
        #else
            c_k = a_k', de kolomvoet krijgt trek (hoofdstuk 6): hier als zonder moment<span class="kolom-2"></span>'
        #end if
        z = (d + sqrt(max(d^2 - 2*R_Ed*a*c_k/F_Ed; 0 mm^2)))/2', hefboomsarm met een hydrostatische knoop onder de kolom (6.5.4(8))<span class="alleen-scherm">: het verticale vlak tussen de knoophelften draagt F<sub>td</sub> onder de spanning van het drukblok, dus u = F<sub>td</sub>·c<sub>k</sub>/F<sub>Ed</sub>, z = d − u/2 en F<sub>td</sub> = R<sub>Ed</sub>·a/z</span>'
        #hide
        ok_knoop = 1
        #show
        #if d^2 ≤ 2*R_Ed*a*c_k/F_Ed
            #hide
            ok_knoop = 0
            #show
            '<b style="color:#b91c1c">De knoop onder de kolom past niet in de poer (d² ≤ 2·R<sub>Ed</sub>·a·c<sub>k</sub>/F<sub>Ed</sub>): de poer is te laag voor dit staafwerk.</b>
        #end if
        θ = atan(z/a)*180/pi', hoek van de drukdiagonaal in graden<span class="kolom-3"></span>'
        F_td = R_Ed*a/z to kN', trekband<span class="kolom-3"></span>'
        u_k = F_td*c_k/F_Ed to mm', hoogte van de knoop onder de kolom<span class="kolom-3"></span>'
        A_s,nodig = F_td/f_yd to mm^2'<span class="kolom-3"></span>'
        A_s = n_langs*pi/4*d_langs^2 to mm^2'<span class="kolom-3"></span>'
        s_h = (b_poer - 2*(c_dek + d_beugel) - d_langs)/max(n_langs - 1; 1)', h.o.h. van de staven<span class="kolom-3"></span>'
        UC_trek = A_s,nodig/A_s', trekband (6.5.3)'

        # 6. Knopen en diagonaal (§6.5.3, §6.5.4)

        σ_Rd,1 = ν_k*f_cd', k<sub>1</sub> = 1,0 (6.60)<span class="kolom-3"></span>'
        #hide
        UC_kn,1 = 0
        #show
        #if ok_kolom ≡ 0
            #hide
            ok_druk = 0
            #show
            '<b style="color:#b45309">De kolomlast valt buiten de halve kolommaat (2·e<sub>k</sub> ≥ d<sub>kolom</sub>): de kolomwapening krijgt trek en de knoop onder de kolom is niet getoetst.</b>
        #else if e_k > 0 mm
            σ_Ed,1 = F_Ed/A_blok to N/mm^2', op het drukblok, en in de hydrostatische knoop op elk vlak<span class="kolom-2"></span>'
            UC_kn,1 = σ_Ed,1/σ_Rd,1', knoop onder de kolom'
        #else
            σ_Ed,1 = F_Ed/A_k to N/mm^2', onder de kolom, en in de hydrostatische knoop op elk vlak<span class="kolom-2"></span>'
            UC_kn,1 = σ_Ed,1/σ_Rd,1', knoop onder de kolom'
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
        L_d = sqrt(z^2 + a^2)', lengte van de drukdiagonaal<span class="kolom-3"></span>'
        C_d = R_Ed*L_d/z to kN', kracht in de drukdiagonaal<span class="kolom-3"></span>'
        w_1 = R_Ed*c_k*L_d/(F_Ed*z) to mm', breedte aan de kolomknoop<span class="kolom-3"></span>'
        T_dw = max(0.25*(1 - 0.7*min(w_1; w_2)/(L_d/2)); 0)*C_d to kN', dwarstrek (6.59) met h = L<sub>d</sub>/2, in het vlak van het staafwerk; de spreiding over de poerbreedte is niet getoetst'
        n_dw = floor(a/s_beugel)', beugels over de lengte a van de diagonaal<span class="kolom-2"></span>'
        T_Rd,dw = n_dw*n_sneden*pi/4*d_beugel^2*f_yd*a/L_d to kN', alleen de beugels, hun component loodrecht op de diagonaal (cos θ)<span class="kolom-2"></span>'
        #hide
        UC_dw = 0
        ok_dw = 1
        #show
        #if T_Rd,dw > 0 kN
            UC_dw = T_dw/T_Rd,dw', dwarstrek in de drukdiagonaal (6.5.3(3))'
        #else if T_dw > 0 kN
            #hide
            ok_dw = 0
            #show
            '<b style="color:#b91c1c">Er kruisen geen beugels de drukdiagonaal: de dwarstrek (6.5.3(3)) wordt niet opgenomen.</b>
        #end if

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
        #hide
        z_fr = z
        #show
        #if ok_kolom ≡ 1 and e_k > 0 mm
            z_fr = (d + sqrt(max(d^2 - 2*R_Ed*a*a_k/F_Ed; 0 mm^2)))/2', hefboomsarm in de BGT, met het drukblok over de hele kolom (5.6.4(2))<span class="alleen-scherm">: het plastische blok van het moment geldt alleen in de UGT</span><span class="kolom-2"></span>'
        #end if
        σ_s = R_fr*a/(z_fr*A_s) to N/mm^2', uit de trekband (7.3.1(8))<span class="kolom-2"></span>'
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
            w_max = 0.3 mm', tabel 7.1N (NB), XC2–XC4, k<sub>x</sub> = 1; bij X0 en XC1 ook 0,3 (veilige kant)<span class="kolom-2"></span>'
        #else if betonoppervlak ≡ 2
            w_max = 0.2 mm', niet te inspecteren: strenger aangehouden (veilige kant)<span class="kolom-2"></span>'
        #else
            w_max = 0.2 mm', tabel 7.1N (NB), XD en XS, k<sub>x</sub> = 1<span class="kolom-2"></span>'
        #end if
        UC_w = w_k/w_max', scheurwijdte'

        # 10. Detaillering (§8.2, §9.2, §9.8.1(3))

        a_vrij = s_h - d_langs', vrije ruimte; ≥ max(φ; d<sub>g</sub> + 5; 20) met d<sub>g</sub> = 32 mm (8.2(2))<span class="kolom-2"></span>'
        M_E,min = b_poer*h_poer^2/6*f_ctm to kN*m', W·f<sub>ctm</sub> bij zuivere buiging<span class="kolom-3"></span>'
        A_s,min1 = b_poer*f_cd*(d - sqrt(d^2 - 2*M_E,min/(b_poer*f_cd)))/f_yd to mm^2', voor M<sub>E,min</sub> volgens 6.1, rechthoekig drukblok<span class="kolom-3"></span>'
        A_s,min = min(A_s,min1; 1.25*A_s,nodig)', NB bij 9.2.1.1(1), A<sub>s,min2</sub> = 1,25·A<sub>s,nodig</sub><span class="kolom-3"></span>'
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
        UC_max = max(UC_paal; UC_trek; UC_kn,1; UC_kn,2; UC_dw; UC_ank; UC_rol; UC_V; UC_Vmax; UC_w)
        maatg = if(UC_max ≡ UC_paal; "paal"; if(UC_max ≡ UC_trek; "trekband"; if(UC_max ≡ UC_kn,1; "knoop onder de kolom"; if(UC_max ≡ UC_kn,2; "knoop boven de paal"; if(UC_max ≡ UC_dw; "dwarstrek, drukdiagonaal"; if(UC_max ≡ UC_ank; "verankering"; if(UC_max ≡ UC_rol; "ombuiging"; if(UC_max ≡ UC_V; "dwarskracht"; if(UC_max ≡ UC_Vmax; "dwarskracht, bovengrens"; "scheurwijdte")))))))))
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
        #if ok_kolom ≡ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,1)'">'UC_kn,1'</td><td style="padding:3px 8px; color:'kleur(UC_kn,1)'">'oordeel(UC_kn,1)'</td></tr>
        #else
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:#9ca3af;">—</td><td style="padding:3px 8px; color:#9ca3af;">niet getoetst</td></tr>
        #end if
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop boven de paal</td><td style="padding:3px 8px;">(6.61)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,2)'">'UC_kn,2'</td><td style="padding:3px 8px; color:'kleur(UC_kn,2)'">'oordeel(UC_kn,2)'</td></tr>
        #if ok_dw ≡ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarstrek in de diagonaal</td><td style="padding:3px 8px;">§6.5.3(3)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_dw)'">'UC_dw'</td><td style="padding:3px 8px; color:'kleur(UC_dw)'">'oordeel(UC_dw)'</td></tr>
        #else
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarstrek in de diagonaal</td><td style="padding:3px 8px;">§6.5.3(3)</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#b91c1c;">geen beugels</td></tr>
        #end if
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
        #else if ok_dw ≡ 0
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg'), maar geen beugels nemen de dwarstrek in de diagonaal op (hoofdstuk 6) → <b>de poer voldoet niet</b></span>
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
#else if poertype ≥ 3
    #if poertype ≡ 3
        '<i>Kolom op drie palen in een gelijkzijdige driehoek, gerekend als ruimtelijk staafwerk: drie drukdiagonalen van de kolom naar de palen en onderin trekbanden langs de zijden, gebundeld boven de palen.</i><span class="alleen-scherm"></span>
    #else
        '<i>Kolom op vier palen in een rechthoek, gerekend als ruimtelijk staafwerk: vier drukdiagonalen van de kolom naar de palen en onderin trekbanden langs de randen of over de diagonalen, gebundeld boven de palen.</i><span class="alleen-scherm"></span>
    #end if

    #hide
    k_tab(r) = if(r ≤ 0.5; 0.45; if(r ≤ 1; 0.45 + 0.3*(r - 0.5); if(r ≤ 2; 0.6 + 0.1*(r - 1); min(0.8; 0.7 + 0.1*(r - 2)))))
    W_r(c1; c2; a) = c1^2/2 + c1*c2 + 2*c2*a + 4*a^2 + pi*a*c1
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

    #if poertype ≡ 3
        '<i>x evenwijdig aan de zijde met twee palen, y naar de derde paal; de kolom staat in het zwaartepunt van de palen.</i><span class="alleen-scherm"></span>
    #else
        '<i>x en y evenwijdig aan de randen van de poer; de kolom staat in het midden.</i><span class="alleen-scherm"></span>
    #end if
    d_kolom = ?*(mm)', kolomdiameter, of de kolommaat in x-richting<span class="kolom-2"></span>'
    #if kolomvorm ≡ 2
        b_kolom = ?*(mm)', kolommaat in y-richting<span class="kolom-2"></span>'
    #end if
    b_paal = ?*(mm)', paaldiameter, of de paalmaat in x-richting<span class="kolom-2"></span>'
    #if paalvorm ≡ 1
        l_paal = ?*(mm)', paalmaat in y-richting<span class="kolom-2"></span>'
    #end if
    h_poer = ?*(mm)', hoogte van de poer<span class="kolom-3"></span>'
    #if poertype ≡ 3
        l_hoh = ?*(mm)', hart-op-hartafstand van de palen, de zijde van de driehoek<span class="kolom-3"></span>'
    #else
        l_hoh = ?*(mm)', hart-op-hartafstand van de palen in x-richting<span class="kolom-3"></span>'
        l_hoh,y = ?*(mm)', in y-richting<span class="kolom-3"></span>'
    #end if
    oversteek = ?*(mm)', van het paalhart tot de rand van de poer<span class="kolom-2"></span>'
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

    @select betonoppervlak "Milieuklasse en betonoppervlak (tabel 7.1N)"
      X0 tot en met XC4, te inspecteren = 1
      X0 tot en met XC4, niet te inspecteren = 2
      XD of XS = 3
    @end

    #if poertype ≡ 4
        @select trekbanden "Trekbanden"
          Langs de randen, van paal tot paal = 1
          Over de diagonalen, van paal tot paal = 2
        @end
        #if trekbanden ≡ 2
            @select haarspelden "Haarspelden om de paalknoop, loodrecht op het vlak van de diagonaal (NB bij 6.5.4(4)b)"
              Nee = 0
              Ja = 1
            @end
        #end if
    #end if

    c_dek = ?*(mm)', betondekking op de trekbanden<span class="kolom-3"></span>'
    n_langs = ?', aantal staven per trekband<span class="kolom-3"></span>'
    d_langs = ?*(mm)', staafdiameter van de trekbanden<span class="kolom-3"></span>'

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
    M_Ed = ?*(kN*m)', rekenwaarde van het kolommoment in x-richting<span class="alleen-scherm">: de paalreacties lopen op in x</span><span class="kolom-2"></span>'
    M_Ed,y = ?*(kN*m)', rekenwaarde van het kolommoment in y-richting<span class="kolom-2"></span>'
    F_fr = ?*(kN)', kolomlast in de frequente combinatie, voor de scheurwijdte (NB bij 7.3.1(5))<span class="kolom-2"></span>'
    R_cd = ?*(kN)', rekenwaarde van het draagvermogen per paal (NEN 9997-1); 0 = niet toetsen<span class="kolom-2"></span>'

    #hide
    c_x = d_kolom
    c_y = d_kolom
    p_y = b_paal
    hk_x = 0 mm
    hk_y = 0 mm
    rk = d_kolom/2
    hp_x = 0 mm
    hp_y = 0 mm
    rp = b_paal/2
    #show
    #if kolomvorm ≡ 2
        #hide
        c_y = b_kolom
        hk_x = d_kolom/2
        hk_y = b_kolom/2
        rk = 0 mm
        #show
    #end if
    #if paalvorm ≡ 1
        #hide
        p_y = l_paal
        hp_x = b_paal/2
        hp_y = l_paal/2
        rp = 0 mm
        #show
    #end if
    #hide
    afst(X; Y) = sqrt(max(X - hk_x - hp_x; 0 mm)^2 + max(Y - hk_y - hp_y; 0 mm)^2) - rk - rp
    #show
    #if poertype ≡ 3
        #hide
        a_pk = min(afst(l_hoh/2; l_hoh/(2*sqrt(3))); afst(0 mm; l_hoh/sqrt(3)))
        ok_inv = 1
        #show
    #else
        #hide
        a_pk = afst(l_hoh/2; l_hoh,y/2)
        ok_inv = if(l_hoh,y > max(b_paal; p_y); 1; 0)
        #show
    #end if
    #hide
    ok_inv = if(ok_inv ≡ 1 and h_poer > c_dek + 2*d_langs and d_kolom > 0 mm and c_y > 0 mm and b_paal > 0 mm and p_y > 0 mm and a_pk > 0 mm and l_hoh > max(b_paal; p_y) and e_paal ≥ 0 mm and c_dek ≥ 0 mm and oversteek > c_dek + e_paal and oversteek ≥ max(b_paal; p_y)/2 and n_langs ≥ 1 and d_langs > 0 mm and F_Ed > 0 kN and F_fr ≥ 0 kN; 1; 0)
    #show

    #if ok_inv ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig of past niet: de poer moet hoger zijn dan de dekking plus twee lagen trekband, de palen mogen de kolom en elkaar niet raken en moeten onder de poer liggen, de oversteek is groter dan dekking plus paalafwijking, en alle maten, aantallen en lasten zijn positief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de poer is niet getoetst: invoer onvolledig</b></span>
    #else
        # 4. Paalreacties

        #hide
        γ_G = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
        #show
        #if poertype ≡ 3
            r_p = l_hoh/sqrt(3)', van het hart van de poer tot een paalhart<span class="kolom-3"></span>'
            A_poer = sqrt(3)/4*l_hoh^2 + 3*l_hoh*oversteek + 2*sqrt(3)*oversteek^2 to m^2', driehoek met afgeschuinde hoeken: elke rand op de oversteek van de paalharten<span class="kolom-2"></span>'
        #else
            L_x = l_hoh + 2*oversteek', lengte van de poer<span class="kolom-3"></span>'
            L_y = l_hoh,y + 2*oversteek', breedte van de poer<span class="kolom-3"></span>'
            A_poer = L_x*L_y to m^2'<span class="kolom-3"></span>'
        #end if
        G_k = 25 kN/m^3*A_poer*h_poer to kN', eigen gewicht<span class="kolom-3"></span>'
        γ_G', 6.10a bij de gevolgklasse, veilige kant<span class="kolom-3"></span>'
        N_Ed = F_Ed + γ_G*G_k to kN', op de palen samen<span class="kolom-3"></span>'
        #if poertype ≡ 3
            ΔR_M = 2*max(abs(M_Ed)*l_hoh/2 + abs(M_Ed,y)*r_p/2; abs(M_Ed,y)*r_p)/l_hoh^2 to kN', uit de kolommomenten<span class="alleen-scherm">: R<sub>i</sub> = N/3 + (M<sub>x</sub>·x<sub>i</sub> + M<sub>y</sub>·y<sub>i</sub>)/(l²/2), de zwaarste paal bij elk teken van de momenten</span>'
            ΔR_e = 2*N_Ed*e_paal/(sqrt(3)*l_hoh) to kN', de palen e<sub>paal</sub> verschoven in de ongunstigste richting (9.8.1(1))'
            R_Ed = N_Ed/3 + ΔR_M + ΔR_e to kN', zwaarst belaste paal'
            R_Ed,min = N_Ed/3 - ΔR_M - ΔR_e to kN', minst belaste paal, ondergrens'
        #else
            ΔR_M = abs(M_Ed)/(2*l_hoh) + abs(M_Ed,y)/(2*l_hoh,y) to kN', uit de kolommomenten'
            ΔR_e = N_Ed*e_paal/2*sqrt(1/l_hoh^2 + 1/l_hoh,y^2) to kN', de palen e<sub>paal</sub> verschoven in de ongunstigste richting (9.8.1(1))'
            R_Ed = N_Ed/4 + ΔR_M + ΔR_e to kN', zwaarst belaste paal'
            R_Ed,min = N_Ed/4 - ΔR_M - ΔR_e to kN', minst belaste paal'
        #end if
        #hide
        ok_druk = 1
        UC_paal = 0
        #show
        #if R_Ed,min < 0 kN
            #hide
            ok_druk = 0
            #show
            '<b style="color:#b45309">Een paal kan trek krijgen. Het staafwerk hieronder gaat uit van drukpalen; een trekpaal, zijn verankering in de poer en de bovenwapening zijn niet getoetst.</b>
        #end if
        #if R_cd > 0 kN
            UC_paal = R_Ed/R_cd', draagvermogen van de paal, NEN 9997-1 (7.1)'
        #else
            '<i>Het draagvermogen van de paal is niet getoetst (R<sub>cd</sub> = 0).</i>
        #end if

        # 5. Staafwerkmodel (§6.5)

        y_s = c_dek + d_langs', hart tussen de twee lagen trekbanden, boven de onderkant<span class="kolom-3"></span>'
        d = h_poer - y_s'<span class="kolom-3"></span>'
        #if kolomvorm ≡ 1
            a_k = sqrt(pi)/2*d_kolom', vierkant met dezelfde oppervlakte<span class="kolom-3"></span>'
            A_k = pi/4*d_kolom^2 to mm^2'<span class="kolom-3"></span>'
            #hide
            c_0x = a_k
            c_0y = a_k
            #show
        #else
            A_k = d_kolom*b_kolom to mm^2'<span class="kolom-3"></span>'
            #hide
            c_0x = d_kolom
            c_0y = b_kolom
            #show
        #end if
        #if poertype ≡ 3 and kolomvorm ≡ 1
            x_k = sqrt(3)*d_kolom/(2*pi)', zwaartepunt van een kolomsector van 120°, vanuit het hart<span class="kolom-2"></span>'
        #else if poertype ≡ 3
            x_k = sqrt(3)*min(d_kolom; b_kolom)/(2*pi)', sector van 120° van de ingeschreven cirkel, veilige kant<span class="kolom-2"></span>'
        #else if kolomvorm ≡ 1
            x_k = 2*d_kolom/(3*pi)', zwaartepunt van een kwart kolom, in x en in y<span class="kolom-2"></span>'
            #hide
            y_k = x_k
            #show
        #else
            x_k = d_kolom/4', zwaartepunt van een kwart kolom<span class="kolom-3"></span>'
            y_k = b_kolom/4'<span class="kolom-3"></span>'
        #end if
        e_k,x = abs(M_Ed)/F_Ed to mm', excentriciteit van de kolomlast in x<span class="kolom-3"></span>'
        e_k,y = abs(M_Ed,y)/F_Ed to mm', in y<span class="kolom-3"></span>'
        #hide
        A_blok = A_k
        c_k,x = c_0x
        c_k,y = c_0y
        #show
        #if kolomvorm ≡ 1
            e_k = sqrt(e_k,x^2 + e_k,y^2)', samen<span class="kolom-3"></span>'
            #hide
            ok_kolom = if(2*e_k < d_kolom; 1; 0)
            #show
            #if ok_kolom ≡ 1 and e_k > 0 mm
                #hide
                ε_ = 2*e_k/d_kolom
                α_ = $Find{2/3*sin(t)^3/(t - sin(t)*cos(t)) - ε_ @ t = 0.001 : 3.2}
                #show
                A_blok = d_kolom^2/4*(α_ - sin(α_)*cos(α_)) to mm^2', plastisch drukblok: het cirkelsegment met zijn zwaartepunt op e<sub>k</sub><span class="kolom-2"></span>'
                b_k = min(a_k; 2*sqrt(d_kolom^2/4 - e_k^2))', breedte van de knoop: a<sub>k</sub>, of de kolombreedte op e<sub>k</sub> als die kleiner is<span class="kolom-2"></span>'
                c_k = A_blok/b_k', lengte van het drukblok bij de breedte b<sub>k</sub><span class="kolom-2"></span>'
                c_k,x = max(b_k; c_k)', knooplengte in x en in y: de langste zijde van het blok<span class="alleen-scherm">, want de richting van e<sub>k</sub> ligt niet vast ten opzichte van de palen (veilige kant)</span><span class="kolom-2"></span>'
                #hide
                c_k,y = c_k,x
                #show
            #end if
        #else
            #hide
            ok_kolom = if(2*e_k,x < d_kolom and 2*e_k,y < b_kolom; 1; 0)
            #show
            #if ok_kolom ≡ 1 and e_k,x + e_k,y > 0 mm
                c_k,x = d_kolom - 2*e_k,x', plastisch drukblok met de resultante op (e<sub>k,x</sub>; e<sub>k,y</sub>)<span class="kolom-3"></span>'
                c_k,y = b_kolom - 2*e_k,y'<span class="kolom-3"></span>'
                A_blok = c_k,x*c_k,y to mm^2'<span class="kolom-3"></span>'
            #end if
        #end if
        #if poertype ≡ 3
            a = r_p - x_k', horizontaal, van de kolomknoop tot het paalhart<span class="kolom-3"></span>'
            #hide
            q_k = max(R_Ed*a*c_k,y; sqrt(3)/2*R_Ed*a*c_k,x)/F_Ed
            #show
        #else
            a_x = l_hoh/2 - x_k', van de kolomknoop tot het paalhart, in x<span class="kolom-3"></span>'
            a_y = l_hoh,y/2 - y_k', in y<span class="kolom-3"></span>'
            a = sqrt(a_x^2 + a_y^2)', horizontaal<span class="kolom-3"></span>'
            #hide
            q_k = 2*R_Ed*max(a_x*c_k,x; a_y*c_k,y)/F_Ed
            #show
        #end if
        z = (d + sqrt(max(d^2 - 2*q_k; 0 mm^2)))/2', hefboomsarm met een hydrostatische knoop onder de kolom (6.5.4(8))<span class="alleen-scherm">: een verticaal vlak door de knoop draagt de horizontale componenten van de diagonalen aan één kant onder de spanning van het drukblok, bij drie palen R·a/z loodrecht op y en √3/2·R·a/z loodrecht op x, bij vier palen 2·R·a<sub>x</sub>/z en 2·R·a<sub>y</sub>/z; het zwaarste vlak bepaalt de knoophoogte u en z = d − u/2</span>'
        #hide
        ok_knoop = 1
        #show
        #if d^2 ≤ 2*q_k
            #hide
            ok_knoop = 0
            #show
            '<b style="color:#b91c1c">De knoop onder de kolom past niet in de poer: de poer is te laag voor dit staafwerk.</b>
        #end if
        θ = atan(z/a)*180/pi', hoek van de drukdiagonaal met de horizontaal, in graden<span class="kolom-3"></span>'
        L_d = sqrt(z^2 + a^2)', lengte van een drukdiagonaal<span class="kolom-3"></span>'
        C_d = R_Ed*L_d/z to kN', kracht in een drukdiagonaal<span class="kolom-3"></span>'
        u_k = q_k/z to mm', hoogte van de knoop onder de kolom<span class="kolom-3"></span>'
        #if poertype ≡ 3
            F_td = R_Ed*a/(sqrt(3)*z) to kN', trekband langs een zijde: twee banden onder 30° met de diagonaal nemen R<sub>Ed</sub>·a/z op'
        #else if trekbanden ≡ 1
            F_td,x = R_Ed*a_x/z to kN', trekband langs de rand in x<span class="kolom-3"></span>'
            F_td,y = R_Ed*a_y/z to kN', in y<span class="kolom-3"></span>'
            F_td = max(F_td,x; F_td,y)', maatgevende trekband<span class="kolom-3"></span>'
        #else
            F_td = R_Ed*a/z to kN', trekband over de diagonaal'
        #end if
        A_s,nodig = F_td/f_yd to mm^2'<span class="kolom-3"></span>'
        A_s = n_langs*pi/4*d_langs^2 to mm^2', per trekband<span class="kolom-3"></span>'
        UC_trek = A_s,nodig/A_s', trekband (6.5.3)'

        # 6. Knopen (§6.5.4)

        σ_Rd,1 = ν_k*f_cd', k<sub>1</sub> = 1,0 (6.60)<span class="kolom-3"></span>'
        #hide
        UC_kn,1 = 0
        #show
        #if ok_kolom ≡ 0
            #hide
            ok_druk = 0
            #show
            '<b style="color:#b45309">De kolomlast valt buiten de halve kolommaat: de kolomwapening krijgt trek en de knoop onder de kolom is niet getoetst.</b>
        #else
            σ_Ed,1 = F_Ed/A_blok to N/mm^2', op het drukblok, en in de hydrostatische knoop op elk vlak<span class="kolom-2"></span>'
            UC_kn,1 = σ_Ed,1/σ_Rd,1', knoop onder de kolom'
        #end if
        #if paalvorm ≡ 1
            A_p = b_paal*l_paal to mm^2'<span class="kolom-3"></span>'
            a_p = min(b_paal; l_paal)', kleinste paalmaat, veilige kant<span class="kolom-3"></span>'
        #else
            A_p = pi/4*b_paal^2 to mm^2'<span class="kolom-3"></span>'
            a_p = sqrt(A_p) to mm', vierkant met dezelfde oppervlakte<span class="kolom-3"></span>'
        #end if
        σ_p = R_Ed/A_p to N/mm^2', oplegspanning op de paal<span class="kolom-2"></span>'
        w_2 = (a_p*z + 2*y_s*a)/L_d to mm', a<sub>p</sub>·sin θ + u·cos θ met u = 2·y<sub>s</sub> (figuur 6.27)<span class="kolom-2"></span>'
        σ_d = C_d/(w_2*a_p) to N/mm^2', drukdiagonaal aan de paalknoop<span class="kolom-2"></span>'
        #if poertype ≡ 3
            σ_Rd,2 = 0.75*ν_k*f_cd', k<sub>3</sub> = 0,75: twee trekbanden verankerd in de knoop (6.62, NB)<span class="kolom-2"></span>'
        #else if trekbanden ≡ 1
            σ_Rd,2 = 0.75*ν_k*f_cd', k<sub>3</sub> = 0,75: trekbanden in x en in y verankerd in de knoop (6.62, NB)<span class="kolom-2"></span>'
        #else if haarspelden ≡ 1
            σ_Rd,2 = 0.85*ν_k*f_cd', k<sub>2</sub> = 0,85: één trekband, over de diagonaal, met haarspelden loodrecht op het vlak (6.61, NB)<span class="kolom-2"></span>'
        #else
            σ_Rd,2 = 0.75*ν_k*f_cd', één trekband, maar zonder haarspelden: de NB staat k<sub>2</sub> = 0,85 van (6.61) alleen met haarspelden toe; aangehouden k = 0,75 (veilige kant)<span class="kolom-2"></span>'
        #end if
        UC_kn,2 = max(σ_p; σ_d)/σ_Rd,2', knoop boven de paal'

        # 7. Verankering en ombuiging (§8.3, §8.4, §9.8.1)

        b_band = min(a_p + 2*y_s; 2*(oversteek - c_dek))', breedte van een trekband: de drukspreiding boven de paal (9.8.1(3), (5)), binnen de poer<span class="kolom-2"></span>'
        s_h = (b_band - d_langs)/max(n_langs - 1; 1)', h.o.h. van de staven in een band<span class="kolom-2"></span>'
        #hide
        η_2 = if(d_langs ≤ 32 mm; 1; (132 - d_langs/(1 mm))/100)
        #show
        f_bd = 2.25*η_2*f_ctd', (8.2), η<sub>1</sub> = 1 onderin<span class="kolom-3"></span>'
        σ_sd = F_td/A_s to N/mm^2'<span class="kolom-3"></span>'
        l_b,rqd = d_langs/4*σ_sd/f_bd to mm', (8.3)<span class="kolom-3"></span>'
        p = R_Ed/(a_p + 2*y_s)^2 to N/mm^2', druk uit de paal, onder 45° gespreid tot de trekband (9.8.1(5))<span class="kolom-2"></span>'
        α_5 = min(1; max(0.7; 1 - 0.04*p/(N/mm^2)))', tabel 8.2<span class="kolom-2"></span>'
        c_d = min((s_h - d_langs)/2; c_dek)', figuur 8.3, gebogen staaf<span class="kolom-2"></span>'
        α_1 = if(c_d > 3*d_langs; 0.7; 1)', tabel 8.2; α<sub>2</sub> = α<sub>3</sub> = α<sub>4</sub> = 1<span class="kolom-2"></span>'
        l_b,min = max(0.3*l_b,rqd; 10*d_langs; 100 mm)', (8.6)<span class="kolom-2"></span>'
        l_bd = max(α_1*α_5*l_b,rqd; l_b,min)', (8.4)<span class="kolom-2"></span>'
        φ_m,tab = if(d_langs ≤ 16 mm; 4; 5)*d_langs', tabel 8.1Na<span class="kolom-3"></span>'
        F_bt = F_td/n_langs', volle staafkracht (veilige kant)<span class="kolom-3"></span>'
        a_b = min(s_h/2; c_dek + d_langs/2)', (8.1)<span class="kolom-3"></span>'
        φ_m,bet = F_bt*(1/a_b + 1/(2*d_langs))/min(f_cd; 55/1.5*N/mm^2) to mm', (8.1)<span class="kolom-2"></span>'
        φ_m = max(φ_m,tab; φ_m,bet)', doorndiameter<span class="kolom-2"></span>'
        o_min = oversteek - e_paal', de paal e<sub>paal</sub> naar de rand verschoven (9.8.1(1)); langs een diagonaal of een schuine zijde is de rand verder weg<span class="kolom-2"></span>'
        UC_rol = (φ_m/2 + d_langs)/(o_min - c_dek)', de ombuiging ligt voorbij het paalhart'
        r_b = φ_m/2 + d_langs/2', staafas in de ombuiging<span class="kolom-3"></span>'
        l_1 = o_min + a_p/2 - c_dek - φ_m/2 - d_langs', recht, vanaf de binnenkant van de paal (6.5.4(7))<span class="kolom-3"></span>'
        l_v = h_poer - c_dek - y_s - r_b', opgebogen, tot onder de dekking<span class="kolom-3"></span>'
        l_b,besch = l_1 + pi*r_b/2 + l_v', beschikbaar langs de staafas (8.4.3(3))<span class="kolom-2"></span>'
        l_v,nodig = max(l_bd - l_1 - pi*r_b/2; 5*d_langs)', opgebogen deel dat ten minste nodig is, ≥ 5φ (figuur 8.1)<span class="kolom-2"></span>'
        UC_ank = l_bd/l_b,besch', verankering van de trekband'

        # 8. Dwarskracht (§6.2.2(6)) en pons (§6.4)

        k = min(2; 1 + sqrt(200 mm/d))'<span class="kolom-3"></span>'
        #if poertype ≡ 3
            ρ_l = min(0.02; 3*A_s*l_hoh/(2*A_poer*d))', de trekbanden uitgesmeerd over de poer, gemiddeld over x en y<span class="kolom-2"></span>'
        #else if trekbanden ≡ 1
            ρ_l = min(0.02; A_s*(l_hoh + l_hoh,y)/(A_poer*d))', de trekbanden uitgesmeerd over de poer, gemiddeld over x en y<span class="kolom-2"></span>'
        #else
            ρ_l = min(0.02; A_s*sqrt(l_hoh^2 + l_hoh,y^2)/(A_poer*d))', de trekbanden uitgesmeerd over de poer, gemiddeld over x en y<span class="kolom-2"></span>'
        #end if
        v_Rd,c = max(0.12*k*(100*ρ_l*betonklasse)^(1/3); 0.035*k^1.5*sqrt(betonklasse))*N/mm^2', (6.2a), (6.2b) en (6.47), NB<span class="kolom-2"></span>'
        ν = 0.6*ν_k', (6.6N)<span class="kolom-3"></span>'
        '<i>Dwarskracht over de volle breedte van de poer, tussen de kolom en de palen (6.2.2(6)).</i><span class="alleen-scherm"></span>
        #if poertype ≡ 3
            V_Ed,1 = 2*R_Ed', twee palen, doorsnede evenwijdig aan hun zijde<span class="kolom-3"></span>'
            b_V,1 = l_hoh + 2*oversteek', breedte, veilige kant<span class="kolom-3"></span>'
            a_v,1 = max(r_p/2 - c_y/2 - a_p/2; 0 mm)', van de kolomrand tot de paalrand<span class="kolom-3"></span>'
            V_Ed,2 = R_Ed', de derde paal<span class="kolom-3"></span>'
            b_V,2 = 2/sqrt(3)*(2*oversteek + a_p/2)', breedte van de poer bij die paal<span class="kolom-3"></span>'
            a_v,2 = max(r_p - c_y/2 - a_p/2; 0 mm)'<span class="kolom-3"></span>'
        #else
            V_Ed,1 = 2*R_Ed', twee palen, doorsnede evenwijdig aan y<span class="kolom-3"></span>'
            b_V,1 = L_y'<span class="kolom-3"></span>'
            a_v,1 = max(l_hoh/2 - c_x/2 - a_p/2; 0 mm)', van de kolomrand tot de paalrand<span class="kolom-3"></span>'
            V_Ed,2 = 2*R_Ed', twee palen, doorsnede evenwijdig aan x<span class="kolom-3"></span>'
            b_V,2 = L_x'<span class="kolom-3"></span>'
            a_v,2 = max(l_hoh,y/2 - c_y/2 - a_p/2; 0 mm)'<span class="kolom-3"></span>'
        #end if
        β_1 = min(1; max(a_v,1; 0.5*d)/(2*d))', met a<sub>v</sub> ten minste 0,5·d<span class="kolom-3"></span>'
        β_2 = min(1; max(a_v,2; 0.5*d)/(2*d))'<span class="kolom-3"></span>'
        V_Rd,c,1 = v_Rd,c*b_V,1*d to kN'<span class="kolom-3"></span>'
        V_Rd,c,2 = v_Rd,c*b_V,2*d to kN'<span class="kolom-3"></span>'
        UC_V = max(β_1*V_Ed,1/V_Rd,c,1; β_2*V_Ed,2/V_Rd,c,2)', dwarskracht, met β (6.2.2(6))'
        UC_Vmax = max(V_Ed,1/b_V,1; V_Ed,2/b_V,2)/(0.5*d*ν*f_cd)', bovengrens (6.5), zonder β'
        '<i>Pons (6.4.4(2)): de controle-omtrek ligt zo ver van de kolom als kan zonder een paal te omsluiten, ten hoogste op 2d; zolang de dwarskracht gelijk blijft, neemt de weerstand, evenredig met u·2d/a, af met a.</i><span class="alleen-scherm"></span>
        a_pk', vrije afstand van de kolom tot de dichtstbijzijnde paal<span class="kolom-2"></span>'
        a_pons = min(2*d; a_pk)', afstand van de controle-omtrek tot de kolom en tot de paal<span class="kolom-2"></span>'
        v_Rd = v_Rd,c*2*d/a_pons to N/mm^2', (6.50)<span class="kolom-2"></span>'
        v_Rd,max = 0.4*ν*f_cd', 6.4.5(3), NB<span class="kolom-2"></span>'
        #if kolomvorm ≡ 1
            u_0 = pi*d_kolom', kolomomtrek<span class="kolom-3"></span>'
            u_pk = pi*(d_kolom + 2*a_pons)', controle-omtrek<span class="kolom-3"></span>'
            v_Ed,k = N_Ed/(u_pk*d) + 0.6*sqrt(M_Ed^2 + M_Ed,y^2)/((d_kolom + 2*a_pons)^2*d) to N/mm^2', (6.51) met k = 0,6 en W = (D + 2a)²; V = alle palen, het eigen gewicht binnen de omtrek niet afgetrokken'
            β_0 = 1 + 0.6*pi*e_k/(d_kolom + 4*d)', (6.42), voor de kolomrand<span class="kolom-2"></span>'
        #else
            u_0 = 2*(d_kolom + b_kolom)', kolomomtrek<span class="kolom-3"></span>'
            u_pk = u_0 + 2*pi*a_pons', controle-omtrek<span class="kolom-3"></span>'
            k_x = k_tab(d_kolom/b_kolom)', tabel 6.1, moment in x<span class="kolom-3"></span>'
            k_y = k_tab(b_kolom/d_kolom)', moment in y<span class="kolom-3"></span>'
            W_x = W_r(d_kolom; b_kolom; a_pons) to mm^2', (6.41) voor de omtrek op a<span class="kolom-3"></span>'
            W_y = W_r(b_kolom; d_kolom; a_pons) to mm^2'<span class="kolom-3"></span>'
            v_Ed,k = N_Ed/(u_pk*d) + k_x*abs(M_Ed)/(W_x*d) + k_y*abs(M_Ed,y)/(W_y*d) to N/mm^2', (6.51); V = alle palen, het eigen gewicht binnen de omtrek niet afgetrokken'
            β_0 = 1 + (k_x*abs(M_Ed)/W_r(d_kolom; b_kolom; 2*d) + k_y*abs(M_Ed,y)/W_r(b_kolom; d_kolom; 2*d))*(u_0 + 4*pi*d)/F_Ed', (6.39) met u<sub>1</sub> en W<sub>1</sub> op 2d, voor de kolomrand<span class="kolom-2"></span>'
        #end if
        UC_pons,k = v_Ed,k/v_Rd', pons rond de kolom'
        v_Ed,0 = β_0*F_Ed/(u_0*d) to N/mm^2', langs de kolom (6.53)<span class="kolom-2"></span>'
        #if paalvorm ≡ 1
            u_p0 = 2*(b_paal + l_paal)', paalomtrek<span class="kolom-3"></span>'
        #else
            u_p0 = pi*b_paal', paalomtrek<span class="kolom-3"></span>'
        #end if
        #hide
        α_h = if(poertype ≡ 3; pi/3; pi/2)
        u_vol = u_p0 + 2*pi*a_pons
        u_rand = 2*(oversteek - e_paal) + α_h/(2*pi)*u_vol
        #show
        u_pp = min(u_vol; u_rand)', controle-omtrek rond de paal, bij de hoek van de poer afgesneden door de randen, met de paal e<sub>paal</sub> naar de rand verschoven (figuur 6.15)'
        β_p = if(u_rand < u_vol; 1.5; 1)', hoekpaal: de omtrek is door de randen afgesneden en de paalreactie ligt buiten zijn zwaartepunt, β = 1,5 (figuur 6.21N, NB); anders 1,0<span class="kolom-2"></span>'
        v_Ed,p = β_p*R_Ed/(u_pp*d) to N/mm^2'<span class="kolom-2"></span>'
        UC_pons,p = v_Ed,p/v_Rd', pons rond de paal'
        e_r = oversteek - e_paal - max(b_paal; p_y)/2', van de paalrand tot de rand van de poer, met de paalafwijking<span class="kolom-2"></span>'
        #if e_r < d
            u_p0,r = min(3*d; u_p0/2)', dichter dan d bij twee randen (6.4.2(5)): als bij een hoekkolom u<sub>0</sub> = 3d ≤ c<sub>1</sub> + c<sub>2</sub> (6.4.5(3)); bij een ronde paal de halve omtrek<span class="kolom-2"></span>'
            β_p0 = 1.5', hoek (figuur 6.21N, NB)<span class="kolom-2"></span>'
        #else
            u_p0,r = u_p0', de hele paalomtrek<span class="kolom-2"></span>'
            β_p0 = 1', de paalreactie centrisch<span class="kolom-2"></span>'
        #end if
        v_Ed,p0 = β_p0*R_Ed/(u_p0,r*d) to N/mm^2', langs de paal (6.53)<span class="kolom-2"></span>'
        UC_pons,0 = max(v_Ed,0; v_Ed,p0)/v_Rd,max', langs de kolom en de paal (6.53)'

        # 9. Scheurwijdte (§7.3.4)

        N_fr = F_fr + G_k to kN'<span class="kolom-3"></span>'
        #if poertype ≡ 3
            R_fr = N_fr/3 + ΔR_M + 2*N_fr*e_paal/(sqrt(3)*l_hoh) to kN', frequent, met de kolommomenten van de UGT (veilige kant)<span class="kolom-2"></span>'
        #else
            R_fr = N_fr/4 + ΔR_M + N_fr*e_paal/2*sqrt(1/l_hoh^2 + 1/l_hoh,y^2) to kN', frequent, met de kolommomenten van de UGT (veilige kant)<span class="kolom-2"></span>'
        #end if
        #hide
        z_fr = z
        #show
        #if ok_kolom ≡ 1 and e_k,x + e_k,y > 0 mm
            #if poertype ≡ 3
                #hide
                q_fr = max(R_Ed*a*c_0y; sqrt(3)/2*R_Ed*a*c_0x)/F_Ed
                #show
            #else
                #hide
                q_fr = 2*R_Ed*max(a_x*c_0x; a_y*c_0y)/F_Ed
                #show
            #end if
            z_fr = (d + sqrt(max(d^2 - 2*q_fr; 0 mm^2)))/2', hefboomsarm in de BGT, met het drukblok over de hele kolom (5.6.4(2))<span class="alleen-scherm">: het plastische blok van het moment geldt alleen in de UGT</span><span class="kolom-2"></span>'
        #end if
        F_t,fr = F_td*R_fr/R_Ed*z/z_fr to kN', trekband in de frequente combinatie<span class="kolom-2"></span>'
        σ_s = F_t,fr/A_s to N/mm^2', (7.3.1(8))<span class="kolom-2"></span>'
        h_c,ef = min(2.5*y_s; h_poer/2)', (h − x)/3 niet benut<span class="kolom-3"></span>'
        ρ_p,eff = A_s/(b_band*h_c,ef)', (7.10), over de breedte van de band<span class="kolom-3"></span>'
        c_s = c_dek', dekking op de trekband<span class="kolom-3"></span>'
        #if s_h > 5*(c_s + d_langs/2)
            s_r,max = 1.3*h_poer', (7.14) met x = 0<span class="kolom-2"></span>'
        #else
            s_r,max = 3.4*c_s + 0.8*0.5*0.425*d_langs/ρ_p,eff', (7.11)<span class="kolom-2"></span>'
        #end if
        ε_sm = max((σ_s - 0.4*f_ctm/ρ_p,eff*(1 + E_s/E_cm*ρ_p,eff))/E_s; 0.6*σ_s/E_s)', ε<sub>sm</sub> − ε<sub>cm</sub> (7.9), k<sub>t</sub> = 0,4<span class="kolom-2"></span>'
        w_k = s_r,max*ε_sm to mm', (7.8)<span class="kolom-2"></span>'
        #if betonoppervlak ≡ 1
            w_max = 0.3 mm', tabel 7.1N (NB), XC2–XC4, k<sub>x</sub> = 1; bij X0 en XC1 ook 0,3 (veilige kant)<span class="kolom-2"></span>'
        #else if betonoppervlak ≡ 2
            w_max = 0.2 mm', niet te inspecteren: strenger aangehouden (veilige kant)<span class="kolom-2"></span>'
        #else
            w_max = 0.2 mm', tabel 7.1N (NB), XD en XS, k<sub>x</sub> = 1<span class="kolom-2"></span>'
        #end if
        UC_w = w_k/w_max', scheurwijdte'

        # 10. Detaillering (§8.2, §9.2.1.1, §9.8.1(3))

        a_vrij = s_h - d_langs', vrije ruimte in een band; ≥ max(φ; d<sub>g</sub> + 5; 20) met d<sub>g</sub> = 32 mm (8.2(2))<span class="kolom-2"></span>'
        a_s,min1 = f_cd*(d - sqrt(d^2 - h_poer^2*f_ctm/(3*f_cd)))/f_yd to mm^2/m', per breedte, voor M<sub>E,min</sub> = W·f<sub>ctm</sub> bij zuivere buiging (6.1, rechthoekig drukblok)<span class="kolom-2"></span>'
        #if poertype ≡ 3
            b_x = sqrt(3)/2*l_hoh + 2*oversteek', breedte van de doorsnede loodrecht op x, door het hart<span class="kolom-3"></span>'
            b_y = 2*l_hoh/3 + 4/sqrt(3)*oversteek', loodrecht op y<span class="kolom-3"></span>'
            A_s,x = A_s', één band kruist de doorsnede loodrecht op x<span class="kolom-3"></span>'
            A_s,y = 1.5*A_s', twee banden onder 30°: 2·cos²30°<span class="kolom-3"></span>'
            #hide
            A_s,x,nodig = A_s,nodig
            A_s,y,nodig = 1.5*A_s,nodig
            #show
        #else if trekbanden ≡ 1
            b_x = L_y', breedte van de doorsnede loodrecht op x<span class="kolom-3"></span>'
            b_y = L_x', loodrecht op y<span class="kolom-3"></span>'
            A_s,x = 2*A_s', twee banden in x<span class="kolom-3"></span>'
            A_s,y = 2*A_s', twee banden in y<span class="kolom-3"></span>'
            #hide
            A_s,x,nodig = 2*F_td,x/f_yd
            A_s,y,nodig = 2*F_td,y/f_yd
            #show
        #else
            b_x = L_y', breedte van de doorsnede loodrecht op x<span class="kolom-3"></span>'
            b_y = L_x', loodrecht op y<span class="kolom-3"></span>'
            #hide
            cos2 = l_hoh^2/(l_hoh^2 + l_hoh,y^2)
            #show
            A_s,x = 2*cos2*A_s', twee diagonalen, cos² van hun hoek met x<span class="kolom-3"></span>'
            A_s,y = 2*(1 - cos2)*A_s', met y<span class="kolom-3"></span>'
            #hide
            A_s,x,nodig = 2*cos2*A_s,nodig
            A_s,y,nodig = 2*(1 - cos2)*A_s,nodig
            #show
        #end if
        A_s,min,x = min(a_s,min1*b_x; 1.25*A_s,x,nodig) to mm^2', NB bij 9.2.1.1(1): de kleinste van A<sub>s,min1</sub> en 1,25·A<sub>s,nodig</sub><span class="kolom-2"></span>'
        A_s,min,y = min(a_s,min1*b_y; 1.25*A_s,y,nodig) to mm^2'<span class="kolom-2"></span>'
        #hide
        ok_det = 1
        #show
        '<i>Het opgebogen einde ten minste 'l_v,nodig' mm boven de ombuiging.</i>
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
            '<b style="color:#b91c1c">De staven van een trekband passen niet binnen de drukspreiding boven de paal met de vrije ruimte van 8.2(2) (9.8.1(3)).</b>
        #end if
        #if A_s,x < A_s,min,x or A_s,y < A_s,min,y
            #hide
            ok_det = 0
            #show
            '<b style="color:#b91c1c">De trekbanden zijn kleiner dan de minimumwapening (9.2.1.1, 9.8.1(3)).</b>
        #end if
        #if l_v < 5*d_langs
            #hide
            ok_det = 0
            #show
            '<b style="color:#b91c1c">Het opgebogen einde past niet in de hoogte van de poer: l<sub>v</sub> < 5φ (figuur 8.1).</b>
        #end if

        # 11. Samenvatting

        #hide
        UC_max = max(UC_paal; UC_trek; UC_kn,1; UC_kn,2; UC_ank; UC_rol; UC_V; UC_Vmax; UC_pons,k; UC_pons,p; UC_pons,0; UC_w)
        maatg = if(UC_max ≡ UC_paal; "paal"; if(UC_max ≡ UC_trek; "trekband"; if(UC_max ≡ UC_kn,1; "knoop onder de kolom"; if(UC_max ≡ UC_kn,2; "knoop boven de paal"; if(UC_max ≡ UC_ank; "verankering"; if(UC_max ≡ UC_rol; "ombuiging"; if(UC_max ≡ UC_V; "dwarskracht"; if(UC_max ≡ UC_Vmax; "dwarskracht, bovengrens"; if(UC_max ≡ UC_pons,k; "pons rond de kolom"; if(UC_max ≡ UC_pons,p; "pons rond de paal"; if(UC_max ≡ UC_pons,0; "pons langs kolom of paal"; "scheurwijdte")))))))))))
        #show
        '<i>Niet getoetst: de dwarstrek in de drukdiagonalen (6.5.3(3)), een trekpaal, de bovenwapening, de verankering van de paalwapening en huidwapening (7.3.3(3)).</i><span class="alleen-scherm"></span>
        '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
        '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Toets</th><th style="text-align:left; padding:3px 8px;">Norm</th><th style="text-align:right; padding:3px 8px;">UC</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
        #if R_cd > 0 kN
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Draagvermogen paal</td><td style="padding:3px 8px;">NEN 9997-1 (7.1)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_paal)'">'UC_paal'</td><td style="padding:3px 8px; color:'kleur(UC_paal)'">'oordeel(UC_paal)'</td></tr>
        #else
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Draagvermogen paal</td><td style="padding:3px 8px;">NEN 9997-1 (7.1)</td><td style="padding:3px 8px; text-align:right; color:#9ca3af;">—</td><td style="padding:3px 8px; color:#9ca3af;">niet getoetst</td></tr>
        #end if
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Trekband</td><td style="padding:3px 8px;">§6.5.3</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_trek)'">'UC_trek'</td><td style="padding:3px 8px; color:'kleur(UC_trek)'">'oordeel(UC_trek)'</td></tr>
        #if ok_kolom ≡ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,1)'">'UC_kn,1'</td><td style="padding:3px 8px; color:'kleur(UC_kn,1)'">'oordeel(UC_kn,1)'</td></tr>
        #else
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop onder de kolom</td><td style="padding:3px 8px;">(6.60)</td><td style="padding:3px 8px; text-align:right; color:#9ca3af;">—</td><td style="padding:3px 8px; color:#9ca3af;">niet getoetst</td></tr>
        #end if
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Knoop boven de paal</td><td style="padding:3px 8px;">(6.61), (6.62)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_kn,2)'">'UC_kn,2'</td><td style="padding:3px 8px; color:'kleur(UC_kn,2)'">'oordeel(UC_kn,2)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Verankering trekband</td><td style="padding:3px 8px;">§8.4, §9.8.1(5)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_ank)'">'UC_ank'</td><td style="padding:3px 8px; color:'kleur(UC_ank)'">'oordeel(UC_ank)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Ombuiging voorbij het paalhart</td><td style="padding:3px 8px;">§8.3</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_rol)'">'UC_rol'</td><td style="padding:3px 8px; color:'kleur(UC_rol)'">'oordeel(UC_rol)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarskracht</td><td style="padding:3px 8px;">§6.2.2(6)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_V)'">'UC_V'</td><td style="padding:3px 8px; color:'kleur(UC_V)'">'oordeel(UC_V)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarskracht, bovengrens</td><td style="padding:3px 8px;">(6.5)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_Vmax)'">'UC_Vmax'</td><td style="padding:3px 8px; color:'kleur(UC_Vmax)'">'oordeel(UC_Vmax)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Pons rond de kolom</td><td style="padding:3px 8px;">(6.50), (6.51)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_pons,k)'">'UC_pons,k'</td><td style="padding:3px 8px; color:'kleur(UC_pons,k)'">'oordeel(UC_pons,k)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Pons rond de paal</td><td style="padding:3px 8px;">(6.50), figuur 6.15 en 6.21N</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_pons,p)'">'UC_pons,p'</td><td style="padding:3px 8px; color:'kleur(UC_pons,p)'">'oordeel(UC_pons,p)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Pons langs kolom en paal</td><td style="padding:3px 8px;">(6.53)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_pons,0)'">'UC_pons,0'</td><td style="padding:3px 8px; color:'kleur(UC_pons,0)'">'oordeel(UC_pons,0)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Scheurwijdte</td><td style="padding:3px 8px;">§7.3.4</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_w)'">'UC_w'</td><td style="padding:3px 8px; color:'kleur(UC_w)'">'oordeel(UC_w)'</td></tr>
        #if ok_det ≡ 1
            '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2.1.1, §9.8.1(3)</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#047857;">voldoet</td></tr>
        #else
            '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2.1.1, §9.8.1(3)</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#b91c1c;">voldoet niet</td></tr>
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
            '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ('maatg') ≤ 1,0, maar een paal of de kolomvoet kan trek krijgen → <b>de poer is niet volledig getoetst</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0 → <b>de poer voldoet</b> op de getoetste punten; niet getoetst: dwarstrek in de drukdiagonalen (6.5.3(3))</span>
        #end if
    #end if
#else
    '<i>Poer op staal: een kolom op een rechthoekige poer, op druk (centrisch of excentrisch) of op trek. Draagvermogen en glijden volgens NEN 9997-1 met de formules van het normblad strookfundering, of het evenwicht tegen trek (2.8); buiging, verankering, dwarskracht en pons van de poer volgens NEN-EN 1992-1-1.</i><span class="alleen-scherm"></span>

    #hide
    k_tab(r) = if(r ≤ 0.5; 0.45; if(r ≤ 1; 0.45 + 0.3*(r - 0.5); if(r ≤ 2; 0.6 + 0.1*(r - 1); min(0.8; 0.7 + 0.1*(r - 2)))))
    W_r(c1; c2; a) = c1^2/2 + c1*c2 + 2*c2*a + 4*a^2 + pi*a*c1
    #show

    # 1. Geometrie

    @select kolomvorm "Vorm van de kolom"
      Ronde kolom = 1
      Rechthoekige kolom = 2
    @end

    @select belasting_staal "Belasting op de poer"
      Druk, centrisch of excentrisch = 1
      Trek = 2
    @end

    '<i>x en y evenwijdig aan de randen van de poer; de kolom staat in het midden.</i><span class="alleen-scherm"></span>
    d_kolom = ?*(mm)', kolomdiameter, of de kolommaat in x-richting<span class="kolom-2"></span>'
    #if kolomvorm ≡ 2
        b_kolom = ?*(mm)', kolommaat in y-richting<span class="kolom-2"></span>'
    #end if
    B_x = ?*(mm)', afmeting van de poer in x-richting<span class="kolom-3"></span>'
    B_y = ?*(mm)', in y-richting<span class="kolom-3"></span>'
    h_poer = ?*(mm)', hoogte van de poer<span class="kolom-3"></span>'
    D_aanleg = ?*(mm)', aanlegdiepte: van het maaiveld tot de onderkant van de poer<span class="kolom-2"></span>'

    # 2. Grond

    #if belasting_staal ≡ 1
        phi_k = ?', effectieve hoek van inwendige wrijving, in graden<span class="kolom-2"></span>'
        c_eff,k = ?*(kPa)', effectieve cohesie<span class="kolom-2"></span>'
    #end if
    gamma_k = ?*(kN/m^3)', volumiek gewicht boven de grondwaterstand<span class="kolom-2"></span>'
    gamma_sat = ?*(kN/m^3)', verzadigd, onder de grondwaterstand<span class="kolom-2"></span>'

    @select grondwater "Hoogste grondwaterstand (6.5.2.2(c)); ligt hij ertussen: kies de hogere"
      Dieper dan de invloedsdiepte onder de zool (droog) = 1
      Op de funderingszool = 2
      Op maaiveld = 3
    @end

    # 3. Beton en wapening

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

    c_dek = ?*(mm)', betondekking<span class="kolom-3"></span>'
    #if belasting_staal ≡ 1
        d_langs = ?*(mm)', staafdiameter onderin, in beide richtingen<span class="kolom-3"></span>'
        s_langs = ?*(mm)', h.o.h. onderin<span class="kolom-3"></span>'
    #else
        d_boven = ?*(mm)', staafdiameter bovenin, in beide richtingen<span class="kolom-3"></span>'
        s_boven = ?*(mm)', h.o.h. bovenin<span class="kolom-3"></span>'
    #end if

    #hide
    f_ck = betonklasse*N/mm^2
    f_yk = 500 N/mm^2
    f_ctm = 0.30*betonklasse^(2/3)*N/mm^2
    #show
    f_cd = f_ck/1.5', α_cc = 1,0 (NB)<span class="kolom-4"></span>'
    f_ctd = 0.7*f_ctm/1.5', α_ct = 1,0 (NB)<span class="kolom-4"></span>'
    ν_k = 1 - betonklasse/250', ν′ (6.57N)<span class="kolom-4"></span>'
    f_yd = f_yk/1.15', B500A/B/C<span class="kolom-4"></span>'

    # 4. Belasting

    #if belasting_staal ≡ 1
        F_Ed = ?*(kN)', rekenwaarde van de kolomlast, druk<span class="kolom-2"></span>'
        M_Ed = ?*(kN*m)', rekenwaarde van het kolommoment in x-richting<span class="kolom-2"></span>'
        M_Ed,y = ?*(kN*m)', in y-richting<span class="kolom-2"></span>'
        H_Ed = ?*(kN)', horizontale kracht op de kolomvoet in x-richting; 0 = geen<span class="kolom-2"></span>'
        #if H_Ed ≠ 0 kN
            phi_cv,k = ?', φ′<sub>cv;k</sub> in graden, voor het glijden (6.5.3(10))<span class="kolom-2"></span>'
        #end if
    #else
        F_Ed = ?*(kN)', rekenwaarde van de trekkracht in de kolom, omhoog<span class="kolom-2"></span>'
        @select factoren "Partiële factoren tegen trek"
          UPL volgens NEN 9997-1 tabel A.15 = 1
          EQU volgens NEN-EN 1990 tabel NB.3 – A1.2(A) = 2
        @end
    #end if

    #hide
    c_x = d_kolom
    c_y = d_kolom
    A_k = pi/4*d_kolom^2
    #show
    #if kolomvorm ≡ 2
        #hide
        c_y = b_kolom
        A_k = d_kolom*b_kolom
        #show
    #end if
    #hide
    ok_inv = if(d_kolom > 0 mm and c_y > 0 mm and B_x > c_x and B_y > c_y and D_aanleg ≥ h_poer and c_dek ≥ 0 mm and gamma_k > 0 kN/m^3 and gamma_sat > 0 kN/m^3 and F_Ed > 0 kN; 1; 0)
    #show
    #if belasting_staal ≡ 1
        #hide
        ok_inv = if(h_poer > c_dek + 2*d_langs and d_langs > 0 mm and s_langs > d_langs and phi_k > 0 and phi_k < 50 and c_eff,k ≥ 0 kPa; ok_inv; 0)
        #show
        #if H_Ed ≠ 0 kN
            #hide
            ok_inv = if(phi_cv,k > 0 and phi_cv,k < 50; ok_inv; 0)
            #show
        #end if
    #else
        #hide
        ok_inv = if(h_poer > c_dek + 2*d_boven and d_boven > 0 mm and s_boven > d_boven; ok_inv; 0)
        #show
    #end if

    #if ok_inv ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig of past niet: de poer is groter dan de kolom en hoger dan de dekking plus twee lagen wapening, de onderkant ligt ten minste een poerhoogte onder het maaiveld, 0 < φ′ < 50°, de staafafstand is groter dan de staafdiameter, en maten, gewichten en lasten zijn positief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de poer is niet getoetst: invoer onvolledig</b></span>
    #else
        #hide
        γ_G = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
        #show
        A_b = B_x*B_y to m^2', grondvlak van de poer<span class="kolom-3"></span>'
        G_poer,k = 25 kN/m^3*A_b*h_poer to kN', eigen gewicht<span class="kolom-3"></span>'
        γ_w = 10 kN/m^3', γ<sub>w;d</sub> (6.5.2.2(o))<span class="kolom-3"></span>'
        #if grondwater ≡ 3
            G_grond,k = gamma_sat*(A_b - A_k)*(D_aanleg - h_poer) to kN', grond op de poer, verzadigd<span class="kolom-2"></span>'
            U_k = γ_w*D_aanleg*A_b to kN', waterdruk op de onderkant<span class="kolom-2"></span>'
        #else
            G_grond,k = gamma_k*(A_b - A_k)*(D_aanleg - h_poer) to kN', grond op de poer<span class="kolom-2"></span>'
            #hide
            U_k = 0 kN
            #show
        #end if
        G_k = G_poer,k + G_grond,k'<span class="kolom-3"></span>'
        #hide
        ok_V = 1
        ok_druk = 1
        kier = 0
        #show
        #if belasting_staal ≡ 2
            # 5. Evenwicht tegen trek (NEN 9997-1 2.4.7.4)

            #if factoren ≡ 1
                γ_G,dst = 1.0', tabel A.15<span class="alleen-scherm">, aandrijvend</span><span class="kolom-3"></span>'
                γ_G,stb = 0.9', tabel A.15<span class="alleen-scherm">, weerstandbiedend</span><span class="kolom-3"></span>'
            #else
                γ_G,dst = 1.1', tabel NB.3<span class="alleen-scherm"> – A1.2(A), ongunstig</span><span class="kolom-3"></span>'
                γ_G,stb = 0.9', tabel NB.3<span class="alleen-scherm"> – A1.2(A), gunstig</span><span class="kolom-3"></span>'
            #end if
            V_dst,d = F_Ed + γ_G,dst*U_k to kN', de trekkracht en de waterdruk op de onderkant<span class="kolom-2"></span>'
            G_stb,d = γ_G,stb*G_k to kN', de poer en de grond recht erboven<span class="kolom-2"></span>'
            UC_upl = V_dst,d/G_stb,d', evenwicht, V<sub>dst;d</sub> ≤ G<sub>stb;d</sub> (2.8)'
            ΔG_k = max(V_dst,d - G_stb,d; 0 kN)/γ_G,stb', extra ballast nodig<span class="alleen-scherm"> om te voldoen (karakteristiek)</span>'
            '<i>Alleen de grond recht boven de poer telt mee; een grondkegel en wrijving langs de zijkant niet (veilige kant).</i><span class="alleen-scherm"></span>

            # 6. Buiging bovenin (§6.1, §9.8.2.1(3))

            '<i>De trekkracht gaat via de poer naar het gewicht van poer en grond: een gelijkmatige last F<sub>Ed</sub>/A<sub>b</sub> omlaag op de uitkraging, met trek in het bovenvlak.</i><span class="alleen-scherm"></span>
            q_t = F_Ed/A_b to kPa', netto last op de poer<span class="kolom-3"></span>'
            d_x = h_poer - c_dek - d_boven/2', staven in x bovenin<span class="kolom-3"></span>'
            d_y = h_poer - c_dek - 3*d_boven/2', staven in y daaronder<span class="kolom-3"></span>'
            a_s = pi/4*d_boven^2/s_boven to mm^2/m', per breedte, in beide richtingen<span class="kolom-3"></span>'
            A_s,x = a_s*B_y to mm^2'<span class="kolom-3"></span>'
            A_s,y = a_s*B_x to mm^2'<span class="kolom-3"></span>'
            L_M,x = B_x/2 - c_x/2', uitkraging vanaf de kolomrand<span class="kolom-3"></span>'
            L_M,y = B_y/2 - c_y/2'<span class="kolom-3"></span>'
            M_b,x = q_t*B_y*L_M,x^2/2 to kN*m', over de volle breedte<span class="kolom-3"></span>'
            M_b,y = q_t*B_x*L_M,y^2/2 to kN*m'<span class="kolom-3"></span>'
            #hide
            s_max = min(2*h_poer; 250 mm)
            #show
        #else
            # 5. Belasting op de grond (NEN 9997-1 6.5)

            γ_G', 6.10a bij de gevolgklasse<span class="kolom-3"></span>'
            V_d = F_Ed + γ_G*G_k - U_k to kN', verticale last op de grond; eigen gewicht en grond ongunstig'
            V_d,min = F_Ed + 0.9*G_k - U_k to kN', met 0,9 op eigen gewicht en grond: voor de excentriciteit, de helling en het glijden (veilige kant)'
            M_x,d = abs(M_Ed) + abs(H_Ed)*h_poer to kN*m', op de onderkant van de poer<span class="kolom-2"></span>'
            M_y,d = abs(M_Ed,y) to kN*m'<span class="kolom-2"></span>'
            #if V_d,min ≤ 0 kN
                #hide
                ok_V = 0
                #show
            #else
                e_x = M_x,d/V_d,min to mm', excentriciteit in x<span class="kolom-3"></span>'
                e_y = M_y,d/V_d,min to mm', in y<span class="kolom-3"></span>'
                #hide
                kier = if(e_x > B_x/6 or e_y > B_y/6; 1; 0)
                #show
                #if kier ≡ 1
                    '<b style="color:#b45309">e > B/6: speciale maatregelen nodig (6.5.4(1)P): een zorgvuldige controle van de rekenwaarden van de belastingen (2.4.2) en een detailberekening van de rand van de poer met de uitvoeringstoleranties. De kier onder de poer (6.5.4(a)) is hieronder in het draagvermogen en in de grondspanning verrekend.</b>
                    @select afwijking "Plaatsingsafwijking (6.5.4(2))"
                      0,1 m in rekening = 1
                      Geen: bij de uitvoering is er speciale zorg aan besteed = 0
                    @end
                    e_x,d = e_x + if(e_x > B_x/6; afwijking*100 mm; 0 mm) to mm', met de plaatsingsafwijking in de richting met e > B/6<span class="kolom-2"></span>'
                    e_y,d = e_y + if(e_y > B_y/6; afwijking*100 mm; 0 mm) to mm'<span class="kolom-2"></span>'
                #else
                    e_x,d = e_x', e ≤ B/6: geen plaatsingsafwijking (6.5.4(2))<span class="kolom-2"></span>'
                    e_y,d = e_y'<span class="kolom-2"></span>'
                #end if
                #if e_x,d ≥ B_x/2 or e_y,d ≥ B_y/2
                    #hide
                    ok_V = 0
                    #show
                #end if
            #end if
            #if ok_V ≡ 0
                '<b style="color:#b91c1c">De resultante valt buiten de poer, of de waterdruk op de onderkant is groter dan de kolomlast met het gewicht: de poer kantelt of drijft op.</b>
            #else
                # 6. Draagvermogen en glijden (6.5.2.2, 6.5.3, bijlage D)

                B_x,eff = B_x - 2*e_x,d', effectieve afmetingen (6.5.2.2(b))<span class="kolom-3"></span>'
                B_y,eff = B_y - 2*e_y,d'<span class="kolom-3"></span>'
                A_eff = B_x,eff*B_y,eff to m^2'<span class="kolom-3"></span>'
                b_eff = min(B_x,eff; B_y,eff)', b′, de korte zijde<span class="kolom-3"></span>'
                l_eff = max(B_x,eff; B_y,eff)', ℓ′, de lange zijde<span class="kolom-3"></span>'
                γ_φ = 1.15', op tan φ′ (tabel A.4a)<span class="kolom-4"></span>'
                γ_c = 1.6', op c′<span class="kolom-4"></span>'
                γ_γ = 1.1', op het volumiek gewicht<span class="kolom-4"></span>'
                γ_R,v = 1.0'<span class="kolom-4"></span>'
                phi_d = atan(tan(phi_k*pi/180)/γ_φ)*180/pi', in graden<span class="kolom-3"></span>'
                c_eff,d = c_eff,k/γ_c to kPa'<span class="kolom-3"></span>'
                N_q = exp(pi*tan(phi_d*pi/180))*tan(pi/4 + phi_d*pi/360)^2', (6.5.2.2(i))<span class="kolom-3"></span>'
                N_c = (N_q - 1)/tan(phi_d*pi/180)'<span class="kolom-3"></span>'
                N_γ = 2*(N_q - 1)*tan(phi_d*pi/180)'<span class="kolom-3"></span>'
                s_q = 1 + b_eff/l_eff*sin(phi_d*pi/180)', vormfactoren voor een rechthoek (D.4)<span class="kolom-3"></span>'
                s_γ = 1 - 0.3*b_eff/l_eff'<span class="kolom-3"></span>'
                s_c = (s_q*N_q - 1)/(N_q - 1)'<span class="kolom-3"></span>'
                #if H_Ed ≡ 0 kN
                    #hide
                    i_q = 1
                    i_γ = 1
                    i_c = 1
                    #show
                    '<i>Geen horizontale kracht: i<sub>c</sub> = i<sub>q</sub> = i<sub>γ</sub> = 1.</i>
                #else
                    m_i = if(B_x,eff ≤ B_y,eff; (2 + b_eff/l_eff)/(1 + b_eff/l_eff); (2 + l_eff/b_eff)/(1 + l_eff/b_eff))', exponent (D.4) met H in x: langs b′ of langs ℓ′<span class="kolom-2"></span>'
                    i_q = max(1 - abs(H_Ed)/V_d,min; 0)^m_i', (D.4) zonder A′·c′·cot φ′, met V<sub>d,min</sub> (veilige kant)<span class="kolom-2"></span>'
                    i_γ = max(1 - abs(H_Ed)/V_d,min; 0)^(m_i + 1)'<span class="kolom-2"></span>'
                    #if c_eff,d > 0 kPa
                        i_c = max(i_q - (1 - i_q)/(N_c*tan(phi_d*pi/180)); 0)'<span class="kolom-2"></span>'
                    #else
                        #hide
                        i_c = 1
                        #show
                    #end if
                #end if
                #if grondwater ≡ 3
                    q_eff = gamma_sat*D_aanleg/γ_γ - γ_w*D_aanleg to kPa', σ′<sub>v;z;d</sub> naast de poer (6.5.2.2(g))<span class="kolom-2"></span>'
                #else
                    q_eff = gamma_k*D_aanleg/γ_γ to kPa', σ′<sub>v;z;d</sub> naast de poer (6.5.2.2(g))<span class="kolom-2"></span>'
                #end if
                #if grondwater ≡ 1
                    γ_eff = gamma_k/γ_γ to kN/m^3', γ′ onder de zool (6.5.2.2(o))<span class="kolom-2"></span>'
                #else
                    γ_eff = gamma_sat/γ_γ - γ_w to kN/m^3', γ′ onder de zool (6.5.2.2(o))<span class="kolom-2"></span>'
                #end if
                σ_max,d = c_eff,d*N_c*s_c*i_c + q_eff*N_q*s_q*i_q + 0.5*γ_eff*b_eff*N_γ*s_γ*i_γ to kPa', glijvlak g<sub>1</sub> (6.5.2.2(i))'
                #if kier ≡ 1
                    σ_g2,d = c_eff,d*N_c*s_c + 0.5*γ_eff*b_eff*N_γ*s_γ to kPa', glijvlak g<sub>2</sub>: σ′<sub>v;z;d</sub> = 0 door de kier, alleen V<sub>d</sub> (6.5.4(a))'
                    σ_max,d = min(σ_max,d; σ_g2,d)', de kleinste'
                #end if
                R_d = max(σ_max,d; 0 kPa)*A_eff/γ_R,v to kN', draagvermogen'
                UC_draag = V_d/max(R_d; 0.001 kN)', draagvermogen, V<sub>d</sub> ≤ R<sub>d</sub> (6.1)'
                #hide
                UC_glij = 0
                #show
                #if H_Ed ≠ 0 kN
                    phi_cv,d = atan(tan(phi_cv,k*pi/180)/γ_φ)*180/pi', in graden<span class="kolom-3"></span>'
                    δ_d = phi_cv,d', in het werk gestort (6.5.3(10)); c′ verwaarloosd<span class="kolom-3"></span>'
                    R_h,d = V_d,min*tan(δ_d*pi/180) to kN', (6.3a), met 0,9 op het eigen gewicht (figuur 6.i)<span class="kolom-3"></span>'
                    UC_glij = abs(H_Ed)/R_h,d', glijden (6.2), de passieve gronddruk niet meegeteld'
                    '<i>F<sub>Ed</sub> telt voor het glijden mee zoals ingevoerd: voer daarvoor de combinatie met de kleinste verticale last in.</i><span class="alleen-scherm"></span>
                #end if

                # 7. Grondspanning onder de poer

                '<i>Lineair verdeeld met V<sub>d</sub> en de excentriciteiten e<sub>d</sub> van hierboven (veilige kant). Per richting de verdeling over de volle breedte: voor een doorsnede over de volle breedte telt alleen die. Bij e > B/6 een driehoek over 3·(B/2 − e): de kier.</i><span class="alleen-scherm"></span>
                #if e_x,d ≤ B_x/6
                    L_c,x = B_x', contactlengte in x<span class="kolom-3"></span>'
                    σ_x,max = V_d/A_b*(1 + 6*e_x,d/B_x) to kPa'<span class="kolom-3"></span>'
                    σ_x,min = V_d/A_b*(1 - 6*e_x,d/B_x) to kPa'<span class="kolom-3"></span>'
                #else
                    L_c,x = 3*(B_x/2 - e_x,d)', contactlengte in x, met een kier<span class="kolom-3"></span>'
                    σ_x,max = 2*V_d/(3*B_y*(B_x/2 - e_x,d)) to kPa'<span class="kolom-3"></span>'
                    σ_x,min = 0 kPa'<span class="kolom-3"></span>'
                #end if
                #if e_y,d ≤ B_y/6
                    L_c,y = B_y', contactlengte in y<span class="kolom-3"></span>'
                    σ_y,max = V_d/A_b*(1 + 6*e_y,d/B_y) to kPa'<span class="kolom-3"></span>'
                    σ_y,min = V_d/A_b*(1 - 6*e_y,d/B_y) to kPa'<span class="kolom-3"></span>'
                #else
                    L_c,y = 3*(B_y/2 - e_y,d)', contactlengte in y, met een kier<span class="kolom-3"></span>'
                    σ_y,max = 2*V_d/(3*B_x*(B_y/2 - e_y,d)) to kPa'<span class="kolom-3"></span>'
                    σ_y,min = 0 kPa'<span class="kolom-3"></span>'
                #end if
                #if 6*e_x,d/B_x + 6*e_y,d/B_y > 1 and e_x,d > 0 mm and e_y,d > 0 mm
                    #hide
                    ok_druk = 0
                    #show
                    '<b style="color:#b45309">De resultante ligt in twee richtingen excentrisch en buiten de kern (6·e<sub>x</sub>/B<sub>x</sub> + 6·e<sub>y</sub>/B<sub>y</sub> > 1): een hoek van de poer komt los en de grondspanning is per richting benaderd; de betontoetsen zijn niet volledig.</b>
                #end if
                g_d = (γ_G*G_k - U_k)/A_b to kPa', eigen gewicht en grond op de poer min de waterdruk: gaat van de grondspanning af<span class="kolom-2"></span>'
                #hide
                x_0 = B_x/2 - L_c,x
                y_0 = B_y/2 - L_c,y
                p_x(x) = max(σ_x,min + (σ_x,max - σ_x,min)*(x - x_0)/L_c,x; 0 kPa)
                p_y(y) = max(σ_y,min + (σ_y,max - σ_y,min)*(y - y_0)/L_c,y; 0 kPa)
                Lx(x) = min(B_x/2 - x; L_c,x)
                Ly(y) = min(B_y/2 - y; L_c,y)
                Rx(x) = B_y*Lx(x)*(σ_x,max + p_x(B_x/2 - Lx(x)))/2
                Ry(y) = B_x*Ly(y)*(σ_y,max + p_y(B_y/2 - Ly(y)))/2
                ax(x) = Lx(x)*(σ_x,max + 2*p_x(B_x/2 - Lx(x)))/(3*(σ_x,max + p_x(B_x/2 - Lx(x))))
                ay(y) = Ly(y)*(σ_y,max + 2*p_y(B_y/2 - Ly(y)))/(3*(σ_y,max + p_y(B_y/2 - Ly(y))))
                #show

                # 8. Buiging en verankering (§6.1, §9.8.2)

                d_x = h_poer - c_dek - d_langs/2', staven in x onderin<span class="kolom-3"></span>'
                d_y = h_poer - c_dek - 3*d_langs/2', staven in y daarop<span class="kolom-3"></span>'
                a_s = pi/4*d_langs^2/s_langs to mm^2/m', per breedte, in beide richtingen<span class="kolom-3"></span>'
                A_s,x = a_s*B_y to mm^2'<span class="kolom-3"></span>'
                A_s,y = a_s*B_x to mm^2'<span class="kolom-3"></span>'
                #if kolomvorm ≡ 1
                    x_M = 0.35*sqrt(pi)/2*d_kolom', doorsnede op 0,15·b binnen de kolomrand (9.8.2.2(3), figuur 9.13), b van het vierkant met dezelfde oppervlakte<span class="kolom-2"></span>'
                    #hide
                    y_M = x_M
                    #show
                #else
                    x_M = 0.35*d_kolom', doorsnede op 0,15·b binnen de kolomrand (9.8.2.2(3), figuur 9.13)<span class="kolom-3"></span>'
                    y_M = 0.35*b_kolom'<span class="kolom-3"></span>'
                #end if
                L_M,x = B_x/2 - x_M', uitkraging tot de doorsnede<span class="kolom-3"></span>'
                L_M,y = B_y/2 - y_M'<span class="kolom-3"></span>'
                M_b,x = max(Rx(x_M)*(L_M,x - ax(x_M)) - g_d*B_y*L_M,x^2/2; 0 kN*m) to kN*m', over de volle breedte, aan de zijde van σ<sub>max</sub><span class="kolom-2"></span>'
                M_b,y = max(Ry(y_M)*(L_M,y - ay(y_M)) - g_d*B_x*L_M,y^2/2; 0 kN*m) to kN*m'<span class="kolom-2"></span>'
                #hide
                s_max = min(2*h_poer; 250 mm)
                #show
            #end if
        #end if
        #if belasting_staal ≡ 2 or ok_V ≡ 1
            #hide
            ok_M = if(d_x^2 > 2*M_b,x/(B_y*f_cd) and d_y^2 > 2*M_b,y/(B_x*f_cd); 1; 0)
            #show
            A_s,x,nodig = B_y*f_cd*(d_x - sqrt(max(d_x^2 - 2*M_b,x/(B_y*f_cd); 0 mm^2)))/f_yd to mm^2', rechthoekig drukblok<span class="kolom-2"></span>'
            A_s,y,nodig = B_x*f_cd*(d_y - sqrt(max(d_y^2 - 2*M_b,y/(B_x*f_cd); 0 mm^2)))/f_yd to mm^2'<span class="kolom-2"></span>'
            UC_M = max(A_s,x,nodig/A_s,x; A_s,y,nodig/A_s,y)', buiging'
            #if ok_M ≡ 0
                '<b style="color:#b91c1c">De drukzone past niet in de poer: de poer is te laag voor dit moment.</b>
            #end if
            #hide
            UC_ank = 0
            #show
            #if belasting_staal ≡ 1
                #hide
                η_2 = if(d_langs ≤ 32 mm; 1; (132 - d_langs/(1 mm))/100)
                #show
                '<i>Verankering met rechte staven (9.8.2.2): de trekkracht op x<sub>min</sub> = h/2 van de rand (9.8.2.2(5)) is F<sub>s</sub> = R·z<sub>e</sub>/z<sub>i</sub> (9.13), met z<sub>i</sub> = 0,9d en N<sub>Ed</sub> op 0,15·b binnen de kolomrand.</i><span class="alleen-scherm"></span>
                x_a = min(h_poer/2; L_M,x)', x<sub>min</sub> in x<span class="kolom-3"></span>'
                y_a = min(h_poer/2; L_M,y)', in y<span class="kolom-3"></span>'
                R_a,x = Rx(B_x/2 - x_a) - g_d*B_y*x_a to kN', gronddruk binnen x<sub>min</sub>, min het gewicht<span class="kolom-3"></span>'
                R_a,y = Ry(B_y/2 - y_a) - g_d*B_x*y_a to kN'<span class="kolom-3"></span>'
                z_e,x = B_x/2 - (Rx(B_x/2 - x_a)*ax(B_x/2 - x_a) - g_d*B_y*x_a^2/2)/R_a,x - x_M', van R tot N<sub>Ed</sub><span class="kolom-3"></span>'
                z_e,y = B_y/2 - (Ry(B_y/2 - y_a)*ay(B_y/2 - y_a) - g_d*B_x*y_a^2/2)/R_a,y - y_M'<span class="kolom-3"></span>'
                F_s,x = max(R_a,x*z_e,x/(0.9*d_x); 0 kN) to kN', (9.13)<span class="kolom-3"></span>'
                F_s,y = max(R_a,y*z_e,y/(0.9*d_y); 0 kN) to kN'<span class="kolom-3"></span>'
                f_bd = 2.25*η_2*f_ctd', (8.2), η<sub>1</sub> = 1 onderin<span class="kolom-3"></span>'
                l_b,rqd,x = d_langs/4*F_s,x/(A_s,x*f_bd) to mm', (8.3)<span class="kolom-3"></span>'
                l_b,rqd,y = d_langs/4*F_s,y/(A_s,y*f_bd) to mm'<span class="kolom-3"></span>'
                l_bd,x = max(l_b,rqd,x; 10*d_langs; 100 mm)', (8.4) en (8.6); rechte staaf, α = 1 (veilige kant)<span class="kolom-2"></span>'
                l_bd,y = max(l_b,rqd,y; 10*d_langs; 100 mm)'<span class="kolom-2"></span>'
                #if x_a ≤ c_dek or y_a ≤ c_dek
                    '<b style="color:#b91c1c">Binnen x<sub>min</sub> van de rand blijft na de dekking geen verankeringslengte over (x<sub>min</sub> ≤ c): de staven zijn daar niet te verankeren.</b>
                #end if
                UC_ank = max(l_bd,x/max(x_a - c_dek; 1 mm); l_bd,y/max(y_a - c_dek; 1 mm))', verankering, beschikbaar x<sub>min</sub> min de dekking (figuur 9.13), ten minste 1 mm'
            #end if

            #if belasting_staal ≡ 2
                # 7. Dwarskracht en pons (§6.2, §6.4.4)
            #else
                # 9. Dwarskracht en pons (§6.2, §6.4.4)
            #end if

            x_V = c_x/2 + d_x', doorsnede op d van de kolomrand<span class="kolom-3"></span>'
            y_V = c_y/2 + d_y'<span class="kolom-3"></span>'
            #if belasting_staal ≡ 2
                V_Ed,x = q_t*B_y*max(B_x/2 - x_V; 0 mm) to kN'<span class="kolom-3"></span>'
                V_Ed,y = q_t*B_x*max(B_y/2 - y_V; 0 mm) to kN'<span class="kolom-3"></span>'
            #else
                V_Ed,x = if(x_V < B_x/2; max(Rx(x_V) - g_d*B_y*(B_x/2 - x_V); 0 kN); 0 kN) to kN', gronddruk voorbij de doorsnede, min het gewicht<span class="kolom-3"></span>'
                V_Ed,y = if(y_V < B_y/2; max(Ry(y_V) - g_d*B_x*(B_y/2 - y_V); 0 kN); 0 kN) to kN'<span class="kolom-3"></span>'
            #end if
            ρ_x = min(0.02; a_s/d_x)'<span class="kolom-3"></span>'
            ρ_y = min(0.02; a_s/d_y)'<span class="kolom-3"></span>'
            #hide
            vc(dd; rr) = max(0.12*min(2; 1 + sqrt(200 mm/dd))*(100*rr*betonklasse)^(1/3); 0.035*min(2; 1 + sqrt(200 mm/dd))^1.5*sqrt(betonklasse))*N/mm^2
            #show
            V_Rd,c,x = vc(d_x; ρ_x)*B_y*d_x to kN', (6.2a), (6.2b)<span class="kolom-3"></span>'
            V_Rd,c,y = vc(d_y; ρ_y)*B_x*d_y to kN'<span class="kolom-3"></span>'
            UC_V = max(V_Ed,x/V_Rd,c,x; V_Ed,y/V_Rd,c,y)', dwarskracht'
            d_p = (d_x + d_y)/2', (6.32)<span class="kolom-3"></span>'
            ρ_p = sqrt(ρ_x*ρ_y)', 6.4.4(1)<span class="kolom-3"></span>'
            v_Rd,c = vc(d_p; ρ_p)', (6.47)<span class="kolom-3"></span>'
            #if belasting_staal ≡ 2
                σ_n = q_t', netto last onder de kolom<span class="kolom-3"></span>'
                #hide
                M_p,x = 0 kN*m
                M_p,y = 0 kN*m
                #show
            #else
                σ_n = max(min(p_x(0 mm); p_y(0 mm)) - g_d; 0 kPa)', netto grondspanning onder de kolom<span class="kolom-3"></span>'
                #hide
                M_p,x = abs(M_Ed)
                M_p,y = abs(M_Ed,y)
                #show
            #end if
            a_max = min(2*d_p; (B_x - c_x)/2; (B_y - c_y)/2)', de verste controle-omtrek binnen 2d en binnen de poer<span class="kolom-2"></span>'
            #if kolomvorm ≡ 1
                #hide
                u_a(a) = pi*(d_kolom + 2*a)
                A_a(a) = pi*(d_kolom/2 + a)^2
                v_E(a) = max(F_Ed - σ_n*A_a(a); 0 kN)/(u_a(a)*d_p) + 0.6*sqrt(M_p,x^2 + M_p,y^2)/((d_kolom + 2*a)^2*d_p)
                #show
                u_0 = pi*d_kolom', kolomomtrek<span class="kolom-3"></span>'
                β_0 = 1 + 0.6*pi*sqrt(M_p,x^2 + M_p,y^2)/F_Ed/(d_kolom + 4*d_p)', (6.42), voor de kolomrand<span class="kolom-3"></span>'
            #else
                #hide
                k_x = k_tab(d_kolom/b_kolom)
                k_y = k_tab(b_kolom/d_kolom)
                u_a(a) = 2*(d_kolom + b_kolom) + 2*pi*a
                A_a(a) = d_kolom*b_kolom + 2*a*(d_kolom + b_kolom) + pi*a^2
                v_E(a) = max(F_Ed - σ_n*A_a(a); 0 kN)/(u_a(a)*d_p) + k_x*M_p,x/(W_r(d_kolom; b_kolom; a)*d_p) + k_y*M_p,y/(W_r(b_kolom; d_kolom; a)*d_p)
                #show
                u_0 = 2*(d_kolom + b_kolom)', kolomomtrek<span class="kolom-3"></span>'
                β_0 = 1 + (k_x*M_p,x/W_r(d_kolom; b_kolom; 2*d_p) + k_y*M_p,y/W_r(b_kolom; d_kolom; 2*d_p))*u_a(2*d_p)/F_Ed', (6.39) met u<sub>1</sub> en W<sub>1</sub> op 2d (tabel 6.1), voor de kolomrand<span class="kolom-3"></span>'
            #end if
            #hide
            UC_a(t) = v_E(t*d_p)*t/(2*v_Rd,c)
            dUC(t) = UC_a(t + 0.001) - UC_a(t - 0.001)
            t_lo = 0.05
            t_hi = max(a_max/d_p; 0.06)
            t_kr = if(dUC(t_hi - 0.001) ≥ 0; t_hi; if(dUC(t_lo + 0.001) ≤ 0; t_lo; $Find{dUC(t) @ t = t_lo + 0.001 : t_hi - 0.001}))
            #show
            a_krit = t_kr*d_p', de ongunstigste controle-omtrek binnen a<sub>max</sub> (6.4.4(2))<span class="kolom-2"></span>'
            u_krit = u_a(a_krit)'<span class="kolom-2"></span>'
            V_Ed,red = max(F_Ed - σ_n*A_a(a_krit); 0 kN) to kN', (6.48): de netto last binnen de omtrek afgetrokken<span class="kolom-2"></span>'
            v_Ed = v_E(a_krit) to N/mm^2', (6.49), met het moment volgens (6.51)<span class="kolom-2"></span>'
            v_Rd = v_Rd,c*2*d_p/a_krit to N/mm^2', (6.50)<span class="kolom-2"></span>'
            UC_pons = v_Ed/v_Rd', pons'
            v_Ed,0 = β_0*F_Ed/(u_0*d_p) to N/mm^2', langs de kolom (6.53)<span class="kolom-2"></span>'
            v_Rd,max = 0.4*0.6*ν_k*f_cd', 0,4·ν·f<sub>cd</sub> (6.4.5(3), NB), ν volgens (6.6N)<span class="kolom-2"></span>'
            UC_pons,0 = v_Ed,0/v_Rd,max', pons langs de kolom'

            #if belasting_staal ≡ 2
                # 8. Detaillering (§8.2, §9.2.1.1, §9.3.1.1, §9.8.2.1)

                #hide
                φ_s = d_boven
                s_s = s_boven
                #show
            #else
                # 10. Detaillering (§8.2, §9.2.1.1, §9.3.1.1, §9.8.2.1)

                #hide
                φ_s = d_langs
                s_s = s_langs
                #show
            #end if
            a_s,min1 = f_cd*(d_x - sqrt(d_x^2 - h_poer^2*f_ctm/(3*f_cd)))/f_yd to mm^2/m', per breedte, voor M<sub>E,min</sub> = W·f<sub>ctm</sub> bij zuivere buiging, staven in x<span class="kolom-2"></span>'
            a_s,min1,y = f_cd*(d_y - sqrt(d_y^2 - h_poer^2*f_ctm/(3*f_cd)))/f_yd to mm^2/m', staven in y, met d<sub>y</sub><span class="kolom-2"></span>'
            A_s,min,x = min(a_s,min1*B_y; 1.25*A_s,x,nodig) to mm^2', NB bij 9.2.1.1(1): de kleinste van A<sub>s,min1</sub> en 1,25·A<sub>s,nodig</sub><span class="kolom-2"></span>'
            A_s,min,y = min(a_s,min1,y*B_x; 1.25*A_s,y,nodig) to mm^2'<span class="kolom-2"></span>'
            #hide
            ok_det = 1
            #show
            '<i>Staafafstand ten hoogste 's_max' mm: 2h en ≤ 250 mm bij een geconcentreerde belasting (9.3.1.1(3), NB).</i>
            #if φ_s < 8 mm
                #hide
                ok_det = 0
                #show
                '<b style="color:#b91c1c">De staafdiameter is kleiner dan φ<sub>min</sub> = 8 mm (9.8.2.1(1), NB).</b>
            #end if
            #if s_s > s_max
                #hide
                ok_det = 0
                #show
                '<b style="color:#b91c1c">De staafafstand is groter dan 9.3.1.1(3) toelaat.</b>
            #end if
            #if s_s - φ_s < max(φ_s; 37 mm)
                #hide
                ok_det = 0
                #show
                '<b style="color:#b91c1c">De vrije ruimte tussen de staven is te klein (8.2(2), d<sub>g</sub> = 32 mm aangenomen).</b>
            #end if
            #if A_s,x < A_s,min,x or A_s,y < A_s,min,y
                #hide
                ok_det = 0
                #show
                '<b style="color:#b91c1c">De wapening is kleiner dan de minimumwapening (9.2.1.1(1), 9.3.1.1(1)).</b>
            #end if

            #if belasting_staal ≡ 2
                # 9. Samenvatting
            #else
                # 11. Samenvatting
            #end if

            #hide
            #if belasting_staal ≡ 2
                UC_max = max(UC_upl; UC_M; UC_V; UC_pons; UC_pons,0)
                maatg = if(UC_max ≡ UC_upl; "evenwicht tegen trek"; if(UC_max ≡ UC_M; "buiging"; if(UC_max ≡ UC_V; "dwarskracht"; if(UC_max ≡ UC_pons; "pons"; "pons langs de kolom"))))
            #else
                UC_max = max(UC_draag; UC_glij; UC_M; UC_ank; UC_V; UC_pons; UC_pons,0)
                maatg = if(UC_max ≡ UC_draag; "draagvermogen"; if(UC_max ≡ UC_glij; "glijden"; if(UC_max ≡ UC_M; "buiging"; if(UC_max ≡ UC_ank; "verankering"; if(UC_max ≡ UC_V; "dwarskracht"; if(UC_max ≡ UC_pons; "pons"; "pons langs de kolom"))))))
            #end if
            #show
            #if belasting_staal ≡ 2
                '<i>Niet getoetst: de verankering van de kolomwapening in de poer en van de bovenwapening, en de onderwapening.</i><span class="alleen-scherm"></span>
            #else
                '<i>Niet getoetst: de zakking (6.6), de algehele stabiliteit, de scheurwijdte en trek in het bovenvlak (9.8.2.1(3)).</i><span class="alleen-scherm"></span>
            #end if
            '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
            '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Toets</th><th style="text-align:left; padding:3px 8px;">Norm</th><th style="text-align:right; padding:3px 8px;">UC</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
            #if belasting_staal ≡ 2
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Evenwicht tegen trek</td><td style="padding:3px 8px;">NEN 9997-1 (2.8)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_upl)'">'UC_upl'</td><td style="padding:3px 8px; color:'kleur(UC_upl)'">'oordeel(UC_upl)'</td></tr>
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Buiging bovenin</td><td style="padding:3px 8px;">§6.1, §9.8.2.1(3)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_M)'">'UC_M'</td><td style="padding:3px 8px; color:'kleur(UC_M)'">'oordeel(UC_M)'</td></tr>
            #else
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Draagvermogen</td><td style="padding:3px 8px;">NEN 9997-1 6.5.2</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_draag)'">'UC_draag'</td><td style="padding:3px 8px; color:'kleur(UC_draag)'">'oordeel(UC_draag)'</td></tr>
                #if H_Ed ≠ 0 kN
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Glijden</td><td style="padding:3px 8px;">NEN 9997-1 6.5.3</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_glij)'">'UC_glij'</td><td style="padding:3px 8px; color:'kleur(UC_glij)'">'oordeel(UC_glij)'</td></tr>
                #end if
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Buiging</td><td style="padding:3px 8px;">§6.1, §9.8.2.2</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_M)'">'UC_M'</td><td style="padding:3px 8px; color:'kleur(UC_M)'">'oordeel(UC_M)'</td></tr>
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Verankering</td><td style="padding:3px 8px;">§8.4, §9.8.2.2</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_ank)'">'UC_ank'</td><td style="padding:3px 8px; color:'kleur(UC_ank)'">'oordeel(UC_ank)'</td></tr>
            #end if
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dwarskracht</td><td style="padding:3px 8px;">§6.2.2</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_V)'">'UC_V'</td><td style="padding:3px 8px; color:'kleur(UC_V)'">'oordeel(UC_V)'</td></tr>
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Pons</td><td style="padding:3px 8px;">(6.48)–(6.51)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_pons)'">'UC_pons'</td><td style="padding:3px 8px; color:'kleur(UC_pons)'">'oordeel(UC_pons)'</td></tr>
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Pons langs de kolom</td><td style="padding:3px 8px;">(6.53)</td><td style="padding:3px 8px; text-align:right; color:'kleur(UC_pons,0)'">'UC_pons,0'</td><td style="padding:3px 8px; color:'kleur(UC_pons,0)'">'oordeel(UC_pons,0)'</td></tr>
            #if ok_det ≡ 1
                '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2.1.1, §9.3.1.1, §9.8.2.1</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#047857;">voldoet</td></tr>
            #else
                '<tr><td style="padding:3px 8px;">Detaillering</td><td style="padding:3px 8px;">§8.2, §9.2.1.1, §9.3.1.1, §9.8.2.1</td><td style="padding:3px 8px; text-align:right;">—</td><td style="padding:3px 8px; color:#b91c1c;">voldoet niet</td></tr>
            #end if
            '</table>
            UC_max'<span class="alleen-scherm"></span>'
            #if ok_M ≡ 0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg'), maar de drukzone past niet in de poer → <b>de poer voldoet niet</b></span>
            #else if ok_det ≡ 0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg'), maar de detaillering past niet → <b>de poer voldoet niet</b></span>
            #else if UC_max > 1.0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('maatg') > 1,0 → <b>de poer voldoet niet</b></span>
            #else if belasting_staal ≡ 2
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0 → <b>de poer voldoet</b></span>
            #else if ok_druk ≡ 0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ('maatg') ≤ 1,0, maar een hoek van de poer komt los → <b>de poer is niet volledig getoetst</b></span>
            #else if kier ≡ 1
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0, met de speciale maatregelen van 6.5.4(1)P → <b>de poer voldoet</b></span>
            #else
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('maatg') ≤ 1,0 → <b>de poer voldoet</b></span>
            #end if
        #else
            '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de poer voldoet niet</b>: de resultante valt buiten de poer of de poer drijft op</span>
        #end if
    #end if
#end if
`;
