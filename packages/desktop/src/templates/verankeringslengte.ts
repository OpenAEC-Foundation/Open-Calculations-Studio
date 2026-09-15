/**
 * Verankeringslengte van betonstaal volgens NEN-EN 1992-1-1 §8.4.
 *
 * Gecalibreerd op zeven de referentie-uitwerking-referenties (document1B t/m 7B), basis
 * C45/55 · B500B · Ø16 · c 30 · goed · recht → l_bd 379 mm. Varianten: slechte
 * aanhechting (542) · anders dan recht (436) · A_req/A_prov 300/500 (227) ·
 * C20/25 (651) · Ø6 met c 60 (ondergrens) · en de lijst per diameter. Alle
 * tussenstappen exact.
 *
 * AFWIJKING — de referentie-uitwerking past α₁ = 0,70 toe zodra c_d > 3Ø, óók bij een RECHTE
 * staaf. Tabel 8.2 geeft voor rechte staven α₁ = 1,00 zonder voorwaarde. Twee
 * keer onafhankelijk gezien: document5B (Ø6 · c 60) en de per-diameterlijst van
 * document7B bij Ø6 en Ø8. de referentie-uitwerking komt daar op 100 en 107 mm waar de norm
 * 115 en 153 mm vraagt — dus een KORTERE verankering dan toegestaan.
 *
 * LET OP — de referentie-uitwerking is niet consistent tussen modules: de bijlegwapening in
 * de voetplaatmodule rekent l_b,rqd met de formule van de nieuwe generatie
 * (α₁α₂·0,77·Ø·σ_sd/f_ck^⅔), terwijl dit blad de klassieke route van 2011
 * gebruikt — f_bd uit (8.2), dan (8.3). Beide krijgen het label (8.3). Voor
 * C25/30, Ø16, σ_sd 272 scheelt dat 351 tegen 341 mm. Zie
 * docs/afwijkingen-referentie.
 *
 * Variabelenamen komen exact overeen met VerankeringslengteDesigner.tsx.
 */

