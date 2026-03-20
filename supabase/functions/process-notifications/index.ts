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

async function sendToGroupOrIndividual(
  supabaseUrl: string, anonKey: string,
  rule: any, member: any, msg: string, referenceId: string
) {
  if (rule.whatsapp_group_id) {
    // Send to group - but we only send once per reference, not per member
    return;
  }
  await sendWhatsApp(supabaseUrl, anonKey, {
    lodge_id: rule.lodge_id,
    phone: member.phone,
    message: msg,
    rule_id: rule.id,
    profile_id: member.id,
    category: rule.category,
    reference_id: referenceId,
  });
}

async function sendGroupMessage(
  supabaseUrl: string, anonKey: string,
  rule: any, msg: string, referenceId: string
) {
  await sendWhatsApp(supabaseUrl, anonKey, {
    lodge_id: rule.lodge_id,
    group_id: rule.whatsapp_group_id,
    message: msg,
    rule_id: rule.id,
    category: rule.category,
    reference_id: referenceId,
  });
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

    // Use Brazil timezone to avoid UTC offset issues
    const nowBrazil = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const today = nowBrazil;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
        } else if (rule.category === "birthday" || rule.category === "initiation_anniversary") {
          await processAnniversaryRule(supabase, supabaseUrl, anonKey, rule, today, todayStr, results);
        } else if (rule.category === "children_birthday") {
          await processChildrenBirthdayRule(supabase, supabaseUrl, anonKey, rule, today, todayStr, results);
        } else if (rule.category === "spouse_birthday") {
          await processSpouseBirthdayRule(supabase, supabaseUrl, anonKey, rule, today, todayStr, results);
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
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("lodge_id", rule.lodge_id)
      .gte("created_at", todayStr + "T00:00:00")
      .lte("created_at", todayStr + "T23:59:59");

    if (events) {
      for (const event of events) {
        if (rule.whatsapp_group_id) {
          const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr);
          if (alreadySent) continue;
          const msg = getEventMessage(rule, event, { full_name: "" });
          await sendGroupMessage(supabaseUrl, anonKey, rule, msg, event.id);
          results.push({ sent: true, category: rule.category, target: "group", event: event.title });
        } else {
          for (const member of members) {
            if (!member.phone) continue;
            const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr, member.id);
            if (alreadySent) continue;
            const msg = getEventMessage(rule, event, member);
            await sendWhatsApp(supabaseUrl, anonKey, {
              lodge_id: rule.lodge_id, phone: member.phone, message: msg,
              rule_id: rule.id, profile_id: member.id, category: rule.category, reference_id: event.id,
            });
            results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
          }
        }
      }
    }
  } else if (rule.category === "event_before_day") {
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
        if (rule.whatsapp_group_id) {
          const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr);
          if (alreadySent) continue;
          const msg = getEventMessage(rule, event, { full_name: "" }, "amanhã");
          await sendGroupMessage(supabaseUrl, anonKey, rule, msg, event.id);
          results.push({ sent: true, category: rule.category, target: "group", event: event.title });
        } else {
          for (const member of members) {
            if (!member.phone) continue;
            const alreadySent = await checkAlreadySent(supabase, rule.id, event.id, todayStr, member.id);
            if (alreadySent) continue;
            const msg = getEventMessage(rule, event, member, "amanhã");
            await sendWhatsApp(supabaseUrl, anonKey, {
              lodge_id: rule.lodge_id, phone: member.phone, message: msg,
              rule_id: rule.id, profile_id: member.id, category: rule.category, reference_id: event.id,
            });
            results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
          }
        }
      }
    }
  } else if (rule.category === "event_same_day") {
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("lodge_id", rule.lodge_id)
      .eq("event_date", todayStr);

    if (events) {
      for (const event of events) {
        const logKey = `${event.id}_h${rule.hours_before || 0}`;
        const hoursLabel = rule.hours_before ? `em ${rule.hours_before} hora(s)` : "hoje";

        if (rule.whatsapp_group_id) {
          const alreadySent = await checkAlreadySent(supabase, rule.id, logKey, todayStr);
          if (alreadySent) continue;
          const msg = getEventMessage(rule, event, { full_name: "" }, hoursLabel);
          await sendGroupMessage(supabaseUrl, anonKey, rule, msg, logKey);
          results.push({ sent: true, category: rule.category, target: "group", event: event.title });
        } else {
          for (const member of members) {
            if (!member.phone) continue;
            const alreadySent = await checkAlreadySent(supabase, rule.id, logKey, todayStr, member.id);
            if (alreadySent) continue;
            const msg = getEventMessage(rule, event, member, hoursLabel);
            await sendWhatsApp(supabaseUrl, anonKey, {
              lodge_id: rule.lodge_id, phone: member.phone, message: msg,
              rule_id: rule.id, profile_id: member.id, category: rule.category, reference_id: logKey,
            });
            results.push({ sent: true, category: rule.category, member: member.full_name, event: event.title });
          }
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

async function processAnniversaryRule(
  supabase: any, supabaseUrl: string, anonKey: string,
  rule: any, today: Date, todayStr: string, results: any[]
) {
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDay = today.getDate();

  // Get all active members of this lodge
  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cell_phone, lodge_id, birth_date, initiation_date")
    .eq("lodge_id", rule.lodge_id)
    .eq("status", "membro")
    .eq("member_status", "active");

  const members = (rawMembers || [])
    .map((m: any) => ({ ...m, phone: m.phone || m.cell_phone }));

  const membersWithPhone = members.filter((m: any) => m.phone && m.phone.trim() !== "");

  if (!members || members.length === 0) return;

  // Determine which field to check
  const dateField = rule.category === "birthday" ? "birth_date" : "initiation_date";

  // Find members whose anniversary is today
  const birthdayMembers = members.filter((m: any) => {
    if (!m[dateField]) return false;
    const [y, mo, d] = m[dateField].split("-").map(Number);
    return mo === todayMonth && d === todayDay;
  });

  if (birthdayMembers.length === 0) return;

  // For each birthday member, notify all other members with phone (or send to group)
  for (const bdMember of birthdayMembers) {
    const bdDate = new Date(bdMember[dateField] + "T12:00:00");
    const years = today.getFullYear() - bdDate.getFullYear();
    const label = rule.category === "birthday" ? "aniversário natalício" : "aniversário de ordem";
    const refId = `${rule.category}_${bdMember.id}`;

    if (rule.whatsapp_group_id) {
      // Send one message to the group
      const alreadySent = await checkAlreadySent(supabase, rule.id, refId, todayStr);
      if (alreadySent) continue;

      let msg: string;
      if (rule.message_template) {
        msg = replacePlaceholders(rule.message_template, {
          nome: "",
          aniversariante: bdMember.full_name,
          anos: String(years),
          data: formatDate(todayStr),
        });
      } else {
        if (rule.category === "birthday") {
          msg = `🎂 Hoje é o aniversário natalício do Ir∴ *${bdMember.full_name}*, completando ${years} anos!\n\nNão esqueçam de parabenizá-lo! 🎉`;
        } else {
          msg = `⭐ Hoje é o aniversário de ordem do Ir∴ *${bdMember.full_name}*, completando ${years} anos de iniciação maçônica!\n\nFraternais saudações! 🏛️`;
        }
      }

      await sendGroupMessage(supabaseUrl, anonKey, rule, msg, refId);
      results.push({ sent: true, category: rule.category, target: "group", celebrant: bdMember.full_name });
    } else {
      // Send individual messages
      for (const recipient of membersWithPhone) {
        const alreadySent = await checkAlreadySent(supabase, rule.id, refId, todayStr, recipient.id);
        if (alreadySent) continue;

        let msg: string;
        if (rule.message_template) {
          msg = replacePlaceholders(rule.message_template, {
            nome: recipient.full_name,
            aniversariante: bdMember.full_name,
            anos: String(years),
            data: formatDate(todayStr),
          });
        } else {
          if (rule.category === "birthday") {
            msg = `Olá ${recipient.full_name}! 🎂\n\nHoje é o aniversário natalício do Ir∴ *${bdMember.full_name}*, completando ${years} anos!\n\nNão esqueça de parabenizá-lo! 🎉`;
          } else {
            msg = `Olá ${recipient.full_name}! ⭐\n\nHoje é o aniversário de ordem do Ir∴ *${bdMember.full_name}*, completando ${years} anos de iniciação maçônica!\n\nFraternais saudações! 🏛️`;
          }
        }

        await sendWhatsApp(supabaseUrl, anonKey, {
          lodge_id: rule.lodge_id,
          phone: recipient.phone,
          message: msg,
          rule_id: rule.id,
          profile_id: recipient.id,
          category: rule.category,
          reference_id: refId,
        });
        results.push({ sent: true, category: rule.category, member: recipient.full_name, celebrant: bdMember.full_name });
      }
    }
  }
}

async function processChildrenBirthdayRule(
  supabase: any, supabaseUrl: string, anonKey: string,
  rule: any, today: Date, todayStr: string, results: any[]
) {
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // Get all children with their parent profiles
  const { data: children } = await supabase
    .from("children")
    .select("id, name, birth_date, profile_id");

  if (!children || children.length === 0) return;

  // Filter children whose birthday is today
  const birthdayChildren = children.filter((c: any) => {
    if (!c.birth_date) return false;
    const [, mo, d] = c.birth_date.split("-").map(Number);
    return mo === todayMonth && d === todayDay;
  });

  if (birthdayChildren.length === 0) return;

  // Get parent profile ids
  const parentIds = [...new Set(birthdayChildren.map((c: any) => c.profile_id))];

  const { data: rawParents } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cell_phone, lodge_id")
    .in("id", parentIds)
    .eq("lodge_id", rule.lodge_id)
    .eq("status", "membro")
    .eq("member_status", "active");

  const parents = (rawParents || [])
    .map((m: any) => ({ ...m, phone: m.phone || m.cell_phone }))
    .filter((m: any) => m.phone && m.phone.trim() !== "");

  if (parents.length === 0) return;

  const parentMap = new Map(parents.map((p: any) => [p.id, p]));

  for (const child of birthdayChildren) {
    const parent = parentMap.get(child.profile_id);
    if (!parent) continue;

    const refId = `children_birthday_${child.id}`;
    const alreadySent = await checkAlreadySent(supabase, rule.id, refId, todayStr, parent.id);
    if (alreadySent) continue;

    const bdDate = new Date(child.birth_date + "T12:00:00");
    const years = today.getFullYear() - bdDate.getFullYear();

    let msg: string;
    if (rule.message_template) {
      msg = replacePlaceholders(rule.message_template, {
        nome: parent.full_name,
        filho: child.name,
        anos: String(years),
        data: formatDate(todayStr),
      });
    } else {
      msg = `Olá Ir∴ ${parent.full_name}! 🎂\n\nHoje é o aniversário do(a) *${child.name}*, completando ${years} anos!\n\nParabéns à família! 🎉`;
    }

    await sendWhatsApp(supabaseUrl, anonKey, {
      lodge_id: rule.lodge_id,
      phone: parent.phone,
      message: msg,
      rule_id: rule.id,
      profile_id: parent.id,
      category: rule.category,
      reference_id: refId,
    });
    results.push({ sent: true, category: rule.category, member: parent.full_name, child: child.name });
  }
}

async function processSpouseBirthdayRule(
  supabase: any, supabaseUrl: string, anonKey: string,
  rule: any, today: Date, todayStr: string, results: any[]
) {
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // Get members with spouse_name and marriage_date (we use marriage_date month/day as spouse birthday proxy)
  // Actually, there's no spouse_birth_date field. We need to check if it exists or use marriage_date.
  // Since there's no dedicated spouse_birth_date, let's check profiles for a pattern.
  // Looking at the schema, there's no spouse_birth_date column. We'll need to add one or use marriage_date.
  // For now, let's use marriage_date as the anniversary date (aniversário de casamento / esposa).
  // Actually the user asked for "Aniversário de Esposa" - we should notify on spouse birthday.
  // Since there's no spouse_birth_date in the schema, let's use marriage_date as the date to celebrate.

  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cell_phone, spouse_name, spouse_birth_date, lodge_id")
    .eq("lodge_id", rule.lodge_id)
    .eq("status", "membro")
    .eq("member_status", "active")
    .not("spouse_name", "is", null)
    .not("spouse_birth_date", "is", null);

  const members = (rawMembers || [])
    .map((m: any) => ({ ...m, phone: m.phone || m.cell_phone }))
    .filter((m: any) => m.phone && m.phone.trim() !== "" && m.spouse_name && m.spouse_name.trim() !== "");

  if (!members || members.length === 0) return;

  const matchingMembers = members.filter((m: any) => {
    if (!m.spouse_birth_date) return false;
    const [, mo, d] = m.spouse_birth_date.split("-").map(Number);
    return mo === todayMonth && d === todayDay;
  });

  if (matchingMembers.length === 0) return;

  for (const member of matchingMembers) {
    const refId = `spouse_birthday_${member.id}`;
    const alreadySent = await checkAlreadySent(supabase, rule.id, refId, todayStr, member.id);
    if (alreadySent) continue;

    const spouseBd = new Date(member.spouse_birth_date + "T12:00:00");
    const years = today.getFullYear() - spouseBd.getFullYear();

    let msg: string;
    if (rule.message_template) {
      msg = replacePlaceholders(rule.message_template, {
        nome: member.full_name,
        filho: member.spouse_name,
        esposa: member.spouse_name,
        anos: String(years),
        data: formatDate(todayStr),
      });
    } else {
      msg = `Olá Ir∴ ${member.full_name}! 🎂\n\nHoje é o aniversário da sua esposa *${member.spouse_name}*, completando ${years} anos!\n\nFelicidades! 🎉`;
    }

    await sendWhatsApp(supabaseUrl, anonKey, {
      lodge_id: rule.lodge_id,
      phone: member.phone,
      message: msg,
      rule_id: rule.id,
      profile_id: member.id,
      category: rule.category,
      reference_id: refId,
    });
    results.push({ sent: true, category: rule.category, member: member.full_name, spouse: member.spouse_name });
  }
}
