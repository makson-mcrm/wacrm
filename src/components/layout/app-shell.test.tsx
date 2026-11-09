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
import { BIGIN_TOKENS, BIGIN_CSS_VARS, biginGeometryCssVars, SHELL_CSS_VARS, geometryCssVars, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, TOPBAR_HEIGHT, TOPBAR_HEIGHT_LIST } from '@/lib/ui/layout-geometry';
import RootLayout from '@/app/layout';
import { Sidebar } from './sidebar';

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
  // Deliberately visible: a null mock hid the global overlay regression.
  DailyStartCard: () => <div data-slot="daily-start-card" className="fixed inset-0">Nowy dzień</div>,
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

const render = async () => renderToStaticMarkup(await RootLayout({
  children: <AppShell><p>Treść syntetyczna</p></AppShell>,
}));

describe('KM3.5.1E: shell nie montuje nakładki Nowy dzień', () => {
  it.each([390, 768, 1024, 1536])('Lejek pozostaje dostępny przy %i px', async (width) => {
    vi.stubGlobal('window', { innerWidth: width });
    try {
      route.pathname = '/pipelines';
      const html = await render();
      expect(html).toContain('Treść syntetyczna');
      expect(html).toContain('<aside');
      expect(html).toContain('<header');
      expect(html).not.toContain('data-slot="daily-start-card"');
      expect(html).not.toContain('Nowy dzień');
      expect(html).not.toContain('role="dialog"');
      expect(html).not.toContain('aria-modal="true"');
      const classes = [...html.matchAll(/class="([^"]*)"/g)].map((match) => match[1].split(/\s+/));
      expect(classes.some((tokens) => tokens.includes('fixed') && tokens.includes('inset-0'))).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('wspólny shell nie importuje ani nie renderuje DailyStartCard', () => {
    const source = readFileSync(new URL('./app-shell.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('DailyStartCard');
    expect(source).not.toContain('fixed inset-0');
  });
});

describe('02A-5: geometria shellu, nagłówka i menu', () => {
  it.each(['/pipelines', '/contacts', '/companies', '/dashboard', '/calendar', '/quick-call', '/deals', '/finances', '/settings', '/agents', '/audyt-crm', '/future-synthetic-route'])(
    'stosuje globalną ramę Bigin także na nowej trasie: %s',
    async (pathname) => {
      route.pathname = pathname;
      const html = await render();
      expect(html).toContain('--app-sidebar-width:64px');
      expect(html).toContain('--bigin-panel:#093E53');
      expect(html).toContain('bg-[var(--bigin-bg)]');
      expect(html).toContain('lg:px-[var(--content-pad-x)]');
      expect(html).not.toContain('lg:bg-[#20383d]');
      expect(html).not.toContain('bg-[#f9fbfc]');
      expect(html).toContain('--bigin-accent:#0B4A63');
      expect(html).toContain('--app-topbar-height:48px');
      expect(html).toContain('--app-mobile-topbar-height:43px');
      expect(html).toContain('--app-mobile-sidebar-width:63px');
      expect(html).toContain('data-bigin-compact-shell="true"');
      expect(html.match(/<aside\b/g)).toHaveLength(1);
      expect(html.match(/<header\b/g)).toHaveLength(1);
      if (pathname === '/agents') {
        const layout = readFileSync(new URL('../../app/(dashboard)/layout.tsx', import.meta.url), 'utf8');
        const page = readFileSync(new URL('../../app/(dashboard)/agents/page.tsx', import.meta.url), 'utf8');
        expect(layout).toContain('<DashboardShell>{children}</DashboardShell>');
        expect(page).not.toMatch(/<(?:AppShell|DashboardShell|Sidebar|Header)\b/);
      }
      if (pathname === '/audyt-crm') {
        const page = readFileSync(new URL('../../app/audyt-crm/page.tsx', import.meta.url), 'utf8');
        expect(page).toContain("import { DashboardShell } from '@/app/(dashboard)/dashboard-shell'");
        expect(page).toContain('<DashboardShell>');
        expect(page).toContain('</DashboardShell>');
        expect(page).not.toMatch(/<(?:AppShell|Sidebar|Header|header|main)\b/);
        expect(page).toContain('aria-label="Narzędzia audytu"');
      }
      expect(html).not.toContain('data-slot="list-banner"');
      expect(html).not.toContain('pt-[var(--list-banner-height)]');
      for (const [name, value] of Object.entries(SHELL_CSS_VARS)) {
        expect(html.match(/<html[^>]+>/)![0]).toContain(`${name}:${value}`);
        expect(html.split(`${name}:`)).toHaveLength(2);
      }
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
    expect(root).not.toContain('--app-sidebar-width:');
    expect(root).toContain('--content-pad-x:10px');
    expect(root).not.toContain('--bigin-bg:');
    expect(root).not.toContain('--app-header-height:');
    expect(root).toContain('--list-header-background:var(--bigin-panel)');
    expect(sidebar).toContain('w-[var(--app-sidebar-width)]');
    expect(sidebar).toContain('shrink-0');
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
    expect(board).toContain('bg-[var(--bigin-bg)]');
    expect(board).toContain('overflow-x-auto');
    expect(columns).toHaveLength(6);
    for (const column of columns) {
      expect(column).toContain('w-[230px]');
      expect(column).toContain('flex-none');
    }
    expect(board).toContain('gap-[0px]');

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
      ['.w-[var(--app-sidebar-width)]', 'width', 'var(--app-sidebar-width)', undefined],
      ['.shrink-0', 'flex-shrink', '0', undefined],
      ['.bg-[var(--bigin-bg)]', 'background-color', 'var(--bigin-bg)', undefined],
      ['.lg:px-[var(--content-pad-x)]', 'padding-inline', 'var(--content-pad-x)', '(width >= 64rem)'],
      ['.px-[5px]', 'padding-inline', '5px', undefined],
      ['.w-[230px]', 'width', '230px', undefined],
      ['.flex-none', 'flex', 'none', undefined],
      ['.gap-[0px]', 'gap', '0px', undefined],
    ]) expect(declarations).toContainEqual({ selector, property, value, media });
  });

  it('dziedziczy tokeny z html i zachowuje lokalne przesunięcie viewportu', async () => {
    const html = await render();
    const root = html.match(/<div data-slot="app-shell"[^>]+>/)![0];
    for (const [name, value] of Object.entries({ ...BIGIN_CSS_VARS, ...SHELL_CSS_VARS })) {
      expect(root).not.toContain(`${name}:`);
      expect(html.match(/<html[^>]+>/)![0]).toContain(`${name}:${value}`);
      expect(html.split(`${name}:`)).toHaveLength(2);
    }
    expect(root).toContain(
      'transform:translateY(var(--app-viewport-offset-top, 0px))'
    );
    expect(html).toContain('Treść syntetyczna');
  });

  it('rzeczywiste Sidebar i Header używają tokenów przy tych samych breakpointach', async () => {
    const html = await render();
    const sidebar = html.match(/<aside class="([^"]+)"/)![1];
    const header = html.match(/<header class="([^"]+)"/)![1];
    const logo = html.match(/<aside[^>]+><div class="([^"]+)"/)![1];
    expect(sidebar).toContain('w-[var(--app-sidebar-width)]');
    expect(sidebar).not.toMatch(/(?:^|\s)(?:lg:)?w-(?:64|16|40)(?:\s|$)/);
    expect(sidebar).not.toContain('lg:w-40');
    expect(header).toContain('min-h-[var(--app-header-height)]');
    expect(header).toContain('md:h-[var(--app-header-height)]');
    expect(logo).toContain('h-[var(--app-topbar-height)]');
    expect(html).toContain('[&amp;&gt;header]:h-[var(--app-topbar-height)]');

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
      media: undefined,
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
      value: 'var(--app-topbar-height)',
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

  it('utrzymuje całą paletę :root zgodną z tokenami używanymi przez shell i RootLayout', async () => {
    const defaults = declarations(':root');
    expect(BIGIN_TOKENS).toMatchObject({
      bg: '#F9FBFC', panel: '#093E53', accent: '#0B4A63', border: '#E0E9EE',
      row: '#FCFDFD', hover: '#F0F7FB', link: '#7EB5F4',
    });
    // Hex digits are case-insensitive; compare values without requiring CSS formatting.
    for (const [name, value] of Object.entries(BIGIN_CSS_VARS)) {
      expect(defaults[name]?.toLowerCase()).toBe(value.toLowerCase());
    }
    const html = await render();
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
    const root = html.match(/<html[^>]+>/)![0];
    expect(body).toContain('class="bigin-shell');
    for (const [name, value] of Object.entries(BIGIN_CSS_VARS)) expect(root).toContain(`${name}:${value}`);
    expect(root).toContain('--app-sidebar-width:64px');
    expect(root).toContain('--app-topbar-height:48px');
    expect(root).toContain('--columns-three:minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr)');
    expect(root).toContain('--bigin-font-size:14px');
    expect(html).toContain('<main id="unstyled-screen"><p>Nowy ekran syntetyczny</p></main>');
    const backgroundVariable = declarations('body').background.match(/^var\((--[^)]+)\)$/)![1];
    expect(BIGIN_CSS_VARS[backgroundVariable as keyof typeof BIGIN_CSS_VARS]).toBe('#F9FBFC');
    // Optional real-browser evidence, without a server, network or customer data.
    if (process.env.KM3_RENDER_DIR) {
      mkdirSync(process.env.KM3_RENDER_DIR, { recursive: true });
      writeFileSync(join(process.env.KM3_RENDER_DIR, 'unstyled.html'), html.replace('<head>', '<head><link rel="stylesheet" href="app.css"/>'));
      for (const pathname of ['/contacts', '/pipelines', '/future-synthetic-route']) {
        route.pathname = pathname;
        const page = renderToStaticMarkup(await RootLayout({ children: <AppShell><p>Treść syntetyczna</p></AppShell> }));
        writeFileSync(join(process.env.KM3_RENDER_DIR, `${pathname.slice(1)}.html`), page.replace('<head>', '<head><link rel="stylesheet" href="app.css"/>'));
      }
    }
  });
});

describe('KM3.2.25: jeden wymiar szkieletu, bez banera demo', () => {
  it('definiuje wymiary w jednym miejscu; każdy wariant treści dziedziczy je bez nadpisań', () => {
    expect([SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, TOPBAR_HEIGHT, TOPBAR_HEIGHT_LIST]).toEqual([64, 64, 48, 48]);
    expect(SHELL_CSS_VARS).toMatchObject({
      '--app-sidebar-width': '64px', '--app-sidebar-width-collapsed': '64px',
      '--app-topbar-height': '48px', '--list-banner-height': '0px',
      '--app-header-height': 'var(--app-topbar-height)',
    });
    for (const surface of ['default', 'pipelines', 'lists', 'cards', 'calendar'] as const) {
      for (const name of Object.keys(SHELL_CSS_VARS)) expect(geometryCssVars(surface)).not.toHaveProperty(name);
    }
    for (const surface of ['default', 'pipelines', 'lists'] as const) {
      for (const name of Object.keys(SHELL_CSS_VARS)) expect(biginGeometryCssVars(surface)).not.toHaveProperty(name);
    }
  });

  it.each([false, true])('sidebar używa wyłącznie zmiennej szerokości, collapsed=%s', async (collapsed) => {
    const html = renderToStaticMarkup(await RootLayout({ children: <Sidebar collapsed={collapsed} /> }));
    const aside = html.match(/<aside[^>]+>/)![0];
    const widthClasses = aside.match(/class="([^"]+)"/)![1].split(/\s+/).filter((name) => /(?:^|:)w-/.test(name));
    expect(widthClasses).toEqual([collapsed ? 'w-[var(--app-sidebar-width-collapsed)]' : 'w-[var(--app-sidebar-width)]']);
    expect(aside).not.toMatch(/(?:width:|--app-sidebar-width:)/);
  });

  it('blokuje wysokość nagłówka na wszystkich breakpointach i usuwa demo także ze źródła', async () => {
    const html = await render();
    const source = readFileSync(new URL('./app-shell.tsx', import.meta.url), 'utf8');
    expect(source).not.toMatch(/data-slot=["']list-banner["']|pt-\[var\(--list-banner-height\)\]/);
    expect(html).toContain('[&amp;&gt;header]:h-[var(--app-topbar-height)]');
    const css = parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
    const dimensions: Record<string, string> = {};
    css.walkRules((rule) => {
      if (rule.selector === "[data-slot='app-shell'] > div > header") {
        if (rule.parent?.type === 'root') {
          rule.walkDecls((decl) => { dimensions[decl.prop] = decl.value; });
        } else {
          // Compact chrome may adjust spacing, but must never replace the
          // inherited height or re-enable wrapping at a responsive breakpoint.
          const responsive: Record<string, string> = {};
          rule.walkDecls((decl) => { responsive[decl.prop] = decl.value; });
          expect(responsive).toEqual({ gap: '8px', 'padding-inline': '8px' });
          expect(rule.parent?.type).toBe('atrule');
          if (rule.parent?.type === 'atrule') expect(rule.parent.params).toBe('(max-width: 1280px)');
        }
      }
    });
    expect(dimensions).toMatchObject({
      height: 'var(--app-topbar-height)', 'min-height': 'var(--app-topbar-height)',
      'max-height': 'var(--app-topbar-height)', 'flex-wrap': 'nowrap', 'padding-block': '0',
      background: 'var(--bigin-panel)', '--muted': 'var(--bigin-accent)',
      color: 'var(--bigin-panel-text)',
    });
    const cssSource = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
    expect(cssSource).not.toContain('--brand-info');
  });

  it('pozycje menu, przyciski paska i nawigacja mobilna korzystają z tej samej palety', () => {
    const css = parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
    const declarations = (selector: string) => {
      const values: Record<string, string> = {};
      css.walkRules((rule) => {
        if (rule.selectors.includes(selector)) rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
      });
      return values;
    };
    for (const selector of [
      "[data-slot='app-shell'] > aside nav a",
      "[data-slot='app-shell'] > div > header > div > :is(a, button)",
      "[data-slot='app-shell'] > div > header > div > div > button",
      "[data-slot='mobile-bottom-nav'] a", "[data-slot='mobile-bottom-nav'] button",
    ]) expect(declarations(selector).color).toBe('var(--bigin-panel-text)');
    for (const selector of [
      "[data-slot='app-shell'] > aside nav a:hover",
      "[data-slot='app-shell'] > div > header > div > div > button:is(:hover, :focus-visible, [data-popup-open])",
      "[data-slot='mobile-bottom-nav'] button > span:first-child",
    ]) expect(declarations(selector).background).toBe('var(--bigin-accent)');
    expect(declarations("[data-slot='mobile-bottom-nav']").background).toBe('var(--bigin-panel)');
    const html = renderToStaticMarkup(<Sidebar />);
    expect(html).toContain('--sidebar-alt:var(--bigin-accent)');
    expect(html).toContain('--foreground:var(--bigin-panel-text)');
    expect(html).not.toMatch(/#(?:093e5[23]|0b4a63|245247|173a52)\b/i);
  });
});


describe('KM3.2.26 — tokeny panelu nawigacji', () => {
  it('źródła shellu i sidebaru nie zawierają emerald ani ring-white', () => {
    for (const path of ['./app-shell.tsx', './sidebar.tsx']) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8');
      expect(source).not.toMatch(/emerald|ring-white/);
    }
  });
  it.each([false, true])('panel używa tokenów Bigin także po zwinięciu: %s', (collapsed) => {
    const html = renderToStaticMarkup(<Sidebar collapsed={collapsed} />);
    const aside = html.match(/<aside[\s\S]*?<\/aside>/)![0];
    expect(aside).toContain('background:var(--bigin-panel)');
    expect(aside).toContain('bg-[var(--bigin-accent)]');
    expect(aside).toContain('text-[var(--bigin-panel-text)]');
    expect(aside).toContain('border-[var(--bigin-border)]');
    expect(aside).not.toMatch(/(?:bg|text|border|ring)-(?:emerald|amber|slate|white|primary|card|foreground|muted)/);
  });
});

describe('KM3.5.1D: stały rail i kompaktowa rama po pomiarze LIVE', () => {
  const css = parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
  const atWidth = (selector: string, width: number) => {
    const values: Record<string, string> = {};
    css.walkRules((rule) => {
      if (!rule.selectors.includes(selector)) return;
      let parent = rule.parent;
      while (parent && parent.type !== 'root') {
        if (parent.type === 'atrule' && parent.name === 'media') {
          const max = /max-width:\s*(\d+)px/.exec(parent.params);
          const min = /min-width:\s*(\d+)(px|rem)/.exec(parent.params);
          if (max && width > Number(max[1])) return;
          if (min && width < Number(min[1]) * (min[2] === 'rem' ? 16 : 1)) return;
        }
        parent = parent.parent;
      }
      rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
    });
    return values;
  };

  it.each(['/pipelines', '/contacts', '/agents', '/future-synthetic-route'].flatMap((pathname) =>
    [390, 640, 767, 768, 900, 1023, 1024, 1280, 1281, 1366, 1536].map((width) => ({ pathname, width }))
  ))('zachowuje rail w układzie flex: $pathname, $width px', async ({ pathname, width }) => {
    route.pathname = pathname;
    const html = await render();
    const shellTag = html.match(/<div data-slot="app-shell"[^>]+>/)![0];
    const aside = html.match(/<aside[^>]+>/)![0];
    const classes = aside.match(/class="([^"]+)"/)![1].split(/\s+/);
    expect(classes).toContain('relative');
    expect(classes).toContain('shrink-0');
    expect(classes).not.toContain('fixed');
    expect(classes.some((value) => /translate|will-change/.test(value))).toBe(false);
    expect(shellTag).toContain('overflow-hidden');
    expect(html).not.toContain('aria-label="openMenu"');
    expect(html).not.toContain('aria-label="closeMenu"');

    // Apply the actual global declarations below the inline html defaults.
    const variables = { ...SHELL_CSS_VARS, ...atWidth("[data-slot='app-shell']", width) } as Record<string, string>;
    const resolve = (name: string): string => {
      const reference = /^var\((--[^)]+)\)$/.exec(variables[name]);
      return reference ? resolve(reference[1]) : variables[name];
    };
    expect(resolve('--app-topbar-height')).toBe(width <= 1280 ? '43px' : '48px');
    expect(resolve('--app-header-height')).toBe(width <= 1280 ? '43px' : '48px');
    expect(resolve('--app-sidebar-width')).toBe(width <= 1280 ? '63px' : '64px');
    expect(resolve('--app-sidebar-width-collapsed')).toBe(resolve('--app-sidebar-width'));
    expect(atWidth('[data-bigin-compact-shell] > aside', width)).toMatchObject({
      position: 'relative', inset: 'auto', width: 'var(--app-sidebar-width)',
      'flex-basis': 'var(--app-sidebar-width)', 'flex-shrink': '0',
      transform: 'none', translate: 'none',
    });
    expect(atWidth("[data-slot='app-shell']", width)).toMatchObject({ width: '100%', 'min-width': '0' });
    // Both the content wrapper and main can shrink alongside the visible rail.
    expect(html).toContain('flex min-w-0 flex-1 flex-col overflow-hidden');
    const main = html.match(/<main id="main-content"[^>]+>/)![0];
    expect(main).toContain('min-w-0');
    expect(main).toContain('overflow-x-hidden');
    if (pathname === '/pipelines') {
      expect(atWidth('[data-pipeline-workspace]', width)).toMatchObject({ 'min-width': '0', overflow: 'hidden' });
      expect(atWidth('[data-pipeline-content]', width)).toMatchObject({ 'min-width': '0', overflow: 'hidden' });
      expect(atWidth('[data-bigin-pipeline-shell] .pipeline-scroll', width)).toMatchObject({
        'min-width': '0', 'overflow-x': 'auto', 'overscroll-behavior-x': 'contain',
      });
    }
  });

  it.each([390, 640, 768, 900, 1024, 1280, 1281, 1536])('zwija etykiety, zachowuje menu i ogranicza panel filtrów do viewportu: %i px', (width) => {
    const compact = width <= 1280;
    const actions = atWidth('[data-header-account-actions]', width);
    expect(actions.display).toBe(compact ? 'flex' : undefined);
    expect(atWidth('[data-header-account-name]', width).display).toBe(compact ? 'none' : undefined);
    expect(atWidth('[data-pipeline-wide-filters]', width).display).toBe(compact ? 'none' : undefined);
    expect(atWidth('[data-pipeline-compact-filters]', width).display).toBe(compact ? 'grid' : 'none');
    expect(atWidth('[data-pipeline-toolbar]', width)['overflow-x']).toBeUndefined();
    if (compact) {
      expect(atWidth('[data-pipeline-filter-menu][open] [data-pipeline-filter-popover]', width)).toMatchObject({
        position: 'fixed', right: '8px',
        width: 'min(280px, calc(100vw - var(--app-sidebar-width) - 16px))',
        'overflow-y': 'auto',
      });
    }
  });
});