export const verankeringslengte = `"Verankeringslengte — betonstaal volgens NEN-EN 1992-1-1 §8.4

'<i>Een staaf draagt zijn kracht via aanhechting over aan het beton. De
'benodigde lengte volgt uit de aanhechtspanning f<sub>bd</sub> en de spanning
'die de staaf moet ontwikkelen. De basislengte l<sub>b,rqd</sub> wordt daarna
'met vijf α-factoren gecorrigeerd voor staafvorm, dekking, dwarswapening,
'gelaste staven en dwarsdruk.</i>

# 1. Invoer

@select betonklasse "Betonsterkteklasse"
  C12/15 = 12
  C16/20 = 16
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
  C55/67 = 55
  C60/75 = 60
@end

@select betonstaal "Betonstaalsoort"
  B500A = 500
  B500B = 501
  B500C = 502
@end

@select diameter "Staafdiameter"
  6 mm = 6
  8 mm = 8
  10 mm = 10
  12 mm = 12
  16 mm = 16
  20 mm = 20
  25 mm = 25
  32 mm = 32
  40 mm = 40
@end

c_dek = ?*(mm)', dekking c — tevens de maatgevende c_d uit figuur 8.3'

@select aanhechting "Aanhechtingsomstandigheden"
  Goed = 1
  Slecht = 2
@end

@select staaftype "Staaftype"
  Recht = 1
  Anders dan recht = 2
@end

A_req = ?', benodigd wapeningsoppervlak [mm²] — 0 = niet benutten'
A_prov = ?', aanwezig wapeningsoppervlak [mm²] — 0 = niet benutten'

#hide
'De empirische formules rekenen met kale getallen; hieronder eenheidloos gemaakt.
d_s = diameter*mm', staafdiameter'
fck_ = betonklasse
f_yk = 500 N/mm^2', alle B500-soorten hebben dezelfde vloeigrens'
γ_s = 1.15
γ_c = 1.5
α_ct = 1.0
#show

f_ck = betonklasse N/mm^2
f_yd = f_yk/γ_s', rekenwaarde vloeigrens betonstaal'
d_s
f_yd

# 2. Spanning in de staaf

'<i>Wordt de wapening niet volledig benut, dan mag met de werkelijke
'staafspanning gerekend worden: σ<sub>sd</sub> = f<sub>yd</sub>·A<sub>req</sub>/A<sub>prov</sub>.
'Staan beide oppervlakken op nul, dan geldt de volle f<sub>yd</sub>.</i>

σ_sd = if(A_req > 0; if(A_prov > 0; f_yd*A_req/A_prov; f_yd); f_yd)', rekenwaarde van de spanning in de staaf'
σ_sd

# 3. Aanhechtspanning — (8.2)

'<i>η<sub>1</sub> verdisconteert de aanhechtingsomstandigheden, η<sub>2</sub>
'de staafdiameter (staven dikker dan 32 mm hechten relatief slechter).</i>

'<i>log() is hier de natuurlijke logaritme — de evaluator kent geen ln().</i>
f_ctm = if(fck_ ≤ 50; 0.30*fck_^(2/3); 2.12*log(1 + (fck_ + 8)/10)) N/mm^2', gemiddelde treksterkte (tabel 3.1)'
f_ctk = 0.7*f_ctm', f_ctk;0,05'
f_ctd = α_ct*f_ctk/γ_c', rekenwaarde treksterkte'
η_1 = if(aanhechting ≡ 1; 1.0; 0.7)', goede resp. slechte aanhechting'
η_2 = if(diameter ≤ 32; 1.0; (132 - diameter)/100)', diametereffect'
f_bd = 2.25*η_1*η_2*f_ctd', aanhechtspanning'

f_ctm
f_ctd
η_1
η_2
f_bd

# 4. Basisverankeringslengte — (8.3)

l_b,rqd = (d_s/4)*(σ_sd/f_bd)
l_b,rqd

# 5. Correctiefactoren — tabel 8.2

'<i>α<sub>1</sub> voor de staafvorm, α<sub>2</sub> voor de dekking,
'α<sub>3</sub> voor niet-gelaste dwarswapening, α<sub>4</sub> voor gelaste
'dwarsstaven en α<sub>5</sub> voor dwarsdruk. Het product
'α<sub>2</sub>·α<sub>3</sub>·α<sub>5</sub> mag niet onder 0,7 komen.</i>

c_d = c_dek', maatgevende dekking uit figuur 8.3'
α_1 = if(staaftype ≡ 1; 1.0; if(c_d > 3*d_s; 0.7; 1.0))', staafvorm — 0,7 alleen bij een niet-rechte staaf met c_d > 3Ø'
α_2 = if(staaftype ≡ 1; min(max(1 - 0.15*(c_d - d_s)/d_s; 0.7); 1.0); min(max(1 - 0.15*(c_d - 3*d_s)/d_s; 0.7); 1.0))', dekking'
α_3 = 1.0', geen niet-gelaste dwarswapening in rekening gebracht: K·λ = 0'
α_4 = 1.0', geen gelaste dwarsstaaf in rekening gebracht'
α_5 = 1.0', geen dwarsdruk in rekening gebracht'

α_1
α_2
α_3
α_4
α_5

α_235 = α_2*α_3*α_5
#if α_235 ≥ 0.7
    'α<sub>2</sub>·α<sub>3</sub>·α<sub>5</sub> = 'α_235'<span style="color: green"> ≥ 0,7 → voldoet aan (8.5)</span>
#else
    'α<sub>2</sub>·α<sub>3</sub>·α<sub>5</sub> = 'α_235'<span style="color: red"> &lt; 0,7 → begrenzing (8.5) is maatgevend</span>
#end if

# 6. Minimale verankeringslengte — (8.6)

l_b,min = max(0.3*l_b,rqd; max(10*d_s; 100 mm))', ondergrens bij verankering op trek'
l_b,min

# 7. Rekenwaarde van de verankeringslengte — (8.4)

l_bd,ber = α_1*α_2*α_3*α_4*α_5*l_b,rqd', vóór toetsing aan de ondergrens'
l_bd,nb = max(l_bd,ber; l_b,min)', volgens tabel 8.2'
'<i>Splitspunt — α<sub>1</sub> bij rechte staven (register punt 4). de referentie-uitwerking past
'α<sub>1</sub> = 0,70 toe zodra c<sub>d</sub> &gt; 3Ø, ook op een rechte staaf. De
'projectgegevens bepalen welke van de twee de conclusie stuurt; §8 hieronder laat
'beide zien.</i>
α_1,XC = if(c_d > 3*d_s; 0.7; 1.0)
l_bd,XC = max(α_1,XC*α_2*α_3*α_4*α_5*l_b,rqd; l_b,min)
l_bd = if(rekenwijze ≡ 1; l_bd,XC; l_bd,nb)', gehanteerde verankeringslengte'
l_bd,ber
l_bd,nb
l_bd,XC
l_bd

#if l_bd,ber ≥ l_b,min
    '<b>l<sub>bd</sub> = α<sub>1</sub>α<sub>2</sub>α<sub>3</sub>α<sub>4</sub>α<sub>5</sub>·l<sub>b,rqd</sub> = 'l_bd'</b> &gt; l<sub>b,min</sub> = 'l_b,min'
#else
    '<b>l<sub>bd</sub> = l<sub>b,min</sub> = 'l_bd'</b> — de berekende 'l_bd,ber' ligt onder de ondergrens van (8.6).
#end if

# 8. Afwijking ten opzichte van het referentieprogramma

'<i>Dit blad volgt tabel 8.2. Op één punt wijkt de referentie-uitwerking daarvan af; hieronder
'staat wat dat bij déze invoer betekent. Het volledige register staat in
'<b>docs/afwijkingen-referentie</b>.</i>

#hide
'Eenheidloos, anders vergelijkt de #if een lengte met een kaal getal.
Δl = abs(l_bd,nb - l_bd,XC)/(1*mm)
#show

#if Δl ≤ 0.5
    '<span style="color: green">Bij deze invoer geeft de referentie-uitwerking hetzelfde resultaat:
    'l<sub>bd</sub> = 'l_bd,XC'. Geen afwijking.</span>
#else
    '<b style="color: #1d4ed8">Bij deze invoer wijkt de referentie-uitwerking van de norm af.</b>
    'Welke van de twee de conclusie stuurt staat in de projectgegevens; dit blad
    'rekent nu met l<sub>bd</sub> = 'l_bd'.
    '<table style="border-collapse:collapse; font-size:13px">
    '<tr><th style="text-align:left; padding:2px 12px 2px 0">Grootheid</th><th style="text-align:right; padding-right:14px">dit blad — volgens de norm</th><th style="text-align:right">de referentie-uitwerking — afwijkend</th></tr>
    '<tr><td style="padding:2px 12px 2px 0">α<sub>1</sub></td><td style="text-align:right; padding-right:14px">'α_1'</td><td style="text-align:right">'α_1,XC'</td></tr>
    '<tr><td style="padding:2px 12px 2px 0"><b>l<sub>bd</sub></b></td><td style="text-align:right; padding-right:14px"><b>'l_bd,nb'</b></td><td style="text-align:right"><b>'l_bd,XC'</b></td></tr>
    '</table>
    '· <b>α<sub>1</sub> uit tabel 8.2.</b> Voor een <b>rechte</b> staaf is
    'α<sub>1</sub> altijd 1,00; de waarde 0,70 geldt alleen voor een staaf die
    'anders dan recht is én waarbij c<sub>d</sub> > 3Ø. Hier is c<sub>d</sub> =
    ''c_d' > 3Ø = '3*d_s', en de referentie-uitwerking past dan 0,70 toe ongeacht het
    'staaftype. Dat geeft een <b>kortere</b> verankering dan de norm toestaat.
#end if

# 9. Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Grootheid</th><th style="text-align:right">Waarde</th></tr>
'<tr><td style="padding:2px 12px 2px 0">f<sub>bd</sub> — aanhechtspanning</td><td style="text-align:right">'f_bd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">σ<sub>sd</sub> — staafspanning</td><td style="text-align:right">'σ_sd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">l<sub>b,rqd</sub> — basislengte</td><td style="text-align:right">'l_b,rqd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">α<sub>1</sub>…α<sub>5</sub></td><td style="text-align:right">'α_1' · 'α_2' · 'α_3' · 'α_4' · 'α_5'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">l<sub>b,min</sub></td><td style="text-align:right">'l_b,min'</td></tr>
'<tr><td style="padding:2px 12px 2px 0"><b>l<sub>bd</sub></b></td><td style="text-align:right"><b>'l_bd'</b></td></tr>
'</table>

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Gecalibreerd op <b>zeven</b> de referentie-uitwerking-referenties, basis C45/55 · B500B ·
'Ø16 · c 30 · goed · recht → l<sub>bd</sub> = 379 mm. Elk blad varieert één
'ding: <b>slechte aanhechting</b> (η<sub>1</sub> 0,70 → f<sub>bd</sub> 2,79 ·
'l<sub>bd</sub> 542) · <b>anders dan recht</b> (α<sub>2</sub> 1,00 →
'l<sub>bd</sub> 436) · <b>A<sub>req</sub>/A<sub>prov</sub> 300/500</b>
'(σ<sub>sd</sub> 261 → l<sub>bd</sub> 227) · <b>C20/25</b> (f<sub>ctd</sub> 1,03 ·
'f<sub>bd</sub> 2,32 → l<sub>bd</sub> 651) · <b>Ø6 met c 60</b> (ondergrens
'maatgevend) · en de <b>lijst per diameter</b>. Alle tussenstappen exact.</li>
'<li><b>Nog niet tegen een referentie getoetst:</b> staven dikker dan 32 mm
'(η<sub>2</sub> &lt; 1 — de referentielijst loopt tot Ø20), een niet-rechte
'staaf mét c<sub>d</sub> &gt; 3Ø (dan zou α<sub>1</sub> = 0,70 worden), en
'betonklassen boven C50/60.</li>
'<li>c<sub>d</sub> is hier gelijkgesteld aan de ingevoerde dekking, zoals in het
'referentieblad. Volgens figuur 8.3 is c<sub>d</sub> de kleinste van de halve
'hart-op-hart afstand, de zijdelingse dekking en de dekking — bij nauwe
'staafafstanden moet je die zelf bepalen en hier invullen.</li>
'<li>α<sub>3</sub> en α<sub>5</sub> staan op 1,0: niet-gelaste dwarswapening en
'dwarsdruk worden niet in rekening gebracht. Dat is veilig maar niet
'economisch; het referentieblad doet hetzelfde (K·λ = 0).</li>
'<li>l<sub>b,min</sub> geldt voor verankering <b>op trek</b>. Bij druk is de
'ondergrens 0,6·l<sub>b,rqd</sub> in plaats van 0,3·l<sub>b,rqd</sub>.</li>
'</ul></i>
`;
