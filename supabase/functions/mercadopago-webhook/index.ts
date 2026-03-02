import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get Mercado Pago token from app_settings for validation
    const { data: settings } = await supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'mercado_pago_access_token')
      .single()

    const mercadoPagoToken = settings?.value

    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body))

    // Mercado Pago sends different types of notifications
    if (body.type === 'payment' || body.action === 'payment.updated' || body.action === 'payment.created') {
      const paymentId = body.data?.id

      if (!paymentId) {
        console.log('No payment ID found in webhook')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (mercadoPagoToken) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
          },
        })

        if (mpResponse.ok) {
          const paymentData = await mpResponse.json()
          console.log('Payment data from MP:', JSON.stringify({
            id: paymentData.id,
            status: paymentData.status,
            external_reference: paymentData.external_reference,
            payment_method_id: paymentData.payment_method_id,
            transaction_amount: paymentData.transaction_amount,
          }))

          if (paymentData.status === 'approved') {
            const transactionId = paymentData.id?.toString()
            const externalReference = paymentData.external_reference
            const paymentMethodId = paymentData.payment_method_id
            const isCard = paymentMethodId && !['pix'].includes(paymentMethodId)

            let found = false

            // Strategy 1: Find by pix_transaction_id
            const { data: byTransactionId, error: err1 } = await supabaseClient
              .from('monthly_payments')
              .select('id, status')
              .eq('pix_transaction_id', transactionId)
              .maybeSingle()

            if (byTransactionId && !err1 && byTransactionId.status !== 'paid') {
              const { error: updateError } = await supabaseClient
                .from('monthly_payments')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  payment_method: isCard ? 'card' : 'pix',
                })
                .eq('id', byTransactionId.id)

              if (updateError) {
                console.error('Error updating payment by transaction_id:', updateError)
              } else {
                console.log('Payment confirmed by transaction_id:', byTransactionId.id)
                found = true
              }
            }

            // Strategy 2: Find by external_reference (payment_id sent during checkout)
            if (!found && externalReference) {
              const { data: byExtRef, error: err2 } = await supabaseClient
                .from('monthly_payments')
                .select('id, status')
                .eq('id', externalReference)
                .maybeSingle()

              if (byExtRef && !err2 && byExtRef.status !== 'paid') {
                const { error: updateError } = await supabaseClient
                  .from('monthly_payments')
                  .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    payment_method: isCard ? 'card' : 'pix',
                    pix_transaction_id: transactionId,
                  })
                  .eq('id', byExtRef.id)

                if (updateError) {
                  console.error('Error updating payment by external_reference:', updateError)
                } else {
                  console.log('Payment confirmed by external_reference:', byExtRef.id)
                  found = true
                }
              }
            }

            if (!found) {
              console.log('Payment not found. transaction_id:', transactionId, 'external_reference:', externalReference)
            }
          }
        } else {
          const errText = await mpResponse.text()
          console.error('Error fetching payment from MP:', mpResponse.status, errText)
        }
      } else {
        console.error('Mercado Pago token not configured in app_settings')
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ received: true, error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
