import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  trend?: {
    positive: boolean;
    text: string;
  };
  accent?: 'default' | 'success' | 'warning' | 'danger';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subValue,
  tooltip,
  icon,
  trend,
  accent = 'default',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  let accentBorder = 'border-slate-200';
  let accentBar = '';

  if (accent === 'success') {
    accentBar = 'border-l-4 border-l-emerald-500';
  } else if (accent === 'warning') {
    accentBar = 'border-l-4 border-l-amber-500';
  } else if (accent === 'danger') {
    accentBar = 'border-l-4 border-l-rose-500';
  }

  return (
    <div
      className={`relative bg-white rounded-lg p-5 border ${accentBorder} ${accentBar} shadow-xs hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>{label}</span>
          {tooltip && (
            <div className="relative inline-block">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-hidden"
                aria-label={`More info about ${label}`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none leading-relaxed">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>
          )}
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {subValue && <div className="text-xs text-slate-500 font-medium">{subValue}</div>}
      </div>

      {trend && (
        <div
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            trend.positive ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
};
