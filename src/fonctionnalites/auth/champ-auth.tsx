import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ChampAuthProps = {
  icone: LucideIcon;
  children: ReactNode;
};

export function ChampAuth({ icone: Icone, children }: ChampAuthProps) {
  return (
    <div className="group relative">
      <Icone
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-brand-2"
      />
      {children}
    </div>
  );
}
