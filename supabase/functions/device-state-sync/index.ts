import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://mamoboat.com",
  "https://www.mamoboat.com",
  "https://hideomi121154-spec.github.io",
]);

function corsFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://mamoboat.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type,x-sync-token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function ledgerKey(item: any) {
  if (!item || typeof item !== "object") return "";
  return String(
    item.uniqueKey ||
    item.id ||
    `${item.type || "ledger"}:${item.recordId || ""}:${item.at || ""}`
  );
}

function mergeLedger(existing: any, incoming: any) {
  const merged = new Map<string, any>();
  for (const item of Array.isArray(existing) ? existing : []) {
    const key = ledgerKey(item);
    if (key) merged.set(key, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const key = ledgerKey(item);
    if (key && !merged.has(key)) merged.set(key, item);
  }
  return [...merged.values()];
}

function ledgerBalance(ledger: any) {
  const items = Array.isArray(ledger) ? ledger : [];
  if (!items.length) return null;
  let total = 0;
  let counted = 0;
  for (const item of items) {
    const amount = Number(item?.amount);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    counted += 1;
  }
  return counted ? total : null;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const token = (req.headers.get("x-sync-token") || "").trim();
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const bytes = new TextEncoder().encode(token);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  ).map((b) => b.toString(16).padStart(2, "0")).join("");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("device_state")
      .select("state,updated_at")
      .eq("sync_id", hash)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: "read failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data || null), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.state !== "object" || Array.isArray(body.state)) {
      return new Response(JSON.stringify({ error: "invalid state" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const raw = JSON.stringify(body.state);
    if (raw.length > 1500000) {
      return new Response(JSON.stringify({ error: "state too large" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: current, error: readError } = await supabase
      .from("device_state")
      .select("state")
      .eq("sync_id", hash)
      .maybeSingle();

    if (readError) {
      return new Response(JSON.stringify({ error: "read failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const nextState = { ...body.state };
    const mergedLedger = mergeLedger(current?.state?.ledger, body.state.ledger);
    if (mergedLedger.length) {
      nextState.ledger = mergedLedger;
      const balance = ledgerBalance(mergedLedger);
      if (balance !== null) nextState.coins = balance;
    }

    const { error } = await supabase
      .from("device_state")
      .upsert(
        {
          sync_id: hash,
          state: nextState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sync_id" },
      );

    if (error) {
      return new Response(JSON.stringify({ error: "write failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      coins: nextState.coins ?? null,
      ledgerCount: Array.isArray(nextState.ledger) ? nextState.ledger.length : 0,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response("method not allowed", { status: 405, headers: cors });
});
