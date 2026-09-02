/**
 * Gording — houten dakgording volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking (GORDINGBEREKENING): belasting ontbonden
 * loodrecht (⊥, sterke as y) en evenwijdig (∥, zwakke as z) aan het dakvlak,
 * 4 belastingsgevallen (permanent, geconcentreerd, sneeuw, wind), BGT-doorbuiging
 * per richting en UGT met dubbele buiging §6.1.6 + afschuiving §6.1.7.
 *
 * Gecalibreerd op 8 de referentie-uitwerking-referenties (document1 t/m document8) plus zeven
 * windvarianten — zie scripts/check-gording.mjs. Het blad rekent q_p sinds
 * 26-08-2026 zelf uit windgebied, terreincategorie en z_e (backlogpunt 1). Het blad toetst daarnaast 6.10a (1,35·G, duurklasse
 * blijvend), die de referentie-uitwerking overslaat en die op een steil dak maatgevend kan zijn.
 * Eigengewicht = A·5,5 kN/m³ (550 kg/m³ · g=10), de referentie-uitwerking-quirk. Dakbeschot (I,E)
 * beïnvloedt alléén de concentratiefactor k_r (kapt op 1,0).
 */

export const gording = `"Gording — houten dakgording volgens EN 1995-1-1

'<i>Toetsing van een houten dakgording op een enkelvoudige overspanning. Op een
'schuin dak wordt de belasting ontbonden loodrecht (⊥, sterke as y) en evenwijdig
'(∥, zwakke as z) aan het dakvlak → <b>dubbele buiging</b> (§6.1.6).</i>

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
'Materiaalmatrix [id | f_m,k | f_v,k | E_mean]
'Materiaalmatrix [id | f_m,k | f_v,k | E_mean | ρ_mean]
materialen = [1; 2; 3 |18; 24; 30 |3.4; 4.0; 4.0 |9000; 11000; 12000 |380; 420; 460]
b_g = hlookup(profielen; profiel; 1; 2)*mm
h_g = hlookup(profielen; profiel; 1; 3)*mm
f_mk = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_vk = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
ρ_mean = hlookup(materialen; sterkteklasse; 1; 5)*kg/m^3
γ_M = 1.30
k_m = 0.7
'Belastingsduurklasse per combinatie: een verdeelde veranderlijke dakbelasting
'is Middellang, een puntlast/sneeuw/wind Kort (Tabel 3.1).
k_mod_k = if(klimaatklasse ≡ 3; 0.70; 0.90)', kort'
k_mod_m = if(klimaatklasse ≡ 3; 0.65; 0.80)', middellang'
k_mod_b = if(klimaatklasse ≡ 3; 0.50; 0.60)', blijvend — voor 6.10a, die geen veranderlijke belasting bevat'
k_def = if(klimaatklasse ≡ 1; 0.60; if(klimaatklasse ≡ 2; 0.80; 2.00))
k_hy = if(h_g < 150*mm; min((150*mm/h_g)^0.2; 1.3); 1)
k_hz = if(b_g < 150*mm; min((150*mm/b_g)^0.2; 1.3); 1)
#show

'<h6>Gekozen profiel en materiaal</h6>
b_g
h_g
f_mk
E_mean
k_mod_k
k_mod_m
k_mod_b

f_myd_k = k_mod_k*f_mk*k_hy/γ_M', buigsterkte sterke as — kort'
f_mzd_k = k_mod_k*f_mk*k_hz/γ_M', buigsterkte zwakke as — kort'
f_vd_k = k_mod_k*f_vk/γ_M', afschuifsterkte — kort'
f_myd_m = k_mod_m*f_mk*k_hy/γ_M', buigsterkte sterke as — middellang'
f_mzd_m = k_mod_m*f_mk*k_hz/γ_M', buigsterkte zwakke as — middellang'
f_vd_m = k_mod_m*f_vk/γ_M', afschuifsterkte — middellang'
f_myd_b = k_mod_b*f_mk*k_hy/γ_M', buigsterkte sterke as — blijvend'
f_mzd_b = k_mod_b*f_mk*k_hz/γ_M', buigsterkte zwakke as — blijvend'
f_vd_b = k_mod_b*f_vk/γ_M', afschuifsterkte — blijvend'
f_myd_k
f_mzd_k
f_vd_k
f_myd_m
f_mzd_m
f_vd_m
f_myd_b
f_mzd_b
f_vd_b

# 2. Doorsnede-eigenschappen

A = b_g*h_g
I_y = b_g*h_g^3/12', traagheidsmoment sterke as'
I_z = h_g*b_g^3/12', traagheidsmoment zwakke as'
W_y = I_y/(h_g/2)
W_z = I_z/(b_g/2)
S_y = b_g*h_g^2/8
S_z = h_g*b_g^2/8
A
I_y
I_z
W_y
W_z
'<i><b>Splitspunt — eigen gewicht (register punt 8).</b> De referentie-uitwerking rekent met een
'vaste 550 kg/m³ én g = 10 m/s², de norm met ρ<sub>mean</sub> uit EN 338 en g = 9,81.</i>
g_eig_xc = A*5.5*kN/m^3 to kN/m', eigen gewicht — de referentie-uitwerking'
g_eig_nb = A*ρ_mean*9.81*m/s^2 to kN/m', eigen gewicht — EN 338'
g_eig = if(rekenwijze ≡ 1; g_eig_xc; g_eig_nb)', gehanteerd eigen gewicht'
g_eig_xc
g_eig_nb
g_eig

# 3. Geometrie

@select dakType "Daktype"
  Plat dak = 1
  Schuin dak = 2
@end

l_h = ?*(mm)', horizontale projectie van het dakvlak'
h_v = ?*(mm)', hoogte (nok)'
L_dag = ?*(mm)', dagmaat (overspanning gording)'
a_opl = ?*(mm)', opleglengte (totaal)'
n_gording = ?', aantal gordingen'

#hide
h_eff = if(dakType ≡ 1; 0*mm; h_v)
#show
slope = sqrt(l_h^2 + h_eff^2)', daklengte'
cos_α = l_h/slope
sin_α = h_eff/slope
α_deg = atan(h_eff/l_h)*180/pi', dakhelling [°]'
slope
α_deg
hoh = slope/(n_gording + 1)', h.o.h.-afstand gordingen (langs dakvlak)'
L_th = L_dag + a_opl', theoretische overspanning'
hoh
L_th

'<h6>Dakbeschot</h6>
t_beschot = ?*(mm)', dikte dakbeschot'
@select I_manual "I dakbeschot"
  Automatisch (1000·t³/12) = 0
  Handmatig = 1
@end
I_beschot = ?*(mm^4)', I dakbeschot (bij handmatig)'
E_beschot = ?*(N/mm^2)', E dakbeschot'
I_db = if(I_manual ≡ 1; I_beschot; 1000*mm*t_beschot^3/12)', gehanteerde I dakbeschot'
I_db

# 4. Belastingen

g_pannen = ?*(kN/m^2)', e.g. pannen'
g_panlat = ?*(kN/m^2)', e.g. panlat + tengel'
g_dakplaat = ?*(kN/m^2)', e.g. dakplaat'
g_plafond = ?*(kN/m^2)', e.g. plafond'
P_gk = g_pannen + g_panlat + g_dakplaat + g_plafond', permanente dakbelasting'
P_gk
q_par = ?*(kN/m)', door muurplaat/nokgording opgenomen ∥-belasting'
@select varType "Type veranderlijke belasting"
  Geconcentreerd Q_k = 1
  Verdeeld q_k = 2
@end
Q_k = ?*(kN)', geconcentreerde last'
q_var = ?*(kN/m^2)', verdeelde veranderlijke belasting'
s_k = ?*(kN/m^2)', karakteristieke sneeuwbelasting (grondvlak)'

'<h6>Wind</h6>
'<i>Windgebied en terreincategorie staan in de <b>projectgegevens</b>; de
'referentiehoogte z<sub>e</sub> hoort bij dít constructiedeel en staat daarom
'hieronder. Een gording op 9 m en een gevelkolom op 4 m in hetzelfde gebouw
'hebben een verschillende q<sub>p</sub>. De drukcoëfficiënten zijn vaste
'NB-waarden (dakzone F-G-H).</i>

@select windbron "Extreme stuwdruk q_p"
  Berekenen uit de projectgegevens = 1
  Zelf invullen = 0
@end

z_wind = ?*(m)', referentiehoogte z_e boven maaiveld'
q_wind_hand = ?*(kN/m^2)', q_p — alleen bij "zelf invullen"'

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
v_b0 = vb0_ruw*(m/s)', basiswindsnelheid (Tabel NB.1); c_dir = c_season = 1'
z_e = ze_ruw*(m)', gehanteerde hoogte — ten minste z_min'
k_r_w = 0.19*(z0_ruw/0.05)^0.07', terreinfactor (4.5)'
c_r = k_r_w*log(verh)', ruwheidsfactor (4.4); c_o = 1 (vlak terrein, NB)'
v_m = vm_ruw*(m/s)', gemiddelde windsnelheid (4.3)'
I_v = 1/log(verh)', turbulentie-intensiteit (4.7); k_l = 1'
q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', extreme stuwdruk (4.8), ρ = 1,25 kg/m³'
v_b0
z_e
k_r_w
c_r
v_m
I_v
q_p
q_wind = if(windbron ≡ 1; q_p; q_wind_hand)', gehanteerde q_p'
q_wind
C_pe = if(dakType ≡ 1; -0.70; 0.70)', externe drukcoëfficiënt (zone F-G-H; plat dak = zuiging)'
C_pi = -0.30', interne drukcoëfficiënt'
K_FI', gevolgklasse-factor uit de projectgegevens (EN 1990)'

# 5. Belastingsgeval 1 — Permanent

'<i>Ontbinding t.o.v. het dakvlak: ⊥ = ·cos α (sterke as y), ∥ = ·sin α (zwakke as z).
'De ∥-component wordt over alle gordingen verdeeld; q<sub>∥</sub> is de ontlasting
'door muurplaat/nokgording.</i>
P_gy = P_gk*cos_α
P_gz = P_gk*sin_α
P_gz_tot = slope*P_gz + n_gording*g_eig*sin_α to kN/m', totale ∥-last over het dak'
'De ontlasting door muurplaat/nokgording kan niet meer wegnemen dan er aan
'∥-last ligt: op een plat dak is de ∥-component nul en blijft q_gz nul.
q_gz = max(0*(kN/m); (P_gz_tot - q_par)/n_gording) to kN/m', ∥-lijnlast per gording (zwakke as)'
q_gy = hoh*P_gy + g_eig*cos_α to kN/m', ⊥-lijnlast per gording (sterke as)'
q_gy
q_gz
M_gy = q_gy*L_th^2/8 to kN*m
V_gy = q_gy*L_th/2 to kN
u_gy = 5/384*q_gy*L_th^4/(E_mean*I_y) to mm
M_gz = q_gz*L_th^2/8 to kN*m
V_gz = q_gz*L_th/2 to kN
u_gz = 5/384*q_gz*L_th^4/(E_mean*I_z) to mm
M_gy
u_gy
M_gz
u_gz

# 6. Belastingsgeval 2 — Veranderlijke belasting

'<i>Geconcentreerd Q<sub>k</sub> (concentratiefactor k<sub>r</sub>, kapt op 1,0; dakbeschot E·I
'beïnvloedt alléén k<sub>r</sub>) óf verdeeld q<sub>k</sub> (op grondvlak, zoals sneeuw).</i>
#hide
kr_db = (E_beschot/(1*N/mm^2))*(I_db/(1*mm^4))/1000000/50000
#show
k_r = min(1; 0.37 + 0.8*hoh/(1*m) - kr_db)', concentratiefactor'
k_r
'Geconcentreerd Q_k:
F_Qy = Q_k*cos_α*k_r
F_Qz = Q_k*sin_α*k_r
Mc_y = F_Qy*L_th/4 to kN*m
Vc_y = Q_k*cos_α to kN
uc_y = 1/48*F_Qy*L_th^3/(E_mean*I_y) to mm
Mc_z = F_Qz*L_th/4 to kN*m
Vc_z = Q_k*sin_α to kN
uc_z = 1/48*F_Qz*L_th^3/(E_mean*I_z) to mm
'Verdeeld q_k:
q_vv = hoh*q_var*cos_α to kN/m
Md_y = q_vv*cos_α*L_th^2/8 to kN*m
Vd_y = q_vv*cos_α*L_th/2 to kN
ud_y = 5/384*q_vv*cos_α*L_th^4/(E_mean*I_y) to mm
Md_z = q_vv*sin_α*L_th^2/8 to kN*m
Vd_z = q_vv*sin_α*L_th/2 to kN
ud_z = 5/384*q_vv*sin_α*L_th^4/(E_mean*I_z) to mm
#hide
'De referentie-uitwerking rekent q_k en Q_k naast elkaar door als beide zijn ingevuld en
'zet er twee aparte combinaties op. Is q_k nul, dan verschijnt die combinatie
'niet — vandaar de vlag.
heeft_q = if(q_var ≤ 0*(kN/m^2); 0; 1)
#show
Mc_y', moment geconcentreerde last (sterke as)'
Mc_z', moment geconcentreerde last (zwakke as)'
Md_y', moment verdeelde last (sterke as)'
Md_z', moment verdeelde last (zwakke as)'

# 7. Belastingsgeval 3 — Sneeuw

μ_1 = if(α_deg ≤ 30; 0.8; if(α_deg ≥ 60; 0; 0.8*(60 - α_deg)/30))', vormcoëfficiënt'
P_sn = μ_1*s_k', sneeuw op het dak (grondvlak)'
q_sn = hoh*P_sn*cos_α to kN/m', verticale sneeuw-lijnlast per gording'
μ_1
q_sn
q_sy = q_sn*cos_α
q_sz = q_sn*sin_α
M_sy = q_sy*L_th^2/8 to kN*m
V_sy = q_sy*L_th/2 to kN
u_sy = 5/384*q_sy*L_th^4/(E_mean*I_y) to mm
M_sz = q_sz*L_th^2/8 to kN*m
V_sz = q_sz*L_th/2 to kN
u_sz = 5/384*q_sz*L_th^4/(E_mean*I_z) to mm

# 8. Belastingsgeval 4 — Wind

'<i>Wind werkt loodrecht op het dakvlak (alleen ⊥, sterke as).</i>
P_w = (C_pe - C_pi)*q_wind', winddruk op het dakvlak'
q_wy = hoh*P_w to kN/m', wind-lijnlast per gording (⊥)'
P_w
q_wy
M_wy = q_wy*L_th^2/8 to kN*m
V_wy = q_wy*L_th/2 to kN
u_wy = 5/384*q_wy*L_th^4/(E_mean*I_y) to mm
u_wy

# 9. Toetsing BGT — doorbuiging (§7.2)

'<i>Eindstand-doorbuiging per richting (ψ<sub>2</sub> = 0 voor dak/sneeuw/wind):
'w<sub>fin</sub> = (1+k<sub>def</sub>)·u<sub>perm</sub> + u<sub>var,leidend</sub>. Grens = 0,004·L.</i>

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
    u_var_y = max(heeft_q*ud_y; uc_y; u_sy; u_wy)', maatgevende veranderlijke ⊥'
    u_var_z = max(heeft_q*ud_z; uc_z; u_sz)', maatgevende veranderlijke ∥'
    w_fin_y = (1 + k_def)*u_gy + u_var_y
    w_fin_z = (1 + k_def)*u_gz + u_var_z
    w_lim = grensfactor*L_th
    w_fin_y
    w_fin_z
    w_lim
    UC_wy = w_fin_y/w_lim
    #if UC_wy ≤ 1.0
        'UC<sub>w,y</sub> = w<sub>fin,y</sub>/w<sub>lim</sub> = 'UC_wy'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>w,y</sub> = w<sub>fin,y</sub>/w<sub>lim</sub> = 'UC_wy'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
    UC_wz = if(dubbele ≡ 1; w_fin_z/w_lim; 0)
    #if dubbele ≡ 1
        #if UC_wz ≤ 1.0
            'UC<sub>w,z</sub> = w<sub>fin,z</sub>/w<sub>lim</sub> = 'UC_wz'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            'UC<sub>w,z</sub> = w<sub>fin,z</sub>/w<sub>lim</sub> = 'UC_wz'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #end if
#else
    'Doorbuiging wordt niet getoetst.
    UC_wy = 0
    UC_wz = 0
#end if

# 10. Toetsing UGT

'<h6>10.1 Belastingscombinaties (γ·K_FI)</h6>
γ_G = 1.2*K_FI', 6.10b'
γ_Q = 1.5*K_FI
γ_G_a = 1.35*K_FI', 6.10a'
'<i>De nationale bijlage geeft ψ<sub>0</sub> = 0 voor wind, sneeuw én de
'dakbelasting zelf (categorie H). Daardoor valt in <b>6.10a</b> de begeleidende
'term weg en blijft 1,35·G over — een combinatie zónder veranderlijke belasting,
'en dus in de duurklasse <b>blijvend</b> met k<sub>mod</sub> = 0,60. Op een steil
'dak, waar de ∥-component van het eigen gewicht groot is, wint die van 6.10b.
'De referentie-uitwerking rekent alleen 6.10b; zie punt 10 van het afwijkingenregister.</i>
'Combinatie 0 — alleen permanent, 6.10a (blijvend):
My_0 = γ_G_a*M_gy
Mz_0 = γ_G_a*M_gz
Vz_0 = γ_G_a*V_gy
Vy_0 = γ_G_a*V_gz
'Combinatie 1 — permanent + verdeelde veranderlijke last (middellang):
My_1 = γ_G*M_gy + γ_Q*Md_y
Mz_1 = γ_G*M_gz + γ_Q*Md_z
Vz_1 = γ_G*V_gy + γ_Q*Vd_y
Vy_1 = γ_G*V_gz + γ_Q*Vd_z
'Combinatie 2 — permanent + geconcentreerde last (kort):
My_2 = γ_G*M_gy + γ_Q*Mc_y
Mz_2 = γ_G*M_gz + γ_Q*Mc_z
Vz_2 = γ_G*V_gy + γ_Q*Vc_y
Vy_2 = γ_G*V_gz + γ_Q*Vc_z
'Combinatie 3 — permanent + sneeuw (kort):
My_3 = γ_G*M_gy + γ_Q*M_sy
Mz_3 = γ_G*M_gz + γ_Q*M_sz
Vz_3 = γ_G*V_gy + γ_Q*V_sy
Vy_3 = γ_G*V_gz + γ_Q*V_sz
'Combinatie 4 — permanent + wind (kort, geen ∥):
My_4 = γ_G*M_gy + γ_Q*M_wy
Mz_4 = γ_G*M_gz
Vz_4 = γ_G*V_gy + γ_Q*V_wy
Vy_4 = γ_G*V_gz

'<h6>10.2 Buiging — dubbele buiging §6.1.6</h6>
#hide
c_par = if(dubbele ≡ 1; 1; 0)
'Splitspunt — doet 6.10a mee? (register punt 10). De referentie-uitwerking rekent alleen 6.10b.
w_610a = if(rekenwijze ≡ 1; 0; 1)
r611_0 = w_610a*(My_0/W_y/f_myd_b + c_par*k_m*Mz_0/W_z/f_mzd_b)
r611_1 = heeft_q*(My_1/W_y/f_myd_m + c_par*k_m*Mz_1/W_z/f_mzd_m)
r611_2 = My_2/W_y/f_myd_k + c_par*k_m*Mz_2/W_z/f_mzd_k
r611_3 = My_3/W_y/f_myd_k + c_par*k_m*Mz_3/W_z/f_mzd_k
r611_4 = My_4/W_y/f_myd_k + c_par*k_m*Mz_4/W_z/f_mzd_k
r612_0 = w_610a*(k_m*My_0/W_y/f_myd_b + Mz_0/W_z/f_mzd_b)
r612_1 = heeft_q*(k_m*My_1/W_y/f_myd_m + Mz_1/W_z/f_mzd_m)
r612_2 = k_m*My_2/W_y/f_myd_k + Mz_2/W_z/f_mzd_k
r612_3 = k_m*My_3/W_y/f_myd_k + Mz_3/W_z/f_mzd_k
r612_4 = k_m*My_4/W_y/f_myd_k + Mz_4/W_z/f_mzd_k
'Splitspunt — hoe 6.11 en 6.12 worden gekozen (register punt 13). de referentie-uitwerking kiest
'één maatgevende combinatie en drukt dáárvan beide formules af; de norm eist dat
'beide formules voor élke combinatie gelden, dus per formule de max over alle.
'De maatgevende is de combinatie met de hoogste van zijn eigen twee waarden;
'max() geeft exact één van zijn argumenten terug, dus ≡ selecteert hem sluitend.
p_0 = max(r611_0; r612_0)
p_1 = max(r611_1; r612_1)
p_2 = max(r611_2; r612_2)
p_3 = max(r611_3; r612_3)
p_4 = max(r611_4; r612_4)
p_max = max(p_0; p_1; p_2; p_3; p_4)
UC_611_xc = if(p_0 ≡ p_max; r611_0; if(p_1 ≡ p_max; r611_1; if(p_2 ≡ p_max; r611_2; if(p_3 ≡ p_max; r611_3; r611_4))))
UC_612_xc = if(p_0 ≡ p_max; r612_0; if(p_1 ≡ p_max; r612_1; if(p_2 ≡ p_max; r612_2; if(p_3 ≡ p_max; r612_3; r612_4))))
UC_611_nb = max(r611_0; r611_1; r611_2; r611_3; r611_4)
UC_612_nb = max(r612_0; r612_1; r612_2; r612_3; r612_4)
#show
UC_611 = if(rekenwijze ≡ 1; UC_611_xc; UC_611_nb)', maatgevend over de combinaties'
UC_612 = if(dubbele ≡ 1; if(rekenwijze ≡ 1; UC_612_xc; UC_612_nb); 0)
#if UC_611 ≤ 1.0
    'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>·σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_611'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>6.11</sub> = σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>·σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_611'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if
#if dubbele ≡ 1
    #if UC_612 ≤ 1.0
        'UC<sub>6.12</sub> = k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_612'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>6.12</sub> = k<sub>m</sub>·σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = 'UC_612'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#end if

'<h6>10.3 Afschuiving — §6.1.7 (6.13)</h6>
#hide
tau_0 = w_610a*sqrt((Vz_0*S_y/(b_g*I_y))^2 + (Vy_0*S_z/(h_g*I_z))^2)/f_vd_b
tau_1 = heeft_q*sqrt((Vz_1*S_y/(b_g*I_y))^2 + (Vy_1*S_z/(h_g*I_z))^2)/f_vd_m
tau_2 = sqrt((Vz_2*S_y/(b_g*I_y))^2 + (Vy_2*S_z/(h_g*I_z))^2)/f_vd_k
tau_3 = sqrt((Vz_3*S_y/(b_g*I_y))^2 + (Vy_3*S_z/(h_g*I_z))^2)/f_vd_k
tau_4 = sqrt((Vz_4*S_y/(b_g*I_y))^2 + (Vy_4*S_z/(h_g*I_z))^2)/f_vd_k
#show
UC_afsch = max(tau_0; tau_1; tau_2; tau_3; tau_4)
#if UC_afsch ≤ 1.0
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 11. Samenvatting

UC_max = max(UC_611; UC_612; UC_afsch; UC_wy; UC_wz)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Gording voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Gording voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Gecalibreerd op 3 de referentie-uitwerking-referenties (Set 1/2/3), alle exact gereproduceerd.</li>
'<li>Eigengewicht = A·5,5 kN/m³ (550 kg/m³ · g=10), conform de referentie-uitwerking.</li>
'<li>Dakbeschot (E·I) beïnvloedt alléén de concentratiefactor k<sub>r</sub> (kapt op 1,0);
'de ∥-last wordt gelijk over de gordingen verdeeld.</li>
'<li>Duurklasse <b>Kort</b> (k<sub>mod</sub> = 0,90; klimaat 3 → 0,70). ψ<sub>2</sub> = 0 voor dak/sneeuw/wind.</li>
'</ul></i>
`;
