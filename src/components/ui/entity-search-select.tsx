'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface EntitySearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  onAdd?: () => void;
  addLabel?: string;
}

export function EntitySearchSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel = 'Brak wyników',
  allowEmpty = true,
  onAdd,
  addLabel = 'Dodaj nowy rekord',
}: EntitySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pl');
    if (!normalized) return options.slice(0, 50);
    return options
      .filter((option) =>
        `${option.label} ${option.keywords ?? ''}`
          .toLocaleLowerCase('pl')
          .includes(normalized)
      )
      .slice(0, 50);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="bg-muted min-w-0 flex-1 justify-between px-3 font-normal"
            />
          }
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        {onAdd && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={addLabel}
            aria-label={addLabel}
            onClick={onAdd}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
      <PopoverContent
        align="start"
        className="w-[min(420px,calc(100vw-2rem))] p-2"
      >
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Wpisz imię, nazwę, telefon lub nazwę…"
            className="pl-8"
          />
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {allowEmpty && (
            <button
              type="button"
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
              onClick={() => {
                onChange('');
                setOpen(false);
                setQuery('');
              }}
            >
              <Check
                className={cn('size-4', value ? 'opacity-0' : 'opacity-100')}
              />
              Bez powiązania
            </button>
          )}
          {visible.map((option) => (
            <button
              key={option.value}
              type="button"
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                setQuery('');
              }}
            >
              <Check
                className={cn(
                  'size-4 shrink-0',
                  option.value === value ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
          {!visible.length && (
            <p className="text-muted-foreground px-3 py-5 text-center text-sm">
              {emptyLabel}
            </p>
          )}
        </div>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full justify-start"
            onClick={() => {
              setOpen(false);
              onAdd();
            }}
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
