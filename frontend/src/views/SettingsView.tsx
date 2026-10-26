import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Clock,
  UserCheck,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, setRole, canConfigureBanks } = useAuth();

  // Engine Settings Form State
  const [amountTolerance, setAmountTolerance] = useState('0.05');
  const [dateWindowDays, setDateWindowDays] = useState('1');
  const [confidenceThreshold, setConfidenceThreshold] = useState('95');
  const [tier1Mins, setTier1Mins] = useState('30');
  const [tier2Mins, setTier2Mins] = useState('120');
  const [tier3Mins, setTier3Mins] = useState('240');
  const [tier4Mins, setTier4Mins] = useState('1440');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">ReconOps System Configuration & Access Control</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tune matching algorithm tolerances, SLA escalation timers, and review Role-Based Access Control policies
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Engine parameters and SLA thresholds updated successfully!</span>
        </div>
      )}

      {/* Role Switcher & Active Identity */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Active Operator Session & Role Simulation
            </h3>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
            {user.role}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Session Identity</div>
            <div className="font-bold text-slate-900 text-sm">{user.name}</div>
            <div className="text-slate-600">{user.email}</div>
            <div className="text-slate-500">{user.title}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Switch Simulation Role</div>
            <select
              value={user.role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold text-xs"
            >
              <option value="VIEWER">VIEWER — Auditor Read-Only (Cannot trigger runs or mutate state)</option>
              <option value="ANALYST">ANALYST — Reconciliation Operator (Uploads, manual matches, exception resolution)</option>
              <option value="ADMIN">ADMIN — Operations Lead (Full mapping configuration, tolerances, and rule adjustments)</option>
              <option value="SYSTEM">SYSTEM — Automated Engine Daemon</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Test UI permissions and disabled buttons in real-time by switching between auditor, analyst, and admin personas.
            </p>
          </div>
        </div>
      </div>

      {/* Engine Tolerances & Matching Parameters */}
      <form onSubmit={handleSave} className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Global Settlement Engine Tolerances
            </h3>
          </div>
          {!canConfigureBanks && (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
              <Lock className="w-3 h-3" />
              <span>Read-Only (Requires ADMIN role to modify)</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Global Amount Tolerance (Currency Units):
            </label>
            <input
              type="number"
              step="0.01"
              disabled={!canConfigureBanks}
              value={amountTolerance}
              onChange={(e) => setAmountTolerance(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Variance ceiling for automatic Pass 2 fuzzy matches.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Date Window Tolerance (Days):
            </label>
            <input
              type="number"
              min="0"
              max="7"
              disabled={!canConfigureBanks}
              value={dateWindowDays}
              onChange={(e) => setDateWindowDays(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Acceptable clearing transit and weekend lag.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confidence Score Auto-Match Threshold (%):
            </label>
            <input
              type="number"
              min="80"
              max="100"
              disabled={!canConfigureBanks}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Minimum score required to avoid analyst review.</p>
          </div>
        </div>

        {/* 4-Tier SLA Escalation Thresholds */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              4-Tier SLA Escalation Deadlines
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">Tier 1: Auto / Rules</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Routine fee differences</p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  disabled={!canConfigureBanks}
                  value={tier1Mins}
                  onChange={(e) => setTier1Mins(e.target.value)}
                  className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs"
                />
                <span className="text-slate-500">mins</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">Tier 2: Analyst Workbench</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Discrepancy resolution</p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  disabled={!canConfigureBanks}
                  value={tier2Mins}
                  onChange={(e) => setTier2Mins(e.target.value)}
                  className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs"
                />
                <span className="text-slate-500">mins</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">Tier 3: Supervisor Lead</span>
              <p className="text-[10px] text-slate-500 mt-0.5">High-value breaks</p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  disabled={!canConfigureBanks}
                  value={tier3Mins}
                  onChange={(e) => setTier3Mins(e.target.value)}
                  className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs"
                />
                <span className="text-slate-500">mins</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">Tier 4: Director Escalate</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Regulatory holds</p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  disabled={!canConfigureBanks}
                  value={tier4Mins}
                  onChange={(e) => setTier4Mins(e.target.value)}
                  className="w-20 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs"
                />
                <span className="text-slate-500">mins</span>
              </div>
            </div>
          </div>
        </div>

        {canConfigureBanks && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Settings</span>
            </button>
          </div>
        )}
      </form>

      {/* RBAC Access Matrix Reference */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Role-Based Access Control (RBAC) Entitlements
          </h3>
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">View Reports & Logs</th>
                <th className="py-2.5 px-4">Upload Statement Feeds</th>
                <th className="py-2.5 px-4">Trigger Reconciliation</th>
                <th className="py-2.5 px-4">Manual Match Overrides</th>
                <th className="py-2.5 px-4">Resolve Exceptions</th>
                <th className="py-2.5 px-4">Configure Banks & Tolerances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-bold text-slate-900">VIEWER</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-bold text-slate-900">ANALYST</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-slate-400">No</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-bold text-slate-900">ADMIN</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
                <td className="py-2.5 px-4 text-emerald-700 font-bold">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
