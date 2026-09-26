/**
 * Brandwerendheid van een stalen profiel volgens NEN-EN 1993-1-2 met de
 * Nederlandse nationale bijlage, bij de standaardbrandkromme (ISO 834).
 *
 * Invoer zoals het parametrische beeld (BrandwerendheidDesigner.tsx): profiel,
 * staalsoort, werking van het element, eis, verhitting, de belasting bij brand
 * en de bekleding. Getoetst:
 *   • de doorsnedeklasse bij brand (§4.2.2, ε = 0,85·√(235/f_y));
 *   • de kritieke temperatuur. Zonder instabiliteit (ligger met verhinderde
 *     kip, trekstaaf) met (4.22) uit μ_0 = E_fi,d/R_fi,d,0 (4.23), bij een
 *     ligger met κ_1 en κ_2 (§4.2.3.3(7) en (8)). Bij kip of knik de
 *     temperatuur waarbij de weerstand met χ_LT,fi of χ_fi (§4.2.3.3,
 *     §4.2.3.2) gelijk wordt aan E_fi,d, gevonden door halvering. In
 *     doorsnedeklasse 4 350 °C (§4.2.3.6);
 *   • de staaltemperatuur na de eis, incrementeel: onbekleed (4.25) met k_sh
 *     (4.26a) en ḣ_net uit NEN-EN 1991-1-2 (3.1) t/m (3.3), Δt = 5 s; bekleed
 *     (4.27) en (4.28), Δt = 30 s: de grootste stap volgens §4.2.5.1 en
 *     §4.2.5.2. c_a(θ) volgens §3.4.1.2, gaskromme (3.4) van NEN-EN 1991-1-2;
 *   • UC = θ_a,t/θ_a,cr; bij kip of knik daarnaast de weerstand bij θ_a,t.
 *
 * De stap houdt de staaltemperatuur onder de gastemperatuur. Bij een
 * realistische bekleding raakt die grens nooit; hij voorkomt dat de expliciete
 * stap bij een onzinnig dunne bekleding (d_p van een millimeter met een grote
 * λ_p) gaat slingeren.
 *
 * Aannames: gelijkmatige staaltemperatuur over doorsnede en lengte, vocht in de
 * bekleding verwaarloosd en de afrondingen van het profiel niet in de omtrek;
 * alle drie aan de veilige kant. Niet getoetst: dwarskracht, druk met buiging
 * (§4.2.3.5) en de verbindingen.
 *
 * Profielen HEA 100–300, HEB 100–300 en IPE 200–400 (id 1–27, gelijk aan
 * profielOpties() in profielen.ts). Geen referentieberekening beschikbaar;
 * scripts/check-brand.mjs rekent de uitkomsten onafhankelijk na.
 */

