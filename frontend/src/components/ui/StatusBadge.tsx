import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, Check } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toUpperCase().replace(/\s+/g, '_');

  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Clock className="w-3 h-3" />;
  let label = status.replace(/_/g, ' ');

  if (['MATCHED', 'COMPLETED', 'RESOLVED', 'CLOSED', 'ACTIVE', 'VERIFIED_VALID', 'PASSED'].includes(norm)) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
  } else if (['COMPLETED_WITH_WARNINGS', 'DEGRADED', 'INVESTIGATING', 'OPEN', 'PENDING'].includes(norm)) {
    style = 'bg-amber-50 text-amber-800 border-amber-200';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
  } else if (['FAILED', 'CRITICAL', 'ESCALATED', 'DISCONNECTED', 'BREACHED'].includes(norm)) {
    style = 'bg-rose-50 text-rose-800 border-rose-200';
    icon = <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
  } else if (['MANUAL_MATCHED', 'MANUAL'].includes(norm)) {
    style = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    icon = <Check className="w-3.5 h-3.5 text-indigo-600" />;
  } else if (['UNMATCHED', 'EXCEPTION'].includes(norm)) {
    style = 'bg-amber-50 text-amber-900 border-amber-300';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />;
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-md uppercase tracking-wider ${px} ${style}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
