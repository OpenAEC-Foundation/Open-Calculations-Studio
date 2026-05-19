import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import RibbonButtonStack from "./RibbonButtonStack";
import {
  reportNewIcon,
  ifcImportIcon,
  ifcExportIcon,
  undoIcon,
  redoIcon,
  reportPreviewIcon,
  reportGenerateIcon,
  boldIcon,
  italicIcon,
  reportTemplateIcon,
  imageIcon,
  rectangleIcon,
  tableIcon,
  pencilIcon,
} from "./icons";
import { parse, evaluate } from "@ifc-calc/core";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { previewPdfReport, savePdfReport } from "../../tauri/pdfReport";
import { openCalculationFile } from "../../tauri/fileOps";
import PdfPreviewModal from "../calc/PdfPreviewModal";

interface CalcTabProps {
  onSettingsClick?: () => void;
}

export default function CalcTab({ onSettingsClick: _onSettingsClick }: CalcTabProps) {
  const { t } = useTranslation("ribbon");
  const source = useDocumentStore((s) => s.source);
  const filePath = useDocumentStore((s) => s.filePath);
  const loadTemplate = useDocumentStore((s) => s.loadTemplate);
  // PDF export uses the currently active load case's values so the exported
  // report reflects whichever scenario the user is looking at.
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const selectValues = valuesByCase[activeId] ?? {};
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpen = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      loadTemplate(file.content, file.name);
    } catch (err) {
      console.error("Open file failed:", err);
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [loadTemplate]);

  const projectName = filePath ?? "Berekening";

  const evaluateCurrent = useCallback(() => {
    const ast = parse(source);
    return evaluate(ast, selectValues);
  }, [source, selectValues]);

  const handlePreviewPdf = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const generatePdfPath = useCallback(async () => {
    const nodes = evaluateCurrent();
    return previewPdfReport(nodes, projectName);
  }, [evaluateCurrent, projectName]);

  const handleSavePdf = useCallback(async () => {
    try {
      const nodes = evaluateCurrent();
      return await savePdfReport(nodes, projectName);
    } catch (err) {
      console.error("PDF save failed:", err);
      alert(`PDF opslaan mislukt: ${(err as Error).message}`);
      return null;
    }
  }, [evaluateCurrent, projectName]);

  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("calc.file", "Bestand")}>
          <RibbonButton icon={reportNewIcon} label={t("calc.new", "Nieuw")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcImportIcon} label={t("calc.open", "Openen")} size="large" onClick={handleOpen} />
          <RibbonButton icon={ifcExportIcon} label={t("calc.save", "Opslaan")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.edit", "Bewerken")}>
          <RibbonButtonStack>
            <RibbonButton icon={undoIcon} label={t("calc.undo", "Ongedaan")} size="small" onClick={() => {}} />
            <RibbonButton icon={redoIcon} label={t("calc.redo", "Opnieuw")} size="small" onClick={() => {}} />
          </RibbonButtonStack>
        </RibbonGroup>

        <RibbonGroup label={t("insert.elements", "Invoegen")}>
          <RibbonButton icon={boldIcon} label={t("insert.heading", "Kop")} size="large" onClick={() => {}} />
          <RibbonButton icon={italicIcon} label={t("insert.formula", "Formule")} size="large" onClick={() => {}} />
          <RibbonButton icon={reportTemplateIcon} label={t("insert.select", "Keuzelijst")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("insert.media", "Media")}>
          <RibbonButton icon={imageIcon} label={t("insert.image", "Afbeelding")} size="large" onClick={() => {}} />
          <RibbonButton icon={rectangleIcon} label={t("insert.svg", "SVG")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("view.layout", "Weergave")}>
          <RibbonButton icon={tableIcon} label={t("view.split", "Splitsen")} size="large" onClick={() => {}} />
          <RibbonButton icon={pencilIcon} label={t("view.editor", "Editor")} size="large" onClick={() => {}} />
          <RibbonButton icon={reportPreviewIcon} label={t("view.preview", "Preview")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.export", "Exporteren")}>
          <RibbonButton
            icon={reportPreviewIcon}
            label={t("calc.pdfPreview", "PDF voorvertonen")}
            size="large"
            onClick={handlePreviewPdf}
          />
          <RibbonButton
            icon={ifcExportIcon}
            label={t("calc.pdfSave", "PDF opslaan")}
            size="large"
            onClick={handleSavePdf}
          />
          <RibbonButton icon={reportGenerateIcon} label={t("calc.ifcExport", "IFC")} size="large" onClick={() => {}} />
        </RibbonGroup>
      </div>

      <PdfPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        projectName={projectName}
        generate={generatePdfPath}
        onSave={handleSavePdf}
      />
    </div>
  );
}
