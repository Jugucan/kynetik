export type UserRole = 'superadmin' | 'admin' | 'monitor' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  center?: string; // 'Arbúcies' o 'Sant Hilari'
  monitorId?: string; // Si és 'user', ID del seu monitor
  createdAt: Date;
  updatedAt: Date;
}

export const ROLE_NAMES: Record<UserRole, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  monitor: 'Monitor',
  user: 'Usuari'
};

export const ROLE_PERMISSIONS = {
  superadmin: {
    canManageAllData: true,
    canManageUsers: true,
    canManageMonitors: true,
    canManageAdmins: true,
    canViewAllCenters: true,
  },
  admin: {
    canManageAllData: true,
    canManageUsers: true,
    canManageMonitors: true,
    canManageAdmins: false,
    canViewAllCenters: true,
  },
  monitor: {
    canManageAllData: false,
    canManageUsers: true,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
  },
  user: {
    canManageAllData: false,
    canManageUsers: false,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
  }
};
