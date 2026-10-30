import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { canEditSettings, isAccountRole } from '@/lib/auth/roles';
import { decrypt, encrypt } from '@/lib/whatsapp/encryption';
import { subscribeWabaToApp, verifyPhoneNumber } from '@/lib/whatsapp/meta-api';

export const maxDuration = 90;
const GRAPH = 'https://graph.facebook.com/v23.0';

function failure(step: string, message: string, status: number) {
  return NextResponse.json({ error: message, message, step }, { status });
}

export async function POST(request: Request) {
  let step = 'auth';
  try {
    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user)
      return failure(step, 'Zaloguj się, aby połączyć WhatsApp.', 401);
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('account_id, account_role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (
      profileError ||
      !profile?.account_id ||
      !isAccountRole(profile.account_role) ||
      !canEditSettings(profile.account_role)
    ) {
      return failure(
        step,
        'Połączenie WhatsApp wymaga uprawnień administratora konta.',
        403
      );
    }
    step = 'validation';
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.code !== 'string' ||
      !body.code.trim() ||
      body.code.length > 4096 ||
      typeof body.phoneNumberId !== 'string' ||
      !/^\d{1,32}$/.test(body.phoneNumberId) ||
      typeof body.wabaId !== 'string' ||
      !/^\d{1,32}$/.test(body.wabaId)
    ) {
      return failure(
        step,
        'Podaj kod autoryzacji oraz poprawne identyfikatory numeru i WABA (tylko cyfry).',
        400
      );
    }
    const { phoneNumberId, wabaId } = body;
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret)
      return failure(step, 'Brak konfiguracji Meta na serwerze.', 503);

    // Service role is used only after the explicit account/role check above.
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    step = 'ownership';
    const { data: claimed, error: claimedError } = await admin
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle();
    if (claimedError)
      return failure(step, 'Nie udało się sprawdzić właściciela numeru.', 500);
    if (claimed && claimed.account_id !== profile.account_id) {
      return failure(step, 'Ten numer jest już połączony z innym kontem.', 409);
    }
    const { data: existing, error: existingError } = await admin
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', profile.account_id)
      .maybeSingle();
    if (existingError)
      return failure(step, 'Nie udało się odczytać konfiguracji.', 500);
    if (
      existing &&
      (existing.phone_number_id !== phoneNumberId ||
        existing.waba_id !== wabaId)
    ) {
      return failure(
        step,
        'Konto ma już inny numer lub WABA. Najpierw sprawdź obecną konfigurację.',
        409
      );
    }
    if (
      existing?.onboarding_mode === 'coexistence' &&
      (existing.coexistence_status === 'sync_error' ||
        existing.coexistence_status?.endsWith('_pending'))
    ) {
      return failure(
        'sync',
        'Poprzednia synchronizacja wymaga weryfikacji. Nie wysłano jej ponownie.',
        409
      );
    }

    // OAuth codes are single-use. A completed/restarted request reuses the
    // encrypted token already saved for this exact account + number + WABA.
    let accessToken: string;
    if (existing?.onboarding_mode === 'coexistence') {
      accessToken = decrypt(existing.access_token);
    } else {
      step = 'exchange_code';
      const params = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code: body.code.trim(),
      });
      const response = await fetch(`${GRAPH}/oauth/access_token?${params}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        return failure(
          step,
          'Meta odrzuciła kod autoryzacji. Rozpocznij połączenie ponownie.',
          502
        );
      const token = await response.json();
      if (typeof token.access_token !== 'string' || !token.access_token) {
        return failure(step, 'Meta nie zwróciła tokenu dostępu.', 502);
      }
      accessToken = token.access_token;
    }
    step = 'phone_info';
    const phoneInfo = await verifyPhoneNumber({
      phoneNumberId,
      accessToken,
      apiVersion: 'v23.0',
    });
    if (!phoneInfo.display_phone_number)
      return failure(step, 'Meta nie zwróciła numeru telefonu.', 502);
    if (
      existing?.coexistence_status === 'connected' &&
      existing.contacts_sync_requested_at &&
      existing.history_sync_requested_at
    ) {
      return NextResponse.json({
        success: true,
        onboarding_mode: 'coexistence',
        phone_info: phoneInfo,
      });
    }
    step = 'subscribe';
    await subscribeWabaToApp({ wabaId, accessToken, apiVersion: 'v23.0' });
    step = 'save';
    const now = new Date().toISOString();
    const savedConfig = {
      account_id: profile.account_id,
      user_id: existing?.user_id ?? user.id,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      access_token: encrypt(accessToken),
      verify_token:
        existing?.verify_token || encrypt(randomBytes(32).toString('hex')),
      onboarding_mode: 'coexistence',
      // Preserve sync markers on conflict: they belong to the number, not
      // to the current request. Never /register or /deregister this number.
      ...(existing
        ? {}
        : { coexistence_status: 'onboarding', status: 'disconnected' }),
      subscribed_apps_at: now,
      updated_at: now,
    };
    const write = existing
      ? admin
          .from('whatsapp_config')
          .update(savedConfig)
          .eq('account_id', profile.account_id)
          .eq('phone_number_id', phoneNumberId)
      : admin
          .from('whatsapp_config')
          .upsert(savedConfig, {
            onConflict: 'account_id',
            ignoreDuplicates: true,
          });
    const { data: savedRows, error: saveError } = await write.select('id');
    if (saveError)
      return failure(
        step,
        'Nie udało się zapisać konfiguracji WhatsApp.',
        saveError.code === '23505' ? 409 : 500
      );

    if (!savedRows?.length)
      return failure(
        step,
        'Konfiguracja zmieniła się w innym żądaniu. Odśwież stan.',
        409
      );

    for (const syncType of ['smb_app_state_sync', 'history'] as const) {
      const column =
        syncType === 'history'
          ? 'history_sync_requested_at'
          : 'contacts_sync_requested_at';
      if (existing?.[column]) continue;
      step = syncType;
      // Atomic claim survives concurrent requests and process restarts.
      // A timeout is ambiguous: keep the marker and require review rather
      // than risk repeating Meta's one-shot sync request.
      const { data: reserved, error: reserveError } = await admin.rpc(
        'claim_whatsapp_coexistence_sync',
        {
          p_account_id: profile.account_id,
          p_phone_number_id: phoneNumberId,
          p_sync_type: syncType,
        }
      );
      if (reserveError)
        return failure(
          step,
          'Nie udało się zabezpieczyć żądania synchronizacji.',
          500
        );
      if (!reserved)
        return failure(
          step,
          'Synchronizacja została już zlecona przez inne żądanie. Odśwież stan.',
          409
        );
      try {
        const response = await fetch(`${GRAPH}/${phoneNumberId}/smb_app_data`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            sync_type: syncType,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.error || result?.success === false)
          throw new Error('sync_failed');
      } catch {
        await admin
          .from('whatsapp_config')
          .update({ coexistence_status: 'sync_error' })
          .eq('account_id', profile.account_id)
          .eq('phone_number_id', phoneNumberId);
        return failure(
          step,
          'Meta nie potwierdziła synchronizacji. Żądanie zapisano; wymaga weryfikacji przed ponowieniem.',
          502
        );
      }
      const { error } = await admin
        .from('whatsapp_config')
        .update({ coexistence_status: `${syncType}_requested` })
        .eq('account_id', profile.account_id)
        .eq('phone_number_id', phoneNumberId);
      if (error)
        return failure(
          step,
          'Żądanie wysłano, ale nie udało się zapisać potwierdzenia. Wymagana weryfikacja.',
          500
        );
    }
    step = 'save';
    const { error } = await admin
      .from('whatsapp_config')
      .update({
        coexistence_status: 'connected',
        status: 'connected',
        connected_at: existing?.connected_at || now,
        updated_at: now,
      })
      .eq('account_id', profile.account_id)
      .eq('phone_number_id', phoneNumberId);
    if (error)
      return failure(step, 'Nie udało się zapisać statusu połączenia.', 500);
    return NextResponse.json({
      success: true,
      onboarding_mode: 'coexistence',
      phone_info: phoneInfo,
    });
  } catch {
    // Never forward Graph errors, URLs (OAuth secrets), tokens or DB rows.
    const messages: Record<string, string> = {
      exchange_code: 'Nie udało się wymienić kodu autoryzacji w Meta.',
      phone_info: 'Nie udało się odczytać numeru telefonu w Meta.',
      subscribe: 'Nie udało się zasubskrybować aplikacji do konta WABA w Meta.',
    };
    return failure(
      step,
      messages[step] ||
        'Nie udało się połączyć WhatsApp. Spróbuj ponownie po sprawdzeniu konfiguracji.',
      messages[step] ? 502 : 500
    );
  }
}
