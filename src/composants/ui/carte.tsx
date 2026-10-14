import * as React from "react";

import { cn } from "@/utilitaires/cn";

function Carte({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CarteEntete({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte-entete"
      className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)}
      {...props}
    />
  );
}

function CarteTitre({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte-titre"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CarteDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CarteContenu({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte-contenu"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CartePied({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carte-pied"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Carte,
  CarteEntete,
  CarteTitre,
  CarteDescription,
  CarteContenu,
  CartePied,
};