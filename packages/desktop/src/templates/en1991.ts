/**
 * EN 1991 (Eurocode 1) -- Belastingen op constructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1991-1-1:2002+C1:2019+NB:2019 (Volumieke gewichten, eigen gewicht en opgelegde belastingen)
 * NEN-EN 1991-1-3:2003+A1:2019+NB:2019 (Sneeuwbelasting)
 * NEN-EN 1991-1-4:2005+C2:2011+NB:2019+C1:2020 (Windbelasting)
 *
 * Dakbelasting: q_k hangt van de helling af (tabel NB.4 – 6.10), Q_k niet;
 * 2,0 kN voor elementen direct onder het dakbeschot en 1,5 kN voor overige,
 * gelijk aan rapport/normwaarden.ts.
 *
 * Sneeuw: μ₁ en μ₂ uit tabel 5.2, met ᾱ = (α₁ + α₂)/2 voor de kiel van een
 * meerzijdig dak (5.3.4). Ophoping tegen een hoger bouwdeel volgens 5.3.6 en
 * achter een dakrand of obstakel volgens 6.2, met γ = 2 kN/m³. Afschuivende
 * sneeuw van een hoger dak steiler dan 15° (μ_s) als driehoek over l_s met
 * de helft van de sneeuw op het aangrenzende dakvlak.
 *
 * Wind: q_p met dezelfde keten als de gording en de stalen gevelkolom.
 * c_pe tussen c_pe,1 en c_pe,10 logaritmisch in de belaste oppervlakte
 * (7.2.1); wanden volgens tabel NB.6 – 7.1 (zones A t/m E, zone E tussen
 * h/d = 1 en 5 lineair, zoals stalenGevelkolom.ts), platte daken met scherpe
 * rand volgens tabel 7.2. Inwendig +0,2 of −0,3, de ongunstigste (7.2.9(6)):
 * netto zuiging met +0,2 en netto druk met −0,3; zone I met c_pe = ±0,2.
 * scripts/check-en1991-belastingen.mjs rekent de uitkomsten met de hand na.
 */

// ---------------------------------------------------------------------------
// 1. Opgelegde belastingen (Imposed loads) -- EN 1991-1-1 Tabel NB.1-6.2
// ---------------------------------------------------------------------------

/** EN 1991-1-1 -- Opgelegde belastingen op vloeren en daken */
export const en1991Gebruiksbelasting = `"Opgelegde belastingen — NEN-EN 1991-1-1 + NB

# 1. Vloeren (tabel NB.1 – 6.2)

@select gebruikscategorie "Gebruikscategorie (tabel 6.1 en NB.1 – 6.2)"
A -- Woonfunctie, gemeenschappelijk (qk=3.0, Qk=3.0) = 1
A -- Woonfunctie, niet-gemeenschappelijk (qk=1.75, Qk=3.0) = 2
A -- Trappen woonfunctie (qk=2.0, Qk=3.0) = 3
A -- Balkons woonfunctie (qk=2.5, Qk=3.0) = 4
B -- Kantoorfunctie (qk=2.5, Qk=3.0) = 5
B -- Omsloten verkeersruimte kantoor (qk=3.0, Qk=3.0) = 6
C1 -- Tafels, stoelen, vrije loop (qk=4.0, Qk=3.0) = 7
C2 -- Vaste zitplaatsen (qk=4.0, Qk=7.0) = 8
C3 -- Vrij van obstakels, expositie (qk=5.0, Qk=7.0) = 9
C4 -- Lichamelijke activiteiten (qk=5.0, Qk=7.0) = 10
C5 -- Grote menigten (qk=5.0, Qk=7.0) = 11
D -- Omsloten verkeersruimte winkel (qk=4.0, Qk=7.0) = 12
D1 -- Kleinhandel, detailhandel (qk=4.0, Qk=7.0) = 13
D2 -- Warenhuizen (qk=4.0, Qk=7.0) = 14
@end

#hide
'Tabel: categorie | q_k (kN/m²) | Q_k (kN)
vloeren = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14 | 3.0; 1.75; 2.0; 2.5; 2.5; 3.0; 4.0; 4.0; 5.0; 5.0; 5.0; 4.0; 4.0; 4.0 | 3.0; 3.0; 3.0; 3.0; 3.0; 3.0; 3.0; 7.0; 7.0; 7.0; 7.0; 7.0; 7.0; 7.0]
q_k = hlookup(vloeren; gebruikscategorie; 1; 2)*(kN/m^2)
Q_k = hlookup(vloeren; gebruikscategorie; 1; 3)*kN
#show
q_k', gelijkmatig verdeeld'
Q_k', geconcentreerd'

# 2. Scheidingswanden (6.3.1.2)

@select scheidingswand "Scheidingswandtoeslag (eigen gewicht wand per m)"
Geen scheidingswand = 0
Wand <= 1.0 kN/m (toeslag 0.5) = 1
Wand 1.0-2.0 kN/m (toeslag 0.8) = 2
Wand 2.0-3.0 kN/m (toeslag 1.2) = 3
@end

#hide
q_sw = if(scheidingswand ≡ 1; 0.5; if(scheidingswand ≡ 2; 0.8; if(scheidingswand ≡ 3; 1.2; 0)))*(kN/m^2)
#show
q_sw', toeslag voor verplaatsbare scheidingswanden'
q_totaal = q_k + q_sw to kN/m^2', vloer met scheidingswandtoeslag; zonder reductie met α_A (6.1), NB'

# 3. Daken, categorie H (tabel NB.4 – 6.10)

@select daktype "Dak"
Geen dak (categorie A-D) = 0
Niet-toegankelijk dak, categorie H = 1
@end

#if daktype ≡ 1
    α_dak = ?*(deg)', dakhelling'
    @select dakelement "Element"
    Direct onder het dakbeschot (gording, spant, dakbeschot) = 1
    Overige dakelementen = 2
    @end
    #if α_dak < 15 deg
        q_dak = 1.0 kN/m^2', α < 15°'
    #else if α_dak < 20 deg
        q_dak = (4 - 0.2*α_dak/(1 deg))*(kN/m^2)', 15° ≤ α < 20°'
    #else
        q_dak = 0 kN/m^2', α ≥ 20°'
    #end if
    #if dakelement ≡ 1
        Q_dak = 2.0 kN', direct onder het dakbeschot; onafhankelijk van de helling'
    #else
        Q_dak = 1.5 kN', overige dakelementen; onafhankelijk van de helling'
    #end if
#end if
`;

