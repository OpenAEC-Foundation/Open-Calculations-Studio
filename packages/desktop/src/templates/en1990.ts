/**
 * NEN-EN 1990:2002+A1:2019+NB:2019 — Grondslagen van het constructief ontwerp
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1990:2002+A1+A1/C2:2019 met Nationale Bijlage NB:2019
 *
 * Bevat de belangrijkste praktische formules voor:
 * - Belastingcombinaties UGT (fundamenteel, buitengewoon, aardbeving)
 * - Belastingcombinaties BGT (karakteristiek, frequent, quasi-blijvend)
 * - Partiele factoren per gevolgklasse
 * - Psi-factoren per belastingcategorie
 *
 * Elke veranderlijke belasting heeft een eigen categorie, dus eigen ψ-factoren
 * (tabel NB.2 – A1.1); een vaste ψ = 0 liet Q_k2 eerder stil wegvallen. Bij
 * categorie C is ψ0 = 0,6 voor delen die bij een calamiteit zwaar door een
 * menigte kunnen worden belast (vluchtroutes, trappen) en 0,4 voor de overige
 * (voetnoot a); beide staan als keuze in de lijsten. Waar
 * het ertoe doet zijn beide veranderlijke belastingen om beurten overheersend.
 * Werkt Q_k1 tegen de blijvende belasting in (windzuiging op een licht dak),
 * dan volgt ook de combinatie met γ_G,inf = 0,9 op G_k,inf; het overzicht geeft
 * dan ook de bruikbaarheidscombinaties met G_k,inf en Q_k1 tegen G in.
 * Buitengewoon: Q_k1 met ψ2,1, behalve wind bij brand (ψ1,1), voetnoot a bij
 * tabel NB.10 – A1.3. De referentieperiode is ten minste 15 jaar (tabel
 * NB.1 – 2.1 en 4.1.2(7a) van de NB).
 * scripts/check-en1990-combinaties.mjs rekent de uitkomsten met de hand na.
 */

// ---------------------------------------------------------------------------
// 1. Fundamentele belastingcombinatie (STR/GEO) -- EN 1990 $6.4.3.2
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.2 -- Fundamentele combinatie (UGT) voor gebouwen */
export const en1990Fundamenteel = `"Fundamentele combinatie — NEN-EN 1990 §6.4.3.2 + NB

# 1. Belastingen (karakteristiek)

@select richting "Q_k1 werkt"
In dezelfde richting als de blijvende belasting = 1
Tegen de blijvende belasting in, bijv. windzuiging op een licht dak = 2
@end

G_ksup = ?*(kN)', blijvend, ongunstig'
#if richting ≡ 2
    G_kinf = ?*(kN)', blijvend, gunstig'
#end if
Q_k1 = ?*(kN)', veranderlijk'
Q_k2 = ?*(kN)', veranderlijk, gelijktijdig; 0 als die er niet is'

@select belastingcategorie "Categorie van Q_k1"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes, overige delen = 3
Categorie C -- vluchtroutes en trappen, zwaar belast door een menigte bij calamiteit = 11
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes, overige delen = 3
Categorie C -- vluchtroutes en trappen, zwaar belast door een menigte bij calamiteit = 11
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

# 2. Factoren (tabel NB.2 – A1.1, NB.4 en NB.5)

#hide
'Tabel NB.2 – A1.1: categorie | ψ0 | ψ1 | ψ2; 11 is C met ψ0 = 0,6 (voetnoot a)
psi = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11 | 0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0; 0.6 | 0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2; 0.7 | 0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0; 0.6]
ψ_0,1 = hlookup(psi; belastingcategorie; 1; 2)
ψ_0,2 = hlookup(psi; categorie_2; 1; 2)
#show
'ψ<sub>0</sub> = 'ψ_0,1' voor Q<sub>k,1</sub> en 'ψ_0,2' voor Q<sub>k,2</sub>.
#if CC ≡ 1
    γ_G,a = 1.2', 6.10a, CC1 (tabel NB.5)'
    γ_G,b = 1.1', 6.10b'
    γ_Q = 1.35
#else if CC ≡ 3
    γ_G,a = 1.5', 6.10a, CC3 (tabel NB.5)'
    γ_G,b = 1.3', 6.10b'
    γ_Q = 1.65
#else
    γ_G,a = 1.35', 6.10a, CC2 (tabel NB.4)'
    γ_G,b = 1.2', 6.10b'
    γ_Q = 1.5
#end if
#if richting ≡ 2
    γ_G,inf = 0.9', blijvend, gunstig'
#end if

# 3. Combinaties

#if richting ≡ 1
    E_610a = γ_G,a*G_ksup + γ_Q*ψ_0,1*Q_k1 + γ_Q*ψ_0,2*Q_k2 to kN', (6.10a)'
    E_610b,1 = γ_G,b*G_ksup + γ_Q*Q_k1 + γ_Q*ψ_0,2*Q_k2 to kN', (6.10b), Q_k1 overheersend'
    E_610b,2 = γ_G,b*G_ksup + γ_Q*Q_k2 + γ_Q*ψ_0,1*Q_k1 to kN', (6.10b), Q_k2 overheersend'
    E_d = max(E_610a; E_610b,1; E_610b,2) to kN', maatgevend'
#else
    '<i>In de combinaties met G<sub>k,sup</sub> werkt Q<sub>k,1</sub> gunstig en telt niet mee; in die met G<sub>k,inf</sub> telt Q<sub>k,2</sub> niet mee.</i>
    E_610a = γ_G,a*G_ksup + γ_Q*ψ_0,2*Q_k2 to kN', (6.10a)'
    E_610b = γ_G,b*G_ksup + γ_Q*Q_k2 to kN', (6.10b)'
    E_d = max(E_610a; E_610b) to kN', maatgevend in de richting van G'
    E_d,inf = γ_G,inf*G_kinf - γ_Q*Q_k1 to kN', G gunstig, Q_k1 overheersend (6.10b); negatief: netto tegen G in'
#end if
`;

