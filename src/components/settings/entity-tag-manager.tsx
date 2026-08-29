'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type EntityType = 'contact' | 'company' | 'deal';
type EntityTag = { id: string; name: string; color: string };

export function EntityTagManager({
  entityType,
  title,
}: {
  entityType: EntityType;
  title: string;
}) {
  const db = useMemo(() => createClient(), []);
  const { accountId, user } = useAuth();
  const [tags, setTags] = useState<EntityTag[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#245247');

  const load = useCallback(async () => {
    if (!accountId) return;
    const { data } = await db
      .from('entity_tags')
      .select('id,name,color')
      .eq('account_id', accountId)
      .eq('entity_type', entityType)
      .order('name');
    setTags((data ?? []) as EntityTag[]);
  }, [accountId, db, entityType]);

  useEffect(() => void load(), [load]);

  async function createTag() {
    if (!accountId || !user || !name.trim()) return;
    const { error } = await db.from('entity_tags').insert({
      account_id: accountId,
      user_id: user.id,
      entity_type: entityType,
      name: name.trim(),
      color,
    });
    if (error) return toast.error('Nie udało się utworzyć tagu.');
    setName('');
    await load();
  }

  async function removeTag(id: string) {
    const { error } = await db.from('entity_tags').delete().eq('id', id);
    if (error) return toast.error('Nie udało się usunąć tagu.');
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{ color: tag.color, borderColor: `${tag.color}66` }}
            >
              <span className="size-2 rounded-full" style={{ background: tag.color }} />
              {tag.name}
              <button type="button" aria-label={`Usuń ${tag.name}`} onClick={() => void removeTag(tag.id)}>
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
          {!tags.length && <p className="text-muted-foreground text-sm">Brak tagów.</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nazwa tagu" />
          <Input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="w-14 shrink-0 p-1"
            aria-label="Kolor tagu"
          />
          <Button type="button" onClick={() => void createTag()} disabled={!name.trim()}>
            <Plus className="size-4" /> Dodaj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
