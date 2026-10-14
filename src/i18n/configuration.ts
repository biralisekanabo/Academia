import { defineRouting } from "next-intl/routing";

export const configuration = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

export type Locale = (typeof configuration.locales)[number];