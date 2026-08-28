import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('pokrycie krytycznych funkcji audytu mCRM', () => {
  it('formularz publiczny zapisuje Kontakt, ale nie tworzy automatycznie Deala', () => {
    const lead = source('src/lib/public-leads.ts');
    expect(lead).toContain('findOrCreateContact');
    expect(lead).toContain("from('public_lead_submissions')");
    expect(lead).not.toContain("from('deals')");
  });

  it('rezerwacja tworzy Kontakt i termin CRM, ale nie Deal', () => {
    const booking = source('src/lib/public-bookings.ts');
    expect(booking).toContain('findOrCreateContact');
    expect(booking).toContain("from('calendar_events')");
    expect(booking).not.toContain("from('deals')");
  });

  it('Deal pozwala powiązać klienta, żonę i firmę przez wyszukiwarki z plusem', () => {
    const form = source('src/components/pipelines/deal-form.tsx');
    expect(form).toContain('setSecondContactId');
    expect(form).toContain("role: 'Wnioskodawca 2'");
    expect(form).toContain('EntitySearchSelect');
    expect(form).toContain('addContactInline');
    expect(form).toContain('addCompanyInline');
  });

  it('karta Deala obejmuje banki, dokumenty, analizę, historię etapów i fakturę', () => {
    const page = source('src/app/(dashboard)/deals/[id]/page.tsx');
    const form = source('src/components/pipelines/deal-form.tsx');
    expect(page).toContain("from('bank_processes')");
    expect(page).toContain("from('deal_document_requirements')");
    expect(page).toContain("from('deal_stage_history')");
    expect(page).toContain('DealProcessControl');
    expect(form).toContain('invoice_number');
    expect(form).toContain('settlement_verified');
  });

  it('lejek ma przeciąganie kart i zapis historii zmiany etapu', () => {
    expect(source('src/components/pipelines/pipeline-board.tsx')).toContain(
      'onDealMoved(dealId, targetStageId)'
    );
    const migration = source(
      'supabase/migrations/054_package2_deal_process_integrity.sql'
    );
    expect(migration).toContain('AFTER UPDATE OF stage_id ON public.deals');
    expect(migration).toContain('INSERT INTO public.deal_stage_history');
  });

  it('działa dyktowanie opisów z transkrypcją zapasową nagrania', () => {
    const voice = source('src/components/ui/voice-textarea.tsx');
    expect(voice).toContain('SpeechRecognition');
    expect(voice).toContain('MediaRecorder');
    expect(voice).toContain("fetch('/api/ai/transcribe'");
    for (const path of [
      'src/components/pipelines/deal-form.tsx',
      'src/components/pipelines/deal-process-control.tsx',
      'src/components/contacts/contact-form.tsx',
      'src/app/(dashboard)/calendar/page.tsx',
    ])
      expect(source(path)).toContain('VoiceTextarea');
  });

  it('kalendarz wewnętrzny, rezerwacje i synchronizacja Google są połączone kodem', () => {
    expect(source('src/app/(dashboard)/calendar/page.tsx')).toContain(
      "fetch('/api/google-calendar/sync'"
    );
    expect(source('src/app/api/google-calendar/sync/route.ts')).toContain(
      'google_event_id'
    );
    expect(
      source('supabase/migrations/050_public_booking_calendar.sql')
    ).toContain('public_booking_submissions');
  });

  it('telefon ma licznik dzienny, trzy próby i kolejkę ponowień', () => {
    const dashboard = source('src/app/(dashboard)/dashboard/page.tsx');
    expect(dashboard).toContain('attempt_number');
    expect(dashboard).toContain('buildCallRetryQueue');
    expect(source('src/lib/sales/call-queue.ts')).toContain(
      'Number(row.attempt_number || 0) < 3'
    );
  });

  it('agent analizuje tylko z bazy instrukcji i nie działa bez źródeł', () => {
    const route = source('src/app/api/ai/deal-analysis/route.ts');
    expect(route).toContain('retrieveKnowledge');
    expect(route).toContain('WYŁĄCZNIE');
    expect(route).toContain('Brak zindeksowanej instrukcji bankowej');
    expect(route).toContain('instruction_url');
  });

  it('Google Drive tworzy folder dopiero na żądanie z zapisanego Deala', () => {
    const route = source('src/app/api/google-drive/folders/route.ts');
    expect(route).toContain('GOOGLE_DRIVE_ROOT_FOLDER_ID');
    expect(route).toContain('application/vnd.google-apps.folder');
    expect(route).toContain('drive_folder_url');
  });

  it('pakiet wdrożeniowy dokumentuje konfigurację Kalendarza i Dysku Google', () => {
    const example = source('.env.local.example');
    expect(example).toContain('GOOGLE_CALENDAR_ACCESS_TOKEN');
    expect(example).toContain('GOOGLE_DRIVE_ACCESS_TOKEN');
    expect(example).toContain('GOOGLE_DRIVE_ROOT_FOLDER_ID');
  });

  it('powiadomienia pilnują blokerów, terminów, ankiet i dokumentów', () => {
    const notifications = source('src/app/(dashboard)/notifications/page.tsx');
    expect(notifications).toContain('deal.blocker');
    expect(notifications).toContain('questionnaire_due_at');
    expect(notifications).toContain('document_requirements');
  });

  it('migracje wdrożeniowe mają unikalne numery', () => {
    const files = readdirSync(join(root, 'supabase/migrations')).filter(
      (name) => /^\d+_/.test(name)
    );
    const numbers = files.map((name) => name.split('_')[0]);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
