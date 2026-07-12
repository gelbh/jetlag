import { useState } from "react";
import { TutorialScreenshotLightbox } from "./TutorialScreenshotLightbox";

interface TutorialScreenshotProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
}

export function TutorialScreenshot({
  src,
  alt,
  className = "object-contain object-top",
  fill = false,
}: TutorialScreenshotProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const frameClass = fill
    ? "tutorial-screenshot-frame tutorial-screenshot-frame-fill inline-flex max-h-full max-w-full"
    : "tutorial-screenshot-frame mx-auto w-full max-w-[min(100%,24.375rem)]";

  const imageClass = fill
    ? `block h-auto w-auto max-h-full max-w-full ${className}`
    : `block w-full max-h-[min(56dvh,32rem)] ${className}`;

  const panelClass = fill
    ? "hud-panel inline-flex max-h-full max-w-full items-center justify-center overflow-hidden"
    : "hud-panel flex items-center justify-center overflow-hidden";

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={`${frameClass} cursor-zoom-in border-0 bg-transparent p-0 text-left`}
        aria-label={`View full screenshot: ${alt}`}
      >
        <div className={panelClass}>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={imageClass}
          />
        </div>
      </button>
      <TutorialScreenshotLightbox
        src={src}
        alt={alt}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
