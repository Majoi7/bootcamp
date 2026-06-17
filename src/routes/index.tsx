import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/bootcamp-hero.jpeg";
import { useEffect, useState, useRef } from "react";
// Entré
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bootcamp Amphix 2026 — Apprendre, Construire, Innover" },
      { name: "description", content: "4 semaines de formation intensive aux métiers du numérique. Web, IA, Design, Hackathon. Inscription : 5 000 FCFA." },
      { property: "og:title", content: "Bootcamp Amphix 2026" },
      { property: "og:description", content: "4 semaines pour transformer vos idées en projets concrets. Inscription : 5 000 FCFA." },
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
  { icon: "🌐", title: "Développement Web", items: ["HTML5", "CSS3", "JavaScript", "Responsive Design"], color: "ocean" },
  { icon: "⚙️", title: "Développement Backend", items: ["Python", "Laravel", "API REST", "Postman"], color: "coral" },
  { icon: "🗄️", title: "Bases de Données", items: ["MySQL", "Modélisation", "Requêtes SQL"], color: "sun" },
  { icon: "⚛️", title: "Frontend Moderne", items: ["React", "Consommation d'API", "Interfaces interactives"], color: "ocean" },
  { icon: "🔀", title: "Git & GitHub", items: ["Gestion de versions", "Collaboration", "Branches", "README pro"], color: "coral" },
  { icon: "🎨", title: "Design Graphique", items: ["Figma", "Canva", "Maquettage", "UI Design"], color: "sun" },
  { icon: "🎬", title: "Montage Vidéo", items: ["Bases du montage", "Motion Design", "Vidéos IA"], color: "ocean" },
  { icon: "🤖", title: "IA & Automatisation", items: ["Outils IA", "Automatisation", "Productivité"], color: "coral" },
  { icon: "📱", title: "UI/UX & Marketing", items: ["Psychologie du design", "UX", "Produits numériques"], color: "sun" },
  { icon: "👥", title: "Gestion de Projet", items: ["Collaboration", "Organisation", "Méthodes agiles"], color: "ocean" },
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
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase(1), 300);
          setTimeout(() => setPhase(2), 1200);
          setTimeout(() => onComplete(), 2200);
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 120);
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

