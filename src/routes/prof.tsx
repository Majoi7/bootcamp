// src/routes/prof.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/prof")({
  head: () => ({
    meta: [
      { title: "Espace Professeurs — Bootcamp Amphix 2026" },
      { name: "description", content: "Ajoutez les enregistrements vidéo de vos cours." },
    ],
  }),
  component: ProtectedProfPage,
});

/* ─── Types (mêmes formes que côté admin) ─── */
interface Cours {
  id: string;
  titre: string;
  description: string | null;
  couleur: string;
  created_at: string;
}

interface Professeur {
  id: string;
  nom: string;
  prenoms: string | null;
  specialite: string | null;
  photo_url: string | null;
  created_at: string;
}

interface Enregistrement {
  id: string;
  cours_id: string | null;
  professeur_id: string | null;
  titre: string;
  lien: string;
  date: string;
  description: string | null;
  created_at: string;
  cours?: Cours;
  professeur?: Professeur;
}

interface Participant {
  id: string;
  nom: string;
  prenoms: string;
}

interface DevoirSoumission {
  id: string;
  participant_id: string;
  cours_id: string;
  fichier_nom: string;
  fichier_url: string;
  created_at: string;
}

interface NoteCours {
  id: string;
  participant_id: string;
  cours_id: string;
  note1: number | null;
  note2: number | null;
}

/* ─── Icônes (sous-ensemble nécessaire à cette page) ─── */
const Icons = {
  video: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  mega: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3l9 8h-3v9h-4v-6H10v6H6v-9H3z"/>
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
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  fileText: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

/* ─── Helpers liens vidéo (identiques à admin.tsx / dashboard.tsx) ─── */
function getYouTubeThumbnail(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  }
  return null;
}

type Platform = "youtube" | "mega" | "other";
function getPlatform(url: string): Platform {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/mega\.(?:nz|co\.nz)/i.test(url)) return "mega";
  return "other";
}

/* ─── Hash de mot de passe (identique à admin.tsx) ─── */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hashBuffer));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Protection par mot de passe partagé (profs) ───
   Mot de passe par défaut : "ProfsAmphix2026" — à changer ci-dessous en
   remplaçant PROF_PASSWORD_HASH par le hash de votre nouveau mot de passe
   (même méthode que ADMIN_PASSWORD_HASH dans admin.tsx). */
const PROF_PASSWORD_HASH =
  "b8d93dbf91927633472f0cd70da8f15875d39c76d0f56376678c99acb247096d";
const PROF_SESSION_KEY = "amphix_prof_authed";

function ProfLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");

    const hash = await hashPassword(password);

    if (hash === PROF_PASSWORD_HASH) {
      sessionStorage.setItem(PROF_SESSION_KEY, "1");
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
          Espace Professeurs
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Entrez le mot de passe pour ajouter vos enregistrements.
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

function ProtectedProfPage() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthed(sessionStorage.getItem(PROF_SESSION_KEY) === "1");
  }, []);

  if (isAuthed === null) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!isAuthed) {
    return <ProfLoginGate onSuccess={() => setIsAuthed(true)} />;
  }

  return <ProfPage onLogout={() => { sessionStorage.removeItem(PROF_SESSION_KEY); setIsAuthed(false); }} />;
}

