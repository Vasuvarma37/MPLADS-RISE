/**
 * MPLADS RISE — Risk Investigation Page
 * SHAP explanation, ML scores, rule flags, alerts for a project
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, ShieldAlert, AlertTriangle, Bot, RefreshCw,
  Calendar, Building2, IndianRupee, Clock, CheckCircle2, XCircle,
  Image as ImageIcon, FileText, Maximize2
} from 'lucide-react';
import { projectsApi, aiApi } from '../api/client';
import { Card, RiskBadge, DualProgressBar, Skeleton, Button, Toast } from '../components/ui';
import { useDropzone } from 'react-dropzone';
import type { ProjectDetail } from '../types';

// Declared before component to avoid used-before-declaration error
const MOCK_SHAP = [
  { feature: 'Cost Deviation (+148%)', value: 35, direction: 'negative' as const },
  { feature: 'Progress Gap (49%)', value: 28, direction: 'negative' as const },
  { feature: 'Delay Probability (94%)', value: 18, direction: 'negative' as const },
  { feature: 'Duplicate Signal (72%)', value: 12, direction: 'negative' as const },
  { feature: 'Agency Past Record', value: -3, direction: 'positive' as const },
];

export default function RiskInvestigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [askingAi, setAskingAi] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadDetail(id);
  }, [id]);

  const loadDetail = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await projectsApi.detail(projectId);
      setDetail(res.data);
      // Fetch actual uploaded documents
      const docsRes = await projectsApi.getDocuments(projectId);
      setDocuments(docsRes.data);
    } catch {
      // Use mock
      setDetail(MOCK_DETAIL);
    } finally {
      setLoading(false);
    }
  };

  const triggerAssessment = async () => {
    if (!id) return;
    setAssessing(true);
    try {
      await projectsApi.assessRisk(id);
      await loadDetail(id);
      setToast({ message: 'Risk re-assessed successfully', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Assessment failed — check backend connection', type: 'error' });
    } finally {
      setAssessing(false);
    }
  };

  const askAboutProject = async () => {
    if (!detail) return;
    setAskingAi(true);
    try {
      const res = await aiApi.ask(
        `Explain the risk factors for project ${detail.project.project_id} and recommend audit actions.`,
        {
          project_id: detail.project.project_id,
          risk_score: detail.risk?.risk_score,
          risk_level: detail.risk?.risk_level,
          primary_risk: detail.risk?.primary_risk,
        }
      );
      setAiAnswer(res.data.answer);
    } catch {
      setAiAnswer('AI analysis unavailable. Please check your Gemini API key configuration.');
    } finally {
      setAskingAi(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!id || acceptedFiles.length === 0) return;
    setUploading(true);
    try {
      const file = acceptedFiles[0];
      await projectsApi.uploadDocument(id, file);
      setToast({ message: 'Document uploaded successfully', type: 'success' });
      setShowUploadModal(false);
      // Refresh documents
      const docsRes = await projectsApi.getDocuments(id);
      setDocuments(docsRes.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!detail) return <div className="text-slate-500">Project not found.</div>;

  const { project, risk, alerts } = detail;
  let shapData = risk?.shap_explanation;
  if (typeof shapData === 'string') {
    try { shapData = JSON.parse(shapData); } catch { shapData = []; }
  }
  if (!Array.isArray(shapData) || shapData.length === 0) {
    shapData = [];
  }

  let ruleFlags = risk?.rule_flags || [];
  if (typeof ruleFlags === 'string') {
    try { ruleFlags = JSON.parse(ruleFlags); } catch { ruleFlags = []; }
  }
  if (!Array.isArray(ruleFlags)) ruleFlags = [];

  const wType = (project.work_name || '') + ' ' + (project.work_type || '');

  return (
    <div className="space-y-5 fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900">{project.project_id}</h1>
            {risk && <RiskBadge level={risk.risk_level as any} score={risk.risk_score} />}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{project.work_name}</p>
        </div>
        <Button
          icon={RefreshCw}
          variant="secondary"
          size="sm"
          onClick={triggerAssessment}
          disabled={assessing}
        >
          {assessing ? 'Assessing…' : 'Re-Assess Risk'}
        </Button>
      </div>

      {/* Project metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Building2, label: 'Agency', value: project.implementing_agency || '—' },
          { icon: Calendar, label: 'Sanctioned', value: project.sanction_date || '—' },
          { icon: IndianRupee, label: 'Sanctioned', value: `₹${project.sanction_amount_lakh}L` },
          { icon: Clock, label: 'Delay', value: project.delay_days > 0 ? `${project.delay_days} days` : 'On Track' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-3 flex items-center gap-2.5">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{label}</div>
              <div className="text-sm font-semibold text-slate-800 truncate">{value}</div>
            </div>
          </Card>
        ))}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Risk Explanation (SHAP)
          </h3>
          {shapData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={shapData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="feature" width={160}
                    tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                  />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} pts`, 'Impact']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {shapData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.direction === 'negative' ? '#ef4444' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Risk-increasing</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Risk-mitigating</span>
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No AI explanation available for this project.
            </div>
          )}
        </Card>

        {/* ML Scores */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">ML Model Scores</h3>
          <div className="space-y-3">
            {[
              { label: 'Cost Deviation', value: risk?.cost_deviation_score ?? 48, max: 100, unit: '%', warn: 20 },
              { label: 'Delay Probability', value: Math.round((risk?.delay_probability ?? 0.72) * 100), max: 100, unit: '%', warn: 50 },
              { label: 'Duplicate Similarity', value: Math.round((risk?.duplicate_similarity_score ?? 0.3) * 100), max: 100, unit: '%', warn: 80 },
            ].map(({ label, value, max, unit, warn }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{label}</span>
                  <span className={`font-semibold ${value > warn ? 'text-red-600' : 'text-green-600'}`}>
                    {value}{unit}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${value > warn ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Progress visual */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Physical vs Financial Progress</span>
            </div>
            <DualProgressBar physical={project.physical_progress_pct} financial={project.financial_progress_pct} />
          </div>
        </Card>
      </div>

      {/* Rule flags */}
      {(ruleFlags && ruleFlags.length > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Rule Engine Flags ({ruleFlags.length})
          </h3>
          <div className="space-y-2">
            {ruleFlags.map((flag: any, i: number) => (
              <div key={i} className={`p-3 rounded-lg border text-sm ${
                flag.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' :
                flag.severity === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-semibold text-xs mb-0.5">{flag.rule.replace(/_/g, ' ')}</div>
                <div className="text-xs opacity-80">{flag.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Active Alerts ({alerts.length})</h3>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700">{alert.alert_type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{alert.message}</div>
                </div>
                <RiskBadge level={alert.severity as any} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Analysis */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            AI Audit Advisor
          </h3>
          <Button icon={Bot} size="sm" onClick={askAboutProject} disabled={askingAi}>
            {askingAi ? 'Analyzing…' : 'Get AI Analysis'}
          </Button>
        </div>
        {aiAnswer ? (
          <div className="chat-bubble-ai p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {aiAnswer}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Click "Get AI Analysis" for Gemini-powered audit recommendations
          </div>
        )}
      </Card>

      {/* Asset Photographs & Documents */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Project Documents, Payments & Work Photos
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowUploadModal(true)}
            >
              Upload Project Proof (Photos/Docs)
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={FileText}
              onClick={() => window.open('/media_1787854999736.pdf', '_blank')}
            >
              View Sanction Order
            </Button>
          </div>
        </div>

        {/* Upload Modal (Inline dropzone) */}
        {showUploadModal && (
          <div className="mb-6">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}>
              <input {...getInputProps()} />
              {uploading ? (
                <div className="text-sm font-medium text-slate-500">Uploading...</div>
              ) : (
                <div className="text-sm font-medium text-slate-600">
                  {isDragActive ? 'Drop the file here...' : 'Drag & drop Payment Receipts, Work Photos, or Sanction Proofs (Images/PDFs) here'}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            </div>
          </div>
        )}
        
        {documents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Real Documents */}
            {documents.map((doc, i) => (
              <div key={`doc-${i}`} className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => window.open(doc.file_url, '_blank')}>
                {doc.file_type === 'IMAGE' ? (
                  <img src={doc.file_url} alt={doc.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50">
                    <FileText className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-xs text-blue-700 font-medium px-2 text-center truncate w-full">{doc.file_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No photographs uploaded for this project yet.
          </div>
        )}
      </Card>

      {/* Project Gantt Timeline */}
      <GanttTimeline project={project} />

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/** ── Gantt Timeline Component ───────────────────────────────────────────── */
function GanttTimeline({ project }: { project: any }) {
  const sanctionDate = project.sanction_date ? new Date(project.sanction_date) : null;
  const expectedDate = project.expected_completion_date ? new Date(project.expected_completion_date) : null;
  const today = new Date();

  if (!sanctionDate || !expectedDate) return null;

  const totalDuration = expectedDate.getTime() - sanctionDate.getTime();
  const elapsed = today.getTime() - sanctionDate.getTime();
  const isOverdue = today > expectedDate;
  const timelineEnd = isOverdue ? today : expectedDate;
  const spanMs = timelineEnd.getTime() - sanctionDate.getTime();

  const pct = (date: Date) => Math.min(100, Math.max(0, ((date.getTime() - sanctionDate.getTime()) / spanMs) * 100));

  const todayPct = pct(today);
  const expectedPct = isOverdue ? (totalDuration / spanMs) * 100 : 100;
  const progressBarPct = Math.min(todayPct, 100);

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const milestones = [
    { label: 'Sanction', date: sanctionDate, pct: 0, color: 'bg-blue-500' },
    ...(isOverdue ? [{ label: 'Was Due', date: expectedDate, pct: expectedPct, color: 'bg-red-400' }] : []),
    { label: isOverdue ? 'Today (Overdue)' : 'Today', date: today, pct: todayPct, color: isOverdue ? 'bg-red-600' : 'bg-blue-600' },
    ...(!isOverdue ? [{ label: 'Expected', date: expectedDate, pct: 100, color: 'bg-green-500' }] : []),
  ];

  const delayDays = project.delay_days || 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Project Timeline</h3>
        {isOverdue && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-semibold">
            ⏱ {delayDays} days overdue
          </span>
        )}
        {!isOverdue && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
            ✓ On Track
          </span>
        )}
      </div>

      {/* Gantt bar */}
      <div className="relative mb-8">
        <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden relative">
          {/* Completed portion */}
          <div
            className={`h-full rounded-l-full transition-all duration-700 ${isOverdue ? 'bg-red-200' : 'bg-blue-200'}`}
            style={{ width: `${progressBarPct}%` }}
          />
          {/* Physical progress overlay */}
          <div
            className={`absolute top-1 h-6 rounded-full transition-all duration-700 ${isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ left: '0', width: `${(project.physical_progress_pct / 100) * progressBarPct}%` }}
            title={`Physical progress: ${project.physical_progress_pct}%`}
          />
          {/* Financial progress overlay (if ahead = anomaly) */}
          {project.financial_progress_pct > project.physical_progress_pct && (
            <div
              className="absolute top-3 h-2 bg-red-400 opacity-70 transition-all duration-700"
              style={{
                left: `${(project.physical_progress_pct / 100) * progressBarPct}%`,
                width: `${((project.financial_progress_pct - project.physical_progress_pct) / 100) * progressBarPct}%`
              }}
              title={`Financial ahead of physical by ${project.financial_progress_pct - project.physical_progress_pct}%`}
            />
          )}
        </div>

        {/* Milestone markers */}
        {milestones.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
          >
            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md -mt-1 ${m.color}`} />
            <div className={`text-xs mt-9 whitespace-nowrap font-medium ${i === 0 ? 'text-left' : i === milestones.length - 1 ? 'text-right' : 'text-center'} ${m.color.includes('red') ? 'text-red-600' : 'text-slate-600'}`}>
              {m.label}
              <div className="text-slate-400 font-normal text-xs">{fmt(m.date)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Physical Progress</div>
          <div className="text-lg font-bold text-blue-700">{project.physical_progress_pct}%</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Financial Progress</div>
          <div className={`text-lg font-bold ${project.financial_progress_pct > project.physical_progress_pct ? 'text-red-600' : 'text-green-600'}`}>
            {project.financial_progress_pct}%
          </div>
        </div>
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Elapsed Time</div>
          <div className="text-lg font-bold text-slate-700">{Math.round(elapsed / (1000 * 60 * 60 * 24))}d</div>
        </div>
        <div className={`text-center p-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <div className={`text-sm font-bold flex items-center justify-center gap-1 ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
            {isOverdue ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {isOverdue ? `${delayDays}d Late` : 'On Track'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /> Physical Progress</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Financial Overpay Gap</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Overdue Markers</span>
      </div>
    </Card>
  );
}

// Mock data
const MOCK_DETAIL: ProjectDetail = {
  project: {
    id: 1, project_id: 'MPL-2026-00128', work_name: 'Construction of Community Hall in Village Panchayat',
    work_type: 'Infrastructure', state: 'Maharashtra', district: 'Pune', implementing_agency: 'PWD',
    sanction_date: '2024-05-12', expected_completion_date: '2025-05-12',
    sanction_amount_lakh: 25, expenditure_amount_lakh: 62,
    physical_progress_pct: 42, financial_progress_pct: 91, delay_days: 230, is_completed: false,
  },
  risk: {
    project_id: 'MPL-2026-00128', risk_score: 87, risk_level: 'CRITICAL',
    primary_risk: 'Payment Anomaly', cost_deviation_score: 148,
    delay_probability: 0.94, duplicate_similarity_score: 0.72,
    rule_flags: [
      { rule: 'PAYMENT_ANOMALY', severity: 'CRITICAL', detail: 'Financial (91%) exceeds physical (42%) by 49%' },
      { rule: 'COST_OVERRUN', severity: 'HIGH', detail: 'Expenditure exceeds sanction by 148%' },
      { rule: 'SEVERE_DELAY', severity: 'HIGH', detail: 'Delayed by 230 days (threshold: 180)' },
    ],
    shap_explanation: MOCK_SHAP,
  },
  alerts: [
    { id: 1, project_id: 'MPL-2026-00128', alert_type: 'PAYMENT_ANOMALY', severity: 'CRITICAL', message: 'Financial 91% vs Physical 42% — 49% gap', status: 'NEW', created_at: '2026-08-27' },
  ],
};


