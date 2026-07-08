import type { PredictionResult, AppSettings, RiskFactor, HighlightSpan } from '../types';

function buildRiskFactors(
  explanationList: { word: string; weight: string }[],
  verdict: 'fake' | 'legitimate' | 'uncertain' | 'not_job'
): RiskFactor[] {
  if (verdict === 'not_job') {
    return [];
  }
  if (!explanationList || explanationList.length === 0) {
    return verdict === 'fake'
      ? [
          { id: 'rf-fake', label_en: 'Suspicious job ad indicators', label_sw: 'Dalili za tangazo la kazi la utapeli', risk: 'Medium Risk', icon: 'info' },
        ]
      : verdict === 'legitimate'
      ? [
          { id: 'rf-legit', label_en: 'No major risk indicators detected', label_sw: 'Hakuna dalili kubwa za hatari zilizotambuliwa', risk: 'Low Risk', icon: 'info' },
        ]
      : [];
  }

  const relevant = explanationList.filter(e => {
    const w = parseFloat(e.weight);
    return verdict === 'fake' ? w > 0 : w < 0;
  });

  const iconMap: [string, RiskFactor['icon']][] = [
    ['salary', 'money'], ['mshahara', 'money'], ['pay', 'money'],
    ['company', 'building'], ['kampuni', 'building'], ['employer', 'building'],
    ['phone', 'phone'], ['simu', 'phone'], ['call', 'phone'], ['whatsapp', 'phone'],
    ['fee', 'payment'], ['ada', 'payment'], ['deposit', 'payment'], ['malipo', 'payment'],
  ];

  function pickIcon(word: string): RiskFactor['icon'] {
    const lower = word.toLowerCase();
    for (const [key, icon] of iconMap) {
      if (lower.includes(key)) return icon;
    }
    return 'info';
  }

  function pickRisk(weight: number): RiskFactor['risk'] {
    const abs = Math.abs(weight);
    if (abs >= 0.2) return 'High Risk';
    if (abs >= 0.08) return 'Medium Risk';
    return 'Low Risk';
  }

  const mapped = relevant.slice(0, 6).map((e, i) => ({
    id: `rf-${i}`,
    label_en: e.word,
    label_sw: e.word,
    risk: pickRisk(parseFloat(e.weight)),
    icon: pickIcon(e.word),
  }));

  if (verdict === 'fake') {
    return mapped.length > 0
      ? mapped.map((item, i) => ({
          ...item,
          risk: i === 0 ? 'High Risk' : i === 1 ? 'Medium Risk' : 'Medium Risk',
        }))
      : [
          { id: 'rf-fake-default', label_en: 'Suspicious job ad indicators', label_sw: 'Dalili za tangazo la kazi la utapeli', risk: 'Medium Risk' as RiskFactor['risk'], icon: 'info' as RiskFactor['icon'] },
        ];
  }

  return mapped.length > 0
    ? mapped.map(item => ({ ...item, risk: 'Low Risk' as RiskFactor['risk'] }))
    : [
        { id: 'rf-legit-default', label_en: 'No major risk indicators detected', label_sw: 'Hakuna dalili kubwa za hatari zilizotambuliwa', risk: 'Low Risk' as RiskFactor['risk'], icon: 'info' as RiskFactor['icon'] },
      ];
}

function buildHighlights(
  rawText: string,
  explanationList: { word: string; weight: string }[],
  verdict: 'fake' | 'legitimate' | 'uncertain' | 'not_job'
): HighlightSpan[] {
  return [{ text: rawText || '', highlighted: false }];
}

function mapVerdict(predictedClass: string, confidence: number): 'fake' | 'legitimate' | 'uncertain' | 'not_job' {
  const lc = predictedClass.toLowerCase();
  if (lc.includes('fake') || lc.includes('feki')) return 'fake';
  if (lc.includes('real') || lc.includes('halisi') || lc.includes('legitimate')) return 'legitimate';
  if (lc.includes('not a job') || lc.includes('siyo') || lc.includes('job posting')) return 'not_job';
  if (confidence >= 0.65) return 'fake';
  if (confidence <= 0.40) return 'legitimate';
  return 'uncertain';
}

function buildRecommendation(verdict: 'fake' | 'legitimate' | 'uncertain' | 'not_job', confidence: number) {
  const pct = Math.round(confidence * 100);
  switch (verdict) {
    case 'fake':
      return {
        en: `This job ad is likely fraudulent (${pct}% confidence). Do NOT share personal info or pay any fees.`,
        sw: `Tangazo hili la kazi linaonekana kuwa la ulaghai (uhakika ${pct}%). USISHIRIKI taarifa binafsi wala kulipa ada.`,
      };
    case 'legitimate':
      return {
        en: `This job ad appears genuine (${pct}% confidence). Verify directly with the employer before sharing personal details.`,
        sw: `Tangazo hili la kazi linaonekana kuwa halisi (uhakika ${pct}%). Thibitisha moja kwa moja na mwajiri kabla ya kutoa taarifa zako.`,
      };
    case 'not_job':
      return {
        en: `Please provide a job advertisement or job-related text so the system can analyze it properly.`,
        sw: `Tafadhali weka tangazo la kazi au maandishi yanayohusiana na kazi ili mfumo uoneze kwa usahihi.`,
      };
    default:
      return {
        en: `Please provide a job advertisement or job-related text so the system can analyze it properly.`,
        sw: `Tafadhali weka tangazo la kazi au maandishi yanayohusiana na kazi ili mfumo uoneze kwa usahihi.`,
      };
  }
}

export async function analyzJobAd(
  text: string,
  settings: AppSettings,
  salaryStr?: string,
  imageFile?: File | null,
  optionalInfo?: string
): Promise<PredictionResult> {
  const endpoint = settings.apiEndpoint || 'http://localhost:5000/predict';
  const lang = settings.outputLanguage === 'auto' ? 'en' : settings.outputLanguage;

  const authHeaders: Record<string, string> = {};
  if (settings.apiKey) authHeaders['Authorization'] = `Bearer ${settings.apiKey}`;

  let response: Response;

  if (imageFile) {
    // Image mode: send as multipart/form-data
    const form = new FormData();
    form.append('image', imageFile);
    form.append('salary_str', salaryStr ?? '');
    form.append('output_lang', lang);
    form.append('optional_info', optionalInfo ?? '');
    response = await fetch(endpoint, { method: 'POST', headers: authHeaders, body: form });
  } else {
    // Text mode: send as JSON
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_text: text, salary_str: salaryStr ?? '', output_lang: lang }),
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body || 'No response from server'}`);
  }

  const data = await response.json();

  if (data.success === false) {
    throw new Error(data.error ?? data.message ?? 'Prediction failed');
  }

  const confidence = parseFloat(String(data.confidence ?? '0'));
  const verdict = mapVerdict(data.predicted_class ?? '', confidence);
  const fakeProbability = verdict === 'fake' ? confidence : Math.max(0, 1 - confidence);
  const explanationList: { word: string; weight: string }[] = data.explanation ?? [];
  const rawText: string = data.raw_text ?? text;
  const rec = buildRecommendation(verdict, confidence);
  const ruleExplanation = data.rule_explanation ?? [];

  return {
    fake_probability: fakeProbability,
    verdict,
    risk_factors: buildRiskFactors(explanationList, verdict),
    highlighted_content: buildHighlights(rawText, explanationList, verdict),
    recommendation_en: rec.en,
    recommendation_sw: rec.sw,
    raw_text: rawText,
    // 👇 ADD HII
    rule_explanation: ruleExplanation,

  };
}
