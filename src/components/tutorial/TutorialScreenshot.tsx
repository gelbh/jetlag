interface TutorialScreenshotProps {
  src: string;
  alt: string;
  className?: string;
  variant?: "phone" | "map-focus";
}

export function TutorialScreenshot({
  src,
  alt,
  className = "object-contain object-top",
  variant = "phone",
}: TutorialScreenshotProps) {
  const maxHeightClass =
    variant === "map-focus"
      ? "max-h-[min(50dvh,28rem)]"
      : "max-h-[min(56dvh,32rem)]";

  return (
    <div className="tutorial-screenshot-frame mx-auto w-full max-w-[min(100%,24.375rem)]">
      <div className="hud-panel overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`block w-full bg-map-canvas ${maxHeightClass} ${className}`}
        />
      </div>
    </div>
  );
}
