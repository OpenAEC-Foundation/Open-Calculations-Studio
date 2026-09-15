/**
 * Permanente vuurlast — bepaling conform NEN 6090.
 *
 * Permanente vuurlast = energie-inhoud van vaste, niet-verwijderbare
 * bouwdelen (constructiehout, dakbedekking, brandbare isolatie, etc.).
 * Onderscheid met variabele vuurlast die wordt veroorzaakt door
 * inventaris / gebruiksinhoud.
 *
 * Formule:
 *   q_{f,k} = Σ (m_i · H_{u,i} · ψ_i) / A_v        [MJ/m²]
 *
 *   m_i   = massa brandbaar materiaal i             [kg]
 *   H_u,i = onderste calorische waarde van i        [MJ/kg]
 *   ψ_i   = verbrandingsfactor (≤ 1, typisch 1.0)
 *   A_v   = gebruiksoppervlak brandcompartiment     [m²]
 *
 * Calorische waarden (NEN 6090 Tabel A.1 / EN 1991-1-2 Tabel E.3):
 *   Hout & cellulose            17.5 MJ/kg
 *   PUR / PIR-isolatie          26    MJ/kg
 *   EPS / XPS-isolatie          40    MJ/kg
 *   Bitumen dakbedekking        38    MJ/kg
 *   PVC                         17    MJ/kg
 *   Polyethyleen / polypropyleen 43   MJ/kg
 *   Steenwol / glaswol           0    MJ/kg (niet brandbaar — ψ=0)
 *   Beton, staal, gips           0    MJ/kg (niet brandbaar)
 */

