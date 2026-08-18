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
