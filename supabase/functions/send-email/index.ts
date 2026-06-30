import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "onboarding@resend.dev";
const TO_EMAIL = "jehovaly7@gmail.com";

serve(async (req) => {
  // Headers CORS complets
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { nom, prenoms, whatsapp, niveau_etudes, pays } = await req.json();

    if (!nom || !prenoms || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400, headers }
      );
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: 600; color: #667eea; width: 140px; flex-shrink: 0; }
          .info-value { color: #333; }
          .badge { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 40px; margin-bottom: 10px;">🚀</div>
            <h1>Nouvelle inscription !</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Bootcamp Amphix 2026</p>
          </div>
          <div class="content">
            <p style="margin-bottom: 20px;">Une nouvelle personne vient de s'inscrire :</p>
            <div class="info-row">
              <div class="info-label">Nom complet</div>
              <div class="info-value">${nom} ${prenoms}</div>
            </div>
            <div class="info-row">
              <div class="info-label">WhatsApp</div>
              <div class="info-value"><span class="badge">📱</span> ${whatsapp}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Niveau d'études</div>
              <div class="info-value">${niveau_etudes}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pays</div>
              <div class="info-value">${pays}</div>
            </div>
            <div style="margin-top: 24px; padding: 16px; background: #f0f4ff; border-radius: 12px; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #667eea; font-weight: 600;">💡 Action requise</p>
              <p style="margin: 8px 0 0 0; color: #555; font-size: 14px;">Contacte cette personne via WhatsApp pour confirmer son inscription et le paiement des 10 000 FCFA.</p>
            </div>
          </div>
          <div class="footer">
            Amphix Bootcamp 2026 · « Apprendre, Construire, Innover »
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Amphix Bootcamp <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: `🎉 Nouvelle inscription : ${nom} ${prenoms}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(
        JSON.stringify({ error: "Erreur d'envoi d'email", details: err }),
        { status: 500, headers }
      );
    }

    const data = await res.json();

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers }
    );

  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers }
    );
  }
});