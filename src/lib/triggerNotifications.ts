import { supabase } from "@/integrations/supabase/client";

/**
 * Triggers the process-notifications edge function to send
 * any pending notifications (payment_created, event_created, etc.)
 * This is called after creating payments or events so notifications
 * are sent immediately without waiting for cron.
 */
export async function triggerNotifications() {
  try {
    const { data, error } = await supabase.functions.invoke("process-notifications", {
      method: "POST",
    });
    if (error) {
      console.error("Error triggering notifications:", error);
    } else {
      console.log("Notifications triggered:", data);
    }
  } catch (err) {
    console.error("Failed to trigger notifications:", err);
  }
}
