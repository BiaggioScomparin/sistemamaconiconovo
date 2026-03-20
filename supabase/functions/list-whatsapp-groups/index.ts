import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(
        JSON.stringify({ error: "lodge_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    let apiUrl: string;
    let fetchHeaders: Record<string, string>;

    if (apiFormat === "z-api") {
      apiUrl = `${baseUrl}/instances/${instance.instance_id}/token/${instance.token}/chats`;
      fetchHeaders = { "Content-Type": "application/json" };
    } else if (apiFormat === "wattend") {
      // Try multiple Wattend endpoints
      const wattendEndpoints = [
        `${baseUrl}/v2/api/external/${instance.instance_id}/chats`,
        `${baseUrl}/v2/api/external/${instance.instance_id}/groups`,
        `${baseUrl}/v2/api/external/groups/${instance.instance_id}`,
      ];
      fetchHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.token}`,
      };

      let wattendResponse: Response | null = null;
      let wattendUrl = "";
      for (const url of wattendEndpoints) {
        console.log(`Trying Wattend endpoint: ${url}`);
        const res = await fetch(url, { method: "GET", headers: fetchHeaders });
        console.log(`Wattend ${url} -> status ${res.status}`);
        if (res.ok) {
          wattendResponse = res;
          wattendUrl = url;
          break;
        }
        await res.text(); // consume body
      }

      if (!wattendResponse) {
        return new Response(
          JSON.stringify({ 
            error: "A API Wattend não suporta listagem de grupos automaticamente. Por favor, insira o ID do grupo manualmente (formato: XXXXXXXXXX@g.us). Você pode obter o ID do grupo nas configurações do grupo no WhatsApp.",
            unsupported: true 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const wattendText = await wattendResponse.text();
      let wattendData;
      try { wattendData = JSON.parse(wattendText); } catch { wattendData = []; }

      const wattendItems = Array.isArray(wattendData) ? wattendData : (wattendData?.groups || wattendData?.data || wattendData?.chats || []);
      groups = wattendItems
        .filter((c: any) => c.isGroup || (c.id && typeof c.id === 'string' && c.id.endsWith("@g.us")) || c.groupId)
        .map((g: any) => ({
          id: g.id || g.groupId || g.jid,
          name: g.name || g.subject || g.id,
        }));

      return new Response(
        JSON.stringify({ groups }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Z-Pro / CloudZAPI
      apiUrl = `${baseUrl}/group/fetchAllGroups`;
      fetchHeaders = { "Content-Type": "application/json", "apikey": instance.token };
    }

    console.log(`Fetching groups (${apiFormat}) from:`, apiUrl);

    const response = await fetch(apiUrl, {
      method: apiFormat === "z-pro" ? "POST" : "GET",
      headers: fetchHeaders,
      ...(apiFormat === "z-pro" ? { body: JSON.stringify({ getParticipants: false }) } : {}),
    });

    const responseText = await response.text();
    console.log("Groups API response status:", response.status);

    let rawData;
    try { rawData = JSON.parse(responseText); } catch { rawData = []; }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao buscar grupos", details: rawData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize response to a common format: { id, name }
    let groups: { id: string; name: string }[] = [];

    if (apiFormat === "z-api") {
      // z-api /chats returns all chats; filter groups (isGroup or id ending with @g.us)
      const items = Array.isArray(rawData) ? rawData : [];
      groups = items
        .filter((c: any) => c.isGroup || (c.id && c.id.endsWith("@g.us")))
        .map((c: any) => ({ id: c.id || c.phone, name: c.name || c.id }));
    } else if (apiFormat === "wattend") {
      const items = Array.isArray(rawData) ? rawData : (rawData?.groups || rawData?.data || []);
      groups = items.map((g: any) => ({
        id: g.id || g.groupId || g.jid,
        name: g.name || g.subject || g.id,
      }));
    } else {
      // Z-Pro
      const items = Array.isArray(rawData) ? rawData : (rawData?.groups || rawData?.data || []);
      groups = items.map((g: any) => ({
        id: g.id || g.groupJid || g.jid,
        name: g.subject || g.name || g.id,
      }));
    }

    return new Response(
      JSON.stringify({ groups }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error listing groups:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
