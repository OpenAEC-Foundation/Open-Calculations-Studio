/**
 * GEF (Geotechnical Exchange Format) parser for CPT data.
 *
 * Parses Dutch-standard GEF files containing Cone Penetration Test data
 * (depth, cone resistance qc, local friction fs).
 */

export interface GefData {
  projectId: string;
  fileDate: string;
  depths: number[];       // depth values in m
  qc: number[];           // cone resistance in MPa
  fs: number[];           // local friction in MPa (if available)
  nafLevel: number;       // NAP reference level
  columnSeparator: string;
}

interface ColumnInfo {
  index: number;   // 1-based column index
  unit: string;
  name: string;
  typeNumber: number; // 1=depth, 2=qc, 3=fs, 4=friction ratio
}

export function parseGef(content: string): GefData {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let projectId = '';
  let fileDate = '';
  let nafLevel = 0;
  let columnSeparator = ';';
  let recordSeparator = '!';
  let columnCount = 0;
  const columnInfos: ColumnInfo[] = [];
  let eohIndex = -1;
  /** Waarde die per kolom "geen meting" betekent (#COLUMNVOID). */
  const voids = new Map<number, number>();
  /** Maaiveld uit #ZID; gaat voor op de variant via #MEASUREMENTVAR. */
  let zidLevel: number | null = null;

  // ── Parse header ──────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.toUpperCase().startsWith('#EOH=')) {
      eohIndex = i;
      break;
    }

    // #PROJECTID= value
    const projectMatch = line.match(/^#PROJECTID\s*=\s*(.+)$/i);
    if (projectMatch) {
      projectId = projectMatch[1].trim();
      continue;
    }

    // #FILEDATE= yyyy, mm, dd
    const dateMatch = line.match(/^#FILEDATE\s*=\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (dateMatch) {
      const y = dateMatch[1].padStart(4, '0');
      const m = dateMatch[2].padStart(2, '0');
      const d = dateMatch[3].padStart(2, '0');
      fileDate = `${y}-${m}-${d}`;
      continue;
    }

    // #COLUMN= n
    const colMatch = line.match(/^#COLUMN\s*=\s*(\d+)/i);
    if (colMatch) {
      columnCount = parseInt(colMatch[1], 10);
      continue;
    }

    // #COLUMNINFO= index, unit, name, typeNumber
    const colInfoMatch = line.match(
      /^#COLUMNINFO\s*=\s*(\d+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)/i
    );
    if (colInfoMatch) {
      columnInfos.push({
        index: parseInt(colInfoMatch[1], 10),
        unit: colInfoMatch[2].trim(),
        name: colInfoMatch[3].trim(),
        typeNumber: parseInt(colInfoMatch[4], 10),
      });
      continue;
    }

    // #COLUMNSEPARATOR= ;
    const sepMatch = line.match(/^#COLUMNSEPARATOR\s*=\s*(.+)$/i);
    if (sepMatch) {
      columnSeparator = sepMatch[1].trim();
      continue;
    }

    // #RECORDSEPARATOR= !
    const recSepMatch = line.match(/^#RECORDSEPARATOR\s*=\s*(.+)$/i);
    if (recSepMatch) {
      recordSeparator = recSepMatch[1].trim();
      continue;
    }

    // #ZID= 31000, niveau, nauwkeurigheid — het maaiveld t.o.v. NAP (code 31000)
    const zidMatch = line.match(/^#ZID\s*=\s*\d+\s*,\s*([+-]?\d*\.?\d+)/i);
    if (zidMatch) {
      zidLevel = parseFloat(zidMatch[1]);
      continue;
    }

    // #COLUMNVOID= kolom, waarde — meetpunten met die waarde tellen niet
    const voidMatch = line.match(/^#COLUMNVOID\s*=\s*(\d+)\s*,\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
    if (voidMatch) {
      voids.set(parseInt(voidMatch[1], 10) - 1, parseFloat(voidMatch[2]));
      continue;
    }

    // #MEASUREMENTVAR= 1, value, m, description  (NAP level)
    const measMatch = line.match(
      /^#MEASUREMENTVAR\s*=\s*\d+\s*,\s*([+-]?\d+\.?\d*)\s*,\s*m\s*,.*NAP/i
    );
    if (measMatch) {
      nafLevel = parseFloat(measMatch[1]);
      continue;
    }
  }

  if (eohIndex < 0) {
    throw new Error('GEF: geen #EOH= gevonden (einde header)');
  }

  // ── Determine column indices (0-based) ────────────────────────────
  let depthCol = -1;
  let qcCol = -1;
  let fsCol = -1;

  // De gecorrigeerde diepte (type 11) houdt rekening met de scheefstand van de
  // conus en gaat voor op de sondeertrajectlengte (type 1).
  let gecorrigeerd = false;
  for (const ci of columnInfos) {
    const idx = ci.index - 1; // convert to 0-based
    switch (ci.typeNumber) {
      case 1:
        if (!gecorrigeerd) depthCol = idx;
        break;
      case 11:
        depthCol = idx;
        gecorrigeerd = true;
        break;
      case 2:
        qcCol = idx;
        break;
      case 3:
        fsCol = idx;
        break;
    }
  }

  // Fallback: if no COLUMNINFO found, assume first two columns are depth, qc
  if (depthCol < 0) depthCol = 0;
  if (qcCol < 0) qcCol = Math.min(1, columnCount - 1);

  // ── Parse data rows ───────────────────────────────────────────────
  const depths: number[] = [];
  const qc: number[] = [];
  const fs: number[] = [];

  // Join all lines after #EOH= and split by record separator
  const dataContent = lines.slice(eohIndex + 1).join('\n');

  // Split by record separator if present, otherwise by newline
  let records: string[];
  if (recordSeparator && dataContent.includes(recordSeparator)) {
    records = dataContent.split(recordSeparator);
  } else {
    records = dataContent.split('\n');
  }

  for (const record of records) {
    const trimmed = record.trim();
    if (trimmed === '') continue;

    // Split by column separator; zonder scheidingsteken in de regel op witruimte.
    const fields = (trimmed.includes(columnSeparator) ? trimmed.split(columnSeparator) : trimmed.split(/\s+/))
      .map(f => f.trim())
      .filter((f, i, lijst) => f !== '' || i < lijst.length - 1);

    const depthVal = parseFloat(fields[depthCol]);
    const qcVal = parseFloat(fields[qcCol]);

    if (isNaN(depthVal) || isNaN(qcVal)) continue;
    if (voids.get(depthCol) === depthVal || voids.get(qcCol) === qcVal) continue;

    depths.push(depthVal);
    qc.push(qcVal);

    if (fsCol >= 0 && fsCol < fields.length) {
      const fsVal = parseFloat(fields[fsCol]);
      fs.push(isNaN(fsVal) ? 0 : fsVal);
    }
  }

  if (depths.length === 0) {
    throw new Error('GEF: geen geldige data gevonden na #EOH=');
  }

  return {
    projectId,
    fileDate,
    depths,
    qc,
    fs,
    nafLevel: zidLevel ?? nafLevel,
    columnSeparator,
  };
}
