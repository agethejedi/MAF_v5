#!/usr/bin/env node
// build.js — Cloudflare Pages build script
// Injects Firebase secrets from Cloudflare environment variables
// into firebase-config.js at build time.

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

// Check all secrets are present
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Missing environment variables:\n  ${missing.join('\n  ')}`);
  console.error('\nAdd them in: Cloudflare Pages → Your project → Settings → Environment variables\n');
  process.exit(1);
}

// On Cloudflare Pages the repo lives at /opt/buildhome/repo.
// cpSync cannot copy a folder into its own subdirectory, so we
// write output to a sibling path outside the repo root.
const isCloudflare = !!process.env.CF_PAGES;
const outDir = isCloudflare
  ? '/opt/buildhome/output'
  : join(__dirname, '_cf_build');

console.log(`📁 Output directory: ${outDir}`);
mkdirSync(outDir, { recursive: true });

// Copy all project files into output dir
cpSync(__dirname, outDir, {
  recursive: true,
  filter: (src) => {
    const exclude = ['_cf_build', 'node_modules', '.git', '.env', '/output'];
    return !exclude.some(x => src.includes(x));
  }
});

// Read template config (contains __PLACEHOLDER__ values)
const configTemplate = readFileSync(
  join(__dirname, 'js', 'firebase-config.js'), 'utf8'
);

// Inject real secret values
const injected = configTemplate
  .replace('__FIREBASE_API_KEY__',             process.env.FIREBASE_API_KEY)
  .replace('__FIREBASE_AUTH_DOMAIN__',         process.env.FIREBASE_AUTH_DOMAIN)
  .replace('__FIREBASE_PROJECT_ID__',          process.env.FIREBASE_PROJECT_ID)
  .replace('__FIREBASE_STORAGE_BUCKET__',      process.env.FIREBASE_STORAGE_BUCKET)
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.FIREBASE_MESSAGING_SENDER_ID)
  .replace('__FIREBASE_APP_ID__',              process.env.FIREBASE_APP_ID);

// Write injected config into output
mkdirSync(join(outDir, 'js'), { recursive: true });
writeFileSync(join(outDir, 'js', 'firebase-config.js'), injected, 'utf8');

console.log('✅ Firebase credentials injected');
console.log(`🚀 Build complete — serving from ${outDir}`);
