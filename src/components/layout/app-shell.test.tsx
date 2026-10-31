import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { parse } from 'postcss';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { geometryCssVars } from '@/lib/ui/layout-geometry';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/contacts',
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children?: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'synthetic-user' },
    loading: false,
    profileLoading: false,
    profile: { full_name: 'Osoba syntetyczna' },
  }),
}));
vi.mock('@/hooks/use-total-unread', () => ({ useTotalUnread: () => 0 }));
vi.mock('@/hooks/use-unread-notifications', () => ({
  useUnreadNotifications: () => 0,
}));
vi.mock('@/hooks/use-unhandled-submissions', () => ({
  useUnhandledSubmissions: () => 0,
}));
vi.mock('@/components/layout/account-access-alert', () => ({
  AccountAccessAlert: () => null,
}));
vi.mock('@/components/layout/daily-start-card', () => ({
  DailyStartCard: () => null,
}));
vi.mock('@/components/layout/mobile-bottom-nav', () => ({
  MobileBottomNav: () => null,
}));
vi.mock('@/components/presence/presence-heartbeat', () => ({
  PresenceHeartbeat: () => null,
}));
vi.mock('@/components/layout/mode-toggle', () => ({ ModeToggle: () => null }));
vi.mock('@/components/layout/global-crm-search', () => ({
  GlobalCrmSearch: () => null,
}));
vi.mock('@/components/layout/global-add', () => ({ GlobalAdd: () => null }));

const render = () =>
  renderToStaticMarkup(
    <AppShell>
      <p>Treść syntetyczna</p>
    </AppShell>
  );

describe('02A-5: geometria shellu, nagłówka i menu', () => {
  it('ustawia wszystkie zmienne raz na głównym kontenerze i zachowuje przesunięcie viewportu', () => {
    const html = render();
    const root = html.match(/<div data-slot="app-shell"[^>]+>/)![0];
    for (const [name, value] of Object.entries(geometryCssVars())) {
      expect(root).toContain(`${name}:${value}`);
      expect(html.split(`${name}:`)).toHaveLength(2);
    }
    expect(root).toContain(
      'transform:translateY(var(--app-viewport-offset-top, 0px))'
    );
    expect(html).toContain('Treść syntetyczna');
  });

  it('rzeczywiste Sidebar i Header używają tokenów przy tych samych breakpointach', async () => {
    const html = render();
    const sidebar = html.match(/<aside class="([^"]+)"/)![1];
    const header = html.match(/<header class="([^"]+)"/)![1];
    const logo = html.match(/<aside[^>]+><div class="([^"]+)"/)![1];
    expect(sidebar).toContain('lg:w-[var(--app-sidebar-width)]');
    expect(sidebar).toContain('w-64');
    expect(sidebar).not.toContain('lg:w-40');
    expect(header).toContain('min-h-[var(--app-header-height)]');
    expect(header).toContain('md:h-[var(--app-header-height)]');
    expect(logo).toContain('h-[var(--app-header-height)]');

    const require = createRequire(import.meta.url);
    const compiler = await compile(
      readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8') +
        '\n@tailwind utilities;'
    );
    const classes = [sidebar, header, logo].flatMap((value) =>
      value.split(/\s+/)
    );
    const css = parse(compiler.build(classes));
    const rules: { property: string; value: string; media?: string }[] = [];
    css.walkRules((rule) => {
      if (
        !classes.some(
          (name) => rule.selector.replace(/\\(.)/g, '$1') === `.${name}`
        )
      )
        return;
      const parent = rule.parent;
      rule.walkDecls((declaration) => {
        rules.push({
          property: declaration.prop,
          value: declaration.value,
          media:
            parent?.type === 'atrule' && parent.name === 'media'
              ? parent.params
              : undefined,
        });
      });
    });
    expect(rules).toContainEqual({
      property: 'width',
      value: 'var(--app-sidebar-width)',
      media: '(width >= 64rem)',
    });
    expect(rules).toContainEqual({
      property: 'height',
      value: 'var(--app-header-height)',
      media: '(width >= 48rem)',
    });
    expect(rules).toContainEqual({
      property: 'min-height',
      value: 'var(--app-header-height)',
      media: undefined,
    });
    expect(rules).toContainEqual({
      property: 'height',
      value: 'var(--app-header-height)',
      media: undefined,
    });
  });
});
