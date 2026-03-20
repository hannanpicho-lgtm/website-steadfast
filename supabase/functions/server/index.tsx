import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const authClient = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const ADMIN_RATE_LIMIT_WINDOW_MS = 60_000;
const ADMIN_RATE_LIMIT_MAX_REQUESTS = 60;
const adminRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const REFERRAL_PARENT_RATE = 0.2;
const ROOT_REFERRAL_USERNAME = 'steadfast_root';
const ROOT_REFERRAL_INVITE_CODE = 'STF01';

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
// All sensitive endpoints require JWT authentication so allowing all origins is safe.
app.use(
  "/*",
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-admin-secret", "x-user-jwt"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Admin authorization helper ──────────────────────────────────────────────
// Admin access is granted only to authenticated Supabase users with an admin
// role in app_metadata/user_metadata. Example app_metadata:
// { "role": "admin" } or { "roles": ["admin"] }
function hasAdminRole(user: any): boolean {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const roles = new Set<string>();
  const appMetadata = typeof user.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};

  if (typeof appMetadata.role === 'string') {
    roles.add(appMetadata.role.toLowerCase());
  }
  if (Array.isArray(appMetadata.roles)) {
    appMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }
  if (typeof userMetadata.role === 'string') {
    roles.add(userMetadata.role.toLowerCase());
  }
  if (Array.isArray(userMetadata.roles)) {
    userMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }

  return roles.has('admin') || roles.has('super_admin');
}

function adminRequestContext(c: any) {
  const forwardedFor = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown-ip';
  const source = forwardedFor.split(',')[0].trim();
  const adminUser = c.get('adminUser');
  return {
    path: c.req.path,
    method: c.req.method,
    source,
    userId: adminUser?.id ?? null,
  };
}

function logAdminAuthFailure(c: any, reason: string, details: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({
    event: 'admin_auth_failure',
    reason,
    ...adminRequestContext(c),
    ...details,
  }));
}

function logAdminRateLimit(c: any, bucket: string, retryAfterSeconds: number) {
  console.warn(JSON.stringify({
    event: 'admin_rate_limit_exceeded',
    bucket,
    retryAfterSeconds,
    ...adminRequestContext(c),
  }));
}

async function requireAdmin(c: any) {
  if (!authClient) {
    logAdminAuthFailure(c, 'auth_client_missing');
    return c.json({ error: 'Server auth configuration missing' }, 500);
  }

  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    logAdminAuthFailure(c, 'missing_gateway_authorization');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const authHeaderToken = authorization.slice('Bearer '.length).trim();
  const forwardedUserJwt = c.req.header('x-user-jwt')?.trim() ?? '';
  const tokenSource = forwardedUserJwt ? 'x-user-jwt' : 'authorization';
  const accessToken = forwardedUserJwt || authHeaderToken;
  if (!accessToken) {
    logAdminAuthFailure(c, 'missing_access_token_after_header_parse');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    logAdminAuthFailure(c, 'invalid_or_expired_admin_token', {
      tokenSource,
      authError: error?.message ?? null,
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!hasAdminRole(data.user)) {
    logAdminAuthFailure(c, 'admin_role_missing', {
      tokenSource,
      userId: data.user.id,
    });
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('adminUser', data.user);
  return null;
}

function enforceAdminRateLimit(c: any, bucket: string) {
  const now = Date.now();
  const adminUser = c.get('adminUser');
  const userId = adminUser?.id ?? 'unknown-user';
  const forwardedFor = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown-ip';
  const source = forwardedFor.split(',')[0].trim();
  const key = `${bucket}:${userId}:${source}`;

  const current = adminRateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    adminRateLimitStore.set(key, {
      count: 1,
      resetAt: now + ADMIN_RATE_LIMIT_WINDOW_MS,
    });
    return null;
  }

  if (current.count >= ADMIN_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    c.header('Retry-After', String(retryAfterSeconds));
    logAdminRateLimit(c, bucket, retryAfterSeconds);
    return c.json({ error: 'Rate limit exceeded. Please retry shortly.' }, 429);
  }

  current.count += 1;
  adminRateLimitStore.set(key, current);
  return null;
}

function getAdminRoleClaim(user: any): 'admin' | 'super_admin' {
  const roles = new Set<string>();
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};

  if (typeof appMetadata.role === 'string') {
    roles.add(appMetadata.role.toLowerCase());
  }
  if (Array.isArray(appMetadata.roles)) {
    appMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }
  if (typeof userMetadata.role === 'string') {
    roles.add(userMetadata.role.toLowerCase());
  }
  if (Array.isArray(userMetadata.roles)) {
    userMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }

  return roles.has('super_admin') ? 'super_admin' : 'admin';
}

function getAdminRoleName(user: any): string {
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const explicitRoleName = userMetadata.role_name ?? appMetadata.admin_role_name;
  if (typeof explicitRoleName === 'string' && explicitRoleName.trim()) {
    return explicitRoleName.trim();
  }
  return getAdminRoleClaim(user) === 'super_admin' ? 'Super Admin' : 'Admin';
}

function getAdminRoleColor(user: any): string {
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const explicitColor = userMetadata.role_color ?? appMetadata.admin_role_color;
  if (typeof explicitColor === 'string' && explicitColor.trim()) {
    return explicitColor.trim();
  }
  return getAdminRoleClaim(user) === 'super_admin' ? 'red' : 'blue';
}

function formatAdminLastLogin(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date).replace(',', '');
}

function buildAvatar(fullName: string, fallback = 'AD'): string {
  const avatar = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return avatar || fallback;
}

function mapAuthUserToAdminRecord(user: any) {
  const email = typeof user?.email === 'string' ? user.email : '';
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const fullName = typeof userMetadata.full_name === 'string' && userMetadata.full_name.trim()
    ? userMetadata.full_name.trim()
    : (typeof userMetadata.name === 'string' && userMetadata.name.trim()
      ? userMetadata.name.trim()
      : (email ? email.split('@')[0] : 'Admin User'));
  const username = typeof userMetadata.username === 'string' && userMetadata.username.trim()
    ? userMetadata.username.trim()
    : (email ? email.split('@')[0] : String(user?.id ?? 'admin'));
  const bannedUntil = typeof user?.banned_until === 'string' ? new Date(user.banned_until) : null;
  const isSuspended = Boolean(bannedUntil && !Number.isNaN(bannedUntil.getTime()) && bannedUntil.getTime() > Date.now());
  const factors = Array.isArray(user?.factors) ? user.factors : [];

  return {
    id: String(user?.id ?? username),
    username,
    email,
    fullName,
    roleId: getAdminRoleClaim(user) === 'super_admin' ? 1 : 0,
    roleName: getAdminRoleName(user),
    roleColor: getAdminRoleColor(user),
    status: isSuspended ? 'Suspended' : 'Active',
    lastLogin: formatAdminLastLogin(user?.last_sign_in_at),
    createdDate: typeof user?.created_at === 'string' ? user.created_at.slice(0, 10) : '',
    phone: typeof userMetadata.phone === 'string' && userMetadata.phone.trim() ? userMetadata.phone.trim() : '-',
    department: typeof userMetadata.department === 'string' && userMetadata.department.trim() ? userMetadata.department.trim() : 'General',
    avatar: buildAvatar(fullName, username.slice(0, 2).toUpperCase()),
    twoFactorEnabled: factors.length > 0,
    loginAttempts: 0,
  };
}

