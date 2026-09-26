import type { ReactNode } from "react";
import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import type { DesignerCtx } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van het blad "Betonplaat en console".
 *
 *   • Vloerplaat en vlakke plaat: een plattegrond van het veld op schaal, met
 *     per rand de oplegging (vrij opgelegd of randkolom, doorgaand met een stuk
 *     van het buurveld, ingeklemd met arcering). Bij een vlakke plaat de
 *     kolommen op de hoeken en de kolomstroken langs de kolomlijnen. In het
 *     veld de momenten per m uit het blad.
 *   • Korte console: een zijaanzicht met de kolom, de console, de oplegplaat en
 *     de krachten, en het staafwerkmodel uit het blad: de trekband op d, de
 *     drukdiagonaal naar de onderste knoop en de drukzone y_0 aan de kolom.
 *
 * De toetsing staat in het blad (templates/betonplaat.ts): de kop, de getallen
 * in de tekening en de UC's in de voetregel komen uit het doorgerekende blad.
 * Het beeld rekent zelf alleen de geometrie voor de tekening.
 */
const MARKER = "Betonplaat en console";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const DIAM = [6, 8, 10, 12, 16, 20, 25];
const RAND = [{ v: 0, label: "Vrij opgelegd" }, { v: 1, label: "Doorgaand" }, { v: 2, label: "Ingeklemd" }];
const DEEL = [{ v: 1, label: "Lijnvormig ondersteunde vloerplaat" }, { v: 2, label: "Vlakke plaat op kolommen" }, { v: 3, label: "Korte console" }];

// Dezelfde waarden als de standaardinvoer van scripts/check-betonplaat.mjs:
// een tweezijdig dragende vloer 4,5 × 6 m met één doorgaande rand, een vlakke
// plaat met dezelfde invoer en een console 300 × 400 met F_Ed = 250 kN.
const DEFAULTS: Record<string, number> = {
  constructiedeel: 1, betonklasse: 30, betonstaal: 2, draagwijze: 2,
  h_pl: 200, c_pl: 25, l_x: 4.5, l_y: 6, rand_x0: 0, rand_x1: 1, rand_y0: 0, rand_y1: 0,
  g_Ed: 7.5, q_Ed: 3.75, g_fr: 6, q_fr: 1.25, "φ_kr": 2, milieuklasse: 1, belastingduur: 1, wanden: 0,
  buitenlaag: 1, ds_xo: 10, s_xo: 150, ds_yo: 8, s_yo: 150, ds_xb: 10, s_xb: 150, ds_yb: 8, s_yb: 150,
  ds_xm: 8, s_xm: 200, ds_ym: 8, s_ym: 200, k_neg: 0.75, k_pos: 0.6,
  b_con: 300, h_con: 400, l_con: 500, a_con: 150, l_opl: 120, b_opl: 200, h_opl: 20, c_con: 30,
  F_Ed: 250, H_Ed: 0, n_hfd: 3, ds_hfd: 16, n_bgl: 3, ds_bgl: 10, l_bkol: 400, aanhechting: 2, staafvorm: 3,
};

/**
 * Keuzelijst over de volle breedte onder zijn label. De compacte invoerkolom
 * geeft een veld `flex: 0 0 96px`; in een label met flexDirection column is dat
 * de hoogte, dus die gaat hier terug naar auto.
 */
const KOLOMKEUZE = { width: "100%", flex: "0 0 auto" } as const;

/** Eén unity check in de voetregel, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || Number.isNaN(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {Number.isFinite(uc) ? fmt(uc, 2) : "∞"}</span>;
}

/** De grootste van de UC's die het blad noemt, of undefined als er geen is. */
function grootste(g: Record<string, number>, namen: string[]): number | undefined {
  const w = namen.map((n) => g[n]).filter((x) => x !== undefined);
  return w.length ? Math.max(...w) : undefined;
}