// ---------------------------------------------------------------------------
// 2. EQU combinatie -- EN 1990 $6.4.2, Tabel NB.3-A1.2(A)
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.2 -- Statisch evenwicht (EQU) */
export const en1990EQU = `"Statisch evenwicht (EQU) — NEN-EN 1990 §6.4.2 + NB

# 1. Belastingen (karakteristiek)

G_kdst = ?*(kN)', blijvend, destabiliserend'
G_kstb = ?*(kN)', blijvend, stabiliserend'
Q_k1dst = ?*(kN)', veranderlijk, destabiliserend, overheersend'
Q_kidst = ?*(kN)', veranderlijk, destabiliserend, gelijktijdig'

@select belastingcategorie "Categorie van Q_ki"
Categorie A -- woon- en verblijfsruimtes (psi_0 = 0.4) = 0.4
Categorie B -- kantoorruimtes (psi_0 = 0.5) = 0.5
Categorie C -- bijeenkomstruimtes, overige delen (psi_0 = 0.4) = 0.4
Categorie C -- vluchtroutes en trappen (psi_0 = 0.6) = 0.6
Categorie D -- winkelruimtes (psi_0 = 0.4) = 0.4
Categorie E -- opslagruimtes (psi_0 = 1.0) = 1.0
Categorie H -- daken (psi_0 = 0) = 0
Sneeuwbelasting (psi_0 = 0) = 0
Windbelasting (psi_0 = 0) = 0
@end

# 2. Factoren (tabel NB.3 – A1.2(A))

γ_G,sup = 1.1
γ_G,inf = 0.9
γ_Q = 1.5
#hide
ψ_0,i = belastingcategorie*1
#show
ψ_0,i', tabel NB.2 – A1.1'

# 3. Toetsing (6.7)

E_d,dst = γ_G,sup*G_kdst + γ_Q*Q_k1dst + γ_Q*ψ_0,i*Q_kidst to kN
E_d,stb = γ_G,inf*G_kstb to kN
#if E_d,stb > 0 kN
    UC_max = E_d,dst/E_d,stb
#else
    '<span style="color: red">Vul de stabiliserende belasting in.</span>
    #hide
    UC_max = 1/0
    #show
#end if
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: statisch evenwicht</span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: statisch evenwicht</span>
#end if
`;

