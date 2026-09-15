/**
 * Tweepaals poer — invoerblad bij TweepaalsPoerDesigner.tsx.
 *
 * VISUEEL ONLY: invoer, plattegrond en doorsnede met de trekband en beugels.
 * De toetsing (staafwerkmodel of buigingstheorie, verankering, pons) is nog
 * niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met TweepaalsPoerDesigner.tsx.
 */

export const tweepaalsPoer = `"Tweepaals poer — kolom op twee palen

'<i>Een poer die de kolomlast over twee palen verdeelt. Bij een gedrongen poer
'werkt het als een staafwerk: twee drukdiagonalen van de kolom naar de palen,
'opgenomen door een trekband onderin. Die trekband moet volledig boven de paal
'verankerd zijn — vandaar de opgebogen staafeinden.</i>

# 1. Geometrie

@select kolomvorm "Vorm van de kolom"
  Ronde kolom = 1
  Rechthoekige kolom = 2
@end

@select paalvorm "Vorm van de paal"
  Rechthoekige paal = 1
  Ronde paal = 2
@end

d_kolom = ?*(mm)', diameter of breedte van de kolom'
b_paal = ?*(mm)', paalafmeting in de lengterichting'
l_paal = ?*(mm)', paalafmeting in de dwarsrichting'
b_poer = ?*(mm)', breedte van de poer b'
h_poer = ?*(mm)', hoogte van de poer h'
l_hoh = ?*(mm)', hart-op-hart afstand van de palen l'
oversteek = ?*(mm)', oversteek van de poer voorbij het paalhart'

# 2. Beton en wapening

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
@end

@select betonstaal "Betonstaalsoort"
  B500A = 1
  B500B = 2
  B500C = 3
@end

@select betonoppervlak "Betonoppervlak"
  Controleerbaar = 1
  Niet controleerbaar = 2
@end

c_dek = ?*(mm)', dekking c'
n_langs = ?', aantal staven in de trekband'
d_langs = ?*(mm)', staafdiameter trekband'
n_sneden = ?', aantal beugelsneden'
d_beugel = ?*(mm)', beugeldiameter'
s_beugel = ?*(mm)', beugelafstand'

# 3. Belastingen

F_Ed = ?*(kN)', rekenwaarde van de kolomlast F_Ed'
F_qp = ?*(kN)', quasi-blijvende kolomlast F_qp'

'<h6>Overzicht van de invoer</h6>
d_kolom
b_poer
h_poer
l_hoh
c_dek
n_langs
d_langs
F_Ed

# 4. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De paalreacties, het staafwerkmodel met de
'drukdiagonalen en de trekband (§6.5), de knoopspanningen boven de palen, de
'verankering van de trekband, de dwarskracht en de pons rond de kolom volgen.</i>
`;
