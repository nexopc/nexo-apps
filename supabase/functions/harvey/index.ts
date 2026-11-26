// Harvey · función segura en Supabase.
// Recibe las peticiones de las apps (con la sesión del usuario), les agrega la clave de Claude
// que vive SOLO aquí como secreto, revisa el tope de gasto del día y anota el uso en `uso_ia`.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://nexopc.github.io", "http://localhost:8765", "http://localhost:8766"];
const MODELS: Record<string, [number, number]> = { // USD por millón de tokens (entrada, salida)
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};
const LIMITE_DIA = Number(Deno.env.get("HARVEY_LIMITE_DIA_USD") ?? "0.5");

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers") ?? "authorization, content-type, x-api-key, anthropic-version, anthropic-beta",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function fail(req: Request, status: number, message: string) {
  const type = status === 401 ? "authentication_error" : status === 429 ? "rate_limit_error" : "api_error";
  return new Response(JSON.stringify({ type: "error", error: { type, message } }), {
    status,
    headers: { ...cors(req), "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const url = new URL(req.url);
  if (req.method !== "POST" || !url.pathname.endsWith("/v1/messages")) return fail(req, 404, "Ruta no válida");

  // 1) ¿Quién pregunta? Solo usuarios con sesión.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: who, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !who?.user) return fail(req, 401, "Entra con Google para usar a Harvey.");
  const uid = who.user.id;

  // 2) Clave de Claude (secreto del servidor)
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return fail(req, 503, "Harvey todavía no tiene su clave de Claude (paso A5). Todo lo demás funciona.");

  // 3) Revisar la petición
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(req, 400, "Petición inválida"); }
  const model = String(body.model ?? "");
  if (!MODELS[model]) return fail(req, 400, "Modelo no permitido: " + model);
  body.max_tokens = Math.min(Number(body.max_tokens ?? 4000), 16000);

  // 4) Tope de gasto del día (hora de Colombia)
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const { data: usos } = await admin.from("uso_ia").select("costo_usd").eq("user_id", uid).eq("fecha", hoy);
  const gastado = (usos ?? []).reduce((a, r) => a + Number(r.costo_usd), 0);
  if (gastado >= LIMITE_DIA) return fail(req, 429, "Llegaste al tope de hoy (US$" + LIMITE_DIA + "). Harvey vuelve mañana.");

  // 5) Enviar a Claude
  const headers: Record<string, string> = {
    "x-api-key": key,
    "content-type": "application/json",
    "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
  };
  const beta = req.headers.get("anthropic-beta");
  if (beta) headers["anthropic-beta"] = beta;
  const r = await fetch("https://api.anthropic.com/v1/messages" + url.search, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await r.text();

  // 6) Anotar el uso
  if (r.ok) {
    try {
      const j = JSON.parse(text);
      const u = j.usage ?? {};
      const inTok = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + Math.round((u.cache_read_input_tokens ?? 0) * 0.1);
      const outTok = u.output_tokens ?? 0;
      const [pi, po] = MODELS[j.model] ?? MODELS[model];
      await admin.from("uso_ia").insert({
        user_id: uid, fecha: hoy, modelo: j.model ?? model,
        tokens_entrada: inTok, tokens_salida: outTok, costo_usd: (inTok * pi + outTok * po) / 1e6,
      });
    } catch (_) { /* el registro de uso no debe bloquear la respuesta */ }
  }
  return new Response(text, { status: r.status, headers: { ...cors(req), "content-type": "application/json" } });
});