// ── Password hashing (PBKDF2 via Web Crypto) ───────────────────────────────
// Format stored in KV: "pbkdf2v1:<base64-salt>:<base64-hash>"
// The "pbkdf2v1:" prefix lets verifyPassword detect hashed vs. legacy plaintext.
const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LENGTH = 32; // bytes

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return `pbkdf2v1:${saltB64}:${hashB64}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Backward-compatible: if not a hash, fall back to plaintext comparison
  if (!stored.startsWith('pbkdf2v1:')) {
    return stored === password;
  }
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const salt = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8,
  );
  const actualHash = new Uint8Array(hashBuffer);
  // Constant-time comparison to prevent timing attacks
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash[i] ^ expectedHash[i];
  }
  return diff === 0;
}

// ── Input sanitizers ─────────────────────────────────────────────────────────
// All of these prevent colon-injection attacks against KV key namespaces.
function sanitizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Allow alphanumeric, underscore, hyphen, dot — max 64 chars
  if (!/^[a-zA-Z0-9_.\-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (!/^(?=.*\d)[A-Z0-9]{5}$/.test(normalized)) return null;
  return normalized;
}

function sanitizeAdminInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  // Admin invitation codes are exactly 5 alphanumeric characters.
  if (!/^[A-Z0-9]{5}$/.test(normalized)) return null;
  return normalized;
}

function generateAdminInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 5;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

function generateAdminShortCode(): string {
  return generateAdminInviteCode();
}

function generateUserInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const digits = '0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let code = Array.from(bytes).map((b) => chars[b % chars.length]).join('');
  const digitIndex = bytes[0] % 5;
  code = `${code.slice(0, digitIndex)}${digits[bytes[1] % digits.length]}${code.slice(digitIndex + 1)}`;
  return code;
}

async function resolveCanonicalUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const lookup = await kv.get(`user:lookup:${normalized}`);
  if (typeof lookup === 'string' && lookup) {
    return lookup;
  }

  const exact = await kv.get(`user:${username}`);
  if (exact) {
    return username;
  }

  const lowerRecord = await kv.get(`user:${normalized}`);
  if (lowerRecord) {
    return normalized;
  }

  return null;
}

async function assignUsernameLookup(username: string): Promise<void> {
  await kv.set(`user:lookup:${username.toLowerCase()}`, username);
}

function isSuperAdmin(user: any): boolean {
  return getAdminRoleClaim(user) === 'super_admin';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const TRANSACTION_KEY_PREFIX = 'transaction:';
const WITHDRAWAL_KEY_PREFIX = 'withdrawal:';
const TASK_CATALOG_KEY_PREFIX = 'task-catalog:';
const VIP_CONFIG_KEY_PREFIX = 'vip-config:';
const REWARDS_CONFIG_KEY = 'rewards-config:primary';
const ADMIN_SALARY_PROJECT_KEY = 'admin-salary:project:primary';
const ADMIN_SALARY_AUDIT_LOG_KEY = 'admin-salary:audit-log:primary';
const ADMIN_PLATFORM_SETTINGS_KEY = 'admin-platform-settings:primary';
const ADMIN_SALARY_MAX_RESTORE_POINTS = 10;
const ADMIN_SALARY_MAX_AUDIT_EVENTS = 50;

const defaultTaskCatalog = [
  {
    id: 'task-amazon-headphones',
    merchant: 'Amazon',
    product: 'Premium Wireless Headphones with Noise Cancellation',
    price: 299.99,
    commission: 0.015,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',
    rating: 4.5,
    productUrl: 'https://example.com/products/premium-wireless-headphones',
  },
  {
    id: 'task-walmart-smartwatch',
    merchant: 'Walmart',
    product: 'Smart Watch Pro with Fitness Tracking',
    price: 399.0,
    commission: 0.02,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop',
    rating: 4.2,
    productUrl: 'https://example.com/products/smart-watch-pro',
  },
  {
    id: 'task-target-tablet',
    merchant: 'Target',
    product: '10-inch Tablet with 128GB Storage',
    price: 549.99,
    commission: 0.018,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop',
    rating: 4.1,
    productUrl: 'https://example.com/products/10-inch-tablet',
  },
  {
    id: 'task-bestbuy-webcam',
    merchant: 'Best Buy',
    product: '4K Webcam with Built-in Microphone',
    price: 129.99,
    commission: 0.012,
    status: 'Paused',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop',
    rating: 4.3,
    productUrl: 'https://example.com/products/4k-webcam',
  },
];

const defaultVipConfig = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 10, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 15, commission: 0.01, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 2000, dailyTasks: 20, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5000, dailyTasks: 25, commission: 0.02, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 30, commission: 0.025, color: 'diamond' },
];

const defaultRewardsConfig = {
  workday: [
    { id: 1, days: 1, salary: 204, enabled: true },
    { id: 2, days: 7, salary: 1428, enabled: true },
    { id: 3, days: 15, salary: 3060, enabled: true },
    { id: 4, days: 22, salary: 4488, enabled: true },
    { id: 5, days: 30, salary: 6120, enabled: true },
  ],
  reset: [
    { id: 1, deposit: 100, reward: 28, label: 'Bronze', color: 'bg-orange-300', labelColor: 'bg-orange-600', enabled: true },
    { id: 2, deposit: 500, reward: 158, label: 'Silver', color: 'bg-gray-300', labelColor: 'bg-gray-600', enabled: true },
    { id: 3, deposit: 2000, reward: 688, label: 'Gold', color: 'bg-yellow-300', labelColor: 'bg-yellow-600', enabled: true },
    { id: 4, deposit: 5000, reward: 1788, label: 'Platinum', color: 'bg-blue-300', labelColor: 'bg-blue-600', enabled: true },
    { id: 5, deposit: 10000, reward: 3888, label: 'Diamond', color: 'bg-purple-300', labelColor: 'bg-purple-600', enabled: true },
    { id: 6, deposit: 30000, reward: 12888, label: 'Crown', color: 'bg-red-300', labelColor: 'bg-red-600', enabled: true },
  ],
  accumulated: [
    { id: 1, minDeposit: 1000, maxDeposit: 4999, rate: 0.003, enabled: true },
    { id: 2, minDeposit: 5000, maxDeposit: 19999, rate: 0.005, enabled: true },
    { id: 3, minDeposit: 20000, maxDeposit: 49999, rate: 0.008, enabled: true },
    { id: 4, minDeposit: 50000, maxDeposit: null, rate: 0.01, enabled: true },
  ],
  productSystem: {
    productsPerSet: 10,
    maxSetsPerDay: 5,
    minTimePerProduct: 30,
    autoApproveCommission: true,
    requireProductConfirmation: true,
    premiumEnabled: true,
    premiumTriggerTaskNumber: 10,
    premiumBaseValue: 300,
    premiumValueMode: 'multiplier',
    vipPremiumAdjustments: [
      { vipLevel: 1, multiplier: 1.1, minValue: 220, maxValue: 420 },
      { vipLevel: 2, multiplier: 1.2, minValue: 300, maxValue: 620 },
      { vipLevel: 3, multiplier: 1.35, minValue: 500, maxValue: 1300 },
      { vipLevel: 4, multiplier: 1.5, minValue: 900, maxValue: 2600 },
      { vipLevel: 5, multiplier: 1.8, minValue: 1800, maxValue: 5200 },
    ],
  },
};

function createFinanceId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function sanitizeWalletAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256 || /[\u0000-\u001F]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeWalletText(value: unknown, maxLength = 128): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001F]/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

const CLIENT_FINANCIAL_MUTATION_FIELDS = new Set([
  'balance',
  'todayCommission',
  'referralEarnings',
  'holdAmount',
  'availableAmount',
  'luckyBonus',
  'tasksCompleted',
  'tasksLimit',
  'tasksCompletedInSet',
  'completedTaskSets',
]);

function getForbiddenClientFinancialFields(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const source = body as Record<string, unknown>;
  return Object.keys(source).filter((key) => CLIENT_FINANCIAL_MUTATION_FIELDS.has(key));
}

function sanitizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }

  if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function resolveRequestIdempotencyKey(c: any, body: unknown): string | null {
  const headerKey = sanitizeIdempotencyKey(c.req.header('x-idempotency-key'));
  if (headerKey) {
    return headerKey;
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const source = body as Record<string, unknown>;
  return sanitizeIdempotencyKey(source.idempotencyKey);
}

type BankingWalletProfile = {
  type: 'banking';
  accountName: string;
  accountNumber: string;
  bankName: string;
  swiftCode: string;
  routingNumber: string;
  country: string;
  updatedAt: string;
};

type CryptoWalletProfile = {
  type: 'crypto';
  walletType: string;
  walletAddress: string;
  network: string;
  updatedAt: string;
};

type WalletProfile = BankingWalletProfile | CryptoWalletProfile;

function normalizeWalletType(value: unknown): 'banking' | 'crypto' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'banking' || normalized === 'crypto') {
    return normalized;
  }
  return null;
}

function normalizeStoredWalletProfile(value: unknown): WalletProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const type = normalizeWalletType(source.type);
  const updatedAt = typeof source.updatedAt === 'string' && source.updatedAt
    ? source.updatedAt
    : new Date().toISOString();

  if (type === 'banking') {
    const accountName = sanitizeWalletText(source.accountName);
    const accountNumber = sanitizeWalletText(source.accountNumber, 64);
    const bankName = sanitizeWalletText(source.bankName);
    const country = sanitizeWalletText(source.country, 8);
    if (!accountName || !accountNumber || !bankName || !country) {
      return null;
    }
    return {
      type: 'banking',
      accountName,
      accountNumber,
      bankName,
      swiftCode: sanitizeWalletText(source.swiftCode, 32),
      routingNumber: sanitizeWalletText(source.routingNumber, 32),
      country,
      updatedAt,
    };
  }

  if (type === 'crypto') {
    const walletAddress = sanitizeWalletAddress(source.walletAddress);
    if (!walletAddress) {
      return null;
    }
    return {
      type: 'crypto',
      walletType: sanitizeFinanceMethod(source.walletType, 'bitcoin'),
      walletAddress,
      network: sanitizeFinanceMethod(source.network, 'mainnet'),
      updatedAt,
    };
  }

  return null;
}

function parseWalletProfileInput(body: unknown): { ok: true; walletProfile: WalletProfile } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body is required' };
  }

  const source = body as Record<string, unknown>;
  const type = normalizeWalletType(source.type);
  if (!type) {
    return { ok: false, error: 'type must be banking or crypto' };
  }

  if (type === 'banking') {
    const accountName = sanitizeWalletText(source.accountName);
    const accountNumber = sanitizeWalletText(source.accountNumber, 64);
    const bankName = sanitizeWalletText(source.bankName);
    const country = sanitizeWalletText(source.country, 8);
    if (!accountName || !accountNumber || !bankName || !country) {
      return { ok: false, error: 'accountName, accountNumber, bankName, and country are required' };
    }

    return {
      ok: true,
      walletProfile: {
        type: 'banking',
        accountName,
        accountNumber,
        bankName,
        swiftCode: sanitizeWalletText(source.swiftCode, 32),
        routingNumber: sanitizeWalletText(source.routingNumber, 32),
        country,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const walletAddress = sanitizeWalletAddress(source.walletAddress);
  if (!walletAddress) {
    return { ok: false, error: 'walletAddress is required' };
  }

  return {
    ok: true,
    walletProfile: {
      type: 'crypto',
      walletType: sanitizeFinanceMethod(source.walletType, 'bitcoin'),
      walletAddress,
      network: sanitizeFinanceMethod(source.network, 'mainnet'),
      updatedAt: new Date().toISOString(),
    },
  };
}

function sanitizeFinanceMethod(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) {
    return fallback;
  }
  return trimmed;
}

function sanitizeTaskId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9\-]{1,128}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeAdminSalaryRewardTab(value: unknown): string {
  const valid = new Set(['workday', 'reset', 'accumulated', 'product-system', 'salary-payments']);
  return typeof value === 'string' && valid.has(value) ? value : 'workday';
}

function sanitizeAdminSalaryBulkOption(value: unknown): 'all' | 'auto' | 'manual' {
  return value === 'auto' || value === 'manual' ? value : 'all';
}

function sanitizeAdminSalaryPayment(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    !Number.isFinite(Number(candidate.id)) ||
    typeof candidate.username !== 'string' ||
    !Number.isFinite(Number(candidate.daysWorked)) ||
    !Number.isFinite(Number(candidate.salaryDue)) ||
    typeof candidate.dueDate !== 'string'
  ) {
    return null;
  }

  const status = candidate.status === 'Paid' ? 'Paid' : 'Pending';
  const paymentMode = candidate.paymentMode === 'Manual' ? 'Manual' : 'Automatic';

  return {
    id: Number(candidate.id),
    username: candidate.username.trim(),
    daysWorked: Math.max(0, Math.round(Number(candidate.daysWorked))),
    salaryDue: Math.max(0, roundMoney(Number(candidate.salaryDue))),
    status,
    dueDate: String(candidate.dueDate),
    paidDate: typeof candidate.paidDate === 'string' ? candidate.paidDate : undefined,
    paymentMode,
  };
}

function sanitizeAdminSalaryRestorePoint(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const payments = Array.isArray(candidate.payments)
    ? candidate.payments
        .map((payment) => sanitizeAdminSalaryPayment(payment))
        .filter((payment): payment is Record<string, unknown> => payment !== null)
    : [];

  if (payments.length === 0) {
    return null;
  }

  return {
    id: Number.isFinite(Number(candidate.id)) ? Number(candidate.id) : Date.now(),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : 'Imported backup',
    payments,
  };
}

function sanitizeAdminSalaryProject(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const payments = Array.isArray(source.payments)
    ? source.payments
        .map((payment) => sanitizeAdminSalaryPayment(payment))
        .filter((payment): payment is Record<string, unknown> => payment !== null)
    : [];
  const points = Array.isArray(source.points)
    ? source.points
        .map((point) => sanitizeAdminSalaryRestorePoint(point))
        .filter((point): point is Record<string, unknown> => point !== null)
        .slice(0, ADMIN_SALARY_MAX_RESTORE_POINTS)
    : [];

  if (payments.length === 0) {
    return null;
  }

  const uiState = typeof source.uiState === 'object' && source.uiState ? source.uiState as Record<string, unknown> : {};

  return {
    version: 1,
    savedAt: typeof source.savedAt === 'string' ? source.savedAt : new Date().toISOString(),
    checksum: typeof source.checksum === 'string' ? source.checksum : '',
    uiState: {
      activeRewardTab: sanitizeAdminSalaryRewardTab(uiState.activeRewardTab),
      selectedBulkOption: sanitizeAdminSalaryBulkOption(uiState.selectedBulkOption),
      autoBackupEnabled: typeof uiState.autoBackupEnabled === 'boolean' ? uiState.autoBackupEnabled : true,
      autoBackupIntervalMinutes: Math.min(60, Math.max(1, Math.round(Number(uiState.autoBackupIntervalMinutes ?? 1)))),
      backupRetentionDays: Math.min(365, Math.max(1, Math.round(Number(uiState.backupRetentionDays ?? 30)))),
    },
    payments,
    points,
  };
}

function sanitizeAdminSalaryAuditEvent(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (!Number.isFinite(Number(source.id)) || typeof source.action !== 'string') {
    return null;
  }

  return {
    id: Number(source.id),
    at: typeof source.at === 'string' ? source.at : new Date().toISOString(),
    action: source.action,
    detail: typeof source.detail === 'string' ? source.detail : '',
  };
}

function sanitizeAdminSalaryAuditLog(values: unknown): any[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAdminSalaryAuditEvent(value))
    .filter((event): event is Record<string, unknown> => event !== null)
    .slice(0, ADMIN_SALARY_MAX_AUDIT_EVENTS);
}

function sanitizeAdminPlatformSettings(value: unknown) {
  const defaults = {
    maintenanceMode: false,
    allowNewRegistration: true,
    minWithdrawal: 50,
    maxWithdrawal: 10_000,
    withdrawalFee: 2,
    minDeposit: 10,
    taskRefreshHours: 24,
    autoAssignTasks: 'Enabled',
    savedAt: new Date().toISOString(),
  };

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const source = value as Record<string, unknown>;
  const minWithdrawal = Number(source.minWithdrawal);
  const maxWithdrawal = Number(source.maxWithdrawal);
  const withdrawalFee = Number(source.withdrawalFee);
  const minDeposit = Number(source.minDeposit);
  const taskRefreshHours = Number(source.taskRefreshHours);

  const boundedMinWithdrawal = Number.isFinite(minWithdrawal)
    ? Math.min(1_000_000, Math.max(1, roundMoney(minWithdrawal)))
    : defaults.minWithdrawal;
  const boundedMaxWithdrawalRaw = Number.isFinite(maxWithdrawal)
    ? Math.min(1_000_000, Math.max(1, roundMoney(maxWithdrawal)))
    : defaults.maxWithdrawal;
  const boundedMaxWithdrawal = boundedMaxWithdrawalRaw <= boundedMinWithdrawal
    ? Math.min(1_000_000, boundedMinWithdrawal + 1)
    : boundedMaxWithdrawalRaw;

  return {
    maintenanceMode: source.maintenanceMode === true,
    allowNewRegistration: source.allowNewRegistration !== false,
    minWithdrawal: boundedMinWithdrawal,
    maxWithdrawal: boundedMaxWithdrawal,
    withdrawalFee: Number.isFinite(withdrawalFee) ? Math.min(50, Math.max(0, roundMoney(withdrawalFee))) : defaults.withdrawalFee,
    minDeposit: Number.isFinite(minDeposit) ? Math.min(1_000_000, Math.max(1, roundMoney(minDeposit))) : defaults.minDeposit,
    taskRefreshHours: Number.isFinite(taskRefreshHours) ? Math.min(168, Math.max(1, Math.round(taskRefreshHours))) : defaults.taskRefreshHours,
    autoAssignTasks: source.autoAssignTasks === 'Disabled' ? 'Disabled' : 'Enabled',
    savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : new Date().toISOString(),
  };
}

function sanitizeTaskStatus(value: unknown): 'Active' | 'Paused' {
  if (typeof value !== 'string') {
    return 'Active';
  }
  return value.trim().toLowerCase() === 'paused' ? 'Paused' : 'Active';
}

function sanitizeTaskText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length <= 256 ? trimmed : trimmed.slice(0, 256);
}

function sanitizeTaskUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizeWorkdayRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  return {
    id,
    days: Math.max(1, Math.round(Number(record?.days ?? 1))),
    salary: Math.max(0, roundMoney(Number(record?.salary ?? 0))),
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeResetRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  return {
    id,
    deposit: Math.max(0, roundMoney(Number(record?.deposit ?? 0))),
    reward: Math.max(0, roundMoney(Number(record?.reward ?? 0))),
    label: sanitizeTaskText(record?.label, `Tier ${id}`),
    color: sanitizeTaskText(record?.color, 'bg-gray-300'),
    labelColor: sanitizeTaskText(record?.labelColor, 'bg-gray-600'),
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeAccumulatedRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  const minDeposit = Math.max(0, roundMoney(Number(record?.minDeposit ?? 0)));
  const rawMax = Number(record?.maxDeposit);
  const maxDeposit = Number.isFinite(rawMax)
    ? Math.max(minDeposit, roundMoney(rawMax))
    : null;
  const rate = Number.isFinite(Number(record?.rate)) ? Math.max(0, Number(record.rate)) : 0;

  return {
    id,
    minDeposit,
    maxDeposit,
    rate,
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeProductSystemConfig(record: any) {
  const source = typeof record === 'object' && record ? record : {};
  const rawAdjustments = Array.isArray(source.vipPremiumAdjustments) ? source.vipPremiumAdjustments : [];
  const defaultAdjustments = Array.isArray(defaultRewardsConfig.productSystem.vipPremiumAdjustments)
    ? defaultRewardsConfig.productSystem.vipPremiumAdjustments
    : [];

  const vipPremiumAdjustments = (rawAdjustments.length > 0 ? rawAdjustments : defaultAdjustments)
    .map((entry: any, index: number) => {
      const fallback = defaultAdjustments[index] ?? defaultAdjustments[defaultAdjustments.length - 1] ?? {
        vipLevel: index + 1,
        multiplier: 1,
        minValue: 0,
        maxValue: 0,
      };
      const vipLevel = Number.isFinite(Number(entry?.vipLevel))
        ? Math.max(1, Math.round(Number(entry.vipLevel)))
        : Number(fallback.vipLevel);
      const multiplier = Number.isFinite(Number(entry?.multiplier))
        ? Math.max(0.1, Number(entry.multiplier))
        : Number(fallback.multiplier);
      const minValue = Number.isFinite(Number(entry?.minValue))
        ? Math.max(0, roundMoney(Number(entry.minValue)))
        : roundMoney(Number(fallback.minValue));
      const maxCandidate = Number.isFinite(Number(entry?.maxValue))
        ? roundMoney(Number(entry.maxValue))
        : roundMoney(Number(fallback.maxValue));
      const maxValue = Math.max(minValue, maxCandidate);

      return {
        vipLevel,
        multiplier,
        minValue,
        maxValue,
      };
    })
    .sort((left, right) => left.vipLevel - right.vipLevel);

  const premiumValueModeRaw = typeof source.premiumValueMode === 'string' ? source.premiumValueMode.toLowerCase() : 'multiplier';
  const premiumValueMode = premiumValueModeRaw === 'range' ? 'range' : 'multiplier';

  return {
    productsPerSet: Math.max(1, Math.round(Number(source?.productsPerSet ?? 10))),
    maxSetsPerDay: Math.max(1, Math.round(Number(source?.maxSetsPerDay ?? 5))),
    minTimePerProduct: Math.max(1, Math.round(Number(source?.minTimePerProduct ?? 30))),
    autoApproveCommission: normalizeBoolean(source?.autoApproveCommission, true),
    requireProductConfirmation: normalizeBoolean(source?.requireProductConfirmation, true),
    premiumEnabled: normalizeBoolean(source?.premiumEnabled, true),
    premiumTriggerTaskNumber: Math.max(1, Math.round(Number(source?.premiumTriggerTaskNumber ?? 10))),
    premiumBaseValue: Math.max(0, roundMoney(Number(source?.premiumBaseValue ?? 300))),
    premiumValueMode,
    vipPremiumAdjustments,
  };
}

function resolveVipPremiumAdjustment(
  vipLevel: number,
  productSystem: ReturnType<typeof normalizeProductSystemConfig>,
) {
  const direct = productSystem.vipPremiumAdjustments.find((entry) => entry.vipLevel === vipLevel);
  if (direct) {
    return direct;
  }

  const below = [...productSystem.vipPremiumAdjustments]
    .reverse()
    .find((entry) => entry.vipLevel <= vipLevel);
  if (below) {
    return below;
  }

  return productSystem.vipPremiumAdjustments[0] ?? {
    vipLevel,
    multiplier: 1,
    minValue: productSystem.premiumBaseValue,
    maxValue: productSystem.premiumBaseValue,
  };
}

function computePremiumValueForVip(
  vipLevel: number,
  productSystem: ReturnType<typeof normalizeProductSystemConfig>,
): number {
  const adjustment = resolveVipPremiumAdjustment(vipLevel, productSystem);

  if (productSystem.premiumValueMode === 'range') {
    if (adjustment.maxValue > adjustment.minValue) {
      const seeded = Math.abs(Math.sin(vipLevel * 999 + productSystem.premiumTriggerTaskNumber));
      const rangeValue = adjustment.minValue + (adjustment.maxValue - adjustment.minValue) * seeded;
      return roundMoney(rangeValue);
    }
    return roundMoney(adjustment.minValue);
  }

  return roundMoney(Math.max(0, productSystem.premiumBaseValue * adjustment.multiplier));
}

function buildPremiumRequirementResponse(activePremium: any) {
  const requiredAmount = roundMoney(Number(activePremium?.topUpRequired ?? activePremium?.negativeAmount ?? 0));
  return {
    id: activePremium?.id ?? null,
    requiredAmount,
    requiredAmountDisplay: `-${requiredAmount.toFixed(2)}`,
    triggerTaskNumber: Number.isFinite(Number(activePremium?.triggerTaskNumber)) ? Number(activePremium.triggerTaskNumber) : null,
    vipLevel: Number.isFinite(Number(activePremium?.vipLevel)) ? Number(activePremium.vipLevel) : null,
    premiumValue: Number.isFinite(Number(activePremium?.premiumProductValue)) ? Number(activePremium.premiumProductValue) : 0,
    mode: typeof activePremium?.valueMode === 'string' ? activePremium.valueMode : 'multiplier',
    status: typeof activePremium?.status === 'string' ? activePremium.status : 'awaiting_funds',
  };
}

function userHasPendingPremiumRequirement(userData: any): boolean {
  const requiredAmount = Number(userData?.activePremium?.topUpRequired ?? userData?.activePremium?.negativeAmount ?? 0);
  return Boolean(userData?.activePremium) && requiredAmount > 0;
}

function normalizeRewardsConfigRecord(record: any) {
  const source = typeof record === 'object' && record ? record : defaultRewardsConfig;
  const workday = Array.isArray(source.workday) && source.workday.length > 0
    ? source.workday.map((entry: any, index: number) => normalizeWorkdayRewardRecord(entry, index))
    : defaultRewardsConfig.workday.map((entry, index) => normalizeWorkdayRewardRecord(entry, index));
  const reset = Array.isArray(source.reset) && source.reset.length > 0
    ? source.reset.map((entry: any, index: number) => normalizeResetRewardRecord(entry, index))
    : defaultRewardsConfig.reset.map((entry, index) => normalizeResetRewardRecord(entry, index));
  const accumulated = Array.isArray(source.accumulated) && source.accumulated.length > 0
    ? source.accumulated.map((entry: any, index: number) => normalizeAccumulatedRewardRecord(entry, index))
    : defaultRewardsConfig.accumulated.map((entry, index) => normalizeAccumulatedRewardRecord(entry, index));

  return {
    workday,
    reset,
    accumulated,
    productSystem: normalizeProductSystemConfig(source.productSystem ?? defaultRewardsConfig.productSystem),
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt
      ? source.updatedAt
      : new Date().toISOString(),
  };
}

async function getRewardsConfigRecord() {
  const existing = await kv.get(REWARDS_CONFIG_KEY);
  if (!existing) {
    const seeded = normalizeRewardsConfigRecord(defaultRewardsConfig);
    await kv.set(REWARDS_CONFIG_KEY, seeded);
    return seeded;
  }

  const normalized = normalizeRewardsConfigRecord(existing);
  await kv.set(REWARDS_CONFIG_KEY, normalized);
  return normalized;
}

function normalizeVipConfigRecord(record: any) {
  const level = Number.isFinite(Number(record?.level)) ? Number(record.level) : 1;
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  return {
    level,
    name: sanitizeTaskText(record?.name, `VIP ${level}`),
    investment: roundMoney(Number(record?.investment ?? 0)),
    dailyTasks: Math.max(1, Math.round(Number(record?.dailyTasks ?? 1))),
    commission: Number.isFinite(Number(record?.commission)) ? Number(record.commission) : 0.005,
    color: sanitizeTaskText(record?.color, 'bronze'),
    createdAt,
    updatedAt,
  };
}

async function ensureVipConfigSeeded() {
  const existing = await kv.getByPrefix(VIP_CONFIG_KEY_PREFIX);
  if (existing.length > 0) {
    return;
  }

  for (const tier of defaultVipConfig) {
    const normalized = normalizeVipConfigRecord({
      ...tier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await kv.set(`${VIP_CONFIG_KEY_PREFIX}${normalized.level}`, normalized);
  }
}

async function listVipConfigRecords() {
  await ensureVipConfigSeeded();
  const tiers = await kv.getByPrefix(VIP_CONFIG_KEY_PREFIX);
  return tiers
    .map((tier) => normalizeVipConfigRecord(tier))
    .sort((left, right) => left.level - right.level);
}

async function getVipConfigForLevel(level: number) {
  const tiers = await listVipConfigRecords();
  if (tiers.length === 0) {
    return normalizeVipConfigRecord(defaultVipConfig[0]);
  }

  const exact = tiers.find((tier) => tier.level === level);
  if (exact) {
    return exact;
  }

  const highestBelow = [...tiers].reverse().find((tier) => tier.level <= level);
  return highestBelow ?? tiers[0];
}

function normalizeTaskCatalogRecord(record: any) {
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  return {
    id: sanitizeTaskId(record?.id) ?? createFinanceId('task'),
    merchant: sanitizeTaskText(record?.merchant, 'Marketplace'),
    product: sanitizeTaskText(record?.product, 'Task Product'),
    price: roundMoney(Number(record?.price ?? 0)),
    commission: Number.isFinite(Number(record?.commission)) ? Number(record.commission) : 0.01,
    status: sanitizeTaskStatus(record?.status),
    image: sanitizeTaskText(record?.image),
    rating: Number.isFinite(Number(record?.rating)) ? Number(record.rating) : 4,
    productUrl: sanitizeTaskUrl(record?.productUrl),
    createdAt,
    updatedAt,
  };
}

async function ensureTaskCatalogSeeded() {
  const existing = await kv.getByPrefix(TASK_CATALOG_KEY_PREFIX);
  if (existing.length > 0) {
    return;
  }

  for (const task of defaultTaskCatalog) {
    const normalized = normalizeTaskCatalogRecord({
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${normalized.id}`, normalized);
  }
}

