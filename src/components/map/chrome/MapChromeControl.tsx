import type { ButtonHTMLAttributes, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import {
  hudChromeStyles,
  mapToolSlotLabelStyle,
  mapToolSlotStyles,
  type MapToolSlotTone,
} from "@/components/ui/entry/entryChrome";

export type MapChromeControlVariant = "floating" | "slot";

export interface MapChromeControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** `floating` = map portal square; `slot` = side-dock tool chip. */
  variant?: MapChromeControlVariant;
  /** Toggle / selected state (`aria-pressed` + active chrome class). */
  pressed?: boolean;
  /** Slot visual weight: question tools vs undo/redo. */
  tone?: MapToolSlotTone;
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
    return ["jl-tool-slot", className].filter(Boolean).join(" ");
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
          <span data-ios-tool-label="" style={mapToolSlotLabelStyle}>
            {label}
          </span>
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
  tone = "tool",
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
      <UnstyledButton
        type={type}
        disabled={disabled}
        className={resolvedClassName}
        styles={mapToolSlotStyles(Boolean(pressed), tone)}
        data-ios-tool-tone={tone}
        aria-label={ariaLabel}
        aria-pressed={pressed}
        title={title ?? ariaLabel}
        {...rest}
      >
        {body}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      type={type}
      disabled={disabled}
      className={resolvedClassName}
      styles={hudChromeStyles(Boolean(pressed))}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={title ?? ariaLabel}
      {...rest}
    >
      {body}
    </UnstyledButton>
  );
}
