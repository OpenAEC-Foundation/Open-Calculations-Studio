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
 * meerzijdig dak (5.3.4); μ₁ per dakvlak voor geval (i). Ophoping tegen een
 * hoger bouwdeel volgens 5.3.6 en achter een dakrand of obstakel volgens 6.2,
 * met γ = 2 kN/m³. Afschuivende sneeuw van een hoger dak steiler dan 15° (μ_s)
 * als driehoek over l_s met de helft van de sneeuw op het aangrenzende dakvlak.
 * Is b₂ < l_s, dan loopt de ophoping lineair tot het einde van het lagere dak
 * en is daar afgekapt (5.3.6, opmerking 3). De lijnlast op een element is de
 * sneeuw over zijn belaste strook [x; x + b], met de ophoping lineair van de
 * wand, rand of kiel naar μ₁ (in de kiel naar de nok, figuur 5.3 geval (ii)).
 *
 * Wind: q_p met dezelfde keten als de gording en de stalen gevelkolom.
 * c_pe tussen c_pe,1 en c_pe,10 logaritmisch in de belaste oppervlakte
 * (7.2.1); wanden volgens tabel NB.6 – 7.1 (zones A t/m E, zone E tussen
 * h/d = 1 en 5 lineair, zoals stalenGevelkolom.ts), platte daken met scherpe
 * rand volgens tabel 7.2. Een borstwering of afgeronde dakrand geeft in die
 * tabel gelijke of lagere waarden, de scherpe rand ligt dan aan de veilige
 * kant; bij een afgeschuinde (mansarde)rand c_pe zelf invullen.
 * Inwendig zonder dominante gevel +0,2 of −0,3, de ongunstigste (7.2.9(6)):
 * netto zuiging met +0,2 en netto druk met −0,3. Zone I met druk +0,2 en
 * zuiging c_pe,10 = −0,2 / c_pe,1 = −0,5 (tabel NB.7 – 7.2). Bij een
 * dominante gevel één ingevulde c_pi (7.2.9(5)). De kracht F_w neemt
 * zelf de ongunstigste, want c_s·c_d staat alleen op het uitwendige deel.
 * Zadeldaken volgens tabel NB.10 – 7.4a (θ = 0°) en NB.11 – 7.4b (θ = 90°):
 * lineair tussen hellingen met waarden van hetzelfde teken (opmerking 2),
 * onder 5° een plat dak. Open overkappingen in lessenaarsvorm volgens 7.3 en
 * tabel 7.6: c_p,net lineair in α en, opwaarts, tussen φ = 0 en φ = 1.
 * Luifels aan een gebouw volgens 7.2.12 en tabel NB.18 – 8, lineair in h₁/h
 * en h₁/d₁, met z_e = h. Lijnlast: per zone q = (c_s·c_d·c_pe − c_pi)·q_p·b
 * (bij c_p,net zonder c_pi), en op een element de som over de zones die zijn
 * belaste strook [x; x + b] vanaf de rand raakt, met e = min(b; 2h) uit
 * figuur 7.5 t/m 7.8 (bij een luifel e = min(d₁/4; b₁/2)).
 *
 * Ontwerplevensduur boven 50 jaar (A1.1(2) van de NB bij NEN-EN 1990): wind
 * met c_prob volgens opmerking 4 bij 4.2, K uit tabel NB.2 en n = 0,5, p = 1/t;
 * sneeuw volgens bijlage D (D.1) met V = 0,8 (NB). Onder 50 jaar blijft de
 * 50-jaarswaarde staan; dat ligt aan de veilige kant.
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
C -- Omsloten afzonderlijke verkeersruimte, niet C5 (qk=5.0, Qk=3.0) = 15
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
vloeren = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15 | 3.0; 1.75; 2.0; 2.5; 2.5; 3.0; 4.0; 4.0; 5.0; 5.0; 5.0; 4.0; 4.0; 4.0; 5.0 | 3.0; 3.0; 3.0; 3.0; 3.0; 3.0; 3.0; 7.0; 7.0; 7.0; 7.0; 7.0; 7.0; 7.0; 3.0]
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

#if DesignLife > 50
    #hide
    f_sn = (1 - 0.8*sqrt(6)/pi*(log(-log(1 - 1/DesignLife)) + 0.57722))/(1 + 2.5923*0.8)
    #show
    f_sn', ontwerplevensduur boven 50 jaar: (D.1) met V = 0,8 (NB bij bijlage D) en P_n = 1/t'
    s_k = f_sn*0.7 kN/m^2', 0,7 kN/m² in heel Nederland (NB bij 4.1), aangepast volgens A1.1(2) van de NB bij NEN-EN 1990'
#else
    s_k = 0.7 kN/m^2', heel Nederland (NB bij 4.1)'