async function listTaskCatalogRecords(includePaused = true) {
  await ensureTaskCatalogSeeded();
  const tasks = await kv.getByPrefix(TASK_CATALOG_KEY_PREFIX);
  return tasks
    .map((task) => normalizeTaskCatalogRecord(task))
    .filter((task) => includePaused || task.status === 'Active')
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

async function getTaskCatalogRecord(taskId: string) {
  await ensureTaskCatalogSeeded();
  const task = await kv.get(`${TASK_CATALOG_KEY_PREFIX}${taskId}`);
  return task ? normalizeTaskCatalogRecord(task) : null;
}

function normalizeTransactionStatus(value: unknown): 'Pending' | 'Completed' | 'Rejected' | 'Failed' {
  if (typeof value !== 'string') {
    return 'Pending';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'approved') {
    return 'Completed';
  }
  if (normalized === 'rejected') {
    return 'Rejected';
  }
  if (normalized === 'failed') {
    return 'Failed';
  }
  return 'Pending';
}

function normalizeWithdrawalStatus(value: unknown): 'Pending' | 'Approved' | 'Rejected' {
  if (typeof value !== 'string') {
    return 'Pending';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'approved') {
    return 'Approved';
  }
  if (normalized === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function normalizeTransactionType(value: unknown): 'Deposit' | 'Withdrawal' | 'Commission' {
  if (typeof value !== 'string') {
    return 'Commission';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'deposit') {
    return 'Deposit';
  }
  if (normalized === 'withdrawal') {
    return 'Withdrawal';
  }
  return 'Commission';
}

function normalizeTransactionRecord(record: any) {
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  return {
    id: typeof record?.id === 'string' && record.id ? record.id : createFinanceId('tx'),
    username: typeof record?.username === 'string' ? record.username : '',
    type: normalizeTransactionType(record?.type),
    amount: roundMoney(Number(record?.amount ?? 0)),
    status: normalizeTransactionStatus(record?.status),
    date: typeof record?.date === 'string' && record.date ? record.date : createdAt,
    txHash: typeof record?.txHash === 'string' && record.txHash ? record.txHash : '',
    method: sanitizeFinanceMethod(record?.method, 'System'),
    source: typeof record?.source === 'string' && record.source ? record.source : 'system',
    description: typeof record?.description === 'string' && record.description ? record.description : '',
    referenceId: typeof record?.referenceId === 'string' && record.referenceId ? record.referenceId : '',
    createdAt,
    updatedAt,
  };
}

function normalizeWithdrawalRecord(record: any) {
  const requestedDate = typeof record?.requestedDate === 'string' && record.requestedDate
    ? record.requestedDate
    : new Date().toISOString();

  return {
    id: typeof record?.id === 'string' && record.id ? record.id : createFinanceId('wd'),
    username: typeof record?.username === 'string' ? record.username : '',
    amount: roundMoney(Number(record?.amount ?? 0)),
    walletAddress: typeof record?.walletAddress === 'string' ? record.walletAddress : '',
    status: normalizeWithdrawalStatus(record?.status),
    requestedDate,
    method: sanitizeFinanceMethod(record?.method, 'USDT'),
    transactionId: typeof record?.transactionId === 'string' && record.transactionId ? record.transactionId : '',
    reviewedAt: typeof record?.reviewedAt === 'string' && record.reviewedAt ? record.reviewedAt : null,
    txHash: typeof record?.txHash === 'string' && record.txHash ? record.txHash : '',
    rejectionReason: typeof record?.rejectionReason === 'string' && record.rejectionReason ? record.rejectionReason : '',
    reviewerId: typeof record?.reviewerId === 'string' && record.reviewerId ? record.reviewerId : null,
    reviewerEmail: typeof record?.reviewerEmail === 'string' && record.reviewerEmail ? record.reviewerEmail : null,
  };
}

async function createTransactionRecord(input: {
  username: string;
  type: 'Deposit' | 'Withdrawal' | 'Commission';
  amount: number;
  status?: 'Pending' | 'Completed' | 'Rejected' | 'Failed';
  method?: string;
  txHash?: string;
  source?: string;
  description?: string;
  referenceId?: string;
}) {
  const timestamp = new Date().toISOString();
  const transaction = normalizeTransactionRecord({
    id: createFinanceId('tx'),
    username: input.username,
    type: input.type,
    amount: roundMoney(input.amount),
    status: input.status ?? 'Completed',
    method: input.method ?? 'System',
    txHash: input.txHash ?? '',
    source: input.source ?? 'system',
    description: input.description ?? '',
    referenceId: input.referenceId ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
    date: timestamp,
  });

  await kv.set(`${TRANSACTION_KEY_PREFIX}${transaction.id}`, transaction);
  return transaction;
}

async function listTransactionRecords(username?: string) {
  const records = await kv.getByPrefix(TRANSACTION_KEY_PREFIX);
  return records
    .map((record) => normalizeTransactionRecord(record))
    .filter((record) => !username || record.username === username)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

async function listWithdrawalRecords(username?: string) {
  const records = await kv.getByPrefix(WITHDRAWAL_KEY_PREFIX);
  return records
    .map((record) => normalizeWithdrawalRecord(record))
    .filter((record) => !username || record.username === username)
    .sort((left, right) => new Date(right.requestedDate).getTime() - new Date(left.requestedDate).getTime());
}

function defaultUserRecord(username: string) {
  return {
    username,
    vipLevel: 1,
    balance: 0,
    todayCommission: 0,
    holdAmount: 0,
    luckyBonus: 0,
    tasksCompleted: 0,
    tasksLimit: 10,
    taskSetCount: defaultRewardsConfig.productSystem.maxSetsPerDay,
    tasksPerSet: defaultRewardsConfig.productSystem.productsPerSet,
    tasksCompletedInSet: 0,
    completedTaskSets: 0,
    pendingTaskReset: false,
    taskSetCountOverride: null as number | null,
    tasksPerSetOverride: null as number | null,
    lastReset: new Date().toISOString().split('T')[0],
    isFrozen: false,
    activePremium: null,
    premiumQueue: [],
    invitationCode: null,
    invitedByCode: null,
    referralEarnings: 0,
    children: [],
    referredByAdminId: null as string | null,
    walletProfile: null as WalletProfile | null,
    createdAt: new Date().toISOString(),
  };
}

function normalizeUserRecord(userData: any, username: string) {
  const normalized = {
    ...defaultUserRecord(username),
    ...(typeof userData === 'object' && userData ? userData : {}),
  };

  normalized.username = username;
  normalized.balance = Number.isFinite(Number(normalized.balance)) ? Number(normalized.balance) : 0;
  normalized.todayCommission = Number.isFinite(Number(normalized.todayCommission)) ? Number(normalized.todayCommission) : 0;
  normalized.holdAmount = Number.isFinite(Number(normalized.holdAmount)) ? Number(normalized.holdAmount) : 0;
  normalized.luckyBonus = Number.isFinite(Number(normalized.luckyBonus)) ? Number(normalized.luckyBonus) : 0;
  normalized.tasksCompleted = Number.isFinite(Number(normalized.tasksCompleted)) ? Number(normalized.tasksCompleted) : 0;
  normalized.tasksLimit = Number.isFinite(Number(normalized.tasksLimit)) ? Number(normalized.tasksLimit) : 40;
  normalized.taskSetCountOverride = Number.isFinite(Number(normalized.taskSetCountOverride))
    ? Math.max(1, Math.round(Number(normalized.taskSetCountOverride)))
    : null;
  normalized.tasksPerSetOverride = Number.isFinite(Number(normalized.tasksPerSetOverride))
    ? Math.max(1, Math.round(Number(normalized.tasksPerSetOverride)))
    : null;
  normalized.taskSetCount = Number.isFinite(Number(normalized.taskSetCount))
    ? Math.max(1, Math.round(Number(normalized.taskSetCount)))
    : defaultRewardsConfig.productSystem.maxSetsPerDay;
  normalized.tasksPerSet = Number.isFinite(Number(normalized.tasksPerSet))
    ? Math.max(1, Math.round(Number(normalized.tasksPerSet)))
    : defaultRewardsConfig.productSystem.productsPerSet;
  normalized.tasksCompletedInSet = Number.isFinite(Number(normalized.tasksCompletedInSet))
    ? Math.max(0, Math.round(Number(normalized.tasksCompletedInSet)))
    : 0;
  normalized.completedTaskSets = Number.isFinite(Number(normalized.completedTaskSets))
    ? Math.max(0, Math.round(Number(normalized.completedTaskSets)))
    : 0;
  normalized.pendingTaskReset = Boolean(normalized.pendingTaskReset);
  normalized.referralEarnings = Number.isFinite(Number(normalized.referralEarnings)) ? Number(normalized.referralEarnings) : 0;
  normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
  normalized.referredByAdminId = typeof normalized.referredByAdminId === 'string' && normalized.referredByAdminId
    ? normalized.referredByAdminId
    : null;
  normalized.walletProfile = normalizeStoredWalletProfile(normalized.walletProfile);
  normalized.createdAt = typeof normalized.createdAt === 'string' && normalized.createdAt
    ? normalized.createdAt
    : new Date().toISOString();

  return normalized;
}

async function syncUserWithVipConfig(userData: any, username: string) {
  const normalized = normalizeUserRecord(userData, username);
  const vipConfig = await getVipConfigForLevel(Number(normalized.vipLevel ?? 1));
  const rewardsConfig = await getRewardsConfigRecord();
  const productSystem = normalizeProductSystemConfig(rewardsConfig?.productSystem);
  normalized.vipLevel = vipConfig.level;
  normalized.taskSetCount = normalized.taskSetCountOverride ?? productSystem.maxSetsPerDay;
  normalized.tasksPerSet = normalized.tasksPerSetOverride ?? productSystem.productsPerSet;
  normalized.tasksLimit = normalized.taskSetCount * normalized.tasksPerSet;
  normalized.completedTaskSets = Math.min(
    Math.max(0, normalized.completedTaskSets),
    normalized.taskSetCount,
  );
  normalized.tasksCompleted = Math.min(
    Math.max(0, normalized.tasksCompleted),
    normalized.tasksLimit,
  );

  if (normalized.completedTaskSets >= normalized.taskSetCount) {
    normalized.tasksCompletedInSet = 0;
    normalized.pendingTaskReset = false;
  } else {
    normalized.tasksCompletedInSet = Math.min(
      Math.max(0, normalized.tasksCompletedInSet),
      normalized.tasksPerSet,
    );
  }

  return normalized;
}

function buildUserTaskProgress(userData: any) {
  return {
    taskSetCount: Number(userData?.taskSetCount ?? 1),
    tasksPerSet: Number(userData?.tasksPerSet ?? 1),
    tasksCompleted: Number(userData?.tasksCompleted ?? 0),
    tasksCompletedInSet: Number(userData?.tasksCompletedInSet ?? 0),
    completedTaskSets: Number(userData?.completedTaskSets ?? 0),
    tasksLimit: Number(userData?.tasksLimit ?? 0),
    pendingTaskReset: Boolean(userData?.pendingTaskReset),
  };
}

function restoreUserToNaturalState(userData: any) {
  const restored = { ...userData };
  const currentBalance = roundMoney(Number(restored.balance ?? 0));
  const preFreezeBalance = Number.isFinite(Number(restored?.activePremium?.balanceBeforeAssignment))
    ? roundMoney(Number(restored.activePremium.balanceBeforeAssignment))
    : currentBalance;

  restored.balance = Math.max(currentBalance, preFreezeBalance);
  restored.holdAmount = 0;
  restored.isFrozen = false;

  if (restored.activePremium && typeof restored.activePremium === 'object') {
    restored.activePremium = {
      ...restored.activePremium,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }

  restored.activePremium = null;
  restored.premiumQueue = [];
  return restored;
}

async function syncUsersForVipLevel(level: number) {
  const allUsers = await kv.getByPrefix('user:');

  for (const rawUser of allUsers) {
    const username = sanitizeUsername(rawUser?.username);
    if (!username) {
      continue;
    }

    const normalizedUser = normalizeUserRecord(rawUser, username);
    if (Number(normalizedUser.vipLevel ?? 1) !== level) {
      continue;
    }

    const syncedUser = await syncUserWithVipConfig(normalizedUser, username);
    await kv.set(`user:${username}`, syncedUser);
  }
}

async function getOrCreateUserRecord(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const userKey = `user:${canonicalUsername}`;
  const userData = await kv.get(userKey);

  if (!userData) {
    const created = await syncUserWithVipConfig(defaultUserRecord(canonicalUsername), canonicalUsername);
    await kv.set(userKey, created);
    await assignUsernameLookup(canonicalUsername);
    return created;
  }

  const normalized = await syncUserWithVipConfig(userData, canonicalUsername);
  await kv.set(userKey, normalized);
  await assignUsernameLookup(canonicalUsername);
  return normalized;
}

async function ensureRootReferralUser() {
  const rootUser = await getOrCreateUserRecord(ROOT_REFERRAL_USERNAME);
  rootUser.invitationCode = ROOT_REFERRAL_INVITE_CODE;
  await kv.set(`user:${ROOT_REFERRAL_USERNAME}`, rootUser);
  await kv.set(`referral:invite:${ROOT_REFERRAL_INVITE_CODE}`, ROOT_REFERRAL_USERNAME);
}

async function creditParentReferralFromChildCommission(childUsername: string, childCommission: number) {
  if (!Number.isFinite(childCommission) || childCommission <= 0) {
    return { rewarded: false, parentReward: 0 };
  }

  const childUser = await getOrCreateUserRecord(childUsername);
  const invitedByCode = sanitizeInviteCode(childUser.invitedByCode);
  if (!invitedByCode) {
    return { rewarded: false, parentReward: 0 };
  }

  const parentUsername = await kv.get(`referral:invite:${invitedByCode}`);
  if (!parentUsername || typeof parentUsername !== 'string' || parentUsername === childUsername) {
    return { rewarded: false, parentReward: 0 };
  }

  const parentUser = await getOrCreateUserRecord(parentUsername);
  const parentReward = roundMoney(childCommission * REFERRAL_PARENT_RATE);
  if (parentReward <= 0) {
    return { rewarded: false, parentReward: 0 };
  }

  parentUser.balance = roundMoney(Number(parentUser.balance ?? 0) + parentReward);
  parentUser.referralEarnings = roundMoney(Number(parentUser.referralEarnings ?? 0) + parentReward);
  if (!parentUser.children.includes(childUsername)) {
    parentUser.children.push(childUsername);
  }

  await kv.set(`user:${parentUsername}`, parentUser);
  await kv.set(`referral:event:${Date.now()}:${childUsername}`, {
    parentUsername,
    childUsername,
    type: 'child_checkin',
    rate: REFERRAL_PARENT_RATE,
    childCommission,
    parentReward,
    createdAt: new Date().toISOString(),
  });

  await createTransactionRecord({
    username: parentUsername,
    type: 'Commission',
    amount: parentReward,
    method: 'Referral',
    source: 'referral',
    description: `Referral commission from ${childUsername}`,
    referenceId: childUsername,
  });

  return {
    rewarded: true,
    parentUsername,
    parentReward,
    parentInviteCode: invitedByCode,
  };
}

function sanitizePremiumId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Premium IDs have the form premium-<timestamp>: alphanum + hyphen, max 64 chars
  if (!/^[a-zA-Z0-9\-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeResetToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Reset tokens have the form reset_<timestamp>_<random>: alphanum + underscore
  if (!/^[a-zA-Z0-9_]{1,128}$/.test(trimmed)) return null;
  return trimmed;
}

// ── User-facing rate limiter ──────────────────────────────────────────────────
// Applied per source IP on unauthenticated mutation endpoints.
const USER_RATE_LIMIT_WINDOW_MS = 60_000;
const USER_RATE_LIMIT_MAX_REQUESTS = 30;
const FORGOT_PASSWORD_RATE_LIMIT_MAX = 5;
const userRateLimitStore = new Map<string, { count: number; resetAt: number }>();

function enforceUserRateLimit(c: any, bucket: string, maxRequests = USER_RATE_LIMIT_MAX_REQUESTS) {
  const now = Date.now();
  const forwardedFor = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown-ip';
  const source = forwardedFor.split(',')[0].trim();
  const key = `${bucket}:${source}`;

  const current = userRateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    userRateLimitStore.set(key, { count: 1, resetAt: now + USER_RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    c.header('Retry-After', String(retryAfterSeconds));
    return c.json({ error: 'Too many requests. Please retry shortly.' }, 429);
  }

  current.count += 1;
  userRateLimitStore.set(key, current);
  return null;
}

// Health check endpoint
app.get("/make-server-a1c55d7e/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/make-server-a1c55d7e/admin/users", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:list');
    if (limited) {
      return limited;
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    const users: any[] = [];
    let page = 1;
    const perPage = 200;

    while (page <= 10) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }

      const batch = Array.isArray(data?.users) ? data.users : [];
      users.push(...batch);

      if (batch.length < perPage) {
        break;
      }

      page += 1;
    }

    const adminUsers = users
      .filter((user) => hasAdminRole(user))
      .filter((user) => callerIsSuperAdmin || !isSuperAdmin(user))
      .map((user) => mapAuthUserToAdminRecord(user))
      .sort((a, b) => {
        if (a.roleName === 'Super Admin' && b.roleName !== 'Super Admin') return -1;
        if (a.roleName !== 'Super Admin' && b.roleName === 'Super Admin') return 1;
        return a.fullName.localeCompare(b.fullName);
      });

    return c.json({ users: adminUsers });
  } catch (error) {
    console.error('Admin users list error:', error);
    return c.json({ error: 'Failed to fetch admin users' }, 500);
  }
});

app.post("/make-server-a1c55d7e/admin/users", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:create');
    if (limited) {
      return limited;
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const body = await c.req.json();
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const department = typeof body?.department === 'string' ? body.department.trim() : '';
    const roleName = typeof body?.roleName === 'string' ? body.roleName.trim() : '';
    const roleColor = typeof body?.roleColor === 'string' ? body.roleColor.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const twoFactorEnabled = body?.twoFactorEnabled === true;

    if (!fullName || !username || !email || !roleName || password.length < 8) {
      return c.json({ error: 'Missing or invalid admin user fields' }, 400);
    }

    const accessRole = roleName.toLowerCase() === 'super admin' ? 'super_admin' : 'admin';
    const { data, error } = await authClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        phone,
        department,
        role_name: roleName,
        role_color: roleColor,
        two_factor_enabled: twoFactorEnabled,
      },
      app_metadata: {
        role: accessRole,
        roles: [accessRole],
        admin_role_name: roleName,
        admin_role_color: roleColor,
      },
    });

    if (error || !data?.user) {
      return c.json({ error: error?.message ?? 'Failed to create admin user' }, 400);
    }

    // Auto-generate a 5-character invitation code for this new admin
    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateAdminShortCode();
      const existing = await kv.get(`admin:invite:code:${shortCode}`);
      if (!existing) break;
      attempts += 1;
    } while (attempts < 20);

    const codeRecord = {
      code: shortCode,
      subAdminId: data.user.id,
      subAdminEmail: data.user.email ?? '',
      subAdminName: roleName,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`admin:invite:code:${shortCode}`, codeRecord);
    await kv.set(`admin:invite:by-admin:${data.user.id}`, shortCode);

    const adminRecord = mapAuthUserToAdminRecord(data.user);
    return c.json({ admin: adminRecord, invitationCode: shortCode }, 201);
  } catch (error) {
    console.error('Admin user create error:', error);
    return c.json({ error: 'Failed to create admin user' }, 500);
  }
});

