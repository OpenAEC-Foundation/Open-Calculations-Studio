/**
 * Gording — houten dakgording volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking (GORDINGBEREKENING): belasting ontbonden
 * loodrecht (⊥, sterke as y) en evenwijdig (∥, zwakke as z) aan het dakvlak,
 * de belastingsgevallen permanent, veranderlijk (Q_k en q_k), sneeuw en wind,
 * BGT-doorbuiging per richting en UGT met dubbele buiging §6.1.6 + afschuiving §6.1.7.
 *
 * Gecalibreerd op 8 referentieberekeningen (document1 t/m document8) plus zeven
 * windvarianten — zie scripts/check-gording.mjs. q_p volgt uit windgebied,
 * terreincategorie (projectgegevens) en z_e (bladinvoer).
 *
 * In beide rekenwijzen aangevuld (scripts/check-gording-aanvullend.mjs):
 * - k_r volgens (NB.5.1) alleen binnen 0 < k_r ≤ 1, daarbuiten geen reductie;
 * - combinatie 5: 0,9·G + γ_Q·W opwaarts, met c_pi = +0,2 en c_pe bij zuiging
 *   als invoer, plus kip van de onderrand §6.3.3 en de verankeringskracht;
 * - oplegdruk §6.1.5.
 * Splitspunten via rekenwijze: eigen gewicht (register punt 8), 6.10a
 * (punt 10) en de maatgevende combinatie voor 6.11/6.12 (punt 13).
 */

