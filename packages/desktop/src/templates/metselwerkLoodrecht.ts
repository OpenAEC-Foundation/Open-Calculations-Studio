/**
 * Metselwerk loodrecht belast — vier verwante toetsen voor ongewapend
 * metselwerk op één blad. Een keuze bovenin bepaalt welk deel actief is;
 * gerekend wordt op een strook van 1 m.
 *
 * 1. Wand of strook loodrecht op het vlak belast (wind, stuwdruk),
 *    NEN-EN 1996-1-1 §5.5.5 en §6.3.1:
 *    • M_Rd = f_xd·Z (6.16), Z = b·t²/6; f_xk1 (breukvlak evenwijdig aan de
 *      lintvoegen) en f_xk2 (loodrecht daarop) uit proeven of opgave (NB bij
 *      3.6.4(3) t/m (6)), bij cellenbeton desgewenst 0,1·f_k of 0,15·f_k
 *      (NB bij 3.6.4(7), alleen bij 1 ≤ f_k ≤ 5 N/mm²).
 *    • Staande strook op twee steunen w·h²/8 (f_xd1), uitkraging w·h²/2
 *      (f_xd1), liggende strook w·l²/8 (f_xd2): algemene mechanica,
 *      scharnierend opgelegd (§5.5.5(9)).
 *    • Paneel langs 3 of 4 randen: (5.17)/(5.18) met α₁ = μ·α₂. α₂ is invoer,
 *      af te lezen in bijlage E bij μ en h/l; de tabellen van bijlage E
 *      staan niet in het blad. Bijlage E geldt tot t = 250 mm; daarboven
 *      niet getoetst.
 *    • Gunstige verticale belasting (§6.3.1(4)(i)): f_xd1,app = f_xd1 + σ_d
 *      (6.17), σ_d ≤ 0,15·N_Rd in het midden van de wand, hier per eenheid van
 *      oppervlakte 0,15·Φ_m·f_d. Φ_m volgens bijlage G met ρ₂ = 1,00 (bij
 *      een uitkraging h_ef = 2·h), zonder de excentriciteit uit de zijdelingse
 *      belasting: de kleinste van Φ_m met e_mk uit h_ef/450 en e_k, en Φ_m met
 *      de excentriciteit van ten minste 10 mm en h_ef/300 (NB bij
 *      6.1.2.2(1)(ii) en 5.5.1.1(5), zoals in metselwerkwand.ts, met e_k
 *      boven λ = 27). Bij een paneel wordt μ
 *      overeenkomstig aangepast. Alleen toegestaan als bezwijken niet leidt
 *      tot onevenredig grote schade (NB bij 6.4.3); dat staat in de keuze.
 *    • Bijlage F (normatief volgens de NB): alleen F(2), h ≤ 30·t bij een wand
 *      die boven is vastgehouden maar niet aan de einden, vanaf t = 100 mm
 *      (F(3)). De grafieken F.1 t/m F.3 staan niet in het blad: bij de
 *      andere ondersteuningen meldt het blad "niet getoetst".
 *
 * 2. Spouwmuur belast door wind, volgens de werkwijze van NPR 9096, met de opzet
 *    van een eigen rekenblad:
 *    • Type U1/U2/U3 (hechtsterkte van de mortel in binnen- en buitenblad) en
 *      randvoorwaarde R1–R4 (buitenblad, binnenblad gesteund of ongesteund bij
 *      de verdiepingsvloer) → uiterst opneembare stuwdruk q_u uit een tabel
 *      voor gebouwen lager dan 10 m; UC = q_p/q_u. In dat rekenblad heet R3
 *      ook "gesteund, gesteund" (gelijk aan R1) terwijl de waarden afwijken;
 *      het blad leest R3 als buitenblad gesteund, binnenblad ongesteund, de
 *      enige combinatie die overblijft. Een eigen q_u kan ook; vanaf 10 m
 *      gebouwhoogte met de tabel: niet getoetst.
 *    • Penant tussen twee openingen: de verhouding p_w;e;d/p_w;d wordt in twee
 *      grafieken afgelezen (b02/l = 0 en b02/l = 1, krommen voor b01/l, as
 *      b2/l) en lineair geïnterpoleerd op b02/l, zoals het rekenblad doet.
 *      De grafieken zelf staan niet in het blad; buiten hun bereik (b01/l of
 *      b02/l boven 1, b2/l boven 1,5) niet getoetst.
 *    • Spouwankers (§6.5): W_Ed = γ_Q·c_a·(c_pe,10 + c_pi)·q_p met c_a = 1,5 /
 *      3,0 / 2,0 volgens dezelfde werkwijze; n_t ≥ W_Ed/F_d (6.21) en ten
 *      minste n_t,min = 2 per m² (NB bij 8.5.2.2(2)); F_d = gedeclareerde
 *      capaciteit (NEN-EN 845-1) gedeeld door γ_M voor nevenproducten, tabel
 *      NB-1. De afdracht van een gesteund blad naar de vloer is niet getoetst.
 *
 * 3. Kelderwand met gronddruk, NEN-EN 1996-3 §4.5 (vereenvoudigde methode):
 *    N_Ed,max ≤ t·b·f_d/3 (4.11) en N_Ed,min ≥ ρ_e·b·h·h_e²/(β·t) (4.12), β = 20
 *    / 60 − 20·b_c/h / 40. Toepassingsvoorwaarden §4.5(1): h ≤ 2,6 m, t ≥ 200
 *    mm, bovenbelasting ≤ 5 kN/m², aanvulling niet hoger dan de wand — anders
 *    niet getoetst; de overige voorwaarden staan als uitgangspunt op het blad.
 *    γ_M = 1,7 / 2,2 volgens de NB bij NEN-EN 1996-3 2.3(2), zonder verlaging
 *    in CC1.
 *
 * 4. Stabiliteitswand op afschuiving, NEN-EN 1996-1-1 §6.2: V_Rd = f_vd·t·l_c
 *    (6.13, NB bij 6.2(2)), l_c uit een lineaire spanningsverdeling (6.2(3)),
 *    f_vk uit (3.5) of (3.6) met f_vlt = 0,065·f_b (NB bij 3.6.2(3) en (4)).
 *    De route van NEN-EN 1996-3 §4.4 staat niet in het blad: vergelijking
 *    (4.10a) is in de beschikbare normtekst niet leesbaar. Niet getoetst: het
 *    gedrukte deel op verticale belasting (§6.2(5)) en de aansluiting op
 *    kruisende wanden (§6.2(4)).
 *
 * Geen referentieberekening beschikbaar; scripts/check-metselwerk-loodrecht.mjs
 * rekent per geval een voorbeeld met de hand na.
 */

