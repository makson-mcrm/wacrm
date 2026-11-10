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
import { surfaceFlags } from '@/lib/ui/surface-flags';

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
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard"
          data-header-brand
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
      </div>

      <div className="mobile-global-search flex min-w-0 justify-start">
        <GlobalCrmSearch />
      </div>

      <span data-header-module className="truncate text-sm font-medium">{sectionTitle}</span>

      <div data-header-actions className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
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
        {surfaceFlags.headerExtensions && <DropdownMenu>
          <DropdownMenuTrigger aria-label="Pomoc" title="Pomoc" className="header-icon">
            <CircleHelp className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/assistant" />}>Asystent</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/audyt-crm" />}>Audyt CRM</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
        <div data-header-account-actions className="flex items-center gap-2">
          {surfaceFlags.headerExtensions && <ModeToggle />}

          <DropdownMenu>
            <DropdownMenuTrigger
              data-header-avatar-trigger
              className="hover:bg-muted/70 focus:bg-muted/70 data-popup-open:bg-muted/70 flex shrink-0 items-center justify-center transition-colors focus:outline-none"
              title={profile?.full_name ?? t('defaultUser')}
              aria-label={`${t('openAccountMenu')} — ${profile?.full_name ?? t('defaultUser')}`}
            >
              <Avatar data-header-avatar className="size-8">
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
