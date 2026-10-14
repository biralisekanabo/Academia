import * as React from "react";

import { cn } from "@/utilitaires/cn";

function Selecteur({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="selecteur"
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 data-[placeholder]:text-muted-foreground flex h-9 w-fit min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow,border-color] duration-200 outline-none hover:border-brand-2/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=selecteur-valeur]:flex *:data-[slot=selecteur-valeur]:items-center *:data-[slot=selecteur-valeur]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    />
  );
}

export { Selecteur };