import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { loadMotionModule } from "./lazyMotion";
import type { MotionSharedElementId } from "./sharedElements";

interface FramerSharedElementProps {
  id: MotionSharedElementId;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function FramerSharedElement({
  id,
  children,
  className,
  style,
}: FramerSharedElementProps) {
  const [MotionTag, setMotionTag] = useState<
    typeof import("motion/react").motion.div | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    void loadMotionModule().then((mod) => {
      if (!cancelled) {
        setMotionTag(() => mod.motion.div);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!MotionTag) {
    if (className || style) {
      return (
        <div className={className} style={style} aria-hidden={children ? undefined : true}>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  const Tag = MotionTag;
  return (
    <Tag layoutId={id} className={className} style={style} aria-hidden={children ? undefined : true}>
      {children}
    </Tag>
  );
}
