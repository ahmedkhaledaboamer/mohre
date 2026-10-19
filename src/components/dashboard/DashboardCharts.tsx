import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/Feedback';
import { useI18n } from '../../hooks/useI18n';
import { categoryPalette, chartColors } from '../../utils/chartColors';
import type { DayPoint } from '../../utils/reports';
import { cn } from '../../utils/cn';

const tooltipStyle = { borderRadius: 8, borderColor: chartColors.grid, fontSize: 12 };

/** Daily actual collections vs payments — highlights the selected period against the days before it. */
export function DailyCashChart({ series, from, to, className, title }: {series: DayPoint[];from: string;to: string;className?: string;title?: string;}) {
  const { tr, money, date } = useI18n();
  const data = series.map((p) => ({ ...p, label: date(p.date, 'd MMM'), inPeriod: p.date >= from && p.date <= to }));
  return (
    <Panel className={className} title={title ?? tr('التحصيلات اليومية مقارنة بالأيام السابقة', 'Daily collections vs previous days')} description={tr('مبالغ مقبوضة فعلياً (بتاريخ كل سند) مقابل ما دُفع للجهات والمصروفات. الأعمدة الداكنة = الفترة المختارة.', 'Actual receipts by voucher date vs payments and expenses. Dark bars = selected period.')}>
      <div className="h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartColors.muted }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: chartColors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => money(v, { compact: true, noSymbol: true })} width={44} />
            <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(14,23,38,0.04)' }} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="collected" name={tr('محصّل', 'Collected')} radius={[3, 3, 0, 0]} maxBarSize={22}>
              {data.map((d) => <Cell key={d.date} fill={d.inPeriod ? chartColors.primary : chartColors.primarySoft} />)}
            </Bar>
            <Bar dataKey="paid" name={tr('مدفوع للجهات', 'Paid to authorities')} radius={[3, 3, 0, 0]} maxBarSize={22}>
              {data.map((d) => <Cell key={d.date} fill={d.inPeriod ? chartColors.navy3 : '#B8C2D1'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>);

}

export function CategoryDonut({ data, title, description, className, valueLabel }: {data: {name: string;value: number;}[];title: string;description?: string;className?: string;valueLabel?: (v: number) => string;}) {
  const { tr } = useI18n();
  const total = data.reduce((a, d) => a + d.value, 0);
  const fmt = valueLabel ?? ((v: number) => String(v));
  return (
    <Panel className={className} title={title} description={description}>
      {total === 0 ?
      <EmptyState compact title={tr('لا توجد بيانات في هذه الفترة', 'No data in this period')} /> :

      <>
          <div className="relative h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                  {data.map((_, i) => <Cell key={i} fill={categoryPalette[i % categoryPalette.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-muted">{tr('الإجمالي', 'Total')}</span>
              <span className="num text-sm font-semibold">{fmt(total)}</span>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.map((d, i) =>
          <li key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: categoryPalette[i % categoryPalette.length] }} />
                  {d.name}
                </span>
                <span className="num text-muted">
                  {fmt(d.value)} · {Math.round(d.value / total * 100)}%
                </span>
              </li>
          )}
          </ul>
        </>
      }
    </Panel>);

}

/** Ranked horizontal bars (top employees, top services…). */
export function BarList({ title, description, items, className, format, onSelect }: {title: string;description?: string;items: {key: string;label: string;value: number;sub?: string;}[];className?: string;format?: (v: number) => string;onSelect?: (key: string) => void;}) {
  const { tr } = useI18n();
  const max = Math.max(...items.map((d) => d.value), 1);
  return (
    <Panel className={className} title={title} description={description}>
      {items.length === 0 ?
      <EmptyState compact title={tr('لا توجد بيانات في هذه الفترة', 'No data in this period')} /> :

      <ul className="space-y-3">
          {items.map((d) =>
        <li key={d.key}>
              <button type="button" disabled={!onSelect} onClick={() => onSelect?.(d.key)} className={cn('w-full text-start', onSelect && 'group')}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-ink-2 group-hover:text-ink">
                    {d.label}
                    {d.sub && <span className="ms-1.5 text-muted">{d.sub}</span>}
                  </span>
                  <span className="num shrink-0 font-semibold">{format ? format(d.value) : d.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${d.value / max * 100}%` }} />
                </div>
              </button>
            </li>
        )}
        </ul>
      }
    </Panel>);

}
