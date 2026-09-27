/**
 * Brandwerendheid bij de standaardbrandkromme (ISO 834): één blad voor staal,
 * hout en beton, met de keuze "materiaal". De eerste keuze is staal, zodat een
 * staalblad van vóór die keuze na "Bladen bijwerken" precies hetzelfde rekent.
 *
 * Gemeenschappelijk:
 *   • de eis in minuten. Die volgt uit het Besluit bouwwerken leefomgeving
 *     (gebruiksfunctie, hoogte van de hoogste verblijfsvloer); het blad neemt
 *     die tabel niet over en laat de eis kiezen, met een korte uitleg op het
 *     scherm;
 *   • de belasting bij brand: η_fi × de rekenwaarde bij normale temperatuur of
 *     de rekenwaarde uit (6.11b) van NEN-EN 1990. η_fi vereenvoudigd (zelf
 *     ingevuld) of uit G_k en Q_k,1 met (6.10a) en (6.10b): de kleinste van de
 *     twee (§2.4.2(3) van elk branddeel), met γ uit tabel NB.4/NB.5 – A1.2(B)
 *     bij de gevolgklasse van het project en ψ_0 en ψ_2 uit tabel NB.2 – A1.1;
 *     bij brand ψ_2,1 (tabel NB.10 – A1.3).
 *
 * 1. Staal — NEN-EN 1993-1-2 met de NB (ongewijzigd). Invoer zoals het
 *    parametrische beeld (BrandwerendheidDesigner.tsx): profiel, staalsoort,
 *    werking van het element, verhitting, de belasting bij brand en de
 *    bekleding. Getoetst:
 *      • de doorsnedeklasse bij brand (§4.2.2, ε = 0,85·√(235/f_y));
 *      • de kritieke temperatuur. Zonder instabiliteit (ligger met verhinderde
 *        kip, trekstaaf) met (4.22) uit μ_0 = E_fi,d/R_fi,d,0 (4.23), bij een
 *        ligger met κ_1 en κ_2 (§4.2.3.3(7) en (8)). κ_1 < 1 alleen bij
 *        driezijdige verhitting met een beton- of staalplaatbetonvloer aan de
 *        vierde zijde; dat is een aparte keuze, die op "een andere vloer of een
 *        wand" (κ_1 = 1) begint. Bij kip of knik de temperatuur waarbij de
 *        weerstand met χ_LT,fi of χ_fi (§4.2.3.3, §4.2.3.2) gelijk wordt aan
 *        E_fi,d, gevonden door halvering. In doorsnedeklasse 4 350 °C
 *        (§4.2.3.6); die regel veronderstelt een element dat de belasting
 *        draagt, dus toetst het blad daar ook μ_0 ≤ 1 met de knikweerstand bij
 *        20 °C en A_eff zoals in bijlage E (NEN-EN 1993-1-5 §4.4, eigenschappen
 *        bij 20 °C). Klasse 4 komt bij deze profielen alleen voor bij het lijf
 *        van een IPE onder druk; de flenzen blijven dan volledig meewerken;
 *      • de staaltemperatuur na de eis, incrementeel: onbekleed (4.25) met k_sh
 *        (4.26a) en ḣ_net uit NEN-EN 1991-1-2 (3.1) t/m (3.3), Δt = 5 s;
 *        bekleed (4.27) en (4.28), Δt = 30 s: de grootste stap volgens
 *        §4.2.5.1 en §4.2.5.2. c_a(θ) volgens §3.4.1.2, gaskromme (3.4) van
 *        NEN-EN 1991-1-2;
 *      • UC = θ_a,t/θ_a,cr; bij kip of knik daarnaast de weerstand bij θ_a,t.
 *        Bij μ_0 > 1 telt de weerstand bij θ_a,t; in klasse 4 de grootste van
 *        μ_0 en θ_a,t/350.
 *    De stap houdt de staaltemperatuur onder de gastemperatuur. Bij een
 *    realistische bekleding raakt die grens nooit; hij voorkomt dat de
 *    expliciete stap bij een onzinnig dunne bekleding (d_p van een millimeter
 *    met een grote λ_p) gaat slingeren. Aannames: gelijkmatige
 *    staaltemperatuur over doorsnede en lengte, vocht in de bekleding
 *    verwaarloosd en de afrondingen van het profiel niet in de omtrek; alle
 *    drie aan de veilige kant. Niet getoetst: dwarskracht, druk met buiging
 *    (§4.2.3.5) en de verbindingen. Profielen HEA 100–300, HEB 100–300 en
 *    IPE 200–400 (id 1–27, gelijk aan profielOpties() in profielen.ts).
 *
 * 2. Hout — NEN-EN 1995-1-2 met de NB, rechthoekige doorsnede van naaldhout
 *    (C18–C30 volgens NEN-EN 338, GL24h–GL32h volgens NEN-EN 14080). De NB
 *    schrijft de methode met de gereduceerde doorsnede voor (§4.2.1):
 *      • d_char,n = β_n·t (3.2), β_n uit tabel 3.1 (gezaagd 0,8, gelijmd
 *        gelamineerd 0,7 mm/min); d_ef = d_char,n + k_0·d_0 met d_0 = 7 mm
 *        (4.1), k_0 volgens tabel 4.1 of, bij t_ch > 20 min, §4.2.2(3);
 *      • bescherming met één gipskartonplaat: t_ch = 2,8·h_p − 14 (3.11); type
 *        A of H t_f = t_ch (3.15), type F t_f uit de productgegevens met
 *        k_2 = 1 − 0,018·h_p (3.7); of t_ch, t_f en k_2 zelf. Tussen t_ch en t_f
 *        k_2·β_n, tot t_a (3.8) of (3.9) k_3·β_n met k_3 = 2, daarna β_n
 *        (§3.4.3.2);
 *      • drie- of vierzijdig: aan de onverhitte zijde b (bovenzijde van een
 *        ligger, de wandzijde van een kolom) brandt h niet in;
 *      • f_d,fi = k_mod,fi·k_fi·f_k/γ_M,fi (2.1) met (2.4), k_mod,fi = 1,0
 *        (§4.2.2(5)), k_fi uit tabel 2.1 (1,25 en 1,15), γ_M,fi = 1,0 (NB);
 *      • ligger: buiging (6.11) met kip (6.33) en (6.34), σ_m,crit volgens
 *        (6.32) bij massief naaldhout en (6.31) bij gelijmd gelamineerd hout
 *        (G_0,05 = 540 N/mm² volgens NEN-EN 14080, I_tor = h·b³/3·(1 − 0,63·b/h)),
 *        met de effectieve doorsnede, en afschuiving (6.13) met
 *        k_cr = 1,0 (NB bij §6.1.7(2)); afschuiving mag volgens §4.3.1(2)
 *        vervallen, het blad toetst hem toch. Kolom: druk met buiging om de
 *        sterke as, knik (6.23)/(6.24) met k_c (6.25)–(6.29), of (6.19) als
 *        beide slankheden ≤ 0,3 zijn. Bij brand vallen k_fi in f_20 en E_20
 *        (2.4)/(2.5) in de relatieve slankheden tegen elkaar weg;
 *      • η_fi vereenvoudigd volgens de NB bij §2.4.2(3): 0,45, bij categorie E1
 *        0,7.
 *    De hoogtefactor k_h is weggelaten (veilige kant). Een volledig ingebrande
 *    doorsnede krijgt UC = ∞.
 *
 * 3. Beton — NEN-EN 1992-1-2 met de NB, tabelmethode (hoofdstuk 5): kolom
 *    (methode A, tabel 5.2a), balk (tabel 5.5 of 5.6) en vloer (tabel 5.8,
 *    een- of tweezijdig dragend). NEN-EN 1992-1-2 stond bij het maken van dit
 *    blad niet ter inzage; daarom zijn de tabelwaarden (b_min of h_s en a)
 *    invoer, met op het scherm welke tabel en kolom. Het blad rekent de
 *    asafstand a = c + Ø_beugel + Ø/2 (vloer c + Ø/2), de benuttingsgraad
 *    μ_fi = E_fi,d/R_d (kolom N_0Ed,fi/N_Rd, met de tabelkolom 0,2/0,5/0,7
 *    naar boven afgerond en μ_fi > 0,7 buiten de tabel; balk en vloer
 *    M_Ed,fi/M_Rd met σ_s,fi/f_yk ≈ μ_fi/γ_S volgens (5.2)) en
 *    UC = max(b_min/b; a_nodig/a). Een balk of vloer met μ_fi > 1 voldoet al bij
 *    normale temperatuur niet en krijgt geen UC maar "voldoet niet".
 *      • kolom: de toepassingsvoorwaarden van methode A (§5.3.2(2)) worden
 *        getoetst: l_0,fi ≤ 3 m, e = M_0Ed,fi/N_0Ed,fi ≤ e_max (NB: 0,4·h bij
 *        een kolombreedte ≥ 300 mm, anders 0,15·h) en A_s < 0,04·A_c; buiten
 *        die voorwaarden "methode A niet toepasbaar → voldoet niet";
 *      • balk (tabel 5.5 en 5.6): a_nodig = a_tabel + Δa met (5.3) en θ_cr
 *        uit kromme 1 van figuur 5.1 (§5.2(6) en (7)), begrensd op 700 °C
 *        (§5.2(8)); bij een doorgaande balk alleen een vergroting;
 *      • vloer (tabel 5.8): §5.2(7) kent geen aanpassing, dus bij
 *        σ_s,fi/f_yk > 0,6 "niet aangetoond → voldoet niet";
 *      • de belasting en N_Rd of M_Rd zijn bij elk element nodig.
 *
 * Een blad zonder belasting, lengte, afmeting of tabelwaarde krijgt geen UC
 * maar "niet te bepalen → voldoet niet": een leeg veld telt als 0, en daarmee
 * zou het element ten onrechte voldoen. Geen referentieberekening
 * beschikbaar; scripts/check-brand.mjs rekent de uitkomsten onafhankelijk na.
 */

