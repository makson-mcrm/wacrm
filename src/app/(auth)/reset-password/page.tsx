'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, KeyRound, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace('/forgot-password');
        return;
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków.`);
      return;
    }
    if (password !== confirmation) {
      setError('Hasła nie są takie same.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError('Nie udało się ustawić nowego hasła. Otwórz ponownie link z wiadomości.');
      return;
    }
    setSuccess(true);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-primary" aria-label="Sprawdzanie linku" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <CheckCircle className="size-10 text-primary" />
            <CardTitle>Hasło zostało ustawione</CardTitle>
            <CardDescription>Możesz teraz przejść do mCRM AI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.replace('/dashboard')}>
              Otwórz mCRM AI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <KeyRound className="size-10 text-primary" />
          <CardTitle>Ustaw nowe hasło</CardTitle>
          <CardDescription>Hasło powinno mieć co najmniej 8 znaków.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Powtórz hasło</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </div>
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? <><Loader2 className="size-4 animate-spin" />Zapisywanie…</> : 'Ustaw hasło'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
