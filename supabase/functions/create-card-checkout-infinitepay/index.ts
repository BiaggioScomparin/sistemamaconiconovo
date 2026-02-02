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

    // Get InfinitePay credentials from app_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('app_settings')
      .select('key, value')
      .in('key', ['infinitepay_client_id', 'infinitepay_client_secret'])

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = settings?.find(s => s.key === 'infinitepay_client_id')?.value
    const clientSecret = settings?.find(s => s.key === 'infinitepay_client_secret')?.value

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do InfinitePay não configuradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // First, get access token from InfinitePay
    const tokenResponse = await fetch('https://api.infinitepay.io/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'order',
      }),
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      console.error('InfinitePay token error:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Erro ao autenticar com InfinitePay', details: tokenError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create checkout order via InfinitePay API
    const orderBody = {
      amount: Math.round(amount * 100), // InfinitePay uses cents
      description: description || 'Mensalidade',
      payment_method: 'credit', // or 'credit_debit' for both options
      customer: {
        name: payer_name || 'Cliente',
        email: payer_email || undefined,
      },
      metadata: {
        payment_id: payment_id,
      },
      redirect_url: back_url ? `${back_url}?status=success&payment_id=${payment_id}` : undefined,
      webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/infinitepay-webhook`,
    }

    console.log('Creating InfinitePay checkout:', JSON.stringify(orderBody))

    const orderResponse = await fetch('https://api.infinitepay.io/v2/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('InfinitePay checkout error:', orderData)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar checkout', details: orderData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('InfinitePay checkout created:', JSON.stringify(orderData))

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: orderData.checkout_url || orderData.url,
        order_id: orderData.id,
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
