/**
 * Balklaag — houten vloerbalken volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Reproduceert de referentie-uitwerking: 3 belastingsgevallen (permanent UDL,
 * veranderlijk UDL, geconcentreerde last met concentratiefactor k_r),
 * BGT-doorbuiging (w_fin met kruip k_def) en UGT (buiging §6.1.6 + afschuiving
 * §6.1.7).
 *
 * Eigengewicht balk: A · ρ_mean · g volgens EN 1991-1-1 / EN 338 (ρ_mean per
 * sterkteklasse). De referentie-uitwerking rekent dit ~5,5 kN/m³ (te hoog voor C24); hier de
 * correcte ρ_mean (C24 = 420 kg/m³ ≈ 4,12 kN/m³).
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

@select eigengewicht "Eigengewicht-dichtheid balk"
  EN 338 (ρ_mean, normconform) = 0
  Referentie (550 kg/m³) = 550
@end

@select gevolgklasse "Gevolgklasse (CC)"
  CC1 (K_FI 0,90) = 0.9
  CC2 (K_FI 1,00) = 1.0
  CC3 (K_FI 1,10) = 1.1
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
ρ_eg = if(eigengewicht ≡ 0; ρ_mean; 550 kg/m^3)', dichtheid voor eigengewicht'
#show

'<h6>Gekozen profiel en materiaal</h6>
b_balk
h_balk
f_m,k
f_v,k
E_mean
k_mod

f_m,d = k_mod*f_m,k/γ_M', rekenwaarde buigsterkte'
f_v,d = k_mod*f_v,k/γ_M', rekenwaarde afschuifsterkte'
f_m,d
f_v,d

# 2. Geometrie

L_d = ?*(mm)', dagmaat (vrije overspanning)'
a_opl = ?*(mm)', opleglengte per zijde'
hoh = ?*(mm)', hart-op-hart afstand van de balken'
t_vloer = ?*(mm)', dikte vloerhout (vloerplaat)'

L_th = L_d + a_opl', theoretische overspanning (= L_d + 2·a_opl/2)'
L_th

# 3. Belastingen

g_vloerplaat = ?*(kN/m^2)', e.g. vloerplaat'
g_wanden = ?*(kN/m^2)', e.g. scheidingswanden'
g_plafond = ?*(kN/m^2)', e.g. plafond'
g_overig = ?*(kN/m^2)', overig permanent'
q_k = ?*(kN/m^2)', veranderlijke vloerbelasting'
Q_k = ?*(kN)', geconcentreerde last'

@select belastingcat "Belastingcategorie (ψ-waarden)"
  Vloer (woning/kantoor) = 2
  Dak = 1
  Zelf invullen = 3
@end

@select verplaatsbaar "Scheidingswanden verplaatsbaar"
  Nee (vast) = 0
  Ja (verplaatsbaar) = 1
@end

ψ_0_zelf = ?', ψ0 — alleen bij "zelf invullen"'
ψ_2_zelf = ?', ψ2 — alleen bij "zelf invullen"'
ψ_0 = if(belastingcat ≡ 1; 0; if(belastingcat ≡ 2; 0.5; ψ_0_zelf))
ψ_2 = if(belastingcat ≡ 1; 0; if(belastingcat ≡ 2; 0.3; ψ_2_zelf))
ψ_0
ψ_2

'<i>Verplaatsbare scheidingswanden worden als gelijkmatig verdeelde veranderlijke
'last meegenomen (EN 1991-1-1 §6.3.1.2); vaste wanden tellen als permanent.</i>
g_k = g_vloerplaat + g_plafond + g_overig + if(verplaatsbaar ≡ 0; g_wanden; 0 kN/m^2)', permanente vloerbelasting'
q_k_eff = q_k + if(verplaatsbaar ≡ 1; g_wanden; 0 kN/m^2)', veranderlijk incl. verplaatsbare wanden'
g_k
q_k_eff

# 4. Doorsnede-eigenschappen

A = b_balk*h_balk
I_y = b_balk*h_balk^3/12', traagheidsmoment'
W_y = b_balk*h_balk^2/6', weerstandsmoment'
S_y = b_balk*h_balk^2/8', statisch moment (NL) voor afschuiving'
A
I_y
W_y
S_y

#hide
g_n = 9.81 m/s^2
#show
g_balk = A*ρ_eg*g_n', eigengewicht balk'
g_balk

# 5. Belastingsgeval 1 — Permanent

P_g,k = hoh*g_k + g_balk', lijnlast permanent op de balk'
P_g,k
M_g,k = P_g,k*L_th^2/8
V_g,k = P_g,k*L_th/2
u_g,k = 5/384*P_g,k*L_th^4/(E_mean*I_y)', momentane doorbuiging permanent'
M_g,k
V_g,k
u_g,k

# 6. Belastingsgeval 2 — Veranderlijk (gelijkmatig)

q_q,k = hoh*q_k_eff', lijnlast veranderlijk'
q_q,k
M_q,k = q_q,k*L_th^2/8
V_q,k = q_q,k*L_th/2
u_q,k = 5/384*q_q,k*L_th^4/(E_mean*I_y)
M_q,k
V_q,k
u_q,k

# 7. Belastingsgeval 3 — Geconcentreerde last

'<i>Een puntlast verdeelt zich via het vloerhout over meerdere balken. De
'concentratiefactor k<sub>r</sub> bepaalt het deel dat op één balk komt
'(NEN-EN 1995-1-1 NB). Stijver vloerhout (dikker) → kleinere k<sub>r</sub>.</i>

#hide
a_ref = 1000 mm
C_kr = 85700 mm^3', kalibratie referentie-uitwerking — derde term = t_vloer³/C_kr (onafh. van I_y)'
#show
k_r = 0.37 + 0.8*hoh/a_ref - t_vloer^3/C_kr', concentratiefactor (NEN-EN 1995-1-1 NB)'
k_r
F_Q,k = Q_k*k_r', effectieve puntlast op één balk'
F_Q,k
M_Q,k = F_Q,k*L_th/4
V_Q,k = F_Q,k', puntlast bij oplegging → volledige dwarskracht op de balk'
u_Q,k = 1/48*F_Q,k*L_th^3/(E_mean*I_y)
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
    u_var = max(u_q,k; u_Q,k)', maatgevende veranderlijke doorbuiging'
    w_fin = (1 + k_def)*u_g,k + (1 + ψ_2*k_def)*u_var
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

# 10. Toetsing UGT

'<h6>10.1 Maatgevende krachten</h6>
'Permanent + veranderlijk (UDL):
M_yEd_1 = 1.20*M_g,k + 1.50*M_q,k
V_zEd_1 = 1.20*V_g,k + 1.50*V_q,k
'Permanent + geconcentreerde last:
M_yEd_2 = 1.20*M_g,k + 1.50*M_Q,k
V_zEd_2 = 1.20*V_g,k + 1.50*V_Q,k

K_FI = gevolgklasse', gevolgklasse-factor (EN 1990)'
M_y,Ed = K_FI*max(M_yEd_1; M_yEd_2)', incl. K_FI'
V_z,Ed = K_FI*max(V_zEd_1; V_zEd_2)', incl. K_FI'
K_FI
M_y,Ed
V_z,Ed

'<h6>10.2 Buiging — §6.1.6 (6.11)</h6>
σ_m,y,d = M_y,Ed/W_y
σ_m,y,d
UC_buiging = σ_m,y,d/f_m,d
#if UC_buiging ≤ 1.0
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>buiging</sub> = σ<sub>m,y,d</sub>/f<sub>m,d</sub> = 'UC_buiging'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

'<h6>10.3 Afschuiving — §6.1.7 (6.13)</h6>
τ_d = V_z,Ed*S_y/(b_balk*I_y)
τ_d
UC_afsch = τ_d/f_v,d
#if UC_afsch ≤ 1.0
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'UC<sub>afschuiving</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_afsch'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 11. Samenvatting

UC_max = max(UC_doorbuiging; UC_buiging; UC_afsch)
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1.0 → <b>Balklaag voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1.0 → <b>Balklaag voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten / vereenvoudigingen:
'<ul>
'<li>Eigengewicht balk met EN 338 ρ<sub>mean</sub> (C24 = 420 kg/m³). De referentie-uitwerking
'hanteert ~5,5 kN/m³ (hoger); resultaten hier daardoor iets gunstiger.</li>
'<li>Concentratiefactor k<sub>r</sub> met kalibratieconstante uit de referentie-
'voorbeelden; nog te verifiëren met een referentiecase.</li>
'<li>Afschuiving met volle balkbreedte b (geen k<sub>cr</sub>-reductie), conform
'de referentie-uitwerking.</li>
'<li>Trillingstoets (§7.3) en kip zijn niet opgenomen (vloerbalk zijdelings
'gesteund door het vloerhout).</li>
'</ul></i>
`;
