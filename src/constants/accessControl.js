export const ROLES = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
});

export const VIEW_ACCESS = Object.freeze({
  pos: [ROLES.ADMIN, ROLES.STAFF],
  members: [ROLES.ADMIN, ROLES.STAFF],
  inventory: [ROLES.ADMIN, ROLES.STAFF],
  sales: [ROLES.ADMIN, ROLES.STAFF],
  dashboard: [ROLES.ADMIN],
  archive: [ROLES.ADMIN],
  staffAccounts: [ROLES.ADMIN],
});

export const CAPABILITIES = Object.freeze({
  manageAccounts: [ROLES.ADMIN],
  manageCatalog: [ROLES.ADMIN, ROLES.STAFF],
  adjustStock: [ROLES.ADMIN, ROLES.STAFF],
  createOrUpdateMembers: [ROLES.ADMIN, ROLES.STAFF],
  deleteMembers: [ROLES.ADMIN],
  createTransactions: [ROLES.ADMIN, ROLES.STAFF],
  editTransactions: [ROLES.ADMIN, ROLES.STAFF],
  deleteTransactions: [ROLES.ADMIN],
  manageArchives: [ROLES.ADMIN],
});

export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

export function canAccessView(role, view) {
  return VIEW_ACCESS[view]?.includes(role) ?? false;
}

export function hasCapability(role, capability) {
  return CAPABILITIES[capability]?.includes(role) ?? false;
}
