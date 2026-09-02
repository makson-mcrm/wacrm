'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildAfterCallUrl, buildTelHref, type CallContext } from '@/lib/sales/call';

type CallActionProps = CallContext & {
  phone?: string | null;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function CallAction({ phone, contactId, companyId, dealId, className, variant = 'outline', size = 'sm' }: CallActionProps) {
  const router = useRouter();
  const leftPage = useRef(false);

  if (!phone) return null;

  function armResultForm() {
    const url = buildAfterCallUrl({ contactId, companyId, dealId });
    let finished = false;
    const finish = () => {
      if (finished || !leftPage.current) return;
      finished = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', finish);
      router.push(url);
    };
    const onVisibilityChange = () => {
      if (document.hidden) leftPage.current = true;
      else finish();
    };
    leftPage.current = false;
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', finish);
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', finish);
    }, 10 * 60 * 1000);
  }

  return (
    <a href={buildTelHref(phone)} onClick={armResultForm} className={cn(buttonVariants({ variant, size }), className)}>
      <Phone className="size-4" /> Zadzwoń
    </a>
  );
}

