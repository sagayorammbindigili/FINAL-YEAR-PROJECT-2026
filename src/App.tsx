import type { CSSProperties } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useIsMobile } from './hooks/useIsMobile';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AnalyzeJob from './pages/AnalyzeJob';
import TipsAwareness from './pages/TipsAwareness';
import AboutSystem from './pages/AboutSystem';
import Settings from './pages/Settings';

const SIDEBAR_W = 240;

function Layout() {
  const { page, sidebarOpen, setSidebarOpen } = useApp();
  const isMobile = useIsMobile();

  const mainStyle: CSSProperties = {
    marginLeft: isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0),
    transition: 'margin-left 300ms cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <div className="min-h-screen">
      {/* Mobile backdrop — shown when drawer is open on small screens */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[1px]"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />
      <Header />

      <main
        style={mainStyle}
        className="pt-16 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
      >
        <div className="px-6 py-6">
          {page === 'dashboard' && <Dashboard />}
          {page === 'analyze'   && <AnalyzeJob />}
          {page === 'tips'      && <TipsAwareness />}
          {page === 'about'     && <AboutSystem />}
          {page === 'settings'  && <Settings />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}
