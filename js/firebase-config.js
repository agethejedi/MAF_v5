// js/firebase-config.js
// ─────────────────────────────────────────────────────────────
// DO NOT commit real values here. Fill these in locally from
// your Firebase Console → Project Settings → Your Apps → SDK setup.
// For Cloudflare Pages deployment, set these as environment variables.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey:            "AIzaSyDQ0NXtqLJeR-DSSmJ1YY2PNylfdA90OyY",
  authDomain:        "maf-31-webbackend.firebaseapp.com",
  projectId:         "maf-31-webbackend",
  storageBucket:     "maf-31-webbackend.firebasestorage.app",
  messagingSenderId: "899771106696",
  appId:             "1:899771106696:web:d262f80d673efa69a0263d"
};

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(v => v && !v.startsWith("__"));
}
