import { lazy, Suspense, useContext } from "react";
import { AnimatedOverlay, type AnimatedOverlayProps } from "../ui/AnimatedOverlay";
import { MotionCapabilityContext } from "./motionCapabilityContext";

const FramerSheet = lazy(() => import("./FramerSheet"));

export function MotionSheet(props: AnimatedOverlayProps) {
  const capability = useContext(MotionCapabilityContext);
  const renderer = capability?.renderer ?? "css";
  const framerReady = capability?.framerReady ?? false;

  if (renderer === "framer" && framerReady) {
    return (
      <Suspense fallback={<AnimatedOverlay {...props} />}>
        <FramerSheet {...props} />
      </Suspense>
    );
  }

  return <AnimatedOverlay {...props} />;
}
