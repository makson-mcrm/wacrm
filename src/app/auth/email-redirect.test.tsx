import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from '@/app/(auth)/signup/page';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

// Invoke the real form handlers with hook/auth doubles, without a browser,
// sending an email or connecting to Supabase.
const state = vi.hoisted(() => ({
  cells: [] as unknown[], cursor: 0, invite: null as string | null,
  signUp: vi.fn(), resetPasswordForEmail: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.cells)) state.cells[index] = initial;
    return [state.cells[index], (value: unknown) => { state.cells[index] = value; }];
  },
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.invite ? { invite: state.invite } : {}),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: {
    signUp: state.signUp, resetPasswordForEmail: state.resetPasswordForEmail,
  } }),
}));

type Element = ReactElement<Record<string, unknown>>;
function findForm(tree: ReactNode): Element | undefined {
  if (Array.isArray(tree)) return tree.map(findForm).find(Boolean);
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return;
  const element = tree as Element;
  if (element.type === 'form') return element;
  return findForm(element.props.children as ReactNode);
}
async function submit(tree: ReactNode) {
  const form = findForm(tree);
  expect(form).toBeDefined();
  await (form!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}

const live = 'https://mediumseagreen-pelican-353577.hostingersite.com';
beforeEach(() => {
  state.cells = [];
  state.cursor = 0;
  state.invite = null;
  state.signUp.mockResolvedValue({ error: null });
  state.resetPasswordForEmail.mockResolvedValue({ error: null });
  vi.stubGlobal('window', { location: { origin: live } });
});
afterEach(() => vi.unstubAllGlobals());

describe('email links use the browser public address', () => {
  it.each([null, 'synthetic-token', 'synthetic/token+suffix']) (
    'sets an explicit callback for signup (invite=%s)', async (invite) => {
      state.invite = invite;
      state.cells = ['Synthetic User', 'synthetic@example.invalid', 'synthetic-password', 'synthetic-password'];
      const page = SignupPage();
      const inner = page.props.children as ReactElement;
      await submit((inner.type as () => ReactNode)());
      expect(state.signUp).toHaveBeenCalledOnce();
      const payload = state.signUp.mock.calls[0][0];
      const callback = new URL(payload.options.emailRedirectTo);
      expect(callback.origin).toBe(live);
      expect(callback.pathname).toBe('/auth/callback');
      expect(callback.searchParams.get('next')).toBe(invite ? `/join/${encodeURIComponent(invite)}` : null);
      expect(payload.options.data.full_name).toBe('Synthetic User');
    },
  );

  it('preserves the password recovery destination', async () => {
    state.cells = ['synthetic@example.invalid'];
    await submit(ForgotPasswordPage());
    expect(state.resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith(
      'synthetic@example.invalid',
      { redirectTo: `${live}/auth/callback?next=/reset-password` },
    );
  });
});
