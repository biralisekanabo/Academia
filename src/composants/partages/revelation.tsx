"use client";

import type { ReactNode } from "react";

import { useRevelation } from "@/crochets/use-revelation";
import { cn } from "@/utilitaires/cn";

type RevelationProps = {
  children: ReactNode;
  delai?: number;
  className?: string;
};

export function Revelation({ children, delai = 0, className }: RevelationProps) {
  const { ref, visible } = useRevelation<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-visible={visible}
      style={{ "--delai": `${delai}ms` } as React.CSSProperties}
      className={cn("revelation", className)}
    >
      {children}
    </div>
  );
}