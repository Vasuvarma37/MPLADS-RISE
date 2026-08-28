/**
 * MPLADS RISE — TypeScript Types
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'UNDER_REVIEW' | 'ASSIGNED' | 'RESOLVED' | 'DISMISSED';

export interface Project {
  id: number;
  project_id: string;
  work_name: string;
  work_type: string;
  state: string;
  district: string;
  constituency?: string;
  mp_id?: string;
  implementing_agency?: string;
  sanction_date?: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  sanction_amount_lakh: number;
  expenditure_amount_lakh: number;
  physical_progress_pct: number;
  financial_progress_pct: number;
  delay_days: number;
  is_completed: boolean;
  has_photographs?: boolean;
  has_sanction_order?: boolean;
}

export interface EvidenceSignal {
  type: string;
  triggered: boolean;
  label: string;
  detail: string;
  // cost anomaly
  actual?: string;
  expected?: string;
  deviation?: string;
  // progress anomaly
  financial_progress?: string;
  physical_progress?: string;
  gap?: string;
  // delay anomaly
  delay_days?: number;
  delay_probability_pct?: number;
  // duplicate signal
  similarity_pct?: number;
  // ml anomaly
  anomaly_score?: number;
}

export interface EvidenceReport {
  risk_score: number;
  risk_level: string;
  detected_signals: EvidenceSignal[];
  why_flagged: string[];
  recommended_actions: string[];
  signal_count: number;
  summary: string;
}

export interface RiskAssessment {
  id?: number;
  project_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  primary_risk: string;
  cost_deviation_score?: number;
  delay_probability?: number;
  duplicate_similarity_score?: number;
  anomaly_score?: number;
  lof_score?: number;
  rule_flags?: RuleFlag[];
  shap_explanation?: ShapEntry[];
  evidence_report?: EvidenceReport | string;
  assessed_at?: string;
}

export interface RuleFlag {
  rule: string;
  severity: RiskLevel;
  detail: string;
}

export interface ShapEntry {
  feature: string;
  value: number;
  direction: 'positive' | 'negative';
}


export interface Alert {
  id: number;
  project_id: string;
  alert_type: string;
  severity: RiskLevel;
  message: string;
  detail?: any;
  status: AlertStatus;
  assigned_to?: string;
  created_at: string;
}

export interface ProjectDetail {
  project: Project;
  risk?: RiskAssessment;
  alerts: Alert[];
}

export interface AnalyticsSummary {
  total_projects: number;
  completed_projects: number;
  total_sanctioned_lakh: number;
  total_expenditure_lakh: number;
  utilization_pct: number;
  risk_distribution: Record<RiskLevel, number>;
}

export interface StateAnalytics {
  state: string;
  project_count: number;
  total_sanctioned_lakh: number;
  total_expenditure_lakh: number;
  avg_delay_days: number;
}

export interface User {
  username: string;
  role: string;
}
