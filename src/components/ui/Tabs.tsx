import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({ tabs, value, onChange, className }: {tabs: TabItem[];value: string;onChange: (id: string) => void;className?: string;}) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line scroll-thin', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              active ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'
            )}>
            
            {tab.label}
            {tab.count !== undefined &&
            <span className={cn('num rounded px-1.5 text-[11px]', active ? 'bg-primary-soft text-primary-strong' : 'bg-subtle text-muted')}>{tab.count}</span>
            }
          </button>);

      })}
    </div>);

}