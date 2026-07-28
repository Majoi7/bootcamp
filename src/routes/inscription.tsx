"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
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

/* ─── Main Component ─────────────────────────────────────────────────────── */
/* ─── Questions de qualification (posées une par une) ────────────────────── */
const QUALIFY_QUESTIONS: { text: string; requirement: string }[] = [
  { text: "As-tu un ordinateur ?", requirement: "un ordinateur" },
  { text: "As-tu une connexion Internet ?", requirement: "une connexion Internet" },
  {
    text: "Es-tu prêt(e) à payer les frais d'inscription de 10 000 F ?",
    requirement: "le paiement des frais d'inscription (10 000 F)",
  },
];

function QuestionnairePage() {
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Étape courante : questions de qualification → formulaire d'accueil → page "rejoindre la communauté"
  const [stage, setStage] = useState<"qualify" | "lead" | "community">("qualify");

  // Questions de qualification posées une par une (PC, internet, frais d'inscription)
  const [qualifyStep, setQualifyStep] = useState(0);
  const [qualifyWarning, setQualifyWarning] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadCountryCode, setLeadCountryCode] = useState("+229"); // Bénin par défaut
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadError, setLeadError] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/Be0nwy6eOtt2bgqmZICx7f";

  // Compteur d'inscrits — urgence (global, partagé entre tous les visiteurs via Supabase)
  const TOTAL_PLACES = 200;
  const INITIAL_REGISTERED = 50;
  const [registeredCount, setRegisteredCount] = useState(INITIAL_REGISTERED);

  // Récupérer l'ID participant depuis l'URL ou le localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("pid") || localStorage.getItem("amphix_participant_id");
    if (pid) {
      setParticipantId(pid);
      setStage("community");
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
    } catch (e: any) {
      console.error("Erreur envoi email lead:", e?.status, e?.text || e?.message || e);
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

    const fullWhatsapp = `${leadCountryCode} ${leadWhatsapp.trim()}`;
    const newParticipantId = participantId || crypto.randomUUID();
    setParticipantId(newParticipantId);
    localStorage.setItem("amphix_participant_id", newParticipantId);

    try {
      await supabase.from("form_leads").insert({
        id: newParticipantId,
        full_name: leadName.trim(),
        whatsapp: fullWhatsapp,
      });

      await supabase.from("tracking_events").insert({
        event_type: "lead_form_submitted",
        participant_id: newParticipantId,
        metadata: { full_name: leadName.trim(), whatsapp: fullWhatsapp },
      });
    } catch (e) {
      console.error("Erreur sauvegarde lead:", e);
    }

    // Email de notification à l'équipe avec les coordonnées du prospect
    await sendLeadEmail(leadName.trim(), fullWhatsapp);

    trackLead();

    setIsSubmittingLead(false);
    setStage("community");
  };

  // Clic sur "Rejoindre la communauté" → tracking puis ouverture du groupe WhatsApp
  const handleJoinCommunityClick = async () => {
    trackContact(); // ← événement Meta

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
  };
  // Réponse à une question de qualification : "Oui" → question suivante (ou formulaire),
  // "Non" → modal d'avertissement rouge, on reste bloqué sur la question
  const handleQualifyAnswer = (answer: "oui" | "non") => {
    if (answer === "non") {
      setQualifyWarning(QUALIFY_QUESTIONS[qualifyStep].requirement);
      return;
    }
    if (qualifyStep < QUALIFY_QUESTIONS.length - 1) {
      setQualifyStep((s) => s + 1);
    } else {
      setStage("lead");
    }
  };

  /* ─── Questions de qualification ──────────────────────────────────────── */
  if (stage === "qualify") {
    return (
      <QualifyScreen
        step={qualifyStep}
        totalSteps={QUALIFY_QUESTIONS.length}
        question={QUALIFY_QUESTIONS[qualifyStep].text}
        warning={qualifyWarning}
        onAnswer={handleQualifyAnswer}
        onCloseWarning={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  /* ─── Formulaire d'accueil ──────────────────────────────────────────────── */
  if (stage === "lead") {
    return (
      <LeadFormScreen
        leadName={leadName}
        setLeadName={setLeadName}
        leadCountryCode={leadCountryCode}
        setLeadCountryCode={setLeadCountryCode}
        leadWhatsapp={leadWhatsapp}
        setLeadWhatsapp={setLeadWhatsapp}
        leadError={leadError}
        isSubmittingLead={isSubmittingLead}
        onSubmit={handleLeadSubmit}
      />
    );
  }

  /* ─── Page "Rejoindre la communauté" (en attendant le paiement) ──────────── */
  return (
    <CommunityWaitScreen
      registeredCount={registeredCount}
      totalPlaces={TOTAL_PLACES}
      whatsappUrl={WHATSAPP_COMMUNITY_URL}
      onJoinClick={handleJoinCommunityClick}
    />
  );
}

/* ─── Formulaire d'accueil (Nom & Prénom + WhatsApp) ─────────────────────── */
/* Défini en dehors de QuestionnairePage : sinon React le recrée à chaque
   frappe et démonte/remonte le formulaire (perte de focus, effet "ça se
   réactualise"). */
/* ─── Questions de qualification (PC, Internet, Frais d'inscription) ─────── */
/* Défini en dehors de QuestionnairePage : sinon React le recrée à chaque
   clic et démonte/remonte l'écran. */
/* ─── Questions de qualification (une question par écran) ────────────────── */
/* Défini en dehors de QuestionnairePage : sinon React le recrée à chaque
   clic et démonte/remonte l'écran. */
function QualifyScreen({
  step,
  totalSteps,
  question,
  warning,
  onAnswer,
  onCloseWarning,
}: {
  step: number;
  totalSteps: number;
  question: string;
  warning: string | null;
  onAnswer: (v: "oui" | "non") => void;
  onCloseWarning: () => void;
}) {
  return (
    <main className="min-h-screen bg-white font-['Inter',sans-serif] flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      <div className="max-w-md w-full">
        {/* Indicateur d'étapes */}
        <div className="flex justify-center gap-2 mb-8 sm:mb-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-gray-900"
                  : i < step
                  ? "w-4 bg-gray-400"
                  : "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs sm:text-sm text-gray-400 mb-2 text-center">
            Question {step + 1} sur {totalSteps}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8 sm:mb-10 text-center leading-snug">
            {question}
          </h1>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onAnswer("oui")}
              className="flex-1 rounded-lg px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors touch-manipulation"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => onAnswer("non")}
              className="flex-1 rounded-lg px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-400 transition-colors touch-manipulation"
            >
              Non
            </button>
          </div>
        </motion.div>
      </div>

      {/* Modal d'avertissement rouge */}
      {warning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={onCloseWarning}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 border-2 border-red-400"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg sm:text-xl">
                ⚠️
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-red-600 mb-1">
                  Élément requis
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  <strong className="text-gray-900">{warning}</strong> est indispensable pour
                  participer au Bootcamp Amphix.
                </p>
              </div>
            </div>
            <button
              onClick={onCloseWarning}
              className="w-full rounded-lg bg-red-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Retour à l'accueil
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}

function LeadFormScreen({
  leadName,
  setLeadName,
  leadCountryCode,
  setLeadCountryCode,
  leadWhatsapp,
  setLeadWhatsapp,
  leadError,
  isSubmittingLead,
  onSubmit,
}: {
  leadName: string;
  setLeadName: (v: string) => void;
  leadCountryCode: string;
  setLeadCountryCode: (v: string) => void;
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
              <div className="flex gap-2">
                <select
                  value={leadCountryCode}
                  onChange={(e) => setLeadCountryCode(e.target.value)}
                  className="w-[112px] sm:w-[128px] shrink-0 rounded-lg border border-gray-200 px-2 py-2.5 sm:py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                >
                  <option value="+229">🇧🇯 +229</option>
                  <option value="+221">🇸🇳 +221</option>
                  <option value="+225">🇨🇮 +225</option>
                </select>
                <input
                  type="tel"
                  value={leadWhatsapp}
                  onChange={(e) => setLeadWhatsapp(e.target.value)}
                  placeholder="Ex : 90 00 00 00"
                  className="flex-1 min-w-0 rounded-lg border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Bénin (+229) · Sénégal (+221) · Côte d'Ivoire (+225)
              </p>
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

/* ─── Page "Rejoindre la communauté" (en attendant qu'un membre de l'équipe
   vienne aider au paiement) — garde la barre de progression/urgence ────────── */
function CommunityWaitScreen({
  registeredCount,
  totalPlaces,
  whatsappUrl,
  onJoinClick,
}: {
  registeredCount: number;
  totalPlaces: number;
  whatsappUrl: string;
  onJoinClick: () => void;
}) {
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
              {registeredCount}/{totalPlaces} inscrits
            </span>
          </div>
          <div className="h-2.5 sm:h-3 bg-yellow-100 rounded-full overflow-hidden relative">
            <div className="progress-blocked h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full relative">
              <div className="white-glow-pulse absolute inset-0 rounded-full" />
            </div>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-yellow-700">
            Il ne reste que {totalPlaces - registeredCount} places disponibles sur {totalPlaces}.
          </p>
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="scale-75 sm:scale-90 md:scale-100 origin-center"
        >
          <HandWrittenTitle
            title="Ta demande est bien reçue !"
            subtitle="Rejoins dès maintenant la communauté en attendant qu'on t'aide à finaliser ton paiement."
          />
        </motion.div>

        {/* Message d'attente / accompagnement */}
        <motion.div
          className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-6 mb-6 sm:mb-8 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
            En attendant, rejoins la communauté Amphix
          </h3>
          <ul className="space-y-2 text-gray-600 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Clique sur le bouton "Rejoindre la communauté" ci-dessous</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>
                <strong>Un membre de l'équipe Amphix viendra t'aider directement</strong> à
                finaliser ton paiement
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Ta place sera réservée dès que ton paiement sera validé</span>
            </li>
          </ul>
        </motion.div>

        {/* Bouton Rejoindre la communauté — CTA fort */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onJoinClick}
            className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 sm:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg hover:bg-[#128C7E] transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg w-full sm:w-auto sm:mx-auto touch-manipulation"
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