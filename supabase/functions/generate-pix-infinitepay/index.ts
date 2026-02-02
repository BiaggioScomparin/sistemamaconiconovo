import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PixRequest {
  payment_id: string;
  amount: number;
  description: string;
  payer_email?: string;
  payer_name?: string;
  payer_cpf?: string;
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

    const { payment_id, amount, description, payer_email, payer_name, payer_cpf }: PixRequest = await req.json()

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

    // Create PIX order via InfinitePay API
    const orderBody = {
      amount: Math.round(amount * 100), // InfinitePay uses cents
      description: description || 'Mensalidade',
      payment_method: 'pix',
      customer: {
        name: payer_name || 'Cliente',
        email: payer_email || undefined,
        tax_id: payer_cpf || undefined,
      },
      metadata: {
        payment_id: payment_id,
      },
    }

    console.log('Creating InfinitePay order:', JSON.stringify(orderBody))

    const orderResponse = await fetch('https://api.infinitepay.io/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('InfinitePay order error:', orderData)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido PIX', details: orderData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('InfinitePay order created:', JSON.stringify(orderData))

    // Extract PIX data
    const qrCode = orderData.pix?.qr_code || orderData.qr_code
    const qrCodeBase64 = orderData.pix?.qr_code_base64 || orderData.qr_code_base64
    const transactionId = orderData.id?.toString()

    // Update payment record with PIX data
    const { error: updateError } = await supabaseClient
      .from('monthly_payments')
      .update({
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        pix_transaction_id: transactionId,
      })
      .eq('id', payment_id)

    if (updateError) {
      console.error('Error updating payment:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        transaction_id: transactionId,
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
