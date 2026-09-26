/**
 * Balklaag — houten vloerbalken volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking voor de enkelvoudige ligger: permanente
 * en veranderlijke lijnlast en een geconcentreerde last met concentratiefactor
 * k_r, BGT-doorbuiging (w_fin met kruip k_def) en UGT (buiging §6.1.6 +
 * afschuiving §6.1.7). Daarnaast een overstek, twee velden en een raveelbalk:
 * vijf belastinggevallen (de veranderlijke last per veld apart, zodat bij twee
 * velden de schaakbordbelasting meedoet), de UGT- en BGT-combinaties in een
 * tabel en de omhullende M- en V-lijn. De soort ligger is een balk in een
 * balklaag of een onderslag met een belaste breedte; het profiel komt uit de
 * lijst of is zelf in te vullen.
 *
 * Eigengewicht balk: A · ρ_mean · g volgens EN 1991-1-1 / EN 338 (ρ_mean per
 * sterkteklasse). De referentie-uitwerking rekent met een vaste 550 kg/m³ én g = 10 m/s²;
 * hier de correcte ρ_mean (C24 = 420 kg/m³) met g = 9,81. Zie punt 8 in
 * docs/afwijkingen-referentie.md.
 *
 * Gecalibreerd op document1 t/m document9 — zie scripts/check-balklaag.mjs.
 * Belastinggevallen en combinaties: scripts/check-balklaag-schema3.mjs.
 */

