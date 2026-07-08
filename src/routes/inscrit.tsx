import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/inscrit")({
  head: () => ({
    meta: [
      { title: "Inscription — Bootcamp Amphix 2026" },
      {
        name: "description ",
        content:
          "Inscrivez-vous au Bootcamp Amphix 2026. 10 000 FCFA. Web, IA, Design, Hackathon.",
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
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: InscriptionPage,
});

// ── Schéma Zod étape 1 : infos personnelles ─────────────────────────────────
const schemaInfos = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  prenoms: z.string().min(1, "Les prénoms sont obligatoires"),
  whatsapp: z
    .string()
    .min(1, "Le numéro WhatsApp est obligatoire")
    .min(8, "Numéro trop court — ex : 01 46 24 45 49"),
  niveau_etudes: z.enum(["Collège", "Lycée", "Licence"], {
    errorMap: () => ({ message: "Veuillez sélectionner un niveau" }),
  }),
});

// ── Schéma Zod étape 2 : mot de passe ───────────────────────────────────────
const schemaPassword = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial"),
    confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

  // ── Liste des pays d'Afrique francophone ─────────────────────────────────
const paysAfriqueFrancophone = [
  { code: "BJ", nom: "Bénin", indicatif: "+229", drapeau: "🇧🇯" },
  { code: "BF", nom: "Burkina Faso", indicatif: "+226", drapeau: "🇧🇫" },
  { code: "CM", nom: "Cameroun", indicatif: "+237", drapeau: "🇨🇲" },
  { code: "CF", nom: "Centrafrique", indicatif: "+236", drapeau: "🇨🇫" },
  { code: "KM", nom: "Comores", indicatif: "+269", drapeau: "🇰🇲" },
  { code: "CG", nom: "Congo", indicatif: "+242", drapeau: "🇨🇬" },
  { code: "CD", nom: "RD Congo", indicatif: "+243", drapeau: "🇨🇩" },
  { code: "CI", nom: "Côte d'Ivoire", indicatif: "+225", drapeau: "🇨🇮" },
  { code: "GA", nom: "Gabon", indicatif: "+241", drapeau: "🇬🇦" },
  { code: "GN", nom: "Guinée", indicatif: "+224", drapeau: "🇬🇳" },
  { code: "GQ", nom: "Guinée Équatoriale", indicatif: "+240", drapeau: "🇬🇶" },
  { code: "MG", nom: "Madagascar", indicatif: "+261", drapeau: "🇲🇬" },
  { code: "ML", nom: "Mali", indicatif: "+223", drapeau: "🇲🇱" },
  { code: "NE", nom: "Niger", indicatif: "+227", drapeau: "🇳🇪" },
  { code: "RW", nom: "Rwanda", indicatif: "+250", drapeau: "🇷🇼" },
  { code: "SN", nom: "Sénégal", indicatif: "+221", drapeau: "🇸🇳" },
  { code: "TD", nom: "Tchad", indicatif: "+235", drapeau: "🇹🇩" },
  { code: "TG", nom: "Togo", indicatif: "+228", drapeau: "🇹🇬" },
];

type FormDataInfos = z.infer<typeof schemaInfos>;
type FormDataPassword = z.infer<typeof schemaPassword>;


// ── Formate le numéro avant insertion ───────────────────────────────────────
// Remplacer la fonction formatWhatsApp existante par celle-ci :
function formatWhatsApp(raw: string, indicatif: string): string {
  // 1. Nettoie les espaces et tirets
  const cleaned = raw.replace(/[\s\-]/g, "");
  
  // 2. Si le numéro commence déjà par l'indicatif complet, on le garde tel quel
  if (cleaned.startsWith(indicatif)) return cleaned;
  
  // 3. Si le numéro commence par +, on enlève juste le +
  const withoutPlus = cleaned.replace(/^\+/, "");
  
  // 4. On ajoute l'indicatif devant (le 0 initial est conservé !)
  return indicatif + withoutPlus;
}