#end if
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
    #hide
    μ_1,α1 = if(α_1 ≤ 30 deg; 0.8; if(α_1 < 60 deg; 0.8*(60 - α_1/(1 deg))/30; 0))
    μ_1,α2 = if(α_2 ≤ 30 deg; 0.8; if(α_2 < 60 deg; 0.8*(60 - α_2/(1 deg))/30; 0))
    #show
    μ_1,α1', geval (i), dakvlak met α_1 (tabel 5.2)<span class="kolom-2"></span>'
    μ_1,α2', geval (i), dakvlak met α_2<span class="kolom-2"></span>'
    α_gem = (α_1 + α_2)/2', ᾱ (5.3.4)'
    #if α_gem ≤ 30 deg
        μ_2 = 0.8 + 0.8*α_gem/(30 deg)', tabel 5.2, 0° ≤ ᾱ ≤ 30°'
    #else if α_gem < 60 deg
        μ_2 = 1.6', tabel 5.2, 30° < ᾱ < 60°'
    #else
        μ_2 = 1.6
        '<b style="color:#b45309">ᾱ ≥ 60°: tabel 5.2 geeft geen μ<sub>2</sub>; 1,6 aangehouden.</b>
    #end if
    s_2 = μ_2*C_e*C_t*s_k to kN/m^2', in de kiel, geval (ii); lineair naar s op de nok'
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
    #if b_2 < l_s
        μ_eind = μ_2 - (μ_2 - μ_1)*b_2/l_s', b_2 < l_s: aan het einde van het lagere dak, daar afgekapt (5.3.6, opmerking 3)'
        s_eind = μ_eind*C_e*C_t*s_k to kN/m^2
    #end if
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

# 5. Lijnlast op een element

b_sn = ?*(m)', belastingbreedte van het element<span class="kolom-2"></span>'
#if ophoping ≡ 0
    q_sn = s*b_sn to kN/m', gelijkmatig verdeeld'
#else
    x_sn = ?*(m)', afstand van de wand, rand of kiel tot de belaste strook<span class="kolom-2"></span>'
    #if ophoping ≡ 1
        l_k = ?*(m)', horizontale afstand van de kiel tot de nok van dit dakvlak'
    #end if
    #hide
    #if ophoping ≡ 1
        L_o = l_k
    #else
        L_o = l_s
    #end if
    #if ophoping ≡ 2
        x_eind = b_2
    #else
        x_eind = x_sn + b_sn
    #end if
    u_sn = min(x_sn; x_eind)
    v_sn = min(x_sn + b_sn; x_eind)
    F_o(x_o) = min(x_o; L_o) - min(x_o; L_o)^2/(2*max(L_o; 0.001 m))
    q_sn = s*(v_sn - u_sn) + (s_2 - s)*(F_o(v_sn) - F_o(u_sn)) to kN/m
    #show
    '<i>Het element draagt de strook van x tot x + b, gemeten vanaf de wand, de rand of de kiel. Daarop loopt de sneeuw lineair van s<sub>2</sub> naar s over de lengte van de ophoping (in de kiel tot de nok); tegen een hoger bouwdeel afgekapt aan het einde van het lagere dak. Een element loodrecht op de wand krijgt een trapeziumlast van s<sub>2</sub>·b naar s·b.</i><span class="alleen-scherm"></span>
    q_sn', de sneeuw over de strook [x; x + b], met de ophoping lineair van s_2 naar s'
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
K_prob = if(windgebied ≡ 1; 0.2; if(windgebied ≡ 2; 0.234; 0.281))
t_prob = max(DesignLife; 50)
cprob_ruw = sqrt((1 - K_prob*log(-log(1 - 1/t_prob)))/(1 - K_prob*log(-log(0.98))))
vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*cprob_ruw*vb0_ruw
#show
v_b0 = vb0_ruw*(m/s)', basiswindsnelheid, windgebied uit de projectgegevens (tabel NB.1); c_dir = c_season = 1'
#if DesignLife > 50
    c_prob = cprob_ruw', ontwerplevensduur boven 50 jaar: (4.2) met p = 1/t, K uit tabel NB.2 en n = 0,5 (opmerking 4 bij 4.2)'
#end if
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

# 3. Drukcoëfficiënten

@select onderdeel "Onderdeel"
Gevel of plat dak (tabel NB.6 – 7.1 en NB.7 – 7.2) = 1
Zadeldak (7.2.5, tabel NB.10 – 7.4a en NB.11 – 7.4b) = 2
Open overkapping, lessenaarsvorm (7.3, tabel 7.6) = 3
Luifel aan een gebouw (7.2.12, tabel NB.18 – 8) = 4
@end

#if onderdeel ≡ 1
    @select zone_cpe "Zone"
    Wand: zone A (c_pe,10 = -1.2; c_pe,1 = -1.4) = 1
    Wand: zone B (c_pe,10 = -0.8; c_pe,1 = -1.1) = 2
    Wand: zone C (c_pe = -0.5) = 3
    Wand: zone D, loefzijde (c_pe,10 = +0.8; c_pe,1 = +1.0) = 4
    Wand: zone E, lijzijde (c_pe = -0.5 tot -0.7) = 5
    Plat dak: zone F (c_pe,10 = -1.8; c_pe,1 = -2.5) = 6
    Plat dak: zone G (c_pe,10 = -1.2; c_pe,1 = -2.0) = 7
    Plat dak: zone H (c_pe,10 = -0.7; c_pe,1 = -1.2) = 8
    Plat dak: zone I (c_pe = +0.2; zuiging c_pe,10 = -0.2; c_pe,1 = -0.5) = 9
    Zelf invullen = 0
    @end
