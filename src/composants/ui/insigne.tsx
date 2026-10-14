import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utilitaires/cn";

const insigneVariantes = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variante: {
        parDefaut:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondaire:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructif:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        contour:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variante: "parDefaut",
    },
  }
);

function Insigne({
  className,
  variante,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof insigneVariantes>) {
  return (
    <span
      data-slot="insigne"
      className={cn(insigneVariantes({ variante }), className)}
      {...props}
    />
  );
}

export { Insigne, insigneVariantes };