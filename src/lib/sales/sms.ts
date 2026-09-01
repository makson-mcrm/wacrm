export const SMS_TEMPLATE_PREFIX = 'SMS — ';

export function buildSmsHref(phone: string, body: string): string {
  const normalizedPhone = phone.trim().replace(/[^+\d]/g, '');
  return `sms:${normalizedPhone}?body=${encodeURIComponent(body)}`;
}

export function personalizeSms(body: string, contactName?: string | null): string {
  const firstName = contactName?.trim().split(/\s+/)[0] || 'Kliencie';
  return body.replaceAll('[IMIĘ_KLIENTA]', firstName);
}

