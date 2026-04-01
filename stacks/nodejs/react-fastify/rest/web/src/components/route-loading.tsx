export function RouteLoading() {
  return (
    <main className="route-feedback" role="status" aria-live="polite">
      <p className="route-feedback__label">Loading portal...</p>
      <div className="route-feedback__bar" aria-hidden="true" />
    </main>
  );
}
