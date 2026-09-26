/**
 * Schoorverbinding — een windverbandschoor van gelijkzijdig hoekstaal, met één
 * rij bouten door één been op een schetsplaat, volgens NEN-EN 1993-1-8 en
 * NEN-EN 1993-1-1 met de Nederlandse nationale bijlagen.
 *
 * Model (zoals SchoorDesigner.tsx het tekent): de schetsplaat b × h is met twee
 * randen aan de knoop gelast, de onderrand (lengte b) en de zijrand (lengte h).
 * De werklijn van de schoor gaat door de hoek van de plaat, het werkpunt. Het
 * hoekstaal begint op l_0 van het werkpunt; bout 1 zit op e_1 van het eind van
 * het hoekstaal, de volgende op de steek p_1. De rand van de plaat voorbij de
 * buitenste bout (e_1,p, langs de as) en de afstand tot de vrije rand van de
 * plaat (e_2,p, loodrecht op de as) volgen uit die maten. De gelaste randen
 * tellen daarbij niet als rand.
 *
 * Getoetst:
 *   • hoekstaal op trek: bruto (6.6) en de effectieve netto doorsnede van
 *     EN 1993-1-8 §3.10.3, (3.11) tot (3.13) met β uit tabel 3.8. Bij een
 *     dubbel hoekstaal per hoekstaal hetzelfde, aan de veilige kant;
 *   • blokschuif in het been (3.10), naar de vrije rand van het been;
 *   • de bouten volgens tabel 3.4: afschuiving (draad in het afschuifvlak,
 *     één of twee afschuifvlakken) en stuik in het been en in de schetsplaat,
 *     met k_1 zonder p_2-tak (één boutrij). §3.6.1(10) begrenst de stuik bij
 *     een enkel hoekstaal met één bout altijd, met meer bouten als keuze (de
 *     begrenzing geldt strikt voor één bout in de krachtsrichting en ligt
 *     daarbuiten aan de veilige kant). Bij een lange verbinding (L_j > 15·d)
 *     de reductie β_Lf van §3.8 op F_v,Rd. De boutgroep volgens §3.7(1);
 *   • de schetsplaat op trek over de effectieve breedte (spreiding onder 30°
 *     over de boutrij), met (6.6) en (6.7). Bij bout 1 begrensd door alle
 *     randen van de plaat, ook de gelaste: voorbij de las ligt het profiel
 *     waaraan de plaat vastzit, en dat toetst dit blad niet (veilige kant);
 *   • blokschuif in de schetsplaat: twee afschuifvlakken langs de boutrij
 *     (3.9), of één met een trekvlak naar de vrije rand (3.10);
 *   • bij trek en druk: knik van de schetsplaat als strook over de effectieve
 *     breedte, met l_k = 0,65 × de afstand van bout 1 tot het werkpunt en
 *     kromme c (§6.3.1). Met één bout is dat niet te toetsen en voldoet de
 *     verbinding niet;
 *   • de hoeklassen langs de twee gelaste randen (§4.5.3.3): omdat de werklijn
 *     door het werkpunt gaat, draagt de onderrand F_Ed·cos θ en de zijrand
 *     F_Ed·sin θ, elk met twee hoeklassen. Daarbij de schuif in de plaat langs
 *     die randen (6.18) en de eisen van §4.5.1(2) en §4.5.2(2);
 *   • de afstanden van tabel 3.3; bij druk ook de grootste steek. Omdat de
 *     vrije randen schuin op de as staan, ook de kortste afstand van de
 *     buitenste bout tot een vrije rand, loodrecht op die rand (e_rand), aan
 *     de veilige kant;
 *   • het eind van het hoekstaal mag niet voorbij een gelaste rand steken
 *     (l_0 ≥ l_0,min); een gewiste l_0 valt daar ook onder. Het gat moet
 *     binnen het vlakke deel van het been liggen: e_2 + d_0/2 ≤ h − t. De
 *     sluitring onder kop of moer (ISO 7089) moet naast het uitstaande been
 *     vlak liggen, vrij van de afronding: h − e_2 − d_s/2 ≥ t + r_1.
 *
 * Niet in dit blad: knik van de schoor zelf (dat hoort bij het blad van het
 * windverband), het profiel of de plaat waaraan de schetsplaat is gelast, en
 * de maxima van tabel 3.3 voor staal dat aan weer is blootgesteld.
 *
 * Profielgegevens: de hoekstaaltabel uit components/calc/profielen.ts, hier
 * geplakt (scripts/check-profielen.mjs bewaakt dat hij gelijk blijft).
 * scripts/check-schoor.mjs rekent de uitkomsten onafhankelijk na.
 *
 * Variabelenamen komen exact overeen met SchoorDesigner.tsx.
 */