export const balklaag = `"Balklaag — houten vloerbalken volgens EN 1995-1-1

'<i>Toetsing van een houten vloerbalk of onderslag op een enkelvoudige
'overspanning, met een overstek, op drie steunpunten of als raveelbalk, belast
'door permanente + veranderlijke vloerbelasting en een geconcentreerde last.
'BGT-doorbuiging incl. kruip en UGT-buiging + afschuiving.</i>

# 1. Profiel & materiaal

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

'<i>Staat de maat niet in de lijst, kies dan "Zelf invullen" en geef de breedte
'en de hoogte op. Zo zijn ook maten als 60×205, 63×211, 90×230 en 200×200 te
'rekenen.</i>
b_zelf = ?*(mm)', breedte — alleen bij profiel "Zelf invullen"'
h_zelf = ?*(mm)', hoogte — alleen bij profiel "Zelf invullen"'

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
'Materiaalmatrix: [id | f_m,k | f_v,k | E_mean | ρ_mean | γ_M]
materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |9000; 11000; 12000; 11500; 12600 |380; 420; 460; 420; 460 |1.30; 1.30; 1.30; 1.25; 1.25]

'Keuze 28 is "Zelf invullen": dan komen b en h uit de invoer.
b_balk = if(profiel ≡ 28; b_zelf; hlookup(profielen; profiel; 1; 2)*mm)
h_balk = if(profiel ≡ 28; h_zelf; hlookup(profielen; profiel; 1; 3)*mm)
f_m,k = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_v,k = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
ρ_mean = hlookup(materialen; sterkteklasse; 1; 5)*kg/m^3
γ_M = hlookup(materialen; sterkteklasse; 1; 6)
'k_mod (EN 1995-1-1 Tabel 3.1) — klimaatklasse 1 en 2 gelijk, klasse 3 lager:
k_mod_12 = if(duurklasse ≡ 1; 0.90; if(duurklasse ≡ 2; 0.80; if(duurklasse ≡ 3; 0.70; 0.60)))
k_mod_3 = if(duurklasse ≡ 1; 0.70; if(duurklasse ≡ 2; 0.65; if(duurklasse ≡ 3; 0.55; 0.50)))
k_mod = if(klimaat ≡ 3; k_mod_3; k_mod_12)
k_def = if(klimaat ≡ 1; 0.60; if(klimaat ≡ 2; 0.80; 2.00))', kruipfactor (Tabel 3.2)'
'Hoogtefactor k_h op f_m,k — massief §3.2(3) bij h < 150 mm, gelijmd gelamineerd
'§3.3(3) bij h < 600 mm. Op 71×221 is k_h = 1 voor massief en 1,10 voor GL.
h_ruw = h_balk/(1 mm)', balkhoogte als kaal getal in mm'
gelijmd = if(sterkteklasse ≡ 4; 1; if(sterkteklasse ≡ 5; 1; 0))
k_h_massief = if(h_ruw < 150; min(1.3; (150/h_ruw)^0.2); 1)
k_h_gelijmd = if(h_ruw < 600; min(1.1; (600/h_ruw)^0.1); 1)
k_h = if(gelijmd ≡ 1; k_h_gelijmd; k_h_massief)
f_m,k_eff = k_h*f_m,k', karakteristieke buigsterkte incl. hoogtefactor'
#show

'<h6>Gekozen profiel en materiaal</h6>
b_balk
h_balk
f_m,k
f_v,k
E_mean
k_mod
k_def
k_h
f_m,k_eff

f_m,d = k_mod*f_m,k_eff/γ_M', rekenwaarde buigsterkte (incl. k_h)'
f_v,d = k_mod*f_v,k/γ_M', rekenwaarde afschuifsterkte'
f_m,d
f_v,d

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

L_d = ?*(mm)', dagmaat (vrije overspanning) — bij twee velden die van het eerste veld'
a_opl = ?*(mm)', opleglengte per zijde'
hoh = ?*(mm)', hart-op-hart afstand van de balken'
t_vloer = ?*(mm)', dikte beschot'
E_beschot = ?*(N/mm^2)', E-modulus beschot (E_0,ser,rep)'
b_vloer = ?*(m)', breedte van het vloerveld — nodig voor de trillingstoets'

'<i>De maten hieronder gelden alleen voor het gekozen schema; bij een ander
'schema blijven ze buiten beschouwing.</i>
a_over = ?*(mm)', lengte van het overstek — alleen bij schema 2'
L_veld2 = ?*(mm)', tweede overspanning — alleen bij schema 3'
b_sparing = ?*(mm)', breedte van de sparing = overspanning raveelbalk — schema 4'
l_staart = ?*(mm)', staartlengte van de onderbroken balken — schema 4'

'<i>Een onderslag draagt een strook vloer in plaats van één balk. Bij balken
'die over twee gelijke velden doorlopen is die belaste breedte 1,25 × L, bij
'losse balken aan weerszijden de som van de halve overspanningen. De
'concentratiefactor k<sub>r</sub> is dan 1,0, en de trillingstoets (§9b) hoort
'bij de balklaag zelf: zet die voor een onderslag uit.</i>
b_ond = ?*(m)', belaste breedte — alleen bij soort ligger "Onderslag"'

#hide
'De theoretische overspanning van het maatgevende veld. Bij een raveelbalk is
'dat de breedte van de sparing tussen de wisselbalken, bij de overige schema's
'de dagmaat plus de opleglengte.
L_th_0 = L_d + a_opl
L_th_rav = b_sparing + a_opl
#show
L_th = if(schema ≡ 4; L_th_rav; L_th_0)', theoretische overspanning'

# 3. Belastingen

'<i>Eén permanente en één veranderlijke vloerbelasting. Wat daarin thuishoort
'bepaal je zelf: vloerafwerking, plafond, vaste scheidingswanden en overige
'blijvende lasten tellen op in G<sub>k</sub>. Verplaatsbare scheidingswanden
'horen volgens EN 1991-1-1 §6.3.1.2 juist bij de veranderlijke last Q<sub>k</sub>.
'Het eigen gewicht van de balk zelf komt hier niet bij — dat rekent de sheet
'in §4 zelf uit de doorsnede en de dichtheid.</i>

G_k = ?*(kN/m^2)', permanente vloerbelasting'
Q_k = ?*(kN/m^2)', veranderlijke vloerbelasting'
F_k = ?*(kN)', geconcentreerde last'

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

ψ_0_zelf = ?', ψ0 — alleen bij "zelf invullen"'
ψ_2_zelf = ?', ψ2 — alleen bij "zelf invullen"'

#hide
'ψ-factoren uit NEN-EN 1990 Tabel NB.2 — A1.1. Dezelfde waarden als het
'normblad "EN 1990 — Rekenwaarden" in de bibliotheek; één bron, zodat de
'twee niet uit elkaar kunnen lopen.
'   [categorie | ψ_0 | ψ_1 | ψ_2]
ψ_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0 |0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2 |0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0]
#show

ψ_0 = if(belastingcat ≡ 11; ψ_0_zelf; hlookup(ψ_tabel; belastingcat; 1; 2))
ψ_1 = if(belastingcat ≡ 11; ψ_0_zelf; hlookup(ψ_tabel; belastingcat; 1; 3))
ψ_2 = if(belastingcat ≡ 11; ψ_2_zelf; hlookup(ψ_tabel; belastingcat; 1; 4))

Q_k_eff = Q_k', veranderlijke vloerbelasting'

# 4. Doorsnede-eigenschappen

A = b_balk*h_balk
I_y = b_balk*h_balk^3/12', traagheidsmoment'
W_y = b_balk*h_balk^2/6', weerstandsmoment'
S_y = b_balk*h_balk^2/8', statisch moment (NL) voor afschuiving'

'<i><b>Splitspunt — eigen gewicht (register punt 8).</b> De referentie-uitwerking rekent met een
'vaste 550 kg/m³ én g = 10 m/s²; de norm met ρ<sub>mean</sub> uit EN 338 en
'g = 9,81. Welke van de twee de conclusie stuurt staat in de projectgegevens.</i>
#hide
ρ_xc = 550 kg/m^3
g_xc = 10 m/s^2
g_nb = 9.81 m/s^2
#show
g_balk_xc = A*ρ_xc*g_xc to kN/m', eigen gewicht — de referentie-uitwerking'
g_balk_nb = A*ρ_mean*g_nb to kN/m', eigen gewicht — EN 338'
g_balk = if(rekenwijze ≡ 1; g_balk_xc; g_balk_nb)', gehanteerd eigen gewicht'

# 4b. Rekenmodel van de ligger

'<i>De ligger bestaat uit veld 1 met overspanning L<sub>th</sub> en eventueel een
'tweede deel: het overstek (schema 2) of veld 2 (schema 3). Elk
'belastinggeval in §7 is een set van hoogstens vier lasten: een verdeelde last
'op veld 1 en op het tweede deel, een puntlast midden in veld 1 en een op het
'tweede deel (midden in veld 2, of op het uiteinde van het overstek).</i>

'<i>Bij twee velden volgt het steunmoment M<sub>B</sub> uit de
'drie-momentenvergelijking. Voor een gelijkmatige last w<sub>1</sub> op veld 1
'en w<sub>2</sub> op veld 2 is M<sub>B</sub> = (w<sub>1</sub>·L<sub>1</sub>³ +
'w<sub>2</sub>·L<sub>2</sub>³) / (8·(L<sub>1</sub> + L<sub>2</sub>)), voor een
'puntlast P midden in veld 1 M<sub>B</sub> = 3·P·L<sub>1</sub>² /
'(16·(L<sub>1</sub> + L<sub>2</sub>)). Bij een overstek volgt het uit het
'evenwicht van de kraag. Met M<sub>B</sub> bekend is elk veld een ligger op twee
'steunpunten met een inklemmend eindmoment; reacties, moment, dwarskracht en
'zakking volgen dan uit het evenwicht en de vormfuncties hieronder. Nagerekend
'tegen een onafhankelijke numerieke balkberekening.</i>

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

# 5. Belasting per balk

'<i>De belaste breedte hangt af van de soort ligger: bij een balk in een
'balklaag is dat de hart-op-hart afstand, bij een onderslag de ingevoerde
'strook vloer. Bij een raveelbalk is het de halve staartlengte: elke
'onderbroken balk zet zijn oplegreactie op de raveelbalk af, wat per
'strekkende meter neerkomt op een vloerstrook van l<sub>staart</sub>/2.</i>
b_belast = if(schema ≡ 4; l_staart/2; if(ligger ≡ 2; b_ond; hoh)) to mm', belaste breedte per meter balk'

P_g,k = b_belast*G_k + g_balk to kN/m', lijnlast permanent op de balk'
q_q,k = b_belast*Q_k_eff to kN/m', lijnlast veranderlijk'

'<i>Een puntlast verdeelt zich via het beschot over meerdere balken. De
'concentratiefactor k<sub>r</sub> bepaalt het deel dat op één balk komt
'(NEN-EN 1995-1-1 NB). Stijver beschot (dikker) → kleinere k<sub>r</sub>.</i>

#hide
a_ref = 1000 mm
'Derde term = (EI)_l/EI_ref, met (EI)_l = E_beschot·t³/12 per mm plaatbreedte.
'De E-modulus van het beschot is invoer (§2); vroeger stond hier een vaste
'7000 N/mm², waardoor een stijver of slapper beschot niet doorwerkte.
EI_ref = 50000000', referentiestijfheid per mm plaatbreedte (N·mm)'
t_ruw = t_vloer/(1 mm)
E_vl = E_beschot/(1 N/mm^2)', E-modulus beschot, dimensieloos voor de deling'
#show
k_r_0 = 0.37 + 0.8*hoh/a_ref - E_vl*t_ruw^3/12/EI_ref
'Bij een raveelbalk en bij een onderslag staat de puntlast rechtstreeks op de
'ligger; er is dan geen balklaag waarover hij zich verdeelt, dus k<sub>r</sub> = 1.
k_r = if(schema ≡ 4; 1; if(ligger ≡ 2; 1; min(1; k_r_0)))', concentratiefactor, afgetopt op 1,0 (NEN-EN 1995-1-1 NB)'
F_Q,k = F_k*k_r to kN', effectieve puntlast op één balk'

# 6. Doorsnede van de balklaag

#if ligger ≡ 1
'<i>Vloerhout (dikte t<sub>vloer</sub>) op de balken, hart-op-hart afstand hoh.</i>

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
'<svg viewbox="0 0 480 'svgH'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'svgH'px;">
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
'<i>Een onderslag: één ligger die de balken draagt, met een strook vloer van
'b<sub>ond</sub> = 'b_ond' per strekkende meter. De doorsnede staat op schaal.</i>
#hide
'Hoogte begrenzen op 110 px, breedte op 200 px.
o_sc = min(110/max(h_balk/(1 mm); 1); 200/max(b_balk/(1 mm); 1))
o_b = o_sc*b_balk/(1 mm)
o_h = o_sc*h_balk/(1 mm)
o_x = 240 - o_b/2
#show
'<svg viewbox="0 0 480 'o_h + 60'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'o_h + 60'px;">
'  <line x1="60" y1="24" x2="420" y2="24" style="stroke:#8B6F47; stroke-width:8; stroke-dasharray:12 30"/>
'  <text x="60" y="12" style="fill:#8B6F47">balken op de onderslag, belaste breedte 'b_ond' m</text>
'  <rect x="'o_x'" y="28" width="'o_b'" height="'o_h'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1"/>
'  <text x="'o_x + o_b + 10'" y="'28 + o_h/2'" style="fill:#8B6F47; font-weight:700">onderslag 'b_balk' × 'h_balk'</text>
'</svg>'
#end if

# 6b. Statisch schema

#if schema ≡ 4
    '<i>Plattegrond van de sparing. De onderbroken balken eindigen op de
    'raveelbalk; die draagt zijn last af op de twee wisselbalken ernaast. De
    'tekening staat op schaal.</i>

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
    '<svg viewbox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:230px;">
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

    '<i>De raveelbalk overspant de sparing en draagt per strekkende meter een
    'vloerstrook ter breedte van l<sub>staart</sub>/2. Hieronder staat hij als
    'gewone ligger op twee steunpunten.</i>
#end if

'<i>De ligger met de lijnlasten en de geconcentreerde last uit §5. De lasten
'zijn de karakteristieke waarden per balk; hoe ze over de velden verdeeld
'worden staat in §7, de combinaties in §8. De tekening staat op schaal.</i>

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
'<svg viewbox="0 0 480 212" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:232px;">
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
'<span style="display:inline-block; width:14px; border-top:3px solid #475569; vertical-align:middle"></span>&nbsp;permanent &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #B45309; vertical-align:middle"></span>&nbsp;veranderlijk, verdeeld &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #B91C1C; vertical-align:middle"></span>&nbsp;veranderlijk, geconcentreerd

'<i>Permanent en veranderlijk staan apart omdat ze met verschillende partiële
'factoren de UGT-combinatie in gaan (1,20 tegen 1,50) en in de BGT-combinaties
'elk hun eigen ψ-factor krijgen.</i>'

# 7. Belastinggevallen

'<i>De lasten per balk gaan in afzonderlijke belastinggevallen de berekening
'in, elk met zijn karakteristieke waarde:
'<ul>
'<li><b>BG1</b> — permanent P<sub>g,k</sub> op alle velden en het overstek;</li>
'<li><b>BG2</b> — veranderlijk q<sub>q,k</sub> op veld 1, bij een overstek ook op het overstek;</li>
'<li><b>BG3</b> — veranderlijk q<sub>q,k</sub> op veld 2 (alleen bij twee velden);</li>
'<li><b>BG4</b> — puntlast F<sub>Q,k</sub> midden in veld 1; bij een overstek ook op het uiteinde, de maatgevende van de twee;</li>
'<li><b>BG5</b> — puntlast F<sub>Q,k</sub> midden in veld 2 (alleen bij twee velden).</li>
'</ul>
'Bij twee velden staat de veranderlijke last per veld apart
'(schaakbordbelasting). Een belast buurveld trekt het veld via het steunmoment
'omhoog; blijft het buurveld onbelast, dan worden het veldmoment en de
'doorbuiging van het veld groter dan onder volle belasting. De permanente last
'gaat altijd met één factor over alle velden: volgens de NB bij tabel NB.4 —
'A1.2(B) hoeft het onderscheid tussen gunstig en ongunstig alleen voor het
'totaal van een soort belasting te worden gemaakt.</i>

'<i>Per geval de kenmerkende waarden en de M-, V- en u-lijn, op de lengteschaal
'van het statische schema. Het moment staat aan de trekzijde (een veldmoment
'onder de as), de dwarskracht positief boven de as, de zakking omlaag
'positief. Elke lijn heeft zijn eigen hoogteschaal.</i>

#hide
'Lasten als kaal getal in kN/m en kN.
g_n = P_g,k/(1 kN/m)
q_n = q_q,k/(1 kN/m)
F_n = F_Q,k/(1 kN)
s2 = bool(schema ≡ 2)
s3 = bool(schema ≡ 3)
'Bij een overstek staat de puntlast van BG4 midden in het veld of op het
'uiteinde. Getekend wordt de stand met het grootste moment: F·a tegen F·L/4.
e4 = s2*bool(a_over > L_th/4)
'De lastset van geval k: verdeelde last op veld 1 en op het tweede deel,
'puntlast midden in veld 1 en op het tweede deel.
bw1(k) = if(k ≡ 1; g_n; if(k ≡ 2; q_n; 0))
bw2(k) = if(k ≡ 1; g_n; if(k ≡ 2; q_n*s2; if(k ≡ 3; q_n*s3; 0)))
bP1(k) = if(k ≡ 4; F_n*(1 - e4); 0)
bP2(k) = if(k ≡ 4; F_n*e4; if(k ≡ 5; F_n*s3; 0))
'BG3 en BG5 bestaan alleen bij twee velden.
bg_aan(k) = if(k ≡ 3; s3; if(k ≡ 5; s3; 1))
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
'Lengteschaal van het statische schema (§6b).
lX(x) = sx1 + (sx3 - sx1)*x/r_tot
'Plaats van de puntlast op het tweede deel: midden in veld 2 of het uiteinde.
r_xP2 = if(s2 ≡ 1; r_tot; r_L1 + r_L2/2)
#show

#for k = 1 : 5
#if bg_aan(k) ≡ 1
    #if k ≡ 1
        '<h6>BG1 — permanent: P<sub>g,k</sub> = 'P_g,k' kN/m op alle velden</h6>
    #else if k ≡ 2
        '<h6>BG2 — veranderlijk: q<sub>q,k</sub> = 'q_q,k' kN/m op veld 1'if(s2 ≡ 1; " en het overstek"; "")'</h6>
    #else if k ≡ 3
        '<h6>BG3 — veranderlijk: q<sub>q,k</sub> = 'q_q,k' kN/m op veld 2</h6>
    #else if k ≡ 4
        '<h6>BG4 — puntlast: F<sub>Q,k</sub> = 'F_Q,k' kN 'if(e4 ≡ 1; "op het uiteinde van het overstek"; "midden in veld 1")'</h6>
    #else
        '<h6>BG5 — puntlast: F<sub>Q,k</sub> = 'F_Q,k' kN midden in veld 2</h6>
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
    M_veld1', grootste veldmoment in veld 1'
    #if s2 + s3 ≥ 1
        M_steun', steunmoment, trek aan de bovenzijde'
    #end if
    #if s3 ≡ 1
        M_veld2', grootste veldmoment in veld 2'
    #end if
    V_max', grootste dwarskracht'
    u_veld1', zakking midden in veld 1'
    #if s3 ≡ 1
        u_veld2', zakking midden in veld 2'
    #end if
    #if s2 ≡ 1
        u_eind', zakking van het uiteinde van het overstek'
    #end if
    #if k ≡ 4 and s2 ≡ 1
        '<i>De puntlast staat ook op de andere plaats (midden in het veld of op het
        'uiteinde); §8 neemt per grootheid de ongunstigste van de twee.</i>
    #end if
    #hide
    'Hoogteschalen van de drie lijnen van dit geval.
    b_Mv1 = M_veld1/(1 kN*m)
    b_Mv2 = M_veld2/(1 kN*m)
    b_Mp = max(b_Mv1; b_Mv2; 0)
    b_Mn = max(b_m; 0)
    b_sM = 36/max(b_Mp + b_Mn; 0.00001)
    b_yM = 30 + b_Mn*b_sM
    b_va = v1(0; b_w1; b_P1; b_m)
    b_vb = v1(r_L1; b_w1; b_P1; b_m)
    b_vc = v2(r_tot - r_L1; b_w2; b_P2; b_m)
    b_vd = v2(0; b_w2; b_P2; b_m)
    b_Vp = max(b_va; b_vc*r_twee; 0)
    b_Vn = max(-b_vb; -b_vd*r_twee; 0)
    b_sV = 36/max(b_Vp + b_Vn; 0.00001)
    b_yV = b_yM + b_Mp*b_sM + 26 + b_Vp*b_sV
    b_up = 0
    b_un = 0
    #for i = 0 : 16
    b_u1 = Ux(su(i); b_w1; b_w2; b_P1; b_P2; b_m)
    b_u2 = Ux(sv(i); b_w1; b_w2; b_P1; b_P2; b_m)
    b_up = max(b_up; b_u1; b_u2*r_twee)
    b_un = max(b_un; -b_u1; -b_u2*r_twee)
    #loop
    b_sU = 28/max(b_up + b_un; 0.00001)
    b_yU = b_yV + b_Vn*b_sV + 26 + b_un*b_sU
    b_H = b_yU + b_up*b_sU + 22
    b_u1m = Um1(b_w1; b_P1; b_m)
    b_u2m = Um2(b_w2; b_P2; b_m)
    b_ue = Ue(b_w1; b_w2; b_P1; b_P2; b_m)
    b_x1 = x1t(b_w1; b_P1; b_m)
    b_x2 = r_tot - t2t(b_w2; b_P2; b_m)
    b_kleur = if(k ≡ 1; "#475569"; if(k ≤ 3; "#B45309"; "#B91C1C"))
    #show
    '<svg viewbox="0 0 480 'b_H'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'b_H + 10'px;">
    '  <!-- de belasting van dit geval: een balk boven de belaste velden, een pijl voor de puntlast -->
    #if b_w1 > 0
        '  <rect x="'lX(0)'" y="6" width="'lX(r_L1) - lX(0)'" height="5" style="fill:'b_kleur'; opacity:0.6"/>
    #end if
    #if b_w2*r_twee > 0
        '  <rect x="'lX(r_L1)'" y="6" width="'lX(r_tot) - lX(r_L1)'" height="5" style="fill:'b_kleur'; opacity:0.6"/>
    #end if
    #if b_P1 > 0
        '  <polygon points="'lX(r_L1/2)','17' 'lX(r_L1/2) - 4.5','5' 'lX(r_L1/2) + 4.5','5'" style="fill:'b_kleur'"/>
    #end if
    #if b_P2 > 0
        '  <polygon points="'lX(r_xP2)','17' 'lX(r_xP2) - 4.5','5' 'lX(r_xP2) + 4.5','5'" style="fill:'b_kleur'"/>
    #end if
    '  <!-- opleggingen: stippellijnen door de drie lijnen -->
    '  <line x1="'lX(0)'" y1="20" x2="'lX(0)'" y2="'b_H - 14'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    '  <line x1="'lX(r_L1)'" y1="20" x2="'lX(r_L1)'" y2="'b_H - 14'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    #if s3 ≡ 1
        '  <line x1="'lX(r_tot)'" y1="20" x2="'lX(r_tot)'" y2="'b_H - 14'" style="stroke:#d1d5db; stroke-width:0.8; stroke-dasharray:3 3"/>
    #end if
    '  <!-- M-lijn, aan de trekzijde -->
    '  <polygon points="'lX(0)','b_yM'
    #for i = 0 : 25
    ' 'lX(sa(i))','b_yM + b_sM*Mx(sa(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 0 : 25
        ' 'lX(sb(i))','b_yM + b_sM*Mx(sb(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    ' 'lX(r_tot)','b_yM'" style="fill:rgba(239,68,68,0.20); stroke:#dc2626; stroke-width:1.4; stroke-linejoin:round"/>
    '  <line x1="'lX(0) - 6'" y1="'b_yM'" x2="'lX(r_tot) + 6'" y2="'b_yM'" style="stroke:#374151; stroke-width:1"/>
    '  <text x="8" y="'b_yM + 4'" style="fill:#dc2626; font-weight:700">M [kNm]</text>
    #if b_Mv1 > 0.00001
        '  <text x="'lX(b_x1)'" y="'b_yM + b_sM*b_Mv1 + 11'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_Mv1'</text>
    #end if
    #if b_Mn > 0.00001
        '  <text x="'lX(r_L1)'" y="'b_yM - b_sM*b_Mn - 4'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'-b_Mn'</text>
    #end if
    #if b_Mv2 > 0.00001
        '  <text x="'lX(b_x2)'" y="'b_yM + b_sM*b_Mv2 + 11'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_Mv2'</text>
    #end if
    '  <!-- V-lijn -->
    '  <polygon points="'lX(0)','b_yV'
    #for i = 0 : 25
    ' 'lX(sa(i))','b_yV - b_sV*Vx(sa(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 0 : 25
        ' 'lX(sb(i))','b_yV - b_sV*Vx(sb(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    ' 'lX(r_tot)','b_yV'" style="fill:rgba(59,130,246,0.18); stroke:#2563eb; stroke-width:1.4; stroke-linejoin:round"/>
    '  <line x1="'lX(0) - 6'" y1="'b_yV'" x2="'lX(r_tot) + 6'" y2="'b_yV'" style="stroke:#374151; stroke-width:1"/>
    '  <text x="8" y="'b_yV + 4'" style="fill:#2563eb; font-weight:700">V [kN]</text>
    '  <text x="'lX(0) + 3'" y="'b_yV - b_sV*b_va + if(b_va < 0; 11; -4)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_va'</text>
    '  <text x="'lX(r_L1) - 3'" y="'b_yV - b_sV*b_vb + if(b_vb < 0; 11; -4)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vb'</text>
    #if r_twee ≡ 1
        '  <text x="'lX(r_L1) + 3'" y="'b_yV - b_sV*b_vc + if(b_vc < 0; 11; -4)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vc'</text>
    #end if
    #if s3 ≡ 1
        '  <text x="'lX(r_tot) - 3'" y="'b_yV - b_sV*b_vd + if(b_vd < 0; 11; -4)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_vd'</text>
    #end if
    '  <!-- zakkingslijn, omlaag positief -->
    '  <polyline points="
    #for i = 0 : 16
    ' 'lX(su(i))','b_yU + b_sU*Ux(su(i); b_w1; b_w2; b_P1; b_P2; b_m)'
    #loop
    #if r_twee ≡ 1
        #for i = 1 : 16
        ' 'lX(sv(i))','b_yU + b_sU*Ux(sv(i); b_w1; b_w2; b_P1; b_P2; b_m)'
        #loop
    #end if
    '" style="fill:none; stroke:#2563eb; stroke-width:1.8; stroke-linejoin:round"/>
    '  <line x1="'lX(0) - 6'" y1="'b_yU'" x2="'lX(r_tot) + 6'" y2="'b_yU'" style="stroke:#9ca3af; stroke-width:1; stroke-dasharray:4 3"/>
    '  <text x="8" y="'b_yU + 4'" style="fill:#2563eb; font-weight:700">u [mm]</text>
    '  <text x="'lX(r_L1/2)'" y="'b_yU + b_sU*b_u1m + if(b_u1m < 0; -5; 12)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_u1m'</text>
    #if s3 ≡ 1
        '  <text x="'lX(r_L1 + r_L2/2)'" y="'b_yU + b_sU*b_u2m + if(b_u2m < 0; -5; 12)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_u2m'</text>
    #end if
    #if s2 ≡ 1
        '  <text x="'lX(r_tot) - 3'" y="'b_yU + b_sU*b_ue + if(b_ue < 0; -5; 12)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'b_ue'</text>
    #end if
    '  <!-- opleggingen onder de zakkingslijn -->
    '  <polygon points="'lX(0)','b_yU' 'lX(0) - 5','b_yU + 8' 'lX(0) + 5','b_yU + 8'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <polygon points="'lX(r_L1)','b_yU' 'lX(r_L1) - 5','b_yU + 8' 'lX(r_L1) + 5','b_yU + 8'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    #if s3 ≡ 1
        '  <polygon points="'lX(r_tot)','b_yU' 'lX(r_tot) - 5','b_yU + 8' 'lX(r_tot) + 5','b_yU + 8'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    #end if
    '</svg>'
#end if
#loop

# 8. Combinaties

'<i>De gevolgklasse staat in de projectgegevens en geldt voor alle bladen van
'dit project. De partiële factoren komen uit tabel NB.4 (CC2) of NB.5 (CC1 en
'CC3) van NEN-EN 1990; ψ<sub>2</sub> hoort bij de belastingcategorie uit §3.</i>
γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))', blijvend, ongunstig'
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))', veranderlijk'
q_Ed = γ_G*P_g,k + γ_Q*q_q,k to kN/m', rekenwaarde lijnlast op een belast veld'
g_Ed = γ_G*P_g,k to kN/m', rekenwaarde lijnlast op een onbelast veld'

#hide
'Lastset per UGT-combinatie (6.10b), als optelling van de belastinggevallen:
'  1  veld 1     γ_G·BG1 + γ_Q·BG2
'  2  steun      γ_G·BG1 + γ_Q·(BG2 + BG3)
'  3  veld 2     γ_G·BG1 + γ_Q·BG3
'  4  puntlast   γ_G·BG1 + γ_Q·BG4
'  5  puntlast   γ_G·BG1 + γ_Q·BG5
c1_w1 = γ_G*bw1(1) + γ_Q*bw1(2)
c1_w2 = γ_G*bw2(1) + γ_Q*bw2(2)
c1_m = γ_G*mb_1 + γ_Q*mb_2
c2_w1 = γ_G*bw1(1) + γ_Q*(bw1(2) + bw1(3))
c2_w2 = γ_G*bw2(1) + γ_Q*(bw2(2) + bw2(3))
c2_m = γ_G*mb_1 + γ_Q*(mb_2 + mb_3)
c3_w1 = γ_G*bw1(1) + γ_Q*bw1(3)
c3_w2 = γ_G*bw2(1) + γ_Q*bw2(3)
c3_m = γ_G*mb_1 + γ_Q*mb_3
c4_P1 = γ_Q*bP1(4)
c4_P2 = γ_Q*bP2(4)
c4_m = γ_G*mb_1 + γ_Q*mb_4
c5_P2 = γ_Q*bP2(5)
c5_m = γ_G*mb_1 + γ_Q*mb_5
'Uitkomsten van de combinaties met alleen verdeelde last.
M_Ed,veld1 = Mv1(c1_w1; 0; c1_m)*kN*m
M_Ed,steun = c2_m*kN*m
M_Ed,veld2 = Mv2(c3_w2; 0; c3_m)*kN*m
V_Ed,veld1 = Vmx(c1_w1; c1_w2; 0; 0; c1_m)*kN
V_Ed,steun = Vmx(c2_w1; c2_w2; 0; 0; c2_m)*kN
V_Ed,veld2 = Vmx(c3_w1; c3_w2; 0; 0; c3_m)*kN
'De puntlast: de maxima van de permanente last en de puntlast opgeteld, ook
'waar ze niet samenvallen — een veilige bovengrens. De puntlast staat midden in
'het veld en, bij een overstek, ook op het uiteinde; per grootheid telt de
'ongunstigste. Voor de dwarskracht staat hij vlak bij een oplegging.
m_Qv = Mb(0; 0; F_n; 0)
m_Qe = Mb(0; 0; 0; F_n*s2)
m_Q2 = Mb(0; 0; 0; F_n*s3)
M_g,k = max(Mv1(bw1(1); 0; mb_1); mb_1; Mv2(bw2(1); 0; mb_1))*kN*m
V_g,k = Vmx(bw1(1); bw2(1); 0; 0; mb_1)*kN
M_Q,k = max(Mv1(0; F_n; m_Qv); m_Qv; m_Qe)*kN*m
M_Q,k,2 = max(Mv2(0; F_n*s3; m_Q2); m_Q2)*kN*m
M_Ed,F1 = γ_G*M_g,k + γ_Q*M_Q,k
M_Ed,F2 = γ_G*M_g,k + γ_Q*M_Q,k,2
V_Ed,F1 = γ_G*V_g,k + γ_Q*F_Q,k
V_Ed,F2 = γ_G*V_g,k + γ_Q*F_Q,k*s3
#show

'<h6>8.1 Zakking per veld</h6>
'<i>De combinaties voor de doorbuiging tellen de zakkingen van de
'belastinggevallen op in een vast punt: het midden van elk veld. Heeft het veld
'een inklemmend eindmoment (schema 2 en 3), dan ligt de grootste zakking net
'naast het midden; daarvoor een toeslag van 4 %. Een veld dat omhoog komt telt
'als nul.</i>
#hide
'Toeslag op de zakking in het midden: 1,04 bij een inklemmend eindmoment. De
'puntlast midden in het veld van een overstek geeft geen eindmoment.
k_u = if(s2 + s3 ≥ 1; 1.04; 1)
k_uF = if(s3 ≡ 1; 1.04; 1)
u_g,k = k_u*max(Um1(bw1(1); 0; mb_1); 0)*mm
u_q,k = k_u*max(Um1(bw1(2); 0; mb_2); 0)*mm
'Bij een overstek staat de puntlast ook op het uiteinde; de grootste telt.
u_Q,k = max(k_uF*max(Um1(0; F_n; m_Qv); 0); Ue(0; 0; 0; F_n*s2; m_Qe))*mm
u_g,k,2 = k_u*max(Um2(bw2(1); 0; mb_1); 0)*mm
u_q,k,2 = k_u*max(Um2(bw2(3); 0; mb_3); 0)*mm
u_Q,k,2 = k_uF*max(Um2(0; F_n*s3; m_Q2); 0)*mm
#show
k_u', toeslag op de zakking in het midden van het veld'
u_g,k', veld 1 — BG1, permanent'
u_q,k', veld 1 — BG2, veranderlijk'
u_Q,k', veld 1 — BG4, puntlast (bij een overstek de grootste van veld en uiteinde)'
#if s3 ≡ 1
    u_g,k,2', veld 2 — BG1, permanent'
    u_q,k,2', veld 2 — BG3, veranderlijk'
    u_Q,k,2', veld 2 — BG5, puntlast'
#end if
'Splitspunt — welke veranderlijke doorbuiging meetelt (register punt 9).
u_var_xc = u_q,k to mm', de referentie-uitwerking: alleen de gelijkmatig verdeelde variant'
u_var_nb = max(u_q,k; u_Q,k) to mm', de norm: de maatgevende van de twee'
u_var = if(rekenwijze ≡ 1; u_var_xc; u_var_nb) to mm', gehanteerd, veld 1'
#if s3 ≡ 1
    u_var2_xc = u_q,k,2 to mm', idem veld 2, de referentie-uitwerking'
    u_var2_nb = max(u_q,k,2; u_Q,k,2) to mm', idem veld 2, de norm'
    u_var,2 = if(rekenwijze ≡ 1; u_var2_xc; u_var2_nb) to mm', gehanteerd, veld 2'
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

'<h6>8.2 Combinatietabel</h6>
'<i>Per combinatie de factor waarmee elk belastinggeval meetelt, en rechts de
'uitkomst: bij de UGT het maatgevende moment en de grootste dwarskracht, bij de
'BGT de zakking midden in het veld. In de BGT telt de puntlast mee in plaats
'van de verdeelde last als die de grootste zakking geeft (norm-stand, §8.1).</i>
#if s3 ≡ 1
    '<table style="width:100%; border-collapse:collapse; font-size:0.92em;">
    '<tr style="border-bottom:2px solid #374151;">
    '<th style="padding:4px 6px; text-align:left;">Combinatie</th>
    '<th style="padding:4px 6px; text-align:left;">Formule</th>
    '<th style="padding:4px 6px; text-align:center;">BG1</th>
    '<th style="padding:4px 6px; text-align:center;">BG2</th>
    '<th style="padding:4px 6px; text-align:center;">BG3</th>
    '<th style="padding:4px 6px; text-align:center;">BG4</th>
    '<th style="padding:4px 6px; text-align:center;">BG5</th>
    '<th style="padding:4px 6px; text-align:right;">Uitkomst</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT veld 1</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,veld1' kNm<br/>V<sub>Ed</sub> = 'V_Ed,veld1' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT steun</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,steun' kNm<br/>V<sub>Ed</sub> = 'V_Ed,steun' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT veld 2</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,veld2' kNm<br/>V<sub>Ed</sub> = 'V_Ed,veld2' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT puntlast veld 1</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,F1' kNm<br/>V<sub>Ed</sub> = 'V_Ed,F1' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT puntlast veld 2</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,F2' kNm<br/>V<sub>Ed</sub> = 'V_Ed,F2' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT karakteristiek veld 1</td>
    '<td style="padding:4px 6px;">6.14b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k + u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT karakteristiek veld 2</td>
    '<td style="padding:4px 6px;">6.14b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv2 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv2 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k,2 + u_var,2' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT quasi-blijvend veld 1</td>
    '<td style="padding:4px 6px;">6.16b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k + ψ_2*u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT quasi-blijvend veld 2</td>
    '<td style="padding:4px 6px;">6.16b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv2 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv2 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k,2 + ψ_2*u_var,2' mm</td></tr>
    '</table>
#else
    '<table style="width:100%; border-collapse:collapse; font-size:0.92em;">
    '<tr style="border-bottom:2px solid #374151;">
    '<th style="padding:4px 6px; text-align:left;">Combinatie</th>
    '<th style="padding:4px 6px; text-align:left;">Formule</th>
    '<th style="padding:4px 6px; text-align:center;">BG1</th>
    '<th style="padding:4px 6px; text-align:center;">BG2</th>
    '<th style="padding:4px 6px; text-align:center;">BG4</th>
    '<th style="padding:4px 6px; text-align:right;">Uitkomst</th></tr>
    #if s2 ≡ 1
        '<tr style="border-bottom:1px solid #e5e7eb;">
        '<td style="padding:4px 6px;">UGT veld en steun</td>
        '<td style="padding:4px 6px;">6.10b</td>
        '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
        '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
        '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
        '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,veld1' kNm (veld)<br/>M<sub>Ed</sub> = 'M_Ed,steun' kNm (steun)<br/>V<sub>Ed</sub> = 'V_Ed,veld1' kN</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;">
        '<td style="padding:4px 6px;">UGT veld</td>
        '<td style="padding:4px 6px;">6.10b</td>
        '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
        '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
        '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
        '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,veld1' kNm<br/>V<sub>Ed</sub> = 'V_Ed,veld1' kN</td></tr>
    #end if
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">UGT puntlast</td>
    '<td style="padding:4px 6px;">6.10b</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_G'</td>
    '<td style="padding:4px 6px; text-align:center; color:#9ca3af;">–</td>
    '<td style="padding:4px 6px; text-align:center;">'γ_Q'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">M<sub>Ed</sub> = 'M_Ed,F1' kNm<br/>V<sub>Ed</sub> = 'V_Ed,F1' kN</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT karakteristiek</td>
    '<td style="padding:4px 6px;">6.14b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "–"; "1.0")'</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "1.0"; "–")'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k + u_var' mm</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;">
    '<td style="padding:4px 6px;">BGT quasi-blijvend</td>
    '<td style="padding:4px 6px;">6.16b</td>
    '<td style="padding:4px 6px; text-align:center;">1.0</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; "–"; ψ_2)'</td>
    '<td style="padding:4px 6px; text-align:center;">'if(pv1 ≡ 1; ψ_2; "–")'</td>
    '<td style="padding:4px 6px; text-align:right; white-space:nowrap;">u = 'u_g,k + ψ_2*u_var' mm</td></tr>
    '</table>
#end if

'<i>Bij de puntlast zijn de maxima van BG1 en BG4 (of BG5) opgeteld, ook waar
'ze niet samenvallen: een veilige bovengrens. M<sub>y,Ed</sub> en
'V<sub>z,Ed</sub> in §10 zijn de grootste uitkomsten van de UGT-rijen; de
'zakkingen gaan per veld naar de toetsing in §9.</i>

# 9. Toetsing BGT — doorbuiging (§7.2)

'<i>De BGT kent twee combinaties die hier meedoen (EN 1990 §6.5.3):
'<ul>
'<li><b>Karakteristiek (6.14b)</b> — G<sub>k</sub> "+" Q<sub>k,1</sub> "+" Σψ<sub>0,i</sub>·Q<sub>k,i</sub>.
'Dit is de momentane doorbuiging w<sub>inst</sub>, zonder kruip: het doorzakken
'dat je meteen na het aanbrengen van de belasting ziet.</li>
'<li><b>Quasi-blijvend (6.16b)</b> — G<sub>k</sub> "+" Σψ<sub>2,i</sub>·Q<sub>k,i</sub>.
'Dit is het deel dat langdurig aanwezig blijft en dus kruipt. Met de kruipfactor
'k<sub>def</sub> (Tabel 3.2) volgt de eindstand w<sub>fin</sub>.</li>
'</ul>
'De eindstand combineert beide: w<sub>fin</sub> = (1+k<sub>def</sub>)·u<sub>g</sub>
'+ (1+ψ<sub>2</sub>·k<sub>def</sub>)·u<sub>var</sub> — de permanente last kruipt
'volledig, de veranderlijke alleen voor het quasi-blijvende deel ψ<sub>2</sub>.</i>

@select controleer "Controleer doorbuiging"
  Ja = 1
  Nee = 0
@end

@select grensfactor "Toelaatbare bijkomende doorbuiging"
  0.004 × L = 0.004
  0.003 × L = 0.003
  0.002 × L = 0.002
@end

#if controleer ≡ 1
    '<i>De zakkingen per veld komen uit §8.1; de opbouw van de combinaties staat in
    'de tabel van §8.2.</i>
    '<h6>9.1 Karakteristieke combinatie (6.14b) — momentane doorbuiging</h6>
    'w<sub>inst</sub> = 1,0·u<sub>g</sub> + 1,0·u<sub>var</sub>, zonder kruip, per veld:
    w_inst = u_g,k + u_var to mm', veld 1'
    #if s3 ≡ 1
        w_inst,2 = u_g,k,2 + u_var,2 to mm', veld 2'
    #end if

    '<h6>9.2 Quasi-blijvende combinatie (6.16b) — kruipdeel</h6>
    'Alleen het deel dat langdurig blijft staan kruipt: de volledige permanente
    'last plus ψ<sub>2</sub> maal de veranderlijke. Als lijnlast op een belast veld:
    q_qp = 1.0*P_g,k + ψ_2*q_q,k to kN/m', lijnlast die langdurig blijft staan'
    'Als zakking is dat de optelling van de belastinggevallen, per veld:
    w_qp = 1.0*u_g,k + ψ_2*u_var to mm', veld 1'
    w_kruip = k_def*w_qp to mm', bijkomende doorbuiging door kruip, veld 1'
    #if s3 ≡ 1
        w_qp,2 = 1.0*u_g,k,2 + ψ_2*u_var,2 to mm', veld 2'
        w_kruip,2 = k_def*w_qp,2 to mm', bijkomende doorbuiging door kruip, veld 2'
    #end if

    '<h6>9.3 Eindstand (§7.2, formule 7.2)</h6>
    'w<sub>fin</sub> = w<sub>inst</sub> + w<sub>kruip</sub>, gelijk aan
    '(1 + k<sub>def</sub>)·u<sub>g</sub> + (1 + ψ<sub>2</sub>·k<sub>def</sub>)·u<sub>var</sub>:
    w_fin = w_inst + w_kruip to mm', veld 1'
    w_lim = grensfactor*L_th', grens veld 1'
    #if s3 ≡ 1
        w_fin,2 = w_inst,2 + w_kruip,2 to mm', veld 2'
        w_lim,2 = grensfactor*L_veld2', grens veld 2'
        UC_doorbuiging = max(w_fin/w_lim; w_fin,2/w_lim,2)', het ongunstigste veld'
    #else
        UC_doorbuiging = w_fin/w_lim
    #end if
    #if UC_doorbuiging ≤ 1.0
        'UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>9.4 Doorbuigingslijn</h6>
    '<i>De onderbroken lijn is de momentane zakking (6.14b), de doorgetrokken
    'de eindstand inclusief kruip (6.16b). Beide op dezelfde schaal, zodat het
    'verschil laat zien wat de kruip er nog bovenop doet. Per veld staat de
    'veranderlijke last op dat veld (schaakbordbelasting); de waarden bij de
    'lijn zijn die uit §9.3, met de toeslag van 4 %.</i>
    #hide
    'Welk veranderlijk geval per veld meetelt: de verdeelde last, of in de
    'norm-stand de puntlast als die de grootste zakking geeft (§8.1). Bij een
    'overstek hoort het overstek bij veld 1: BG2 belast ze allebei.
    kv1 = if(pv1 ≡ 1; 4; 2)
    kv2 = if(pv2 ≡ 1; 5; 3)
    kvx(x) = if(s3*bool(x > r_L1) ≡ 1; kv2; kv1)
    Ubg(x; k) = Ux(x; bw1(k); bw2(k); bP1(k); bP2(k); mB_bg(k))
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
    w_H = uas + w_hi*w_s + 30 + (2 + s3)*15
    #show
    '<svg viewbox="0 0 480 'w_H'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'w_H + 10'px;">
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
    '  <circle cx="'lX(r_L1/2)'" cy="'uas + w_s*uf_x(r_L1/2)'" r="3" style="fill:#2563eb"/>
    '  <text x="'lX(r_L1/2)'" y="'uas + w_s*uf_x(r_L1/2) + if(uf_x(r_L1/2) < 0; -8; 17)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'w_fin' mm</text>
    #if s3 ≡ 1
        '  <circle cx="'lX(r_L1 + r_L2/2)'" cy="'uas + w_s*uf_x(r_L1 + r_L2/2)'" r="3" style="fill:#2563eb"/>
        '  <text x="'lX(r_L1 + r_L2/2)'" y="'uas + w_s*uf_x(r_L1 + r_L2/2) + if(uf_x(r_L1 + r_L2/2) < 0; -8; 17)'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'w_fin,2' mm</text>
    #end if
    '  <text x="'lX(0) + 8'" y="'w_H - 23 - s3*15'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">fin</tspan> (6.16b + kruip) = 'w_fin' mm — grens 'w_lim' mm'if(s3 ≡ 1; " (veld 1)"; "")'</text>
    #if s3 ≡ 1
        '  <text x="'lX(0) + 8'" y="'w_H - 23'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">fin</tspan> = 'w_fin,2' mm — grens 'w_lim,2' mm (veld 2)</text>
    #end if
    #if s3 ≡ 1
        '  <text x="'lX(0) + 8'" y="'w_H - 8'" style="fill:#60a5fa; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">inst</tspan> (6.14b) = 'w_inst' en 'w_inst,2' mm, onderbroken lijn</text>
    #else
        '  <text x="'lX(0) + 8'" y="'w_H - 8'" style="fill:#60a5fa; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">w<tspan baseline-shift="sub" font-size="8">inst</tspan> (6.14b) = 'w_inst' mm, onderbroken lijn</text>
    #end if
    '</svg>'
#else
    'Doorbuiging wordt niet getoetst (Controleer doorbuiging = Nee).
    UC_doorbuiging = 0
#end if

# 9b. Toetsing BGT — trillingen (§7.3.3)

'<i>De trillingstoets voor woonvloeren kent twee criteria naast de
'frequentie-eis: de stijfheid onder een puntlast van 1 kN (formule 7.3) en
'de responssnelheid op een eenheidsimpuls (formule 7.4). Beide gelden alleen
'als f<sub>1</sub> ≥ 8 Hz; daaronder vraagt de norm een volledige
'trillingsanalyse (§7.3.3(2)).</i>

@select controleer_trilling "Controleer trilling"
  Ja = 1
  Nee = 0
@end

ζ = ?', dempingsratio (§7.3.1: 0,01 voor vloeren zonder afwerklaag)'
a_tril = ?*(mm/kN)', grenswaarde stijfheid a (Tabel NB — 1,0 mm/kN)'
b_tril = ?', parameter b bij de snelheidseis (Figuur 7.2, ca. 120)'

#if controleer_trilling ≡ 1
    '<h6>9b.1 Stijfheden</h6>
    'Beschot, per meter vloerbreedte — draagt loodrecht op de balken:
    I_beschot = 1 m*t_vloer^3/12 to m^4
    EI_l = E_beschot*I_beschot/(1 m) to N*m^2/m', (EI)_l — beschot'
    'Balklaag, per meter vloerbreedte — de balken dragen in de overspanning:
    EI_b = E_mean*I_y/hoh to N*m^2/m', (EI)_b — balken'

    '<h6>9b.2 Eigenfrequentie (formule 7.5)</h6>
    'Trillende massa per m² — alleen het permanente gewicht (§7.3.3): de
    'veranderlijke belasting telt niet mee, want de vloer trilt in de staat
    'waarin hij normaal wordt gebruikt, niet onder vol belastingsontwerp.
    m_opp = (G_k + g_balk/hoh)/(9.81 m/s^2) to kg/m^2
    f_1 = π/(2*L_th^2)*sqrt(EI_b/m_opp) to Hz
    #if f_1 ≥ 8 Hz
        'f<sub>1</sub> = 'f_1'<span style="color: green"> ≥ 8 Hz → de twee criteria hieronder zijn van toepassing</span>
    #else
        'f<sub>1</sub> = 'f_1'<span style="color: red"> < 8 Hz → de vereenvoudigde toets vervalt; §7.3.3(2) vraagt een volledige trillingsanalyse</span>
    #end if

    '<h6>9b.3 Criterium 1 — stijfheid onder 1 kN (formule 7.3)</h6>
    'De puntlast spreidt over meerdere balken; k<sub>r</sub> uit §5 geeft het
    'deel dat op de zwaarst belaste balk komt.
    F_tril = 1 kN*k_r to kN', effectieve puntlast op één balk'
    w_1kN = F_tril*L_th^3/(48*E_mean*I_y) to mm
    w_per_kN = w_1kN/(1 kN) to mm/kN
    UC_tril_a = w_per_kN/a_tril
    #if UC_tril_a ≤ 1.0
        'UC<sub>w/F</sub> = 'UC_tril_a'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>w/F</sub> = 'UC_tril_a'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>9b.4 Criterium 2 — responssnelheid (formules 7.4, 7.6, 7.7)</h6>
    'Aantal eigenmodi onder 40 Hz (formule 7.7). Bij een zeer stijve vloer
    'ligt f_1 al boven 40 Hz; dan is er geen enkele eigenmode onder de 40 Hz
    'en wordt de term onder de wortel op nul afgekapt.
    n_40_arg = max(0; (40 Hz/f_1)^2 - 1)
    n_40 = (n_40_arg*(b_vloer/L_th)^4*EI_l/EI_b)^0.25
    'Responssnelheid op een eenheidsimpuls (formule 7.6):
    v_resp = 4*(0.4 + 0.6*n_40)/(m_opp*b_vloer*L_th + 200 kg) to m/(N*s^2)
    'Grenswaarde (formule 7.4): b^(f_1·ζ − 1)
    v_lim = b_tril^(f_1*ζ/(1 Hz) - 1)*1 m/(N*s^2)
    UC_tril_v = v_resp/v_lim
    #if UC_tril_v ≤ 1.0
        'UC<sub>v</sub> = 'UC_tril_v'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>v</sub> = 'UC_tril_v'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    UC_trilling = max(UC_tril_a; UC_tril_v)
    #if UC_trilling ≤ 1.0
        '<b>Trillingen voldoen</b> (maatgevende UC = 'UC_trilling')
    #else
        '<b><span style="color: red">Trillingen voldoen niet</span></b> (maatgevende UC = 'UC_trilling')
    #end if
#else
    'Trilling wordt niet getoetst (Controleer trilling = Nee).
    UC_trilling = 0
#end if

# 10. Toetsing UGT

'<h6>10.1 Maatgevende krachten</h6>
'<i>De grootste uitkomsten van de UGT-combinaties (6.10b) uit de tabel in §8.2.
'De doorsnede is prismatisch, dus alleen de grootte telt: veld of steun.</i>
#if s3 ≡ 1
    M_y,Ed = max(M_Ed,veld1; M_Ed,steun; M_Ed,veld2; M_Ed,F1; M_Ed,F2) to kN*m', maatgevend'
    V_z,Ed = max(V_Ed,veld1; V_Ed,steun; V_Ed,veld2; V_Ed,F1; V_Ed,F2) to kN', maatgevend'
#else if s2 ≡ 1
    M_y,Ed = max(M_Ed,veld1; M_Ed,steun; M_Ed,F1) to kN*m', maatgevend'
    V_z,Ed = max(V_Ed,veld1; V_Ed,F1) to kN', maatgevend'
#else
    M_y,Ed = max(M_Ed,veld1; M_Ed,F1) to kN*m', maatgevend'
    V_z,Ed = max(V_Ed,veld1; V_Ed,F1) to kN', maatgevend'
#end if

'<h6>10.1b Omhullende momenten- en dwarskrachtenlijn (UGT)</h6>

'<i>Per plaats het grootste en het kleinste moment en de grootste en kleinste
'dwarskracht over de UGT-combinaties uit §8.2, met de puntlast op zijn plaats
'uit BG4 en BG5: doorgetrokken de grootste waarde, onderbroken de kleinste. Het
'moment staat aan de trekzijde: een veldmoment onder de as, een steunmoment
'erboven. Bij de puntlast rekent §8 met de opgetelde maxima van
'BG1 en de puntlast; valt M<sub>y,Ed</sub> of V<sub>z,Ed</sub> daardoor hoger
'uit dan de lijn, dan is dat die veilige bovengrens.</i>

#hide
'Lastset van de puntlastcombinaties: de permanente last met γ_G op alle velden.
c4_w1 = γ_G*bw1(1)
c4_w2 = γ_G*bw2(1)
c5_w1 = γ_G*bw1(1)
c5_w2 = γ_G*bw2(1)
'Moment en dwarskracht van combinatie 1 tot en met 5 op afstand x.
Mo1(x) = Mx(x; c1_w1; c1_w2; 0; 0; c1_m)
Mo2(x) = Mx(x; c2_w1; c2_w2; 0; 0; c2_m)
Mo3(x) = Mx(x; c3_w1; c3_w2; 0; 0; c3_m)
Mo4(x) = Mx(x; c4_w1; c4_w2; c4_P1; c4_P2; c4_m)
Mo5(x) = Mx(x; c5_w1; c5_w2; 0; c5_P2; c5_m)
Vo1(x) = Vx(x; c1_w1; c1_w2; 0; 0; c1_m)
Vo2(x) = Vx(x; c2_w1; c2_w2; 0; 0; c2_m)
Vo3(x) = Vx(x; c3_w1; c3_w2; 0; 0; c3_m)
Vo4(x) = Vx(x; c4_w1; c4_w2; c4_P1; c4_P2; c4_m)
Vo5(x) = Vx(x; c5_w1; c5_w2; 0; c5_P2; c5_m)
'De omhullende: per plaats het grootste en het kleinste.
Mo_max(x) = max(Mo1(x); Mo2(x); Mo3(x); Mo4(x); Mo5(x))
Mo_min(x) = min(Mo1(x); Mo2(x); Mo3(x); Mo4(x); Mo5(x))
Vo_max(x) = max(Vo1(x); Vo2(x); Vo3(x); Vo4(x); Vo5(x))
Vo_min(x) = min(Vo1(x); Vo2(x); Vo3(x); Vo4(x); Vo5(x))
'Kenmerkende waarden van de omhullende. Het grootste veldmoment in veld 1 komt
'uit combinatie 1 of 4, in veld 2 uit 3 of 5; het steunmoment is overal het
'grootst bij de tussenoplegging. De dwarskracht daalt binnen elk veld, dus de
'uitersten liggen aan de randen.
o_M1a = Mv1(c1_w1; 0; c1_m)
o_M1b = Mv1(c4_w1; c4_P1; c4_m)
o_M1 = max(o_M1a; o_M1b)
o_x1 = if(o_M1b > o_M1a; x1t(c4_w1; c4_P1; c4_m); x1t(c1_w1; 0; c1_m))
o_M2a = Mv2(c3_w2; 0; c3_m)
o_M2b = Mv2(c5_w2; c5_P2; c5_m)
o_M2 = max(o_M2a; o_M2b)
o_x2 = r_tot - if(o_M2b > o_M2a; t2t(c5_w2; c5_P2; c5_m); t2t(c3_w2; 0; c3_m))
o_Ms = max(c1_m; c2_m; c3_m; c4_m; c5_m; 0)
o_Mp = max(o_M1; o_M2; 0.0001)
o_V0 = Vo_max(0)
o_VL = Vo_min(r_L1)
o_VR = Vo_max(r_L1 + (r_tot - r_L1)*10^-6)
o_VE = Vo_min(r_tot*(1 - 10^-9))
o_Vp = max(o_V0; o_VR*r_twee; 0.0001)
o_Vn = max(-o_VL; -o_VE*r_twee; 0)
'Schaal: het deel onder en boven de as past per lijn samen in 80 px.
m_s = 80/max(o_Mp + o_Ms; 0.0001)
my = 50 + o_Ms*m_s', as van de M-lijn'
v_s = 80/max(o_Vp + o_Vn; 0.0001)
vy2 = my + o_Mp*m_s + 76 + o_Vp*v_s', as van de V-lijn'
svg_mv = vy2 + o_Vn*v_s + 40
#show
'<svg viewbox="0 0 480 'svg_mv'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'svg_mv + 10'px;">
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
'  <text x="'lX(0) - 10'" y="'my - o_Ms*m_s - 30'" style="fill:#dc2626; font-weight:700">M-lijn, omhullende</text>
'  <text x="'lX(r_tot) + 10'" y="'my - o_Ms*m_s - 30'" text-anchor="end" style="fill:#374151">M<tspan baseline-shift="sub" font-size="8">y,Ed</tspan> = 'M_y,Ed' kNm (maatgevend)</text>
#if o_M1 > 0.00001
    '  <circle cx="'lX(o_x1)'" cy="'my + m_s*o_M1'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(o_x1)'" y="'my + m_s*o_M1 + 15'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_M1' kNm</text>
#end if
#if o_M2 > 0.00001
    '  <circle cx="'lX(o_x2)'" cy="'my + m_s*o_M2'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(o_x2)'" y="'my + m_s*o_M2 + 15'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_M2' kNm</text>
#end if
#if o_Ms > 0.00001
    '  <circle cx="'lX(r_L1)'" cy="'my - m_s*o_Ms'" r="2.4" style="fill:#dc2626"/>
    '  <text x="'lX(r_L1)'" y="'my - m_s*o_Ms - 8'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'-o_Ms' kNm</text>
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
'  <text x="'lX(0) - 10'" y="'vy2 - o_Vp*v_s - 30'" style="fill:#2563eb; font-weight:700">V-lijn, omhullende</text>
'  <text x="'lX(r_tot) + 10'" y="'vy2 - o_Vp*v_s - 30'" text-anchor="end" style="fill:#374151">V<tspan baseline-shift="sub" font-size="8">z,Ed</tspan> = 'V_z,Ed' kN (maatgevend)</text>
'  <text x="'lX(0) + 5'" y="'vy2 - v_s*o_V0 + if(o_V0 < 0; 15; -7)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_V0' kN</text>
'  <text x="'lX(r_L1) - 5'" y="'vy2 - v_s*o_VL + if(o_VL < 0; 15; -7)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VL' kN</text>
#if r_twee ≡ 1
    '  <text x="'lX(r_L1) + 5'" y="'vy2 - v_s*o_VR + if(o_VR < 0; 15; -7)'" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VR' kN</text>
#end if
#if s3 ≡ 1
    '  <text x="'lX(r_tot) - 5'" y="'vy2 - v_s*o_VE + if(o_VE < 0; 15; -7)'" text-anchor="end" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke; stroke-linejoin:round">'o_VE' kN</text>
#end if
'  <!-- opleggingen onder beide assen -->
'  <polygon points="'lX(0)','my' 'lX(0) - 8','my + 15' 'lX(0) + 8','my + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <line x1="'lX(0) - 12'" y1="'my + 15'" x2="'lX(0) + 12'" y2="'my + 15'" style="stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'lX(r_L1)','my' 'lX(r_L1) - 8','my + 12' 'lX(r_L1) + 8','my + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <circle cx="'lX(r_L1) - 3.6'" cy="'my + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <circle cx="'lX(r_L1) + 3.6'" cy="'my + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <line x1="'lX(r_L1) - 12'" y1="'my + 17.6'" x2="'lX(r_L1) + 12'" y2="'my + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'lX(0)','vy2' 'lX(0) - 8','vy2 + 15' 'lX(0) + 8','vy2 + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <line x1="'lX(0) - 12'" y1="'vy2 + 15'" x2="'lX(0) + 12'" y2="'vy2 + 15'" style="stroke:#92400e; stroke-width:1.2"/>
'  <polygon points="'lX(r_L1)','vy2' 'lX(r_L1) - 8','vy2 + 12' 'lX(r_L1) + 8','vy2 + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
'  <circle cx="'lX(r_L1) - 3.6'" cy="'vy2 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <circle cx="'lX(r_L1) + 3.6'" cy="'vy2 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
'  <line x1="'lX(r_L1) - 12'" y1="'vy2 + 17.6'" x2="'lX(r_L1) + 12'" y2="'vy2 + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
#if s3 ≡ 1
    '  <polygon points="'lX(r_tot)','my' 'lX(r_tot) - 8','my + 12' 'lX(r_tot) + 8','my + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
    '  <circle cx="'lX(r_tot) - 3.6'" cy="'my + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <circle cx="'lX(r_tot) + 3.6'" cy="'my + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <line x1="'lX(r_tot) - 12'" y1="'my + 17.6'" x2="'lX(r_tot) + 12'" y2="'my + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
    '  <polygon points="'lX(r_tot)','vy2' 'lX(r_tot) - 8','vy2 + 12' 'lX(r_tot) + 8','vy2 + 12'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1.2"/>
    '  <circle cx="'lX(r_tot) - 3.6'" cy="'vy2 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <circle cx="'lX(r_tot) + 3.6'" cy="'vy2 + 14.6'" r="2.6" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
    '  <line x1="'lX(r_tot) - 12'" y1="'vy2 + 17.6'" x2="'lX(r_tot) + 12'" y2="'vy2 + 17.6'" style="stroke:#92400e; stroke-width:1.2"/>
#end if
'</svg>'

'<h6>10.2 Buiging — §6.1.6 (6.11)</h6>
σ_m,y,d = M_y,Ed/W_y to N/mm^2
σ_m,y,d
UC_buiging = σ_m,y,d/f_m,d
#if UC_buiging ≤ 1.0
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>10.3 Afschuiving — §6.1.7 (6.13)</h6>
τ_d = V_z,Ed*S_y/(b_balk*I_y) to N/mm^2
UC_afsch = τ_d/f_v,d
#if UC_afsch ≤ 1.0
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 11. Samenvatting — alle unity checks

UC_max = max(UC_doorbuiging; UC_buiging; UC_afsch; UC_trilling)

#hide
'Kleur per regel: rood zodra een toets boven 1,0 uitkomt, oranje vanaf 0,90
'(voldoet, maar zonder marge), anders groen.
kl_buig = if(UC_buiging > 1; 1; if(UC_buiging > 0.9; 2; 3))
kl_afsch = if(UC_afsch > 1; 1; if(UC_afsch > 0.9; 2; 3))
kl_door = if(UC_doorbuiging > 1; 1; if(UC_doorbuiging > 0.9; 2; 3))
kl_tril = if(UC_trilling > 1; 1; if(UC_trilling > 0.9; 2; 3))
c_1 = "#b91c1c"
c_2 = "#b45309"
c_3 = "#047857"
kleur_buig = if(kl_buig ≡ 1; c_1; if(kl_buig ≡ 2; c_2; c_3))
kleur_afsch = if(kl_afsch ≡ 1; c_1; if(kl_afsch ≡ 2; c_2; c_3))
kleur_door = if(kl_door ≡ 1; c_1; if(kl_door ≡ 2; c_2; c_3))
kleur_tril = if(kl_tril ≡ 1; c_1; if(kl_tril ≡ 2; c_2; c_3))
oordeel_buig = if(UC_buiging ≤ 1; "voldoet"; "voldoet niet")
oordeel_afsch = if(UC_afsch ≤ 1; "voldoet"; "voldoet niet")
oordeel_door = if(UC_doorbuiging ≤ 1; "voldoet"; "voldoet niet")
oordeel_tril = if(UC_trilling ≤ 1; "voldoet"; "voldoet niet")
#show

'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;">
'<th style="text-align:left; padding:5px 8px;">Toets</th>
'<th style="text-align:left; padding:5px 8px;">Norm</th>
'<th style="text-align:right; padding:5px 8px;">UC</th>
'<th style="text-align:left; padding:5px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Buiging</td>
'<td style="padding:5px 8px;">§6.1.6 (6.11)</td>
'<td style="padding:5px 8px; text-align:right; font-weight:700; color:'kleur_buig'">'UC_buiging'</td>
'<td style="padding:5px 8px; color:'kleur_buig'">'oordeel_buig'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Afschuiving</td>
'<td style="padding:5px 8px;">§6.1.7 (6.13)</td>
'<td style="padding:5px 8px; text-align:right; font-weight:700; color:'kleur_afsch'">'UC_afsch'</td>
'<td style="padding:5px 8px; color:'kleur_afsch'">'oordeel_afsch'</td></tr>
#if controleer ≡ 1
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Doorbuiging</td>
'<td style="padding:5px 8px;">§7.2 (7.2)</td>
'<td style="padding:5px 8px; text-align:right; font-weight:700; color:'kleur_door'">'UC_doorbuiging'</td>
'<td style="padding:5px 8px; color:'kleur_door'">'oordeel_door'</td></tr>
#else
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Doorbuiging</td>
'<td style="padding:5px 8px;">§7.2</td>
'<td style="padding:5px 8px; text-align:right; color:#9ca3af;">—</td>
'<td style="padding:5px 8px; color:#9ca3af;">niet getoetst</td></tr>
#end if
#if controleer_trilling ≡ 1
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Trilling</td>
'<td style="padding:5px 8px;">§7.3.3 (7.3, 7.4)</td>
'<td style="padding:5px 8px; text-align:right; font-weight:700; color:'kleur_tril'">'UC_trilling'</td>
'<td style="padding:5px 8px; color:'kleur_tril'">'oordeel_tril'</td></tr>
#else
'<tr style="border-bottom:1px solid #e5e7eb;">
'<td style="padding:5px 8px;">Trilling</td>
'<td style="padding:5px 8px;">§7.3.3</td>
'<td style="padding:5px 8px; text-align:right; color:#9ca3af;">—</td>
'<td style="padding:5px 8px; color:#9ca3af;">niet getoetst</td></tr>
#end if
'</table>

#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Balklaag voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Balklaag voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten / vereenvoudigingen:
'<ul>
'<li>Eigengewicht balk met EN 338 ρ<sub>mean</sub> (C24 = 420 kg/m³) en
'g = 9,81 m/s². de referentie-uitwerking hanteert een vaste 550 kg/m³ met g = 10; resultaten
'hier daardoor iets gunstiger.</li>
'<li>Concentratiefactor k<sub>r</sub> geverifieerd op vier referentiebladen
'(beschot 18 en 25 mm, hoh 600 en 1000, twee profielen).</li>
'<li>Hoogtefactor k<sub>h</sub> geverifieerd in beide takken: gelijmd
'gelamineerd (GL24h, 221 mm → 1,10) en massief (71×146 → 1,005).</li>
'<li>Afschuiving met volle balkbreedte b (geen k<sub>cr</sub>-reductie), conform
'de referentie-uitwerking.</li>
'<li>Trillingstoets (§7.3) en kip zijn niet opgenomen (vloerbalk zijdelings
'gesteund door het beschot). Let op: bij overspanningen rond 5 m ligt f<sub>1</sub>
'onder de 8 Hz en is §7.3.3 wél van toepassing.</li>
'<li>Oplegdruk (§6.1.5) wordt niet getoetst, net zomin als in de referentie-uitwerking. Op het
'basisgeval is die u.c. 0,89 met k<sub>c,90</sub> = 1,25 — krap genoeg om apart
'na te lopen.</li>
'</ul></i>
`;
