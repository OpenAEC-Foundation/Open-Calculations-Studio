/**
 * Schijfwerking — houten wandschijf (racking) volgens NEN-EN 1995-1-1 §9.2.4.2,
 * methode A, die de Nederlandse bijlage voorschrijft.
 *
 * Opneembare schuifkracht per paneel (9.20)–(9.22), kracht in de eindstijlen
 * (9.23), druk loodrecht op de vezel in de regel (§6.1.5), knik van de gedrukte
 * eindstijl met de buiging door wind op de wand (§6.3.2, (6.23)/(6.24)), het
 * anker, glijden van de onderregel, de schuifspanning in
 * de beplating (NB bij 9.2.4.2(15)), plooi van de beplating (9.2.4.2(11)) en de
 * afstand van de verbindingsmiddelen (10.8.2(1)).
 *
 * Status: de rekenregels zijn eerder naast referentiebladen van de
 * referentie-uitwerking gelegd, maar die vergelijking staat niet in een
 * controlescript.
 * check-schijfwerking.mjs rekent het blad met de hand na; de module blijft op
 * "controleren".
 *
 * Vier punten volgen de projectinstelling rekenwijze (docs/afwijkingen-referentie.md).
 * Met rekenwijze 1 aan de veilige kant, zoals de referentie-uitwerking; met 0
 * volgens de norm:
 *   • F_f,Rd zonder of met de verhoging 1,2 langs de plaatranden (9.2.4.2(5));
 *   • plooi met de h.o.h.-afstand of met de dagmaat (9.2.4.2(11));
 *   • verbindingsmiddelen hoogstens 150 mm h.o.h., of 200 mm bij schroeven
 *     (10.8.2(1));
 *   • druk ⊥ op het contactvlak van de stijl, zonder of met de uitbreiding van
 *     §6.1.5(1) aan de binnenzijde.
 *
 * In beide standen volgens de norm:
 *   • de sterkte per paneel, met n volle platen plus een restpaneel, elk met zijn
 *     eigen c_i; een paneel smaller dan h/4 telt niet mee (9.2.4.2(2));
 *   • bij een horizontale naad telt een paneel smaller dan 0,5·h voor 0,85 mee
 *     (NB bij 9.2.4.2(17)); in de referentiestand blijft de sterkte daarmee
 *     1/1,2 van die volgens de norm;
 *   • gipsplaat: minimaal 12,5 mm dik (NB bij 3.8(3)), type A en F alleen in
 *     klimaatklasse 1, type H en FH en gipsvezelplaat in 1 en 2 (NB bij 3.8(1)
 *     en (2)); beide tellen als detaillering. De reductie bij stijlen op
 *     a ≥ 35·t (NB bij 9.2.4.2(18)) rekent het blad niet: de slotzin zegt dan
 *     "niet volledig getoetst";
 *   • de hefboom in (9.23) is de meetellende lengte Σ b_i·c_i gedeeld door c_i
 *     van de breedste plaat: een smal restpaneel draagt minder, en de volle
 *     plaat aan het eind krijgt de grootste trekkracht;
 *   • de gedrukte eindstijl krijgt de grootste van F1 en F2: wind komt uit
 *     beide richtingen;
 *   • druk ⊥ rekent met het contactvlak van de stijl, niet met de doorsnede van
 *     de regel;
 *   • de kniklengte uit het vlak is de stijllengte: h − 2·t_regel als de regel
 *     doorloopt, h als de stijl doorloopt (hsbStabiliteit kent geen regeldikte
 *     en rekent aan de veilige kant met de wandhoogte);
 *   • wind op de wand (w_k, 0 voor een binnenwand) buigt de eindstijl over
 *     dezelfde lengte, op de invloedsbreedte hoh/2, net als in hsbStabiliteit.
 *
 * Het anker, glijden en de plaat worden alleen getoetst als hun capaciteit is
 * ingevuld. Anders zegt de slotzin "niet volledig getoetst" en niet "voldoet",
 * zodat de kop van het rapport geen "voldoet" meldt voor een blad met open
 * toetsen. De detailleringsregels tellen, net als in hsbStabiliteit, als
 * voldoet of voldoet niet en niet mee in de maatgevende UC.
 *
 * Variabelenamen komen exact overeen met de designer, zodat beeld en sheet
 * dezelfde invoer delen (de waarden van dit exemplaar).
 */

