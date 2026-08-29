'use client';

import { CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function MobileDateTimeInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <CalendarClock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="min-h-11 pl-10 [color-scheme:light] dark:[color-scheme:dark]"
      />
    </div>
  );
}
