import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "@docusaurus/Link";

const CONSENT_KEY = "stemix_cookie_consent";
// GA4 opt-out window flag — must be set before the analytics script fires
const GA_DISABLE_KEY = "ga-disable-G-DF7EEF2WEZ";

function disableAnalytics(): void {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = true;
  }
}

function CookieBanner(): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "declined") {
      disableAnalytics();
    }
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  function accept(): void {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline(): void {
    localStorage.setItem(CONSENT_KEY, "declined");
    disableAnalytics();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <p className="cookie-banner__text">
        This site uses cookies and analytics to understand how visitors use it.
        See our{" "}
        <Link to="/privacy" className="cookie-banner__link">
          Privacy Policy
        </Link>{" "}
        for details.
      </p>
      <div className="cookie-banner__actions">
        <button
          type="button"
          onClick={decline}
          className="cookie-banner__btn cookie-banner__btn--secondary"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={accept}
          className="cookie-banner__btn cookie-banner__btn--primary"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

interface RootProps {
  readonly children: ReactNode;
}

export default function Root({ children }: RootProps): ReactNode {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  );
}
