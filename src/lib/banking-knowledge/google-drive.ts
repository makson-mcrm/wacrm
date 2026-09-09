import { createSign } from 'node:crypto';
import { parseAllowedDriveFolderIds, supportedBankKeys } from './foundation';
import type {
  BankingKnowledgeProblem,
  BankingKnowledgeProductRoute,
} from './source-catalog';

export const DRIVE_READONLY_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly';
export const DRIVE_SYNC_LIMIT = 50;
export const DRIVE_FILE_MAX_BYTES = 1_000_000;

const GOOGLE_DOC = 'application/vnd.google-apps.document';
const GOOGLE_SHEET = 'application/vnd.google-apps.spreadsheet';
const GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
const DOWNLOADABLE_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
]);

export type DriveKnowledgeConfig = {
  allowedFolderIds: ReadonlySet<string>;
  approvedRoots: readonly DriveKnowledgeRoot[];
  serviceAccountEmail: string | null;
  serviceAccountPrivateKey: string | null;
};

export type DriveKnowledgeRoot = {
  folderId: string;
  bank: 'mbank';
  product: string;
  productRoute: BankingKnowledgeProductRoute;
  domains: readonly BankingKnowledgeProblem[];
};

export type DriveKnowledgeFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  version: string | null;
  size: number | null;
  parents: string[];
  publiclyShared: boolean;
};

export type DriveKnowledgeCandidate = DriveKnowledgeFile & {
  sourceName: string;
  sourceVersion: string;
  effectiveDate: string | null;
};

export type DriveKnowledgePlan = {
  candidates: DriveKnowledgeCandidate[];
  skipped: {
    folder: number;
    unsupportedType: number;
    tooLarge: number;
    publiclyShared: number;
    outsideFolder: number;
  };
  truncated: boolean;
};

type GoogleFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  modifiedTime?: string;
  version?: string;
  size?: string;
  parents?: string[];
  permissions?: Array<{ type?: string }>;
};

type TokenCache = { accessToken: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n').trim();
}

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function isValidDriveId(value: string) {
  return /^[A-Za-z0-9_-]{10,}$/.test(value);
}

function isSupportedMimeType(mimeType: string) {
  return (
    mimeType === GOOGLE_DOC ||
    mimeType === GOOGLE_SHEET ||
    DOWNLOADABLE_MIME_TYPES.has(mimeType)
  );
}

const KNOWLEDGE_PROBLEMS = new Set<BankingKnowledgeProblem>([
  'documents',
  'application',
  'decision',
  'activation',
]);

export function parseApprovedDriveRoots(
  value: string | undefined,
  allowedFolderIds: ReadonlySet<string>
): DriveKnowledgeRoot[] {
  if (!value?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('INVALID_ROOT_CONFIG');
  }
  if (!Array.isArray(parsed)) throw new Error('INVALID_ROOT_CONFIG');

  const seen = new Set<string>();
  return parsed.map((item) => {
    if (!item || typeof item !== 'object')
      throw new Error('INVALID_ROOT_CONFIG');
    const candidate = item as Record<string, unknown>;
    const folderId =
      typeof candidate.folderId === 'string' ? candidate.folderId.trim() : '';
    const bank =
      typeof candidate.bank === 'string'
        ? candidate.bank.trim().toLocaleLowerCase('pl-PL')
        : '';
    const product =
      typeof candidate.product === 'string' ? candidate.product.trim() : '';
    const productRoute = candidate.productRoute;
    const domains = Array.isArray(candidate.domains)
      ? candidate.domains.filter(
          (domain): domain is BankingKnowledgeProblem =>
            typeof domain === 'string' &&
            KNOWLEDGE_PROBLEMS.has(domain as BankingKnowledgeProblem)
        )
      : [];
    if (
      !isValidDriveId(folderId) ||
      !allowedFolderIds.has(folderId) ||
      bank !== 'mbank' ||
      !product ||
      product.length > 160 ||
      (productRoute !== 'mortgage' && productRoute !== 'business') ||
      domains.length === 0 ||
      domains.length !== (candidate.domains as unknown[])?.length ||
      seen.has(folderId)
    ) {
      throw new Error('INVALID_ROOT_CONFIG');
    }
    seen.add(folderId);
    return { folderId, bank, product, productRoute, domains };
  });
}

