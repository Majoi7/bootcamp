"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { AuroraBackground } from "@/components/ui/aurora-background";
import RoundCarousel from "@/components/round-carousel";
import {
  Palette,
  Clapperboard,
  Briefcase,
  Workflow,
  Code2,
  Flame,
  Trophy,
  Check,
  X,
  ArrowRight,
  Laptop,
  Wifi,
  Sparkles,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "Bootcamp Amphix 2026 — Présentation" },
      {
        name: "description",
        content:
          "Découvre le Bootcamp Amphix : 7 modules, un Hackathon final, et un portfolio de projets réels. Formation 100% pratique, 10 000 FCFA.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: PresentationPage,
});

/* ─── Données des modules (cadres colorés → modal ou carousel) ───────────── */
/* Palette inspirée de l'affiche "1er Août — BootCamp" : bleu, orange, violet,
   rouge/corail, turquoise (palmiers), jaune sable, bleu nuit. */
type Module = {
  icon: typeof Palette;
  title: string;
  tagline: string;
  goal: string;
  items: string[];
  color: string; // couleur de fond du cadre
};

const MODULES: Module[] = [
  {
    icon: Palette,
    title: "Vibe Design",
    tagline: "Concevoir des interfaces modernes",
    goal: "Transformer une idée en une interface magnifique.",
    items: ["Figma", "Design UI", "UX", "Wireframes", "Prototypes", "Design Systems", "Interfaces professionnelles"],
    color: "#1BA3D6", // bleu "Boot"
  },
  {
    icon: Clapperboard,
    title: "Vibe Motion Design",
    tagline: "Produire des contenus qui vendent",
    goal: "Produire rapidement des contenus professionnels.",
    items: ["Publicités", "Vidéos TikTok", "Reels", "Shorts", "Animations", "Contenus IA"],
    color: "#F5A623", // orange "Camp"
  },
  {
    icon: Briefcase,
    title: "Gestion de projet & Business",
    tagline: "UX/UI · Marketing · Business",
    goal: "La méthode utilisée par les startups.",
    items: [
      "Gérer une équipe",
      "Organiser un projet",
      "Vendre une idée",
      "Comprendre les utilisateurs",
      "Lancer un produit",
    ],
    color: "#8B5CF6", // violet (ballon / ballon de plage)
  },
  {
    icon: Workflow,
    title: "Automatisation",
    tagline: "Faire travailler l'IA pour toi",
    goal: "Gagner du temps grâce à l'automatisation.",
    items: [
      "Tâches répétitives",
      "Création de contenu",
      "Réponses automatiques",
      "Workflows",
      "Outils de productivité",
    ],
    color: "#E4572E", // rouge/corail (parasol, ballon)
  },
  {
    icon: Code2,
    title: "Vibe Coding",
    tagline: "Créer des applications avec l'IA",
    goal: "Produire rapidement des solutions réelles.",
    items: ["Créer un site", "Créer une application", "Créer une API", "Utiliser l'IA comme copilote"],
    color: "#0E9AA7", // turquoise (palmiers)
  },
  {
    icon: Flame,
    title: "Campfire",
    tagline: "Un moment d'échange entre participants",
    goal: "C'est là que naissent souvent les meilleurs projets.",
    items: ["Partager ses idées", "Présenter ses difficultés", "Recevoir des conseils", "Travailler ensemble"],
    color: "#FDC500", // jaune sable
  },
  {
    icon: Trophy,
    title: "Hackathon",
    tagline: "Le grand final du Bootcamp",
    goal: "Créer une solution numérique face à un vrai problème.",
    items: ["Trouver un problème", "Imaginer une solution", "Créer un prototype", "Présenter son projet"],
    color: "#0B5D8C", // bleu nuit (écran d'ordinateur)
  },
];

/* ─── Images du Round Carousel pour "Vibe Design" ─────────────────────────── */
/* Place tes images (captures Figma, interfaces créées, etc.) dans le dossier
   public/modules/vibe-design/ avec exactement ces noms de fichiers.
   Tu peux en ajouter/retirer, il suffit d'ajuster ce tableau en conséquence. */
