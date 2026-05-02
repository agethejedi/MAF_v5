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
  const { collection, doc, addDoc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  // Ensure parent scores/{uid} document exists
  await setDoc(doc(_db, "scores", uid), { uid, updatedAt: serverTimestamp() }, { merge: true });
  return addDoc(collection(_db, "scores", uid, "sessions"), {
    ...sessionData,
    uid,
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
  const { collection, collectionGroup, query, orderBy, limit, getDocs, where } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  // Strategy: query the scores collection for all user docs,
  // then fetch the best session per user.
  // This avoids needing a collectionGroup composite index.
  try {
    const scoresSnap = await getDocs(collection(_db, 'scores'));
    const allBest = [];

    await Promise.all(scoresSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const q = query(
        collection(_db, 'scores', uid, 'sessions'),
        orderBy('weightedPoints', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        allBest.push({ uid, ...snap.docs[0].data() });
      }
    }));

    // Sort by weightedPoints desc, then accuracy desc
    allBest.sort((a, b) =>
      (b.weightedPoints || 0) - (a.weightedPoints || 0) ||
      (b.accuracy || 0) - (a.accuracy || 0)
    );

    return allBest.slice(0, limitN);
  } catch(e) {
    console.error('Leaderboard error:', e);
    return [];
  }
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

// ── ADMIN FUNCTIONS ───────────────────────────────────────────

export async function isAdmin(uid) {
  await init();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  try {
    const snap = await getDoc(doc(_db, 'users', uid));
    return snap.exists() && snap.data().role === 'admin';
  } catch { return false; }
}

export async function getAllUsers(limitN = 100) {
  await init();
  const { collection, query, orderBy, limit, getDocs } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDocs(query(collection(_db, 'users'), limit(limitN)));
  const rows = [];
  snap.forEach(d => rows.push({ uid: d.id, ...d.data() }));
  return rows;
}

export async function getAllCodes() {
  await init();
  const { collection, getDocs, orderBy, query } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDocs(query(collection(_db, 'robux_codes')));
  const rows = [];
  snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

export async function addCode(code, reward) {
  await init();
  const { doc, setDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  return setDoc(doc(_db, 'robux_codes', code.toUpperCase()), {
    redeemed: false,
    reward: reward || '400 Robux Gift Card',
    addedAt: serverTimestamp()
  });
}

export async function deleteCode(code) {
  await init();
  const { doc, deleteDoc } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  return deleteDoc(doc(_db, 'robux_codes', code));
}

export async function getAdminAnalytics() {
  await init();
  const { collection, query, orderBy, limit, getDocs, where, Timestamp } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  // Get all score documents (one per user)
  const scoresSnap = await getDocs(collection(_db, 'scores'));
  const allSessions = [];
  const userSessionCounts = {};

  // Fetch sessions for each user
  await Promise.all(scoresSnap.docs.map(async (userDoc) => {
    const uid = userDoc.id;
    const sessSnap = await getDocs(
      query(collection(_db, 'scores', uid, 'sessions'),
        orderBy('at', 'desc'), limit(50))
    );
    userSessionCounts[uid] = sessSnap.size;
    sessSnap.forEach(d => allSessions.push({ uid, ...d.data() }));
  }));

  // Aggregate type stats
  const typeMap = {};
  const gradeMap = {};
  let totalPoints = 0;
  let totalSessions = allSessions.length;
  let totalAvgTime = 0;

  allSessions.forEach(s => {
    totalPoints += s.weightedPoints || 0;
    totalAvgTime += s.avgTimeMs || 0;
    if (s.grade) gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1;
    if (s.typeStats) {
      Object.entries(s.typeStats).forEach(([t, stats]) => {
        if (!typeMap[t]) typeMap[t] = { correct: 0, total: 0 };
        typeMap[t].correct += stats.correct || 0;
        typeMap[t].total   += stats.total   || 0;
      });
    }
  });

  // DAU — sessions today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = allSessions.filter(s => {
    if (!s.at) return false;
    const d = s.at.toDate ? s.at.toDate() : new Date(s.at);
    return d >= todayStart;
  });

  // WAU — sessions this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekSessions = allSessions.filter(s => {
    if (!s.at) return false;
    const d = s.at.toDate ? s.at.toDate() : new Date(s.at);
    return d >= weekStart;
  });

  const typeAccuracy = Object.entries(typeMap)
    .filter(([, v]) => v.total > 0)
    .map(([type, v]) => ({ type, pct: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.pct - b.pct);

  return {
    totalSessions,
    todaySessions: todaySessions.length,
    weekSessions: weekSessions.length,
    avgPointsPerSession: totalSessions ? Math.round(totalPoints / totalSessions) : 0,
    avgTimeMs: totalSessions ? Math.round(totalAvgTime / totalSessions) : 0,
    typeAccuracy,
    gradeMap,
    userSessionCounts,
    uniqueActiveUsers: Object.keys(userSessionCounts).length
  };
}

export async function deleteUserData(uid, username) {
  await init();
  const {
    doc, collection, getDocs, deleteDoc, writeBatch
  } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const batch = writeBatch(_db);

  // Delete user profile
  batch.delete(doc(_db, 'users', uid));

  // Delete username reservation
  if (username) {
    batch.delete(doc(_db, 'usernames', username.toLowerCase()));
  }

  // Delete parent settings
  batch.delete(doc(_db, 'parent_settings', uid));

  // Delete robux progress
  batch.delete(doc(_db, 'robux_progress', uid));

  await batch.commit();

  // Delete subcollections (sessions, redemptions) — batch can't do subcollections
  const sessSnap = await getDocs(collection(_db, 'scores', uid, 'sessions'));
  const sessBatch = writeBatch(_db);
  sessSnap.forEach(d => sessBatch.delete(d.ref));
  if (!sessSnap.empty) await sessBatch.commit();

  const redSnap = await getDocs(collection(_db, 'robux_progress', uid, 'redemptions'));
  const redBatch = writeBatch(_db);
  redSnap.forEach(d => redBatch.delete(d.ref));
  if (!redSnap.empty) await redBatch.commit();

  // Delete scores parent doc
  await deleteDoc(doc(_db, 'scores', uid));
}
