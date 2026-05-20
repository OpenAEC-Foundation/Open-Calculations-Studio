import { createEditor } from './editor';
import { updatePreview } from './preview';
import { APP_FILE_EXT } from './branding';
import {
  ec5Buiging,
  ec5Afschuiving,
  ec5Druk,
  ec5DrukLoodrecht,
  ec5Knik,
  ec5Doorbuiging,
  ec5HoutenBalk,
} from './templates/eurocode5';
import {
  vandepitteSchuifspanning,
  vandepitteDoorbuiging,
  vandepitteKnikken,
  vandepitteMohr,
  vandepitteEigenfrequentie,
  vandepitteVirtueleArbeid,
} from './templates/vandepitte';
import {
  en1990Fundamenteel,
  en1990EQU,
  en1990Buitengewoon,
  en1990Aardbeving,
  en1990BGT,
  en1990Compleet,
  en1990GroepC,
  en1990Rekenwaarden,
  en1990Referentieperiode,
} from './templates/en1990';
import {
  en1991Gebruiksbelasting,
  en1991Sneeuwbelasting,
  en1991Windbelasting,
} from './templates/en1991';
import {
  ec3Materiaal,
  ec3Classificatie,
  ec3Trek,
  ec3Druk,
  ec3Buiging,
  ec3Dwarskracht,
  ec3BuigingNormaalkracht,
  ec3Kip,
  ec3Knik,
  ec3Doorbuiging,
  ec3StalenLigger,
} from './templates/en1993';
import {
  en1996Druksterkte,
  en1996Drukwand,
  en1996Afschuiving,
  en1996Slankheid,
} from './templates/en1996';
import {
  en1997Funderingsstrook,
  en1997Paaldraagvermogen,
  en1997Zetting,
  en1997Glijding,
} from './templates/en1997';
import {
  ec2Materiaal,
  ec2Buiging,
  ec2DwarskrachtZonder,
  ec2DwarskrachtMet,
  ec2Pons,
  ec2Scheurwijdte,
  ec2Doorbuiging,
  ec2BetonBalk,
} from './templates/en1992';

