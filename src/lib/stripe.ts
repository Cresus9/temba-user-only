import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Initialize Stripe
export const stripePromise = loadStripe(stripePublishableKey);

// Stripe configuration
export const stripeConfig = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3B82F6',
      colorBackground: '#ffffff',
      colorText: '#1F2937',
      colorDanger: '#EF4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #D1D5DB',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      '.Input:focus': {
        border: '1px solid #3B82F6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },
      '.Label': {
        fontWeight: '500',
        color: '#374151',
        marginBottom: '6px',
      },
    },
  },
  options: {
    layout: 'tabs' as const,
  },
};
