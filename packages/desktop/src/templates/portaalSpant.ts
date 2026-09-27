/**
 * Portaal en spant — één module voor een vlak raamwerk van staal of hout, in
 * plaats van losse bladen per kolom, regel en verbinding.
 *
 * Systemen: een portaal met twee scharnieren (scharnierende voeten), een
 * ingeklemd portaal (beide met een plat dak of een zadeldak met stijve nok),
 * een A-spant of zadelspant zonder kolommen (met een trekband van rond staal
 * op voethoogte of met twee vaste scharnieren, de nok scharnierend of stijf)
 * en een lessenaarspant (twee kolommen van ongelijke hoogte met een hellende
 * regel, voeten scharnierend of ingeklemd). De krachtsverdeling komt uit de
 * rekenkern: raamwerk() lost het raamwerk eerste orde op met de
 * verplaatsingsmethode (packages/core/src/raamwerk.ts, getoetst in
 * scripts/check-raamwerk-kern.mjs), raamwerk_acr() geeft de elastisch
 * kritieke belastingsfactor.
 *
 * Belastingen per m spant (h.o.h. a): het eigen gewicht en de dakopbouw
 * (permanent), de dakbelasting categorie H volgens tabel NB.4 – 6.10 of
 * ingevoerd, sneeuw met s_k = 0,70 kN/m² en μ_1 uit tabel 5.2 (bij een
 * zadeldak ook de gevallen (ii) en (iii) van figuur 5.3) of ingevoerd, en wind
 * met q_p uit de projectgegevens (windgebied, terreincategorie, z_e = de
 * nokhoogte) of ingevoerd, met c_pe per vlak als invoer en c_pi = +0,2 en
 * −0,3 (7.2.9(6)), van links en van rechts. Combinaties 6.10a en 6.10b met de
 * factoren van de gevolgklasse (tabel NB.4 en NB.5 – A1.2(B)); ψ_0 = 0 voor
 * dak, sneeuw en wind (tabel NB.2 – A1.1): één veranderlijke last per
 * combinatie, bij wind ook met 0,9·G.
 *
 * Stabiliteit in het vlak volgens 5.2.2(3)b en (5)B van NEN-EN 1993-1-1: de
 * eersteordeberekening met de scheefstand φ als horizontale knooplasten φ·V_Ed
 * in de knieën (5.3.2(3) en (7); bij hout φ uit (5.1) van NEN-EN 1995-1-1),
 * α_cr per combinatie, en bij α_cr < 10 alle krachten vergroot met
 * 1/(1 − 1/α_cr) (5.4) — ook het deel dat niet uit de scheefstand komt, aan
 * de veilige kant. α_cr volgt uit (5.2) met de zijdelingse verplaatsing uit de
 * oplosser (voor een portaal met een dakhelling tot 26° en een kleine
 * drukkracht in de regel, (5.3); anders valt het blad terug op de
 * knikberekening), of desgewenst uit de knikberekening van het hele raamwerk
 * (de definitie in 5.2.1(3)). De staven worden dan getoetst met de
 * systeemlengte als kniklengte in het vlak (5.2.2(7)b). Bij α_cr < 3 is een
 * nauwkeuriger tweedeordeberekening nodig: het blad voldoet dan niet. Het
 * A-spant is een driehoek en dus niet verplaatsbaar: eerste orde, kniklengte
 * gelijk aan de staaflengte (NB.NA.1.2(1)). Bij hout rekent de vergroting met
 * de rekenwaarde E_mean/γ_M (2.2.2(1)P) en geldt hij altijd (5.4.4).
 *
 * Toetsing staal (NEN-EN 1993-1-1 + NB), per staaf en per combinatie:
 * doorsnedeklasse bij N en M (tabel 5.2), doorsnede (6.9), (6.31)/(6.36) of
 * (6.42) met de vermindering voor dwarskracht (6.2.8, (1 − ρ)·f_y over de hele
 * doorsnede), dwarskracht (6.17), knik om beide assen (6.46), kip (6.54) met
 * M_cr volgens bijlage NB.NB en druk met buiging (6.61)/(6.62) met tabel B.2 en
 * C_m uit tabel B.3. Uit het vlak: de afstand tussen de zijdelingse steunen
 * van de buiten- of bovenrand voor knik en voor kip bij een positief moment,
 * die van de binnen- of onderrand (standaard de hele staaf) voor kip bij een
 * negatief moment, zoals bij de knie; ligt een steunafstand binnen de staaf, dan C_1 = 1,0 en C_mLT = 1,0 (aan
 * de veilige kant), anders C_1 uit tabel NB.NB.1 (eindmomenten) of, met een
 * last op de staaf, uit de momenten op de kwartpunten. De trekband
 * op trek, A·f_y/γ_M0; een trekband op druk voldoet niet.
 * Toetsing hout (NEN-EN 1995-1-1 + NB): trek of druk met buiging (6.17)/(6.19),
 * knik (6.23)/(6.24), kip (6.33)/(6.35) per gedrukte rand en afschuiving (6.13) met k_cr = 1,0,
 * met k_mod van de kortste last in de combinatie (dakbelasting middellang, aan
 * de veilige kant; sneeuw en wind kort).
 *
 * BGT volgens A1.4.3 van de NB bij NEN-EN 1990: de horizontale verplaatsing
 * van de knieën bij de karakteristieke combinatie ≤ h/300 (of h/150 voor een
 * industriegebouw), de bijkomende doorbuiging van het dak w_2 + w_3 ≤ l/250 en
 * desgewenst de eindstand w_max ≤ l/250; hout met k_def en met de
 * afschuifvervorming (κ·G_mean·A in de rekenkern). Bij het portaal is de
 * doorbuiging de verticale verplaatsing van de regel ten opzichte van de lijn
 * door de knieën (l = de overspanning), bij het A-spant en het lessenaarspant
 * die loodrecht op de staaf ten opzichte van zijn koorde (l = de staaflengte).
 *
 * Buiten dit blad: de verbindingen (knie, nok, voet, trekbandaansluiting), de
 * stabiliteit uit het vlak van het spant zelf (windverbanden), plooi van het
 * lijf, brand en de fundering.
 *
 * Op papier beknopt: de invoer, de tekening, de combinaties in één tabel en per
 * staafsoort één tabel met de maatgevende toetsen. Uitleg en details staan
 * alleen op het scherm. De profielen komen uit de gedeelde tabel
 * (components/calc/profielen.ts, matrix geplakt en bewaakt door
 * scripts/check-profielen.mjs).
 *
 * Voorbeelden met handberekening: scripts/check-portaal.mjs. Geen backticks
 * in dit commentaar: de controlescripts lezen het blad van de eerste tot de
 * laatste backtick.
 */

