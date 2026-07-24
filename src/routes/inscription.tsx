"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import HandWrittenTitle from "@/components/ui/handwritteniitle";
import { trackLead, trackContact } from "@/lib/facebookPixel";
import emailjs from "@emailjs/browser";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Questionnaire — Bootcamp Amphix 2026" },
      {
        name: "description",
        content: "Questionnaire de qualification pour le Bootcamp Amphix 2026.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: QuestionnairePage,
});

/* ─── Types ──────────────────────────────────────────────────────────────── */
type QuestionType = "single" | "multiple";

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options: string[];
}

/* ─── Questions du questionnaire ─────────────────────────────────────────── */
const questions: Question[] = [
  {
    id: 1,
    text: "As-tu un ordinateur portable personnel ?",
    type: "single",
    options: ["Oui", "Je peux en emprunter un", "Non"],
  },
  {
    id: 2,
    text: "As-tu une connexion Internet suffisante pour suivre les sessions ?",
    type: "single",
    options: [
      "Oui, tous les jours",
      "Oui, mais seulement certains jours",
      "Je compte utiliser un cyber ou le partage de connexion",
      "Pas encore",
    ],
  },
  {
    id: 3,
    text: "Quel est ton objectif principal en rejoignant ce Bootcamp ?",
    type: "single",
    options: [
      "M'occuper pendant les vacances",
      "Devenir développeur web",
      "Développer mes compétences",
      "Réaliser mes propres projets",
    ],
  },
  {
    id: 4,
    text: "Aujourd'hui, quelle situation te correspond le mieux ?",
    type: "single",
    options: [
      "Je débute complètement",
      "J'ai déjà quelques bases",
      "Je sais coder mais je manque de pratique",
      "Je réalise déjà quelques projets",
    ],
  },
  {
    id: 5,
    text: "Qu'est-ce qui t'a donné envie de réserver ta place ?",
    type: "single",
    options: [
      "Je veux enfin passer à la pratique",
      "Je veux apprendre avec un accompagnement",
      "Je veux construire un vrai projet",
      "Un ami me l'a recommandé",
    ],
  },
  {
    id: 6,
    text: "Quel est aujourd'hui ton plus grand défi ?",
    type: "single",
    options: [
      "Je ne sais pas par où commencer",
      "J'apprends seul mais je progresse lentement",
      "Je n'ai personne pour me guider",
      "Je manque d'expérience sur des projets réels",
      "Je veux enrichir mon CV",
    ],
  },
];

