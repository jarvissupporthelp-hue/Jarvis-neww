import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ModuleLayout from './components/ModuleLayout';
import type { ModuleId } from './types';

type ActivePage = ModuleId | 'dashboard';
const validModules: ModuleId[] = ['functions', 'integrals', 'matrices', 'vectors', 'limits', 'trigonometry', 'complex', 'probability'];
const FunctionsModule = lazy(() => import('./modules/FunctionsModule'));
const IntegralsModule = lazy(() => import('./modules/IntegralsModule'));
const MatricesModule = lazy(() => import('./modules/MatricesModule'));
const VectorsModule = lazy(() => import('./modules/VectorsModule'));
const LimitsModule = lazy(() => import('./modules/LimitsModule'));
const TrigonometryModule = lazy(() => import('./modules/TrigonometryModule'));
const ComplexModule = lazy(() => import('./modules/ComplexModule'));
const ProbabilityModule = lazy(() => import('./modules/ProbabilityModule'));

function initialPage(): ActivePage {
  const requested = new URLSearchParams(window.location.search).get('module');
  return validModules.find(id => id === requested) ?? 'dashboard';
}

function ModuleContent({ id }: { id: ModuleId }) {
  return (
    <ModuleLayout moduleId={id}>
      <Suspense fallback={<p className="p-6 text-[var(--text-secondary)]" role="status">Loading visualization…</p>}>
      {id === 'functions' && <FunctionsModule />}
      {id === 'integrals' && <IntegralsModule />}
      {id === 'matrices' && <MatricesModule />}
      {id === 'vectors' && <VectorsModule />}
      {id === 'limits' && <LimitsModule />}
      {id === 'trigonometry' && <TrigonometryModule />}
      {id === 'complex' && <ComplexModule />}
      {id === 'probability' && <ProbabilityModule />}
      </Suspense>
    </ModuleLayout>
  );
}

export default function App() {
  const [active, setActive] = useState<ActivePage>(initialPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <Sidebar
          active={active}
          onSelect={setActive}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={active} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active === 'dashboard' ? (
                <Dashboard onNavigate={(id) => setActive(id)} />
              ) : (
                <ModuleContent id={active as ModuleId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <header className="glass-bright border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-lg font-bold">
            Math<span style={{ color: '#3B82F6' }}>Space</span>
          </span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            {active === 'dashboard' ? 'Dashboard' : active}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={active} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active === 'dashboard' ? (
                <Dashboard onNavigate={(id) => setActive(id)} />
              ) : (
                <ModuleContent id={active as ModuleId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav active={active} onSelect={setActive} />
      </div>
    </div>
  );
}