export const gording = `"Gording — houten dakgording volgens EN 1995-1-1

'<i>Gording op twee steunpunten; de belasting wordt ontbonden loodrecht (⊥, sterke as y) en evenwijdig (∥, zwakke as z) aan het dakvlak: dubbele buiging §6.1.6.</i>

# 1. Profiel & materiaal

@select profiel "Profiel (b×h)"
  58 × 150 = 1
  71 × 171 = 2
  71 × 196 = 3
  85 × 220 = 4
  85 × 250 = 5
  100 × 250 = 6
  100 × 300 = 7
  96 × 296 = 8
@end

@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
@end

@select klimaatklasse "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

#hide
'Profielmatrix [id | b(mm) | h(mm)]
profielen = [1; 2; 3; 4; 5; 6; 7; 8 |58; 71; 71; 85; 85; 100; 100; 96 |150; 171; 196; 220; 250; 250; 300; 296]
'Materiaalmatrix EN 338 [id | f_m,k | f_v,k | E_mean | ρ_mean | f_c,90,k | E_0,05]
materialen = [1; 2; 3 |18; 24; 30 |3.4; 4.0; 4.0 |9000; 11000; 12000 |380; 420; 460 |2.2; 2.5; 2.7 |6000; 7400; 8000]
b_g = hlookup(profielen; profiel; 1; 2)*mm
h_g = hlookup(profielen; profiel; 1; 3)*mm
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
ρ_mean = hlookup(materialen; sterkteklasse; 1; 5)*kg/m^3
f_c90k = hlookup(materialen; sterkteklasse; 1; 6)*N/mm^2
E_005 = hlookup(materialen; sterkteklasse; 1; 7)*N/mm^2
γ_M = 1.30
k_m = 0.7
'Belastingsduurklasse (tabel 3.1): verdeelde dakbelasting middellang,
'puntlast/sneeuw/wind kort, 6.10a (alleen G) blijvend.
k_mod_k = if(klimaatklasse ≡ 3; 0.70; 0.90)
k_mod_m = if(klimaatklasse ≡ 3; 0.65; 0.80)
k_mod_b = if(klimaatklasse ≡ 3; 0.50; 0.60)
k_def = if(klimaatklasse ≡ 1; 0.60; if(klimaatklasse ≡ 2; 0.80; 2.00))
k_hy = if(h_g < 150*mm; min((150*mm/h_g)^0.2; 1.3); 1)
k_hz = if(b_g < 150*mm; min((150*mm/b_g)^0.2; 1.3); 1)
#show
b_g
h_g
f_mk
E_mean

# 2. Doorsnede-eigenschappen

A = b_g*h_g
I_y = b_g*h_g^3/12', sterke as'
I_z = h_g*b_g^3/12', zwakke as'
W_y = I_y/(h_g/2)
W_z = I_z/(b_g/2)
#hide
'Splitspunt eigen gewicht (register punt 8).
g_eig_xc = A*5.5*kN/m^3 to kN/m
g_eig_nb = A*ρ_mean*9.81*m/s^2 to kN/m
g_eig = if(rekenwijze ≡ 1; g_eig_xc; g_eig_nb)
#show
#if rekenwijze ≡ 1
    'Eigen gewicht met 550 kg/m³ en g = 10 m/s²:
#else
    'Eigen gewicht met ρ<sub>mean</sub> = 'ρ_mean' kg/m³ (EN 338) en g = 9,81 m/s²:
#end if
g_eig

# 3. Geometrie

@select dakType "Daktype"
  Plat dak = 1
  Schuin dak = 2
@end

l_h = ?*(mm)', horizontale projectie van het dakvlak'
h_v = ?*(mm)', hoogte (nok)'
L_dag = ?*(mm)', dagmaat (overspanning gording)'
a_opl = ?*(mm)', opleglengte per oplegging'
n_gording = ?', aantal gordingen'

#hide
h_eff = if(dakType ≡ 1; 0*mm; h_v)
#show
slope = sqrt(l_h^2 + h_eff^2)', daklengte'
α_deg = atan(h_eff/l_h)*180/pi', dakhelling [°]'
cos_α = l_h/slope
sin_α = h_eff/slope
hoh = slope/(n_gording + 1)', h.o.h. gordingen langs het dakvlak'
L_th = L_dag + a_opl', theoretische overspanning'

'<h6>Dakbeschot</h6>
t_beschot = ?*(mm)', dikte dakbeschot'
@select I_manual "I dakbeschot"
  Automatisch (1000·t³/12) = 0
  Handmatig = 1
@end
I_beschot = ?*(mm^4)', I dakbeschot (bij handmatig)'
E_beschot = ?*(N/mm^2)', E dakbeschot'
#if I_manual ≡ 1
    I_db = I_beschot', per m breedte'
#else
    I_db = 1000*mm*t_beschot^3/12', per m breedte'
#end if

# 4. Belastingen

g_pannen = ?*(kN/m^2)', e.g. pannen'
g_panlat = ?*(kN/m^2)', e.g. panlat + tengel'
g_dakplaat = ?*(kN/m^2)', e.g. dakplaat'
g_plafond = ?*(kN/m^2)', e.g. plafond'
P_gk = g_pannen + g_panlat + g_dakplaat + g_plafond', permanente dakbelasting'
q_par = ?*(kN/m)', door muurplaat/nokgording opgenomen ∥-belasting'
Q_k = ?*(kN)', geconcentreerde last (NEN-EN 1991-1-1 NB, 6.3.4.2: 2 kN direct onder dakbeschot)'
q_var = ?*(kN/m^2)', verdeelde veranderlijke belasting (grondvlak)'
@select sk_manual "Sneeuwbelasting op de grond"
  NL-waarde 0,70 kN/m² = 0
  Zelf invullen = 1
@end
#if sk_manual ≡ 1
    s_k = ?*(kN/m^2)', karakteristieke sneeuwbelasting (grondvlak)'
#else
    s_k = 0.70 kN/m^2', grondwaarde (NB bij NEN-EN 1991-1-3)'
#end if

'<h6>Wind</h6>
@select windbron "Extreme stuwdruk q_p"
  Berekenen uit de projectgegevens = 1
  Zelf invullen = 0
@end

z_wind = ?*(m)', referentiehoogte z_e boven maaiveld'
q_wind_hand = ?*(kN/m^2)', q_p — alleen bij "zelf invullen"'
c_pe_zuig = ?', c_pe bij zuiging voor de zone van deze gording (tabel NB.7 – 7.2, NB.10 – 7.4a of NB.11 – 7.4b)'

#hide
'Tabel NB.1 — fundamentele basiswindsnelheid per windgebied.
vb0_ruw = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
'Tabel NB.3-4.1 — ruwheidslengte z_0 en minimumhoogte z_min per terreincategorie.
z0_ruw = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
zmin_ruw = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
'Kale getallen in meters; zo hoeft de logaritme geen eenheden te dragen.
zw_ruw = z_wind/(1*m)
ze_ruw = max(zw_ruw; zmin_ruw)
verh = ze_ruw/z0_ruw
vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*vb0_ruw
#show
#if windbron ≡ 1
    v_b0 = vb0_ruw*(m/s)', basiswindsnelheid (tabel NB.1); c_dir = c_season = 1'
    z_e = ze_ruw*(m)', ten minste z_min'
    k_r_w = 0.19*(z0_ruw/0.05)^0.07', terreinfactor (4.5)'
    c_r = k_r_w*log(verh)', ruwheidsfactor (4.4); c_o = 1'
    v_m = vm_ruw*(m/s)', gemiddelde windsnelheid (4.3)'
    I_v = 1/log(verh)', turbulentie-intensiteit (4.7); k_l = 1'
    q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', extreme stuwdruk (4.8), ρ = 1,25 kg/m³'
    #hide
    q_wind = q_p
    #show
#else
    q_wind = q_wind_hand', extreme stuwdruk q_p, zelf ingevuld'
#end if

# 5. Belastingsgeval 1 — Permanent

P_gy = P_gk*cos_α
P_gz = P_gk*sin_α
P_gz_tot = slope*P_gz + n_gording*g_eig*sin_α to kN/m', totale ∥-last over het dak'
q_gz = max(0*(kN/m); (P_gz_tot - q_par)/n_gording) to kN/m', ∥-lijnlast per gording, na aftrek van q_∥'
q_gy = hoh*P_gy + g_eig*cos_α to kN/m', ⊥-lijnlast per gording'
M_gy = q_gy*L_th^2/8 to kN*m
u_gy = 5/384*q_gy*L_th^4/(E_mean*I_y) to mm
M_gz = q_gz*L_th^2/8 to kN*m
u_gz = 5/384*q_gz*L_th^4/(E_mean*I_z) to mm
#hide
V_gy = q_gy*L_th/2 to kN
V_gz = q_gz*L_th/2 to kN
#show

# 6. Belastingsgeval 2 — Veranderlijke belasting

'<h6>Geconcentreerde last Q<sub>k</sub></h6>
k_r_0 = 0.37 + 0.8*hoh/(1*m) - E_beschot*I_db/(5*10^10*N*mm^2)', formule (NB.5.1), NEN-EN 1995-1-1 NB 5.2(5)'
#if k_r_0 ≤ 0
    'k<sub>r,0</sub> ≤ 0 ligt buiten het geldigheidsgebied 0 &lt; k<sub>r</sub> ≤ 1 van (NB.5.1): geen reductie.
    k_r = 1', concentratiefactor'
#else
    k_r = min(1; k_r_0)', concentratiefactor'
#end if
F_Qy = Q_k*cos_α*k_r
F_Qz = Q_k*sin_α*k_r
Mc_y = F_Qy*L_th/4 to kN*m
uc_y = 1/48*F_Qy*L_th^3/(E_mean*I_y) to mm
Mc_z = F_Qz*L_th/4 to kN*m
uc_z = 1/48*F_Qz*L_th^3/(E_mean*I_z) to mm
#hide
Vc_y = Q_k*cos_α to kN
Vc_z = Q_k*sin_α to kN
'De verdeelde last is een eigen combinatie; zonder q_k doet die niet mee.
heeft_q = if(q_var ≤ 0*(kN/m^2); 0; 1)
Md_y = 0*kN*m
Md_z = 0*kN*m
Vd_y = 0*kN
Vd_z = 0*kN
ud_y = 0*mm
ud_z = 0*mm
#show
#if heeft_q ≡ 1
    '<h6>Verdeelde last q<sub>k</sub></h6>
    q_vv = hoh*q_var*cos_α to kN/m', verticale lijnlast per gording'
    Md_y = q_vv*cos_α*L_th^2/8 to kN*m
    ud_y = 5/384*q_vv*cos_α*L_th^4/(E_mean*I_y) to mm
    Md_z = q_vv*sin_α*L_th^2/8 to kN*m
    ud_z = 5/384*q_vv*sin_α*L_th^4/(E_mean*I_z) to mm
    #hide
    Vd_y = q_vv*cos_α*L_th/2 to kN
    Vd_z = q_vv*sin_α*L_th/2 to kN
    #show
#end if

# 7. Belastingsgeval 3 — Sneeuw

@select mu1_manual "Vormcoëfficiënt μ_1"
  Uit de dakhelling (tabel 5.2) = 0
  Zelf invullen = 1
@end
#if mu1_manual ≡ 1
    mu1_val = ?', vormcoëfficiënt, zelf ingevuld'
    μ_1 = mu1_val
#else if α_deg ≤ 30
    μ_1 = 0.8', tabel 5.2, α ≤ 30°'
#else if α_deg < 60
    μ_1 = 0.8*(60 - α_deg)/30', tabel 5.2'
#else
    μ_1 = 0', tabel 5.2, α ≥ 60°'
#end if
P_sn = μ_1*s_k', sneeuw op het dak (grondvlak)'
q_sn = hoh*P_sn*cos_α to kN/m', verticale lijnlast per gording'
q_sy = q_sn*cos_α
q_sz = q_sn*sin_α
M_sy = q_sy*L_th^2/8 to kN*m
u_sy = 5/384*q_sy*L_th^4/(E_mean*I_y) to mm
M_sz = q_sz*L_th^2/8 to kN*m
u_sz = 5/384*q_sz*L_th^4/(E_mean*I_z) to mm
#hide
V_sy = q_sy*L_th/2 to kN
V_sz = q_sz*L_th/2 to kN
#show

# 8. Belastingsgeval 4 — Wind

'Wind werkt loodrecht op het dakvlak (⊥, sterke as).
#if dakType ≡ 1
    C_pe = -0.70', plat dak, zuiging'
#else
    C_pe = 0.70', schuin dak, druk'
#end if
C_pi = -0.30
P_w = (C_pe - C_pi)*q_wind', winddruk op het dakvlak'
q_wy = hoh*P_w to kN/m
M_wy = q_wy*L_th^2/8 to kN*m
u_wy = 5/384*q_wy*L_th^4/(E_mean*I_y) to mm
'<h6>Opwaarts</h6>
A_ref = hoh*L_th to m^2', belaste oppervlakte voor c_pe'
C_pi_op = 0.20', ongunstigste c_pi bij zuiging, §7.2.9(6)'
P_w_op = (c_pe_zuig - C_pi_op)*q_wind', netto zuiging op het dakvlak'
q_w_op = hoh*P_w_op to kN/m
M_w_op = q_w_op*L_th^2/8 to kN*m
#hide
V_wy = q_wy*L_th/2 to kN
V_w_op = q_w_op*L_th/2 to kN
#show

# 9. Toetsing BGT — doorbuiging (§7.2)

'w<sub>fin</sub> = (1 + k<sub>def</sub>)·u<sub>g</sub> + u<sub>var,leidend</sub>, met ψ<sub>2</sub> = 0 voor dak, sneeuw en wind.

@select controleer "Controleer doorbuiging"
  Ja = 1
  Nee = 0
@end
@select grensfactor "Toelaatbare bijkomende doorbuiging"
  0.004 × L = 0.004
  0.003 × L = 0.003
  0.002 × L = 0.002
@end
@select dubbele "Dubbele buiging (zwakke as)"
  Ja = 1
  Nee = 0
@end

#if controleer ≡ 1
    w_lim = grensfactor*L_th
    u_var_y = max(ud_y; uc_y; u_sy; u_wy)', maatgevende veranderlijke ⊥'
    w_fin_y = (1 + k_def)*u_gy + u_var_y
    UC_wy = w_fin_y/w_lim
    #if UC_wy ≤ 1.0
        'UC<sub>w,y</sub> = w<sub>fin,y</sub>/w<sub>lim</sub> = 'UC_wy'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>w,y</sub> = w<sub>fin,y</sub>/w<sub>lim</sub> = 'UC_wy'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
    #if dubbele ≡ 1
        u_var_z = max(ud_z; uc_z; u_sz)', maatgevende veranderlijke ∥'
        w_fin_z = (1 + k_def)*u_gz + u_var_z
        UC_wz = w_fin_z/w_lim
        #if UC_wz ≤ 1.0
            'UC<sub>w,z</sub> = w<sub>fin,z</sub>/w<sub>lim</sub> = 'UC_wz'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            'UC<sub>w,z</sub> = w<sub>fin,z</sub>/w<sub>lim</sub> = 'UC_wz'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #else
        #hide
        UC_wz = 0
        #show
    #end if
#else
    'Doorbuiging wordt niet getoetst.
    #hide
    UC_wy = 0
    UC_wz = 0
    #show
#end if

# 10. Toetsing UGT

#hide
f_myd_m = k_mod_m*f_mk*k_hy/γ_M
f_mzd_m = k_mod_m*f_mk*k_hz/γ_M
f_vd_m = k_mod_m*f_vk/γ_M
f_myd_b = k_mod_b*f_mk*k_hy/γ_M
f_mzd_b = k_mod_b*f_mk*k_hz/γ_M
f_vd_b = k_mod_b*f_vk/γ_M
#show
'<h6>10.1 Sterkte en belastingscombinaties</h6>
k_mod_k', kort'
f_myd_k = k_mod_k*f_mk*k_hy/γ_M', buiging sterke as'
f_mzd_k = k_mod_k*f_mk*k_hz/γ_M', buiging zwakke as'
f_vd_k = k_mod_k*f_vk/γ_M', afschuiving'
#if heeft_q ≡ 1
    k_mod_m', middellang (verdeelde last)'
    f_myd_m
    f_mzd_m
    f_vd_m
#end if
#if rekenwijze ≡ 0
    k_mod_b', blijvend (6.10a)'
    f_myd_b
    f_mzd_b
    f_vd_b
#end if

#hide
γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
γ_G_a = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
γ_G_inf = 0.9
'Splitspunt 6.10a (register punt 10): de referentie-uitwerking rekent alleen 6.10b.
w_610a = if(rekenwijze ≡ 1; 0; 1)
'0: 6.10a · 1: q_k · 2: Q_k · 3: sneeuw · 4: wind · 5: wind opwaarts met 0,9·G
My_0 = γ_G_a*M_gy
Mz_0 = γ_G_a*M_gz
Vz_0 = γ_G_a*V_gy
Vy_0 = γ_G_a*V_gz
My_1 = γ_G*M_gy + γ_Q*Md_y
Mz_1 = γ_G*M_gz + γ_Q*Md_z
Vz_1 = γ_G*V_gy + γ_Q*Vd_y
Vy_1 = γ_G*V_gz + γ_Q*Vd_z
My_2 = γ_G*M_gy + γ_Q*Mc_y
Mz_2 = γ_G*M_gz + γ_Q*Mc_z
Vz_2 = γ_G*V_gy + γ_Q*Vc_y
Vy_2 = γ_G*V_gz + γ_Q*Vc_z
My_3 = γ_G*M_gy + γ_Q*M_sy
Mz_3 = γ_G*M_gz + γ_Q*M_sz
Vz_3 = γ_G*V_gy + γ_Q*V_sy
Vy_3 = γ_G*V_gz + γ_Q*V_sz
My_4 = γ_G*M_gy + γ_Q*M_wy
Mz_4 = γ_G*M_gz
Vz_4 = γ_G*V_gy + γ_Q*V_wy
Vy_4 = γ_G*V_gz
My_5 = γ_G_inf*M_gy + γ_Q*M_w_op
Mz_5 = γ_G_inf*M_gz
Vz_5 = γ_G_inf*V_gy + γ_Q*V_w_op
Vy_5 = γ_G_inf*V_gz
c_par = if(dubbele ≡ 1; 1; 0)
'Per combinatie 6.11, 6.12 en 6.13 met de sterkte van haar duurklasse; een
'combinatie die niet meedoet telt als nul. Een negatief moment (opwaarts) telt
'met zijn grootte.
r611_0 = w_610a*(abs(My_0)/W_y/f_myd_b + c_par*k_m*abs(Mz_0)/W_z/f_mzd_b)
r611_1 = heeft_q*(abs(My_1)/W_y/f_myd_m + c_par*k_m*abs(Mz_1)/W_z/f_mzd_m)
r611_2 = abs(My_2)/W_y/f_myd_k + c_par*k_m*abs(Mz_2)/W_z/f_mzd_k
r611_3 = abs(My_3)/W_y/f_myd_k + c_par*k_m*abs(Mz_3)/W_z/f_mzd_k
r611_4 = abs(My_4)/W_y/f_myd_k + c_par*k_m*abs(Mz_4)/W_z/f_mzd_k
r611_5 = abs(My_5)/W_y/f_myd_k + c_par*k_m*abs(Mz_5)/W_z/f_mzd_k
r612_0 = w_610a*(k_m*abs(My_0)/W_y/f_myd_b + abs(Mz_0)/W_z/f_mzd_b)
r612_1 = heeft_q*(k_m*abs(My_1)/W_y/f_myd_m + abs(Mz_1)/W_z/f_mzd_m)
r612_2 = k_m*abs(My_2)/W_y/f_myd_k + abs(Mz_2)/W_z/f_mzd_k
r612_3 = k_m*abs(My_3)/W_y/f_myd_k + abs(Mz_3)/W_z/f_mzd_k
r612_4 = k_m*abs(My_4)/W_y/f_myd_k + abs(Mz_4)/W_z/f_mzd_k
r612_5 = k_m*abs(My_5)/W_y/f_myd_k + abs(Mz_5)/W_z/f_mzd_k
tau_0 = w_610a*1.5*sqrt(Vz_0^2 + Vy_0^2)/A/f_vd_b
tau_1 = heeft_q*1.5*sqrt(Vz_1^2 + Vy_1^2)/A/f_vd_m
tau_2 = 1.5*sqrt(Vz_2^2 + Vy_2^2)/A/f_vd_k
tau_3 = 1.5*sqrt(Vz_3^2 + Vy_3^2)/A/f_vd_k
tau_4 = 1.5*sqrt(Vz_4^2 + Vy_4^2)/A/f_vd_k
tau_5 = 1.5*sqrt(Vz_5^2 + Vy_5^2)/A/f_vd_k
'Index van de grootste (bij gelijkstand de eerste) en de waarde bij een index.
imax(a0; a1; a2; a3; a4; a5) = if(a0 ≥ max(a1; a2; a3; a4; a5); 0; if(a1 ≥ max(a2; a3; a4; a5); 1; if(a2 ≥ max(a3; a4; a5); 2; if(a3 ≥ max(a4; a5); 3; if(a4 ≥ a5; 4; 5)))))
kies(n; a0; a1; a2; a3; a4; a5) = if(n ≡ 0; a0; if(n ≡ 1; a1; if(n ≡ 2; a2; if(n ≡ 3; a3; if(n ≡ 4; a4; a5)))))
vet(i; n) = if(i ≡ n; 700; 400)
'Splitspunt keuze van de combinatie (register punt 13): de referentie-uitwerking
'neemt de combinatie met de hoogste van haar eigen twee waarden en drukt daarvan
'6.11 en 6.12 af; de norm neemt per formule de ongunstigste combinatie. Zonder
'dubbele buiging telt 6.12 niet mee in die keuze.
n_comb_xc = imax(max(r611_0; c_par*r612_0); max(r611_1; c_par*r612_1); max(r611_2; c_par*r612_2); max(r611_3; c_par*r612_3); max(r611_4; c_par*r612_4); max(r611_5; c_par*r612_5))
n_611_nb = imax(r611_0; r611_1; r611_2; r611_3; r611_4; r611_5)
n_612_nb = imax(r612_0; r612_1; r612_2; r612_3; r612_4; r612_5)
n_611 = if(rekenwijze ≡ 1; n_comb_xc; n_611_nb)
n_612 = if(rekenwijze ≡ 1; n_comb_xc; n_612_nb)
n_τ = imax(tau_0; tau_1; tau_2; tau_3; tau_4; tau_5)
#show
'Partiële factoren bij CC'CC' (NEN-EN 1990 NB, tabel NB.4/NB.5): 6.10b met γ<sub>G</sub> = 'γ_G' en γ<sub>Q</sub> = 'γ_Q'; gunstig γ<sub>G,inf</sub> = 'γ_G_inf'.
#if rekenwijze ≡ 0
    'Met ψ<sub>0</sub> = 0 voor dak, sneeuw en wind blijft van 6.10a 'γ_G_a'·G over, in de duurklasse blijvend.
#end if
'<table style="width:100%; border-collapse:collapse; font-size:0.9em;">
'<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Combinatie</th><th style="padding:1px 4px; text-align:right;">k<sub>mod</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>y,d</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">M<sub>z,d</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">V<sub>z,d</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">V<sub>y,d</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">(6.11)</th><th style="padding:1px 4px; text-align:right;">(6.12)</th><th style="padding:1px 4px; text-align:right;">(6.13)</th></tr>
#if rekenwijze ≡ 0
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">0: 'γ_G_a'·G (6.10a)</td><td style="padding:1px 4px; text-align:right;">'k_mod_b'</td><td style="padding:1px 4px; text-align:right;">'My_0'</td><td style="padding:1px 4px; text-align:right;">'Mz_0'</td><td style="padding:1px 4px; text-align:right;">'Vz_0'</td><td style="padding:1px 4px; text-align:right;">'Vy_0'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(0; n_611)';">'r611_0'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(0; n_612)';">'c_par*r612_0'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(0; n_τ)';">'tau_0'</td></tr>
#end if
#if heeft_q ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">1: 'γ_G'·G + 'γ_Q'·q<sub>k</sub></td><td style="padding:1px 4px; text-align:right;">'k_mod_m'</td><td style="padding:1px 4px; text-align:right;">'My_1'</td><td style="padding:1px 4px; text-align:right;">'Mz_1'</td><td style="padding:1px 4px; text-align:right;">'Vz_1'</td><td style="padding:1px 4px; text-align:right;">'Vy_1'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(1; n_611)';">'r611_1'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(1; n_612)';">'c_par*r612_1'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(1; n_τ)';">'tau_1'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">2: 'γ_G'·G + 'γ_Q'·Q<sub>k</sub></td><td style="padding:1px 4px; text-align:right;">'k_mod_k'</td><td style="padding:1px 4px; text-align:right;">'My_2'</td><td style="padding:1px 4px; text-align:right;">'Mz_2'</td><td style="padding:1px 4px; text-align:right;">'Vz_2'</td><td style="padding:1px 4px; text-align:right;">'Vy_2'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(2; n_611)';">'r611_2'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(2; n_612)';">'c_par*r612_2'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(2; n_τ)';">'tau_2'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">3: 'γ_G'·G + 'γ_Q'·S</td><td style="padding:1px 4px; text-align:right;">'k_mod_k'</td><td style="padding:1px 4px; text-align:right;">'My_3'</td><td style="padding:1px 4px; text-align:right;">'Mz_3'</td><td style="padding:1px 4px; text-align:right;">'Vz_3'</td><td style="padding:1px 4px; text-align:right;">'Vy_3'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(3; n_611)';">'r611_3'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(3; n_612)';">'c_par*r612_3'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(3; n_τ)';">'tau_3'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">4: 'γ_G'·G + 'γ_Q'·W</td><td style="padding:1px 4px; text-align:right;">'k_mod_k'</td><td style="padding:1px 4px; text-align:right;">'My_4'</td><td style="padding:1px 4px; text-align:right;">'Mz_4'</td><td style="padding:1px 4px; text-align:right;">'Vz_4'</td><td style="padding:1px 4px; text-align:right;">'Vy_4'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(4; n_611)';">'r611_4'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(4; n_612)';">'c_par*r612_4'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(4; n_τ)';">'tau_4'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:1px 4px;">5: 'γ_G_inf'·G + 'γ_Q'·W<sub>opwaarts</sub></td><td style="padding:1px 4px; text-align:right;">'k_mod_k'</td><td style="padding:1px 4px; text-align:right;">'My_5'</td><td style="padding:1px 4px; text-align:right;">'Mz_5'</td><td style="padding:1px 4px; text-align:right;">'Vz_5'</td><td style="padding:1px 4px; text-align:right;">'Vy_5'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(5; n_611)';">'r611_5'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(5; n_612)';">'c_par*r612_5'</td><td style="padding:1px 4px; text-align:right; font-weight:'vet(5; n_τ)';">'tau_5'</td></tr>
'</table>

'<h6>10.2 Buiging — §6.1.6</h6>
#hide
M_y,d = abs(kies(n_611; My_0; My_1; My_2; My_3; My_4; My_5))
M_z,d = abs(kies(n_611; Mz_0; Mz_1; Mz_2; Mz_3; Mz_4; Mz_5))
f_m,y,d = kies(n_611; f_myd_b; f_myd_m; f_myd_k; f_myd_k; f_myd_k; f_myd_k)
f_m,z,d = kies(n_611; f_mzd_b; f_mzd_m; f_mzd_k; f_mzd_k; f_mzd_k; f_mzd_k)
#show
'Maatgevend is combinatie 'n_611':
σ_m,y,d = M_y,d/W_y to N/mm^2
#if dubbele ≡ 1
    σ_m,z,d = M_z,d/W_z to N/mm^2
    UC_611 = σ_m,y,d/f_m,y,d + k_m*σ_m,z,d/f_m,z,d
    #if UC_611 ≤ 1.0
        'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>·σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_611'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>·σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_611'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    UC_611 = σ_m,y,d/f_m,y,d
    #if UC_611 ≤ 1.0
        'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_611'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> = 'UC_611'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#end if
#if dubbele ≡ 1
    #if n_612 ≠ n_611
        #hide
        M_y,d = abs(kies(n_612; My_0; My_1; My_2; My_3; My_4; My_5))
        M_z,d = abs(kies(n_612; Mz_0; Mz_1; Mz_2; Mz_3; Mz_4; Mz_5))
        f_m,y,d = kies(n_612; f_myd_b; f_myd_m; f_myd_k; f_myd_k; f_myd_k; f_myd_k)
        f_m,z,d = kies(n_612; f_mzd_b; f_mzd_m; f_mzd_k; f_mzd_k; f_mzd_k; f_mzd_k)
        #show
        'Voor (6.12) is combinatie 'n_612' maatgevend:
        σ_m,y,d = M_y,d/W_y to N/mm^2
        σ_m,z,d = M_z,d/W_z to N/mm^2
    #end if
    UC_612 = k_m*σ_m,y,d/f_m,y,d + σ_m,z,d/f_m,z,d
    #if UC_612 ≤ 1.0
        'UC<sub>6.12</sub> = k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_612'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>6.12</sub> = k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_612'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    #hide
    UC_612 = 0
    #show
#end if
#hide
'In de referentie-rekenwijze telt 6.10a niet mee; zou hij hoger uitkomen, dan
'staat dat als kanttekening op het blad.
r611_a = abs(My_0)/W_y/f_myd_b + c_par*k_m*abs(Mz_0)/W_z/f_mzd_b
r612_a = c_par*(k_m*abs(My_0)/W_y/f_myd_b + abs(Mz_0)/W_z/f_mzd_b)
toon_610a = (1 - w_610a)*bool(max(r611_a - UC_611; r612_a - UC_612) > 0)
#show
#if toon_610a ≡ 1
    '<i>6.10a ('γ_G_a'·G, blijvend) telt in de gekozen rekenwijze niet mee; meegeteld zou (6.11) = 'r611_a' en (6.12) = 'r612_a' zijn.</i>
#end if

'<h6>10.3 Afschuiving — §6.1.7 (6.13)</h6>
#hide
V_z,d = kies(n_τ; Vz_0; Vz_1; Vz_2; Vz_3; Vz_4; Vz_5)
V_y,d = kies(n_τ; Vy_0; Vy_1; Vy_2; Vy_3; Vy_4; Vy_5)
f_v,d = kies(n_τ; f_vd_b; f_vd_m; f_vd_k; f_vd_k; f_vd_k; f_vd_k)
#show
'Maatgevend is combinatie 'n_τ':
τ_d = 1.5*sqrt(V_z,d^2 + V_y,d^2)/A to N/mm^2', resultante van beide richtingen'
UC_afsch = τ_d/f_v,d
#if UC_afsch ≤ 1.0
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>10.4 Oplegdruk — §6.1.5</h6>
l_ef,c90 = a_opl + min(30*mm; a_opl; L_dag/2)', werkzame lengte; de 30 mm alleen aan de binnenzijde'
#if L_dag ≥ 2*h_g
    k_c,90 = 1.5', massief naaldhout op losse opleggingen, l_1 ≥ 2h (§6.1.5(4))'
#else
    k_c,90 = 1.0
#end if
#hide
c90_0 = w_610a*max(0*kN; Vz_0)/k_mod_b
c90_1 = heeft_q*max(0*kN; Vz_1)/k_mod_m
c90_2 = max(0*kN; Vz_2)/k_mod_k
c90_3 = max(0*kN; Vz_3)/k_mod_k
c90_4 = max(0*kN; Vz_4)/k_mod_k
c90_5 = max(0*kN; Vz_5)/k_mod_k
n_c90 = imax(c90_0; c90_1; c90_2; c90_3; c90_4; c90_5)
F_c,90,d = max(0*kN; kies(n_c90; Vz_0; Vz_1; Vz_2; Vz_3; Vz_4; Vz_5))
k_mod,c90 = kies(n_c90; k_mod_b; k_mod_m; k_mod_k; k_mod_k; k_mod_k; k_mod_k)
#show
'Maatgevend is combinatie 'n_c90':
σ_c,90,d = F_c,90,d/(b_g*l_ef,c90) to N/mm^2
f_c,90,d = k_mod,c90*f_c90k/γ_M
UC_c90 = σ_c,90,d/(k_c,90*f_c,90,d)
#if UC_c90 ≤ 1.0
    'UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_c90'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_c90'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>10.5 Opwaartse wind — kip van de onderrand §6.3.3 en verankering</h6>
#if My_5 < 0*kN*m
    'Combinatie 5 drukt de onderrand, die niet door het dakbeschot wordt gesteund.
    l_ef = 0.9*L_th - 0.5*h_g', tabel 6.1: gelijkmatige last op de getrokken rand'
    σ_m,crit = 0.78*b_g^2*E_005/(h_g*l_ef) to N/mm^2', (6.32)'
    λ_rel,m = sqrt(f_mk/σ_m,crit)', (6.30)'
    #if λ_rel,m ≤ 0.75
        k_crit = 1.0', (6.34)'
    #else if λ_rel,m ≤ 1.4
        k_crit = 1.56 - 0.75*λ_rel,m', (6.34)'
    #else
        k_crit = 1/λ_rel,m^2', (6.34)'
    #end if
    σ_m,y,d,5 = abs(My_5)/W_y to N/mm^2
    UC_kip = σ_m,y,d,5/(k_crit*f_myd_k)
    #if UC_kip ≤ 1.0
        'UC<sub>kip</sub> = σ<sub>m,y,d</sub>/(k<sub>crit</sub>·f<sub>m,y,d</sub>) = 'UC_kip'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>kip</sub> = σ<sub>m,y,d</sub>/(k<sub>crit</sub>·f<sub>m,y,d</sub>) = 'UC_kip'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    'Geen opwaartse buiging: de gedrukte bovenrand wordt door het dakbeschot gesteund.
    #hide
    UC_kip = 0
    #show
#end if
#if Vz_5 < 0*kN
    F_t,d = -Vz_5', trekkracht per oplegging uit combinatie 5, op te nemen door de verankering'
#else
    'Geen opwaartse oplegreactie.
#end if

# 11. Samenvatting

UC_max = max(UC_611; UC_612; UC_afsch; UC_c90; UC_kip; UC_wy; UC_wz)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Gording voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Gording voldoet niet</b></span>
#end if

'<hr/>
#if q_par > 0*(kN/m)
    '<i>De ∥-last is gelijk over de gordingen verdeeld; muurplaat en nokgording nemen samen q<sub>∥</sub> = 'q_par' kN/m op. Dat moet bij die onderdelen apart worden aangetoond.</i>
#else
    '<i>De ∥-last is gelijk over de gordingen verdeeld; muurplaat en nokgording nemen er niets van op.</i>
#end if
'<i>Het dakbeschot telt mee in k<sub>r</sub> en als zijdelingse steun van de bovenrand.</i>
`;
