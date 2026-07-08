import { Search, Lightbulb, Info, Shield, Brain, Globe, Lock, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import laptopImage from '../assets/laptop.jpg';
const steps = [
  { icon: ClipboardCheck, color: 'bg-blue-600',   num: '1', labelKey: 'dash_step1_title' as const, descKey: 'dash_step1_desc' as const },
  { icon: Brain,          color: 'bg-indigo-600', num: '2', labelKey: 'dash_step2_title' as const, descKey: 'dash_step2_desc' as const },
  { icon: Shield,         color: 'bg-green-600',  num: '3', labelKey: 'dash_step3_title' as const, descKey: 'dash_step3_desc' as const },
];

export default function Dashboard() {
  const { t, setPage } = useApp();

  const quickActions = [
    {
      icon: Search,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/50',
      titleKey: 'dash_quick_analyze' as const,
      descKey: 'dash_quick_analyze_desc' as const,
      page: 'analyze' as const,
    },
    {
      icon: Lightbulb,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800/50',
      titleKey: 'dash_quick_tips' as const,
      descKey: 'dash_quick_tips_desc' as const,
      page: 'tips' as const,
    },
    {
      icon: Info,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800/50',
      titleKey: 'dash_quick_about' as const,
      descKey: 'dash_quick_about_desc' as const,
      page: 'about' as const,
    },
  ];

  const featureCards = [
    { icon: Brain, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   titleKey: 'feat_xai' as const,      descKey: 'feat_xai_desc' as const },
    { icon: Lock,  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20', titleKey: 'feat_safety' as const,   descKey: 'feat_safety_desc' as const },
    { icon: Globe, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', titleKey: 'feat_informed' as const, descKey: 'feat_informed_desc' as const },
    { icon: Shield, color: 'text-teal-600',  bg: 'bg-teal-50 dark:bg-teal-900/20',   titleKey: 'feat_together' as const, descKey: 'feat_together_desc' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden min-h-[200px] flex items-center">
        <img
          src={laptopImage}
          alt="Laptop on desk"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f45]/92 via-[#0f1f45]/72 to-transparent" />
        <div className="relative z-10 px-8 py-8 max-w-xl">
          <h1 className="text-2xl font-extrabold text-white leading-tight mb-2">
            {t('dash_hero_title')}
          </h1>
          <p className="text-blue-100/90 text-sm leading-relaxed mb-5">
            {t('dash_hero_subtitle')}
          </p>
          <button
            onClick={() => setPage('analyze')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/30 active:scale-95"
          >
            <Search className="w-4 h-4" />
            {t('dash_hero_btn')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-5">
          <h2 className="font-extrabold text-gray-900 dark:text-white text-base">{t('dash_how_title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('dash_how_sub')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Mstari kutoka Step 1 hadi Step 2 */}
          <div className="hidden md:block absolute left-[33%] top-5 w-[34%] h-px bg-gray-300 dark:bg-gray-600" />
          {steps.map(({ icon: Icon, color, num, labelKey, descKey }, idx) => (
            <div key={num} className="flex flex-col items-start gap-3 relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-full w-full h-px bg-gray-200 dark:bg-gray-700 -translate-x-4 translate-x-8" />
              )}
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Step {num}</span>
                </div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{t(labelKey)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-extrabold text-gray-900 dark:text-white text-sm mb-3">{t('dash_quick_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ icon: Icon, color, bg, border, titleKey, descKey, page }) => (
            <button
              key={page}
              onClick={() => setPage(page)}
              className={`${bg} border ${border} rounded-xl p-5 flex items-start gap-3 text-left hover:shadow-md transition-all duration-200 group active:scale-[0.98]`}
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 leading-tight">{t(titleKey)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{t(descKey)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 mt-0.5 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Feature highlight cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featureCards.map(({ icon: Icon, color, bg, titleKey, descKey }) => (
          <div key={titleKey} className={`${bg} rounded-xl p-4 flex items-start gap-3`}>
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">{t(titleKey)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
