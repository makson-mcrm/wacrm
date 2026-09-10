'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_PREFIX = 'mcrm-ai-day-started:';

function localDayKey(now = new Date()) {
  return now.toLocaleDateString('sv-SE');
}

export function DailyStartCard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const key = `${STORAGE_PREFIX}${localDayKey()}`;
    setOpen(window.localStorage.getItem(key) !== '1');
  }, []);

  if (!open) return null;

  function startDay() {
    window.localStorage.setItem(`${STORAGE_PREFIX}${localDayKey()}`, '1');
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b2d1f]/80 p-5 backdrop-blur-sm lg:hidden">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcrm-day-start-title"
        className="w-full max-w-md rounded-[2rem] bg-[#123d2b] p-6 text-white shadow-2xl"
      >
        <p className="text-xs font-black tracking-[0.2em] text-lime-300 uppercase">
          mCRM AI · nowy dzień
        </p>
        <h2 id="mcrm-day-start-title" className="sr-only">
          Rozpocznij dzień
        </h2>
        <blockquote className="mt-5 text-xl leading-8 font-semibold">
          „Obyś skutecznie mi błogosławił i rozszerzył granice moje, a ręka
          Twoja była ze mną, i obyś zachował mnie od złego, a utrapienie moje
          się skończyło!”
        </blockquote>
        <Button
          type="button"
          onClick={startDay}
          className="mt-7 h-14 w-full rounded-2xl bg-lime-300 text-base font-black text-emerald-950 hover:bg-lime-200"
        >
          ROZPOCZNIJ DZIEŃ
        </Button>
      </section>
    </div>
  );
}
