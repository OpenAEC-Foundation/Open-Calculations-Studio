/**
 * Hekwerk en balustrade — staander en leuning van een vloerafscheiding of een
 * hekwerk onder de horizontale belasting van NEN-EN 1991-1-1 §6.4 met de
 * Nederlandse nationale bijlage.
 *
 * Belasting (bijlage NB.A, tabel NB.A.1): per gebruik van de aangrenzende
 * ruimte de lijnlast q_k en de puntlast F_k in zone a (de leuning), elk apart
 * en in beide richtingen loodrecht op de afscheiding. F_k in zone b en in zone
 * a + b staan erbij voor de vulling. F_k in zone b is niet groter dan in zone
 * a en grijpt lager aan; F_k in zone a + b kan ook in zone a aangrijpen, maar
 * is ten hoogste de helft van F_k in zone a, ook met de langere duur (k_mod
 * bij hout) niet maatgevend. Voor staander en leuning geldt dus zone a. Een
 * leuning die alleen steun geeft (NB.A.1(2)): F_k = 1 kN. Desgewenst de verticale
 * puntlast van 1 kN op de leuning (NB.A.2(4)), standaard gelijktijdig met de
 * horizontale last (de veilige lezing van "in aanvulling op"): bij een ronde
 * buisleuning de vectorsom, bij een koker of hout beide richtingen lineair
 * opgeteld. Of q_k en F_k zelf invullen.
 * Partiële factor: γ_Q van de gevolgklasse (tabel NB.4 en NB.5 van NEN-EN 1990)
 * of 1,0. De NB bij 6.4(1) verwijst voor de factoren naar de gevolgklasse en de
 * buitengewone combinaties; het blad kiest standaard de veilige kant en laat de
 * keuze aan de constructeur.
 *
 * Staander: ingeklemd in de voet, de leuning op hoogte h. De kracht op een
 * staander is het grootste van k_R·q·a en k_F·F. Bij een doorgaande leuning
 * volgen k_R en k_F uit de liggeroplosser van de kern (ligger, ligger_R): een
 * leuning over twee, drie en vier velden met een eindveld a_e (standaard
 * gelijk aan a), k_R de grootste reactie onder q over de hele lengte, k_F de
 * grootste reactie van een verplaatsbare puntlast, uit de invloedslijn van elk
 * steunpunt (Müller-Breslau). Bij gelijke velden k_R = 1,25 en k_F = 1,006; een
 * kort eindveld klemt de leuning in en geeft veel meer. Bij losse velden
 * k_R = (1 + a_e/a)/2, ten minste 1, en k_F = 1.
 * Staal (NEN-EN 1993-1-1 + NB): ronde buis, strip, gelijkzijdig hoekstaal,
 * koker of I-profiel; doorsnedeklasse (tabel 5.2), buiging (6.2.5),
 * dwarskracht (6.2.6) met 6.2.8, en kip van een strip, een koker of een
 * I-profiel om de sterke as: M_cr van een uitkraging met de last aan het
 * vrije einde, k_g·4,013·√(E·I_z·G·I_t)/L, zonder welving en zonder de
 * leuning als zijsteun (aan de veilige kant), met χ_LT volgens 6.3.2.2 en
 * tabel 6.4. Aangrijpingspunt (keuze, standaard de voorzijde): een last op de
 * voorzijde grijpt z_g = d/2 voor het dwarskrachtcentrum aan en werkt in één
 * van beide richtingen destabiliserend; k_g = √(1 + (2,05·ε)²) − 2,05·ε met
 * ε = (z_g/L)·√(E·I_z/(G·I_t)), een benadering die onder de exacte oplossing
 * van de differentiaalvergelijking van de uitkraging blijft (check-hekwerk
 * rekent dat per set na); in het hart k_g = 1. Hoekstaal elastisch om een as
 * evenwijdig aan een been, alleen als leuning of vulling het profiel
 * zijdelings en tegen torderen vasthoudt (keuze, standaard nee; die aanname
 * staat op papier). Zonder zijsteun buigt het scheef, tordeert het en is er
 * voor de kip geen M_cr in de norm: dan keurt het blad af. Een koker met
 * hoeken r_o = 2t en r_i = t (aanname). Hout (NEN-EN 1995-1-1 + NB): buiging
 * met k_h en k_crit ((6.33), l_ef = 0,8·h volgens tabel 6.1, plus 2·d bij een
 * last op de voorzijde) en afschuiving met k_cr = 1,0 (NB bij 6.1.7(2)).
 *
 * Leuning: een ligger op twee steunpunten over het langste veld, q·a²/8 of
 * F·a/4 — ook bij een doorgaande leuning een bovengrens —, horizontaal en met
 * de verticale last ook verticaal. De dwarskracht bij een doorgaande leuning
 * uit de liggeroplosser (0,625·q·a bij gelijke velden) of k_F·F, bij losse
 * velden q·a/2 of F. Ronde buis, koker of hout; bij hout l_ef = 0,9·a plus 2 ×
 * de hoogte in de buigrichting (de last op het oppervlak).
 *
 * Vervorming: de horizontale verplaatsing van de bovenrand, staander en
 * leuning samen, bij de karakteristieke combinatie; standaard ten hoogste 20
 * mm (A1.4.3(7) van de NB bij NEN-EN 1990). Bovengrenzen: de staander met de
 * grootste reactie (k_R of k_F) plus de leuning over het langste veld; voor
 * een doorgaande leuning op verende staanders nagerekend. De verticale
 * doorbuiging van de leuning onder de verticale last ten hoogste a/150
 * (A1.4.3(3)). De rotatie van de voet telt niet mee.
 *
 * Voetbevestiging: de trekkracht per anker of schroef uit het moment met een
 * ingevoerde hefboomsarm, de dwarskracht gelijk over de ankers verdeeld. De
 * capaciteit per anker vult de gebruiker in; interactie lineair (aanname).
 *
 * Op papier beknopt: invoer, krachten, per onderdeel de toets en de
 * samenvatting; uitleg en tussenstappen alleen op het scherm. Profielen uit de
 * gedeelde tabel (components/calc/profielen.ts, matrix geplakt en bewaakt door
 * scripts/check-profielen.mjs). Voorbeelden met handberekening:
 * scripts/check-hekwerk.mjs. Geen backticks in dit commentaar: de
 * controlescripts lezen het blad van de eerste tot de laatste backtick.
 */

