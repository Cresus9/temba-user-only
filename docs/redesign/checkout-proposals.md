# Propositions checkout — pas encore appliquées

Écran v6 Paiement, 14 nov. 2026. Le paiement, les montants, les frais, la création de commande et les appels pawaPay / Stripe restent ceux d’aujourd’hui. Les points ci-dessous changeraient le comportement. Ils ne sont pas livrés.

## Coordonnées

Aujourd’hui, un invité qui paie en Mobile Money ne saisit que son nom et le numéro de paiement. La carte demande un e-mail ou un téléphone. Le cadre propose un seul téléphone pour tout le monde, un e-mail facultatif, et le numéro Orange / Moov prérempli depuis ce téléphone. Les champs actuels sont seulement restylés.

## Deux totaux

Le bouton Payer calcule sous-total + frais acheteur + options, comme le formulaire le faisait déjà. La colonne de commande affiche `totals.total` du brouillon plus les options, sans relancer ce calcul. Les deux restent donc indépendants, comme avant. Les aligner demanderait de faire lire à la colonne le même total que le bouton.

## Réservation à 0 FCFA

Le chemin qui crée une réservation sans paiement est inchangé. Le bouton visible dit « Confirmer la réservation ». Le mot « Gratuit » n’est plus affiché sur ce bouton ni sur le prix d’un billet à 0 dans la liste des billets reçus.

## Code Orange

Le code USSD affiché est celui que le code calcule déjà : `*144*4*6*{total}#` sur le formulaire, et `*144*4*6#` sur la page de statut. La formule n’a pas été modifiée.

## Codes promo et crédits

Ils restent dans l’espace compte. Rien n’est ajouté au paiement.
