import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function sendWhatsApp(supabaseUrl: string, anonKey: string, payload: any) {
  const url = `${supabaseUrl}/functions/v1/send-whatsapp`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const results: any[] = [];

    // Get all enabled notification rules grouped by lodge
    const { data: rules, error: rulesError } = await supabase
      .from("notification_rules")
      .select("*, lodges(name)")
      .eq("is_enabled", true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active notification rules", results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which lodges have active WhatsApp instances
    const lodgeIds = [...new Set(rules.map((r: any) => r.lodge_id))];
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("lodge_id")
      .in("lodge_id", lodgeIds)
      .eq("is_active", true);

    const activeLodgeIds = new Set((instances || []).map((i: any) => i.lodge_id));

    for (const rule of rules) {
      if (!activeLodgeIds.has(rule.lodge_id)) continue;

      try {
        if (rule.category.startsWith("payment_")) {
          await processPaymentRule(supabase, supabaseUrl, anonKey, rule, today, todayStr, results);
        } else if (rule.category.startsWith("event_")) {
          await processEventRule(supabase, supabaseUrl, anonKey, rule, today, todayStr, results);
        }
      } catch (err) {
        console.error(`Error processing rule ${rule.id}:`, err);
        results.push({ rule_id: rule.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ message: "Notifications processed", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processPaymentRule(
  supabase: any, supabaseUrl: string, anonKey: string,
  rule: any, today: Date, todayStr: string, results: any[]
) {
  // Get members from this lodge with phone numbers (phone or cell_phone)
  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cell_phone, lodge_id")
    .eq("lodge_id", rule.lodge_id)
    .eq("status", "membro")
    .eq("member_status", "active");

  // Use cell_phone as fallback when phone is empty
  const members = (rawMembers || [])
    .map((m: any) => ({ ...m, phone: m.phone || m.cell_phone }))
    .filter((m: any) => m.phone && m.phone.trim() !== "");

  if (!members || members.length === 0) return;

  const memberIds = members.map((m: any) => m.id);
  const memberMap = new Map(members.map((m: any) => [m.id, m]));

  if (rule.category === "payment_created") {
    // Find payments created today for this lodge's members
    const { data: payments } = await supabase
      .from("monthly_payments")
      .select("*")
      .in("profile_id", memberIds)
      .eq("status", "pending")
      .gte("created_at", todayStr + "T00:00:00")
      .lte("created_at", todayStr + "T23:59:59");

    if (payments) {
      for (const payment of payments) {
        const member = memberMap.get(payment.profile_id);
        if (!member?.phone) continue;

        const alreadySent = await checkAlreadySent(supabase, rule.id, payment.id, todayStr);
        if (alreadySent) continue;

        const msg = getPaymentMessage(rule, payment, member, "criada");
        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: member.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: member.id,
          category: rule.category,
          reference_id: payment.id,
        });
        results.push({ sent: true, category: rule.category, member: member.full_name });
      }
    }
  } else if (rule.category === "payment_before_due") {
    // Find pending payments that are X days before due
    const daysOffset = Math.abs(rule.days_offset || 2);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: payments } = await supabase
      .from("monthly_payments")
      .select("*")
      .in("profile_id", memberIds)
      .eq("status", "pending")
      .eq("due_date", targetDateStr);

    if (payments) {
      for (const payment of payments) {
        const member = memberMap.get(payment.profile_id);
        if (!member?.phone) continue;

        const alreadySent = await checkAlreadySent(supabase, rule.id, payment.id, todayStr);
        if (alreadySent) continue;

        const msg = getPaymentMessage(rule, payment, member, `vence em ${daysOffset} dias`);
        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: member.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: member.id,
          category: rule.category,
          reference_id: payment.id,
        });
        results.push({ sent: true, category: rule.category, member: member.full_name });
      }
    }
  } else if (rule.category === "payment_due_day") {
    // Find pending payments due today
    const { data: payments } = await supabase
      .from("monthly_payments")
      .select("*")
      .in("profile_id", memberIds)
      .eq("status", "pending")
      .eq("due_date", todayStr);

    if (payments) {
      for (const payment of payments) {
        const member = memberMap.get(payment.profile_id);
        if (!member?.phone) continue;

        const alreadySent = await checkAlreadySent(supabase, rule.id, payment.id, todayStr);
        if (alreadySent) continue;

        const msg = getPaymentMessage(rule, payment, member, "vence hoje");
        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: member.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: member.id,
          category: rule.category,
          reference_id: payment.id,
        });
        results.push({ sent: true, category: rule.category, member: member.full_name });
      }
    }
  } else if (rule.category === "payment_overdue") {
    // Find overdue pending payments
    const { data: payments } = await supabase
      .from("monthly_payments")
      .select("*")
      .in("profile_id", memberIds)
      .eq("status", "pending")
      .lt("due_date", todayStr);

    if (payments) {
      const repeatDays = rule.repeat_interval_days || 7;

      for (const payment of payments) {
        const member = memberMap.get(payment.profile_id);
        if (!member?.phone) continue;

        // Check last notification sent for this payment+rule
        const { data: lastLog } = await supabase
          .from("notification_logs")
          .select("sent_at")
          .eq("rule_id", rule.id)
          .eq("reference_id", payment.id)
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(1);

        if (lastLog && lastLog.length > 0) {
          const lastSent = new Date(lastLog[0].sent_at);
          const daysSince = Math.floor((today.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince < repeatDays) continue;
        }

        const dueDate = new Date(payment.due_date + "T12:00:00");
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const msg = getPaymentMessage(rule, payment, member, `está vencida há ${daysOverdue} dias`);

        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: member.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: member.id,
          category: rule.category,
          reference_id: payment.id,
        });
        results.push({ sent: true, category: rule.category, member: member.full_name });
      }
    }
  } else if (rule.category === "payment_paid") {
    // Find payments marked as paid today
    const { data: payments } = await supabase
      .from("monthly_payments")
      .select("*")
      .in("profile_id", memberIds)
      .eq("status", "paid")
      .gte("paid_at", todayStr + "T00:00:00")
      .lte("paid_at", todayStr + "T23:59:59");

    if (payments) {
      for (const payment of payments) {
        const member = memberMap.get(payment.profile_id);
        if (!member?.phone) continue;

        const alreadySent = await checkAlreadySent(supabase, rule.id, payment.id, todayStr);
        if (alreadySent) continue;

        const msg = getPaymentMessage(rule, payment, member, "foi confirmado");
        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: member.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: member.id,
          category: rule.category,
          reference_id: payment.id,
        });
        results.push({ sent: true, category: rule.category, member: member.full_name });
      }
    }
  }
}

