'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type EntityType = 'contact' | 'company' | 'deal';
type EntityTag = { id: string; name: string; color: string };

export function EntityTagsEditor({ accountId, entityType, entityId }: { accountId: string; entityType: EntityType; entityId: string }) {
  const db = useMemo(() => createClient(), []);
  const [available, setAvailable] = useState<EntityTag[]>([]);
  const [linked, setLinked] = useState<EntityTag[]>([]);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const [tags, links] = await Promise.all([
      db.from('entity_tags').select('id,name,color').eq('account_id', accountId).eq('entity_type', entityType).order('name'),
      db.from('entity_tag_links').select('tag_id, tag:entity_tags(id,name,color)').eq('entity_type', entityType).eq('entity_id', entityId),
    ]);
    setAvailable((tags.data ?? []) as EntityTag[]);
    setLinked((links.data ?? []).map((row) => row.tag as unknown as EntityTag).filter(Boolean));
  }, [accountId, db, entityId, entityType]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function addTag() {
    if (!name.trim()) return;
    const { data: auth } = await db.auth.getSession();
    if (!auth.session?.user) return;
    let tag = available.find((item) => item.name.toLocaleLowerCase('pl') === name.trim().toLocaleLowerCase('pl'));
    if (!tag) {
      const result = await db.from('entity_tags').insert({ account_id: accountId, user_id: auth.session.user.id, entity_type: entityType, name: name.trim() }).select('id,name,color').single();
      if (result.error) { toast.error('Nie udało się dodać tagu.'); return; }
      tag = result.data as EntityTag;
    }
    const { error } = await db.from('entity_tag_links').upsert({ account_id: accountId, tag_id: tag.id, entity_type: entityType, entity_id: entityId }, { onConflict: 'tag_id,entity_type,entity_id' });
    if (error) toast.error('Nie udało się przypisać tagu.');
    else { setName(''); await load(); }
  }

  async function removeTag(tagId: string) {
    await db.from('entity_tag_links').delete().eq('tag_id', tagId).eq('entity_type', entityType).eq('entity_id', entityId);
    await load();
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">{linked.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{tag.name}<button type="button" onClick={() => removeTag(tag.id)} aria-label="Usuń tag"><X className="h-3 w-3" /></button></span>)}{linked.length === 0 && <span className="text-xs text-muted-foreground">Brak tagów dla tej karty.</span>}</div>
    <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} list={`tags-${entityType}`} placeholder="Dodaj tag" /><datalist id={`tags-${entityType}`}>{available.map((tag) => <option key={tag.id} value={tag.name} />)}</datalist><Button type="button" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button></div>
  </div>;
}
