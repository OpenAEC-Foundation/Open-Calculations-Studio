/**
 * Balklaag — houten vloerbalken volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking: 3 belastingsgevallen (permanent UDL,
 * veranderlijk UDL, geconcentreerde last met concentratiefactor k_r),
 * BGT-doorbuiging (w_fin met kruip k_def) en UGT (buiging §6.1.6 + afschuiving
 * §6.1.7).
 *
 * Eigengewicht balk: A · ρ_mean · g volgens EN 1991-1-1 / EN 338 (ρ_mean per
 * sterkteklasse). De referentie-uitwerking rekent met een vaste 550 kg/m³ én g = 10 m/s²;
 * hier de correcte ρ_mean (C24 = 420 kg/m³) met g = 9,81. Zie punt 8 in
 * docs/afwijkingen-referentie.md.
 *
 * Gecalibreerd op document1 t/m document9 — zie scripts/check-balklaag.mjs.
 */

export const balklaag = `"Balklaag — houten vloerbalken volgens EN 1995-1-1

'<i>Toetsing van een houten vloerbalk (balklaag) op een enkelvoudige overspanning,
'belast door permanente + veranderlijke vloerbelasting en een geconcentreerde
'last. BGT-doorbuiging incl. kruip en UGT-buiging + afschuiving.</i>

# 1. Profiel & materiaal

@select profiel "Profiel (b×h)"
  46×96 = 1
  46×146 = 2
  46×171 = 3
  46×196 = 4
  63×146 = 5
  63×171 = 6
  63×196 = 7
  63×221 = 8
  71×146 = 9
  71×171 = 10
  71×196 = 11
  71×221 = 12
  71×246 = 13
  71×271 = 14
  96×171 = 15
  96×196 = 16
  96×221 = 17
  96×246 = 18
  96×271 = 19
@end

@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
  GL24h = 4
  GL28h = 5
@end

@select klimaat "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

@select duurklasse "Belastingsduurklasse (maatgevend variabel)"
  Kort = 1
  Middellang = 2
  Lang = 3
  Blijvend = 4
@end

#hide
'Profielmatrix: [id | b(mm) | h(mm)]
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19 |46; 46; 46; 46; 63; 63; 63; 63; 71; 71; 71; 71; 71; 71; 96; 96; 96; 96; 96 |96; 146; 171; 196; 146; 171; 196; 221; 146; 171; 196; 221; 246; 271; 171; 196; 221; 246; 271]
'Materiaalmatrix: [id | f_m,k | f_v,k | E_mean | ρ_mean | γ_M]
materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |9000; 11000; 12000; 11500; 12600 |380; 420; 460; 420; 425 |1.30; 1.30; 1.30; 1.25; 1.25]

b_balk = hlookup(profielen; profiel; 1; 2)*mm
h_balk = hlookup(profielen; profiel; 1; 3)*mm
f_m,k = hlookup(materialen; sterkteklasse; 1; 2)*N/mm^2
f_v,k = hlookup(materialen; sterkteklasse; 1; 3)*N/mm^2
E_mean = hlookup(materialen; sterkteklasse; 1; 4)*N/mm^2
ρ_mean = hlookup(materialen; sterkteklasse; 1; 5)*kg/m^3
γ_M = hlookup(materialen; sterkteklasse; 1; 6)
'k_mod (EN 1995-1-1 Tabel 3.1) — klimaatklasse 1 en 2 gelijk, klasse 3 lager:
k_mod_12 = if(duurklasse ≡ 1; 0.90; if(duurklasse ≡ 2; 0.80; if(duurklasse ≡ 3; 0.70; 0.60)))
k_mod_3 = if(duurklasse ≡ 1; 0.70; if(duurklasse ≡ 2; 0.65; if(duurklasse ≡ 3; 0.55; 0.50)))
k_mod = if(klimaat ≡ 3; k_mod_3; k_mod_12)
k_def = if(klimaat ≡ 1; 0.60; if(klimaat ≡ 2; 0.80; 2.00))', kruipfactor (Tabel 3.2)'
'Hoogtefactor k_h op f_m,k — massief §3.2(3) bij h < 150 mm, gelijmd gelamineerd
'§3.3(3) bij h < 600 mm. Op 71×221 is k_h = 1 voor massief en 1,10 voor GL.
h_ruw = hlookup(profielen; profiel; 1; 3)', balkhoogte als kaal getal in mm'
gelijmd = if(sterkteklasse ≡ 4; 1; if(sterkteklasse ≡ 5; 1; 0))
k_h_massief = if(h_ruw < 150; min(1.3; (150/h_ruw)^0.2); 1)
k_h_gelijmd = if(h_ruw < 600; min(1.1; (600/h_ruw)^0.1); 1)
k_h = if(gelijmd ≡ 1; k_h_gelijmd; k_h_massief)
f_m,k_eff = k_h*f_m,k', karakteristieke buigsterkte incl. hoogtefactor'
#show

'<h6>Gekozen profiel en materiaal</h6>
b_balk
h_balk
f_m,k
f_v,k
E_mean
k_mod
k_h
f_m,k_eff

f_m,d = k_mod*f_m,k_eff/γ_M', rekenwaarde buigsterkte (incl. k_h)'
f_v,d = k_mod*f_v,k/γ_M', rekenwaarde afschuifsterkte'
f_m,d
f_v,d

# 2. Geometrie

L_d = ?*(mm)', dagmaat (vrije overspanning)'
a_opl = ?*(mm)', opleglengte per zijde'
hoh = ?*(mm)', hart-op-hart afstand van de balken'
t_vloer = ?*(mm)', dikte vloerhout (vloerplaat)'
E_beschot = ?*(N/mm^2)', E-modulus vloerhout/beschot (E_0,ser,rep)'
b_vloer = ?*(m)', breedte van het vloerveld — nodig voor de trillingstoets'

L_th = L_d + a_opl', theoretische overspanning (= L_d + 2·a_opl/2)'
L_th

# 3. Belastingen

'<i>Eén permanente en één veranderlijke vloerbelasting. Wat daarin thuishoort
'bepaal je zelf: vloerafwerking, plafond, vaste scheidingswanden en overige
'blijvende lasten tellen op in g<sub>k</sub>. Verplaatsbare scheidingswanden
'horen volgens EN 1991-1-1 §6.3.1.2 juist bij de veranderlijke last q<sub>k</sub>.
'Het eigen gewicht van de balk zelf komt hier niet bij — dat rekent de sheet
'in §5 zelf uit de doorsnede en de dichtheid.</i>

g_k = ?*(kN/m^2)', permanente vloerbelasting'
q_k = ?*(kN/m^2)', veranderlijke vloerbelasting'
Q_k = ?*(kN)', geconcentreerde last'

@select belastingcat "Belastingcategorie (ψ-waarden)"
  Vloer (woning/kantoor) = 2
  Dak = 1
  Zelf invullen = 3
@end

ψ_0_zelf = ?', ψ0 — alleen bij "zelf invullen"'
ψ_2_zelf = ?', ψ2 — alleen bij "zelf invullen"'
ψ_0 = if(belastingcat ≡ 1; 0; if(belastingcat ≡ 2; 0.5; ψ_0_zelf))
ψ_2 = if(belastingcat ≡ 1; 0; if(belastingcat ≡ 2; 0.3; ψ_2_zelf))
ψ_0
ψ_2

q_k_eff = q_k', veranderlijke vloerbelasting'

# 4. Doorsnede-eigenschappen

A = b_balk*h_balk
I_y = b_balk*h_balk^3/12', traagheidsmoment'
W_y = b_balk*h_balk^2/6', weerstandsmoment'
S_y = b_balk*h_balk^2/8', statisch moment (NL) voor afschuiving'
A
I_y
W_y
S_y

'<i><b>Splitspunt — eigen gewicht (register punt 8).</b> De referentie-uitwerking rekent met een
'vaste 550 kg/m³ én g = 10 m/s²; de norm met ρ<sub>mean</sub> uit EN 338 en
'g = 9,81. Welke van de twee de conclusie stuurt staat in de projectgegevens.</i>
#hide
ρ_xc = 550 kg/m^3
g_xc = 10 m/s^2
g_nb = 9.81 m/s^2
#show
g_balk_xc = A*ρ_xc*g_xc to kN/m', eigen gewicht — de referentie-uitwerking'
g_balk_nb = A*ρ_mean*g_nb to kN/m', eigen gewicht — EN 338'
g_balk = if(rekenwijze ≡ 1; g_balk_xc; g_balk_nb)', gehanteerd eigen gewicht'
g_balk_xc
g_balk_nb
g_balk

# 5. Belastingsgeval 1 — Permanent

P_g,k = hoh*g_k + g_balk to kN/m', lijnlast permanent op de balk'
P_g,k
M_g,k = P_g,k*L_th^2/8 to kN*m
V_g,k = P_g,k*L_th/2 to kN
u_g,k = 5/384*P_g,k*L_th^4/(E_mean*I_y) to mm', momentane doorbuiging permanent'
M_g,k
V_g,k
u_g,k

# 6. Belastingsgeval 2 — Veranderlijk (gelijkmatig)

q_q,k = hoh*q_k_eff to kN/m', lijnlast veranderlijk'
q_q,k
M_q,k = q_q,k*L_th^2/8 to kN*m
V_q,k = q_q,k*L_th/2 to kN
u_q,k = 5/384*q_q,k*L_th^4/(E_mean*I_y) to mm
M_q,k
V_q,k
u_q,k

# 7. Belastingsgeval 3 — Geconcentreerde last

'<i>Een puntlast verdeelt zich via het vloerhout over meerdere balken. De
'concentratiefactor k<sub>r</sub> bepaalt het deel dat op één balk komt
'(NEN-EN 1995-1-1 NB). Stijver vloerhout (dikker) → kleinere k<sub>r</sub>.</i>

#hide
a_ref = 1000 mm
'Derde term = (EI)_l/EI_ref, met (EI)_l = E_beschot·t³/12 per mm plaatbreedte.
'De E-modulus van het beschot is invoer (§2); vroeger stond hier een vaste
'7000 N/mm², waardoor een stijver of slapper beschot niet doorwerkte.
EI_ref = 50000000', referentiestijfheid per mm plaatbreedte (N·mm)'
t_ruw = t_vloer/(1 mm)
E_vl = E_beschot/(1 N/mm^2)', E-modulus beschot, dimensieloos voor de deling'
#show
k_r_0 = 0.37 + 0.8*hoh/a_ref - E_vl*t_ruw^3/12/EI_ref
k_r = min(1; k_r_0)', concentratiefactor, afgetopt op 1,0 (NEN-EN 1995-1-1 NB)'
k_r
F_Q,k = Q_k*k_r to kN', effectieve puntlast op één balk'
F_Q,k
M_Q,k = F_Q,k*L_th/4 to kN*m
V_Q,k = F_Q,k to kN', puntlast bij oplegging → volledige dwarskracht op de balk'
u_Q,k = 1/48*F_Q,k*L_th^3/(E_mean*I_y) to mm
M_Q,k
V_Q,k
u_Q,k

# 8. Doorsnede van de balklaag

'<i>Vloerhout (dikte t<sub>vloer</sub>) op de balken, hart-op-hart afstand hoh.</i>

#hide
svgW = 480
n_balk = 4
gap = 96', pixelafstand tussen balken (representatief)
bw = 30', balkbreedte in pixels
bh = 70', balkhoogte in pixels
x0 = (svgW - (n_balk - 1)*gap - bw)/2
vy = 60', bovenkant vloerhout
vt = 16', dikte vloerhout in pixels
by = vy + vt', bovenkant balken
#show
'<svg viewbox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" style="font-size:12px; width:100%; max-height:240px;">
'  <rect x="20" y="'vy'" width="440" height="'vt'" style="fill:#D9B382; stroke:#8B6F47; stroke-width:1.5"/>
#for i = 0 : n_balk - 1
'  <rect x="'x0 + i*gap'" y="'by'" width="'bw'" height="'bh'" style="fill:#E3C08A; stroke:#8B6F47; stroke-width:1.5"/>
#loop
'  <line x1="'x0 + bw/2'" y1="'by + bh + 16'" x2="'x0 + gap + bw/2'" y2="'by + bh + 16'" style="stroke:#1E40AF; stroke-width:1"/>
'  <polygon points="'x0 + bw/2','by + bh + 12' 'x0 + bw/2 + 6','by + bh + 16' 'x0 + bw/2','by + bh + 20'" style="fill:#1E40AF"/>
'  <polygon points="'x0 + gap + bw/2','by + bh + 12' 'x0 + gap + bw/2 - 6','by + bh + 16' 'x0 + gap + bw/2','by + bh + 20'" style="fill:#1E40AF"/>
'  <text x="'x0 + gap/2 + bw/2'" y="'by + bh + 12'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">hoh = 'hoh'</text>
'  <text x="30" y="'vy - 6'" style="fill:#8B6F47">vloerhout t = 't_vloer'</text>
'  <text x="'x0 - 4'" y="'by + bh/2'" text-anchor="end" style="fill:#8B6F47">'b_balk' × 'h_balk'</text>
'</svg>'

# 9. Toetsing BGT — doorbuiging (§7.2)

'<i>Eindstand-doorbuiging incl. kruip: w<sub>fin</sub> = (1+k<sub>def</sub>)·u<sub>g</sub>
'+ (1+ψ<sub>2</sub>·k<sub>def</sub>)·u<sub>var</sub>. Grens: 0,004·L (= L/250).</i>

@select controleer "Controleer doorbuiging"
  Ja = 1
  Nee = 0
@end

@select grensfactor "Toelaatbare bijkomende doorbuiging"
  0.004 × L = 0.004
  0.003 × L = 0.003
  0.002 × L = 0.002
@end

#if controleer ≡ 1
    'Splitspunt — welke veranderlijke doorbuiging meetelt (register punt 9).
    u_var_xc = u_q,k to mm', de referentie-uitwerking: alleen de gelijkmatig verdeelde variant'
    u_var_nb = max(u_q,k; u_Q,k) to mm', de norm: de maatgevende van de twee'
    u_var = if(rekenwijze ≡ 1; u_var_xc; u_var_nb) to mm', gehanteerd'
    w_fin = (1 + k_def)*u_g,k + (1 + ψ_2*k_def)*u_var to mm
    w_lim = grensfactor*L_th
    w_fin
    w_lim
    UC_doorbuiging = w_fin/w_lim
    #if UC_doorbuiging ≤ 1.0
        'UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>doorbuiging</sub> = w<sub>fin</sub>/w<sub>fin,max</sub> = 'UC_doorbuiging'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
#else
    'Doorbuiging wordt niet getoetst (Controleer doorbuiging = Nee).
    UC_doorbuiging = 0
#end if

# 9b. Toetsing BGT — trillingen (§7.3.3)

'<i>De trillingstoets voor woonvloeren kent twee criteria naast de
'frequentie-eis: de stijfheid onder een puntlast van 1 kN (formule 7.3) en
'de responssnelheid op een eenheidsimpuls (formule 7.4). Beide gelden alleen
'als f<sub>1</sub> ≥ 8 Hz; daaronder vraagt de norm een volledige
'trillingsanalyse (§7.3.3(2)).</i>

@select controleer_trilling "Controleer trilling"
  Ja = 1
  Nee = 0
@end

ζ = ?', dempingsratio (§7.3.1: 0,01 voor vloeren zonder afwerklaag)'
a_tril = ?*(mm/kN)', grenswaarde stijfheid a (Tabel NB — 1,0 mm/kN)'
b_tril = ?', parameter b bij de snelheidseis (Figuur 7.2, ca. 120)'

#if controleer_trilling ≡ 1
    '<h6>9b.1 Stijfheden</h6>
    'Beschot, per meter vloerbreedte — draagt loodrecht op de balken:
    I_beschot = 1 m*t_vloer^3/12 to m^4
    EI_l = E_beschot*I_beschot/(1 m) to N*m^2/m', (EI)_l — beschot'
    EI_l
    'Balklaag, per meter vloerbreedte — de balken dragen in de overspanning:
    EI_b = E_mean*I_y/hoh to N*m^2/m', (EI)_b — balken'
    EI_b

    '<h6>9b.2 Eigenfrequentie (formule 7.5)</h6>
    'Trillende massa per m² — alleen het permanente gewicht (§7.3.3): de
    'veranderlijke belasting telt niet mee, want de vloer trilt in de staat
    'waarin hij normaal wordt gebruikt, niet onder vol belastingsontwerp.
    m_opp = (g_k + g_balk/hoh)/(9.81 m/s^2) to kg/m^2
    m_opp
    f_1 = π/(2*L_th^2)*sqrt(EI_b/m_opp) to Hz
    f_1
    #if f_1 ≥ 8 Hz
        'f<sub>1</sub> = 'f_1'<span style="color: green"> ≥ 8 Hz → de twee criteria hieronder zijn van toepassing</span>
    #else
        'f<sub>1</sub> = 'f_1'<span style="color: red"> < 8 Hz → de vereenvoudigde toets vervalt; §7.3.3(2) vraagt een volledige trillingsanalyse</span>
    #end if

    '<h6>9b.3 Criterium 1 — stijfheid onder 1 kN (formule 7.3)</h6>
    'De puntlast spreidt over meerdere balken; k<sub>r</sub> uit §7 geeft het
    'deel dat op de zwaarst belaste balk komt.
    F_tril = 1 kN*k_r to kN', effectieve puntlast op één balk'
    w_1kN = F_tril*L_th^3/(48*E_mean*I_y) to mm
    w_per_kN = w_1kN/(1 kN) to mm/kN
    w_per_kN
    a_tril
    UC_tril_a = w_per_kN/a_tril
    #if UC_tril_a ≤ 1.0
        'UC<sub>w/F</sub> = 'UC_tril_a'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>w/F</sub> = 'UC_tril_a'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>9b.4 Criterium 2 — responssnelheid (formules 7.4, 7.6, 7.7)</h6>
    'Aantal eigenmodi onder 40 Hz (formule 7.7). Bij een zeer stijve vloer
    'ligt f_1 al boven 40 Hz; dan is er geen enkele eigenmode onder de 40 Hz
    'en wordt de term onder de wortel op nul afgekapt.
    n_40_arg = max(0; (40 Hz/f_1)^2 - 1)
    n_40 = (n_40_arg*(b_vloer/L_th)^4*EI_l/EI_b)^0.25
    n_40
    'Responssnelheid op een eenheidsimpuls (formule 7.6):
    v_resp = 4*(0.4 + 0.6*n_40)/(m_opp*b_vloer*L_th + 200 kg) to m/(N*s^2)
    v_resp
    'Grenswaarde (formule 7.4): b^(f_1·ζ − 1)
    v_lim = b_tril^(f_1*ζ/(1 Hz) - 1)*1 m/(N*s^2)
    v_lim
    UC_tril_v = v_resp/v_lim
    #if UC_tril_v ≤ 1.0
        'UC<sub>v</sub> = 'UC_tril_v'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        'UC<sub>v</sub> = 'UC_tril_v'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    UC_trilling = max(UC_tril_a; UC_tril_v)
    #if UC_trilling ≤ 1.0
        '<b>Trillingen voldoen</b> (maatgevende UC = 'UC_trilling')
    #else
        '<b><span style="color: red">Trillingen voldoen niet</span></b> (maatgevende UC = 'UC_trilling')
    #end if
#else
    'Trilling wordt niet getoetst (Controleer trilling = Nee).
    UC_trilling = 0
#end if

# 10. Toetsing UGT

'<h6>10.1 Maatgevende krachten</h6>
'Permanent + veranderlijk (UDL):
M_yEd_1 = 1.20*M_g,k + 1.50*M_q,k to kN*m
V_zEd_1 = 1.20*V_g,k + 1.50*V_q,k to kN
'Permanent + geconcentreerde last:
M_yEd_2 = 1.20*M_g,k + 1.50*M_Q,k to kN*m
V_zEd_2 = 1.20*V_g,k + 1.50*V_Q,k to kN

'<i>De gevolgklasse staat in de projectgegevens; K<sub>FI</sub> volgt daaruit
'(Tabel NB.A1.1) en geldt voor alle bladen van dit project.</i>
K_FI', gevolgklasse-factor uit de projectgegevens (EN 1990)'
M_y,Ed = K_FI*max(M_yEd_1; M_yEd_2) to kN*m', incl. K_FI'
V_z,Ed = K_FI*max(V_zEd_1; V_zEd_2) to kN', incl. K_FI'
M_y,Ed
V_z,Ed

'<h6>10.2 Buiging — §6.1.6 (6.11)</h6>
σ_m,y,d = M_y,Ed/W_y to N/mm^2
σ_m,y,d
UC_buiging = σ_m,y,d/f_m,d
#if UC_buiging ≤ 1.0
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>10.3 Afschuiving — §6.1.7 (6.13)</h6>
τ_d = V_z,Ed*S_y/(b_balk*I_y) to N/mm^2
τ_d
UC_afsch = τ_d/f_v,d
#if UC_afsch ≤ 1.0
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 11. Samenvatting

UC_max = max(UC_doorbuiging; UC_buiging; UC_afsch; UC_trilling)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Balklaag voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Balklaag voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten / vereenvoudigingen:
'<ul>
'<li>Eigengewicht balk met EN 338 ρ<sub>mean</sub> (C24 = 420 kg/m³) en
'g = 9,81 m/s². de referentie-uitwerking hanteert een vaste 550 kg/m³ met g = 10; resultaten
'hier daardoor iets gunstiger.</li>
'<li>Concentratiefactor k<sub>r</sub> geverifieerd op vier referentiebladen
'(vloerhout 18 en 25 mm, hoh 600 en 1000, twee profielen).</li>
'<li>Hoogtefactor k<sub>h</sub> geverifieerd in beide takken: gelijmd
'gelamineerd (GL24h, 221 mm → 1,10) en massief (71×146 → 1,005).</li>
'<li>Afschuiving met volle balkbreedte b (geen k<sub>cr</sub>-reductie), conform
'de referentie-uitwerking.</li>
'<li>Trillingstoets (§7.3) en kip zijn niet opgenomen (vloerbalk zijdelings
'gesteund door het vloerhout). Let op: bij overspanningen rond 5 m ligt f<sub>1</sub>
'onder de 8 Hz en is §7.3.3 wél van toepassing.</li>
'<li>Oplegdruk (§6.1.5) wordt niet getoetst, net zomin als in de referentie-uitwerking. Op het
'basisgeval is die u.c. 0,89 met k<sub>c,90</sub> = 1,25 — krap genoeg om apart
'na te lopen.</li>
'</ul></i>
`;