async function processEventRule(
  supabase: any, supabaseUrl: string, anonKey: string,
  rule: any, today: Date, todayStr: string, results: any[]
) {
  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cell_phone, lodge_id")
    .eq("lodge_id", rule.lodge_id)
    .eq("status", "membro")
    .eq("member_status", "active");

  const members = (rawMembers || [])
    .map((m: any) => ({ ...m, phone: m.phone || m.cell_phone }))
    .filter((m: any) => m.phone && m.phone.trim() !== "");

  if (rule.category === "event_created") {
    // Events created today for this lodge
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("lodge_id", rule.lodge_id)
      .gte("created_at", todayStr + "T00:00:00")
      .lte("created_at", todayStr + "T23:59:59");

    if (events) {
      for (const event of events) {
        for (const member of members) {
          if (!member.phone) continue;
          const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr, member.id);
          if (alreadySent) continue;

          const msg = getEventMessage(rule, event, member);
          await sendWhatsApp(supabaseUrl, anonKey, {
            lodge_id: rule.lodge_id,
            phone: member.phone,
            message: msg,
            rule_id: rule.id,
            profile_id: member.id,
            category: rule.category,
            reference_id: event.id,
          });
          results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
        }
      }
    }
  } else if (rule.category === "event_before_day") {
    // Events happening tomorrow (1 day before)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 1);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("lodge_id", rule.lodge_id)
      .eq("event_date", targetDateStr);

    if (events) {
      for (const event of events) {
        for (const member of members) {
          if (!member.phone) continue;
          const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr, member.id);
          if (alreadySent) continue;

          const msg = getEventMessage(rule, event, member, "amanhã");
          await sendWhatsApp(supabaseUrl, anonKey, {
            lodge_id: rule.lodge_id,
            phone: member.phone,
            message: msg,
            rule_id: rule.id,
            profile_id: member.id,
            category: rule.category,
            reference_id: event.id,
          });
          results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
        }
      }
    }
  } else if (rule.category === "event_same_day") {
    // Events happening today
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("lodge_id", rule.lodge_id)
      .eq("event_date", todayStr);

    if (events) {
      for (const event of events) {
        for (const member of members) {
          if (!member.phone) continue;

          // Build a unique key including hours_before to allow multiple same-day notifications
          const logKey = `${event.id}_h${rule.hours_before || 0}`;
          const alreadySent = await checkAlreadySent(supabase, rule.id, logKey, todayStr, member.id);
          if (alreadySent) continue;

          const hoursLabel = rule.hours_before ? `em ${rule.hours_before} hora(s)` : "hoje";
          const msg = getEventMessage(rule, event, member, hoursLabel);
          await sendWhatsApp(supabaseUrl, anonKey, {
            lodge_id: rule.lodge_id,
            phone: member.phone,
            message: msg,
            rule_id: rule.id,
            profile_id: member.id,
            category: rule.category,
            reference_id: logKey,
          });
          results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
        }
      }
    }
  }
}

