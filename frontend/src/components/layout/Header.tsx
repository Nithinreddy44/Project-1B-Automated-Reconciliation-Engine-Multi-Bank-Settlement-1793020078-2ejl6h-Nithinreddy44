import React from 'react';
import { RefreshCw, PlayCircle, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  reportingPeriod?: string;
  lastRefresh?: string;
  reconciliationStatus?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: 'upload' | 'run';
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  reportingPeriod = 'Today (Intraday Settlement Cycle)',
  lastRefresh,
  reconciliationStatus = 'OPERATIONAL',
  onRefresh,
  isRefreshing = false,
  onPrimaryAction,
  primaryActionLabel = 'Start reconciliation',
  primaryActionIcon = 'run',
}) => {
  const { isReadOnly, canTriggerRecon } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-2xs">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              reconciliationStatus === 'OPERATIONAL'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {reconciliationStatus === 'OPERATIONAL' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Engine: {reconciliationStatus}</span>
          </span>
          {isReadOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
              AUDITOR READ-ONLY
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
          <span>
            Period: <strong className="text-slate-700">{reportingPeriod}</strong>
          </span>
          {lastRefresh && (
            <span>
              Last refreshed:{' '}
              <strong className="text-slate-700">
                {new Date(lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </strong>
            </span>
          )}
          {subtitle && <span className="hidden lg:inline text-slate-400">• {subtitle}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}

        {onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={!canTriggerRecon}
            title={!canTriggerRecon ? 'Requires ANALYST or ADMIN role permissions' : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {primaryActionIcon === 'upload' ? (
              <UploadCloud className="w-4 h-4" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            <span>{primaryActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
};
