'use client';

import { MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DICTATION_BLOCK_MESSAGE } from '@/lib/ai/browser-stt-policy';

export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  className,
  layout = 'stacked',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  layout?: 'stacked' | 'side';
}) {
  return (
    <div
      className={
        layout === 'side' ? 'grid gap-2 sm:grid-cols-[1fr_112px]' : 'space-y-2'
      }
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <div
        className={
          layout === 'side'
            ? 'flex flex-col items-center justify-center rounded-lg bg-slate-50 p-2'
            : ''
        }
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          aria-label={DICTATION_BLOCK_MESSAGE}
          title={DICTATION_BLOCK_MESSAGE}
          className={
            layout === 'side'
              ? 'h-auto min-h-16 w-full flex-col border-0 bg-transparent text-emerald-800 shadow-none hover:bg-emerald-50'
              : ''
          }
        >
          <MicOff className="h-6 w-6" />
          Dyktowanie wyłączone
        </Button>
        {layout === 'side' && (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            LOCAL-FIRST
          </span>
        )}
        {layout === 'stacked' && (
          <p className="text-muted-foreground mt-1 text-xs">
            {DICTATION_BLOCK_MESSAGE} Wpisywanie ręczne działa bez zmian.
          </p>
        )}
      </div>
    </div>
  );
}
