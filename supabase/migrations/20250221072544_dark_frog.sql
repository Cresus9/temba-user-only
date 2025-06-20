-- Insert content management translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.content.title', 'en', 'Content Management', 'admin'),
  ('admin.content.pages', 'en', 'Pages', 'admin'),
  ('admin.content.banners', 'en', 'Banners', 'admin'),
  ('admin.content.faqs', 'en', 'FAQs', 'admin'),
  
  -- Page management
  ('admin.content.pages.title', 'en', 'Page Management', 'admin'),
  ('admin.content.pages.create', 'en', 'Create Page', 'admin'),
  ('admin.content.pages.edit', 'en', 'Edit Page', 'admin'),
  ('admin.content.pages.form.title', 'en', 'Page Title', 'admin'),
  ('admin.content.pages.form.slug', 'en', 'URL Slug', 'admin'),
  ('admin.content.pages.form.content', 'en', 'Content', 'admin'),
  ('admin.content.pages.form.meta_title', 'en', 'Meta Title', 'admin'),
  ('admin.content.pages.form.meta_description', 'en', 'Meta Description', 'admin'),
  ('admin.content.pages.form.published', 'en', 'Published', 'admin'),
  
  -- Banner management
  ('admin.content.banners.title', 'en', 'Banner Management', 'admin'),
  ('admin.content.banners.create', 'en', 'Create Banner', 'admin'),
  ('admin.content.banners.edit', 'en', 'Edit Banner', 'admin'),
  ('admin.content.banners.form.title', 'en', 'Banner Title', 'admin'),
  ('admin.content.banners.form.image', 'en', 'Image URL', 'admin'),
  ('admin.content.banners.form.link', 'en', 'Link (optional)', 'admin'),
  ('admin.content.banners.form.description', 'en', 'Description', 'admin'),
  ('admin.content.banners.form.order', 'en', 'Display Order', 'admin'),
  ('admin.content.banners.form.active', 'en', 'Active', 'admin'),
  ('admin.content.banners.form.event', 'en', 'Link to Event (optional)', 'admin'),
  
  -- FAQ management
  ('admin.content.faqs.title', 'en', 'FAQ Management', 'admin'),
  ('admin.content.faqs.create', 'en', 'Create FAQ', 'admin'),
  ('admin.content.faqs.edit', 'en', 'Edit FAQ', 'admin'),
  ('admin.content.faqs.form.question', 'en', 'Question', 'admin'),
  ('admin.content.faqs.form.answer', 'en', 'Answer', 'admin'),
  ('admin.content.faqs.form.category', 'en', 'Category', 'admin'),
  ('admin.content.faqs.form.order', 'en', 'Display Order', 'admin'),
  
  -- Success messages
  ('admin.content.success.page_create', 'en', 'Page created successfully', 'admin'),
  ('admin.content.success.page_update', 'en', 'Page updated successfully', 'admin'),
  ('admin.content.success.page_delete', 'en', 'Page deleted successfully', 'admin'),
  ('admin.content.success.banner_create', 'en', 'Banner created successfully', 'admin'),
  ('admin.content.success.banner_update', 'en', 'Banner updated successfully', 'admin'),
  ('admin.content.success.banner_delete', 'en', 'Banner deleted successfully', 'admin'),
  ('admin.content.success.faq_create', 'en', 'FAQ created successfully', 'admin'),
  ('admin.content.success.faq_update', 'en', 'FAQ updated successfully', 'admin'),
  ('admin.content.success.faq_delete', 'en', 'FAQ deleted successfully', 'admin'),
  
  -- Error messages
  ('admin.content.error.page_create', 'en', 'Failed to create page', 'admin'),
  ('admin.content.error.page_update', 'en', 'Failed to update page', 'admin'),
  ('admin.content.error.page_delete', 'en', 'Failed to delete page', 'admin'),
  ('admin.content.error.banner_create', 'en', 'Failed to create banner', 'admin'),
  ('admin.content.error.banner_update', 'en', 'Failed to update banner', 'admin'),
  ('admin.content.error.banner_delete', 'en', 'Failed to delete banner', 'admin'),
  ('admin.content.error.faq_create', 'en', 'Failed to create FAQ', 'admin'),
  ('admin.content.error.faq_update', 'en', 'Failed to update FAQ', 'admin'),
  ('admin.content.error.faq_delete', 'en', 'Failed to delete FAQ', 'admin'),
  
  -- French translations
  ('admin.content.title', 'fr', 'Gestion du Contenu', 'admin'),
  ('admin.content.pages', 'fr', 'Pages', 'admin'),
  ('admin.content.banners', 'fr', 'Bannières', 'admin'),
  ('admin.content.faqs', 'fr', 'FAQs', 'admin'),
  
  -- Page management
  ('admin.content.pages.title', 'fr', 'Gestion des Pages', 'admin'),
  ('admin.content.pages.create', 'fr', 'Créer une Page', 'admin'),
  ('admin.content.pages.edit', 'fr', 'Modifier la Page', 'admin'),
  ('admin.content.pages.form.title', 'fr', 'Titre de la Page', 'admin'),
  ('admin.content.pages.form.slug', 'fr', 'Slug URL', 'admin'),
  ('admin.content.pages.form.content', 'fr', 'Contenu', 'admin'),
  ('admin.content.pages.form.meta_title', 'fr', 'Titre Meta', 'admin'),
  ('admin.content.pages.form.meta_description', 'fr', 'Description Meta', 'admin'),
  ('admin.content.pages.form.published', 'fr', 'Publié', 'admin'),
  
  -- Banner management
  ('admin.content.banners.title', 'fr', 'Gestion des Bannières', 'admin'),
  ('admin.content.banners.create', 'fr', 'Créer une Bannière', 'admin'),
  ('admin.content.banners.edit', 'fr', 'Modifier la Bannière', 'admin'),
  ('admin.content.banners.form.title', 'fr', 'Titre de la Bannière', 'admin'),
  ('admin.content.banners.form.image', 'fr', 'URL de l''Image', 'admin'),
  ('admin.content.banners.form.link', 'fr', 'Lien (optionnel)', 'admin'),
  ('admin.content.banners.form.description', 'fr', 'Description', 'admin'),
  ('admin.content.banners.form.order', 'fr', 'Ordre d''Affichage', 'admin'),
  ('admin.content.banners.form.active', 'fr', 'Active', 'admin'),
  ('admin.content.banners.form.event', 'fr', 'Lier à un Événement (optionnel)', 'admin'),
  
  -- FAQ management
  ('admin.content.faqs.title', 'fr', 'Gestion des FAQs', 'admin'),
  ('admin.content.faqs.create', 'fr', 'Créer une FAQ', 'admin'),
  ('admin.content.faqs.edit', 'fr', 'Modifier la FAQ', 'admin'),
  ('admin.content.faqs.form.question', 'fr', 'Question', 'admin'),
  ('admin.content.faqs.form.answer', 'fr', 'Réponse', 'admin'),
  ('admin.content.faqs.form.category', 'fr', 'Catégorie', 'admin'),
  ('admin.content.faqs.form.order', 'fr', 'Ordre d''Affichage', 'admin'),
  
  -- Success messages
  ('admin.content.success.page_create', 'fr', 'Page créée avec succès', 'admin'),
  ('admin.content.success.page_update', 'fr', 'Page mise à jour avec succès', 'admin'),
  ('admin.content.success.page_delete', 'fr', 'Page supprimée avec succès', 'admin'),
  ('admin.content.success.banner_create', 'fr', 'Bannière créée avec succès', 'admin'),
  ('admin.content.success.banner_update', 'fr', 'Bannière mise à jour avec succès', 'admin'),
  ('admin.content.success.banner_delete', 'fr', 'Bannière supprimée avec succès', 'admin'),
  ('admin.content.success.faq_create', 'fr', 'FAQ créée avec succès', 'admin'),
  ('admin.content.success.faq_update', 'fr', 'FAQ mise à jour avec succès', 'admin'),
  ('admin.content.success.faq_delete', 'fr', 'FAQ supprimée avec succès', 'admin'),
  
  -- Error messages
  ('admin.content.error.page_create', 'fr', 'Échec de la création de la page', 'admin'),
  ('admin.content.error.page_update', 'fr', 'Échec de la mise à jour de la page', 'admin'),
  ('admin.content.error.page_delete', 'fr', 'Échec de la suppression de la page', 'admin'),
  ('admin.content.error.banner_create', 'fr', 'Échec de la création de la bannière', 'admin'),
  ('admin.content.error.banner_update', 'fr', 'Échec de la mise à jour de la bannière', 'admin'),
  ('admin.content.error.banner_delete', 'fr', 'Échec de la suppression de la bannière', 'admin'),
  ('admin.content.error.faq_create', 'fr', 'Échec de la création de la FAQ', 'admin'),
  ('admin.content.error.faq_update', 'fr', 'Échec de la mise à jour de la FAQ', 'admin'),
  ('admin.content.error.faq_delete', 'fr', 'Échec de la suppression de la FAQ', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;