#else if onderdeel ≡ 2
    @select zone_zd "Zone (figuur 7.8)"
    θ = 0°: F, hoeken langs de goot aan loefzijde = 1
    θ = 0°: G, goot aan loefzijde tussen de hoeken = 2
    θ = 0°: H, rest van het loefvlak = 3
    θ = 0°: I, lijvlak = 4
    θ = 0°: J, lijvlak langs de nok = 5
    θ = 90°: F, kopgevel bij de goten = 6
    θ = 90°: G, kopgevel bij de nok = 7
    θ = 90°: H = 8
    θ = 90°: I = 9
    @end
    α_zd = ?*(deg)', dakhelling'
#else if onderdeel ≡ 3
    @select zone_ov "Zone (tabel 7.6)"
    A, binnengebied = 1
    B, langs de randen evenwijdig aan de wind (breedte b/10) = 2
    C, langs de randen aan loef- en lijzijde (breedte d/10) = 3
    @end
    α_ov = ?*(deg)', dakhelling, 0° tot 30°<span class="kolom-2"></span>'
    φ_ov = ?', blokkering φ (7.3(2)): 0 leeg, 1 aan lijzijde geheel gevuld<span class="kolom-2"></span>'
#else
    @select zone_lf "Zone (figuur NB.4 – 6)"
    A, langs de zijranden (breedte e) = 1
    B, midden = 2
    @end
    h_1 = ?*(m)', hoogte van de luifel boven maaiveld<span class="kolom-3"></span>'
    d_1 = ?*(m)', uitkraging<span class="kolom-3"></span>'
    b_1 = ?*(m)', breedte langs de gevel<span class="kolom-3"></span>'
#end if

A_bel = ?*(m^2)', belaste oppervlakte van het element'
#if onderdeel ≡ 1
    #if zone_cpe ≡ 0
        c_pe,hand = ?', uitwendige drukcoëfficiënt'
    #else if zone_cpe ≤ 5
        hd = ?', verhouding h/d van het gebouw, voor zone E'
    #end if
#end if
#hide
cpe(c1; c10) = if(A_bel ≥ 10 m^2; c10; if(A_bel ≤ 1 m^2; c1; c1 - (c1 - c10)*log10(A_bel/(1 m^2))))
c_pe,I = cpe(-0.5; -0.2)
'Lineair tussen de rijen van een tabel; kolom 1 is de ingang.
ip(tab; kol; xa) = hlookup_le(tab; xa; 1; kol) + (hlookup_ge(tab; xa; 1; kol) - hlookup_le(tab; xa; 1; kol))*if(hlookup_ge(tab; xa; 1; 1) > hlookup_le(tab; xa; 1; 1); (xa - hlookup_le(tab; xa; 1; 1))/(hlookup_ge(tab; xa; 1; 1) - hlookup_le(tab; xa; 1; 1)); 0)
kies(i; v1; v2; v3; v4; v5) = if(i ≡ 1; v1; if(i ≡ 2; v2; if(i ≡ 3; v3; if(i ≡ 4; v4; v5))))
#show
#if onderdeel ≡ 1
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
        c_pe = 0.2', zone I, druk'
        c_pe,I', zone I, zuiging: c_pe,1 = −0,5; c_pe,10 = −0,2 (tabel NB.7 – 7.2)'
    #else
        c_pe = c_pe,hand
    #end if
    #if zone_cpe ≠ 0 and zone_cpe ≠ 3 and zone_cpe ≠ 5
        #if A_bel ≥ 10 m^2
            '<i>A ≥ 10 m²: c<sub>pe,10</sub>.</i>
        #else if A_bel ≤ 1 m^2
            '<i>A ≤ 1 m²: c<sub>pe,1</sub>.</i>
        #else
            '<i>1 m² &lt; A &lt; 10 m²: logaritmisch tussen c<sub>pe,1</sub> en c<sub>pe,10</sub> (7.2.1).</i>
        #end if
    #end if
    #hide
    c_pe,d = c_pe
    c_pe,z = if(zone_cpe ≡ 9; c_pe,I; c_pe)
    'Alle zones van de gevel of het dak, voor de tabel en de lijnlast in 5.
    #if zone_cpe ≡ 0
        nz = 0
        k_z = 1
        zn_1 = "zelf"
        zn_2 = zn_1
        zn_3 = zn_1
        zn_4 = zn_1
        zn_5 = zn_1
        cz_1 = c_pe,z
        cz_2 = cz_1
        cz_3 = cz_1
        cz_4 = cz_1
        cz_5 = cz_1
        cd_1 = c_pe,d
        cd_2 = cd_1
        cd_3 = cd_1
        cd_4 = cd_1
        cd_5 = cd_1
    #else if zone_cpe ≤ 5
        nz = 5
        k_z = zone_cpe
        zn_1 = "A"
        zn_2 = "B"
        zn_3 = "C"
        zn_4 = "D"
        zn_5 = "E"
        cz_1 = cpe(-1.4; -1.2)
        cz_2 = cpe(-1.1; -0.8)
        cz_3 = -0.5
        cz_4 = cpe(1.0; 0.8)
        cz_5 = -0.5 - 0.2*min(max(hd - 1; 0); 4)/4
        cd_1 = cz_1
        cd_2 = cz_2
        cd_3 = cz_3
        cd_4 = cz_4
        cd_5 = cz_5
    #else
        nz = 4
        k_z = zone_cpe - 5
        zn_1 = "F"
        zn_2 = "G"
        zn_3 = "H"
        zn_4 = "I"
        zn_5 = ""
        cz_1 = cpe(-2.5; -1.8)
        cz_2 = cpe(-2.0; -1.2)
        cz_3 = cpe(-1.2; -0.7)
        cz_4 = c_pe,I
        cz_5 = 0
        cd_1 = cz_1
        cd_2 = cz_2
        cd_3 = cz_3
        cd_4 = 0.2
        cd_5 = 0
    #end if
    #show