// ---------------------------------------------------------------------------
// 3. Buitengewone combinatie -- EN 1990 $6.4.3.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.3 -- Buitengewone ontwerpsituatie (UGT) */
export const en1990Buitengewoon = `"Buitengewone combinatie — NEN-EN 1990 §6.4.3.3 + NB

# 1. Belastingen

@select type_buitengewoon "Type buitengewone situatie"
Brand -- psi_2,1 * Q_k,1; bij wind psi_1,1 = 1
Schok of ontploffing -- psi_2,1 * Q_k,1 = 2
Overige buitengewone situatie -- psi_2,1 * Q_k,1 = 3
@end

G_k = ?*(kN)', blijvend, karakteristiek'
A_d = ?*(kN)', buitengewone belasting, rekenwaarde'
Q_k1 = ?*(kN)', veranderlijk, overheersend'
Q_k2 = ?*(kN)', veranderlijk, gelijktijdig'

@select belastingcategorie "Categorie van Q_k1"
Categorie A -- woon (psi_1=0.5, psi_2=0.3) = 1
Categorie B -- kantoor (psi_1=0.5, psi_2=0.3) = 2
Categorie C -- bijeenkomst (psi_1=0.7, psi_2=0.6) = 3
Categorie D -- winkel (psi_1=0.7, psi_2=0.6) = 4
Categorie E -- opslag (psi_1=0.9, psi_2=0.8) = 5
Sneeuw (psi_1=0.2, psi_2=0) = 6
Wind (psi_1=0.2, psi_2=0) = 7
@end

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon (psi_2=0.3) = 0.3
Categorie B -- kantoor (psi_2=0.3) = 0.3
Categorie C -- bijeenkomst (psi_2=0.6) = 0.6
Categorie D -- winkel (psi_2=0.6) = 0.6
Categorie E -- opslag (psi_2=0.8) = 0.8
Sneeuw (psi_2=0) = 0
Wind (psi_2=0) = 0
@end

# 2. Rekenwaarde (6.11b, tabel NB.10 – A1.3)

#hide
psi = [1; 2; 3; 4; 5; 6; 7 | 0.5; 0.5; 0.7; 0.7; 0.9; 0.2; 0.2 | 0.3; 0.3; 0.6; 0.6; 0.8; 0; 0]
ψ_1,1 = hlookup(psi; belastingcategorie; 1; 2)
ψ_2,1 = hlookup(psi; belastingcategorie; 1; 3)
ψ_2,2 = categorie_2*1
#show
#if type_buitengewoon ≡ 1 and belastingcategorie ≡ 7
    ψ_1,1', Q_k1: wind bij brand (tabel NB.10 – A1.3, voetnoot a)'
    ψ_2,2', Q_k2'
    E_d = G_k + A_d + ψ_1,1*Q_k1 + ψ_2,2*Q_k2 to kN', alle γ = 1,0'
#else
    ψ_2,1', Q_k1: ψ_1,1 alleen voor wind bij brand (tabel NB.10 – A1.3, voetnoot a)'
    ψ_2,2', Q_k2'
    E_d = G_k + A_d + ψ_2,1*Q_k1 + ψ_2,2*Q_k2 to kN', alle γ = 1,0'
#end if
`;

// ---------------------------------------------------------------------------
// 4. Aardbevingscombinatie -- EN 1990 $6.4.3.4
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.4 -- Aardbevingsontwerpsituatie (UGT) */
export const en1990Aardbeving = `"Aardbevingscombinatie — NEN-EN 1990 §6.4.3.4 + NB

# 1. Belastingen

G_k = ?*(kN)', blijvend, karakteristiek'
A_Ed = ?*(kN)', aardbevingsbelasting, rekenwaarde volgens NEN-EN 1998'
Q_k1 = ?*(kN)', veranderlijk'
Q_k2 = ?*(kN)', veranderlijk'

@select belastingcategorie "Categorie van Q_k1"
Categorie A -- woon (psi_2 = 0.3) = 0.3
Categorie B -- kantoor (psi_2 = 0.3) = 0.3
Categorie C -- bijeenkomst (psi_2 = 0.6) = 0.6
Categorie D -- winkel (psi_2 = 0.6) = 0.6
Categorie E -- opslag (psi_2 = 0.8) = 0.8
Sneeuw (psi_2 = 0) = 0
Wind (psi_2 = 0) = 0
@end

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon (psi_2 = 0.3) = 0.3
Categorie B -- kantoor (psi_2 = 0.3) = 0.3
Categorie C -- bijeenkomst (psi_2 = 0.6) = 0.6
Categorie D -- winkel (psi_2 = 0.6) = 0.6
Categorie E -- opslag (psi_2 = 0.8) = 0.8
Sneeuw (psi_2 = 0) = 0
Wind (psi_2 = 0) = 0
@end

# 2. Rekenwaarde (6.12b, tabel NB.10 – A1.3)

#hide
ψ_2,1 = belastingcategorie*1
#show
ψ_2,1
#hide
ψ_2,2 = categorie_2*1
#show
ψ_2,2
E_d = G_k + A_Ed + ψ_2,1*Q_k1 + ψ_2,2*Q_k2 to kN', alle γ = 1,0'
`;

