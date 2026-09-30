/**
 * Hoeveelheden van een prismatisch betonelement met langsstaven en beugels.
 * De staalmassa is een geometrische raming met 7850 kg/m³ als aangenomen
 * dichtheid; het blad bepaalt geen benodigde wapening of constructieve sterkte.
 */
export const wapeningshoeveelheid = `"Beton- en wapeningshoeveelheid

'<i>Raming voor gelijke prismatische balken, kolommen of poeren. Het betonvolume is bruto: de staven worden niet afgetrokken. Vul het aantal staven en hun werkelijke knip-/buiglengte per element in. Beugelmaat is de totale staaflengte per beugel, inclusief haken en overlap.</i><span class="alleen-scherm"></span>

# 1. Elementen en betonvolume

n_el = ?', aantal gelijke elementen'
b_el = ?*(mm)', breedte<span class="kolom-4"></span>'
h_el = ?*(mm)', hoogte<span class="kolom-4"></span>'
l_el = ?*(mm)', lengte<span class="kolom-4"></span>'
V_extra = ?*(m^3)', extra beton per element<span class="kolom-4"></span>'

# 2. Langswapening per element

n_1 = ?', groep 1, aantal staven<span class="kolom-3"></span>'
d_1 = ?*(mm)', diameter groep 1<span class="kolom-3"></span>'
l_1 = ?*(mm)', lengte per staaf groep 1<span class="kolom-3"></span>'
n_2 = ?', groep 2, aantal staven<span class="kolom-3"></span>'
d_2 = ?*(mm)', diameter groep 2<span class="kolom-3"></span>'
l_2 = ?*(mm)', lengte per staaf groep 2<span class="kolom-3"></span>'
n_3 = ?', groep 3, aantal staven<span class="kolom-3"></span>'
d_3 = ?*(mm)', diameter groep 3<span class="kolom-3"></span>'
l_3 = ?*(mm)', lengte per staaf groep 3<span class="kolom-3"></span>'

# 3. Beugels en extra staal per element

n_bgl = ?', aantal beugels per element<span class="kolom-3"></span>'
d_bgl = ?*(mm)', beugeldiameter<span class="kolom-3"></span>'
l_bgl = ?*(mm)', totale staaflengte per beugel<span class="kolom-3"></span>'
m_extra = ?*(kg)', extra staalmassa per element'

# 4. Hoeveelheden

rho_st = 7850 kg/m^3', aangenomen dichtheid van wapeningsstaal'

#if n_el > 0 and n_el ≡ floor(n_el) and b_el > 0 mm and h_el > 0 mm and l_el > 0 mm and V_extra ≥ 0 m^3 and n_1 ≥ 0 and n_1 ≡ floor(n_1) and n_2 ≥ 0 and n_2 ≡ floor(n_2) and n_3 ≥ 0 and n_3 ≡ floor(n_3) and n_bgl ≥ 0 and n_bgl ≡ floor(n_bgl) and m_extra ≥ 0 kg and (n_1 ≡ 0 or (d_1 > 0 mm and l_1 > 0 mm)) and (n_2 ≡ 0 or (d_2 > 0 mm and l_2 > 0 mm)) and (n_3 ≡ 0 or (d_3 > 0 mm and l_3 > 0 mm)) and (n_bgl ≡ 0 or (d_bgl > 0 mm and l_bgl > 0 mm))
    V_el = b_el*h_el*l_el + V_extra to m^3', bruto betonvolume per element'
    V_totaal = n_el*V_el to m^3', totaal betonvolume'

    q_1 = rho_st*pi*d_1^2/4 to kg/m', massa per meter, groep 1'
    q_2 = rho_st*pi*d_2^2/4 to kg/m', massa per meter, groep 2'
    q_3 = rho_st*pi*d_3^2/4 to kg/m', massa per meter, groep 3'
    q_bgl = rho_st*pi*d_bgl^2/4 to kg/m', massa per meter, beugels'
    m_1 = n_1*q_1*l_1 to kg', massa groep 1 per element'
    m_2 = n_2*q_2*l_2 to kg', massa groep 2 per element'
    m_3 = n_3*q_3*l_3 to kg', massa groep 3 per element'
    m_bgl = n_bgl*q_bgl*l_bgl to kg', massa beugels per element'
    m_st_el = m_1 + m_2 + m_3 + m_bgl + m_extra to kg', staalmassa per element'
    m_st_totaal = n_el*m_st_el to kg', totale staalmassa'
    rho_w = m_st_el/V_el to kg/m^3', staalgewicht per m³ beton'
#else
    'Vul positieve afmetingen en hele, niet-negatieve aantallen in. Extra beton en extra staal mogen niet negatief zijn. Vul gebruikte staafgroepen volledig in. Geen hoeveelheden berekend.
#end if

#if n_1 > 0 and (d_1 ≤ 0 mm or l_1 ≤ 0 mm)
    'Groep 1 is onvolledig: vul diameter en staaflengte in.
#end if
#if n_2 > 0 and (d_2 ≤ 0 mm or l_2 ≤ 0 mm)
    'Groep 2 is onvolledig: vul diameter en staaflengte in.
#end if
#if n_3 > 0 and (d_3 ≤ 0 mm or l_3 ≤ 0 mm)
    'Groep 3 is onvolledig: vul diameter en staaflengte in.
#end if
#if n_bgl > 0 and (d_bgl ≤ 0 mm or l_bgl ≤ 0 mm)
    'Beugelinvoer is onvolledig: vul diameter en staaflengte in.
#end if

'<i class="ook-afdruk">Dit blad raamt hoeveelheden; benodigde wapening, dekking, verankering en sterkte zijn niet getoetst.</i>
`;
