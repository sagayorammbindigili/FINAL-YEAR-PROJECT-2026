export type Language = 'auto' | 'sw' | 'en';
export type Page = 'dashboard' | 'analyze' | 'tips' | 'about' | 'settings';
export type Theme = 'light' | 'dark';

export interface RiskFactor {
  id: string;
  label_en: string;
  label_sw: string;
  risk: 'High Risk' | 'Medium Risk' | 'Low Risk';
  icon: 'money' | 'building' | 'phone' | 'payment' | 'info';
}

export interface HighlightSpan {
  text: string;
  highlighted: boolean;
  color?: string;
}

export interface RuleExplanationItem {
  type: string;
  risk: string;
  evidence: string[];
  en: string;
  sw: string;
}

export interface PredictionResult {
  fake_probability: number;
  verdict: 'fake' | 'legitimate' | 'uncertain' | 'not_job';
  risk_factors: RiskFactor[];
  highlighted_content: HighlightSpan[];
  recommendation_en: string;
  recommendation_sw: string;
  raw_text: string;
  rule_explanation?: RuleExplanationItem[];
}

export interface AppSettings {
  apiEndpoint: string;
  apiKey: string;
  outputLanguage: Language;
  theme: Theme;
}
