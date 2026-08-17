/* eslint-disable react-refresh/only-export-components -- shadcn-style: cva variants exported with component */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Survey field-book button — shadcn Slot + cva on Radix.
 * Prefer Survey roles (flag / field-ink / canvas); do not introduce new jl-* CSS.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flag focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-canvas text-field-ink border border-rule hover:bg-flag-soft",
        flag: "bg-flag text-flag-ink border border-flag hover:brightness-110",
        ghost:
          "bg-transparent text-field-ink border border-transparent hover:bg-flag-soft hover:text-field-ink",
      },
      size: {
        default: "h-10 px-4 py-2",
        densify: "h-8 px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function blockDisabledActivation(
  event: React.SyntheticEvent,
): void {
  event.preventDefault();
  event.stopPropagation();
}

export function Button({
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
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  // Slot composes the child handler first; clone so disabled cannot activate.
  if (asChild && disabled) {
    const child = React.Children.only(children) as React.ReactElement<
      Record<string, unknown>
    >;
    return React.cloneElement(child, {
      ...props,
      className: cn(classes, child.props.className as string | undefined),
      "data-slot": "button",
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
      data-slot="button"
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

export { buttonVariants };
