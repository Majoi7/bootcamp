// src/routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Clé publique VAPID (générée avec `npx web-push generate-vapid-keys`).
// Doit correspondre à la clé PRIVÉE configurée côté edge function Supabase.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Met à jour le badge numérique sur l'icône de l'app PWA (comme sur
// WhatsApp/Gmail) via la Badging API. Non supportée partout (surtout hors
// PWA installée), donc on échoue silencieusement si l'API est absente.
function updateAppBadge(count: number) {
  if (!("setAppBadge" in navigator)) return;
  try {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else if ("clearAppBadge" in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  } catch {
    // Badging API indisponible sur ce navigateur/appareil : on ignore.
  }
}

// Active les notifications push pour ce téléphone : demande la permission,
// s'abonne via le Service Worker, puis enregistre l'abonnement dans Supabase
// (lié au participant courant) pour que l'admin puisse le notifier.
async function subscribeToPush(participantId: string): Promise<{ ok: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Les notifications ne sont pas supportées sur cet appareil/navigateur." };
  }
  if (!("Notification" in window)) {
    // Cas très fréquent sur iPhone : Safari (hors PWA installée) n'expose
    // même pas l'API Notification. Avant, ça faisait planter la fonction
    // avec un message générique et incompréhensible pour l'utilisateur.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return {
      ok: false,
      error: isIOS
        ? "Sur iPhone, installe d'abord l'application (Partager → Sur l'écran d'accueil), puis réessaie depuis l'app installée."
        : "Les notifications ne sont pas supportées sur ce navigateur.",
    };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: "Configuration des notifications manquante (VITE_VAPID_PUBLIC_KEY)." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Permission refusée. Active les notifications dans les réglages de ton téléphone." };
    }

    // navigator.serviceWorker.ready ne se résout QUE si un service worker a
    // déjà été enregistré quelque part dans l'app. On force l'enregistrement
    // ici (idempotent : si déjà enregistré, ça ne fait rien de plus) pour ne
    // jamais rester bloqué indéfiniment sur cette ligne.
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
    } catch (regErr: any) {
      console.error("Erreur enregistrement service worker:", regErr);
      return { ok: false, error: "Impossible d'enregistrer le service worker." };
    }
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      } catch (subErr: any) {
        console.error("Erreur pushManager.subscribe:", subErr);
        return { ok: false, error: `Échec de l'abonnement push: ${subErr?.message || subErr}` };
      }
    }

    const json = subscription.toJSON();
    const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
      {
        participant_id: participantId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
      { onConflict: "endpoint" }
    );

    if (upsertError) {
      console.error("Erreur enregistrement abonnement push (Supabase):", upsertError);
      return { ok: false, error: `Échec de l'enregistrement: ${upsertError.message}` };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Erreur abonnement notifications:", err);
    return { ok: false, error: "Impossible d'activer les notifications pour l'instant." };
  }
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Mon Dashboard — Amphix Bootcamp" },
      { name: "description", content: "Dashboard participant du Bootcamp Amphix 2026." },
      { name: "theme-color", content: "#4f46e5" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192x192.png" },
    ],
  }),
});

/* ─── Types ─── */
interface User {
  id: string;
  nom: string;
  prenoms: string;
  whatsapp: string;
  niveau_etudes: string;
  paye: boolean;
  montant_paye: number;
  photo_url: string | null;
}

interface Cours {
  id: string;
  titre: string;
  description: string | null;
  couleur: string;
}

interface Professeur {
  id: string;
  nom: string;
  prenoms: string | null;
  specialite: string | null;
}

interface Session {
  id: string;
  cours_id: string;
  professeur_id: string | null;
  date: string;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  description: string | null;
  cours?: Cours;
  professeur?: Professeur;
}

interface Enregistrement {
  id: string;
  cours_id: string | null;
  professeur_id: string | null;
  titre: string;
  lien: string;
  date: string;
  description: string | null;
  cours?: Cours;
  professeur?: Professeur;
}

type DashboardTab = "calendrier" | "cours" | "messagerie" | "parametres";

