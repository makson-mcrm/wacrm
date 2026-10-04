import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WhatsAppActionProps {
  contactId?: string | null;
  dealId?: string | null;
  phone?: string | null;
  className?: string;
}

export function WhatsAppAction({
  contactId,
  dealId,
  phone,
  className,
}: WhatsAppActionProps) {
  if (!contactId || !phone) return null;
  const query = new URLSearchParams({ contact: contactId, action: 'message' });
  if (dealId) query.set('deal', dealId);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'min-h-11 border-slate-300 bg-white text-slate-950 hover:bg-slate-100 hover:text-slate-950',
        className
      )}
      render={<Link href={`/quick-call?${query.toString()}`} />}
    >
      <MessageSquare className="size-4" /> WIADOMOŚĆ
    </Button>
  );
}
