import { useState, useRef } from 'react';
import { FileText, Upload, Info, Shield, Loader2, AlertCircle, ChevronRight, DollarSign } from 'lucide-react';
import type { Language, PredictionResult } from '../types';
import { useApp } from '../context/AppContext';
import { analyzJobAd } from '../services/predictionService';
import AnalysisResult from '../components/AnalysisResult';

type InputMode = 'text' | 'image';

const MAX_CHARS = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapPdfText(text: string, maxChars = 90) {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if ((current + word).length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current += word;
    }
  }

  if (current.trim()) lines.push(current.trim());
  return lines;
}

function exportToPDF(result: PredictionResult) {
  const lines = [
    'JOB AD CREDIBILITY ANALYSIS REPORT',
    '====================================',
    '',
    `Fake Probability: ${Math.round(result.fake_probability * 100)}%`,
    `Verdict: ${result.verdict.toUpperCase()}`,
    `Recommendation (EN): ${result.recommendation_en}`,
    `Recommendation (SW): ${result.recommendation_sw}`,
    '',
    'Risk Factors:',
    ...result.risk_factors.flatMap(f => wrapPdfText(`- ${f.label_en} (${f.label_sw}): ${f.risk}`, 90)),
    '',
    'Analyzed Job Ad:',
    ...wrapPdfText(result.raw_text || 'No text provided', 100),
  ];

  const contentStream = lines
    .map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 12} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');
  const contentLength = contentStream.length;

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.forEach(offset => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'job_ad_analysis.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyzeJob() {
  const { settings, language, setLanguage, t } = useApp();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [salaryStr, setSalaryStr] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [optionalInfo, setOptionalInfo] = useState('');
  const [showOptionalInfo, setShowOptionalInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = inputMode === 'text' ? text.trim().length > 0 : !!imageFile;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError(t('analyze_image_too_large'));
      return;
    }
    setImageFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const jobText = inputMode === 'text' ? text : '';
      const res = await analyzJobAd(
        jobText,
        { ...settings, outputLanguage: language },
        salaryStr || undefined,
        inputMode === 'image' ? imageFile : null,
        inputMode === 'image' ? optionalInfo : undefined
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error. Check your API endpoint in Settings.');
    } finally {
      setLoading(false);
    }
  }

  const langOptions: { value: Language; labelKey: 'analyze_lang_auto' | 'analyze_lang_sw' | 'analyze_lang_en'; subKey: 'analyze_lang_auto_sub' | 'analyze_lang_sw_sub' | 'analyze_lang_en_sub' }[] = [
    { value: 'auto', labelKey: 'analyze_lang_auto', subKey: 'analyze_lang_auto_sub' },
    { value: 'sw',   labelKey: 'analyze_lang_sw',   subKey: 'analyze_lang_sw_sub' },
    { value: 'en',   labelKey: 'analyze_lang_en',   subKey: 'analyze_lang_en_sub' },
  ];

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{t('analyze_title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('analyze_subtitle')}</p>
      </div>

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* LEFT: Input panel */}
        <div className="flex flex-col gap-4">
          {/* Section 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="font-bold text-gray-900 dark:text-white text-sm mb-4">
              {t('analyze_section1')}
            </p>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setInputMode('text'); setImageFile(null); setImagePreview(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                {t('analyze_paste_btn')}
              </button>
              <button
                onClick={() => { setInputMode('image'); setText(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'image'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Upload className="w-4 h-4" />
                {t('analyze_upload_btn')}
              </button>
            </div>

            {inputMode === 'text' ? (
              <div className="relative">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder={t('analyze_placeholder')}
                  className="w-full h-52 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
                />
                <span className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {text.length} / {MAX_CHARS}
                </span>
              </div>
            ) : (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="h-52 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="h-full w-full object-contain rounded-lg p-2" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center whitespace-pre-line">
                        {t('analyze_upload_hint')}
                      </p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowOptionalInfo(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showOptionalInfo ? t('analyze_optional_info_hide') : t('analyze_optional_info_show')}
                  </button>
                  {showOptionalInfo && (
                    <div className="mt-2">
                      <textarea
                        value={optionalInfo}
                        onChange={e => setOptionalInfo(e.target.value.slice(0, MAX_CHARS))}
                        placeholder={t('analyze_optional_info_placeholder')}
                        className="w-full h-24 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {t('analyze_optional_info_hint')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Salary input */}
            <div className="mt-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                {t('analyze_salary_label')}
              </label>
              <input
                type="text"
                value={salaryStr}
                onChange={e => setSalaryStr(e.target.value)}
                placeholder={t('analyze_salary_placeholder')}
                className="w-full text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Tip */}
            <div className="mt-3 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{t('analyze_tip')}</p>
            </div>
          </div>

          {/* Section 2: Output language */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="font-bold text-gray-900 dark:text-white text-sm mb-4">
              {t('analyze_section2')}
            </p>
            <div className="flex gap-6 flex-wrap">
              {langOptions.map(({ value, labelKey, subKey }) => (
                <label key={value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="output-lang"
                    value={value}
                    checked={language === value}
                    onChange={() => setLanguage(value)}
                    className="accent-blue-600 mt-0.5 w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{t(labelKey)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t(subKey)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all duration-200 ${
              canSubmit && !loading
                ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20 active:scale-[0.99]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
            {loading ? t('analyze_checking') : t('analyze_check_btn')}
            {!loading && canSubmit && <ChevronRight className="w-5 h-5" />}
          </button>

          {!canSubmit && (
            <p className="text-center text-xs text-gray-400 -mt-2">{t('analyze_btn_hint')}</p>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('analyze_error_title')}</p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Result panel */}
        <div>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-full min-h-72 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">{t('analyze_section3')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  {t('analyze_loading_result')}
                </p>
              </div>
            </div>
          ) : result ? (
            <AnalysisResult result={result} onExport={() => exportToPDF(result)} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-full min-h-72 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">{t('analyze_section3')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  {t('analyze_result_empty')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
