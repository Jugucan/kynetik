import type { Handler } from "@netlify/functions";

const FALLBACK_PHRASES = [
  { title: "Imparable!", phrase: "La constància que demostres cada dia és el que marca la diferència. Continua!" },
  { title: "Vas a tope!", phrase: "Cada sessió és una victòria. El teu cos t'ho agraeix cada vegada que apareixes." },
  { title: "Constància real!", phrase: "Pas a pas, sessió a sessió. Així és com s'arriba lluny." },
  { title: "Bon ritme!", phrase: "Mantenir el ritme és tot un art, i tu l'has dominat." },
  { title: "Energia positiva!", phrase: "El que fas aquí dins es nota fora. Segueix brillant!" },
  { title: "Dedicació pura!", phrase: "Els resultats no arriben per casualitat. Arriben per persones com tu." },
  { title: "Sense excuses!", phrase: "Dia rere dia, sense aturar-te. Això és el que et fa especial." },
  { title: "Al següent nivell!", phrase: "Cada vegada que apareixes, et superes. Això és creixement real." },
  { title: "Força interior!", phrase: "La motivació et posa en marxa, però la disciplina et manté en moviment." },
  { title: "Orgullosa de tu!", phrase: "El compromís que tens amb tu mateixa és la millor inversió que pots fer." },
];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // ── INTENT AMB GROQ ──────────────────────────────────────
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 150,
            temperature: 0.9,
            messages: body.messages,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const text = groqData.choices?.[0]?.message?.content?.trim();

          if (text) {
            return {
              statusCode: 200,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: [{ type: "text", text }]
              }),
            };
          }
        }
      } catch (groqError) {
        console.error("Groq error, usant fallback:", groqError);
      }
    }

    // ── FALLBACK: Frases predefinides ────────────────────────
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    const fallback = FALLBACK_PHRASES[dayOfYear % FALLBACK_PHRASES.length];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: [{
          type: "text",
          text: `TÍTOL: ${fallback.title}\nMISSATGE: ${fallback.phrase}`
        }]
      }),
    };

  } catch (error) {
    console.error("Error general:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error intern del servidor" }),
    };
  }
};
