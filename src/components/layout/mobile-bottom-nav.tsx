'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bot, House, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'DZISIAJ', icon: House },
  { href: '/quick-call', label: 'AKTYWNOŚĆ', icon: Activity },
  { href: '/contacts', label: 'KLIENCI', icon: Users },
  { href: '/assistant', label: 'ASYSTENT', icon: Bot },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Główna nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(18,61,43,0.08)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 w-full max-w-lg grid-cols-4 overflow-hidden">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 text-[9px] font-black tracking-[-0.02em]',
                  active ? 'text-emerald-950' : 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 min-w-10 items-center justify-center rounded-full px-3',
                    active && 'bg-emerald-50'
                  )}
                >
                  <item.icon className="size-5" />
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
