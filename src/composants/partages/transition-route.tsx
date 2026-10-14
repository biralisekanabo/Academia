"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

export function TransitionRoute({ children }: { children: ReactNode }) {
  const chemin = usePathname();

  return (
    <div key={chemin} className="transition-route min-w-0">
      {children}
    </div>
  );
}
