/**
 * Showcase of CalcPAD-syntax features now supported by the engine:
 *   - Line comments (' and //)
 *   - #hide / #show — assignments execute, output suppressed
 *   - #if / #else if / #else / #end if — cascading conditionals
 *   - F = ? unit — interactive input prompts
 *   - Units, math functions (sin, cos, sqrt, log, exp, ...) via mathjs
 */

export const calcpadDemo = `# CalcPAD Syntax Demo

' This is a CalcPAD-style line comment — the parser ignores it.
// JavaScript-style line comments are also recognized.

## Interactive Input

' The "?" pattern turns assignments into prompts. Try changing the value:

F = ? kN
L = ? mm
b = ? mm
h = ? mm

## Computed Sectiegegevens

A = b * h
W_el = b * h^2 / 6

## Hidden helpers

' Below: #hide … #show. The constants execute (so f_yd is available below)
' but they don't render in the preview.

#hide
f_y = 235 N/mm^2
gamma_M0 = 1.0
f_yd = f_y / gamma_M0 to N/mm^2
#show

f_yd_inline = f_yd

## Buigingstoetsing (#else if cascade)

M_Ed = F * L / 4 to kN*m
M_Rd = W_el * f_yd to kN*m

UC = M_Ed / M_Rd

#if UC < 0.5
  Ruim voldoende capaciteit (UC < 0.5) — overweeg lichter profiel.
#else if UC < 0.85
  Comfortabel voldoende (UC < 0.85).
#else if UC < 1.0
  Net voldoende (UC < 1.0) — let op uitvoeringstoleranties.
#else
  UC ≥ 1 — profiel onvoldoende!
#end if

## Standaard wiskundige functies (mathjs)

' mathjs is volledig beschikbaar: sin, cos, tan, sqrt, log, exp, abs, ...

theta = 30 deg
sin_theta = sin(theta)
cos_theta = cos(theta)
hyp = sqrt(3^2 + 4^2)
e_natural = exp(1)
pi_value = pi

## Vector & Matrix

' mathjs ondersteunt matrix literals zoals CalcPAD:
M_matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]
det_M = det(M_matrix)
`;
