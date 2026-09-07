'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bot, House, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'DZISIAJ', icon: House },
  { href: '/quick-call', label: 'AKTYWNOŚĆ', icon: Activity },
  { href: '/contacts', label: 'KLIENCI', icon: Users },
  { href: '/agents', label: 'ASYSTENT', icon: Bot },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Główna nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(18,61,43,0.08)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-black tracking-tight',
                  active ? 'text-emerald-950' : 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 min-w-10 items-center justify-center rounded-full px-3',
                    active && 'bg-lime-300'
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
