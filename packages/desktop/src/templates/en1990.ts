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
 */

// ---------------------------------------------------------------------------
// 1. Fundamentele belastingcombinatie (STR/GEO) -- EN 1990 $6.4.3.2
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.2 -- Fundamentele combinatie (UGT) voor gebouwen */
export const en1990Fundamenteel = `# Belastingcombinatie UGT -- EN 1990 $6.4.3.2
## Fundamentele combinatie (STR/GEO) -- Bijlage A1, Tabel NB.4-A1.2(B)

In Nederland worden voor STR/GEO de vergelijkingen (6.10a) en (6.10b) gebruikt
(Tabel NB.4 - A1.2(B), groep B). De maatgevende van beide is bepalend.

@select gevolgklasse "Gevolgklasse (CC) -- Bijlage B, Tabel B3"
CC1 -- Lage gevolgen (K_FI = 0.9) = 1
CC2 -- Middelmatige gevolgen (K_FI = 1.0) = 2
CC3 -- Grote gevolgen (K_FI = 1.1) = 3
@end

### Partiele factoren (Tabel NB.4 en NB.5)

Factor K_FI (tabel B3):

#if gevolgklasse == 1
K_FI = 0.9
#end if
#if gevolgklasse == 2
K_FI = 1.0
#end if
#if gevolgklasse == 3
K_FI = 1.1
#end if

@select belastingcategorie "Belastingcategorie veranderlijke belasting"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes = 3
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

### Psi-factoren (Tabel NB.2 - A1.1)

#if belastingcategorie == 1
psi_0 = 0.4
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 2
psi_0 = 0.5
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 3
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 4
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 5
psi_0 = 1.0
psi_1 = 0.9
psi_2 = 0.8
#end if
#if belastingcategorie == 6
psi_0 = 0.7
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 7
psi_0 = 0.7
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 8
psi_0 = 0
psi_1 = 0
psi_2 = 0
#end if
#if belastingcategorie == 9
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if
#if belastingcategorie == 10
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if

Partiele factoren voor CC2 (Tabel NB.4 - A1.2(B)):

gamma_Gsup_610a = 1.35
gamma_Ginf = 0.9
gamma_Gsup_610b = 1.2
xi = 0.89
gamma_Q = 1.5

Gecorrigeerde factoren voor de gekozen gevolgklasse:

#if gevolgklasse == 1
gamma_Gsup_610a_CC = 1.2
gamma_Gsup_610b_CC = 1.1
gamma_Q_CC = 1.35
#end if
#if gevolgklasse == 2
gamma_Gsup_610a_CC = 1.35
gamma_Gsup_610b_CC = 1.2
gamma_Q_CC = 1.5
#end if
#if gevolgklasse == 3
gamma_Gsup_610a_CC = 1.5
gamma_Gsup_610b_CC = 1.3
gamma_Q_CC = 1.65
#end if

### Invoer belastingen (karakteristieke waarden)

Blijvende belasting (ongunstig):

G_ksup = 10.0 kN

Blijvende belasting (gunstig, indien verschillend):

G_kinf = 10.0 kN

Overheersende veranderlijke belasting:

Q_k1 = 5.0 kN

Gelijktijdig optredende veranderlijke belasting:

Q_k2 = 2.0 kN

Psi_0 factor voor Q_k2 (handmatig aanpasbaar):

psi_0_2 = 0.0

---

### Vergelijking 6.10a -- alle gamma op G, Q met psi_0

Vgl. (6.10a): gamma_G,sup * G_k,sup "+" gamma_Q * psi_0 * Q_k,1 "+" gamma_Q * psi_0,i * Q_k,i

E_d_610a = gamma_Gsup_610a_CC * G_ksup + gamma_Q_CC * psi_0 * Q_k1 + gamma_Q_CC * psi_0_2 * Q_k2 to kN

### Vergelijking 6.10b -- gereduceerde G, volle Q

Vgl. (6.10b): xi * gamma_G,sup * G_k,sup "+" gamma_Q * Q_k,1 "+" gamma_Q * psi_0,i * Q_k,i

E_d_610b = gamma_Gsup_610b_CC * G_ksup + gamma_Q_CC * Q_k1 + gamma_Q_CC * psi_0_2 * Q_k2 to kN

---

### Maatgevende combinatie

#if E_d_610a > E_d_610b
Vergelijking 6.10a is maatgevend.

E_d = E_d_610a to kN
#else
Vergelijking 6.10b is maatgevend.

E_d = E_d_610b to kN
#end if

Rekenwaarde belastingseffect E_d = {{E_d}} kN.
`;