// Formate une date en "YYYY-MM-DD" en utilisant les composants LOCAUX
// (jamais toISOString(), qui convertit en UTC et peut décaler la date
// d'un jour selon le fuseau horaire — c'est ce qui causait le bug où
// un cours du samedi s'affichait le dimanche).
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ─── Icônes SVG professionnelles ─── */
function IconCalendar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBook({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconSettings({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconMessage({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconSend({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconClock({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUser({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconVideo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconMega({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3l9 8h-3v9h-4v-6H10v6H6v-9H3z" />
    </svg>
  );
}

function IconChevronLeft({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCheckDouble({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="18 6 7 17 2 12" />
      <polyline points="22 10 13 19 10 16" />
    </svg>
  );
}

function IconChevronRight({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconGraduation({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5" />
    </svg>
  );
}

function IconWallet({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}

function IconLogout({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconLock({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconX({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ─── PWA Install Prompt ─── */
/* ─── PWA Install Prompt ─── */
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifie si déjà installé (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Vérifie si l'app est installée via iOS
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Si déjà installé, ne montre rien
  if (isInstalled) return null;

  // Si le navigateur ne supporte pas l'installation (iOS Safari par ex)
  // On montre un guide manuel
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);


  // Si pas de prompt disponible et pas iOS, ne montre rien
  
}

/* ─── TAB: CALENDRIER ─── */
/* ─── TAB: CALENDRIER (5 jours centrés) ─── */
function CalendrierTab({ sessions, user }: { sessions: Session[]; user: User }) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [now, setNow] = useState(new Date());

  const dayPillRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const swipeAreaRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchLocked = useRef<boolean | null>(null);

  // Horloge vivante
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Fenêtre de 5 jours glissante ──
  const [windowStart, setWindowStart] = useState<Date>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 2); // aujourd'hui à l'index 2
    return start;
  });

  // 5 jours visibles
  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [windowStart]);

  // Index du jour sélectionné (0‑4)
  const [selectedDay, setSelectedDay] = useState(2); // 2 = aujourd'hui au départ

  // Re‑centrer sur aujourd'hui
  const centerOnToday = () => {
    const today = new Date();
    const newStart = new Date(today);
    newStart.setDate(today.getDate() - 2);
    setWindowStart(newStart);
    setSelectedDay(2);
  };

  // Minuit → re‑centrage automatique (temps réel)
  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();
    const timer = setTimeout(centerOnToday, msToMidnight + 1_000);
    return () => clearTimeout(timer);
  }, [windowStart]); // se relance si la fenêtre change

  // Déplacer la fenêtre de `steps` jours
  const shiftWindow = (steps: number) => {
    setWindowStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + steps);
      return next;
    });
    // Ajuste la sélection si elle sort de la fenêtre (reste entre 0 et 4)
    setSelectedDay((prev) => {
      const newIdx = prev - steps; // quand on décale la fenêtre, l'index apparent bouge
      // On force dans [0,4] (la fenêtre a 5 jours)
      return Math.max(0, Math.min(4, newIdx));
    });
  };

  // Navigation jour par jour (glissement / swipe)
  const goToAdjacentDay = (direction: 1 | -1) => {
    const nextIdx = selectedDay + direction;
    if (nextIdx >= 0 && nextIdx <= 4) {
      // Dans la fenêtre actuelle
      setSlideDir(direction === 1 ? "left" : "right");
      setSelectedDay(nextIdx);
    } else {
      // Dépasse → on décale la fenêtre d’un jour et on garde l’index au bord
      setSlideDir(direction === 1 ? "left" : "right");
      shiftWindow(direction); // décale de 1 jour
      // selectedDay restera le même (le shiftWindow l’a déjà ré‑indexé)
    }
  };

  // ── Rendu des jours / sessions ──
  const joursSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const joursComplets = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  // Formate une date en "YYYY-MM-DD" en heure locale (voir toLocalDateStr en haut du fichier)
  const sessionsParJour = useMemo(() => {
    return visibleDays.map((jourDate) => {
      const dateStr = toLocalDateStr(jourDate);
      return sessions.filter((s) => s.date === dateStr);
    });
  }, [sessions, visibleDays]);

  const sessionsDuJour = useMemo(
    () =>
      (sessionsParJour[selectedDay] || [])
        .slice()
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
    [sessionsParJour, selectedDay]
  );

  const isTodayDate = (d: Date) => new Date().toDateString() === d.toDateString();

  // ── Grille desktop ──
  const HEURE_DEBUT = 8;
  const HEURE_FIN = 21;
  const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => i + HEURE_DEBUT);
  const HAUTEUR_HEURE = 64;
  const HAUTEUR_GRILLE = (HEURE_FIN - HEURE_DEBUT) * HAUTEUR_HEURE;

  const minutesOf = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Ligne "maintenant" si aujourd'hui est dans la fenêtre
  const nowOffsetPx = useMemo(() => {
    const today = new Date();
    const idx = visibleDays.findIndex((d) => isTodayDate(d));
    if (idx === -1) return null;
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minMin = HEURE_DEBUT * 60;
    const maxMin = HEURE_FIN * 60;
    if (minutesNow < minMin || minutesNow > maxMin) return null;
    return ((minutesNow - minMin) / 60) * HAUTEUR_HEURE;
  }, [now, visibleDays]);

  const slideClass =
    slideDir === "left"
      ? "animate-slide-in-left"
      : slideDir === "right"
        ? "animate-slide-in-right"
        : "animate-fade-in";

  // ── Gestures tactiles ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchLocked.current = null;
  };

  useEffect(() => {
    const el = swipeAreaRef.current;
    if (!el) return;
    const onTouchMoveNative = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (touchLocked.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        touchLocked.current = Math.abs(dx) > Math.abs(dy);
      }
      if (touchLocked.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMoveNative, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMoveNative);
  }, []);

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !touchLocked.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const SEUIL = 45;
    if (dx <= -SEUIL) goToAdjacentDay(1);
    else if (dx >= SEUIL) goToAdjacentDay(-1);
    touchStartX.current = null;
    touchStartY.current = null;
    touchLocked.current = null;
  };

  // ── UI ──
  return (
    <div className="space-y-4 animate-fade-in">
      <style>{`
        @keyframes calSlideInLeft { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes calSlideInRight { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in-left { animation: calSlideInLeft 0.22s ease-out; }
        .animate-slide-in-right { animation: calSlideInRight 0.22s ease-out; }
      `}</style>

      {/* En‑tête */}
      <div className="flex items-center justify-between gap-2">
        <div key={visibleDays[0].toISOString()} className="animate-fade-in min-w-0 flex-1">
          <h2 className="font-display text-lg sm:text-xl font-bold truncate">Mon emploi du temps</h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {visibleDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            {" — "}
            {visibleDays[4].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={centerOnToday}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all whitespace-nowrap"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => shiftWindow(-5)}
            className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-all flex-shrink-0"
            aria-label="5 jours précédents"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => shiftWindow(5)}
            className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-all flex-shrink-0"
            aria-label="5 jours suivants"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sélecteur de jour mobile (5 pastilles) */}
      <div className="lg:hidden relative -mx-4">
        <div
          className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
          }}
        >
          {visibleDays.map((jourDate, i) => {
            const isToday = isTodayDate(jourDate);
            const isSelected = selectedDay === i;
            const count = (sessionsParJour[i] || []).length;
            const jour = joursSemaine[jourDate.getDay() === 0 ? 6 : jourDate.getDay() - 1];

            return (
              <button
                key={i}
                ref={(el) => (dayPillRefs.current[i] = el)}
                onClick={() => {
                  setSlideDir(i > selectedDay ? "left" : i < selectedDay ? "right" : null);
                  setSelectedDay(i);
                }}
                className={[
                  "snap-center flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[52px] transition-all duration-200",
                  isSelected
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                    : isToday
                      ? "bg-primary/10 text-primary"
                      : "bg-card border border-border text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                <span className="text-[10px] font-semibold uppercase">{jour}</span>
                <span className="text-lg font-bold">{jourDate.getDate()}</span>
                {count > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${isSelected ? "bg-white" : "bg-primary"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des cours du jour (mobile) – scrollable si beaucoup */}
      <div
        ref={swipeAreaRef}
        className="lg:hidden space-y-3 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div key={`${visibleDays[0].toISOString()}-${selectedDay}`} className={slideClass}>
          {sessionsDuJour.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <IconCalendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Aucun cours ce jour</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Profitez de votre temps libre !</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {sessionsDuJour.map((session) => {
                const isSelectedDayToday = isTodayDate(
                  new Date(visibleDays[selectedDay].getFullYear(), visibleDays[selectedDay].getMonth(), visibleDays[selectedDay].getDate())
                );
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const debutMin = minutesOf(session.heure_debut);
                const finMin = minutesOf(session.heure_fin);
                const enCours = isSelectedDayToday && nowMin >= debutMin && nowMin < finMin;
                const bientot = isSelectedDayToday && !enCours && debutMin - nowMin > 0 && debutMin - nowMin <= 30;

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="bg-card rounded-2xl border border-border p-4 shadow-soft active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1.5 h-12 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: session.cours?.couleur || "#3b82f6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm truncate min-w-0 flex-1">
                            {session.cours?.titre}
                          </h3>
                          {enCours ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              En cours
                            </span>
                          ) : bientot ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Bientôt
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md flex-shrink-0">
                              {session.heure_debut}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.heure_debut} — {session.heure_fin}
                        </p>
                        {session.professeur && (
                          <div className="flex items-center gap-1.5 mt-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {session.professeur.prenoms?.[0] || session.professeur.nom[0]}
                            </div>
                            <span className="text-xs text-muted-foreground truncate min-w-0">
                              {session.professeur.prenoms} {session.professeur.nom}
                            </span>
                          </div>
                        )}
                      </div>
                      <IconChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground/50 pt-1">← glissez pour changer de jour →</p>
      </div>

      {/* Grille desktop (5 colonnes de jours) */}
      <div
        key={visibleDays[0].toISOString()}
        className="hidden lg:block bg-card rounded-2xl border border-border shadow-soft overflow-hidden animate-fade-in"
      >
        <div className="overflow-auto scrollbar-hide max-h-[calc(100vh-260px)]">
          <div className="min-w-[750px]">
            <div className="grid grid-cols-6 border-b border-border sticky top-0 z-10 bg-card">
              <div className="p-3 text-xs font-semibold text-muted-foreground border-r border-border bg-muted/30 flex items-center justify-center">
                Heure
              </div>
              {visibleDays.map((jourDate, i) => {
                const isToday = isTodayDate(jourDate);
                const jour =
                  joursComplets[jourDate.getDay() === 0 ? 6 : jourDate.getDay() - 1];
                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-r border-border last:border-r-0 transition-colors ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div
                      className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {jour}
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 ${isToday ? "text-primary inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white" : "text-foreground"}`}
                    >
                      {jourDate.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-6 relative" style={{ height: HAUTEUR_GRILLE }}>
              {/* Colonne des heures */}
              <div className="relative border-r border-border bg-muted/20">
                {heures.map((heure) => (
                  <div
                    key={heure}
                    className="absolute left-0 right-0 flex items-start justify-center text-xs text-muted-foreground pt-1 border-t border-border/50 first:border-t-0"
                    style={{ top: (heure - HEURE_DEBUT) * HAUTEUR_HEURE, height: HAUTEUR_HEURE }}
                  >
                    {heure.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {visibleDays.map((jourDate, idx) => {
                const isToday = isTodayDate(jourDate);
                const sessionsJour = (sessionsParJour[idx] || []).filter((s) => s.cours);
                return (
                  <div
                    key={idx}
                    className={`relative border-r border-border last:border-r-0 ${isToday ? "bg-primary/[0.03]" : ""}`}
                  >
                    {heures.map((heure) => (
                      <div
                        key={heure}
                        className="absolute left-0 right-0 border-t border-border/50 first:border-t-0 hover:bg-muted/20 transition-colors"
                        style={{ top: (heure - HEURE_DEBUT) * HAUTEUR_HEURE, height: HAUTEUR_HEURE }}
                      />
                    ))}
                    {isToday && nowOffsetPx !== null && (
                      <div
                        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                        style={{ top: nowOffsetPx }}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <span className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    )}
                    {sessionsJour.map((session) => {
                      const debutMin = minutesOf(session.heure_debut);
                      const finMin = minutesOf(session.heure_fin);
                      const top = ((debutMin - HEURE_DEBUT * 60) / 60) * HAUTEUR_HEURE;
                      const height = Math.max(28, ((finMin - debutMin) / 60) * HAUTEUR_HEURE - 4);
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className="absolute left-1 right-1 rounded-xl px-2 py-1.5 text-left transition-all duration-150 hover:brightness-105 hover:shadow-md hover:z-10 active:scale-[0.98] text-xs overflow-hidden"
                          style={{
                            top,
                            height,
                            backgroundColor: session.cours!.couleur + "1f",
                            borderLeft: `3px solid ${session.cours!.couleur}`,
                          }}
                        >
                          <div
                            className="font-bold leading-tight truncate"
                            style={{ color: session.cours!.couleur }}
                          >
                            {session.cours!.titre}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[10px] truncate">
                            {session.heure_debut} — {session.heure_fin}
                          </div>
                          {height > 55 && session.professeur && (
                            <div className="text-muted-foreground text-[10px] mt-0.5 truncate">
                              {session.professeur.prenoms} {session.professeur.nom}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal détail (inchangée, mais indépendante) */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl w-full sm:max-w-md sm:w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-5 sm:p-6 text-white relative rounded-t-3xl sm:rounded-t-2xl"
              style={{ backgroundColor: selectedSession.cours?.couleur || "#3b82f6" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium opacity-80 mb-1">
                    {
                      joursComplets[
                        new Date(selectedSession.date).getDay() === 0
                          ? 6
                          : new Date(selectedSession.date).getDay() - 1
                      ]
                    }
                  </div>
                  <h3 className="font-display text-lg font-bold break-words">
                    {selectedSession.cours?.titre}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:scale-90 transition-all flex-shrink-0"
                >
                  <IconX className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm opacity-90">
                <span className="flex items-center gap-1">
                  <IconClock className="w-4 h-4" />
                  {selectedSession.heure_debut} — {selectedSession.heure_fin}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {selectedSession.professeur && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-sm">
                    {selectedSession.professeur.prenoms?.[0] ||
                      selectedSession.professeur.nom[0]}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Professeur</div>
                    <div className="font-semibold text-sm">
                      {selectedSession.professeur.prenoms} {selectedSession.professeur.nom}
                    </div>
                    {selectedSession.professeur.specialite && (
                      <div className="text-xs text-muted-foreground">
                        {selectedSession.professeur.specialite}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSession.description && (
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <div className="text-sm leading-relaxed">{selectedSession.description}</div>
                </div>
              )}

              {selectedSession.salle ? (
                <a
                  href={selectedSession.salle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3.5 font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
                  style={{ backgroundColor: selectedSession.cours?.couleur || "#3b82f6" }}
                >
                  <IconVideo className="w-5 h-5" />
                  Rejoindre le cours
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3.5 font-semibold text-sm bg-muted text-muted-foreground">
                  <IconClock className="w-5 h-5" />
                  Lien de réunion non disponible
                </div>
              )}

              <button
                onClick={() => setSelectedSession(null)}
                className="w-full rounded-xl bg-muted text-foreground px-4 py-3 font-semibold text-sm hover:bg-muted/80 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── TAB: MES COURS (enregistrements Google Meet) ─── */
// Extrait l'ID d'une vidéo YouTube depuis différents formats d'URL possibles
// (watch?v=, youtu.be/, embed/, live/) pour générer sa miniature officielle.
function getYouTubeThumbnail(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  }
  return null;
}

// Détecte la plateforme d'hébergement du lien (YouTube, MEGA, ou autre)
// pour adapter l'affichage (miniature, badge).
type Platform = "youtube" | "mega" | "other";
function getPlatform(url: string): Platform {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/mega\.(?:nz|co\.nz)/i.test(url)) return "mega";
  return "other";
}

function CoursTab({ enregistrements }: { enregistrements: Enregistrement[] }) {
  const [search, setSearch] = useState("");
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");

  // Liste unique des professeurs présents dans les enregistrements
  const professeurs = useMemo(() => {
    const map = new Map<string, Professeur>();
    enregistrements.forEach((rec) => {
      if (rec.professeur) map.set(rec.professeur.id, rec.professeur);
    });
    return Array.from(map.values());
  }, [enregistrements]);

  const filtres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enregistrements.filter((rec) => {
      const matchSearch =
        !q ||
        rec.titre.toLowerCase().includes(q) ||
        rec.description?.toLowerCase().includes(q) ||
        rec.cours?.titre.toLowerCase().includes(q) ||
        rec.professeur?.nom.toLowerCase().includes(q);
      const matchProf = !selectedProfId || rec.professeur?.id === selectedProfId;
      const matchDate = !dateFilter || rec.date === dateFilter;
      return matchSearch && matchProf && matchDate;
    });
  }, [enregistrements, search, selectedProfId, dateFilter]);

  const hasActiveFilters = !!search || !!selectedProfId || !!dateFilter;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold">Mes cours</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {enregistrements.length} enregistrement{enregistrements.length > 1 ? "s" : ""} disponible{enregistrements.length > 1 ? "s" : ""}
        </p>
      </div>

      {enregistrements.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cours enregistré..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"
          />
        </div>
      )}

      {/* Filtre par professeur */}
      {professeurs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setSelectedProfId(null)}
            className={[
              "flex-shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
              !selectedProfId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              👥
            </span>
            Tous
          </button>
          {professeurs.map((prof) => {
            const isActive = selectedProfId === prof.id;
            return (
              <button
                key={prof.id}
                onClick={() => setSelectedProfId(isActive ? null : prof.id)}
                className={[
                  "flex-shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-gradient-ocean text-white"}`}
                >
                  {prof.prenoms?.[0] || prof.nom[0]}
                </span>
                {prof.prenoms} {prof.nom}
              </button>
            );
          })}
        </div>
      )}

      {/* Filtre par date */}
      {enregistrements.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedProfId(null);
                setDateFilter("");
              }}
              className="flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {filtres.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <IconVideo className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {enregistrements.length === 0 ? "Aucun cours enregistré pour l'instant" : "Aucun résultat pour ces filtres"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {enregistrements.length === 0 ? "Les replays de vos sessions apparaîtront ici." : "Essayez d'ajuster la recherche, le professeur ou la date."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtres.map((rec) => {
            const couleur = rec.cours?.couleur || "#3b82f6";
            const platform = getPlatform(rec.lien);
            const thumbnail = platform === "youtube" ? getYouTubeThumbnail(rec.lien) : null;
            return (
              <a
                key={rec.id}
                href={rec.lien}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-2xl border border-border overflow-hidden shadow-soft active:scale-[0.98] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Miniature vidéo (YouTube ou MEGA) */}
                <div className="relative w-full aspect-video bg-muted overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={rec.titre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : platform === "mega" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ backgroundColor: "#d9272e20", color: "#d9272e" }}>
                      <IconMega className="w-8 h-8" />
                      <span className="text-[10px] font-bold tracking-wide">MEGA</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: couleur + "20", color: couleur }}>
                      <IconVideo className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 ml-0.5" fill={couleur} viewBox="0 0 24 24">
                        <polygon points="6 4 20 12 6 20 6 4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {rec.cours && (
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                      style={{ backgroundColor: couleur + "1a", color: couleur }}
                    >
                      {rec.cours.titre}
                    </span>
                  )}
                  <h3 className="font-bold text-sm leading-snug truncate">{rec.titre}</h3>
                  {rec.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(rec.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {rec.professeur && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {rec.professeur.prenoms?.[0] || rec.professeur.nom[0]}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {rec.professeur.prenoms} {rec.professeur.nom}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Hash de mot de passe (identique à connexion.tsx) ─── */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hashBuffer));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Carte : changer de mot de passe ─── */
function ChangePasswordCard({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const NUMERO_SUPPORT = "22946244549";
  const lienMotDePasseOublie = `https://wa.me/${NUMERO_SUPPORT}?text=${encodeURIComponent("Bonjour, j'ai oublié mon mot de passe.")}`;

  const resetFields = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const toggleOpen = () => {
    if (open) resetFields();
    setSuccess(false);
    setOpen(!open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const newHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from("participants")
      .update({ password_hash: newHash })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      setError("Une erreur est survenue lors de la mise à jour. Réessayez.");
      return;
    }

    resetFields();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
    }, 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center gap-3 p-5 hover:bg-muted/40 transition text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <IconLock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Changer le mot de passe</h3>
          <p className="text-xs text-muted-foreground">Sécurisez l'accès à votre compte</p>
        </div>
        <IconChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 animate-fade-in border-t border-border pt-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mot de passe mis à jour avec succès.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                tabIndex={-1}
              >
                {showNew ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Confirmer le nouveau mot de passe</label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-ocean text-primary-foreground px-4 py-3 font-bold text-sm shadow-md hover:brightness-105 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </button>

          <a
            href={lienMotDePasseOublie}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition pt-1"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.04 21.785h-.005a9.87 9.87 0 01-5.031-1.378l-.36-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.52 3.449C18.24 1.245 15.187 0 11.936 0 5.65 0 .48 5.44.472 12.13a12.02 12.02 0 001.611 6.011L.312 24l6.007-1.579a12.13 12.13 0 005.617 1.418h.005c6.256 0 11.398-5.44 11.4-12.13 0-3.24-1.263-6.293-3.55-8.596" />
            </svg>
            Mot de passe oublié ?
          </a>
        </form>
      )}
    </div>
  );
}

/* ─── TAB: PARAMÈTRES ─── */
function ParametresTab({
  user,
  onLogout,
  onUserUpdate,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdate: (patch: Partial<User>) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      // Propose l'activation des notifications juste après l'installation
      handleEnableNotifications();
    }
    setInstallPrompt(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Notifications push
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "enabled" | "error">("idle");
  const [notifError, setNotifError] = useState("");

  // Avant : le statut repartait toujours à "idle" au montage du composant,
  // donc le bouton "Activer les notifications" réapparaissait même quand
  // elles étaient déjà actives (ex: en revenant sur Paramètres). On vérifie
  // maintenant le véritable état (permission + abonnement actif) au chargement.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled && subscription) setNotifStatus("enabled");
      } catch {
        // On laisse le statut à "idle" : l'utilisateur pourra retenter manuellement.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnableNotifications = async () => {
    setNotifStatus("loading");
    setNotifError("");
    const result = await subscribeToPush(user.id);
    if (result.ok) {
      setNotifStatus("enabled");
    } else {
      setNotifStatus("error");
      setNotifError(result.error || "Échec de l'activation.");
    }
  };

  // Changement de la photo de profil : upload vers Supabase Storage
  // (bucket public "avatars"), puis mise à jour de la ligne participant.
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier plus tard
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Merci de choisir une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("L'image doit faire moins de 5 Mo.");
      return;
    }

    setPhotoError("");
    setUploadingPhoto(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const photoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("participants")
        .update({ photo_url: photoUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      onUserUpdate({ photo_url: photoUrl });
    } catch (err: any) {
      console.error("Erreur changement photo de profil:", err);
      setPhotoError(err?.message || "Échec de l'envoi. Réessaie dans un instant.");
    } finally {
      setUploadingPhoto(false);
    }
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold">Paramètres</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gérez votre compte</p>
      </div>

      {/* Profil card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Changer la photo de profil"
              className="relative w-14 h-14 rounded-2xl bg-gradient-ocean flex items-center justify-center text-white font-display font-bold text-xl overflow-hidden group"
            >
              {user.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <>{user.prenoms[0]}{user.nom[0]}</>
              )}

              {/* Overlay caméra au survol / pendant l'upload */}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                  uploadingPhoto ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {uploadingPhoto ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">{user.prenoms} {user.nom}</h3>
            <p className="text-xs text-muted-foreground">{user.whatsapp}</p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-[11px] font-semibold text-primary mt-1 hover:underline"
            >
              Changer la photo
            </button>
          </div>
        </div>
        {photoError && <p className="text-xs text-red-500 mt-3">{photoError}</p>}

        <div className="mt-4 space-y-3">
          {[
            { icon: <IconGraduation className="w-5 h-5" />, label: "Niveau d'études", value: user.niveau_etudes },
            { icon: <IconWallet className="w-5 h-5" />, label: "Statut paiement", value: user.paye ? "Payé" : "Non payé", valueColor: user.paye ? "text-green-600" : "text-red-500" },
            { icon: <IconWallet className="w-5 h-5" />, label: "Montant payé", value: `${user.montant_paye.toLocaleString("fr-FR")} FCFA` },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3 text-muted-foreground">
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </div>
              <span className={`text-sm font-semibold ${item.valueColor || ""}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sécurité */}
      <ChangePasswordCard user={user} />

       {/* ─── INSTALLER LE PWA ─── */}
      {canInstall && (
        <div className="bg-primary rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm">Installer Amphix</h3>
              <p className="text-xs opacity-80">Accédez hors-ligne à vos cours</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="w-full rounded-xl bg-white text-primary px-4 py-3 font-bold text-sm hover:bg-white/90 transition active:scale-95"
          >
            📲 Installer l'application
          </button>
        </div>
      )}

      {/* iOS Guide */}
      {isIOS && !canInstall && !window.matchMedia('(display-mode: standalone)').matches && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
          <h3 className="font-bold text-sm mb-2">📱 Installer sur iPhone</h3>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Appuyez sur <strong>Partager</strong> en bas de Safari</li>
            <li>Faites défiler et tapez <strong>"Sur l'écran d'accueil"</strong></li>
            <li>Confirmez avec <strong>"Ajouter"</strong></li>
          </ol>
        </div>
      )}

      {/* ─── NOTIFICATIONS ─── */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">Sois prévenu(e) dès qu'un cours ou une info est publié</p>
          </div>
        </div>

        {notifStatus === "enabled" ? (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Notifications activées
          </div>
        ) : typeof Notification !== "undefined" && Notification.permission === "denied" ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            Les notifications ont été bloquées pour ce site. Pour les activer, va dans les réglages
            de ton navigateur (icône 🔒 ou ⓘ à côté de l'adresse) → Notifications → Autoriser.
          </p>
        ) : (
          <>
            <button
              onClick={handleEnableNotifications}
              disabled={notifStatus === "loading"}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-bold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
            >
              {notifStatus === "loading" ? "Activation..." : "🔔 Activer les notifications"}
            </button>
            {notifError && <p className="text-xs text-red-500 mt-2">{notifError}</p>}
          </>
        )}
      </div>

      {/* Déconnexion */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-4 py-4 font-semibold text-sm hover:bg-red-100 transition active:scale-95"
      >
        <IconLogout className="w-5 h-5" />
        Se déconnecter
      </button>

      {/* Confirm logout modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-2">Se déconnecter ?</h3>
            <p className="text-sm text-muted-foreground mb-6">Vous devrez vous reconnecter pour accéder à vos cours.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl bg-muted text-foreground px-4 py-3 font-semibold text-sm hover:bg-muted/80 transition"
              >
                Annuler
              </button>
              <button
                onClick={onLogout}
                className="flex-1 rounded-xl bg-red-600 text-white px-4 py-3 font-semibold text-sm hover:bg-red-700 transition"
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page Principale ─── */
/* ═══════════════════════════════════════════════════
   CLOCHE DE NOTIFICATIONS
   Affiche l'historique des messages envoyés par l'admin,
   avec badge "non lu" et mise à jour en temps réel.
   ═══════════════════════════════════════════════════ */
interface NotifRow {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const LAST_SEEN_KEY = "amphix_notif_last_seen";

function NotificationBell({ compact = false, onUnreadChange }: { compact?: boolean; onUnreadChange?: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const computeUnread = (list: NotifRow[]) => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (!lastSeen) return list.length;
    return list.filter((n) => new Date(n.created_at).getTime() > Number(lastSeen)).length;
  };

  const fetchNotifs = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) {
      setNotifs(data);
      const n = computeUnread(data);
      setUnreadCount(n);
      onUnreadChange?.(n);
    }
  };

  useEffect(() => {
    fetchNotifs();

    // Nom de canal unique à chaque montage : évite le conflit "cannot add
    // postgres_changes callbacks after subscribe()" que déclenche le Mode
    // Strict de React en dev (montage → démontage → remontage rapide, avec
    // removeChannel() qui est asynchrone et pas encore terminé).
    const channelName = `notifications_bell_${Math.random().toString(36).slice(2)}`;

    // Mise à jour en direct dès qu'une notification est envoyée par l'admin
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fermer au clic en dehors
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // On marque tout comme lu à l'ouverture
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      setUnreadCount(0);
      onUnreadChange?.(0);
    }
  };

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={togglePanel}
        aria-label="Notifications"
        className={
          compact
            ? "w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-foreground relative"
            : "w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition relative"
        }
      >
        <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Fond assombri — mobile uniquement, ferme le panneau au clic */}
          <div
            className="fixed inset-0 bg-black/30 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[85vw] max-w-none bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="sm:hidden w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto scrollbar-hide">
              {notifs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune notification pour l'instant.</p>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MESSAGERIE
   Liste de tous les participants (comme un annuaire) + fil de discussion
   1-à-1 en temps réel. Split-view sur desktop, navigation par écran plein
   sur mobile (liste puis conversation).
   ═══════════════════════════════════════════════════ */
interface ParticipantLite {
  id: string;
  nom: string;
  prenoms: string;
  photo_url: string | null;
  niveau_etudes: string;
  certifie: string | null;
}

interface ConversationRow {
  id: string;
  participant_a_id: string;
  participant_b_id: string;
  last_message: string | null;
  last_message_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

// Ordonne toujours la paire de la même façon (a < b) pour que la
// contrainte unique côté DB empêche les doublons de conversation.
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Petit badge "certifié" façon réseaux sociaux — affiché uniquement si
// participants.certifie === "oui".
function CertifiedBadge({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={`${className} text-primary shrink-0 inline-block align-middle`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Profil certifié"
    >
      <path d="M12 2l2.4 2.1 3.1-.7.9 3 2.8 1.5-.7 3.1 1.6 2.8-2.4 2.1.3 3.2-3.2.3-1.7 2.7L12 21l-2.9 1.1-1.7-2.7-3.2-.3.3-3.2-2.4-2.1L3.7 11 3 7.9l2.8-1.5.9-3 3.1.7L12 2z" />
      <path d="M9.2 12.4l1.9 1.9 3.7-3.9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function MessagerieTab({ user, onExit }: { user: User; onExit: () => void }) {
  const [participants, setParticipants] = useState<ParticipantLite[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ParticipantLite | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    const [{ data: parts }, { data: convs }] = await Promise.all([
      supabase
        .from("participants")
        .select("id, nom, prenoms, photo_url, niveau_etudes, certifie")
        .neq("id", user.id)
        .order("prenoms"),
      supabase
        .from("conversations")
        .select("*")
        .or(`participant_a_id.eq.${user.id},participant_b_id.eq.${user.id}`),
    ]);
    if (parts) setParticipants(parts);
    if (convs) {
      setConversations(convs);
      loadUnreadCounts(convs.map((c) => c.id));
    }
  };

  // Compte les messages non lus reçus, par conversation, pour savoir quels
  // éléments de la liste doivent s'afficher en gras.
  const loadUnreadCounts = async (convIds: string[]) => {
    if (convIds.length === 0) {
      setUnreadCounts({});
      return;
    }
    const { data } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .is("read_at", null);

    const counts: Record<string, number> = {};
    (data || []).forEach((m: { conversation_id: string }) => {
      counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  };

  // Chargement initial + mise à jour en direct de la liste (nouvelle
  // conversation créée, dernier message mis à jour) sans avoir à refresh.
  useEffect(() => {
    loadAll();
    const channelName = `messagerie_list_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Ouvre (ou crée si elle n'existe pas encore) la conversation avec un
  // participant, charge l'historique, puis marque les messages reçus lus.
  const openConversation = async (p: ParticipantLite) => {
    setSelected(p);
    setMessages([]);
    setLoadingMsgs(true);

    const [a, b] = orderedPair(user.id, p.id);
    let conv = conversations.find((c) => c.participant_a_id === a && c.participant_b_id === b) || null;

    if (!conv) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ participant_a_id: a, participant_b_id: b })
        .select()
        .single();

      if (error) {
        // Course possible si l'autre participant a créé la conversation
        // au même moment (contrainte unique violée) : on la relit.
        const { data: existing } = await supabase
          .from("conversations")
          .select("*")
          .eq("participant_a_id", a)
          .eq("participant_b_id", b)
          .single();
        conv = existing || null;
      } else {
        conv = data;
        setConversations((prev) => [...prev, data]);
      }
    }

    if (!conv) {
      setLoadingMsgs(false);
      return;
    }

    setConversationId(conv.id);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    setMessages(msgs || []);
    setLoadingMsgs(false);

    // On efface immédiatement le compteur/le gras localement (pas besoin
    // d'attendre le round-trip réseau de l'update ci-dessous).
    setUnreadCounts((prev) => {
      if (!prev[conv!.id]) return prev;
      const next = { ...prev };
      delete next[conv!.id];
      return next;
    });

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  // Réception en direct des nouveaux messages de la conversation ouverte,
  // et des mises à jour (passage en "Vu" quand le destinataire lit).
  useEffect(() => {
    if (!conversationId) return;
    const channelName = `messagerie_chat_${conversationId}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as MessageRow;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll vers le bas à chaque nouveau message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !conversationId || sending) return;
    setSending(true);
    setInput("");

    // Affichage optimiste : on montre le message tout de suite, on le
    // remplace par la version serveur (avec le vrai id) une fois l'insert
    // confirmé, ou on le retire s'il échoue.
    const tempId = `tmp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, content })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      await supabase
        .from("conversations")
        .update({ last_message: content, last_message_at: data.created_at })
        .eq("id", conversationId);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    }
    setSending(false);
  };

  const timeShort = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  // Libellé du séparateur de date au-dessus d'un groupe de messages
  // (Aujourd'hui / Hier / date complète), façon Messenger.
  const dateDivider = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  };

  // Regroupe les messages par jour, puis par petites rafales du même
  // expéditeur (< 3 min d'écart) pour n'afficher l'en-tête nom/heure
  // qu'une fois par rafale — comme sur Messenger/WhatsApp.
  const messageGroups = useMemo(() => {
    const days: { dateKey: string; blocks: { senderId: string; msgs: MessageRow[] }[] }[] = [];
    for (const m of messages) {
      const dateKey = new Date(m.created_at).toDateString();
      let day = days[days.length - 1];
      if (!day || day.dateKey !== dateKey) {
        day = { dateKey, blocks: [] };
        days.push(day);
      }
      const lastBlock = day.blocks[day.blocks.length - 1];
      const lastMsg = lastBlock?.msgs[lastBlock.msgs.length - 1];
      const gapMs = lastMsg ? new Date(m.created_at).getTime() - new Date(lastMsg.created_at).getTime() : Infinity;
      if (lastBlock && lastBlock.senderId === m.sender_id && gapMs < 3 * 60 * 1000) {
        lastBlock.msgs.push(m);
      } else {
        day.blocks.push({ senderId: m.sender_id, msgs: [m] });
      }
    }
    return days;
  }, [messages]);

  // Fusionne l'annuaire des participants avec leur conversation existante
  // (s'il y en a une), trié par dernier message reçu/envoyé.
  const list = useMemo(() => {
    const convByParticipant = new Map<string, ConversationRow>();
    for (const c of conversations) {
      const otherId = c.participant_a_id === user.id ? c.participant_b_id : c.participant_a_id;
      convByParticipant.set(otherId, c);
    }
    const q = search.trim().toLowerCase();
    return participants
      .map((p) => ({ p, conv: convByParticipant.get(p.id) || null }))
      .filter(({ p }) => `${p.prenoms} ${p.nom}`.toLowerCase().includes(q))
      .sort((x, y) => {
        const tx = x.conv?.last_message_at ? new Date(x.conv.last_message_at).getTime() : 0;
        const ty = y.conv?.last_message_at ? new Date(y.conv.last_message_at).getTime() : 0;
        if (tx !== ty) return ty - tx;
        return x.p.prenoms.localeCompare(y.p.prenoms);
      });
  }, [participants, conversations, search, user.id]);

  const closeConversation = () => {
    setSelected(null);
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] bg-card flex overflow-hidden lg:static lg:inset-auto lg:z-auto lg:h-[calc(100dvh-150px)] lg:rounded-3xl lg:border lg:border-border lg:shadow-soft">
      {/* ═══ LISTE DES PARTICIPANTS ═══ */}
      <div className={`w-full lg:w-80 lg:shrink-0 min-h-0 border-r border-border flex-col ${selected ? "hidden lg:flex" : "flex"}`}>
        <div className="px-4 pt-4 pb-4 border-b border-border shrink-0 safe-area-pt">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onExit}
              aria-label="Retour au tableau de bord"
              className="lg:hidden w-8 h-8 -ml-1 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-bold text-lg">Conversations</h2>
          </div>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="w-full bg-muted/50 rounded-xl pl-9 pr-3 py-2.5 text-base lg:text-sm outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">Aucun participant trouvé.</p>
          ) : (
            list.map(({ p, conv }) => {
              const unread = conv ? unreadCounts[conv.id] || 0 : 0;
              return (
              <button
                key={p.id}
                onClick={() => openConversation(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/60 hover:bg-muted/40 transition-colors ${
                  selected?.id === p.id ? "bg-muted/60" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>{p.prenoms[0]}{p.nom[0]}</>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate flex items-center gap-1 ${unread > 0 ? "font-bold text-foreground" : "font-semibold"}`}>
                      <span className="truncate">{p.prenoms} {p.nom}</span>
                      {p.certifie === "oui" && <CertifiedBadge />}
                    </p>
                    {conv?.last_message_at && (
                      <span className={`text-[10px] shrink-0 ${unread > 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {timeShort(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate ${unread > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {conv?.last_message ? conv.last_message : "Aucun message pour l'instant"}
                    </p>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ FIL DE DISCUSSION ═══ */}
      <div className={`flex-1 min-w-0 min-h-0 flex-col ${selected ? "flex" : "hidden lg:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <IconMessage className="w-8 h-8" />
            </div>
            <p className="font-semibold">Sélectionne une conversation</p>
            <p className="text-sm text-muted-foreground mt-1">Choisis un participant dans la liste pour lui écrire.</p>
          </div>
        ) : (
          <>
            <div className="px-3 py-3 border-b border-border flex items-center gap-3 bg-card shrink-0 safe-area-pt">
              <button
                onClick={closeConversation}
                aria-label="Retour"
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
              >
                <IconChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>{selected.prenoms[0]}{selected.nom[0]}</>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-1">
                  <span className="truncate">{selected.prenoms} {selected.nom}</span>
                  {selected.certifie === "oui" && <CertifiedBadge />}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{selected.niveau_etudes}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain px-4 py-4 space-y-3 bg-muted/20">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun message. Dis bonjour 👋</p>
              ) : (
                messageGroups.map((day) => (
                  <div key={day.dateKey}>
                    <div className="flex justify-center my-2">
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full uppercase tracking-wide">
                        {dateDivider(day.blocks[0].msgs[0].created_at)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {day.blocks.map((block, blockIdx) => {
                        const mine = block.senderId === user.id;
                        return (
                          <div key={blockIdx} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                            {/* Avatar : uniquement sur mes propres messages, aligné en bas du groupe */}
                            {mine && (
                              <div className="w-7 h-7 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-[9px] overflow-hidden shrink-0">
                                {user.photo_url ? (
                                  <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <>{user.prenoms[0]}{user.nom[0]}</>
                                )}
                              </div>
                            )}
                            <div className={`flex flex-col max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                              {/* En-tête : nom (si reçu) + heure du premier message de la rafale */}
                              <p className={`text-[11px] text-muted-foreground px-1 mb-1 ${mine ? "text-right" : "text-left"}`}>
                                {mine ? (
                                  <>
                                    {new Date(block.msgs[0].created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{" "}
                                    <span className="font-semibold text-foreground/70">Vous</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-semibold text-foreground/70">{selected.prenoms} {selected.nom}</span>{" "}
                                    {new Date(block.msgs[0].created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </>
                                )}
                              </p>
                              <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                                {block.msgs.map((m, i) => {
                                  const isLast = i === block.msgs.length - 1;
                                  return (
                                    <div
                                      key={m.id}
                                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                                        mine
                                          ? `bg-gradient-ocean text-primary-foreground ${isLast ? "rounded-br-sm" : ""}`
                                          : `bg-card border border-border ${isLast ? "rounded-bl-sm" : ""}`
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</p>
                                      {mine && isLast && (
                                        <p className="text-[10px] mt-1 flex items-center justify-end gap-1 text-white/70">
                                          {m.read_at ? (
                                            <span className="inline-flex items-center gap-0.5">
                                              <IconCheckDouble className="w-3 h-3" />
                                              <span>Vu</span>
                                            </span>
                                          ) : (
                                            <IconCheck className="w-3 h-3" />
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-3 py-3 border-t border-border bg-card shrink-0 safe-area-pb">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Votre message"
                  className="flex-1 min-w-0 bg-muted/50 rounded-full px-4 py-2.5 text-base lg:text-sm outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  aria-label="Envoyer"
                  className="w-10 h-10 rounded-full bg-gradient-ocean text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition active:scale-95"
                >
                  <IconSend className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("calendrier");
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enregistrements, setEnregistrements] = useState<Enregistrement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  // ─── Badge "Cours" : disparaît définitivement une fois l'onglet visité ───
  const [coursSeen, setCoursSeen] = useState(false);

  // ─── Compteur de messages non lus (badge onglet Messages) ───
  async function refreshUnreadMessages(participantId: string) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_a_id.eq.${participantId},participant_b_id.eq.${participantId}`);

    const convIds = (convs || []).map((c) => c.id);
    if (convIds.length === 0) {
      setUnreadMessages(0);
      return;
    }

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", participantId)
      .is("read_at", null);

    setUnreadMessages(count || 0);
  }

  // ─── Chargement utilisateur ───
  async function loadUserData() {
    const sessionStr = localStorage.getItem("amphix_session");
    if (!sessionStr) {
      window.location.href = "/connexion";
      return;
    }

    const sessionData = JSON.parse(sessionStr);

    const { data, error } = await supabase
      .from("participants")
      .select("id, nom, prenoms, whatsapp, niveau_etudes, paye, montant_paye, photo_url")
      .eq("id", sessionData.id)
      .single();

    if (error || !data) {
      localStorage.removeItem("amphix_session");
      window.location.href = "/connexion";
      return;
    }

    setUser(data);
    localStorage.setItem("amphix_session", JSON.stringify(data));
  }

  // ─── Chargement sessions ───
  async function loadSessions() {
    const { data, error } = await supabase
      .from("sessions")
      .select("*, cours:cours_id(*), professeur:professeur_id(*)")
      .order("date", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (!error && data) setSessions(data);
  }

  // ─── Chargement des cours enregistrés (replay Google Meet) ───
  async function loadEnregistrements() {
    const { data, error } = await supabase
      .from("enregistrements")
      .select("*, cours:cours_id(*), professeur:professeur_id(*)")
      .order("date", { ascending: false });

    if (!error && data) setEnregistrements(data);
  }

  // ─── Initialisation ───
  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadUserData();
      await loadSessions();
      await loadEnregistrements();
      setLoading(false);
    }
    init();
  }, []);

  // ─── Badge "Cours" déjà vu (persisté par utilisateur) ───
  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(`amphix_cours_seen_${user.id}`);
    if (seen === "1") setCoursSeen(true);
  }, [user]);

  // ─── Mise à jour en direct du badge "messages non lus" ───
  // Se déclenche sur tout nouveau message (pour incrémenter) et sur toute
  // mise à jour (quand un message est marqué lu à l'ouverture d'une
  // conversation, pour décrémenter) — sans jamais avoir besoin de refresh.
  useEffect(() => {
    if (!user) return;
    refreshUnreadMessages(user.id);

    const channelName = `messages_badge_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refreshUnreadMessages(user.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        refreshUnreadMessages(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ─── Badge sur l'icône de l'app PWA ───
  // Combine messages non lus + notifications non lues, mis à jour à chaque
  // changement (donc en direct grâce aux effets réaltime ci-dessus).
  useEffect(() => {
    updateAppBadge(unreadMessages + notifUnread);
  }, [unreadMessages, notifUnread]);

  const handleLogout = () => {
    updateAppBadge(0);
    localStorage.removeItem("amphix_session");
    window.location.href = "/connexion";
  };

  // Met à jour l'utilisateur localement + dans le cache localStorage
  // (utilisé après changement de la photo de profil)
  const handleUserUpdate = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("amphix_session", JSON.stringify(updated));
      return updated;
    });
  };

  // Stats
  const stats = useMemo(() => {
    const today = toLocalDateStr(new Date());
    const total = sessions.length;
    const aVenir = sessions.filter((s) => s.date >= today).length;
    const cetteSemaine = sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      const now = new Date();
      const diff = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;
    return { total, aVenir, cetteSemaine };
  }, [sessions]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleTabClick = (key: DashboardTab) => {
    setActiveTab(key);
    if (key === "cours" && !coursSeen && user) {
      setCoursSeen(true);
      localStorage.setItem(`amphix_cours_seen_${user.id}`, "1");
    }
  };

  const tabs = [
    { key: "calendrier" as DashboardTab, icon: IconCalendar, label: "Calendrier", badge: stats.cetteSemaine > 0 ? stats.cetteSemaine : undefined },
    { key: "cours" as DashboardTab, icon: IconBook, label: "Cours", badge: !coursSeen && enregistrements.length > 0 ? enregistrements.length : undefined },
    { key: "messagerie" as DashboardTab, icon: IconMessage, label: "Messages", badge: unreadMessages > 0 ? unreadMessages : undefined },
    { key: "parametres" as DashboardTab, icon: IconSettings, label: "Paramètres" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <PWAInstallPrompt />

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside className="hidden lg:flex w-72 bg-card border-r border-border flex-col sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
  <img src="/logo.svg" alt="Amphix" className="w-full h-full object-contain" />
</div>
            <div>
              <span className="font-display font-bold text-lg">Amphix</span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5">Bootcamp 2026</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Menu
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
              {user.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <>{user.prenoms[0]}{user.nom[0]}</>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.prenoms} {user.nom}</p>
              <p className="text-[10px] text-muted-foreground">{user.niveau_etudes}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ CONTENU PRINCIPAL ═══ */}
      <main className="flex-1 min-w-0 min-h-screen pb-24 lg:pb-0">
        {/* Header mobile — masqué en Messagerie (plein écran type app de chat) */}
        {activeTab !== "messagerie" && (
        <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
  <img src="/logo.svg" alt="Amphix" className="w-full h-full object-contain" />
</div>
              <div>
                <span className="font-display font-bold text-sm block leading-tight">Amphix</span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {activeTab === "calendrier" && "Mon emploi du temps"}
                  {activeTab === "cours" && "Mes cours"}
                  {activeTab === "parametres" && "Paramètres"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell compact onUnreadChange={setNotifUnread} />
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${user.paye ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {user.paye ? "✓ Payé" : "Non payé"}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Header desktop */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-8 py-4 items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold">Bonjour, {user.prenoms} 👋</h1>
            <p className="text-xs text-muted-foreground">{user.niveau_etudes}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell onUnreadChange={setNotifUnread} />
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${user.paye ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {user.paye ? "✓ Payé" : "Non payé"}
            </div>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8 lg:py-6 max-w-5xl">
          {activeTab === "calendrier" && <CalendrierTab sessions={sessions} user={user} />}
          {activeTab === "cours" && <CoursTab enregistrements={enregistrements} />}
          {activeTab === "messagerie" && <MessagerieTab user={user} onExit={() => setActiveTab("calendrier")} />}
          {activeTab === "parametres" && <ParametresTab user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
        </div>
      </main>

      {/* ═══ NAVIGATION MOBILE BOTTOM ═══ */}
      {activeTab !== "messagerie" && (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border z-40 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={[
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[64px] relative",
                  isActive ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>{tab.label}</span>
                {isActive && <span className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}