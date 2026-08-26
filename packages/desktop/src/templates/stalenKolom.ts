/**
 * Stalen kolom — invoerblad bij StalenKolomDesigner.tsx.
 *
 * VISUEEL ONLY: invoer, knikschema en profieldoorsnede. De toetsing volgens
 * EN 1993-1-1 §6.3 (χ, knikkrommen, N-M-interactie 6.61/6.62) is nog niet
 * uitgewerkt.
 *
 * Variabelenamen komen exact overeen met StalenKolomDesigner.tsx.
 */

export const stalenKolom = `"Stalen kolom — knik en buiging (EN 1993-1-1 §6.3)

'<i>Een op druk en buiging belaste kolom. De drie kniklengtes worden apart
'ingevoerd: L<sub>cr,y</sub> en L<sub>cr,z</sub> voor buigknik om de sterke en de
'zwakke as, en L<sub>cr</sub> voor de ongesteunde lengte die het kipgedrag
'bepaalt. De knikvorm (wel of niet verplaatsbare knopen) bepaalt de
'knikfactor.</i>

# 1. Profiel en geometrie

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

@select knikvorm "Knikvorm"
  Niet verplaatsbare knopen = 1
  Verplaatsbare knopen = 2
@end

L_kolom = ?*(mm)', kolomlengte L'
L_cry = ?*(mm)', kniklengte om de y-as L_cr,y'
L_crz = ?*(mm)', kniklengte om de z-as L_cr,z'
L_cr = ?*(mm)', ongesteunde lengte L_cr (kip)'

# 2. Belastingen

N_Ed = ?*(kN)', normaalkracht N_Ed (druk positief)'
M_yA = ?*(kN*m)', moment aan de bovenzijde M_yA,Ed'
M_yB = ?*(kN*m)', moment aan de onderzijde M_yB,Ed'
q_z = ?*(kN/m)', verdeelde belasting loodrecht op de kolom q_z,Ed'
z_aangrijp = ?*(mm)', aangrijpingspunt z, gemeten vanaf de bovenkant'

'<h6>Overzicht van de invoer</h6>
L_kolom
L_cry
L_crz
L_cr
N_Ed
M_yA
M_yB
q_z

# 3. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De doorsnedeklasse, N<sub>b,Rd</sub> met de
'knikkrommen van tabel 6.2, het kipmoment M<sub>b,Rd</sub> en de
'N-M-interactie (6.61)/(6.62) met de k-factoren uit bijlage B volgen.</i>
`;
