/**
 * EN 1991 (Eurocode 1) -- Belastingen op constructies
 * Ifc-Calc rekenmodule templates
 *
 * Formules en artikelverwijzingen conform:
 * NEN-EN 1991-1-1:2002+C1:2019+NB:2019 (Volumieke gewichten, eigen gewicht en opgelegde belastingen)
 * NEN-EN 1991-1-3:2003+A1:2019+NB:2019 (Sneeuwbelasting)
 * NEN-EN 1991-1-4:2005+C2:2011+NB:2019+C1:2020 (Windbelasting)
 */

// ---------------------------------------------------------------------------
// 1. Opgelegde belastingen (Imposed loads) -- EN 1991-1-1 Tabel NB.1-6.2
// ---------------------------------------------------------------------------

/** EN 1991-1-1 -- Opgelegde belastingen op vloeren en daken */
export const en1991Gebruiksbelasting = `# Opgelegde Belastingen -- EN 1991-1-1 NB Tabel NB.1-6.2

## Gebruikscategorie

@select gebruikscategorie "Gebruikscategorie (Tabel 6.1 / NB.1-6.2)"
A -- Woonfunctie, gemeenschappelijk (qk=3.0, Qk=3.0) = 1
A -- Woonfunctie, niet-gemeenschappelijk (qk=1.75, Qk=3.0) = 2
A -- Trappen woonfunctie (qk=2.0, Qk=3.0) = 3
A -- Balkons woonfunctie (qk=2.5, Qk=3.0) = 4
B -- Kantoorfunctie (qk=2.5, Qk=3.0) = 5
B -- Omsloten verkeersruimte kantoor (qk=3.0, Qk=3.0) = 6
C1 -- Tafels, stoelen, vrije loop (qk=4.0, Qk=3.0) = 7
C2 -- Vaste zitplaatsen (qk=4.0, Qk=7.0) = 8
C3 -- Vrij van obstakels, expositie (qk=5.0, Qk=7.0) = 9
C4 -- Lichamelijke activiteiten (qk=5.0, Qk=7.0) = 10
C5 -- Grote menigten (qk=5.0, Qk=7.0) = 11
D -- Omsloten verkeersruimte winkel (qk=4.0, Qk=7.0) = 12
D1 -- Kleinhandel, detailhandel (qk=4.0, Qk=7.0) = 13
D2 -- Warenhuizen (qk=4.0, Qk=7.0) = 14
@end

Gelijkmatig verdeelde belasting q_k (NB Tabel NB.1-6.2):

#if gebruikscategorie == 1
q_k = 3.0 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 2
q_k = 1.75 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 3
q_k = 2.0 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 4
q_k = 2.5 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 5
q_k = 2.5 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 6
q_k = 3.0 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 7
q_k = 4.0 kN/m^2
Q_k = 3.0 kN
#end if
#if gebruikscategorie == 8
q_k = 4.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 9
q_k = 5.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 10
q_k = 5.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 11
q_k = 5.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 12
q_k = 4.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 13
q_k = 4.0 kN/m^2
Q_k = 7.0 kN
#end if
#if gebruikscategorie == 14
q_k = 4.0 kN/m^2
Q_k = 7.0 kN
#end if

## Scheidingswandtoeslag (art. 6.3.1.2)

@select scheidingswand "Scheidingswandtoeslag (eigen gewicht wand per m)"
Geen scheidingswand = 0
Wand <= 1.0 kN/m (toeslag 0.5) = 1
Wand 1.0-2.0 kN/m (toeslag 0.8) = 2
Wand 2.0-3.0 kN/m (toeslag 1.2) = 3
@end

#if scheidingswand == 0
q_sw = 0 kN/m^2
#end if
#if scheidingswand == 1
q_sw = 0.5 kN/m^2
#end if
#if scheidingswand == 2
q_sw = 0.8 kN/m^2
#end if
#if scheidingswand == 3
q_sw = 1.2 kN/m^2
#end if

## Dakbelasting klasse H (NB Tabel NB.4-6.10)

@select daktype "Dak: invoer dakhelling voor klasse H"
Geen dakbelasting (categorie A-D) = 0
Dak alpha < 15 graden (qk=1.0) = 1
Dak 15 <= alpha < 20 (qk=4-0.2*alpha) = 2
Dak alpha >= 20 graden (qk=0) = 3
@end

#if daktype == 1
q_dak = 1.0 kN/m^2
Q_dak = 1.5 kN
#end if
#if daktype == 2
alpha_dak = 17 graden
q_dak = 4 - 0.2 * alpha_dak to kN/m^2
Q_dak = 1.5 kN
#end if
#if daktype == 3
q_dak = 0 kN/m^2
Q_dak = 0 kN
#end if

## Resultaat

Totale opgelegde belasting (vloer + scheidingswand):

q_totaal = q_k + q_sw to kN/m^2

Opmerking: reductiefactor alpha_A (formule 6.1) is in de Nederlandse NB
NIET toegestaan voor reductie van q_k.
`;

