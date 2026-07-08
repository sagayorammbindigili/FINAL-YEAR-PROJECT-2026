import { useState, useEffect } from 'react';
import { Moon, Sun, User, ChevronDown, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Language } from '../types';

type GreetingKey = 'greeting_morning' | 'greeting_afternoon' | 'greeting_evening';

function getGreetingKey(date: Date): { key: GreetingKey; icon: string } {
  const h = date.getHours();
  if (h < 12) return { key: 'greeting_morning',   icon: '☀️' };
  if (h < 17) return { key: 'greeting_afternoon', icon: '🌤️' };
  return             { key: 'greeting_evening',   icon: '🌙' };
}

export default function Header() {
  const { language, setLanguage, theme, setTheme, t, sidebarOpen, toggleSidebar, page } = useApp();
  const isMobile = useIsMobile();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { key: greetingKey, icon } = getGreetingKey(now);
  const showGreeting = page === 'dashboard';

  // Desktop: header left edge tracks sidebar width. Mobile: always left-0.
  const leftOffset = isMobile ? 0 : (sidebarOpen ? 240 : 0);

  const langOptions: { value: Language; label: string }[] = [
    { value: 'auto', label: t('header_lang_auto') },
    { value: 'sw',   label: t('header_lang_sw') },
    { value: 'en',   label: t('header_lang_en') },
  ];

  return (
    <header
      style={{ left: leftOffset, transition: 'left 300ms cubic-bezier(0.4,0,0.2,1)' }}
      className="fixed top-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-20 flex items-center px-4 gap-3"
    >
      {/* Sidebar toggle button */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Greeting — only on dashboard */}
      {showGreeting && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl leading-none hidden sm:block">{icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
              {t(greetingKey)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('greeting_sub')}</p>
          </div>
        </div>
      )}

      {/* Spacer when no greeting */}
      {!showGreeting && <div className="flex-1" />}

      {/* Language selector */}
      <div className="hidden md:flex items-center gap-3 border-r border-gray-200 dark:border-gray-600 pr-4">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {t('header_language')}
        </span>
        {langOptions.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="header-lang"
              value={opt.value}
              checked={language === opt.value}
              onChange={() => setLanguage(opt.value)}
              className="accent-blue-600 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* User avatar */}
      <button className="flex items-center gap-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors p-1 pr-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hidden sm:block" />
      </button>
    </header>
  );
}
