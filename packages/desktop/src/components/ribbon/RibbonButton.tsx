interface RibbonButtonProps {
  icon: string;
  label: string;
  title?: string;
  size?: "large" | "small" | "medium";
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function RibbonButton({
  icon,
  label,
  title,
  size = "large",
  active,
  disabled,
  onClick,
}: RibbonButtonProps) {
  return (
    <button
      className={`ribbon-btn${size === "small" ? " small" : ""}${size === "medium" ? " medium" : ""}${active ? " active" : ""}`}
      title={title || label}
      disabled={disabled}
      onClick={onClick}
    >
      <div
        className="ribbon-btn-icon"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <span className="ribbon-btn-label">{label}</span>
    </button>
  );
}