/* ─── Animation variants ─────────────────────────────────────────────────── */
const slideVariants = {
  enter: (direction: "next" | "prev") => ({
    x: direction === "next" ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "next" | "prev") => ({
    x: direction === "next" ? -60 : 60,
    opacity: 0,
  }),
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
function QuestionnairePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Étape courante : formulaire d'accueil → questionnaire → page finale
  const [stage, setStage] = useState<"lead" | "questionnaire" | "finished">("lead");
  const [leadName, setLeadName] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadError, setLeadError] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Compteur d'inscrits — urgence (global, partagé entre tous les visiteurs via Supabase)
  const TOTAL_PLACES = 200;
  const INITIAL_REGISTERED = 50;
  const [registeredCount, setRegisteredCount] = useState(INITIAL_REGISTERED);

  const currentQuestion = questions[currentStep];
  const totalQuestions = questions.length;
  const currentAnswer = answers[currentQuestion.id];

  // Récupérer l'ID participant depuis l'URL ou le localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("pid") || localStorage.getItem("amphix_participant_id");
    if (pid) {
      setParticipantId(pid);
      setStage("questionnaire");
    }
  }, []);

  // Récupérer le compteur d'inscrits depuis Supabase (compteur global, partagé)
  useEffect(() => {
    const fetchCount = async () => {
      const { data, error } = await supabase
        .from("registration_stats")
        .select("registered_count")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setRegisteredCount(
          Math.min(Math.max(data.registered_count, INITIAL_REGISTERED), TOTAL_PLACES)
        );
      }
    };
    fetchCount();

    // Écoute en temps réel : le compteur se met à jour tout seul chez
    // tous les visiteurs dès qu'une personne (n'importe où) clique sur "Payer".
    const channel = supabase
      .channel("registration_stats_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "registration_stats" },
        (payload) => {
          const newCount = payload.new?.registered_count;
          if (typeof newCount === "number") {
            setRegisteredCount(Math.min(Math.max(newCount, INITIAL_REGISTERED), TOTAL_PLACES));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Incrémente le compteur d'inscrits (global, Supabase) à chaque clic sur "Payer"
  const incrementRegisteredCount = async () => {
    // Mise à jour optimiste immédiate côté UI
    setRegisteredCount((prev) => Math.min(prev + 1, TOTAL_PLACES));

    try {
      const { data, error } = await supabase.rpc("increment_registered_count");
      if (!error && typeof data === "number") {
        setRegisteredCount(Math.min(Math.max(data, INITIAL_REGISTERED), TOTAL_PLACES));
      }
    } catch (e) {
      console.error("Erreur incrémentation compteur inscrits:", e);
    }
  };

  // Sauvegarder automatiquement dans Supabase
  const saveAnswer = useCallback(
    async (questionId: number, value: string | string[]) => {
      if (!participantId) return;
      try {
        await supabase.from("questionnaire_responses").upsert(
          {
            participant_id: participantId,
            question_id: questionId,
            answer: Array.isArray(value) ? value.join(",") : value,
          },
          { onConflict: "participant_id,question_id" }
        );
      } catch (e) {
        console.error("Erreur sauvegarde:", e);
      }
    },
    [participantId]
  );

  // Envoie un email avec les infos du lead (Nom + WhatsApp) via EmailJS
  const sendLeadEmail = async (name: string, whatsapp: string) => {
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          nom_prenom: name,
          whatsapp: whatsapp,
          date: new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
    } catch (e) {
      console.error("Erreur envoi email lead:", e);
    }
  };

  // Soumission du formulaire d'accueil (Nom & Prénom + WhatsApp)
  const handleLeadSubmit = async () => {
    if (!leadName.trim() || !leadWhatsapp.trim()) {
      setLeadError("Merci de remplir tous les champs pour continuer.");
      return;
    }
    setLeadError("");
    setIsSubmittingLead(true);

    const newParticipantId = participantId || crypto.randomUUID();
    setParticipantId(newParticipantId);
    localStorage.setItem("amphix_participant_id", newParticipantId);

    try {
      await supabase.from("form_leads").insert({
        id: newParticipantId,
        full_name: leadName.trim(),
        whatsapp: leadWhatsapp.trim(),
      });

      await supabase.from("tracking_events").insert({
        event_type: "lead_form_submitted",
        participant_id: newParticipantId,
        metadata: { full_name: leadName.trim(), whatsapp: leadWhatsapp.trim() },
      });
    } catch (e) {
      console.error("Erreur sauvegarde lead:", e);
    }

    // Email de notification à l'équipe avec les coordonnées du prospect
    await sendLeadEmail(leadName.trim(), leadWhatsapp.trim());

    trackLead();

    setIsSubmittingLead(false);
    setStage("questionnaire");
  };

  const handleSelect = (option: string) => {
    if (isAnimating) return;

    const newAnswers = { ...answers };

    if (currentQuestion.type === "multiple") {
      const current = (newAnswers[currentQuestion.id] as string[]) || [];
      if (current.includes(option)) {
        newAnswers[currentQuestion.id] = current.filter((o) => o !== option);
      } else {
        newAnswers[currentQuestion.id] = [...current, option];
      }
    } else {
      newAnswers[currentQuestion.id] = option;
    }

    setAnswers(newAnswers);
    saveAnswer(currentQuestion.id, newAnswers[currentQuestion.id]);
  };

  const handleNext = () => {
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) return;
    if (currentStep < totalQuestions - 1) {
      setDirection("next");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setIsAnimating(false);
      }, 350);
    } else {
      finishQuestionnaire();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection("prev");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s - 1);
        setIsAnimating(false);
      }, 350);
    }
  };

  const finishQuestionnaire = async () => {
  setIsSubmitting(true);

  if (participantId) {
    await supabase
      .from("participants")
      .update({ questionnaire_completed: true })
      .eq("id", participantId);
  }

  try {
    await supabase.from("tracking_events").insert({
      event_type: "questionnaire_completed",
      participant_id: participantId,
      metadata: { answers_count: Object.keys(answers).length },
    });
  } catch (e) {
    console.error(e);
  }

  // ✅ Nouvel événement Meta
  trackLead();

  setStage("finished");
  setIsSubmitting(false);
};
  /* ─── Page Finale ──────────────────────────────────────────────────────── */
