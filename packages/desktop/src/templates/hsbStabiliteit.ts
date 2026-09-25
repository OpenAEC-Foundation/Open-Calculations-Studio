/**
 * Stabiliteit HSB-wanden — wandschijven in houtskeletbouw volgens
 * NEN-EN 1995-1-1:2005+A2:2014 met NB:2013, §9.2.4.2 (methode A).
 *
 * Eén bouwlaag, één richting. De horizontale belasting gaat via de vloer naar
 * de wanden in die richting, naar rato van hun schijfsterkte, met een
 * torsiedeel bij een excentrische last. Per wand volgen de schijfsterkte, de
 * verankering tegen kantelen en glijden, de gedrukte eindstijl (knik §6.3.2,
 * druk loodrecht op de onderregel §6.1.5) en de schuifspanning in de beplating.
 *
 * De sterkte per verbindingsmiddel komt uit §8.2.2 (Johansen) met de
 * stuiksterkten van §8.3.1, inclusief de Nederlandse regels voor gipskarton- en
 * gipsvezelplaat (NB.8.1, NB.8.2 en Tabel NB.2).
 *
 * De zes wandblokken zijn gelijk op het nummer na. Voor deze module bestaat
 * geen referentieberekening; scripts/check-hsb-stabiliteit.mjs rekent de
 * uitkomsten onafhankelijk na. Status in de catalogus: controleren.
 */