app.delete("/make-server-a1c55d7e/admin/users/:adminId", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:delete');
    if (limited) {
      return limited;
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const callingAdmin = c.get('adminUser');
    const adminId = String(c.req.param('adminId') ?? '').trim();
    if (!adminId) {
      return c.json({ error: 'adminId is required' }, 400);
    }

    if (callingAdmin?.id === adminId) {
      return c.json({ error: 'You cannot delete your own admin account' }, 400);
    }

    const { data: targetData, error: targetError } = await authClient.auth.admin.getUserById(adminId);
    if (targetError || !targetData?.user) {
      return c.json({ error: 'Admin user not found' }, 404);
    }

    if (!hasAdminRole(targetData.user)) {
      return c.json({ error: 'Target user is not an admin account' }, 400);
    }

    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const targetIsSuperAdmin = isSuperAdmin(targetData.user);

    if (targetIsSuperAdmin && !callerIsSuperAdmin) {
      return c.json({ error: 'Only a super-admin can delete a super-admin account' }, 403);
    }

    if (targetIsSuperAdmin) {
      const users: any[] = [];
      let page = 1;
      const perPage = 200;
      while (page <= 10) {
        const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
        if (error) {
          throw error;
        }
        const batch = Array.isArray(data?.users) ? data.users : [];
        users.push(...batch);
        if (batch.length < perPage) {
          break;
        }
        page += 1;
      }

      const superAdminCount = users.filter((user) => hasAdminRole(user) && isSuperAdmin(user)).length;
      if (superAdminCount <= 1) {
        return c.json({ error: 'Cannot delete the last remaining super-admin account' }, 400);
      }
    }

    const { error: deleteError } = await authClient.auth.admin.deleteUser(adminId);
    if (deleteError) {
      return c.json({ error: deleteError.message ?? 'Failed to delete admin user' }, 400);
    }

    const adminInviteKey = `admin:invite:by-admin:${adminId}`;
    const existingCode = await kv.get(adminInviteKey);
    if (typeof existingCode === 'string' && existingCode) {
      await kv.del(`admin:invite:code:${existingCode}`);
    }
    await kv.del(adminInviteKey);

    return c.json({ success: true, deletedAdminId: adminId });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return c.json({ error: 'Failed to delete admin user' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/referrals/overview', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-referrals:overview');
    if (limited) {
      return limited;
    }

    const allUsers = await kv.getByPrefix('user:');
    const referralUsers = allUsers
      .map((raw) => normalizeUserRecord(raw, String(raw?.username ?? '')))
      .filter((user) => Boolean(user.username));

    const rows = referralUsers
      .filter((user) => user.invitationCode || user.invitedByCode || Number(user.referralEarnings ?? 0) > 0 || (Array.isArray(user.children) && user.children.length > 0))
      .map((user) => {
        const parentCode = sanitizeInviteCode(user.invitedByCode);
        return {
          username: user.username,
          invitationCode: user.invitationCode,
          invitedByCode: parentCode,
          parentUsername: parentCode ? (referralUsers.find((candidate) => candidate.invitationCode === parentCode)?.username ?? null) : null,
          referralEarnings: roundMoney(Number(user.referralEarnings ?? 0)),
          childrenCount: Array.isArray(user.children) ? user.children.length : 0,
          children: Array.isArray(user.children) ? user.children : [],
          balance: roundMoney(Number(user.balance ?? 0)),
        };
      })
      .sort((a, b) => b.referralEarnings - a.referralEarnings);

    const events = (await kv.getByPrefix('referral:event:'))
      .map((event) => ({
        parentUsername: event?.parentUsername ?? null,
        childUsername: event?.childUsername ?? null,
        type: event?.type ?? 'child_checkin',
        childCommission: roundMoney(Number(event?.childCommission ?? 0)),
        parentReward: roundMoney(Number(event?.parentReward ?? 0)),
        rate: Number(event?.rate ?? REFERRAL_PARENT_RATE),
        createdAt: typeof event?.createdAt === 'string' ? event.createdAt : new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    const totalReferralEarnings = roundMoney(rows.reduce((sum, row) => sum + row.referralEarnings, 0));
    const totalParentRewards = roundMoney(events.reduce((sum, event) => sum + event.parentReward, 0));

    return c.json({
      rows,
      events,
      summary: {
        totalReferralUsers: rows.length,
        totalReferralEarnings,
        totalParentRewards,
        referralRate: REFERRAL_PARENT_RATE,
      },
    });
  } catch (error) {
    console.error('Admin referral overview error:', error);
    return c.json({ error: 'Failed to fetch referral overview' }, 500);
  }
});

app.get('/make-server-a1c55d7e/referrals/:username/summary', async (c) => {
  try {
    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const canonicalUsername = (await resolveCanonicalUsername(requestedUsername)) ?? requestedUsername;
    const user = await getOrCreateUserRecord(canonicalUsername);
    await assignUsernameLookup(canonicalUsername);

    const parentCode = sanitizeInviteCode((user as any).invitedByCode);
    let parentUsername: string | null = null;
    if (parentCode) {
      const lookup = await kv.get(`referral:invite:${parentCode}`);
      parentUsername = typeof lookup === 'string' && lookup ? lookup : null;
    }

    const referralEvents = (await kv.getByPrefix('referral:event:'))
      .map((event) => ({
        parentUsername: typeof event?.parentUsername === 'string' ? event.parentUsername : null,
        childUsername: typeof event?.childUsername === 'string' ? event.childUsername : null,
        type: typeof event?.type === 'string' && event.type ? event.type : 'child_checkin',
        childCommission: roundMoney(Number(event?.childCommission ?? 0)),
        parentReward: roundMoney(Number(event?.parentReward ?? 0)),
        rate: Number(event?.rate ?? REFERRAL_PARENT_RATE),
        createdAt: typeof event?.createdAt === 'string' ? event.createdAt : new Date().toISOString(),
      }))
      .filter((event) => event.parentUsername === canonicalUsername || event.childUsername === canonicalUsername)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    const children = Array.isArray((user as any).children) ? (user as any).children : [];
    const referralEarnings = roundMoney(Number((user as any).referralEarnings ?? 0));

    return c.json({
      username: canonicalUsername,
      invitationCode: typeof (user as any).invitationCode === 'string' ? (user as any).invitationCode : null,
      invitedByCode: parentCode,
      parentUsername,
      referralRate: REFERRAL_PARENT_RATE,
      referralEarnings,
      childrenCount: children.length,
      children,
      recentEvents: referralEvents,
      summary: {
        totalReferralEarnings: referralEarnings,
        totalParentRewardsReceived: roundMoney(
          referralEvents
            .filter((event) => event.parentUsername === canonicalUsername)
            .reduce((sum, event) => sum + event.parentReward, 0),
        ),
        totalChildCommissionsObserved: roundMoney(
          referralEvents
            .filter((event) => event.parentUsername === canonicalUsername)
            .reduce((sum, event) => sum + event.childCommission, 0),
        ),
      },
    });
  } catch (error) {
    console.error('Referral summary error:', error);
    return c.json({ error: 'Failed to fetch referral summary' }, 500);
  }
});

// Get user data endpoint
app.get("/make-server-a1c55d7e/user/:username", async (c) => {
  try {
    const requestedUsername = sanitizeUsername(c.req.param("username"));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }
    const canonicalUsername = (await resolveCanonicalUsername(requestedUsername)) ?? requestedUsername;
    const userKey = `user:${canonicalUsername}`;

    const normalizedUserData = await getOrCreateUserRecord(canonicalUsername);
    await assignUsernameLookup(canonicalUsername);
    
    // Check if we need to reset daily tasks
    const today = new Date().toISOString().split('T')[0];
    if (normalizedUserData.lastReset !== today) {
      normalizedUserData.tasksCompleted = 0;
      normalizedUserData.tasksCompletedInSet = 0;
      normalizedUserData.completedTaskSets = 0;
      normalizedUserData.pendingTaskReset = false;
      normalizedUserData.todayCommission = 0;
      normalizedUserData.lastReset = today;
      await kv.set(userKey, normalizedUserData);
    }

    return c.json(normalizedUserData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.json({ error: 'Failed to fetch user data' }, 500);
  }
});

app.get('/make-server-a1c55d7e/wallet/:username', async (c) => {
  try {
    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const canonicalUsername = (await resolveCanonicalUsername(requestedUsername)) ?? requestedUsername;
    const userData = await getOrCreateUserRecord(canonicalUsername);
    await assignUsernameLookup(canonicalUsername);

    return c.json({
      username: canonicalUsername,
      walletProfile: normalizeStoredWalletProfile((userData as any).walletProfile),
    });
  } catch (error) {
    console.error('Error fetching wallet profile:', error);
    return c.json({ error: 'Failed to fetch wallet profile' }, 500);
  }
});

app.put('/make-server-a1c55d7e/wallet/:username', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:wallet-profile', 20);
    if (rateLimited) return rateLimited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const body = await c.req.json();
    const parsed = parseWalletProfileInput(body);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const canonicalUsername = (await resolveCanonicalUsername(requestedUsername)) ?? requestedUsername;
    const userData = await getOrCreateUserRecord(canonicalUsername);
    const normalizedUserData = await syncUserWithVipConfig(userData, canonicalUsername);
    normalizedUserData.walletProfile = parsed.walletProfile;

    await kv.set(`user:${canonicalUsername}`, normalizedUserData);
    await assignUsernameLookup(canonicalUsername);

    return c.json({
      success: true,
      username: canonicalUsername,
      walletProfile: parsed.walletProfile,
    });
  } catch (error) {
    console.error('Error saving wallet profile:', error);
    return c.json({ error: 'Failed to save wallet profile' }, 500);
  }
});

// Link referral identity for a user (username -> invitation code and parent invite code)
// Also accepts optional loginPassword / transactionPassword to store server-side hashed credentials.
app.post('/make-server-a1c55d7e/referral/link-user', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:referral-link');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body.username);
    const invitationCode = sanitizeInviteCode(body.invitationCode);
    const parentInviteCode = sanitizeInviteCode(body.parentInviteCode);
    const rawLoginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : null;
    const rawTransactionPassword = typeof body.transactionPassword === 'string' ? body.transactionPassword : null;

    if (!username || !invitationCode || !parentInviteCode) {
      return c.json({ error: 'username, invitationCode and parentInviteCode are required' }, 400);
    }

    await ensureRootReferralUser();

    const existingOwner = await kv.get(`referral:invite:${invitationCode}`);
    if (existingOwner && typeof existingOwner === 'string' && existingOwner.toLowerCase() !== username.toLowerCase()) {
      return c.json({ error: 'Invitation code already belongs to another user' }, 409);
    }

    const parentUsernameRaw = await kv.get(`referral:invite:${parentInviteCode}`);
    if (!parentUsernameRaw || typeof parentUsernameRaw !== 'string') {
      return c.json({ error: 'Parent invitation code not found' }, 404);
    }

    const parentUsername = parentUsernameRaw;
    const userData = await getOrCreateUserRecord(username);
    const canonicalUsername = String(userData.username ?? username);
    userData.invitationCode = invitationCode;
    userData.invitedByCode = parentInviteCode;

    // Store hashed credentials if provided so server-side login works cross-domain
    if (rawLoginPassword && rawLoginPassword.length >= 6) {
      userData.password = await hashPassword(rawLoginPassword);
    }
    if (rawTransactionPassword && rawTransactionPassword.length >= 6) {
      userData.transactionPassword = await hashPassword(rawTransactionPassword);
    }

    await kv.set(`user:${canonicalUsername}`, userData);
    await assignUsernameLookup(canonicalUsername);
    await kv.set(`referral:invite:${invitationCode}`, canonicalUsername);

    const parentData = await getOrCreateUserRecord(parentUsername);
    if (!parentData.children.includes(canonicalUsername)) {
      parentData.children.push(canonicalUsername);
      await kv.set(`user:${parentUsername}`, parentData);
    }

    return c.json({
      success: true,
      username: canonicalUsername,
      invitationCode,
      parentInviteCode,
      parentUsername,
      referralRate: REFERRAL_PARENT_RATE,
    });
  } catch (error) {
    console.error('Error linking referral user:', error);
    return c.json({ error: 'Failed to link referral user' }, 500);
  }
});

// ==================== USER AUTH ENDPOINTS ====================

// Login rate limit: max 10 attempts per IP per minute to prevent brute-force
const LOGIN_RATE_LIMIT_MAX = 10;
const USER_SESSION_PREFIX = 'user-session:';
const USER_SESSION_COOKIE_NAME = 'steadfast_user_session';
const USER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type UserSessionRecord = {
  sessionId: string;
  username: string;
  mustChangePassword: boolean;
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
};