if (stage === "finished") {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 font-['Inter',sans-serif]">
      <div className="max-w-xl w-full">

        {/* ── Styles pour la lueur blanche et l'animation bloquée ── */}
        <style>{`
          @keyframes white-glow-pulse {
            0%, 100% {
              box-shadow: inset 0 0 8px 2px rgba(255, 255, 255, 0.6),
                          0 0 6px 2px rgba(255, 255, 255, 0.4);
            }
            50% {
              box-shadow: inset 0 0 20px 6px rgba(255, 255, 255, 0.9),
                          0 0 16px 6px rgba(255, 255, 255, 0.7);
            }
          }
          @keyframes progress-blocked {
            0%   { width: 71%; }
            40%  { width: 78%; }
            50%  { width: 78%; }
            60%  { width: 75%; }
            70%  { width: 75%; }
            80%  { width: 71%; }
            100% { width: 71%; }
          }
          .white-glow-pulse {
            animation: white-glow-pulse 2s ease-in-out infinite;
            will-change: box-shadow;
          }
          .progress-blocked {
            animation: progress-blocked 2.5s ease-in-out infinite;
            will-change: width;
          }
          @media (prefers-reduced-motion: reduce) {
            .white-glow-pulse, .progress-blocked {
              animation: none;
            }
          }
        `}</style>

        {/* Barre d'urgence — Places restantes (jaune) */}
        <motion.div
          className="rounded-2xl bg-yellow-50 border-2 border-yellow-400 p-4 sm:p-5 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-[11px] sm:text-sm font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-1.5">
              🔥 Places limitées
            </span>
            <span className="text-[11px] sm:text-sm font-bold text-yellow-800 whitespace-nowrap">
              {registeredCount}/{TOTAL_PLACES} inscrits
            </span>
          </div>
          <div className="h-2.5 sm:h-3 bg-yellow-100 rounded-full overflow-hidden relative">
            <div
              className="progress-blocked h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full relative"
            >
              <div className="white-glow-pulse absolute inset-0 rounded-full" />
            </div>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-yellow-700">
            Il ne reste que {TOTAL_PLACES - registeredCount} places disponibles sur {TOTAL_PLACES}.
          </p>
        </motion.div>

        {/* HandWrittenTitle avec animation Framer Motion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="scale-75 sm:scale-90 md:scale-100 origin-center"
        >
          <HandWrittenTitle
            title="Ta candidature est enregistrée !"
            subtitle="Le Bootcamp Amphix semble parfaitement correspondre à ton profil."
          />
        </motion.div>

        <motion.p
          className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed text-center px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <strong className="text-gray-900">Il te reste une seule et dernière étape : rejoindre la communauté Amphix.</strong>
        </motion.p>

        {/* Rejoindre la communauté — Dernière étape */}
        <motion.div
          className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-6 mb-6 sm:mb-8 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
            Rejoins le groupe WhatsApp pour finaliser ton inscription
          </h3>
          <ul className="space-y-2 text-gray-600 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Clique sur le bouton "Rejoindre la communauté" ci-dessous</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Un membre de l'équipe Amphix t'y accompagnera directement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Il t'aidera à finaliser ton inscription au Bootcamp</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span><strong>Ta place sera alors officiellement réservée</strong></span>
            </li>
          </ul>
        </motion.div>

        {/* ⚠️ Alerte urgence */}
        <motion.div
          className="rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-4 mb-6 sm:mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.8 }}
        >
          <p className="text-xs sm:text-sm text-amber-800 font-medium">
            ⚠️ Les places sont limitées à 200 participants. Rejoins la communauté dès maintenant pour garantir ta place.
          </p>
        </motion.div>

        {/* Bouton Rejoindre la communauté — CTA fort */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          <a
            href="https://chat.whatsapp.com/Be0nwy6eOtt2bgqmZICx7f"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 sm:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg hover:bg-[#128C7E] transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg w-full sm:w-auto sm:mx-auto touch-manipulation"
            onClick={async () => {
              trackContact(); // ← événement Meta
              await incrementRegisteredCount(); // ← incrémente le compteur global (Supabase)
              if (participantId) {
                try {
                  await supabase.from("tracking_events").insert({
                    event_type: "community_join_click",
                    participant_id: participantId,
                  });
                } catch (e) {
                  console.error("Erreur tracking communauté:", e);
                }
              }
            }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Rejoindre la communauté</span>
          </a>
          <p className="mt-3 text-xs text-gray-400">
            Tu seras redirigé vers WhatsApp pour rejoindre la communauté Amphix
          </p>
        </motion.div>
      </div>
    </main>
  );
}

  /* ─── Formulaire d'accueil ──────────────────────────────────────────────── */
  if (stage === "lead") {
    return (
      <LeadFormScreen
        leadName={leadName}
        setLeadName={setLeadName}
        leadWhatsapp={leadWhatsapp}
        setLeadWhatsapp={setLeadWhatsapp}
        leadError={leadError}
        isSubmittingLead={isSubmittingLead}
        onSubmit={handleLeadSubmit}
      />
    );
  }

  /* ─── Questionnaire ────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-white font-['Inter',sans-serif] flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="pt-6 sm:pt-10 pb-2 sm:pb-4 text-center px-4">
        <h1 className="text-xs sm:text-sm font-semibold text-gray-900 tracking-wide uppercase">
          Questionnaire Bootcamp
        </h1>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
          Question {currentStep + 1} sur {totalQuestions}
        </p>
      </header>

      {/* Progress bar */}
      <div className="max-w-xs sm:max-w-md mx-auto px-4 sm:px-6 mb-8 sm:mb-12 w-full">
        <div className="h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gray-900 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-4 sm:px-6 pb-8 w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {/* Question number */}
            <div className="text-xs sm:text-sm font-medium text-gray-400 mb-3 sm:mb-4">
              {currentQuestion.id}.
            </div>

            {/* Question text */}
            <h2 className="text-lg sm:text-xl md:text-2xl font-normal text-gray-900 leading-snug sm:leading-relaxed mb-6 sm:mb-10">
              {currentQuestion.text}
            </h2>

            {/* Options */}
            <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-8 sm:mb-12">
              {currentQuestion.options.map((option) => {
                const isSelected =
                  currentQuestion.type === "multiple"
                    ? (currentAnswer as string[])?.includes(option)
                    : currentAnswer === option;

                return (
                  <motion.button
                    key={option}
                    onClick={() => handleSelect(option)}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      relative px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-200 select-none touch-manipulation
                      ${isSelected
                        ? "bg-[#a3e635] border-[#a3e635] text-gray-900 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                      }
                    `}
                  >
                    {isSelected && (
                      <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2">
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                    <span className={isSelected ? "pl-4 sm:pl-5" : ""}>{option}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-gray-100">
              <motion.button
                onClick={handlePrev}
                disabled={currentStep === 0 || isAnimating}
                whileTap={{ scale: 0.95 }}
                className={`
                  text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded touch-manipulation
                  ${currentStep === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                ← Précédent
              </motion.button>

              <motion.button
                onClick={handleNext}
                disabled={
                  !currentAnswer ||
                  (Array.isArray(currentAnswer) && currentAnswer.length === 0) ||
                  isAnimating ||
                  isSubmitting
                }
                whileTap={{ scale: 0.95 }}
                className={`
                  inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation
                  ${!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg"
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enregistrement...</span>
                  </>
                ) : currentStep === totalQuestions - 1 ? (
                  <>
                    <span>Terminer</span>
                    <span>→</span>
                  </>
                ) : (
                  <>
                    <span>Suivant</span>
                    <span>→</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ─── Formulaire d'accueil (Nom & Prénom + WhatsApp) ─────────────────────── */
/* Défini en dehors de QuestionnairePage : sinon React le recrée à chaque
   frappe et démonte/remonte le formulaire (perte de focus, effet "ça se
   réactualise"). */
function LeadFormScreen({
  leadName,
  setLeadName,
  leadWhatsapp,
  setLeadWhatsapp,
  leadError,
  isSubmittingLead,
  onSubmit,
}: {
  leadName: string;
  setLeadName: (v: string) => void;
  leadWhatsapp: string;
  setLeadWhatsapp: (v: string) => void;
  leadError: string;
  isSubmittingLead: boolean;
  onSubmit: () => void;
}) {
  return (
    <main className="min-h-screen bg-white font-['Inter',sans-serif] flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      <div className="max-w-md w-full">
        {/* Notification — un membre de l'équipe va accompagner */}
        <motion.div
          className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-5 mb-6 sm:mb-8 flex items-start gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xl sm:text-2xl shrink-0">👋</span>
          <p className="text-xs sm:text-sm text-sky-800 leading-relaxed">
            <strong>Un membre de l'équipe Amphix vous accompagnera</strong> personnellement pour
            finaliser votre inscription au Bootcamp.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 text-center">
            Avant de commencer
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 text-center">
            Laisse-nous tes coordonnées pour qu'on puisse te recontacter.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Nom &amp; Prénom
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Ex : Awa DOSSOU"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Numéro WhatsApp
              </label>
              <input
                type="tel"
                value={leadWhatsapp}
                onChange={(e) => setLeadWhatsapp(e.target.value)}
                placeholder="Ex :+229 90 00 00 00"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>
            

            {leadError && (
              <p className="text-xs sm:text-sm text-red-500">{leadError}</p>
            )}

            <motion.button
              onClick={onSubmit}
              disabled={isSubmittingLead}
              whileTap={{ scale: 0.97 }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
            >
              {isSubmittingLead ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Envoi...</span>
                </>
              ) : (
                <span>Valider</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}