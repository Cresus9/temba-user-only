-- Insert checkout page translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('checkout.title', 'en', 'Complete Your Purchase', 'checkout'),
  ('checkout.subtitle', 'en', 'Choose your payment method to secure your tickets', 'checkout'),
  ('checkout.back', 'en', 'Back to Events', 'checkout'),
  
  -- Payment section
  ('checkout.payment.title', 'en', 'Payment Method', 'checkout'),
  ('checkout.payment.mobile_money.title', 'en', 'Mobile Money', 'checkout'),
  ('checkout.payment.mobile_money.description', 'en', 'Pay with Orange Money, Wave, or Moov Money', 'checkout'),
  ('checkout.payment.mobile_money.provider', 'en', 'Mobile Money Provider', 'checkout'),
  ('checkout.payment.mobile_money.select_provider', 'en', 'Select provider', 'checkout'),
  ('checkout.payment.mobile_money.phone', 'en', 'Phone Number', 'checkout'),
  ('checkout.payment.mobile_money.phone_placeholder', 'en', 'Enter your mobile money number', 'checkout'),
  
  ('checkout.payment.card.title', 'en', 'Credit/Debit Card', 'checkout'),
  ('checkout.payment.card.description', 'en', 'Pay with Visa or Mastercard', 'checkout'),
  ('checkout.payment.card.number', 'en', 'Card Number', 'checkout'),
  ('checkout.payment.card.expiry', 'en', 'Expiry Date', 'checkout'),
  ('checkout.payment.card.cvv', 'en', 'CVV', 'checkout'),
  
  ('checkout.payment.processing', 'en', 'Processing...', 'checkout'),
  ('checkout.payment.pay', 'en', 'Pay', 'checkout'),
  
  -- Summary section
  ('checkout.summary.title', 'en', 'Order Summary', 'checkout'),
  ('checkout.summary.subtotal', 'en', 'Subtotal', 'checkout'),
  ('checkout.summary.fees', 'en', 'Processing Fee (2%)', 'checkout'),
  ('checkout.summary.total', 'en', 'Total', 'checkout'),
  ('checkout.summary.warning', 'en', 'Your tickets will be available immediately after payment.', 'checkout'),

  -- French translations
  ('checkout.title', 'fr', 'Finaliser Votre Achat', 'checkout'),
  ('checkout.subtitle', 'fr', 'Choisissez votre mode de paiement pour sécuriser vos billets', 'checkout'),
  ('checkout.back', 'fr', 'Retour aux Événements', 'checkout'),
  
  -- Payment section
  ('checkout.payment.title', 'fr', 'Mode de Paiement', 'checkout'),
  ('checkout.payment.mobile_money.title', 'fr', 'Mobile Money', 'checkout'),
  ('checkout.payment.mobile_money.description', 'fr', 'Payez avec Orange Money, Wave ou Moov Money', 'checkout'),
  ('checkout.payment.mobile_money.provider', 'fr', 'Fournisseur Mobile Money', 'checkout'),
  ('checkout.payment.mobile_money.select_provider', 'fr', 'Sélectionnez un fournisseur', 'checkout'),
  ('checkout.payment.mobile_money.phone', 'fr', 'Numéro de Téléphone', 'checkout'),
  ('checkout.payment.mobile_money.phone_placeholder', 'fr', 'Entrez votre numéro mobile money', 'checkout'),
  
  ('checkout.payment.card.title', 'fr', 'Carte Bancaire', 'checkout'),
  ('checkout.payment.card.description', 'fr', 'Payez avec Visa ou Mastercard', 'checkout'),
  ('checkout.payment.card.number', 'fr', 'Numéro de Carte', 'checkout'),
  ('checkout.payment.card.expiry', 'fr', 'Date d''Expiration', 'checkout'),
  ('checkout.payment.card.cvv', 'fr', 'CVV', 'checkout'),
  
  ('checkout.payment.processing', 'fr', 'Traitement en cours...', 'checkout'),
  ('checkout.payment.pay', 'fr', 'Payer', 'checkout'),
  
  -- Summary section
  ('checkout.summary.title', 'fr', 'Résumé de la Commande', 'checkout'),
  ('checkout.summary.subtotal', 'fr', 'Sous-total', 'checkout'),
  ('checkout.summary.fees', 'fr', 'Frais de Traitement (2%)', 'checkout'),
  ('checkout.summary.total', 'fr', 'Total', 'checkout'),
  ('checkout.summary.warning', 'fr', 'Vos billets seront disponibles immédiatement après le paiement.', 'checkout')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;