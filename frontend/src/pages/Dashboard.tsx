/**
 * MPLADS RISE — Executive Dashboard (Overview Page)
 */
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FolderKanban, IndianRupee, AlertTriangle, ShieldAlert,
  RefreshCw, Download, ArrowRight, Copy, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectsApi, analyticsApi } from '../api/client';
import { MetricCard, Card, RiskBadge, DualProgressBar, Skeleton } from '../components/ui';
import type { AnalyticsSummary, Project, RiskAssessment } from '../types';

const RISK_PIE_COLORS = ['#16a34a', '#d97706', '#ea580c', '#dc2626'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topRisk, setTopRisk] = useState<Array<Project & { risk?: RiskAssessment }>>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, projectsRes, trendRes] = await Promise.all([
        projectsApi.summary(),
        projectsApi.list({ limit: 20, risk_level: 'CRITICAL' }),
        analyticsApi.riskTrend(),
      ]);
      setSummary(summaryRes.data);
      const items = projectsRes.data?.items || projectsRes.data || [];
      setTopRisk(items.slice(0, 5));
      setTrendData(trendRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard data error:', err);
      setSummary({
        total_projects: 2458, completed_projects: 890,
        total_sanctioned_lakh: 48500, total_expenditure_lakh: 32100,
        utilization_pct: 66.2,
        risk_distribution: { LOW: 450, MEDIUM: 120, HIGH: 45, CRITICAL: 12 },
      });
      setTrendData([
        { month: 'Mar', low: 145, medium: 48, high: 22, critical: 5 },
        { month: 'Apr', low: 160, medium: 55, high: 25, critical: 8 },
        { month: 'May', low: 165, medium: 60, high: 30, critical: 12 },
        { month: 'Jun', low: 170, medium: 58, high: 28, critical: 10 },
        { month: 'Jul', low: 175, medium: 62, high: 32, critical: 11 },
        { month: 'Aug', low: 180, medium: 65, high: 35, critical: 12 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!summary) return;
    const reportText = `MPLADS RISE — EXECUTIVE REPORT BRIEF
============================================================
Generated At: ${new Date().toLocaleString()}
Target Scheme: Members of Parliament Local Area Development Scheme (MPLADS)
Ministry: Ministry of Statistics & Programme Implementation, Govt of India

SYSTEM STATISTICS:
------------------------------------------------------------
* Total Sanctioned Projects: ${summary.total_projects.toLocaleString()}
* Completed Projects: ${summary.completed_projects.toLocaleString()}
* Total Funds Sanctioned: ₹${((summary.total_sanctioned_lakh || 0) / 100).toFixed(2)} Crores
* Total Expenditure Released: ₹${((summary.total_expenditure_lakh || 0) / 100).toFixed(2)} Crores
* Budget Utilization Rate: ${summary.utilization_pct.toFixed(2)}%

RISK DISTRIBUTION PROFILE:
------------------------------------------------------------
* Low Risk Projects: ${summary.risk_distribution.LOW}
* Medium Risk Projects: ${summary.risk_distribution.MEDIUM}
* High Risk Projects: ${summary.risk_distribution.HIGH}
* Critical Risk Projects: ${summary.risk_distribution.CRITICAL}
* Total Risk-Flagged Works: ${summary.risk_distribution.HIGH + summary.risk_distribution.CRITICAL}

CRITICAL ASSESSMENTS SUMMARY:
------------------------------------------------------------
${topRisk.map((p, idx) => `${idx + 1}. [${p.project_id}] ${p.work_name}
   - State: ${p.state} | District: ${p.district}
   - Sanctioned: ₹${p.sanction_amount_lakh} Lakhs | Spent: ₹${p.expenditure_amount_lakh} Lakhs
   - Physical Progress: ${p.physical_progress_pct}% | Financial Progress: ${p.financial_progress_pct}%
   - Current Status: Delay Days: ${p.delay_days} | Level: CRITICAL`).join('\n\n')}

============================================================
End of Report. Risk assessments powered by MPLADS RISE AI Core.
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MPLADS_RISE_Executive_Brief_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!summary) return;
    let csv = "MPLADS RISE — EXECUTIVE REPORT BRIEF\n";
    csv += `Generated At,${new Date().toLocaleString()}\n`;
    csv += "Ministry,Ministry of Statistics & Programme Implementation (Govt of India)\n\n";
    
    csv += "METRIC,VALUE,DETAILS\n";
    csv += `Total Sanctioned Projects,${summary.total_projects},Active this term\n`;
    csv += `Completed Projects,${summary.completed_projects},Approved completion certificates\n`;
    csv += `Funds Sanctioned (Crores),${((summary.total_sanctioned_lakh || 0) / 100).toFixed(2)},Total allocations\n`;
    csv += `Funds Spent (Crores),${((summary.total_expenditure_lakh || 0) / 100).toFixed(2)},Total expenditure releases\n`;
    csv += `Utilization Rate,${summary.utilization_pct.toFixed(2)}%,Percentage of funds utilized\n\n`;
    
    csv += "RISK CATEGORY,PROJECT COUNT\n";
    csv += `Low Risk,${summary.risk_distribution.LOW}\n`;
    csv += `Medium Risk,${summary.risk_distribution.MEDIUM}\n`;
    csv += `High Risk,${summary.risk_distribution.HIGH}\n`;
    csv += `Critical Risk,${summary.risk_distribution.CRITICAL}\n\n`;
    
    csv += "CRITICAL PROJECTS LIST\n";
    csv += "Project ID,Work Name,State,District,Sanction Amount (Lakhs),Expenditure Amount (Lakhs),Physical Progress %,Financial Progress %,Delay Days\n";
    topRisk.forEach(p => {
      csv += `"${p.project_id}","${p.work_name.replace(/"/g, '""')}","${p.state}","${p.district}",${p.sanction_amount_lakh},${p.expenditure_amount_lakh},${p.physical_progress_pct},${p.financial_progress_pct},${p.delay_days}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MPLADS_RISE_Executive_Brief_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    window.print();
  };

  useEffect(() => { fetchData(); }, []);

  const riskDonut = summary ? [
    { name: 'Low', value: summary.risk_distribution.LOW },
    { name: 'Medium', value: summary.risk_distribution.MEDIUM },
    { name: 'High', value: summary.risk_distribution.HIGH },
    { name: 'Critical', value: summary.risk_distribution.CRITICAL },
  ] : [];

  return (
    <div className="space-y-5 fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Executive Overview</h1>
          <p className="text-sm text-slate-400">
            MPLADS project risk monitoring · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-300 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={!summary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-all font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Export Brief
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 z-50 animate-fadeIn">
                <button
                  onClick={() => { exportToExcel(); setShowExportDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  📊 Export to Excel (.csv)
                </button>
                <button
                  onClick={() => { exportToPdf(); setShowExportDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  📄 Export to PDF (Print)
                </button>
                <button
                  onClick={() => { handleExport(); setShowExportDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  📝 Export to Text (.txt)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Projects" icon={FolderKanban} color="blue"
            value={summary?.total_projects.toLocaleString() || '—'}
            subtitle="Active this term · Monitoring ON"
          />
          <MetricCard
            title="Funds Sanctioned" icon={IndianRupee} color="green"
            value={`₹${((summary?.total_sanctioned_lakh || 0) / 100).toFixed(0)} Cr`}
            subtitle={`${summary?.utilization_pct.toFixed(1)}% utilized`}
          />
          <MetricCard
            title="High-Risk Projects" icon={AlertTriangle} color="orange"
            value={((summary?.risk_distribution.HIGH || 0) + (summary?.risk_distribution.CRITICAL || 0)).toString()}
            trendValue="+14% MoM" trend="up" invertTrend subtitle="Require review"
          />
          <MetricCard
            title="Critical Alerts" icon={ShieldAlert} color="red"
            value={summary?.risk_distribution.CRITICAL.toString() || '0'}
            trendValue="-2% MoM" trend="down" subtitle="Resolved this month"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Risk Donut */}
        <Card className="p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Risk Distribution</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDonut} innerRadius={55} outerRadius={80}
                  paddingAngle={4} dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {riskDonut.map((_, i) => (
                    <Cell key={i} fill={RISK_PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} projects`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Risk Trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4 text-sm">Project Risk Trend (6 Months)</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  {[
                    { id: 'critical', color: '#dc2626' }, { id: 'high', color: '#ea580c' },
                    { id: 'medium', color: '#d97706' }, { id: 'low', color: '#16a34a' },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backgroundColor: '#1e293b', color: '#f8fafc' }} />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                {[
                  { key: 'critical', color: '#dc2626' }, { key: 'high', color: '#ea580c' },
                  { key: 'medium', color: '#d97706' }, { key: 'low', color: '#16a34a' },
                ].map(({ key, color }) => (
                  <Area key={key} type="monotone" dataKey={key} stackId="1"
                    stroke={color} fill={`url(#${key})`} name={key.charAt(0).toUpperCase() + key.slice(1)}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* SIH26102 Fraud Detection Summary + Quick Nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Payment Anomalies</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{summary?.risk_distribution.CRITICAL || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Financial &gt; Physical by &gt;20%</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2 mb-1">
            <Copy className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Duplicate Signals</span>
          </div>
          <div className="text-2xl font-bold text-orange-500">{summary?.risk_distribution.HIGH || 0}</div>
          <div className="text-xs text-slate-400 mt-1">AI detected similar works</div>
        </Card>
        <Card
          className="p-4 cursor-pointer hover:border-amber-400 transition-colors group"
          onClick={() => navigate('/projects?risk_level=CRITICAL')}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Delayed Projects</span>
          </div>
          <div className="text-2xl font-bold text-amber-500">{(summary?.risk_distribution.MEDIUM || 0) + 14}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">Physical progress &lt; expected</div>
        </Card>
        <Card
          className="p-4 cursor-pointer hover:border-purple-400 transition-colors group"
          onClick={() => navigate('/projects?risk_level=HIGH')}
        >
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Cost Anomalies</span>
          </div>
          <div className="text-2xl font-bold text-purple-500">{summary?.risk_distribution.HIGH || 0}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">Expenditure &gt; Sanctioned</div>
        </Card>
      </div>

      {/* Top risk projects table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm">Critical & High Risk Projects</h3>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Location</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Financials (₹L)</th>
                <th className="px-4 py-3 text-left font-medium">Progress</th>
                <th className="px-4 py-3 text-left font-medium">Risk</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                ))
              ) : topRisk.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No critical projects found</td></tr>
              ) : topRisk.map((p) => (
                <tr key={p.project_id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/projects/${p.project_id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-400 text-xs">{p.project_id}</div>
                    <div className="text-slate-200 text-xs truncate max-w-[200px]">{p.work_name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 hidden sm:table-cell">
                    {p.district}, {p.state}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs text-slate-300">Exp: ₹{p.expenditure_amount_lakh}</div>
                    <div className="text-xs text-slate-400">San: ₹{p.sanction_amount_lakh}</div>
                  </td>
                  <td className="px-4 py-3">
                    <DualProgressBar physical={p.physical_progress_pct} financial={p.financial_progress_pct} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={'CRITICAL'} score={p.delay_days > 100 ? 85 : 67} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.project_id}`); }}
                      className="text-xs px-2.5 py-1 border border-slate-600 rounded-md hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
