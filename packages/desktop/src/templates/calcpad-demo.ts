/**
 * Showcase of CalcPAD-syntax features supported by the engine.
 *
 * Reference: https://calcpad.eu — features adopted here:
 *   - Line comments (' and //)
 *   - #hide / #show — hidden assignments still bind to scope
 *   - #pre / #end pre — execute but never render (setup constants)
 *   - #post / #end post — same, intended for trailing cleanup/audit
 *   - #if / #else if / #else / #end if — cascading conditionals
 *   - #repeat n / #end repeat — loops, iteration index bound to _i
 *   - F = ? unit — interactive input prompts
 *   - f(x) = expr — user-defined functions (mathjs lambda)
 *   - x — bare variable display (read-only reference to current value)
 *   - Full mathjs math vocabulary (sin/cos/sqrt/log/exp/abs/matrix/det/inv/...)
 */

export const calcpadDemo = `# CalcPAD Syntax Demo

' This is a CalcPAD-style line comment — the parser ignores it.
// JavaScript-style line comments are also recognized.

## Setup constants (verborgen)

#pre
gamma_M0 = 1.0
f_y = 235 N/mm^2
E_steel = 210000 N/mm^2
#end post

' These constants bound to scope above, but never appeared in the preview.

## Interactive Input

' The "?" pattern turns assignments into prompts. Try changing the value:

F = ? kN
L = ? mm
b = ? mm
h = ? mm

## User-defined functions

' Define a reusable check — UC = stress / capacity:

unityCheck(stress, capacity) = stress / capacity

' And a section modulus formula for rectangular sections:

W_rect(b_, h_) = b_ * h_^2 / 6

## Computed values via the function

A = b * h
W_el = W_rect(b, h)

f_yd = f_y / gamma_M0 to N/mm^2

M_Ed = F * L / 4 to kN*m
M_Rd = W_el * f_yd to kN*m

UC = unityCheck(M_Ed, M_Rd)

## Variable references (bare-name display)

' Just write the name on a line to show its current value:

UC

## Cascading verdict

#if UC < 0.5
  Ruim voldoende capaciteit (UC < 0.5) — overweeg lichter profiel.
#else if UC < 0.85
  Comfortabel voldoende (UC < 0.85).
#else if UC < 1.0
  Net voldoende (UC < 1.0) — let op uitvoeringstoleranties.
#else
  UC ≥ 1 — profiel onvoldoende!
#end if

## Parametric sweep (#repeat)

' Loop body sees iteration index _i (1-based). Useful for parametric studies.

#hide
F_sweep_kN = 0
#show

#repeat 5
  F_sweep_kN = 50 * _i
  M_sweep = F_sweep_kN * L / 4 to kN*m
  UC_sweep = M_sweep / M_Rd
#end repeat

## Standaard wiskundige functies (mathjs)

theta = 30 deg
sin_theta = sin(theta)
cos_theta = cos(theta)
hyp = sqrt(3^2 + 4^2)

## Matrix algebra

M_matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]
det_M = det(M_matrix)
`;
