/**
 * Permanente vuurlast — bepaling van de permanente vuurbelasting van een
 * brandcompartiment, zoals NEN 6090 die voor het Besluit bouwwerken
 * leefomgeving (Bbl) vraagt.
 *
 * Permanente vuurlast = energie-inhoud van vaste, niet-verwijderbare
 * bouwdelen (constructiehout, dakbedekking, brandbare isolatie, leidingen).
 * De inventaris (variabele vuurlast) hoort er niet bij.
 *
 * Opbouw, gelijk aan NEN-EN 1991-1-2 bijlage E (E.2) en (E.3):
 *   q = Σ (m_i · H_u,i) / A_f                       [MJ/m²]
 *
 *   m_i   = massa brandbaar materiaal i              [kg]
 *   H_u,i = nettoverbrandingswaarde van i            [MJ/kg]
 *   A_f   = vloeroppervlakte van het brandcompartiment [m²]
 *
 * Verbrandingswaarden uit tabel NB.6 van NEN-EN 1991-1-2+NB:2019, de
 * Nederlandse tabel bij bijlage E. Eerder stonden er waarden zonder
 * controleerbare bron, met onder meer bitumen op 38 in plaats van 42 MJ/kg.
 * Of NEN 6090 eigen waarden voorschrijft, is niet nagegaan.
 *
 * De vergelijking gebruikt alleen de grens van 500 MJ/m² die het Bbl kent.
 * Eerder stonden er grenswaarden per gebouwfunctie (800, 1200, 3000 MJ/m²)
 * die in de regelgeving niet voorkomen.
 */

export const permanenteVuurlast = `"Permanente vuurlast — bepaling NEN 6090

# 1. Vloeroppervlakte brandcompartiment

A_f = ?*(m^2)', vloeroppervlakte A_f van het brandcompartiment (m²)'

# 2. Brandbare materialen — massa's

'<i>Materiaal in een brandwerende omhulling telt niet mee (NEN-EN 1991-1-2 E.2.3(1)).</i>

m_hout = ?*(kg)', constructiehout, houten afwerking en plaatmateriaal (kg)'
m_pir = ?*(kg)', PUR- of PIR-schuim (kg)'
m_eps = ?*(kg)', EPS of XPS, polystyreen (kg)'
m_bitumen = ?*(kg)', bitumineuze dakbedekking (kg)'
m_pvc = ?*(kg)', PVC-leidingen en kunststof afwerking (kg)'
m_pe = ?*(kg)', PE- of PP-leidingen en folie (kg)'

m_overig = ?*(kg)', overige brandbare materialen (kg)'
H_u_overig = ?*(MJ/kg)', verbrandingswaarde van het overige materiaal (MJ/kg)'

# 3. Verbrandingswaarden (tabel NB.6 van NEN-EN 1991-1-2)

#hide
H_u_hout = 18 MJ/kg
H_u_pir = 26 MJ/kg
H_u_eps = 40 MJ/kg
H_u_bitumen = 42 MJ/kg
H_u_pvc = 17 MJ/kg
H_u_pe = 44 MJ/kg
#show

'<table style="width:auto; border-collapse:collapse; font-size:0.9em;">
'<tr><td style="padding:2px 12px;"><b>Materiaal</b></td><td style="padding:2px 12px;"><b>H<sub>u</sub> [MJ/kg]</b></td></tr>
'<tr><td>Hout, spaanplaat</td><td>18</td></tr>
'<tr><td>PUR-schuim (PIR-schuim 24)</td><td>26</td></tr>
'<tr><td>Polystyreen (EPS, XPS)</td><td>40</td></tr>
'<tr><td>Bitumen</td><td>42</td></tr>
'<tr><td>PVC</td><td>17</td></tr>
'<tr><td>Polyethyleen (polypropyleen 43)</td><td>44</td></tr>
'<tr><td>Steen- en glaswol, beton, staal, gips</td><td>0 (niet brandbaar)</td></tr>
'</table>

# 4. Energie-inhoud per materiaal

#hide
Q_hout = m_hout*H_u_hout
Q_pir = m_pir*H_u_pir
Q_eps = m_eps*H_u_eps
Q_bitumen = m_bitumen*H_u_bitumen
Q_pvc = m_pvc*H_u_pvc
Q_pe = m_pe*H_u_pe
Q_overig = m_overig*H_u_overig
#show
#if m_hout > 0 kg
    Q_hout = m_hout*H_u_hout
#end if
#if m_pir > 0 kg
    Q_pir = m_pir*H_u_pir
#end if
#if m_eps > 0 kg
    Q_eps = m_eps*H_u_eps
#end if
#if m_bitumen > 0 kg
    Q_bitumen = m_bitumen*H_u_bitumen
#end if
#if m_pvc > 0 kg
    Q_pvc = m_pvc*H_u_pvc
#end if
#if m_pe > 0 kg
    Q_pe = m_pe*H_u_pe
#end if
#if m_overig > 0 kg
    Q_overig = m_overig*H_u_overig
#end if
Q_totaal = Q_hout + Q_pir + Q_eps + Q_bitumen + Q_pvc + Q_pe + Q_overig', totale energie-inhoud (E.2)'

# 5. Permanente vuurbelasting

#if A_f > 0 m^2
    q_f,k = Q_totaal/A_f to MJ/m^2', permanente vuurbelasting (E.3)'
#else
    '<span style="color: red">Vul de vloeroppervlakte A<sub>f</sub> in.</span>
    #hide
    q_f,k = 1/0*MJ/m^2
    #show
#end if

# 6. Vergelijking met de grens uit het Bbl

q_grens = 500*MJ/m^2', grens uit het Bbl'
UC_max = q_f,k/q_grens
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: de permanente vuurbelasting is niet groter dan 500 MJ/m²</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: de permanente vuurbelasting is groter dan 500 MJ/m²</span>
#end if

#hide
'Invoerhulp, niet op de afdruk. Schatting van de massa van gangbare bouwdelen:
'hout, ρ ≈ 450 kg/m³: HSB-wand met stijlen 45×95 h.o.h. 600 mm en een boven- en onderregel,
'2,5 m hoog, ca. 5 kg/m² wand; houten balklaag 50×200 h.o.h. 600 mm ca. 7,5 kg/m² vloer;
'multiplex 18 mm ca. 8 kg/m²; eiken parket 14 mm ca. 10 kg/m².
'PUR/PIR, ρ ≈ 35 kg/m³: 3,5 kg/m² per 100 mm. EPS, ρ ≈ 20 kg/m³: 2,0 kg/m² per 100 mm.
'Bitumineuze dakbedekking, twee lagen: ca. 5 tot 8 kg/m² dak.
'PVC-rioolbuis Ø110 × 3,2 mm: ca. 1,6 kg per strekkende meter.
'Niet-brandbaar (beton, staal, steen- en glaswol, gips, aluminium) telt niet mee; de kartonlaag
'van gipsplaat is veelal verwaarloosbaar (minder dan 0,5 kg/m²). De variabele vuurlast
'(inventaris) en de rekenwaarde q_f,d van bijlage E horen niet bij dit blad.
#show
`;
