import {
  Download,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Building,
  Phone,
  CreditCard,
  Info
} from 'lucide-react';

import type { PredictionResult, RiskFactor } from '../types';
import { useApp } from '../context/AppContext';
import CircularGauge from './CircularGauge';

interface Props {
  result: PredictionResult;
  onExport: () => void;
}

const riskIconMap: Record<RiskFactor['icon'], any> = {
  money: DollarSign,
  building: Building,
  phone: Phone,
  payment: CreditCard,
  info: Info,
};

export default function AnalysisResult({ result, onExport }: Props) {
  const { t, activeLang } = useApp();
  const pct = Math.round(result.fake_probability * 100);

  const verdictText =
    result.verdict === 'fake'
      ? t('result_fake')
      : result.verdict === 'legitimate'
      ? t('result_legit')
      : result.verdict === 'not_job'
      ? t('result_not_job')
      : t('result_uncertain');

  const verdictDesc =
    result.verdict === 'fake'
      ? t('result_fake_desc')
      : result.verdict === 'legitimate'
      ? t('result_legit_desc')
      : result.verdict === 'not_job'
      ? (activeLang === 'sw' ? 'Maandishi haya hayahusiani na tangazo la kazi. Weka tangazo la kazi au maandishi yanayohusiana na kazi.' : 'This text does not appear to be a job advertisement. Please provide a job posting or job-related text.')
      : t('result_uncertain_desc');

  const verdictColor =
    result.verdict === 'fake'
      ? 'text-red-600 dark:text-red-400'
      : result.verdict === 'legitimate'
      ? 'text-green-600 dark:text-green-400'
      : result.verdict === 'not_job'
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-orange-600 dark:text-orange-400';

  const recBoxClass =
    result.verdict === 'fake'
      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
      : result.verdict === 'legitimate'
      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
      : result.verdict === 'not_job'
      ? 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-300'
      : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300';

  const recommendation =
    activeLang === 'sw'
      ? result.recommendation_sw
      : result.recommendation_en;

  function VerdictIcon() {
    if (result.verdict === 'fake')
      return <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    if (result.verdict === 'legitimate')
      return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
    if (result.verdict === 'not_job')
      return <Info className="w-5 h-5 text-gray-500 flex-shrink-0" />;
    return <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
  }

  function riskLabel(risk: RiskFactor['risk']) {
    if (risk === 'High Risk') return t('risk_high');
    if (risk === 'Medium Risk') return t('risk_medium');
    return t('risk_low');
  }

  const ruleExplanation = (result as any).rule_explanation || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <p className="font-bold text-gray-900 dark:text-white text-sm">
          {t('analyze_section3')}
        </p>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          {t('analyze_export')}
        </button>
      </div>

      <div className="p-5 space-y-5">

        {/* Verdict */}
        <div className="flex items-start gap-5">
          <CircularGauge value={pct} verdict={result.verdict} size={150} />

          <div>
            <p className="text-xs text-gray-500 mb-1">{t('result_verdict')}</p>

            <div className={`flex items-center gap-1.5 font-extrabold ${verdictColor}`}>
              <VerdictIcon />
              {verdictText}
            </div>

            <p className="text-xs text-gray-600 mt-2">
              {verdictDesc}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        {recommendation && (
          <div className={`p-3 text-xs rounded-lg border ${recBoxClass}`}>
            <p className="font-semibold mb-1">{t('result_rec_label')}</p>
            <p>{recommendation}</p>
          </div>
        )}

        {/* Risk Factors */}
        {result.risk_factors.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">
              {t('result_why_title')}
            </p>

            <div className="space-y-2">
              {result.risk_factors.map(factor => {
                const Icon = riskIconMap[factor.icon] ?? Info;
                const label =
                  activeLang === 'sw' ? factor.label_sw : factor.label_en;

                return (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between border-b py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">{label}</span>
                    </div>

                    <span className="text-[10px] font-bold">
                      {riskLabel(factor.risk)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.verdict !== 'uncertain' && result.verdict !== 'not_job' && ruleExplanation.length > 0 && (
          <div>
            <div className="space-y-2">
              {ruleExplanation.map((r: any, i: number) => (
                <div
                  key={i}
                  className="p-2 border rounded-lg text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                >
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {activeLang === 'sw' ? r.sw : r.en}
                  </p>

                  {r.evidence?.length > 0 && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      {activeLang === 'sw' ? 'Ushahidi:' : 'Evidence:'} {r.evidence.join(', ')}
                    </p>
                  )}

                  <p className="text-[10px] text-gray-500 mt-1">
                    {activeLang === 'sw' ? 'Hatari:' : 'Risk:'} {activeLang === 'sw' ? (r.risk === 'High Risk' ? 'Hatari kubwa' : r.risk === 'Medium Risk' ? 'Hatari ya kati' : 'Hatari ndogo') : r.risk}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
