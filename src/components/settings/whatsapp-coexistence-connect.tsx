'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FacebookSDK {
  init(options: {
    appId: string;
    version: string;
    xfbml: boolean;
    cookie: boolean;
  }): void;
  login(
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: {
      config_id: string;
      response_type: 'code';
      override_default_response_type: true;
      extras: {
        feature: string;
        featureType: string;
        sessionInfoVersion: string;
        setup: Record<string, never>;
      };
    }
  ): void;
}

type SignupEvent =
  | {
      event: 'FINISH' | 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
      mode: 'coexistence';
      phoneNumberId: string;
      wabaId: string;
    }
  | {
      event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
      mode: 'resolve_phone_number';
      phoneNumberId?: never;
      wabaId: string;
    }
  | { event: 'CANCEL'; step: string };

// Exact origins only: a suffix match would also trust attackerfacebook.com.
export function parseEmbeddedSignupEvent(
  origin: string,
  raw: unknown
): SignupEvent | null {
  if (
    ![
      'https://www.facebook.com',
      'https://web.facebook.com',
      'https://facebook.com',
    ].includes(origin)
  )
    return null;
  try {
    const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!message || message.type !== 'WA_EMBEDDED_SIGNUP') return null;
    if (message.event === 'CANCEL')
      return {
        event: 'CANCEL',
        step:
          typeof message.data?.current_step === 'string'
            ? message.data.current_step
            : '',
      };
    if (
      message.event !== 'FINISH' &&
      message.event !== 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
    )
      return null;
    const { phone_number_id: phoneNumberId, waba_id: wabaId } =
      message.data ?? {};
    if (typeof wabaId !== 'string' || !/^\d+$/.test(wabaId))
      return null;
    if (
      phoneNumberId === undefined &&
      message.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
    ) {
      return { event: message.event, mode: 'resolve_phone_number', wabaId };
    }
    if (typeof phoneNumberId !== 'string' || !/^\d+$/.test(phoneNumberId))
      return null;
    return { event: message.event, mode: 'coexistence', phoneNumberId, wabaId };
  } catch {
    return null;
  }
}

export interface CoexistenceConnection {
  onboarding_mode?: string;
  coexistence_status?: string | null;
  phone_number_id?: string;
}