// ---------------------------------------------------------------------------
// 2. EQU combinatie -- EN 1990 $6.4.2, Tabel NB.3-A1.2(A)
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.2 -- Statisch evenwicht (EQU) */
export const en1990EQU = `# Toetsing Statisch Evenwicht (EQU) -- EN 1990 $6.4.2
## Tabel NB.3 - A1.2(A) -- Groep A

Controle of het destabiliserend belastingseffect niet groter is dan
het stabiliserend belastingseffect (formule 6.7):

  E_d,dst <= E_d,stb

@select gevolgklasse "Gevolgklasse (CC)"
CC1 -- Lage gevolgen = 1
CC2 -- Middelmatige gevolgen = 2
CC3 -- Grote gevolgen = 3
@end

### Partiele factoren EQU (Tabel NB.3 - A1.2(A))

Opmerking: waarden voor CC2 uit Tabel NB.3. Voor CC1 en CC3 zie
Tabel NB.5 / Tabel B3.

gamma_Gsup = 1.1
gamma_Ginf = 0.9
gamma_Q = 1.5

### Invoer belastingen (karakteristieke waarden)

Destabiliserende blijvende belasting:

G_k_dst = 5.0 kN

Stabiliserende blijvende belasting:

G_k_stb = 8.0 kN

@select belastingcategorie "Belastingcategorie"
Categorie A -- woon- en verblijfsruimtes (psi_0 = 0.4) = 0.4
Categorie B -- kantoorruimtes (psi_0 = 0.5) = 0.5
Categorie C -- bijeenkomstruimtes (psi_0 = 0.4) = 0.4
Categorie D -- winkelruimtes (psi_0 = 0.4) = 0.4
Categorie E -- opslagruimtes (psi_0 = 1.0) = 1.0
Sneeuwbelasting (psi_0 = 0) = 0
Windbelasting (psi_0 = 0) = 0
@end

psi_0 = belastingcategorie * 1

Destabiliserende veranderlijke belasting (overheersend):

Q_k1_dst = 3.0 kN

Overige gelijktijdige veranderlijke belasting:

Q_ki_dst = 0.0 kN

psi_0_i = 0.0

### Destabiliserend effect (formule 6.7, linkerlid)

E_d_dst = gamma_Gsup * G_k_dst + gamma_Q * Q_k1_dst + gamma_Q * psi_0_i * Q_ki_dst to kN

### Stabiliserend effect (formule 6.7, rechterlid)

E_d_stb = gamma_Ginf * G_k_stb to kN

---

### Toetsing (formule 6.7): E_d,dst <= E_d,stb

UC_equ = E_d_dst / E_d_stb

#if UC_equ < 1
  Statisch evenwicht voldoet (UC = {{UC_equ}}).
#else
  Statisch evenwicht voldoet NIET (UC = {{UC_equ}})!
#end if
`;

