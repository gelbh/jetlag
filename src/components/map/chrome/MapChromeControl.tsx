import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MotionPressable } from "../../motion/MotionPressable";

export type MapChromeControlVariant = "floating" | "slot";

export interface MapChromeControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** `floating` = map portal square; `slot` = side-dock tool chip. */
  variant?: MapChromeControlVariant;
  /** Toggle / selected state (`aria-pressed` + active chrome class). */
  pressed?: boolean;
  icon?: ReactNode;
  /** Extra classes on the icon wrapper (e.g. unread badge host). */
  iconClassName?: string;
  label?: ReactNode;
  /** Custom body (e.g. satellite preview). Wins over icon/label slots. */
  children?: ReactNode;
}

function controlClassName(
  variant: MapChromeControlVariant,
  pressed: boolean | undefined,
  className: string | undefined,
): string {
  if (variant === "slot") {
    const parts = ["jl-tool-slot", className];
    if (pressed) {
      parts.splice(1, 0, "jl-tool-slot-active");
    }
    return parts.filter(Boolean).join(" ");
  }

  const parts = [
    "map-chrome-control",
    "hud-chrome",
    pressed ? "map-chrome-control--pressed hud-chrome-active" : null,
    className,
  ];
  return parts.filter(Boolean).join(" ");
}

function ControlBody({
  variant,
  icon,
  iconClassName,
  label,
  children,
}: {
  variant: MapChromeControlVariant;
  icon?: ReactNode;
  iconClassName?: string;
  label?: ReactNode;
  children?: ReactNode;
}) {
  if (children != null) {
    return children;
  }

  if (variant === "slot") {
    const iconClass = ["jl-tool-slot-icon", iconClassName]
      .filter(Boolean)
      .join(" ");
    return (
      <>
        {icon != null ? <span className={iconClass}>{icon}</span> : null}
        {label != null ? (
          <span className="jl-tool-slot-label">{label}</span>
        ) : null}
      </>
    );
  }

  const iconClass = ["map-chrome-control__icon", iconClassName]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      {icon != null ? <span className={iconClass}>{icon}</span> : null}
      {label != null ? (
        <span className="map-chrome-control__label">{label}</span>
      ) : null}
    </>
  );
}

/**
 * Shared map chrome control button (zoom / satellite / recenter / side-dock).
 * Layout wrappers stay with each control; this owns size, pressed, disabled, slots.
 */
export function MapChromeControl({
  variant = "floating",
  pressed,
  disabled,
  className,
  icon,
  iconClassName,
  label,
  children,
  type = "button",
  title,
  "aria-label": ariaLabel,
  ...rest
}: MapChromeControlProps) {
  const resolvedClassName = controlClassName(variant, pressed, className);
  const body = (
    <ControlBody
      variant={variant}
      icon={icon}
      iconClassName={iconClassName}
      label={label}
    >
      {children}
    </ControlBody>
  );

  if (variant === "slot") {
    return (
      <MotionPressable
        type={type}
        disabled={disabled}
        className={resolvedClassName}
        aria-label={ariaLabel}
        aria-pressed={pressed}
        title={title ?? ariaLabel}
        {...rest}
      >
        {body}
      </MotionPressable>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={resolvedClassName}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={title ?? ariaLabel}
      {...rest}
    >
      {body}
    </button>
  );
}
