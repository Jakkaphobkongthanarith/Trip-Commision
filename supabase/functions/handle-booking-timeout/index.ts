import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log("Checking for expired bookings...");
    
    // Find bookings that are pending and older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const { data: expiredBookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, customer_id, package_id, guest_count')
      .eq('payment_status', 'pending')
      .lt('created_at', thirtyMinutesAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching expired bookings:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredBookings?.length || 0} expired bookings`);

    if (expiredBookings && expiredBookings.length > 0) {
      // Update expired bookings to failed status
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'failed',
          status: 'cancelled'
        })
        .in('id', expiredBookings.map(b => b.id));

      if (updateError) {
        console.error("Error updating expired bookings:", updateError);
        throw updateError;
      }

      console.log(`Successfully cancelled ${expiredBookings.length} expired bookings`);
    }

    return new Response(JSON.stringify({ 
      message: "Timeout check completed",
      cancelled_bookings: expiredBookings?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in handle-booking-timeout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});