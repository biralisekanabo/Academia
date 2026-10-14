import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import "./../globals.css";
import { FournisseurToasts } from "@/composants/ui/toaster";
import { configuration } from "@/i18n/configuration";

export const metadata: Metadata = {
  title: { default: "OpenLu", template: "%s · OpenLu" },
  description: "Open Learning University",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f1a" },
  ],
};

export function generateStaticParams() {
  return configuration.locales.map((locale) => ({ locale }));
}

export const instant = false;

export default async function LayoutRacine({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(configuration.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('openlu-theme')==='light'){document.documentElement.classList.remove('dark')}}catch(e){}",
          }}
        />
        <NextIntlClientProvider>
          <FournisseurToasts>{children}</FournisseurToasts>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}