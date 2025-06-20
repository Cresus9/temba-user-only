// supabase/functions/validate-ticket/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Simple function to validate a signature
function validateSignature(data: string, signature: string, secret: string): boolean {
  // Simple hash function for demo purposes
  // In production, use a proper HMAC library
  let hash = 0;
  const combinedString = data + secret;
  
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string and ensure it's always positive
  const calculatedSignature = Math.abs(hash).toString(16);
  
  return calculatedSignature === signature;
}

serve(async (req) => {
  try {
    // Parse request body
    const { encodedData } = await req.json();
    
    // Get the secret key from environment variables
    const SECRET_KEY = Deno.env.get("TICKET_SECRET_KEY") || "default-secret-key";
    
    // Decode the base64 string
    const jsonString = atob(encodedData);
    const data = JSON.parse(jsonString);
    
    // Extract payload and signature
    const { data: payload, sig } = data;
    
    // Verify the signature
    const isValid = validateSignature(JSON.stringify(payload), sig, SECRET_KEY);
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid signature" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if the ticket has expired (24 hour validity)
    const now = Date.now();
    if (now - payload.timestamp > 24 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({ success: false, message: "Ticket QR code has expired" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Here you would typically validate the ticket against your database
    // For this example, we'll just return success
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Ticket validated successfully",
        ticket: {
          id: payload.id,
          timestamp: payload.timestamp
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error validating ticket:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Invalid QR code format" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});