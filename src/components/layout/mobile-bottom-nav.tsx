'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, GitBranch, House, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'DZISIAJ', icon: House },
  { href: '/contacts', label: 'KLIENCI', icon: Users },
  { href: '/quick-call', label: 'DODAJ', icon: Plus, primary: true },
  { href: '/pipelines', label: 'LEJEK', icon: GitBranch },
  { href: '/assistant', label: 'ASYSTENT', icon: Bot },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Główna nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(18,61,43,0.08)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 w-full max-w-lg grid-cols-5 overflow-hidden">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const primary = item.href === '/quick-call';
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 text-[8px] font-black tracking-[-0.03em]',
                  primary
                    ? 'text-emerald-900'
                    : active
                      ? 'text-emerald-950'
                      : 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-full px-2',
                    primary
                      ? '-mt-3 size-12 bg-emerald-700 p-0 text-white shadow-lg ring-4 ring-white'
                      : active && 'bg-emerald-50'
                  )}
                >
                  <item.icon className={cn('size-5', primary && 'size-7')} />
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

