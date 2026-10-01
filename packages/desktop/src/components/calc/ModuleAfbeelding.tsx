import type { ReactNode } from "react";

/** Schematische catalogusbeelden; onafhankelijk van projectinvoer en rekenwaarden. */
const vlak = "var(--mk-beeld-vlak)";
const accent = "var(--theme-accent)";
const p = (d: string) => <path d={d} />;
const r = (x: number, y: number, w: number, h: number) =>
  <rect x={x} y={y} width={w} height={h} fill={vlak} />;
const stip = (x: number, y: number) => <circle cx={x} cy={y} r="3" fill={accent} stroke="none" />;
const kracht = (x: number, y: number, hoek = 0) => (
  <g transform={`translate(${x} ${y}) rotate(${hoek})`} stroke={accent}>
    <path d="M0 0v20m-4-5 4 5 4-5" />
  </g>
);
const steun = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0l-7 10H7ZM-10 14h20" />
  </g>
);
const vlam = (x: number, y: number, schaal = 1) => (
  <path transform={`translate(${x} ${y}) scale(${schaal})`} stroke={accent} fill={vlak}
    d="M0 28C-17 24-12 12-6 8C-8 15-2 16-2 10C-2 5 3 2 3-4C19 13 18 27 0 28Z" />
);
const iProfiel = <path d="M61 17h38v7H85v45h14v7H61v-7h14V24H61Z" fill={vlak} />;
const kolom = <>{r(65, 22, 30, 52)}{kracht(80, 0)}{p("M52 78h56m-50 0-5 7m17-7-5 7m17-7-5 7m17-7-5 7m17-7-5 7")}</>;
const wand = <>{r(40, 28, 80, 48)}{p("M40 44h80M40 60h80M60 28v16m40-16v16M80 44v16M60 60v16m40-16v16")}</>;
const kader = <>{r(37, 24, 86, 50)}{p("M43 30h74v38H43ZM68 30v38M93 30v38")}</>;
const ligger = <>{r(26, 43, 108, 8)}{steun(34, 51)}{steun(126, 51)}{kracht(54, 15)}{kracht(80, 15)}{kracht(106, 15)}</>;
const verbinding = <>{r(44, 16, 18, 63)}{r(62, 35, 65, 23)}{p("M62 39h65M62 54h65")}</>;
const doorsnede = <>{r(49, 17, 62, 64)}<rect x="56" y="24" width="48" height="50" rx="7" stroke={accent} />{stip(62, 30)}{stip(98, 30)}{stip(62, 68)}{stip(80, 68)}{stip(98, 68)}</>;