// ---------------------------------------------------------------------------
// 5. Bruikbaarheidsgrenstoestanden (BGT) -- EN 1990 $6.5.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.5.3 -- Bruikbaarheidsgrenstoestanden (BGT/SLS) */
export const en1990BGT = `"Bruikbaarheidscombinaties — NEN-EN 1990 §6.5.3 + NB

# 1. Belastingen (karakteristiek)

G_k = ?*(kN)', blijvend'
Q_k1 = ?*(kN)', veranderlijk'
Q_k2 = ?*(kN)', veranderlijk, gelijktijdig; 0 als die er niet is'

@select belastingcategorie "Categorie van Q_k1"
Categorie A -- woon (psi_0=0.4, psi_1=0.5, psi_2=0.3) = 1
Categorie B -- kantoor (psi_0=0.5, psi_1=0.5, psi_2=0.3) = 2
Categorie C -- bijeenkomst, overige delen (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 3
Categorie C -- vluchtroutes en trappen (psi_0=0.6, psi_1=0.7, psi_2=0.6) = 11
Categorie D -- winkel (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 4
Categorie E -- opslag (psi_0=1.0, psi_1=0.9, psi_2=0.8) = 5
Categorie F -- verkeer <= 25 kN (psi_0=0.7, psi_1=0.7, psi_2=0.6) = 6
Categorie G -- verkeer 25-160 kN (psi_0=0.7, psi_1=0.5, psi_2=0.3) = 7
Categorie H -- daken (psi_0=0, psi_1=0, psi_2=0) = 8
Sneeuw (psi_0=0, psi_1=0.2, psi_2=0) = 9
Wind (psi_0=0, psi_1=0.2, psi_2=0) = 10
@end

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon (psi_0=0.4, psi_1=0.5, psi_2=0.3) = 1
Categorie B -- kantoor (psi_0=0.5, psi_1=0.5, psi_2=0.3) = 2
Categorie C -- bijeenkomst, overige delen (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 3
Categorie C -- vluchtroutes en trappen (psi_0=0.6, psi_1=0.7, psi_2=0.6) = 11
Categorie D -- winkel (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 4
Categorie E -- opslag (psi_0=1.0, psi_1=0.9, psi_2=0.8) = 5
Categorie F -- verkeer <= 25 kN (psi_0=0.7, psi_1=0.7, psi_2=0.6) = 6
Categorie G -- verkeer 25-160 kN (psi_0=0.7, psi_1=0.5, psi_2=0.3) = 7
Categorie H -- daken (psi_0=0, psi_1=0, psi_2=0) = 8
Sneeuw (psi_0=0, psi_1=0.2, psi_2=0) = 9
Wind (psi_0=0, psi_1=0.2, psi_2=0) = 10
@end

#hide
'Tabel NB.2 – A1.1: categorie | ψ0 | ψ1 | ψ2; 11 is C met ψ0 = 0,6 (voetnoot a)
psi = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11 | 0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0; 0.6 | 0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2; 0.7 | 0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0; 0.6]
ψ_0,1 = hlookup(psi; belastingcategorie; 1; 2)
ψ_1,1 = hlookup(psi; belastingcategorie; 1; 3)
ψ_2,1 = hlookup(psi; belastingcategorie; 1; 4)
ψ_0,2 = hlookup(psi; categorie_2; 1; 2)
ψ_1,2 = hlookup(psi; categorie_2; 1; 3)
ψ_2,2 = hlookup(psi; categorie_2; 1; 4)
#show
'ψ-factoren (tabel NB.2 – A1.1): Q<sub>k,1</sub> 'ψ_0,1' / 'ψ_1,1' / 'ψ_2,1' en Q<sub>k,2</sub> 'ψ_0,2' / 'ψ_1,2' / 'ψ_2,2' (ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub>).

# 2. Combinaties (tabel A1.4)

E_kar = max(G_k + Q_k1 + ψ_0,2*Q_k2; G_k + Q_k2 + ψ_0,1*Q_k1) to kN', karakteristiek (6.14b), elk van beide overheersend'
E_freq = max(G_k + ψ_1,1*Q_k1 + ψ_2,2*Q_k2; G_k + ψ_1,2*Q_k2 + ψ_2,1*Q_k1) to kN', frequent (6.15b)'
E_qp = G_k + ψ_2,1*Q_k1 + ψ_2,2*Q_k2 to kN', quasi-blijvend (6.16b)'
`;