function parseCookies(headerValue: string | null | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const item of headerValue.split(';')) {
    const [rawKey, ...rawValueParts] = item.trim().split('=');
    if (!rawKey) {
      continue;
    }
    const key = rawKey.trim();
    const value = rawValueParts.join('=').trim();
    if (!key) {
      continue;
    }
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function buildSessionCookieValue(sessionId: string, maxAgeSeconds = USER_SESSION_MAX_AGE_SECONDS): string {
  return `${USER_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=None`;
}

function buildSessionClearCookieValue(): string {
  return `${USER_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}

async function createUserSession(username: string, mustChangePassword: boolean): Promise<UserSessionRecord> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + USER_SESSION_MAX_AGE_SECONDS * 1000);
  const record: UserSessionRecord = {
    sessionId,
    username,
    mustChangePassword,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: now.toISOString(),
  };

  await kv.set(`${USER_SESSION_PREFIX}${sessionId}`, record);
  return record;
}

async function revokeUserSession(sessionId: string): Promise<void> {
  const key = `${USER_SESSION_PREFIX}${sessionId}`;
  const existing = await kv.get(key);
  if (!existing) {
    return;
  }

  const now = new Date().toISOString();
  await kv.set(key, {
    ...existing,
    revokedAt: now,
    lastSeenAt: now,
  });
}

async function getValidSessionById(sessionId: string): Promise<UserSessionRecord | null> {
  if (!sessionId) {
    return null;
  }

  const raw = await kv.get(`${USER_SESSION_PREFIX}${sessionId}`);
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const session = raw as UserSessionRecord;
  if (session.revokedAt) {
    return null;
  }

  const expiresAtMs = Date.parse(String(session.expiresAt ?? ''));
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return null;
  }

  const canonicalUsername = await resolveCanonicalUsername(String(session.username ?? ''));
  if (!canonicalUsername) {
    return null;
  }

  if (canonicalUsername !== session.username) {
    session.username = canonicalUsername;
  }

  const userData = await kv.get(`user:${canonicalUsername}`);
  session.mustChangePassword = Boolean((userData as any)?.mustChangePassword);
  session.lastSeenAt = new Date().toISOString();
  await kv.set(`${USER_SESSION_PREFIX}${sessionId}`, session);
  return session;
}

async function getSessionFromRequest(c: any): Promise<UserSessionRecord | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const sessionId = cookies[USER_SESSION_COOKIE_NAME] ?? '';
  return getValidSessionById(sessionId);
}

async function getUniqueReferralInviteCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 50) {
    const code = generateUserInviteCode();
    const existing = await kv.get(`referral:invite:${code}`);
    if (!existing) {
      return code;
    }
    attempts += 1;
  }
  throw new Error('Unable to generate unique invitation code');
}

// POST /auth/signup — creates a persistent user account in KV and referral graph.
app.post('/make-server-a1c55d7e/auth/signup', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:signup', 10);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body.username);
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const gender = typeof body.gender === 'string' ? body.gender.trim() : 'unknown';
    const loginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : '';
    const transactionPassword = typeof body.transactionPassword === 'string' ? body.transactionPassword : '';
    const rawInviteCode = typeof body.invitationCode === 'string' ? body.invitationCode : '';
    const explicitAdminInviteCode = sanitizeAdminInviteCode(body.adminInviteCode);

    if (!username || !phone || loginPassword.length < 6 || transactionPassword.length < 6) {
      return c.json({ error: 'username, phone, loginPassword and transactionPassword are required' }, 400);
    }

    await ensureRootReferralUser();

    const existingCanonical = await resolveCanonicalUsername(username);
    if (existingCanonical) {
      return c.json({ error: 'Username already exists.' }, 409);
    }

    const normalizedInputCode = rawInviteCode.trim().toUpperCase();
    const inviteCodeAsReferral = sanitizeInviteCode(normalizedInputCode);
    const inviteCodeAsAdmin = sanitizeAdminInviteCode(normalizedInputCode);

    let parentInviteCode: string | null = null;
    let effectiveAdminInviteCode = explicitAdminInviteCode;

    if (inviteCodeAsReferral) {
      const referralOwner = await kv.get(`referral:invite:${inviteCodeAsReferral}`);
      if (referralOwner && typeof referralOwner === 'string') {
        parentInviteCode = inviteCodeAsReferral;
      }
    }

    // If invite code is not a valid referral owner but is a valid admin code,
    // treat it as admin invite and use the system root as referral parent.
    if (!parentInviteCode && inviteCodeAsAdmin) {
      parentInviteCode = ROOT_REFERRAL_INVITE_CODE;
      effectiveAdminInviteCode = inviteCodeAsAdmin;
    }

    if (!parentInviteCode) {
      return c.json({ error: 'Invitation code not found. Please check and try again.' }, 404);
    }

    const parentUsernameRaw = await kv.get(`referral:invite:${parentInviteCode}`);
    if (!parentUsernameRaw || typeof parentUsernameRaw !== 'string') {
      return c.json({ error: 'Invitation code not found. Please check and try again.' }, 404);
    }

    if (effectiveAdminInviteCode) {
      const adminRecord = await kv.get(`admin:invite:code:${effectiveAdminInviteCode}`);
      if (!adminRecord || typeof adminRecord.subAdminId !== 'string') {
        return c.json({ error: 'Admin invitation code is not valid.' }, 404);
      }
    }

    const generatedInviteCode = await getUniqueReferralInviteCode();
    const userData = await syncUserWithVipConfig(defaultUserRecord(username), username);
    userData.phone = phone;
    userData.gender = gender;
    userData.invitationCode = generatedInviteCode;
    userData.invitedByCode = parentInviteCode;
    userData.password = await hashPassword(loginPassword);
    userData.transactionPassword = await hashPassword(transactionPassword);
    userData.mustChangePassword = false;
    userData.passwordUpdatedAt = new Date().toISOString();

    if (effectiveAdminInviteCode) {
      const adminRecord = await kv.get(`admin:invite:code:${effectiveAdminInviteCode}`);
      if (adminRecord && typeof adminRecord.subAdminId === 'string') {
        userData.referredByAdminId = adminRecord.subAdminId;
        adminRecord.usageCount = (typeof adminRecord.usageCount === 'number' ? adminRecord.usageCount : 0) + 1;
        await kv.set(`admin:invite:code:${effectiveAdminInviteCode}`, adminRecord);
      }
    }

    await kv.set(`user:${username}`, userData);
    await assignUsernameLookup(username);
    await kv.set(`referral:invite:${generatedInviteCode}`, username);

    const parentUsername = parentUsernameRaw;
    const parentData = await getOrCreateUserRecord(parentUsername);
    if (!Array.isArray(parentData.children)) {
      parentData.children = [];
    }
    if (!parentData.children.includes(username)) {
      parentData.children.push(username);
    }
    const parentReward = roundMoney(100 * REFERRAL_PARENT_RATE);
    parentData.balance = roundMoney(Number(parentData.balance ?? 0) + parentReward);
    parentData.referralEarnings = roundMoney(Number(parentData.referralEarnings ?? 0) + parentReward);
    await kv.set(`user:${parentUsername}`, parentData);

    return c.json({
      ok: true,
      user: {
        username,
        invitationCode: generatedInviteCode,
      },
      parentReward,
      referralRate: REFERRAL_PARENT_RATE,
    });
  } catch (error) {
    console.error('Error during user signup:', error);
    return c.json({ error: 'Signup failed. Please try again.' }, 500);
  }
});

// POST /auth/login — verifies username + loginPassword and creates server-backed session.
app.post('/make-server-a1c55d7e/auth/login', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:login', LOGIN_RATE_LIMIT_MAX);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body.username);
    const loginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : '';

    if (!username || !loginPassword) {
      return c.json({ error: 'username and loginPassword are required' }, 400);
    }

    const canonicalUsername = await resolveCanonicalUsername(username);
    if (!canonicalUsername) {
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const userKey = `user:${canonicalUsername}`;
    const userData = await kv.get(userKey);

    if (!userData) {
      // Use generic message to avoid username enumeration
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const storedPassword = (userData as any).password;
    if (!storedPassword) {
      return c.json({ error: 'Account credentials not set up for server login. Please contact support.' }, 401);
    }

    const valid = await verifyPassword(loginPassword, storedPassword);
    if (!valid) {
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const mustChangePassword = Boolean((userData as any).mustChangePassword);
    const session = await createUserSession(canonicalUsername, mustChangePassword);
    c.header('Set-Cookie', buildSessionCookieValue(session.sessionId));

    return c.json({
      ok: true,
      username: canonicalUsername,
      mustChangePassword,
    });
  } catch (error) {
    console.error('Error during user login:', error);
    return c.json({ error: 'Login failed. Please try again.' }, 500);
  }
});

// POST /auth/session/restore — validates the cookie-backed session and restores auth state.
app.post('/make-server-a1c55d7e/auth/session/restore', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:session-restore');
    if (rateLimited) return rateLimited;

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userData = await kv.get(`user:${session.username}`);
    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: Boolean((userData as any)?.mustChangePassword),
    });
  } catch (error) {
    console.error('Error restoring user session:', error);
    return c.json({ error: 'Session restore failed' }, 500);
  }
});

// Keep backward compatibility for clients still calling /auth/verify-token.
app.post('/make-server-a1c55d7e/auth/verify-token', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:verify-token');
    if (rateLimited) return rateLimited;

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userData = await kv.get(`user:${session.username}`);
    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: Boolean((userData as any)?.mustChangePassword),
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return c.json({ error: 'Session verification failed' }, 500);
  }
});

// POST /auth/session/logout — revokes the current cookie-backed session.
app.post('/make-server-a1c55d7e/auth/session/logout', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:session-logout');
    if (rateLimited) return rateLimited;

    const cookies = parseCookies(c.req.header('cookie'));
    const sessionId = cookies[USER_SESSION_COOKIE_NAME] ?? '';
    if (sessionId) {
      await revokeUserSession(sessionId);
    }

    c.header('Set-Cookie', buildSessionClearCookieValue());
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error logging out user session:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// Submit task endpoint
app.post("/make-server-a1c55d7e/submit-task", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:submit-task');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const forbiddenFinancialFields = getForbiddenClientFinancialFields(body);
    if (forbiddenFinancialFields.length > 0) {
      return c.json({
        error: 'Client-side financial mutation fields are not allowed',
        fields: forbiddenFinancialFields,
      }, 400);
    }

    const requestedTaskId = sanitizeTaskId(body?.taskId);
    const requestedProductPrice = typeof body?.productPrice === 'number' ? body.productPrice : Number(body?.productPrice);
    const username = sanitizeUsername(body.username);

    if (!username) {
      return c.json({ error: 'Invalid or missing username' }, 400);
    }

    const taskCatalog = await listTaskCatalogRecords(false);
    let selectedTask = requestedTaskId
      ? taskCatalog.find((task) => task.id === requestedTaskId)
      : null;

    if (!selectedTask && Number.isFinite(requestedProductPrice) && requestedProductPrice > 0) {
      selectedTask = taskCatalog.find((task) => task.price === roundMoney(requestedProductPrice) && task.status === 'Active')
        ?? taskCatalog.find((task) => task.status === 'Active')
        ?? null;
    }

    if (!selectedTask) {
      return c.json({ error: 'No active task available' }, 400);
    }
    if (selectedTask.status !== 'Active') {
      return c.json({ error: 'Selected task is not active' }, 400);
    }

    const productPrice = roundMoney(selectedTask.price);
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const normalizedUserData = await syncUserWithVipConfig(userData, username);

    if (normalizedUserData.pendingTaskReset) {
      await kv.set(userKey, normalizedUserData);
      return c.json({
        error: 'Current task set is complete. An admin must reset the next set before you can continue.',
        code: 'task_set_reset_required',
        disableSubmit: true,
        taskProgress: buildUserTaskProgress(normalizedUserData),
        user: normalizedUserData,
      }, 409);
    }

    if (userHasPendingPremiumRequirement(normalizedUserData)) {
      await kv.set(userKey, normalizedUserData);
      return c.json({
        error: 'Premium task requirement pending. Please top up your account before submitting the next task.',
        code: 'premium_task_encountered',
        disableSubmit: true,
        premiumRequirement: buildPremiumRequirementResponse(normalizedUserData.activePremium),
        user: normalizedUserData,
      }, 409);
    }

    // Check if user has reached daily task limit
    if (normalizedUserData.tasksCompleted >= normalizedUserData.tasksLimit) {
      return c.json({ error: 'Daily task limit reached' }, 400);
    }

    const rewardsConfig = await getRewardsConfigRecord();
    const productSystem = normalizeProductSystemConfig(rewardsConfig?.productSystem);
    const nextSubmissionNumber = Number(normalizedUserData.tasksCompleted ?? 0) + 1;
    const shouldTriggerPremium = productSystem.premiumEnabled
      && nextSubmissionNumber === productSystem.premiumTriggerTaskNumber;

    if (shouldTriggerPremium) {
      const premiumValue = computePremiumValueForVip(Number(normalizedUserData.vipLevel ?? 1), productSystem);
      const balanceBeforeAssignment = roundMoney(Number(normalizedUserData.balance ?? 0));
      const balanceAfterAssignment = roundMoney(balanceBeforeAssignment - premiumValue);
      const topUpRequired = Math.max(0, roundMoney(-balanceAfterAssignment));
      const activePremium = {
        id: `premium-rule-${Date.now()}`,
        premiumProductValue: premiumValue,
        premiumProductName: `Rule Premium (Task #${nextSubmissionNumber})`,
        bundledProducts: [],
        totalBundleValue: premiumValue,
        balanceBeforeAssignment,
        balanceAfterAssignment,
        negativeAmount: topUpRequired,
        topUpRequired,
        triggerTaskNumber: nextSubmissionNumber,
        vipLevel: Number(normalizedUserData.vipLevel ?? 1),
        valueMode: productSystem.premiumValueMode,
        tasksCompleted: 0,
        totalTasks: 1,
        assignedAt: new Date().toISOString(),
        assignedBy: 'system-rule-engine',
        status: topUpRequired > 0 ? 'awaiting_funds' : 'active',
        commissionEarned: 0,
      };

      normalizedUserData.isFrozen = true;
      normalizedUserData.activePremium = activePremium;
      normalizedUserData.premiumQueue = Array.isArray(normalizedUserData.premiumQueue)
        ? [activePremium, ...normalizedUserData.premiumQueue]
        : [activePremium];
      normalizedUserData.balance = balanceAfterAssignment;
      normalizedUserData.holdAmount = roundMoney(Math.max(Number(normalizedUserData.holdAmount ?? 0), topUpRequired));

      await kv.set(userKey, normalizedUserData);
      await kv.set(`premium:${username}:${activePremium.id}`, activePremium);

      return c.json({
        error: 'Premium task encountered. Top-up is required before continuing task submission.',
        code: 'premium_task_encountered',
        disableSubmit: true,
        premiumRequirement: buildPremiumRequirementResponse(activePremium),
        user: normalizedUserData,
      }, 409);
    }
    
    const vipConfig = await getVipConfigForLevel(normalizedUserData.vipLevel);
    normalizedUserData.tasksLimit = vipConfig.dailyTasks;
    const commissionRate = vipConfig.commission;
    const commission = roundMoney(productPrice * commissionRate);
    
    // REMOVED: Random premium chance - premium is ADMIN-ONLY now
    
    // Update user data
    normalizedUserData.tasksCompleted += 1;
    normalizedUserData.tasksCompletedInSet += 1;
    normalizedUserData.todayCommission = roundMoney(normalizedUserData.todayCommission + commission);
    normalizedUserData.balance = roundMoney(normalizedUserData.balance + commission);  // Only commission is added to balance

    if (
      normalizedUserData.tasksCompletedInSet >= normalizedUserData.tasksPerSet
      && normalizedUserData.tasksCompleted < normalizedUserData.tasksLimit
    ) {
      normalizedUserData.pendingTaskReset = true;
    }
    
    // Random lucky bonus (1% chance)
    if (Math.random() < 0.01) {
      const luckyAmount = Math.floor(Math.random() * 100) + 50; // $50-$150
      normalizedUserData.luckyBonus = roundMoney(normalizedUserData.luckyBonus + luckyAmount);
      normalizedUserData.balance = roundMoney(normalizedUserData.balance + luckyAmount);

      await createTransactionRecord({
        username,
        type: 'Commission',
        amount: luckyAmount,
        method: 'Lucky Bonus',
        source: 'lucky_bonus',
        description: 'Lucky bonus reward',
      });
    }

    const referralPayout = await creditParentReferralFromChildCommission(username, commission);
    
    await kv.set(userKey, normalizedUserData);
    
    // Save task record
    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      taskId: selectedTask.id,
      username,
      productPrice,
      commission,
      isPremium: false,  // Regular tasks are never premium
      merchant: selectedTask.merchant,
      productName: selectedTask.product,
      image: selectedTask.image,
      rating: selectedTask.rating,
      productUrl: selectedTask.productUrl,
      timestamp: new Date().toISOString(),
      tasksCompleted: normalizedUserData.tasksCompleted,
    };
    await kv.set(taskKey, taskRecord);

    await createTransactionRecord({
      username,
      type: 'Commission',
      amount: commission,
      method: 'System',
      source: 'task',
      description: 'Task commission credited',
      referenceId: taskKey,
    });
    
    return c.json({
      success: true,
      commission,
      isPremium: false,
      tasksCompleted: normalizedUserData.tasksCompleted,
      tasksLimit: normalizedUserData.tasksLimit,
      balance: normalizedUserData.balance,
      todayCommission: normalizedUserData.todayCommission,
      luckyBonus: normalizedUserData.luckyBonus,
      parentReferralCommission: referralPayout.rewarded ? referralPayout.parentReward : 0,
      parentReferralUsername: referralPayout.rewarded ? referralPayout.parentUsername : null,
      taskProgress: buildUserTaskProgress(normalizedUserData),
      task: selectedTask,
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    return c.json({ error: 'Failed to submit task' }, 500);
  }
});

// Get task records endpoint
app.get("/make-server-a1c55d7e/tasks/:username", async (c) => {
  try {
    const username = sanitizeUsername(c.req.param("username"));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    if (username === 'catalog') {
      const includePaused = c.req.query('includePaused') === 'true';
      const tasks = await listTaskCatalogRecords(includePaused);
      return c.json({ tasks });
    }

    const taskPrefix = `task:${username}:`;
    
    const tasks = await kv.getByPrefix(taskPrefix);
    
    // Sort by timestamp descending
    const sortedTasks = tasks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json(sortedTasks);
  } catch (error) {
    console.error('Error fetching task records:', error);
    return c.json({ error: 'Failed to fetch task records' }, 500);
  }
});

app.get('/make-server-a1c55d7e/tasks/catalog', async (c) => {
  try {
    const includePaused = c.req.query('includePaused') === 'true';
    const tasks = await listTaskCatalogRecords(includePaused);
    const rewardsConfig = await getRewardsConfigRecord();
    const productSystem = normalizeProductSystemConfig(rewardsConfig?.productSystem);
    return c.json({
      tasks,
      ruleConfig: {
        premiumEnabled: productSystem.premiumEnabled,
        premiumTriggerTaskNumber: productSystem.premiumTriggerTaskNumber,
        premiumValueMode: productSystem.premiumValueMode,
      },
    });
  } catch (error) {
    console.error('Error fetching task catalog:', error);
    return c.json({ error: 'Failed to fetch task catalog' }, 500);
  }
});

