import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { loadAiConfig } from '@/lib/ai/config';
import { generateReply } from '@/lib/ai/generate';
import { retrieveKnowledge } from '@/lib/ai/knowledge';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const body = (await request.json().catch(() => null)) as {
      deal_id?: string;
    } | null;
    if (!body?.deal_id)
      return NextResponse.json(
        { error: 'Brak identyfikatora Deala.' },
        { status: 400 }
      );
    const [{ data: deal }, { data: banks }, { data: documents }] =
      await Promise.all([
        supabase
          .from('deals')
          .select(
            'id,title,description,product_type,goal,value,questionnaire_text,questionnaire_data,missing_documents,liabilities,income_type,accounting_type,company_nip'
          )
          .eq('account_id', accountId)
          .eq('id', body.deal_id)
          .single(),
        supabase
          .from('bank_processes')
          .select(
            'bank_name,product_variant,instruction_url,instruction_version,application_form_url,application_form_version'
          )
          .eq('deal_id', body.deal_id),
        supabase
          .from('deal_document_requirements')
          .select('name,status,required,notes')
          .eq('deal_id', body.deal_id),
      ]);
    if (!deal)
      return NextResponse.json(
        { error: 'Nie znaleziono Deala.' },
        { status: 404 }
      );
    const bankRows = banks ?? [];
    if (!bankRows.some((bank) => bank.instruction_url))
      return NextResponse.json(
        {
          error:
            'Najpierw dodaj przy banku link do aktualnej instrukcji produktowej.',
        },
        { status: 409 }
      );
    const config = await loadAiConfig(supabase, accountId);
    if (!config)
      return NextResponse.json(
        { error: 'Asystent AI nie jest skonfigurowany lub aktywny.' },
        { status: 400 }
      );
    const query = [
      deal.product_type,
      deal.goal,
      ...bankRows.map(
        (bank) => `${bank.bank_name || ''} ${bank.product_variant || ''}`
      ),
    ]
      .filter(Boolean)
      .join(' ');
    const knowledge = await retrieveKnowledge(
      supabase,
      accountId,
      config,
      query,
      8
    );
    if (!knowledge.length)
      return NextResponse.json(
        {
          error:
            'Brak zindeksowanej instrukcji bankowej pasującej do tej sprawy. Dodaj ją w Ustawienia → Asystent AI → Baza wiedzy.',
        },
        { status: 409 }
      );
    const caseData = JSON.stringify(
      { deal, banks: bankRows, documents },
      null,
      2
    );
    const { text } = await generateReply({
      config,
      systemPrompt: [
        'Jesteś analitykiem wsparcia eksperta kredytowego.',
        'Analizujesz sprawę WYŁĄCZNIE na podstawie danych Deala i przytoczonych fragmentów zatwierdzonej bazy wiedzy.',
        'Nie dopowiadaj parametrów banku. Brak danych oznacz jako BRAK DO UZUPEŁNIENIA.',
        'Zwróć wyłącznie poprawny JSON: {"summary":"...","recommendation":"...","missing_documents":["..."]}.',
        `FRAGMENTY INSTRUKCJI:\n${knowledge.map((item, index) => `[${index + 1}] ${item}`).join('\n\n')}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: `DANE SPRAWY:\n${caseData}` }],
    });
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    let parsed: {
      summary?: string;
      recommendation?: string;
      missing_documents?: string[];
    };
    try {
      parsed = JSON.parse(cleaned) as typeof parsed;
    } catch {
      return NextResponse.json(
        { error: 'Agent zwrócił nieprawidłowy format. Spróbuj ponownie.' },
        { status: 502 }
      );
    }
    return NextResponse.json({
      summary: parsed.summary || '',
      recommendation: parsed.recommendation || '',
      missing_documents: Array.isArray(parsed.missing_documents)
        ? parsed.missing_documents
        : [],
      sources: bankRows
        .filter((bank) => bank.instruction_url)
        .map((bank) => ({
          bank: bank.bank_name,
          url: bank.instruction_url,
          version: bank.instruction_version,
        })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
