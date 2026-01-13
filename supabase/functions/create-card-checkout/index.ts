import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  payment_id: string;
  amount: number;
  description: string;
  payer_email?: string;
  payer_name?: string;
  back_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Mercado Pago token from app_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'mercado_pago_access_token')
      .single()

    if (settingsError || !settings?.value) {
      return new Response(
        JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mercadoPagoToken = settings.value

    const { 
      payment_id, 
      amount, 
      description, 
      payer_email, 
      payer_name,
      back_url
    }: CheckoutRequest = await req.json()

    if (!payment_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'payment_id e amount são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create preference for Checkout Pro
    const preferenceBody = {
      items: [
        {
          id: payment_id,
          title: description || 'Mensalidade',
          quantity: 1,
          unit_price: amount,
          currency_id: 'BRL',
        }
      ],
      payer: {
        email: payer_email || undefined,
        name: payer_name || undefined,
      },
      back_urls: {
        success: back_url ? `${back_url}?status=success&payment_id=${payment_id}` : undefined,
        failure: back_url ? `${back_url}?status=failure&payment_id=${payment_id}` : undefined,
        pending: back_url ? `${back_url}?status=pending&payment_id=${payment_id}` : undefined,
      },
      auto_return: 'approved',
      external_reference: payment_id,
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' }, // Exclude boleto
        ],
        installments: 12, // Max installments
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
    }

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    })

    const preferenceData = await preferenceResponse.json()

    if (!preferenceResponse.ok) {
      console.error('Mercado Pago error:', preferenceData)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar checkout', details: preferenceData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Preference created:', preferenceData.id)

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: preferenceData.init_point,
        sandbox_checkout_url: preferenceData.sandbox_init_point,
        preference_id: preferenceData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
