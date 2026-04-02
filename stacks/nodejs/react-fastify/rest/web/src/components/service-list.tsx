import type { PortalSummary } from "../lib/api-client";

type ServiceListProps = {
  components: PortalSummary["components"];
};

function toTone(status: "healthy" | "degraded"): "healthy" | "degraded" {
  return status;
}

export function ServiceList({ components }: ServiceListProps) {
  return (
    <div className="service-list">
      {components.map((service) => (
        <article key={service.id} className="service-item">
          <div>
            <h3>{service.label}</h3>
            <p>{service.id} - observed {new Date(service.observedAt).toLocaleTimeString()}</p>
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
