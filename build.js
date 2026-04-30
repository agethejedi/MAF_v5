#!/usr/bin/env node
// build.js — Cloudflare Pages build script
// Reads environment variables (set as Cloudflare Pages secrets) and
// injects them into firebase-config.js at deploy time.
// The output file is written to _cf_build/js/firebase-config.js
// and is NEVER committed to git.

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
  console.error(`\n❌ Missing Cloudflare environment variables:\n  ${missing.join('\n  ')}`);
  console.error('\nAdd them in: Cloudflare Pages → Your project → Settings → Environment variables\n');
  process.exit(1);
}

// Copy entire project to _cf_build/
const outDir = join(__dirname, '_cf_build');
console.log('📁 Copying project to _cf_build/...');
cpSync(__dirname, outDir, {
  recursive: true,
  filter: (src) => {
    // Exclude build artifacts and sensitive files
    const exclude = ['_cf_build', 'node_modules', '.git', '.env'];
    return !exclude.some(x => src.includes(x));
  }
});

// Read the template config
const configTemplate = readFileSync(
  join(__dirname, 'js', 'firebase-config.js'), 'utf8'
);

// Replace all placeholders with real values
const injected = configTemplate
  .replace('__FIREBASE_API_KEY__',            process.env.FIREBASE_API_KEY)
  .replace('__FIREBASE_AUTH_DOMAIN__',        process.env.FIREBASE_AUTH_DOMAIN)
  .replace('__FIREBASE_PROJECT_ID__',         process.env.FIREBASE_PROJECT_ID)
  .replace('__FIREBASE_STORAGE_BUCKET__',     process.env.FIREBASE_STORAGE_BUCKET)
  .replace('__FIREBASE_MESSAGING_SENDER_ID__',process.env.FIREBASE_MESSAGING_SENDER_ID)
  .replace('__FIREBASE_APP_ID__',             process.env.FIREBASE_APP_ID);

// Write the injected config to the build output
const outConfig = join(outDir, 'js', 'firebase-config.js');
writeFileSync(outConfig, injected, 'utf8');

console.log('✅ Firebase credentials injected into _cf_build/js/firebase-config.js');
console.log('🚀 Build complete — Cloudflare will serve from _cf_build/');