// ---------------------------------------------------------------------------
// 3. Buitengewone combinatie -- EN 1990 $6.4.3.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.3 -- Buitengewone ontwerpsituatie (UGT) */
export const en1990Buitengewoon = `# Belastingcombinatie UGT -- EN 1990 $6.4.3.3
## Buitengewone ontwerpsituatie -- Tabel NB.10 - A1.3

Formule (6.11a/b):

  G_k,j "+" P "+" A_d "+" (psi_1,1 of psi_2,1) * Q_k,1 "+" SOM(psi_2,i * Q_k,i)

Alle partiele belastingsfactoren gamma = 1,0.

@select type_buitengewoon "Type buitengewone situatie"
Brand -- psi_1,1 * Q_k,1 (wind in combinatie met brand) = 1
Schok/ontploffing -- psi_2,1 * Q_k,1 = 2
Overige buitengewoon -- psi_1,1 * Q_k,1 = 3
@end

@select belastingcategorie "Belastingcategorie overheersende veranderlijke belasting"
Categorie A -- woon (psi_1=0.5, psi_2=0.3) = 1
Categorie B -- kantoor (psi_1=0.5, psi_2=0.3) = 2
Categorie C -- bijeenkomst (psi_1=0.7, psi_2=0.6) = 3
Categorie D -- winkel (psi_1=0.7, psi_2=0.6) = 4
Categorie E -- opslag (psi_1=0.9, psi_2=0.8) = 5
Sneeuw (psi_1=0.2, psi_2=0) = 6
Wind (psi_1=0.2, psi_2=0) = 7
@end

#if belastingcategorie == 1
psi_1_1 = 0.5
psi_2_1 = 0.3
#end if
#if belastingcategorie == 2
psi_1_1 = 0.5
psi_2_1 = 0.3
#end if
#if belastingcategorie == 3
psi_1_1 = 0.7
psi_2_1 = 0.6
#end if
#if belastingcategorie == 4
psi_1_1 = 0.7
psi_2_1 = 0.6
#end if
#if belastingcategorie == 5
psi_1_1 = 0.9
psi_2_1 = 0.8
#end if
#if belastingcategorie == 6
psi_1_1 = 0.2
psi_2_1 = 0
#end if
#if belastingcategorie == 7
psi_1_1 = 0.2
psi_2_1 = 0
#end if

### Invoer belastingen

Blijvende belasting (karakteristiek):

G_k = 10.0 kN

Buitengewone belasting (rekenwaarde):

A_d = 20.0 kN

Overheersende veranderlijke belasting (karakteristiek):

Q_k1 = 5.0 kN

Gelijktijdig optredende veranderlijke belasting:

Q_k2 = 2.0 kN

psi_2_2 = 0.3

### Rekenwaarde belastingseffect (formule 6.11b)

#if type_buitengewoon == 2
Combinatiefactor Q_k,1: psi_2,1 (schok/ontploffing).

E_d = 1.0 * G_k + 1.0 * A_d + psi_2_1 * Q_k1 + psi_2_2 * Q_k2 to kN
#else
Combinatiefactor Q_k,1: psi_1,1 (brand of overig).

E_d = 1.0 * G_k + 1.0 * A_d + psi_1_1 * Q_k1 + psi_2_2 * Q_k2 to kN
#end if

Rekenwaarde belastingseffect E_d = {{E_d}} kN.
`;

// ---------------------------------------------------------------------------
// 4. Aardbevingscombinatie -- EN 1990 $6.4.3.4
// ---------------------------------------------------------------------------

/** EN 1990 $6.4.3.4 -- Aardbevingsontwerpsituatie (UGT) */
export const en1990Aardbeving = `# Belastingcombinatie UGT -- EN 1990 $6.4.3.4
## Aardbevingsontwerpsituatie -- Tabel NB.10 - A1.3

Formule (6.12a/b):

  G_k,j "+" P "+" A_Ed "+" SOM(psi_2,i * Q_k,i)

Alle partiele belastingsfactoren gamma = 1,0.
Alle veranderlijke belastingen met psi_2.

A_Ed = aardbevingsbelasting (rekenwaarde), bepaald conform EN 1998.

@select belastingcategorie "Belastingcategorie veranderlijke belasting"
Categorie A -- woon (psi_2 = 0.3) = 0.3
Categorie B -- kantoor (psi_2 = 0.3) = 0.3
Categorie C -- bijeenkomst (psi_2 = 0.6) = 0.6
Categorie D -- winkel (psi_2 = 0.6) = 0.6
Categorie E -- opslag (psi_2 = 0.8) = 0.8
Sneeuw (psi_2 = 0) = 0
Wind (psi_2 = 0) = 0
@end

psi_2_1 = belastingcategorie * 1

### Invoer belastingen

Blijvende belasting (karakteristiek):

G_k = 10.0 kN

Aardbevingsbelasting (rekenwaarde):

A_Ed = 15.0 kN

Veranderlijke belasting 1 (karakteristiek):

Q_k1 = 5.0 kN

Veranderlijke belasting 2 (karakteristiek):

Q_k2 = 2.0 kN

psi_2_2 = 0.3

### Rekenwaarde belastingseffect (formule 6.12b)

E_d = 1.0 * G_k + 1.0 * A_Ed + psi_2_1 * Q_k1 + psi_2_2 * Q_k2 to kN

Rekenwaarde belastingseffect E_d = {{E_d}} kN.
`;