export const portaalSpant = `"Portaal en spant van staal of hout — raamwerk volgens EN 1993-1-1 of EN 1995-1-1

'<i>Eén blad voor een portaal met scharnierende of ingeklemde voeten, een A-spant (met of zonder trekband) en een lessenaarspant, in staal of hout. De rekenkern lost het raamwerk op met de verplaatsingsmethode en geeft de kritieke belastingsfactor α<sub>cr</sub>; het blad stelt de belastingen en combinaties samen, rekent de stabiliteit in het vlak met de scheefstand en de vergroting van (5.4) en toetst elke staaf.</i><span class="alleen-scherm"></span>

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
r2(x) = round(x; 2)
#show

# 1. Systeem en maten

@select materiaal "Materiaal"
  Staal = 1
  Hout = 2
@end
@select systeem "Systeem"
  Portaal met twee scharnieren (voeten scharnierend) = 1
  Ingeklemd portaal (voeten ingeklemd) = 2
  A-spant of zadelspant zonder kolommen = 3
  Lessenaarspant = 4
@end
#hide
staal = bool(materiaal ≡ 1)
#show
L_sp = ?*(m)', overspanning, hart op hart van de kolommen of opleggingen<span class="kolom-3"></span>'
#if systeem ≡ 3
    #hide
    H_k = 0 m
    #show
#else if systeem ≡ 4
    H_k = ?*(m)', hoogte van de lage kolom, voet tot hart regel<span class="kolom-3"></span>'
#else
    H_k = ?*(m)', kolomhoogte, voet tot hart regel<span class="kolom-3"></span>'
#end if
α_dak = ?*(deg)', dakhelling<span class="alleen-scherm"> (0 = plat)</span><span class="kolom-3"></span>'
a_sp = ?*(m)', hart-op-hartafstand van de spanten<span class="kolom-3"></span>'
#if systeem ≡ 3
    @select trekband "Opleggingen van het A-spant"
      Trekband van rond staal S235 op voethoogte, rol onder de rechter oplegging = 1
      Geen trekband, twee vaste scharnieren = 0
    @end
    @select nok "Verbinding in de nok"
      Scharnier = 1
      Stijf = 0
    @end
    #if trekband ≡ 1
        d_tb = ?*(mm)', diameter van de trekband<span class="kolom-3"></span>'
    #else
        #hide
        d_tb = 0 mm
        #show
    #end if
    #hide
    voet = 0
    #show
#else
    #if systeem ≡ 4
        @select voet "Voeten van de kolommen"
          Scharnierend = 0
          Ingeklemd = 1
        @end
    #else
        #hide
        voet = bool(systeem ≡ 2)
        #show
    #end if
    #hide
    trekband = 0
    nok = 0
    d_tb = 0 mm
    #show
#end if
#if systeem ≠ 3
    a_zk = ?*(m)', kolom: afstand tussen de zijdelingse steunen van de buitenflens of -rand (gevelregels), knik uit het vlak en kip bij druk buiten (0 = alleen de einden)<span class="kolom-3"></span>'
    a_zk,i = ?*(m)', kolom: afstand tussen de steunen van de binnenflens of -rand (kopschoren), kip bij druk binnen (0 = geen: de hele kolom)<span class="kolom-3"></span>'
#else
    #hide
    a_zk = 0 m
    a_zk,i = 0 m
    #show
#end if
a_zr = ?*(m)', regel of spoor: afstand tussen de zijdelingse steunen van de bovenflens of -rand (gordingen, tengels), knik uit het vlak en kip bij druk boven (0 = alleen de einden)<span class="kolom-3"></span>'
a_zr,o = ?*(m)', regel of spoor: afstand tussen de steunen van de onderflens of -rand (kopschoren), kip bij druk onder, zoals bij de knie (0 = geen: de hele staaf)<span class="kolom-3"></span>'

#hide
Ln = max(L_sp/(1 m); 0)
Hn = max(H_k/(1 m); 0)
a_deg = α_dak/(1 deg)
ta = tan(α_dak)
an = max(a_sp/(1 m); 0)
dtb = max(d_tb/(1 m); 0)
'Hoogte van de nok (portaal, A-spant) of van de hoge kolom (lessenaarspant).
f_n = if(systeem ≡ 4; Ln*ta; Ln/2*ta)
H2n = if(systeem ≡ 4; Hn + f_n; Hn)
ok_hel = if(systeem ≡ 3; bool(a_deg ≥ 5 and a_deg ≤ 75); bool(a_deg ≥ 0 and a_deg ≤ 45))
ok_inv = bool(Ln > 0 and an > 0)*if(systeem ≡ 3; bool(trekband ≡ 0 or dtb > 0); bool(Hn > 0))*ok_hel
#show
#if ok_inv ≡ 0
    '<span style="color:#b45309">Vul de overspanning, de h.o.h.-afstand'if(systeem ≡ 3; if(trekband ≡ 1; " en de diameter van de trekband"; ""); " en de kolomhoogte")' in, met een dakhelling 'if(systeem ≡ 3; "van 5° tot en met 75°"; "van 0° tot en met 45°")'; zonder dat valt er niets te rekenen.</span>
#end if

# 2. Doorsnede en materiaal

#if staal ≡ 1
    #if systeem ≠ 3
        @select profiel_k "Profiel van de kolommen"
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
    #else
        #hide
        profiel_k = 24
        #show
    #end if
    @select profiel_r "Profiel van de regel of de sporen"
      IPE 300 = 24
      IPE 200 = 21
      IPE 240 = 22
      IPE 270 = 23
      IPE 330 = 25
      IPE 360 = 26
      IPE 400 = 27
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
    @end
    @select staalsoort "Staalsoort"
      S235 = 235
      S275 = 275
      S355 = 355
    @end
    #hide
    'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
    profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |96; 114; 133; 152; 171; 190; 210; 230; 250; 290; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 135; 150; 160; 170; 180 |5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 14; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 15; 15; 15; 18; 18; 21 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |349.2; 606.2; 1033; 1673; 2510; 3692; 5410; 7763; 10450; 18260; 449.5; 864.4; 1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 104.2; 165.2; 245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 167.3; 317.5; 549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 51.42; 80.97; 119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |2580; 6470; 15060; 31410; 60210; 108000; 193300; 328500; 516400; 1200000; 3380; 9410; 22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
    'Per staafsoort (1 kolom, 2 regel of spoor) de grootheden als kale getallen in m.
    pk(j) = hlookup(profielen; profiel_k; 1; j)
    pr(j) = hlookup(profielen; profiel_r; 1; j)
    h_1 = pk(2)/1000
    b_1 = pk(3)/1000
    tw_1 = pk(4)/1000
    tf_1 = pk(5)/1000
    rr_1 = pk(6)/1000
    A_1 = pk(7)*10^-4
    Iy_1 = pk(8)*10^-8
    Wel_1 = pk(9)*10^-6
    Wpl_1 = pk(10)*10^-6
    Avz_1 = pk(12)*10^-4
    Iz_1 = pk(13)*10^-8
    It_1 = pk(17)*10^-8
    Iw_1 = pk(18)*10^-12
    h_2 = pr(2)/1000
    b_2 = pr(3)/1000
    tw_2 = pr(4)/1000
    tf_2 = pr(5)/1000
    rr_2 = pr(6)/1000
    A_2 = pr(7)*10^-4
    Iy_2 = pr(8)*10^-8
    Wel_2 = pr(9)*10^-6
    Wpl_2 = pr(10)*10^-6
    Avz_2 = pr(12)*10^-4
    Iz_2 = pr(13)*10^-8
    It_2 = pr(17)*10^-8
    Iw_2 = pr(18)*10^-12
    f_y = staalsoort*1 N/mm^2
    fy_n = staalsoort*1000
    ε = sqrt(235/staalsoort)
    E_n = 210*10^6
    G_n = 81*10^6
    E_bgt = E_n
    γ_M0 = 1.0
    γ_M1 = 1.0
    γ_M = 1.0
    'Eigen gewicht 78,5 kN/m³; per staafsoort in kN/m.
    ge_1 = 78.5*A_1
    ge_2 = 78.5*A_2
    k_def = 0
    'Staal: geen afschuifvervorming (te verwaarlozen bij gewalste profielen).
    GA_1 = 0
    GA_2 = 0
    #show
    '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 6px; text-align:left;">Staaf</th><th style="padding:1px 6px; text-align:right;">A [cm²]</th><th style="padding:1px 6px; text-align:right;">I<sub>y</sub> [cm⁴]</th><th style="padding:1px 6px; text-align:right;">W<sub>pl,y</sub> [cm³]</th><th style="padding:1px 6px; text-align:right;">I<sub>z</sub> [cm⁴]</th><th style="padding:1px 6px; text-align:right;">I<sub>t</sub> [cm⁴]</th><th style="padding:1px 6px; text-align:right;">I<sub>w</sub> [cm⁶]</th></tr>
    #if systeem ≠ 3
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 6px;">kolommen</td><td style="padding:0 6px; text-align:right;">'pk(7)'</td><td style="padding:0 6px; text-align:right;">'pk(8)'</td><td style="padding:0 6px; text-align:right;">'pk(10)'</td><td style="padding:0 6px; text-align:right;">'pk(13)'</td><td style="padding:0 6px; text-align:right;">'pk(17)'</td><td style="padding:0 6px; text-align:right;">'pk(18)'</td></tr>
    #end if
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 6px;">'if(systeem ≡ 3; "sporen"; "regel")'</td><td style="padding:0 6px; text-align:right;">'pr(7)'</td><td style="padding:0 6px; text-align:right;">'pr(8)'</td><td style="padding:0 6px; text-align:right;">'pr(10)'</td><td style="padding:0 6px; text-align:right;">'pr(13)'</td><td style="padding:0 6px; text-align:right;">'pr(17)'</td><td style="padding:0 6px; text-align:right;">'pr(18)'</td></tr>
    '</table>
    f_y', tabel 3.1 (t ≤ 40 mm)<span class="kolom-3"></span>'
    'E = 210 000 N/mm², G = 81 000 N/mm², γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0 (NB bij 6.1(1)).
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
    #if systeem ≠ 3
        b_kol = ?*(mm)', kolom: breedte<span class="kolom-4"></span>'
        h_kol = ?*(mm)', kolom: hoogte in het vlak van het spant<span class="kolom-4"></span>'
    #else
        #hide
        b_kol = 100 mm
        h_kol = 100 mm
        #show
    #end if
    b_reg = ?*(mm)', regel of spoor: breedte<span class="kolom-4"></span>'
    h_reg = ?*(mm)', regel of spoor: hoogte in het vlak van het spant<span class="kolom-4"></span>'
    #hide
    'Materiaal [id, f_m,k, f_t,0,k, f_c,0,k, f_v,k, f_c,90,k, E_0,mean, E_0,05, ρ_mean, γ_M, gelamineerd, G_mean]:
    'EN 338 voor C18 tot en met C30, EN 14080 voor GL24h en GL28h.
    materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |11; 14; 18; 19.2; 22.3 |18; 21; 23; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |2.2; 2.5; 2.7; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600 |6000; 7400; 8000; 9600; 10500 |380; 420; 460; 420; 460 |1.30; 1.30; 1.30; 1.25; 1.25 |0; 0; 0; 1; 1 |560; 690; 750; 650; 650]
    f_mk = hlookup(materialen; houtklasse; 1; 2)
    f_t0k = hlookup(materialen; houtklasse; 1; 3)
    f_c0k = hlookup(materialen; houtklasse; 1; 4)
    f_vk = hlookup(materialen; houtklasse; 1; 5)
    E_0m = hlookup(materialen; houtklasse; 1; 7)
    E_005 = hlookup(materialen; houtklasse; 1; 8)
    ρ_m = hlookup(materialen; houtklasse; 1; 9)
    γ_M = hlookup(materialen; houtklasse; 1; 10)
    gl = hlookup(materialen; houtklasse; 1; 11)
    G_m = hlookup(materialen; houtklasse; 1; 12)
    β_c = if(gl ≡ 1; 0.1; 0.2)
    k_def = if(klimaat ≡ 1; 0.6; if(klimaat ≡ 2; 0.8; 2.0))
    'k_mod per belastingsduurklasse d (tabel 3.1): 1 blijvend, 3 middellang, 4 kort.
    k_mod(d) = if(klimaat ≡ 3; if(d ≡ 1; 0.5; if(d ≡ 3; 0.65; 0.7)); if(d ≡ 1; 0.6; if(d ≡ 3; 0.8; 0.9)))
    b_1 = max(b_kol/(1 m); 10^-6)
    h_1 = max(h_kol/(1 m); 10^-6)
    b_2 = max(b_reg/(1 m); 10^-6)
    h_2 = max(h_reg/(1 m); 10^-6)
    A_1 = b_1*h_1
    A_2 = b_2*h_2
    Iy_1 = b_1*h_1^3/12
    Iy_2 = b_2*h_2^3/12
    Wel_1 = b_1*h_1^2/6
    Wel_2 = b_2*h_2^2/6
    'Hoogtefactor op f_m,k: massief §3.2(3) bij h < 150 mm, gelamineerd §3.3(3) bij h < 600 mm.
    kh(hm) = if(gl ≡ 1; if(hm < 0.6; min(1.1; (0.6/hm)^0.1); 1); if(hm < 0.15; min(1.3; (0.15/hm)^0.2); 1))
    E_n = E_0m*1000
    E_bgt = E_n
    'Afschuifstijfheid κ·G_mean·A (kN) met κ = 5/6: de afschuifvervorming telt mee (2.2.3(1)P).
    GA_1 = 5/6*G_m*1000*A_1
    GA_2 = 5/6*G_m*1000*A_2
    ge_1 = ρ_m*9.81*A_1/1000
    ge_2 = ρ_m*9.81*A_2/1000
    #show
    '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 6px; text-align:left;">'if(houtklasse ≥ 4; "gelamineerd"; "massief")'</th><th style="padding:1px 6px; text-align:right;">f<sub>m,k</sub></th><th style="padding:1px 6px; text-align:right;">f<sub>t,0,k</sub></th><th style="padding:1px 6px; text-align:right;">f<sub>c,0,k</sub></th><th style="padding:1px 6px; text-align:right;">f<sub>v,k</sub></th><th style="padding:1px 6px; text-align:right;">E<sub>0,mean</sub></th><th style="padding:1px 6px; text-align:right;">E<sub>0,05</sub> [N/mm²]</th><th style="padding:1px 6px; text-align:right;">ρ<sub>mean</sub> [kg/m³]</th><th style="padding:1px 6px; text-align:right;">γ<sub>M</sub></th><th style="padding:1px 6px; text-align:right;">k<sub>def</sub></th></tr>
    '<tr><td style="padding:0 6px;"></td><td style="padding:0 6px; text-align:right;">'f_mk'</td><td style="padding:0 6px; text-align:right;">'f_t0k'</td><td style="padding:0 6px; text-align:right;">'f_c0k'</td><td style="padding:0 6px; text-align:right;">'f_vk'</td><td style="padding:0 6px; text-align:right;">'E_0m'</td><td style="padding:0 6px; text-align:right;">'E_005'</td><td style="padding:0 6px; text-align:right;">'ρ_m'</td><td style="padding:0 6px; text-align:right;">'γ_M'</td><td style="padding:0 6px; text-align:right;">'k_def'</td></tr>
    '</table>
#end if
#hide
'Trekband van rond staal S235: E = 210 000 N/mm², f_y = 235 N/mm².
A_tb = pi*dtb^2/4
EA_tb = 210*10^6*max(A_tb; 10^-9)
EI_tb = 210*10^6*max(pi*dtb^4/64; 10^-14)
#show

# 3. Belastingen

'<i>Karakteristieke waarden. De vlaklasten gaan met de h.o.h.-afstand a naar een lijnlast op het spant: de dakopbouw en de dakbelasting per m² dakvlak, sneeuw per m² grondvlak, wind loodrecht op wand en dak. ψ<sub>0</sub> = 0 voor dak, sneeuw en wind (tabel NB.2 – A1.1): in elke combinatie staat één veranderlijke last.</i><span class="alleen-scherm"></span>
g_dak = ?*(kN/m^2)', dakopbouw per m² dakvlak, zonder het spant zelf<span class="kolom-3"></span>'
@select dakbel "Dakbelasting, categorie H"
  Volgens tabel NB.4 – 6.10 van de NB bij NEN-EN 1991-1-1 = 1
  Invoeren, per m² dakvlak = 2
  Geen = 0
@end
#if dakbel ≡ 2
    q_dak,in = ?*(kN/m^2)'<span class="kolom-3"></span>'
#else
    #hide
    q_dak,in = 0 kN/m^2
    #show
#end if
@select sneeuwbel "Sneeuw"
  Volgens NEN-EN 1991-1-3: s_k = 0,70 kN/m², μ_1 uit tabel 5.2 = 1
  Invoeren, per m² grondvlak = 2
  Geen = 0
@end
#if sneeuwbel ≡ 2
    s_in = ?*(kN/m^2)'<span class="kolom-3"></span>'
#else
    #hide
    s_in = 0 kN/m^2
    #show
#end if
@select windbel "Wind"
  q_p uit de projectgegevens (windgebied en terreincategorie), z_e = de nokhoogte = 1
  q_p invoeren = 2
  Geen = 0
@end
#if windbel ≡ 2
    q_p,in = ?*(kN/m^2)'<span class="kolom-3"></span>'
#else
    #hide
    q_p,in = 0 kN/m^2
    #show
#end if
#if windbel ≥ 1
    '<i>c<sub>pe,10</sub> per vlak, met het teken van de norm (druk positief, zuiging negatief): wanden uit tabel 7.1 (zone D en E), het dak uit tabel 7.2, 7.3a of 7.4a. c<sub>pi</sub> = +0,2 en −0,3 worden beide beschouwd (7.2.9(6)).</i><span class="alleen-scherm"></span>
    #if systeem ≠ 3
        c_pe,D = ?', gevel aan de windzijde (zone D)<span class="kolom-4"></span>'
        c_pe,E = ?', gevel aan de lijzijde (zone E)<span class="kolom-4"></span>'
    #else
        #hide
        c_pe,D = 0
        c_pe,E = 0
        #show
    #end if
    #if systeem ≡ 4
        c_pe,1 = ?', dak bij wind op de lage gevel<span class="kolom-4"></span>'
        c_pe,2 = ?', dak bij wind op de hoge gevel<span class="kolom-4"></span>'
    #else
        c_pe,1 = ?', dakvlak aan de windzijde<span class="kolom-4"></span>'
        c_pe,2 = ?', dakvlak aan de lijzijde<span class="kolom-4"></span>'
    #end if
#else
    #hide
    c_pe,D = 0
    c_pe,E = 0
    c_pe,1 = 0
    c_pe,2 = 0
    #show
#end if

#if ok_inv ≡ 1
    '<h6>Permanent<span class="alleen-scherm"></span></h6>
    #hide
    g_kol = ge_1*kN/m
    g_reg = ge_2*kN/m
    #show
    #if systeem ≠ 3
        g_kol', eigen gewicht kolom<span class="kolom-3"></span>'
    #end if
    g_reg', eigen gewicht regel of spoor<span class="kolom-3"></span>'
    g_d = g_dak*a_sp to kN/m', dakopbouw per m regel of spoor<span class="kolom-3"></span>'
    '<h6>Dakbelasting en sneeuw<span class="alleen-scherm"></span></h6>
    #if dakbel ≡ 1
        #if a_deg < 15
            q_k = 1.0 kN/m^2', tabel NB.4 – 6.10<span class="alleen-scherm">, α &lt; 15°, per m² dakvlak</span><span class="kolom-3"></span>'
        #else if a_deg < 20
            q_k = (4 - 0.2*a_deg)*(kN/m^2)', tabel NB.4 – 6.10<span class="alleen-scherm">, 15° ≤ α &lt; 20°</span><span class="kolom-3"></span>'
        #else
            q_k = 0 kN/m^2', tabel NB.4 – 6.10<span class="alleen-scherm">, α ≥ 20°</span><span class="kolom-3"></span>'
        #end if
    #else
        #hide
        q_k = q_dak,in
        #show
        #if dakbel ≡ 2
            q_k'<span class="kolom-3"></span>'
        #end if
    #end if
    #if sneeuwbel ≡ 1
        #if DesignLife > 50
            #hide
            f_sn = (1 - 0.8*sqrt(6)/pi*(log(-log(1 - 1/DesignLife)) + 0.57722))/(1 + 2.5923*0.8)
            #show
            s_k = f_sn*0.70 kN/m^2', NEN-EN 1991-1-3<span class="alleen-scherm">: grondwaarde 0,70 aangepast met (D.1) en V = 0,8, ontwerplevensduur boven 50 jaar</span><span class="kolom-3"></span>'
        #else
            s_k = 0.70 kN/m^2', NEN-EN 1991-1-3<span class="alleen-scherm">, grondwaarde (NB bij 4.1)</span><span class="kolom-3"></span>'
        #end if
        #hide
        μ1_n = if(a_deg ≤ 30; 0.8; if(a_deg < 60; 0.8*(60 - a_deg)/30; 0))
        #show
        μ_1 = μ1_n', tabel 5.2<span class="alleen-scherm">, C<sub>e</sub> = C<sub>t</sub> = 1</span><span class="kolom-3"></span>'
        s_dak = μ_1*s_k', per m² grondvlak<span class="kolom-3"></span>'
    #else
        #hide
        s_dak = s_in
        #show
        #if sneeuwbel ≡ 2
            s_dak'<span class="kolom-3"></span>'
        #end if
    #end if
    #hide
    'Sneeuw ongelijk verdeeld (figuur 5.3, gevallen (ii) en (iii)): alleen bij een zadeldak.
    asym = bool(systeem ≠ 4)*bool(a_deg > 0)
    #show
    #if windbel ≥ 1
        '<h6>Wind (NEN-EN 1991-1-4)<span class="alleen-scherm"></span></h6>
        #if windbel ≡ 1
            #hide
            'Tabel NB.1: basiswindsnelheid; tabel NB.3 – 4.1: z_0 en z_min per terreincategorie.
            vb0_n = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
            z0_n = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
            zmin_n = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
            ze_n = max(if(systeem ≡ 3; f_n; H2n + if(systeem ≡ 4; 0; f_n)); zmin_n)
            'Opmerking 4 bij 4.2 en tabel NB.2: c_prob bij een ontwerplevensduur boven 50 jaar, p = 1/t, n = 0,5.
            K_prob = if(windgebied ≡ 1; 0.2; if(windgebied ≡ 2; 0.234; 0.281))
            t_prob = max(DesignLife; 50)
            cprob_n = sqrt((1 - K_prob*log(-log(1 - 1/t_prob)))/(1 - K_prob*log(-log(0.98))))
            vm_n = 0.19*(z0_n/0.05)^0.07*log(ze_n/z0_n)*cprob_n*vb0_n
            Iv_n = 1/log(ze_n/z0_n)
            qp_n = (1 + 7*Iv_n)*0.5*1.25*vm_n^2/1000
            v_b0 = vb0_n*(m/s)
            z_e = ze_n*m
            #show
            v_b0', tabel NB.1<span class="kolom-4"></span>'
            z_e', nokhoogte, ten minste z<sub>min</sub><span class="kolom-4"></span>'
            q_p = qp_n*(kN/m^2)', (4.8), c<sub>o</sub> = 1<span class="kolom-4"></span>'
        #else
            #hide
            qp_n = max(q_p,in/(1 kN/m^2); 0)
            q_p = qp_n*(kN/m^2)
            #show
            q_p'<span class="kolom-4"></span>'
        #end if
    #else
        #hide
        qp_n = 0
        #show
    #end if
    #hide
    q_n = max(q_k/(1 kN/m^2); 0)*an
    s_n = max(s_dak/(1 kN/m^2); 0)*an
    gd_n = max(g_dak/(1 kN/m^2); 0)*an
    wq_n = qp_n*an
    #show

    # 4. Raamwerk

    #hide
    'Knopen: 1 voet links, 2 knie links (A-spant: nok), 3 nok (A-spant: voet rechts; lessenaarspant: knie rechts), 4 knie rechts (lessenaarspant: voet rechts), 5 voet rechts.
    X_1 = 0
    Y_1 = 0
    X_2 = if(systeem ≡ 3; Ln/2; 0)
    Y_2 = if(systeem ≡ 3; f_n; Hn)
    X_3 = if(systeem ≡ 3; Ln; if(systeem ≡ 4; Ln; Ln/2))
    Y_3 = if(systeem ≡ 3; 0; if(systeem ≡ 4; H2n; Hn + f_n))
    X_4 = if(systeem ≤ 2; Ln; if(systeem ≡ 4; Ln; 0))
    Y_4 = if(systeem ≤ 2; Hn; 0)
    X_5 = if(systeem ≤ 2; Ln; 0)
    Y_5 = 0
    kn = [X_1; X_2; X_3; X_4; X_5 | Y_1; Y_2; Y_3; Y_4; Y_5]
    'Staafsoort per staaf: 1 kolom, 2 regel of spoor, 3 trekband, 0 geen; staven met de klok mee.
    vT = if(systeem ≡ 3; [2; 2; 3*trekband; 0]; if(systeem ≡ 4; [1; 2; 1; 0]; [1; 2; 2; 1]))
    EI_1 = E_n*Iy_1
    EI_2 = E_n*Iy_2
    EA_1 = E_n*A_1
    EA_2 = E_n*A_2
    EIs(t) = if(t ≡ 1; EI_1; if(t ≡ 2; EI_2; EI_tb))
    EAs(t) = if(t ≡ 1; EA_1; if(t ≡ 2; EA_2; EA_tb))
    GAs(t) = if(t ≡ 1; GA_1; if(t ≡ 2; GA_2; 0))
    'Begin- en eindknoop per staaf.
    vI = if(systeem ≡ 3; [1; 2; 3*trekband; 0]; if(systeem ≡ 4; [1; 2; 3; 0]; [1; 2; 3; 4]))
    vJ = if(systeem ≡ 3; [2; 3; 1*trekband; 0]; if(systeem ≡ 4; [2; 3; 4; 0]; [2; 3; 4; 5]))
    'Scharnier aan het eind van de eerste spoor bij een scharnierende nok; de trekband scharnierend aan beide einden.
    'Per staaf de knopen, de stijfheden en de scharnieren als losse getallen: in een matrix staan alleen namen.
    nI_1 = vI.(1)
    nI_2 = vI.(2)
    nI_3 = vI.(3)
    nI_4 = vI.(4)
    nJ_1 = vJ.(1)
    nJ_2 = vJ.(2)
    nJ_3 = vJ.(3)
    nJ_4 = vJ.(4)
    sEI_1 = EIs(vT.(1))
    sEI_2 = EIs(vT.(2))
    sEI_3 = EIs(vT.(3))
    sEI_4 = EIs(vT.(4))
    sEA_1 = EAs(vT.(1))
    sEA_2 = EAs(vT.(2))
    sEA_3 = EAs(vT.(3))
    sEA_4 = EAs(vT.(4))
    sGA_1 = GAs(vT.(1))
    sGA_2 = GAs(vT.(2))
    sGA_3 = GAs(vT.(3))
    sGA_4 = GAs(vT.(4))
    hI_3 = bool(vT.(3) ≡ 3)
    hJ_1 = if(systeem ≡ 3; nok; 0)
    st = [nI_1; nI_2; nI_3; nI_4 | nJ_1; nJ_2; nJ_3; nJ_4 | sEI_1; sEI_2; sEI_3; sEI_4 | sEA_1; sEA_2; sEA_3; sEA_4 | 0; 0; hI_3; 0 | hJ_1; 0; hI_3; 0 | sGA_1; sGA_2; sGA_3; sGA_4]
    'Opleggingen: [knoop, x, y, rotatie].
    kR = if(systeem ≡ 3; 3; if(systeem ≡ 4; 4; 5))
    opl = [1; kR | 1; 1 - trekband | 1; 1 | voet; voet]
    'Lengte per staaf; de knieën (knopen met de horizontale knooplasten), de dakvlakken.
    'if() rekent beide takken uit: een index 0 moet daarom ook zonder de if geldig blijven.
    Lsv(i; j) = sqrt((kn.(j; 1) - kn.(i; 1))^2 + (kn.(j; 2) - kn.(i; 2))^2)
    Ls(i; j) = bool(i ≥ 1)*bool(j ≥ 1)*Lsv(max(i; 1); max(j; 1))
    vL = [Ls(vI.(1); vJ.(1)); Ls(vI.(2); vJ.(2)); Ls(vI.(3); vJ.(3)); Ls(vI.(4); vJ.(4))]
    knL = if(systeem ≡ 3; 0; 2)
    knR = if(systeem ≡ 3; 0; if(systeem ≡ 4; 3; 4))
    nrL = if(systeem ≡ 3; 1; 2)
    nrR = if(systeem ≡ 3; 2; if(systeem ≡ 4; 0; 3))
    LrL = vL.(nrL)
    kL(k) = vL.(k)
    LrR = bool(nrR ≥ 1)*kL(max(nrR; 1))
    'Belaste vlakken (1 = kolom of dakvlak, 0 = trekband of geen) en de c_pe per staaf bij wind van links (WL) en van rechts (WR).
    opp(k) = bool(vT.(k) ≡ 1 or vT.(k) ≡ 2)
    cWL = if(systeem ≡ 3; [c_pe,1; c_pe,2; 0; 0]; if(systeem ≡ 4; [c_pe,D; c_pe,1; c_pe,E; 0]; [c_pe,D; c_pe,1; c_pe,2; c_pe,E]))
    cWR = if(systeem ≡ 3; [c_pe,2; c_pe,1; 0; 0]; if(systeem ≡ 4; [c_pe,E; c_pe,2; c_pe,D; 0]; [c_pe,E; c_pe,2; c_pe,1; c_pe,D]))
    wL(k; ci) = opp(k)*(cWL.(k) - ci)*wq_n
    wR(k; ci) = opp(k)*(cWR.(k) - ci)*wq_n
    'Permanent per staaf: eigen gewicht, bij een regel of spoor met de dakopbouw.
    gp(k) = if(vT.(k) ≡ 1; ge_1; if(vT.(k) ≡ 2; ge_2 + gd_n; 0))
    'Lastmatrix, rijen [staaf of knoop, soort, a, b, q_a, q_b, richting]:
    '  1–4 permanent per staaf; 5–6 dakbelasting links en rechts; 7–8 sneeuw links en rechts;
    '  9–12 wind van links met c_pi = +0,2; 13–16 idem −0,3; 17–20 wind van rechts +0,2; 21–24 idem −0,3;
    '  25–26 horizontale knooplast 0,5 in elke knie (samen 1: de scheefstand en de zijdelingse stijfheid).
    Ls_1 = vL.(1)
    Ls_2 = vL.(2)
    Ls_3 = vL.(3)
    Ls_4 = vL.(4)
    gp_1 = gp(1)
    gp_2 = gp(2)
    gp_3 = gp(3)
    gp_4 = gp(4)
    wa_1 = wL(1; 0.2)
    wa_2 = wL(2; 0.2)
    wa_3 = wL(3; 0.2)
    wa_4 = wL(4; 0.2)
    wb_1 = wL(1; -0.3)
    wb_2 = wL(2; -0.3)
    wb_3 = wL(3; -0.3)
    wb_4 = wL(4; -0.3)
    wc_1 = wR(1; 0.2)
    wc_2 = wR(2; 0.2)
    wc_3 = wR(3; 0.2)
    wc_4 = wR(4; 0.2)
    wd_1 = wR(1; -0.3)
    wd_2 = wR(2; -0.3)
    wd_3 = wR(3; -0.3)
    wd_4 = wR(4; -0.3)
    last = [1; 2; 3; 4; nrL; nrR; nrL; nrR; 1; 2; 3; 4; 1; 2; 3; 4; 1; 2; 3; 4; 1; 2; 3; 4; knL; knR | 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 3; 3 | 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0 | Ls_1; Ls_2; Ls_3; Ls_4; LrL; LrR; LrL; LrR; Ls_1; Ls_2; Ls_3; Ls_4; Ls_1; Ls_2; Ls_3; Ls_4; Ls_1; Ls_2; Ls_3; Ls_4; Ls_1; Ls_2; Ls_3; Ls_4; 0; 0 | gp_1; gp_2; gp_3; gp_4; q_n; q_n; s_n; s_n; wa_1; wa_2; wa_3; wa_4; wb_1; wb_2; wb_3; wb_4; wc_1; wc_2; wc_3; wc_4; wd_1; wd_2; wd_3; wd_4; 0.5; 0.5 | gp_1; gp_2; gp_3; gp_4; q_n; q_n; s_n; s_n; wa_1; wa_2; wa_3; wa_4; wb_1; wb_2; wb_3; wb_4; wc_1; wc_2; wc_3; wc_4; wd_1; wd_2; wd_3; wd_4; 0; 0 | 2; 2; 2; 2; 2; 2; 3; 3; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 4; 1; 1]
    status = raamwerk_status(kn; st; opl)
    #show
    #if status ≡ -1
        '<span style="color:#b91c1c"><b>Het spant is beweeglijk</b>: kies een stijve nok of een trekband bij twee vaste scharnieren, of ingeklemde voeten.</span>
    #end if
    #hide
    'Tekening: het spant over ten hoogste 360 × 170 px.
    Ymax = max(Y_2; Y_3; Y_4; 0.001)
    sc = min(360/max(Ln; 0.001); 170/Ymax)
    gX(x) = 60 + sc*x
    gY(y) = 22 + sc*(Ymax - y)
    'Coördinaten van knoop i; een index binnen een index rekent de kern niet uit.
    Xn(i) = if(i ≡ 1; X_1; if(i ≡ 2; X_2; if(i ≡ 3; X_3; if(i ≡ 4; X_4; X_5))))
    Yn(i) = if(i ≡ 1; Y_1; if(i ≡ 2; Y_2; if(i ≡ 3; Y_3; if(i ≡ 4; Y_4; Y_5))))
    sH = 22 + sc*Ymax + 44
    #show
    '<svg viewbox="0 0 480 'sH'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'sH + 16'px;">
    #for k = 1 : 4
        #if vT.(k) ≥ 1
            '<line x1="'gX(Xn(vI.(k)))'" y1="'gY(Yn(vI.(k)))'" x2="'gX(Xn(vJ.(k)))'" y2="'gY(Yn(vJ.(k)))'" style="stroke:'if(vT.(k) ≡ 3; "#6b7280"; "#374151")'; stroke-width:'if(vT.(k) ≡ 3; 1.5; 4)'; stroke-linecap:round"/>
            '<text x="'(gX(Xn(vI.(k))) + gX(Xn(vJ.(k))))/2 + 6'" y="'(gY(Yn(vI.(k))) + gY(Yn(vJ.(k))))/2 - 5'" style="fill:#1e40af; font-weight:700">'k'</text>
        #end if
    #loop
    #for i = 1 : 2
        #hide
        kq = opl.(i; 1)
        #show
        #if voet ≡ 1
            '<rect x="'gX(kn.(kq; 1)) - 11'" y="'gY(kn.(kq; 2)) + 2'" width="22" height="7" style="fill:#9ca3af; stroke:#374151; stroke-width:1"/>
        #else
            '<polygon points="'gX(kn.(kq; 1))','gY(kn.(kq; 2)) + 2' 'gX(kn.(kq; 1)) - 8','gY(kn.(kq; 2)) + 14' 'gX(kn.(kq; 1)) + 8','gY(kn.(kq; 2)) + 14'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
            #if opl.(i; 2) ≡ 0
                '<line x1="'gX(kn.(kq; 1)) - 10'" y1="'gY(kn.(kq; 2)) + 18'" x2="'gX(kn.(kq; 1)) + 10'" y2="'gY(kn.(kq; 2)) + 18'" style="stroke:#92400e; stroke-width:1.2"/>
            #end if
        #end if
    #loop
    #if systeem ≡ 3
        #if nok ≡ 1
            '<circle cx="'gX(X_2)'" cy="'gY(Y_2)'" r="4" style="fill:#ffffff; stroke:#374151; stroke-width:1.4"/>
        #end if
    #end if
    '<line x1="'gX(0)'" y1="'sH - 12'" x2="'gX(Ln)'" y2="'sH - 12'" style="stroke:#1E40AF; stroke-width:1"/>
    '<text x="'gX(Ln/2)'" y="'sH - 16'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">'r2(Ln)' m</text>
    #if systeem ≠ 3
        '<text x="'gX(0) - 8'" y="'gY(Hn/2)'" text-anchor="end" style="fill:#1E40AF; font-weight:700">'r2(Hn)' m</text>
    #end if
    #if a_deg > 0
        '<text x="'gX(if(systeem ≡ 4; Ln/2; Ln/4))'" y="'gY(if(systeem ≡ 3; f_n/2; Hn + f_n/2)) - 10'" text-anchor="middle" style="fill:#1E40AF">'r2(a_deg)'°</text>
    #end if
    '</svg>'
    '<span class="alleen-scherm">Blauw: staafnummer. Driehoek: scharnierende voet (met streep: rol), blok: inklemming, rondje: scharnier. De staven zijn met de klok mee genummerd; M is positief bij trek aan de binnenzijde.</span>

    #if status ≡ 1
        # 5. Combinaties en stabiliteit in het vlak

        @select methode "α_cr, de kritieke belastingsfactor"
          Met (5.2): α_cr = (H_Ed/V_Ed)·(h/δ_H,Ed), de zijdelingse verplaatsing uit de oplosser = 1
          Uit de knikberekening van het hele raamwerk = 2
        @end
        'Gevolgklasse CC'CC', factoren uit NEN-EN 1990 tabel 'if(CC ≡ 2; "NB.4"; "NB.5")' — A1.2(B), 6.10a en 6.10b<span class="alleen-scherm">; bij wind ook de permanente last gunstig met 0,9</span>.
        #hide
        γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
        γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
        γ_G,a = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
        'Combinaties: 1 6.10a; 2 dak; 3 sneeuw; 4–5 sneeuw ongelijk; 6–9 wind van links (c_pi +0,2 en −0,3, G ongunstig en gunstig); 10–13 wind van rechts.
        γg(c) = if(c ≡ 1; γ_G,a; if(c ≡ 7 or c ≡ 9 or c ≡ 11 or c ≡ 13; 0.9; γ_G))
        γq(c) = if(c ≡ 2; γ_Q; 0)
        γsl(c) = if(c ≡ 3 or c ≡ 4; γ_Q; if(c ≡ 5; 0.5*γ_Q; 0))
        γsr(c) = if(c ≡ 3 or c ≡ 5; γ_Q; if(c ≡ 4; 0.5*γ_Q; 0))
        γw(c; w) = if(c ≡ 4 + 2*w or c ≡ 5 + 2*w; γ_Q; 0)
        act(c) = if(c ≡ 1; 1; if(c ≡ 2; bool(q_n > 0); if(c ≡ 3; bool(s_n > 0); if(c ≤ 5; bool(s_n > 0)*asym; bool(wq_n > 0)))))
        'Belastingsduur (hout): 1 blijvend, 3 middellang (dakbelasting), 4 kort (sneeuw, wind).
        dc(c) = if(c ≡ 1; 1; if(c ≡ 2; 3; 4))
        Fv(c; h) = [γg(c); γg(c); γg(c); γg(c); γq(c); γq(c); γsl(c); γsr(c); γw(c; 1); γw(c; 1); γw(c; 1); γw(c; 1); γw(c; 2); γw(c; 2); γw(c; 2); γw(c; 2); γw(c; 3); γw(c; 3); γw(c; 3); γw(c; 3); γw(c; 4); γw(c; 4); γw(c; 4); γw(c; 4); h; h]
        'V_Ed: de som van de verticale reacties zonder de scheefstand.
        VEd(c) = raamwerk_R(kn; st; opl; last; Fv(c; 0))[1; 3] + raamwerk_R(kn; st; opl; last; Fv(c; 0))[2; 3]
        'Scheefstand: staal 5.3.2(3) met φ_0 = 1/200, α_h = 2/√h (2/3 tot 1) en α_m met m = 2 kolommen; hout (5.1) van NEN-EN 1995-1-1.
        h_st = Hn
        α_h = min(1; max(2/3; 2/sqrt(max(h_st; 0.001))))
        α_m = sqrt(0.5*(1 + 1/2))
        φ_n = if(systeem ≡ 3; 0; if(staal ≡ 1; α_h*α_m/200; if(h_st ≤ 5; 0.005; 0.005*sqrt(5/h_st))))
        'Richting van de scheefstand: met de wind mee, anders met de eersteordeverplaatsing van de knie mee.
        uK(c) = bool(knL ≥ 1)*(raamwerk_u(kn; st; opl; last; Fv(c; 0))[max(knL; 1); 2] + raamwerk_u(kn; st; opl; last; Fv(c; 0))[max(knR; 1); 2])
        'Per combinatie één keer uitgerekend: V_Ed en de zijdelingse verplaatsing van de knieën.
        vV = [VEd(1); VEd(2); VEd(3); VEd(4); VEd(5); VEd(6); VEd(7); VEd(8); VEd(9); VEd(10); VEd(11); VEd(12); VEd(13)]
        vU = [uK(1); uK(2); uK(3); uK(4); uK(5); uK(6); uK(7); uK(8); uK(9); uK(10); uK(11); uK(12); uK(13)]
        dir(c) = if(c ≥ 10; -1; if(c ≥ 6; 1; if(vU.(c) < -10^-12; -1; 1)))
        'Bij een netto opwaartse last geen scheefstand: de kolommen staan dan op trek.
        hφ(c) = φ_n*max(vV.(c); 0)*dir(c)
        vH = [hφ(1); hφ(2); hφ(3); hφ(4); hφ(5); hφ(6); hφ(7); hφ(8); hφ(9); hφ(10); hφ(11); hφ(12); hφ(13)]
        F(c) = Fv(c; vH.(c))
        'Zijdelingse verplaatsing van de knieën onder H = 1 kN (samen), voor (5.2).
        eH = [0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 1; 1]
        δ_1 = if(knL ≥ 1; max(abs(raamwerk_u(kn; st; opl; last; eH)[max(knL; 1); 2]); abs(raamwerk_u(kn; st; opl; last; eH)[max(knR; 1); 2]); 10^-12); 1)
        'Geldigheid van (5.2): dakhelling ten hoogste 26° en een kleine drukkracht in de regel, (5.3): N_Ed < 0,09·N_cr met de regel scharnierend over zijn hele lengte.
        L_regel = if(systeem ≡ 4; vL.(2); vL.(2) + vL.(3))
        Ncr_regel = pi^2*EI_2/max(L_regel; 0.001)^2
        Nr_max = 0
        #for c = 1 : 13
            #if act(c) ≡ 1
                Rtmp = raamwerk(kn; st; opl; last; F(c))
                Nr_max = max(Nr_max; -raamwerk_sam(Rtmp; nrL)[1]; -bool(nrR ≥ 1)*raamwerk_sam(Rtmp; max(nrR; 1))[1])
            #end if
        #loop
        ok_52 = bool(systeem ≠ 3)*bool(a_deg ≤ 26)*bool(Nr_max < 0.09*Ncr_regel)
        'Gebruikte methode: 0 niet verplaatsbaar (A-spant, eerste orde), 1 (5.2), 2 de knikberekening.
        'Het A-spant blijft bij methode 2 eerste orde (mth 0); de knikberekening geeft dan alleen α_cr ter informatie.
        mth = if(systeem ≡ 3; 0; if(methode ≡ 2; 2; if(ok_52 ≡ 1; 1; 2)))
        acr(c) = if(mth ≡ 2 or methode ≡ 2; raamwerk_acr(kn; st; opl; last; F(c)); if(mth ≡ 1; if(vV.(c) > 0; min(h_st/(vV.(c)*δ_1); 10^6); 10^6); 10^6))
        vA = [acr(1); acr(2); acr(3); acr(4); acr(5); acr(6); acr(7); acr(8); acr(9); acr(10); acr(11); acr(12); acr(13)]
        'Hout: tweede orde met de rekenwaarde E_mean/γ_M (2.2.2(1)P); staal: vergroten bij α_cr < 10 (5.2.1(3)).
        αe(c) = if(staal ≡ 1; vA.(c); vA.(c)/γ_M)
        kampf(c) = if(mth ≡ 0; 1; if(αe(c) > 1.0001; if(staal ≡ 1 and αe(c) ≥ 10; 1; 1/(1 - 1/αe(c))); 1))
        vK = [kampf(1); kampf(2); kampf(3); kampf(4); kampf(5); kampf(6); kampf(7); kampf(8); kampf(9); kampf(10); kampf(11); kampf(12); kampf(13)]
        kamp(c) = vK.(c)
        te_klein = 0
        #show
        #if mth ≡ 0
            #if methode ≡ 2
                '<i>Het A-spant is een driehoek: niet verplaatsbaar. De knikberekening geeft α<sub>cr</sub>; de staven worden getoetst met hun lengte als kniklengte (NB.NA.1.2(1)).</i><span class="alleen-scherm"></span>
            #else
                '<i>Het A-spant is een driehoek en dus niet verplaatsbaar: eerste orde, de staven met hun lengte als kniklengte (NB.NA.1.2(1)). Geen scheefstand.</i><span class="alleen-scherm"></span>
            #end if
        #else if mth ≡ 1
            '<i>Scheefstand φ = 'r2(1000*φ_n)'·10⁻³ als horizontale knooplasten φ·V<sub>Ed</sub> in de knieën'if(staal ≡ 1; " (5.3.2(3) en (7))"; " ((5.1) van NEN-EN 1995-1-1)")'. α<sub>cr</sub> uit (5.2) met h = 'r2(h_st)' m en δ<sub>H</sub> = 'r2(1000*δ_1)' mm per kN in de knieën; dakhelling ≤ 26° en N<sub>Ed</sub> in de regel ≤ 'r2(Nr_max)' kN &lt; 0,09·N<sub>cr</sub> = 'r2(0.09*Ncr_regel)' kN (5.3). 'if(staal ≡ 1; "Bij α<sub>cr</sub> onder 10 zijn alle krachten vergroot met 1/(1 − 1/α<sub>cr</sub>) (5.4)"; "Alle krachten vergroot met 1/(1 − 1/α<sub>cr,d</sub>), α<sub>cr,d</sub> = α<sub>cr</sub>/γ<sub>M</sub>")', ook het deel dat niet uit de scheefstand komt (veilige kant); de staven met de systeemlengte als kniklengte (5.2.2(7)b).</i><span class="alleen-scherm"></span>
        #else
            #if methode ≡ 1
                '<span style="color:#b45309">(5.2) geldt hier niet'if(a_deg > 26; ": de dakhelling is groter dan 26°"; ": de drukkracht in de regel is niet klein (5.3)")'. α<sub>cr</sub> komt daarom uit de knikberekening van het raamwerk.</span>
            #end if
            '<i>Scheefstand φ = 'r2(1000*φ_n)'·10⁻³ als horizontale knooplasten φ·V<sub>Ed</sub> in de knieën'if(staal ≡ 1; " (5.3.2(3) en (7))"; " ((5.1) van NEN-EN 1995-1-1)")'. α<sub>cr</sub> is de elastisch kritieke belastingsfactor van het hele raamwerk bij de normaalkrachten van de combinatie (5.2.1(3)), uit een knikberekening. 'if(staal ≡ 1; "Bij α<sub>cr</sub> onder 10 zijn alle krachten vergroot met 1/(1 − 1/α<sub>cr</sub>) (5.4)"; "Alle krachten vergroot met 1/(1 − 1/α<sub>cr,d</sub>), α<sub>cr,d</sub> = α<sub>cr</sub>/γ<sub>M</sub>")', ook het deel dat niet uit de scheefstand komt (veilige kant); de staven met de systeemlengte als kniklengte (5.2.2(7)b). Komt α<sub>cr</sub> van het knikken van één staaf, dan telt die knik dubbel: aan de veilige kant.</i><span class="alleen-scherm"></span>
        #end if
        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Nr</th><th style="padding:1px 4px; text-align:left;">Combinatie</th><th style="padding:1px 4px; text-align:right;">V<sub>Ed</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">φ·V<sub>Ed</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">α<sub>cr</sub></th><th style="padding:1px 4px; text-align:right;">vergroting</th></tr>
        #for c = 1 : 13
            #if act(c) ≡ 1
                #hide
                te_klein = max(te_klein; bool(mth ≥ 1)*bool(αe(c) < 3))
                #show
                '<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:0 4px;">'c'</td><td style="padding:0 4px;">'if(c ≡ 1; "6.10a"; "6.10b")': 'γg(c)'·G'if(c ≡ 1; ""; " + ")''if(c ≡ 1; ""; γ_Q)''if(c ≡ 1; ""; "·")''if(c ≡ 2; "Q<sub>dak</sub>"; if(c ≡ 3; "S"; if(c ≡ 4; "S, rechts half"; if(c ≡ 5; "S, links half"; if(c ≡ 1; ""; if(c ≤ 9; "W van links"; "W van rechts"))))))''if(c ≥ 6; if(c ≡ 6 or c ≡ 7 or c ≡ 10 or c ≡ 11; ", c<sub>pi</sub> +0,2"; ", c<sub>pi</sub> −0,3"); "")'</td><td style="padding:0 4px; text-align:right;">'r2(VEd(c))'</td><td style="padding:0 4px; text-align:right;">'r2(hφ(c))'</td><td style="padding:0 4px; text-align:right; color:'if(mth ≥ 1 and αe(c) < 3; "#b91c1c"; "inherit")';">'if(mth ≡ 0 and methode ≡ 1; "—"; if(vA.(c) ≥ 10^6; "∞"; r2(vA.(c))))'</td><td style="padding:0 4px; text-align:right;">'r2(kamp(c))'</td></tr>
            #end if
        #loop
        '</table>
        #if staal ≡ 0
            #if mth ≥ 1
                'Hout: in de vergroting α<sub>cr,d</sub> = α<sub>cr</sub>/γ<sub>M</sub> = α<sub>cr</sub>/'γ_M'.<span class="alleen-scherm"></span>
            #end if
        #end if
        #if te_klein ≡ 1
            '<b style="color:#b91c1c">α<sub>cr</sub>'if(staal ≡ 1; ""; ",d")' &lt; 3 in een combinatie: dan is een nauwkeurigere tweedeordeberekening nodig (opmerking B bij 5.2.2(5)); dat valt buiten dit blad.</b>
        #end if

        # 6. Krachtsverdeling

        #hide
        'Omhullende over de combinaties, met de vergroting per combinatie.
        c0 = 1
        PT = raamwerk(kn; st; opl; last; kamp(1)*F(1))
        NT = PT
        #for c = 2 : 13
            #if act(c) ≡ 1
                Rc = raamwerk(kn; st; opl; last; kamp(c)*F(c))
                PT = raamwerk_max(PT; Rc)
                NT = raamwerk_min(NT; Rc)
            #end if
        #loop
        M_p = max(raamwerk_ext(PT; 0; 7)[1]; 0)
        M_m = max(-raamwerk_ext(NT; 0; 7)[3]; 0)
        sM = 38/max(M_p; M_m; 10^-9)/sc
        #show
        '<svg class="omhullende" viewbox="0 0 480 'sH'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'sH + 16'px;">
        #for k = 1 : 4
            #if vT.(k) ≥ 1
                '<line x1="'gX(Xn(vI.(k)))'" y1="'gY(Yn(vI.(k)))'" x2="'gX(Xn(vJ.(k)))'" y2="'gY(Yn(vJ.(k)))'" style="stroke:#374151; stroke-width:1.5"/>
                '<polygon points="'raamwerk_svg(PT; k; 7; 60; 22 + sc*Ymax; sc; sM)'" style="fill:rgba(239,68,68,0.20); stroke:#dc2626; stroke-width:1.3; stroke-linejoin:round"/>
                '<polygon points="'raamwerk_svg(NT; k; 7; 60; 22 + sc*Ymax; sc; sM)'" style="fill:rgba(239,68,68,0.10); stroke:#dc2626; stroke-width:1; stroke-dasharray:4 3; stroke-linejoin:round"/>
            #end if
        #loop
        '</svg>'
        'Momentenlijn aan de trekzijde, doorgetrokken de grootste en onderbroken de kleinste waarde over de combinaties, na de vergroting.<span class="alleen-scherm"></span>
        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Staaf</th><th style="padding:1px 4px; text-align:right;">N<sub>max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">N<sub>min</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">|V|<sub>max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">M<sub>max</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">M<sub>min</sub> [kNm]</th></tr>
        #for k = 1 : 4
            #if vT.(k) ≥ 1
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'k' — 'if(vT.(k) ≡ 1; "kolom"; if(vT.(k) ≡ 2; if(systeem ≡ 3; "spoor"; "regel"); "trekband"))'</td><td style="padding:0 4px; text-align:right;">'r2(raamwerk_ext(PT; k; 5)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(raamwerk_ext(NT; k; 5)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(raamwerk_ext(PT; k; 6)[1]; -raamwerk_ext(NT; k; 6)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(raamwerk_ext(PT; k; 7)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(raamwerk_ext(NT; k; 7)[3])'</td></tr>
            #end if
        #loop
        '</table>
        'N trek positief, M positief bij trek aan de binnenzijde.<span class="alleen-scherm"></span>
        #hide
        'Oplegreacties: per oplegging de uitersten over de combinaties.
        RRx = raamwerk_R(kn; st; opl; last; kamp(1)*F(1))
        RRn = RRx
        #for c = 2 : 13
            #if act(c) ≡ 1
                RRc = raamwerk_R(kn; st; opl; last; kamp(c)*F(c))
                RRx = raamwerk_max(RRx; RRc)
                RRn = raamwerk_min(RRn; RRc)
            #end if
        #loop
        Rxp_1 = RRx.(1; 2)
        Rxm_1 = RRn.(1; 2)
        Ryp_1 = RRx.(1; 3)
        Rym_1 = RRn.(1; 3)
        Mp_1 = RRx.(1; 4)
        Mm_1 = RRn.(1; 4)
        Rxp_2 = RRx.(2; 2)
        Rxm_2 = RRn.(2; 2)
        Ryp_2 = RRx.(2; 3)
        Rym_2 = RRn.(2; 3)
        Mp_2 = RRx.(2; 4)
        Mm_2 = RRn.(2; 4)
        R_min = min(Rym_1; Rym_2)
        #show
        '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Oplegging</th><th style="padding:1px 4px; text-align:right;">R<sub>x,max</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>x,min</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>y,max</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>y,min</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">M<sub>max</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>min</sub> [kNm]</th></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">links (knoop 1)</td><td style="padding:0 4px; text-align:right;">'r2(Rxp_1)'</td><td style="padding:0 4px; text-align:right;">'r2(Rxm_1)'</td><td style="padding:0 4px; text-align:right;">'r2(Ryp_1)'</td><td style="padding:0 4px; text-align:right; color:'if(Rym_1 < 0; "#b91c1c"; "inherit")';">'r2(Rym_1)'</td><td style="padding:0 4px; text-align:right;">'if(voet ≡ 1; r2(Mp_1); "—")'</td><td style="padding:0 4px; text-align:right;">'if(voet ≡ 1; r2(Mm_1); "—")'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">rechts (knoop 'kR')</td><td style="padding:0 4px; text-align:right;">'r2(Rxp_2)'</td><td style="padding:0 4px; text-align:right;">'r2(Rxm_2)'</td><td style="padding:0 4px; text-align:right;">'r2(Ryp_2)'</td><td style="padding:0 4px; text-align:right; color:'if(Rym_2 < 0; "#b91c1c"; "inherit")';">'r2(Rym_2)'</td><td style="padding:0 4px; text-align:right;">'if(voet ≡ 1; r2(Mp_2); "—")'</td><td style="padding:0 4px; text-align:right;">'if(voet ≡ 1; r2(Mm_2); "—")'</td></tr>
        '</table>
        'Reacties op het spant: R<sub>x</sub> naar rechts en R<sub>y</sub> omhoog positief, M rechtsom; per spant, na de vergroting.<span class="alleen-scherm"></span>
        #if R_min < 0
            '<span style="color:#b91c1c"><b>Trek in een oplegging</b>: verankeren voor ten minste 'r2(-R_min)' kN.</span>
        #end if

        # 7. Toetsing UGT
        #hide
        'Kniklengte in het vlak (de systeemlengte) en uit het vlak (de afstand tussen de zijdelingse steunen) per staaf.
        vLy = if(systeem ≡ 3; [vL.(1); vL.(2); 0; 0]; if(systeem ≡ 4; [Hn; L_regel; H2n; 0]; [Hn; L_regel; L_regel; Hn]))
        Lz(k) = if(vT.(k) ≡ 1; if(a_zk > 0 m; min(a_zk/(1 m); vL.(k)); vL.(k)); if(vT.(k) ≡ 2; if(a_zr > 0 m; min(a_zr/(1 m); vL.(k)); vL.(k)); 0))
        vLz = [Lz(1); Lz(2); Lz(3); Lz(4)]
        'Afstand tussen de steunen van de binnen- of onderrand: kip bij een negatief moment (trek buiten, druk binnen,
        'zoals bij de knie). Zonder invoer de hele staaf: een gordingafstand telt niet voor de gedrukte onderflens.
        Lzi(k) = if(vT.(k) ≡ 1; if(a_zk,i > 0 m; min(a_zk,i/(1 m); vL.(k)); vL.(k)); if(vT.(k) ≡ 2; if(a_zr,o > 0 m; min(a_zr,o/(1 m); vL.(k)); vL.(k)); 0))
        vLzi = [Lzi(1); Lzi(2); Lzi(3); Lzi(4)]
        nT(t) = bool(vT.(1) ≡ t) + bool(vT.(2) ≡ t) + bool(vT.(3) ≡ t) + bool(vT.(4) ≡ t)
        'Snedekrachten van staaf k uit de uitkomst R, als kale getallen: drukkracht, trekkracht, |M| en |V| als grootste waarde langs de staaf, M op een fractie x van de lengte.
        'raamwerk_sam(R; k) geeft [N_min; N_max; V_min; V_max; M_min; M_max; M(0); M(L/4); M(L/2); M(3L/4); M(L); L; w_min; w_max].
        fNc(S) = max(-S.1; 0)
        fNt(S) = max(S.2; 0)
        fM(S) = max(-S.5; S.6; 0)
        fV(S) = max(-S.3; S.4; 0)
        sdiv(a; b) = if(abs(b) > 10^-12; a/b; 0)
        #show
        #if staal ≡ 1
            '<i>NEN-EN 1993-1-1 met NB, per staaf en per combinatie na de vergroting: doorsnedeklasse bij N en M (tabel 5.2), doorsnede (6.9) met (6.31) en (6.36) of (6.42), met (1 − ρ)·f<sub>y</sub> bij V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub> (6.2.8, veilige kant), dwarskracht (6.17), knik (6.46) met de systeemlengte in het vlak en de afstand tussen de zijdelingse steunen uit het vlak, kip (6.54) met M<sub>cr</sub> volgens bijlage NB.NB (λ̄<sub>LT,0</sub> = 0,4, β = 0,75, kromme b of c naar h/b) en druk met buiging (6.61)/(6.62) met tabel B.2 en C<sub>m</sub> uit tabel B.3. Kip per gedrukte flens: bij een positief moment (druk buiten of boven) de steunafstand van die flens, bij een negatief moment (druk binnen of onder, zoals bij de knie) die van de binnen- of onderflens, standaard de hele staaf. Ligt de steunafstand binnen de staaf, dan C<sub>1</sub> = 1,0 en C<sub>mLT</sub> = 1,0; anders C<sub>1</sub> uit tabel NB.NB.1 (eindmomenten) of, met een last op de staaf, uit de momenten op de kwartpunten, en bij de regel C<sub>2</sub> = −0,45 (last op de bovenflens). N<sub>Ed</sub> en M<sub>Ed</sub> zijn de grootste waarden langs de staaf (veilige kant).</i><span class="alleen-scherm"></span>
            #hide
            'Staal, per staafsoort: de grootheden A_, Iy_ enzovoort van de staafsoort in de lus hieronder.
            αwf(N) = min(1; 0.5*(1 + N/(cw*tw_*fy_n)))
            ψwf(N; M) = max((N/A_ - M*cw/(2*Iy_))/max(N/A_ + M*cw/(2*Iy_); 10^-9); -3)
            g3f(ψ) = if(ψ > -1; 42/(0.67 + 0.33*ψ); 62*(1 - ψ)*sqrt(max(-ψ; 0)))
            klwf(a; ψ) = if(kw ≤ if(a > 0.5; 396/(13*a - 1); 36/a); 1; if(kw ≤ if(a > 0.5; 456/(13*a - 1); 41.5/a); 2; if(kw ≤ g3f(ψ); 3; 4)))
            klas(N; M) = max(klf; klwf(αwf(N); ψwf(N; M)))
            Wyf(kl) = if(kl ≤ 2; Wpl_; Wel_)
            fyrf(V) = (1 - if(V > 0.5*Vpl; min((2*V/Vpl - 1)^2; 1); 0))*fy_n
            MNf(Na; Npl; Mc) = if(Na ≤ min(0.25*Npl; 0.5*(h_ - 2*tf_)*tw_*Npl/A_); Mc; max(min(Mc*(1 - sdiv(Na; Npl))/(1 - 0.5*aw); Mc); 0))
            udg(Na; M; kl; fyr) = if(kl ≤ 2; if(Na < A_*fyr; max(sdiv(Na; A_*fyr); M/max(MNf(Na; A_*fyr; Wyf(kl)*fyr); 10^-9)); sdiv(Na; A_*fyr) + M/max(Wyf(kl)*fyr; 10^-9)); sdiv(Na; A_*fyr) + M/max(Wyf(kl)*fyr; 10^-9))
            Φf(λ; α) = 0.5*(1 + α*(λ - 0.2) + λ^2)
            χf(λ; α) = min(1; 1/(Φf(λ; α) + sqrt(max(Φf(λ; α)^2 - λ^2; 0))))
            λyf(L) = L*sqrt(A_*fy_n/(pi^2*E_n*Iy_))
            λzf(L) = L*sqrt(A_*fy_n/(pi^2*E_n*Iz_))
            'C_1: zonder last op de staaf tabel NB.NB.1 geval 1 (eindmomenten), anders uit de momenten op de kwartpunten; C_2 = −0,45 voor de regel (last op de bovenflens).
            Mhf(a; b) = if(abs(a) ≥ abs(b); a; b)
            ψf(a; b) = if(abs(Mhf(a; b)) > 10^-9; sdiv(if(abs(a) ≥ abs(b); b; a); Mhf(a; b)); 1)
            qaf(a; b; s) = bool(abs(s - (a + b)/2) > 0.001*max(abs(a); abs(b); abs(s); 10^-9))
            heelf(Lz; Lk) = bool(Lz ≥ Lk - 10^-6)
            C1f(a; b; s; M; q1; q3; hl) = if(hl ≡ 1; if(qaf(a; b; s) ≡ 0; min(1.75 - 1.05*ψf(a; b) + 0.3*ψf(a; b)^2; 2.3); min(2.3; max(1; sqrt(35*M^2/max(M^2 + 9*q1^2 + 16*s^2 + 9*q3^2; 10^-12))))); 1)
            C2f(hl) = if(hl ≡ 1 and t_ ≡ 2; -0.45; 0)
            Mcrf(C1; C2; L) = C1*pi/L*(sqrt(1 + pi^2*Sn^2*(C2^2 + 1)/L^2) + pi*C2*Sn/L)*sqrt(E_n*Iz_*G_n*It_)
            ΦLf(λ) = 0.5*(1 + αLT*(λ - 0.4) + 0.75*λ^2)
            χlf(λ) = min(1; 1/max(λ^2; 10^-12); 1/(ΦLf(λ) + sqrt(max(ΦLf(λ)^2 - 0.75*λ^2; 0))))
            Mcrg(a; b; s; M; q1; q3; Lz; Lk) = Mcrf(C1f(a; b; s; M; q1; q3; heelf(Lz; Lk)); C2f(heelf(Lz; Lk)); Lz)
            MbRdf(W; Mcr) = χlf(sqrt(W*fy_n/Mcr))*W*fy_n/γ_M1
            'Tabel B.3: C_m uit de eindmomenten en het moment halverwege; tabel B.2: k_yy en k_zy.
            Cmsf(αs; ψ) = if(αs ≥ 0; max(0.2 + 0.8*αs; 0.4); if(ψ ≥ 0; max(0.1 - 0.8*αs; 0.4); max(0.1*(1 - ψ) - 0.8*αs; 0.4)))
            Cmhf(αh; ψ) = if(αh ≥ 0 or ψ ≥ 0; 0.95 + 0.05*αh; 0.95 + 0.05*αh*(1 + 2*ψ))
            Cmf(a; b; s) = if(qaf(a; b; s) ≡ 0; max(0.6 + 0.4*ψf(a; b); 0.4); if(abs(s) ≤ abs(Mhf(a; b)); Cmsf(sdiv(s; Mhf(a; b)); ψf(a; b)); Cmhf(sdiv(Mhf(a; b); s); ψf(a; b))))
            kyyf(kl; λ; n; Cm) = if(kl ≤ 2; Cm*min(1 + (λ - 0.2)*n; 1 + 0.8*n); Cm*min(1 + 0.6*λ*n; 1 + 0.6*n))
            kzyf(kl; λ; n; Cm) = if(kl ≤ 2; if(λ < 0.4; min(0.6 + λ; 1 - 0.1*λ*n/(Cm - 0.25)); max(1 - 0.1*λ*n/(Cm - 0.25); 1 - 0.1*n/(Cm - 0.25))); max(1 - 0.05*λ*n/(Cm - 0.25); 1 - 0.05*n/(Cm - 0.25)))
            nyf(N; λ; α) = N/(χf(λ; α)*A_*fy_n/γ_M1)
            uig(N; M; kl; λy; λz; Cmy; CmLT; Mb) = max(nyf(N; λy; αy) + kyyf(kl; λy; nyf(N; λy; αy); Cmy)*M/Mb; nyf(N; λz; αz) + kzyf(kl; λz; nyf(N; λz; αz); CmLT)*M/Mb)
            'Per staaf en combinatie: [doorsnede; dwarskracht; knik; kip; druk met buiging].
            'Kip en druk met buiging per gedrukte rand: het positieve moment (druk buiten of boven) met de steunen van
            'die rand (Lz), het negatieve moment (druk binnen of onder) met de steunen van de andere rand (Lzi).
            Mbk(M; a; b; s; q1; q3; Lk; Lzk; kl) = MbRdf(Wyf(kl); Mcrg(a; b; s; M; q1; q3; Lzk; Lk))
            uik(Nc; Mk; M; a; b; s; q1; q3; Lk; Ly; Lz; Lzk) = uig(Nc; Mk; klas(Nc; M); λyf(Ly); λzf(Lz); Cmf(a; b; s); if(heelf(Lzk; Lk) ≡ 1; Cmf(a; b; s); 1); Mbk(M; a; b; s; q1; q3; Lk; Lzk; klas(Nc; M)))
            UCs(Nc; Nt; M; Mp; Mn; V; a; b; s; q1; q3; Lk; Ly; Lz; Lzi) = [udg(max(Nc; Nt); M; klas(Nc; M); fyrf(V)); V/Vpl; Nc/(min(χf(λyf(Ly); αy); χf(λzf(Lz); αz))*A_*fy_n/γ_M1); max(Mp/Mbk(M; a; b; s; q1; q3; Lk; Lz; klas(Nc; M)); Mn/Mbk(M; a; b; s; q1; q3; Lk; Lzi; klas(Nc; M))); max(uik(Nc; Mp; M; a; b; s; q1; q3; Lk; Ly; Lz; Lz); uik(Nc; Mn; M; a; b; s; q1; q3; Lk; Ly; Lz; Lzi))]
            #show
        #else
            '<i>NEN-EN 1995-1-1 met NB, per staaf en per combinatie na de vergroting, met k<sub>mod</sub> van de kortste last in de combinatie: trek of druk met buiging (6.17)/(6.19), knik (6.23)/(6.24) met de systeemlengte in het vlak en de afstand tussen de zijdelingse steunen uit het vlak (β<sub>c</sub> = 'β_c'), kip (6.33)/(6.35) per gedrukte rand met l<sub>ef</sub> = de steunafstand van die rand (bij een negatief moment die van de binnen- of onderrand, standaard de hele staaf), bij de regel plus 2h (tabel 6.1, last op de gedrukte rand, veilige kant) en afschuiving (6.13) met k<sub>cr</sub> = 1,0 (NB). N<sub>Ed</sub> en M<sub>Ed</sub> zijn de grootste waarden langs de staaf (veilige kant).</i><span class="alleen-scherm"></span>
            #hide
            'Hout, per staafsoort: sterkten met k_mod van de combinatie c, slankheden en k_c, k_crit.
            fmdf(c) = k_mod(dc(c))*k_h*f_mk*1000/γ_M
            ft0df(c) = k_mod(dc(c))*f_t0k*1000/γ_M
            fc0df(c) = k_mod(dc(c))*f_c0k*1000/γ_M
            fvdf(c) = k_mod(dc(c))*f_vk*1000/γ_M
            λrf(L; d) = L/(d/sqrt(12))/pi*sqrt(f_c0k/E_005)
            kvf(λ) = 0.5*(1 + β_c*(λ - 0.3) + λ^2)
            kcf(λ) = if(λ ≤ 0.3; 1; 1/(kvf(λ) + sqrt(max(kvf(λ)^2 - λ^2; 0))))
            λmf(Lz) = sqrt(f_mk*h_*(Lz + if(t_ ≡ 2; 2*h_; 0))/(0.78*b_^2*E_005))
            kcritf(λ) = if(λ ≤ 0.75; 1; if(λ ≤ 1.4; 1.56 - 0.75*λ; 1/λ^2))
            'Per staaf en combinatie: [trek of druk met buiging; afschuiving; knik; kip; 0].
            'Kip per gedrukte rand: het positieve moment met de steunen van de buiten- of bovenrand (Lz), het negatieve met die van de binnen- of onderrand (Lzi).
            ukf(Nc; Mk; Lz; Lzk; c) = if(Nc > 0; (Mk/W_/(kcritf(λmf(Lzk))*fmdf(c)))^2 + Nc/A_/(kcf(λrf(Lz; b_))*fc0df(c)); Mk/W_/(kcritf(λmf(Lzk))*fmdf(c)))
            UCh(Nc; Nt; M; Mp; Mn; V; Ly; Lz; Lzi; c) = [max(if(Nt > 0; Nt/A_/ft0df(c) + M/W_/fmdf(c); 0); (Nc/A_/fc0df(c))^2 + M/W_/fmdf(c)); 1.5*V/(b_*h_)/fvdf(c); if(Nc > 0; max(Nc/A_/(kcf(λrf(Ly; h_))*fc0df(c)) + M/W_/fmdf(c); Nc/A_/(kcf(λrf(Lz; b_))*fc0df(c)) + 0.7*M/W_/fmdf(c)); 0); max(ukf(Nc; Mp; Lz; Lz; c); ukf(Nc; Mn; Lz; Lzi; c)); 0]
            #show
        #end if
        #hide
        Ud_1 = 0
        Uv_1 = 0
        Un_1 = 0
        Ul_1 = 0
        Ui_1 = 0
        Ud_2 = 0
        Uv_2 = 0
        Un_2 = 0
        Ul_2 = 0
        Ui_2 = 0
        kl4 = 0
        #show
        #for t_ = 1 : 2
            #if nT(t_) ≥ 1
                #hide
                A_ = if(t_ ≡ 1; A_1; A_2)
                Iy_ = if(t_ ≡ 1; Iy_1; Iy_2)
                h_ = if(t_ ≡ 1; h_1; h_2)
                b_ = if(t_ ≡ 1; b_1; b_2)
                #show
                #if staal ≡ 1
                    #hide
                    tw_ = if(t_ ≡ 1; tw_1; tw_2)
                    tf_ = if(t_ ≡ 1; tf_1; tf_2)
                    rr_ = if(t_ ≡ 1; rr_1; rr_2)
                    Wel_ = if(t_ ≡ 1; Wel_1; Wel_2)
                    Wpl_ = if(t_ ≡ 1; Wpl_1; Wpl_2)
                    Avz_ = if(t_ ≡ 1; Avz_1; Avz_2)
                    Iz_ = if(t_ ≡ 1; Iz_1; Iz_2)
                    It_ = if(t_ ≡ 1; It_1; It_2)
                    Iw_ = if(t_ ≡ 1; Iw_1; Iw_2)
                    cw = h_ - 2*tf_ - 2*rr_
                    klf = if((b_ - tw_ - 2*rr_)/2/tf_/ε ≤ 9; 1; if((b_ - tw_ - 2*rr_)/2/tf_/ε ≤ 10; 2; if((b_ - tw_ - 2*rr_)/2/tf_/ε ≤ 14; 3; 4)))
                    kw = cw/tw_/ε
                    Vpl = max(Avz_; (h_ - 2*tf_)*tw_)*fy_n/sqrt(3)/γ_M0
                    aw = min((A_ - 2*b_*tf_)/A_; 0.5)
                    αy = if(h_/b_ > 1.2; 0.21; 0.34)
                    αz = if(h_/b_ > 1.2; 0.34; 0.49)
                    αLT = if(h_/b_ ≤ 2; 0.34; 0.49)
                    Sn = sqrt(E_n*Iw_/(G_n*It_))
                    #show
                #else
                    #hide
                    W_ = if(t_ ≡ 1; Wel_1; Wel_2)
                    k_h = kh(h_)
                    #show
                #end if
                #hide
                'Per toets de grootste UC en waar: 100·combinatie + staaf.
                u_d = 0
                g_d = 101
                u_v = 0
                g_v = 101
                u_n = 0
                g_n = 101
                u_l = 0
                g_l = 101
                u_i = 0
                g_i = 101
                u_s = -1
                g_s = 101
                #for c = 1 : 13
                    #if act(c) ≡ 1
                        Rc = raamwerk(kn; st; opl; last; kamp(c)*F(c))
                        #for k = 1 : 4
                            #if vT.(k) ≡ t_
                                S = raamwerk_sam(Rc; k)
                                #if staal ≡ 1
                                    U = UCs(fNc(S); fNt(S); fM(S); max(S.6; 0); max(-S.5; 0); fV(S); S.7; S.11; S.9; abs(S.8); abs(S.10); vL.(k); vLy.(k); vLz.(k); vLzi.(k))
                                    kl4 = max(kl4; bool(klas(fNc(S); fM(S)) ≡ 4))
                                #else
                                    U = UCh(fNc(S); fNt(S); fM(S); max(S.6; 0); max(-S.5; 0); fV(S); vLy.(k); vLz.(k); vLzi.(k); c)
                                #end if
                                ck = 100*c + k
                                g_d = if(U.1 > u_d; ck; g_d)
                                u_d = max(u_d; U.1)
                                g_v = if(U.2 > u_v; ck; g_v)
                                u_v = max(u_v; U.2)
                                g_n = if(U.3 > u_n; ck; g_n)
                                u_n = max(u_n; U.3)
                                g_l = if(U.4 > u_l; ck; g_l)
                                u_l = max(u_l; U.4)
                                g_i = if(U.5 > u_i; ck; g_i)
                                u_i = max(u_i; U.5)
                                g_s = if(max(U.3; U.4; U.5) > u_s; ck; g_s)
                                u_s = max(u_s; U.3; U.4; U.5)
                            #end if
                        #loop
                    #end if
                #loop
                Ud_1 = if(t_ ≡ 1; u_d; Ud_1)
                Uv_1 = if(t_ ≡ 1; u_v; Uv_1)
                Un_1 = if(t_ ≡ 1; u_n; Un_1)
                Ul_1 = if(t_ ≡ 1; u_l; Ul_1)
                Ui_1 = if(t_ ≡ 1; u_i; Ui_1)
                Ud_2 = if(t_ ≡ 2; u_d; Ud_2)
                Uv_2 = if(t_ ≡ 2; u_v; Uv_2)
                Un_2 = if(t_ ≡ 2; u_n; Un_2)
                Ul_2 = if(t_ ≡ 2; u_l; Ul_2)
                Ui_2 = if(t_ ≡ 2; u_i; Ui_2)
                'Details van de maatgevende stabiliteitstoets.
                cg = floor(g_s/100)
                kg = g_s - 100*cg
                Rg = raamwerk(kn; st; opl; last; kamp(cg)*F(cg))
                Sg = raamwerk_sam(Rg; kg)
                dN = fNc(Sg)
                dM = fM(Sg)
                dLy = vLy.(kg)
                dLz = vLz.(kg)
                #show
                #if staal ≡ 1
                    #hide
                    dkl = klas(dN; dM)
                    dλy = λyf(dLy)
                    dλz = λzf(dLz)
                    da = Sg.7
                    db = Sg.11
                    ds = Sg.9
                    dhl = heelf(dLz; vL.(kg))
                    dC1 = C1f(da; db; ds; dM; abs(Sg.8); abs(Sg.10); dhl)
                    dMcr = Mcrf(dC1; C2f(dhl); dLz)
                    dλl = sqrt(Wyf(dkl)*fy_n/dMcr)
                    dCmy = Cmf(da; db; ds)
                    dCmLT = if(dhl ≡ 1; dCmy; 1)
                    #show
                    '<h6>7.'t_' 'if(t_ ≡ 1; "Kolommen"; if(systeem ≡ 3; "Sporen"; "Regel"))'</h6>
                #else
                    #hide
                    dλy = λrf(dLy; h_)
                    dλz = λrf(dLz; b_)
                    dλm = λmf(dLz)
                    #show
                    '<h6>7.'t_' 'if(t_ ≡ 1; "Kolommen"; if(systeem ≡ 3; "Sporen"; "Regel"))', 'round(1000*b_)' × 'round(1000*h_)' mm</h6>
                #end if
                '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
                '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Toets</th><th style="padding:1px 4px; text-align:left;">Norm</th><th style="padding:1px 4px; text-align:right;">combinatie</th><th style="padding:1px 4px; text-align:right;">staaf</th><th style="padding:1px 4px; text-align:right;">UC</th></tr>
                #if staal ≡ 1
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Doorsnede, N en M</td><td style="padding:0 4px;">§6.2.9</td><td style="padding:0 4px; text-align:right;">'floor(g_d/100)'</td><td style="padding:0 4px; text-align:right;">'g_d - 100*floor(g_d/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_d)'">'r2(u_d)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Dwarskracht</td><td style="padding:0 4px;">(6.17)</td><td style="padding:0 4px; text-align:right;">'floor(g_v/100)'</td><td style="padding:0 4px; text-align:right;">'g_v - 100*floor(g_v/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_v)'">'r2(u_v)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Knik</td><td style="padding:0 4px;">(6.46)</td><td style="padding:0 4px; text-align:right;">'floor(g_n/100)'</td><td style="padding:0 4px; text-align:right;">'g_n - 100*floor(g_n/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_n)'">'r2(u_n)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Kip</td><td style="padding:0 4px;">(6.54), bijlage NB.NB</td><td style="padding:0 4px; text-align:right;">'floor(g_l/100)'</td><td style="padding:0 4px; text-align:right;">'g_l - 100*floor(g_l/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_l)'">'r2(u_l)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Druk met buiging</td><td style="padding:0 4px;">(6.61)/(6.62), bijlage B</td><td style="padding:0 4px; text-align:right;">'floor(g_i/100)'</td><td style="padding:0 4px; text-align:right;">'g_i - 100*floor(g_i/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_i)'">'r2(u_i)'</td></tr>
                #else
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Trek of druk met buiging</td><td style="padding:0 4px;">(6.17)/(6.19)</td><td style="padding:0 4px; text-align:right;">'floor(g_d/100)'</td><td style="padding:0 4px; text-align:right;">'g_d - 100*floor(g_d/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_d)'">'r2(u_d)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Afschuiving</td><td style="padding:0 4px;">(6.13), k<sub>cr</sub> = 1,0</td><td style="padding:0 4px; text-align:right;">'floor(g_v/100)'</td><td style="padding:0 4px; text-align:right;">'g_v - 100*floor(g_v/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_v)'">'r2(u_v)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Knik</td><td style="padding:0 4px;">(6.23)/(6.24)</td><td style="padding:0 4px; text-align:right;">'floor(g_n/100)'</td><td style="padding:0 4px; text-align:right;">'g_n - 100*floor(g_n/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_n)'">'r2(u_n)'</td></tr>
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">Kip</td><td style="padding:0 4px;">(6.33)/(6.35)</td><td style="padding:0 4px; text-align:right;">'floor(g_l/100)'</td><td style="padding:0 4px; text-align:right;">'g_l - 100*floor(g_l/100)'</td><td style="padding:0 4px; text-align:right; font-weight:700; color:'kleur(u_l)'">'r2(u_l)'</td></tr>
                #end if
                '</table>
                #if staal ≡ 1
                    '<span class="alleen-scherm">Maatgevend voor de stabiliteit: combinatie 'cg', staaf 'kg': N<sub>Ed</sub> = 'r2(dN)' kN, M<sub>Ed</sub> = 'r2(dM)' kNm, klasse 'dkl', L<sub>cr,y</sub> = 'r2(dLy)' m, λ̄<sub>y</sub> = 'r2(dλy)', χ<sub>y</sub> = 'r2(χf(dλy; αy))', L<sub>cr,z</sub> = 'r2(dLz)' m (kip bij druk binnen of onder over 'r2(vLzi.(kg))' m), λ̄<sub>z</sub> = 'r2(dλz)', χ<sub>z</sub> = 'r2(χf(dλz; αz))', C<sub>1</sub> = 'r2(dC1)', M<sub>cr</sub> = 'r2(dMcr)' kNm, λ̄<sub>LT</sub> = 'r2(dλl)', χ<sub>LT</sub> = 'r2(χlf(dλl))', C<sub>my</sub> = 'r2(dCmy)', C<sub>mLT</sub> = 'r2(dCmLT)'.</span>
                #else
                    '<span class="alleen-scherm">Maatgevend voor knik of kip: combinatie 'cg', staaf 'kg': N<sub>Ed</sub> = 'r2(dN)' kN, M<sub>Ed</sub> = 'r2(dM)' kNm, k<sub>mod</sub> = 'k_mod(dc(cg))', l<sub>ef,y</sub> = 'r2(dLy)' m, λ<sub>rel,y</sub> = 'r2(dλy)', k<sub>c,y</sub> = 'r2(kcf(dλy))', l<sub>ef,z</sub> = 'r2(dLz)' m (kip bij druk binnen of onder over 'r2(vLzi.(kg))' m), λ<sub>rel,z</sub> = 'r2(dλz)', k<sub>c,z</sub> = 'r2(kcf(dλz))', λ<sub>rel,m</sub> = 'r2(dλm)', k<sub>crit</sub> = 'r2(kcritf(dλm))'.</span>
                #end if
            #end if
        #loop
        #if kl4 ≡ 1
            '<b style="color:#b91c1c">Een staaf valt in klasse 4: daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die dit blad niet bepaalt; het rekent aan de onveilige kant met W<sub>el,y</sub>.</b>
        #end if
        #hide
        UC_tb = 0
        tb_druk = 0
        #show
        #if vT.(3) ≡ 3
            '<h6>7.3 Trekband, rond staal S235, Ø 'r2(1000*dtb)' mm</h6>
            #hide
            Nt_tb = 0
            Nc_tb = 0
            #for c = 1 : 13
                #if act(c) ≡ 1
                    Rc = raamwerk(kn; st; opl; last; kamp(c)*F(c))
                    Nt_tb = max(Nt_tb; raamwerk_ext(Rc; 3; 5)[1])
                    Nc_tb = max(Nc_tb; -raamwerk_ext(Rc; 3; 5)[3])
                #end if
            #loop
            N_t,Rd = A_tb*235000/1.0*kN
            N_t,Ed = Nt_tb*kN
            tb_druk = bool(Nc_tb > 0.01)
            #show
            N_t,Ed', grootste trekkracht<span class="kolom-3"></span>'
            N_t,Rd', A·f<sub>y</sub>/γ<sub>M0</sub> met γ<sub>M0</sub> = 1,0, (6.6)<span class="kolom-3"></span>'
            UC_tb = N_t,Ed/N_t,Rd
            #if tb_druk ≡ 1
                '<b style="color:#b91c1c">De trekband krijgt in een combinatie druk ('r2(Nc_tb)' kN): een staaf van rond staal kan dat niet opnemen.</b>
            #end if
            '<i>Niet in dit blad: de draadeinden, de aansluiting en de doorhanging van de trekband.</i><span class="alleen-scherm"></span>
        #end if

        # 8. Toetsing BGT — vervormingen

        '<i>Volgens de NB bij NEN-EN 1990, A1.4.3, bij de karakteristieke combinatie (6.14b) met elke veranderlijke last apart (ψ<sub>0</sub> = 0), zonder scheefstand en zonder vergroting'if(staal ≡ 1; ""; "; hout met k<sub>def</sub> op de permanente last en met de afschuifvervorming (κ = 5/6, G<sub>mean</sub>; 2.2.3(1)P)")'. Het dak: de bijkomende doorbuiging w<sub>2</sub> + w<sub>3</sub> = k<sub>def</sub>·w<sub>G</sub> + w<sub>Q</sub> ≤ l/250 (A1.4.3(3), overige daken) en desgewenst de eindstand w<sub>max</sub> = (1 + k<sub>def</sub>)·w<sub>G</sub> + w<sub>Q</sub> ≤ l/250 (A1.4.3(4)); 'if(systeem ≤ 2; "bij het portaal de verticale verplaatsing van de regel ten opzichte van de lijn door de knieën, met l de overspanning"; "per staaf ten opzichte van zijn koorde, met l de staaflengte")'. De knieën: de horizontale verplaatsing (A1.4.3(7)), h = de laagste kolom.</i><span class="alleen-scherm"></span>
        @select gebouw "Horizontale verplaatsing van de knieën (A1.4.3(7))"
          Andere gebouwen: h/300 = 300
          Industriegebouw: h/150 = 150
          Niet toetsen = 0
        @end
        @select uiterlijk "Eindstand w_max ≤ l/250 (A1.4.3(4))"
          Toetsen = 1
          Niet toetsen = 0
        @end
        #hide
        'Karakteristieke combinatie per veranderlijke last j: 1 dak, 2 sneeuw, 3–4 sneeuw ongelijk, 5–8 wind (links +0,2 en −0,3, rechts +0,2 en −0,3); 0 alleen permanent.
        bj(j) = if(j ≡ 0; 1; act(j + 1))
        Fk(j; cg) = [cg; cg; cg; cg; bool(j ≡ 1); bool(j ≡ 1); bool(j ≡ 2 or j ≡ 3) + 0.5*bool(j ≡ 4); bool(j ≡ 2 or j ≡ 4) + 0.5*bool(j ≡ 3); bool(j ≡ 5); bool(j ≡ 5); bool(j ≡ 5); bool(j ≡ 5); bool(j ≡ 6); bool(j ≡ 6); bool(j ≡ 6); bool(j ≡ 6); bool(j ≡ 7); bool(j ≡ 7); bool(j ≡ 7); bool(j ≡ 7); bool(j ≡ 8); bool(j ≡ 8); bool(j ≡ 8); bool(j ≡ 8); 0; 0]
        'Doorbuiging van het dak (m, absoluut) uit de uitkomst R en de knoopverplaatsingen U.
        wSv(S) = max(S.14; -S.13)
        wS(R; k) = bool(vT.(k) ≡ 2)*wSv(raamwerk_sam(R; k))
        wD(R; U) = if(systeem ≤ 2; max(raamwerk_zak(R; 2; 0; U[2; 3]; Ln; U[4; 3]); raamwerk_zak(R; 3; 0; U[2; 3]; Ln; U[4; 3])); max(wS(R; 1); wS(R; 2)))
        uH(U) = bool(knL ≥ 1)*max(abs(U[max(knL; 1); 2]); abs(U[max(knR; 1); 2]))
        l_rep = if(systeem ≤ 2; Ln; if(systeem ≡ 3; vL.(1); vL.(2)))
        h_min = Hn
        w_bij = 0
        j_bij = 0
        w_mx = wD(raamwerk(kn; st; opl; last; Fk(0; 1 + k_def)); raamwerk_u(kn; st; opl; last; Fk(0; 1 + k_def)))
        j_mx = 0
        u_h = 0
        j_h = 0
        #for j = 1 : 8
            #if bj(j) ≡ 1
                wb = wD(raamwerk(kn; st; opl; last; Fk(j; k_def)); raamwerk_u(kn; st; opl; last; Fk(j; k_def)))
                wm = wD(raamwerk(kn; st; opl; last; Fk(j; 1 + k_def)); raamwerk_u(kn; st; opl; last; Fk(j; 1 + k_def)))
                uh = uH(raamwerk_u(kn; st; opl; last; Fk(j; 1 + k_def)))
                j_bij = if(wb > w_bij; j; j_bij)
                w_bij = max(w_bij; wb)
                j_mx = if(wm > w_mx; j; j_mx)
                w_mx = max(w_mx; wm)
                j_h = if(uh > u_h; j; j_h)
                u_h = max(u_h; uh)
            #end if
        #loop
        jnaam(j) = if(j ≡ 0; "permanent"; if(j ≡ 1; "dak"; if(j ≤ 4; "sneeuw"; if(j ≤ 6; "wind van links"; "wind van rechts"))))
        #show
        'Maatgevend: bijkomend 'jnaam(j_bij)', eindstand 'jnaam(j_mx)''if(knL ≥ 1; ", horizontaal "; "")''if(knL ≥ 1; jnaam(j_h); "")'.<span class="alleen-scherm"></span>
        w_bij,k = 1000*w_bij*mm', w<sub>2</sub> + w<sub>3</sub><span class="kolom-4"></span>'
        w_grens = 1000*l_rep/250*mm', l/250<span class="kolom-4"></span>'
        UC_wbij = w_bij/(l_rep/250)
        #if uiterlijk ≡ 1
            w_max = 1000*w_mx*mm', eindstand<span class="kolom-4"></span>'
            UC_wmax = w_mx/(l_rep/250)
        #else
            #hide
            UC_wmax = 0
            #show
        #end if
        #if knL ≥ 1
            #if gebouw ≥ 1
                u_hor = 1000*u_h*mm', horizontaal in de knie<span class="kolom-4"></span>'
                u_grens = 1000*h_min/gebouw*mm', h/300 of h/150<span class="kolom-4"></span>'
                UC_uh = u_h/(h_min/gebouw)
            #else
                #hide
                UC_uh = 0
                #show
            #end if
        #else
            #hide
            UC_uh = 0
            #show
        #end if

        # 9. Samenvatting

        #hide
        UC_kol = if(nT(1) ≥ 1; max(Ud_1; Uv_1; Un_1; Ul_1; Ui_1); 0)
        UC_reg = max(Ud_2; Uv_2; Un_2; Ul_2; Ui_2)
        #show
        '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
        '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Toets</th><th style="text-align:right; padding:2px 8px;">UC</th><th style="text-align:left; padding:2px 8px;">Oordeel</th></tr>
        #if nT(1) ≥ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Kolommen (§7.1)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_kol)'">'r2(UC_kol)'</td><td style="padding:2px 8px; color:'kleur(UC_kol)'">'oordeel(UC_kol)'</td></tr>
        #end if
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">'if(systeem ≡ 3; "Sporen"; "Regel")' (§7.2)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_reg)'">'r2(UC_reg)'</td><td style="padding:2px 8px; color:'kleur(UC_reg)'">'oordeel(UC_reg)'</td></tr>
        #if vT.(3) ≡ 3
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Trekband (§7.3)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_tb)'">'r2(UC_tb)'</td><td style="padding:2px 8px; color:'kleur(UC_tb)'">'oordeel(UC_tb)'</td></tr>
        #end if
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Doorbuiging dak, bijkomend</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_wbij)'">'r2(UC_wbij)'</td><td style="padding:2px 8px; color:'kleur(UC_wbij)'">'oordeel(UC_wbij)'</td></tr>
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Doorbuiging dak, eindstand</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_wmax)'">'if(uiterlijk ≡ 1; r2(UC_wmax); "—")'</td><td style="padding:2px 8px; color:'kleur(UC_wmax)'">'if(uiterlijk ≡ 1; oordeel(UC_wmax); "niet getoetst")'</td></tr>
        #if knL ≥ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Horizontale verplaatsing</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_uh)'">'if(gebouw ≥ 1; r2(UC_uh); "—")'</td><td style="padding:2px 8px; color:'kleur(UC_uh)'">'if(gebouw ≥ 1; oordeel(UC_uh); "niet getoetst")'</td></tr>
        #end if
        '</table>

        UC_max = max(UC_kol; UC_reg; UC_tb; UC_wbij; UC_wmax; UC_uh)'<span class="alleen-scherm"></span>'
        UC_max'<span class="alleen-afdruk"></span>'
        #if te_klein ≡ 1
            '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red">, maar α<sub>cr</sub> &lt; 3 in een combinatie (§5) → <b>het spant voldoet niet</b></span>
        #else if kl4 ≡ 1
            '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red">, maar een staaf valt in klasse 4 → <b>het spant voldoet niet</b></span>
        #else if tb_druk ≡ 1
            '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red">, maar de trekband krijgt druk → <b>het spant voldoet niet</b></span>
        #else if UC_max ≤ 1.0
            '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>het spant voldoet</b></span>
        #else
            '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red"> > 1.0 → <b>het spant voldoet niet</b></span>
        #end if
        #if R_min < 0
            '<span style="color: #b91c1c"><b>Trek in een oplegging:</b> verankeren voor ten minste 'r2(-R_min)' kN (§6).</span>
        #end if
        'Buiten dit blad: de verbindingen (knie, nok, voet'if(vT.(3) ≡ 3; ", trekband"; "")'), de stabiliteit uit het vlak van het spant (windverbanden), 'if(staal ≡ 1; "plooi van het lijf, "; "")'brand en de fundering.
    #else
        #if status ≡ -1
            '<span class="alleen-scherm"><b>Maatgevende UC = ∞</b></span><span class="oordeel" style="color: red"> → <b>het spant voldoet niet</b>: het systeem is beweeglijk (§4)</span>
        #end if
    #end if
#end if
`;
