/**
 * MPLADS RISE — Risk Investigation Page
 * SIH26102: The final unified output shown to authorities for each project.
 * Shows: Risk Score → Detected Signals → Why Flagged → Recommended Actions
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, CheckCircle2, XCircle, Clock, Building2,
  IndianRupee, Calendar, TrendingUp, Copy, CreditCard,
  MapPin, FileWarning, Microscope, ChevronRight, Info
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { Card, RiskBadge, DualProgressBar, Skeleton, Button, Toast } from '../components/ui';
import type { ProjectDetail, EvidenceReport } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SIGNAL_ICONS: Record<string, any> = {
  cost_anomaly: IndianRupee,
  progress_anomaly: TrendingUp,
  delay_anomaly: Clock,
  payment_anomaly: CreditCard,
  duplicate_signal: Copy,
  ml_anomaly: Microscope,
};

const SIGNAL_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  cost_anomaly:     { bg: 'bg-red-950/40',    border: 'border-red-800/50',    icon: 'text-red-400',    badge: 'bg-red-900/50 text-red-300' },
  progress_anomaly: { bg: 'bg-orange-950/40', border: 'border-orange-800/50', icon: 'text-orange-400', badge: 'bg-orange-900/50 text-orange-300' },
  delay_anomaly:    { bg: 'bg-amber-950/40',  border: 'border-amber-800/50',  icon: 'text-amber-400',  badge: 'bg-amber-900/50 text-amber-300' },
  payment_anomaly:  { bg: 'bg-red-950/40',    border: 'border-red-800/50',    icon: 'text-red-400',    badge: 'bg-red-900/50 text-red-300' },
  duplicate_signal: { bg: 'bg-purple-950/40', border: 'border-purple-800/50', icon: 'text-purple-400', badge: 'bg-purple-900/50 text-purple-300' },
  ml_anomaly:       { bg: 'bg-blue-950/40',   border: 'border-blue-800/50',   icon: 'text-blue-400',   badge: 'bg-blue-900/50 text-blue-300' },
};

const LEVEL_CONFIG = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-950/60',    border: 'border-red-700',    ring: 'ring-red-500',  icon: ShieldX },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-950/60', border: 'border-orange-700', ring: 'ring-orange-500', icon: ShieldAlert },
  MEDIUM:   { color: 'text-amber-400',  bg: 'bg-amber-950/60',  border: 'border-amber-700',  ring: 'ring-amber-500',  icon: AlertTriangle },
  LOW:      { color: 'text-green-400',  bg: 'bg-green-950/60',  border: 'border-green-700',  ring: 'ring-green-500',  icon: ShieldCheck },
};

function getRiskCircleColor(level: string) {
  switch (level) {
    case 'CRITICAL': return { stroke: '#ef4444', bg: '#1a0505', text: 'text-red-400' };
    case 'HIGH':     return { stroke: '#f97316', bg: '#1a0800', text: 'text-orange-400' };
    case 'MEDIUM':   return { stroke: '#f59e0b', bg: '#1a1100', text: 'text-amber-400' };
    default:         return { stroke: '#22c55e', bg: '#011a0a', text: 'text-green-400' };
  }
}

// ── Signal Detail Card ────────────────────────────────────────────────────────
function SignalCard({ signal }: { signal: any }) {
  const Icon = SIGNAL_ICONS[signal.type] || AlertTriangle;
  const colors = SIGNAL_COLORS[signal.type] || SIGNAL_COLORS.ml_anomaly;

  const renderValues = () => {
    switch (signal.type) {
      case 'cost_anomaly':
        return (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Actual Cost</div>
              <div className="text-sm font-bold text-slate-200">{signal.actual}</div>
            </div>
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Expected Cost</div>
              <div className="text-sm font-bold text-slate-200">{signal.expected}</div>
            </div>
            <div className="text-center p-2 bg-red-900/30 rounded-lg border border-red-800/40">
              <div className="text-xs text-red-400 mb-0.5">Deviation</div>
              <div className="text-sm font-bold text-red-300">{signal.deviation}</div>
            </div>
          </div>
        );
      case 'progress_anomaly':
        return (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Financial</div>
              <div className="text-sm font-bold text-orange-300">{signal.financial_progress}</div>
            </div>
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Physical</div>
              <div className="text-sm font-bold text-slate-200">{signal.physical_progress}</div>
            </div>
            <div className="text-center p-2 bg-red-900/30 rounded-lg border border-red-800/40">
              <div className="text-xs text-red-400 mb-0.5">Gap</div>
              <div className="text-sm font-bold text-red-300">{signal.gap}</div>
            </div>
          </div>
        );
      case 'delay_anomaly':
        return (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Overdue By</div>
              <div className="text-sm font-bold text-amber-300">{signal.delay_days} days</div>
            </div>
            <div className="text-center p-2 bg-slate-900/60 rounded-lg">
              <div className="text-xs text-slate-500 mb-0.5">Delay Probability</div>
              <div className="text-sm font-bold text-amber-300">{signal.delay_probability_pct}%</div>
            </div>
          </div>
        );
      case 'duplicate_signal':
        return (
          <div className="mt-2 p-2 bg-slate-900/60 rounded-lg text-center">
            <div className="text-xs text-slate-500 mb-0.5">Similarity to Nearby Work</div>
            <div className="text-lg font-bold text-purple-300">{signal.similarity_pct}%</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border} transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-slate-900/60 flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-200">{signal.label}</span>
            {signal.triggered && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                Triggered
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{signal.detail}</p>
          {renderValues()}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RiskInvestigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetail(id);
  }, [id]);

  const loadDetail = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await projectsApi.detail(projectId);
      setDetail(res.data);
    } catch {
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
    } catch {
      setToast({ message: 'Assessment failed — check backend connection', type: 'error' });
    } finally {
      setAssessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!detail) return (
    <div className="text-slate-500 text-center py-20">Project not found.</div>
  );

  const { project, risk } = detail;

  // Get evidence report — this is the unified combined final output
  let evidenceReport: EvidenceReport | undefined;
  const rawReport = risk?.evidence_report;
  if (typeof rawReport === 'string') {
    try { evidenceReport = JSON.parse(rawReport) as EvidenceReport; } catch { evidenceReport = undefined; }
  } else if (rawReport && typeof rawReport === 'object') {
    evidenceReport = rawReport as EvidenceReport;
  }

  // Fallback: build a basic evidence structure from raw risk data if backend hasn't returned one yet
  if (!evidenceReport && risk) {
    const phy = project.physical_progress_pct;
    const fin = project.financial_progress_pct;
    const gap = fin - phy;
    const sanction = project.sanction_amount_lakh;
    const exp = project.expenditure_amount_lakh;
    const costOverrunPct = Math.round(((exp - sanction) / Math.max(sanction, 0.01)) * 100);
    const dupScore = risk.duplicate_similarity_score ?? 0;

    const signals: any[] = [];
    if (Math.abs(costOverrunPct) > 5) signals.push({ type: 'cost_anomaly', triggered: Math.abs(costOverrunPct) > 20, label: 'Cost Anomaly', actual: `₹${exp}L`, expected: `₹${sanction}L`, deviation: `${costOverrunPct > 0 ? '+' : ''}${costOverrunPct}%`, detail: `Expenditure deviation: ${costOverrunPct}%` });
    if (gap > 10) signals.push({ type: 'progress_anomaly', triggered: gap > 30, label: 'Progress Anomaly', financial_progress: `${fin}%`, physical_progress: `${phy}%`, gap: `${gap}%`, detail: 'Financial progress exceeds physical progress' });
    if (project.delay_days > 30) signals.push({ type: 'delay_anomaly', triggered: project.delay_days > 180, label: 'Delay Anomaly', delay_days: project.delay_days, delay_probability_pct: Math.round((risk.delay_probability ?? 0) * 100), detail: `Project overdue by ${project.delay_days} days` });
    if (dupScore > 0.5) signals.push({ type: 'duplicate_signal', triggered: dupScore > 0.75, label: 'Duplicate-Work Signal', similarity_pct: Math.round(dupScore * 100), detail: `Similar nearby work: ${Math.round(dupScore * 100)}% similarity` });

    const why: string[] = [];
    if (Math.abs(costOverrunPct) > 20) why.push('Cost significantly exceeds peer projects');
    if (gap > 30) why.push('Financial progress substantially exceeds physical progress');
    if (project.delay_days > 180) why.push('Completion deadline exceeded');
    if (dupScore > 0.75) why.push('High similarity to nearby works detected');

    evidenceReport = {
      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
      detected_signals: signals,
      why_flagged: why.length > 0 ? why : ['Multiple risk indicators elevated'],
      recommended_actions: [
        ...(Math.abs(costOverrunPct) > 20 ? ['Review expenditure and payment records'] : []),
        ...(gap > 30 ? ['Verify physical progress on site'] : []),
        ...(project.delay_days > 180 ? ['Verify completion documents'] : []),
        'Consider field inspection if risk is CRITICAL',
      ],
      signal_count: signals.filter((s: any) => s.triggered).length,
      summary: `This project has been flagged as ${risk.risk_level} risk (score: ${risk.risk_score}/100).`,
    };
  }

  const riskLevel = ((evidenceReport?.risk_level) || risk?.risk_level || 'LOW') as keyof typeof LEVEL_CONFIG;
  const riskScore = evidenceReport?.risk_score ?? risk?.risk_score ?? 0;
  const levelCfg = LEVEL_CONFIG[riskLevel] || LEVEL_CONFIG.LOW;
  const LevelIcon = levelCfg.icon;
  const circleColors = getRiskCircleColor(riskLevel);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">

      {/* ── Back + Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-slate-100">{project.project_id}</h1>
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
          {assessing ? 'Analysing…' : 'Re-Assess'}
        </Button>
      </div>

      {/* ── Project Metadata ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: MapPin, label: 'Location', value: `${project.district}, ${project.state}` },
          { icon: Building2, label: 'Agency', value: project.implementing_agency || '—' },
          { icon: IndianRupee, label: 'Sanctioned', value: `₹${project.sanction_amount_lakh}L` },
          { icon: Clock, label: 'Delay', value: project.delay_days > 0 ? `${project.delay_days} days` : 'On Track' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-3 flex items-center gap-2.5 bg-slate-900 border-slate-800">
            <div className="bg-slate-800 p-2 rounded-lg flex-shrink-0">
              <Icon className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-sm font-semibold text-slate-200 truncate">{value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── UNIFIED COMBINED FINAL OUTPUT ── */}
      {evidenceReport ? (
        <>
          {/* Risk Score Hero + Signal Summary */}
          <div className={`rounded-2xl border p-6 ${levelCfg.bg} ${levelCfg.border}`}>
            <div className="flex flex-col md:flex-row items-center gap-6">

              {/* Score Circle */}
              <div className="flex-shrink-0 relative">
                <svg width="128" height="128" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
                  <circle
                    cx="64" cy="64" r="54"
                    fill="none"
                    stroke={circleColors.stroke}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 64 64)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black ${circleColors.text}`}>{riskScore}</span>
                  <span className="text-xs text-slate-500 font-medium">/ 100</span>
                </div>
              </div>

              {/* Level + Summary */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <LevelIcon className={`w-5 h-5 ${levelCfg.color}`} />
                  <span className={`text-xl font-black ${levelCfg.color}`}>{riskLevel}</span>
                  <span className="text-slate-500 text-sm">RISK</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{evidenceReport.summary}</p>
                <div className="flex items-center gap-4 mt-3 justify-center md:justify-start">
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{evidenceReport.detected_signals?.length || 0}</span> signals detected
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className={`font-semibold ${levelCfg.color}`}>{evidenceReport.signal_count || 0}</span> triggered
                  </div>
                  <div className="text-xs text-slate-400">
                    Primary: <span className="text-slate-300 font-medium">{risk?.primary_risk || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Progress visual */}
              <div className="flex-shrink-0 w-full md:w-48">
                <div className="text-xs text-slate-500 mb-2 text-center">Physical vs Financial</div>
                <DualProgressBar physical={project.physical_progress_pct} financial={project.financial_progress_pct} />
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>Phys: {project.physical_progress_pct}%</span>
                  <span>Fin: {project.financial_progress_pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Detected Signals ── */}
          <Card className="p-5 bg-slate-900 border-slate-800">
            <h2 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-orange-400" />
              Detected Signals
              <span className="ml-auto text-xs text-slate-500 font-normal">
                {evidenceReport.detected_signals?.length} anomaly type(s) analysed
              </span>
            </h2>
            {evidenceReport.detected_signals?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evidenceReport.detected_signals.map((signal: any, i: number) => (
                  <SignalCard key={i} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                No anomaly signals detected for this project.
              </div>
            )}
          </Card>

          {/* ── Why Flagged + Recommended Review (side by side) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Why Flagged */}
            <Card className="p-5 bg-slate-900 border-slate-800">
              <h2 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Why Flagged?
              </h2>
              <div className="space-y-2">
                {(evidenceReport.why_flagged || []).map((reason: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-800/60 rounded-lg">
                    <span className="text-blue-400 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-slate-300 leading-snug">{reason}</p>
                  </div>
                ))}
                {(evidenceReport.why_flagged || []).length === 0 && (
                  <p className="text-sm text-slate-500 italic">No specific flags identified.</p>
                )}
              </div>
            </Card>

            {/* Recommended Review */}
            <Card className="p-5 bg-slate-900 border-slate-800">
              <h2 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-400" />
                Recommended Review
              </h2>
              <div className="space-y-2">
                {(evidenceReport.recommended_actions || []).map((action: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-900/40">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-snug">{action}</p>
                  </div>
                ))}
                {(evidenceReport.recommended_actions || []).length === 0 && (
                  <p className="text-sm text-slate-500 italic">No specific actions required.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ── Timeline Summary ── */}
          <Card className="p-5 bg-slate-900 border-slate-800">
            <h2 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Project Timeline &amp; Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Physical Progress',
                  value: `${project.physical_progress_pct}%`,
                  color: 'text-blue-400',
                  bg: 'bg-blue-950/40',
                  icon: project.physical_progress_pct >= 80 ? CheckCircle2 : Clock,
                  iconColor: 'text-blue-400',
                },
                {
                  label: 'Financial Progress',
                  value: `${project.financial_progress_pct}%`,
                  color: project.financial_progress_pct > project.physical_progress_pct + 20 ? 'text-red-400' : 'text-emerald-400',
                  bg: project.financial_progress_pct > project.physical_progress_pct + 20 ? 'bg-red-950/40' : 'bg-emerald-950/40',
                  icon: project.financial_progress_pct > project.physical_progress_pct + 20 ? XCircle : CheckCircle2,
                  iconColor: project.financial_progress_pct > project.physical_progress_pct + 20 ? 'text-red-400' : 'text-emerald-400',
                },
                {
                  label: 'Delay Days',
                  value: project.delay_days > 0 ? `${project.delay_days}d` : 'On Track',
                  color: project.delay_days > 0 ? 'text-amber-400' : 'text-emerald-400',
                  bg: project.delay_days > 0 ? 'bg-amber-950/40' : 'bg-emerald-950/40',
                  icon: project.delay_days > 0 ? XCircle : CheckCircle2,
                  iconColor: project.delay_days > 0 ? 'text-amber-400' : 'text-emerald-400',
                },
                {
                  label: 'Completion',
                  value: project.is_completed ? 'Completed' : 'Ongoing',
                  color: project.is_completed ? 'text-emerald-400' : 'text-slate-400',
                  bg: project.is_completed ? 'bg-emerald-950/40' : 'bg-slate-800/40',
                  icon: project.is_completed ? CheckCircle2 : Clock,
                  iconColor: project.is_completed ? 'text-emerald-400' : 'text-slate-400',
                },
              ].map(({ label, value, color, bg, icon: Icon, iconColor }) => (
                <div key={label} className={`p-3 rounded-xl ${bg} border border-slate-800/60 text-center`}>
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${iconColor}`} />
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className={`text-base font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            {/* Sanction vs Expenditure bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Fund Utilisation</span>
                <span>₹{project.expenditure_amount_lakh}L / ₹{project.sanction_amount_lakh}L sanctioned</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    project.expenditure_amount_lakh > project.sanction_amount_lakh
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (project.expenditure_amount_lakh / Math.max(project.sanction_amount_lakh, 0.01)) * 100)}%` }}
                />
              </div>
              <div className="text-right text-xs text-slate-500 mt-1">
                {Math.round((project.expenditure_amount_lakh / Math.max(project.sanction_amount_lakh, 0.01)) * 100)}% utilised
                {project.expenditure_amount_lakh > project.sanction_amount_lakh && (
                  <span className="ml-2 text-red-400 font-semibold">⚠ Over Budget</span>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* No evidence report — prompt to run assessment */
        <Card className="p-10 text-center bg-slate-900 border-slate-800">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-semibold mb-2">No Risk Assessment Found</h3>
          <p className="text-sm text-slate-500 mb-4">
            Run the AI risk engine to generate the combined evidence report for this project.
          </p>
          <Button icon={RefreshCw} onClick={triggerAssessment} disabled={assessing}>
            {assessing ? 'Running Analysis…' : 'Run AI Risk Analysis'}
          </Button>
        </Card>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Mock data for fallback ────────────────────────────────────────────────────
const MOCK_DETAIL: ProjectDetail = {
  project: {
    id: 1,
    project_id: 'MPL-2026-00128',
    work_name: 'Construction of Community Hall in Village Panchayat',
    work_type: 'Infrastructure',
    state: 'Maharashtra',
    district: 'Pune',
    implementing_agency: 'PWD',
    sanction_date: '2024-05-12',
    expected_completion_date: '2025-05-12',
    sanction_amount_lakh: 25,
    expenditure_amount_lakh: 62,
    physical_progress_pct: 42,
    financial_progress_pct: 91,
    delay_days: 230,
    is_completed: false,
  },
  risk: {
    project_id: 'MPL-2026-00128',
    risk_score: 87,
    risk_level: 'CRITICAL',
    primary_risk: 'Payment Anomaly',
    cost_deviation_score: 148,
    delay_probability: 0.94,
    duplicate_similarity_score: 0.72,
    anomaly_score: -0.35,
    lof_score: 2.8,
    rule_flags: [
      { rule: 'PAYMENT_ANOMALY', severity: 'CRITICAL', detail: 'Financial (91%) exceeds physical (42%) by 49%' },
      { rule: 'COST_OVERRUN', severity: 'HIGH', detail: 'Expenditure exceeds sanction by 148%' },
      { rule: 'SEVERE_DELAY', severity: 'HIGH', detail: 'Delayed by 230 days (threshold: 180)' },
    ],
    shap_explanation: [],
    evidence_report: {
      risk_score: 87,
      risk_level: 'CRITICAL',
      summary: 'This project has been flagged as CRITICAL risk (score: 87/100). 5 anomaly signal(s) detected requiring authority review.',
      signal_count: 4,
      detected_signals: [
        { type: 'cost_anomaly', triggered: true, label: 'Cost Anomaly', actual: '₹62L', expected: '₹25L', deviation: '+148%', detail: 'Cost deviation score: 148' },
        { type: 'progress_anomaly', triggered: true, label: 'Progress Anomaly', financial_progress: '91%', physical_progress: '42%', gap: '49%', detail: 'Financial progress significantly exceeds physical progress' },
        { type: 'delay_anomaly', triggered: true, label: 'Delay Anomaly', delay_days: 230, delay_probability_pct: 94, detail: 'Project overdue by 230 days. Delay probability: 94%' },
        { type: 'payment_anomaly', triggered: true, label: 'Payment Anomaly', detail: 'Unusual payment concentration detected — funds released disproportionately to physical progress' },
        { type: 'duplicate_signal', triggered: false, label: 'Duplicate-Work Signal', similarity_pct: 72, detail: 'Similar nearby work detected: 72% similarity' },
      ],
      why_flagged: [
        'Cost significantly exceeds peer projects',
        'Financial progress substantially exceeds physical progress',
        'Completion deadline exceeded',
        'Payment pattern is unusual',
      ],
      recommended_actions: [
        'Review expenditure and payment records',
        'Verify physical progress on site',
        'Verify completion documents and extension approvals',
        'Audit payment vouchers and utilization certificates',
        'Consider field inspection if risk is CRITICAL',
      ],
    },
  },
  alerts: [
    { id: 1, project_id: 'MPL-2026-00128', alert_type: 'PAYMENT_ANOMALY', severity: 'CRITICAL', message: 'Financial 91% vs Physical 42% — 49% gap', status: 'NEW', created_at: '2026-08-27' },
  ],
};
