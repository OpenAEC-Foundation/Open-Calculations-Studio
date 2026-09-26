/**
 * Prof. D. Vandepitte — Berekening van Constructies, Boekdeel I
 * Ifc-Calc rekenmodule templates
 *
 * Formules en verwijzingen conform het boek:
 * "Berekening van Constructies" door Prof. D. Vandepitte
 * Boekdeel I — Universiteit Gent
 *
 * De theorie komt uit het boek; waar een blad een oordeel geeft, toetst het
 * tegen de Eurocode en niet tegen een vaste toelaatbare spanning:
 * - schuifspanning: staal f_y/(√3·γ_M0) (NEN-EN 1993-1-1 6.2.6), hout
 *   k_cr·f_v,d (NEN-EN 1995-1-1 6.1.7); voor andere materialen alleen τ;
 * - knik: staal met χ (NEN-EN 1993-1-1 6.3.1.2) en hout met k_c en E_0,05
 *   (NEN-EN 1995-1-1 6.3.2); de Eulerlast is alleen de theoretische grens;
 * - Mohr: veld getoetst aan L/250, overstek aan 2a/250 (dubbele lengte als
 *   overspanning); a_1 en a_C horen bij hetzelfde lastgeval;
 * - eigenfrequentie: de randvoorwaarde bepaalt c_1; geen eigen oordeel, alleen
 *   de 8 Hz-grens van NEN-EN 1995-1-1 7.3.3 als signaal.
 * Materiaalwaarden hout gelijk aan eurocode5.ts (EN 338, EN 14080, tabel 3.1
 * en tabel 2.3 met NB). scripts/check-vandepitte-toetsen.mjs rekent na.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schuifspanningen — Formule van Jourawsky (Hoofdstuk 2, art. 2.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 2 — Schuifspanningen door dwarskrachten */
