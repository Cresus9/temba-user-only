import { supabase } from '../lib/supabase-client';

export interface UserCreditBalance {
  balance: number;
  currency: string;
}

export interface CreditTransactionRow {
  id: string;
  amount?: number;
  balance_after?: number;
  type?: string;
  description?: string;
  created_at?: string;
  [key: string]: unknown;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Supports common column names across schemas. */
function rowToBalance(row: Record<string, unknown>): UserCreditBalance {
  const balance =
    num(row.balance) ??
    num(row.available_balance) ??
    num(row.available_credits) ??
    num(row.credit_balance) ??
    num(row.amount) ??
    0;
  const currency = String(row.currency ?? row.currency_code ?? 'XOF');
  return { balance, currency };
}

/**
 * Fetches the current user's credit wallet from `user_credits` (PostgREST).
 * Requires RLS allowing select for `auth.uid()` on `user_id`.
 */
export async function fetchUserCreditBalanceFromSupabase(): Promise<UserCreditBalance | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[credits] user_credits:', error.message);
    }
    return null;
  }

  if (!data || typeof data !== 'object') {
    return { balance: 0, currency: 'XOF' };
  }

  return rowToBalance(data as Record<string, unknown>);
}

/**
 * Fetches recent ledger rows from `credit_transactions`.
 */
/** Lifetime earned / spent for UI parity with mobile (VOS CRÉDITS). */
export interface CreditAggregates {
  available: number;
  earned: number;
  spent: number;
  currency: string;
}

const SPEND_TYPES =
  /redeem|spend|debit|purchase|checkout|payment|order|withdraw|utilis/i;

function isSpendRow(tx: CreditTransactionRow): boolean {
  const type = String(tx.type ?? tx.transaction_type ?? tx.category ?? '').toLowerCase();
  if (SPEND_TYPES.test(type)) return true;
  const a = Number(tx.amount);
  return Number.isFinite(a) && a < 0;
}

/**
 * `available` from `user_credits`; `earned` / `spent` from `total_earned`/`total_spent` columns when present,
 * else derived from `credit_transactions` (positive amounts = in, negative or spend types = out).
 */
export async function fetchCreditAggregatesFromSupabase(): Promise<CreditAggregates | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== '42P01') {
    console.warn('[credits] user_credits (aggregates):', error.message);
  }

  const { data: txRows, error: txErr } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  if (txErr && txErr.code !== '42P01') {
    console.warn('[credits] credit_transactions (aggregates):', txErr.message);
  }

  const txs = (txRows as CreditTransactionRow[]) ?? [];
  const rec = row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  const bal = rec ? rowToBalance(rec) : { balance: 0, currency: 'XOF' };

  let earned =
    num(rec?.total_earned) ??
    num(rec?.lifetime_earned) ??
    num(rec?.credits_earned);
  let spent =
    num(rec?.total_spent) ??
    num(rec?.lifetime_spent) ??
    num(rec?.credits_spent);

  let sumIn = 0;
  let sumOut = 0;
  for (const tx of txs) {
    const a = Number(tx.amount);
    if (!Number.isFinite(a)) continue;
    if (isSpendRow(tx)) {
      sumOut += Math.abs(a);
    } else if (a >= 0) {
      sumIn += a;
    } else {
      sumOut += Math.abs(a);
    }
  }
  if (earned == null) earned = sumIn;
  if (spent == null) spent = sumOut;

  earned = earned ?? 0;
  spent = spent ?? 0;

  return {
    available: bal.balance,
    earned,
    spent,
    currency: bal.currency,
  };
}

export async function fetchUserCreditTransactionsFromSupabase(
  limit = 25
): Promise<CreditTransactionRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[credits] credit_transactions:', error.message);
    }
    return [];
  }

  return (data as CreditTransactionRow[]) ?? [];
}

class CreditService {
  getBalance = fetchUserCreditBalanceFromSupabase;
  getTransactions = fetchUserCreditTransactionsFromSupabase;
  getAggregates = fetchCreditAggregatesFromSupabase;
}

export const creditService = new CreditService();