// ---------------------------------------------------------------------------
// 5. Bruikbaarheidsgrenstoestanden (BGT) -- EN 1990 $6.5.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.5.3 -- Bruikbaarheidsgrenstoestanden (BGT/SLS) */
export const en1990BGT = `# Belastingcombinaties BGT -- EN 1990 $6.5.3
## Bruikbaarheidsgrenstoestanden -- Tabel A1.4

Drie combinaties voor BGT:
- Karakteristieke combinatie (6.14b): onomkeerbare grenstoestanden
- Frequente combinatie (6.15b): omkeerbare grenstoestanden
- Quasi-blijvende combinatie (6.16b): langetermijneffecten

@select belastingcategorie "Belastingcategorie overheersende veranderlijke belasting"
Categorie A -- woon (psi_0=0.4, psi_1=0.5, psi_2=0.3) = 1
Categorie B -- kantoor (psi_0=0.5, psi_1=0.5, psi_2=0.3) = 2
Categorie C -- bijeenkomst (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 3
Categorie D -- winkel (psi_0=0.4, psi_1=0.7, psi_2=0.6) = 4
Categorie E -- opslag (psi_0=1.0, psi_1=0.9, psi_2=0.8) = 5
Categorie F -- verkeer <= 25 kN (psi_0=0.7, psi_1=0.7, psi_2=0.6) = 6
Categorie G -- verkeer 25-160 kN (psi_0=0.7, psi_1=0.5, psi_2=0.3) = 7
Categorie H -- daken (psi_0=0, psi_1=0, psi_2=0) = 8
Sneeuw (psi_0=0, psi_1=0.2, psi_2=0) = 9
Wind (psi_0=0, psi_1=0.2, psi_2=0) = 10
@end

### Psi-factoren (Tabel NB.2 - A1.1)

#if belastingcategorie == 1
psi_0 = 0.4
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 2
psi_0 = 0.5
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 3
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 4
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 5
psi_0 = 1.0
psi_1 = 0.9
psi_2 = 0.8
#end if
#if belastingcategorie == 6
psi_0 = 0.7
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 7
psi_0 = 0.7
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 8
psi_0 = 0
psi_1 = 0
psi_2 = 0
#end if
#if belastingcategorie == 9
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if
#if belastingcategorie == 10
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if

### Invoer belastingen (karakteristieke waarden)

Blijvende belasting:

G_k = 10.0 kN

Overheersende veranderlijke belasting:

Q_k1 = 5.0 kN

Gelijktijdige veranderlijke belasting:

Q_k2 = 2.0 kN

psi_0_2 = 0.0
psi_2_2 = 0.0

---

### a) Karakteristieke combinatie (formule 6.14b)

G_k,j "+" Q_k,1 "+" SOM(psi_0,i * Q_k,i)

Gebruikt voor onomkeerbare grenstoestanden.

E_kar = G_k + Q_k1 + psi_0_2 * Q_k2 to kN

### b) Frequente combinatie (formule 6.15b)

G_k,j "+" psi_1,1 * Q_k,1 "+" SOM(psi_2,i * Q_k,i)

Gebruikt voor omkeerbare grenstoestanden.

E_freq = G_k + psi_1 * Q_k1 + psi_2_2 * Q_k2 to kN

### c) Quasi-blijvende combinatie (formule 6.16b)

G_k,j "+" SOM(psi_2,i * Q_k,i)

Gebruikt voor langetermijneffecten en uiterlijk.

E_qp = G_k + psi_2 * Q_k1 + psi_2_2 * Q_k2 to kN

---

### Overzicht BGT combinaties

| Combinatie | Formule | E_d |
|---|---|---|
| Karakteristiek (6.14b) | G + Q_k,1 + psi_0 * Q_k,i | {{E_kar}} kN |
| Frequent (6.15b) | G + psi_1 * Q_k,1 + psi_2 * Q_k,i | {{E_freq}} kN |
| Quasi-blijvend (6.16b) | G + psi_2 * Q_k,1 + psi_2 * Q_k,i | {{E_qp}} kN |
`;

// ---------------------------------------------------------------------------
// 6. Volledige belastingcombinatie -- alle UGT en BGT
// ---------------------------------------------------------------------------

