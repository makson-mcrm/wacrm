'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { buildSmsHref, personalizeSms, SMS_TEMPLATE_PREFIX } from '@/lib/sales/sms';

type SmsTemplate = { id: string; title: string; content_text: string | null };

interface SmsActionProps {
  phone?: string | null;
  contactName?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SmsAction({ phone, contactName, contactId, companyId, dealId, variant = 'outline', size = 'sm' }: SmsActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [body, setBody] = useState('');

  const selected = useMemo(() => templates.find((item) => item.id === selectedId) ?? null, [templates, selectedId]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quick-replies', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      const rows = ((payload.quick_replies ?? []) as SmsTemplate[]).filter((item) => item.title.startsWith(SMS_TEMPLATE_PREFIX) && item.content_text);
      setTemplates(rows);
      if (rows[0]) {
        setSelectedId(rows[0].id);
        setBody(personalizeSms(rows[0].content_text ?? '', contactName));
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
    const template = templates.find((item) => item.id === id);
    setBody(personalizeSms(template?.content_text ?? '', contactName));
  }

  function recordPreparedSms() {
    void fetch('/api/sales-activities/prepared-sms', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId, companyId, dealId, templateId: selected?.id, templateTitle: selected?.title, body }),
    }).then((response) => {
      if (!response.ok) toast.error('Wiadomości zostały otwarte, ale nie zapisano aktywności PRZYGOTOWANO_SMS.');
    }).catch(() => toast.error('Wiadomości zostały otwarte, ale nie zapisano aktywności PRZYGOTOWANO_SMS.'));
  }

  if (!phone) return null;
  const href = buildSmsHref(phone, body);

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" /> SMS
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Przygotuj SMS</DialogTitle></DialogHeader>
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Szablon</Label>
                <select className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm" value={selectedId} onChange={(event) => chooseTemplate(event.target.value)}>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.title.slice(SMS_TEMPLATE_PREFIX.length)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Treść — możesz poprawić przed otwarciem Wiadomości</Label>
                <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-40" />
              </div>
              <p className="text-muted-foreground text-xs">CRM nie wysyła SMS-a. Otworzy aplikację Wiadomości; wysyłkę potwierdzasz samodzielnie na iPhonie.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <a
              href={selected && body.trim() ? href : undefined}
              aria-disabled={!selected || !body.trim()}
              className={cn(buttonVariants(), (!selected || !body.trim()) && 'pointer-events-none opacity-50')}
              onClick={recordPreparedSms}
            >Otwórz Wiadomości</a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

