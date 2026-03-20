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
      apiUrl = `${baseUrl}/v2/api/external/${instance.instance_id}/group/fetchAllGroups`;
      fetchHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.token}`,
      };
    } else {
      // Z-Pro / CloudZAPI
      apiUrl = `${baseUrl}/group/fetchAllGroups`;
      fetchHeaders = { "Content-Type": "application/json", "apikey": instance.token };
    }

    console.log(`Fetching groups (${apiFormat}) from:`, apiUrl);

    const response = await fetch(apiUrl, {
      method: apiFormat === "z-pro" || apiFormat === "wattend" ? "POST" : "GET",
      headers: fetchHeaders,
      ...((apiFormat === "z-pro" || apiFormat === "wattend") ? { body: JSON.stringify({ getParticipants: false }) } : {}),
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