async function checkAlreadySent(
  supabase: any, ruleId: string, referenceId: string, todayStr: string, profileId?: string
): Promise<boolean> {
  let query = supabase
    .from("notification_logs")
    .select("id")
    .eq("rule_id", ruleId)
    .eq("reference_id", referenceId)
    .eq("status", "sent")
    .gte("sent_at", todayStr + "T00:00:00")
    .lte("sent_at", todayStr + "T23:59:59");

  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data } = await query.limit(1);
  return data && data.length > 0;
}

function getPaymentMessage(rule: any, payment: any, member: any, status: string): string {
  if (rule.message_template) {
    return replacePlaceholders(rule.message_template, {
      nome: member.full_name,
      mes: monthNames[payment.reference_month - 1],
      ano: String(payment.reference_year),
      valor: `R$ ${Number(payment.amount).toFixed(2).replace(".", ",")}`,
      vencimento: formatDate(payment.due_date),
      status,
    });
  }

  return `Olá ${member.full_name}! 📋\n\nSua mensalidade de ${monthNames[payment.reference_month - 1]}/${payment.reference_year} no valor de R$ ${Number(payment.amount).toFixed(2).replace(".", ",")} ${status}.\n\nVencimento: ${formatDate(payment.due_date)}`;
}

function getEventMessage(rule: any, event: any, member: any, when?: string): string {
  if (rule.message_template) {
    return replacePlaceholders(rule.message_template, {
      nome: member.full_name,
      evento: event.title,
      data: formatDate(event.event_date),
      horario: event.event_time || "A definir",
      descricao: event.description || "",
      quando: when || "em breve",
    });
  }

  const timeInfo = event.event_time ? ` às ${event.event_time}` : "";
  const whenInfo = when ? ` (${when})` : "";
  return `Olá ${member.full_name}! 📅\n\nEvento: *${event.title}*${whenInfo}\nData: ${formatDate(event.event_date)}${timeInfo}\n${event.description ? `\n${event.description}` : ""}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
