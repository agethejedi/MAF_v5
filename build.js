#!/usr/bin/env node
// build.js — Cloudflare Pages build script
// Injects Firebase secrets directly into firebase-config.js in place.
// Build output directory in Cloudflare Pages should be set to: .
// (a single dot, meaning serve the repo root)

import { readFileSync, writeFileSync } from 'fs';
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

// Read the template config (contains __PLACEHOLDER__ values)
const configPath = join(__dirname, 'js', 'firebase-config.js');
const configTemplate = readFileSync(configPath, 'utf8');

// Inject real secret values
const injected = configTemplate
  .replace('__FIREBASE_API_KEY__',             process.env.FIREBASE_API_KEY)
  .replace('__FIREBASE_AUTH_DOMAIN__',         process.env.FIREBASE_AUTH_DOMAIN)
  .replace('__FIREBASE_PROJECT_ID__',          process.env.FIREBASE_PROJECT_ID)
  .replace('__FIREBASE_STORAGE_BUCKET__',      process.env.FIREBASE_STORAGE_BUCKET)
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.FIREBASE_MESSAGING_SENDER_ID)
  .replace('__FIREBASE_APP_ID__',              process.env.FIREBASE_APP_ID);

// Write injected config back in place
writeFileSync(configPath, injected, 'utf8');

console.log('✅ Firebase credentials injected into js/firebase-config.js');
console.log('🚀 Build complete — Cloudflare will serve from repo root');
