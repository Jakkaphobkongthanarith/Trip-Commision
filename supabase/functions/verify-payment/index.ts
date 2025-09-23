import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with service role key to bypass RLS
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Parse request body
    const body = await req.json();
    const { sessionId, bookingId } = body;

    if (!sessionId || !bookingId) {
      throw new Error("Missing session ID or booking ID");
    }

    console.log("Verifying payment for:", { sessionId, bookingId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Update booking to completed status
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent?.toString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw updateError;
      }

      console.log("Payment verified and booking confirmed:", bookingId);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Payment verified and booking confirmed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("Payment not completed:", session.payment_status);
      
      return new Response(JSON.stringify({ 
        success: false,
        message: "Payment not completed",
        payment_status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    console.error("Error in verify-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});