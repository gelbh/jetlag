/* eslint-disable react-refresh/only-export-components -- shadcn-style: cva variants exported with component */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Compact Survey chip for docks, filters, and ask islands.
 * Variants mirror Button Survey roles; densify targets map chrome density.
 */
const chipVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flag focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-canvas text-field-ink border border-rule hover:bg-flag-soft",
        flag: "bg-flag text-flag-ink border border-flag",
        ghost:
          "bg-transparent text-field-ink-muted border border-transparent hover:bg-flag-soft hover:text-field-ink",
      },
      size: {
        default: "h-7 px-3",
        densify: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ChipProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof chipVariants> & {
    asChild?: boolean;
  };

function blockDisabledActivation(
  event: React.SyntheticEvent,
): void {
  event.preventDefault();
  event.stopPropagation();
}

export function Chip({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  disabled = false,
  onClick,
  tabIndex,
  children,
  ...props
}: ChipProps) {
  const classes = cn(chipVariants({ variant, size, className }));

  // Slot composes the child handler first; clone so disabled cannot activate.
  if (asChild && disabled) {
    const child = React.Children.only(children) as React.ReactElement<
      Record<string, unknown>
    >;
    return React.cloneElement(child, {
      ...props,
      className: cn(classes, child.props.className as string | undefined),
      "data-slot": "chip",
      "aria-disabled": true,
      tabIndex: -1,
      onClick: blockDisabledActivation,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          blockDisabledActivation(event);
        }
      },
    });
  }

  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      {...props}
      data-slot="chip"
      className={classes}
      type={asChild ? undefined : type}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      {children}
    </Comp>
  );
}

export { chipVariants };
