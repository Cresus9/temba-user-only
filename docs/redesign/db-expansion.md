# Extensions de base proposées — refonte web

Proposition seulement. Rien n’a été appliqué : pas de migration, pas de DDL, pas d’écriture Supabase.

Le site affiche ce qui existe déjà et masque le reste. Les points ci-dessous débloqueraient les écrans du design qui n’ont pas de champ aujourd’hui.

## Billets

- **Catégorie structurée** sur `ticket_types` (ou équivalent) : `pass` | `vip` | `invite_honneur` | `gratuit` | `multi_jours`. Aujourd’hui le visuel déduit la catégorie du nom et du prix.
- **Validité multi-jours** : dates couvertes, état par jour (scanné / aujourd’hui / à venir). L’UI n’affiche la rangée de jours que si on lui passe une liste.
- **Porte / zone** sur le billet (`gate`, `zone`). Masqué tant que le champ n’existe pas.
- **État « reporté »** et nouvelle date, distincts de l’annulation. Le bandeau « événement reporté » ne s’affiche que si `status = POSTPONED`.
- **Détenteur nominatif** distinct de l’acheteur, si ce n’est pas déjà une colonne de `tickets`. L’UI utilise le nom du profil connecté.
- **Billet à date libre** (valable n’importe quel jour d’ouverture) à côté du billet daté.

## Attractions

- **Horaires structurés** (jour, ouverture, fermeture). Ils sont aujourd’hui recopiés dans la description.
- **Créneaux horaires** fiables dans la réponse publique (le type frontend `time_slots` existe ; l’UI de réservation ne doit pas inventer de créneaux si la RPC n’en renvoie pas).
- **Catégories d’attraction** au-delà de `attraction_type`, si le catalogue doit porter plus que zoo / parc / musée / etc.
- **Options** : flag « inclus dans l’entrée » (ex. piscine chez Komi) pour ne plus dépendre du texte libre.
- **Passes / abonnements** (visite illimitée, saison). Pas de prix inventé en attendant.

## Organisateurs

- **Grille tarifaire officielle** (commission, options badges / accréditations). Le bloc Tarifs de `/organizers` laisse un emplacement vide et n’affiche aucun taux.

## Contenu de test déjà en base (ne pas supprimer depuis le frontend)

Relevé par l’audit du 13 nov. 2026, laissé en place :

- Annonce Banco National Zoo (texte anglais, lieu incohérent).
- Organisateur listé « Thierry » sans description.
- Doublons d’événements (Malakey) et deux orthographes de la Maison de la Culture.
- Auteur de blog « Afrtix ».

Le libellé public « Sans code pour les tests » sur `/find-tickets` a été retiré de l’interface. Les enregistrements de test n’ont pas été touchés.
