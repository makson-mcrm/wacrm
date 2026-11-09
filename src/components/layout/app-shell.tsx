'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AccountAccessAlert } from '@/components/layout/account-access-alert';
import { DailyStartCard } from '@/components/layout/daily-start-card';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { PresenceHeartbeat } from '@/components/presence/presence-heartbeat';
import {
  geometryCssVars,
  BRAND_SIDEBAR_BG, BRAND_SIDEBAR_BG_ALT, BRAND_PAGE_BG, BRAND_PAGE_BG_PIPELINE,
  BRAND_BORDER, BRAND_HOVER, BRAND_LINK, BRAND_INFO_BANNER,
  BRAND_HEADER_BG,
  LIST_HEADER_HEIGHT,
  LIST_TEXT_COLOR,
  PIPELINE_COLUMN_WIDTH,
  PIPELINE_COLUMN_GAP,
  PIPELINE_CARD_HEIGHT,
  PIPELINE_CONTENT_BACKGROUND,
} from '@/lib/ui/layout-geometry';
import { surfaceFlags } from '@/lib/ui/surface-flags';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

/** The single responsive frame used by every authenticated screen. */
export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPipeline = pathname === '/pipelines';
  const isBiginList =
    ['/contacts', '/companies', '/calendar'].includes(pathname) ||
    (/^\/deals\/[^/]+$/.test(pathname) && !surfaceFlags.dealsListExtensions);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const updateViewport = () => {
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportOffsetTop = viewport?.offsetTop ?? 0;
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewportHeight - viewportOffsetTop
      );

      root.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
      root.style.setProperty(
        '--app-viewport-offset-top',
        `${viewportOffsetTop}px`
      );
      root.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      root.dataset.keyboardOpen = String(keyboardHeight > 120);
    };

    const keepFocusedFieldVisible = (event: FocusEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        !target.matches('input, textarea, select, [contenteditable="true"]')
      )
        return;

      window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const visibleHeight = viewport?.height ?? window.innerHeight;
        const saveBar = document.querySelector<HTMLElement>(
          '[data-slot="activity-mobile-save"]'
        );
        const reservedBottom = saveBar?.offsetHeight ?? 16;
        if (rect.bottom > visibleHeight - reservedBottom - 16 || rect.top < 8) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 180);
    };

    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    document.addEventListener('focusin', keepFocusedFieldVisible);

    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      document.removeEventListener('focusin', keepFocusedFieldVisible);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-offset-top');
      root.style.removeProperty('--keyboard-height');
      delete root.dataset.keyboardOpen;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Ładowanie…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      data-slot="app-shell"
      data-bigin-list-shell={isBiginList || undefined}
      data-bigin-pipeline-shell={isPipeline || undefined}
      data-bigin-pipeline-cards={(isPipeline && !surfaceFlags.pipelineExtensions) || undefined}
      className={cn(
        'relative flex h-[var(--app-viewport-height,100dvh)] min-h-0 overflow-hidden',
        isBiginList && 'pt-[var(--list-banner-height)]'
      )}
      style={{
        background: isPipeline ? BRAND_PAGE_BG_PIPELINE : BRAND_PAGE_BG,
        '--brand-page': isPipeline ? BRAND_PAGE_BG_PIPELINE : BRAND_PAGE_BG,
        '--brand-sidebar': BRAND_SIDEBAR_BG,
        '--brand-sidebar-alt': BRAND_SIDEBAR_BG_ALT,
        '--brand-hover': BRAND_HOVER,
        '--brand-link': BRAND_LINK,
        '--brand-info': BRAND_INFO_BANNER,
        '--foreground': LIST_TEXT_COLOR,
        '--card-foreground': LIST_TEXT_COLOR,
        '--popover-foreground': LIST_TEXT_COLOR,
        '--accent-foreground': LIST_TEXT_COLOR,
        '--muted-foreground': LIST_TEXT_COLOR,
        '--primary-foreground': BRAND_PAGE_BG,
        '--background': BRAND_PAGE_BG,
        '--card': BRAND_PAGE_BG,
        '--popover': BRAND_PAGE_BG,
        '--border': BRAND_BORDER,
        '--input': BRAND_BORDER,
        '--muted': BRAND_HOVER,
        '--accent': BRAND_HOVER,
        '--primary': BRAND_SIDEBAR_BG,
        ...geometryCssVars(isBiginList ? 'lists' : isPipeline ? 'pipelines' : 'default'),
        ...(isPipeline ? {
          '--app-header-height': `${LIST_HEADER_HEIGHT}px`,
          '--list-header-background': BRAND_HEADER_BG,
          '--pipeline-column-width': `${PIPELINE_COLUMN_WIDTH}px`,
          '--pipeline-column-gap': `${PIPELINE_COLUMN_GAP}px`,
          '--pipeline-card-height': `${PIPELINE_CARD_HEIGHT}px`,
          '--pipeline-content-background': PIPELINE_CONTENT_BACKGROUND,
        } : {}),
        transform: 'translateY(var(--app-viewport-offset-top, 0px))',
      } as CSSProperties}
    >
      <style>{`
        [data-slot="app-shell"] > div > header {
          background: var(--brand-sidebar);
          color: white;
          --foreground: white;
          --muted-foreground: white;
          --muted: var(--brand-sidebar-alt);
          --primary: var(--brand-link);
          border-color: var(--border);
        }
        [data-slot="app-shell"] > div > header a[aria-label="mCRM AI — DZISIAJ"] > span:first-child {
          background: var(--brand-sidebar-alt);
        }
        [data-slot="app-shell"] > div > header a[aria-label="Powiadomienia"]:hover {
          background: var(--brand-sidebar-alt);
        }
      `}</style>
      {isPipeline && <style>{`
        [data-bigin-pipeline-shell] > div > header {
          background: var(--list-header-background);
          color: #ffffff;
          --foreground: #ffffff;
          --muted-foreground: #e6eef2;
          border-bottom: 1px solid var(--brand-sidebar-alt);
        }
        [data-bigin-pipeline-shell] > div > header svg {
          color: #ffffff;
        }
        [data-bigin-pipeline-shell],
        [data-bigin-pipeline-shell] #main-content,
        [data-bigin-pipeline-shell] .pipeline-scroll {
          background: var(--pipeline-content-background);
        }
        [data-bigin-pipeline-shell] .pipeline-scroll { gap: var(--pipeline-column-gap); }
        [data-bigin-pipeline-shell] [data-pipeline-column] { width: var(--pipeline-column-width); }
        [data-bigin-pipeline-cards] [data-pipeline-deal] {
          height: var(--pipeline-card-height);
          min-height: var(--pipeline-card-height);
          padding: 0 var(--pipeline-column-gap);
        }
        [data-bigin-pipeline-cards] [data-pipeline-deal] > a {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        [data-bigin-pipeline-cards] [data-pipeline-deal] > p.font-bold { display: inline; margin: 0; }
        [data-bigin-pipeline-cards] [data-pipeline-deal] > time { display: inline; margin: 0 0 0 var(--pipeline-column-gap); }
      `}</style>}
      {isBiginList && <>
        {/* Preserve the measured banner offset without copying Bigin marketing. */}
        <div data-slot="list-banner" aria-hidden="true" className="absolute inset-x-0 top-0 h-[var(--list-banner-height)] bg-[var(--brand-info)]" />
        <style>{`
          [data-bigin-list-shell] > div > header {
            background: var(--list-header-background);
            color: white;
            --foreground: white;
            --muted-foreground: white;
            border: 0;
          }
          @media (min-width: 64rem) {
            [data-bigin-list-shell] > aside {
              width: var(--app-sidebar-width);
              flex-shrink: 0;
              background: var(--list-header-background);
              border: 0;
            }
            [data-bigin-list-shell] > aside > div:first-child {
              padding: 0;
              justify-content: center;
              border: 0;
            }
            [data-bigin-list-shell] > aside > div:first-child a > span { display: none; }
            [data-bigin-list-shell] > aside nav { padding: 0; }
            [data-bigin-list-shell] > aside nav ul { gap: 0; }
            [data-bigin-list-shell] > aside nav a {
              flex-direction: column;
              justify-content: center;
              gap: 4px;
              min-height: 64px;
              padding: 8px 4px;
              border-radius: 0;
              font-size: 11px;
            }
            [data-bigin-list-shell] > aside nav a > span {
              flex: none;
              max-width: 57px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            [data-bigin-list-shell] > aside nav details summary {
              overflow: hidden;
              padding: 8px 4px;
              font-size: 9px;
            }
            [data-bigin-list-shell] > aside > div:last-child { padding: 4px; }
            [data-bigin-list-shell] > aside > div:last-child > div { padding: 4px; justify-content: center; }
            [data-bigin-list-shell] > aside > div:last-child > div > div { display: none; }
            [data-bigin-list-shell] #main-content {
              padding: 0;
              background: var(--list-content-background);
              color: var(--list-text);
            }
          }
        `}</style>
      </>}
      <PresenceHeartbeat />
      <DailyStartCard />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          className={cn(
            'min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-2.5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] text-foreground md:p-6 md:pb-6 lg:pt-3',
            isPipeline
              ? 'bg-[var(--brand-page)] lg:px-[var(--content-pad-x)]'
              : 'bg-[var(--brand-page)] lg:px-5'
          )}
        >
          <AccountAccessAlert />
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
