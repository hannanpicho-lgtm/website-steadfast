#!/usr/bin/env node
/**
 * backup-storage-report.mjs
 * Shows backup storage status: free space, backup count/size,
 * retention summary, and a warning when space is low.
 *
 * Usage:
 *   npm run backup:storage-report
 *   node scripts/backup-storage-report.mjs
 *
 * Optional env vars:
 *   BACKUP_ROOT      - override backup folder (default: D:\ProjectBackups\Website-SteadfastBackups)
 *   LOW_SPACE_GB     - warning threshold in GB (default: 5)
 *   CRITICAL_SPACE_GB - error threshold in GB (default: 3)
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';

const BACKUP_ROOT = process.env.BACKUP_ROOT
  || 'D:\\ProjectBackups\\Website-SteadfastBackups';

const LOW_SPACE_GB = parseFloat(process.env.LOW_SPACE_GB ?? '5');
const CRITICAL_SPACE_GB = parseFloat(process.env.CRITICAL_SPACE_GB ?? '3');

// ── helpers ────────────────────────────────────────────────────────────────

function formatGB(bytes) {
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

function formatMB(bytes) {
  return (bytes / 1024 ** 2).toFixed(1) + ' MB';
}

function getDriveFreeBytes(driveLetter) {
  try {
    const raw = execSync(
      `powershell -NoProfile -Command "(Get-PSDrive -Name ${driveLetter}).Free"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const val = parseInt(raw, 10);
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

function getDirSizeBytes(dirPath) {
  let total = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dirPath, e.name);
      if (e.isDirectory()) {
        total += getDirSizeBytes(full);
      } else {
        total += statSync(full).size;
      }
    }
  } catch { /* ignore unreadable */ }
  return total;
}

// ── parse timestamps from backup names ────────────────────────────────────
// Expected pattern: Website-Steadfast_backup_YYYYMMDD-HHMMSS[.zip]
function parseTimestamp(name) {
  const m = name.match(/backup_(\d{8}-\d{6})/);
  if (!m) return null;
  const s = m[1]; // e.g. 20260330-065332
  const y = parseInt(s.slice(0, 4)), mo = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));
  const h = parseInt(s.slice(9, 11)), mi = parseInt(s.slice(11, 13)), sec = parseInt(s.slice(13, 15));
  return new Date(y, mo, d, h, mi, sec);
}

// ── retention simulation (mirrors Backup-Project.ps1 logic) ───────────────
const KEEP_ALL_DAYS = 7;
const KEEP_DAILY_DAYS = 30;
const KEEP_WEEKLY_DAYS = 84;

