/**
 * Ponsberekening — doorponsen van een vlakke plaat boven een kolom, volgens
 * NEN-EN 1992-1-1 §6.4 met de Nederlandse NB. Beeld: PonsDesigner.tsx; de
 * variabelenamen komen daarmee overeen.
 *
 * Getoetst:
 *   - nuttige hoogte d_eff = (d_y + d_z)/2 (6.32) en ρ_l = √(ρ_ly·ρ_lz) ≤ 0,02
 *     (6.4.4(1)), met de buitenste laag aan de trekzijde (boven een kolom de
 *     bovenwapening);
 *   - de controle-omtrek u_1 op 2d volgens figuur 6.13 (midden) en 6.15 (rand,
 *     hoek), de kolomomtrek u_0 volgens 6.4.5(3);
 *   - β vereenvoudigd volgens figuur 6.21N, uit de excentriciteit of
 *     handmatig. Uit de excentriciteit: middenkolom (6.39) met W_1 (6.41),
 *     rond (6.42), in twee richtingen (6.43); randkolom (6.44)/(6.45) en
 *     hoekkolom (6.46) met de verkleinde omtrek u_1* van figuur 6.20.
 *     v_Ed rekent altijd met u_1 van figuur 6.13/6.15; u_1* zit alleen in
 *     β = u_1/u_1*. Zo lopen omtrek en β nooit door elkaar;
 *   - v_Ed (6.38) tegen v_Rd,c (6.47) met k ≤ 2 en v_min (6.3N);
 *   - v_Ed,0 langs de kolom (6.53) tegen v_Rd,max = 0,4·ν·f_cd (6.4.5(3),
 *     aanbevolen waarde: de veilige kant);
 *   - ponswapening (6.52) met f_ywd,ef = 250 + 0,25d ≤ f_ywd, de omtrek
 *     u_out,ef (6.54) met de buitenste omtrek ten hoogste 1,5d daarbinnen
 *     (6.4.5(4)), en de detaillering van §9.4.3: ten minste twee omtrekken,
 *     s_r ≤ 0,75d, eerste omtrek ≤ 0,5d van de kolom, s_t ≤ 1,5d binnen u_1
 *     en ≤ 2d daarbuiten, en A_sw,min (9.11) met de grootste tangentiële
 *     afstand: op u_1, of op de buitenste omtrek als die buiten 2d ligt.
 *
 * Aannamen: rand- en hoekkolom liggen gelijk met de plaatrand; c_1 staat
 * loodrecht op de rand. Een ronde rand- of hoekkolom rekent als een vierkante
 * kolom met dezelfde omtrek (zijde πc/4): kortere omtrekken, dus de veilige
 * kant. Bij een rand- of hoekkolom moet de excentriciteit loodrecht op de rand
 * naar binnen wijzen. Wijst ze naar buiten, dan geldt (6.39) met W_1 van de
 * randomtrek (6.4.3(4)); dat doet dit blad niet, en de slotzin zegt dan dat
 * het blad niet getoetst is.
 *
 * Niet in dit blad: kolomkoppen (§6.4.2(8)–(11)), sparingen bij de kolom
 * (6.4.2(3)), voorspanning (σ_cp) en funderingsplaten of poeren (6.4.4(2),
 * V_Ed,red met de gronddruk binnen de omtrek).
 *
 * De keuzewaarden van beta_keuze blijven 0 (uit de excentriciteit) en 1
 * (handmatig); figuur 6.21N is 2. Met figuur 6.21N geeft het blad dezelfde
 * uitkomst als het normblad ec2Pons in en1992.ts.
 *
 * scripts/check-pons.mjs rekent twee voorbeelden met de hand na, legt de
 * grensgevallen vast en vergelijkt met ec2Pons.
 */

