-- Create translations table
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, locale)
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "translations_select_policy"
  ON translations FOR SELECT
  USING (true);

CREATE POLICY "translations_admin_policy"
  ON translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_translations_key_locale ON translations(key, locale);

-- Create function to get translation
CREATE OR REPLACE FUNCTION get_translation(p_key text, p_locale text DEFAULT 'en')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content text;
BEGIN
  -- Try to get translation in requested locale
  SELECT content INTO v_content
  FROM translations
  WHERE key = p_key AND locale = p_locale;
  
  -- Fall back to English if translation not found
  IF v_content IS NULL AND p_locale != 'en' THEN
    SELECT content INTO v_content
    FROM translations
    WHERE key = p_key AND locale = 'en';
  END IF;
  
  RETURN v_content;
END;
$$;

-- Insert common translations
INSERT INTO translations (key, locale, content) VALUES
  -- English translations
  ('common.loading', 'en', 'Loading...'),
  ('common.error', 'en', 'An error occurred'),
  ('common.success', 'en', 'Success'),
  ('common.save', 'en', 'Save'),
  ('common.cancel', 'en', 'Cancel'),
  ('common.delete', 'en', 'Delete'),
  ('common.edit', 'en', 'Edit'),
  ('common.view', 'en', 'View'),
  ('common.back', 'en', 'Back'),
  ('common.next', 'en', 'Next'),
  ('common.previous', 'en', 'Previous'),
  ('common.search', 'en', 'Search'),
  ('common.filter', 'en', 'Filter'),
  ('common.sort', 'en', 'Sort'),
  ('common.required', 'en', 'Required'),
  ('common.optional', 'en', 'Optional'),
  
  -- French translations
  ('common.loading', 'fr', 'Chargement...'),
  ('common.error', 'fr', 'Une erreur est survenue'),
  ('common.success', 'fr', 'Succès'),
  ('common.save', 'fr', 'Enregistrer'),
  ('common.cancel', 'fr', 'Annuler'),
  ('common.delete', 'fr', 'Supprimer'),
  ('common.edit', 'fr', 'Modifier'),
  ('common.view', 'fr', 'Voir'),
  ('common.back', 'fr', 'Retour'),
  ('common.next', 'fr', 'Suivant'),
  ('common.previous', 'fr', 'Précédent'),
  ('common.search', 'fr', 'Rechercher'),
  ('common.filter', 'fr', 'Filtrer'),
  ('common.sort', 'fr', 'Trier'),
  ('common.required', 'fr', 'Obligatoire'),
  ('common.optional', 'fr', 'Optionnel')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;

-- Insert error messages
INSERT INTO translations (key, locale, content) VALUES
  -- English error messages
  ('error.network', 'en', 'Network error. Please check your connection.'),
  ('error.unauthorized', 'en', 'Please login to continue'),
  ('error.forbidden', 'en', 'You do not have permission to perform this action'),
  ('error.not_found', 'en', 'The requested resource was not found'),
  ('error.validation', 'en', 'Please check your input and try again'),
  ('error.server', 'en', 'Server error. Please try again later'),
  ('error.payment', 'en', 'Payment processing failed. Please try again'),
  ('error.tickets_unavailable', 'en', 'These tickets are no longer available'),
  
  -- French error messages
  ('error.network', 'fr', 'Erreur réseau. Veuillez vérifier votre connexion.'),
  ('error.unauthorized', 'fr', 'Veuillez vous connecter pour continuer'),
  ('error.forbidden', 'fr', 'Vous n''avez pas la permission d''effectuer cette action'),
  ('error.not_found', 'fr', 'La ressource demandée n''a pas été trouvée'),
  ('error.validation', 'fr', 'Veuillez vérifier vos informations et réessayer'),
  ('error.server', 'fr', 'Erreur serveur. Veuillez réessayer plus tard'),
  ('error.payment', 'fr', 'Le traitement du paiement a échoué. Veuillez réessayer'),
  ('error.tickets_unavailable', 'fr', 'Ces billets ne sont plus disponibles')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;

-- Add locale column to pages and FAQs if it doesn't exist
ALTER TABLE pages ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';

-- Create French versions of existing pages
WITH existing_pages AS (
  SELECT * FROM pages WHERE locale = 'en' OR locale IS NULL
)
INSERT INTO pages (
  title,
  slug,
  content,
  meta_title,
  meta_description,
  published,
  locale
)
SELECT 
  CASE 
    WHEN title = 'About Us' THEN 'À Propos'
    WHEN title = 'Terms of Service' THEN 'Conditions d''Utilisation'
    WHEN title = 'Privacy Policy' THEN 'Politique de Confidentialité'
    WHEN title = 'Contact Us' THEN 'Contactez-Nous'
    ELSE title || ' (FR)'
  END,
  slug || '-fr',
  content,
  COALESCE(meta_title, title) || ' - FR',
  COALESCE(meta_description, 'Version française'),
  published,
  'fr'
FROM existing_pages
WHERE title IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

-- Create French versions of existing FAQs
WITH existing_faqs AS (
  SELECT * FROM faqs WHERE locale = 'en' OR locale IS NULL
)
INSERT INTO faqs (
  question,
  answer,
  category,
  display_order,
  locale
)
SELECT 
  CASE 
    WHEN question = 'How do I purchase tickets?' THEN 'Comment acheter des billets ?'
    WHEN question = 'What payment methods do you accept?' THEN 'Quels moyens de paiement acceptez-vous ?'
    WHEN question = 'Can I get a refund?' THEN 'Puis-je obtenir un remboursement ?'
    WHEN question = 'How do I contact support?' THEN 'Comment contacter le support ?'
    ELSE question || ' (FR)'
  END,
  CASE 
    WHEN answer LIKE '%purchase tickets%' THEN 'Vous pouvez acheter des billets directement sur notre site en sélectionnant un événement et en choisissant le type de billet souhaité.'
    WHEN answer LIKE '%payment methods%' THEN 'Nous acceptons les cartes de crédit/débit et les paiements par mobile money.'
    WHEN answer LIKE '%Refund policies%' THEN 'Les politiques de remboursement varient selon l''événement. Veuillez consulter la page de l''événement pour les politiques spécifiques.'
    WHEN answer LIKE '%contact support%' THEN 'Vous pouvez contacter notre équipe de support via la section Support de votre tableau de bord.'
    ELSE answer || ' (FR)'
  END,
  CASE 
    WHEN category = 'Tickets' THEN 'Billets'
    WHEN category = 'Payments' THEN 'Paiements'
    WHEN category = 'Support' THEN 'Support'
    ELSE category || ' (FR)'
  END,
  display_order,
  'fr'
FROM existing_faqs
WHERE question IS NOT NULL
ON CONFLICT DO NOTHING;