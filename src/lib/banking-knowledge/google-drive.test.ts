import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetDriveTokenForTests,
  assertDriveSyncInput,
  buildDriveKnowledgePlan,
  driveKnowledgeStatus,
  listAllowlistedDriveFiles,
  loadDriveKnowledgeConfig,
  parseApprovedDriveRoots,
} from './google-drive';

const config = loadDriveKnowledgeConfig({
  NODE_ENV: 'test',
  BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS: 'folder_mbank_12345',
  BANKING_KNOWLEDGE_DRIVE_ROOTS_JSON: JSON.stringify([
    {
      folderId: 'folder_mbank_12345',
      bank: 'mbank',
      product: 'Kredyt hipoteczny',
      productRoute: 'mortgage',
      domains: ['documents', 'application'],
    },
  ]),
  BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_EMAIL:
    'reader@example.iam.gserviceaccount.com',
  BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
    'not-used-in-pure-tests',
} as unknown as NodeJS.ProcessEnv);

describe('banking knowledge Google Drive Zero Trust', () => {
  beforeEach(() => __resetDriveTokenForTests());

  it('reports disabled until both allowlist and dedicated credentials exist', () => {
    const status = driveKnowledgeStatus(
      loadDriveKnowledgeConfig({} as NodeJS.ProcessEnv)
    );
    expect(status.configured).toBe(false);
    expect(status.allowedFolderCount).toBe(0);
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
            bank: 'mbank',
            product: 'Kredyt firmowy',
            productRoute: 'business',
            domains: ['documents'],
          },
        ]),
        new Set(['folder_mbank_12345'])
      )
    ).toThrow('INVALID_ROOT_CONFIG');
  });

  it('pusty dozwolony folder jest prawidłowym planem bez alarmu', () => {
    expect(buildDriveKnowledgePlan('folder_mbank_12345', [])).toEqual({
      candidates: [],
      skipped: {
        folder: 0,
        unsupportedType: 0,
        tooLarge: 0,
        publiclyShared: 0,
        outsideFolder: 0,
      },
      truncated: false,
    });
  });

  it('does not call Google before an allowlist check succeeds', async () => {
    const fetcher = vi.fn();
    await expect(
      listAllowlistedDriveFiles({
        folderId: 'folder_other_12345',
        config,
        fetcher: fetcher as unknown as typeof fetch,
      })
    ).rejects.toThrow('FOLDER_NOT_ALLOWLISTED');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts only private supported direct children and exposes no private URL', () => {
    const plan = buildDriveKnowledgePlan('folder_mbank_12345', [
      {
        id: 'private_doc_12345',
        name: 'Procedura mBank',
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: '2026-09-08T08:00:00.000Z',
        version: '7',
        size: null,
        parents: ['folder_mbank_12345'],
        publiclyShared: false,
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
      },
      {
        id: 'nested_doc_12345',
        name: 'Poza folderem',
        mimeType: 'text/plain',
        modifiedTime: null,
        version: null,
        size: 100,
        parents: ['nested_folder_12345'],
        publiclyShared: false,
      },
    ]);
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0].sourceName).toBe(
      'gdrive://folder_mbank_12345/private_doc_12345'
    );
    expect(plan.candidates[0]).not.toHaveProperty('publicUrl');
    expect(plan.skipped.publiclyShared).toBe(1);
    expect(plan.skipped.outsideFolder).toBe(1);
  });
});

