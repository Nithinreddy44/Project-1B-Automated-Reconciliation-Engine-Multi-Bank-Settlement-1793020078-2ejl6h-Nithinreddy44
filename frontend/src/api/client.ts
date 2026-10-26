// Centralized typed API client for ReconOps — Settlement Guardian

const API_BASE = '/api/v1';

export interface DashboardMetrics {
  reporting_period: string;
  last_refresh_time: string;
  reconciliation_status: string;
  summary: {
    records_processed: number;
    records_processed_label: string;
    match_rate: number;
    match_rate_label: string;
    open_exceptions: number;
    open_exceptions_label: string;
    amount_under_review: number;
    amount_under_review_label: string;
    sla_compliance: number;
    sla_compliance_label: string;
    last_completed_reconciliation: string | null;
    active_banks_count: number;
  };
  actionable_alerts: Array<{
    id: string;
    type: string;
    title: string;
    bank_id: string;
    amount: string;
    description: string;
    sla_warning: string;
    recommended_action: string;
    tier: number;
    urgency: string;
  }>;
  charts: {
    match_rate_trend: Array<{ date: string; rate: number; volume: number }>;
    exception_categories_breakdown: Array<{ category: string; raw_key: string; count: number }>;
    bank_health: Array<any>;
  };
}

export interface BankItem {
  id: string;
  name: string;
  country: string;
  currency: string;
  supported_formats: string[];
  connection_status: 'ACTIVE' | 'DEGRADED' | 'DISCONNECTED';
  last_ingestion_time: string | null;
  last_reconciliation_time: string | null;
  match_rate: number;
  open_exceptions: number;
  sla_compliance: number;
  recent_failures: number;
}

export interface ReconciliationRunItem {
  id: string;
  run_number: string;
  bank_id: string;
  date_from: string;
  date_to: string;
  currency: string;
  rules_applied: string[];
  status: 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'FAILED';
  total_records: number;
  matched_records: number;
  unmatched_records: number;
  exceptions_count: number;
  match_rate: number;
  start_time: string;
  end_time: string;
  elapsed_seconds: number;
  pipeline_stages: Array<{
    stage_number: number;
    name: string;
    description: string;
    status: string;
    records_processed: number;
    failures: number;
    elapsed_ms: number;
  }>;
  initiated_by: string;
  exceptions?: ExceptionItem[];
}

export interface ExceptionItem {
  id: string;
  run_id: string | null;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  bank_id: string;
  internal_txn_id: string | null;
  external_txn_id: string | null;
  discrepancy_amount: number;
  currency: string;
  plain_explanation: string;
  details: Record<string, any>;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  tier: number;
  sla_deadline: string;
  sla_minutes_total: number;
  sla_minutes_remaining: number;
  is_breached: boolean;
  assigned_to: string;
  recommended_action: string;
  resolution_notes?: string;
  resolution_reason?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  internal_record?: any;
  external_record?: any;
  candidates?: any[];
  audit_history?: any[];
}

export interface TransactionItem {
  id: string;
  source: 'INTERNAL_LEDGER' | 'EXTERNAL_STATEMENT';
  bank_id: string;
  reference: string;
  amount: number;
  currency: string;
  direction: 'DEBIT' | 'CREDIT';
  transaction_date: string;
  value_date: string;
  counterparty: string;
  narration: string;
  source_file: string;
  match_status: 'MATCHED' | 'UNMATCHED' | 'EXCEPTION' | 'MANUAL_MATCHED';
  match_type: 'EXACT' | 'FUZZY' | 'RULE_BASED' | 'MANUAL' | 'NONE';
  confidence_score: number;
  matched_transaction_id?: string;
  match_explanation?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  rationale: string;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  prev_hash: string;
  hash: string;
}

