/**
 * Stabiliteit HSB-wanden — wandschijven in houtskeletbouw volgens
 * NEN-EN 1995-1-1:2005+A2:2014 met NB:2013, §9.2.4.2 (methode A).
 *
 * Eén bouwlaag, één richting. De horizontale belasting gaat via de vloer naar de
 * wanden in die richting, naar rato van hun schijfsterkte, met een torsiedeel
 * voor een excentriciteit ± e_F. Per wand volgen de schijfsterkte, de
 * verankering tegen kantelen en glijden, de gedrukte eindstijl (knik §6.3.2,
 * druk loodrecht op de onderregel §6.1.5), de schuifspanning in de beplating en
 * een indicatieve verplaatsing in het wandvlak.
 *
 * De hefboom in (9.23) is de meetellende lengte: een restpaneel smaller dan h/4
 * telt niet mee, een smal paneel naar rato van c_i. Het anker wordt alleen
 * ontlast door de permanente last op de eindstijl zelf: bij methode A gaat de
 * last op de tussenstijlen rechtstreeks naar de onderregel.
 *
 * De sterkte per verbindingsmiddel komt uit §8.2.2 (Johansen) met de
 * stuiksterkten van §8.3.1, inclusief de Nederlandse regels voor gipskarton- en
 * gipsvezelplaat (NB.8.1, NB.8.2 en Tabel NB.2).
 *
 * De verplaatsing is een ingenieursmodel per paneel (slip, afschuiving van de
 * plaat), het grootste van het volle en het restpaneel, plus ankerslip en rek
 * van de eindstijlen. Zonder G of K_ser is ze niet bepaald; de slotzin zegt dan
 * "niet bepaald" en niet "voldoen", zodat de kop van het rapport geen
 * "voldoet" meldt voor een blad dat niet volledig is getoetst.
 *
 * De uitdraai toont per wand de krachten en de unity checks in tabellen; de
 * rekenregels staan één keer in §8.2. Voor deze module bestaat geen
 * referentieberekening; scripts/check-hsb-stabiliteit.mjs rekent de uitkomsten
 * onafhankelijk na, ook de verborgen tussenstappen. Status in de catalogus:
 * controleren.
 */