/** EN 1990 -- Volledige belastingcombinatie gebouwen */
export const en1990Compleet = `# Belastingcombinaties -- NEN-EN 1990+NB:2019
## Volledig overzicht UGT en BGT voor gebouwen

@select gevolgklasse "Gevolgklasse (CC) -- Bijlage B, Tabel B3"
CC1 -- Lage gevolgen (K_FI = 0.9) = 1
CC2 -- Middelmatige gevolgen (K_FI = 1.0) = 2
CC3 -- Grote gevolgen (K_FI = 1.1) = 3
@end

@select belastingcategorie "Belastingcategorie overheersende veranderlijke belasting"
Categorie A -- woon- en verblijfsruimtes = 1
Categorie B -- kantoorruimtes = 2
Categorie C -- bijeenkomstruimtes = 3
Categorie D -- winkelruimtes = 4
Categorie E -- opslagruimtes = 5
Categorie F -- verkeersruimte, voertuig <= 25 kN = 6
Categorie G -- verkeersruimte, 25 < voertuig <= 160 kN = 7
Categorie H -- daken = 8
Sneeuwbelasting = 9
Windbelasting = 10
@end

### Psi-factoren (Tabel NB.2 - A1.1)

#if belastingcategorie == 1
psi_0 = 0.4
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 2
psi_0 = 0.5
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 3
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 4
psi_0 = 0.4
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 5
psi_0 = 1.0
psi_1 = 0.9
psi_2 = 0.8
#end if
#if belastingcategorie == 6
psi_0 = 0.7
psi_1 = 0.7
psi_2 = 0.6
#end if
#if belastingcategorie == 7
psi_0 = 0.7
psi_1 = 0.5
psi_2 = 0.3
#end if
#if belastingcategorie == 8
psi_0 = 0
psi_1 = 0
psi_2 = 0
#end if
#if belastingcategorie == 9
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if
#if belastingcategorie == 10
psi_0 = 0
psi_1 = 0.2
psi_2 = 0
#end if

### Partiele factoren STR/GEO (Tabel NB.4 en NB.5)

#if gevolgklasse == 1
gamma_Gsup_a = 1.2
gamma_Gsup_b = 1.1
gamma_Q_CC = 1.35
K_FI = 0.9
#end if
#if gevolgklasse == 2
gamma_Gsup_a = 1.35
gamma_Gsup_b = 1.2
gamma_Q_CC = 1.5
K_FI = 1.0
#end if
#if gevolgklasse == 3
gamma_Gsup_a = 1.5
gamma_Gsup_b = 1.3
gamma_Q_CC = 1.65
K_FI = 1.1
#end if

gamma_Ginf = 0.9

### Invoer belastingen (karakteristieke waarden)

Blijvende belasting (ongunstig):

G_ksup = 10.0 kN

Overheersende veranderlijke belasting:

Q_k1 = 5.0 kN

Gelijktijdige veranderlijke belasting 2:

Q_k2 = 2.0 kN

psi_0_2 = 0.0
psi_2_2 = 0.0

---

## 1. UGT -- Fundamentele combinatie STR/GEO ($6.4.3.2)

### Vergelijking 6.10a

E_610a = gamma_Gsup_a * G_ksup + gamma_Q_CC * psi_0 * Q_k1 + gamma_Q_CC * psi_0_2 * Q_k2 to kN

### Vergelijking 6.10b

E_610b = gamma_Gsup_b * G_ksup + gamma_Q_CC * Q_k1 + gamma_Q_CC * psi_0_2 * Q_k2 to kN

### Maatgevende UGT-fundamenteel

#if E_610a > E_610b
Vgl. 6.10a is maatgevend.

E_UGT = E_610a to kN
#else
Vgl. 6.10b is maatgevend.

E_UGT = E_610b to kN
#end if

---

## 2. BGT -- Bruikbaarheidsgrenstoestanden ($6.5.3)

### a) Karakteristieke combinatie (6.14b)

E_kar = G_ksup + Q_k1 + psi_0_2 * Q_k2 to kN

### b) Frequente combinatie (6.15b)

E_freq = G_ksup + psi_1 * Q_k1 + psi_2_2 * Q_k2 to kN

### c) Quasi-blijvende combinatie (6.16b)

E_qp = G_ksup + psi_2 * Q_k1 + psi_2_2 * Q_k2 to kN

---

## Samenvatting

| Combinatie | Ref. | E_d |
|---|---|---|
| UGT fundamenteel (6.10a) | $6.4.3.2 | {{E_610a}} kN |
| UGT fundamenteel (6.10b) | $6.4.3.2 | {{E_610b}} kN |
| **UGT maatgevend** | | **{{E_UGT}} kN** |
| BGT karakteristiek | (6.14b) | {{E_kar}} kN |
| BGT frequent | (6.15b) | {{E_freq}} kN |
| BGT quasi-blijvend | (6.16b) | {{E_qp}} kN |

---

## Tabel psi-factoren (Tabel NB.2 - A1.1)

| Belasting | psi_0 | psi_1 | psi_2 |
|---|---|---|---|
| Cat. A woon | 0,4 | 0,5 | 0,3 |
| Cat. B kantoor | 0,5 | 0,5 | 0,3 |
| Cat. C bijeenkomst | 0,4/0,6 | 0,7 | 0,6 |
| Cat. D winkel | 0,4 | 0,7 | 0,6 |
| Cat. E opslag | 1,0 | 0,9 | 0,8 |
| Cat. F verkeer <= 25kN | 0,7 | 0,7 | 0,6 |
| Cat. G verkeer 25-160kN | 0,7 | 0,5 | 0,3 |
| Cat. H daken | 0 | 0 | 0 |
| Sneeuw | 0 | 0,2 | 0 |
| Wind | 0 | 0,2 | 0 |
| Temperatuur | 0 | 0,5 | 0 |

## Tabel partiele factoren STR/GEO (Tabel NB.4 en NB.5)

| CC | Vgl. | gamma_G,sup | gamma_G,inf | gamma_Q |
|---|---|---|---|---|
| CC1 | 6.10a | 1,2 | 0,9 | 1,35 |
| CC1 | 6.10b | 1,1 | 0,9 | 1,35 |
| CC2 | 6.10a | 1,35 | 0,9 | 1,5 |
| CC2 | 6.10b | 1,2 | 0,9 | 1,5 |
| CC3 | 6.10a | 1,5 | 0,9 | 1,65 |
| CC3 | 6.10b | 1,3 | 0,9 | 1,65 |
`;

