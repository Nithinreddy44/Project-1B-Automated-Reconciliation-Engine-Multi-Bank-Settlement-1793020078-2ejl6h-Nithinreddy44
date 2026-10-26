import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api, type AuditLogItem } from '../api/client';
import { Modal } from '../components/ui/Modal';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [actor, setActor] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  // Detail / Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuditLogs({
        actor: actor !== 'ALL' ? actor : undefined,
        action: action !== 'ALL' ? action : undefined,
        search: search.trim() || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit ledger logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actor, action, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleVerifyIntegrity = async () => {
    try {
      setVerifying(true);
      const res = await api.verifyAuditIntegrity();
      setVerificationResult(res);
    } catch (err: any) {
      alert(err.message || 'Verification check failed.');
    } finally {
      setVerifying(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Verification Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Cryptographic Audit Trail Ledger</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable SHA-256 hash-chained log documenting every manual override, tolerance update, and exception resolution
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-pulse' : ''}`} />
            <span>{verifying ? 'Verifying Hash Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between text-xs ${
            verificationResult.verified
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verificationResult.verified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {verificationResult.verified ? 'Merkle Hash Chain Verified Intact' : 'Cryptographic Discrepancy Detected'}
              </span>
              <p className="mt-0.5 text-[11px] opacity-90">{verificationResult.message}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-xs">
              {verificationResult.total_records.toLocaleString()} Verified Blocks
            </span>
            {verificationResult.latest_hash && (
              <div className="font-mono text-[10px] opacity-75 truncate max-w-xs">
                Tip: {verificationResult.latest_hash.substring(0, 16)}...
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search actor, rationale, entity ID, hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <select
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Actors</option>
            <option value="analyst">Analyst Operations</option>
            <option value="admin">Admin Operations</option>
            <option value="system">Automated Daemon</option>
          </select>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Logged Actions</option>
            <option value="MANUAL_MATCH">MANUAL_MATCH (Analyst Override)</option>
            <option value="RESOLVE_EXCEPTION">RESOLVE_EXCEPTION</option>
            <option value="ESCALATE_EXCEPTION">ESCALATE_EXCEPTION</option>
            <option value="UPDATE_BANK_MAPPING">UPDATE_BANK_MAPPING</option>
            <option value="UPLOAD_STATEMENT">UPLOAD_STATEMENT</option>
            <option value="RUN_RECONCILIATION">RUN_RECONCILIATION</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Filter Logs
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Immutable Audit Sequence ({total.toLocaleString()} records)
          </h3>
          <span className="text-xs text-slate-500">SHA-256 chained in sequential order</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity Type & ID</th>
                <th className="py-3 px-4">Audited Rationale</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading audit trail ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{log.actor}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-[11px]">{log.entity_type}</div>
                      <div className="font-mono text-slate-500 text-[10px] truncate max-w-[120px]" title={log.entity_id}>
                        {log.entity_id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={log.rationale}>
                      {log.rationale}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.hash.substring(0, 14)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{page * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(total, (page + 1) * pageSize)}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-medium">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Record: ${selectedLog.action} (${selectedLog.id})`}
          subtitle={`Actor: ${selectedLog.actor} • Timestamp: ${new Date(selectedLog.timestamp).toLocaleString()}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Rationale and Hashes */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="font-semibold text-slate-700">Audited Business Rationale:</div>
              <p className="text-slate-900 font-medium leading-relaxed bg-white p-3 rounded border border-slate-200">
                {selectedLog.rationale}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">Previous Block Hash:</span>
                  <div className="text-slate-600 truncate">{selectedLog.prev_hash || '0 (Genesis Block)'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Block SHA-256 Hash:</span>
                  <div className="text-emerald-700 font-bold truncate">{selectedLog.hash}</div>
                </div>
              </div>
            </div>

            {/* Before vs After State Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  State Before Action
                </div>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] h-64 overflow-y-auto">
                  <pre>{JSON.stringify(selectedLog.before_state, null, 2)}</pre>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  State After Action
                </div>
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] h-64 overflow-y-auto">
                  <pre>{JSON.stringify(selectedLog.after_state, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