// ---------------------------------------------------------------------------
// 2. Sneeuwbelasting -- EN 1991-1-3 (NL Nationale Bijlage)
// ---------------------------------------------------------------------------

/** EN 1991-1-3 -- Sneeuwbelasting (Nederland) */
export const en1991Sneeuwbelasting = `# Sneeuwbelasting -- EN 1991-1-3 NB

## Grondsneeuwbelasting (art. 4.1, NB)

Karakteristieke waarde grondsneeuwbelasting voor Nederland:

s_k = 0.7 kN/m^2

Opmerking: voor alle locaties in Nederland geldt dezelfde waarde.
psi_0 = 0.50, psi_1 = 0.20, psi_2 = 0.00 (H <= 1000 m).

## Blootstellings- en warmtecoefficient (art. 5.2)

Blootstellingscoefficient (NB: voor alle locaties in NL):

C_e = 1.0

Warmtecoefficient (NB: voor alle gebouwen in NL):

C_t = 1.0

## Dakhelling en vormcoefficient (Tabel 5.2)

@select dakhelling "Dakhelling alpha"
0 tot 30 graden (mu_1 = 0.8) = 1
30 tot 60 graden = 2
>= 60 graden (mu_1 = 0.0) = 3
@end

#if dakhelling == 1
mu_1 = 0.8
#end if

#if dakhelling == 2
Voer de dakhelling in:

alpha = 40 graden

Sneeuwbelastingsvormcoefficient (lineair, Tabel 5.2):

mu_1 = 0.8 * (60 - alpha) / 30
#end if

#if dakhelling == 3
mu_1 = 0.0
#end if

## Sneeuwbelasting op het dak (formule 5.1)

Sneeuwbelasting (normale ontwerpsituatie):

s = mu_1 * C_e * C_t * s_k to kN/m^2

## Sneeuwophoping (meerzijdig dak, Tabel 5.2)

@select ophoping "Sneeuwophoping (meerzijdig dak)"
Niet van toepassing (enkelvoudig dak) = 0
Meerzijdig dak (mu_2 berekenen) = 1
@end

#if ophoping == 1

@select dakhelling2 "Dakhelling aangrenzend dakvlak"
0 tot 30 graden (mu_2 = 0.8) = 1
30 tot 60 graden = 2
@end

#if dakhelling2 == 1
mu_2 = 0.8
#end if

#if dakhelling2 == 2
alpha_2 = 40 graden
mu_2 = 0.8 * (60 - alpha_2) / 30
#end if

Sneeuwbelasting bij ophoping:

s_2 = mu_2 * C_e * C_t * s_k to kN/m^2
#end if

## Samenvatting

De maatgevende sneeuwbelasting op het dak bedraagt:

s_maatgevend = s to kN/m^2
`;

// ---------------------------------------------------------------------------
// 3. Windbelasting -- EN 1991-1-4 (NL Nationale Bijlage)
// ---------------------------------------------------------------------------

