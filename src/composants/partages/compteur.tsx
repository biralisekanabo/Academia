"use client";

import { useEffect, useRef, useState } from "react";

export function Compteur({
  valeur,
  suffixe = "",
  duree = 1400,
}: {
  valeur: number;
  suffixe?: string;
  duree?: number;
}) {
  const [affichage, setAffichage] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const demarre = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      const requete = requestAnimationFrame(() => setAffichage(valeur));
      return () => cancelAnimationFrame(requete);
    }

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting || demarre.current) return;
        demarre.current = true;
        observateur.disconnect();

        const debut = performance.now();
        const pas = (temps: number) => {
          const progression = Math.min((temps - debut) / duree, 1);
          const anime = 1 - Math.pow(1 - progression, 3);
          setAffichage(Math.round(valeur * anime));
          if (progression < 1) requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      },
      { threshold: 0.4 }
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [valeur, duree]);

  return (
    <span ref={ref}>
      {affichage}
      {suffixe}
    </span>
  );
}