#else if onderdeel ≡ 2
    #hide
    'Tabel NB.10 – 7.4a (θ = 0°) per helling: c_pe,10 en c_pe,1 van F, G, H, I en J; dan de druk op F en G, op H en op J.
    T_0 = [5; 15; 30; 45; 60; 75 | -1.7; -0.9; -0.5; 0; 0; 0 | -2.5; -2.0; -1.5; 0; 0; 0 | -1.2; -0.8; -0.5; 0; 0; 0 | -2.0; -1.5; -1.5; 0; 0; 0 | -0.6; -0.3; -0.2; 0; 0; 0 | -1.2; -1.0; -1.0; 0; 0; 0 | -0.6; -0.4; -0.4; -0.2; -0.2; -0.2 | -1.0; -1.0; -1.0; -1.0; -1.0; -1.0 | -0.6; -1.0; -0.5; -0.3; -0.3; -0.3 | -1.0; -1.5; -1.0; -1.0; -1.0; -1.0 | 0; 0.2; 0.7; 0.7; 0.7; 0.8 | 0; 0.2; 0.4; 0.6; 0.7; 0.8 | 0.2; 0; 0; 0; 0; 0]
    'Tabel NB.11 – 7.4b (θ = 90°) per helling: c_pe,10 en c_pe,1 van F, G, H en I.
    T_90 = [5; 15; 30; 45; 60; 75 | -1.6; -1.3; -1.1; -1.1; -1.1; -1.1 | -2.2; -2.0; -1.5; -1.5; -1.5; -1.5 | -1.3; -1.3; -1.4; -1.4; -1.2; -1.2 | -2.0; -2.0; -2.0; -2.0; -2.0; -2.0 | -0.7; -0.6; -0.8; -0.9; -0.8; -0.8 | -1.2; -1.2; -1.2; -1.2; -1.0; -1.0 | -0.6; -0.5; -0.5; -0.5; -0.5; -0.5 | -1.0; -1.0; -1.0; -1.0; -1.0; -1.0]
    a_zd = min(max(α_zd/(1 deg); 5); 75)
    θ_90 = if(zone_zd ≥ 6; 1; 0)
    k_z = if(θ_90 ≡ 1; zone_zd - 5; zone_zd)
    zn_1 = "F"
    zn_2 = "G"
    zn_3 = "H"
    zn_4 = "I"
    zn_5 = "J"
    #if θ_90 ≡ 0
        'Opmerking 2 bij de tabel: alleen lineair tussen waarden met hetzelfde teken. Boven 45° hebben F, G en H alleen druk, I en J alleen zuiging.
        nz = 5
        cd_1 = ip(T_0; 12; a_zd)
        cd_2 = cd_1
        cd_3 = ip(T_0; 13; a_zd)
        cz_1 = if(a_zd ≤ 45; cpe(ip(T_0; 3; a_zd); ip(T_0; 2; a_zd)); cd_1)
        cz_2 = if(a_zd ≤ 45; cpe(ip(T_0; 5; a_zd); ip(T_0; 4; a_zd)); cd_2)
        cz_3 = if(a_zd ≤ 45; cpe(ip(T_0; 7; a_zd); ip(T_0; 6; a_zd)); cd_3)
        cz_4 = cpe(ip(T_0; 9; a_zd); ip(T_0; 8; a_zd))
        cz_5 = cpe(ip(T_0; 11; a_zd); ip(T_0; 10; a_zd))
        cd_4 = if(a_zd ≥ 15 and a_zd ≤ 45; 0; cz_4)
        cd_5 = if(a_zd ≤ 45; ip(T_0; 14; a_zd); cz_5)
    #else
        nz = 4
        zn_5 = ""
        cz_1 = cpe(ip(T_90; 3; a_zd); ip(T_90; 2; a_zd))
        cz_2 = cpe(ip(T_90; 5; a_zd); ip(T_90; 4; a_zd))
        cz_3 = cpe(ip(T_90; 7; a_zd); ip(T_90; 6; a_zd))
        cz_4 = cpe(ip(T_90; 9; a_zd); ip(T_90; 8; a_zd))
        cz_5 = 0
        cd_1 = cz_1
        cd_2 = cz_2
        cd_3 = cz_3
        cd_4 = cz_4
        cd_5 = 0
    #end if
    c_pe,z = kies(k_z; cz_1; cz_2; cz_3; cz_4; cz_5)
    c_pe,d = kies(k_z; cd_1; cd_2; cd_3; cd_4; cd_5)
    #show
    #if α_zd < 5 deg
        '<b style="color:#b45309">α &lt; 5°: dit is een plat dak (7.2.3); hier gerekend met de waarden bij 5°.</b>
    #else if α_zd > 75 deg
        '<b style="color:#b45309">α &gt; 75°: gerekend met de waarden bij 75°.</b>
    #end if
    #if θ_90 ≡ 0
        c_pe,z', zuiging (tabel NB.10 – 7.4a)<span class="kolom-2"></span>'
        c_pe,d', druk<span class="kolom-2"></span>'
        '<i>Lineair tussen de hellingen, alleen tussen waarden met hetzelfde teken (opmerking 2); boven 45° hebben F, G en H alleen druk, I en J alleen zuiging. Zuiging logaritmisch in A tussen c<sub>pe,1</sub> en c<sub>pe,10</sub> (7.2.1).</i><span class="alleen-scherm"></span>
    #else
        c_pe,z', tabel NB.11 – 7.4b, alleen zuiging; logaritmisch in A (7.2.1)'
    #end if
