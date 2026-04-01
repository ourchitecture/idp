export function HomePage() {
  return (
    <main className="portal-shell">
      <header className="portal-hero">
        <p className="portal-kicker">
          Stemix
          <span className="portal-badge">Early Alpha</span>
        </p>
        <h1>The development experience<br />is being reimagined.</h1>
        <p className="portal-subtitle">
          Stemix is an AI-native Intelligent Development System — connecting product intent
          to engineering reality through a secure, extensible, self-hosted platform. We're
          still building. What you're looking at is a pre-release reference stack; much
          more work lies ahead.
        </p>
      </header>

      <section className="status-grid" aria-label="Capabilities in development">
        <article className="status-card">
          <div className="feature-icon">🎯</div>
          <h2 className="status-card__value">Intent-Driven Portal</h2>
          <p className="status-card__subtitle">
            Translate high-level product decisions into actionable engineering work.
            Automatically surface gaps between intent and implementation.
          </p>
        </article>
        <article className="status-card">
          <div className="feature-icon">🤖</div>
          <h2 className="status-card__value">AI &amp; MCP-First</h2>
          <p className="status-card__subtitle">
            Model Context Protocol as the standard AI integration layer. AI capabilities
            built in from day one — not bolted on as an afterthought.
          </p>
        </article>
        <article className="status-card">
          <div className="feature-icon">🔒</div>
          <h2 className="status-card__value">Secure by Default</h2>
          <p className="status-card__subtitle">
            Zero-trust architecture. Encrypted at rest and in transit. Least privilege
            everywhere. Security is never optional.
          </p>
        </article>
        <article className="status-card">
          <div className="feature-icon">🏠</div>
          <h2 className="status-card__value">Self-Service Hosting</h2>
          <p className="status-card__subtitle">
            Run the full platform privately, on your own infrastructure, with minimal
            operational overhead and no vendor lock-in.
          </p>
        </article>
        <article className="status-card">
          <div className="feature-icon">🔌</div>
          <h2 className="status-card__value">Extensible Plug-ins</h2>
          <p className="status-card__subtitle">
            Clear contracts, sandboxed execution, and a plug-in SDK to extend the platform
            without touching core systems.
          </p>
        </article>
        <article className="status-card">
          <div className="feature-icon">🏢</div>
          <h2 className="status-card__value">Multi-Tenant Ready</h2>
          <p className="status-card__subtitle">
            Strong tenant isolation with options for dedicated physical infrastructure and
            flexible multi-tenant SaaS deployment modes.
          </p>
        </article>
      </section>

      <footer className="service-panel" role="note">
        <p className="empty-state">
          This is a pre-release alpha reference stack. Contracts, APIs, and UI are actively
          evolving — expect breaking changes between releases. Not production-ready. Follow
          progress and explore the architecture at{" "}
          <a href="https://stemix.dev" rel="noopener noreferrer" className="portal-link">
            stemix.dev
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
