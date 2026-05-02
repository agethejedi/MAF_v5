// js/onboarding.js — Onboarding flow controller

import { isFirebaseConfigured } from './firebase-config.js';
import { saveProfile, getProfile } from './firebase-service.js';
import { MockAuth, MockProfile } from './mock-service.js';

const useFirebase = isFirebaseConfigured();

export async function shouldShowOnboarding(user) {
  if (!user) return false;
  try {
    if (useFirebase) {
      const profile = await getProfile(user.uid);
      return !profile?.onboardingComplete;
    } else {
      const profile = MockProfile.get(user.uid);
      return !profile?.onboardingComplete;
    }
  } catch { return false; }
}

export async function markOnboardingComplete(user, data = {}) {
  if (!user) return;
  try {
    if (useFirebase) {
      await saveProfile(user.uid, { onboardingComplete: true, ...data });
    } else {
      const profile = MockProfile.get(user.uid);
      MockProfile.save(user.uid, { ...profile, onboardingComplete: true, ...data });
    }
    // Update local profile
    const local = JSON.parse(localStorage.getItem('maf_profile') || '{}');
    localStorage.setItem('maf_profile', JSON.stringify({
      ...local, onboardingComplete: true, ...data
    }));
  } catch(e) { console.warn('Onboarding save failed:', e); }
}
