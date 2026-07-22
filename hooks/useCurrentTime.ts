'use client';

import { useState, useEffect } from 'react';

export function useCurrentTime(intervalMs: number = 30000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
