import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — severity-aware variants for alert lists.
 *
 * Severity scale is tuned to read as a "weather advisory" gradient:
 *   low    -> sky blue (calm / informational)
 *   medium -> amber    (caution / advisory)
 *   high   -> red      (urgent / warning)
 *
 * Using ring + soft fill instead of solid color so badges sit comfortably
 * inside dense alert rows without dominating.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        low: "border-sky-200 bg-sky-50 text-sky-800",
        medium: "border-amber-200 bg-amber-50 text-amber-900",
        high: "border-red-200 bg-red-50 text-red-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