// ---------------------------------------------------------------------------
// 2. Sneeuwbelasting -- EN 1991-1-3 (NL Nationale Bijlage)
// ---------------------------------------------------------------------------

/** EN 1991-1-3 -- Sneeuwbelasting (Nederland) */
export const en1991Sneeuwbelasting = `"Sneeuwbelasting — NEN-EN 1991-1-3 + NB

# 1. Grondwaarde en coëfficiënten

s_k = 0.7 kN/m^2', heel Nederland (NB bij 4.1)'
C_e = 1.0', blootstellingscoëfficiënt (5.2(7), NB)'
C_t = 1.0', warmtecoëfficiënt (5.2(8), NB)'
'ψ<sub>0</sub> = 0; ψ<sub>1</sub> = 0,2; ψ<sub>2</sub> = 0 (tabel NB.2 – A1.1 van NEN-EN 1990).

# 2. Sneeuw op het dak (5.1, tabel 5.2)

α = ?*(deg)', helling van het dakvlak'
#if α ≤ 30 deg
    μ_1 = 0.8', tabel 5.2, 0° ≤ α ≤ 30°'
#else if α < 60 deg
    μ_1 = 0.8*(60 - α/(1 deg))/30', tabel 5.2, 30° < α < 60°'
#else
    μ_1 = 0', tabel 5.2, α ≥ 60°'
#end if
s = μ_1*C_e*C_t*s_k to kN/m^2

# 3. Ophoping

@select ophoping "Ophoping"
Geen (enkelvoudig dak) = 0
Kiel van een meerzijdig dak, sheddak of vlinderdak (5.3.4) = 1
Tegen een hoger bouwdeel (5.3.6) = 2
Achter een dakrand of obstakel (6.2) = 3
@end

#if ophoping ≡ 1
    α_1 = ?*(deg)', helling van het ene dakvlak aan de kiel'
    α_2 = ?*(deg)', helling van het andere dakvlak aan de kiel'
    α_gem = (α_1 + α_2)/2', ᾱ (5.3.4)'
    #if α_gem ≤ 30 deg
        μ_2 = 0.8 + 0.8*α_gem/(30 deg)', tabel 5.2, 0° ≤ ᾱ ≤ 30°'
    #else if α_gem < 60 deg
        μ_2 = 1.6', tabel 5.2, 30° < ᾱ < 60°'
    #else
        μ_2 = 1.6
        '<b style="color:#b45309">ᾱ ≥ 60°: tabel 5.2 geeft geen μ<sub>2</sub>; 1,6 aangehouden.</b>
    #end if
    s_2 = μ_2*C_e*C_t*s_k to kN/m^2', in de kiel'
#else if ophoping ≡ 2
    h_sp = ?*(m)', hoogteverschil tussen het hogere en het lagere dak'
    b_1 = ?*(m)', breedte van het hogere dak'
    b_2 = ?*(m)', breedte van het lagere dak'
    α_b = ?*(deg)', helling van het aangrenzende dakvlak van het hogere dak'
    γ_sn = 2 kN/m^3', gewicht van sneeuw (5.3.6(1))'
    #hide
    l_s = min(max(2*h_sp; 5 m); 15 m)
    μ_w = min(max(min((b_1 + b_2)/(2*h_sp); γ_sn*h_sp/s_k); 0.8); 4)
    μ_1,b = if(α_b ≤ 30 deg; 0.8; if(α_b < 60 deg; 0.8*(60 - α_b/(1 deg))/30; 0))
    #show
    l_s', lengte van de ophoping: 2h, met 5 ≤ l_s ≤ 15 m (5.3.6(2))'
    μ_w', door wind: (b_1 + b_2)/2h (5.8), ten hoogste γh/s_k, met 0,8 ≤ μ_w ≤ 4'
    #if α_b ≤ 15 deg
        μ_s = 0', afschuivende sneeuw; hoger dak niet steiler dan 15°'
    #else
        μ_s = μ_1,b*b_1/l_s', afschuivende sneeuw: de helft van μ_1·s_k·b_1 als driehoek over l_s'
    #end if
    μ_2 = μ_s + μ_w', tegen het hogere bouwdeel (5.3.6(1))'
    s_2 = μ_2*C_e*C_t*s_k to kN/m^2', tegen de wand; lineair naar s over l_s'
#else if ophoping ≡ 3
    h_ob = ?*(m)', hoogte van de dakrand of het obstakel'
    γ_sn = 2 kN/m^3', gewicht van sneeuw (6.2(2))'
    #hide
    μ_2 = min(max(γ_sn*h_ob/s_k; 0.8); 2.0)
    l_s = min(max(2*h_ob; 5 m); 15 m)
    #show
    μ_2', γh/s_k, met 0,8 ≤ μ_2 ≤ 2,0 (6.2(2))'
    l_s', lengte van de ophoping: 2h, met 5 ≤ l_s ≤ 15 m'
    s_2 = μ_2*C_e*C_t*s_k to kN/m^2', tegen de rand; lineair naar s over l_s'
#end if

# 4. Maatgevend

#if ophoping ≡ 0
    s_maatgevend = s to kN/m^2
#else
    s_maatgevend = max(s; s_2) to kN/m^2
#end if
`;

