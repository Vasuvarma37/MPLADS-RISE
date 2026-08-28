/**
 * MPLADS RISE — MP Performance Leaderboard
 * SIH26102: MP accountability & efficiency analysis
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Download, ArrowUpDown, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, RiskBadge } from '../components/ui';
import type { RiskLevel } from '../types';

interface MPData {
  rank: number;
  name: string;
  constituency: string;
  state: string;
  house: 'Lok Sabha' | 'Rajya Sabha';
  party: string;
  totalProjects: number;
  completedProjects: number;
  totalFundsLakh: number;
  utilizedFundsLakh: number;
  criticalAlerts: number;
  avgDelay: number;
  utilizationPct: number;
  completionRate: number;
  performanceScore: number;
  riskLevel: RiskLevel;
}

const MOCK_MPs: MPData[] = [
  { rank: 1, name: 'Suresh Kumar Verma', constituency: 'Lucknow', state: 'Uttar Pradesh', house: 'Lok Sabha', party: 'BJP', totalProjects: 48, completedProjects: 45, totalFundsLakh: 240, utilizedFundsLakh: 235, criticalAlerts: 0, avgDelay: 8, utilizationPct: 97.9, completionRate: 93.8, performanceScore: 96, riskLevel: 'LOW' },
  { rank: 2, name: 'Priya Nair', constituency: 'Thiruvananthapuram', state: 'Kerala', house: 'Lok Sabha', party: 'INC', totalProjects: 42, completedProjects: 40, totalFundsLakh: 210, utilizedFundsLakh: 206, criticalAlerts: 1, avgDelay: 12, utilizationPct: 98.1, completionRate: 95.2, performanceScore: 94, riskLevel: 'LOW' },
  { rank: 3, name: 'Ravi Shankar Mishra', constituency: 'Patna Sahib', state: 'Bihar', house: 'Lok Sabha', party: 'BJP', totalProjects: 52, completedProjects: 44, totalFundsLakh: 260, utilizedFundsLakh: 248, criticalAlerts: 3, avgDelay: 28, utilizationPct: 95.4, completionRate: 84.6, performanceScore: 88, riskLevel: 'LOW' },
  { rank: 4, name: 'Anjali Deshpande', constituency: 'Pune', state: 'Maharashtra', house: 'Lok Sabha', party: 'NCP', totalProjects: 45, completedProjects: 37, totalFundsLakh: 225, utilizedFundsLakh: 210, criticalAlerts: 4, avgDelay: 42, utilizationPct: 93.3, completionRate: 82.2, performanceScore: 82, riskLevel: 'MEDIUM' },
  { rank: 5, name: 'Deepak Choudhary', constituency: 'Jaipur Rural', state: 'Rajasthan', house: 'Lok Sabha', party: 'BJP', totalProjects: 56, completedProjects: 41, totalFundsLakh: 280, utilizedFundsLakh: 255, criticalAlerts: 6, avgDelay: 68, utilizationPct: 91.1, completionRate: 73.2, performanceScore: 74, riskLevel: 'MEDIUM' },
  { rank: 6, name: 'Sunita Rao', constituency: 'Hyderabad', state: 'Telangana', house: 'Lok Sabha', party: 'AIMIM', totalProjects: 38, completedProjects: 28, totalFundsLakh: 190, utilizedFundsLakh: 168, criticalAlerts: 5, avgDelay: 55, utilizationPct: 88.4, completionRate: 73.7, performanceScore: 72, riskLevel: 'MEDIUM' },
  { rank: 7, name: 'Mahendra Singh Yadav', constituency: 'Azamgarh', state: 'Uttar Pradesh', house: 'Lok Sabha', party: 'SP', totalProjects: 62, completedProjects: 32, totalFundsLakh: 310, utilizedFundsLakh: 245, criticalAlerts: 12, avgDelay: 142, utilizationPct: 79.0, completionRate: 51.6, performanceScore: 42, riskLevel: 'HIGH' },
  { rank: 8, name: 'Ramesh Gupta', constituency: 'Gorakhpur', state: 'Uttar Pradesh', house: 'Lok Sabha', party: 'BJP', totalProjects: 58, completedProjects: 22, totalFundsLakh: 290, utilizedFundsLakh: 248, criticalAlerts: 18, avgDelay: 188, utilizationPct: 85.5, completionRate: 37.9, performanceScore: 28, riskLevel: 'CRITICAL' },
  { rank: 9, name: 'Karuna Das', constituency: 'Patna', state: 'Bihar', house: 'Lok Sabha', party: 'RJD', totalProjects: 65, completedProjects: 18, totalFundsLakh: 325, utilizedFundsLakh: 302, criticalAlerts: 22, avgDelay: 210, utilizationPct: 92.9, completionRate: 27.7, performanceScore: 20, riskLevel: 'CRITICAL' },
  { rank: 10, name: 'Abdul Rahman Sheikh', constituency: 'Meerut', state: 'Uttar Pradesh', house: 'Lok Sabha', party: 'BSP', totalProjects: 70, completedProjects: 12, totalFundsLakh: 350, utilizedFundsLakh: 338, criticalAlerts: 26, avgDelay: 248, utilizationPct: 96.6, completionRate: 17.1, performanceScore: 10, riskLevel: 'CRITICAL' },
];

type SortKey = 'performanceScore' | 'utilizationPct' | 'completionRate' | 'criticalAlerts' | 'avgDelay';

const SCORE_COLOR = (s: number) =>
  s >= 85 ? '#16a34a' : s >= 65 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626';

export default function MPLeaderboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('performanceScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [houseFilter, setHouseFilter] = useState('All');

  const filtered = MOCK_MPs
    .filter(mp =>
      (houseFilter === 'All' || mp.house === houseFilter) &&
      (mp.name.toLowerCase().includes(search.toLowerCase()) ||
        mp.constituency.toLowerCase().includes(search.toLowerCase()) ||
        mp.state.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const exportCSV = () => {
    const header = 'Rank,Name,Constituency,State,Party,Total Projects,Completed,Allocated Amount (L),Recommended Amount (L),Utilization %,Completion Rate %,Critical Alerts,Avg Delay (days),Performance Score,Risk Level\n';
    const rows = filtered.map(m =>
      `${m.rank},"${m.name}","${m.constituency}","${m.state}","${m.party}",${m.totalProjects},${m.completedProjects},${m.utilizationPct},${m.completionRate},${m.criticalAlerts},${m.avgDelay},${m.performanceScore},${m.riskLevel}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'MP_Leaderboard_MPLADS_RISE.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const ThBtn = ({ label, sortK }: { label: string; sortK: SortKey }) => (
    <th
      className="px-3 py-3 text-left font-medium cursor-pointer hover:text-blue-700 select-none group"
      onClick={() => toggleSort(sortK)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 opacity-40 group-hover:opacity-100 ${sortKey === sortK ? 'opacity-100 text-blue-600' : ''}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            MP Performance Leaderboard
          </h1>
          <p className="text-sm text-slate-500">Ranked by fund recommendations (utilization against allocation), completion rate & risk score</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4">
        {[MOCK_MPs[1], MOCK_MPs[0], MOCK_MPs[2]].map((mp, i) => {
          const podiumPos = [2, 1, 3][i];
          const heights = ['h-24', 'h-32', 'h-20'];
          const medals = ['🥈', '🥇', '🥉'];
          return (
            <Card key={mp.name} className={`p-4 text-center flex flex-col items-center justify-end ${podiumPos === 1 ? 'border-yellow-300 bg-yellow-50/50' : ''}`}>
              <div className="text-2xl mb-1">{medals[i]}</div>
              <div className="text-xs font-bold text-slate-800 truncate w-full text-center">{mp.name}</div>
              <div className="text-xs text-slate-400 truncate">{mp.constituency}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">{mp.state}</div>
              <div
                className={`w-full rounded-t-lg mt-3 flex items-center justify-center ${heights[i]}`}
                style={{ background: SCORE_COLOR(mp.performanceScore) }}
              >
                <span className="text-white font-bold text-lg">{mp.performanceScore}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'MPs Tracked', value: MOCK_MPs.length, icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Critical MPs', value: MOCK_MPs.filter(m => m.riskLevel === 'CRITICAL').length, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Top Performers', value: MOCK_MPs.filter(m => m.performanceScore >= 85).length, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Avg Score', value: Math.round(MOCK_MPs.reduce((s, m) => s + m.performanceScore, 0) / MOCK_MPs.length), icon: Trophy, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search MP name, constituency, state..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={houseFilter} onChange={e => setHouseFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">Both Houses</option>
            <option value="Lok Sabha">Lok Sabha</option>
            <option value="Rajya Sabha">Rajya Sabha</option>
          </select>
          <span className="text-xs text-slate-400">{filtered.length} MPs shown</span>
        </div>
      </Card>

      {/* Leaderboard table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Rank</th>
                <th className="px-3 py-3 text-left font-medium">MP / Constituency</th>
                <th className="px-3 py-3 text-left font-medium hidden md:table-cell">State · Party</th>
                <ThBtn label="Score" sortK="performanceScore" />
                <ThBtn label="Utilization" sortK="utilizationPct" />
                <ThBtn label="Completion" sortK="completionRate" />
                <ThBtn label="Alerts" sortK="criticalAlerts" />
                <ThBtn label="Avg Delay" sortK="avgDelay" />
                <th className="px-3 py-3 text-left font-medium">Risk</th>
                <th className="px-3 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((mp, idx) => (
                <tr key={mp.name} className={`table-row-hover ${mp.riskLevel === 'CRITICAL' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-3 py-3.5">
                    <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx + 1}`}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="font-semibold text-slate-800 text-xs">{mp.name}</div>
                    <div className="text-xs text-slate-400">{mp.constituency} · {mp.house}</div>
                  </td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <div className="text-xs text-slate-700">{mp.state}</div>
                    <div className="text-xs text-slate-400">{mp.party}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${mp.performanceScore}%`, background: SCORE_COLOR(mp.performanceScore) }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: SCORE_COLOR(mp.performanceScore) }}>
                        {mp.performanceScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{mp.utilizationPct.toFixed(1)}%</td>
                  <td className="px-3 py-3.5">
                    <span className={`text-xs font-semibold ${mp.completionRate >= 80 ? 'text-green-600' : mp.completionRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                      {mp.completionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`text-xs font-bold ${mp.criticalAlerts > 10 ? 'text-red-600' : mp.criticalAlerts > 5 ? 'text-orange-600' : 'text-slate-500'}`}>
                      {mp.criticalAlerts}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`text-xs font-semibold ${mp.avgDelay > 100 ? 'text-red-600' : mp.avgDelay > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                      {mp.avgDelay}d
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <RiskBadge level={mp.riskLevel} />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <button
                      onClick={() => navigate(`/projects?state=${encodeURIComponent(mp.state)}`)}
                      className="text-xs px-2 py-1 border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      Projects →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
          *Utilization indicates the percentage of Allocated Amount that has been Recommended by the MP on the portal. Score is a composite of utilization, completion rate, delay penalty, and alert penalty.
        </div>
      </Card>
    </div>
  );
}