export const vandepitteSchuifspanning = `"Schuifspanning door dwarskracht — Vandepitte, Deel I, Hfd. 2, art. 2.4

'<i>Formule van Jourawsky: τ = V·S<sub>z</sub>/(I<sub>z</sub>·t) (Hfd. 2, formule 4).</i>

# 1. Doorsnede

@select profieltype "Doorsnede"
Rechthoekig b x h = 1
I-profiel of andere doorsnede (I_z, S_z,max en t invullen) = 2
Cirkelvormig, diameter D = 3
@end

#if profieltype ≡ 1
    b = ?*(mm)
    h = ?*(mm)
    I_z = b*h^3/12 to mm^4
    S_zmax = b*h^2/8 to mm^3', ter hoogte van de neutrale lijn'
    t = b
#else if profieltype ≡ 3
    D = ?*(mm)
    A = π*D^2/4 to mm^2
#else
    I_z = ?*(mm^4)
    S_zmax = ?*(mm^3)', statisch moment ter hoogte van de neutrale lijn'
    t = ?*(mm)', wanddikte ter hoogte van de neutrale lijn'
#end if

# 2. Dwarskracht (rekenwaarde)

@select belastingtype "Belasting"
Gelijkmatig verdeeld (q) = 1
Puntlast in het midden (F) = 2
@end

L = ?*(m)', overspanning'
#if belastingtype ≡ 1
    q = ?*(kN/m)', rekenwaarde'
    V_Ed = q*L/2 to kN
#else
    F = ?*(kN)', rekenwaarde'
    V_Ed = F/2 to kN
#end if

# 3. Schuifspanning

#if profieltype ≡ 3
    τ_max = 4/3*V_Ed/A to N/mm^2', λ = 4/3 (Hfd. 2, art. 1.1)'
#else
    τ_max = V_Ed*S_zmax/(I_z*t) to N/mm^2', ter hoogte van de neutrale lijn'
#end if

# 4. Toetsing

@select materiaal "Materiaal"
Staal S235 = 1
Staal S275 = 2
Staal S355 = 3
Hout C24 = 4
Hout GL24h = 5
Ander materiaal (geen toets) = 0
@end

#if materiaal ≥ 1 and materiaal ≤ 3
    #hide
    f_y = if(materiaal ≡ 1; 235; if(materiaal ≡ 2; 275; 355))*(N/mm^2)
    #show
    f_y', t ≤ 40 mm (tabel 3.1)'
    γ_M0 = 1.0', NB'
    τ_Rd = f_y/(sqrt(3)*γ_M0) to N/mm^2', NEN-EN 1993-1-1 (6.19)'
    UC_max = τ_max/τ_Rd
#else if materiaal ≥ 4
    @select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
    Blijvend = 1
    Lang = 2
    Middellang = 3
    Kort = 4
    Zeer kort = 5
    @end
    @select klimaatklasse "Klimaatklasse (2.3.1.3)"
    Klasse 1 of 2 = 1
    Klasse 3 = 3
    @end
    #hide
    kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
    k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
    f_vk = if(materiaal ≡ 4; 4.0; 3.5)*(N/mm^2)
    γ_M = if(materiaal ≡ 4; 1.3; 1.25)
    #show
    'f<sub>v,k</sub> = 'f_vk' N/mm² (EN 338 / EN 14080), k<sub>mod</sub> = 'k_mod' (tabel 3.1), γ<sub>M</sub> = 'γ_M' (tabel 2.3, NB).
    f_vd = k_mod*f_vk/γ_M to N/mm^2', NEN-EN 1995-1-1 (2.14)'
    k_cr = 0.67', scheuren (6.1.7(2))'
    τ_d = τ_max/k_cr to N/mm^2', met b_ef = k_cr·b (6.13a)'
    UC_max = τ_d/f_vd
#else
    '<i>Geen materiaaltoets: alleen de schuifspanning.</i>
#end if
#if materiaal ≥ 1
    #if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Doorbuiging inclusief dwarskrachten (Hoofdstuk 2, art. 1.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 2 — Doorbuiging met effect van dwarskrachten */
export const vandepitteDoorbuiging = `"Doorbuiging met dwarskrachtaandeel — Vandepitte, Deel I, Hfd. 2, art. 1.2

'<i>v = v<sub>2</sub> + v<sub>1</sub>: door buiging (M/EI) en door dwarskracht (λ·V/GA), Hfd. 2, formule 2.</i>

# 1. Materiaal

@select materiaal "Materiaal"
Staal S235 (E=210000, G=81000) = 1
Staal S355 (E=210000, G=81000) = 2
Hout C24 (E=11000, G=690) = 3
Beton C30/37 (E=33000, G=13750) = 4
Aluminium (E=70000, G=26000) = 5
@end

#hide
materialen = [1; 2; 3; 4; 5 | 210000; 210000; 11000; 33000; 70000 | 81000; 81000; 690; 13750; 26000]
E = hlookup(materialen; materiaal; 1; 2)*(N/mm^2)
G = hlookup(materialen; materiaal; 1; 3)*(N/mm^2)
#show
'E = 'E' N/mm², G = 'G' N/mm².

# 2. Doorsnede

@select doorsnedevorm "Doorsnede"
Rechthoekig b x h = 1
I-profiel (A, A_lijf en I invullen) = 2
@end

#if doorsnedevorm ≡ 1
    b = ?*(mm)
    h = ?*(mm)
    A = b*h to mm^2
    I = b*h^3/12 to mm^4
    λ = 1.2', rechthoek (Hfd. 2, art. 1.1)'
#else
    A = ?*(mm^2)
    A_lijf = ?*(mm^2)', lijf: (h − 2·t_f)·t_w'
    I = ?*(mm^4)
    λ = A/A_lijf', I-profiel, bij benadering (Hfd. 2, art. 1.1)'
#end if

# 3. Belasting (BGT)

