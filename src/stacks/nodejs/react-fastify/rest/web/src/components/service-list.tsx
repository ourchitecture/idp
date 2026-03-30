import type { PortalSummary } from "../lib/api-client";

type ServiceListProps = {
  services: PortalSummary["services"];
};

function toTone(status: "healthy" | "degraded"): "healthy" | "degraded" {
  return status;
}

export function ServiceList({ services }: ServiceListProps) {
  return (
    <div className="service-list">
      {services.map((service) => (
        <article key={service.id} className="service-item">
          <div>
            <h3>{service.label}</h3>
            <p>{service.id}</p>
          </div>
          <div className={`service-state service-state--${toTone(service.status)}`}>
            <span>{service.status}</span>
            <small>{service.latencyMs} ms</small>
          </div>
        </article>
      ))}
    </div>
  );
}
