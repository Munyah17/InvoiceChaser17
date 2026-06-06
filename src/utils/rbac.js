// Role-Based Access Control — single source of truth
// Never hardcode role strings elsewhere; import from here.

export const ROLES = {
  CLIENT:      'user',        // paying customers
  ADMIN:       'admin',       // staff — full business ops, no infra access
  SUPER_ADMIN: 'super_admin', // developer/CEO — root access, lifetime
}

export const ROLE_HIERARCHY = {
  [ROLES.CLIENT]:      1,
  [ROLES.ADMIN]:       2,
  [ROLES.SUPER_ADMIN]: 3,
}

export function hasRole(userRole, requiredRole) {
  if (!userRole || !requiredRole) return false
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export const isClient      = (role) => !!role && ROLE_HIERARCHY[role] >= 1
export const isAdmin        = (role) => hasRole(role, ROLES.ADMIN)
export const isSuperAdmin   = (role) => hasRole(role, ROLES.SUPER_ADMIN)
export const canAccessAdmin = (role) => isAdmin(role) || isSuperAdmin(role)

// ── Granular capability checks ─────────────────────────────────────────────

// Client management — admin + super_admin
export const canManageClients  = (role) => isAdmin(role)

// Revenue & analytics — admin + super_admin
export const canViewRevenue    = (role) => isAdmin(role)

// Staff management — super_admin only
export const canManageStaff    = (role) => isSuperAdmin(role)

// Platform config (feature flags, maintenance, credentials) — super_admin only
export const canConfigPlatform = (role) => isSuperAdmin(role)

// Revoke any API key — admin can pause/revoke client keys; super_admin can revoke all
export const canRevokeApiKeys  = (role) => isAdmin(role)

// Delete accounts — admin can delete clients; super_admin can delete anyone
export const canDeleteAccounts = (role) => isAdmin(role)

// Promote / demote staff roles — super_admin only
export const canChangeRoles    = (role) => isSuperAdmin(role)

/**
 * Resolve role from profiles.role or legacy users.is_admin flag.
 */
export function resolveRole(profileRole, isAdminLegacy) {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT].includes(profileRole)) {
    return profileRole
  }
  if (isAdminLegacy) return ROLES.ADMIN
  return ROLES.CLIENT
}