/* ─── Page principale (profs) : uniquement les enregistrements ─── */
function ProfPage({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<"enregistrements" | "devoirs">("enregistrements");
  const [cours, setCours] = useState<Cours[]>([]);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [enregistrements, setEnregistrements] = useState<Enregistrement[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCours = async () => {
    const { data, error } = await supabase.from("cours").select("*").order("titre", { ascending: true });
    if (!error) setCours(data || []);
  };

  const fetchProfesseurs = async () => {
    const { data, error } = await supabase.from("professeurs").select("*").order("nom", { ascending: true });
    if (!error) setProfesseurs(data || []);
  };

  const fetchEnregistrements = async () => {
    const { data, error } = await supabase
      .from("enregistrements")
      .select("*, cours:cours_id(*), professeur:professeur_id(*)")
      .order("date", { ascending: false });
    if (!error) setEnregistrements(data || []);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("id, nom, prenoms")
      .order("nom", { ascending: true });
    if (!error) setParticipants(data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchCours(), fetchProfesseurs(), fetchEnregistrements(), fetchParticipants()]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow">
              {Icons.video}
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 leading-tight">Espace Professeurs</h1>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Navigation entre sections */}
        <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 gap-1 mb-6 shadow-sm">
          <button
            onClick={() => setSection("enregistrements")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              section === "enregistrements" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Enregistrements
          </button>
          <button
            onClick={() => setSection("devoirs")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              section === "devoirs" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Devoirs &amp; Notes
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Chargement...</div>
        ) : section === "enregistrements" ? (
          <EnregistrementsTab
            enregistrements={enregistrements}
            cours={cours}
            professeurs={professeurs}
            onRefresh={fetchEnregistrements}
          />
        ) : (
          <DevoirsNotesProfTab cours={cours} participants={participants} />
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ENREGISTREMENTS (identique à la version admin) —
   ajout, édition, suppression des liens YouTube / MEGA
   ═══════════════════════════════════════════════════ */
function EnregistrementsTab({
  enregistrements,
  cours,
  professeurs,
  onRefresh,
}: {
  enregistrements: Enregistrement[];
  cours: Cours[];
  professeurs: Professeur[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [lien, setLien] = useState("");
  const [coursId, setCoursId] = useState("");
  const [professeurId, setProfesseurId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCours, setFilterCours] = useState("");
  const [filterProf, setFilterProf] = useState("");

  const resetForm = () => {
    setTitre("");
    setLien("");
    setCoursId("");
    setProfesseurId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
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
    if (!isValidUrl(lien.trim())) {
      setError("Le lien de l'enregistrement doit être une URL valide (ex: https://mega.nz/... ou https://youtube.com/...).");
      return;
    }
    setLoading(true);

    const payload = {
      titre: titre.trim(),
      lien: lien.trim(),
      cours_id: coursId || null,
      professeur_id: professeurId || null,
      date,
      description: description.trim() || null,
    };

    if (editingId) {
      const { error: err } = await supabase
        .from("enregistrements")
        .update(payload)
        .eq("id", editingId);
      if (!err) { resetForm(); onRefresh(); } else setError(err.message);
    } else {
      const { error: err } = await supabase
        .from("enregistrements")
        .insert(payload);
      if (!err) { resetForm(); onRefresh(); } else setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet enregistrement ? Cette action est définitive.")) return;
    const { error: err } = await supabase.from("enregistrements").delete().eq("id", id);
    if (!err) onRefresh();
  };

  const startEdit = (rec: Enregistrement) => {
    setTitre(rec.titre);
    setLien(rec.lien);
    setCoursId(rec.cours_id || "");
    setProfesseurId(rec.professeur_id || "");
    setDate(rec.date);
    setDescription(rec.description || "");
    setEditingId(rec.id);
    setShowForm(true);
    setError(null);
  };

  const filtered = useMemo(() => {
    return enregistrements.filter((rec) => {
      const matchSearch = !search.trim() || rec.titre.toLowerCase().includes(search.trim().toLowerCase());
      const matchCours = !filterCours || rec.cours_id === filterCours;
      const matchProf = !filterProf || rec.professeur_id === filterProf;
      return matchSearch && matchCours && matchProf;
    });
  }, [enregistrements, search, filterCours, filterProf]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Mes enregistrements vidéo</h2>
          <p className="text-sm text-slate-500 mt-1">Ajoutez les liens YouTube ou MEGA de vos sessions enregistrées pour que les participants puissent les revoir.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 flex-shrink-0"
        >
          {showForm ? "Annuler" : "Ajouter un enregistrement"}
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
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Titre de l'enregistrement *</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Session 3 — Introduction aux boucles"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Lien de la vidéo (YouTube ou MEGA) *</label>
            <input
              type="url"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou https://mega.nz/file/..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Colle ici le lien YouTube (public ou non répertorié) ou le lien de partage MEGA du fichier vidéo. La plateforme est détectée automatiquement.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Cours lié</label>
              <select
                value={coursId}
                onChange={(e) => setCoursId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">— Aucun —</option>
                {cours.map((c) => (
                  <option key={c.id} value={c.id}>{c.titre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Professeur</label>
              <select
                value={professeurId}
                onChange={(e) => setProfesseurId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">— Aucun —</option>
                {professeurs.map((p) => (
                  <option key={p.id} value={p.id}>{p.prenoms} {p.nom}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Date de la session</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-56 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Notes (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: à partir de 12min, problème de son au début..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
            >
              {loading ? "..." : editingId ? "Modifier" : "Enregistrer le lien"}
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

      {/* Recherche + filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un enregistrement..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={filterCours}
          onChange={(e) => setFilterCours(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Tous les cours</option>
          {cours.map((c) => (
            <option key={c.id} value={c.id}>{c.titre}</option>
          ))}
        </select>
        <select
          value={filterProf}
          onChange={(e) => setFilterProf(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Tous les professeurs</option>
          {professeurs.map((p) => (
            <option key={p.id} value={p.id}>{p.prenoms} {p.nom}</option>
          ))}
        </select>
      </div>

      {/* Liste des enregistrements */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((rec) => {
          const platform = getPlatform(rec.lien);
          const thumbnail = platform === "youtube" ? getYouTubeThumbnail(rec.lien) : null;
          return (
          <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col overflow-hidden">
            {/* Miniature vidéo */}
            <div className="relative w-full aspect-video bg-slate-100 overflow-hidden">
              {thumbnail ? (
                <img src={thumbnail} alt={rec.titre} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : platform === "mega" ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                  style={{ backgroundColor: "#d9272e1a", color: "#d9272e" }}
                >
                  {Icons.mega}
                  <span className="text-[11px] font-bold tracking-wide">MEGA</span>
                </div>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: (rec.cours?.couleur || "#6366f1") + "1a", color: rec.cours?.couleur || "#6366f1" }}
                >
                  {Icons.video}
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(rec)} className="p-1.5 rounded-lg bg-white/90 hover:bg-white transition text-slate-500 hover:text-indigo-500 shadow">
                  {Icons.editBtn}
                </button>
                <button onClick={() => handleDelete(rec.id)} className="p-1.5 rounded-lg bg-white/90 hover:bg-white transition text-slate-500 hover:text-red-500 shadow">
                  {Icons.trash}
                </button>
              </div>
              {rec.cours && (
                <span
                  className="absolute bottom-2 left-2 text-[11px] font-semibold px-2 py-1 rounded-full bg-white/90"
                  style={{ color: rec.cours.couleur || "#6366f1" }}
                >
                  {rec.cours.titre}
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-[15px] mb-1 leading-snug">{rec.titre}</h3>

              <div className="text-xs text-slate-500 space-y-0.5 mb-3">
                <div>{new Date(rec.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                {rec.professeur && <div>Par {rec.professeur.prenoms} {rec.professeur.nom}</div>}
              </div>

              {rec.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{rec.description}</p>
              )}

              <a
                href={rec.lien}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition active:scale-95"
              >
                {platform === "mega" ? "Voir sur MEGA" : platform === "youtube" ? "Voir sur YouTube" : "Voir l'enregistrement"}
                {Icons.externalLink}
              </a>
            </div>
          </div>
          );
        })}
      </div>

      {filtered.length === 0 && enregistrements.length > 0 && (
        <p className="text-center text-slate-400 py-12">Aucun résultat pour cette recherche.</p>
      )}
      {enregistrements.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            {Icons.video}
          </div>
          <p className="text-slate-500 font-medium">Aucun enregistrement pour le moment</p>
          <p className="text-sm text-slate-400 mt-1">Ajoutez le lien de votre premier cours enregistré sur YouTube ou MEGA.</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DEVOIRS & NOTES — le prof choisit un cours, consulte
   les fichiers soumis par un participant et le note.
   ═══════════════════════════════════════════════════ */
function DevoirsNotesProfTab({ cours, participants }: { cours: Cours[]; participants: Participant[] }) {
  const [coursId, setCoursId] = useState("");
  const [search, setSearch] = useState("");
  const [soumissions, setSoumissions] = useState<DevoirSoumission[]>([]);
  const [notes, setNotes] = useState<NoteCours[]>([]);
  const [loadingCours, setLoadingCours] = useState(false);
  const [openParticipantId, setOpenParticipantId] = useState<string | null>(null);

  const fetchDataForCours = async (id: string) => {
    setLoadingCours(true);
    const [{ data: sData, error: sErr }, { data: nData, error: nErr }] = await Promise.all([
      supabase.from("devoir_soumissions").select("*").eq("cours_id", id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("cours_id", id),
    ]);
    if (!sErr) setSoumissions(sData || []);
    if (!nErr) setNotes(nData || []);
    setLoadingCours(false);
  };

  const handleSelectCours = (id: string) => {
    setCoursId(id);
    setOpenParticipantId(null);
    if (id) fetchDataForCours(id);
    else { setSoumissions([]); setNotes([]); }
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const full = `${p.prenoms} ${p.nom}`.toLowerCase();
      return !search.trim() || full.includes(search.trim().toLowerCase());
    });
  }, [participants, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Devoirs &amp; Notes</h2>
        <p className="text-sm text-slate-500 mt-1">Choisissez un cours pour consulter les devoirs soumis par chaque participant et lui attribuer une note.</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Cours</label>
        <select
          value={coursId}
          onChange={(e) => handleSelectCours(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">— Choisir un cours —</option>
          {cours.map((c) => (
            <option key={c.id} value={c.id}>{c.titre}</option>
          ))}
        </select>
      </div>

      {coursId && (
        loadingCours ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chargement...</div>
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un participant..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2.5">
              {filteredParticipants.map((p) => {
                const fichiers = soumissions.filter((s) => s.participant_id === p.id);
                const note = notes.find((n) => n.participant_id === p.id);
                const isOpen = openParticipantId === p.id;
                return (
                  <ParticipantDevoirRow
                    key={p.id}
                    participant={p}
                    coursId={coursId}
                    fichiers={fichiers}
                    note={note}
                    isOpen={isOpen}
                    onToggle={() => setOpenParticipantId(isOpen ? null : p.id)}
                    onSaved={() => fetchDataForCours(coursId)}
                  />
                );
              })}
              {filteredParticipants.length === 0 && (
                <p className="text-center text-slate-400 py-10 text-sm">Aucun participant trouvé.</p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ParticipantDevoirRow({
  participant,
  coursId,
  fichiers,
  note,
  isOpen,
  onToggle,
  onSaved,
}: {
  participant: Participant;
  coursId: string;
  fichiers: DevoirSoumission[];
  note?: NoteCours;
  isOpen: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [note1, setNote1] = useState(note?.note1?.toString() ?? "");
  const [note2, setNote2] = useState(note?.note2?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNote1(note?.note1?.toString() ?? "");
    setNote2(note?.note2?.toString() ?? "");
  }, [note?.note1, note?.note2]);

  const handleSave = async () => {
    setError("");
    const n1 = note1.trim() === "" ? null : Number(note1);
    const n2 = note2.trim() === "" ? null : Number(note2);
    if ((note1.trim() !== "" && Number.isNaN(n1)) || (note2.trim() !== "" && Number.isNaN(n2))) {
      setError("Les notes doivent être des nombres.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("notes")
      .upsert(
        { participant_id: participant.id, cours_id: coursId, note1: n1, note2: n2, updated_at: new Date().toISOString() },
        { onConflict: "participant_id,cours_id" }
      );
    setSaving(false);
    if (err) setError(err.message);
    else onSaved();
  };

  const moyenne = note1.trim() !== "" && note2.trim() !== "" && !Number.isNaN(Number(note1)) && !Number.isNaN(Number(note2))
    ? ((Number(note1) + Number(note2)) / 2).toFixed(2)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {participant.prenoms?.[0]}{participant.nom?.[0]}
          </div>
          <div className="min-w-0 text-left">
            <p className="font-semibold text-sm truncate">{participant.prenoms} {participant.nom}</p>
            <p className="text-xs text-slate-400">
              {fichiers.length === 0 ? "Aucun fichier soumis" : `${fichiers.length} fichier${fichiers.length > 1 ? "s" : ""} soumis`}
              {moyenne !== null && ` · Moyenne : ${moyenne}`}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}>{Icons.chevronDown}</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fichiers soumis</p>
            {fichiers.length === 0 ? (
              <p className="text-sm text-slate-400">Ce participant n'a pas encore soumis de fichier pour ce cours.</p>
            ) : (
              <div className="space-y-2">
                {fichiers.map((f) => (
                  <a
                    key={f.id}
                    href={f.fichier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-indigo-300 transition"
                  >
                    <span className="text-slate-400 flex-shrink-0">{Icons.fileText}</span>
                    <span className="truncate flex-1 font-medium">{f.fichier_nom}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Note 1</label>
                <input
                  type="number"
                  step="0.01"
                  value={note1}
                  onChange={(e) => setNote1(e.target.value)}
                  placeholder="—"
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Note 2</label>
                <input
                  type="number"
                  step="0.01"
                  value={note2}
                  onChange={(e) => setNote2(e.target.value)}
                  placeholder="—"
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 text-sm font-semibold hover:brightness-110 transition active:scale-95 disabled:opacity-60"
              >
                {saving ? "..." : "Enregistrer les notes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}