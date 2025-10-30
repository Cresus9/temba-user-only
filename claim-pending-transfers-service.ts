// =====================================================
// CLAIM PENDING TRANSFERS SERVICE
// =====================================================
// This service handles claiming pending transfers after user login
// Add this to your existing services

import { supabase } from '../lib/supabase-client';

export interface ClaimResult {
  claimed_count: number;
  message: string;
}

class ClaimPendingTransfersService {
  /**
   * Claims any pending transfers for the current user
   * Call this after successful login/signup
   */
  async claimPendingTransfers(): Promise<ClaimResult> {
    try {
      const { data, error } = await supabase.rpc('claim_pending_transfers');
      
      if (error) {
        console.error('Error claiming pending transfers:', error);
        return {
          claimed_count: 0,
          message: `Error: ${error.message}`
        };
      }
      
      if (data && data.length > 0) {
        const result = data[0] as ClaimResult;
        console.log('Claimed pending transfers:', result);
        return result;
      }
      
      return {
        claimed_count: 0,
        message: 'No pending transfers found'
      };
      
    } catch (error: any) {
      console.error('Unexpected error claiming transfers:', error);
      return {
        claimed_count: 0,
        message: `Unexpected error: ${error.message}`
      };
    }
  }
}

export const claimPendingTransfersService = new ClaimPendingTransfersService();
