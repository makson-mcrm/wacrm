'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTotalUnread } from '@/hooks/use-total-unread';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { useUnhandledSubmissions } from '@/hooks/use-unhandled-submissions';
import {
  Activity,
  Bot,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  CalendarDays,
  ChevronDown,
  Crown,
  GitBranch,
  Landmark,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  Sparkles,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  Zap,
} from 'lucide-react';
import type { AccountRole } from '@/lib/auth/roles';

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: 'roleOwner',
    // Role icons and labels distinguish permissions within the shared palette.
    className: 'border-[var(--bigin-border)] bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]',
  },
  admin: {
    icon: Shield,
    labelKey: 'roleAdmin',
    // Shared navigation palette.
    className: 'border-[var(--bigin-border)] bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]',
  },
  agent: {
    icon: UserCog,
    labelKey: 'roleAgent',
    // Operational default.
    className: 'border-[var(--bigin-border)] bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]',
  },
  viewer: {
    icon: User,
    labelKey: 'roleViewer',
    // Read-only role.
    className: 'border-[var(--bigin-border)] bg-[var(--bigin-panel)] text-[var(--bigin-panel-text)]',
  },
};
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  href: string;
  labelKey: string;
  label?: string;
  icon: typeof LayoutDashboard;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    label: 'DZISIAJ',
    icon: LayoutDashboard,
  },
  { href: '/contacts', labelKey: 'contacts', label: 'KLIENCI', icon: Users },
  {
    href: '/deals',
    labelKey: 'deals',
    label: 'DEAL',
    icon: BriefcaseBusiness,
  },
  {
    href: '/pipelines',
    labelKey: 'pipelines',
    label: 'LEJEK',
    icon: GitBranch,
  },
  {
    href: '/calendar',
    labelKey: 'calendar',
    label: 'KALENDARZ',
    icon: CalendarDays,
  },
  { href: '/tasks', labelKey: 'tasks', label: 'ZADANIA', icon: ListTodo },
  {
    href: '/finances',
    labelKey: 'finances',
    label: 'FINANSE',
    icon: Landmark,
  },
  {
    href: '/quick-call',
    labelKey: 'activity',
    label: 'AKTYWNOŚĆ',
    icon: Activity,
  },
  {
    href: '/assistant',
    labelKey: 'assistant',
    label: 'ASYSTENT',
    icon: Bot,
  },
];

const secondaryNavItems: NavItem[] = [
  { href: '/inbox', labelKey: 'inbox', icon: MessageSquare },
  { href: '/notifications', labelKey: 'notifications', icon: ClipboardList },
  { href: '/companies', labelKey: 'companies', icon: Building2 },
  { href: '/broadcasts', labelKey: 'broadcasts', icon: Radio },
  { href: '/automations', labelKey: 'automations', icon: Zap },
  { href: '/flows', labelKey: 'flows', icon: Workflow, beta: true },
];

