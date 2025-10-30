// =====================================================
// AUTH CONTEXT INTEGRATION EXAMPLE
// =====================================================
// Add this to your existing AuthContext.tsx after login/signup

import { claimPendingTransfersService } from '../services/claim-pending-transfers-service';

// In your AuthContext, add this after successful login/signup:

const handleLogin = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // ✅ NEW: Claim any pending transfers after login
    if (data.user) {
      const claimResult = await claimPendingTransfersService.claimPendingTransfers();
      if (claimResult.claimed_count > 0) {
        console.log(`Claimed ${claimResult.claimed_count} pending transfers`);
        // Optionally show a toast notification
        // toast.success(`You received ${claimResult.claimed_count} transferred tickets!`);
      }
    }

    setUser(data.user);
    setSession(data.session);
    // ... rest of your login logic
  } catch (error) {
    // ... error handling
  }
};

const handleSignup = async (email: string, password: string, name: string) => {
  try {
    // Your existing signup logic...
    const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ email, password, name })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    // Sign in after successful signup
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) throw signInError;

    // ✅ NEW: Claim any pending transfers after signup
    if (signInData.user) {
      const claimResult = await claimPendingTransfersService.claimPendingTransfers();
      if (claimResult.claimed_count > 0) {
        console.log(`Claimed ${claimResult.claimed_count} pending transfers`);
        // Optionally show a toast notification
        // toast.success(`You received ${claimResult.claimed_count} transferred tickets!`);
      }
    }

    setUser(signInData.user);
    setSession(signInData.session);
    // ... rest of your signup logic
  } catch (error) {
    // ... error handling
  }
};