#else if onderdeel ≡ 3
    #hide
    'Tabel 7.6 per helling: maximaal voor alle φ van A, B en C; minimaal bij φ = 0 van A, B en C; minimaal bij φ = 1 van A, B en C.
    T_ov = [0; 5; 10; 15; 20; 25; 30 | 0.5; 0.8; 1.2; 1.4; 1.7; 2.0; 2.2 | 1.8; 2.1; 2.4; 2.7; 2.9; 3.1; 3.2 | 1.1; 1.3; 1.6; 1.8; 2.1; 2.3; 2.4 | -0.6; -1.1; -1.5; -1.8; -2.2; -2.6; -3.0 | -1.3; -1.7; -2.0; -2.4; -2.8; -3.2; -3.8 | -1.4; -1.8; -2.1; -2.5; -2.9; -3.2; -3.6 | -1.5; -1.6; -1.6; -1.6; -1.6; -1.5; -1.5 | -1.8; -2.2; -2.6; -2.9; -2.9; -2.5; -2.2 | -2.2; -2.5; -2.7; -3.0; -3.0; -2.8; -2.7]
    a_ov = min(max(α_ov/(1 deg); 0); 30)
    φ_b = min(max(φ_ov; 0); 1)
    nz = 3
    k_z = zone_ov
    zn_1 = "A"
    zn_2 = "B"
    zn_3 = "C"
    zn_4 = ""
    zn_5 = ""
    cd_1 = ip(T_ov; 2; a_ov)
    cd_2 = ip(T_ov; 3; a_ov)
    cd_3 = ip(T_ov; 4; a_ov)
    cz_1 = ip(T_ov; 5; a_ov) + φ_b*(ip(T_ov; 8; a_ov) - ip(T_ov; 5; a_ov))
    cz_2 = ip(T_ov; 6; a_ov) + φ_b*(ip(T_ov; 9; a_ov) - ip(T_ov; 6; a_ov))
    cz_3 = ip(T_ov; 7; a_ov) + φ_b*(ip(T_ov; 10; a_ov) - ip(T_ov; 7; a_ov))
    cz_4 = 0
    cz_5 = 0
    cd_4 = 0
    cd_5 = 0
    c_p,net,neer = kies(k_z; cd_1; cd_2; cd_3; 0; 0)
    c_p,net,op = kies(k_z; cz_1; cz_2; cz_3; 0; 0)
    #show
    #if α_ov > 30 deg
        '<b style="color:#b45309">α &gt; 30°: tabel 7.6 loopt tot 30°; gerekend met de waarden bij 30°.</b>
    #end if
    c_p,net,neer', neerwaarts, maximaal voor alle φ (tabel 7.6)<span class="kolom-2"></span>'
    c_p,net,op', opwaarts, lineair tussen φ = 0 en 1 (7.3(3))<span class="kolom-2"></span>'
    '<i>Lineair in α tussen de rijen van tabel 7.6. c<sub>p,net</sub> is het grootste plaatselijke drukverschil tussen boven- en onderzijde voor alle windrichtingen (7.3(5)); de overkapping als geheel rekent met c<sub>f</sub>. Aan lijzijde van de plaats met de grootste blokkering geldt φ = 0 (7.3(4)).</i><span class="alleen-scherm"></span>
#else
    #hide
    'Tabel NB.18 – 8 per h_1/h: zone A neerwaarts, opwaarts bij h_1/d_1 = 1,0 en 3,5; zone B idem.
    T_lf = [0.1; 0.2; 0.3; 0.4; 0.5; 0.6; 0.7; 0.8; 0.9; 1.0 | 1.1; 0.8; 0.7; 0.7; 0.7; 0.7; 0.7; 0.7; 0.7; 0.7 | -0.9; -0.9; -0.9; -1.0; -1.0; -1.1; -1.2; -1.4; -1.7; -2.0 | -1.4; -1.4; -1.4; -1.5; -1.5; -1.6; -1.7; -1.9; -2.2; -2.5 | 0.9; 0.5; 0.4; 0.3; 0.3; 0.3; 0.3; 0.3; 0.3; 0.3 | -0.2; -0.2; -0.2; -0.2; -0.2; -0.4; -0.7; -1.0; -1.3; -1.6 | -0.5; -0.5; -0.5; -0.5; -0.5; -0.7; -1.0; -1.3; -1.6; -1.9]
    #show
    r_h = min(max(h_1/z; 0.1); 1)', h_1/h met h = z, begrensd tot 0,1 … 1,0<span class="kolom-2"></span>'
    r_d = min(max(h_1/d_1; 1); 3.5)', h_1/d_1, begrensd tot 1,0 … 3,5<span class="kolom-2"></span>'
    #hide
    t_d = (r_d - 1)/2.5
    nz = 2
    k_z = zone_lf
    zn_1 = "A"
    zn_2 = "B"
    zn_3 = ""
    zn_4 = ""
    zn_5 = ""
    cd_1 = ip(T_lf; 2; r_h)
    cz_1 = ip(T_lf; 3; r_h) + t_d*(ip(T_lf; 4; r_h) - ip(T_lf; 3; r_h))
    cd_2 = ip(T_lf; 5; r_h)
    cz_2 = ip(T_lf; 6; r_h) + t_d*(ip(T_lf; 7; r_h) - ip(T_lf; 6; r_h))
    cz_3 = 0
    cz_4 = 0
    cz_5 = 0
    cd_3 = 0
    cd_4 = 0
    cd_5 = 0
    c_p,net,neer = kies(k_z; cd_1; cd_2; 0; 0; 0)
    c_p,net,op = kies(k_z; cz_1; cz_2; 0; 0; 0)
    #show
    c_p,net,neer', neerwaarts (tabel NB.18 – 8)<span class="kolom-2"></span>'
    c_p,net,op', opwaarts, lineair in h_1/h en h_1/d_1<span class="kolom-2"></span>'
    '<i>Neerwaarts en opwaarts allebei beschouwen (7.2.12). De referentiehoogte z bij 1 is hier de gebouwhoogte h.</i><span class="alleen-scherm"></span>