/** Gegenereerde modulebeelden; het symbool benoemt de toets visueel. */
const eigenBeelden = import.meta.glob("../../assets/module-beelden/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Elk rekenmodule-id heeft een eigen herkenningsbeeld. */
const beelden: Record<string, ReactNode> = {
  spuwer: <>{p("M27 23v52h108M36 23v43h60V48h32v9h-24v18")}
    <path d="M39 43q9-6 18 0t18 0t18 0M109 51q25 0 25 24m-6-13 4 5m4 10v5" stroke={accent} />{r(20, 75, 122, 5)}</>,
  paaldraagvermogen: <>{p("M20 35h120M20 57h120M20 78h120")}{r(71, 22, 18, 59)}{r(59, 18, 42, 8)}{kracht(80, -5)}
    <g stroke={accent}>{p("M47 41h15m-4-3 4 3-4 3M47 60h15m-4-3 4 3-4 3M113 41H98m4-3-4 3 4 3M113 60H98m4-3-4 3 4 3")}</g></>,
  "permanente-vuurlast": <>{r(25, 52, 46, 25)}{r(32, 40, 32, 12)}{p("M33 59h30M33 66h30")}{vlam(101, 35, 1.25)}</>,
  opdrijven: <>{r(49, 28, 63, 36)}<path d="M19 43q10-7 20 0t20 0t20 0t20 0t20 0t20 0" stroke={accent} />{kracht(61, 90, 180)}{kracht(81, 90, 180)}{kracht(101, 90, 180)}</>,
  lastresultante: <>{p("M18 76h124M80 68v16M38 76V49M65 76V34M111 76V46")}{kracht(38, 17)}{kracht(65, 3)}{kracht(111, 15)}<path d="M28 84h91m-91-4v8m91-8v8" stroke={accent} /></>,
  ligger,
  "portaal-spant": <>{p("M29 76V42L80 16l51 26v34M36 76V46l44-23 44 23v30")}{steun(33, 77)}{steun(127, 77)}{kracht(80, -8)}</>,
  mechanica: <>{p("M25 66 52 25 80 66 108 25 135 66ZM52 25h56M52 25l56 0M80 66V25")}{steun(25, 66)}{steun(135, 66)}{kracht(80, -2)}{stip(52, 25)}{stip(108, 25)}{stip(80, 66)}</>,
  hekwerk: <>{p("M25 80h112M33 80V29h96v51M33 38h96M48 38v34m16-34v34m16-34v34m16-34v34m16-34v34")}{kracht(9, 28, -90)}</>,
  "stalen-kolom": <>{iProfiel}{kracht(80, -6)}{p("M46 83h68")}</>,
  "stalen-gevelkolom": <>{iProfiel}{kracht(23, 33, -90)}{kracht(23, 56, -90)}{p("M47 83h66")}</>,
  "verticaal-windverband": <>{r(34, 22, 92, 55)}<path d="m39 27 82 45m0-45-82 45" stroke={accent} />{steun(36, 77)}{steun(124, 77)}</>,
  voetplaatverbinding: <>{r(36, 61, 88, 19)}{r(29, 55, 102, 6)}{p("M69 17v38m22-38v38M65 17h30")}
    <path d="M48 48v25h8m56-25v25h-8M43 52h10m54 0h10" stroke={accent} /></>,
  momentverbinding: <>{verbinding}<path d="M65 27v41M67 31h9m-9 32h9" stroke={accent} />{stip(70, 31)}{stip(70, 63)}{p("M138 29q16 17 0 34m0-8v8h7")}</>,
  dwarskrachtverbinding: <>{verbinding}{r(62, 39, 22, 15)}{stip(69, 46)}{stip(77, 46)}{kracht(113, 7)}</>,
  schoorverbinding: <>{p("M34 19v57h96M44 19v47h86")}{r(43, 54, 23, 12)}<path d="m56 55 55-36 7 9-54 36Z" fill={vlak} />{stip(60, 58)}{stip(73, 49)}</>,
  boutberekening: <>{r(25, 35, 69, 33)}{r(66, 24, 69, 33)}{p("M78 24v-8m0 58v8")}{[48, 62, 80, 96, 112].map((x) => <circle key={x} cx={x} cy={x < 70 ? 51 : 40} r="5" fill={vlak} stroke={accent} />)}</>,
  lasberekening: <>{r(29, 66, 102, 7)}{r(73, 21, 9, 45)}<path d="m73 54-12 12h12m9-12 12 12H82M63 65l7-7m15 1 6 6" stroke={accent} />{p("M101 25 88 53m13-28h29")}</>,
  brandwerendheid: <>{iProfiel}{vlam(33, 48, 0.8)}{vlam(122, 51, 0.65)}</>,
  betonkolom: <>{kolom}<path d="M71 29v37m18-37v37M69 39h22M69 55h22" stroke={accent} /></>,
  betonplaat: <>{r(32, 50, 103, 12)}{r(32, 23, 14, 56)}<path d="M39 73V55h85" stroke={accent} />{kracht(74, 19)}{kracht(109, 19)}</>,
  "tweepaals-poer": <>{r(45, 56, 14, 27)}{r(104, 56, 14, 27)}{r(31, 40, 101, 19)}{r(70, 17, 22, 23)}<path d="M39 48h84m-78 6h71" stroke={accent} />{kracht(81, -6)}</>,
  betondoorsnede: doorsnede,
  ponsberekening: <><path d="m22 48 55-20 62 20-55 24Z" fill={vlak} />{r(72, 13, 18, 38)}<ellipse cx="81" cy="49" rx="32" ry="11" stroke={accent} strokeDasharray="4 4" />{p("M22 48v8l62 24 55-24v-8")}</>,
  verankeringslengte: <>{r(25, 24, 110, 53)}<path d="M17 42h89q13 0 13 13v9M40 87h79m-79-4v8m79-8v8" stroke={accent} /></>,
  "beton-detaillering": <>{r(33, 18, 94, 61)}<path d="M43 27h74v43H43ZM57 27v43m23-43v43m23-43v43M43 41h74M43 56h74" stroke={accent} />{p("M23 18v61m-4-61h8m-8 61h8")}</>,
  wapeningshoeveelheid: <>{r(34, 22, 91, 57)}<path d="M44 31h71M44 70h71M49 31v39m17-39v39m17-39v39m17-39v39M27 80h107" stroke={accent} />{stip(49, 31)}{stip(83, 31)}{stip(115, 31)}<path d="M131 33h10v35h-10m-6-17h16" stroke={accent} /></>,
  plaatwandhoeveelheid: <>{r(27, 27, 99, 52)}<path d="M34 34h85M34 46h85M34 58h85M34 70h85M40 32v42m57-42v42m-42-42v42m57-42v42" stroke={accent} /><path d="M131 38h10v24h-10m-10-12h20" stroke={accent} />{stip(40, 34)}{stip(97, 58)}</>,
  kruipfactor: <>{p("M30 17v61h109") }<path d="M34 70C48 42 55 35 73 29s41-8 59-8" stroke={accent} /><path d="M34 70 133 41" strokeDasharray="4 4" />{p("m135 74 4 4-4 4M26 21l4-4 4 4")}</>,
  kolom: <>{kolom}{p("M72 29v11m0 7v16m9-33v30m8-30v11m0 7v18")}</>,
  balklaag: <>{[0, 1, 2, 3].map((i) => <path key={i} d={`M${24 + i * 23} 62l28-35 9 3-28 35v10l-9-3Z`} fill={vlak} />)}{p("m24 62 81 11 31-37M24 72l81 11 31-37")}</>,
  gording: <>{p("M24 72 82 17l54 55M32 74l50-47 47 47")}{[0, 1, 2].map((i) => <rect key={i} x={43 + i * 16} y={53 - i * 15} width="14" height="8" transform={`rotate(-43 ${50 + i * 16} ${57 - i * 15})`} fill={vlak} stroke={accent} />)}</>,
  "houten-kap": <>{p("M21 74 80 18l59 56ZM80 18v56M50 47l30 27 30-27M43 53h74")}{steun(24, 74)}{steun(136, 74)}</>,
  schijfwerking: <>{kader}<path d="m43 68 74-38" stroke={accent} />{kracht(15, 24, -90)}{p("M33 80h94")}</>,
  "hsb-stabiliteit": <>{p("M27 73V33l55-13 48 26v34L82 58ZM82 20v38M45 29v36M63 24v37M98 29v36M114 38v35") }<path d="m30 68 49-45m7 4 40 49" stroke={accent} />{kracht(7, 27, -90)}</>,
  "nagel-schroef": <>{r(28, 48, 103, 21)}{r(54, 24, 28, 51)}<path d="M62 31v35m12-35v35M58 33h8m4 0h8m-17 8 4-3m-4 11 4-3m-4 11 4-3m8-13 4-3m-4 11 4-3m-4 11 4-3" stroke={accent} /></>,
  metselwerkwand: <>{wand}{kracht(60, 0)}{kracht(100, 0)}</>,
  "metselwerk-loodrecht": <>{wand}{kracht(12, 39, -90)}{kracht(12, 61, -90)}<path d="M129 27q17 23 0 49" stroke={accent} strokeDasharray="4 3" /></>,
  "opleg-metselwerk": <>{wand}{r(57, 18, 78, 10)}{kracht(76, -7)}<path d="m61 29-15 37m37-37 15 37" stroke={accent} strokeDasharray="3 4" /></>,
};

export default function ModuleAfbeelding({ templateId }: { templateId: string }) {
  const beeld = beelden[templateId];
  if (!beeld) return null;
  const foto = eigenBeelden[`../../assets/module-beelden/${templateId}.webp`];
  return (
    <span className="mk-afbeelding" aria-hidden="true">
      {foto && <img src={foto} alt="" loading="lazy" />}
      <svg viewBox="0 -10 160 110" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {beeld}
      </svg>
    </span>
  );
}
