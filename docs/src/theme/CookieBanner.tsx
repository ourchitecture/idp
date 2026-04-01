import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "@docusaurus/Link";
import { disableGA } from "../analytics/ga";
import { initClarity } from "../analytics/clarity";

const CONSENT_KEY = "stemix_cookie_consent";

export default function CookieBanner(): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "declined") {
      disableGA();
    }
    if (stored === "accepted") {
      initClarity();
    }
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  function accept(): void {
    localStorage.setItem(CONSENT_KEY, "accepted");
    initClarity();
    setVisible(false);
  }

  function decline(): void {
    localStorage.setItem(CONSENT_KEY, "declined");
    disableGA();
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