#end if

# 4. Netto winddruk (5.1, 5.2)

#if onderdeel ≤ 2
    @select inwendig "Inwendige druk (7.2.9)"
    Geen dominante gevel: c_pi = +0,2 of −0,3, de ongunstigste = 1
    Dominante gevel: c_pi invullen = 2
    @end
    #if inwendig ≡ 2
        c_pi = ?', 0,75 of 0,9 × c_pe ter plaatse van de openingen in de dominante gevel (7.2.9(5))'
        #hide
        c_pe,dom = if(abs(c_pe,z - c_pi) ≥ abs(c_pe,d - c_pi); c_pe,z; c_pe,d)
        cpi_z = c_pi
        cpi_d = c_pi
        #show
        w_net = q_p*(c_pe,dom - c_pi) to kN/m^2', negatief is zuiging'
        F_w = (cs_cd*c_pe,dom - c_pi)*q_p*A_bel to kN', kracht op het element (5.5, 5.6)'
    #else
        w_d = q_p*(c_pe,d + 0.3) to kN/m^2', met c_pi = −0,3, onderdruk binnen (7.2.9(6))'
        w_z = q_p*(c_pe,z - 0.2) to kN/m^2', met c_pi = +0,2, overdruk binnen'
        #if abs(w_z) ≥ abs(w_d)
            w_net = w_z', maatgevend: zuiging'
        #else
            w_net = w_d', maatgevend: druk'
        #end if
        #hide
        F_w,d = (cs_cd*c_pe,d + 0.3)*q_p*A_bel
        F_w,z = (cs_cd*c_pe,z - 0.2)*q_p*A_bel
        cpi_z = 0.2
        cpi_d = -0.3
        #show
        #if abs(F_w,z) ≥ abs(F_w,d)
            F_w = (cs_cd*c_pe,z - 0.2)*q_p*A_bel to kN', kracht op het element (5.5, 5.6); negatief is zuiging'
        #else
            F_w = (cs_cd*c_pe,d + 0.3)*q_p*A_bel to kN', kracht op het element (5.5, 5.6)'
        #end if
    #end if
#else
    w_neer = q_p*c_p,net,neer to kN/m^2', netto, neerwaarts<span class="kolom-2"></span>'
    w_op = q_p*c_p,net,op to kN/m^2', netto, opwaarts<span class="kolom-2"></span>'
    F_w,neer = cs_cd*c_p,net,neer*q_p*A_bel to kN', kracht op het element (5.5)<span class="kolom-2"></span>'
    F_w,op = cs_cd*c_p,net,op*q_p*A_bel to kN'<span class="kolom-2"></span>'
    #hide
    cpi_z = 0
    cpi_d = 0
    #show
#end if

# 5. Lijnlast op een element

#hide
x_el = 0 m
r_1 = 0 m
r_2 = 0 m
i_1 = k_z
i_2 = k_z
i_3 = k_z
#if onderdeel ≡ 1
    nb = if(zone_cpe ≡ 0 or zone_cpe ≡ 4 or zone_cpe ≡ 5; 1; 3)
#else if onderdeel ≡ 2
    nb = if(θ_90 ≡ 1; 3; 2)
#else if onderdeel ≡ 3
    nb = if(zone_ov ≡ 1; 1; 2)
#else
    nb = 2
