const isCi = String(process.env.CI ?? '').toLowerCase() === 'true';
const enforceFlag = String(process.env.ENFORCE_ADMIN_ENDPOINT_COVERAGE ?? '').toLowerCase() === 'true';
const adminJwt = String(process.env.SUPABASE_ADMIN_TEST_JWT ?? '').trim();

if (!isCi && !enforceFlag) {
  console.log('Skipping admin endpoint coverage JWT enforcement outside CI.');
  process.exit(0);
}

if (!adminJwt) {
  console.error('SUPABASE_ADMIN_TEST_JWT is required for admin endpoint coverage in CI/predeploy enforcement.');
  process.exit(1);
}

console.log('Admin endpoint coverage JWT is present.');