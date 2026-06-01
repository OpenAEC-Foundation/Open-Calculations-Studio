/**
 * Voorblad (cover page) — eerste sheet van een project. Toont het project-
 * nummer + naam + opdrachtgever + datum + revisie, plus ruimte voor scope-
 * notities.
 */

export const voorblad = `"Voorblad

#hide
project_nummer = "0000"
project_naam = "Nieuw project"
locatie = "—"
opdrachtgever = "—"
constructeur = "—"
datum = "—"
revisie = "0"
status_doc = "concept"
#show

'<div style="text-align:center; padding:40px 20px 60px; border-bottom:3px solid #D97706; margin-bottom:30px;">
'  <div style="font-size:13px; color:#888; letter-spacing:3px; text-transform:uppercase; margin-bottom:8px;">Constructief advies</div>
'  <h1 style="font-size:38px; margin:0 0 12px; color:#1E40AF;">'project_naam'</h1>
'  <div style="font-size:16px; color:#525252;">Projectnummer 'project_nummer' &middot; 'locatie'</div>
'</div>'

'<table style="width:100%; margin:0 auto; max-width:600px; border-collapse:collapse; font-size:14px;">
'<tr><td style="padding:10px 12px; border-bottom:1px solid #ddd; color:#888;">Opdrachtgever</td><td style="padding:10px 12px; border-bottom:1px solid #ddd; font-weight:600;">'opdrachtgever'</td></tr>
'<tr><td style="padding:10px 12px; border-bottom:1px solid #ddd; color:#888;">Constructeur</td><td style="padding:10px 12px; border-bottom:1px solid #ddd; font-weight:600;">'constructeur'</td></tr>
'<tr><td style="padding:10px 12px; border-bottom:1px solid #ddd; color:#888;">Datum</td><td style="padding:10px 12px; border-bottom:1px solid #ddd; font-weight:600;">'datum'</td></tr>
'<tr><td style="padding:10px 12px; border-bottom:1px solid #ddd; color:#888;">Revisie</td><td style="padding:10px 12px; border-bottom:1px solid #ddd; font-weight:600;">'revisie'</td></tr>
'<tr><td style="padding:10px 12px; border-bottom:1px solid #ddd; color:#888;">Status</td><td style="padding:10px 12px; border-bottom:1px solid #ddd; font-weight:600;">'status_doc'</td></tr>
'</table>

'<div style="margin-top:50px; padding:20px; background:#F8FAFC; border-left:4px solid #D97706; border-radius:0 8px 8px 0;">
'  <h3 style="margin:0 0 8px; color:#525252;">Scope &amp; uitgangspunten</h3>
'  <p style="margin:0; color:#525252; line-height:1.6;">Korte beschrijving van de scope, het besproken bouwdeel, en de uitgangspunten die in de berekening zijn aangenomen.</p>
'</div>

'<div style="margin-top:80px; text-align:center; color:#888; font-size:11px;">Onderdeel van het OpenAEC Calculations Studio document — 'project_nummer'</div>
`;
