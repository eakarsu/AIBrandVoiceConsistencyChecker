const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  const email = String(process.env.DEMO_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.DEMO_PASSWORD || process.env.ADMIN_PASSWORD || '');
  const tenantId = String(process.env.GOVERNANCE_TENANT_ID || process.env.TENANT_ID || `user:${email}`);
  if (!email || password.length < 12) throw new Error('Local demo credentials are incomplete');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users(name,email,password_hash,role,tenant_id) VALUES($1,$2,$3,'admin',$4)
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='admin',tenant_id=EXCLUDED.tenant_id`,
    ['Runtime Administrator', email, hash, tenantId],
  );
  await pool.end();
  console.log('Provisioned local demo administrator.');
}
main().catch((error) => { console.error(error.message); process.exit(1); });
