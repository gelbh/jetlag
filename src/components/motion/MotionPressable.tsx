import { lazy, Suspense, useContext, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { impactLightForTier } from "../../services/device/hapticsService";
import { MotionCapabilityContext } from "./MotionCapabilityProvider";

const FramerPressable = lazy(() => import("./FramerPressable"));

type MotionPressableProps = ComponentPropsWithoutRef<"button"> & {
  as?: "button" | "div" | "a";
  children?: ReactNode;
  href?: string;
};

function CssPressable({
  as = "button",
  className = "",
  children,
  ...rest
}: MotionPressableProps) {
  const cssClass = `hud-pressable-css ${className}`;

  if (as === "div") {
    return (
      <div className={cssClass} {...(rest as ComponentPropsWithoutRef<"div">)}>
        {children}
      </div>
    );
  }

  if (as === "a") {
    return (
      <a className={cssClass} {...(rest as ComponentPropsWithoutRef<"a">)}>
        {children}
      </a>
    );
  }

  return (
    <button className={cssClass} {...rest}>
      {children}
    </button>
  );
}

export function MotionPressable({
  onClick,
  ...props
}: MotionPressableProps) {
  const capability = useContext(MotionCapabilityContext);
  const renderer = capability?.renderer ?? "css";
  const framerReady = capability?.framerReady ?? false;
  const tier = capability?.tier ?? "css";

  const handleClick: MotionPressableProps["onClick"] = (event) => {
    void impactLightForTier(tier);
    onClick?.(event);
  };

  const pressProps = onClick ? { ...props, onClick: handleClick } : props;

  if (renderer === "framer" && framerReady) {
    return (
      <Suspense fallback={<CssPressable {...pressProps} />}>
        <FramerPressable {...pressProps} />
      </Suspense>
    );
  }

  return <CssPressable {...pressProps} />;
}
