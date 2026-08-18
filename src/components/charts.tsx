import type React from 'react';
import { eventFlow, invoiceStatus } from '../data/mockData';
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

export function SplitDashboard() {
  return (
    <div className="split-dashboard">
      <div className="status-donut" aria-label="Trạng thái hóa đơn">
        <div>
          <strong>68%</strong>
          <span>Paid</span>
        </div>
      </div>
      <div className="mini-stats">
        {invoiceStatus.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
          </div>
        ))}
      </div>
      <div className="event-list">
        {eventFlow.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString('vi-VN')}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