const VIBE_DESIGN_IMAGES = [
  { src: "/modules/vibe-design/1.png" },
  { src: "/modules/vibe-design/2.png" },
  { src: "/modules/vibe-design/3.png" },
  { src: "/modules/vibe-design/4.png" },
  { src: "/modules/vibe-design/5.png" },
  { src: "/modules/vibe-design/6.png" },
];

/* ─── Main Component ─────────────────────────────────────────────────────── */
function PresentationPage() {
  const [openModule, setOpenModule] = useState<number | null>(null);
  const [showVibeDesignCarousel, setShowVibeDesignCarousel] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll fluide (Lenis), synchronisé avec GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
    };
  }, []);

  // Révélations au scroll (GSAP + ScrollTrigger)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 87%" },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".reveal-stagger").forEach((group) => {
        gsap.fromTo(
          group.children,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: group, start: "top 85%" },
          }
        );
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  // Fermer la modal avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenModule(null);
        setShowVibeDesignCarousel(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={rootRef} className="bg-white font-['Inter',sans-serif] text-slate-900 overflow-x-hidden">
      {/* ── HERO — AuroraBackground ── */}
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center px-4 sm:px-6 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-700 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Webinaire officiel
          </span>

          <h1 className="font-extrabold uppercase leading-[0.9] tracking-tight text-[16vw] sm:text-[11vw] md:text-[9rem] text-slate-900">
            Bootcamp
          </h1>
          <div className="mt-1 sm:mt-2 text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            AMPHIX
          </div>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Une formation intensive, 100&nbsp;% pratique, pour construire de vrais projets, apprendre
            comme dans une startup, et repartir avec un portfolio — pas juste des notions.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/inscription"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-7 py-3.5 font-semibold hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
            >
              Rejoindre le Bootcamp
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#modules"
              className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-slate-200 text-slate-700 px-7 py-3.5 font-semibold hover:bg-white transition-all duration-200"
            >
              Voir les modules
            </a>
          </div>
        </motion.div>
      </AuroraBackground>

      {/* ── BIENVENUE / INTRO ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center reveal">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">Bienvenue</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mb-5">
          Une opportunité qui peut transformer tes vacances — et ton avenir.
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Ici, on te montre ce qu'est réellement le Bootcamp Amphix, comment il se déroule, ce que
          tu vas apprendre, et pourquoi c'est maintenant qu'il faut entrer dans le numérique.
        </p>
      </section>

      {/* ── C'EST QUOI LE BOOTCAMP ── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="reveal">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              C'est quoi, concrètement ?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5 leading-snug">
              Une formation 100&nbsp;% pratique, pas un cours théorique de plus.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Notre objectif n'est pas de vous apprendre à utiliser des logiciels. C'est de vous
              apprendre à créer des projets réels, résoudre de vrais problèmes, et développer des
              compétences que les entreprises recherchent vraiment.
            </p>
          </div>

          <ul className="reveal-stagger space-y-3">
            {[
              "Créer des projets réels",
              "Travailler en équipe",
              "Résoudre de vrais problèmes",
              "Développer des compétences recherchées par les entreprises",
              "Créer vos propres solutions numériques",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl bg-white border border-slate-200 p-4 shadow-sm"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm sm:text-base text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── À QUI S'ADRESSE LE BOOTCAMP ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-12 reveal">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            À qui s'adresse le Bootcamp ?
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Pas besoin d'être déjà développeur.
          </h2>
        </div>

        <div className="reveal-stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {[
            "Étudiants",
            "Nouveaux bacheliers",
            "Passionnés d'informatique",
            "Futurs freelances",
            "Créateurs de SaaS",
            "Entrepreneurs digitaux",
            "Curieux du numérique",
          ].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 text-center"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="reveal rounded-2xl bg-blue-50 border border-blue-100 p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-slate-700 mb-4">
            Même si tu pars de zéro, le programme est conçu pour t'accompagner étape par étape. La
            seule chose qu'on demande :
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Laptop className="w-5 h-5 text-blue-600" /> Un ordinateur
            </span>
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Wifi className="w-5 h-5 text-blue-600" /> Une connexion Internet
            </span>
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Sparkles className="w-5 h-5 text-blue-600" /> La motivation
            </span>
          </div>
        </div>
      </section>

      {/* ── COMMENT PARTICIPER (étapes) ── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Comment participer ?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Le processus est très simple.</h2>
          </div>

          <ol className="reveal-stagger space-y-4">
            {[
              "Remplir le formulaire d'inscription",
              "Régler les frais d'inscription",
              "Rejoindre le groupe privé WhatsApp",
              "Recevoir toutes les informations du Bootcamp",
              "Participer aux différentes sessions",
            ].map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-4 rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm"
              >
                <span className="shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-sm">
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── LE PRIX ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center reveal">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">Le prix</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          Un prix volontairement accessible.
        </h2>
        <div className="inline-flex items-baseline gap-2 mb-6">
          <span className="text-5xl sm:text-6xl font-extrabold text-red-600">10 000</span>
          <span className="text-xl sm:text-2xl font-semibold text-slate-500">FCFA</span>
        </div>
        <p className="text-slate-600 leading-relaxed max-w-xl mx-auto">
          Aujourd'hui, apprendre ces compétences peut coûter plusieurs centaines de milliers de
          francs. Notre objectif est de rendre cette formation accessible au plus grand nombre.
        </p>
      </section>

      {/* ── LES MODULES (cadres colorés → modal ou carousel) ── */}
      <section id="modules" className="py-20 sm:py-28" style={{ backgroundColor: "#FDF3E1" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 reveal">
            <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#E4572E" }}>
              Le programme
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">7 modules pour tout construire.</h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Clique sur un module pour en découvrir le contenu.
            </p>
          </div>

          <div className="reveal-stagger grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {MODULES.map((mod, i) => {
              const isVibeDesign = mod.title === "Vibe Design";
              const rotate = i % 2 === 0 ? "-1.5deg" : "1.5deg";
              return (
                <button
                  key={mod.title}
                  onClick={() => (isVibeDesign ? setShowVibeDesignCarousel(true) : setOpenModule(i))}
                  style={{ backgroundColor: mod.color, transform: `rotate(${rotate})` }}
                  className="group aspect-square rounded-3xl flex items-center justify-center p-4 sm:p-5 shadow-md hover:shadow-xl hover:!rotate-0 hover:scale-105 transition-all duration-300"
                >
                  <span className="text-white font-extrabold text-center text-base sm:text-lg leading-tight drop-shadow-sm">
                    {mod.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MODAL — Round Carousel (Vibe Design) ── */}
      <AnimatePresence>
        {showVibeDesignCarousel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
            onClick={() => setShowVibeDesignCarousel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative bg-black rounded-3xl max-w-lg w-full aspect-square overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVibeDesignCarousel(false)}
                aria-label="Fermer"
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center backdrop-blur transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-4 left-4 z-10 text-white/80 text-xs font-medium uppercase tracking-wide">
                Vibe Design
              </div>
              <RoundCarousel images={VIBE_DESIGN_IMAGES} imageWidth={280} imageHeight={280} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QUE DEVIENNENT LES PROJETS ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center reveal">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
          Que deviennent les projets ?
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5 leading-snug">
          Une galerie qui raconte l'histoire du Bootcamp.
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Tous les projets réalisés sont publiés dans la galerie du Hackathon Amphix. Les futures
          promotions pourront découvrir les anciens projets et s'inspirer des meilleures
          réalisations. Les codes sources restent privés — seuls les projets sont visibles.
        </p>
      </section>

      {/* ── RÉCOMPENSES ── */}
      <section className="bg-slate-900 text-white py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center reveal">
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">
            Les récompenses
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-5 leading-snug">
            Les 3 meilleures équipes rejoignent Amphix Agence.
          </h2>
          <p className="text-slate-300 leading-relaxed max-w-xl mx-auto">
            En plus de leurs nouvelles compétences, elles auront l'opportunité de participer à de
            vrais projets professionnels et de continuer à développer leur expérience.
          </p>
        </div>
      </section>

      {/* ── COMMENT VA SE PASSER LE BOOTCAMP ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-10 reveal">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Le déroulement
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Chaque semaine, plusieurs temps forts.
          </h2>
        </div>
        <div className="reveal-stagger grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            "Cours en direct",
            "Exercices pratiques",
            "Défis",
            "Travaux en équipe",
            "Accompagnement personnalisé",
            "Échanges communautaires",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-sm font-medium text-slate-700">{item}</p>
            </div>
          ))}
        </div>
        <p className="reveal mt-8 text-center text-slate-500 text-sm sm:text-base">
          Vous ne serez jamais seul : notre équipe vous guide jusqu'à la réalisation de votre projet.
        </p>
      </section>

      {/* ── POURQUOI C'EST LE MEILLEUR MOMENT ── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Pourquoi maintenant ?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Nous vivons une révolution.</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 reveal-stagger">
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hier</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>Beaucoup d'argent</li>
                <li>Une grande entreprise</li>
                <li>Plusieurs employés</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-900 text-white p-6">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">
                Aujourd'hui
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                Une seule personne peut créer une application utilisée par des milliers de personnes.
                Grâce à l'IA, il est désormais possible de construire beaucoup plus vite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── C'EST QUOI UN SAAS ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="reveal">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            C'est quoi un SaaS ?
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5 leading-snug">
            Software as a Service
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Un logiciel accessible directement sur Internet, sans installation complexe. Les
            utilisateurs paient généralement un abonnement pour l'utiliser — un SaaS peut générer
            des revenus récurrents et évoluer à grande échelle.
          </p>
        </div>
        <ul className="reveal-stagger grid grid-cols-2 gap-3">
          {[
            "Facturation",
            "Gestion scolaire",
            "CRM",
            "Réservation",
            "Gestion de pharmacie",
            "Gestion de stock",
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm font-medium text-slate-700 text-center"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── SECTEURS PEU EXPLOITÉS EN AFRIQUE ── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3 reveal">
            Des opportunités partout
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 reveal">
            Chaque problème est une opportunité de créer une entreprise.
          </h2>
          <div className="reveal-stagger flex flex-wrap justify-center gap-2.5">
            {[
              "Agriculture intelligente",
              "Santé numérique",
              "Éducation",
              "Transport",
              "Immobilier",
              "Tourisme",
              "Commerce local",
              "Logistique",
              "Paiement",
              "Administration",
              "Gestion scolaire",
              "Gestion hospitalière",
              "Artisanat",
              "Énergie",
              "Assurance",
            ].map((sector) => (
              <span
                key={sector}
                className="rounded-full bg-white border border-slate-200 px-4 py-2 text-sm text-slate-700"
              >
                {sector}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAS BESOIN D'ATTENDRE UNE LICENCE ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center reveal">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
          Et le diplôme, alors ?
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5 leading-snug">
          Pas besoin d'attendre une Licence ou un Master.
        </h2>
        <p className="text-slate-600 leading-relaxed">
          De nombreux jeunes développent des applications, des plateformes et des entreprises
          numériques tout en poursuivant leurs études. Les compétences et les réalisations comptent
          souvent davantage que le diplôme seul — qui reste précieux, mais n'est plus la seule porte
          d'entrée vers la réussite.
        </p>
      </section>

      {/* ── CONCLUSION / CTA FINAL ── */}
      <section className="relative overflow-hidden bg-slate-900 py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-transparent" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center reveal">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-5 leading-snug">
            Qui pense rejoindre le Bootcamp Amphix ?
          </h2>
          <p className="text-slate-300 leading-relaxed mb-8">
            Le Bootcamp Amphix n'est pas simplement une formation : c'est une communauté, une
            expérience, un accélérateur de carrière. Si tu es prêt(e) à investir dans tes
            compétences, c'est le moment de nous rejoindre.
          </p>
          <a
            href="/inscription"
            className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-8 py-4 font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
          >
            Rejoindre le Bootcamp
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── MODAL — Détail d'un module ── */}
      <AnimatePresence>
        {openModule !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
            onClick={() => setOpenModule(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpenModule(null)}
                aria-label="Fermer"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {(() => {
                const mod = MODULES[openModule];
                const Icon = mod.icon;
                return (
                  <>
                    <span className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </span>
                    <p className="text-xs font-mono text-slate-400 mb-1">
                      Module 0{openModule + 1}
                    </p>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{mod.title}</h3>
                    <p className="text-sm text-slate-500 mb-5">{mod.tagline}</p>

                    <ul className="space-y-2 mb-5">
                      {mod.items.map((item) => (
                        <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        Objectif
                      </p>
                      <p className="text-sm text-slate-700">{mod.goal}</p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}