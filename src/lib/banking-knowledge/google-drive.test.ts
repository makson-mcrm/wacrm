import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetDriveTokenForTests,
  assertDriveSyncInput,
  buildDriveKnowledgePlan,
  classifyDriveFile,
  driveKnowledgeStatus,
  isClientShareableDriveSource,
  listAllowlistedDriveFiles,
  loadDriveKnowledgeConfig,
  parseApprovedDriveRoots,
} from './google-drive';

const config = loadDriveKnowledgeConfig({
  NODE_ENV: 'test',
  BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS:
    '1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g,1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN',
  BANKING_KNOWLEDGE_DRIVE_ROOTS_JSON: JSON.stringify([
    {
      folderId: '1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g',
    },
    { folderId: '1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN' },
  ]),
  BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_EMAIL:
    'reader@example.iam.gserviceaccount.com',
  BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
    'not-used-in-pure-tests',
} as unknown as NodeJS.ProcessEnv);

describe('banking knowledge Google Drive Zero Trust', () => {
  beforeEach(() => __resetDriveTokenForTests());
  it('allows client sharing only for forms from the approved bank root', () => {
    expect(
      isClientShareableDriveSource({
        sourceName: 'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/approved-file',
        documentType:
          'google_drive_internal:mortgage:documents+application:form',
      })
    ).toBe(true);
    expect(
      isClientShareableDriveSource({
        sourceName: 'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/internal-file',
        documentType:
          'google_drive_internal:mortgage:documents+application:instruction',
      })
    ).toBe(false);
    expect(
      isClientShareableDriveSource({
        sourceName:
          'gdrive://1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN/settlement-file',
        documentType: 'google_drive_internal:settlements:commission:form',
      })
    ).toBe(false);
  });

  it('reports disabled until both allowlist and dedicated credentials exist', () => {
    const status = driveKnowledgeStatus(
      loadDriveKnowledgeConfig({} as NodeJS.ProcessEnv)
    );
    expect(status.configured).toBe(false);
    expect(status.allowedFolderCount).toBe(2);
    expect(status.approvedRootCount).toBe(2);
    expect(status.scope).toContain('drive.readonly');
  });

  it('rejects every folder outside the explicit allowlist', () => {
    expect(() =>
      assertDriveSyncInput({
        folderId: 'folder_other_12345',
        config,
      })
    ).toThrow('FOLDER_NOT_ALLOWLISTED');
  });

  it('odrzuca korzeń bez drugiej zgody w allowliście', () => {
    expect(() =>
      parseApprovedDriveRoots(
        JSON.stringify([
          {
            folderId: 'folder_other_12345',
          },
        ]),
        new Set(['folder_mbank_12345'])
      )
    ).toThrow('INVALID_ROOT_CONFIG');
  });

  it('pusty dozwolony folder jest prawidłowym planem bez alarmu', () => {
    expect(buildDriveKnowledgePlan(config.approvedRoots[0], [])).toEqual({
      candidates: [],
      clientFiles: [],
      skipped: {
        folder: 0,
        unsupportedType: 0,
        tooLarge: 0,
        publiclyShared: 0,
        outsideFolder: 0,
        outOfScope: 0,
      },
      truncated: false,
    });
  });

  it('does not call Google before an allowlist check succeeds', async () => {
    const fetcher = vi.fn();
    await expect(
      listAllowlistedDriveFiles({
        root: { ...config.approvedRoots[0], folderId: 'folder_other_12345' },
        config,
        fetcher: fetcher as unknown as typeof fetch,
      })
    ).rejects.toThrow('FOLDER_NOT_ALLOWLISTED');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts only private supported direct children and exposes no private URL', () => {
    const plan = buildDriveKnowledgePlan(config.approvedRoots[0], [
      {
        id: 'private_doc_12345',
        name: 'Procedura mBank',
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: '2026-09-08T08:00:00.000Z',
        version: '7',
        size: null,
        parents: ['folder_mbank_12345'],
        publiclyShared: false,
        path: ['mBank', '1_HIPO_OF_ML', 'A_INSTRUKCJE_I_WYTYCZNE'],
      },
      {
        id: 'public_doc_12345',
        name: 'Publiczny dokument',
        mimeType: 'text/plain',
        modifiedTime: null,
        version: null,
        size: 100,
        parents: ['folder_mbank_12345'],
        publiclyShared: true,
        path: ['mBank', '1_HIPO_OF_ML'],
      },
      {
        id: 'nested_doc_12345',
        name: 'Poza folderem',
        mimeType: 'text/plain',
        modifiedTime: null,
        version: null,
        size: 100,
        parents: [],
        publiclyShared: false,
        path: ['mBank', '1_HIPO_OF_ML'],
      },
    ]);
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0].sourceName).toBe(
      'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/private_doc_12345'
    );
    expect(plan.candidates[0]).not.toHaveProperty('publicUrl');
    expect(plan.skipped.publiclyShared).toBe(1);
    expect(plan.skipped.outsideFolder).toBe(1);
  });

  it('routes only mBank products and settlement agreements under approved roots', () => {
    expect(
      classifyDriveFile(
        config.approvedRoots[0],
        ['mBank', '1_HIPO_OF_ML', 'B_WZORY_WNIOSKOW'],
        'wniosek.txt'
      )?.productRoute
    ).toBe('mortgage');
    expect(
      classifyDriveFile(config.approvedRoots[0], ['ING'], 'procedura.txt')
    ).toBeNull();
    expect(
      classifyDriveFile(
        config.approvedRoots[1],
        [],
        'Umowa rozliczeniowa mFinanse.txt'
      )?.domains
    ).toContain('commission');
  });

  it('fails closed for client sharing outside B_WZORY_WNIOSKOW forms', () => {
    expect(
      isClientShareableDriveSource({
        sourceName: 'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/client-form-id',
        documentType: 'google_drive_internal:mortgage:documents:form',
      })
    ).toBe(true);
    expect(
      isClientShareableDriveSource({
        sourceName: 'gdrive://1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g/internal-id',
        documentType: 'google_drive_internal:mortgage:documents:instruction',
      })
    ).toBe(false);
    expect(
      isClientShareableDriveSource({
        sourceName: 'gdrive://1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN/commission-id',
        documentType: 'google_drive_internal:settlements:commission:form',
      })
    ).toBe(false);
  });

  it('keeps a private PDF from B_WZORY_WNIOSKOW available only for client sharing', () => {
    const plan = buildDriveKnowledgePlan(config.approvedRoots[0], [
      {
        id: 'client_pdf_12345',
        name: 'Zaświadczenie do umowy zlecenia.pdf',
        mimeType: 'application/pdf',
        modifiedTime: '2026-09-10T08:00:00.000Z',
        version: '9',
        size: 250_000,
        parents: ['folder_wzory_12345'],
        publiclyShared: false,
        path: ['mBank', '1_HIPO_OF_ML', 'B_WZORY_WNIOSKOW'],
      },
    ]);
    expect(plan.candidates).toHaveLength(0);
    expect(plan.clientFiles).toHaveLength(1);
    expect(plan.clientFiles[0].sourceType).toBe('form');
  });
});
