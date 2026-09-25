/**
 * Schijfwerking — houten wandschijf (racking) volgens NEN-EN 1995-1-1 §9.2.4.2,
 * methode A, die de Nederlandse bijlage voorschrijft.
 *
 * Opneembare schuifkracht (9.21)/(9.22), kracht in de eindstijlen (9.23), druk
 * loodrecht op de vezel in de regel (§6.1.5), knik van de gedrukte eindstijl
 * (§6.3.2), plooi van de beplating (9.2.4.2(11)) en de afstand van de
 * verbindingsmiddelen (10.8.2(1)).
 *
 * Status: de rekenregels zijn eerder naast referentiebladen van de
 * referentie-uitwerking gelegd (zie de notities in SchijfwerkingDesigner.tsx),
 * maar die vergelijking staat niet in een controlescript.
 * check-schijfwerking.mjs rekent het blad met de hand na; de module blijft op
 * "controleren".
 *
 * Aan de veilige kant van de norm, net als de referentie-uitwerking:
 *   • F_f,Rd zonder de verhoging 1,2 voor randverbindingsmiddelen (9.2.4.2(5));
 *   • plooi met de h.o.h.-afstand in plaats van de dagmaat (9.2.4.2(11));
 *   • verbindingsmiddelen hoogstens 150 mm h.o.h., ook bij schroeven waar
 *     10.8.2(1) 200 mm toestaat;
 *   • druk ⊥ op het contactvlak van de stijl, zonder de 30 mm uitbreiding van §6.1.5.
 *
 * Volgens de norm aangevuld:
 *   • platen smaller dan h/4 tellen niet mee (9.2.4.2(2));
 *   • de gedrukte eindstijl krijgt de grootste van F1 en F2: wind komt uit
 *     beide richtingen;
 *   • druk ⊥ rekent met het contactvlak van de stijl. Eerder stond hier de
 *     doorsnede van de regel, wat bij een regel dikker dan de stijl een te
 *     groot vlak gaf;
 *   • de kniklengte uit het vlak is de stijllengte h − 2·t_regel (was
 *     h − t_stijl − t_regel; gelijk zolang stijl en regel even dik zijn).
 *
 * Variabelenamen komen exact overeen met de designer, zodat beeld en sheet
 * dezelfde invoer delen (de waarden van dit exemplaar).
 */