/** Staafinvoer: diameter en h.o.h.-afstand naast elkaar. */
function Staaf({ ctx, label, dk, sk, title }: { ctx: DesignerCtx; label: string; dk: string; sk: string; title?: string }) {
  const { d, set } = ctx;
  return (
    <label title={title}>{label}
      <span style={{ display: "flex", gap: 4 }}>
        <select value={d(dk)} onChange={(e) => set(dk, parseFloat(e.target.value))}>
          {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
        </select>
        <input type="number" step={25} min={50} value={d(sk)} style={{ width: 58 }}
          onChange={(e) => set(sk, parseFloat(e.target.value))} />
      </span>
    </label>
  );
}

function RandKeuze({ ctx, label, k }: { ctx: DesignerCtx; label: string; k: string }) {
  return (
    <label>{label}
      <select value={Math.round(ctx.d(k))} onChange={(e) => ctx.set(k, parseInt(e.target.value))}>
        {RAND.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function BetonplaatDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};
  const deel = clamp(Math.round(d("constructiedeel")), 1, 3);
  const fck = Math.round(d("betonklasse"));
  const W = box.w, H = Math.max(300, box.h - 24);

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — betonplaat en console" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Constructiedeel</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Wat reken je?
            <select style={KOLOMKEUZE} value={deel} onChange={(e) => set("constructiedeel", parseInt(e.target.value))}>
              {DEEL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Sterkteklasse
            <select value={fck} onChange={(e) => set("betonklasse", parseInt(e.target.value))}>
              {BETON.map((v) => <option key={v} value={v}>{BETONLABEL[v]}</option>)}
            </select>
          </label>
          {deel <= 2 ? <PlaatInvoer ctx={ctx} deel={deel} g={g} /> : <ConsoleInvoer ctx={ctx} g={g} />}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">{deel === 3 ? "Zijaanzicht en staafwerkmodel" : "Plattegrond van het veld"}</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              {deel <= 2 ? <PlaatTekening ctx={ctx} deel={deel} g={g} W={W} H={H} /> : <ConsoleTekening ctx={ctx} g={g} W={W} H={H} />}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />{BETONLABEL[fck] ?? `C${fck}`} · {DEEL.find((o) => o.v === deel)?.label.toLowerCase()}</span>
        <span className="vd-live">
          {deel <= 2 ? (
            <>
              <UcChip naam="buiging" uc={grootste(g, ["UC_M_xo", "UC_M_yo", "UC_M_xb", "UC_M_yb", "UC_M_xm", "UC_M_ym"])} />
              <UcChip naam="A_s,min" uc={grootste(g, ["UC_min_xo", "UC_min_yo", "UC_min_xb", "UC_min_yb", "UC_min_xm", "UC_min_ym", "UC_verd"])} />
              <UcChip naam="s_max" uc={grootste(g, ["UC_s_xo", "UC_s_yo", "UC_s_xb", "UC_s_yb", "UC_s_xm", "UC_s_ym"])} />
              <UcChip naam="w_k" uc={grootste(g, ["UC_w_xo", "UC_w_yo", "UC_w_xb", "UC_w_yb", "UC_w_xm", "UC_w_ym"])} />
              <UcChip naam="l/d" uc={g.UC_ld} />
              {deel === 2 && <UcChip naam="9.4.1(2)" uc={g.UC_941} />}
            </>
          ) : (
            <>
              <UcChip naam="trekband" uc={g.UC_T} />
              <UcChip naam="knoop boven" uc={grootste(g, ["UC_N1", "UC_N1d"])} />
              <UcChip naam="knoop onder" uc={g.UC_N2} />
              <UcChip naam="beugels" uc={g.UC_bgl} />
              <UcChip naam="verankering" uc={grootste(g, ["UC_vk", "UC_vc"])} />
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Invoer ──────────────────────────────────────────────────────────────────

function PlaatInvoer({ ctx, deel, g }: { ctx: DesignerCtx; deel: number; g: Record<string, number> }) {
  const { d, set } = ctx;
  const tweezijdig = deel === 2 || Math.round(d("draagwijze")) === 2;
  const bovenX = tweezijdig || Math.round(d("rand_x0")) + Math.round(d("rand_x1")) > 0;
  return (
    <>
      <span className="vd-ctrl-h">Plaat (mm, m)</span>
      {deel === 1 && (
        <label style={{ flexDirection: "column", alignItems: "stretch" }}>Draagwijze
          <select style={KOLOMKEUZE} value={Math.round(d("draagwijze"))} onChange={(e) => set("draagwijze", parseInt(e.target.value))}>
            <option value={2}>Tweezijdig dragend, op vier randen</option>
            <option value={1}>Eenzijdig dragend, in de x-richting</option>
          </select>
        </label>
      )}
      <label>Plaatdikte h
        <input type="number" step={10} value={d("h_pl")} onChange={(e) => set("h_pl", parseFloat(e.target.value))} />
      </label>
      <label>Dekking c
        <input type="number" step={5} value={d("c_pl")} onChange={(e) => set("c_pl", parseFloat(e.target.value))} />
      </label>
      <label>l<sub>x</sub> (m)
        <input type="number" step={0.1} value={d("l_x")} onChange={(e) => set("l_x", parseFloat(e.target.value))} />
      </label>
      {tweezijdig && (
        <label>l<sub>y</sub> (m)
          <input type="number" step={0.1} value={d("l_y")} onChange={(e) => set("l_y", parseFloat(e.target.value))} />
        </label>
      )}

      <span className="vd-ctrl-h">{deel === 2 ? "Randen (randkolom of doorgaand)" : "Randen"}</span>
      <RandKeuze ctx={ctx} label="x = 0" k="rand_x0" />
      <RandKeuze ctx={ctx} label="x = lx" k="rand_x1" />
      {tweezijdig && <RandKeuze ctx={ctx} label="y = 0" k="rand_y0" />}
      {tweezijdig && <RandKeuze ctx={ctx} label="y = ly" k="rand_y1" />}

      <span className="vd-ctrl-h">Belasting (kN/m²)</span>
      <label title="Rekenwaarde, met het eigen gewicht">g<sub>Ed</sub>
        <input type="number" step={0.25} value={d("g_Ed")} onChange={(e) => set("g_Ed", parseFloat(e.target.value))} />
      </label>
      <label>q<sub>Ed</sub>
        <input type="number" step={0.25} value={d("q_Ed")} onChange={(e) => set("q_Ed", parseFloat(e.target.value))} />
      </label>
      <label title="Frequente combinatie (NB bij 7.3.1(5)): het permanente deel">g<sub>fr</sub>
        <input type="number" step={0.25} value={d("g_fr")} onChange={(e) => set("g_fr", parseFloat(e.target.value))} />
      </label>
      <label title="Frequente combinatie: ψ₁·q_k">q<sub>fr</sub>
        <input type="number" step={0.25} value={d("q_fr")} onChange={(e) => set("q_fr", parseFloat(e.target.value))} />
      </label>
      {g.g_k_eg !== undefined && <span className="gd-note">Eigen gewicht, karakteristiek: {fmt(g.g_k_eg, 2)} kN/m².</span>}

      <span className="vd-ctrl-h">Wapening</span>
      <Staaf ctx={ctx} label="onder x" dk="ds_xo" sk="s_xo" />
      <Staaf ctx={ctx} label="onder y" dk="ds_yo" sk="s_yo" />
      {bovenX && <Staaf ctx={ctx} label={deel === 2 ? "boven x, kolomstr." : "boven x"} dk="ds_xb" sk="s_xb" />}
      {tweezijdig && <Staaf ctx={ctx} label={deel === 2 ? "boven y, kolomstr." : "boven y"} dk="ds_yb" sk="s_yb" />}
      {deel === 2 && (
        <>
          <Staaf ctx={ctx} label="boven x, midden" dk="ds_xm" sk="s_xm" />
          <Staaf ctx={ctx} label="boven y, midden" dk="ds_ym" sk="s_ym" />
          <label title="Tabel I.1: 0,60–0,80 van het steunpuntsmoment naar de kolomstrook">k<sub>neg</sub>
            <input type="number" step={0.05} min={0.6} max={0.8} value={d("k_neg")} onChange={(e) => set("k_neg", parseFloat(e.target.value))} />
          </label>
          <label title="Tabel I.1: 0,50–0,70 van het veldmoment naar de kolomstrook">k<sub>pos</sub>
            <input type="number" step={0.05} min={0.5} max={0.7} value={d("k_pos")} onChange={(e) => set("k_pos", parseFloat(e.target.value))} />
          </label>
        </>
      )}
      {g.UC_ld !== undefined && g.ld !== undefined && (
        <span className="gd-note">l/d = {fmt(g.ld, 1)}{g.ld_grens !== undefined && <> ≤ {fmt(g.ld_grens, 1)}</>} (7.4.2).</span>
      )}
    </>
  );
}

function ConsoleInvoer({ ctx, g }: { ctx: DesignerCtx; g: Record<string, number> }) {
  const { d, set } = ctx;
  const veld = (naam: string, label: ReactNode, step = 10, title?: string) => (
    <label title={title}>{label}
      <input type="number" step={step} value={d(naam)} onChange={(e) => set(naam, parseFloat(e.target.value))} />
    </label>
  );
  return (
    <>
      <span className="vd-ctrl-h">Console (mm)</span>
      {veld("b_con", "Breedte b")}
      {veld("h_con", <>Hoogte h<sub>c</sub></>)}
      {veld("l_con", "Lengte")}
      {veld("a_con", <>a<sub>c</sub></>, 10, "Afstand van F_Ed tot de kolom")}
      {veld("l_opl", "Oplegplaat: lengte")}
      {veld("b_opl", "Oplegplaat: breedte")}
      {veld("h_opl", <>H<sub>Ed</sub> boven de console</>, 5)}
      {veld("c_con", "Dekking c", 5)}

      <span className="vd-ctrl-h">Belasting (kN)</span>
      {veld("F_Ed", <>F<sub>Ed</sub></>)}
      {veld("H_Ed", <>H<sub>Ed</sub>, naar buiten +</>, 5, "Ten minste 0,2·F_Ed wordt aangehouden")}
      {g.H_Ed_r !== undefined && <span className="gd-note">Gerekend met H<sub>Ed</sub> = {fmt(g.H_Ed_r, 1)} kN.</span>}

      <span className="vd-ctrl-h">Wapening</span>
      <label>Hoofdtrekwapening
        <span style={{ display: "flex", gap: 4 }}>
          <input type="number" step={1} min={1} value={d("n_hfd")} style={{ width: 44 }} onChange={(e) => set("n_hfd", parseFloat(e.target.value))} />
          <select value={d("ds_hfd")} onChange={(e) => set("ds_hfd", parseFloat(e.target.value))}>
            {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
          </select>
        </span>
      </label>
      <label title="Gesloten beugels, twee sneden per beugel">Beugels
        <span style={{ display: "flex", gap: 4 }}>
          <input type="number" step={1} min={0} value={d("n_bgl")} style={{ width: 44 }} onChange={(e) => set("n_bgl", parseFloat(e.target.value))} />
          <select value={d("ds_bgl")} onChange={(e) => set("ds_bgl", parseFloat(e.target.value))}>
            {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
          </select>
        </span>
      </label>
      {veld("l_bkol", "Verankering in de kolom", 25, "Beschikbaar vanaf de verticale kolomwapening aan de consolezijde (J.3(4))")}
      <label style={{ flexDirection: "column", alignItems: "stretch" }}>Einden van de hoofdtrekwapening
        <select style={KOLOMKEUZE} value={Math.round(d("staafvorm"))} onChange={(e) => set("staafvorm", parseInt(e.target.value))}>
          <option value={1}>Recht</option>
          <option value={2}>Haak, bocht of lus</option>
          <option value={3}>Recht met gelaste dwarsstaaf</option>
        </select>
      </label>
      {g.F_td !== undefined && (
        <span className="gd-note">F<sub>td</sub> = {fmt(g.F_td, 1)} kN · z<sub>0</sub> = {fmt(g.z_0 ?? 0)} mm · l<sub>bd</sub> = {fmt(g.l_bd ?? 0)} mm.</span>
      )}
    </>
  );
}

// ── Tekeningen ──────────────────────────────────────────────────────────────

function PlaatTekening({ ctx, deel, g, W, H }: { ctx: DesignerCtx; deel: number; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const tweezijdig = deel === 2 || Math.round(d("draagwijze")) === 2;
  const lx = Math.max(0.5, d("l_x")), ly = tweezijdig ? Math.max(0.5, d("l_y")) : Math.max(0.5, d("l_x")) * 0.8;
  const mL = 90, mR = 90, mT = 60, mB = 70;
  const s = clamp(Math.min((W - mL - mR) / lx, (H - mT - mB) / ly), 5, 400);
  const cx = mL + (W - mL - mR) / 2, cy = mT + (H - mT - mB) / 2;
  const x0 = cx - (lx * s) / 2, x1 = cx + (lx * s) / 2;
  const y0 = cy - (ly * s) / 2, y1 = cy + (ly * s) / 2; // y1 is de rand y = 0 (onder in beeld)
  const buur = 26;
  const rand = (k: string) => (tweezijdig || k.startsWith("rand_x") ? Math.round(d(k)) : -1);

  /** Eén rand: van (ax, ay) naar (bx, by), met de buitenkant in de richting (nx, ny). */
  const tekenRand = (soort: number, ax: number, ay: number, bx: number, by: number, nx: number, ny: number, key: string) => {
    if (soort === -1) {
      return <line key={key} x1={ax} y1={ay} x2={bx} y2={by} stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 4" />;
    }
    if (soort === 1) {
      // doorgaand: een stuk van het buurveld
      const pts = `${ax},${ay} ${bx},${by} ${bx + nx * buur},${by + ny * buur} ${ax + nx * buur},${ay + ny * buur}`;
      return (
        <g key={key}>
          <polygon points={pts} fill="#e5e7eb" stroke="none" />
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#374151" strokeWidth={1.4} strokeDasharray="7 4" />
        </g>
      );
    }
    if (soort === 2) {
      // ingeklemd: een wand met arcering
      const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 12));
      const streep = Array.from({ length: n + 1 }, (_, i) => {
        const px = ax + ((bx - ax) * i) / n, py = ay + ((by - ay) * i) / n;
        return <line key={i} x1={px} y1={py} x2={px + nx * 10 + (ny !== 0 ? 6 : 0)} y2={py + ny * 10 + (nx !== 0 ? 6 : 0)} stroke="#374151" strokeWidth={0.9} />;
      });
      return (
        <g key={key}>
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#111827" strokeWidth={3} />
          {streep}
        </g>
      );
    }
    // vrij opgelegd of randkolom
    return <line key={key} x1={ax} y1={ay} x2={bx} y2={by} stroke="#111827" strokeWidth={1.6} />;
  };

  const bk = 0.5 * Math.min(lx, ly) * s; // kolomstrook, figuur I.1
  const m = (n: string, dec = 1) => (g[n] === undefined ? "—" : fmt(g[n], dec));
  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bp" />
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={betonFill("bp")} stroke="none" />
        {deel === 2 && (
          <g fill="rgba(37,99,235,0.10)" stroke="none">
            <rect x={x0} y={y0} width={x1 - x0} height={bk / 2} />
            <rect x={x0} y={y1 - bk / 2} width={x1 - x0} height={bk / 2} />
            <rect x={x0} y={y0} width={bk / 2} height={y1 - y0} />
            <rect x={x1 - bk / 2} y={y0} width={bk / 2} height={y1 - y0} />
          </g>
        )}
        {tekenRand(rand("rand_x0"), x0, y0, x0, y1, -1, 0, "x0")}
        {tekenRand(rand("rand_x1"), x1, y0, x1, y1, 1, 0, "x1")}
        {tekenRand(rand("rand_y0"), x0, y1, x1, y1, 0, 1, "y0")}
        {tekenRand(rand("rand_y1"), x0, y0, x1, y0, 0, -1, "y1")}
        {deel === 2 && [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py], i) => (
          <rect key={i} x={px - 7} y={py - 7} width={14} height={14} fill="#6b7280" stroke="#111827" strokeWidth={1} />
        ))}
        {/* draagrichtingen */}
        <line x1={cx - Math.min(60, (x1 - x0) * 0.3)} y1={cy + 22} x2={cx + Math.min(60, (x1 - x0) * 0.3)} y2={cy + 22} stroke="#1e3a8a" strokeWidth={1.2} markerEnd={loadMark("bp")} markerStart={loadMark("bp")} />
        {tweezijdig && <line x1={cx - 70} y1={cy - Math.min(50, (y1 - y0) * 0.3)} x2={cx - 70} y2={cy + Math.min(50, (y1 - y0) * 0.3)} stroke="#1e3a8a" strokeWidth={1.2} markerEnd={loadMark("bp")} markerStart={loadMark("bp")} />}
        <HDim k="bp" x0={x0} x1={x1} y={y1 + 42} ext={y1 + 6} />
        {tweezijdig && <VDim k="bp" y0={y0} y1={y1} x={x0 - 46} ext={x0 - 6} />}
      </svg>

      <Dim ctx={ctx} name="l_x" value={d("l_x")} x={cx} y={y1 + 42} step={0.1} dec={2} label="lx" />
      {tweezijdig && <Dim ctx={ctx} name="l_y" value={d("l_y")} x={x0 - 46} y={cy} step={0.1} dec={2} label="ly" />}
      <Ro text={`onder x: m=${m("m_Ed_xo")}`} x={cx} y={cy + 38} kleur="#1e3a8a" title="rekenmoment per m, x-richting, onder (uit het blad)" />
      {tweezijdig && deel !== 2 && <Ro text={`onder y: m=${m("m_Ed_yo")}`} x={cx - 70} y={cy - Math.min(50, (y1 - y0) * 0.3) - 14} kleur="#1e3a8a" title="rekenmoment per m, y-richting, onder" />}
      {deel === 2 && <Ro text={`onder y: m=${m("m_Ed_yo")}`} x={cx - 70} y={cy - Math.min(50, (y1 - y0) * 0.3) - 14} kleur="#1e3a8a" />}
      {(g.m_Ed_xb ?? 0) > 0 && <Ro text={`boven x: m=${m("m_Ed_xb")}`} x={x1 - 70} y={cy - 16} kleur="#b91c1c" title={deel === 2 ? "kolomstrook, boven" : "boven: bij de randen en in de hoeken"} />}
      {(g.m_Ed_yb ?? 0) > 0 && <Ro text={`boven y: m=${m("m_Ed_yb")}`} x={cx + 40} y={y0 + 18} kleur="#b91c1c" title={deel === 2 ? "kolomstrook, boven" : "boven"} />}
      {deel === 2 && <Ro text="kolomstrook" x={x0 + (x1 - x0) * 0.75} y={y1 - bk / 4} kleur="#1d4ed8" title="0,5·l_min breed, de helft aan elke kant van de kolomlijn (figuur I.1)" />}
      {deel === 2 && <Ro text="middenstrook" x={x0 + (x1 - x0) * 0.75} y={y1 - bk / 2 - 14} kleur="#6b7280" />}
      <Ro text="kNm per m" x={cx} y={cy + 54} />
    </>
  );
}

function ConsoleTekening({ ctx, g, W, H }: { ctx: DesignerCtx; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const hc = Math.max(100, d("h_con")), lc = Math.max(80, d("l_con"));
  const ac = clamp(d("a_con"), 0, lc), lo = clamp(d("l_opl"), 10, lc), ho = clamp(d("h_opl"), 0, 200);
  const cDek = Math.max(0, d("c_con")), dsH = Math.max(6, d("ds_hfd")), dsB = Math.max(0, d("ds_bgl"));
  const dCon = g.d_con ?? hc - cDek - dsB - dsH / 2;
  const tk = Math.max(200, 0.8 * hc); // kolomdikte, alleen voor de tekening
  const s = clamp(Math.min((W - 190) / (tk + lc + 60), (H - 120) / (hc * 2.3)), 0.05, 3);
  const xf = 90 + tk * s;                  // kolomvlak
  const yt = (H - hc * s) / 2 - 10;        // bovenkant console
  const yb = yt + hc * s;
  const yKolom0 = Math.max(8, yt - 0.7 * hc * s), yKolom1 = Math.min(H - 8, yb + 0.7 * hc * s);
  const yTie = yt + (hc - dCon) * s;
  const xL = xf + ac * s;
  const z0 = g.z_0, y0 = g.y_0;
  const xFront = xf + lc * s;
  const beugelsHorizontaal = ac <= 0.5 * hc;
  const nB = clamp(Math.round(d("n_bgl")), 0, 12);
  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bc" />
        {/* kolom en console */}
        <rect x={90} y={yKolom0} width={tk * s} height={yKolom1 - yKolom0} fill={betonFill("bc")} stroke="#6b7280" strokeWidth={1.2} />
        <rect x={xf} y={yt} width={lc * s} height={hc * s} fill={betonFill("bc")} stroke="#6b7280" strokeWidth={1.2} />
        <line x1={xf} y1={yt + 1} x2={xf} y2={yb - 1} stroke="#e7e9ec" strokeWidth={2} />
        {/* oplegplaat */}
        <rect x={xf + (ac - lo / 2) * s} y={yt - Math.max(3, ho * s)} width={lo * s} height={Math.max(3, ho * s)} fill="#9ca3af" stroke="#4b5563" strokeWidth={1} />
        {/* beugels */}
        {Array.from({ length: nB }, (_, i) => beugelsHorizontaal ? (
          <line key={i} x1={xf - 20} y1={yTie + ((i + 1) * (yb - yTie)) / (nB + 1) * 0.8} x2={xFront - cDek * s}
            y2={yTie + ((i + 1) * (yb - yTie)) / (nB + 1) * 0.8} stroke="#1e3a8a" strokeWidth={1} strokeDasharray="6 3" />
        ) : (
          <line key={i} x1={xf + ((i + 1) * (lc * s - cDek * s)) / (nB + 1)} y1={yt + cDek * s}
            x2={xf + ((i + 1) * (lc * s - cDek * s)) / (nB + 1)} y2={yb - cDek * s} stroke="#1e3a8a" strokeWidth={1} strokeDasharray="6 3" />
        ))}
        {/* trekband */}
        <line x1={90 + 12} y1={yTie} x2={xFront - cDek * s} y2={yTie} stroke="#1d4ed8" strokeWidth={Math.max(2, dsH * s * 0.6)} />
        {/* drukdiagonaal en drukzone uit het blad */}
        {z0 !== undefined && (
          <>
            <line x1={xL} y1={yTie} x2={xf} y2={yTie + z0 * s} stroke="#dc2626" strokeWidth={2.4} />
            <circle cx={xL} cy={yTie} r={4} fill="#dc2626" />
            <circle cx={xf} cy={yTie + z0 * s} r={4} fill="#dc2626" />
          </>
        )}
        {y0 !== undefined && <rect x={xf - 8} y={yb - y0 * s} width={8} height={y0 * s} fill="rgba(220,38,38,0.35)" stroke="none" />}
        {/* krachten */}
        <line x1={xL} y1={yt - Math.max(3, ho * s) - 46} x2={xL} y2={yt - Math.max(3, ho * s) - 2} stroke="#dc2626" strokeWidth={2} markerEnd={loadMark("bc")} />
        <line x1={xL} y1={yt - Math.max(3, ho * s)} x2={xL + 46} y2={yt - Math.max(3, ho * s)} stroke="#dc2626" strokeWidth={2} markerEnd={loadMark("bc")} />
        {/* maatlijnen */}
        <HDim k="bc" x0={xf} x1={xL} y={yb + 26} ext={yb + 4} />
        <HDim k="bc" x0={xf} x1={xFront} y={yb + 52} ext={yb + 4} />
        <VDim k="bc" y0={yt} y1={yb} x={xFront + 34} ext={xFront + 4} />
      </svg>

      <Dim ctx={ctx} name="a_con" value={d("a_con")} x={(xf + xL) / 2} y={yb + 26} step={10} label="ac" />
      <Dim ctx={ctx} name="l_con" value={d("l_con")} x={(xf + xFront) / 2} y={yb + 52} step={10} label="l" />
      <Dim ctx={ctx} name="h_con" value={d("h_con")} x={xFront + 34} y={(yt + yb) / 2} step={10} label="hc" />
      <Force ctx={ctx} name="F_Ed" value={d("F_Ed")} x={xL} y={yt - Math.max(3, ho * s) - 58} unit="kN" label="F" step={10} />
      <Force ctx={ctx} name="H_Ed" value={d("H_Ed")} x={xL + 76} y={yt - Math.max(3, ho * s)} unit="kN" label="H" step={5} />
      {g.F_td !== undefined && <Ro text={`Ftd=${fmt(g.F_td, 1)} kN`} x={(xf + xFront) / 2 + 30} y={yTie - 12} kleur="#1d4ed8" title="trekband uit het blad" />}
      {z0 !== undefined && <Ro text={`z0=${fmt(z0)}`} x={xf + 34} y={yTie + (z0 * s) / 2} kleur="#dc2626" title="inwendige hefboomsarm uit het blad" />}
      {y0 !== undefined && <Ro text={`y0=${fmt(y0)}`} x={xf - 40} y={yb - (y0 * s) / 2} kleur="#dc2626" title="drukzone aan de kolomzijde" />}
      <Ro text="kolom" x={90 + (tk * s) / 2} y={yKolom0 + 12} />
      <Ro text={beugelsHorizontaal ? "beugels horizontaal (J.3(2))" : "beugels verticaal (J.3(3))"} x={(xf + xFront) / 2} y={yb + 78} kleur="#1e3a8a" />
    </>
  );
}
