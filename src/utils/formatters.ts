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