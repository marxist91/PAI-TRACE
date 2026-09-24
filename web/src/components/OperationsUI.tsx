import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function OpsPage({ children }: { children: ReactNode }) {
  return <div className="ops-page">{children}</div>;
}

export function OpsHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ops-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {actions && <div className="ops-header-actions">{actions}</div>}
    </header>
  );
}

export function OpsPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ops-panel ${className}`}>
      {(title || action) && (
        <div className="ops-panel-head">
          <div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>
          {action && <div className="ops-panel-action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface OpsMetricItem {
  to?: string;
  label: string;
  value: number | string;
  icon: Icon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export function OpsMetricStrip({ items }: { items: OpsMetricItem[] }) {
  return (
    <section className="ops-metric-strip" aria-label="Indicateurs de la page">
      {items.map(({ label, value, icon: MetricIcon, tone = 'default', to }) => (
        <article key={label} className={`ops-metric ops-metric-${tone}`}>
          <MetricIcon size={24} weight="duotone" />
          <div>{to ? <Link to={to} className="ops-metric-link"><span>{label} →</span><strong>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</strong></Link> : <><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</strong></>}</div>
        </article>
      ))}
    </section>
  );
}

export function OpsState({
  icon: StateIcon,
  title,
  description,
  tone = 'default',
}: {
  icon: Icon;
  title: string;
  description?: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  return (
    <div className={`ops-state ops-state-${tone}`}>
      <StateIcon size={30} weight="duotone" />
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
