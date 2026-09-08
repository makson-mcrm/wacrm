import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { loadEmbeddingsKey } from '@/lib/ai/config';
import { ingestDocument } from '@/lib/ai/knowledge';
import {
  assertDriveSyncInput,
  downloadDriveKnowledgeFile,
  driveKnowledgeStatus,
  listAllowlistedDriveFiles,
  loadDriveKnowledgeConfig,
} from '@/lib/banking-knowledge/google-drive';

export const runtime = 'nodejs';
const RELEASE = 'm4-knowledge-v3-drive';
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-mCRM-Knowledge-Version': RELEASE,
};

function safeError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const known: Record<string, { status: number; error: string }> = {
    INVALID_FOLDER: {
      status: 400,
      error: 'Nieprawidłowy identyfikator folderu.',
    },
    FOLDER_NOT_ALLOWLISTED: {
      status: 403,
      error: 'Folder nie jest na allowliście.',
    },
    UNSUPPORTED_BANK: {
      status: 400,
      error: 'Bank nie jest jeszcze obsługiwany.',
    },
    INVALID_PRODUCT: { status: 400, error: 'Podaj produkt dla tego folderu.' },
    DRIVE_NOT_CONFIGURED: {
      status: 409,
      error: 'Prywatne źródła Drive nie są jeszcze skonfigurowane.',
    },
    DRIVE_AUTH_FAILED: {
      status: 502,
      error: 'Nie udało się potwierdzić dostępu tylko do odczytu.',
    },
    DRIVE_LIST_FAILED: {
      status: 502,
      error: 'Nie udało się odczytać dozwolonego folderu.',
    },
  };
  const match = known[code];
  return match
    ? NextResponse.json(
        { error: match.error },
        { status: match.status, headers: PRIVATE_HEADERS }
      )
    : null;
}

export async function GET() {
  try {
    await requireRole('agent');
    return NextResponse.json(driveKnowledgeStatus(loadDriveKnowledgeConfig()), {
      headers: PRIVATE_HEADERS,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    response.headers.set('X-mCRM-Knowledge-Version', RELEASE);
    return response;
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');
    const limit = checkRateLimit(
      `banking-drive:${userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);
    const body = await request.json().catch(() => null);
    const config = loadDriveKnowledgeConfig();
    const input = assertDriveSyncInput({
      folderId: typeof body?.folder_id === 'string' ? body.folder_id : '',
      bank: typeof body?.bank === 'string' ? body.bank : '',
      product: typeof body?.product === 'string' ? body.product : '',
      config,
    });
    const dryRun = body?.dry_run !== false;
    const plan = await listAllowlistedDriveFiles({
      folderId: input.folderId,
      config,
    });
    const sourceNames = plan.candidates.map((file) => file.sourceName);
    const existing = sourceNames.length
      ? await supabase
          .from('ai_knowledge_documents')
          .select('id,source_name,source_version')
          .eq('account_id', accountId)
          .in('source_name', sourceNames)
      : { data: [], error: null };
    if (existing.error) throw existing.error;
    const bySource = new Map(
      (existing.data || []).map((row) => [row.source_name, row] as const)
    );
    const unchanged = plan.candidates.filter(
      (file) =>
        bySource.get(file.sourceName)?.source_version === file.sourceVersion
    ).length;
    const report = {
      dryRun,
      examined:
        plan.candidates.length +
        Object.values(plan.skipped).reduce((a, b) => a + b, 0),
      eligible: plan.candidates.length,
      create: plan.candidates.filter((file) => !bySource.has(file.sourceName))
        .length,
      update: plan.candidates.filter((file) => {
        const row = bySource.get(file.sourceName);
        return Boolean(row && row.source_version !== file.sourceVersion);
      }).length,
      unchanged,
      skipped: plan.skipped,
      truncated: plan.truncated,
      saved: 0,
      failed: 0,
    };
    if (dryRun) {
      return NextResponse.json(report, { headers: PRIVATE_HEADERS });
    }

    const { key: embeddingsApiKey } = await loadEmbeddingsKey(
      supabase,
      accountId
    );
    for (const file of plan.candidates) {
      const previous = bySource.get(file.sourceName);
      if (previous?.source_version === file.sourceVersion) continue;
      try {
        const content = await downloadDriveKnowledgeFile({ file, config });
        const values = {
          title: file.name,
          content,
          bank: 'mBank',
          product: input.product,
          document_type: 'google_drive_internal',
          source_name: file.sourceName,
          source_version: file.sourceVersion,
          effective_date: file.effectiveDate,
        };
        const saved = previous
          ? await supabase
              .from('ai_knowledge_documents')
              .update(values)
              .eq('account_id', accountId)
              .eq('id', previous.id)
              .select('id')
              .single()
          : await supabase
              .from('ai_knowledge_documents')
              .insert({ ...values, account_id: accountId, created_by: userId })
              .select('id')
              .single();
        if (saved.error || !saved.data)
          throw saved.error || new Error('SAVE_FAILED');
        await ingestDocument(
          supabase,
          accountId,
          { embeddingsApiKey },
          saved.data.id,
          content
        );
        report.saved += 1;
      } catch {
        // Deliberately omit file names, IDs and document content from logs and response.
        report.failed += 1;
      }
    }
    return NextResponse.json(report, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const known = safeError(error);
    if (known) return known;
    const response = toErrorResponse(error);
    response.headers.set('X-mCRM-Knowledge-Version', RELEASE);
    return response;
  }
}

