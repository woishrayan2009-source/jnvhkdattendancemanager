import { useState, useEffect, useRef } from 'react';
import { db } from '../db/schema';

const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

/**
 * Manages an inactivity-based PIN lock.
 *
 * Fix: uses a ref to track isLocked inside the timer callback so the useEffect
 * doesn't need [isLocked] as a dependency — removing that dependency breaks the
 * infinite loop where unlock() → setIsLocked(false) → effect re-runs →
 * all event listeners removed and re-added → resetTimer() fires immediately.
 */
export function useInactivityLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use ref so the timer callback always has the current value without
  // needing to be in the dependency array
  const isLockedRef = useRef(false);
  isLockedRef.current = isLocked;

  // Load PIN from local Dexie on mount
  useEffect(() => {
    db.settings.get('app_lock_pin').then(record => {
      if (record) setPin(record.value);
      setIsInitialized(true);
    }).catch(() => {
      setIsInitialized(true);
    });
  }, []);

  // Set up inactivity timer — only run once, use ref for isLocked
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (isLockedRef.current) return;  // already locked, don't reset
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, LOCK_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start timer immediately

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearTimeout(timeoutId);
    };
  }, []); // empty deps — ref handles isLocked, no re-mount needed

  const unlock = (enteredPin: string) => {
    if (enteredPin === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const setupPin = async (newPin: string) => {
    await db.settings.put({ key: 'app_lock_pin', value: newPin });
    setPin(newPin);
  };

  return { isLocked, pin, unlock, setupPin, isInitialized };
}
