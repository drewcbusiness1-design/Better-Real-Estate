// Account type is independent of application approval and membership entitlements.
const policy = require('./policy');
const MIGRATION_ID = 'v29.44-current-approved-affiliates';
function isAffiliateOnlyUser(user) {
  return !!user && user.role !== 'admin' && (user.role === 'affiliate' || (user.roles || []).includes('affiliate'));
}
function migrateCurrentAffiliates(db, now = new Date().toISOString()) {
  db.accountMigrations = db.accountMigrations || [];
  if (db.accountMigrations.some(row => row.id === MIGRATION_ID)) return false;
  const ids = new Set((db.affiliateApplications || []).filter(a => a.status === 'approved').map(a => a.userId));
  const moved = [];
  for (const user of db.users || []) {
    if (!ids.has(user.id) || user.role === 'admin' || policy.isAdminEmail(user.email) || user.demo === true) continue;
    user.affiliatePreviousRoles = Array.isArray(user.roles) ? [...user.roles] : [user.role].filter(Boolean);
    user.role = 'affiliate'; user.roles = ['affiliate']; user.affiliateAccountMigratedAt = now;
    moved.push(user.id);
  }
  db.accountMigrations.push({id:MIGRATION_ID, completedAt:now, userIds:moved});
  return true;
}
// One atomic database statement: only the winning marker insertion migrates users.
// PostgreSQL evaluates eligibility from this statement's snapshot, so future approvals stay unchanged.
const migrationSQL = `
WITH marker AS (
  INSERT INTO kv_accountmigrations (id, data)
  VALUES ($1, jsonb_build_object('id', $1::text, 'completedAt', $2::text))
  ON CONFLICT (id) DO NOTHING RETURNING id
), moved AS (
  UPDATE kv_users u SET data = u.data || jsonb_build_object(
    'affiliatePreviousRoles', COALESCE(u.data->'roles', jsonb_build_array(u.data->>'role')),
    'role', 'affiliate', 'roles', jsonb_build_array('affiliate'), 'affiliateAccountMigratedAt', $2::text
  ), updated_at = now()
  WHERE EXISTS (SELECT 1 FROM marker)
    AND COALESCE(u.data->>'role','') <> 'admin'
    AND COALESCE(u.data->>'demo','false') <> 'true'
    AND NOT (lower(COALESCE(u.data->>'email','')) = ANY($3::text[]))
    AND EXISTS (SELECT 1 FROM kv_affiliateapplications a WHERE a.data->>'userId' = u.data->>'id' AND a.data->>'status' = 'approved')
  RETURNING u.id
)
SELECT id FROM moved`;
module.exports = {isAffiliateOnlyUser, migrateCurrentAffiliates, MIGRATION_ID, migrationSQL};
