import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/bootcamp-hero.jpeg";
import { InfiniteTextMarquee } from "@/components/ui/InfiniteTextMarquee";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import campfireImg from "@/assets/logos/campfire.png";
import certificatImg from "@/assets/logos/certificat.png";
import { logoMap, infoIconMap } from "@/assets/logos";
import { SparklesText } from "@/components/ui/sparkles-text";
const Spline = lazy(() => import("@splinetool/react-spline"));
import CountdownTimer from "@/components/ui/CountdownTimer";
import TeamShowcase from "@/components/TeamShowcase";
import { supabase } from "@/lib/supabase"; // adapte le chemin
import TestimonialsSection, { type Testimonial } from "@/components/TestimonialsSection";
import Modal from "@/components/Modal";
import AvisForm from "@/components/AvisForm";
// Entré de lapp ts
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bootcamp Amphix 2026 — Apprendre, Construire, Innover" },
      { name: "description", content: "4 semaines de formation intensive aux métiers du numérique. Web, IA, Design, Hackathon. Inscription : 10 000 FCFA." },
      { property: "og:title", content: "Bootcamp Amphix 2026" },
      { property: "og:description", content: "4 semaines pour transformer vos idées en projets concrets. Inscription : 10 000 FCFA." },
      { property: "og:image", content: heroImg },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: Index,
});
const tracks = [
  { logo: "html5", title: "Développement Web", items: ["HTML5", "CSS3", "JavaScript", "Responsive Design"], color: "ocean" },
  { logo: "python", title: "Développement Backend", items: ["Python", "Laravel", "API REST", "Postman"], color: "coral" },
  { logo: "supabase", title: "Bases de Données", items: ["Supabase", "MYSQL", "PostgreSQL", "Requêtes SQL"], color: "sun" },   // ← nouveau logo
  { logo: "react", title: "Frontend Moderne", items: ["React", "Consommation d'API", "Interfaces interactives"], color: "ocean" },
  { logo: "github", title: "Git & GitHub", items: ["Gestion de versions", "Collaboration", "Branches", "README pro"], color: "coral" },   // ← nouveau logo
  { logo: "figma", title: "Design Graphique", items: ["Figma", "Canva", "Maquettage", "UI Design"], color: "sun" },
  { logo: "capcut", title: "Montage Vidéo", items: ["Bases du montage", "Motion Design", "Vidéos IA"], color: "ocean" },
  { logo: "openai", title: "IA & Automatisation", items: ["Outils IA", "Automatisation", "Productivité"], color: "coral" },
  { logo: "adobexd", title: "UI/UX & Marketing", items: ["Psychologie du design", "UX", "Produits numériques"], color: "sun" },
  { logo: "trello", title: "Gestion de Projet", items: ["Collaboration", "Organisation", "Méthodes agiles"], color: "ocean" },
];
const hackathonThemes = ["Éducation", "Santé", "Business", "Société", "Environnement", "Numérique"];

const criteria = ["Innovation", "Utilité du projet", "Qualité technique", "Design & UX", "Présentation finale", "Travail d'équipe"];

const benefits = [
  "Acquérir des compétences numériques recherchées",
  "Travailler sur des projets réels",
  "Développer votre portfolio",
  "Rencontrer des nouvelles relations",
  "Rejoindre la communauté Amphix",
  "Gagner des prix et des opportunités",
];

