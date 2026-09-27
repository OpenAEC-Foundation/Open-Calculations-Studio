/**
 * Betonplaat en console — één blad voor drie constructiedelen van gewapend
 * beton volgens NEN-EN 1992-1-1 met de Nederlandse NB. De keuze bovenin
 * (constructiedeel) bepaalt welk deel rekent.
 *
 * ── Lijnvormig ondersteunde vloerplaat (constructiedeel 1) ──────────────────
 *
 * Eenzijdig of tweezijdig dragend; per rand vrij opgelegd, doorgaand of
 * ingeklemd. Een doorgaande rand krijgt de schaakbordbelasting als splitsing:
 * g + q/2 op alle velden met de doorgaande randen ingeklemd, plus ± q/2
 * afwisselend met de doorgaande randen vrij opgelegd (bij een oneindige
 * doorgaande strook is dat exact). Een ingeklemde rand is in beide delen
 * ingeklemd. Het steunpuntsmoment rekent met de volle belasting en ingeklemde
 * doorgaande randen.
 *
 *   • Tweezijdig dragend, l_lang/l_kort ≤ 2: momentcoëfficiënten uit een eigen
 *     plaatberekening, dunne plaat (Kirchhoff) met ν = 0,2 (3.1.3(4)),
 *     eindige differenties met Richardson-extrapolatie, hoeken verankerd.
 *     Per richting het wapeningsmoment m + |m_xy| van 5.1.1(8) (NB), als
 *     piekwaarde over de hele plaat; boven ook de wringing in de vrij
 *     opgelegde hoeken (9.3.1.3). De tabel staat verborgen in het blad, per
 *     geval (aantal doorgaande of ingeklemde randen langs de lange en de korte
 *     zijden) en per verhouding 1,0 … 2,0; scripts/check-betonplaat.mjs rekent
 *     hem na (met --tabel maakt het script hem opnieuw) en toetst de plaatberekening aan de
 *     gesloten reeksoplossing van een vrij opgelegde plaat.
 *   • Eenzijdig dragend (en tweezijdig met l_lang/l_kort > 2, 5.3.1(5)): een
 *     strook als ligger op twee steunpunten, met ql²/8, 9ql²/128 of ql²/24 in
 *     het veld en ql²/8 of ql²/12 bij een ingeklemd einde. Verdeelwapening in
 *     de andere richting ten minste 20 % (9.3.1.1(2)).
 *
 * ── Vlakke plaat op kolommen (constructiedeel 2) ────────────────────────────
 *
 * Methode van de equivalente raamwerken (I.1.2): per richting een doorgaande
 * ligger over de kolomlijnen met de volle paneelbreedte, dezelfde
 * coëfficiënten en splitsing als de eenzijdig dragende plaat. Kolomstrook
 * 0,5·l_min breed (figuur I.1, I.1.2(4)), middenstrook de rest. De verdeling
 * volgt tabel I.1 met aandelen die de gebruiker kiest binnen de grenzen van de
 * tabel. Een randkolom is een scharnier voor het veldmoment; het moment naar
 * de randkolom (I.1.2(5)) en de randwapening (9.4.2) zijn niet getoetst.
 * Bovenwapening boven een middenkolom: 0,5·A_t binnen 0,125 × de veldbreedten
 * (9.4.1(2)). Pons: het blad Pons.
 *
 * ── Per wapeningslaag (beide platen) ────────────────────────────────────────
 *
 * Buiging (§6.1, spanningsblok, staal met horizontale tak of elastisch als
 * het niet vloeit), A_s,min volgens de NB bij 9.2.1.1(1) (de kleinste van
 * W·f_ctm en 1,25 × nodig), s_max,platen volgens de NB bij 9.3.1.1(3) en (8),
 * scheurwijdte (§7.3.4) onder de frequente combinatie zoals het blad
 * Betondoorsnede, met een ongescheurde doorsnede als m_fr ≤ W·f_ctm (7.1(2)).
 * Doorbuiging met de slankheidsregel (7.16a/b) en (7.17), K uit tabel 7.4N
 * (normatief volgens de NB), met 7/l_eff of 8,5/l_eff bij kwetsbare
 * scheidingswanden; A_s,prov/A_s,req in (7.17) ten hoogste 1,5 (een eigen
 * ontwerpaanname). Dwarskracht is niet getoetst.
 *
 * ── Korte console (constructiedeel 3) ───────────────────────────────────────
 *
 * Staafwerkmodel van figuur J.5 (§6.5, J.3(1)): trekband op d, onderste knoop
 * aan de kolomzijde met een drukzone y_0 onder σ_Rd = k_1·ν'·f_cd (6.60).
 * Momentevenwicht om die knoop: F_td·z_0 = F_Ed·a_c + H_Ed·(a_H + z_0), met
 * z_0 = d − y_0/2 volgt z_0 = d/2 + √(d²/4 − M_0/(2·b·σ_Rd)). 1 ≤ tan θ = z_0/a_c
 * ≤ 2,5 (J.3(1)); een steilere diagonaal rekent met a_c = z_0/2,5.
 * H_Ed ten minste 0,2·F_Ed: een ontwerpaanname voor krimp, kruip en
 * temperatuur, EN 1992-1-1 zelf noemt geen minimum. Bovenste knoop (6.61) met
 * k_2 = 0,85 op de oplegplaat en op de diagonaal (figuur 6.27, u = 2·(h_c − d));
 * de diagonaal daar ook als drukstaaf met dwarstrek, 0,6·ν'·f_cd (6.5.2(2)).
 * Aan de kolomzijde spreidt de diagonaal in de gedrukte kolom: alleen de knoop.
 * Beugels volgens J.3(2) of J.3(3) met k_1 = 0,25 en k_2 = 0,5 (NB),
 * V_Rd,c met σ_cp uit H_Ed. Verankering (8.4) aan beide zijden volgens J.3(4).
 *
 * Variabelenamen komen overeen met BetonplaatDesigner.tsx; dat beeld leest de
 * uitkomsten uit dit blad. Controle: scripts/check-betonplaat.mjs.
 */

