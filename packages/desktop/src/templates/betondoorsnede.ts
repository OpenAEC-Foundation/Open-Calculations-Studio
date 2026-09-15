/**
 * Betondoorsnede — invoerblad bij BetondoorsnedeDesigner.tsx.
 *
 * VISUEEL ONLY: invoer en parametrische doorsnede met wapeningslagen en
 * beugels. De toetsing (M-N-interactie, dwarskracht, wringing, scheurwijdte)
 * is nog niet uitgewerkt.
 *
 * Variabelenamen komen exact overeen met BetondoorsnedeDesigner.tsx.
 */

export const betondoorsnede = `"Betondoorsnede — rechthoekige doorsnede onder M, N, V en T

'<i>Een gewapende rechthoekige doorsnede met drie wapeningslagen en beugels.
'De invoer legt de geometrie, de dekking en de staafverdeling vast; daaruit
'volgen straks de inwendige hefboomsarmen en de weerstanden. De karakteristieke
'krachten N<sub>k</sub> en M<sub>k</sub> dienen voor de scheurwijdte.</i>

# 1. Doorsnede

b_dsn = ?*(mm)', breedte b'
h_dsn = ?*(mm)', hoogte h'

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

# 2. Wapening

n_onder = ?', aantal staven onderin'
d_onder = ?*(mm)', staafdiameter onderin'
n_midden = ?', aantal staven in de tussenlaag (0 = geen)'
d_midden = ?*(mm)', staafdiameter tussenlaag'
n_boven = ?', aantal staven bovenin'
d_boven = ?*(mm)', staafdiameter bovenin'
d_beugel = ?*(mm)', beugeldiameter'
s_beugel = ?*(mm)', beugelafstand'
n_sneden = ?', aantal beugelsneden'

# 3. Belastingen

N_Ed = ?*(kN)', normaalkracht N_Ed (druk positief)'
M_Ed = ?*(kN*m)', buigend moment M_Ed'
V_Ed = ?*(kN)', dwarskracht V_Ed'
T_Ed = ?*(kN*m)', wringend moment T_Ed'
N_k = ?*(kN)', karakteristieke normaalkracht N_k (BGT)'
M_k = ?*(kN*m)', karakteristiek moment M_k (BGT)'

'<h6>Overzicht van de invoer</h6>
b_dsn
h_dsn
c_dek
n_onder
d_onder
n_boven
d_boven
N_Ed
M_Ed
V_Ed

# 4. Toetsing

'<i><b>Nog niet uitgewerkt.</b> Dit blad legt voorlopig alleen de invoer en de
'parametrische doorsnede vast. De M-N-interactie met het rechthoekige
'spanningsblok, de dwarskracht volgens §6.2 (V<sub>Rd,c</sub> en de
'vakwerkanalogie), de wringing van §6.3 en de scheurwijdte van §7.3 volgen —
'net als het M-N-κ-diagram.</i>
`;
