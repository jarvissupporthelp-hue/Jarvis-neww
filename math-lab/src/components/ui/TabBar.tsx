interface Tab { id: string; label: string; }

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  color?: string;
}

export default function TabBar({ tabs, active, onChange, color = '#3B82F6' }: Props) {
  return (
    <div className="flex border-b border-[var(--border)] mb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-5 py-2.5 text-sm font-medium transition-all duration-200 relative"
          style={{
            color: active === tab.id ? color : 'var(--text-secondary)',
            borderBottom: active === tab.id ? `2px solid ${color}` : '2px solid transparent',
            marginBottom: -1,
            background: active === tab.id ? `${color}15` : 'transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
