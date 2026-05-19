/// Generate a PDF report using the openaec-core engine.
///
/// Accepts a JSON `serde_json::Value` matching the openaec-core `ReportData`
/// schema (template, project, sections, ...). Returns the PDF bytes so the
/// frontend can stream/save them via `tauri-plugin-fs` or trigger a download.
#[tauri::command]
fn engine_generate_pdf(report: serde_json::Value) -> Result<Vec<u8>, String> {
    let report_data: openaec_core::ReportData = serde_json::from_value(report)
        .map_err(|e| format!("Invalid ReportData JSON: {}", e))?;
    openaec_core::generate_pdf_bytes(&report_data)
        .map_err(|e| format!("PDF engine failed: {}", e))
}

/// Generate a PDF and write it directly to disk at `path`.
/// Returns the byte count written so the frontend can confirm success.
#[tauri::command]
fn engine_save_pdf(report: serde_json::Value, path: String) -> Result<usize, String> {
    let bytes = engine_generate_pdf(report)?;
    std::fs::write(&path, &bytes)
        .map_err(|e| format!("Failed to write PDF to {}: {}", path, e))?;
    Ok(bytes.len())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
