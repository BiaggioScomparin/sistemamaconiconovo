-- Add payment gateway setting and InfinitePay token
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('payment_gateway', 'mercado_pago', 'Gateway de pagamento ativo (mercado_pago ou infinitepay)'),
  ('infinitepay_client_id', NULL, 'Client ID do InfinitePay'),
  ('infinitepay_client_secret', NULL, 'Client Secret do InfinitePay')
ON CONFLICT (key) DO NOTHING;