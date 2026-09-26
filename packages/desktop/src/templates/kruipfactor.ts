/**
 * Kruipcoëfficiënt φ(t;t₀) volgens NEN-EN 1992-1-1 bijlage B.
 *
 * Gecalibreerd op zes referentieberekeningen (t₀ = 28 d, h₀ = 300 mm):
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
 * géén effect heeft (N, R en S geven alle drie 1,61). Volgens de norm:
 * R → 1,57, S → 1,66.
 *
 * AFWIJKING 2: bij de referentie-uitwerking is β_H onafhankelijk van RH — de term
 * (0,012·RH)^18 draagt nooit bij, dus staat er bij RH 30/50/70 steeds 653 waar
 * bij RH 70 volgens de norm 673 hoort. Bij t = 100000 verandert dat het
 * eindresultaat niet (1,382 in beide gevallen); bij korte belastingduur wel.
 *
 * Beide punten zijn een splitspunt op β(t₀) en β_H. Alles daarna (φ₀, β_c, φ)
 * rekent met de gekozen tak, zodat elke afgedrukte regel rekenkundig klopt. In
 * de referentiestand meldt het blad het wanneer φ volgens bijlage B hoger is.
 *
 * De invoer spiegelt het invoerscherm van de referentie-uitwerking: betonkwaliteit, cementklasse, RH,
 * t₀ en h₀ als directe invoer (h₀ = 2·A_c/u wordt niet zelf uitgerekend).
 *
 * Variabelenamen komen exact overeen met KruipfactorDesigner.tsx.
 */

export const kruipfactor = `"Kruipfactor — φ(t;t₀) volgens NEN-EN 1992-1-1 bijlage B

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
t = ?', beschouwd tijdstip t [dagen] — 100000 ≈ het eindstadium'

#if RH < 40
    '<b>Let op:</b> bijlage B geldt voor 40 % ≤ RH ≤ 100 %; RH = 'RH' % valt daarbuiten.
#end if

f_ck = betonkwaliteit N/mm^2', karakteristieke cilinderdruksterkte'
f_cm = f_ck + 8 N/mm^2', gemiddelde druksterkte — tabel 3.1'

#hide
'De formules van bijlage B zijn empirisch en dimensioneel inconsistent: h_0 hoort
'er in mm in, f_cm in N/mm². Hieronder eenheidloos gemaakt.
h0_ = h_0/(1*mm)
fcm_ = f_cm/(1 N/mm^2)
α_cem = if(cementklasse ≡ 1; -1; if(cementklasse ≡ 2; 0; 1))', exponent uit (B<span>.</span>9)'
#show

# 2. Correctiefactoren voor de betonsterkte

α_1 = (35/fcm_)^0.7', (B<span>.</span>8c), alleen bij f_cm > 35 N/mm²'
α_2 = (35/fcm_)^0.2
α_3 = (35/fcm_)^0.5

# 3. De drie deelfactoren van φ₀

#if fcm_ ≤ 35
    φ_RH = 1 + (1 - RH/100)/(0.1*h0_^(1/3))', (B<span>.</span>3a), f_cm ≤ 35 N/mm²'
#else
    φ_RH = (1 + (1 - RH/100)/(0.1*h0_^(1/3))*α_1)*α_2', (B<span>.</span>3b), f_cm > 35 N/mm²'
#end if
β_fcm = 16.8/sqrt(fcm_)', (B<span>.</span>4)'

#hide
t_0,cor = max(0.5; t_0*(9/(2 + t_0^1.2) + 1)^α_cem)
β_t0,nb = 1/(0.1 + t_0,cor^0.20)
'De referentie-uitwerking vult in (B.5) de onbewerkte t_0 in, ook al is (B.9) uitgerekend.
β_t0,ref = 1/(0.1 + t_0^0.20)
β_t0 = if(rekenwijze ≡ 1; β_t0,ref; β_t0,nb)
#show
#if rekenwijze ≡ 1
    β_t0', (B<span>.</span>5) met de onbewerkte t_0, zoals de referentie-uitwerking'
#else
    t_0,cor', gecorrigeerde ouderdom voor de cementklasse (B<span>.</span>9)'
    β_t0', (B<span>.</span>5) met t_0,cor'
#end if

# 4. Basiskruipcoëfficiënt φ₀

φ_0 = φ_RH*β_fcm*β_t0', (B<span>.</span>2)'

# 5. Ontwikkeling in de tijd

#hide
α_H = if(fcm_ ≤ 35; 1; α_3)', α_3 telt alleen mee boven f_cm = 35'
β_H,nb = min(1.5*(1 + (0.012*RH)^18)*h0_ + 250*α_H; 1500*α_H)
'Bij de referentie-uitwerking draagt de term (0,012·RH)^18 in β_H nooit bij.
β_H,ref = min(1.5*h0_ + 250*α_H; 1500*α_H)
β_H = if(rekenwijze ≡ 1; β_H,ref; β_H,nb)
#show
#if rekenwijze ≡ 1
    β_H', (B<span>.</span>8a/b) zonder de term (0,012·RH)^18, zoals de referentie-uitwerking'
#else
    β_H', (B<span>.</span>8a/b)'
#end if
#if t > t_0
    β_c = ((t - t_0)/(β_H + t - t_0))^0.3', (B<span>.</span>7)'
#else
    β_c = 0', t ≤ t_0'
#end if

# 6. Kruipcoëfficiënt

φ_t = φ_0*β_c', (B<span>.</span>1)'

E_cm = 22000*((fcm_)/10)^0.3 N/mm^2', secantmodulus — tabel 3.1'
E_c,eff = E_cm/(1 + φ_t)', effectieve E-modulus onder blijvende belasting (§7.4.3(5))'

#hide
'Bijlage B zonder de afwijkingen van de referentie-uitwerking, voor de melding hieronder.
β_c,nb = if(t ≤ t_0; 0; ((t - t_0)/(β_H,nb + t - t_0))^0.3)
φ_t,nb = φ_RH*β_fcm*β_t0,nb*β_c,nb
#show
#if rekenwijze ≡ 1
    #if φ_t,nb > φ_t + 0.005
        '<b>Let op:</b> volgens bijlage B is φ(t;t<sub>0</sub>) = 'φ_t,nb', hoger dan de waarde hierboven.
        'De referentie-uitwerking gebruikt de cementcorrectie (B<span>.</span>9) niet in (B<span>.</span>5).
    #end if
#end if
`;
