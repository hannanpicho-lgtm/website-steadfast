#!/usr/bin/env node
import { execSync } from 'node:child_process';

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function run(command) {
  return execSync(command, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
}

function extractLatestProductionSourceSha(output) {
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    if (!line.includes('│ Production')) continue;
    if (!line.includes('│ main')) continue;

    const sourceMatch = line.match(/\|\s*([0-9a-f]{7,40})\s*\|/) || line.match(/│\s*([0-9a-f]{7,40})\s*│/g);
    if (sourceMatch && sourceMatch[1]) {
      return sourceMatch[1];
    }

    const cells = line.split('│').map((part) => part.trim()).filter(Boolean);
    if (cells.length >= 4) {
      const sourceCell = cells[3];
      if (/^[0-9a-f]{7,40}$/i.test(sourceCell)) {
        return sourceCell;
      }
    }
  }

  return null;
}

const projectName = readArg('--project') || 'website-steadfast';
const expectedSha = (readArg('--expected') || run('git rev-parse HEAD')).toLowerCase();

let deploymentList = '';
try {
  deploymentList = run(`npx wrangler pages deployment list --project-name ${projectName}`);
} catch (error) {
  console.error('Unable to read Cloudflare Pages deployment list.');
  if (error instanceof Error && 'stderr' in error) {
    console.error(String(error.stderr ?? '').trim());
  }
  process.exit(2);
}

const deployedSource = extractLatestProductionSourceSha(deploymentList);
if (!deployedSource) {
  console.error('Could not determine latest production source SHA from Cloudflare output.');
  process.exit(2);
}

const normalizedDeployed = deployedSource.toLowerCase();
const matches = expectedSha.startsWith(normalizedDeployed) || normalizedDeployed.startsWith(expectedSha);

console.log(`Project: ${projectName}`);
console.log(`Expected: ${expectedSha}`);
console.log(`Deployed: ${normalizedDeployed}`);
console.log(`Result: ${matches ? 'MATCH' : 'MISMATCH'}`);

if (!matches) {
  process.exit(1);
}
