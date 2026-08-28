/**
 * MPLADS RISE — Analytics Page
 */
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis, ResponsiveContainer, Cell
} from 'recharts';
import { projectsApi, analyticsApi } from '../api/client';
import { Card, Skeleton } from '../components/ui';
import type { StateAnalytics } from '../types';

export default function Analytics() {
  const [stateData, setStateData] = useState<StateAnalytics[]>([]);
  const [scatter, setScatter] = useState<{x:number;y:number;z:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stateRes, scatterRes] = await Promise.all([
          projectsApi.stateAnalytics(),
          analyticsApi.scatter(),
        ]);
        setStateData(stateRes.data.slice(0, 15));
        setScatter(scatterRes.data.slice(0, 200));
      } catch {
        setStateData(MOCK_STATE_DATA);
        setScatter(MOCK_SCATTER);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const topByDelay = [...stateData].sort((a, b) => b.avg_delay_days - a.avg_delay_days).slice(0, 10);
  const topByAmount = [...stateData].sort((a, b) => b.total_sanctioned_lakh - a.total_sanctioned_lakh).slice(0, 10);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-400">State-wise trends, financial utilization, and anomaly scatter</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5 bg-slate-900 border-slate-800">
          <h3 className="font-semibold text-slate-200 text-sm mb-4">Fund Utilization by State (₹ Lakhs)</h3>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topByAmount} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="state" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}L`]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="total_sanctioned_lakh" name="Sanctioned" fill="#2563eb" radius={[0, 4, 4, 0]}>
                  {topByAmount.map((_, i) => <Cell key={i} fill={`hsl(${220 + i * 5}, 80%, ${50 + i * 2}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 bg-slate-900 border-slate-800">
          <h3 className="font-semibold text-slate-200 text-sm mb-4">Average Delay by State (Days)</h3>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topByDelay} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="state" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(0)} days`]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="avg_delay_days" name="Avg Delay" radius={[0, 4, 4, 0]}>
                  {topByDelay.map((entry, i) => (
                    <Cell key={i} fill={entry.avg_delay_days > 100 ? '#dc2626' : entry.avg_delay_days > 50 ? '#ea580c' : '#16a34a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-1">Financial vs Physical Progress — Anomaly Detection</h3>
        <p className="text-xs text-slate-400 mb-4">Points far from the diagonal indicate payment anomalies. Bubble size = sanctioned amount.</p>
        {loading ? <Skeleton className="h-72" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="x" name="Financial %" type="number" domain={[0, 100]}
                label={{ value: 'Financial Progress (%)', position: 'insideBottom', offset: -15, fontSize: 11 }}
                tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
              />
              <YAxis dataKey="y" name="Physical %" type="number" domain={[0, 100]}
                label={{ value: 'Physical Progress (%)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
              />
              <ZAxis dataKey="z" range={[20, 200]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Scatter data={scatter} fill="#2563eb" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-slate-400 mt-2 text-center">
          ← Points in upper-left region (High Financial, Low Physical) are flagged as CRITICAL risks
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">State-wise Summary</h3>
          <span className="text-xs text-slate-400">Sorted by average delay (worst first)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">State</th>
                <th className="px-4 py-3 text-right font-medium">Projects</th>
                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Sanctioned (₹L)</th>
                <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Expenditure (₹L)</th>
                <th className="px-4 py-3 text-right font-medium">Avg Delay</th>
                <th className="px-4 py-3 text-right font-medium">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...stateData].sort((a, b) => b.avg_delay_days - a.avg_delay_days).map((row, idx) => {
                const isWorst = idx < 3;
                const rowBg = idx === 0 ? 'bg-red-50/60' : idx === 1 ? 'bg-orange-50/40' : idx === 2 ? 'bg-amber-50/30' : '';
                return (
                  <tr key={row.state} className={`table-row-hover ${rowBg}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${idx === 0 ? 'text-red-600' : idx === 1 ? 'text-orange-600' : idx === 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {isWorst ? ['🔴', '🟠', '🟡'][idx] : idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.state}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.project_count}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden sm:table-cell">{row.total_sanctioned_lakh.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{row.total_expenditure_lakh.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold text-xs ${row.avg_delay_days > 100 ? 'text-red-600' : row.avg_delay_days > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                        {row.avg_delay_days.toFixed(0)}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        row.avg_delay_days > 100 ? 'bg-red-50 text-red-700 border border-red-200' :
                        row.avg_delay_days > 50 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {row.avg_delay_days > 100 ? 'HIGH RISK' : row.avg_delay_days > 50 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const MOCK_STATE_DATA: StateAnalytics[] = [
  { state: 'Uttar Pradesh', project_count: 420, total_sanctioned_lakh: 8400, total_expenditure_lakh: 5600, avg_delay_days: 145 },
  { state: 'Maharashtra', project_count: 385, total_sanctioned_lakh: 7700, total_expenditure_lakh: 6200, avg_delay_days: 78 },
  { state: 'Bihar', project_count: 360, total_sanctioned_lakh: 7200, total_expenditure_lakh: 4800, avg_delay_days: 165 },
  { state: 'Rajasthan', project_count: 290, total_sanctioned_lakh: 5800, total_expenditure_lakh: 4200, avg_delay_days: 92 },
  { state: 'Madhya Pradesh', project_count: 265, total_sanctioned_lakh: 5300, total_expenditure_lakh: 3900, avg_delay_days: 110 },
  { state: 'Tamil Nadu', project_count: 240, total_sanctioned_lakh: 4800, total_expenditure_lakh: 4100, avg_delay_days: 45 },
  { state: 'Karnataka', project_count: 225, total_sanctioned_lakh: 4500, total_expenditure_lakh: 3800, avg_delay_days: 52 },
  { state: 'West Bengal', project_count: 210, total_sanctioned_lakh: 4200, total_expenditure_lakh: 3100, avg_delay_days: 88 },
];
const MOCK_SCATTER = Array.from({ length: 100 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 50 + 10,
}));