/** EN 1991-1-4 -- Windbelasting (Nederland) */
export const en1991Windbelasting = `# Windbelasting -- EN 1991-1-4 NB

## Windgebied (Tabel NB.1)

@select windgebied "Windgebied Nederland (Tabel NB.1)"
Gebied I -- Kust, Markermeer, IJsselmeer (v_b0 = 29.5) = 1
Gebied II -- Noord-Holland, Groningen, Friesland, Flevoland, Zuid-Holland, Zeeland (v_b0 = 27.0) = 2
Gebied III -- Overig Nederland (v_b0 = 24.5) = 3
@end

Fundamentele waarde basiswindsnelheid (Tabel NB.1):

#if windgebied == 1
v_b0 = 29.5 m/s
#end if
#if windgebied == 2
v_b0 = 27.0 m/s
#end if
#if windgebied == 3
v_b0 = 24.5 m/s
#end if

## Basiswindsnelheid (formule 4.1)

Richtingsfactor (NB: c_dir = 1):

c_dir = 1.0

Seizoenfactor (NB: c_season = 1):

c_season = 1.0

Basiswindsnelheid:

v_b = c_dir * c_season * v_b0 to m/s

## Basisstuwdruk (formule 4.10)

Luchtdichtheid (NB: rho = 1.25 kg/m3):

rho = 1.25 kg/m^3

q_b = 0.5 * rho * v_b^2 / 1000 to kN/m^2

## Terreinruwheid (Tabel NB.3-4.1)

@select terreincategorie "Terreincategorie (Tabel NB.3-4.1)"
Categorie 0 -- Zee of kustgebied (z0=0.005, z_min=1) = 1
Categorie II -- Onbebouwd gebied (z0=0.2, z_min=4) = 2
Categorie III -- Bebouwd gebied (z0=0.5, z_min=7) = 3
@end

Terreinparameters:

#if terreincategorie == 1
z_0 = 0.005 m
z_min = 1 m
#end if
#if terreincategorie == 2
z_0 = 0.2 m
z_min = 4 m
#end if
#if terreincategorie == 3
z_0 = 0.5 m
z_min = 7 m
#end if

## Referentiehoogte

Hoogte boven maaiveld:

z = 10 m

z_max = 200 m

Effectieve hoogte (z >= z_min):

z_eff = z to m

#if z < z_min
z_eff = z_min to m
#end if

## Ruwheidsfactor c_r(z) (formule 4.4, 4.5)

Terreinfactor (formule 4.5):

k_r = 0.19 * (z_0 / 0.05)^0.07

Ruwheidsfactor:

c_r = k_r * ln(z_eff / z_0)

## Gemiddelde windsnelheid (formule 4.3)

Orografiefactor (vlak terrein, NB):

c_o = 1.0

v_m = c_r * c_o * v_b to m/s

## Turbulentie-intensiteit (formule 4.7)

Turbulentiefactor (NB: k_l = 1.0):

k_l = 1.0

I_v = k_l / (c_o * ln(z_eff / z_0))

## Extreme stuwdruk q_p(z) (formule 4.8)

q_p = (1 + 7 * I_v) * 0.5 * rho * v_m^2 / 1000 to kN/m^2

## Blootstellingsfactor c_e(z)

c_e = q_p / q_b

## Bouwwerkfactor c_s * c_d (art. 6.1)

@select bouwwerkfactor "Bouwwerkfactor c_s * c_d (art. 6.2)"
Gebouwhoogte < 15 m (cs_cd = 1.0) = 1
Gebouwhoogte < 50 m en h/b < 5 (cs_cd = 1.05) = 2
Bepaald volgens bijlage C = 3
@end

#if bouwwerkfactor == 1
cs_cd = 1.0
#end if
#if bouwwerkfactor == 2
cs_cd = 1.05
#end if
#if bouwwerkfactor == 3
cs_cd = 1.0

Opmerking: bepaal cs_cd volgens bijlage C van de NB.
#end if

## Winddruk op vlakken (art. 5.2)

Uitwendige drukcoefficient (Hoofdstuk 7, afhankelijk van vlakindeling):

@select zone_cpe "Zone uitwendige drukcoefficient c_pe"
Wand: zone D loefzijde (c_pe = +0.8) = 0.8
Wand: zone E lijzijde (c_pe = -0.5) = -0.5
Plat dak: zone F (c_pe = -1.8) = -1.8
Plat dak: zone G (c_pe = -1.2) = -1.2
Plat dak: zone H (c_pe = -0.7) = -0.7
Plat dak: zone I (c_pe = +/-0.2) = -0.2
Handmatige invoer = 0
@end

#if zone_cpe == 0
c_pe = -0.5
#else
c_pe = zone_cpe * 1
#end if

Uitwendige winddruk (formule 5.1):

w_e = q_p * c_pe to kN/m^2

Inwendige drukcoefficient (art. 7.2.9):

c_pi = -0.3

Inwendige winddruk (formule 5.2):

w_i = q_p * c_pi to kN/m^2

## Netto winddruk

Netto winddruk op het vlak (uitwendig - inwendig):

w_net = w_e - w_i to kN/m^2

## Windkracht (formule 5.3)

Referentieoppervlakte:

A_ref = 1.0 m^2

Windkracht per m2:

F_w = cs_cd * q_p * c_pe * A_ref to kN

## Samenvatting

| Parameter | Waarde |
|---|---|
| v_b0 | {{v_b0}} m/s |
| v_b | {{v_b}} m/s |
| q_b | {{q_b}} kN/m2 |
| c_r(z) | {{c_r}} |
| v_m(z) | {{v_m}} m/s |
| I_v(z) | {{I_v}} |
| q_p(z) | {{q_p}} kN/m2 |
| c_e(z) | {{c_e}} |
| w_e | {{w_e}} kN/m2 |
| w_net | {{w_net}} kN/m2 |
`;

// ---------------------------------------------------------------------------
// Export bundel
// ---------------------------------------------------------------------------

export const en1991Formules: { id: string; label: string; template: string }[] = [
  {
    id: 'en1991-gebruiksbelasting',
    label: 'EN 1991-1-1: Opgelegde belastingen (NL)',
    template: en1991Gebruiksbelasting,
  },
  {
    id: 'en1991-sneeuwbelasting',
    label: 'EN 1991-1-3: Sneeuwbelasting (NL)',
    template: en1991Sneeuwbelasting,
  },
  {
    id: 'en1991-windbelasting',
    label: 'EN 1991-1-4: Windbelasting (NL)',
    template: en1991Windbelasting,
  },
];