export function loadDriveKnowledgeConfig(
  env: NodeJS.ProcessEnv = process.env
): DriveKnowledgeConfig {
  const allowedFolderIds = parseAllowedDriveFolderIds(
    env.BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS
  );
  return {
    allowedFolderIds,
    approvedRoots: parseApprovedDriveRoots(
      env.BANKING_KNOWLEDGE_DRIVE_ROOTS_JSON,
      allowedFolderIds
    ),
    serviceAccountEmail:
      env.BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || null,
    serviceAccountPrivateKey:
      env.BANKING_KNOWLEDGE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || null,
  };
}

export function driveKnowledgeStatus(config: DriveKnowledgeConfig) {
  const credentialsConfigured = Boolean(
    config.serviceAccountEmail && config.serviceAccountPrivateKey
  );
  return {
    configured: credentialsConfigured && config.approvedRoots.length > 0,
    credentialsConfigured,
    allowedFolderCount: config.allowedFolderIds.size,
    approvedRootCount: config.approvedRoots.length,
    accessModel: 'service-account-viewer' as const,
    scope: DRIVE_READONLY_SCOPE,
    fileLimitPerRun: DRIVE_SYNC_LIMIT,
    supportedBanks: supportedBankKeys,
    supportedFileTypes: [
      'Google Docs',
      'Google Sheets',
      'TXT',
      'Markdown',
      'CSV',
    ],
  };
}

export function assertDriveSyncInput(args: {
  folderId?: string | null;
  config: DriveKnowledgeConfig;
}) {
  const folderId = args.folderId?.trim() || null;
  if (folderId && !isValidDriveId(folderId)) throw new Error('INVALID_FOLDER');
  if (folderId && !args.config.allowedFolderIds.has(folderId))
    throw new Error('FOLDER_NOT_ALLOWLISTED');
  const roots = folderId
    ? args.config.approvedRoots.filter((root) => root.folderId === folderId)
    : [...args.config.approvedRoots];
  if (folderId && roots.length === 0) throw new Error('ROOT_NOT_APPROVED');
  if (roots.length === 0) return [];
  if (
    !args.config.serviceAccountEmail ||
    !args.config.serviceAccountPrivateKey
  ) {
    throw new Error('DRIVE_NOT_CONFIGURED');
  }
  return roots;
}

export function driveDocumentType(root: DriveKnowledgeRoot) {
  return `google_drive_internal:${root.productRoute}:${root.domains.join('+')}`;
}

export function buildDriveKnowledgePlan(
  folderId: string,
  files: DriveKnowledgeFile[],
  truncated = false
): DriveKnowledgePlan {
  const skipped = {
    folder: 0,
    unsupportedType: 0,
    tooLarge: 0,
    publiclyShared: 0,
    outsideFolder: 0,
  };
  const candidates: DriveKnowledgeCandidate[] = [];
  for (const file of files) {
    if (!file.parents.includes(folderId)) {
      skipped.outsideFolder += 1;
    } else if (file.mimeType === GOOGLE_FOLDER) {
      skipped.folder += 1;
    } else if (!isSupportedMimeType(file.mimeType)) {
      skipped.unsupportedType += 1;
    } else if (file.size !== null && file.size > DRIVE_FILE_MAX_BYTES) {
      skipped.tooLarge += 1;
    } else if (file.publiclyShared) {
      skipped.publiclyShared += 1;
    } else {
      const effectiveDate = file.modifiedTime?.slice(0, 10) || null;
      candidates.push({
        ...file,
        sourceName: `gdrive://${folderId}/${file.id}`,
        sourceVersion: file.version || file.modifiedTime || 'brak wersji',
        effectiveDate,
      });
    }
  }
  return { candidates, skipped, truncated };
}

