import { useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Server, Key, Globe, Palette } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Language, Theme } from '../types';

export default function Settings() {
  const { settings, updateSettings, language, setLanguage, theme, setTheme, t } = useApp();
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  function handleSave() {
    updateSettings({ apiEndpoint, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    setTestStatus('loading');
    setTestMsg('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ job_text: 'test ping', salary_str: '', output_lang: 'en' }),
      });
      clearTimeout(timeout);
      setTestStatus(res.ok ? 'ok' : 'error');
      setTestMsg(res.ok ? `${t('settings_connected')} Status ${res.status}` : `Server returned ${res.status}`);
    } catch (e) {
      setTestStatus('error');
      setTestMsg(e instanceof Error ? e.message : t('settings_conn_failed'));
    }
  }

  const langOptions: { value: Language; label: string }[] = [
    { value: 'auto', label: `${t('header_lang_auto')} — ${t('analyze_lang_auto_sub')}` },
    { value: 'sw',   label: `${t('header_lang_sw')} — ${t('analyze_lang_sw_sub')}` },
    { value: 'en',   label: `${t('header_lang_en')} — ${t('analyze_lang_en_sub')}` },
  ];

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: t('settings_theme_light') },
    { value: 'dark',  label: t('settings_theme_dark') },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{t('settings_title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings_subtitle')}</p>
      </div>

      {/* API Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <Server className="w-4 h-4 text-gray-500" />
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{t('settings_api_title')}</p>
        </div>

        {/* Endpoint */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            {t('settings_endpoint_label')}
          </label>
          <input
            type="url"
            value={apiEndpoint}
            onChange={e => setApiEndpoint(e.target.value)}
            placeholder="http://localhost:5000/predict"
            className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">{t('settings_endpoint_hint')}</p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            <Key className="w-3 h-3 inline mr-1" />
            {t('settings_key_label')}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={t('settings_key_placeholder')}
              className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTest}
            disabled={testStatus === 'loading' || !apiEndpoint}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus === 'loading' ? t('settings_testing') : t('settings_test_btn')}
          </button>
          {testStatus === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> {testMsg}
            </span>
          )}
          {testStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {testMsg}
            </span>
          )}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <Globe className="w-4 h-4 text-gray-500" />
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{t('settings_lang_title')}</p>
        </div>
        {langOptions.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="settings-lang"
              value={opt.value}
              checked={language === opt.value}
              onChange={() => setLanguage(opt.value)}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <Palette className="w-4 h-4 text-gray-500" />
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{t('settings_theme_title')}</p>
        </div>
        {themeOptions.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="settings-theme"
              value={opt.value}
              checked={theme === opt.value}
              onChange={() => setTheme(opt.value)}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Expected API response format */}
      <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-5">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">{t('settings_schema_title')}</p>
        <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed overflow-x-auto">
{`POST /predict
Body (JSON):
{
  "job_text": "Full job ad text...",
  "salary_str": "1,500,000 TZS",
  "output_lang": "en"  // or "sw"
}

Or (multipart/form-data for image):
  image: <file>
  salary_str: "1,500,000 TZS"
  output_lang: "en"

Response:
{
  "predicted_class": "Fake Job",
  "confidence": "0.8700",
  "explanation": [
    { "word": "fee", "weight": "0.2341" }
  ],
  "raw_text": "...",
  "processing_time_s": 12.34,
  "success": true
}`}
        </pre>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {t('settings_save_btn')}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> {t('settings_saved')}
          </span>
        )}
      </div>
    </div>
  );
}