export const schijfwerking = `"Schijfwerking — houten wandschijf (EN 1995-1-1 §9.2.4)

'<i>Wandschijf met beplating, methode A (§9.2.4.2), aan beide einden verankerd. b is de wandlengte
'zonder openingen (9.2.4.2(6)).</i>

# 1. Verbinding & beplating

@select verbindingsmiddel "Verbindingsmiddel"
  Schroef = 1
  Nagel = 2
@end

F_f_Rd = ?*(kN)', rekenwaarde per verbindingsmiddel volgens hoofdstuk 8, zonder de verhoging 1,2 van 9.2.4.2(5)'
s_verb = ?*(mm)', h.o.h. verbindingsmiddelen langs de plaatranden'

@select n_zijdig "Aantal zijdige beplating"
  Enkelzijdig = 1
  Dubbelzijdig, aan beide zijden dezelfde plaat en verbinding = 2
@end

@select plaat "Plaatmateriaal"
  Houtachtige plaat = 1
  Gipskartonplaat type A of F = 2
  Gipskartonplaat type H of FH = 3
  Gipsvezelplaat = 4
@end

t_bepl = ?*(mm)', dikte beplating'
f_v,d = ?*(N/mm^2)', rekenwaarde afschuifsterkte van de beplating, k_mod·f_v,k/γ_M; 0 = niet getoetst'

# 2. Stijl & regel

t_stijl = ?*(mm)', dikte stijl, in het vlak van de wand'
b_stijl = ?*(mm)', breedte stijl, haaks op de wand'
t_regel = ?*(mm)', dikte regel'
b_regel = ?*(mm)', breedte regel'

@select detail_AC "Detailaansluiting van de eindstijl"
  Regel doorlopend = 1
  Stijl doorlopend = 2
@end

@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
@end

@select klimaatklasse "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

# 3. Geometrie

b = ?*(mm)', lengte van de wandschijf zonder openingen'
h = ?*(mm)', hoogte van de wandschijf'
bi = ?*(mm)', breedte van een beplatingsplaat'
hoh = ?*(mm)', h.o.h. afstand van de stijlen'

@select naad "Horizontale naad in de beplating"
  Nee = 0
  Ja, alle plaatranden schuifvast verbonden = 1
@end

# 4. Belasting en verankering

F1 = ?*(kN)', rekenwaarde (6.10b) van de verticale last op de eindstijl linksboven (A)'
F2 = ?*(kN)', rekenwaarde (6.10b) van de verticale last op de eindstijl rechtsboven (B)'
F_ivEd = ?*(kN)', rekenwaarde van de horizontale schuifkracht F_i,v,Ed'
w_k = ?*(kN/m^2)', winddruk loodrecht op de wand, voor de buiging van de eindstijl; 0 voor een binnenwand'
G_k,eind = ?*(kN)', karakteristieke permanente last op de minst belaste eindstijl; werkt gunstig op het anker'
F_a,Rd = ?*(kN)', rekenwaarde trekcapaciteit van het anker per wandeinde; 0 = niet getoetst'
v_Rd = ?*(kN/m)', rekenwaarde schuifverankering van de onderregel per meter; 0 = niet getoetst'

# 5. Materiaal (EN 338)

#hide
'Materiaalmatrix: [id | f_c,0,k | f_c,90,k | f_v,k | E_0,05 | f_m,k]
matmat = [1; 2; 3 |18; 21; 23 |2.2; 2.5; 2.7 |3.4; 4.0; 4.0 |6000; 7400; 8000 |18; 24; 30]
f_c0k = hlookup(matmat; sterkteklasse; 1; 2)*N/mm^2
f_c90k = hlookup(matmat; sterkteklasse; 1; 3)*N/mm^2
E_005 = hlookup(matmat; sterkteklasse; 1; 5)*N/mm^2
f_mk = hlookup(matmat; sterkteklasse; 1; 6)*N/mm^2
γ_M = 1.30
k_mod = if(klimaatklasse ≡ 3; 0.70; 0.90)
k_c90 = 1.25
β_c = 0.2
k_m = 0.7
k_h = if(b_stijl < 150 mm; min(1.3; (150 mm/b_stijl)^0.2); 1)
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
#show
k_mod', wind is kortdurend (Tabel 3.1); γ_M = 1,30 voor gezaagd hout (Tabel 2.3)'
f_c0d = f_c0k*k_mod/γ_M', rekenwaarde druksterkte ∥'
f_c90d = f_c90k*k_c90*k_mod/γ_M', rekenwaarde druksterkte ⊥, met k_c,90 = 1,25'

#hide
'Zonder deze maten rekent de schijf niet: een veld dat leeg is of op nul staat,
'gaf verderop NaN of een oneindige sterkte in plaats van een uitkomst.
ok_inv = bool(F_f_Rd > 0 kN and s_verb > 0 mm and t_bepl > 0 mm and t_stijl > 0 mm and b_stijl > 0 mm and t_regel > 0 mm and b_regel > 0 mm and b > 0 mm and h > 0 mm and bi > 0 mm)
'De toetsing hieronder staat zonder inspringen: de takken _ref en _nb horen op
'de eerste kolom (scripts/check-rekenwijze.mjs).
#show
#if ok_inv ≡ 0
    '<b style="color:#b91c1c">De invoer is onvolledig: de sterkte en de h.o.h.-afstand van de verbindingsmiddelen, de dikte van de beplating, de maten van stijl en regel, en de lengte en hoogte van de wand en de plaatbreedte groter dan 0.</b>
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de schijf is niet getoetst: invoer onvolledig</b></span>
#else
# 6. Opneembare horizontale belasting — methode A (§9.2.4.2)

b_o = h/2', (9.22)'
n_pl = floor(b/bi)', aantal volle platen'
b_rest = b - n_pl*bi', breedte van het restpaneel'
c_i = min(1; bi/b_o)', plaatbreedtefactor van een volle plaat (9.22)'
c_rest = min(1; b_rest/b_o)', en van het restpaneel'
#hide
b_ef = bool(bi ≥ h/4)*n_pl*bi*c_i + bool(b_rest ≥ h/4)*b_rest*c_rest
#show
b_ef', Σ b_i·c_i van de volle platen en het restpaneel; een paneel smaller dan h/4 telt niet mee (9.2.4.2(2))'
#if bi < h/4
    '<span style="color: red">De plaatbreedte b<sub>i</sub> is kleiner dan h/4: methode A telt zulke platen niet mee (9.2.4.2(2)).</span>
#else if b < h/4
    '<span style="color: red">De wand is korter dan h/4: methode A telt hem niet mee (9.2.4.2(2)).</span>
#else if bool(b_rest > 1 mm)*bool(b_rest < h/4) ≡ 1
    '<span style="color:#b45309">Het restpaneel is smaller dan h/4 en telt niet mee. Zet het anker op de stijl aan het eind van de laatste volle plaat, of veranker het restpaneel apart (9.2.4.2(10), fig. 9.6).</span>
#end if
#hide
k_naad = if(naad ≡ 1; if(bi < 0.5*h; 0.85; 1); 1)
k_naad,rest = if(naad ≡ 1; if(b_rest < 0.5*h; 0.85; 1); 1)
#show
#if naad ≡ 1
    b_ef,v = bool(bi ≥ h/4)*n_pl*bi*c_i*k_naad + bool(b_rest ≥ h/4)*b_rest*c_rest*k_naad,rest', horizontale naad: een paneel smaller dan 0,5·h telt ×0,85 (NB bij 9.2.4.2(17))'
#else
    #hide
    b_ef,v = b_ef
    #show
#end if
#hide
F_ivRd,ref = F_f_Rd*b_ef,v*n_zijdig/s_verb
F_ivRd,nb = 1.2*F_f_Rd*b_ef,v*n_zijdig/s_verb
#show
F_ivRd = if(rekenwijze ≡ 1; F_ivRd,ref; F_ivRd,nb) to kN', (9.20)/(9.21); de verhoging 1,2 langs de plaatranden (9.2.4.2(5)) alleen volgens de norm'
#if F_ivRd > 0 kN
    #if F_ivEd ≤ F_ivRd
        UC_sterkte = F_ivEd/F_ivRd', voldoet'
    #else
        UC_sterkte = F_ivEd/F_ivRd', voldoet niet'
    #end if
#else
    #hide
    UC_sterkte = 1/0
    #show
    'UC<sub>sterkte</sub> = ∞: er telt geen paneel mee.
#end if

# 7. Verankering & gedrukte eindstijl

#hide
c_ref = min(1; min(b; bi)/b_o)
#show
L_ef = if(b_ef > 0 mm; b_ef/c_ref; b)', hefboom (9.23): Σ b_i·c_i gedeeld door c_i van de breedste plaat'
F_itEd = F_ivEd*h/L_ef to kN', trek- en drukkracht in de eindstijlen (9.23)'
N_t = max(0 kN; F_itEd - 0.9*G_k,eind) to kN', trekkracht in het anker, γ_G,inf = 0,9 op de permanente last'
#if F_a,Rd > 0 kN
    #if N_t ≤ F_a,Rd
        UC_anker = N_t/F_a,Rd', voldoet'
    #else
        UC_anker = N_t/F_a,Rd', voldoet niet'
    #end if
#else
    #hide
    UC_anker = 0
    #show
    '<i class="ook-afdruk">Anker: niet getoetst, geen F<sub>a,Rd</sub> ingevuld.</i>
#end if
#if v_Rd > 0 kN/m
    #if F_ivEd ≤ v_Rd*b
        UC_glijden = F_ivEd/(v_Rd*b)', glijden van de onderregel, voldoet'
    #else
        UC_glijden = F_ivEd/(v_Rd*b)', glijden van de onderregel, voldoet niet'
    #end if
#else
    #hide
    UC_glijden = 0
    #show
    '<i class="ook-afdruk">Glijden van de onderregel: niet getoetst, geen v<sub>Rd</sub> ingevuld.</i>
#end if
τ_d = F_ivEd/(n_zijdig*L_ef*t_bepl) to N/mm^2', schuifspanning in de volle plaat'
#if f_v,d > 0 N/mm^2
    #if τ_d ≤ f_v,d
        UC_plaat = τ_d/f_v,d', NB bij 9.2.4.2(15), voldoet'
    #else
        UC_plaat = τ_d/f_v,d', NB bij 9.2.4.2(15), voldoet niet'
    #end if
#else
    #hide
    UC_plaat = 0
    #show
    '<i class="ook-afdruk">Schuifspanning in de plaat: niet getoetst, geen f<sub>v,d</sub> ingevuld.</i>
#end if
F_tot = F_itEd + max(F1; F2)', totale last op de gedrukte eindstijl: wind komt uit beide richtingen'

'<h6>7.1 Druk loodrecht op de vezel — regel onder de eindstijl (§6.1.5)</h6>
#hide
A_c90,ref = t_stijl*min(b_stijl; b_regel)
A_c90,nb = (t_stijl + min(30 mm; t_stijl; (hoh - t_stijl)/2))*min(b_stijl; b_regel)
#show
#if detail_AC < 1.5
    A_c90 = if(rekenwijze ≡ 1; A_c90,ref; A_c90,nb)', contactvlak van de stijl op de regel; volgens de norm +30 mm aan de binnenzijde (§6.1.5(1))'
    σ_c90d = F_tot/A_c90 to N/mm^2', drukspanning ⊥'
    #if σ_c90d ≤ f_c90d
        UC_druk90 = σ_c90d/f_c90d', voldoet'
    #else
        UC_druk90 = σ_c90d/f_c90d', voldoet niet'
    #end if
#else
    #hide
    UC_druk90 = 0
    #show
    '<i class="ook-afdruk">Stijl doorlopend: de stijl draagt direct af, druk ⊥ op de regel is niet van toepassing.</i>
#end if

# 8. Detaillering

#hide
UC_plooi,ref = hoh/t_bepl/100
UC_plooi,nb = (hoh - t_stijl)/t_bepl/100
s_max,ref = 150 mm
s_max,nb = if(verbindingsmiddel ≡ 1; 200 mm; 150 mm)
UC_hoh,ref = s_verb/s_max,ref
UC_hoh,nb = s_verb/s_max,nb
#show
UC_plooi = if(rekenwijze ≡ 1; UC_plooi,ref; UC_plooi,nb)', plooi (9.2.4.2(11)): h.o.h.-afstand, volgens de norm de dagmaat, gedeeld door 100·t'
UC_hoh = if(rekenwijze ≡ 1; UC_hoh,ref; UC_hoh,nb)', h.o.h. langs de plaatranden (10.8.2(1)): hoogstens 150 mm, volgens de norm 200 mm bij schroeven'
#hide
'Gipskarton type A en F alleen in klimaatklasse 1, type H en FH en gipsvezelplaat in 1 en 2 (NB bij 3.8(1) en (2)).
ok_klimaat = if(plaat ≡ 2; bool(klimaatklasse ≡ 1); if(plaat ≥ 3; bool(klimaatklasse ≤ 2); 1))
UC_dikte = if(plaat ≥ 2; 12.5 mm/t_bepl; 0)
#show
#if plaat ≥ 2
    UC_dikte', gipsplaat minimaal 12,5 mm dik (NB bij 3.8(3))'
    #if ok_klimaat ≡ 0
        '<span style="color: red">Deze gipsplaat is in klimaatklasse 'klimaatklasse' niet toegestaan (NB bij 3.8(1) en (2)).</span>
    #end if
    #if hoh ≥ 35*t_bepl
        '<span style="color:#b45309">Stijlen op a ≥ 35·t: de NB bij 9.2.4.2(18) schrijft dan een reductie van de schijfsterkte voor. Dit blad rekent die niet; apart aantonen.</span>
    #end if
#end if
#hide
ok_detail = bool(UC_plooi ≤ 1)*bool(UC_hoh ≤ 1)*bool(UC_dikte ≤ 1)*ok_klimaat
#show
#if ok_detail ≡ 1
    'Detaillering:<span style="color: green"> <b>voldoet</b></span>
#else
    'Detaillering:<span style="color: red"> <b>voldoet niet</b></span> — zie de regel met een waarde boven 1,0.
#end if

# 9. Gedrukte eindstijl op druk + knik (§6.3.2)

#hide
A_stijl = t_stijl*b_stijl
i_y = b_stijl/sqrt(12)
i_z = t_stijl/sqrt(12)
'Uit het vlak knikt de stijl over zijn lengte: tussen de regels, of over de hele
'hoogte als de stijl doorloopt; in het vlak houdt de beplating hem bij elk
'verbindingsmiddel vast.
L_cry = if(detail_AC < 1.5; h - 2*t_regel; h)
L_crz = s_verb
λ_rely = L_cry/i_y/π*sqrt(f_c0k/E_005)
λ_relz = L_crz/i_z/π*sqrt(f_c0k/E_005)
k_y = 0.5*(1 + β_c*(λ_rely - 0.3) + λ_rely^2)
k_z = 0.5*(1 + β_c*(λ_relz - 0.3) + λ_relz^2)
k_cy = if(λ_rely ≤ 0.3; 1; 1/(k_y + sqrt(k_y^2 - λ_rely^2)))
k_cz = if(λ_relz ≤ 0.3; 1; 1/(k_z + sqrt(k_z^2 - λ_relz^2)))
σ_c0d = F_tot/A_stijl to N/mm^2
'Wind loodrecht op de wand buigt de stijl uit het vlak, over dezelfde lengte;
'druk of zuiging, het teken telt niet.
M_w = γ_Q*abs(w_k)*hoh/2*L_cry^2/8 to kN*m
σ_md = M_w/(t_stijl*b_stijl^2/6) to N/mm^2
f_md = k_h*k_mod*f_mk/γ_M
UC_st,y = σ_c0d/(k_cy*f_c0d) + σ_md/f_md
UC_st,z = σ_c0d/(k_cz*f_c0d) + k_m*σ_md/f_md
#show
L_cry', kniklengte uit het vlak: stijllengte, tussen de regels of bij een doorlopende stijl h'
λ_rely', relatieve slankheid (6.21)'
k_cy', knikfactor (6.25); in het vlak kniklengte = h.o.h. verbindingsmiddelen'
σ_c0d', drukspanning in de stijl'
#if abs(w_k) > 0 kN/m^2
    γ_Q', wind (6.10b), gevolgklasse uit de projectgegevens'
    M_w', γ_Q·|w_k|·(hoh/2)·L_cry²/8'
    σ_md', buigspanning uit het vlak'
    f_md', k_h·k_mod·f_m,k/γ_M (§3.2(3))'
#end if
#if max(UC_st,y; UC_st,z) ≤ 1
    UC_stijl = max(UC_st,y; UC_st,z)', (6.23)/(6.24), voldoet'
#else
    UC_stijl = max(UC_st,y; UC_st,z)', (6.23)/(6.24), voldoet niet'
#end if

# 10. Samenvatting

UC_max = max(UC_sterkte; UC_druk90; UC_stijl; UC_anker; UC_glijden; UC_plaat)
#hide
open_18 = bool(plaat ≥ 2)*bool(hoh ≥ 35*t_bepl)
volledig = bool(F_a,Rd > 0 kN)*bool(v_Rd > 0 kN/m)*bool(f_v,d > 0 N/mm^2)*(1 - open_18)
#show
#if UC_max > 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>Schijfwerking voldoet niet</b></span>
#else if ok_detail ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>Schijfwerking voldoet niet: de detaillering klopt niet</b></span>
#else if volledig ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>Schijfwerking voldoet</b></span>
#else if open_18 ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ≤ 1,0, maar <b>de schijf is niet volledig getoetst</b>: de reductie bij gips op a ≥ 35·t (NB bij 9.2.4.2(18)) apart aantonen.</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b45309"> ≤ 1,0, maar <b>de schijf is niet volledig getoetst</b>: anker, glijden of plaat zonder ingevulde capaciteit apart aantonen.</span>
#end if
#end if

'<hr/>
'<i class="ook-afdruk">Aandachtspunten:</i>
#if rekenwijze ≡ 1
    '<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Aan de veilige kant vereenvoudigd: F<sub>f,Rd</sub> zonder de verhoging 1,2 van 9.2.4.2(5), plooi met de h.o.h.-afstand in plaats van de dagmaat, hoogstens 150 mm h.o.h. ook bij schroeven, en druk ⊥ zonder de uitbreiding van het contactvlak (§6.1.5(1)).</li><li class="alleen-scherm">Dubbelzijdig met verschillende platen of verbindingen: de zwakste zijde telt maar voor 75 % of 50 % (9.2.4.2(7)); vul dan enkelzijdig in en tel zelf op.</li><li>Op de tussenstijlen hoogstens tweemaal de afstand langs de plaatranden, en niet meer dan 300 mm (9.2.4.2(12) en 10.8.2(1)).</li><li>Niet getoetst: de kleinste afstand van de verbindingsmiddelen; die hoort bij de berekening van F<sub>f,Rd</sub> (Tabel 8.2 ×0,85; gips NB bij 8.3.1.5(6)).</li></ul>
#else
    '<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li class="alleen-scherm">Dubbelzijdig met verschillende platen of verbindingen: de zwakste zijde telt maar voor 75 % of 50 % (9.2.4.2(7)); vul dan enkelzijdig in en tel zelf op.</li><li>Op de tussenstijlen hoogstens tweemaal de afstand langs de plaatranden, en niet meer dan 300 mm (9.2.4.2(12) en 10.8.2(1)).</li><li>Niet getoetst: de kleinste afstand van de verbindingsmiddelen; die hoort bij de berekening van F<sub>f,Rd</sub> (Tabel 8.2 ×0,85; gips NB bij 8.3.1.5(6)).</li></ul>
#end if
`;
