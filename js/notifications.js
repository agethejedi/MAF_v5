// js/notifications.js — Client-side notification triggers

const WORKER_URL = 'https://mafv5.agedotcom.workers.dev';

export async function notifyReward({ parentEmail, parentName, childUsername, rewardValue, totalPoints }) {
  if (!parentEmail) return;
  try {
    await fetch(`${WORKER_URL}/notify/reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: parentEmail, parentName, childUsername, rewardValue, totalPoints })
    });
  } catch(e) { console.warn('Reward notification failed:', e); }
}

export async function notifyMilestone({ parentEmail, parentName, childUsername, currentPoints, threshold }) {
  if (!parentEmail) return;
  const pct = Math.round((currentPoints / threshold) * 100);
  // Only notify at 80% and don't spam — check localStorage
  const key = `maf_milestone_notified_${childUsername}_${threshold}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  try {
    await fetch(`${WORKER_URL}/notify/milestone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: parentEmail, parentName, childUsername, currentPoints, threshold, pct })
    });
  } catch(e) { console.warn('Milestone notification failed:', e); }
}

export async function notifyWeeklyDigest({ parentEmail, parentName, childUsername, stats }) {
  if (!parentEmail) return;
  // Only send once per week — check localStorage
  const key  = `maf_weekly_notified_${childUsername}`;
  const last = parseInt(localStorage.getItem(key) || '0');
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (last > weekAgo) return;
  localStorage.setItem(key, Date.now());
  try {
    await fetch(`${WORKER_URL}/notify/weekly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: parentEmail, parentName, childUsername, stats })
    });
  } catch(e) { console.warn('Weekly digest notification failed:', e); }
}
