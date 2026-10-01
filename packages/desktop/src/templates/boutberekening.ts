/**
 * Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4.
 *
 * BOUWSTEEN: dit blad levert F_v,Rd, F_b,Rd, F_t,Rd en B_p,Rd voor één bout.
 * De momentverbinding, dwarskrachtverbinding en schoorverbinding hangen
 * daaraan; de formules staan daarom bewust op zichzelf, zonder aannames
 * over de verbinding waarin de bout zit.
 *
 * Gecalibreerd op zes referentieberekeningen (document1C t/m 6C), basis
 * S235 · 8.8 · M16 · draad in het afschuifvlak · eindbout · t 20 · e₁ 30 ·
 * p₁ 80 · e₂ 25 · p₂ 60 → F_t,Rd 90,4 · F_v,Rd 60,3 · F_b,Rd 112,1 kN.
 * Varianten: schacht in het afschuifvlak (F_v,Rd 77,2 — met A i.p.v. A_s) ·
 * binnenste bout (α_d = p₁/3d₀ − ¼ = 1,231 → α_b 1,00 → F_b,Rd 201,7) ·
 * randbout (identiek aan de eindbout) · enkele bout (k₁ zonder de p₂-tak) ·
 * e₁ 60 met e₂ 50 (k₁ op de bovengrens 2,5 én α_b op 1,00 → F_b,Rd 230,4).
 * F_t,Rd, F_v,Rd en F_b,Rd komen in alle zes exact overeen. Niet tegen een
 * referentie getoetst: de klassen met α_v = 0,5, andere staalsoorten en
 * diameters, §3.6.1(10) en de eenheidschecks — de referentie kent geen
 * krachtinvoer.
 *
 * AFWIJKING — B_p,Rd. de referentie-uitwerking vult voor d_m de sleutelwijdte over de platte
 * kanten in (M16 → 24,0 mm). §3.6.1(3) vraagt het gemiddelde van de maat over
 * de platte kanten en die over de hoeken, dus 25,4 mm voor M16. de referentie-uitwerking komt
 * daardoor 5,5 % lager uit (260,6 tegen 275,5 kN) — veilig, maar niet
 * economisch. Zie docs/afwijkingen-referentie.
 *
 * k₁ — tabel 3.4 met het correctieblad. Twee onafhankelijke assen: eind- of
 * binnenste bout in de krachtsrichting (bepaalt α_d) en rand- of binnenste
 * bout loodrecht daarop (bepaalt k₁). Een randbout neemt het kleinste van de
 * e₂-tak, de p₂-tak en 2,5; staat er loodrecht op de kracht geen tweede bout
 * (p₂ = 0 of niet ingevuld), dan vervalt de p₂-tak. Een binnenste bout neemt
 * alleen de p₂-tak.
 *
 * Tabel 3.3: onder een minimum is het oordeel altijd "voldoet niet"; een steek
 * boven het maximum is alleen een signaal, want de voetnoot bij de maxima
 * beperkt ze tot gedrukte en aan weer blootgestelde delen.
 *
 * De NB bij 3.1.1(3) sluit de boutklassen 4.8 en 5.8 uit. Ze staan niet in
 * de keuzelijst; een opgeslagen blad met zo'n klasse keurt af. f_u van
 * de plaat volgt tabel 3.1 van NEN-EN 1993-1-1 naar t (t ≤ 40 mm of
 * 40 < t ≤ 80 mm). Daarboven geeft tabel 3.1 geen waarde; f_u komt dan uit de
 * productnorm (NB bij 3.2.1(1)) en het blad keurt af.
 *
 * AFWIJKING — binnenste bout loodrecht op de kracht. de referentie-uitwerking
 * trekt de twee assen samen tot één keuzelijst en neemt voor k₁ altijd het
 * minimum van beide takken. Voor een randbout is dat precies de tabel; alleen
 * bij een binnenste bout loodrecht op de kracht rekent zij lager (veilig).
 *
 * §3.6.1(10) — de begrenzing F_b,Rd ≤ 1,5·f_u·d·t/γ_M2 bij een enkele overlap
 * met één boutrij zit erin als aparte keuze (overlaptype). Alle zes
 * referentiebladen hebben twee boutrijen, dus die stand blijft ongetoetst; op
 * de basisinvoer zou de grens 138,2 kN zijn, ruim boven de 112,1 uit tabel 3.4.
 *
 * QUIRK — de referentie-uitwerking drukt bij B_p,Rd "3,14" af maar rekent met de volle π;
 * met 3,14 zou er 260,4 in plaats van 260,6 kN uitkomen.
 *
 * BOUTGROEP — de keuze "Kracht op de bout" (boutgroep) staat standaard op de
 * kracht op één bout invoeren: dan rekent het blad precies als voorheen. De
 * andere twee keuzes verdelen een kracht V_x,Ed, V_z,Ed en een moment M_Ed in
 * het vlak over een rechthoekig boutpatroon van n_x × n_z bouten met steek p_x
 * en p_z, elastisch met een stijve plaat:
 *   • draaipunt in het zwaartepunt: elke bout krijgt V/n en een kracht
 *     loodrecht op zijn voerstraal r_i vanuit het zwaartepunt, M·r_i/Σr²;
 *   • vast draaipunt (x_d, z_d) ten opzichte van het zwaartepunt, zoals een
 *     oplegnok of pen: het draaipunt neemt de kracht op, de bouten alleen het
 *     moment om het draaipunt, M_D·r_i,D/Σr_D² met M_D = M_Ed − x_d·V_z,Ed +
 *     z_d·V_x,Ed.
 * De grootste boutkracht wordt F_v,Ed van de bestaande toetsen van tabel 3.4.
 * Eén bout kan geen moment opnemen: dan voldoet het blad niet. Voorbeelden
 * met handberekening in scripts/check-boutberekening.mjs.
 *
 * Invoernamen komen exact overeen met BoutDesigner.tsx; dat beeld leest de
 * weerstanden en het oordeel uit dit blad.
 */

