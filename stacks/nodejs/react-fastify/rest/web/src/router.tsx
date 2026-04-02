import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "./components/route-error";
import { RouteLoading } from "./components/route-loading";

const HomePage = lazy(async () => {
  const module = await import("./routes/home-page");
  return { default: module.HomePage };
});

const StatusPage = lazy(async () => {
  const module = await import("./routes/status-page");
  return { default: module.StatusPage };
});

function HomeRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <HomePage />
    </Suspense>
  );
}

function StatusRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <StatusPage />
    </Suspense>
  );
}

function RootErrorBoundary() {
  return <RouteErrorBoundary />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRoute />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/status",
    element: <StatusRoute />,
    errorElement: <RootErrorBoundary />,
  },
]);
