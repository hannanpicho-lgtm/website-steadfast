import { readFile } from 'node:fs/promises';
import path from 'node:path';

function addResult(results, name, pass, details) {
  results.push({ name, pass, details });
}

async function main() {
  const repoRoot = process.cwd();
  const liveChatPath = path.join(repoRoot, 'src', 'app', 'components', 'admin', 'LiveChatAdmin.tsx');
  const regressionTestPath = path.join(repoRoot, 'src', 'tests', 'liveChatAdmin.module.test.ts');

  const [liveChatSource, testSource] = await Promise.all([
    readFile(liveChatPath, 'utf8'),
    readFile(regressionTestPath, 'utf8'),
  ]);

  const results = [];

  const declarationToken = 'const selectedChatSummary =';
  const dependencyToken = '[selectedChatSummary]';
  const declarationIndex = liveChatSource.indexOf(declarationToken);
  const dependencyIndex = liveChatSource.indexOf(dependencyToken);

  addResult(
    results,
    'selectedChatSummary declared before dependency usage',
    declarationIndex !== -1 && dependencyIndex !== -1 && declarationIndex < dependencyIndex,
    'Expected selectedChatSummary declaration to appear before hook dependency usage.',
  );

  addResult(
    results,
    'LiveChatAdmin regression test exists and imports module',
    testSource.includes("import('../app/components/admin/LiveChatAdmin')"),
    'Expected liveChatAdmin.module.test.ts to import LiveChatAdmin module.',
  );

  const failed = results.filter((result) => !result.pass);

  console.log('Temporal dead zone guard summary');
  console.log('--------------------------------');
  for (const result of results) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'}: ${result.name}`);
    if (!result.pass) {
      console.log(`  ${result.details}`);
    }
  }

  if (failed.length > 0) {
    console.error(`\nTemporal dead zone guard failed (${failed.length} check(s)).`);
    process.exit(1);
  }

  console.log('\nTemporal dead zone guard passed.');
}

main().catch((error) => {
  console.error('Temporal dead zone guard crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
