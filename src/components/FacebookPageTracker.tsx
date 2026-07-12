import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export default function FacebookPageTracker() {
  // Récupère l’état complet du routeur
  const routerState = useRouterState();

  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [routerState.location.pathname]); // se déclenche à chaque changement de chemin

  return null;
}