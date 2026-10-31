import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pipeline } from '@/types';

type SeedStage = { name: string; color: string; position: number };
// Share the whole read/seed/read operation across StrictMode effect replays.
const pending = new WeakMap<SupabaseClient, Map<string, Promise<Pipeline[]>>>();

export async function readPipelines(db: SupabaseClient, accountId: string) {
  const { data, error } = await db
    .from('pipelines')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at');
  if (error) throw error;
  if (!data) throw new Error('Nie otrzymano listy lejków.');
  return data as Pipeline[];
}

export function loadOrSeedPipelines(
  db: SupabaseClient,
  accountId: string | null,
  stages: readonly SeedStage[]
): Promise<Pipeline[]> {
  if (!accountId) return Promise.reject(new Error('Brak przypisanego konta.'));
  let tasks = pending.get(db);
  if (!tasks) pending.set(db, (tasks = new Map()));
  const running = tasks.get(accountId);
  if (running) return running;
  const task = (async () => {
    const {
      data: { session },
      error: sessionError,
    } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error('Brak aktywnej sesji.');
    const list = await readPipelines(db, accountId);
    if (list.length) return list;

    const { data: pipeline, error } = await db
      .from('pipelines')
      .insert({
        user_id: session.user.id,
        account_id: accountId,
        name: 'mFinanse',
      })
      .select()
      .single();
    if (error) throw error;
    if (!pipeline) throw new Error('Nie utworzono domyślnego lejka.');
    const { error: stageError } = await db
      .from('pipeline_stages')
      .insert(stages.map((stage) => ({ ...stage, pipeline_id: pipeline.id })));
    if (stageError) {
      // Only roll back the pipeline created by this operation.
      const { error: rollbackError } = await db
        .from('pipelines')
        .delete()
        .eq('id', pipeline.id)
        .eq('account_id', accountId);
      if (rollbackError)
        throw new Error('Nie zapisano etapów ani nie wycofano pustego lejka.');
      throw stageError;
    }
    const refreshed = await readPipelines(db, accountId);
    if (!refreshed.some((row) => row.id === pipeline.id))
      throw new Error('Nie odczytano utworzonego lejka.');
    return refreshed;
  })().finally(() => {
    tasks.delete(accountId);
  });
  tasks.set(accountId, task);
  return task;
}
