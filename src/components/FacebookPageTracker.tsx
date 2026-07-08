import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import ReactPixel from "@/lib/facebookPixel";

export function FacebookPageTracker() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    ReactPixel.pageView();
  }, [pathname]);

  return null;
}