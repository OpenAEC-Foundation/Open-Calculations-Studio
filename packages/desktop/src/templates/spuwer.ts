/**
 * Spuwer (noodoverlaat) in een dakrand-opstand volgens
 * NEN-EN 1991-1-3+C1/NB(nl) art. 7.2 / 7.3.
 *
 * Gecalibreerd op 8 referentieberekeningen (A = 600 m²), alle exact gereproduceerd.
 * Sets 1S-5S bij t = 50 jaar (i_r = 0,00005):
 *   1S  n=3  b=600  h=80   h_nd=50 → d_nd = 45,7  d_hw = 96   h_min = 76   UC = 0,95  ✓
 *   2S  n=2  b=600  h=80   h_nd=50 → d_nd = 59,8  d_hw = 110  h_min = 90   UC = 1,12  ✗
 *   3S  n=2  b=300  h=80   h_nd=50 → d_nd = 95,0  d_hw = 145  h_min = 125  UC = 1,56  ✗
 *   4S  n=2  b=600  h=100  h_nd=50 → d_nd = 59,8  d_hw = 110  h_min = 90   UC = 0,90  ✓
 *   5S  n=2  b=600  h=80   h_nd=30 → d_nd = 59,8  d_hw = 90   h_min = 90   UC = 1,12  ✗
 * Sets 6S-8S variëren de ontwerplevensduur (n=3, b=600, h=80, h_nd=30):
 *   6S  t=5 jaar    i_r = 0,000027 → d_nd = 30,3  d_hw = 60  UC = 0,75  ✓
 *   7S  t=15 jaar   i_r = 0,000041 → d_nd = 40,0  d_hw = 70  UC = 0,87  ✓
 *   8S  t=100 jaar  i_r = 0,000056 → d_nd = 49,3  d_hw = 79  UC = 0,99  ✓
 *
 * Uit de referentiebladen afgeleide keuzes van de referentie-uitwerking:
 *   • d_nd rekent met de breedte van één spuwer maal het aantal (b·n), dus met
 *     de totale spuwerbreedte in meters.
 *   • De regenwaterbelasting gebruikt 10 kN/m³ (96 mm → 0,96 kN/m²), niet 9,81.
 *   • h_min = 30 + d_hw − h_nd, wat neerkomt op d_nd + 30: de 30 mm uit §7.3(3)
 *     tegen verstopping wordt bovenop de wáterstand in de spuwer gelegd. Een
 *     hogere drempel h_nd verlaagt de u.c. dus niet, wel de waterstand d_hw.
 *   • Tabel NB.1 (i_r per referentieperiode), alle vier geverifieerd:
 *     5 jaar → 0,000027 · 15 jaar → 0,000041 · 50 jaar → 0,00005 · 100 jaar → 0,000056.
 *
 * De referentie-uitwerking drukt ook een "ronde spuwer bij gelijke d_nd" af:
 * de diameter uit (7.7) die dezelfde waterhoogte geeft. Dit blad laat die weg.
 * Die maat is geen minimum: §7.3(3) vraagt voor een ronde spuwer een inwendige
 * middellijn van ten minste 117 mm (set 3S gaf 80 mm), met de capaciteitstoets
 * (7.5)/(7.6) en een afstand van ten minste 2·d tot dakopstanden. Dit blad
 * toetst alleen de rechthoekige spuwer.
 *
 * Variabelenamen komen exact overeen met SpuwerDesigner.tsx.
 */

export const spuwer = `"Spuwer — noodoverlaat in de dakrand (EN 1991-1-3 NB art. 7.2)

# 1. Invoer

A_afv = ?', oppervlakte afvoergebied A [m²]'
n_sp = ?', aantal spuwers n'
b_sp = ?*(mm)', breedte enkele spuwer b'
h_sp = ?*(mm)', hoogte enkele spuwer h'
h_nd = ?*(mm)', bovenzijde dakbedekking tot onderzijde spuwer h_nd'

@select t_ref "Ontwerplevensduur (referentieperiode t)"
  5 jaar (tijdelijk) = 5
  15 jaar (landbouw) = 15
  50 jaar (gebouwen) = 50
  100 jaar (monumentaal) = 100
@end

#hide
'Tabel NB.1 — regenintensiteit i_r [m³/s]/m² per referentieperiode. Alle vier de
'waarden zijn tegen een referentieberekening geverifieerd.
irtab = [5; 15; 50; 100 |0.000027; 0.000041; 0.00005; 0.000056]
i_r = hlookup(irtab; t_ref; 1; 2)
#show

b_tot = n_sp*b_sp', som van de spuwerbreedten'
i_r', regenintensiteit uit Tabel NB.1 [m³/s]/m²'

# 2. Regenwaterdebiet — (7.2)

Q_h = A_afv*i_r', regenwaterdebiet [m³/s]'

# 3. Waterhoogte boven de onderzijde van de noodafvoer — (7.4)

#hide
'Breedte van één spuwer in meters — de formule is empirisch en rekent in SI.
b_m = b_sp/(1000*mm)
#show
b_m', breedte van één spuwer [m]'
d_nd = 0.7*(Q_h/(b_m*n_sp))^(2/3)*1000*mm', waterhoogte boven de onderzijde van de spuwer (7.4), in m omgerekend naar mm'

# 4. Waterstand en regenwaterbelasting — (7.8)

d_hw = d_nd + h_nd', waterhoogte t.p.v. de spuwer'
q_rw = 10*kN/m^3*d_hw to kN/m^2', regenwaterbelasting t.p.v. de spuwer'

# 5. Minimale spuwerhoogte — §7.3(3)

h_min = 30*mm + d_hw - h_nd', minimaal benodigde spuwerhoogte: 30 mm vrije hoogte boven de waterstand (§7.3(3))'
UC = h_min/h_sp
#if UC ≤ 1.0
    'u.c. = h<sub>min</sub>/h = 'UC'<span style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
#else
    'u.c. = h<sub>min</sub>/h = 'UC'<span style="color: red"> > 1.0 → <b>voldoet niet</b></span>
#end if

# 6. Samenvatting

#if UC ≤ 1.0
    '<b>u.c. = 'UC'</b><span style="color: green"> ≤ 1.0 → <b>Spuwer voldoet</b></span>
#else
    '<b>u.c. = 'UC'</b><span style="color: red"> > 1.0 → <b>Spuwer voldoet niet</b></span>
#end if
`;