// ---------------------------------------------------------------------------
// 7. Geotechnische combinatie (STR/GEO groep C) -- Tabel NB.6-A1.2(C)
// ---------------------------------------------------------------------------

/** EN 1990 Tabel NB.6-A1.2(C) -- Geotechnische belastingen (groep C) */
export const en1990GroepC = `# Belastingcombinatie UGT -- EN 1990 Tabel NB.6 - A1.2(C)
## STR/GEO groep C -- Geotechnische belastingen

Groep C wordt gebruikt voor geotechnische belastingen bij:
- algemene stabiliteit van de fundering
- taludstabiliteit
- damwandberekening

Vergelijking (6.10) met gereduceerde partiele factoren.

@select gevolgklasse "Gevolgklasse (CC)"
CC1 -- Lage gevolgen = 1
CC2 -- Middelmatige gevolgen = 2
CC3 -- Grote gevolgen = 3
@end

### Partiele factoren groep C (Tabel NB.6 - A1.2(C))

gamma_Gsup = 1.0
gamma_Ginf = 1.0
gamma_Q = 1.3

### Invoer belastingen (karakteristieke waarden)

Blijvende belasting (ongunstig):

G_ksup = 10.0 kN

Overheersende veranderlijke belasting:

Q_k1 = 5.0 kN

Gelijktijdige veranderlijke belasting:

Q_k2 = 0.0 kN

psi_0_2 = 0.0

### Rekenwaarde (formule 6.10)

E_d = gamma_Gsup * G_ksup + gamma_Q * Q_k1 + gamma_Q * psi_0_2 * Q_k2 to kN

Rekenwaarde belastingseffect E_d = {{E_d}} kN.
`;

// ---------------------------------------------------------------------------
// 8. Rekenwaarde belasting en weerstand -- EN 1990 $6.3
// ---------------------------------------------------------------------------

