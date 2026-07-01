/**
 * Parse a date-only string (YYYY-MM-DD or ISO with time) as local midnight.
 * Using `new Date("YYYY-MM-DD")` parses as UTC 00:00 which shifts back by one day
 * in negative-UTC-offset timezones (e.g. America/New_York). This avoids that bug.
 */
export const parseLocalDate = (dateString: string): Date => {
  const parts = dateString.split('T')[0].split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

export const formatCurrency = (amount: number, currency: string = 'XOF'): string => {
  const normalizedCurrency = currency?.toUpperCase?.() ?? 'XOF';

  if (normalizedCurrency === 'XOF') {
    const numeric = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${numeric} FCFA`;
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: normalizedCurrency,
  }).format(amount);
};