export const ponsberekening = `"Ponsberekening — EN 1992-1-1 §6.4

'<i>Doorponsen van een vlakke plaat boven een kolom: de schuifspanning op de controle-omtrek u<sub>1</sub> op 2d van de kolomrand, de drukdiagonaal langs de kolom en zo nodig de ponswapening.</i><span class="alleen-scherm"></span>

# 1. Kolom, plaat en wapening

@select vorm "Vorm van de kolom"
  Rechthoekige kolom = 1
  Ronde kolom = 2
@end

@select plaats "Plaats van de kolom"
  Middenkolom = 1
  Randkolom, gelijk met de plaatrand = 2
  Hoekkolom, gelijk met beide randen = 3
@end

c_1 = ?*(mm)', c<sub>1</sub><span class="alleen-scherm">: bij een ronde kolom de diameter, bij een rand- of hoekkolom loodrecht op de rand</span><span class="kolom-3"></span>'
#if vorm ≡ 1
    c_2 = ?*(mm)', c<sub>2</sub><span class="kolom-3"></span>'
#end if
h_plaat = ?*(mm)', plaatdikte h<span class="kolom-3"></span>'

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

d_wapy = ?*(mm)', Ø<sub>y</sub><span class="alleen-scherm">, langswapening in de y-richting</span><span class="kolom-4"></span>'
s_wapy = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
d_wapz = ?*(mm)', Ø<sub>z</sub><span class="alleen-scherm">, langswapening in de z-richting</span><span class="kolom-4"></span>'
s_wapz = ?*(mm)', h.o.h.<span class="kolom-4"></span>'

@select eerstelaag "Buitenste laag aan de trekzijde"
  Langswapening y = 1
  Langswapening z = 2
@end

c_dek = ?*(mm)', dekking<span class="kolom-3"></span>'

# 2. Belasting, β en ponswapening

V_Ed = ?*(kN)', ponskracht V<sub>Ed</sub><span class="kolom-3"></span>'

@select beta_keuze "Factor β (§6.4.3)"
  Vereenvoudigd volgens figuur 6.21N = 2
  Uit de excentriciteit M_Ed/V_Ed = 0
  Handmatig = 1
@end

#if beta_keuze ≡ 0
    e_y = ?*(mm)', e<sub>y</sub><span class="alleen-scherm">, in de richting van c<sub>1</sub>; bij een rand- of hoekkolom positief naar binnen</span><span class="kolom-3"></span>'
    e_z = ?*(mm)', e<sub>z</sub><span class="alleen-scherm">, in de richting van c<sub>2</sub>; bij een hoekkolom positief naar binnen</span><span class="kolom-3"></span>'
#else if beta_keuze ≡ 1
    beta_hand = ?', β<span class="alleen-scherm">, bij u<sub>1</sub> van figuur 6.13 of 6.15</span><span class="kolom-3"></span>'
#end if

@select ponswap "Ponswapening"
  Geen = 0
  In omtrekken rond de kolom = 1
@end

#if ponswap ≡ 1
    d_sw = ?*(mm)', Ø<span class="kolom-3"></span>'
    n_sw = ?', staven per omtrek<span class="kolom-3"></span>'
    n_om = ?', omtrekken<span class="kolom-3"></span>'
    s_r = ?*(mm)', s<sub>r</sub><span class="alleen-scherm">, radiale afstand</span><span class="kolom-3"></span>'
    a_sw = ?*(mm)', a<span class="alleen-scherm">, eerste omtrek vanaf de kolom</span><span class="kolom-3"></span>'
    hoek_pons = ?', α [°]<span class="alleen-scherm">, met het plaatvlak</span><span class="kolom-3"></span>'
#end if

# 3. Nuttige hoogte en wapeningspercentage

#if eerstelaag ≡ 1
    d_y = h_plaat - c_dek - d_wapy/2
    d_z = h_plaat - c_dek - d_wapy - d_wapz/2
#else
    d_z = h_plaat - c_dek - d_wapz/2
    d_y = h_plaat - c_dek - d_wapz - d_wapy/2
#end if
#if min(d_y; d_z) ≤ 0 mm
'<b style="color:#b91c1c">De wapening past niet in de plaat: de nuttige hoogte is nul of negatief.</b>
'<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de plaat voldoet niet</b>: de nuttige hoogte is nul of negatief.</span>
#else
d_eff = (d_y + d_z)/2', (6.32)'
ρ_ly = pi*d_wapy^2/4/(s_wapy*d_y)
ρ_lz = pi*d_wapz^2/4/(s_wapz*d_z)
ρ_l = min(sqrt(ρ_ly*ρ_lz); 0.02)', 6.4.4(1)'

# 4. Controle-omtrekken (§6.4.2 en §6.4.5(3))

#if vorm ≡ 2 and plaats > 1
    c_k = pi*c_1/4', ronde kolom aan de rand: vierkant met dezelfde omtrek (veilige kant)'
    #hide
    c_1 = c_k
    c_2 = c_k
    #show
#end if
#if vorm ≡ 2 and plaats ≡ 1
    u_0 = pi*c_1', 6.4.5(3)'
    u_1 = pi*(c_1 + 4*d_eff)', figuur 6.13'
#else if plaats ≡ 1
    u_0 = 2*(c_1 + c_2)', 6.4.5(3)'
    u_1 = 2*(c_1 + c_2) + 4*pi*d_eff', figuur 6.13'
#else if plaats ≡ 2
    u_0 = min(c_2 + 3*d_eff; c_2 + 2*c_1)', 6.4.5(3)'
    u_1 = 2*c_1 + c_2 + 2*pi*d_eff', figuur 6.15'
#else
    u_0 = min(3*d_eff; c_1 + c_2)', 6.4.5(3)'
    u_1 = c_1 + c_2 + pi*d_eff', figuur 6.15'
#end if

# 5. Factor β (§6.4.3)

#hide
ok_β = 1
k_tab(r) = if(r ≤ 0.5; 0.45; if(r ≤ 1; 0.45 + 0.3*(r - 0.5); if(r ≤ 2; 0.6 + 0.1*(r - 1); min(0.8; 0.7 + 0.1*(r - 2)))))
#show
#if beta_keuze ≡ 2
    #if plaats ≡ 1
        β = 1.15', figuur 6.21N: geen raamwerking voor de stabiliteit, overspanningen verschillen ≤ 25 %'
    #else if plaats ≡ 2
        β = 1.4', figuur 6.21N: geen raamwerking voor de stabiliteit, overspanningen verschillen ≤ 25 %'
    #else
        β = 1.5', figuur 6.21N: geen raamwerking voor de stabiliteit, overspanningen verschillen ≤ 25 %'
    #end if
#else if beta_keuze ≡ 1
    β = max(beta_hand; 1)', handmatig, ten minste 1,0'
#else if plaats ≡ 1
    #if vorm ≡ 2
        e_tot = sqrt(e_y^2 + e_z^2)
        β = 1 + 0.6*pi*e_tot/(c_1 + 4*d_eff)', (6.42)'
    #else if abs(e_y) > 0 mm and abs(e_z) > 0 mm
        b_y = c_1 + 4*d_eff', u<sub>1</sub> in de richting van c<sub>1</sub>'
        b_z = c_2 + 4*d_eff', u<sub>1</sub> in de richting van c<sub>2</sub>'
        β = 1 + 1.8*sqrt((e_y/b_z)^2 + (e_z/b_y)^2)', (6.43)'
    #else if abs(e_z) > 0 mm
        k_β = k_tab(c_2/c_1)', tabel 6.1, e in de richting van c<sub>2</sub>'
        W_1 = c_2^2/2 + c_1*c_2 + 4*c_1*d_eff + 16*d_eff^2 + 2*pi*d_eff*c_2', (6.41), c<sub>1</sub> en c<sub>2</sub> verwisseld<span class="alleen-scherm"></span>'
        W_1', (6.41), c<sub>1</sub> en c<sub>2</sub> verwisseld<span class="alleen-afdruk"></span>'
        β = 1 + k_β*abs(e_z)*u_1/W_1', (6.39)'
    #else if abs(e_y) > 0 mm
        k_β = k_tab(c_1/c_2)', tabel 6.1'
        W_1 = c_1^2/2 + c_1*c_2 + 4*c_2*d_eff + 16*d_eff^2 + 2*pi*d_eff*c_1', (6.41)<span class="alleen-scherm"></span>'
        W_1', (6.41)<span class="alleen-afdruk"></span>'
        β = 1 + k_β*abs(e_y)*u_1/W_1', (6.39)'
    #else
        β = 1', geen onevenwichtig moment'
    #end if
#else if e_y < 0 mm or (plaats ≡ 3 and e_z < 0 mm)
    #hide
    ok_β = 0
    #show
    '<b style="color:#b91c1c">De excentriciteit wijst naar de rand: dan geldt (6.39) met W<sub>1</sub> van de randomtrek (6.4.3(4)), en dat doet dit blad niet. Kies β volgens figuur 6.21N of handmatig.</b>
#else if plaats ≡ 2
    a_r = min(0.5*c_1; 1.5*d_eff)', figuur 6.20a'
    u_1,red = c_2 + 2*a_r + 2*pi*d_eff', u<sub>1</sub>* van figuur 6.20a'
    #if abs(e_z) > 0 mm
        k_β = k_tab(c_1/(2*c_2))', tabel 6.1 met c<sub>1</sub>/(2c<sub>2</sub>)'
        W_1 = c_2^2/4 + c_1*c_2 + 4*c_1*d_eff + 8*d_eff^2 + pi*d_eff*c_2', (6.45), om de as loodrecht op de rand<span class="alleen-scherm"></span>'
        W_1', (6.45), om de as loodrecht op de rand<span class="alleen-afdruk"></span>'
        β = u_1/u_1,red + k_β*abs(e_z)*u_1/W_1', (6.44)'
    #else
        β = u_1/u_1,red', (6.44) met e<sub>par</sub> = 0: e naar binnen'
    #end if
#else
    a_r1 = min(0.5*c_1; 1.5*d_eff)', figuur 6.20b'
    a_r2 = min(0.5*c_2; 1.5*d_eff)
    u_1,red = a_r1 + a_r2 + pi*d_eff', u<sub>1</sub>* van figuur 6.20b'
    β = u_1/u_1,red', (6.46): e naar binnen'
#end if

#if ok_β ≡ 0
'<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de plaat is niet getoetst</b>: kies β volgens figuur 6.21N of handmatig.</span>
#else

# 6. Pons zonder ponswapening (§6.4.4) en langs de kolom (§6.4.5(3))

#hide
f_ck = betonklasse
#show
v_Ed = β*V_Ed/(u_1*d_eff) to N/mm^2', (6.38)'
k = min(1 + sqrt(200 mm/d_eff); 2)', 6.4.4(1)'
v_min = 0.035*k^(3/2)*sqrt(f_ck)*1 N/mm^2', (6.3N)'
v_Rd,c = 0.12*k*(100*ρ_l*f_ck)^(1/3)*1 N/mm^2', (6.47), C<sub>Rd,c</sub> = 0,18/γ<sub>C</sub>'
#if v_Rd,c < v_min
    v_Rd,c = v_min', ten minste v<sub>min</sub> (6.47)'
#end if
UC_pons = v_Ed/v_Rd,c
v_Ed,0 = β*V_Ed/(u_0*d_eff) to N/mm^2', (6.53)'
ν = 0.6*(1 - f_ck/250)', (6.6N)'
v_Rd,max = 0.4*ν*f_ck/1.5*1 N/mm^2', 0,4·ν·f<sub>cd</sub> (6.4.5(3)), aanbevolen waarde: de veilige kant'
UC_vRd,max = v_Ed,0/v_Rd,max

# 7. Ponswapening (§6.4.5 en §9.4.3)

#hide
ok_sw = 1
UC_w = UC_pons
#show
#if UC_pons ≤ 1
    #if ponswap ≡ 1
        '<i>v<sub>Ed</sub> ≤ v<sub>Rd,c</sub>: de ponswapening is niet nodig en telt niet mee.</i>
    #else
        '<i>v<sub>Ed</sub> ≤ v<sub>Rd,c</sub>: geen ponswapening nodig.</i>
    #end if
#else
    f_ywd,ef = min(250 + 0.25*d_eff/(1 mm); 500/1.15)*1 N/mm^2', (6.52), ≤ f<sub>ywd</sub> van B500'
    #if ponswap ≡ 0
        A_sw,nodig = (v_Ed - 0.75*v_Rd,c)*u_1*0.75*d_eff/(1.5*f_ywd,ef) to mm^2', per omtrek, loodrechte staven op s<sub>r</sub> = 0,75d (6.52)'
    #else if n_sw < 1 or n_om < 1 or s_r ≤ 0 mm or d_sw ≤ 0 mm or a_sw ≤ 0 mm or hoek_pons < 30 or hoek_pons > 90
        #hide
        ok_sw = 0
        #show
        '<b style="color:#b91c1c">Vul de ponswapening volledig in: ten minste één staaf per omtrek, één omtrek, s<sub>r</sub> en a > 0 en 30° ≤ α ≤ 90°.</b>
    #else
        #hide
        α = hoek_pons*1 deg
        #show
        A_sw = n_sw*pi*d_sw^2/4', per omtrek'
        v_Rd,s = 1.5*A_sw*f_ywd,ef*sin(α)/(s_r*u_1) to N/mm^2', (6.52)<span class="alleen-scherm">: het deel van de ponswapening, met d/(u<sub>1</sub>·d) = 1/u<sub>1</sub></span>'
        v_Rd,cs = 0.75*v_Rd,c + v_Rd,s', (6.52)'
        UC_cs = v_Ed/v_Rd,cs
        u_out,ef = β*V_Ed/(v_Rd,c*d_eff) to mm', (6.54)'
        #if vorm ≡ 2 and plaats ≡ 1
            a_out = (u_out,ef/pi - c_1)/2', afstand van u<sub>out,ef</sub> tot de kolom'
            #hide
            u_b = pi*c_1
            p_u = 2*pi
            #show
        #else if plaats ≡ 1
            a_out = (u_out,ef - 2*(c_1 + c_2))/(2*pi)', afstand van u<sub>out,ef</sub> tot de kolom'
            #hide
            u_b = 2*(c_1 + c_2)
            p_u = 2*pi
            #show
        #else if plaats ≡ 2
            a_out = (u_out,ef - 2*c_1 - c_2)/pi', afstand van u<sub>out,ef</sub> tot de kolom'
            #hide
            u_b = 2*c_1 + c_2
            p_u = pi
            #show
        #else
            a_out = 2*(u_out,ef - c_1 - c_2)/pi', afstand van u<sub>out,ef</sub> tot de kolom'
            #hide
            u_b = c_1 + c_2
            p_u = pi/2
            #show
        #end if
        a_n = a_sw + (n_om - 1)*s_r', buitenste omtrek'
        UC_uit = (a_out - 1.5*d_eff)/a_n', 6.4.5(4)<span class="alleen-scherm">: buitenste omtrek ten hoogste 1,5d binnen u<sub>out,ef</sub></span>'
        UC_n = 2/n_om', 9.4.3(1): ten minste twee omtrekken'
        UC_sr = s_r/(0.75*d_eff)', 9.4.3(1)'
        UC_a = a_sw/(0.5*d_eff)', 9.4.3(4)'
        s_t = u_1/n_sw', tangentieel, op u<sub>1</sub>'
        UC_st = s_t/(1.5*d_eff)', 9.4.3(1)'
        #hide
        UC_st,uit = 0
        s_t,max = s_t
        #show
        #if a_n > 2*d_eff
            #hide
            u_n = u_b + p_u*a_n
            #show
            s_t,uit = u_n/n_sw', tangentieel, op de buitenste omtrek'
            UC_st,uit = s_t,uit/(2*d_eff)', 9.4.3(1)'
            #hide
            s_t,max = s_t,uit
            #show
        #end if
        A_sw,min = 0.08*sqrt(f_ck)/500*s_r*s_t,max/(1.5*sin(α) + cos(α)) to mm^2', (9.11), per staaf<span class="alleen-scherm">, met de grootste s<sub>t</sub> van de omtrekken</span>'
        UC_min = A_sw,min/(pi*d_sw^2/4)
        #hide
        UC_w = max(UC_cs; UC_uit; UC_n; UC_sr; UC_a; UC_st; UC_st,uit; UC_min)
        #show
    #end if
#end if

#hide
UC_max = max(UC_w; UC_vRd,max)
#show
#if ok_sw ≡ 0
'<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de plaat is niet getoetst</b>: de ponswapening is niet volledig ingevuld.</span>
#else
UC_max', grootste UC'
#if UC_max ≤ 1.0
'<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de plaat voldoet</b></span>
#else if UC_pons > 1 and ponswap ≡ 0 and UC_vRd,max ≤ 1
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de plaat voldoet niet</b>: ponswapening nodig.</span>
#else
'<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de plaat voldoet niet</b></span>
#end if
#end if
#end if
#end if
`;
