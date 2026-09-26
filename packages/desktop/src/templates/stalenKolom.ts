/**
 * Stalen kolom op druk en buiging om de sterke as, volgens NEN-EN 1993-1-1
 * met de Nederlandse nationale bijlage. Invoerblad bij StalenKolomDesigner.tsx;
 * de variabelenamen van de invoer komen exact overeen met dat beeld.
 *
 * Belasting: N_Ed, eindmomenten M_yA (boven) en M_yB (onder) en een
 * gelijkmatige last q_z over de hele lengte. Tekenafspraak: buigende momenten;
 * gelijk teken is enkele kromming, en een positieve q_z geeft een positief
 * veldmoment. Daarmee volgen M_Ed (grootste moment over de lengte),
 * V_Ed = |M_yB − M_yA|/L + |q_z|·L/2 en ψ, α_s of α_h voor tabel B.3.
 *
 * Getoetst: doorsnedeklasse (tabel 5.2), doorsnede (§6.2: (6.9), (6.17),
 * (6.31) met (6.33), (6.34) en (6.36), of (6.42)/(6.44) in klasse 3 en 4),
 * knik om beide assen (§6.3.1, tabel 6.2) en torsieknik om een as in de flens
 * als L_cr,z < L_cr, kip met M_cr volgens bijlage NB.NB en χ_LT volgens
 * §6.3.2.3 (λ̄_LT,0 = 0,4 en β = 0,75, NB), en druk met buiging volgens
 * bijlage B, tabel B.2 (torsieslap) met C_my en C_mLT uit tabel B.3.
 *
 * Aan de veilige kant, en op het blad vermeld: C_1 = 1,0 als eindmomenten en
 * q_z samengaan of L_cr ≠ L, met de C_2 van q_z alleen voor een last op de
 * gedrukte flens (een stabiliserende C_2 telt dan niet mee); C_mLT = 1,0 als
 * L_cr ≠ L; C_my = 0,9 (voetnoot tabel B.3) en L_cr,y ≥ L bij verplaatsbare
 * knopen; bij V_Ed > 0,5·V_pl,Rd (1 − ρ)·f_y over de hele doorsnede; is het
 * lijf bij zuivere druk slank (c/t > 42ε), dan telt A_eff (NEN-EN 1993-1-5
 * §4.4) voor N in §6.2 én §6.3. De factor f uit 6.3.2.3(2) is weggelaten.
 * Bij L_cr/h < 5 meldt het blad dat bijlage NB.NB niet geldt (NB.NB.1(2)),
 * net als de gevelkolom.
 *
 * Profielen HEA 100–300, HEB 100–300 en IPE 200–400 (id's 1–27, gelijk aan
 * components/calc/profielen.ts). De matrix hieronder is daar uit geplakt met
 * node scripts/check-profielen.mjs --matrix --sleutel profiel;
 * check-profielen.mjs bewaakt dat hij gelijk blijft. Geen
 * referentieberekening beschikbaar; scripts/check-stalenkolom.mjs rekent de
 * uitkomsten onafhankelijk na en legt een handberekening vast.
 *
 * Op papier is het blad beknopt (PrintDocument.css): uitleg draagt
 * alleen-scherm, korte regels een merkteken kolom-2, kolom-3 of kolom-4. De
 * knopen blijven gelijk; wat het beeld en de controles lezen, verandert niet.
 * Geen backticks in dit commentaar: de controlescripts lezen het blad van de
 * eerste tot de laatste backtick.
 */