// ---------------------------------------------------------------------------
// 6. Volledige belastingcombinatie -- alle UGT en BGT
// ---------------------------------------------------------------------------

/** EN 1990 -- Volledige belastingcombinatie gebouwen */
export const en1990Compleet = `"Belastingcombinaties — NEN-EN 1990 + NB

# 1. Belastingen (karakteristiek)

@select richting "Q_k1 werkt"
In dezelfde richting als de blijvende belasting = 1
Tegen de blijvende belasting in, bijv. windzuiging op een licht dak = 2
@end

G_ksup = ?*(kN)', blijvend, ongunstig'
#if richting ≡ 2
    G_kinf = ?*(kN)', blijvend, gunstig'
#end if
Q_k1 = ?*(kN)', veranderlijk'
Q_k2 = ?*(kN)', veranderlijk, gelijktijdig; 0 als die er niet is'

@select belastingcategorie "Categorie van Q_k1"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes, overige delen = 3
Categorie C -- vluchtroutes en trappen, zwaar belast door een menigte bij calamiteit = 11
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes, overige delen = 3
Categorie C -- vluchtroutes en trappen, zwaar belast door een menigte bij calamiteit = 11
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

# 2. Factoren (tabel NB.2 – A1.1, NB.4 en NB.5)

#hide
'Tabel NB.2 – A1.1: categorie | ψ0 | ψ1 | ψ2; 11 is C met ψ0 = 0,6 (voetnoot a)
psi = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11 | 0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0; 0.6 | 0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2; 0.7 | 0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0; 0.6]
ψ_0,1 = hlookup(psi; belastingcategorie; 1; 2)
ψ_1,1 = hlookup(psi; belastingcategorie; 1; 3)
ψ_2,1 = hlookup(psi; belastingcategorie; 1; 4)
ψ_0,2 = hlookup(psi; categorie_2; 1; 2)
ψ_1,2 = hlookup(psi; categorie_2; 1; 3)
ψ_2,2 = hlookup(psi; categorie_2; 1; 4)
#show
'ψ-factoren: Q<sub>k,1</sub> 'ψ_0,1' / 'ψ_1,1' / 'ψ_2,1' en Q<sub>k,2</sub> 'ψ_0,2' / 'ψ_1,2' / 'ψ_2,2' (ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub>).
#if CC ≡ 1
    γ_G,a = 1.2', 6.10a, CC1 (tabel NB.5)'
    γ_G,b = 1.1', 6.10b'
    γ_Q = 1.35
#else if CC ≡ 3
    γ_G,a = 1.5', 6.10a, CC3 (tabel NB.5)'
    γ_G,b = 1.3', 6.10b'
    γ_Q = 1.65
#else
    γ_G,a = 1.35', 6.10a, CC2 (tabel NB.4)'
    γ_G,b = 1.2', 6.10b'
    γ_Q = 1.5
#end if
#if richting ≡ 2
    γ_G,inf = 0.9', blijvend, gunstig'
#end if

# 3. Uiterste grenstoestand, fundamenteel (§6.4.3.2)

#if richting ≡ 1
    E_610a = γ_G,a*G_ksup + γ_Q*ψ_0,1*Q_k1 + γ_Q*ψ_0,2*Q_k2 to kN', (6.10a)'
    E_610b,1 = γ_G,b*G_ksup + γ_Q*Q_k1 + γ_Q*ψ_0,2*Q_k2 to kN', (6.10b), Q_k1 overheersend'
    E_610b,2 = γ_G,b*G_ksup + γ_Q*Q_k2 + γ_Q*ψ_0,1*Q_k1 to kN', (6.10b), Q_k2 overheersend'
    E_UGT = max(E_610a; E_610b,1; E_610b,2) to kN', maatgevend'
#else
    '<i>In de combinaties met G<sub>k,sup</sub> werkt Q<sub>k,1</sub> gunstig en telt niet mee; in die met G<sub>k,inf</sub> telt Q<sub>k,2</sub> niet mee.</i>
    E_610a = γ_G,a*G_ksup + γ_Q*ψ_0,2*Q_k2 to kN', (6.10a)'
    E_610b = γ_G,b*G_ksup + γ_Q*Q_k2 to kN', (6.10b)'
    E_UGT = max(E_610a; E_610b) to kN', maatgevend in de richting van G'
    E_UGT,inf = γ_G,inf*G_kinf - γ_Q*Q_k1 to kN', G gunstig, Q_k1 overheersend (6.10b); negatief: netto tegen G in'
#end if

# 4. Bruikbaarheidsgrenstoestand (§6.5.3, tabel A1.4)

#if richting ≡ 1
    E_kar = max(G_ksup + Q_k1 + ψ_0,2*Q_k2; G_ksup + Q_k2 + ψ_0,1*Q_k1) to kN', karakteristiek (6.14b), elk van beide overheersend'
    E_freq = max(G_ksup + ψ_1,1*Q_k1 + ψ_2,2*Q_k2; G_ksup + ψ_1,2*Q_k2 + ψ_2,1*Q_k1) to kN', frequent (6.15b)'
    E_qp = G_ksup + ψ_2,1*Q_k1 + ψ_2,2*Q_k2 to kN', quasi-blijvend (6.16b)'
#else
    E_kar = G_ksup + Q_k2 to kN', karakteristiek (6.14b), in de richting van G'
    E_freq = G_ksup + ψ_1,2*Q_k2 to kN', frequent (6.15b)'
    E_qp = G_ksup + ψ_2,2*Q_k2 to kN', quasi-blijvend (6.16b)'
    E_kar,inf = G_kinf - Q_k1 to kN', karakteristiek (6.14b), Q_k1 tegen G in; negatief: netto tegen G in'
    E_freq,inf = G_kinf - ψ_1,1*Q_k1 to kN', frequent (6.15b)'
    E_qp,inf = G_kinf - ψ_2,1*Q_k1 to kN', quasi-blijvend (6.16b)'
#end if
`;

