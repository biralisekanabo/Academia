import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(racine, "public/academia-logo.svg");
const svg = await readFile(source);

const cibles = [
  { chemin: "public/academia-logo.png", taille: 512, fond: null },
  { chemin: "public/icones/icon-192.png", taille: 192, fond: null },
  { chemin: "public/icones/icon-512.png", taille: 512, fond: null },
  { chemin: "public/icones/apple-touch-icon.png", taille: 180, fond: "#6d4aff" },
  { chemin: "public/icones/badge-96.png", taille: 96, fond: null },
];

for (const { chemin, taille, fond } of cibles) {
  let image = sharp(svg).resize(taille, taille);
  if (fond) {
    image = image.flatten({ background: fond });
  }
  const png = await image.png().toBuffer();
  await writeFile(resolve(racine, chemin), png);
  console.log(`✓ ${chemin} (${taille}px)`);
}