export const stalenKolom = `"Stalen kolom — EN 1993-1-1 §6.2 en §6.3

'<i>Kolom op druk en buiging om de sterke as, met gaffels aan de einden van de ongesteunde lengte L<sub>cr</sub>. Getoetst: doorsnede (§6.2), knik (§6.3.1), kip (§6.3.2) en druk met buiging volgens bijlage B (§6.3.3).</i><span class="alleen-scherm"></span>

# 1. Profiel en materiaal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select profiel "Staalprofiel"
  HEA 100 = 1
  HEA 120 = 2
  HEA 140 = 3
  HEA 160 = 4
  HEA 180 = 5
  HEA 200 = 6
  HEA 220 = 7
  HEA 240 = 8
  HEA 260 = 9
  HEA 300 = 10
  HEB 100 = 11
  HEB 120 = 12
  HEB 140 = 13
  HEB 160 = 14
  HEB 180 = 15
  HEB 200 = 16
  HEB 220 = 17
  HEB 240 = 18
  HEB 260 = 19
  HEB 300 = 20
  IPE 200 = 21
  IPE 240 = 22
  IPE 270 = 23
  IPE 300 = 24
  IPE 330 = 25
  IPE 360 = 26
  IPE 400 = 27
@end

@select staalsoort "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

#hide
'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |96; 114; 133; 152; 171; 190; 210; 230; 250; 290; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 135; 150; 160; 170; 180 |5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 14; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 15; 15; 15; 18; 18; 21 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |349.2; 606.2; 1033; 1673; 2510; 3692; 5410; 7763; 10450; 18260; 449.5; 864.4; 1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 104.2; 165.2; 245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 167.3; 317.5; 549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 51.42; 80.97; 119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |2580; 6470; 15060; 31410; 60210; 108000; 193300; 328500; 516400; 1200000; 3380; 9410; 22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
h = hlookup(profielen; profiel; 1; 2)*mm
b = hlookup(profielen; profiel; 1; 3)*mm
t_w = hlookup(profielen; profiel; 1; 4)*mm
t_f = hlookup(profielen; profiel; 1; 5)*mm
r = hlookup(profielen; profiel; 1; 6)*mm
A = hlookup(profielen; profiel; 1; 7)*cm^2
I_y = hlookup(profielen; profiel; 1; 8)*cm^4
W_el,y = hlookup(profielen; profiel; 1; 9)*cm^3
W_pl,y = hlookup(profielen; profiel; 1; 10)*cm^3
i_y = hlookup(profielen; profiel; 1; 11)*cm
A_v,z = hlookup(profielen; profiel; 1; 12)*cm^2
I_z = hlookup(profielen; profiel; 1; 13)*cm^4
i_z = hlookup(profielen; profiel; 1; 16)*cm
I_t = hlookup(profielen; profiel; 1; 17)*cm^4
I_w = hlookup(profielen; profiel; 1; 18)*cm^6
γ_M0 = 1.0
γ_M1 = 1.0
#show
'<table style="border-collapse:collapse; font-size:0.95em; margin:2px 0 6px 0;">
'<tr><td style="padding:2px 8px;">h = 'h' mm</td><td style="padding:2px 8px;">b = 'b' mm</td><td style="padding:2px 8px;">t<sub>w</sub> = 't_w' mm</td><td style="padding:2px 8px;">t<sub>f</sub> = 't_f' mm</td><td style="padding:2px 8px;">r = 'r' mm</td></tr>
'<tr><td style="padding:2px 8px;">A = 'A' cm²</td><td style="padding:2px 8px;">I<sub>y</sub> = 'I_y' cm⁴</td><td style="padding:2px 8px;">W<sub>el,y</sub> = 'W_el,y' cm³</td><td style="padding:2px 8px;">W<sub>pl,y</sub> = 'W_pl,y' cm³</td><td style="padding:2px 8px;">A<sub>v,z</sub> = 'A_v,z' cm²</td></tr>
'<tr><td style="padding:2px 8px;">I<sub>z</sub> = 'I_z' cm⁴</td><td style="padding:2px 8px;">i<sub>y</sub> = 'i_y' cm</td><td style="padding:2px 8px;">i<sub>z</sub> = 'i_z' cm</td><td style="padding:2px 8px;">I<sub>t</sub> = 'I_t' cm⁴</td><td style="padding:2px 8px;">I<sub>w</sub> = 'I_w' cm⁶</td></tr>
'</table>
f_y = staalsoort*N/mm^2', tabel 3.1 (t ≤ 40 mm)<span class="alleen-scherm"></span>'
ε = sqrt(235 N/mm^2/f_y)'<span class="alleen-scherm"></span>'
f_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
ε'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
E = 210000 N/mm^2'<span class="kolom-4"></span>'
G = 81000 N/mm^2'<span class="kolom-4"></span>'
'γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0 (NB bij 6.1(1)).

# 2. Lengtes en belasting

@select knikvorm "Knikvorm om de y-as"
  Niet verplaatsbare knopen = 1
  Verplaatsbare knopen = 2
@end

L_kolom = ?*(mm)'<span class="alleen-scherm">, kolomlengte L</span><span class="kolom-4"></span>'
L_cry = ?*(mm)'<span class="alleen-scherm">, kniklengte om de y-as</span><span class="kolom-4"></span>'
L_crz = ?*(mm)'<span class="alleen-scherm">, kniklengte om de z-as</span><span class="kolom-4"></span>'
L_cr = ?*(mm)'<span class="alleen-scherm">, ongesteunde lengte voor kip</span><span class="kolom-4"></span>'
N_Ed = ?*(kN)'<span class="alleen-scherm">, drukkracht</span><span class="kolom-4"></span>'
M_yA = ?*(kN*m)'<span class="alleen-scherm">, moment bovenaan</span><span class="kolom-4"></span>'
M_yB = ?*(kN*m)'<span class="alleen-scherm">, moment onderaan</span><span class="kolom-4"></span>'
q_z = ?*(kN/m)'<span class="alleen-scherm">, gelijkmatige last loodrecht op de kolom</span><span class="kolom-4"></span>'

@select lasthoogte "Aangrijpingspunt van q_z op de doorsnede"
  Op de gedrukte flens = 1
  In het zwaartepunt = 2
  Op de getrokken flens = 3
@end

'<i>Momenten als buigend moment: gelijk teken is enkele kromming; een positieve q<sub>z</sub> geeft een positief veldmoment.</i>
#if knikvorm ≡ 2 and L_cry < L_kolom
    '<b style="color:#b45309">Bij verplaatsbare knopen is L<sub>cr,y</sub> ten minste L; gerekend met L<sub>cr,y</sub> = L.</b>
#end if
#if N_Ed < 0 kN
    '<b style="color:#b91c1c">N<sub>Ed</sub> is een trekkracht; dit blad toetst een kolom op druk.</b>
#end if
#hide
L_cr,y = if(knikvorm ≡ 2; max(L_cry; L_kolom); L_cry)
M_q = q_z*L_kolom^2/8 to kN*m
ξ_m = if(abs(M_q) > 0 kN*m; min(max(0.5 + (M_yB - M_yA)/(8*M_q); 0); 1); 0.5)
M_m = M_yA + (M_yB - M_yA)*ξ_m + 4*M_q*ξ_m*(1 - ξ_m)
#show
M_s = (M_yA + M_yB)/2 + q_z*L_kolom^2/8 to kN*m', moment halverwege<span class="alleen-scherm"></span>'
M_Ed = max(abs(M_yA); abs(M_yB); abs(M_m)) to kN*m', grootste moment over de lengte<span class="alleen-scherm"></span>'
V_Ed = abs(M_yB - M_yA)/L_kolom + abs(q_z)*L_kolom/2 to kN', grootste dwarskracht, aan een einde<span class="alleen-scherm"></span>'
M_s'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
M_Ed'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
V_Ed'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'

# 3. Doorsnedeklasse (tabel 5.2)

#hide
c_f = (b - t_w - 2*r)/2
c_w = h - 2*t_f - 2*r
k_f = c_f/t_f/ε
f_klasse = if(k_f ≤ 9; 1; if(k_f ≤ 10; 2; if(k_f ≤ 14; 3; 4)))
α_w = min(1; 0.5*(1 + N_Ed/(c_w*t_w*f_y)))
σ_1 = N_Ed/A + M_Ed*c_w/(2*I_y)
σ_2 = N_Ed/A - M_Ed*c_w/(2*I_y)
ψ_w = max(σ_2/max(σ_1; 0.001 N/mm^2); -3)
g_1 = if(α_w > 0.5; 396/(13*α_w - 1); 36/α_w)
g_2 = if(α_w > 0.5; 456/(13*α_w - 1); 41.5/α_w)
g_3 = if(ψ_w > -1; 42/(0.67 + 0.33*ψ_w); 62*(1 - ψ_w)*sqrt(-ψ_w))
k_w = c_w/t_w/ε
w_klasse = if(k_w ≤ g_1; 1; if(k_w ≤ g_2; 2; if(k_w ≤ g_3; 3; 4)))
λ_p,w = c_w/t_w/(28.4*ε*2)
ρ_w = if(c_w/t_w ≤ 42*ε; 1; min(1; (λ_p,w - 0.22)/λ_p,w^2))
#show
'Flens: c/t = 'c_f/t_f' = 'k_f'·ε → klasse 'f_klasse'. Lijf (α = 'α_w', ψ = 'ψ_w'): c/t = 'c_w/t_w' = 'k_w'·ε, grenzen 'g_1'·ε, 'g_2'·ε en 'g_3'·ε → klasse 'w_klasse'.
klasse = max(f_klasse; w_klasse)'<span class="alleen-scherm">, doorsnedeklasse bij N<sub>Ed</sub> en M<sub>Ed</sub></span><span class="kolom-2"></span>'
#hide
W_y = if(klasse ≤ 2; W_pl,y; W_el,y)
#show
W_y'<span class="alleen-scherm">, W<sub>pl,y</sub> in klasse 1 en 2, anders W<sub>el,y</sub></span><span class="kolom-2"></span>'
#if ρ_w < 1
    '<i>Lijf bij zuivere druk slank: c/t = 'c_w/t_w' > 42ε = '42*ε'. Effectieve breedte volgens EN 1993-1-5 §4.4 met ψ = 1 en k<sub>σ</sub> = 4; A<sub>eff</sub> geldt voor N in §6.2 en §6.3 (veilige kant). Bij zuivere buiging is het lijf niet slank: W<sub>eff,y</sub> = W<sub>el,y</sub>.</i><span class="alleen-scherm"></span>
    λ_p,w'<span class="kolom-3"></span>'
    ρ_w', EN 1993-1-5 (4.2)<span class="kolom-3"></span>'
    A_eff = A - (1 - ρ_w)*c_w*t_w to cm^2'<span class="alleen-scherm"></span>'
    A_eff'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
#else
    #hide
    A_eff = A
    #show
#end if
#if f_klasse ≡ 4
    '<b style="color:#b91c1c">De flens valt in klasse 4; dat valt buiten dit blad.</b>
#end if

# 4. Doorsnede (§6.2)

A_v = max(A_v,z; (h - 2*t_f)*t_w) to cm^2', 6.2.6(3)a, ten minste h<sub>w</sub>·t<sub>w</sub> (η = 1,0)<span class="alleen-scherm"></span>'
V_pl,Rd = A_v*f_y/(sqrt(3)*γ_M0) to kN', (6.18)<span class="alleen-scherm"></span>'
A_v'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
V_pl,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
UC_V = V_Ed/V_pl,Rd', (6.17)<span class="kolom-2"></span>'
#if V_Ed ≤ 0.5*V_pl,Rd
    N_c,Rd = A_eff*f_y/γ_M0 to kN', (6.10)<span class="alleen-scherm"></span>'
    M_c,Rd = W_y*f_y/γ_M0 to kN*m', (6.13)/(6.14)<span class="alleen-scherm"></span>'
#else
    ρ_V = (2*V_Ed/V_pl,Rd - 1)^2', 6.2.8(3); (1 − ρ)·f<sub>y</sub> over de hele doorsnede (veilige kant)'
    N_c,Rd = (1 - ρ_V)*A_eff*f_y/γ_M0 to kN'<span class="alleen-scherm"></span>'
    M_c,Rd = (1 - ρ_V)*W_y*f_y/γ_M0 to kN*m'<span class="alleen-scherm"></span>'
#end if
N_c,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
M_c,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#if klasse ≤ 2
    n = N_Ed/N_c,Rd'<span class="alleen-scherm"></span>'
    a_w = min((A - 2*b*t_f)/A; 0.5)'<span class="alleen-scherm"></span>'
    #if N_Ed ≤ min(0.25*N_c,Rd; 0.5*(h - 2*t_f)*t_w*f_y/γ_M0)
        M_N,Rd = M_c,Rd', (6.33) en (6.34): geen vermindering<span class="alleen-scherm"></span>'
    #else
        M_N,Rd = max(min(M_c,Rd*(1 - n)/(1 - 0.5*a_w); M_c,Rd); 0 kN*m) to kN*m', (6.36)<span class="alleen-scherm"></span>'
    #end if
    n'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    a_w'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    M_N,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if n < 1
        UC_d = max(n; M_Ed/M_N,Rd)', (6.9) en (6.31)'
    #else
        UC_d = n + M_Ed/M_c,Rd', de normaalkracht alleen is al groter dan N<sub>c,Rd</sub>'
    #end if
#else
    UC_d = N_Ed/N_c,Rd + M_Ed/M_c,Rd', (6.42) of (6.44), met e<sub>N</sub> = 0'
#end if

# 5. Knik (§6.3.1)

'Tabel 6.2, gewalst I-profiel, h/b = 'h/b': kromme 'if(h/b > 1.2; "a"; "b")' om de y-as en 'if(h/b > 1.2; "b"; "c")' om de z-as.
#hide
α_y = if(h/b > 1.2; 0.21; 0.34)
α_z = if(h/b > 1.2; 0.34; 0.49)
#show
N_cr,y = pi^2*E*I_y/L_cr,y^2 to kN'<span class="alleen-scherm"></span>'
λ_y = sqrt(A_eff*f_y/N_cr,y)', (6.50)<span class="alleen-scherm"></span>'
Φ_y = 0.5*(1 + α_y*(λ_y - 0.2) + λ_y^2)'<span class="alleen-scherm"></span>'
χ_y = min(1; 1/(Φ_y + sqrt(Φ_y^2 - λ_y^2)))', (6.49)<span class="alleen-scherm"></span>'
N_cr,z = pi^2*E*I_z/L_crz^2 to kN'<span class="alleen-scherm"></span>'
λ_z = sqrt(A_eff*f_y/N_cr,z)', (6.50)<span class="alleen-scherm"></span>'
Φ_z = 0.5*(1 + α_z*(λ_z - 0.2) + λ_z^2)'<span class="alleen-scherm"></span>'
χ_z = min(1; 1/(Φ_z + sqrt(Φ_z^2 - λ_z^2)))', (6.49)<span class="alleen-scherm"></span>'
N_cr,y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
λ_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
Φ_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
χ_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
N_cr,z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
λ_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
Φ_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
χ_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#if L_crz < L_cr
    'Torsieknik over L<sub>cr</sub> om een as in de flens (a = h/2), kromme als om de z-as (6.3.1.4)<span class="alleen-scherm">: L<sub>cr,z</sub> < L<sub>cr</sub>, zoals bij een steun aan één flens</span>.
    #hide
    a_T = h/2
    #show
    N_cr,T = (pi^2*E*I_z*a_T^2/L_cr^2 + pi^2*E*I_w/L_cr^2 + G*I_t)/(i_y^2 + i_z^2 + a_T^2) to kN'<span class="alleen-scherm"></span>'
    λ_T = sqrt(A_eff*f_y/N_cr,T)'<span class="alleen-scherm"></span>'
    Φ_T = 0.5*(1 + α_z*(λ_T - 0.2) + λ_T^2)'<span class="alleen-scherm"></span>'
    χ_T = min(1; 1/(Φ_T + sqrt(Φ_T^2 - λ_T^2)))'<span class="alleen-scherm"></span>'
    N_cr,T'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    λ_T'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    Φ_T'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    χ_T'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
#else
    '<i>L<sub>cr,z</sub> ≥ L<sub>cr</sub>: torsieknik is bij een gewalst I-profiel niet maatgevend (NB bij 6.3.1.4).</i><span class="alleen-scherm"></span>
    #hide
    λ_T = 0
    χ_T = 1
    #show
#end if
#hide
χ_zT = min(χ_z; χ_T)
λ_zT = if(χ_T < χ_z; λ_T; λ_z)
#show
N_b,Rd = min(χ_y; χ_zT)*A_eff*f_y/γ_M1 to kN', (6.47)<span class="alleen-scherm"></span>'
N_b,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
UC_N = N_Ed/N_b,Rd', (6.46)'

# 6. Kip (§6.3.2)

#hide
α_LT = if(h/b ≤ 2; 0.34; 0.49)
M_h = if(abs(M_yA) ≥ abs(M_yB); M_yA; M_yB)
ψ = if(abs(M_h) > 0 kN*m; if(abs(M_yA) ≥ abs(M_yB); M_yB; M_yA)/M_h; 1)
q_aan = if(abs(q_z) > 0 kN/m; 1; 0)
m_aan = if(abs(M_yA) + abs(M_yB) > 0 kN*m; 1; 0)
kipgeval = if(L_cr ≠ L_kolom; 3; if(q_aan ≡ 1; if(m_aan ≡ 1; 3; 2); 1))
C_2,q = if(lasthoogte ≡ 1; -0.45*h/(h - t_f); if(lasthoogte ≡ 2; 0; 0.45))
#show
#if L_cr < 5*h
    '<b style="color:#b45309">L<sub>cr</sub>/h &lt; 5: de rekenregels van bijlage NB.NB gelden hier niet (NB.NB.1(2)); toets de gedrukte rand volgens NB.NB.4.2(3).</b>
#end if
#if kipgeval ≡ 1
    'M<sub>cr</sub> volgens bijlage NB.NB, tabel NB.NB.1 geval 1 (eindmomenten, β = ψ = 'ψ')<span class="alleen-scherm">: L<sub>kip</sub> = (1,4 − 0,8β)·L<sub>cr</sub> tussen 1,0 en 1,4·L<sub>cr</sub>, C<sub>1</sub> = 1,75 − 1,05β + 0,3β² ≤ 2,3 en C<sub>2</sub> = 0</span>.
    L_kip = min(max(1.4 - 0.8*(ψ); 1); 1.4)*L_cr to mm'<span class="alleen-scherm"></span>'
    C_1 = min(1.75 - 1.05*(ψ) + 0.3*(ψ)^2; 2.3)'<span class="alleen-scherm"></span>'
    C_2 = 0'<span class="alleen-scherm"></span>'
#else if kipgeval ≡ 2
    'M<sub>cr</sub> volgens bijlage NB.NB, tabel NB.NB.1 geval 2 (gelijkmatige last, 'if(lasthoogte ≡ 1; "op de gedrukte flens"; if(lasthoogte ≡ 2; "in het zwaartepunt"; "op de getrokken flens"))')<span class="alleen-scherm">: C<sub>1</sub> = 1,13; C<sub>2</sub> = −0,45 op de gedrukte flens (naar het buitenvlak geëxtrapoleerd), 0 in het zwaartepunt en +0,45 op de getrokken flens</span>.
    L_kip = L_cr'<span class="alleen-scherm"></span>'
    C_1 = 1.13'<span class="alleen-scherm"></span>'
    C_2 = C_2,q'<span class="alleen-scherm"></span>'
#else
    #if L_cr ≠ L_kolom
        'L<sub>cr</sub> ≠ L: C<sub>1</sub> = 1,0 (gelijkmatig moment, de ongunstigste verdeling); C<sub>2</sub> van q<sub>z</sub> alleen op de gedrukte flens, anders 0; veilige kant.
    #else
        'Eindmomenten en q<sub>z</sub> samen: C<sub>1</sub> = 1,0 (gelijkmatig moment, de ongunstigste verdeling); C<sub>2</sub> van q<sub>z</sub> alleen op de gedrukte flens, anders 0; veilige kant.
    #end if
    L_kip = L_cr'<span class="alleen-scherm"></span>'
    C_1 = 1'<span class="alleen-scherm"></span>'
    C_2 = if(q_aan ≡ 1; min(C_2,q; 0); 0)'<span class="alleen-scherm">, een stabiliserende C<sub>2</sub> (last op de getrokken flens) telt bij C<sub>1</sub> = 1,0 niet mee</span><span class="alleen-scherm"></span>'
#end if
L_kip'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
C_1'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
C_2'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
S = sqrt(E*I_w/(G*I_t)) to mm'<span class="alleen-scherm"></span>'
S'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
M_cr = pi*C_1/L_kip*(sqrt(1 + pi^2*S^2*((C_2)^2 + 1)/L_kip^2) + pi*(C_2)*S/L_kip)*sqrt(E*I_z*G*I_t) to kN*m', bijlage NB.NB<span class="alleen-scherm"></span>'
'Kipkromme 'if(h/b ≤ 2; "b"; "c")' (tabel 6.5, h/b = 'h/b'), λ̄<sub>LT,0</sub> = 0,4 en β = 0,75 (NB bij 6.3.2.3)<span class="alleen-scherm">; de factor f uit 6.3.2.3(2) is weggelaten (veilige kant)</span>.
λ_LT = sqrt(W_y*f_y/M_cr)'<span class="alleen-scherm"></span>'
Φ_LT = 0.5*(1 + α_LT*(λ_LT - 0.4) + 0.75*λ_LT^2)'<span class="alleen-scherm"></span>'
χ_LT = min(1; 1/λ_LT^2; 1/(Φ_LT + sqrt(Φ_LT^2 - 0.75*λ_LT^2)))', (6.57)<span class="alleen-scherm"></span>'
M_b,Rd = χ_LT*W_y*f_y/γ_M1 to kN*m', (6.55)<span class="alleen-scherm"></span>'
M_cr'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
λ_LT'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
χ_LT'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
M_b,Rd'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
UC_LT = M_Ed/M_b,Rd', (6.54)'

# 7. Druk met buiging (§6.3.3, bijlage B)

#hide
α_s = if(abs(M_h) > 0 kN*m; M_s/M_h; 0)
α_h = if(abs(M_s) > 0 kN*m; M_h/M_s; 0)
C_m,lin = max(0.6 + 0.4*ψ; 0.4)
C_m,s = if(α_s ≥ 0; max(0.2 + 0.8*α_s; 0.4); if(ψ ≥ 0; max(0.1 - 0.8*α_s; 0.4); max(0.1*(1 - ψ) - 0.8*α_s; 0.4)))
C_m,h = if(α_h ≥ 0 or ψ ≥ 0; 0.95 + 0.05*α_h; 0.95 + 0.05*α_h*(1 + 2*ψ))
C_m = if(q_aan ≡ 0; C_m,lin; if(abs(M_s) ≤ abs(M_h); C_m,s; C_m,h))
#show
#if q_aan ≡ 0
    'Tabel B.3 over de lengte L, lineair moment: ψ = 'ψ' → C<sub>m</sub> = 0,6 + 0,4ψ ≥ 0,4 = 'C_m'.
#else if abs(M_s) ≤ abs(M_h)
    'Tabel B.3 over de lengte L, gelijkmatige last met |M<sub>s</sub>| ≤ |M<sub>h</sub>|: α<sub>s</sub> = M<sub>s</sub>/M<sub>h</sub> = 'α_s', ψ = 'ψ' → C<sub>m</sub> = 'C_m'.
#else
    'Tabel B.3 over de lengte L, gelijkmatige last met |M<sub>s</sub>| > |M<sub>h</sub>|: α<sub>h</sub> = M<sub>h</sub>/M<sub>s</sub> = 'α_h', ψ = 'ψ' → C<sub>m</sub> = 'C_m'.
#end if
#if knikvorm ≡ 2
    C_my = 0.9', verplaatsbare knopen (voetnoot tabel B.3)<span class="kolom-2"></span>'
#else
    C_my = C_m'<span class="kolom-2"></span>'
#end if
#if L_cr ≡ L_kolom
    C_mLT = C_m'<span class="kolom-2"></span>'
#else
    C_mLT = 1', L<sub>cr</sub> ≠ L (veilige kant)<span class="kolom-2"></span>'
#end if
N_Rk = A_eff*f_y to kN'<span class="alleen-scherm"></span>'
n_y = N_Ed/(χ_y*N_Rk/γ_M1)'<span class="alleen-scherm"></span>'
n_z = N_Ed/(χ_zT*N_Rk/γ_M1)'<span class="alleen-scherm"></span>'
#if klasse ≤ 2
    k_yy = C_my*min(1 + (λ_y - 0.2)*n_y; 1 + 0.8*n_y)', tabel B.2<span class="alleen-scherm"></span>'
    #if λ_zT < 0.4
        k_zy = min(0.6 + λ_zT; 1 - 0.1*λ_zT*n_z/(C_mLT - 0.25))', tabel B.2<span class="alleen-scherm"></span>'
    #else
        k_zy = max(1 - 0.1*λ_zT*n_z/(C_mLT - 0.25); 1 - 0.1*n_z/(C_mLT - 0.25))', tabel B.2<span class="alleen-scherm"></span>'
    #end if
#else
    k_yy = C_my*min(1 + 0.6*λ_y*n_y; 1 + 0.6*n_y)', tabel B.2<span class="alleen-scherm"></span>'
    k_zy = max(1 - 0.05*λ_zT*n_z/(C_mLT - 0.25); 1 - 0.05*n_z/(C_mLT - 0.25))', tabel B.2<span class="alleen-scherm"></span>'
#end if
n_y'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
n_z'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
k_yy', tabel B.2<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
k_zy', tabel B.2<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
UC_661 = n_y + k_yy*M_Ed/M_b,Rd', (6.61)'
UC_662 = n_z + k_zy*M_Ed/M_b,Rd', (6.62)'

# 8. Samenvatting

'<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Dwarskracht</td><td style="padding:4px 8px;">§6.2.6 (6.17)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_V)'">'UC_V'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_V)'">'oordeel(UC_V)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Doorsnede, normaalkracht en buiging</td><td style="padding:4px 8px;">§6.2.9</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_d)'">'UC_d'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_d)'">'oordeel(UC_d)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Knik</td><td style="padding:4px 8px;">§6.3.1 (6.46)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_N)'">'UC_N'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_N)'">'oordeel(UC_N)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kip</td><td style="padding:4px 8px;">§6.3.2 (6.54)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_LT)'">'UC_LT'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_LT)'">'oordeel(UC_LT)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk met buiging</td><td style="padding:4px 8px;">(6.61) / (6.62)</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(max(UC_661; UC_662))'">'UC_661' / 'UC_662'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(max(UC_661; UC_662))'">'oordeel(max(UC_661; UC_662))'</td></tr>
'</table>
UC_max = max(UC_V; UC_d; UC_N; UC_LT; UC_661; UC_662)'<span class="alleen-scherm"></span>'
#if N_Ed < 0 kN
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de kolom is niet getoetst</b>: N<sub>Ed</sub> is een trekkracht.</span>
#else if f_klasse ≡ 4
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de kolom voldoet niet</b>: de flens valt in klasse 4, en die valt buiten dit blad.</span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de kolom voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de kolom voldoet niet</b></span>
#end if

'<i>Niet getoetst: eigen gewicht, buiging om de z-as, de verbindingen en de krachtsinleiding. Tweede-orde-effecten in het vlak lopen via L<sub>cr,y</sub> en de knikvorm.</i>
`;
