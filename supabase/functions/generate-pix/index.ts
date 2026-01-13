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

    const { payment_id, amount, description, payer_email, payer_name }: PixRequest = await req.json()

    if (!payment_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'payment_id e amount são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create PIX payment via Mercado Pago API
    const pixResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': payment_id,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description || 'Mensalidade',
        payment_method_id: 'pix',
        payer: {
          email: payer_email || 'membro@exemplo.com',
          first_name: payer_name || 'Membro',
        },
      }),
    })

    const pixData = await pixResponse.json()

    if (!pixResponse.ok) {
      console.error('Mercado Pago error:', pixData)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pagamento PIX', details: pixData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract QR code data
    const qrCode = pixData.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = pixData.point_of_interaction?.transaction_data?.qr_code_base64
    const transactionId = pixData.id?.toString()

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