// ---------------------------------------------------------------------------
// 7. Geotechnische combinatie (STR/GEO groep C) -- Tabel NB.6-A1.2(C)
// ---------------------------------------------------------------------------

/** EN 1990 Tabel NB.6-A1.2(C) -- Geotechnische belastingen (groep C) */
export const en1990GroepC = `"Geotechnische combinatie, groep C — NEN-EN 1990 tabel NB.6 – A1.2(C)

# 1. Belastingen (karakteristiek)

G_ksup = ?*(kN)', blijvend, ongunstig'
Q_k1 = ?*(kN)', veranderlijk, overheersend'
Q_k2 = ?*(kN)', veranderlijk, gelijktijdig'

@select categorie_2 "Categorie van Q_k2"
Categorie A -- woon (psi_0 = 0.4) = 0.4
Categorie B -- kantoor (psi_0 = 0.5) = 0.5
Categorie C -- bijeenkomst, overige delen (psi_0 = 0.4) = 0.4
Categorie C -- vluchtroutes en trappen (psi_0 = 0.6) = 0.6
Categorie D -- winkel (psi_0 = 0.4) = 0.4
Categorie E -- opslag (psi_0 = 1.0) = 1.0
Categorie H -- daken (psi_0 = 0) = 0
Sneeuw (psi_0 = 0) = 0
Wind (psi_0 = 0) = 0
@end

# 2. Rekenwaarde (6.10)

γ_G,sup = 1.0
γ_Q = 1.3
#hide
ψ_0,2 = categorie_2*1
#show
ψ_0,2', tabel NB.2 – A1.1'
E_d = γ_G,sup*G_ksup + γ_Q*Q_k1 + γ_Q*ψ_0,2*Q_k2 to kN
`;

