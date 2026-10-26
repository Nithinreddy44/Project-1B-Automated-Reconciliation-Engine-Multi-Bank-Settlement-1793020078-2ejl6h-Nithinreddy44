import React, { useEffect, useState } from 'react';
import {
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
} from 'lucide-react';
import { api, type TransactionItem } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

export const TransactionsView: React.FC = () => {
  const { user, canManualMatch } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [bankId, setBankId] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [matchStatus, setMatchStatus] = useState('ALL');
  const [matchType, setMatchType] = useState('ALL');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Comparison Drawer
  const [compareData, setCompareData] = useState<any | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [manualMatchModalOpen, setManualMatchModalOpen] = useState(false);
  const [manualMatchRationale, setManualMatchRationale] = useState('');
  const [manualMatchSubmitting, setManualMatchSubmitting] = useState(false);
  const [manualMatchCandidateId, setManualMatchCandidateId] = useState('');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        search: search.trim() || undefined,
        bank_id: bankId !== 'ALL' ? bankId : undefined,
        source: source !== 'ALL' ? source : undefined,
        match_status: matchStatus !== 'ALL' ? matchStatus : undefined,
        match_type: matchType !== 'ALL' ? matchType : undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setTransactions(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [bankId, source, matchStatus, matchType, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchTransactions();
  };

  const openCompareDrawer = async (txnId: string) => {
    try {
      setIsComparing(true);
      const res = await api.compareTransaction(txnId);
      setCompareData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsComparing(false);
    }
  };

  const handleExecuteManualMatch = async () => {
    if (!compareData || !manualMatchCandidateId || !manualMatchRationale) return;
    try {
      setManualMatchSubmitting(true);
      const intId =
        compareData.internal_record?.id ||
        (compareData.external_record ? manualMatchCandidateId : compareData.transaction_id);
      const extId =
        compareData.external_record?.id ||
        (compareData.internal_record ? manualMatchCandidateId : compareData.transaction_id);

      await api.executeManualMatch({
        internal_transaction_id: intId,
        external_transaction_id: extId,
        rationale: manualMatchRationale,
        actor: user.email,
      });

      setManualMatchModalOpen(false);
      setManualMatchRationale('');
      setCompareData(null);
      fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Manual match failed');
    } finally {
      setManualMatchSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Multi-Bank Transaction Explorer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review side-by-side reconciliation match candidates and field-level variance evidence
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {total.toLocaleString()} total transactions
          </span>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, narration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <select
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Banks</option>
            <option value="JPMC">JPMorgan Chase (JPMC)</option>
            <option value="BARC">Barclays Bank UK (BARC)</option>
            <option value="CITI">Citibank N.A. (CITI)</option>
            <option value="HSBC">HSBC Global (HSBC)</option>
            <option value="DB">Deutsche Bank (DB)</option>
          </select>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Sources (Internal & Bank)</option>
            <option value="INTERNAL_LEDGER">Internal Ledger Postings</option>
            <option value="EXTERNAL_STATEMENT">External Bank Statements</option>
          </select>

          <select
            value={matchStatus}
            onChange={(e) => {
              setMatchStatus(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Match Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="UNMATCHED">Unmatched</option>
            <option value="EXCEPTION">Exception Flagged</option>
            <option value="MANUAL_MATCHED">Manual Matched</option>
          </select>

          <select
            value={matchType}
            onChange={(e) => {
              setMatchType(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Match Types</option>
            <option value="EXACT">Exact (Reference & Amount)</option>
            <option value="FUZZY">Fuzzy (Amount & Date Window)</option>
            <option value="RULE_BASED">Rule-Based Match</option>
            <option value="MANUAL">Manual Analyst Match</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Txn Reference</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Value Date</th>
                <th className="py-3 px-4">Amount & Direction</th>
                <th className="py-3 px-4">Match Status</th>
                <th className="py-3 px-4">Match Type & Confidence</th>
                <th className="py-3 px-4 text-right">Side-by-Side</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{t.reference}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.counterparty || t.narration}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.source === 'INTERNAL_LEDGER'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {t.source === 'INTERNAL_LEDGER' ? 'LEDGER' : 'STATEMENT'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{t.bank_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{t.transaction_date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold ${
                          t.direction === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {t.direction === 'CREDIT' ? '+' : '-'} {t.currency} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.match_status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      {t.match_status === 'MATCHED' || t.match_status === 'MANUAL_MATCHED' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{t.match_type}</span>
                          <span className="text-[11px] text-slate-500">({(t.confidence_score * 100).toFixed(0)}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openCompareDrawer(t.id)}
                        disabled={isComparing}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Compare</span>
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
            <strong className="text-slate-900">{total.toLocaleString()}</strong> records
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Modal */}
      {compareData && (
        <Modal
          isOpen={!!compareData}
          onClose={() => setCompareData(null)}
          title="Side-by-Side Reconciliation Analysis"
          subtitle={`Detailed field matching evidence between Internal General Ledger and External Statement Feed`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs">
            {/* Match Status Banner */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Match Status: {compareData.match_status} ({compareData.match_type})
                </div>
                <div className="text-slate-600 text-xs mt-0.5">{compareData.match_explanation}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Confidence Score</div>
                <div className="text-xl font-extrabold text-indigo-600 font-mono">
                  {(compareData.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Side by side comparison table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-100/70 p-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <div>Field Attribute</div>
                <div>Internal General Ledger</div>
                <div>External Bank Statement</div>
              </div>

              {compareData.diff_analysis &&
                Object.entries(compareData.diff_analysis).map(([field, data]: [string, any]) => (
                  <div
                    key={field}
                    className={`grid grid-cols-3 p-3 items-center border-b border-slate-100 last:border-b-0 ${
                      !data.match ? 'bg-amber-50/50' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="font-bold text-slate-700 capitalize flex items-center gap-1.5">
                      {data.match ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{field.replace('_', ' ')}</span>
                    </div>
                    <div className="font-mono text-slate-900 font-medium">
                      {data.internal !== null && data.internal !== undefined ? String(data.internal) : '—'}
                    </div>
                    <div className="font-mono text-slate-900 font-medium">
                      {data.external !== null && data.external !== undefined ? String(data.external) : '—'}
                      {data.difference !== undefined && data.difference > 0 && (
                        <span className="text-[11px] text-amber-700 ml-2 font-bold">
                          (Diff: ${data.difference})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Potential Match Candidates if not matched */}
            {compareData.candidates && compareData.candidates.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Discovered Candidate Statement Matches
                </h4>
                <div className="space-y-2">
                  {compareData.candidates.map((cand: any) => (
                    <div
                      key={cand.transaction.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">
                          {cand.transaction.reference} • {cand.transaction.currency} {cand.transaction.amount.toLocaleString()} ({cand.transaction.direction})
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {cand.scoring_factors?.join(' • ') || cand.reason}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
                          {(cand.confidence_score * 100).toFixed(0)}% Match
                        </span>
                        {canManualMatch && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualMatchCandidateId(cand.transaction.id);
                              setManualMatchModalOpen(true);
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 cursor-pointer"
                          >
                            Manual Match
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCompareData(null)}
                className="px-4 py-2 border rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Match Approval Modal */}
      <Modal
        isOpen={manualMatchModalOpen}
        onClose={() => setManualMatchModalOpen(false)}
        title="Approve Manual Match Override"
        subtitle="Mandatory compliance requirement: A verified justification rationale must be recorded in the immutable audit trail."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            You are manually linking internal transaction{' '}
            <strong className="text-slate-900 font-mono">{compareData?.transaction_id}</strong> with candidate{' '}
            <strong className="text-slate-900 font-mono">{manualMatchCandidateId}</strong>.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Justification Rationale (Min. 10 characters) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={manualMatchRationale}
              onChange={(e) => setManualMatchRationale(e.target.value)}
              placeholder="e.g., Confirmed with Treasury that $15 intermediary deduction is a standard correspondent fee; verified remitter identity."
              className="w-full border rounded-lg p-2.5 text-slate-900 focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setManualMatchModalOpen(false)}
              className="px-3 py-1.5 border rounded text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteManualMatch}
              disabled={manualMatchRationale.trim().length < 10 || manualMatchSubmitting}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {manualMatchSubmitting ? 'Recording Audit...' : 'Confirm Manual Match'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