const paalExample = `# Projectgegevens

@select gevolgklasse "Constructiegevolgklasse (CC)"
CC1 — Lage gevolgen = 1
CC2 — Middelmatige gevolgen = 2
CC3 — Grote gevolgen = 3
@end

@select ontwerplevensduur "Ontwerplevensduur"
15 jaar (tijdelijke constructie) = 15
50 jaar (standaard) = 50
100 jaar (bijzondere constructie) = 100
@end

Projectnummer: 2558
Projectomschrijving: Woning en bijgebouw Laageind 57 Driebruggen
Onderdeel: Funderingen

# Paaldraagvermogen — NEN 9997-1

## Uitgangspunten

@select paal_type "Type paal"
Houten paal (taps toelopend) = 1
Betonpaal prefab = 2
Stalen buispaal gesloten = 3
@end

@select installatie "Wijze van installeren"
Geheid (grondverdringend) = 1
Geschroefd (grondverdringend) = 2
Geboord = 3
@end

## Paalgeometrie

D_eq = 150 mm
L_paal = 11 m

Paalkopniveau NAP:

z_kop = -1.00 m

Paalpuntniveau NAP:

z_punt = -12.00 m

## Sonderingsgegevens

Upload een GEF-bestand (sondering):

@gef sondering1

Gemiddelde conusweerstanden ter hoogte van de paalpunt (handmatig of uit GEF):

q_cI = 8.00 MPa
q_cII = 8.00 MPa
q_cIII = 7.55 MPa

## Belasting

Normaalkracht (karakteristiek):

N_k = 130 kN

## Factoren — NEN 9997-1

Paalpuntfactor (houten paal, geheid):

alpha_p = 0.70
beta_f = 1.0
s_f = 1.0

Schachtwrijvingsfactor:

alpha_s = 0.012

## Puntdraagvermogen (art. 7.6.2.3)

Paaloppervlak:

A_b = pi / 4 * D_eq^2

Maximale gemiddelde conusweerstand:

q_bmax = 1/2 * alpha_p * beta_f * s_f * ((q_cI + q_cII) / 2 + q_cIII) to MPa

#if q_bmax < 15 MPa
  Conusweerstand q_b,max voldoet (< 15 MPa).
#else
  Conusweerstand begrensd op 15 MPa!
#end if

Puntdraagvermogen:

R_bcal = A_b * q_bmax to kN

## Maximumschachtwrijving (art. 7.6.2.3c)

Schachtwrijvingslengte (exclusief negatieve kleef zone):

delta_L = 7 m

Omtrek van de paal:

O_s = pi * D_eq

Gemiddelde q_c langs de schacht (vereenvoudigd):

q_cschacht = 4 MPa

Schachtdraagvermogen:

R_scal = O_s * alpha_s * q_cschacht * delta_L to kN

## Totaal draagvermogen per sondering

R_ccal = R_bcal + R_scal to kN

## Negatieve kleef (art. 7.3.2.2)

Lengte negatieve kleef zone:

L_nk = 4 m

F_nkrep = 2 kN
gamma_fnk = 1.0
F_nkd = gamma_fnk * F_nkrep to kN

## Netto maatgevend draagvermogen (art. 7.6.2.3)

Aantal sonderingen n = 1 (vereenvoudigd voorbeeld):

xi_3 = 1.28
xi_4 = 1.03

Materiaalfactor:

gamma_m = 1.20

R_ck = R_ccal / xi_3 to kN

R_cd = R_ck / gamma_m to kN

R_cnetd = R_cd - F_nkd to kN

## Unity Check

N_Ed = 130 kN

UC = N_Ed / R_cnetd

#if UC < 1
  Funderingspaal voldoet (UC < 1.0).
#else
  Funderingspaal voldoet NIET!
#end if

## Overzicht

@svg
<svg width="280" height="520" viewBox="0 0 280 520">
  <defs>
    <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
      <polygon points="0 0, 8 8, 4 6" fill="#dc2626"/>
    </marker>
    <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
      <polygon points="0 8, 8 8, 4 0" fill="#059669"/>
    </marker>
    <pattern id="groundHatch" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#a3a3a3" stroke-width="1"/>
    </pattern>
  </defs>
  <!-- Maaiveld -->
  <rect x="0" y="60" width="280" height="6" fill="#8b7355"/>
  <rect x="0" y="66" width="280" height="450" fill="#f5f0e8" opacity="0.3"/>
  <!-- Grondlagen -->
  <rect x="0" y="66" width="90" height="80" fill="#d4c5a0" opacity="0.4"/>
  <text x="45" y="110" text-anchor="middle" font-size="9" fill="#78716c">Veen</text>
  <rect x="0" y="146" width="90" height="100" fill="#c8b87a" opacity="0.4"/>
  <text x="45" y="200" text-anchor="middle" font-size="9" fill="#78716c">Klei</text>
  <rect x="0" y="246" width="90" height="60" fill="#b8a060" opacity="0.4"/>
  <text x="45" y="280" text-anchor="middle" font-size="9" fill="#78716c">Klei zandig</text>
  <rect x="0" y="306" width="90" height="100" fill="#e8d8a0" opacity="0.5"/>
  <text x="45" y="360" text-anchor="middle" font-size="9" fill="#78716c">Zand</text>
  <rect x="0" y="406" width="90" height="110" fill="#f0e0a0" opacity="0.6"/>
  <text x="45" y="465" text-anchor="middle" font-size="9" fill="#78716c">Grind/Zand</text>
  <!-- Paal -->
  <rect x="128" y="80" width="24" height="340" fill="#c8956c" stroke="#8b6914" stroke-width="1.5" rx="2"/>
  <!-- Paalpunt -->
  <polygon points="128,420 152,420 143,440 137,440" fill="#8b6914" stroke="#8b6914" stroke-width="1"/>
  <!-- Belasting pijl naar beneden -->
  <line x1="140" y1="15" x2="140" y2="75" stroke="#dc2626" stroke-width="2.5" marker-end="url(#arrowDown)"/>
  <text x="140" y="12" text-anchor="middle" font-size="12" fill="#dc2626" font-weight="bold">N = {{N_k}} kN</text>
  <!-- Negatieve kleef pijlen (naar beneden langs schacht) -->
  <line x1="118" y1="100" x2="118" y2="210" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4" marker-end="url(#arrowDown)"/>
  <text x="108" y="160" text-anchor="end" font-size="9" fill="#f59e0b">neg. kleef</text>
  <!-- Positieve schachtwrijving pijlen (naar boven) -->
  <line x1="160" y1="350" x2="160" y2="240" stroke="#059669" stroke-width="1.5" marker-end="url(#arrowUp)"/>
  <text x="172" y="300" text-anchor="start" font-size="9" fill="#059669">R_s</text>
  <!-- Puntdraagvermogen pijl (naar boven) -->
  <line x1="140" y1="490" x2="140" y2="450" stroke="#059669" stroke-width="2.5" marker-end="url(#arrowUp)"/>
  <text x="140" y="505" text-anchor="middle" font-size="11" fill="#059669" font-weight="bold">R_b</text>
  <!-- Maatvoeringen -->
  <line x1="220" y1="80" x2="220" y2="440" stroke="#6b7280" stroke-width="0.8" stroke-dasharray="3"/>
  <line x1="215" y1="80" x2="225" y2="80" stroke="#6b7280" stroke-width="1"/>
  <line x1="215" y1="440" x2="225" y2="440" stroke="#6b7280" stroke-width="1"/>
  <text x="235" y="265" text-anchor="start" font-size="10" fill="#6b7280">L = {{L_paal}} m</text>
  <!-- NAP niveaus -->
  <text x="5" y="55" font-size="9" fill="#6b7280">NAP 0.00</text>
  <line x1="0" y1="60" x2="90" y2="60" stroke="#6b7280" stroke-width="0.5" stroke-dasharray="2"/>
  <text x="5" y="78" font-size="9" fill="#6b7280">NAP {{z_kop}}</text>
  <text x="5" y="445" font-size="9" fill="#6b7280">NAP {{z_punt}}</text>
  <!-- D label -->
  <line x1="128" y1="470" x2="152" y2="470" stroke="#374151" stroke-width="0.8"/>
  <text x="140" y="483" text-anchor="middle" font-size="9" fill="#374151">D={{D_eq}} mm</text>
</svg>
@end
`;

