-- Drop existing translations table if it exists
DROP TABLE IF EXISTS translations CASCADE;

-- Create translations table with proper structure
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  content text NOT NULL,
  namespace text DEFAULT 'common',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, locale)
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "translations_select_policy"
  ON translations FOR SELECT
  TO PUBLIC
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
CREATE INDEX idx_translations_namespace ON translations(namespace);

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

-- Grant necessary permissions
GRANT SELECT ON translations TO anon;
GRANT SELECT ON translations TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation TO anon;
GRANT EXECUTE ON FUNCTION get_translation TO authenticated;

-- Insert common translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- Common English translations
  ('common.loading', 'en', 'Loading...', 'common'),
  ('common.error', 'en', 'An error occurred', 'common'),
  ('common.success', 'en', 'Success', 'common'),
  ('common.save', 'en', 'Save', 'common'),
  ('common.cancel', 'en', 'Cancel', 'common'),
  ('common.delete', 'en', 'Delete', 'common'),
  ('common.edit', 'en', 'Edit', 'common'),
  ('common.view', 'en', 'View', 'common'),
  ('common.back', 'en', 'Back', 'common'),
  ('common.next', 'en', 'Next', 'common'),
  ('common.previous', 'en', 'Previous', 'common'),
  ('common.search', 'en', 'Search', 'common'),
  ('common.filter', 'en', 'Filter', 'common'),
  ('common.sort', 'en', 'Sort', 'common'),
  ('common.required', 'en', 'Required', 'common'),
  ('common.optional', 'en', 'Optional', 'common'),
  
  -- Common French translations
  ('common.loading', 'fr', 'Chargement...', 'common'),
  ('common.error', 'fr', 'Une erreur est survenue', 'common'),
  ('common.success', 'fr', 'Succès', 'common'),
  ('common.save', 'fr', 'Enregistrer', 'common'),
  ('common.cancel', 'fr', 'Annuler', 'common'),
  ('common.delete', 'fr', 'Supprimer', 'common'),
  ('common.edit', 'fr', 'Modifier', 'common'),
  ('common.view', 'fr', 'Voir', 'common'),
  ('common.back', 'fr', 'Retour', 'common'),
  ('common.next', 'fr', 'Suivant', 'common'),
  ('common.previous', 'fr', 'Précédent', 'common'),
  ('common.search', 'fr', 'Rechercher', 'common'),
  ('common.filter', 'fr', 'Filtrer', 'common'),
  ('common.sort', 'fr', 'Trier', 'common'),
  ('common.required', 'fr', 'Obligatoire', 'common'),
  ('common.optional', 'fr', 'Optionnel', 'common'),

  -- Error messages English
  ('error.network', 'en', 'Network error. Please check your connection.', 'error'),
  ('error.unauthorized', 'en', 'Please login to continue', 'error'),
  ('error.forbidden', 'en', 'You do not have permission to perform this action', 'error'),
  ('error.not_found', 'en', 'The requested resource was not found', 'error'),
  ('error.validation', 'en', 'Please check your input and try again', 'error'),
  ('error.server', 'en', 'Server error. Please try again later', 'error'),
  ('error.payment', 'en', 'Payment processing failed. Please try again', 'error'),
  ('error.tickets_unavailable', 'en', 'These tickets are no longer available', 'error'),
  
  -- Error messages French
  ('error.network', 'fr', 'Erreur réseau. Veuillez vérifier votre connexion.', 'error'),
  ('error.unauthorized', 'fr', 'Veuillez vous connecter pour continuer', 'error'),
  ('error.forbidden', 'fr', 'Vous n''avez pas la permission d''effectuer cette action', 'error'),
  ('error.not_found', 'fr', 'La ressource demandée n''a pas été trouvée', 'error'),
  ('error.validation', 'fr', 'Veuillez vérifier vos informations et réessayer', 'error'),
  ('error.server', 'fr', 'Erreur serveur. Veuillez réessayer plus tard', 'error'),
  ('error.payment', 'fr', 'Le traitement du paiement a échoué. Veuillez réessayer', 'error'),
  ('error.tickets_unavailable', 'fr', 'Ces billets ne sont plus disponibles', 'error')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;