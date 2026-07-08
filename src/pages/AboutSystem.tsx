import { Shield, Brain, Globe, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TranslationKey } from '../i18n/translations';

type Feature = {
  icon: typeof Brain;
  color: string;
  bg: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
};

const features: Feature[] = [
  { icon: Brain,  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   titleKey: 'about_f1_title', descKey: 'about_f1_desc' },
  { icon: Globe,  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20', titleKey: 'about_f2_title', descKey: 'about_f2_desc' },
  { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', titleKey: 'about_f3_title', descKey: 'about_f3_desc' },
  { icon: Award,  color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', titleKey: 'about_f4_title', descKey: 'about_f4_desc' },
];

export default function AboutSystem() {
  const { t } = useApp();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{t('about_title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('about_subtitle')}</p>
      </div>

      {/* Mission card */}
      <div className="bg-gradient-to-br from-[#0f1f45] to-[#1e3a8a] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <p className="font-extrabold text-lg">Intelligent System</p>
            <p className="text-blue-300 text-xs">For Assessing Job Ad Credibility — Tanzania</p>
          </div>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed">{t('about_mission')}</p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map(({ icon: Icon, color, bg, titleKey, descKey }) => (
          <div key={titleKey} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700/50`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{t(titleKey)}</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{t(descKey)}</p>
          </div>
        ))}
      </div>

      {/* Developer card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('about_dev_label')}</p>
        <p className="font-extrabold text-lg text-gray-900 dark:text-white">Mbindigili Saga</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{t('about_dev_desc')}</p>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400">{t('about_rights')}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('about_version')}</p>
        </div>
      </div>
    </div>
  );
}