export const metselwerkLoodrecht = `"Metselwerk loodrecht belast — NEN-EN 1996-1-1 §6.2, §6.3 en §6.5, NEN-EN 1996-3 §4.5

'<i>Ongewapend metselwerk, vier verwante toetsen op één blad: een wand of strook loodrecht op het vlak belast, een spouwmuur onder wind met de spouwankers, een kelderwand met gronddruk en een stabiliteitswand op afschuiving. Gerekend op een strook van 1 m.</i><span class="alleen-scherm"></span>

@select geval "Geval"
  Wand of strook loodrecht op het vlak belast (wind, stuwdruk) = 1
  Spouwmuur belast door wind, met de spouwankers = 2
  Kelderwand met gronddruk (NEN-EN 1996-3 §4.5) = 3
  Stabiliteitswand op afschuiving (§6.2) = 4
@end

#hide
b_s = 1000*mm
#show

#if geval ≠ 2
    # 1. Metselwerk

    @select steensoort "Steensoort (holtepercentage → steengroep)"
      Baksteen <25% = 1
      Baksteen <55% = 2
      Kalkzandsteen <25% = 3
      Kalkzandsteen <55% = 4
      Betonsteen <25% = 5
      Betonsteen <60% = 6
      Cellenbeton <25% = 7
    @end
    @select steencategorie "Steencategorie (γ_M)"
      Categorie I = 1
      Categorie II = 2
    @end
    f_b = ?', genormaliseerde druksterkte steen f_b [N/mm²]<span class="alleen-scherm">: fb-waarde, CS-klasse (CS12 → 12) of G-klasse (G2 → 2)</span><span class="kolom-2"></span>'
    #if geval ≠ 4
        @select morteltype "Morteltype"
          Metselmortel = 1
          Lijmmortel = 2
        @end
        f_m = ?', mortelsterkte f_m [N/mm²]<span class="alleen-scherm">: M-klasse of L-klasse</span><span class="kolom-2"></span>'
        @select langsvoeg "Mortelvoeg evenwijdig aan het wandvlak (langsvoeg)"
          geen: in elke laag reikt één steen over de volle wanddikte = 1
          wel, over de hele wandlengte of een deel ervan = 2
        @end
        #hide
        'Kolommen: id, K metselmortel, K lijmmortel, α en β bij lijmmortel (tabel NB-2),
        'φ_∞ metselmortel en lijmmortel (tabel NB-3). Metselmortel: α = 0,65, β = 0,25.
        steenmat = [1; 2; 3; 4; 5; 6; 7 |0.6; 0.5; 0.6; 0.5; 0.6; 0.5; 0.6 |0.80; 0.70; 0.80; 0.65; 0.80; 0.65; 0.80 |0.75; 0.70; 0.85; 0.85; 0.85; 0.85; 0.85 |0.10; 0; 0; 0; 0; 0; 0 |0.7; 0.7; 1.1; 1.1; 1.9; 1.9; 0.6 |0.5; 0.5; 0.8; 0.8; 1.7; 1.7; 0.5]
        K = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 3); hlookup(steenmat; steensoort; 1; 2))*if(langsvoeg ≡ 2; 0.8; 1)
        α = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 4); 0.65)
        β = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 5); 0.25)
        φ_inf = if(morteltype ≡ 2; hlookup(steenmat; steensoort; 1; 7); hlookup(steenmat; steensoort; 1; 6))
        'NB bij 3.6.1.2: f_b ten hoogste 75 (metselmortel) of 50 N/mm² (lijmmortel);
        'f_m ten hoogste 20 N/mm², bij metselmortel ook ten hoogste 2·f_b.
        f_b,eff = max(min(f_b; if(morteltype ≡ 1; 75; 50)); 0)
        f_m,eff = max(min(f_m; 20; if(morteltype ≡ 1; 2*f_b,eff; 20)); 0)
        #show
        f_k = K*f_b,eff^α*f_m,eff^β*N/mm^2', (3.2), K, α en β uit tabel NB-2<span class="alleen-scherm">; met een langsvoeg K maal 0,8 (§3.6.1.2(6))</span>'
    #end if
    #hide
    γ_M = if(steencategorie ≡ 1; 1.7; 2.2) - if(geval ≠ 3 and CC ≡ 1; 0.2; 0)
    #show
    #if geval ≡ 3
        γ_M', NB bij NEN-EN 1996-3 2.3(2), ook in CC1'
    #else
        γ_M', tabel NB-1, bij de gevolgklasse uit de projectgegevens'
    #end if
#end if

#if geval ≡ 1
    # 2. Wand en belasting

    @select steun "Ondersteuning"
      staande strook: boven en onder gesteund, overspant verticaal = 1
      staande strook: uitkragend vanaf de voet, bovenrand vrij = 2
      liggende strook: tussen twee verticale steunen, overspant horizontaal = 3
      paneel gesteund langs 3 of 4 randen, α₂ uit bijlage E = 4
    @end
    t_w = ?*(mm)', wanddikte<span class="kolom-3"></span>'
    #if steun ≠ 3
        h_w = ?*(mm)', vrije hoogte<span class="kolom-3"></span>'
    #end if
    #if steun ≥ 3
        l_w = ?*(mm)', lengte tussen de verticale steunen<span class="kolom-3"></span>'
    #end if
    W_Ed = ?*(kN/m^2)', zijdelingse rekenbelasting<span class="alleen-scherm"> per m² (wind, stuwdruk)</span><span class="kolom-3"></span>'
    '<i>Bij een blad van een spouwmuur: het aandeel van dat blad in W<sub>Ed</sub>, naar verhouding van M<sub>Rd</sub> of van de stijfheid (§6.3.1(6)).</i><span class="alleen-scherm"></span>

    # 3. Buigtreksterkte

    #hide
    fx_cb = 0
    #show
    #if steensoort ≡ 7
        @select bron_fx "Buigtreksterkte cellenbeton"
          0,1·f_k bij metselmortel, 0,15·f_k bij lijmmortel (NB bij 3.6.4(7)) = 1
          uit proeven of opgave = 2
        @end
        #hide
        fx_cb = if(bron_fx ≡ 1; 1; 0)
        #show
    #end if
    #if fx_cb ≡ 1
        f_xk1 = if(morteltype ≡ 1; 0.10; 0.15)*f_k', NB bij 3.6.4(7), met een verband volgens 8.1.4<span class="kolom-2"></span>'
        f_xk2 = f_xk1'<span class="kolom-2"></span>'
    #else
        '<i>f<sub>xk1</sub> uit proeven volgens NEN-EN 1052-2 of uit de hechtsterkte volgens NEN-EN 1052-5 (NB bij 3.6.4(3) t/m (5)); f<sub>xk2</sub> = R<sub>o</sub>·f<sub>xk1</sub> bij een verband volgens 8.1.4 (NB bij 3.6.4(6)).</i><span class="alleen-scherm"></span>
        f_xk1 = ?*(N/mm^2)', breukvlak evenwijdig aan de lintvoegen<span class="kolom-2"></span>'
        f_xk2 = ?*(N/mm^2)', breukvlak loodrecht op de lintvoegen<span class="kolom-2"></span>'
    #end if
    f_xd1 = f_xk1/γ_M'<span class="kolom-2"></span>'
    f_xd2 = f_xk2/γ_M'<span class="kolom-2"></span>'

    #hide
    mv = 0
    ok_1 = if(t_w > 0 mm and W_Ed ≥ 0 kN/m^2 and f_xk1 > 0 N/mm^2 and f_xk2 > 0 N/mm^2; 1; 0)
    #show
    #if steun ≠ 3
        #hide
        ok_1 = if(ok_1 ≡ 1 and h_w > 0 mm; 1; 0)
        #show
        ## Verticale belasting — §6.3.1(4)

        @select vert "Gunstige verticale belasting"
          niet meerekenen = 1
          meerekenen (6.17); bezwijken leidt niet tot onevenredig grote schade (NB bij 6.4.3) = 2
        @end
        #hide
        mv = if(vert ≡ 2; 1; 0)
        #show
    #end if
    #if steun ≥ 3
        #hide
        ok_1 = if(ok_1 ≡ 1 and l_w > 0 mm; 1; 0)
        #show
    #end if
    #if fx_cb ≡ 1 and (f_k < 1 N/mm^2 or f_k > 5 N/mm^2)
        #hide
        ok_1 = 0
        #show
        '<b style="color:#b91c1c">De regel van NB bij 3.6.4(7) geldt alleen bij 1 ≤ f<sub>k</sub> ≤ 5 N/mm²; hier is f<sub>k</sub> = 'f_k'. Vul f<sub>xk1</sub> en f<sub>xk2</sub> uit proeven in.</b>
    #end if
    #if ok_1 ≡ 1 and mv ≡ 1
        N_v,Ed = ?*(kN)', kleinste gelijktijdige verticale rekenbelasting per m wandlengte in de maatgevende doorsnede<span class="alleen-scherm">, zonder gunstige veranderlijke belasting (bijvoorbeeld 0,9·G<sub>k</sub>)</span>'
        '<i>σ<sub>d</sub> is niet groter dan 0,15·N<sub>Rd</sub> in het midden van de wand (6.1.2.1(2)), per eenheid van oppervlakte 0,15·Φ<sub>m</sub>·f<sub>d</sub>; Φ<sub>m</sub> volgens bijlage G met ρ<sub>2</sub> = 1,00 (uitkraging: h<sub>ef</sub> = 2·h) en zonder de excentriciteit uit de zijdelingse belasting, de kleinste van die met h<sub>ef</sub>/450 en die met de excentriciteit van ten minste 10 mm en h<sub>ef</sub>/300 (NB bij 6.1.2.2(1)(ii) en 5.5.1.1(5)). Beschouw het tweede-orde-effect (5.4) en de invloed van de veranderlijke belasting op de normaalkracht (NB bij 6.4.3).</i><span class="alleen-scherm"></span>
        #hide
        h_ef = if(steun ≡ 2; 2; 1)*h_w
        λ = h_ef/t_w
        e_init = h_ef/450
        e_m2 = max(10*mm; h_ef/300)
        #show
        #if λ ≤ 27
            #hide
            e_k = 0*mm
            e_k2 = 0*mm
            #show
        #else
            #hide
            e_k = 0.002*φ_inf*λ*sqrt(t_w*e_init)
            e_k2 = 0.002*φ_inf*λ*sqrt(t_w*e_m2)
            #show
        #end if
        #hide
        e_mk = max(e_init + e_k; 0.05*t_w)
        e_mk2 = max(e_m2 + e_k2; 0.05*t_w)
        A_1 = 1 - 2*e_mk/t_w
        u_m = (λ*sqrt(1/700) - 0.063)/(0.73 - 1.17*e_mk/t_w)
        Φ_m1 = max(A_1*exp(-u_m^2/2); 0)
        A_12 = 1 - 2*e_mk2/t_w
        u_m2 = (λ*sqrt(1/700) - 0.063)/(0.73 - 1.17*e_mk2/t_w)
        Φ_m2 = max(A_12*exp(-u_m2^2/2); 0)
        Φ_m = min(Φ_m1; Φ_m2)
        f_d = f_k/γ_M
        #show
        h_ef', ρ<sub>2</sub> = 1<span class="kolom-3"></span>'
        λ', h<sub>ef</sub>/t<span class="kolom-3"></span>'
        e_k', (6.8), 0 bij λ ≤ 27<span class="kolom-3"></span>'
        e_mk', (6.6), met h<sub>ef</sub>/450<span class="kolom-3"></span>'
        e_mk2', met ten minste 10 mm en h<sub>ef</sub>/300 (NB)<span class="kolom-3"></span>'
        Φ_m', (G.1), E = 700·f<sub>k</sub>, de kleinste van beide<span class="kolom-3"></span>'
        f_d'<span class="kolom-3"></span>'
        σ_d,max = 0.15*Φ_m*f_d', 0,15·N<sub>Rd</sub> in het midden van de wand, per eenheid van oppervlakte'
        σ_d = min(max(N_v,Ed; 0 kN)/(b_s*t_w); σ_d,max) to N/mm^2', rekenwaarde van de drukspanning, begrensd'
        f_xd1,app = f_xd1 + σ_d', schijnbare buigtreksterkte (6.17)'
        #hide
        f_x1 = f_xd1,app
        #show
    #else
        #hide
        f_x1 = f_xd1
        #show
    #end if

    #if ok_1 ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig: wanddikte, hoogte of lengte en de buigtreksterkten groter dan 0, de belasting niet negatief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de wand is niet getoetst: invoer onvolledig</b></span>
    #else
        # 4. Moment en toetsing — §5.5.5 en §6.3.1

        Z = b_s*t_w^2/6 to mm^3', elastisch weerstandsmoment per m'
        #hide
        uc_open = 0
        #show
        #if steun ≡ 1
            M_Ed = W_Ed*b_s*h_w^2/8 to kN*m', strook op twee steunen, halverwege'
            M_Rd = f_x1*Z to kN*m', (6.16), breukvlak evenwijdig aan de lintvoegen'
            UC_M = M_Ed/M_Rd', M<sub>Ed</sub> ≤ M<sub>Rd</sub> (6.15)'
        #else if steun ≡ 2
            M_Ed = W_Ed*b_s*h_w^2/2 to kN*m', uitkraging, aan de voet'
            M_Rd = f_x1*Z to kN*m', (6.16), breukvlak evenwijdig aan de lintvoegen'
            UC_M = M_Ed/M_Rd', (6.15)'
        #else if steun ≡ 3
            M_Ed = W_Ed*b_s*l_w^2/8 to kN*m', strook op twee steunen, halverwege'
            M_Rd = f_xd2*Z to kN*m', (6.16), breukvlak loodrecht op de lintvoegen'
            UC_M = M_Ed/M_Rd', (6.15)'
        #else
            μ = f_x1/f_xd2', orthogonale sterkteverhouding (5.5.5(7))'
            '<i>Lees α<sub>2</sub> af in bijlage E bij μ = 'μ' en h/l = 'h_w/l_w', in de tabel voor de oplegcondities van figuur E.1; tussen de tabelwaarden lineair interpoleren.</i><span class="alleen-scherm"></span>
            α_2 = ?', momentcoëfficiënt uit bijlage E'
            #if t_w > 250 mm or α_2 ≤ 0
                #hide
                uc_open = 1
                #show
                '<b style="color:#b91c1c">Niet getoetst: bijlage E geldt voor wanden tot 250 mm dik, en α<sub>2</sub> moet groter zijn dan 0.</b>
            #else
                α_1 = μ*α_2', 5.5.5(7)'
                M_Ed1 = α_1*W_Ed*b_s*l_w^2 to kN*m', (5.17)'
                M_Ed2 = α_2*W_Ed*b_s*l_w^2 to kN*m', (5.18)'
                M_Rd1 = f_x1*Z to kN*m', breukvlak evenwijdig aan de lintvoegen<span class="kolom-2"></span>'
                M_Rd2 = f_xd2*Z to kN*m', breukvlak loodrecht op de lintvoegen<span class="kolom-2"></span>'
                UC_M = max(M_Ed1/M_Rd1; M_Ed2/M_Rd2)', (6.15), beide richtingen'
            #end if
        #end if

        #hide
        UC_F = 0
        f_open = 1
        #show
        #if steun ≡ 1 and t_w ≥ 100 mm
            #hide
            f_open = 0
            #show
            UC_F = h_w/(30*t_w)', bruikbaarheid: h ≤ 30·t bij een wand die boven maar niet aan de einden is vastgehouden (bijlage F(2))'
        #else if steun ≡ 1
            '<i>Bruikbaarheid: bijlage F geldt vanaf t = 100 mm (F(3)); niet getoetst.</i>
        #else
            '<i>Bruikbaarheid: de grenzen van bijlage F (figuren F.1 t/m F.3) zijn niet getoetst.</i>
        #end if

        # 5. Samenvatting

        #if uc_open ≡ 1
            '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>het paneel is niet getoetst: bijlage E is hier niet van toepassing</b></span>
        #else
            UC_max = max(UC_M; UC_F)'<span class="alleen-scherm"></span>'
            #if UC_max ≤ 1.0 and f_open ≡ 1
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de wand voldoet</b> (bijlage F niet getoetst)</span>
            #else if UC_max ≤ 1.0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de wand voldoet</b></span>
            #else
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de wand voldoet niet</b></span>
            #end if
        #end if
    #end if
#end if

#if geval ≡ 2
    # 1. Spouwmuur

    '<i>Binnen- en buitenblad werken via de spouwankers samen (§6.3.1(6)). De verdeling van de windbelasting over de bladen, de uiterst opneembare stuwdruk en de belasting op de spouwankers volgen de werkwijze van NPR 9096.</i>
    @select type_U "Type: hechtsterkte van de mortel"
      U1: beide bladen gemetseld, hechtsterkte > 0,2 MPa = 1
      U2: binnenblad gelijmd (> 0,4 MPa), buitenblad gemetseld (> 0,2 MPa) = 2
      U3: beide bladen gelijmd, hechtsterkte > 0,4 MPa = 3
    @end
    @select type_R "Randvoorwaarde bij de verdiepingsvloer (buitenblad, binnenblad)"
      R1: gesteund, gesteund = 1
      R2: ongesteund, gesteund = 2
      R3: gesteund, ongesteund = 3
      R4: ongesteund, ongesteund = 4
    @end
    h_geb = ?*(m)', gebouwhoogte<span class="kolom-3"></span>'
    h_vd = ?*(m)', verdiepingshoogte l<span class="kolom-3"></span>'
    q_p = ?*(kN/m^2)', extreme stuwdruk<span class="alleen-scherm"> q<sub>p</sub>(z) op de gevel (NEN-EN 1991-1-4)</span><span class="kolom-3"></span>'
    @select bron_qu "Uiterst opneembare stuwdruk"
      tabel volgens de werkwijze van NPR 9096, gebouwhoogte lager dan 10 m = 1
      eigen waarde = 2
    @end
    #hide
    'Rijen: randvoorwaarde R1 t/m R4; daaronder type U1, U2 en U3 [kN/m²].
    qu_tab = [1; 2; 3; 4 |0.85; 0.94; 0.68; 0.60 |1.19; 1.19; 0.77; 0.68 |1.28; 1.28; 0.85; 0.77]
    ok_qu = 1
    #show
    #if bron_qu ≡ 1
        #hide
        q_u = hlookup(qu_tab; type_R; 1; 1 + type_U)*kN/m^2
        #show
        q_u', uiterst opneembare stuwdruk, tabel volgens de werkwijze van NPR 9096'
        #if h_geb ≥ 10 m
            #hide
            ok_qu = 0
            #show
            '<b style="color:#b91c1c">De tabel geldt voor gebouwen lager dan 10 m: vul een eigen, onderbouwde waarde in.</b>
        #end if
    #else
        q_u = ?*(kN/m^2)', uiterst opneembare stuwdruk, eigen onderbouwing'
        #if q_u ≤ 0 kN/m^2
            #hide
            ok_qu = 0
            #show
        #end if
    #end if
    #hide
    ok_2 = if(ok_qu ≡ 1 and q_p ≥ 0 kN/m^2 and h_vd > 0 m; 1; 0)
    UC_sm = 0
    #show
    #if ok_2 ≡ 1
        UC_sm = q_p/q_u', spouwmuur als geheel'
    #end if

    # 2. Penant tussen twee openingen

    @select penant "Penant"
      geen penant tussen openingen = 1
      penant tussen twee openingen toetsen = 2
    @end
    #hide
    UC_pen = 0
    pen_open = 0
    #show
    #if penant ≡ 2
        '<i>Grafiek volgens de werkwijze van NPR 9096: de verhouding p<sub>w;e;d</sub>/p<sub>w;d</sub> tussen de windbelasting op het penant en die op de gevel, uitgezet tegen b<sub>2</sub>/l met krommen voor b<sub>01</sub>/l, in een grafiek voor b<sub>02</sub>/l = 0 en een voor b<sub>02</sub>/l = 1. b<sub>01</sub> is de breedste opening. Het blad interpoleert lineair op b<sub>02</sub>/l.</i><span class="alleen-scherm"></span>
        b_01 = ?*(m)', breedste opening<span class="kolom-3"></span>'
        b_02 = ?*(m)', andere opening<span class="kolom-3"></span>'
        b_2 = ?*(m)', breedte van het penant<span class="kolom-3"></span>'
        #if ok_2 ≡ 1
            'b<sub>01</sub>/l = 'b_01/h_vd', b<sub>02</sub>/l = 'b_02/h_vd' en b<sub>2</sub>/l = 'b_2/h_vd', met l de verdiepingshoogte.
        #end if
        k_0 = ?', afgelezen in de grafiek voor b02/l = 0<span class="kolom-2"></span>'
        k_1 = ?', afgelezen in de grafiek voor b02/l = 1<span class="kolom-2"></span>'
        #if ok_2 ≡ 0
            #hide
            pen_open = 1
            #show
        #else if b_2 ≤ 0 m or b_02 < 0 m or b_02 > b_01 or b_01 > h_vd or b_2 > 1.5*h_vd or k_0 < 1 or k_1 < 1
            #hide
            pen_open = 1
            #show
            '<b style="color:#b91c1c">Penant niet getoetst: buiten het bereik van de grafieken (0 ≤ b<sub>02</sub> ≤ b<sub>01</sub> ≤ l, 0 < b<sub>2</sub> ≤ 1,5·l) of een afgelezen verhouding kleiner dan 1.</b>
        #else
            k_p = k_0 + (k_1 - k_0)*b_02/h_vd', p<sub>w;e;d</sub>/p<sub>w;d</sub>, lineair tussen de twee grafieken'
            q_ep = k_p*q_p', stuwdruk op het penant<span class="kolom-2"></span>'
            UC_pen = q_ep/q_u'<span class="kolom-2"></span>'
        #end if
    #end if

    # 3. Spouwankers — §6.5

    @select ca_keuze "Factor c_a (werkwijze van NPR 9096)"
      2,0: overige gevallen = 1
      1,5: gesteund binnenblad, ten minste tweemaal zo stijf als het buitenblad = 2
      3,0: niet-dragend binnenblad, boven niet gesteund; buitenblad niet aan de vloerrand gekoppeld = 3
    @end
    #hide
    c_a = if(ca_keuze ≡ 2; 1.5; if(ca_keuze ≡ 3; 3; 2))
    γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
    γ_M,a = if(CC ≡ 1; 1.8; 2.0)
    #show
    c_a'<span class="kolom-3"></span>'
    c_pe,10 = ?', uitwendig<span class="alleen-scherm">, absolute waarde</span><span class="kolom-3"></span>'
    c_pi = ?', inwendig<span class="alleen-scherm">, absolute waarde, ongunstig</span><span class="kolom-3"></span>'
    γ_Q', bij de gevolgklasse uit de projectgegevens'
    W_a,Ed = γ_Q*c_a*(c_pe,10 + c_pi)*q_p', over te dragen windbelasting'
    F_t,dec = ?*(kN)', trekcapaciteit<span class="alleen-scherm"> per anker, gedeclareerd volgens NEN-EN 845-1</span><span class="kolom-3"></span>'
    F_c,dec = ?*(kN)', drukcapaciteit<span class="alleen-scherm"> per anker, gedeclareerd</span><span class="kolom-3"></span>'
    γ_M,a', nevenproducten, tabel NB-1<span class="kolom-3"></span>'
    #hide
    ok_a = if(F_t,dec > 0 kN and F_c,dec > 0 kN; 1; 0)
    UC_ank = 1/0
    #show
    #if ok_a ≡ 1
        F_d = min(F_t,dec; F_c,dec)/γ_M,a', rekenwaarde, §6.5(4) opmerking 1'
        n_t,nodig = W_a,Ed/F_d*m^2', (6.21), per m²'
    #end if
    n_t = ?', aanwezig aantal spouwankers per m², ten minste n<sub>t,min</sub> = 2 (NB bij 8.5.2.2(2))'
    #if ok_a ≡ 1 and n_t > 0
        UC_ank = max(n_t,nodig; 2)/n_t', max(n<sub>t,nodig</sub>; n<sub>t,min</sub>)/n<sub>t</sub>'
    #else
        '<span style="color: red">Geen ankercapaciteit of geen ankers: de bladen zijn niet gekoppeld.</span>
    #end if
    '<i>Niet getoetst: de afdracht van een gesteund blad naar de vloer, en de ankers langs openingen en randen.</i><span class="alleen-scherm"></span>

    # 4. Samenvatting

    #if ok_2 ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig of de tabel is niet van toepassing: q<sub>p</sub> niet negatief, een verdiepingshoogte groter dan 0 en een uiterst opneembare stuwdruk groter dan 0.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de spouwmuur is niet getoetst</b></span>
    #else
        UC_max = max(UC_sm; UC_pen; UC_ank)'<span class="alleen-scherm"></span>'
        #if UC_max > 1.0
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de spouwmuur voldoet niet</b></span>
        #else if pen_open ≡ 1
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> zonder het penant → <b>de spouwmuur is niet volledig getoetst</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de spouwmuur voldoet</b></span>
        #end if
    #end if
#end if

#if geval ≡ 3
    # 2. Kelderwand — NEN-EN 1996-3 §4.5

    t_k = ?*(mm)', wanddikte t<span class="kolom-3"></span>'
    h_k = ?*(mm)', vrije hoogte h<span class="kolom-3"></span>'
    h_e = ?*(mm)', onder het maaiveld<span class="kolom-3"></span>'
    b_c = ?*(mm)', tussen de dwarswanden<span class="kolom-3"></span>'
    ρ_e = ?*(kN/m^3)', grond<span class="alleen-scherm">, volumiek gewicht</span><span class="kolom-3"></span>'
    q_k = ?*(kN/m^2)', op het maaiveld<span class="alleen-scherm">, karakteristiek</span><span class="kolom-3"></span>'
    N_Ed,max = ?*(kN)', per m, zwaarste uitwerking<span class="alleen-scherm"> op halve hoogte van de aanvulling</span><span class="kolom-2"></span>'
    N_Ed,min = ?*(kN)', per m, minst zware uitwerking<span class="alleen-scherm"> op halve hoogte van de aanvulling</span><span class="kolom-2"></span>'
    '<i>Uitgangspunten (§4.5(1)): de vloer boven de kelder werkt als schijf en neemt de krachten uit de gronddruk op; geen geconcentreerde last groter dan 15 kN binnen 1,5 m van de wand; het maaiveld stijgt niet op; geen waterdruk op de wand; geen glijvlak, bijvoorbeeld door een waterkerende laag, zonder maatregelen om de schuifkrachten op te nemen.</i>

    #hide
    ok_3 = if(t_k > 0 mm and h_k > 0 mm and h_e ≥ 0 mm and b_c > 0 mm and ρ_e ≥ 0 kN/m^3 and N_Ed,max ≥ 0 kN; 1; 0)
    vw_3 = if(h_k ≤ 2600 mm and t_k ≥ 200 mm and q_k ≤ 5 kN/m^2 and h_e ≤ h_k; 1; 0)
    #show
    #if ok_3 ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig: wanddikte, hoogte en afstand tussen de dwarswanden groter dan 0, de overige waarden niet negatief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de kelderwand is niet getoetst: invoer onvolledig</b></span>
    #else if vw_3 ≡ 0
        '<b style="color:#b91c1c">Buiten de voorwaarden van §4.5(1): h ≤ 2,6 m, t ≥ 200 mm, bovenbelasting ten hoogste 5 kN/m² en de aanvulling niet hoger dan de wand.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de kelderwand is niet getoetst met de vereenvoudigde methode; reken volgens NEN-EN 1996-1-1</b></span>
    #else
        f_d = f_k/γ_M'
        #if b_c ≥ 2*h_k
            β_k = 20', b<sub>c</sub> ≥ 2·h'
        #else if b_c ≤ h_k
            β_k = 40', b<sub>c</sub> ≤ h'
        #else
            β_k = 60 - 20*b_c/h_k', h < b<sub>c</sub> < 2·h'
        #end if
        N_Rd,max = t_k*b_s*f_d/3 to kN', bovengrens (4.11)'
        N_Ed,nodig = ρ_e*b_s*h_k*h_e^2/(β_k*t_k) to kN', ondergrens (4.12)'
        UC_411 = N_Ed,max/N_Rd,max', N<sub>Ed,max</sub> ≤ t·b·f<sub>d</sub>/3 (4.11)'
        #if N_Ed,min > 0 kN
            UC_412 = N_Ed,nodig/N_Ed,min', N<sub>Ed,min</sub> ≥ ρ<sub>e</sub>·b·h·h<sub>e</sub>²/(β·t) (4.12)'
        #else if N_Ed,nodig > 0 kN
            '<span style="color: red">Geen verticale belasting: de wand kan de gronddruk volgens (4.12) niet opnemen.</span>
            #hide
            UC_412 = 1/0
            #show
        #else
            #hide
            UC_412 = 0
            #show
        #end if

        UC_max = max(UC_411; UC_412)'<span class="alleen-scherm"></span>'
        #if UC_max ≤ 1.0
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de kelderwand voldoet</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de kelderwand voldoet niet</b></span>
        #end if
    #end if
#end if

#if geval ≡ 4
    # 2. Stabiliteitswand — §6.2

    l_s = ?*(mm)', lengte<span class="kolom-3"></span>'
    t_s = ?*(mm)', dikte<span class="kolom-3"></span>'
    f_vk0 = ?*(N/mm^2)', initieel<span class="kolom-3"></span>'
    '<i>f<sub>vk0</sub> uit proeven volgens NEN-EN 1052-3, of gelijk aan f<sub>xk1</sub> (NB bij 3.6.2(6)).</i><span class="alleen-scherm"></span>
    @select stootvoegen "Stootvoegen"
      gevuld, formule (3.5) = 1
      ongevuld maar dicht tegen elkaar, formule (3.6) = 2
    @end
    V_Ed = ?*(kN)', schuifkracht<span class="alleen-scherm"> in het vlak van de wand</span><span class="kolom-3"></span>'
    N_s,Ed = ?*(kN)', normaalkracht<span class="alleen-scherm">, de kleinste in dezelfde combinatie</span><span class="kolom-3"></span>'
    M_s,Ed = ?*(kN*m)', moment in het vlak<span class="alleen-scherm"> in de beschouwde doorsnede</span><span class="kolom-3"></span>'

    #hide
    ok_4 = if(l_s > 0 mm and t_s > 0 mm and f_vk0 ≥ 0 N/mm^2; 1; 0)
    #show
    #if ok_4 ≡ 0
        '<b style="color:#b91c1c">De invoer is onvolledig: lengte en dikte groter dan 0, f<sub>vk0</sub> niet negatief.</b>
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de wand is niet getoetst: invoer onvolledig</b></span>
    #else if N_s,Ed < 0 kN or (N_s,Ed ≡ 0 kN and M_s,Ed ≠ 0 kN*m)
        '<span style="color: red">Trek, of een moment zonder normaalkracht: geen gedrukt deel dat de schuifkracht kan opnemen.</span>
        #hide
        UC_max = 1/0
        #show
        '<b>Maatgevende UC = ∞</b><span style="color: red"> → <b>de wand voldoet niet</b></span>
    #else
        # 3. Gedrukt deel en schuifsterkte

        #if N_s,Ed > 0 kN
            e_s = abs(M_s,Ed)/N_s,Ed to mm', excentriciteit van de normaalkracht'
        #else
            e_s = 0*mm'
        #end if
        #if e_s ≤ l_s/6
            l_c = l_s', geheel gedrukt: e ≤ l/6'
        #else
            l_c = max(3*(l_s/2 - e_s); 0 mm)', driehoekige spanningsverdeling (6.2(3))'
        #end if
        #if l_c ≤ 0 mm
            '<span style="color: red">De resultante valt buiten de wand (e ≥ l/2): de wand kantelt.</span>
            #hide
            UC_max = 1/0
            #show
            '<b>Maatgevende UC = ∞</b><span style="color: red"> → <b>de wand voldoet niet</b></span>
        #else
            σ_d = N_s,Ed/(t_s*l_c) to N/mm^2', gemiddelde drukspanning op het gedrukte deel'
            #if stootvoegen ≡ 1
                f_vk,1 = f_vk0 + 0.4*σ_d', (3.5)'
            #else
                f_vk,1 = 0.5*f_vk0 + 0.4*σ_d', (3.6)'
            #end if
            f_vlt = 0.065*f_b*N/mm^2', bovengrens (NB bij 3.6.2(3) en (4))'
            f_vk = min(f_vk,1; f_vlt)'
            f_vd = f_vk/γ_M'

            # 4. Toetsing — (6.12) en (6.13)

            V_Rd = f_vd*t_s*l_c to kN', (6.13)'
            UC_max = abs(V_Ed)/V_Rd', V<sub>Ed</sub> ≤ V<sub>Rd</sub> (6.12)'
            '<i>Niet getoetst: het gedrukte deel op de verticale belasting en de verticale gevolgen van de schuifkracht (§6.2(5)), en de verbinding met kruisende wanden (§6.2(4)).</i>
            #if UC_max ≤ 1.0
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de wand voldoet op afschuiving</b></span>
            #else
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de wand voldoet niet op afschuiving</b></span>
            #end if
        #end if
    #end if
#end if
`;
