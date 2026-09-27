import { useId, type SVGProps } from "react";

/**
 * Curved reply/back arrow (product mark style).
 * Smooth flag → signal gradient; glyph centered on the viewBox midline.
 */
export function JetlagBackChevron({
  size = 22,
  className,
  style,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  const rawId = useId();
  const gradId = `jl-back-grad-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
      style={{ display: "block", flexShrink: 0, ...style }}
      {...props}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="8"
          y1="16"
          x2="40"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--color-flag)" />
          <stop offset="55%" stopColor="var(--color-flag)" />
          <stop offset="100%" stopColor="var(--color-signal)" />
        </linearGradient>
      </defs>

      {/* Stem + U-turn — vertical center ≈ 24 */}
      <path
        d="M22 20.5h10a7.5 7.5 0 0 1 0 15H25"
        stroke={`url(#${gradId})`}
        strokeWidth={7.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Arrowhead — aligned to stem at y=20.5 */}
      <path
        d="M6.5 20.5 20 9.8c.55-.45 1.4-.08 1.4.62v4.6h1.2v11.2h-1.2v4.6c0 .7-.85 1.07-1.4.62L6.5 20.5Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}
