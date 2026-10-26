import React from 'react';
import {
  LayoutDashboard,
  PlayCircle,
  UploadCloud,
  FileSpreadsheet,
  AlertOctagon,
  Building2,
  FileBarChart,
  ShieldCheck,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
} from 'lucide-react';
import { useAuth, type UserRole } from '../../context/AuthContext';

export type NavItemKey =
  | 'overview'
  | 'runs'
  | 'ingestion'
  | 'transactions'
  | 'exceptions'
  | 'banks'
  | 'reports'
  | 'audit'
  | 'performance'
  | 'settings';

interface SidebarProps {
  currentView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  openExceptionCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  openExceptionCount = 0,
}) => {
  const { user, setRole } = useAuth();

  const navItems: Array<{
    key: NavItemKey;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }> = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { key: 'runs', label: 'Reconciliation Runs', icon: <PlayCircle className="w-5 h-5 shrink-0" /> },
    { key: 'ingestion', label: 'File Ingestion', icon: <UploadCloud className="w-5 h-5 shrink-0" /> },
    { key: 'transactions', label: 'Transactions & Matches', icon: <FileSpreadsheet className="w-5 h-5 shrink-0" /> },
    {
      key: 'exceptions',
      label: 'Exceptions',
      icon: <AlertOctagon className="w-5 h-5 shrink-0" />,
      badge: openExceptionCount,
      badgeColor: 'bg-rose-600 text-white',
    },
    { key: 'banks', label: 'Bank Connections', icon: <Building2 className="w-5 h-5 shrink-0" /> },
    { key: 'reports', label: 'Reports', icon: <FileBarChart className="w-5 h-5 shrink-0" /> },
    { key: 'audit', label: 'Audit Trail', icon: <ShieldCheck className="w-5 h-5 shrink-0" /> },
    { key: 'performance', label: 'Performance Lab', icon: <Cpu className="w-5 h-5 shrink-0" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 shrink-0" /> },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white tracking-tight text-sm">ReconOps</span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wide uppercase">
                Settlement Guardian
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectView(item.key)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.badgeColor || 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Role Switcher */}
      <div className="border-t border-slate-800 p-3 bg-slate-950/40 shrink-0">
        {!collapsed ? (
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.title}</div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Active Role</span>
                <span className="text-indigo-400 font-bold">{user.role}</span>
              </div>
              <select
                value={user.role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-hidden focus:border-indigo-500"
                aria-label="Switch User Role"
              >
                <option value="VIEWER">VIEWER (Auditor Read-Only)</option>
                <option value="ANALYST">ANALYST (Reconciliation Op)</option>
                <option value="ADMIN">ADMIN (Ops Lead & Config)</option>
                <option value="SYSTEM">SYSTEM (Daemon Agent)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold"
              title={`${user.name} (${user.role})`}
            >
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
