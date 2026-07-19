// src/routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";

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

type DashboardTab = "calendrier" | "cours" | "parametres";

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

function IconChevronLeft({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
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

  if (isIOS && isSafari && !deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[60] bg-card border border-border rounded-2xl shadow-2xl p-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Installer Amphix sur iPhone</p>
            <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
              <li>Appuyez sur <span className="font-bold">Partager</span> en bas</li>
              <li>Faites défiler et tapez <span className="font-bold">"Sur l'écran d'accueil"</span></li>
              <li>Confirmez avec <span className="font-bold">"Ajouter"</span></li>
            </ol>
            <button 
              onClick={() => setShowPrompt(false)} 
              className="mt-2 text-xs font-semibold text-primary"
            >
              J'ai compris
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si pas de prompt disponible et pas iOS, ne montre rien
  if (!showPrompt && !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] bg-primary text-white rounded-2xl shadow-2xl p-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Installer Amphix</p>
          <p className="text-xs opacity-80">Accédez rapidement à vos cours</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrompt(false)} className="px-3 py-1.5 text-xs font-medium opacity-80 hover:opacity-100">
            Plus tard
          </button>
          <button 
            onClick={handleInstall} 
            className="px-4 py-2 rounded-xl bg-white text-primary text-xs font-bold hover:bg-white/90 transition active:scale-95"
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
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

  const sessionsParJour = useMemo(() => {
    return visibleDays.map((jourDate) => {
      const dateStr = jourDate.toISOString().split("T")[0];
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
        <div className="overflow-x-auto scrollbar-hide">
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
function CoursTab({ enregistrements }: { enregistrements: Enregistrement[] }) {
  const [search, setSearch] = useState("");

  const filtres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enregistrements;
    return enregistrements.filter(
      (rec) => rec.titre.toLowerCase().includes(q) || rec.cours?.titre.toLowerCase().includes(q) || rec.professeur?.nom.toLowerCase().includes(q)
    );
  }, [enregistrements, search]);

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

      {filtres.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <IconVideo className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {enregistrements.length === 0 ? "Aucun cours enregistré pour l'instant" : "Aucun résultat pour cette recherche"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {enregistrements.length === 0 ? "Les replays de vos sessions apparaîtront ici." : "Essayez un autre mot-clé."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtres.map((rec) => {
            const couleur = rec.cours?.couleur || "#3b82f6";
            return (
              <a
                key={rec.id}
                href={rec.lien}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-2xl border border-border p-4 shadow-soft active:scale-[0.98] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Vignette vidéo */}
                  <div
                    className="relative w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: couleur + "20" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: couleur }}
                    >
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="6 4 20 12 6 20 6 4" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {rec.cours && (
                      <span
                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                        style={{ backgroundColor: couleur + "1a", color: couleur }}
                      >
                        {rec.cours.titre}
                      </span>
                    )}
                    <h3 className="font-bold text-sm leading-snug truncate">{rec.titre}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(rec.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {rec.professeur && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {rec.professeur.prenoms?.[0] || rec.professeur.nom[0]}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {rec.professeur.prenoms} {rec.professeur.nom}
                        </span>
                      </div>
                    )}
                  </div>

                  <IconChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
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
function ParametresTab({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

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
    if (outcome === "accepted") setCanInstall(false);
    setInstallPrompt(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);


  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold">Paramètres</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gérez votre compte</p>
      </div>

      {/* Profil card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-ocean flex items-center justify-center text-white font-display font-bold text-xl">
            {user.prenoms[0]}{user.nom[0]}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base">{user.prenoms} {user.nom}</h3>
            <p className="text-xs text-muted-foreground">{user.whatsapp}</p>
          </div>
        </div>

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
function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("calendrier");
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enregistrements, setEnregistrements] = useState<Enregistrement[]>([]);
  const [loading, setLoading] = useState(true);

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
      .select("id, nom, prenoms, whatsapp, niveau_etudes, paye, montant_paye")
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

  const handleLogout = () => {
    localStorage.removeItem("amphix_session");
    window.location.href = "/connexion";
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
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

  const tabs = [
    { key: "calendrier" as DashboardTab, icon: IconCalendar, label: "Calendrier", badge: stats.cetteSemaine > 0 ? stats.cetteSemaine : undefined },
    { key: "cours" as DashboardTab, icon: IconBook, label: "Cours", badge: enregistrements.length > 0 ? enregistrements.length : undefined },
    { key: "parametres" as DashboardTab, icon: IconSettings, label: "Paramètres" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <PWAInstallPrompt />

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside className="hidden lg:flex w-72 bg-card border-r border-border flex-col sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-ocean flex items-center justify-center text-white font-display font-bold text-lg">
              A
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
                onClick={() => setActiveTab(tab.key)}
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
            <div className="w-9 h-9 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-bold text-xs">
              {user.prenoms[0]}{user.nom[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.prenoms} {user.nom}</p>
              <p className="text-[10px] text-muted-foreground">{user.niveau_etudes}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ CONTENU PRINCIPAL ═══ */}
      <main className="flex-1 min-h-screen pb-24 lg:pb-0">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-ocean flex items-center justify-center text-white font-display font-bold text-sm">
                A
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
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${user.paye ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {user.paye ? "✓ Payé" : "Non payé"}
            </div>
          </div>
        </header>

        {/* Header desktop */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-8 py-4 items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">
              {activeTab === "calendrier" && "Mon emploi du temps"}
              {activeTab === "cours" && "Mes cours"}
              {activeTab === "parametres" && "Paramètres"}
            </h1>
            <p className="text-xs text-muted-foreground">{user.prenoms} {user.nom} · {user.niveau_etudes}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${user.paye ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {user.paye ? "✓ Payé" : "Non payé"}
            </div>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8 lg:py-6 max-w-5xl">
          {activeTab === "calendrier" && <CalendrierTab sessions={sessions} user={user} />}
          {activeTab === "cours" && <CoursTab enregistrements={enregistrements} />}
          {activeTab === "parametres" && <ParametresTab user={user} onLogout={handleLogout} />}
        </div>
      </main>

      {/* ═══ NAVIGATION MOBILE BOTTOM ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border z-40 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
    </div>
  );
}