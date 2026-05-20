import { useEffect, useRef, useCallback, type ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  height?: number | string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  width = 480,
  height,
  className,
  children,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".modal-close-btn")) return;
    isDragging.current = true;
    const rect = dialogRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !dialogRef.current || !overlayRef.current) return;
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const dialogRect = dialogRef.current.getBoundingClientRect();
      let newX = e.clientX - overlayRect.left - dragOffset.current.x;
      let newY = e.clientY - overlayRect.top - dragOffset.current.y;
      newX = Math.max(0, Math.min(newX, overlayRect.width - dialogRect.width));
      newY = Math.max(0, Math.min(newY, overlayRect.height - dialogRect.height));
      dialogRef.current.style.left = newX + "px";
      dialogRef.current.style.top = newY + "px";
      dialogRef.current.style.transform = "none";
      dialogRef.current.style.position = "absolute";
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Reset position when reopened
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.style.left = "50%";
      dialogRef.current.style.top = "50%";
      dialogRef.current.style.transform = "translate(-50%, -50%)";
      dialogRef.current.style.position = "absolute";
    }
  }, [open]);

  if (!open) return null;

  const style: React.CSSProperties = { width };
  if (height) style.height = height;

  return (
    <div className="modal-overlay" ref={overlayRef}>
      <div
        className={`modal-dialog${className ? ` ${className}` : ""}`}
        ref={dialogRef}
        style={style}
      >
        <div className="modal-header" onMouseDown={handleHeaderMouseDown}>
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
