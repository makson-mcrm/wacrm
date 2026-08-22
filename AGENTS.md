<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## mCRM 4.0 — binding project decisions

- Current architecture: this WaCRM fork (Next.js), Supabase and Hostinger.
- Do not design or revive AppSheet, Vertex/Vetrix, Google Sheets as the CRM database, or n8n.
- Website intake creates or finds a Contact/Lead only. It must never create a Deal automatically.
- Tomasz approves business direction. The coding agent owns implementation, configuration, testing and deployment.
- Ask Tomasz to act only for genuinely non-delegable identity, 2FA, CAPTCHA, payment, legal consent or missing access.
