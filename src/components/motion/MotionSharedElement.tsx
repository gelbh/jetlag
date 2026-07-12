import { lazy, Suspense, useContext, type CSSProperties, type ReactNode } from "react";
import { allowsSharedElements } from "../../domain/device/motionCapability";
import { MotionCapabilityContext } from "./motionCapabilityContext";
import type { MotionSharedElementId } from "./sharedElements";

const FramerSharedElement = lazy(() => import("./FramerSharedElement"));

interface MotionSharedElementProps {
  id: MotionSharedElementId;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function MotionSharedElement({
  id,
  children,
  className,
  style,
}: MotionSharedElementProps) {
  const capability = useContext(MotionCapabilityContext);
  const tier = capability?.tier ?? "css";
  const renderer = capability?.renderer ?? "css";
  const framerReady = capability?.framerReady ?? false;

  if (
    !allowsSharedElements(tier) ||
    renderer !== "framer" ||
    !framerReady
  ) {
    if (className || style) {
      return (
        <div className={className} style={style} aria-hidden={children ? undefined : true}>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  return (
    <Suspense
      fallback={
        className || style ? (
          <div className={className} style={style} aria-hidden={children ? undefined : true}>
            {children}
          </div>
        ) : (
          children
        )
      }
    >
      <FramerSharedElement id={id} className={className} style={style}>
        {children}
      </FramerSharedElement>
    </Suspense>
  );
}