#end if
#show
b_bel = ?*(m)', belastingbreedte van het element<span class="kolom-3"></span>'
#if nb > 1
    x_el = ?*(m)', afstand van de rand tot de belaste strook<span class="kolom-3"></span>'
    #if onderdeel ≤ 2
        b_geb = ?*(m)', breedte b van het gebouw dwars op de wind<span class="kolom-3"></span>'
        e_w = min(b_geb; 2*z) to m', e = min(b; 2h), met h = z (figuur 7.5 t/m 7.8)'
    #else if onderdeel ≡ 3
        #if zone_ov ≡ 2
            b_ov = ?*(m)', breedte b van de overkapping dwars op de wind<span class="kolom-3"></span>'
        #else
            d_ov = ?*(m)', diepte d in de windrichting, in het dakvlak<span class="kolom-3"></span>'
        #end if
    #else
        e_A = min(d_1/4; b_1/2) to m', breedte van zone A (figuur NB.4 – 6)'
    #end if
    #hide
    #if onderdeel ≡ 1
        #if zone_cpe ≤ 3
            r_1 = e_w/5
            r_2 = e_w
            i_1 = 1
            i_2 = 2
            i_3 = 3
        #else
            r_1 = e_w/10
            r_2 = e_w/2
            i_1 = if(k_z ≡ 1; 1; 2)
            i_2 = 3
            i_3 = 4
        #end if
    #else if onderdeel ≡ 2
        r_1 = e_w/10
        r_2 = if(θ_90 ≡ 1; e_w/2; r_1)
        i_1 = if(θ_90 ≡ 0 and k_z ≥ 4; 5; if(k_z ≡ 1; 1; 2))
        i_2 = if(θ_90 ≡ 0 and k_z ≥ 4; 4; 3)
        i_3 = if(θ_90 ≡ 1; 4; i_2)
    #else if onderdeel ≡ 3
        #if zone_ov ≡ 2
            r_1 = b_ov/10
        #else
            r_1 = d_ov/10
        #end if
        r_2 = r_1
        i_1 = zone_ov
        i_2 = 1
        i_3 = 1
    #else
        r_1 = e_A
        r_2 = r_1
        i_1 = 1
        i_2 = 2
        i_3 = 2
    #end if
    #show
    #if onderdeel ≡ 1
        #if zone_cpe ≤ 3
            '<i>Zijgevel, x vanaf de hoek aan loefzijde: zone A tot e/5, B tot e, daarna C (figuur 7.5).</i><span class="alleen-scherm"></span>
        #else
            '<i>Plat dak, x vanaf de rand aan loefzijde: F of G tot e/10, H tot e/2, daarna I (figuur 7.6). F ligt binnen e/4 van de zijrand; F of G volgt uit de gekozen zone.</i><span class="alleen-scherm"></span>
        #end if
    #else if onderdeel ≡ 2
        #if θ_90 ≡ 1
            '<i>x vanaf de kopgevel aan loefzijde: F of G tot e/10, H tot e/2, daarna I (figuur 7.8). F ligt binnen e/4 van de goot; F of G volgt uit de gekozen zone.</i><span class="alleen-scherm"></span>
        #else if k_z ≥ 4
            '<i>Lijvlak, x vanaf de nok: J tot e/10, daarna I (figuur 7.8).</i><span class="alleen-scherm"></span>
        #else
            '<i>Loefvlak, x vanaf de goot: F of G tot e/10, daarna H tot de nok (figuur 7.8). F ligt binnen e/4 van de kopgevel; F of G volgt uit de gekozen zone.</i><span class="alleen-scherm"></span>
        #end if
    #else if onderdeel ≡ 3
        '<i>x vanaf de rand evenwijdig aan de wind (zone B, tot b/10) of vanaf de rand aan loef- of lijzijde (zone C, tot d/10, gemeten in het dakvlak, 7.2.1(4)); daarna A.</i><span class="alleen-scherm"></span>
    #else
        '<i>x vanaf de zijrand van de luifel: A tot e, daarna B; de strook loopt over de volle uitkraging.</i><span class="alleen-scherm"></span>
    #end if