export interface IngestedFileItem {
  id: string;
  filename: string;
  bank_id: string;
  format: string;
  file_hash: string;
  file_size_bytes: number;
  records_read: number;
  records_accepted: number;
  records_rejected: number;
  status: string;
  parse_warnings: string[];
  uploaded_at: string;
  uploaded_by: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.detail) errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>(`${API_BASE}/dashboard/metrics`),

  // Reconciliation
  triggerReconciliation: (payload: {
    bank_id: string;
    date_from: string;
    date_to: string;
    currency: string;
    amount_tolerance: number;
    date_tolerance_days: number;
    initiated_by?: string;
  }) =>
    request<ReconciliationRunItem>(`${API_BASE}/reconciliation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getReconciliationRuns: () => request<ReconciliationRunItem[]>(`${API_BASE}/reconciliation/runs`),
  getReconciliationRunDetail: (runId: string) => request<ReconciliationRunItem>(`${API_BASE}/reconciliation/runs/${runId}`),
  executeManualMatch: (payload: { internal_transaction_id: string; external_transaction_id: string; rationale: string; actor: string }) =>
    request<{ success: boolean; message: string; internal_transaction: any; external_transaction: any }>(
      `${API_BASE}/reconciliation/manual-match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    ),

  // Ingestion
  getSupportedFormats: () => request<{ supported_formats: any[] }>(`${API_BASE}/ingest/formats`),
  getIngestedFiles: () => request<IngestedFileItem[]>(`${API_BASE}/ingest/files`),
  uploadStatementFile: (formData: FormData) =>
    request<{ success: boolean; message: string; file_details: IngestedFileItem; next_step: string }>(
      `${API_BASE}/ingest/upload`,
      {
        method: 'POST',
        body: formData,
      }
    ),

  // Transactions
  getTransactions: (params?: {
    source?: string;
    bank_id?: string;
    match_status?: string;
    match_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return request<{ total: number; offset: number; limit: number; items: TransactionItem[] }>(
      `${API_BASE}/transactions?${q.toString()}`
    );
  },
  compareTransaction: (txnId: string) => request<any>(`${API_BASE}/transactions/${txnId}/compare`),

  // Exceptions
  getExceptions: (params?: {
    category?: string;
    severity?: string;
    bank_id?: string;
    status?: string;
    tier?: number;
    sla_breached?: boolean;
    assigned_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return request<{ total: number; offset: number; limit: number; items: ExceptionItem[] }>(
      `${API_BASE}/exceptions?${q.toString()}`
    );
  },
  getExceptionDetail: (id: string) => request<ExceptionItem>(`${API_BASE}/exceptions/${id}`),
  executeExceptionAction: (
    id: string,
    payload: {
      action: string;
      actor: string;
      assigned_to?: string;
      note?: string;
      resolution_reason?: string;
      escalate_to_tier?: number;
    }
  ) =>
    request<{ success: boolean; message: string; exception: ExceptionItem }>(`${API_BASE}/exceptions/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Banks
  getBanks: () => request<BankItem[]>(`${API_BASE}/banks`),
  getBankDetails: (bankId: string) => request<any>(`${API_BASE}/banks/${bankId}`),
  getBankMapping: (bankId: string) => request<any>(`${API_BASE}/banks/${bankId}/mapping`),
  updateBankMapping: (bankId: string, payload: any) =>
    request<any>(`${API_BASE}/banks/${bankId}/mapping`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Reports
  getReport: (reportType: string) => request<any>(`${API_BASE}/reports/${reportType}`),
  getReportExportUrl: (reportType: string) => `${API_BASE}/reports/${reportType}/export`,

  // Audit
  getAuditLogs: (params?: { actor?: string; action?: string; entity_id?: string; search?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return request<{ total: number; offset: number; limit: number; items: AuditLogItem[] }>(`${API_BASE}/audit/logs?${q.toString()}`);
  },
  verifyAuditIntegrity: () => request<{ verified: boolean; total_records: number; latest_hash?: string; message: string }>(`${API_BASE}/audit/verify`),

  // Performance Lab
  getBenchmarksMeta: () => request<{ spec_benchmarks: any[]; available_scenarios: any[] }>(`${API_BASE}/performance/benchmarks`),
  runBenchmark: (payload: { mode: string; scenario: string; record_count: number; format: string }) =>
    request<any>(`${API_BASE}/performance/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
