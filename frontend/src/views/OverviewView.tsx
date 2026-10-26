import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  DollarSign,
  PlayCircle,
} from 'lucide-react';
import { api, type DashboardMetrics } from '../api/client';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/StatusBadge';

interface OverviewViewProps {
  onNavigate: (viewKey: any) => void;
  onOpenTriggerModal?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate, onOpenTriggerModal }) => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardMetrics();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-lg border border-slate-200 animate-pulse p-4" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-lg border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <span>Connection Error</span>
          </div>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { summary, actionable_alerts, charts } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {onOpenTriggerModal && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg p-3.5">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-indigo-950">Intraday Settlement Cycle Active</p>
              <p className="text-xs text-indigo-700">Trigger multi-pass reconciliation engine across all active partner banks.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenTriggerModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Launch Run Now
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <section aria-label="Summary Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Records Processed"
            value={summary.records_processed.toLocaleString()}
            tooltip="Total transaction lines ingested across internal general ledger and bank settlement statements for the active cycle."
            icon={<FileSpreadsheet className="w-5 h-5" />}
            trend={{ positive: true, text: '100% feed coverage' }}
          />
          <KpiCard
            label="Match Rate"
            value={`${summary.match_rate.toFixed(1)}%`}
            tooltip="Percentage of records successfully matched automatically without human intervention (Target: > 98.0%)."
            icon={<TrendingUp className="w-5 h-5" />}
            accent="success"
            trend={{ positive: true, text: '+0.4% vs 7-day avg' }}
          />
          <KpiCard
            label="Open Exceptions"
            value={summary.open_exceptions}
            tooltip="Discrepancies identified during reconciliation requiring analyst review, escalation, or bank inquiry."
            icon={<AlertOctagon className="w-5 h-5 text-amber-500" />}
            accent={summary.open_exceptions > 10 ? 'danger' : 'warning'}
            trend={{ positive: false, text: '18 categories tracked' }}
          />
          <KpiCard
            label="Amount Under Review"
            value={`$${(summary.amount_under_review / 1000).toFixed(1)}k`}
            subValue={`$${summary.amount_under_review.toLocaleString()}`}
            tooltip="Aggregate absolute financial exposure currently held in open or escalated exceptions."
            icon={<DollarSign className="w-5 h-5 text-slate-500" />}
            accent="warning"
          />
          <KpiCard
            label="SLA Compliance"
            value={`${summary.sla_compliance}%`}
            tooltip="Percentage of exceptions resolved within contractual SLA window (Target: 95.0%)."
            icon={<Clock className="w-5 h-5 text-indigo-500" />}
            accent="default"
            trend={{ positive: true, text: 'Within SLA targets' }}
          />
          <KpiCard
            label="Active Banks"
            value={summary.active_banks_count}
            subValue="5 Integrated"
            tooltip="Number of configured settlement bank gateways actively monitored (JPMC, Barclays, Citi, HSBC, DB)."
            icon={<Building2 className="w-5 h-5" />}
            accent="default"
          />
        </div>
      </section>

      {/* Prioritized Actionable Alerts */}
      {actionable_alerts && actionable_alerts.length > 0 && (
        <section aria-label="Prioritized Actionable Alerts">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Prioritised Actionable Alerts ({actionable_alerts.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Sorted by financial impact and SLA urgency</span>
            </div>

            <div className="divide-y divide-slate-100">
              {actionable_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{alert.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700">
                        {alert.bank_id}
                      </span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {alert.sla_warning}
                      </span>
                      <span className="text-xs text-slate-500">• {alert.amount}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>
                    <div className="text-xs text-indigo-700 font-medium flex items-center gap-1 mt-1">
                      <span>Action required:</span>
                      <span className="text-slate-700">{alert.recommended_action}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('exceptions')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Charts & Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Rate Trend */}
        <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">7-Day Reconciliation Rate & Record Volume</h2>
              <p className="text-xs text-slate-500 mt-0.5">Automated match rate trend compared against 98% SLA target</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" /> Match Rate (%)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Ingested Volume
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {charts.match_rate_trend.map((pt) => {
              const barWidth = `${pt.rate}%`;
              return (
                <div key={pt.date} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-600">{pt.date}</span>
                    <span className="font-medium text-slate-800">
                      {pt.rate.toFixed(1)}% ({pt.volume.toLocaleString()} txns)
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Exception Category Breakdown */}
        <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Exceptions by Category</h2>
              <p className="text-xs text-slate-500 mt-0.5">Active discrepancy distribution</p>
            </div>
            <button
              onClick={() => onNavigate('exceptions')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {charts.exception_categories_breakdown.map((item) => (
              <div
                key={item.raw_key}
                className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-slate-100 text-xs"
              >
                <span className="font-medium text-slate-700 truncate pr-2 capitalize">
                  {item.category.toLowerCase()}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bank Reconciliation Health Table */}
      <section aria-label="Bank Reconciliation Health">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Multi-Bank Gateway Status & Health
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time operational status across partner banks and settlement correspondents
              </p>
            </div>
            <button
              onClick={() => onNavigate('banks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Manage bank configurations →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Bank Counterparty</th>
                  <th className="py-3 px-4">Country & Base Ccy</th>
                  <th className="py-3 px-4">Gateway Status</th>
                  <th className="py-3 px-4">Match Rate</th>
                  <th className="py-3 px-4">Open Exceptions</th>
                  <th className="py-3 px-4">SLA Compliance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts.bank_health.map((bank: any) => (
                  <tr key={bank.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{bank.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {bank.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {bank.country} • <strong className="text-slate-800">{bank.currency}</strong>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={bank.connection_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {bank.match_rate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      {bank.open_exceptions > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {bank.open_exceptions} open
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">0 exceptions</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{bank.sla_compliance}%</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate('banks')}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
