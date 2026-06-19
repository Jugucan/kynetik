export type UserRole = 'superadmin' | 'admin' | 'monitor' | 'user';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  gender?: string | null;
  center?: string;
  centers?: string[];        // NOU: centres on treballa l'instructor (array per multi-centre)
  monitorId?: string;
  status: UserStatus;
  statusUpdatedAt?: Date;
  statusUpdatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingUserRequest {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  createdAt: Date;
  status: UserStatus;
}

export const ROLE_NAMES: Record<UserRole, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  monitor: 'Monitor',
  user: 'Usuari'
};

export const STATUS_NAMES: Record<UserStatus, string> = {
  pending: 'Pendent d\'aprovació',
  approved: 'Aprovat',
  rejected: 'Rebutjat'
};

export const STATUS_COLORS: Record<UserStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  approved: 'text-green-600 bg-green-50 border-green-200',
  rejected: 'text-red-600 bg-red-50 border-red-200'
};

export const ROLE_PERMISSIONS = {
  superadmin: {
    canManageAllData: true,
    canManageUsers: true,
    canManageMonitors: true,
    canManageAdmins: true,
    canViewAllCenters: true,
    canApproveUsers: true,
  },
  admin: {
    canManageAllData: true,
    canManageUsers: true,
    canManageMonitors: true,
    canManageAdmins: false,
    canViewAllCenters: true,
    canApproveUsers: true,
  },
  monitor: {
    canManageAllData: false,
    canManageUsers: true,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
    canApproveUsers: false,
  },
  user: {
    canManageAllData: false,
    canManageUsers: false,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
    canApproveUsers: false,
  }
};
