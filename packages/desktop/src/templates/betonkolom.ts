/**
 * Betonkolom — gewapende betonkolom op druk en buiging om twee assen, volgens
 * NEN-EN 1992-1-1 met de Nederlandse nationale bijlage.
 *
 * Invoer zoals het parametrische beeld (BetonkolomDesigner.tsx): een
 * rechthoekige doorsnede met n_h staven per zijde langs h en n_b per zijde
 * langs b (de hoekstaven één keer geteld), of een ronde doorsnede met n_rond
 * staven op een cirkel. Buiging om de y-as werkt over h, om de z-as over b.
 * Getoetst:
 *   - de imperfectie e_i = θ_i·l_0/2 ((5.1) en (5.2)) en de minimale
 *     excentriciteit e_0 = max(h/30; 20 mm) (6.1(4));
 *   - de slankheid λ = l_0/i per as tegen λ_lim volgens (5.13N), met φ_ef, ω
 *     en r_m = M_01/M_02 (ongeschoord: C = 0,7). φ_ef = 0 mag alleen als het er
 *     niet toe doet (ook met A = 0,7 van 5.8.3.1(1) geen tweede orde) of als
 *     5.8.4(4) voldaan is; anders keurt het blad af;
 *   - de tweede orde met de nominale kromming (§5.8.8): K_r (5.36),
 *     K_φ (5.37), 1/r_0 = ε_yd/(0,45·d) met d = h/2 + i_s, e_2 = (1/r)·l_0²/c,
 *     M_0e (5.32) en M_Ed = M_0Ed + M_2 (5.31). c = 10, en 8 bij een constant
 *     eerste-orde-moment (5.8.8.2(4)); daartussen lineair met M_01/M_02 van de
 *     ingevoerde eindmomenten, aan de veilige kant;
 *   - de doorsnede per as (§6.1) met het rechthoekige spanningsblok
 *     (λ = 0,8, η = 1,0; bij de ronde doorsnede 0,9·η, 3.1.7(3)), ε_cu3 =
 *     3,5 ‰ en bij volledige druk het draaipunt op ε_c3 = 1,75 ‰ (figuur 6.1);
 *     de staven in de drukzone verdringen beton;
 *   - scheve buiging: de scheiding volgens (5.38a/b), anders (5.39), met de
 *     imperfectie alleen in de ongunstigste richting (5.8.9(2)), dus in twee
 *     gevallen;
 *   - de detaillering met de NB-waarden: A_s,min (9.12N), A_s,max = 0,04·A_c
 *     (NB bij 9.5.2(3) voor een kolom met overlappingslassen, buiten de las;
 *     zonder lassen staat de NB 0,08·A_c toe, dus veilige kant) en Ø ≥ 8 mm
 *     (§9.5.2), de beugels (§9.5.3, met de kleinere afstand bij de einden van
 *     9.5.3(4) als melding); bij een in-situ gestorte paal de kleinere
 *     rekenmaat (§2.3.4.2(2)) voor het draagvermogen, A_s,min volgens tabel
 *     9.6N met de nominale doorsnede, en volgens de NB bij 9.8.5(3) Ø ≥ 12 mm
 *     en ten minste vier staven. De grens van 200 mm vrij tussen de staven is
 *     de aanbeveling die de NB vervangt; het blad meldt hem alleen.
 *
 * Eindmomenten: standaard één moment per as, aan beide einden gelijk (een
 * constant moment, de ongunstigste verdeling bij een gegeven grootste moment).
 * Pas met de keuze "boven en onder een eigen eindmoment" telt M_yEd,1/M_zEd,1
 * als eigen eindmoment. Heeft een blad bij één moment per as nog een groter
 * ondermoment (een blad van vóór deze keuze, met boven en onder), dan geldt
 * het grootste aan beide einden, met een melding; nooit het kleinere.
 * Zo rekent een blad van vóór die velden na bijwerken aan de veilige kant, en
 * een ontbrekend φ_ef (0) keurt af, tenzij het er niet toe doet of 5.8.4(4) het
 * toestaat. Het beeld vult bij zo'n blad geen tweede moment of φ_ef in.
 *
 * Buiten het bereik van de normaalkracht (N_Ed ≥ N_Rd,max of ≤ N_Rd,min) is er
 * geen momentcapaciteit meer: UC = ∞ zodra er een moment werkt, net als de
 * grens van M_Ed/M_Rd vlak ervoor. UC_N = N_Ed/N_Rd geeft dan hoe ver de
 * normaalkracht alleen al te groot is; bij trek telt UC_N ook binnen het
 * bereik mee, zodat een trekstaaf zonder moment niet op UC = 0 uitkomt.
 *
 * Op papier is het blad beknopter dan op het scherm (PrintDocument.css): uitleg
 * draagt alleen-scherm, korte regels een merkteken kolom-2, kolom-3 of kolom-4,
 * en waar een formule met ingevulde waarden te breed is voor papier staat daar
 * de kale waarde met alleen-afdruk. De toetsregels (UC) houden hun formule. Wat
 * het beeld en de controles lezen, verandert niet.
 *
 * De M-N-berekening loopt zonder eenheden (N en mm) in verborgen functies; de
 * drukzonehoogte x volgt met $Find uit N_R(x) = N_Ed. Een rechthoek rekent met
 * 2 tot 10 staven per zijde, een cirkel met 3 tot 20 staven; bij de cirkel telt
 * de ongunstigste van twee standen van de staven.
 *
 * Geen referentieberekening beschikbaar; scripts/check-betonkolom.mjs rekent de
 * uitkomsten onafhankelijk na, met een handberekening en grensgevallen.
 *
 * Variabelenamen komen exact overeen met BetonkolomDesigner.tsx.
 */

