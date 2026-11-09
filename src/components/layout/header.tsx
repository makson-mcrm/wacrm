'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Bell,
  CircleHelp,
  ListTodo,
  LogOut,
  Settings as SettingsIcon,
  Sparkles,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { GlobalCrmSearch } from '@/components/layout/global-crm-search';
import { GlobalAdd } from '@/components/layout/global-add';

const pageTitles: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/inbox': 'inbox',
  '/notifications': 'notifications',
  '/contacts': 'contacts',
  '/companies': 'companies',
  '/submissions': 'submissions',
  '/pipelines': 'pipelines',
  '/calendar': 'calendar',
  '/deals': 'deals',
  '/finances': 'finances',
  '/broadcasts': 'broadcasts',
  '/automations': 'automations',
  '/settings': 'settings',
};

const mcrmSectionTitles: Record<string, string> = {
  '/dashboard': 'DZISIAJ',
  '/quick-call': 'AKTYWNOŚĆ',
  '/contacts': 'KLIENCI',
  '/deals': 'DEAL',
  '/pipelines': 'LEJEK',
  '/calendar': 'KALENDARZ',
  '/tasks': 'ZADANIA',
  '/assistant': 'ASYSTENT',
  '/finances': 'FINANSE',
  '/agents': 'AGENCI',
  '/audyt-crm': 'AUDYT CRM',
  '/flows': 'PRZEPŁYWY',
};

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  );
  return match ? match[1] : 'dashboard';
}

import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('Header');
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const titleKey = getPageTitleKey(pathname);
  const sectionTitle =
    Object.entries(mcrmSectionTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ?? t(titleKey as string);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    'U';

  return (
    <header className="border-border bg-background flex min-h-[var(--app-header-height)] shrink-0 flex-wrap items-center justify-between gap-1.5 border-b px-3 py-1.5 md:h-[var(--app-header-height)] md:flex-nowrap md:gap-3 md:px-4 md:py-0 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2"
          aria-label="mCRM AI — DZISIAJ"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-foreground truncate text-sm font-medium">
            mCRM AI
          </span>
        </Link>
        <span data-header-module className="truncate text-sm font-medium">{sectionTitle}</span>
      </div>

      <div className="mobile-global-search order-last flex min-w-0 basis-full justify-center md:order-none md:flex-1 md:basis-auto md:px-3">
        <GlobalCrmSearch />
      </div>

      <div data-header-actions className="flex items-center gap-1 sm:gap-2">
        <GlobalAdd compact />
        <Link href="/tasks" aria-label="Zadania" title="Zadania" className="header-icon">
          <ListTodo className="size-4" />
        </Link>
        <Link href="/notifications" aria-label="Powiadomienia" title="Powiadomienia" className="header-icon">
          <Bell className="size-4" />
        </Link>
        <Link href="/settings" aria-label="Ustawienia" title="Ustawienia" className="header-icon">
          <SettingsIcon className="size-4" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Pomoc" title="Pomoc" className="header-icon">
            <CircleHelp className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/assistant" />}>Asystent</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/audyt-crm" />}>Audyt CRM</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div data-header-account-actions className="flex items-center gap-2">
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-muted/70 focus:bg-muted/70 data-popup-open:bg-muted/70 flex items-center gap-2 rounded-md px-1 py-1 transition-colors focus:outline-none sm:gap-3 sm:pr-3 sm:pl-1"
              aria-label={t('openAccountMenu')}
            >
              <Avatar className="size-8">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? t('defaultAvatar')}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span data-header-account-name className="text-foreground hidden text-sm font-medium sm:inline">
                {profile?.full_name ?? t('defaultUser')}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="bg-popover text-popover-foreground ring-border min-w-56"
            >
              <div className="px-2 py-1.5">
                <p className="text-foreground truncate text-sm font-medium">
                  {profile?.full_name ?? t('defaultUser')}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {profile?.email ?? ''}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                {t('menuProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <SettingsIcon className="size-4" />
                {t('menuSettings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                {t('menuSignOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
