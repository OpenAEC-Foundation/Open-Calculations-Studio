import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import RibbonButtonStack from "./RibbonButtonStack";
import {
  newDocIcon,
  openFolderIcon,
  saveDiskIcon,
  undoIcon,
  redoIcon,
  imageIcon,
  pdfIcon,
} from "./calcIcons";
import { undo, redo } from "@codemirror/commands";
import { parse, evaluate, generateIfcx } from "@ifc-calc/core";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { useEditorViewStore } from "../../store/editorViewStore";
import { savePdfReport } from "../../tauri/pdfReport";
import { openCalculationFile, saveCalculationFile, openImageOrSvgDialog } from "../../tauri/fileOps";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { useRecentFiles } from "../../hooks/useRecentFiles";

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
  const { addRecentFile } = useRecentFiles();

  const handleOpen = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      loadTemplate(file.content, file.name);
      useDocumentStore.getState().markSaved(file.path);
      await addRecentFile({
        path: file.path,
        name: file.name,
        type: "report",
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Open file failed:", err);
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [loadTemplate, addRecentFile]);

  const projectName = filePath ?? "Berekening";

  const evaluateCurrent = useCallback(() => {
    const ast = parse(source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
    return evaluate(ast, selectValues);
  }, [source, selectValues]);

  const handleSave = useCallback(async () => {
    try {
      // Save as IFCX (.ifccalculation) — the IFCX document IS the file, with
      // the CalcPAD source embedded under `source.content` + the full project
      // sheets[] under `source.project.sheets` for multi-sheet round-trip.
      const nodes = evaluateCurrent();
      const ifcx = generateIfcx(nodes, { projectName });
      const { useProjectStore } = await import("../../store/projectStore");
      const sheets = useProjectStore.getState().sheets;
      const path = await saveCalculationFile(source, ifcx, projectName, sheets);
      if (path) {
        useDocumentStore.getState().markSaved(path);
      }
    } catch (err) {
      console.error("Save file failed:", err);
      alert(`Bestand opslaan mislukt: ${(err as Error).message}`);
    }
  }, [source, projectName, evaluateCurrent]);

  const handleNew = useCallback(() => {
    if (useDocumentStore.getState().dirty) {
      const ok = confirm("Niet-opgeslagen wijzigingen worden weggegooid. Doorgaan?");
      if (!ok) return;
    }
    loadTemplate("", "Nieuw");
  }, [loadTemplate]);

  const handleUndo = useCallback(() => {
    const view = useEditorViewStore.getState().view;
    if (view) { undo(view); view.focus(); }
  }, []);

  const handleRedo = useCallback(() => {
    const view = useEditorViewStore.getState().view;
    if (view) { redo(view); view.focus(); }
  }, []);

  const handleInsertImage = useCallback(async () => {
    try {
      const file = await openImageOrSvgDialog();
      if (!file) return;
      // SVG → inline-embed via @img(...) so existing parser includes path
      // resolves it. Raster → base64 data URL inside a prose-line <img> tag
      // so the file content survives independent of any include map.
      const view = useEditorViewStore.getState().view;
      const insert = file.kind === "svg"
        ? `\n@img(${file.name})\n`
        : `\n'<img src="${file.dataUrl}" style="max-width:100%;" alt="${file.name}"/>\n`;
      if (view) {
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
        view.focus();
      } else {
        useDocumentStore.getState().setSource(source + insert);
      }
    } catch (err) {
      console.error("Insert image failed:", err);
      alert(`Afbeelding invoegen mislukt: ${(err as Error).message}`);
    }
  }, [source]);

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
          <RibbonButton icon={newDocIcon} label={t("calc.new", "Nieuw")} size="large" onClick={handleNew} />
          <RibbonButton icon={openFolderIcon} label={t("calc.browse", "Browse…")} size="large" onClick={handleOpen} />
          <RibbonButton icon={saveDiskIcon} label={t("calc.save", "Opslaan")} size="large" onClick={handleSave} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.edit", "Bewerken")}>
          <RibbonButtonStack>
            <RibbonButton icon={undoIcon} label={t("calc.undo", "Ongedaan")} size="small" onClick={handleUndo} />
            <RibbonButton icon={redoIcon} label={t("calc.redo", "Opnieuw")} size="small" onClick={handleRedo} />
          </RibbonButtonStack>
        </RibbonGroup>

        <RibbonGroup label={t("insert.media", "Media")}>
          <RibbonButton icon={imageIcon} label={t("insert.image", "Afbeelding")} size="large" onClick={handleInsertImage} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.export", "Exporteren")}>
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.pdfSave", "PDF opslaan")}
            size="large"
            onClick={handleSavePdf}
          />
        </RibbonGroup>
      </div>

    </div>
  );
}
