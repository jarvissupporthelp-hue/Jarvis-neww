import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  accentColor?: string;
}

export default function GlassPanel({ title, children, collapsible = true, defaultOpen = true, className = '', accentColor = '#3B82F6' }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`glass rounded-xl overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: open ? `1px solid rgba(255,255,255,0.06)` : 'none' }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: accentColor }}>
          {title}
        </span>
        {collapsible && (
          <span className="text-[var(--text-muted)]">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>
      {open && <div className="p-4 flex flex-col gap-3">{children}</div>}
    </div>
  );
}
