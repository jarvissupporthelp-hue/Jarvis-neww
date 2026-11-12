import { Home } from 'lucide-react';
import { MODULES } from '../constants';
import type { ModuleId } from '../types';

interface Props {
  active: ModuleId | 'dashboard';
  onSelect: (id: ModuleId | 'dashboard') => void;
}

export default function BottomNav({ active, onSelect }: Props) {
  const items = [
    { id: 'dashboard' as const, icon: <Home size={18} />, label: 'Home', color: '#3B82F6' },
    ...MODULES.map(m => ({ id: m.id, icon: <span className="font-mono text-sm font-bold">{m.icon}</span>, label: m.label.split(' ')[0], color: m.color })),
  ];

  return (
    <div className="glass-bright border-t border-[var(--border)] overflow-x-auto">
      <div className="flex min-w-max">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id as ModuleId | 'dashboard')}
            className="flex flex-col items-center gap-1 px-3 py-2 min-w-[60px] transition-all"
            style={{ color: active === item.id ? item.color : 'var(--text-muted)' }}
          >
            {item.icon}
            <span className="text-[9px] font-medium truncate max-w-[52px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
