export type UserRole = 'admin' | 'planner' | 'staff';

export interface RolePermission {
  role: UserRole;
  label: string;
  permissions: string[];
}