export const hekwerk = `"Hekwerk en balustrade — EN 1991-1-1 §6.4 met EN 1993-1-1 of EN 1995-1-1

'<i>Staander en leuning van een vloerafscheiding of een hekwerk onder de horizontale belasting van bijlage NB.A: de staander ingeklemd in de voet, de leuning als ligger tussen de staanders, de verplaatsing van de bovenrand en de kracht per anker in de voet.</i><span class="alleen-scherm"></span>

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
r2(x) = round(x; 2)
'Koker met buitenmaat d (in de buigrichting) en w, wanddikte t, in mm: hoeken met r_o = 2t en r_i = t, begrensd door de maten.
sp_a(r) = (1 - pi/4)*r^2
sp_e(r) = (10 - 3*pi)/(12 - 3*pi)*r
sp_I(r) = (1 - 5*pi/16)*r^4 - sp_a(r)*sp_e(r)^2
kro(d; w; t) = min(2*t; min(d; w)/2)
kri(d; w; t) = max(kro(d; w; t) - t; 0)
kA(d; w; t) = d*w - (d - 2*t)*(w - 2*t) - 4*sp_a(kro(d; w; t)) + 4*sp_a(kri(d; w; t))
kI(d; w; t) = (w*d^3 - (w - 2*t)*(d - 2*t)^3)/12 - 4*(sp_I(kro(d; w; t)) + sp_a(kro(d; w; t))*(d/2 - sp_e(kro(d; w; t)))^2) + 4*(sp_I(kri(d; w; t)) + sp_a(kri(d; w; t))*(d/2 - t - sp_e(kri(d; w; t)))^2)
kW(d; w; t) = (w*d^2 - (w - 2*t)*(d - 2*t)^2)/4 - 4*sp_a(kro(d; w; t))*(d/2 - sp_e(kro(d; w; t))) + 4*sp_a(kri(d; w; t))*(d/2 - t - sp_e(kri(d; w; t)))
krm(d; w; t) = (kro(d; w; t) + kri(d; w; t))/2
kIt(d; w; t) = 4*((d - t)*(w - t) - (4 - pi)*krm(d; w; t)^2)^2*t/(2*(d - t) + 2*(w - t) - 2*(4 - pi)*krm(d; w; t))
'Hout: k_h (§3.2(3) en §3.3(3)) bij een hoogte d in mm, k_crit volgens (6.34).
kh(d) = if(gelijmd ≡ 1; if(d < 600; min(1.1; (600/d)^0.1); 1); if(d < 150; min(1.3; (150/d)^0.2); 1))
kcrit(λ) = if(λ ≤ 0.75; 1; if(λ ≤ 1.4; 1.56 - 0.75*λ; 1/λ^2))
#show

# 1. Belasting (NEN-EN 1991-1-1 §6.4 en bijlage NB.A)

@select gebruik "Gebruik van de ruimte aan de afscheiding (tabel NB.A.1)"
  Klasse A, niet-gemeenschappelijke ruimte met een woonfunctie = 1
  Klasse A, gemeenschappelijke ruimte met een woonfunctie = 2
  Klasse A, niet-gemeenschappelijke ruimte met een cel- of logiesfunctie = 3
  Klasse A, overige ruimten = 4
  Overige klassen (B, C1 t/m C4, D en E) = 5
  Klasse C5, ruimten voor grote mensenmassa = 6
  Klassen F en G, verkeersruimten = 7
  Leuning alleen ter steun, geen vloerafscheiding (NB.A.1(2)) = 8
  Zelf invullen = 9
@end
#if gebruik ≡ 9
    q_hand = ?*(kN/m)', lijnlast op de leuning (zone a)<span class="kolom-2"></span>'
    F_hand = ?*(kN)', puntlast op de leuning (zone a)<span class="kolom-2"></span>'
    q_k = q_hand to kN/m
    F_k = F_hand to kN
#else
    #hide
    'Tabel NB.A.1: id | q_k (kN/m) | F_k in zone a | zone b | zone a + b (kN)
    nba1 = [1; 2; 3; 4; 5; 6; 7; 8 |0.3; 0.5; 0.5; 0.5; 0.8; 3; 0.8; 0 |0.5; 1; 1; 1; 1; 1; 1; 1 |0.35; 0.35; 0.5; 0.5; 0.7; 0.7; 1; 0 |0.2; 0.2; 0.3; 0.3; 0.5; 0.5; 0.5; 0]
    #show
    q_k = hlookup(nba1; gebruik; 1; 2)*kN/m', lijnlast in zone a, op de leuning<span class="kolom-2"></span>'
    F_k = hlookup(nba1; gebruik; 1; 3)*kN', puntlast in zone a, op 0,2 × 0,2 m<span class="kolom-2"></span>'
    #if gebruik ≤ 7
        F_k,b = hlookup(nba1; gebruik; 1; 4)*kN', puntlast in zone b, op de vulling<span class="kolom-2"></span>'
        F_k,ab = hlookup(nba1; gebruik; 1; 5)*kN', puntlast in zone a + b, langdurig<span class="kolom-2"></span>'
        '<span class="alleen-scherm"><i>q<sub>k</sub> en F<sub>k</sub> zijn aparte lasten, elk in beide richtingen loodrecht op de afscheiding; aan de zijde zonder vloer mag de helft (NB.A.2(3)), dit blad rekent met de volle waarde. F<sub>k</sub> in zone b is niet groter dan in zone a en grijpt lager aan; F<sub>k</sub> in zone a + b kan ook in zone a aangrijpen, maar is ten hoogste de helft van F<sub>k</sub> in zone a en ook met de langere duur (k<sub>mod</sub> bij hout) niet maatgevend. Voor staander en leuning geldt zone a. De vulling zelf (glas, paneel, spijlen) valt buiten dit blad; toets die op F<sub>k,b</sub>. De last in zone a + b geldt niet langs trappen (voetnoot b).</i></span>
    #end if
#end if
@select verticaal "Verticale puntlast op de leuning, F_k,v = 1 kN (NB.A.2(4))"
  Ja = 1
  Nee, die kan bij deze constructie niet optreden = 0
@end
F_k,v = verticaal*1 kN', verticale puntlast op de leuning<span class="kolom-2"></span>'
#if verticaal ≡ 1
    @select samen "Verticale puntlast gelijktijdig met de horizontale last"
      Ja, aan de veilige kant = 1
      Nee, als apart belastinggeval = 0
    @end
    '<span class="alleen-scherm"><i>NB.A.2(4) brengt de verticale last in aanvulling op de horizontale in rekening; gelijktijdig werken is de veilige lezing. Dan telt bij een ronde buisleuning de vectorsom van de momenten en dwarskrachten, bij een rechthoekige leuning beide richtingen samen in de interactie.</i></span>
#else
    #hide
    samen = 0
    #show
#end if
@select factor "Partiële factor op de belasting"
  γ_Q van de gevolgklasse (tabel NB.4 en NB.5 van NEN-EN 1990) = 1
  1,0 (buitengewone combinatie) = 2
@end
γ_Q = if(factor ≡ 2; 1; if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5)))', bij gevolgklasse CC uit de projectgegevens of 1,0<span class="kolom-2"></span>'
'<span class="alleen-scherm"><i>De NB bij 6.4(1) koppelt de partiële factoren aan de gevolgklasse en aan de buitengewone combinaties. Standaard rekent dit blad met γ<sub>Q</sub> van de gevolgklasse (aan de veilige kant); 1,0 is een keuze van de constructeur.</i></span>

# 2. Maten en krachten

h_leu = ?*(m)', hoogte van de leuning boven de inklemming van de staander<span class="kolom-2"></span>'
a_st = ?*(m)', hart-op-hartafstand van de staanders<span class="kolom-2"></span>'
@select doorgaand "Leuning over de staanders"
  Doorgaand over twee of meer velden = 1
  Per veld opgelegd = 0
@end
@select eindveld "Eindveld van de leuning"
  Even lang als de andere velden = 1
  Andere lengte = 0
@end
#if eindveld ≡ 0
    a_eind = ?*(m)', lengte van het eindveld, van de eindstaander (of de wand) tot de eerste tussenstaander<span class="kolom-2"></span>'
    a_e = a_eind to m', eindveld<span class="kolom-3"></span>'
#else
    #hide
    a_e = a_st to m
    #show
#end if
#hide
x_e = max(a_e/a_st; 0.01)
a_max = max(a_st; a_e) to m
#show
#if doorgaand ≡ 1
    #hide
    'Doorgaande leuning met de liggeroplosser, in eenheden van a: het eindveld x_e, de andere velden 1, over twee, drie en vier velden. Lijnlast 1 over de hele lengte; de puntlast met de invloedslijn van elk steunpunt (Müller-Breslau): de doorbuigingslijn met dat steunpunt weggenomen en een eenheidslast op zijn plaats, gedeeld door de doorbuiging daar.
    P1(x) = [2 | x | 0 | 1 | 0]
    Rabs(R) = max(ligger_ext(R; 2)[1]; -ligger_ext(R; 2)[3])
    kinv(O; x) = max(ligger_ext(O; 4)[1]; -ligger_ext(O; 4)[3])/ligger_int(O; 4; x)
    X(i) = if(i ≡ 1; 0; x_e + i - 2)
    g2(j) = [0; x_e; x_e + 1 | 1 - (j == 1); 1 - (j == 2); 1 - (j == 3)]
    g3(j) = [0; x_e; x_e + 1; x_e + 2 | 1 - (j == 1); 1 - (j == 2); 1 - (j == 3); 1 - (j == 4)]
    g4(j) = [0; x_e; x_e + 1; x_e + 2; x_e + 3 | 1 - (j == 1); 1 - (j == 2); 1 - (j == 3); 1 - (j == 4); 1 - (j == 5)]
    k2(j) = kinv(ligger(g2(j); P1(X(j)); 1); X(j))
    k3(j) = kinv(ligger(g3(j); P1(X(j)); 1); X(j))
    k4(j) = kinv(ligger(g4(j); P1(X(j)); 1); X(j))
    ql2 = [1 | 0 | x_e + 1 | 1 | 1]
    ql3 = [1 | 0 | x_e + 2 | 1 | 1]
    ql4 = [1 | 0 | x_e + 3 | 1 | 1]
    kR_q = max(Rabs(ligger_R(g2(0); ql2; 1)); Rabs(ligger_R(g3(0); ql3; 1)); Rabs(ligger_R(g4(0); ql4; 1)))
    kV_q = max(Rabs(ligger(g2(0); ql2; 1)); Rabs(ligger(g3(0); ql3; 1)); Rabs(ligger(g4(0); ql4; 1)))
    kF_1 = max(1; k2(1); k2(2); k2(3); k3(1); k3(2); k3(3); k3(4); k4(1); k4(2); k4(3); k4(4); k4(5))
    #show
#else
    #hide
    kR_q = max(1; (1 + x_e)/2)
    kV_q = max(1; x_e)/2
    kF_1 = 1
    #show
#end if
k_R = kR_q', lijnlast: de grootste reactie op een staander, als veelvoud van q·a<span class="kolom-3"></span>'
k_F = kF_1', puntlast: de grootste reactie op een staander, als veelvoud van F<span class="kolom-3"></span>'
'<span class="alleen-scherm"><i>Doorgaand: k uit de liggeroplosser voor een leuning over twee, drie en vier velden met het eindveld, het grootste. Bij gelijke velden is k<sub>R</sub> = 1,25 (middensteunpunt van twee velden) en k<sub>F</sub> = 1,006 (de invloedslijn bij drie of vier velden komt net boven 1). Een kort eindveld klemt de leuning bij de eerste tussenstaander in: die krijgt dan meer, de eindstaander trekt terug. Per veld opgelegd: q·(a + a<sub>e</sub>)/2, ten minste q·a, en F.</i></span>
R_Ed = γ_Q*k_R*q_k*a_st to kN', lijnlast op een staander<span class="kolom-3"></span>'
F_Ed = γ_Q*k_F*F_k to kN', puntlast op de leuning<span class="kolom-3"></span>'
H_Ed = max(R_Ed; F_Ed) to kN', maatgevend<span class="kolom-3"></span>'
M_Ed = H_Ed*h_leu to kN*m', inklemmingsmoment in de voet<span class="kolom-3"></span>'
V_Ed = H_Ed to kN', dwarskracht in de voet<span class="kolom-3"></span>'

# 3. Staander, leuning en materiaal

@select vorm_s "Staander"
  Ronde buis (staal) = 1
  Strip (staal), de breedte in de richting van de last = 2
  Gelijkzijdig hoekstaal (staal), een been in de richting van de last = 3
  Koker (staal) = 4
  I- of H-profiel (staal) = 5
  Hout, rechthoekig = 6
@end
@select vorm_l "Leuning"
  Ronde buis (staal) = 1
  Koker (staal) = 2
  Hout, rechthoekig = 3
@end
#hide
staal = bool(vorm_s ≤ 5 or vorm_l ≤ 2)
hout = bool(vorm_s ≡ 6 or vorm_l ≡ 3)
kipvorm = bool(vorm_s ≡ 2 or vorm_s ≥ 4)
#show
#if kipvorm ≡ 1
    @select aangrijping "Aangrijpingspunt van de leuning op de staander, voor de kip"
      Op de voorzijde van de staander (destabiliserend) = 1
      In het hart van de staander = 0
    @end
#else
    #hide
    aangrijping = 0
    #show
#end if
#if staal ≡ 1
    @select staalsoort "Staalsoort"
      S235 = 235
      S275 = 275
      S355 = 355
    @end
    f_y = staalsoort*1 N/mm^2', tabel 3.1, t ≤ 40 mm<span class="kolom-4"></span>'
    #hide
    E_st = 210000 N/mm^2
    G_st = 81000 N/mm^2
    γ_M0 = 1.0
    γ_M1 = 1.0
    ε = sqrt(235 N/mm^2/f_y)
    #show
#end if
#if hout ≡ 1
    @select houtklasse "Sterkteklasse hout"
      C24 = 2
      C18 = 1
      C30 = 3
      GL24h = 4
      GL28h = 5
      GL32h = 6
    @end
    @select klimaat "Klimaatklasse"
      Klimaatklasse 1 = 1
      Klimaatklasse 2 = 2
      Klimaatklasse 3 = 3
    @end
    @select duur "Belastingsduurklasse van q_k en F_k"
      Kort = 4
      Zeer kort = 5
    @end
    #hide
    'Materiaalmatrix [id | f_m,k | f_v,k | E_mean | E_0,05 (N/mm²) | γ_M]: EN 338 voor C18 t/m C30, EN 14080 voor GL24h t/m GL32h.
    houtsoorten = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |1.30; 1.30; 1.30; 1.25; 1.25; 1.25]
    gelijmd = bool(houtklasse ≥ 4)
    #show
    f_m,k = hlookup(houtsoorten; houtklasse; 1; 2)*N/mm^2'<span class="kolom-4"></span>'
    f_v,k = hlookup(houtsoorten; houtklasse; 1; 3)*N/mm^2'<span class="kolom-4"></span>'
    E_mean = hlookup(houtsoorten; houtklasse; 1; 4)*N/mm^2'<span class="kolom-4"></span>'
    E_0,05 = hlookup(houtsoorten; houtklasse; 1; 5)*N/mm^2'<span class="kolom-4"></span>'
    γ_M = hlookup(houtsoorten; houtklasse; 1; 6)'<span class="kolom-4"></span>'
    k_mod = if(klimaat ≡ 3; if(duur ≡ 5; 0.9; 0.7); if(duur ≡ 5; 1.1; 0.9))', tabel 3.1<span class="kolom-4"></span>'
    '<span class="alleen-scherm"><i>Tabel NB.A.1 laat q<sub>k</sub> en F<sub>k</sub> 1 tot 5 minuten werken. Kort (in tabel 2.2 van de NB bij sneeuw en wind) is aan de veilige kant; zeer kort is een keuze van de constructeur.</i></span>
#end if

# 4. Staander

#hide
buiten_s = 0
zg_s = 0 mm
#show
#if vorm_s ≡ 1
    D_s = ?*(mm)', buitendiameter<span class="kolom-3"></span>'
    t_s = ?*(mm)', wanddikte<span class="kolom-3"></span>'
    #hide
    t_se = min(t_s; D_s/2)
    D_si = D_s - 2*t_se
    #show
    A_s = pi*(D_s^2 - D_si^2)/4 to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    I_s = pi*(D_s^4 - D_si^4)/64 to mm^4'<span class="kolom-4"></span>'
    W_el,s = 2*I_s/D_s to mm^3'<span class="kolom-4"></span>'
    W_pl,s = (D_s^3 - D_si^3)/6 to mm^3'<span class="kolom-4"></span>'
    A_v,s = 2*A_s/pi to mm^2', 6.2.6(3)g<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    #hide
    rt_s = D_s/max(t_se; 0.001 mm)
    klasse_s = if(rt_s ≤ 50*ε^2; 1; if(rt_s ≤ 70*ε^2; 2; if(rt_s ≤ 90*ε^2; 3; 4)))
    kip_s = 0
    I_zs = I_s
    I_ts = 2*I_s
    α_LT = 0.76
    E_s = E_st
    #show
    'Tabel 5.2, buis: d/t = 'rt_s' tegen 50ε² = '50*ε^2', 70ε² = '70*ε^2' en 90ε² = '90*ε^2' → klasse <b>'klasse_s'</b>.
#else if vorm_s ≡ 2
    d_s = ?*(mm)', breedte van de strip, in de richting van de last<span class="kolom-3"></span>'
    t_s = ?*(mm)', dikte<span class="kolom-3"></span>'
    A_s = d_s*t_s to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    I_s = t_s*d_s^3/12 to mm^4'<span class="kolom-4"></span>'
    W_el,s = t_s*d_s^2/6 to mm^3'<span class="kolom-4"></span>'
    W_pl,s = t_s*d_s^2/4 to mm^3'<span class="kolom-4"></span>'
    A_v,s = A_s', massieve doorsnede<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    #hide
    klasse_s = 1
    kip_s = bool(d_s > t_s)
    zg_s = d_s/2
    I_zs = d_s*t_s^3/12
    I_ts = max(d_s; t_s)*min(d_s; t_s)^3/3*(1 - 0.63*min(d_s; t_s)/max(d_s; t_s))
    α_LT = 0.76
    E_s = E_st
    #show
    'Massieve doorsnede: geen plaatplooi, de plastische weerstand geldt (klasse 1).<span class="alleen-scherm"></span>
#else if vorm_s ≡ 3
    @select hoekprofiel "Hoekprofiel van de staander"
      L 40x40x4 = 1
      L 45x45x5 = 2
      L 50x50x5 = 3
      L 60x60x6 = 4
      L 70x70x7 = 5
      L 80x80x8 = 6
      L 90x90x9 = 7
      L 100x100x10 = 8
    @end
    @select hoek_steun "Hoekstaal zijdelings en tegen torderen gehouden"
      Nee, vrijstaand of alleen met een leuning die nergens is verankerd = 0
      Ja, door een verankerde leuning (wand, hoek) of door de vulling = 1
    @end
    #hide
    buiten_s = bool(hoek_steun ≡ 0)
    'Hoekstaaltabel uit profielen.ts: id | h (mm) | t (mm) | r_1 (mm) | r_2 (mm) | A (cm²) | e (cm) | I_y (cm⁴) | W_el (cm³) | i_y (cm) | I_u (cm⁴) | i_u (cm) | I_v (cm⁴) | i_v (cm)
    hoekstalen = [1; 2; 3; 4; 5; 6; 7; 8 |40; 45; 50; 60; 70; 80; 90; 100 |4; 5; 5; 6; 7; 8; 9; 10 |6; 7; 7; 8; 9; 10; 11; 12 |3; 3.5; 3.5; 4; 4.5; 5; 5.5; 6 |3.08; 4.3; 4.8; 6.91; 9.4; 12.3; 15.5; 19.2 |1.12; 1.28; 1.4; 1.69; 1.97; 2.26; 2.54; 2.82 |4.47; 7.84; 11; 22.8; 42.3; 72.2; 116; 177 |1.55; 2.43; 3.05; 5.29; 8.41; 12.6; 17.9; 24.6 |1.21; 1.35; 1.51; 1.82; 2.12; 2.43; 2.73; 3.04 |7.09; 12.4; 17.4; 36.1; 67.1; 115; 184; 280 |1.52; 1.7; 1.9; 2.29; 2.67; 3.06; 3.44; 3.83 |1.86; 3.25; 4.54; 9.43; 17.5; 29.9; 47.8; 73 |0.78; 0.87; 0.97; 1.17; 1.36; 1.56; 1.76; 1.95]
    h_L = hlookup(hoekstalen; hoekprofiel; 1; 2)*mm
    t_L = hlookup(hoekstalen; hoekprofiel; 1; 3)*mm
    #show
    A_s = hlookup(hoekstalen; hoekprofiel; 1; 6)*cm^2 to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    I_s = hlookup(hoekstalen; hoekprofiel; 1; 8)*cm^4 to mm^4', om een as evenwijdig aan een been<span class="kolom-4"></span>'
    W_el,s = hlookup(hoekstalen; hoekprofiel; 1; 9)*cm^3 to mm^3'<span class="kolom-4"></span>'
    A_v,s = h_L*t_L to mm^2', het been evenwijdig aan de last<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    #hide
    W_pl,s = W_el,s
    ht_L = h_L/t_L
    klasse_s = if(ht_L ≤ 14*ε; 3; 4)
    kip_s = 0
    I_zs = I_s
    I_ts = I_s
    α_LT = 0.76
    E_s = E_st
    #show
    'Tabel 5.2, uitstekend been onder druk: c/t = h/t = 'ht_L' tegen 14ε = '14*ε' → klasse <b>'klasse_s'</b>, dus elastisch (W<sub>el</sub>).
    #if hoek_steun ≡ 1
        '<i class="ook-afdruk">Aanname: de leuning of de vulling houdt het hoekstaal aan de bovenzijde zijdelings en tegen torderen vast (bijvoorbeeld een leuning die aan een wand of in een hoek is verankerd); het buigt dan om de as evenwijdig aan het andere been, zonder scheve buiging, kip of torsie.</i>
    #else
        '<b style="color:#b91c1c">Niet zijdelings gehouden: het hoekstaal buigt scheef om zijn hoofdassen, de last grijpt buiten het dwarskrachtcentrum (de hiel) aan en geeft torsie, en voor de kip van een hoekprofiel geeft NEN-EN 1993-1-1 met de NB (bijlage NB.NB) geen M<sub>cr</sub>. Dat valt buiten dit blad: voldoet niet.</b> Kies een ander profiel of houd het hoekstaal zijdelings vast met de leuning of de vulling.
    #end if
#else if vorm_s ≡ 4
    d_s = ?*(mm)', buitenmaat in de richting van de last<span class="kolom-3"></span>'
    b_s = ?*(mm)', buitenmaat dwars op de last<span class="kolom-3"></span>'
    t_s = ?*(mm)', wanddikte<span class="kolom-3"></span>'
    #hide
    dn_s = max(d_s/(1 mm); 0.001)
    bn_s = max(b_s/(1 mm); 0.001)
    tn_s = min(max(t_s/(1 mm); 0.001); min(dn_s; bn_s)/2)
    #show
    A_s = kA(dn_s; bn_s; tn_s)*mm^2 to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    I_s = kI(dn_s; bn_s; tn_s)*mm^4'<span class="kolom-4"></span>'
    W_el,s = 2*I_s/d_s to mm^3'<span class="kolom-4"></span>'
    W_pl,s = kW(dn_s; bn_s; tn_s)*mm^3'<span class="kolom-4"></span>'
    A_v,s = A_s*d_s/(d_s + b_s) to mm^2', 6.2.6(3)f<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    #hide
    cw_s = max(dn_s - 3*tn_s; 0)/tn_s
    cf_s = max(bn_s - 3*tn_s; 0)/tn_s
    klw_s = if(cw_s ≤ 72*ε; 1; if(cw_s ≤ 83*ε; 2; if(cw_s ≤ 124*ε; 3; 4)))
    klf_s = if(cf_s ≤ 33*ε; 1; if(cf_s ≤ 38*ε; 2; if(cf_s ≤ 42*ε; 3; 4)))
    klasse_s = max(klw_s; klf_s)
    kip_s = bool(d_s > b_s)
    zg_s = d_s/2
    I_zs = kI(bn_s; dn_s; tn_s)*mm^4
    I_ts = kIt(dn_s; bn_s; tn_s)*mm^4
    α_LT = 0.76
    E_s = E_st
    #show
    'Tabel 5.2, koker met c = h − 3t: wanden langs de last c/t = 'cw_s' → klasse 'klw_s', gedrukte wand c/t = 'cf_s' → klasse 'klf_s'; doorsnede in klasse <b>'klasse_s'</b>.
    '<span class="alleen-scherm"><i>Aanname: hoeken met een buitenstraal van 2t en een binnenstraal van t.</i></span>
#else if vorm_s ≡ 5
    @select iprofiel "Profiel van de staander"
      HEA 100 = 1
      HEA 120 = 2
      HEA 140 = 3
      HEA 160 = 4
      HEA 180 = 5
      HEA 200 = 6
      HEB 100 = 11
      HEB 120 = 12
      HEB 140 = 13
      HEB 160 = 14
      HEB 180 = 15
      HEB 200 = 16
    @end
    @select as_s "Buiging van de staander"
      Om de sterke as, het lijf in de richting van de last = 1
      Om de zwakke as, de flenzen in de richting van de last = 2
    @end
    #hide
    'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
    profielen = [1; 2; 3; 4; 5; 6; 11; 12; 13; 14; 15; 16 |96; 114; 133; 152; 171; 190; 100; 120; 140; 160; 180; 200 |100; 120; 140; 160; 180; 200; 100; 120; 140; 160; 180; 200 |5; 5; 5.5; 6; 6; 6.5; 6; 6.5; 7; 8; 8.5; 9 |8; 8; 8.5; 9; 9.5; 10; 10; 11; 12; 13; 14; 15 |12; 12; 12; 15; 15; 18; 12; 12; 12; 15; 15; 18 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08 |349.2; 606.2; 1033; 1673; 2510; 3692; 449.5; 864.4; 1509; 2492; 3831; 5696 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 104.2; 165.2; 245.4; 354; 481.4; 642.5 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 167.3; 317.5; 549.7; 889.2; 1363; 2003 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 51.42; 80.97; 119.8; 170; 231; 305.8 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28 |2580; 6470; 15060; 31410; 60210; 108000; 3380; 9410; 22480; 47940; 93750; 171100]
    h_i = hlookup(profielen; iprofiel; 1; 2)*mm
    b_i = hlookup(profielen; iprofiel; 1; 3)*mm
    t_wi = hlookup(profielen; iprofiel; 1; 4)*mm
    t_fi = hlookup(profielen; iprofiel; 1; 5)*mm
    r_pi = hlookup(profielen; iprofiel; 1; 6)*mm
    A_i = hlookup(profielen; iprofiel; 1; 7)*cm^2
    cw_s = (h_i - 2*t_fi - 2*r_pi)/t_wi
    cf_s = (b_i - t_wi - 2*r_pi)/2/t_fi
    klf_s = if(cf_s ≤ 9*ε; 1; if(cf_s ≤ 10*ε; 2; if(cf_s ≤ 14*ε; 3; 4)))
    I_zs = hlookup(profielen; iprofiel; 1; 13)*cm^4
    I_ts = hlookup(profielen; iprofiel; 1; 17)*cm^4
    E_s = E_st
    #show
    A_s = A_i to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    #if as_s ≡ 1
        I_s = hlookup(profielen; iprofiel; 1; 8)*cm^4 to mm^4'<span class="kolom-4"></span>'
        W_el,s = hlookup(profielen; iprofiel; 1; 9)*cm^3 to mm^3'<span class="kolom-4"></span>'
        W_pl,s = hlookup(profielen; iprofiel; 1; 10)*cm^3 to mm^3'<span class="kolom-4"></span>'
        A_v,s = max(hlookup(profielen; iprofiel; 1; 12)*cm^2; (h_i - 2*t_fi)*t_wi) to mm^2', 6.2.6(3)a met η = 1,0<span class="kolom-4"></span><span class="alleen-scherm"></span>'
        #hide
        klw_s = if(cw_s ≤ 72*ε; 1; if(cw_s ≤ 83*ε; 2; if(cw_s ≤ 124*ε; 3; 4)))
        klasse_s = max(klw_s; klf_s)
        kip_s = 1
        zg_s = h_i/2
        α_LT = if(h_i/b_i ≤ 2; 0.21; 0.34)
        #show
        'Tabel 5.2: lijf op buiging c/t = 'cw_s' → klasse 'klw_s', flens onder druk c/t = 'cf_s' → klasse 'klf_s'; doorsnede in klasse <b>'klasse_s'</b>.
    #else
        I_s = I_zs to mm^4'<span class="kolom-4"></span>'
        W_el,s = hlookup(profielen; iprofiel; 1; 14)*cm^3 to mm^3'<span class="kolom-4"></span>'
        W_pl,s = hlookup(profielen; iprofiel; 1; 15)*cm^3 to mm^3'<span class="kolom-4"></span>'
        A_v,s = A_i - (h_i - 2*t_fi)*t_wi to mm^2', de flenzen, naar 6.2.6(3)e<span class="kolom-4"></span><span class="alleen-scherm"></span>'
        #hide
        klasse_s = klf_s
        kip_s = 0
        α_LT = 0.34
        #show
        'Tabel 5.2: flenzen als uitstekende delen onder druk (aan de veilige kant) c/t = 'cf_s' → klasse <b>'klasse_s'</b>.
    #end if
#else
    b_s = ?*(mm)', breedte, dwars op de last<span class="kolom-3"></span>'
    d_s = ?*(mm)', hoogte van de doorsnede in de richting van de last<span class="kolom-3"></span>'
    A_s = b_s*d_s to mm^2'<span class="kolom-4"></span><span class="alleen-scherm"></span>'
    I_s = b_s*d_s^3/12 to mm^4'<span class="kolom-4"></span>'
    W_el,s = b_s*d_s^2/6 to mm^3'<span class="kolom-4"></span>'
    #hide
    W_pl,s = W_el,s
    A_v,s = A_s
    klasse_s = 1
    kip_s = 0
    I_zs = b_s^3*d_s/12
    I_ts = I_s
    α_LT = 0.76
    E_s = E_mean
    #show
#end if

#if vorm_s ≤ 5
    W_s = if(klasse_s ≤ 2; W_pl,s; W_el,s) to mm^3', W_pl in klasse 1 en 2, W_el in klasse 3<span class="kolom-3"></span>'
    M_c,Rd = W_s*f_y/γ_M0 to kN*m', (6.13) en (6.14)<span class="kolom-3"></span>'
    V_pl,Rd = A_v,s*f_y/(sqrt(3)*γ_M0) to kN', (6.18)<span class="kolom-3"></span>'
    UC_V,s = V_Ed/V_pl,Rd', (6.17)<span class="kolom-3"></span>'
    #hide
    ρ_s = if(UC_V,s > 0.5; (2*UC_V,s - 1)^2; 0)
    #show
    #if UC_V,s > 0.5
        ρ_s', 6.2.8(3): (1 − ρ)·f<sub>y</sub> over de hele doorsnede, aan de veilige kant'
    #end if
    #if kip_s ≡ 1
        #hide
        ε_g = aangrijping*zg_s/h_leu*sqrt(E_st*I_zs/(G_st*I_ts))
        #show
        k_g = sqrt(1 + (2.05*ε_g)^2) - 2.05*ε_g', invloed van het aangrijpingspunt'if(aangrijping ≡ 1; ", de last op de voorzijde"; ", de last in het hart")'<span class="kolom-3"></span>'
        M_cr = k_g*4.013/h_leu*sqrt(E_st*I_zs*G_st*I_ts) to kN*m', uitkraging met de last aan het einde<span class="kolom-3"></span>'
        λ_LT = sqrt(W_s*f_y/M_cr)'<span class="kolom-3"></span>'
        #hide
        Φ_LT = 0.5*(1 + α_LT*(λ_LT - 0.2) + λ_LT^2)
        #show
        χ_LT = min(1; 1/(Φ_LT + sqrt(Φ_LT^2 - λ_LT^2)))', (6.56)<span class="kolom-3"></span>'
        '<span class="alleen-scherm"><i>Kip: M<sub>cr</sub> = k<sub>g</sub>·4,013·√(E·I<sub>z</sub>·G·I<sub>t</sub>)/h, de uitkraging met een puntlast aan het vrije einde, zonder welving en zonder de leuning als zijdelingse steun (aan de veilige kant). Een last op de voorzijde grijpt z<sub>g</sub> = d/2 = 'zg_s' voor het dwarskrachtcentrum aan en werkt destabiliserend: k<sub>g</sub> = √(1 + (2,05·ε)²) − 2,05·ε met ε = (z<sub>g</sub>/h)·√(E·I<sub>z</sub>/(G·I<sub>t</sub>)) = 'ε_g', een benadering die voor elke ε onder de exacte oplossing van de differentiaalvergelijking van de uitkraging blijft (nagerekend in check-hekwerk); in het hart k<sub>g</sub> = 1. Kipkromme 'if(α_LT < 0.3; "a"; if(α_LT < 0.4; "b"; "d"))' volgens tabel 6.4 (α<sub>LT</sub> = 'α_LT').</i></span>
    #else
        #hide
        χ_LT = 1
        #show
    #end if
    M_Rd,s = min(1 - ρ_s; χ_LT)*W_s*f_y/γ_M1 to kN*m', het kleinste van buiging met dwarskracht en kip<span class="kolom-3"></span>'
    UC_M,s = M_Ed/M_Rd,s'<span class="kolom-3"></span>'
#else
    #hide
    kh_s = kh(d_s/(1 mm))
    #show
    f_m,d = k_mod*kh_s*f_m,k/γ_M to N/mm^2', met k_h (§3.2(3) of §3.3(3))<span class="kolom-3"></span>'
    l_ef,s = 0.8*h_leu + aangrijping*2*d_s to mm', tabel 6.1: 0,8·h'if(aangrijping ≡ 1; ", plus 2·d voor de last op de voorzijde"; "")'<span class="kolom-3"></span>'
    σ_m,crit = 0.78*b_s^2*E_0,05/(d_s*l_ef,s) to N/mm^2', (6.32)<span class="kolom-3"></span>'
    λ_rel,m = sqrt(f_m,k/σ_m,crit)', (6.30)<span class="kolom-3"></span>'
    k_crit = kcrit(λ_rel,m)', (6.34)<span class="kolom-3"></span>'
    σ_m,d = M_Ed/W_el,s to N/mm^2'<span class="kolom-3"></span>'
    UC_M,s = σ_m,d/(k_crit*f_m,d)', (6.33)<span class="kolom-3"></span>'
    f_v,d = k_mod*f_v,k/γ_M to N/mm^2'<span class="kolom-3"></span>'
    τ_d = 1.5*V_Ed/(b_s*d_s) to N/mm^2', k_cr = 1,0 (NB bij 6.1.7(2))<span class="kolom-3"></span>'
    UC_V,s = τ_d/f_v,d', (6.13)<span class="kolom-3"></span>'
    '<span class="alleen-scherm"><i>Kip: l<sub>ef</sub> = 0,8·h voor een uitkraging met een puntlast op het vrije einde (tabel 6.1); grijpt de last op de voorzijde aan, dan komt er volgens de voetnoot bij tabel 6.1 2·d bij (de last werkt in één van beide richtingen destabiliserend).</i></span>
#end if
UC_s = max(UC_M,s; UC_V,s)', staander<span class="kolom-3"></span>'

# 5. Leuning

M_h,Ed = γ_Q*max(q_k*a_max^2/8; F_k*a_max/4) to kN*m', horizontaal, a_max = 'a_max' m<span class="kolom-4"></span>'
V_h,Ed = γ_Q*max(kV_q*q_k*a_st; k_F*F_k) to kN'<span class="kolom-4"></span>'
M_v,Ed = γ_Q*F_k,v*a_max/4 to kN*m', verticaal<span class="kolom-4"></span>'
V_v,Ed = γ_Q*k_F*F_k,v to kN'<span class="kolom-4"></span>'
'<span class="alleen-scherm"><i>Moment: de leuning als ligger op twee steunpunten over het langste veld, q·a²/8 en F·a/4; voor een doorgaande leuning een bovengrens (ook het steunpuntsmoment blijft daaronder). Dwarskracht: bij een doorgaande leuning uit de liggeroplosser, 'kV_q'·q·a (bij gelijke velden 0,625·q·a naast het middensteunpunt), en ten hoogste de grootste steunpuntsreactie van de puntlast, k<sub>F</sub>·F; bij losse velden q·a/2 over het langste veld of F.</i></span>
#if vorm_l ≡ 1
    D_l = ?*(mm)', buitendiameter<span class="kolom-3"></span>'
    t_l = ?*(mm)', wanddikte<span class="kolom-3"></span>'
    #hide
    t_le = min(t_l; D_l/2)
    D_li = D_l - 2*t_le
    I_lh = pi*(D_l^4 - D_li^4)/64
    I_lv = I_lh
    W_el,lh = 2*I_lh/D_l
    W_el,lv = W_el,lh
    W_pl,lh = (D_l^3 - D_li^3)/6
    W_pl,lv = W_pl,lh
    A_v,lh = (D_l^2 - D_li^2)/2
    A_v,lv = A_v,lh
    rt_l = D_l/max(t_le; 0.001 mm)
    klasse_lh = if(rt_l ≤ 50*ε^2; 1; if(rt_l ≤ 70*ε^2; 2; if(rt_l ≤ 90*ε^2; 3; 4)))
    klasse_lv = klasse_lh
    E_l = E_st
    #show
    'Tabel 5.2, buis: d/t = 'rt_l' → klasse <b>'klasse_lh'</b>.
#else if vorm_l ≡ 2
    b_l = ?*(mm)', buitenmaat horizontaal<span class="kolom-3"></span>'
    h_l = ?*(mm)', buitenmaat verticaal<span class="kolom-3"></span>'
    t_l = ?*(mm)', wanddikte<span class="kolom-3"></span>'
    #hide
    bn_l = max(b_l/(1 mm); 0.001)
    hn_l = max(h_l/(1 mm); 0.001)
    tn_l = min(max(t_l/(1 mm); 0.001); min(bn_l; hn_l)/2)
    I_lh = kI(bn_l; hn_l; tn_l)*mm^4
    I_lv = kI(hn_l; bn_l; tn_l)*mm^4
    W_el,lh = 2*I_lh/b_l
    W_el,lv = 2*I_lv/h_l
    W_pl,lh = kW(bn_l; hn_l; tn_l)*mm^3
    W_pl,lv = kW(hn_l; bn_l; tn_l)*mm^3
    A_l = kA(bn_l; hn_l; tn_l)*mm^2
    A_v,lh = A_l*b_l/(b_l + h_l)
    A_v,lv = A_l*h_l/(b_l + h_l)
    cb_l = max(bn_l - 3*tn_l; 0)/tn_l
    ch_l = max(hn_l - 3*tn_l; 0)/tn_l
    klw(c) = if(c ≤ 72*ε; 1; if(c ≤ 83*ε; 2; if(c ≤ 124*ε; 3; 4)))
    klf(c) = if(c ≤ 33*ε; 1; if(c ≤ 38*ε; 2; if(c ≤ 42*ε; 3; 4)))
    klasse_lh = max(klw(cb_l); klf(ch_l))
    klasse_lv = max(klw(ch_l); klf(cb_l))
    E_l = E_st
    #show
    'Tabel 5.2, koker met c = h − 3t: horizontale wanden c/t = 'cb_l', verticale wanden c/t = 'ch_l' → klasse <b>'klasse_lh'</b> bij horizontale en <b>'klasse_lv'</b> bij verticale buiging.
#else
    b_l = ?*(mm)', breedte, horizontaal<span class="kolom-3"></span>'
    h_l = ?*(mm)', hoogte, verticaal<span class="kolom-3"></span>'
    #hide
    I_lh = h_l*b_l^3/12
    I_lv = b_l*h_l^3/12
    W_el,lh = h_l*b_l^2/6
    W_el,lv = b_l*h_l^2/6
    klasse_lh = 1
    klasse_lv = 1
    E_l = E_mean
    #show
#end if
#if vorm_l ≤ 2
    #hide
    W_lh = if(klasse_lh ≤ 2; W_pl,lh; W_el,lh)
    W_lv = if(klasse_lv ≤ 2; W_pl,lv; W_el,lv)
    V_Rd,lh = A_v,lh*f_y/(sqrt(3)*γ_M0) to kN
    V_Rd,lv = A_v,lv*f_y/(sqrt(3)*γ_M0) to kN
    buis_samen = bool(vorm_l ≡ 1 and samen ≡ 1)
    V_lr = sqrt(V_h,Ed^2 + V_v,Ed^2)
    rho(u) = if(u > 0.5; (2*u - 1)^2; 0)
    ρ_lh = rho(if(buis_samen ≡ 1; V_lr; V_h,Ed)/V_Rd,lh)
    ρ_lv = rho(if(buis_samen ≡ 1; V_lr; V_v,Ed)/V_Rd,lv)
    #show
    M_Rd,lh = (1 - ρ_lh)*W_lh*f_y/γ_M0 to kN*m', horizontaal<span class="kolom-4"></span>'
    M_Rd,lv = (1 - ρ_lv)*W_lv*f_y/γ_M0 to kN*m', verticaal<span class="kolom-4"></span>'
    #if buis_samen ≡ 1
        M_l,Ed = sqrt(M_h,Ed^2 + M_v,Ed^2) to kN*m', vectorsom, de verticale last gelijktijdig<span class="kolom-4"></span>'
        V_l,Ed = V_lr to kN', vectorsom<span class="kolom-4"></span>'
        UC_M,l = M_l,Ed/M_Rd,lh', (6.12)<span class="kolom-4"></span>'
        UC_V,l = V_l,Ed/V_Rd,lh', (6.17)<span class="kolom-4"></span>'
    #else if samen ≡ 1
        UC_M,l = M_h,Ed/M_Rd,lh + M_v,Ed/M_Rd,lv', beide richtingen samen, lineair (6.2.1(7))<span class="kolom-4"></span>'
        UC_V,l = max(V_h,Ed/V_Rd,lh; V_v,Ed/V_Rd,lv)', (6.17), elk door de eigen wanden<span class="kolom-4"></span>'
    #else
        UC_M,l = max(M_h,Ed/M_Rd,lh; M_v,Ed/M_Rd,lv)', (6.12), de richtingen apart<span class="kolom-4"></span>'
        UC_V,l = max(V_h,Ed/V_Rd,lh; V_v,Ed/V_Rd,lv)', (6.17)<span class="kolom-4"></span>'
    #end if
    '<span class="alleen-scherm"><i>Buis en koker zijn gesloten en niet kipgevoelig; bij V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub> telt (1 − ρ)·f<sub>y</sub> over de hele doorsnede (6.2.8). Het grootste horizontale en het verticale moment zijn samengeteld alsof ze op dezelfde plaats optreden (aan de veilige kant).</i></span>
#else
    #hide
    l_ef,lh = 0.9*a_max + 2*b_l
    l_ef,lv = 0.9*a_max + 2*h_l
    kh_lh = kh(b_l/(1 mm))
    kh_lv = kh(h_l/(1 mm))
    kc_lh = kcrit(sqrt(f_m,k/(0.78*h_l^2*E_0,05/(b_l*l_ef,lh))))
    kc_lv = kcrit(sqrt(f_m,k/(0.78*b_l^2*E_0,05/(h_l*l_ef,lv))))
    #show
    f_m,lh = kc_lh*k_mod*kh_lh*f_m,k/γ_M to N/mm^2', k_crit·k_mod·k_h·f_m,k/γ_M, horizontaal<span class="kolom-4"></span>'
    f_m,lv = kc_lv*k_mod*kh_lv*f_m,k/γ_M to N/mm^2', verticaal<span class="kolom-4"></span>'
    σ_m,lh = M_h,Ed/W_el,lh to N/mm^2', horizontaal<span class="kolom-4"></span>'
    σ_m,lv = M_v,Ed/W_el,lv to N/mm^2', verticaal<span class="kolom-4"></span>'
    #if samen ≡ 1
        UC_M,l = σ_m,lh/f_m,lh + σ_m,lv/f_m,lv', (6.11) en (6.33), beide richtingen samen (k_m = 1, aan de veilige kant)<span class="kolom-4"></span>'
        UC_V,l = 1.5*(V_h,Ed + V_v,Ed)/(b_l*h_l*k_mod*f_v,k/γ_M)', (6.13), k_cr = 1,0, beide richtingen opgeteld<span class="kolom-4"></span>'
    #else
        UC_M,l = max(σ_m,lh/f_m,lh; σ_m,lv/f_m,lv)', (6.11) en (6.33), de richtingen apart<span class="kolom-4"></span>'
        UC_V,l = 1.5*max(V_h,Ed; V_v,Ed)/(b_l*h_l*k_mod*f_v,k/γ_M)', (6.13), k_cr = 1,0<span class="kolom-4"></span>'
    #end if
    '<span class="alleen-scherm"><i>Per richting k<sub>h</sub> naar de hoogte in die richting en k<sub>crit</sub> met l<sub>ef</sub> = 0,9·a over het langste veld (tabel 6.1, gelijkmatige last; bij de puntlast 0,8·a), plus 2 × de hoogte in die richting: de last grijpt op het oppervlak van de leuning aan, aan de gedrukte zijde (voetnoot bij tabel 6.1).</i></span>
#end if
UC_l = max(UC_M,l; UC_V,l)', leuning<span class="kolom-3"></span>'

# 6. Vervorming (karakteristiek)

@select w_keuze "Grens voor de horizontale verplaatsing van de bovenrand"
  20 mm, A1.4.3(7) van de NB bij NEN-EN 1990 = 20
  Zelf invullen = 0
@end
#if w_keuze ≡ 0
    w_hand = ?*(mm)', eigen grenswaarde<span class="kolom-3"></span>'
    w_grens = w_hand to mm'<span class="kolom-3"></span>'
#else
    w_grens = w_keuze*1 mm'<span class="kolom-3"></span>'
#end if
'<span class="alleen-scherm"><i>De NB bij NEN-EN 1990 (A1.4.3(7)) beperkt de horizontale doorbuiging van de bovenrand en de baluster samen bij een afscheiding ter plaatse van een hoogteverschil tot 20 mm, bij de karakteristieke combinatie. Voor een hekwerk zonder hoogteverschil kan een andere grens passen. De rotatie van de voet (voetplaat, ankers, ondergrond) telt hier niet mee en is in de praktijk vaak een groot deel van de verplaatsing.</i></span>
w_q = k_R*q_k*a_st*h_leu^3/(3*E_s*I_s) + 5*q_k*a_max^4/(384*E_l*I_lh) to mm', lijnlast: staander plus leuning midden in het veld<span class="kolom-3"></span>'
w_F1 = k_F*F_k*h_leu^3/(3*E_s*I_s) to mm', puntlast bij een staander<span class="kolom-3"></span>'
w_F2 = F_k/2*h_leu^3/(3*E_s*I_s) + F_k*a_max^3/(48*E_l*I_lh) to mm', puntlast midden in het veld<span class="kolom-3"></span>'
w_h = max(w_q; w_F1; w_F2) to mm'<span class="kolom-3"></span>'
UC_w,h = w_h/w_grens'<span class="kolom-3"></span>'
'<span class="alleen-scherm"><i>Bovengrenzen: de staander met de grootste reactie plus de leuning als ligger op twee steunpunten over het langste veld. Nagerekend voor een doorgaande leuning op verende staanders (twee tot vier velden, eindvelden van 0,05·a tot 2·a, van slappe tot stijve staanders): de werkelijke verplaatsing blijft eronder.</i></span>
#if verticaal ≡ 1
    w_v = F_k,v*a_max^3/(48*E_l*I_lv) to mm', leuning, verticaal<span class="kolom-3"></span>'
    w_v,grens = a_max/150 to mm', A1.4.3(3) van de NB bij NEN-EN 1990<span class="kolom-3"></span>'
    UC_w,v = w_v/w_v,grens'<span class="kolom-3"></span>'
#else
    #hide
    UC_w,v = 0
    #show
#end if

# 7. Voetbevestiging

n_t = ?', aantal ankers of schroeven aan de getrokken zijde<span class="kolom-2"></span>'
n_a = ?', totaal aantal ankers of schroeven<span class="kolom-2"></span>'
z_a = ?*(mm)', hefboomsarm, van de getrokken ankers tot het drukpunt<span class="kolom-2"></span>'
N_Rd,a = ?*(kN)', trekcapaciteit per anker, rekenwaarde<span class="kolom-2"></span>'
V_Rd,a = ?*(kN)', afschuifcapaciteit per anker, rekenwaarde<span class="kolom-2"></span>'
'<span class="alleen-scherm"><i>De hefboomsarm z: bij een voetplaat van de ankers aan de getrokken zijde tot de gedrukte rand van de plaat, of aan de veilige kant tot de ankers aan de gedrukte zijde. De capaciteit per anker komt uit de productgegevens of een aparte berekening. Wrikkrachten, de voetplaat zelf en de ondergrond vallen buiten dit blad.</i></span>
N_Ed,a = M_Ed/(max(n_t; 1)*z_a) to kN', trekkracht per anker<span class="kolom-3"></span>'
V_Ed,a = V_Ed/max(n_a; 1) to kN', dwarskracht per anker<span class="kolom-3"></span>'
UC_a = N_Ed,a/N_Rd,a + V_Ed,a/V_Rd,a', lineaire interactie (aanname, aan de veilige kant)<span class="kolom-3"></span>'

#hide
'Tekening: zijaanzicht links, vooraanzicht met drie staanders rechts; schaal naar h en 2a.
hn = max(h_leu/(1 m); 0.05)
an = max(a_st/(1 m); 0.05)
sc = min(140/hn; 95/an)
yv = 176
yt = yv - sc*hn
ap = sc*an
Hn = H_Ed/(1 kN)
Mn = M_Ed/(1 kN*m)
qn = q_k/(1 kN/m)
Fn = F_k/(1 kN)
kl_s = if(vorm_s ≡ 6; "#92400e"; "#1e3a8a")
kl_l = if(vorm_l ≡ 3; "#b45309"; "#3b82f6")
#show
'<svg viewbox="0 0 480 214" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:230px;">
'<rect x="16" y="'yv'" width="150" height="10" style="fill:#e5e7eb; stroke:#6b7280; stroke-width:1"/>
'<line x1="166" y1="'yv'" x2="166" y2="208" style="stroke:#6b7280; stroke-width:1; stroke-dasharray:3 2"/>
'<line x1="120" y1="'yv'" x2="120" y2="'yt'" style="stroke:'kl_s'; stroke-width:5; stroke-linecap:butt"/>
'<rect x="104" y="'yv - 4'" width="32" height="4" style="fill:#6b7280"/>
'<circle cx="120" cy="'yt'" r="6" style="fill:'kl_l'; stroke:#1f2937; stroke-width:1"/>
'<line x1="60" y1="'yt'" x2="106" y2="'yt'" style="stroke:#dc2626; stroke-width:1.6"/>
'<polygon points="113,'yt' 104,'yt - 4' 104,'yt + 4'" style="fill:#dc2626"/>
'<text x="58" y="'yt - 9'" style="fill:#dc2626">H<tspan dy="2" font-size="7">Ed</tspan><tspan dy="-2"> = 'r2(Hn)' kN</tspan></text>
'<polygon points="120,'yt' 120,'yv' 164,'yv'" style="fill:rgba(220,38,38,0.10); stroke:#dc2626; stroke-width:1"/>
'<text x="128" y="'yv - 8'" style="fill:#dc2626">M<tspan dy="2" font-size="7">Ed</tspan><tspan dy="-2"> = 'r2(Mn)' kNm</tspan></text>
'<line x1="36" y1="'yt'" x2="36" y2="'yv'" style="stroke:#1e40af; stroke-width:1"/>
'<text x="40" y="'(yt + yv)/2'" style="fill:#1e40af; font-weight:700">h = 'r2(hn)' m</text>
'<text x="22" y="202" style="fill:#6b7280">zijaanzicht</text>
'<line x1="240" y1="'yv'" x2="'266 + 2*ap + 14'" y2="'yv'" style="stroke:#6b7280; stroke-width:1.5"/>
'<line x1="266" y1="'yv'" x2="266" y2="'yt'" style="stroke:'kl_s'; stroke-width:4"/>
'<line x1="'266 + ap'" y1="'yv'" x2="'266 + ap'" y2="'yt'" style="stroke:'kl_s'; stroke-width:4"/>
'<line x1="'266 + 2*ap'" y1="'yv'" x2="'266 + 2*ap'" y2="'yt'" style="stroke:'kl_s'; stroke-width:4"/>
'<line x1="258" y1="'yt'" x2="'274 + 2*ap'" y2="'yt'" style="stroke:'kl_l'; stroke-width:5; stroke-linecap:round"/>
'<text x="'266 + ap'" y="'yt - 12'" text-anchor="middle" style="fill:#dc2626">q<tspan dy="2" font-size="7">k</tspan><tspan dy="-2"> = 'r2(qn)' kN/m, F</tspan><tspan dy="2" font-size="7">k</tspan><tspan dy="-2"> = 'r2(Fn)' kN</tspan></text>
'<line x1="266" y1="'yv + 14'" x2="'266 + ap'" y2="'yv + 14'" style="stroke:#1e40af; stroke-width:1"/>
'<line x1="266" y1="'yv + 10'" x2="266" y2="'yv + 18'" style="stroke:#1e40af; stroke-width:1"/>
'<line x1="'266 + ap'" y1="'yv + 10'" x2="'266 + ap'" y2="'yv + 18'" style="stroke:#1e40af; stroke-width:1"/>
'<text x="'266 + ap/2'" y="'yv + 28'" text-anchor="middle" style="fill:#1e40af; font-weight:700">a = 'r2(an)' m</text>
'<text x="'266 + 2*ap + 16'" y="202" text-anchor="end" style="fill:#6b7280">vooraanzicht</text>
'</svg>'

# 8. Samenvatting

#hide
kl4 = bool((vorm_s ≤ 5 and klasse_s ≡ 4) or (vorm_l ≤ 2 and (klasse_lh ≡ 4 or klasse_lv ≡ 4)))
#show
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Toets</th><th style="text-align:right; padding:2px 8px;">UC</th><th style="text-align:left; padding:2px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Staander, buiging'if(vorm_s ≤ 5; " en kip"; "")' en dwarskracht (§4)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_s)'">'r2(UC_s)'</td><td style="padding:2px 8px; color:'if(buiten_s ≡ 1; "#b91c1c"; kleur(UC_s))'">'if(buiten_s ≡ 1; "buiten dit blad"; oordeel(UC_s))'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Leuning (§5)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_l)'">'r2(UC_l)'</td><td style="padding:2px 8px; color:'kleur(UC_l)'">'oordeel(UC_l)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Verplaatsing van de bovenrand (§6)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_w,h)'">'r2(UC_w,h)'</td><td style="padding:2px 8px; color:'kleur(UC_w,h)'">'oordeel(UC_w,h)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Doorbuiging van de leuning, verticaal (§6)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_w,v)'">'if(verticaal ≡ 1; r2(UC_w,v); "—")'</td><td style="padding:2px 8px; color:'kleur(UC_w,v)'">'if(verticaal ≡ 1; oordeel(UC_w,v); "niet getoetst")'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Voetbevestiging (§7)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_a)'">'r2(UC_a)'</td><td style="padding:2px 8px; color:'kleur(UC_a)'">'oordeel(UC_a)'</td></tr>
'</table>

UC_max = max(UC_s; UC_l; UC_w,h; UC_w,v; UC_a)'<span class="alleen-scherm"></span>'
#if kl4 ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>het hekwerk voldoet niet</b>: een doorsnede valt in klasse 4, en die valt buiten dit blad.</span>
#else if buiten_s ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>het hekwerk voldoet niet</b>: een hoekstaal dat niet zijdelings wordt gehouden valt buiten dit blad.</span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>het hekwerk voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>het hekwerk voldoet niet</b></span>
#end if
'Buiten dit blad: de vulling, wind op een dichte vulling, de verbinding van leuning en staander, de voetplaat en de ondergrond (ook de rotatie van de voet in de verplaatsing van §6), en de stootbelasting van bijlage NB.B.
`;
