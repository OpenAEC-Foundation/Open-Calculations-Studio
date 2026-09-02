/**
 * Penverbinding — invoerblad bij PenDesigner.tsx.
 *
 * VISUEEL ONLY: invoer en parametrisch beeld van een oogplaat met vork.
 * De toetsing van EN 1993-1-8 §3.13 is nog niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met PenDesigner.tsx.
 */

export const penverbinding = `"Penverbinding — oogplaat met pen

'<i>Een oogplaat in een vork, verbonden door een pen. EN 1993-1-8 §3.13 stelt
'eisen aan de plaatgeometrie (a en c rond het gat), en toetst de pen op
'afschuiving, buiging en stuik. Moet de pen vervangbaar zijn, dan geldt
'bovendien een contactspanningseis in de bruikbaarheidsgrenstoestand.</i>

# 1. Invoer

@select staalsoort "Staalsoort oogplaat en vork"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select penkwaliteit "Kwaliteit van de pen"
  4.6 = 46
  5.6 = 56
  8.8 = 88
  10.9 = 109
@end

@select vervangbaar "Pen moet vervangbaar zijn"
  Ja = 1
  Nee = 0
@end

d_pen = ?*(mm)', diameter van de pen d'
d_0 = ?*(mm)', gatdiameter d_0'
a_oog = ?*(mm)', afstand gat tot de kop van de oogplaat a'
c_oog = ?*(mm)', afstand gat tot de zijkant van de oogplaat c'
t_oog = ?*(mm)', dikte van de oogplaat t'
t_vork = ?*(mm)', dikte van één vorkplaat a_1'
c_1 = ?*(mm)', speling tussen oogplaat en vork c_1'

F_Ed = ?*(kN)', rekenwaarde van de trekkracht F_Ed'
F_Edser = ?*(kN)', karakteristieke trekkracht in de BGT F_Ed,ser'

'<h6>Overzicht van de invoer</h6>
d_pen
d_0
a_oog
c_oog
t_oog
F_Ed

# 2. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De geometrie-eisen van EN 1993-1-8 tabel 3.9, de
'afschuif-, buig- en stuikweerstand van de pen (tabel 3.10) en de
'contactspanning in de BGT volgen.</i>
`;
