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

  // Create Supabase client using the anon key for user authentication.
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Parse request body
    const body = await req.json();
    const { packageId, guestCount, bookingDate, totalAmount, finalAmount } = body;

    if (!packageId || !guestCount || !bookingDate || !totalAmount || !finalAmount) {
      throw new Error("Missing required booking information");
    }

    console.log("Creating booking payment for:", { 
      packageId, 
      guestCount, 
      totalAmount, 
      finalAmount, 
      userId: user.id 
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create booking record with pending status
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        customer_id: user.id,
        package_id: packageId,
        guest_count: guestCount,
        booking_date: bookingDate,
        total_amount: totalAmount,
        final_amount: finalAmount,
        payment_status: 'pending',
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      throw new Error("Failed to create booking record");
    }

    console.log("Booking created:", booking);

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: "Travel Package Booking",
              description: `Booking for ${guestCount} guests`,
            },
            unit_amount: Math.round(finalAmount * 100), // Convert to satang (Thai currency subunit)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?booking_id=${booking.id}`,
      cancel_url: `${req.headers.get("origin")}/packages/${packageId}`,
      metadata: {
        booking_id: booking.id,
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes expiry
    });

    console.log("Stripe checkout session created:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      booking_id: booking.id,
      expires_at: session.expires_at 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-booking-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});