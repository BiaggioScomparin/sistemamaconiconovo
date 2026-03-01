import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  lodge_id: string;
  phone: string;
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

    // Get WhatsApp instance for this lodge
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("lodge_id", lodge_id)
      .eq("is_active", true)
      .single();

    if (instanceError || !instance) {
      console.error("No active WhatsApp instance for lodge:", lodge_id);
      // Log the failure
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

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, "");

    // Send via Z-API compatible endpoint
    const apiUrl = `${instance.base_url}/instances/${instance.instance_id}/token/${instance.token}/send-text`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      await supabase.from("notification_logs").insert({
        lodge_id,
        rule_id: rule_id || null,
        profile_id: profile_id || null,
        category: category || "manual",
        reference_id: reference_id || null,
        phone: cleanPhone,
        message,
        status: "failed",
        error_message: JSON.stringify(responseData),
      });
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabase.from("notification_logs").insert({
      lodge_id,
      rule_id: rule_id || null,
      profile_id: profile_id || null,
      category: category || "manual",
      reference_id: reference_id || null,
      phone: cleanPhone,
      message,
      status: "sent",
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
