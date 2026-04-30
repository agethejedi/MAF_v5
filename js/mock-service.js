// js/mock-service.js
// Full offline fallback — mirrors firebase-service.js API exactly.
// Used automatically when Firebase is not configured.

import { defaultParentSettings, defaultPointValues, calcPoints } from './firebase-service.js';
export { calcPoints, defaultPointValues };

function ls(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── AUTH ──────────────────────────────────────────────────────

export const MockAuth = {
  signIn(email) {
    const user = { uid: `local_${btoa(email).slice(0, 8)}`, email, role: 'child' };
    lsSet('maf_user', user);
    return user;
  },
  signOut() { localStorage.removeItem('maf_user'); },
  current() { return ls('maf_user'); }
};

// ── PROFILE ───────────────────────────────────────────────────

export const MockProfile = {
  get(uid) { return ls(`maf_profile_${uid}`) || { uid, role: 'child', grade: 3, avatar: 'assets/avatars/a1.svg' }; },
  save(uid, data) { lsSet(`maf_profile_${uid}`, { ...MockProfile.get(uid), ...data }); }
};

// ── SESSIONS ──────────────────────────────────────────────────

export const MockSessions = {
  save(uid, data) {
    const all = ls(`maf_sessions_${uid}`, []);
    all.unshift({ ...data, at: Date.now(), id: Date.now().toString() });
    lsSet(`maf_sessions_${uid}`, all.slice(0, 100));
  },
  get(uid, n = 50) { return ls(`maf_sessions_${uid}`, []).slice(0, n); }
};

// ── LEADERBOARD ───────────────────────────────────────────────

export const MockLeaderboard = {
  get() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('maf_sessions_')) continue;
      const uid = key.replace('maf_sessions_', '');
      const sessions = ls(key, []);
      if (!sessions.length) continue;
      const best = sessions.reduce((a, b) => (b.weightedPoints > a.weightedPoints ? b : a), sessions[0]);
      entries.push({ uid, email: ls(`maf_profile_${uid}`)?.email || uid, ...best });
    }
    return entries.sort((a, b) => b.weightedPoints - a.weightedPoints).slice(0, 20);
  }
};

// ── ROBUX PROGRESS ────────────────────────────────────────────

export const MockRobux = {
  getProgress(uid) { return ls(`maf_robux_${uid}`, { points: 0 }); },
  addPoints(uid, pts) {
    const curr = MockRobux.getProgress(uid);
    const next = { ...curr, points: (curr.points || 0) + pts };
    lsSet(`maf_robux_${uid}`, next);
    return next.points;
  },
  claimCode(uid, threshold) {
    const progress = MockRobux.getProgress(uid);
    if (progress.points < threshold) throw new Error('Not enough points yet.');
    // Check mock code inventory
    const codes = ls('maf_codes', []);
    const available = codes.find(c => !c.redeemed);
    if (!available) throw new Error('No codes in inventory. Ask a parent to add more.');
    available.redeemed = true;
    available.redeemedBy = uid;
    available.redeemedAt = Date.now();
    lsSet('maf_codes', codes);
    // Log history
    const history = ls(`maf_redemptions_${uid}`, []);
    history.unshift({ code: available.code, reward: available.reward, redeemedAt: Date.now() });
    lsSet(`maf_redemptions_${uid}`, history);
    // Reset points
    lsSet(`maf_robux_${uid}`, { points: 0 });
    return { code: available.code, reward: available.reward };
  },
  getHistory(uid) { return ls(`maf_redemptions_${uid}`, []); },
  // Parent: add a code to inventory
  addCode(code, reward = '400 Robux Gift Card') {
    const codes = ls('maf_codes', []);
    codes.push({ code, reward, redeemed: false, addedAt: Date.now() });
    lsSet('maf_codes', codes);
  },
  getCodes() { return ls('maf_codes', []); }
};

// ── PARENT SETTINGS ───────────────────────────────────────────

export const MockParentSettings = {
  get(uid) { return ls(`maf_parent_${uid}`) || defaultParentSettings(); },
  save(uid, settings) { lsSet(`maf_parent_${uid}`, settings); }
};

// ── USERNAME SYSTEM (mock) ────────────────────────────────────
export const MockUsername = {
  isAvailable(username) {
    const all = ls('maf_usernames', {});
    return !all[username.toLowerCase()];
  },
  claim(uid, username) {
    const all     = ls('maf_usernames', {});
    const usernameLC = username.toLowerCase();
    // Check if taken by someone else
    if (all[usernameLC] && all[usernameLC] !== uid) {
      throw new Error('Username already taken. Please choose another.');
    }
    // Release old username
    const profile = MockProfile.get(uid);
    if (profile.usernameLC && profile.usernameLC !== usernameLC) {
      delete all[profile.usernameLC];
    }
    all[usernameLC] = uid;
    lsSet('maf_usernames', all);
    MockProfile.save(uid, { ...profile, username, usernameLC });
  },
  getByUid(uid) {
    return MockProfile.get(uid)?.username || null;
  }
};
