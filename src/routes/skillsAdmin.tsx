// src/routes/skillsAdmin.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/skillsAdmin")({
  head: () => ({
    meta: [
      { title: "Gestion des Skills — Admin" },
      { name: "description", content: "Ajoutez les skills et leurs dépôts GitHub." },
    ],
  }),
  component: ProtectedSkillsAdminPage,
});

/* ─── Type ─── */
interface Skill {
  id: string;
  titre: string;
  lien_github: string;
  created_at: string;
}

/* ─── Icônes ─── */
const Icons = {
  code: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  github: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.1.68-.22.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/>
    </svg>
  ),
  externalLink: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  editBtn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  key: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  logout: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

/* ─── Hash de mot de passe (identique à admin.tsx) ─── */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hashBuffer));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Même mot de passe / session que /admin : si vous êtes déjà
   connecté sur le dashboard admin, vous l'êtes aussi ici. ─── */
const ADMIN_PASSWORD_HASH =
  "f4ee2798c3f0e02b0c25a1bd42a7517904219c2b4479db298b4cab221280b7a7";
const ADMIN_SESSION_KEY = "amphix_admin_authed";

function AdminLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");

    const hash = await hashPassword(password);

    if (hash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      onSuccess();
    } else {
      setError("Mot de passe incorrect.");
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-8"
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
          {Icons.key}
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 text-center mb-1">
          Accès Admin
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Entrez le mot de passe pour gérer les skills.
        </p>

        <label className="text-sm font-semibold text-slate-500 mb-1.5 block">
          Mot de passe
        </label>
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            {showPassword ? "Cacher" : "Voir"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium mb-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={checking || !password}
          className="w-full mt-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
        >
          {checking ? "Vérification..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

function ProtectedSkillsAdminPage() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthed(sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");
  }, []);

  if (isAuthed === null) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!isAuthed) {
    return <AdminLoginGate onSuccess={() => setIsAuthed(true)} />;
  }

  return <SkillsAdminPage onLogout={() => { sessionStorage.removeItem(ADMIN_SESSION_KEY); setIsAuthed(false); }} />;
}

/* ─── Page principale ─── */
function SkillsAdminPage({ onLogout }: { onLogout: () => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [lienGithub, setLienGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = async () => {
    const { data, error: err } = await supabase
      .from("skills")
      .select("*")
      .order("titre", { ascending: true });
    if (!err) setSkills(data || []);
  };

  useEffect(() => {
    (async () => { setLoading(true); await fetchSkills(); setLoading(false); })();
  }, []);

  const resetForm = () => {
    setTitre("");
    setLienGithub("");
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const isValidUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!titre.trim()) return;
    if (!isValidUrl(lienGithub.trim())) {
      setError("Le lien du dépôt doit être une URL valide (ex: https://github.com/utilisateur/projet).");
      return;
    }
    setSaving(true);

    const payload = { titre: titre.trim(), lien_github: lienGithub.trim() };

    if (editingId) {
      const { error: err } = await supabase.from("skills").update(payload).eq("id", editingId);
      if (!err) { resetForm(); await fetchSkills(); } else setError(err.message);
    } else {
      const { error: err } = await supabase.from("skills").insert(payload);
      if (!err) { resetForm(); await fetchSkills(); } else setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce skill ? Cette action est définitive.")) return;
    const { error: err } = await supabase.from("skills").delete().eq("id", id);
    if (!err) fetchSkills();
  };

  const startEdit = (s: Skill) => {
    setTitre(s.titre);
    setLienGithub(s.lien_github);
    setEditingId(s.id);
    setShowForm(true);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow">
              {Icons.code}
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 leading-tight">Gestion des Skills</h1>
              <p className="text-xs text-slate-400">Bootcamp Amphix 2026</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
          >
            {Icons.logout}
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Skills</h2>
            <p className="text-sm text-slate-500 mt-1">Ajoutez un titre de skill et le lien du dépôt GitHub associé.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 flex-shrink-0"
          >
            {showForm ? "Annuler" : "Ajouter un skill"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Titre du skill *</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex: Développement Web — React & TypeScript"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Lien du dépôt GitHub *</label>
              <input
                type="url"
                value={lienGithub}
                onChange={(e) => setLienGithub(e.target.value)}
                placeholder="https://github.com/utilisateur/projet"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
              >
                {saving ? "..." : editingId ? "Modifier" : "Enregistrer"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-100 text-slate-700 px-4 py-3 font-semibold text-sm hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Chargement...</div>
        ) : (
          <div className="space-y-3">
            {skills.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                    {Icons.github}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] truncate">{s.titre}</p>
                    <a
                      href={s.lien_github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline truncate block"
                    >
                      {s.lien_github}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={s.lien_github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    {Icons.externalLink}
                  </a>
                  <button onClick={() => startEdit(s)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 transition">
                    {Icons.editBtn}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition">
                    {Icons.trash}
                  </button>
                </div>
              </div>
            ))}

            {skills.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  {Icons.code}
                </div>
                <p className="text-slate-500 font-medium">Aucun skill pour le moment</p>
                <p className="text-sm text-slate-400 mt-1">Ajoutez votre premier skill avec son dépôt GitHub.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}