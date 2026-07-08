import { AlertTriangle, DollarSign, Building, Phone, CreditCard, Mail, CheckCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TranslationKey } from '../i18n/translations';

type RedFlag = {
  icon: typeof DollarSign;
  color: string;
  bg: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
};

const redFlags: RedFlag[] = [
  { icon: DollarSign,     color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       titleKey: 'tips_rf1_title', descKey: 'tips_rf1_desc' },
  { icon: CreditCard,     color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       titleKey: 'tips_rf2_title', descKey: 'tips_rf2_desc' },
  { icon: Building,       color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', titleKey: 'tips_rf3_title', descKey: 'tips_rf3_desc' },
  { icon: Phone,          color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', titleKey: 'tips_rf4_title', descKey: 'tips_rf4_desc' },
  { icon: Mail,           color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', titleKey: 'tips_rf5_title', descKey: 'tips_rf5_desc' },
  { icon: AlertTriangle,  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', titleKey: 'tips_rf6_title', descKey: 'tips_rf6_desc' },
];

const safetyKeys: TranslationKey[] = [
  'tips_s1', 'tips_s2', 'tips_s3', 'tips_s4', 'tips_s5', 'tips_s6',
];

export default function TipsAwareness() {
  const { t } = useApp();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{t('tips_title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('tips_subtitle')}</p>
      </div>

      {/* Red flags */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          {t('tips_redflags_title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {redFlags.map(({ icon: Icon, color, bg, titleKey, descKey }) => (
            <div key={titleKey} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700/50`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{t(titleKey)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety tips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {t('tips_safety_title')}
        </h3>
        <ol className="space-y-3">
          {safetyKeys.map((key, i) => (
            <li key={key} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t(key)}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Report link */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40 p-4 flex items-center gap-3">
        <ExternalLink className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{t('tips_report_title')}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{t('tips_report_desc')}</p>
        </div>
      </div>
    </div>
  );
}
