import type { CSSProperties } from 'react';
import { Shield, LayoutDashboard, Search, Lightbulb, Info, Settings, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Page } from '../types';

type NavItem = {
  id: Page;
  icon: typeof LayoutDashboard;
  labelKey: 'nav_dashboard' | 'nav_analyze' | 'nav_tips' | 'nav_about' | 'nav_settings';
  subKey: 'nav_dashboard_sub' | 'nav_analyze_sub' | 'nav_tips_sub' | 'nav_about_sub' | 'nav_settings_sub';
};

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'nav_dashboard', subKey: 'nav_dashboard_sub' },
  { id: 'analyze',   icon: Search,          labelKey: 'nav_analyze',   subKey: 'nav_analyze_sub' },
  { id: 'tips',      icon: Lightbulb,       labelKey: 'nav_tips',      subKey: 'nav_tips_sub' },
  { id: 'about',     icon: Info,            labelKey: 'nav_about',     subKey: 'nav_about_sub' },
  { id: 'settings',  icon: Settings,        labelKey: 'nav_settings',  subKey: 'nav_settings_sub' },
];

const SIDEBAR_W = 240;

export default function Sidebar() {
  const { page, setPage, t, sidebarOpen, setSidebarOpen } = useApp();
  const isMobile = useIsMobile();

  const asideStyle: CSSProperties = isMobile
    ? {
        width: SIDEBAR_W,
        transform: sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
        transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
      }
    : {
        width: sidebarOpen ? SIDEBAR_W : 0,
        transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      };

  function handleNavClick(id: Page) {
    setPage(id);
    if (isMobile) setSidebarOpen(false);
  }

  return (
    <aside
      style={asideStyle}
      className="fixed inset-y-0 left-0 z-30 bg-[#0f1f45] text-white flex-shrink-0 overflow-hidden"
    >
      <div className="flex flex-col h-full" style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-sm text-white truncate">Intelligent System</p>
            <p className="text-[10px] text-blue-300/80 leading-snug">
              For Assessing The Credibility Of<br />
              Online Job Advertisements - Tanzania
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, labelKey, subKey }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{t(labelKey)}</p>
                  <p className="text-[11px] mt-0.5 opacity-70 truncate">{t(subKey)}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* City illustration */}
        <div className="mx-3 mb-4 rounded-xl overflow-hidden bg-gradient-to-b from-[#0a1535] to-[#0f1f45] border border-white/10 p-4 flex-shrink-0">
          <svg viewBox="0 0 200 100" className="w-full h-20 opacity-50" fill="none">
            <rect width="200" height="100" fill="url(#skyGrad)" />
            <rect x="0"   y="50" width="20" height="50" fill="#1e3a6e" />
            <rect x="22"  y="35" width="15" height="65" fill="#1e3a6e" />
            <rect x="39"  y="45" width="18" height="55" fill="#1e3a6e" />
            <rect x="59"  y="25" width="22" height="75" fill="#1e3a6e" />
            <rect x="83"  y="15" width="14" height="85" fill="#1e3a6e" />
            <rect x="99"  y="30" width="19" height="70" fill="#1e3a6e" />
            <rect x="120" y="40" width="16" height="60" fill="#1e3a6e" />
            <rect x="138" y="28" width="20" height="72" fill="#1e3a6e" />
            <rect x="160" y="38" width="15" height="62" fill="#1e3a6e" />
            <rect x="177" y="48" width="23" height="52" fill="#1e3a6e" />
            {[26, 30, 34].map((y, i) => (
              <rect key={`w1-${i}`} x={24 + i * 6} y={y} width="3" height="3" fill="#fbbf24" opacity="0.7" />
            ))}
            {[18, 22, 26].map((y, i) => (
              <rect key={`w2-${i}`} x={62 + i * 6} y={y} width="3" height="3" fill="#93c5fd" opacity="0.5" />
            ))}
            <line x1="90" y1="15" x2="90" y2="5" stroke="#4ade80" strokeWidth="1.5" />
            <circle cx="90" cy="4" r="2" fill="#ef4444" />
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a1535" />
                <stop offset="100%" stopColor="#0f2060" />
              </linearGradient>
            </defs>
          </svg>
          <div className="mt-2 text-center space-y-1">
            {t('sidebar_quote').split('\n').map((line, i) => (
              <p key={i} className={i === 0 ? 'text-xs text-blue-200/80 italic leading-snug' : 'text-[11px] text-yellow-400 font-semibold'}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 text-center flex-shrink-0">
          <p className="text-[10px] text-blue-300/60">{t('sidebar_dev_by')}</p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <p className="text-xs font-bold text-white">Mbindigili Saga</p>
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-[10px] text-blue-300/40 mt-1">&copy; 2026 All Rights Reserved.</p>
        </div>
      </div>
    </aside>
  );
}