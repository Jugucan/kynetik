export type UserRole = 'superadmin' | 'admin' | 'monitor' | 'user';

// NOU: estat de l'usuari dins el sistema
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  firstName?: string;        // NOU: nom
  lastName?: string;         // NOU: cognoms
  phone?: string;            // NOU: telèfon
  birthDate?: string;        // NOU: data naixement (format YYYY-MM-DD)
  gender?: string | null;
  center?: string;
  monitorId?: string;
  status: UserStatus;        // NOU: estat de la sol·licitud
  statusUpdatedAt?: Date;    // NOU: quan es va aprovar/rebutjar
  statusUpdatedBy?: string;  // NOU: qui ho va aprovar/rebutjar (uid)
  createdAt: Date;
  updatedAt: Date;
}

// NOU: tipus específic per les sol·licituds pendents (vista simplificada)
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
    canApproveUsers: true,     // NOU
  },
  admin: {
    canManageAllData: true,
    canManageUsers: true,
    canManageMonitors: true,
    canManageAdmins: false,
    canViewAllCenters: true,
    canApproveUsers: true,     // NOU
  },
  monitor: {
    canManageAllData: false,
    canManageUsers: true,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
    canApproveUsers: false,    // NOU
  },
  user: {
    canManageAllData: false,
    canManageUsers: false,
    canManageMonitors: false,
    canManageAdmins: false,
    canViewAllCenters: false,
    canApproveUsers: false,    // NOU
  }
};
