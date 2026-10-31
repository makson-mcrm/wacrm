import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadOrSeedPipelines } from './pipeline-bootstrap';

const stages = [
  ...readFileSync('src/app/(dashboard)/pipelines/page.tsx', 'utf8').matchAll(
    /name: '([^']+)', color: '([^']+)', position: (\d+)/g
  ),
].map((match) => ({
  name: match[1],
  color: match[2],
  position: Number(match[3]),
}));
function fixture(
  options: {
    readError?: number;
    stageError?: boolean;
    session?: boolean;
    sessionError?: boolean;
  } = {}
) {
  const pipelines: Record<string, unknown>[] = [];
  const savedStages: Record<string, unknown>[] = [];
  let reads = 0;
  const db = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session:
            options.session === false
              ? null
              : { user: { id: 'user-synthetic' } },
        },
        error: options.sessionError ? new Error('session failed') : null,
      })),
    },
    from: vi.fn((table: string) => {
      let operation = 'select';
      let payload: Record<string, unknown> | Record<string, unknown>[] = {};
      const filters: [string, unknown][] = [];
      const execute = () => {
        if (operation === 'select') {
          reads++;
          return {
            data: reads === options.readError ? null : [...pipelines],
            error:
              reads === options.readError ? new Error('read failed') : null,
          };
        }
        if (operation === 'delete') {
          for (let i = pipelines.length - 1; i >= 0; i--)
            if (filters.every(([key, value]) => pipelines[i][key] === value))
              pipelines.splice(i, 1);
          return { data: null, error: null };
        }
        if (table === 'pipeline_stages') {
          if (options.stageError)
            return { data: null, error: new Error('stages failed') };
          savedStages.push(...(payload as Record<string, unknown>[]));
          return { data: null, error: null };
        }
        const row = { ...payload, id: 'pipeline-synthetic' };
        pipelines.push(row);
        return { data: row, error: null };
      };
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.push([key, value]);
          return query;
        },
        order: async () => execute(),
        insert: (value: typeof payload) => {
          operation = 'insert';
          payload = value;
          return query;
        },
        delete: () => {
          operation = 'delete';
          return query;
        },
        single: async () => execute(),
        then: (resolve: (value: ReturnType<typeof execute>) => unknown) =>
          Promise.resolve(execute()).then(resolve),
      };
      return query;
    }),
  };
  return { db, pipelines, savedStages, reads: () => reads };
}
const load = (
  f: ReturnType<typeof fixture>,
  accountId: string | null = 'account-synthetic'
) => loadOrSeedPipelines(f.db as never, accountId, stages);

describe('K3/01-B: pierwszy lejek', () => {
  it('pusty sukces tworzy lejek z istniejącymi etapami i odczytuje go ponownie', async () => {
    const f = fixture();
    const result = await load(f);
    expect(f.pipelines).toHaveLength(1);
    expect(result[0].id).toBe('pipeline-synthetic');
    expect(f.pipelines[0]).toMatchObject({
      account_id: 'account-synthetic',
      name: 'mFinanse',
    });
    expect(stages).toHaveLength(7);
    expect(f.savedStages).toEqual(
      stages.map((stage) => ({ ...stage, pipeline_id: 'pipeline-synthetic' }))
    );
    expect(f.reads()).toBe(2);
  });
  it('błąd odczytu nie tworzy niczego i jest zwracany', async () => {
    const f = fixture({ readError: 1 });
    await expect(load(f)).rejects.toThrow('read failed');
    expect(f.pipelines).toEqual([]);
    expect(f.savedStages).toEqual([]);
  });
  it('równoległe efekty StrictMode współdzielą jedną operację', async () => {
    const f = fixture();
    const first = load(f),
      replay = load(f);
    expect(first).toBe(replay);
    await Promise.all([first, replay]);
    expect(f.pipelines).toHaveLength(1);
    expect(f.savedStages).toHaveLength(7);
    await load(f);
    expect(f.pipelines).toHaveLength(1);
  });
  it.each([{ session: false }, { sessionError: true }])(
    'bez poprawnej sesji nie zapisuje %#',
    async (options) => {
      const f = fixture(options);
      await expect(load(f)).rejects.toThrow();
      expect(f.db.from).not.toHaveBeenCalled();
    }
  );
  it('bez konta nie odczytuje ani nie zapisuje', async () => {
    const f = fixture();
    await expect(load(f, null)).rejects.toThrow('konta');
    expect(f.db.from).not.toHaveBeenCalled();
  });
  it('zwraca błąd ponownego odczytu', async () => {
    const f = fixture({ readError: 2 });
    await expect(load(f)).rejects.toThrow('read failed');
    expect(f.pipelines).toHaveLength(1);
  });
  it('zwraca błąd etapów i wycofuje własny pusty lejek', async () => {
    const f = fixture({ stageError: true });
    await expect(load(f)).rejects.toThrow('stages failed');
    expect(f.pipelines).toHaveLength(0);
  });
});
