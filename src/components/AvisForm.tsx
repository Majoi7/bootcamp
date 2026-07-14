import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AvisForm() {
  const [form, setForm] = useState({ name: "", role: "", text: "", image: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.from("testimonials").insert([
      {
        name: form.name,
        role: form.role,
        text: form.text,
        image: form.image || "https://via.placeholder.com/150", // image par défaut si vide
      },
    ]);
    if (error) {
      console.error(error);
      setStatus("error");
    } else {
      setStatus("success");
      setForm({ name: "", role: "", text: "", image: "" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold">Partage ton expérience</h2>
      <input
        type="text"
        placeholder="Ton nom"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full border rounded-lg p-2"
      />
      <input
        type="text"
        placeholder="Ton rôle (ex: Développeur)"
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        className="w-full border rounded-lg p-2"
      />
      <textarea
        placeholder="Ton avis..."
        required
        value={form.text}
        onChange={(e) => setForm({ ...form, text: e.target.value })}
        className="w-full border rounded-lg p-2"
      />
      <input
        type="url"
        placeholder="URL de ta photo (optionnel)"
        value={form.image}
        onChange={(e) => setForm({ ...form, image: e.target.value })}
        className="w-full border rounded-lg p-2"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-gradient-ocean text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50"
      >
        {status === "loading" ? "Envoi..." : "Envoyer mon avis"}
      </button>
      {status === "success" && <p className="text-green-600">Merci ! Ton avis a été publié.</p>}
      {status === "error" && <p className="text-red-600">Erreur, réessaie.</p>}
    </form>
  );
}