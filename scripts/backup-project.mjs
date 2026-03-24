import { spawnSync } from 'node:child_process';
import { cwd, exit } from 'node:process';
import path from 'node:path';

const description = process.argv.slice(2).join(' ').trim();
if (!description) {
  console.error('Usage: npm run backup:project -- "description of change"');
  exit(1);
}

const projectPath = cwd();
const backupScriptPath = path.resolve(projectPath, '..', 'Backup-Project.ps1');

const result = spawnSync(
  'powershell',
  [
    '-ExecutionPolicy', 'Bypass',
    '-File', backupScriptPath,
    '-ProjectPath', projectPath,
    '-Description', description,
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(`Failed to run backup script: ${result.error.message}`);
  exit(1);
}

exit(result.status ?? 1);
