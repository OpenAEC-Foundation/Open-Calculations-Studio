/**
 * Verankeringslengte van betonstaal volgens NEN-EN 1992-1-1 §8.4.
 *
 * Gecalibreerd op zeven referentieberekeningen (document1B t/m 7B), basis
 * C45/55 · B500B · Ø16 · c 30 · goed · recht → l_bd 379 mm. Varianten: slechte
 * aanhechting (542) · anders dan recht (436) · A_req/A_prov 300/500 (227) ·
 * C20/25 (651) · Ø6 met c 60 (ondergrens) · en de lijst per diameter. Alle
 * tussenstappen exact. Nog niet tegen een referentie getoetst: staven dikker
 * dan 32 mm (η₂ < 1), een niet-rechte staaf mét c_d > 3Ø, betonklassen boven
 * C50/60 en een staaf op druk.
 *
 * AFWIJKING — de referentie-uitwerking past α₁ = 0,70 toe zodra c_d > 3Ø, óók bij een RECHTE
 * staaf. Tabel 8.2 geeft voor rechte staven α₁ = 1,00 zonder voorwaarde. Twee
 * keer onafhankelijk gezien: document5B (Ø6 · c 60) en de per-diameterlijst van
 * document7B bij Ø6 en Ø8. de referentie-uitwerking komt daar op 100 en 107 mm waar de norm
 * 115 en 153 mm vraagt — dus een KORTERE verankering dan toegestaan. In de
 * referentiestand drukt het blad dan α₁ = 0,70 in het product af, met een rode
 * regel en de normwaarde eronder.
 *
 * LET OP — de referentie-uitwerking is niet consistent tussen modules: de bijlegwapening in
 * de voetplaatmodule rekent l_b,rqd met de formule van de nieuwe generatie
 * (α₁α₂·0,77·Ø·σ_sd/f_ck^⅔), terwijl dit blad de klassieke route van 2011
 * gebruikt — f_bd uit (8.2), dan (8.3). Beide krijgen het label (8.3). Voor
 * C25/30, Ø16, σ_sd 272 scheelt dat 351 tegen 341 mm. Zie
 * docs/afwijkingen-referentie.
 *
 * Staaf op druk (tabel 8.2): α₁ = α₂ = α₃ = α₅ = 1 en de ondergrens (8.7) met
 * 0,6·l_b,rqd. De referentie-uitwerking kent geen drukstaaf; daar splitst niets.
 *
 * log() in f_ctm is de natuurlijke logaritme: de evaluator kent geen ln().
 *
 * Variabelenamen komen exact overeen met VerankeringslengteDesigner.tsx.
 */

