import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'VIEWER' | 'ANALYST' | 'ADMIN' | 'SYSTEM';

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  title: string;
}

interface AuthContextType {
  user: UserProfile;
  setRole: (role: UserRole) => void;
  canResolveExceptions: boolean;
  canManualMatch: boolean;
  canTriggerRecon: boolean;
  canConfigureBanks: boolean;
  canExportReports: boolean;
  isReadOnly: boolean;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  VIEWER: {
    name: 'David Miller',
    email: 'david.miller@auditors.internal',
    role: 'VIEWER',
    title: 'External Compliance Auditor',
  },
  ANALYST: {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@reconops.internal',
    role: 'ANALYST',
    title: 'Senior Reconciliation Analyst',
  },
  ADMIN: {
    name: 'Marcus Vance',
    email: 'marcus.vance@reconops.internal',
    role: 'ADMIN',
    title: 'Head of Settlement Operations',
  },
  SYSTEM: {
    name: 'Daemon Service (Cron)',
    email: 'scheduler@reconops.system',
    role: 'SYSTEM',
    title: 'Automated Daemon Agent',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('ANALYST');

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const user = DEFAULT_USERS[role];

  const canResolveExceptions = role === 'ANALYST' || role === 'ADMIN';
  const canManualMatch = role === 'ANALYST' || role === 'ADMIN';
  const canTriggerRecon = role === 'ANALYST' || role === 'ADMIN' || role === 'SYSTEM';
  const canConfigureBanks = role === 'ADMIN';
  const canExportReports = role === 'VIEWER' || role === 'ANALYST' || role === 'ADMIN';
  const isReadOnly = role === 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        setRole,
        canResolveExceptions,
        canManualMatch,
        canTriggerRecon,
        canConfigureBanks,
        canExportReports,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
