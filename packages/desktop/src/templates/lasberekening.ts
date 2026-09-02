/**
 * Lasberekening — invoerblad bij LasDesigner.tsx.
 *
 * VISUEEL ONLY: invoer en isometrisch beeld met de zes belastingcomponenten.
 * De richtingsmethode van EN 1993-1-8 §4.5.3.2 is nog niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met LasDesigner.tsx.
 */

export const lasberekening = `"Lasberekening — hoeklas onder zes belastingcomponenten

'<i>Een lasfiguur L × b met keeldikte a, belast door drie krachten en drie
'momenten. F<sub>x</sub> werkt loodrecht op het lasvlak, F<sub>y</sub> en
'F<sub>z</sub> in het vlak; M<sub>x</sub> wringt om de lasas, M<sub>y</sub> en
'M<sub>z</sub> buigen. Uit de resultante volgen straks de spanningscomponenten
'σ<sub>⊥</sub>, τ<sub>⊥</sub> en τ<sub>∥</sub> in het keelvlak.</i>

# 1. Invoer

@select staalsoort "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select typelas "Type las"
  Hoeklas = 1
  Stompe las (volledige doorlassing) = 2
@end

L_las = ?*(mm)', lengte van de lasfiguur L'
b_las = ?*(mm)', breedte van de lasfiguur b'
a_las = ?*(mm)', keeldikte a'

@select langeverb "Lange verbinding (reductie β_Lw)"
  niet van toepassing = 0
  overlapverbinding β_Lw,1 = 1
  langsstijver β_Lw,2 = 2
@end

# 2. Belastingen

F_xEd = ?*(kN)', normaalkracht loodrecht op het lasvlak F_x,Ed'
F_yEd = ?*(kN)', dwarskracht in het vlak F_y,Ed'
F_zEd = ?*(kN)', dwarskracht in het vlak F_z,Ed'
M_xEd = ?*(kN*m)', wringend moment M_x,Ed'
M_yEd = ?*(kN*m)', buigend moment M_y,Ed'
M_zEd = ?*(kN*m)', buigend moment M_z,Ed'

'<h6>Overzicht van de invoer</h6>
L_las
b_las
a_las
F_xEd
F_yEd
F_zEd
M_xEd
M_yEd
M_zEd

# 3. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en het
'parametrische beeld vast. De richtingsmethode van EN 1993-1-8 §4.5.3.2 —
'√(σ<sub>⊥</sub>² + 3τ<sub>⊥</sub>² + 3τ<sub>∥</sub>²) ≤ f<sub>u</sub>/(β<sub>w</sub>γ<sub>M2</sub>)
'met de aanvullende eis σ<sub>⊥</sub> ≤ 0,9·f<sub>u</sub>/γ<sub>M2</sub> — volgt.</i>
`;