export const schoorverbinding = `"Schoorverbinding — EN 1993-1-8 §3.6 tot §3.10 en §4.5

'<i>Een windverbandschoor van hoekstaal, met één rij bouten door één been op een schetsplaat. De schetsplaat is met de onderrand en de zijrand aan de knoop gelast; de werklijn van de schoor gaat door de hoek van de plaat, het werkpunt.</i><span class="alleen-scherm"></span>

# 1. Invoer

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select hoekprofiel "Hoekprofiel"
  L 40x40x4 = 1
  L 45x45x5 = 2
  L 50x50x5 = 3
  L 60x60x6 = 4
  L 70x70x7 = 5
  L 80x80x8 = 6
  L 90x90x9 = 7
  L 100x100x10 = 8
@end

@select uitvoering "Uitvoering"
  enkel hoekstaal = 1
  dubbel hoekstaal (rug aan rug) = 2
@end

@select staalsoort "Staalsoort hoekstaal en schetsplaat"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select boutkwaliteit "Boutkwaliteit"
  4.6 = 46
  5.6 = 56
  8.8 = 88
  10.9 = 109
@end

@select boutmaat "Boutmaat"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
@end

@select krachtsoort "Kracht in de schoor"
  alleen trek = 1
  trek en druk = 2
@end

@select stuikgrens "Enkel hoekstaal met twee of meer bouten: stuik begrenzen volgens §3.6.1(10)"
  ja, aan de veilige kant = 1
  nee = 0
@end

F_Ed = ?*(kN)', schoorkracht, grootte<span class="kolom-3"></span>'
hoek = ?', hoek met de horizontaal [°]<span class="kolom-3"></span>'
n_bouten = ?', aantal bouten<span class="kolom-3"></span>'
e_1 = ?*(mm)', eindafstand in het been<span class="kolom-3"></span>'
p_1 = ?*(mm)', steek<span class="kolom-3"></span>'
e_2 = ?*(mm)', gat tot de vrije rand van het been<span class="kolom-3"></span>'
l_0 = ?*(mm)', werkpunt tot eind hoekstaal<span class="kolom-3"></span>'
t_schets = ?*(mm)', dikte schetsplaat<span class="kolom-3"></span>'
b_schets = ?*(mm)', breedte schetsplaat<span class="kolom-3"></span>'
h_schets = ?*(mm)', hoogte schetsplaat<span class="kolom-3"></span>'
a_las = ?*(mm)', keeldikte las<span class="kolom-3"></span>'

#hide
'Materiaal: f_u uit tabel 3.1 (A1:2014), t ≤ 40 mm. Bout: f_ub en α_v uit tabel 3.1 en 3.4 van EN 1993-1-8,
'gat bij normale gatspeling (EN 1090-2), spanningsdoorsnede volgens ISO 898-1.
f_y = staalsoort*N/mm^2
fu_ = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
f_u = fu_*N/mm^2
fub_ = if(boutkwaliteit ≡ 46; 400; if(boutkwaliteit ≡ 56; 500; if(boutkwaliteit ≡ 88; 800; 1000)))
f_ub = fub_*N/mm^2
α_v = if(boutkwaliteit ≡ 109; 0.5; 0.6)
d = boutmaat*mm
d_0 = if(boutmaat ≡ 12; 13; if(boutmaat ≡ 16; 18; if(boutmaat ≡ 20; 22; 26)))*mm
A_s = if(boutmaat ≡ 12; 84.3; if(boutmaat ≡ 16; 157; if(boutmaat ≡ 20; 245; 353)))*mm^2
β_w = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
γ_M0 = 1.0
γ_M1 = 1.0
γ_M2 = 1.25
ε = sqrt(235 N/mm^2/f_y)
n_L = if(uitvoering ≡ 2; 2; 1)
n_b = max(1; round(n_bouten))
θ = hoek*deg
'Hoekstaaltabel uit profielen.ts: id | h (mm) | t (mm) | r_1 (mm) | r_2 (mm) | A (cm²) | e (cm) | I_y (cm⁴) | W_el (cm³) | i_y (cm) | I_u (cm⁴) | i_u (cm) | I_v (cm⁴) | i_v (cm)
hoekstalen = [1; 2; 3; 4; 5; 6; 7; 8 |40; 45; 50; 60; 70; 80; 90; 100 |4; 5; 5; 6; 7; 8; 9; 10 |6; 7; 7; 8; 9; 10; 11; 12 |3; 3.5; 3.5; 4; 4.5; 5; 5.5; 6 |3.08; 4.3; 4.8; 6.91; 9.4; 12.3; 15.5; 19.2 |1.12; 1.28; 1.4; 1.69; 1.97; 2.26; 2.54; 2.82 |4.47; 7.84; 11; 22.8; 42.3; 72.2; 116; 177 |1.55; 2.43; 3.05; 5.29; 8.41; 12.6; 17.9; 24.6 |1.21; 1.35; 1.51; 1.82; 2.12; 2.43; 2.73; 3.04 |7.09; 12.4; 17.4; 36.1; 67.1; 115; 184; 280 |1.52; 1.7; 1.9; 2.29; 2.67; 3.06; 3.44; 3.83 |1.86; 3.25; 4.54; 9.43; 17.5; 29.9; 47.8; 73 |0.78; 0.87; 0.97; 1.17; 1.36; 1.56; 1.76; 1.95]
h_L = hlookup(hoekstalen; hoekprofiel; 1; 2)*mm
t_L = hlookup(hoekstalen; hoekprofiel; 1; 3)*mm
A_L = hlookup(hoekstalen; hoekprofiel; 1; 6)*cm^2
'Een toets telt pas als zijn invoer leesbaar is; de vlaggen staan tot dan op "niet getoetst".
ok_invoer = 0
ok_geo = 0
ok_las = 0
ok_druk = 1
UC_p = 0
UC_c = 0
#show
#if min(e_1; if(n_b ≥ 2; p_1; 1 mm); e_2; t_schets; b_schets; h_schets; a_las) > 0 mm
    #if l_0 ≥ 0 mm
        #if n_bouten ≥ 1
            #if F_Ed > 0 kN
                #hide
                ok_invoer = 1
                #show
            #end if
        #end if
    #end if
#end if
'Hoekstaal L 'h_L'×'h_L'×'t_L' mm, A = 'A_L' cm²'if(n_L ≡ 2; ", twee stuks rug aan rug"; "")'. S'staalsoort': f<sub>y</sub> = 'f_y', f<sub>u</sub> = 'f_u' N/mm² (tabel 3.1). Bout M'boutmaat' – 'boutkwaliteit/10': d<sub>0</sub> = 'd_0' mm, A<sub>s</sub> = 'A_s' mm², f<sub>ub</sub> = 'f_ub' N/mm². γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0, γ<sub>M2</sub> = 1,25 (NB).
#if n_bouten ≥ 1
    #if n_b ≠ n_bouten
        '<b style="color:#b45309">Het aantal bouten is geen geheel getal: gerekend met n = 'n_b'.</b>
    #end if
#end if

#hide
'Ligging van de bouten langs de as, vanaf het werkpunt: bout 1 bij het eind van het hoekstaal, bout n bij de rand van de plaat.
s_1 = l_0 + e_1
s_n = s_1 + (n_b - 1)*p_1
x_1 = s_1*cos(θ)
y_1 = s_1*sin(θ)
x_n = s_n*cos(θ)
y_n = s_n*sin(θ)
'Vrije randen: boven (y = h) en rechts (x = b). Loodrecht op de as eerst een gelaste rand (links of onder): geen vrije rand aan die kant.
vr_n1 = if((h_schets - y_n)/cos(θ) < x_n/sin(θ); (h_schets - y_n)/cos(θ); 100000*mm)
vr_n2 = if((b_schets - x_n)/sin(θ) < y_n/cos(θ); (b_schets - x_n)/sin(θ); 100000*mm)
e_2,p = min(vr_n1; vr_n2)
vrij = if(e_2,p < 10000*mm; 1; 0)
'Vanaf bout 1 loodrecht op de as, aan beide kanten tot de eerste rand van de plaat, vrij of gelast.
r_11 = min((h_schets - y_1)/cos(θ); x_1/sin(θ))
r_12 = min((b_schets - x_1)/sin(θ); y_1/cos(θ))
'Kortste afstand van de buitenste bout tot een vrije rand, loodrecht op die rand: de randen staan schuin op de as.
e_rand = min(h_schets - y_n; b_schets - x_n)
'Het eind van het hoekstaal mag niet voorbij een gelaste rand steken: de vrije rand van het been ligt e_2 onder de as, de hiel h_L − e_2 erboven.
l_0,min = max(e_2/tan(θ); (h_L - e_2)*tan(θ))
ok_L = if(l_0 + 0.001*mm ≥ l_0,min; 1; 0)
'Het gat moet binnen het vlakke deel van het been liggen en mag het uitstaande been niet raken.
e_gat = e_2 + 0.5*d_0
h_vlak = h_L - t_L
ok_gat = if(e_gat ≤ h_vlak + 0.001*mm; 1; 0)
'De sluitring onder kop of moer (ISO 7089) ligt naast het uitstaande been en moet vrij blijven van de afronding r_1.
r_1 = hlookup(hoekstalen; hoekprofiel; 1; 4)*mm
d_s = if(boutmaat ≡ 12; 24; if(boutmaat ≡ 16; 30; if(boutmaat ≡ 20; 37; 44)))*mm
c_ring = h_L - e_2 - 0.5*d_s
c_nodig = t_L + r_1
ok_ring = if(c_ring + 0.001*mm ≥ c_nodig; 1; 0)
#show
#if hoek > 0
    #if hoek < 90
        #if ok_L ≡ 0
            '<b style="color:#b91c1c">Het eind van het hoekstaal steekt voorbij een gelaste rand van de schetsplaat: l<sub>0</sub> ≥ 'l_0,min' mm nodig.</b>
        #end if
    #end if
#end if
#if ok_gat ≡ 0
    '<b style="color:#b91c1c">Het gat valt buiten het vlakke deel van het been: e<sub>2</sub> + d<sub>0</sub>/2 = 'e_gat' mm > h − t = 'h_vlak' mm.</b>
#end if
#if ok_ring ≡ 1
    'Sluitring Ø'd_s' mm: h − e<sub>2</sub> − d<sub>s</sub>/2 = 'c_ring' mm ≥ t + r<sub>1</sub> = 'c_nodig' mm<span style="color: green"> → vrij van de afronding</span>
#else
    '<b style="color:#b91c1c">De sluitring (Ø'd_s' mm) ligt op de afronding van het hoekstaal: h − e<sub>2</sub> − d<sub>s</sub>/2 = 'c_ring' mm &lt; t + r<sub>1</sub> = 'c_nodig' mm. Kies een kleinere e<sub>2</sub> of een kleinere bout.</b>
#end if

# 2. Hoekstaal op trek — §3.10.3

N_pl,Rd = n_L*A_L*f_y/γ_M0 to kN', (6.6)<span class="kolom-2"></span>'
#if n_b ≡ 1
    N_u,Rd = n_L*2*(e_2 - 0.5*d_0)*t_L*f_u/γ_M2 to kN', (3.11), één bout<span class="kolom-2"></span>'
#else if n_b ≡ 2
    A_net = A_L - d_0*t_L to mm^2', per hoekstaal<span class="kolom-3"></span>'
    β_2 = 0.4 + 0.3*min(max((p_1/d_0 - 2.5)/2.5; 0); 1)', tabel 3.8<span class="kolom-3"></span>'
    N_u,Rd = n_L*β_2*A_net*f_u/γ_M2 to kN', (3.12)<span class="kolom-3"></span>'
#else
    A_net = A_L - d_0*t_L to mm^2', per hoekstaal<span class="kolom-3"></span>'
    β_3 = 0.5 + 0.2*min(max((p_1/d_0 - 2.5)/2.5; 0); 1)', tabel 3.8<span class="kolom-3"></span>'
    N_u,Rd = n_L*β_3*A_net*f_u/γ_M2 to kN', (3.13)<span class="kolom-3"></span>'
#end if
UC_t = F_Ed/min(N_pl,Rd; N_u,Rd)', trek in het hoekstaal'
A_nt = (e_2 - 0.5*d_0)*t_L to mm^2', naar de vrije rand van het been<span class="kolom-2"></span>'
A_nv = (e_1 + (n_b - 1)*p_1 - (n_b - 0.5)*d_0)*t_L to mm^2', langs de boutrij<span class="kolom-2"></span>'
V_eff,2,Rd = n_L*(0.5*f_u*A_nt/γ_M2 + f_y*A_nv/(sqrt(3)*γ_M0)) to kN', (3.10)'
UC_bs = F_Ed/V_eff,2,Rd', blokschuif in het been'

# 3. Bouten — tabel 3.3, tabel 3.4 en §3.7

#hide
cap = if(n_L ≡ 2; 0; if(n_b ≡ 1; 1; stuikgrens))
L_j = (n_b - 1)*p_1
#show
#if L_j > 15*d
    β_Lf = max(0.75; min(1; 1 - (L_j - 15*d)/(200*d)))', §3.8, lange verbinding: L<sub>j</sub> = (n − 1)·p<sub>1</sub> > 15·d'
    F_v,Rd = n_L*β_Lf*α_v*f_ub*A_s/γ_M2 to kN', per bout, afschuifvlak door de draad'
#else
    F_v,Rd = n_L*α_v*f_ub*A_s/γ_M2 to kN', per bout, afschuifvlak door de draad'
#end if
e_1,p = min(b_schets/cos(θ); h_schets/sin(θ)) - (l_0 + e_1 + (n_b - 1)*p_1) to mm', buitenste bout tot de rand van de plaat, langs de as'
#if vrij ≡ 1
    e_2,p', tot de vrije rand van de plaat, loodrecht op de as<span class="kolom-2"></span>'
#end if
e_rand', buitenste bout tot de dichtstbijzijnde vrije rand, loodrecht op die rand<span class="kolom-2"></span>'
k_1,L = min(2.8*e_2/d_0 - 1.7; 2.5)', been, één boutrij<span class="kolom-2"></span>'
#if vrij ≡ 1
    k_1,p = min(2.8*e_2,p/d_0 - 1.7; 2.5)', plaat<span class="kolom-2"></span>'
#else
    k_1,p = 2.5', plaat, geen vrije rand naast de boutrij<span class="kolom-2"></span>'
#end if
α_b,1 = min(e_1/(3*d_0); f_ub/f_u; 1)', eindbout in het been<span class="kolom-3"></span>'
#if n_b ≥ 2
    α_b,i = min(p_1/(3*d_0) - 0.25; f_ub/f_u; 1)', binnenste bout<span class="kolom-3"></span>'
#else
    #hide
    α_b,i = α_b,1
    #show
#end if
α_b,p = min(e_1,p/(3*d_0); f_ub/f_u; 1)', eindbout in de plaat<span class="kolom-3"></span>'
F_b,L,1 = n_L*k_1,L*α_b,1*f_u*d*t_L/γ_M2 to kN', been, bout 1<span class="kolom-2"></span>'
F_b,p,n = k_1,p*α_b,p*f_u*d*t_schets/γ_M2 to kN', plaat, buitenste bout<span class="kolom-2"></span>'
#if n_b ≥ 2
    F_b,L,i = n_L*k_1,L*α_b,i*f_u*d*t_L/γ_M2 to kN', been, overige bouten<span class="kolom-2"></span>'
    F_b,p,i = k_1,p*α_b,i*f_u*d*t_schets/γ_M2 to kN', plaat, overige bouten<span class="kolom-2"></span>'
#else
    #hide
    F_b,L,i = F_b,L,1
    F_b,p,i = F_b,p,n
    #show
#end if
#hide
'Per bout de kleinste van been en plaat (bout 1 is de eindbout in het been, bout n die in de plaat),
'zo nodig begrensd volgens §3.6.1(10). Bij één of twee bouten zijn er geen tussenbouten.
F_b,cap = 1.5*f_u*d*min(t_L; t_schets)/γ_M2 to kN
grens = if(cap ≡ 1; F_b,cap; 1000000*kN)
F_b,1 = min(F_b,L,1; if(n_b ≡ 1; F_b,p,n; F_b,p,i); grens) to kN
F_b,n = min(if(n_b ≡ 1; F_b,L,1; F_b,L,i); F_b,p,n; grens) to kN
F_b,m = if(n_b ≥ 3; min(F_b,L,i; F_b,p,i; grens); F_b,n) to kN
#show
#if cap ≡ 1
    F_b,cap', 1,5·f<sub>u</sub>·d·t/γ<sub>M2</sub> met de dunste plaat, §3.6.1(10); sluitringen onder kop en moer, bij 8.8 en 10.9 gehard (§3.6.1(11))'
    'Stuik per bout: de kleinste van been, plaat en F<sub>b,cap</sub>.
#else
    'Stuik per bout: de kleinste van been en plaat.
#end if
#if n_b ≡ 1
    F_b,1', de bout<span class="kolom-3"></span>'
    F_Rd,groep = min(F_v,Rd; F_b,1)', één bout'
#else
    F_b,1', bout 1<span class="kolom-3"></span>'
    F_b,n', buitenste bout<span class="kolom-3"></span>'
    #if n_b ≥ 3
        F_b,m', tussenbouten<span class="kolom-3"></span>'
    #end if
    #if F_v,Rd ≥ max(F_b,1; F_b,n; F_b,m)
        #if n_b ≡ 2
            F_Rd,groep = F_b,1 + F_b,n', som van de stuikweerstanden, §3.7(1)'
        #else
            F_Rd,groep = F_b,1 + F_b,n + (n_b - 2)*F_b,m', som van de stuikweerstanden, §3.7(1)'
        #end if
    #else
        F_Rd,groep = n_b*min(F_v,Rd; F_b,1; F_b,n; F_b,m)', F_v,Rd kleiner dan een stuikweerstand: aantal maal de kleinste, §3.7(1)'
    #end if
#end if
UC_b = F_Ed/F_Rd,groep', bouten'
#hide
e_min = 1.2*d_0
p_min = 2.2*d_0
p_max = min(14*if(n_L ≡ 2; t_L; min(t_L; t_schets)); 200*mm)
tekort = (if(e_1 < e_min; 1; 0) + if(e_2 < e_min; 1; 0) + if(n_b ≥ 2; if(p_1 < p_min; 1; 0); 0) + if(e_1,p < e_min; 1; 0) + if(vrij ≡ 1; if(e_2,p < e_min; 1; 0); 0) + if(e_rand < e_min; 1; 0) + if(krachtsoort ≡ 2; if(n_b ≥ 2; if(p_1 > p_max; 1; 0); 0); 0))
#show
#if n_b ≡ 1
    'Tabel 3.3: e<sub>1</sub>, e<sub>2</sub>, e<sub>1,p</sub>, e<sub>2,p</sub>, e<sub>rand</sub> ≥ 1,2·d<sub>0</sub> = 'e_min' mm.
#else if krachtsoort ≡ 2
    'Tabel 3.3: e<sub>1</sub>, e<sub>2</sub>, e<sub>1,p</sub>, e<sub>2,p</sub>, e<sub>rand</sub> ≥ 1,2·d<sub>0</sub> = 'e_min' mm; 'p_min' ≤ p<sub>1</sub> ≤ 'p_max' mm (druk).
#else
    'Tabel 3.3: e<sub>1</sub>, e<sub>2</sub>, e<sub>1,p</sub>, e<sub>2,p</sub>, e<sub>rand</sub> ≥ 1,2·d<sub>0</sub> = 'e_min' mm; p<sub>1</sub> ≥ 2,2·d<sub>0</sub> = 'p_min' mm.
#end if
#if e_1 < e_min
    '<b style="color:#b91c1c">e<sub>1</sub> = 'e_1' mm is kleiner dan 'e_min' mm.</b>
#end if
#if e_2 < e_min
    '<b style="color:#b91c1c">e<sub>2</sub> = 'e_2' mm is kleiner dan 'e_min' mm.</b>
#end if
#if e_1,p < e_min
    '<b style="color:#b91c1c">e<sub>1,p</sub> = 'e_1,p' mm is kleiner dan 'e_min' mm: de buitenste bout zit te dicht bij de rand van de schetsplaat.</b>
#end if
#if vrij ≡ 1
    #if e_2,p < e_min
        '<b style="color:#b91c1c">e<sub>2,p</sub> = 'e_2,p' mm is kleiner dan 'e_min' mm: de boutrij zit te dicht bij de vrije rand van de schetsplaat.</b>
    #end if
#end if
#if e_rand < e_min
    '<b style="color:#b91c1c">e<sub>rand</sub> = 'e_rand' mm is kleiner dan 'e_min' mm: de buitenste bout zit te dicht bij een schuine vrije rand van de schetsplaat.</b>
#end if
#if n_b ≥ 2
    #if p_1 < p_min
        '<b style="color:#b91c1c">p<sub>1</sub> = 'p_1' mm is kleiner dan 'p_min' mm.</b>
    #end if
    #if krachtsoort ≡ 2
        #if p_1 > p_max
            '<b style="color:#b91c1c">p<sub>1</sub> = 'p_1' mm is groter dan 'p_max' mm: bij druk geldt het maximum van tabel 3.3.</b>
        #end if
    #end if
#end if

# 4. Schetsplaat

#if n_b ≥ 2
    b_w = 2*(n_b - 1)*p_1*tan(30*pi/180) to mm', spreiding onder 30° over de boutrij<span class="kolom-2"></span>'
    #hide
    b_eff = min(b_w/2; r_11) + min(b_w/2; r_12)
    #show
    #if b_eff < b_w
        b_eff', bij bout 1 begrensd door de rand van de plaat, ook een gelaste rand<span class="kolom-2"></span>'
    #end if
    N_p,Rd = min(b_eff*t_schets*f_y/γ_M0; 0.9*(b_eff - d_0)*t_schets*f_u/γ_M2) to kN', (6.6) en (6.7) over b_eff, bij bout 1'
    UC_p = F_Ed/N_p,Rd', plaat op trek'
#else
    '<i>Eén bout: de plaat rond het gat is getoetst op stuik en blokschuif.</i><span class="alleen-scherm"></span>
#end if
A_nv,p = (e_1,p + (n_b - 1)*p_1 - (n_b - 0.5)*d_0)*t_schets to mm^2', per afschuifvlak langs de boutrij<span class="kolom-2"></span>'
#if vrij ≡ 1
    A_nt,p = (e_2,p - 0.5*d_0)*t_schets to mm^2', naar de vrije rand<span class="kolom-2"></span>'
    V_eff,p,Rd = f_y*A_nv,p/(sqrt(3)*γ_M0) + min(f_y*A_nv,p/(sqrt(3)*γ_M0); 0.5*f_u*A_nt,p/γ_M2) to kN', twee afschuifvlakken (3.9), of één met trek naar de vrije rand (3.10)'
#else
    V_eff,p,Rd = 2*f_y*A_nv,p/(sqrt(3)*γ_M0) to kN', (3.9), twee afschuifvlakken langs de boutrij'
#end if
UC_bs,p = F_Ed/V_eff,p,Rd', blokschuif in de plaat'
#if krachtsoort ≡ 2
    #if n_b ≡ 1
        #hide
        ok_druk = 0
        #show
        '<b style="color:#b91c1c">Druk met één bout: de schetsplaat is op knik niet te toetsen zonder effectieve breedte. Kies ten minste twee bouten.</b>
    #else
        λ_p = 0.65*(l_0 + e_1)*sqrt(12)/(t_schets*93.9*ε)', l<sub>k</sub> = 0,65·(l<sub>0</sub> + e<sub>1</sub>), i = t/√12<span class="kolom-2"></span>'
        χ_p = min(1; 1/(0.5*(1 + 0.49*(λ_p - 0.2) + λ_p^2) + sqrt((0.5*(1 + 0.49*(λ_p - 0.2) + λ_p^2))^2 - λ_p^2)))', kromme c<span class="kolom-2"></span>'
        N_b,p,Rd = χ_p*b_eff*t_schets*f_y/γ_M1 to kN', §6.3.1, strook over b_eff'
        UC_c = F_Ed/N_b,p,Rd', knik van de schetsplaat'
    #end if
#end if

# 5. Las van de schetsplaat — §4.5.3.3

'Onderrand F<sub>Ed</sub>·cos θ, zijrand F<sub>Ed</sub>·sin θ<i class="alleen-scherm"> (de werklijn gaat door het werkpunt)</i>, elk met twee hoeklassen; ligger of kolom van dezelfde staalsoort.
f_vw,d = f_u/(sqrt(3)*β_w*γ_M2) to N/mm^2', (4.4), β_w uit tabel 4.1<span class="kolom-2"></span>'
#hide
β_Lw = min(1; 1.2 - 0.2*max(b_schets; h_schets)/(150*a_las))
#show
#if β_Lw < 1
    β_Lw = min(1; 1.2 - 0.2*max(b_schets; h_schets)/(150*a_las))', (4.9), rand langer dan 150·a<span class="kolom-2"></span>'
#end if
F_w,Rd = β_Lw*f_vw,d*a_las to N/mm', (4.3)<span class="kolom-2"></span>'
F_w,Ed,b = F_Ed*cos(θ)/(2*(b_schets - 2*a_las)) to N/mm', onderrand, l<sub>eff</sub> = b − 2a<span class="kolom-2"></span>'
F_w,Ed,h = F_Ed*sin(θ)/(2*(h_schets - 2*a_las)) to N/mm', zijrand, l<sub>eff</sub> = h − 2a<span class="kolom-2"></span>'
UC_w = max(F_w,Ed,b; F_w,Ed,h)/F_w,Rd', las'
UC_v,p = max(F_Ed*cos(θ)/b_schets; F_Ed*sin(θ)/h_schets)/(t_schets*f_y/(sqrt(3)*γ_M0))', schuif in de plaat langs de las, (6.18)'
#if a_las < 3 mm
    '<b style="color:#b91c1c">a = 'a_las' mm is kleiner dan 3 mm (§4.5.2(2)).</b>
#else if min(b_schets; h_schets) - 2*a_las < max(30 mm; 6*a_las)
    '<b style="color:#b91c1c">l<sub>eff</sub> van een las is kleiner dan 30 mm of 6·a: die las mag geen kracht overbrengen (§4.5.1(2)).</b>
#else
    #hide
    ok_las = 1
    #show
#end if

# 6. Oordeel

#hide
'De boutrij moet binnen de plaat liggen, het gat binnen het vlakke deel van het been, en de hoek tussen 0° en 90°.
ok_geo = if(hoek > 0; if(hoek < 90; if(e_1,p > 0 mm; ok_gat; 0); 0); 0)
UC_max = max(UC_t; UC_bs; UC_b; UC_p; UC_bs,p; UC_c; UC_w; UC_v,p)
#show
'<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Toets</th><th style="text-align:left; padding:2px 8px;">Norm</th><th style="text-align:right; padding:2px 8px;">UC</th><th style="text-align:left; padding:2px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Hoekstaal op trek</td><td style="padding:2px 8px;">§3.10.3</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_t)'">'UC_t'</td><td style="padding:2px 8px; color:'kleur(UC_t)'">'oordeel(UC_t)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Blokschuif in het been</td><td style="padding:2px 8px;">(3.10)</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_bs)'">'UC_bs'</td><td style="padding:2px 8px; color:'kleur(UC_bs)'">'oordeel(UC_bs)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Bouten</td><td style="padding:2px 8px;">tabel 3.4, §3.7</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_b)'">'UC_b'</td><td style="padding:2px 8px; color:'kleur(UC_b)'">'oordeel(UC_b)'</td></tr>
#if n_b ≥ 2
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Schetsplaat op trek</td><td style="padding:2px 8px;">(6.6), (6.7)</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_p)'">'UC_p'</td><td style="padding:2px 8px; color:'kleur(UC_p)'">'oordeel(UC_p)'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Blokschuif in de plaat</td><td style="padding:2px 8px;">(3.9), (3.10)</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_bs,p)'">'UC_bs,p'</td><td style="padding:2px 8px; color:'kleur(UC_bs,p)'">'oordeel(UC_bs,p)'</td></tr>
#if krachtsoort ≡ 2
    #if ok_druk ≡ 1
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Knik van de schetsplaat</td><td style="padding:2px 8px;">§6.3.1</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_c)'">'UC_c'</td><td style="padding:2px 8px; color:'kleur(UC_c)'">'oordeel(UC_c)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Knik van de schetsplaat</td><td style="padding:2px 8px;">§6.3.1</td><td style="padding:2px 8px; text-align:right; color:#b91c1c">—</td><td style="padding:2px 8px; color:#b91c1c">niet getoetst</td></tr>
    #end if
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Las</td><td style="padding:2px 8px;">§4.5.3.3</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_w)'">'UC_w'</td><td style="padding:2px 8px; color:'kleur(UC_w)'">'oordeel(UC_w)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Schuif in de plaat langs de las</td><td style="padding:2px 8px;">(6.18)</td><td style="padding:2px 8px; text-align:right; color:'kleur(UC_v,p)'">'UC_v,p'</td><td style="padding:2px 8px; color:'kleur(UC_v,p)'">'oordeel(UC_v,p)'</td></tr>
'</table>

#if ok_invoer ≡ 0
    '<b>Maatgevende UC</b><span style="color:#b91c1c"> niet te bepalen: vul de schoorkracht, alle maten en het aantal bouten in → <b>de verbinding voldoet niet</b></span>
#else if ok_geo ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar de boutrij valt buiten de schetsplaat, het gat valt buiten het vlakke deel van het been, of de hoek ligt niet tussen 0° en 90° → <b>de verbinding voldoet niet</b></span>
#else if ok_L ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar het eind van het hoekstaal steekt voorbij een gelaste rand van de schetsplaat (hoofdstuk 1) → <b>de verbinding voldoet niet</b></span>
#else if ok_ring ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar de sluitring ligt op de afronding van het hoekstaal (hoofdstuk 1) → <b>de verbinding voldoet niet</b></span>
#else if tekort > 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar 'tekort' afstand(en) buiten tabel 3.3 (hoofdstuk 3) → <b>de verbinding voldoet niet</b></span>
#else if ok_las ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar de las voldoet niet aan §4.5.1(2) of §4.5.2(2) (hoofdstuk 5) → <b>de verbinding voldoet niet</b></span>
#else if ok_druk ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color:#b91c1c">, maar met één bout is de schetsplaat op druk niet getoetst (hoofdstuk 4) → <b>de verbinding voldoet niet</b></span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
#end if

'Niet in dit blad: knik van de schoor zelf en het profiel waaraan de schetsplaat is gelast.
`;