interface Props {
  config: CoexistenceConnection | null;
  phoneInfo?: { display_phone_number: string; verified_name?: string } | null;
  canEdit: boolean;
  connectionError?: string;
  onConnected: () => Promise<void>;
}
interface SignupSession {
  code?: string;
  phoneNumberId?: string;
  wabaId?: string;
  posting?: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

export function WhatsAppCoexistenceConnect({
  config,
  phoneInfo,
  canEdit,
  connectionError,
  onConnected,
}: Props) {
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const configId = process.env.NEXT_PUBLIC_FB_ES_CONFIG_ID;
  const configured = Boolean(appId && configId);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const session = useRef<SignupSession | null>(null);
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  function finishSession() {
    if (session.current?.timer) clearTimeout(session.current.timer);
    session.current = null;
    setBusy(false);
  }

  async function submitIfComplete(active: SignupSession) {
    if (
      session.current !== active ||
      active.posting ||
      !active.code ||
      !active.wabaId
    )
      return;
    active.posting = true;
    if (active.timer) clearTimeout(active.timer);
    try {
      const response = await fetch('/api/whatsapp/coexistence/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: active.code,
          phoneNumberId: active.phoneNumberId,
          wabaId: active.wabaId,
        }),
        signal: AbortSignal.timeout(90000),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        // Server messages are local, Polish and sanitized; never show SDK/OAuth data.
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'Nie udało się połączyć WhatsApp.'
        );
      }
      if (session.current !== active) return;
      setNotice(
        'Połączono WhatsApp Business w trybie coexistence. Zlecono synchronizację kontaktów i historii.'
      );
      await onConnectedRef.current();
    } catch (cause) {
      if (session.current === active)
        setError(
          cause instanceof Error && cause.name === 'Error'
            ? cause.message
            : 'Nie udało się zakończyć połączenia. Odśwież stan i sprawdź konfigurację.'
        );
    } finally {
      if (session.current === active) finishSession();
    }
  }
  // Ref keeps the listener stable; either SDK code or FINISH may arrive first.
  const submitRef = useRef(submitIfComplete);
  useEffect(() => {
    submitRef.current = submitIfComplete;
  });
  useEffect(() => {
    if (!configured || !canEdit) return;
    function receive(event: MessageEvent) {
      const active = session.current;
      if (!active || active.posting) return;
      const parsed = parseEmbeddedSignupEvent(event.origin, event.data);
      if (!parsed) return;
      if (parsed.event === 'CANCEL') {
        finishSession();
        // current_step is retained as structured session information, not
        // rendered verbatim (Meta step names are not Polish UI copy).
        setNotice(
          'Anulowano łączenie WhatsApp Business. Możesz rozpocząć ponownie.'
        );
        return;
      }
      active.phoneNumberId = parsed.phoneNumberId;
      active.wabaId = parsed.wabaId;
      void submitRef.current(active);
    }
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      if (session.current?.timer) clearTimeout(session.current.timer);
      session.current = null;
    };
  }, [configured, canEdit]);

  function sdk(): FacebookSDK | undefined {
    return (window as Window & { FB?: FacebookSDK }).FB;
  }
  function connect() {
    const fb = sdk();
    if (!configured || !canEdit || !ready || !fb || session.current) return;
    setError('');
    setNotice('');
    setBusy(true);
    const active: SignupSession = {};
    session.current = active;
    active.timer = setTimeout(() => {
      if (session.current !== active) return;
      finishSession();
      setError('Upłynął czas na połączenie. Rozpocznij ponownie.');
    }, 120000);
    try {
      fb.login(
        (response) => {
          if (session.current !== active) return;
          if (!response.authResponse?.code) {
            finishSession();
            setError(
              'Meta nie udzieliła autoryzacji. Rozpocznij połączenie ponownie.'
            );
            return;
          }
          active.code = response.authResponse.code;
          void submitRef.current(active);
        },
        {
          config_id: configId!,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            feature: 'whatsapp_embed_signup',
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
            setup: {},
          },
        }
      );
    } catch {
      finishSession();
      setError(
        'Nie udało się otworzyć okna Meta. Sprawdź, czy przeglądarka zezwala na wyskakujące okna.'
      );
    }
  }
  const coexistence = config?.onboarding_mode === 'coexistence';
  const connected =
    coexistence &&
    config.coexistence_status === 'connected' &&
    !connectionError;
  const syncError =
    coexistence &&
    (config.coexistence_status === 'sync_error' ||
      config.coexistence_status?.endsWith('_pending'));
  return (
    <Card>
      {configured && canEdit && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onReady={() => {
            try {
              const fb = sdk();
              if (!fb) throw new Error();
              fb.init({
                appId: appId!,
                version: 'v23.0',
                xfbml: false,
                cookie: false,
              });
              setReady(true);
            } catch {
              setError(
                'Nie udało się uruchomić połączenia z Meta. Odśwież stronę.'
              );
            }
          }}
          onError={() =>
            setError(
              'Nie udało się załadować skryptu Meta. Sprawdź połączenie i odśwież stronę.'
            )
          }
        />
      )}
      <CardHeader>
        <CardTitle>Połącz istniejącą aplikację WhatsApp Business</CardTitle>
        <CardDescription>
          Zachowaj swój numer i aplikację na telefonie. Połącz je z mCRM w
          trybie coexistence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p role="status" className="text-sm">
          {connected
            ? `Połączony · ${phoneInfo?.display_phone_number || config.phone_number_id} · ${phoneInfo?.verified_name || 'WhatsApp Business'} · tryb coexistence`
            : coexistence
              ? 'Niepołączony — onboarding wymaga dokończenia lub weryfikacji.'
              : 'Niepołączony w trybie coexistence.'}
        </p>
        {!configured && (
          <p className="text-muted-foreground text-sm">
            Brak konfiguracji Meta — uzupełnij NEXT_PUBLIC_FB_APP_ID i
            NEXT_PUBLIC_FB_ES_CONFIG_ID.
          </p>
        )}
        {!canEdit && (
          <p className="text-muted-foreground text-sm">
            Połączenie wymaga uprawnień administratora konta.
          </p>
        )}
        {(error || (coexistence && connectionError) || syncError) && (
          <p role="alert" className="text-destructive text-sm">
            {error ||
              (coexistence && connectionError) ||
              'Synchronizacja wymaga weryfikacji. Nie będzie automatycznie ponawiana.'}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
        <Button
          onClick={connect}
          disabled={!configured || !canEdit || !ready || busy}
        >
          {busy
            ? 'Łączenie z Meta…'
            : 'Połącz istniejącą aplikację WhatsApp Business'}
        </Button>
      </CardContent>
    </Card>
  );
}
