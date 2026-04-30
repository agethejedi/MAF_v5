// js/nav.js — shared navigation, robux meter, sidebar

import { isFirebaseConfigured } from './firebase-config.js';
import { MockAuth, MockRobux, MockParentSettings } from './mock-service.js';
import { getRobuxProgress, getParentSettings } from './firebase-service.js';

const useFirebase = isFirebaseConfigured();

// Detect if we're in /pages/ subdirectory and set base path accordingly
const _inPages = window.location.pathname.includes('/pages/');
const BASE = _inPages ? '../' : '';          // prefix for root-level files
const PAGES = _inPages ? '' : 'pages/';     // prefix for /pages/ files

export function currentUser() {
  return useFirebase
    ? JSON.parse(localStorage.getItem('maf_user') || 'null')
    : MockAuth.current();
}

export function requireAuth() {
  const u = currentUser();
  if (!u) { location.href = `${BASE}login.html`; return null; }
  return u;
}

export async function renderNav({ activePage = '', showSidebar = true } = {}) {
  const user = currentUser();

  const navEl = document.getElementById('topnav');
  if (!navEl) return;

  const profile = JSON.parse(localStorage.getItem('maf_profile') || '{}');
  const avatarSrc = profile.avatar
    ? (avatarSrc => _inPages ? avatarSrc : avatarSrc)(profile.avatar)
    : `${BASE}assets/avatars/a1.svg`;

  // Normalize avatar path for current depth
  const displayAvatar = profile.avatar
    ? (_inPages
        ? profile.avatar.replace(/^(\.\.\/)*/, '../')
        : profile.avatar.replace(/^(\.\.\/)*/, ''))
    : `${BASE}assets/avatars/a1.svg`;

  navEl.innerHTML = `
    <div class="nav-brand">
      <div class="nav-logo">M</div>
      <div class="nav-title">MAF</div>
    </div>
    <div class="robux-meter" id="robuxMeter" title="Robux progress — tap to view">
      <span class="meter-icon">🎮</span>
      <div class="meter-bar-wrap">
        <div class="meter-label">
          <span id="meterLabel">Loading...</span>
          <span id="meterPct">0%</span>
        </div>
        <div class="meter-bar-bg">
          <div class="meter-bar-fill" id="meterFill" style="width:0%"></div>
        </div>
      </div>
    </div>
    <div class="nav-right">
      ${user ? `<span class="badge">${user.email?.split('@')[0] || 'Player'}</span>` : ''}
      <div class="nav-avatar" id="navAvatar" title="Profile">
        <img src="${displayAvatar}" alt="avatar"
             onerror="this.src='${BASE}assets/avatars/a1.svg'">
      </div>
    </div>
  `;

  document.getElementById('robuxMeter')?.addEventListener('click', () => {
    location.href = `${PAGES}redeem.html`;
  });
  document.getElementById('navAvatar')?.addEventListener('click', () => {
    location.href = `${PAGES}profile.html`;
  });

  // Render sidebar
  if (showSidebar) {
    const sideEl = document.getElementById('sidebar');
    if (sideEl) {
      const isParent = profile.role === 'parent';
      const childLinks = `
        <a class="nav-item ${activePage==='home'?'active':''}"        href="${BASE}index.html"><span class="icon">🏠</span>Home</a>
        <a class="nav-item ${activePage==='workbook'?'active':''}"    href="${PAGES}workbook_setup.html"><span class="icon">📝</span>Workbook</a>
        <a class="nav-item ${activePage==='tutor'?'active':''}"       href="${PAGES}tutor.html"><span class="icon">🤖</span>AI Tutor</a>
        <a class="nav-item ${activePage==='tutorials'?'active':''}"   href="${PAGES}tutorials.html"><span class="icon">📚</span>Tutorials</a>
        <a class="nav-item ${activePage==='leaderboard'?'active':''}" href="${PAGES}leaderboard.html"><span class="icon">🏆</span>Leaderboard</a>
        <a class="nav-item ${activePage==='redeem'?'active':''}"      href="${PAGES}redeem.html"><span class="icon">🎁</span>Robux</a>
      `;
      const parentLinks = `
        <a class="nav-item ${activePage==='parent'?'active':''}"   href="${PAGES}parent.html"><span class="icon">👨‍👦</span>Dashboard</a>
        <a class="nav-item ${activePage==='settings'?'active':''}" href="${PAGES}parent_settings.html"><span class="icon">⚙️</span>Settings</a>
      `;
      sideEl.innerHTML = `
        ${isParent ? parentLinks : childLinks}
        <div class="sidebar-spacer"></div>
        <a class="nav-item" href="${PAGES}profile.html"><span class="icon">👤</span>Profile</a>
        <a class="nav-item" id="sideLogout" href="#"><span class="icon">🚪</span>Sign Out</a>
        <div class="sidebar-robux" id="sideRobux" style="${isParent?'display:none':''}">
          <div class="sr-label">Robux progress</div>
          <div class="sr-val" id="srVal">0%</div>
          <div class="sr-sub" id="srSub">Loading...</div>
          <div class="sr-bar"><div class="sr-fill" id="srFill" style="width:0%"></div></div>
        </div>
      `;
      document.getElementById('sideLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (useFirebase) {
          import('./firebase-service.js').then(m => m.signOut()).then(() => {
            location.href = `${BASE}login.html`;
          });
        } else {
          MockAuth.signOut();
          location.href = `${BASE}login.html`;
        }
      });
    }
  }

  // Load robux progress
  await updateMeter(user);
}

export async function updateMeter(user) {
  if (!user) return;
  try {
    const settings = useFirebase
      ? await getParentSettings(user.parentUid || user.uid)
      : MockParentSettings.get(user.parentUid || user.uid);
    const threshold = settings?.threshold || 100;

    const progress = useFirebase
      ? await getRobuxProgress(user.uid)
      : MockRobux.getProgress(user.uid);
    const pts = progress?.points || 0;
    const pct = Math.min(100, Math.round((pts / threshold) * 100));

    const fill    = document.getElementById('meterFill');
    const label   = document.getElementById('meterLabel');
    const pctEl   = document.getElementById('meterPct');
    const srVal   = document.getElementById('srVal');
    const srSub   = document.getElementById('srSub');
    const srFill  = document.getElementById('srFill');

    if (fill) { fill.style.width = pct + '%'; fill.classList.toggle('complete', pct >= 100); }
    if (label) label.textContent = pct >= 100 ? '🎉 Claim your reward!' : `${pts} / ${threshold} pts`;
    if (pctEl) pctEl.textContent = pct + '%';
    if (srVal) srVal.textContent = pct + '%';
    if (srSub) srSub.textContent = pct >= 100 ? 'Tap to claim!' : `${pts} of ${threshold} pts`;
    if (srFill) srFill.style.width = pct + '%';
  } catch (e) { console.warn('Meter update failed:', e); }
}
