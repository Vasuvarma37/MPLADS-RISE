/**
 * MPLADS RISE — Alerts Page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Clock, Filter, ArrowRight } from 'lucide-react';
import { alertsApi } from '../api/client';
import { Card, RiskBadge, StatusDot, Skeleton, EmptyState } from '../components/ui';
import type { Alert } from '../types';

const SEVERITIES = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES = ['All', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'RESOLVED'];

export default function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('All');
  const [status, setStatus] = useState('All');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        alertsApi.list({
          severity: severity !== 'All' ? severity : undefined,
          status: status !== 'All' ? status : undefined,
          limit: 100,
        }),
        alertsApi.summary(),
      ]);
      const data = alertsRes.data;
      setAlerts(data.items || data || []);
      setSummary(summaryRes.data || {});
    } catch {
      setAlerts(MOCK_ALERTS);
      setSummary({ CRITICAL: 3, HIGH: 8, MEDIUM: 12, LOW: 25 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [severity, status]);

  const updateStatus = async (alert: Alert, newStatus: string) => {
    setUpdatingId(alert.id);
    try {
      await alertsApi.update(alert.id, { status: newStatus });
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: newStatus as any } : a));
    } catch {
      console.error('Failed to update alert');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalActive = (summary.CRITICAL || 0) + (summary.HIGH || 0) + (summary.MEDIUM || 0);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Alerts & Flags</h1>
        <p className="text-sm text-slate-500">{totalActive} active alerts requiring attention</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: summary.CRITICAL || 0, color: 'bg-red-50 border-red-200', textColor: 'text-red-700', dotColor: 'bg-red-500' },
          { label: 'High', count: summary.HIGH || 0, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700', dotColor: 'bg-orange-500' },
          { label: 'Medium', count: summary.MEDIUM || 0, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700', dotColor: 'bg-amber-500' },
          { label: 'Low', count: summary.LOW || 0, color: 'bg-green-50 border-green-200', textColor: 'text-green-700', dotColor: 'bg-green-500' },
        ].map(({ label, count, color, textColor, dotColor }) => (
          <div key={label} className={`p-4 rounded-xl border ${color} flex items-center gap-3`}>
            <div className={`w-3 h-3 rounded-full ${dotColor} ${label === 'Critical' && count > 0 ? 'animate-pulse' : ''}`} />
            <div>
              <div className={`text-2xl font-bold ${textColor}`}>{count}</div>
              <div className="text-xs text-slate-500">{label} Alerts</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="text-xs text-slate-400">{alerts.length} alerts shown</span>
        </div>
      </Card>

      {/* Alert list */}
      <div className="space-y-2.5">
        {loading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : alerts.length === 0 ? (
          <Card>
            <EmptyState message="No alerts match your filters" icon={Bell} />
          </Card>
        ) : alerts.map((alert) => (
          <Card key={alert.id} className={`p-4 border-l-4 ${
            alert.severity === 'CRITICAL' ? 'border-l-red-500' :
            alert.severity === 'HIGH' ? 'border-l-orange-500' :
            alert.severity === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-green-500'
          }`}>
            <div className="flex items-start gap-3">
              <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                alert.severity === 'CRITICAL' ? 'text-red-500' :
                alert.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">{alert.project_id}</span>
                  <RiskBadge level={alert.severity as any} />
                  <StatusDot status={alert.status} />
                  <span className="text-xs text-slate-400">{alert.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{alert.message}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(alert.created_at).toLocaleDateString()}
                  {alert.alert_type && ` · ${alert.alert_type.replace(/_/g, ' ')}`}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                <button
                  onClick={() => navigate(`/projects/${alert.project_id}`)}
                  className="text-xs px-2.5 py-1 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 flex items-center gap-1"
                >
                  Investigate <ArrowRight className="w-3 h-3" />
                </button>
                {alert.status === 'NEW' && (
                  <button
                    onClick={() => updateStatus(alert, 'UNDER_REVIEW')}
                    disabled={updatingId === alert.id}
                    className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    Review
                  </button>
                )}
                {['NEW', 'UNDER_REVIEW', 'ASSIGNED'].includes(alert.status) && (
                  <button
                    onClick={() => updateStatus(alert, 'RESOLVED')}
                    disabled={updatingId === alert.id}
                    className="text-xs px-2.5 py-1 border border-green-300 text-green-600 rounded-md hover:bg-green-50 disabled:opacity-50"
                    title="Mark resolved"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const MOCK_ALERTS: Alert[] = [
  { id: 1, project_id: 'MPL-2026-00128', alert_type: 'PAYMENT_ANOMALY', severity: 'CRITICAL', message: 'Financial progress (91%) exceeds physical progress (42%) by 49%.', status: 'NEW', created_at: '2026-08-27T08:00:00' },
  { id: 2, project_id: 'MPL-2026-00401', alert_type: 'FULL_PAYMENT_LOW_PROGRESS', severity: 'CRITICAL', message: '100% funds disbursed but physical progress stuck at 20%.', status: 'UNDER_REVIEW', created_at: '2026-08-27T05:00:00' },
  { id: 3, project_id: 'MPL-2026-00788', alert_type: 'DUPLICATE_WORK', severity: 'HIGH', message: '93% text similarity with nearby project MPL-2026-00128.', status: 'ASSIGNED', created_at: '2026-08-26T10:00:00' },
  { id: 4, project_id: 'MPL-2026-00345', alert_type: 'SEVERE_DELAY', severity: 'HIGH', message: 'Project delayed by 145 days past expected completion date.', status: 'NEW', created_at: '2026-08-26T06:00:00' },
];
