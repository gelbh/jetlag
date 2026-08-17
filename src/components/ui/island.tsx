import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Floating map/chrome island shell — Survey canvas + rule edge.
 * Layout composition (OverlayHost / ToolDeck) lands in later slices; this is the skin primitive.
 */
const islandVariants = cva(
  "pointer-events-auto flex items-center border border-rule bg-canvas text-field-ink shadow-[0_8px_24px_0_oklch(0.1_0.04_265_/_0.45)]",
  {
    variants: {
      variant: {
        default: "rounded-xl gap-2 px-3 py-2",
        flag: "rounded-xl gap-2 px-3 py-2 border-flag bg-flag-soft",
        ghost: "rounded-xl gap-2 px-3 py-2 border-transparent bg-transparent shadow-none",
      },
      size: {
        default: "min-h-11",
        densify: "min-h-9 gap-1 px-2 py-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type IslandProps = React.ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof islandVariants> & {
    asChild?: boolean;
  };

export function Island({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: IslandProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="island"
      className={cn(islandVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { islandVariants };
