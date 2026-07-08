import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Language, Page, Theme, AppSettings } from '../types';
import { translations, type TranslationKey, type SupportedLang } from '../i18n/translations';

interface AppContextValue {
  page: Page;
  setPage: (p: Page) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  t: (key: TranslationKey) => string;
  activeLang: SupportedLang;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const SETTINGS_KEY = 'jobchecker_settings';
const SIDEBAR_KEY  = 'jobchecker_sidebar_open';

const defaults: AppSettings = {
  apiEndpoint: 'http://localhost:5000/predict',
  apiKey: '',
  outputLanguage: 'auto',
  theme: 'light',
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

function loadSidebarOpen(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function resolveActiveLang(language: Language): SupportedLang {
  if (language === 'sw') return 'sw';
  if (language === 'en') return 'en';
  const browserLang = navigator.language?.toLowerCase() ?? '';
  return browserLang.startsWith('sw') ? 'sw' : 'en';
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(loadSidebarOpen);

  const language = settings.outputLanguage;
  const theme = settings.theme;
  const activeLang = useMemo(() => resolveActiveLang(language), [language]);

  const t = useMemo(() => {
    return (key: TranslationKey): string => translations[activeLang][key] as string;
  }, [activeLang]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [settings, theme]);

  function setSidebarOpen(open: boolean) {
    setSidebarOpenState(open);
    localStorage.setItem(SIDEBAR_KEY, String(open));
  }

  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  function setLanguage(l: Language) {
    setSettings(s => ({ ...s, outputLanguage: l }));
  }

  function setTheme(th: Theme) {
    setSettings(s => ({ ...s, theme: th }));
  }

  function updateSettings(partial: Partial<AppSettings>) {
    setSettings(s => ({ ...s, ...partial }));
  }

  return (
    <AppContext.Provider value={{
      page, setPage,
      language, setLanguage,
      theme, setTheme,
      settings, updateSettings,
      t, activeLang,
      sidebarOpen, toggleSidebar, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
