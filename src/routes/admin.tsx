// src/routes/admin.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Bootcamp Amphix 2026" },
      { name: "description", content: "Dashboard administrateur du Bootcamp Amphix 2026." },
    ],
  }),
  component: ProtectedAdminDashboard,
});

/* ─── Types ─── */
interface Participant {
  id: string;
  created_at: string;
  nom: string;
  prenoms: string;
  whatsapp: string;
  niveau_etudes: "Collège" | "Lycée" | "Licence";
  paye: boolean;
  montant_paye: number;
  date_paiement: string | null;
}

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

interface Session {
  id: string;
  cours_id: string;
  professeur_id: string | null;
  date: string;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  description: string | null;
  created_at: string;
  cours?: Cours;
  professeur?: Professeur;
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

type AdminTab = "dashboard" | "participants" | "cours" | "professeurs" | "programme" | "calendrier" | "enregistrements";

/* ─── Icônes SVG (style Lucide) ─── */
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  teacher: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  arrowLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 14L4 9l5-5"/>
      <path d="M4 9h10a4 4 0 0 1 4 4v0"/>
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  bell: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  chart: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 20V10"/>
      <path d="M12 20V4"/>
      <path d="M6 20v-6"/>
    </svg>
  ),
  alert: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  check: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  task: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  more: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  ),
  google: (
    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
    </svg>
  ),
  trendUp: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  ),
  trendDown: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  plusBtn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  editBtn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  lightning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  dollar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  checkCircle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  externalLink: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
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
};

/* ─── Hash de mot de passe (identique à connexion.tsx) ─── */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "amphix-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hashBuffer));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Protection par mot de passe (script local, sans base de données) ───
   Le mot de passe n'est jamais stocké en clair : seul son hash SHA-256
   (avec sel) est comparé. La session reste ouverte tant que l'onglet
   du navigateur n'est pas fermé (sessionStorage). */
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
          Entrez le mot de passe pour accéder au dashboard.
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

function ProtectedAdminDashboard() {
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

  return <AdminDashboard />;
}

