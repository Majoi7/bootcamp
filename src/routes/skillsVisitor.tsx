// src/routes/skillsVisitor.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/skillsVisitor")({
  head: () => ({
    meta: [
      { title: "Skills — Bootcamp Amphix 2026" },
      { name: "description", content: "Découvrez les skills et leurs dépôts GitHub." },
    ],
  }),
  component: SkillsVisitorPage,
});

interface Skill {
  id: string;
  titre: string;
  lien_github: string;
  created_at: string;
}

const IconGithub = (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.1.68-.22.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/>
  </svg>
);

const IconArrow = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

function SkillsVisitorPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .order("titre", { ascending: true });
      if (!error) setSkills(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Skills</h1>
          <p className="text-sm text-slate-400 mt-1.5">Retrouvez ici les projets et leurs dépôts GitHub.</p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-400">Chargement...</p>
        ) : skills.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Aucun skill n'a encore été ajouté.</p>
        ) : (
          <ul className="space-y-2.5">
            {skills.map((s) => (
              <li key={s.id}>
                <a
                  href={s.lien_github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-5 py-4 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-400 flex-shrink-0">{IconGithub}</span>
                    <span className="font-semibold text-[15px] text-slate-800 truncate">{s.titre}</span>
                  </span>
                  <span className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition flex-shrink-0">
                    {IconArrow}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}