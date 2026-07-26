type LoadingSpinnerSize = "sm" | "md";

const RING_SIZE_CLASS: Record<LoadingSpinnerSize, string> = {
  sm: "size-3.5",
  md: "size-4",
};

interface LoadingSpinnerRingProps {
  size?: LoadingSpinnerSize;
  className?: string;
}

export function LoadingSpinnerRing({
  size = "sm",
  className = "",
}: LoadingSpinnerRingProps) {
  return (
    <span
      className={`loading-spinner shrink-0 rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${RING_SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden
    />
  );
}