/** EN 1990 $6.3 -- Rekenwaarden van belastingen en weerstand */
export const en1990Rekenwaarden = `# Rekenwaarden -- EN 1990 $6.3
## Rekenwaarden van belastingen, effecten en weerstand

### Rekenwaarde van een belasting ($6.3.1, formule 6.1a)

F_d = gamma_f * F_rep

met:

F_rep = psi * F_k  (formule 6.1b)

waarbij psi = 1,00 of psi_0, psi_1 of psi_2.

### Rekenwaarde van belastingseffecten ($6.3.2, formule 6.2)

E_d = gamma_Sd * E{ gamma_f,i * F_rep,i ; a_d }

Vereenvoudigd (formule 6.2a):

E_d = E{ gamma_F,i * F_rep,i ; a_d }

met gamma_F,i = gamma_Sd * gamma_f,i  (formule 6.2b)

### Rekenwaarde materiaal-/producteigenschap ($6.3.3, formule 6.3)

X_d = eta * X_k / gamma_m

waarbij:
- X_k = karakteristieke waarde
- eta = omrekeningsfactor
- gamma_m = partiele materiaalfactor

### Rekenwaarde van de weerstand ($6.3.5, formule 6.6a)

R_d = R{ eta_i * X_k,i / gamma_M,i ; a_d }

Vereenvoudigd (formule 6.6c):

R_d = R_k / gamma_M

### Toetsingsvoorwaarde ($6.4.2-6.4.3)

STR/GEO (formule 6.8):

  E_d <= R_d

EQU (formule 6.7):

  E_d,dst <= E_d,stb

BGT (formule 6.13):

  E_d <= C_d

---

### Invoer voor toetsing

Rekenwaarde belastingseffect:

E_d = 100 kN

Rekenwaarde weerstand:

R_d = 120 kN

### Toetsing (formule 6.8)

UC = E_d / R_d

#if UC < 1
  Toetsing voldoet: E_d <= R_d (UC = {{UC}}).
#else
  Toetsing voldoet NIET: E_d > R_d (UC = {{UC}})!
#end if
`;

// ---------------------------------------------------------------------------
// 9. Referentieperiode aanpassing ($A1.1, formule NB.1)
// ---------------------------------------------------------------------------

/** EN 1990 NB formule NB.1 -- Aanpassing karakteristieke waarde referentieperiode */
export const en1990Referentieperiode = `# Aanpassing referentieperiode -- EN 1990 NB, formule NB.1
## Aanpassen karakteristieke waarde veranderlijke belasting

Indien de ontwerplevensduur afwijkt van 50 jaar, moet de karakteristieke
waarde van gelijkmatig verdeelde veranderlijke belastingen worden aangepast
(NEN-EN 1990 NB, art. A1.1(2)).

Formule NB.1:

  F_t = F_t0 * { 1 + (1 - psi_0) / 9 * ln(t / t_0) }

@select ontwerplevensduurklasse "Ontwerplevensduurklasse (Tabel NB.1 - 2.1)"
Klasse 1 -- 5 jaar (tijdelijk) = 5
Klasse 2 -- 15 jaar (landbouw) = 15
Klasse 3 -- 50 jaar (gebouwen) = 50
Klasse 4 -- 100 jaar (monumentaal) = 100
@end

@select belastingcategorie "Belastingcategorie (voor psi_0)"
Categorie A -- woon (psi_0 = 0.4) = 0.4
Categorie B -- kantoor (psi_0 = 0.5) = 0.5
Categorie C -- bijeenkomst (psi_0 = 0.4) = 0.4
Categorie D -- winkel (psi_0 = 0.4) = 0.4
Categorie E -- opslag (psi_0 = 1.0) = 1.0
@end

psi_0 = belastingcategorie * 1

Referentieperiode bij de gekozen ontwerplevensduur:

t = ontwerplevensduurklasse * 1 jaar

Basisreferentieperiode (standaard):

t_0 = 50 jaar

Karakteristieke waarde bij basisreferentieperiode:

F_t0 = 5.0 kN/m^2

### Aangepaste karakteristieke waarde (formule NB.1)

F_t = F_t0 * (1 + (1 - psi_0) / 9 * ln(t / t_0)) to kN/m^2

Omrekeningsfactor:

factor = F_t / F_t0

#if t == 50
  Referentieperiode is 50 jaar: geen aanpassing nodig (factor = 1,0).
#end if

#if t < 50
  De referentieperiode is korter dan 50 jaar: de belasting wordt verlaagd.
#end if

#if t > 50
  De referentieperiode is langer dan 50 jaar: de belasting wordt verhoogd.
#end if
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