app.get('/make-server-a1c55d7e/vip-config', async (c) => {
  try {
    const tiers = await listVipConfigRecords();
    return c.json({ tiers });
  } catch (error) {
    console.error('Error fetching VIP config:', error);
    return c.json({ error: 'Failed to fetch VIP config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/rewards-config', async (c) => {
  try {
    const config = await getRewardsConfigRecord();
    return c.json({ config });
  } catch (error) {
    console.error('Error fetching rewards config:', error);
    return c.json({ error: 'Failed to fetch rewards config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/transactions/:username', async (c) => {
  try {
    const username = sanitizeUsername(c.req.param('username'));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const transactions = await listTransactionRecords(username);
    return c.json(transactions);
  } catch (error) {
    console.error('Error fetching transaction records:', error);
    return c.json({ error: 'Failed to fetch transaction records' }, 500);
  }
});

app.get('/make-server-a1c55d7e/withdrawals/:username', async (c) => {
  try {
    const username = sanitizeUsername(c.req.param('username'));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const withdrawals = await listWithdrawalRecords(username);
    return c.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawal records:', error);
    return c.json({ error: 'Failed to fetch withdrawal records' }, 500);
  }
});

app.post('/make-server-a1c55d7e/withdrawals/request', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:withdrawal-request');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const forbiddenFinancialFields = getForbiddenClientFinancialFields(body);
    if (forbiddenFinancialFields.length > 0) {
      return c.json({
        error: 'Client-side financial mutation fields are not allowed',
        fields: forbiddenFinancialFields,
      }, 400);
    }

    const username = sanitizeUsername(body?.username);
    const walletAddress = sanitizeWalletAddress(body?.walletAddress);
    const method = sanitizeFinanceMethod(body?.method, 'USDT');
    const amount = roundMoney(Number(body?.amount ?? 0));
    const transactionPassword = typeof body?.transactionPassword === 'string' ? body.transactionPassword : '';
    const idempotencyKey = resolveRequestIdempotencyKey(c, body);

    if (!username || !walletAddress) {
      return c.json({ error: 'username and walletAddress are required' }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: 'Withdrawal amount must be greater than 0' }, 400);
    }
    if (!transactionPassword) {
      return c.json({ error: 'transactionPassword is required' }, 400);
    }

    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUserData = await syncUserWithVipConfig(userData, username);
    const storedTransactionPassword = String((normalizedUserData as any).transactionPassword ?? '');
    if (!storedTransactionPassword || !await verifyPassword(transactionPassword, storedTransactionPassword)) {
      return c.json({ error: 'Transaction password is incorrect.' }, 401);
    }

    if (idempotencyKey) {
      const idempotencyStorageKey = `withdrawal-idempotency:${username}:${idempotencyKey}`;
      const existingRecord = await kv.get(idempotencyStorageKey) as any;
      const signature = `${amount}|${walletAddress}|${method}`;
      if (existingRecord && typeof existingRecord === 'object') {
        const previousSignature = typeof existingRecord.signature === 'string' ? existingRecord.signature : '';
        if (previousSignature && previousSignature !== signature) {
          return c.json({ error: 'Idempotency key has already been used with a different payload.' }, 409);
        }

        const existingWithdrawalId = typeof existingRecord.withdrawalId === 'string' ? existingRecord.withdrawalId : '';
        if (existingWithdrawalId) {
          const existingWithdrawal = await kv.get(`${WITHDRAWAL_KEY_PREFIX}${existingWithdrawalId}`);
          if (existingWithdrawal) {
            const normalizedExistingWithdrawal = normalizeWithdrawalRecord(existingWithdrawal);
            return c.json({
              success: true,
              idempotentReplay: true,
              withdrawal: normalizedExistingWithdrawal,
              balance: normalizedUserData.balance,
              holdAmount: normalizedUserData.holdAmount,
              availableAmount: roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount),
            });
          }
        }
      }
    }

    const availableAmount = roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount);
    if (amount > availableAmount) {
      return c.json({ error: 'Withdrawal amount exceeds available balance' }, 400);
    }

    const transaction = await createTransactionRecord({
      username,
      type: 'Withdrawal',
      amount,
      status: 'Pending',
      method,
      source: 'withdrawal_request',
      description: 'Withdrawal request submitted',
    });

    const withdrawal = normalizeWithdrawalRecord({
      id: createFinanceId('wd'),
      username,
      amount,
      walletAddress,
      method,
      status: 'Pending',
      requestedDate: new Date().toISOString(),
      transactionId: transaction.id,
      txHash: '',
    });

    normalizedUserData.holdAmount = roundMoney(normalizedUserData.holdAmount + amount);

    await kv.set(userKey, normalizedUserData);
    await kv.set(`${WITHDRAWAL_KEY_PREFIX}${withdrawal.id}`, withdrawal);
    if (idempotencyKey) {
      await kv.set(`withdrawal-idempotency:${username}:${idempotencyKey}`, {
        withdrawalId: withdrawal.id,
        transactionId: transaction.id,
        signature: `${amount}|${walletAddress}|${method}`,
        createdAt: new Date().toISOString(),
      });
    }

    return c.json({
      success: true,
      withdrawal,
      balance: normalizedUserData.balance,
      holdAmount: normalizedUserData.holdAmount,
      availableAmount: roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount),
    });
  } catch (error) {
    console.error('Error submitting withdrawal request:', error);
    return c.json({ error: 'Failed to submit withdrawal request' }, 500);
  }
});

// Product catalog (highest value products for bundling)
const productCatalog = [
  { id: 1, name: 'Premium Wireless Headphones', price: 299.99, rating: 4.5, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop' },
  { id: 2, name: 'Smart Watch Pro', price: 399.00, rating: 4.2, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop' },
  { id: 3, name: '10-inch Tablet', price: 549.99, rating: 4.1, image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop' },
];

// Admin assigns premium bundle to user
app.post("/make-server-a1c55d7e/admin/assign-premium-bundle", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:assign-premium-bundle');
    if (rateLimited) {
      return rateLimited;
    }

    const { username, premiumProductValue, bundledProductCount } = await c.req.json();
    const adminUser = c.get('adminUser');
    const adminUsername = adminUser?.email ?? adminUser?.id ?? 'admin';

    if (!username || !premiumProductValue || !bundledProductCount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (![1, 2, 3].includes(bundledProductCount)) {
      return c.json({ error: 'Bundled product count must be 1, 2, or 3' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Select highest value products for bundling
    const sortedProducts = [...productCatalog].sort((a, b) => b.price - a.price);
    const bundledProducts = sortedProducts.slice(0, bundledProductCount);
    
    // Calculate total bundle value
    const bundledProductsTotal = bundledProducts.reduce((sum, p) => sum + p.price, 0);
    const totalBundleValue = premiumProductValue + bundledProductsTotal;
    
    // Calculate balance after assignment
    const balanceBeforeAssignment = userData.balance;
    const balanceAfterAssignment = balanceBeforeAssignment - totalBundleValue;
    const negativeAmount = balanceAfterAssignment < 0 ? Math.abs(balanceAfterAssignment) : 0;
    
    // Create premium assignment
    const premiumAssignment = {
      id: `premium-${Date.now()}`,
      premiumProductValue,
      premiumProductName: `Premium Product ($${premiumProductValue})`,
      bundledProducts,
      totalBundleValue,
      balanceBeforeAssignment,
      balanceAfterAssignment,
      negativeAmount,
      topUpRequired: negativeAmount,
      tasksCompleted: 0,
      totalTasks: 1 + bundledProductCount, // Premium + bundled products
      assignedAt: new Date().toISOString(),
      assignedBy: adminUsername || 'admin',
      status: 'active', // active, completed, cancelled
      commissionEarned: 0,
    };

    // Initialize premium queue if not exists
    if (!userData.premiumQueue) {
      userData.premiumQueue = [];
    }

    // Add to queue
    userData.premiumQueue.push(premiumAssignment);
    
    // If this is the first in queue, activate it
    if (userData.premiumQueue.length === 1) {
      userData.isFrozen = true;
      userData.activePremium = premiumAssignment;
      userData.balance = balanceAfterAssignment;
      if (negativeAmount > 0) {
        userData.holdAmount = negativeAmount;
      }
    }
    
    await kv.set(userKey, userData);
    
    // Save premium assignment record
    const premiumKey = `premium:${username}:${premiumAssignment.id}`;
    await kv.set(premiumKey, premiumAssignment);
    
    return c.json({
      success: true,
      premiumAssignment,
      balanceAfter: balanceAfterAssignment,
      topUpRequired: negativeAmount,
      queuePosition: userData.premiumQueue.length,
    });
  } catch (error) {
    console.error('Error assigning premium bundle:', error);
    return c.json({ error: 'Failed to assign premium bundle' }, 500);
  }
});

// Complete premium bundle task
app.post("/make-server-a1c55d7e/complete-premium-task", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:complete-premium-task');
    if (rateLimited) return rateLimited;

    const premiumBody = await c.req.json();
    const { productPrice } = premiumBody;
    const username = sanitizeUsername(premiumBody.username);

    if (!username) {
      return c.json({ error: 'Invalid or missing username' }, 400);
    }
    if (typeof productPrice !== 'number' || !Number.isFinite(productPrice) || productPrice <= 0) {
      return c.json({ error: 'productPrice must be a positive finite number' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData || !userData.activePremium) {
      return c.json({ error: 'No active premium assignment' }, 404);
    }

    const normalizedUserData = normalizeUserRecord(userData, username);
    if (!normalizedUserData.activePremium) {
      return c.json({ error: 'No active premium assignment' }, 404);
    }

    const premium = normalizedUserData.activePremium;
    
    const vipConfig = await getVipConfigForLevel(normalizedUserData.vipLevel);
    normalizedUserData.tasksLimit = vipConfig.dailyTasks;
    const commissionRate = vipConfig.commission;
    const commission = roundMoney(productPrice * commissionRate);
    
    // Update premium assignment progress
    premium.tasksCompleted += 1;
    premium.commissionEarned = roundMoney(Number(premium.commissionEarned ?? 0) + commission);
    
    // Add commission to balance (not product value, only commission)
    normalizedUserData.balance = roundMoney(normalizedUserData.balance + commission);
    normalizedUserData.todayCommission = roundMoney(normalizedUserData.todayCommission + commission);
    
    // Update hold amount as balance increases
    if (normalizedUserData.balance < 0) {
      normalizedUserData.holdAmount = Math.abs(normalizedUserData.balance);
    } else {
      normalizedUserData.holdAmount = 0;
    }
    
    // Check if all tasks completed
    if (premium.tasksCompleted >= premium.totalTasks) {
      premium.status = 'completed';
      premium.completedAt = new Date().toISOString();
      
      // Remove from queue
      normalizedUserData.premiumQueue = normalizedUserData.premiumQueue.filter(p => p.id !== premium.id);
      
      // Activate next in queue if exists
      if (normalizedUserData.premiumQueue.length > 0) {
        const nextPremium = normalizedUserData.premiumQueue[0];
        normalizedUserData.activePremium = nextPremium;
        normalizedUserData.isFrozen = true;
        
        // Deduct next bundle value from balance
        const newBalance = normalizedUserData.balance - nextPremium.totalBundleValue;
        nextPremium.balanceBeforeAssignment = normalizedUserData.balance;
        nextPremium.balanceAfterAssignment = newBalance;
        nextPremium.negativeAmount = newBalance < 0 ? Math.abs(newBalance) : 0;
        nextPremium.topUpRequired = nextPremium.negativeAmount;
        
        normalizedUserData.balance = newBalance;
        if (newBalance < 0) {
          normalizedUserData.holdAmount = Math.abs(newBalance);
        }
      } else {
        // No more premiums in queue
        normalizedUserData.isFrozen = false;
        normalizedUserData.activePremium = null;
      }
    } else {
      normalizedUserData.activePremium = premium;
    }

    const premiumReferralPayout = await creditParentReferralFromChildCommission(username, commission);
    
    await kv.set(userKey, normalizedUserData);
    
    // Update premium assignment record
    const premiumKey = `premium:${username}:${premium.id}`;
    await kv.set(premiumKey, premium);
    
    // Save task record
    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      username,
      productPrice,
      commission,
      isPremium: true,
      premiumBundleId: premium.id,
      timestamp: new Date().toISOString(),
    };
    await kv.set(taskKey, taskRecord);

    await createTransactionRecord({
      username,
      type: 'Commission',
      amount: commission,
      method: 'Premium Task',
      source: 'premium_task',
      description: 'Premium task commission credited',
      referenceId: premium.id,
    });
    
    return c.json({
      success: true,
      commission,
      tasksCompleted: premium.tasksCompleted,
      totalTasks: premium.totalTasks,
      balance: normalizedUserData.balance,
      holdAmount: normalizedUserData.holdAmount,
      bundleCompleted: premium.status === 'completed',
      nextInQueue: normalizedUserData.premiumQueue.length > 0,
      parentReferralCommission: premiumReferralPayout.rewarded ? premiumReferralPayout.parentReward : 0,
      parentReferralUsername: premiumReferralPayout.rewarded ? premiumReferralPayout.parentUsername : null,
    });
  } catch (error) {
    console.error('Error completing premium task:', error);
    return c.json({ error: 'Failed to complete premium task' }, 500);
  }
});

// Cancel premium assignment (admin)
app.delete("/make-server-a1c55d7e/admin/cancel-premium/:username/:premiumId", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cancel-premium');
    if (rateLimited) {
      return rateLimited;
    }

    const username = sanitizeUsername(c.req.param("username"));
    const premiumId = sanitizePremiumId(c.req.param("premiumId"));
    if (!username || !premiumId) {
      return c.json({ error: 'Invalid username or premium ID' }, 400);
    }

    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Find and remove from queue
    const premiumIndex = userData.premiumQueue.findIndex(p => p.id === premiumId);
    if (premiumIndex === -1) {
      return c.json({ error: 'Premium assignment not found' }, 404);
    }

    const cancelledPremium = userData.premiumQueue[premiumIndex];
    cancelledPremium.status = 'cancelled';
    cancelledPremium.cancelledAt = new Date().toISOString();
    
    // If cancelling active premium
    if (userData.activePremium?.id === premiumId) {
      // Restore balance
      userData.balance = cancelledPremium.balanceBeforeAssignment;
      userData.holdAmount = 0;
      
      // Remove from queue
      userData.premiumQueue.splice(premiumIndex, 1);
      
      // Activate next if exists
      if (userData.premiumQueue.length > 0) {
        userData.activePremium = userData.premiumQueue[0];
        userData.isFrozen = true;
      } else {
        userData.activePremium = null;
        userData.isFrozen = false;
      }
    } else {
      // Just remove from queue
      userData.premiumQueue.splice(premiumIndex, 1);
    }
    
    await kv.set(userKey, userData);
    
    // Update premium record
    const premiumKey = `premium:${username}:${premiumId}`;
    await kv.set(premiumKey, cancelledPremium);
    
    return c.json({ success: true, message: 'Premium assignment cancelled' });
  } catch (error) {
    console.error('Error cancelling premium assignment:', error);
    return c.json({ error: 'Failed to cancel premium assignment' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/transactions', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:transactions-read');
    if (rateLimited) {
      return rateLimited;
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const allUsers = await kv.getByPrefix('user:');
    const visibleUsernames = new Set(
      allUsers
        .map((raw) => normalizeUserRecord(raw, String(raw?.username ?? '')))
        .filter((user) => Boolean(user.username) && user.username !== ROOT_REFERRAL_USERNAME)
        .filter((user) => callerIsSuperAdmin || user.referredByAdminId === callingAdmin?.id)
        .map((user) => user.username),
    );

    const transactions = (await listTransactionRecords())
      .filter((transaction) => visibleUsernames.has(transaction.username));

    return c.json({ transactions });
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/tasks', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-read');
    if (rateLimited) {
      return rateLimited;
    }

    const tasks = await listTaskCatalogRecords(true);
    const taskRecords = await kv.getByPrefix('task:');
    const today = new Date().toISOString().split('T')[0];

    const decoratedTasks = tasks.map((task) => {
      const matchingRecords = taskRecords.filter((record) => record?.taskId === task.id);
      const assignedUsers = new Set(
        matchingRecords
          .map((record) => (typeof record?.username === 'string' ? record.username : null))
          .filter((username): username is string => Boolean(username)),
      ).size;
      const completedToday = matchingRecords.filter((record) => {
        const timestamp = typeof record?.timestamp === 'string' ? record.timestamp : '';
        return timestamp.startsWith(today);
      }).length;

      return {
        ...task,
        assignedUsers,
        completedToday,
      };
    });

    return c.json({ tasks: decoratedTasks });
  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    return c.json({ error: 'Failed to fetch admin tasks' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/vip-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:vip-config-read');
    if (rateLimited) {
      return rateLimited;
    }

    const tiers = await listVipConfigRecords();
    return c.json({ tiers });
  } catch (error) {
    console.error('Error fetching admin VIP config:', error);
    return c.json({ error: 'Failed to fetch VIP config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/rewards-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:rewards-config-read');
    if (rateLimited) {
      return rateLimited;
    }

    const config = await getRewardsConfigRecord();
    return c.json({ config });
  } catch (error) {
    console.error('Error fetching admin rewards config:', error);
    return c.json({ error: 'Failed to fetch rewards config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/salary/project', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-project-read');
    if (rateLimited) {
      return rateLimited;
    }

    const project = await kv.get(ADMIN_SALARY_PROJECT_KEY);
    return c.json({ project: sanitizeAdminSalaryProject(project) });
  } catch (error) {
    console.error('Error fetching admin salary project:', error);
    return c.json({ error: 'Failed to fetch salary project' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/salary/project', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-project-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const normalized = sanitizeAdminSalaryProject((body as any)?.project ?? body);
    if (!normalized) {
      return c.json({ error: 'Invalid salary project payload' }, 400);
    }

    await kv.set(ADMIN_SALARY_PROJECT_KEY, normalized);
    return c.json({ success: true, project: normalized });
  } catch (error) {
    console.error('Error saving admin salary project:', error);
    return c.json({ error: 'Failed to save salary project' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/salary/audit-log', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-audit-read');
    if (rateLimited) {
      return rateLimited;
    }

    const events = sanitizeAdminSalaryAuditLog(await kv.get(ADMIN_SALARY_AUDIT_LOG_KEY));
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching admin salary audit log:', error);
    return c.json({ error: 'Failed to fetch salary audit log' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/salary/audit-log', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-audit-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const events = sanitizeAdminSalaryAuditLog((body as any)?.events ?? body);
    await kv.set(ADMIN_SALARY_AUDIT_LOG_KEY, events);
    return c.json({ success: true, events });
  } catch (error) {
    console.error('Error saving admin salary audit log:', error);
    return c.json({ error: 'Failed to save salary audit log' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/platform-settings', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:platform-settings-read');
    if (rateLimited) {
      return rateLimited;
    }

    const settings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    return c.json({ settings });
  } catch (error) {
    console.error('Error fetching admin platform settings:', error);
    return c.json({ error: 'Failed to fetch platform settings' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/platform-settings', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:platform-settings-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const settings = sanitizeAdminPlatformSettings((body as any)?.settings ?? body);
    await kv.set(ADMIN_PLATFORM_SETTINGS_KEY, settings);
    return c.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving admin platform settings:', error);
    return c.json({ error: 'Failed to save platform settings' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/tasks', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-create');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const merchant = sanitizeTaskText(body?.merchant);
    const product = sanitizeTaskText(body?.product);
    const price = roundMoney(Number(body?.price ?? 0));
    const commission = Number(body?.commission ?? 0);

    if (!merchant || !product) {
      return c.json({ error: 'merchant and product are required' }, 400);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return c.json({ error: 'price must be greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }

    const task = normalizeTaskCatalogRecord({
      id: createFinanceId('task'),
      merchant,
      product,
      price,
      commission,
      status: body?.status,
      image: sanitizeTaskText(body?.image),
      rating: Number(body?.rating ?? 4),
      productUrl: body?.productUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${task.id}`, task);
    return c.json({ success: true, task }, 201);
  } catch (error) {
    console.error('Error creating admin task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/tasks/:taskId', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-update');
    if (rateLimited) {
      return rateLimited;
    }

    const taskId = sanitizeTaskId(c.req.param('taskId'));
    if (!taskId) {
      return c.json({ error: 'Invalid task ID' }, 400);
    }

    const existingTask = await getTaskCatalogRecord(taskId);
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const body = await c.req.json();
    const merchant = sanitizeTaskText(body?.merchant, existingTask.merchant);
    const product = sanitizeTaskText(body?.product, existingTask.product);
    const price = Number.isFinite(Number(body?.price)) ? roundMoney(Number(body.price)) : existingTask.price;
    const commission = Number.isFinite(Number(body?.commission)) ? Number(body.commission) : existingTask.commission;

    if (!merchant || !product) {
      return c.json({ error: 'merchant and product are required' }, 400);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return c.json({ error: 'price must be greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }

    const updatedTask = normalizeTaskCatalogRecord({
      ...existingTask,
      merchant,
      product,
      price,
      commission,
      status: body?.status ?? existingTask.status,
      image: body?.image ?? existingTask.image,
      rating: Number.isFinite(Number(body?.rating)) ? Number(body.rating) : existingTask.rating,
      productUrl: body?.productUrl ?? existingTask.productUrl,
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${taskId}`, updatedTask);
    return c.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error updating admin task:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/vip-config/:level', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:vip-config-update');
    if (rateLimited) {
      return rateLimited;
    }

    const level = Number(c.req.param('level'));
    if (!Number.isInteger(level) || level <= 0) {
      return c.json({ error: 'Invalid VIP level' }, 400);
    }

    const existingTier = await getVipConfigForLevel(level);
    if (existingTier.level !== level) {
      return c.json({ error: 'VIP level not found' }, 404);
    }

    const body = await c.req.json();
    const investment = Number.isFinite(Number(body?.investment)) ? roundMoney(Number(body.investment)) : existingTier.investment;
    const dailyTasks = Number.isFinite(Number(body?.dailyTasks)) ? Math.round(Number(body.dailyTasks)) : existingTier.dailyTasks;
    const commission = Number.isFinite(Number(body?.commission)) ? Number(body.commission) : existingTier.commission;

    if (!Number.isFinite(investment) || investment <= 0) {
      return c.json({ error: 'investment must be greater than 0' }, 400);
    }
    if (!Number.isInteger(dailyTasks) || dailyTasks <= 0) {
      return c.json({ error: 'dailyTasks must be a whole number greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }

    const updatedTier = normalizeVipConfigRecord({
      ...existingTier,
      name: body?.name ?? existingTier.name,
      investment,
      dailyTasks,
      commission,
      color: body?.color ?? existingTier.color,
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${VIP_CONFIG_KEY_PREFIX}${level}`, updatedTier);
    await syncUsersForVipLevel(level);

    return c.json({ success: true, tier: updatedTier });
  } catch (error) {
    console.error('Error updating VIP config:', error);
    return c.json({ error: 'Failed to update VIP config' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/rewards-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:rewards-config-update');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const existing = await getRewardsConfigRecord();

    const merged = {
      ...existing,
      workday: Array.isArray(body?.workday) ? body.workday : existing.workday,
      reset: Array.isArray(body?.reset) ? body.reset : existing.reset,
      accumulated: Array.isArray(body?.accumulated) ? body.accumulated : existing.accumulated,
      productSystem: body?.productSystem && typeof body.productSystem === 'object'
        ? { ...existing.productSystem, ...body.productSystem }
        : existing.productSystem,
      updatedAt: new Date().toISOString(),
    };

    const config = normalizeRewardsConfigRecord(merged);
    config.updatedAt = new Date().toISOString();
    await kv.set(REWARDS_CONFIG_KEY, config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error updating admin rewards config:', error);
    return c.json({ error: 'Failed to update rewards config' }, 500);
  }
});

app.delete('/make-server-a1c55d7e/admin/tasks/:taskId', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-delete');
    if (rateLimited) {
      return rateLimited;
    }

    const taskId = sanitizeTaskId(c.req.param('taskId'));
    if (!taskId) {
      return c.json({ error: 'Invalid task ID' }, 400);
    }

    const existingTask = await getTaskCatalogRecord(taskId);
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    await kv.del(`${TASK_CATALOG_KEY_PREFIX}${taskId}`);
    return c.json({ success: true, deletedTaskId: taskId });
  } catch (error) {
    console.error('Error deleting admin task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/withdrawals', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:withdrawals-read');
    if (rateLimited) {
      return rateLimited;
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const allUsers = await kv.getByPrefix('user:');
    const visibleUsernames = new Set(
      allUsers
        .map((raw) => normalizeUserRecord(raw, String(raw?.username ?? '')))
        .filter((user) => Boolean(user.username) && user.username !== ROOT_REFERRAL_USERNAME)
        .filter((user) => callerIsSuperAdmin || user.referredByAdminId === callingAdmin?.id)
        .map((user) => user.username),
    );

    const withdrawals = (await listWithdrawalRecords())
      .filter((withdrawal) => visibleUsernames.has(withdrawal.username));

    return c.json({ withdrawals });
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    return c.json({ error: 'Failed to fetch withdrawals' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/withdrawals/:withdrawalId/review', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:withdrawal-review');
    if (rateLimited) {
      return rateLimited;
    }

    const withdrawalId = String(c.req.param('withdrawalId') ?? '').trim();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const body = await c.req.json();
    const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (action !== 'approve' && action !== 'reject') {
      return c.json({ error: 'action must be approve or reject' }, 400);
    }

    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : '';
    const rejectionReason = typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
    const withdrawalKey = `${WITHDRAWAL_KEY_PREFIX}${withdrawalId}`;
    const existingWithdrawal = await kv.get(withdrawalKey);
    if (!existingWithdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const withdrawal = normalizeWithdrawalRecord(existingWithdrawal);
    if (withdrawal.status !== 'Pending') {
      return c.json({ error: 'Withdrawal request has already been processed' }, 400);
    }

    const userKey = `user:${withdrawal.username}`;
    const userData = await kv.get(userKey);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUserData = normalizeUserRecord(userData, withdrawal.username);
    if (!callerIsSuperAdmin && normalizedUserData.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const reviewedAt = new Date().toISOString();
    withdrawal.status = action === 'approve' ? 'Approved' : 'Rejected';
    withdrawal.reviewedAt = reviewedAt;
    withdrawal.reviewerId = callingAdmin?.id ?? null;
    withdrawal.reviewerEmail = typeof callingAdmin?.email === 'string' ? callingAdmin.email : null;
    withdrawal.txHash = txHash;
    withdrawal.rejectionReason = action === 'reject' ? rejectionReason : '';

    if (action === 'approve') {
      normalizedUserData.holdAmount = roundMoney(Math.max(0, normalizedUserData.holdAmount - withdrawal.amount));
      normalizedUserData.balance = roundMoney(normalizedUserData.balance - withdrawal.amount);
    } else {
      normalizedUserData.holdAmount = roundMoney(Math.max(0, normalizedUserData.holdAmount - withdrawal.amount));
    }

    const transactionKey = `${TRANSACTION_KEY_PREFIX}${withdrawal.transactionId}`;
    const existingTransaction = await kv.get(transactionKey);
    if (existingTransaction) {
      const updatedTransaction = normalizeTransactionRecord({
        ...existingTransaction,
        status: action === 'approve' ? 'Completed' : 'Rejected',
        txHash,
        updatedAt: reviewedAt,
        date: reviewedAt,
        description: action === 'approve' ? 'Withdrawal approved by admin' : 'Withdrawal rejected by admin',
      });
      await kv.set(transactionKey, updatedTransaction);
    }

    await kv.set(withdrawalKey, withdrawal);
    await kv.set(userKey, normalizedUserData);

    return c.json({
      success: true,
      withdrawal,
      balance: normalizedUserData.balance,
      holdAmount: normalizedUserData.holdAmount,
      availableAmount: roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount),
    });
  } catch (error) {
    console.error('Error reviewing withdrawal request:', error);
    return c.json({ error: 'Failed to review withdrawal request' }, 500);
  }
});

// Get all premium assignments for a user
app.get("/make-server-a1c55d7e/premium/:username", async (c) => {
  try {
    const username = sanitizeUsername(c.req.param("username"));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }
    const premiumPrefix = `premium:${username}:`;
    
    const premiums = await kv.getByPrefix(premiumPrefix);
    
    // Sort by assigned date descending
    const sortedPremiums = premiums.sort((a, b) => 
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
    
    return c.json(sortedPremiums);
  } catch (error) {
    console.error('Error fetching premium assignments:', error);
    return c.json({ error: 'Failed to fetch premium assignments' }, 500);
  }
});

// Get premium assignments across scoped users for admin views
app.get("/make-server-a1c55d7e/admin/premium-assignments", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:premium-assignments');
    if (rateLimited) {
      return rateLimited;
    }

    const adminUser = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(adminUser);

    const allUsers = await kv.getByPrefix('user:');
    const normalizedUsers = allUsers
      .map((candidate) => {
        const username = typeof candidate?.username === 'string' ? candidate.username : null;
        if (!username) {
          return null;
        }
        return normalizeUserRecord(candidate, username);
      })
      .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user));

    const scopedUsers = callerIsSuperAdmin
      ? normalizedUsers
      : normalizedUsers.filter((user) => user.referredByAdminId === adminUser?.id);

    const assignments = scopedUsers.flatMap((user) => {
      const queue = Array.isArray(user.premiumQueue) ? user.premiumQueue : [];
      return queue.map((assignment, index) => ({
        username: user.username,
        vipLevel: user.vipLevel,
        queuePosition: index + 1,
        isActive: user.activePremium?.id === assignment?.id,
        ...assignment,
      }));
    });

    assignments.sort((left, right) => {
      const leftTime = typeof left.assignedAt === 'string' ? new Date(left.assignedAt).getTime() : 0;
      const rightTime = typeof right.assignedAt === 'string' ? new Date(right.assignedAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return c.json({ assignments });
  } catch (error) {
    console.error('Error fetching admin premium assignments:', error);
    return c.json({ error: 'Failed to fetch premium assignments' }, 500);
  }
});

// ==================== CS SYSTEM ENDPOINTS ====================

const SUPPORT_LINKS_KEY = 'support:links';
const DEFAULT_SUPPORT_LINKS = {
  whatsappNumber: '1234567890',
  telegramUsername: 'steadfastdigital',
  supportEmail: 'support@steadfastdigital.com',
};

function sanitizeSupportLinks(value: unknown) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SUPPORT_LINKS };
  }

  const candidate = value as Record<string, unknown>;
  const whatsappNumber = typeof candidate.whatsappNumber === 'string' && candidate.whatsappNumber.trim()
    ? candidate.whatsappNumber.trim()
    : DEFAULT_SUPPORT_LINKS.whatsappNumber;
  const telegramUsername = typeof candidate.telegramUsername === 'string' && candidate.telegramUsername.trim()
    ? candidate.telegramUsername.trim()
    : DEFAULT_SUPPORT_LINKS.telegramUsername;
  const supportEmail = typeof candidate.supportEmail === 'string' && candidate.supportEmail.trim()
    ? candidate.supportEmail.trim()
    : DEFAULT_SUPPORT_LINKS.supportEmail;

  return {
    whatsappNumber,
    telegramUsername,
    supportEmail,
  };
}

// Get support contact links
app.get("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const saved = await kv.get(SUPPORT_LINKS_KEY);
    return c.json(sanitizeSupportLinks(saved));
  } catch (error) {
    console.error('Error fetching support links:', error);
    return c.json({ error: 'Failed to fetch support links' }, 500);
  }
});

// Update support contact links
app.post("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-support-links-update');
    if (rateLimited) {
      return rateLimited;
    }

    const payload = sanitizeSupportLinks(await c.req.json());
    await kv.set(SUPPORT_LINKS_KEY, payload);
    return c.json({ success: true, links: payload });
  } catch (error) {
    console.error('Error saving support links:', error);
    return c.json({ error: 'Failed to save support links' }, 500);
  }
});

// Create a support ticket
app.post("/make-server-a1c55d7e/cs/create-ticket", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:create-ticket');
    if (rateLimited) return rateLimited;

    const { username: rawTicketUsername, subject, message, category, priority } = await c.req.json();
    const username = sanitizeUsername(rawTicketUsername);

    if (!username || !subject || !message || !category) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticket = {
      id: ticketId,
      username,
      subject,
      message,
      category,
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
      assignedTo: null,
    };
    
    const ticketKey = `ticket:${ticketId}`;
    await kv.set(ticketKey, ticket);
    
    // Add to user's tickets list
    const userTicketsKey = `user:${username}:tickets`;
    const userTickets = await kv.get(userTicketsKey) || [];
    userTickets.push(ticketId);
    await kv.set(userTicketsKey, userTickets);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return c.json({ error: 'Failed to create support ticket' }, 500);
  }
});

// Get user tickets
app.get("/make-server-a1c55d7e/cs/tickets/:username", async (c) => {
  try {
    const username = sanitizeUsername(c.req.param("username"));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }
    const userTicketsKey = `user:${username}:tickets`;
    
    const ticketIds = await kv.get(userTicketsKey) || [];
    
    const tickets = [];
    for (const ticketId of ticketIds) {
      const ticket = await kv.get(`ticket:${ticketId}`);
      if (ticket) {
        tickets.push(ticket);
      }
    }
    
    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return c.json({ error: 'Failed to fetch user tickets' }, 500);
  }
});

// Get all tickets (admin)
app.get("/make-server-a1c55d7e/cs/admin/tickets", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-tickets-read');
    if (rateLimited) {
      return rateLimited;
    }

    const ticketPrefix = 'ticket:ticket_';
    const tickets = await kv.getByPrefix(ticketPrefix);
    
    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return c.json({ error: 'Failed to fetch all tickets' }, 500);
  }
});

// Add response to ticket
app.post("/make-server-a1c55d7e/cs/respond", async (c) => {
  try {
    const { ticketId, message, respondedBy, isAdmin } = await c.req.json();

    if (isAdmin) {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-respond');
      if (rateLimited) {
        return rateLimited;
      }
    }
    
    if (!ticketId || !message || !respondedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }
    
    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      respondedBy,
      isAdmin: isAdmin || false,
      createdAt: new Date().toISOString(),
    };
    
    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error responding to ticket:', error);
    return c.json({ error: 'Failed to respond to ticket' }, 500);
  }
});

// Update ticket status
app.post("/make-server-a1c55d7e/cs/update-status", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-update-status');
    if (rateLimited) {
      return rateLimited;
    }

    const { ticketId, status, assignedTo } = await c.req.json();
    
    if (!ticketId || !status) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const VALID_TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];
    if (!VALID_TICKET_STATUSES.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${VALID_TICKET_STATUSES.join(', ')}` }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo;
    }
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return c.json({ error: 'Failed to update ticket status' }, 500);
  }
});

// Create live chat message
app.post("/make-server-a1c55d7e/cs/chat/send", async (c) => {
  try {
    const { username: rawChatUsername, message, isAdmin } = await c.req.json();
    const username = sanitizeUsername(rawChatUsername);

    if (isAdmin) {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chat-send');
      if (rateLimited) {
        return rateLimited;
      }
    }
    
    if (!username || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const chatKey = `chat:${username}`;
    const chatMessages = await kv.get(chatKey) || [];
    
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      sender: isAdmin ? 'support' : username,
      isAdmin: isAdmin || false,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    chatMessages.push(newMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages.shift();
    }
    
    await kv.set(chatKey, chatMessages);
    
    return c.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return c.json({ error: 'Failed to send chat message' }, 500);
  }
});

// Get chat messages
app.get("/make-server-a1c55d7e/cs/chat/:username", async (c) => {
  try {
    const username = sanitizeUsername(c.req.param("username"));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }
    const chatKey = `chat:${username}`;

    const messages = await kv.get(chatKey) || [];

    return c.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return c.json({ error: 'Failed to fetch chat messages' }, 500);
  }
});

// Mark chat messages as read for the current viewer
app.post("/make-server-a1c55d7e/cs/chat/mark-read", async (c) => {
  try {
    const { username, viewer } = await c.req.json();

    if (viewer === 'admin') {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chat-mark-read');
      if (rateLimited) {
        return rateLimited;
      }
    }

    if (!username || (viewer !== 'admin' && viewer !== 'user')) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const chatKey = `chat:${username}`;
    const messages = await kv.get(chatKey) || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ success: true, updated: 0 });
    }

    const shouldMarkAdminMessages = viewer === 'user';
    let updated = 0;

    const nextMessages = messages.map((message) => {
      if (
        message &&
        typeof message === 'object' &&
        message.read === false &&
        Boolean(message.isAdmin) === shouldMarkAdminMessages
      ) {
        updated += 1;
        return {
          ...message,
          read: true,
        };
      }

      return message;
    });

    if (updated > 0) {
      await kv.set(chatKey, nextMessages);
    }

    return c.json({ success: true, updated });
  } catch (error) {
    console.error('Error marking chat messages as read:', error);
    return c.json({ error: 'Failed to mark chat messages as read' }, 500);
  }
});

// Get all active chats (admin)
app.get("/make-server-a1c55d7e/cs/admin/chats", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chats-read');
    if (rateLimited) {
      return rateLimited;
    }

    const chatPrefix = 'chat:';
    const allChats = await kv.getByPrefix(chatPrefix);
    
    // Transform to get username and last message
    const chatSummaries = allChats
      .filter(chat => Array.isArray(chat) && chat.length > 0)
      .map((messages, index) => {
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(msg => !msg.read && !msg.isAdmin).length;
        
        return {
          username: lastMessage.sender === 'support' ? messages.find(m => m.sender !== 'support')?.sender || 'Unknown' : lastMessage.sender,
          lastMessage: lastMessage.message,
          lastMessageTime: lastMessage.timestamp,
          unreadCount,
          totalMessages: messages.length,
        };
      });
    
    chatSummaries.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    
    return c.json(chatSummaries);
  } catch (error) {
    console.error('Error fetching all chats:', error);
    return c.json({ error: 'Failed to fetch all chats' }, 500);
  }
});

// ==================== PASSWORD RESET ENDPOINTS ====================

// Request password reset
app.post("/make-server-a1c55d7e/auth/forgot-password", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:forgot-password', FORGOT_PASSWORD_RATE_LIMIT_MAX);
    if (rateLimited) return rateLimited;

    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    // Find user by email (in real implementation, search KV store for user with this email)
    // For now, we'll simulate this
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    
    // Store reset token
    const resetKey = `password_reset:${resetToken}`;
    await kv.set(resetKey, {
      email,
      token: resetToken,
      expiresAt: resetExpiry,
      used: false,
    });
    
    // In a real implementation, send email with reset link
    // For now, we'll just log it
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset link: /reset-password?token=${resetToken}`);
    
    return c.json({
      success: true,
      message: 'Password reset instructions sent to email',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return c.json({ error: 'Failed to process password reset request' }, 500);
  }
});

// Verify reset token
app.get("/make-server-a1c55d7e/auth/verify-reset-token/:token", async (c) => {
  try {
    const token = sanitizeResetToken(c.req.param("token"));
    if (!token) {
      return c.json({ valid: false, error: 'Invalid reset token format' }, 400);
    }
    const resetKey = `password_reset:${token}`;

    const resetData = await kv.get(resetKey);
    
    if (!resetData) {
      return c.json({ valid: false, error: 'Invalid or expired reset token' }, 400);
    }
    
    if (resetData.used) {
      return c.json({ valid: false, error: 'This reset link has already been used' }, 400);
    }
    
    if (new Date(resetData.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'This reset link has expired' }, 400);
    }
    
    return c.json({ valid: true, email: resetData.email });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return c.json({ error: 'Failed to verify reset token' }, 500);
  }
});

// Reset password with token
app.post("/make-server-a1c55d7e/auth/reset-password", async (c) => {
  try {
    const { token: rawResetToken, newPassword, username: rawResetUsername } = await c.req.json();
    const token = sanitizeResetToken(rawResetToken);
    const username = sanitizeUsername(rawResetUsername);

    if (!token || !newPassword || !username) {
      return c.json({ error: 'Token, username, and new password are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Verify token
    const resetKey = `password_reset:${token}`;
    const resetData = await kv.get(resetKey);
    
    if (!resetData || resetData.used || new Date(resetData.expiresAt) < new Date()) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }
    
    // Get user data
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Hash the new password before storing
    userData.password = await hashPassword(newPassword);
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);

    // Mark token as used
    resetData.used = true;
    resetData.usedAt = new Date().toISOString();
    await kv.set(resetKey, resetData);
    
    console.log(`Password reset successful for user: ${username}`);
    
    return c.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// Change password (authenticated user)
app.post("/make-server-a1c55d7e/auth/change-password", async (c) => {
  try {
    const { username: rawCpUsername, currentPassword, newPassword } = await c.req.json();
    const username = sanitizeUsername(rawCpUsername);

    if (!username || !currentPassword || !newPassword) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    const canonicalUsername = await resolveCanonicalUsername(username);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userKey = `user:${canonicalUsername}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Verify current password (constant-time, supports legacy plaintext migration)
    if (userData.password && !await verifyPassword(currentPassword, userData.password)) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash and store the new password
    userData.password = await hashPassword(newPassword);
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);
    
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Change user login/transaction credentials from profile (server-backed session token required)
app.post('/make-server-a1c55d7e/auth/change-credentials', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:change-credentials', 8);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const currentLoginPassword = typeof body?.currentLoginPassword === 'string' ? body.currentLoginPassword : '';
    const newLoginPassword = typeof body?.newLoginPassword === 'string' ? body.newLoginPassword : '';
    const newTransactionPassword = typeof body?.newTransactionPassword === 'string' ? body.newTransactionPassword : '';

    if (!currentLoginPassword) {
      return c.json({ error: 'currentLoginPassword is required' }, 400);
    }
    if (!newLoginPassword && !newTransactionPassword) {
      return c.json({ error: 'At least one new credential is required' }, 400);
    }
    if (newLoginPassword && newLoginPassword.length < 6) {
      return c.json({ error: 'New login password must be at least 6 characters' }, 400);
    }
    if (newTransactionPassword && newTransactionPassword.length < 6) {
      return c.json({ error: 'New transaction password must be at least 6 characters' }, 400);
    }

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userKey = `user:${session.username}`;
    const userData = await kv.get(userKey);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!(await verifyPassword(currentLoginPassword, String((userData as any).password ?? '')))) {
      return c.json({ error: 'Current login password is incorrect' }, 401);
    }

    if (newLoginPassword) {
      (userData as any).password = await hashPassword(newLoginPassword);
    }
    if (newTransactionPassword) {
      (userData as any).transactionPassword = await hashPassword(newTransactionPassword);
    }

    (userData as any).mustChangePassword = false;
    (userData as any).passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);

    // Keep session state synchronized with password-policy marker.
    const sessionRecord = await getValidSessionById(session.sessionId);
    if (sessionRecord) {
      sessionRecord.mustChangePassword = false;
      await kv.set(`${USER_SESSION_PREFIX}${session.sessionId}`, sessionRecord);
    }

    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: false,
      updated: {
        loginPassword: Boolean(newLoginPassword),
        transactionPassword: Boolean(newTransactionPassword),
      },
    });
  } catch (error) {
    console.error('Error changing user credentials:', error);
    return c.json({ error: 'Failed to update credentials' }, 500);
  }
});

// ── Admin Invitation Code endpoints ─────────────────────────────────────────
// KV layout:
//   admin:invite:code:<CODE>        → { subAdminId, subAdminEmail, subAdminName, usageCount, createdAt }
//   admin:invite:by-admin:<adminId> → <CODE>  (one code per sub-admin)

// GET /admin/invitation-codes  – super-admin only
// Returns all sub-admins paired with their invitation codes.
app.get('/make-server-a1c55d7e/admin/invitation-codes', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:list');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    // Fetch all admin users from Supabase Auth
    const allUsers: any[] = [];
    let page = 1;
    while (page <= 5) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const batch = Array.isArray(data?.users) ? data.users : [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
      page += 1;
    }

    const subAdmins = allUsers.filter((u) => hasAdminRole(u));

    // Load existing codes from KV
    const codeRecords = await kv.getByPrefix('admin:invite:code:');
    const codeByAdminId = new Map<string, { code: string; usageCount: number; createdAt: string }>();
    for (const rec of codeRecords) {
      if (rec && typeof rec.subAdminId === 'string' && typeof rec.code === 'string') {
        codeByAdminId.set(rec.subAdminId, {
          code: rec.code,
          usageCount: typeof rec.usageCount === 'number' ? rec.usageCount : 0,
          createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : '',
        });
      }
    }

    const codes = subAdmins.map((u) => {
      const info = codeByAdminId.get(u.id);
      return {
        subAdminId: u.id,
        subAdminEmail: u.email ?? '',
        subAdminName: getAdminRoleName(u),
        roleName: getAdminRoleName(u),
        isSuperAdmin: isSuperAdmin(u),
        code: info?.code ?? null,
        usageCount: info?.usageCount ?? 0,
        createdAt: info?.createdAt ?? null,
      };
    });

    return c.json({ codes });
  } catch (err) {
    console.error('invitation-codes list error:', err);
    return c.json({ error: 'Failed to fetch invitation codes' }, 500);
  }
});

// POST /admin/invitation-codes/generate  – super-admin only
// Body: { subAdminId: string }  Generates or regenerates a code for one sub-admin.
app.post('/make-server-a1c55d7e/admin/invitation-codes/generate', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:generate');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    const body = await c.req.json();
    const subAdminId = typeof body?.subAdminId === 'string' ? body.subAdminId.trim() : '';
    if (!subAdminId) return c.json({ error: 'subAdminId is required' }, 400);

    // Verify the target user exists and has an admin role
    const { data: targetData, error: targetError } = await authClient.auth.admin.getUserById(subAdminId);
    if (targetError || !targetData?.user) return c.json({ error: 'Sub-admin user not found' }, 404);
    if (!hasAdminRole(targetData.user)) return c.json({ error: 'Target user does not have an admin role' }, 400);

    // Invalidate old code if any
    const oldCodeKey = `admin:invite:by-admin:${subAdminId}`;
    const oldCode = await kv.get(oldCodeKey);
    if (typeof oldCode === 'string' && oldCode) {
      await kv.del(`admin:invite:code:${oldCode}`);
    }

    // Generate a unique code (collision-safe)
    let code: string;
    let attempts = 0;
    do {
      code = generateAdminInviteCode();
      const existing = await kv.get(`admin:invite:code:${code}`);
      if (!existing) break;
      attempts += 1;
    } while (attempts < 20);

    const record = {
      code,
      subAdminId,
      subAdminEmail: targetData.user.email ?? '',
      subAdminName: getAdminRoleName(targetData.user),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`admin:invite:code:${code}`, record);
    await kv.set(oldCodeKey, code);

    return c.json({ subAdminId, code, createdAt: record.createdAt });
  } catch (err) {
    console.error('invitation-code generate error:', err);
    return c.json({ error: 'Failed to generate invitation code' }, 500);
  }
});

// POST /admin/invitation-codes/assign-missing  – super-admin only
// Generates invitation codes for all admins that don't have one yet (legacy admins)
app.post('/make-server-a1c55d7e/admin/invitation-codes/assign-missing', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:assign-missing');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    // Fetch all admin users from Supabase Auth
    const allUsers: any[] = [];
    let page = 1;
    while (page <= 5) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const batch = Array.isArray(data?.users) ? data.users : [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
      page += 1;
    }

    const admins = allUsers.filter((u) => hasAdminRole(u));
    const results: any[] = [];

    for (const admin of admins) {
      // Check if this admin already has a code
      const existingCodeKey = `admin:invite:by-admin:${admin.id}`;
      const existingCode = await kv.get(existingCodeKey);

      if (existingCode && typeof existingCode === 'string' && sanitizeAdminInviteCode(existingCode)) {
        results.push({
          id: admin.id,
          email: admin.email ?? '',
          name: getAdminRoleName(admin),
          status: 'already_has_code',
          code: existingCode,
        });
        continue;
      }

      // Generate a new code for this admin
      let code: string;
      let attempts = 0;
      do {
        code = generateAdminShortCode();
        const existing = await kv.get(`admin:invite:code:${code}`);
        if (!existing) break;
        attempts += 1;
      } while (attempts < 20);

      const record = {
        code,
        subAdminId: admin.id,
        subAdminEmail: admin.email ?? '',
        subAdminName: getAdminRoleName(admin),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`admin:invite:code:${code}`, record);
      await kv.set(existingCodeKey, code);

      results.push({
        id: admin.id,
        email: admin.email ?? '',
        name: getAdminRoleName(admin),
        status: 'newly_assigned',
        code,
      });
    }

    return c.json({
      message: 'Invitation codes assigned to admins without codes',
      assigned: results.filter((r) => r.status === 'newly_assigned').length,
      already_had: results.filter((r) => r.status === 'already_has_code').length,
      results,
    });
  } catch (err) {
    console.error('assign-missing-codes error:', err);
    return c.json({ error: 'Failed to assign invitation codes' }, 500);
  }
});

// POST /validate-admin-invite-code  – public (no auth required)
// Body: { code: string }
// Returns { valid: true, subAdminId, subAdminName } or 404 if invalid.
app.post('/make-server-a1c55d7e/validate-admin-invite-code', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'public:validate-admin-code', 20);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const code = sanitizeAdminInviteCode(body?.code);
    if (!code) return c.json({ valid: false, error: 'Invalid code format' }, 400);

    const record = await kv.get(`admin:invite:code:${code}`);
    if (!record || typeof record.subAdminId !== 'string') {
      return c.json({ valid: false, error: 'Invitation code not found' }, 404);
    }

    return c.json({ valid: true, subAdminId: record.subAdminId, subAdminName: record.subAdminName ?? '' });
  } catch (err) {
    console.error('validate-admin-invite-code error:', err);
    return c.json({ valid: false, error: 'Validation failed' }, 500);
  }
});

// GET /admin/invitation-codes/mine  – any admin
// Returns the current admin's own invitation code
app.get('/make-server-a1c55d7e/admin/invitation-codes/mine', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:mine');
    if (limited) return limited;

    const adminUser = c.get('adminUser');
    if (!adminUser || !adminUser.id) {
      return c.json({ error: 'Admin user not found' }, 401);
    }

    // Get this admin's code from KV
    const codeKey = `admin:invite:by-admin:${adminUser.id}`;
    let code = await kv.get(codeKey);

    // Auto-create/repair a 5-char code for legacy admins created before this feature.
    if (!code || typeof code !== 'string' || !sanitizeAdminInviteCode(code)) {
      const legacyCode = typeof code === 'string' ? code : null;
      let generatedCode: string;
      let attempts = 0;
      do {
        generatedCode = generateAdminShortCode();
        const existing = await kv.get(`admin:invite:code:${generatedCode}`);
        if (!existing) break;
        attempts += 1;
      } while (attempts < 20);

      const generatedRecord = {
        code: generatedCode,
        subAdminId: adminUser.id,
        subAdminEmail: adminUser.email ?? '',
        subAdminName: getAdminRoleName(adminUser),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`admin:invite:code:${generatedCode}`, generatedRecord);
      await kv.set(codeKey, generatedCode);
      if (legacyCode) {
        await kv.del(`admin:invite:code:${legacyCode}`);
      }
      code = generatedCode;
    }

    const codeRecord = await kv.get(`admin:invite:code:${code}`);
    if (!codeRecord) {
      const repairedRecord = {
        code,
        subAdminId: adminUser.id,
        subAdminEmail: adminUser.email ?? '',
        subAdminName: getAdminRoleName(adminUser),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`admin:invite:code:${code}`, repairedRecord);
      return c.json(repairedRecord);
    }

    return c.json({
      code,
      subAdminId: adminUser.id,
      subAdminEmail: adminUser.email ?? '',
      subAdminName: getAdminRoleName(adminUser),
      usageCount: typeof codeRecord.usageCount === 'number' ? codeRecord.usageCount : 0,
      createdAt: typeof codeRecord.createdAt === 'string' ? codeRecord.createdAt : '',
    });
  } catch (err) {
    console.error('admin-invitation-codes:mine error:', err);
    return c.json({ code: null, error: 'Failed to fetch your invitation code' }, 500);
  }
});

// POST /referral/link-admin-invite
// Called at signup to attach referredByAdminId to the new user's record.
// Body: { username, adminInviteCode }
app.post('/make-server-a1c55d7e/referral/link-admin-invite', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:link-admin-invite');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body?.username);
    const code = sanitizeAdminInviteCode(body?.adminInviteCode);
    if (!username || !code) return c.json({ error: 'username and adminInviteCode are required' }, 400);

    const record = await kv.get(`admin:invite:code:${code}`);
    if (!record || typeof record.subAdminId !== 'string') {
      return c.json({ error: 'Admin invitation code not found' }, 404);
    }

    const userData = await getOrCreateUserRecord(username);
    userData.referredByAdminId = record.subAdminId;
    await kv.set(`user:${username}`, userData);

    // Increment usage count on the code record
    record.usageCount = (typeof record.usageCount === 'number' ? record.usageCount : 0) + 1;
    await kv.set(`admin:invite:code:${code}`, record);

    return c.json({ success: true, username, referredByAdminId: record.subAdminId });
  } catch (err) {
    console.error('link-admin-invite error:', err);
    return c.json({ error: 'Failed to link admin invite' }, 500);
  }
});

// GET /admin/platform-users  – admin-gated, scoped by role
// Super-admin: returns all platform users (KV) with referredByAdminId.
// Sub-admin: returns only users where referredByAdminId = caller's user ID.
app.get('/make-server-a1c55d7e/admin/platform-users', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:list');
    if (limited) return limited;

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    // Load all KV users
    const allRawUsers = await kv.getByPrefix('user:');
    const allUsers = allRawUsers
      .map((raw) => normalizeUserRecord(raw, String(raw?.username ?? '')))
      .filter((u) => typeof u.username === 'string' && u.username && u.username !== 'steadfast_root');

    // Scope: sub-admins only see their own referrals
    const scopedUsers = callerIsSuperAdmin
      ? allUsers
      : allUsers.filter((u) => u.referredByAdminId === callingAdmin.id);

    // For super-admin, try to resolve sub-admin names from Auth users
    let adminNameMap: Map<string, string> = new Map();
    if (callerIsSuperAdmin && authClient) {
      try {
        const authPage: any[] = [];
        let p = 1;
        while (p <= 5) {
          const { data } = await authClient.auth.admin.listUsers({ page: p, perPage: 200 });
          const batch = Array.isArray(data?.users) ? data.users : [];
          authPage.push(...batch);
          if (batch.length < 200) break;
          p += 1;
        }
        for (const au of authPage) {
          if (au?.id) {
            adminNameMap.set(au.id, getAdminRoleName(au));
          }
        }
      } catch (_e) { /* non-critical */ }
    }

    const users = scopedUsers.map((u) => ({
      username: u.username,
      vipLevel: u.vipLevel,
      balance: u.balance,
      tasksCompleted: u.tasksCompleted,
      tasksLimit: u.tasksLimit,
      taskSetCount: u.taskSetCount,
      tasksPerSet: u.tasksPerSet,
      tasksCompletedInSet: u.tasksCompletedInSet,
      completedTaskSets: u.completedTaskSets,
      pendingTaskReset: u.pendingTaskReset,
      holdAmount: u.holdAmount,
      isFrozen: u.isFrozen,
      referredByAdminId: u.referredByAdminId ?? null,
      referredByAdminName: u.referredByAdminId
        ? (adminNameMap.get(u.referredByAdminId) ?? u.referredByAdminId)
        : 'Direct',
      createdAt: typeof (u as any).createdAt === 'string' ? (u as any).createdAt : null,
    }));

    return c.json({ users, total: users.length, scoped: !callerIsSuperAdmin });
  } catch (err) {
    console.error('admin/platform-users error:', err);
    return c.json({ error: 'Failed to fetch platform users' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/:username/task-controls', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:task-controls');
    if (limited) return limited;

    const username = sanitizeUsername(c.req.param('username'));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const userKey = `user:${username}`;
    const existingUser = await kv.get(userKey);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUser = await syncUserWithVipConfig(existingUser, username);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const nextTaskSetCount = Number.isFinite(Number(body?.taskSetCount))
      ? Math.max(1, Math.round(Number(body.taskSetCount)))
      : normalizedUser.taskSetCount;
    const nextTasksPerSet = Number.isFinite(Number(body?.tasksPerSet))
      ? Math.max(1, Math.round(Number(body.tasksPerSet)))
      : normalizedUser.tasksPerSet;
    const shouldResetCurrentSet = body?.resetCurrentSet === true;
    const shouldRestoreNaturalState = body?.restoreNaturalState === true;
    const shouldSuspendAccount = body?.suspendAccount === true;

    normalizedUser.taskSetCountOverride = nextTaskSetCount;
    normalizedUser.tasksPerSetOverride = nextTasksPerSet;
    normalizedUser.taskSetCount = nextTaskSetCount;
    normalizedUser.tasksPerSet = nextTasksPerSet;
    normalizedUser.tasksLimit = nextTaskSetCount * nextTasksPerSet;
    normalizedUser.tasksCompleted = Math.min(normalizedUser.tasksCompleted, normalizedUser.tasksLimit);

    if (shouldResetCurrentSet) {
      if (!normalizedUser.pendingTaskReset && normalizedUser.tasksCompletedInSet < normalizedUser.tasksPerSet) {
        return c.json({ error: 'Current task set is not yet complete.' }, 400);
      }
      normalizedUser.completedTaskSets = Math.min(normalizedUser.completedTaskSets + 1, normalizedUser.taskSetCount);
      normalizedUser.tasksCompletedInSet = 0;
      normalizedUser.pendingTaskReset = false;
    }

    if (shouldSuspendAccount) {
      normalizedUser.isFrozen = true;
    }

    if (shouldRestoreNaturalState) {
      const restored = restoreUserToNaturalState(normalizedUser);
      Object.assign(normalizedUser, restored);
      normalizedUser.pendingTaskReset = false;
    }

    await kv.set(userKey, normalizedUser);

    return c.json({
      success: true,
      user: normalizedUser,
      taskProgress: buildUserTaskProgress(normalizedUser),
    });
  } catch (err) {
    console.error('admin/platform-users/task-controls error:', err);
    return c.json({ error: 'Failed to update user task controls' }, 500);
  }
});

