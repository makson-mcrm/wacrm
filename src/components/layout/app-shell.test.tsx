import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'tailwindcss';
import { parse } from 'postcss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { PipelineBoard } from '@/components/pipelines/pipeline-board';
import type { PipelineStage } from '@/types';
import { BIGIN_TOKENS, BIGIN_CSS_VARS, biginGeometryCssVars } from '@/lib/ui/layout-geometry';
import RootLayout from '@/app/layout';

const route = vi.hoisted(() => ({ pathname: '/contacts' }));
beforeEach(() => { route.pathname = '/contacts'; });
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => route.pathname,
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'pl', getMessages: async () => ({}) }));
vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'synthetic-inter' }) }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/hooks/use-theme', () => ({ ThemeProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/components/themed-toaster', () => ({ ThemedToaster: () => null }));
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
  it.each(['/deals', '/contacts', '/dashboard', '/calendar', '/finances', '/settings', '/future-synthetic-route'])(
    'stosuje globalną ramę Bigin także na nowej trasie: %s',
    (pathname) => {
      route.pathname = pathname;
      const html = render();
      expect(html).toContain('--app-sidebar-width:65px');
      expect(html).toContain('--bigin-panel:#093E52');
      expect(html).toContain('bg-[var(--bigin-bg)]');
      expect(html).toContain('lg:px-[var(--content-pad-x)]');
      expect(html).not.toContain('lg:bg-[#20383d]');
      expect(html).not.toContain('bg-[#f9fbfc]');
      expect(html).toContain('--bigin-accent:#0B4A63');
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
    expect(root).toContain('--bigin-bg:#F9FBFC');
    expect(root).toContain('--app-header-height:49px');
    expect(root).toContain('--list-header-background:var(--bigin-panel)');
    expect(sidebar).toContain('lg:w-[var(--app-sidebar-width)]');
    expect(sidebar).toContain('lg:shrink-0');
    const globalCss = parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
    const shellColors: Record<string, string> = {};
    globalCss.walkRules((rule) => {
      if (rule.selectors.includes("[data-slot='app-shell'].bigin-shell")) {
        rule.walkDecls((decl) => { shellColors[decl.prop] = decl.value; });
      }
    });
    expect(root).toContain('bigin-shell');
    expect(shellColors).toMatchObject({
      '--sidebar': 'var(--bigin-panel)', '--brand-sidebar-alt': 'var(--bigin-accent)',
      '--sidebar-foreground': 'var(--bigin-panel-text)',
    });
    expect(main).toContain('lg:px-[var(--content-pad-x)]');
    expect(main).toContain('bg-[var(--bigin-bg)]');
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
      ['.bg-[var(--bigin-bg)]', 'background-color', 'var(--bigin-bg)', undefined],
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
    for (const [name, value] of Object.entries({ ...BIGIN_CSS_VARS, ...biginGeometryCssVars('lists') })) {
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


describe('KM3.2.23: globalny standard Bigin w RootLayout', () => {
  const source = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const css = parse(source);
  const declarations = (selector: string) => {
    const result: Record<string, string> = {};
    css.walkRules((rule) => {
      if (rule.selectors.includes(selector)) rule.walkDecls((decl) => { result[decl.prop] = decl.value; });
    });
    return result;
  };

  it('utrzymuje całą paletę :root zgodną z tokenami używanymi przez shell i RootLayout', () => {
    const defaults = declarations(':root');
    expect(BIGIN_TOKENS).toMatchObject({
      bg: '#F9FBFC', panel: '#093E52', accent: '#0B4A63', border: '#E0E9EE',
      row: '#FCFDFD', hover: '#F0F7FB', link: '#7EB5F4',
    });
    // Hex digits are case-insensitive; compare values without requiring CSS formatting.
    for (const [name, value] of Object.entries(BIGIN_CSS_VARS)) {
      expect(defaults[name]?.toLowerCase()).toBe(value.toLowerCase());
    }
    const html = render();
    for (const [name, value] of Object.entries(BIGIN_CSS_VARS)) expect(html).toContain(`${name}:${value}`);
    expect(declarations('body').background).toBe('var(--bigin-bg)');
    expect(declarations("[data-slot='app-shell']").background).toBe('var(--bigin-bg)');
    expect(declarations('body.bigin-shell')).toMatchObject({
      '--background': 'var(--bigin-bg)', '--brand-sidebar': 'var(--bigin-panel)',
      'font-family': 'var(--font-sans), Arial, sans-serif', 'font-size': 'var(--bigin-font-size)',
    });
  });

  it('ekran bez własnych stylów dziedziczy tło i geometrię z rzeczywistego RootLayout', async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <main id="unstyled-screen"><p>Nowy ekran syntetyczny</p></main> }));
    expect(html).toMatch(/<html[^>]+class="[^"]*bigin-shell/);
    const body = html.match(/<body[^>]+>/)![0];
    expect(body).toContain('class="bigin-shell');
    for (const [name, value] of Object.entries(BIGIN_CSS_VARS)) expect(body).toContain(`${name}:${value}`);
    expect(body).toContain('--app-sidebar-width:65px');
    expect(body).toContain('--app-header-height:56px');
    expect(body).toContain('--columns-three:minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)');
    expect(body).toContain('--bigin-font-size:14px');
    expect(html).toContain('<main id="unstyled-screen"><p>Nowy ekran syntetyczny</p></main>');
    const backgroundVariable = declarations('body').background.match(/^var\((--[^)]+)\)$/)![1];
    expect(BIGIN_CSS_VARS[backgroundVariable as keyof typeof BIGIN_CSS_VARS]).toBe('#F9FBFC');
    // Optional real-browser evidence, without a server, network or customer data.
    if (process.env.KM3_RENDER_DIR) {
      mkdirSync(process.env.KM3_RENDER_DIR, { recursive: true });
      writeFileSync(join(process.env.KM3_RENDER_DIR, 'unstyled.html'), html.replace('<html ', '<html style="--font-sans:Arial" ').replace('<head>', '<head><link rel="stylesheet" href="app.css"/>'));
      for (const pathname of ['/contacts', '/pipelines', '/future-synthetic-route']) {
        route.pathname = pathname;
        const page = renderToStaticMarkup(await RootLayout({ children: <AppShell><p>Treść syntetyczna</p></AppShell> }));
        writeFileSync(join(process.env.KM3_RENDER_DIR, `${pathname.slice(1)}.html`), page.replace('<html ', '<html style="--font-sans:Arial" ').replace('<head>', '<head><link rel="stylesheet" href="app.css"/>'));
      }
    }
  });
});