export const hsbStabiliteit = `"Stabiliteit HSB-wanden — wandschijven volgens EN 1995-1-1 §9.2.4.2

'<i>Stabiliteit van één bouwlaag in houtskeletbouw, in één richting. De
'horizontale belasting gaat via de vloer naar de wanden in die richting. Een
'wand is hier een dicht wanddeel met aan beide einden een trekanker: een deel
'met een deur- of raamopening telt niet mee (§9.2.4.2(6)), dus de dichte delen
'naast een opening zijn aparte wanden. De sterkte in het wandvlak volgt methode
'A (§9.2.4.2), de methode die de Nederlandse bijlage voorschrijft.</i>

# 1. Uitgangspunten

#hide
'Kleur per unity check: rood boven 1,0, oranje vanaf 0,90, anders groen.
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select klimaat "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

'<i>Wind is een kortdurende belasting. Voor wind is ψ<sub>0</sub> = 0 (Tabel
'NB.2 – A1.1), dus wind komt alleen als overheersende belasting in een
'combinatie voor: vergelijking 6.10b. De factoren volgen uit de gevolgklasse in
'de projectgegevens (Tabel NB.4 – A1.2(B) en Tabel NB.5).</i>

CC', gevolgklasse uit de projectgegevens'
γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))', blijvend, ongunstig (6.10b)'
γ_G,inf = 0.9', blijvend, gunstig'
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))', veranderlijk'

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
e_F = ?*(m)', excentriciteit van de last ten opzichte van het midden'

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
'Sterkteklassen EN 338: [klasse | f_m,k | f_c,0,k | f_c,90,k | E_0,05 | ρ_k]
hout = [1; 2; 3; 4; 5; 6; 7; 8 |14; 16; 18; 20; 22; 24; 27; 30 |16; 17; 18; 19; 20; 21; 22; 23 |2.0; 2.2; 2.2; 2.3; 2.4; 2.5; 2.6; 2.7 |4700; 5400; 6000; 6400; 6700; 7400; 7700; 8000 |290; 310; 320; 330; 340; 350; 370; 380]
f_m,k = hlookup(hout; sterkteklasse; 1; 2)*N/mm^2
f_c,0,k = hlookup(hout; sterkteklasse; 1; 3)*N/mm^2
f_c,90,k = hlookup(hout; sterkteklasse; 1; 4)*N/mm^2
E_0,05 = hlookup(hout; sterkteklasse; 1; 5)*N/mm^2
ρ_k = hlookup(hout; sterkteklasse; 1; 6)*kg/m^3
#show
f_m,k
f_c,0,k
f_c,90,k
E_0,05
ρ_k
γ_M = 1.3', gezaagd hout (Tabel 2.3)'
k_mod = if(klimaat ≡ 3; 0.70; 0.90)', hout, belastingsduur kort (Tabel 3.1)'
k_h = if(h_st < 150 mm; min(1.3; (150 mm/h_st)^0.2); 1)', hoogtefactor bij buiging uit het wandvlak (§3.2(3))'
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

'<i>Beplating A en B zijn de twee plaatsoorten die in de wanden voorkomen,
'bijvoorbeeld OSB aan de buitenzijde en gipskarton aan de binnenzijde. Per wand
'staat in §5 welke erop zit.</i>

# 3. Beplating A en bevestiging

@select plaat_A "Plaatmateriaal A"
  OSB/3 (EN 300) = 1
  OSB/4 (EN 300) = 2
  Spaanplaat P5 (EN 312) = 3
  Multiplex (EN 636) = 4
  Gipskartonplaat (NEN-EN 520) = 5
  Gipsvezelplaat (NEN-EN 15283-2) = 6
@end

t_A = ?*(mm)', plaatdikte'
b_pl,A = ?*(mm)', plaatbreedte = breedte van één wandpaneel'
s_A = ?*(mm)', afstand van de verbindingsmiddelen langs de plaatranden'

#if plaat_A ≡ 5
    f_v,A = 1.0*N/mm^2', afschuifsterkte in het plaatvlak, gipskartonplaat (Tabel NB.4)'
#else
    f_v,A = ?*(N/mm^2)', afschuifsterkte in het plaatvlak (EN 12369 of productblad)'
#end if

#hide
k_mod,A = hlookup(kmod_pl; plaat_A; 1; klimaat + 1)
γ_M,A = hlookup(γ_pl; plaat_A; 1; 2)
#show
k_mod,A', plaat, belastingsduur kort (Tabel 3.1 of NB.2)'
γ_M,A', plaat (Tabel 2.3 of NB bij 2.4.1(3))'
f_v,d,A = k_mod,A*f_v,A/γ_M,A', rekenwaarde afschuifsterkte plaat'
#if k_mod,A ≡ 0
    '<b style="color:#b91c1c">Plaatmateriaal A is in klimaatklasse 'klimaat' niet toegestaan (Tabel 3.1 en NB bij 3.8).</b>
#end if

@select bevestiging_A "Verbindingsmiddel A"
  Gladde nagel = 1
  Geprofileerde of gegroefde nagel = 2
  Schroef (d_ef ≤ 6 mm) = 3
@end

d_A = ?*(mm)', diameter; bij een schroef d_ef = 1,1 × kerndiameter (§8.7.1)'
l_A = ?*(mm)', lengte van het verbindingsmiddel'
t_pen,A = l_A - t_A', indringdiepte in de stijl'

@select bron_A "Sterkte per verbindingsmiddel A"
  Berekenen volgens §8.2.2 = 1
  Rekenwaarde invoeren = 2
@end

#if bron_A ≡ 1
    f_u,A = ?*(N/mm^2)', treksterkte van de draad (gladde nagel minimaal 600)'
    F_ax,A = ?*(N)', uittreksterkte F_ax,Rk voor het koordeffect, 0 als onbekend'
    '<h6>3.1 Stuiksterkte en vloeimoment (§8.3.1)</h6>
    #hide
    d_rA = d_A/(1 mm)
    t_rA = t_A/(1 mm)
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
    M_y,A = if(bevestiging_A ≡ 2; 0.45; 0.3)*(f_u,A/(1 N/mm^2))*d_rA^2.6*N*mm', vloeimoment (8.14)'
    '<h6>3.2 Bezwijkmechanismen van de enkelsnedige verbinding (8.6)</h6>
    '<i>Element 1 is de plaat (dikte t<sub>1</sub> = t), element 2 de stijl
    'waarin de punt zit (t<sub>2</sub> = indringdiepte). Het koordeffect
    'F<sub>ax,Rk</sub>/4 komt bij (c) t/m (f) bovenop het Johansen-deel, maar niet
    'meer dan 15 % (gladde nagel), 25 % (geprofileerde nagel) of 100 % (schroef)
    'daarvan (§8.2.2(2)). Bij gipsplaat is het nul (NB bij 8.3.1.5(5)).</i>
    #hide
    t_2A = max(t_pen,A; 0.1 mm)
    ρ_tA = t_2A/t_A
    F_A,a = f_h,1A*t_A*d_A to N
    F_A,b = f_h,2A*t_2A*d_A to N
    F_A,c = f_h,1A*t_A*d_A/(1 + β_A)*(sqrt(β_A + 2*β_A^2*(1 + ρ_tA + ρ_tA^2) + β_A^3*ρ_tA^2) - β_A*(1 + ρ_tA)) to N
    F_A,d = 1.05*f_h,1A*t_A*d_A/(2 + β_A)*(sqrt(2*β_A*(1 + β_A) + 4*β_A*(2 + β_A)*M_y,A/(f_h,1A*d_A*t_A^2)) - β_A) to N
    F_A,e = 1.05*f_h,1A*t_2A*d_A/(1 + 2*β_A)*(sqrt(2*β_A^2*(1 + β_A) + 4*β_A*(1 + 2*β_A)*M_y,A/(f_h,1A*d_A*t_2A^2)) - β_A) to N
    F_A,f = 1.15*sqrt(2*β_A/(1 + β_A))*sqrt(2*M_y,A*f_h,1A*d_A) to N
    p_ax,A = if(plaat_A ≥ 5; 0; if(bevestiging_A ≡ 1; 0.15; if(bevestiging_A ≡ 2; 0.25; 1)))
    F_A,kc = F_A,c + min(F_ax,A/4; p_ax,A*F_A,c) to N
    F_A,kd = F_A,d + min(F_ax,A/4; p_ax,A*F_A,d) to N
    F_A,ke = F_A,e + min(F_ax,A/4; p_ax,A*F_A,e) to N
    F_A,kf = F_A,f + min(F_ax,A/4; p_ax,A*F_A,f) to N
    F_v,Rk,A = min(F_A,a; F_A,b; F_A,kc; F_A,kd; F_A,ke; F_A,kf) to N
    #show
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(a)</th><th style="padding:3px 8px;">(b)</th><th style="padding:3px 8px;">(c)</th><th style="padding:3px 8px;">(d)</th><th style="padding:3px 8px;">(e)</th><th style="padding:3px 8px;">(f)</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'F_A,a'</td><td style="padding:3px 8px; text-align:right;">'F_A,b'</td><td style="padding:3px 8px; text-align:right;">'F_A,c'</td><td style="padding:3px 8px; text-align:right;">'F_A,d'</td><td style="padding:3px 8px; text-align:right;">'F_A,e'</td><td style="padding:3px 8px; text-align:right;">'F_A,f'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'F_A,a'</td><td style="padding:3px 8px; text-align:right;">'F_A,b'</td><td style="padding:3px 8px; text-align:right;">'F_A,kc'</td><td style="padding:3px 8px; text-align:right;">'F_A,kd'</td><td style="padding:3px 8px; text-align:right;">'F_A,ke'</td><td style="padding:3px 8px; text-align:right;">'F_A,kf'</td></tr>
    '</table>
    F_v,Rk,A', het kleinste van de zes mechanismen'
    k_mod,vA = sqrt(k_mod*k_mod,A)', verbinding van hout met plaat (2.6)'
    F_f,Rd,A = k_mod,vA*F_v,Rk,A/γ_M,v to kN', rekenwaarde per verbindingsmiddel'
#else
    F_f,Rd,A = ?*(kN)', rekenwaarde per verbindingsmiddel volgens hoofdstuk 8, zonder de factor 1,2'
#end if
F_f,rand,A = 1.2*F_f,Rd,A to kN', langs de plaatranden ×1,2 (§9.2.4.2(5))'

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

t_B = ?*(mm)', plaatdikte'
b_pl,B = ?*(mm)', plaatbreedte = breedte van één wandpaneel'
s_B = ?*(mm)', afstand van de verbindingsmiddelen langs de plaatranden'

#if plaat_B ≡ 5
    f_v,B = 1.0*N/mm^2', afschuifsterkte in het plaatvlak, gipskartonplaat (Tabel NB.4)'
#else
    f_v,B = ?*(N/mm^2)', afschuifsterkte in het plaatvlak (EN 12369 of productblad)'
#end if

#hide
k_mod,B = hlookup(kmod_pl; plaat_B; 1; klimaat + 1)
γ_M,B = hlookup(γ_pl; plaat_B; 1; 2)
#show
k_mod,B', plaat, belastingsduur kort (Tabel 3.1 of NB.2)'
γ_M,B', plaat (Tabel 2.3 of NB bij 2.4.1(3))'
f_v,d,B = k_mod,B*f_v,B/γ_M,B', rekenwaarde afschuifsterkte plaat'
#if k_mod,B ≡ 0
    '<b style="color:#b91c1c">Plaatmateriaal B is in klimaatklasse 'klimaat' niet toegestaan (Tabel 3.1 en NB bij 3.8).</b>
#end if

@select bevestiging_B "Verbindingsmiddel B"
  Gladde nagel = 1
  Geprofileerde of gegroefde nagel = 2
  Schroef (d_ef ≤ 6 mm) = 3
@end

d_B = ?*(mm)', diameter; bij een schroef d_ef = 1,1 × kerndiameter (§8.7.1)'
l_B = ?*(mm)', lengte van het verbindingsmiddel'
t_pen,B = l_B - t_B', indringdiepte in de stijl'

@select bron_B "Sterkte per verbindingsmiddel B"
  Berekenen volgens §8.2.2 = 1
  Rekenwaarde invoeren = 2
@end

#if bron_B ≡ 1
    f_u,B = ?*(N/mm^2)', treksterkte van de draad (gladde nagel minimaal 600)'
    F_ax,B = ?*(N)', uittreksterkte F_ax,Rk voor het koordeffect, 0 als onbekend'
    '<h6>4.1 Stuiksterkte en vloeimoment (§8.3.1)</h6>
    #hide
    d_rB = d_B/(1 mm)
    t_rB = t_B/(1 mm)
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
    M_y,B = if(bevestiging_B ≡ 2; 0.45; 0.3)*(f_u,B/(1 N/mm^2))*d_rB^2.6*N*mm', vloeimoment (8.14)'
    '<h6>4.2 Bezwijkmechanismen van de enkelsnedige verbinding (8.6)</h6>
    '<i>Element 1 is de plaat (dikte t<sub>1</sub> = t), element 2 de stijl
    'waarin de punt zit (t<sub>2</sub> = indringdiepte). Het koordeffect
    'F<sub>ax,Rk</sub>/4 komt bij (c) t/m (f) bovenop het Johansen-deel, maar niet
    'meer dan 15 % (gladde nagel), 25 % (geprofileerde nagel) of 100 % (schroef)
    'daarvan (§8.2.2(2)). Bij gipsplaat is het nul (NB bij 8.3.1.5(5)).</i>
    #hide
    t_2B = max(t_pen,B; 0.1 mm)
    ρ_tB = t_2B/t_B
    F_B,a = f_h,1B*t_B*d_B to N
    F_B,b = f_h,2B*t_2B*d_B to N
    F_B,c = f_h,1B*t_B*d_B/(1 + β_B)*(sqrt(β_B + 2*β_B^2*(1 + ρ_tB + ρ_tB^2) + β_B^3*ρ_tB^2) - β_B*(1 + ρ_tB)) to N
    F_B,d = 1.05*f_h,1B*t_B*d_B/(2 + β_B)*(sqrt(2*β_B*(1 + β_B) + 4*β_B*(2 + β_B)*M_y,B/(f_h,1B*d_B*t_B^2)) - β_B) to N
    F_B,e = 1.05*f_h,1B*t_2B*d_B/(1 + 2*β_B)*(sqrt(2*β_B^2*(1 + β_B) + 4*β_B*(1 + 2*β_B)*M_y,B/(f_h,1B*d_B*t_2B^2)) - β_B) to N
    F_B,f = 1.15*sqrt(2*β_B/(1 + β_B))*sqrt(2*M_y,B*f_h,1B*d_B) to N
    p_ax,B = if(plaat_B ≥ 5; 0; if(bevestiging_B ≡ 1; 0.15; if(bevestiging_B ≡ 2; 0.25; 1)))
    F_B,kc = F_B,c + min(F_ax,B/4; p_ax,B*F_B,c) to N
    F_B,kd = F_B,d + min(F_ax,B/4; p_ax,B*F_B,d) to N
    F_B,ke = F_B,e + min(F_ax,B/4; p_ax,B*F_B,e) to N
    F_B,kf = F_B,f + min(F_ax,B/4; p_ax,B*F_B,f) to N
    F_v,Rk,B = min(F_B,a; F_B,b; F_B,kc; F_B,kd; F_B,ke; F_B,kf) to N
    #show
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(a)</th><th style="padding:3px 8px;">(b)</th><th style="padding:3px 8px;">(c)</th><th style="padding:3px 8px;">(d)</th><th style="padding:3px 8px;">(e)</th><th style="padding:3px 8px;">(f)</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'F_B,a'</td><td style="padding:3px 8px; text-align:right;">'F_B,b'</td><td style="padding:3px 8px; text-align:right;">'F_B,c'</td><td style="padding:3px 8px; text-align:right;">'F_B,d'</td><td style="padding:3px 8px; text-align:right;">'F_B,e'</td><td style="padding:3px 8px; text-align:right;">'F_B,f'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'F_B,a'</td><td style="padding:3px 8px; text-align:right;">'F_B,b'</td><td style="padding:3px 8px; text-align:right;">'F_B,kc'</td><td style="padding:3px 8px; text-align:right;">'F_B,kd'</td><td style="padding:3px 8px; text-align:right;">'F_B,ke'</td><td style="padding:3px 8px; text-align:right;">'F_B,kf'</td></tr>
    '</table>
    F_v,Rk,B', het kleinste van de zes mechanismen'
    k_mod,vB = sqrt(k_mod*k_mod,B)', verbinding van hout met plaat (2.6)'
    F_f,Rd,B = k_mod,vB*F_v,Rk,B/γ_M,v to kN', rekenwaarde per verbindingsmiddel'
#else
    F_f,Rd,B = ?*(kN)', rekenwaarde per verbindingsmiddel volgens hoofdstuk 8, zonder de factor 1,2'
#end if
F_f,rand,B = 1.2*F_f,Rd,B to kN', langs de plaatranden ×1,2 (§9.2.4.2(5))'

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

'<i>Een wand is een dicht wanddeel met een trekanker aan beide einden
'(§9.2.4.2(1)). De positie x is de plaats van de wand loodrecht op de
'lastrichting, gemeten vanaf dezelfde gevelrand als de gebouwbreedte in §1. De
'lijnlasten staan op de bovenregel en zijn inclusief het eigen gewicht van de
'wand. w<sub>k</sub> is de karakteristieke winddruk loodrecht op de wand zelf;
'die buigt de eindstijl uit het wandvlak.</i>

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
ψ_0 = if(cat_Q ≡ 1; 0.4; if(cat_Q ≡ 2; 0.5; if(cat_Q ≡ 3; 0.6; if(cat_Q ≡ 4; 0.4; if(cat_Q ≡ 5; 1.0; 0)))))', gelijktijdig met wind (bij C de waarde voor vluchtwegen)'

F_a,Rd = ?*(kN)', rekenwaarde van de trekcapaciteit van het anker per wandeinde'
v_Rd = ?*(kN/m)', rekenwaarde van de schuifverankering van de onderregel per meter'

#hide
'Standaardwaarden voor de wanden die niet meedoen. Zo blijven de sommen en de
'tabellen verderop gedefinieerd, en draagt een ongebruikte wand niets bij.
L_2 = 0 mm
zijden_2 = 1
x_2 = 0 m
G_k,2 = 0 kN/m
Q_k,2 = 0 kN/m
w_k,2 = 0 kN/m^2
R_2 = 0 kN
L_3 = 0 mm
zijden_3 = 1
x_3 = 0 m
G_k,3 = 0 kN/m
Q_k,3 = 0 kN/m
w_k,3 = 0 kN/m^2
R_3 = 0 kN
L_4 = 0 mm
zijden_4 = 1
x_4 = 0 m
G_k,4 = 0 kN/m
Q_k,4 = 0 kN/m
w_k,4 = 0 kN/m^2
R_4 = 0 kN
L_5 = 0 mm
zijden_5 = 1
x_5 = 0 m
G_k,5 = 0 kN/m
Q_k,5 = 0 kN/m
w_k,5 = 0 kN/m^2
R_5 = 0 kN
L_6 = 0 mm
zijden_6 = 1
x_6 = 0 m
G_k,6 = 0 kN/m
Q_k,6 = 0 kN/m
w_k,6 = 0 kN/m^2
R_6 = 0 kN
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
#end if

# 6. Sterkte in het wandvlak per wand — methode A (§9.2.4.2)

'<i>Een wand bestaat uit panelen van één plaatbreedte. Per paneel geldt (9.21)
'met de breedtefactor c<sub>i</sub> uit (9.22). Een restpaneel aan het eind telt
'alleen mee als het minstens h/4 breed is (§9.2.4.2(2)). Met een horizontale
'naad in de beplating gaat een paneel dat smaller is dan h/2 ×0,85 (NB bij
'9.2.4.2(17)).</i>

@select naad "Horizontale naad in de beplating"
  Nee = 0
  Ja, alle plaatranden schuifvast verbonden = 1
@end

b_0 = h_w/2', (9.22)'
c_i(b) = min(1; b/b_0)
k_naad(b) = if(naad ≡ 1; if(b < 0.5*h_w; 0.85; 1); 1)
R_pA(b) = bool(b ≥ h_w/4)*F_f,rand,A*b*c_i(b)*k_naad(b)*k_18,A/s_A
R_pB(b) = bool(b ≥ h_w/4)*F_f,rand,B*b*c_i(b)*k_naad(b)*k_18,B/s_B
R_A(L) = floor(L/b_pl,A)*R_pA(b_pl,A) + R_pA(L - floor(L/b_pl,A)*b_pl,A)
R_B(L) = floor(L/b_pl,B)*R_pB(b_pl,B) + R_pB(L - floor(L/b_pl,B)*b_pl,B)

'<i>Platen aan beide zijden (§9.2.4.2(7)): zelfde plaat en verbindingsmiddel,
'dan tellen beide zijden volledig. Anders telt de zwakste zijde voor 75 % mee
'als de verbindingsmiddelen dezelfde verschuivingsmodulus hebben, en anders
'voor 50 %.</i>

@select gelijke_k "Verbindingsmiddelen A en B met dezelfde verschuivingsmodulus"
  Nee = 0
  Ja = 1
@end

zelfde = (plaat_A ≡ plaat_B)*(t_A ≡ t_B)*(bevestiging_A ≡ bevestiging_B)*(d_A ≡ d_B)*(l_A ≡ l_B)
f_zwak = if(zelfde ≡ 1; 1; if(gelijke_k ≡ 1; 0.75; 0.5))', aandeel van de zwakste zijde'
R_AB(L) = max(R_A(L); R_B(L)) + f_zwak*min(R_A(L); R_B(L))
R_w(L; z) = if(z ≡ 1; R_A(L); if(z ≡ 2; R_B(L); if(z ≡ 3; R_AB(L); if(z ≡ 4; 2*R_A(L); 2*R_B(L)))))

R_1 = R_w(L_1; zijden_1) to kN
#if n_wanden ≥ 2
    R_2 = R_w(L_2; zijden_2) to kN
#end if
#if n_wanden ≥ 3
    R_3 = R_w(L_3; zijden_3) to kN
#end if
#if n_wanden ≥ 4
    R_4 = R_w(L_4; zijden_4) to kN
#end if
#if n_wanden ≥ 5
    R_5 = R_w(L_5; zijden_5) to kN
#end if
#if n_wanden ≥ 6
    R_6 = R_w(L_6; zijden_6) to kN
#end if

# 7. Verdeling van de horizontale belasting

'<i>De vloer verdeelt de belasting over de wanden naar rato van hun sterkte in
'het wandvlak: dezelfde gedachte als de optelling in (9.20). Ligt de last niet in
'het sterktecentrum, dan ontstaat een torsiemoment. Dat wordt hier alleen door de
'evenwijdige wanden opgenomen; de wanden in de andere richting helpen in
'werkelijkheid mee, dus dit is aan de veilige kant. Een wand krijgt er door de
'torsie alleen iets bij, er gaat nooit iets af.</i>

#hide
R_tot = R_1 + R_2 + R_3 + R_4 + R_5 + R_6 to kN
x_c = (R_1*x_1 + R_2*x_2 + R_3*x_3 + R_4*x_4 + R_5*x_5 + R_6*x_6)/max(R_tot; 0.001 kN)
I_R = R_1*(x_1 - x_c)^2 + R_2*(x_2 - x_c)^2 + R_3*(x_3 - x_c)^2 + R_4*(x_4 - x_c)^2 + R_5*(x_5 - x_c)^2 + R_6*(x_6 - x_c)^2 to kN*m^2
#show
R_tot', som van de sterkten van de wanden (9.20)'
UC_totaal = F_v,Ed/max(R_tot; 0.001 kN)', de bouwlaag als geheel'
x_c', sterktecentrum: som van R_i·x_i gedeeld door R_tot'
x_F = B_gevel/2 + e_F', aangrijpingspunt van de last'
e_t = x_F - x_c', excentriciteit ten opzichte van het sterktecentrum'
M_t = F_v,Ed*e_t to kN*m', torsiemoment'
I_R', som van R_i·(x_i − x_c)²; het torsiedeel van wand i is M_t·R_i·(x_i − x_c)/I_R'
#if I_R < 0.001 kN*m^2
    #if abs(M_t) > 0.01 kN*m
        '<b style="color:#b91c1c">De wanden in deze richting liggen in één lijn en kunnen het torsiemoment niet opnemen; dat moet via de wanden in de andere richting.</b>
    #end if
#end if
#hide
ΔF_1 = if(I_R > 0.001 kN*m^2; M_t*R_1*(x_1 - x_c)/I_R; 0 kN)
ΔF_2 = if(I_R > 0.001 kN*m^2; M_t*R_2*(x_2 - x_c)/I_R; 0 kN)
ΔF_3 = if(I_R > 0.001 kN*m^2; M_t*R_3*(x_3 - x_c)/I_R; 0 kN)
ΔF_4 = if(I_R > 0.001 kN*m^2; M_t*R_4*(x_4 - x_c)/I_R; 0 kN)
ΔF_5 = if(I_R > 0.001 kN*m^2; M_t*R_5*(x_5 - x_c)/I_R; 0 kN)
ΔF_6 = if(I_R > 0.001 kN*m^2; M_t*R_6*(x_6 - x_c)/I_R; 0 kN)
F_1 = F_v,Ed*R_1/max(R_tot; 0.001 kN) + max(0 kN; ΔF_1) to kN
F_2 = F_v,Ed*R_2/max(R_tot; 0.001 kN) + max(0 kN; ΔF_2) to kN
F_3 = F_v,Ed*R_3/max(R_tot; 0.001 kN) + max(0 kN; ΔF_3) to kN
F_4 = F_v,Ed*R_4/max(R_tot; 0.001 kN) + max(0 kN; ΔF_4) to kN
F_5 = F_v,Ed*R_5/max(R_tot; 0.001 kN) + max(0 kN; ΔF_5) to kN
F_6 = F_v,Ed*R_6/max(R_tot; 0.001 kN) + max(0 kN; ΔF_6) to kN
zt_1 = if(zijden_1 ≡ 1; "A"; if(zijden_1 ≡ 2; "B"; if(zijden_1 ≡ 3; "A + B"; if(zijden_1 ≡ 4; "2× A"; "2× B"))))
zt_2 = if(zijden_2 ≡ 1; "A"; if(zijden_2 ≡ 2; "B"; if(zijden_2 ≡ 3; "A + B"; if(zijden_2 ≡ 4; "2× A"; "2× B"))))
zt_3 = if(zijden_3 ≡ 1; "A"; if(zijden_3 ≡ 2; "B"; if(zijden_3 ≡ 3; "A + B"; if(zijden_3 ≡ 4; "2× A"; "2× B"))))
zt_4 = if(zijden_4 ≡ 1; "A"; if(zijden_4 ≡ 2; "B"; if(zijden_4 ≡ 3; "A + B"; if(zijden_4 ≡ 4; "2× A"; "2× B"))))
zt_5 = if(zijden_5 ≡ 1; "A"; if(zijden_5 ≡ 2; "B"; if(zijden_5 ≡ 3; "A + B"; if(zijden_5 ≡ 4; "2× A"; "2× B"))))
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

'<i>Per wand volgt uit het aandeel F<sub>v,Ed</sub> de trek- en drukkracht aan
'de wandeinden (9.23). De trekkracht gaat naar het anker, verminderd met de
'gunstig werkende permanente last. De drukkracht komt samen met de verticale
'belasting in de eindstijl, die op knik wordt getoetst en met zijn voet op de
'onderregel drukt (§9.2.4.2(9)). Het anker en de eindstijl zijn aan beide
'einden gelijk, want de wind kan van twee kanten komen.</i>

'<h6>8.1 Eindstijl</h6>
a_eind = hoh/2', invloedsbreedte van de eindstijl'
A_eind = n_eind*b_st*h_st
W_eind = n_eind*b_st*h_st^2/6
λ_y = h_w/(h_st/sqrt(12))', uit het wandvlak, kniklengte = wandhoogte'
λ_rel,y = λ_y/π*sqrt(f_c,0,k/E_0,05)', (6.21)'
β_c = 0.2', gezaagd hout (6.29)'
k_y = 0.5*(1 + β_c*(λ_rel,y - 0.3) + λ_rel,y^2)', (6.27)'
k_c,y = min(1; 1/(k_y + sqrt(k_y^2 - λ_rel,y^2)))', (6.25)'
#hide
'In het wandvlak houdt de beplating de stijl vast; kniklengte = de afstand
'tussen de verbindingsmiddelen.
λ_z = max(s_A; s_B)/(n_eind*b_st/sqrt(12))
λ_rel,z = λ_z/π*sqrt(f_c,0,k/E_0,05)
k_z = 0.5*(1 + β_c*(λ_rel,z - 0.3) + λ_rel,z^2)
#show
k_c,z = min(1; 1/(k_z + sqrt(k_z^2 - λ_rel,z^2)))', in het wandvlak, kniklengte = afstand van de verbindingsmiddelen (6.26)'
k_m = 0.7', rechthoekige doorsnede (§6.1.6(2))'
A_ef = h_st*(n_eind*b_st + 30 mm)', contactvlak op de onderregel: +30 mm aan de binnenzijde, aan het einde niet (§6.1.5(1))'
k_c,90 = 1.25', naaldhout op een doorgaande ondersteuning (§6.1.5(3))'

'<h6>8.2 Rekenregels</h6>
F_t(F; L) = F*h_w/max(L; 1 mm)
N_t(F; L; G) = max(0 kN; F_t(F; L) - γ_G,inf*G*L/2)
N_c(F; L; G; Q) = F_t(F; L) + (γ_G*G + γ_Q*ψ_0*Q)*a_eind
M_w(w) = γ_Q*w*a_eind*h_w^2/8
UC_st(N; w) = max(N/A_eind/(k_c,y*f_c,0,d) + M_w(w)/W_eind/f_m,d; N/A_eind/(k_c,z*f_c,0,d) + k_m*M_w(w)/W_eind/f_m,d)
'<i>De schuifkracht van een wand met platen aan twee zijden verdeelt zich naar
'rato van de meegetelde sterkte per zijde.</i>
C_A(L) = if(R_A(L) ≥ R_B(L); R_A(L); f_zwak*R_A(L))
C_B(L) = if(R_B(L) > R_A(L); R_B(L); f_zwak*R_B(L))
a_A(L; z) = if(z ≡ 1; 1; if(z ≡ 2; 0; if(z ≡ 3; C_A(L)/max(C_A(L) + C_B(L); 0.001 kN); if(z ≡ 4; 0.5; 0))))
a_B(L; z) = if(z ≡ 1; 0; if(z ≡ 2; 1; if(z ≡ 3; C_B(L)/max(C_A(L) + C_B(L); 0.001 kN); if(z ≡ 4; 0; 0.5))))
'<i>Een zijde zonder aandeel telt niet mee. Een plaat die in deze klimaatklasse
'niet is toegestaan heeft geen sterkte; draagt hij toch, dan wordt de toets
'hier onvoldoende.</i>
u_A(F; L; z) = if(a_A(L; z) > 0; F*a_A(L; z)/(max(L; 1 mm)*t_A)/max(f_v,d,A; 0.001 N/mm^2); 0)
u_B(F; L; z) = if(a_B(L; z) > 0; F*a_B(L; z)/(max(L; 1 mm)*t_B)/max(f_v,d,B; 0.001 N/mm^2); 0)
UC_pl(F; L; z) = max(u_A(F; L; z); u_B(F; L; z))

#hide
N_t,1 = 0 kN
N_c,1 = 0 kN
UC_r,1 = 0
UC_a,1 = 0
UC_st,1 = 0
UC_c90,1 = 0
UC_gl,1 = 0
UC_pl,1 = 0
UC_w,1 = 0
N_t,2 = 0 kN
N_c,2 = 0 kN
UC_r,2 = 0
UC_a,2 = 0
UC_st,2 = 0
UC_c90,2 = 0
UC_gl,2 = 0
UC_pl,2 = 0
UC_w,2 = 0
N_t,3 = 0 kN
N_c,3 = 0 kN
UC_r,3 = 0
UC_a,3 = 0
UC_st,3 = 0
UC_c90,3 = 0
UC_gl,3 = 0
UC_pl,3 = 0
UC_w,3 = 0
N_t,4 = 0 kN
N_c,4 = 0 kN
UC_r,4 = 0
UC_a,4 = 0
UC_st,4 = 0
UC_c90,4 = 0
UC_gl,4 = 0
UC_pl,4 = 0
UC_w,4 = 0
N_t,5 = 0 kN
N_c,5 = 0 kN
UC_r,5 = 0
UC_a,5 = 0
UC_st,5 = 0
UC_c90,5 = 0
UC_gl,5 = 0
UC_pl,5 = 0
UC_w,5 = 0
N_t,6 = 0 kN
N_c,6 = 0 kN
UC_r,6 = 0
UC_a,6 = 0
UC_st,6 = 0
UC_c90,6 = 0
UC_gl,6 = 0
UC_pl,6 = 0
UC_w,6 = 0
#show

'<h6>Wand 1 — L = 'L_1' mm, beplating 'zt_1'</h6>
F_1', aandeel van de horizontale belasting (§7)'
UC_r,1 = F_1/max(R_1; 0.001 kN)', schijfsterkte (9.21)'
N_t,1 = N_t(F_1; L_1; G_k,1) to kN', netto trekkracht per anker'
UC_a,1 = N_t,1/max(F_a,Rd; 0.001 kN)
N_c,1 = N_c(F_1; L_1; G_k,1; Q_k,1) to kN', druk in de eindstijl'
UC_st,1 = UC_st(N_c,1; w_k,1)', eindstijl op knik met buiging (6.23)/(6.24)'
UC_c90,1 = N_c,1/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
UC_gl,1 = F_1/(max(v_Rd; 0.001 kN/m)*max(L_1; 1 mm))', glijden van de onderregel'
UC_pl,1 = UC_pl(F_1; L_1; zijden_1)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
UC_w,1 = max(UC_r,1; UC_a,1; UC_st,1; UC_c90,1; UC_gl,1; UC_pl,1)

#if n_wanden ≥ 2
    '<h6>Wand 2 — L = 'L_2' mm, beplating 'zt_2'</h6>
    F_2', aandeel van de horizontale belasting (§7)'
    UC_r,2 = F_2/max(R_2; 0.001 kN)', schijfsterkte (9.21)'
    N_t,2 = N_t(F_2; L_2; G_k,2) to kN', netto trekkracht per anker'
    UC_a,2 = N_t,2/max(F_a,Rd; 0.001 kN)
    N_c,2 = N_c(F_2; L_2; G_k,2; Q_k,2) to kN', druk in de eindstijl'
    UC_st,2 = UC_st(N_c,2; w_k,2)', eindstijl op knik met buiging (6.23)/(6.24)'
    UC_c90,2 = N_c,2/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
    UC_gl,2 = F_2/(max(v_Rd; 0.001 kN/m)*max(L_2; 1 mm))', glijden van de onderregel'
    UC_pl,2 = UC_pl(F_2; L_2; zijden_2)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
    UC_w,2 = max(UC_r,2; UC_a,2; UC_st,2; UC_c90,2; UC_gl,2; UC_pl,2)
#end if

#if n_wanden ≥ 3
    '<h6>Wand 3 — L = 'L_3' mm, beplating 'zt_3'</h6>
    F_3', aandeel van de horizontale belasting (§7)'
    UC_r,3 = F_3/max(R_3; 0.001 kN)', schijfsterkte (9.21)'
    N_t,3 = N_t(F_3; L_3; G_k,3) to kN', netto trekkracht per anker'
    UC_a,3 = N_t,3/max(F_a,Rd; 0.001 kN)
    N_c,3 = N_c(F_3; L_3; G_k,3; Q_k,3) to kN', druk in de eindstijl'
    UC_st,3 = UC_st(N_c,3; w_k,3)', eindstijl op knik met buiging (6.23)/(6.24)'
    UC_c90,3 = N_c,3/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
    UC_gl,3 = F_3/(max(v_Rd; 0.001 kN/m)*max(L_3; 1 mm))', glijden van de onderregel'
    UC_pl,3 = UC_pl(F_3; L_3; zijden_3)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
    UC_w,3 = max(UC_r,3; UC_a,3; UC_st,3; UC_c90,3; UC_gl,3; UC_pl,3)
#end if

#if n_wanden ≥ 4
    '<h6>Wand 4 — L = 'L_4' mm, beplating 'zt_4'</h6>
    F_4', aandeel van de horizontale belasting (§7)'
    UC_r,4 = F_4/max(R_4; 0.001 kN)', schijfsterkte (9.21)'
    N_t,4 = N_t(F_4; L_4; G_k,4) to kN', netto trekkracht per anker'
    UC_a,4 = N_t,4/max(F_a,Rd; 0.001 kN)
    N_c,4 = N_c(F_4; L_4; G_k,4; Q_k,4) to kN', druk in de eindstijl'
    UC_st,4 = UC_st(N_c,4; w_k,4)', eindstijl op knik met buiging (6.23)/(6.24)'
    UC_c90,4 = N_c,4/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
    UC_gl,4 = F_4/(max(v_Rd; 0.001 kN/m)*max(L_4; 1 mm))', glijden van de onderregel'
    UC_pl,4 = UC_pl(F_4; L_4; zijden_4)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
    UC_w,4 = max(UC_r,4; UC_a,4; UC_st,4; UC_c90,4; UC_gl,4; UC_pl,4)
#end if

#if n_wanden ≥ 5
    '<h6>Wand 5 — L = 'L_5' mm, beplating 'zt_5'</h6>
    F_5', aandeel van de horizontale belasting (§7)'
    UC_r,5 = F_5/max(R_5; 0.001 kN)', schijfsterkte (9.21)'
    N_t,5 = N_t(F_5; L_5; G_k,5) to kN', netto trekkracht per anker'
    UC_a,5 = N_t,5/max(F_a,Rd; 0.001 kN)
    N_c,5 = N_c(F_5; L_5; G_k,5; Q_k,5) to kN', druk in de eindstijl'
    UC_st,5 = UC_st(N_c,5; w_k,5)', eindstijl op knik met buiging (6.23)/(6.24)'
    UC_c90,5 = N_c,5/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
    UC_gl,5 = F_5/(max(v_Rd; 0.001 kN/m)*max(L_5; 1 mm))', glijden van de onderregel'
    UC_pl,5 = UC_pl(F_5; L_5; zijden_5)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
    UC_w,5 = max(UC_r,5; UC_a,5; UC_st,5; UC_c90,5; UC_gl,5; UC_pl,5)
#end if

#if n_wanden ≥ 6
    '<h6>Wand 6 — L = 'L_6' mm, beplating 'zt_6'</h6>
    F_6', aandeel van de horizontale belasting (§7)'
    UC_r,6 = F_6/max(R_6; 0.001 kN)', schijfsterkte (9.21)'
    N_t,6 = N_t(F_6; L_6; G_k,6) to kN', netto trekkracht per anker'
    UC_a,6 = N_t,6/max(F_a,Rd; 0.001 kN)
    N_c,6 = N_c(F_6; L_6; G_k,6; Q_k,6) to kN', druk in de eindstijl'
    UC_st,6 = UC_st(N_c,6; w_k,6)', eindstijl op knik met buiging (6.23)/(6.24)'
    UC_c90,6 = N_c,6/(A_ef*k_c,90*f_c,90,d)', druk loodrecht op de onderregel (6.3)'
    UC_gl,6 = F_6/(max(v_Rd; 0.001 kN/m)*max(L_6; 1 mm))', glijden van de onderregel'
    UC_pl,6 = UC_pl(F_6; L_6; zijden_6)', schuifspanning in de beplating (NB bij 9.2.4.2(15))'
    UC_w,6 = max(UC_r,6; UC_a,6; UC_st,6; UC_c90,6; UC_gl,6; UC_pl,6)
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
X_F = 60 + (x_F/(1 m) - px_lo)*px_s
'Zonder invoer (de eerste tel na het invoegen) is er nog geen sterktecentrum.
x_cs = if(isNaN(x_c); 0 m; x_c)
X_C = 60 + (x_cs/(1 m) - px_lo)*px_s
X_0 = 60 + (0 - px_lo)*px_s
X_B = 60 + (B_gevel/(1 m) - px_lo)*px_s
#show

'<i>Plattegrond op schaal: elke wand staat op zijn positie x en is in de
'lastrichting getekend met zijn lengte. De kleur is de maatgevende unity check
'van de wand uit §8; het getal eronder zijn aandeel in de horizontale
'belasting.</i>

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
'  <!-- de horizontale belasting en haar werklijn -->
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
UC_max = max(UC_w,1; UC_w,2; UC_w,3; UC_w,4; UC_w,5; UC_w,6)
voldoet = bool(UC_max ≤ 1)*ok_A*ok_B
j_m = if(UC_w,1 ≡ UC_max; 1; if(UC_w,2 ≡ UC_max; 2; if(UC_w,3 ≡ UC_max; 3; if(UC_w,4 ≡ UC_max; 4; if(UC_w,5 ≡ UC_max; 5; 6)))))
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

'<i>Wand 'j_m' is maatgevend. Aanzicht van de beplating op schaal, met de
'krachten uit figuur 9.5: de horizontale kracht bovenin, de trekkracht in het
'anker aan de ene kant en de druk op de eindstijl aan de andere. Een grijs
'restpaneel is smaller dan h/4 en telt niet mee.</i>

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
'<th style="text-align:right; padding:4px 6px;">Maatgevend</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">1</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,1)'">'UC_r,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,1)'">'UC_a,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,1)'">'UC_st,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,1)'">'UC_c90,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,1)'">'UC_gl,1'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,1)'">'UC_pl,1'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,1)'">'UC_w,1'</td></tr>
#if n_wanden ≥ 2
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">2</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,2)'">'UC_r,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,2)'">'UC_a,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,2)'">'UC_st,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,2)'">'UC_c90,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,2)'">'UC_gl,2'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,2)'">'UC_pl,2'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,2)'">'UC_w,2'</td></tr>
#end if
#if n_wanden ≥ 3
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">3</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,3)'">'UC_r,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,3)'">'UC_a,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,3)'">'UC_st,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,3)'">'UC_c90,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,3)'">'UC_gl,3'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,3)'">'UC_pl,3'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,3)'">'UC_w,3'</td></tr>
#end if
#if n_wanden ≥ 4
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">4</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,4)'">'UC_r,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,4)'">'UC_a,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,4)'">'UC_st,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,4)'">'UC_c90,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,4)'">'UC_gl,4'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,4)'">'UC_pl,4'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,4)'">'UC_w,4'</td></tr>
#end if
#if n_wanden ≥ 5
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">5</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,5)'">'UC_r,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,5)'">'UC_a,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,5)'">'UC_st,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,5)'">'UC_c90,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,5)'">'UC_gl,5'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,5)'">'UC_pl,5'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,5)'">'UC_w,5'</td></tr>
#end if
#if n_wanden ≥ 6
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 6px;">6</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_r,6)'">'UC_r,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_a,6)'">'UC_a,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_st,6)'">'UC_st,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_c90,6)'">'UC_c90,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_gl,6)'">'UC_gl,6'</td><td style="padding:4px 6px; text-align:right; color:'kleur(UC_pl,6)'">'UC_pl,6'</td><td style="padding:4px 6px; text-align:right; font-weight:700; color:'kleur(UC_w,6)'">'UC_w,6'</td></tr>
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
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de wanden in deze richting voldoen</b></span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de wanden voldoen niet: de detaillering klopt niet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de wanden in deze richting voldoen niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten en vereenvoudigingen:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Methode A geldt alleen voor wanden met een anker aan beide einden, direct verbonden met de constructie eronder (§9.2.4.2(1)). Een wand zonder anker moet de kantelkracht met permanente last opvangen: dan moet N<sub>t</sub> = 0 zijn.</li><li>Op de tussenstijlen mag de afstand van de verbindingsmiddelen niet groter zijn dan tweemaal die langs de plaatranden, en niet groter dan 300 mm (§9.2.4.2(12) en §10.8.2).</li><li>De vervorming van de wanden in het wandvlak is niet berekend: methode A geeft daar geen model voor.</li><li>De eindstijl is alleen getoetst in de combinatie met wind. De toetsing onder alleen verticale belasting, met de bijbehorende k<sub>mod</sub>, hoort bij de stijlberekening.</li><li>De overdracht van de schuifkracht tussen geprefabriceerde wandelementen (§9.2.4.2(13)) en de vloerschijf zelf zijn hier niet getoetst.</li><li>Glijden: de wrijving onder de onderregel is niet meegenomen.</li></ul>
`;
