/**
 * Project metadata sheet — vult de Eurocode-uitgangspunten in die door alle
 * berekeningen binnen het project gebruikt worden. Gevolgklasse, wind-,
 * sneeuwgebied, ontwerplevensduur etc. komen voort uit NEN-EN 1990 + NB.
 */

export const projectMetadata = `"Project metadata
'<i>Vul hieronder de algemene projectgegevens en Eurocode-uitgangspunten in. Deze
'waarden worden in alle berekeningen binnen dit project gebruikt.</i>

'<h2>1. Projectgegevens</h2>

#hide
project_nummer = 0
project_naam = "Nieuw project"
opdrachtgever = "Onbekend"
constructeur = "Onbekend"
locatie = "Onbekend"
#show

'<table style="width:100%; border-collapse:collapse;">
'<tr><td style="width:35%; padding:4px;"><b>Projectnummer</b></td><td>'project_nummer'</td></tr>
'<tr><td style="padding:4px;"><b>Projectnaam</b></td><td>'project_naam'</td></tr>
'<tr><td style="padding:4px;"><b>Opdrachtgever</b></td><td>'opdrachtgever'</td></tr>
'<tr><td style="padding:4px;"><b>Constructeur</b></td><td>'constructeur'</td></tr>
'<tr><td style="padding:4px;"><b>Locatie</b></td><td>'locatie'</td></tr>
'</table>

'<h2>2. Constructieve uitgangspunten (NEN-EN 1990 + NB)</h2>

@select CC "Gevolgklasse"
  CC1 — beperkte gevolgen = 1
  CC2 — middelmatige gevolgen = 2
  CC3 — grote gevolgen = 3
@end

@select RC "Betrouwbaarheidsklasse"
  RC1 = 1
  RC2 = 2
  RC3 = 3
@end

@select DesignLife "Ontwerplevensduur"
  10 jaar (tijdelijk) = 10
  25 jaar = 25
  50 jaar (standaard) = 50
  100 jaar (monumenten/infra) = 100
@end

'<h3>K<sub>FI</sub> — gevolgklasse factor (Tabel NB.A1.1)</h3>
#if CC ≡ 1
    K_FI = 0.9
#else if CC ≡ 2
    K_FI = 1.0
#else
    K_FI = 1.1
#end if

'K<sub>FI</sub> = 'K_FI

'<h2>3. Klimatologische uitgangspunten (NEN-EN 1991 + NB)</h2>

@select WindGebied "Windgebied (NB)"
  Gebied I (kust) = 1
  Gebied II = 2
  Gebied III (binnenland) = 3
@end

@select Terrein "Terreincategorie"
  0 — open zee = 0
  I — meer/vlakte = 1
  II — open gebied = 2
  III — bebouwd gebied = 3
  IV — stedelijk gebied = 4
@end

@select SneeuwBelasting "Sneeuwbelasting (kN/m²)"
  s_k = 0.56 (NL standaard) = 0.56
  s_k = 0.70 (verhoogd) = 0.70
@end

s_k = SneeuwBelasting kN/m^2
'Karakteristieke sneeuwbelasting: s<sub>k</sub> = 's_k

'<h2>4. Geotechnische uitgangspunten (NEN 9997-1)</h2>

@select GrondType "Grondsoort"
  Zand, vast = 1
  Zand, los = 2
  Klei, stijf = 3
  Klei, slap = 4
  Veen = 5
  Op aanvraag = 6
@end

@select GeoCat "Geotechnische categorie"
  GC1 — eenvoudig = 1
  GC2 — standaard = 2
  GC3 — complex = 3
@end

'<h2>5. Notities</h2>
'<i>Hier kun je vrije notities, scope-afbakeningen en projectspecifieke
'aandachtspunten kwijt.</i>

'<hr/>
'<i>Bij wijziging van bovenstaande uitgangspunten moeten alle gekoppelde
'rekensheets opnieuw worden uitgevoerd om de update mee te nemen.</i>
`;
