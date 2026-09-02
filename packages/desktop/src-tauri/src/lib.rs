//! Tauri-schil van Open Calculations Studio.
//!
//! De PDF-commando's hieronder gebruiken de OpenAEC-rapportengine
//! (`openaec-core`). Die is **optioneel**: standaard wordt hij niet meegebouwd,
//! zodat dit project op zichzelf te bouwen is zonder zusterrepo. Zonder de
//! `rapportengine`-feature bestaan de commando's nog wel — ze geven dan een
//! nette foutmelding in plaats van dat de aanroep in het niets valt.
//!
//! Afdrukken loopt in de app zelf via de browser
//! (`src/components/calc/PrintDocument.tsx`); die weg neemt ook de tekeningen
//! mee, wat de rapportengine niet doet. Zie `docs/backlog.md`.

#[cfg(feature = "rapportengine")]
mod rapport {
    /// Genereer een PDF met de openaec-core engine.
    ///
    /// Verwacht JSON die overeenkomt met het `ReportData`-schema van
    /// openaec-core (template, project, sections, ...) en geeft de bytes terug.
    pub fn genereer(report: serde_json::Value) -> Result<Vec<u8>, String> {
        let report_data: openaec_core::ReportData = serde_json::from_value(report)
            .map_err(|e| format!("Invalid ReportData JSON: {}", e))?;
        openaec_core::generate_pdf_bytes(&report_data)
            .map_err(|e| format!("PDF engine failed: {}", e))
    }
}

#[cfg(not(feature = "rapportengine"))]
mod rapport {
    pub fn genereer(_report: serde_json::Value) -> Result<Vec<u8>, String> {
        Err("Deze build bevat de OpenAEC-rapportengine niet. Bouw met \
             `--features rapportengine`, of gebruik Afdrukken (Ctrl+P) — die weg \
             neemt ook de tekeningen mee."
            .to_string())
    }
}

/// Genereer een PDF en geef de bytes terug.
#[tauri::command]
fn engine_generate_pdf(report: serde_json::Value) -> Result<Vec<u8>, String> {
    rapport::genereer(report)
}

/// Genereer een PDF en schrijf hem naar `path`. Geeft het aantal bytes terug.
#[tauri::command]
fn engine_save_pdf(report: serde_json::Value, path: String) -> Result<usize, String> {
    let bytes = rapport::genereer(report)?;
    std::fs::write(&path, &bytes)
        .map_err(|e| format!("Failed to write PDF to {}: {}", path, e))?;
    Ok(bytes.len())
}

/// Genereer een PDF in de tijdelijke map en geef het absolute pad terug.
/// Bedoeld voor de voorbeeldweergave in de app: de frontend wikkelt het pad met
/// `convertFileSrc()` en laadt het in een <iframe>.
///
/// De bestandsnaam draagt een tijdstempel, zodat twee voorbeelden elkaar niet
/// overschrijven.
#[tauri::command]
fn engine_preview_pdf(report: serde_json::Value) -> Result<String, String> {
    let bytes = rapport::genereer(report)?;
    let dir = std::env::temp_dir().join("open-calculations-studio");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = dir.join(format!("preview-{}.pdf", ts));
    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to write preview PDF: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            engine_generate_pdf,
            engine_save_pdf,
            engine_preview_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