export const permanenteVuurlast = `"Permanente vuurlast — bepaling NEN 6090

'<i>De permanente vuurlast q<sub>f,k</sub> drukt de energie-inhoud uit
'van vaste brandbare bouwdelen per m² gebruiksoppervlak. Inventaris
'en gebruikersbelasting (variabele vuurlast) wordt apart bepaald.</i>

# 1. Gebruiksoppervlak brandcompartiment

A_v = ?*(m^2)', gebruiksoppervlak A_v (m²) van het brandcompartiment'

# 2. Brandbare materialen — massa's

'<i>Vul per materiaalcategorie de totale massa in (kg) die zich
'permanent in het brandcompartiment bevindt. Een ruwe schatting via
'volume × dichtheid is veelal voldoende — zie sectie 5.</i>

m_hout = ?*(kg)', constructiehout + houten finishes + plaatmateriaal (kg)'
m_pir = ?*(kg)', PUR / PIR-isolatie (kg)'
m_eps = ?*(kg)', EPS / XPS-isolatie (kg)'
m_bitumen = ?*(kg)', bitumen dakbedekking (kg)'
m_pvc = ?*(kg)', PVC-houdende leidingen + kunststof afwerking (kg)'
m_pe = ?*(kg)', PE / PP-leidingen + kunststof folie (kg)'

m_overig = ?*(kg)', overige brandbare materialen (kg)'
H_u_overig = ?*(MJ/kg)', calorische waarde overige (MJ/kg)'

# 3. Calorische waarden (NEN 6090 Tabel A.1)

#hide
H_u_hout = 17.5 MJ/kg
H_u_pir = 26 MJ/kg
H_u_eps = 40 MJ/kg
H_u_bitumen = 38 MJ/kg
H_u_pvc = 17 MJ/kg
H_u_pe = 43 MJ/kg
#show

'<table style="width:auto; border-collapse:collapse; font-size:0.9em;">
'<tr><td style="padding:2px 12px;"><b>Materiaal</b></td><td style="padding:2px 12px;"><b>H<sub>u</sub> [MJ/kg]</b></td></tr>
'<tr><td>Hout & cellulose</td><td>17,5</td></tr>
'<tr><td>PUR / PIR</td><td>26</td></tr>
'<tr><td>EPS / XPS</td><td>40</td></tr>
'<tr><td>Bitumen</td><td>38</td></tr>
'<tr><td>PVC</td><td>17</td></tr>
'<tr><td>PE / PP</td><td>43</td></tr>
'<tr><td>Steen-/glaswol, beton, staal, gips</td><td>0 (niet brandbaar)</td></tr>
'</table>

# 4. Verbrandingsfactor ψ

'<i>De verbrandingsfactor ψ corrigeert voor onvolledige verbranding
'(typisch ψ = 1.0 voor cellulose-houdende materialen). NEN 6090 staat
'ψ = 0.8 toe voor matig brandbare materialen, maar voor permanente
'vuurlast geldt veelal ψ = 1.0 conservatief.</i>

#hide
ψ = 1.0
#show

# 5. Energie-inhoud per categorie

Q_hout = m_hout*H_u_hout*ψ
Q_pir = m_pir*H_u_pir*ψ
Q_eps = m_eps*H_u_eps*ψ
Q_bitumen = m_bitumen*H_u_bitumen*ψ
Q_pvc = m_pvc*H_u_pvc*ψ
Q_pe = m_pe*H_u_pe*ψ
Q_overig = m_overig*H_u_overig*ψ

Q_totaal = Q_hout + Q_pir + Q_eps + Q_bitumen + Q_pvc + Q_pe + Q_overig

# 6. Permanente vuurlast

'<b>Specifieke permanente vuurlast (formule §6.2 NEN 6090):</b>

q_f,k = Q_totaal/A_v

# 7. Toetsing aan grenswaarde

'<i>De grenswaarde van q<sub>f,k</sub> volgt uit de
'compartimenteringsgrootte en de vereiste brandwerendheid van de
'scheidingsconstructies (Bouwbesluit / Bbl). Een veelgebruikte
'praktijkdrempel voor lichte gebouwfuncties (wonen, kantoor): ca. 500
'MJ/m². Voor industrie/opslag kunnen waarden tot 1000-3000 MJ/m²
'voorkomen waarbij hogere brandwerendheidseisen nodig zijn.</i>

@select gebouwfunctie "Gebouwfunctie (typische grenswaarde)"
  Wonen (≤ 500 MJ/m²) = 500
  Kantoor / onderwijs (≤ 500 MJ/m²) = 500
  Logies / gezondheidszorg (≤ 500 MJ/m²) = 500
  Bijeenkomst / winkel (≤ 800 MJ/m²) = 800
  Lichte industrie (≤ 1200 MJ/m²) = 1200
  Zware industrie / opslag (≤ 3000 MJ/m²) = 3000
@end

q_grens = gebouwfunctie*MJ/m^2

UC_vuurlast = q_f,k/q_grens

#if UC_vuurlast ≤ 1.0
    'UC = q<sub>f,k</sub>/q<sub>grens</sub> = 'UC_vuurlast'<span style="color:green"> ≤ 1.0 → <b>Voldoet</b></span>
#else
    'UC = q<sub>f,k</sub>/q<sub>grens</sub> = 'UC_vuurlast'<span style="color:red"> > 1.0 → <b>Voldoet NIET</b></span>
#end if

# 8. Schatting van massa's (hulp)

'<i>Vereenvoudigde schattingsregels voor gangbare bouwdelen:</i>
'<ul>
'<li><b>Hout</b> — dichtheid ρ ≈ 450 kg/m³. Een HSB-stijl 95×45 h.o.h.
'600 mm in een wand van 2,5 m hoog: ca. 7 kg/m² wandoppervlak. Een
'houten balklaag 50×200 h.o.h. 600 mm: ca. 7,5 kg/m² vloeroppervlak.
'Triplex 18 mm: ca. 8 kg/m². Parket eiken 14 mm: ca. 10 kg/m².</li>
'<li><b>PUR/PIR</b> — ρ ≈ 35 kg/m³. Per 100 mm isolatie: 3,5 kg/m².</li>
'<li><b>EPS</b> — ρ ≈ 20 kg/m³. Per 100 mm: 2,0 kg/m².</li>
'<li><b>Bitumen dakbedekking</b> — 2-laags APP: ca. 5-8 kg/m² dak.</li>
'<li><b>PVC</b> — riolering Ø110 mm wanddikte 3,2 mm: ca. 1,7 kg/m¹.</li>
'</ul>

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Niet-brandbare materialen (beton, staal, steen-/glaswol, gips,
'aluminium) leveren geen bijdrage aan de vuurlast — neem ze niet op
'in m_hout etc.</li>
'<li>Brandwerend gips (Promat, Knauf Brand) wordt formeel als
'niet-brandbaar gerekend; de kartonlaag kan worden meegenomen onder
'm_hout maar is veelal verwaarloosbaar (&lt; 0,5 kg/m²).</li>
'<li>De gebruiksbelasting (inventaris, opslag) is de <i>variabele</i>
'vuurlast — die wordt in NEN 6090 separaat behandeld (Tabel A.2).
'Voor totale vuurlast: q<sub>f,k,tot</sub> = q<sub>f,k,perm</sub> + q<sub>f,k,var</sub>.</li>
'<li>Voor formele BIO-rapportage (Bouwbesluit-equivalentie) altijd
'NEN 6090 §6 raadplegen en correctiefactor δ<sub>q1</sub>/δ<sub>q2</sub>
'voor compartimentgrootte + activeringsgevaar toepassen.</li>
'</ul></i>
`;