export const brandwerendheid = `"Brandwerendheid — staal, hout of beton volgens EN 1993-1-2, EN 1995-1-2 of EN 1992-1-2

'<i>De draagfunctie bij brand volgens de standaardbrandkromme, voor een stalen profiel, een houten doorsnede of een betonnen kolom, balk of vloer.</i><span class="alleen-scherm"></span>

# 1. Eis en materiaal

@select materiaal "Materiaal"
  Staal: stalen profiel (EN 1993-1-2) = 1
  Hout: rechthoekige doorsnede (EN 1995-1-2) = 2
  Beton: tabelmethode (EN 1992-1-2) = 3
@end

@select eis_min "Brandwerendheidseis"
  30 minuten = 30
  60 minuten = 60
  90 minuten = 90
  120 minuten = 120
@end
'<i>De eis volgt uit het Besluit bouwwerken leefomgeving (Bbl): bij nieuwbouw uit de voorschriften voor sterkte bij brand, naar de gebruiksfunctie en de hoogte van de hoogste vloer van een verblijfsgebied boven het meetniveau. Een permanente vuurbelasting van niet meer dan 500 MJ/m² (blad Permanente vuurlast) kan de eis verlagen. Dit blad neemt de tabel uit het Bbl niet over: zoek de eis voor de gebruiksfunctie op en kies hem hier, gelijk aan de eis voor de hoofddraagconstructie in de uitgangspunten van het rapport.</i><span class="alleen-scherm"></span>

#if materiaal ≡ 1
    '<i>De staaltemperatuur na de brandwerendheidseis bij de standaardbrandkromme, getoetst aan de kritieke temperatuur van het profiel. Zonder instabiliteit volgt die uit de benuttingsgraad μ<sub>0</sub> met (4.22), bij kip of knik uit de weerstand met χ<sub>fi</sub>; in doorsnedeklasse 4 is hij 350 °C.</i><span class="alleen-scherm"></span>

    # 2. Stalen profiel

    @select profiel "Staalprofiel"
      HEA 100 = 1
      HEA 120 = 2
      HEA 140 = 3
      HEA 160 = 4
      HEA 180 = 5
      HEA 200 = 6
      HEA 220 = 7
      HEA 240 = 8
      HEA 260 = 9
      HEA 300 = 10
      HEB 100 = 11
      HEB 120 = 12
      HEB 140 = 13
      HEB 160 = 14
      HEB 180 = 15
      HEB 200 = 16
      HEB 220 = 17
      HEB 240 = 18
      HEB 260 = 19
      HEB 300 = 20
      IPE 200 = 21
      IPE 240 = 22
      IPE 270 = 23
      IPE 300 = 24
      IPE 330 = 25
      IPE 360 = 26
      IPE 400 = 27
    @end

    @select staalsoort "Staalsoort"
      S235 = 235
      S275 = 275
      S355 = 355
    @end

    @select werking "Werking van het element"
      Ligger, kip verhinderd = 1
      Ligger, kip mogelijk = 2
      Kolom op centrische druk = 3
      Trekstaaf = 4
    @end

    @select verhitting "Verhitting"
      Vierzijdig = 4
      Driezijdig (vloer of wand aan de vierde zijde) = 3
    @end

    #if werking ≡ 1
        @select schema "Doorsnede met het grootste moment"
          In het veld, of een statisch bepaalde ligger = 1
          Boven een tussensteunpunt van een statisch onbepaalde ligger = 2
        @end
        #if verhitting ≡ 3
            @select vloer "Aan de vierde zijde"
              Een andere vloer of een wand = 0
              Een beton- of staalplaatbetonvloer = 1
            @end
        #end if
    #end if

    #hide
    'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
    profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |96; 114; 133; 152; 171; 190; 210; 230; 250; 290; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 135; 150; 160; 170; 180 |5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 14; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 15; 15; 15; 18; 18; 21 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |349.2; 606.2; 1033; 1673; 2510; 3692; 5410; 7763; 10450; 18260; 449.5; 864.4; 1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 104.2; 165.2; 245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 167.3; 317.5; 549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 51.42; 80.97; 119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |2580; 6470; 15060; 31410; 60210; 108000; 193300; 328500; 516400; 1200000; 3380; 9410; 22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
    h = hlookup(profielen; profiel; 1; 2)*mm
    b = hlookup(profielen; profiel; 1; 3)*mm
    t_w = hlookup(profielen; profiel; 1; 4)*mm
    t_f = hlookup(profielen; profiel; 1; 5)*mm
    r = hlookup(profielen; profiel; 1; 6)*mm
    A = hlookup(profielen; profiel; 1; 7)*cm^2
    I_y = hlookup(profielen; profiel; 1; 8)*cm^4
    W_el,y = hlookup(profielen; profiel; 1; 9)*cm^3
    W_pl,y = hlookup(profielen; profiel; 1; 10)*cm^3
    I_z = hlookup(profielen; profiel; 1; 13)*cm^4
    I_t = hlookup(profielen; profiel; 1; 17)*cm^4
    I_w = hlookup(profielen; profiel; 1; 18)*cm^6
    E = 210000 N/mm^2
    G = 81000 N/mm^2
    #show
    'h = 'h' mm, b = 'b' mm, t<sub>w</sub> = 't_w' mm, t<sub>f</sub> = 't_f' mm, r = 'r' mm, A = 'A' cm², W<sub>el,y</sub> = 'W_el,y' cm³, W<sub>pl,y</sub> = 'W_pl,y' cm³.
    f_y = staalsoort*N/mm^2', tabel 3.1 van EN 1993-1-1, t ≤ 40 mm<span class="kolom-2"></span>'
    γ_M,fi = 1.0', §2.3<span class="kolom-2"></span>'
#else if materiaal ≡ 2
    '<i>Methode met de gereduceerde doorsnede (§4.2.2), die de NB voorschrijft: de doorsnede neemt aan de verhitte zijden af met d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>·d<sub>0</sub>; de rest houdt de sterkte en stijfheid van 20 °C, als 20 %-fractielwaarde k<sub>fi</sub>·f<sub>k</sub> met k<sub>mod,fi</sub> = 1,0 en γ<sub>M,fi</sub> = 1,0.</i><span class="alleen-scherm"></span>

    # 2. Houten doorsnede

    @select houtsoort "Sterkteklasse"
      C18 = 1
      C24 = 2
      C30 = 3
      GL24h = 4
      GL28h = 5
      GL32h = 6
    @end

    @select werking_h "Werking van het element"
      Ligger, kip verhinderd = 1
      Ligger, kip mogelijk = 2
      Kolom op druk, eventueel met buiging om de sterke as = 3
    @end

    @select verhitting "Verhitting"
      Vierzijdig = 4
      Driezijdig (vloer of wand aan de vierde zijde) = 3
    @end
    #if verhitting ≡ 3
        '<i>Driezijdig: één zijde b is niet verhit, de bovenzijde van een ligger onder een vloer of de wandzijde van een kolom; h brandt dan aan één kant in. Een kolom tegen of in een wand mag alleen zo als de wand een scheidende brandwerendheid heeft van ten minste de eis (§4.3.3(3) met figuur NB.1).</i><span class="alleen-scherm"></span>
    #end if

    b_hout = ?*(mm)', breedte b<span class="kolom-2"></span>'
    h_hout = ?*(mm)', hoogte h<span class="alleen-scherm">, in de richting van de belasting</span><span class="kolom-2"></span>'
    #hide
    'Hout [id | f_m,k | f_c,0,k | f_v,k | E_0,05] in N/mm²: NEN-EN 338 voor C18 t/m C30, NEN-EN 14080 voor GL24h t/m GL32h
    houtsterkte = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |18; 21; 23; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |6000; 7400; 8000; 9600; 10500; 11800]
    f_m,k = hlookup(houtsterkte; houtsoort; 1; 2)*N/mm^2
    f_c,0,k = hlookup(houtsterkte; houtsoort; 1; 3)*N/mm^2
    f_v,k = hlookup(houtsterkte; houtsoort; 1; 4)*N/mm^2
    E_0,05 = hlookup(houtsterkte; houtsoort; 1; 5)*N/mm^2
    gelijmd = if(houtsoort ≥ 4; 1; 0)
    #show
    'f<sub>m,k</sub> = 'f_m,k' N/mm², f<sub>c,0,k</sub> = 'f_c,0,k' N/mm², f<sub>v,k</sub> = 'f_v,k' N/mm², E<sub>0,05</sub> = 'E_0,05' N/mm² ('if(gelijmd ≡ 1; "NEN-EN 14080"; "NEN-EN 338")'); naaldhout met ρ<sub>k</sub> ≥ 290 kg/m³.
#else
    '<i>Tabelmethode (hoofdstuk 5): het element voldoet als de afmeting en de asafstand a van de hoofdwapening ten minste de waarden uit de tabel bij de eis zijn. De tabellen van NEN-EN 1992-1-2 staan niet in dit blad: lees de waarden af in de genoemde tabel en vul ze in onder 4.</i><span class="alleen-scherm"></span>

    # 2. Betonnen element

    @select element_b "Element"
      Kolom, methode A (§5.3.2, tabel 5.2a) = 1
      Balk, vrij opgelegd (§5.6.2, tabel 5.5) = 2
      Balk, doorgaand (§5.6.3, tabel 5.6) = 3
      Vloer, eenzijdig dragend (§5.7, tabel 5.8) = 4
      Vloer, tweezijdig dragend (§5.7, tabel 5.8) = 5
    @end

    #if element_b ≡ 1
        @select zijde_b "Verhitting"
          Aan meer dan één zijde = 1
          Aan één zijde (kolom in een wand) = 2
        @end
        @select vorm_b "Doorsnede"
          Rechthoekig = 1
          Rond, b = h = de diameter = 2
        @end
        b_beton = ?*(mm)', breedte b<span class="kolom-2"></span>'
        h_beton = ?*(mm)', diepte h<span class="alleen-scherm">, in de richting van de excentriciteit; bij een ronde kolom beide de diameter</span><span class="kolom-2"></span>'
        l_0fi = ?*(m)', kniklengte bij brand l<sub>0,fi</sub><span class="alleen-scherm">; in een geschoord gebouw bij een eis boven R 30 mag 0,5·l voor een tussenverdieping en 0,5·l tot 0,7·l voor de bovenste verdieping (§5.3.2(2), opmerking 2)</span>'
    #else if element_b ≤ 3
        b_beton = ?*(mm)', breedte b<span class="alleen-scherm"> (bij een I-vorm geeft de tabel ook een lijfdikte)</span><span class="kolom-2"></span>'
        h_beton = ?*(mm)', hoogte h<span class="kolom-2"></span>'
    #else
        #if element_b ≡ 5
            @select verhouding_b "Overspanningen"
              l_y/l_x hooguit 1,5 = 1
              l_y/l_x tussen 1,5 en 2 = 2
            @end
        #end if
        h_beton = ?*(mm)', vloerdikte h<sub>s</sub>'
    #end if
    #if element_b ≤ 3
        c_dek = ?*(mm)', dekking op de beugel<span class="kolom-3"></span>'
        d_beugel = ?*(mm)', beugeldiameter<span class="kolom-3"></span>'
        d_staaf = ?*(mm)', diameter hoofdwapening<span class="kolom-3"></span>'
        a_hw = c_dek + d_beugel + d_staaf/2', asafstand a van de hoofdwapening tot het verhitte oppervlak (§5.2)'
        #if element_b ≡ 1
            A_s = ?*(mm^2)', totale doorsnede van de langswapening<span class="alleen-scherm"> van de kolom</span>'
        #end if
    #else
        c_dek = ?*(mm)', dekking op de onderwapening<span class="kolom-2"></span>'
        d_staaf = ?*(mm)', diameter onderwapening<span class="kolom-2"></span>'
        a_hw = c_dek + d_staaf/2', asafstand a van de onderwapening tot de verhitte onderzijde (§5.2)'
    #end if
    '<i>Eén laag betonstaal. Bij meer lagen of bij voorspanstaal gelden de regels voor a in §5.2.</i><span class="alleen-scherm"></span>
#end if

# 3. Belasting bij brand

@select bron_fi "Belasting bij brand"
  ηfi × rekenwaarde bij normale temperatuur = 1
  Rekenwaarde in de buitengewone combinatie, zelf ingevuld = 2
@end

#if bron_fi ≡ 1
    @select eta_uit "Reductiefactor ηfi"
      Vereenvoudigd of zelf ingevuld = 1
      Uit Gk en Qk,1 met (6.10a) en (6.10b) = 2
    @end
    #if eta_uit ≡ 1
        #if materiaal ≡ 1
            '<i>E<sub>fi,d</sub> = η<sub>fi</sub>·E<sub>d</sub> (§2.4.2(2)). Vereenvoudigd is η<sub>fi</sub> = 0,65, bij categorie E 0,7 (§2.4.2(3)). Bij een overwegend blijvende belasting komt η<sub>fi</sub> hoger uit, tot 1/γ<sub>G</sub> uit (6.10a), in CC2 1/1,35 = 0,74: reken hem dan uit, of vul de rekenwaarde uit (6.11b) van NEN-EN 1990 in.</i><span class="alleen-scherm"></span>
        #else if materiaal ≡ 2
            '<i>E<sub>d,fi</sub> = η<sub>fi</sub>·E<sub>d</sub> (2.8). Vereenvoudigd is volgens de NB bij §2.4.2(3) η<sub>fi</sub> = 0,45, bij categorie E1 (opslag) 0,7. Bij een overwegend blijvende belasting komt η<sub>fi</sub> hoger uit, tot 1/γ<sub>G</sub> uit (6.10a): reken hem dan uit met (2.9a) en (2.9b), of vul de rekenwaarde uit (6.11b) van NEN-EN 1990 in.</i><span class="alleen-scherm"></span>
        #else
            '<i>E<sub>d,fi</sub> = η<sub>fi</sub>·E<sub>d</sub> (§2.4.2 van NEN-EN 1992-1-2). Reken η<sub>fi</sub> uit met G<sub>k</sub> en Q<sub>k,1</sub>, of vul de vereenvoudigde waarde uit de norm met de NB in.</i><span class="alleen-scherm"></span>
        #end if
    #else
        '<i>η<sub>fi</sub> = E<sub>fi,d</sub>/E<sub>d</sub> uit de karakteristieke blijvende belasting G<sub>k</sub> en de overheersende veranderlijke belasting Q<sub>k,1</sub>: de kleinste van de waarden met (6.10a) en (6.10b) (§2.4.2(3)). γ uit tabel NB.4 of NB.5 – A1.2(B) bij de gevolgklasse van het project, ψ<sub>0</sub> uit tabel NB.2 – A1.1, bij brand ψ<sub>fi</sub> = ψ<sub>2,1</sub> (tabel NB.10 – A1.3; ψ<sub>1,1</sub> alleen voor wind bij brand in de beoordeling van disproportionele schade).</i><span class="alleen-scherm"></span>
        @select categorie_fi "Overheersende veranderlijke belasting"
          Categorie A: woon- en verblijfsruimtes = 1
          Categorie B: kantoorruimtes = 2
          Categorie C: bijeenkomstruimtes, vluchtroutes en trappen = 3
          Categorie C: bijeenkomstruimtes, overig = 4
          Categorie D: winkelruimtes = 5
          Categorie E: opslagruimtes = 6
          Categorie F: verkeersruimte, voertuig tot 25 kN = 7
          Categorie G: verkeersruimte, voertuig 25 tot 160 kN = 8
          Categorie H: daken = 9
          Industrie, niet langdurig aanwezig = 10
          Industrie, langdurig aanwezig = 11
          Sneeuw = 12
          Wind = 13
        @end
        G_k = ?', karakteristieke blijvende belasting<span class="kolom-2"></span>'
        Q_k1 = ?', Q<sub>k,1</sub>, in dezelfde eenheid<span class="kolom-2"></span>'
        #hide
        'ψ-factoren [keuze | ψ_0 | ψ_2], tabel NB.2 – A1.1
        psi_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13 |0.4; 0.5; 0.6; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0.5; 1.0; 0; 0 |0.3; 0.3; 0.6; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0.3; 0.8; 0; 0]
        ψ_0,1 = hlookup(psi_tabel; categorie_fi; 1; 2)
        ψ_fi = hlookup(psi_tabel; categorie_fi; 1; 3)
        γ_G,a = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
        γ_G,b = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
        γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
        #show
        ψ_0,1', tabel NB.2 – A1.1<span class="kolom-2"></span>'
        ψ_fi', ψ<sub>2,1</sub><span class="kolom-2"></span>'
        'Gevolgklasse CC'CC': γ<sub>G</sub> = 'γ_G,a' in (6.10a) en 'γ_G,b' in (6.10b), γ<sub>Q</sub> = 'γ_Q' (tabel 'if(CC ≡ 2; "NB.4"; "NB.5")' – A1.2(B)).
        #if G_k > 0
            η_fi,a = (G_k + ψ_fi*Q_k1)/(γ_G,a*G_k + γ_Q*ψ_0,1*Q_k1)', met (6.10a)<span class="kolom-2"></span>'
            η_fi,b = (G_k + ψ_fi*Q_k1)/(γ_G,b*G_k + γ_Q*Q_k1)', met (6.10b)<span class="kolom-2"></span>'
            η_fi = min(η_fi,a; η_fi,b)', de kleinste (§2.4.2(3))'
        #else
            '<b style="color:#b91c1c">Vul G<sub>k</sub> en Q<sub>k,1</sub> in.</b>
            #hide
            η_fi = 0
            #show
        #end if
    #end if
#else
    '<i>De rekenwaarde uit de buitengewone combinatie (6.11b) van NEN-EN 1990, met alle γ = 1,0 en ψ<sub>2,1</sub> bij de overheersende veranderlijke belasting (tabel NB.10 – A1.3 van de NB; ψ<sub>1,1</sub> alleen voor wind bij brand in de beoordeling van disproportionele schade).</i><span class="alleen-scherm"></span>
#end if

#if materiaal ≡ 1
    #if werking ≤ 2
        #if bron_fi ≡ 1
            M_Ed = ?*(kN*m)', grootste moment bij normale temperatuur<span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
            #end if
            E_fi,d = η_fi*abs(M_Ed) to kN*m', §2.4.2(2)<span class="alleen-scherm">; het teken van de invoer telt niet</span>'
        #else
            M_fi = ?*(kN*m)', grootste moment bij brand (6.11b)'
            E_fi,d = abs(M_fi) to kN*m
        #end if
        #hide
        geen_E = if(E_fi,d/(1 kN*m) > 0; 0; 1)
        geen_L = 0
        #show
    #else
        #if bron_fi ≡ 1
            N_Ed = ?*(kN)', normaalkracht bij normale temperatuur<span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
            #end if
            E_fi,d = η_fi*abs(N_Ed) to kN', §2.4.2(2)<span class="alleen-scherm">; het teken van de invoer telt niet</span>'
        #else
            N_fi = ?*(kN)', normaalkracht bij brand (6.11b)'
            E_fi,d = abs(N_fi) to kN
        #end if
        #hide
        geen_E = if(E_fi,d/(1 kN) > 0; 0; 1)
        geen_L = 0
        #show
    #end if
    #if werking ≡ 2
        L_kip = ?*(m)', kiplengte tussen de gaffels<span class="kolom-3"></span>'
        C_1 = ?', tabel NB.NB.1<span class="kolom-3"></span>'
        C_2 = ?', tabel NB.NB.1<span class="alleen-scherm">, negatief bij een last op de bovenflens;een gelijkmatige last op de bovenflens, naar het buitenvlak geëxtrapoleerd: −0,45·h/(h − t<sub>f</sub>)</span><span class="kolom-3"></span>'
        #hide
        geen_L = if(L_kip/(1 m) > 0 and C_1 > 0; 0; 1)
        #show
    #else if werking ≡ 3
        L_fi = ?*(m)', kniklengte bij brand<span class="alleen-scherm">; in een geschoord gebouw met een brandcompartiment per verdieping 0,5·L, op de bovenste verdieping 0,7·L (§4.2.3.2)</span>'
        #hide
        geen_L = if(L_fi/(1 m) > 0; 0; 1)
        #show
    #end if
#else if materiaal ≡ 2
    #if werking_h ≤ 2
        #if bron_fi ≡ 1
            M_Ed = ?*(kN*m)', grootste moment bij normale temperatuur<span class="kolom-2"></span>'
            V_Ed = ?*(kN)', grootste dwarskracht bij normale temperatuur<span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))'
            #end if
            M_fi,d = η_fi*abs(M_Ed) to kN*m', (2.8)<span class="alleen-scherm">; het teken van de invoer telt niet</span><span class="kolom-2"></span>'
            V_fi,d = η_fi*abs(V_Ed) to kN'<span class="kolom-2"></span>'
        #else
            M_fi = ?*(kN*m)', grootste moment bij brand (6.11b)<span class="kolom-2"></span>'
            V_fi = ?*(kN)', grootste dwarskracht bij brand<span class="kolom-2"></span>'
            #hide
            M_fi,d = abs(M_fi) to kN*m
            V_fi,d = abs(V_fi) to kN
            #show
        #end if
        #hide
        geen_E = if(M_fi,d/(1 kN*m) > 0 or V_fi,d/(1 kN) > 0; 0; 1)
        geen_L = 0
        #show
        #if werking_h ≡ 2
            l_ef = ?*(m)', kiplengte ℓ<sub>ef</sub> volgens tabel 6.1 van EN 1995-1-1<span class="alleen-scherm">, met 2h erbij bij een last aan de drukzijde; bezwijkt het stabiliteitsverband bij brand, dan zonder die steun (§4.3.2)</span>'
            #hide
            geen_L = if(l_ef/(1 m) > 0; 0; 1)
            #show
        #end if
    #else
        #if bron_fi ≡ 1
            N_Ed = ?*(kN)', normaalkracht (druk) bij normale temperatuur<span class="kolom-2"></span>'
            M_Ed = ?*(kN*m)', moment om de sterke as bij normale temperatuur<span class="alleen-scherm">, 0 bij centrische druk</span><span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))'
            #end if
            N_fi,d = η_fi*abs(N_Ed) to kN', (2.8)<span class="alleen-scherm">; het teken van de invoer telt niet</span><span class="kolom-2"></span>'
            M_fi,d = η_fi*abs(M_Ed) to kN*m'<span class="kolom-2"></span>'
        #else
            N_fi = ?*(kN)', normaalkracht bij brand (6.11b)<span class="kolom-2"></span>'
            M_fi = ?*(kN*m)', moment om de sterke as bij brand<span class="kolom-2"></span>'
            #hide
            N_fi,d = abs(N_fi) to kN
            M_fi,d = abs(M_fi) to kN*m
            #show
        #end if
        L_fi = ?*(m)', kniklengte bij brand, om beide assen<span class="alleen-scherm">; in een geschoord gebouw met een brandcompartiment per verdieping mag de kolom aan de einden als ingeklemd worden beschouwd (§4.3.3(2), figuur 4.4)</span>'
        #hide
        geen_E = if(N_fi,d/(1 kN) > 0 or M_fi,d/(1 kN*m) > 0; 0; 1)
        geen_L = if(L_fi/(1 m) > 0; 0; 1)
        #show
    #end if
#else
    #if element_b ≡ 1
        #if bron_fi ≡ 1
            N_Ed = ?*(kN)', normaalkracht bij normale temperatuur<span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
            #end if
            E_fi,d = η_fi*abs(N_Ed) to kN', N<sub>0Ed,fi</sub> (§2.4.2(2))<span class="alleen-scherm">; het teken van de invoer telt niet</span>'
            M_0Ed = ?*(kN*m)', eerste-orde moment bij normale temperatuur<span class="alleen-scherm"> in dezelfde combinatie, om de as evenwijdig aan b; 0 bij centrische druk</span>'
            #hide
            e_fi = if(abs(N_Ed)/(1 kN) > 0; abs(M_0Ed)/abs(N_Ed); 0 m) to mm
            #show
        #else
            N_fi = ?*(kN)', normaalkracht bij brand (6.11b)'
            E_fi,d = abs(N_fi) to kN
            M_0Ed,fi = ?*(kN*m)', eerste-orde moment bij brand<span class="alleen-scherm">, om de as evenwijdig aan b; 0 bij centrische druk</span>'
            #hide
            e_fi = if(abs(N_fi)/(1 kN) > 0; abs(M_0Ed,fi)/abs(N_fi); 0 m) to mm
            #show
        #end if
        N_Rd = ?*(kN)', rekenwaarde van de weerstand bij normale temperatuur<span class="alleen-scherm"> volgens NEN-EN 1992-1-1, met de tweede-ordeeffecten</span>'
        #hide
        geen_E = if(E_fi,d/(1 kN) > 0; 0; 1)
        geen_R = if(N_Rd/(1 kN) > 0; 0; 1)
        heeft_μ = if(geen_E + geen_R ≡ 0; 1; 0)
        #show
    #else
        '<i>De belasting en M<sub>Rd</sub> geven de staalspanning bij brand σ<sub>s,fi</sub>/f<sub>yk</sub>. De tabellen horen bij 0,6 (θ<sub>cr</sub> = 500 °C, §5.2(4)); bij een andere spanning past het blad de asafstand aan of toetst het niet.</i><span class="alleen-scherm"></span>
        #if bron_fi ≡ 1
            M_Ed = ?*(kN*m)', grootste moment bij normale temperatuur<span class="alleen-scherm">, bij een vloer per meter breedte</span><span class="kolom-2"></span>'
            #if eta_uit ≡ 1
                η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
            #end if
            E_fi,d = η_fi*abs(M_Ed) to kN*m', M<sub>Ed,fi</sub> (§2.4.2(2))'
        #else
            M_fi = ?*(kN*m)', grootste moment bij brand (6.11b)'
            E_fi,d = abs(M_fi) to kN*m
        #end if
        M_Rd = ?*(kN*m)', momentcapaciteit bij normale temperatuur in dezelfde doorsnede<span class="alleen-scherm"> (NEN-EN 1992-1-1)</span>'
        #hide
        geen_E = if(E_fi,d/(1 kN*m) > 0; 0; 1)
        geen_R = if(M_Rd/(1 kN*m) > 0; 0; 1)
        heeft_μ = if(geen_E + geen_R ≡ 0; 1; 0)
        #show
    #end if
#end if

#if materiaal ≡ 1
    # 4. Bekleding

    @select bekleed "Bekleed"
      Onbekleed = 0
      Bekleed = 1
    @end

    #if bekleed ≡ 1
        @select beklvorm "Vorm van de bekleding"
          Kokervormig bekleed = 1
          Profielvolgend bekleed = 2
        @end
        @select beklmateriaal "Materiaal van de bekleding"
          Gipskartonplaat = 1
          Vermiculiet-/perlietplaat = 2
          Spuitmortel = 3
          Steenwol = 4
        @end
        '<i>λ<sub>p</sub>, ρ<sub>p</sub> en c<sub>p</sub> zijn effectieve waarden bij brand, uit de productbeoordeling van de bekleding (NEN-EN 13381-4). Het beeld vult bij de materiaalkeuze indicatieve waarden in. Een warmtegeleiding bij kamertemperatuur ligt ver aan de onveilige kant, zeker bij steenwol.</i><span class="alleen-scherm"></span>
        d_p = ?*(mm)', dikte<span class="kolom-4"></span>'
        lambda_p = ?', λ<sub>p</sub> in W/mK<span class="kolom-4"></span>'
        rho_p = ?', ρ<sub>p</sub> in kg/m³<span class="kolom-4"></span>'
        c_p = ?', c<sub>p</sub> in J/kgK<span class="kolom-4"></span>'
        #if d_p/(1 mm) < 1
            '<b style="color:#b91c1c">De bekleding heeft geen dikte: vul d<sub>p</sub> in, of kies onbekleed.</b>
        #end if
    #end if

    # 5. Kritieke temperatuur

    #hide
    ky_tab = [1; 1; 1; 1; 0.78; 0.47; 0.23; 0.11; 0.06; 0.04; 0.02; 0]
    kE_tab = [1; 0.9; 0.8; 0.7; 0.6; 0.31; 0.13; 0.09; 0.0675; 0.045; 0.0225; 0]
    j_T(θ) = min(floor(θ/100); 11)
    lin_T(v; θ) = take(j_T(θ); v) + (take(j_T(θ) + 1; v) - take(j_T(θ); v))*(θ/100 - j_T(θ))
    k_y(θ) = if(θ ≤ 100; 1; lin_T(ky_tab; θ))
    k_E(θ) = if(θ ≤ 100; 1; max(lin_T(kE_tab; θ); 0.0001))
    #show
    #if werking ≤ 3
        #hide
        ε = 0.85*sqrt(235/staalsoort)
        k_f = (b - t_w - 2*r)/2/t_f/ε
        k_w = (h - 2*t_f - 2*r)/t_w/ε
        kl_f = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
        kl_w = if(werking ≡ 3; if(k_w ≤ 33; 1; if(k_w ≤ 38; 2; if(k_w ≤ 42; 3; 4))); if(k_w ≤ 72; 1; if(k_w ≤ 83; 2; if(k_w ≤ 124; 3; 4))))
        klasse = max(kl_f; kl_w)
        #show
        'Doorsnedeklasse bij brand, met ε = 0,85·√(235/f<sub>y</sub>) = 'ε' (§4.2.2): flens c/t = 'k_f'·ε, lijf c/t = 'k_w'·ε 'if(werking ≡ 3; "bij druk"; "bij buiging")' (tabel 5.2 van EN 1993-1-1) → klasse <b>'klasse'</b>.
    #else
        #hide
        klasse = 1
        #show
    #end if
    #hide
    W_y = if(klasse ≤ 2; W_pl,y; W_el,y)
    instab = if(klasse < 4 and (werking ≡ 2 or werking ≡ 3); 1; 0)
    #show
    #if klasse ≡ 4 and werking ≡ 3
        '<i>In klasse 4 is de toets θ<sub>a,t</sub> ≤ 350 °C (§4.2.3.6). Die regel gaat uit van een element dat de belasting kan dragen; daarom ook de knikweerstand bij 20 °C, met de effectieve doorsnede bij de eigenschappen van 20 °C zoals in bijlage E.</i><span class="alleen-scherm"></span>
        #hide
        ε_20 = sqrt(235/staalsoort)
        c_w = h - 2*t_f - 2*r
        λ_p,w = c_w/t_w/(28.4*ε_20*2)
        ρ_w = if(c_w/t_w ≤ 42*ε_20; 1; min(1; (λ_p,w - 0.22)/λ_p,w^2))
        #show
        ρ_w', lijf bij 20 °C (NEN-EN 1993-1-5 §4.4, ψ = 1, k<sub>σ</sub> = 4)<span class="kolom-2"></span>'
        A_eff = A - (1 - ρ_w)*c_w*t_w to cm^2', flenzen volledig<span class="kolom-2"></span>'
        α_fi = 0.65*sqrt(235 N/mm^2/f_y)', §4.2.3.2<span class="kolom-2"></span>'
        N_cr,z = π^2*E*I_z/L_fi^2 to kN', zwakke as, bij 20 °C<span class="kolom-2"></span>'
        λ_z = sqrt(A_eff*f_y/N_cr,z)', λ̄<sub>z</sub> met A<sub>eff</sub><span class="kolom-2"></span>'
        #hide
        Φ_0 = 0.5*(1 + α_fi*λ_z + λ_z^2)
        #show
        χ_fi,0 = 1/(Φ_0 + sqrt(Φ_0^2 - λ_z^2))', χ<sub>fi</sub> bij 20 °C<span class="kolom-2"></span>'
        R_fi,d,0 = χ_fi,0*A_eff*f_y/γ_M,fi to kN', (4.5) bij 20 °C met A<sub>eff</sub><span class="kolom-2"></span>'
        μ_0 = E_fi,d/R_fi,d,0', benuttingsgraad bij 20 °C<span class="kolom-2"></span>'
        #if μ_0 ≤ 1
            θ_a,cr = 350', °C, doorsnedeklasse 4 (aanbevolen waarde van §4.2.3.6)'
        #else
            θ_a,cr = 20', °C: μ<sub>0</sub> > 1, het element bezwijkt al bij normale temperatuur'
        #end if
    #else if klasse ≡ 4
        θ_a,cr = 350', °C, doorsnedeklasse 4 (aanbevolen waarde van §4.2.3.6)'
        #hide
        μ_0 = 0
        #show
    #else if werking ≡ 1 or werking ≡ 4
        #if werking ≡ 1
            #hide
            κ_1 = 1
            κ_2 = if(schema ≡ 2; 0.85; 1)
            #show
            #if verhitting ≡ 3
                #hide
                κ_1 = if(vloer ≡ 1; if(bekleed ≡ 1; 0.85; 0.7); 1)
                #show
            #end if
            κ_1', §4.2.3.3(7)<span class="alleen-scherm">: 0,7 onbekleed of 0,85 bekleed alleen bij driezijdige verhitting met een beton- of staalplaatbetonvloer aan de vierde zijde, anders 1,0</span><span class="kolom-3"></span>'
            κ_2', §4.2.3.3(8)<span class="kolom-3"></span>'
            W_y', W<sub>pl,y</sub> in klasse 1 en 2, W<sub>el,y</sub> in klasse 3<span class="kolom-3"></span>'
            R_fi,d,0 = W_y*f_y/(γ_M,fi*κ_1*κ_2) to kN*m', M<sub>fi,t,Rd</sub> bij 20 °C, (4.8) met (4.10)'
        #else
            R_fi,d,0 = A*f_y/γ_M,fi to kN', N<sub>fi,θ,Rd</sub> bij 20 °C (4.3)'
        #end if
        μ_0 = max(E_fi,d/R_fi,d,0; 0.013)', (4.23), ten minste 0,013'
        #if μ_0 ≤ 1
            θ_a,cr = 39.19*ln(1/(0.9674*μ_0^3.833) - 1) + 482', °C (4.22)'
        #else
            θ_a,cr = 20', °C: μ<sub>0</sub> > 1, het element bezwijkt al bij normale temperatuur'
        #end if
    #else
        α_fi = 0.65*sqrt(235 N/mm^2/f_y)', §4.2.3.2 en §4.2.3.3<span class="kolom-2"></span>'
        #if werking ≡ 2
            W_y', W<sub>pl,y</sub> in klasse 1 en 2, W<sub>el,y</sub> in klasse 3 (§4.2.3.4)<span class="kolom-2"></span>'
            #hide
            S_w = sqrt(E*I_w/(G*I_t)) to m
            #show
            M_cr = π*C_1/L_kip*(sqrt(1 + π^2*S_w^2*(abs(C_2)^2 + 1)/L_kip^2) + π*C_2*S_w/L_kip)*sqrt(E*I_z*G*I_t) to kN*m', bij 20 °C (bijlage NB.NB van EN 1993-1-1)'
            λ_LT = sqrt(W_y*f_y/M_cr)', λ̄<sub>LT</sub> bij 20 °C<span class="kolom-2"></span>'
            R_0 = W_y*f_y/γ_M,fi to kN*m', zonder kip<span class="kolom-2"></span>'
            #hide
            λ_20 = λ_LT
            #show
        #else
            N_cr,z = π^2*E*I_z/L_fi^2 to kN', om de zwakke as, die bij één kniklengte maatgevend is; bij 20 °C'
            λ_z = sqrt(A*f_y/N_cr,z)', λ̄<sub>z</sub> bij 20 °C<span class="kolom-2"></span>'
            R_0 = A*f_y/γ_M,fi to kN', zonder knik<span class="kolom-2"></span>'
            #hide
            λ_20 = λ_z
            #show
        #end if
        #hide
        λ_θ(θ) = λ_20*sqrt(k_y(θ)/k_E(θ))
        Φ_θ(θ) = 0.5*(1 + α_fi*λ_θ(θ) + λ_θ(θ)^2)
        χ_θ(θ) = 1/(Φ_θ(θ) + sqrt(Φ_θ(θ)^2 - λ_θ(θ)^2))
        r_fi(θ) = χ_θ(θ)*k_y(θ)
        μ_R = E_fi,d/R_0
        θ_a,cr = 20
        θ_bo = 1200
        #for j = 1 : 40
            θ_m = (θ_a,cr + θ_bo)/2
            g_m = r_fi(θ_m) ≥ μ_R
            θ_a,cr = if(g_m; θ_m; θ_a,cr)
            θ_bo = if(g_m; θ_bo; θ_m)
        #loop
        #show
        χ_fi,0 = χ_θ(20)', χ<sub>fi</sub> bij 20 °C<span class="kolom-2"></span>'
        R_fi,d,0 = χ_fi,0*R_0'<span class="kolom-2"></span>'
        μ_0 = E_fi,d/R_fi,d,0', benuttingsgraad bij 20 °C<span class="kolom-2"></span>'
        #if μ_0 ≤ 1
            θ_a,cr', °C: hier is χ<sub>fi</sub>·k<sub>y,θ</sub>·R<sub>0</sub> = E<sub>fi,d</sub>, met λ̄<sub>θ</sub> = λ̄·√(k<sub>y,θ</sub>/k<sub>E,θ</sub>) (tabel 3.1)'
        #else
            θ_a,cr', °C: μ<sub>0</sub> > 1, het element bezwijkt al bij normale temperatuur'
        #end if
    #end if

    # 6. Staaltemperatuur

    #hide
    θ_g(t) = 20 + 345*log10(8*t/60 + 1)
    c_a(θ) = if(θ < 600; 425 + 0.773*θ - 0.00169*θ^2 + 0.00000222*θ^3; if(θ < 735; 666 + 13002/(738 - θ); if(θ < 900; 545 + 17820/(θ - 731); 650)))
    #show
    #if bekleed ≡ 0
        'Onbekleed (4.25) met k<sub>sh</sub> (4.26a); ḣ<sub>net</sub> volgens NEN-EN 1991-1-2 (3.1) t/m (3.3) met α<sub>c</sub> = 25 W/m²K, ε<sub>m</sub> = 0,7, ε<sub>f</sub> = 1,0 en Φ = 1; c<sub>a</sub>(θ) volgens §3.4.1.2, ρ<sub>a</sub> = 7850 kg/m³; ISO 834-kromme (3.4) van NEN-EN 1991-1-2; stap Δt = 5 s (§4.2.5.1).
        #hide
        A_m = if(verhitting ≡ 3; 2*h + 3*b - 2*t_w; 2*h + 4*b - 2*t_w)
        A_b = if(verhitting ≡ 3; 2*h + b; 2*(h + b))
        #show
        A_m,V = A_m/A to m^-1', A<sub>m</sub>/V, omtrek zonder de afrondingen (tabel 4.2)<span class="kolom-3"></span>'
        A_b,V = A_b/A to m^-1', [A<sub>m</sub>/V]<sub>b</sub>, kastwaarde<span class="kolom-3"></span>'
        k_sh = 0.9*A_b/A_m', (4.26a)<span class="alleen-scherm">: 0,9·[A<sub>m</sub>/V]<sub>b</sub>/[A<sub>m</sub>/V], V valt weg</span><span class="kolom-3"></span>'
        #hide
        Δt = 5
        K_m = k_sh*A_m,V*(1 m)
        dθ(θ; t) = K_m/(c_a(θ)*7850)*(25*(θ_g(t) - θ) + 0.7*5.67e-8*((θ_g(t) + 273)^4 - (θ + 273)^4))*Δt
        #show
    #else
        'Bekleed (4.27) met φ (4.28); c<sub>a</sub>(θ) volgens §3.4.1.2, ρ<sub>a</sub> = 7850 kg/m³; ISO 834-kromme (3.4) van NEN-EN 1991-1-2; stap Δt = 30 s (§4.2.5.2); vocht in de bekleding verwaarloosd.
        #hide
        A_p = if(beklvorm ≡ 1; if(verhitting ≡ 3; 2*h + b; 2*(h + b)); if(verhitting ≡ 3; 2*h + 3*b - 2*t_w; 2*h + 4*b - 2*t_w))
        #show
        A_p,V = A_p/A to m^-1', A<sub>p</sub>/V (tabel 4.3)'
        #hide
        Δt = 30
        d_m = max(d_p/(1 m); 0.0001)
        K_p = lambda_p*A_p,V*(1 m)/d_m
        C_p = c_p*rho_p*d_m*A_p,V*(1 m)
        φ(θ) = C_p/(c_a(θ)*7850)
        dθ(θ; t) = max(K_p/(c_a(θ)*7850)*(θ_g(t) - θ)/(1 + φ(θ)/3)*Δt - (exp(φ(θ)/10) - 1)*(θ_g(t + Δt) - θ_g(t)); 0)
        #show
        'φ = c<sub>p</sub>·ρ<sub>p</sub>·d<sub>p</sub>·A<sub>p</sub>/V / (c<sub>a</sub>·ρ<sub>a</sub>) = 'φ(20)' bij 20 °C (4.28), in de stappen met c<sub>a</sub> bij θ<sub>a,t</sub>.
    #end if
    #hide
    n_t = eis_min*60/Δt
    θ_a,t = 20
    t_kr = 0
    #for i = 1 : n_t
        θ_a,t = min(θ_a,t + dθ(θ_a,t; (i - 1)*Δt); θ_g(i*Δt))
        t_kr = if(t_kr ≡ 0 and θ_a,t ≥ θ_a,cr; i*Δt/60; t_kr)
    #loop
    θ_g,t = θ_g(eis_min*60)
    #show
    θ_g,t', °C, gastemperatuur na de eis<span class="kolom-2"></span>'
    θ_a,t', °C, staaltemperatuur na de eis<span class="kolom-2"></span>'

    # 7. Toetsing

    #hide
    UC_θ = 0
    UC_R = 0
    #show
    #if μ_0 > 1
        '<b style="color:#b91c1c">μ<sub>0</sub> = 'μ_0' > 1: de weerstand is al bij normale temperatuur kleiner dan E<sub>fi,d</sub>.</b>
    #else
        UC_θ = θ_a,t/θ_a,cr', θ<sub>a,t</sub> ≤ θ<sub>a,cr</sub>'
    #end if
    #if instab ≡ 1
        #hide
        k_y,θ = k_y(θ_a,t)
        χ_fi,t = χ_θ(θ_a,t)
        #show
        'Bij θ<sub>a,t</sub>: k<sub>y,θ</sub> = 'k_y,θ' (tabel 3.1), λ̄<sub>θ</sub> = 'λ_θ(θ_a,t)' en χ<sub>fi</sub> = 'χ_fi,t'.
        #if werking ≡ 2
            M_b,fi,t,Rd = χ_fi,t*W_y*k_y,θ*f_y/γ_M,fi to kN*m', (4.12)'
            UC_R = E_fi,d/M_b,fi,t,Rd
        #else
            N_b,fi,t,Rd = χ_fi,t*A*k_y,θ*f_y/γ_M,fi to kN', (4.5)'
            UC_R = E_fi,d/N_b,fi,t,Rd
        #end if
    #else if μ_0 > 1 and klasse < 4
        k_y,θ = k_y(θ_a,t)', bij θ<sub>a,t</sub> (tabel 3.1)<span class="kolom-2"></span>'
        R_fi,d,t = k_y,θ*R_fi,d,0', weerstand bij θ<sub>a,t</sub><span class="kolom-2"></span>'
        UC_R = E_fi,d/R_fi,d,t
    #else if μ_0 > 1
        UC_θ = θ_a,t/350', θ<sub>a,t</sub> ≤ 350 °C (§4.2.3.6), naast μ<sub>0</sub> ≤ 1'
    #end if
    #hide
    UC_max = if(μ_0 > 1; if(klasse < 4; UC_R; max(μ_0; UC_θ)); if(instab ≡ 1; max(UC_θ; UC_R); UC_θ))
    #show
    #if t_kr > 0 and θ_a,cr > 20
        '<span style="color:#b91c1c">θ<sub>a,cr</sub> is bereikt na 't_kr' minuten.</span>
    #end if
    #if geen_E + geen_L > 0
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: vul 'if(geen_E ≡ 1; "de belasting bij brand"; "")''if(geen_E + geen_L ≡ 2; if(werking ≡ 2; ", "; " en "); "")''if(geen_L ≡ 1; if(werking ≡ 2; "de kiplengte en C<sub>1</sub>"; "de kniklengte"); "")' in → <b>het profiel voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het profiel voldoet aan R 'eis_min'</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het profiel voldoet niet aan R 'eis_min'</b></span>
    #end if

    '<i>Gelijkmatige staaltemperatuur over doorsnede en lengte, zonder vocht in de bekleding en zonder de afrondingen in de omtrek (veilige kant). Niet getoetst: dwarskracht, druk met buiging (§4.2.3.5) en de verbindingen.</i>
#else if materiaal ≡ 2
    # 4. Bescherming en inbranding

    @select bekl_h "Bescherming van het hout"
      Onbeschermd = 0
      Gipskartonplaat type A of H, één laag = 1
      Gipskartonplaat type F, één laag = 2
      Andere bescherming, t_ch en t_f zelf ingevuld = 3
    @end

    #hide
    β_n = if(gelijmd ≡ 1; 0.7; 0.8)*mm
    d_0 = 7 mm
    #show
    'Schijnbare inbrandsnelheid van 'if(gelijmd ≡ 1; "gelijmd gelamineerd"; "gezaagd")' naaldhout (tabel 3.1); d<sub>0</sub> = 7 mm (§4.2.2).
    β_n', per minuut (tabel 3.1)'
    #if bekl_h ≡ 0
        d_char,n = β_n*eis_min', (3.2), t = de eis in minuten'
        k_0 = min(eis_min/20; 1)', tabel 4.1'
        #hide
        t_ch = 0
        #show
    #else
        #if bekl_h ≤ 2
            h_p = ?*(mm)', dikte van de gipskartonplaat'
            t_ch = max(2.8*h_p/(1 mm) - 14; 0)', min, begin van inbranden achter de plaat (3.11)<span class="alleen-scherm">, bij gevulde voegen of voegen tot 2 mm</span>'
        #else
            t_ch = ?', min, begin van inbranden achter de bescherming (§3.4.3.3)'
        #end if
        #if bekl_h ≡ 1
            t_f = t_ch', min, bezwijken van de plaat (3.15)<span class="alleen-scherm">; mits de bevestiging §3.4.3.4(4) haalt</span>'
            #hide
            k_2 = 1
            #show
        #else if bekl_h ≡ 2
            t_f = ?', min, bezwijken van de plaat, uit de productgegevens (§3.4.3.1(2))'
            k_2 = 1 - 0.018*h_p/(1 mm)', (3.7)'
        #else
            t_f = ?', min, bezwijken van de bescherming'
            k_2 = ?', factor op β<sub>n</sub> tussen t<sub>ch</sub> en t<sub>f</sub> (§3.4.3.2)'
        #end if
        #if t_f < t_ch
            '<span style="color:#b91c1c">t<sub>f</sub> < t<sub>ch</sub>: gerekend met t<sub>f</sub> = t<sub>ch</sub>.</span>
            #hide
            t_f = t_ch
            #show
        #end if
        k_3 = 2', na het bezwijken van de bescherming (§3.4.3.2(4))'
        #if t_f ≤ t_ch
            t_a = min(2*t_f; 25 mm/(k_3*β_n) + t_f)', min (3.8)'
        #else
            t_a = (25 mm - (t_f - t_ch)*k_2*β_n)/(k_3*β_n) + t_f', min (3.9)'
            #hide
            t_a = max(t_a; t_f)
            #show
        #end if
        #if eis_min ≤ t_ch
            d_char,n = 0 mm', het inbranden begint pas na de eis'
        #else if eis_min ≤ t_f
            d_char,n = k_2*β_n*(eis_min - t_ch)', §3.4.3.2(1)'
        #else if eis_min ≤ t_a and t_f ≤ t_ch
            d_char,n = k_3*β_n*(eis_min - t_f)', §3.4.3.2(4)'
        #else if eis_min ≤ t_a
            d_char,n = k_2*β_n*(t_f - t_ch) + k_3*β_n*(eis_min - t_f)', §3.4.3.2(1) en (4)'
        #else if t_f ≤ t_ch
            d_char,n = k_3*β_n*(t_a - t_f) + β_n*(eis_min - t_a)', na t<sub>a</sub> weer β<sub>n</sub> (§3.4.3.2(4))'
        #else
            d_char,n = k_2*β_n*(t_f - t_ch) + k_3*β_n*(t_a - t_f) + β_n*(eis_min - t_a)', na t<sub>a</sub> weer β<sub>n</sub> (§3.4.3.2(4))'
        #end if
        #if t_ch > 20
            k_0 = min(eis_min/t_ch; 1)', §4.2.2(3): t<sub>ch</sub> > 20 min'
        #else
            k_0 = min(eis_min/20; 1)', tabel 4.1'
        #end if
    #end if
    d_ef = d_char,n + k_0*d_0', (4.1)'
    b_ef = max(b_hout - 2*d_ef; 0 mm)', aan beide zijden verhit<span class="kolom-2"></span>'
    #if verhitting ≡ 3
        h_ef = max(h_hout - d_ef; 0 mm)', aan één zijde verhit<span class="kolom-2"></span>'
    #else
        h_ef = max(h_hout - 2*d_ef; 0 mm)', aan beide zijden verhit<span class="kolom-2"></span>'
    #end if
    #hide
    geen_A = if(b_hout/(1 mm) > 0 and h_hout/(1 mm) > 0; 0; 1)
    ingebrand = if(b_ef/(1 mm) > 0 and h_ef/(1 mm) > 0; 0; 1)
    #show

    # 5. Sterkte bij brand

    #hide
    k_fi = if(gelijmd ≡ 1; 1.15; 1.25)
    #show
    k_fi', tabel 2.1<span class="kolom-3"></span>'
    k_mod,fi = 1.0', §4.2.2(5)<span class="kolom-3"></span>'
    γ_M,fi = 1.0', §2.3(1), NB<span class="kolom-3"></span>'
    #if werking_h ≤ 2
        f_m,d,fi = k_mod,fi*k_fi*f_m,k/γ_M,fi', (2.1) met (2.4)<span class="kolom-2"></span>'
        f_v,d,fi = k_mod,fi*k_fi*f_v,k/γ_M,fi'<span class="kolom-2"></span>'
    #else
        f_c,0,d,fi = k_mod,fi*k_fi*f_c,0,k/γ_M,fi', (2.1) met (2.4)<span class="kolom-2"></span>'
        f_m,d,fi = k_mod,fi*k_fi*f_m,k/γ_M,fi'<span class="kolom-2"></span>'
    #end if

    # 6. Toetsing

    #hide
    UC_m = 0
    UC_v = 0
    UC_c = 0
    #show
    #if geen_A ≡ 0 and ingebrand ≡ 1
        '<b style="color:#b91c1c">Na 'eis_min' minuten is er geen effectieve doorsnede over: b<sub>ef</sub> = 'b_ef' mm, h<sub>ef</sub> = 'h_ef' mm.</b>
    #else if geen_A ≡ 0 and werking_h ≤ 2
        W_ef = b_ef*h_ef^2/6 to mm^3'<span class="kolom-2"></span>'
        σ_m,d,fi = M_fi,d/W_ef to N/mm^2'<span class="kolom-2"></span>'
        #if werking_h ≡ 2
            #if gelijmd ≡ 1
                #hide
                G_0,05 = 540 N/mm^2
                #show
                I_z,ef = h_ef*b_ef^3/12 to mm^4'<span class="kolom-2"></span>'
                I_tor,ef = max(b_ef; h_ef)*min(b_ef; h_ef)^3/3*(1 - 0.63*min(b_ef; h_ef)/max(b_ef; h_ef)) to mm^4', rechthoek<span class="kolom-2"></span>'
                σ_m,crit = pi*sqrt(E_0,05*I_z,ef*G_0,05*I_tor,ef)/(l_ef*W_ef) to N/mm^2', (6.31) met de effectieve doorsnede, G<sub>0,05</sub> = 540 N/mm² (NEN-EN 14080)'
            #else
                σ_m,crit = 0.78*b_ef^2/(h_ef*l_ef)*E_0,05 to N/mm^2', (6.32), massief naaldhout (§6.3.3(3)), met de effectieve doorsnede'
            #end if
            λ_rel,m = sqrt(f_m,k/σ_m,crit)', (6.30)<span class="alleen-scherm">; k<sub>fi</sub> in f<sub>20</sub>, E<sub>20</sub> en G<sub>20</sub> valt weg</span>'
            #if λ_rel,m ≤ 0.75
                k_crit = 1', (6.34)'
            #else if λ_rel,m ≤ 1.4
                k_crit = 1.56 - 0.75*λ_rel,m', (6.34)'
            #else
                k_crit = 1/λ_rel,m^2', (6.34)'
            #end if
        #else
            k_crit = 1', kip verhinderd (§6.3.3(5))'
        #end if
        UC_m = σ_m,d,fi/(k_crit*f_m,d,fi)', (6.33)'
        τ_d,fi = 1.5*V_fi,d/(b_ef*h_ef) to N/mm^2', k<sub>cr</sub> = 1,0 (NB bij §6.1.7(2))'
        UC_v = τ_d,fi/f_v,d,fi', (6.13)<span class="alleen-scherm">; mag bij een rechthoekige doorsnede vervallen (§4.3.1(2)), hier toch getoetst</span>'
    #else if geen_A ≡ 0
        A_ef = b_ef*h_ef to mm^2'<span class="kolom-2"></span>'
        W_y,ef = b_ef*h_ef^2/6 to mm^3'<span class="kolom-2"></span>'
        σ_c,0,d,fi = N_fi,d/A_ef to N/mm^2'<span class="kolom-2"></span>'
        σ_m,y,d,fi = M_fi,d/W_y,ef to N/mm^2'<span class="kolom-2"></span>'
        λ_rel,y = L_fi*sqrt(12)/(π*h_ef)*sqrt(f_c,0,k/E_0,05)', (6.21) met i<sub>y</sub> = h<sub>ef</sub>/√12<span class="kolom-2"></span>'
        λ_rel,z = L_fi*sqrt(12)/(π*b_ef)*sqrt(f_c,0,k/E_0,05)', (6.22) met i<sub>z</sub> = b<sub>ef</sub>/√12<span class="kolom-2"></span>'
        #hide
        β_c = if(gelijmd ≡ 1; 0.1; 0.2)
        #show
        β_c', (6.29)<span class="kolom-3"></span>'
        k_y = 0.5*(1 + β_c*(λ_rel,y - 0.3) + λ_rel,y^2)', (6.27)<span class="kolom-3"></span>'
        k_z = 0.5*(1 + β_c*(λ_rel,z - 0.3) + λ_rel,z^2)', (6.28)<span class="kolom-3"></span>'
        k_c,y = min(1/(k_y + sqrt(k_y^2 - λ_rel,y^2)); 1)', (6.25)<span class="kolom-3"></span>'
        k_c,z = min(1/(k_z + sqrt(k_z^2 - λ_rel,z^2)); 1)', (6.26)<span class="kolom-3"></span>'
        k_m = 0.7', §6.1.6(2), rechthoekig<span class="kolom-3"></span>'
        #if λ_rel,y ≤ 0.3 and λ_rel,z ≤ 0.3
            UC_c = (σ_c,0,d,fi/f_c,0,d,fi)^2 + σ_m,y,d,fi/f_m,d,fi', (6.19); (6.20) met k<sub>m</sub> is kleiner'
        #else
            UC_623 = σ_c,0,d,fi/(k_c,y*f_c,0,d,fi) + σ_m,y,d,fi/f_m,d,fi', (6.23)'
            UC_624 = σ_c,0,d,fi/(k_c,z*f_c,0,d,fi) + k_m*σ_m,y,d,fi/f_m,d,fi', (6.24)'
            UC_c = max(UC_623; UC_624)
        #end if
    #end if
    #hide
    UC_max = if(ingebrand ≡ 1; 1/0; if(werking_h ≤ 2; max(UC_m; UC_v); UC_c))
    #show
    #if geen_A + geen_E + geen_L > 0
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: vul 'if(geen_A ≡ 1; "de afmetingen"; "")''if(geen_A ≡ 1 and geen_E + geen_L > 0; if(geen_E + geen_L ≡ 2; ", "; " en "); "")''if(geen_E ≡ 1; "de belasting bij brand"; "")''if(geen_E + geen_L ≡ 2; " en "; "")''if(geen_L ≡ 1; if(werking_h ≡ 2; "de kiplengte"; "de kniklengte"); "")' in → <b>de doorsnede voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de houten doorsnede voldoet aan R 'eis_min'</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de houten doorsnede voldoet niet aan R 'eis_min'</b></span>
    #end if

    '<i>Methode met de gereduceerde doorsnede (§4.2.2) bij de standaardbrandkromme. De hoogtefactor k<sub>h</sub> is weggelaten (veilige kant). Niet getoetst: de verbindingen (hoofdstuk 6), druk loodrecht op de vezel (mag vervallen, §4.3.1(1)), de stabiliteitsverbanden (§4.3.5) en kip van een kolom met moment.</i>
#else
    # 4. Benuttingsgraad en tabelwaarden

    #hide
    μ_fi = 0
    k_s,fi = 0
    Δa = 0 mm
    sig_open = 0
    #show
    #if heeft_μ ≡ 1
        #if element_b ≡ 1
            μ_fi = E_fi,d/N_Rd', benuttingsgraad bij brand N<sub>0Ed,fi</sub>/N<sub>Rd</sub> (§5.3.2)'
        #else
            μ_fi = E_fi,d/M_Rd', benuttingsgraad bij brand M<sub>Ed,fi</sub>/M<sub>Rd</sub>'
            k_s,fi = μ_fi/1.15', σ<sub>s,fi</sub>/f<sub>yk</sub> volgens (5.2) met γ<sub>S</sub> = 1,15<span class="alleen-scherm"> en A<sub>s,req</sub>/A<sub>s,prov</sub> ≈ M<sub>Ed</sub>/M<sub>Rd</sub> (veilige kant)</span>'
            #if μ_fi > 1
                '<b style="color:#b91c1c">μ<sub>fi</sub> > 1: de belasting bij brand is groter dan de capaciteit bij normale temperatuur.</b>
            #else if element_b ≤ 3
                '<i>De tabellen 5.5 en 5.6 horen bij θ<sub>cr</sub> = 500 °C, σ<sub>s,fi</sub>/f<sub>yk</sub> = 0,6 (§5.2(4)). Bij een andere spanning wordt a aangepast met (5.3) (§5.2(7)), met θ<sub>cr</sub> uit kromme 1 van figuur 5.1: k<sub>s</sub> = 1 − 0,4·(θ − 350)/150 tot 500 °C en 0,61 − 0,5·(θ − 500)/200 tot 700 °C (§5.2(6)); (5.3) geldt tussen 350 en 700 °C (§5.2(8)).'if(element_b ≡ 3; " Bij een doorgaande balk alleen een vergroting van a."; "")'</i><span class="alleen-scherm"></span>
                θ_cr = if(k_s,fi ≥ 0.6; 350 + 375*(1 - k_s,fi); min(500 + 400*(0.61 - k_s,fi); 700))', °C, k<sub>s</sub>(θ<sub>cr</sub>) = σ<sub>s,fi</sub>/f<sub>yk</sub>, kromme 1 van figuur 5.1<span class="alleen-scherm">, boven 700 °C begrensd op 700 °C</span>'
                #if element_b ≡ 3
                    Δa = max(0.1*(500 - θ_cr); 0)*mm', (5.3), alleen een vergroting'
                #else
                    Δa = 0.1*(500 - θ_cr)*mm', (5.3)'
                #end if
            #else if k_s,fi > 0.6
                #hide
                sig_open = 1
                #show
                '<b style="color:#b91c1c">σ<sub>s,fi</sub>/f<sub>yk</sub> = 'k_s,fi' > 0,6: tabel 5.8 hoort bij θ<sub>cr</sub> = 500 °C, σ<sub>s,fi</sub>/f<sub>yk</sub> = 0,6 (§5.2(4)), en §5.2(7) staat de aanpassing van a alleen toe bij de tabellen 5.5, 5.6 en 5.9. De brandwerendheid is met de tabel niet aangetoond.</b>
            #else
                '<i>σ<sub>s,fi</sub>/f<sub>yk</sub> ≤ 0,6: tabel 5.8 is van toepassing zonder aanpassing van a (§5.2(4)).</i><span class="alleen-scherm"></span>
            #end if
        #end if
    #end if
    #if element_b ≡ 1
        #hide
        μ_kol = if(μ_fi ≤ 0.2; 0.2; if(μ_fi ≤ 0.5; 0.5; 0.7))
        #show
        #if heeft_μ ≡ 0
            '<i>De tabelkolom volgt uit μ<sub>fi</sub>: vul onder 3 de belasting bij brand en N<sub>Rd</sub> in.</i>
        #else if μ_fi > 0.7
            '<b style="color:#b91c1c">μ<sub>fi</sub> = 'μ_fi' > 0,7 ligt buiten tabel 5.2a: methode A is hier niet toe te passen.</b>
        #else if zijde_b ≡ 2
            'Lees in tabel 5.2a bij R 'eis_min' de kolom af voor een kolom die aan één zijde is verhit.
        #else
            'Lees in tabel 5.2a bij R 'eis_min' de kolom μ<sub>fi</sub> = 'μ_kol' af, de eerste kolom van de tabel die niet kleiner is dan de berekende μ<sub>fi</sub>.
        #end if
        b_min = ?*(mm)', b<sub>min</sub> uit de tabel<span class="kolom-2"></span>'
        a_min = ?*(mm)', a uit de tabel<span class="kolom-2"></span>'
    #else if element_b ≤ 3
        'Lees in tabel 'if(element_b ≡ 2; "5.5"; "5.6")' bij R 'eis_min' een combinatie b<sub>min</sub>/a af met b<sub>min</sub> ≤ b. Bij één laag wapening vraagt de tabel voor de hoekstaven een grotere zijdelingse asafstand a<sub>sd</sub> (opmerking bij de tabel).
        b_min = ?*(mm)', b<sub>min</sub> uit de tabel<span class="kolom-2"></span>'
        a_min = ?*(mm)', a uit de tabel<span class="kolom-2"></span>'
    #else
        #if element_b ≡ 4
            'Lees in tabel 5.8 bij R 'eis_min' de kolom eenzijdig dragend af.
        #else if verhouding_b ≡ 1
            'Lees in tabel 5.8 bij R 'eis_min' de kolom tweezijdig dragend af, bij l<sub>y</sub>/l<sub>x</sub> ≤ 1,5.
        #else
            'Lees in tabel 5.8 bij R 'eis_min' de kolom tweezijdig dragend af, bij l<sub>y</sub>/l<sub>x</sub> tussen 1,5 en 2.
        #end if
        h_min = ?*(mm)', vloerdikte h<sub>s</sub> uit de tabel<span class="kolom-2"></span>'
        a_min = ?*(mm)', a uit de tabel<span class="kolom-2"></span>'
    #end if

    # 5. Toetsing

    #hide
    #if element_b ≡ 1
        b_k = min(b_beton; h_beton)
        m_min = b_min
    #else if element_b ≤ 3
        b_k = b_beton
        m_min = b_min
    #else
        b_k = h_beton
        m_min = h_min
    #end if
    geen_A = if(b_k/(1 mm) > 0 and a_hw/(1 mm) > 0; 0; 1)
    geen_T = if(m_min/(1 mm) > 0 and a_min/(1 mm) > 0; 0; 1)
    geen_K = 0
    geen_W = 0
    ok_A = 1
    UC_b = 0
    UC_a = 0
    #show
    #if element_b ≡ 1
        #hide
        geen_K = if(l_0fi/(1 m) > 0; 0; 1)
        geen_W = if(A_s/(1 mm^2) > 0; 0; 1)
        #show
        #if geen_A + geen_K + geen_W ≡ 0
            ## Toepassingsvoorwaarden van methode A — §5.3.2(2)

            l_0fi', l<sub>0,fi</sub> ≤ 3 m<span class="kolom-3"></span>'
            e_fi', e = M<sub>0Ed,fi</sub>/N<sub>0Ed,fi</sub><span class="alleen-scherm">, gelijk aan die bij normale temperatuur (opmerking 3)</span><span class="kolom-3"></span>'
            e_max = if(b_k ≥ 300 mm; 0.4; 0.15)*if(vorm_b ≡ 2; b_k; h_beton)', NB bij §5.3.2(2): 0,4·h bij een kolombreedte ≥ 300 mm, anders 0,15·h<span class="kolom-3"></span>'
            A_c = if(vorm_b ≡ 2; pi*b_k^2/4; b_beton*h_beton) to mm^2'<span class="kolom-2"></span>'
            ρ_s = A_s/A_c', A<sub>s</sub> < 0,04·A<sub>c</sub><span class="kolom-2"></span>'
            #hide
            ok_A = if(l_0fi ≤ 3 m and e_fi ≤ e_max and ρ_s < 0.04; 1; 0)
            #show
            #if l_0fi > 3 m
                '<span style="color:#b91c1c">l<sub>0,fi</sub> = 'l_0fi' m > 3 m: buiten de toepassingsvoorwaarden van methode A.</span>
            #end if
            #if e_fi > e_max
                '<span style="color:#b91c1c">e = 'e_fi' mm > e<sub>max</sub> = 'e_max' mm: buiten de toepassingsvoorwaarden van methode A.</span>
            #end if
            #if ρ_s ≥ 0.04
                '<span style="color:#b91c1c">A<sub>s</sub> = 'A_s' mm² is niet kleiner dan 0,04·A<sub>c</sub>: buiten de toepassingsvoorwaarden van methode A.</span>
            #end if
        #end if
    #end if
    #if geen_A + geen_T > 0
        '<span style="color:#b91c1c">Zonder afmetingen, asafstand en tabelwaarden is er niets te toetsen.</span>
    #else if element_b ≡ 1
        b_k', de kleinste afmeting<span class="kolom-3"></span>'
        UC_b = b_min/b_k', b ≥ b<sub>min</sub><span class="kolom-3"></span>'
        UC_a = a_min/a_hw', a ≥ a<sub>min</sub><span class="kolom-3"></span>'
    #else if element_b ≤ 3
        UC_b = b_min/b_beton', b ≥ b<sub>min</sub><span class="kolom-2"></span>'
        a_nodig = a_min + Δa', a uit de tabel met Δa (§5.2(7))<span class="kolom-2"></span>'
        UC_a = a_nodig/a_hw', a ≥ a<sub>min</sub> + Δa<span class="kolom-2"></span>'
    #else
        UC_b = h_min/h_beton', h<sub>s</sub> ≥ h<sub>s,min</sub><span class="kolom-2"></span>'
        UC_a = a_min/a_hw', a ≥ a<sub>min</sub><span class="kolom-2"></span>'
    #end if
    #hide
    UC_max = max(UC_b; UC_a)
    #show
    #hide
    'Ontbrekende invoer als opsomming "a, b en c": het scheidingsteken hangt af van
    'hoeveel er al staan (k) en hoeveel er in totaal ontbreken (n).
    n_mis = geen_A + geen_T + geen_E + geen_R + geen_K + geen_W
    sep_mis(k; n) = if(k ≡ 0; ""; if(k ≡ n - 1; " en "; ", "))
    m_1 = if(geen_A ≡ 1; "de afmetingen"; "")
    m_2 = if(geen_T ≡ 1; concat(sep_mis(geen_A; n_mis); "de tabelwaarden"); "")
    m_3 = if(geen_E ≡ 1; concat(sep_mis(geen_A + geen_T; n_mis); "de belasting bij brand"); "")
    m_4 = if(geen_R ≡ 1; concat(sep_mis(geen_A + geen_T + geen_E; n_mis); if(element_b ≡ 1; "N<sub>Rd</sub>"; "M<sub>Rd</sub>")); "")
    m_5 = if(geen_K ≡ 1; concat(sep_mis(geen_A + geen_T + geen_E + geen_R; n_mis); "de kniklengte bij brand"); "")
    m_6 = if(geen_W ≡ 1; concat(sep_mis(geen_A + geen_T + geen_E + geen_R + geen_K; n_mis); "de langswapening"); "")
    #show
    #if n_mis > 0
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: vul 'm_1''m_2''m_3''m_4''m_5''m_6' in → <b>het element voldoet niet</b></span>
    #else if element_b ≡ 1 and μ_fi > 0.7
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: μ<sub>fi</sub> > 0,7 valt buiten tabel 5.2a → <b>het element voldoet niet</b></span>
    #else if element_b ≡ 1 and ok_A ≡ 0
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: buiten de toepassingsvoorwaarden van §5.3.2(2), methode A niet toepasbaar → <b>het element voldoet niet</b></span>
    #else if element_b ≥ 4 and sig_open ≡ 1
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: σ<sub>s,fi</sub>/f<sub>yk</sub> > 0,6, tabel 5.8 niet aangetoond → <b>het element voldoet niet</b></span>
    #else if element_b ≥ 2 and μ_fi > 1
        '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: μ<sub>fi</sub> > 1, de belasting bij brand is groter dan de capaciteit bij normale temperatuur; de tabellen gaan uit van een element dat volgens NEN-EN 1992-1-1 voldoet → <b>het element voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het element voldoet aan R 'eis_min'</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het element voldoet niet aan R 'eis_min'</b></span>
    #end if

    '<i>Tabelmethode van NEN-EN 1992-1-2 bij de standaardbrandkromme; de tabelwaarden zijn invoer en horen bij de gekozen tabel, de eis en de benuttingsgraad. Niet getoetst: de overige voorwaarden bij de tabellen voor balken en vloeren (onder meer herverdeling en de bovenwapening bij doorgaande elementen, §5.6.3 en §5.7.3), afspatten en de verankering van de wapening.</i>
#end if
`;
