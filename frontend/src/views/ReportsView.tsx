import React, { useEffect, useState } from 'react';
import {
  FileBarChart,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';

type ReportKey = 'daily' | 'ageing' | 'bank_performance' | 'sla_compliance' | 'settlement_delay' | 'audit_integrity';

export const ReportsView: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportKey>('daily');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportTabs: Array<{ key: ReportKey; label: string; icon: React.ReactNode }> = [
    { key: 'daily', label: 'Executive Daily Summary', icon: <FileBarChart className="w-4 h-4" /> },
    { key: 'ageing', label: 'Exception Ageing & Balances', icon: <Clock className="w-4 h-4" /> },
    { key: 'bank_performance', label: 'Bank Quality & Health', icon: <Building2 className="w-4 h-4" /> },
    { key: 'sla_compliance', label: 'SLA Resolution Compliance', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'settlement_delay', label: 'Settlement Delays & Lag', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'audit_integrity', label: 'Cryptographic Hash Ledger', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const fetchReport = async (type: ReportKey) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReport(type);
      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport]);

  const handleExportCSV = () => {
    const url = api.getReportExportUrl(selectedReport);
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Financial Reports & Compliance Statements</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative regulatory statements, exception ageing curves, bank counterparty metrics, and exportable ledger manifests
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchReport(selectedReport)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        {reportTabs.map((tab) => {
          const isActive = selectedReport === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedReport(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 text-indigo-600 animate-spin" />
          <p className="text-xs">Generating {selectedReport.replace(/_/g, ' ')} dataset...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
          {error}
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Metadata Banner */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{reportData.report_name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Period: <strong className="text-slate-700">{reportData.reporting_period}</strong></span>
                </span>
                <span>• Generated: <strong className="text-slate-700">{new Date(reportData.generated_at).toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Data Source:</span>{' '}
                <span className="text-slate-800">{reportData.data_source}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Statement Limitations:</span>{' '}
                <span className="text-slate-800">{reportData.limitations}</span>
              </div>
            </div>
          </div>

          {/* Daily Report Specific Content */}
          {selectedReport === 'daily' && reportData.summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Records Processed</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {reportData.summary.total_records_processed.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Matched Records</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {reportData.summary.matched_records.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Intraday Match Rate</div>
                  <div className="text-xl font-bold text-indigo-700 mt-1">
                    {reportData.summary.match_rate}%
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Active Exceptions</div>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {reportData.summary.open_exceptions}
                  </div>
                </div>
              </div>

              {reportData.recent_runs && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-800">
                    Settlement Engine Runs in Period
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                          <th className="py-2 px-4">Run Number</th>
                          <th className="py-2 px-4">Bank</th>
                          <th className="py-2 px-4">Match Rate</th>
                          <th className="py-2 px-4">Matched / Total</th>
                          <th className="py-2 px-4">Exceptions</th>
                          <th className="py-2 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.recent_runs.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{r.run_number}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-700">{r.bank_id}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">{r.match_rate.toFixed(1)}%</td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {r.matched_records.toLocaleString()} / {r.total_records.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-amber-700">{r.exceptions_count}</td>
                            <td className="py-2.5 px-4">
                              <StatusBadge status={r.status} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ageing Report Specific Content */}
          {selectedReport === 'ageing' && reportData.buckets && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(reportData.buckets).map(([bucket, count]: [string, any]) => (
                  <div key={bucket} className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[11px] text-slate-500 font-medium uppercase">Age: {bucket}</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{count} items</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {bucket === '> 24 hours' ? 'Critical SLA breach risk' : 'Within intraday escalation window'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Outstanding Exceptions Breakdown */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-800">
                  Detailed Aging Ledger Records
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                        <th className="py-2 px-4">Exception ID</th>
                        <th className="py-2 px-4">Category</th>
                        <th className="py-2 px-4">Severity</th>
                        <th className="py-2 px-4">Bank</th>
                        <th className="py-2 px-4">Discrepancy</th>
                        <th className="py-2 px-4">SLA Deadline</th>
                        <th className="py-2 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(reportData.details || {}).flat().map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-4 font-mono font-bold text-slate-900">{e.id}</td>
                          <td className="py-2 px-4 font-semibold text-slate-800 capitalize">
                            {e.category.toLowerCase().replace(/_/g, ' ')}
                          </td>
                          <td className="py-2 px-4">
                            <SeverityBadge severity={e.severity} />
                          </td>
                          <td className="py-2 px-4 font-mono text-slate-700">{e.bank_id}</td>
                          <td className="py-2 px-4 font-mono font-bold text-slate-900">
                            {e.currency} {e.discrepancy_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 text-slate-500">
                            {new Date(e.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-4">
                            <StatusBadge status={e.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Bank Performance Report Content */}
          {selectedReport === 'bank_performance' && reportData.banks && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="py-3 px-4">Bank Identifier</th>
                      <th className="py-3 px-4">Counterparty Name</th>
                      <th className="py-3 px-4">Country & Base Ccy</th>
                      <th className="py-3 px-4">Supported Formats</th>
                      <th className="py-3 px-4">Match Rate</th>
                      <th className="py-3 px-4">Open Exceptions</th>
                      <th className="py-3 px-4">SLA Compliance</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.banks.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{b.name}</td>
                        <td className="py-3 px-4 text-slate-600">{b.country} • {b.currency}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {b.supported_formats.map((f: string) => (
                              <span key={f} className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-700">
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{b.match_rate.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${b.open_exceptions > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {b.open_exceptions}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{b.sla_compliance}%</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={b.connection_status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLA Compliance Report Content */}
          {selectedReport === 'sla_compliance' && reportData.metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Total Exceptions Tracked</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{reportData.metrics.total_exceptions}</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Breached SLA Count</div>
                  <div className="text-xl font-bold text-rose-700 mt-1">{reportData.metrics.breached_count}</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Overall SLA Compliance</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">{reportData.metrics.compliance_percentage}%</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-medium uppercase">Avg Resolution Velocity</div>
                  <div className="text-xl font-bold text-indigo-700 mt-1">{reportData.metrics.avg_resolution_minutes} mins</div>
                </div>
              </div>

              {reportData.breached_items && reportData.breached_items.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-rose-50/70 border-b border-rose-200 font-bold text-xs uppercase tracking-wider text-rose-900">
                    SLA Breached Exception Queue ({reportData.breached_items.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                          <th className="py-2 px-4">Exception ID</th>
                          <th className="py-2 px-4">Tier</th>
                          <th className="py-2 px-4">Category</th>
                          <th className="py-2 px-4">Bank</th>
                          <th className="py-2 px-4">Discrepancy</th>
                          <th className="py-2 px-4">Explanation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.breached_items.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.id}</td>
                            <td className="py-2.5 px-4 font-bold text-rose-700">Tier {b.tier}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800 capitalize">
                              {b.category.toLowerCase().replace(/_/g, ' ')}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-700">{b.bank_id}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                              {b.currency} {b.discrepancy_amount?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">{b.plain_explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settlement Delay Report Content */}
          {selectedReport === 'settlement_delay' && (
            <div className="space-y-6">
              <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-medium uppercase">Total Clearing Lags & Delays</div>
                <div className="text-xl font-bold text-amber-700 mt-1">{reportData.total_delays || 0} occurrences</div>
              </div>

              {reportData.delayed_records && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                          <th className="py-2 px-4">Exception ID</th>
                          <th className="py-2 px-4">Bank</th>
                          <th className="py-2 px-4">Discrepancy Amount</th>
                          <th className="py-2 px-4">Plain Explanation</th>
                          <th className="py-2 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.delayed_records.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{d.id}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-700">{d.bank_id}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                              {d.currency} {d.discrepancy_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">{d.plain_explanation}</td>
                            <td className="py-2.5 px-4">
                              <StatusBadge status={d.status} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cryptographic Audit Hash Integrity Report */}
          {selectedReport === 'audit_integrity' && reportData.verification && (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Cryptographic Merkle Hash Chain: {reportData.verification.verified ? 'VERIFIED INTACT' : 'TAMPER DETECTED'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {reportData.verification.message}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total Hashed Blocks</div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {reportData.verification.total_records.toLocaleString()}
                  </div>
                </div>
              </div>

              {reportData.verification.latest_hash && (
                <div className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Latest Merkle Tip SHA-256 Hash</div>
                  <div className="text-emerald-400 break-all">{reportData.verification.latest_hash}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
