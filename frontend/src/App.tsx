import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, type NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Modal } from './components/ui/Modal';
import { api, type DashboardMetrics } from './api/client';

// Views
import { OverviewView } from './views/OverviewView';
import { ReconciliationRunsView } from './views/ReconciliationRunsView';
import { FileIngestionView } from './views/FileIngestionView';
import { TransactionsView } from './views/TransactionsView';
import { ExceptionsView } from './views/ExceptionsView';
import { BanksView } from './views/BanksView';
import { ReportsView } from './views/ReportsView';
import { AuditTrailView } from './views/AuditTrailView';
import { PerformanceLabView } from './views/PerformanceLabView';
import { SettingsView } from './views/SettingsView';

const ReconOpsShell: React.FC = () => {
  const { user, canTriggerRecon } = useAuth();
  const [currentView, setCurrentView] = useState<NavItemKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Trigger Reconciliation Modal
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [triggerBankId, setTriggerBankId] = useState('ALL_BANKS');
  const [triggerDateFrom, setTriggerDateFrom] = useState('2026-10-25');
  const [triggerDateTo, setTriggerDateTo] = useState('2026-10-26');
  const [triggerCurrency, setTriggerCurrency] = useState('USD');
  const [triggerAmountTolerance, setTriggerAmountTolerance] = useState(0.05);
  const [triggerDateTolerance, setTriggerDateTolerance] = useState(1);
  const [triggerSubmitting, setTriggerSubmitting] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState<any | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const loadHeaderMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHeaderMetrics();
  }, [loadHeaderMetrics]);

  const handleExecuteTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTriggerSubmitting(true);
      setTriggerError(null);
      const run = await api.triggerReconciliation({
        bank_id: triggerBankId,
        date_from: triggerDateFrom,
        date_to: triggerDateTo,
        currency: triggerCurrency,
        amount_tolerance: Number(triggerAmountTolerance),
        date_tolerance_days: Number(triggerDateTolerance),
        initiated_by: user.email,
      });
      setTriggerSuccess(run);
      loadHeaderMetrics();
      setTimeout(() => {
        setTriggerModalOpen(false);
        setTriggerSuccess(null);
        setCurrentView('runs');
      }, 1500);
    } catch (err: any) {
      setTriggerError(err.message || 'Failed to trigger reconciliation run.');
    } finally {
      setTriggerSubmitting(false);
    }
  };

  const getHeaderProps = () => {
    switch (currentView) {
      case 'overview':
        return {
          title: 'Settlement Operations Overview',
          subtitle: 'Live multi-bank settlement status, match accuracy, and automated exception routing',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'runs':
        return {
          title: 'Reconciliation Execution Pipeline',
          subtitle: '3-pass matching algorithm execution history, stage latencies, and detailed break reports',
          primaryActionLabel: 'Start New Run',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'ingestion':
        return {
          title: 'Statement File Ingestion Gateway',
          subtitle: 'Multi-bank file parsing: Bank CSV, SWIFT MT940, and ISO 20022 CAMT.053',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'transactions':
        return {
          title: 'Transaction Explorer & Matching Workbench',
          subtitle: 'Internal ledger vs external bank statements side-by-side comparison and variance inspection',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'exceptions':
        return {
          title: 'Exception Management Workbench',
          subtitle: '4-Tier SLA escalation routing across 18 discrepancy categories with justification audit logs',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'banks':
        return {
          title: 'Bank Gateways & Schema Configurations',
          subtitle: 'Multi-bank partner connections, statement column mappings, and tolerance windows',
          primaryActionLabel: 'Upload Statement',
          primaryActionIcon: 'upload' as const,
          onPrimaryAction: () => setCurrentView('ingestion'),
        };
      case 'reports':
        return {
          title: 'Financial Reports & Compliance Statements',
          subtitle: 'Executive summaries, exception ageing, counterparty quality, and direct CSV exports',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'audit':
        return {
          title: 'Cryptographic Audit Trail Ledger',
          subtitle: 'Immutable SHA-256 Merkle hash chain documenting all actions and state diffs',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'performance':
        return {
          title: 'Performance Lab & Stress Benchmarks',
          subtitle: '100k+ record stress testing, parser velocity validation, and memory footprint tests',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      case 'settings':
        return {
          title: 'System Configuration & RBAC',
          subtitle: 'Engine tolerance parameters, SLA escalation timers, and role permissions',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
      default:
        return {
          title: 'ReconOps Settlement Guardian',
          subtitle: 'Automated Multi-Bank Settlement Reconciliation Engine',
          primaryActionLabel: 'Run Reconciliation',
          primaryActionIcon: 'run' as const,
          onPrimaryAction: () => setTriggerModalOpen(true),
        };
    }
  };

  const headerConfig = getHeaderProps();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        openExceptionCount={metrics?.summary.open_exceptions || 0}
      />

      {/* Main Workspace Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          reportingPeriod={metrics?.reporting_period || 'Today (Intraday Settlement Cycle)'}
          lastRefresh={metrics?.last_refresh_time}
          reconciliationStatus={metrics?.reconciliation_status || 'OPERATIONAL'}
          onRefresh={loadHeaderMetrics}
          isRefreshing={isRefreshing}
          onPrimaryAction={headerConfig.onPrimaryAction}
          primaryActionLabel={headerConfig.primaryActionLabel}
          primaryActionIcon={headerConfig.primaryActionIcon}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'overview' && (
            <OverviewView
              onNavigate={(v) => setCurrentView(v)}
              onOpenTriggerModal={() => setTriggerModalOpen(true)}
            />
          )}
          {currentView === 'runs' && (
            <ReconciliationRunsView onNavigateToExceptions={() => setCurrentView('exceptions')} />
          )}
          {currentView === 'ingestion' && (
            <FileIngestionView onNavigateToRecon={() => setCurrentView('runs')} />
          )}
          {currentView === 'transactions' && <TransactionsView />}
          {currentView === 'exceptions' && <ExceptionsView />}
          {currentView === 'banks' && <BanksView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'audit' && <AuditTrailView />}
          {currentView === 'performance' && <PerformanceLabView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Trigger Reconciliation Modal */}
      {triggerModalOpen && (
        <Modal
          isOpen={triggerModalOpen}
          onClose={() => setTriggerModalOpen(false)}
          title="Launch Settlement Reconciliation Run"
          subtitle="Execute automated 3-pass multi-bank matching against core ledger transactions"
          maxWidth="lg"
        >
          {triggerSuccess ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h4 className="text-base font-bold text-slate-900">Reconciliation Run Initiated</h4>
              <p className="text-xs text-slate-600">
                Run ID: <span className="font-mono font-bold text-indigo-600">{triggerSuccess.run_number}</span>
              </p>
              <p className="text-xs text-slate-500">Redirecting to Reconciliation Runs pipeline view...</p>
            </div>
          ) : (
            <form onSubmit={handleExecuteTrigger} className="space-y-4 text-xs">
              {triggerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {triggerError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Bank Gateway:</label>
                <select
                  value={triggerBankId}
                  onChange={(e) => setTriggerBankId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="ALL_BANKS">All Connected Partner Banks (Global Intraday Cycle)</option>
                  <option value="JPMC">JPMorgan Chase (JPMC)</option>
                  <option value="BARC">Barclays Bank UK (BARC)</option>
                  <option value="CITI">Citibank N.A. (CITI)</option>
                  <option value="HSBC">HSBC Global (HSBC)</option>
                  <option value="DB">Deutsche Bank (DB)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Settlement Date:</label>
                  <input
                    type="date"
                    value={triggerDateFrom}
                    onChange={(e) => setTriggerDateFrom(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Settlement Date:</label>
                  <input
                    type="date"
                    value={triggerDateTo}
                    onChange={(e) => setTriggerDateTo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Settlement Currency:</label>
                  <select
                    value={triggerCurrency}
                    onChange={(e) => setTriggerCurrency(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Tolerance:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={triggerAmountTolerance}
                    onChange={(e) => setTriggerAmountTolerance(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Window (Days):</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={triggerDateTolerance}
                    onChange={(e) => setTriggerDateTolerance(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 space-y-1">
                <span className="font-bold">Automated 3-Pass Matching Pipeline:</span>
                <p className="text-[11px] text-indigo-800">
                  Pass 1: Exact reference & amount match • Pass 2: Fuzzy amount & date window • Pass 3: Exception categorization into 4-tier SLA queue.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTriggerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggerSubmitting || !canTriggerRecon}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {triggerSubmitting ? 'Starting Engine...' : 'Run Pipeline'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ReconOpsShell />
    </AuthProvider>
  );
}
