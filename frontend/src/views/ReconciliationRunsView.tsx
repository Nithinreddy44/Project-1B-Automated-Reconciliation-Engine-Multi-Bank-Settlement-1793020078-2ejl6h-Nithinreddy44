import React, { useEffect, useState } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  RotateCw,
  Check,
  ChevronRight,
} from 'lucide-react';
import { api, type ReconciliationRunItem } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

export const ReconciliationRunsView: React.FC<{ onNavigateToExceptions?: () => void }> = ({
  onNavigateToExceptions,
}) => {
  const { user, canTriggerRecon } = useAuth();
  const [runs, setRuns] = useState<ReconciliationRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<ReconciliationRunItem | null>(null);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [bankId, setBankId] = useState('JPMC');
  const [dateFrom, setDateFrom] = useState('2026-10-25');
  const [dateTo, setDateTo] = useState('2026-10-26');
  const [currency, setCurrency] = useState('USD');
  const [amountTolerance, setAmountTolerance] = useState(0.05);
  const [dateToleranceDays, setDateToleranceDays] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ReconciliationRunItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getReconciliationRuns();
      setRuns(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleStartReconciliation = async () => {
    try {
      setIsExecuting(true);
      setError(null);
      setStep(5); // Progress step

      const result = await api.triggerReconciliation({
        bank_id: bankId,
        date_from: dateFrom,
        date_to: dateTo,
        currency,
        amount_tolerance: amountTolerance,
        date_tolerance_days: dateToleranceDays,
        initiated_by: user.email,
      });

      setExecutionResult(result);
      setStep(6); // Completed review step
      fetchRuns();
    } catch (err: any) {
      setError(err.message || 'Execution failed');
      setStep(4); // Back to review step on failure
    } finally {
      setIsExecuting(false);
    }
  };

  const openRunModal = async (run: ReconciliationRunItem) => {
    try {
      const full = await api.getReconciliationRunDetail(run.id);
      setSelectedRun(full);
    } catch {
      setSelectedRun(run);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Multi-Bank Reconciliation Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute 4-stage pipeline: Ingestion → Normalisation → Matching → Exception Resolution
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep(1);
            setExecutionResult(null);
            setWizardOpen(true);
          }}
          disabled={!canTriggerRecon}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Launch New Reconciliation Run</span>
        </button>
      </div>

      {/* Historical Runs Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Reconciliation Execution History
          </h3>
          <span className="text-xs text-slate-500">{runs.length} runs recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading reconciliation runs...</div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No reconciliation runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Run Number</th>
                  <th className="py-3 px-4">Bank & Currency</th>
                  <th className="py-3 px-4">Date Window</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Match Rate</th>
                  <th className="py-3 px-4">Exceptions</th>
                  <th className="py-3 px-4">Execution Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{r.run_number}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{r.bank_id}</span> •{' '}
                      <span className="text-slate-600">{r.currency}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {r.date_from} → {r.date_to}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {r.total_records.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.match_rate.toFixed(1)}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, r.match_rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {r.exceptions_count > 0 ? (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {r.exceptions_count} exceptions
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">0 exceptions</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{r.elapsed_seconds.toFixed(2)}s</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openRunModal(r)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Pipeline Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guided Run Wizard Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => !isExecuting && setWizardOpen(false)}
        title="Guided Reconciliation Pipeline Workflow"
        subtitle="Follow the 6-step guided wizard to trigger automated reconciliation"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Wizard Step Progress Tracker */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-medium text-slate-500">
            {[
              { num: 1, label: 'Ledger' },
              { num: 2, label: 'Statements' },
              { num: 3, label: 'Rules' },
              { num: 4, label: 'Review' },
              { num: 5, label: 'Pipeline' },
              { num: 6, label: 'Results' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 ${
                  step === s.num
                    ? 'text-indigo-600 font-bold'
                    : step > s.num
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === s.num
                      ? 'bg-indigo-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Select Internal Ledger Data */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Step 1: Select Internal Ledger Dataset</h4>
              <p className="text-xs text-slate-600">
                Choose the internal ERP general ledger transactions to be verified against bank statements.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800">
                    Source: General Ledger — Multi-Bank Clearing Subledger
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                    100% Synced
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Contains all debit/credit postings dispatched by Treasury for value dates {dateFrom} through {dateTo}.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <span>Next: Select Bank Statements</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select External Bank Statements */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Step 2: Select External Bank Statements</h4>
              <p className="text-xs text-slate-600">Select the counterparty bank gateway statement feed.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'JPMC', name: 'JPMorgan Chase (USD)' },
                  { id: 'BARC', name: 'Barclays Bank UK (GBP)' },
                  { id: 'CITI', name: 'Citibank N.A. (USD)' },
                  { id: 'HSBC', name: 'HSBC Global (EUR)' },
                  { id: 'DB', name: 'Deutsche Bank (EUR)' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBankId(b.id);
                      setCurrency(b.id === 'BARC' ? 'GBP' : b.id === 'HSBC' || b.id === 'DB' ? 'EUR' : 'USD');
                    }}
                    className={`p-3 text-left rounded-lg border text-xs cursor-pointer transition-all ${
                      bankId === b.id
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-slate-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">{b.name}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Feeds: CSV, MT940, CAMT.053</div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-xs text-slate-600 border rounded hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <span>Next: Configure Tolerances & Rules</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Configure Parameters */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Step 3: Configure Date Range & Matching Rules</h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border rounded p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Amount Tolerance (± Currency Units)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountTolerance}
                    onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded p-2 text-slate-800"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Allows rounding or wire fee deductions
                  </span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Value Date Tolerance (Days)
                  </label>
                  <input
                    type="number"
                    value={dateToleranceDays}
                    onChange={(e) => setDateToleranceDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full border rounded p-2 text-slate-800"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Accommodates weekend & RTGS cutoff lag
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-1.5 text-xs text-slate-600 border rounded hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <span>Next: Review Selected Inputs</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review Inputs */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Step 4: Review Inputs Before Execution</h4>
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                  {error}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Bank:</span>
                  <span className="font-bold text-slate-900">{bankId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Range:</span>
                  <span className="font-mono text-slate-900">
                    {dateFrom} to {dateTo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Currency:</span>
                  <span className="font-bold text-slate-900">{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Tolerance:</span>
                  <span className="font-mono text-slate-900">± {amountTolerance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Value Date Window:</span>
                  <span className="font-mono text-slate-900">± {dateToleranceDays} day(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Actor:</span>
                  <span className="text-slate-900 font-medium">{user.email}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-3 py-1.5 text-xs text-slate-600 border rounded hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStartReconciliation}
                  disabled={isExecuting}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Start Automated Reconciliation</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Executing Pipeline Status */}
          {step === 5 && (
            <div className="py-8 text-center space-y-4">
              <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Executing 4-Stage Reconciliation Engine...</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Running Ingestion validation, UTR reference normalisation, 3-pass multi-attribute matching, and 18-category exception triage.
              </p>
            </div>
          )}

          {/* Step 6: Results & Pipeline Stage Status */}
          {step === 6 && executionResult && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Reconciliation Completed: {executionResult.run_number}
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Match Rate:{' '}
                    <strong className="text-emerald-900">{executionResult.match_rate.toFixed(1)}%</strong> • Total
                    Records: {executionResult.total_records} • Elapsed: {executionResult.elapsed_seconds.toFixed(2)}s
                  </p>
                </div>
              </div>

              {/* 4 Pipeline Stages Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Core Pipeline Stage Execution
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {executionResult.pipeline_stages.map((stage) => (
                    <div key={stage.stage_number} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">
                          {stage.stage_number}. {stage.name}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          {stage.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mb-2">{stage.description}</p>
                      <div className="flex justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-1.5">
                        <span>Processed: {stage.records_processed}</span>
                        <span>Latency: {stage.elapsed_ms}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {executionResult.exceptions_count > 0 && onNavigateToExceptions && (
                  <button
                    type="button"
                    onClick={() => {
                      setWizardOpen(false);
                      onNavigateToExceptions();
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 flex items-center gap-1.5"
                  >
                    <span>View {executionResult.exceptions_count} Exceptions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Detail Modal for Selected Historical Run */}
      {selectedRun && (
        <Modal
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`Run Details: ${selectedRun.run_number}`}
          subtitle={`Executed on ${new Date(selectedRun.start_time).toLocaleString()} by ${selectedRun.initiated_by}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Bank</span>
                <span className="font-bold text-slate-900">{selectedRun.bank_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Match Rate</span>
                <span className="font-bold text-slate-900">{selectedRun.match_rate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Records</span>
                <span className="font-bold text-slate-900">{selectedRun.total_records}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Exceptions</span>
                <span className="font-bold text-amber-700">{selectedRun.exceptions_count}</span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 uppercase tracking-wider mb-2">Pipeline Stages</h5>
              <div className="space-y-2">
                {selectedRun.pipeline_stages.map((st) => (
                  <div key={st.stage_number} className="p-3 border rounded bg-white flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {st.stage_number}. {st.name}
                      </div>
                      <div className="text-slate-500 text-[11px]">{st.description}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {st.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{st.elapsed_ms} ms</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
