/**
 * Toetsing van een houten kolom op druk + knik + (optioneel) buiging,
 * conform NEN-EN 1995-1-1:2005+A1:2008/A2:2014 + NB.
 *
 * Toetsingen:
 *   §6.1.4   Druk evenwijdig aan de vezels (uitgangspunt)
 *   §6.3.2   Knikcontrole (kolom op druk + buiging)
 *
 * Onderbouw + matrices identiek aan houtenBalklaag.ts (zelfde C-klassen,
 * zelfde k_def en k_mod-keuzes). Geometrie is een staaflengte met
 * kniklengte-factoren per knikrichting (y en z).
 */

export const houtenKolom = `"Houten kolom — knikcheck EN 1995-1-1 §6.3.2

'<i>Massief-houten kolom onder centrische normaalkracht en optionele
'tweezijdige buiging. Toetsing volgt §6.1.4 (druk) gecombineerd met
'§6.3.2 (knikinstabiliteit). De kolom-knikgrafiek wordt apart geplot.</i>

# 1. Geometrie en materiaal

@select houtkwaliteit "Houtkwaliteit (EN 338)"
  C14 = 14
  C16 = 16
  C18 = 18
  C20 = 20
  C22 = 22
  C24 = 24
  C27 = 27
  C30 = 30
  C35 = 35
  C40 = 40
@end

@select profile "Profielafmeting b × h (mm)"
  71 × 71 = 1
  71 × 96 = 2
  71 × 121 = 3
  96 × 96 = 4
  96 × 121 = 5
  96 × 146 = 6
  121 × 121 = 7
  121 × 146 = 8
  121 × 171 = 9
  146 × 146 = 10
  171 × 171 = 11
  100 × 100 = 12
  100 × 150 = 13
  100 × 200 = 14
  150 × 150 = 15
  150 × 200 = 16
  200 × 200 = 17
@end

@select klimaatklasse "Klimaatklasse"
  I — droog binnenklimaat = 1
  II — overdekt buiten = 2
  III — vol weersbelast = 3
@end

@select belastingsduur "Belasting-duur (Tabel 3.1)"
  Permanent = 1
  Lang (> 6 mnd) = 2
  Middellang (1 wk – 6 mnd) = 3
  Kort (< 1 wk) = 4
  Zeer kort (wind/aardbeving) = 5
@end

#hide
'Profielmatrix [id | b(mm) | h(mm)]
profiles_b_h = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17 |71; 71; 71; 96; 96; 96; 121; 121; 121; 146; 171; 100; 100; 100; 150; 150; 200 |71; 96; 121; 96; 121; 146; 121; 146; 171; 146; 171; 100; 150; 200; 150; 200; 200]
b_p = hlookup(profiles_b_h; profile; 1; 2)*mm
h_p = hlookup(profiles_b_h; profile; 1; 3)*mm

'Houtsterkte EN 338 [id | f_m,k | f_c,0,k | f_v,k | E_0,mean | E_0,05 | rho_k]
strength_C = [14; 16; 18; 20; 22; 24; 27; 30; 35; 40 |14; 16; 18; 20; 22; 24; 27; 30; 35; 40 |16; 17; 18; 19; 20; 21; 22; 23; 25; 26 |1.7; 1.8; 2.0; 2.2; 2.4; 2.5; 2.8; 3.0; 3.4; 3.8 |7000; 8000; 9000; 9500; 10000; 11000; 11500; 12000; 13000; 14000 |4700; 5400; 6000; 6400; 6700; 7400; 7700; 8000; 8700; 9400 |290; 310; 320; 330; 340; 350; 370; 380; 400; 420]

f_m,k = hlookup(strength_C; houtkwaliteit; 1; 2)*N/mm^2
f_c,0,k = hlookup(strength_C; houtkwaliteit; 1; 3)*N/mm^2
f_v,k = hlookup(strength_C; houtkwaliteit; 1; 4)*N/mm^2
E_0,mean = hlookup(strength_C; houtkwaliteit; 1; 5)*N/mm^2
E_0,05 = hlookup(strength_C; houtkwaliteit; 1; 6)*N/mm^2
ρ_k = hlookup(strength_C; houtkwaliteit; 1; 7)*kg/m^3

'Cross-section
A = b_p*h_p
W_y = b_p*h_p^2/6
W_z = h_p*b_p^2/6
I_y = b_p*h_p^3/12
I_z = h_p*b_p^3/12
i_y = sqrt(I_y/A)
i_z = sqrt(I_z/A)

'k_def — Tabel 3.2 gezaagd hout
#if klimaatklasse ≡ 1
    k_def = 0.6
#else if klimaatklasse ≡ 2
    k_def = 0.8
#else
    k_def = 2.0
#end if

'k_mod — Tabel 3.1 gezaagd hout
'Klimaatklasse I/II
#if klimaatklasse ≤ 2
    #if belastingsduur ≡ 1
        k_mod = 0.60
    #else if belastingsduur ≡ 2
        k_mod = 0.70
    #else if belastingsduur ≡ 3
        k_mod = 0.80
    #else if belastingsduur ≡ 4
        k_mod = 0.90
    #else
        k_mod = 1.10
    #end if
#else
    'Klimaatklasse III
    #if belastingsduur ≡ 1
        k_mod = 0.50
    #else if belastingsduur ≡ 2
        k_mod = 0.55
    #else if belastingsduur ≡ 3
        k_mod = 0.65
    #else if belastingsduur ≡ 4
        k_mod = 0.70
    #else
        k_mod = 0.90
    #end if
#end if

γ_M = 1.3
β_c = 0.2', §6.3.2(1) — imperfectiefactor gezaagd hout (0.1 voor gelamineerd)'
k_m = 0.7', §6.1.6(2) — rechthoekige doorsnede'

'k_h — alleen op buiging van toepassing (hoogtefactor 150/h)
k_h = if(h_p < 150 mm; min(1.3; (150 mm/h_p)^0.2); 1.0)
#show

'<b>Doorsnede:</b> b × h = 'b_p' × 'h_p
'A = 'A
'I_y = 'I_y'    i_y = 'i_y
'I_z = 'I_z'    i_z = 'i_z
'<b>Materiaal:</b> f<sub>c,0,k</sub> = 'f_c,0,k', f<sub>m,k</sub> = 'f_m,k', E<sub>0,05</sub> = 'E_0,05
'k<sub>mod</sub> = 'k_mod'    k<sub>def</sub> = 'k_def'    γ<sub>M</sub> = 'γ_M

# 2. Staaflengte en kniklengtes

L = ?*(m)', staaflengte (m)'

@select randvoorw_y "Randvoorwaarden y-y-as (sterke as)"
  Beide einden scharnierend, L_cr = 1.0·L = 100
  Boven scharnier, onder ingeklemd, L_cr = 0.7·L = 70
  Boven ingeklemd, onder vrij (kraagkolom), L_cr = 2.0·L = 200
  Beide einden ingeklemd, L_cr = 0.5·L = 50
@end

@select randvoorw_z "Randvoorwaarden z-z-as (zwakke as)"
  Beide einden scharnierend, L_cr = 1.0·L = 100
  Boven scharnier, onder ingeklemd, L_cr = 0.7·L = 70
  Boven ingeklemd, onder vrij (kraagkolom), L_cr = 2.0·L = 200
  Beide einden ingeklemd, L_cr = 0.5·L = 50
@end

#hide
β_cr,y = randvoorw_y/100
β_cr,z = randvoorw_z/100
L_cr,y = β_cr,y*L
L_cr,z = β_cr,z*L
λ_y = L_cr,y/i_y
λ_z = L_cr,z/i_z
λ_rel,y = (λ_y/π)*sqrt(f_c,0,k/E_0,05)
λ_rel,z = (λ_z/π)*sqrt(f_c,0,k/E_0,05)

'k_y/k_z (§6.3.2.3 formule 6.27/6.28)
k_y = 0.5*(1 + β_c*(λ_rel,y - 0.3) + λ_rel,y^2)
k_z = 0.5*(1 + β_c*(λ_rel,z - 0.3) + λ_rel,z^2)

'k_c,y/k_c,z (§6.3.2.3 formule 6.25/6.26)
k_c,y = if(λ_rel,y ≤ 0.3; 1.0; 1/(k_y + sqrt(k_y^2 - λ_rel,y^2)))
k_c,z = if(λ_rel,z ≤ 0.3; 1.0; 1/(k_z + sqrt(k_z^2 - λ_rel,z^2)))
#show

'<b>Kniklengtes:</b> L<sub>cr,y</sub> = 'L_cr,y', L<sub>cr,z</sub> = 'L_cr,z
'<b>Slankheden:</b> λ<sub>y</sub> = 'λ_y', λ<sub>z</sub> = 'λ_z
'<b>Relatieve slankheden (§6.3.2.2):</b>
'λ̄<sub>rel,y</sub> = (λ<sub>y</sub>/π)·√(f<sub>c,0,k</sub>/E<sub>0,05</sub>) = 'λ_rel,y
'λ̄<sub>rel,z</sub> = 'λ_rel,z
'<b>Reductiefactoren:</b> k<sub>c,y</sub> = 'k_c,y', k<sub>c,z</sub> = 'k_c,z

# 3. Belastingen (ontwerpwaarden)

N_Ed = ?*(kN)', drukkracht N_Ed (kN, positief = druk)'
M_y,Ed = ?*(kN m)', buigmoment om y-as (sterke as) M_y,Ed (kNm) — 0 als geen'
M_z,Ed = ?*(kN m)', buigmoment om z-as (zwakke as) M_z,Ed (kNm) — 0 als geen'

# 4. Rekenwaarden sterkten

f_c,0,d = k_mod*f_c,0,k/γ_M
f_m,d = k_mod*k_h*f_m,k/γ_M

σ_c,0,d = N_Ed/A
σ_m,y,d = M_y,Ed/W_y
σ_m,z,d = M_z,Ed/W_z

'σ<sub>c,0,d</sub> = 'σ_c,0,d
'σ<sub>m,y,d</sub> = 'σ_m,y,d
'σ<sub>m,z,d</sub> = 'σ_m,z,d
'f<sub>c,0,d</sub> = 'f_c,0,d
'f<sub>m,d</sub> = 'f_m,d

# 5. Knikcheck §6.3.2.3

'<i>Combineerformules 6.23/6.24 (kolom op druk + 2× buiging):
'  rond y-as: σ<sub>c,0,d</sub>/(k<sub>c,y</sub>·f<sub>c,0,d</sub>) + σ<sub>m,y,d</sub>/f<sub>m,d</sub> + k<sub>m</sub>·σ<sub>m,z,d</sub>/f<sub>m,d</sub> ≤ 1
'  rond z-as: σ<sub>c,0,d</sub>/(k<sub>c,z</sub>·f<sub>c,0,d</sub>) + k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,d</sub> ≤ 1</i>

UC_y = σ_c,0,d/(k_c,y*f_c,0,d) + σ_m,y,d/f_m,d + k_m*σ_m,z,d/f_m,d
UC_z = σ_c,0,d/(k_c,z*f_c,0,d) + k_m*σ_m,y,d/f_m,d + σ_m,z,d/f_m,d

UC_max = max(UC_y; UC_z)

'UC<sub>y</sub> (knik om y-as) = 'UC_y
'UC<sub>z</sub> (knik om z-as) = 'UC_z

#if UC_max ≤ 1.0
    '<b>UC<sub>max</sub> = 'UC_max'<span style="color:green"> ≤ 1.0 → Voldoet</span></b>
#else
    '<b>UC<sub>max</sub> = 'UC_max'<span style="color:red"> > 1.0 → Voldoet NIET</span></b>
#end if

# 6. Schema

@svg
<svg width="540" height="380" viewBox="0 0 540 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="wood" patternUnits="userSpaceOnUse" width="20" height="80">
      <rect width="20" height="80" fill="#d4a574"/>
      <path d="M 0 10 Q 10 5 20 10 M 0 30 Q 10 25 20 30 M 0 50 Q 10 45 20 50 M 0 70 Q 10 65 20 70"
            stroke="#8b6914" stroke-width="0.4" fill="none"/>
    </pattern>
    <pattern id="hatch2" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#a3a3a3" stroke-width="0.6"/>
    </pattern>
    <marker id="arrCol" markerWidth="10" markerHeight="10" refX="5" refY="9" orient="auto">
      <polygon points="0 0, 10 0, 5 9" fill="#dc2626"/>
    </marker>
  </defs>

  <!-- Fundering / ondergrond -->
  <rect x="60" y="320" width="220" height="14" fill="url(#hatch2)" stroke="#374151" stroke-width="1"/>

  <!-- Kolom -->
  <rect x="140" y="60" width="60" height="260" fill="url(#wood)" stroke="#5b4a2b" stroke-width="1.5"/>

  <!-- Knikgolf gestippeld (onder lichte vervorming) -->
  <path d="M 170 60 Q 230 190 170 320" stroke="#dc2626" stroke-width="1" fill="none" stroke-dasharray="4 3" opacity="0.7"/>

  <!-- Belasting N_Ed pijl -->
  <line x1="170" y1="15" x2="170" y2="55" stroke="#dc2626" stroke-width="2.5" marker-end="url(#arrCol)"/>
  <text x="170" y="12" text-anchor="middle" font-size="12" fill="#dc2626" font-weight="bold">N_Ed = {{N_Ed}} kN</text>

  <!-- Maatlijn L (rechts van kolom) -->
  <line x1="240" y1="60" x2="240" y2="320" stroke="#6b7280" stroke-width="0.8"/>
  <line x1="235" y1="60" x2="245" y2="60" stroke="#6b7280" stroke-width="0.8"/>
  <line x1="235" y1="320" x2="245" y2="320" stroke="#6b7280" stroke-width="0.8"/>
  <text x="250" y="195" font-size="11" fill="#374151" transform="rotate(90,250,195)">L = {{L}} m</text>

  <!-- Maatlijn b (boven kolom) -->
  <line x1="140" y1="48" x2="200" y2="48" stroke="#6b7280" stroke-width="0.8"/>
  <line x1="140" y1="43" x2="140" y2="53" stroke="#6b7280" stroke-width="0.8"/>
  <line x1="200" y1="43" x2="200" y2="53" stroke="#6b7280" stroke-width="0.8"/>
  <text x="170" y="42" text-anchor="middle" font-size="10" fill="#374151">b × h = {{b_p}} × {{h_p}} mm</text>

  <!-- Resultaten -->
  <text x="380" y="80" font-size="12" fill="#1e40af" font-weight="bold">EN 1995-1-1 §6.3.2</text>
  <text x="380" y="102" font-size="10" fill="#374151">λ_y = {{λ_y}}</text>
  <text x="380" y="116" font-size="10" fill="#374151">λ_z = {{λ_z}}</text>
  <text x="380" y="135" font-size="10" fill="#374151">λ̄_rel,y = {{λ_rel,y}}</text>
  <text x="380" y="149" font-size="10" fill="#374151">λ̄_rel,z = {{λ_rel,z}}</text>
  <text x="380" y="168" font-size="11" fill="#1e40af" font-weight="bold">k_c,y = {{k_c,y}}</text>
  <text x="380" y="184" font-size="11" fill="#1e40af" font-weight="bold">k_c,z = {{k_c,z}}</text>
  <text x="380" y="210" font-size="10" fill="#374151">UC_y = {{UC_y}}</text>
  <text x="380" y="226" font-size="10" fill="#374151">UC_z = {{UC_z}}</text>
  <text x="380" y="250" font-size="13" fill="#059669" font-weight="bold">UC_max = {{UC_max}}</text>

  <!-- Steunpunten symbolisch -->
  <circle cx="170" cy="320" r="4" fill="#374151"/>
  <circle cx="170" cy="60" r="4" fill="#fff" stroke="#374151" stroke-width="1.5"/>
</svg>
@end

'<hr/>
'<i>Aannames:
'<ul>
'<li>k<sub>m</sub> = 0.7 voor rechthoekige doorsnede (§6.1.6(2)). Voor andere
'profielen of gelijmd-gelamineerd hout: zie norm.</li>
'<li>β<sub>c</sub> = 0.2 voor gezaagd hout, 0.1 voor gelijmd-gelamineerd (§6.3.2(1)).</li>
'<li>k<sub>mod</sub> volgt klimaatklasse + belasting-duur (Tabel 3.1, gezaagd hout).
'Voor andere materiaal-categorieën: tabel-keuze in code aanpassen.</li>
'<li>Hier wordt de kolom belast door N + M zonder 2e-orde effecten;
'§5.4.4 vervangt deze sheet voor kolommen met δ<sub>2</sub>·N<sub>Ed</sub>/E·I-effecten.</li>
'<li>Kipcontrole bij grote M<sub>y</sub> in een slanke kolom: §6.3.3 separaat toepassen.</li>
'</ul></i>
`;
