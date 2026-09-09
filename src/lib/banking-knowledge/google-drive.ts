import { createSign } from 'node:crypto';
import { parseAllowedDriveFolderIds, supportedBankKeys } from './foundation';
import type {
  BankingKnowledgeProblem,
  BankingKnowledgeProductRoute,
} from './source-catalog';

export const DRIVE_READONLY_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly';
export const DRIVE_SYNC_LIMIT = 50;
export const DRIVE_TREE_LIMIT = 300;
export const DRIVE_MAX_DEPTH = 4;
export const DRIVE_FILE_MAX_BYTES = 1_000_000;

export const APPROVED_DRIVE_ROOTS = [
  {
    folderId: '1pVZ3blIyFLgR94zidRDsBz4PtYktDe5g',
    label: '01_BAZA_BANKOW_I_AI',
    kind: 'bank_catalog',
  },
  {
    folderId: '1s_BT0HC0MZKIT4xZsesC3NcT-bJxEobN',
    label: 'UMOWA prowizje z aneksy mfinanse za posrednictwo',
    kind: 'settlements',
  },
] as const;

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
  label: string;
  kind: 'bank_catalog' | 'settlements';
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
  rootId: string;
  path: string[];
  bank: 'mBank' | 'mFinanse';
  product: string;
  productRoute: BankingKnowledgeProductRoute;
  domains: readonly BankingKnowledgeProblem[];
  sourceType: 'instruction' | 'form' | 'promotion' | 'agreement';
};

export type DriveKnowledgePlan = {
  candidates: DriveKnowledgeCandidate[];
  skipped: {
    folder: number;
    unsupportedType: number;
    tooLarge: number;
    publiclyShared: number;
    outsideFolder: number;
    outOfScope: number;
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
    const approved = APPROVED_DRIVE_ROOTS.find(
      (root) => root.folderId === folderId
    );
    if (
      !isValidDriveId(folderId) ||
      !allowedFolderIds.has(folderId) ||
      !approved ||
      seen.has(folderId)
    ) {
      throw new Error('INVALID_ROOT_CONFIG');
    }
    seen.add(folderId);
    return { ...approved };
  });
}