/* ─── Composant Admin ─── */
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cours, setCours] = useState<Cours[]>([]);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enregistrements, setEnregistrements] = useState<Enregistrement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchParticipants(),
      fetchCours(),
      fetchProfesseurs(),
      fetchSessions(),
      fetchEnregistrements(),
    ]);
    setLoading(false);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants").select("*").order("created_at", { ascending: false });
    if (!error) setParticipants(data || []);
  };

  const fetchCours = async () => {
    const { data, error } = await supabase
      .from("cours").select("*").order("titre", { ascending: true });
    if (!error) setCours(data || []);
  };

  const fetchProfesseurs = async () => {
    const { data, error } = await supabase
      .from("professeurs").select("*").order("nom", { ascending: true });
    if (!error) setProfesseurs(data || []);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*, cours:cours_id(*), professeur:professeur_id(*)")
      .order("date", { ascending: true })
      .order("heure_debut", { ascending: true });
    if (!error) setSessions(data || []);
  };

  const fetchEnregistrements = async () => {
    const { data, error } = await supabase
      .from("enregistrements")
      .select("*, cours:cours_id(*), professeur:professeur_id(*)")
      .order("date", { ascending: false });
    if (!error) setEnregistrements(data || []);
  };

  const [periode, setPeriode] = useState<"jour" | "semaine" | "mois" | "annee">("jour");

  const stats = useMemo(() => {
    const totalParticipants = participants.length;
    const totalPayes = participants.filter((p) => p.paye).length;
    const totalNonPayes = totalParticipants - totalPayes;
    const totalFCFA = participants.reduce((sum, p) => sum + p.montant_paye, 0);
    const totalCours = cours.length;
    const totalSessions = sessions.length;
    const sessionsCetteSemaine = sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      const today = new Date();
      const diff = Math.ceil((sessionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;
    return { totalParticipants, totalPayes, totalNonPayes, totalFCFA, totalCours, totalSessions, sessionsCetteSemaine };
  }, [participants, cours, sessions]);

  // ── Progression réelle : semaine en cours vs semaine précédente ──
  const startOfWeek = (d: Date) => {
    const nd = new Date(d);
    const day = nd.getDay();
    nd.setDate(nd.getDate() - day + (day === 0 ? -6 : 1));
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const progression = useMemo(() => {
    const now = new Date();
    const debutSemaine = startOfWeek(now);
    const debutSemaineDerniere = new Date(debutSemaine);
    debutSemaineDerniere.setDate(debutSemaineDerniere.getDate() - 7);

    const inscritsCetteSemaine = participants.filter((p) => new Date(p.created_at) >= debutSemaine).length;
    const inscritsSemaineDerniere = participants.filter((p) => {
      const d = new Date(p.created_at);
      return d >= debutSemaineDerniere && d < debutSemaine;
    }).length;

    const dateEncaissement = (p: Participant) => (p.date_paiement || p.created_at);
    const fcfaCetteSemaine = participants
      .filter((p) => p.paye)
      .filter((p) => new Date(dateEncaissement(p)) >= debutSemaine)
      .reduce((s, p) => s + p.montant_paye, 0);
    const fcfaSemaineDerniere = participants
      .filter((p) => p.paye)
      .filter((p) => { const d = new Date(dateEncaissement(p)); return d >= debutSemaineDerniere && d < debutSemaine; })
      .reduce((s, p) => s + p.montant_paye, 0);

    return { inscritsCetteSemaine, inscritsSemaineDerniere, fcfaCetteSemaine, fcfaSemaineDerniere };
  }, [participants]);

  const navItems: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: Icons.dashboard },
    { key: "participants", label: "Participants", icon: Icons.users },
    { key: "cours", label: "Cours", icon: Icons.book },
    { key: "professeurs", label: "Professeurs", icon: Icons.teacher },
    { key: "programme", label: "Programmer", icon: Icons.plus },
    { key: "calendrier", label: "Calendrier", icon: Icons.calendar },
    { key: "enregistrements", label: "Enregistrements", icon: Icons.video },
  ];

  const kpiData = [
    {
      label: "Participants",
      value: stats.totalParticipants.toLocaleString("fr-FR"),
      trend: `+${progression.inscritsCetteSemaine}`,
      trendLabel: "inscrits cette semaine",
      trendUp: progression.inscritsCetteSemaine > 0 ? true : null,
      icon: Icons.users,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      glow: "bg-indigo-500",
    },
    {
      label: "FCFA encaissés",
      value: stats.totalFCFA.toLocaleString("fr-FR"),
      trend: `+${progression.fcfaCetteSemaine.toLocaleString("fr-FR")}`,
      trendLabel: "FCFA cette semaine",
      trendUp: progression.fcfaCetteSemaine > 0 ? true : null,
      icon: Icons.dollar,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      glow: "bg-orange-500",
    },
    {
      label: "Payés",
      value: stats.totalPayes.toLocaleString("fr-FR"),
      trend: stats.totalParticipants > 0 ? `${Math.round((stats.totalPayes / stats.totalParticipants) * 100)}%` : "0%",
      trendLabel: "des inscrits",
      trendUp: true,
      icon: Icons.checkCircle,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      glow: "bg-emerald-500",
    },
    {
      label: "Non payés",
      value: stats.totalNonPayes.toLocaleString("fr-FR"),
      trend: stats.totalParticipants > 0 ? `${Math.round((stats.totalNonPayes / stats.totalParticipants) * 100)}%` : "0%",
      trendLabel: "des inscrits",
      trendUp: stats.totalNonPayes > 0 ? false : null,
      icon: Icons.alert,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      glow: "bg-red-500",
    },
    {
      label: "Cours",
      value: stats.totalCours.toString(),
      trend: "Total",
      trendLabel: `${stats.totalSessions} séances programmées`,
      trendUp: null,
      icon: Icons.book,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      glow: "bg-blue-500",
    },
    {
      label: "Cette semaine",
      value: stats.sessionsCetteSemaine.toString(),
      trend: "Sessions",
      trendLabel: "dans les 7 prochains jours",
      trendUp: null,
      icon: Icons.lightning,
      iconBg: "bg-lime-50",
      iconColor: "text-lime-600",
      glow: "bg-lime-500",
    },
  ];

  // ── Revenus réels agrégés par période sélectionnée ──
  const bucketKeyFor = (date: Date, p: typeof periode): string => {
    if (p === "jour") { const d = new Date(date); d.setHours(0, 0, 0, 0); return d.toISOString().split("T")[0]; }
    if (p === "semaine") return startOfWeek(date).toISOString().split("T")[0];
    if (p === "mois") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return `${date.getFullYear()}`;
  };

  const bucketLabelFor = (date: Date, p: typeof periode): string => {
    if (p === "jour") return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (p === "semaine") return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (p === "mois") return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    return `${date.getFullYear()}`;
  };

  const bucketDateAt = (now: Date, i: number, p: typeof periode): Date => {
    if (p === "jour") { const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); return d; }
    if (p === "semaine") { const d = new Date(now); d.setDate(d.getDate() - i * 7); return startOfWeek(d); }
    if (p === "mois") return new Date(now.getFullYear(), now.getMonth() - i, 1);
    return new Date(now.getFullYear() - i, 0, 1);
  };

  const nbBuckets = { jour: 14, semaine: 8, mois: 6, annee: 5 }[periode];

  const revenueSeries = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: nbBuckets }, (_, idx) => {
      const i = nbBuckets - 1 - idx;
      const d = bucketDateAt(now, i, periode);
      return { key: bucketKeyFor(d, periode), label: bucketLabelFor(d, periode), total: 0 };
    });
    const map = new Map(buckets.map((b) => [b.key, b]));
    participants.forEach((p) => {
      if (!p.paye) return;
      const raw = p.date_paiement || p.created_at;
      if (!raw) return;
      const key = bucketKeyFor(new Date(raw), periode);
      const bucket = map.get(key);
      if (bucket) bucket.total += p.montant_paye;
    });
    return buckets;
  }, [participants, periode, nbBuckets]);

  const totalPeriode = useMemo(() => revenueSeries.reduce((s, b) => s + b.total, 0), [revenueSeries]);
  const maxBucket = useMemo(() => Math.max(1, ...revenueSeries.map((b) => b.total)), [revenueSeries]);

  const repartitionNiveaux = useMemo(() => {
    const niveaux: Participant["niveau_etudes"][] = ["Collège", "Lycée", "Licence"];
    const total = participants.length || 1;
    return niveaux.map((n) => {
      const count = participants.filter((p) => p.niveau_etudes === n).length;
      return { niveau: n, count, pct: Math.round((count / total) * 100) };
    });
  }, [participants]);

  const derniersInscrits = useMemo(
    () => [...participants].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [participants]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-sm">
            A
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">Amphix</span>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[1.2px] px-3 pt-4 pb-2">
            Menu principal
          </div>
          {navItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200",
                activeTab === tab.key
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span className={activeTab === tab.key ? "text-white" : ""}>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <a
            href="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            {Icons.arrowLeft}
            Retour au site
          </a>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* TOP BAR */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-7 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-slate-500 font-medium">
              Amphix Admin / <strong className="text-slate-900">Dashboard</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3.5 py-2 border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              {Icons.search}
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent border-none outline-none text-[13px] w-48 text-slate-900 placeholder-slate-400"
              />
            </div>
            <button className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition relative">
              {Icons.bell}
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
            </button>
            <button className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">
              {Icons.settings}
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[13px] font-bold cursor-pointer">
              NW
            </div>
          </div>
        </div>

        {/* HERO */}
        {activeTab === "dashboard" && (
          <>
            <section className="relative bg-gradient-to-br from-indigo-50/80 via-pink-50/60 to-orange-50/50 px-7 pt-8 pb-12 overflow-hidden">
              <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-10 w-[400px] h-[400px] rounded-full bg-pink-500/[0.03] blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-6xl">
                <h1 className="text-[28px] font-extrabold tracking-tight">
                  <span className="text-indigo-600">Dash</span>board Administrateur
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Vue d'ensemble du Bootcamp Amphix 2026 — suivez les inscriptions, les revenus et le programme en temps réel.
                </p>
              </div>
            </section>

            {/* KPI CARDS */}
            <section className="px-7 -mt-5 relative z-10 max-w-6xl">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiData.map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className={`absolute -right-5 -top-5 w-20 h-20 ${kpi.glow} rounded-full opacity-[0.08] blur-2xl group-hover:opacity-[0.15] group-hover:scale-125 transition-all duration-500`} />
                    <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center mb-3`}>
                      <span className={kpi.iconColor}>{kpi.icon}</span>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-slate-500 mb-1.5">{kpi.label}</div>
                    <div className="text-[26px] font-extrabold tracking-tight leading-none mb-2">{kpi.value}</div>
                    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                      kpi.trendUp === true ? "bg-emerald-50 text-emerald-700" :
                      kpi.trendUp === false ? "bg-red-50 text-red-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {kpi.trendUp === true ? Icons.trendUp : kpi.trendUp === false ? Icons.trendDown : null}
                      {kpi.trend} {kpi.trendLabel}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CONTENT GRID */}
            <section className="px-7 py-6 pb-20 max-w-6xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* CHART REVENUS RÉELS */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-[15px] font-bold">
                      <span className="text-indigo-500">{Icons.chart}</span>
                      Revenus encaissés
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                      {([
                        { key: "jour", label: "Jour" },
                        { key: "semaine", label: "Semaine" },
                        { key: "mois", label: "Mois" },
                        { key: "annee", label: "Année" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setPeriode(opt.key)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                            periode === opt.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 pt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold tracking-tight">{totalPeriode.toLocaleString("fr-FR")}</span>
                    <span className="text-sm font-semibold text-slate-400">FCFA sur la période affichée</span>
                  </div>

                  <div className="p-5 h-[240px]">
                    {totalPeriode === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <span className="w-10 h-10 mb-2">{Icons.dollar}</span>
                        <p className="text-sm text-slate-400 font-medium">Aucun paiement enregistré sur cette période</p>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between h-full gap-1.5 px-1">
                        {revenueSeries.map((b) => (
                          <div key={b.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <div
                              className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-500 relative group cursor-pointer transition-all hover:brightness-110"
                              style={{ height: `${Math.max(4, (b.total / maxBucket) * 100)}%` }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                                {b.total.toLocaleString("fr-FR")} FCFA
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-5">
                  {/* Répartition par niveau */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 text-[15px] font-bold">
                      <span className="text-indigo-500">{Icons.users}</span>
                      Répartition par niveau
                    </div>
                    <div className="p-5 space-y-4">
                      {repartitionNiveaux.map((r) => (
                        <div key={r.niveau}>
                          <div className="flex items-center justify-between text-[13px] mb-1.5">
                            <span className="font-semibold text-slate-700">{r.niveau}</span>
                            <span className="text-slate-400 font-medium">{r.count} ({r.pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                              style={{ width: `${r.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Derniers inscrits */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 text-[15px] font-bold">
                      <span className="text-pink-500">{Icons.calendar}</span>
                      Derniers inscrits
                    </div>
                    {derniersInscrits.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun participant pour l'instant.</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {derniersInscrits.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-xs">
                              {p.prenoms?.[0] || p.nom[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-slate-900 truncate">{p.prenoms} {p.nom}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {p.niveau_etudes}
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                              p.paye ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                            }`}>
                              {p.paye ? "Payé" : "Non payé"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* AUTRES TABS (inchangés de ton code original) */}
        {activeTab === "participants" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <ParticipantsTab participants={participants} onRefresh={fetchParticipants} />
          </section>
        )}
        {activeTab === "cours" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <CoursTab cours={cours} onRefresh={fetchCours} />
          </section>
        )}
        {activeTab === "professeurs" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <ProfesseursTab professeurs={professeurs} onRefresh={fetchProfesseurs} />
          </section>
        )}
        {activeTab === "programme" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <ProgrammeTab cours={cours} professeurs={professeurs} onRefresh={fetchSessions} />
          </section>
        )}
        {activeTab === "calendrier" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <CalendrierAdminTab sessions={sessions} cours={cours} professeurs={professeurs} onRefresh={fetchSessions} />
          </section>
        )}
        {activeTab === "enregistrements" && (
          <section className="px-7 py-6 pb-20 max-w-6xl">
            <EnregistrementsTab enregistrements={enregistrements} cours={cours} professeurs={professeurs} onRefresh={fetchEnregistrements} />
          </section>
        )}

    
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: PARTICIPANTS (inchangé)
   ═══════════════════════════════════════════════════ */
function ParticipantsTab({ participants, onRefresh }: { participants: Participant[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [filterNiveau, setFilterNiveau] = useState<"" | "Collège" | "Lycée" | "Licence">("");
  const [filterPaye, setFilterPaye] = useState<"" | "paye" | "non_paye">("");
  const [sortBy, setSortBy] = useState<"date" | "nom" | "montant">("date");

  const [resetTarget, setResetTarget] = useState<Participant | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const openReset = (p: Participant) => {
    setResetTarget(p);
    setNewPassword("");
    setResetError("");
    setResetSuccess(false);
  };

  const closeReset = () => setResetTarget(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError("");

    if (newPassword.length < 6) {
      setResetError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setResetLoading(true);
    const hash = await hashPassword(newPassword);
    const { error } = await supabase
      .from("participants")
      .update({ password_hash: hash })
      .eq("id", resetTarget.id);
    setResetLoading(false);

    if (error) {
      setResetError(error.message || "Une erreur est survenue lors de la mise à jour.");
      return;
    }

    setResetSuccess(true);
    setTimeout(() => setResetTarget(null), 1200);
  };

  const [paymentTarget, setPaymentTarget] = useState<Participant | null>(null);
  const [montantInput, setMontantInput] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const openPayment = (p: Participant) => {
    setPaymentTarget(p);
    setMontantInput(p.paye && p.montant_paye ? String(p.montant_paye) : "");
    setPaymentError("");
  };

  const closePayment = () => setPaymentTarget(null);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    setPaymentError("");

    const montant = parseInt(montantInput.replace(/[^\d]/g, ""), 10);
    if (!montant || montant <= 0) {
      setPaymentError("Entrez un montant valide (en FCFA).");
      return;
    }

    setPaymentLoading(true);
    let { error } = await supabase
      .from("participants")
      .update({ paye: true, montant_paye: montant, date_paiement: new Date().toISOString() })
      .eq("id", paymentTarget.id);

    // Repli si la colonne date_paiement n'existe pas encore (migration SQL non exécutée) :
    // on enregistre au moins le paiement sans bloquer l'admin.
    if (error && /date_paiement/i.test(error.message || "")) {
      const retry = await supabase
        .from("participants")
        .update({ paye: true, montant_paye: montant })
        .eq("id", paymentTarget.id);
      error = retry.error;
    }

    setPaymentLoading(false);

    if (error) {
      setPaymentError(error.message || "Une erreur est survenue lors de l'enregistrement.");
      return;
    }
    onRefresh();
    closePayment();
  };

  const marquerNonPaye = async (id: string) => {
    if (!confirm("Marquer ce participant comme non payé ? Le montant enregistré sera remis à zéro.")) return;
    let { error } = await supabase
      .from("participants")
      .update({ paye: false, montant_paye: 0, date_paiement: null })
      .eq("id", id);

    if (error && /date_paiement/i.test(error.message || "")) {
      const retry = await supabase
        .from("participants")
        .update({ paye: false, montant_paye: 0 })
        .eq("id", id);
      error = retry.error;
    }

    if (!error) onRefresh();
    else alert(error.message || "Une erreur est survenue.");
  };

  const filtered = useMemo(() => {
    let result = [...participants];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.nom.toLowerCase().includes(q) ||
        p.prenoms.toLowerCase().includes(q) ||
        p.whatsapp.includes(q)
      );
    }
    if (filterNiveau) result = result.filter((p) => p.niveau_etudes === filterNiveau);
    if (filterPaye === "paye") result = result.filter((p) => p.paye);
    if (filterPaye === "non_paye") result = result.filter((p) => !p.paye);
    if (sortBy === "nom") result.sort((a, b) => a.nom.localeCompare(b.nom));
    else if (sortBy === "montant") result.sort((a, b) => b.montant_paye - a.montant_paye);
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [participants, search, filterNiveau, filterPaye, sortBy]);

  const exportCSV = () => {
    const headers = ["Date", "Nom", "Prénoms", "WhatsApp", "Niveau", "Payé", "Montant (FCFA)"];
    const rows = filtered.map((p) => [
      new Date(p.created_at).toLocaleDateString("fr-FR"),
      p.nom,
      p.prenoms,
      p.whatsapp,
      p.niveau_etudes,
      p.paye ? "Oui" : "Non",
      p.montant_paye,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-bootcamp-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            placeholder="Rechercher un participant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition w-full md:w-72"
          />
          <select
            value={filterNiveau}
            onChange={(e) => setFilterNiveau(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
          >
            <option value="">Tous les niveaux</option>
            <option value="Collège">Collège</option>
            <option value="Lycée">Lycée</option>
            <option value="Licence">Licence</option>
          </select>
          <select
            value={filterPaye}
            onChange={(e) => setFilterPaye(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
          >
            <option value="">Tous les paiements</option>
            <option value="paye">Payé</option>
            <option value="non_paye">Non payé</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
          >
            <option value="date">Trier par date</option>
            <option value="nom">Trier par nom</option>
            <option value="montant">Trier par montant</option>
          </select>
        </div>
        <button
          onClick={exportCSV}
          className="rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-800 transition hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          Exporter CSV
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-4 font-semibold text-slate-500">Date</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-500">Nom complet</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-500">WhatsApp</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-500">Niveau</th>
                <th className="text-center px-6 py-4 font-semibold text-slate-500">Statut</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-500">Montant</th>
                <th className="text-center px-6 py-4 font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    Aucun participant trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 font-medium">{p.nom} <span className="text-slate-400">{p.prenoms}</span></td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.whatsapp}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        p.niveau_etudes === "Collège" ? "bg-sky-50 text-sky-700" :
                        p.niveau_etudes === "Lycée" ? "bg-orange-50 text-orange-700" :
                        "bg-yellow-50 text-yellow-700"
                      }`}>{p.niveau_etudes}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        p.paye ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.paye ? "bg-emerald-500" : "bg-red-500"}`} />
                        {p.paye ? "Payé" : "Non payé"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{p.montant_paye.toLocaleString("fr-FR")} FCFA</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.paye ? (
                          <>
                            <button
                              onClick={() => openPayment(p)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all hover:scale-105 active:scale-95"
                            >
                              Modifier montant
                            </button>
                            <button
                              onClick={() => marquerNonPaye(p.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-all hover:scale-105 active:scale-95"
                            >
                              Marquer non payé
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openPayment(p)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all hover:scale-105 active:scale-95"
                          >
                            Marquer payé
                          </button>
                        )}
                        <button
                          onClick={() => openReset(p)}
                          title="Réinitialiser le mot de passe"
                          className="rounded-lg p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95"
                        >
                          {Icons.key}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-sm text-slate-400 text-center">
        {filtered.length} participant{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur {participants.length} au total
      </div>

      {/* ── MODAL : ENREGISTRER LE PAIEMENT ── */}
      {paymentTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePayment}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-slate-900">Enregistrer le paiement</h3>
              <button
                onClick={closePayment}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Pour <span className="font-semibold text-slate-700">{paymentTarget.prenoms} {paymentTarget.nom}</span> ({paymentTarget.whatsapp})
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {paymentError && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
                  {paymentError}
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Montant payé (FCFA)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={montantInput}
                    onChange={(e) => setMontantInput(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Ex: 15000"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">FCFA</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
              >
                {paymentLoading ? "..." : "Confirmer le paiement"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : RÉINITIALISER LE MOT DE PASSE ── */}
      {resetTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeReset}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-slate-900">Réinitialiser le mot de passe</h3>
              <button
                onClick={closeReset}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Pour <span className="font-semibold text-slate-700">{resetTarget.prenoms} {resetTarget.nom}</span> ({resetTarget.whatsapp})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 flex items-center gap-2">
                  {Icons.checkCircle}
                  Mot de passe mis à jour.
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {showNewPassword
                        ? <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
              >
                {resetLoading ? "..." : "Réinitialiser"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: COURS (CRUD complet)
   ═══════════════════════════════════════════════════ */
function CoursTab({ cours, onRefresh }: { cours: Cours[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [couleur, setCouleur] = useState("#6366f1");
  const [loading, setLoading] = useState(false);

  const couleursPredefinies = [
    "#6366f1", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#3b82f6",
  ];

  const resetForm = () => {
    setTitre("");
    setDescription("");
    setCouleur("#6366f1");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("cours")
        .update({ titre, description, couleur })
        .eq("id", editingId);
      if (!error) { resetForm(); onRefresh(); }
    } else {
      const { error } = await supabase
        .from("cours")
        .insert({ titre, description, couleur });
      if (!error) { resetForm(); onRefresh(); }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce cours ? Les sessions associées seront aussi supprimées.")) return;
    const { error } = await supabase.from("cours").delete().eq("id", id);
    if (!error) onRefresh();
  };

  const startEdit = (c: Cours) => {
    setTitre(c.titre);
    setDescription(c.description || "");
    setCouleur(c.couleur);
    setEditingId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Gestion des Cours</h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
        >
          {showForm ? "Annuler" : "Ajouter un cours"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Titre du cours *</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Introduction au JavaScript"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du cours..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-2 block">Couleur d'affichage</label>
            <div className="flex flex-wrap gap-2">
              {couleursPredefinies.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCouleur(c)}
                  className={`w-10 h-10 rounded-xl transition-all ${couleur === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
            >
              {loading ? "..." : editingId ? "Modifier" : "Créer le cours"}
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cours.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.couleur }} />
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-indigo-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-slate-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg mb-1">{c.titre}</h3>
            <p className="text-sm text-slate-500 line-clamp-2">{c.description || "Aucune description"}</p>
          </div>
        ))}
      </div>
      {cours.length === 0 && (
        <p className="text-center text-slate-400 py-12">Aucun cours créé. Ajoutez votre premier cours !</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: PROFESSEURS (CRUD complet)
   ═══════════════════════════════════════════════════ */
function ProfesseursTab({ professeurs, onRefresh }: { professeurs: Professeur[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNom("");
    setPrenoms("");
    setSpecialite("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("professeurs")
        .update({ nom, prenoms, specialite })
        .eq("id", editingId);
      if (!error) { resetForm(); onRefresh(); }
    } else {
      const { error } = await supabase
        .from("professeurs")
        .insert({ nom, prenoms, specialite });
      if (!error) { resetForm(); onRefresh(); }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce professeur ?")) return;
    const { error } = await supabase.from("professeurs").delete().eq("id", id);
    if (!error) onRefresh();
  };

  const startEdit = (p: Professeur) => {
    setNom(p.nom);
    setPrenoms(p.prenoms || "");
    setSpecialite(p.specialite || "");
    setEditingId(p.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Gestion des Professeurs</h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
        >
          {showForm ? "Annuler" : "Ajouter un professeur"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Nom *</label>
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Prénoms</label>
              <input type="text" value={prenoms} onChange={(e) => setPrenoms(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Spécialité</label>
            <input type="text" value={specialite} onChange={(e) => setSpecialite(e.target.value)} placeholder="Ex: Développement Web, Design UI/UX..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60">
              {loading ? "..." : editingId ? "Modifier" : "Ajouter"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="rounded-xl bg-slate-100 text-slate-700 px-4 py-3 font-semibold text-sm hover:bg-slate-200 transition">Annuler</button>
            )}
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professeurs.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-lg">
                {p.prenoms ? p.prenoms[0] : p.nom[0]}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-indigo-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-slate-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg">{p.prenoms} {p.nom}</h3>
            <p className="text-sm text-slate-500 mt-1">{p.specialite || "Aucune spécialité"}</p>
          </div>
        ))}
      </div>
      {professeurs.length === 0 && (
        <p className="text-center text-slate-400 py-12">Aucun professeur enregistré. Ajoutez votre premier professeur !</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: PROGRAMME (planification des sessions)
   ═══════════════════════════════════════════════════ */
function ProgrammeTab({ cours, professeurs, onRefresh }: { cours: Cours[]; professeurs: Professeur[]; onRefresh: () => void }) {
  const [coursId, setCoursId] = useState("");
  const [professeurId, setProfesseurId] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [salle, setSalle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coursId || !date || !heureDebut || !heureFin) return;
    setLoading(true);

    const { error } = await supabase.from("sessions").insert({
      cours_id: coursId,
      professeur_id: professeurId || null,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      salle: salle || null,
      description: description || null,
    });

    if (!error) {
      setCoursId("");
      setProfesseurId("");
      setDate("");
      setHeureDebut("");
      setHeureFin("");
      setSalle("");
      setDescription("");
      onRefresh();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Programmer une session</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Cours *</label>
            <select
              value={coursId}
              onChange={(e) => setCoursId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Sélectionner un cours</option>
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
              <option value="">Non assigné</option>
              {professeurs.map((p) => (
                <option key={p.id} value={p.id}>{p.prenoms} {p.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Heure début *</label>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Heure fin *</label>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Salle / Lieu</label>
          <input
            type="text"
            value={salle}
            onChange={(e) => setSalle(e.target.value)}
            placeholder="Ex: Salle A, Amphithéâtre..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Description / Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails supplémentaires..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 font-semibold text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-60"
        >
          {loading ? "Programmation..." : "Programmer la session"}
        </button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: CALENDRIER ADMIN
   ═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   TAB: CALENDRIER ADMIN — Design pixel-perfect
   ═══════════════════════════════════════════════════ */
function CalendrierAdminTab({ sessions, cours, professeurs, onRefresh }: {
  sessions: Session[];
  cours: Cours[];
  professeurs: Professeur[];
  onRefresh: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const d = new Date(s.date).toISOString().split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(s);
    });
    return map;
  }, [sessions]);

  const deleteSession = async (id: string) => {
    if (!confirm("Supprimer cette session ?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (!error) { setSelectedSession(null); onRefresh(); }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Color palette matching the image — pastel backgrounds with dark text
  const eventColors = [
    { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },   // green
    { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },   // purple
    { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },   // blue
    { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },   // yellow
    { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },   // red
    { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },   // pink
    { bg: "#cffafe", text: "#155e75", border: "#a5f3fc" },   // cyan
    { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },   // orange
  ];

  const getEventColor = (index: number) => eventColors[index % eventColors.length];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HEADER: Title + Filter tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm">
            A
          </div>
          <h2 className="text-[28px] font-extrabold tracking-tight text-slate-900">Calendrier</h2>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
          {([
            { key: "all" as const, label: "Toutes les sessions" },
            { key: "upcoming" as const, label: "À venir" },
            { key: "past" as const, label: "Passées" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                filter === t.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MONTH BAR ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[22px] font-bold text-slate-900 leading-tight">
            {monthNames[month]} {year}
          </h3>
          <p className="text-[13px] text-slate-400 mt-1 font-medium">
            {monthNames[month].slice(0, 4)} 1, {year} – {monthNames[month].slice(0, 4)} {daysInMonth}, {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={goToday}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Aujourd'hui
          </button>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
            Vue mois
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvelle session
          </button>
        </div>
      </div>

      {/* ── CALENDAR GRID ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {dayNames.map((d) => (
            <div key={d} className="py-3.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-[0.8px]">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Empty padding cells */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[120px] border-r border-b border-slate-50 bg-slate-50/20 p-2">
              <span className="text-[13px] text-slate-300 font-medium">
                {new Date(year, month, -startDayOfWeek + i + 1).getDate()}
              </span>
            </div>
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySessions = sessionsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={day}
                className={`min-h-[120px] border-r border-b border-slate-100 p-2 transition hover:bg-slate-50/50 ${
                  isToday ? "bg-violet-50/40" : ""
                }`}
              >
                <span className={`text-[13px] font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday
                    ? "bg-violet-500 text-white shadow-md shadow-violet-500/25"
                    : "text-slate-700"
                }`}>
                  {String(day).padStart(2, "0")}
                </span>
                <div className="mt-2 flex flex-col gap-[3px]">
                  {daySessions.map((s, idx) => {
                    const c = cours.find((x) => x.id === s.cours_id);
                    const color = getEventColor(idx);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSession(s)}
                        className="w-full text-left rounded-md px-2 py-[3px] text-[10px] font-semibold truncate transition hover:brightness-95 hover:scale-[1.02]"
                        style={{
                          backgroundColor: color.bg,
                          color: color.text,
                        }}
                        title={`${c?.titre || "Session"} — ${s.heure_debut.slice(0, 5)}`}
                      >
                        {c?.titre || "Session"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Trailing empty cells */}
          {Array.from({ length: (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7 }).map((_, i) => (
            <div key={`trail-${i}`} className="min-h-[120px] border-r border-b border-slate-50 bg-slate-50/20 p-2">
              <span className="text-[13px] text-slate-300 font-medium">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SESSION DETAIL MODAL ── */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-slate-900">Détails de la session</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Cours</span>
                <span className="font-bold text-slate-900">{cours.find((c) => c.id === selectedSession.cours_id)?.titre || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Professeur</span>
                <span className="font-bold text-slate-900">
                  {(() => {
                    const p = professeurs.find((p) => p.id === selectedSession.professeur_id);
                    return p ? `${p.prenoms || ""} ${p.nom}`.trim() : "Non assigné";
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Date</span>
                <span className="font-bold text-slate-900">{new Date(selectedSession.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Horaire</span>
                <span className="font-bold text-slate-900">{selectedSession.heure_debut.slice(0, 5)} – {selectedSession.heure_fin.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Salle</span>
                <span className="font-bold text-slate-900">{selectedSession.salle || "—"}</span>
              </div>
              {selectedSession.description && (
                <div className="pt-2">
                  <span className="text-slate-400 font-medium block mb-1.5">Description</span>
                  <p className="text-slate-600 text-[13px] leading-relaxed bg-slate-50 rounded-xl p-3">{selectedSession.description}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteSession(selectedSession.id)}
                className="flex-1 rounded-xl bg-red-50 text-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-100 transition active:scale-95"
              >
                Supprimer
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition active:scale-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: ENREGISTREMENTS (liens Google Meet des cours enregistrés)
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
      setError("Le lien de l'enregistrement doit être une URL valide (ex: https://drive.google.com/...).");
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
      return matchSearch && matchCours;
    });
  }, [enregistrements, search, filterCours]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Enregistrements Google Meet</h2>
          <p className="text-sm text-slate-500 mt-1">Centralisez les liens des sessions enregistrées pour que les participants puissent les revoir.</p>
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
            <label className="text-sm font-semibold text-slate-500 mb-1.5 block">Lien Google Meet / Drive *</label>
            <input
              type="url"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Astuce : dans Google Meet, les enregistrements sont automatiquement sauvegardés dans Google Drive (dossier "Meet Recordings"). Ouvrez le fichier et copiez son lien de partage ici.
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
      </div>

      {/* Liste des enregistrements */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((rec) => (
          <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (rec.cours?.couleur || "#6366f1") + "1a", color: rec.cours?.couleur || "#6366f1" }}
                >
                  {Icons.video}
                </div>
                {rec.cours && (
                  <span
                    className="text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{ backgroundColor: (rec.cours.couleur || "#6366f1") + "1a", color: rec.cours.couleur || "#6366f1" }}
                  >
                    {rec.cours.titre}
                  </span>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(rec)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-indigo-500">
                  {Icons.editBtn}
                </button>
                <button onClick={() => handleDelete(rec.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-slate-400 hover:text-red-500">
                  {Icons.trash}
                </button>
              </div>
            </div>

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
              Voir l'enregistrement
              {Icons.externalLink}
            </a>
          </div>
        ))}
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
          <p className="text-sm text-slate-400 mt-1">Ajoutez le lien de votre premier cours enregistré sur Google Meet.</p>
        </div>
      )}
    </div>
  );
}