import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import "./../globals.css";
import { FournisseurRequetes } from "@/composants/partages/fournisseur-requetes";
import { ServiceWorker } from "@/composants/partages/service-worker";
import { FournisseurToasts } from "@/composants/ui/toaster";
import { configuration } from "@/i18n/configuration";

const DESCRIPTION =
  "Plateforme de gestion universitaire OpenLu : étudiants, cours, notes, finances et e-learning.";

export const metadata: Metadata = {
  title: { default: "OpenLu", template: "%s · OpenLu" },
  description: DESCRIPTION,
  applicationName: "OpenLu",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "OpenLu",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "OpenLu",
    description: DESCRIPTION,
    siteName: "OpenLu",
  },
  icons: {
    icon: "/icones/icon-192.png",
    shortcut: "/favicon.ico",
    apple: "/icones/apple-touch-icon.png",
  },
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
              "try{var p=localStorage.getItem('openlu-theme');var d=p==='dark'||((p!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}",
          }}
        />
        <NextIntlClientProvider>
          <FournisseurRequetes>
            <FournisseurToasts>{children}</FournisseurToasts>
          </FournisseurRequetes>
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}