export function loadDriveKnowledgeConfig(
  env: NodeJS.ProcessEnv = process.env
): DriveKnowledgeConfig {
  const configuredIds = parseAllowedDriveFolderIds(
    env.BANKING_KNOWLEDGE_DRIVE_FOLDER_IDS
  );
  const allowedFolderIds = new Set(
    APPROVED_DRIVE_ROOTS.map((root) => root.folderId).filter(
      (id) => configuredIds.size === 0 || configuredIds.has(id)
    )
  );
  const configuredRoots = env.BANKING_KNOWLEDGE_DRIVE_ROOTS_JSON?.trim();
  return {
    allowedFolderIds,
    approvedRoots: configuredRoots
      ? parseApprovedDriveRoots(configuredRoots, allowedFolderIds)
      : APPROVED_DRIVE_ROOTS.filter((root) =>
          allowedFolderIds.has(root.folderId)
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
    treeLimitPerRun: DRIVE_TREE_LIMIT,
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

export function driveDocumentType(file: DriveKnowledgeCandidate) {
  return `google_drive_internal:${file.productRoute}:${file.domains.join('+')}:${file.sourceType}`;
}

export function buildDriveKnowledgePlan(
  root: DriveKnowledgeRoot,
  files: Array<DriveKnowledgeFile & { path?: string[] }>,
  truncated = false
): DriveKnowledgePlan {
  const skipped = {
    folder: 0,
    unsupportedType: 0,
    tooLarge: 0,
    publiclyShared: 0,
    outsideFolder: 0,
    outOfScope: 0,
  };
  const candidates: DriveKnowledgeCandidate[] = [];
  for (const file of files) {
    const path = file.path ?? [];
    const route = classifyDriveFile(root, path, file.name);
    if (!file.parents.length) {
      skipped.outsideFolder += 1;
    } else if (file.mimeType === GOOGLE_FOLDER) {
      skipped.folder += 1;
    } else if (!isSupportedMimeType(file.mimeType)) {
      skipped.unsupportedType += 1;
    } else if (file.size !== null && file.size > DRIVE_FILE_MAX_BYTES) {
      skipped.tooLarge += 1;
    } else if (file.publiclyShared) {
      skipped.publiclyShared += 1;
    } else if (!route) {
      skipped.outOfScope += 1;
    } else {
      const effectiveDate = file.modifiedTime?.slice(0, 10) || null;
      candidates.push({
        ...file,
        sourceName: `gdrive://${root.folderId}/${file.id}`,
        sourceVersion: file.version || file.modifiedTime || 'brak wersji',
        effectiveDate,
        rootId: root.folderId,
        path,
        ...route,
      });
    }
  }
  return { candidates, skipped, truncated };
}

function normalizePath(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL');
}

export function classifyDriveFile(
  root: DriveKnowledgeRoot,
  path: string[],
  fileName: string
): Pick<
  DriveKnowledgeCandidate,
  'bank' | 'product' | 'productRoute' | 'domains' | 'sourceType'
> | null {
  const fullPath = normalizePath([...path, fileName].join('/'));
  if (root.kind === 'settlements') {
    if (!/(umow|aneks|prowiz|rozlicz|faktur|wynagrodz)/.test(fullPath)) {
      return null;
    }
    return {
      bank: 'mFinanse',
      product: 'Prowizje i rozliczenia',
      productRoute: 'settlements',
      domains: ['commission', 'invoice', 'cashflow'],
      sourceType: 'agreement',
    };
  }

  if (!/(^|\/)mbank(\/|$)/.test(fullPath)) return null;
  const mortgage = /1_hipo|hipote|\bml\b/.test(fullPath);
  const business = /2_firma|3_firma|firma|biznes|\bbc\b/.test(fullPath);
  if (!mortgage && !business) return null;
  const sourceType = /b_wzor|wniosk|formularz/.test(fullPath)
    ? 'form'
    : /c_regulamin|promoc/.test(fullPath)
      ? 'promotion'
      : 'instruction';
  const domains: BankingKnowledgeProblem[] =
    sourceType === 'form'
      ? ['documents', 'application']
      : sourceType === 'promotion'
        ? ['documents', 'decision']
        : ['documents', 'application', 'decision', 'activation'];
  return {
    bank: 'mBank',
    product: mortgage ? 'Kredyt hipoteczny' : 'Kredyt firmowy',
    productRoute: mortgage ? 'mortgage' : 'business',
    domains,
    sourceType,
  };
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
  root: DriveKnowledgeRoot;
  config: DriveKnowledgeConfig;
  fetcher?: typeof fetch;
}) {
  if (!args.config.allowedFolderIds.has(args.root.folderId)) {
    throw new Error('FOLDER_NOT_ALLOWLISTED');
  }
  const fetcher = args.fetcher || fetch;
  const token = await getServiceAccountAccessToken(args.config, fetcher);
  const files: Array<DriveKnowledgeFile & { path: string[] }> = [];
  const queue = [{ id: args.root.folderId, path: [] as string[], depth: 0 }];
  let truncated = false;
  while (queue.length && files.length < DRIVE_TREE_LIMIT) {
    const folder = queue.shift()!;
    const params = new URLSearchParams({
      q: `'${folder.id.replace(/'/g, "\\'")}' in parents and trashed = false`,
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
    if (body.nextPageToken) truncated = true;
    for (const file of body.files || []) {
      if (!file.id || !file.name || !file.mimeType) continue;
      const item = {
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
        path: folder.path,
      };
      files.push(item);
      if (
        item.mimeType === GOOGLE_FOLDER &&
        !item.publiclyShared &&
        folder.depth < DRIVE_MAX_DEPTH &&
        (args.root.kind === 'settlements' ||
          folder.depth > 0 ||
          normalizePath(item.name) === 'mbank')
      ) {
        queue.push({
          id: item.id,
          path: [...folder.path, item.name],
          depth: folder.depth + 1,
        });
      }
      if (files.length >= DRIVE_TREE_LIMIT) {
        truncated = true;
        break;
      }
    }
  }
  return buildDriveKnowledgePlan(args.root, files, truncated);
}

export function minimizeDriveKnowledgeContent(
  content: string,
  file: DriveKnowledgeCandidate
) {
  const patterns: Record<BankingKnowledgeProblem, RegExp> = {
    documents: /dokument|zaświadc|wyciąg|formularz|wniosk/i,
    application: /wniosk|złoż|proces|system|formularz/i,
    decision: /decyz|analiz|warunk|ocen/i,
    activation: /uruchom|wypłat|transz|podpis/i,
    commission: /prowiz|wynagrodz|rozlicz/i,
    invoice: /faktur|rachun|vat/i,
    cashflow: /płatn|wypłat|termin|cash.?flow/i,
  };
  const relevant = content
    .split(/\n\s*\n|\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(
      (part) =>
        part.length >= 30 &&
        file.domains.some((domain) => patterns[domain].test(part))
    )
    .slice(0, 8)
    .map((part) => part.slice(0, 700));
  return relevant.join('\n\n').slice(0, 4_000);
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

