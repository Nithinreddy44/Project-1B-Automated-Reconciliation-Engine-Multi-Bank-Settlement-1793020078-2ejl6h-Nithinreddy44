import React, { useEffect, useState } from 'react';
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Save,
  Globe,
  Settings2,
} from 'lucide-react';
import { api, type BankItem } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

export const BanksView: React.FC = () => {
  const { user, canConfigureBanks } = useAuth();
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Bank & Mapping Modal
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [bankDetails, setBankDetails] = useState<any | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingData, setMappingData] = useState<any | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Editable Mapping Form State
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timezone, setTimezone] = useState('UTC');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    reference: '',
    amount: '',
    currency: '',
    direction: '',
    transaction_date: '',
    counterparty: '',
    narration: '',
  });
  const [stripPrefix, setStripPrefix] = useState('');
  const [uppercaseRef, setUppercaseRef] = useState(true);
  const [amountTolerance, setAmountTolerance] = useState(0.05);
  const [dateToleranceDays, setDateToleranceDays] = useState(1);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBanks();
      setBanks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bank configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const openBankDetails = async (bank: BankItem) => {
    try {
      setSelectedBank(bank);
      setBankDetails(null);
      const details = await api.getBankDetails(bank.id);
      setBankDetails(details);
    } catch (err: any) {
      alert(err.message || 'Failed to load bank details.');
    }
  };

  const openMappingEditor = async (bankId: string) => {
    try {
      setMappingModalOpen(true);
      setMappingLoading(true);
      setSaveSuccessMessage(null);
      const mapping = await api.getBankMapping(bankId);
      setMappingData(mapping);
      setDateFormat(mapping.date_format || 'YYYY-MM-DD');
      setTimezone(mapping.timezone || 'UTC');
      setColumnMapping({
        reference: mapping.column_mapping?.reference || 'Reference_ID',
        amount: mapping.column_mapping?.amount || 'Amount',
        currency: mapping.column_mapping?.currency || 'Currency',
        direction: mapping.column_mapping?.direction || 'Type',
        transaction_date: mapping.column_mapping?.transaction_date || 'Date',
        counterparty: mapping.column_mapping?.counterparty || 'Beneficiary',
        narration: mapping.column_mapping?.narration || 'Description',
      });
      setStripPrefix(mapping.reference_normalization?.strip_prefix || '');
      setUppercaseRef(mapping.reference_normalization?.uppercase ?? true);
      setAmountTolerance(mapping.tolerance_rules?.amount_tolerance ?? 0.05);
      setDateToleranceDays(mapping.tolerance_rules?.date_tolerance_days ?? 1);
    } catch (err: any) {
      alert(err.message || 'Failed to load mapping config.');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!selectedBank) return;
    try {
      setSavingMapping(true);
      setSaveSuccessMessage(null);
      await api.updateBankMapping(selectedBank.id, {
        date_format: dateFormat,
        timezone: timezone,
        column_mapping: columnMapping,
        reference_normalization: {
          strip_prefix: stripPrefix,
          uppercase: uppercaseRef,
        },
        tolerance_rules: {
          amount_tolerance: Number(amountTolerance),
          date_tolerance_days: Number(dateToleranceDays),
        },
        actor: user.email,
      });
      setSaveSuccessMessage('Mapping schema and normalization rules updated successfully!');
      // Refresh details
      const details = await api.getBankDetails(selectedBank.id);
      setBankDetails(details);
      fetchBanks();
    } catch (err: any) {
      alert(err.message || 'Failed to save mapping configuration.');
    } finally {
      setSavingMapping(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Partner Bank Connections & Schema Configurations</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-bank settlement gateways, statement column transformations, and custom tolerance rules
          </p>
        </div>
        <button
          type="button"
          onClick={fetchBanks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Gateways</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {banks.map((bank) => (
          <div
            key={bank.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {bank.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{bank.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{bank.country} • Base: <strong className="text-slate-700">{bank.currency}</strong></span>
                </p>
              </div>
              <StatusBadge status={bank.connection_status} size="sm" />
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Match Rate</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{bank.match_rate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Exceptions</div>
                  <div className={`text-xs font-bold mt-0.5 ${bank.open_exceptions > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {bank.open_exceptions}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">SLA Track</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{bank.sla_compliance}%</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Supported Formats:</span>
                  <div className="flex gap-1">
                    {bank.supported_formats.map((fmt) => (
                      <span key={fmt} className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-700">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Ingestion:</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {bank.last_ingestion_time ? new Date(bank.last_ingestion_time).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Reconciliation:</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {bank.last_reconciliation_time ? new Date(bank.last_reconciliation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => openBankDetails(bank)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Inspect Bank Feeds →
              </button>
              {canConfigureBanks && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBank(bank);
                    openMappingEditor(bank.id);
                  }}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configure Mapping</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bank Feed & History Drawer / Detail Section */}
      {selectedBank && bankDetails && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedBank.name} ({selectedBank.id}) — Detailed Feeds & Reconciliation Runs
                </h3>
                <StatusBadge status={selectedBank.connection_status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit feed statements, recent automated matching runs, and active canonical mapping
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canConfigureBanks && (
                <button
                  type="button"
                  onClick={() => openMappingEditor(selectedBank.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Edit Schema Mapping (v{bankDetails.mapping_config?.version || 1})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedBank(null);
                  setBankDetails(null);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Recent Ingested Files */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Recent Ingested Statement Files ({bankDetails.recent_files?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="py-2 px-3">Filename</th>
                      <th className="py-2 px-3">Format</th>
                      <th className="py-2 px-3">Records Accepted</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankDetails.recent_files && bankDetails.recent_files.length > 0 ? (
                      bankDetails.recent_files.map((file: any) => (
                        <tr key={file.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-900 truncate max-w-[150px]" title={file.filename}>
                            {file.filename}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-700">
                              {file.format}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-emerald-700">
                            {file.records_accepted.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge status={file.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          No statement files ingested for this bank yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Reconciliation Runs */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Recent Reconciliation Runs ({bankDetails.recent_runs?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="py-2 px-3">Run #</th>
                      <th className="py-2 px-3">Match Rate</th>
                      <th className="py-2 px-3">Exceptions</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankDetails.recent_runs && bankDetails.recent_runs.length > 0 ? (
                      bankDetails.recent_runs.map((run: any) => (
                        <tr key={run.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{run.run_number}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{run.match_rate.toFixed(1)}%</td>
                          <td className="py-2 px-3 font-semibold text-amber-700">{run.exceptions_count}</td>
                          <td className="py-2 px-3">
                            <StatusBadge status={run.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          No reconciliation runs executed for this bank yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Mapping Modal */}
      {selectedBank && (
        <Modal
          isOpen={mappingModalOpen}
          onClose={() => setMappingModalOpen(false)}
          title={`Schema Mapping & Normalization Rules: ${selectedBank.name} (${selectedBank.id})`}
          subtitle="Configure canonical column transformations, date formats, and fuzzy match tolerance window"
          maxWidth="4xl"
        >
          {mappingLoading ? (
            <div className="py-12 text-center text-slate-500">Loading bank mapping configuration...</div>
          ) : (
            <div className="space-y-6 text-xs">
              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* General Date & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date String Format in Statement:
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 Standard)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK / European Bank Format)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Bank Format)</option>
                    <option value="YYYYMMDD">YYYYMMDD (SWIFT MT940 Compact)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Statement Timezone:</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST / EDT)</option>
                    <option value="Europe/London">Europe/London (GMT / BST)</option>
                    <option value="Europe/Frankfurt">Europe/Frankfurt (CET / CEST)</option>
                    <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT)</option>
                  </select>
                </div>
              </div>

              {/* Column Mapping Fields */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Canonical Field to Bank Statement Header Mapping</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-200 rounded-lg p-4 bg-white">
                  {Object.keys(columnMapping).map((canonicalKey) => (
                    <div key={canonicalKey}>
                      <label className="block text-[11px] font-semibold text-slate-700 capitalize mb-1">
                        {canonicalKey.replace(/_/g, ' ')} Header:
                      </label>
                      <input
                        type="text"
                        value={columnMapping[canonicalKey] || ''}
                        onChange={(e) =>
                          setColumnMapping({ ...columnMapping, [canonicalKey]: e.target.value })
                        }
                        placeholder={`e.g. ${canonicalKey.toUpperCase()}`}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:border-indigo-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Reference Normalization & Tolerance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Reference String Normalization
                  </h4>
                  <div>
                    <label className="block text-slate-600 mb-1">Strip Leading Prefix:</label>
                    <input
                      type="text"
                      value={stripPrefix}
                      onChange={(e) => setStripPrefix(e.target.value)}
                      placeholder="e.g. TXN- or JPM-"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uppercaseRef}
                      onChange={(e) => setUppercaseRef(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-700 font-medium">Uppercase references before match pass</span>
                  </label>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Fuzzy Match Tolerances
                  </h4>
                  <div>
                    <label className="block text-slate-600 mb-1">Amount Tolerance (Currency Units):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amountTolerance}
                      onChange={(e) => setAmountTolerance(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Date Window Tolerance (Days):</label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={dateToleranceDays}
                      onChange={(e) => setDateToleranceDays(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Version: <strong className="text-slate-800">{mappingData?.version || 1}</strong> • Updated by:{' '}
                  <span className="font-mono text-slate-700">{mappingData?.updated_by || 'system'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMappingModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMapping}
                    disabled={savingMapping}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingMapping ? 'Saving Version...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
