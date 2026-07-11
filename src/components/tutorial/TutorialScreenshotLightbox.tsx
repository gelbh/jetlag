import { useEffect, useRef } from "react";
import { useMotionProfile } from "../../hooks/location/useMotionProfile";

interface TutorialScreenshotLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export function TutorialScreenshotLightbox({
  src,
  alt,
  open,
  onClose,
}: TutorialScreenshotLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { animate } = useMotionProfile();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`tutorial-screenshot-lightbox ${animate ? "tutorial-screenshot-lightbox-animated" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="tutorial-screenshot-lightbox-inner">
        <button
          type="button"
          onClick={onClose}
          className="tutorial-screenshot-lightbox-close hud-chrome"
          aria-label="Close screenshot"
        >
          ×
        </button>
        <img
          src={src}
          alt={alt}
          className="tutorial-screenshot-lightbox-image"
          decoding="async"
        />
      </div>
    </dialog>
  );
}
