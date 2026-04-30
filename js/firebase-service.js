// js/firebase-service.js
// All Firebase Auth + Firestore operations in one place.

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let _app, _auth, _db, _ready = false;

async function init() {
  if (_ready) return true;
  if (!isFirebaseConfigured()) return false;
  const [{ initializeApp }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
  ]);
  _app = initializeApp(firebaseConfig);
  const [authMod, fsMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
  ]);
  _auth = authMod.getAuth(_app);
  _db   = fsMod.getFirestore(_app);
  _ready = true;
  return true;
}

// ── AUTH ─────────────────────────────────────────────────────

export async function signInEmail(email, password) {
  await init();
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  try {
    return (await signInWithEmailAndPassword(_auth, email, password)).user;
  } catch {
    return (await createUserWithEmailAndPassword(_auth, email, password)).user;
  }
}

export async function signOut() {
  await init();
  const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  return signOut(_auth);
}

export function onAuth(cb) {
  init().then(() => {
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
      .then(({ onAuthStateChanged }) => onAuthStateChanged(_auth, cb));
  });
}

export function currentUser() { return _auth?.currentUser || null; }

// ── USER PROFILE ──────────────────────────────────────────────

export async function getProfile(uid) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDoc(doc(_db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(uid, data) {
  await init();
  const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  return setDoc(doc(_db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ── SCORES ────────────────────────────────────────────────────

export async function saveSession(uid, sessionData) {
  await init();
  const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  return addDoc(collection(_db, 'scores', uid, 'sessions'), {
    ...sessionData,
    at: serverTimestamp()
  });
}

export async function getSessions(uid, limitN = 50) {
  await init();
  const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const q = query(
    collection(_db, 'scores', uid, 'sessions'),
    orderBy('at', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

// ── LEADERBOARD ───────────────────────────────────────────────

export async function getLeaderboard(limitN = 20) {
  await init();
  const { collectionGroup, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const q = query(
    collectionGroup(_db, 'sessions'),
    orderBy('weightedPoints', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  return rows;
}

// ── ROBUX PROGRESS ────────────────────────────────────────────

export async function getRobuxProgress(uid) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDoc(doc(_db, 'robux_progress', uid));
  return snap.exists() ? snap.data() : { points: 0, history: [] };
}

export async function addRobuxPoints(uid, points) {
  await init();
  const { doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const ref = doc(_db, 'robux_progress', uid);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : { points: 0, history: [] };
  const newPoints = (current.points || 0) + points;
  await setDoc(ref, { points: newPoints, updatedAt: serverTimestamp() }, { merge: true });
  return newPoints;
}

// ── GIFT CODE REDEMPTION ──────────────────────────────────────

export async function claimCode(uid) {
  await init();
  const {
    collection, query, where, limit, getDocs,
    doc, runTransaction, serverTimestamp
  } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  // Find first available unredeemed code
  const q = query(
    collection(_db, 'robux_codes'),
    where('redeemed', '==', false),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('No codes available. Please ask a parent to add more.');

  const codeDoc = snap.docs[0];
  const codeRef = doc(_db, 'robux_codes', codeDoc.id);

  return runTransaction(_db, async (tx) => {
    const fresh = await tx.get(codeRef);
    if (!fresh.exists() || fresh.data().redeemed) throw new Error('Code already taken. Try again.');
    tx.update(codeRef, {
      redeemed: true,
      redeemedBy: uid,
      redeemedAt: serverTimestamp()
    });
    // Log to user's redemption history
    const histRef = doc(collection(_db, 'robux_progress', uid, 'redemptions'));
    tx.set(histRef, {
      code: codeDoc.id,
      reward: fresh.data().reward || 'Robux Gift Card',
      redeemedAt: serverTimestamp()
    });
    // Reset progress points
    const progressRef = doc(_db, 'robux_progress', uid);
    tx.set(progressRef, { points: 0, updatedAt: serverTimestamp() }, { merge: true });
    return { code: codeDoc.id, reward: fresh.data().reward || 'Robux Gift Card' };
  });
}

export async function getRedemptionHistory(uid) {
  await init();
  const { collection, query, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const q = query(
    collection(_db, 'robux_progress', uid, 'redemptions'),
    orderBy('redeemedAt', 'desc')
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

// ── PARENT SETTINGS ───────────────────────────────────────────

export async function getParentSettings(uid) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDoc(doc(_db, 'parent_settings', uid));
  return snap.exists() ? snap.data() : defaultParentSettings();
}

export async function saveParentSettings(uid, settings) {
  await init();
  const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  return setDoc(doc(_db, 'parent_settings', uid), {
    ...settings,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function defaultParentSettings() {
  return {
    mode: 'manual',           // 'manual' | 'ai'
    aiPhilosophy: 'challenge', // 'challenge' | 'consistent'
    threshold: 100,            // points needed to earn a code
    pointValues: defaultPointValues(),
    notifyEmail: '',
    notifyPhone: '',
    childUids: []
  };
}

export function defaultPointValues() {
  // [grade][difficulty][type] → points
  // Simplified: type weights × difficulty multiplier × grade multiplier
  return {
    difficultyMultiplier: { easy: 1, medium: 2, hard: 3 },
    gradeMultiplier:      { 1:1, 2:1, 3:1.5, 4:1.5, 5:2, 6:2, 7:2.5, 8:2.5 },
    typeBase: {
      add: 1, sub: 1, mul: 2, div: 2,
      clock_analog: 2, clock_digital: 1,
      time_diff: 3, word: 3,
      fraction: 3, decimal: 3, percent: 3,
      algebra: 4, geometry: 4
    }
  };
}

export function calcPoints(type, difficulty, grade, pointValues) {
  const pv = pointValues || defaultPointValues();
  const base  = pv.typeBase[type] ?? 1;
  const diff  = pv.difficultyMultiplier[difficulty] ?? 1;
  const grMul = pv.gradeMultiplier[grade] ?? 1;
  return Math.round(base * diff * grMul);
}

export { init as initFirebase, isFirebaseConfigured };

// ── USERNAME SYSTEM ───────────────────────────────────────────

export async function isUsernameAvailable(username) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  try {
    const snap = await getDoc(doc(_db, 'usernames', username.toLowerCase()));
    return !snap.exists();
  } catch { return false; }
}

export async function claimUsername(uid, username) {
  await init();
  const {
    doc, getDoc, setDoc, deleteDoc, runTransaction, serverTimestamp
  } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const usernameLC  = username.toLowerCase();
  const usernameRef = doc(_db, 'usernames', usernameLC);
  const userRef     = doc(_db, 'users', uid);

  return runTransaction(_db, async (tx) => {
    // Check availability
    const existing = await tx.get(usernameRef);
    if (existing.exists() && existing.data().uid !== uid) {
      throw new Error('Username already taken. Please choose another.');
    }
    // Get current user to find old username
    const userSnap = await tx.get(userRef);
    const oldUsernameLC = userSnap.exists() ? userSnap.data().usernameLC : null;

    // Release old username if different
    if (oldUsernameLC && oldUsernameLC !== usernameLC) {
      tx.delete(doc(_db, 'usernames', oldUsernameLC));
    }

    // Claim new username
    tx.set(usernameRef, { uid, claimedAt: serverTimestamp() });

    // Update user profile
    tx.set(userRef, {
      username,
      usernameLC,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
}

export async function getUsernameByUid(uid) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  try {
    const snap = await getDoc(doc(_db, 'users', uid));
    return snap.exists() ? (snap.data().username || null) : null;
  } catch { return null; }
}

export async function getUidByUsername(username) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  try {
    const snap = await getDoc(doc(_db, 'usernames', username.toLowerCase()));
    return snap.exists() ? snap.data().uid : null;
  } catch { return null; }
}

