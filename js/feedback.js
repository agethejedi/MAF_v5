// js/feedback.js — NPS and child fun rating system

import { isFirebaseConfigured } from './firebase-config.js';
import { saveProfile, getProfile } from './firebase-service.js';
import { MockProfile } from './mock-service.js';

const useFirebase = isFirebaseConfigured();

// ── CHILD FUN RATING ──────────────────────────────────────────
// Show after every 5th completed session

export async function shouldShowFunRating(user) {
  try {
    const key = `maf_fun_rating_count_${user.uid}`;
    const count = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, count);
    // Show on every 5th session
    return count % 5 === 0;
  } catch { return false; }
}

export async function saveFunRating(user, rating, comment) {
  const data = { rating, comment, at: Date.now(), type: 'fun_rating' };
  try {
    const existing = JSON.parse(localStorage.getItem(`maf_feedback_${user.uid}`) || '[]');
    existing.push(data);
    localStorage.setItem(`maf_feedback_${user.uid}`, JSON.stringify(existing));
    if (useFirebase) {
      const { getFirestore, collection, addDoc, serverTimestamp } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const { initFirebase } = await import('./firebase-service.js');
      const fb = await initFirebase();
      await addDoc(collection(fb.db || getFirestore(), 'feedback'), {
        uid: user.uid, rating, comment, type: 'fun_rating',
        at: serverTimestamp()
      }).catch(() => {});
    }
  } catch(e) { console.warn('Feedback save failed:', e); }
}

// ── PARENT NPS ────────────────────────────────────────────────
// Show once per week

export async function shouldShowNPS(user) {
  try {
    const lastKey = `maf_nps_last_${user.uid}`;
    const last = parseInt(localStorage.getItem(lastKey) || '0');
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return last < weekAgo;
  } catch { return false; }
}

export async function saveNPS(user, score, comment) {
  const data = { score, comment, at: Date.now(), type: 'nps' };
  try {
    localStorage.setItem(`maf_nps_last_${user.uid}`, Date.now());
    const existing = JSON.parse(localStorage.getItem(`maf_feedback_${user.uid}`) || '[]');
    existing.push(data);
    localStorage.setItem(`maf_feedback_${user.uid}`, JSON.stringify(existing));
    if (useFirebase) {
      const { getFirestore, collection, addDoc, serverTimestamp } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const { initFirebase } = await import('./firebase-service.js');
      const fb = await initFirebase();
      await addDoc(collection(fb.db || getFirestore(), 'feedback'), {
        uid: user.uid, score, comment, type: 'nps',
        category: score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor',
        at: serverTimestamp()
      }).catch(() => {});
    }
  } catch(e) { console.warn('NPS save failed:', e); }
}

export function getFeedbackPrompt(score) {
  if (score >= 9) return "That's wonderful! What do you love most about MAF?";
  if (score >= 7) return "Thanks! What would make MAF a 10 for you?";
  return "We appreciate your honesty. What could we do better?";
}
