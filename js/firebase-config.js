// js/firebase-config.js
// ─────────────────────────────────────────────────────────────
// DO NOT commit real values here. Fill these in locally from
// your Firebase Console → Project Settings → Your Apps → SDK setup.
// For Cloudflare Pages deployment, set these as environment variables.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey:            "__FIREBASE_API_KEY__",
  authDomain:        "__FIREBASE_AUTH_DOMAIN__",
  projectId:         "__FIREBASE_PROJECT_ID__",
  storageBucket:     "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId:             "__FIREBASE_APP_ID__"
};

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(v => v && !v.startsWith("__"));
}