export const verankeringslengte = `"Verankeringslengte — betonstaal volgens NEN-EN 1992-1-1 §8.4

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

c_dek = ?*(mm)', dekking c, tevens de maatgevende c_d uit figuur 8.3'

@select aanhechting "Aanhechtingsomstandigheden"
  Goed = 1
  Slecht = 2
@end

@select staaftype "Staaftype"
  Recht = 1
  Anders dan recht = 2
@end

@select staafkracht "Staaf op"
  Trek = 1
  Druk = 2
@end

A_req = ?', benodigd wapeningsoppervlak [mm²], 0 = niet benutten'
A_prov = ?', aanwezig wapeningsoppervlak [mm²], 0 = niet benutten'

#hide
d_s = diameter*mm
fck_ = betonklasse
f_ck = betonklasse N/mm^2
f_yk = 500 N/mm^2
γ_s = 1.15
γ_c = 1.5
α_ct = 1.0
#show
f_ck
f_yd = f_yk/γ_s', rekenwaarde vloeigrens, alle B500-soorten'

# 2. Spanning in de staaf

#hide
σ_sd = if(A_req > 0; if(A_prov > 0; f_yd*A_req/A_prov; f_yd); f_yd)
#show
σ_sd', f_yd·A_req/A_prov; f_yd als een van beide 0 is'

# 3. Aanhechtspanning — (8.2)

#hide
f_ctm = if(fck_ ≤ 50; 0.30*fck_^(2/3); 2.12*log(1 + (fck_ + 8)/10)) N/mm^2
η_1 = if(aanhechting ≡ 1; 1.0; 0.7)
η_2 = if(diameter ≤ 32; 1.0; (132 - diameter)/100)
#show
f_ctm', tabel 3.1'
f_ctk = 0.7*f_ctm', f_ctk;0,05'
f_ctd = α_ct*f_ctk/γ_c', rekenwaarde treksterkte'
η_1', goede aanhechting 1,0, slechte 0,7'
η_2', 1,0 tot en met Ø32'
f_bd = 2.25*η_1*η_2*f_ctd', aanhechtspanning'

# 4. Basisverankeringslengte — (8.3)

l_b,rqd = (d_s/4)*(σ_sd/f_bd)

# 5. Correctiefactoren — tabel 8.2

#hide
c_d = c_dek
α_1 = if(staafkracht ≡ 2 or staaftype ≡ 1; 1.0; if(c_d > 3*d_s; 0.7; 1.0))
α_2 = if(staafkracht ≡ 2; 1.0; if(staaftype ≡ 1; min(max(1 - 0.15*(c_d - d_s)/d_s; 0.7); 1.0); min(max(1 - 0.15*(c_d - 3*d_s)/d_s; 0.7); 1.0)))
#show
#if staafkracht ≡ 2
    '<i>Staaf op druk: α<sub>1</sub> = α<sub>2</sub> = α<sub>3</sub> = α<sub>5</sub> = 1,0.</i>
#end if
α_1', staafvorm, 0,7 alleen bij een niet-rechte staaf met c_d > 3Ø'
α_2', dekking c_d'
α_3 = 1.0', geen niet-gelaste dwarswapening in rekening gebracht'
α_4 = 1.0', geen gelaste dwarsstaaf in rekening gebracht'
α_5 = 1.0', geen dwarsdruk in rekening gebracht'
#hide
α_235 = α_2*α_3*α_5
#show
#if α_235 ≥ 0.7
    'α<sub>2</sub>·α<sub>3</sub>·α<sub>5</sub> = 'α_235'<span style="color: green"> ≥ 0,7 → voldoet aan (8.5)</span>
#else
    'α<sub>2</sub>·α<sub>3</sub>·α<sub>5</sub> = 'α_235'<span style="color: red"> &lt; 0,7 → begrenzing (8.5) is maatgevend</span>
#end if

# 6. Minimale verankeringslengte

#if staafkracht ≡ 1
    l_b,min = max(0.3*l_b,rqd; max(10*d_s; 100 mm))', (8.6), trek'
#else
    l_b,min = max(0.6*l_b,rqd; max(10*d_s; 100 mm))', (8.7), druk'
#end if

# 7. Rekenwaarde van de verankeringslengte — (8.4)

#hide
l_bd,ber = α_1*α_2*α_3*α_4*α_5*l_b,rqd
l_bd,nb = max(l_bd,ber; l_b,min)
α_1,ref = if(staafkracht ≡ 1 and c_d > 3*d_s; 0.7; 1.0)
l_bd,ber,ref = α_1,ref*α_2*α_3*α_4*α_5*l_b,rqd
l_bd,ref = max(l_bd,ber,ref; l_b,min)
l_bd = if(rekenwijze ≡ 1; l_bd,ref; l_bd,nb)
α_1,geb = if(rekenwijze ≡ 1; α_1,ref; α_1)
l_bd,prod = if(rekenwijze ≡ 1; l_bd,ber,ref; l_bd,ber)
Δl = abs(l_bd,nb - l_bd,ref)/(1*mm)
#show
#if l_bd,prod ≥ l_b,min
    'α<sub>1</sub>·α<sub>2</sub>·α<sub>3</sub>·α<sub>4</sub>·α<sub>5</sub>·l<sub>b,rqd</sub> = 'α_1,geb' · 'α_2' · 'α_3' · 'α_4' · 'α_5' · 'l_b,rqd' = 'l_bd,prod' mm ≥ l<sub>b,min</sub> = 'l_b,min' mm
#else
    'α<sub>1</sub>·α<sub>2</sub>·α<sub>3</sub>·α<sub>4</sub>·α<sub>5</sub>·l<sub>b,rqd</sub> = 'α_1,geb' · 'α_2' · 'α_3' · 'α_4' · 'α_5' · 'l_b,rqd' = 'l_bd,prod' mm &lt; l<sub>b,min</sub> = 'l_b,min' mm: de ondergrens is maatgevend.
#end if
l_bd', gehanteerde verankeringslengte'
#if rekenwijze ≡ 1 and Δl > 0.5
    '<b style="color:#b91c1c">Korter dan tabel 8.2 toestaat: de referentie-uitwerking past α<sub>1</sub> = 'α_1,ref' ook op een rechte staaf toe. Volgens de norm:</b>
    l_bd,nb', met α_1 = 1,0 (tabel 8.2)'
#end if

# 8. Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Grootheid</th><th style="text-align:right">Waarde</th></tr>
'<tr><td style="padding:2px 12px 2px 0">f<sub>bd</sub> — aanhechtspanning</td><td style="text-align:right">'f_bd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">σ<sub>sd</sub> — staafspanning</td><td style="text-align:right">'σ_sd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">l<sub>b,rqd</sub> — basislengte</td><td style="text-align:right">'l_b,rqd'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">α<sub>1</sub>…α<sub>5</sub></td><td style="text-align:right">'α_1,geb' · 'α_2' · 'α_3' · 'α_4' · 'α_5'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">l<sub>b,min</sub></td><td style="text-align:right">'l_b,min'</td></tr>
'<tr><td style="padding:2px 12px 2px 0"><b>l<sub>bd</sub></b></td><td style="text-align:right"><b>'l_bd'</b></td></tr>
'</table>

'<hr/>
'<i>Aandachtspunten:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>c<sub>d</sub> is de ingevoerde dekking; bij kleine staafafstanden de kleinste waarde uit figuur 8.3 invullen (halve tussenafstand, zijdekking, dekking).</li><li>α<sub>3</sub> en α<sub>5</sub> staan op 1,0: dwarswapening en dwarsdruk zijn niet in rekening gebracht; dat ligt aan de veilige kant.</li></ul>
`;
