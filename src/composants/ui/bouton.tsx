import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utilitaires/cn";

const boutonVariantes = cva(
    "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-out active:translate-y-0 active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    {
      variants: {
        variante: {
          parDefaut:
            "bouton-luisant degrade-brand text-primary-foreground shadow-md shadow-brand-1/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-1/40",
          destructif:
            "bouton-luisant bg-destructive text-destructive-foreground shadow-md shadow-destructive/25 hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/40",
          contour:
            "border bg-background shadow-xs hover:-translate-y-0.5 hover:border-brand-2/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
          secondaire:
            "bg-secondary text-secondary-foreground shadow-xs hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-md",
          fantome: "hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground",
          lien: "text-primary underline-offset-4 hover:underline",
        },
      taille: {
        parDefaut: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icone: "size-9",
      },
    },
    defaultVariants: {
      variante: "parDefaut",
      taille: "parDefaut",
    },
  }
);

function Bouton({
  className,
  variante,
  taille,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof boutonVariantes>) {
  return (
    <button
      data-slot="bouton"
      type={type}
      className={cn(boutonVariantes({ variante, taille, className }))}
      {...props}
    />
  );
}

export { Bouton, boutonVariantes };