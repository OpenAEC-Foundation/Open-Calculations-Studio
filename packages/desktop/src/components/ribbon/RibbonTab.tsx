interface RibbonTabProps {
  label: string;
  isActive?: boolean;
  isFileTab?: boolean;
  onClick: () => void;
}

export default function RibbonTab({ label, isActive, isFileTab, onClick }: RibbonTabProps) {
  return (
    <button
      className={`ribbon-tab${isActive ? " active" : ""}${isFileTab ? " file-tab" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
