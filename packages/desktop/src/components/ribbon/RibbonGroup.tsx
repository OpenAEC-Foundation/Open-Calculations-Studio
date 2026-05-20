import { ReactNode } from "react";

interface RibbonGroupProps {
  label: string;
  children: ReactNode;
}

export default function RibbonGroup({ label, children }: RibbonGroupProps) {
  return (
    <div className="ribbon-group">
      <div className="ribbon-group-content">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  );
}
