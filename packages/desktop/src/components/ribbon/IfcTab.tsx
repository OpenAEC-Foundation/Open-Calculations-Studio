import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import {
  ifcImportIcon,
  ifcExportIcon,
  ifcTreeIcon,
  ifcPropertiesIcon,
  ifcValidateIcon,
} from "./calcIcons";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { calcpadIncludes } from "../../templates/calcpad-includes";
import {
  parse,
  evaluate,
  generateIfcx,
  generateIfc4x3Step,
} from "@ifc-calc/core";

/**
 * Ribbon tab for the IFC view — mirrors the OpenAEC style-book demo
 * (File / Model / Tools) and uses the generated IFCX + STEP output as the
 * data source.
 */
export default function IfcTab() {
  const { t } = useTranslation("ribbon");
  const source = useDocumentStore((s) => s.source);
  const filePath = useDocumentStore((s) => s.filePath);
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);

  const buildExports = useCallback(() => {
    const ast = parse(source, { includes: calcpadIncludes });
    const ev = evaluate(ast, valuesByCase[activeId] ?? {});
    const projectName = filePath?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Berekening";
    return {
      projectName,
      ifcx: generateIfcx(ev, { projectName }),
      step: generateIfc4x3Step(ev, { projectName }),
    };
  }, [source, activeId, valuesByCase, filePath]);

  const handleExportStep = useCallback(() => {
    const { projectName, step } = buildExports();
    triggerDownload(step, `${slug(projectName)}.ifc`, "application/x-step");
  }, [buildExports]);

  const handleExportIfcx = useCallback(() => {
    const { projectName, ifcx } = buildExports();
    triggerDownload(JSON.stringify(ifcx, null, 2), `${slug(projectName)}.ifcx`, "application/json");
  }, [buildExports]);

  const handleValidate = useCallback(() => {
    const { ifcx } = buildExports();
    const issues: string[] = [];
    if (!ifcx.header.projectName) issues.push("• projectnaam ontbreekt");
    if (ifcx.data.length < 4) issues.push("• spatial skeleton onvolledig (Project/Site/Building/Storey)");
    const elements = ifcx.data.filter((d) => !["Project", "Site", "Building", "BuildingStorey"].includes(d.type));
    if (elements.length === 0) issues.push("• geen structurele elementen gedetecteerd");
    alert(issues.length === 0
      ? `IFCX valide. ${ifcx.data.length} entries, schema ${ifcx.header.schema ?? "?"}.`
      : `IFCX validatie:\n${issues.join("\n")}`);
  }, [buildExports]);

  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("ifc.fileOps", "Bestand")}>
          <RibbonButton
            icon={ifcImportIcon}
            label={t("ifc.import", "IFC Importeren")}
            size="large"
            onClick={() => alert("IFC importeren komt nog — staat op de roadmap.")}
          />
          <RibbonButton
            icon={ifcExportIcon}
            label={t("ifc.exportStep", "Exporteer .ifc")}
            size="large"
            onClick={handleExportStep}
          />
          <RibbonButton
            icon={ifcExportIcon}
            label={t("ifc.exportIfcx", "Exporteer .ifcx")}
            size="large"
            onClick={handleExportIfcx}
          />
        </RibbonGroup>

        <RibbonGroup label={t("ifc.model", "Model")}>
          <RibbonButton
            icon={ifcTreeIcon}
            label={t("ifc.structure", "Spatial Tree")}
            size="large"
            onClick={() => { /* tree is shown in the IFC panel itself */ }}
          />
          <RibbonButton
            icon={ifcPropertiesIcon}
            label={t("ifc.statistics", "Statistieken")}
            size="large"
            onClick={() => {
              const { ifcx } = buildExports();
              const counts: Record<string, number> = {};
              for (const e of ifcx.data) counts[e.type] = (counts[e.type] ?? 0) + 1;
              const lines = Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join("\n");
              alert(`IFCX statistieken voor "${ifcx.header.projectName}":\n${lines}`);
            }}
          />
        </RibbonGroup>

        <RibbonGroup label={t("ifc.tools", "Gereedschap")}>
          <RibbonButton
            icon={ifcValidateIcon}
            label={t("ifc.validate", "Valideren")}
            size="large"
            onClick={handleValidate}
          />
        </RibbonGroup>
      </div>
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "berekening";
}

function triggerDownload(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