/* ─────────────── SPLASH SCREEN ─────────────── */
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0: loading, 1: reveal, 2: exit

  useEffect(() => {
    // Si l'utilisateur préfère les animations réduites, on passe directement.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onComplete();
      return;
    }

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase(1), 200);
          setTimeout(() => setPhase(2), 700);
          setTimeout(() => onComplete(), 1300);
          return 100;
        }
        return p + Math.random() * 25 + 12;
      });
    }, 90);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-1000 ease-out ${
        phase === 2 ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
      }`}
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)" }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? "#38bdf8" : i % 3 === 1 ? "#fb923c" : "#fbbf24",
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <div className={`relative transition-all duration-700 ${phase === 1 ? "scale-110" : "scale-100"}`}>
        <div className="text-7xl mb-6 animate-bounce">🚀</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-white text-center">
          <span className="text-sky-400">Boot</span>
          <span className="text-orange-400">Camp</span>
        </h1>
        <p className="mt-2 text-xl text-sky-200/80 text-center font-display tracking-widest uppercase">
          Amphix 2026
        </p>
      </div>

      <div className="mt-12 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: "linear-gradient(90deg, #38bdf8, #fb923c, #fbbf24)",
          }}
        />
      </div>
      <p className="mt-3 text-sm text-white/40 font-mono">
        {Math.min(Math.round(progress), 100)}%
      </p>

      <p className="absolute bottom-8 text-xs text-white/30 tracking-widest uppercase">
        Apprendre · Construire · Innover
      </p>
    </div>
  );
}

/* ─────────────── SPLINE 3D — chargement paresseux ───────────────
   La librairie Spline est lourde : on ne la télécharge et on ne la
   monte que lorsque la section devient visible à l'écran (au lieu
   de la charger dès l'arrivée sur la page). */
function LazySpline({ scene, className }: { scene: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" } // commence à charger un peu avant que ça soit visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          }
        >
          <Spline scene={scene} noAttribution={true} className="w-full h-full" />
        </Suspense>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ─────────────── PARALLAX HOOK ─────────────── */
function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check for reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const scrolled = window.innerHeight - rect.top;
        const offset = scrolled * speed * 0.1;
        el.style.setProperty("--parallax-offset", `${offset}px`);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // init

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return ref;
}

/* ─────────────── SCROLL REVEAL HOOK ─────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-white/80 backdrop-blur px-4 py-1.5 text-sm font-semibold text-foreground border border-border shadow-soft">{children}</span>;
}

/* ─────────────── REVEAL WRAPPER ─────────────── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Modal Offre (prix de la formation) ─────────────────────────────────── */
function OfferModal({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center px-4 ${
        closing ? "offer-backdrop-out" : "offer-backdrop-in"
      }`}
      style={{ background: "rgba(15, 23, 42, 0.65)" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes offer-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes offer-backdrop-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes offer-pop-in {
          0% { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes offer-roll-out {
          0%   { transform: scale(1) rotate(0deg) translateY(0); opacity: 1; }
          100% { transform: scale(0.15) rotate(720deg) translateY(140px); opacity: 0; }
        }
        @keyframes offer-close-btn-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .offer-backdrop-in { animation: offer-backdrop-in 0.6s ease-out both; }
        .offer-backdrop-out { animation: offer-backdrop-out 0.5s ease-in both; }
        .offer-pop-in {
          animation: offer-pop-in 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }
        .offer-roll-out {
          animation: offer-roll-out 0.6s ease-in forwards;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }
        .offer-close-btn { animation: offer-close-btn-pulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .offer-backdrop-in, .offer-backdrop-out, .offer-pop-in, .offer-roll-out, .offer-close-btn {
            animation: none;
          }
        }
      `}</style>

      <div
        className={`relative max-w-xs sm:max-w-sm w-full ${closing ? "offer-roll-out" : "offer-pop-in"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer — icône rouge */}
        <button
          onClick={onClose}
          aria-label="Fermer l'offre"
          className="offer-close-btn absolute -top-3 -right-3 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 transition-colors touch-manipulation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <img
          src="/offer.svg"
          alt="Offre spéciale — prix du Bootcamp Amphix"
          className="w-full h-auto rounded-2xl shadow-2xl select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

function Index() {
  const [showSplash, setShowSplash] = useState(() => {
    // On n'affiche l'écran de démarrage qu'une seule fois par session,
    // pour ne pas ralentir les retours sur la page d'accueil.
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("amphix_splash_seen") !== "1";
  });
    const [showForm, setShowForm] = useState(false);  // ← AJOUTE CETTE LIGNE

  // Modal "offre" (prix de la formation) — apparaît 3s après le chargement
  const [offerState, setOfferState] = useState<"hidden" | "visible" | "closing">("hidden");

  const heroParallax = useParallax(0.3);
  const campFireParallax = useParallax(-0.2);
  const rewardsParallax = useParallax(0.15);
const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const handleSplashComplete = () => {
    sessionStorage.setItem("amphix_splash_seen", "1");
    setShowSplash(false);
  };

  // Affiche le modal "offre" 3 secondes après la fin du chargement (une seule fois par session)
  useEffect(() => {
    if (showSplash) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("amphix_offer_seen") === "1") return;

    const timer = setTimeout(() => {
      sessionStorage.setItem("amphix_offer_seen", "1");
      setOfferState("visible");
    }, 3000);

    return () => clearTimeout(timer);
  }, [showSplash]);

  const handleCloseOffer = () => {
    setOfferState("closing");
    // Laisse le temps à l'animation "roulement" de se jouer avant de retirer le modal
    setTimeout(() => setOfferState("hidden"), 600);
  };

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement témoignages :", error);
      } else if (data) {
        setTestimonials(data);
      }
    };
    fetchTestimonials();
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {offerState !== "hidden" && (
        <OfferModal closing={offerState === "closing"} onClose={handleCloseOffer} />
      )}

      <main className={`min-h-screen bg-background overflow-x-hidden transition-opacity duration-500 ${showSplash ? "opacity-0" : "opacity-100"}`}>
        {/* Navigation fluide vers les ancres (#programme, #inscription...) */}
        <style>{`
          html { scroll-behavior: smooth; }
          @media (prefers-reduced-motion: reduce) {
            html { scroll-behavior: auto; }
          }
          @keyframes cta-pulse-scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
          .cta-pulse {
            animation: cta-pulse-scale 1.6s ease-in-out infinite;
          }
          .cta-pulse:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .cta-pulse { animation: none; }
          }
        `}</style>

        {/* BARRE D'URGENCE — Défilante, responsive */}
        <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 overflow-hidden py-2 sm:py-2.5 shadow-md">
          <style>{`
            @keyframes urgency-marquee-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .urgency-marquee-track {
              animation: urgency-marquee-scroll 20s linear infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .urgency-marquee-track { animation: none; }
            }
          `}</style>
          <div className="urgency-marquee-track flex w-max whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, groupIdx) => (
              <div key={groupIdx} className="flex shrink-0 items-center" aria-hidden={groupIdx === 1}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-2 px-4 sm:px-6 text-[11px] sm:text-sm md:text-base font-semibold uppercase tracking-wide text-white"
                  >
                    <span aria-hidden="true">⚡</span>
                    Dernière vague des inscriptions — Fin mardi 28 juillet 2026
                    <span className="mx-2 text-white/50">•</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* HERO */}
        <section className="relative bg-gradient-hero overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.62 0.18 240 / 0.2), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.68 0.2 25 / 0.2), transparent 40%)" }} />

          {/* Parallax floating orbs */}
          <div ref={heroParallax} className="absolute inset-0 pointer-events-none" style={{ transform: "translateY(var(--parallax-offset, 0px))" }}>
            <div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute top-40 right-[15%] w-40 h-40 rounded-full bg-orange-400/20 blur-3xl" />
            <div className="absolute bottom-20 left-[30%] w-24 h-24 rounded-full bg-yellow-400/20 blur-3xl" />
          </div>

          <nav className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">Amphix</span>
            </div>
            <a href="/connexion" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition hover:scale-105 active:scale-95">Connexion</a>
          </nav>

          <div className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Pill>1er Édition 2026</Pill>
              <h1 className="mt-6 font-display text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] text-balance">
                <span className="text-primary">Boot</span><span className="text-secondary">Camp</span>
