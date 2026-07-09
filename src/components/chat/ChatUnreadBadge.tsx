import { useEffect, useRef } from "react";

interface ChatUnreadBadgeProps {
  count: number;
}

export function ChatUnreadBadge({ count }: ChatUnreadBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count > previousCount.current && ref.current) {
      ref.current.classList.remove("jl-unread-badge-pulse");
      void ref.current.offsetWidth;
      ref.current.classList.add("jl-unread-badge-pulse");
    }
    previousCount.current = count;
  }, [count]);

  if (count <= 0) {
    return null;
  }

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      ref={ref}
      className="jl-unread-badge"
      aria-label={`${count} unread chat messages`}
    >
      {count > 1 ? label : null}
    </span>
  );
}
