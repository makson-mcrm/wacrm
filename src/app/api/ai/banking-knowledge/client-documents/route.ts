import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  downloadClientShareableDriveFile,
  listAllowlistedDriveFiles,
  loadDriveKnowledgeConfig,
} from '@/lib/banking-knowledge/google-drive';

export const runtime = 'nodejs';
const HEADERS = { 'Cache-Control': 'private, no-store' };

function normalized(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL');
}

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const url = new URL(request.url);
    const downloadId = url.searchParams.get('download');
    if (downloadId) {
      const file = await downloadClientShareableDriveFile({
        sourceName: downloadId,
        config: loadDriveKnowledgeConfig(),
      });
      return new Response(file.bytes, {
        headers: {
          ...HEADERS,
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        },
      });
    }

    const dealId = url.searchParams.get('deal_id');
    if (!dealId) {
      return NextResponse.json(
        { error: 'Brak kontekstu Deala.' },
        { status: 400, headers: HEADERS }
      );
    }
    const dealResult = await supabase
      .from('deals')
      .select('id,title,product_type,mandatory_bank,preferred_bank')
      .eq('account_id', accountId)
      .eq('id', dealId)
      .single();
    if (dealResult.error || !dealResult.data) {
      return NextResponse.json(
        { error: 'Nie znaleziono Deala.' },
        { status: 404, headers: HEADERS }
      );
    }
    const config = loadDriveKnowledgeConfig();
    const roots = config.approvedRoots.filter(
      (root) => root.kind === 'bank_catalog'
    );
    const plans = await Promise.all(
      roots.map((root) => listAllowlistedDriveFiles({ root, config }))
    );
    const query = normalized(url.searchParams.get('q'));
    const bank = normalized(
      dealResult.data.mandatory_bank || dealResult.data.preferred_bank
    );
    const product = normalized(dealResult.data.product_type);
    const candidates = plans
      .flatMap((plan) => plan.clientFiles)
      .map((document) => {
        const haystack = normalized(
          `${document.name} ${document.bank} ${document.product} ${document.path.join(' ')}`
        );
        let score = 0;
        if (bank && haystack.includes(bank)) score += 5;
        if (
          product &&
          product
            .split(/\s+/)
            .filter((token) => token.length > 2)
            .some((token) => haystack.includes(token))
        )
          score += 3;
        if (
          query &&
          query
            .split(/\s+/)
            .filter((token) => token.length > 2)
            .some((token) => haystack.includes(token))
        )
          score += 2;
        return { ...document, score };
      })
      .filter((document) => document.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((document) => ({
        id: document.sourceName,
        title: document.name,
        bank: document.bank,
        product: document.product,
        source_version: document.sourceVersion,
        effective_date: document.effectiveDate,
        client_shareable: true,
        status: 'DOZWOLONY DLA KLIENTA',
      }));
    return NextResponse.json(
      {
        deal: dealResult.data,
        documents: candidates,
        fail_closed: candidates.length === 0,
      },
      { headers: HEADERS }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
