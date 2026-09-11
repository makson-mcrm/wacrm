import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const APP_WEBHOOK_URL =
  'https://mediumseagreen-pelican-353577.hostingersite.com/api/whatsapp/webhook'

function json(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function verificationHashes() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return null

  const response = await fetch(
    `${supabaseUrl}/rest/v1/whatsapp_webhook_verification?active=eq.true&select=token_sha256`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  )
  if (!response.ok) return null

  const rows = (await response.json()) as Array<{ token_sha256?: string }>
  return rows
    .map((row) => row.token_sha256)
    .filter((hash): hash is string => /^[a-f0-9]{64}$/.test(hash ?? ''))
}

Deno.serve(async (request) => {
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const challenge = url.searchParams.get('hub.challenge')
    const token = url.searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !token) {
      return json({ error: 'Missing verification parameters' }, 400)
    }

    const hashes = await verificationHashes()
    if (!hashes || !hashes.includes(await sha256(token))) {
      return json({ error: 'Verification token mismatch' }, 403)
    }

    return new Response(challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }

  if (request.method === 'POST') {
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) return json({ error: 'Missing signature' }, 403)

    const response = await fetch(APP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': request.headers.get('content-type') || 'application/json',
        'x-hub-signature-256': signature,
      },
      body: await request.arrayBuffer(),
    })

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    })
  }

  return json({ error: 'Method not allowed' }, 405)
})

