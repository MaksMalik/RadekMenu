import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import type { AppState } from '../types';

/**
 * Firestore-backed persistence for a logged-in user.
 * Each user's state is stored under `users/{uid}` document.
 * historyStack is excluded (transient, session-only).
 */

type PersistedState = Omit<AppState, 'historyStack'>;

export async function readUserState(uid: string): Promise<AppState | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as PersistedState;
    if (typeof data.schemaVersion !== 'number') return null;

    return { ...data, historyStack: [] };
  } catch (e) {
    console.warn('[Firestore] Failed to read user state:', e);
    return null;
  }
}

export async function writeUserState(uid: string, state: AppState): Promise<void> {
  try {
    const { historyStack: _ignored, ...persistable } = state;
    void _ignored;
    const ref = doc(db, 'users', uid);
    await setDoc(ref, persistable);
  } catch (e) {
    console.warn('[Firestore] Failed to write user state:', e);
  }
}
