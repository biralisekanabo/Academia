export function formatDateLongue(
  date: string | null | undefined,
  locale: string
): string {
  if (!date) return "—";
  const langue = locale === "fr" ? "fr-FR" : "en-GB";
  return new Intl.DateTimeFormat(langue, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateEntiere(
  date: string | null | undefined,
  locale: string
): string {
  if (!date) return "—";
  const langue = locale === "fr" ? "fr-FR" : "en-GB";
  return new Intl.DateTimeFormat(langue, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTempsRelatif(
  date: string | null | undefined,
  locale: string
): string {
  if (!date) return "—";
  const langue = locale === "fr" ? "fr-FR" : "en-GB";
  const secondes = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const absolu = Math.abs(secondes);
  const rtf = new Intl.RelativeTimeFormat(langue, { numeric: "auto" });

  if (absolu < 60) return rtf.format(secondes, "second");
  if (absolu < 3600) return rtf.format(Math.round(secondes / 60), "minute");
  if (absolu < 86400) return rtf.format(Math.round(secondes / 3600), "hour");
  if (absolu < 604800) return rtf.format(Math.round(secondes / 86400), "day");
  return formatDateLongue(date, locale);
}

export function formatMontant(
  montant: number,
  locale: string,
  devise = "CDF"
): string {
  if (!Number.isFinite(montant)) return "—";
  const langue = locale === "fr" ? "fr-FR" : "en-GB";
  const code =
    devise === "FCFA" ? "XOF" : devise === "FC" ? "CDF" : devise.toUpperCase();
  try {
    return new Intl.NumberFormat(langue, {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "USD" ? 2 : 0,
    }).format(montant);
  } catch {
    return `${new Intl.NumberFormat(langue).format(montant)} ${devise}`;
  }
}

const UNITES = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const DIZAINES = [
  "", "dix", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix",
];

function sousCent(n: number): string {
  const nEntier = Math.floor(n);
  if (nEntier < 20) return UNITES[nEntier];
  let d = Math.floor(nEntier / 10);
  let u = nEntier % 10;
  if (d === 7) {
    d = 6;
    u += 10;
  }
  if (d === 9) {
    d = 8;
    u += 10;
  }
  let dTxt = DIZAINES[d];
  if (u === 1 && d >= 2) dTxt += "-et-un";
  else if (u > 0) dTxt += "-" + UNITES[u];
  return dTxt;
}

function sousMillier(n: number): string {
  const nEntier = Math.floor(n);
  if (nEntier < 100) return sousCent(nEntier);
  const c = Math.floor(nEntier / 100);
  const r = nEntier % 100;
  const cent = c === 1 ? "cent" : UNITES[c] + " cent";
  return r ? cent + " " + sousCent(r) : cent;
}

export function montantEnLettresFr(montant: number): string {
  if (!Number.isFinite(montant) || montant < 0) return "";
  if (montant === 0) return "zéro";
  const n = Math.floor(montant);
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  const parties: string[] = [];
  if (millions) parties.push(sousMillier(millions) + " million" + (millions > 1 ? "s" : ""));
  if (milliers) parties.push(sousMillier(milliers) + " mille");
  if (reste) parties.push(sousMillier(reste));

  return parties.join(" ");
}