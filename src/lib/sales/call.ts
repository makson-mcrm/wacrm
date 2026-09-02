export type CallContext = {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
};

export function buildTelHref(phone: string) {
  return `tel:${phone.trim()}`;
}

export function buildAfterCallUrl(context: CallContext) {
  const params = new URLSearchParams({ afterCall: '1' });
  if (context.contactId) params.set('contact', context.contactId);
  if (context.companyId) params.set('company', context.companyId);
  if (context.dealId) params.set('deal', context.dealId);
  return `/quick-call?${params.toString()}`;
}

