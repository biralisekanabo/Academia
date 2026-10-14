"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Selecteur } from "@/composants/ui/selecteur";
import { cn } from "@/utilitaires/cn";

export function SelecteurLangue({ className }: { className?: string }) {
  const locale = useLocale();
  const chemin = usePathname();
  const routeur = useRouter();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Languages className="text-muted-foreground size-4" />
      <Selecteur
        value={locale}
        aria-label="Langue"
        className="h-8 w-16"
        onChange={(evenement) =>
          routeur.replace(chemin, {
            locale: evenement.target.value as "fr" | "en",
          })
        }
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </Selecteur>
    </div>
  );
}