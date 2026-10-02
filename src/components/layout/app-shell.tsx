'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AccountAccessAlert } from '@/components/layout/account-access-alert';
import { DailyStartCard } from '@/components/layout/daily-start-card';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { PresenceHeartbeat } from '@/components/presence/presence-heartbeat';

interface AppShellProps {
  children: React.ReactNode;
}

/** The single responsive frame used by every authenticated screen. */
export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
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

    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
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
      className="bg-app-surface relative flex h-[var(--app-viewport-height,100dvh)] min-h-0 overflow-hidden"
      style={{ transform: 'translateY(var(--app-viewport-offset-top, 0px))' }}
    >
      <PresenceHeartbeat />
      <DailyStartCard />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6 lg:px-5 lg:pt-3"
        >
          <AccountAccessAlert />
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
