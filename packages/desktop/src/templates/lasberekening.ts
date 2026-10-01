/**
 * Lasberekening — hoeklassen en een volledig doorgelaste stompe las onder zes
 * belastingcomponenten, volgens NEN-EN 1993-1-8 §4 met de Nederlandse NB.
 *
 * Drie lasfiguren:
 *   1. dubbele hoeklas langs een plaat: twee lassen van lengte L aan weerszijden
 *      van een plaat met dikte t_p, dus op de afstand t_p van elkaar;
 *   2. stompe las, volledig doorgelast, over de doorsnede L × t_p;
 *   3. rondgaande hoeklas om een rechthoek L × b (koker of plaat), om de hoeken
 *      doorgelast.
 *
 * Assen in het zwaartepunt van de lasfiguur: x loodrecht op het aansluitvlak
 * (de as van het aangesloten deel), y in het aansluitvlak dwars op de las, z
 * langs de las (over L). F_x is de normaalkracht; M_x wringt de lasfiguur in
 * het aansluitvlak, M_y buigt de plaat in haar eigen vlak (de spanning verloopt
 * langs de las) en M_z buigt om de lasas (koppel tussen de twee lassen).
 *
 * Hoeklassen. De keelvlakken zijn in het aansluitvlak geklapt en in de
 * laswortel geconcentreerd (§4.5.3.2(3)); de spanningen volgen elastisch uit
 * A_w, W_y, W_z en I_p (§4.9(1)). Alle bijdragen tellen op in het zwaarst
 * belaste hoekpunt, ongeacht hun teken: een bovengrens, en de tekens van de
 * invoer doen er daardoor niet toe. Een keelvlak onder 45° ontbindt σ_x en de
 * schuifspanning dwars op de las in σ⊥ en τ⊥; de schuifspanning langs de las
 * is τ∥. Van de twee lassen aan weerszijden is die met τ⊥ = (σ_x + τ_dwars)/√2
 * en σ⊥ = |σ_x − τ_dwars|/√2 maatgevend voor (4.1) — het verschil met de andere
 * las is 4·σ_x·τ_dwars onder de wortel. De tweede voorwaarde van (4.1) neemt de
 * grootste σ⊥ = (σ_x + τ_dwars)/√2. Bij de rondgaande las worden de lassen over
 * L en die over b in het hoekpunt allebei getoetst. De vereenvoudigde methode
 * (4.2)–(4.4) neemt de resultante per lengte-eenheid.
 *
 * Lengte: l_eff = L − 2a per las (§4.5.1(1)); de rondgaande las loopt om de
 * hoeken door en telt de volle lengte. Een las met l_eff < max(30 mm; 6a) mag
 * geen kracht overbrengen (§4.5.1(2)): bij de rondgaande las vallen de lassen
 * over b dan weg, anders voldoet de verbinding niet. a ≥ 3 mm (§4.5.2(2)).
 * Lange verbindingen: β_Lw,1 (4.9) met L_j = L, β_Lw,2 (4.10) met L_w = L; de
 * reductie geldt voor beide voorwaarden van (4.1) en voor (4.3).
 *
 * Stompe las, volledig doorgelast: de weerstand is die van het zwakste
 * verbonden deel (§4.7.1). Getoetst wordt de doorsnede L × t_p ter plaatse van
 * de las met (6.1) van NEN-EN 1993-1-1, met f_y van het zwakste deel: bij één
 * staalsoort die van het dikste verbonden deel, want het deel waarop de plaat
 * aansluit wordt ter plaatse van de las over dezelfde doorsnede belast (bij
 * een stuiknaad tussen twee platen ligt dat aan de veilige kant). Elastisch:
 * de grootste normaalspanning en de grootste schuifspanning (1,5·V/A en
 * wringing volgens de dunne rechthoek) opgeteld, ook al vallen ze niet in
 * hetzelfde punt — aan de veilige kant.
 *
 * Materiaal: f_u en f_y volgens tabel 3.1 van NEN-EN 1993-1-1 (S355 t ≤ 40 mm:
 * f_u = 490 N/mm²), f_u en f_y naar het dikste verbonden deel (de keuze, en
 * voor de plaat t_p zelf). β_w volgens tabel 4.1, γ_M2 = 1,25 en γ_M0 = 1,0
 * volgens de NB.
 *
 * Invoernamen komen exact overeen met LasDesigner.tsx; dat beeld leest de UC's
 * en het oordeel uit dit blad. Geen referentieberekening beschikbaar;
 * scripts/check-las.mjs rekent de uitkomsten onafhankelijk na.
 */

