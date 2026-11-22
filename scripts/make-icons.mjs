import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
const svg = readFileSync('public/icons/icon.svg');
const out = (file, size) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);

await Promise.all([
  out('public/icons/icon-192.png', 192),
  out('public/icons/icon-512.png', 512),
  out('public/icons/maskable-512.png', 512),
  out('public/icons/apple-touch-icon.png', 180),
  out('public/icons/favicon-32.png', 32),
]);
console.log('icons done');