export const schijfwerking = `"Schijfwerking — houten wandschijf (EN 1995-1-1 §9.2.4)

'<i>Wandschijf van stijl- en regelwerk met beplating, belast door een horizontale
'schuifkracht (racking) en gerekend met methode A (§9.2.4.2). De wand is aan beide
'einden verankerd. Wandpanelen met een deur- of raamopening tellen niet mee
'(9.2.4.2(6)): b is de wandlengte zonder openingen.</i>

# 1. Verbinding & beplating

@select verbindingsmiddel "Verbindingsmiddel"
  Schroef = 1
  Nagel = 2
@end

F_f_Rd = ?', rekenwaarde per verbindingsmiddel F_f,Rd [kN] volgens hoofdstuk 8, zonder de verhoging 1,2 van 9.2.4.2(5)'
s_verb = ?', h.o.h. verbindingsmiddelen langs de plaatranden [mm]'

@select n_zijdig "Aantal zijdige beplating"
  Enkelzijdig = 1
  Dubbelzijdig, aan beide zijden dezelfde plaat en verbinding = 2
@end

t_bepl = ?', dikte beplating [mm]'

# 2. Stijl & regel

t_stijl = ?', dikte stijl, in het vlak van de wand [mm]'
b_stijl = ?', breedte stijl, haaks op de wand [mm]'
t_regel = ?', dikte regel [mm]'
b_regel = ?', breedte regel [mm]'

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

b = ?', lengte van de wandschijf zonder openingen [mm]'
h = ?', hoogte van de wandschijf [mm]'
bi = ?', breedte van een beplatingsplaat [mm]'
hoh = ?', h.o.h. afstand van de stijlen [mm]'

# 4. Belasting

F1 = ?', verticale last linksboven (A) [kN]'
F2 = ?', verticale last rechtsboven (B) [kN]'
F_ivEd = ?', horizontale schuifkracht F_i,v,Ed [kN]'

# 5. Materiaal (EN 338)

#hide
'Materiaalmatrix: [id | f_c,0,k | f_c,90,k | f_v,k | E_0,05]
matmat = [1; 2; 3 |18; 21; 23 |2.2; 2.5; 2.7 |3.4; 4.0; 4.0 |6000; 7400; 8000]
f_c0k = hlookup(matmat; sterkteklasse; 1; 2)
f_c90k = hlookup(matmat; sterkteklasse; 1; 3)
E_005 = hlookup(matmat; sterkteklasse; 1; 5)
γ_M = 1.30
'Wind is kortdurend (tabel 2.2 van de NB): k_mod 0,90 in klimaatklasse 1 en 2, 0,70 in 3.
k_mod = if(klimaatklasse ≡ 3; 0.70; 0.90)
k_c90 = 1.25
β_c = 0.2
pi_ = 3.14159265
#show
k_mod', wind: belastingsduurklasse kort'
f_c0d = f_c0k*k_mod/γ_M', rekenwaarde druksterkte ∥ [N/mm²]'
f_c90d = f_c90k*k_c90*k_mod/γ_M', rekenwaarde druksterkte ⊥, met k_c,90 = 1,25 [N/mm²]'

# 6. Opneembare horizontale belasting — methode A (§9.2.4.2)

b_o = h/2', (9.22) [mm]'
c_i = min(1; bi/b_o)', plaatbreedtefactor (9.22)'
#if bi ≥ h/4
    F_ivRd = F_f_Rd*b*c_i*n_zijdig/s_verb', opneembare horizontale belasting (9.21) [kN]'
#else
    '<span style="color: red">De plaatbreedte b<sub>i</sub> is kleiner dan h/4: methode A telt zulke
    'platen niet mee (9.2.4.2(2)).</span>
    F_ivRd = 0', geen bijdrage [kN]'
#end if
#if F_ivRd > 0
    UC_sterkte = F_ivEd/F_ivRd
#else
    #hide
    UC_sterkte = 1/0
    #show
#end if
#if UC_sterkte ≤ 1.0
    'UC<sub>sterkte</sub> = F<sub>i,v,Ed</sub>/F<sub>i,v,Rd</sub> = 'UC_sterkte'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
    'UC<sub>sterkte</sub> = F<sub>i,v,Ed</sub>/F<sub>i,v,Rd</sub> = 'UC_sterkte'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if

# 7. Verankering & gedrukte eindstijl

F_itEd = F_ivEd*h/b', trek- en drukkracht in de eindstijlen (9.23) [kN]'
F_tot = F_itEd + max(F1; F2)', totale last op de gedrukte eindstijl [kN]'
'<i>Wind komt uit beide richtingen; daarom krijgt de gedrukte eindstijl de grootste van
'F1 en F2. Het anker aan de trekzijde neemt F<sub>i,t,Ed</sub> op, verminderd met de gunstig
'werkende permanente last.</i>

'<h6>7.1 Druk loodrecht op de vezel — regel onder de eindstijl (§6.1.5)</h6>
'De toets op de regel geldt alleen als de <b>regel doorloopt</b>; loopt de <b>stijl door</b>, dan
'draagt de stijl direct af en vervalt de toets.
#if detail_AC < 1.5
    A_c90 = t_stijl*min(b_stijl; b_regel)', contactvlak van de stijl op de regel [mm²]'
    σ_c90d = F_tot*1000/A_c90', drukspanning ⊥ [N/mm²]'
    UC_druk90 = σ_c90d/f_c90d
    #if UC_druk90 ≤ 1.0
        'UC<sub>druk⊥</sub> = σ<sub>c,90,d</sub>/f<sub>c,90,d</sub> = 'UC_druk90'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        'UC<sub>druk⊥</sub> = σ<sub>c,90,d</sub>/f<sub>c,90,d</sub> = 'UC_druk90'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#else
    #hide
    UC_druk90 = 0
    #show
    '<i>Stijl doorlopend: druk ⊥ op de regel niet van toepassing.</i>
#end if

# 8. Detaillering

'<h6>8.1 Plooi beplating (9.2.4.2(11))</h6>
p_opn = 100', grens voor de slankheid van de plaat'
UC_plooi = hoh/t_bepl/p_opn
#if UC_plooi ≤ 1.0
    'UC<sub>plooi</sub> = (h.o.h./t)/100 = 'UC_plooi'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
    'UC<sub>plooi</sub> = (h.o.h./t)/100 = 'UC_plooi'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if

'<h6>8.2 H.o.h. verbindingsmiddelen langs de plaatranden (10.8.2(1)), hoogstens 150 mm</h6>
UC_hoh = s_verb/150
#if UC_hoh ≤ 1.0
    'UC<sub>h.o.h.</sub> = s/150 = 'UC_hoh'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
    'UC<sub>h.o.h.</sub> = s/150 = 'UC_hoh'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if

# 9. Gedrukte eindstijl op druk + knik (§6.3.2)

#hide
A_stijl = t_stijl*b_stijl
i_y = b_stijl/sqrt(12)
i_z = t_stijl/sqrt(12)
'Uit het vlak knikt de stijl over zijn lengte tussen de regels; in het vlak houdt de
'beplating hem bij elk verbindingsmiddel vast.
L_cry = h - 2*t_regel
L_crz = s_verb
λ_rely = L_cry/i_y/pi_*sqrt(f_c0k/E_005)
λ_relz = L_crz/i_z/pi_*sqrt(f_c0k/E_005)
k_y = 0.5*(1 + β_c*(λ_rely - 0.3) + λ_rely^2)
k_z = 0.5*(1 + β_c*(λ_relz - 0.3) + λ_relz^2)
k_cy = if(λ_rely ≤ 0.3; 1; 1/(k_y + sqrt(k_y^2 - λ_rely^2)))
k_cz = if(λ_relz ≤ 0.3; 1; 1/(k_z + sqrt(k_z^2 - λ_relz^2)))
σ_c0d = F_tot*1000/A_stijl
#show
L_cry', kniklengte uit het vlak: stijllengte tussen de regels [mm]'
λ_rely
k_cy
σ_c0d', drukspanning in de stijl [N/mm²]'
UC_stijl = max(σ_c0d/(k_cy*f_c0d); σ_c0d/(k_cz*f_c0d))
#if UC_stijl ≤ 1.0
    'UC<sub>stijl</sub> = σ<sub>c,0,d</sub>/(k<sub>c</sub>·f<sub>c,0,d</sub>) = 'UC_stijl'<span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
    'UC<sub>stijl</sub> = 'UC_stijl'<span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if

# 10. Samenvatting

UC_max = max(UC_sterkte; UC_druk90; UC_plooi; UC_hoh; UC_stijl)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>Schijfwerking voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>Schijfwerking voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li><b>Nog niet vastgelegd:</b> de rekenregels zijn naast referentiebladen gelegd, maar die
'vergelijking staat niet in een controlescript. De module blijft op controleren.</li>
'<li>Aan de veilige kant van de norm, net als de referentie-uitwerking: F<sub>f,Rd</sub> zonder de
'verhoging 1,2 van 9.2.4.2(5), plooi met de h.o.h.-afstand in plaats van de dagmaat, 150 mm als
'grootste h.o.h. ook bij schroeven (10.8.2(1) staat daar 200 mm toe) en druk ⊥ zonder de 30 mm
'uitbreiding van het contactvlak (§6.1.5).</li>
'<li>Platen smaller dan h/4 tellen niet mee (9.2.4.2(2)). Bij dubbelzijdige beplating met
'verschillende platen of verbindingen mag van de zwakste zijde maar 75 % of 50 % worden
'opgeteld (9.2.4.2(7)); vul dan enkelzijdig in en tel zelf op.</li>
'<li>Bij de tussenstijlen mag de afstand van de verbindingsmiddelen hoogstens tweemaal die langs
'de plaatranden zijn, met een maximum van 300 mm (9.2.4.2(12) en 10.8.2(1)).</li>
'<li>Wind is kortdurend (tabel 2.2 van de Nederlandse bijlage): k<sub>mod</sub> = 0,90 in
'klimaatklasse 1 en 2, 0,70 in klimaatklasse 3. γ<sub>M</sub> = 1,30 voor gezaagd hout, ongeacht de
'gevolgklasse; die zit in de belasting.</li>
'</ul></i>
`;