#end if
#hide
u_el = x_el
v_el = x_el + b_bel
l_1 = max(min(v_el; r_1) - u_el; 0 m)
l_2 = max(min(v_el; r_2) - max(u_el; r_1); 0 m)
l_3 = max(v_el - max(u_el; r_2); 0 m)
cz_b1 = kies(i_1; cz_1; cz_2; cz_3; cz_4; cz_5)
cz_b2 = kies(i_2; cz_1; cz_2; cz_3; cz_4; cz_5)
cz_b3 = kies(i_3; cz_1; cz_2; cz_3; cz_4; cz_5)
cd_b1 = kies(i_1; cd_1; cd_2; cd_3; cd_4; cd_5)
cd_b2 = kies(i_2; cd_1; cd_2; cd_3; cd_4; cd_5)
cd_b3 = kies(i_3; cd_1; cd_2; cd_3; cd_4; cd_5)
zb_1 = kies(i_1; zn_1; zn_2; zn_3; zn_4; zn_5)
zb_2 = kies(i_2; zn_1; zn_2; zn_3; zn_4; zn_5)
zb_3 = kies(i_3; zn_1; zn_2; zn_3; zn_4; zn_5)
q_el,z = (cs_cd*(cz_b1*l_1 + cz_b2*l_2 + cz_b3*l_3) - cpi_z*b_bel)*q_p to kN/m
q_el,d = (cs_cd*(cd_b1*l_1 + cd_b2*l_2 + cd_b3*l_3) - cpi_d*b_bel)*q_p to kN/m
'Per zone, als kaal getal in kN/m.
qp_r = q_p/(1 kN/m^2)
bb_r = b_bel/(1 m)
qz(kc) = round((cs_cd*kc - cpi_z)*qp_r*bb_r; 3)
qd(kc) = round((cs_cd*kc - cpi_d)*qp_r*bb_r; 3)
#show
#if nz > 0
    #if onderdeel ≤ 2
        'Per zone q = (c<sub>s</sub>c<sub>d</sub>·c<sub>pe</sub> − c<sub>pi</sub>)·q<sub>p</sub>·b<sub>bel</sub>, zuiging met c<sub>pi</sub> = 'cpi_z' en druk met c<sub>pi</sub> = 'cpi_d'; negatief is zuiging.
    #else
        'Per zone q = c<sub>s</sub>c<sub>d</sub>·c<sub>p,net</sub>·q<sub>p</sub>·b<sub>bel</sub>; positief is neerwaarts.
    #end if
    '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.25; margin:2px 0 6px;">
    '<tr style="display:'if(onderdeel ≤ 2; "table-row"; "none")'; border-bottom:1.5px solid #374151;"><th style="padding:1px 8px; text-align:left;">Zone</th><th style="padding:1px 8px; text-align:right;">c<sub>pe</sub> zuiging</th><th style="padding:1px 8px; text-align:right;">c<sub>pe</sub> druk</th><th style="padding:1px 8px; text-align:right;">q zuiging [kN/m]</th><th style="padding:1px 8px; text-align:right;">q druk [kN/m]</th></tr>
    '<tr style="display:'if(onderdeel ≤ 2; "none"; "table-row")'; border-bottom:1.5px solid #374151;"><th style="padding:1px 8px; text-align:left;">Zone</th><th style="padding:1px 8px; text-align:right;">c<sub>p,net</sub> opwaarts</th><th style="padding:1px 8px; text-align:right;">c<sub>p,net</sub> neerwaarts</th><th style="padding:1px 8px; text-align:right;">q opwaarts [kN/m]</th><th style="padding:1px 8px; text-align:right;">q neerwaarts [kN/m]</th></tr>
    '<tr style="font-weight:'if(k_z ≡ 1; 700; 400)'; border-bottom:1px solid #e5e7eb;"><td style="padding:0 8px;">'zn_1'</td><td style="padding:0 8px; text-align:right;">'round(cz_1; 3)'</td><td style="padding:0 8px; text-align:right;">'round(cd_1; 3)'</td><td style="padding:0 8px; text-align:right;">'qz(cz_1)'</td><td style="padding:0 8px; text-align:right;">'qd(cd_1)'</td></tr>
    '<tr style="font-weight:'if(k_z ≡ 2; 700; 400)'; border-bottom:1px solid #e5e7eb;"><td style="padding:0 8px;">'zn_2'</td><td style="padding:0 8px; text-align:right;">'round(cz_2; 3)'</td><td style="padding:0 8px; text-align:right;">'round(cd_2; 3)'</td><td style="padding:0 8px; text-align:right;">'qz(cz_2)'</td><td style="padding:0 8px; text-align:right;">'qd(cd_2)'</td></tr>
    '<tr style="display:'if(nz < 3; "none"; "table-row")'; font-weight:'if(k_z ≡ 3; 700; 400)'; border-bottom:1px solid #e5e7eb;"><td style="padding:0 8px;">'zn_3'</td><td style="padding:0 8px; text-align:right;">'round(cz_3; 3)'</td><td style="padding:0 8px; text-align:right;">'round(cd_3; 3)'</td><td style="padding:0 8px; text-align:right;">'qz(cz_3)'</td><td style="padding:0 8px; text-align:right;">'qd(cd_3)'</td></tr>
    '<tr style="display:'if(nz < 4; "none"; "table-row")'; font-weight:'if(k_z ≡ 4; 700; 400)'; border-bottom:1px solid #e5e7eb;"><td style="padding:0 8px;">'zn_4'</td><td style="padding:0 8px; text-align:right;">'round(cz_4; 3)'</td><td style="padding:0 8px; text-align:right;">'round(cd_4; 3)'</td><td style="padding:0 8px; text-align:right;">'qz(cz_4)'</td><td style="padding:0 8px; text-align:right;">'qd(cd_4)'</td></tr>
    '<tr style="display:'if(nz < 5; "none"; "table-row")'; font-weight:'if(k_z ≡ 5; 700; 400)'; border-bottom:1px solid #e5e7eb;"><td style="padding:0 8px;">'zn_5'</td><td style="padding:0 8px; text-align:right;">'round(cz_5; 3)'</td><td style="padding:0 8px; text-align:right;">'round(cd_5; 3)'</td><td style="padding:0 8px; text-align:right;">'qz(cz_5)'</td><td style="padding:0 8px; text-align:right;">'qd(cd_5)'</td></tr>
    '</table>
#end if
#if nb > 1
    'Strook van 'round(u_el/(1 m); 3)' tot 'round(v_el/(1 m); 3)' m vanaf de rand:<span style="display:'if(l_1 > 0 m; "inline"; "none")'; margin-left:0.5em;">zone 'zb_1' over 'round(l_1/(1 m); 3)' m</span><span style="display:'if(l_2 > 0 m; "inline"; "none")'; margin-left:0.5em;">zone 'zb_2' over 'round(l_2/(1 m); 3)' m</span><span style="display:'if(l_3 > 0 m; "inline"; "none")'; margin-left:0.5em;">zone 'zb_3' over 'round(l_3/(1 m); 3)' m</span>
#end if
#if onderdeel ≤ 2
    q_el,z', zuiging op het element, de som over de zones van de strook<span class="kolom-2"></span>'
    q_el,d', druk op het element<span class="kolom-2"></span>'
#else
    q_el,z', opwaarts op het element, de som over de zones van de strook<span class="kolom-2"></span>'
    q_el,d', neerwaarts op het element<span class="kolom-2"></span>'
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