export const betonplaat = `"Betonplaat en console — EN 1992-1-1 §6.1, §6.5, §7.3, §7.4.2, bijlage I en J.3

'<i>Eén blad voor drie constructiedelen: een lijnvormig ondersteunde vloerplaat (eenzijdig of tweezijdig dragend), een vlakke plaat op kolommen met kolom- en middenstroken (bijlage I) en een korte console met een staafwerkmodel (§6.5 en J.3). Een positief moment geeft trek onderin.</i><span class="alleen-scherm"></span>

@select constructiedeel "Constructiedeel"
  Lijnvormig ondersteunde vloerplaat = 1
  Vlakke plaat op kolommen = 2
  Korte console (a_c < z_0) = 3
@end

# 1. Materiaal

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
f_ck = betonklasse*N/mm^2
f_yk = 500 N/mm^2
E_s = 200000 N/mm^2
γ_C = 1.5
γ_S = 1.15
λ = 0.8
η = 1.0
ε_cu3 = 0.0035
E_cm = 22000*((betonklasse + 8)/10)^0.3*N/mm^2
uc(a; r) = if(a ≤ 0*r; 0; a/r)
#show
f_cd = f_ck/γ_C', α<sub>cc</sub> = 1,0 (NB)<span class="kolom-3"></span>'
f_yd = f_yk/γ_S'<span class="kolom-3"></span>'
f_ctm = 0.3*betonklasse^(2/3)*N/mm^2', tabel 3.1<span class="kolom-3"></span>'
'γ<sub>C</sub> = 1,5 en γ<sub>S</sub> = 1,15 (tabel 2.1N); λ = 0,8 en η = 1,0 (3.19)–(3.22); ε<sub>cu3</sub> = 3,5 ‰ (tabel 3.1); staal met horizontale tak (3.2.7(2)b).

#if constructiedeel ≤ 2

    # 2. Plaat, randen en belasting

    #if constructiedeel ≡ 1
        @select draagwijze "Draagwijze"
          Tweezijdig dragend, op vier randen = 2
          Eenzijdig dragend, in de x-richting = 1
        @end
    #else
        #hide
        draagwijze = 2
        #show
    #end if

    h_pl = ?*(mm)', plaatdikte h<span class="kolom-4"></span>'
    c_pl = ?*(mm)', dekking c<span class="kolom-4"></span>'
    #if constructiedeel ≡ 2
        l_x = ?*(m)', l<sub>x</sub>, kolomafstand in x<span class="kolom-4"></span>'
        l_y = ?*(m)', l<sub>y</sub>, kolomafstand in y<span class="kolom-4"></span>'
    #else if draagwijze ≡ 2
        l_x = ?*(m)', l<sub>x</sub>, overspanning in x (5.3.2.2)<span class="kolom-4"></span>'
        l_y = ?*(m)', l<sub>y</sub>, overspanning in y<span class="kolom-4"></span>'
    #else
        l_x = ?*(m)', l<sub>x</sub>, overspanning (5.3.2.2)<span class="kolom-4"></span>'
        #hide
        l_y = l_x
        #show
    #end if

    '<i>Randen: vrij opgelegd (bij een vlakke plaat een randkolom, als scharnier), doorgaand over de oplegging of volledig ingeklemd. Bij een doorgaande rand telt de schaakbordbelasting mee als g + q/2 op alle velden met die rand ingeklemd, plus ± q/2 afwisselend met die rand vrij opgelegd; het steunpuntsmoment rekent met de volle belasting.</i><span class="alleen-scherm"></span>
    @select rand_x0 "Rand x = 0"
      Vrij opgelegd of randkolom = 0
      Doorgaand = 1
      Ingeklemd = 2
    @end
    @select rand_x1 "Rand x = l_x"
      Vrij opgelegd of randkolom = 0
      Doorgaand = 1
      Ingeklemd = 2
    @end
    #if draagwijze ≡ 2
        @select rand_y0 "Rand y = 0"
          Vrij opgelegd of randkolom = 0
          Doorgaand = 1
          Ingeklemd = 2
        @end
        @select rand_y1 "Rand y = l_y"
          Vrij opgelegd of randkolom = 0
          Doorgaand = 1
          Ingeklemd = 2
        @end
    #else
        #hide
        rand_y0 = 0
        rand_y1 = 0
        #show
    #end if

    g_Ed = ?*(kN/m^2)', UGT, permanent, met het eigen gewicht<span class="kolom-4"></span>'
    q_Ed = ?*(kN/m^2)', UGT, veranderlijk<span class="kolom-4"></span>'
    g_fr = ?*(kN/m^2)', BGT frequent (NB), permanent<span class="kolom-4"></span>'
    q_fr = ?*(kN/m^2)', BGT frequent, ψ<sub>1</sub>·q<sub>k</sub><span class="kolom-4"></span>'
    g_k,eg = 25 kN/m^3*h_pl to kN/m^2', eigen gewicht, karakteristiek: 25 kN/m³ (tabel A.1 van EN 1991-1-1, met de wapening)<span class="alleen-scherm"></span>'
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

    @select wanden "Scheidingswanden die door doorbuiging kunnen beschadigen (7.4.2(2))"
      Nee = 0
      Ja = 1
    @end

    # 3. Wapening

    @select buitenlaag "Buitenste laag, onder en boven"
      x-richting = 1
      y-richting = 2
    @end

    ds_xo = ?*(mm)', onder x: Ø<span class="kolom-4"></span>'
    s_xo = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
    ds_yo = ?*(mm)', onder y: Ø<span class="kolom-4"></span>'
    s_yo = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
    #if constructiedeel ≡ 2
        ds_xb = ?*(mm)', boven x, kolomstrook: Ø<span class="kolom-4"></span>'
        s_xb = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
        ds_yb = ?*(mm)', boven y, kolomstrook: Ø<span class="kolom-4"></span>'
        s_yb = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
        ds_xm = ?*(mm)', boven x, middenstrook: Ø<span class="kolom-4"></span>'
        s_xm = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
        ds_ym = ?*(mm)', boven y, middenstrook: Ø<span class="kolom-4"></span>'
        s_ym = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
        k_neg = ?', aandeel kolomstrook, steunpunt (tabel I.1: 0,60–0,80)<span class="kolom-2"></span>'
        k_pos = ?', aandeel kolomstrook, veld (0,50–0,70)<span class="kolom-2"></span>'
    #else if draagwijze ≡ 2
        ds_xb = ?*(mm)', boven x: Ø<span class="alleen-scherm">, bij de randen x = 0 en x = l<sub>x</sub> en in de hoeken</span><span class="kolom-4"></span>'
        s_xb = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
        ds_yb = ?*(mm)', boven y: Ø<span class="alleen-scherm">, bij de randen y = 0 en y = l<sub>y</sub> en in de hoeken</span><span class="kolom-4"></span>'
        s_yb = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
    #else if rand_x0 + rand_x1 > 0
        ds_xb = ?*(mm)', boven x: Ø<span class="alleen-scherm">, bij de doorgaande of ingeklemde randen</span><span class="kolom-4"></span>'
        s_xb = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
    #end if
    #hide
    'Wat niet gevraagd is, krijgt een plaatsvervanger die nergens meetelt.
    #if constructiedeel ≡ 1 and draagwijze ≡ 1 and rand_x0 + rand_x1 ≡ 0
        ds_xb = ds_xo
        s_xb = s_xo
    #end if
    #if constructiedeel ≡ 1 and draagwijze ≡ 1
        ds_yb = ds_yo
        s_yb = s_yo
    #end if
    #if constructiedeel ≡ 1
        ds_xm = ds_xb
        s_xm = s_xb
        ds_ym = ds_yb
        s_ym = s_yb
    #end if
    bx_ = if(buitenlaag ≡ 1; 1; 0)
    d_xo = h_pl - c_pl - if(bx_ ≡ 1; ds_xo/2; ds_yo + ds_xo/2)
    d_yo = h_pl - c_pl - if(bx_ ≡ 1; ds_xo + ds_yo/2; ds_yo/2)
    d_xb = h_pl - c_pl - if(bx_ ≡ 1; ds_xb/2; ds_yb + ds_xb/2)
    d_yb = h_pl - c_pl - if(bx_ ≡ 1; ds_xb + ds_yb/2; ds_yb/2)
    d_xm = h_pl - c_pl - if(bx_ ≡ 1; ds_xm/2; ds_ym + ds_xm/2)
    d_ym = h_pl - c_pl - if(bx_ ≡ 1; ds_xm + ds_ym/2; ds_ym/2)
    c_xo = c_pl + if(bx_ ≡ 1; 0 mm; ds_yo)
    c_yo = c_pl + if(bx_ ≡ 1; ds_xo; 0 mm)
    c_xb = c_pl + if(bx_ ≡ 1; 0 mm; ds_yb)
    c_yb = c_pl + if(bx_ ≡ 1; ds_xb; 0 mm)
    c_xm = c_pl + if(bx_ ≡ 1; 0 mm; ds_ym)
    c_ym = c_pl + if(bx_ ≡ 1; ds_xm; 0 mm)
    staven = min(ds_xo; ds_yo; ds_xb; ds_yb; ds_xm; ds_ym)
    ruimte = min(s_xo - ds_xo; s_yo - ds_yo; s_xb - ds_xb; s_yb - ds_yb; s_xm - ds_xm; s_ym - ds_ym)
    diepte = min(d_xo; d_yo; d_xb; d_yb; d_xm; d_ym)
    l_min = min(l_x; l_y)
    l_max = max(l_x; l_y)
    past = if(h_pl > 0 mm and c_pl ≥ 0 mm and staven > 0 mm and ruimte > 0 mm and diepte > 0 mm and l_min > 0 m and l_min ≥ 5*h_pl; 1; 0)
    #show

    #if past ≡ 0
        '<b style="color:#b91c1c">De plaat is niet compleet: een overspanning, dikte, staaf of h.o.h.-afstand is nul, de staven liggen tegen elkaar, de nuttige hoogte is nul of de kleinste overspanning is kleiner dan 5·h (dan is het geen plaat, 5.3.1(4)): er valt niets te toetsen.</b>
        '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
    #else
        #hide
        b_str = 1000 mm
        nxc = if(rand_x0 ≥ 1; 1; 0) + if(rand_x1 ≥ 1; 1; 0)
        nxs = if(rand_x0 ≡ 2; 1; 0) + if(rand_x1 ≡ 2; 1; 0)
        nyc = if(rand_y0 ≥ 1; 1; 0) + if(rand_y1 ≥ 1; 1; 0)
        nys = if(rand_y0 ≡ 2; 1; 0) + if(rand_y1 ≡ 2; 1; 0)
        cf_veld(n) = if(n ≡ 0; 1/8; if(n ≡ 1; 9/128; 1/24))
        cf_steun(n) = if(n ≡ 0; 0; if(n ≡ 1; 1/8; 1/12))
        K_n(n) = if(n ≡ 0; 1.0; if(n ≡ 1; 1.3; 1.5))
        ε_l = l_max/l_min
        UC_pl,xo = 0
        UC_pl,yo = 0
        UC_pl,xb = 0
        UC_pl,yb = 0
        UC_pl,xm = 0
        UC_pl,ym = 0
        UC_verd = 0
        UC_941 = 0
        a_s,req,xo = 0 mm^2
        a_s,req,yo = 0 mm^2
        #show

        # 4. Momenten per m breedte

        #if constructiedeel ≡ 1 and draagwijze ≡ 2 and ε_l ≤ 2
            '<i>Momentcoëfficiënten uit een eigen plaatberekening: dunne plaat (Kirchhoff) met ν = 0,2 (3.1.3(4)), eindige differenties met Richardson-extrapolatie, hoeken verankerd tegen opwippen. Per richting het wapeningsmoment m + |m<sub>xy</sub>| van 5.1.1(8) (NB), als piekwaarde zonder de middeling over stroken die daar is toegestaan; boven ook de wringing in de vrij opgelegde hoeken (9.3.1.3). Tabel voor l<sub>lang</sub>/l<sub>kort</sub> = 1,0 tot 2,0 in stappen van 0,1, lineair geïnterpoleerd; alle coëfficiënten maal p·l<sub>kort</sub>².</i><span class="alleen-scherm"></span>
            #hide
            'Per geval k = 3·n_k + n_l + 1 een rij: n_k doorgaande of ingeklemde randen langs de lange zijden (die dragen
            'de korte overspanning), n_l langs de korte zijden. Kolom j: l_lang/l_kort = 1 + (j − 1)/10.
            'ko en lo: onder, moment in de korte en de lange richting; kb en lb: boven.
            Tko_1 = [0.0442; 0.05189; 0.05924; 0.06614; 0.07252; 0.07836; 0.08366; 0.08843; 0.09271; 0.09654; 0.09994]
            Tko_2 = [0.0332; 0.0394; 0.04651; 0.05373; 0.06068; 0.06724; 0.07335; 0.07897; 0.0841; 0.08875; 0.09293]
            Tko_3 = [0.02381; 0.02897; 0.03479; 0.04149; 0.04849; 0.05536; 0.06198; 0.06826; 0.07413; 0.07955; 0.08453]
            Tko_4 = [0.03931; 0.04421; 0.04851; 0.05222; 0.05539; 0.05807; 0.06032; 0.0622; 0.06376; 0.06505; 0.06611]
            Tko_5 = [0.03122; 0.03638; 0.04134; 0.04584; 0.0498; 0.05323; 0.05617; 0.05867; 0.06078; 0.06254; 0.06402]
            Tko_6 = [0.02362; 0.0285; 0.03356; 0.03849; 0.04306; 0.04719; 0.05085; 0.05403; 0.05678; 0.05913; 0.06111]
            Tko_7 = [0.03166; 0.03426; 0.0363; 0.03789; 0.0391; 0.04001; 0.04068; 0.04117; 0.04151; 0.04174; 0.04189]
            Tko_8 = [0.02668; 0.03005; 0.03283; 0.03508; 0.03686; 0.03826; 0.03933; 0.04014; 0.04074; 0.04118; 0.04149]
            Tko_9 = [0.02114; 0.02502; 0.02845; 0.03137; 0.03379; 0.03576; 0.03733; 0.03856; 0.03951; 0.04023; 0.04077]
            Tlo_1 = [0.0442; 0.04526; 0.04674; 0.04826; 0.04964; 0.05082; 0.05177; 0.05254; 0.05315; 0.05363; 0.054]
            Tlo_2 = [0.03931; 0.04164; 0.04347; 0.04517; 0.04682; 0.04836; 0.04971; 0.05085; 0.05179; 0.05254; 0.05314]
            Tlo_3 = [0.03166; 0.03478; 0.03726; 0.03909; 0.04033; 0.04103; 0.0413; 0.04157; 0.04194; 0.04233; 0.04269]
            Tlo_4 = [0.0332; 0.03404; 0.03478; 0.03535; 0.03575; 0.03601; 0.0362; 0.03631; 0.03638; 0.03642; 0.03644]
            Tlo_5 = [0.03122; 0.03226; 0.03328; 0.03416; 0.03487; 0.03539; 0.03577; 0.03602; 0.03619; 0.0363; 0.03637]
            Tlo_6 = [0.02668; 0.02798; 0.02859; 0.02866; 0.02854; 0.02854; 0.02859; 0.02865; 0.02871; 0.02874; 0.02876]
            Tlo_7 = [0.02381; 0.0237; 0.0236; 0.0235; 0.02343; 0.02338; 0.02334; 0.02331; 0.02329; 0.02328; 0.02327]
            Tlo_8 = [0.02362; 0.02363; 0.02361; 0.02357; 0.0235; 0.02344; 0.02339; 0.02335; 0.02332; 0.0233; 0.02328]
            Tlo_9 = [0.02114; 0.02098; 0.0203; 0.01956; 0.01907; 0.01874; 0.01851; 0.01836; 0.01825; 0.01819; 0.01814]
            Tkb_1 = [0.03712; 0.04053; 0.04338; 0.0457; 0.04757; 0.04906; 0.05024; 0.05116; 0.05188; 0.05244; 0.05287]
            Tkb_2 = [0.03056; 0.03457; 0.03813; 0.04121; 0.04381; 0.04596; 0.04772; 0.04914; 0.05028; 0.05118; 0.05188]
            Tkb_3 = [0.01652; 0.01939; 0.02217; 0.02475; 0.02709; 0.02915; 0.03093; 0.03244; 0.03369; 0.03472; 0.03556]
            Tkb_4 = [0.08388; 0.09147; 0.09788; 0.1032; 0.1076; 0.1112; 0.1141; 0.1165; 0.1184; 0.12; 0.1212]
            Tkb_5 = [0.06944; 0.07838; 0.08632; 0.09321; 0.09909; 0.104; 0.1082; 0.1116; 0.1144; 0.1166; 0.1185]
            Tkb_6 = [0.05503; 0.0643; 0.07309; 0.08116; 0.08838; 0.09471; 0.1002; 0.1048; 0.1087; 0.1119; 0.1146]
            Tkb_7 = [0.06984; 0.07391; 0.077; 0.0793; 0.08098; 0.08219; 0.08304; 0.0836; 0.08396; 0.08417; 0.08426]
            Tkb_8 = [0.06128; 0.06689; 0.07137; 0.07488; 0.07758; 0.07961; 0.08111; 0.08219; 0.08296; 0.08348; 0.08381]
            Tkb_9 = [0.05133; 0.0581; 0.0639; 0.06871; 0.07259; 0.07566; 0.07803; 0.07984; 0.08119; 0.08217; 0.08287]
            Tlb_1 = [0.03712; 0.04053; 0.04338; 0.0457; 0.04757; 0.04906; 0.05024; 0.05116; 0.05188; 0.05244; 0.05287]
            Tlb_2 = [0.08388; 0.09179; 0.09848; 0.104; 0.1085; 0.1121; 0.115; 0.1173; 0.1191; 0.1204; 0.1215]
            Tlb_3 = [0.06984; 0.07876; 0.08678; 0.0938; 0.09981; 0.1049; 0.109; 0.1124; 0.1152; 0.1174; 0.1191]
            Tlb_4 = [0.03056; 0.03219; 0.03336; 0.03416; 0.03471; 0.03507; 0.03531; 0.03546; 0.03555; 0.03561; 0.03564]
            Tlb_5 = [0.06944; 0.07329; 0.07604; 0.07796; 0.07925; 0.08011; 0.08066; 0.081; 0.08121; 0.08134; 0.0814]
            Tlb_6 = [0.06128; 0.06672; 0.07098; 0.0742; 0.07655; 0.07822; 0.07937; 0.08015; 0.08066; 0.08099; 0.08119]
            Tlb_7 = [0.01652; 0.01682; 0.01697; 0.01703; 0.01704; 0.01703; 0.01701; 0.01699; 0.01698; 0.01696; 0.01695]
            Tlb_8 = [0.05503; 0.05624; 0.05686; 0.05712; 0.0572; 0.05718; 0.05713; 0.05707; 0.05702; 0.05698; 0.05694]
            Tlb_9 = [0.05133; 0.05384; 0.05541; 0.05632; 0.0568; 0.05702; 0.0571; 0.0571; 0.05707; 0.05703; 0.05699]
            T_ko = [Tko_1; Tko_2; Tko_3; Tko_4; Tko_5; Tko_6; Tko_7; Tko_8; Tko_9]
            T_lo = [Tlo_1; Tlo_2; Tlo_3; Tlo_4; Tlo_5; Tlo_6; Tlo_7; Tlo_8; Tlo_9]
            T_kb = [Tkb_1; Tkb_2; Tkb_3; Tkb_4; Tkb_5; Tkb_6; Tkb_7; Tkb_8; Tkb_9]
            T_lb = [Tlb_1; Tlb_2; Tlb_3; Tlb_4; Tlb_5; Tlb_6; Tlb_7; Tlb_8; Tlb_9]
            kort_x = if(l_x ≤ l_y; 1; 0)
            k_c = 3*if(kort_x ≡ 1; nxc; nyc) + if(kort_x ≡ 1; nyc; nxc) + 1
            k_s = 3*if(kort_x ≡ 1; nxs; nys) + if(kort_x ≡ 1; nys; nxs) + 1
            j_ε = min(floor((ε_l - 1)*10) + 1; 10)
            f_ε = (ε_l - 1)*10 - (j_ε - 1)
            ip(T; k) = T.(k; j_ε)*(1 - f_ε) + T.(k; j_ε + 1)*f_ε
            α_xo,c = ip(if(kort_x ≡ 1; T_ko; T_lo); k_c)
            α_xo,s = ip(if(kort_x ≡ 1; T_ko; T_lo); k_s)
            α_yo,c = ip(if(kort_x ≡ 1; T_lo; T_ko); k_c)
            α_yo,s = ip(if(kort_x ≡ 1; T_lo; T_ko); k_s)
            α_xb,c = ip(if(kort_x ≡ 1; T_kb; T_lb); k_c)
            α_xb,s = ip(if(kort_x ≡ 1; T_kb; T_lb); k_s)
            α_yb,c = ip(if(kort_x ≡ 1; T_lb; T_kb); k_c)
            α_yb,s = ip(if(kort_x ≡ 1; T_lb; T_kb); k_s)
            #show
            ε_l', l<sub>lang</sub>/l<sub>kort</sub><span class="kolom-3"></span>'
            'Doorgaand of ingeklemd: 'nxc' rand(en) in x en 'nyc' in y; daarvan ingeklemd: 'nxs' in x en 'nys' in y. Coëfficiënten met de doorgaande randen ingeklemd (c) en vrij opgelegd (s):
            α_xo,c'<span class="kolom-4"></span>'
            α_yo,c'<span class="kolom-4"></span>'
            α_xb,c'<span class="kolom-4"></span>'
            α_yb,c'<span class="kolom-4"></span>'
            α_xo,s'<span class="kolom-4"></span>'
            α_yo,s'<span class="kolom-4"></span>'
            α_xb,s'<span class="kolom-4"></span>'
            α_yb,s'<span class="kolom-4"></span>'
            m_Ed,xo = (α_xo,c*(g_Ed + q_Ed/2) + α_xo,s*q_Ed/2)*l_min^2*b_str to kN*m', onder x, per m'
            m_Ed,yo = (α_yo,c*(g_Ed + q_Ed/2) + α_yo,s*q_Ed/2)*l_min^2*b_str to kN*m', onder y, per m'
            m_Ed,xb = max(α_xb,c*(g_Ed + q_Ed); α_xb,c*(g_Ed + q_Ed/2) + α_xb,s*q_Ed/2)*l_min^2*b_str to kN*m', boven x: rand of hoek, per m'
            m_Ed,yb = max(α_yb,c*(g_Ed + q_Ed); α_yb,c*(g_Ed + q_Ed/2) + α_yb,s*q_Ed/2)*l_min^2*b_str to kN*m', boven y, per m'
            #hide
            m_fr,xo = (α_xo,c*(g_fr + q_fr/2) + α_xo,s*q_fr/2)*l_min^2*b_str to kN*m
            m_fr,yo = (α_yo,c*(g_fr + q_fr/2) + α_yo,s*q_fr/2)*l_min^2*b_str to kN*m
            m_fr,xb = max(α_xb,c*(g_fr + q_fr); α_xb,c*(g_fr + q_fr/2) + α_xb,s*q_fr/2)*l_min^2*b_str to kN*m
            m_fr,yb = max(α_yb,c*(g_fr + q_fr); α_yb,c*(g_fr + q_fr/2) + α_yb,s*q_fr/2)*l_min^2*b_str to kN*m
            m_Ed,xm = 0 kN*m
            m_Ed,ym = 0 kN*m
            m_fr,xm = 0 kN*m
            m_fr,ym = 0 kN*m
            hoofd_y = 1
            r_ld = if(kort_x ≡ 1; 1; 2)
            l_ld = l_min
            K_ld = K_n(if(kort_x ≡ 1; nxc; nyc))
            l_wand = 7 m
            #show
            m_fr,xo'<span class="kolom-4"></span>'
            m_fr,yo'<span class="kolom-4"></span>'
            m_fr,xb'<span class="kolom-4"></span>'
            m_fr,yb', BGT frequent<span class="kolom-4"></span>'
        #else if constructiedeel ≡ 1
            #if draagwijze ≡ 2
                '<i>l<sub>lang</sub>/l<sub>kort</sub> = 'ε_l' > 2: de plaat draagt in de korte richting (5.3.1(5)) en rekent als strook; de momenten bij de korte randen zijn niet getoetst.</i>
            #end if
            #hide
            r_x = if(draagwijze ≡ 1 or l_x ≤ l_y; 1; 0)
            nrc = if(r_x ≡ 1; nxc; nyc)
            nrs = if(r_x ≡ 1; nxs; nys)
            l_r = if(r_x ≡ 1; l_x; l_y)
            #show
            '<i>Strook van 1 m als ligger op twee steunpunten: in het veld pl²/8, 9pl²/128 of pl²/24 bij nul, één of twee ingeklemde einden, bij een ingeklemd einde pl²/8 of pl²/12. Dragend in de 'if(r_x ≡ 1; "x"; "y")'-richting.</i><span class="alleen-scherm"></span>
            β_f,c = cf_veld(nrc)', veld, doorgaande einden ingeklemd<span class="kolom-3"></span>'
            β_f,s = cf_veld(nrs)', veld, doorgaande einden vrij opgelegd<span class="kolom-3"></span>'
            β_s = cf_steun(nrc)', steunpunt<span class="kolom-3"></span>'
            m_Ed,ro = (β_f,c*(g_Ed + q_Ed/2) + β_f,s*q_Ed/2)*l_r^2*b_str to kN*m', veld, per m'
            m_Ed,rb = β_s*(g_Ed + q_Ed)*l_r^2*b_str to kN*m', steunpunt, per m'
            #hide
            m_fr,ro = (β_f,c*(g_fr + q_fr/2) + β_f,s*q_fr/2)*l_r^2*b_str to kN*m
            m_fr,rb = β_s*(g_fr + q_fr)*l_r^2*b_str to kN*m
            m_Ed,xo = if(r_x ≡ 1; m_Ed,ro; 0*m_Ed,ro)
            m_Ed,yo = if(r_x ≡ 1; 0*m_Ed,ro; m_Ed,ro)
            m_Ed,xb = if(r_x ≡ 1; m_Ed,rb; 0*m_Ed,rb)
            m_Ed,yb = if(r_x ≡ 1; 0*m_Ed,rb; m_Ed,rb)
            m_fr,xo = if(r_x ≡ 1; m_fr,ro; 0*m_fr,ro)
            m_fr,yo = if(r_x ≡ 1; 0*m_fr,ro; m_fr,ro)
            m_fr,xb = if(r_x ≡ 1; m_fr,rb; 0*m_fr,rb)
            m_fr,yb = if(r_x ≡ 1; 0*m_fr,rb; m_fr,rb)
            m_Ed,xm = 0 kN*m
            m_Ed,ym = 0 kN*m
            m_fr,xm = 0 kN*m
            m_fr,ym = 0 kN*m
            hoofd_y = 0
            r_ld = if(r_x ≡ 1; 1; 2)
            l_ld = l_r
            K_ld = K_n(nrc)
            l_wand = 7 m
            #show
            m_fr,ro', BGT frequent, veld<span class="kolom-2"></span>'
            m_fr,rb', steunpunt<span class="kolom-2"></span>'
        #else
            '<i>Methode van de equivalente raamwerken (I.1.2): per richting een doorgaande ligger over de kolomlijnen met de volle paneelbreedte, met de coëfficiënten en de schaakbordbelasting van hierboven. Kolomstrook 0,5·l<sub>min</sub> breed (figuur I.1, I.1.2(4)), middenstrook de rest; verdeling volgens tabel I.1. Een randkolom is een scharnier voor het veldmoment; het moment naar de randkolom (I.1.2(5), ten hoogste 0,17·b<sub>e</sub>·d²·f<sub>ck</sub>) en de randwapening (9.4.2) zijn niet getoetst. Pons: zie het blad Pons (§6.4).</i><span class="alleen-scherm"></span>
            k_neg,g = min(max(k_neg; 0.6); 0.8)', kolomstrook, steunpunt, binnen tabel I.1<span class="kolom-3"></span>'
            k_pos,g = min(max(k_pos; 0.5); 0.7)', kolomstrook, veld<span class="kolom-3"></span>'
            b_k = 0.5*l_min', kolomstrook (figuur I.1)<span class="kolom-3"></span>'
            #if k_neg,g ≠ k_neg or k_pos,g ≠ k_pos
                '<b style="color:#b45309">Een aandeel ligt buiten tabel I.1 en is begrensd tot de tabel.</b>
            #end if
            M_x,neg = cf_steun(nxc)*(g_Ed + q_Ed)*l_x^2*l_y to kN*m', steunpunt, hele paneelbreedte l<sub>y</sub><span class="kolom-2"></span>'
            M_x,pos = (cf_veld(nxc)*(g_Ed + q_Ed/2) + cf_veld(nxs)*q_Ed/2)*l_x^2*l_y to kN*m', veld<span class="kolom-2"></span>'
            M_y,neg = cf_steun(nyc)*(g_Ed + q_Ed)*l_y^2*l_x to kN*m', steunpunt, hele paneelbreedte l<sub>x</sub><span class="kolom-2"></span>'
            M_y,pos = (cf_veld(nyc)*(g_Ed + q_Ed/2) + cf_veld(nys)*q_Ed/2)*l_y^2*l_x to kN*m', veld<span class="kolom-2"></span>'
            m_Ed,xb = k_neg,g*M_x,neg/b_k*b_str to kN*m', boven x, kolomstrook, per m<span class="kolom-2"></span>'
            m_Ed,xm = (1 - k_neg,g)*M_x,neg/(l_y - b_k)*b_str to kN*m', boven x, middenstrook<span class="kolom-2"></span>'
            m_Ed,yb = k_neg,g*M_y,neg/b_k*b_str to kN*m', boven y, kolomstrook<span class="kolom-2"></span>'
            m_Ed,ym = (1 - k_neg,g)*M_y,neg/(l_x - b_k)*b_str to kN*m', boven y, middenstrook<span class="kolom-2"></span>'
            m_Ed,xo = max(k_pos,g/b_k; (1 - k_pos,g)/(l_y - b_k))*M_x,pos*b_str to kN*m', onder x: de grootste van kolom- en middenstrook<span class="kolom-2"></span>'
            m_Ed,yo = max(k_pos,g/b_k; (1 - k_pos,g)/(l_x - b_k))*M_y,pos*b_str to kN*m', onder y<span class="kolom-2"></span>'
            #hide
            f_x = (cf_veld(nxc)*(g_fr + q_fr/2) + cf_veld(nxs)*q_fr/2)/max(cf_veld(nxc)*(g_Ed + q_Ed/2) + cf_veld(nxs)*q_Ed/2; 1e-9 kN/m^2)
            f_y = (cf_veld(nyc)*(g_fr + q_fr/2) + cf_veld(nys)*q_fr/2)/max(cf_veld(nyc)*(g_Ed + q_Ed/2) + cf_veld(nys)*q_Ed/2; 1e-9 kN/m^2)
            f_s = (g_fr + q_fr)/max(g_Ed + q_Ed; 1e-9 kN/m^2)
            m_fr,xo = f_x*m_Ed,xo
            m_fr,yo = f_y*m_Ed,yo
            m_fr,xb = f_s*m_Ed,xb
            m_fr,yb = f_s*m_Ed,yb
            m_fr,xm = f_s*m_Ed,xm
            m_fr,ym = f_s*m_Ed,ym
            hoofd_y = 1
            r_ld = if(l_x ≥ l_y; 1; 2)
            l_ld = l_max
            K_ld = 1.2
            l_wand = 8.5 m
            #show
            'BGT frequent: dezelfde verdeling met g<sub>fr</sub> en q<sub>fr</sub>.
        #end if

        # 5. Toetsing per wapeningslaag (§6.1, §9.3 en §7.3.4)

        #hide
        μ_l = λ*ε_cu3/(ε_cu3 + f_yd/E_s)*(1 - λ*ε_cu3/(ε_cu3 + f_yd/E_s)/2)
        'Nodige wapening per m: drukzone uit het spanningsblok, staal op f_yd of elastisch als het niet vloeit;
        'boven μ = λ(1 − λ/2) = 0,48 past het niet, ook niet met elastisch staal.
        xq(m; d) = if(m ≤ 0*m; 0*d; (d - sqrt(max(d^2 - 2*m/(η*f_cd*b_str); 0*d^2)))/λ)
        a_nodig(m; d) = if(m/(η*f_cd*b_str*d^2) > 0.48; 1/0*mm^2; η*f_cd*b_str*λ*xq(m; d)/min(f_yd; E_s*ε_cu3*(d - xq(m; d))/max(xq(m; d); 1e-9 mm)))
        m_cr = f_ctm*b_str*h_pl^2/6 to kN*m
        k_t = if(belastingduur ≡ 1; 0.4; 0.6)
        φ_t = if(belastingduur ≡ 1; φ_kr; 0)
        α_e = E_s/E_cm
        α_L = α_e*(1 + φ_t)
        w_max = if(milieuklasse ≡ 1; 0.4; if(milieuklasse ≡ 2; 0.3; 0.2))*mm
        #show
        '<i>Per laag: buiging (§6.1, spanningsblok, staal op f<sub>yd</sub> of elastisch als het niet vloeit); A<sub>s,min</sub> de kleinste van de wapening voor W·f<sub>ctm</sub> en 1,25 × de nodige (NB bij 9.2.1.1(1), via 9.3.1.1(1)); s<sub>max</sub> = 2h ≤ 250 mm voor hoofdwapening in gebieden met het grootste moment (NB bij 9.3.1.1(3)); scheurwijdte onder de frequente combinatie (7.3.4, tabel 7.1N van de NB), ongescheurd als m<sub>fr</sub> ≤ W·f<sub>ctm</sub> (7.1(2)). k<sub>t</sub> = 'k_t', α<sub>L</sub> = E<sub>s</sub>/E<sub>c,eff</sub> = 'α_L', w<sub>max</sub> = 'w_max' mm.</i><span class="alleen-scherm"></span>

        #if hoofd_y ≡ 1 or r_ld ≡ 1
            plaatToets$(xo; "Onder, x-richting"; ds_xo; s_xo; d_xo; c_xo)
        #end if
        #if hoofd_y ≡ 1 or r_ld ≡ 2
            plaatToets$(yo; "Onder, y-richting"; ds_yo; s_yo; d_yo; c_yo)
        #end if
        #if hoofd_y ≡ 0
            '<b>Onder, 'if(r_ld ≡ 1; "y"; "x")'-richting: verdeelwapening (9.3.1.1(2))</b>
            #hide
            a_s,h = if(r_ld ≡ 1; pi/4*ds_xo^2/s_xo; pi/4*ds_yo^2/s_yo)*b_str to mm^2
            a_s,v = if(r_ld ≡ 1; pi/4*ds_yo^2/s_yo; pi/4*ds_xo^2/s_xo)*b_str to mm^2
            s_v = if(r_ld ≡ 1; s_yo; s_xo)
            #show
            a_s,v', aanwezig, per m<span class="kolom-3"></span>'
            a_s,v,min = 0.2*a_s,h', 20 % van de hoofdwapening (9.3.1.1(2))<span class="kolom-3"></span>'
            s_max,v = min(3*h_pl; 400 mm; if(h_pl > 250 mm; 250 mm; 400 mm))', NB bij 9.3.1.1(3) en (8)<span class="kolom-3"></span>'
            UC_verd = max(uc(a_s,v,min; a_s,v); s_v/s_max,v)', verdeelwapening'
        #end if
        #if m_Ed,xb > 0 kN*m
            plaatToets$(xb; if(constructiedeel ≡ 2; "Boven, x-richting, kolomstrook"; "Boven, x-richting"); ds_xb; s_xb; d_xb; c_xb)
        #end if
        #if m_Ed,yb > 0 kN*m
            plaatToets$(yb; if(constructiedeel ≡ 2; "Boven, y-richting, kolomstrook"; "Boven, y-richting"); ds_yb; s_yb; d_yb; c_yb)
        #end if
        #if constructiedeel ≡ 2
            #if m_Ed,xm > 0 kN*m
                plaatToets$(xm; "Boven, x-richting, middenstrook"; ds_xm; s_xm; d_xm; c_xm)
            #end if
            #if m_Ed,ym > 0 kN*m
                plaatToets$(ym; "Boven, y-richting, middenstrook"; ds_ym; s_ym; d_ym; c_ym)
            #end if
            #if nxc + nyc > 0
                '<b>Bovenwapening boven een middenkolom (9.4.1(2))</b>
                '<i>Tenzij de BGT nauwkeurig is berekend: 0,5·A<sub>t</sub> binnen een breedte van 0,125 × de veldbreedten aan weerszijden van de kolom, met A<sub>t</sub> de wapening voor het hele steunpuntsmoment over de paneelbreedte. Bij gelijke velden is die strook 0,25 × de paneelbreedte.</i><span class="alleen-scherm"></span>
                #hide
                A_t,x = a_nodig(M_x,neg/l_y*b_str; d_xb)*l_y/b_str
                A_t,y = a_nodig(M_y,neg/l_x*b_str; d_yb)*l_x/b_str
                b_bx = 0.25*l_y
                b_by = 0.25*l_x
                A_bx = (a_s,xb*min(b_bx; b_k) + a_s,xm*max(b_bx - b_k; 0 m))/b_str
                A_by = (a_s,yb*min(b_by; b_k) + a_s,ym*max(b_by - b_k; 0 m))/b_str
                #show
                A_t,x = A_t,x to mm^2', x-richting<span class="kolom-3"></span>'
                b_bx', strook<span class="kolom-3"></span>'
                A_bx = A_bx to mm^2', aanwezig in de strook<span class="kolom-3"></span>'
                A_t,y = A_t,y to mm^2', y-richting<span class="kolom-3"></span>'
                b_by'<span class="kolom-3"></span>'
                A_by = A_by to mm^2'<span class="kolom-3"></span>'
                UC_941 = max(uc(0.5*A_t,x; A_bx); uc(0.5*A_t,y; A_by))', 0,5·A<sub>t</sub>/A<sub>strook</sub>'
            #end if
            '<i>Onderwapening over de kolom: in elke richting ten minste twee staven die doorlopen (9.4.1(3)).</i><span class="alleen-scherm"></span>
        #end if

        # 6. Doorbuiging (§7.4.2)

        #hide
        a_s,req,ld = if(r_ld ≡ 1; a_s,req,xo; a_s,req,yo)
        a_s,ld = if(r_ld ≡ 1; pi/4*ds_xo^2/s_xo*b_str; pi/4*ds_yo^2/s_yo*b_str) to mm^2
        d_ld = if(r_ld ≡ 1; d_xo; d_yo)
        f_ck_ = betonklasse
        #show
        #if a_s,req,ld ≤ 0 mm^2
            '<i>Geen moment in het veld: de doorbuiging is niet getoetst.</i>
            #hide
            UC_ld = 0
            #show
        #else
            '<i>Slankheid van de 'if(constructiedeel ≡ 2; "grootste overspanning (vlakke plaatvloer)"; "kortste overspanning")' in de 'if(r_ld ≡ 1; "x"; "y")'-richting; K uit tabel 7.4N (normatief volgens de NB)'if(constructiedeel ≡ 1; ", uit de randen langs die overspanning: vrij opgelegd 1,0, één doorgaande of ingeklemde rand 1,3, twee 1,5"; "")'. ρ met de nodige wapening, (7.17) met A<sub>s,prov</sub>/A<sub>s,req</sub> (f<sub>yk</sub> = 500), zonder drukwapening.</i><span class="alleen-scherm"></span>
            K_ld', tabel 7.4N<span class="kolom-4"></span>'
            ρ_0 = sqrt(f_ck_)/1000', 10<sup>−3</sup>·√f<sub>ck</sub><span class="kolom-4"></span>'
            ρ_ld = a_s,req,ld/(b_str*d_ld)', nodig<span class="kolom-4"></span>'
            d_ld', nuttige hoogte<span class="kolom-4"></span>'
            #if ρ_ld ≤ ρ_0
                ld_basis = K_ld*(11 + 1.5*sqrt(f_ck_)*ρ_0/ρ_ld + 3.2*sqrt(f_ck_)*(ρ_0/ρ_ld - 1)^1.5)', (7.16a)'
            #else
                ld_basis = K_ld*(11 + 1.5*sqrt(f_ck_)*ρ_0/ρ_ld)', (7.16b) met ρ′ = 0'
            #end if
            f_ld = min(a_s,ld/a_s,req,ld; 1.5)', (7.17): 310/σ<sub>s</sub> = A<sub>s,prov</sub>/A<sub>s,req</sub>, ten hoogste 1,5 (ontwerpaanname: de norm stelt geen grens, maar meer overwapening verkleint de doorbuiging niet evenredig)<span class="kolom-2"></span>'
            #if wanden ≡ 1 and l_ld > l_wand
                f_w = l_wand/l_ld', 7/l<sub>eff</sub>, bij een vlakke plaatvloer 8,5/l<sub>eff</sub>: kwetsbare scheidingswanden<span class="kolom-2"></span>'
            #else
                #hide
                f_w = 1
                #show
            #end if
            ld_grens = ld_basis*f_ld*f_w', toelaatbare l/d'
            ld = l_ld/d_ld', aanwezige l/d'
            UC_ld = ld/ld_grens
        #end if

        #if h_pl < 80 mm
            '<b style="color:#b91c1c">Een massieve vloer is ten minste 80 mm dik (§9.3, NB).</b>
        #end if

        # 7. Samenvatting

        #hide
        UC_h = 80 mm/h_pl
        #show
        UC_max = max(UC_pl,xo; UC_pl,yo; UC_pl,xb; UC_pl,yb; UC_pl,xm; UC_pl,ym; UC_verd; UC_941; UC_ld; UC_h)', grootste van de toetsen hierboven'
        #if UC_max ≤ 1
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #end if

#else

    # 2. Console, oplegging en belasting

    '<i>Korte console volgens het staafwerkmodel van figuur J.5: een trekband op de nuttige hoogte d, een drukdiagonaal van de oplegging naar de onderste knoop aan de kolomzijde, en daar een drukzone y<sub>0</sub> in de kolom. a<sub>c</sub> is de afstand van F<sub>Ed</sub> tot de kolom; H<sub>Ed</sub> grijpt aan op de oplegging, positief naar buiten.</i><span class="alleen-scherm"></span>
    b_con = ?*(mm)', breedte b<span class="kolom-4"></span>'
    h_con = ?*(mm)', hoogte h<sub>c</sub> aan de kolom<span class="kolom-4"></span>'
    l_con = ?*(mm)', lengte vanaf de kolom<span class="kolom-4"></span>'
    a_con = ?*(mm)', a<sub>c</sub><span class="kolom-4"></span>'
    l_opl = ?*(mm)', oplegplaat: lengte<span class="kolom-4"></span>'
    b_opl = ?*(mm)', breedte<span class="kolom-4"></span>'
    h_opl = ?*(mm)', hoogte van H<sub>Ed</sub> boven de console<span class="kolom-4"></span>'
    c_con = ?*(mm)', dekking<span class="kolom-4"></span>'
    F_Ed = ?*(kN)', verticaal, UGT<span class="kolom-2"></span>'
    H_Ed = ?*(kN)', horizontaal, naar buiten +<span class="kolom-2"></span>'

    # 3. Wapening

    n_hfd = ?', hoofdtrekwapening: aantal<span class="kolom-4"></span>'
    ds_hfd = ?*(mm)', Ø<span class="kolom-4"></span>'
    n_bgl = ?', gesloten beugels: aantal<span class="kolom-4"></span>'
    ds_bgl = ?*(mm)', Ø<span class="kolom-4"></span>'
    l_bkol = ?*(mm)', beschikbare verankeringslengte in de kolom, vanaf de verticale kolomwapening aan de consolezijde (J.3(4))'

    @select aanhechting "Aanhechting van de hoofdtrekwapening (figuur 8.2)"
      Slecht = 2
      Goed = 1
    @end

    @select staafvorm "Hoofdtrekwapening aan de uiteinden"
      Recht = 1
      Haak, bocht of lus = 2
      Recht met gelaste dwarsstaaf = 3
    @end

    #hide
    A_hfd = n_hfd*pi/4*ds_hfd^2 to mm^2
    A_lnk = n_bgl*2*pi/4*ds_bgl^2 to mm^2
    d_con = h_con - c_con - ds_bgl - ds_hfd/2
    l_b,con = l_con - c_con - (a_con - l_opl/2)
    past_c = if(b_con > 0 mm and h_con > 0 mm and a_con > 0 mm and l_opl > 0 mm and b_opl > 0 mm and b_opl ≤ b_con and h_opl ≥ 0 mm and c_con ≥ 0 mm and n_hfd ≥ 1 and ds_hfd > 0 mm and ds_bgl ≥ 0 mm and n_bgl ≥ 0 and d_con > 0 mm and a_con + l_opl/2 < l_con - c_con and F_Ed > 0 kN; 1; 0)
    #show
    'Hoofdtrekwapening 'n_hfd'Ø'ds_hfd': A<sub>s</sub> = 'A_hfd' mm²; 'n_bgl' gesloten beugels Ø'ds_bgl' met twee sneden: A<sub>s,lnk</sub> = 'A_lnk' mm².
    #if past_c ≡ 0
        '<b style="color:#b91c1c">De console is niet compleet: een maat, de belasting of de hoofdtrekwapening is nul, de oplegplaat is breder dan de console of ligt niet vóór het einde van de staven, of de nuttige hoogte is nul: er valt niets te toetsen.</b>
        '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
    #else
        d_con', h<sub>c</sub> − c − Ø<sub>bgl</sub> − Ø/2: de beugels omsluiten de hoofdtrekwapening<span class="kolom-3"></span>'

        # 4. Staafwerkmodel (§6.5 en J.3)

        ν_k = 1 - betonklasse/250', ν′ (6.57N, NB)<span class="kolom-3"></span>'
        σ_Rd,1 = 1.0*ν_k*f_cd', knoop zonder verankerde trekstaaf (6.60), k<sub>1</sub> = 1,0 (NB)<span class="kolom-3"></span>'
        σ_Rd,2 = 0.85*ν_k*f_cd', druk-trekknoop (6.61), k<sub>2</sub> = 0,85 (NB)<span class="kolom-3"></span>'
        H_Ed,r = max(H_Ed; 0.2*F_Ed)', ten minste 0,2·F<sub>Ed</sub>: een ontwerpaanname voor krimp, kruip en temperatuur bij een oplegging zonder glijlaag, EN 1992-1-1 noemt zelf geen minimum'
        a_H = h_con - d_con + h_opl', H<sub>Ed</sub> boven de trekband<span class="kolom-3"></span>'
        #hide
        bσ = b_con*σ_Rd,1
        M_1 = F_Ed*a_con + H_Ed,r*a_H
        D_1 = d_con^2/4 - M_1/(2*bσ)
        z_1 = d_con/2 + sqrt(max(D_1; 0 mm^2))
        steil = if(D_1 ≥ 0 mm^2 and z_1 > 2.5*a_con; 1; 0)
        Dd = d_con - 0.2*F_Ed/bσ
        D_2 = Dd^2/4 - H_Ed,r*a_H/(2*bσ)
        z_2 = Dd/2 + sqrt(max(D_2; 0 mm^2))
        #show
        #if steil ≡ 1
            a_c,eff = z_2/2.5', tan θ begrensd tot 2,5 (J.3(1)): a<sub>c</sub> = z<sub>0</sub>/2,5<span class="kolom-3"></span>'
        #else
            #hide
            a_c,eff = a_con
            #show
        #end if
        M_0 = F_Ed*a_c,eff + H_Ed,r*a_H to kN*m', om de onderste knoop, zonder het deel H<sub>Ed</sub>·z<sub>0</sub><span class="kolom-3"></span>'
        UC_N2 = M_0/(0.5*b_con*σ_Rd,1*d_con^2)', onderste knoop: M<sub>0</sub> ≤ ½·b·σ<sub>Rd,1</sub>·d², de drukzone y<sub>0</sub> past binnen d'
        #if UC_N2 > 1
            '<b style="color:#b91c1c">De drukzone aan de kolomzijde past niet: de console is te laag of te smal voor deze belasting.</b>
            '<b>Maatgevende UC = 'UC_N2'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #else
            z_0 = d_con/2 + sqrt(d_con^2/4 - M_0/(2*b_con*σ_Rd,1))', F<sub>td</sub>·z<sub>0</sub> = M<sub>0</sub> + H<sub>Ed</sub>·z<sub>0</sub> met z<sub>0</sub> = d − y<sub>0</sub>/2'
            tan_θ = z_0/a_con', z<sub>0</sub>/a<sub>c</sub>, 1,0 ≤ tan θ ≤ 2,5 (J.3(1))<span class="kolom-3"></span>'
            y_0 = 2*(d_con - z_0)', drukzone aan de kolomzijde<span class="kolom-3"></span>'
            #if tan_θ < 1
                '<b style="color:#b91c1c">a<sub>c</sub> ≥ z<sub>0</sub>: dit is geen korte console (J.3(1)); reken het als uitkraging.</b>
                '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>voldoet niet</b>: geen korte console.</span>
            #else
                F_td = M_0/z_0 + H_Ed,r to kN', trekband'
                UC_T = F_td/(A_hfd*f_yd)', F<sub>td</sub>/(A<sub>s</sub>·f<sub>yd</sub>)'
                #hide
                C_h = F_td - H_Ed,r
                C_d = sqrt(F_Ed^2 + C_h^2)
                sin_θ = F_Ed/C_d
                cos_θ = C_h/C_d
                #show
                σ_opl = F_Ed/(l_opl*b_opl) to N/mm^2', oplegplaat<span class="kolom-3"></span>'
                u_kn = 2*(h_con - d_con)', knoophoogte rond de trekband (figuur 6.27)<span class="kolom-3"></span>'
                a_2 = l_opl*sin_θ + u_kn*cos_θ', breedte van de diagonaal aan de knoop<span class="kolom-3"></span>'
                C_d = C_d to kN', kracht in de drukdiagonaal<span class="kolom-3"></span>'
                σ_diag = C_d/(b_opl*a_2) to N/mm^2', aan de bovenste knoop<span class="kolom-3"></span>'
                UC_N1 = σ_opl/σ_Rd,2', bovenste knoop, oplegvlak (6.61)<span class="kolom-2"></span>'
                UC_N1d = σ_diag/σ_Rd,2', bovenste knoop, diagonaal (6.61)<span class="kolom-2"></span>'
                σ_Rd,d = 0.6*ν_k*f_cd', drukdiagonaal met dwarstrek, gescheurde zone (6.5.2(2), (6.56))<span class="kolom-3"></span>'
                UC_dd = σ_diag/σ_Rd,d', drukdiagonaal, aan de bovenste knoop waar zij het smalst is (6.5.2(2))'
                '<i>Aan de kolomzijde gaat de diagonaal over in de gedrukte kolom en spreidt zij over de kolomdoorsnede: daar is alleen de knoop getoetst (UC<sub>N2</sub>, aanname).</i><span class="alleen-scherm"></span>

                # 5. Beugels (J.3(2) en (3))

                #if a_con ≤ 0.5*h_con
                    A_lnk,min = 0.25*A_hfd', a<sub>c</sub> ≤ 0,5·h<sub>c</sub>: gesloten horizontale of schuine beugels, k<sub>1</sub>·A<sub>s,main</sub> met k<sub>1</sub> = 0,25 (J.3(2), NB)'
                #else
                    #hide
                    kV = min(1 + sqrt(200 mm/d_con); 2)
                    ρ_c = min(A_hfd/(b_con*d_con); 0.02)
                    σ_cp = -H_Ed,r/(b_con*h_con) to N/mm^2
                    v_c = max(0.18/γ_C*kV*(100*ρ_c*betonklasse)^(1/3); 0.035*kV^1.5*sqrt(betonklasse))*N/mm^2
                    #show
                    V_Rd,c = max((v_c + 0.15*σ_cp)*b_con*d_con; 0 kN) to kN', (6.2a/b) met σ<sub>cp</sub> = −H<sub>Ed</sub>/(b·h<sub>c</sub>), C<sub>Rd,c</sub> = 0,18/γ<sub>C</sub> (NB)'
                    #if F_Ed > V_Rd,c
                        A_lnk,min = 0.5*F_Ed/f_yd to mm^2', a<sub>c</sub> > 0,5·h<sub>c</sub> en F<sub>Ed</sub> > V<sub>Rd,c</sub>: gesloten verticale beugels, k<sub>2</sub>·F<sub>Ed</sub>/f<sub>yd</sub> met k<sub>2</sub> = 0,5 (J.3(3), NB)'
                    #else
                        '<i>F<sub>Ed</sub> ≤ V<sub>Rd,c</sub>: J.3(3) vraagt geen verticale beugels.</i>
                        #hide
                        A_lnk,min = 0 mm^2
                        #show
                    #end if
                #end if
                UC_bgl = uc(A_lnk,min; A_lnk)', A<sub>s,lnk,min</sub>/A<sub>s,lnk</sub>'

                # 6. Verankering (J.3(4) en §8.4)

                #hide
                η_1 = if(aanhechting ≡ 1; 1.0; 0.7)
                η_2 = if(ds_hfd ≤ 32 mm; 1.0; (132 - ds_hfd/mm)/100)
                α_1 = if(staafvorm ≡ 2 and c_con > 3*ds_hfd; 0.7; 1.0)
                α_4 = if(staafvorm ≡ 3; 0.7; 1.0)
                #show
                η_1', 1,0 bij goede, 0,7 bij slechte aanhechting<span class="kolom-3"></span>'
                α_1', tabel 8.2: 0,7 bij een haak, bocht of lus met c<sub>d</sub> > 3Ø<span class="kolom-3"></span>'
                f_bd = 2.25*η_1*η_2*0.7*f_ctm/γ_C', (8.2), α<sub>ct</sub> = 1,0 (NB)<span class="kolom-3"></span>'
                σ_sd = min(F_td/A_hfd; f_yd) to N/mm^2', staalspanning in de trekband<span class="kolom-3"></span>'
                l_b,rqd = ds_hfd/4*σ_sd/f_bd', (8.3)<span class="kolom-3"></span>'
                l_b,min = max(0.3*l_b,rqd; 10*ds_hfd; 100 mm)', (8.6)<span class="kolom-3"></span>'
                α_4', tabel 8.2: 0,7 met een gelaste dwarsstaaf<span class="kolom-3"></span>'
                l_bd = max(α_1*α_4*l_b,rqd; l_b,min)', (8.4), α<sub>2</sub>, α<sub>3</sub> en α<sub>5</sub> = 1,0<span class="kolom-3"></span>'
                l_b,con', in de console, vanaf de binnenkant van de oplegplaat (J.3(4))<span class="kolom-3"></span>'
                UC_vk = uc(l_bd; max(l_bkol; 0 mm))', in de kolom; geen lengte (≤ 0) geeft ∞<span class="kolom-2"></span>'
                UC_vc = uc(l_bd; l_b,con)', in de console<span class="kolom-2"></span>'
                '<i>Bij bijzondere eisen aan de scheurbeperking helpen schuine beugels bij de aansluiting van de bovenkant op de kolom (J.3(5)).</i><span class="alleen-scherm"></span>

                # 7. Samenvatting

                UC_max = max(UC_T; UC_N1; UC_N1d; UC_dd; UC_N2; UC_bgl; UC_vk; UC_vc)', grootste van de toetsen hierboven'
                #if UC_max ≤ 1
                    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
                #else
                    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
                #end if
            #end if
        #end if
    #end if
#end if

#def plaatToets$(sfx$; titel$; dsP$; sP$; ddP$; ccP$)
'<b>'titel$'</b>: Ø'dsP$'–'sP$' mm, dekking op de staaf 'ccP$' mm
#hide
d_pl,sfx = ddP
a_s,sfx = pi/4*dsP^2/sP*b_str to mm^2
a_s,req,sfx = a_nodig(m_Ed,sfx; d_pl,sfx)
xR_ = a_s,sfx*f_yd/(η*f_cd*λ*b_str)
xlim_ = ε_cu3/(ε_cu3 + f_yd/E_s)*d_pl,sfx
Aq_ = η*f_cd*λ*b_str
Bq_ = a_s,sfx*E_s*ε_cu3
xE_ = (-Bq_ + sqrt(Bq_^2 + 4*Aq_*Bq_*d_pl,sfx))/(2*Aq_)
x_u,sfx = if(xR_ ≤ xlim_; xR_; xE_) to mm
#show
m_Ed,sfx', rekenmoment, per m<span class="kolom-4"></span>'
d_pl,sfx', nuttige hoogte<span class="kolom-4"></span>'
a_s,sfx', aanwezig, per m<span class="kolom-4"></span>'
x_u,sfx', drukzone<span class="kolom-4"></span>'
m_Rd,sfx = η*f_cd*λ*x_u,sfx*b_str*(d_pl,sfx - λ*x_u,sfx/2) to kN*m', §6.1<span class="kolom-2"></span>'
UC_M,sfx = m_Ed,sfx/m_Rd,sfx'<span class="kolom-2"></span>'
#hide
a_s,min1,sfx = a_nodig(m_cr; d_pl,sfx)
a_s,min2,sfx = 1.25*a_s,req,sfx
#show
a_s,req,sfx', nodig<span class="kolom-4"></span>'
a_s,min1,sfx', voor W·f<sub>ctm</sub><span class="kolom-4"></span>'
a_s,min2,sfx', 1,25 × nodig<span class="kolom-4"></span>'
a_s,min,sfx = min(a_s,min1,sfx; a_s,min2,sfx)', NB<span class="kolom-4"></span>'
UC_min,sfx = uc(a_s,min,sfx; a_s,sfx)', A<sub>s,min</sub>/A<sub>s</sub><span class="kolom-2"></span>'
UC_s,sfx = sP/min(2*h_pl; 250 mm)', s/s<sub>max,platen</sub><span class="kolom-2"></span>'
#if m_fr,sfx ≤ m_cr
    '<i>m<sub>fr</sub> = 'm_fr,sfx$' kNm ≤ W·f<sub>ctm</sub> = 'm_cr' kNm: ongescheurd (7.1(2)), geen scheurwijdte.</i>
    #hide
    UC_w,sfx = 0
    #show
#else
    m_fr,sfx', BGT frequent<span class="kolom-4"></span>'
    x_fr,sfx = (sqrt((α_L*a_s,sfx)^2 + 2*b_str*α_L*a_s,sfx*d_pl,sfx) - α_L*a_s,sfx)/b_str to mm', gescheurd: ½·b·x² = α<sub>L</sub>·A<sub>s</sub>·(d − x)<span class="kolom-4"></span>'
    σ_s,sfx = m_fr,sfx/(a_s,sfx*(d_pl,sfx - x_fr,sfx/3)) to N/mm^2'<span class="kolom-4"></span>'
    ρ_p,eff,sfx = a_s,sfx/(b_str*min(2.5*(h_pl - d_pl,sfx); (h_pl - x_fr,sfx)/3; h_pl/2))', (7.10)<span class="kolom-4"></span>'
    #if sP ≤ 5*(ccP + dsP/2)
        s_r,max,sfx = min(3.4*ccP + 0.8*0.5*0.425*dsP/ρ_p,eff,sfx; max(50 - 0.8*betonklasse; 15)*dsP)', (7.11), ten hoogste max(50 − 0,8·f<sub>ck</sub>; 15)·Ø<span class="kolom-2"></span>'
    #else
        s_r,max,sfx = 1.3*(h_pl - x_fr,sfx)', (7.14)<span class="kolom-2"></span>'
    #end if
    w_k,sfx = s_r,max,sfx*max((σ_s,sfx - k_t*f_ctm/ρ_p,eff,sfx*(1 + α_e*ρ_p,eff,sfx))/E_s; 0.6*σ_s,sfx/E_s) to mm', (7.8) en (7.9)<span class="kolom-2"></span>'
    UC_w,sfx = w_k,sfx/w_max'<span class="kolom-2"></span>'
#end if
UC_pl,sfx = max(UC_M,sfx; UC_min,sfx; UC_s,sfx; UC_w,sfx)', grootste voor deze laag'
#end def
`;
