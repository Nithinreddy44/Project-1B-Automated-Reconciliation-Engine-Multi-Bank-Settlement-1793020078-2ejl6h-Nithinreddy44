import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
} from 'lucide-react';
import { api, type ExceptionItem } from '../api/client';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

export const ExceptionsView: React.FC = () => {
  const { user, canResolveExceptions } = useAuth();
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const [bankId, setBankId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [tier, setTier] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Detail Modal / Workbench
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action form state
  const [actionTab, setActionTab] = useState<'NOTE' | 'ASSIGN' | 'RESOLVE' | 'ESCALATE'>('RESOLVE');
  const [actionNote, setActionNote] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [resolutionReason, setResolutionReason] = useState('VERIFIED_BANK_FEES');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await api.getExceptions({
        category: category !== 'ALL' ? category : undefined,
        severity: severity !== 'ALL' ? severity : undefined,
        bank_id: bankId !== 'ALL' ? bankId : undefined,
        status: status !== 'ALL' ? status : undefined,
        tier: tier,
        search: search.trim() || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setExceptions(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [category, severity, bankId, status, tier, page]);

  const openExceptionDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const data = await api.getExceptionDetail(id);
      setSelectedException(data);
      setActionAssignee(data.assigned_to || '');
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExecuteAction = async (actionType: string) => {
    if (!selectedException) return;

    try {
      setIsSubmittingAction(true);
      const payload: any = {
        action: actionType,
        actor: user.email,
        note: actionNote.trim() || undefined,
      };

      if (actionType === 'ASSIGN') payload.assigned_to = actionAssignee;
      if (actionType === 'RESOLVE') payload.resolution_reason = resolutionReason;
      if (actionType === 'ESCALATE') payload.escalate_to_tier = Math.min(4, selectedException.tier + 1);

      await api.executeExceptionAction(selectedException.id, payload);

      // Refresh detail and table
      const updated = await api.getExceptionDetail(selectedException.id);
      setSelectedException(updated);
      setActionNote('');
      fetchExceptions();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const categoryOptions = [
    'ALL',
    'DIRECTION_REVERSAL',
    'MISSING_INTERNAL_RECORD',
    'MISSING_EXTERNAL_RECORD',
    'AMOUNT_MISMATCH',
    'DUPLICATE_TRANSACTION',
    'DATE_MISMATCH',
    'CURRENCY_MISMATCH',
    'PARTIAL_MATCH',
    'NETTED_SETTLEMENT',
    'FEE_DEDUCTION',
    'FX_VARIANCE',
    'STALE_TRANSACTION',
    'FORMAT_ERROR',
    'REFERENCE_TRUNCATION',
    'TIMEZONE_OFFSET',
    'PENDING_REVERSAL',
    'REGULATORY_HOLD',
    'SETTLEMENT_DELAY',
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Workbench Header & Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Financial Discrepancy & Exception Workbench</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              4-Tier SLA escalation routing across all 18 banking discrepancy categories
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full self-start sm:self-auto">
            {total} exceptions tracked
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search explanation, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All 18 Categories' : c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (Immediate SLA)</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Banks</option>
            <option value="JPMC">JPMorgan Chase</option>
            <option value="BARC">Barclays Bank UK</option>
            <option value="CITI">Citibank N.A.</option>
            <option value="HSBC">HSBC Global</option>
            <option value="DB">Deutsche Bank</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={tier !== undefined ? String(tier) : 'ALL'}
            onChange={(e) => {
              setTier(e.target.value === 'ALL' ? undefined : Number(e.target.value));
              setPage(0);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 bg-white"
          >
            <option value="ALL">All SLA Tiers (1-4)</option>
            <option value="1">Tier 1 (Auto / Rule Based)</option>
            <option value="2">Tier 2 (Analyst Workbench)</option>
            <option value="3">Tier 3 (Supervisor Lead)</option>
            <option value="4">Tier 4 (Operations Director)</option>
          </select>
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Exception ID</th>
                <th className="py-3 px-4">Severity & Tier</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Exposure Amount</th>
                <th className="py-3 px-4">SLA Countdown</th>
                <th className="py-3 px-4">Assigned Analyst</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workbench</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading exceptions...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No exceptions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                exceptions.map((e) => {
                  const isDirectionReversal = e.category === 'DIRECTION_REVERSAL';
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isDirectionReversal ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={e.severity} />
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            T{e.tier}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {e.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{e.bank_id}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {e.currency} {e.discrepancy_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        {e.status === 'RESOLVED' || e.status === 'CLOSED' ? (
                          <span className="text-emerald-700 font-semibold">Resolved</span>
                        ) : e.is_breached ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Breached
                          </span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded ${
                              e.sla_minutes_remaining < 30
                                ? 'bg-red-100 text-red-800 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {e.sla_minutes_remaining}m remaining
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-xs">{e.assigned_to}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={e.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openExceptionDetail(e.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
                        >
                          Resolve →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Detail & Resolution Workbench Modal */}
      {selectedException && (
        <Modal
          isOpen={!!selectedException}
          onClose={() => setSelectedException(null)}
          title={`Exception Workbench: ${selectedException.id} — ${selectedException.category.replace(/_/g, ' ')}`}
          subtitle={`Tier ${selectedException.tier} Escalation Queue • Bank: ${selectedException.bank_id}`}
          maxWidth="4xl"
        >
          {detailLoading ? (
            <div className="py-12 text-center text-slate-500">Loading workbench details...</div>
          ) : (
            <div className="space-y-6 text-xs">
            {/* Plain English Discrepancy Statement */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Plain-Language Discrepancy Explanation</span>
              </div>
              <p className="text-amber-900 text-xs leading-relaxed font-medium">
                {selectedException.plain_explanation}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-amber-800 pt-1 border-t border-amber-200">
                <span>
                  Financial Impact: <strong>{selectedException.currency} {selectedException.discrepancy_amount.toLocaleString()}</strong>
                </span>
                <span>
                  Recommended Action: <strong>{selectedException.recommended_action}</strong>
                </span>
              </div>
            </div>

            {/* Affected Records Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Internal General Ledger Booking</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedException.internal_record?.id || 'NO RECORD'}
                  </span>
                </div>
                {selectedException.internal_record ? (
                  <div className="space-y-1 font-mono text-[11px] text-slate-700">
                    <div>Ref: <strong>{selectedException.internal_record.reference}</strong></div>
                    <div>Amount: <strong>{selectedException.internal_record.currency} {selectedException.internal_record.amount.toLocaleString()}</strong></div>
                    <div>Direction: <span className="font-bold">{selectedException.internal_record.direction}</span></div>
                    <div>Date: {selectedException.internal_record.transaction_date}</div>
                    <div className="text-slate-500 font-sans text-xs">{selectedException.internal_record.counterparty}</div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic py-4">No matching internal transaction booked.</div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>External Bank Statement Item</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedException.external_record?.id || 'NO RECORD'}
                  </span>
                </div>
                {selectedException.external_record ? (
                  <div className="space-y-1 font-mono text-[11px] text-slate-700">
                    <div>Ref: <strong>{selectedException.external_record.reference}</strong></div>
                    <div>Amount: <strong>{selectedException.external_record.currency} {selectedException.external_record.amount.toLocaleString()}</strong></div>
                    <div>Direction: <span className="font-bold">{selectedException.external_record.direction}</span></div>
                    <div>Date: {selectedException.external_record.transaction_date}</div>
                    <div className="text-slate-500 font-sans text-xs">{selectedException.external_record.narration}</div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic py-4">No statement line received from bank.</div>
                )}
              </div>
            </div>

            {/* Resolution Form */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-100">
                {(['RESOLVE', 'NOTE', 'ASSIGN', 'ESCALATE'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActionTab(tab)}
                    className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                      actionTab === tab
                        ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'RESOLVE' && 'Resolve Exception'}
                    {tab === 'NOTE' && 'Add Review Note'}
                    {tab === 'ASSIGN' && 'Reassign Analyst'}
                    {tab === 'ESCALATE' && 'Escalate Tier'}
                  </button>
                ))}
              </div>

              <div className="p-4 bg-white space-y-4">
                {actionTab === 'RESOLVE' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Resolution Category Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={resolutionReason}
                        onChange={(e) => setResolutionReason(e.target.value)}
                        className="w-full border rounded-lg p-2 text-slate-800"
                      >
                        <option value="VERIFIED_BANK_FEES">Approved Correspondent Wire Fee Deduction</option>
                        <option value="TIMING_DIFFERENCE_CLEARED">Cleared on Day+1 Statement Feed</option>
                        <option value="TREASURY_JOURNAL_POSTED">Treasury General Ledger Adjusting Journal Posted</option>
                        <option value="RECALL_ISSUED">Bank Recall Dispatched for Direction Reversal</option>
                        <option value="OFAC_DOCUMENTATION_CONFIRMED">Sanctions Screening Whitelist Confirmed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Resolution Documentation Note
                      </label>
                      <textarea
                        rows={2}
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Add specific ticket ID or clearing desk reference..."
                        className="w-full border rounded-lg p-2 text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecuteAction('RESOLVE')}
                      disabled={isSubmittingAction || !canResolveExceptions}
                      className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingAction ? 'Resolving...' : 'Confirm Resolution & Record Audit'}
                    </button>
                  </div>
                )}

                {actionTab === 'NOTE' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Investigation Note</label>
                      <textarea
                        rows={3}
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Enter progress note or communication history with counterparty..."
                        className="w-full border rounded-lg p-2 text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteAction('ADD_NOTE')}
                      disabled={!actionNote.trim() || isSubmittingAction}
                      className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      Save Note to Audit History
                    </button>
                  </div>
                )}

                {actionTab === 'ASSIGN' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Assign to Analyst</label>
                      <input
                        type="text"
                        value={actionAssignee}
                        onChange={(e) => setActionAssignee(e.target.value)}
                        className="w-full border rounded-lg p-2 text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteAction('ASSIGN')}
                      disabled={!actionAssignee.trim() || isSubmittingAction}
                      className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      Reassign Analyst
                    </button>
                  </div>
                )}

                {actionTab === 'ESCALATE' && (
                  <div className="space-y-3">
                    <p className="text-slate-600">
                      Escalate exception to <strong>Tier {Math.min(4, selectedException.tier + 1)}</strong> queue for
                      management oversight.
                    </p>
                    <textarea
                      rows={2}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Reason for tier escalation..."
                      className="w-full border rounded-lg p-2 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleExecuteAction('ESCALATE')}
                      disabled={isSubmittingAction}
                      className="px-4 py-2 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                    >
                      Escalate to Next Tier
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Audit History for this Exception */}
            {selectedException.audit_history && selectedException.audit_history.length > 0 && (
              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Immutable Audit History
                </h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedException.audit_history.map((log: any) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{log.action} by {log.actor}</span>
                        <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{log.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedException(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close Workbench
              </button>
            </div>
          </div>
          )}
        </Modal>
      )}
    </div>
  );
};
