/**
 * MPLADS RISE — Project Explorer Page
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Building2, Calendar, ChevronLeft, ChevronRight, MapPin, Camera, FileText } from 'lucide-react';
import { projectsApi } from '../api/client';
import { Card, RiskBadge, DualProgressBar, Skeleton, EmptyState } from '../components/ui';
import type { Project } from '../types';

const WORK_TYPES = ['All', 'Roads', 'Infrastructure', 'Water Supply', 'Healthcare', 'Education', 'Energy', 'Sanitation'];
const RISK_LEVELS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATES = ['All States', 'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Arunachal Pradesh', 'Assam', 'Goa', 'Delhi'];

export default function ProjectExplorer() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All States');
  const [districtSearch, setDistrictSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (riskFilter !== 'All') params.risk_level = riskFilter;
      if (typeFilter !== 'All') params.work_type = typeFilter;
      if (stateFilter !== 'All States') params.state = stateFilter;
      if (districtSearch) params.district = districtSearch;
      const res = await projectsApi.list(params);
      const data = res.data;
      setProjects(data.items || data || []);
      setTotal(data.total || (data.items || data).length);
    } catch {
      // Mock fallback
      setProjects(MOCK_PROJECTS);
      setTotal(MOCK_PROJECTS.length);
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter, typeFilter, stateFilter, districtSearch, page]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 300);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Intelligence Explorer</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} projects · Search, filter, and analyze</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search project ID, name, agency..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}
            className="text-sm border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          {/* District search */}
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="District..."
              value={districtSearch}
              onChange={(e) => { setDistrictSearch(e.target.value); setPage(0); }}
              className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>
          {/* Risk filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(0); }}
              className="text-sm border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="text-sm border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {WORK_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {/* Clear all */}
          {(stateFilter !== 'All States' || districtSearch || riskFilter !== 'All' || typeFilter !== 'All' || search) && (
            <button
              onClick={() => { setSearch(''); setStateFilter('All States'); setDistrictSearch(''); setRiskFilter('All'); setTypeFilter('All'); setPage(0); }}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-2"
            >
              Clear All ✕
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project Details</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Location & Agency</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Financials & Compliance</th>
                <th className="px-4 py-3 text-left font-medium">Progress</th>
                <th className="px-4 py-3 text-left font-medium">Risk</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-10" /></td></tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No projects match your filters" icon={Search} />
                  </td>
                </tr>
              ) : projects.map((p) => (
                <tr
                  key={p.project_id}
                  className="table-row-hover cursor-pointer"
                  onClick={() => navigate(`/projects/${p.project_id}`)}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-blue-900 text-xs">{p.project_id}</div>
                    <div className="text-slate-700 text-xs font-medium mt-0.5 truncate max-w-[220px]" title={p.work_name}>
                      {p.work_name}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{p.work_type}</div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="text-xs text-slate-700">{p.district}, {p.state}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" /> {p.implementing_agency}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="text-xs text-slate-700">Exp: ₹{p.expenditure_amount_lakh} | San: ₹{p.sanction_amount_lakh}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${p.has_photographs ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} title="Asset Photographs Upload Status">
                        <Camera className="w-3 h-3" /> {p.has_photographs ? 'Photos' : 'No Photos'}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${p.has_sanction_order ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} title="Sanction Order Document Status">
                        <FileText className="w-3 h-3" /> {p.has_sanction_order ? 'Sanctioned' : 'Missing'}
                      </div>
                    </div>
                    {p.delay_days > 0 && (
                      <div className="text-xs text-red-500 flex items-center gap-0.5 mt-1.5">
                        <Calendar className="w-2.5 h-2.5" /> {p.delay_days}d delay
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <DualProgressBar physical={p.physical_progress_pct} financial={p.financial_progress_pct} />
                  </td>
                  <td className="px-4 py-3.5">
                    <RiskBadge level={(p as any).risk_level || 'LOW'} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.project_id}`); }}
                      className="text-xs px-2.5 py-1 border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      Investigate →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page + 1} of {totalPages} &middot; {total} total</span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pageNum = startPage + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded border text-xs font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Mock data for offline dev
const MOCK_PROJECTS: Project[] = [
  { id: 1, project_id: 'MPL-2026-00128', work_name: 'Construction of Community Hall in Village Panchayat', work_type: 'Infrastructure', state: 'Maharashtra', district: 'Pune', implementing_agency: 'PWD', sanction_amount_lakh: 25, expenditure_amount_lakh: 62, physical_progress_pct: 42, financial_progress_pct: 91, delay_days: 230, is_completed: false, has_photographs: false, has_sanction_order: true, risk_level: 'CRITICAL' as any },
  { id: 2, project_id: 'MPL-2026-00112', work_name: 'Installation of Solar Street Lights Phase 2', work_type: 'Energy', state: 'Maharashtra', district: 'Pune', implementing_agency: 'Zilla Parishad', sanction_amount_lakh: 15, expenditure_amount_lakh: 14.5, physical_progress_pct: 95, financial_progress_pct: 96, delay_days: 0, is_completed: false, has_photographs: true, has_sanction_order: true, risk_level: 'LOW' as any },
  { id: 3, project_id: 'MPL-2026-00345', work_name: 'Upgradation of Primary Health Centre', work_type: 'Healthcare', state: 'Uttar Pradesh', district: 'Varanasi', implementing_agency: 'Health Dept', sanction_amount_lakh: 45, expenditure_amount_lakh: 40, physical_progress_pct: 60, financial_progress_pct: 88, delay_days: 145, is_completed: false, has_photographs: false, has_sanction_order: false, risk_level: 'HIGH' as any },
  { id: 4, project_id: 'MPL-2026-00401', work_name: 'Construction of CC Road from Main Road to Temple', work_type: 'Roads', state: 'Rajasthan', district: 'Jaipur', implementing_agency: 'Gram Panchayat', sanction_amount_lakh: 12, expenditure_amount_lakh: 12, physical_progress_pct: 20, financial_progress_pct: 100, delay_days: 45, is_completed: false, has_photographs: true, has_sanction_order: true, risk_level: 'CRITICAL' as any },
];
