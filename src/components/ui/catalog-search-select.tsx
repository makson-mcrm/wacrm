'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { EntitySearchSelect } from '@/components/ui/entity-search-select';

type CatalogOption = { id: string; value: string };

export function CatalogSearchSelect({
  catalogType,
  value,
  onChange,
  placeholder,
  defaults = [],
}: {
  catalogType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  defaults?: string[];
}) {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [options, setOptions] = useState<CatalogOption[]>([]);

  const load = useCallback(async () => {
    if (!accountId) return;
    const { data } = await db
      .from('crm_catalog_options')
      .select('id,value')
      .eq('account_id', accountId)
      .eq('catalog_type', catalogType)
      .eq('active', true)
      .order('position')
      .order('value');
    setOptions((data ?? []) as CatalogOption[]);
  }, [accountId, catalogType, db]);

  useEffect(() => void load(), [load]);

  const visible = options.length
    ? options
    : defaults.map((item) => ({ id: item, value: item }));

  async function addOption() {
    const next = window.prompt('Nazwa nowej opcji');
    if (!next?.trim() || !accountId) return;
    const { error } = await db.from('crm_catalog_options').upsert(
      {
        account_id: accountId,
        catalog_type: catalogType,
        value: next.trim(),
        active: true,
      },
      { onConflict: 'account_id,catalog_type,value' }
    );
    if (error) return toast.error(`Nie zapisano opcji: ${error.message}`);
    onChange(next.trim());
    await load();
  }

  async function editOption() {
    const selected = options.find((item) => item.value === value);
    if (!selected) return addOption();
    const next = window.prompt('Edytuj opcję', selected.value);
    if (!next?.trim()) return;
    const { error } = await db
      .from('crm_catalog_options')
      .update({ value: next.trim(), updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) return toast.error(`Nie zapisano opcji: ${error.message}`);
    onChange(next.trim());
    await load();
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <EntitySearchSelect
          value={value}
          onChange={onChange}
          options={visible.map((item) => ({
            value: item.value,
            label: item.value,
          }))}
          placeholder={placeholder}
          onAdd={addOption}
          addLabel="Dodaj opcję"
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={editOption}
        title="Edytuj opcję"
        aria-label="Edytuj opcję"
      >
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}

