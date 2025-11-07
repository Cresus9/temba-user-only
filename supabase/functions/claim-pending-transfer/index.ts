import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface ClaimTransferRequest {
  transferId: string;
}

interface ClaimTransferResponse {
  success: boolean;
  error?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { transferId }: ClaimTransferRequest = await req.json()

    if (!transferId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the current user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('ticket_transfers')
      .select(`
        id,
        ticket_id,
        sender_id,
        recipient_id,
        recipient_email,
        recipient_phone,
        status,
        created_at
      `)
      .eq('id', transferId)
      .single()

    if (transferError || !transfer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if transfer is still pending
    if (transfer.status !== 'PENDING') {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer is no longer pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile to check phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone, email')
      .eq('user_id', user.id)
      .single()

    // Verify the user is the intended recipient
    const isEmailMatch = transfer.recipient_email && (
      transfer.recipient_email === user.email || 
      transfer.recipient_email === profile?.email
    )
    const isPhoneMatch = transfer.recipient_phone && (
      profile?.phone === transfer.recipient_phone ||
      (user.user_metadata?.phone && user.user_metadata.phone === transfer.recipient_phone)
    )

    if (!isEmailMatch && !isPhoneMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'You are not the intended recipient of this transfer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        user_id,
        event_id,
        ticket_type_id,
        status,
        scanned_at
      `)
      .eq('id', transfer.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if ticket is already transferred to someone else
    if (ticket.user_id !== transfer.sender_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticket has already been transferred' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if ticket is scanned (cannot transfer scanned tickets)
    if (ticket.scanned_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot claim scanned tickets' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the transfer status and assign the ticket to the user
    const { error: updateError } = await supabase
      .from('ticket_transfers')
      .update({
        status: 'COMPLETED',
        recipient_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId)

    if (updateError) {
      console.error('Error updating transfer:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update transfer status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transfer the ticket ownership
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({
        user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transfer.ticket_id)

    if (ticketUpdateError) {
      console.error('Error updating ticket ownership:', ticketUpdateError)
      // Try to revert the transfer status
      await supabase
        .from('ticket_transfers')
        .update({
          status: 'PENDING',
          recipient_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId)
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to transfer ticket ownership' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a notification for the sender
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: transfer.sender_id,
        title: 'Billet récupéré',
        message: `Votre billet a été récupéré par ${user.user_metadata?.name || user.email}`,
        type: 'ticket_claimed',
        metadata: {
          transfer_id: transferId,
          ticket_id: transfer.ticket_id,
          recipient_name: user.user_metadata?.name || user.email
        }
      })

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the entire operation for notification errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ticket successfully claimed!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected claim transfer error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