const exampleDoc = `# Toetsing Stalen Ligger — IPE 300, S235

## Profielgegevens IPE 300

h_p = 300 mm
b_p = 150 mm
t_w = 7.1 mm
t_f = 10.7 mm
A_p = 5381 mm^2
I_y = 83560000 mm^4
W_pl = 628400 mm^3

## Materiaal — S235

f_y = 235 N/mm^2
gamma_M0 = 1.0
f_yd = f_y / gamma_M0 to N/mm^2
E = 210000 N/mm^2

## Belasting en geometrie

Overspanning en gelijkmatig verdeelde belasting:

L = 6000 mm
q = 20 kN/m

## Krachtwerking

Maatgevend moment (veldmoment bij gelijkmatige belasting):

M_Ed = q*L^2 / 8 to kN*m

Maatgevende dwarskracht (oplegreactie):

V_Ed = q*L / 2 to kN

## Momentcapaciteit (plastisch)

M_Rd = W_pl * f_yd to kN*m

Unity check buiging:

UC_M = M_Ed / M_Rd

#if UC_M < 1
  Buiging voldoet (UC < 1.0).
#else
  Buiging voldoet NIET!
#end if

## Dwarskrachtcapaciteit

Afschuifoppervlak (vereenvoudigd):

A_v = h_p * t_w

V_Rd = A_v * f_yd / sqrt(3) to kN

Unity check dwarskracht:

UC_V = V_Ed / V_Rd

#if UC_V < 1
  Dwarskracht voldoet (UC < 1.0).
#else
  Dwarskracht voldoet NIET!
#end if

## Doorbuigingscontrole

Toelaatbare doorbuiging (L/250):

delta_max = L / 250 to mm

Optredende doorbuiging (5qL4/384EI):

delta = 5*q*L^4 / (384*E*I_y) to mm

Unity check doorbuiging:

UC_d = delta / delta_max

#if UC_d < 1
  Doorbuiging voldoet (UC < 1.0).
#else
  Doorbuiging voldoet NIET!
#end if

## Overzicht

@svg
<svg width="600" height="220" viewBox="0 0 600 220">
  <!-- Ligger -->
  <line x1="50" y1="100" x2="550" y2="100" stroke="#1e40af" stroke-width="3"/>
  <!-- Oplegging links (scharnier) -->
  <polygon points="50,100 35,130 65,130" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="30" y1="133" x2="70" y2="133" stroke="#374151" stroke-width="2"/>
  <!-- Oplegging rechts (rol) -->
  <polygon points="550,100 535,130 565,130" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="542" cy="135" r="5" fill="none" stroke="#374151" stroke-width="2"/>
  <circle cx="558" cy="135" r="5" fill="none" stroke="#374151" stroke-width="2"/>
  <line x1="530" y1="143" x2="570" y2="143" stroke="#374151" stroke-width="2"/>
  <!-- Verdeelde belasting -->
  <line x1="50" y1="50" x2="550" y2="50" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="100" y1="50" x2="100" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="175" y1="50" x2="175" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="250" y1="50" x2="250" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="325" y1="50" x2="325" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="400" y1="50" x2="400" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <line x1="475" y1="50" x2="475" y2="95" stroke="#dc2626" stroke-width="1" marker-end="url(#arrowRed)"/>
  <defs>
    <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
    </marker>
  </defs>
  <!-- Label belasting -->
  <text x="300" y="40" text-anchor="middle" font-size="13" fill="#dc2626" font-style="italic">q = 20 kN/m</text>
  <!-- Maat overspanning -->
  <line x1="50" y1="170" x2="550" y2="170" stroke="#6b7280" stroke-width="1" stroke-dasharray="4"/>
  <line x1="50" y1="160" x2="50" y2="180" stroke="#6b7280" stroke-width="1"/>
  <line x1="550" y1="160" x2="550" y2="180" stroke="#6b7280" stroke-width="1"/>
  <text x="300" y="190" text-anchor="middle" font-size="13" fill="#6b7280" font-style="italic">L = {{L}} mm</text>
  <!-- Profielnaam -->
  <text x="300" y="118" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="bold">IPE 300</text>
</svg>
@end
`;