// ---------------------------------------------------------------------------
// 3. Windbelasting -- EN 1991-1-4 (NL Nationale Bijlage)
// ---------------------------------------------------------------------------

/** EN 1991-1-4 -- Windbelasting (Nederland) */
export const en1991Windbelasting = `"Windbelasting — NEN-EN 1991-1-4 + NB

# 1. Extreme stuwdruk (4.8)

z = ?*(m)', referentiehoogte z_e'

#hide
vb0_ruw = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
z0_ruw = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
zmin_ruw = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
ze_ruw = max(z/(1*m); zmin_ruw)
verh = ze_ruw/z0_ruw
vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*vb0_ruw
#show
v_b0 = vb0_ruw*(m/s)', basiswindsnelheid, windgebied uit de projectgegevens (tabel NB.1); c_dir = c_season = 1'
z_0 = z0_ruw*m', terreincategorie uit de projectgegevens (tabel NB.3 – 4.1)'
z_e = ze_ruw*m', ten minste z_min'
k_r = 0.19*(z0_ruw/0.05)^0.07', terreinfactor (4.5)'
c_r = k_r*log(verh)', ruwheidsfactor (4.4); c_o = 1'
v_m = vm_ruw*(m/s)', gemiddelde windsnelheid (4.3)'
I_v = 1/log(verh)', turbulentie-intensiteit (4.7); k_l = 1'
q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', extreme stuwdruk (4.8), ρ = 1,25 kg/m³'

# 2. Bouwwerkfactor (6.2)

@select bouwwerkfactor "Bouwwerkfactor c_s·c_d (6.2)"
Gebouwhoogte < 15 m (cs_cd = 1.0) = 1
Gebouwhoogte < 50 m en h/b < 5 (cs_cd = 1.05) = 2
Bepaald volgens bijlage C = 3
@end

#if bouwwerkfactor ≡ 3
    cs_cd = ?', bouwwerkfactor volgens bijlage C'
#else if bouwwerkfactor ≡ 2
    cs_cd = 1.05
#else
    cs_cd = 1.0
#end if

# 3. Drukcoëfficiënten (tabel NB.6 – 7.1 en 7.2)

@select zone_cpe "Zone"
Wand: zone A (c_pe,10 = -1.2; c_pe,1 = -1.4) = 1
Wand: zone B (c_pe,10 = -0.8; c_pe,1 = -1.1) = 2
Wand: zone C (c_pe = -0.5) = 3
Wand: zone D, loefzijde (c_pe,10 = +0.8; c_pe,1 = +1.0) = 4
Wand: zone E, lijzijde (c_pe = -0.5 tot -0.7) = 5
Plat dak: zone F (c_pe,10 = -1.8; c_pe,1 = -2.5) = 6
Plat dak: zone G (c_pe,10 = -1.2; c_pe,1 = -2.0) = 7
Plat dak: zone H (c_pe,10 = -0.7; c_pe,1 = -1.2) = 8
Plat dak: zone I (c_pe = +/-0.2) = 9
Zelf invullen = 0
@end

A_bel = ?*(m^2)', belaste oppervlakte van het element'
#if zone_cpe ≡ 5
    hd = ?', verhouding h/d van het gebouw'
#else if zone_cpe ≡ 0
    c_pe,hand = ?', uitwendige drukcoëfficiënt'
#end if
#hide
cpe(c1; c10) = if(A_bel ≥ 10 m^2; c10; if(A_bel ≤ 1 m^2; c1; c1 - (c1 - c10)*log10(A_bel/(1 m^2))))
#show
#if zone_cpe ≡ 1
    c_pe = cpe(-1.4; -1.2)', zone A: c_pe,1 = −1,4; c_pe,10 = −1,2'
#else if zone_cpe ≡ 2
    c_pe = cpe(-1.1; -0.8)', zone B: c_pe,1 = −1,1; c_pe,10 = −0,8'
#else if zone_cpe ≡ 3
    c_pe = -0.5', zone C'
#else if zone_cpe ≡ 4
    c_pe = cpe(1.0; 0.8)', zone D: c_pe,1 = +1,0; c_pe,10 = +0,8'
#else if zone_cpe ≡ 5
    c_pe = -0.5 - 0.2*min(max(hd - 1; 0); 4)/4', zone E, lineair tussen h/d = 1 en 5'
#else if zone_cpe ≡ 6
    c_pe = cpe(-2.5; -1.8)', zone F: c_pe,1 = −2,5; c_pe,10 = −1,8'
#else if zone_cpe ≡ 7
    c_pe = cpe(-2.0; -1.2)', zone G: c_pe,1 = −2,0; c_pe,10 = −1,2'
#else if zone_cpe ≡ 8
    c_pe = cpe(-1.2; -0.7)', zone H: c_pe,1 = −1,2; c_pe,10 = −0,7'
#else if zone_cpe ≡ 9
    c_pe = 0.2', zone I: +0,2 en −0,2'
#else
    c_pe = c_pe,hand
#end if
#if zone_cpe ≠ 0 and zone_cpe ≠ 3 and zone_cpe ≠ 5 and zone_cpe ≠ 9
    #if A_bel ≥ 10 m^2
        '<i>A ≥ 10 m²: c<sub>pe,10</sub>.</i>
    #else if A_bel ≤ 1 m^2
        '<i>A ≤ 1 m²: c<sub>pe,1</sub>.</i>
    #else
        '<i>1 m² &lt; A &lt; 10 m²: logaritmisch tussen c<sub>pe,1</sub> en c<sub>pe,10</sub> (7.2.1).</i>
    #end if
#end if

# 4. Netto winddruk (5.1, 5.2)

#hide
c_pe,d = c_pe
c_pe,z = if(zone_cpe ≡ 9; -c_pe; c_pe)
#show
w_d = q_p*(c_pe,d + 0.3) to kN/m^2', met c_pi = −0,3, onderdruk binnen (7.2.9(6))'
w_z = q_p*(c_pe,z - 0.2) to kN/m^2', met c_pi = +0,2, overdruk binnen'
#if abs(w_z) ≥ abs(w_d)
    w_net = w_z', maatgevend: zuiging'
    F_w = (cs_cd*c_pe,z - 0.2)*q_p*A_bel to kN', kracht op het element (5.5, 5.6); negatief is zuiging'
#else
    w_net = w_d', maatgevend: druk'
    F_w = (cs_cd*c_pe,d + 0.3)*q_p*A_bel to kN', kracht op het element (5.5, 5.6)'
#end if
`;

// ---------------------------------------------------------------------------
// Export bundel
// ---------------------------------------------------------------------------

export const en1991Formules: { id: string; label: string; template: string }[] = [
  {
    id: 'en1991-gebruiksbelasting',
    label: 'EN 1991-1-1: Opgelegde belastingen (NL)',
    template: en1991Gebruiksbelasting,
  },
  {
    id: 'en1991-sneeuwbelasting',
    label: 'EN 1991-1-3: Sneeuwbelasting (NL)',
    template: en1991Sneeuwbelasting,
  },
  {
    id: 'en1991-windbelasting',
    label: 'EN 1991-1-4: Windbelasting (NL)',
    template: en1991Windbelasting,
  },
];