export const lasberekening = `"Lasberekening — EN 1993-1-8 §4.5 en §4.7

'<i>Assen in het zwaartepunt van de lasfiguur: x loodrecht op het aansluitvlak, y in het aansluitvlak dwars op de las, z langs de las. De keelvlakken zijn in het aansluitvlak geklapt en in de laswortel geconcentreerd (§4.5.3.2(3)). Alle bijdragen tellen op in het zwaarst belaste hoekpunt, ongeacht hun teken: het teken van de invoer maakt voor de toets niet uit.</i><span class="alleen-scherm"></span>

# 1. Invoer

@select typelas "Lasfiguur"
  Dubbele hoeklas langs een plaat = 1
  Stompe las, volledig doorgelast = 2
  Rondgaande hoeklas om een rechthoek L × b = 3
@end

@select staalsoort "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select dikte "Dikste verbonden deel"
  t ≤ 40 mm = 40
  t van 40 tot 80 mm = 80
@end

#if typelas ≠ 2
    @select methode "Toets van de hoeklas"
      Richtingsmethode §4.5.3.2 = 1
      Vereenvoudigde methode §4.5.3.3 = 2
    @end

    @select langeverb "Lange verbinding §4.11"
      niet van toepassing = 0
      overlapverbinding β_Lw,1 = 1
      dwarsverstijving plaatligger β_Lw,2 = 2
    @end
#end if

L_las = ?*(mm)', lengte L, langs de las'
#if typelas ≡ 3
    b_las = ?*(mm)', breedte b, dwars op de las'
#else
    t_plaat = ?*(mm)', dikte t<sub>p</sub> van de aangelaste plaat'
#end if
#if typelas ≠ 2
    a_las = ?*(mm)', keeldikte a'
#end if
F_xEd = ?*(kN)', loodrecht op het aansluitvlak'
F_yEd = ?*(kN)', dwars op de las'
F_zEd = ?*(kN)', langs de las'
M_xEd = ?*(kN*m)', wringing in het aansluitvlak'
M_yEd = ?*(kN*m)', buiging in het vlak van de plaat'
M_zEd = ?*(kN*m)', buiging om de lasas'

# 2. Materiaal en lasfiguur

#hide
fu_40 = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
fu_80 = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 410; 470))
bw_ = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
'Tabel 3.1 naar het dikste deel: de keuze, en bij een plaat ook t_p zelf; f_u voor de hoeklas, f_y voor de stompe las.
t_k = dikte
'fout: 0 = geen, 1 = a < 3 mm, 2 = las te kort, 3 = plaat of maat buiten bereik, 4 = β_Lw ≤ 0.
fout = 0
n_b = 1
'Eenheidloos, zodat de #if met een kaal getal kan vergelijken.
belast = (abs(F_xEd) + abs(F_yEd) + abs(F_zEd))/(1*kN) + (abs(M_xEd) + abs(M_yEd) + abs(M_zEd))/(1*kN*m)
#show
#if typelas ≠ 3
    #hide
    t_k = if(t_plaat > 40 mm; 80; dikte)
    #show
#end if
#hide
f_u = if(t_k ≡ 40; fu_40; fu_80)*N/mm^2
β_w = bw_
γ_M2 = 1.25
γ_M0 = 1.0
#show
#if typelas ≡ 2
    #hide
    f_y = if(t_k ≡ 80; staalsoort - 20; staalsoort)*N/mm^2
    #show
    'S'staalsoort', plaat L × t<sub>p</sub> volledig doorgelast (§4.7.1): f<sub>y</sub> = 'f_y' N/mm² (tabel 3.1 van NEN-EN 1993-1-1, t ≤ 't_k' mm), γ<sub>M0</sub> = 'γ_M0' (NB).
#else
    'S'staalsoort': f<sub>u</sub> = 'f_u' N/mm² (tabel 3.1 van NEN-EN 1993-1-1, t ≤ 't_k' mm), β<sub>w</sub> = 'β_w' (tabel 4.1), γ<sub>M2</sub> = 'γ_M2' (NB).
#end if
#if typelas ≠ 3
    #if t_plaat ≤ 0 mm or t_plaat > 80 mm
        #hide
        fout = 3
        #show
        '<b style="color:#b91c1c">De plaatdikte valt buiten tabel 3.1 van NEN-EN 1993-1-1 (0 &lt; t<sub>p</sub> ≤ 80 mm).</b>
    #else if typelas ≡ 2 and L_las < t_plaat
        #hide
        fout = 3
        #show
        '<b style="color:#b91c1c">L is de lange zijde van de plaatdoorsnede: vul L ≥ t<sub>p</sub> in.</b>
    #end if
#else if b_las ≤ 0 mm
    #hide
    fout = 3
    #show
    '<b style="color:#b91c1c">Vul een breedte b &gt; 0 mm in.</b>
#end if
#if typelas ≠ 2
    #if a_las < 3 mm
        #hide
        fout = 1
        #show
        '<b style="color:#b91c1c">a = 'a_las' mm &lt; 3 mm: te kleine keeldikte (§4.5.2(2)).</b>
    #end if
    l_min = max(30 mm; 6*a_las)', §4.5.1(2)<span class="alleen-scherm"></span>'
    l_min', §4.5.1(2)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if typelas ≡ 1
        l_eff = L_las - 2*a_las', per las, §4.5.1(1)<span class="alleen-scherm"></span>'
        l_eff', §4.5.1(1)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #if l_eff < l_min
            #hide
            fout = 2
            #show
            '<b style="color:#b91c1c">l<sub>eff</sub> &lt; l<sub>min</sub>: deze las mag geen kracht overbrengen (§4.5.1(2)).</b>
        #end if
    #else
        #if L_las < l_min
            #hide
            fout = 2
            #show
            '<b style="color:#b91c1c">L &lt; l<sub>min</sub>: de lassen over L mogen geen kracht overbrengen (§4.5.1(2)).</b>
        #else if b_las < l_min and b_las > 0 mm
            #hide
            n_b = 0
            #show
            '<b style="color:#b45309">b &lt; l<sub>min</sub>: de lassen over b dragen niet mee (§4.5.1(2)); alleen de twee lassen over L.</b>
        #end if
    #end if
    #if langeverb ≡ 1 and a_las > 0 mm
        β_Lw = min(1; 1.2 - 0.2*L_las/(150*a_las))', (4.9), L<sub>j</sub> = L<span class="alleen-scherm"></span>'
        β_Lw', (4.9)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else if langeverb ≡ 2
        β_Lw = min(1; max(0.6; 1.1 - L_las/(17*m)))', (4.10), L<sub>w</sub> = L<span class="alleen-scherm"></span>'
        β_Lw', (4.10)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else
        #hide
        β_Lw = 1
        #show
    #end if
    #if β_Lw ≤ 0
        #hide
        fout = 4
        #show
        '<b style="color:#b91c1c">β<sub>Lw,1</sub> ≤ 0: de overlap is te lang voor (4.9).</b>
    #end if
#end if

#if fout ≡ 0
    #if typelas ≡ 1
        A_w = 2*a_las*l_eff to mm^2'<span class="alleen-scherm"></span>'
        A_w'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        W_y = a_las*l_eff^2/3 to mm^3'<span class="alleen-scherm"></span>'
        W_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        W_z = a_las*l_eff*t_plaat to mm^3', arm t<sub>p</sub> tussen de laswortels<span class="alleen-scherm"></span>'
        W_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        I_p = a_las*l_eff*(l_eff^2 + 3*t_plaat^2)/6 to mm^4'<span class="alleen-scherm"></span>'
        I_p'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #hide
        z_c = l_eff/2
        y_c = t_plaat/2
        #show
    #else if typelas ≡ 3
        #if n_b ≡ 1
            A_w = 2*a_las*(L_las + b_las) to mm^2'<span class="alleen-scherm"></span>'
            A_w'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            W_y = a_las*L_las*(L_las/3 + b_las) to mm^3'<span class="alleen-scherm"></span>'
            W_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            W_z = a_las*b_las*(L_las + b_las/3) to mm^3'<span class="alleen-scherm"></span>'
            W_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            I_p = a_las*(L_las + b_las)^3/6 to mm^4'<span class="alleen-scherm"></span>'
            I_p'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #else
            A_w = 2*a_las*L_las to mm^2'<span class="alleen-scherm"></span>'
            A_w'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            W_y = a_las*L_las^2/3 to mm^3'<span class="alleen-scherm"></span>'
            W_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            W_z = a_las*L_las*b_las to mm^3'<span class="alleen-scherm"></span>'
            W_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
            I_p = a_las*L_las*(L_las^2 + 3*b_las^2)/6 to mm^4'<span class="alleen-scherm"></span>'
            I_p'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #end if
        #hide
        z_c = L_las/2
        y_c = b_las/2
        #show
    #else
        A_p = L_las*t_plaat to mm^2'<span class="alleen-scherm"></span>'
        A_p'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        W_y = t_plaat*L_las^2/6 to mm^3'<span class="alleen-scherm"></span>'
        W_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        W_z = L_las*t_plaat^2/6 to mm^3'<span class="alleen-scherm"></span>'
        W_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        W_t = L_las*t_plaat^2/3*(1 - 0.63*t_plaat/L_las) to mm^3', wringing<span class="alleen-scherm"></span>'
        W_t', wringing<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
#end if

# 3. Toetsing

#if belast ≤ 0
    'Geen belasting ingevoerd.
#else if fout ≠ 0
    '<b>Maatgevende UC</b> niet te bepalen<span style="color:#b91c1c">: de lasfiguur voldoet niet aan de eisen in hoofdstuk 2 → <b>voldoet niet</b></span>
#else if typelas ≡ 2
    σ_Ed = abs(F_xEd)/A_p + abs(M_yEd)/W_y + abs(M_zEd)/W_z to N/mm^2
    τ_Ed = 1.5*sqrt(F_yEd^2 + F_zEd^2)/A_p + abs(M_xEd)/W_t to N/mm^2
    UC_s = sqrt(σ_Ed^2 + 3*τ_Ed^2)/(f_y/γ_M0)', (6.1) van NEN-EN 1993-1-1'
    #hide
    UC_max = UC_s
    #show
#else
    '<i>Spanningen in het keelvlak, in het aansluitvlak geklapt, in het zwaarst belaste hoekpunt.</i><span class="alleen-scherm"></span>
    σ_x = abs(F_xEd)/A_w + abs(M_yEd)/W_y + abs(M_zEd)/W_z to N/mm^2'<span class="alleen-scherm">, loodrecht op het aansluitvlak</span>'
    τ_y = abs(F_yEd)/A_w + abs(M_xEd)*z_c/I_p to N/mm^2'<span class="alleen-scherm">, dwars op de las</span>'
    τ_z = abs(F_zEd)/A_w + abs(M_xEd)*y_c/I_p to N/mm^2'<span class="alleen-scherm">, langs de las</span>'
    #if methode ≡ 1
        '<h6>Richtingsmethode — §4.5.3.2 (4.1)<span class="alleen-scherm"></span></h6>
        #if typelas ≡ 3
            '<i>Lassen over L: dwars is y, langs is z.</i><span class="alleen-scherm"></span>
        #end if
        σ_perp = abs(σ_x - τ_y)/sqrt(2)'<span class="alleen-scherm"></span>'
        σ_perp'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        τ_perp = (σ_x + τ_y)/sqrt(2)'<span class="alleen-scherm"></span>'
        τ_perp'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        τ_par = τ_z'<span class="alleen-scherm"></span>'
        τ_par'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        UC_41 = sqrt(σ_perp^2 + 3*(τ_perp^2 + τ_par^2))/(β_Lw*f_u/(β_w*γ_M2))', (4.1)'
        #if typelas ≡ 3 and n_b ≡ 1
            '<i>Lassen over b: dwars is z, langs is y.</i><span class="alleen-scherm"></span>
            σ_perp,b = abs(σ_x - τ_z)/sqrt(2)'<span class="alleen-scherm"></span>'
            σ_perp,b'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            τ_perp,b = (σ_x + τ_z)/sqrt(2)'<span class="alleen-scherm"></span>'
            τ_perp,b'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            τ_par,b = τ_y'<span class="alleen-scherm"></span>'
            τ_par,b'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            UC_41,b = sqrt(σ_perp,b^2 + 3*(τ_perp,b^2 + τ_par,b^2))/(β_Lw*f_u/(β_w*γ_M2))', (4.1)<span class="alleen-scherm">, lassen over b</span>'
            UC_σ = (σ_x + max(τ_y; τ_z))/sqrt(2)/(β_Lw*0.9*f_u/γ_M2)', (4.1), grootste σ<sub>⊥</sub> ≤ 0,9·f<sub>u</sub>/γ<sub>M2</sub>'
            #hide
            UC_max = max(UC_41; UC_41,b; UC_σ)
            #show
        #else
            UC_σ = (σ_x + τ_y)/sqrt(2)/(β_Lw*0.9*f_u/γ_M2)', (4.1), grootste σ<sub>⊥</sub> ≤ 0,9·f<sub>u</sub>/γ<sub>M2</sub>'
            #hide
            UC_max = max(UC_41; UC_σ)
            #show
        #end if
    #else
        '<h6>Vereenvoudigde methode — §4.5.3.3<span class="alleen-scherm"></span></h6>
        f_vw,d = f_u/(sqrt(3)*β_w*γ_M2) to N/mm^2', (4.4)<span class="alleen-scherm"></span>'
        f_vw,d', (4.4)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        F_w,Rd = β_Lw*f_vw,d*a_las to N/mm', (4.3)<span class="alleen-scherm"></span>'
        F_w,Rd', (4.3)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        F_w,Ed = a_las*sqrt(σ_x^2 + τ_y^2 + τ_z^2) to N/mm', resultante per lengte-eenheid'
        UC_w = F_w,Ed/F_w,Rd', (4.2)'
        #hide
        UC_max = UC_w
        #show
    #end if
#end if

#if belast > 0 and fout ≡ 0
    #if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de las voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de las voldoet niet</b></span>
    #end if
#end if

'Niet getoetst: de verbonden delen zelf (behalve bij de stompe las), de 80%-eis voor vervormingscapaciteit (§4.9(4)), onverstijfde flenzen (§4.10) en excentrisch belaste enkelzijdige lassen (§4.12).
`;
