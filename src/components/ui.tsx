import { useState } from 'react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { permissionRows } from '../data/mockData';
import type { TabItem } from '../types';

export function FunctionTabs({ tabs }: { tabs: TabItem[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="tabbed-feature">
      <div className="tab-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={active.id === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.Icon size={17} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-panel">{active.content}</div>
    </div>
  );
}

export function InfoGrid({ items }: { items: Array<{ title: string; value: string; meta: string }> }) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <article key={`${item.title}-${item.value}`} className="info-tile">
          <span>{item.title}</span>
          <strong>{item.value}</strong>
          <small>{item.meta}</small>
        </article>
      ))}
    </div>
  );
}

export function ProcessList({ items }: { items: string[] }) {
  return (
    <ol className="process-list">
      {items.map((item, index) => (
        <li key={item}>
          <span>{index + 1}</span>
          <strong>{item}</strong>
        </li>
      ))}
    </ol>
  );
}

export function FormPreview({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="form-preview">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function PermissionMatrix() {
  return (
    <div className="permission-matrix">
      <div className="matrix-head">Permission</div>
      <div className="matrix-head">Admin</div>
      <div className="matrix-head">Teacher</div>
      <div className="matrix-head">Student</div>
      <div className="matrix-head">Parent</div>
      {permissionRows.map((row) => [
        <strong key={`${row.permission}-name`}>{row.permission}</strong>,
        <span key={`${row.permission}-admin`}>{row.admin ? '✓' : '-'}</span>,
        <span key={`${row.permission}-teacher`}>{row.teacher ? '✓' : '-'}</span>,
        <span key={`${row.permission}-student`}>{row.student ? '✓' : '-'}</span>,
        <span key={`${row.permission}-parent`}>{row.parent ? '✓' : '-'}</span>,
      ])}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`section-card ${wide ? 'wide' : ''}`}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CommandButton({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <button className="command-button">
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'blue' | 'orange' | 'red' | 'violet'; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized.includes('active') || normalized.includes('paid') || normalized.includes('có mặt') || normalized.includes('đang học')
      ? 'green'
      : normalized.includes('pending') || normalized.includes('partial') || normalized.includes('trễ') || normalized.includes('cần')
        ? 'orange'
        : normalized.includes('vắng') || normalized.includes('locked')
          ? 'red'
          : 'blue';

  return <Badge tone={tone}>{value}</Badge>;
}

