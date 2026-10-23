import { AuthUser, UserRole } from '@/types';

export interface DemoCredential {
  email: string;
  password: string;
  user: AuthUser;
  description: string;
}

export const DEMO_CREDENTIALS: Record<UserRole, DemoCredential> = {
  'Super Admin': {
    email: 'superadmin@trackwe.demo',
    password: 'Trackwe@123',
    description: 'Full platform access across all UAE regions, user management, device catalog & platform settings',
    user: {
      id: 'usr-superadmin',
      name: 'Tariq Al Hashimi',
      email: 'superadmin@trackwe.demo',
      role: 'Super Admin',
      team: 'Executive Fleet Operations',
      avatar: 'TH',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80'
    }
  },
  'Admin': {
    email: 'admin@trackwe.demo',
    password: 'Trackwe@123',
    description: 'UAE Fleet manager with full control over vehicles, drivers, expenses, tasks, reports & diagnostics',
    user: {
      id: 'usr-admin',
      name: 'Mariam Al Falasi',
      email: 'admin@trackwe.demo',
      role: 'Admin',
      team: 'Logistics Operations UAE',
      avatar: 'MF',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80'
    }
  },
  'Manager': {
    email: 'manager@trackwe.demo',
    password: 'Trackwe@123',
    description: 'Operations supervisor managing live fleet tracking, route history, driver safety & task assignments',
    user: {
      id: 'usr-manager',
      name: 'Rashid Al Nuaimi',
      email: 'manager@trackwe.demo',
      role: 'Manager',
      team: 'Dispatch & Fleet Monitoring',
      avatar: 'RN',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80'
    }
  },
  'Employee': {
    email: 'employee@trackwe.demo',
    password: 'Trackwe@123',
    description: 'Field driver/operator with restricted view to assigned vehicle, assigned tasks & expense filing',
    user: {
      id: 'usr-employee',
      name: 'Zayed Al Mansoori',
      email: 'employee@trackwe.demo',
      role: 'Employee',
      team: 'Delivery Operations Dubai',
      avatar: 'ZM',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      assignedVehicleId: 'v-dxb-01' // Assigned to Dubai A-10842 (Volvo FH16 refrigerated)
    }
  }
};

export type NavItemKey =
  | 'dashboard'
  | 'tracking'
  | 'vehicles'
  | 'vehicle-detail'
  | 'drivers'
  | 'trips'
  | 'geofences'
  | 'fuel'
  | 'temperature'
  | 'diagnostics'
  | 'behavior'
  | 'cameras'
  | 'immobilizer'
  | 'tasks'
  | 'expenses'
  | 'alerts'
  | 'reports'
  | 'users'
  | 'integrations'
  | 'settings';

export const ROLE_PERMISSIONS: Record<UserRole, {
  allowedPages: NavItemKey[];
  canManageUsers: boolean;
  canApproveExpenses: boolean;
  canSimulateImmobilizer: boolean;
  canAddVehicle: boolean;
  canAddDriver: boolean;
  canCreateTasks: boolean;
  canViewAllVehicles: boolean;
  canExportReports: boolean;
  canResetData: boolean;
}> = {
  'Super Admin': {
    allowedPages: [
      'dashboard', 'tracking', 'vehicles', 'vehicle-detail', 'drivers', 'trips', 'geofences',
      'fuel', 'temperature', 'diagnostics', 'behavior', 'cameras', 'immobilizer',
      'tasks', 'expenses', 'alerts', 'reports', 'users', 'integrations', 'settings'
    ],
    canManageUsers: true,
    canApproveExpenses: true,
    canSimulateImmobilizer: true,
    canAddVehicle: true,
    canAddDriver: true,
    canCreateTasks: true,
    canViewAllVehicles: true,
    canExportReports: true,
    canResetData: true
  },
  'Admin': {
    allowedPages: [
      'dashboard', 'tracking', 'vehicles', 'vehicle-detail', 'drivers', 'trips', 'geofences',
      'fuel', 'temperature', 'diagnostics', 'behavior', 'cameras', 'immobilizer',
      'tasks', 'expenses', 'alerts', 'reports', 'users', 'integrations', 'settings'
    ],
    canManageUsers: true,
    canApproveExpenses: true,
    canSimulateImmobilizer: true,
    canAddVehicle: true,
    canAddDriver: true,
    canCreateTasks: true,
    canViewAllVehicles: true,
    canExportReports: true,
    canResetData: true
  },
  'Manager': {
    allowedPages: [
      'dashboard', 'tracking', 'vehicles', 'vehicle-detail', 'drivers', 'trips', 'geofences',
      'fuel', 'temperature', 'diagnostics', 'behavior',
      'tasks', 'expenses', 'alerts', 'reports'
    ],
    canManageUsers: false,
    canApproveExpenses: true,
    canSimulateImmobilizer: false,
    canAddVehicle: false,
    canAddDriver: false,
    canCreateTasks: true,
    canViewAllVehicles: true,
    canExportReports: true,
    canResetData: false
  },
  'Employee': {
    allowedPages: [
      'dashboard', 'vehicle-detail', 'tasks', 'expenses', 'alerts'
    ],
    canManageUsers: false,
    canApproveExpenses: false,
    canSimulateImmobilizer: false,
    canAddVehicle: false,
    canAddDriver: false,
    canCreateTasks: false,
    canViewAllVehicles: false,
    canExportReports: false,
    canResetData: false
  }
};
