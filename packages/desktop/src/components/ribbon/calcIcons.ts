/**
 * Engineering-specific ribbon icons for Open Calculations Studio.
 *
 * Matches the OpenAEC template's icon style: 24×24 viewBox, stroke="currentColor"
 * (so they inherit ribbon text color), stroke-width 1.6, rounded caps/joins.
 * Each is exported as an inline SVG string consumed by <RibbonButton icon={...} />.
 */

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

// ── File operations ────────────────────────────────────────────────────
export const newDocIcon = svg(
  `<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z"/>
   <path d="M14 3v5h5"/>
   <path d="M9 13h6M12 10v6"/>`,
);

export const openFolderIcon = svg(
  `<path d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/>
   <path d="M3 11h18" opacity="0.5"/>`,
);

export const saveDiskIcon = svg(
  `<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
   <polyline points="17 21 17 13 7 13 7 21"/>
   <polyline points="7 3 7 8 15 8"/>`,
);

export const undoIcon = svg(
  `<polyline points="1 4 1 10 7 10"/>
   <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>`,
);

export const redoIcon = svg(
  `<polyline points="23 4 23 10 17 10"/>
   <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10"/>`,
);

// ── Content insertion ─────────────────────────────────────────────────
export const headingIcon = svg(
  `<path d="M6 4v16"/><path d="M14 4v16"/><path d="M6 12h8"/>
   <text x="17" y="20" font-size="9" font-family="Space Grotesk, sans-serif" font-weight="700" stroke="none" fill="currentColor">1</text>`,
);

export const formulaIcon = svg(
  `<path d="M9 4a3 3 0 00-3 3v2H4"/>
   <path d="M14 9H7"/>
   <path d="M11 4v16"/>
   <path d="M7 20l3-3"/>`,
);

export const variableIcon = svg(
  `<path d="M6 6l6 12"/><path d="M18 6l-6 12"/>`,
);

export const selectListIcon = svg(
  `<rect x="3" y="6" width="18" height="12" rx="1.5"/>
   <path d="M3 11h18"/>
   <polyline points="14 14 17 17 20 14" opacity="0.7"/>`,
);

export const checkIcon = svg(
  `<circle cx="12" cy="12" r="9"/>
   <polyline points="8 12 11 15 16 9"/>`,
);

export const imageIcon = svg(
  `<rect x="3" y="4" width="18" height="16" rx="2"/>
   <circle cx="8.5" cy="9.5" r="1.5"/>
   <polyline points="21 16 15 10 7 18"/>`,
);

export const svgShapeIcon = svg(
  `<rect x="3" y="9" width="9" height="9" rx="1"/>
   <circle cx="17" cy="8" r="4"/>
   <polyline points="14 18 18 22 22 18"/>`,
);

// ── View / layout ──────────────────────────────────────────────────────
export const viewSplitIcon = svg(
  `<rect x="3" y="4" width="18" height="16" rx="1.5"/>
   <path d="M12 4v16"/>`,
);

export const viewEditorIcon = svg(
  `<rect x="3" y="4" width="18" height="16" rx="1.5"/>
   <path d="M7 9h6M7 13h10M7 17h8"/>`,
);

export const viewPreviewIcon = svg(
  `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
   <circle cx="12" cy="12" r="3"/>`,
);

// ── Export ────────────────────────────────────────────────────────────
export const pdfIcon = svg(
  `<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z"/>
   <path d="M14 3v5h5"/>
   <text x="8.5" y="17" font-size="6" font-family="Space Grotesk, sans-serif" font-weight="700" stroke="none" fill="currentColor">PDF</text>`,
);

export const pdfPreviewIcon = svg(
  `<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z"/>
   <path d="M14 3v5h5"/>
   <circle cx="12" cy="15" r="2.5"/>
   <path d="M9.5 15h-1M15.5 15h-1M12 12.5v-1M12 18.5v-1"/>`,
);

export const ifcExportIcon = svg(
  `<path d="M3 7l9-4 9 4-9 4-9-4z"/>
   <path d="M3 12l9 4 9-4"/>
   <path d="M3 17l9 4 9-4"/>`,
);

// ── IFC tab ───────────────────────────────────────────────────────────
export const ifcImportIcon = svg(
  `<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/>
   <polyline points="3 8 12 13 21 8"/>
   <path d="M12 13v10" opacity="0.6"/>`,
);

export const ifcTreeIcon = svg(
  `<rect x="3" y="3" width="6" height="6" rx="1"/>
   <rect x="15" y="9" width="6" height="4" rx="1"/>
   <rect x="15" y="15" width="6" height="4" rx="1"/>
   <path d="M9 6h3v5h3"/>
   <path d="M12 11v6h3"/>`,
);

export const ifcPropertiesIcon = svg(
  `<rect x="4" y="3" width="16" height="18" rx="1.5"/>
   <line x1="8" y1="8" x2="16" y2="8"/>
   <line x1="8" y1="12" x2="16" y2="12"/>
   <line x1="8" y1="16" x2="13" y2="16"/>`,
);

export const ifcValidateIcon = svg(
  `<path d="M12 3l9 3v6a9 9 0 01-9 9 9 9 0 01-9-9V6z"/>
   <polyline points="9 12 11 14 15 10"/>`,
);

export const gefIcon = svg(
  `<path d="M4 21V8a1 1 0 011-1h14a1 1 0 011 1v13"/>
   <path d="M4 21h16"/>
   <path d="M8 11v5M12 13v3M16 9v7" opacity="0.8"/>
   <text x="6.5" y="6" font-size="5" font-family="Space Grotesk, sans-serif" font-weight="700" stroke="none" fill="currentColor">GEF</text>`,
);

export const broIcon = svg(
  `<path d="M4 21V8a1 1 0 011-1h14a1 1 0 011 1v13"/>
   <path d="M4 21h16"/>
   <path d="M8 11v5M12 13v3M16 9v7" opacity="0.8"/>
   <text x="6.5" y="6" font-size="5" font-family="Space Grotesk, sans-serif" font-weight="700" stroke="none" fill="currentColor">BRO</text>`,
);

// ── Engineering domain icons (currently unused but staged for IFC/structural tabs) ──
export const beamIcon = svg(
  `<line x1="3" y1="6" x2="21" y2="6" stroke-width="2.6"/>
   <line x1="3" y1="18" x2="21" y2="18" stroke-width="2.6"/>
   <line x1="12" y1="6" x2="12" y2="18" stroke-width="2.6"/>`,
);

export const columnIcon = svg(
  `<line x1="6" y1="3" x2="6" y2="21" stroke-width="2.6"/>
   <line x1="18" y1="3" x2="18" y2="21" stroke-width="2.6"/>
   <line x1="6" y1="12" x2="18" y2="12" stroke-width="2.6"/>`,
);

export const pileIcon = svg(
  `<rect x="9" y="2" width="6" height="20" rx="0.8" stroke-width="2"/>
   <polygon points="9 22 15 22 12 25" fill="currentColor" stroke="none"/>
   <line x1="3" y1="6" x2="21" y2="6" opacity="0.5" stroke-dasharray="2,2"/>`,
);
