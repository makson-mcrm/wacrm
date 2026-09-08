import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  buildBankingKnowledgeAnswer,
  parseAllowedDriveFolderIds,
  type DealKnowledgeRow,
  type KnowledgeDocumentMetadata,
} from '@/lib/banking-knowledge/foundation';

const RELEASE = 'm4-knowledge-v3-drive';

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const dealId = new URL(request.url).searchParams.get('deal_id');
    if (!dealId) {
      return NextResponse.json(
        { error: 'Brak identyfikatora Deala.' },
        { status: 400 }
      );
    }

    const [dealResult, processesResult, documentsResult] = await Promise.all([
      supabase
        .from('deals')
        .select(
          'id,title,product_type,next_action,mandatory_bank,preferred_bank,contact:contacts!deals_contact_id_fkey(name),company:companies!deals_company_id_fkey(name),stage:pipeline_stages(name)'
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
        .eq('account_id', accountId),
    ]);

    if (dealResult.error || !dealResult.data) {
      return NextResponse.json(
        { error: 'Nie znaleziono Deala.' },
        { status: 404 }
      );
    }
    if (processesResult.error || documentsResult.error) {
      throw processesResult.error || documentsResult.error;
    }

    const answer = buildBankingKnowledgeAnswer({
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
      documents: (documentsResult.data ?? []) as KnowledgeDocumentMetadata[],
      allowedDriveFolderIds: parseAllowedDriveFolderIds(
        process.env.BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS
      ),
    });

    return NextResponse.json(answer, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-mCRM-Knowledge-Version': RELEASE,
      },
    });
  } catch (error) {
    const response = toErrorResponse(error);
    response.headers.set('X-mCRM-Knowledge-Version', RELEASE);
    return response;
  }
}

