import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(resolve(racine, "public/eduplex-logo.svg"));

const tailles = [16, 24, 32, 48, 64, 128, 256];
const images = [];
for (const taille of tailles) {
  const buf = await sharp(svg).resize(taille, taille).png().toBuffer();
  images.push({ taille, buf });
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

const entrees = [];
let offset = 6 + images.length * 16;
for (const image of images) {
  const entree = Buffer.alloc(16);
  const dimension = image.taille >= 256 ? 0 : image.taille;
  entree.writeUInt8(dimension, 0);
  entree.writeUInt8(dimension, 1);
  entree.writeUInt8(0, 2);
  entree.writeUInt8(0, 3);
  entree.writeUInt16LE(1, 4);
  entree.writeUInt16LE(32, 6);
  entree.writeUInt32LE(image.buf.length, 8);
  entree.writeUInt32LE(offset, 12);
  offset += image.buf.length;
  entrees.push(entree);
}

const ico = Buffer.concat([header, ...entrees, ...images.map((i) => i.buf)]);
await mkdir(resolve(racine, "build-resources"), { recursive: true });
await writeFile(resolve(racine, "build-resources/icon.ico"), ico);
console.log(`build-resources/icon.ico généré (${tailles.join(", ")})`);
