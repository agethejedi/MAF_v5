// js/badges.js — Badge definitions and evaluation logic

export const BADGES = [
  // Accuracy
  { id:'sharp_shooter',  emoji:'🎯', name:'Sharp Shooter',      desc:'90%+ accuracy in a single session',
    check:({session})=> session && session.accuracy >= 90 },
  { id:'perfect_score',  emoji:'🌟', name:'Perfect Score',       desc:'100% accuracy in a single session',
    check:({session})=> session && session.accuracy === 100 },
  { id:'on_fire',        emoji:'🔥', name:'On Fire',             desc:'90%+ accuracy three sessions in a row',
    check:({recentSessions})=> recentSessions && recentSessions.length >= 3 &&
      recentSessions.slice(0,3).every(s => s.accuracy >= 90) },
  // Speed
  { id:'speed_demon',    emoji:'⚡', name:'Speed Demon',         desc:'Average under 5 seconds per problem',
    check:({session})=> session && session.avgTimeMs && session.avgTimeMs < 5000 },
  { id:'rocket',         emoji:'🚀', name:'Rocket',              desc:'Average under 3 seconds per problem',
    check:({session})=> session && session.avgTimeMs && session.avgTimeMs < 3000 },
  // Streaks
  { id:'showing_up',     emoji:'📅', name:'Showing Up',          desc:'3 day streak',
    check:({streak})=> streak >= 3 },
  { id:'dedicated',      emoji:'💪', name:'Dedicated',           desc:'7 day streak',
    check:({streak})=> streak >= 7 },
  { id:'unstoppable',    emoji:'🏆', name:'Unstoppable',         desc:'30 day streak',
    check:({streak})=> streak >= 30 },
  // Volume
  { id:'getting_started',emoji:'🔢', name:'Getting Started',     desc:'50 problems solved total',
    check:({totalProblems})=> totalProblems >= 50 },
  { id:'century',        emoji:'💯', name:'Century',             desc:'100 problems solved total',
    check:({totalProblems})=> totalProblems >= 100 },
  { id:'math_machine',   emoji:'🧮', name:'Math Machine',        desc:'500 problems solved total',
    check:({totalProblems})=> totalProblems >= 500 },
  // Robux
  { id:'first_reward',   emoji:'🎮', name:'First Reward',        desc:'Redeemed your first Robux gift card',
    check:({redemptionCount})=> redemptionCount >= 1 },
  // Subject mastery
  { id:'times_table_titan',emoji:'✖️', name:'Times Table Titan', desc:'80%+ on multiplication (10+ problems)',
    check:({typeStats})=>{ const m=typeStats?.mul; return m && m.total>=10 && (m.correct/m.total)>=0.8; } },
  { id:'clock_master',   emoji:'⏱️', name:'Clock Master',        desc:'80%+ on elapsed time (10+ problems)',
    check:({typeStats})=>{ const t=typeStats?.time_diff; return t && t.total>=10 && (t.correct/t.total)>=0.8; } },
  { id:'word_wizard',    emoji:'📖', name:'Word Wizard',         desc:'80%+ on word problems (10+ problems)',
    check:({typeStats})=>{ const w=typeStats?.word; return w && w.total>=10 && (w.correct/w.total)>=0.8; } },
];

export function evaluateBadges(context, alreadyEarned=[]) {
  const newBadges = [];
  for (const badge of BADGES) {
    if (alreadyEarned.includes(badge.id)) continue;
    try { if (badge.check(context)) newBadges.push(badge); } catch {}
  }
  return newBadges;
}

export function getBadge(id) {
  return BADGES.find(b => b.id === id) || null;
}
