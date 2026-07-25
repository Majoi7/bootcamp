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
function QuestionnairePage() {
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Étape courante : formulaire d'accueil → page paiement
  const [stage, setStage] = useState<"lead" | "payment">("lead");
  const [leadName, setLeadName] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadError, setLeadError] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Page paiement : case à cocher (politique de confidentialité) + modal
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const KKIAPAY_URL = "https://direct.kkiapay.me/43000/Inscription%20Bootcamp-_UOG2Nl9p";

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
      setStage("payment");
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
    setStage("payment");
  };

  // Clic sur "Passer au paiement" → tracking puis redirection vers KKiaPay
  const handlePaymentClick = async () => {
    if (!agreedToPolicy || isRedirecting) return;
    setIsRedirecting(true);

    trackContact(); // ← événement Meta
    await incrementRegisteredCount(); // ← incrémente le compteur global (Supabase)

    if (participantId) {
      try {
        await supabase.from("tracking_events").insert({
          event_type: "payment_button_click",
          participant_id: participantId,
        });
      } catch (e) {
        console.error("Erreur tracking paiement:", e);
      }
    }

    window.location.href = KKIAPAY_URL;
  };
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

  /* ─── Page Paiement ────────────────────────────────────────────────────── */
  return (
    <PaymentInfoScreen
      registeredCount={registeredCount}
      totalPlaces={TOTAL_PLACES}
      agreedToPolicy={agreedToPolicy}
      setAgreedToPolicy={setAgreedToPolicy}
      showPolicy={showPolicy}
      setShowPolicy={setShowPolicy}
      isRedirecting={isRedirecting}
      onPay={handlePaymentClick}
    />
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
                placeholder="Ex : 90 00 00 00"
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

/* ─── Page Paiement (PC/Internet + case à cocher + bouton KKiaPay) ────────── */
function PaymentInfoScreen({
  registeredCount,
  totalPlaces,
  agreedToPolicy,
  setAgreedToPolicy,
  showPolicy,
  setShowPolicy,
  isRedirecting,
  onPay,
}: {
  registeredCount: number;
  totalPlaces: number;
  agreedToPolicy: boolean;
  setAgreedToPolicy: (v: boolean) => void;
  showPolicy: boolean;
  setShowPolicy: (v: boolean) => void;
  isRedirecting: boolean;
  onPay: () => void;
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
            title="Encore une étape !"
            subtitle="Finalise ton inscription pour réserver définitivement ta place."
          />
        </motion.div>

        {/* Prérequis PC / Internet */}
        <motion.div
          className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-6 mb-6 sm:mb-8 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
            Avant de continuer, assure-toi d'avoir :
          </h3>
          <ul className="space-y-2 text-gray-600 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Un ordinateur (ou la possibilité d'en emprunter un)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5 shrink-0">›</span>
              <span>Une connexion internet</span>
            </li>
          </ul>
          <p className="mt-4 text-gray-700 text-xs sm:text-sm leading-relaxed">
            Si c'est ton cas, tu peux passer au paiement dès maintenant.{" "}
            <strong className="text-gray-900">
              N'oublie pas de faire une capture d'écran de ton reçu après le paiement
            </strong>
            , elle te sera demandée pour valider ton inscription.
          </p>
        </motion.div>

        {/* Case à cocher — politique de confidentialité */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={(e) => setAgreedToPolicy(e.target.checked)}
              className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900/20"
            />
            <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Je suis d'accord avec la{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPolicy(true);
                }}
                className="text-sky-600 underline underline-offset-2 hover:text-sky-700"
              >
                politique de confidentialité
              </button>
            </span>
          </label>
        </motion.div>

        {/* Bouton Passer au paiement */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <motion.button
            onClick={onPay}
            disabled={!agreedToPolicy || isRedirecting}
            whileTap={{ scale: 0.97 }}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 sm:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg w-full sm:w-auto sm:mx-auto touch-manipulation
              ${!agreedToPolicy || isRedirecting
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 active:scale-95"
              }`}
          >
            {isRedirecting ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Redirection...</span>
              </>
            ) : (
              <span>Passer au paiement</span>
            )}
          </motion.button>
          {!agreedToPolicy && (
            <p className="mt-3 text-xs text-gray-400">
              Coche la case ci-dessus pour activer le bouton de paiement.
            </p>
          )}
        </motion.div>
      </div>

      {/* Modal — Politique de confidentialité */}
      {showPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowPolicy(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
              Politique de confidentialité
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
              En procédant au paiement de tes frais d'inscription au Bootcamp Amphix, tu
              reconnais et acceptes qu'<strong className="text-gray-900">aucun remboursement ne sera possible après le paiement</strong>,
              quel qu'en soit le motif. Assure-toi d'avoir bien pris connaissance des
              prérequis (ordinateur, connexion internet) avant de valider ton paiement.
            </p>
            <button
              onClick={() => setShowPolicy(false)}
              className="w-full rounded-lg bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              J'ai compris
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}