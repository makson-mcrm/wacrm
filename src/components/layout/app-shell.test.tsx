import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { parse } from 'postcss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { PipelineBoard } from '@/components/pipelines/pipeline-board';
import type { PipelineStage } from '@/types';
import { geometryCssVars } from '@/lib/ui/layout-geometry';

const route = vi.hoisted(() => ({ pathname: '/contacts' }));
beforeEach(() => { route.pathname = '/contacts'; });
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => route.pathname,
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
    defaultCurrency: 'PLN',
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
  it.each(['/deals', '/contacts', '/dashboard', '/calendar', '/finances', '/settings'])(
    'zachowuje dotychczasową ramę poza Lejkiem: %s',
    (pathname) => {
      route.pathname = pathname;
      const html = render();
      expect(html).toContain(`--app-sidebar-width:${['/contacts', '/calendar'].includes(pathname) ? 65 : 160}px`);
      expect(html).toContain('--brand-sidebar:#093E52');
      expect(html).toContain('bg-[var(--brand-page)]');
      expect(html).toContain('lg:px-5');
      expect(html).not.toContain('lg:bg-[#20383d]');
      expect(html).not.toContain('bg-[#f9fbfc]');
      expect(html).toContain('--brand-sidebar-alt:#0B4A63');
      expect(html).toContain(`--app-header-height:${['/contacts', '/calendar'].includes(pathname) ? 49 : 56}px`);
    }
  );

  it('KM3.2.08: rzeczywista rama i tablica używają wymiarów i kolorów Bigin', async () => {
    route.pathname = '/pipelines';
    const stages = Array.from({ length: 6 }, (_, position) => ({
      id: `synthetic-${position}`, name: `Etap ${position}`, position,
      pipeline_id: 'synthetic-pipeline',
    })) as PipelineStage[];
    const html = renderToStaticMarkup(
      <AppShell>
        <PipelineBoard stages={stages} deals={[]} onDealMoved={vi.fn()} onAddDeal={vi.fn()} onEditDeal={vi.fn()} />
      </AppShell>
    );
    const root = html.match(/<div data-slot="app-shell"[^>]+>/)![0];
    const sidebar = html.match(/<aside class="([^"]+)"/)![1];
    const main = html.match(/<main[^>]+class="([^"]+)"/)![1];
    const board = html.match(/<div class="(pipeline-scroll[^"]+)"/)![1];
    const columns = [...html.matchAll(/data-pipeline-column="[^"]+"[^>]+class="([^"]+)"/g)].map((match) => match[1]);
    expect(root).toContain('--app-sidebar-width:285px');
    expect(root).toContain('--content-pad-x:10px');
    expect(root).toContain('background:#F9FBFC');
    expect(root).toContain('--app-header-height:49px');
    expect(root).toContain('--list-header-background:#093E52');
    expect(sidebar).toContain('lg:w-[var(--app-sidebar-width)]');
    expect(sidebar).toContain('lg:shrink-0');
    expect(html).toContain('background:#093E52;--sidebar-alt:#0B4A63');
    expect(main).toContain('lg:px-[var(--content-pad-x)]');
    expect(main).toContain('bg-[var(--brand-page)]');
    expect(board).toContain('bg-[#f9fbfc]');
    expect(board).toContain('overflow-x-auto');
    expect(columns).toHaveLength(6);
    for (const column of columns) {
      expect(column).toContain('w-[220px]');
      expect(column).toContain('flex-none');
    }
    expect(board).toContain('gap-[10px]');

    // Compile the classes rendered by the real components, so a missing or
    // ineffective responsive utility cannot pass on its class name alone.
    const require = createRequire(import.meta.url);
    const compiler = await compile(
      readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8') + '\n@tailwind utilities;'
    );
    const classes = [sidebar, main, board, ...columns].flatMap((value) => value.split(/\s+/));
    const css = parse(compiler.build(classes));
    const declarations: { selector: string; property: string; value: string; media?: string }[] = [];
    css.walkRules((rule) => {
      const parent = rule.parent;
      rule.walkDecls((decl) => {
        declarations.push({
          selector: rule.selector.replace(/\\(.)/g, '$1'),
          property: decl.prop,
          value: decl.value,
          media: parent?.type === 'atrule' && parent.name === 'media' ? parent.params : undefined,
        });
      });
    });
    for (const [selector, property, value, media] of [
      ['.lg:w-[var(--app-sidebar-width)]', 'width', 'var(--app-sidebar-width)', '(width >= 64rem)'],
      ['.lg:shrink-0', 'flex-shrink', '0', '(width >= 64rem)'],
      ['.bg-[var(--brand-page)]', 'background-color', 'var(--brand-page)', undefined],
      ['.lg:px-[var(--content-pad-x)]', 'padding-inline', 'var(--content-pad-x)', '(width >= 64rem)'],
      ['.bg-[#f9fbfc]', 'background-color', '#f9fbfc', undefined],
      ['.w-[220px]', 'width', '220px', undefined],
      ['.flex-none', 'flex', 'none', undefined],
      ['.gap-[10px]', 'gap', '10px', undefined],
    ]) expect(declarations).toContainEqual({ selector, property, value, media });
  });

  it('ustawia wszystkie zmienne raz na głównym kontenerze i zachowuje przesunięcie viewportu', () => {
    const html = render();
    const root = html.match(/<div data-slot="app-shell"[^>]+>/)![0];
    for (const [name, value] of Object.entries(geometryCssVars('lists'))) {
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
