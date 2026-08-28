/**
 * MPLADS RISE — Shared UI Components
 */
import type { RiskLevel } from '../types';

// ── Risk Colors ────────────────────────────────────────────────────────────
export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#ea580c', CRITICAL: '#dc2626',
};
export const RISK_BG: Record<RiskLevel, string> = {
  LOW: 'bg-green-50 text-green-700 border-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const isPulse = level === 'CRITICAL';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${RISK_BG[level]} ${isPulse ? 'risk-pulse-critical' : ''}`}>
      {score !== undefined ? `${score}/100` : level}
    </span>
  );
}

export function Card({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${onClick ? 'cursor-pointer card-hover' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue', invertTrend = false }: {
  title: string; value: string; subtitle?: string;
  icon?: React.ElementType; trend?: 'up' | 'down'; trendValue?: string; color?: string; invertTrend?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const isUpPositive = invertTrend ? trend === 'down' : trend === 'up';
  return (
    <Card className="p-5 card-hover fade-in">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {(trendValue || subtitle) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trendValue && (
            <span className={isUpPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}

export function DualProgressBar({ physical, financial }: { physical: number; financial: number }) {
  const p = Math.min(physical, 100);
  const f = Math.min(financial, 100);
  const gap = Math.max(0, f - p);
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between text-xs text-slate-500">
        <span>P:{p}%</span>
        <span>F:{f}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-500 progress-fill rounded-full" style={{ width: `${p}%` }} />
        {gap > 0 && (
          <div className="h-full bg-red-400 opacity-60 progress-fill" style={{ width: `${gap}%` }} />
        )}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function Button({
  children, variant = 'primary', icon: Icon, onClick, className = '', disabled = false, size = 'md'
}: {
  children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ElementType; onClick?: () => void; className?: string; disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const base = `inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`;
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-blue-900 text-white hover:bg-blue-800 focus:ring-blue-900 shadow-sm',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className={`${children ? 'mr-1.5' : ''} w-4 h-4`} />}
      {children}
    </button>
  );
}

export function EmptyState({ message, icon: Icon }: { message: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      {Icon && <Icon className="w-12 h-12 mb-3 opacity-40" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEW: 'bg-red-500', UNDER_REVIEW: 'bg-amber-500', ASSIGNED: 'bg-blue-500',
    RESOLVED: 'bg-green-500', DISMISSED: 'bg-slate-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-400'}`} />;
}

/** Simple toast/banner notification */
export function Toast({ message, type = 'success', onClose }: {
  message: string; type?: 'success' | 'error' | 'info'; onClose: () => void;
}) {
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-700 text-white',
  };
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${colors[type]}`}
      style={{ animation: 'fadeIn 0.3s ease' }}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 font-bold">×</button>
    </div>
  );
}

