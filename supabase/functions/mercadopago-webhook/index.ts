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
    // We're interested in payment notifications
    if (body.type === 'payment' || body.action === 'payment.updated' || body.action === 'payment.created') {
      const paymentId = body.data?.id

      if (!paymentId) {
        console.log('No payment ID found in webhook')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Fetch payment details from Mercado Pago
      if (mercadoPagoToken) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
          },
        })

        if (mpResponse.ok) {
          const paymentData = await mpResponse.json()
          console.log('Payment data from MP:', JSON.stringify(paymentData))

          // Check if payment is approved
          if (paymentData.status === 'approved') {
            const transactionId = paymentData.id?.toString()

            // Find and update the payment in our database
            const { data: existingPayment, error: findError } = await supabaseClient
              .from('monthly_payments')
              .select('id')
              .eq('pix_transaction_id', transactionId)
              .single()

            if (existingPayment && !findError) {
              const { error: updateError } = await supabaseClient
                .from('monthly_payments')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  payment_method: 'pix',
                })
                .eq('id', existingPayment.id)

              if (updateError) {
                console.error('Error updating payment:', updateError)
              } else {
                console.log('Payment confirmed successfully:', existingPayment.id)
              }
            } else {
              console.log('Payment not found with transaction ID:', transactionId)
            }
          }
        } else {
          console.error('Error fetching payment from MP:', await mpResponse.text())
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    // Always return 200 to Mercado Pago to avoid retries
    return new Response(JSON.stringify({ received: true, error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
