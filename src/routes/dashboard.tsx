// src/routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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

function IconMenu({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
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

function IconCheck({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
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
function CalendrierTab({ sessions, user }: { sessions: Session[]; user: User }) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const weekStart = useMemo(() => {
    const d = new Date(currentWeek);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [currentWeek]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const joursSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const joursComplets = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const heures = Array.from({ length: 13 }, (_, i) => i + 8);

  const sessionsParJour = useMemo(() => {
    const result: { [key: number]: Session[] } = {};
    for (let i = 0; i < 7; i++) {
      const jourDate = new Date(weekStart);
      jourDate.setDate(jourDate.getDate() + i);
      const dateStr = jourDate.toISOString().split("T")[0];
      result[i] = sessions.filter((s) => s.date === dateStr);
    }
    return result;
  }, [sessions, weekStart]);

  const navigateWeek = (direction: number) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + direction * 7);
    setCurrentWeek(d);
  };

  const goToToday = () => setCurrentWeek(new Date());

  const todayIndex = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  // Sessions du jour sélectionné (vue mobile)
  const [selectedDay, setSelectedDay] = useState(todayIndex);

  const sessionsDuJour = sessionsParJour[selectedDay] || [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header semaine */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Mon emploi du temps</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — {weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition">
            Aujourd'hui
          </button>
          <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg hover:bg-muted transition">
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg hover:bg-muted transition">
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sélecteur de jour — mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {joursSemaine.map((jour, i) => {
          const jourDate = new Date(weekStart);
          jourDate.setDate(jourDate.getDate() + i);
          const isToday = new Date().toDateString() === jourDate.toDateString();
          const isSelected = selectedDay === i;
          const count = (sessionsParJour[i] || []).length;

          return (
            <button
              key={jour}
              onClick={() => setSelectedDay(i)}
              className={[
                "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[52px] transition-all",
                isSelected
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : isToday
                    ? "bg-primary/10 text-primary"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <span className="text-[10px] font-semibold uppercase">{jour}</span>
              <span className="text-lg font-bold">{jourDate.getDate()}</span>
              {count > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Liste des sessions du jour — mobile */}
      <div className="space-y-3">
        {sessionsDuJour.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <IconCalendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun cours ce jour</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Profitez de votre temps libre !</p>
          </div>
        ) : (
          sessionsDuJour
            .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
            .map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-card rounded-2xl border border-border p-4 shadow-soft active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Barre couleur */}
                  <div
                    className="w-1.5 h-12 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: session.cours?.couleur || "#3b82f6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm truncate">{session.cours?.titre}</h3>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {session.heure_debut}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.heure_debut} — {session.heure_fin}
                    </p>
                    {session.professeur && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-[10px] font-bold">
                          {session.professeur.prenoms?.[0] || session.professeur.nom[0]}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {session.professeur.prenoms} {session.professeur.nom}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <IconChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Vue desktop calendrier grille */}
      <div className="hidden md:block bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-3 text-xs font-semibold text-muted-foreground border-r border-border bg-muted/30 flex items-center justify-center">
                Heure
              </div>
              {joursComplets.map((jour, i) => {
                const jourDate = new Date(weekStart);
                jourDate.setDate(jourDate.getDate() + i);
                const isToday = new Date().toDateString() === jourDate.toDateString();
                return (
                  <div key={jour} className={`p-3 text-center border-r border-border last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                    <div className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{jour}</div>
                    <div className={`text-sm font-bold mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>{jourDate.getDate()}</div>
                  </div>
                );
              })}
            </div>

            <div className="relative">
              {heures.map((heure) => (
                <div key={heure} className="grid grid-cols-8 border-b border-border/50 min-h-[60px]">
                  <div className="p-2 text-xs text-muted-foreground border-r border-border bg-muted/20 flex items-center justify-center">
                    {heure.toString().padStart(2, "0")}:00
                  </div>
                  {joursComplets.map((_, jourIndex) => {
                    const sessionsJour = sessionsParJour[jourIndex] || [];
                    const sessionMatch = sessionsJour.find((s) => {
                      const debut = parseInt(s.heure_debut.split(":")[0]);
                      return debut === heure;
                    });

                    if (sessionMatch && sessionMatch.cours) {
                      const dureeHeures = (() => {
                        const [h1, m1] = sessionMatch.heure_debut.split(":").map(Number);
                        const [h2, m2] = sessionMatch.heure_fin.split(":").map(Number);
                        return Math.max(1, h2 - h1 + (m2 - m1) / 60);
                      })();

                      return (
                        <div key={jourIndex} className="p-1 border-r border-border/50 relative">
                          <button
                            onClick={() => setSelectedSession(sessionMatch)}
                            className="w-full h-full rounded-xl p-2 text-left transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 text-xs"
                            style={{
                              backgroundColor: sessionMatch.cours.couleur + "20",
                              borderLeft: `3px solid ${sessionMatch.cours.couleur}`,
                              minHeight: `${Math.max(50, dureeHeures * 55)}px`,
                            }}
                          >
                            <div className="font-bold text-foreground leading-tight" style={{ color: sessionMatch.cours.couleur }}>
                              {sessionMatch.cours.titre}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-[10px]">
                              {sessionMatch.heure_debut} — {sessionMatch.heure_fin}
                            </div>
                            {sessionMatch.professeur && (
                              <div className="text-muted-foreground text-[10px] mt-0.5">
                                {sessionMatch.professeur.prenoms} {sessionMatch.professeur.nom}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    }
                    return <div key={jourIndex} className="p-1 border-r border-border/50 min-h-[60px] hover:bg-muted/20 transition-colors" />;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal détail session */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
          <div className="bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl w-full sm:max-w-md sm:w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Header coloré */}
            <div className="p-5 sm:p-6 text-white relative rounded-t-3xl sm:rounded-t-2xl" style={{ backgroundColor: selectedSession.cours?.couleur || "#3b82f6" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium opacity-80 mb-1">{joursComplets[new Date(selectedSession.date).getDay() === 0 ? 6 : new Date(selectedSession.date).getDay() - 1]}</div>
                  <h3 className="font-display text-lg font-bold">{selectedSession.cours?.titre}</h3>
                </div>
                <button onClick={() => setSelectedSession(null)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition">
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
                    {selectedSession.professeur.prenoms?.[0] || selectedSession.professeur.nom[0]}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Professeur</div>
                    <div className="font-semibold text-sm">{selectedSession.professeur.prenoms} {selectedSession.professeur.nom}</div>
                    {selectedSession.professeur.specialite && (
                      <div className="text-xs text-muted-foreground">{selectedSession.professeur.specialite}</div>
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

              {/* Bouton Participer */}
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

/* ─── TAB: MES COURS ─── */
function CoursTab({ sessions, user }: { sessions: Session[]; user: User }) {
  const coursFuturs = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions
      .filter((s) => s.date >= today)
      .sort((a, b) => {
        const dateA = new Date(a.date + "T" + a.heure_debut);
        const dateB = new Date(b.date + "T" + b.heure_debut);
        return dateA.getTime() - dateB.getTime();
      });
  }, [sessions]);

  const coursPasses = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions
      .filter((s) => s.date < today)
      .sort((a, b) => {
        const dateA = new Date(a.date + "T" + a.heure_debut);
        const dateB = new Date(b.date + "T" + b.heure_debut);
        return dateB.getTime() - dateA.getTime();
      });
  }, [sessions]);

  const [showPasses, setShowPasses] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold">Mes cours</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{coursFuturs.length} cours à venir</p>
      </div>

      {/* Cours à venir */}
      <div className="space-y-3">
        {coursFuturs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <IconBook className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun cours programmé</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          coursFuturs.map((session) => {
            const dateObj = new Date(session.date);
            const isToday = session.date === new Date().toISOString().split("T")[0];
            return (
              <div key={session.id} className="bg-card rounded-2xl border border-border p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (session.cours?.couleur || "#3b82f6") + "20" }}
                  >
                    <IconBook className="w-6 h-6" style={{ color: session.cours?.couleur || "#3b82f6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm truncate">{session.cours?.titre}</h3>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Aujourd'hui</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.heure_debut} — {session.heure_fin}
                    </p>
                    {session.professeur && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Par {session.professeur.prenoms} {session.professeur.nom}
                      </p>
                    )}
                  </div>
                  {session.salle && (
                    <a
                      href={session.salle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2.5 rounded-xl transition active:scale-95"
                      style={{ backgroundColor: (session.cours?.couleur || "#3b82f6") + "15" }}
                    >
                      <IconVideo className="w-5 h-5" style={{ color: session.cours?.couleur || "#3b82f6" }} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cours passés */}
      {coursPasses.length > 0 && (
        <div>
          <button
            onClick={() => setShowPasses(!showPasses)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <span>{showPasses ? "▼" : "▶"}</span>
            Cours passés ({coursPasses.length})
          </button>
          {showPasses && (
            <div className="space-y-2 mt-3">
              {coursPasses.map((session) => (
                <div key={session.id} className="bg-muted/30 rounded-xl border border-border/50 p-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <IconCheck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{session.cours?.titre}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {session.heure_debut}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // ─── Initialisation ───
  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadUserData();
      await loadSessions();
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
    { key: "cours" as DashboardTab, icon: IconBook, label: "Cours", badge: stats.aVenir > 0 ? stats.aVenir : undefined },
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

      {/* ═══ SIDEBAR MOBILE OVERLAY ═══ */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col animate-slide-right">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-ocean flex items-center justify-center text-white font-display font-bold">
                  A
                </div>
                <span className="font-display font-bold text-lg">Amphix</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-muted transition">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
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
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-border">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition">
                <IconLogout className="w-5 h-5" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTENU PRINCIPAL ═══ */}
      <main className="flex-1 min-h-screen pb-24 lg:pb-0">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition">
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-ocean flex items-center justify-center text-white font-display font-bold text-sm">
                A
              </div>
              <span className="font-display font-bold text-sm">Amphix</span>
            </div>
            <div className="w-9" />
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
          {activeTab === "cours" && <CoursTab sessions={sessions} user={user} />}
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