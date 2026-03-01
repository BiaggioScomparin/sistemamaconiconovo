
-- WhatsApp connection settings per lodge
CREATE TABLE public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  instance_id text NOT NULL,
  token text NOT NULL,
  base_url text NOT NULL DEFAULT 'https://api.z-api.io',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lodge_id)
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view whatsapp instances"
  ON public.whatsapp_instances FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification rules configuration
CREATE TABLE public.notification_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'payment_created', 'payment_before_due', 'payment_due_day', 'payment_overdue', 'payment_paid', 'event_created', 'event_before_day', 'event_same_day'
  is_enabled boolean NOT NULL DEFAULT true,
  days_offset integer DEFAULT 0, -- negative = before, positive = after, 0 = same day
  hours_before integer DEFAULT NULL, -- for event same-day notifications (hours before event)
  repeat_interval_days integer DEFAULT NULL, -- for overdue: repeat every N days
  message_template text, -- custom message template with placeholders
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification rules"
  ON public.notification_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view notification rules"
  ON public.notification_rules FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Log of sent notifications (to avoid duplicates and track history)
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.notification_rules(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category text NOT NULL,
  reference_id text, -- payment_id or event_id
  phone text,
  message text,
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view notification logs"
  ON public.notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
