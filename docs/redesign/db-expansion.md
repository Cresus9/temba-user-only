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

## Page événement (v6)

Relevé du 14 nov. 2026. L’écran s’en tient aux champs déjà lus.

- **Coordonnées de lieu.** Aucun lieu n’a de latitude / longitude fiable. La carte intégrée plaçait des salles de Bobo à Ouagadougou. La page n’affiche plus de tuile : seulement un lien de recherche Google Maps (nom + ville). Un `lat` / `lng` sur `venues` permettrait un plan juste.
- **Horaires d’attraction.** « Ouvert tous les jours » reprend l’heure de `event_dates` quand elle existe. Le créneau 09:00–22:00 du cadre n’est pas inventé s’il n’est pas en base. Des horaires structurés (déjà proposés plus haut) éviteraient de les deviner.
- **Stock à 0.** `ticket_types.quantity = 0` veut dire « pas configuré », pas « complet ». Le panneau n’affiche Complet que si chaque tarif en vente a `quantity > 0` et `available = 0`. Un statut explicite (`unconfigured` / `sold_out`) lèverait l’ambiguïté.
- **Doublons laissés en base.** Malakey « en concert live » et le second Komi non permanent restent. Les rangées les écartent à l’affichage, sans écriture.
- **Nom de lieu.** « Maison de la culture ( BOBO DIOULASSO) » est nettoyé à l’affichage (parenthèse de ville retirée). La valeur en base n’est pas modifiée.
- **Galerie.** Des images existent pour Komi. Cette version de la page ne les montre pas.
- **Descriptions de billets en anglais.** Les textes génériques (« General admission » et similaires) sont masqués. Un libellé français saisi par l’organisateur, y compris « Entrée gratuite », est affiché tel quel, sans badge Gratuit.

## Prix et gratuit

- **`events.is_free` (booléen explicite).** Un `price` à 0, un prix vide, ou des `ticket_types` sans `sales_enabled` ne veulent pas dire que l’entrée est gratuite : souvent les ventes ne sont pas ouvertes. Le site affiche alors « Prix bientôt disponible » et ne montre ni badge Gratuit, ni rangée Gratuit, ni filtre Gratuit. Ces trois éléments restent dans le code derrière `SHOW_FREE_FROM_ZERO_PRICE` (aujourd’hui `false`) et ne s’activeront qu’avec `is_free = true`.

## Organisateurs

- **Grille tarifaire officielle** (commission, options badges / accréditations). Le bloc Tarifs de `/organizers` laisse un emplacement vide et n’affiche aucun taux.

## Contenu de test déjà en base (ne pas supprimer depuis le frontend)

Relevé par l’audit du 13 nov. 2026, laissé en place :

- Annonce Banco National Zoo (texte anglais, lieu incohérent).
- Organisateur listé « Thierry » sans description.
- Doublons d’événements (Malakey) et deux orthographes de la Maison de la Culture.
- Auteur de blog « Afrtix ».

Le libellé public « Sans code pour les tests » sur `/find-tickets` a été retiré de l’interface. Les enregistrements de test n’ont pas été touchés.

## Compte (non affiché tant que la donnée n’existe pas)

- **Favoris / suivre** un artiste, un lieu ou un organisateur. Aucune table publique n’est lue par le site aujourd’hui. Le bouton « Suivre » du design n’est pas affiché.
- **Moyens de paiement enregistrés** au-delà de l’écran déjà branché sur les données existantes de `/profile/payments`. Pas de carte inventée.
- **Sessions / appareils connectés** et « me déconnecter des autres appareils » à la réinitialisation. L’écran `/reset-password` change le mot de passe via le lien Supabase, sans liste d’appareils.
- **Préférence de langue** du compte. L’interface reste en français.
- **Connexion par code SMS** (`signInWithOtp`). Le site garde e-mail ou téléphone **plus mot de passe**. L’onglet SMS du design n’est pas ajouté.
- **Vérification par code à 6 chiffres** saisi dans la page. L’oubli de mot de passe envoie le lien Supabase existant (`resetPasswordForEmail`), pas un écran OTP.
- **Apple Wallet / Google Wallet**. Aucun fichier `.pkpass` ni API Wallet. Le bouton Wallet n’est pas affiché.
- **Type de lieu** (salle, musée, stade…). Le catalogue `/venues` montre le nom, la ville et le nombre de dates, pas une catégorie inventée.
- **Adresse courte officielle** distincte de la chaîne OpenStreetMap (rue, quartier, GPS). L’affichage public dérive « nom · ville » et ne montre jamais les coordonnées. L’itinéraire ouvre la carte sans imprimer la latitude ni la longitude.

