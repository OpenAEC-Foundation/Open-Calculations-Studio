/**
 * Paaldraagvermogen — NEN 9997-1:2016+C2:2017, art. 7.6.2.3 (Koppejan), met
 * trekpalen (7.6.3.3) en een indicatieve kalendercontrole.
 *
 * Druk. Per sondering het puntdraagvermogen uit de gemiddelde conusweerstanden
 * over de trajecten I, II en III (7.6.2.3(e)) en de schachtwrijving over ΔL
 * (7.6.2.3(c) en (i)), met α_p en α_s uit tabel 7.c. Karakteristiek met ξ3 en
 * ξ4 uit tabel A.10a of A.10b, rekenwaarde met γ_t uit tabel A.6 tot en met
 * A.8. Negatieve kleef volgens 7.3.2.2(d) als belasting op de paal, met
 * γ_f;nk = 1,0. Toets F_c;d + F_nk;d ≤ R_c;d (7.1).
 *
 * Trek. Alleen de schachtwrijving, met α_t uit tabel 7.c (7.6.3.3(b)). ξ en
 * γ_s;t (1,35) en γ_m;var;qc staan in de norm op q_c; omdat R_t lineair is in
 * q_c is dat hetzelfde als delen van de berekende trekweerstand (7.17). Een
 * paal in een paalgroep krijgt f1 = 1 (geen verdichting) en een elders
 * bepaalde f2 en kluitgewicht (7.6.3.3(c) t/m (h)). De bovenste meter grond
 * zonder schachtwrijving (7.6.3.3(g)) telt vanaf maaiveld, of vanaf de kop als
 * die dieper ligt: de strengere lezing. Het blad raadt aan bij twijfel als
 * groep te rekenen (opmerking bij 7.6.3.3(b)). Negatieve kleef werkt bij
 * trek gunstig en telt niet mee; de kleeflagen begrenzen alleen ΔL. Buiten
 * L/D ≥ 13,5 en 7 m ≤ L ≤ 50 m (7.6.3.3(a)) en bij een gepulste paal (geen
 * α_t in tabel 7.c) is het oordeel "niet aangetoond". Toets F_t;d ≤ R_t;d (7.12).
 *
 * Paaltypen. Tabel 7.c volledig; de waarden 1 tot en met 12 zijn gebleven
 * zoals ze waren, de nieuwe typen hebben 13 tot en met 20, zodat opgeslagen
 * bladen hetzelfde paaltype houden. Bij een micropaal de lage waarden (zonder
 * bevestiging door proefbelastingen) en de grens van de schachtmiddellijn
 * (voetnoot d). Bij een stalen buis met gesloten punt mag de voetplaat ten
 * hoogste 10 mm uitsteken (voetnoot b), bij een trekpaal met mantelbuis en
 * voetplaat ten hoogste 25 mm (voetnoot c). Een geprefabriceerde beton- of
 * houten paal (paaltype 1 of 11) met een andere schacht waarvan de voet meer
 * dan 10 mm uitsteekt, heeft een verbrede voet: ΔL is dan ten hoogste de
 * lengte van de verbreding (7.6.2.3(c)), ook op trek. Zonder verbreding
 * verandert er niets.
 *
 * De omtrek van de paalvoet geldt ook voor de schacht, tenzij de gebruiker een
 * andere schacht kiest: dan vult hij O_s;ΔL;gem in voor de schachtwrijving
 * (7.6.2.3(c)) en O_s;gem voor de negatieve kleef (7.3.2.2(d)). Bij een tapse
 * houten paal met betonopzetter (paaltype 13) rekent het blad de omtrek zelf:
 * lineair verlopend van de middellijn aan de punt naar die bovenaan het hout,
 * daarboven de opzetter. De punt rekent met de middellijn onder, de
 * schachtwrijving met de gemiddelde omtrek over ΔL per sondering en de
 * negatieve kleef met één gemiddelde omtrek O_s;gem over de kleeflagen, zoals
 * 7.3.2.2(d) die voor houten palen voorschrijft; boven de kop telt de omtrek
 * van de kop, zoals de kleef daar bij alle paaltypen meetelt. Reikt ΔL tot
 * in de opzetter, dan telt dat deel op druk met α_s = 0,010 van een
 * geprefabriceerde betonpaal: de 0,012 van tabel 7.c hoort bij het tapse
 * hout. Op trek is α_t voor beide 0,007. Een open
 * stalen buis (paaltype 14) rekent de onderrand en de grondprop apart
 * (7.6.2.3(d)): de wrijving op de binnenwand over de ingevulde hoogte van de
 * prop (ten hoogste ΔL). Het blad begrenst die op A_i·q_b;max, zodat onderrand
 * en prop samen niet meer geven dan de volle doorsnede: een aanname aan de
 * veilige kant, want 7.6.2.3(d) begrenst op de draagkracht van de punt met een
 * vaste prop.
 *
 * Bij een avegaarpaal begint traject III onderaan met ten hoogste 2 MPa en is
 * elke waarde erboven niet hoger dan die eronder (7.6.2.3(e)); de invoer is
 * het gemiddelde van die omhullende, en het beeld bepaalt hem zo uit een GEF.
 * Een hoger ingevuld gemiddelde kapt het blad af op 2 MPa, maar dat is alleen
 * een bovengrens: het gemiddelde van de omhullende kan lager zijn. De
 * correcties op q_c van 7.6.2.3(i) t/m (l) (grof zand en grind,
 * overconsolidatie, ontgraving) zitten in de invoer; het blad zegt dat erbij.
 *
 * Kalendercontrole (alleen geheide palen op druk, optioneel). De energie-
 * vergelijking van Hiley: R·(s + c/2) = η·G·h·ε, met ε het rendement van de
 * stoot volgens Newton (restitutiecoëfficiënt e) en c de tijdelijke
 * samendrukking. Met R = (R_c;cal)_min volgt de grootste blijvende zakking per
 * klap en het kleinste aantal slagen per 0,25 m (7.9(4)). Indicatief: een
 * heiformule toont de draagkracht niet aan (7.6.2.5); het oordeel van het
 * blad hangt er niet van af.
 *
 * Boven 12 % variatiecoëfficiënt, bij paaltype 8 met een ronde doorsnede (een
 * open buis waarvan de volle doorsnede een grondprop veronderstelt), bij een
 * andere schacht zonder ingevulde omtrek, bij een tapse houten paal met
 * negatieve kleef en de omtrek van de punt, bij onvolledige maten van een
 * tapse paal of open buis en buiten de grenzen van tabel 7.c is het oordeel
 * "niet aangetoond"; ook als de UC niet uit te rekenen is (lege invoer), zodat
 * het blad dan nooit "voldoet" zegt. Die UC toont het blad dan niet als getal
 * (geen NaN), maar als "niet te bepalen". De zakking (7.6.4) is niet getoetst.
 *
 * Nieuwe keuzes en velden zijn zo gekozen dat een bestaand blad na "Bladen
 * bijwerken" hetzelfde rekent: de eerste keuze van elk nieuw @select (druk,
 * alleenstaand, geen kalendercontrole) is het oude gedrag, en de nieuwe velden
 * tellen alleen bij de nieuwe keuzes.
 *
 * Op papier is het blad beknopter dan op het scherm: uitleg draagt de klasse
 * "alleen-scherm", korte regels een merkteken "kolom-2", "kolom-3" of
 * "kolom-4", en de tekening staat al in het beeld. De knopen blijven gelijk.
 * Geen backticks in dit commentaar: de controlescripts lezen de bladtekst
 * vanaf de eerste backtick.
 *
 * De blokken per sondering (1–6) en per laag met negatieve kleef (1–5) zijn
 * gelijk van opbouw; een wijziging hoort in alle blokken tegelijk. Geen
 * referentieberekening beschikbaar; scripts/check-paal.mjs rekent de
 * uitkomsten onafhankelijk na. Status in de catalogus: controleren.
 */

