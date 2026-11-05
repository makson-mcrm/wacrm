'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AccountAccessAlert } from '@/components/layout/account-access-alert';
import { DailyStartCard } from '@/components/layout/daily-start-card';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { PresenceHeartbeat } from '@/components/presence/presence-heartbeat';
import { geometryCssVars } from '@/lib/ui/layout-geometry';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

/** The single responsive frame used by every authenticated screen. */
export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isPipeline = usePathname() === '/pipelines';
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
      className={cn(
        'relative flex h-[var(--app-viewport-height,100dvh)] min-h-0 overflow-hidden',
        isPipeline ? 'bg-[#f9fbfc]' : 'bg-app-surface'
      )}
      style={{
        ...geometryCssVars(isPipeline ? 'pipelines' : 'default'),
        transform: 'translateY(var(--app-viewport-offset-top, 0px))',
      }}
    >
      <PresenceHeartbeat />
      <DailyStartCard />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          className={cn(
            'min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-2.5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] text-slate-950 md:p-6 md:pb-6 lg:pt-3',
            isPipeline
              ? 'bg-[#f9fbfc] lg:px-[var(--content-pad-x)]'
              : 'bg-[#f5f8fb] md:bg-transparent lg:px-5'
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