function simulateRetention(entries) {
  const now = new Date();
  const toKeep = new Set();
  const toDelete = [];

  // Sort newest first
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);

  const seenDays = new Set();
  const seenWeeks = new Set();

  for (const e of sorted) {
    const ageMs = now - e.ts;
    const ageDays = ageMs / 86400000;

    if (ageDays <= KEEP_ALL_DAYS) {
      toKeep.add(e.stem);
      continue;
    }

    if (ageDays <= KEEP_DAILY_DAYS) {
      const dayKey = `${e.ts.getFullYear()}-${e.ts.getMonth()}-${e.ts.getDate()}`;
      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        toKeep.add(e.stem);
        continue;
      }
    }

    if (ageDays <= KEEP_WEEKLY_DAYS) {
      // ISO week: Monday-based
      const jan1 = new Date(e.ts.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((e.ts - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      const weekKey = `${e.ts.getFullYear()}-W${weekNum}`;
      if (!seenWeeks.has(weekKey)) {
        seenWeeks.add(weekKey);
        toKeep.add(e.stem);
        continue;
      }
    }

    toDelete.push(e);
  }

  return { toKeep, toDelete };
}

// ── main ──────────────────────────────────────────────────────────────────

function run() {
  const SEP = '─'.repeat(54);
  console.log(`\n${SEP}`);
  console.log('  BACKUP STORAGE REPORT');
  console.log(`  ${new Date().toLocaleString()}`);
  console.log(SEP);

  // 1. Drive free space
  const driveLetter = BACKUP_ROOT.slice(0, 1).toUpperCase();
  const freeBytes = getDriveFreeBytes(driveLetter);
  const freeGB = freeBytes != null ? freeBytes / 1024 ** 3 : null;

  if (freeGB !== null) {
    let spaceIcon = '✓';
    let spaceNote = 'OK';
    if (freeGB < CRITICAL_SPACE_GB) {
      spaceIcon = '✗';
      spaceNote = `CRITICAL — below ${CRITICAL_SPACE_GB} GB minimum`;
    } else if (freeGB < LOW_SPACE_GB) {
      spaceIcon = '⚠';
      spaceNote = `WARNING  — below ${LOW_SPACE_GB} GB recommended`;
    }
    console.log(`\n  Drive ${driveLetter}: Free Space`);
    console.log(`    ${spaceIcon}  ${freeGB.toFixed(2)} GB free  [${spaceNote}]`);
  } else {
    console.log(`\n  Drive ${driveLetter}: free space check unavailable`);
  }

  // 2. Backup folder inventory
  if (!existsSync(BACKUP_ROOT)) {
    console.log(`\n  Backup root not found: ${BACKUP_ROOT}`);
    console.log(SEP + '\n');
    return;
  }

  const all = readdirSync(BACKUP_ROOT, { withFileTypes: true });
  const zips = all.filter(e => !e.isDirectory() && extname(e.name) === '.zip');
  const dirs = all.filter(e => e.isDirectory());

  const validZips = zips.filter(e => {
    const sz = statSync(join(BACKUP_ROOT, e.name)).size;
    return sz > 0;
  });
  const zeroByteZips = zips.filter(e => {
    const sz = statSync(join(BACKUP_ROOT, e.name)).size;
    return sz === 0;
  });

  const zipTotalBytes = validZips.reduce((sum, e) => {
    return sum + statSync(join(BACKUP_ROOT, e.name)).size;
  }, 0);

  const dirTotalBytes = dirs.reduce((sum, e) => {
    return sum + getDirSizeBytes(join(BACKUP_ROOT, e.name));
  }, 0);

  const totalBytes = zipTotalBytes + dirTotalBytes;

  console.log('\n  Backup Inventory');
  console.log(`    Zips (valid)    : ${validZips.length}  (${formatGB(zipTotalBytes)})`);
  if (zeroByteZips.length > 0) {
    console.log(`    Zips (0-byte)   : ${zeroByteZips.length}  ← run a backup to auto-clean`);
  }
  console.log(`    Expanded folders: ${dirs.length}  (${formatGB(dirTotalBytes)})`);
  console.log(`    Total on disk   : ${formatGB(totalBytes)}`);

  if (validZips.length > 0) {
    const avgBytes = zipTotalBytes / validZips.length;
    console.log(`    Avg zip size    : ${formatMB(avgBytes)}`);
  }

  // 3. Retention simulation
  const stemMap = new Map();
  for (const e of validZips) {
    const stem = basename(e.name, '.zip');
    const ts = parseTimestamp(e.name);
    if (ts) stemMap.set(stem, { stem, ts, hasZip: true, hasDir: false });
  }
  for (const e of dirs) {
    const ts = parseTimestamp(e.name);
    if (ts) {
      if (stemMap.has(e.name)) {
        stemMap.get(e.name).hasDir = true;
      } else {
        stemMap.set(e.name, { stem: e.name, ts, hasZip: false, hasDir: true });
      }
    }
  }

  const entries = [...stemMap.values()];
  const { toKeep, toDelete } = simulateRetention(entries);

  console.log('\n  Retention Policy (simulated)');
  console.log(`    Keep all within  : ${KEEP_ALL_DAYS} days`);
  console.log(`    Keep daily within: ${KEEP_DAILY_DAYS} days`);
  console.log(`    Keep weekly within: ${KEEP_WEEKLY_DAYS} days`);
  console.log(`    Would keep  : ${toKeep.size} backup(s)`);
  console.log(`    Would prune : ${toDelete.length} backup(s)`);

  if (toDelete.length > 0) {
    const pruneableBytes = toDelete.reduce((sum, e) => {
      let b = 0;
      const zipPath = join(BACKUP_ROOT, e.stem + '.zip');
      if (existsSync(zipPath)) b += statSync(zipPath).size;
      const dirPath = join(BACKUP_ROOT, e.stem);
      if (existsSync(dirPath)) b += getDirSizeBytes(dirPath);
      return sum + b;
    }, 0);
    console.log(`    Recoverable  : ${formatGB(pruneableBytes)} (on next backup run)`);
  }

  // 4. Oldest / newest backup
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    console.log('\n  Backup Age Range');
    console.log(`    Oldest: ${oldest.ts.toLocaleString()}`);
    console.log(`    Newest: ${newest.ts.toLocaleString()}`);
  }

  // 5. Summary / exit code
  console.log('');

  let exitCode = 0;
  if (freeGB !== null && freeGB < CRITICAL_SPACE_GB) {
    console.log(`  [ERROR] Drive ${driveLetter}: is critically low on space (${freeGB.toFixed(2)} GB free).`);
    console.log('  Run a backup to trigger auto-pruning, or free space manually.\n');
    exitCode = 1;
  } else if (freeGB !== null && freeGB < LOW_SPACE_GB) {
    console.log(`  [WARN] Drive ${driveLetter}: free space is below ${LOW_SPACE_GB} GB.`);
    console.log('  Consider running a backup to trigger auto-pruning.\n');
  } else {
    console.log('  Storage is healthy.\n');
  }

  console.log(SEP + '\n');
  process.exit(exitCode);
}

run();
