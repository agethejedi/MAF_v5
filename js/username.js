// js/username.js — Username generation, validation, profanity filter

// ── WORD LISTS FOR AUTO-GENERATION ───────────────────────────
const ADJECTIVES = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Cosmic', 'Turbo', 'Epic',
  'Ninja', 'Hyper', 'Mega', 'Ultra', 'Blazing', 'Speedy', 'Lucky',
  'Stellar', 'Radical', 'Funky', 'Zesty', 'Bouncy', 'Snappy',
  'Zippy', 'Jolly', 'Groovy', 'Slick', 'Bold', 'Vivid', 'Crisp',
  'Nifty', 'Dandy', 'Peppy', 'Plucky', 'Quirky', 'Witty', 'Zany'
];

const NOUNS = [
  'Fox', 'Eagle', 'Panda', 'Tiger', 'Falcon', 'Rocket', 'Comet',
  'Wizard', 'Ranger', 'Pixel', 'Storm', 'Blaze', 'Spark', 'Quest',
  'Turbo', 'Dynamo', 'Vortex', 'Nebula', 'Photon', 'Quasar',
  'Koala', 'Gecko', 'Lynx', 'Raven', 'Bison', 'Mango', 'Cactus',
  'Orbit', 'Comet', 'Dagger', 'Ember', 'Flare', 'Glider', 'Helm'
];

// ── PROFANITY FILTER ─────────────────────────────────────────
// Basic list — extend as needed
const BLOCKED_WORDS = [
  'hate', 'kill', 'dead', 'die', 'damn', 'hell', 'crap', 'poop',
  'butt', 'fart', 'idiot', 'stupid', 'dumb', 'loser', 'ugly',
  'racist', 'nazi', 'terror', 'bomb', 'gun', 'drug', 'sex',
  'porn', 'nude', 'naked'
  // Note: deliberately keeping this minimal and non-offensive in itself.
  // A production app would use a maintained npm package like 'bad-words'.
];

export function containsProfanity(str) {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

// ── USERNAME VALIDATION ───────────────────────────────────────
export function validateUsername(username) {
  if (!username || username.length < 3) {
    return { ok: false, reason: 'Username must be at least 3 characters.' };
  }
  if (username.length > 20) {
    return { ok: false, reason: 'Username must be 20 characters or less.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { ok: false, reason: 'Only letters, numbers, and underscores allowed.' };
  }
  if (containsProfanity(username)) {
    return { ok: false, reason: 'That username is not allowed. Please choose another.' };
  }
  return { ok: true };
}

// ── AUTO-GENERATE USERNAMES ───────────────────────────────────
export function generateUsernames(count = 3) {
  const results = new Set();
  let attempts = 0;
  while (results.size < count && attempts < 50) {
    attempts++;
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = Math.floor(Math.random() * 900) + 100; // 3-digit number
    const name = `${adj}${noun}${num}`;
    if (!containsProfanity(name)) results.add(name);
  }
  return Array.from(results);
}

// ── DISPLAY HELPERS ───────────────────────────────────────────
export function formatUsername(username) {
  return username ? `@${username}` : '—';
}
