import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import "./../globals.css";
import { FournisseurRequetes } from "@/composants/partages/fournisseur-requetes";
import { FournisseurIntl } from "@/composants/partages/fournisseur-intl";
import { InviteMiseAJour } from "@/composants/partages/invite-mise-a-jour";
import { ServiceWorker } from "@/composants/partages/service-worker";
import { FournisseurConfirmation } from "@/composants/ui/confirmation";
import { FournisseurToasts } from "@/composants/ui/toaster";
import { configuration } from "@/i18n/configuration";
import messagesEn from "../../../messages/en.json";
import messagesFr from "../../../messages/fr.json";

const DESCRIPTION =
  "Plateforme de gestion universitaire Eduplex : académique, finances, caisse, comptabilité et rapports.";

export const metadata: Metadata = {
  title: { default: "Eduplex", template: "%s · Eduplex" },
  description: DESCRIPTION,
  applicationName: "Eduplex",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Eduplex",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Eduplex",
    description: DESCRIPTION,
    siteName: "Eduplex",
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

  const versionDeploiement = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

  return (
    <html lang={locale} className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var p=localStorage.getItem('eduplex-theme');var d=p==='dark'||((p!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}",
          }}
        />
        <FournisseurIntl
          locale={locale}
          messages={locale === "en" ? messagesEn : messagesFr}
        >
          <FournisseurRequetes>
            <FournisseurToasts>
              <FournisseurConfirmation>{children}</FournisseurConfirmation>
            </FournisseurToasts>
          </FournisseurRequetes>
          <ServiceWorker />
          <InviteMiseAJour versionInitiale={versionDeploiement} />
        </FournisseurIntl>
      </body>
    </html>
  );
}