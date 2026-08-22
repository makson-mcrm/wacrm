import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { loadAiConfig } from '@/lib/ai/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const input = await request.formData();
    const audio = input.get('audio');
    if (!(audio instanceof File) || audio.size === 0)
      return NextResponse.json({ error: 'Brak nagrania.' }, { status: 400 });
    if (audio.size > 25 * 1024 * 1024)
      return NextResponse.json(
        { error: 'Nagranie jest za duże. Maksymalnie 25 MB.' },
        { status: 413 }
      );

    const config = await loadAiConfig(supabase, accountId, {
      requireActive: false,
    });
    if (!config || config.provider !== 'openai')
      return NextResponse.json(
        {
          error:
            'Do transkrypcji nagrania skonfiguruj klucz OpenAI w Ustawienia → Asystent AI.',
        },
        { status: 400 }
      );

    const body = new FormData();
    body.append('file', audio, audio.name || 'notatka.webm');
    body.append('model', 'whisper-1');
    body.append('language', 'pl');
    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body,
      }
    );
    const result = (await response.json().catch(() => ({}))) as {
      text?: string;
      error?: { message?: string };
    };
    if (!response.ok || !result.text?.trim())
      return NextResponse.json(
        { error: result.error?.message || 'Nie udało się przepisać nagrania.' },
        { status: 502 }
      );
    return NextResponse.json({ text: result.text.trim() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
