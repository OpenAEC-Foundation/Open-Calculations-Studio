/**
 * Ponsberekening — invoerblad bij PonsDesigner.tsx.
 *
 * VISUEEL ONLY: invoer, doorsnede met de ponskegel en plattegrond met de
 * controleperimeter u_1 op 2d. De toetsing (v_Ed, v_Rd,c, ponswapening) is nog
 * niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met PonsDesigner.tsx.
 */

export const ponsberekening = `"Ponsberekening — doorponsen van een vlakke plaat (EN 1992-1-1 §6.4)

'<i>Bij een kolom op een vlakke plaat wordt de dwarskracht op een klein
'oppervlak ingeleid. De toets vindt plaats op de controleperimeter
'u<sub>1</sub>, op 2d van de kolomrand, met afgeronde hoeken. Ligt de kolom aan
'een rand of hoek, of werkt de last excentrisch, dan verhoogt β de
'schuifspanning.</i>

# 1. Geometrie

@select vorm "Vorm van de kolom"
  Rechthoekige kolom = 1
  Ronde kolom = 2
@end

@select plaats "Plaats van de kolom in de plaat"
  Geen rand (middenkolom) = 1
  Randkolom = 2
  Hoekkolom = 3
@end

@select kolomkop "Kolomkop / drukhoofd"
  geen = 0
  rechthoekige kolomkop = 1
  ronde kolomkop = 2
@end

c_1 = ?*(mm)', kolomafmeting c_1'
c_2 = ?*(mm)', kolomafmeting c_2'
h_plaat = ?*(mm)', dikte van de plaat h'

# 2. Beton en wapening

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
@end

@select betonstaal "Betonstaalsoort"
  B500A = 1
  B500B = 2
  B500C = 3
@end

d_wapy = ?*(mm)', diameter langswapening in y-richting'
s_wapy = ?*(mm)', hart-op-hart langswapening in y-richting'
d_wapz = ?*(mm)', diameter langswapening in z-richting'
s_wapz = ?*(mm)', hart-op-hart langswapening in z-richting'

@select eerstelaag "Onderste wapeningslaag"
  Langswapening y = 1
  Langswapening z = 2
@end

c_dek = ?*(mm)', dekking c'
hoek_pons = ?', hoek van de ponswapening [graden]'

@select beta_keuze "Factor β"
  Berekenen volgens 6.4.3 = 0
  Handmatig invoeren = 1
@end
beta_hand = ?', handmatige waarde voor β'

# 3. Belastingen

V_Ed = ?*(kN)', ponskracht V_Ed'
q_Ed = ?*(kN/m^2)', belasting op de plaat binnen de perimeter q_Ed'
e_y = ?*(mm)', excentriciteit in y-richting'
e_z = ?*(mm)', excentriciteit in z-richting'

'<h6>Overzicht van de invoer</h6>
c_1
c_2
h_plaat
c_dek
V_Ed
e_y
e_z

# 4. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De nuttige hoogte d, de perimeters u<sub>0</sub> en
'u<sub>1</sub>, β volgens §6.4.3, v<sub>Ed</sub>, v<sub>Rd,c</sub> volgens
'(6.47), de maximale schuifspanning bij de kolomrand en de eventuele
'ponswapening volgens (6.52) volgen.</i>
`;
