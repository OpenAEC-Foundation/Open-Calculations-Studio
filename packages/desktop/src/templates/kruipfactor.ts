/**
 * Kruipcoëfficiënt φ(t;t₀) volgens NEN-EN 1992-1-1 bijlage B.
 *
 * Gecalibreerd op zes de referentie-uitwerking-referenties (t₀ = 28 d, h₀ = 300 mm):
 *   document1A  C45/55 · N · RH 50 → φ_RH 1,434 · β(f_cm) 2,308 · β(t₀) 0,488 ·
 *                                    φ₀ 1,617 · β_H 653 · β_c 0,998 · φ 1,614 → 1,61
 *   document3A  C20/25 · N · RH 50 → φ_RH 1,747 (B.3a) · β(f_cm) 3,175 ·
 *                                    φ₀ 2,709 · β_H 700 (B.8a) · φ 2,703 → 2,70
 *   document5A  C45/55 · N · RH 30 → φ_RH 1,640 · φ₀ 1,849 · φ 1,845 → 1,85
 *   document6A  C45/55 · N · RH 70 → φ_RH 1,229 · φ₀ 1,385 · φ 1,382 → 1,38
 *   document2A  C45/55 · R · RH 50 → zie afwijking 1
 *   document4A  C45/55 · S · RH 50 → zie afwijking 1
 *
 * LET OP 1: het gerapporteerde getal is φ(t;t₀), níét φ₀. Het referentieblad
 * rekent met t = 100000 dagen (≈ 274 jaar, praktisch t = ∞); φ₀ alleen zou
 * 1,62 opleveren. Een eerdere lezing schreef het verschil aan afkappen toe —
 * dat was onjuist, het is de tijdsfactor β_c.
 *
 * AFWIJKING 1: De referentie-uitwerking rekent (B.9) uit (R: t₀ 28 → 32,5 d · S: 28 → 24,2 d)
 * maar vult in (B.5) toch de onbewerkte 28 in, waardoor de cementklasse daar
 * géén effect heeft (N, R en S geven alle drie 1,61). Dit blad volgt de norm:
 * R → 1,57, S → 1,66.
 *
 * AFWIJKING 2: bij de referentie-uitwerking is β_H onafhankelijk van RH — de term
 * (0,012·RH)^18 draagt nooit bij, dus staat er bij RH 30/50/70 steeds 653 waar
 * bij RH 70 volgens de norm 673 hoort. Bij t = 100000 verandert dat het
 * eindresultaat niet (1,382 in beide gevallen); bij korte belastingduur wel.
 * Dit blad rekent de term mee.
 *
 * De invoer spiegelt het de referentie-uitwerking-scherm: betonkwaliteit, cementklasse, RH,
 * t₀ en h₀ als directe invoer (h₀ = 2·A_c/u wordt niet zelf uitgerekend).
 *
 * Variabelenamen komen exact overeen met KruipfactorDesigner.tsx.
 */

