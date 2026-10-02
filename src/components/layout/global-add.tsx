'use client';

import Link from 'next/link';
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarPlus,
  ListTodo,
  Plus,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function GlobalAdd({ mobile = false }: { mobile?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Dodaj w mCRM"
        className={cn(
          mobile
            ? 'flex h-full min-h-11 w-full min-w-11 flex-col items-center justify-center gap-1 px-0.5 text-xs font-black tracking-[-0.03em] text-emerald-900'
            : 'bg-primary text-primary-foreground hover:bg-primary-hover flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold md:h-9'
        )}
      >
        <span
          className={cn(
            'flex items-center justify-center',
            mobile &&
              '-mt-3 size-12 rounded-full bg-emerald-700 text-white shadow-lg ring-4 ring-white'
          )}
        >
          <Plus className={mobile ? 'size-7' : 'size-4'} />
        </span>
        <span className={mobile ? 'sr-only' : undefined}>Dodaj</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mobile ? 'center' : 'end'}
        className="min-w-52"
      >
        <DropdownMenuItem render={<Link href="/quick-call" />}>
          <Activity className="size-4" />
          Aktywność
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/pipelines?new=deal" />}>
          <BriefcaseBusiness className="size-4" />
          Deal
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/contacts?new=contact" />}>
          <UserPlus className="size-4" />
          Kontakt
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/companies?new=company" />}>
          <Building2 className="size-4" />
          Firma
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/tasks?new=task" />}>
          <ListTodo className="size-4" />
          Zadanie
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/calendar?new=event" />}>
          <CalendarPlus className="size-4" />
          Spotkanie
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
