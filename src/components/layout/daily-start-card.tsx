'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_PREFIX = 'mcrm-ai-day-started:';

function localDayKey(now = new Date()) {
  return now.toLocaleDateString('sv-SE');
}

export function DailyStartCard() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const key = `${STORAGE_PREFIX}${localDayKey()}`;
    setStarted(window.localStorage.getItem(key) === '1');
  }, []);

  function startDay() {
    window.localStorage.setItem(`${STORAGE_PREFIX}${localDayKey()}`, '1');
    setStarted(true);
  }

  return (
    <details
      data-slot="daily-start-card"
      className="rounded-lg border border-[var(--bigin-border)] bg-[var(--bigin-bg)] p-4 text-foreground"
    >
      <summary className="cursor-pointer text-sm font-semibold">
        mCRM AI · Nowy dzień
      </summary>
      <div>
        <blockquote className="mt-5 text-xl leading-8 font-semibold">
          „Obyś skutecznie mi błogosławił i rozszerzył granice moje, a ręka
          Twoja była ze mną, i obyś zachował mnie od złego, a utrapienie moje
          się skończyło!”
        </blockquote>
        <Button
          type="button"
          onClick={startDay}
          disabled={started}
          className="mt-4"
        >
          {started ? 'DZIEŃ ROZPOCZĘTY' : 'ROZPOCZNIJ DZIEŃ'}
        </Button>
      </div>
    </details>
  );
}