// Admin-reset user credentials (login + transaction) without email dependency.
// Admin provides new values; server stores only hashes and forces next password change.
app.post('/make-server-a1c55d7e/admin/platform-users/:username/reset-credentials', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:reset-credentials');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userKey = `user:${canonicalUsername}`;
    const existingUser = await kv.get(userKey);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const nextLoginPassword = typeof body?.loginPassword === 'string' ? body.loginPassword.trim() : '';
    const nextTransactionPassword = typeof body?.transactionPassword === 'string' ? body.transactionPassword.trim() : '';

    if (nextLoginPassword.length < 6 || nextTransactionPassword.length < 6) {
      return c.json({ error: 'loginPassword and transactionPassword must each be at least 6 characters.' }, 400);
    }

    normalizedUser.password = await hashPassword(nextLoginPassword);
    normalizedUser.transactionPassword = await hashPassword(nextTransactionPassword);
    normalizedUser.mustChangePassword = true;
    normalizedUser.passwordUpdatedAt = new Date().toISOString();

    await kv.set(userKey, normalizedUser);

    return c.json({
      ok: true,
      username: canonicalUsername,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('admin/platform-users/reset-credentials error:', err);
    return c.json({ error: 'Failed to reset user credentials' }, 500);
  }
});

Deno.serve(app.fetch);