// ---------------------------------------------------------------------------
// 8. Rekenwaarde belasting en weerstand -- EN 1990 $6.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.3 -- Rekenwaarden van belastingen en weerstand */
export const en1990Rekenwaarden = `"Rekenwaarden en toetsing — NEN-EN 1990 §6.3 en §6.4.2

E_d = ?*(kN)', rekenwaarde van het belastingseffect'
R_d = ?*(kN)', rekenwaarde van de weerstand'
#if R_d > 0 kN
    UC_max = E_d/R_d
#else
    '<span style="color: red">Vul de weerstand in.</span>
    #hide
    UC_max = 1/0
    #show
#end if
#if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b>: E<sub>d</sub> ≤ R<sub>d</sub></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b>: E<sub>d</sub> > R<sub>d</sub></span>
#end if
`;

// ---------------------------------------------------------------------------
// 9. Referentieperiode aanpassing ($A1.1, formule NB.1)
// ---------------------------------------------------------------------------

/** EN 1990 NB formule NB.1 -- Aanpassing karakteristieke waarde referentieperiode */
export const en1990Referentieperiode = `"Aanpassing referentieperiode — NEN-EN 1990 NB, formule NB.1

@select belastingcategorie "Belastingcategorie (voor psi_0)"
Categorie A -- woon (psi_0 = 0.4) = 0.4
Categorie B -- kantoor (psi_0 = 0.5) = 0.5
Categorie C -- bijeenkomst, overige delen (psi_0 = 0.4) = 0.4
Categorie C -- vluchtroutes en trappen (psi_0 = 0.6) = 0.6
Categorie D -- winkel (psi_0 = 0.4) = 0.4
Categorie E -- opslag (psi_0 = 1.0) = 1.0
@end

F_t0 = ?*(kN/m^2)', gelijkmatig verdeelde veranderlijke belasting bij 50 jaar'
#hide
ψ_0 = belastingcategorie*1
#show
ψ_0', tabel NB.2 – A1.1'
t = max(DesignLife; 15)', ontwerplevensduur in jaren uit de projectgegevens, ten minste 15 (tabel NB.1 – 2.1 en 4.1.2(7a) van de NB)'
t_0 = 50', basisreferentieperiode in jaren'
factor = 1 + (1 - ψ_0)/9*log(t/t_0)', formule NB.1 (A1.1(2))'
F_t = factor*F_t0 to kN/m^2
`;

// ---------------------------------------------------------------------------
// Export bundel
// ---------------------------------------------------------------------------

export const en1990Formules: { id: string; label: string; template: string }[] = [
  {
    id: 'en1990-compleet',
    label: 'EN 1990: Belastingcombinaties compleet',
    template: en1990Compleet,
  },
  {
    id: 'en1990-fundamenteel',
    label: 'EN 1990: UGT Fundamenteel (STR/GEO)',
    template: en1990Fundamenteel,
  },
  {
    id: 'en1990-equ',
    label: 'EN 1990: UGT Statisch evenwicht (EQU)',
    template: en1990EQU,
  },
  {
    id: 'en1990-buitengewoon',
    label: 'EN 1990: UGT Buitengewoon (brand/schok)',
    template: en1990Buitengewoon,
  },
  {
    id: 'en1990-aardbeving',
    label: 'EN 1990: UGT Aardbeving',
    template: en1990Aardbeving,
  },
  {
    id: 'en1990-bgt',
    label: 'EN 1990: BGT combinaties (SLS)',
    template: en1990BGT,
  },
  {
    id: 'en1990-groep-c',
    label: 'EN 1990: Geotechnisch (groep C)',
    template: en1990GroepC,
  },
  {
    id: 'en1990-rekenwaarden',
    label: 'EN 1990: Rekenwaarden en toetsing',
    template: en1990Rekenwaarden,
  },
  {
    id: 'en1990-referentieperiode',
    label: 'EN 1990: Aanpassing referentieperiode',
    template: en1990Referentieperiode,
  },
];