<span className="block text-foreground text-4xl md:text-5xl mt-3">
  <span className="typing-text">
    le 1er août 2026
  </span>
</span>              </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-xl">
  Tu n'y connais rien en code ? Pas de souci. En{" "}
  <strong className="font-bold text-ocean animate-pulse">
    4 Semaines
  </strong>
  , tu sauras créer ton propre site. On part vraiment de zéro.
</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/inscription" className="cta-pulse rounded-full bg-gradient-ocean text-primary-foreground px-7 py-3.5 font-semibold shadow-pop hover:scale-105 transition active:scale-95">
  Réserver ma place 
</a>
                <a href="#programme" className="rounded-full bg-white text-foreground px-7 py-3.5 font-semibold border border-border hover:bg-muted transition active:scale-95">
                  Voir le programme
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">4</span> semaines
                </div>
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">10+</span> modules</div>
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">100%</span> en ligne</div>
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">1</span> min hackathon</div>
              </div>
            </div>
            <div className="relative animate-float">
              <div className="absolute -inset-8 bg-gradient-sun opacity-30 blur-3xl rounded-full" />
              <img src={heroImg} alt="Bootcamp Amphix — code et été" className="relative rounded-3xl shadow-pop w-full" loading="eager" fetchPriority="high" />
            </div>
          </div>
        </section>

        {/* INFOS GÉNÉRALES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
  <div className="grid md:grid-cols-4 gap-5">
    {[
      { label: "Durée", value: "4 semaines", iconKey: "calendar", grad: "bg-gradient-ocean" },
      { label: "Mode", value: "100% en ligne", iconKey: "laptop", grad: "bg-gradient-sun" },
      { label: "Clôture", value: "Mini Hackathon", iconKey: "celebration", grad: "bg-gradient-coral" },
      { label: "Inscription", value: "10 000 FCFA", iconKey: "ticket", grad: "bg-gradient-ocean" },
    ].map((c, i) => (
      <Reveal key={c.label} delay={i * 100}>
        <div className="relative rounded-2xl bg-card p-6 shadow-soft border border-border overflow-hidden hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
          <div className={`absolute -right-6 -top-6 w-24 h-24 ${c.grad} rounded-full opacity-20`} />
          {/* Nouveau : image à la place de l'emoji */}
          <div className="w-10 h-10 mb-2">
            <img
              src={infoIconMap[c.iconKey]}
              alt={c.label}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</div>
          <div className="mt-1 font-display text-2xl font-bold">{c.value}</div>
        </div>
      </Reveal>
    ))}
  </div>
