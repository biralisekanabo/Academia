import * as React from "react";

import { cn } from "@/utilitaires/cn";

function Tableau({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="tableau-conteneur"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="tableau"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableauEntete({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="tableau-entete"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableauCorps({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="tableau-corps"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableauLigne({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="tableau-ligne"
      className={cn(
        "transition-colors duration-200 hover:bg-brand-1/5 data-[etat=selectionne]:bg-muted",
        className
      )}
      {...props}
    />
  );
}

function TableauEnteteCellule({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="tableau-entete-cellule"
      className={cn(
        "text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableauCellule({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="tableau-cellule"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableauPied({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="tableau-pied"
      className={cn("bg-muted/50 font-medium", className)}
      {...props}
    />
  );
}

export {
  Tableau,
  TableauEntete,
  TableauCorps,
  TableauLigne,
  TableauEnteteCellule,
  TableauCellule,
  TableauPied,
};