function debounce(fn: (arg: string) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (arg: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(arg), ms);
  };
}

// Template map for calculation items
const templates: Record<string, string> = {
  'paaldraagvermogen': paalExample,
  'stalen-ligger': exampleDoc,
  'ec5-buiging': ec5Buiging,
  'ec5-afschuiving': ec5Afschuiving,
  'ec5-druk': ec5Druk,
  'ec5-druk-loodrecht': ec5DrukLoodrecht,
  'ec5-knik': ec5Knik,
  'ec5-doorbuiging': ec5Doorbuiging,
  'ec5-houten-balk': ec5HoutenBalk,
  'vdp-schuifspanning': vandepitteSchuifspanning,
  'vdp-doorbuiging': vandepitteDoorbuiging,
  'vdp-knikken': vandepitteKnikken,
  'vdp-mohr': vandepitteMohr,
  'vdp-eigenfrequentie': vandepitteEigenfrequentie,
  'vdp-virtuele-arbeid': vandepitteVirtueleArbeid,
  'en1990-compleet': en1990Compleet,
  'en1990-fundamenteel': en1990Fundamenteel,
  'en1990-equ': en1990EQU,
  'en1990-buitengewoon': en1990Buitengewoon,
  'en1990-aardbeving': en1990Aardbeving,
  'en1990-bgt': en1990BGT,
  'en1990-groep-c': en1990GroepC,
  'en1990-rekenwaarden': en1990Rekenwaarden,
  'en1990-referentieperiode': en1990Referentieperiode,
  'en1991-gebruiksbelasting': en1991Gebruiksbelasting,
  'en1991-sneeuwbelasting': en1991Sneeuwbelasting,
  'en1991-windbelasting': en1991Windbelasting,
  'ec3-materiaal': ec3Materiaal,
  'ec3-classificatie': ec3Classificatie,
  'ec3-trek': ec3Trek,
  'ec3-druk': ec3Druk,
  'ec3-buiging': ec3Buiging,
  'ec3-dwarskracht': ec3Dwarskracht,
  'ec3-buiging-normaalkracht': ec3BuigingNormaalkracht,
  'ec3-kip': ec3Kip,
  'ec3-knik': ec3Knik,
  'ec3-doorbuiging': ec3Doorbuiging,
  'ec3-stalen-ligger': ec3StalenLigger,
  'en1996-druksterkte': en1996Druksterkte,
  'en1996-drukwand': en1996Drukwand,
  'en1996-afschuiving': en1996Afschuiving,
  'en1996-slankheid': en1996Slankheid,
  'en1997-funderingsstrook': en1997Funderingsstrook,
  'en1997-paaldraagvermogen': en1997Paaldraagvermogen,
  'en1997-zetting': en1997Zetting,
  'en1997-glijding': en1997Glijding,
  'ec2-materiaal': ec2Materiaal,
  'ec2-buiging': ec2Buiging,
  'ec2-dwarskracht-zonder': ec2DwarskrachtZonder,
  'ec2-dwarskracht-met': ec2DwarskrachtMet,
  'ec2-pons': ec2Pons,
  'ec2-scheurwijdte': ec2Scheurwijdte,
  'ec2-doorbuiging': ec2Doorbuiging,
  'ec2-betonbalk': ec2BetonBalk,
};

