import type { ReactNode } from "react";

type StatusTone = "healthy" | "degraded" | "neutral";

type StatusCardProps = {
  title: string;
  value: string;
  subtitle: string;
  tone?: StatusTone;
  icon?: ReactNode;
};

export function StatusCard({
  title,
  value,
  subtitle,
  tone = "neutral",
  icon,
}: StatusCardProps) {
  return (
    <article className={`status-card status-card--${tone}`} aria-label={`${title}: ${value}`}>
      <header className="status-card__header">
        <h2>{title}</h2>
        {icon ?? null}
      </header>
      <p className="status-card__value">{value}</p>
      <p className="status-card__subtitle">{subtitle}</p>
    </article>
  );
}
