import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendWhatsAppRequest {
  lodge_id: string;
  phone?: string;
  group_id?: string;
  message: string;
  rule_id?: string;
  profile_id?: string;
  category?: string;
  reference_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: SendWhatsAppRequest = await req.json();
    const { lodge_id, phone, message, rule_id, profile_id, category, reference_id } = body;

    if (!lodge_id || !phone || !message) {
      return new Response(
        JSON.stringify({ error: "lodge_id, phone, and message are required" }),
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
      console.error("No active WhatsApp instance for lodge:", lodge_id);
      await supabase.from("notification_logs").insert({
        lodge_id, rule_id: rule_id || null, profile_id: profile_id || null,
        category: category || "manual", reference_id: reference_id || null,
        phone, message, status: "failed",
        error_message: "No active WhatsApp instance configured for this lodge",
      });
      return new Response(
        JSON.stringify({ error: "No active WhatsApp instance for this lodge" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const apiFormat = instance.api_format || "z-pro";
    let baseUrl = (instance.base_url || "").trim().replace(/\/+$/, "");
    // Ensure base_url has protocol
    if (baseUrl && !baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    let apiUrl: string;
    let fetchHeaders: Record<string, string>;
    let fetchBody: string;

    if (apiFormat === "z-api") {
      // Z-API format: POST {base_url}/instances/{instance_id}/token/{token}/send-text
      apiUrl = `${baseUrl}/instances/${instance.instance_id}/token/${instance.token}/send-text`;
      fetchHeaders = { "Content-Type": "application/json" };
      fetchBody = JSON.stringify({ phone: cleanPhone, message });
    } else if (apiFormat === "wattend") {
      // Wattend format: POST {base_url}/v2/api/external/{instance_id}
      apiUrl = `${baseUrl}/v2/api/external/${instance.instance_id}`;
      fetchHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.token}`,
      };
      fetchBody = JSON.stringify({
        body: message,
        number: cleanPhone,
        externalKey: instance.token,
        isClosed: false,
      });
    } else {
      // Z-Pro / CloudZAPI format
      apiUrl = `${baseUrl}/message/sendText`;
      fetchHeaders = { "Content-Type": "application/json", "apikey": instance.token };
      fetchBody = JSON.stringify({
        numbers: [cleanPhone],
        options: { delay: 1200, presence: "composing" },
        textMessage: { text: message },
      });
    }

    console.log(`Sending WhatsApp (${apiFormat}) to URL:`, apiUrl, "phone:", cleanPhone);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: fetchBody,
    });

    const responseText = await response.text();
    console.log("WhatsApp API response status:", response.status, "body:", responseText);

    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      await supabase.from("notification_logs").insert({
        lodge_id, rule_id: rule_id || null, profile_id: profile_id || null,
        category: category || "manual", reference_id: reference_id || null,
        phone: cleanPhone, message, status: "failed",
        error_message: JSON.stringify(responseData),
      });
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("notification_logs").insert({
      lodge_id, rule_id: rule_id || null, profile_id: profile_id || null,
      category: category || "manual", reference_id: reference_id || null,
      phone: cleanPhone, message, status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
