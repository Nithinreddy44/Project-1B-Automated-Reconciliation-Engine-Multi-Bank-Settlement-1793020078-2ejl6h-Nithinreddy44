import React, { useEffect, useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  FileCode,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api, type IngestedFileItem } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const FileIngestionView: React.FC<{ onNavigateToRecon?: () => void }> = ({ onNavigateToRecon }) => {
  const { user, canTriggerRecon } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<IngestedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState('JPMC');
  const [selectedFormat, setSelectedFormat] = useState('CSV');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await api.getIngestedFiles();
      setFiles(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setErrorMessage(null);

      // Auto-detect format from extension
      const name = f.name.toLowerCase();
      if (name.endsWith('.xml') || name.includes('camt')) {
        setSelectedFormat('CAMT.053');
      } else if (name.endsWith('.940') || name.endsWith('.txt') || name.includes('mt940')) {
        setSelectedFormat('MT940');
      } else {
        setSelectedFormat('CSV');
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setSelectedFile(f);
      setErrorMessage(null);

      const name = f.name.toLowerCase();
      if (name.endsWith('.xml')) setSelectedFormat('CAMT.053');
      else if (name.endsWith('.txt') || name.includes('940')) setSelectedFormat('MT940');
      else setSelectedFormat('CSV');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a settlement file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadSuccess(null);

      const fd = new FormData();
      fd.append('bank_id', selectedBank);
      fd.append('format', selectedFormat);
      fd.append('file', selectedFile);
      fd.append('actor', user.email);

      const res = await api.uploadStatementFile(fd);
      setUploadSuccess(res);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Upload Zone & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bank Statement Ingestion Workflow</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload multi-bank settlement statements for automated parsing and schema validation
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{uploadSuccess.message}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 font-mono">
                <div>Hash: {uploadSuccess.file_details.file_hash.substring(0, 16)}...</div>
                <div>Accepted: {uploadSuccess.file_details.records_accepted} records</div>
              </div>
              {onNavigateToRecon && (
                <button
                  type="button"
                  onClick={onNavigateToRecon}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                >
                  <span>Start Reconciliation Run</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Bank & Format Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Bank Gateway
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-hidden focus:border-indigo-600"
              >
                <option value="JPMC">JPMorgan Chase & Co. (USD)</option>
                <option value="BARC">Barclays Bank UK (GBP)</option>
                <option value="CITI">Citibank N.A. (USD)</option>
                <option value="HSBC">HSBC Global Banking (EUR)</option>
                <option value="DB">Deutsche Bank AG (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detected Statement Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-hidden focus:border-indigo-600 font-semibold"
              >
                <option value="CSV">Bank Delimited CSV (Custom Column Mapping)</option>
                <option value="MT940">SWIFT MT940 Structured Message</option>
                <option value="CAMT.053">ISO 20022 CAMT.053 XML Statement</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-indigo-500 bg-indigo-50/20'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".csv,.txt,.940,.xml"
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            {selectedFile ? (
              <div className="space-y-1">
                <span className="font-bold text-sm text-slate-900">{selectedFile.name}</span>
                <p className="text-xs text-slate-500">
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="font-semibold text-sm text-slate-800">
                  Drag and drop statement file here, or click to browse
                </span>
                <p className="text-xs text-slate-500">
                  Supports MT940 (.txt, .940), CAMT.053 (.xml), and Bank CSV (max 100 MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !canTriggerRecon}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validating & Parsing File...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Upload & Ingest Statement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formats and Size Limits Guide */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Supported Banking Formats</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Bank CSV (Delimited)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Requires Reference, Amount, Direction, and Date. Column mapping review available for bank format changes. Max: 50MB.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>SWIFT MT940</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Standard SWIFT statement format (:20: reference, :61: statement line, :86: narrative). Max: 25MB.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <FileCode className="w-4 h-4 text-amber-600" />
                <span>ISO 20022 CAMT.053</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Modern XML structure for multi-currency corporate banking cash management statements. Max: 100MB.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion History Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Statement Ingestion Audit Log
          </h3>
          <span className="text-xs text-slate-500">{files.length} statement files</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">SHA-256 File Hash</th>
                <th className="py-3 px-4">Records Accepted</th>
                <th className="py-3 px-4">Records Rejected</th>
                <th className="py-3 px-4">Uploaded At</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && files.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading ingestion audit log...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No statements uploaded yet. Upload a statement file above to begin.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{file.filename}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{file.bank_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {file.format}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {file.file_hash.substring(0, 16)}...
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">
                    {file.records_accepted.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {file.records_rejected > 0 ? (
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {file.records_rejected}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(file.uploaded_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={file.status} size="sm" />
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
