import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GroupItem = { id: string; name: string };

function normalizeZApiGroups(rawData: any): GroupItem[] {
  const items = Array.isArray(rawData) ? rawData : rawData?.groups || rawData?.data || [];
  return items
    .filter((c: any) => c?.isGroup !== false && (c?.id?.endsWith?.("@g.us") || c?.phone?.endsWith?.("@g.us")))
    .map((c: any) => ({ id: c.id || c.phone, name: c.name || c.subject || c.id || c.phone }));
}

function normalizeEvolutionGroups(rawData: any): GroupItem[] {
  const items = Array.isArray(rawData) ? rawData : rawData?.groups || rawData?.data || rawData?.result || [];
  return items
    .filter((g: any) => !!(g?.id || g?.groupJid || g?.jid))
    .map((g: any) => ({
      id: g.id || g.groupJid || g.jid,
      name: g.subject || g.name || g.id || g.groupJid || g.jid,
    }));
}

async function parseBody(response: Response) {
  const text = await response.text();
  try {
    return { text, data: JSON.parse(text) };
  } catch {
    return { text, data: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { lodge_id } = await req.json();

    if (!lodge_id) {
      return new Response(JSON.stringify({ error: "lodge_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("lodge_id", lodge_id)
      .eq("is_active", true)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Nenhuma instância WhatsApp ativa para esta loja" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiFormat = instance.api_format || "z-pro";
    let baseUrl = (instance.base_url || "").trim().replace(/\/+$/, "");
    if (baseUrl && !baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    if (apiFormat === "z-api") {
      const apiUrl = `${baseUrl}/instances/${instance.instance_id}/token/${instance.token}/groups`;
      console.log("Fetching groups (z-api) from:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const { text, data } = await parseBody(response);
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao buscar grupos", details: data || text }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ groups: normalizeZApiGroups(data) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apiFormat === "wattend") {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
      };

      const attempts: Array<{ url: string; method: "GET" | "POST"; body?: any }> = [
        { url: `${baseUrl}/v2/api/external/${instance.instance_id}/group/fetchAllGroups`, method: "GET" },
        {
          url: `${baseUrl}/v2/api/external/${instance.instance_id}/group/fetchAllGroups`,
          method: "POST",
          body: { getParticipants: false },
        },
        { url: `${baseUrl}/v2/api/external/${instance.instance_id}/groups`, method: "GET" },
        { url: `${baseUrl}/v2/api/external/${instance.instance_id}/chats`, method: "GET" },
      ];

      const attemptErrors: Array<{ url: string; method: string; status: number; body: string }> = [];

      for (const attempt of attempts) {
        console.log(`Trying Wattend endpoint: ${attempt.method} ${attempt.url}`);
        const response = await fetch(attempt.url, {
          method: attempt.method,
          headers,
          ...(attempt.body ? { body: JSON.stringify(attempt.body) } : {}),
        });

        const { text, data } = await parseBody(response);

        if (response.ok) {
          const groups = normalizeEvolutionGroups(data);
          console.log(`Wattend success: ${attempt.method} ${attempt.url} -> ${groups.length} groups`);
          return new Response(JSON.stringify({ groups }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        attemptErrors.push({
          url: attempt.url,
          method: attempt.method,
          status: response.status,
          body: text.slice(0, 250),
        });
      }

      return new Response(
        JSON.stringify({
          unsupported: true,
          error:
            "Não foi possível listar os grupos automaticamente na API Wattend com os endpoints disponíveis. Insira o ID manualmente (formato: 1203...@g.us).",
          details: attemptErrors,
          groups: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Z-Pro / Evolution API
    const zProAttempts: Array<{ url: string; method: "GET" | "POST"; body?: any }> = [
      {
        url: `${baseUrl}/group/fetchAllGroups/${instance.instance_id}?getParticipants=false`,
        method: "GET",
      },
      {
        url: `${baseUrl}/group/fetchAllGroups`,
        method: "POST",
        body: { getParticipants: false },
      },
    ];

    for (const attempt of zProAttempts) {
      console.log(`Trying Z-Pro endpoint: ${attempt.method} ${attempt.url}`);
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers: { "Content-Type": "application/json", apikey: instance.token },
        ...(attempt.body ? { body: JSON.stringify(attempt.body) } : {}),
      });

      const { text, data } = await parseBody(response);

      if (response.ok) {
        return new Response(JSON.stringify({ groups: normalizeEvolutionGroups(data) }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Z-Pro endpoint failed: ${response.status} ${text.slice(0, 200)}`);
    }

    return new Response(
      JSON.stringify({ error: "Falha ao buscar grupos", details: "Nenhum endpoint suportado respondeu com sucesso." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error listing groups:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});