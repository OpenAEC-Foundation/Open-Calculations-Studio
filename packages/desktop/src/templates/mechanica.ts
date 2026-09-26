/**
 * Mechanica — één module voor het rekenwerk dat onder elke berekening ligt,
 * met bovenin een keuze:
 *
 *   (a) Doorsnedegrootheden van een samengestelde doorsnede uit ten hoogste
 *       zes delen: rechthoeken, cirkels of buizen en I- of H-profielen uit de
 *       gedeelde profieltabel (staand of liggend), elk met de plaats van zijn
 *       hart. Een homogene doorsnede, of een samengestelde met per deel een
 *       factor n = E_i/E_ref (hout-staal, beton-staal; n = −1 voor een gat).
 *       Uitkomst: A, het zwaartepunt, I_y, I_z en I_yz (Steiner, in een tabel
 *       per deel), de hoofdassen, W_el per uiterste vezel (bij een
 *       samengestelde doorsnede ook per deel), het statisch moment S op de
 *       zwaartelijn en desgewenst op een gekozen hoogte, de traagheidsstralen en
 *       bij een homogene doorsnede het plastisch weerstandsmoment met de
 *       plastische neutrale lijn. De rekenkern (doorsnede_…, in
 *       packages/core/src/doorsnede.ts) rekent de delen exact uit, een I-profiel
 *       met zijn afrondingen zoals de profieltabel.
 *   (b) Vakwerk: een standaardvakwerk met evenwijdige randen (N-vakwerk met
 *       diagonalen op trek of op druk, of een Warrenvakwerk met of zonder
 *       verticalen) of vrij ingevoerd (tot tien knopen, zeventien staven, drie
 *       opleggingen en vijf knooplasten). De staven zijn scharnierend
 *       verbonden; de rekenkern lost het op als raamwerk met scharnieren aan
 *       beide staafeinden (raamwerk(), raamwerk_R() en raamwerk_u(),
 *       packages/core/src/raamwerk.ts), zodat ook een statisch onbepaald
 *       vakwerk klopt. Uitkomst: de staafkrachten (trek of druk), de reacties
 *       en de knoopverplaatsingen, en desgewenst een snelle toets per staaf:
 *       staal op trek (6.6) en knik (6.47) met de staaflengte als kniklengte,
 *       hout op trek (6.1) en knik (6.23) met k_c.
 *   (c) Vergeetmenietjes: de standaardgevallen van een ligger op twee
 *       steunpunten, eenzijdig en tweezijdig ingeklemd en als uitkraging,
 *       onder een gelijkmatige last, een puntlast en een driehoekslast, met
 *       M, V en w voor de ingevulde waarden. De waarden komen uit de
 *       liggeroplosser (ligger(), packages/core/src/ligger.ts); de bekende
 *       formule staat ernaast, met een vinkje als beide gelijk zijn.
 *
 * Bij (a) en (c) is er geen toets: het blad eindigt zonder UC. Bij (b) met een
 * staaftoets eindigt het met de maatgevende UC.
 *
 * Assen van de doorsnede: y naar rechts, z omhoog; I_y = ∫z²·dA is het
 * traagheidsmoment voor buiging om de horizontale as. De profielen komen uit
 * de gedeelde tabel (components/calc/profielen.ts, matrix geplakt en bewaakt
 * door scripts/check-profielen.mjs).
 *
 * Voorbeelden met handberekening: scripts/check-mechanica.mjs. Geen backticks
 * in dit commentaar: de controlescripts lezen het blad van de eerste tot de
 * laatste backtick.
 */