export const boutberekening = `"Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4

# 1. Invoer

@select staalsoort "Staalsoort plaatmateriaal"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select boutkwaliteit "Boutkwaliteit"
  4.6 = 46
  5.6 = 56
  6.8 = 68
  8.8 = 88
  10.9 = 109
@end

@select boutdiameter "Boutdiameter"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
  M27 = 27
  M30 = 30
  M36 = 36
@end

@select afschuifvlak "Ligging van het afschuifvlak"
  Afschuifvlak door de draad = 1
  Afschuifvlak door de schacht = 2
@end

@select boutpositie "Positie in de krachtsrichting — bepaalt α_d"
  Eindbout = 1
  Binnenste bout = 2
@end

@select randpositie "Positie loodrecht op de kracht — bepaalt k_1"
  Randbout = 1
  Binnenste bout = 2
@end

@select overlaptype "Verbindingsvorm — §3.6.1(10)"
  Overige gevallen = 1
  Enkele overlap met één boutrij = 2
@end

t_plaat = ?*(mm)', dunste plaatdikte t — ook gebruikt als t_p bij het doorponsen'
e_1 = ?*(mm)', eindafstand in de krachtsrichting e_1'
p_1 = ?*(mm)', steek in de krachtsrichting p_1 — alleen bij een binnenste bout'
e_2 = ?*(mm)', randafstand loodrecht op de kracht e_2'
p_2 = ?*(mm)', steek loodrecht op de kracht p_2 — 0 = geen tweede bout loodrecht op de kracht'

n_v = ?', aantal afschuifvlakken van deze bout'

@select boutgroep "Kracht op de bout"
  Kracht op deze bout invoeren = 0
  Uit een boutgroep onder V en M in het vlak, draaipunt in het zwaartepunt = 1
  Uit een boutgroep onder V en M in het vlak, vast draaipunt = 2
@end

#if boutgroep ≡ 0
    F_v,Ed = ?*(kN)', afschuifkracht op de bout — 0 = geen toetsing'
#else
    n_x = ?', aantal bouten naast elkaar (in x)'
    n_z = ?', aantal bouten boven elkaar (in z)'
    p_x = ?*(mm)', steek in x'
    p_z = ?*(mm)', steek in z'
    V_x,Ed = ?*(kN)', kracht in x op de boutgroep, door het zwaartepunt'
    V_z,Ed = ?*(kN)', kracht in z op de boutgroep, door het zwaartepunt'
    M_Ed = ?*(kN*m)', moment in het vlak om het zwaartepunt, linksom positief'
    #if boutgroep ≡ 2
        x_d = ?*(mm)', draaipunt: x ten opzichte van het zwaartepunt'
        z_d = ?*(mm)', draaipunt: z ten opzichte van het zwaartepunt'
    #else
        #hide
        x_d = 0 mm
        z_d = 0 mm
        #show
    #end if
#end if
F_t,Ed = ?*(kN)', trekkracht op de bout — 0 = geen toetsing'

#if boutgroep ≡ 0
    #hide
    groepfout = 0
    #show
#else
    '<h6>Boutgroep — elastische krachtverdeling in het vlak</h6>
    #if boutgroep ≡ 1
        '<i>Stijve plaat, draaipunt in het zwaartepunt van de bouten: elke bout neemt V/n op en een kracht loodrecht op zijn voerstraal r<sub>i</sub>, evenredig met r<sub>i</sub>: M<sub>Ed</sub>·r<sub>i</sub>/Σr². De bout met de grootste resultante is maatgevend en gaat met die kracht als F<sub>v,Ed</sub> door de toetsen van tabel 3.4.</i><span class="alleen-scherm"></span>
    #else
        '<i>Stijve plaat die draait om een vast punt (een oplegnok, pen of drukpunt) dat de kracht opneemt; de bouten nemen alleen het moment om dat punt op, elk loodrecht op en evenredig met zijn afstand r<sub>i,D</sub> tot het draaipunt: M<sub>D</sub>·r<sub>i,D</sub>/Σr<sub>D</sub>², met M<sub>D</sub> = M<sub>Ed</sub> − x<sub>d</sub>·V<sub>z,Ed</sub> + z<sub>d</sub>·V<sub>x,Ed</sub>. De bout met de grootste kracht gaat als F<sub>v,Ed</sub> door de toetsen van tabel 3.4.</i><span class="alleen-scherm"></span>
    #end if
    #hide
    'Kale getallen: afstanden in mm, krachten in kN, het moment in kNmm.
    nx_ = max(round(n_x); 1)
    nz_ = max(round(n_z); 1)
    n_b = nx_*nz_
    px_ = abs(p_x/(1 mm))
    pz_ = abs(p_z/(1 mm))
    Vx_ = V_x,Ed/(1 kN)
    Vz_ = V_z,Ed/(1 kN)
    M_ = M_Ed/(1 kN*mm)
    xd_ = if(boutgroep ≡ 2; x_d/(1 mm); 0)
    zd_ = if(boutgroep ≡ 2; z_d/(1 mm); 0)
    'Bout (i, k) ligt op x = (i − (n_x + 1)/2)·p_x en z = (k − (n_z + 1)/2)·p_z van het zwaartepunt.
    xb(i) = (i - (nx_ + 1)/2)*px_
    zb(k) = (k - (nz_ + 1)/2)*pz_
    'Σr² om het zwaartepunt: n_z·Σx² + n_x·Σz², met Σx² = p_x²·n_x·(n_x² − 1)/12; om het draaipunt n·(x_d² + z_d²) erbij.
    r2_0 = nz_*px_^2*nx_*(nx_^2 - 1)/12 + nx_*pz_^2*nz_*(nz_^2 - 1)/12
    r2_s = r2_0 + if(boutgroep ≡ 2; n_b*(xd_^2 + zd_^2); 0)
    Md_ = if(boutgroep ≡ 2; M_ - xd_*Vz_ + zd_*Vx_; M_)
    fV = if(boutgroep ≡ 1; 1; 0)
    kM = if(r2_s > 0; Md_/r2_s; 0)
    'Kracht van de plaat op bout (i, k): V/n (alleen bij het zwaartepunt) plus kM·(−(z − z_d), x − x_d).
    Fx(i; k) = fV*Vx_/n_b - kM*(zb(k) - zd_)
    Fz(i; k) = fV*Vz_/n_b + kM*(xb(i) - xd_)
    Fb(i; k) = sqrt(Fx(i; k)^2 + Fz(i; k)^2)
    F_gr = 0
    i_m = 1
    k_m = 1
    #for i = 1 : nx_
        #for k = 1 : nz_
            i_m = if(Fb(i; k) > F_gr*(1 + 10^-12) + 10^-12; i; i_m)
            k_m = if(Fb(i; k) > F_gr*(1 + 10^-12) + 10^-12; k; k_m)
            F_gr = max(F_gr; Fb(i; k))
        #loop
    #loop
    'Eén bout (of alle bouten in het draaipunt) kan geen moment opnemen.
    groepfout = bool(r2_s ≤ 0)*bool(abs(Md_) > 10^-9)
    'Kracht op het draaipunt: V minus de som van de boutkrachten.
    RDx = Vx_ - (1 - fV)*(n_b*kM*zd_)
    RDz = Vz_ - (1 - fV)*(-n_b*kM*xd_)
    R_d = sqrt(RDx^2 + RDz^2)*kN
    #show
    '<table class="alleen-scherm" style="border-collapse:collapse; font-size:12px">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="text-align:left; padding:1px 8px 1px 0">Bout</th><th style="text-align:right; padding:1px 8px">x [mm]</th><th style="text-align:right; padding:1px 8px">z [mm]</th><th style="text-align:right; padding:1px 8px">F<sub>x</sub> [kN]</th><th style="text-align:right; padding:1px 8px">F<sub>z</sub> [kN]</th><th style="text-align:right; padding:1px 8px">F [kN]</th></tr>
    #for i = 1 : nx_
        #for k = 1 : nz_
            '<tr style="border-bottom:1px solid #e5e7eb;'if(i ≡ i_m and k ≡ k_m; " font-weight:700; color:#b45309;"; "")'"><td style="padding:0 8px 0 0">('i'; 'k')</td><td style="text-align:right; padding:0 8px">'round(xb(i); 1)'</td><td style="text-align:right; padding:0 8px">'round(zb(k); 1)'</td><td style="text-align:right; padding:0 8px">'round(Fx(i; k); 2)'</td><td style="text-align:right; padding:0 8px">'round(Fz(i; k); 2)'</td><td style="text-align:right; padding:0 8px">'round(Fb(i; k); 2)'</td></tr>
        #loop
    #loop
    '</table>
    #hide
    'Tekening: het patroon over ten hoogste 180 × 110 px, pijlen tot 34 px voor de grootste kracht.
    bw = max((nx_ - 1)*px_; 2*abs(xd_); 1)
    bh = max((nz_ - 1)*pz_; 2*abs(zd_); 1)
    sc = min(180/bw; 110/bh)
    gX(x) = 150 + sc*x
    gY(z) = 90 - sc*z
    sF = 34/max(F_gr; 10^-9)
    #show
    '<svg viewbox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-width:420px; max-height:200px;">
    '<line x1="'gX(0) - 7'" y1="'gY(0)'" x2="'gX(0) + 7'" y2="'gY(0)'" style="stroke:#6b7280; stroke-width:1"/><line x1="'gX(0)'" y1="'gY(0) - 7'" x2="'gX(0)'" y2="'gY(0) + 7'" style="stroke:#6b7280; stroke-width:1"/>
    #if boutgroep ≡ 2
        '<circle cx="'gX(xd_)'" cy="'gY(zd_)'" r="5" style="fill:#ffffff; stroke:#1e40af; stroke-width:1.6"/><text x="'gX(xd_) + 7'" y="'gY(zd_) + 12'" style="fill:#1e40af">D</text>
    #end if
    #for i = 1 : nx_
        #for k = 1 : nz_
            '<circle cx="'gX(xb(i))'" cy="'gY(zb(k))'" r="4.5" style="fill:'if(i ≡ i_m and k ≡ k_m; "#fbbf24"; "#e5e7eb")'; stroke:#374151; stroke-width:1"/>
            '<line x1="'gX(xb(i))'" y1="'gY(zb(k))'" x2="'gX(xb(i)) + sF*Fx(i; k)'" y2="'gY(zb(k)) - sF*Fz(i; k)'" style="stroke:#dc2626; stroke-width:1.6"/>
            '<circle cx="'gX(xb(i)) + sF*Fx(i; k)'" cy="'gY(zb(k)) - sF*Fz(i; k)'" r="1.8" style="fill:#dc2626"/>
        #loop
    #loop
    '</svg>'
    '<span class="alleen-scherm">Kruis: zwaartepunt van de bouten; rood: de kracht van de plaat op elke bout; geel: de maatgevende bout'if(boutgroep ≡ 2; "; D: het draaipunt"; "")'.</span><span class="alleen-scherm"></span>
    #if groepfout ≡ 1
        '<b style="color:#b91c1c">De bouten liggen alle in één punt'if(boutgroep ≡ 2; " (het draaipunt)"; "")': ze kunnen het moment niet opnemen.</b>
    #end if
    n_b', aantal bouten'
    #hide
    Σr_2 = r2_s*mm^2
    #show
    #if boutgroep ≡ 2
        Σr_2'<span class="alleen-scherm">, om het draaipunt</span>'
    #else
        Σr_2'<span class="alleen-scherm">, om het zwaartepunt</span>'
    #end if
    #if boutgroep ≡ 2
        M_D = Md_*kN*mm to kN*m', moment om het draaipunt'
        R_d', kracht op het draaipunt'
    #end if
    'Maatgevende bout ('i_m'; 'k_m'):
    F_v,Ed = F_gr*kN', gaat als afschuifkracht door de toetsen'
    '<i>Kies bij de positie in de krachtsrichting en loodrecht daarop die van de maatgevende bout, meestal een hoekbout (eindbout en randbout). Staat zijn kracht schuin op de randen, neem dan voor e<sub>1</sub> en e<sub>2</sub> de kleinste afstanden: aan de veilige kant.</i><span class="alleen-scherm"></span>
#end if

# 2. Materiaal- en boutgegevens

#hide
'Tabellen op de kale keuzewaarde; hieronder pas van eenheden voorzien.
fub_ = if(boutkwaliteit ≡ 46; 400; if(boutkwaliteit ≡ 48; 400; if(boutkwaliteit ≡ 56; 500; if(boutkwaliteit ≡ 58; 500; if(boutkwaliteit ≡ 68; 600; if(boutkwaliteit ≡ 88; 800; 1000))))))
fyb_ = if(boutkwaliteit ≡ 46; 240; if(boutkwaliteit ≡ 48; 320; if(boutkwaliteit ≡ 56; 300; if(boutkwaliteit ≡ 58; 400; if(boutkwaliteit ≡ 68; 480; if(boutkwaliteit ≡ 88; 640; 900))))))
'α_v = 0,6 voor 4.6, 5.6 en 8.8; 0,5 voor 4.8, 5.8, 6.8 en 10.9 (tabel 3.4).
avd_ = if(boutkwaliteit ≡ 46; 0.6; if(boutkwaliteit ≡ 56; 0.6; if(boutkwaliteit ≡ 88; 0.6; 0.5)))
'4.8 en 5.8 staan niet meer in de keuzelijst (NB bij 3.1.1(3)); een opgeslagen blad met die klasse keurt af.
toegelaten = if(boutkwaliteit ≡ 48 or boutkwaliteit ≡ 58; 0; 1)
'Staalsoort: f_u uit tabel 3.1 van NEN-EN 1993-1-1 naar de plaatdikte; de NB laat die tabel toe (3.2.1(1)).
fu_ = if(t_plaat ≤ 40 mm; if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490)); if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 410; 470)))
'Gatdiameter bij normale gatspeling (EN 1090-2): +1 mm t/m M14, +2 mm t/m M24, +3 mm daarboven.
d0_ = if(boutdiameter ≡ 12; 13; if(boutdiameter ≡ 16; 18; if(boutdiameter ≡ 20; 22; if(boutdiameter ≡ 24; 26; if(boutdiameter ≡ 27; 30; if(boutdiameter ≡ 30; 33; 39))))))
'Spanningsoppervlak van de draad volgens ISO 898-1.
As_ = if(boutdiameter ≡ 12; 84.3; if(boutdiameter ≡ 16; 157; if(boutdiameter ≡ 20; 245; if(boutdiameter ≡ 24; 353; if(boutdiameter ≡ 27; 459; if(boutdiameter ≡ 30; 561; 817))))))
'Sleutelwijdte s over de platte kanten en maat e over de hoeken (ISO 4014/4032).
sw_ = if(boutdiameter ≡ 12; 18; if(boutdiameter ≡ 16; 24; if(boutdiameter ≡ 20; 30; if(boutdiameter ≡ 24; 36; if(boutdiameter ≡ 27; 41; if(boutdiameter ≡ 30; 46; 55))))))
ew_ = if(boutdiameter ≡ 12; 20.03; if(boutdiameter ≡ 16; 26.75; if(boutdiameter ≡ 20; 32.95; if(boutdiameter ≡ 24; 39.55; if(boutdiameter ≡ 27; 45.20; if(boutdiameter ≡ 30; 50.85; 60.79))))))
γ_M2 = 1.25
k_2 = 0.9
d = boutdiameter*mm
d_0 = d0_*mm
A_s = As_*mm^2
A = pi*d^2/4
f_ub = fub_*N/mm^2
f_yb = fyb_*N/mm^2
f_u = fu_*N/mm^2
#show
'Bout M'boutdiameter': d<sub>0</sub> = 'd_0' mm (normale gatspeling), A<sub>s</sub> = 'A_s' mm², A = 'A' mm², f<sub>ub</sub> = 'f_ub' N/mm² (tabel 3.1). Plaat: f<sub>u</sub> = 'f_u' N/mm² (NEN-EN 1993-1-1 tabel 3.1, bij t = 't_plaat' mm). γ<sub>M2</sub> = 'γ_M2'.
#if toegelaten ≡ 0
    '<b style="color:#b91c1c">Boutklasse 'boutkwaliteit/10' is niet toegelaten (NB bij 3.1.1(3)).</b>
#end if
#if t_plaat > 80 mm
    '<b style="color:#b91c1c">t = 't_plaat' mm > 80 mm: tabel 3.1 van NEN-EN 1993-1-1 geeft geen f<sub>u</sub>; die volgt dan uit de productnorm (NB bij 3.2.1(1)) en valt buiten dit blad.</b>
#end if

# 3. Trekweerstand — tabel 3.4

F_t,Rd = k_2*f_ub*A_s/γ_M2 to kN', altijd met A_s; k_2 = 0,9 voor een gewone bout'

# 4. Afschuifweerstand — tabel 3.4

#hide
α_v = if(afschuifvlak ≡ 1; avd_; 0.6)
#show
#if afschuifvlak ≡ 1
    A_v = A_s', afschuifvlak door de draad'
#else
    A_v = A', afschuifvlak door de schacht'
#end if
α_v', tabel 3.4'
F_v,Rd = α_v*f_ub*A_v/γ_M2 to kN', per afschuifvlak'
F_v,Rd,tot = n_v*F_v,Rd', over alle afschuifvlakken van deze bout'

# 5. Stuikweerstand — tabel 3.4

#hide
'Randbout zonder tweede bout loodrecht op de kracht (p_2 = 0 of niet ingevuld): de p_2-tak vervalt.
enkel = if(randpositie ≡ 1; if(p_2 > 0 mm; 0; 1); 0)
#show
#if randpositie ≡ 2
    k_1,bin = 1.4*p_2/d_0 - 1.7', binnenste bout loodrecht op de kracht'
    k_1 = min(k_1,bin; 2.5)
#else if enkel ≡ 1
    k_1,rand = 2.8*e_2/d_0 - 1.7', randbout zonder tweede bout loodrecht op de kracht'
    k_1 = min(k_1,rand; 2.5)
#else
    k_1,rand = 2.8*e_2/d_0 - 1.7', randbout'
    k_1,bin = 1.4*p_2/d_0 - 1.7', tak met de steek p_2 — geldt ook voor een randbout'
    k_1 = min(min(k_1,rand; k_1,bin); 2.5)
#end if
#if boutpositie ≡ 1
    α_d = e_1/(3*d_0)', eindbout'
#else
    α_d = p_1/(3*d_0) - 0.25', binnenste bout in de krachtsrichting'
#end if
α_b = min(min(α_d; f_ub/f_u); 1.0)
F_b,Rd,tab = k_1*α_b*f_u*d*t_plaat/γ_M2 to kN

#hide
F_b,Rd,cap = 1.5*f_u*d*t_plaat/γ_M2 to kN
F_b,Rd,nb = if(overlaptype ≡ 2; min(F_b,Rd,tab; F_b,Rd,cap); F_b,Rd,tab)
'Referentie-uitwerking (register punt 7): k_1 altijd als kleinste van beide takken.
k_1,ref = min(min(2.8*e_2/d_0 - 1.7; if(enkel ≡ 1; 2.5; 1.4*p_2/d_0 - 1.7)); 2.5)
F_b,Rd,tab,ref = k_1,ref*α_b*f_u*d*t_plaat/γ_M2 to kN
F_b,Rd,ref = if(overlaptype ≡ 2; min(F_b,Rd,tab,ref; F_b,Rd,cap); F_b,Rd,tab,ref)
F_b,Rd = if(rekenwijze ≡ 1; F_b,Rd,ref; F_b,Rd,nb)
'Eenheidloos, voor de #if: verschilt de gehanteerde waarde van de norm-tak?
ΔF_b = abs(F_b,Rd - F_b,Rd,nb)/(1*kN)
#show
#if overlaptype ≡ 2
    F_b,Rd,cap', 1,5·f_u·d·t/γ_M2 — §3.6.1(10), enkele overlap met één boutrij; sluitringen onder kop en moer vereist'
#end if
#if ΔF_b > 0.05
    k_1,ref', rekenwijze referentie-uitwerking: kleinste van de e_2- en de p_2-tak, ook bij een binnenste bout loodrecht op de kracht'
#end if
F_b,Rd', gehanteerde stuikweerstand'

# 6. Ponsweerstand — §3.6.1(3)

#hide
t_p = t_plaat
d_m = (sw_ + ew_)/2*mm
B_p,Rd,nb = 0.6*pi*d_m*t_p*f_u/γ_M2 to kN
'Referentie-uitwerking (register punt 6): d_m is de sleutelwijdte.
d_m,ref = sw_*mm
B_p,Rd,ref = 0.6*pi*d_m,ref*t_p*f_u/γ_M2 to kN
B_p,Rd = if(rekenwijze ≡ 1; B_p,Rd,ref; B_p,Rd,nb)
#show
'B<sub>p,Rd</sub> = 0,6·π·d<sub>m</sub>·t<sub>p</sub>·f<sub>u</sub>/γ<sub>M2</sub>, met t<sub>p</sub> = t en d<sub>m</sub> = 'd_m' mm<span class="alleen-scherm"> (gemiddelde van sleutelwijdte en maat over de hoeken)</span>.
#if rekenwijze ≡ 1
    'Rekenwijze referentie-uitwerking: d<sub>m</sub> = sleutelwijdte = 'd_m,ref' mm. Dat geeft 'B_p,Rd' kN in plaats van 'B_p,Rd,nb' kN.
#end if
B_p,Rd', doorponsen van de plaat onder kop of moer'

# 7. Afstanden — tabel 3.3

#hide
e1min = 1.2*d_0
e2min = 1.2*d_0
p1min = 2.2*d_0
p2min = 2.4*d_0
pmax = min(14*t_plaat; 200 mm)
'p_1 en p_2 tellen mee zodra ze in de weerstand zitten. Eenheidloos, anders vergelijkt de #if een lengte met een kaal getal.
'Onder een minimum geldt tabel 3.4 niet; het maximum alleen bij gedrukte of aan weer blootgestelde delen, dus als signaal.
tekort = (if(e_1 < e1min; 1; 0) + if(e_2 < e2min; 1; 0) + if(boutpositie ≡ 2; if(p_1 < p1min; 1; 0); 0) + if(enkel ≡ 0; if(p_2 < p2min; 1; 0); 0))
teveel = (if(boutpositie ≡ 2; if(p_1 > pmax; 1; 0); 0) + if(enkel ≡ 0; if(p_2 > pmax; 1; 0); 0))
#show

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Afstand</th><th style="text-align:right; padding-right:14px">aanwezig [mm]</th><th style="text-align:right; padding-right:14px">minimum [mm]</th><th style="text-align:right">maximum [mm]</th></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>1</sub></td><td style="text-align:right; padding-right:14px">'e_1'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e1min'</td><td style="text-align:right">—</td></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>2</sub></td><td style="text-align:right; padding-right:14px">'e_2'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e2min'</td><td style="text-align:right">—</td></tr>
#if boutpositie ≡ 2
    '<tr><td style="padding:2px 12px 2px 0">p<sub>1</sub></td><td style="text-align:right; padding-right:14px">'p_1'</td><td style="text-align:right; padding-right:14px">2,2 d<sub>0</sub> = 'p1min'</td><td style="text-align:right">'pmax'</td></tr>
#end if
#if enkel ≡ 0
    '<tr><td style="padding:2px 12px 2px 0">p<sub>2</sub></td><td style="text-align:right; padding-right:14px">'p_2'</td><td style="text-align:right; padding-right:14px">2,4 d<sub>0</sub> = 'p2min'</td><td style="text-align:right">'pmax'</td></tr>
#end if
'</table>

#if tekort + teveel ≡ 0
    '<span style="color: green">Alle afstanden die in de weerstand meetellen liggen binnen tabel 3.3.</span>
#else if tekort ≡ 0
    '<span style="color: #b45309">'teveel' steek(en) boven het maximum van tabel 3.3; dat maximum geldt alleen bij gedrukte en bij aan weer blootgestelde delen.</span>
#else
    '<span style="color: red">'tekort' afstand(en) onder het minimum van tabel 3.3 — de weerstanden hierboven gelden dan niet.</span>
#end if

# 8. Toetsing van de bout

#hide
'Eenheidloos, zodat de #if met een kaal getal kan vergelijken.
belast = (F_v,Ed + F_t,Ed)/(1*kN)
#show

#if belast ≤ 0
    'Geen krachten ingevoerd: alleen de weerstanden.
#else
    UC_v = F_v,Ed/F_v,Rd,tot', afschuiving van de bout'
    UC_b = F_v,Ed/F_b,Rd', stuik in de plaat'
    UC_t = F_t,Ed/F_t,Rd', trek in de bout'
    UC_p = F_t,Ed/B_p,Rd', doorponsen van de plaat'
    UC_vt = F_v,Ed/F_v,Rd,tot + F_t,Ed/(1.4*F_t,Rd)', trek en afschuiving samen, tabel 3.4'
    #hide
    UC_max = max(UC_v; UC_b; UC_t; UC_p; UC_vt)
    'Een stuikweerstand ≤ 0 (k_1 of α_d ≤ 0) of een afstand onder het minimum van tabel 3.3 is nooit een voldoende.
    stuikfout = if(F_v,Ed > 0 kN; if(F_b,Rd > 0 kN; 0; 1); 0)
    maatfout = if(tekort ≡ 0; 0; 1)
    #show
    #if toegelaten ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar boutklasse 'boutkwaliteit/10' is niet toegelaten (NB bij 3.1.1(3)) → <b>voldoet niet</b></span>
    #else if t_plaat > 80 mm
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar t > 80 mm ligt buiten tabel 3.1 van NEN-EN 1993-1-1 (f<sub>u</sub> uit de productnorm, NB bij 3.2.1(1)) → <b>voldoet niet</b></span>
    #else if stuikfout ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar F<sub>b,Rd</sub> ≤ 0: k<sub>1</sub> of α<sub>d</sub> is niet positief (een rand- of steekafstand is te klein) → <b>voldoet niet</b></span>
    #else if maatfout ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar 'tekort' afstand(en) onder het minimum van tabel 3.3 → <b>voldoet niet</b></span>
    #else if groepfout ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de bouten liggen in één punt en kunnen het moment niet opnemen → <b>voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

# 9. Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Weerstand</th><th style="text-align:right">Waarde</th></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>t,Rd</sub> — trek in de bout</td><td style="text-align:right">'F_t,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>v,Rd</sub> — afschuiving per afschuifvlak</td><td style="text-align:right">'F_v,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>v,Rd</sub> — over alle afschuifvlakken (n<sub>v</sub> = 'n_v')</td><td style="text-align:right">'F_v,Rd,tot' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>b,Rd</sub> — stuik in de plaat</td><td style="text-align:right">'F_b,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">B<sub>p,Rd</sub> — doorponsen</td><td style="text-align:right">'B_p,Rd' kN</td></tr>
'</table>

'<hr/>
'<i class="ook-afdruk">Aandachtspunten:
'<ul>
'<li class="alleen-scherm"><b>§3.6.1(10)</b> geldt alleen bij een enkele overlap met één boutrij (keuze Verbindingsvorm); dan zijn sluitringen onder kop én moer vereist.</li>
'<li>Horen bij de verbinding en staan hier niet in: lange verbindingen (§3.8), vulplaten (§3.6.1(12)), blokschuif (§3.10.2) en hefboomwerking (§3.11). Voer F<sub>t,Ed</sub> in inclusief hefboomkracht.</li>
'<li>F<sub>v,Rd</sub> geldt per afschuifvlak voor een stempelverbinding (categorie A); slipvaste verbindingen (§3.9) staan hier niet in.</li>
'<li>t is de <b>dunste</b> plaat; voor het doorponsen is t<sub>p</sub> hier gelijk aan t genomen.</li>
'<li>Normale gatspeling. Overmaatse gaten en slobgaten (§3.6.1(14)) en de maxima voor e<sub>1</sub> en e<sub>2</sub> bij blootstelling aan weer (tabel 3.3) zijn niet meegenomen.</li>
'</ul></i>
`;