export const kruipfactor = `"Kruipfactor — φ(∞,t₀) volgens NEN-EN 1992-1-1 bijlage B

'<i>Kruip is de langzaam toenemende vervorming van beton onder een blijvende
'drukspanning. De kruipcoëfficiënt φ geeft aan hoeveel maal de elastische
'vervorming er uiteindelijk bij komt: ε<sub>cc</sub> = φ·σ<sub>c</sub>/E<sub>c</sub>.
'Bijlage B splitst φ<sub>0</sub> in drie factoren — het effect van de relatieve
'vochtigheid en de elementdikte (φ<sub>RH</sub>), de betonsterkte (β(f<sub>cm</sub>))
'en de ouderdom bij belasten (β(t<sub>0</sub>)).</i>

# 1. Invoer

@select betonkwaliteit "Betonkwaliteit"
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
  C70/85 = 70
  C80/95 = 80
  C90/105 = 90
@end

@select cementklasse "Cementklasse"
  S — langzaam verhardend (32,5 N) = 1
  N — normaal verhardend (32,5 R; 42,5 N) = 2
  R — snel verhardend (42,5 R; 52,5 N/R) = 3
@end

RH = ?', relatieve vochtigheid van de omgeving RH [%]'
t_0 = ?', ouderdom van het beton bij belasten t_0 [dagen]'
h_0 = ?*(mm)', theoretische dikte van het element h_0 (= 2·A_c/u)'

f_ck = betonkwaliteit N/mm^2', karakteristieke cilinderdruksterkte'
f_cm = f_ck + 8 N/mm^2', gemiddelde druksterkte — (3.1)'

f_ck
f_cm
RH
t_0
h_0

#hide
'De formules van bijlage B zijn empirisch en dimensioneel inconsistent: h_0 hoort
'er in mm in, f_cm in N/mm². Hieronder eenheidloos gemaakt.
h0_ = h_0/(1*mm)
fcm_ = f_cm/(1 N/mm^2)
α_cem = if(cementklasse ≡ 1; -1; if(cementklasse ≡ 2; 0; 1))', exponent uit (B<span>.</span>9)'
#show

# 2. Correctiefactoren voor de betonsterkte

'<i>Bij f<sub>cm</sub> > 35 N/mm² dempen de factoren α<sub>1</sub>…α<sub>3</sub> de
'kruip: sterker beton kruipt relatief minder.</i>

α_1 = (35/fcm_)^0.7
α_2 = (35/fcm_)^0.2
α_3 = (35/fcm_)^0.5
α_1
α_2
α_3

# 3. De drie deelfactoren van φ₀

'<h6>3.1 Relatieve vochtigheid en elementdikte — (B<span>.</span>3)</h6>

'<i>Droge lucht en een dunne doorsnede laten het beton sneller uitdrogen en dus
'meer kruipen. Bij f<sub>cm</sub> ≤ 35 geldt (B<span>.</span>3a), daarboven (B<span>.</span>3b) met α<sub>1</sub>
'en α<sub>2</sub>.</i>

#if fcm_ ≤ 35
    'f<sub>cm</sub> = 'f_cm' ≤ 35 N/mm² → (B<span>.</span>3a)
    φ_RH = 1 + (1 - RH/100)/(0.1*h0_^(1/3))
#else
    'f<sub>cm</sub> = 'f_cm' > 35 N/mm² → (B<span>.</span>3b), met α<sub>1</sub> en α<sub>2</sub>
    φ_RH = (1 + (1 - RH/100)/(0.1*h0_^(1/3))*α_1)*α_2
#end if
φ_RH

'<h6>3.2 Betonsterkte — (B<span>.</span>4)</h6>
β_fcm = 16.8/sqrt(fcm_)
β_fcm

'<h6>3.3 Ouderdom bij belasten — (B<span>.</span>5) met de cementcorrectie (B<span>.</span>9)</h6>

'<i>Snel verhardend cement (R) is bij dezelfde ouderdom al verder uitgehard en
'kruipt minder; langzaam verhardend (S) juist meer. (B<span>.</span>9) verrekent dat door de
'ouderdom te verschuiven. Bij klasse N is α = 0 en verandert er niets.</i>

t_0,cor = max(0.5; t_0*(9/(2 + t_0^1.2) + 1)^α_cem)', gecorrigeerde ouderdom (B<span>.</span>9)'
t_0,cor
β_t0 = 1/(0.1 + t_0,cor^0.20)
β_t0

# 4. Basiskruipcoëfficiënt φ₀

φ_0 = φ_RH*β_fcm*β_t0', basiskruipcoëfficiënt'
φ_0

'<b>φ<sub>0</sub> = φ<sub>RH</sub> · β(f<sub>cm</sub>) · β(t<sub>0</sub>) = 'φ_RH' · 'β_fcm' · 'β_t0' = <b>'φ_0'</b></b>

# 5. Ontwikkeling in de tijd

'<i>β<sub>c</sub> geeft welk deel van de basiskruip op tijdstip t is
'gerealiseerd; hij loopt van 0 op t = t<sub>0</sub> naar 1 op t = ∞. Het
'gerapporteerde eindresultaat is φ(t;t<sub>0</sub>) — niet φ<sub>0</sub>.</i>

t = ?', beschouwd tijdstip t [dagen] — 100000 ≈ het eindstadium'
t

'<i>Ook β<sub>H</sub> kent twee vormen: bij f<sub>cm</sub> ≤ 35 zonder
'α<sub>3</sub> (B<span>.</span>8a), daarboven mét (B<span>.</span>8b).</i>
#hide
β_H,romp = 1.5*(1 + (0.012*RH)^18)*h0_
α_H = if(fcm_ ≤ 35; 1; α_3)', α_3 telt alleen mee boven f_cm = 35'
#show
β_H = min(β_H,romp + 250*α_H; 1500*α_H)', (B<span>.</span>8a) resp. (B<span>.</span>8b)'
β_H
β_c = if(t ≤ t_0; 0; ((t - t_0)/(β_H + t - t_0))^0.3)', (B<span>.</span>7)'
β_c

# 6. Kruipcoëfficiënt

φ_t,nb = φ_0*β_c', volgens bijlage B'
'<i>Splitspunt (register punt 1 en 2). de referentie-uitwerking vult in (B.5) de onbewerkte
't<sub>0</sub> in — de cementcorrectie (B.9) wordt wél afgedrukt maar niet
'gebruikt — en laat β<sub>H</sub> onafhankelijk van de RH. Beide takken staan
'hieronder; de projectgegevens bepalen welke telt.</i>
#hide
'de referentie-uitwerking vult in (B.5) de ONgecorrigeerde t_0 in, ook al is (B.9) uitgerekend.
β_t0,XC = 1/(0.1 + t_0^0.20)
φ_0,XC = φ_RH*β_fcm*β_t0,XC
'Bij de referentie-uitwerking draagt de term (0,012·RH)^18 in β_H nooit bij.
β_H,XC = min(1.5*h0_ + 250*α_H; 1500*α_H)
β_c,XC = if(t ≤ t_0; 0; ((t - t_0)/(β_H,XC + t - t_0))^0.3)
#show
β_H,XC', β_H zoals de referentie-uitwerking hem neemt — zonder de RH-term'
φ_t,XC = φ_0,XC*β_c,XC', volgens de referentie-uitwerking'
φ_t = if(rekenwijze ≡ 1; φ_t,XC; φ_t,nb)', gehanteerde kruipcoëfficiënt'
φ_t,nb
φ_t,XC
φ_t

'<b>φ(t;t<sub>0</sub>) = φ<sub>0</sub> · β<sub>c</sub> = 'φ_0' · 'β_c' = <b>'φ_t'</b></b>

'<i>Effectieve elasticiteitsmodulus voor langeduureffecten (§7.4.3(5)):</i>
E_cm = 22000*((fcm_)/10)^0.3 N/mm^2', (3.14) — secantmodulus'
E_c,eff = E_cm/(1 + φ_t)', effectieve E-modulus onder blijvende belasting'
E_cm
E_c,eff

# 7. Afwijking ten opzichte van het referentieprogramma

'<i>Dit blad volgt NEN-EN 1992-1-1 bijlage B. Op twee punten wijkt de referentie-uitwerking
'daarvan af; hieronder staat wat dat bij déze invoer betekent. Het volledige
'register staat in <b>docs/afwijkingen-referentie</b>.</i>

#hide
Δφ = abs(φ_t,nb - φ_t,XC)
Δβ_H = β_H - β_H,XC
'Melden zodra φ óf β_H verschilt — β_H kan afwijken terwijl φ bij t → ∞ gelijk blijft.
afw = if(Δφ > 0.005; 1; if(Δβ_H > 0.5; 1; 0))
#show

#if afw ≡ 0
    '<span style="color: green">Bij deze invoer geeft de referentie-uitwerking hetzelfde resultaat:
    'φ = 'φ_t,XC'. Geen afwijking.</span>
#else
    '<b style="color: #1d4ed8">Bij deze invoer wijkt de referentie-uitwerking van de norm af.</b>
    'Dit blad volgt bijlage B; de waarde hiernaast is dus de juiste. Het verschil
    'staat hieronder zodat het bij een vergelijking te verklaren is.
    '<table style="border-collapse:collapse; font-size:13px">
    '<tr><th style="text-align:left; padding:2px 12px 2px 0">Grootheid</th><th style="text-align:right; padding-right:14px">dit blad — volgens de norm</th><th style="text-align:right">de referentie-uitwerking — afwijkend</th></tr>
    '<tr><td style="padding:2px 12px 2px 0">β(t<sub>0</sub>)</td><td style="text-align:right; padding-right:14px">'β_t0'</td><td style="text-align:right">'β_t0,XC'</td></tr>
    '<tr><td style="padding:2px 12px 2px 0">β<sub>H</sub></td><td style="text-align:right; padding-right:14px">'β_H'</td><td style="text-align:right">'β_H,XC'</td></tr>
    '<tr><td style="padding:2px 12px 2px 0"><b>φ(t;t<sub>0</sub>)</b></td><td style="text-align:right; padding-right:14px"><b>'φ_t,nb'</b></td><td style="text-align:right"><b>'φ_t,XC'</b></td></tr>
    '</table>
    #if cementklasse ≡ 2
    #else
        '· <b>Cementcorrectie (B<span>.</span>9).</b> Dit blad rekent β(t<sub>0</sub>) met de
        'gecorrigeerde ouderdom t<sub>0</sub> = 't_0,cor' dagen, zoals (B<span>.</span>9)
        'voorschrijft. De referentie-uitwerking rekent de correctie wél uit maar vult in (B<span>.</span>5)
        'de onbewerkte 't_0' dagen in, waardoor de cementklasse daar geen effect
        'heeft.
    #end if
    #if Δβ_H ≤ 0.5
    #else
        '· <b>β<sub>H</sub> uit (B<span>.</span>8).</b> Dit blad rekent de term
        '(0,012·RH)<sup>18</sup> mee; bij RH = 'RH' % levert die 'Δβ_H' extra op.
        'de referentie-uitwerking laat die term buiten beschouwing. Bij een lange
        'belastingduur werkt dit nauwelijks door in φ, bij een korte wél.
    #end if
#end if

# 8. Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Grootheid</th><th style="text-align:right">Waarde</th></tr>
'<tr><td style="padding:2px 12px 2px 0">φ<sub>RH</sub> — vochtigheid + dikte</td><td style="text-align:right">'φ_RH'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">β(f<sub>cm</sub>) — betonsterkte</td><td style="text-align:right">'β_fcm'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">β(t<sub>0</sub>) — ouderdom bij belasten</td><td style="text-align:right">'β_t0'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">φ<sub>0</sub> — basiskruipcoëfficiënt</td><td style="text-align:right">'φ_0'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">β<sub>H</sub> · β<sub>c</sub></td><td style="text-align:right">'β_H' · 'β_c'</td></tr>
'<tr><td style="padding:2px 12px 2px 0"><b>φ(t;t<sub>0</sub>) — kruipcoëfficiënt</b></td><td style="text-align:right"><b>'φ_t'</b></td></tr>
'<tr><td style="padding:2px 12px 2px 0">E<sub>c,eff</sub></td><td style="text-align:right">'E_c,eff'</td></tr>
'</table>

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Gecalibreerd op zes de referentie-uitwerking-referenties (t<sub>0</sub> = 28 d, h<sub>0</sub> = 300 mm):
'<b>C45/55 · N · RH 50</b> → φ 1,614 · <b>C20/25 · N · RH 50</b> → φ 2,703 (tak (B<span>.</span>3a) + (B<span>.</span>8a)) ·
'<b>C45/55 · N · RH 30</b> → φ<sub>RH</sub> 1,640 · φ 1,845 ·
'<b>C45/55 · N · RH 70</b> → φ<sub>RH</sub> 1,229 · φ 1,382 ·
'<b>C45/55 · R</b> en <b>· S</b> → zie hieronder. Beide takken van (B<span>.</span>3) én van
'(B<span>.</span>8) en de volledige RH-afhankelijkheid zijn daarmee geverifieerd.</li>
'<li><b>Het gerapporteerde getal is φ(t;t<sub>0</sub>), niet φ<sub>0</sub>.</b>
'Het referentieblad rekent met t = 100000 dagen (≈ 274 jaar, praktisch t = ∞) en
'komt zo op 1,614 → 1,61. Met φ<sub>0</sub> = 1,617 zou er 1,62 staan.</li>
'<li><b>β<sub>H</sub> kent twee vormen.</b> Bij f<sub>cm</sub> ≤ 35 geldt (B<span>.</span>8a)
'zónder α<sub>3</sub> — C20/25 geeft 1,5·1,0001·300 + 250 = 700. Daarboven geldt
'(B<span>.</span>8b) mét α<sub>3</sub>: C45/55 geeft 450 + 250·0,813 = 653. De begrenzing is
'navenant 1500 resp. 1500·α<sub>3</sub>.</li>
'<li><b>Bewuste afwijking 1 — cementklasse S en R.</b> Het referentieblad rekent
'(B<span>.</span>9) netjes uit (R: t<sub>0</sub> 28 → 32,5 d · S: 28 → 24,2 d) maar vult
'vervolgens in (B<span>.</span>5) tóch de onbewerkte 28 in. Daardoor heeft de cementklasse in
'de referentie-uitwerking geen enkel effect: N, R en S geven alle drie 1,61. Dit blad volgt de
'norm en gebruikt de gecorrigeerde t<sub>0</sub> — klasse R geeft φ = 1,57,
'klasse S geeft φ = 1,66. Bij klasse N (α = 0) is er geen verschil.</li>
'<li><b>Bewuste afwijking 2 — β<sub>H</sub> is bij de referentie-uitwerking
'RH-onafhankelijk.</b> De term (0,012·RH)<sup>18</sup> draagt er nooit bij: bij
'RH 30, 50 én 70 % print het blad steeds β<sub>H</sub> = 653. Volgens de norm
'hoort daar bij RH = 70 % 673 te staan. Bij t = 100000 dagen is β<sub>c</sub>
'toch al ≈ 0,998, dus het eindresultaat verschilt niet (1,382 in beide gevallen);
'bij korte belastingduur zou het wél schelen. Dit blad rekent de term gewoon
'mee.</li>
'<li>De cementcorrectie (B<span>.</span>9) grijpt alleen aan op β(t<sub>0</sub>), niet op
'β<sub>c</sub>(t;t<sub>0</sub>) — daar staat de werkelijke ouderdom bij belasten.</li>
'<li>h<sub>0</sub> is directe invoer, net als in de referentie-uitwerking. Bereken hem zelf als
'h<sub>0</sub> = 2·A<sub>c</sub>/u, met u de aan uitdroging blootgestelde omtrek.</li>
'<li>Bijlage B is opgesteld voor 40 % ≤ RH ≤ 100 % en normale
'beton­samenstellingen. Daarbuiten rekenen de formules door — het referentieblad
'accepteert RH = 30 % zonder meer — maar de uitkomst valt dan buiten het
'geldigheidsgebied. Bij hogesterktebeton met silica of bij verhoogde
'temperaturen gelden de aanvullende regels van bijlage B.</li>
'</ul></i>
`;