export const brandwerendheid = `"Brandwerendheid — stalen profiel volgens EN 1993-1-2

'<i>De staaltemperatuur na de brandwerendheidseis bij de standaardbrandkromme, getoetst aan de kritieke temperatuur van het profiel. Zonder instabiliteit volgt die uit de benuttingsgraad μ<sub>0</sub> met (4.22), bij kip of knik uit de weerstand met χ<sub>fi</sub>; in doorsnedeklasse 4 is hij 350 °C.</i><span class="alleen-scherm"></span>

# 1. Element

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

@select eis_min "Brandwerendheidseis"
  30 minuten = 30
  60 minuten = 60
  90 minuten = 90
  120 minuten = 120
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

# 2. Belasting bij brand

@select bron_fi "Belasting bij brand"
  ηfi × rekenwaarde bij normale temperatuur = 1
  Rekenwaarde in de buitengewone combinatie, zelf ingevuld = 2
@end

#if bron_fi ≡ 1
    '<i>E<sub>fi,d</sub> = η<sub>fi</sub>·E<sub>d</sub> (§2.4.2(2)). Vereenvoudigd is η<sub>fi</sub> = 0,65, bij categorie E 0,7 (§2.4.2(3)). Bij een overwegend blijvende belasting komt η<sub>fi</sub> hoger uit, tot 1/γ<sub>G</sub> uit (6.10a), in CC2 1/1,35 = 0,74: reken hem dan uit, of vul de rekenwaarde uit (6.11b) van NEN-EN 1990 in.</i><span class="alleen-scherm"></span>
#else
    '<i>De rekenwaarde uit de buitengewone combinatie (6.11b) van NEN-EN 1990, met alle γ = 1,0 en ψ<sub>2,1</sub> bij de overheersende veranderlijke belasting (tabel NB.10 – A1.3 van de NB; ψ<sub>1,1</sub> alleen voor wind bij brand in de beoordeling van disproportionele schade).</i><span class="alleen-scherm"></span>
#end if
#if werking ≤ 2
    #if bron_fi ≡ 1
        M_Ed = ?*(kN*m)', grootste moment bij normale temperatuur<span class="kolom-2"></span>'
        η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
        E_fi,d = η_fi*abs(M_Ed) to kN*m', §2.4.2(2)<span class="alleen-scherm">; het teken van de invoer telt niet</span>'
    #else
        M_fi = ?*(kN*m)', grootste moment bij brand (6.11b)'
        E_fi,d = abs(M_fi) to kN*m
    #end if
#else
    #if bron_fi ≡ 1
        N_Ed = ?*(kN)', normaalkracht bij normale temperatuur<span class="kolom-2"></span>'
        η_fi = ?', reductiefactor (§2.4.2(3))<span class="kolom-2"></span>'
        E_fi,d = η_fi*abs(N_Ed) to kN', §2.4.2(2)<span class="alleen-scherm">; het teken van de invoer telt niet</span>'
    #else
        N_fi = ?*(kN)', normaalkracht bij brand (6.11b)'
        E_fi,d = abs(N_fi) to kN
    #end if
#end if
#if werking ≡ 2
    L_kip = ?*(m)', kiplengte tussen de gaffels<span class="kolom-3"></span>'
    C_1 = ?', tabel NB.NB.1<span class="kolom-3"></span>'
    C_2 = ?', tabel NB.NB.1<span class="alleen-scherm">, negatief bij een last op de bovenflens;een gelijkmatige last op de bovenflens, naar het buitenvlak geëxtrapoleerd: −0,45·h/(h − t<sub>f</sub>)</span><span class="kolom-3"></span>'
#else if werking ≡ 3
    L_fi = ?*(m)', kniklengte bij brand<span class="alleen-scherm">; in een geschoord gebouw met een brandcompartiment per verdieping 0,5·L, op de bovenste verdieping 0,7·L (§4.2.3.2)</span>'
#end if

# 3. Bekleding

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

# 4. Kritieke temperatuur

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
#if klasse ≡ 4
    θ_a,cr = 350', °C, doorsnedeklasse 4 (aanbevolen waarde van §4.2.3.6)'
    #hide
    μ_0 = 0
    #show
#else if werking ≡ 1 or werking ≡ 4
    #if werking ≡ 1
        #hide
        κ_1 = if(verhitting ≡ 3; if(bekleed ≡ 1; 0.85; 0.7); 1)
        κ_2 = if(schema ≡ 2; 0.85; 1)
        #show
        κ_1', §4.2.3.3(7)<span class="alleen-scherm">; 0,7 of 0,85 alleen met een beton- of staalplaatbetonvloer aan de vierde zijde, anders 1,0: kies dan vierzijdig (veilige kant)</span><span class="kolom-3"></span>'
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

# 5. Staaltemperatuur

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

# 6. Toetsing

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
#end if
#hide
UC_max = if(μ_0 > 1; if(instab ≡ 1; UC_R; μ_0); if(instab ≡ 1; max(UC_θ; UC_R); UC_θ))
#show
#if t_kr > 0 and θ_a,cr > 20
    '<span style="color:#b91c1c">θ<sub>a,cr</sub> is bereikt na 't_kr' minuten.</span>
#end if
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het profiel voldoet aan R 'eis_min'</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het profiel voldoet niet aan R 'eis_min'</b></span>
#end if

'<i>Gelijkmatige staaltemperatuur over doorsnede en lengte, zonder vocht in de bekleding en zonder de afrondingen in de omtrek (veilige kant). Niet getoetst: dwarskracht, druk met buiging (§4.2.3.5) en de verbindingen.</i>
`;
