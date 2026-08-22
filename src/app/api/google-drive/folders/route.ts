import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const body = (await request.json().catch(() => null)) as {
      deal_id?: string;
    } | null;
    if (!body?.deal_id)
      return NextResponse.json(
        { error: 'Brak identyfikatora Deala.' },
        { status: 400 }
      );
    const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN?.trim();
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
    if (!accessToken || !rootFolderId)
      return NextResponse.json(
        {
          error:
            'Połączenie Dysku Google nie jest skonfigurowane. Ustaw GOOGLE_DRIVE_ACCESS_TOKEN i GOOGLE_DRIVE_ROOT_FOLDER_ID.',
        },
        { status: 503 }
      );
    const { data: deal, error } = await supabase
      .from('deals')
      .select('id,title,drive_folder_url')
      .eq('account_id', accountId)
      .eq('id', body.deal_id)
      .single();
    if (error || !deal)
      return NextResponse.json(
        { error: 'Nie znaleziono Deala.' },
        { status: 404 }
      );
    if (deal.drive_folder_url)
      return NextResponse.json({ url: deal.drive_folder_url, existing: true });

    const create = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deal.title,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      }
    );
    const folder = (await create.json().catch(() => ({}))) as {
      id?: string;
      webViewLink?: string;
      error?: { message?: string };
    };
    if (!create.ok || !folder.id)
      return NextResponse.json(
        { error: folder.error?.message || 'Nie udało się utworzyć folderu.' },
        { status: 502 }
      );
    const url =
      folder.webViewLink ||
      `https://drive.google.com/drive/folders/${folder.id}`;
    const { error: updateError } = await supabase
      .from('deals')
      .update({ drive_folder_url: url })
      .eq('id', deal.id);
    if (updateError) throw updateError;
    return NextResponse.json({ url, existing: false });
  } catch (error) {
    return toErrorResponse(error);
  }
}
