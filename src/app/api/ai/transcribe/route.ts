import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  // Fail before parsing the request body. Until a verified local STT adapter
  // exists, every recording is sensitive and no classification can make a
  // browser or cloud transcription path safe.
  return NextResponse.json(
    {
      code: 'LOCAL_AI_UNAVAILABLE',
      error:
        'Dyktowanie jest zablokowane do czasu uruchomienia zweryfikowanego lokalnego modelu.',
    },
    { status: 503 }
  );
}
