import type { ReactNode } from "react";
import CookieBanner from "./CookieBanner";

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