// ── Styles partagés ─────────────────────────────────────────────────────────
const inputBase =
  "w-full rounded-xl border bg-background text-sm px-4 py-3 outline-none transition-all duration-200 placeholder:text-muted-foreground/50";
const inputNormal =
  "border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25";
const inputError =
  "border-red-400 bg-red-50/30 focus:border-red-400 focus:ring-2 focus:ring-red-300/30";

// ── Indicateur de force du mot de passe ───────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères", valid: password.length >= 8 },
    { label: "Majuscule", valid: /[A-Z]/.test(password) },
    { label: "Chiffre", valid: /[0-9]/.test(password) },
    { label: "Spécial", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = checks.filter((c) => c.valid).length;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5">
        {checks.map((_, i) => (
          <div
            key={i}
            className={[
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i < strength
                ? strength <= 2
                  ? "bg-red-400"
                  : strength === 3
                  ? "bg-yellow-400"
                  : "bg-green-500"
                : "bg-muted",
            ].join(" ")}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span
            key={check.label}
            className={[
              "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
              check.valid
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {check.valid ? "✓" : "○"} {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
function InscriptionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"infos" | "password" | "success">("infos");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [selectedNiveau, setSelectedNiveau] = useState<
    "Collège" | "Lycée" | "Licence" | ""
  >("");
  const [pulseButton, setPulseButton] = useState(false);
  const [savedData, setSavedData] = useState<FormDataInfos | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  // Dans la fonction InscriptionPage, ajouter après les autres states :
const [selectedIndicatif, setSelectedIndicatif] = useState(paysAfriqueFrancophone[0]); // Bénin par défaut

  // ── Formulaire étape 1 : infos ─────────────────────────────────────────
  const {
    register: registerInfos,
    handleSubmit: handleSubmitInfos,
    setValue: setValueInfos,
    watch: watchInfos,
    formState: { errors: errorsInfos },
  } = useForm<FormDataInfos>({
    resolver: zodResolver(schemaInfos),
    mode: "onTouched",
  });

  // ── Formulaire étape 2 : mot de passe ────────────────────────────────────
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    formState: { errors: errorsPassword },
  } = useForm<FormDataPassword>({
    resolver: zodResolver(schemaPassword),
    mode: "onTouched",
  });

  const passwordValue = watchPassword("password") || "";

  // ── Animation pulse quand le formulaire infos est rempli ─────────────────
  const nomValue = watchInfos("nom");
  const prenomsValue = watchInfos("prenoms");
  const whatsappValue = watchInfos("whatsapp");

  useEffect(() => {
    const isFormFilled =
      nomValue && prenomsValue && whatsappValue && selectedNiveau;
    setPulseButton(Boolean(isFormFilled));
  }, [nomValue, prenomsValue, whatsappValue, selectedNiveau]);

  function handleNiveauClick(niveau: "Collège" | "Lycée" | "Licence") {
    setSelectedNiveau(niveau);
    setValueInfos("niveau_etudes", niveau, { shouldValidate: true });
  }

  // ── Étape 1 : soumission des infos ───────────────────────────────────────
async function onSubmitInfos(data: FormDataInfos) {
  setIsSubmitting(true);
  setServerError("");

  try {
    const whatsappFormate = formatWhatsApp(data.whatsapp, selectedIndicatif.indicatif);

    // 1. Insérer dans Supabase
    const { data: inserted, error } = await supabase
      .from("participants")
      .insert({
        nom: data.nom.trim(),
        prenoms: data.prenoms.trim(),
        whatsapp: whatsappFormate,
        niveau_etudes: data.niveau_etudes,
        paye: false,
        montant_paye: 0,
      })
      .select("id")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        setServerError("Ce numéro WhatsApp est déjà inscrit.");
      } else {
        setServerError(error.message);
      }
      setIsSubmitting(false); // ← Important !
      return;
    }

    // 2. 🚀 Envoyer l'email de notification
    try {
      console.log("📧 Envoi email en cours...");
      
      const { data: emailData, error: fnError } = await supabase.functions.invoke("send-email", {
        body: {
          nom: data.nom,
          prenoms: data.prenoms,
          whatsapp: whatsappFormate,
          niveau_etudes: data.niveau_etudes,
          pays: selectedIndicatif.nom,
        },
      });
      
      console.log("📧 Réponse email:", emailData, fnError);
      
      if (fnError) {
        console.error("❌ Erreur fonction email:", fnError);
      }
    } catch (emailErr) {
      console.error("❌ Catch email:", emailErr);
    }

    setSavedData(data);
    setParticipantId(inserted.id);
    setStep("password");
  } catch (err) {
    console.error("Erreur inscription:", err);
    setServerError("Une erreur est survenue. Veuillez réessayer.");
  } finally {
    setIsSubmitting(false);
  }
}

  // ── Étape 2 : création du mot de passe ───────────────────────────────────
async function onSubmitPassword(data: FormDataPassword) {
  setIsSubmitting(true);
  setServerError("");

  try {
    // Hash simple côté client (à remplacer par bcrypt via Edge Function en prod)
    const passwordHash = await hashPassword(data.password);

    const { error: updateError } = await supabase
      .from("participants")
      .update({ password_hash: passwordHash })
      .eq("id", participantId);

    if (updateError) {
      setServerError("Erreur lors de la sauvegarde du mot de passe.");
      return;
    }

    setStep("success");

    setTimeout(() => {
window.location.href = "/dashboard";
    }, 2000);
  } catch {
    setServerError("Erreur inattendue. Réessayez.");
  } finally {
    setIsSubmitting(false);
  }
}

// Fonction de hash simple (à remplacer par bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

  // ── Étape 3 : écran de succès ────────────────────────────────────────────
  if (step === "success") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl bg-card border border-border shadow-soft p-8 md:p-12 text-center">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>
          <h2 className="font-display text-3xl font-bold text-primary">
            Compte créé avec succès !
          </h2>
          <p className="mt-4 text-muted-foreground">
            Bienvenue <strong>{savedData?.nom}</strong> ! Votre compte est prêt.
          </p>
          
          <div className="mt-6 rounded-2xl bg-gradient-ocean/10 border border-primary/20 p-6">
            <p className="text-sm text-muted-foreground mb-2">Redirection dans quelques secondes...</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[shrink_2s_linear_forwards]" style={{ width: "100%" }} />
            </div>
          </div>

          <Link
            to="/dashboard"
            className="mt-8 inline-block rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90 transition hover:scale-105 active:scale-95"
          >
            Aller au Dashboard →
          </Link>
        </div>
      </main>
    );
  }

  // ── Étape 2 : création mot de passe ────────────────────────────────────────
  if (step === "password") {
    return (
      <main className="min-h-screen bg-background overflow-x-hidden">
        {/* Header minimal */}
        <nav className="mx-auto max-w-7xl px-6 py-6">
          <Link to="/" className="font-display text-xl font-bold hover:scale-105 transition-transform inline-block">
            Amphix
          </Link>
        </nav>

        <section className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 md:p-12">
            {/* Indicateur d'étape */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">1</div>
              <div className="w-12 h-0.5 bg-primary" />
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold animate-pulse">2</div>
            </div>

            <div className="text-center mb-10">
              <h2 className="font-display text-2xl font-bold">
                Sécurisez votre compte
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Créez un mot de passe fort pour accéder à votre espace
              </p>
            </div>

            {serverError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-6 animate-pulse">
                {serverError}
              </div>
            )}

            <form
              onSubmit={handleSubmitPassword(onSubmitPassword)}
              className="space-y-6"
              noValidate
            >
              {/* Mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold mb-2"
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword("password")}
                  className={`${inputBase} ${errorsPassword.password ? inputError : inputNormal}`}
                />
                <PasswordStrength password={passwordValue} />
                {errorsPassword.password && (
                  <p className="mt-1.5 text-xs text-red-500 animate-fade-in">
                    {errorsPassword.password.message}
                  </p>
                )}
              </div>

              {/* Confirmation */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold mb-2"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword("confirmPassword")}
                  className={`${inputBase} ${errorsPassword.confirmPassword ? inputError : inputNormal}`}
                />
                {errorsPassword.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500 animate-fade-in">
                    {errorsPassword.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Bouton */}
              <div className="relative">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    "relative w-full rounded-full px-8 py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300",
                    "shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]",
                    isSubmitting
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-gradient-ocean text-primary-foreground hover:brightness-110",
                  ].join(" ")}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Création du compte…
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <span className="animate-pulse">🔒</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    );
  }

  // ── Étape 1 : formulaire infos (inchangé visuellement) ───────────────────
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, oklch(0.62 0.18 240 / 0.2), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.68 0.2 25 / 0.2), transparent 40%)",
          }}
        />
        <div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute top-40 right-[15%] w-40 h-40 rounded-full bg-orange-400/20 blur-3xl" />

        <nav className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold hover:scale-105 transition-transform inline-block">
            Amphix
          </Link>
          <Link
            to="/"
            className="rounded-full bg-white text-foreground px-5 py-2.5 text-sm font-semibold border border-border hover:bg-muted transition hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            Retour à l'accueil
          </Link>
        </nav>

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 text-center">
          <span className="inline-flex items-center rounded-full bg-white/80 backdrop-blur px-4 py-1.5 text-sm font-semibold text-foreground border border-border shadow-soft">
            🚀 Bootcamp Amphix 2026
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95]">
            <span className="text-primary">Inscri</span>
            <span className="text-secondary">ption</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-xl mx-auto">
            Rejoignez la 1ère édition du Bootcamp Amphix. 4 semaines pour
            transformer vos idées en projets concrets.
          </p>
        </div>
      </section>

      {/* FORMULAIRE ÉTAPE 1 */}
      <section className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-3xl bg-card border border-border shadow-soft p-8 md:p-12">
          {/* Indicateur d'étape */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold animate-pulse">1</div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">2</div>
          </div>

          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold">
              Vos informations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tous les champs sont obligatoires
            </p>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-6 animate-pulse">
              {serverError}
            </div>
          )}

          <form
            onSubmit={handleSubmitInfos(onSubmitInfos)}
            className="space-y-6"
            noValidate
          >
            {/* Nom + Prénoms */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="nom" className="block text-sm font-semibold mb-2">
                  Nom
                </label>
                <input
                  id="nom"
                  type="text"
                  placeholder="Ex : DJADJO"
                  {...registerInfos("nom")}
                  className={`${inputBase} ${errorsInfos.nom ? inputError : inputNormal}`}
                />
                {errorsInfos.nom && (
                  <p className="mt-1.5 text-xs text-red-500 animate-fade-in">
                    {errorsInfos.nom.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prenoms" className="block text-sm font-semibold mb-2">
                  Prénoms
                </label>
                <input
                  id="prenoms"
                  type="text"
                  placeholder="Ex : Adorée"
                  {...registerInfos("prenoms")}
                  className={`${inputBase} ${errorsInfos.prenoms ? inputError : inputNormal}`}
                />
                {errorsInfos.prenoms && (
                  <p className="mt-1.5 text-xs text-red-500 animate-fade-in">
                    {errorsInfos.prenoms.message}
                  </p>
                )}
              </div>
            </div>

            {/* WhatsApp */}
           {/* WhatsApp - Remplacer tout le bloc WhatsApp existant par celui-ci */}
<div>
  <label htmlFor="whatsapp" className="block text-sm font-semibold mb-2">
    Numéro WhatsApp
  </label>
  <div
    className={[
      "flex items-center rounded-xl border overflow-hidden transition-all duration-200",
      "focus-within:ring-2",
      errorsInfos.whatsapp
        ? "border-red-400 bg-red-50/30 focus-within:ring-red-300/30"
        : "border-border hover:border-primary/50 focus-within:border-primary focus-within:ring-primary/25",
    ].join(" ")}
  >
    {/* Sélecteur d'indicatif */}
    <div className="relative">
      <select
        value={selectedIndicatif.code}
        onChange={(e) => {
          const pays = paysAfriqueFrancophone.find(p => p.code === e.target.value);
          if (pays) setSelectedIndicatif(pays);
        }}
        className="appearance-none bg-muted/40 px-3 py-3 pr-8 border-r border-inherit text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/60 transition-colors outline-none"
      >
        {paysAfriqueFrancophone.map((pays) => (
          <option key={pays.code} value={pays.code}>
            {pays.drapeau} {pays.indicatif}
          </option>
        ))}
      </select>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    
    {/* Champ de saisie du numéro */}
    <input
      id="whatsapp"
      type="tel"
      placeholder="01 46 24 45 49"
      {...registerInfos("whatsapp")}
      className="flex-1 bg-transparent text-sm px-3 py-3 outline-none placeholder:text-muted-foreground/50"
    />
  </div>
  {errorsInfos.whatsapp ? (
    <p className="mt-1.5 text-xs text-red-500 animate-fade-in">
      {errorsInfos.whatsapp.message}
    </p>
  ) : (
    <p className="mt-1.5 text-xs text-muted-foreground">
      Format : 8 chiffres minimum • {selectedIndicatif.drapeau} {selectedIndicatif.nom}
    </p>
  )}
</div>

            {/* Niveau d'études */}
            <div>
              <p className="text-sm font-semibold mb-3">Niveau d'études</p>
              <div className="grid grid-cols-3 gap-3">
                {(["Collège", "Lycée", "Licence"] as const).map((niveau) => {
                  const active = selectedNiveau === niveau;
                  return (
                    <button
                      key={niveau}
                      type="button"
                      onClick={() => handleNiveauClick(niveau)}
                      className={[
                        "relative rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 select-none overflow-hidden",
                        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95",
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/30 scale-[1.02]"
                          : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:bg-primary/5",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-2 text-primary text-[10px] font-bold animate-bounce">
                          ✓
                        </span>
                      )}
                      {!active && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-muted-foreground/20" />
                      )}
                      <span className="relative z-10">{niveau}</span>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...registerInfos("niveau_etudes")} />
              {errorsInfos.niveau_etudes && (
                <p className="mt-2 text-xs text-red-500 animate-fade-in">
                  {errorsInfos.niveau_etudes.message}
                </p>
              )}
            </div>

            {/* Frais */}
            <div className="rounded-2xl bg-gradient-ocean/10 border border-primary/20 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Frais d'inscription
              </p>
              <p className="font-display text-3xl font-bold text-primary">
                10 000 FCFA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                À payer après inscription via WhatsApp
              </p>
            </div>

            {/* Bouton */}
            <div className="relative">
              {pulseButton && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur opacity-30 animate-pulse" />
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={[
                  "relative w-full rounded-full px-8 py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300",
                  "shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]",
                  isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-ocean text-primary-foreground hover:brightness-110",
                  pulseButton && !isSubmitting ? "animate-pulse ring-4 ring-primary/20" : "",
                ].join(" ")}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Inscription en cours…
                  </>
                ) : (
                  <>
                    <span className="animate-bounce inline-block">🚀</span>
                    Continuer
                    <span className="animate-pulse">→</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              En vous inscrivant, vous acceptez de rejoindre le Bootcamp Amphix 2026.
            </p>
          </form>
        </div>
      </section>

      {/* INFOS */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: "📅", label: "Durée", value: "4 semaines" },
            { icon: "💻", label: "Mode", value: "90% en ligne" },
            { icon: "🎟️", label: "Inscription", value: "10 000 FCFA" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-card p-6 shadow-soft border border-border text-center hover:shadow-pop hover:-translate-y-1 transition-all duration-300 cursor-pointer active:scale-95"
            >
              <div className="text-3xl mb-2 animate-bounce">{c.icon}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {c.label}
              </div>
              <div className="mt-1 font-display text-xl font-bold">
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <span className="font-display font-bold text-foreground">Amphix</span>{" "}
            · Bootcamp 2026
          </div>
          <div>« Apprendre, Construire, Innover »</div>
        </div>
      </footer>
    </main>
  );
}