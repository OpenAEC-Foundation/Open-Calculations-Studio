/**
 * Schoorverbinding — invoerblad bij SchoorDesigner.tsx.
 *
 * VISUEEL ONLY: invoer en parametrisch beeld van een hoekstaal op een
 * schetsplaat. De toetsing (EN 1993-1-8 §3.10.3 voor het enkelzijdig
 * aangesloten hoekprofiel) is nog niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met SchoorDesigner.tsx.
 */

export const schoorverbinding = `"Schoorverbinding — hoekstaal op een schetsplaat

'<i>Een windverbandschoor van hoekstaal, met bouten door één been op een
'schetsplaat. Doordat maar één been is aangesloten werkt de kracht excentrisch;
'EN 1993-1-8 §3.10.3 verrekent dat met β<sub>2</sub>/β<sub>3</sub> op de netto
'doorsnede. De hoek van de schoor stuurt de vorm van de schetsplaat.</i>

# 1. Invoer

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

@select staalsoort "Staalsoort"
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

n_bouten = ?', aantal bouten in de rij'
t_schets = ?*(mm)', dikte schetsplaat'
hoek = ?', hoek van de schoor met de horizontaal [graden]'
e_1 = ?*(mm)', randafstand e_1'
p_1 = ?*(mm)', steek p_1'
b_schets = ?*(mm)', breedte schetsplaat'
h_schets = ?*(mm)', hoogte schetsplaat'
a_las = ?*(mm)', keeldikte las schetsplaat'
F_Ed = ?*(kN)', rekenwaarde van de schoorkracht F_Ed'

'<h6>Overzicht van de invoer</h6>
n_bouten
t_schets
hoek
e_1
p_1
F_Ed

# 2. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De toetsing van het hoekstaal op trek (bruto en netto,
'met β<sub>2</sub>/β<sub>3</sub> uit §3.10.3), de bouten op afschuiving en stuik,
'de schetsplaat en de lassen volgt.</i>
`;
