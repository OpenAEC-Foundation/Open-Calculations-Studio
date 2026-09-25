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

'<i>De permanente vuurbelasting drukt de energie-inhoud van de vaste brandbare
'bouwdelen uit per m² vloeroppervlakte van het brandcompartiment. De inventaris
'(variabele vuurlast) hoort er niet bij.</i>

# 1. Vloeroppervlakte brandcompartiment

A_f = ?*(m^2)', vloeroppervlakte A_f van het brandcompartiment (m²)'

# 2. Brandbare materialen — massa's

'<i>Vul per materiaal de totale massa in (kg) die permanent in het brandcompartiment
'aanwezig is. Een schatting via volume × dichtheid is veelal voldoende, zie §7.
'Materiaal in een brandwerende omhulling telt niet mee (NEN-EN 1991-1-2 E.2.3(1)).</i>

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

Q_hout = m_hout*H_u_hout
Q_pir = m_pir*H_u_pir
Q_eps = m_eps*H_u_eps
Q_bitumen = m_bitumen*H_u_bitumen
Q_pvc = m_pvc*H_u_pvc
Q_pe = m_pe*H_u_pe
Q_overig = m_overig*H_u_overig

Q_a = Q_hout + Q_pir + Q_eps', hout en schuimisolatie'
Q_b = Q_bitumen + Q_pvc + Q_pe', dakbedekking en leidingen'
Q_totaal = Q_a + Q_b + Q_overig', totale energie-inhoud (E.2)'

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

'<i>Het Besluit bouwwerken leefomgeving (Bbl) kent voor de permanente vuurbelasting
'één grens: 500 MJ/m². Daaraan hangen onder meer de eisen aan de brandwerendheid
'van de hoofddraagconstructie en de grootte van brandcompartimenten; zie het Bbl
'voor de artikelen en voorwaarden die voor dit gebouw gelden.</i>

q_grens = 500*MJ/m^2', grens uit het Bbl'
UC_max = q_f,k/q_grens
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: de permanente vuurbelasting is niet groter dan 500 MJ/m²</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: de permanente vuurbelasting is groter dan 500 MJ/m²</span>
#end if

# 7. Schatting van massa's (hulp)

'<i>Vereenvoudigde schattingen voor gangbare bouwdelen:</i>
'<ul>
'<li><b>Hout</b>, dichtheid ρ ≈ 450 kg/m³. HSB-wand met stijlen 45×95 h.o.h. 600 mm
'en een boven- en onderregel, 2,5 m hoog: ca. 5 kg/m² wandoppervlak. Houten balklaag
'50×200 h.o.h. 600 mm: ca. 7,5 kg/m² vloeroppervlak. Multiplex 18 mm: ca. 8 kg/m².
'Eiken parket 14 mm: ca. 10 kg/m².</li>
'<li><b>PUR/PIR</b>, ρ ≈ 35 kg/m³: per 100 mm isolatie 3,5 kg/m².</li>
'<li><b>EPS</b>, ρ ≈ 20 kg/m³: per 100 mm 2,0 kg/m².</li>
'<li><b>Bitumineuze dakbedekking</b>, twee lagen: ca. 5 tot 8 kg/m² dak.</li>
'<li><b>PVC</b>, rioolbuis Ø110 mm met wanddikte 3,2 mm: ca. 1,6 kg per strekkende meter.</li>
'</ul>

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Niet-brandbare materialen (beton, staal, steen- en glaswol, gips, aluminium) leveren
'geen bijdrage aan de vuurbelasting; neem ze niet op.</li>
'<li>De kartonlaag van gipsplaat kan onder m<sub>hout</sub> worden meegenomen, maar is
'veelal verwaarloosbaar (minder dan 0,5 kg/m²).</li>
'<li>De variabele vuurlast (inventaris, opslag) hoort niet bij de permanente
'vuurbelasting en staat niet in dit blad.</li>
'<li>De rekenwaarde q<sub>f,d</sub> voor een natuurlijk-brandmodel, met de factoren
'δ<sub>q1</sub>, δ<sub>q2</sub> en δ<sub>n</sub>, is een andere grootheid: die volgt uit
'NEN-EN 1991-1-2 bijlage E.</li>
'<li><b>Nog niet geverifieerd:</b> de verbrandingswaarden komen uit tabel NB.6 van
'NEN-EN 1991-1-2; of NEN 6090 eigen waarden voorschrijft, is niet nagegaan.</li>
'</ul></i>
`;
