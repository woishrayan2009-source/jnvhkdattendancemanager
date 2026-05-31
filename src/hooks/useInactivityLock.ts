import { useState, useEffect } from 'react';
import { db } from '../db/schema';

const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function useInactivityLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    db.settings.get('app_lock_pin').then(record => {
      if (record) setPin(record.value);
      setIsInitialized(true);
    }).catch(err => {
      console.error('Failed to load PIN:', err);
      setIsInitialized(true);
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (isLocked) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, LOCK_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [isLocked]);

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