async function getServiceAccountAccessToken(
  config: DriveKnowledgeConfig,
  fetcher: typeof fetch
) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }
  if (!config.serviceAccountEmail || !config.serviceAccountPrivateKey) {
    throw new Error('DRIVE_NOT_CONFIGURED');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.serviceAccountEmail,
      scope: DRIVE_READONLY_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(normalizePrivateKey(config.serviceAccountPrivateKey))
    .toString('base64url');
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !body?.access_token) throw new Error('DRIVE_AUTH_FAILED');
  tokenCache = {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(300, body.expires_in || 3600) * 1000,
  };
  return body.access_token;
}

export async function listAllowlistedDriveFiles(args: {
  folderId: string;
  config: DriveKnowledgeConfig;
  fetcher?: typeof fetch;
}) {
  if (!args.config.allowedFolderIds.has(args.folderId)) {
    throw new Error('FOLDER_NOT_ALLOWLISTED');
  }
  const fetcher = args.fetcher || fetch;
  const token = await getServiceAccountAccessToken(args.config, fetcher);
  const params = new URLSearchParams({
    q: `'${args.folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
    pageSize: String(DRIVE_SYNC_LIMIT),
    spaces: 'drive',
    fields:
      'nextPageToken,files(id,name,mimeType,modifiedTime,version,size,parents,permissions(type))',
  });
  const response = await fetcher(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    }
  );
  const body = (await response.json().catch(() => null)) as {
    files?: GoogleFile[];
    nextPageToken?: string;
  } | null;
  if (!response.ok || !body) throw new Error('DRIVE_LIST_FAILED');
  const files = (body.files || []).flatMap<DriveKnowledgeFile>((file) => {
    if (!file.id || !file.name || !file.mimeType) return [];
    return [
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime || null,
        version: file.version || null,
        size: file.size ? Number(file.size) : null,
        parents: file.parents || [],
        publiclyShared: Boolean(
          file.permissions?.some((permission) => permission.type === 'anyone')
        ),
      },
    ];
  });
  return buildDriveKnowledgePlan(
    args.folderId,
    files,
    Boolean(body.nextPageToken)
  );
}

async function readTextWithLimit(response: Response) {
  if (!response.body) throw new Error('DRIVE_READ_FAILED');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let content = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > DRIVE_FILE_MAX_BYTES) {
      await reader.cancel();
      throw new Error('DRIVE_FILE_TOO_LARGE');
    }
    content += decoder.decode(value, { stream: true });
  }
  content += decoder.decode();
  return content.trim();
}

export async function downloadDriveKnowledgeFile(args: {
  file: DriveKnowledgeCandidate;
  config: DriveKnowledgeConfig;
  fetcher?: typeof fetch;
}) {
  const folderId = args.file.sourceName.split('/')[2];
  if (!folderId || !args.config.allowedFolderIds.has(folderId)) {
    throw new Error('FOLDER_NOT_ALLOWLISTED');
  }
  const fetcher = args.fetcher || fetch;
  const token = await getServiceAccountAccessToken(args.config, fetcher);
  let url: string;
  if (args.file.mimeType === GOOGLE_DOC) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.file.id)}/export?mimeType=text%2Fplain`;
  } else if (args.file.mimeType === GOOGLE_SHEET) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.file.id)}/export?mimeType=text%2Fcsv`;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.file.id)}?alt=media`;
  }
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('DRIVE_READ_FAILED');
  const content = await readTextWithLimit(response);
  if (!content) throw new Error('DRIVE_EMPTY_FILE');
  return content;
}

export function __resetDriveTokenForTests() {
  tokenCache = null;
}

