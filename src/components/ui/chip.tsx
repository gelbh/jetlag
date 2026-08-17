import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Compact Survey chip for docks, filters, and ask islands.
 * Variants mirror Button Survey roles; densify targets map chrome density.
 */
const chipVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flag focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
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

export function Chip({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ChipProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { chipVariants };
