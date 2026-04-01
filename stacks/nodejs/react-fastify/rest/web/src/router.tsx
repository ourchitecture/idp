import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "./components/route-error";
import { RouteLoading } from "./components/route-loading";

const HomePage = lazy(async () => {
  const module = await import("./routes/home-page");
  return { default: module.HomePage };
});

function HomeRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <HomePage />
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
]);