export const betonkolom = `"Betonkolom — EN 1992-1-1 §5.8.8 en §6.1

'<i class="alleen-scherm">Gewapende betonkolom onder normaalkracht en buiging om twee assen: tweede orde met de nominale kromming (§5.8.8), de doorsnede per as met het rechthoekige spanningsblok (§6.1), scheve buiging (§5.8.9) en de detaillering (§9.5). Buiging om de y-as werkt over de hoogte h, buiging om de z-as over de breedte b.</i><span class="alleen-scherm"></span>

# 1. Doorsnede en materiaal

@select vorm "Vorm van de doorsnede"
  Rechthoekige kolom = 1
  Ronde kolom = 2
@end

#if vorm ≡ 1
    h_kol = ?*(mm)', hoogte h<span class="kolom-3"></span>'
    b_kol = ?*(mm)', breedte b<span class="kolom-3"></span>'
#else
    h_kol = ?*(mm)', diameter D<span class="kolom-3"></span>'
#end if

@select insitu "In-situ gestorte funderingspaal zonder blijvende mantel"
  Nee = 0
  Ja = 1
@end

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
@end

@select betonstaal "Betonstaalsoort"
  B500A = 1
  B500B = 2
  B500C = 3
@end

c_dek = ?*(mm)', dekking op de beugel<span class="kolom-3"></span>'
d_staaf = ?*(mm)', staafdiameter<span class="kolom-3"></span>'
#if vorm ≡ 1
    n_h = ?', staven langs h, per zijde<span class="alleen-scherm"> (met de hoekstaven)</span><span class="kolom-3"></span>'
    n_b = ?', staven langs b, per zijde<span class="kolom-3"></span>'
#else
    n_rond = ?', totaal aantal staven<span class="kolom-3"></span>'
#end if
d_beugel = ?*(mm)', beugeldiameter<span class="kolom-3"></span>'
s_beugel = ?*(mm)', beugelafstand<span class="kolom-3"></span>'

#hide
f_ck = betonklasse*N/mm^2
f_yk = 500 N/mm^2
α_cc = 1.0
γ_C = 1.5
γ_S = 1.15
E_s = 200000 N/mm^2
d_red(d) = max(if(d < 400 mm; d - 20 mm; if(d ≤ 1000 mm; 0.95*d; d - 50 mm)); d/2)
#show
f_cd = α_cc*f_ck/γ_C to N/mm^2', α<sub>cc</sub> = 1,0 (NB)<span class="alleen-scherm"></span>'
f_yd = f_yk/γ_S to N/mm^2'<span class="alleen-scherm"></span>'
ε_yd = f_yd/E_s'<span class="alleen-scherm"></span>'
a_s = c_dek + d_beugel + d_staaf/2', hart staaf tot rand<span class="alleen-scherm"></span>'
f_cd', α<sub>cc</sub> = 1,0 (NB)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
f_yd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
ε_yd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
a_s', hart staaf<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
#if insitu ≡ 1
    '<i class="alleen-scherm">In-situ gestorte paal zonder blijvende mantel: rekenen met een kleinere maat, 20 mm minder onder 400 mm, 5 % minder tot 1000 mm en 50 mm minder daarboven (§2.3.4.2(2)). De staven blijven op hun plaats.</i><span class="alleen-scherm"></span>
    #hide
    Δ_h = h_kol - d_red(h_kol)
    #show
    h = h_kol - Δ_h', rekenmaat, §2.3.4.2(2)<span class="alleen-scherm"></span>'
    h', rekenmaat, §2.3.4.2(2)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #if vorm ≡ 1
        #hide
        Δ_b = b_kol - d_red(b_kol)
        #show
        b = b_kol - Δ_b', rekenmaat<span class="alleen-scherm"></span>'
        b', rekenmaat<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #end if
#else
    #hide
    h = h_kol
    #show
    #if vorm ≡ 1
        #hide
        b = b_kol
        #show
    #end if
#end if
#if vorm ≡ 1
    #hide
    n_hr = min(max(round(n_h); 2); 10)
    n_br = min(max(round(n_b); 2); 10)
    n_s = 2*n_hr + 2*n_br - 4
    a_y = a_s - (h_kol - h)/2
    a_z = a_s - (b_kol - b)/2
    'Traagheidsstraal van de wapening: twee eindrijen met n_b (om z: n_h) staven, de tussenrijen met twee.
    i_s,y = (h/2 - a_y)*sqrt((2*n_br + 2*(n_hr*(n_hr + 1)/(3*(n_hr - 1)) - 2))/n_s)
    i_s,z = (b/2 - a_z)*sqrt((2*n_hr + 2*(n_br*(n_br + 1)/(3*(n_br - 1)) - 2))/n_s)
    #show
    #if n_hr ≠ n_h or n_br ≠ n_b
        '<b style="color:#b45309">Het blad rekent met 2 tot 10 staven per zijde: gerekend met 'n_hr' langs h en 'n_br' langs b.</b>
    #end if
    A_c = b*h to mm^2'<span class="alleen-scherm"></span>'
    i_y = h/sqrt(12)'<span class="alleen-scherm"></span>'
    i_z = b/sqrt(12)'<span class="alleen-scherm"></span>'
#else
    #hide
    n_s = min(max(round(n_rond); 3); 20)
    b = h
    R_s = h_kol/2 - a_s
    i_s,y = R_s/sqrt(2)
    i_s,z = i_s,y
    #show
    #if n_s ≠ n_rond
        '<b style="color:#b45309">Het blad rekent met 3 tot 20 staven: gerekend met 'n_s'.</b>
    #end if
    A_c = pi*h^2/4 to mm^2'<span class="alleen-scherm"></span>'
    i_y = h/4'<span class="alleen-scherm"></span>'
    #hide
    i_z = i_y
    #show
#end if
A_c'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
i_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#if vorm ≡ 1
    i_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#end if
n_s', aantal staven<span class="kolom-4"></span>'
A_s = n_s*pi*d_staaf^2/4 to mm^2'<span class="alleen-scherm"></span>'
ω = A_s*f_yd/(A_c*f_cd)', mechanische wapeningsverhouding<span class="alleen-scherm"></span>'
A_s'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
ω', A<sub>s</sub>·f<sub>yd</sub>/(A<sub>c</sub>·f<sub>cd</sub>)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'

# 2. Kolom en belasting

L_kol = ?*(mm)', kolomlengte L<span class="kolom-3"></span>'
L_cry = ?*(mm)', kniklengte l<sub>0,y</sub><span class="kolom-3"></span>'
L_crz = ?*(mm)', kniklengte l<sub>0,z</sub><span class="kolom-3"></span>'

@select geschoord_y "Geschoord bij knik om de y-as (uitwijken over h)"
  Ja = 1
  Nee = 0
@end

@select geschoord_z "Geschoord bij knik om de z-as (uitwijken over b)"
  Ja = 1
  Nee = 0
@end

N_Ed = ?*(kN)', normaalkracht, druk positief<span class="kolom-2"></span>'
φ_ef = ?', effectief kruipgetal (5.19)<span class="alleen-scherm">: φ(∞,t<sub>0</sub>)·M<sub>0Eqp</sub>/M<sub>0Ed</sub>, met φ uit het kruipfactorblad; 0 alleen onder 5.8.4(4)</span><span class="kolom-2"></span>'

@select eindmomenten "Eerste-orde-momenten langs de kolom"
  Eén moment per as, aan beide einden gelijk = 1
  Boven en onder een eigen eindmoment = 2
@end

'<i class="alleen-scherm">Eindmomenten van de eerste orde, zonder imperfectie. Eén moment per as rekent als een constant moment over de kolom: bij een gegeven grootste moment de ongunstigste verdeling. Met twee eindmomenten: gelijk teken is trek aan dezelfde zijde (enkele kromming), tegengesteld teken dubbele kromming. Werkt er een dwarslast op de kolom, vul dan aan beide einden het grootste moment in.</i><span class="alleen-scherm"></span>
#if eindmomenten ≡ 2
    M_yEd = ?*(kN*m)', om de y-as, boven<span class="kolom-2"></span>'
    M_yEd,1 = ?*(kN*m)', om de y-as, onder<span class="kolom-2"></span>'
    M_zEd = ?*(kN*m)', om de z-as, boven<span class="kolom-2"></span>'
    M_zEd,1 = ?*(kN*m)', om de z-as, onder<span class="kolom-2"></span>'
#else
    M_yEd = ?*(kN*m)', om de y-as, aan beide einden<span class="kolom-2"></span>'
    M_zEd = ?*(kN*m)', om de z-as, aan beide einden<span class="kolom-2"></span>'
    #hide
    'Een ondermoment dat het blad nog heeft (van vóór deze keuze): het grootste moment geldt aan beide einden.
    M_yEd,1 = ?*(kN*m)
    M_zEd,1 = ?*(kN*m)
    ok_M1 = if(abs(M_yEd,1) > abs(M_yEd) or abs(M_zEd,1) > abs(M_zEd); 0; 1)
    M_yEd = max(abs(M_yEd); abs(M_yEd,1))
    M_zEd = max(abs(M_zEd); abs(M_zEd,1))
    M_yEd,1 = M_yEd
    M_zEd,1 = M_zEd
    #show
    #if ok_M1 ≡ 0
        '<b style="color:#b45309">Het blad heeft nog een groter ondermoment: gerekend met 'M_yEd/(1 kN*m)' kNm om y en 'M_zEd/(1 kN*m)' kNm om z, aan beide einden. Met de keuze "boven en onder een eigen eindmoment" tellen beide eindmomenten.</b>
    #end if
#end if

#hide
'Eindmomenten gesorteerd: M_0 is het grootste in absolute waarde, M_1 het andere met het teken ten opzichte van M_0.
M_0y = max(abs(M_yEd); abs(M_yEd,1))
M_1y = if(abs(M_yEd) ≥ abs(M_yEd,1); M_yEd,1*sign(M_yEd); M_yEd*sign(M_yEd,1))
M_0z = max(abs(M_zEd); abs(M_zEd,1))
M_1z = if(abs(M_zEd) ≥ abs(M_zEd,1); M_zEd,1*sign(M_zEd); M_zEd*sign(M_zEd,1))
θ_0 = 1/200
α_m = 1
ok_φ = 1
#show

# 3. Imperfectie en slankheid (§5.2 en §5.8.3)

λ_y = L_cry/i_y'<span class="kolom-2"></span>'
λ_z = L_crz/i_z'<span class="kolom-2"></span>'
#if N_Ed > 0 kN
    α_h = min(1; max(2/3; 2/sqrt(L_kol/(1 m))))', 5.2(5), l = L<span class="alleen-scherm"></span>'
    θ_i = θ_0*α_h*α_m', (5.1), losse kolom: α<sub>m</sub> = 1<span class="alleen-scherm"></span>'
    n = N_Ed/(A_c*f_cd)', relatieve normaalkracht<span class="alleen-scherm"></span>'
    α_h', 5.2(5)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    θ_i', (5.1), α<sub>m</sub> = 1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    n', N<sub>Ed</sub>/(A<sub>c</sub>·f<sub>cd</sub>)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    e_i,y = θ_i*L_cry/2 to mm', (5.2)<span class="alleen-scherm"></span>'
    e_i,z = θ_i*L_crz/2 to mm', (5.2)<span class="alleen-scherm"></span>'
    e_i,y', (5.2)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    e_i,z', (5.2)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    M_02,y = max(abs(M_yEd); abs(M_yEd,1)) + N_Ed*e_i,y to kN*m'<span class="alleen-scherm"></span>'
    M_02,z = max(abs(M_zEd); abs(M_zEd,1)) + N_Ed*e_i,z to kN*m'<span class="alleen-scherm"></span>'
    M_02,y', grootste eindmoment + N<sub>Ed</sub>·e<sub>i,y</sub><span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    M_02,z', grootste eindmoment + N<sub>Ed</sub>·e<sub>i,z</sub><span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #hide
    M_01,y = M_1y + N_Ed*e_i,y to kN*m
    M_01,z = M_1z + N_Ed*e_i,z to kN*m
    #show
    M_01,y', ander eindmoment<span class="alleen-scherm">, met teken,</span> + N<sub>Ed</sub>·e<sub>i,y</sub><span class="kolom-2"></span>'
    M_01,z'<span class="kolom-2"></span>'
    A_φ = 1/(1 + 0.2*φ_ef)'<span class="kolom-2"></span>'
    B_ω = sqrt(1 + 2*ω)'<span class="kolom-2"></span>'
    #if geschoord_y ≡ 1
        C_y = 1.7 - M_01,y/M_02,y'<span class="alleen-scherm">, r<sub>m</sub> = M<sub>01</sub>/M<sub>02</sub></span><span class="kolom-2"></span>'
    #else
        C_y = 0.7', ongeschoord<span class="kolom-2"></span>'
    #end if
    #if geschoord_z ≡ 1
        C_z = 1.7 - M_01,z/M_02,z'<span class="kolom-2"></span>'
    #else
        C_z = 0.7', ongeschoord<span class="kolom-2"></span>'
    #end if
    λ_lim,y = 20*A_φ*B_ω*C_y/sqrt(n)', (5.13N)'
    λ_lim,z = 20*A_φ*B_ω*C_z/sqrt(n)', (5.13N)'
    #hide
    t2_y = if(λ_y > λ_lim,y; 1; 0)
    t2_z = if(λ_z > λ_lim,z; 1; 0)
    #show
    #if φ_ef ≤ 0
        #hide
        'Zonder kruip: mag als het er niet toe doet (met A = 0,7 van 5.8.3.1(1) om beide assen nog steeds geen tweede orde) of onder 5.8.4(4), met M_0Ed = M_02.
        t7_y = if(λ_y > 0.7*λ_lim,y/A_φ; 1; 0)
        t7_z = if(λ_z > 0.7*λ_lim,z/A_φ; 1; 0)
        ok_844 = if(λ_y ≤ 75 and λ_z ≤ 75 and M_02,y/N_Ed ≥ h and M_02,z/N_Ed ≥ b; 1; 0)
        ok_φ = if(φ_ef ≡ 0 and (t7_y + t7_z ≡ 0 or ok_844 ≡ 1); 1; 0)
        #show
        #if φ_ef < 0
            '<b style="color:#b91c1c">φ<sub>ef</sub> = 'φ_ef': een negatief kruipgetal bestaat niet. Vul φ<sub>ef</sub> in volgens (5.19).</b>
        #else if ok_φ ≡ 0
            '<b style="color:#b91c1c">φ<sub>ef</sub> = 'φ_ef': zonder kruip rekenen mag alleen als φ(∞,t<sub>0</sub>) ≤ 2, λ ≤ 75 en M<sub>0Ed</sub>/N<sub>Ed</sub> ≥ h om elke as (5.8.4(4)), en dat is hier niet zo. Vul φ<sub>ef</sub> in volgens (5.19).</b>
        #else if t7_y + t7_z ≡ 0
            '<i>φ<sub>ef</sub> = 0 doet er niet toe: ook met A = 0,7 (φ<sub>ef</sub> onbekend, 5.8.3.1(1)) is λ ≤ λ<sub>lim</sub> om beide assen.</i>
        #else
            '<i>φ<sub>ef</sub> = 0 volgens 5.8.4(4): λ ≤ 75 en M<sub>02</sub>/N<sub>Ed</sub> ≥ h om beide assen, aangenomen dat φ(∞,t<sub>0</sub>) ≤ 2.</i>
        #end if
    #end if
#else
    '<i>Geen drukkracht: geen imperfectie en geen tweede orde; de doorsnede rekent met de eindmomenten.</i>
    #hide
    t2_y = 0
    t2_z = 0
    #show
#end if

# 4. Tweede orde — nominale kromming (§5.8.8)

#hide
M_2,y = 0 kN*m
M_2,z = 0 kN*m
#show
#if N_Ed ≤ 0 kN
    '<i>Geen drukkracht: geen tweede orde.</i>
#else if t2_y + t2_z ≡ 0
    '<i>λ ≤ λ<sub>lim</sub> om beide assen: de tweede orde mag worden verwaarloosd (5.8.3.1(1)).</i>
#else
    '<i class="alleen-scherm">e<sub>2</sub> = (1/r)·l<sub>0</sub><sup>2</sup>/c (5.33), 1/r = K<sub>r</sub>·K<sub>φ</sub>·ε<sub>yd</sub>/(0,45·d) (5.34) en d = h/2 + i<sub>s</sub> (5.35), met i<sub>s</sub> de traagheidsstraal van alle wapening. c = 10, bij een constant eerste-orde-moment 8 (5.8.8.2(4)); daartussen lineair met M<sub>01</sub>/M<sub>02</sub> zonder imperfectie, aan de veilige kant.</i><span class="alleen-scherm"></span>
    K_r = max(0; min(1; (1 + ω - n)/(1 + ω - 0.4)))', (5.36), n<sub>u</sub> = 1 + ω, n<sub>bal</sub> = 0,4<span class="alleen-scherm"></span>'
    K_r', (5.36)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if t2_y ≡ 1
        K_φ,y = max(1; 1 + (0.35 + f_ck/(200 N/mm^2) - λ_y/150)*φ_ef)', (5.37)<span class="alleen-scherm"></span>'
        K_φ,y', (5.37)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        d_y = h/2 + i_s,y', (5.35)<span class="alleen-scherm"></span>'
        #hide
        r_0y = if(M_0y > 0 kN*m; M_1y/M_0y; 0)
        #show
        c_y = 10 - 2*max(0; r_0y)', 5.8.8.2(4), r<sub>0y</sub> = M<sub>01</sub>/M<sub>02</sub> zonder imperfectie<span class="alleen-scherm"></span>'
        d_y', (5.35)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        c_y', 5.8.8.2(4)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        e_2,y = K_r*K_φ,y*ε_yd/(0.45*d_y)*L_cry^2/c_y to mm', (5.33) en (5.34)'
        M_2,y = N_Ed*e_2,y to kN*m'<span class="alleen-scherm"></span>'
        M_2,y', N<sub>Ed</sub>·e<sub>2,y</sub><span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #else
        '<i>λ<sub>y</sub> ≤ λ<sub>lim,y</sub>: geen tweede orde om de y-as.</i>
    #end if
    #if t2_z ≡ 1
        K_φ,z = max(1; 1 + (0.35 + f_ck/(200 N/mm^2) - λ_z/150)*φ_ef)', (5.37)<span class="alleen-scherm"></span>'
        K_φ,z', (5.37)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        d_z = b/2 + i_s,z', (5.35)<span class="alleen-scherm"></span>'
        #hide
        r_0z = if(M_0z > 0 kN*m; M_1z/M_0z; 0)
        #show
        c_z = 10 - 2*max(0; r_0z)', 5.8.8.2(4), r<sub>0z</sub> = M<sub>01</sub>/M<sub>02</sub> zonder imperfectie<span class="alleen-scherm"></span>'
        d_z', (5.35)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        c_z', 5.8.8.2(4)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        e_2,z = K_r*K_φ,z*ε_yd/(0.45*d_z)*L_crz^2/c_z to mm', (5.33) en (5.34)'
        M_2,z = N_Ed*e_2,z to kN*m'<span class="alleen-scherm"></span>'
        M_2,z', N<sub>Ed</sub>·e<sub>2,z</sub><span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #else
        '<i>λ<sub>z</sub> ≤ λ<sub>lim,z</sub>: geen tweede orde om de z-as.</i>
    #end if
#end if

# 5. Rekenmoment en doorsnede (§5.8.8.2 en §6.1)

#if N_Ed > 0 kN
    e_0,y = max(h/30; 20 mm)', 6.1(4)<span class="alleen-scherm"></span>'
    e_0,z = max(b/30; 20 mm)', 6.1(4)<span class="alleen-scherm"></span>'
    e_0,y', 6.1(4)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    e_0,z', 6.1(4)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if geschoord_y ≡ 1
        M_0e,y = max(0.6*M_02,y + 0.4*M_01,y; 0.4*M_02,y)', (5.32)<span class="alleen-scherm"></span>'
        M_Ed,y = max(M_0e,y + M_2,y; M_02,y; N_Ed*e_0,y) to kN*m', (5.31), aan het einde M<sub>02</sub><span class="alleen-scherm"></span>'
        M_0e,y', (5.32)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        M_Ed,y', max(M<sub>0e</sub> + M<sub>2</sub>; M<sub>02</sub>; N·e<sub>0</sub>), (5.31)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #else
        M_Ed,y = max(M_02,y + M_2,y; N_Ed*e_0,y) to kN*m', (5.31), ongeschoord: aan het einde<span class="alleen-scherm"></span>'
        M_Ed,y', max(M<sub>02</sub> + M<sub>2</sub>; N·e<sub>0</sub>)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #end if
    #if geschoord_z ≡ 1
        M_0e,z = max(0.6*M_02,z + 0.4*M_01,z; 0.4*M_02,z)', (5.32)<span class="alleen-scherm"></span>'
        M_Ed,z = max(M_0e,z + M_2,z; M_02,z; N_Ed*e_0,z) to kN*m', (5.31), aan het einde M<sub>02</sub><span class="alleen-scherm"></span>'
        M_0e,z', (5.32)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        M_Ed,z', max(M<sub>0e</sub> + M<sub>2</sub>; M<sub>02</sub>; N·e<sub>0</sub>), (5.31)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #else
        M_Ed,z = max(M_02,z + M_2,z; N_Ed*e_0,z) to kN*m', (5.31), ongeschoord: aan het einde<span class="alleen-scherm"></span>'
        M_Ed,z', max(M<sub>02</sub> + M<sub>2</sub>; N·e<sub>0</sub>)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #end if
#else
    M_Ed,y = max(abs(M_yEd); abs(M_yEd,1)) to kN*m'<span class="alleen-scherm"></span>'
    M_Ed,z = max(abs(M_zEd); abs(M_zEd,1)) to kN*m'<span class="alleen-scherm"></span>'
    M_Ed,y', grootste eindmoment<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    M_Ed,z', grootste eindmoment<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
#end if

'<i class="alleen-scherm">Doorsnede volgens §6.1: rechthoekig spanningsblok met λ = 0,8 en η = 1,0 (3.1.7(3)), bij een ronde doorsnede 0,9·η omdat de drukzone naar de rand smaller wordt. ε<sub>cu3</sub> = 3,5 ‰; bij volledige druk draait de rekverdeling om ε<sub>c3</sub> = 1,75 ‰ (figuur 6.1). Staal bilineair met een horizontale tak (3.2.7(2)); de staven in de drukzone verdringen beton. De drukzonehoogte x volgt uit N<sub>R</sub>(x) = N<sub>Ed</sub>, het moment M<sub>Rd</sub> om het zwaartepunt.</i><span class="alleen-scherm"></span>
#hide
fcd_ = f_cd/(1 N/mm^2)
fyd_ = f_yd/(1 N/mm^2)
A_1 = pi*(d_staaf/(1 mm))^2/4
Ned_ = N_Ed/(1 N)
σ_s(e) = max(-fyd_; min(fyd_; 200000*e))
ε_x(t; y; H) = if(t ≤ H; 0.0035*(t - y)/t; 0.00175*(t - y)/(t - H/2))
#show
#if vorm ≡ 1
    #hide
    h_ = h/(1 mm)
    b_ = b/(1 mm)
    ay_ = a_y/(1 mm)
    az_ = a_z/(1 mm)
    'Rij j op y_r van de gedrukte rand; de eindrijen hebben ne staven, de tussenrijen twee.
    y_r(j; H; a; n) = a + j*(H - 2*a)/(n - 1)
    F_r(t; j; H; a; n; ne) = if(j > n - 1; 0; A_1*if(j ≡ 0 or j ≡ n - 1; ne; 2)*(σ_s(ε_x(t; y_r(j; H; a; n); H)) - if(y_r(j; H; a; n) < min(0.8*t; H); fcd_; 0)))
    M_r(t; j; H; a; n; ne) = F_r(t; j; H; a; n; ne)*(H/2 - y_r(j; H; a; n))
    S_N(t; H; a; n; ne) = F_r(t; 0; H; a; n; ne) + F_r(t; 1; H; a; n; ne) + F_r(t; 2; H; a; n; ne) + F_r(t; 3; H; a; n; ne) + F_r(t; 4; H; a; n; ne) + F_r(t; 5; H; a; n; ne) + F_r(t; 6; H; a; n; ne) + F_r(t; 7; H; a; n; ne) + F_r(t; 8; H; a; n; ne) + F_r(t; 9; H; a; n; ne)
    S_M(t; H; a; n; ne) = M_r(t; 0; H; a; n; ne) + M_r(t; 1; H; a; n; ne) + M_r(t; 2; H; a; n; ne) + M_r(t; 3; H; a; n; ne) + M_r(t; 4; H; a; n; ne) + M_r(t; 5; H; a; n; ne) + M_r(t; 6; H; a; n; ne) + M_r(t; 7; H; a; n; ne) + M_r(t; 8; H; a; n; ne) + M_r(t; 9; H; a; n; ne)
    N_Ry(t) = fcd_*b_*min(0.8*t; h_) + S_N(t; h_; ay_; n_hr; n_br)
    M_Ry(t) = fcd_*b_*min(0.8*t; h_)*(h_ - min(0.8*t; h_))/2 + S_M(t; h_; ay_; n_hr; n_br)
    N_Rz(t) = fcd_*h_*min(0.8*t; b_) + S_N(t; b_; az_; n_br; n_hr)
    M_Rz(t) = fcd_*h_*min(0.8*t; b_)*(b_ - min(0.8*t; b_))/2 + S_M(t; b_; az_; n_br; n_hr)
    Nmax_ = fcd_*b_*h_ + n_s*A_1*(200000*0.00175 - fcd_)
    Nmin_ = -n_s*A_1*fyd_
    Nt_ = min(max(Ned_; 0.999999*Nmin_); 0.999999*Nmax_)
    xy_ = $Find{N_Ry(t) - Nt_ @ t = 0.000001 : 1000000000}
    xz_ = $Find{N_Rz(t) - Nt_ @ t = 0.000001 : 1000000000}
    x_y = xy_*mm
    x_z = xz_*mm
    M_Rd,y = M_Ry(xy_)/1000000*kN*m
    M_Rd,z = M_Rz(xz_)/1000000*kN*m
    #show
#else
    #hide
    D_ = h/(1 mm)
    R_s_ = R_s/(1 mm)
    'Drukzone: cirkelsegment met hoogte min(0,8·x; D) en halve openingshoek α_s.
    α_s(t) = acos(max(-1; 1 - 2*min(0.8*t; D_)/D_))
    N_cc(t) = 0.9*fcd_*(D_/2)^2*(α_s(t) - sin(α_s(t))*cos(α_s(t)))
    M_cc(t) = 0.9*fcd_*2/3*(D_/2)^3*sin(α_s(t))^3
    'Staaf i onder de hoek 2πi/n + ψ, gemeten vanaf de gedrukte rand.
    F_c(t; i; ψ) = if(i > n_s - 1; 0; A_1*(σ_s(ε_x(t; D_/2 - R_s_*cos(2*pi*i/n_s + ψ); D_)) - if(D_/2 - R_s_*cos(2*pi*i/n_s + ψ) < min(0.8*t; D_); 0.9*fcd_; 0)))
    M_c(t; i; ψ) = F_c(t; i; ψ)*R_s_*cos(2*pi*i/n_s + ψ)
    S_Nc(t; ψ) = F_c(t; 0; ψ) + F_c(t; 1; ψ) + F_c(t; 2; ψ) + F_c(t; 3; ψ) + F_c(t; 4; ψ) + F_c(t; 5; ψ) + F_c(t; 6; ψ) + F_c(t; 7; ψ) + F_c(t; 8; ψ) + F_c(t; 9; ψ) + F_c(t; 10; ψ) + F_c(t; 11; ψ) + F_c(t; 12; ψ) + F_c(t; 13; ψ) + F_c(t; 14; ψ) + F_c(t; 15; ψ) + F_c(t; 16; ψ) + F_c(t; 17; ψ) + F_c(t; 18; ψ) + F_c(t; 19; ψ)
    S_Mc(t; ψ) = M_c(t; 0; ψ) + M_c(t; 1; ψ) + M_c(t; 2; ψ) + M_c(t; 3; ψ) + M_c(t; 4; ψ) + M_c(t; 5; ψ) + M_c(t; 6; ψ) + M_c(t; 7; ψ) + M_c(t; 8; ψ) + M_c(t; 9; ψ) + M_c(t; 10; ψ) + M_c(t; 11; ψ) + M_c(t; 12; ψ) + M_c(t; 13; ψ) + M_c(t; 14; ψ) + M_c(t; 15; ψ) + M_c(t; 16; ψ) + M_c(t; 17; ψ) + M_c(t; 18; ψ) + M_c(t; 19; ψ)
    N_Rc(t; ψ) = N_cc(t) + S_Nc(t; ψ)
    M_Rc(t; ψ) = M_cc(t) + S_Mc(t; ψ)
    Nmax_ = 0.9*fcd_*pi*D_^2/4 + n_s*A_1*(200000*0.00175 - 0.9*fcd_)
    Nmin_ = -n_s*A_1*fyd_
    Nt_ = min(max(Ned_; 0.999999*Nmin_); 0.999999*Nmax_)
    ψ_2 = pi/n_s
    x1_ = $Find{N_Rc(t; 0) - Nt_ @ t = 0.000001 : 1000000000}
    x2_ = $Find{N_Rc(t; ψ_2) - Nt_ @ t = 0.000001 : 1000000000}
    M1_ = M_Rc(x1_; 0)
    M2_ = M_Rc(x2_; ψ_2)
    x_y = if(M1_ ≤ M2_; x1_; x2_)*mm
    x_z = x_y
    M_Rd,y = min(M1_; M2_)/1000000*kN*m
    M_Rd,z = M_Rd,y
    #show
#end if
#hide
N_Rd,max = Nmax_/1000*kN
N_Rd,min = Nmin_/1000*kN
#show
N_Rd,max', volledige druk<span class="kolom-2"></span>'
N_Rd,min', volledige trek<span class="alleen-scherm"></span>'
#hide
UC_N = 0
#show
#if N_Ed ≥ N_Rd,max or N_Ed ≤ N_Rd,min
    #if N_Ed ≥ N_Rd,max
        '<b style="color:#b91c1c">N<sub>Ed</sub> ≥ N<sub>Rd,max</sub>: de doorsnede kan de normaalkracht niet opnemen, ook zonder moment.</b>
        UC_N = N_Ed/N_Rd,max', alleen de normaalkracht<span class="kolom-2"></span>'
    #else
        '<b style="color:#b91c1c">De trekkracht is groter dan de wapening kan opnemen.</b>
        UC_N = N_Ed/N_Rd,min', alleen de normaalkracht<span class="kolom-2"></span>'
    #end if
    '<i class="alleen-scherm">Bij deze normaalkracht is er geen momentcapaciteit meer: met een moment is UC = ∞, net als de grens van M<sub>Ed</sub>/M<sub>Rd</sub> vlak binnen het bereik.</i><span class="alleen-scherm"></span>
    #hide
    UC_y = if(M_Ed,y > 0 kN*m; 1/0; UC_N)
    UC_z = if(M_Ed,z > 0 kN*m; 1/0; UC_N)
    #show
    UC_y'<span class="kolom-4"></span>'
    UC_z'<span class="kolom-4"></span>'
#else
    #if vorm ≡ 1
        x_y'<span class="alleen-scherm">, drukzonehoogte bij N<sub>Ed</sub>, buiging om y</span><span class="kolom-4"></span>'
        M_Rd,y'<span class="kolom-4"></span>'
        UC_y = M_Ed,y/M_Rd,y'<span class="kolom-2"></span>'
        x_z'<span class="alleen-scherm">, drukzonehoogte bij N<sub>Ed</sub>, buiging om z</span><span class="kolom-4"></span>'
        M_Rd,z'<span class="kolom-4"></span>'
        UC_z = M_Ed,z/M_Rd,z'<span class="kolom-2"></span>'
    #else
        x_y'<span class="alleen-scherm">, drukzonehoogte bij N<sub>Ed</sub></span>, ongunstigste stand van de staven<span class="kolom-2"></span>'
        M_Rd,y', om elke as<span class="kolom-2"></span>'
        UC_y = M_Ed,y/M_Rd,y'<span class="kolom-2"></span>'
        UC_z = M_Ed,z/M_Rd,z'<span class="kolom-2"></span>'
    #end if
    #if N_Ed < 0 kN
        UC_N = N_Ed/N_Rd,min', trek<span class="alleen-scherm">, ook zonder moment</span><span class="kolom-2"></span>'
    #end if
#end if

# 6. Scheve buiging (§5.8.9)

#hide
'Momenten zonder imperfectie en zonder e_0: voor de richting waarin de imperfectie niet werkt (5.8.9(2)).
M_y,0 = if(N_Ed > 0 kN; if(geschoord_y ≡ 1; max(max(0.6*M_0y + 0.4*M_1y; 0.4*M_0y) + M_2,y; M_0y); M_0y + M_2,y); M_Ed,y)
M_z,0 = if(N_Ed > 0 kN; if(geschoord_z ≡ 1; max(max(0.6*M_0z + 0.4*M_1z; 0.4*M_0z) + M_2,z; M_0z); M_0z + M_2,z); M_Ed,z)
'Relatieve excentriciteiten (5.38b): e_z/h = M_Edy/(N·h) en e_y/b = M_Edz/(N·b); N valt weg in de verhouding.
q_e(My; Mz) = min(My/h; Mz/b)/max(My/h; Mz/b; 0.000001 kN)
q_A = q_e(M_Ed,y; M_z,0)
q_B = q_e(M_y,0; M_Ed,z)
ok_λ = if(λ_y/λ_z ≤ 2 and λ_z/λ_y ≤ 2; 1; 0)
nodig_A = if(ok_λ ≡ 1 and q_A ≤ 0.2; 0; 1)
nodig_B = if(ok_λ ≡ 1 and q_B ≤ 0.2; 0; 1)
N_Rd = A_c*f_cd + A_s*f_yd to kN
r_N = N_Ed/N_Rd
a_N = if(vorm ≡ 2; 2; if(r_N ≤ 0.1; 1; if(r_N ≤ 0.7; 1 + (r_N - 0.1)/0.6*0.5; if(r_N ≤ 1; 1.5 + (r_N - 0.7)/0.3*0.5; 2))))
UC_biax = 0
#show
#if N_Ed ≥ N_Rd,max or N_Ed ≤ N_Rd,min
    '<i>Niet getoetst: de doorsnede voldoet al niet op de normaalkracht.</i>
#else if M_Ed,y ≡ 0 kN*m or M_Ed,z ≡ 0 kN*m
    '<i>Buiging om één as: geen scheve buiging.</i>
#else
    '<i class="alleen-scherm">De imperfectie werkt alleen in de ongunstigste richting (5.8.9(2)): geval A met de imperfectie om de y-as, geval B om de z-as; de andere as zonder imperfectie en zonder e<sub>0</sub>. Scheiding van de assen mag als λ<sub>y</sub>/λ<sub>z</sub> en λ<sub>z</sub>/λ<sub>y</sub> ≤ 2 (5.38a) en de verhouding van de relatieve excentriciteiten ≤ 0,2 of ≥ 5 is (5.38b); anders (5.39).</i><span class="alleen-scherm"></span>
    'λ<sub>y</sub>/λ<sub>z</sub> = 'λ_y/λ_z' (5.38a: 'if(ok_λ ≡ 1; "tussen 0,5 en 2"; "buiten 0,5 tot 2")'); geval A: M<sub>z,0</sub> = 'M_z,0/(1 kN*m)' kNm zonder imperfectie, verhouding (5.38b) 'q_A'; geval B: M<sub>y,0</sub> = 'M_y,0/(1 kN*m)' kNm, verhouding 'q_B'.
    #if nodig_A + nodig_B ≡ 0
        '<i>(5.38) voldaan in beide gevallen: de toetsen per as volstaan.</i>
    #else
        N_Rd = A_c*f_cd + A_s*f_yd to kN', 5.8.9(4)<span class="alleen-scherm"></span>'
        N_Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #if vorm ≡ 2
            a_N', ronde doorsnede, 5.8.9(4)<span class="kolom-2"></span>'
        #else
            r_N = N_Ed/N_Rd', 5.8.9(4)<span class="kolom-2"></span>'
            a_N'<span class="alleen-scherm">, lineair tussen 1,0 bij 0,1, 1,5 bij 0,7 en 2,0 bij 1,0</span><span class="kolom-4"></span>'
        #end if
        #if nodig_A ≡ 1
            UC_A = (M_Ed,y/M_Rd,y)^a_N + (M_z,0/M_Rd,z)^a_N', (5.39), geval A'
        #else
            #hide
            UC_A = 0
            #show
        #end if
        #if nodig_B ≡ 1
            UC_B = (M_y,0/M_Rd,y)^a_N + (M_Ed,z/M_Rd,z)^a_N', (5.39), geval B'
        #else
            #hide
            UC_B = 0
            #show
        #end if
        #hide
        UC_biax = max(UC_A; UC_B)
        #show
    #end if
#end if

# 7. Detaillering (§9.5)

'<i>Met de waarden van de NB bij §9.5.2, §9.5.3 en, bij een in-situ gestorte paal, §9.8.5(3).</i>
#hide
ja(ok) = if(ok ≡ 1; "voldoet"; "voldoet niet")
kl(ok) = if(ok ≡ 1; "#047857"; "#b91c1c")
#show
#if insitu ≡ 1
    #hide
    'De minimumwapening met de nominale doorsnede: de kleinere rekenmaat van §2.3.4.2(2) geldt voor het draagvermogen.
    #if vorm ≡ 1
        A_c,nom = b_kol*h_kol
    #else
        A_c,nom = pi*h_kol^2/4
    #end if
    A_s,paal = if(A_c,nom ≤ 0.5 m^2; 0.005*A_c,nom; if(A_c,nom ≤ 1 m^2; 2500 mm^2; 0.0025*A_c,nom))
    'NB bij 9.8.5(3): Ø ≥ 12 mm en ten minste vier staven.
    Ø_min = 12 mm
    n_min = 4
    #show
    A_s,min = max(0.10*N_Ed/f_yd; 0.002*A_c,nom; A_s,paal) to mm^2', (9.12N) en tabel 9.6N, met A<sub>c</sub> van de nominale maat (veilige kant)<span class="alleen-scherm"></span>'
#else
    #hide
    Ø_min = 8 mm
    n_min = 4
    #show
    A_s,min = max(0.10*N_Ed/f_yd; 0.002*A_c) to mm^2', (9.12N)<span class="alleen-scherm"></span>'
#end if
A_s,max = 0.04*A_c to mm^2', NB 9.5.2(3)<span class="alleen-scherm">: kolom met overlappingslassen, buiten de las; zonder lassen mag 0,08·A<sub>c</sub></span><span class="alleen-scherm"></span>'
Ø_b,min = max(6 mm; d_staaf/4)', 9.5.3(1)<span class="alleen-scherm"></span>'
s_cl,max = min(20*d_staaf; min(b; h); 400 mm)', 9.5.3(3)<span class="alleen-scherm"></span>'
#hide
s_cl,eind = 0.6*s_cl,max
#if vorm ≡ 1
    n_tot = 2*n_h + 2*n_b - 4
    s_h = (h - 2*a_y)/(n_hr - 1)
    s_b = (b - 2*a_z)/(n_br - 1)
    s_vrij = max(s_h; s_b) - d_staaf
    u_150 = max(floor((n_hr - 1)/2)*s_h; floor((n_br - 1)/2)*s_b)
    ok_n = if(n_h ≥ 2 and n_b ≥ 2 and n_tot ≥ n_min; 1; 0)
#else
    n_tot = n_rond
    s_vrij = 2*pi*R_s/n_s - d_staaf
    u_150 = 0 mm
    ok_n = if(n_rond ≥ n_min; 1; 0)
#end if
ok_As = if(A_s ≥ A_s,min and A_s ≤ A_s,max; 1; 0)
ok_Ø = if(d_staaf ≥ Ø_min and d_beugel ≥ Ø_b,min; 1; 0)
ok_s = if(s_beugel ≤ s_cl,max; 1; 0)
ok_det = min(ok_As; ok_Ø; ok_s; ok_n)
#show
'A<sub>s,min</sub> ≤ A<sub>s</sub> ≤ A<sub>s,max</sub> ((9.12N)'if(insitu ≡ 1; ", tabel 9.6N met de nominale doorsnede"; "")', 9.5.2(3)): 'A_s,min/(1 mm^2)' ≤ 'A_s/(1 mm^2)' ≤ 'A_s,max/(1 mm^2)' mm² → <b style="color:'kl(ok_As)'">'ja(ok_As)'</b>
'Staaf Ø'd_staaf/(1 mm)' ≥ Ø'Ø_min/(1 mm)' (9.5.2(1)'if(insitu ≡ 1; ", paal: NB 9.8.5(3)"; "")'), beugel Ø'd_beugel/(1 mm)' ≥ Ø'Ø_b,min/(1 mm)' (9.5.3(1)) → <b style="color:'kl(ok_Ø)'">'ja(ok_Ø)'</b>
'Beugelafstand 's_beugel/(1 mm)' ≤ s<sub>cl,max</sub> = 's_cl,max/(1 mm)' mm (9.5.3(3)) → <b style="color:'kl(ok_s)'">'ja(ok_s)'</b>; bij een balk of vloer en bij overlappingen (Ø > 14 mm) ≤ 's_cl,eind/(1 mm)' mm (9.5.3(4))
'Aantal staven 'n_tot', ten minste 'n_min' staven'if(vorm ≡ 1; ", met een staaf in elke hoek"; "")' (9.5.2(4)'if(insitu ≡ 1; ", paal: NB 9.8.5(3)"; "")') → <b style="color:'kl(ok_n)'">'ja(ok_n)'</b>
#if insitu ≡ 1 and s_vrij > 200 mm
    '<b style="color:#b45309">Vrij tussen de staven 's_vrij/(1 mm)' mm: meer dan de 200 mm die 9.8.5(3) aanbeveelt. De NB vervangt die aanbeveling; de detaillering van de paal volgt 9.8.5(4).</b>
#end if
#if u_150 > 150 mm
    '<b style="color:#b45309">Een staaf ligt 'u_150/(1 mm)' mm van de dichtstbijzijnde hoekstaaf: staven verder dan 150 mm van een opgesloten staaf apart opsluiten met een beugel of haarspeld (9.5.3(6)).</b>
#end if

UC_max = max(UC_y; UC_z; UC_biax; UC_N)
#hide
'Wat naast de UC afkeurt: de detaillering (ok_det) en rekenen zonder kruip buiten 5.8.4(4) (ok_φ).
reden(d; k) = if(k ≡ 1; "de detaillering voldoet niet (§9.5)"; if(d ≡ 1; "rekenen zonder kruip mag hier niet (5.8.4(4))"; "de detaillering voldoet niet (§9.5) en rekenen zonder kruip mag hier niet (5.8.4(4))"))
#show
#if UC_max ≤ 1.0 and ok_det ≡ 1 and ok_φ ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de kolom voldoet</b></span>
#else if ok_det ≡ 1 and ok_φ ≡ 1
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de kolom voldoet niet</b></span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ≤ 1,0, maar 'reden(ok_det; ok_φ)' → <b>de kolom voldoet niet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 en 'reden(ok_det; ok_φ)' → <b>de kolom voldoet niet</b></span>
#end if
'Niet getoetst: dwarskracht (§6.2), scheurwijdte (§7.3) en brandwerendheid.
`;
