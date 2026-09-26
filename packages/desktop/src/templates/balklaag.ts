/**
 * Balklaag — houten vloerbalken volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking voor de enkelvoudige ligger: permanente
 * en veranderlijke lijnlast en een geconcentreerde last met concentratiefactor
 * k_r, BGT-doorbuiging (w_fin met kruip k_def) en UGT (buiging §6.1.6 +
 * afschuiving §6.1.7). Verder toetst het blad de bijkomende doorbuiging, de
 * trillingen (§7.3.3), de oplegdruk (§6.1.5), kip bij het steunmoment (§6.3.3)
 * en de combinatie met alleen permanente last (k_mod blijvend, §3.1.3(2)), en
 * meldt het trek in een eindoplegging. Daarnaast een overstek, twee velden en
 * een raveelbalk: vijf belastinggevallen (de veranderlijke last per veld apart,
 * zodat bij twee velden de schaakbordbelasting meedoet), de UGT- en
 * BGT-combinaties in een tabel en de omhullende M- en V-lijn. De soort ligger
 * is een balk in een balklaag of een onderslag met een belaste breedte; het
 * profiel komt uit de lijst of is zelf in te vullen.
 *
 * Eigengewicht balk: A · ρ_mean · g volgens EN 1991-1-1 / EN 338 (ρ_mean per
 * sterkteklasse). De referentie-uitwerking rekent met een vaste 550 kg/m³ én g = 10 m/s²;
 * hier de correcte ρ_mean (C24 = 420 kg/m³) met g = 9,81. Zie punt 8 in
 * docs/afwijkingen-referentie.md.
 *
 * Gecalibreerd op document1 t/m document9 — zie scripts/check-balklaag.mjs.
 * Belastinggevallen en combinaties: scripts/check-balklaag-schema3.mjs. De
 * toetsen buiten de referentiebladen: scripts/check-balklaag-toetsen.mjs.
 *
 * Op papier is het blad beknopter dan op het scherm (PrintDocument.css): uitleg
 * en de tekeningen die het beeld al toont dragen `alleen-scherm`, korte regels
 * een merkteken `kolom-2`, `kolom-3` of `kolom-4`, en waar een formule op
 * papier te breed is staat daar de kale waarde met `alleen-afdruk`. De knopen
 * blijven gelijk; wat het beeld en de controles lezen, verandert niet.
 */

