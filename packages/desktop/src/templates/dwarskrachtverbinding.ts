/**
 * Dwarskrachtverbinding — invoerblad bij DwarskrachtDesigner.tsx.
 *
 * VISUEEL ONLY: invoer, zijaanzicht en kopplaataanzicht. De toetsing
 * (boutgroep, kopplaat, liggerlijf, blokschuif) is nog niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met DwarskrachtDesigner.tsx.
 */

export const dwarskrachtverbinding = `"Dwarskrachtverbinding — scharnierende ligger-kolomverbinding

'<i>Een scharnierende oplegging van een ligger op een kolom, uitgevoerd als
'kopplaat, lijfplaat of hoekstalen. De verbinding draagt alleen dwarskracht;
'de rotatiecapaciteit moet groot genoeg zijn om het scharnier waar te maken.
'Het aantal boutrijen bepaalt zowel de tekening als de weerstand.</i>

# 1. Systeem

@select verbindingsvorm "Vorm van de verbinding"
  Kopplaat = 1
  Lijfplaat (schetsplaat) = 2
  Dubbel hoekstaal = 3
@end

@select kolomprofiel "Kolomprofiel"
  HEA 160 = 4
  HEA 180 = 5
  HEA 200 = 6
  HEA 220 = 7
  HEA 240 = 8
  HEA 260 = 9
  HEA 300 = 10
  HEB 160 = 14
  HEB 200 = 16
  HEB 240 = 18
  HEB 300 = 20
@end

@select liggerprofiel "Liggerprofiel"
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

@select hartlijn "Hartlijn van de bouten"
  versprongen = 1
  in lijn = 2
@end

# 2. Kopplaat en bouten

n_boutrijen = ?', aantal boutrijen'
t_kp = ?*(mm)', dikte kopplaat'
b_kp = ?*(mm)', breedte kopplaat'
e_kp = ?*(mm)', randafstand boven en onder'
p_kp = ?*(mm)', steek tussen de boutrijen'
w_kp = ?*(mm)', horizontale hart-op-hart afstand van de bouten'
a_las = ?*(mm)', keeldikte las liggerlijf op kopplaat'

V_Ed = ?*(kN)', dwarskracht V_Ed'

'<h6>Overzicht van de invoer</h6>
n_boutrijen
t_kp
b_kp
e_kp
p_kp
w_kp
V_Ed

# 3. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De boutgroep op afschuiving en stuik, de kopplaat en
'het liggerlijf op afschuiving, de blokschuif van §3.10.2 en de lassen volgen.</i>
`;
