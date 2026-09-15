/**
 * Betonkolom — invoerblad bij BetonkolomDesigner.tsx.
 *
 * VISUEEL ONLY: invoer, doorsnede met staafverdeling en aanzicht met de
 * kolomlengte. De toetsing (slankheid, tweede orde, M-N-diagram) is nog niet
 * uitgewerkt.
 *
 * Variabelenamen komen exact overeen met BetonkolomDesigner.tsx.
 */

export const betonkolom = `"Betonkolom — druk en buiging met tweede-orde-effecten

'<i>Een gewapende betonkolom onder normaalkracht en buiging. De slankheid
'bepaalt of tweede-orde-effecten meegenomen moeten worden; de staafverdeling
'over de omtrek bepaalt het M-N-interactiediagram. De invoer volgt de
'tabbladen van het referentieprogramma: geometrie, wapening, knik en
'belasting.</i>

# 1. Geometrie

@select vorm "Vorm van de doorsnede"
  Rechthoekige kolom = 1
  Ronde kolom = 2
@end

h_kol = ?*(mm)', hoogte van de doorsnede h'
b_kol = ?*(mm)', breedte van de doorsnede b'
L_kol = ?*(mm)', kolomlengte L'

@select insitu "In-situ gestorte funderingspaal"
  Nee = 0
  Ja = 1
@end

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

c_dek = ?*(mm)', dekking op de beugel c'
n_h = ?', aantal staven langs de hoogte (per zijde)'
n_b = ?', aantal staven langs de breedte (per zijde)'
d_staaf = ?*(mm)', staafdiameter langswapening'
d_beugel = ?*(mm)', beugeldiameter'
s_beugel = ?*(mm)', beugelafstand'

# 3. Knik

L_cry = ?*(mm)', kniklengte om de y-as L_0,y'
L_crz = ?*(mm)', kniklengte om de z-as L_0,z'

# 4. Belastingen

N_Ed = ?*(kN)', normaalkracht N_Ed (druk positief)'
M_yEd = ?*(kN*m)', moment om de y-as M_y,Ed'
M_zEd = ?*(kN*m)', moment om de z-as M_z,Ed'

'<h6>Overzicht van de invoer</h6>
h_kol
b_kol
L_kol
c_dek
d_staaf
N_Ed
M_yEd

# 5. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De slankheidsgrens λ<sub>lim</sub> van §5.8.3.1, de
'tweede-orde-vergroting volgens de nominale stijfheid (§5.8.7) of de nominale
'kromming (§5.8.8), het M-N-interactiediagram en de minimum­wapening volgen.</i>
`;
