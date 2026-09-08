import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildBiginActiveCasesDryRun,
  type BiginActiveCaseInput,
  type BiginDryRunReport,
  type BiginStageMapping,
  type ExistingBiginSnapshot,
} from './active-cases';

export async function loadBiginMigrationSnapshot(
  db: SupabaseClient,
  accountId: string
): Promise<ExistingBiginSnapshot> {
  const [contacts, companies, contactCompanies, deals, stages] =
    await Promise.all([
      db
        .from('contacts')
        .select(
          'id,phone,phone_normalized,email,name,first_name,last_name,source,source_details,created_at'
        )
        .eq('account_id', accountId),
      db
        .from('companies')
        .select('id,name,nip,nip_normalized,phone,email,notes')
        .eq('account_id', accountId),
      db
        .from('contact_companies')
        .select('contact_id,company_id')
        .eq('account_id', accountId),
      db
        .from('deals')
        .select(
          'id,title,contact_id,company_id,source,source_details,product_type,deal_type,created_at'
        )
        .eq('account_id', accountId),
      db.from('pipeline_stages').select('id,pipeline_id,name'),
    ]);

  const failed = [contacts, companies, contactCompanies, deals, stages].find(
    (result) => result.error
  );
  if (failed?.error)
    throw new Error(
      `Nie udało się przygotować dry-run: ${failed.error.message}`
    );

  return {
    contacts: (contacts.data ?? []).map((row) => ({
      id: row.id,
      phone: row.phone,
      phoneNormalized: row.phone_normalized,
      email: row.email,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      source: row.source,
      sourceDetails: row.source_details,
      createdAt: row.created_at,
    })),
    companies: (companies.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      nip: row.nip,
      nipNormalized: row.nip_normalized,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
    })),
    contactCompanies: (contactCompanies.data ?? []).map((row) => ({
      contactId: row.contact_id,
      companyId: row.company_id,
    })),
    deals: (deals.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      contactId: row.contact_id,
      companyId: row.company_id,
      source: row.source,
      sourceDetails: row.source_details,
      productType: row.product_type,
      dealType: row.deal_type,
      createdAt: row.created_at,
    })),
    stages: (stages.data ?? []).map((row) => ({
      id: row.id,
      pipelineId: row.pipeline_id,
      name: row.name,
    })),
  };
}

export async function prepareBiginActiveCasesDryRun(input: {
  db: SupabaseClient;
  accountId: string;
  cases: BiginActiveCaseInput[];
  stageMappings: BiginStageMapping[];
  now?: Date;
}): Promise<BiginDryRunReport> {
  const existing = await loadBiginMigrationSnapshot(input.db, input.accountId);
  return buildBiginActiveCasesDryRun({
    cases: input.cases,
    existing,
    stageMappings: input.stageMappings,
    now: input.now,
  });
}
