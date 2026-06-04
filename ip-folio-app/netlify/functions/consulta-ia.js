// ============================================================
// netlify/functions/consulta-ia.js  —  Modo A (orientación)
// La API key vive SOLO en el servidor (variable de entorno
// ANTHROPIC_API_KEY en Netlify). Nunca se expone al frontend.
//
// Despliegue: Netlify Functions (Node 18+, fetch nativo).
// El frontend llama a:  POST /.netlify/functions/consulta-ia
//   body: { "description": "texto del usuario" }
// ============================================================

// Para producción, lo ideal es usar el kit completo (KIT-PORTATIL-IP.md,
// sección MODO A) como system prompt. Aquí va una versión condensada:
const MODEA_SYSTEM = `Eres un asistente de identificación de propiedad intelectual operando en MODO A (orientación rápida), para uso interno. El usuario describe una creación. Tu tarea:
(1) Clasifícala en una o varias vías y explica por qué en lenguaje claro: la patente protege cómo funciona algo; el copyright protege la expresión original; el secreto comercial protege lo que se mantiene confidencial; la marca protege el signo distintivo (nombre, logo). El software suele ser híbrido.
(2) Avisa de relojes y riesgos: si hubo divulgación pública, venta u oferta, en EE. UU. corre un plazo de 1 año para patentar y en muchos países la divulgación previa puede impedir la patente; si no consta la fecha de primera divulgación, pídela.
(3) Da un siguiente paso concreto.
(4) Recuerda el límite: información general de cribado, no asesoría legal; las decisiones de alto valor las valida un abogado de PI. No confundas patentabilidad con libertad de operar.
Responde SOLO con JSON válido, sin markdown ni texto adicional, con esta forma exacta:
{"rutas":[{"tipo":"patent|copyright|trade-secret|trademark|mixed","motivo":"texto"}],"relojes":"texto","siguiente_paso":"texto","limite":"texto"}`;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Usa POST." }) };
  }

  let description = "";
  try { description = (JSON.parse(event.body || "{}").description || "").trim(); } catch (e) {}
  if (!description) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta 'description'." }) };
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Verifica el string de modelo y la tarifa vigentes en https://docs.claude.com
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: MODEA_SYSTEM,
        messages: [{ role: "user", content: description }],
      }),
    });

    const data = await resp.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    let parsed = null;
    try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); } catch (e) {}

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed || { raw: text }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
