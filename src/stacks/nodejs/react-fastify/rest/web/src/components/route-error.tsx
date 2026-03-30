import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected routing error occurred.";
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <main className="route-feedback route-feedback--error" role="alert">
      <h1>Unable to load this page</h1>
      <p>{message}</p>
      <div className="route-feedback__actions">
        <Link to="/">Back to portal home</Link>
        <button
          type="button"
          className="route-feedback__button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload page
        </button>
      </div>
    </main>
  );
}
