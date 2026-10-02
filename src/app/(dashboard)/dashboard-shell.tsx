'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider } from '@/hooks/use-auth';

// Keep the route-level boundary small: authenticated screens all render
// through the one shared AppShell implementation. AppShell owns the
// window.visualViewport, 100dvh and safe-area-inset-bottom behavior.
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
