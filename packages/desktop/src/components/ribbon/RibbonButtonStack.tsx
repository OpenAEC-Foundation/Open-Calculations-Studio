import { ReactNode } from "react";

export default function RibbonButtonStack({ children }: { children: ReactNode }) {
  return <div className="ribbon-btn-stack">{children}</div>;
}