export const paaldraagvermogen = `"Paaldraagvermogen — NEN 9997-1 art. 7.6.2.3

'<i>Koppejan per sondering (7.6.2.3), karakteristiek met ξ (tabel A.10), rekenwaarde met γ_t; negatieve kleef als belasting (7.3.2.2). Op trek de schachtwrijving met α_t (7.6.3.3); bij geheide palen desgewenst een indicatieve kalendercontrole.</i><span class="alleen-scherm"></span>

# 1. Paal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select richting "Belasting op de paal"
  Druk: draagvermogen (7.6.2) = 0
  Trek: trekweerstand (7.6.3) = 1
@end
#if richting ≡ 1
    @select trekgroep "Trekpaal (7.6.3.3)"
      Alleenstaande paal (b) = 0
      Paal in een paalgroep: f2 en kluitgewicht elders bepaald, (c) t/m (h) = 1
    @end
    #if trekgroep ≡ 0
        '<i>Alleen voor een paal die zeker alleen staat. Is dat bij de hart-op-hartafstand in het palenplan niet op voorhand te zeggen, reken dan als paal in een paalgroep (opmerking bij 7.6.3.3(b)).</i>
    #end if
#else
    #hide
    trekgroep = 0
    #show
#end if

@select paaltype "Paaltype en wijze van installeren (tabel 7.c)"
  Betonpaal, geprefabriceerd, geheid = 1
  Betonpaal in de grond gevormd, mantelbuis teruggeheid = 2
  Betonpaal in de grond gevormd, mantelbuis getrild = 3
  Betonpaal in de grond gevormd, schroefpunt, geschroefd = 4
  Avegaarpaal, geschroefd = 5
  Boorpaal met steunvloeistof = 6
  Stalen buispaal, gesloten punt, geheid = 7
  Stalen buispaal, open, geheid = 14
  Stalen H-profiel, geheid (omhullende rechthoek) = 8
  Groutschil rond stalen profiel met voetplaat, geheid = 15
  Stalen paal met schroefpunt, geschroefd = 9
  Groutschil rond buis met schroefpunt, geschroefd = 10
  Stalen paal, gepulst = 16
  Micropaal met boorbuis, groutinjectie, niet afgeperst = 17
  Micropaal met boorbuis, groutinjectie, afgeperst = 18
  Micropaal met ankerbuizen, zelfborend of met schroefbladen = 19
  Micropaal met stalen hulpbuis, ingetrild = 20
  Houten paal, constante doorsnede, geheid = 11
  Houten paal, taps, geheid = 12
  Houten paal, taps, met of zonder betonopzetter: omtrek uit de middellijnen = 13
@end

#hide
'Tabel 7.c: [type | α_p | α_s | α_t | in de grond gevormd (δ = φ) | geheid]; gepulst (16) heeft geen α_t.
tab7c = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20 |0.7; 0.7; 0.7; 0.63; 0.56; 0.35; 0.70; 0.70; 0.56; 0.63; 0.7; 0.7; 0.7; 0.70; 0.70; 0.35; 0.35; 0.35; 0.35; 0.35 |0.010; 0.014; 0.012; 0.009; 0.006; 0.006; 0.010; 0.006; 0.006; 0.009; 0.010; 0.012; 0.012; 0.006; 0.014; 0.005; 0.008; 0.011; 0.008; 0.006 |0.007; 0.012; 0.010; 0.009; 0.0045; 0.0045; 0.007; 0.004; 0.0045; 0.009; 0.007; 0.007; 0.007; 0.004; 0.012; 0; 0.008; 0.011; 0.008; 0.006 |0; 1; 1; 1; 1; 1; 0; 0; 0; 1; 0; 0; 0; 0; 1; 0; 1; 1; 1; 1 |1; 1; 1; 0; 0; 0; 1; 1; 0; 0; 1; 1; 1; 1; 1; 0; 0; 0; 0; 0]
α_p = hlookup(tab7c; paaltype; 1; 2)
α_s = hlookup(tab7c; paaltype; 1; 3)
α_t = hlookup(tab7c; paaltype; 1; 4)
insitu = hlookup(tab7c; paaltype; 1; 5)
geheid = hlookup(tab7c; paaltype; 1; 6)
#show
#if richting ≡ 1
    α_t', factor voor de schachtwrijving op trek in zand (tabel 7.c)<span class="kolom-2"></span>'
#else
    α_p', paalklassefactor voor de punt<span class="kolom-2"></span>'
    α_s', schachtwrijving in zand en grind<span class="kolom-2"></span>'
#end if
#if paaltype ≥ 17
    '<i>Micropaal: de waarden van tabel 7.c zonder bevestiging door proefbelastingen (voetnoten e t/m h).</i><span class="alleen-scherm"></span>
#end if

#if paaltype ≡ 13 or paaltype ≡ 14
    #hide
    vorm = 1
    #show
#else
    @select vorm "Doorsnede van de paalvoet"
      Rond = 1
      Vierkant = 2
      Rechthoekig = 3
    @end
#end if
#if paaltype ≡ 14
    D = ?*(mm)', buitenmiddellijn van de buis<span class="kolom-2"></span>'
    t_w = ?*(mm)', wanddikte<span class="kolom-2"></span>'
    #hide
    D_i = max(D - 2*t_w; 0 mm)
    #show
    A_b = pi/4*(D^2 - D_i^2) to m^2', oppervlak van de onderrand (7.6.2.3(d))<span class="kolom-2"></span>'
    A_i = pi/4*D_i^2 to m^2', oppervlak binnen de buis: de grondprop<span class="kolom-2"></span>'
    O_s = pi*D to m', omtrek van de buitenwand<span class="kolom-2"></span>'
    O_i = pi*D_i to m', omtrek van de binnenwand<span class="kolom-2"></span>'
    D_eq = D to m', equivalente middellijn'
    #if richting ≡ 0
        L_prop = ?*(m)', hoogte van de grondprop die wrijving op de binnenwand geeft<span class="alleen-scherm">; gemeten of aangenomen, ten hoogste ΔL; 0 zonder prop</span>'
        '<i class="ook-afdruk">Aanname aan de veilige kant: de wrijving op de binnenwand telt ten hoogste A<sub>i</sub>·q<sub>b;max</sub>, zodat onderrand en prop samen niet meer geven dan de volle doorsnede. 7.6.2.3(d) begrenst ruimer, op de draagkracht van de punt met een vaste prop.</i>
    #end if
    #hide
    s_p = 1
    #show
#else if vorm ≡ 1
    D = ?*(mm)', middellijn<span class="alleen-scherm">; bij een tapse paal aan de punt</span>'
    A_b = pi/4*D^2 to m^2', oppervlak van de paalpunt<span class="kolom-3"></span>'
    O_s = pi*D to m', omtrek van de paalvoet<span class="kolom-3"></span>'
    D_eq = D to m', equivalente middellijn<span class="kolom-3"></span>'
    #hide
    s_p = 1
    #show
#else if vorm ≡ 2
    a_p = ?*(mm)', zijde'
    A_b = a_p^2 to m^2', oppervlak van de paalpunt<span class="kolom-3"></span>'
    O_s = 4*a_p to m', omtrek van de paalvoet<span class="kolom-3"></span>'
    D_eq = sqrt(4*A_b/pi) to m', equivalente middellijn: gelijk oppervlak<span class="kolom-3"></span>'
    #hide
    s_p = 1
    #show
#else
    a_p = ?*(mm)', kleinste zijde<span class="kolom-3"></span>'
    b_p = ?*(mm)', grootste zijde<span class="kolom-3"></span>'
    s_p = ?', factor s<span class="alleen-scherm"> voor de rechthoekige paalvoet</span> (7.6.2.3(h))<span class="kolom-3"></span>'
    A_b = a_p*b_p to m^2', oppervlak van de paalpunt<span class="kolom-3"></span>'
    O_s = 2*(a_p + b_p) to m', omtrek van de paalvoet<span class="kolom-3"></span>'
    D_eq = if(b_p > 1.5*a_p; a_p; sqrt(4*A_b/pi)) to m', equivalente middellijn; a als b > 1,5a (7.6.2.3(e))<span class="kolom-3"></span>'
#end if
#if paaltype ≡ 8 and vorm ≡ 1
    '<b style="color:#b91c1c">Open stalen buis: de volle doorsnede als paalpunt veronderstelt een volledige grondprop (7.6.2.3). Toon die aan; anders overschat dit blad het puntdraagvermogen. Of kies "Stalen buispaal, open": die rekent de onderrand en de prop apart (7.6.2.3(d)).</b>
#end if
#if paaltype ≡ 13
    #hide
    schacht = 0
    O_s,ΔL = O_s
    #show
#else
    @select schacht "Omtrek van de schacht"
      Gelijk aan die van de paalvoet = 0
      Anders (tapse paal, verbrede voet of voetplaat): invullen = 1
    @end
    #if schacht ≡ 1
        O_s,ΔL = ?*(m)', gemiddelde omtrek van de schacht in de laag van de paalvoet (7.6.2.3(c))'
    #else
        #hide
        O_s,ΔL = O_s
        #show
    #end if
#end if
#if paaltype ≡ 12 and schacht ≡ 0
    '<b style="color:#b91c1c">Tapse houten paal: de omtrek van de punt is de kleinste van de schacht. Voor de negatieve kleef geldt de gemiddelde omtrek van de schacht (7.3.2.2(d)); kies bij negatieve kleef "Anders" en vul die in, of kies de tapse houten paal met de omtrek uit de middellijnen.</b>
#end if
#hide
'Voetplaat buiten de schacht: ten hoogste 10 mm bij een buispaal met gesloten punt (tabel 7.c, voetnoot b), 25 mm bij een trekpaal met mantelbuis (voetnoot c).
vp_fout = 0
mp_fout = 0
#show
#if schacht ≡ 1 and vorm ≡ 1 and (paaltype ≡ 7 or ((paaltype ≡ 2 or paaltype ≡ 3) and richting ≡ 1))
    #hide
    Δ_vp = (D - O_s,ΔL/pi)/2 to mm
    Δ_vp,max = if(paaltype ≡ 7; 10 mm; 25 mm)
    vp_fout = if(Δ_vp > Δ_vp,max; 1; 0)
    #show
    #if vp_fout ≡ 1
        '<b style="color:#b91c1c">De voetplaat steekt 'Δ_vp' mm buiten de schacht uit, meer dan 'Δ_vp,max' mm (tabel 7.c, voetnoot b of c): de factoren van tabel 7.c gelden dan niet.</b>
    #end if
#end if
#hide
'Verbrede voet van een geprefabriceerde beton- of houten paal: steekt de voet meer dan 10 mm buiten de schacht uit, dan is ΔL ten hoogste de lengte van de verbreding (7.6.2.3(c)).
vv = 0
L_vv = 0 m
#show
#if schacht ≡ 1 and (paaltype ≡ 1 or paaltype ≡ 11)
    #hide
    Δ_vv = if(vorm ≡ 1; (O_s - O_s,ΔL)/(2*pi); (O_s - O_s,ΔL)/8) to mm
    vv = if(Δ_vv > 10 mm; 1; 0)
    #show
    #if vv ≡ 1
        '<b style="color:#b45309">De voet steekt 'Δ_vv' mm buiten de schacht uit, meer dan 10 mm: een verbrede voet. ΔL is dan ten hoogste de lengte van de verbreding (7.6.2.3(c)).</b>
        L_vv = ?*(m)', lengte van de verbrede voet<span class="kolom-2"></span>'
    #end if
#end if
#if paaltype ≥ 17
    #hide
    d_sch = O_s,ΔL/pi to mm
    d_sch,max = if(paaltype ≡ 19; 400 mm; 200 mm)
    mp_fout = if(d_sch > d_sch,max; 1; 0)
    #show
    #if mp_fout ≡ 1
        '<b style="color:#b91c1c">Micropaal met een schachtmiddellijn van 'd_sch' mm: tabel 7.c geldt voor dit type tot 'd_sch,max' mm (voetnoot d).</b>
    #end if
#end if
#if richting ≡ 0
    β = ?', paalvoetvormfactor (7.6.2.3(g), figuur 7.i)<span class="alleen-scherm">; 1 zonder verbrede voet</span>'
#else
    #hide
    β = 1
    #show
#end if

z_kop = ?*(m)', paalkopniveau t.o.v. NAP<span class="kolom-3"></span>'
z_punt = ?*(m)', paalpuntniveau t.o.v. NAP<span class="kolom-3"></span>'
L_paal = z_kop - z_punt to m', paallengte<span class="kolom-3"></span>'

#if paaltype ≡ 13
    '<h6>Tapse houten paal</h6>
    D_hout = ?*(mm)', middellijn van het hout bovenaan<span class="alleen-scherm">: onder de opzetter, of aan de kop zonder opzetter</span><span class="kolom-3"></span>'
    L_opz = ?*(m)', lengte van de betonopzetter<span class="alleen-scherm">; 0 zonder opzetter</span><span class="kolom-3"></span>'
    #if L_opz > 0 m
        D_opz = ?*(mm)', middellijn van de opzetter<span class="kolom-3"></span>'
    #else
        #hide
        D_opz = D_hout
        #show
    #end if
    L_h = max(L_paal - L_opz; 1 mm) to m', lengte van het hout<span class="kolom-2"></span>'
    O_h = pi*D_hout to m', omtrek van het hout bovenaan<span class="kolom-2"></span>'
    #if L_opz > 0 m
        O_o = pi*D_opz to m', omtrek van de opzetter<span class="kolom-2"></span>'
    #else
        #hide
        O_o = O_h
        #show
    #end if
    #if L_opz > 0 m and richting ≡ 0
        α_s,o = 0.010', α<sub>s</sub> langs de opzetter: geprefabriceerde betonpaal (tabel 7.c)<span class="kolom-2"></span>'
    #else
        #hide
        α_s,o = 0.010
        #show
    #end if
    #hide
    'De omtrek verloopt lineair van O_s aan de punt naar O_h bovenaan het hout; daarboven O_o.
    'O_cum(x) is de integraal van de omtrek van de punt tot x erboven; O_dl(x) het gemiddelde daarover.
    O_cum(x) = if(x ≤ 0 m; O_s*x; if(x ≤ L_h; O_s*x + (O_h - O_s)*x^2/(2*L_h); (O_s + O_h)/2*L_h + O_o*(x - L_h)))
    O_dl(x) = if(x > 0 m; O_cum(x)/x; O_s)
    tp_fout = if(D_hout < D or L_opz ≥ L_paal or L_opz < 0 m or (L_opz > 0 m and D_opz ≤ 0 mm); 1; 0)
    #show
    #if tp_fout ≡ 1
        '<b style="color:#b91c1c">De maten van de tapse paal zijn onvolledig of kloppen niet: het hout is bovenaan ten minste zo dik als aan de punt, een opzetter heeft een middellijn en is korter dan de paal.</b>
    #end if
#else
    #hide
    tp_fout = 0
    #show
#end if

@select stijf "Het bouwwerk"
  Is niet stijf: geen herverdeling tussen de palen = 0
  Is stijf: belasting gaat van zwakke naar sterke palen = 1
@end

# 2. Negatieve kleef

@select nk "Negatieve kleef (7.3.2.2)"
  Niet in rekening: geen maaiveldzakking na installatie (verwaarloosbaar) = 0
  In rekening: alleenstaande paal of palen in één rij (7.3.2.2(d)) = 1
@end
#if nk ≡ 1
    #if richting ≡ 1
        '<i>Bij trek werkt de negatieve kleef de trekkracht tegen en telt hij niet mee; in de kleeflagen telt ook geen schachtwrijving.</i><span class="alleen-scherm"></span>
    #end if
    z_mv = ?*(m)', maaiveld t.o.v. NAP<span class="alleen-scherm">: bovenkant van de bovenste laag</span><span class="kolom-3"></span>'
    d_gw = ?*(m)', grondwaterstand onder maaiveld<span class="kolom-3"></span>'
    q_mv = ?*(kPa)', bovenbelasting op het maaiveld<span class="kolom-3"></span>'
    n_l = ?', aantal lagen met negatieve kleef<span class="alleen-scherm"> (1 tot en met 5)</span>'
    #if schacht ≡ 1
        O_s,gem = ?*(m)', gemiddelde omtrek van de schacht in deze lagen (7.3.2.2(d))<span class="alleen-scherm">; in de grond gevormd: buitenonderrand van de buis of de avegaar</span>'
    #else
        #hide
        O_s,gem = O_s
        #show
    #end if
    #if paaltype ≡ 13
        #hide
        'Gemiddelde omtrek tussen de diepten a en b onder maaiveld; boven de kop die van de kop, onder de punt die van de punt.
        O_laag(a; b) = (O_cum(z_mv - a - z_punt) - O_cum(z_mv - b - z_punt))/max(b - a; 1 mm)
        #show
    #end if
    #hide
    γ_w = 10 kN/m^3
    f_δ = if(insitu ≡ 1; 1; 0.75)
    #show
    #if n_l ≥ 1
        '<h6>Laag 1</h6>
        d_1 = ?*(m)', dikte<span class="kolom-4"></span>'
        γ_1 = ?*(kN/m^3)', γ<span class="alleen-scherm"> boven de grondwaterstand</span><span class="kolom-4"></span>'
        γ_sat,1 = ?*(kN/m^3)', γ<sub>sat</sub><span class="alleen-scherm"> onder de grondwaterstand</span><span class="kolom-4"></span>'
        φ_1 = ?', φ′<sub>k</sub> in graden<span class="kolom-4"></span>'
        #hide
        z_t,1 = 0 m
        z_b,1 = z_t,1 + d_1
        a_1 = min(max(d_gw - z_t,1; 0 m); d_1)
        b_1 = d_1 - a_1
        σ_t,1 = q_mv
        σ_m,1 = σ_t,1 + γ_1*a_1
        σ_b,1 = σ_m,1 + (γ_sat,1 - γ_w)*b_1
        #show
        S_v,1 = (σ_t,1 + σ_m,1)/2*a_1 + (σ_m,1 + σ_b,1)/2*b_1 to kN/m', ∫σ′_v dz over de laag<span class="kolom-2"></span>'
        K_0,1 = 1 - sin(φ_1*pi/180)', (7.3.2.2(d)), OCR = 1<span class="kolom-2"></span>'
        δ_1 = f_δ*φ_1', wrijvingshoek paal–grond in graden<span class="alleen-scherm">: φ′ bij in de grond gevormd, anders 0,75·φ′</span><span class="kolom-2"></span>'
        c_nk,1 = max(K_0,1*tan(δ_1*pi/180); 0.25)', K_0·tan δ, ten minste 0,25<span class="kolom-2"></span>'
        #if paaltype ≡ 13
            #hide
            T_nk,1 = c_nk,1*S_v,1
            #show
        #else
            F_nk,1 = O_s,gem*c_nk,1*S_v,1 to kN', bijdrage van laag 1'
        #end if
    #else
        #hide
        z_b,1 = 0 m
        σ_b,1 = q_mv
        F_nk,1 = 0 kN
        T_nk,1 = 0 kN/m
        #show
    #end if
    #if n_l ≥ 2
        '<h6>Laag 2</h6>
        d_2 = ?*(m)', dikte<span class="kolom-4"></span>'
        γ_2 = ?*(kN/m^3)', γ<span class="alleen-scherm"> boven de grondwaterstand</span><span class="kolom-4"></span>'
        γ_sat,2 = ?*(kN/m^3)', γ<sub>sat</sub><span class="alleen-scherm"> onder de grondwaterstand</span><span class="kolom-4"></span>'
        φ_2 = ?', φ′<sub>k</sub> in graden<span class="kolom-4"></span>'
        #hide
        z_t,2 = z_b,1
        z_b,2 = z_t,2 + d_2
        a_2 = min(max(d_gw - z_t,2; 0 m); d_2)
        b_2 = d_2 - a_2
        σ_t,2 = σ_b,1
        σ_m,2 = σ_t,2 + γ_2*a_2
        σ_b,2 = σ_m,2 + (γ_sat,2 - γ_w)*b_2
        #show
        S_v,2 = (σ_t,2 + σ_m,2)/2*a_2 + (σ_m,2 + σ_b,2)/2*b_2 to kN/m', ∫σ′_v dz over de laag<span class="kolom-2"></span>'
        K_0,2 = 1 - sin(φ_2*pi/180)', (7.3.2.2(d)), OCR = 1<span class="kolom-2"></span>'
        δ_2 = f_δ*φ_2', wrijvingshoek paal–grond in graden<span class="alleen-scherm">: φ′ bij in de grond gevormd, anders 0,75·φ′</span><span class="kolom-2"></span>'
        c_nk,2 = max(K_0,2*tan(δ_2*pi/180); 0.25)', K_0·tan δ, ten minste 0,25<span class="kolom-2"></span>'
        #if paaltype ≡ 13
            #hide
            T_nk,2 = c_nk,2*S_v,2
            #show
        #else
            F_nk,2 = O_s,gem*c_nk,2*S_v,2 to kN', bijdrage van laag 2'
        #end if
    #else
        #hide
        z_b,2 = z_b,1
        σ_b,2 = σ_b,1
        F_nk,2 = 0 kN
        T_nk,2 = 0 kN/m
        #show
    #end if
    #if n_l ≥ 3
        '<h6>Laag 3</h6>
        d_3 = ?*(m)', dikte<span class="kolom-4"></span>'
        γ_3 = ?*(kN/m^3)', γ<span class="alleen-scherm"> boven de grondwaterstand</span><span class="kolom-4"></span>'
        γ_sat,3 = ?*(kN/m^3)', γ<sub>sat</sub><span class="alleen-scherm"> onder de grondwaterstand</span><span class="kolom-4"></span>'
        φ_3 = ?', φ′<sub>k</sub> in graden<span class="kolom-4"></span>'
        #hide
        z_t,3 = z_b,2
        z_b,3 = z_t,3 + d_3
        a_3 = min(max(d_gw - z_t,3; 0 m); d_3)
        b_3 = d_3 - a_3
        σ_t,3 = σ_b,2
        σ_m,3 = σ_t,3 + γ_3*a_3
        σ_b,3 = σ_m,3 + (γ_sat,3 - γ_w)*b_3
        #show
        S_v,3 = (σ_t,3 + σ_m,3)/2*a_3 + (σ_m,3 + σ_b,3)/2*b_3 to kN/m', ∫σ′_v dz over de laag<span class="kolom-2"></span>'
        K_0,3 = 1 - sin(φ_3*pi/180)', (7.3.2.2(d)), OCR = 1<span class="kolom-2"></span>'
        δ_3 = f_δ*φ_3', wrijvingshoek paal–grond in graden<span class="alleen-scherm">: φ′ bij in de grond gevormd, anders 0,75·φ′</span><span class="kolom-2"></span>'
        c_nk,3 = max(K_0,3*tan(δ_3*pi/180); 0.25)', K_0·tan δ, ten minste 0,25<span class="kolom-2"></span>'
        #if paaltype ≡ 13
            #hide
            T_nk,3 = c_nk,3*S_v,3
            #show
        #else
            F_nk,3 = O_s,gem*c_nk,3*S_v,3 to kN', bijdrage van laag 3'
        #end if
    #else
        #hide
        z_b,3 = z_b,2
        σ_b,3 = σ_b,2
        F_nk,3 = 0 kN
        T_nk,3 = 0 kN/m
        #show
    #end if
    #if n_l ≥ 4
        '<h6>Laag 4</h6>
        d_4 = ?*(m)', dikte<span class="kolom-4"></span>'
        γ_4 = ?*(kN/m^3)', γ<span class="alleen-scherm"> boven de grondwaterstand</span><span class="kolom-4"></span>'
        γ_sat,4 = ?*(kN/m^3)', γ<sub>sat</sub><span class="alleen-scherm"> onder de grondwaterstand</span><span class="kolom-4"></span>'
        φ_4 = ?', φ′<sub>k</sub> in graden<span class="kolom-4"></span>'
        #hide
        z_t,4 = z_b,3
        z_b,4 = z_t,4 + d_4
        a_4 = min(max(d_gw - z_t,4; 0 m); d_4)
        b_4 = d_4 - a_4
        σ_t,4 = σ_b,3
        σ_m,4 = σ_t,4 + γ_4*a_4
        σ_b,4 = σ_m,4 + (γ_sat,4 - γ_w)*b_4
        #show
        S_v,4 = (σ_t,4 + σ_m,4)/2*a_4 + (σ_m,4 + σ_b,4)/2*b_4 to kN/m', ∫σ′_v dz over de laag<span class="kolom-2"></span>'
        K_0,4 = 1 - sin(φ_4*pi/180)', (7.3.2.2(d)), OCR = 1<span class="kolom-2"></span>'
        δ_4 = f_δ*φ_4', wrijvingshoek paal–grond in graden<span class="alleen-scherm">: φ′ bij in de grond gevormd, anders 0,75·φ′</span><span class="kolom-2"></span>'
        c_nk,4 = max(K_0,4*tan(δ_4*pi/180); 0.25)', K_0·tan δ, ten minste 0,25<span class="kolom-2"></span>'
        #if paaltype ≡ 13
            #hide
            T_nk,4 = c_nk,4*S_v,4
            #show
        #else
            F_nk,4 = O_s,gem*c_nk,4*S_v,4 to kN', bijdrage van laag 4'
        #end if
    #else
        #hide
        z_b,4 = z_b,3
        σ_b,4 = σ_b,3
        F_nk,4 = 0 kN
        T_nk,4 = 0 kN/m
        #show
    #end if
    #if n_l ≥ 5
        '<h6>Laag 5</h6>
        d_5 = ?*(m)', dikte<span class="kolom-4"></span>'
        γ_5 = ?*(kN/m^3)', γ<span class="alleen-scherm"> boven de grondwaterstand</span><span class="kolom-4"></span>'
        γ_sat,5 = ?*(kN/m^3)', γ<sub>sat</sub><span class="alleen-scherm"> onder de grondwaterstand</span><span class="kolom-4"></span>'
        φ_5 = ?', φ′<sub>k</sub> in graden<span class="kolom-4"></span>'
        #hide
        z_t,5 = z_b,4
        z_b,5 = z_t,5 + d_5
        a_5 = min(max(d_gw - z_t,5; 0 m); d_5)
        b_5 = d_5 - a_5
        σ_t,5 = σ_b,4
        σ_m,5 = σ_t,5 + γ_5*a_5
        σ_b,5 = σ_m,5 + (γ_sat,5 - γ_w)*b_5
        #show
        S_v,5 = (σ_t,5 + σ_m,5)/2*a_5 + (σ_m,5 + σ_b,5)/2*b_5 to kN/m', ∫σ′_v dz over de laag<span class="kolom-2"></span>'
        K_0,5 = 1 - sin(φ_5*pi/180)', (7.3.2.2(d)), OCR = 1<span class="kolom-2"></span>'
        δ_5 = f_δ*φ_5', wrijvingshoek paal–grond in graden<span class="alleen-scherm">: φ′ bij in de grond gevormd, anders 0,75·φ′</span><span class="kolom-2"></span>'
        c_nk,5 = max(K_0,5*tan(δ_5*pi/180); 0.25)', K_0·tan δ, ten minste 0,25<span class="kolom-2"></span>'
        #if paaltype ≡ 13
            #hide
            T_nk,5 = c_nk,5*S_v,5
            #show
        #else
            F_nk,5 = O_s,gem*c_nk,5*S_v,5 to kN', bijdrage van laag 5'
        #end if
    #else
        #hide
        z_b,5 = z_b,4
        σ_b,5 = σ_b,4
        F_nk,5 = 0 kN
        T_nk,5 = 0 kN/m
        #show
    #end if
    #if paaltype ≡ 13
        O_s,gem = O_laag(0 m; z_b,5) to m', gemiddelde omtrek van de schacht over de kleeflagen (7.3.2.2(d))<span class="alleen-scherm">; boven de kop die van de kop</span>'
        F_nk,k = O_s,gem*(T_nk,1 + T_nk,2 + T_nk,3 + T_nk,4 + T_nk,5) to kN', karakteristieke negatieve kleef: O<sub>s;gem</sub>·Σ K<sub>0</sub>·tan δ·∫σ′<sub>v</sub> dz'
    #else
        F_nk,k = F_nk,1 + F_nk,2 + F_nk,3 + F_nk,4 + F_nk,5 to kN', karakteristieke negatieve kleef'
    #end if
    γ_fnk = 1.0', berekend volgens 7.3.2.2(d)<span class="kolom-2"></span>'
    F_nk,d = γ_fnk*F_nk,k to kN'<span class="kolom-2"></span>'
    #hide
    z_draag = z_mv - z_b,5
    #show
    #if z_punt ≥ z_draag
        '<b style="color:#b91c1c">De paalpunt ligt niet onder de lagen met negatieve kleef: controleer het paalpuntniveau en de laagdikten.</b>
    #end if
#else
    #hide
    F_nk,d = 0 kN
    O_s,gem = O_s
    z_mv = z_kop
    z_draag = z_kop
    n_l = 0
    #show
#end if
#hide
'Positieve schachtwrijving alleen onder de lagen met negatieve kleef (7.6.2.3(c)); bij trek ook.
'Een trekpaal in een paalgroep heeft in de bovenste meter grond geen schachtwrijving (7.6.3.3(g)): vanaf maaiveld, of vanaf de kop als die dieper ligt.
z_bm = min(z_kop; z_mv) - 1 m
ΔL_0 = max(min(z_kop; z_draag; if(trekgroep ≡ 1; z_bm; z_kop)) - z_punt; 0 m)
'Een verbrede voet begrenst ΔL tot de lengte van de verbreding (7.6.2.3(c)).
ΔL_max = if(vv ≡ 1; min(ΔL_0; max(L_vv; 0 m)); ΔL_0)
'De melding bij een ingekorte ΔL noemt wat hem begrenst: eerst de verbrede voet, dan de bovenste meter als die dieper reikt dan de kleeflagen en de kop.
ΔL_vv = if(vv ≡ 1 and L_vv < ΔL_0; 1; 0)
ΔL_bm = if(trekgroep ≡ 1 and z_bm < min(z_kop; z_draag); 1; 0)
#show

# 3. Draagvermogen per sondering

#if richting ≡ 1
    '<i>Per sondering de schachtwrijving op trek over ΔL met q<sub>cs</sub>: de conusweerstand na de correcties van 7.6.2.3(j) t/m (l) en de reductie en het afsnuiten van 7.6.2.3(i) (7.6.3.3(d)). ξ, γ<sub>s;t</sub> en γ<sub>m;var;qc</sub> volgen in 4.</i><span class="alleen-scherm"></span>
#else
    '<i>De conusweerstanden zijn ingevuld na de correcties van 7.6.2.3(j) t/m (l): overconsolidatie, ontgraving en in grind ten hoogste 20 MPa; q<sub>cs</sub> bovendien na de reductie in grof zand of grind (7.6.2.3(i)) en het afsnuiten.</i><span class="alleen-scherm"></span>
#end if
n_s = ?', aantal sonderingen (1 tot en met 6)'
#if n_s ≥ 1
    '<h6>Sondering 1</h6>
    #if richting ≡ 0
        q_cI,1 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,1 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,1 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,1 > 2 MPa
            q_cIII,1 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,1 = min(0.5*α_p*β*s_p*((q_cI,1 + q_cII,1)/2 + q_cIII,1); 15 MPa)', (7.6.2.3(e))'
        R_bcal,1 = A_b*q_bmax,1 to kN', puntdraagvermogen'
    #end if
    q_cs,1 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_1 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_1 > ΔL_max and ΔL_vv ≡ 1
        ΔL_1 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_1 > ΔL_max and ΔL_bm ≡ 1
        ΔL_1 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_1 > ΔL_max and nk ≡ 1
        ΔL_1 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_1 > ΔL_max
        ΔL_1 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,1 = O_dl(ΔL_1) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,1 = O_s,ΔL,1*α_t*min(q_cs,1; 15 MPa)*ΔL_1 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,1 = O_s,ΔL*α_t*min(q_cs,1; 15 MPa)*ΔL_1 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,1 = R_tcal,1
        R_laag,1 = R_tcal,1
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_1 > L_h
                R_scal,1 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_1 - L_h))*min(q_cs,1; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,1 = O_s,ΔL,1*α_s*min(q_cs,1; 15 MPa)*ΔL_1 to kN', schachtwrijving'
            #end if
        #else
            R_scal,1 = O_s,ΔL*α_s*min(q_cs,1; 15 MPa)*ΔL_1 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,1 = min(O_i*α_s*min(q_cs,1; 15 MPa)*min(L_prop; ΔL_1); A_i*q_bmax,1) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,1 = R_bcal,1 + R_prop,1 + R_scal,1 to kN', maximumdraagkracht bij sondering 1'
        #else
            R_ccal,1 = R_bcal,1 + R_scal,1 to kN', maximumdraagkracht bij sondering 1'
        #end if
        #hide
        R_telt,1 = R_ccal,1
        R_laag,1 = R_ccal,1
        #show
    #end if
#else
    #hide
    R_telt,1 = 0 kN
    R_laag,1 = 10^9 kN
    q_bmax,1 = 0 MPa
    R_bcal,1 = 0 kN
    R_scal,1 = 0 kN
    R_ccal,1 = 0 kN
    R_tcal,1 = 0 kN
    #show
#end if
#if n_s ≥ 2
    '<h6>Sondering 2</h6>
    #if richting ≡ 0
        q_cI,2 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,2 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,2 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,2 > 2 MPa
            q_cIII,2 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,2 = min(0.5*α_p*β*s_p*((q_cI,2 + q_cII,2)/2 + q_cIII,2); 15 MPa)', (7.6.2.3(e))'
        R_bcal,2 = A_b*q_bmax,2 to kN', puntdraagvermogen'
    #end if
    q_cs,2 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_2 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_2 > ΔL_max and ΔL_vv ≡ 1
        ΔL_2 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_2 > ΔL_max and ΔL_bm ≡ 1
        ΔL_2 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_2 > ΔL_max and nk ≡ 1
        ΔL_2 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_2 > ΔL_max
        ΔL_2 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,2 = O_dl(ΔL_2) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,2 = O_s,ΔL,2*α_t*min(q_cs,2; 15 MPa)*ΔL_2 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,2 = O_s,ΔL*α_t*min(q_cs,2; 15 MPa)*ΔL_2 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,2 = R_tcal,2
        R_laag,2 = R_tcal,2
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_2 > L_h
                R_scal,2 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_2 - L_h))*min(q_cs,2; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,2 = O_s,ΔL,2*α_s*min(q_cs,2; 15 MPa)*ΔL_2 to kN', schachtwrijving'
            #end if
        #else
            R_scal,2 = O_s,ΔL*α_s*min(q_cs,2; 15 MPa)*ΔL_2 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,2 = min(O_i*α_s*min(q_cs,2; 15 MPa)*min(L_prop; ΔL_2); A_i*q_bmax,2) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,2 = R_bcal,2 + R_prop,2 + R_scal,2 to kN', maximumdraagkracht bij sondering 2'
        #else
            R_ccal,2 = R_bcal,2 + R_scal,2 to kN', maximumdraagkracht bij sondering 2'
        #end if
        #hide
        R_telt,2 = R_ccal,2
        R_laag,2 = R_ccal,2
        #show
    #end if
#else
    #hide
    R_telt,2 = 0 kN
    R_laag,2 = 10^9 kN
    q_bmax,2 = 0 MPa
    R_bcal,2 = 0 kN
    R_scal,2 = 0 kN
    R_ccal,2 = 0 kN
    R_tcal,2 = 0 kN
    #show
#end if
#if n_s ≥ 3
    '<h6>Sondering 3</h6>
    #if richting ≡ 0
        q_cI,3 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,3 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,3 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,3 > 2 MPa
            q_cIII,3 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,3 = min(0.5*α_p*β*s_p*((q_cI,3 + q_cII,3)/2 + q_cIII,3); 15 MPa)', (7.6.2.3(e))'
        R_bcal,3 = A_b*q_bmax,3 to kN', puntdraagvermogen'
    #end if
    q_cs,3 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_3 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_3 > ΔL_max and ΔL_vv ≡ 1
        ΔL_3 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_3 > ΔL_max and ΔL_bm ≡ 1
        ΔL_3 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_3 > ΔL_max and nk ≡ 1
        ΔL_3 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_3 > ΔL_max
        ΔL_3 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,3 = O_dl(ΔL_3) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,3 = O_s,ΔL,3*α_t*min(q_cs,3; 15 MPa)*ΔL_3 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,3 = O_s,ΔL*α_t*min(q_cs,3; 15 MPa)*ΔL_3 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,3 = R_tcal,3
        R_laag,3 = R_tcal,3
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_3 > L_h
                R_scal,3 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_3 - L_h))*min(q_cs,3; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,3 = O_s,ΔL,3*α_s*min(q_cs,3; 15 MPa)*ΔL_3 to kN', schachtwrijving'
            #end if
        #else
            R_scal,3 = O_s,ΔL*α_s*min(q_cs,3; 15 MPa)*ΔL_3 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,3 = min(O_i*α_s*min(q_cs,3; 15 MPa)*min(L_prop; ΔL_3); A_i*q_bmax,3) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,3 = R_bcal,3 + R_prop,3 + R_scal,3 to kN', maximumdraagkracht bij sondering 3'
        #else
            R_ccal,3 = R_bcal,3 + R_scal,3 to kN', maximumdraagkracht bij sondering 3'
        #end if
        #hide
        R_telt,3 = R_ccal,3
        R_laag,3 = R_ccal,3
        #show
    #end if
#else
    #hide
    R_telt,3 = 0 kN
    R_laag,3 = 10^9 kN
    q_bmax,3 = 0 MPa
    R_bcal,3 = 0 kN
    R_scal,3 = 0 kN
    R_ccal,3 = 0 kN
    R_tcal,3 = 0 kN
    #show
#end if
#if n_s ≥ 4
    '<h6>Sondering 4</h6>
    #if richting ≡ 0
        q_cI,4 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,4 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,4 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,4 > 2 MPa
            q_cIII,4 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,4 = min(0.5*α_p*β*s_p*((q_cI,4 + q_cII,4)/2 + q_cIII,4); 15 MPa)', (7.6.2.3(e))'
        R_bcal,4 = A_b*q_bmax,4 to kN', puntdraagvermogen'
    #end if
    q_cs,4 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_4 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_4 > ΔL_max and ΔL_vv ≡ 1
        ΔL_4 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_4 > ΔL_max and ΔL_bm ≡ 1
        ΔL_4 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_4 > ΔL_max and nk ≡ 1
        ΔL_4 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_4 > ΔL_max
        ΔL_4 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,4 = O_dl(ΔL_4) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,4 = O_s,ΔL,4*α_t*min(q_cs,4; 15 MPa)*ΔL_4 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,4 = O_s,ΔL*α_t*min(q_cs,4; 15 MPa)*ΔL_4 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,4 = R_tcal,4
        R_laag,4 = R_tcal,4
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_4 > L_h
                R_scal,4 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_4 - L_h))*min(q_cs,4; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,4 = O_s,ΔL,4*α_s*min(q_cs,4; 15 MPa)*ΔL_4 to kN', schachtwrijving'
            #end if
        #else
            R_scal,4 = O_s,ΔL*α_s*min(q_cs,4; 15 MPa)*ΔL_4 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,4 = min(O_i*α_s*min(q_cs,4; 15 MPa)*min(L_prop; ΔL_4); A_i*q_bmax,4) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,4 = R_bcal,4 + R_prop,4 + R_scal,4 to kN', maximumdraagkracht bij sondering 4'
        #else
            R_ccal,4 = R_bcal,4 + R_scal,4 to kN', maximumdraagkracht bij sondering 4'
        #end if
        #hide
        R_telt,4 = R_ccal,4
        R_laag,4 = R_ccal,4
        #show
    #end if
#else
    #hide
    R_telt,4 = 0 kN
    R_laag,4 = 10^9 kN
    q_bmax,4 = 0 MPa
    R_bcal,4 = 0 kN
    R_scal,4 = 0 kN
    R_ccal,4 = 0 kN
    R_tcal,4 = 0 kN
    #show
#end if
#if n_s ≥ 5
    '<h6>Sondering 5</h6>
    #if richting ≡ 0
        q_cI,5 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,5 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,5 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,5 > 2 MPa
            q_cIII,5 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,5 = min(0.5*α_p*β*s_p*((q_cI,5 + q_cII,5)/2 + q_cIII,5); 15 MPa)', (7.6.2.3(e))'
        R_bcal,5 = A_b*q_bmax,5 to kN', puntdraagvermogen'
    #end if
    q_cs,5 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_5 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_5 > ΔL_max and ΔL_vv ≡ 1
        ΔL_5 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_5 > ΔL_max and ΔL_bm ≡ 1
        ΔL_5 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_5 > ΔL_max and nk ≡ 1
        ΔL_5 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_5 > ΔL_max
        ΔL_5 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,5 = O_dl(ΔL_5) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,5 = O_s,ΔL,5*α_t*min(q_cs,5; 15 MPa)*ΔL_5 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,5 = O_s,ΔL*α_t*min(q_cs,5; 15 MPa)*ΔL_5 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,5 = R_tcal,5
        R_laag,5 = R_tcal,5
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_5 > L_h
                R_scal,5 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_5 - L_h))*min(q_cs,5; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,5 = O_s,ΔL,5*α_s*min(q_cs,5; 15 MPa)*ΔL_5 to kN', schachtwrijving'
            #end if
        #else
            R_scal,5 = O_s,ΔL*α_s*min(q_cs,5; 15 MPa)*ΔL_5 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,5 = min(O_i*α_s*min(q_cs,5; 15 MPa)*min(L_prop; ΔL_5); A_i*q_bmax,5) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,5 = R_bcal,5 + R_prop,5 + R_scal,5 to kN', maximumdraagkracht bij sondering 5'
        #else
            R_ccal,5 = R_bcal,5 + R_scal,5 to kN', maximumdraagkracht bij sondering 5'
        #end if
        #hide
        R_telt,5 = R_ccal,5
        R_laag,5 = R_ccal,5
        #show
    #end if
#else
    #hide
    R_telt,5 = 0 kN
    R_laag,5 = 10^9 kN
    q_bmax,5 = 0 MPa
    R_bcal,5 = 0 kN
    R_scal,5 = 0 kN
    R_ccal,5 = 0 kN
    R_tcal,5 = 0 kN
    #show
#end if
#if n_s ≥ 6
    '<h6>Sondering 6</h6>
    #if richting ≡ 0
        q_cI,6 = ?*(MPa)', traject I<span class="kolom-3"></span>'
        q_cII,6 = ?*(MPa)', traject II<span class="kolom-3"></span>'
        q_cIII,6 = ?*(MPa)', traject III<span class="alleen-scherm">; avegaarpaal: gemiddelde van de omhullende vanaf ten hoogste 2 MPa</span><span class="kolom-3"></span>'
        #if paaltype ≡ 5 and q_cIII,6 > 2 MPa
            q_cIII,6 = 2 MPa', <b style="color:#b91c1c">avegaarpaal: traject III ten hoogste 2 MPa (7.6.2.3(e)); de omhullende kan lager uitkomen</b>'
        #end if
        q_bmax,6 = min(0.5*α_p*β*s_p*((q_cI,6 + q_cII,6)/2 + q_cIII,6); 15 MPa)', (7.6.2.3(e))'
        R_bcal,6 = A_b*q_bmax,6 to kN', puntdraagvermogen'
    #end if
    q_cs,6 = ?*(MPa)', gereduceerd en afgesnoten, over ΔL (7.6.2.3(i))<span class="kolom-2"></span>'
    ΔL_6 = ?*(m)', lengte met schachtwrijving (7.6.2.3(c))<span class="kolom-2"></span>'
    #if ΔL_6 > ΔL_max and ΔL_vv ≡ 1
        ΔL_6 = ΔL_max', <b style="color:#b91c1c">ingekort tot de lengte van de verbrede voet (7.6.2.3(c))</b>'
    #else if ΔL_6 > ΔL_max and ΔL_bm ≡ 1
        ΔL_6 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de bovenste meter (7.6.3.3(g))</b>'
    #else if ΔL_6 > ΔL_max and nk ≡ 1
        ΔL_6 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte onder de lagen met negatieve kleef</b>'
    #else if ΔL_6 > ΔL_max
        ΔL_6 = ΔL_max', <b style="color:#b91c1c">ingekort tot de paallengte</b>'
    #end if
    #if paaltype ≡ 13
        O_s,ΔL,6 = O_dl(ΔL_6) to m', gemiddelde omtrek over ΔL'
    #end if
    #if richting ≡ 1
        #if paaltype ≡ 13
            R_tcal,6 = O_s,ΔL,6*α_t*min(q_cs,6; 15 MPa)*ΔL_6 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #else
            R_tcal,6 = O_s,ΔL*α_t*min(q_cs,6; 15 MPa)*ΔL_6 to kN', schachtwrijving op trek, vóór ξ en γ (7.6.3.3(b))'
        #end if
        #hide
        R_telt,6 = R_tcal,6
        R_laag,6 = R_tcal,6
        #show
    #else
        #if paaltype ≡ 13
            #if ΔL_6 > L_h
                R_scal,6 = (α_s*(O_s + O_h)/2*L_h + α_s,o*O_o*(ΔL_6 - L_h))*min(q_cs,6; 15 MPa) to kN', schachtwrijving: langs het hout met α<sub>s</sub>, langs de opzetter met α<sub>s,o</sub>'
            #else
                R_scal,6 = O_s,ΔL,6*α_s*min(q_cs,6; 15 MPa)*ΔL_6 to kN', schachtwrijving'
            #end if
        #else
            R_scal,6 = O_s,ΔL*α_s*min(q_cs,6; 15 MPa)*ΔL_6 to kN', schachtwrijving'
        #end if
        #if paaltype ≡ 14
            R_prop,6 = min(O_i*α_s*min(q_cs,6; 15 MPa)*min(L_prop; ΔL_6); A_i*q_bmax,6) to kN', grondprop: wrijving op de binnenwand (7.6.2.3(d)), ten hoogste A_i·q_b;max: aanname aan de veilige kant'
            R_ccal,6 = R_bcal,6 + R_prop,6 + R_scal,6 to kN', maximumdraagkracht bij sondering 6'
        #else
            R_ccal,6 = R_bcal,6 + R_scal,6 to kN', maximumdraagkracht bij sondering 6'
        #end if
        #hide
        R_telt,6 = R_ccal,6
        R_laag,6 = R_ccal,6
        #show
    #end if
#else
    #hide
    R_telt,6 = 0 kN
    R_laag,6 = 10^9 kN
    q_bmax,6 = 0 MPa
    R_bcal,6 = 0 kN
    R_scal,6 = 0 kN
    R_ccal,6 = 0 kN
    R_tcal,6 = 0 kN
    #show
#end if

# 4. Karakteristieke waarde en rekenwaarde

#hide
ksi = [1; 2; 3; 4; 5; 6 |1.39; 1.32; 1.30; 1.28; 1.28; 1.275 |1.39; 1.32; 1.30; 1.03; 1.03; 1.02 |1.26; 1.20; 1.18; 1.17; 1.17; 1.16 |1.26; 0.96; 0.94; 0.93; 0.93; 0.925]
n_ξ = min(max(n_s; 1); 6)
R_ccal,gem = (R_telt,1 + R_telt,2 + R_telt,3 + R_telt,4 + R_telt,5 + R_telt,6)/n_s to kN
R_ccal,min = min(R_laag,1; R_laag,2; R_laag,3; R_laag,4; R_laag,5; R_laag,6) to kN
ξ_3 = hlookup(ksi; n_ξ; 1; if(stijf ≡ 1; 4; 2))
ξ_4 = hlookup(ksi; n_ξ; 1; if(stijf ≡ 1; 5; 3))
#show
#if richting ≡ 1
    #hide
    R_tcal,gem = R_ccal,gem
    R_tcal,min = R_ccal,min
    #show
    R_tcal,gem', gemiddelde (R_t;cal)_gem<span class="kolom-2"></span>'
    R_tcal,min', laagste (R_t;cal)_min<span class="kolom-2"></span>'
#else
    R_ccal,gem', gemiddelde (R_c;cal)_gem<span class="kolom-2"></span>'
    R_ccal,min', laagste (R_c;cal)_min<span class="kolom-2"></span>'
#end if
#if stijf ≡ 1
    ξ_3', tabel A.10b (stijf bouwwerk)<span class="kolom-2"></span>'
    ξ_4', tabel A.10b<span class="kolom-2"></span>'
#else
    ξ_3', tabel A.10a (niet-stijf bouwwerk)<span class="kolom-2"></span>'
    ξ_4', tabel A.10a<span class="kolom-2"></span>'
#end if
#if richting ≡ 1
    R_tk = min(R_tcal,gem/ξ_3; R_tcal,min/ξ_4) to kN', (7.17); ξ op q<sub>c</sub> geeft hetzelfde (7.6.3.3(4))'
#else
    R_ck = min(R_ccal,gem/ξ_3; R_ccal,min/ξ_4) to kN', (7.8)'
#end if
#if n_s ≥ 2
    #hide
    'Zonder weerstand (alle R = 0) is er geen spreiding te bepalen: VC = 0 in plaats van 0/0.
    VC = if(R_ccal,gem > 0 kN; 1; 0)*sqrt(((R_telt,1 - R_ccal,gem)^2 + if(n_s ≥ 2; (R_telt,2 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 3; (R_telt,3 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 4; (R_telt,4 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 5; (R_telt,5 - R_ccal,gem)^2; 0 kN^2) + if(n_s ≥ 6; (R_telt,6 - R_ccal,gem)^2; 0 kN^2))/(n_s - 1))/max(R_ccal,gem; 10^-9 kN)
    #show
    VC', variatiecoëfficiënt van de draagkracht'
    #if VC > 0.12
        '<b style="color:#b91c1c">De variatiecoëfficiënt is groter dan 12 %: de ξ-waarden van tabel A.10 gelden dan niet. Deel het terrein op in gebieden met gelijksoortige sonderingen.</b>
    #end if
#else
    #hide
    VC = 0
    #show
#end if
#if richting ≡ 1
    γ_st = 1.35', γ<sub>s;t</sub>, tabel A.6, A.7 of A.8: berekend uit sonderingen<span class="kolom-2"></span>'
    γ_var = ?', γ<sub>m;var;qc</sub> bij wisselende belasting (7.6.3.3(d), figuur 7.k)<span class="alleen-scherm">; 1,0 zonder wisseling, ten hoogste 1,5</span><span class="kolom-2"></span>'
    #hide
    γ_mvar = min(max(γ_var; 1); 1.5)
    #show
    #if γ_var < 1 or γ_var > 1.5
        γ_mvar', gerekend: ten minste 1,0 en ten hoogste 1,5'
    #end if
    #if trekgroep ≡ 1
        f_2 = ?', f<sub>2</sub>: afname van de korrelspanning in de groep (7.6.3.3(f))<span class="alleen-scherm">; f<sub>1</sub> = 1, geen verdichting in rekening</span><span class="kolom-2"></span>'
        R_tkluit,d = ?*(kN)', kluitgewicht zonder de paal (7.6.3.3(h))<span class="kolom-2"></span>'
        R_td = min(min(max(f_2; 0); 1)*R_tk/(γ_st*γ_mvar); R_tkluit,d) to kN', rekenwaarde van de trekweerstand, ten hoogste het kluitgewicht (7.6.3.3(g))'
    #else
        R_td = R_tk/(γ_st*γ_mvar) to kN', rekenwaarde van de trekweerstand (7.15)'
    #end if
    #hide
    R_d = R_td
    #show
#else
    γ_t = 1.2', tabel A.6, A.7 of A.8: berekend uit sonderingen<span class="kolom-2"></span>'
    R_cd = R_ck/γ_t to kN', rekenwaarde van de draagkracht<span class="kolom-2"></span>'
    #hide
    R_d = R_cd
    #show
#end if

#if richting ≡ 1
    # 5. Toetsing (7.12)
    F_t,d = ?*(kN)', rekenwaarde van de trekkracht op de paalkop'
    #hide
    uc_ok = if(F_t,d/R_td ≤ 1; 1; if(F_t,d/R_td > 1; 1; 0))
    #show
    #if uc_ok ≡ 1
        UC = F_t,d/R_td', F_t;d ≤ R_t;d'
    #else
        #hide
        UC = F_t,d/R_td
        #show
        '<b style="color:#b91c1c">UC niet te bepalen: de invoer is onvolledig.</b>
    #end if
    #hide
    F_d = F_t,d
    L_D = L_paal/D_eq
    tr_buiten = if(L_D < 13.5 or L_paal < 7 m or L_paal > 50 m; 1; 0)
    #show
    #if tr_buiten ≡ 1
        '<b style="color:#b91c1c">Buiten het toepassingsgebied van 7.6.3.3(a): L/D = 'L_D' en L = 'L_paal' m, terwijl L/D ≥ 13,5 en 7 m ≤ L ≤ 50 m vereist zijn.</b>
    #end if
    #if paaltype ≡ 16
        '<b style="color:#b91c1c">Tabel 7.c geeft voor een gepulste paal geen α<sub>t</sub>: de trekweerstand volgt dan uit proefbelastingen.</b>
    #end if
#else
    # 5. Toetsing (7.1)
    F_c,d = ?*(kN)', rekenwaarde van de belasting op de paalkop (inclusief K_FI)'
    #if nk ≡ 1
        '<span style="color:#b45309">Bij negatieve kleef vallen het eigen gewicht van de paal en de gronddruk op paalpuntniveau niet tegen elkaar weg (7.6.2.1(2)): neem G<sub>paal;d</sub> − σ′<sub>v;punt</sub>·A<sub>b</sub> op in F<sub>c;d</sub>.</span><span class="alleen-scherm"></span>
    #end if
    F_s,d = F_c,d + F_nk,d to kN', belasting inclusief negatieve kleef'
    #hide
    uc_ok = if(F_s,d/R_cd ≤ 1; 1; if(F_s,d/R_cd > 1; 1; 0))
    #show
    #if uc_ok ≡ 1
        UC = F_s,d/R_cd', F_c;d + F_nk;d ≤ R_c;d'
    #else
        #hide
        UC = F_s,d/R_cd
        #show
        '<b style="color:#b91c1c">UC niet te bepalen: de invoer is onvolledig.</b>
    #end if
    #hide
    F_d = F_s,d
    tr_buiten = 0
    #show
#end if

#hide
'Tekening. Verticaal: van het hoogste van paalkop en maaiveld tot 4·D_eq onder de paalpunt, plus marge.
z_top = max(z_kop; z_mv)
z_bot = z_punt - max(4*D_eq; 1 m) - 0.5 m
sch = 380/max((z_top - z_bot)/(1 m); 1)
Y(z) = 30 + (z_top - z)/(1 m)*sch
px = 250
pw = max(8; min(40; D_eq/(1 m)*sch*1.5))
#show
#if paaltype ≡ 13
    #hide
    pw_h = max(8; min(60; pw*D_hout/max(D; 1 mm)))
    pw_o = max(8; min(70; pw*D_opz/max(D; 1 mm)))
    #show
#end if
'<svg class="alleen-scherm" viewbox="0 0 480 440" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:450px;">
'  <!-- draagkrachtige laag -->
'  <rect x="60" y="'Y(z_draag)'" width="360" height="'Y(z_bot) - Y(z_draag)'" style="fill:#fde68a; stroke:none; opacity:0.55"/>
'  <text x="66" y="'Y(z_draag) + 14'" style="fill:#92400e">draagkrachtige laag</text>
#if nk ≡ 1
    '  <!-- lagen met negatieve kleef -->
    '  <rect x="60" y="'Y(z_mv)'" width="360" height="'Y(z_draag) - Y(z_mv)'" style="fill:#d6c7a1; stroke:none; opacity:0.55"/>
    '  <text x="66" y="'Y(z_mv) + 14'" style="fill:#6b4f1d">samendrukbare lagen</text>
    '  <line x1="60" y1="'Y(z_mv)'" x2="420" y2="'Y(z_mv)'" style="stroke:#374151; stroke-width:1.4"/>
    '  <text x="424" y="'Y(z_mv) + 4'" style="fill:#374151">NAP 'z_mv'</text>
    '  <line x1="60" y1="'Y(z_mv - d_gw)'" x2="160" y2="'Y(z_mv - d_gw)'" style="stroke:#2563eb; stroke-width:1; stroke-dasharray:5 3"/>
    '  <text x="66" y="'Y(z_mv - d_gw) - 3'" style="fill:#2563eb">grondwater</text>
    #if richting ≡ 0
        '  <line x1="'px - pw/2 - 14'" y1="'Y(z_mv) + 12'" x2="'px - pw/2 - 14'" y2="'Y(z_draag) - 6'" style="stroke:#b91c1c; stroke-width:1.6"/>
        '  <polygon points="'px - pw/2 - 14','Y(z_draag) - 2' 'px - pw/2 - 18','Y(z_draag) - 10' 'px - pw/2 - 10','Y(z_draag) - 10'" style="fill:#b91c1c"/>
        '  <text x="'px - pw/2 - 20'" y="'(Y(z_mv) + Y(z_draag))/2'" text-anchor="end" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">nk;d</tspan> = 'F_nk,d' kN</text>
    #end if
#end if
'  <line x1="60" y1="'Y(z_draag)'" x2="420" y2="'Y(z_draag)'" style="stroke:#92400e; stroke-width:1"/>
#if richting ≡ 0
    '  <!-- trajecten I, II en III rond de paalpunt -->
    '  <rect x="'px - pw/2 - 30'" y="'Y(z_punt)'" width="'pw + 60'" height="'Y(z_punt - 4*D_eq) - Y(z_punt)'" style="fill:#fca5a5; opacity:0.35; stroke:#b91c1c; stroke-width:0.6; stroke-dasharray:3 2"/>
    '  <rect x="'px - pw/2 - 30'" y="'Y(z_punt + 8*D_eq)'" width="'pw + 60'" height="'Y(z_punt) - Y(z_punt + 8*D_eq)'" style="fill:#93c5fd; opacity:0.30; stroke:#2563eb; stroke-width:0.6; stroke-dasharray:3 2"/>
    '  <text x="'px + pw/2 + 34'" y="'(Y(z_punt) + Y(z_punt - 4*D_eq))/2 + 4'" style="fill:#b91c1c">I en II: tot 4·D<tspan baseline-shift="sub" font-size="8">eq</tspan> eronder</text>
    '  <text x="'px + pw/2 + 34'" y="'(Y(z_punt) + Y(z_punt + 8*D_eq))/2 + 4'" style="fill:#2563eb">III: 8·D<tspan baseline-shift="sub" font-size="8">eq</tspan> erboven</text>
#end if
'  <!-- de paal -->
#if paaltype ≡ 13
    '  <polygon points="'px - pw_h/2','Y(z_kop - L_opz)' 'px + pw_h/2','Y(z_kop - L_opz)' 'px + pw/2','Y(z_punt)' 'px - pw/2','Y(z_punt)'" style="fill:#e7d3a8; stroke:#334155; stroke-width:1.4"/>
    #if L_opz > 0 m
        '  <rect x="'px - pw_o/2'" y="'Y(z_kop)'" width="'pw_o'" height="'Y(z_kop - L_opz) - Y(z_kop)'" style="fill:#cbd5e1; stroke:#334155; stroke-width:1.4"/>
    #end if
#else
    '  <rect x="'px - pw/2'" y="'Y(z_kop)'" width="'pw'" height="'Y(z_punt) - Y(z_kop)'" style="fill:#cbd5e1; stroke:#334155; stroke-width:1.4"/>
#end if
'  <text x="'px - pw/2 - 6'" y="'Y(z_kop) + 4'" text-anchor="end" style="fill:#334155">NAP 'z_kop'</text>
'  <text x="'px - pw/2 - 6'" y="'Y(z_punt) + 4'" text-anchor="end" style="fill:#334155; font-weight:700">NAP 'z_punt'</text>
#if richting ≡ 1
    '  <!-- trekkracht op de paalkop -->
    '  <line x1="'px'" y1="'Y(z_kop) - 4'" x2="'px'" y2="'Y(z_kop) - 22'" style="stroke:#b91c1c; stroke-width:2.6"/>
    '  <polygon points="'px','Y(z_kop) - 30' 'px - 5','Y(z_kop) - 20' 'px + 5','Y(z_kop) - 20'" style="fill:#b91c1c"/>
    '  <text x="'px + 8'" y="'Y(z_kop) - 16'" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">t;d</tspan> = 'F_t,d' kN</text>
    '  <!-- trekweerstand langs de schacht -->
    '  <text x="'px + pw/2 + 10'" y="'Y(z_punt) - 8'" style="fill:#047857; font-weight:700">R<tspan baseline-shift="sub" font-size="8">t;d</tspan> = 'R_td' kN</text>
#else
    '  <!-- belasting op de paalkop -->
    '  <line x1="'px'" y1="'Y(z_kop) - 26'" x2="'px'" y2="'Y(z_kop) - 7'" style="stroke:#b91c1c; stroke-width:2.6"/>
    '  <polygon points="'px','Y(z_kop) - 1' 'px - 5','Y(z_kop) - 11' 'px + 5','Y(z_kop) - 11'" style="fill:#b91c1c"/>
    '  <text x="'px + 8'" y="'Y(z_kop) - 16'" style="fill:#b91c1c; font-weight:700">F<tspan baseline-shift="sub" font-size="8">c;d</tspan> = 'F_c,d' kN</text>
    '  <!-- draagkracht onder de punt -->
    '  <line x1="'px'" y1="'Y(z_punt) + 30'" x2="'px'" y2="'Y(z_punt) + 7'" style="stroke:#047857; stroke-width:2.6"/>
    '  <polygon points="'px','Y(z_punt) + 1' 'px - 5','Y(z_punt) + 11' 'px + 5','Y(z_punt) + 11'" style="fill:#047857"/>
    '  <text x="'px + 8'" y="'Y(z_punt) + 30'" style="fill:#047857; font-weight:700">R<tspan baseline-shift="sub" font-size="8">c;d</tspan> = 'R_cd' kN</text>
#end if
'</svg>'

#if geheid ≡ 1 and richting ≡ 0
    @select kal "Kalendercontrole bij het heien (indicatief)"
      Niet = 0
      Wel: benodigde zakking per slag uit het heiblok = 1
    @end
#else
    #hide
    kal = 0
    #show
#end if
#if kal ≡ 1
    # 6. Kalendercontrole (indicatief)
    '<i>Energievergelijking van Hiley: R·(s + c/2) = η·G·h·ε, met ε het rendement van de klap volgens de stoottheorie van Newton. Met R = (R<sub>c;cal</sub>)<sub>min</sub> volgt de grootste blijvende zakking per klap die bij die draagkracht past, en daaruit het kleinste aantal slagen per 0,25 m indringing: de laatste 0,25 m wordt per paal geregistreerd (7.9(4)).</i><span class="alleen-scherm"></span>
    G_blok = ?*(kN)', gewicht van het valblok<span class="kolom-3"></span>'
    h_val = ?*(m)', valhoogte of slag<span class="kolom-3"></span>'
    η_h = ?', rendement van het heiblok<span class="alleen-scherm">: opgave van het blok; gangbaar 0,7 (valblok, dieselblok) tot 0,95 (hydraulisch)</span><span class="kolom-3"></span>'
    G_paal = ?*(kN)', gewicht van de paal met heimuts<span class="kolom-3"></span>'
    e_r = ?', restitutiecoëfficiënt van de klap<span class="alleen-scherm">: 0 tot 0,5; lager is veiliger, 0,25 bij een houten of kunststof heimuts op beton</span><span class="kolom-3"></span>'
    c_el = ?*(mm)', tijdelijke samendrukking per klap<span class="alleen-scherm"> van paal, grond en heimuts; bij voorkeur gemeten als quasi-elastische paalkopzakking</span><span class="kolom-3"></span>'
    E_n = η_h*G_blok*h_val to kN*m', energie per klap<span class="kolom-2"></span>'
    #if G_blok < e_r*G_paal
        ε_k = (G_blok + e_r^2*G_paal)/(G_blok + G_paal) - ((G_blok - e_r*G_paal)/(G_blok + G_paal))^2', rendement van de klap; het valblok kaatst terug'
    #else
        ε_k = (G_blok + e_r^2*G_paal)/(G_blok + G_paal)', rendement van de klap<span class="kolom-2"></span>'
    #end if
    R_kal = R_ccal,min to kN', te mobiliseren: de laagste maximumdraagkracht<span class="kolom-2"></span>'
    s_max = E_n*ε_k/R_kal - c_el/2 to mm', grootste blijvende zakking per klap<span class="kolom-2"></span>'
    #if c_el ≤ 0 mm
        '<b style="color:#b91c1c">Zonder tijdelijke samendrukking geeft de formule een te grote toelaatbare zakking: vul c in.</b>
    #end if
    #if s_max > 0 mm
        n_kal = ceil(0.25 m/s_max)', ten minste zoveel slagen per 0,25 m indringing<span class="kolom-2"></span>'
        s_10 = 10*s_max to mm', ten hoogste zoveel zakking per 10 slagen<span class="kolom-2"></span>'
        n_25 = ?', gemeten aantal slagen over de laatste 0,25 m<span class="alleen-scherm">; 0 zolang de paal niet geheid is</span>'
        #if n_25 > 0
            R_dyn = E_n*ε_k/(0.25 m/n_25 + c_el/2) to kN', draagkracht volgens de energievergelijking bij de gemeten kalender'
            #if n_25 ≥ n_kal
                '<b style="color:#047857">De gemeten kalender haalt het benodigde aantal slagen (indicatief).</b>
            #else
                '<b style="color:#b91c1c">De gemeten kalender blijft onder het benodigde aantal slagen: beoordeel de draagkracht van deze paal nader, bijvoorbeeld met een sondering naast de paal (7.6.2.3(b)).</b>
            #end if
        #end if
    #else
        '<b style="color:#b91c1c">Het heiblok is te licht: ook zonder blijvende zakking haalt de energievergelijking (R<sub>c;cal</sub>)<sub>min</sub> niet. Kies een zwaarder blok of een grotere valhoogte.</b>
    #end if
    '<i>Indicatief: de energievergelijking geeft de totale weerstand tijdens het heien, ook die van de lagen boven ΔL, en een heiformule toont de draagkracht niet aan. Daarvoor moet ze zijn bevestigd met statische proefbelastingen (7.6.2.5(2)), met ξ<sub>5</sub> en ξ<sub>6</sub> uit tabel A.11 en een modelfactor 1,10 of 1,20; stel de kalender vast met een heiproef op ten minste vijf palen (7.6.2.5(4)).</i>
#end if

#if kal ≡ 1
    # 7. Samenvatting
#else
    # 6. Samenvatting
#end if

'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Grootheid</th><th style="text-align:right; padding:4px 8px;">Waarde</th></tr>
#if richting ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Schachtwrijving op trek, gemiddeld en laagst</td><td style="padding:4px 8px; text-align:right;">'R_tcal,gem' / 'R_tcal,min' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Karakteristiek R<sub>t;k</sub> (ξ<sub>3</sub> = 'ξ_3', ξ<sub>4</sub> = 'ξ_4')</td><td style="padding:4px 8px; text-align:right;">'R_tk' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Rekenwaarde R<sub>t;d</sub> (γ<sub>s;t</sub> = 'γ_st', γ<sub>m;var;qc</sub> = 'γ_mvar')</td><td style="padding:4px 8px; text-align:right;">'R_td' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trekkracht F<sub>t;d</sub></td><td style="padding:4px 8px; text-align:right;">'F_t,d' kN</td></tr>
#else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Maximumdraagkracht, gemiddeld en laagst</td><td style="padding:4px 8px; text-align:right;">'R_ccal,gem' / 'R_ccal,min' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Karakteristiek R<sub>c;k</sub> (ξ<sub>3</sub> = 'ξ_3', ξ<sub>4</sub> = 'ξ_4')</td><td style="padding:4px 8px; text-align:right;">'R_ck' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Rekenwaarde R<sub>c;d</sub> (γ<sub>t</sub> = 'γ_t')</td><td style="padding:4px 8px; text-align:right;">'R_cd' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Belasting F<sub>c;d</sub> + F<sub>nk;d</sub></td><td style="padding:4px 8px; text-align:right;">'F_c,d' + 'F_nk,d' = 'F_s,d' kN</td></tr>
#end if
#if kal ≡ 1
    #if s_max > 0 mm
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kalender, indicatief (G = 'G_blok' kN, h = 'h_val' m)</td><td style="padding:4px 8px; text-align:right;">ten minste 'n_kal' slagen per 0,25 m</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kalender, indicatief</td><td style="padding:4px 8px; text-align:right;">heiblok te licht</td></tr>
    #end if
#end if
'</table>

#if richting ≡ 1
    #if uc_ok ≡ 0
        '<b>Maatgevende UC niet te bepalen</b><span style="color: red"> → <b>niet aangetoond: invoer onvolledig</b></span>
    #else if paaltype ≡ 16
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: tabel 7.c geeft voor een gepulste paal geen α<sub>t</sub></b></span>
    #else if UC > 1.0
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> > 1,0 → <b>de paal voldoet niet op trek</b></span>
    #else if VC > 0.12
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de variatiecoëfficiënt is groter dan 12 % → <b>niet aangetoond: deel het terrein op</b></span>
    #else if tr_buiten ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de paal valt buiten het toepassingsgebied van 7.6.3.3(a) → <b>niet aangetoond</b></span>
    #else if vp_fout ≡ 1 or mp_fout ≡ 1 or tp_fout ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de paal valt buiten de grenzen van tabel 7.c of de maten zijn onvolledig → <b>niet aangetoond</b></span>
    #else if schacht ≡ 1 and O_s,ΔL ≤ 0 m
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: omtrek van de schacht niet ingevuld</b></span>
    #else if UC ≤ 1.0
        '<b>Maatgevende UC = 'UC'</b><span style="color: green"> ≤ 1,0 → <b>trekweerstand (7.12) voldoet</b></span>; paalgroep als geheel (7.6.3.1(4)) niet getoetst
    #else
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: invoer onvolledig</b></span>
    #end if
#else
    #if uc_ok ≡ 0
        '<b>Maatgevende UC niet te bepalen</b><span style="color: red"> → <b>niet aangetoond: invoer onvolledig</b></span>
    #else if UC > 1.0
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> > 1,0 → <b>de paal voldoet niet</b></span>
    #else if VC > 0.12
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de variatiecoëfficiënt is groter dan 12 % → <b>niet aangetoond: deel het terrein op</b></span>
    #else if paaltype ≡ 8 and vorm ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de volle doorsnede van de open buis veronderstelt een grondprop → <b>niet aangetoond</b></span>
    #else if paaltype ≡ 12 and schacht ≡ 0 and nk ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de negatieve kleef op een tapse paal rekent met de omtrek van de punt → <b>niet aangetoond</b></span>
    #else if schacht ≡ 1 and min(O_s,ΔL; O_s,gem) ≤ 0 m
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: omtrek van de schacht niet ingevuld</b></span>
    #else if vp_fout ≡ 1 or mp_fout ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> ≤ 1,0, maar de paal valt buiten de grenzen van tabel 7.c → <b>niet aangetoond</b></span>
    #else if tp_fout ≡ 1
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: maten van de tapse paal onvolledig</b></span>
    #else if paaltype ≡ 14 and (t_w ≤ 0 mm or D_i ≤ 0 mm)
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: wanddikte van de open buis niet ingevuld of te groot</b></span>
    #else if UC ≤ 1.0
        '<b>Maatgevende UC = 'UC'</b><span style="color: green"> ≤ 1,0 → <b>draagvermogen (7.1) voldoet</b></span>; zakking (7.6.4) niet getoetst
    #else
        '<b>Maatgevende UC = 'UC'</b><span style="color: red"> → <b>niet aangetoond: invoer onvolledig</b></span>
    #end if
#end if

'<hr/>
#if richting ≡ 1
    '<i class="ook-afdruk">Niet getoetst: het omhoogkomen van de paalgroep met de grond (7.6.3.1(4), 2.4.7.4), cyclische belasting (7.6.3.1(9)), sterkte van de paal en de verbinding. Niet opgenomen: schachtwrijving in klei en leem (tabel 7.d, 0,5·α<sub>t</sub>), het eigen gewicht van de paal (7.6.3.3(h)), de correcties op q<sub>c</sub> (7.6.2.3(i) t/m (l)): die zitten in de invoer.</i>
#else
    '<i class="ook-afdruk">Niet getoetst: zakking (7.6.4) en rotatie (2.4.9), ponsen onder de punt (7.6.2.1(11)), sterkte van de paal. Niet opgenomen: schachtwrijving in klei en veen (tabel 7.d), negatieve kleef in een paalgroep (7.3.2.2(e)), de correcties op q<sub>c</sub> (7.6.2.3(i) t/m (l)): die zitten in de invoer.</i>
#end if
`;
