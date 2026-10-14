"use client";

import { EcranErreur } from "@/composants/partages/ecran-erreur";

export default function ErreurPortail({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <EcranErreur error={error} reset={reset} />;
}