const bottomNavItems = [
  { href: '/settings', labelKey: 'settings', icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
}

import { useTranslations } from 'next-intl';

export function Sidebar({ collapsed = false }: SidebarProps) {
  const t = useTranslations('Sidebar');
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const unhandledSubmissions = useUnhandledSubmissions();
  // Only surface the account-name strip when it actually carries
  // information. A solo user's personal account is named after them
  // (the 017 signup trigger seeds it from `full_name`), so showing it
  // here would just duplicate the user name in the footer below. Once
  // the account is renamed or the user joins a shared account, the
  // name diverges and the strip becomes meaningful — that's the signal
  // we gate on. Wait for the profile fetch to settle first, otherwise
  // the strip flashes in once the row resolves (a layout jump).
  const showAccountStrip =
    !profileLoading && !!account?.name && account.name !== profile?.full_name;

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        // The rail participates in the flex row at every viewport width.
        'border-[var(--bigin-border)] bg-[var(--bigin-panel)] relative z-20 flex h-full shrink-0 flex-col border-r',
        collapsed ? 'w-[var(--app-sidebar-width-collapsed)]' : 'w-[var(--app-sidebar-width)]'
      )}
      style={{
        background: 'var(--bigin-panel)',
        '--sidebar-alt': 'var(--bigin-accent)',
        '--border': 'var(--bigin-border)',
        '--foreground': 'var(--bigin-panel-text)',
        '--muted-foreground': 'var(--bigin-panel-text)',
        '--muted': 'var(--bigin-accent)',
        '--primary': 'var(--bigin-accent)',
      } as React.CSSProperties}
      aria-label="Primary"
    >
      {/* Shared rail logo. */}
      <div className="border-[var(--bigin-border)] flex h-[var(--app-topbar-height)] shrink-0 items-center justify-between gap-2 border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[var(--bigin-panel-text)] text-sm font-black">mCRM AI</span>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            const showUnreadDot =
              item.href === '/inbox' && totalUnread > 0 && !isActive;

            // Unlike the inbox dot, the notifications count stays visible
            // even while the page is active — it reflects unread state
            // (cleared by marking notifications read), not "currently
            // viewing this section".
            const showNotificationBadge =
              item.href === '/notifications' && unreadNotifications > 0;
            const showSubmissionBadge =
              item.href === '/submissions' && unhandledSubmissions > 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label || t(item.labelKey as string)}
                  aria-label={item.label || t(item.labelKey as string)}
                  className={cn(
                    // Taller on mobile so fingers can hit the row reliably (≥44px).
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2',
                    isActive
                      ? 'bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]'
                      : 'text-[var(--bigin-panel-text)] hover:bg-[var(--bigin-accent)] hover:text-[var(--bigin-panel-text)]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">
                    {item.label || t(item.labelKey as string)}
                  </span>
                  {item.beta && (
                    <span
                      aria-label={t('beta')}
                      className="rounded-full border border-[var(--bigin-border)] bg-[var(--bigin-accent)] px-1.5 py-0.5 text-xs font-semibold tracking-wider text-[var(--bigin-panel-text)] uppercase"
                    >
                      {t('beta')}
                    </span>
                  )}
                  {showUnreadDot && (
                    <span
                      aria-label={t('unreadConversations', {
                        count: totalUnread,
                      })}
                      className="relative flex h-2 w-2"
                    >
                      <span className="bg-[var(--bigin-accent)] absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                      <span className="bg-[var(--bigin-accent)] relative inline-flex h-2 w-2 rounded-full" />
                    </span>
                  )}
                  {showNotificationBadge && (
                    <span
                      aria-label={t('unreadNotifications', {
                        count: unreadNotifications,
                      })}
                      className="bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)] flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold"
                    >
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                  {showSubmissionBadge && (
                    <span className="bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)] min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-bold">
                      {unhandledSubmissions > 99
                        ? '99+'
                        : unhandledSubmissions}
                    </span>
                  )}
                </Link>
              </li>
            );
            })}
          </ul>

          <details className="mt-4 rounded-lg border">
            <summary title="NARZĘDZIA DODATKOWE" aria-label="NARZĘDZIA DODATKOWE" className="text-[var(--bigin-panel-text)] flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold">
              <ChevronDown className="size-3.5" /><span>NARZĘDZIA DODATKOWE</span>
            </summary>
            <ul className="flex flex-col gap-1 border-t p-2">
              {secondaryNavItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href);
                const badge =
                  item.href === '/notifications'
                    ? unreadNotifications
                    : item.href === '/inbox'
                      ? totalUnread
                      : item.href === '/submissions'
                        ? unhandledSubmissions
                        : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label || t(item.labelKey as string)}
                      aria-label={item.label || t(item.labelKey as string)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors lg:min-h-0',
                        isActive
                          ? 'bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]'
                          : 'text-[var(--bigin-panel-text)] hover:bg-[var(--bigin-accent)] hover:text-[var(--bigin-panel-text)]'
                      )}
                    >
                      <item.icon className="size-4" />
                      <span className="flex-1">
                        {item.label || t(item.labelKey as string)}
                      </span>
                      {badge > 0 ? (
                        <span className="bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)] rounded-full px-1.5 text-xs">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>

          <div className="border-[var(--bigin-border)] my-4 border-t" />

          <ul className="flex flex-col gap-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={t(item.labelKey as string)}
                    aria-label={t(item.labelKey as string)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2',
                      isActive
                        ? 'bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)]'
                        : 'text-[var(--bigin-panel-text)] hover:bg-[var(--bigin-accent)] hover:text-[var(--bigin-panel-text)]'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{t(item.labelKey as string)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-[var(--bigin-border)] shrink-0 border-t p-3">
          {/* Account name display — surfaced only when the account
              name differs from the user's own name (see
              `showAccountStrip`). For a default solo account the two
              match, so we hide it to avoid duplicating the user name
              below; for renamed or shared accounts it tells the user
              which account they're acting in. */}
          {showAccountStrip && account?.name ? (
            <div className="text-[var(--bigin-panel-text)] mb-2 flex items-center gap-2 px-3 text-xs">
              <UsersRound className="size-3.5 shrink-0" />
              {/* `title=` exposes the full name on hover when it
                  gets truncated (long account names + narrow
                  sidebars). Cheap a11y win. */}
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole
                ? // Always render the chip — owners used to be
                  // invisible here, which made them indistinguishable
                  // from admins at a glance. Now everyone sees their
                  // role (with a colour cue) regardless of tier.
                  (() => {
                    const meta = ROLE_CHIP[accountRole];
                    const Icon = meta.icon;
                    return (
                      <span
                        className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium tracking-wider uppercase ${meta.className}`}
                      >
                        <Icon className="size-3" />
                        {t(meta.labelKey as string)}
                      </span>
                    );
                  })()
                : null}
            </div>
          ) : null}
          <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="size-8 shrink-0">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? t('defaultAvatar')}
                />
              ) : null}
              <AvatarFallback className="bg-[var(--bigin-accent)] text-[var(--bigin-panel-text)] text-sm font-medium">
                {profile?.full_name?.charAt(0)?.toUpperCase() ??
                  profile?.email?.charAt(0)?.toUpperCase() ??
                  'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[var(--bigin-panel-text)] truncate text-sm font-medium">
                {profile?.full_name ?? t('defaultUser')}
              </p>
              <p className="text-[var(--bigin-panel-text)] truncate text-xs">
                {profile?.email ?? ''}
              </p>
            </div>
          </div>
        </div>
      </aside>
  );
}
