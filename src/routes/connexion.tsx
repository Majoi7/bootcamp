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

function formatWhatsApp(raw: string): string {
  const cleaned = raw.replace(/[\s\-]/g, "").replace(/^0+/, "");
  if (cleaned.startsWith("+229")) return cleaned;
  return "+229" + cleaned.replace(/^\+/, "");
}

function ConnexionPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError("");

    const phone = formatWhatsApp(data.whatsapp);
    const passwordHash = await hashPassword(data.password);

    const { data: participant, error } = await supabase
      .from("participants")
      .select("id, nom, prenoms, whatsapp, niveau_etudes")
      .eq("whatsapp", phone)
      .eq("password_hash", passwordHash)
      .single();

    if (error || !participant) {
      setServerError("Numéro ou mot de passe incorrect.");
      return;
    }

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
              <div className="px-3 py-3 border-r border-border bg-muted/40 text-sm font-semibold select-none">
                🇧🇯 +229
              </div>
              <input
                id="whatsapp"
                type="tel"
                placeholder="01 46 24 45 49"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore inscrit ?{" "}
          <Link to="/inscription" className="text-primary font-semibold hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </main>
  );
}