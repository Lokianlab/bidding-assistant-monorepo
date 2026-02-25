import type { UserRole, RolePermission } from './types';

export const ROLE_DEFINITIONS: RolePermission[] = [
  {
    role: 'admin',
    label: '管理者（Jin）',
    permissions: ['view_all', 'decide', 'settings', 'delete', 'view_intel', 'search_kb', 'import_case', 'upload_rfp'],
  },
  {
    role: 'planner',
    label: '企劃人員',
    permissions: ['view_cases', 'view_intel', 'search_kb'],
  },
  {
    role: 'staff',
    label: '行政人員',
    permissions: ['view_cases', 'import_case', 'upload_rfp'],
  },
];

export function hasPermission(role: UserRole, permission: string): boolean {
  const def = ROLE_DEFINITIONS.find(r => r.role === role);
  return def?.permissions.includes(permission) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const def = ROLE_DEFINITIONS.find(r => r.role === role);
  return def?.label ?? role;
}

// Role is stored in localStorage for MVP (no real auth)
const ROLE_STORAGE_KEY = 'bidding-assistant-role';

export function getCurrentRole(): UserRole {
  if (typeof window === 'undefined') return 'admin';
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  if (stored === 'planner' || stored === 'staff' || stored === 'admin') return stored;
  return 'admin'; // default
}

export function setCurrentRole(role: UserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}
