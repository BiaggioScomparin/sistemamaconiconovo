import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CardPaymentRequest {
  payment_id: string;
  amount: number;
  description: string;
  payer_email?: string;
  payer_name?: string;
  card_token: string;
  installments?: number;
  payment_method_id: string;
  issuer_id?: string;
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
      card_token,
      installments = 1,
      payment_method_id,
      issuer_id
    }: CardPaymentRequest = await req.json()

    if (!payment_id || !amount || !card_token || !payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id, amount, card_token e payment_method_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create card payment via Mercado Pago API
    const paymentBody: Record<string, unknown> = {
      transaction_amount: amount,
      description: description || 'Mensalidade',
      payment_method_id,
      token: card_token,
      installments,
      payer: {
        email: payer_email || 'membro@exemplo.com',
        first_name: payer_name || 'Membro',
      },
    }

    if (issuer_id) {
      paymentBody.issuer_id = issuer_id
    }

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${payment_id}-card-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error('Mercado Pago error:', paymentData)
      return new Response(
        JSON.stringify({ error: 'Erro ao processar pagamento com cartão', details: paymentData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check payment status
    if (paymentData.status === 'approved') {
      // Update payment record as paid
      const { error: updateError } = await supabaseClient
        .from('monthly_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card',
          pix_transaction_id: paymentData.id?.toString(),
        })
        .eq('id', payment_id)

      if (updateError) {
        console.error('Error updating payment:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'approved',
          transaction_id: paymentData.id,
          message: 'Pagamento aprovado com sucesso!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (paymentData.status === 'in_process' || paymentData.status === 'pending') {
      return new Response(
        JSON.stringify({
          success: true,
          status: paymentData.status,
          transaction_id: paymentData.id,
          message: 'Pagamento em processamento. Você será notificado quando for aprovado.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          message: 'Pagamento recusado. Verifique os dados do cartão.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