@select belastinggeval "Belastinggeval"
Gelijkmatig verdeelde belasting q = 1
Puntlast F in het midden = 2
@end

L = ?*(m)', overspanning'
#if belastinggeval ≡ 1
    q = ?*(kN/m)
    v_2 = 5*q*L^4/(384*E*I) to mm', door buiging'
    v_1 = λ*q*L^2/(8*G*A) to mm', door dwarskracht (Hfd. 2, formule 3)'
#else
    F = ?*(kN)
    v_2 = F*L^3/(48*E*I) to mm', door buiging'
    v_1 = λ*F*L/(4*G*A) to mm', door dwarskracht (Hfd. 2, art. 1.2.2)'
#end if

# 4. Totale doorbuiging

v_totaal = v_2 + v_1 to mm
p_V = v_1/v_totaal*100', aandeel van de dwarskracht in %'
#if p_V < 3
    '<i>Het aandeel van de dwarskracht is kleiner dan 3 %.</i>
#end if
v_toel = L/250 to mm
UC_max = v_totaal/v_toel
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: v ≤ L/250</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: v > L/250</span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Knikken van drukstaven — Euler (Hoofdstuk 5, art. 5.2-5.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 5 — Knikken van drukstaven (Euler) */
export const vandepitteKnikken = `"Knikken van drukstaven — Vandepitte, Deel I, Hfd. 5; toets NEN-EN 1993-1-1 §6.3.1 of NEN-EN 1995-1-1 §6.3.2

# 1. Materiaal

@select materiaal "Materiaal"
Staal S235 = 1
Staal S275 = 2
Staal S355 = 3
Hout C24 = 4
Hout GL24h = 5
@end

#if materiaal ≤ 3
    @select knikkromme "Knikkromme (tabel 6.2)"
    c -- massieve doorsnede, koudgevormde buis (alpha = 0.49) = 0.49
    a -- warmgewalste buis (alpha = 0.21) = 0.21
    b (alpha = 0.34) = 0.34
    d (alpha = 0.76) = 0.76
    @end
    #hide
    f_y = if(materiaal ≡ 1; 235; if(materiaal ≡ 2; 275; 355))*(N/mm^2)
    α_imp = knikkromme*1
    #show
    f_y', t ≤ 40 mm (tabel 3.1)'
    E = 210000 N/mm^2
    α_imp', imperfectiefactor (tabel 6.1)'
    γ_M1 = 1.0', NB'
#else
    @select belastingduurklasse "Belastingduurklasse (tabel 2.1)"
    Blijvend = 1
    Lang = 2
    Middellang = 3
    Kort = 4
    Zeer kort = 5
    @end
    @select klimaatklasse "Klimaatklasse (2.3.1.3)"
    Klasse 1 of 2 = 1
    Klasse 3 = 3
    @end
    #hide
    kmod_tabel = [1; 2; 3; 4; 5 |0.60; 0.70; 0.80; 0.90; 1.10 |0.50; 0.55; 0.65; 0.70; 0.90]
    k_mod = hlookup(kmod_tabel; belastingduurklasse; 1; if(klimaatklasse ≡ 3; 3; 2))
    f_c0k = if(materiaal ≡ 4; 21; 24)*(N/mm^2)
    E = if(materiaal ≡ 4; 7400; 9600)*(N/mm^2)
    γ_M = if(materiaal ≡ 4; 1.3; 1.25)
    β_c = if(materiaal ≡ 4; 0.2; 0.1)
    #show
    'f<sub>c,0,k</sub> = 'f_c0k' N/mm² en E<sub>0,05</sub> = 'E' N/mm² (EN 338 / EN 14080), k<sub>mod</sub> = 'k_mod' (tabel 3.1), γ<sub>M</sub> = 'γ_M' (tabel 2.3, NB), β<sub>c</sub> = 'β_c' (6.29).
    f_c0d = k_mod*f_c0k/γ_M to N/mm^2
#end if

# 2. Doorsnede

@select doorsnedevorm "Doorsnedevorm"
Rechthoekig b x h = 1
Cirkelvormig, diameter D = 2
Buis D x t = 3
@end

#if doorsnedevorm ≡ 1
    b = ?*(mm)
    h = ?*(mm)
    A = b*h to mm^2
    I_min = min(b*h^3; h*b^3)/12 to mm^4
#else if doorsnedevorm ≡ 2
    D = ?*(mm)
    A = π/4*D^2 to mm^2
    I_min = π/64*D^4 to mm^4
#else
    D = ?*(mm)
    t_w = ?*(mm)', wanddikte'
    d_i = max(D - 2*t_w; 0 mm)', binnendiameter'
    A = π/4*(D^2 - d_i^2) to mm^2
    I_min = π/64*(D^4 - d_i^4) to mm^4
#end if
i_min = sqrt(I_min/A) to mm

# 3. Kniklengte (Hfd. 5, art. 5.4)

@select randvoorwaarden "Randvoorwaarden"
Staaf a: inklemming-vrij (beta_k = 2.0) = 2.0
Staaf b: scharnier-scharnier (beta_k = 1.0) = 1.0
Staaf c: inklemming-inklemming (beta_k = 0.5) = 0.5
Staaf d: inklemming-scharnier (beta_k = 0.699) = 0.699
@end

l = ?*(m)', systeemlengte'
#hide
β_k = randvoorwaarden*1
#show
l_k = β_k*l to mm', kniklengte, β_k = 2; 1; 0,5 of 0,699'
λ = l_k/i_min', slankheid'

# 4. Eulerlast (Hfd. 5, art. 5.2.2.3)

P_E = π^2*E*I_min/l_k^2 to kN', kritieke knikkracht; theoretische bovengrens, geen toets'

# 5. Toetsing

N_Ed = ?*(kN)', drukkracht, rekenwaarde'
#if materiaal ≤ 3
    λ_rel = sqrt(A*f_y/P_E)', (6.50)'
    Φ = 0.5*(1 + α_imp*(λ_rel - 0.2) + λ_rel^2)
    χ = min(1; 1/(Φ + sqrt(Φ^2 - λ_rel^2)))', (6.49)'
    N_bRd = χ*A*f_y/γ_M1 to kN', NEN-EN 1993-1-1 (6.47)'
#else
    λ_rel = λ/π*sqrt(f_c0k/E)', (6.21)'
    k = 0.5*(1 + β_c*(λ_rel - 0.3) + λ_rel^2)', (6.27)'
    k_c = min(1; 1/(k + sqrt(k^2 - λ_rel^2)))', (6.25)'
    N_bRd = k_c*A*f_c0d to kN', NEN-EN 1995-1-1 (6.23)'
#end if
UC_max = N_Ed/N_bRd
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: knik</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: knik</span>
#end if

@svg
<svg width="460" height="380" viewBox="0 0 460 380">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#a3a3a3" stroke-width="0.8"/>
    </pattern>
  </defs>
  <!-- Staaf a: inklemming-vrij -->
  <rect x="30" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="55" y1="340" x2="55" y2="100" stroke="#1e40af" stroke-width="3"/>
  <line x1="45" y1="100" x2="65" y2="100" stroke="#dc2626" stroke-width="2"/>
  <line x1="55" y1="100" x2="55" y2="75" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,55,87)"/>
  <text x="55" y="65" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="55" y="370" text-anchor="middle" font-size="10" fill="#374151">a: l_k=2l</text>
  <!-- Staaf b: scharnier-scharnier -->
  <polygon points="175,340 168,355 182,355" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="175" y1="340" x2="175" y2="100" stroke="#1e40af" stroke-width="3"/>
  <polygon points="175,100 168,85 182,85" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="175" y1="85" x2="175" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,175,72)"/>
  <text x="175" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="175" y="370" text-anchor="middle" font-size="10" fill="#374151">b: l_k=l</text>
  <!-- Staaf c: inklemming-inklemming -->
  <rect x="270" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="295" y1="340" x2="295" y2="100" stroke="#1e40af" stroke-width="3"/>
  <rect x="270" y="90" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="295" y1="90" x2="295" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,295,75)"/>
  <text x="295" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="295" y="370" text-anchor="middle" font-size="10" fill="#374151">c: l_k=l/2</text>
  <!-- Staaf d: inklemming-scharnier -->
  <rect x="390" y="340" width="50" height="10" fill="url(#hatch)" stroke="#374151" stroke-width="1"/>
  <line x1="415" y1="340" x2="415" y2="100" stroke="#1e40af" stroke-width="3"/>
  <polygon points="415,100 408,85 422,85" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="415" y1="85" x2="415" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#arrowDown)" transform="rotate(180,415,72)"/>
  <text x="415" y="50" text-anchor="middle" font-size="11" fill="#dc2626">P</text>
  <text x="415" y="370" text-anchor="middle" font-size="10" fill="#374151">d: l_k=0.7l</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Doorbuiging van liggers — Analogieen van Mohr (Hoofdstuk 1, art. 2.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 1 — Doorbuiging met analogieen van Mohr */
export const vandepitteMohr = `"Doorbuiging ligger met overstek — Vandepitte, Deel I, Hfd. 1, art. 2.1

'<i>Ligger op steunpunten A en B met een overstek B–C; verplaatsingen met de analogieën van Mohr (Hfd. 1, art. 2.1.6). Positief is omlaag.</i>

# 1. Ligger

L = ?*(m)', overspanning A–B'
a = ?*(m)', lengte van het overstek B–C'
E = ?*(N/mm^2)
I = ?*(mm^4)
EI = E*I to kN*m^2

# 2. Belasting (BGT)

@select belastinggeval "Belastinggeval"
Puntlast P op het uiteinde C = 1
Gelijkmatige q op het overstek = 2
Gelijkmatige q op het veld = 3
Gelijkmatige q op veld en overstek = 4
@end

#if belastinggeval ≡ 1
    P = ?*(kN)
    a_1 = -P*a*L^2/(16*EI) to mm', midden van het veld (D); omhoog'
    θ_B = P*a*L/(3*EI)', verdraaiing bij B in rad; bij A is die de helft'
    a_C = P*a^2*(a + L)/(3*EI) to mm', uiteinde C'
#else if belastinggeval ≡ 2
    q = ?*(kN/m)
    a_1 = -q*a^2*L^2/(32*EI) to mm', midden van het veld (D); omhoog'
    θ_B = q*a^2*L/(6*EI)', verdraaiing bij B in rad'
    a_C = q*a^3*(3*a + 4*L)/(24*EI) to mm', uiteinde C'
#else if belastinggeval ≡ 3
    q = ?*(kN/m)
    a_1 = 5*q*L^4/(384*EI) to mm', midden van het veld (D)'
    θ_B = -q*L^3/(24*EI)', verdraaiing bij B in rad; het overstek gaat omhoog'
    a_C = -q*L^3*a/(24*EI) to mm', uiteinde C; omhoog'
#else
    q = ?*(kN/m)
    a_1 = 5*q*L^4/(384*EI) - q*a^2*L^2/(32*EI) to mm', midden van het veld (D)'
    θ_B = q*a^2*L/(6*EI) - q*L^3/(24*EI)', verdraaiing bij B in rad'
    a_C = q*a*(3*a^3 + 4*a^2*L - L^3)/(24*EI) to mm', uiteinde C'
#end if

# 3. Toetsing

v_veld = L/250 to mm', veld'
v_overstek = 2*a/250 to mm', overstek: de dubbele lengte als overspanning'
UC_veld = abs(a_1)/v_veld
UC_overstek = abs(a_C)/v_overstek
UC_max = max(UC_veld; UC_overstek)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: doorbuiging</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: doorbuiging</span>
#end if

@svg
<svg width="600" height="220" viewBox="0 0 600 220">
  <defs>
    <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
    </marker>
  </defs>
  <!-- Balk -->
  <line x1="80" y1="100" x2="520" y2="100" stroke="#1e40af" stroke-width="3"/>
  <!-- Oplegging links (scharnier) A -->
  <polygon points="80,100 65,130 95,130" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="60" y1="133" x2="100" y2="133" stroke="#374151" stroke-width="2"/>
  <text x="80" y="148" text-anchor="middle" font-size="11" fill="#374151">A</text>
  <!-- Oplegging rechts (rol) B -->
  <polygon points="400,100 385,130 415,130" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="392" cy="135" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <circle cx="408" cy="135" r="5" fill="none" stroke="#374151" stroke-width="1.5"/>
  <line x1="382" y1="143" x2="418" y2="143" stroke="#374151" stroke-width="2"/>
  <text x="400" y="158" text-anchor="middle" font-size="11" fill="#374151">B</text>
  <!-- Punt C (einde overkraging) -->
  <text x="520" y="92" text-anchor="middle" font-size="11" fill="#374151">C</text>
  <!-- Punt D (midden overspanning) -->
  <text x="240" y="92" text-anchor="middle" font-size="11" fill="#374151">D</text>
  <circle cx="240" cy="100" r="3" fill="#3b82f6"/>
  <!-- Maat overspanning -->
  <line x1="80" y1="175" x2="400" y2="175" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="80" y1="169" x2="80" y2="181" stroke="#6b7280" stroke-width="1"/>
  <line x1="400" y1="169" x2="400" y2="181" stroke="#6b7280" stroke-width="1"/>
  <text x="240" y="192" text-anchor="middle" font-size="11" fill="#6b7280">L = {{L}} m</text>
  <!-- Maat overkraging -->
  <line x1="400" y1="175" x2="520" y2="175" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="520" y1="169" x2="520" y2="181" stroke="#6b7280" stroke-width="1"/>
  <text x="460" y="192" text-anchor="middle" font-size="11" fill="#6b7280">a = {{a}} m</text>
</svg>
@end
`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Eigenfrequentie van liggers (Hoofdstuk 8, art. 8.2-8.3)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 8 — Eigenfrequentie van liggers */
export const vandepitteEigenfrequentie = `"Eigenfrequentie van liggers — Vandepitte, Deel I, Hfd. 8

'<i>Massa op een veer, met f = √(K/m)/2π (Hfd. 8, formule 154).</i>

# 1. Ligger

@select systeem "Systeem (Hfd. 8, art. 8.2.3 en 8.8)"
Kraagbalk met puntmassa aan het uiteinde = 1
Ligger op twee steunpunten met puntmassa in het midden = 2
Ligger met gelijkmatig verdeelde massa = 3
@end

E = ?*(N/mm^2)
I = ?*(mm^4)
L = ?*(m)', overspanning of kraaglengte'

# 2. Eigenfrequentie

#if systeem ≡ 1
    m = ?*(kg)', puntmassa'
    K = 3*E*I/L^3 to N/mm', veerstijfheid kraagbalk'
    f = 1/(2*π)*sqrt(K/m) to Hz', formule 157'
#else if systeem ≡ 2
    m = ?*(kg)', puntmassa'
    K = 48*E*I/L^3 to N/mm', veerstijfheid ligger'
    f = 1/(2*π)*sqrt(K/m) to Hz', formule 157'
#else
    m_bar = ?*(kg/m)', massa per lengte'
    @select randvoorwaarde "Randvoorwaarden"
    Scharnier-scharnier (c_1 = pi) = 3.1416
    Inklemming-scharnier (c_1 = 3.927) = 3.927
    Inklemming-inklemming (c_1 = 4.730) = 4.730
    Kraagligger (c_1 = 1.875) = 1.875
    @end
    #hide
    c_1 = randvoorwaarde*1
    #show
    c_1', eerste eigenwaarde'
    f = c_1^2/(2*π)*sqrt(E*I/(m_bar*L^4)) to Hz', Hfd. 8, formule 164'
#end if
#if f ≤ 8 Hz
    '<i>Houten woningvloer: bij f ≤ 8 Hz vraagt NEN-EN 1995-1-1 §7.3.3 een nader onderzoek.</i>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Virtuele Arbeid — Berekening van verplaatsingen (Hoofdstuk 1, art. 1.1-1.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Vandepitte Hfd. 1 — Beginsel van de virtuele arbeid */
export const vandepitteVirtueleArbeid = `"Doorbuiging vakwerk met virtuele arbeid — Vandepitte, Deel I, Hfd. 1, art. 1.5

'<i>a = Σ N<sub>i</sub>·n<sub>i</sub>·L<sub>i</sub>/(E·A<sub>i</sub>), met N<sub>i</sub> door de belasting en n<sub>i</sub> door een eenheidslast in het punt van a. Vereenvoudigd model: twee boven-, twee onderrand- en twee diagonaalstaven, puntlast midden op de onderrand.</i>

# 1. Vakwerk

L = ?*(m)', overspanning'
H = ?*(m)', hoogte'
E = ?*(N/mm^2)
A_boven = ?*(mm^2)
A_onder = ?*(mm^2)
A_diag = ?*(mm^2)
F = ?*(kN)', puntlast midden op de onderrand (BGT)'

# 2. Staafkrachten en bijdragen

N_boven = F*L/(4*H) to kN
n_boven = L/(4*H)
L_boven = L/2 to mm
δ_boven = N_boven*n_boven*L_boven/(E*A_boven) to mm

N_onder = F*L/(4*H) to kN
n_onder = L/(4*H)
L_onder = L/2 to mm
δ_onder = N_onder*n_onder*L_onder/(E*A_onder) to mm

L_diag = sqrt(H^2 + (L/4)^2) to mm
N_diag = F/2*L_diag/H to kN
n_diag = 1/2*L_diag/H
δ_diag = N_diag*n_diag*L_diag/(E*A_diag) to mm

# 3. Doorbuiging en toetsing

δ_totaal = 2*δ_boven + 2*δ_onder + 2*δ_diag to mm
v_toel = L/300 to mm
UC_max = δ_totaal/v_toel
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: doorbuiging vakwerk</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: doorbuiging vakwerk</span>
#end if
`;

// ─────────────────────────────────────────────────────────────────────────────
// Export bundel
// ─────────────────────────────────────────────────────────────────────────────

export const vandepitteFormules: { id: string; label: string; template: string }[] = [
  {
    id: 'vdp-schuifspanning',
    label: 'Vandepitte: Schuifspanningen (Jourawsky)',
    template: vandepitteSchuifspanning,
  },
  {
    id: 'vdp-doorbuiging',
    label: 'Vandepitte: Doorbuiging met dwarskrachteffect',
    template: vandepitteDoorbuiging,
  },
  {
    id: 'vdp-knikken',
    label: 'Vandepitte: Knikken (Euler)',
    template: vandepitteKnikken,
  },
  {
    id: 'vdp-mohr',
    label: 'Vandepitte: Doorbuiging (Mohr)',
    template: vandepitteMohr,
  },
  {
    id: 'vdp-eigenfrequentie',
    label: 'Vandepitte: Eigenfrequentie',
    template: vandepitteEigenfrequentie,
  },
  {
    id: 'vdp-virtuele-arbeid',
    label: 'Vandepitte: Virtuele Arbeid (vakwerk)',
    template: vandepitteVirtueleArbeid,
  },
];
