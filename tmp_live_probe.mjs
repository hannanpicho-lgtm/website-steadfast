import { writeFileSync } from 'node:fs';

const BASE='https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
const EMAIL='hannanpicho@gmail.com';
const PASSWORD='343499Hp@87';
const PREFERRED='ugreen';

const run = async () => {
  const tokenRes = await fetch('https://gvqwvuqeenkusdayosty.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const tokenBody = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenBody?.access_token) throw new Error('JWT mint failed');
  const jwt = tokenBody.access_token;

  const req = async (path, method = 'GET', body = undefined, useAdmin = true) => {
    const headers = { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` };
    if (useAdmin) headers['x-user-jwt'] = jwt;
    const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
    return { status: res.status, body: json };
  };

  const runId = Date.now();
  const product = `Live Probe Task ${runId}`;

  const create = await req('/admin/tasks', 'POST', {
    merchant: 'Live Probe Merchant', product, price: 123.45, commission: 0.02, status: 'Active', productUrl: 'https://example.com/live-probe',
  });

  const catalog = await req('/tasks/catalog', 'GET', undefined, false);
  const foundTask = Array.isArray(catalog.body?.tasks) ? catalog.body.tasks.find(t => t?.product === product) : null;

  const vip = await req('/admin/sync-all-users-vip', 'POST', {});

  const usersBefore = await req('/admin/platform-users');
  const users = Array.isArray(usersBefore.body?.users) ? usersBefore.body.users : [];
  const target = users.find(u => u?.username === PREFERRED) || users[0] || null;
  if (!target) throw new Error('No scoped users visible for balance probe');
  const username = String(target.username);
  const before = Number(target.balance || 0);

  const credit = await req(`/admin/platform-users/${encodeURIComponent(username)}/balance-adjustment`, 'POST', {
    mode: 'credit', amount: 2.5, reason: `Live probe credit ${runId}`,
  });

  const usersMid = await req('/admin/platform-users');
  const midUser = (usersMid.body?.users || []).find(u => u?.username === username);
  const afterCredit = Number(midUser?.balance || 0);

  const debit = await req(`/admin/platform-users/${encodeURIComponent(username)}/balance-adjustment`, 'POST', {
    mode: 'debit', amount: 1.1, reason: `Live probe debit ${runId}`,
  });

  const usersAfter = await req('/admin/platform-users');
  const afterUser = (usersAfter.body?.users || []).find(u => u?.username === username);
  const afterDebit = Number(afterUser?.balance || 0);

  const out = {
    jwtMint: { status: tokenRes.status, ok: true },
    step2_createTask: { status: create.status, success: create.body?.success === true, taskId: create.body?.task?.id ?? null, product },
    step2_verifyCatalog: { status: catalog.status, found: !!foundTask, taskId: foundTask?.id ?? null },
    step1_syncAllUsersVip: { status: vip.status, success: vip.body?.success === true, message: vip.body?.message ?? vip.body?.error ?? null },
    balanceProbe: {
      preferredUsername: PREFERRED,
      actualUsername: username,
      preferredVisible: username === PREFERRED,
      usersVisibleCount: users.length,
      beforeBalance: before,
      afterCreditBalance: afterCredit,
      afterDebitBalance: afterDebit,
      credit: { status: credit.status, success: credit.body?.success === true, transactionId: credit.body?.transaction?.id ?? null, referenceId: credit.body?.transaction?.referenceId ?? null },
      debit: { status: debit.status, success: debit.body?.success === true, transactionId: debit.body?.transaction?.id ?? null, referenceId: debit.body?.transaction?.referenceId ?? null },
    },
  };

  writeFileSync('./live_probe_result.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ wrote: 'live_probe_result.json' }));
};

run().catch((e) => {
  writeFileSync('./live_probe_result.json', JSON.stringify({ error: e?.message || String(e) }, null, 2), 'utf8');
  console.error('ERR:' + (e?.message || String(e)));
  process.exit(1);
});
