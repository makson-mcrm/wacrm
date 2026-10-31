import { Children, isValidElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactsPage from '@/app/(dashboard)/contacts/page';
import { ContactDetailView } from './contact-detail-view';

// Exercise the page's actual state transitions and URL callback without
// mounting its database effects or rendering unrelated list/modal components.
const harness = vi.hoisted(() => ({
  cursor: 0,
  state: [] as unknown[],
  mountEffects: [] as (() => void | (() => void))[],
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.state)) harness.state[index] = initial;
    return [
      harness.state[index],
      (value: unknown) => {
        harness.state[index] =
          typeof value === 'function' ? value(harness.state[index]) : value;
      },
    ];
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    if (deps.length === 0) harness.mountEffects.push(effect);
  },
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => {
      throw new Error('No database in navigation tests');
    },
  }),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ accountId: 'account-synthetic' }),
}));
vi.mock('@/hooks/use-can', () => ({ useCan: () => false }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function renderPage() {
  harness.cursor = 0;
  harness.mountEffects = [];
  return ContactsPage();
}

function findListOpen(node: ReactNode): ((id: string) => void) | undefined {
  if (
    !isValidElement<{ onOpen?: (id: string) => void; children?: ReactNode }>(
      node
    )
  )
    return;
  if (node.props.onOpen) return node.props.onOpen;
  for (const child of Children.toArray(node.props.children)) {
    const onOpen = findListOpen(child);
    if (onOpen) return onOpen;
  }
}

beforeEach(() => {
  harness.state = [];
  vi.stubGlobal('window', {
    location: { search: '?open=contact-synthetic' },
    history: { replaceState: vi.fn() },
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    },
    clearTimeout: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('02A-4: lista ↔ pełny widok i parametr open', () => {
  it('otwiera z ?open, zastępuje listę i czyści adres przy powrocie', () => {
    const list = renderPage();
    expect(findListOpen(list)).toBeTypeOf('function');
    expect(harness.mountEffects).toHaveLength(1);
    const cleanup = harness.mountEffects[0]();

    const detail = renderPage();
    expect(detail.type).toBe(ContactDetailView);
    expect(detail.props).toMatchObject({
      open: true,
      contactId: 'contact-synthetic',
    });
    expect(findListOpen(detail)).toBeUndefined();
    detail.props.onOpenChange(false);
    expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
      {},
      '',
      '/contacts'
    );
    expect(findListOpen(renderPage())).toBeTypeOf('function');
    if (cleanup) cleanup();
  });

  it('otwiera z listy i wraca bez zmiany adresu, jeżeli nie ma parametru open', () => {
    window.location.search = '';
    findListOpen(renderPage())!('from-list-synthetic');
    const detail = renderPage();
    expect(detail.type).toBe(ContactDetailView);
    expect(detail.props.contactId).toBe('from-list-synthetic');
    detail.props.onOpenChange(false);
    expect(window.history.replaceState).not.toHaveBeenCalled();
    expect(findListOpen(renderPage())).toBeTypeOf('function');
  });
});
