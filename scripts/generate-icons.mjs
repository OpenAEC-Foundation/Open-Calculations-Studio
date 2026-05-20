#!/usr/bin/env node
/**
 * Render packages/desktop/src/assets/ocs-logo.svg → a 1024×1024 PNG that
 * Tauri's `tauri icon` command can consume to generate the full icon set.
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = resolve(root, "packages/desktop/src/assets/ocs-logo.svg");
const outDir = resolve(root, "packages/desktop/src-tauri");
const outPng = resolve(outDir, "icon-source.png");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
await sharp(svg, { density: 512 })
  .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(outPng);

console.log(`Wrote ${outPng}`);
