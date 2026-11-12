import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MODULES } from '../constants';
import type { ModuleId } from '../types';

interface Props {
  moduleId: ModuleId;
  children: ReactNode;
}

export default function ModuleLayout({ moduleId, children }: Props) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return null;

  return (
    <motion.div
      key={moduleId}
      className="flex flex-col min-h-full p-4 md:p-6 lg:h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Module header */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: `${mod.color}20`, color: mod.color, border: `1px solid ${mod.color}30` }}
        >
          {mod.icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">{mod.label}</h2>
          <p className="text-sm text-[var(--text-muted)]">{mod.description}</p>
        </div>
      </div>

      {/* Module content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </motion.div>
  );
}
