/**
 * Toetsing van een houten balklaag (enkelvoudig opgelegde balk) onder
 * gelijkmatige + puntlast, conform EN 1995-1-1 (Eurocode 5) + NEN-EN NB.
 *
 * Gebaseerd op het CH1-tabblad van een typische 3BM-werkberekening
 * (3086 Aanbouw Doevelskerc) met dezelfde structuur:
 *   1. Geometrie + materiaal
 *   2. Belastingen (G_k + q_k + Q_k)
 *   3. Belastingscombinaties (UGT 6.10a/b, BGT 6.14b/16b)
 *   4. Krachtsverdeling (M, V, u)
 *   5. UGT-toetsing (buiging §6.1.6, dwarskracht §6.1.7, oplegging §6.1.5)
 *   6. Kip §6.3.3
 *   7. BGT-doorbuiging §7.2
 */

export const houtenBalklaag = `"Houten balklaag — toetsing EN 1995-1-1

'<i>Enkelvoudig opgelegde balk onder gelijkmatige belasting (vloer, dak)
'plus optioneel een puntlast (Q_k). Inclusief kipcontrole en doorbuiging.</i>

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
  44 × 121 = 1
  50 × 100 = 2
  50 × 125 = 3
  50 × 150 = 4
  50 × 175 = 5
  50 × 200 = 6
  50 × 225 = 7
  50 × 250 = 8
  50 × 275 = 9
  50 × 300 = 10
  63 × 175 = 11
  63 × 200 = 12
  63 × 225 = 13
  63 × 250 = 14
  63 × 275 = 15
  63 × 300 = 16
  75 × 200 = 17
  75 × 225 = 18
  75 × 250 = 19
  75 × 275 = 20
  75 × 300 = 21
@end

#hide
'Profielmatrix [id | b(mm) | h(mm)]
profiles_b_h = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21 |44; 50; 50; 50; 50; 50; 50; 50; 50; 50; 63; 63; 63; 63; 63; 63; 75; 75; 75; 75; 75 |121; 100; 125; 150; 175; 200; 225; 250; 275; 300; 175; 200; 225; 250; 275; 300; 200; 225; 250; 275; 300]
b_p = hlookup(profiles_b_h; profile; 1; 2)*mm
h_p = hlookup(profiles_b_h; profile; 1; 3)*mm
#show

@select klimaatklasse "Klimaatklasse"
  I — droog binnenklimaat = 1
  II — overdekt buiten = 2
  III — vol weersbelast = 3
@end

#hide
'Houtsterkte-eigenschappen — EN 338 (alle in N/mm² behalve ρ_k in kg/m³)
'  [id(C-klasse) | f_m,k | f_t,0,k | f_c,0,k | f_v,k | E_0,mean | E_0,05 | rho_k]
strength_C = [14; 16; 18; 20; 22; 24; 27; 30; 35; 40 |14; 16; 18; 20; 22; 24; 27; 30; 35; 40 |8; 10; 11; 12; 13; 14; 16; 18; 21; 24 |16; 17; 18; 19; 20; 21; 22; 23; 25; 26 |1.7; 1.8; 2.0; 2.2; 2.4; 2.5; 2.8; 3.0; 3.4; 3.8 |7000; 8000; 9000; 9500; 10000; 11000; 11500; 12000; 13000; 14000 |4700; 5400; 6000; 6400; 6700; 7400; 7700; 8000; 8700; 9400 |290; 310; 320; 330; 340; 350; 370; 380; 400; 420]

f_m,k = hlookup(strength_C; houtkwaliteit; 1; 2)*N/mm^2
f_t,0,k = hlookup(strength_C; houtkwaliteit; 1; 3)*N/mm^2
f_c,0,k = hlookup(strength_C; houtkwaliteit; 1; 4)*N/mm^2
f_v,k = hlookup(strength_C; houtkwaliteit; 1; 5)*N/mm^2
E_0,mean = hlookup(strength_C; houtkwaliteit; 1; 6)*N/mm^2
E_0,05 = hlookup(strength_C; houtkwaliteit; 1; 7)*N/mm^2
ρ_k = hlookup(strength_C; houtkwaliteit; 1; 8)*kg/m^3

'k_def uit Tabel 3.2: hangt af van klimaatklasse, hier voor gezaagd hout
#if klimaatklasse ≡ 1
    k_def = 0.6
#else if klimaatklasse ≡ 2
    k_def = 0.8
#else
    k_def = 2.0
#end if

'k_h — hoogtefactor §3.2: min(1.3; (150/h)^0.2) voor h < 150 mm
k_h = if(h_p < 150 mm; min(1.3; (150 mm/h_p)^0.2); 1.0)

'Cross-section properties
A = b_p*h_p
W_y = b_p*h_p^2/6
I_y = b_p*h_p^3/12
#show

'Profielselectie: b = 'b_p' · h = 'h_p
A
W_y
I_y
'Materiaal C-klasse: f<sub>m,k</sub> = 'f_m,k', E<sub>0,mean</sub> = 'E_0,mean
'k<sub>def</sub> = 'k_def' (Tabel 3.2)'
'k<sub>h</sub> = 'k_h' (§3.2 hoogtefactor)'

l_ov = ?*(m)', overspanning van de balk (m)'
hoh = ?*(m)', hart-op-hart afstand tussen balken (m)'

# 2. Belastingen

G_k,vlak = ?*(kN/m^2)', eigen gewicht + permanente afwerking (kN/m²)'
q_k,vlak = ?*(kN/m^2)', gebruikersbelasting (kN/m²)'
Q_k = ?*(kN)', puntlast in midden — 0 als niet relevant (kN)'

'Eigen gewicht balk per m¹: g = b·h·ρ
g_eigen = b_p*h_p*ρ_k*9.81 m/s^2

G_k = G_k,vlak*hoh + g_eigen', permanente lijnlast (kN/m)'
q_k = q_k,vlak*hoh', variabele lijnlast (kN/m)'

# 3. Belastingscombinaties

#hide
'γ-factoren — NEN-EN 1990 NB Tabel A1.2(B) groep C (RC2/CC2)
γ_G,6.10a = 1.22
γ_Q,6.10a = 1.35
γ_G,6.10b = 1.08
γ_Q,6.10b = 1.35
ψ_0 = 0.40', algemene categorieën woon/kantoor — Tabel A1.1'
ψ_1 = 0.20
ψ_2 = 0.10
k_r = 0.7', puntlast-spreiding 0.5×0.5 m (vereenvoudigd)'
#show

'UGT 6.10a (G overheerst): q<sub>d,a</sub> = γ<sub>G</sub>·G + γ<sub>Q</sub>·ψ<sub>0</sub>·q
q_d,a = γ_G,6.10a*G_k + γ_Q,6.10a*ψ_0*q_k
F_d,a = γ_Q,6.10a*ψ_0*Q_k*k_r

'UGT 6.10b (Q overheerst): q<sub>d,b</sub> = γ<sub>G</sub>·G + γ<sub>Q</sub>·q
q_d,b = γ_G,6.10b*G_k + γ_Q,6.10b*q_k
F_d,b = γ_Q,6.10b*Q_k*k_r

'BGT 6.14b (karakteristiek): q<sub>sls</sub> = G + q
q_sls = G_k + q_k
F_sls = Q_k*k_r

'BGT 6.16b (quasi-permanent met kruip):
q_qp = (1 + k_def)*G_k + (ψ_0 + k_def*ψ_2)*q_k
F_qp = (ψ_0 + k_def*ψ_2)*Q_k*k_r

# 4. Krachtsverdeling

'<i>Enkelvoudig opgelegd, UDL + puntlast in midden:
'  M = ⅛·q·L² + ¼·F·L
'  V = ½·q·L + ½·F
'  u = 5qL⁴/(384·E·I) + FL³/(48·E·I)</i>

M_Ed,a = 0.125*q_d,a*l_ov^2 + 0.25*F_d,a*l_ov
M_Ed,b = 0.125*q_d,b*l_ov^2 + 0.25*F_d,b*l_ov
M_Ed = max(M_Ed,a; M_Ed,b)

V_Ed,a = 0.5*q_d,a*l_ov + 0.5*F_d,a
V_Ed,b = 0.5*q_d,b*l_ov + 0.5*F_d,b
V_Ed = max(V_Ed,a; V_Ed,b)

R_Ed = V_Ed', oplegreactie (zelfde grootte als V max)'

# 5. UGT — buiging §6.1.6

#hide
γ_M = 1.3', NB voor gezaagd hout'
'k_mod — Tabel 3.1: hangt af van klimaatklasse + belasting-duur. Default
'belasting "middellang" (categorie 3, gebruiksbelasting).
#if klimaatklasse ≡ 1
    k_mod = 0.80
#else if klimaatklasse ≡ 2
    k_mod = 0.80
#else
    k_mod = 0.65
#end if
#show

'k<sub>mod</sub> = 'k_mod' (klimaatklasse, belasting-duur middellang)'

f_m,d = k_mod*k_h*f_m,k/γ_M
σ_m,d = M_Ed/W_y
UC_M = σ_m,d/f_m,d

#if UC_M ≤ 1.0
    'UC<sub>M</sub> = σ<sub>m,d</sub>/f<sub>m,d</sub> = 'UC_M'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>M</sub> = σ<sub>m,d</sub>/f<sub>m,d</sub> = 'UC_M'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 6. UGT — dwarskracht §6.1.7

#hide
k_cr = 0.67', §6.1.7(2) — scheurfactor voor gezaagd hout'
#show

f_v,d = k_mod*f_v,k/γ_M
τ_d = 1.5*V_Ed/(b_p*h_p*k_cr)
UC_V = τ_d/f_v,d

#if UC_V ≤ 1.0
    'UC<sub>V</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_V'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>V</sub> = τ<sub>d</sub>/f<sub>v,d</sub> = 'UC_V'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 7. UGT — druk loodrecht op de vezels (oplegging) §6.1.5

l_opl = ?*(mm)', opleglengte van de balk (mm)'

#hide
'f_c,90,k volgt uit dezelfde C-klasse — vereenvoudigd 2.4 N/mm² voor C16-C30
f_c,90,k = if(houtkwaliteit ≤ 16; 2.2; if(houtkwaliteit ≤ 30; 2.4; 2.7))*N/mm^2
k_c,90 = 1.50', §6.1.5(3) — balk op steun, korte oplegging'
#show

A_opl = b_p*l_opl
f_c,90,d = k_mod*f_c,90,k/γ_M
σ_c,90,d = R_Ed/A_opl
UC_C90 = σ_c,90,d/(k_c,90*f_c,90,d)

#if UC_C90 ≤ 1.0
    'UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_C90'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>c,90</sub> = σ<sub>c,90,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>) = 'UC_C90'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 8. Kipcontrole §6.3.3

n_kipsteunen = ?', aantal tussenliggende kipsteunen (0 = geen)'

l_ef = l_ov/(n_kipsteunen + 1)*0.9', effectieve lengte (k_ef ≈ 0.9 voor UDL)'

σ_m,crit = 0.78*b_p^2*E_0,05/(h_p*l_ef)
λ_rel,m = sqrt(f_m,k/σ_m,crit)

#if λ_rel,m ≤ 0.75
    k_crit = 1.0
#else if λ_rel,m ≤ 1.4
    k_crit = 1.56 - 0.75*λ_rel,m
#else
    k_crit = 1/λ_rel,m^2
#end if

f_m,kip,d = k_crit*k_mod*k_h*f_m,k/γ_M
UC_kip = σ_m,d/f_m,kip,d

'λ̄<sub>rel,m</sub> = 'λ_rel,m'    k<sub>crit</sub> = 'k_crit
#if UC_kip ≤ 1.0
    'UC<sub>kip</sub> = σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>) = 'UC_kip'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>kip</sub> = σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>) = 'UC_kip'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 9. BGT — doorbuiging §7.2

'<i>u<sub>inst</sub> = 5qL⁴/(384·EI) + FL³/(48·EI)
'u<sub>fin</sub> = u<sub>inst</sub>·(1 + k<sub>def</sub>) (kruip)
'Grens u<sub>max</sub> = L/250 (algemeen); u<sub>bij</sub> = L/333 (bijkomend)</i>

u_inst,kar = 5*q_sls*l_ov^4/(384*E_0,mean*I_y) + F_sls*l_ov^3/(48*E_0,mean*I_y)
u_fin = (1 + k_def)*u_inst,kar
u_bij = u_inst,kar', alleen variabele deel zou strikt u_bij zijn; vereenvoudigd'

@select doorbuigGrensFin "Doorbuigingsgrens u_fin (Tabel 7.2)"
  L/250 (vloer/dak standaard) = 250
  L/200 (rougher) = 200
  L/300 (gevoelig) = 300
@end

@select doorbuigGrensBij "Doorbuigingsgrens u_bij (bijkomend)"
  L/333 (vloer comfort) = 333
  L/300 = 300
  L/500 (zeer strict) = 500
@end

u_fin,lim = l_ov/doorbuigGrensFin
u_bij,lim = l_ov/doorbuigGrensBij

UC_u,fin = u_fin/u_fin,lim
UC_u,bij = u_bij/u_bij,lim

#if UC_u,fin ≤ 1.0
    'UC<sub>u,fin</sub> = u<sub>fin</sub>/u<sub>lim</sub> = 'UC_u,fin'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>u,fin</sub> = u<sub>fin</sub>/u<sub>lim</sub> = 'UC_u,fin'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if
#if UC_u,bij ≤ 1.0
    'UC<sub>u,bij</sub> = u<sub>bij</sub>/u<sub>lim</sub> = 'UC_u,bij'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC<sub>u,bij</sub> = u<sub>bij</sub>/u<sub>lim</sub> = 'UC_u,bij'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

'<hr/>
'<i>Vereenvoudigingen:
'<ul>
'<li>Belasting-duur "middellang" hardcoded. Bij andere categorieën (kort/zeer kort/permanent)
'wijkt k<sub>mod</sub> af; pas dan §3.1.3 + Tabel 3.1 toe.</li>
'<li>Eigen gewicht balk via ρ<sub>k</sub>·b·h·g (zonder veiligheid). De aansluitende afwerking
'(plafond, vloer-finish) verdisconteer je in G<sub>k,vlak</sub>.</li>
'<li>Lastreductie k<sub>r</sub> voor puntlast op 0.5×0.5 m belastingvlak gefixeerd op 0.7.</li>
'<li>Trillingscontrole §7.3 (vloer-resonantie f<sub>1</sub> ≥ 8 Hz) niet in deze sheet.</li>
'<li>Kniklengte = staaflengte; k_ef ≈ 0.9 voor UDL. Voor andere ondersteuningstype 6.3.3.3.</li>
'</ul></i>
`;
