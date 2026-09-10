'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, MessageSquare, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildSmsHref,
  personalizeSms,
  SMS_TEMPLATE_PREFIX,
} from '@/lib/sales/sms';
import { createClient } from '@/lib/supabase/client';

type SmsTemplate = { id: string; title: string; content_text: string | null };
type AttachmentSource = '' | 'crm' | 'phone' | 'bank';
type CrmDocument = { id: string; name: string; storage_path: string };
type BankDocument = {
  id: string;
  title: string;
  bank: string | null;
  product: string | null;
  source_version: string | null;
  effective_date: string | null;
  status: string;
};
const CUSTOM_SMS_ID = 'custom';

interface SmsActionProps {
  phone?: string | null;
  contactName?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  productCategory?: string | null;
  customerSource?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

export function SmsAction({
  phone,
  contactName,
  contactId,
  companyId,
  dealId,
  productCategory,
  customerSource,
  variant = 'outline',
  size = 'sm',
  label = 'SMS',
}: SmsActionProps) {
  const db = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [body, setBody] = useState('');
  const [opening, setOpening] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachmentSource, setAttachmentSource] =
    useState<AttachmentSource>('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [crmDocuments, setCrmDocuments] = useState<CrmDocument[]>([]);
  const [bankDocuments, setBankDocuments] = useState<BankDocument[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId]
  );
  const attachmentReady =
    !attachmentSource ||
    (attachmentSource === 'phone'
      ? Boolean(localFile)
      : Boolean(selectedAttachmentId));

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quick-replies', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      const rows = ((payload.quick_replies ?? []) as SmsTemplate[]).filter(
        (item) =>
          item.title.startsWith(SMS_TEMPLATE_PREFIX) && item.content_text
      );
      setTemplates(rows);
      if (rows[0]) {
        setSelectedId(rows[0].id);
        setBody(personalizeSms(rows[0].content_text ?? '', contactName));
      } else {
        setSelectedId(CUSTOM_SMS_ID);
        setBody('');
      }
    } finally {
      setLoading(false);
    }
  }, [contactName]);

  useEffect(() => {
    if (open) void loadTemplates();
  }, [open, loadTemplates]);

  function chooseTemplate(id: string) {
    setSelectedId(id);
    if (id === CUSTOM_SMS_ID) {
      setBody('');
      return;
    }
    const template = templates.find((item) => item.id === id);
    setBody(personalizeSms(template?.content_text ?? '', contactName));
  }

  async function chooseAttachmentSource(source: AttachmentSource) {
    setAttachmentSource(source);
    setSelectedAttachmentId('');
    if (source === 'phone') return;
    setAttachmentLoading(true);
    try {
      if (source === 'crm') {
        if (!dealId) {
          setCrmDocuments([]);
          return;
        }
        const result = await db
          .from('deal_documents')
          .select('id,name,storage_path')
          .eq('deal_id', dealId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (result.error) throw result.error;
        setCrmDocuments((result.data ?? []) as CrmDocument[]);
      }
      if (source === 'bank') {
        if (!dealId) {
          setBankDocuments([]);
          return;
        }
        const response = await fetch(
          `/api/ai/banking-knowledge/client-documents?deal_id=${encodeURIComponent(dealId)}&q=${encodeURIComponent(body)}`,
          { cache: 'no-store' }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || 'Nie odczytano wzorów.');
        setBankDocuments((payload.documents ?? []) as BankDocument[]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nie odczytano załączników.'
      );
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function selectedFile() {
    if (attachmentSource === 'phone') return localFile;
    if (attachmentSource === 'crm') {
      const document = crmDocuments.find(
        (item) => item.id === selectedAttachmentId
      );
      if (!document) return null;
      const signed = await db.storage
        .from('deal-documents')
        .createSignedUrl(document.storage_path, 60);
      if (!signed.data?.signedUrl)
        throw new Error('Nie pobrano dokumentu z Deala.');
      const response = await fetch(signed.data.signedUrl, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Nie pobrano dokumentu z Deala.');
      const blob = await response.blob();
      return new File([blob], document.name, {
        type: blob.type || 'application/octet-stream',
      });
    }
    if (attachmentSource === 'bank') {
      const document = bankDocuments.find(
        (item) => item.id === selectedAttachmentId
      );
      if (!document) return null;
      const response = await fetch(
        `/api/ai/banking-knowledge/client-documents?download=${encodeURIComponent(document.id)}`,
        { cache: 'no-store' }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Nie pobrano dozwolonego wzoru.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      return new File(
        [blob],
        encodedName ? decodeURIComponent(encodedName) : document.title,
        { type: blob.type || 'application/octet-stream' }
      );
    }
    return null;
  }

  async function openMessages(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!body.trim() || !attachmentReady || opening) return;
    setOpening(true);
    try {
      const file = attachmentSource ? await selectedFile() : null;
      if (attachmentSource && !file) throw new Error('Wybierz załącznik.');
      if (
        file &&
        (!navigator.share || !navigator.canShare?.({ files: [file] }))
      ) {
        throw new Error(
          'Ta przeglądarka nie pozwala przekazać pliku do systemowego arkusza Udostępnij.'
        );
      }
      const response = await fetch('/api/sales-activities/prepared-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          companyId,
          dealId,
          productCategory,
          customerSource,
          phone,
          note: body,
          templateId: selected?.id ?? null,
          templateTitle: selected?.title ?? 'WŁASNA TREŚĆ',
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Nie zapisano aktywności PRZYGOTOWANO_SMS.'
        );
      }
      if (file) {
        await navigator.share({
          files: [file],
          text: body,
          title: `Wiadomość do ${contactName || 'klienta'}`,
        });
        toast.success(
          'Otwarto systemowy arkusz Udostępnij. Wysłanie potwierdź w wybranym kanale.'
        );
        setOpen(false);
        return;
      }
      window.location.href = href;
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Nie zapisano aktywności PRZYGOTOWANO_SMS.'
      );
    } finally {
      setOpening(false);
    }
  }

  if (!phone) return null;
  const href = buildSmsHref(phone, body);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Przygotuj SMS</DialogTitle>
          </DialogHeader>
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Szablon</Label>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={selectedId}
                  onChange={(event) => chooseTemplate(event.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title.slice(SMS_TEMPLATE_PREFIX.length)}
                    </option>
                  ))}
                  <option value={CUSTOM_SMS_ID}>WŁASNA TREŚĆ</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  Treść — możesz poprawić przed otwarciem Wiadomości
                </Label>
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-40"
                />
              </div>
              <div className="rounded-xl border p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setAttachmentOpen((value) => !value)}
                >
                  <Paperclip className="size-4" /> DODAJ ZAŁĄCZNIK
                </Button>
                {attachmentOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          attachmentSource === 'crm' ? 'default' : 'outline'
                        }
                        onClick={() => void chooseAttachmentSource('crm')}
                      >
                        Z DEALA / KLIENTA
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          attachmentSource === 'phone' ? 'default' : 'outline'
                        }
                        onClick={() => void chooseAttachmentSource('phone')}
                      >
                        Z TELEFONU
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          attachmentSource === 'bank' ? 'default' : 'outline'
                        }
                        onClick={() => void chooseAttachmentSource('bank')}
                      >
                        WZÓR / DRUK Z BANKU
                      </Button>
                    </div>
                    {attachmentLoading && (
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    )}
                    {attachmentSource === 'phone' && (
                      <input
                        type="file"
                        accept="application/pdf,.doc,.docx,image/*"
                        onChange={(event) =>
                          setLocalFile(event.target.files?.[0] || null)
                        }
                        className="block w-full text-sm"
                      />
                    )}
                    {attachmentSource === 'crm' && !attachmentLoading && (
                      <AttachmentSelect
                        value={selectedAttachmentId}
                        onChange={setSelectedAttachmentId}
                        options={crmDocuments.map((document) => ({
                          id: document.id,
                          label: document.name,
                          note: 'Dokument z tego Deala',
                        }))}
                        empty="Brak dokumentów zapisanych przy tym Dealu."
                      />
                    )}
                    {attachmentSource === 'bank' && !attachmentLoading && (
                      <>
                        <AttachmentSelect
                          value={selectedAttachmentId}
                          onChange={setSelectedAttachmentId}
                          options={bankDocuments.map((document) => ({
                            id: document.id,
                            label: document.title,
                            note: `${document.bank || ''} · ${document.product || ''} · ${document.effective_date || document.source_version || 'wersja bez daty'} · ${document.status}`,
                          }))}
                          empty="Brak jednoznacznie dozwolonego wzoru. Nie wysyłaj automatycznie — wymaga weryfikacji."
                        />
                        <p className="text-xs text-slate-500">
                          Pokazywane są wyłącznie materiały B_WZORY_WNIOSKOW.
                          Instrukcje, prowizje i materiały wewnętrzne są
                          odrzucone.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                CRM nie wysyła SMS-a. Otworzy aplikację Wiadomości; wysyłkę
                potwierdzasz samodzielnie na iPhonie.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>
            <a
              href={body.trim() ? href : undefined}
              aria-disabled={!body.trim() || !attachmentReady}
              className={cn(
                buttonVariants(),
                (!body.trim() || !attachmentReady) &&
                  'pointer-events-none opacity-50'
              )}
              onClick={openMessages}
            >
              {opening
                ? 'Przygotowuję…'
                : attachmentSource
                  ? 'UDOSTĘPNIJ PLIK I WIADOMOŚĆ'
                  : 'Otwórz Wiadomości'}
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AttachmentSelect({
  value,
  onChange,
  options,
  empty,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string; note: string }>;
  empty: string;
}) {
  if (!options.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`flex w-full gap-2 rounded-xl border p-3 text-left ${
            value === option.id ? 'border-emerald-700 bg-emerald-50' : ''
          }`}
        >
          <FileText className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="block text-sm font-bold">{option.label}</span>
            <span className="block text-xs text-slate-500">{option.note}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
