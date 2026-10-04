'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bot, House, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { id: 'today', href: '/dashboard', label: 'DZISIAJ', icon: House },
  { id: 'activity', href: '/quick-call', label: 'AKTYWNOŚĆ', icon: Activity },
  { id: 'clients', href: '/contacts', label: 'KLIENCI', icon: Users },
  { id: 'assistant', href: '/assistant', label: 'ASYSTENT', icon: Bot },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Główna nawigacja mobilna"
      data-slot="mobile-bottom-nav"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/95 pb-[env(safe-area-inset-bottom)] text-slate-700 shadow-[0_-8px_30px_rgba(18,61,43,0.08)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-14 w-full max-w-lg grid-cols-4 overflow-hidden">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <li key={item.id} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 text-xs font-black tracking-[-0.03em]',
                  active ? 'text-emerald-950' : 'text-slate-700'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 min-w-7 items-center justify-center rounded-full px-1.5',
                    active && 'bg-emerald-50'
                  )}
                >
                  <item.icon className="size-4.5" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
