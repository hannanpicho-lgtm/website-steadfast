const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjU0MzEsImV4cCI6MjA1OTA0MTQzMX0.Ej9hMwIm7fimUWCHXMXW0ZQQ0bkhrGIMVax_vkZqJtE';

async function go() {
  // Use the public snapshot endpoint without auth to get catalog
  // Try the health endpoint first to confirm connectivity
  const h = await fetch(BASE + '/health', { headers: { 'Authorization': 'Bearer ' + KEY } });
  const hd = await h.json();
  console.log('Health:', hd.status);

  // Try fetching the KV debug endpoint
  const r = await fetch(BASE + '/debug/kv-stats', { headers: { 'Authorization': 'Bearer ' + KEY } });
  if (r.ok) {
    const d = await r.json();
    console.log('KV stats:', JSON.stringify(d));
  } else {
    console.log('No debug endpoint, status:', r.status);
  }

  // Try listing all task catalog via admin with the platform access token
  // Use a public route that returns catalog - the starting snapshot but with a known user
  // Actually let's use the restore session endpoint instead 
  const restoreR = await fetch(BASE + '/auth/session/restore', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log('Restore status:', restoreR.status);
  const restoreText = await restoreR.text();
  console.log('Restore:', restoreText.substring(0, 200));
}
go().catch(e => console.error(e.message));
