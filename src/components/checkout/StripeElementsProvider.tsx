import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise, stripeConfig } from '../../lib/stripe';

interface StripeElementsProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export default function StripeElementsProvider({ 
  children, 
  clientSecret 
}: StripeElementsProviderProps) {
  return (
    <Elements 
      stripe={stripePromise} 
      options={{
        ...stripeConfig,
        ...(clientSecret && { clientSecret }),
      }}
    >
      {children}
    </Elements>
  );
}
