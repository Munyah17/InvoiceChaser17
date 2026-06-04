// Role-Based Access Control utilities
// Centralized, modular — do not hardcode roles elsewhere

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
}

export const ROLE_HIERARCHY = {
  [ROLES.USER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPER_ADMIN]: 3,
}

/**
 * Check if a role meets a minimum required role.
 * Super admin passes all checks. Admin passes admin + user checks.
 */
export function hasRole(userRole, requiredRole) {
  if (!userRole || !requiredRole) return false
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  return userLevel >= requiredLevel
}

export function isAdmin(role) {
  return hasRole(role, ROLES.ADMIN)
}

export function isSuperAdmin(role) {
  return hasRole(role, ROLES.SUPER_ADMIN)
}

export function canAccessAdmin(role) {
  return isAdmin(role) || isSuperAdmin(role)
}

/**
 * Resolve role from either profiles.role or legacy users.is_admin
 * This preserves backward compatibility during migration.
 */
export function resolveRole(profileRole, isAdminLegacy) {
  if (profileRole === ROLES.SUPER_ADMIN || profileRole === ROLES.ADMIN || profileRole === ROLES.USER) {
    return profileRole
  }
  if (isAdminLegacy) return ROLES.ADMIN
  return ROLES.USER
}
