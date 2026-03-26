import { readFile } from 'node:fs/promises';
import path from 'node:path';

function addCheck(results, name, pass, details) {
  results.push({ name, pass, details });
}

async function main() {
  const repoRoot = process.cwd();
  const serverPath = path.join(repoRoot, 'supabase', 'functions', 'server', 'index.ts');
  const serverSource = await readFile(serverPath, 'utf8');

  const requireAdminStart = serverSource.indexOf('async function requireAdmin(c: any)');
  const requireAdminEnd = serverSource.indexOf('function enforceAdminRateLimit', requireAdminStart);
  const requireAdminBlock = requireAdminStart >= 0 && requireAdminEnd > requireAdminStart
    ? serverSource.slice(requireAdminStart, requireAdminEnd)
    : '';

  const results = [];

  const anonDecl = "const supabaseAnonKey = Deno.env.get(\"SUPABASE_ANON_KEY\") ?? '';";
  const serviceDecl = 'const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");';

  addCheck(
    results,
    'supabaseAnonKey declared at module scope',
    serverSource.includes(anonDecl),
    'Expected supabaseAnonKey declaration at module top-level.',
  );

  addCheck(
    results,
    'supabaseServiceRoleKey declared at module scope',
    serverSource.includes(serviceDecl),
    'Expected supabaseServiceRoleKey declaration at module top-level.',
  );

  addCheck(
    results,
    'requireAdmin function block found',
    requireAdminBlock.length > 0,
    'Expected async function requireAdmin(c: any) in server/index.ts.',
  );

  addCheck(
    results,
    'requireAdmin uses gateway token comparison with both constants',
    requireAdminBlock.includes('authHeaderToken === supabaseAnonKey || authHeaderToken === supabaseServiceRoleKey'),
    'Expected gateway token comparison to include anon and service-role constants.',
  );

  addCheck(
    results,
    'requireAdmin enforces missing forwarded user JWT for gateway tokens',
    requireAdminBlock.includes('if (!forwardedUserJwt && isGatewayToken) {'),
    'Expected gateway-token-without-user-jwt protection branch in requireAdmin.',
  );

  addCheck(
    results,
    'requireAdmin does not redeclare critical auth constants locally',
    !/const\s+supabaseAnonKey\s*=/.test(requireAdminBlock) && !/const\s+supabaseServiceRoleKey\s*=/.test(requireAdminBlock),
    'Critical auth constants should not be redeclared inside requireAdmin.',
  );

  const failed = results.filter((result) => !result.pass);

  console.log('Constant reference audit summary');
  console.log('-------------------------------');
  for (const result of results) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'}: ${result.name}`);
    if (!result.pass) {
      console.log(`  ${result.details}`);
    }
  }

  if (failed.length > 0) {
    console.error(`\nConstant reference audit failed (${failed.length} check(s)).`);
    process.exit(1);
  }

  console.log('\nConstant reference audit passed.');
}

main().catch((error) => {
  console.error('Constant reference audit crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