export const balklaag = `"Balklaag — houten vloerbalken volgens EN 1995-1-1

'<i>Toetsing van een houten vloerbalk of onderslag: enkelvoudig, met een overstek, op drie steunpunten of als raveelbalk, belast door een permanente en een veranderlijke vloerbelasting en een geconcentreerde last. UGT-buiging, afschuiving, oplegdruk en kip, BGT-doorbuiging met kruip en de trillingstoets.</i><span class="alleen-scherm"></span>
# 1. Profiel, materiaal en doorsnede

@select profiel "Profiel (b×h)"
  46×96 = 1
  46×146 = 2
  46×171 = 3
  46×196 = 4
  63×146 = 5
  63×171 = 6
  63×196 = 7
  63×221 = 8
  71×146 = 9
  71×171 = 10
  71×196 = 11
  71×221 = 12
  71×246 = 13
  71×271 = 14
  96×171 = 15
  96×196 = 16
  96×221 = 17
  96×246 = 18
  96×271 = 19
  SLS 38×89 = 20
  SLS 38×140 = 21
  SLS 38×184 = 22
  SLS 38×235 = 23
  SLS 38×285 = 24
  SLS dubbel 76×184 = 25
  SLS dubbel 76×235 = 26
  SLS dubbel 76×285 = 27
  Zelf invullen = 28
@end

#if profiel ≡ 28
    b_zelf = ?*(mm)', breedte<span class="kolom-3"></span>'
    h_zelf = ?*(mm)', hoogte<span class="kolom-3"></span>'
#else
    '<i>Staat de maat niet in de lijst, kies dan "Zelf invullen" en geef de breedte en de hoogte op; zo zijn ook maten als 60×205, 63×211, 90×230 en 200×200 te rekenen.</i><span class="alleen-scherm"></span>
    #hide
    b_zelf = 0 mm
    h_zelf = 0 mm
    #show
#end if

@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
  GL24h = 4
  GL28h = 5
@end

@select klimaat "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

@select duurklasse "Belastingsduurklasse (maatgevend variabel)"
  Kort = 1
  Middellang = 2
  Lang = 3
  Blijvend = 4
@end

#hide
'Profielmatrix: [id | b(mm) | h(mm)]
'Regels 20 t/m 27 zijn SLS-maten: geschaafd naaldhout in de Noord-Amerikaanse
'maatvoering (38 mm dik), zoals dat in de houtskeletbouw wordt geleverd. De
'dubbele varianten zijn twee stuks tegen elkaar.
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |46; 46; 46; 46; 63; 63; 63; 63; 71; 71; 71; 71; 71; 71; 96; 96; 96; 96; 96; 38; 38; 38; 38; 38; 76; 76; 76 |96; 146; 171; 196; 146; 171; 196; 221; 146; 171; 196; 221; 246; 271; 171; 196; 221; 246; 271; 89; 140; 184; 235; 285; 184; 235; 285]
'Materiaalmatrix: [id | f_m,k | f_v,k | E_mean | ρ_mean | γ_M | f_c,90,k | E_0,05]
'EN 338 voor C18 t/m C30, EN 14080 voor GL24h en GL28h.
materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |9000; 11000; 12000; 11500; 12600 |380; 420; 460; 420; 460 |1.30; 1.30; 1.30; 1.25; 1.25 |2.2; 2.5; 2.7; 2.5; 2.5 |6000; 7400; 8000; 9600; 10500]

'Keuze 28 is "Zelf invullen": dan komen b en h uit de invoer.
b_balk = if(profiel ≡ 28; b_zelf; hlookup(profielen; profiel; 1; 2)*mm)
h_balk = if(profiel ≡ 28; h_zelf; hlookup(profielen; profiel; 1; 3)*mm)
f_m,k = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_v,k = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
ρ_mean = hlookup(materialen; sterkteklasse; 1; 5)*kg/m^3
γ_M = hlookup(materialen; sterkteklasse; 1; 6)
f_c,90,k = hlookup(materialen; sterkteklasse; 1; 7)*N/mm^2
E_0,05 = hlookup(materialen; sterkteklasse; 1; 8)*N/mm^2
'k_mod (EN 1995-1-1 Tabel 3.1) — klimaatklasse 1 en 2 gelijk, klasse 3 lager:
k_mod_12 = if(duurklasse ≡ 1; 0.90; if(duurklasse ≡ 2; 0.80; if(duurklasse ≡ 3; 0.70; 0.60)))
k_mod_3 = if(duurklasse ≡ 1; 0.70; if(duurklasse ≡ 2; 0.65; if(duurklasse ≡ 3; 0.55; 0.50)))
k_mod = if(klimaat ≡ 3; k_mod_3; k_mod_12)
'De combinatie met alleen de permanente last hoort bij de duurklasse blijvend
'(§3.1.3(2)): k_mod van de kortst durende last in de combinatie. Bij
'belastingcategorie H, sneeuw en wind is ψ_0 = 0 en is 6.10a alleen γ_G,a·G.
k_mod,G = if(klimaat ≡ 3; 0.50; 0.60)
k_def = if(klimaat ≡ 1; 0.60; if(klimaat ≡ 2; 0.80; 2.00))
'Hoogtefactor k_h op f_m,k — massief §3.2(3) bij h < 150 mm, gelijmd gelamineerd
'§3.3(3) bij h < 600 mm. Op 71×221 is k_h = 1 voor massief en 1,10 voor GL.
h_ruw = h_balk/(1 mm)', balkhoogte als kaal getal in mm'
gelijmd = if(sterkteklasse ≡ 4; 1; if(sterkteklasse ≡ 5; 1; 0))
k_h_massief = if(h_ruw < 150; min(1.3; (150/h_ruw)^0.2); 1)
k_h_gelijmd = if(h_ruw < 600; min(1.1; (600/h_ruw)^0.1); 1)
k_h = if(gelijmd ≡ 1; k_h_gelijmd; k_h_massief)
f_m,k_eff = k_h*f_m,k', karakteristieke buigsterkte incl. hoogtefactor'
#show

'<h6>Gekozen profiel en materiaal<span class="alleen-scherm"></span></h6>
b_balk'<span class="alleen-scherm"></span>'
h_balk'<span class="alleen-scherm"></span>'
f_m,k'<span class="kolom-4"></span>'
f_v,k'<span class="kolom-4"></span>'
E_mean'<span class="kolom-4"></span>'
ρ_mean'<span class="kolom-4"></span>'
γ_M'<span class="alleen-scherm"></span>'
k_mod', Tabel 3.1<span class="kolom-4"></span>'
k_def', Tabel 3.2<span class="kolom-4"></span>'
k_h'<span class="kolom-4"></span>'
f_m,k_eff'<span class="kolom-4"></span>'

f_m,d = k_mod*f_m,k_eff/γ_M'<span class="kolom-2"></span>'
f_v,d = k_mod*f_v,k/γ_M'<span class="kolom-2"></span>'

A = b_balk*h_balk'<span class="alleen-scherm"></span>'
I_y = b_balk*h_balk^3/12', traagheidsmoment<span class="alleen-scherm"></span>'
W_y = b_balk*h_balk^2/6', weerstandsmoment<span class="alleen-scherm"></span>'
S_y = b_balk*h_balk^2/8', statisch moment (NL) voor afschuiving<span class="alleen-scherm"></span>'
A', b·h<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
I_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
W_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
S_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'

#hide
ρ_ref = 550 kg/m^3
g_ref = 10 m/s^2
g_nb = 9.81 m/s^2
g_balk_ref = A*ρ_ref*g_ref to kN/m
g_balk_nb = A*ρ_mean*g_nb to kN/m
g_balk = if(rekenwijze ≡ 1; g_balk_ref; g_balk_nb)
#show
#if rekenwijze ≡ 1
    g_balk', eigen gewicht, A · 550 kg/m³ · 10 m/s²'
#else
    g_balk', eigen gewicht, A · ρ<sub>mean</sub> · 9,81 m/s² (EN 338)'
#end if


# 2. Geometrie en statisch schema

@select schema "Statisch schema"
  Enkelvoudige ligger op twee steunpunten = 1
  Ligger met overstek aan één zijde = 2
  Ligger op drie steunpunten (twee velden) = 3
  Raveelbalk langs een sparing = 4
@end

@select ligger "Soort ligger"
  Balk in een balklaag = 1
  Onderslag (belaste breedte) = 2
@end

#hide
'Een onderslag: soort ligger 2, behalve bij een raveelbalk — die houdt zijn
'belaste breedte l_staart/2, ook als de soort op "Onderslag" staat.
ond = bool(ligger ≡ 2)*(1 - bool(schema ≡ 4))
'Draagt de ligger andere balken: een onderslag, of een raveelbalk met de
'onderbroken balken?
draagt = ond + bool(schema ≡ 4)
'Heeft de ligger een tweede deel: veld 2 of een overstek?
s2 = bool(schema ≡ 2)
s3 = bool(schema ≡ 3)
s23 = s2 + s3
#show

'<i>Alleen de maten van het gekozen schema staan hieronder; de andere blijven buiten beschouwing.</i><span class="alleen-scherm"></span>
'<span class="alleen-afdruk"></span>
#if schema ≡ 4
    b_sparing = ?*(mm)', breedte sparing<span class="alleen-scherm"> = overspanning van de raveelbalk</span><span class="kolom-3"></span>'
    l_staart = ?*(mm)', staartlengte<span class="alleen-scherm"> van de onderbroken balken</span><span class="kolom-3"></span>'
    #hide
    L_d = 0 mm
    #show
#else
    L_d = ?*(mm)', dagmaat<span class="alleen-scherm"> (vrije overspanning); bij twee velden die van het eerste veld</span><span class="kolom-3"></span>'
    #hide
    b_sparing = 0 mm
    l_staart = 0 mm
    #show
#end if
a_opl = ?*(mm)', opleglengte<span class="alleen-scherm"> per zijde</span><span class="kolom-3"></span>'
#if schema ≡ 2
    a_over = ?*(mm)', overstek<span class="kolom-3"></span>'
#else
    #hide
    a_over = 0 mm
    #show
#end if
#if schema ≡ 3
    L_veld2 = ?*(mm)', veld 2<span class="alleen-scherm">, theoretisch (hart op hart steunpunten)</span><span class="kolom-3"></span>'
#else
    #hide
    L_veld2 = 0 mm
    #show
#end if
hoh = ?*(mm)', h.o.h. balken<span class="kolom-3"></span>'
t_vloer = ?*(mm)', dikte beschot<span class="kolom-3"></span>'
E_beschot = ?*(N/mm^2)', beschot<span class="alleen-scherm"> (E<sub>0,ser,rep</sub>)</span><span class="kolom-3"></span>'
#if ond ≡ 1
    b_ond = ?*(m)', belaste breedte onderslag<span class="kolom-3"></span>'
    '<i>Een onderslag draagt een strook vloer in plaats van één balk: bij balken die over twee gelijke velden doorlopen 1,25 × L, bij losse balken aan weerszijden de som van de halve overspanningen. k<sub>r</sub> is dan 1,0 en de trillingstoets hoort bij de balklaag zelf. Het eigen gewicht van de balken die op de onderslag liggen komt in g<sub>bl</sub> (§3).</i><span class="alleen-scherm"></span>
#else
    #hide
    b_ond = 0 m
    #show
#end if

#if schema ≡ 4
    L_th = b_sparing + a_opl', theoretische overspanning, sparing plus opleglengte'
#else
    L_th = L_d + a_opl', theoretische overspanning'
#end if

#hide
'Lengtes in m, verdeelde lasten in kN/m en puntlasten in kN, als kaal getal:
'momenten komen dan in kNm en dwarskrachten in kN. Ondergrens op het eerste
'veld: bij het allereerste renderen staan de invoervelden nog op nul, en zonder
'ondergrens deelt alles hieronder door nul.
r_L1 = max(L_th/(1 m); 0.001)', eerste veld'
r_a = if(schema ≡ 2; a_over/(1 m); 0)', overstek'
r_L2 = if(schema ≡ 3; L_veld2/(1 m); 0)', tweede veld'
r_tot = r_L1 + r_a + r_L2', totale lengte'
EI_n = max(E_mean*I_y/(1 kN*m^2); 0.001)', buigstijfheid in kNm²'

'Steunmoment M_B, positief bij trek aan de bovenzijde.
Mb(w1; w2; P1; P2) = if(schema ≡ 3; (w1*r_L1^3 + w2*r_L2^3)/(8*(r_L1 + r_L2)) + 3*(P1*r_L1^2 + P2*r_L2^2)/(16*(r_L1 + r_L2)); if(schema ≡ 2; w2*r_a^2/2 + P2*r_a; 0))
'Oplegreactie aan het begin van veld 1 en aan het eind van veld 2.
Ra(w1; P1; Ms) = w1*r_L1/2 + P1/2 - Ms/r_L1
Rc(w2; P2; Ms) = if(r_L2 > 0; w2*r_L2/2 + P2/2 - Ms/max(r_L2; 0.001); 0)
'Moment en dwarskracht in veld 1 op afstand x van de eerste oplegging, en op
'het tweede deel op afstand t van het uiteinde.
m1(x; w1; P1; Ms) = Ra(w1; P1; Ms)*x - w1*x^2/2 - P1*max(0; x - r_L1/2)
v1(x; w1; P1; Ms) = Ra(w1; P1; Ms) - w1*x - P1*bool(x > r_L1/2)
m2(t; w2; P2; Ms) = if(r_a > 0; -w2*t^2/2 - P2*t; Rc(w2; P2; Ms)*t - w2*t^2/2 - P2*max(0; t - r_L2/2))
v2(t; w2; P2; Ms) = if(r_a > 0; w2*t + P2; w2*t + P2*bool(t > r_L2/2) - Rc(w2; P2; Ms))
'Idem op afstand x van het begin van de ligger.
Mx(x; w1; w2; P1; P2; Ms) = if(x ≤ r_L1; m1(x; w1; P1; Ms); m2(r_tot - x; w2; P2; Ms))
Vx(x; w1; w2; P1; P2; Ms) = if(x ≤ r_L1; v1(x; w1; P1; Ms); v2(r_tot - x; w2; P2; Ms))

'Grootste veldmoment. De top ligt waar de dwarskracht nul wordt: links of
'rechts van de puntlast in het midden, of zonder verdeelde last onder de
'puntlast zelf. Negatief telt als nul — dan heeft het veld geen veldmoment.
xt(R; w; lo; hi; c) = if(w > 0; min(max(R/w; lo); hi); c)
x1a(w1; P1; Ms) = xt(Ra(w1; P1; Ms); w1; 0; r_L1/2; r_L1/2)
x1b(w1; P1; Ms) = xt(Ra(w1; P1; Ms) - P1; w1; r_L1/2; r_L1; r_L1/2)
x1t(w1; P1; Ms) = if(m1(x1a(w1; P1; Ms); w1; P1; Ms) ≥ m1(x1b(w1; P1; Ms); w1; P1; Ms); x1a(w1; P1; Ms); x1b(w1; P1; Ms))
Mv1(w1; P1; Ms) = max(0; m1(x1t(w1; P1; Ms); w1; P1; Ms))
t2a(w2; P2; Ms) = xt(Rc(w2; P2; Ms); w2; 0; r_L2/2; r_L2/2)
t2b(w2; P2; Ms) = xt(Rc(w2; P2; Ms) - P2; w2; r_L2/2; r_L2; r_L2/2)
t2t(w2; P2; Ms) = if(m2(t2a(w2; P2; Ms); w2; P2; Ms) ≥ m2(t2b(w2; P2; Ms); w2; P2; Ms); t2a(w2; P2; Ms); t2b(w2; P2; Ms))
Mv2(w2; P2; Ms) = if(r_L2 > 0; max(0; m2(t2t(w2; P2; Ms); w2; P2; Ms)); 0)
'Grootste dwarskracht: de lijn daalt binnen elk veld, dus de uitersten liggen
'aan de randen van de velden.
Vmx(w1; w2; P1; P2; Ms) = max(abs(v1(0; w1; P1; Ms)); abs(v1(r_L1; w1; P1; Ms)); abs(v2(r_tot - r_L1; w2; P2; Ms)); abs(v2(0; w2; P2; Ms)))

'Zakking van een veld met lengte L onder een verdeelde last w, een puntlast P
'in het midden en een inklemmend moment aan het eind; t gemeten vanaf de
'scharnierende oplegging.
upd(t; L) = if(t ≤ L/2; t*(3*L^2 - 4*t^2)/48; (L - t)*(3*L^2 - 4*(L - t)^2)/48)
uvd(t; L; w; P; Ms) = w*t*(L^3 - 2*L*t^2 + t^3)/24 + P*upd(t; L) - Ms*t*(L^2 - t^2)/(6*L)
'Hoekverdraaiing van veld 1 bij de tweede oplegging; positief draait het
'overstek omlaag.
tvd(w1; P1; Ms) = Ms*r_L1/3 - w1*r_L1^3/24 - P1*r_L1^2/16
'Zakking van het overstek op afstand z van de oplegging: de starre rotatie
'vanuit het veld plus de eigen doorbuiging van de kraag.
uod(z; w1; w2; P1; P2; Ms) = tvd(w1; P1; Ms)*z + w2*z^2*(6*r_a^2 - 4*r_a*z + z^2)/24 + P2*z^2*(3*r_a - z)/6
'Zakking in mm op afstand x van het begin, omlaag positief.
Ux(x; w1; w2; P1; P2; Ms) = 1000/EI_n*if(x ≤ r_L1; uvd(x; r_L1; w1; P1; Ms); if(r_a > 0; uod(x - r_L1; w1; w2; P1; P2; Ms); uvd(r_tot - x; max(r_L2; 0.001); w2; P2; Ms)))
'Zakking midden in elk veld en op het uiteinde van het overstek, in mm.
Um1(w1; P1; Ms) = 1000/EI_n*(5*w1*r_L1^4/384 + P1*r_L1^3/48 - Ms*r_L1^2/16)
Um2(w2; P2; Ms) = if(r_L2 > 0; 1000/EI_n*(5*w2*r_L2^4/384 + P2*r_L2^3/48 - Ms*r_L2^2/16); 0)
Ue(w1; w2; P1; P2; Ms) = if(r_a > 0; 1000/EI_n*uod(r_a; w1; w2; P1; P2; Ms); 0)
#show

# 3. Belastingen

'<i>Vloerafwerking, plafond, vaste scheidingswanden en overige blijvende lasten tellen op in G<sub>k</sub>; verplaatsbare scheidingswanden horen volgens EN 1991-1-1 §6.3.1.2 bij Q<sub>k</sub>. Het eigen gewicht van de ligger zelf rekent het blad in §1 uit de doorsnede en de dichtheid. Draagt de ligger andere balken (een onderslag, of een raveelbalk met de onderbroken balken), dan komt het eigen gewicht van die balken per m² vloer apart in g<sub>bl</sub>; bijvoorbeeld 71×221 h.o.h. 600 in C24: 0,11 kN/m².</i><span class="alleen-scherm"></span>
G_k = ?*(kN/m^2)', permanent<span class="kolom-3"></span>'
Q_k = ?*(kN/m^2)', veranderlijk<span class="kolom-3"></span>'
F_k = ?*(kN)', geconcentreerd<span class="kolom-3"></span>'
#if draagt ≡ 1
    g_bl = ?*(kN/m^2)'<span class="alleen-scherm">, eigen gewicht van de gedragen balken</span><span class="kolom-3"></span>'
#else
    #hide
    g_bl = 0 kN/m^2
    #show
#end if

@select belastingcat "Belastingcategorie (Tabel NB.2 — A1.1)"
  A — woon- en verblijfsruimtes = 1
  B — kantoorruimtes = 2
  C — bijeenkomstruimtes = 3
  D — winkelruimtes = 4
  E — opslagruimtes = 5
  F — verkeersruimte, voertuig ≤ 25 kN = 6
  G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
  H — daken = 8
  Sneeuwbelasting = 9
  Windbelasting = 10
  Zelf invullen = 11
@end

#if belastingcat ≡ 11
    ψ_0_zelf = ?', ψ<sub>0</sub><span class="kolom-3"></span>'
    ψ_2_zelf = ?', ψ<sub>2</sub><span class="kolom-3"></span>'
#else
    #hide
    ψ_0_zelf = 0
    ψ_2_zelf = 0
    #show
#end if

#hide
'ψ-factoren uit NEN-EN 1990 Tabel NB.2 — A1.1. Dezelfde waarden als het
'normblad "EN 1990 — Rekenwaarden" in de bibliotheek; één bron, zodat de
'twee niet uit elkaar kunnen lopen.
'   [categorie | ψ_0 | ψ_1 | ψ_2]
ψ_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0 |0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2 |0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0]
ψ_0 = if(belastingcat ≡ 11; ψ_0_zelf; hlookup(ψ_tabel; belastingcat; 1; 2))
ψ_2 = if(belastingcat ≡ 11; ψ_2_zelf; hlookup(ψ_tabel; belastingcat; 1; 4))
#show
'<span class="alleen-afdruk"></span>
#if belastingcat ≡ 11
    ψ_0'<span class="alleen-scherm"></span>'
    ψ_2'<span class="alleen-scherm"></span>'
#else
    ψ_0', Tabel NB.2 — A1.1<span class="kolom-3"></span>'
    ψ_2', idem<span class="kolom-3"></span>'
#end if

'<h6>Lasten per balk<span class="alleen-scherm"></span></h6>
'<i>De belaste breedte is bij een balk in een balklaag de hart-op-hart afstand en bij een onderslag de ingevoerde strook vloer. Bij een raveelbalk is het de halve staartlengte: elke onderbroken balk zet zijn oplegreactie op de raveelbalk af, per strekkende meter een vloerstrook van l<sub>staart</sub>/2.</i><span class="alleen-scherm"></span>
#if schema ≡ 4
    b_belast = l_staart/2 to mm', belaste breedte, halve staartlengte'
#else if ligger ≡ 2
    b_belast = b_ond to mm', belaste breedte van de onderslag'
#else
    b_belast = hoh to mm', belaste breedte, hart-op-hart afstand'
#end if
#if draagt ≡ 1
    P_g,k = b_belast*(G_k + g_bl) + g_balk to kN/m', permanent'
#else
    P_g,k = b_belast*G_k + g_balk to kN/m', permanent'
#end if
q_q,k = b_belast*Q_k to kN/m', veranderlijk'

#hide
a_ref = 1000 mm
'Derde term = (EI)_l/EI_ref, met (EI)_l = E_beschot·t³/12 per mm plaatbreedte.
'De E-modulus van het beschot is invoer (§2); vroeger stond hier een vaste
'7000 N/mm², waardoor een stijver of slapper beschot niet doorwerkte.
EI_ref = 50000000', referentiestijfheid per mm plaatbreedte (N·mm)'
t_ruw = t_vloer/(1 mm)
E_vl = E_beschot/(1 N/mm^2)', E-modulus beschot, dimensieloos voor de deling'
'Bij een raveelbalk en bij een onderslag staat de puntlast rechtstreeks op de
'ligger; er is dan geen balklaag waarover hij zich verdeelt.
kr_een = max(bool(schema ≡ 4); bool(ligger ≡ 2))
#show
#if kr_een ≡ 1
    k_r = 1'<span class="alleen-scherm">, puntlast rechtstreeks op de ligger</span><span class="kolom-2"></span>'
#else
    '<i>Een puntlast verdeelt zich via het beschot over meerdere balken. De concentratiefactor k<sub>r</sub> (NB) is het deel dat op één balk komt; stijver beschot geeft een kleinere k<sub>r</sub>.</i><span class="alleen-scherm"></span>
    k_r_0 = 0.37 + 0.8*hoh/a_ref - E_vl*t_ruw^3/12/EI_ref
    '<i>(NB.5.1) geldt voor 0 &lt; k<sub>r</sub> ≤ 1. Bij een dik of stijf beschot op een kleine h.o.h. komt k<sub>r,0</sub> op of onder 0 uit; dan ligt de formule buiten dat gebied en geeft de NB geen reductie: k<sub>r</sub> = 1. Binnen het gebied houdt het blad een ondergrens van 1/3 aan (veilige kant): één balk neemt dan nog een derde van de puntlast.</i><span class="alleen-scherm"></span>
    k_r = if(k_r_0 ≤ 0; 1; min(1; max(k_r_0; 1/3)))'<span class="alleen-scherm">, concentratiefactor (NB.5.1)</span><span class="kolom-2"></span>'
    #if k_r_0 ≤ 0
        '<span style="color: #b45309">k<sub>r,0</sub> = 'k_r_0' ≤ 0: buiten het geldigheidsgebied 0 &lt; k<sub>r</sub> ≤ 1 van (NB.5.1); geen reductie, k<sub>r</sub> = 1.</span>
    #else if k_r_0 < 1/3
        '<span style="color: #b45309">k<sub>r,0</sub> = 'k_r_0' &lt; 1/3: het blad houdt k<sub>r</sub> = 1/3 aan (veilige kant).</span>
    #end if
#end if
F_Q,k = F_k*k_r to kN'<span class="alleen-scherm">, puntlast op één balk</span><span class="kolom-2"></span>'

'<h6>Doorsnede<span class="alleen-scherm"></span></h6>
#if ond ≡ 0
'<i>Vloerhout (dikte t<sub>vloer</sub>) op de balken, hart-op-hart afstand hoh. De doorsnede staat op schaal.</i><span class="alleen-scherm"></span>
#hide
'De doorsnede staat op schaal: balkbreedte, balkhoogte, beschotdikte en de
'hart-op-hart afstand krijgen allemaal dezelfde factor, zodat de verhoudingen
'kloppen met het gekozen profiel. Eerder stonden er vaste pixelmaten, waardoor
'een slanke balk er even plomp uitzag als een zware.
svgW = 480
n_balk = 4
mm_ruw = 1 mm', hulpeenheid om maten kaal te maken'
b_ruw = b_balk/mm_ruw
h_ruw2 = h_balk/mm_ruw
hoh_ruw = hoh/mm_ruw
t_ruw2 = t_vloer/mm_ruw
'Breedte van de balkengroep in mm, en de schaal die hem in 420 px laat passen.
groep_mm = (n_balk - 1)*hoh_ruw + b_ruw
sc_x = 420/groep_mm
'Hoogte begrenzen: beschot + balk mag niet boven de 110 px uitkomen.
sc_y = 110/(t_ruw2 + h_ruw2)
sc = min(sc_x; sc_y)
bw = b_ruw*sc
bh = h_ruw2*sc
gap = hoh_ruw*sc
vt = max(4; t_ruw2*sc)
x0 = (svgW - (n_balk - 1)*gap - bw)/2
vy = 46', bovenkant beschot'
by = vy + vt', bovenkant balken'
svgH = by + bh + 46
#show
'<svg class="alleen-scherm" viewbox="0 0 480 'svgH'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'svgH'px;">
'  <rect x="24" y="'vy'" width="432" height="'vt'" style="fill:#D9B382; stroke:#8B6F47; stroke-width:0.8"/>
#for i = 0 : n_balk - 1
'  <rect x="'x0 + i*gap'" y="'by'" width="'bw'" height="'bh'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:0.8"/>
#loop
'  <line x1="'x0 + bw/2'" y1="'by + bh + 18'" x2="'x0 + gap + bw/2'" y2="'by + bh + 18'" style="stroke:#1E40AF; stroke-width:0.7"/>
'  <circle cx="'x0 + bw/2'" cy="'by + bh + 18'" r="2.2" style="fill:#1E40AF"/>
'  <circle cx="'x0 + gap + bw/2'" cy="'by + bh + 18'" r="2.2" style="fill:#1E40AF"/>
'  <text x="'x0 + gap/2 + bw/2'" y="'by + bh + 13'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">hoh = 'hoh'</text>
'  <text x="26" y="'vy - 5'" style="fill:#8B6F47">beschot t = 't_vloer'</text>
'  <text x="456" y="'by + bh + 13'" text-anchor="end" style="fill:#8B6F47">balk 'b_balk' × 'h_balk'</text>
'</svg>'
#else
'<i>Een onderslag: één ligger die de balken draagt, met een strook vloer van b<sub>ond</sub> = 'b_ond' m per strekkende meter. De doorsnede staat op schaal.</i><span class="alleen-scherm"></span>
#hide
'Hoogte begrenzen op 110 px, breedte op 200 px.
o_sc = min(110/max(h_balk/(1 mm); 1); 200/max(b_balk/(1 mm); 1))
o_b = o_sc*b_balk/(1 mm)
o_h = o_sc*h_balk/(1 mm)
o_x = 240 - o_b/2
#show
'<svg class="alleen-scherm" viewbox="0 0 480 'o_h + 60'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'o_h + 60'px;">
'  <line x1="60" y1="24" x2="420" y2="24" style="stroke:#8B6F47; stroke-width:8; stroke-dasharray:12 30"/>
'  <text x="60" y="12" style="fill:#8B6F47">balken op de onderslag, belaste breedte 'b_ond' m</text>
'  <rect x="'o_x'" y="28" width="'o_b'" height="'o_h'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1"/>
'  <text x="'o_x + o_b + 10'" y="'28 + o_h/2'" style="fill:#8B6F47; font-weight:700">onderslag 'b_balk' × 'h_balk'</text>
'</svg>'
#end if

'<h6>Statisch schema<span class="alleen-scherm"></span></h6>
#if schema ≡ 4
    '<i>Plattegrond van de sparing, op schaal. De onderbroken balken eindigen op de raveelbalk; die draagt zijn last af op de twee wisselbalken ernaast en staat hieronder als ligger op twee steunpunten.</i><span class="alleen-scherm"></span>
    #hide
    'Tekengebied: de sparing plus anderhalve balkafstand aan weerszijden, en in
    'de lengte de staart plus de helft daarvan om de sparing zelf te tonen.
    pw = b_sparing + 3*hoh
    ph = 1.5*l_staart
    p_s = min(400/(pw/(1 mm)); 150/(ph/(1 mm)))
    p_b = p_s*pw/(1 mm)
    p_h = p_s*ph/(1 mm)
    p_x0 = 40 + (400 - p_b)/2
    p_y0 = 30
    p_spb = p_s*b_sparing/(1 mm)
    p_st = p_s*l_staart/(1 mm)
    p_hoh = p_s*hoh/(1 mm)
    p_mid = p_x0 + p_b/2
    p_wl = p_mid - p_spb/2
    p_wr = p_mid + p_spb/2
    p_rav = p_y0 + p_st
    p_ond = p_y0 + p_h
    p_n = max(1; floor(b_sparing/hoh) - 1)
    p_stap = p_spb/(p_n + 1)
    #show
    '<svg class="alleen-scherm" viewbox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:230px;">
    '  <!-- de muur waar de balken op liggen -->
    '  <line x1="'p_x0 - 10'" y1="'p_y0'" x2="'p_x0 + p_b + 10'" y2="'p_y0'" style="stroke:#374151; stroke-width:2"/>
    #for i = 0 : 20
    '  <line x1="'p_x0 - 10 + i*(p_b + 20)/20'" y1="'p_y0'" x2="'p_x0 - 16 + i*(p_b + 20)/20'" y2="'p_y0 - 7'" style="stroke:#374151; stroke-width:0.7"/>
    #loop
    '  <!-- doorlopende balken naast de wisselbalken -->
    '  <line x1="'p_wl - p_hoh'" y1="'p_y0'" x2="'p_wl - p_hoh'" y2="'p_ond'" style="stroke:#8B6F47; stroke-width:1.4"/>
    '  <line x1="'p_wr + p_hoh'" y1="'p_y0'" x2="'p_wr + p_hoh'" y2="'p_ond'" style="stroke:#8B6F47; stroke-width:1.4"/>
    '  <!-- de sparing -->
    '  <rect x="'p_wl'" y="'p_rav'" width="'p_spb'" height="'p_ond - p_rav'" style="fill:#F1F5F9; stroke:#94A3B8; stroke-width:0.8; stroke-dasharray:4 3"/>
    '  <text x="'p_mid'" y="'(p_rav + p_ond)/2 + 4'" text-anchor="middle" style="fill:#64748B">sparing</text>
    '  <!-- onderbroken balken: van de muur tot op de raveelbalk -->
    #for i = 1 : p_n
    '  <line x1="'p_wl + i*p_stap'" y1="'p_y0'" x2="'p_wl + i*p_stap'" y2="'p_rav'" style="stroke:#8B6F47; stroke-width:1.4"/>
    #loop
    '  <!-- wisselbalken: die dragen de raveelbalk -->
    '  <rect x="'p_wl - 3'" y="'p_y0'" width="6" height="'p_ond - p_y0'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1.2"/>
    '  <rect x="'p_wr - 3'" y="'p_y0'" width="6" height="'p_ond - p_y0'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1.2"/>
    '  <text x="'p_wl - 8'" y="'p_ond + 12'" text-anchor="end" style="fill:#8B6F47">wisselbalk</text>
    '  <text x="'p_wr + 8'" y="'p_ond + 12'" style="fill:#8B6F47">wisselbalk</text>
    '  <!-- de raveelbalk zelf -->
    '  <rect x="'p_wl'" y="'p_rav - 4'" width="'p_spb'" height="8" style="fill:#B45309; stroke:#7C2D12; stroke-width:1"/>
    '  <text x="'p_mid'" y="'p_rav - 8'" text-anchor="middle" style="fill:#7C2D12; font-weight:700">raveelbalk</text>
    '  <!-- maatlijnen -->
    '  <line x1="'p_wl'" y1="'p_ond + 26'" x2="'p_wr'" y2="'p_ond + 26'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <circle cx="'p_wl'" cy="'p_ond + 26'" r="2.6" style="fill:#1E40AF"/>
    '  <circle cx="'p_wr'" cy="'p_ond + 26'" r="2.6" style="fill:#1E40AF"/>
    '  <text x="'p_mid'" y="'p_ond + 22'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">b<tspan baseline-shift="sub" font-size="8">sparing</tspan> = 'b_sparing'</text>
    '  <line x1="'p_x0 - 26'" y1="'p_y0'" x2="'p_x0 - 26'" y2="'p_rav'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <circle cx="'p_x0 - 26'" cy="'p_y0'" r="2.6" style="fill:#1E40AF"/>
    '  <circle cx="'p_x0 - 26'" cy="'p_rav'" r="2.6" style="fill:#1E40AF"/>
    '  <text x="'p_x0 - 30'" y="'(p_y0 + p_rav)/2'" text-anchor="end" style="fill:#1E40AF; font-weight:700">l<tspan baseline-shift="sub" font-size="8">staart</tspan> = 'l_staart'</text>
    '</svg>'
#end if

'<i>De ligger met de karakteristieke lasten per balk, op schaal; de verdeling over de velden staat in §4, de combinaties in §5.</i><span class="alleen-scherm"></span>
#hide
'Totale lengte: bij een overstek of een tweede veld hoort daar meer bij dan
'alleen de overspanning van het eerste veld.
L_tot = if(schema ≡ 2; L_th + a_over; if(schema ≡ 3; L_th + L_veld2; L_th))
s_schaal = 360/max(L_tot/(1 mm); 1)', ondergrens: bij het eerste renderen is de lengte nog nul'
sx1 = 60', eerste oplegging
sx2 = sx1 + s_schaal*L_th/(1 mm)', tweede oplegging
sx3 = sx1 + s_schaal*L_tot/(1 mm)', einde van de balk, of de derde oplegging
sy = 124', hoogte van de balk-as
smid = (sx1 + sx2)/2
s_stap = (sx3 - sx1)/14', pijlafstand in de lastbanden
#show
'<svg class="alleen-scherm" viewbox="0 0 480 212" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:232px;">
'  <!-- veranderlijke verdeelde last: bovenste band, met een regel eronder voor het label van de permanente last -->
#if q_q,k > 0 kN/m
    #for i = 0 : 14
    '  <line x1="'sx1 + i*s_stap'" y1="'sy - 90'" x2="'sx1 + i*s_stap'" y2="'sy - 71'" style="stroke:#B45309; stroke-width:1.6"/>
    '  <polygon points="'sx1 + i*s_stap','sy - 64' 'sx1 + i*s_stap - 3.6','sy - 72' 'sx1 + i*s_stap + 3.6','sy - 72'" style="fill:#B45309"/>
    #loop
    '  <line x1="'sx1'" y1="'sy - 90'" x2="'sx3'" y2="'sy - 90'" style="stroke:#B45309; stroke-width:2; stroke-linecap:round"/>
    '  <text x="'sx1 + (sx3 - sx1)*0.68'" y="'sy - 95'" text-anchor="middle" style="fill:#B45309; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">q<tspan baseline-shift="sub" font-size="8">q,k</tspan> = 'q_q,k' kN/m · veranderlijk</text>
#end if
'  <!-- permanente verdeelde last: band direct op de balk -->
#for i = 0 : 14
'  <line x1="'sx1 + i*s_stap'" y1="'sy - 44'" x2="'sx1 + i*s_stap'" y2="'sy - 14'" style="stroke:#475569; stroke-width:1.6"/>
'  <polygon points="'sx1 + i*s_stap','sy - 6' 'sx1 + i*s_stap - 3.6','sy - 14' 'sx1 + i*s_stap + 3.6','sy - 14'" style="fill:#475569"/>
#loop
'  <line x1="'sx1'" y1="'sy - 44'" x2="'sx3'" y2="'sy - 44'" style="stroke:#475569; stroke-width:2; stroke-linecap:round"/>
'  <text x="'sx1 + (sx3 - sx1)*0.3'" y="'sy - 49'" text-anchor="middle" style="fill:#475569; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">P<tspan baseline-shift="sub" font-size="8">g,k</tspan> = 'P_g,k' kN/m · permanent</text>
'  <!-- geconcentreerde veranderlijke last; de witte onderlaag houdt hem
'       leesbaar waar hij door de twee lastbanden heen zakt -->
#if F_Q,k > 0 kN
    '  <line x1="'smid'" y1="'sy - 110'" x2="'smid'" y2="'sy - 15'" style="stroke:#ffffff; stroke-width:6"/>
    '  <line x1="'smid'" y1="'sy - 110'" x2="'smid'" y2="'sy - 15'" style="stroke:#B91C1C; stroke-width:2.6"/>
    '  <polygon points="'smid','sy - 6' 'smid - 5.5','sy - 17' 'smid + 5.5','sy - 17'" style="fill:#B91C1C"/>
    '  <text x="'smid'" y="'sy - 115'" text-anchor="middle" style="fill:#B91C1C; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">F<tspan baseline-shift="sub" font-size="8">Q,k</tspan> = 'F_Q,k' kN</text>
#end if
'  <!-- de balk over zijn volle lengte -->
'  <rect x="'sx1'" y="'sy - 6'" width="'sx3 - sx1'" height="12" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1.2"/>
'  <!-- opleggingen: scharnier, rol, en bij twee velden een tweede rol -->
'  <polygon points="'sx1','sy + 6' 'sx1 - 8','sy + 6 + 15' 'sx1 + 8','sy + 6 + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <line x1="'sx1 - 12'" y1="'sy + 6 + 15'" x2="'sx1 + 12'" y2="'sy + 6 + 15'" style="stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'sx2','sy + 6' 'sx2 - 8','sy + 6 + 12' 'sx2 + 8','sy + 6 + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <circle cx="'sx2 - 3.6'" cy="'sy + 6 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <circle cx="'sx2 + 3.6'" cy="'sy + 6 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <line x1="'sx2 - 12'" y1="'sy + 6 + 17.6'" x2="'sx2 + 12'" y2="'sy + 6 + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
#if schema ≡ 3
    '  <polygon points="'sx3','sy + 6' 'sx3 - 8','sy + 6 + 12' 'sx3 + 8','sy + 6 + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
    '  <circle cx="'sx3 - 3.6'" cy="'sy + 6 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <circle cx="'sx3 + 3.6'" cy="'sy + 6 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <line x1="'sx3 - 12'" y1="'sy + 6 + 17.6'" x2="'sx3 + 12'" y2="'sy + 6 + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
#end if
'  <!-- maatlijn van het eerste veld -->
'  <line x1="'sx1'" y1="'sy + 52'" x2="'sx2'" y2="'sy + 52'" style="stroke:#1E40AF; stroke-width:1"/>
'  <circle cx="'sx1'" cy="'sy + 52'" r="2.6" style="fill:#1E40AF"/>
'  <circle cx="'sx2'" cy="'sy + 52'" r="2.6" style="fill:#1E40AF"/>
'  <text x="'smid'" y="'sy + 48'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">L<tspan baseline-shift="sub" font-size="8">th</tspan> = 'L_th'</text>
#if schema ≡ 2
    '  <line x1="'sx2'" y1="'sy + 52'" x2="'sx3'" y2="'sy + 52'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <circle cx="'sx3'" cy="'sy + 52'" r="2.6" style="fill:#1E40AF"/>
    '  <text x="'(sx2 + sx3)/2'" y="'sy + 48'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">a = 'a_over'</text>
#end if
#if schema ≡ 3
    '  <line x1="'sx2'" y1="'sy + 52'" x2="'sx3'" y2="'sy + 52'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <circle cx="'sx3'" cy="'sy + 52'" r="2.6" style="fill:#1E40AF"/>
    '  <text x="'(sx2 + sx3)/2'" y="'sy + 48'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">L<tspan baseline-shift="sub" font-size="8">2</tspan> = 'L_veld2'</text>
#end if
'</svg>'
'<span class="alleen-scherm"><span style="display:inline-block; width:14px; border-top:3px solid #475569; vertical-align:middle"></span>&nbsp;permanent &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #B45309; vertical-align:middle"></span>&nbsp;veranderlijk, verdeeld &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #B91C1C; vertical-align:middle"></span>&nbsp;veranderlijk, geconcentreerd</span>

# 4. Belastinggevallen

'<i>Elk belastinggeval is een set van hoogstens vier lasten: een verdeelde last op veld 1 en op het tweede deel (veld 2 of het overstek), een puntlast midden in veld 1 en een op het tweede deel (midden in veld 2, of op het uiteinde van het overstek). BG1 is de permanente last op alle velden, BG2 en BG3 de veranderlijke last op veld 1 en op het tweede deel, BG4 en BG5 de puntlast.</i><span class="alleen-scherm"></span>
#if s23 ≥ 1
    '<i>De veranderlijke last staat per deel apart (schaakbordbelasting): een belast buurveld of overstek trekt het veld via het steunmoment omhoog, dus met dat deel onbelast worden het veldmoment en de doorbuiging van het veld groter dan onder volle belasting. De permanente last gaat met één factor over alle velden (NB bij tabel NB.4 — A1.2(B)).</i><span class="alleen-scherm"></span>
    '<i>Het steunmoment M<sub>B</sub> volgt bij twee velden uit de drie-momentenvergelijking, bij een overstek uit het evenwicht van de kraag. Met M<sub>B</sub> bekend is elk veld een ligger op twee steunpunten met een inklemmend eindmoment; reacties, moment, dwarskracht en zakking volgen dan uit het evenwicht en de vormfuncties.</i><span class="alleen-scherm"></span>
#end if

#hide
'Lasten als kaal getal in kN/m en kN.
g_n = P_g,k/(1 kN/m)
q_n = q_q,k/(1 kN/m)
F_n = F_Q,k/(1 kN)
'De lastset van geval k: verdeelde last op veld 1 en op het tweede deel,
'puntlast midden in veld 1 en op het tweede deel. Het overstek is voor de
'schaakbordbelasting een tweede deel, net als veld 2: de veranderlijke last
'erop ontlast het veld, dus hij staat er apart op (BG3), en de puntlast op
'het uiteinde ook (BG5).
bw1(k) = if(k ≡ 1; g_n; if(k ≡ 2; q_n; 0))
bw2(k) = if(k ≡ 1; g_n*s23; if(k ≡ 3; q_n*s23; 0))
bP1(k) = if(k ≡ 4; F_n; 0)
bP2(k) = if(k ≡ 5; F_n*s23; 0)
'BG3 en BG5 bestaan alleen bij twee velden of een overstek.
bg_aan(k) = if(k ≡ 3; s23; if(k ≡ 5; s23; 1))
'Steunmoment per geval.
mb_1 = Mb(bw1(1); bw2(1); bP1(1); bP2(1))
mb_2 = Mb(bw1(2); bw2(2); bP1(2); bP2(2))
mb_3 = Mb(bw1(3); bw2(3); bP1(3); bP2(3))
mb_4 = Mb(bw1(4); bw2(4); bP1(4); bP2(4))
mb_5 = Mb(bw1(5); bw2(5); bP1(5); bP2(5))
mB_bg(k) = if(k ≡ 1; mb_1; if(k ≡ 2; mb_2; if(k ≡ 3; mb_3; if(k ≡ 4; mb_4; mb_5))))
'Bemonstering langs de ligger. Voor M en V 26 punten per veld, met een dubbel
'punt onder de puntlast in het midden, zodat de sprong in de dwarskracht
'verticaal staat; voor de zakking 17 punten per veld.
sa(i) = r_L1*((i - bool(i > 12))/24 + bool(i ≡ 13)*10^-6)
sb(i) = r_L1 + (r_tot - r_L1)*((i - bool(i > 12))/24 + bool(i ≡ 13)*10^-6 + bool(i ≡ 0)*10^-6)
su(i) = r_L1*i/16
sv(i) = r_L1 + (r_tot - r_L1)*i/16
r_twee = bool(r_tot > r_L1*1.0001)
'Lengteschaal van het statische schema, en van de kaart per belastinggeval.
lX(x) = sx1 + (sx3 - sx1)*x/r_tot
bX(x) = 20 + 230*x/r_tot
'Plaats van de puntlast op het tweede deel: midden in veld 2 of het uiteinde.
r_xP2 = if(s2 ≡ 1; r_tot; r_L1 + r_L2/2)
#show

#for k = 1 : 5
#if bg_aan(k) ≡ 1
    #if k ≡ 1
        '<h6>BG1 — permanent: P<sub>g,k</sub> = 'P_g,k' kN/m op alle velden<span class="alleen-scherm"></span></h6>
    #else if k ≡ 2
        '<h6>BG2 — veranderlijk: q<sub>q,k</sub> = 'q_q,k' kN/m op veld 1<span class="alleen-scherm"></span></h6>
    #else if k ≡ 3
        '<h6>BG3 — veranderlijk: q<sub>q,k</sub> = 'q_q,k' kN/m 'if(s2 ≡ 1; "op het overstek"; "op veld 2")'<span class="alleen-scherm"></span></h6>
    #else if k ≡ 4
        '<h6>BG4 — puntlast: F<sub>Q,k</sub> = 'F_Q,k' kN midden in veld 1<span class="alleen-scherm"></span></h6>
    #else
        '<h6>BG5 — puntlast: F<sub>Q,k</sub> = 'F_Q,k' kN 'if(s2 ≡ 1; "op het uiteinde van het overstek"; "midden in veld 2")'<span class="alleen-scherm"></span></h6>
    #end if
    #hide
    b_w1 = bw1(k)
    b_w2 = bw2(k)
    b_P1 = bP1(k)
    b_P2 = bP2(k)
    b_m = mB_bg(k)
    M_veld1 = Mv1(b_w1; b_P1; b_m)*kN*m
    M_steun = b_m*kN*m
    M_veld2 = Mv2(b_w2; b_P2; b_m)*kN*m
    V_max = Vmx(b_w1; b_w2; b_P1; b_P2; b_m)*kN
    u_veld1 = Um1(b_w1; b_P1; b_m)*mm
    u_veld2 = Um2(b_w2; b_P2; b_m)*mm
    u_eind = Ue(b_w1; b_w2; b_P1; b_P2; b_m)*mm
    #show
    M_veld1', grootste veldmoment in veld 1<span class="alleen-scherm"></span>'
    #if s2 + s3 ≥ 1
        M_steun', steunmoment, trek aan de bovenzijde<span class="alleen-scherm"></span>'
    #end if
    #if s3 ≡ 1
        M_veld2', grootste veldmoment in veld 2<span class="alleen-scherm"></span>'
    #end if
    V_max', grootste dwarskracht<span class="alleen-scherm"></span>'
    u_veld1', zakking midden in veld 1<span class="alleen-scherm"></span>'
    #if s3 ≡ 1
        u_veld2', zakking midden in veld 2<span class="alleen-scherm"></span>'
    #end if
    #if s2 ≡ 1
        u_eind', zakking van het uiteinde van het overstek<span class="alleen-scherm"></span>'
    #end if
    #hide
    'Hoogteschalen van de drie lijnen van dit geval, in een kaart van 260 breed.
    b_Mv1 = M_veld1/(1 kN*m)
    b_Mv2 = M_veld2/(1 kN*m)
    b_Mp = max(b_Mv1; b_Mv2; 0)
    b_Mn = max(b_m; 0)
    b_sM = 23/max(b_Mp + b_Mn; 0.00001)
    b_yM = 32 + b_Mn*b_sM
    b_va = v1(0; b_w1; b_P1; b_m)
    b_vb = v1(r_L1; b_w1; b_P1; b_m)
    b_vc = v2(r_tot - r_L1; b_w2; b_P2; b_m)
    b_vd = v2(0; b_w2; b_P2; b_m)
    b_Vp = max(b_va; b_vc*r_twee; 0)
    b_Vn = max(-b_vb; -b_vd*r_twee; 0)
    b_sV = 20/max(b_Vp + b_Vn; 0.00001)
    b_yV = b_yM + b_Mp*b_sM + 19 + b_Vp*b_sV
    b_up = 0
    b_un = 0
    #for i = 0 : 16
    b_u1 = Ux(su(i); b_w1; b_w2; b_P1; b_P2; b_m)
    b_u2 = Ux(sv(i); b_w1; b_w2; b_P1; b_P2; b_m)
    b_up = max(b_up; b_u1; b_u2*r_twee)
    b_un = max(b_un; -b_u1; -b_u2*r_twee)
    #loop
    b_sU = 16/max(b_up + b_un; 0.00001)
    b_yU = b_yV + b_Vn*b_sV + 19 + b_un*b_sU
    b_H = b_yU + b_up*b_sU + 14
    b_u1m = Um1(b_w1; b_P1; b_m)
    b_u2m = Um2(b_w2; b_P2; b_m)
    b_ue = Ue(b_w1; b_w2; b_P1; b_P2; b_m)
    b_x1 = x1t(b_w1; b_P1; b_m)
    b_x2 = r_tot - t2t(b_w2; b_P2; b_m)
    b_kleur = if(k ≡ 1; "#475569"; if(k ≤ 3; "#B45309"; "#B91C1C"))
    #show
    '<svg class="bg-kaart" viewbox="0 0 260 'b_H'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'1.6*b_H'px;">
    '  <!-- de kop staat op het scherm erboven; op papier staan de kaarten naast elkaar en draagt de kaart hem zelf -->
    #if k ≡ 1
        '  <text class="alleen-afdruk" x="2" y="9" style="fill:#374151; font-weight:700">BG1 · permanent, P<tspan baseline-shift="sub" font-size="7">g,k</tspan> = 'P_g,k' kN/m</text>
    #else if k ≡ 2
        '  <text class="alleen-afdruk" x="2" y="9" style="fill:#374151; font-weight:700">BG2 · q<tspan baseline-shift="sub" font-size="7">q,k</tspan> = 'q_q,k' kN/m op veld 1</text>
    #else if k ≡ 3
        '  <text class="alleen-afdruk" x="2" y="9" style="fill:#374151; font-weight:700">BG3 · q<tspan baseline-shift="sub" font-size="7">q,k</tspan> = 'q_q,k' kN/m 'if(s2 ≡ 1; "op het overstek"; "op veld 2")'</text>
    #else if k ≡ 4
        '  <text class="alleen-afdruk" x="2" y="9" style="fill:#374151; font-weight:700">BG4 · F<tspan baseline-shift="sub" font-size="7">Q,k</tspan> = 'F_Q,k' kN midden in veld 1</text>
    #else
        '  <text class="alleen-afdruk" x="2" y="9" style="fill:#374151; font-weight:700">BG5 · F<tspan baseline-shift="sub" font-size="7">Q,k</tspan> = 'F_Q,k' kN 'if(s2 ≡ 1; "op het uiteinde"; "midden in veld 2")'</text>
    #end if
    '  <!-- de belasting van dit geval: een balk boven de belaste velden, een pijl voor de puntlast -->
    #if b_w1 > 0
        '  <rect x="'bX(0)'" y="15" width="'bX(r_L1) - bX(0)'" height="4" style="fill:'b_kleur'; opacity:0.6"/>
    #end if
    #if b_w2*r_twee > 0
        '  <rect x="'bX(r_L1)'" y="15" width="'bX(r_tot) - bX(r_L1)'" height="4" style="fill:'b_kleur'; opacity:0.6"/>
    #end if
    #if b_P1 > 0
        '  <polygon points="'bX(r_L1/2)','25' 'bX(r_L1/2) - 4','14' 'bX(r_L1/2) + 4','14'" style="fill:'b_kleur'"/>
    #end if
    #if b_P2 > 0
        '  <polygon points="'bX(r_xP2)','25' 'bX(r_xP2) - 4','14' 'bX(r_xP2) + 4','14'" style="fill:'b_kleur'"/>
    #end if
    '  <!-- opleggingen: stippellijnen door de drie lijnen -->
    '  <line x1="'bX(0)'" y1="26" x2="'bX(0)'" y2="'b_H - 12'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    '  <line x1="'bX(r_L1)'" y1="26" x2="'bX(r_L1)'" y2="'b_H - 12'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    #if s3 ≡ 1
        '  <line x1="'bX(r_tot)'" y1="26" x2="'bX(r_tot)'" y2="'b_H - 12'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    #end if
    '  <!-- M-lijn, aan de trekzijde -->
    '  <polygon points="'bX(0)','b_yM'
    #for i = 0 : 25
    ' 'bX(sa(i))','b_yM + b_sM*Mx(sa(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 0 : 25
        ' 'bX(sb(i))','b_yM + b_sM*Mx(sb(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    ' 'bX(r_tot)','b_yM'" style="fill:rgba(239,68,68,0.20); stroke:#dc2626; stroke-width:1.2; stroke-linejoin:round"/>
    '  <line x1="'bX(0) - 4'" y1="'b_yM'" x2="'bX(r_tot) + 4'" y2="'b_yM'" style="stroke:#374151; stroke-width:0.8"/>
    '  <text x="2" y="'b_yM + 3.5'" style="fill:#dc2626; font-weight:700">M</text>
    #if b_Mv1 > 0.00001
        '  <text x="'bX(b_x1)'" y="'b_yM + b_sM*b_Mv1 + 10'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_Mv1'</text>
    #end if
    #if b_Mn > 0.00001
        '  <text x="'bX(r_L1)'" y="'b_yM - b_sM*b_Mn - 3'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'-b_Mn'</text>
    #end if
    #if b_Mv2 > 0.00001
        '  <text x="'bX(b_x2)'" y="'b_yM + b_sM*b_Mv2 + 10'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_Mv2'</text>
    #end if
    '  <!-- V-lijn -->
    '  <polygon points="'bX(0)','b_yV'
    #for i = 0 : 25
    ' 'bX(sa(i))','b_yV - b_sV*Vx(sa(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 0 : 25
        ' 'bX(sb(i))','b_yV - b_sV*Vx(sb(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    ' 'bX(r_tot)','b_yV'" style="fill:rgba(59,130,246,0.18); stroke:#2563eb; stroke-width:1.2; stroke-linejoin:round"/>
    '  <line x1="'bX(0) - 4'" y1="'b_yV'" x2="'bX(r_tot) + 4'" y2="'b_yV'" style="stroke:#374151; stroke-width:0.8"/>
    '  <text x="2" y="'b_yV + 3.5'" style="fill:#2563eb; font-weight:700">V</text>
    '  <text x="'bX(0) + 2'" y="'b_yV - b_sV*b_va + if(b_va < 0; 10; -3)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_va'</text>
    '  <text x="'bX(r_L1) - 2'" y="'b_yV - b_sV*b_vb + if(b_vb < 0; 10; -3)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vb'</text>
    #if r_twee ≡ 1
        '  <text x="'bX(r_L1) + 2'" y="'b_yV - b_sV*b_vc + if(b_vc < 0; 10; -3)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vc'</text>
    #end if
    #if s3 ≡ 1
        '  <text x="'bX(r_tot) - 2'" y="'b_yV - b_sV*b_vd + if(b_vd < 0; 10; -3)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vd'</text>
    #end if
    '  <!-- zakkingslijn, omlaag positief -->
    '  <polyline points="
    #for i = 0 : 16
    ' 'bX(su(i))','b_yU + b_sU*Ux(su(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 1 : 16
        ' 'bX(sv(i))','b_yU + b_sU*Ux(sv(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    '" style="fill:none; stroke:#2563eb; stroke-width:1.5; stroke-linejoin:round"/>
    '  <line x1="'bX(0) - 4'" y1="'b_yU'" x2="'bX(r_tot) + 4'" y2="'b_yU'" style="stroke:#9ca3af; stroke-width:0.8; stroke-dasharray:4 3"/>
    '  <text x="2" y="'b_yU + 3.5'" style="fill:#2563eb; font-weight:700">u</text>
    '  <text x="'bX(r_L1/2)'" y="'b_yU + b_sU*b_u1m + if(b_u1m < 0; -4; 11)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_u1m'</text>
    #if s3 ≡ 1
        '  <text x="'bX(r_L1 + r_L2/2)'" y="'b_yU + b_sU*b_u2m + if(b_u2m < 0; -4; 11)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_u2m'</text>
    #end if
    #if s2 ≡ 1
        '  <text x="'bX(r_tot) - 2'" y="'b_yU + b_sU*b_ue + if(b_ue < 0; -4; 11)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_ue'</text>
    #end if
    '  <!-- opleggingen onder de zakkingslijn -->
    '  <polygon points="'bX(0)','b_yU' 'bX(0) - 4','b_yU + 6' 'bX(0) + 4','b_yU + 6'" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/>
    '  <polygon points="'bX(r_L1)','b_yU' 'bX(r_L1) - 4','b_yU + 6' 'bX(r_L1) + 4','b_yU + 6'" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/>
    #if s3 ≡ 1
        '  <polygon points="'bX(r_tot)','b_yU' 'bX(r_tot) - 4','b_yU + 6' 'bX(r_tot) + 4','b_yU + 6'" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/>
    #end if
    '</svg>'
#end if
#loop
'M aan de trekzijde (kNm), V positief boven de as (kN), u omlaag positief (mm); elke lijn op een eigen schaal, de lasten karakteristiek.

# 5. Combinaties

'Gevolgklasse CC'CC', factoren uit NEN-EN 1990 tabel 'if(CC ≡ 2; "NB.4"; "NB.5")'; per UGT-combinatie telt de ongunstigste van 6.10a en 6.10b<span class="alleen-scherm"> (NB bij tabel A1.2(B)). De ψ-factoren horen bij de belastingcategorie uit §3</span>.
#hide
γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
γ_G,a = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
γ_Q,a = γ_Q*ψ_0
#show
γ_G', 6.10b<span class="kolom-4"></span>'
γ_Q', 6.10b<span class="kolom-4"></span>'
γ_G,a', 6.10a<span class="kolom-4"></span>'
γ_Q,a', γ<sub>Q</sub>·ψ<sub>0</sub><span class="kolom-4"></span>'

#hide
'Lastset per UGT-combinatie, als optelling van de belastinggevallen. Rij r
'krijgt fG op BG1 en fQ op de veranderlijke gevallen van die rij:
'  1  veld 1               fG·BG1 + fQ·BG2
'  2  steun                fG·BG1 + fQ·(BG2 + BG3)
'  3  veld 2 of overstek   fG·BG1 + fQ·BG3
'  4  puntlast             fG·BG1 + fQ·BG4
'  5  puntlast             fG·BG1 + fQ·BG5
'Bij 6.10b is fG = γ_G en fQ = γ_Q, bij 6.10a fG = γ_G,a en fQ = γ_Q·ψ_0.
kw1(r; fG; fQ) = fG*bw1(1) + fQ*(bw1(2)*bool(r ≤ 2) + bw1(3)*bool(r ≥ 2))
kw2(r; fG; fQ) = fG*bw2(1) + fQ*(bw2(2)*bool(r ≤ 2) + bw2(3)*bool(r ≥ 2))
km(r; fG; fQ) = fG*mb_1 + fQ*(mb_2*bool(r ≤ 2) + mb_3*bool(r ≥ 2))
'De puntlast: de maxima van de permanente last en de puntlast opgeteld, ook
'waar ze niet samenvallen — een veilige bovengrens. BG4 staat midden in veld
'1, BG5 midden in veld 2 of op het uiteinde van het overstek. Voor de
'dwarskracht staat hij vlak bij een oplegging.
m_Qv = Mb(0; 0; F_n; 0)
m_Q2 = Mb(0; 0; 0; F_n*s23)
M_g,k = max(Mv1(bw1(1); 0; mb_1); mb_1; Mv2(bw2(1); 0; mb_1))*kN*m
V_g,k = Vmx(bw1(1); bw2(1); 0; 0; mb_1)*kN
M_Q,k = max(Mv1(0; F_n; m_Qv); m_Qv)*kN*m
M_Q,k,2 = max(Mv2(0; F_n*s3; m_Q2); m_Q2)*kN*m
'Uitkomsten per rij, eerst 6.10b en dan 6.10a. Bij een overstek is rij 3 het
'steunmoment: het overstek zelf heeft geen veldmoment.
c1_w1 = kw1(1; γ_G; γ_Q)
c1_w2 = kw2(1; γ_G; γ_Q)
c1_m = km(1; γ_G; γ_Q)
c2_w1 = kw1(2; γ_G; γ_Q)
c2_w2 = kw2(2; γ_G; γ_Q)
c2_m = km(2; γ_G; γ_Q)
c3_w1 = kw1(3; γ_G; γ_Q)
c3_w2 = kw2(3; γ_G; γ_Q)
c3_m = km(3; γ_G; γ_Q)
c4_w1 = γ_G*bw1(1)
c4_w2 = γ_G*bw2(1)
c4_P1 = γ_Q*bP1(4)
c4_m = γ_G*mb_1 + γ_Q*mb_4
c5_P2 = γ_Q*bP2(5)
c5_m = γ_G*mb_1 + γ_Q*mb_5
M_Ed,veld1,b = Mv1(c1_w1; 0; c1_m)*kN*m
M_Ed,steun,b = c2_m*kN*m
M_Ed,veld2,b = if(s2 ≡ 1; c3_m; Mv2(c3_w2; 0; c3_m))*kN*m
V_Ed,veld1,b = Vmx(c1_w1; c1_w2; 0; 0; c1_m)*kN
V_Ed,steun,b = Vmx(c2_w1; c2_w2; 0; 0; c2_m)*kN
V_Ed,veld2,b = Vmx(c3_w1; c3_w2; 0; 0; c3_m)*kN
M_Ed,F1,b = γ_G*M_g,k + γ_Q*M_Q,k
M_Ed,F2,b = γ_G*M_g,k + γ_Q*M_Q,k,2
V_Ed,F1,b = γ_G*V_g,k + γ_Q*F_Q,k
V_Ed,F2,b = γ_G*V_g,k + γ_Q*F_Q,k*s23
a1_w1 = kw1(1; γ_G,a; γ_Q,a)
a1_w2 = kw2(1; γ_G,a; γ_Q,a)
a1_m = km(1; γ_G,a; γ_Q,a)
a2_w1 = kw1(2; γ_G,a; γ_Q,a)
a2_w2 = kw2(2; γ_G,a; γ_Q,a)
a2_m = km(2; γ_G,a; γ_Q,a)
a3_w1 = kw1(3; γ_G,a; γ_Q,a)
a3_w2 = kw2(3; γ_G,a; γ_Q,a)
a3_m = km(3; γ_G,a; γ_Q,a)
a4_w1 = γ_G,a*bw1(1)
a4_w2 = γ_G,a*bw2(1)
a4_P1 = γ_Q,a*bP1(4)
a4_m = γ_G,a*mb_1 + γ_Q,a*mb_4
a5_P2 = γ_Q,a*bP2(5)
a5_m = γ_G,a*mb_1 + γ_Q,a*mb_5
M_Ed,veld1,a = Mv1(a1_w1; 0; a1_m)*kN*m
M_Ed,steun,a = a2_m*kN*m
M_Ed,veld2,a = if(s2 ≡ 1; a3_m; Mv2(a3_w2; 0; a3_m))*kN*m
V_Ed,veld1,a = Vmx(a1_w1; a1_w2; 0; 0; a1_m)*kN
V_Ed,steun,a = Vmx(a2_w1; a2_w2; 0; 0; a2_m)*kN
V_Ed,veld2,a = Vmx(a3_w1; a3_w2; 0; 0; a3_m)*kN
M_Ed,F1,a = γ_G,a*M_g,k + γ_Q,a*M_Q,k
M_Ed,F2,a = γ_G,a*M_g,k + γ_Q,a*M_Q,k,2
V_Ed,F1,a = γ_G,a*V_g,k + γ_Q,a*F_Q,k
V_Ed,F2,a = γ_G,a*V_g,k + γ_Q,a*F_Q,k*s23
'Per rij de ongunstigste van 6.10a en 6.10b.
M_Ed,veld1 = max(M_Ed,veld1,a; M_Ed,veld1,b)
M_Ed,steun = max(M_Ed,steun,a; M_Ed,steun,b)
M_Ed,veld2 = max(M_Ed,veld2,a; M_Ed,veld2,b)
M_Ed,F1 = max(M_Ed,F1,a; M_Ed,F1,b)
M_Ed,F2 = max(M_Ed,F2,a; M_Ed,F2,b)
V_Ed,veld1 = max(V_Ed,veld1,a; V_Ed,veld1,b)
V_Ed,steun = max(V_Ed,steun,a; V_Ed,steun,b)
V_Ed,veld2 = max(V_Ed,veld2,a; V_Ed,veld2,b)
V_Ed,F1 = max(V_Ed,F1,a; V_Ed,F1,b)
V_Ed,F2 = max(V_Ed,F2,a; V_Ed,F2,b)
'Alleen de permanente last, 6.10a zonder veranderlijke last: getoetst met
'k_mod voor blijvend (§8.5). Het veldmoment en het steunmoment apart, voor de
'kipfactor bij het steunmoment.
M_g,veld = max(Mv1(bw1(1); 0; mb_1); Mv2(bw2(1); 0; mb_1))
M_g,steun = max(mb_1; 0)
M_Ed,G = γ_G,a*max(M_g,veld; M_g,steun)*kN*m
V_Ed,G = γ_G,a*V_g,k
'Vet in de tabel: de maatgevende van 6.10a (vet_a) en 6.10b (vet_b); bij
'gelijke uitkomst 6.10b.
vet_a(x; y) = if(x > y; 700; 400)
vet_b(x; y) = if(x ≥ y; 700; 400)
#show

'<h6>5.1 Zakking per veld, in het punt met de grootste eindstand w<sub>fin</sub> (x vanaf de eerste oplegging)</h6>
'<i>Dat punt is langs de hele lijn van het veld gezocht, in 49 punten en daarna verfijnd met een parabool door het hoogste punt en zijn buren. Bij een inklemmend eindmoment (schema 2 en 3) ligt het naast het midden; komt een veld over de hele lengte omhoog, dan ligt het op de oplegging en is de zakking daar nul.</i><span class="alleen-scherm"></span>
#hide
'Zakking van geval k op afstand x van het begin, en de eindstand onder BG1
'plus het veranderlijke geval k: (1 + k_def)·u_g + (1 + ψ_2·k_def)·u_var.
Ubg(x; k) = Ux(x; bw1(k); bw2(k); bP1(k); bP2(k); mB_bg(k))
Ufk(x; k) = (1 + k_def)*Ubg(x; 1) + (1 + ψ_2*k_def)*Ubg(x; k)
'Top van een parabool door drie punten op onderlinge afstand 1, als
'verschuiving vanaf het middelste; alleen bij een bolle top, anders nul.
dpar(fm; f0; fp) = if(fm - 2*f0 + fp < 0; max(-0.5; min(0.5; (fm - fp)/(2*min(fm - 2*f0 + fp; -10^-12)))); 0)
'Verfijnde plaats bij het hoogste bemonsterde punt ib, met stap h vanaf x0
'(48 stappen). Ligt dat punt op een rand van het veld, dan blijft het daar.
xtop(ib; h; x0; k) = x0 + h*(ib + bool(ib > 0)*bool(ib < 48)*dpar(Ufk(x0 + h*(ib - 1); k); Ufk(x0 + h*ib; k); Ufk(x0 + h*(ib + 1); k)))
'Veld 1: de grootste eindstand met de verdeelde last (BG2) en met de puntlast (BG4).
z_q = -10^9
i_q = 0
z_F = -10^9
i_F = 0
#for i = 0 : 48
z_t = Ufk(r_L1*i/48; 2)
i_q = if(z_t > z_q; i; i_q)
z_q = max(z_q; z_t)
z_t = Ufk(r_L1*i/48; 4)
i_F = if(z_t > z_F; i; i_F)
z_F = max(z_F; z_t)
#loop
x_qr = xtop(i_q; r_L1/48; 0; 2)
x_q = if(Ufk(x_qr; 2) ≥ z_q; x_qr; r_L1*i_q/48)
x_Fr = xtop(i_F; r_L1/48; 0; 4)
x_F = if(Ufk(x_Fr; 4) ≥ z_F; x_Fr; r_L1*i_F/48)
'In de norm-stand telt de puntlast als die de grootste eindstand geeft.
kies_F1 = bool(rekenwijze ≡ 0)*bool(Ufk(x_F; 4) > Ufk(x_q; 2))
r_x1 = if(kies_F1 ≡ 1; x_F; x_q)
'Het tweede deel: bij een overstek het uiteinde, bij twee velden hieronder gezocht.
r_x2 = r_tot
#show
#if s3 ≡ 1
    #hide
    'Veld 2: idem, met BG3 en BG5.
    z_q = -10^9
    i_q = 0
    z_F = -10^9
    i_F = 0
    #for i = 0 : 48
    z_t = Ufk(r_L1 + r_L2*i/48; 3)
    i_q = if(z_t > z_q; i; i_q)
    z_q = max(z_q; z_t)
    z_t = Ufk(r_L1 + r_L2*i/48; 5)
    i_F = if(z_t > z_F; i; i_F)
    z_F = max(z_F; z_t)
    #loop
    x_qr = xtop(i_q; r_L2/48; r_L1; 3)
    x_q = if(Ufk(x_qr; 3) ≥ z_q; x_qr; r_L1 + r_L2*i_q/48)
    x_Fr = xtop(i_F; r_L2/48; r_L1; 5)
    x_F = if(Ufk(x_Fr; 5) ≥ z_F; x_Fr; r_L1 + r_L2*i_F/48)
    r_x2 = if(bool(rekenwijze ≡ 0)*bool(Ufk(x_F; 5) > Ufk(x_q; 3)) ≡ 1; x_F; x_q)
    #show
#end if
#hide
x_w1 = r_x1*m
u_g,k = Ubg(r_x1; 1)*mm
u_q,k = Ubg(r_x1; 2)*mm
u_Q,k = Ubg(r_x1; 4)*mm
#show
x_w1', veld 1<span class="kolom-4"></span>'
u_g,k'<span class="alleen-scherm">, BG1</span><span class="kolom-4"></span>'
u_q,k'<span class="alleen-scherm">, BG2</span><span class="kolom-4"></span>'
u_Q,k'<span class="alleen-scherm">, BG4</span><span class="kolom-4"></span>'
#if s3 ≡ 1
    #hide
    x_w2 = r_x2*m
    u_g,k,2 = Ubg(r_x2; 1)*mm
    u_q,k,2 = Ubg(r_x2; 3)*mm
    u_Q,k,2 = Ubg(r_x2; 5)*mm
    #show
    x_w2', veld 2<span class="kolom-4"></span>'
    u_g,k,2'<span class="alleen-scherm">, BG1</span><span class="kolom-4"></span>'
    u_q,k,2'<span class="alleen-scherm">, BG3</span><span class="kolom-4"></span>'
    u_Q,k,2'<span class="alleen-scherm">, BG5</span><span class="kolom-4"></span>'
#else if s2 ≡ 1
    #hide
    x_w2 = r_x2*m
    u_g,k,2 = Ubg(r_x2; 1)*mm
    u_q,k,2 = Ubg(r_x2; 3)*mm
    u_Q,k,2 = Ubg(r_x2; 5)*mm
    #show
    x_w2', uiteinde<span class="kolom-4"></span>'
    u_g,k,2'<span class="alleen-scherm">, BG1</span><span class="kolom-4"></span>'
    u_q,k,2'<span class="alleen-scherm">, BG3</span><span class="kolom-4"></span>'
    u_Q,k,2'<span class="alleen-scherm">, BG5</span><span class="kolom-4"></span>'
#else
    #hide
    x_w2 = r_x2*m
    u_g,k,2 = 0 mm
    u_q,k,2 = 0 mm
    u_Q,k,2 = 0 mm
    #show
#end if
#hide
'Welke veranderlijke doorbuiging meetelt: in de referentiestand alleen de
'gelijkmatig verdeelde last, in de norm-stand de maatgevende van de twee.
u_var_ref = u_q,k to mm
u_var_nb = max(u_q,k; u_Q,k) to mm
u_var = if(rekenwijze ≡ 1; u_var_ref; u_var_nb) to mm
#show
#if rekenwijze ≡ 1
    u_var', veranderlijk, veld 1: u<sub>q,k</sub><span class="alleen-scherm"></span>'
#else
    u_var', veranderlijk, veld 1: de grootste van u<sub>q,k</sub> en u<sub>Q,k</sub><span class="alleen-scherm"></span>'
#end if
#if s23 ≥ 1
    #hide
    u_var2_ref = u_q,k,2 to mm
    u_var2_nb = max(u_q,k,2; u_Q,k,2) to mm
    u_var,2 = if(rekenwijze ≡ 1; u_var2_ref; u_var2_nb) to mm
    #show
    #if rekenwijze ≡ 1
        u_var,2', idem tweede deel: u<sub>q,k,2</sub><span class="alleen-scherm"></span>'
    #else
        u_var,2', idem tweede deel, de grootste van de twee<span class="alleen-scherm"></span>'
    #end if
#else
    #hide
    u_var,2 = 0 mm
    #show
#end if
#hide
'Telt in de BGT de puntlast (BG4, BG5) in plaats van de verdeelde last (BG2, BG3)?
pv1 = bool(u_var > u_q,k)
pv2 = bool(u_var,2 > u_q,k,2)
#show

'<h6>5.2 Combinatietabel</h6>
'Factor per belastinggeval; vet de ongunstigste van 6.10a en 6.10b; u in het punt uit 5.1; bij de puntlast de maxima van BG1 en BG4 (BG5) opgeteld, een veilige bovengrens<span class="alleen-scherm">. In de BGT telt de puntlast mee in plaats van de verdeelde last als die de grootste zakking geeft (norm-stand)</span>.
#if s23 ≥ 1
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;">
    '<th style="padding:1px 4px; text-align:left;">Combinatie</th>
    '<th style="padding:1px 4px; text-align:left;"></th>
    '<th style="padding:1px 4px; text-align:center;">BG1</th>
    '<th style="padding:1px 4px; text-align:center;">BG2</th>
    '<th style="padding:1px 4px; text-align:center;">BG3</th>
    '<th style="padding:1px 4px; text-align:center;">BG4</th>
    '<th style="padding:1px 4px; text-align:center;">BG5</th>
    '<th style="padding:1px 4px; text-align:right;">M<sub>Ed</sub> [kNm]</th>
    '<th style="padding:1px 4px; text-align:right;">V<sub>Ed</sub> [kN]</th></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT veld 1</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,veld1,a; M_Ed,veld1,b)';">'M_Ed,veld1,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,veld1,a; V_Ed,veld1,b)';">'V_Ed,veld1,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,veld1,b; M_Ed,veld1,a)';">'M_Ed,veld1,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,veld1,b; V_Ed,veld1,a)';">'V_Ed,veld1,b'</td></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT steun</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,steun,a; M_Ed,steun,b)';">'M_Ed,steun,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,steun,a; V_Ed,steun,b)';">'V_Ed,steun,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,steun,b; M_Ed,steun,a)';">'M_Ed,steun,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,steun,b; V_Ed,steun,a)';">'V_Ed,steun,b'</td></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT 'if(s2 ≡ 1; "overstek"; "veld 2")'</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,veld2,a; M_Ed,veld2,b)';">'M_Ed,veld2,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,veld2,a; V_Ed,veld2,b)';">'V_Ed,veld2,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,veld2,b; M_Ed,veld2,a)';">'M_Ed,veld2,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,veld2,b; V_Ed,veld2,a)';">'V_Ed,veld2,b'</td></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT puntlast veld 1</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,F1,a; M_Ed,F1,b)';">'M_Ed,F1,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,F1,a; V_Ed,F1,b)';">'V_Ed,F1,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,F1,b; M_Ed,F1,a)';">'M_Ed,F1,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,F1,b; V_Ed,F1,a)';">'V_Ed,F1,b'</td></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT puntlast 'if(s2 ≡ 1; "uiteinde"; "veld 2")'</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,F2,a; M_Ed,F2,b)';">'M_Ed,F2,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,F2,a; V_Ed,F2,b)';">'V_Ed,F2,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,F2,b; M_Ed,F2,a)';">'M_Ed,F2,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,F2,b; V_Ed,F2,a)';">'V_Ed,F2,b'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">UGT alleen permanent (k<sub>mod,G</sub>)</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right;">'M_Ed,G'</td>
    '<td style="padding:0 4px; text-align:right;">'V_Ed,G'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT karakteristiek veld 1</td>
    '<td style="padding:0 4px;">6.14b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k + u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT karakteristiek 'if(s2 ≡ 1; "uiteinde"; "veld 2")'</td>
    '<td style="padding:0 4px;">6.14b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv2 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv2 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k,2 + u_var,2' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT quasi-blijvend veld 1</td>
    '<td style="padding:0 4px;">6.16b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k + ψ_2*u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT quasi-blijvend 'if(s2 ≡ 1; "uiteinde"; "veld 2")'</td>
    '<td style="padding:0 4px;">6.16b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv2 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv2 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k,2 + ψ_2*u_var,2' mm</td></tr>
    '</table>
#else
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;">
    '<th style="padding:1px 4px; text-align:left;">Combinatie</th>
    '<th style="padding:1px 4px; text-align:left;"></th>
    '<th style="padding:1px 4px; text-align:center;">BG1</th>
    '<th style="padding:1px 4px; text-align:center;">BG2</th>
    '<th style="padding:1px 4px; text-align:center;">BG4</th>
    '<th style="padding:1px 4px; text-align:right;">M<sub>Ed</sub> [kNm]</th>
    '<th style="padding:1px 4px; text-align:right;">V<sub>Ed</sub> [kN]</th></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT veld</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,veld1,a; M_Ed,veld1,b)';">'M_Ed,veld1,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,veld1,a; V_Ed,veld1,b)';">'V_Ed,veld1,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,veld1,b; M_Ed,veld1,a)';">'M_Ed,veld1,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,veld1,b; V_Ed,veld1,a)';">'V_Ed,veld1,b'</td></tr>
    '<tr style="border-bottom:1px solid #f3f4f6;">
    '<td style="padding:0 4px;" rowspan="2">UGT puntlast</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(M_Ed,F1,a; M_Ed,F1,b)';">'M_Ed,F1,a'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_a(V_Ed,F1,a; V_Ed,F1,b)';">'V_Ed,F1,a'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">6.10b</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(M_Ed,F1,b; M_Ed,F1,a)';">'M_Ed,F1,b'</td>
    '<td style="padding:0 4px; text-align:right; font-weight:'vet_b(V_Ed,F1,b; V_Ed,F1,a)';">'V_Ed,F1,b'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">UGT alleen permanent (k<sub>mod,G</sub>)</td>
    '<td style="padding:0 4px;">6.10a</td>
    '<td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:0 4px; text-align:right;">'M_Ed,G'</td>
    '<td style="padding:0 4px; text-align:right;">'V_Ed,G'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT karakteristiek</td>
    '<td style="padding:0 4px;">6.14b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k + u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:0 4px;">BGT quasi-blijvend</td>
    '<td style="padding:0 4px;">6.16b</td>
    '<td style="padding:0 4px; text-align:center;">1.0</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:0 4px; text-align:center;">'if(pv1 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:0 4px; text-align:right;" colspan="2">u = 'u_g,k + ψ_2*u_var' mm</td></tr>
    '</table>
#end if
'Bij de puntlast zijn de maxima van BG1 en BG4 (of BG5) opgeteld, ook waar ze niet samenvallen: een veilige bovengrens.<span class="alleen-scherm"></span>

'<h6>5.3 Omhullende (UGT)</h6>
'<i>De grootste uitkomsten van de UGT-combinaties (6.10a en 6.10b) uit de tabel in 5.2. De doorsnede is prismatisch, dus alleen de grootte telt: veld of steun.</i><span class="alleen-scherm"></span>
#if s23 ≥ 1
    M_y,Ed = max(M_Ed,veld1; M_Ed,steun; M_Ed,veld2; M_Ed,F1; M_Ed,F2) to kN*m', maatgevend<span class="alleen-scherm"></span>'
    V_z,Ed = max(V_Ed,veld1; V_Ed,steun; V_Ed,veld2; V_Ed,F1; V_Ed,F2) to kN', maatgevend<span class="alleen-scherm"></span>'
#else
    M_y,Ed = max(M_Ed,veld1; M_Ed,F1) to kN*m', maatgevend<span class="alleen-scherm"></span>'
    V_z,Ed = max(V_Ed,veld1; V_Ed,F1) to kN', maatgevend<span class="alleen-scherm"></span>'
#end if
'<i>Per plaats het grootste en het kleinste moment en de grootste en kleinste dwarskracht over de UGT-combinaties uit 5.2, met de puntlast op zijn plaats uit BG4 en BG5: doorgetrokken de grootste waarde, onderbroken de kleinste. Het moment staat aan de trekzijde. Valt M<sub>y,Ed</sub> of V<sub>z,Ed</sub> hoger uit dan de lijn, dan is dat de opgetelde bovengrens bij de puntlast.</i><span class="alleen-scherm"></span>
M_y,Ed'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
V_z,Ed'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'

#hide
'Moment en dwarskracht van combinatie 1 tot en met 5 op afstand x, met de
'lastsets uit §5: c voor 6.10b, a voor 6.10a. De puntlastcombinaties dragen de
'permanente last met γ_G (of γ_G,a) op alle velden.
Mo1(x) = Mx(x; c1_w1; c1_w2; 0; 0; c1_m)
Mo2(x) = Mx(x; c2_w1; c2_w2; 0; 0; c2_m)
Mo3(x) = Mx(x; c3_w1; c3_w2; 0; 0; c3_m)
Mo4(x) = Mx(x; c4_w1; c4_w2; c4_P1; 0; c4_m)
Mo5(x) = Mx(x; c4_w1; c4_w2; 0; c5_P2; c5_m)
Ma1(x) = Mx(x; a1_w1; a1_w2; 0; 0; a1_m)
Ma2(x) = Mx(x; a2_w1; a2_w2; 0; 0; a2_m)
Ma3(x) = Mx(x; a3_w1; a3_w2; 0; 0; a3_m)
Ma4(x) = Mx(x; a4_w1; a4_w2; a4_P1; 0; a4_m)
Ma5(x) = Mx(x; a4_w1; a4_w2; 0; a5_P2; a5_m)
Vo1(x) = Vx(x; c1_w1; c1_w2; 0; 0; c1_m)
Vo2(x) = Vx(x; c2_w1; c2_w2; 0; 0; c2_m)
Vo3(x) = Vx(x; c3_w1; c3_w2; 0; 0; c3_m)
Vo4(x) = Vx(x; c4_w1; c4_w2; c4_P1; 0; c4_m)
Vo5(x) = Vx(x; c4_w1; c4_w2; 0; c5_P2; c5_m)
Va1(x) = Vx(x; a1_w1; a1_w2; 0; 0; a1_m)
Va2(x) = Vx(x; a2_w1; a2_w2; 0; 0; a2_m)
Va3(x) = Vx(x; a3_w1; a3_w2; 0; 0; a3_m)
Va4(x) = Vx(x; a4_w1; a4_w2; a4_P1; 0; a4_m)
Va5(x) = Vx(x; a4_w1; a4_w2; 0; a5_P2; a5_m)
'De omhullende: per plaats het grootste en het kleinste.
Mo_max(x) = max(Mo1(x); Mo2(x); Mo3(x); Mo4(x); Mo5(x); Ma1(x); Ma2(x); Ma3(x); Ma4(x); Ma5(x))
Mo_min(x) = min(Mo1(x); Mo2(x); Mo3(x); Mo4(x); Mo5(x); Ma1(x); Ma2(x); Ma3(x); Ma4(x); Ma5(x))
Vo_max(x) = max(Vo1(x); Vo2(x); Vo3(x); Vo4(x); Vo5(x); Va1(x); Va2(x); Va3(x); Va4(x); Va5(x))
Vo_min(x) = min(Vo1(x); Vo2(x); Vo3(x); Vo4(x); Vo5(x); Va1(x); Va2(x); Va3(x); Va4(x); Va5(x))
'Kenmerkende waarden van de omhullende. Het grootste veldmoment in veld 1 komt
'uit combinatie 1 of 4, in veld 2 uit 3 of 5, elk met 6.10a of 6.10b; het
'steunmoment is overal het grootst bij de tussenoplegging. De dwarskracht
'daalt binnen elk veld, dus de uitersten liggen aan de randen.
o_M1a = max(Mv1(c1_w1; 0; c1_m); Mv1(a1_w1; 0; a1_m))
o_x1a = if(Mv1(a1_w1; 0; a1_m) > Mv1(c1_w1; 0; c1_m); x1t(a1_w1; 0; a1_m); x1t(c1_w1; 0; c1_m))
o_M1b = max(Mv1(c4_w1; c4_P1; c4_m); Mv1(a4_w1; a4_P1; a4_m))
o_x1b = if(Mv1(a4_w1; a4_P1; a4_m) > Mv1(c4_w1; c4_P1; c4_m); x1t(a4_w1; a4_P1; a4_m); x1t(c4_w1; c4_P1; c4_m))
o_M1 = max(o_M1a; o_M1b)
o_x1 = if(o_M1b > o_M1a; o_x1b; o_x1a)
o_M2a = max(Mv2(c3_w2; 0; c3_m); Mv2(a3_w2; 0; a3_m))
o_x2a = if(Mv2(a3_w2; 0; a3_m) > Mv2(c3_w2; 0; c3_m); t2t(a3_w2; 0; a3_m); t2t(c3_w2; 0; c3_m))
o_M2b = max(Mv2(c4_w2; c5_P2; c5_m); Mv2(a4_w2; a5_P2; a5_m))
o_x2b = if(Mv2(a4_w2; a5_P2; a5_m) > Mv2(c4_w2; c5_P2; c5_m); t2t(a4_w2; a5_P2; a5_m); t2t(c4_w2; c5_P2; c5_m))
o_M2 = max(o_M2a; o_M2b)
o_x2 = r_tot - if(o_M2b > o_M2a; o_x2b; o_x2a)
o_Ms = max(c1_m; c2_m; c3_m; c4_m; c5_m; a1_m; a2_m; a3_m; a4_m; a5_m; 0)
o_Mp = max(o_M1; o_M2; 0.0001)
o_V0 = Vo_max(0)
o_VL = Vo_min(r_L1)
o_VR = Vo_max(r_L1 + (r_tot - r_L1)*10^-6)
o_VE = Vo_min(r_tot*(1 - 10^-9))
o_Vp = max(o_V0; o_VR*r_twee; 0.0001)
o_Vn = max(-o_VL; -o_VE*r_twee; 0)
'Schaal: het deel onder en boven de as past per lijn samen in 48 px.
m_s = 48/max(o_Mp + o_Ms; 0.0001)
my = 30 + o_Ms*m_s', as van de M-lijn'
v_s = 48/max(o_Vp + o_Vn; 0.0001)
vy2 = my + o_Mp*m_s + 50 + o_Vp*v_s', as van de V-lijn'
svg_mv = vy2 + o_Vn*v_s + 24
#show
'<svg class="omhullende" viewbox="0 0 480 'svg_mv'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'svg_mv + 10'px;">
'  <!-- M-lijn: de grootste en de kleinste waarde, elk als gevuld vlak aan de trekzijde -->
'  <polygon points="'lX(0)','my'
#for i = 0 : 25
' 'lX(sa(i))','my + m_s*Mo_max(sa(i))'
#loop
#if r_twee ≡ 1
    #for i = 0 : 25
    ' 'lX(sb(i))','my + m_s*Mo_max(sb(i))'
    #loop
#end if
' 'lX(r_tot)','my'" style="fill:rgba(239,68,68,0.22); stroke:#dc2626; stroke-width:2; stroke-linejoin:round"/>
'  <polygon points="'lX(0)','my'
#for i = 0 : 25
' 'lX(sa(i))','my + m_s*Mo_min(sa(i))'
#loop
#if r_twee ≡ 1
    #for i = 0 : 25
    ' 'lX(sb(i))','my + m_s*Mo_min(sb(i))'
    #loop
#end if
' 'lX(r_tot)','my'" style="fill:rgba(239,68,68,0.12); stroke:#dc2626; stroke-width:1.4; stroke-dasharray:5 3; stroke-linejoin:round"/>
'  <line x1="'lX(0) - 10'" y1="'my'" x2="'lX(r_tot) + 10'" y2="'my'" style="stroke:#374151; stroke-width:1.4"/>
'  <text x="'lX(0) - 10'" y="'my - o_Ms*m_s - 14'" style="fill:#dc2626; font-weight:700">M-lijn [kNm]</text>
'  <text x="'lX(r_tot) + 10'" y="'my - o_Ms*m_s - 14'" text-anchor="end" style="fill:#374151">M<tspan baseline-shift="sub" font-size="8">y,Ed</tspan> = 'M_y,Ed' kNm (maatgevend)</text>
#if o_M1 > 0.00001
    '  <circle cx="'lX(o_x1)'" cy="'my + m_s*o_M1'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(o_x1)'" y="'my + m_s*o_M1 + 14'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_M1'</text>
#end if
#if o_M2 > 0.00001
    '  <circle cx="'lX(o_x2)'" cy="'my + m_s*o_M2'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(o_x2)'" y="'my + m_s*o_M2 + 14'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_M2'</text>
#end if
#if o_Ms > 0.00001
    '  <circle cx="'lX(r_L1)'" cy="'my - m_s*o_Ms'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(r_L1)'" y="'my - m_s*o_Ms - 6'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'-o_Ms'</text>
#end if
'  <!-- V-lijn: de grootste en de kleinste waarde -->
'  <polygon points="'lX(0)','vy2'
#for i = 0 : 25
' 'lX(sa(i))','vy2 - v_s*Vo_max(sa(i))'
#loop
#if r_twee ≡ 1
    #for i = 0 : 25
    ' 'lX(sb(i))','vy2 - v_s*Vo_max(sb(i))'
    #loop
#end if
' 'lX(r_tot)','vy2'" style="fill:rgba(59,130,246,0.20); stroke:#2563eb; stroke-width:2; stroke-linejoin:round"/>
'  <polygon points="'lX(0)','vy2'
#for i = 0 : 25
' 'lX(sa(i))','vy2 - v_s*Vo_min(sa(i))'
#loop
#if r_twee ≡ 1
    #for i = 0 : 25
    ' 'lX(sb(i))','vy2 - v_s*Vo_min(sb(i))'
    #loop
#end if
' 'lX(r_tot)','vy2'" style="fill:rgba(59,130,246,0.12); stroke:#2563eb; stroke-width:1.4; stroke-dasharray:5 3; stroke-linejoin:round"/>
'  <line x1="'lX(0) - 10'" y1="'vy2'" x2="'lX(r_tot) + 10'" y2="'vy2'" style="stroke:#374151; stroke-width:1.4"/>
'  <text x="'lX(0) - 10'" y="'vy2 - o_Vp*v_s - 14'" style="fill:#2563eb; font-weight:700">V-lijn [kN]</text>
'  <text x="'lX(r_tot) + 10'" y="'vy2 - o_Vp*v_s - 14'" text-anchor="end" style="fill:#374151">V<tspan baseline-shift="sub" font-size="8">z,Ed</tspan> = 'V_z,Ed' kN (maatgevend)</text>
'  <text x="'lX(0) + 5'" y="'vy2 - v_s*o_V0 + if(o_V0 < 0; 14; -5)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_V0'</text>
'  <text x="'lX(r_L1) - 5'" y="'vy2 - v_s*o_VL + if(o_VL < 0; 14; -5)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VL'</text>
#if r_twee ≡ 1
    '  <text x="'lX(r_L1) + 5'" y="'vy2 - v_s*o_VR + if(o_VR < 0; 14; -5)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VR'</text>
#end if
#if s3 ≡ 1
    '  <text x="'lX(r_tot) - 5'" y="'vy2 - v_s*o_VE + if(o_VE < 0; 14; -5)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VE'</text>
#end if
'  <!-- opleggingen onder beide assen -->
'  <polygon points="'lX(0)','my' 'lX(0) - 6','my + 11' 'lX(0) + 6','my + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <polygon points="'lX(r_L1)','my' 'lX(r_L1) - 6','my + 11' 'lX(r_L1) + 6','my + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <polygon points="'lX(0)','vy2' 'lX(0) - 6','vy2 + 11' 'lX(0) + 6','vy2 + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <polygon points="'lX(r_L1)','vy2' 'lX(r_L1) - 6','vy2 + 11' 'lX(r_L1) + 6','vy2 + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
#if s3 ≡ 1
    '  <polygon points="'lX(r_tot)','my' 'lX(r_tot) - 6','my + 11' 'lX(r_tot) + 6','my + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <polygon points="'lX(r_tot)','vy2' 'lX(r_tot) - 6','vy2 + 11' 'lX(r_tot) + 6','vy2 + 11'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
#end if
'</svg>'

# 6. Toetsing BGT — doorbuiging (§7.2)

'w<sub>inst</sub> (6.14b), w<sub>kruip</sub> = k<sub>def</sub>·w<sub>qp</sub> (6.16b), w<sub>fin</sub> = w<sub>inst</sub> + w<sub>kruip</sub> (7.2), w<sub>bij</sub> = w<sub>fin</sub> − u<sub>g,k</sub> (NB bij EN 1990, A1.4)<span class="alleen-scherm">. w<sub>inst</sub> komt uit de karakteristieke combinatie, de kruip uit de quasi-blijvende. De permanente last kruipt volledig, de veranderlijke alleen voor het quasi-blijvende deel ψ<sub>2</sub>; w<sub>fin</sub> is dus gelijk aan (1 + k<sub>def</sub>)·u<sub>g</sub> + (1 + ψ<sub>2</sub>·k<sub>def</sub>)·u<sub>var</sub>. De bijkomende doorbuiging is wat na het aanbrengen van de afwerking nog bij komt: de eindstand min de momentane zakking onder de permanente last. Beide worden getoetst: de eindstand aan de grens voor w<sub>fin</sub>, de bijkomende aan 0,003 × L of, bij een brosse afwerking, 0,002 × L</span>.

@select controleer "Controleer doorbuiging"
  Ja = 1
  Nee = 0
@end

@select grensfactor "Grens eindstand w_fin"
  0.004 × L = 0.004
  0.003 × L = 0.003
  0.002 × L = 0.002
@end

@select grens_bij "Grens bijkomende doorbuiging w_bij"
  0.003 × L = 0.003
  0.002 × L = 0.002
@end

#if controleer ≡ 1
    '<i>De zakkingen per veld komen uit 5.1; de opbouw van de combinaties staat in de tabel van 5.2. Op papier staat het tweede deel als uitkomst naast de uitwerking van veld 1.</i><span class="alleen-scherm"></span>
    w_inst = u_g,k + u_var to mm', 6.14b, veld 1'
    #if s23 ≥ 1
        w_inst,2 = u_g,k,2 + u_var,2 to mm', 6.14b, tweede deel<span class="alleen-scherm"></span>'
    #end if
    q_qp = 1.0*P_g,k + ψ_2*q_q,k to kN/m', 6.16b: lijnlast die langdurig blijft staan<span class="alleen-scherm"></span>'
    w_qp = 1.0*u_g,k + ψ_2*u_var to mm', 6.16b, veld 1'
    #if s23 ≥ 1
        w_qp,2 = 1.0*u_g,k,2 + ψ_2*u_var,2 to mm', 6.16b, tweede deel<span class="alleen-scherm"></span>'
    #end if
    w_kruip = k_def*w_qp to mm', kruip, veld 1'
    #if s23 ≥ 1
        w_kruip,2 = k_def*w_qp,2 to mm', kruip, tweede deel<span class="alleen-scherm"></span>'
    #end if
    w_fin = w_inst + w_kruip to mm', veld 1'
    #if s23 ≥ 1
        w_fin,2 = w_inst,2 + w_kruip,2 to mm', tweede deel<span class="alleen-scherm"></span>'
        w_inst,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        w_qp,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        w_kruip,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        w_fin,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    w_bij = w_fin - u_g,k to mm'<span class="alleen-scherm">, bijkomend, veld 1</span><span class="alleen-scherm"></span>'
    w_bij'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if s23 ≥ 1
        w_bij,2 = w_fin,2 - u_g,k,2 to mm'<span class="alleen-scherm">, bijkomend, tweede deel</span><span class="alleen-scherm"></span>'
        w_bij,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    w_lim = grensfactor*L_th'<span class="alleen-scherm">, grens eindstand veld 1</span><span class="alleen-scherm"></span>'
    w_lim'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if s3 ≡ 1
        w_lim,2 = grensfactor*L_veld2'<span class="alleen-scherm">, grens eindstand veld 2</span><span class="alleen-scherm"></span>'
        w_lim,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else if s2 ≡ 1
        w_lim,2 = grensfactor*2*a_over'<span class="alleen-scherm">, grens eindstand uiteinde, als overspanning 2·a</span><span class="alleen-scherm"></span>'
        w_lim,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    w_lim,bij = grens_bij*L_th'<span class="alleen-scherm">, grens bijkomend veld 1</span><span class="alleen-scherm"></span>'
    w_lim,bij'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if s3 ≡ 1
        w_lim,bij,2 = grens_bij*L_veld2'<span class="alleen-scherm">, grens bijkomend veld 2</span><span class="alleen-scherm"></span>'
        w_lim,bij,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else if s2 ≡ 1
        w_lim,bij,2 = grens_bij*2*a_over'<span class="alleen-scherm">, grens bijkomend uiteinde, als overspanning 2·a</span><span class="alleen-scherm"></span>'
        w_lim,bij,2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    #if s23 ≥ 1
        UC_doorbuiging = max(w_fin/w_lim; w_fin,2/w_lim,2)'<span class="alleen-scherm"></span>'
    #else
        UC_doorbuiging = w_fin/w_lim'<span class="alleen-scherm"></span>'
    #end if
    #if UC_doorbuiging ≤ 1.0
        '<span class="alleen-scherm">UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span><span class="alleen-scherm"></span>
    #else
        '<span class="alleen-scherm">UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span><span class="alleen-scherm"></span>
    #end if
    #if s23 ≥ 1
        UC_bij = max(w_bij/w_lim,bij; w_bij,2/w_lim,bij,2)'<span class="alleen-scherm"></span>'
    #else
        UC_bij = w_bij/w_lim,bij'<span class="alleen-scherm"></span>'
    #end if
    #if UC_bij ≤ 1.0
        '<span class="alleen-scherm">UC<sub>bij</sub> = w<sub>bij</sub>/w<sub>bij,max</sub> = 'UC_bij'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span><span class="alleen-scherm"></span>
    #else
        '<span class="alleen-scherm">UC<sub>bij</sub> = w<sub>bij</sub>/w<sub>bij,max</sub> = 'UC_bij'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span><span class="alleen-scherm"></span>
    #end if
    '<span class="alleen-afdruk"></span>
    UC_w = max(UC_doorbuiging; UC_bij)'<span class="alleen-scherm">, eindstand en bijkomend</span>'
    #if UC_w ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>Doorbuigingslijn<span class="alleen-scherm"></span></h6>
    '<i>De onderbroken lijn is de momentane zakking (6.14b), de doorgetrokken de eindstand inclusief kruip, op dezelfde schaal. Per veld, en op het overstek, staat de veranderlijke last op dat deel (schaakbordbelasting); de stippen staan in de punten uit 5.1.</i><span class="alleen-scherm"></span>
    #hide
    'Welk veranderlijk geval per deel meetelt: de verdeelde last, of in de
    'norm-stand de puntlast als die de grootste zakking geeft (5.1).
    kv1 = if(pv1 ≡ 1; 4; 2)
    kv2 = if(pv2 ≡ 1; 5; 3)
    kvx(x) = if(s23*bool(x > r_L1) ≡ 1; kv2; kv1)
    ui_x(x) = Ubg(x; 1) + Ubg(x; kvx(x))
    uf_x(x) = (1 + k_def)*Ubg(x; 1) + (1 + ψ_2*k_def)*Ubg(x; kvx(x))
    sw(i) = r_L1*i/24
    sz(i) = r_L1 + (r_tot - r_L1)*i/24
    'Schaal: het deel onder en boven de as past samen in 70 px.
    w_hi = 0
    w_lo = 0
    #for i = 0 : 24
    w_a = uf_x(sw(i))
    w_b = uf_x(sz(i))*r_twee
    w_hi = max(w_hi; w_a; w_b; ui_x(sw(i)))
    w_lo = max(w_lo; -w_a; -w_b)
    #loop
    w_s = 70/max(w_hi + w_lo; 0.00001)
    uas = 30 + w_lo*w_s', hoogte van de onvervormde as'
    w_H = uas + w_hi*w_s + 30 + (2 + s23)*15
    #show
    '<svg class="alleen-scherm" viewbox="0 0 480 'w_H'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'w_H + 10'px;">
    '  <line x1="'lX(0) - 8'" y1="'uas'" x2="'lX(r_tot) + 8'" y2="'uas'" style="stroke:#9ca3af; stroke-width:1; stroke-dasharray:4 4"/>
    '  <polyline points="
    #for i = 0 : 24
    ' 'lX(sw(i))','uas + w_s*ui_x(sw(i))'
    #loop
    #if r_twee ≡ 1
        #for i = 1 : 24
        ' 'lX(sz(i))','uas + w_s*ui_x(sz(i))'
        #loop
    #end if
    '" style="fill:none; stroke:#93c5fd; stroke-width:1.6; stroke-dasharray:6 4"/>
    '  <polyline points="
    #for i = 0 : 24
    ' 'lX(sw(i))','uas + w_s*uf_x(sw(i))'
    #loop
    #if r_twee ≡ 1
        #for i = 1 : 24
        ' 'lX(sz(i))','uas + w_s*uf_x(sz(i))'
        #loop
    #end if
    '" style="fill:none; stroke:#2563eb; stroke-width:2.6; stroke-linejoin:round; stroke-linecap:round"/>
    '  <!-- opleggingen -->
    '  <polygon points="'lX(0)','uas' 'lX(0) - 8','uas + 15' 'lX(0) + 8','uas + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
    '  <line x1="'lX(0) - 12'" y1="'uas + 15'" x2="'lX(0) + 12'" y2="'uas + 15'" style="stroke:#92400e; stroke-width:1.2"/>
    '  <polygon points="'lX(r_L1)','uas' 'lX(r_L1) - 8','uas + 12' 'lX(r_L1) + 8','uas + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
    '  <circle cx="'lX(r_L1) - 3.6'" cy="'uas + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <circle cx="'lX(r_L1) + 3.6'" cy="'uas + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <line x1="'lX(r_L1) - 12'" y1="'uas + 17.6'" x2="'lX(r_L1) + 12'" y2="'uas + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
    #if s3 ≡ 1
        '  <polygon points="'lX(r_tot)','uas' 'lX(r_tot) - 8','uas + 12' 'lX(r_tot) + 8','uas + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
        '  <circle cx="'lX(r_tot) - 3.6'" cy="'uas + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
        '  <circle cx="'lX(r_tot) + 3.6'" cy="'uas + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
        '  <line x1="'lX(r_tot) - 12'" y1="'uas + 17.6'" x2="'lX(r_tot) + 12'" y2="'uas + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
    #end if
    '  <circle cx="'lX(r_x1)'" cy="'uas + w_s*uf_x(r_x1)'" r="3" style="fill:#2563eb"/>
    '  <text x="'lX(r_x1)'" y="'uas + w_s*uf_x(r_x1) + if(uf_x(r_x1) < 0; -8; 17)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'w_fin' mm</text>
    #if s23 ≥ 1
        '  <circle cx="'lX(r_x2)'" cy="'uas + w_s*uf_x(r_x2)'" r="3" style="fill:#2563eb"/>
        '  <text x="'lX(r_x2)'" y="'uas + w_s*uf_x(r_x2) + if(uf_x(r_x2) < 0; -8; 17)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'w_fin,2' mm</text>
    #end if
    '  <text x="'lX(0) + 8'" y="'w_H - 23 - s23*15'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">fin</tspan> (6.16b + kruip) = 'w_fin' mm — grens 'w_lim' mm'if(s23 ≥ 1; " (veld 1)"; "")'</text>
    #if s23 ≥ 1
        '  <text x="'lX(0) + 8'" y="'w_H - 23'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">fin</tspan> = 'w_fin,2' mm — grens 'w_lim,2' mm 'if(s2 ≡ 1; "(uiteinde overstek)"; "(veld 2)")'</text>
    #end if
    #if s23 ≥ 1
        '  <text x="'lX(0) + 8'" y="'w_H - 8'" style="fill:#60a5fa; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">inst</tspan> (6.14b) = 'w_inst' en 'w_inst,2' mm, onderbroken lijn</text>
    #else
        '  <text x="'lX(0) + 8'" y="'w_H - 8'" style="fill:#60a5fa; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">inst</tspan> (6.14b) = 'w_inst' mm, onderbroken lijn</text>
    #end if
    '</svg>'
#else
    'Doorbuiging wordt niet getoetst (Controleer doorbuiging = Nee).
    UC_doorbuiging = 0'<span class="alleen-scherm"></span>'
    UC_bij = 0'<span class="alleen-scherm"></span>'
#end if

# 7. Toetsing BGT — trillingen (§7.3.3)

'Eigenfrequentie (7.5), stijfheid (7.3), responssnelheid (7.4); (7.3) en (7.4) alleen bij f<sub>1</sub> > 8 Hz, anders nader onderzoek (§7.3.3(1))<span class="alleen-scherm">. Het blad toetst f<sub>1</sub> > 8 Hz daarom als eigen voorwaarde, met UC = 8 Hz/f<sub>1</sub>: ligt f<sub>1</sub> niet boven de 8 Hz, dan is de trilling niet aangetoond</span>.

@select controleer_trilling "Controleer trilling"
  Ja = 1
  Nee = 0
@end

#hide
'De trillingstoets hoort bij de balklaag zelf. Een onderslag draagt de balken;
'met hoh en EI/hoh zegt de toets daar niets over. Een raveelbalk met soort
'"Onderslag" blijft een balk in de balklaag.
tril_aan = controleer_trilling*(1 - ond)
#show
#if tril_aan ≡ 1
    '<span class="alleen-afdruk"></span>
    b_vloer = ?*(m)'<span class="alleen-scherm">, breedte van het vloerveld</span><span class="kolom-4"></span>'
    ζ = ?'<span class="alleen-scherm">, dempingsratio (§7.3.1: 0,01 zonder afwerklaag)</span><span class="kolom-4"></span>'
    a_tril = ?*(mm/kN)'<span class="alleen-scherm">, grenswaarde stijfheid (NB)</span><span class="kolom-4"></span>'
    b_tril = ?'<span class="alleen-scherm">, parameter bij de snelheidseis (figuur 7.2)</span><span class="kolom-4"></span>'
    '<h6>7.1 Stijfheden en eigenfrequentie (7.5)<span class="alleen-scherm"></span></h6>
    '<i>Per meter vloerbreedte: (EI)<sub>l</sub> in de overspanningsrichting, dus de balken, en (EI)<sub>b</sub> dwars daarop, het beschot (§7.3.3). De eigenfrequentie (7.5) hangt af van (EI)<sub>l</sub>, het aantal eigenmodi (7.7) van de verhouding (EI)<sub>l</sub>/(EI)<sub>b</sub>. De trillende massa is alleen het permanente gewicht (§7.3.3): de vloer trilt in de staat waarin hij normaal wordt gebruikt.</i><span class="alleen-scherm"></span>
    I_beschot = 1 m*t_vloer^3/12 to m^4'<span class="alleen-scherm"></span>'
    EI_l = E_mean*I_y/hoh to N*m^2/m', balken, in de overspanningsrichting<span class="alleen-scherm"></span>'
    EI_b = E_beschot*I_beschot/(1 m) to N*m^2/m', beschot, dwars op de balken<span class="alleen-scherm"></span>'
    m_opp = (G_k + g_balk/hoh)/(9.81 m/s^2) to kg/m^2', trillende massa<span class="alleen-scherm"></span>'
    #if schema ≡ 3
        L_tril = max(L_th; L_veld2)', langste veld<span class="alleen-scherm"></span>'
    #else
        L_tril = L_th', overspanning<span class="alleen-scherm"></span>'
    #end if
    EI_l'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    EI_b'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    m_opp'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    L_tril'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    f_1 = π/(2*L_tril^2)*sqrt(EI_l/m_opp) to Hz'<span class="alleen-scherm"></span>'
    #hide
    'Ligt f_1 niet boven de 8 Hz, dan gelden (7.3) en (7.4) niet: niet aangetoond.
    tril_na = bool(f_1 ≤ 8 Hz)
    #show
    f_1', (7.5)<span class="alleen-afdruk"></span>'
    #if tril_na ≡ 0
        '<span class="alleen-scherm">f<sub>1</sub> = 'f_1'</span><span class="oordeel" style="color: green"> > 8 Hz → (7.3) en (7.4) gelden</span>
    #else
        '<span class="alleen-scherm">f<sub>1</sub> = 'f_1'</span><span class="oordeel" style="color: red"> ≤ 8 Hz → <b>niet aangetoond</b>: (7.3) en (7.4) gelden niet, nader onderzoek volgens §7.3.3(1)</span>
    #end if

    '<h6>7.2 Criterium 1 — stijfheid onder 1 kN (formule 7.3)<span class="alleen-scherm"></span></h6>
    '<i>De puntlast spreidt over meerdere balken; k<sub>r</sub> uit §3 geeft het deel dat op de zwaarst belaste balk komt.</i><span class="alleen-scherm"></span>
    F_tril = 1 kN*k_r to kN', puntlast op één balk<span class="alleen-scherm"></span>'
    #if s3 ≡ 1
        '<i>De eenheidslast staat midden in het langste veld. Het andere veld houdt de ligger boven de tussenoplegging in: het steunmoment uit de drie-momentenvergelijking verkleint de zakking.</i><span class="alleen-scherm"></span>
        M_B,tril = 3*F_tril*L_tril^2/(16*(L_th + L_veld2)) to kN*m', steunmoment onder de eenheidslast<span class="alleen-scherm"></span>'
        w_1kN = F_tril*L_tril^3/(48*E_mean*I_y) - M_B,tril*L_tril^2/(16*E_mean*I_y) to mm'<span class="alleen-scherm"></span>'
    #else
        w_1kN = F_tril*L_tril^3/(48*E_mean*I_y) to mm'<span class="alleen-scherm"></span>'
    #end if
    w_per_kN = w_1kN/(1 kN) to mm/kN'<span class="alleen-scherm"></span>'
    '<span class="alleen-afdruk"></span>
    #if s3 ≡ 1
        F_tril'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        M_B,tril'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        w_per_kN'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #else
        F_tril'<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
        w_per_kN'<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #end if
    UC_tril_a = w_per_kN/a_tril'<span class="alleen-scherm"></span>'
    #if UC_tril_a ≤ 1.0
        '<span class="alleen-scherm">UC<sub>w/F</sub> = 'UC_tril_a'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>stijfheid voldoet</b></span><span class="alleen-scherm"></span>
    #else
        '<span class="alleen-scherm">UC<sub>w/F</sub> = 'UC_tril_a'</span><span class="oordeel" style="color: red"> > 1.0 → <b>stijfheid voldoet niet</b></span><span class="alleen-scherm"></span>
    #end if

    '<h6>7.3 Criterium 2 — responssnelheid (formules 7.4, 7.6, 7.7)<span class="alleen-scherm"></span></h6>
    '<i>Aantal eigenmodi onder 40 Hz (formule 7.7). Bij een zeer stijve vloer ligt f<sub>1</sub> al boven 40 Hz; dan is er geen enkele eigenmode onder de 40 Hz en wordt de term onder de wortel op nul afgekapt.</i><span class="alleen-scherm"></span>
    n_40_arg = max(0; (40 Hz/f_1)^2 - 1)'<span class="alleen-scherm"></span>'
    n_40 = (n_40_arg*(b_vloer/L_tril)^4*EI_l/EI_b)^0.25', formule 7.7<span class="alleen-scherm"></span>'
    v_resp = 4*(0.4 + 0.6*n_40)/(m_opp*b_vloer*L_tril + 200 kg) to m/(N*s^2)', formule 7.6<span class="alleen-scherm"></span>'
    v_lim = b_tril^(f_1*ζ/(1 Hz) - 1)*1 m/(N*s^2)', formule 7.4<span class="alleen-scherm"></span>'
    '<span class="alleen-afdruk"></span>
    n_40', (7.7)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    v_resp', (7.6)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    v_lim', (7.4)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    UC_tril_v = v_resp/v_lim'<span class="alleen-scherm"></span>'
    #if UC_tril_v ≤ 1.0
        '<span class="alleen-scherm">UC<sub>v</sub> = 'UC_tril_v'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>responssnelheid voldoet</b></span><span class="alleen-scherm"></span>
    #else
        '<span class="alleen-scherm">UC<sub>v</sub> = 'UC_tril_v'</span><span class="oordeel" style="color: red"> > 1.0 → <b>responssnelheid voldoet niet</b></span><span class="alleen-scherm"></span>
    #end if

    '<span class="alleen-afdruk"></span>
    UC_f1 = 8 Hz/f_1'<span class="alleen-scherm">, voorwaarde f<sub>1</sub> > 8 Hz</span><span class="alleen-scherm"></span>'
    UC_trilling = max(UC_tril_a; UC_tril_v; UC_f1)'<span class="alleen-scherm">: stijfheid (w<sub>per,kN</sub>/a<sub>tril</sub>), responssnelheid (v<sub>resp</sub>/v<sub>lim</sub>) en f<sub>1</sub> > 8 Hz (8 Hz/f<sub>1</sub>)</span>'
    #hide
    UC_tril_av = max(UC_tril_a; UC_tril_v)
    #show
    #if tril_na ≡ 1
        '<span class="alleen-scherm">UC<sub>trilling</sub> = 'UC_trilling'</span><span class="oordeel" style="color: red"> → <b>trillingen niet aangetoond</b> (f<sub>1</sub> ≤ 8 Hz, §7.3.3(1))</span>
    #else if UC_trilling ≤ 1.0
        '<span class="alleen-scherm">UC<sub>trilling</sub> = 'UC_trilling'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>trillingen voldoen</b></span>
    #else
        '<span class="alleen-scherm">UC<sub>trilling</sub> = 'UC_trilling'</span><span class="oordeel" style="color: red"> > 1.0 → <b>trillingen voldoen niet</b></span>
    #end if
#else if controleer_trilling ≡ 1
    'Trilling wordt niet getoetst: bij een onderslag niet van toepassing. De toets hoort bij de balklaag die op de onderslag rust.
    UC_trilling = 0'<span class="alleen-scherm"></span>'
    #hide
    tril_na = 0
    UC_tril_av = 0
    #show
#else
    'Trilling wordt niet getoetst (Controleer trilling = Nee).
    UC_trilling = 0'<span class="alleen-scherm"></span>'
    #hide
    tril_na = 0
    UC_tril_av = 0
    #show
#end if

# 8. Toetsing UGT

'<h6>8.1 Buiging — §6.1.6 (6.11)</h6>
σ_m,y,d = M_y,Ed/W_y to N/mm^2'<span class="kolom-2"></span>'
UC_buiging = σ_m,y,d/f_m,d'<span class="alleen-scherm"></span>'
UC_buiging' (σ<sub>m,y,d</sub>/f<sub>m,d</sub>)<span class="alleen-afdruk"></span>'
#if UC_buiging ≤ 1.0
    '<span class="alleen-scherm">UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    '<span class="alleen-scherm">UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>8.2 Afschuiving — §6.1.7 (6.13)</h6>
#hide
'Werkzame breedte b_ef = k_cr·b (6.13a). Voor een ligger met een prismatische
'doorsnede is k_cr = 1,0 (NB art. 6.1.7(2)): de volle breedte, in beide
'rekenwijzen. Ook 8.5 rekent zo.
#show
τ_d = V_z,Ed*S_y/(b_balk*I_y) to N/mm^2', k<sub>cr</sub> = 1,0 (NB art. 6.1.7(2))'
UC_afsch = τ_d/f_v,d'<span class="alleen-scherm"></span>'
UC_afsch' (τ<sub>d</sub>/f<sub>v,d</sub>)<span class="alleen-afdruk"></span>'
#if UC_afsch ≤ 1.0
    '<span class="alleen-scherm">UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    '<span class="alleen-scherm">UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>8.3 Oplegdruk — §6.1.5 (6.3), k<sub>c,90</sub> volgens 6.1.5(4)</h6>
'<i>Per steunpunt de grootste oplegreactie over de UGT-combinaties uit 5.2 (6.10a en 6.10b), met de puntlast op het steunpunt zelf, zoals bij V<sub>z,Ed</sub>. Het contactvlak is de breedte van de ligger maal de werkzame lengte l<sub>ef</sub>: de opleglengte plus 30 mm aan elke kant waar de ligger doorloopt (6.1.5(1)), dus aan de binnenzijde van een eindoplegging en aan weerszijden van een tussensteunpunt of het steunpunt onder een overstek. k<sub>c,90</sub> volgens 6.1.5(4): een ligger op losse steunpunten met l<sub>1</sub> ≥ 2h. Bij balken op een onderslag toetst het blad van de balklaag de onderzijde van de balk bij het tussensteunpunt (a<sub>steun</sub> = breedte van de onderslag). De bovenzijde van de onderslag onder die balken toetst geen van beide bladen: daar is de werkzame lengte de balkbreedte plus 2 × 30 mm, en k<sub>c,90</sub> = 1,0 zodra de vrije ruimte tussen de balken kleiner is dan 2h van de onderslag. Die zijde kan maatgevend zijn.</i><span class="alleen-scherm"></span>
#hide
'Oplegreactie in steunpunt i onder een lastset, in kN: 1 aan het begin van veld
'1, 2 het tweede steunpunt (eind van veld 1), 3 het eind van veld 2.
Rs(i; w1; w2; P1; P2; Ms) = if(i ≡ 1; Ra(w1; P1; Ms); if(i ≡ 3; Rc(w2; P2; Ms); w1*r_L1 + w2*(r_tot - r_L1) + P1 + P2 - Ra(w1; P1; Ms) - Rc(w2; P2; Ms)))
'De grootste reactie over de tien UGT-combinaties uit 5.2, en de puntlast op het
'steunpunt zelf: dezelfde veilige bovengrens als bij V_z,Ed. Rij 5 met de
'puntlast op het uiteinde van een overstek geeft bij het steunpunt eronder meer
'dan de puntlast zelf; die rij staat er dus ook in.
Rmx(i) = max(Rs(i; c1_w1; c1_w2; 0; 0; c1_m); Rs(i; c2_w1; c2_w2; 0; 0; c2_m); Rs(i; c3_w1; c3_w2; 0; 0; c3_m); Rs(i; c4_w1; c4_w2; c4_P1; 0; c4_m); Rs(i; c4_w1; c4_w2; 0; c5_P2; c5_m); Rs(i; a1_w1; a1_w2; 0; 0; a1_m); Rs(i; a2_w1; a2_w2; 0; 0; a2_m); Rs(i; a3_w1; a3_w2; 0; 0; a3_m); Rs(i; a4_w1; a4_w2; a4_P1; 0; a4_m); Rs(i; a4_w1; a4_w2; 0; a5_P2; a5_m); γ_G*Rs(i; bw1(1); bw2(1); 0; 0; mb_1) + γ_Q*F_n; γ_G,a*Rs(i; bw1(1); bw2(1); 0; 0; mb_1) + γ_Q,a*F_n)
'De kleinste reactie over dezelfde tien combinaties, zonder de bovengrens.
Rmn(i) = min(Rs(i; c1_w1; c1_w2; 0; 0; c1_m); Rs(i; c2_w1; c2_w2; 0; 0; c2_m); Rs(i; c3_w1; c3_w2; 0; 0; c3_m); Rs(i; c4_w1; c4_w2; c4_P1; 0; c4_m); Rs(i; c4_w1; c4_w2; 0; c5_P2; c5_m); Rs(i; a1_w1; a1_w2; 0; 0; a1_m); Rs(i; a2_w1; a2_w2; 0; 0; a2_m); Rs(i; a3_w1; a3_w2; 0; 0; a3_m); Rs(i; a4_w1; a4_w2; a4_P1; 0; a4_m); Rs(i; a4_w1; a4_w2; 0; a5_P2; a5_m))
'Alleen de permanente last, 6.10a (§8.5).
Rg(i) = γ_G,a*Rs(i; bw1(1); bw2(1); 0; 0; mb_1)
R_A,Ed = Rmx(1)*kN
R_B,Ed = Rmx(2)*kN
R_C,Ed = Rmx(3)*kN
#show
#if s3 ≡ 1
    a_steun = ?*(mm)'<span class="alleen-scherm">, opleglengte op het tussensteunpunt; bij balken op een onderslag de breedte van de onderslag (0 of leeg: a<sub>opl</sub>)</span><span class="kolom-4"></span>'
#else
    #hide
    a_steun = 0 mm
    #show
#end if
#hide
'Een blad uit een oudere versie kent a_steun niet; dan geldt de opleglengte.
a_steun = if(a_steun > 0 mm; a_steun; a_opl)
'Contactlengte bij het tweede steunpunt: bij twee velden het tussensteunpunt
'(a_steun), bij een overstek het steunpunt onder de kraag (a_opl).
l_B = if(s3 ≡ 1; a_steun; a_opl)
'k_c,90 volgens 6.1.5(4) voor een ligger op losse steunpunten met l_1 ≥ 2h; bij
'gelamineerd hout alleen bij een contactlengte tot 400 mm, anders 1,0.
kc_l1 = bool(L_th ≥ 2*h_balk)*if(s3 ≡ 1; bool(L_veld2 ≥ 2*h_balk); 1)
kc_gl = bool(max(a_opl; l_B) ≤ 400 mm)
k_c,90 = if(kc_l1 ≡ 1; if(gelijmd ≡ 1; if(kc_gl ≡ 1; 1.75; 1); 1.5); 1)
#show
f_c,90,d = k_mod*f_c,90,k/γ_M'<span class="alleen-scherm"></span>'
k_c,90'<span class="alleen-scherm">, 6.1.5(4)</span><span class="alleen-scherm"></span>'
l_ef,e = a_opl + min(30 mm; a_opl)'<span class="alleen-scherm">, eindoplegging: 30 mm verlenging aan de binnenzijde</span><span class="alleen-scherm"></span>'
#if s23 ≥ 1
    l_ef,s = l_B + 2*min(30 mm; l_B)'<span class="alleen-scherm">, tweede steunpunt: 30 mm aan weerszijden</span><span class="alleen-scherm"></span>'
#else
    #hide
    l_ef,s = l_ef,e
    #show
#end if
R_A,Ed'<span class="alleen-scherm">, eindoplegging A</span><span class="kolom-4"></span>'
#if s3 ≡ 1
    R_B,Ed'<span class="alleen-scherm">, tussensteunpunt</span><span class="kolom-4"></span>'
    R_C,Ed'<span class="alleen-scherm">, eindoplegging C</span><span class="kolom-4"></span>'
#else if s2 ≡ 1
    R_B,Ed'<span class="alleen-scherm">, steunpunt onder het overstek</span><span class="kolom-4"></span>'
#end if
l_ef,e'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#if s23 ≥ 1
    l_ef,s'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    '<i>Trek in een eindoplegging: R<sub>min</sub> is de kleinste reactie over de UGT-combinaties en over een evenwichtsset (EQU, NB tabel A1.2(A)) met 0,9·G op het veld van dat steunpunt en op het andere deel 1,1·G plus γ<sub>Q</sub>·q of γ<sub>Q</sub>·F; de verdeelde last en de puntlast staan, net als in 5.2, niet tegelijk. Een negatieve reactie moet met een verankering worden opgenomen.</i><span class="alleen-scherm"></span>
    #hide
    'EQU voor steunpunt A: 0,9·G op veld 1, en op het tweede deel 1,1·G met γ_Q·q
    'of met γ_Q·F. Voor steunpunt C (twee velden) gespiegeld.
    eq_G1 = 0.9*g_n
    eq_G2 = 1.1*g_n
    eA_q = Rs(1; eq_G1; eq_G2 + γ_Q*q_n; 0; 0; Mb(eq_G1; eq_G2 + γ_Q*q_n; 0; 0))
    eA_F = Rs(1; eq_G1; eq_G2; 0; γ_Q*F_n; Mb(eq_G1; eq_G2; 0; γ_Q*F_n))
    eC_q = Rs(3; eq_G2 + γ_Q*q_n; eq_G1; 0; 0; Mb(eq_G2 + γ_Q*q_n; eq_G1; 0; 0))
    eC_F = Rs(3; eq_G2; eq_G1; γ_Q*F_n; 0; Mb(eq_G2; eq_G1; γ_Q*F_n; 0))
    R_A,min = min(Rmn(1); eA_q; eA_F)*kN
    R_C,min = if(s3 ≡ 1; min(Rmn(3); eC_q; eC_F); Rmn(1))*kN
    #show
    #if s3 ≡ 1
        R_min = min(R_A,min; R_C,min)'<span class="alleen-scherm">, kleinste reactie in een eindoplegging (UGT en EQU)</span><span class="alleen-scherm"></span>'
    #else
        R_min = R_A,min'<span class="alleen-scherm">, kleinste reactie in de eindoplegging (UGT en EQU)</span><span class="alleen-scherm"></span>'
    #end if
    R_min', EQU<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if R_min < 0 kN
        '<span class="oordeel" style="color: red"> < 0 → <b>trek</b>: verankering per 'if(ond ≡ 1; "onderslag"; "balk")' van ten minste '-R_min' kN</span>
    #else
        '<span class="oordeel" style="color: green"> ≥ 0 → geen trek in de eindopleggingen</span><span class="alleen-scherm"></span>
    #end if
#else
    #hide
    R_min = 0 kN
    #show
#end if
#if s3 ≡ 1
    σ_c,90,e = max(R_A,Ed; R_C,Ed)/(b_balk*l_ef,e) to N/mm^2'<span class="alleen-scherm">, eindopleggingen</span><span class="alleen-scherm"></span>'
    σ_c,90,s = R_B,Ed/(b_balk*l_ef,s) to N/mm^2'<span class="alleen-scherm">, tussensteunpunt</span><span class="alleen-scherm"></span>'
    UC_c90 = max(σ_c,90,e; σ_c,90,s)/(k_c,90*f_c,90,d)
#else if s2 ≡ 1
    σ_c,90,e = R_A,Ed/(b_balk*l_ef,e) to N/mm^2'<span class="alleen-scherm">, eindoplegging</span><span class="alleen-scherm"></span>'
    σ_c,90,s = R_B,Ed/(b_balk*l_ef,s) to N/mm^2'<span class="alleen-scherm">, steunpunt onder het overstek</span><span class="alleen-scherm"></span>'
    UC_c90 = max(σ_c,90,e; σ_c,90,s)/(k_c,90*f_c,90,d)
#else
    σ_c,90,e = max(R_A,Ed; R_B,Ed)/(b_balk*l_ef,e) to N/mm^2'<span class="alleen-scherm">, eindopleggingen</span><span class="alleen-scherm"></span>'
    UC_c90 = σ_c,90,e/(k_c,90*f_c,90,d)
    #hide
    σ_c,90,s = 0 N/mm^2
    #show
#end if
#if UC_c90 ≤ 1.0
    '<span class="alleen-scherm">UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_c90'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    '<span class="alleen-scherm">UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_c90'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

#if s23 ≥ 1
    '<h6>8.4 Kip bij het steunmoment — §6.3.3 (6.30 t/m 6.34), l<sub>ef</sub> volgens tabel 6.1</h6>
    '<i>Bij een positief moment is de gedrukte bovenrand gesteund door het beschot, of bij een onderslag door de balken erop: daar geen kip. Bij het steunmoment is de onderrand gedrukt. l<sub>ef</sub> is de langste zone met een negatief moment naast het steunpunt, over alle UGT-combinaties, gerekend als een constant moment (tabel 6.1: 1,0·l) en zonder de aftrek van 0,5h voor een last op de getrokken rand; het steunpunt houdt de ligger tegen kantelen. Bij een overstek is dat de hele kraag.</i><span class="alleen-scherm"></span>
    #hide
    'Zone met een negatief moment: vanaf het steunpunt tot het laatste punt waar
    'de omhullende Mo_min niet onder nul komt, in 48 stappen per deel.
    i_n = 0
    #for i = 0 : 48
    i_n = if(Mo_min(r_L1*i/48) ≥ 0; i; i_n)
    #loop
    l_neg,1 = r_L1*(1 - i_n/48)*m
    i_n = 0
    #for i = 0 : 48
    i_n = if(Mo_min(r_tot - (r_tot - r_L1)*i/48) ≥ 0; i; i_n)
    #loop
    l_neg,2 = (r_tot - r_L1)*(1 - i_n/48)*m
    M_Ed,B = o_Ms*kN*m
    #show
    l_ef = max(l_neg,1; l_neg,2)'<span class="alleen-scherm">, tabel 6.1</span><span class="alleen-scherm"></span>'
    σ_m,crit = 0.78*b_balk^2*E_0,05/(h_balk*l_ef) to N/mm^2'<span class="alleen-scherm">, (6.32)</span><span class="alleen-scherm"></span>'
    λ_rel,m = sqrt(f_m,k/σ_m,crit)'<span class="alleen-scherm">, (6.30)</span><span class="alleen-scherm"></span>'
    #hide
    k_crit = if(λ_rel,m ≤ 0.75; 1; if(λ_rel,m ≤ 1.4; 1.56 - 0.75*λ_rel,m; 1/λ_rel,m^2))
    #show
    l_ef'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    σ_m,crit'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    λ_rel,m'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if k_crit < 1
        k_crit'<span class="alleen-scherm">, (6.34)</span><span class="kolom-4"></span>'
        UC_kip = M_Ed,B/(W_y*k_crit*f_m,d)
        #if UC_kip ≤ 1.0
            '<span class="alleen-scherm">UC<sub>kip</sub> = σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>) = 'UC_kip'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            '<span class="alleen-scherm">UC<sub>kip</sub> = σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>) = 'UC_kip'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #else
        '<i>Met k<sub>crit</sub> = 1 is de kiptoets gelijk aan de buigtoets bij het steunmoment en daarmee gedekt door 8.1; op papier staat hij daarom niet apart.</i><span class="alleen-scherm"></span>
        k_crit', gedekt door 8.1<span class="kolom-4"></span>'
        UC_kip = M_Ed,B/(W_y*k_crit*f_m,d)'<span class="alleen-scherm"></span>'
    #end if
#else
    #hide
    k_crit = 1
    UC_kip = 0
    #show
#end if

'<h6>8.5 Alleen permanente belasting — 6.10a met k<sub>mod,G</sub> = 'k_mod,G' (§3.1.3(2))</h6>
'<i>De combinatie met alleen de permanente last (γ<sub>G,a</sub>·G, zie 5.2) hoort bij de duurklasse blijvend: k<sub>mod</sub> is die van de kortst durende last in de combinatie. Buiging (met k<sub>crit</sub> bij het steunmoment), afschuiving en oplegdruk zoals hierboven, met die k<sub>mod</sub>.</i><span class="alleen-scherm"></span>
#hide
f_m,d,G = k_mod,G*f_m,k_eff/γ_M
f_v,d,G = k_mod,G*f_v,k/γ_M
f_c,90,d,G = k_mod,G*f_c,90,k/γ_M
M_Ed,G,veld = γ_G,a*M_g,veld*kN*m
M_Ed,G,steun = γ_G,a*M_g,steun*kN*m
τ_G = V_Ed,G*S_y/(b_balk*I_y) to N/mm^2
'De reacties zoals in 8.3: de eindopleggingen op l_ef,e, het tweede steunpunt
'op l_ef,s (alleen bij twee velden of een overstek).
R_G,e = max(Rg(1); if(s3 ≡ 1; Rg(3); if(s2 ≡ 1; Rg(1); Rg(2))))*kN
R_G,s = s23*Rg(2)*kN
σ_c,90,G = max(R_G,e/(b_balk*l_ef,e); R_G,s/(b_balk*l_ef,s)) to N/mm^2
#show
UC_G,m = max(M_Ed,G,veld; M_Ed,G,steun/k_crit)/(W_y*f_m,d,G)'<span class="alleen-scherm">, buiging</span><span class="alleen-scherm"></span>'
UC_G,v = τ_G/f_v,d,G'<span class="alleen-scherm">, afschuiving</span><span class="alleen-scherm"></span>'
UC_G,c90 = σ_c,90,G/(k_c,90*f_c,90,d,G)'<span class="alleen-scherm">, oplegdruk</span><span class="alleen-scherm"></span>'
UC_G = max(UC_G,m; UC_G,v; UC_G,c90)
#if UC_G ≤ 1.0
    '<span class="alleen-scherm">UC<sub>G</sub> = 'UC_G'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    '<span class="alleen-scherm">UC<sub>G</sub> = 'UC_G'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 9. Samenvatting

#hide
'Kleur per regel: rood zodra een toets boven 1,0 uitkomt, oranje vanaf 0,90
'(voldoet, maar zonder marge), anders groen.
kl_buig = if(UC_buiging > 1; 1; if(UC_buiging > 0.9; 2; 3))
kl_afsch = if(UC_afsch > 1; 1; if(UC_afsch > 0.9; 2; 3))
kl_c90 = if(UC_c90 > 1; 1; if(UC_c90 > 0.9; 2; 3))
kl_kip = if(UC_kip > 1; 1; if(UC_kip > 0.9; 2; 3))
kl_G = if(UC_G > 1; 1; if(UC_G > 0.9; 2; 3))
kl_door = if(UC_doorbuiging > 1; 1; if(UC_doorbuiging > 0.9; 2; 3))
kl_bij = if(UC_bij > 1; 1; if(UC_bij > 0.9; 2; 3))
kl_tril = if(UC_trilling > 1; 1; if(UC_trilling > 0.9; 2; 3))
c_1 = "#b91c1c"
c_2 = "#b45309"
c_3 = "#047857"
kleur_buig = if(kl_buig ≡ 1; c_1; if(kl_buig ≡ 2; c_2; c_3))
kleur_afsch = if(kl_afsch ≡ 1; c_1; if(kl_afsch ≡ 2; c_2; c_3))
kleur_c90 = if(kl_c90 ≡ 1; c_1; if(kl_c90 ≡ 2; c_2; c_3))
kleur_kip = if(kl_kip ≡ 1; c_1; if(kl_kip ≡ 2; c_2; c_3))
kleur_G = if(kl_G ≡ 1; c_1; if(kl_G ≡ 2; c_2; c_3))
kleur_door = if(kl_door ≡ 1; c_1; if(kl_door ≡ 2; c_2; c_3))
kleur_bij = if(kl_bij ≡ 1; c_1; if(kl_bij ≡ 2; c_2; c_3))
kleur_tril = if(kl_tril ≡ 1; c_1; if(kl_tril ≡ 2; c_2; c_3))
oordeel_buig = if(UC_buiging ≤ 1; "voldoet"; "voldoet niet")
oordeel_afsch = if(UC_afsch ≤ 1; "voldoet"; "voldoet niet")
oordeel_c90 = if(UC_c90 ≤ 1; "voldoet"; "voldoet niet")
oordeel_kip = if(UC_kip ≤ 1; "voldoet"; "voldoet niet")
oordeel_G = if(UC_G ≤ 1; "voldoet"; "voldoet niet")
oordeel_door = if(UC_doorbuiging ≤ 1; "voldoet"; "voldoet niet")
oordeel_bij = if(UC_bij ≤ 1; "voldoet"; "voldoet niet")
oordeel_tril = if(tril_na ≡ 1; "niet aangetoond: f₁ ≤ 8 Hz"; if(UC_trilling ≤ 1; "voldoet"; "voldoet niet"))
#show

'<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;">
'<th style="text-align:left; padding:2px 8px;">Toets</th>
'<th style="text-align:left; padding:2px 8px;">Norm</th>
'<th style="text-align:right; padding:2px 8px;">UC</th>
'<th style="text-align:left; padding:2px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Buiging</td>
'<td style="padding:2px 8px;">§6.1.6 (6.11)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_buig'">'UC_buiging'</td>
'<td style="padding:2px 8px; color:'kleur_buig'">'oordeel_buig'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Afschuiving</td>
'<td style="padding:2px 8px;">§6.1.7 (6.13)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_afsch'">'UC_afsch'</td>
'<td style="padding:2px 8px; color:'kleur_afsch'">'oordeel_afsch'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Oplegdruk</td>
'<td style="padding:2px 8px;">§6.1.5 (6.3)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_c90'">'UC_c90'</td>
'<td style="padding:2px 8px; color:'kleur_c90'">'oordeel_c90'</td></tr>
#if s23 ≥ 1
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Kip bij het steunmoment</td>
'<td style="padding:2px 8px;">§6.3.3 (6.33)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_kip'">'UC_kip'</td>
'<td style="padding:2px 8px; color:'kleur_kip'">'oordeel_kip'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Alleen permanent (k<sub>mod,G</sub>)</td>
'<td style="padding:2px 8px;">§3.1.3(2), 6.10a</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_G'">'UC_G'</td>
'<td style="padding:2px 8px; color:'kleur_G'">'oordeel_G'</td></tr>
#if controleer ≡ 1
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Doorbuiging, eindstand</td>
'<td style="padding:2px 8px;">§7.2 (7.2)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_door'">'UC_doorbuiging'</td>
'<td style="padding:2px 8px; color:'kleur_door'">'oordeel_door'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Doorbuiging, bijkomend</td>
'<td style="padding:2px 8px;">NB bij EN 1990, A1.4</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_bij'">'UC_bij'</td>
'<td style="padding:2px 8px; color:'kleur_bij'">'oordeel_bij'</td></tr>
#else
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Doorbuiging</td>
'<td style="padding:2px 8px;">§7.2</td>
'<td style="padding:2px 8px; text-align:right; color:#9ca3af;">—</td>
'<td style="padding:2px 8px; color:#9ca3af;">niet getoetst</td></tr>
#end if
#if tril_aan ≡ 1
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Trilling</td>
'<td style="padding:2px 8px;">§7.3.3 (7.3, 7.4)</td>
'<td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur_tril'">'UC_trilling'</td>
'<td style="padding:2px 8px; color:'kleur_tril'">'oordeel_tril'</td></tr>
#else
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:2px 8px;">Trilling</td>
'<td style="padding:2px 8px;">§7.3.3</td>
'<td style="padding:2px 8px; text-align:right; color:#9ca3af;">—</td>
'<td style="padding:2px 8px; color:#9ca3af;">'if(controleer_trilling ≡ 1; "n.v.t. bij een onderslag"; "niet getoetst")'</td></tr>
#end if
'</table>

UC_max = max(UC_doorbuiging; UC_bij; UC_buiging; UC_afsch; UC_c90; UC_kip; UC_G; UC_trilling)'<span class="alleen-scherm"></span>'
UC_max'<span class="alleen-afdruk"></span>'
#hide
'Alles behalve de voorwaarde f_1 > 8 Hz. Voldoet de rest, dan is de balklaag bij
'f_1 ≤ 8 Hz niet afgekeurd maar niet aangetoond: er is een nader onderzoek nodig.
UC_rest = max(UC_doorbuiging; UC_bij; UC_buiging; UC_afsch; UC_c90; UC_kip; UC_G; UC_tril_av)
#show
#if tril_na*bool(UC_rest ≤ 1) ≡ 1
    '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red"> → <b>Balklaag niet aangetoond</b>: f<sub>1</sub> ≤ 8 Hz, nader onderzoek naar de trillingen (§7.3.3(1))</span>
#else if UC_max ≤ 1.0
    '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>Balklaag voldoet</b></span>
#else
    '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red"> > 1.0 → <b>Balklaag voldoet niet</b></span>
#end if
#if R_min < 0 kN
    '<span style="color: #b91c1c"><b>Trek in een eindoplegging:</b> verankering per 'if(ond ≡ 1; "onderslag"; "balk")' van ten minste '-R_min' kN (8.3).</span>
#end if

'Aangenomen: bovenrand gesteund door beschot of balken ('if(s23 ≥ 1; "kip alleen bij het steunmoment"; "geen kip")'). Buiten dit blad: ondersteuning'if(ond ≡ 1; ", verbindingen en de druk onder de balken op de bovenzijde van de onderslag"; " en verbindingen")'.
`;
