"use client";

import { useEffect } from "react";

export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f0f1a",
          color: "#f5f5fa",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            A critical error occurred. Please reload the application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.25rem",
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "none",
              padding: "0.6rem 1.2rem",
              fontWeight: 600,
              color: "#fff",
              background: "linear-gradient(135deg,#6d28d9,#4f46e5,#0ea5e9)",
            }}
          >
            Réessayer / Retry
          </button>
        </div>
      </body>
    </html>
  );
}
