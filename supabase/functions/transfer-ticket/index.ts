import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface TransferTicketRequest {
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}

interface TransferTicketResponse {
  success: boolean;
  transferId?: string;
  error?: string;
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
    const { ticketId, recipientEmail, recipientPhone, recipientName, message }: TransferTicketRequest = await req.json()

    // Validate input
    if (!ticketId) {
      return new Response(
        JSON.stringify({ success: false, error: 'L\'ID du billet est requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!recipientEmail && !recipientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'L\'email ou le téléphone du destinataire est requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'L\'en-tête d\'autorisation est requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentification invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ticket details (simplified query without events join first)
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, event_id, status')
      .eq('id', ticketId)
      .eq('user_id', user.id)

    console.log('Ticket lookup:', { ticketId, userId: user.id, tickets, ticketError })

    if (ticketError) {
      console.error('Ticket lookup error:', ticketError)
      return new Response(
        JSON.stringify({ success: false, error: `Échec de la recherche du billet : ${ticketError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tickets || tickets.length === 0) {
      console.log('No tickets found for:', { ticketId, userId: user.id })
      
      // Let's also check if the ticket exists at all (without user filter)
      const { data: allTickets, error: allTicketsError } = await supabase
        .from('tickets')
        .select('id, user_id, status')
        .eq('id', ticketId)
      
      console.log('Ticket exists check:', { allTickets, allTicketsError })
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Billet non trouvé ou vous n\'avez pas l\'autorisation de le transférer',
          debug: {
            ticketId,
            userId: user.id,
            ticketExists: allTickets && allTickets.length > 0,
            actualOwner: allTickets?.[0]?.user_id
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ticket = tickets[0] // Get the first (and should be only) ticket

    // Check if ticket is transferable - accept multiple valid statuses (case-insensitive)
    const validStatuses = ['valid', 'active', 'confirmed', 'issued', 'VALID', 'ACTIVE', 'CONFIRMED', 'ISSUED']
    if (!validStatuses.includes(ticket.status)) {
      // Translate status to French
      const statusTranslations: { [key: string]: string } = {
        'USED': 'UTILISÉ',
        'used': 'utilisé',
        'EXPIRED': 'EXPIRÉ',
        'expired': 'expiré',
        'CANCELLED': 'ANNULÉ',
        'cancelled': 'annulé',
        'REFUNDED': 'REMBOURSÉ',
        'refunded': 'remboursé',
        'PENDING': 'EN ATTENTE',
        'pending': 'en attente'
      };
      
      const translatedStatus = statusTranslations[ticket.status] || ticket.status;
      
      return new Response(
        JSON.stringify({ success: false, error: `Ce billet ne peut pas être transféré. Statut actuel : ${translatedStatus}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find recipient user - but allow transfers to non-registered users
    let recipientUserId: string | null = null
    let finalRecipientName = recipientName

    console.log('Looking for recipient:', { recipientEmail, recipientPhone })

    if (recipientEmail) {
      const { data: recipientUser, error: recipientError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('email', recipientEmail)
        .single()
      
      console.log('Recipient lookup by email:', { recipientUser, recipientError })
      
      if (recipientUser) {
        recipientUserId = recipientUser.user_id  // ✅ Use user_id, not id
        finalRecipientName = finalRecipientName || recipientUser.name
      }
    } else if (recipientPhone) {
      const { data: recipientUser, error: recipientError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('phone', recipientPhone)
        .single()
      
      console.log('Recipient lookup by phone:', { recipientUser, recipientError })
      
      if (recipientUser) {
        recipientUserId = recipientUser.user_id  // ✅ Use user_id, not id
        finalRecipientName = finalRecipientName || recipientUser.name
      }
    }

    console.log('Final recipient info:', { recipientUserId, finalRecipientName })

    // Allow transfers to non-registered users - they'll get the ticket when they sign up
    if (!recipientUserId) {
      console.log('Recipient not found - creating pending transfer for future user')
      // We'll create the transfer with null recipient_id and they'll get it when they sign up
    }

    // Create transfer record with our implementation schema
    const transferRecord = {
      ticket_id: ticketId,
      sender_id: user.id,
      recipient_id: recipientUserId, // null if user doesn't exist yet
      recipient_email: recipientEmail || null,
      recipient_phone: recipientPhone || null,
      recipient_name: finalRecipientName,
      message: message || null,
      status: recipientUserId ? 'COMPLETED' : 'PENDING' // PENDING if user doesn't exist yet
    }

    console.log('Creating transfer record:', transferRecord)

    const { data: transferData, error: transferError } = await supabase
      .from('ticket_transfers')
      .insert(transferRecord)
      .select('id')
      .single()

    if (transferError) {
      console.error('Transfer creation error:', transferError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Échec de la création de l'enregistrement de transfert : ${transferError.message}`,
          details: transferError
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transfer record created successfully:', transferData)

    // If recipient is registered, transfer ticket ownership immediately
    if (recipientUserId) {
      console.log('Transferring ticket ownership to registered user:', recipientUserId)
      
      const { error: ownershipError } = await supabase
        .from('tickets')
        .update({ 
          user_id: recipientUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
      
      if (ownershipError) {
        console.error('Failed to transfer ticket ownership:', ownershipError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Transfert créé mais échec du transfert de propriété : ${ownershipError.message}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Ticket ownership transferred successfully')
    } else {
      console.log('Transfer created for non-registered user - ownership will transfer on signup')
    }

    // Send notifications
    try {
      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

      // Create notification for recipient if they have an account
      if (recipientUserId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: recipientUserId,
            type: 'ticket_received',
            title: 'Ticket Transferred to You',
            message: `${sender?.name || 'Someone'} transferred a ticket for "${ticket.events?.title || 'Unknown Event'}" to you`,
            data: {
              ticket_id: ticketId,
              from_user: sender?.name,
              event_title: ticket.events?.title,
              message: message
            }
          })
      }

      // TODO: Send email/SMS notifications for external recipients
      console.log('Transfer completed successfully:', {
        ticketId,
        fromUser: user.id,
        toUser: recipientUserId,
        toEmail: recipientEmail,
        toPhone: recipientPhone
      })

    } catch (notificationError) {
      console.error('Notification error:', notificationError)
      // Don't fail the transfer if notifications fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transferData.id,
        message: recipientUserId 
          ? 'Billet transféré avec succès !' 
          : 'Transfert en attente - le destinataire recevra le billet lors de son inscription',
        instantTransfer: !!recipientUserId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Transfer ticket error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Une erreur inattendue s\'est produite',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
