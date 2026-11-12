import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { MODULES } from '../constants';
import type { ModuleId } from '../types';

interface Props {
  active: ModuleId | 'dashboard';
  onSelect: (id: ModuleId | 'dashboard') => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, onSelect, collapsed, onToggle }: Props) {
  return (
    <motion.aside
      className="flex flex-col h-full glass-bright"
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ minWidth: collapsed ? 56 : 220, maxWidth: collapsed ? 56 : 220, flexShrink: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--border)]">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold tracking-wide text-white"
          >
            Math<span className="text-[#3B82F6]">Space</span>
          </motion.span>
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-[var(--text-secondary)] ml-auto"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
        {/* Dashboard */}
        <NavItem
          id="dashboard"
          icon={<Home size={16} />}
          label="Dashboard"
          color="#3B82F6"
          active={active === 'dashboard'}
          collapsed={collapsed}
          onSelect={() => onSelect('dashboard')}
        />

        <div className="my-2 border-t border-[var(--border)]" />

        {MODULES.map(m => (
          <NavItem
            key={m.id}
            id={m.id}
            icon={<span className="font-mono text-sm font-bold leading-none">{m.icon}</span>}
            label={m.label}
            color={m.color}
            active={active === m.id}
            collapsed={collapsed}
            onSelect={() => onSelect(m.id)}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 border-t border-[var(--border)]"
        >
          <p className="text-[10px] text-[var(--text-muted)]">MathSpace v3.0</p>
        </motion.div>
      )}
    </motion.aside>
  );
}

interface NavItemProps {
  id: string;
  icon: ReactNode;
  label: string;
  color: string;
  active: boolean;
  collapsed: boolean;
  onSelect: () => void;
}

function NavItem({ icon, label, color, active, collapsed, onSelect }: NavItemProps) {
  return (
    <button
      onClick={onSelect}
      title={collapsed ? label : undefined}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200 text-left group relative"
      style={{
        background: active ? `${color}18` : 'transparent',
        color: active ? color : 'var(--text-secondary)',
        borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
      }}
    >
      <div
        className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
        style={{ background: active ? `${color}25` : 'transparent', color: active ? color : 'var(--text-muted)' }}
      >
        {icon}
      </div>
      {!collapsed && (
        <span className="text-xs font-medium leading-tight truncate">{label}</span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a2240] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-[var(--border)]">
          {label}
        </div>
      )}
    </button>
  );
}
