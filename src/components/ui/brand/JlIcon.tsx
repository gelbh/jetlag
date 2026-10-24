import type { ComponentProps, ComponentType } from "react";

export type PhosphorIcon = ComponentType<
  ComponentProps<"svg"> & {
    size?: number | string;
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
    color?: string;
    mirrored?: boolean;
  }
>;

export type JlIconProps = {
  icon: PhosphorIcon;
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  color?: string;
  mirrored?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
};

export function JlIcon({
  icon: Icon,
  size = 20,
  weight = "regular",
  className,
  color = "currentColor",
  mirrored,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: JlIconProps) {
  const hidden = ariaLabel != null ? ariaHidden : (ariaHidden ?? true);

  return (
    <Icon
      size={size}
      weight={weight}
      className={className}
      color={color}
      mirrored={mirrored}
      aria-hidden={hidden}
      aria-label={ariaLabel}
    />
  );
}
