import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(resolve(racine, "public/eduplex-logo.svg"));

await mkdir(resolve(racine, "assets"), { recursive: true });

const fond = { r: 15, g: 15, b: 26, alpha: 1 };

const icon = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: fond },
})
  .composite([
    {
      input: await sharp(svg).resize(720, 720).png().toBuffer(),
      top: 152,
      left: 152,
    },
  ])
  .png()
  .toBuffer();
await writeFile(resolve(racine, "assets/icon.png"), icon);

const logoBlanc = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp(svg).resize(720, 720).png().toBuffer(),
      top: 152,
      left: 152,
    },
  ])
  .png()
  .toBuffer();
await writeFile(resolve(racine, "assets/icon-foreground.png"), logoBlanc);

const fondPur = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: fond },
})
  .png()
  .toBuffer();
await writeFile(resolve(racine, "assets/icon-background.png"), fondPur);

const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: fond },
})
  .composite([
    {
      input: await sharp(svg).resize(900, 900).png().toBuffer(),
      top: 916,
      left: 916,
    },
  ])
  .png()
  .toBuffer();
await writeFile(resolve(racine, "assets/splash.png"), splash);
await writeFile(resolve(racine, "assets/splash-dark.png"), splash);

console.log("Assets natifs generes (icon + splash).");
