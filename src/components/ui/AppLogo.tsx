import type { SVGProps } from "react";

const COLORS = {
  surfaceDeep: "#0E132C",
  action: "#C55B40",
  brandBlue: "#4378B1",
  highlight: "#E4B352",
  ink: "#F3F4F5",
} as const;

const MARK_SIZES = { sm: 32, md: 48, lg: 64 } as const;

type MarkSize = keyof typeof MARK_SIZES;

type RadarSweepMarkProps = SVGProps<SVGSVGElement> & {
  /** Lighter geometry for favicon-scale rendering */
  compact?: boolean;
};

/** Radar sweep icon geometry — shared by AppLogo and static PWA assets */
export function RadarSweepMark({
  compact = false,
  ...props
}: RadarSweepMarkProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <rect width="64" height="64" rx="12" fill={COLORS.surfaceDeep} />
      <circle
        cx="32"
        cy="32"
        r="18"
        stroke={COLORS.action}
        strokeWidth="4"
        fill="none"
      />
      {!compact ? (
        <circle
          cx="32"
          cy="32"
          r="12"
          stroke={COLORS.brandBlue}
          strokeWidth="2.5"
          fill="none"
        />
      ) : null}
      <path
        d="M32 32 L44.7 19.3 A18 18 0 0 1 44.7 44.7 Z"
        fill={COLORS.highlight}
        fillOpacity={compact ? 0.5 : 0.35}
      />
      {compact ? (
        <path
          d="M32 32 L44.7 19.3"
          stroke={COLORS.highlight}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : null}
      <path
        d="M32 16v32M16 32h32"
        stroke={COLORS.brandBlue}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="2.5" fill={COLORS.ink} />
    </svg>
  );
}

type AppLogoProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  variant?: "mark" | "lockup";
  size?: MarkSize;
};

const WORDMARK_CLASSES: Record<MarkSize, string> = {
  sm: "text-xs tracking-[0.16em]",
  md: "text-sm tracking-[0.2em]",
  lg: "text-sm tracking-[0.2em]",
};

export function AppLogo({
  variant = "mark",
  size = "md",
  className,
  ...props
}: AppLogoProps) {
  const markPx = MARK_SIZES[size];

  if (variant === "mark") {
    return (
      <RadarSweepMark
        width={markPx}
        height={markPx}
        role="img"
        aria-label="Jet Lag Map Companion"
        className={className}
        {...props}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 ${className ?? ""}`}
      role="img"
      aria-label="Jet Lag Map Companion"
    >
      <RadarSweepMark
        width={markPx}
        height={markPx}
        aria-hidden="true"
        className="shrink-0"
      />
      <span
        className={`font-display font-semibold uppercase text-brand-blue ${WORDMARK_CLASSES[size]}`}
      >
        Jet Lag
      </span>
    </div>
  );
}
