//   src/routes/connexion.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export const Route = createFileRoute("/connexion")({
  component: ConnexionPage,
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

const schema = z.object({
  whatsapp: z.string().min(8, "Numéro trop court"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormData = z.infer<typeof schema>;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hashBuffer));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatWhatsApp(raw: string, indicatif: string): string {
  const cleaned = raw.replace(/[\s\-]/g, "").replace(/^0+/, "");
  if (cleaned.startsWith(indicatif)) return cleaned;
  return indicatif + cleaned.replace(/^\+/, "");
}

function ConnexionPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [selectedIndicatif, setSelectedIndicatif] = useState(paysAfriqueFrancophone[0]); // Bénin par défaut

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
  setServerError("");

  // 1. Nettoyer la saisie (espaces, tirets, "+" éventuel)
  const raw = data.whatsapp.replace(/[\s\-]/g, "").replace(/^\+/, "");
  const indicatif = selectedIndicatif.indicatif; // "+229"

  // 2. Extraire la partie locale (sans l'indicatif si déjà présent)
  let local = raw;
  const indicatifSansPlus = indicatif.replace(/^\+/, ""); // "229"
  if (raw.startsWith(indicatifSansPlus)) {
    local = raw.slice(indicatifSansPlus.length);
  }

  // 3. Construire toutes les variantes possibles (avec et sans zéro initial)
  const variants: string[] = [];
  variants.push(indicatif + local); // ex: "+2290146244549"
  const localSansZero = local.replace(/^0+/, "");
  if (localSansZero !== local) {
    variants.push(indicatif + localSansZero); // ex: "+229146244549"
  }
  // Si l'utilisateur a tapé le numéro sans indicatif mais avec le zéro,
  // on a déjà les deux variantes. Sinon, si l'utilisateur a tapé sans zéro,
  // on aura seulement "+229146244549" (pas de doublon).
  // On dédoublonne au cas où
  const uniqueVariants = Array.from(new Set(variants));

  // 4. Hash du mot de passe
  const passwordHash = await hashPassword(data.password);

  // 5. Requête avec IN sur toutes les variantes
  const { data: results, error } = await supabase
    .from("participants")
    .select("id, nom, prenoms, whatsapp, niveau_etudes")
    .in("whatsapp", uniqueVariants)
    .eq("password_hash", passwordHash)
    .limit(1); // on ne prend qu'un résultat

  const participant = results?.[0] || null;

  if (error || !participant) {
    console.log("Variantes testées :", uniqueVariants);
    setServerError("Numéro ou mot de passe incorrect.");
    return;
  }

  // 6. Connexion réussie
  localStorage.setItem(
    "amphix_session",
    JSON.stringify({
      id: participant.id,
      nom: participant.nom,
      prenoms: participant.prenoms,
      whatsapp: participant.whatsapp,
    })
  );

  window.location.href = "/dashboard";
}
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-soft p-8 md:p-12">
        <h1 className="font-display text-3xl font-bold text-center mb-2">
          Connexion
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          Entrez votre numéro WhatsApp et votre mot de passe
        </p>

        {serverError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-6">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-semibold mb-2">
              Numéro WhatsApp
            </label>
            <div className="flex items-center rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition-all">
              {/* Sélecteur d'indicatif */}
              <div className="relative">
                <select
                  value={selectedIndicatif.code}
                  onChange={(e) => {
                    const pays = paysAfriqueFrancophone.find(p => p.code === e.target.value);
                    if (pays) setSelectedIndicatif(pays);
                  }}
                  className="appearance-none bg-muted/40 px-3 py-3 pr-8 border-r border-border text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/60 transition-colors outline-none"
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
                placeholder=" 46 24 45 49"
                {...register("whatsapp")}
                className="flex-1 bg-transparent text-sm px-3 py-3 outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {errors.whatsapp && (
              <p className="mt-1.5 text-xs text-red-500">{errors.whatsapp.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50"
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-ocean text-primary-foreground px-8 py-4 font-bold text-lg shadow-lg hover:scale-[1.02] hover:shadow-xl transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Connexion…" : "Se connecter →"}
          </button>
        </form>

       
      </div>
    </main>
  );
}