function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const heroParallax = useParallax(0.3);
  const campFireParallax = useParallax(-0.2);
  const rewardsParallax = useParallax(0.15);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <main className={`min-h-screen bg-background overflow-x-hidden transition-opacity duration-500 ${showSplash ? "opacity-0" : "opacity-100"}`}>
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
              <Pill>1er Édition 2026 · Organisé par Amphix</Pill>
              <h1 className="mt-6 font-display text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] text-balance">
                <span className="text-primary">Boot</span><span className="text-secondary">Camp</span>
                <span className="block text-foreground text-4xl md:text-5xl mt-3">Amphix 2026</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-xl">
                « Apprendre, Construire, Innover. » Transformez vos idées en projets concrets grâce à une immersion intensive dans les métiers du numérique.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/inscription" className="rounded-full bg-gradient-ocean text-primary-foreground px-7 py-3.5 font-semibold shadow-pop hover:scale-105 transition active:scale-95">
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
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">90%</span> en ligne</div>
                <div className="transition-transform hover:scale-110"><span className="font-bold text-foreground text-2xl">1</span> hackathon</div>
              </div>
            </div>
            <div className="relative animate-float">
              <div className="absolute -inset-8 bg-gradient-sun opacity-30 blur-3xl rounded-full" />
              <img src={heroImg} alt="Bootcamp Amphix — code et été" className="relative rounded-3xl shadow-pop w-full" />
            </div>
          </div>
        </section>

        {/* INFOS GÉNÉRALES */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { label: "Durée", value: "4 semaines", icon: "📅", grad: "bg-gradient-ocean" },
              { label: "Mode", value: "90% en ligne", icon: "💻", grad: "bg-gradient-sun" },
              { label: "Clôture", value: "Hackathon + Cérémonie", icon: "🎉", grad: "bg-gradient-coral" },
              { label: "Inscription", value: "5 000 FCFA", icon: "🎟️", grad: "bg-gradient-ocean" },
            ].map((c, i) => (
              <Reveal key={c.label} delay={i * 100}>
                <div className="relative rounded-2xl bg-card p-6 shadow-soft border border-border overflow-hidden hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
                  <div className={`absolute -right-6 -top-6 w-24 h-24 ${c.grad} rounded-full opacity-20`} />
                  <div className="text-3xl">{c.icon}</div>
                  <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</div>
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
              <Pill>💻 Semaines 1 & 3</Pill>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-5 font-display text-5xl font-bold">Formation intensive</h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-4 text-lg text-muted-foreground">Trois semaines de pratique animées par des expérimentés du secteur, à travers 10 modules essentiels.</p>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tracks.map((t, i) => (
              <Reveal key={t.title} delay={i * 80}>
                <div className="group rounded-2xl bg-card p-6 border border-border shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
                  <div className={`inline-flex w-14 h-14 items-center justify-center rounded-2xl text-3xl ${
                    t.color === "ocean" ? "bg-gradient-ocean" : t.color === "coral" ? "bg-gradient-coral" : "bg-gradient-sun"
                  }`}>{t.icon}</div>
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
              <span className="inline-block text-5xl animate-pulse">🔥</span>
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
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Reveal><Pill>🏆 Semaine 4</Pill></Reveal>
            <Reveal delay={100}><h2 className="mt-5 font-display text-5xl font-bold">Mini-Hackathon Amphix</h2></Reveal>
            <Reveal delay={200}><p className="mt-4 text-lg text-muted-foreground">En équipes, concevez une solution innovante répondant à un problème réel.</p></Reveal>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={0}>
              <div className="rounded-3xl bg-card p-8 border border-border shadow-soft hover:shadow-pop transition-shadow duration-300">
                <h3 className="font-display text-2xl font-bold flex items-center gap-2">🎯 Thématiques</h3>
                <div className="mt-5 flex flex-wrap gap-2">
                  {hackathonThemes.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors cursor-default">{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="rounded-3xl bg-card p-8 border border-border shadow-soft hover:shadow-pop transition-shadow duration-300">
                <h3 className="font-display text-2xl font-bold flex items-center gap-2">⚖️ Critères d'évaluation</h3>
                <ul className="mt-5 grid grid-cols-2 gap-3">
                  {criteria.map((c, i) => (
                    <li key={c} className="flex items-center gap-3 text-sm">
                      <span className="w-7 h-7 rounded-full bg-gradient-sun text-foreground font-bold flex items-center justify-center text-xs">{i+1}</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SUMMER FEST — Parallax section */}
        <section className="relative bg-gradient-coral text-accent-foreground py-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-[20%] w-64 h-64 rounded-full bg-white/5 blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-[10%] w-48 h-48 rounded-full bg-yellow-300/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-5xl animate-bounce">🎉</span>
              <h2 className="mt-4 font-display text-5xl font-bold">Amphix Summer Fest</h2>
              <p className="mt-4 text-lg opacity-95">Le jour de clôture : une journée exceptionnelle pour célébrer les réalisations des participants.</p>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { i: "🎤", t: "Présentation des projets" },
                { i: "🏆", t: "Remise des prix" },
                { i: "📜", t: "Certificats" },
                { i: "🎮", t: "Jeux & animations" },
                { i: "💃", t: "Ambiance & danse" },
                { i: "📸", t: "Séance photo" },
                { i: "🍽️", t: "Collation & repas" },
                { i: "🤝", t: "Networking" },
              ].map((a, i) => (
                <Reveal key={a.t} delay={i * 80}>
                  <div className="rounded-2xl bg-white/15 backdrop-blur p-5 border border-white/20 text-center hover:bg-white/25 hover:scale-105 transition-all duration-300">
                    <div className="text-3xl">{a.i}</div>
                    <div className="mt-2 text-sm font-semibold">{a.t}</div>
                  </div>
                </Reveal>
              ))}
            </div>
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
                { medal: "🥇", title: "15 000 FCFA", g: "bg-gradient-sun" },
                { medal: "🥈", title: "10 000 FCFA", g: "bg-gradient-ocean" },
                { medal: "🥉", title: "7 500 FCFA", g: "bg-gradient-coral" },
              ].map((p, i) => (
                <Reveal key={p.title} delay={i * 150}>
                  <div className={`rounded-3xl ${p.g} p-8 text-center text-primary-foreground shadow-pop hover:scale-105 transition-transform duration-300`} style={{ transform: i === 0 ? "scale(1.04)" : undefined }}>
                    <div className="text-6xl">{p.medal}</div>
                    <div className="mt-3 font-display text-2xl font-bold">{p.title}</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <Reveal delay={0}>
                <div className="rounded-2xl bg-card border border-border p-6 flex items-center gap-4 shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
                  <span className="text-4xl">🏅</span>
                  <div><div className="font-display text-xl font-bold">Prix du Public</div><div className="text-sm text-muted-foreground">Pour tous les participants</div></div>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="rounded-2xl bg-card border border-border p-6 flex items-center gap-4 shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all duration-300">
                  <span className="text-4xl">🎖️</span>
                  <div><div className="font-display text-xl font-bold">Certificat des participants</div><div className="text-sm text-muted-foreground">Pour tous les participants</div></div>
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

        {/* CTA INSCRIPTION */}
        <section id="inscription" className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <div className="relative rounded-[2.5rem] bg-gradient-ocean text-primary-foreground p-10 md:p-16 text-center overflow-hidden shadow-pop">
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-gradient-sun rounded-full opacity-30 blur-2xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-gradient-coral rounded-full opacity-30 blur-2xl animate-pulse" style={{ animationDelay: "1.5s" }} />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-2 text-sm font-semibold animate-pulse">
                  🎯 Places limitées
                </div>
                <h2 className="mt-6 font-display text-5xl md:text-6xl font-bold leading-tight">Réservez votre place dès maintenant</h2>
                <p className="mt-5 text-xl opacity-95">4 semaines · Innovation · Collaboration · Création</p>
                <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-4">
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-6 py-4 border border-white/20 hover:bg-white/25 transition-colors">
                    <div className="text-xs uppercase tracking-wider opacity-80">Inscription</div>
                    <div className="font-display text-3xl font-bold">5 000 FCFA</div>
                  </div>
                  <a href="https://wa.me/+22946244549" className="rounded-full bg-secondary text-secondary-foreground px-8 py-4 font-bold text-lg hover:scale-105 transition shadow-pop active:scale-95">
                    📞 Contact WhatsApp
                  </a>
                </div>
                <p className="mt-8 text-sm opacity-80">🌐 Organisé par Amphix 🚀</p>
              </div>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-border py-10">
          <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><span>🚀</span><span className="font-display font-bold text-foreground">Amphix</span> · Bootcamp 2026</div>
            <div>« Apprendre, Construire, Innover »</div>
          </div>
        </footer>
      </main>
    </>
  );
}