import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import styles from "./index.module.css";

function HomepageHero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/architecture/decisions/"
            style={{ marginLeft: "1rem" }}
          >
            Architecture Decisions
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Stemix — An AI-native Intelligent Development System with an Intent-Driven Portal"
    >
      <HomepageHero />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <div className={clsx("col col--4", styles.feature)}>
                <h3>Secure by Default</h3>
                <p>
                  Zero-trust, encrypted at rest and in transit, least privilege
                  everywhere.
                </p>
              </div>
              <div className={clsx("col col--4", styles.feature)}>
                <h3>AI-First and MCP-First</h3>
                <p>
                  AI capabilities are core to the platform. Model Context
                  Protocol is the standard AI integration layer.
                </p>
              </div>
              <div className={clsx("col col--4", styles.feature)}>
                <h3>Container-First</h3>
                <p>
                  All services are designed for container deployment from day
                  one, with self-hosting and multi-tenant SaaS both supported.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
