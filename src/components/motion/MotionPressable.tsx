import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { impactLight } from "../../services/device/hapticsService";
import { useMotionProfile } from "../../hooks/useMotionProfile";

type MotionPressableProps = ComponentPropsWithoutRef<"button"> & {
  as?: "button" | "div" | "a";
  children?: ReactNode;
  href?: string;
};

export function MotionPressable({
  as = "button",
  className = "",
  children,
  onClick,
  ...rest
}: MotionPressableProps) {
  const { decorativeAnimate } = useMotionProfile();
  const cssClass = `hud-pressable-css ${className}`;

  const handleClick: MotionPressableProps["onClick"] = (event) => {
    if (decorativeAnimate) {
      void impactLight();
    }
    onClick?.(event);
  };

  const pressProps = onClick ? { ...rest, onClick: handleClick } : rest;

  if (as === "div") {
    return (
      <div className={cssClass} {...(pressProps as ComponentPropsWithoutRef<"div">)}>
        {children}
      </div>
    );
  }

  if (as === "a") {
    return (
      <a className={cssClass} {...(pressProps as ComponentPropsWithoutRef<"a">)}>
        {children}
      </a>
    );
  }

  return (
    <button className={cssClass} {...pressProps}>
      {children}
    </button>
  );
}
