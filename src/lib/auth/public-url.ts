import { isAllowedPublicFormOrigin } from '@/lib/public-origin';

function trustedOrigin(value: string | undefined | null): string | null {
  if (!value || !isAllowedPublicFormOrigin(value)) return null;
  return new URL(value).origin;
}

// request.url / nextUrl.origin can identify the internal standalone listener.
// Headers are candidates only: never use the same-origin CORS exception here.
export function getPublicAppOrigin(headers: Headers): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (explicit) return trustedOrigin(explicit);

  const host = headers.get('x-forwarded-host');
  const proto = headers.get('x-forwarded-proto');
  if (host || proto) {
    // Reject lists, paths, credentials and incomplete proxy header pairs.
    if (!host || !proto || !/^[a-zA-Z0-9.:[\]-]+$/.test(host)) return null;
    if (proto !== 'https' && proto !== 'http') return null;
    return trustedOrigin(`${proto}://${host}`);
  }

  // Direct HTTPS deployments still require an exact allowlist match.
  const directHost = headers.get('host');
  if (!directHost || !/^[a-zA-Z0-9.:[\]-]+$/.test(directHost)) return null;
  return trustedOrigin(`https://${directHost}`);
}
