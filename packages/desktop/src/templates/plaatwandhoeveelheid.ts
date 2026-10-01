/**
 * Bruto betonvolume en staalmassa voor gelijke rechthoekige platen of wanden.
 * Vier netrichtingen en haarspelden worden als hoeveelheden geraamd;
 * benodigde wapening, dekking en sterkte worden niet getoetst.
 */
export const plaatwandhoeveelheid = `"Plaat- en wandhoeveelheden

'<i>Raming voor gelijke rechthoekige platen of wanden. De randafstand is de afstand van de rand tot de hartlijn van de buitenste staaf. Het berekende aantal staven rondt naar boven af, zodat de werkelijke tussenafstand hoogstens de gekozen h.o.h.-afstand is. Geef de werkelijke kniplengte per staaf op; haken en overlap moeten daarin zijn verwerkt. Betonvolume is bruto.</i><span class="alleen-scherm"></span>

# 1. Elementen en beton

n_el = ?', aantal gelijke elementen'
L_p = ?*(mm)', lengte<span class="kolom-3"></span>'
B_p = ?*(mm)', breedte<span class="kolom-3"></span>'
t_p = ?*(mm)', dikte<span class="kolom-3"></span>'
V_extra = ?*(m^3)', extra beton per element<span class="kolom-3"></span>'
a_rand = ?*(mm)', randafstand tot hart buitenste staaf'

# 2. Onder- of binnenzijde

d_ol = ?*(mm)', diameter staven in lengterichting<span class="kolom-3"></span>'
s_ol = ?*(mm)', h.o.h. dwars op lengterichting<span class="kolom-3"></span>'
l_ol = ?*(mm)', kniplengte per staaf<span class="kolom-3"></span>'
d_ob = ?*(mm)', diameter staven in breedterichting<span class="kolom-3"></span>'
s_ob = ?*(mm)', h.o.h. dwars op breedterichting<span class="kolom-3"></span>'
l_ob = ?*(mm)', kniplengte per staaf<span class="kolom-3"></span>'

# 3. Boven- of buitenzijde

d_bl = ?*(mm)', diameter staven in lengterichting<span class="kolom-3"></span>'
s_bl = ?*(mm)', h.o.h. dwars op lengterichting<span class="kolom-3"></span>'
l_bl = ?*(mm)', kniplengte per staaf<span class="kolom-3"></span>'
d_bb = ?*(mm)', diameter staven in breedterichting<span class="kolom-3"></span>'
s_bb = ?*(mm)', h.o.h. dwars op breedterichting<span class="kolom-3"></span>'
l_bb = ?*(mm)', kniplengte per staaf<span class="kolom-3"></span>'

# 4. Haarspelden en extra staal per element

n_h = ?', aantal haarspelden<span class="kolom-3"></span>'
d_h = ?*(mm)', diameter haarspelden<span class="kolom-3"></span>'
l_h = ?*(mm)', totale kniplengte per haarspeld<span class="kolom-3"></span>'
m_extra = ?*(kg)', extra staalmassa per element'

# 5. Hoeveelheden

rho_st = 7850 kg/m^3', aangenomen dichtheid van wapeningsstaal'

#if n_el > 0 and n_el ≡ floor(n_el) and L_p > 0 mm and B_p > 0 mm and t_p > 0 mm and V_extra ≥ 0 m^3 and a_rand ≥ 0 mm and 2*a_rand < L_p and 2*a_rand < B_p and n_h ≥ 0 and n_h ≡ floor(n_h) and m_extra ≥ 0 kg and ((d_ol ≡ 0 mm and s_ol ≡ 0 mm and l_ol ≡ 0 mm) or (d_ol > 0 mm and s_ol > 0 mm and l_ol > 0 mm)) and ((d_ob ≡ 0 mm and s_ob ≡ 0 mm and l_ob ≡ 0 mm) or (d_ob > 0 mm and s_ob > 0 mm and l_ob > 0 mm)) and ((d_bl ≡ 0 mm and s_bl ≡ 0 mm and l_bl ≡ 0 mm) or (d_bl > 0 mm and s_bl > 0 mm and l_bl > 0 mm)) and ((d_bb ≡ 0 mm and s_bb ≡ 0 mm and l_bb ≡ 0 mm) or (d_bb > 0 mm and s_bb > 0 mm and l_bb > 0 mm)) and (n_h ≡ 0 or (d_h > 0 mm and l_h > 0 mm))
    V_el = L_p*B_p*t_p + V_extra to m^3', bruto betonvolume per element'
    V_totaal = n_el*V_el to m^3', totaal bruto betonvolume'

    #if d_ol > 0 mm
        n_ol = ceil((B_p - 2*a_rand)/s_ol) + 1', aantal staven onder, lengterichting'
        q_ol = rho_st*pi*d_ol^2/4 to kg/m', massa per meter'
        m_ol = n_ol*q_ol*l_ol to kg', staalmassa per element'
    #else
        n_ol = 0
        m_ol = 0 kg
    #end if
    #if d_ob > 0 mm
        n_ob = ceil((L_p - 2*a_rand)/s_ob) + 1', aantal staven onder, breedterichting'
        q_ob = rho_st*pi*d_ob^2/4 to kg/m', massa per meter'
        m_ob = n_ob*q_ob*l_ob to kg', staalmassa per element'
    #else
        n_ob = 0
        m_ob = 0 kg
    #end if
    #if d_bl > 0 mm
        n_bl = ceil((B_p - 2*a_rand)/s_bl) + 1', aantal staven boven, lengterichting'
        q_bl = rho_st*pi*d_bl^2/4 to kg/m', massa per meter'
        m_bl = n_bl*q_bl*l_bl to kg', staalmassa per element'
    #else
        n_bl = 0
        m_bl = 0 kg
    #end if
    #if d_bb > 0 mm
        n_bb = ceil((L_p - 2*a_rand)/s_bb) + 1', aantal staven boven, breedterichting'
        q_bb = rho_st*pi*d_bb^2/4 to kg/m', massa per meter'
        m_bb = n_bb*q_bb*l_bb to kg', staalmassa per element'
    #else
        n_bb = 0
        m_bb = 0 kg
    #end if
    #if n_h > 0
        q_h = rho_st*pi*d_h^2/4 to kg/m', massa per meter, haarspelden'
        m_h = n_h*q_h*l_h to kg', staalmassa haarspelden per element'
    #else
        m_h = 0 kg
    #end if

    m_st_el = m_ol + m_ob + m_bl + m_bb + m_h + m_extra to kg', staalmassa per element'
    m_st_totaal = n_el*m_st_el to kg', totale staalmassa'
    rho_w = m_st_el/V_el to kg/m^3', staalmassa per m³ beton'
#else
    'Vul positieve afmetingen, een toelaatbare randafstand, hele niet-negatieve aantallen en complete staafgroepen in. Extra beton en staal mogen niet negatief zijn. Geen hoeveelheden berekend.
#end if

'<i class="ook-afdruk">Dit blad raamt hoeveelheden; benodigde wapening, dekking, verankering en sterkte zijn niet getoetst.</i>
`;
