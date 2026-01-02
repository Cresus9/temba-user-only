# Investigation: Ticket Creation avec event_date_id

## Résumé
Vérification de tous les endroits où les tickets sont créés pour s'assurer que `event_date_id` est correctement propagé depuis la commande vers les tickets.

## Endroits où les tickets sont créés

### ✅ 1. Stripe Webhook (`stripe-webhook/index.ts`)
- **Ligne 181** : `event_date_id: order.event_date_id || null`
- **Status** : ✅ **CORRECT** - Utilise `event_date_id` de la commande

### ✅ 2. pawaPay Webhook (`pawapay-webhook/index.ts`)
- **Ligne 476** : `event_date_id: order.event_date_id || null`
- **Status** : ✅ **CORRECT** - Utilise `event_date_id` de la commande

### ❌ 3. PayDunya Webhook (`paydunya-ipn/index-production.ts`)
- **Ligne 351** : **MANQUE `event_date_id`**
- **Status** : ❌ **À CORRIGER** - Ne passe pas `event_date_id` lors de la création des tickets

### ✅ 4. SQL Function `admin_finalize_payment` 
- **Fichier** : `supabase/migrations/20251011000003_admin_finalize_payment.sql`
- **Ligne 113** : `v_order.event_date_id`
- **Status** : ✅ **CORRECT** - Utilise `event_date_id` de la commande

### ❌ 5. Database Trigger `create_tickets_after_order`
- **Fonction** : `create_tickets_for_order()`
- **Status** : ❌ **PROBLÈME** - La fonction ne passe pas `event_date_id` dans plusieurs migrations

#### Versions de `create_tickets_for_order()` trouvées :

1. **`20250123114559_foggy_cottage.sql`** (ligne 99-113)
   - Utilise `jsonb_array_elements`
   - ❌ **MANQUE `event_date_id`**

2. **`20250308183911_fierce_garden.sql`** (ligne 74-88)
   - Utilise `jsonb_each_text`
   - ❌ **MANQUE `event_date_id`**
   - **Probablement la version active** (migration la plus récente)

3. **`20250308184521_foggy_fire.sql`** (ligne 92)
   - Utilise `jsonb_each_text`
   - ❌ **MANQUE `event_date_id`**

4. **`20250308193140_little_recipe.sql`** (ligne 63)
   - Utilise `jsonb_each_text`
   - ❌ **MANQUE `event_date_id`**

5. **`20250308192500_throbbing_moon.sql`** (ligne 80)
   - Utilise `jsonb_each_text`
   - ❌ **MANQUE `event_date_id`**

6. **`20250120000001_fix_ticket_triggers_for_event_date_id.sql`**
   - ✅ **CORRIGÉ** - Inclut `event_date_id`
   - Mais cette migration peut ne pas être la dernière exécutée

## Problèmes identifiés

### Problème 1: Trigger de base de données
Le trigger `create_tickets_after_order` s'exécute automatiquement après chaque `INSERT` sur `orders`. Si ce trigger est actif, il crée des tickets **sans `event_date_id`**.

**Impact** : Les tickets créés automatiquement par le trigger n'auront pas la bonne date pour les événements multi-dates.

### Problème 2: PayDunya Webhook
Le webhook PayDunya ne passe pas `event_date_id` lors de la création des tickets.

**Impact** : Les paiements PayDunya créent des tickets sans `event_date_id`.

## Solution recommandée

### 1. Mettre à jour la fonction `create_tickets_for_order()`
Créer un script SQL pour mettre à jour la fonction pour inclure `event_date_id` :
- Gérer les deux formats : `jsonb_each_text` et `jsonb_array_elements`
- Inclure `event_date_id` dans l'INSERT des tickets

### 2. Corriger PayDunya Webhook
Ajouter `event_date_id: order.event_date_id || null` dans `paydunya-ipn/index-production.ts`

### 3. Vérifier si le trigger est actif
Le trigger peut être désactivé si les tickets sont créés uniquement via les webhooks. Si le trigger est actif, il doit être corrigé.

## Prochaines étapes

1. ✅ Créer script SQL pour corriger `create_tickets_for_order()`
2. ❌ Corriger PayDunya webhook
3. ❌ Vérifier si le trigger est actif (peut nécessiter une requête SQL directe)