export const hsbStabiliteit = `"Stabiliteit HSB-wanden — één wandschijf of meerdere stabiliteitswanden

'<i>Eén bouwlaag in één richting, methode A (§9.2.4.2). Een wand is een dicht wanddeel met een
'anker aan beide einden; de dichte delen naast een opening zijn aparte wanden (§9.2.4.2(6)).
'Kies één wand voor een losse wandschijf of meerdere wanden voor de belastingverdeling van de bouwlaag.</i>

# 1. Uitgangspunten

#hide
'Kleur per unity check: rood boven 1,0, oranje vanaf 0,90, anders groen.
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
#show

@select klimaat "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

'<i>Wind is kortdurend en komt alleen als overheersende belasting voor (ψ<sub>0</sub> = 0, Tabel NB.2 –
'A1.1): vergelijking 6.10b, met de factoren van de gevolgklasse (Tabel NB.4 – A1.2(B) en Tabel NB.5).</i>

CC', gevolgklasse uit de projectgegevens'
γ_G', blijvend, ongunstig (6.10b)'
γ_G,inf = 0.9', blijvend, gunstig'
γ_Q', veranderlijk'

@select lastinvoer "Horizontale belasting"
  Karakteristieke windkracht op deze bouwlaag = 1
  Rekenwaarde rechtstreeks = 2
@end

#if lastinvoer ≡ 1
    F_w,k = ?*(kN)', karakteristieke windkracht die deze bouwlaag in deze richting afdraagt'
    F_v,Ed = γ_Q*F_w,k to kN', rekenwaarde (6.10b, wind overheersend)'
#else
    F_v,Ed = ?*(kN)', rekenwaarde van de horizontale belasting op deze bouwlaag'
#end if

B_gevel = ?*(m)', breedte van het gebouw loodrecht op de lastrichting'
e_F = ?*(m)', excentriciteit van de last, ± ten opzichte van het midden: beide zijden worden getoetst (EN 1991-1-4 §7.1.2)'

# 2. Houtskelet

@select sterkteklasse "Sterkteklasse stijlen en regels (EN 338)"
  C14 = 1
  C16 = 2
  C18 = 3
  C20 = 4
  C22 = 5
  C24 = 6
  C27 = 7
  C30 = 8
@end

b_st = ?*(mm)', dikte van een stijl, in het wandvlak'
h_st = ?*(mm)', breedte van een stijl, loodrecht op het wandvlak'
hoh = ?*(mm)', hart-op-hart afstand van de stijlen'
n_eind = ?', aantal gekoppelde stijlen aan elk wandeinde'
h_w = ?*(mm)', wandhoogte'

#hide
'Sterkteklassen EN 338: [klasse | f_m,k | f_c,0,k | f_c,90,k | E_0,05 | ρ_k | ρ_mean | E_0,mean]
hout = [1; 2; 3; 4; 5; 6; 7; 8 |14; 16; 18; 20; 22; 24; 27; 30 |16; 17; 18; 19; 20; 21; 22; 23 |2.0; 2.2; 2.2; 2.3; 2.4; 2.5; 2.6; 2.7 |4700; 5400; 6000; 6400; 6700; 7400; 7700; 8000 |290; 310; 320; 330; 340; 350; 370; 380 |350; 370; 380; 390; 410; 420; 450; 460 |7000; 8000; 9000; 9500; 10000; 11000; 11500; 12000]
f_m,k = hlookup(hout; sterkteklasse; 1; 2)*N/mm^2
f_c,0,k = hlookup(hout; sterkteklasse; 1; 3)*N/mm^2
f_c,90,k = hlookup(hout; sterkteklasse; 1; 4)*N/mm^2
E_0,05 = hlookup(hout; sterkteklasse; 1; 5)*N/mm^2
ρ_k = hlookup(hout; sterkteklasse; 1; 6)*kg/m^3
ρ_m = hlookup(hout; sterkteklasse; 1; 7)*kg/m^3
E_0,mean = hlookup(hout; sterkteklasse; 1; 8)*N/mm^2
k_mod = if(klimaat ≡ 3; 0.70; 0.90)
k_h = if(h_st < 150 mm; min(1.3; (150 mm/h_st)^0.2); 1)
#show
f_m,k
f_c,0,k
f_c,90,k
E_0,05
E_0,mean
ρ_k
ρ_m
γ_M = 1.3', gezaagd hout (Tabel 2.3)'
k_mod', hout, belastingsduur kort (Tabel 3.1)'
k_h', hoogtefactor bij buiging uit het wandvlak (§3.2(3))'
f_m,d = k_h*k_mod*f_m,k/γ_M
f_c,0,d = k_mod*f_c,0,k/γ_M
f_c,90,d = k_mod*f_c,90,k/γ_M
γ_M,v = 1.3', verbindingen (Tabel 2.3)'

#hide
'k_mod bij belastingsduur kort, per plaatsoort: Tabel 3.1, gipsplaat Tabel NB.2.
'Een 0 betekent dat de plaat in die klimaatklasse niet is toegestaan.
'   [plaat | klimaatklasse 1 | 2 | 3]
kmod_pl = [1; 2; 3; 4; 5; 6 |0.90; 0.90; 0.85; 0.90; 0.80; 0.80 |0.70; 0.70; 0.60; 0.90; 0.60; 0.60 |0; 0; 0; 0.70; 0; 0]
'γ_M per plaatsoort: Tabel 2.3, gipsplaat NB bij 2.4.1(3)
γ_pl = [1; 2; 3; 4; 5; 6 |1.2; 1.2; 1.3; 1.2; 1.3; 1.3]
#show

# 3. Beplating A en bevestiging

@select plaat_A "Plaatmateriaal A"
  OSB/3 (EN 300) = 1
  OSB/4 (EN 300) = 2
  Spaanplaat P5 (EN 312) = 3
  Multiplex (EN 636) = 4
  Gipskartonplaat (NEN-EN 520) = 5
  Gipsvezelplaat (NEN-EN 15283-2) = 6
@end
#hide
gips_A = 1
#show
#if plaat_A ≡ 5
    @select gips_A "Type gipskartonplaat A"
      A of F = 1
      H of FH = 2
    @end
#end if

t_A = ?*(mm)', plaatdikte'
b_pl,A = ?*(mm)', plaatbreedte = breedte van één wandpaneel'
s_A = ?*(mm)', afstand van de verbindingsmiddelen langs de plaatranden'

#if plaat_A ≡ 5
    f_v,A = 1.0*N/mm^2', afschuifsterkte in het plaatvlak, gipskartonplaat (Tabel NB.4)'
#else
    f_v,A = ?*(N/mm^2)', afschuifsterkte in het plaatvlak (EN 12369 of productblad)'
#end if
G_pl,A = ?*(N/mm^2)', afschuifmodulus in het plaatvlak (EN 12369-1 of productblad), voor de verplaatsing; 0 = onbekend'

#hide
k_mod,A = hlookup(kmod_pl; plaat_A; 1; klimaat + 1)*(1 - bool(plaat_A ≡ 5)*bool(gips_A ≡ 1)*bool(klimaat ≥ 2))
γ_M,A = hlookup(γ_pl; plaat_A; 1; 2)
#show
k_mod,A', plaat, belastingsduur kort (Tabel 3.1 of NB.2; gipskarton type A en F alleen in klimaatklasse 1)'
γ_M,A', plaat (Tabel 2.3 of NB bij 2.4.1(3))'
f_v,d,A = k_mod,A*f_v,A/γ_M,A', rekenwaarde afschuifsterkte plaat'
#if k_mod,A ≡ 0
    '<b style="color:#b91c1c">Plaatmateriaal A is in klimaatklasse 'klimaat' niet toegestaan (Tabel 3.1 en NB bij 3.8).</b>
#end if

@select bevestiging_A "Verbindingsmiddel A"
  Gladde nagel = 1
  Geprofileerde nagel (ring- of schroefnagel) = 2
  Vierkante of gegroefde nagel = 4
  Schroef (d_ef ≤ 6 mm) = 3
@end

d_A = ?*(mm)', diameter; bij een vierkante nagel de zijde (§8.3.1.1(3)), bij een schroef d_ef = 1,1 × kerndiameter (§8.7.1)'
l_A = ?*(mm)', lengte van het verbindingsmiddel'
t_pen,A = l_A - t_A', indringdiepte in de stijl'
K_ser,A = ?*(N/mm)', verschuivingsmodulus per verbindingsmiddel, voor de verplaatsing; 0 = Tabel 7.1 (bij gipsplaat invullen)'

@select bron_A "Sterkte per verbindingsmiddel A"
  Berekenen volgens §8.2.2 = 1
  Rekenwaarde invoeren = 2
@end

#if bron_A ≡ 1
    f_u,A = ?*(N/mm^2)', treksterkte van de draad (gladde nagel minimaal 600)'
    F_ax,A = ?*(N)', uittreksterkte F_ax,Rk voor het koordeffect, 0 als onbekend'
    #hide
    M_y,Rk,A = 0 N*mm
    #show
    #if bevestiging_A ≡ 2
        M_y,Rk,A = ?*(N*mm)', vloeimoment volgens de prestatieverklaring (EN 14592); 0 = 0,3·f_u·d^2,6'
    #end if
    '<h6>3.1 Stuiksterkte en vloeimoment (§8.3.1)</h6>
    #hide
    d_rA = d_A/(1 mm)
    t_rA = t_A/(1 mm)
    k_My,A = if(bevestiging_A ≡ 4; 0.45; 0.3)
    M_y,A = if(M_y,Rk,A > 0 N*mm; M_y,Rk,A; k_My,A*(f_u,A/(1 N/mm^2))*d_rA^2.6*N*mm)
    #show
    #if plaat_A ≤ 3
        f_h,1A = 65*d_rA^-0.7*t_rA^0.1*N/mm^2', stuiksterkte spaanplaat en OSB (8.22)'
    #else if plaat_A ≡ 4
        ρ_pl,A = ?*(kg/m^3)', karakteristieke volumieke massa van het multiplex'
        f_h,1A = 0.11*(ρ_pl,A/(1 kg/m^3))*d_rA^-0.3*N/mm^2', stuiksterkte multiplex (8.20)'
    #else if plaat_A ≡ 5
        f_h,1A = 3.9*d_rA^-0.6*t_rA^0.7*N/mm^2', stuiksterkte gipskartonplaat (NB.8.1)'
    #else
        f_h,1A = 7*d_rA^-0.7*t_rA^0.9*N/mm^2', stuiksterkte gipsvezelplaat, bovengrens (NB.8.2)'
    #end if
    f_h,2A = 0.082*(ρ_k/(1 kg/m^3))*d_rA^-0.3*N/mm^2', stuiksterkte hout, niet voorgeboord (8.15)'
    β_A = f_h,2A/f_h,1A
    M_y,A', vloeimoment (8.14): 0,3·f_u·d^2,6, bij een vierkante of gegroefde nagel 0,45·f_u·d^2,6; of M_y,Rk uit de prestatieverklaring'
    '<h6>3.2 Bezwijkmechanismen van de enkelsnedige verbinding (8.6)</h6>
    '<i>Element 1 is de plaat (t<sub>1</sub> = t), element 2 de stijl (t<sub>2</sub> = indringdiepte).
    'Het koordeffect F<sub>ax,Rk</sub>/4 komt bij (c) t/m (f) bovenop het Johansen-deel, hoogstens 15 %
    '(gladde nagel), 25 % (andere nagels) of 100 % (schroef) daarvan (§8.2.2(2)); bij gipsplaat is het
    'nul (NB bij 8.3.1.5(5)).</i>
    #hide
    t_2A = max(t_pen,A; 0.1 mm)
    ρ_tA = t_2A/t_A
    F_A,a = f_h,1A*t_A*d_A to N
    F_A,b = f_h,2A*t_2A*d_A to N
    F_A,c = f_h,1A*t_A*d_A/(1 + β_A)*(sqrt(β_A + 2*β_A^2*(1 + ρ_tA + ρ_tA^2) + β_A^3*ρ_tA^2) - β_A*(1 + ρ_tA)) to N
    F_A,d = 1.05*f_h,1A*t_A*d_A/(2 + β_A)*(sqrt(2*β_A*(1 + β_A) + 4*β_A*(2 + β_A)*M_y,A/(f_h,1A*d_A*t_A^2)) - β_A) to N
    F_A,e = 1.05*f_h,1A*t_2A*d_A/(1 + 2*β_A)*(sqrt(2*β_A^2*(1 + β_A) + 4*β_A*(1 + 2*β_A)*M_y,A/(f_h,1A*d_A*t_2A^2)) - β_A) to N
    F_A,f = 1.15*sqrt(2*β_A/(1 + β_A))*sqrt(2*M_y,A*f_h,1A*d_A) to N
    p_ax,A = if(plaat_A ≥ 5; 0; if(bevestiging_A ≡ 1; 0.15; if(bevestiging_A ≡ 3; 1; 0.25)))
    F_A,kc = F_A,c + min(F_ax,A/4; p_ax,A*F_A,c) to N
    F_A,kd = F_A,d + min(F_ax,A/4; p_ax,A*F_A,d) to N
    F_A,ke = F_A,e + min(F_ax,A/4; p_ax,A*F_A,e) to N
    F_A,kf = F_A,f + min(F_ax,A/4; p_ax,A*F_A,f) to N
    F_v,Rk,A = min(F_A,a; F_A,b; F_A,kc; F_A,kd; F_A,ke; F_A,kf) to N
    'Met een plaatdikte, diameter of stuiksterkte van nul rekent geen mechanisme.
    ok_vA = bool(t_A > 0 mm and d_A > 0 mm and f_h,1A > 0 N/mm^2)
    #show
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(a)</th><th style="padding:3px 8px;">(b)</th><th style="padding:3px 8px;">(c)</th><th style="padding:3px 8px;">(d)</th><th style="padding:3px 8px;">(e)</th><th style="padding:3px 8px;">(f)</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'F_A,a'</td><td style="padding:3px 8px; text-align:right;">'F_A,b'</td><td style="padding:3px 8px; text-align:right;">'F_A,c'</td><td style="padding:3px 8px; text-align:right;">'F_A,d'</td><td style="padding:3px 8px; text-align:right;">'F_A,e'</td><td style="padding:3px 8px; text-align:right;">'F_A,f'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'F_A,a'</td><td style="padding:3px 8px; text-align:right;">'F_A,b'</td><td style="padding:3px 8px; text-align:right;">'F_A,kc'</td><td style="padding:3px 8px; text-align:right;">'F_A,kd'</td><td style="padding:3px 8px; text-align:right;">'F_A,ke'</td><td style="padding:3px 8px; text-align:right;">'F_A,kf'</td></tr>
    '</table>
    F_v,Rk,A', het kleinste van de zes mechanismen'
    k_mod,vA = sqrt(k_mod*k_mod,A)', verbinding van hout met plaat (2.6)'
    #if ok_vA ≡ 1
        F_f,Rd,A = k_mod,vA*F_v,Rk,A/γ_M,v to kN', rekenwaarde per verbindingsmiddel'
    #else
        F_f,Rd,A = 0 kN', invoer onvolledig'
    #end if
#else
    F_f,Rd,A = ?*(kN)', rekenwaarde per verbindingsmiddel volgens hoofdstuk 8, zonder de factor 1,2'
#end if
F_f,rand,A = 1.2*F_f,Rd,A to kN', langs de plaatranden ×1,2 (§9.2.4.2(5))'
#hide
K_A = if(K_ser,A > 0 N/mm; K_ser,A; if(plaat_A ≥ 5; 0 N/mm; (ρ_m/(1 kg/m^3))^1.5*if(bevestiging_A ≡ 3; d_A/(1 mm)/23; (d_A/(1 mm))^0.8/30)*N/mm))
#show
K_A', verschuivingsmodulus: ingevoerd, of Tabel 7.1 met ρ_m van het hout (een zwaardere plaat maakt de verbinding stijver, §7.1(2))'

'<h6>3.3 Detaillering A</h6>
#hide
s_max,A = if(plaat_A ≥ 5; min(60*d_A; 150 mm); if(bevestiging_A ≡ 3; 200 mm; 150 mm))
s_min,A = if(plaat_A ≥ 5; 20*d_A; 0.85*if(d_A < 5 mm; 10; 12)*d_A)
UC_s,A = max(s_A/s_max,A; s_min,A/s_A)
t_pen,min,A = if(bevestiging_A ≡ 1; 8; 6)*d_A
UC_pen,A = t_pen,min,A/max(t_pen,A; 0.1 mm)
b_net,A = (hoh - b_st)/t_A
UC_plooi,A = b_net,A/100
UC_dikte,A = if(plaat_A ≥ 5; 12.5 mm/t_A; 0)
#show
'<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Regel</th><th style="text-align:right; padding:3px 8px;">Waarde</th><th style="text-align:left; padding:3px 8px;">Grens</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Tussenafstand langs de plaatranden in mm (§10.8.2(1), Tabel 8.2 ×0,85; gips NB bij 8.3.1.5(6))</td><td style="padding:3px 8px; text-align:right;">'s_A'</td><td style="padding:3px 8px;">'s_min,A' tot 's_max,A'</td><td style="padding:3px 8px; color:'kleur(UC_s,A)'">'oordeel(UC_s,A)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Indringdiepte in de stijl in mm (§8.3.1.2)</td><td style="padding:3px 8px; text-align:right;">'t_pen,A'</td><td style="padding:3px 8px;">minimaal 't_pen,min,A'</td><td style="padding:3px 8px; color:'kleur(UC_pen,A)'">'oordeel(UC_pen,A)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Plooi: dagmaat tussen de stijlen gedeeld door t (§9.2.4.2(11))</td><td style="padding:3px 8px; text-align:right;">'b_net,A'</td><td style="padding:3px 8px;">maximaal 100</td><td style="padding:3px 8px; color:'kleur(UC_plooi,A)'">'oordeel(UC_plooi,A)'</td></tr>
#if plaat_A ≥ 5
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dikte gipsplaat in mm (NB bij 3.8(3))</td><td style="padding:3px 8px; text-align:right;">'t_A'</td><td style="padding:3px 8px;">minimaal 12,5</td><td style="padding:3px 8px; color:'kleur(UC_dikte,A)'">'oordeel(UC_dikte,A)'</td></tr>
#end if
'</table>
#if plaat_A ≥ 5
    k_18,A = min(1; 35*t_A/hoh)', stijlen verder dan 35t uit elkaar: sterkte ×35t/a (NB bij 9.2.4.2(18))'
#else
    #hide
    k_18,A = 1
    #show
#end if

# 4. Beplating B en bevestiging

@select plaat_B "Plaatmateriaal B"
  OSB/3 (EN 300) = 1
  OSB/4 (EN 300) = 2
  Spaanplaat P5 (EN 312) = 3
  Multiplex (EN 636) = 4
  Gipskartonplaat (NEN-EN 520) = 5
  Gipsvezelplaat (NEN-EN 15283-2) = 6
@end
#hide
gips_B = 1
#show
#if plaat_B ≡ 5
    @select gips_B "Type gipskartonplaat B"
      A of F = 1
      H of FH = 2
    @end
#end if

t_B = ?*(mm)', plaatdikte'
b_pl,B = ?*(mm)', plaatbreedte = breedte van één wandpaneel'
s_B = ?*(mm)', afstand van de verbindingsmiddelen langs de plaatranden'

#if plaat_B ≡ 5
    f_v,B = 1.0*N/mm^2', afschuifsterkte in het plaatvlak, gipskartonplaat (Tabel NB.4)'
#else
    f_v,B = ?*(N/mm^2)', afschuifsterkte in het plaatvlak (EN 12369 of productblad)'
#end if
G_pl,B = ?*(N/mm^2)', afschuifmodulus in het plaatvlak (EN 12369-1 of productblad), voor de verplaatsing; 0 = onbekend'

#hide
k_mod,B = hlookup(kmod_pl; plaat_B; 1; klimaat + 1)*(1 - bool(plaat_B ≡ 5)*bool(gips_B ≡ 1)*bool(klimaat ≥ 2))
γ_M,B = hlookup(γ_pl; plaat_B; 1; 2)
#show
k_mod,B', plaat, belastingsduur kort (Tabel 3.1 of NB.2; gipskarton type A en F alleen in klimaatklasse 1)'
γ_M,B', plaat (Tabel 2.3 of NB bij 2.4.1(3))'
f_v,d,B = k_mod,B*f_v,B/γ_M,B', rekenwaarde afschuifsterkte plaat'
#if k_mod,B ≡ 0
    '<b style="color:#b91c1c">Plaatmateriaal B is in klimaatklasse 'klimaat' niet toegestaan (Tabel 3.1 en NB bij 3.8).</b>
#end if

@select bevestiging_B "Verbindingsmiddel B"
  Gladde nagel = 1
  Geprofileerde nagel (ring- of schroefnagel) = 2
  Vierkante of gegroefde nagel = 4
  Schroef (d_ef ≤ 6 mm) = 3
@end

d_B = ?*(mm)', diameter; bij een vierkante nagel de zijde (§8.3.1.1(3)), bij een schroef d_ef = 1,1 × kerndiameter (§8.7.1)'
l_B = ?*(mm)', lengte van het verbindingsmiddel'
t_pen,B = l_B - t_B', indringdiepte in de stijl'
K_ser,B = ?*(N/mm)', verschuivingsmodulus per verbindingsmiddel, voor de verplaatsing; 0 = Tabel 7.1 (bij gipsplaat invullen)'

@select bron_B "Sterkte per verbindingsmiddel B"
  Berekenen volgens §8.2.2 = 1
  Rekenwaarde invoeren = 2
@end

#if bron_B ≡ 1
    f_u,B = ?*(N/mm^2)', treksterkte van de draad (gladde nagel minimaal 600)'
    F_ax,B = ?*(N)', uittreksterkte F_ax,Rk voor het koordeffect, 0 als onbekend'
    #hide
    M_y,Rk,B = 0 N*mm
    #show
    #if bevestiging_B ≡ 2
        M_y,Rk,B = ?*(N*mm)', vloeimoment volgens de prestatieverklaring (EN 14592); 0 = 0,3·f_u·d^2,6'
    #end if
    '<h6>4.1 Stuiksterkte en vloeimoment (§8.3.1)</h6>
    #hide
    d_rB = d_B/(1 mm)
    t_rB = t_B/(1 mm)
    k_My,B = if(bevestiging_B ≡ 4; 0.45; 0.3)
    M_y,B = if(M_y,Rk,B > 0 N*mm; M_y,Rk,B; k_My,B*(f_u,B/(1 N/mm^2))*d_rB^2.6*N*mm)
    #show
    #if plaat_B ≤ 3
        f_h,1B = 65*d_rB^-0.7*t_rB^0.1*N/mm^2', stuiksterkte spaanplaat en OSB (8.22)'
    #else if plaat_B ≡ 4
        ρ_pl,B = ?*(kg/m^3)', karakteristieke volumieke massa van het multiplex'
        f_h,1B = 0.11*(ρ_pl,B/(1 kg/m^3))*d_rB^-0.3*N/mm^2', stuiksterkte multiplex (8.20)'
    #else if plaat_B ≡ 5
        f_h,1B = 3.9*d_rB^-0.6*t_rB^0.7*N/mm^2', stuiksterkte gipskartonplaat (NB.8.1)'
    #else
        f_h,1B = 7*d_rB^-0.7*t_rB^0.9*N/mm^2', stuiksterkte gipsvezelplaat, bovengrens (NB.8.2)'
    #end if
    f_h,2B = 0.082*(ρ_k/(1 kg/m^3))*d_rB^-0.3*N/mm^2', stuiksterkte hout, niet voorgeboord (8.15)'
    β_B = f_h,2B/f_h,1B
    M_y,B', vloeimoment (8.14): 0,3·f_u·d^2,6, bij een vierkante of gegroefde nagel 0,45·f_u·d^2,6; of M_y,Rk uit de prestatieverklaring'
    '<h6>4.2 Bezwijkmechanismen van de enkelsnedige verbinding (8.6)</h6>
    #hide
    t_2B = max(t_pen,B; 0.1 mm)
    ρ_tB = t_2B/t_B
    F_B,a = f_h,1B*t_B*d_B to N
    F_B,b = f_h,2B*t_2B*d_B to N
    F_B,c = f_h,1B*t_B*d_B/(1 + β_B)*(sqrt(β_B + 2*β_B^2*(1 + ρ_tB + ρ_tB^2) + β_B^3*ρ_tB^2) - β_B*(1 + ρ_tB)) to N
    F_B,d = 1.05*f_h,1B*t_B*d_B/(2 + β_B)*(sqrt(2*β_B*(1 + β_B) + 4*β_B*(2 + β_B)*M_y,B/(f_h,1B*d_B*t_B^2)) - β_B) to N
    F_B,e = 1.05*f_h,1B*t_2B*d_B/(1 + 2*β_B)*(sqrt(2*β_B^2*(1 + β_B) + 4*β_B*(1 + 2*β_B)*M_y,B/(f_h,1B*d_B*t_2B^2)) - β_B) to N
    F_B,f = 1.15*sqrt(2*β_B/(1 + β_B))*sqrt(2*M_y,B*f_h,1B*d_B) to N
    p_ax,B = if(plaat_B ≥ 5; 0; if(bevestiging_B ≡ 1; 0.15; if(bevestiging_B ≡ 3; 1; 0.25)))
    F_B,kc = F_B,c + min(F_ax,B/4; p_ax,B*F_B,c) to N
    F_B,kd = F_B,d + min(F_ax,B/4; p_ax,B*F_B,d) to N
    F_B,ke = F_B,e + min(F_ax,B/4; p_ax,B*F_B,e) to N
    F_B,kf = F_B,f + min(F_ax,B/4; p_ax,B*F_B,f) to N
    F_v,Rk,B = min(F_B,a; F_B,b; F_B,kc; F_B,kd; F_B,ke; F_B,kf) to N
    'Met een plaatdikte, diameter of stuiksterkte van nul rekent geen mechanisme.
    ok_vB = bool(t_B > 0 mm and d_B > 0 mm and f_h,1B > 0 N/mm^2)
    #show
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(a)</th><th style="padding:3px 8px;">(b)</th><th style="padding:3px 8px;">(c)</th><th style="padding:3px 8px;">(d)</th><th style="padding:3px 8px;">(e)</th><th style="padding:3px 8px;">(f)</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'F_B,a'</td><td style="padding:3px 8px; text-align:right;">'F_B,b'</td><td style="padding:3px 8px; text-align:right;">'F_B,c'</td><td style="padding:3px 8px; text-align:right;">'F_B,d'</td><td style="padding:3px 8px; text-align:right;">'F_B,e'</td><td style="padding:3px 8px; text-align:right;">'F_B,f'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'F_B,a'</td><td style="padding:3px 8px; text-align:right;">'F_B,b'</td><td style="padding:3px 8px; text-align:right;">'F_B,kc'</td><td style="padding:3px 8px; text-align:right;">'F_B,kd'</td><td style="padding:3px 8px; text-align:right;">'F_B,ke'</td><td style="padding:3px 8px; text-align:right;">'F_B,kf'</td></tr>
    '</table>
    F_v,Rk,B', het kleinste van de zes mechanismen'
    k_mod,vB = sqrt(k_mod*k_mod,B)', verbinding van hout met plaat (2.6)'
    #if ok_vB ≡ 1
        F_f,Rd,B = k_mod,vB*F_v,Rk,B/γ_M,v to kN', rekenwaarde per verbindingsmiddel'
    #else
        F_f,Rd,B = 0 kN', invoer onvolledig'
    #end if
#else
    F_f,Rd,B = ?*(kN)', rekenwaarde per verbindingsmiddel volgens hoofdstuk 8, zonder de factor 1,2'
#end if
F_f,rand,B = 1.2*F_f,Rd,B to kN', langs de plaatranden ×1,2 (§9.2.4.2(5))'
#hide
K_B = if(K_ser,B > 0 N/mm; K_ser,B; if(plaat_B ≥ 5; 0 N/mm; (ρ_m/(1 kg/m^3))^1.5*if(bevestiging_B ≡ 3; d_B/(1 mm)/23; (d_B/(1 mm))^0.8/30)*N/mm))
#show
K_B', verschuivingsmodulus: ingevoerd, of Tabel 7.1 met ρ_m van het hout (een zwaardere plaat maakt de verbinding stijver, §7.1(2))'

'<h6>4.3 Detaillering B</h6>
#hide
s_max,B = if(plaat_B ≥ 5; min(60*d_B; 150 mm); if(bevestiging_B ≡ 3; 200 mm; 150 mm))
s_min,B = if(plaat_B ≥ 5; 20*d_B; 0.85*if(d_B < 5 mm; 10; 12)*d_B)
UC_s,B = max(s_B/s_max,B; s_min,B/s_B)
t_pen,min,B = if(bevestiging_B ≡ 1; 8; 6)*d_B
UC_pen,B = t_pen,min,B/max(t_pen,B; 0.1 mm)
b_net,B = (hoh - b_st)/t_B
UC_plooi,B = b_net,B/100
UC_dikte,B = if(plaat_B ≥ 5; 12.5 mm/t_B; 0)
#show
'<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Regel</th><th style="text-align:right; padding:3px 8px;">Waarde</th><th style="text-align:left; padding:3px 8px;">Grens</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Tussenafstand langs de plaatranden in mm (§10.8.2(1), Tabel 8.2 ×0,85; gips NB bij 8.3.1.5(6))</td><td style="padding:3px 8px; text-align:right;">'s_B'</td><td style="padding:3px 8px;">'s_min,B' tot 's_max,B'</td><td style="padding:3px 8px; color:'kleur(UC_s,B)'">'oordeel(UC_s,B)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Indringdiepte in de stijl in mm (§8.3.1.2)</td><td style="padding:3px 8px; text-align:right;">'t_pen,B'</td><td style="padding:3px 8px;">minimaal 't_pen,min,B'</td><td style="padding:3px 8px; color:'kleur(UC_pen,B)'">'oordeel(UC_pen,B)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Plooi: dagmaat tussen de stijlen gedeeld door t (§9.2.4.2(11))</td><td style="padding:3px 8px; text-align:right;">'b_net,B'</td><td style="padding:3px 8px;">maximaal 100</td><td style="padding:3px 8px; color:'kleur(UC_plooi,B)'">'oordeel(UC_plooi,B)'</td></tr>
#if plaat_B ≥ 5
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Dikte gipsplaat in mm (NB bij 3.8(3))</td><td style="padding:3px 8px; text-align:right;">'t_B'</td><td style="padding:3px 8px;">minimaal 12,5</td><td style="padding:3px 8px; color:'kleur(UC_dikte,B)'">'oordeel(UC_dikte,B)'</td></tr>
#end if
'</table>
#if plaat_B ≥ 5
    k_18,B = min(1; 35*t_B/hoh)', stijlen verder dan 35t uit elkaar: sterkte ×35t/a (NB bij 9.2.4.2(18))'
#else
    #hide
    k_18,B = 1
    #show
#end if

# 5. Wanden in de beschouwde richting

'<i>x is de positie loodrecht op de lastrichting, gemeten vanaf dezelfde gevelrand als B. De
'lijnlasten staan op de bovenregel, inclusief eigen gewicht; w<sub>k</sub> is de winddruk op de wand zelf.</i>

@select n_wanden "Aantal wanden"
  1 = 1
  2 = 2
  3 = 3
  4 = 4
  5 = 5
  6 = 6
@end

@select cat_Q "Categorie veranderlijke vloerbelasting (Tabel NB.2 – A1.1)"
  A — woon- en verblijfsruimtes = 1
  B — kantoorruimtes = 2
  C — bijeenkomstruimtes = 3
  D — winkelruimtes = 4
  E — opslagruimtes = 5
  H — daken = 6
@end
#hide
ψ_0 = if(cat_Q ≡ 1; 0.4; if(cat_Q ≡ 2; 0.5; if(cat_Q ≡ 3; 0.6; if(cat_Q ≡ 4; 0.4; if(cat_Q ≡ 5; 1.0; 0)))))
#show
ψ_0', gelijktijdig met wind (Tabel NB.2 – A1.1; bij C de waarde voor vluchtwegen)'

F_a,Rd = ?*(kN)', rekenwaarde van de trekcapaciteit van het anker per wandeinde'
v_Rd = ?*(kN/m)', rekenwaarde van de schuifverankering van de onderregel per meter'
u_a = ?*(mm)', verschuiving van het anker bij de karakteristieke trekkracht, voor de verplaatsing'

#hide
'Standaardwaarden voor de wanden die niet meedoen. Zo blijven de sommen en de
'tabellen verderop gedefinieerd, en draagt een ongebruikte wand niets bij.
L_2 = 0 mm
zijden_2 = 1
x_2 = 0 m
G_k,2 = 0 kN/m
Q_k,2 = 0 kN/m
w_k,2 = 0 kN/m^2
a_op,2 = 0 mm
R_2 = 0 kN
rk_2 = 0
L_3 = 0 mm
zijden_3 = 1
x_3 = 0 m
G_k,3 = 0 kN/m
Q_k,3 = 0 kN/m
w_k,3 = 0 kN/m^2
a_op,3 = 0 mm
R_3 = 0 kN
rk_3 = 0
L_4 = 0 mm
zijden_4 = 1
x_4 = 0 m
G_k,4 = 0 kN/m
Q_k,4 = 0 kN/m
w_k,4 = 0 kN/m^2
a_op,4 = 0 mm
R_4 = 0 kN
rk_4 = 0
L_5 = 0 mm
zijden_5 = 1
x_5 = 0 m
G_k,5 = 0 kN/m
Q_k,5 = 0 kN/m
w_k,5 = 0 kN/m^2
a_op,5 = 0 mm
R_5 = 0 kN
rk_5 = 0
L_6 = 0 mm
zijden_6 = 1
x_6 = 0 m
G_k,6 = 0 kN/m
Q_k,6 = 0 kN/m
w_k,6 = 0 kN/m^2
a_op,6 = 0 mm
R_6 = 0 kN
rk_6 = 0
#show

'<h6>Wand 1</h6>
L_1 = ?*(mm)', lengte van het dichte wanddeel'
@select zijden_1 "Beplating wand 1"
  A = 1
  B = 2
  A + B = 3
  A aan beide zijden = 4
  B aan beide zijden = 5
@end
x_1 = ?*(m)', positie loodrecht op de lastrichting'
G_k,1 = ?*(kN/m)', permanente lijnlast op de wand'
Q_k,1 = ?*(kN/m)', veranderlijke lijnlast op de wand'
w_k,1 = ?*(kN/m^2)', winddruk loodrecht op de wand, 0 voor een binnenwand'
a_op,1 = ?*(mm)', extra invloedsbreedte van de eindstijl naast een opening (de halve opening), anders 0'
#if n_wanden ≥ 2
    '<h6>Wand 2</h6>
    L_2 = ?*(mm)
    @select zijden_2 "Beplating wand 2"
      A = 1
      B = 2
      A + B = 3
      A aan beide zijden = 4
      B aan beide zijden = 5
    @end
    x_2 = ?*(m)
    G_k,2 = ?*(kN/m)
    Q_k,2 = ?*(kN/m)
    w_k,2 = ?*(kN/m^2)
    a_op,2 = ?*(mm)
#end if
#if n_wanden ≥ 3
    '<h6>Wand 3</h6>
    L_3 = ?*(mm)
    @select zijden_3 "Beplating wand 3"
      A = 1
      B = 2
      A + B = 3
      A aan beide zijden = 4
      B aan beide zijden = 5
    @end
    x_3 = ?*(m)
    G_k,3 = ?*(kN/m)
    Q_k,3 = ?*(kN/m)
    w_k,3 = ?*(kN/m^2)
    a_op,3 = ?*(mm)
#end if
#if n_wanden ≥ 4
    '<h6>Wand 4</h6>
    L_4 = ?*(mm)
    @select zijden_4 "Beplating wand 4"
      A = 1
      B = 2
      A + B = 3
      A aan beide zijden = 4
      B aan beide zijden = 5
    @end
    x_4 = ?*(m)
    G_k,4 = ?*(kN/m)
    Q_k,4 = ?*(kN/m)
    w_k,4 = ?*(kN/m^2)
    a_op,4 = ?*(mm)
#end if
#if n_wanden ≥ 5
    '<h6>Wand 5</h6>
    L_5 = ?*(mm)
    @select zijden_5 "Beplating wand 5"
      A = 1
      B = 2
      A + B = 3
      A aan beide zijden = 4
      B aan beide zijden = 5
    @end
    x_5 = ?*(m)
    G_k,5 = ?*(kN/m)
    Q_k,5 = ?*(kN/m)
    w_k,5 = ?*(kN/m^2)
    a_op,5 = ?*(mm)
#end if
#if n_wanden ≥ 6
    '<h6>Wand 6</h6>
    L_6 = ?*(mm)
    @select zijden_6 "Beplating wand 6"
      A = 1
      B = 2
      A + B = 3
      A aan beide zijden = 4
      B aan beide zijden = 5
    @end
    x_6 = ?*(m)
    G_k,6 = ?*(kN/m)
    Q_k,6 = ?*(kN/m)
    w_k,6 = ?*(kN/m^2)
    a_op,6 = ?*(mm)
#end if

# 6. Sterkte in het wandvlak per wand — methode A (§9.2.4.2)

'<i>Per paneel (9.21) met c<sub>i</sub> = min(1; b<sub>i</sub>/b<sub>0</sub>) en b<sub>0</sub> = h/2 (9.22). Een restpaneel smaller
'dan h/4 telt niet mee (§9.2.4.2(2)). Met een horizontale naad gaat een paneel smaller dan h/2 ×0,85
'(NB bij 9.2.4.2(17)).</i>

@select naad "Horizontale naad in de beplating"
  Nee = 0
  Ja, alle plaatranden schuifvast verbonden = 1
@end

@select gelijke_k "Verbindingsmiddelen A en B met dezelfde verschuivingsmodulus"
  Nee = 0
  Ja = 1
@end

#hide
b_0 = h_w/2
c_i(b) = min(1; b/b_0)
k_naad(b) = if(naad ≡ 1; if(b < 0.5*h_w; 0.85; 1); 1)
R_pA(b) = bool(b ≥ h_w/4)*F_f,rand,A*b*c_i(b)*k_naad(b)*k_18,A/s_A
R_pB(b) = bool(b ≥ h_w/4)*F_f,rand,B*b*c_i(b)*k_naad(b)*k_18,B/s_B
R_A(L) = floor(L/b_pl,A)*R_pA(b_pl,A) + R_pA(L - floor(L/b_pl,A)*b_pl,A)
R_B(L) = floor(L/b_pl,B)*R_pB(b_pl,B) + R_pB(L - floor(L/b_pl,B)*b_pl,B)
zelfde = (plaat_A ≡ plaat_B)*(t_A ≡ t_B)*(bevestiging_A ≡ bevestiging_B)*(d_A ≡ d_B)*(l_A ≡ l_B)
f_zwak = if(zelfde ≡ 1; 1; if(gelijke_k ≡ 1; 0.75; 0.5))
R_AB(L) = max(R_A(L); R_B(L)) + f_zwak*min(R_A(L); R_B(L))
R_w(L; z) = if(z ≡ 1; R_A(L); if(z ≡ 2; R_B(L); if(z ≡ 3; R_AB(L); if(z ≡ 4; 2*R_A(L); 2*R_B(L)))))
'Meetellende lengte voor de hefboom (9.23): het breedste paneel b_e krijgt de
'grootste trekkracht, F·h/L_e met L_e = R·b_e/R_p(b_e). Zonder sterkte de wandlengte.
b_eA(L) = min(L; b_pl,A)
b_eB(L) = min(L; b_pl,B)
L_eA(L) = if(R_pA(b_eA(L)) > 0 kN; R_A(L)*b_eA(L)/R_pA(b_eA(L)); L)
L_eB(L) = if(R_pB(b_eB(L)) > 0 kN; R_B(L)*b_eB(L)/R_pB(b_eB(L)); L)
L_ef(L; z) = if(z ≡ 3; min(L_eA(L); L_eB(L)); if(z ≡ 2; L_eB(L); if(z ≡ 5; L_eB(L); L_eA(L))))
rk_A(L) = bool(L - floor(L/b_pl,A)*b_pl,A > 1 mm)*bool(L - floor(L/b_pl,A)*b_pl,A < h_w/4)
rk_B(L) = bool(L - floor(L/b_pl,B)*b_pl,B > 1 mm)*bool(L - floor(L/b_pl,B)*b_pl,B < h_w/4)
rk(L; z) = if(z ≡ 3; max(rk_A(L); rk_B(L)); if(z ≡ 2; rk_B(L); if(z ≡ 5; rk_B(L); rk_A(L))))
R_1 = R_w(L_1; zijden_1) to kN
rk_1 = rk(L_1; zijden_1)
#if n_wanden ≥ 2
    R_2 = R_w(L_2; zijden_2) to kN
    rk_2 = rk(L_2; zijden_2)
#end if
#if n_wanden ≥ 3
    R_3 = R_w(L_3; zijden_3) to kN
    rk_3 = rk(L_3; zijden_3)
#end if
#if n_wanden ≥ 4
    R_4 = R_w(L_4; zijden_4) to kN
    rk_4 = rk(L_4; zijden_4)
#end if
#if n_wanden ≥ 5
    R_5 = R_w(L_5; zijden_5) to kN
    rk_5 = rk(L_5; zijden_5)
#end if
#if n_wanden ≥ 6
    R_6 = R_w(L_6; zijden_6) to kN
    rk_6 = rk(L_6; zijden_6)
#end if
#show
f_zwak', platen aan beide zijden (§9.2.4.2(7)): aandeel van de zwakste zijde, 1 bij gelijke zijden'
#if rk_1 ≡ 1
    '<span style="color:#b45309">Wand 1: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if
#if rk_2 ≡ 1
    '<span style="color:#b45309">Wand 2: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if
#if rk_3 ≡ 1
    '<span style="color:#b45309">Wand 3: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if
#if rk_4 ≡ 1
    '<span style="color:#b45309">Wand 4: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if
#if rk_5 ≡ 1
    '<span style="color:#b45309">Wand 5: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if
#if rk_6 ≡ 1
    '<span style="color:#b45309">Wand 6: het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van het laatste meetellende paneel, of veranker het restpaneel apart (§9.2.4.2(10), fig. 9.6).</span>
#end if

#hide
'Zonder deze maten valt er niets te verdelen of te toetsen: een veld dat leeg is
'of op nul staat, gaf verderop NaN of een foutmelding in plaats van een uitkomst.
'Een beplating telt alleen mee als een wand hem gebruikt.
nodig_A = max(bool(zijden_1 ≠ 2)*bool(zijden_1 ≠ 5); bool(n_wanden ≥ 2)*bool(zijden_2 ≠ 2)*bool(zijden_2 ≠ 5); bool(n_wanden ≥ 3)*bool(zijden_3 ≠ 2)*bool(zijden_3 ≠ 5); bool(n_wanden ≥ 4)*bool(zijden_4 ≠ 2)*bool(zijden_4 ≠ 5); bool(n_wanden ≥ 5)*bool(zijden_5 ≠ 2)*bool(zijden_5 ≠ 5); bool(n_wanden ≥ 6)*bool(zijden_6 ≠ 2)*bool(zijden_6 ≠ 5))
nodig_B = max(bool(zijden_1 ≠ 1)*bool(zijden_1 ≠ 4); bool(n_wanden ≥ 2)*bool(zijden_2 ≠ 1)*bool(zijden_2 ≠ 4); bool(n_wanden ≥ 3)*bool(zijden_3 ≠ 1)*bool(zijden_3 ≠ 4); bool(n_wanden ≥ 4)*bool(zijden_4 ≠ 1)*bool(zijden_4 ≠ 4); bool(n_wanden ≥ 5)*bool(zijden_5 ≠ 1)*bool(zijden_5 ≠ 4); bool(n_wanden ≥ 6)*bool(zijden_6 ≠ 1)*bool(zijden_6 ≠ 4))
ok_pl(t; b; s; d; bron) = bool(t > 0 mm and b > 0 mm and s > 0 mm)*if(bron ≡ 1; bool(d > 0 mm); 1)
ok_L = bool(L_1 > 0 mm)*bool(n_wanden < 2 or L_2 > 0 mm)*bool(n_wanden < 3 or L_3 > 0 mm)*bool(n_wanden < 4 or L_4 > 0 mm)*bool(n_wanden < 5 or L_5 > 0 mm)*bool(n_wanden < 6 or L_6 > 0 mm)
ok_inv = bool(b_st > 0 mm and h_st > 0 mm and hoh > 0 mm and n_eind > 0 and h_w > 0 mm)*ok_L*if(nodig_A ≡ 1; ok_pl(t_A; b_pl,A; s_A; d_A; bron_A); 1)*if(nodig_B ≡ 1; ok_pl(t_B; b_pl,B; s_B; d_B; bron_B); 1)
#show
#if ok_inv ≡ 0
    '<b style="color:#b91c1c">De invoer is onvolledig: stijlmaten, h.o.h., aantal stijlen aan het wandeinde en wandhoogte groter dan 0, de lengte van elke wand groter dan 0, en voor elke gebruikte beplating de plaatdikte, plaatbreedte, afstand langs de plaatranden en, als de sterkte berekend wordt, de diameter van het verbindingsmiddel groter dan 0.</b>
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de wanden zijn niet getoetst: invoer onvolledig</b></span>
#else
    # 7. Verdeling van de horizontale belasting

    '<i>Naar rato van de sterkte in het wandvlak (9.20). Het torsiemoment nemen alleen de evenwijdige
    'wanden op, aan de veilige kant; per wand telt het grootste torsiedeel van de last op B/2 ± e<sub>F</sub>,
    'en alleen als het iets toevoegt.</i>

    #hide
    R_tot = R_1 + R_2 + R_3 + R_4 + R_5 + R_6 to kN
    x_c = (R_1*x_1 + R_2*x_2 + R_3*x_3 + R_4*x_4 + R_5*x_5 + R_6*x_6)/max(R_tot; 0.001 kN)
    I_R = R_1*(x_1 - x_c)^2 + R_2*(x_2 - x_c)^2 + R_3*(x_3 - x_c)^2 + R_4*(x_4 - x_c)^2 + R_5*(x_5 - x_c)^2 + R_6*(x_6 - x_c)^2 to kN*m^2
    UC_totaal = F_v,Ed/max(R_tot; 0.001 kN)
    #show
    R_tot', som van de sterkten van de wanden (9.20)'
    x_c', sterktecentrum: Σ R_i·x_i / R_tot'
    e_t,a = B_gevel/2 + abs(e_F) - x_c', last op B/2 + e_F, ten opzichte van het sterktecentrum'
    e_t,b = B_gevel/2 - abs(e_F) - x_c', last op B/2 − e_F'
    M_t,a = F_v,Ed*e_t,a to kN*m
    M_t,b = F_v,Ed*e_t,b to kN*m
    I_R', Σ R_i·(x_i − x_c)²; torsiedeel van wand i: M_t·R_i·(x_i − x_c)/I_R'
    #if I_R < 0.001 kN*m^2
        #if max(abs(M_t,a); abs(M_t,b)) > 0.01 kN*m
            '<b style="color:#b91c1c">De wanden in deze richting liggen in één lijn en kunnen het torsiemoment niet opnemen; dat moet via de wanden in de andere richting.</b>
        #end if
    #end if
    #hide
    ΔF_1 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_1*(x_1 - x_c)/I_R; M_t,b*R_1*(x_1 - x_c)/I_R); 0 kN)
    F_1 = F_v,Ed*R_1/max(R_tot; 0.001 kN) + max(0 kN; ΔF_1) to kN
    zt_1 = if(zijden_1 ≡ 1; "A"; if(zijden_1 ≡ 2; "B"; if(zijden_1 ≡ 3; "A + B"; if(zijden_1 ≡ 4; "2× A"; "2× B"))))
    ΔF_2 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_2*(x_2 - x_c)/I_R; M_t,b*R_2*(x_2 - x_c)/I_R); 0 kN)
    F_2 = F_v,Ed*R_2/max(R_tot; 0.001 kN) + max(0 kN; ΔF_2) to kN
    zt_2 = if(zijden_2 ≡ 1; "A"; if(zijden_2 ≡ 2; "B"; if(zijden_2 ≡ 3; "A + B"; if(zijden_2 ≡ 4; "2× A"; "2× B"))))
    ΔF_3 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_3*(x_3 - x_c)/I_R; M_t,b*R_3*(x_3 - x_c)/I_R); 0 kN)
    F_3 = F_v,Ed*R_3/max(R_tot; 0.001 kN) + max(0 kN; ΔF_3) to kN
    zt_3 = if(zijden_3 ≡ 1; "A"; if(zijden_3 ≡ 2; "B"; if(zijden_3 ≡ 3; "A + B"; if(zijden_3 ≡ 4; "2× A"; "2× B"))))
    ΔF_4 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_4*(x_4 - x_c)/I_R; M_t,b*R_4*(x_4 - x_c)/I_R); 0 kN)
    F_4 = F_v,Ed*R_4/max(R_tot; 0.001 kN) + max(0 kN; ΔF_4) to kN
    zt_4 = if(zijden_4 ≡ 1; "A"; if(zijden_4 ≡ 2; "B"; if(zijden_4 ≡ 3; "A + B"; if(zijden_4 ≡ 4; "2× A"; "2× B"))))
    ΔF_5 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_5*(x_5 - x_c)/I_R; M_t,b*R_5*(x_5 - x_c)/I_R); 0 kN)
    F_5 = F_v,Ed*R_5/max(R_tot; 0.001 kN) + max(0 kN; ΔF_5) to kN
    zt_5 = if(zijden_5 ≡ 1; "A"; if(zijden_5 ≡ 2; "B"; if(zijden_5 ≡ 3; "A + B"; if(zijden_5 ≡ 4; "2× A"; "2× B"))))
    ΔF_6 = if(I_R > 0.001 kN*m^2; max(M_t,a*R_6*(x_6 - x_c)/I_R; M_t,b*R_6*(x_6 - x_c)/I_R); 0 kN)
    F_6 = F_v,Ed*R_6/max(R_tot; 0.001 kN) + max(0 kN; ΔF_6) to kN
    zt_6 = if(zijden_6 ≡ 1; "A"; if(zijden_6 ≡ 2; "B"; if(zijden_6 ≡ 3; "A + B"; if(zijden_6 ≡ 4; "2× A"; "2× B"))))
    #show

    '<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:2px solid #374151;">
    '<th style="text-align:left; padding:4px 8px;">Wand</th>
    '<th style="text-align:right; padding:4px 8px;">L (mm)</th>
    '<th style="text-align:left; padding:4px 8px;">Beplating</th>
    '<th style="text-align:right; padding:4px 8px;">x (m)</th>
    '<th style="text-align:right; padding:4px 8px;">F<sub>v,Rd</sub> (kN)</th>
    '<th style="text-align:right; padding:4px 8px;">ΔF torsie (kN)</th>
    '<th style="text-align:right; padding:4px 8px;">F<sub>v,Ed</sub> (kN)</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">1</td><td style="padding:4px 8px; text-align:right;">'L_1'</td><td style="padding:4px 8px;">'zt_1'</td><td style="padding:4px 8px; text-align:right;">'x_1'</td><td style="padding:4px 8px; text-align:right;">'R_1'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_1)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_1'</td></tr>
    #if n_wanden ≥ 2
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">2</td><td style="padding:4px 8px; text-align:right;">'L_2'</td><td style="padding:4px 8px;">'zt_2'</td><td style="padding:4px 8px; text-align:right;">'x_2'</td><td style="padding:4px 8px; text-align:right;">'R_2'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_2)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_2'</td></tr>
    #end if
    #if n_wanden ≥ 3
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">3</td><td style="padding:4px 8px; text-align:right;">'L_3'</td><td style="padding:4px 8px;">'zt_3'</td><td style="padding:4px 8px; text-align:right;">'x_3'</td><td style="padding:4px 8px; text-align:right;">'R_3'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_3)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_3'</td></tr>
    #end if
    #if n_wanden ≥ 4
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">4</td><td style="padding:4px 8px; text-align:right;">'L_4'</td><td style="padding:4px 8px;">'zt_4'</td><td style="padding:4px 8px; text-align:right;">'x_4'</td><td style="padding:4px 8px; text-align:right;">'R_4'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_4)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_4'</td></tr>
    #end if
    #if n_wanden ≥ 5
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">5</td><td style="padding:4px 8px; text-align:right;">'L_5'</td><td style="padding:4px 8px;">'zt_5'</td><td style="padding:4px 8px; text-align:right;">'x_5'</td><td style="padding:4px 8px; text-align:right;">'R_5'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_5)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_5'</td></tr>
    #end if
    #if n_wanden ≥ 6
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">6</td><td style="padding:4px 8px; text-align:right;">'L_6'</td><td style="padding:4px 8px;">'zt_6'</td><td style="padding:4px 8px; text-align:right;">'x_6'</td><td style="padding:4px 8px; text-align:right;">'R_6'</td><td style="padding:4px 8px; text-align:right;">'max(0 kN; ΔF_6)'</td><td style="padding:4px 8px; text-align:right; font-weight:700;">'F_6'</td></tr>
    #end if
    '</table>

    # 8. Toetsing per wand

    '<i>Uit het aandeel F van een wand volgen de trek- en drukkracht aan de wandeinden (9.23). Het anker
    'en de eindstijl zijn aan beide einden gelijk: de wind kan van twee kanten komen.</i>

    '<h6>8.1 Eindstijl</h6>
    a_eind = hoh/2', invloedsbreedte van de eindstijl'
    #hide
    A_eind = n_eind*b_st*h_st
    W_eind = n_eind*b_st*h_st^2/6
    β_c = 0.2
    #show
    λ_rel,y = h_w/(h_st/sqrt(12))/π*sqrt(f_c,0,k/E_0,05)', uit het wandvlak, kniklengte = wandhoogte (6.21)'
    #hide
    k_y = 0.5*(1 + β_c*(λ_rel,y - 0.3) + λ_rel,y^2)
    'In het wandvlak houdt de beplating de stijl vast; kniklengte = de afstand
    'tussen de verbindingsmiddelen.
    λ_z = max(s_A; s_B)/(n_eind*b_st/sqrt(12))
    λ_rel,z = λ_z/π*sqrt(f_c,0,k/E_0,05)
    k_z = 0.5*(1 + β_c*(λ_rel,z - 0.3) + λ_rel,z^2)
    #show
    k_c,y = min(1; 1/(k_y + sqrt(k_y^2 - λ_rel,y^2)))', (6.25) met (6.27), β_c = 0,2 (6.29)'
    k_c,z = min(1; 1/(k_z + sqrt(k_z^2 - λ_rel,z^2)))', in het wandvlak, kniklengte = afstand van de verbindingsmiddelen (6.26)'
    k_m = 0.7', rechthoekige doorsnede (§6.1.6(2))'
    A_ef = h_st*(n_eind*b_st + 30 mm)', contactvlak op de onderregel: +30 mm aan de binnenzijde (§6.1.5(1))'
    k_c,90 = 1.25', naaldhout op een doorgaande ondersteuning (§6.1.5(3))'
    u_max = h_w/300', verplaatsing per bouwlaag (NB bij NEN-EN 1990, A1.4.3)'

    '<h6>8.2 Rekenregels<span class="alleen-scherm"></span></h6>
    '<ul class="alleen-scherm" style="margin:2px 0 0 0; padding-left:1.3em;"><li>Hefboom (9.23): L<sub>ef</sub> = Σ b<sub>i</sub>·c<sub>i</sub> van de meetellende panelen, gedeeld door c<sub>i</sub> van het volle paneel; bij platen aan twee zijden de kleinste. F<sub>t</sub> = F·h/L<sub>ef</sub>.</li><li>Anker: N<sub>t</sub> = F<sub>t</sub> − γ<sub>G,inf</sub>·G<sub>k</sub>·a<sub>eind</sub> ≥ 0. Alleen de last op de eindstijl zelf ontlast het anker; de last op de tussenstijlen gaat rechtstreeks naar de onderregel (methode A, §9.2.4.2(1) en (8)).</li><li>Eindstijl: N<sub>c</sub> = F<sub>t</sub> + (γ<sub>G</sub>·G<sub>k</sub> + γ<sub>Q</sub>·ψ<sub>0</sub>·Q<sub>k</sub>)·(a<sub>eind</sub> + a<sub>op</sub>) en M<sub>w</sub> = γ<sub>Q</sub>·|w<sub>k</sub>|·(a<sub>eind</sub> + a<sub>op</sub>)·h²/8, getoetst met (6.23)/(6.24); onderregel N<sub>c</sub>/(A<sub>ef</sub>·k<sub>c,90</sub>·f<sub>c,90,d</sub>) (6.3).</li><li>Glijden: F<sub>v,Ed</sub>/(v<sub>Rd</sub>·L). Plaat: τ = F·a<sub>zijde</sub>/(L<sub>ef</sub>·t) ≤ f<sub>v,d</sub> (NB bij 9.2.4.2(15)), met a<sub>zijde</sub> het aandeel van een zijde naar rato van de meegetelde sterkte.</li><li>Verplaatsing bij F/γ<sub>Q</sub> (6.14b), een ingenieursmodel: per paneel slip 2·F<sub>p</sub>·s·(b + h)/(K<sub>ser</sub>·b²) plus afschuiving F<sub>p</sub>·h/(G·t·b), het grootste van het volle en het restpaneel; daarbij ankerslip u<sub>a</sub>·h/L<sub>ef</sub> en de rek van de eindstijlen.</li></ul>

    #hide
    UC_st(N; M) = max(N/A_eind/(k_c,y*f_c,0,d) + M/W_eind/f_m,d; N/A_eind/(k_c,z*f_c,0,d) + k_m*M/W_eind/f_m,d)
    'De schuifkracht van een wand met platen aan twee zijden verdeelt zich naar
    'rato van de meegetelde sterkte per zijde.
    C_A(L) = if(R_A(L) ≥ R_B(L); R_A(L); f_zwak*R_A(L))
    C_B(L) = if(R_B(L) > R_A(L); R_B(L); f_zwak*R_B(L))
    a_A(L; z) = if(z ≡ 1; 1; if(z ≡ 2; 0; if(z ≡ 3; C_A(L)/max(C_A(L) + C_B(L); 0.001 kN); if(z ≡ 4; 0.5; 0))))
    a_B(L; z) = if(z ≡ 1; 0; if(z ≡ 2; 1; if(z ≡ 3; C_B(L)/max(C_A(L) + C_B(L); 0.001 kN); if(z ≡ 4; 0; 0.5))))
    'Een zijde zonder aandeel telt niet mee. Een plaat die in deze klimaatklasse
    'niet is toegestaan heeft geen sterkte; draagt hij toch, dan wordt de toets
    'hier onvoldoende.
    τ_A(F; L; z) = if(a_A(L; z) > 0; F*a_A(L; z)/(max(L_eA(L); 1 mm)*t_A)/max(f_v,d,A; 0.001 N/mm^2); 0)
    τ_B(F; L; z) = if(a_B(L; z) > 0; F*a_B(L; z)/(max(L_eB(L); 1 mm)*t_B)/max(f_v,d,B; 0.001 N/mm^2); 0)
    UC_pl(F; L; z) = max(τ_A(F; L; z); τ_B(F; L; z))
    'Verplaatsing per zijde met het aandeel van die zijde; zonder K_ser of G van
    'een zijde die meedraagt is ze niet bepaald. Per paneel met de schuifstroom
    'q = F·a·R_p(b)/(R·b): het volle paneel en het restpaneel, het grootste telt.
    'Bij platen breder dan h/2 kan een smal restpaneel meer verplaatsen.
    bekend_A = bool(K_A > 0 N/mm)*bool(G_pl,A > 0 N/mm^2)
    bekend_B = bool(K_B > 0 N/mm)*bool(G_pl,B > 0 N/mm^2)
    onbekend(L; z) = max(bool(a_A(L; z) > 0)*(1 - bekend_A); bool(a_B(L; z) > 0)*(1 - bekend_B))
    b_rA(L) = L - floor(L/b_pl,A)*b_pl,A
    b_rB(L) = L - floor(L/b_pl,B)*b_pl,B
    q_A(F; L; z; b) = F*a_A(L; z)*R_pA(b)/(max(R_A(L); 0.001 kN)*max(b; 1 mm))
    q_B(F; L; z; b) = F*a_B(L; z)*R_pB(b)/(max(R_B(L); 0.001 kN)*max(b; 1 mm))
    u_pA(q; b) = q*(2*s_A*(b + h_w)/(max(K_A; 0.001 N/mm)*max(b; 1 mm)) + h_w/(max(G_pl,A; 0.001 N/mm^2)*t_A))
    u_pB(q; b) = q*(2*s_B*(b + h_w)/(max(K_B; 0.001 N/mm)*max(b; 1 mm)) + h_w/(max(G_pl,B; 0.001 N/mm^2)*t_B))
    v_A(F; L; z) = if(a_A(L; z) > 0; max(u_pA(q_A(F; L; z; b_eA(L)); b_eA(L)); u_pA(q_A(F; L; z; b_rA(L)); b_rA(L))); 0 mm)
    v_B(F; L; z) = if(a_B(L; z) > 0; max(u_pB(q_B(F; L; z; b_eB(L)); b_eB(L)); u_pB(q_B(F; L; z; b_rB(L)); b_rB(L))); 0 mm)
    u_w(F; L; z) = max(v_A(F; L; z); v_B(F; L; z)) + (u_a + 2*F*h_w^2/(max(L_ef(L; z); 1 mm)*E_0,mean*A_eind))*h_w/max(L_ef(L; z); 1 mm)
    N_t,1 = 0 kN
    N_c,1 = 0 kN
    F_t,1 = 0 kN
    M_w,1 = 0 kN*m
    L_ef,1 = 0 mm
    u_1 = 0 mm
    UC_r,1 = 0
    UC_a,1 = 0
    UC_st,1 = 0
    UC_c90,1 = 0
    UC_gl,1 = 0
    UC_pl,1 = 0
    UC_u,1 = 0
    UC_w,1 = 0
    onb_1 = 0
    N_t,2 = 0 kN
    N_c,2 = 0 kN
    F_t,2 = 0 kN
    M_w,2 = 0 kN*m
    L_ef,2 = 0 mm
    u_2 = 0 mm
    UC_r,2 = 0
    UC_a,2 = 0
    UC_st,2 = 0
    UC_c90,2 = 0
    UC_gl,2 = 0
    UC_pl,2 = 0
    UC_u,2 = 0
    UC_w,2 = 0
    onb_2 = 0
    N_t,3 = 0 kN
    N_c,3 = 0 kN
    F_t,3 = 0 kN
    M_w,3 = 0 kN*m
    L_ef,3 = 0 mm
    u_3 = 0 mm
    UC_r,3 = 0
    UC_a,3 = 0
    UC_st,3 = 0
    UC_c90,3 = 0
    UC_gl,3 = 0
    UC_pl,3 = 0
    UC_u,3 = 0
    UC_w,3 = 0
    onb_3 = 0
    N_t,4 = 0 kN
    N_c,4 = 0 kN
    F_t,4 = 0 kN
    M_w,4 = 0 kN*m
    L_ef,4 = 0 mm
    u_4 = 0 mm
    UC_r,4 = 0
    UC_a,4 = 0
    UC_st,4 = 0
    UC_c90,4 = 0
    UC_gl,4 = 0
    UC_pl,4 = 0
    UC_u,4 = 0
    UC_w,4 = 0
    onb_4 = 0
    N_t,5 = 0 kN
    N_c,5 = 0 kN
    F_t,5 = 0 kN
    M_w,5 = 0 kN*m
    L_ef,5 = 0 mm
    u_5 = 0 mm
    UC_r,5 = 0
    UC_a,5 = 0
    UC_st,5 = 0
    UC_c90,5 = 0
    UC_gl,5 = 0
    UC_pl,5 = 0
    UC_u,5 = 0
    UC_w,5 = 0
    onb_5 = 0
    N_t,6 = 0 kN
    N_c,6 = 0 kN
    F_t,6 = 0 kN
    M_w,6 = 0 kN*m
    L_ef,6 = 0 mm
    u_6 = 0 mm
    UC_r,6 = 0
    UC_a,6 = 0
    UC_st,6 = 0
    UC_c90,6 = 0
    UC_gl,6 = 0
    UC_pl,6 = 0
    UC_u,6 = 0
    UC_w,6 = 0
    onb_6 = 0
    UC_r,1 = F_1/max(R_1; 0.001 kN)
    L_ef,1 = L_ef(L_1; zijden_1) to mm
    F_t,1 = F_1*h_w/max(L_ef,1; 1 mm) to kN
    N_t,1 = max(0 kN; F_t,1 - γ_G,inf*G_k,1*a_eind) to kN
    UC_a,1 = N_t,1/max(F_a,Rd; 0.001 kN)
    N_c,1 = F_t,1 + (γ_G*G_k,1 + γ_Q*ψ_0*Q_k,1)*(a_eind + a_op,1) to kN
    M_w,1 = γ_Q*abs(w_k,1)*(a_eind + a_op,1)*h_w^2/8 to kN*m
    UC_st,1 = UC_st(N_c,1; M_w,1)
    UC_c90,1 = N_c,1/(A_ef*k_c,90*f_c,90,d)
    UC_gl,1 = F_1/(max(v_Rd; 0.001 kN/m)*max(L_1; 1 mm))
    UC_pl,1 = UC_pl(F_1; L_1; zijden_1)
    onb_1 = onbekend(L_1; zijden_1)
    u_1 = if(onb_1 ≡ 1; 0 mm; u_w(F_1/γ_Q; L_1; zijden_1)) to mm
    UC_u,1 = u_1/u_max
    UC_w,1 = max(UC_r,1; UC_a,1; UC_st,1; UC_c90,1; UC_gl,1; UC_pl,1; UC_u,1)
    #if n_wanden ≥ 2
        UC_r,2 = F_2/max(R_2; 0.001 kN)
        L_ef,2 = L_ef(L_2; zijden_2) to mm
        F_t,2 = F_2*h_w/max(L_ef,2; 1 mm) to kN
        N_t,2 = max(0 kN; F_t,2 - γ_G,inf*G_k,2*a_eind) to kN
        UC_a,2 = N_t,2/max(F_a,Rd; 0.001 kN)
        N_c,2 = F_t,2 + (γ_G*G_k,2 + γ_Q*ψ_0*Q_k,2)*(a_eind + a_op,2) to kN
        M_w,2 = γ_Q*abs(w_k,2)*(a_eind + a_op,2)*h_w^2/8 to kN*m
        UC_st,2 = UC_st(N_c,2; M_w,2)
        UC_c90,2 = N_c,2/(A_ef*k_c,90*f_c,90,d)
        UC_gl,2 = F_2/(max(v_Rd; 0.001 kN/m)*max(L_2; 1 mm))
        UC_pl,2 = UC_pl(F_2; L_2; zijden_2)
        onb_2 = onbekend(L_2; zijden_2)
        u_2 = if(onb_2 ≡ 1; 0 mm; u_w(F_2/γ_Q; L_2; zijden_2)) to mm
        UC_u,2 = u_2/u_max
        UC_w,2 = max(UC_r,2; UC_a,2; UC_st,2; UC_c90,2; UC_gl,2; UC_pl,2; UC_u,2)
    #end if
    #if n_wanden ≥ 3
        UC_r,3 = F_3/max(R_3; 0.001 kN)
        L_ef,3 = L_ef(L_3; zijden_3) to mm
        F_t,3 = F_3*h_w/max(L_ef,3; 1 mm) to kN
        N_t,3 = max(0 kN; F_t,3 - γ_G,inf*G_k,3*a_eind) to kN
        UC_a,3 = N_t,3/max(F_a,Rd; 0.001 kN)
        N_c,3 = F_t,3 + (γ_G*G_k,3 + γ_Q*ψ_0*Q_k,3)*(a_eind + a_op,3) to kN
        M_w,3 = γ_Q*abs(w_k,3)*(a_eind + a_op,3)*h_w^2/8 to kN*m
        UC_st,3 = UC_st(N_c,3; M_w,3)
        UC_c90,3 = N_c,3/(A_ef*k_c,90*f_c,90,d)
        UC_gl,3 = F_3/(max(v_Rd; 0.001 kN/m)*max(L_3; 1 mm))
        UC_pl,3 = UC_pl(F_3; L_3; zijden_3)
        onb_3 = onbekend(L_3; zijden_3)
        u_3 = if(onb_3 ≡ 1; 0 mm; u_w(F_3/γ_Q; L_3; zijden_3)) to mm
        UC_u,3 = u_3/u_max
        UC_w,3 = max(UC_r,3; UC_a,3; UC_st,3; UC_c90,3; UC_gl,3; UC_pl,3; UC_u,3)
    #end if
    #if n_wanden ≥ 4
        UC_r,4 = F_4/max(R_4; 0.001 kN)
        L_ef,4 = L_ef(L_4; zijden_4) to mm
        F_t,4 = F_4*h_w/max(L_ef,4; 1 mm) to kN
        N_t,4 = max(0 kN; F_t,4 - γ_G,inf*G_k,4*a_eind) to kN
        UC_a,4 = N_t,4/max(F_a,Rd; 0.001 kN)
        N_c,4 = F_t,4 + (γ_G*G_k,4 + γ_Q*ψ_0*Q_k,4)*(a_eind + a_op,4) to kN
        M_w,4 = γ_Q*abs(w_k,4)*(a_eind + a_op,4)*h_w^2/8 to kN*m
        UC_st,4 = UC_st(N_c,4; M_w,4)
        UC_c90,4 = N_c,4/(A_ef*k_c,90*f_c,90,d)
        UC_gl,4 = F_4/(max(v_Rd; 0.001 kN/m)*max(L_4; 1 mm))
        UC_pl,4 = UC_pl(F_4; L_4; zijden_4)
        onb_4 = onbekend(L_4; zijden_4)
        u_4 = if(onb_4 ≡ 1; 0 mm; u_w(F_4/γ_Q; L_4; zijden_4)) to mm
        UC_u,4 = u_4/u_max
        UC_w,4 = max(UC_r,4; UC_a,4; UC_st,4; UC_c90,4; UC_gl,4; UC_pl,4; UC_u,4)
    #end if
    #if n_wanden ≥ 5
        UC_r,5 = F_5/max(R_5; 0.001 kN)
        L_ef,5 = L_ef(L_5; zijden_5) to mm
        F_t,5 = F_5*h_w/max(L_ef,5; 1 mm) to kN
        N_t,5 = max(0 kN; F_t,5 - γ_G,inf*G_k,5*a_eind) to kN
        UC_a,5 = N_t,5/max(F_a,Rd; 0.001 kN)
        N_c,5 = F_t,5 + (γ_G*G_k,5 + γ_Q*ψ_0*Q_k,5)*(a_eind + a_op,5) to kN
        M_w,5 = γ_Q*abs(w_k,5)*(a_eind + a_op,5)*h_w^2/8 to kN*m
        UC_st,5 = UC_st(N_c,5; M_w,5)
        UC_c90,5 = N_c,5/(A_ef*k_c,90*f_c,90,d)
        UC_gl,5 = F_5/(max(v_Rd; 0.001 kN/m)*max(L_5; 1 mm))
        UC_pl,5 = UC_pl(F_5; L_5; zijden_5)
        onb_5 = onbekend(L_5; zijden_5)
        u_5 = if(onb_5 ≡ 1; 0 mm; u_w(F_5/γ_Q; L_5; zijden_5)) to mm
        UC_u,5 = u_5/u_max
        UC_w,5 = max(UC_r,5; UC_a,5; UC_st,5; UC_c90,5; UC_gl,5; UC_pl,5; UC_u,5)
    #end if
    #if n_wanden ≥ 6
        UC_r,6 = F_6/max(R_6; 0.001 kN)
        L_ef,6 = L_ef(L_6; zijden_6) to mm
        F_t,6 = F_6*h_w/max(L_ef,6; 1 mm) to kN
        N_t,6 = max(0 kN; F_t,6 - γ_G,inf*G_k,6*a_eind) to kN
        UC_a,6 = N_t,6/max(F_a,Rd; 0.001 kN)
        N_c,6 = F_t,6 + (γ_G*G_k,6 + γ_Q*ψ_0*Q_k,6)*(a_eind + a_op,6) to kN
        M_w,6 = γ_Q*abs(w_k,6)*(a_eind + a_op,6)*h_w^2/8 to kN*m
        UC_st,6 = UC_st(N_c,6; M_w,6)
        UC_c90,6 = N_c,6/(A_ef*k_c,90*f_c,90,d)
        UC_gl,6 = F_6/(max(v_Rd; 0.001 kN/m)*max(L_6; 1 mm))
        UC_pl,6 = UC_pl(F_6; L_6; zijden_6)
        onb_6 = onbekend(L_6; zijden_6)
        u_6 = if(onb_6 ≡ 1; 0 mm; u_w(F_6/γ_Q; L_6; zijden_6)) to mm
        UC_u,6 = u_6/u_max
        UC_w,6 = max(UC_r,6; UC_a,6; UC_st,6; UC_c90,6; UC_gl,6; UC_pl,6; UC_u,6)
    #end if
    onb_tot = max(onb_1; onb_2; onb_3; onb_4; onb_5; onb_6)
    #show

    '<h6>8.3 Krachten en verplaatsing per wand</h6>
    '<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:2px solid #374151;">
    '<th style="text-align:left; padding:4px 8px;">Wand</th>
    '<th style="text-align:right; padding:4px 8px;">L<sub>ef</sub> (mm)</th>
    '<th style="text-align:right; padding:4px 8px;">F<sub>t</sub> (kN)</th>
    '<th style="text-align:right; padding:4px 8px;">N<sub>t</sub> anker (kN)</th>
    '<th style="text-align:right; padding:4px 8px;">N<sub>c</sub> eindstijl (kN)</th>
    '<th style="text-align:right; padding:4px 8px;">M<sub>w</sub> (kNm)</th>
    '<th style="text-align:right; padding:4px 8px;">u (mm)</th></tr>
    #if onb_1 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">1</td><td style="padding:4px 8px; text-align:right;">'L_ef,1'</td><td style="padding:4px 8px; text-align:right;">'F_t,1'</td><td style="padding:4px 8px; text-align:right;">'N_t,1'</td><td style="padding:4px 8px; text-align:right;">'N_c,1'</td><td style="padding:4px 8px; text-align:right;">'M_w,1'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">1</td><td style="padding:4px 8px; text-align:right;">'L_ef,1'</td><td style="padding:4px 8px; text-align:right;">'F_t,1'</td><td style="padding:4px 8px; text-align:right;">'N_t,1'</td><td style="padding:4px 8px; text-align:right;">'N_c,1'</td><td style="padding:4px 8px; text-align:right;">'M_w,1'</td><td style="padding:4px 8px; text-align:right;">'u_1'</td></tr>
    #end if
    #if n_wanden ≥ 2
    #if onb_2 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">2</td><td style="padding:4px 8px; text-align:right;">'L_ef,2'</td><td style="padding:4px 8px; text-align:right;">'F_t,2'</td><td style="padding:4px 8px; text-align:right;">'N_t,2'</td><td style="padding:4px 8px; text-align:right;">'N_c,2'</td><td style="padding:4px 8px; text-align:right;">'M_w,2'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">2</td><td style="padding:4px 8px; text-align:right;">'L_ef,2'</td><td style="padding:4px 8px; text-align:right;">'F_t,2'</td><td style="padding:4px 8px; text-align:right;">'N_t,2'</td><td style="padding:4px 8px; text-align:right;">'N_c,2'</td><td style="padding:4px 8px; text-align:right;">'M_w,2'</td><td style="padding:4px 8px; text-align:right;">'u_2'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 3
    #if onb_3 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">3</td><td style="padding:4px 8px; text-align:right;">'L_ef,3'</td><td style="padding:4px 8px; text-align:right;">'F_t,3'</td><td style="padding:4px 8px; text-align:right;">'N_t,3'</td><td style="padding:4px 8px; text-align:right;">'N_c,3'</td><td style="padding:4px 8px; text-align:right;">'M_w,3'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">3</td><td style="padding:4px 8px; text-align:right;">'L_ef,3'</td><td style="padding:4px 8px; text-align:right;">'F_t,3'</td><td style="padding:4px 8px; text-align:right;">'N_t,3'</td><td style="padding:4px 8px; text-align:right;">'N_c,3'</td><td style="padding:4px 8px; text-align:right;">'M_w,3'</td><td style="padding:4px 8px; text-align:right;">'u_3'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 4
    #if onb_4 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">4</td><td style="padding:4px 8px; text-align:right;">'L_ef,4'</td><td style="padding:4px 8px; text-align:right;">'F_t,4'</td><td style="padding:4px 8px; text-align:right;">'N_t,4'</td><td style="padding:4px 8px; text-align:right;">'N_c,4'</td><td style="padding:4px 8px; text-align:right;">'M_w,4'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">4</td><td style="padding:4px 8px; text-align:right;">'L_ef,4'</td><td style="padding:4px 8px; text-align:right;">'F_t,4'</td><td style="padding:4px 8px; text-align:right;">'N_t,4'</td><td style="padding:4px 8px; text-align:right;">'N_c,4'</td><td style="padding:4px 8px; text-align:right;">'M_w,4'</td><td style="padding:4px 8px; text-align:right;">'u_4'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 5
    #if onb_5 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">5</td><td style="padding:4px 8px; text-align:right;">'L_ef,5'</td><td style="padding:4px 8px; text-align:right;">'F_t,5'</td><td style="padding:4px 8px; text-align:right;">'N_t,5'</td><td style="padding:4px 8px; text-align:right;">'N_c,5'</td><td style="padding:4px 8px; text-align:right;">'M_w,5'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">5</td><td style="padding:4px 8px; text-align:right;">'L_ef,5'</td><td style="padding:4px 8px; text-align:right;">'F_t,5'</td><td style="padding:4px 8px; text-align:right;">'N_t,5'</td><td style="padding:4px 8px; text-align:right;">'N_c,5'</td><td style="padding:4px 8px; text-align:right;">'M_w,5'</td><td style="padding:4px 8px; text-align:right;">'u_5'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 6
    #if onb_6 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">6</td><td style="padding:4px 8px; text-align:right;">'L_ef,6'</td><td style="padding:4px 8px; text-align:right;">'F_t,6'</td><td style="padding:4px 8px; text-align:right;">'N_t,6'</td><td style="padding:4px 8px; text-align:right;">'N_c,6'</td><td style="padding:4px 8px; text-align:right;">'M_w,6'</td><td style="padding:4px 8px; text-align:right; color:#6B7280;">n.b.</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">6</td><td style="padding:4px 8px; text-align:right;">'L_ef,6'</td><td style="padding:4px 8px; text-align:right;">'F_t,6'</td><td style="padding:4px 8px; text-align:right;">'N_t,6'</td><td style="padding:4px 8px; text-align:right;">'N_c,6'</td><td style="padding:4px 8px; text-align:right;">'M_w,6'</td><td style="padding:4px 8px; text-align:right;">'u_6'</td></tr>
    #end if
    #end if
    '</table>
    #if onb_tot ≡ 1
        '<i class="ook-afdruk">n.b.: verplaatsing niet bepaald; vul voor de beplating van die wand G en, bij gipsplaat, K<sub>ser</sub> in.</i>
    #end if

    # 9. Overzicht en maatgevende wand

    #hide
    px_lo = min(0; x_1/(1 m); x_2/(1 m); x_3/(1 m); x_4/(1 m); x_5/(1 m); x_6/(1 m))
    px_hi = max(B_gevel/(1 m); x_1/(1 m); x_2/(1 m); x_3/(1 m); x_4/(1 m); x_5/(1 m); x_6/(1 m))
    px_s = 360/max(px_hi - px_lo; 0.001)
    py_s = 110/max(L_1/(1 mm); L_2/(1 mm); L_3/(1 mm); L_4/(1 mm); L_5/(1 mm); L_6/(1 mm); 1)
    X_1 = 60 + (x_1/(1 m) - px_lo)*px_s
    Lp_1 = max(2; L_1/(1 mm)*py_s)
    X_2 = 60 + (x_2/(1 m) - px_lo)*px_s
    Lp_2 = max(2; L_2/(1 mm)*py_s)
    X_3 = 60 + (x_3/(1 m) - px_lo)*px_s
    Lp_3 = max(2; L_3/(1 mm)*py_s)
    X_4 = 60 + (x_4/(1 m) - px_lo)*px_s
    Lp_4 = max(2; L_4/(1 mm)*py_s)
    X_5 = 60 + (x_5/(1 m) - px_lo)*px_s
    Lp_5 = max(2; L_5/(1 mm)*py_s)
    X_6 = 60 + (x_6/(1 m) - px_lo)*px_s
    Lp_6 = max(2; L_6/(1 mm)*py_s)
    X_F = 60 + ((B_gevel/2 + abs(e_F))/(1 m) - px_lo)*px_s
    X_F2 = 60 + ((B_gevel/2 - abs(e_F))/(1 m) - px_lo)*px_s
    'Zonder invoer (de eerste tel na het invoegen) is er nog geen sterktecentrum.
    x_cs = if(isNaN(x_c); 0 m; x_c)
    X_C = 60 + (x_cs/(1 m) - px_lo)*px_s
    X_0 = 60 + (0 - px_lo)*px_s
    X_B = 60 + (B_gevel/(1 m) - px_lo)*px_s
    #show

    '<i>Plattegrond op schaal, met de kleur van de maatgevende unity check per wand en zijn aandeel in
    'de belasting.</i>

    '<svg viewbox="0 0 480 250" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:260px;">
    '  <!-- de gevel die de wind vangt -->
    '  <line x1="'X_0'" y1="196" x2="'X_B'" y2="196" style="stroke:#374151; stroke-width:2.2"/>
    '  <text x="'X_B'" y="190" text-anchor="end" style="fill:#374151">gevel</text>
    '  <!-- sterktecentrum -->
    '  <line x1="'X_C'" y1="22" x2="'X_C'" y2="188" style="stroke:#6B7280; stroke-width:1; stroke-dasharray:5 4"/>
    '  <text x="'X_C + 4'" y="30" style="fill:#6B7280">sterktecentrum</text>
    '  <rect x="'X_1 - 4'" y="'100 - Lp_1/2'" width="8" height="'Lp_1'" style="fill:'kleur(UC_w,1)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_1'" y="'100 - Lp_1/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">1</text>
    '  <text x="'X_1'" y="'100 + Lp_1/2 + 14'" text-anchor="middle" style="fill:#374151">'F_1' kN</text>
    #if n_wanden ≥ 2
    '  <rect x="'X_2 - 4'" y="'100 - Lp_2/2'" width="8" height="'Lp_2'" style="fill:'kleur(UC_w,2)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_2'" y="'100 - Lp_2/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">2</text>
    '  <text x="'X_2'" y="'100 + Lp_2/2 + 14'" text-anchor="middle" style="fill:#374151">'F_2' kN</text>
    #end if
    #if n_wanden ≥ 3
    '  <rect x="'X_3 - 4'" y="'100 - Lp_3/2'" width="8" height="'Lp_3'" style="fill:'kleur(UC_w,3)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_3'" y="'100 - Lp_3/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">3</text>
    '  <text x="'X_3'" y="'100 + Lp_3/2 + 14'" text-anchor="middle" style="fill:#374151">'F_3' kN</text>
    #end if
    #if n_wanden ≥ 4
    '  <rect x="'X_4 - 4'" y="'100 - Lp_4/2'" width="8" height="'Lp_4'" style="fill:'kleur(UC_w,4)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_4'" y="'100 - Lp_4/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">4</text>
    '  <text x="'X_4'" y="'100 + Lp_4/2 + 14'" text-anchor="middle" style="fill:#374151">'F_4' kN</text>
    #end if
    #if n_wanden ≥ 5
    '  <rect x="'X_5 - 4'" y="'100 - Lp_5/2'" width="8" height="'Lp_5'" style="fill:'kleur(UC_w,5)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_5'" y="'100 - Lp_5/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">5</text>
    '  <text x="'X_5'" y="'100 + Lp_5/2 + 14'" text-anchor="middle" style="fill:#374151">'F_5' kN</text>
    #end if
    #if n_wanden ≥ 6
    '  <rect x="'X_6 - 4'" y="'100 - Lp_6/2'" width="8" height="'Lp_6'" style="fill:'kleur(UC_w,6)'; stroke:#374151; stroke-width:0.8"/>
    '  <text x="'X_6'" y="'100 - Lp_6/2 - 6'" text-anchor="middle" style="fill:#374151; font-weight:700">6</text>
    '  <text x="'X_6'" y="'100 + Lp_6/2 + 14'" text-anchor="middle" style="fill:#374151">'F_6' kN</text>
    #end if
    '  <!-- de horizontale belasting op B/2 ± e_F -->
    #if abs(e_F) > 0.001 m
    '  <line x1="'X_F2'" y1="244" x2="'X_F2'" y2="206" style="stroke:#B91C1C; stroke-width:1.2; stroke-dasharray:4 3"/>
    '  <polygon points="'X_F2',200 'X_F2 - 5',211 'X_F2 + 5',211" style="fill:none; stroke:#B91C1C; stroke-width:1"/>
    #end if
    '  <line x1="'X_F'" y1="244" x2="'X_F'" y2="206" style="stroke:#B91C1C; stroke-width:2"/>
    '  <polygon points="'X_F',200 'X_F - 6',212 'X_F + 6',212" style="fill:#B91C1C"/>
    '  <text x="'X_F + 8'" y="236" style="fill:#B91C1C; font-weight:700">F<tspan baseline-shift="sub" font-size="8">v,Ed</tspan> = 'F_v,Ed' kN</text>
    '</svg>'

    #hide
    gebruikt_A = max(bool(n_wanden ≥ 1)*bool(zijden_1 ≠ 2)*bool(zijden_1 ≠ 5); bool(n_wanden ≥ 2)*bool(zijden_2 ≠ 2)*bool(zijden_2 ≠ 5); bool(n_wanden ≥ 3)*bool(zijden_3 ≠ 2)*bool(zijden_3 ≠ 5); bool(n_wanden ≥ 4)*bool(zijden_4 ≠ 2)*bool(zijden_4 ≠ 5); bool(n_wanden ≥ 5)*bool(zijden_5 ≠ 2)*bool(zijden_5 ≠ 5); bool(n_wanden ≥ 6)*bool(zijden_6 ≠ 2)*bool(zijden_6 ≠ 5))
    gebruikt_B = max(bool(n_wanden ≥ 1)*bool(zijden_1 ≠ 1)*bool(zijden_1 ≠ 4); bool(n_wanden ≥ 2)*bool(zijden_2 ≠ 1)*bool(zijden_2 ≠ 4); bool(n_wanden ≥ 3)*bool(zijden_3 ≠ 1)*bool(zijden_3 ≠ 4); bool(n_wanden ≥ 4)*bool(zijden_4 ≠ 1)*bool(zijden_4 ≠ 4); bool(n_wanden ≥ 5)*bool(zijden_5 ≠ 1)*bool(zijden_5 ≠ 4); bool(n_wanden ≥ 6)*bool(zijden_6 ≠ 1)*bool(zijden_6 ≠ 4))
    'De detailleringsregels zijn grenzen, geen sterktetoetsen: ze tellen als
    'voldoet of voldoet niet en niet mee in de maatgevende unity check.
    ok_A = if(gebruikt_A ≡ 0; 1; bool(UC_s,A ≤ 1)*bool(UC_pen,A ≤ 1)*bool(UC_plooi,A ≤ 1)*bool(UC_dikte,A ≤ 1)*bool(k_mod,A > 0))
    ok_B = if(gebruikt_B ≡ 0; 1; bool(UC_s,B ≤ 1)*bool(UC_pen,B ≤ 1)*bool(UC_plooi,B ≤ 1)*bool(UC_dikte,B ≤ 1)*bool(k_mod,B > 0))
    'Een wand zonder sterkte krijgt geen aandeel; hebben alle wanden samen geen
    'sterkte (R_tot = 0), dan beslist UC_totaal. Anders is die nooit maatgevend.
    UC_max = max(UC_w,1; UC_w,2; UC_w,3; UC_w,4; UC_w,5; UC_w,6; UC_totaal)
    voldoet = bool(UC_max ≤ 1)*ok_A*ok_B
    j_m = if(UC_w,1 ≡ UC_max; 1; if(UC_w,2 ≡ UC_max; 2; if(UC_w,3 ≡ UC_max; 3; if(UC_w,4 ≡ UC_max; 4; if(UC_w,5 ≡ UC_max; 5; if(UC_w,6 ≡ UC_max; 6; 1))))))
    L_m = if(j_m ≡ 1; L_1; if(j_m ≡ 2; L_2; if(j_m ≡ 3; L_3; if(j_m ≡ 4; L_4; if(j_m ≡ 5; L_5; L_6)))))
    F_m = if(j_m ≡ 1; F_1; if(j_m ≡ 2; F_2; if(j_m ≡ 3; F_3; if(j_m ≡ 4; F_4; if(j_m ≡ 5; F_5; F_6)))))
    R_m = if(j_m ≡ 1; R_1; if(j_m ≡ 2; R_2; if(j_m ≡ 3; R_3; if(j_m ≡ 4; R_4; if(j_m ≡ 5; R_5; R_6)))))
    z_m = if(j_m ≡ 1; zijden_1; if(j_m ≡ 2; zijden_2; if(j_m ≡ 3; zijden_3; if(j_m ≡ 4; zijden_4; if(j_m ≡ 5; zijden_5; zijden_6)))))
    N_t,m = if(j_m ≡ 1; N_t,1; if(j_m ≡ 2; N_t,2; if(j_m ≡ 3; N_t,3; if(j_m ≡ 4; N_t,4; if(j_m ≡ 5; N_t,5; N_t,6)))))
    N_c,m = if(j_m ≡ 1; N_c,1; if(j_m ≡ 2; N_c,2; if(j_m ≡ 3; N_c,3; if(j_m ≡ 4; N_c,4; if(j_m ≡ 5; N_c,5; N_c,6)))))
    'Aanzicht op schaal: panelen, stijlen, en de krachten aan de wandeinden.
    L_mr = max(L_m/(1 mm); 1)
    h_r = max(h_w/(1 mm); 1)
    se = min(360/L_mr; 150/h_r)
    ex0 = 60 + (360 - L_mr*se)/2
    ex1 = ex0 + L_mr*se
    ey0 = 40
    ey1 = ey0 + h_r*se
    bpl_m = max(if(z_m ≡ 2; b_pl,B; if(z_m ≡ 5; b_pl,B; b_pl,A))/(1 mm); 1)
    np_m = floor(L_mr/bpl_m)
    rest_m = L_mr - np_m*bpl_m
    vul_rest = if(rest_m ≥ h_r/4; "#F5E6C8"; "#E5E7EB")
    hoh_r = max(hoh/(1 mm); 1)
    nst_m = floor(L_mr/hoh_r)
    svgH_m = ey1 + 70
    #show

    '<i>Wand 'j_m' is maatgevend: aanzicht van de beplating op schaal met de krachten uit figuur 9.5. Een
    'grijs restpaneel is smaller dan h/4 en telt niet mee.</i>

    '<svg viewbox="0 0 480 'svgH_m'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'svgH_m + 10'px;">
    #if np_m ≥ 1
        #for i = 0 : np_m - 1
        '  <rect x="'ex0 + i*bpl_m*se'" y="'ey0'" width="'bpl_m*se'" height="'h_r*se'" style="fill:#F5E6C8; stroke:#8B6F47; stroke-width:1"/>
        #loop
    #end if
    #if rest_m > 1
        '  <rect x="'ex0 + np_m*bpl_m*se'" y="'ey0'" width="'rest_m*se'" height="'h_r*se'" style="fill:'vul_rest'; stroke:#8B6F47; stroke-width:1"/>
    #end if
    #for i = 0 : nst_m
    '  <line x1="'ex0 + i*hoh_r*se'" y1="'ey0'" x2="'ex0 + i*hoh_r*se'" y2="'ey1'" style="stroke:#8B6F47; stroke-width:0.8; stroke-dasharray:3 3"/>
    #loop
    '  <rect x="'ex0'" y="'ey0'" width="'L_mr*se'" height="'h_r*se'" style="fill:none; stroke:#374151; stroke-width:1.6"/>
    '  <rect x="'ex0 - 3'" y="'ey0'" width="6" height="'h_r*se'" style="fill:#B45309"/>
    '  <rect x="'ex1 - 3'" y="'ey0'" width="6" height="'h_r*se'" style="fill:#B45309"/>
    '  <!-- horizontale kracht bovenin, van rechts -->
    '  <line x1="'ex1 + 46'" y1="'ey0'" x2="'ex1 + 10'" y2="'ey0'" style="stroke:#B91C1C; stroke-width:2"/>
    '  <polygon points="'ex1 + 4','ey0' 'ex1 + 14','ey0 - 5' 'ex1 + 14','ey0 + 5'" style="fill:#B91C1C"/>
    '  <text x="'ex1 + 4'" y="'ey0 - 10'" style="fill:#B91C1C; font-weight:700">F = 'F_m' kN</text>
    '  <!-- druk op de eindstijl links, anker rechts -->
    '  <line x1="'ex0'" y1="'ey1 + 42'" x2="'ex0'" y2="'ey1 + 10'" style="stroke:#1E40AF; stroke-width:2"/>
    '  <polygon points="'ex0','ey1 + 4' 'ex0 - 5','ey1 + 14' 'ex0 + 5','ey1 + 14'" style="fill:#1E40AF"/>
    '  <text x="'ex0 + 6'" y="'ey1 + 36'" style="fill:#1E40AF; font-weight:700">N<tspan baseline-shift="sub" font-size="8">c</tspan> = 'N_c,m' kN</text>
    '  <line x1="'ex1'" y1="'ey1 + 4'" x2="'ex1'" y2="'ey1 + 36'" style="stroke:#B45309; stroke-width:2"/>
    '  <polygon points="'ex1','ey1 + 42' 'ex1 - 5','ey1 + 32' 'ex1 + 5','ey1 + 32'" style="fill:#B45309"/>
    '  <text x="'ex1 - 6'" y="'ey1 + 36'" text-anchor="end" style="fill:#B45309; font-weight:700">anker N<tspan baseline-shift="sub" font-size="8">t</tspan> = 'N_t,m' kN</text>
    '  <!-- maatlijnen -->
    '  <line x1="'ex0'" y1="'ey1 + 58'" x2="'ex1'" y2="'ey1 + 58'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <text x="'(ex0 + ex1)/2'" y="'ey1 + 54'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">L = 'L_m' mm</text>
    '  <line x1="'ex0 - 22'" y1="'ey0'" x2="'ex0 - 22'" y2="'ey1'" style="stroke:#1E40AF; stroke-width:1"/>
    '  <text x="'ex0 - 26'" y="'(ey0 + ey1)/2'" text-anchor="end" style="fill:#1E40AF; font-weight:700">h = 'h_w' mm</text>
    '</svg>'

    # 10. Samenvatting

    '<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:2px solid #374151;">
    '<th style="text-align:left; padding:4px 6px;">Wand</th>
    '<th style="text-align:right; padding:4px 6px;">Wandvlak (9.21)</th>
    '<th style="text-align:right; padding:4px 6px;">Anker</th>
    '<th style="text-align:right; padding:4px 6px;">Eindstijl</th>
    '<th style="text-align:right; padding:4px 6px;">Onderregel</th>
    '<th style="text-align:right; padding:4px 6px;">Glijden</th>
    '<th style="text-align:right; padding:4px 6px;">Plaat</th>
    '<th style="text-align:right; padding:4px 6px;">Verplaatsing</th>
    '<th style="text-align:right; padding:4px 6px;">Maatgevend</th></tr>
    #if onb_1 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">1</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,1)'">'UC_r,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,1)'">'UC_a,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,1)'">'UC_st,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,1)'">'UC_c90,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,1)'">'UC_gl,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,1)'">'UC_pl,1'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,1)'">'UC_w,1'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">1</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,1)'">'UC_r,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,1)'">'UC_a,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,1)'">'UC_st,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,1)'">'UC_c90,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,1)'">'UC_gl,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,1)'">'UC_pl,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,1)'">'UC_u,1'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,1)'">'UC_w,1'</td></tr>
    #end if
    #if n_wanden ≥ 2
    #if onb_2 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">2</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,2)'">'UC_r,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,2)'">'UC_a,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,2)'">'UC_st,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,2)'">'UC_c90,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,2)'">'UC_gl,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,2)'">'UC_pl,2'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,2)'">'UC_w,2'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">2</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,2)'">'UC_r,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,2)'">'UC_a,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,2)'">'UC_st,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,2)'">'UC_c90,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,2)'">'UC_gl,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,2)'">'UC_pl,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,2)'">'UC_u,2'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,2)'">'UC_w,2'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 3
    #if onb_3 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">3</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,3)'">'UC_r,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,3)'">'UC_a,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,3)'">'UC_st,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,3)'">'UC_c90,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,3)'">'UC_gl,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,3)'">'UC_pl,3'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,3)'">'UC_w,3'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">3</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,3)'">'UC_r,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,3)'">'UC_a,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,3)'">'UC_st,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,3)'">'UC_c90,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,3)'">'UC_gl,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,3)'">'UC_pl,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,3)'">'UC_u,3'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,3)'">'UC_w,3'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 4
    #if onb_4 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">4</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,4)'">'UC_r,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,4)'">'UC_a,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,4)'">'UC_st,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,4)'">'UC_c90,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,4)'">'UC_gl,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,4)'">'UC_pl,4'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,4)'">'UC_w,4'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">4</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,4)'">'UC_r,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,4)'">'UC_a,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,4)'">'UC_st,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,4)'">'UC_c90,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,4)'">'UC_gl,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,4)'">'UC_pl,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,4)'">'UC_u,4'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,4)'">'UC_w,4'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 5
    #if onb_5 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">5</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,5)'">'UC_r,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,5)'">'UC_a,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,5)'">'UC_st,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,5)'">'UC_c90,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,5)'">'UC_gl,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,5)'">'UC_pl,5'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,5)'">'UC_w,5'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">5</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,5)'">'UC_r,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,5)'">'UC_a,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,5)'">'UC_st,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,5)'">'UC_c90,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,5)'">'UC_gl,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,5)'">'UC_pl,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,5)'">'UC_u,5'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,5)'">'UC_w,5'</td></tr>
    #end if
    #end if
    #if n_wanden ≥ 6
    #if onb_6 ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">6</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,6)'">'UC_r,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,6)'">'UC_a,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,6)'">'UC_st,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,6)'">'UC_c90,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,6)'">'UC_gl,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,6)'">'UC_pl,6'</td><td style="padding:4px 6px; text-align:right; color:#6B7280;">n.b.</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,6)'">'UC_w,6'</td></tr>
    #else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">6</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,6)'">'UC_r,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,6)'">'UC_a,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,6)'">'UC_st,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,6)'">'UC_c90,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,6)'">'UC_gl,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,6)'">'UC_pl,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_u,6)'">'UC_u,6'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,6)'">'UC_w,6'</td></tr>
    #end if
    #end if
    '</table>

    UC_totaal', de bouwlaag als geheel: F_v,Ed gedeeld door de som van F_v,Rd'
    #if gebruikt_A ≡ 1
        #if ok_A ≡ 1
            'Detaillering beplating A (§3.3):<span style="color: green"> <b>voldoet</b></span>
        #else
            'Detaillering beplating A (§3.3):<span style="color: red"> <b>voldoet niet</b></span> — zie de regels met een waarde boven 1,0.
        #end if
    #end if
    #if gebruikt_B ≡ 1
        #if ok_B ≡ 1
            'Detaillering beplating B (§4.3):<span style="color: green"> <b>voldoet</b></span>
        #else
            'Detaillering beplating B (§4.3):<span style="color: red"> <b>voldoet niet</b></span> — zie de regels met een waarde boven 1,0.
        #end if
    #end if

    #if voldoet ≡ 1
        #if onb_tot ≡ 1
            '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ≤ 1,0, maar <b>de verplaatsing is niet bepaald</b> (n.b.): apart aantonen.</span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de wanden in deze richting voldoen</b></span>
        #end if
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de wanden voldoen niet: de detaillering klopt niet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de wanden in deze richting voldoen niet</b></span>
    #end if
#end if

'<hr/>
'<i class="ook-afdruk">Aandachtspunten en vereenvoudigingen:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Methode A vraagt een anker aan beide wandeinden, direct verbonden met de constructie eronder (§9.2.4.2(1)); een onverankerde wand valt buiten dit blad.</li><li>Op de tussenstijlen hoogstens tweemaal de afstand van de verbindingsmiddelen langs de plaatranden, en niet meer dan 300 mm (§9.2.4.2(12) en §10.8.2).</li><li>De verplaatsing is een indicatief ingenieursmodel: methode A geeft er geen.</li><li>De eindstijl is alleen getoetst in de combinatie met wind; onder alleen verticale belasting hoort hij bij de stijlberekening.</li><li>Niet getoetst: de overdracht tussen geprefabriceerde wandelementen (§9.2.4.2(13)) en de vloerschijf. Bij glijden is de wrijving onder de onderregel niet meegenomen.</li></ul>
`;
