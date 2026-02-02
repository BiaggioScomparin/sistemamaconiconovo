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

    const body = await req.json()
    console.log('InfinitePay Webhook received:', JSON.stringify(body))

    // InfinitePay webhook events
    const event = body.event || body.type
    const orderId = body.data?.id || body.order_id || body.id
    const status = body.data?.status || body.status

    if (!orderId) {
      console.log('No order ID found in webhook')
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if payment is approved/paid
    if (status === 'paid' || status === 'approved' || event === 'order.paid') {
      const transactionId = orderId.toString()

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
        // Try to find by metadata payment_id if available
        const metadataPaymentId = body.data?.metadata?.payment_id || body.metadata?.payment_id
        if (metadataPaymentId) {
          const { error: updateError } = await supabaseClient
            .from('monthly_payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_method: 'pix',
              pix_transaction_id: transactionId,
            })
            .eq('id', metadataPaymentId)

          if (updateError) {
            console.error('Error updating payment by metadata:', updateError)
          } else {
            console.log('Payment confirmed by metadata:', metadataPaymentId)
          }
        } else {
          console.log('Payment not found with transaction ID:', transactionId)
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    // Always return 200 to avoid retries
    return new Response(JSON.stringify({ received: true, error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
