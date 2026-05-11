import React from 'react';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';
import LegalShell from '../components/legal/LegalShell';

export default function Terms() {
  return (
    <LegalShell
      eyebrow="Document légal"
      title="Conditions d'utilisation"
      subtitle="Les règles qui encadrent l'utilisation de Temba — la billetterie officielle d'EZSTAY LLC."
      lastUpdated="20 mars 2026"
      effectiveDate="20 mars 2026"
      appVersion="1.0.7"
      legalEntity="EZSTAY LLC"
    >
      {/* Intro callout */}
      <div className="callout callout-info">
        <Info className="w-5 h-5 text-brand" strokeWidth={2.2} />
        <div>
          <p>
            <strong>Temba</strong> est une plateforme officielle de billetterie
            d'événements, éditée par <strong>EZSTAY LLC</strong>. Ces conditions
            s'appliquent au site <a href="https://tembas.com">tembas.com</a> et
            à l'application mobile, disponible sur{' '}
            <a
              href="https://play.google.com/store/apps/details?id=app.rork.temba"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play
            </a>{' '}
            et l'
            <a
              href="https://apps.apple.com/us/app/temba/id6748848506"
              target="_blank"
              rel="noopener noreferrer"
            >
              App Store
            </a>
            .
          </p>
        </div>
      </div>

      <h2>1. Acceptation des conditions</h2>
      <p>
        En téléchargeant, installant ou utilisant Temba (« l'Application »),
        vous acceptez d'être lié par ces conditions d'utilisation (« les
        Conditions »). Si vous n'acceptez pas ces Conditions, n'utilisez pas
        l'Application.
      </p>

      <h2>2. Description du service</h2>
      <p>Temba permet aux utilisateurs de :</p>
      <ul>
        <li>Découvrir et parcourir des événements</li>
        <li>Acheter des billets pour des événements</li>
        <li>Gérer des billets numériques avec des codes QR</li>
        <li>Recevoir des notifications et des mises à jour d'événements</li>
        <li>Accéder à des recommandations basées sur la localisation</li>
      </ul>

      <h2>3. Comptes utilisateur</h2>
      <h3>3.1 Création de compte</h3>
      <ul>
        <li>
          Vous devez fournir des informations exactes et complètes lors de la
          création d'un compte
        </li>
        <li>
          Vous êtes responsable de maintenir la confidentialité de vos
          identifiants
        </li>
        <li>Vous devez avoir au moins 13 ans pour créer un compte</li>
      </ul>
      <h3>3.2 Responsabilités du compte</h3>
      <ul>
        <li>
          Vous êtes responsable de toutes les activités effectuées sous votre
          compte
        </li>
        <li>
          Vous devez nous notifier immédiatement de toute utilisation non
          autorisée
        </li>
        <li>Vous ne pouvez pas partager vos identifiants avec d'autres</li>
      </ul>

      <h2>4. Politique de revente de billets</h2>

      <div className="callout callout-danger">
        <ShieldAlert className="w-5 h-5" strokeWidth={2.2} />
        <div>
          <p>
            <strong>Revente de billets strictement interdite.</strong> Temba
            est une plateforme de vente <em>primaire</em> uniquement. Toute
            tentative de revente entraîne l'annulation immédiate des billets et
            la suspension du compte.
          </p>
        </div>
      </div>

      <h3>4.1 Vente primaire uniquement</h3>
      <p>
        <strong>Temba est une plateforme de vente primaire.</strong> Nous
        vendons exclusivement des billets directement auprès des organisateurs
        officiels. Temba n'est <strong>pas</strong> une plateforme de revente.
      </p>

      <h3>4.2 Interdictions</h3>
      <p>Il est strictement interdit de :</p>
      <ul>
        <li>
          <strong>Revendre</strong> des billets achetés via Temba à un prix
          supérieur au prix d'achat original
        </li>
        <li>
          Utiliser Temba pour acheter des billets dans le but de les revendre
          (scalping)
        </li>
        <li>
          Transférer des billets à des fins commerciales ou lucratives
        </li>
        <li>Publier des billets Temba sur des plateformes tierces de revente</li>
        <li>Acheter des billets en masse pour revente ultérieure</li>
      </ul>

      <h3>4.3 Sanctions</h3>
      <p>Toute violation de cette politique entraînera :</p>
      <ul>
        <li>
          <strong>Annulation immédiate</strong> des billets concernés sans
          remboursement
        </li>
        <li>
          <strong>Suspension ou suppression permanente</strong> du compte
          utilisateur
        </li>
        <li>Interdiction d'accès à la plateforme Temba</li>
        <li>Poursuites judiciaires si nécessaire</li>
      </ul>

      <h3>4.4 Transfert légitime</h3>
      <p>
        Temba autorise le <strong>transfert gratuit</strong> entre amis et
        famille via la fonctionnalité intégrée. Ce transfert doit être :
      </p>
      <ul>
        <li>Gratuit (sans échange d'argent)</li>
        <li>Effectué uniquement via l'application Temba</li>
        <li>Pour un usage personnel, non commercial</li>
      </ul>

      <h2>5. Utilisation acceptable</h2>
      <h3>5.1 Utilisations autorisées</h3>
      <ul>
        <li>Utiliser l'Application pour son usage prévu</li>
        <li>Acheter des billets pour des événements légitimes</li>
        <li>Partager des informations d'événements avec des proches</li>
        <li>Transférer gratuitement des billets via la fonctionnalité prévue</li>
        <li>Fournir des commentaires et suggestions</li>
      </ul>
      <h3>5.2 Utilisations interdites</h3>
      <p>Vous ne pouvez pas :</p>
      <ul>
        <li>Utiliser l'Application à des fins illégales ou non autorisées</li>
        <li>Tenter d'accéder sans autorisation à nos systèmes</li>
        <li>Interférer avec ou perturber l'Application</li>
        <li>Créer de faux comptes ou fournir de fausses informations</li>
        <li>
          <strong>Revendre des billets achetés via l'Application</strong>
        </li>
        <li>Utiliser des systèmes automatisés pour accéder à l'Application</li>
        <li>Violer toute loi ou réglementation applicable</li>
      </ul>

      <h2>6. Paiement et remboursements</h2>
      <h3>6.1 Traitement des paiements</h3>
      <ul>
        <li>Tous les paiements sont traités de manière sécurisée via Stripe</li>
        <li>Les prix sont affichés en devise locale</li>
        <li>Des frais de service peuvent s'appliquer aux achats de billets</li>
        <li>Les informations de paiement sont chiffrées et sécurisées</li>
      </ul>
      <h3>6.2 Politique de remboursement</h3>
      <ul>
        <li>
          Les remboursements sont soumis à la politique de l'organisateur
        </li>
        <li>Les frais de service ne sont généralement pas remboursables</li>
        <li>Contactez le support pour les demandes de remboursement</li>
        <li>Les remboursements peuvent prendre 5 à 10 jours ouvrables</li>
      </ul>

      <h2>7. Informations sur les événements</h2>
      <h3>7.1 Exactitude</h3>
      <ul>
        <li>Nous nous efforçons de fournir des informations exactes</li>
        <li>Les détails des événements peuvent changer sans préavis</li>
        <li>
          Nous ne sommes pas responsables des annulations ou changements
        </li>
        <li>Vérifiez toujours les détails avec l'organisateur</li>
      </ul>
      <h3>7.2 Organisateurs d'événements</h3>
      <ul>
        <li>Les événements sont créés et gérés par des organisateurs tiers</li>
        <li>Nous n'approuvons ni ne garantissons aucun événement</li>
        <li>Les organisateurs sont responsables de leurs événements</li>
        <li>Nous ne sommes pas responsables des problèmes liés aux événements</li>
      </ul>

      <h2>8. Propriété intellectuelle</h2>
      <h3>8.1 Nos droits</h3>
      <ul>
        <li>L'Application et son contenu nous appartiennent</li>
        <li>Toutes les marques, logos et marques sont notre propriété</li>
        <li>Vous ne pouvez pas copier, modifier ou distribuer notre contenu</li>
      </ul>
      <h3>8.2 Vos droits</h3>
      <ul>
        <li>Vous conservez la propriété du contenu que vous créez</li>
        <li>
          Vous nous accordez une licence pour utiliser votre contenu pour la
          fourniture de services
        </li>
        <li>
          Vous ne pouvez pas téléverser du matériel protégé sans autorisation
        </li>
      </ul>

      <h2>9. Confidentialité et données</h2>
      <h3>9.1 Collecte de données</h3>
      <ul>
        <li>
          Nous collectons et traitons les données comme décrit dans notre{' '}
          <a href="/privacy">politique de confidentialité</a>
        </li>
        <li>
          En utilisant l'Application, vous consentez à nos pratiques en matière
          de données
        </li>
        <li>Nous mettons en œuvre des mesures de sécurité appropriées</li>
      </ul>
      <h3>9.2 Partage de données</h3>
      <ul>
        <li>
          Nous pouvons partager des données avec les organisateurs pour la
          validation des billets
        </li>
        <li>
          Nous pouvons partager des données avec les processeurs de paiement
        </li>
        <li>
          Nous ne vendons pas vos informations personnelles à des tiers
        </li>
      </ul>

      <h2>10. Limitations de responsabilité</h2>
      <h3>10.1 Disponibilité du service</h3>
      <ul>
        <li>
          Nous nous efforçons de maintenir la disponibilité du service mais ne
          pouvons pas la garantir
        </li>
        <li>
          L'Application peut être temporairement indisponible pour maintenance
        </li>
        <li>Nous ne sommes pas responsables des interruptions de service</li>
      </ul>
      <h3>10.2 Responsabilité des événements</h3>
      <ul>
        <li>
          Nous ne sommes pas responsables de la qualité ou de la sécurité des
          événements
        </li>
        <li>
          Nous ne garantissons pas la participation ou la satisfaction
        </li>
        <li>Les organisateurs sont responsables de leurs événements</li>
      </ul>
      <h3>10.3 Limitation</h3>
      <ul>
        <li>
          Notre responsabilité est limitée au montant que vous avez payé pour
          les billets
        </li>
        <li>
          Nous ne sommes pas responsables des dommages indirects, accessoires
          ou consécutifs
        </li>
        <li>
          Certaines juridictions n'autorisent pas les limitations de
          responsabilité
        </li>
      </ul>

      <h2>11. Résiliation</h2>
      <h3>11.1 Résiliation de compte</h3>
      <ul>
        <li>Vous pouvez supprimer votre compte à tout moment</li>
        <li>Nous pouvons résilier les comptes pour violations des Conditions</li>
        <li>
          La résiliation de compte n'affecte pas les transactions terminées
        </li>
      </ul>
      <h3>11.2 Résiliation du service</h3>
      <ul>
        <li>Nous pouvons arrêter l'Application avec un préavis raisonnable</li>
        <li>
          Nous fournirons des remboursements pour les billets inutilisés si
          possible
        </li>
        <li>Ces Conditions restent en vigueur jusqu'à la résiliation</li>
      </ul>

      <h2>12. Modifications des conditions</h2>
      <div className="callout callout-warning">
        <AlertTriangle
          className="w-5 h-5 text-accent-700"
          strokeWidth={2.2}
        />
        <div>
          <p>
            Nous pouvons mettre à jour ces Conditions de temps à autre. Les
            changements importants vous seront notifiés. L'utilisation continue
            constitue l'acceptation des nouvelles Conditions.
          </p>
        </div>
      </div>
      <ul>
        <li>Les changements seront publiés dans l'Application</li>
        <li>
          Nous pouvons envoyer des notifications par e-mail pour les
          changements majeurs
        </li>
        <li>
          Vérifiez la date « Mise à jour » pour connaître la version actuelle
        </li>
      </ul>

      <h2>13. Droit applicable</h2>
      <h3>13.1 Juridiction</h3>
      <ul>
        <li>Ces Conditions sont régies par les lois du Sénégal</li>
        <li>Les litiges seront résolus dans les tribunaux du Sénégal</li>
        <li>Les utilisateurs internationaux sont soumis aux lois locales</li>
      </ul>
      <h3>13.2 Résolution des litiges</h3>
      <ul>
        <li>Nous encourageons la résolution informelle des litiges</li>
        <li>L'action en justice doit être un dernier recours</li>
        <li>Certains litiges peuvent nécessiter un arbitrage</li>
      </ul>

      <h2>14. Informations de contact</h2>
      <p>Pour toute question concernant ces Conditions :</p>
      <dl className="legal-meta">
        <dt>Entreprise</dt>
        <dd>EZSTAY LLC</dd>
        <dt>Email général</dt>
        <dd>
          <a href="mailto:info@tembas.com">info@tembas.com</a>
        </dd>
        <dt>Support</dt>
        <dd>
          <a href="mailto:support@tembas.com">support@tembas.com</a>
        </dd>
        <dt>Téléphone</dt>
        <dd>+226 74 75 08 15</dd>
        <dt>Adresse</dt>
        <dd>
          Secteur 23, Zone 1, Section KC, Parcelle 09-10 — Ouagadougou,
          Burkina Faso
        </dd>
      </dl>

      <h2>15. Divisibilité</h2>
      <p>
        Si une disposition de ces Conditions est jugée inapplicable, les
        dispositions restantes resteront en vigueur. La disposition
        inapplicable sera modifiée dans la mesure minimale nécessaire pour la
        rendre applicable.
      </p>

      <h2>16. Accord complet</h2>
      <p>
        Ces Conditions, ainsi que notre{' '}
        <a href="/privacy">politique de confidentialité</a>, constituent
        l'accord complet entre vous et nous concernant l'Application. Tout
        accord ou compréhension antérieur est remplacé.
      </p>

      <hr />
      <p>
        <em>
          En utilisant Temba, vous reconnaissez avoir lu, compris et accepté
          ces conditions d'utilisation.
        </em>
      </p>
    </LegalShell>
  );
}