export const mechanica = `"Mechanica — doorsnedegrootheden, vakwerk en vergeetmenietjes

'<i>Het rekenwerk onder elke berekening, in één blad: de grootheden van een samengestelde doorsnede, de staafkrachten van een vakwerk en de standaardgevallen van een ligger. De rekenkern rekent exact (de delen van de doorsnede analytisch, het vakwerk en de ligger met de verplaatsingsmethode); het blad toont de tussenstappen zoals bij een handberekening.</i><span class="alleen-scherm"></span>

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
r1(x) = round(x; 1)
r2(x) = round(x; 2)
r3(x) = round(x; 3)
'De profielen (onderdeel a en b) en de hoekstalen (onderdeel b) uit de gedeelde tabel.
'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |96; 114; 133; 152; 171; 190; 210; 230; 250; 290; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 135; 150; 160; 170; 180 |5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 14; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 15; 15; 15; 18; 18; 21 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |349.2; 606.2; 1033; 1673; 2510; 3692; 5410; 7763; 10450; 18260; 449.5; 864.4; 1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 104.2; 165.2; 245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 167.3; 317.5; 549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 51.42; 80.97; 119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |2580; 6470; 15060; 31410; 60210; 108000; 193300; 328500; 516400; 1200000; 3380; 9410; 22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
pm(p; j) = hlookup(profielen; p; 1; j)
'Hoekstaaltabel uit profielen.ts: id | h (mm) | t (mm) | r_1 (mm) | r_2 (mm) | A (cm²) | e (cm) | I_y (cm⁴) | W_el (cm³) | i_y (cm) | I_u (cm⁴) | i_u (cm) | I_v (cm⁴) | i_v (cm)
hoekstalen = [1; 2; 3; 4; 5; 6; 7; 8 |40; 45; 50; 60; 70; 80; 90; 100 |4; 5; 5; 6; 7; 8; 9; 10 |6; 7; 7; 8; 9; 10; 11; 12 |3; 3.5; 3.5; 4; 4.5; 5; 5.5; 6 |3.08; 4.3; 4.8; 6.91; 9.4; 12.3; 15.5; 19.2 |1.12; 1.28; 1.4; 1.69; 1.97; 2.26; 2.54; 2.82 |4.47; 7.84; 11; 22.8; 42.3; 72.2; 116; 177 |1.55; 2.43; 3.05; 5.29; 8.41; 12.6; 17.9; 24.6 |1.21; 1.35; 1.51; 1.82; 2.12; 2.43; 2.73; 3.04 |7.09; 12.4; 17.4; 36.1; 67.1; 115; 184; 280 |1.52; 1.7; 1.9; 2.29; 2.67; 3.06; 3.44; 3.83 |1.86; 3.25; 4.54; 9.43; 17.5; 29.9; 47.8; 73 |0.78; 0.87; 0.97; 1.17; 1.36; 1.56; 1.76; 1.95]
hl(p; j) = hlookup(hoekstalen; p; 1; j)
#show

@select taak "Wat rekent dit blad?"
  Doorsnedegrootheden van een samengestelde doorsnede = 1
  Vakwerk: staafkrachten, reacties en verplaatsingen = 2
  Vergeetmenietjes: standaardgevallen van een ligger = 3
@end

#if taak ≡ 1
    # 1. Delen van de doorsnede

    '<i>Ten hoogste zes delen, elk met de plaats van zijn hart (y naar rechts, z omhoog, vanaf een zelf gekozen oorsprong). Een profiel komt uit de profieltabel, staand (lijf verticaal) of liggend (lijf horizontaal). Laat de delen niet overlappen, of geef het overlappende deel als gat op.</i><span class="alleen-scherm"></span>
    @select samengesteld "Materiaal"
      Homogeen: alle delen van hetzelfde materiaal = 0
      Samengesteld: per deel n = E_i/E_ref, n = −1 voor een gat = 1
    @end
    #hide
    'Startwaarden van de invoer: een deel dat niet gekozen is, telt niet mee.
    b_1 = 0 mm
    h_1 = 0 mm
    D_1 = 0 mm
    t_1 = 0 mm
    prof_1 = 24
    draai_1 = 0
    y_1 = 0 mm
    z_1 = 0 mm
    n_1 = 1
    b_2 = 0 mm
    h_2 = 0 mm
    D_2 = 0 mm
    t_2 = 0 mm
    prof_2 = 24
    draai_2 = 0
    y_2 = 0 mm
    z_2 = 0 mm
    n_2 = 1
    b_3 = 0 mm
    h_3 = 0 mm
    D_3 = 0 mm
    t_3 = 0 mm
    prof_3 = 24
    draai_3 = 0
    y_3 = 0 mm
    z_3 = 0 mm
    n_3 = 1
    b_4 = 0 mm
    h_4 = 0 mm
    D_4 = 0 mm
    t_4 = 0 mm
    prof_4 = 24
    draai_4 = 0
    y_4 = 0 mm
    z_4 = 0 mm
    n_4 = 1
    b_5 = 0 mm
    h_5 = 0 mm
    D_5 = 0 mm
    t_5 = 0 mm
    prof_5 = 24
    draai_5 = 0
    y_5 = 0 mm
    z_5 = 0 mm
    n_5 = 1
    b_6 = 0 mm
    h_6 = 0 mm
    D_6 = 0 mm
    t_6 = 0 mm
    prof_6 = 24
    draai_6 = 0
    y_6 = 0 mm
    z_6 = 0 mm
    n_6 = 1
    #show
    @select vorm_1 "Deel 1"
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
      Geen = 0
    @end
    #if vorm_1 ≡ 1
        b_1 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_1 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_1 ≡ 2
        D_1 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_1 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_1 ≡ 3
        @select prof_1 "Profiel van deel 1"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_1 "Stand van deel 1"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_1 ≥ 1
        y_1 = ?*(mm)', hart van deel 1, horizontaal<span class="kolom-4"></span>'
        z_1 = ?*(mm)', hart van deel 1, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_1 = ?', n = E<sub>1</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    @select vorm_2 "Deel 2"
      Geen = 0
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
    @end
    #if vorm_2 ≡ 1
        b_2 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_2 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_2 ≡ 2
        D_2 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_2 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_2 ≡ 3
        @select prof_2 "Profiel van deel 2"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_2 "Stand van deel 2"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_2 ≥ 1
        y_2 = ?*(mm)', hart van deel 2, horizontaal<span class="kolom-4"></span>'
        z_2 = ?*(mm)', hart van deel 2, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_2 = ?', n = E<sub>2</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    @select vorm_3 "Deel 3"
      Geen = 0
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
    @end
    #if vorm_3 ≡ 1
        b_3 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_3 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_3 ≡ 2
        D_3 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_3 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_3 ≡ 3
        @select prof_3 "Profiel van deel 3"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_3 "Stand van deel 3"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_3 ≥ 1
        y_3 = ?*(mm)', hart van deel 3, horizontaal<span class="kolom-4"></span>'
        z_3 = ?*(mm)', hart van deel 3, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_3 = ?', n = E<sub>3</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    @select vorm_4 "Deel 4"
      Geen = 0
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
    @end
    #if vorm_4 ≡ 1
        b_4 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_4 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_4 ≡ 2
        D_4 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_4 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_4 ≡ 3
        @select prof_4 "Profiel van deel 4"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_4 "Stand van deel 4"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_4 ≥ 1
        y_4 = ?*(mm)', hart van deel 4, horizontaal<span class="kolom-4"></span>'
        z_4 = ?*(mm)', hart van deel 4, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_4 = ?', n = E<sub>4</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    @select vorm_5 "Deel 5"
      Geen = 0
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
    @end
    #if vorm_5 ≡ 1
        b_5 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_5 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_5 ≡ 2
        D_5 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_5 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_5 ≡ 3
        @select prof_5 "Profiel van deel 5"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_5 "Stand van deel 5"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_5 ≥ 1
        y_5 = ?*(mm)', hart van deel 5, horizontaal<span class="kolom-4"></span>'
        z_5 = ?*(mm)', hart van deel 5, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_5 = ?', n = E<sub>5</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    @select vorm_6 "Deel 6"
      Geen = 0
      Rechthoek = 1
      Cirkel of buis = 2
      Profiel uit de tabel = 3
    @end
    #if vorm_6 ≡ 1
        b_6 = ?*(mm)', breedte, in y<span class="kolom-4"></span>'
        h_6 = ?*(mm)', hoogte, in z<span class="kolom-4"></span>'
    #else if vorm_6 ≡ 2
        D_6 = ?*(mm)', buitendiameter<span class="kolom-4"></span>'
        t_6 = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = massief)</span><span class="kolom-4"></span>'
    #else if vorm_6 ≡ 3
        @select prof_6 "Profiel van deel 6"
          IPE 300 = 24
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
          IPE 330 = 25
          IPE 360 = 26
          IPE 400 = 27
        @end
        @select draai_6 "Stand van deel 6"
          Staand, lijf verticaal = 0
          Liggend, lijf horizontaal = 1
        @end
    #end if
    #if vorm_6 ≥ 1
        y_6 = ?*(mm)', hart van deel 6, horizontaal<span class="kolom-4"></span>'
        z_6 = ?*(mm)', hart van deel 6, verticaal<span class="kolom-4"></span>'
        #if samengesteld ≡ 1
            n_6 = ?', n = E<sub>6</sub>/E<sub>ref</sub><span class="kolom-4"></span>'
        #end if
    #end if
    #hide
    'Per deel een rij [soort, p1 … p5, y, z, n, draai] in mm voor de rekenkern: rechthoek b, h; cirkel D, t; profiel h, b, t_w, t_f, r.
    'n alleen bij een samengestelde doorsnede, anders 1.
    pa_1 = if(vorm_1 ≡ 1; b_1/(1 mm); if(vorm_1 ≡ 2; D_1/(1 mm); pm(prof_1; 2)))
    pb_1 = if(vorm_1 ≡ 1; h_1/(1 mm); if(vorm_1 ≡ 2; t_1/(1 mm); pm(prof_1; 3)))
    pc_1 = pm(prof_1; 4)
    pd_1 = pm(prof_1; 5)
    pe_1 = pm(prof_1; 6)
    yn_1 = y_1/(1 mm)
    zn_1 = z_1/(1 mm)
    nn_1 = if(samengesteld ≡ 1; n_1; 1)
    dr_1 = draai_1
    pa_2 = if(vorm_2 ≡ 1; b_2/(1 mm); if(vorm_2 ≡ 2; D_2/(1 mm); pm(prof_2; 2)))
    pb_2 = if(vorm_2 ≡ 1; h_2/(1 mm); if(vorm_2 ≡ 2; t_2/(1 mm); pm(prof_2; 3)))
    pc_2 = pm(prof_2; 4)
    pd_2 = pm(prof_2; 5)
    pe_2 = pm(prof_2; 6)
    yn_2 = y_2/(1 mm)
    zn_2 = z_2/(1 mm)
    nn_2 = if(samengesteld ≡ 1; n_2; 1)
    dr_2 = draai_2
    pa_3 = if(vorm_3 ≡ 1; b_3/(1 mm); if(vorm_3 ≡ 2; D_3/(1 mm); pm(prof_3; 2)))
    pb_3 = if(vorm_3 ≡ 1; h_3/(1 mm); if(vorm_3 ≡ 2; t_3/(1 mm); pm(prof_3; 3)))
    pc_3 = pm(prof_3; 4)
    pd_3 = pm(prof_3; 5)
    pe_3 = pm(prof_3; 6)
    yn_3 = y_3/(1 mm)
    zn_3 = z_3/(1 mm)
    nn_3 = if(samengesteld ≡ 1; n_3; 1)
    dr_3 = draai_3
    pa_4 = if(vorm_4 ≡ 1; b_4/(1 mm); if(vorm_4 ≡ 2; D_4/(1 mm); pm(prof_4; 2)))
    pb_4 = if(vorm_4 ≡ 1; h_4/(1 mm); if(vorm_4 ≡ 2; t_4/(1 mm); pm(prof_4; 3)))
    pc_4 = pm(prof_4; 4)
    pd_4 = pm(prof_4; 5)
    pe_4 = pm(prof_4; 6)
    yn_4 = y_4/(1 mm)
    zn_4 = z_4/(1 mm)
    nn_4 = if(samengesteld ≡ 1; n_4; 1)
    dr_4 = draai_4
    pa_5 = if(vorm_5 ≡ 1; b_5/(1 mm); if(vorm_5 ≡ 2; D_5/(1 mm); pm(prof_5; 2)))
    pb_5 = if(vorm_5 ≡ 1; h_5/(1 mm); if(vorm_5 ≡ 2; t_5/(1 mm); pm(prof_5; 3)))
    pc_5 = pm(prof_5; 4)
    pd_5 = pm(prof_5; 5)
    pe_5 = pm(prof_5; 6)
    yn_5 = y_5/(1 mm)
    zn_5 = z_5/(1 mm)
    nn_5 = if(samengesteld ≡ 1; n_5; 1)
    dr_5 = draai_5
    pa_6 = if(vorm_6 ≡ 1; b_6/(1 mm); if(vorm_6 ≡ 2; D_6/(1 mm); pm(prof_6; 2)))
    pb_6 = if(vorm_6 ≡ 1; h_6/(1 mm); if(vorm_6 ≡ 2; t_6/(1 mm); pm(prof_6; 3)))
    pc_6 = pm(prof_6; 4)
    pd_6 = pm(prof_6; 5)
    pe_6 = pm(prof_6; 6)
    yn_6 = y_6/(1 mm)
    zn_6 = z_6/(1 mm)
    nn_6 = if(samengesteld ≡ 1; n_6; 1)
    dr_6 = draai_6
    dsn = [vorm_1; vorm_2; vorm_3; vorm_4; vorm_5; vorm_6 |pa_1; pa_2; pa_3; pa_4; pa_5; pa_6 |pb_1; pb_2; pb_3; pb_4; pb_5; pb_6 |pc_1; pc_2; pc_3; pc_4; pc_5; pc_6 |pd_1; pd_2; pd_3; pd_4; pd_5; pd_6 |pe_1; pe_2; pe_3; pe_4; pe_5; pe_6 |yn_1; yn_2; yn_3; yn_4; yn_5; yn_6 |zn_1; zn_2; zn_3; zn_4; zn_5; zn_6 |nn_1; nn_2; nn_3; nn_4; nn_5; nn_6 |dr_1; dr_2; dr_3; dr_4; dr_5; dr_6]
    'De ideële doorsnede uit de rekenkern: [A, y_c, z_c, I_y, I_z, I_yz, y_min, y_max, z_min, z_max].
    G = doorsnede(dsn)
    ok_a = bool(G.(1) > 0)
    'Een deel telt mee als het een vorm heeft, maten die passen en een factor n ≠ 0.
    telt(i) = bool(dsn.(i; 1) ≥ 1)*bool(abs(doorsnede_deel(dsn; i)[1]) > 0)*bool(dsn.(i; 9) ≠ 0)
    #show
    #for i = 1 : 6
        #if dsn.(i; 1) ≥ 1
            #if telt(i) ≡ 0
                '<span style="color:#b45309">Deel 'i' telt niet mee: 'if(dsn.(i; 9) ≡ 0; "n = 0"; "vul de maten in (een buis: t kleiner dan D/2 of 0)")'.</span>
            #end if
        #end if
    #loop
    #if ok_a ≡ 0
        '<span style="color:#b45309">Vul de maten van ten minste één deel in'if(samengesteld ≡ 1; ", met een factor n > 0"; "")'; zonder dat valt er niets te rekenen.</span>
    #else
        #hide
        'Per deel i: A, I_y en I_z om het eigen hart (zonder n) uit de rekenkern, de factor n en de afstanden a tot het zwaartepunt; kale getallen in mm.
        dd(i) = doorsnede_deel(dsn; i)
        nA(i) = telt(i)*dsn.(i; 9)*dd(i)[1]
        'Statische momenten om de assen door de oorsprong (Σ n·A·z en Σ n·A·y), dan het zwaartepunt.
        SAz = nA(1)*dsn.(1; 8) + nA(2)*dsn.(2; 8) + nA(3)*dsn.(3; 8) + nA(4)*dsn.(4; 8) + nA(5)*dsn.(5; 8) + nA(6)*dsn.(6; 8)
        SAy = nA(1)*dsn.(1; 7) + nA(2)*dsn.(2; 7) + nA(3)*dsn.(3; 7) + nA(4)*dsn.(4; 7) + nA(5)*dsn.(5; 7) + nA(6)*dsn.(6; 7)
        An = nA(1) + nA(2) + nA(3) + nA(4) + nA(5) + nA(6)
        ycn = SAy/An
        zcn = SAz/An
        ay(i) = dsn.(i; 7) - ycn
        az(i) = dsn.(i; 8) - zcn
        'Steiner per deel, met n gewogen: n·I_eigen en n·A·a², in mm⁴.
        nIy(i) = telt(i)*dsn.(i; 9)*dd(i)[2]
        nIz(i) = telt(i)*dsn.(i; 9)*dd(i)[3]
        sIy(i) = nA(i)*az(i)^2
        sIz(i) = nA(i)*ay(i)^2
        sIyz(i) = nA(i)*ay(i)*az(i)
        Iyn = nIy(1) + sIy(1) + nIy(2) + sIy(2) + nIy(3) + sIy(3) + nIy(4) + sIy(4) + nIy(5) + sIy(5) + nIy(6) + sIy(6)
        Izn = nIz(1) + sIz(1) + nIz(2) + sIz(2) + nIz(3) + sIz(3) + nIz(4) + sIz(4) + nIz(5) + sIz(5) + nIz(6) + sIz(6)
        Iyzr = sIyz(1) + sIyz(2) + sIyz(3) + sIyz(4) + sIyz(5) + sIyz(6)
        'Afrondingsruis weg: een deviatiemoment van 10⁻⁹ maal I is nul.
        Iyzn = if(abs(Iyzr) ≤ 10^-9*max(abs(Iyn); abs(Izn)); 0; Iyzr)
        nul(x; s) = if(abs(x) ≤ 10^-9*s; 0; x)
        A = An*mm^2 to cm^2
        S_y0 = SAz*mm^3 to cm^3
        S_z0 = SAy*mm^3 to cm^3
        I_y = Iyn*mm^4 to cm^4
        I_z = Izn*mm^4 to cm^4
        I_yz = Iyzn*mm^4 to cm^4
        'Hoofdassen: α is de hoek van hoofdas 1 (het grootste traagheidsmoment) met de y-as, linksom positief.
        ask = bool(abs(Iyzn) > 10^-6*max(abs(Iyn); abs(Izn)))
        rond = bool(ask ≡ 0)*bool(abs(Iyn - Izn) ≤ 10^-9*max(abs(Iyn); abs(Izn)))
        α_1 = 0.5*atan2(-2*Iyzn; Iyn - Izn)*180/pi*deg
        'Plaats van de uiterste vezels (de delen met materiaal) ten opzichte van het zwaartepunt.
        e_b = (G.(10) - zcn)*mm
        e_o = (zcn - G.(9))*mm
        e_r = (G.(8) - ycn)*mm
        e_l = (ycn - G.(7))*mm
        'Homogeen: alle delen met n = 1, of een gat met n = −1.
        hom(i) = if(telt(i) ≡ 1; bool(dsn.(i; 9) ≡ 1 or dsn.(i; 9) ≡ -1); 1)
        homogeen = hom(1)*hom(2)*hom(3)*hom(4)*hom(5)*hom(6)
        PL1 = doorsnede_pl(dsn; 1)
        PL2 = doorsnede_pl(dsn; 2)
        'Tekening: de doorsnede over ten hoogste 300 × 220 px, midden in een vlak van 480 px breed.
        bY = max(G.(8) - G.(7); 10^-6)
        bZ = max(G.(10) - G.(9); 10^-6)
        sc = min(300/bY; 220/bZ)
        gX(y) = 240 - sc*bY/2 + sc*(y - G.(7))
        gY(z) = 30 + sc*(G.(10) - z)
        x0 = gX(0)
        y0 = gY(0)
        sH = 30 + sc*bZ + 30
        kleurN(n) = if(n < 0; "#ffffff"; if(n > 1.0001; "#93c5fd"; if(n < 0.9999; "#fde68a"; "#d1d5db")))
        Xc = gX(ycn)
        Yc = gY(zcn)
        'De assen blijven binnen de tekening: de hoofdassen niet verder dan de ruimte boven en onder het zwaartepunt.
        La = max(min(0.5*sc*max(bY; bZ) + 20; Yc - 16; sH - Yc - 12); 20)
        ca = cos(α_1)
        sa = sin(α_1)
        'Buis: massief als t = 0 of t ≥ D/2.
        buis(i) = bool(dsn.(i; 3) > 0)*bool(dsn.(i; 3) < dsn.(i; 2)/2)
        #show
        '<svg viewbox="0 0 480 'sH'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'sH + 16'px;">
        #for k = 1 : 2
            #for i = 1 : 6
                #if telt(i) ≡ 1
                    #if (k ≡ 1 and dsn.(i; 9) > 0) or (k ≡ 2 and dsn.(i; 9) < 0)
                        #if dsn.(i; 1) ≡ 1
                            '<rect x="'gX(dsn.(i; 7) - dsn.(i; 2)/2)'" y="'gY(dsn.(i; 8) + dsn.(i; 3)/2)'" width="'sc*dsn.(i; 2)'" height="'sc*dsn.(i; 3)'" style="fill:'kleurN(dsn.(i; 9))'; stroke:#374151; stroke-width:1'if(k ≡ 2; "; stroke-dasharray:4 2"; "")'"/>
                        #else if dsn.(i; 1) ≡ 2
                            #if buis(i) ≡ 1
                                '<circle cx="'gX(dsn.(i; 7))'" cy="'gY(dsn.(i; 8))'" r="'sc*(dsn.(i; 2) - dsn.(i; 3))/2'" style="fill:none; stroke:'kleurN(dsn.(i; 9))'; stroke-width:'sc*dsn.(i; 3)'"/>
                                '<circle cx="'gX(dsn.(i; 7))'" cy="'gY(dsn.(i; 8))'" r="'sc*dsn.(i; 2)/2 - sc*dsn.(i; 3)'" style="fill:none; stroke:#374151; stroke-width:1'if(k ≡ 2; "; stroke-dasharray:4 2"; "")'"/>
                            #end if
                            '<circle cx="'gX(dsn.(i; 7))'" cy="'gY(dsn.(i; 8))'" r="'sc*dsn.(i; 2)/2'" style="fill:'if(buis(i) ≡ 1; "none"; kleurN(dsn.(i; 9)))'; stroke:#374151; stroke-width:1'if(k ≡ 2; "; stroke-dasharray:4 2"; "")'"/>
                        #else
                            '<polygon points="'doorsnede_svg(dsn; i; x0; y0; sc)'" style="fill:'kleurN(dsn.(i; 9))'; stroke:#374151; stroke-width:1; stroke-linejoin:round'if(k ≡ 2; "; stroke-dasharray:4 2"; "")'"/>
                        #end if
                    #end if
                #end if
            #loop
        #loop
        '<line x1="'gX(G.(7)) - 25'" y1="'Yc'" x2="'gX(G.(8)) + 25'" y2="'Yc'" style="stroke:#1e40af; stroke-width:1; stroke-dasharray:6 3"/>
        '<line x1="'Xc'" y1="'sH - 8'" x2="'Xc'" y2="14" style="stroke:#1e40af; stroke-width:1; stroke-dasharray:6 3"/>
        '<text x="'gX(G.(8)) + 29'" y="'Yc + 4'" style="fill:#1e40af; font-weight:700">y</text>
        '<text x="'Xc + 4'" y="12" style="fill:#1e40af; font-weight:700">z</text>
        #if ask ≡ 1
            '<line x1="'Xc - La*ca'" y1="'Yc + La*sa'" x2="'Xc + La*ca'" y2="'Yc - La*sa'" style="stroke:#b91c1c; stroke-width:1; stroke-dasharray:10 3 2 3"/>
            '<line x1="'Xc + La*sa'" y1="'Yc + La*ca'" x2="'Xc - La*sa'" y2="'Yc - La*ca'" style="stroke:#b91c1c; stroke-width:1; stroke-dasharray:10 3 2 3"/>
            '<text x="'Xc + (La + 8)*ca'" y="'Yc - (La + 8)*sa + 4'" text-anchor="middle" style="fill:#b91c1c; font-weight:700">1</text>
            '<text x="'Xc - (La + 8)*sa'" y="'Yc - (La + 8)*ca + 4'" text-anchor="middle" style="fill:#b91c1c; font-weight:700">2</text>
        #end if
        #if homogeen ≡ 1
            #if abs(PL1[2] - zcn) > 0.005*bZ
                '<line x1="'gX(G.(7)) - 12'" y1="'gY(PL1[2])'" x2="'gX(G.(8)) + 12'" y2="'gY(PL1[2])'" style="stroke:#047857; stroke-width:1; stroke-dasharray:2 2"/>
                '<text x="'gX(G.(7)) - 14'" y="'gY(PL1[2]) + 4'" text-anchor="end" style="fill:#047857">pnl</text>
            #end if
        #end if
        #for i = 1 : 6
            #if telt(i) ≡ 1
                '<text x="'gX(dsn.(i; 7)) + 3'" y="'gY(dsn.(i; 8)) - 3'" style="fill:#374151; font-size:9px">'i'</text>
            #end if
        #loop
        '<circle cx="'Xc'" cy="'Yc'" r="4" style="fill:#ffffff; stroke:#1e40af; stroke-width:1.5"/>
        '<circle cx="'Xc'" cy="'Yc'" r="1.5" style="fill:#1e40af"/>
        '<text x="'Xc - 6'" y="'Yc - 6'" text-anchor="end" style="fill:#1e40af; paint-order:stroke; stroke:#ffffff; stroke-width:3px">zwaartepunt</text>
        '</svg>'
        '<span class="alleen-scherm">Grijs: n = 1, blauw: n > 1 (stijver dan het referentiemateriaal), geel: n &lt; 1, wit gestreept: een gat. Blauw gestreept de assen door het zwaartepunt, rood de hoofdassen 1 en 2 (alleen als ze afwijken van y en z), groen gestippeld de plastische neutrale lijn (pnl) bij buiging om de y-as.</span>

        # 2. Zwaartepunt

        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Deel</th><th style="padding:1px 4px; text-align:left;">vorm</th><th style="padding:1px 4px; text-align:right;">n</th><th style="padding:1px 4px; text-align:right;">A [cm²]</th><th style="padding:1px 4px; text-align:right;">n·A [cm²]</th><th style="padding:1px 4px; text-align:right;">y [mm]</th><th style="padding:1px 4px; text-align:right;">z [mm]</th><th style="padding:1px 4px; text-align:right;">n·A·y [cm³]</th><th style="padding:1px 4px; text-align:right;">n·A·z [cm³]</th></tr>
        #for i = 1 : 6
            #if telt(i) ≡ 1
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'i'</td><td style="padding:0 4px;">'if(dsn.(i; 1) ≡ 1; "rechthoek"; if(dsn.(i; 1) ≡ 2; if(buis(i) ≡ 1; "buis"; "cirkel"); if(dsn.(i; 10) ≡ 1; "profiel, liggend"; "profiel, staand")))'</td><td style="padding:0 4px; text-align:right;">'dsn.(i; 9)'</td><td style="padding:0 4px; text-align:right;">'dd(i)[1]/100'</td><td style="padding:0 4px; text-align:right;">'nA(i)/100'</td><td style="padding:0 4px; text-align:right;">'dsn.(i; 7)'</td><td style="padding:0 4px; text-align:right;">'dsn.(i; 8)'</td><td style="padding:0 4px; text-align:right;">'nul(nA(i)*dsn.(i; 7)/1000; 10^-6)'</td><td style="padding:0 4px; text-align:right;">'nul(nA(i)*dsn.(i; 8)/1000; 10^-6)'</td></tr>
            #end if
        #loop
        '<tr style="border-top:1.5px solid #374151;"><td style="padding:0 4px;">Σ</td><td></td><td></td><td></td><td style="padding:0 4px; text-align:right;">'An/100'</td><td></td><td></td><td style="padding:0 4px; text-align:right;">'nul(SAy/1000; 10^-6)'</td><td style="padding:0 4px; text-align:right;">'nul(SAz/1000; 10^-6)'</td></tr>
        '</table>
        #if samengesteld ≡ 1
            '<i>Ideële doorsnede: elk deel telt met n = E<sub>i</sub>/E<sub>ref</sub>. A, S en I gelden voor het referentiemateriaal; de stijfheid is E<sub>ref</sub>·A en E<sub>ref</sub>·I.</i><span class="alleen-scherm"></span>
            A'<span class="alleen-scherm">, Σ n·A, ideëel</span><span class="kolom-3"></span>'
        #else
            A'<span class="alleen-scherm">, Σ A</span><span class="kolom-3"></span>'
        #end if
        S_y0'<span class="alleen-scherm">, Σ n·A·z, om de y-as door de oorsprong</span><span class="kolom-3"></span>'
        S_z0'<span class="alleen-scherm">, Σ n·A·y, om de z-as door de oorsprong</span><span class="kolom-3"></span>'
        y_c = S_z0/A to mm'<span class="kolom-2"></span>'
        z_c = S_y0/A to mm'<span class="kolom-2"></span>'

        # 3. Traagheidsmomenten

        '<i>Om de assen door het zwaartepunt, met de verschuivingsregel van Steiner: I = Σ n·(I<sub>eigen</sub> + A·a²), met a de afstand van het hart van het deel tot het zwaartepunt; het deviatiemoment I<sub>yz</sub> = Σ n·A·a<sub>y</sub>·a<sub>z</sub> (elk deel is dubbelsymmetrisch, zijn eigen deviatiemoment is nul). Een profiel telt met zijn afrondingen, zoals in de profieltabel.</i><span class="alleen-scherm"></span>
        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Deel</th><th style="padding:1px 4px; text-align:right;">a<sub>y</sub> [mm]</th><th style="padding:1px 4px; text-align:right;">a<sub>z</sub> [mm]</th><th style="padding:1px 4px; text-align:right;">n·I<sub>y,eigen</sub></th><th style="padding:1px 4px; text-align:right;">n·A·a<sub>z</sub>²</th><th style="padding:1px 4px; text-align:right;">n·I<sub>z,eigen</sub></th><th style="padding:1px 4px; text-align:right;">n·A·a<sub>y</sub>²</th><th style="padding:1px 4px; text-align:right;">n·A·a<sub>y</sub>·a<sub>z</sub> [cm⁴]</th></tr>
        #for i = 1 : 6
            #if telt(i) ≡ 1
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'i'</td><td style="padding:0 4px; text-align:right;">'nul(ay(i); bY)'</td><td style="padding:0 4px; text-align:right;">'nul(az(i); bZ)'</td><td style="padding:0 4px; text-align:right;">'nIy(i)/10^4'</td><td style="padding:0 4px; text-align:right;">'nul(sIy(i); Iyn)/10^4'</td><td style="padding:0 4px; text-align:right;">'nIz(i)/10^4'</td><td style="padding:0 4px; text-align:right;">'nul(sIz(i); Izn)/10^4'</td><td style="padding:0 4px; text-align:right;">'nul(sIyz(i); max(Iyn; Izn))/10^4'</td></tr>
            #end if
        #loop
        '</table>
        I_y'<span class="alleen-scherm">, Σ n·(I<sub>y,eigen</sub> + A·a<sub>z</sub>²)</span><span class="kolom-3"></span>'
        I_z'<span class="alleen-scherm">, Σ n·(I<sub>z,eigen</sub> + A·a<sub>y</sub>²)</span><span class="kolom-3"></span>'
        I_yz'<span class="alleen-scherm">, Σ n·A·a<sub>y</sub>·a<sub>z</sub></span><span class="kolom-3"></span>'

        # 4. Hoofdassen

        #if ask ≡ 0
            #if rond ≡ 1
                'I<sub>yz</sub> = 0 en I<sub>y</sub> = I<sub>z</sub>: elke as door het zwaartepunt is een hoofdas, met I<sub>1</sub> = I<sub>2</sub> = 'I_y' cm⁴.
            #else if Iyn ≥ Izn
                'I<sub>yz</sub> = 0: de y- en de z-as zijn de hoofdassen, I<sub>1</sub> = I<sub>y</sub> en I<sub>2</sub> = I<sub>z</sub> (α = 0°).
            #else
                'I<sub>yz</sub> = 0: de y- en de z-as zijn de hoofdassen, I<sub>1</sub> = I<sub>z</sub> en I<sub>2</sub> = I<sub>y</sub> (α = 90°).
            #end if
        #else
            I_1 = (I_y + I_z)/2 + sqrt(((I_y - I_z)/2)^2 + I_yz^2)'<span class="kolom-2"></span>'
            I_2 = (I_y + I_z)/2 - sqrt(((I_y - I_z)/2)^2 + I_yz^2)'<span class="kolom-2"></span>'
            α_1'<span class="alleen-scherm">, hoek van hoofdas 1 met de y-as, linksom positief: tan 2α = −2·I<sub>yz</sub>/(I<sub>y</sub> − I<sub>z</sub>)</span><span class="kolom-2"></span>'
            'Hoofdas 2 staat loodrecht op hoofdas 1. Buiging om een as die geen hoofdas is, geeft ook een verplaatsing loodrecht op het vlak van de belasting (scheve buiging).<span class="alleen-scherm"></span>
        #end if

        # 5. Weerstandsmomenten en traagheidsstralen

        e_b'<span class="alleen-scherm">, zwaartepunt tot de bovenste vezel</span><span class="kolom-4"></span>'
        e_o'<span class="alleen-scherm">, tot de onderste vezel</span><span class="kolom-4"></span>'
        e_r'<span class="alleen-scherm">, tot de rechter vezel</span><span class="kolom-4"></span>'
        e_l'<span class="alleen-scherm">, tot de linker vezel</span><span class="kolom-4"></span>'
        W_el,y,b = I_y/max(e_b; 10^-6 mm) to cm^3'<span class="kolom-2"></span>'
        W_el,y,o = I_y/max(e_o; 10^-6 mm) to cm^3'<span class="kolom-2"></span>'
        W_el,z,r = I_z/max(e_r; 10^-6 mm) to cm^3'<span class="kolom-2"></span>'
        W_el,z,l = I_z/max(e_l; 10^-6 mm) to cm^3'<span class="kolom-2"></span>'
        i_y = sqrt(I_y/A) to mm'<span class="kolom-2"></span>'
        i_z = sqrt(I_z/A) to mm'<span class="kolom-2"></span>'
        #if ask ≡ 1
            i_2 = sqrt(I_2/A) to mm'<span class="alleen-scherm">, om de zwakke hoofdas (knik)</span><span class="kolom-2"></span>'
        #end if
        #if samengesteld ≡ 1
            '<i>Spanning bij buiging om de y-as: σ = n·M·a/I<sub>y</sub> met a de afstand tot het zwaartepunt; in de uiterste vezel van deel i dus σ = M/W<sub>i</sub> met W<sub>i</sub> = I<sub>y</sub>/(n<sub>i</sub>·e<sub>i</sub>). W<sub>el,y</sub> hierboven geldt voor het referentiemateriaal (n = 1).</i><span class="alleen-scherm"></span>
            '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25;">
            '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 6px; text-align:left;">Deel</th><th style="padding:1px 6px; text-align:right;">n</th><th style="padding:1px 6px; text-align:right;">bovenrand − z<sub>c</sub> [mm]</th><th style="padding:1px 6px; text-align:right;">onderrand − z<sub>c</sub> [mm]</th><th style="padding:1px 6px; text-align:right;">W<sub>i</sub> = I<sub>y</sub>/(n·e<sub>max</sub>) [cm³]</th></tr>
            #for i = 1 : 6
                #if telt(i) ≡ 1
                    #if dsn.(i; 9) > 0
                        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 6px;">'i'</td><td style="padding:0 6px; text-align:right;">'dsn.(i; 9)'</td><td style="padding:0 6px; text-align:right;">'nul(dd(i)[7] - zcn; bZ)'</td><td style="padding:0 6px; text-align:right;">'nul(dd(i)[6] - zcn; bZ)'</td><td style="padding:0 6px; text-align:right;">'Iyn/(dsn.(i; 9)*max(abs(dd(i)[7] - zcn); abs(dd(i)[6] - zcn); 10^-6))/1000'</td></tr>
                    #end if
                #end if
            #loop
            '</table>
        #end if

        # 6. Statisch moment

        #hide
        SS1 = doorsnede_S(dsn; 1; zcn)
        SS2 = doorsnede_S(dsn; 2; ycn)
        S_y,max = SS1[1]*mm^3 to cm^3
        b_0 = SS1[2]*mm
        S_z,max = SS2[1]*mm^3 to cm^3
        h_0 = SS2[2]*mm
        #show
        '<i>Het statisch moment van het deel van de doorsnede voorbij een snede, om de zwaartelijn'if(samengesteld ≡ 1; ", met n gewogen"; "")'. De schuifspanning door een dwarskracht is τ = V·S/(I·b), met b de breedte in de snede; op de zwaartelijn is S het grootst.</i><span class="alleen-scherm"></span>
        S_y,max'<span class="alleen-scherm">, boven de zwaartelijn, bij buiging om de y-as</span><span class="kolom-2"></span>'
        b_0'<span class="alleen-scherm">, breedte op de zwaartelijn</span><span class="kolom-2"></span>'
        S_z,max'<span class="alleen-scherm">, rechts van de verticale zwaartelijn, bij buiging om de z-as</span><span class="kolom-2"></span>'
        h_0'<span class="alleen-scherm">, hoogte op de verticale zwaartelijn</span><span class="kolom-2"></span>'
        @select S_snede "Statisch moment ook in een horizontale snede op hoogte z_S"
          Nee = 0
          Ja = 1
        @end
        #if S_snede ≡ 1
            z_S = ?*(mm)', hoogte van de snede, in de maten van de invoer<span class="kolom-3"></span>'
            #hide
            SS3 = doorsnede_S(dsn; 1; z_S/(1 mm))
            S_y,snede = SS3[1]*mm^3 to cm^3
            b_S = SS3[2]*mm
            #show
            S_y,snede'<span class="alleen-scherm">, van het deel boven de snede, om de zwaartelijn</span><span class="kolom-3"></span>'
            b_S'<span class="alleen-scherm">, breedte in de snede (bij een sprong de kleinste)</span><span class="kolom-3"></span>'
        #end if

        # 7. Plastisch weerstandsmoment

        #if homogeen ≡ 1
            #hide
            z_pl = nul(PL1[2]; bZ)*mm
            y_pl = nul(PL2[2]; bY)*mm
            W_pl,y = PL1[1]*mm^3 to cm^3
            W_pl,z = PL2[1]*mm^3 to cm^3
            #show
            '<i>Homogene doorsnede, volledig plastisch: de plastische neutrale lijn deelt het oppervlak in twee gelijke helften, W<sub>pl</sub> = ∫|a|·dA met a de afstand tot die lijn (de som van de statische momenten van beide helften).</i><span class="alleen-scherm"></span>
            z_pl'<span class="alleen-scherm">, plastische neutrale lijn bij buiging om de y-as (horizontaal)</span><span class="kolom-2"></span>'
            y_pl'<span class="alleen-scherm">, bij buiging om de z-as (verticaal)</span><span class="kolom-2"></span>'
            W_pl,y'<span class="kolom-2"></span>'
            W_pl,z'<span class="kolom-2"></span>'
            α_pl,y = W_pl,y/min(W_el,y,b; W_el,y,o)'<span class="alleen-scherm">, vormfactor</span><span class="kolom-2"></span>'
            α_pl,z = W_pl,z/min(W_el,z,r; W_el,z,l)'<span class="alleen-scherm">, vormfactor</span><span class="kolom-2"></span>'
        #else
            'Het plastisch weerstandsmoment geldt alleen voor een homogene doorsnede (alle delen n = 1, een gat n = −1); bij een samengestelde doorsnede hangt het af van de sterkte van elk materiaal en valt het buiten dit blad.
        #end if

        '<i>Geen toets: dit blad geeft de grootheden van de doorsnede, geen oordeel.</i>
    #end if
#else if taak ≡ 2
    # 1. Vakwerk

    '<i>De staven zijn in de knopen scharnierend verbonden en de lasten grijpen in de knopen aan: elke staaf draagt alleen een normaalkracht. De rekenkern lost het vakwerk op als raamwerk met een scharnier aan beide staafeinden (verplaatsingsmethode, exact binnen de lineaire theorie), zodat ook een statisch onbepaald vakwerk klopt; de verdeling hangt dan af van EA. Eigen gewicht van de staven telt niet mee.</i><span class="alleen-scherm"></span>
    @select invoer_v "Vakwerk"
      Standaardvakwerk met evenwijdige randen = 1
      Vrij invoeren: knopen, staven, opleggingen en knooplasten = 2
    @end
    #if invoer_v ≡ 1
        @select vorm_v "Vorm"
          N-vakwerk, diagonalen naar het midden dalend (op trek) = 1
          N-vakwerk, diagonalen naar het midden stijgend (op druk) = 2
          Warrenvakwerk met verticalen = 3
          Warrenvakwerk zonder verticalen = 4
        @end
        @select n_v "Aantal velden"
          4 = 4
          2 = 2
          3 = 3
          5 = 5
          6 = 6
          7 = 7
          8 = 8
        @end
        L_v = ?*(m)', overspanning, hart op hart van de opleggingen<span class="kolom-3"></span>'
        h_v = ?*(m)', hoogte, hart op hart van de randen<span class="kolom-3"></span>'
        F_b = ?*(kN)', last per knoop van de bovenrand, naar beneden<span class="alleen-scherm"> (bij verticalen de eindknopen de helft)</span><span class="kolom-3"></span>'
        F_o = ?*(kN)', last per tussenknoop van de onderrand, naar beneden<span class="kolom-3"></span>'
        H_v = ?*(kN)', horizontale last in de linker bovenknoop, naar rechts<span class="kolom-3"></span>'
        #hide
        nv = n_v
        Lv = max(L_v/(1 m); 0)
        hv = max(h_v/(1 m); 0)
        av = Lv/nv
        vert = bool(vorm_v ≤ 3)
        'Knopen: 1 … n + 1 de onderrand van links naar rechts, daarna de bovenrand; zonder verticalen staan de bovenknopen boven het midden van een veld.
        nB = nv + 1
        nT = if(vert ≡ 1; nv + 1; nv)
        nK = nB + nT
        nS = if(vert ≡ 1; 4*nv + 1; 4*nv - 1)
        T(p) = nB + p
        gx(k) = bool(k ≤ nK)*if(k ≤ nB; (k - 1)*av; if(vert ≡ 1; (k - nB - 1)*av; (k - nB - 0.5)*av))
        gy(k) = bool(k ≤ nK)*if(k ≤ nB; 0; hv)
        'Staven: de onderrand, de bovenrand, de verticalen, dan de diagonalen per veld p. N-vakwerk op trek: in de linkerhelft van boven buiten naar onder binnen; op druk andersom; Warren: afwisselend.
        dI(p) = if(vorm_v ≡ 1; if(p ≤ nv/2; T(p); p); if(vorm_v ≡ 2; if(p ≤ nv/2; p; T(p)); if(mod(p; 2) ≡ 1; p; T(p))))
        dJ(p) = if(vorm_v ≡ 1; if(p ≤ nv/2; p + 1; T(p + 1)); if(vorm_v ≡ 2; if(p ≤ nv/2; T(p + 1); p + 1); if(mod(p; 2) ≡ 1; T(p + 1); p + 1)))
        wI(q) = if(mod(q; 2) ≡ 1; ceil(q/2); T(ceil(q/2)))
        wJ(q) = if(mod(q; 2) ≡ 1; T(ceil(q/2)); ceil(q/2) + 1)
        si(nr) = if(nr > nS; 0; if(nr ≤ nv; nr; if(vert ≡ 1; if(nr ≤ 2*nv; T(nr - nv); if(nr ≤ 3*nv + 1; nr - 2*nv; dI(nr - 3*nv - 1))); if(nr ≤ 2*nv - 1; T(nr - nv); wI(nr - 2*nv + 1)))))
        sj(nr) = if(nr > nS; 0; if(nr ≤ nv; nr + 1; if(vert ≡ 1; if(nr ≤ 2*nv; T(nr - nv + 1); if(nr ≤ 3*nv + 1; T(nr - 2*nv); dJ(nr - 3*nv - 1))); if(nr ≤ 2*nv - 1; T(nr - nv + 1); wJ(nr - 2*nv + 1)))))
        'Soort per staaf: 1 onderrand, 2 bovenrand, 3 verticaal, 4 diagonaal.
        srt(nr) = if(nr ≤ nv; 1; if(vert ≡ 1; if(nr ≤ 2*nv; 2; if(nr ≤ 3*nv + 1; 3; 4)); if(nr ≤ 2*nv - 1; 2; 4)))
        kn = [gx(1); gx(2); gx(3); gx(4); gx(5); gx(6); gx(7); gx(8); gx(9); gx(10); gx(11); gx(12); gx(13); gx(14); gx(15); gx(16); gx(17); gx(18) |gy(1); gy(2); gy(3); gy(4); gy(5); gy(6); gy(7); gy(8); gy(9); gy(10); gy(11); gy(12); gy(13); gy(14); gy(15); gy(16); gy(17); gy(18)]
        'Opleggingen: links een vast scharnier, rechts een rol (verticaal gesteund).
        opl = [1; nB |1; 0 |1; 1 |0; 0]
        'Knooplasten, rijen [knoop, 3, 0, 0, F, 0, richting]: 1 … 9 de bovenrand, 10 … 16 de tussenknopen van de onderrand, 17 de horizontale last.
        Fbn = F_b/(1 kN)
        Fon = F_o/(1 kN)
        Hvn = H_v/(1 kN)
        lk(q) = if(q ≤ 9; if(q ≤ nT; T(q); 0); if(q ≤ 16; if(q - 9 ≤ nv - 1; q - 8; 0); T(1)))
        lf(q) = if(q ≤ 9; Fbn*if(vert ≡ 1 and (q ≡ 1 or q ≡ nT); 0.5; 1); if(q ≤ 16; Fon; Hvn))
        lr(q) = if(q ≤ 16; 2; 1)
        last = [lk(1); lk(2); lk(3); lk(4); lk(5); lk(6); lk(7); lk(8); lk(9); lk(10); lk(11); lk(12); lk(13); lk(14); lk(15); lk(16); lk(17) |3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |lf(1); lf(2); lf(3); lf(4); lf(5); lf(6); lf(7); lf(8); lf(9); lf(10); lf(11); lf(12); lf(13); lf(14); lf(15); lf(16); lf(17) |0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |lr(1); lr(2); lr(3); lr(4); lr(5); lr(6); lr(7); lr(8); lr(9); lr(10); lr(11); lr(12); lr(13); lr(14); lr(15); lr(16); lr(17)]
        ok_v = bool(Lv > 0)*bool(hv > 0)
        #show
    #else
        #hide
        'Startwaarden van de invoer: wat niet gevraagd is, telt niet mee.
        x_K1 = 0 m
        y_K1 = 0 m
        x_K2 = 0 m
        y_K2 = 0 m
        x_K3 = 0 m
        y_K3 = 0 m
        x_K4 = 0 m
        y_K4 = 0 m
        x_K5 = 0 m
        y_K5 = 0 m
        x_K6 = 0 m
        y_K6 = 0 m
        x_K7 = 0 m
        y_K7 = 0 m
        x_K8 = 0 m
        y_K8 = 0 m
        x_K9 = 0 m
        y_K9 = 0 m
        x_K10 = 0 m
        y_K10 = 0 m
        i_S1 = 0
        j_S1 = 0
        i_S2 = 0
        j_S2 = 0
        i_S3 = 0
        j_S3 = 0
        i_S4 = 0
        j_S4 = 0
        i_S5 = 0
        j_S5 = 0
        i_S6 = 0
        j_S6 = 0
        i_S7 = 0
        j_S7 = 0
        i_S8 = 0
        j_S8 = 0
        i_S9 = 0
        j_S9 = 0
        i_S10 = 0
        j_S10 = 0
        i_S11 = 0
        j_S11 = 0
        i_S12 = 0
        j_S12 = 0
        i_S13 = 0
        j_S13 = 0
        i_S14 = 0
        j_S14 = 0
        i_S15 = 0
        j_S15 = 0
        i_S16 = 0
        j_S16 = 0
        i_S17 = 0
        j_S17 = 0
        k_O1 = 0
        s_O1 = 3
        k_O2 = 0
        s_O2 = 3
        k_O3 = 0
        s_O3 = 3
        k_F1 = 0
        F_h1 = 0 kN
        F_v1 = 0 kN
        k_F2 = 0
        F_h2 = 0 kN
        F_v2 = 0 kN
        k_F3 = 0
        F_h3 = 0 kN
        F_v3 = 0 kN
        k_F4 = 0
        F_h4 = 0 kN
        F_v4 = 0 kN
        k_F5 = 0
        F_h5 = 0 kN
        F_v5 = 0 kN
        #show
        '<i>Knopen in m (x naar rechts, y omhoog), staven van knoop i naar knoop j, opleggingen en knooplasten per knoop (horizontaal naar rechts positief, verticaal naar beneden positief).</i><span class="alleen-scherm"></span>
        @select n_K "Aantal knopen"
          4 = 4
          3 = 3
          5 = 5
          6 = 6
          7 = 7
          8 = 8
          9 = 9
          10 = 10
        @end
        x_K1 = ?*(m)', knoop 1<span class="kolom-4"></span>'
        y_K1 = ?*(m)'<span class="kolom-4"></span>'
        x_K2 = ?*(m)', knoop 2<span class="kolom-4"></span>'
        y_K2 = ?*(m)'<span class="kolom-4"></span>'
        x_K3 = ?*(m)', knoop 3<span class="kolom-4"></span>'
        y_K3 = ?*(m)'<span class="kolom-4"></span>'
        #if n_K ≥ 4
            x_K4 = ?*(m)', knoop 4<span class="kolom-4"></span>'
            y_K4 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 5
            x_K5 = ?*(m)', knoop 5<span class="kolom-4"></span>'
            y_K5 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 6
            x_K6 = ?*(m)', knoop 6<span class="kolom-4"></span>'
            y_K6 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 7
            x_K7 = ?*(m)', knoop 7<span class="kolom-4"></span>'
            y_K7 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 8
            x_K8 = ?*(m)', knoop 8<span class="kolom-4"></span>'
            y_K8 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 9
            x_K9 = ?*(m)', knoop 9<span class="kolom-4"></span>'
            y_K9 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        #if n_K ≥ 10
            x_K10 = ?*(m)', knoop 10<span class="kolom-4"></span>'
            y_K10 = ?*(m)'<span class="kolom-4"></span>'
        #end if
        @select n_S "Aantal staven"
          5 = 5
          3 = 3
          4 = 4
          6 = 6
          7 = 7
          8 = 8
          9 = 9
          10 = 10
          11 = 11
          12 = 12
          13 = 13
          14 = 14
          15 = 15
          16 = 16
          17 = 17
        @end
        i_S1 = ?', staaf 1: van knoop<span class="kolom-4"></span>'
        j_S1 = ?', naar knoop<span class="kolom-4"></span>'
        i_S2 = ?', staaf 2: van knoop<span class="kolom-4"></span>'
        j_S2 = ?', naar knoop<span class="kolom-4"></span>'
        i_S3 = ?', staaf 3: van knoop<span class="kolom-4"></span>'
        j_S3 = ?', naar knoop<span class="kolom-4"></span>'
        #if n_S ≥ 4
            i_S4 = ?', staaf 4: van knoop<span class="kolom-4"></span>'
            j_S4 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 5
            i_S5 = ?', staaf 5: van knoop<span class="kolom-4"></span>'
            j_S5 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 6
            i_S6 = ?', staaf 6: van knoop<span class="kolom-4"></span>'
            j_S6 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 7
            i_S7 = ?', staaf 7: van knoop<span class="kolom-4"></span>'
            j_S7 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 8
            i_S8 = ?', staaf 8: van knoop<span class="kolom-4"></span>'
            j_S8 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 9
            i_S9 = ?', staaf 9: van knoop<span class="kolom-4"></span>'
            j_S9 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 10
            i_S10 = ?', staaf 10: van knoop<span class="kolom-4"></span>'
            j_S10 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 11
            i_S11 = ?', staaf 11: van knoop<span class="kolom-4"></span>'
            j_S11 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 12
            i_S12 = ?', staaf 12: van knoop<span class="kolom-4"></span>'
            j_S12 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 13
            i_S13 = ?', staaf 13: van knoop<span class="kolom-4"></span>'
            j_S13 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 14
            i_S14 = ?', staaf 14: van knoop<span class="kolom-4"></span>'
            j_S14 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 15
            i_S15 = ?', staaf 15: van knoop<span class="kolom-4"></span>'
            j_S15 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 16
            i_S16 = ?', staaf 16: van knoop<span class="kolom-4"></span>'
            j_S16 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        #if n_S ≥ 17
            i_S17 = ?', staaf 17: van knoop<span class="kolom-4"></span>'
            j_S17 = ?', naar knoop<span class="kolom-4"></span>'
        #end if
        @select n_O "Aantal opleggingen"
          2 = 2
          1 = 1
          3 = 3
        @end
        k_O1 = ?', knoop van oplegging 1<span class="kolom-3"></span>'
        @select s_O1 "Oplegging 1"
          Vast scharnier, x en y vast = 3
          Rol, verticaal gesteund (y vast) = 2
          Rol, horizontaal gesteund (x vast) = 1
        @end
        #if n_O ≥ 2
            k_O2 = ?', knoop van oplegging 2<span class="kolom-3"></span>'
            @select s_O2 "Oplegging 2"
              Rol, verticaal gesteund (y vast) = 2
              Vast scharnier, x en y vast = 3
              Rol, horizontaal gesteund (x vast) = 1
            @end
        #end if
        #if n_O ≥ 3
            k_O3 = ?', knoop van oplegging 3<span class="kolom-3"></span>'
            @select s_O3 "Oplegging 3"
              Rol, verticaal gesteund (y vast) = 2
              Vast scharnier, x en y vast = 3
              Rol, horizontaal gesteund (x vast) = 1
            @end
        #end if
        @select n_F "Aantal knooplasten"
          1 = 1
          0 = 0
          2 = 2
          3 = 3
          4 = 4
          5 = 5
        @end
        #if n_F ≥ 1
            k_F1 = ?', knooplast 1: knoop<span class="kolom-3"></span>'
            F_h1 = ?*(kN)', horizontaal, naar rechts<span class="kolom-3"></span>'
            F_v1 = ?*(kN)', verticaal, naar beneden<span class="kolom-3"></span>'
        #end if
        #if n_F ≥ 2
            k_F2 = ?', knooplast 2: knoop<span class="kolom-3"></span>'
            F_h2 = ?*(kN)', horizontaal, naar rechts<span class="kolom-3"></span>'
            F_v2 = ?*(kN)', verticaal, naar beneden<span class="kolom-3"></span>'
        #end if
        #if n_F ≥ 3
            k_F3 = ?', knooplast 3: knoop<span class="kolom-3"></span>'
            F_h3 = ?*(kN)', horizontaal, naar rechts<span class="kolom-3"></span>'
            F_v3 = ?*(kN)', verticaal, naar beneden<span class="kolom-3"></span>'
        #end if
        #if n_F ≥ 4
            k_F4 = ?', knooplast 4: knoop<span class="kolom-3"></span>'
            F_h4 = ?*(kN)', horizontaal, naar rechts<span class="kolom-3"></span>'
            F_v4 = ?*(kN)', verticaal, naar beneden<span class="kolom-3"></span>'
        #end if
        #if n_F ≥ 5
            k_F5 = ?', knooplast 5: knoop<span class="kolom-3"></span>'
            F_h5 = ?*(kN)', horizontaal, naar rechts<span class="kolom-3"></span>'
            F_v5 = ?*(kN)', verticaal, naar beneden<span class="kolom-3"></span>'
        #end if
        #hide
        nK = n_K
        nS = n_S
        'Knopen en staven als kale getallen; een staaf of oplegging voorbij het gekozen aantal telt niet mee (knoop 0).
        xk_1 = x_K1/(1 m)
        yk_1 = y_K1/(1 m)
        xk_2 = x_K2/(1 m)
        yk_2 = y_K2/(1 m)
        xk_3 = x_K3/(1 m)
        yk_3 = y_K3/(1 m)
        xk_4 = x_K4/(1 m)
        yk_4 = y_K4/(1 m)
        xk_5 = x_K5/(1 m)
        yk_5 = y_K5/(1 m)
        xk_6 = x_K6/(1 m)
        yk_6 = y_K6/(1 m)
        xk_7 = x_K7/(1 m)
        yk_7 = y_K7/(1 m)
        xk_8 = x_K8/(1 m)
        yk_8 = y_K8/(1 m)
        xk_9 = x_K9/(1 m)
        yk_9 = y_K9/(1 m)
        xk_10 = x_K10/(1 m)
        yk_10 = y_K10/(1 m)
        kn = [xk_1; xk_2; xk_3; xk_4; xk_5; xk_6; xk_7; xk_8; xk_9; xk_10 |yk_1; yk_2; yk_3; yk_4; yk_5; yk_6; yk_7; yk_8; yk_9; yk_10]
        vI = [i_S1; i_S2; i_S3; i_S4; i_S5; i_S6; i_S7; i_S8; i_S9; i_S10; i_S11; i_S12; i_S13; i_S14; i_S15; i_S16; i_S17]
        vJ = [j_S1; j_S2; j_S3; j_S4; j_S5; j_S6; j_S7; j_S8; j_S9; j_S10; j_S11; j_S12; j_S13; j_S14; j_S15; j_S16; j_S17]
        'Een knoopnummer buiten 1 … n_K (ook een leeg veld) wordt 99: de rekenkern ziet dan een onvolledig vakwerk en rekent niet.
        kg(k) = if(k ≥ 1 and k ≤ nK; k; 99)
        si(nr) = if(nr ≤ nS; kg(round(vI[min(nr; 17)])); 0)
        sj(nr) = if(nr ≤ nS; kg(round(vJ[min(nr; 17)])); 0)
        srt(nr) = 0
        ko_1 = if(n_O ≥ 1; kg(round(k_O1)); 0)
        ox_1 = bool(s_O1 ≡ 3 or s_O1 ≡ 1)
        oy_1 = bool(s_O1 ≥ 2)
        ko_2 = if(n_O ≥ 2; kg(round(k_O2)); 0)
        ox_2 = bool(s_O2 ≡ 3 or s_O2 ≡ 1)
        oy_2 = bool(s_O2 ≥ 2)
        ko_3 = if(n_O ≥ 3; kg(round(k_O3)); 0)
        ox_3 = bool(s_O3 ≡ 3 or s_O3 ≡ 1)
        oy_3 = bool(s_O3 ≥ 2)
        opl = [ko_1; ko_2; ko_3 |ox_1; ox_2; ox_3 |oy_1; oy_2; oy_3 |0; 0; 0]
        kf_1 = if(n_F ≥ 1; round(k_F1); 0)
        kfout_1 = bool(n_F ≥ 1)*bool(kf_1 < 1 or kf_1 > nK)
        fh_1 = F_h1/(1 kN)
        fv_1 = F_v1/(1 kN)
        kf_2 = if(n_F ≥ 2; round(k_F2); 0)
        kfout_2 = bool(n_F ≥ 2)*bool(kf_2 < 1 or kf_2 > nK)
        fh_2 = F_h2/(1 kN)
        fv_2 = F_v2/(1 kN)
        kf_3 = if(n_F ≥ 3; round(k_F3); 0)
        kfout_3 = bool(n_F ≥ 3)*bool(kf_3 < 1 or kf_3 > nK)
        fh_3 = F_h3/(1 kN)
        fv_3 = F_v3/(1 kN)
        kf_4 = if(n_F ≥ 4; round(k_F4); 0)
        kfout_4 = bool(n_F ≥ 4)*bool(kf_4 < 1 or kf_4 > nK)
        fh_4 = F_h4/(1 kN)
        fv_4 = F_v4/(1 kN)
        kf_5 = if(n_F ≥ 5; round(k_F5); 0)
        kfout_5 = bool(n_F ≥ 5)*bool(kf_5 < 1 or kf_5 > nK)
        fh_5 = F_h5/(1 kN)
        fv_5 = F_v5/(1 kN)
        last = [kf_1; kf_1; kf_2; kf_2; kf_3; kf_3; kf_4; kf_4; kf_5; kf_5 |3; 3; 3; 3; 3; 3; 3; 3; 3; 3 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |fh_1; fv_1; fh_2; fv_2; fh_3; fv_3; fh_4; fv_4; fh_5; fv_5 |0; 0; 0; 0; 0; 0; 0; 0; 0; 0 |1; 2; 1; 2; 1; 2; 1; 2; 1; 2]
        ok_v = 1
        kfout = kfout_1 + kfout_2 + kfout_3 + kfout_4 + kfout_5
        #show
        #if kfout ≥ 1
            '<span style="color:#b45309">'kfout' knooplast(en) op een knoop die niet bestaat (niet 1 tot en met 'nK'): die tellen niet mee.</span>
        #end if
    #end if

    # 2. Doorsnede van de staven

    '<i>Eén doorsnede voor alle staven. Zij bepaalt de rekstijfheid EA (de verplaatsingen, en bij een statisch onbepaald vakwerk ook de krachtsverdeling) en de snelle toets per staaf.</i><span class="alleen-scherm"></span>
    @select staaf_s "Doorsnede van de staven"
      Staal, gelijkzijdig hoekstaal = 1
      Staal, I- of H-profiel = 2
      Staal, ronde buis of rond staal = 3
      Hout, rechthoekig = 4
      Alleen de krachtsverdeling: EA invoeren, geen toets = 0
    @end
    #hide
    'Startwaarden van de invoer die bij een andere keuze hoort.
    staalsoort = 235
    hoek_s = 3
    prof_s = 21
    D_s = 0 mm
    t_s = 0 mm
    houtklasse = 2
    klimaat = 1
    duur = 4
    b_s = 0 mm
    h_s = 0 mm
    EA_s = 0 kN
    #show
    #if staaf_s ≡ 0
        EA_s = ?*(kN)', rekstijfheid van elke staaf<span class="alleen-scherm"> (0 = alleen de krachten)</span><span class="kolom-3"></span>'
    #else if staaf_s ≤ 3
        @select staalsoort "Staalsoort"
          S235 = 235
          S275 = 275
          S355 = 355
        @end
        #if staaf_s ≡ 1
            @select hoek_s "Hoekstaal"
              L 50x50x5 = 3
              L 40x40x4 = 1
              L 45x45x5 = 2
              L 60x60x6 = 4
              L 70x70x7 = 5
              L 80x80x8 = 6
              L 90x90x9 = 7
              L 100x100x10 = 8
            @end
        #else if staaf_s ≡ 2
            @select prof_s "Profiel"
              IPE 200 = 21
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
              IPE 240 = 22
              IPE 270 = 23
              IPE 300 = 24
              IPE 330 = 25
              IPE 360 = 26
              IPE 400 = 27
            @end
        #else
            D_s = ?*(mm)', buitendiameter<span class="kolom-3"></span>'
            t_s = ?*(mm)', wanddikte<span class="alleen-scherm"> (0 = rond staal)</span><span class="kolom-3"></span>'
        #end if
    #else
        @select houtklasse "Sterkteklasse"
          C24 = 2
          C18 = 1
          C30 = 3
          GL24h = 4
          GL28h = 5
        @end
        @select klimaat "Klimaatklasse"
          Klimaatklasse 1 = 1
          Klimaatklasse 2 = 2
          Klimaatklasse 3 = 3
        @end
        @select duur "Belastingsduurklasse van de kortst durende last"
          Kort (sneeuw, wind) = 4
          Permanent = 1
          Lang (opslag) = 2
          Middellang (gebruiksbelasting) = 3
          Zeer kort = 5
        @end
        b_s = ?*(mm)', breedte<span class="kolom-3"></span>'
        h_s = ?*(mm)', hoogte<span class="kolom-3"></span>'
    #end if
    #hide
    'Staal (NEN-EN 1993-1-1): E = 210 000 N/mm², f_y uit tabel 3.1 (t ≤ 40 mm), γ_M0 = γ_M1 = 1,0; kale getallen in m en kN.
    E_st = 210*10^6
    fy_n = staalsoort*1000
    ε = sqrt(235/staalsoort)
    'Per soort: A (m²), de kleinste traagheidsstraal i (m), de imperfectiefactor α van de knikkromme en de doorsnedeklasse bij zuivere druk (tabel 5.2).
    'Hoekstaal: knik om de zwakke hoofdas v (kromme b); klasse 3 als h/t ≤ 15ε en (b + h)/(2t) ≤ 11,5ε.
    A_L = hl(hoek_s; 6)*10^-4
    i_L = hl(hoek_s; 14)*10^-2
    kl_L = if(hl(hoek_s; 2)/hl(hoek_s; 3) ≤ 11.5*ε; 3; 4)
    'I- of H-profiel: knik om de z-as, kromme b bij h/b > 1,2 en anders c (tabel 6.2); flens c/t ≤ 14ε en lijf c/t ≤ 42ε voor klasse 3.
    A_I = pm(prof_s; 7)*10^-4
    i_I = pm(prof_s; 16)*10^-2
    cf_I = (pm(prof_s; 3) - pm(prof_s; 4) - 2*pm(prof_s; 6))/(2*pm(prof_s; 5))
    cw_I = (pm(prof_s; 2) - 2*pm(prof_s; 5) - 2*pm(prof_s; 6))/pm(prof_s; 4)
    kl_I = if(cf_I ≤ 14*ε and cw_I ≤ 42*ε; 3; 4)
    α_I = if(pm(prof_s; 2)/pm(prof_s; 3) > 1.2; 0.34; 0.49)
    'Buis (warmgevormd, kromme a) met d/t ≤ 90ε² voor klasse 3, of rond staal (kromme c).
    Dn = max(D_s/(1 m); 0)
    tn = max(t_s/(1 m); 0)
    dn = if(tn > 0 and tn < Dn/2; Dn - 2*tn; 0)
    A_B = pi*(Dn^2 - dn^2)/4
    i_B = sqrt(Dn^2 + dn^2)/4
    kl_B = if(dn > 0; if(Dn/tn ≤ 90*ε^2; 3; 4); 1)
    α_B = if(dn > 0; 0.21; 0.49)
    'Hout (NEN-EN 1995-1-1): [id, f_m,k, f_t,0,k, f_c,0,k, f_v,k, f_c,90,k, E_0,mean, E_0,05, ρ_mean, γ_M, gelamineerd]; EN 338 voor C18 tot en met C30, EN 14080 voor GL24h en GL28h.
    materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |11; 14; 18; 19.2; 22.3 |18; 21; 23; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |2.2; 2.5; 2.7; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600 |6000; 7400; 8000; 9600; 10500 |380; 420; 460; 420; 460 |1.30; 1.30; 1.30; 1.25; 1.25 |0; 0; 0; 1; 1]
    mh(j) = hlookup(materialen; houtklasse; 1; j)
    'k_mod uit tabel 3.1 naar de klimaatklasse en de belastingsduurklasse (1 permanent … 5 zeer kort).
    k_mod = if(klimaat ≡ 3; if(duur ≡ 1; 0.5; if(duur ≡ 2; 0.55; if(duur ≡ 3; 0.65; if(duur ≡ 4; 0.7; 0.9)))); if(duur ≡ 1; 0.6; if(duur ≡ 2; 0.7; if(duur ≡ 3; 0.8; if(duur ≡ 4; 0.9; 1.1)))))
    ft0d_n = k_mod*mh(3)*1000/mh(10)
    fc0d_n = k_mod*mh(4)*1000/mh(10)
    β_c = if(mh(11) ≡ 1; 0.1; 0.2)
    bn = max(b_s/(1 m); 0)
    hn = max(h_s/(1 m); 0)
    A_H = bn*hn
    i_H = min(bn; hn)/sqrt(12)
    'De gekozen doorsnede.
    A_st = if(staaf_s ≡ 1; A_L; if(staaf_s ≡ 2; A_I; if(staaf_s ≡ 3; A_B; if(staaf_s ≡ 4; A_H; 0))))
    i_st = if(staaf_s ≡ 1; i_L; if(staaf_s ≡ 2; i_I; if(staaf_s ≡ 3; i_B; if(staaf_s ≡ 4; i_H; 0))))
    kl_st = if(staaf_s ≡ 1; kl_L; if(staaf_s ≡ 2; kl_I; if(staaf_s ≡ 3; kl_B; 1)))
    α_k = if(staaf_s ≡ 1; 0.34; if(staaf_s ≡ 2; α_I; α_B))
    E_n = if(staaf_s ≡ 4; mh(7)*1000; E_st)
    staal = bool(staaf_s ≥ 1 and staaf_s ≤ 3)
    toets = bool(staaf_s ≥ 1)
    'EA in kN; zonder toets de ingevoerde waarde (0: 1 kN, alleen voor de krachten).
    EA_st = if(staaf_s ≡ 0; if(EA_s > 0 kN; EA_s/(1 kN); 1); E_n*A_st)
    EI_st = EA_st*0.01
    ok_A = bool(staaf_s ≡ 0 or A_st > 0)
    met_u = bool(staaf_s ≥ 1 or EA_s > 0 kN)
    #show
    #if toets ≡ 1
        #if ok_A ≡ 0
            '<span style="color:#b45309">Vul de maten van de doorsnede in.</span>
        #else
            #hide
            A_s = A_st*m^2 to cm^2
            i_min = i_st*m to mm
            #show
            #if staal ≡ 1
                A_s'<span class="kolom-4"></span>'
                #if staaf_s ≡ 1
                    i_min'<span class="alleen-scherm">, om de zwakke hoofdas v-v</span><span class="kolom-4"></span>'
                #else if staaf_s ≡ 2
                    i_min'<span class="alleen-scherm">, om de z-as</span><span class="kolom-4"></span>'
                #else
                    i_min'<span class="kolom-4"></span>'
                #end if
                f_y = staalsoort*1 N/mm^2'<span class="alleen-scherm">, tabel 3.1 (t ≤ 40 mm)</span><span class="kolom-4"></span>'
                'Doorsnedeklasse bij druk: 'if(kl_st ≤ 3; "1 tot en met 3 (tabel 5.2)"; "4 — valt buiten deze snelle toets")'; knikkromme 'if(α_k ≡ 0.21; "a"; if(α_k ≡ 0.34; "b"; "c"))' (tabel 6.2), α = 'α_k'; γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0.
            #else
                A_s'<span class="kolom-4"></span>'
                i_min'<span class="alleen-scherm">, om de zwakste as</span><span class="kolom-4"></span>'
                k_mod'<span class="alleen-scherm">, tabel 3.1</span><span class="kolom-4"></span>'
                f_t,0,d = ft0d_n/1000*N/mm^2'<span class="alleen-scherm">, k<sub>mod</sub>·f<sub>t,0,k</sub>/γ<sub>M</sub></span><span class="kolom-4"></span>'
                f_c,0,d = fc0d_n/1000*N/mm^2'<span class="alleen-scherm">, k<sub>mod</sub>·f<sub>c,0,k</sub>/γ<sub>M</sub></span><span class="kolom-4"></span>'
                'f<sub>t,0,k</sub> = 'mh(3)', f<sub>c,0,k</sub> = 'mh(4)', E<sub>0,mean</sub> = 'mh(7)', E<sub>0,05</sub> = 'mh(8)' N/mm², γ<sub>M</sub> = 'mh(10)', β<sub>c</sub> = 'β_c'.
            #end if
        #end if
    #end if

    # 3. Staafkrachten

    #hide
    'Staafmatrix [i, j, EI, EA, scharnier i, scharnier j]: elke staaf scharnierend aan beide einden. EI doet er dan niet toe (geen buiging), maar moet positief zijn.
    st = [si(1); si(2); si(3); si(4); si(5); si(6); si(7); si(8); si(9); si(10); si(11); si(12); si(13); si(14); si(15); si(16); si(17); si(18); si(19); si(20); si(21); si(22); si(23); si(24); si(25); si(26); si(27); si(28); si(29); si(30); si(31); si(32); si(33) |sj(1); sj(2); sj(3); sj(4); sj(5); sj(6); sj(7); sj(8); sj(9); sj(10); sj(11); sj(12); sj(13); sj(14); sj(15); sj(16); sj(17); sj(18); sj(19); sj(20); sj(21); sj(22); sj(23); sj(24); sj(25); sj(26); sj(27); sj(28); sj(29); sj(30); sj(31); sj(32); sj(33) |EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st; EI_st |EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st; EA_st |1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1 |1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1]
    'Knopen: aantal en grenzen; een index buiten de matrix wordt 1, zodat if() ook dan geldig blijft.
    nR = n_rows(kn)
    kx(k) = kn[min(max(k; 1); nR); 1]
    ky(k) = kn[min(max(k; 1); nR); 2]
    Lsv(i; j) = bool(i ≥ 1)*bool(j ≥ 1)*sqrt((kx(j) - kx(i))^2 + (ky(j) - ky(i))^2)
    Ls(nr) = Lsv(si(nr); sj(nr))
    'Een staaf telt mee als zijn knopen bestaan en verschillen.
    sok(nr) = bool(si(nr) ≥ 1)*bool(sj(nr) ≥ 1)*bool(si(nr) ≤ nK)*bool(sj(nr) ≤ nK)*bool(si(nr) ≠ sj(nr))
    status_v = if(ok_v*ok_A ≡ 1; raamwerk_status(kn; st; opl); 0)
    'Statische bepaaldheid: s + r − 2k, met k de knopen aan een staaf en r de vastgehouden verplaatsingen in de opleggingen.
    nSa = 0
    #for nr = 1 : nS
        nSa = nSa + sok(nr)
    #loop
    nKa = 0
    #for k = 1 : nK
        aan = 0
        #for nr = 1 : nS
            aan = max(aan; sok(nr)*bool(si(nr) ≡ k or sj(nr) ≡ k))
        #loop
        nKa = nKa + aan
    #loop
    nOp = 0
    #for o = 1 : n_rows(opl)
        nOp = nOp + bool(opl.(o; 1) ≥ 1)*(opl.(o; 2) + opl.(o; 3))
    #loop
    graad = nSa + nOp - 2*nKa
    'Tekening: het vakwerk over ten hoogste 380 × 170 px.
    Xmin = kx(1)
    Xmax = kx(1)
    Ymin = ky(1)
    Ymax = ky(1)
    #for k = 2 : nK
        Xmin = min(Xmin; kx(k))
        Xmax = max(Xmax; kx(k))
        Ymin = min(Ymin; ky(k))
        Ymax = max(Ymax; ky(k))
    #loop
    sc_v = min(380/max(Xmax - Xmin; 10^-6); 170/max(Ymax - Ymin; 10^-6))
    vX(x) = 50 + sc_v*(x - Xmin)
    vY(y) = 45 + sc_v*(Ymax - y)
    sHv = 45 + sc_v*(Ymax - Ymin) + 55
    #show
    #if ok_v ≡ 0
        '<span style="color:#b45309">Vul de overspanning en de hoogte in; zonder dat valt er niets te rekenen.</span>
    #else if ok_A ≡ 0
        '<span style="color:#b45309">Vul de maten van de doorsnede in; zonder dat valt er niets te rekenen.</span>
    #else if status_v ≡ 0
        '<span style="color:#b45309">Het vakwerk is nog niet compleet: elke staaf moet twee verschillende, bestaande knopen verbinden (knoop 1 tot en met 'nK'), en een oplegging moet op een bestaande knoop staan.</span>
    #else
        #if status_v ≡ 1
            #hide
            R_v = raamwerk(kn; st; opl; last)
            RR = raamwerk_R(kn; st; opl; last)
            UU = raamwerk_u(kn; st; opl; last)
            'Normaalkracht per staaf (trek positief), constant langs de staaf; afrondingsruis weg.
            Nr(nr) = sok(nr)*raamwerk_int(R_v; nr; 5; 0)
            Nmx = 0
            #for nr = 1 : nS
                Nmx = max(Nmx; abs(Nr(nr)))
            #loop
            Ns(nr) = if(abs(Nr(nr)) ≤ 10^-9*max(Nmx; 10^-12); 0; Nr(nr))
            #show
        #else
            #hide
            Ns(nr) = 0
            Nmx = 0
            #show
        #end if
        #hide
        dxs(nr) = vX(kx(sj(nr))) - vX(kx(si(nr)))
        dys(nr) = vY(ky(sj(nr))) - vY(ky(si(nr)))
        kleurS(nr) = if(Ns(nr) > 0; "#1d4ed8"; if(Ns(nr) < 0; "#b91c1c"; "#9ca3af"))
        nL = n_rows(last)
        #show
        '<svg viewbox="0 0 480 'sHv'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'sHv + 16'px;">
        #for nr = 1 : nS
            #if sok(nr) ≡ 1
                '<line x1="'vX(kx(si(nr)))'" y1="'vY(ky(si(nr)))'" x2="'vX(kx(sj(nr)))'" y2="'vY(ky(sj(nr)))'" style="stroke:'kleurS(nr)'; stroke-width:'if(Ns(nr) ≡ 0; 1.5; 3)'; stroke-linecap:round"/>
                #if status_v ≡ 1
                    '<text x="'vX(kx(si(nr))) + dxs(nr)/2'" y="'vY(ky(si(nr))) + dys(nr)/2 + 3'" text-anchor="middle" style="fill:'kleurS(nr)'; font-size:8.5px; paint-order:stroke; stroke:#ffffff; stroke-width:3px">'r1(Ns(nr))'</text>
                #else
                    '<text x="'vX(kx(si(nr))) + dxs(nr)/2'" y="'vY(ky(si(nr))) + dys(nr)/2 + 3'" text-anchor="middle" style="fill:#6b7280; font-size:8.5px; paint-order:stroke; stroke:#ffffff; stroke-width:3px">'nr'</text>
                #end if
            #end if
        #loop
        #for k = 1 : nK
            '<circle cx="'vX(kx(k))'" cy="'vY(ky(k))'" r="2.5" style="fill:#ffffff; stroke:#374151; stroke-width:1"/>
            '<text x="'vX(kx(k)) + 5'" y="'vY(ky(k)) - 5'" style="fill:#374151; font-size:8px">'k'</text>
        #loop
        #for o = 1 : n_rows(opl)
            #if opl.(o; 1) ≥ 1
                #if opl.(o; 1) ≤ nK
                    '<polygon points="'vX(kx(opl.(o; 1)))','vY(ky(opl.(o; 1))) + 3' 'vX(kx(opl.(o; 1))) - 8','vY(ky(opl.(o; 1))) + 15' 'vX(kx(opl.(o; 1))) + 8','vY(ky(opl.(o; 1))) + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
                    #if opl.(o; 2) + opl.(o; 3) ≡ 1
                        '<line x1="'vX(kx(opl.(o; 1))) - 10'" y1="'vY(ky(opl.(o; 1))) + 19'" x2="'vX(kx(opl.(o; 1))) + 10'" y2="'vY(ky(opl.(o; 1))) + 19'" style="stroke:#92400e; stroke-width:1.2"/>
                        '<text x="'vX(kx(opl.(o; 1))) + 12'" y="'vY(ky(opl.(o; 1))) + 18'" style="fill:#92400e; font-size:8px">'if(opl.(o; 3) ≡ 1; "rol"; "rol, x vast")'</text>
                    #end if
                #end if
            #end if
        #loop
        #for q = 1 : nL
            #if last.(q; 1) ≥ 1
                #if last.(q; 1) ≤ nK
                    #if abs(last.(q; 5)) > 0
                        #hide
                        Xq = vX(kx(last.(q; 1)))
                        Yq = vY(ky(last.(q; 1)))
                        tq = if(last.(q; 5) > 0; 1; -1)
                        'Een last naar beneden op een knoop van de onderste rand hangt onder de knoop, buiten het vakwerk.
                        onder = bool(tq > 0)*bool(ky(last.(q; 1)) ≤ Ymin + 10^-9*max(Ymax - Ymin; 1))
                        #show
                        #if last.(q; 7) ≡ 2 and onder ≡ 1
                            '<line x1="'Xq'" y1="'Yq + 5'" x2="'Xq'" y2="'Yq + 24'" style="stroke:#047857; stroke-width:1.5"/>
                            '<polygon points="'Xq','Yq + 30' 'Xq - 3.5','Yq + 23' 'Xq + 3.5','Yq + 23'" style="fill:#047857"/>
                            '<text x="'Xq + 4'" y="'Yq + 30'" style="fill:#047857; font-size:8px">'r2(abs(last.(q; 5)))'</text>
                        #else if last.(q; 7) ≡ 2
                            '<line x1="'Xq'" y1="'Yq - 30*tq'" x2="'Xq'" y2="'Yq - 6*tq'" style="stroke:#047857; stroke-width:1.5"/>
                            '<polygon points="'Xq','Yq - 3*tq' 'Xq - 3.5','Yq - 10*tq' 'Xq + 3.5','Yq - 10*tq'" style="fill:#047857"/>
                            '<text x="'Xq + 3'" y="'Yq - 33*tq + 3'" style="fill:#047857; font-size:8px">'r2(abs(last.(q; 5)))'</text>
                        #else
                            '<line x1="'Xq - 30*tq'" y1="'Yq'" x2="'Xq - 6*tq'" y2="'Yq'" style="stroke:#047857; stroke-width:1.5"/>
                            '<polygon points="'Xq - 3*tq','Yq' 'Xq - 10*tq','Yq - 3.5' 'Xq - 10*tq','Yq + 3.5'" style="fill:#047857"/>
                            '<text x="'Xq - 33*tq'" y="'Yq - 4'" text-anchor="middle" style="fill:#047857; font-size:8px">'r2(abs(last.(q; 5)))'</text>
                        #end if
                    #end if
                #end if
            #end if
        #loop
        '</svg>'
        #if status_v ≡ 1
            '<span class="alleen-scherm">Blauw: trek, rood: druk, grijs: nulstaaf; de getallen zijn de normaalkrachten in kN (trek positief). Groen de knooplasten in kN, geel de opleggingen; zwart de knoopnummers.</span>
        #else
            '<span class="alleen-scherm">Grijs de staafnummers, zwart de knoopnummers.</span>
        #end if
        #if graad < 0
            '<span style="color:#b91c1c"><b>Het vakwerk is beweeglijk</b>: s + r = 'nSa + nOp' &lt; 2k = '2*nKa' (s staven, r vastgehouden verplaatsingen in de opleggingen, k knopen). Voeg een staaf of een oplegging toe.</span>
        #else if status_v ≡ -1
            '<span style="color:#b91c1c"><b>Het vakwerk is beweeglijk</b>, al is s + r = 'nSa + nOp' ≥ 2k = '2*nKa': een deel kan verschuiven of draaien (bijvoorbeeld drie opleggingen in één lijn, of een knoop met twee staven in één lijn). Verplaats of voeg een staaf of oplegging toe.</span>
        #else if graad ≡ 0
            'Statisch bepaald: s + r = 'nSa' + 'nOp' = 2k = '2*nKa' (s staven, r vastgehouden verplaatsingen in de opleggingen, k knopen).<span class="alleen-scherm"></span>
        #else
            'Het vakwerk is 'graad'-voudig statisch onbepaald: s + r = 'nSa' + 'nOp' > 2k = '2*nKa'. De krachtsverdeling volgt uit de vervormingen, met dezelfde EA voor alle staven.<span class="alleen-scherm"></span>
        #end if
        #if status_v ≡ 1
            #hide
            'Snelle toets per staaf, kale getallen in kN, m en kN/m². Staal: trek (6.6) N_t,Rd = A·f_y/γ_M0, druk (6.47) N_b,Rd = χ·A·f_y/γ_M1 met λ̄ = L/(i·π)·√(f_y/E) en de kniklengte gelijk aan de staaflengte.
            'Hout: trek (6.1) N_Rd = A·f_t,0,d, druk (6.23) N_Rd = k_c·A·f_c,0,d met λ_rel = L/(i·π)·√(f_c,0,k/E_0,05) (6.21) en k_c uit (6.25) tot en met (6.29).
            λs(L) = L/(max(i_st; 10^-9)*pi)*sqrt(fy_n/E_st)
            Φs(λ) = 0.5*(1 + α_k*(λ - 0.2) + λ^2)
            χs(L) = min(1; 1/(Φs(λs(L)) + sqrt(max(Φs(λs(L))^2 - λs(L)^2; 0))))
            λh(L) = L/(max(i_st; 10^-9)*pi)*sqrt(mh(4)/mh(8))
            kh(λ) = 0.5*(1 + β_c*(λ - 0.3) + λ^2)
            kcs(L) = if(λh(L) ≤ 0.3; 1; 1/(kh(λh(L)) + sqrt(max(kh(λh(L))^2 - λh(L)^2; 0))))
            λr(L) = if(staal ≡ 1; λs(L); λh(L))
            red(L) = if(staal ≡ 1; χs(L); kcs(L))
            NtRd = A_st*if(staal ≡ 1; fy_n; ft0d_n)
            NcRd(L) = red(L)*A_st*if(staal ≡ 1; fy_n; fc0d_n)
            NRd(nr) = if(Ns(nr) ≥ 0; NtRd; NcRd(Ls(nr)))
            UCm(nr) = abs(Ns(nr))/max(NRd(nr); 10^-12)
            UC_v = 0
            mUC = 1
            druk = 0
            #for nr = 1 : nS
                #if sok(nr)*toets ≡ 1
                    #if UCm(nr) > UC_v
                        UC_v = UCm(nr)
                        mUC = nr
                    #end if
                    druk = max(druk; bool(Ns(nr) < 0))
                #end if
            #loop
            kl4 = staal*bool(kl_st ≥ 4)*druk
            srtn(nr) = if(srt(nr) ≡ 1; "onderrand"; if(srt(nr) ≡ 2; "bovenrand"; if(srt(nr) ≡ 3; "verticaal"; if(srt(nr) ≡ 4; "diagonaal"; ""))))
            #show
            '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
            #if toets ≡ 1
                '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Staaf</th><th style="padding:1px 4px; text-align:left;">knopen</th><th style="padding:1px 4px; text-align:left;">'if(invoer_v ≡ 1; "soort"; "")'</th><th style="padding:1px 4px; text-align:right;">L [m]</th><th style="padding:1px 4px; text-align:right;">N [kN]</th><th style="padding:1px 4px; text-align:left;"></th><th style="padding:1px 4px; text-align:right;">'if(staal ≡ 1; "λ̄"; "λ<sub>rel</sub>")'</th><th style="padding:1px 4px; text-align:right;">'if(staal ≡ 1; "χ"; "k<sub>c</sub>")'</th><th style="padding:1px 4px; text-align:right;">N<sub>Rd</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">UC</th></tr>
            #else
                '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Staaf</th><th style="padding:1px 4px; text-align:left;">knopen</th><th style="padding:1px 4px; text-align:left;">'if(invoer_v ≡ 1; "soort"; "")'</th><th style="padding:1px 4px; text-align:right;">L [m]</th><th style="padding:1px 4px; text-align:right;">N [kN]</th><th style="padding:1px 4px; text-align:left;"></th></tr>
            #end if
            #for nr = 1 : nS
                #if sok(nr) ≡ 1
                    #if toets ≡ 1
                        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'nr'</td><td style="padding:0 4px;">'si(nr)'–'sj(nr)'</td><td style="padding:0 4px;">'srtn(nr)'</td><td style="padding:0 4px; text-align:right;">'r3(Ls(nr))'</td><td style="padding:0 4px; text-align:right; color:'kleurS(nr)';">'r2(Ns(nr))'</td><td style="padding:0 4px; color:'kleurS(nr)';">'if(Ns(nr) > 0; "trek"; if(Ns(nr) < 0; "druk"; "nulstaaf"))'</td><td style="padding:0 4px; text-align:right;">'if(Ns(nr) < 0; r2(λr(Ls(nr))); "—")'</td><td style="padding:0 4px; text-align:right;">'if(Ns(nr) < 0; r3(red(Ls(nr))); "—")'</td><td style="padding:0 4px; text-align:right;">'r2(NRd(nr))'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(UCm(nr))';">'r2(UCm(nr))'</td></tr>
                    #else
                        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'nr'</td><td style="padding:0 4px;">'si(nr)'–'sj(nr)'</td><td style="padding:0 4px;">'srtn(nr)'</td><td style="padding:0 4px; text-align:right;">'r3(Ls(nr))'</td><td style="padding:0 4px; text-align:right; color:'kleurS(nr)';">'r2(Ns(nr))'</td><td style="padding:0 4px; color:'kleurS(nr)';">'if(Ns(nr) > 0; "trek"; if(Ns(nr) < 0; "druk"; "nulstaaf"))'</td></tr>
                    #end if
                #end if
            #loop
            '</table>
            'N positief bij trek. 'if(toets ≡ 1; "Kniklengte gelijk aan de staaflengte (aan de veilige kant); bruto doorsnede, zonder de verzwakking door gaten en de excentriciteit van de aansluiting."; "")'<span class="alleen-scherm"></span>

            # 4. Reacties en verplaatsingen

            #hide
            'Evenwicht: de som van de knooplasten en de reacties (lasten op een knoop zonder staaf tellen niet mee).
            ΣFh = 0
            ΣFv = 0
            #for q = 1 : nL
                #if last.(q; 1) ≥ 1
                    #if last.(q; 1) ≤ nK
                        ΣFh = ΣFh + bool(last.(q; 7) ≡ 1)*last.(q; 5)
                        ΣFv = ΣFv + bool(last.(q; 7) ≡ 2)*last.(q; 5)
                    #end if
                #end if
            #loop
            ΣRx = 0
            ΣRy = 0
            #for o = 1 : n_rows(RR)
                ΣRx = ΣRx + RR.(o; 2)
                ΣRy = ΣRy + RR.(o; 3)
            #loop
            #show
            '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25;">
            '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 6px; text-align:left;">Oplegging</th><th style="padding:1px 6px; text-align:right;">knoop</th><th style="padding:1px 6px; text-align:right;">R<sub>x</sub> [kN]</th><th style="padding:1px 6px; text-align:right;">R<sub>y</sub> [kN]</th></tr>
            #for o = 1 : n_rows(RR)
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 6px;">'o'</td><td style="padding:0 6px; text-align:right;">'RR.(o; 1)'</td><td style="padding:0 6px; text-align:right;">'r2(RR.(o; 2))'</td><td style="padding:0 6px; text-align:right;">'r2(RR.(o; 3))'</td></tr>
            #loop
            '<tr style="border-top:1.5px solid #374151;"><td style="padding:0 6px;">Σ</td><td></td><td style="padding:0 6px; text-align:right;">'r2(ΣRx)'</td><td style="padding:0 6px; text-align:right;">'r2(ΣRy)'</td></tr>
            '</table>
            'Reacties op het vakwerk: R<sub>x</sub> naar rechts en R<sub>y</sub> omhoog positief. Evenwicht: ΣF<sub>h</sub> + ΣR<sub>x</sub> = 'r2(ΣFh)' + ('r2(ΣRx)') = 'r2(ΣFh + ΣRx)' kN en ΣR<sub>y</sub> − ΣF<sub>v</sub> = 'r2(ΣRy)' − 'r2(ΣFv)' = 'r2(ΣRy - ΣFv)' kN.
            #if met_u ≡ 1
                #hide
                umax = 0
                kU = 1
                #for k = 1 : nK
                    #if sqrt(UU.(k; 2)^2 + UU.(k; 3)^2) > umax
                        umax = sqrt(UU.(k; 2)^2 + UU.(k; 3)^2)
                        kU = k
                    #end if
                #loop
                #show
                '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25;">
                '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 6px; text-align:left;">Knoop</th><th style="padding:1px 6px; text-align:right;">x [m]</th><th style="padding:1px 6px; text-align:right;">y [m]</th><th style="padding:1px 6px; text-align:right;">u<sub>x</sub> [mm]</th><th style="padding:1px 6px; text-align:right;">u<sub>y</sub> [mm]</th></tr>
                #for k = 1 : nK
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 6px;">'k'</td><td style="padding:0 6px; text-align:right;">'r3(kx(k))'</td><td style="padding:0 6px; text-align:right;">'r3(ky(k))'</td><td style="padding:0 6px; text-align:right;">'r2(1000*UU.(k; 2))'</td><td style="padding:0 6px; text-align:right;">'r2(1000*UU.(k; 3))'</td></tr>
                #loop
                '</table>
                'Verplaatsingen bij deze lasten, u<sub>x</sub> naar rechts en u<sub>y</sub> omhoog positief, met EA = 'r1(EA_st)' kN'if(staaf_s ≡ 4; " (E<sub>0,mean</sub>, zonder kruip)"; "")'; alleen de rek van de staven, de verbindingen zijn niet meegenomen. De grootste verplaatsing is 'r2(1000*umax)' mm, in knoop 'kU'.
            #else
                'Zonder EA geen verplaatsingen; de krachten van een statisch bepaald vakwerk hangen niet van EA af.
            #end if
            #if toets ≡ 1

                # 5. Toets

                #hide
                N_Ed = abs(Ns(mUC))*kN
                L_m = Ls(mUC)*m
                #show
                'Maatgevend is staaf 'mUC' ('si(mUC)'–'sj(mUC)''if(invoer_v ≡ 1; ", "; "")''srtn(mUC)'), op 'if(Ns(mUC) ≥ 0; "trek"; "druk")':
                N_Ed'<span class="kolom-3"></span>'
                L_m'<span class="alleen-scherm">, lengte van de staaf</span><span class="kolom-3"></span>'
                #if Ns(mUC) ≥ 0
                    #if staal ≡ 1
                        N_t,Rd = A_s*f_y/1.0 to kN'<span class="alleen-scherm">, (6.6), γ<sub>M0</sub> = 1,0</span><span class="kolom-3"></span>'
                    #else
                        N_t,Rd = A_s*f_t,0,d to kN'<span class="alleen-scherm">, (6.1)</span><span class="kolom-3"></span>'
                    #end if
                    UC_max = N_Ed/N_t,Rd'<span class="kolom-3"></span>'
                #else
                    #if staal ≡ 1
                        λ_k = L_m/(i_min*π)*sqrt(f_y/(210000 N/mm^2))'<span class="alleen-scherm">, λ̄ uit (6.50), L<sub>cr</sub> = L</span><span class="kolom-3"></span>'
                        Φ = 0.5*(1 + α_k*(λ_k - 0.2) + λ_k^2)'<span class="alleen-scherm">, α = 'α_k'</span><span class="kolom-3"></span>'
                        χ = min(1; 1/(Φ + sqrt(Φ^2 - λ_k^2)))'<span class="alleen-scherm">, (6.49)</span><span class="kolom-3"></span>'
                        N_b,Rd = χ*A_s*f_y/1.0 to kN'<span class="alleen-scherm">, (6.47), γ<sub>M1</sub> = 1,0</span><span class="kolom-3"></span>'
                        UC_max = N_Ed/N_b,Rd'<span class="kolom-3"></span>'
                    #else
                        λ_rel = L_m/(i_min*π)*sqrt(mh(4)/mh(8))'<span class="alleen-scherm">, (6.21)</span><span class="kolom-3"></span>'
                        k_knik = 0.5*(1 + β_c*(λ_rel - 0.3) + λ_rel^2)'<span class="alleen-scherm">, (6.27), β<sub>c</sub> = 'β_c'</span><span class="kolom-3"></span>'
                        k_c = min(1; 1/(k_knik + sqrt(k_knik^2 - λ_rel^2)))'<span class="alleen-scherm">, (6.25)</span><span class="kolom-3"></span>'
                        N_c,Rd = k_c*A_s*f_c,0,d to kN'<span class="alleen-scherm">, (6.23)</span><span class="kolom-3"></span>'
                        UC_max = N_Ed/N_c,Rd'<span class="kolom-3"></span>'
                    #end if
                #end if
                'Buiten dit blad: de verbindingen in de knopen, de netto doorsnede bij gaten, knik uit het vlak van het vakwerk, het eigen gewicht van de staven en de doorbuigingseis.
                #if kl4 ≡ 1
                    '<b>Maatgevende UC = 'r2(UC_v)'</b><span style="color: red">, maar de doorsnede valt bij druk in klasse 4 (tabel 5.2) → <b>de staven voldoen niet</b></span>
                #else if UC_v ≤ 1.0
                    '<b>Maatgevende UC = 'r2(UC_v)'</b><span style="color: green"> ≤ 1,0 → <b>de staven voldoen</b></span>
                #else
                    '<b>Maatgevende UC = 'r2(UC_v)'</b><span style="color: red"> > 1,0 → <b>de staven voldoen niet</b></span>
                #end if
            #else
                '<i>Geen toets: dit blad geeft de krachtsverdeling, geen oordeel.</i>
            #end if
        #else
            #if toets ≡ 1
                '<b>Maatgevende UC = ∞</b><span style="color: red"> → <b>de staven voldoen niet</b>: het vakwerk is beweeglijk</span>
            #else
                '<i>Geen toets: dit blad geeft de krachtsverdeling, geen oordeel.</i>
            #end if
        #end if
    #end if
#else
    # 1. Invoer

    '<i>De standaardgevallen van een prismatische ligger voor de ingevulde waarden. De getallen komen uit de liggeroplosser van de rekenkern (verplaatsingsmethode, exact binnen de balktheorie, zonder afschuifvervorming); de bekende formule staat eronder. Een vinkje betekent dat beide op 0,1 % gelijk zijn. Lasten naar beneden positief; q is bij een driehoekslast de grootste waarde.</i><span class="alleen-scherm"></span>
    L_c = ?*(m)', overspanning, of de lengte van de uitkraging<span class="kolom-3"></span>'
    q_c = ?*(kN/m)', verdeelde last<span class="kolom-3"></span>'
    F_c = ?*(kN)', puntlast<span class="kolom-3"></span>'
    a_c = ?*(m)', plaats van de puntlast in geval 3, vanaf links<span class="alleen-scherm"> (0 = L/3)</span><span class="kolom-3"></span>'
    E_c = ?*(N/mm^2)', elasticiteitsmodulus<span class="kolom-3"></span>'
    I_c = ?*(cm^4)', traagheidsmoment<span class="kolom-3"></span>'
    #hide
    Lc = max(L_c/(1 m); 0)
    qc = q_c/(1 kN/m)
    Fc = F_c/(1 kN)
    ac = if(a_c > 0 m and a_c < L_c; a_c/(1 m); Lc/3)
    'EI in kNm²; zonder EI rekent de oplosser met 1 kNm² en staat er bij w een streepje.
    EI_n = max(E_c*I_c/(1 kN*m^2); 0)
    met_w = bool(EI_n > 0)
    EIc = if(met_w ≡ 1; EI_n; 1)
    ok_c = bool(Lc > 0)
    #show
    #if ok_c ≡ 0
        '<span style="color:#b45309">Vul de overspanning in; zonder lengte valt er niets te rekenen.</span>
    #else
        #if met_w ≡ 1
            EI = E_c*I_c to kN*m^2'<span class="kolom-3"></span>'
        #else
            '<span class="alleen-scherm">Zonder E en I geen doorbuiging.</span>
        #end if
        #if a_c ≤ 0 m or a_c ≥ L_c
            'Geval 3: de puntlast op a = L/3 = 'r3(ac)' m.<span class="alleen-scherm"></span>
        #end if

        # 2. Standaardgevallen

        #hide
        'Ligger van 0 tot L: soort per eind 0 vrij, 1 steunpunt, 2 inklemming; lasten [soort, a, b, q_a, q_b] (1 verdeeld, 2 puntlast).
        gC(s1; s2) = [0; Lc |s1; s2]
        lC(t1; a1; e1; qa1; qb1; t2; a2; qa2) = [t1; t2 |a1; a2 |e1; 0 |qa1; qa2 |qb1; 0]
        'Uit de oplossing [x, V, M, w]: het grootste veldmoment, het grootste steunpuntsmoment, de grootste dwarskracht en doorbuiging.
        fMv(R) = max(ligger_ext(R; 3)[1]; 0)
        fMs(R) = max(-ligger_ext(R; 3)[3]; 0)
        fV(R) = max(ligger_ext(R; 2)[1]; -ligger_ext(R; 2)[3])
        fW(R) = 1000*max(ligger_ext(R; 4)[1]; -ligger_ext(R; 4)[3])
        'Gelijk op 0,1 %, met een ondergrens voor een waarde die nul hoort te zijn.
        sM = abs(qc)*Lc^2 + abs(Fc)*Lc
        sV = abs(qc)*Lc + abs(Fc)
        sW = 1000*(abs(qc)*Lc^4 + abs(Fc)*Lc^3)/EIc
        gelijk(x; y; s) = bool(abs(x - y) ≤ 0.001*abs(y) + 10^-9*s)
        alles_ok = 1
        #show
        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.2;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Nr</th><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:right;">M<sub>veld</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">M<sub>steun</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">V<sub>max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">w<sub>max</sub> [mm]</th><th style="padding:1px 4px; text-align:center;"></th></tr>
        '<tr style="border-bottom:1px solid #9ca3af; background:#f3f4f6;"><td colspan="7" style="padding:1px 4px; font-weight:700;">Ligger op twee steunpunten</td></tr>
        #hide
        R_1 = ligger(gC(1; 1); lC(1; 0; Lc; qc; qc; 0; 0; 0); EIc)
        Mv_1 = fMv(R_1)
        Mv_1f = qc*Lc^2/8
        Mv_1ok = gelijk(Mv_1; Mv_1f; sM)
        Ms_1 = fMs(R_1)
        Ms_1ok = gelijk(Ms_1; 0; sM)
        Vm_1 = fV(R_1)
        Vm_1f = qc*Lc/2
        Vm_1ok = gelijk(Vm_1; Vm_1f; sV)
        Wm_1 = fW(R_1)
        Wm_1f = 1000*(5*qc*Lc^4/(384*EIc))
        Wm_1ok = if(met_w ≡ 1; gelijk(Wm_1; Wm_1f; sW); 1)
        ok_1 = Mv_1ok*Ms_1ok*Vm_1ok*Wm_1ok
        alles_ok = alles_ok*ok_1
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">1</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><polygon points="6,19 2,26 10,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="6,16 6,9 58,9 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">q</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_1)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/8</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_1)'<br><span style="color:#6b7280; font-size:0.9em;">qL/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_1); "—")'<br><span style="color:#6b7280; font-size:0.9em;">5qL⁴/(384EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_1 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_1 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_2 = ligger(gC(1; 1); lC(2; Lc/2; 0; Fc; 0; 0; 0; 0); EIc)
        Mv_2 = fMv(R_2)
        Mv_2f = Fc*Lc/4
        Mv_2ok = gelijk(Mv_2; Mv_2f; sM)
        Ms_2 = fMs(R_2)
        Ms_2ok = gelijk(Ms_2; 0; sM)
        Vm_2 = fV(R_2)
        Vm_2f = Fc/2
        Vm_2ok = gelijk(Vm_2; Vm_2f; sV)
        Wm_2 = fW(R_2)
        Wm_2f = 1000*(Fc*Lc^3/(48*EIc))
        Wm_2ok = if(met_w ≡ 1; gelijk(Wm_2; Wm_2f; sW); 1)
        ok_2 = Mv_2ok*Ms_2ok*Vm_2ok*Wm_2ok
        alles_ok = alles_ok*ok_2
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">2</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><polygon points="6,19 2,26 10,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><line x1="32" y1="2" x2="32" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="32,17 29.5,12 34.5,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F in het midden</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_2)'<br><span style="color:#6b7280; font-size:0.9em;">FL/4</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_2)'<br><span style="color:#6b7280; font-size:0.9em;">F/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_2); "—")'<br><span style="color:#6b7280; font-size:0.9em;">FL³/(48EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_2 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_2 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_3 = ligger(gC(1; 1); lC(2; ac; 0; Fc; 0; 0; 0; 0); EIc)
        Mv_3 = fMv(R_3)
        Mv_3f = Fc*ac*(Lc - ac)/Lc
        Mv_3ok = gelijk(Mv_3; Mv_3f; sM)
        Ms_3 = fMs(R_3)
        Ms_3ok = gelijk(Ms_3; 0; sM)
        Vm_3 = fV(R_3)
        Vm_3f = Fc*max(ac; Lc - ac)/Lc
        Vm_3ok = gelijk(Vm_3; Vm_3f; sV)
        Wm_3 = fW(R_3)
        Wm_3f = 1000*(Fc*min(ac; Lc - ac)*(Lc^2 - min(ac; Lc - ac)^2)^1.5/(9*sqrt(3)*Lc*EIc))
        Wm_3ok = if(met_w ≡ 1; gelijk(Wm_3; Wm_3f; sW); 1)
        ok_3 = Mv_3ok*Ms_3ok*Vm_3ok*Wm_3ok
        alles_ok = alles_ok*ok_3
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">3</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><polygon points="6,19 2,26 10,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><line x1="23" y1="2" x2="23" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="23,17 20.5,12 25.5,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F op a van links</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_3)'<br><span style="color:#6b7280; font-size:0.9em;">F·a·b/L</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_3)'<br><span style="color:#6b7280; font-size:0.9em;">F·max(a, b)/L</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_3); "—")'<br><span style="color:#6b7280; font-size:0.9em;">F·c·(L² − c²)<sup>1,5</sup>/(9√3·L·EI), c = min(a, b)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_3 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_3 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_4 = ligger(gC(1; 1); lC(2; Lc/3; 0; Fc; 0; 2; 2*Lc/3; Fc); EIc)
        Mv_4 = fMv(R_4)
        Mv_4f = Fc*Lc/3
        Mv_4ok = gelijk(Mv_4; Mv_4f; sM)
        Ms_4 = fMs(R_4)
        Ms_4ok = gelijk(Ms_4; 0; sM)
        Vm_4 = fV(R_4)
        Vm_4f = Fc
        Vm_4ok = gelijk(Vm_4; Vm_4f; sV)
        Wm_4 = fW(R_4)
        Wm_4f = 1000*(23*Fc*Lc^3/(648*EIc))
        Wm_4ok = if(met_w ≡ 1; gelijk(Wm_4; Wm_4f; sW); 1)
        ok_4 = Mv_4ok*Ms_4ok*Vm_4ok*Wm_4ok
        alles_ok = alles_ok*ok_4
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">4</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><polygon points="6,19 2,26 10,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><line x1="23.3" y1="2" x2="23.3" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="23.3,17 20.8,12 25.8,12" style="fill:#047857"/><line x1="40.7" y1="2" x2="40.7" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="40.7,17 38.2,12 43.2,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F op L/3 en 2L/3</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_4)'<br><span style="color:#6b7280; font-size:0.9em;">FL/3</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_4)'<br><span style="color:#6b7280; font-size:0.9em;">F</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_4); "—")'<br><span style="color:#6b7280; font-size:0.9em;">23FL³/(648EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_4 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_4 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_5 = ligger(gC(1; 1); lC(1; 0; Lc; 0; qc; 0; 0; 0); EIc)
        Mv_5 = fMv(R_5)
        Mv_5f = qc*Lc^2/(9*sqrt(3))
        Mv_5ok = gelijk(Mv_5; Mv_5f; sM)
        Ms_5 = fMs(R_5)
        Ms_5ok = gelijk(Ms_5; 0; sM)
        Vm_5 = fV(R_5)
        Vm_5f = qc*Lc/3
        Vm_5ok = gelijk(Vm_5; Vm_5f; sV)
        Wm_5 = fW(R_5)
        Wm_5f = 1000*(0.006522*qc*Lc^4/EIc)
        Wm_5ok = if(met_w ≡ 1; gelijk(Wm_5; Wm_5f; sW); 1)
        ok_5 = Mv_5ok*Ms_5ok*Vm_5ok*Wm_5ok
        alles_ok = alles_ok*ok_5
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">5</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><polygon points="6,19 2,26 10,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="6,16 58,5 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">driehoek, 0 links tot q rechts</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_5)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/(9√3)</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_5)'<br><span style="color:#6b7280; font-size:0.9em;">qL/3</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_5); "—")'<br><span style="color:#6b7280; font-size:0.9em;">0,006522·qL⁴/EI</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_5 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_5 ≡ 1; "✓"; "✗")'</td></tr>
        '<tr style="border-bottom:1px solid #9ca3af; background:#f3f4f6;"><td colspan="7" style="padding:1px 4px; font-weight:700;">Eenzijdig ingeklemd (links), rechts een steunpunt</td></tr>
        #hide
        R_6 = ligger(gC(2; 1); lC(1; 0; Lc; qc; qc; 0; 0; 0); EIc)
        Mv_6 = fMv(R_6)
        Mv_6f = 9*qc*Lc^2/128
        Mv_6ok = gelijk(Mv_6; Mv_6f; sM)
        Ms_6 = fMs(R_6)
        Ms_6f = qc*Lc^2/8
        Ms_6ok = gelijk(Ms_6; Ms_6f; sM)
        Vm_6 = fV(R_6)
        Vm_6f = 5*qc*Lc/8
        Vm_6ok = gelijk(Vm_6; Vm_6f; sV)
        Wm_6 = fW(R_6)
        Wm_6f = 1000*(0.005416*qc*Lc^4/EIc)
        Wm_6ok = if(met_w ≡ 1; gelijk(Wm_6; Wm_6f; sW); 1)
        ok_6 = Mv_6ok*Ms_6ok*Vm_6ok*Wm_6ok
        alles_ok = alles_ok*ok_6
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">6</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><polygon points="6,16 6,9 58,9 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">q</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_6)'<br><span style="color:#6b7280; font-size:0.9em;">9qL²/128</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_6)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/8</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_6)'<br><span style="color:#6b7280; font-size:0.9em;">5qL/8</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_6); "—")'<br><span style="color:#6b7280; font-size:0.9em;">0,005416·qL⁴/EI</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_6 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_6 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_7 = ligger(gC(2; 1); lC(2; Lc/2; 0; Fc; 0; 0; 0; 0); EIc)
        Mv_7 = fMv(R_7)
        Mv_7f = 5*Fc*Lc/32
        Mv_7ok = gelijk(Mv_7; Mv_7f; sM)
        Ms_7 = fMs(R_7)
        Ms_7f = 3*Fc*Lc/16
        Ms_7ok = gelijk(Ms_7; Ms_7f; sM)
        Vm_7 = fV(R_7)
        Vm_7f = 11*Fc/16
        Vm_7ok = gelijk(Vm_7; Vm_7f; sV)
        Wm_7 = fW(R_7)
        Wm_7f = 1000*(Fc*Lc^3/(48*sqrt(5)*EIc))
        Wm_7ok = if(met_w ≡ 1; gelijk(Wm_7; Wm_7f; sW); 1)
        ok_7 = Mv_7ok*Ms_7ok*Vm_7ok*Wm_7ok
        alles_ok = alles_ok*ok_7
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">7</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="58,19 54,26 62,26" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/><line x1="32" y1="2" x2="32" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="32,17 29.5,12 34.5,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F in het midden</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_7)'<br><span style="color:#6b7280; font-size:0.9em;">5FL/32</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_7)'<br><span style="color:#6b7280; font-size:0.9em;">3FL/16</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_7)'<br><span style="color:#6b7280; font-size:0.9em;">11F/16</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_7); "—")'<br><span style="color:#6b7280; font-size:0.9em;">FL³/(48√5·EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_7 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_7 ≡ 1; "✓"; "✗")'</td></tr>
        '<tr style="border-bottom:1px solid #9ca3af; background:#f3f4f6;"><td colspan="7" style="padding:1px 4px; font-weight:700;">Tweezijdig ingeklemd</td></tr>
        #hide
        R_8 = ligger(gC(2; 2); lC(1; 0; Lc; qc; qc; 0; 0; 0); EIc)
        Mv_8 = fMv(R_8)
        Mv_8f = qc*Lc^2/24
        Mv_8ok = gelijk(Mv_8; Mv_8f; sM)
        Ms_8 = fMs(R_8)
        Ms_8f = qc*Lc^2/12
        Ms_8ok = gelijk(Ms_8; Ms_8f; sM)
        Vm_8 = fV(R_8)
        Vm_8f = qc*Lc/2
        Vm_8ok = gelijk(Vm_8; Vm_8f; sV)
        Wm_8 = fW(R_8)
        Wm_8f = 1000*(qc*Lc^4/(384*EIc))
        Wm_8ok = if(met_w ≡ 1; gelijk(Wm_8; Wm_8f; sW); 1)
        ok_8 = Mv_8ok*Ms_8ok*Vm_8ok*Wm_8ok
        alles_ok = alles_ok*ok_8
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">8</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><rect x="58" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="6,16 6,9 58,9 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">q</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_8)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/24</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_8)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/12</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_8)'<br><span style="color:#6b7280; font-size:0.9em;">qL/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_8); "—")'<br><span style="color:#6b7280; font-size:0.9em;">qL⁴/(384EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_8 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_8 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_9 = ligger(gC(2; 2); lC(2; Lc/2; 0; Fc; 0; 0; 0; 0); EIc)
        Mv_9 = fMv(R_9)
        Mv_9f = Fc*Lc/8
        Mv_9ok = gelijk(Mv_9; Mv_9f; sM)
        Ms_9 = fMs(R_9)
        Ms_9f = Fc*Lc/8
        Ms_9ok = gelijk(Ms_9; Ms_9f; sM)
        Vm_9 = fV(R_9)
        Vm_9f = Fc/2
        Vm_9ok = gelijk(Vm_9; Vm_9f; sV)
        Wm_9 = fW(R_9)
        Wm_9f = 1000*(Fc*Lc^3/(192*EIc))
        Wm_9ok = if(met_w ≡ 1; gelijk(Wm_9; Wm_9f; sW); 1)
        ok_9 = Mv_9ok*Ms_9ok*Vm_9ok*Wm_9ok
        alles_ok = alles_ok*ok_9
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">9</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><rect x="58" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><line x1="32" y1="2" x2="32" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="32,17 29.5,12 34.5,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F in het midden</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_9)'<br><span style="color:#6b7280; font-size:0.9em;">FL/8</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_9)'<br><span style="color:#6b7280; font-size:0.9em;">FL/8</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_9)'<br><span style="color:#6b7280; font-size:0.9em;">F/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_9); "—")'<br><span style="color:#6b7280; font-size:0.9em;">FL³/(192EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_9 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_9 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_10 = ligger(gC(2; 2); lC(1; 0; Lc; 0; qc; 0; 0; 0); EIc)
        Mv_10 = fMv(R_10)
        Mv_10f = 0.02144*qc*Lc^2
        Mv_10ok = gelijk(Mv_10; Mv_10f; sM)
        Ms_10 = fMs(R_10)
        Ms_10f = qc*Lc^2/20
        Ms_10ok = gelijk(Ms_10; Ms_10f; sM)
        Vm_10 = fV(R_10)
        Vm_10f = 7*qc*Lc/20
        Vm_10ok = gelijk(Vm_10; Vm_10f; sV)
        Wm_10 = fW(R_10)
        Wm_10f = 1000*(0.001309*qc*Lc^4/EIc)
        Wm_10ok = if(met_w ≡ 1; gelijk(Wm_10; Wm_10f; sW); 1)
        ok_10 = Mv_10ok*Ms_10ok*Vm_10ok*Wm_10ok
        alles_ok = alles_ok*ok_10
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">10</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><rect x="58" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="6,16 58,5 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">driehoek, 0 links tot q rechts</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Mv_10)'<br><span style="color:#6b7280; font-size:0.9em;">0,02144·qL²</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_10)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/20</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_10)'<br><span style="color:#6b7280; font-size:0.9em;">7qL/20</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_10); "—")'<br><span style="color:#6b7280; font-size:0.9em;">0,001309·qL⁴/EI</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_10 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_10 ≡ 1; "✓"; "✗")'</td></tr>
        '<tr style="border-bottom:1px solid #9ca3af; background:#f3f4f6;"><td colspan="7" style="padding:1px 4px; font-weight:700;">Uitkraging, links ingeklemd</td></tr>
        #hide
        R_11 = ligger(gC(2; 0); lC(1; 0; Lc; qc; qc; 0; 0; 0); EIc)
        Mv_11 = fMv(R_11)
        Mv_11ok = gelijk(Mv_11; 0; sM)
        Ms_11 = fMs(R_11)
        Ms_11f = qc*Lc^2/2
        Ms_11ok = gelijk(Ms_11; Ms_11f; sM)
        Vm_11 = fV(R_11)
        Vm_11f = qc*Lc
        Vm_11ok = gelijk(Vm_11; Vm_11f; sV)
        Wm_11 = fW(R_11)
        Wm_11f = 1000*(qc*Lc^4/(8*EIc))
        Wm_11ok = if(met_w ≡ 1; gelijk(Wm_11; Wm_11f; sW); 1)
        ok_11 = Mv_11ok*Ms_11ok*Vm_11ok*Wm_11ok
        alles_ok = alles_ok*ok_11
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">11</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="6,16 6,9 58,9 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">q</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_11)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_11)'<br><span style="color:#6b7280; font-size:0.9em;">qL</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_11); "—")'<br><span style="color:#6b7280; font-size:0.9em;">qL⁴/(8EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_11 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_11 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_12 = ligger(gC(2; 0); lC(2; Lc; 0; Fc; 0; 0; 0; 0); EIc)
        Mv_12 = fMv(R_12)
        Mv_12ok = gelijk(Mv_12; 0; sM)
        Ms_12 = fMs(R_12)
        Ms_12f = Fc*Lc
        Ms_12ok = gelijk(Ms_12; Ms_12f; sM)
        Vm_12 = fV(R_12)
        Vm_12f = Fc
        Vm_12ok = gelijk(Vm_12; Vm_12f; sV)
        Wm_12 = fW(R_12)
        Wm_12f = 1000*(Fc*Lc^3/(3*EIc))
        Wm_12ok = if(met_w ≡ 1; gelijk(Wm_12; Wm_12f; sW); 1)
        ok_12 = Mv_12ok*Ms_12ok*Vm_12ok*Wm_12ok
        alles_ok = alles_ok*ok_12
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">12</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><line x1="58" y1="2" x2="58" y2="14" style="stroke:#047857; stroke-width:1.2"/><polygon points="58,17 55.5,12 60.5,12" style="fill:#047857"/></svg><br><span style="font-size:0.9em;">F aan het eind</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_12)'<br><span style="color:#6b7280; font-size:0.9em;">FL</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_12)'<br><span style="color:#6b7280; font-size:0.9em;">F</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_12); "—")'<br><span style="color:#6b7280; font-size:0.9em;">FL³/(3EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_12 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_12 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_13 = ligger(gC(2; 0); lC(1; 0; Lc; qc; 0; 0; 0; 0); EIc)
        Mv_13 = fMv(R_13)
        Mv_13ok = gelijk(Mv_13; 0; sM)
        Ms_13 = fMs(R_13)
        Ms_13f = qc*Lc^2/6
        Ms_13ok = gelijk(Ms_13; Ms_13f; sM)
        Vm_13 = fV(R_13)
        Vm_13f = qc*Lc/2
        Vm_13ok = gelijk(Vm_13; Vm_13f; sV)
        Wm_13 = fW(R_13)
        Wm_13f = 1000*(qc*Lc^4/(30*EIc))
        Wm_13ok = if(met_w ≡ 1; gelijk(Wm_13; Wm_13f; sW); 1)
        ok_13 = Mv_13ok*Ms_13ok*Vm_13ok*Wm_13ok
        alles_ok = alles_ok*ok_13
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">13</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="6,16 6,5 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">driehoek, q bij de inklemming tot 0</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_13)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/6</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_13)'<br><span style="color:#6b7280; font-size:0.9em;">qL/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_13); "—")'<br><span style="color:#6b7280; font-size:0.9em;">qL⁴/(30EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_13 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_13 ≡ 1; "✓"; "✗")'</td></tr>
        #hide
        R_14 = ligger(gC(2; 0); lC(1; 0; Lc; 0; qc; 0; 0; 0); EIc)
        Mv_14 = fMv(R_14)
        Mv_14ok = gelijk(Mv_14; 0; sM)
        Ms_14 = fMs(R_14)
        Ms_14f = qc*Lc^2/3
        Ms_14ok = gelijk(Ms_14; Ms_14f; sM)
        Vm_14 = fV(R_14)
        Vm_14f = qc*Lc/2
        Vm_14ok = gelijk(Vm_14; Vm_14f; sV)
        Wm_14 = fW(R_14)
        Wm_14f = 1000*(11*qc*Lc^4/(120*EIc))
        Wm_14ok = if(met_w ≡ 1; gelijk(Wm_14; Wm_14f; sW); 1)
        ok_14 = Mv_14ok*Ms_14ok*Vm_14ok*Wm_14ok
        alles_ok = alles_ok*ok_14
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px; vertical-align:top;">14</td><td style="padding:1px 4px;"><svg viewbox="0 0 64 30" xmlns="http://www.w3.org/2000/svg" style="width:64px; height:30px;"><line x1="6" y1="18" x2="58" y2="18" style="stroke:#374151; stroke-width:2"/><rect x="2" y="10" width="4" height="16" style="fill:#9ca3af; stroke:#374151; stroke-width:0.8"/><polygon points="6,16 58,5 58,16" style="fill:rgba(4,120,87,0.25); stroke:#047857; stroke-width:0.8"/></svg><br><span style="font-size:0.9em;">driehoek, 0 bij de inklemming tot q</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">—</td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Ms_14)'<br><span style="color:#6b7280; font-size:0.9em;">qL²/3</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'r2(Vm_14)'<br><span style="color:#6b7280; font-size:0.9em;">qL/2</span></td><td style="padding:1px 4px; text-align:right; vertical-align:top;">'if(met_w ≡ 1; r2(Wm_14); "—")'<br><span style="color:#6b7280; font-size:0.9em;">11qL⁴/(120EI)</span></td><td style="padding:1px 4px; text-align:center; vertical-align:top; font-weight:700; color:'if(ok_14 ≡ 1; "#047857"; "#b91c1c")';">'if(ok_14 ≡ 1; "✓"; "✗")'</td></tr>
        '</table>
        'M<sub>veld</sub> met trek aan de onderzijde, M<sub>steun</sub> met trek aan de bovenzijde (bij een inklemming), beide als grootste waarde; V<sub>max</sub> is de grootste dwarskracht, gelijk aan de grootste oplegreactie; w<sub>max</sub> de grootste doorbuiging.<span class="alleen-scherm"> In de formules: a en b de afstanden van de puntlast tot de steunpunten, c de kleinste van beide.</span>
        #if alles_ok ≡ 0
            '<span style="color:#b91c1c">Een formule wijkt meer dan 0,1 % af van de liggeroplosser (✗); de waarde van de oplosser geldt.</span>
        #end if

        '<i>Geen toets: dit blad geeft de snedekrachten en doorbuigingen van de standaardgevallen, geen oordeel.</i>
    #end if
#end if
`;
