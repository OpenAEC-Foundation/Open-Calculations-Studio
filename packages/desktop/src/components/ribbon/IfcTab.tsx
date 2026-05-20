/**
 * Ribbon tab for the IFC view.
 *
 * Intentionally empty — the IFC panel (IfcViewerPanel) is the working area and
 * shows the same IFCX document that gets saved to disk as a .ifc-calculation
 * file. No ribbon actions are needed; export/import flow is via File → Save /
 * File → Open in the Calc tab.
 */
export default function IfcTab() {
  return <div className="ribbon-content"><div className="ribbon-groups" /></div>;
}
