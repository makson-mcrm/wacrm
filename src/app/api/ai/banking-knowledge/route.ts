import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  buildBankingKnowledgeAnswer,
  parseAllowedDriveFolderIds,
  type DealKnowledgeRow,
  type IndexedKnowledgeChunk,
  type KnowledgeDocumentMetadata,
} from '@/lib/banking-knowledge/foundation';

const RELEASE = 'm4-knowledge-v6-source-first';
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-mCRM-Knowledge-Version': RELEASE,
};

type AuthContext = Awaited<ReturnType<typeof requireRole>>;

class KnowledgeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function loadAnswer(
  supabase: AuthContext['supabase'],
  accountId: string,
  dealId: string,
  question?: string | null
) {
  const [dealResult, processesResult, documentsResult] = await Promise.all([
    supabase
      .from('deals')
      .select(
        'id,title,product_type,next_action,next_action_at,mandatory_bank,preferred_bank,contact:contacts!deals_contact_id_fkey(name),company:companies!deals_company_id_fkey(name),stage:pipeline_stages(name)'
      )
      .eq('account_id', accountId)
      .eq('id', dealId)
      .single(),
    supabase
      .from('bank_processes')
      .select('bank_name,product_variant,status,position')
      .eq('account_id', accountId)
      .eq('deal_id', dealId),
    supabase
      .from('ai_knowledge_documents')
      .select(
        'id,title,bank,product,document_type,source_name,source_version,effective_date,updated_at'
      )
      .eq('account_id', accountId)
      .like('document_type', 'google_drive_internal%'),
  ]);

  if (dealResult.error || !dealResult.data) {
    throw new KnowledgeRequestError('Nie znaleziono Deala.', 404);
  }
  if (processesResult.error || documentsResult.error) {
    throw processesResult.error || documentsResult.error;
  }

  const documents = (documentsResult.data ?? []) as KnowledgeDocumentMetadata[];
  const documentIds = documents.map((document) => document.id);
  const chunksResult = documentIds.length
    ? await supabase
        .from('ai_knowledge_chunks')
        .select('document_id,content,chunk_index')
        .eq('account_id', accountId)
        .in('document_id', documentIds)
        .order('chunk_index', { ascending: true })
        .limit(100)
    : { data: [], error: null };
  if (chunksResult.error) throw chunksResult.error;

  return buildBankingKnowledgeAnswer({
    deal: {
      ...dealResult.data,
      contact: Array.isArray(dealResult.data.contact)
        ? dealResult.data.contact[0]
        : dealResult.data.contact,
      company: Array.isArray(dealResult.data.company)
        ? dealResult.data.company[0]
        : dealResult.data.company,
      stage: Array.isArray(dealResult.data.stage)
        ? dealResult.data.stage[0]
        : dealResult.data.stage,
    } as DealKnowledgeRow,
    bankProcesses: processesResult.data ?? [],
    documents,
    indexedChunks: (chunksResult.data ?? []) as IndexedKnowledgeChunk[],
    allowedDriveFolderIds: parseAllowedDriveFolderIds(
      process.env.BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS
    ),
    question,
  });
}

function requestError(error: unknown) {
  if (error instanceof KnowledgeRequestError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: PRIVATE_HEADERS }
    );
  }
  const response = toErrorResponse(error);
  response.headers.set('X-mCRM-Knowledge-Version', RELEASE);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const dealId = new URL(request.url).searchParams.get('deal_id');
    if (!dealId) {
      throw new KnowledgeRequestError('Brak identyfikatora Deala.', 400);
    }
    const answer = await loadAnswer(supabase, accountId, dealId);
    return NextResponse.json(answer, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return requestError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const body = await request.json().catch(() => null);
    const dealId = typeof body?.deal_id === 'string' ? body.deal_id.trim() : '';
    const question =
      typeof body?.question === 'string' ? body.question.trim() : '';
    if (!dealId) {
      throw new KnowledgeRequestError('Brak identyfikatora Deala.', 400);
    }
    if (!question || question.length > 500) {
      throw new KnowledgeRequestError(
        'Pytanie musi mieć od 1 do 500 znaków.',
        400
      );
    }
    const answer = await loadAnswer(supabase, accountId, dealId, question);
    return NextResponse.json(answer, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return requestError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const body = await request.json().catch(() => null);
    const dealId = typeof body?.deal_id === 'string' ? body.deal_id.trim() : '';
    const nextAction =
      typeof body?.next_action === 'string' ? body.next_action.trim() : '';
    const expectedNextAction =
      body?.expected_next_action === null ||
      typeof body?.expected_next_action === 'string'
        ? body.expected_next_action
        : undefined;
    if (!dealId) {
      throw new KnowledgeRequestError('Brak identyfikatora Deala.', 400);
    }
    if (!nextAction || nextAction.length > 500) {
      throw new KnowledgeRequestError(
        'Następny krok musi mieć od 1 do 500 znaków.',
        400
      );
    }
    if (expectedNextAction === undefined) {
      throw new KnowledgeRequestError('Odśwież Deal przed zapisem.', 409);
    }

    let nextActionAt: string | null = null;
    if (body?.next_action_at) {
      const parsed = new Date(body.next_action_at);
      if (Number.isNaN(parsed.getTime())) {
        throw new KnowledgeRequestError('Termin ma nieprawidłowy format.', 400);
      }
      nextActionAt = parsed.toISOString();
    }

    let update = supabase
      .from('deals')
      .update({ next_action: nextAction, next_action_at: nextActionAt })
      .eq('account_id', accountId)
      .eq('id', dealId);
    update =
      expectedNextAction === null
        ? update.is('next_action', null)
        : update.eq('next_action', expectedNextAction);
    const saved = await update
      .select('id,next_action,next_action_at')
      .maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data) {
      throw new KnowledgeRequestError(
        'Deal zmienił się w międzyczasie. Odśwież widok i sprawdź next action.',
        409
      );
    }

    return NextResponse.json(saved.data, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return requestError(error);
  }
}