</section>

        {/* PROGRAMME */}
        <section id="programme" className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Reveal>
              <Pill> Semaines 1 & 3</Pill>
            </Reveal>
           <Reveal delay={100}>
  <SparklesText
    text="Formation intensive"
    className="mt-5 font-display text-5xl font-bold"
    sparklesCount={10}
    colors={{ first: "#38bdf8", second: "#fb923c" }}
  />
</Reveal>
            <Reveal delay={200}>
              <p className="mt-4 text-lg text-muted-foreground">Trois semaines de pratique animées par des expérimentés du secteur, à travers 10 modules essentiels.</p>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tracks.map((t, i) => (
              <Reveal key={t.title} delay={i * 80}>
                <div className="group rounded-2xl bg-card p-6 border border-border shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
               <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-white shadow-sm">
  <img src={logoMap[t.logo]} alt={t.title} className="w-7 h-7 object-contain" loading="lazy" decoding="async" />
</div>
                  <h3 className="mt-4 font-display text-xl font-bold">{t.title}</h3>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {t.items.map((item) => <li key={item} className="flex gap-2"><span className="text-primary">›</span>{item}</li>)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CAMPFIRE — Parallax section */}
        <section className="relative bg-gradient-ocean text-primary-foreground py-20 overflow-hidden">
          <div ref={campFireParallax} className="absolute inset-0 pointer-events-none" style={{ transform: "translateY(var(--parallax-offset, 0px))" }}>
            <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-orange-300/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
  <div className="inline-block animate-pulse">
        <img src={campfireImg} alt="Campfire" className="w-20 h-20 object-contain" loading="lazy" decoding="async" />
      </div>
                    <h2 className="mt-4 font-display text-5xl font-bold">Soirées Campfire</h2>
              <p className="mt-4 text-lg opacity-90">Des moments uniques de détente, d'apprentissage et de networking entre passionnés.</p>
            </div>
            <ul className="space-y-3">
              {["Histoires inspirantes", "Partages d'expériences", "Échanges entre participants", "Jeux et divertissements", "Réseautage professionnel"].map((c, i) => (
                <Reveal key={c} delay={i * 100}>
                  <li className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/20 hover:bg-white/20 transition-colors">
                    <span className="text-secondary text-xl">✦</span>{c}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

    {/* HACKATHON */}
<section className="bg-white mx-auto max-w-7xl px-6 py-20 rounded-2xl">
  {/* Titre et description */}
  <div className="text-center max-w-2xl mx-auto mb-14">
    <Reveal>
      <Pill> Semaine 4</Pill>
    </Reveal>
    <Reveal delay={100}>
      <h2 className="mt-5 font-display text-5xl font-bold">Mini-Hackathon</h2>
    </Reveal>
    <Reveal delay={200}>
      <p className="mt-4 text-lg text-muted-foreground">
        En équipes, concevez une solution innovante répondant à un problème réel.
      </p>
    </Reveal>
  </div>

  {/* Robot 3D centré et sans watermark */}
  <Reveal>
    <div className="flex items-center justify-center w-full h-80 md:h-96 mb-10">
      <LazySpline
        scene="https://prod.spline.design/eNdnHh8iifDjRlcB/scene.splinecode"
        className="w-full h-full max-w-lg"
      />
    </div>
  </Reveal>

  {/* Blocs en dessous */}
  <div className="grid md:grid-cols-2 gap-6">
    <Reveal delay={0}>
      <div className="rounded-3xl bg-card p-8 border border-border shadow-soft hover:shadow-pop transition-shadow duration-300">
        <h3 className="font-display text-2xl font-bold flex items-center gap-2">
          🎯 Thématiques
        </h3>
        <div className="mt-5 flex flex-wrap gap-2">
          {hackathonThemes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Reveal>

    <Reveal delay={150}>
      <div className="rounded-3xl bg-card p-8 border border-border shadow-soft hover:shadow-pop transition-shadow duration-300">
        <h3 className="font-display text-2xl font-bold flex items-center gap-2">
          ⚖️ Critères d'évaluation
        </h3>
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {criteria.map((c, i) => (
            <li key={c} className="flex items-center gap-3 text-sm">
              <span className="w-7 h-7 rounded-full bg-gradient-sun text-foreground font-bold flex items-center justify-center text-xs">
                {i + 1}
              </span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  </div>
</section>

        {/* RÉCOMPENSES — Parallax section */}
        <section className="relative mx-auto max-w-6xl px-6 py-20 overflow-hidden">
          <div ref={rewardsParallax} className="absolute inset-0 pointer-events-none" style={{ transform: "translateY(var(--parallax-offset, 0px))" }}>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-gradient-sun/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-gradient-ocean/10 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-center mb-14">
              <Reveal><Pill>🏅 Récompenses</Pill></Reveal>
              <Reveal delay={100}><h2 className="mt-5 font-display text-5xl font-bold">À gagner</h2></Reveal>
            </div>
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[
                { medal: "🥇", title: "1er prix", g: "bg-gradient-sun" },
                { medal: "🥈", title: "2e prix", g: "bg-gradient-ocean" },
                { medal: "🥉", title: "3e prix", g: "bg-gradient-coral" },
              ].map((p, i) => (
                <Reveal key={p.title} delay={i * 150}>
                  <div className={`rounded-3xl ${p.g} p-8 text-center text-primary-foreground shadow-pop hover:scale-105 transition-transform duration-300`} style={{ transform: i === 0 ? "scale(1.04)" : undefined }}>
                    <div className="text-6xl">{p.medal}</div>
                    <div className="mt-3 font-display text-2xl font-bold">{p.title}</div>
                  </div>
                </Reveal>
              ))}
            </div>
           <div className="flex justify-center">
  <Reveal delay={100}>
    <div className="rounded-2xl bg-card border border-border p-6 flex items-center gap-4 shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all duration-300 max-w-md">
  <img src={certificatImg} alt="Certificat" className="w-12 h-12 object-contain" loading="lazy" decoding="async" />
  <div>
        <div className="font-display text-xl font-bold">Certificat des participants </div>
        <div className="text-sm text-muted-foreground">Pour tous les participants</div>
      </div>
    </div>
  </Reveal>
</div>
          </div>
        </section>

        {/* POURQUOI */}
        <section className="bg-muted py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-14">
              <Reveal><h2 className="font-display text-5xl font-bold">Pourquoi participer ?</h2></Reveal>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((b, i) => (
                <Reveal key={b} delay={i * 100}>
                  <div className="flex items-start gap-4 rounded-2xl bg-card p-5 border border-border shadow-soft hover:shadow-pop hover:-translate-y-0.5 transition-all duration-300">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-ocean text-primary-foreground flex items-center justify-center font-bold">✓</span>
                    <span className="text-lg pt-1">{b}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

      {/* CTA INSCRIPTION — Style exact de l'image */}
          {/* CTA INSCRIPTION — Style exact de l'image */}
      <section id="inscription" className="w-full bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="relative rounded-[2.5rem] bg-white text-foreground p-10 md:p-16 text-center overflow-hidden shadow-soft border border-border">
              
              {/* Formes décoratives aux coins — TOUT EN BLANC */}
              <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-white blur-xl opacity-60" 
                   style={{ transform: 'translate(-30%, -30%)' }} />
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white blur-lg opacity-50" 
                   style={{ transform: 'translate(-20%, -10%)' }} />
              
              <div className="absolute top-0 left-[15%] w-28 h-28 rounded-full bg-white blur-xl opacity-60" 
                   style={{ transform: 'translateY(-40%)' }} />
              <div className="absolute top-0 left-[25%] w-20 h-20 rounded-full bg-white blur-lg opacity-50" 
                   style={{ transform: 'translateY(-30%)' }} />
              
              <div className="absolute top-0 right-[20%] w-32 h-32 rounded-full bg-white blur-lg opacity-80" 
                   style={{ transform: 'translateY(-40%)' }} />
              <div className="absolute top-0 right-[5%] w-28 h-28 rounded-full bg-white blur-lg opacity-70" 
                   style={{ transform: 'translateY(-35%)' }} />
              
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white blur-xl opacity-60" 
                   style={{ transform: 'translate(30%, -30%)' }} />
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white blur-lg opacity-50" 
                   style={{ transform: 'translate(20%, -10%)' }} />
              
              <div className="absolute bottom-0 right-[10%] w-32 h-32 rounded-full bg-white blur-xl opacity-50" 
                   style={{ transform: 'translateY(40%)' }} />
              <div className="absolute bottom-0 right-[5%] w-24 h-24 rounded-full bg-white blur-lg opacity-40" 
                   style={{ transform: 'translateY(30%)' }} />

              <div className="relative z-10">
                {/* Sous-titre en petit caps */}
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
                  es tu prêt?
                </p>
                
                {/* Titre principal */}
                <h2 className="font-sans text-4xl sm:text-5xl md:text-6xl font-medium leading-tight tracking-tight text-foreground">
                  Rejoignez le <br className="hidden sm:block" />bootcamp 
                </h2>

                {/* Boutons — RESPONSIVE */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="/inscription"
                    className="w-full sm:w-auto rounded-full bg-black text-white px-6 py-3 sm:py-2.5 text-sm font-medium hover:bg-black/90 transition-colors text-center"
                  >
                    Réserver ma place
                  </a>
                  <a
                    href="#programme"
                    className="w-full sm:w-auto rounded-full bg-white text-foreground px-6 py-3 sm:py-2.5 text-sm font-medium border border-border hover:bg-muted transition-colors text-center"
                  >
                    Programme
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


<CountdownTimer targetDate="2026-08-01T00:00:00+01:00" />



      {/* Section Équipe */}
<section className="py-20 bg-white">
  <div className="text-center mb-12">
    <Reveal>
      <Pill> L'Équipe</Pill>
    </Reveal>
    <Reveal delay={100}>
      <h2 className="mt-5 font-display text-5xl font-bold">Rencontrez les mentors</h2>
    </Reveal>
  </div>
  <TeamShowcase />
</section>

      <div className="mb-16">
        <InfiniteTextMarquee
          text="BootCamp"
          link="/inscription"
          tooltipText="Réserver ma place"
          fontSize="6rem"
          hoverColor="#fb923c"
        />
      </div>
    

      


  {/* Modale avec le formulaire */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
        <AvisForm />
      </Modal>

       <footer className="border-t border-border py-10">
  <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
    <div className="flex items-center gap-2">
      <span className="font-display font-bold text-foreground">Amphix</span> · Bootcamp 2026
    </div>
    <div>« Apprendre, Construire, Innover »</div>
  </div>
</footer>
      </main>
    </>
  );
}