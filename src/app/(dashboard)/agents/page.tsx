'use client';

import { useEffect, useState } from 'react';
import { Bot, Sparkles, Settings2, BarChart3, Landmark } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiPlayground } from '@/components/agents/ai-playground';
import { AiUsageCard } from '@/components/agents/ai-usage';
import { AiConfig } from '@/components/settings/ai-config';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';

type Tab = 'playground' | 'setup' | 'usage';

export default function AgentsPage() {
  const { accountRole } = useAuth();
  const canViewUsage = accountRole ? canEditSettings(accountRole) : false;
  const [tab, setTab] = useState<Tab>('playground');
  const [decided, setDecided] = useState(false);

  // Land first-time users on Setup, returning users on the Playground.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/config');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setTab(data?.configured ? 'playground' : 'setup');
      } catch {
        if (!cancelled) setTab('setup');
      } finally {
        if (!cancelled) setDecided(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Bot className="text-primary h-6 w-6" />
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Agenci AI
        </h1>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        Tutaj podłączysz agenta sprzedaży, sprawdzisz jego odpowiedzi i ustawisz
        zakres danych, które może analizować.
      </p>

      <div className="border-primary/20 bg-primary/5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Landmark className="text-primary mt-0.5 size-5" />
          <div>
            <p className="font-semibold">Wiedza Bankowa · mBank</p>
            <p className="text-muted-foreground text-sm">
              Otwórz aktywny Deal, aby zapytać o następny krok w jego
              kontekście.
            </p>
          </div>
        </div>
        <Button variant="outline" render={<Link href="/pipelines" />}>
          Wybierz Deal
        </Button>
      </div>

      {decided && (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="playground">
              <Sparkles className="mr-1.5 h-4 w-4" /> Sprawdzenie agenta
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Settings2 className="mr-1.5 h-4 w-4" /> Ustawienia
            </TabsTrigger>
            {canViewUsage && (
              <TabsTrigger value="usage">
                <BarChart3 className="mr-1.5 h-4 w-4" /> Wykorzystanie
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="playground" className="mt-4">
            <AiPlayground onGoToSetup={() => setTab('setup')} />
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <AiConfig />
          </TabsContent>

          {canViewUsage && (
            <TabsContent value="usage" className="mt-4">
              <AiUsageCard />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
