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
    const { lodge_id, phone, group_id, message, rule_id, profile_id, category, reference_id } = body;

    if (!lodge_id || (!phone && !group_id) || !message) {
      return new Response(
        JSON.stringify({ error: "lodge_id, (phone or group_id), and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("lodge_id", lodge_id)
      .eq("is_active", true)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error("No active WhatsApp instance for lodge:", lodge_id);
      await supabase.from("notification_logs").insert({
        lodge_id,
        rule_id: rule_id || null,
        profile_id: profile_id || null,
        category: category || "manual",
        reference_id: reference_id || null,
        phone,
        message,
        status: "failed",
        error_message: "No active WhatsApp instance configured for this lodge",
      });
      return new Response(
        JSON.stringify({ error: "No active WhatsApp instance for this lodge" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGroupMessage = !!group_id;
    let cleanPhone = phone ? phone.replace(/\D/g, "") : "";
    if (!isGroupMessage && cleanPhone) {
      // Auto-prefix Brazilian country code if missing
      if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith("55")) {
        cleanPhone = `55${cleanPhone}`;
      }
    }

    const apiFormat = instance.api_format || "evolution";
    let baseUrl = (instance.base_url || "").trim().replace(/\/+$/, "");
    if (baseUrl && !baseUrl.startsWith("http")) {
      baseUrl = `http://${baseUrl}`;
    }
    // When running inside Docker bridge, map localhost/127.0.0.1 to Docker host bridge IP
    if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
      baseUrl = baseUrl.replace("127.0.0.1", "172.18.0.1").replace("localhost", "172.18.0.1");
    }

    let apiUrl: string;
    let fetchHeaders: Record<string, string>;
    let fetchBody: string;

    if (apiFormat === "evolution") {
      const target = isGroupMessage ? group_id : cleanPhone;
      apiUrl = `${baseUrl}/message/sendText/${instance.instance_id}`;
      fetchHeaders = {
        "Content-Type": "application/json",
        apikey: instance.token,
      };
      fetchBody = JSON.stringify({
        number: target,
        text: message,
        delay: 1200,
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: true,
        },
      });
    } else if (apiFormat === "z-api") {
      if (isGroupMessage) {
        apiUrl = `${baseUrl}/instances/${instance.instance_id}/token/${instance.token}/send-text`;
        fetchHeaders = { "Content-Type": "application/json" };
        fetchBody = JSON.stringify({ phone: group_id, message });
      } else {
        apiUrl = `${baseUrl}/instances/${instance.instance_id}/token/${instance.token}/send-text`;
        fetchHeaders = { "Content-Type": "application/json" };
        fetchBody = JSON.stringify({ phone: cleanPhone, message });
      }
    } else if (apiFormat === "wattend") {
      apiUrl = `${baseUrl}/v2/api/external/${instance.instance_id}`;
      fetchHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
      };
      if (isGroupMessage) {
        fetchBody = JSON.stringify({
          body: message,
          number: group_id,
          externalKey: instance.token,
          isClosed: false,
          isGroup: true,
        });
      } else {
        fetchBody = JSON.stringify({
          body: message,
          number: cleanPhone,
          externalKey: instance.token,
          isClosed: false,
        });
      }
    } else {
      // Z-Pro / CloudZAPI format fallback
      apiUrl = `${baseUrl}/message/sendText`;
      fetchHeaders = { "Content-Type": "application/json", apikey: instance.token };
      if (isGroupMessage) {
        fetchBody = JSON.stringify({
          groupId: group_id,
          options: { delay: 1200, presence: "composing" },
          textMessage: { text: message },
        });
      } else {
        fetchBody = JSON.stringify({
          numbers: [cleanPhone],
          options: { delay: 1200, presence: "composing" },
          textMessage: { text: message },
        });
      }
    }

    console.log(
      `Sending WhatsApp (${apiFormat}) to URL: ${apiUrl} | target: ${isGroupMessage ? "group:" + group_id : "phone:" + cleanPhone}`
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: fetchBody,
    });

    const responseText = await response.text();
    console.log("WhatsApp API response status:", response.status, "body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      await supabase.from("notification_logs").insert({
        lodge_id,
        rule_id: rule_id || null,
        profile_id: profile_id || null,
        category: category || "manual",
        reference_id: reference_id || null,
        phone: isGroupMessage ? `grupo:${group_id}` : cleanPhone,
        message,
        status: "failed",
        error_message: JSON.stringify(responseData),
      });
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("notification_logs").insert({
      lodge_id,
      rule_id: rule_id || null,
      profile_id: profile_id || null,
      category: category || "manual",
      reference_id: reference_id || null,
      phone: isGroupMessage ? `grupo:${group_id}` : cleanPhone,
      message,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