const editorEl = document.getElementById('editor')!;
const previewEl = document.getElementById('preview')!;

// Initial render
updatePreview(previewEl, paalExample);

// Setup editor with live preview
const debouncedUpdate = debounce((content: string) => {
  updatePreview(previewEl, content);
}, 250);

let editorView = createEditor(editorEl, paalExample, debouncedUpdate);

/** Replace the editor content and re-render preview */
function loadTemplate(templateId: string) {
  const content = templates[templateId];
  if (!content) return;
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: content,
    },
  });
  updatePreview(previewEl, content);
}

// ─── Ribbon logic ────────────────────────────────────────────────────

// Tab switching
document.querySelectorAll<HTMLButtonElement>('.ribbon-tab:not(.file)').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    if (!tabId) return;

    // Deactivate all tabs & panels
    document.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ribbon-content').forEach(p => p.classList.remove('active'));

    // Activate clicked tab & panel
    tab.classList.add('active');
    const panel = document.querySelector(`.ribbon-content[data-panel="${tabId}"]`);
    if (panel) panel.classList.add('active');
  });
});

// Dropdown menus
document.querySelectorAll<HTMLButtonElement>('[data-dropdown]').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const menuId = trigger.dataset.dropdown;
    if (!menuId) return;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    // Close all other menus
    document.querySelectorAll('.ribbon-dropdown-menu.open').forEach(m => {
      if (m.id !== menuId) m.classList.remove('open');
    });

    menu.classList.toggle('open');
  });
});

// Close dropdowns on click outside
document.addEventListener('click', () => {
  document.querySelectorAll('.ribbon-dropdown-menu.open').forEach(m => {
    m.classList.remove('open');
  });
});

// ─── Project Browser Sidebar ─────────────────────────────────────────

// Collapse / expand sidebar
const sidebar = document.getElementById('project-browser')!;
const toggleBtn = document.getElementById('btn-toggle-sidebar')!;

toggleBtn.addEventListener('click', () => {
  const isCollapsed = sidebar.classList.toggle('collapsed');
  toggleBtn.innerHTML = isCollapsed ? '&#x25B6;' : '&#x25C0;';
  toggleBtn.title = isCollapsed ? 'Zijpaneel uitklappen' : 'Zijpaneel inklappen';
});

// Tree category expand / collapse
document.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(header => {
  header.addEventListener('click', () => {
    const categoryId = header.dataset.toggle;
    if (!categoryId) return;
    const children = document.querySelector(`[data-children="${categoryId}"]`);
    const chevron = header.querySelector('.tree-chevron');
    if (!children || !chevron) return;
    children.classList.toggle('collapsed');
    chevron.classList.toggle('expanded');
  });
});

// Tree item selection + template loading
document.querySelectorAll<HTMLButtonElement>('.tree-item').forEach(item => {
  item.addEventListener('click', () => {
    // Remove previous selection
    document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');

    // If this item has a template, load it
    const templateId = item.dataset.template;
    if (templateId) {
      loadTemplate(templateId);
      // Update titlebar filename
      const label = item.querySelector('.tree-item-label')?.textContent;
      if (label) {
        const fileSpan = document.querySelector('.app-titlebar .app-file');
        if (fileSpan) fileSpan.textContent = `— ${label}.${APP_FILE_EXT}`;
      }
    }
  });
});

// Sidebar resize handle
const resizeHandle = document.getElementById('sidebar-resize')!;
let isResizing = false;

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault();
  isResizing = true;
  resizeHandle.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = Math.max(160, Math.min(500, e.clientX));
  sidebar.style.width = newWidth + 'px';
  sidebar.style.minWidth = newWidth + 'px';
  sidebar.classList.remove('collapsed');
  toggleBtn.innerHTML = '&#x25C0;';
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizeHandle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// View toggle (split / editor / preview)
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    const editorPane = document.querySelector<HTMLElement>('.editor-pane')!;
    const previewPane = document.querySelector<HTMLElement>('.preview-pane')!;

    // Update active state
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    switch (view) {
      case 'split':
        editorPane.style.display = 'flex';
        previewPane.style.display = 'flex';
        editorPane.style.width = '50%';
        previewPane.style.width = '50%';
        break;
      case 'editor':
        editorPane.style.display = 'flex';
        previewPane.style.display = 'none';
        editorPane.style.width = '100%';
        break;
      case 'preview':
        editorPane.style.display = 'none';
        previewPane.style.display = 'flex';
        previewPane.style.width = '100%';
        break;
    }
  });
});
