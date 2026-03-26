import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const checks = [];

function addCheck(name, pass, details) {
  checks.push({ name, pass, details });
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const shimPath = path.join(repoRoot, 'supabase/functions/make-server-a1c55d7e/index.ts');
  const serverPath = path.join(repoRoot, 'supabase/functions/server/index.ts');
  const legacyTsxPath = path.join(repoRoot, 'supabase/functions/server/index.tsx');
  const apiTestPath = path.join(repoRoot, 'src/tests/api.integration.test.ts');
  const sessionTestPath = path.join(repoRoot, 'src/tests/sessionAuthorization.integration.test.ts');
  const liveChatAdminPath = path.join(repoRoot, 'src/app/components/admin/LiveChatAdmin.tsx');
  const liveChatAdminModuleTestPath = path.join(repoRoot, 'src/tests/liveChatAdmin.module.test.ts');

  const shimSource = await readFile(shimPath, 'utf8');
  const serverSource = await readFile(serverPath, 'utf8');
  const apiTestSource = await readFile(apiTestPath, 'utf8');
  const sessionTestSource = await readFile(sessionTestPath, 'utf8');
  const liveChatAdminSource = await readFile(liveChatAdminPath, 'utf8');
  const liveChatAdminModuleTestSource = await readFile(liveChatAdminModuleTestPath, 'utf8');

  addCheck(
    'Unified backend shim imports index.ts',
    shimSource.includes("import '../server/index.ts';"),
    'Expected supabase/functions/make-server-a1c55d7e/index.ts to import ../server/index.ts',
  );

  addCheck(
    'Legacy backend index.tsx removed',
    !(await fileExists(legacyTsxPath)),
    'Expected supabase/functions/server/index.tsx to be absent to avoid source drift',
  );

  addCheck(
    'Admin auth gateway token constant defined',
    serverSource.includes("const supabaseAnonKey = Deno.env.get(\"SUPABASE_ANON_KEY\") ?? '';") &&
      serverSource.includes('authHeaderToken === supabaseAnonKey || authHeaderToken === supabaseServiceRoleKey'),
    'Expected requireAdmin gateway token checks to reference a defined supabaseAnonKey constant',
  );

  addCheck(
    'Production origin fallback allowlist present',
    serverSource.includes('DEFAULT_PRODUCTION_CORS_ALLOWED_ORIGINS') &&
      serverSource.includes('https://steadfastworkbench.org') &&
      serverSource.includes('https://www.steadfastworkbench.org'),
    'Expected production CORS fallback origins to include steadfastworkbench.org domains',
  );

  addCheck(
    'CORS env origin override keeps safe production fallback behavior',
    serverSource.includes("const envCorsAllowedOrigins = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '')") &&
      serverSource.includes('const CORS_ALLOWED_ORIGINS = envCorsAllowedOrigins.length > 0') &&
      serverSource.includes('(isProductionEnvironment ? DEFAULT_PRODUCTION_CORS_ALLOWED_ORIGINS : [])'),
    'Expected CORS allowlist resolution to use env values when present and production defaults otherwise',
  );

  addCheck(
    'Session fallback header allowed in CORS',
    serverSource.includes('x-user-session-token'),
    'Expected x-user-session-token to be present in CORS allowHeaders',
  );

  addCheck(
    'Admin gateway token checks include anon and service-role paths',
    serverSource.includes('authHeaderToken === supabaseAnonKey || authHeaderToken === supabaseServiceRoleKey') &&
      serverSource.includes('if (!forwardedUserJwt && isGatewayToken) {'),
    'Expected requireAdmin gateway token logic to keep anon/service-role protections',
  );

  addCheck(
    'API integration test enforces trusted Origin header',
    apiTestSource.includes("const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';") &&
      apiTestSource.includes('Origin: TRUSTED_ORIGIN'),
    'Expected API integration test helpers to send a trusted Origin header',
  );

  addCheck(
    'Tier1 session integration test enforces trusted Origin header',
    sessionTestSource.includes("const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';") &&
      sessionTestSource.includes('Origin: TRUSTED_ORIGIN'),
    'Expected Tier1 session integration test helpers to send a trusted Origin header',
  );

  const selectedChatSummaryDeclarationIndex = liveChatAdminSource.indexOf('const selectedChatSummary =');
  const selectedChatSummaryDependencyIndex = liveChatAdminSource.indexOf('[selectedChatSummary]');

  addCheck(
    'LiveChatAdmin selectedChatSummary declared before hook dependency usage',
    selectedChatSummaryDeclarationIndex !== -1
      && selectedChatSummaryDependencyIndex !== -1
      && selectedChatSummaryDeclarationIndex < selectedChatSummaryDependencyIndex,
    'Expected selectedChatSummary declaration to appear before hook dependency usage to avoid TDZ crashes',
  );

  addCheck(
    'LiveChatAdmin import regression test is present',
    liveChatAdminModuleTestSource.includes("import('../app/components/admin/LiveChatAdmin')"),
    'Expected src/tests/liveChatAdmin.module.test.ts to include a module import regression test',
  );

  const failed = checks.filter((check) => !check.pass);

  console.log('\nPlatform guardrail validation summary');
  console.log('-----------------------------------');
  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'}: ${check.name}`);
    if (!check.pass) {
      console.log(`  ${check.details}`);
    }
  }

  if (failed.length > 0) {
    console.error(`\nGuardrail validation failed (${failed.length} check(s)).`);
    process.exit(1);
  }

  console.log('\nAll platform guardrails passed.');
}

main().catch((error) => {
  console.error('Guardrail validation crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
