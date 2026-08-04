import type React from 'react';
import type { Metric } from '../types';

export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className={`metric-card ${metric.tone}`}>
      <div>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <small>{metric.hint}</small>
      </div>
      <metric.Icon size={22} />
    </article>
  );
}
export function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="chart-card">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
export function BarList({ data, max, suffix }: { data: Array<{ label: string; value: number }>; max: number; suffix: string }) {
  return (
    <div className="bar-list">
      {data.map((item, index) => (
        <div className="bar-row" key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <div className="bar-track">
            <i style={{ width: `${Math.min(100, (item.value / max) * 100)}%` }} />
          </div>
          <strong>{item.value}{suffix}</strong>
        </div>
      ))}
    </div>
  );
}
export function ColumnChart({ data, max, suffix }: { data: Array<{ label: string; value: number }>; max: number; suffix: string }) {
  return (
    <div className="column-chart">
      {data.map((item, index) => (
        <div className="column-item" key={`${item.label}-${index}`}>
          <div>
            <i style={{ height: `${Math.min(100, (item.value / max) * 100)}%` }} />
          </div>
          <strong>{item.value}{suffix}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
export function PieChart({ data, suffix }: { data: Array<{ label: string; value: number }>; suffix: string }) {
  const colors = ['#2563eb', '#ec4899', '#f59e0b', '#14b8a6'];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const segments = data.map((item, index) => {
    const startValue = data.slice(0, index).reduce((sum, current) => sum + current.value, 0);
    const endValue = startValue + item.value;
    const start = total > 0 ? (startValue / total) * 360 : 0;
    const end = total > 0 ? (endValue / total) * 360 : 0;
    return `${colors[index % colors.length]} ${start}deg ${end}deg`;
  });

  return (
    <div className="pie-chart">
      <div
        className="pie-chart-visual"
        role="img"
        aria-label={data.map((item) => `${item.label}: ${item.value}${suffix}`).join(', ')}
        style={{ background: `conic-gradient(${segments.join(', ')})` }}
      >
        <div><strong>{total}</strong><span>học sinh</span></div>
      </div>
      <div className="pie-chart-legend">
        {data.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <i style={{ background: colors[index % colors.length] }} />
            <span>{item.label}</span>
            <strong>{item.value}{suffix}</strong>
            <small>{total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
