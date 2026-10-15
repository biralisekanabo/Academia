"use client";

import type { ComponentProps, ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

type Props = Pick<
  ComponentProps<typeof NextIntlClientProvider>,
  "locale" | "messages"
> & {
  children: ReactNode;
};

export function FournisseurIntl({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
