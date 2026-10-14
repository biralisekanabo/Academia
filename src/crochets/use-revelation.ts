"use client";

import { useEffect, useRef, useState } from "react";

export function useRevelation<T extends HTMLElement = HTMLDivElement>(
  seuil = 0.12
) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      const requete = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(requete);
    }

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: seuil, rootMargin: "0px 0px -40px 0px" }
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [seuil]);

  return { ref, visible };
}