import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { configuration } from "./configuration";

export default getRequestConfig(async ({ requestLocale }) => {
  const demande = await requestLocale;
  const locale = hasLocale(configuration.locales, demande)
    ? demande
    : configuration.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});