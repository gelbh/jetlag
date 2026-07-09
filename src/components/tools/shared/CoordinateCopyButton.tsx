import { useEffect, useState } from "react";
import { copyToClipboard } from "../../../platform/copyToClipboard";

interface CoordinateCopyButtonProps {
  lat: number;
  lng: number;
  className?: string;
}

type CopyStatus = "idle" | "copied" | "failed";

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function CoordinateCopyButton({
  lat,
  lng,
  className = "",
}: CoordinateCopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const coords = formatCoordinates(lat, lng);

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(coords);
    setStatus(ok ? "copied" : "failed");
  };

  const headline =
    status === "copied"
      ? "Copied"
      : status === "failed"
        ? "Copy failed — try again"
        : "Copy coordinates";

  const liveMessage =
    status === "copied"
      ? "Coordinates copied to clipboard"
      : status === "failed"
        ? "Could not copy coordinates"
        : "";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={`Copy coordinates ${coords}`}
        className={`flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-[var(--radius-hud-md)] border border-border bg-surface-raised px-3 py-2 text-left text-sm font-medium ${className}`}
      >
        <span
          className={
            status === "failed" ? "text-status-error" : "text-ink-secondary"
          }
        >
          {headline}
        </span>
        {status === "idle" ? (
          <span className="w-full truncate font-mono text-xs text-ink-muted">
            {coords}
          </span>
        ) : null}
      </button>
      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
    </>
  );
}
