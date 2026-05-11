import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import LegalShell from '../components/legal/LegalShell';

export default function Privacy() {
  return (
    <LegalShell
      eyebrow="Document légal"
      title="Politique de confidentialité"
      subtitle="Comment Temba collecte, utilise et protège vos données — au quotidien et pour la durée."
      lastUpdated="19 décembre 2024"
      effectiveDate="19 décembre 2024"
      appVersion="1.0.7"
      legalEntity="EZSTAY LLC"
    >
      <div className="callout callout-info">
        <ShieldCheck className="w-5 h-5 text-brand" strokeWidth={2.2} />
        <div>
          <p>
            Vos données vous appartiennent. On ne les vend pas. On ne les
            partage qu'avec les prestataires qui nous permettent de vous livrer
            le service (paiement, validation des billets, hébergement) — listés
            ci-dessous, sans surprise.
          </p>
        </div>
      </div>

      <h2>1. Introduction</h2>
      <p>
        Bienvenue chez Temba (« nous », « notre » ou « nos »). Nous respectons
        votre vie privée et nous nous engageons à protéger vos données
        personnelles. Cette politique explique comment nous collectons,
        utilisons et protégeons vos informations lorsque vous utilisez notre
        site web et notre application mobile.
      </p>

      <h2>2. Informations que nous collectons</h2>
      <h3>2.1 Informations personnelles</h3>
      <ul>
        <li>
          <strong>Compte :</strong> nom, adresse e-mail, numéro de téléphone
          (optionnel)
        </li>
        <li>
          <strong>Profil :</strong> biographie, préférences de localisation,
          image de profil
        </li>
        <li>
          <strong>Contact :</strong> e-mail pour les notifications et le
          support
        </li>
      </ul>

      <h3>2.2 Informations d'utilisation</h3>
      <ul>
        <li>
          <strong>Événements :</strong> préférences, achats de billets,
          historique de participation
        </li>
        <li>
          <strong>Paiement :</strong> traité de manière sécurisée via Stripe.
          Nous ne stockons pas les détails de carte.
        </li>
        <li>
          <strong>Application :</strong> fonctionnalités utilisées,
          préférences, paramètres
        </li>
      </ul>

      <h3>2.3 Informations sur l'appareil</h3>
      <ul>
        <li>
          <strong>Localisation :</strong> coordonnées GPS (avec votre
          consentement) pour les recommandations à proximité
        </li>
        <li>
          <strong>Permissions :</strong> caméra (scan QR), stockage (sauvegarde
          de billets)
        </li>
        <li>
          <strong>Données techniques :</strong> type d'appareil, OS, version de
          l'application
        </li>
      </ul>

      <h2>3. Comment nous utilisons vos informations</h2>
      <h3>3.1 Fourniture de services</h3>
      <ul>
        <li>Traiter les achats de billets et les paiements</li>
        <li>Fournir des recommandations d'événements et des notifications</li>
        <li>Générer et valider les codes QR pour les billets</li>
        <li>Permettre la découverte d'événements basée sur la localisation</li>
      </ul>
      <h3>3.2 Communication</h3>
      <ul>
        <li>Envoyer des mises à jour et des rappels d'événements</li>
        <li>Fournir un support client</li>
        <li>
          Envoyer des communications marketing (avec votre consentement)
        </li>
      </ul>
      <h3>3.3 Amélioration de l'application</h3>
      <ul>
        <li>Analyser les modèles d'utilisation pour améliorer les fonctionnalités</li>
        <li>Corriger les bugs et problèmes techniques</li>
        <li>Développer de nouvelles fonctionnalités et services</li>
      </ul>

      <h2>4. Partage de données et tiers</h2>
      <h3>4.1 Fournisseurs de services</h3>
      <ul>
        <li>
          <strong>Supabase :</strong> hébergement de base de données et
          authentification
        </li>
        <li>
          <strong>Stripe :</strong> traitement sécurisé des paiements
        </li>
        <li>
          <strong>Google Maps :</strong> services de localisation et
          d'itinéraires
        </li>
      </ul>
      <h3>4.2 Exigences légales</h3>
      <p>
        Nous pouvons divulguer vos informations si la loi l'exige ou pour
        protéger nos droits et notre sécurité.
      </p>
      <h3>4.3 Transferts d'entreprise</h3>
      <p>
        En cas de fusion, d'acquisition ou de vente d'actifs, vos informations
        peuvent être transférées.
      </p>

      <h2>5. Sécurité des données</h2>
      <h3>5.1 Mesures de protection</h3>
      <ul>
        <li>Chiffrement des données en transit et au repos</li>
        <li>Authentification sécurisée via Supabase</li>
        <li>Audits de sécurité réguliers et mises à jour</li>
        <li>Contrôles d'accès et authentification</li>
      </ul>
      <h3>5.2 Sécurité des tiers</h3>
      <ul>
        <li>
          <strong>Supabase :</strong> certifié SOC 2 Type II, conforme au RGPD
        </li>
        <li>
          <strong>Stripe :</strong> certifié PCI DSS Level 1, SOC 1 et SOC 2
        </li>
      </ul>

      <h2>6. Vos droits et choix</h2>
      <div className="callout callout-info">
        <Info className="w-5 h-5 text-brand" strokeWidth={2.2} />
        <div>
          <p>
            <strong>À tout moment :</strong> consulter, modifier, exporter ou
            supprimer vos données — depuis votre profil ou en nous écrivant à{' '}
            <a href="mailto:confidentialite@tembas.com">
              confidentialite@tembas.com
            </a>
            .
          </p>
        </div>
      </div>
      <h3>6.1 Accès et contrôle</h3>
      <ul>
        <li>Consulter et mettre à jour vos informations personnelles</li>
        <li>Supprimer votre compte et les données associées</li>
        <li>Se désabonner des communications marketing</li>
        <li>Contrôler les permissions de partage de localisation</li>
      </ul>
      <h3>6.2 Portabilité des données</h3>
      <ul>
        <li>
          Exporter vos données personnelles dans un format lisible par machine
        </li>
        <li>Transférer vos données vers un autre service</li>
      </ul>
      <h3>6.3 Suppression de compte</h3>
      <ul>
        <li>Demander la suppression complète de votre compte et de vos données</li>
        <li>
          Les données seront définitivement supprimées dans les 30 jours
        </li>
      </ul>

      <h2>7. Conservation des données</h2>
      <h3>7.1 Périodes de conservation</h3>
      <ul>
        <li>
          <strong>Compte :</strong> conservées tant que votre compte est actif
        </li>
        <li>
          <strong>Événements :</strong> conservées 2 ans après la fin de
          l'événement
        </li>
        <li>
          <strong>Paiement :</strong> conservées selon les exigences des
          réglementations financières
        </li>
        <li>
          <strong>Analytique :</strong> conservées 1 an sous forme anonymisée
        </li>
      </ul>
      <h3>7.2 Suppression</h3>
      <ul>
        <li>
          Les données sont automatiquement supprimées après les périodes de
          conservation
        </li>
        <li>Vous pouvez demander la suppression immédiate de votre compte</li>
      </ul>

      <h2>8. Protection des enfants</h2>
      <p>
        Notre application n'est pas destinée aux enfants de moins de 13 ans.
        Nous ne collectons pas sciemment d'informations personnelles auprès
        d'enfants de moins de 13 ans. Si vous êtes parent et pensez que votre
        enfant nous a fourni des informations personnelles, contactez-nous.
      </p>

      <h2>9. Transferts internationaux de données</h2>
      <h3>9.1 Stockage des données</h3>
      <ul>
        <li>Les données sont stockées dans une infrastructure cloud sécurisée</li>
        <li>
          Peuvent être transférées vers des pays ayant des lois différentes
        </li>
        <li>Nous assurons une protection adéquate pour les transferts</li>
      </ul>
      <h3>9.2 Conformité RGPD</h3>
      <p>Si vous êtes dans l'Union européenne, vous avez en plus :</p>
      <ul>
        <li>Le droit à l'oubli</li>
        <li>Le droit à la portabilité des données</li>
        <li>Le droit d'opposition au traitement</li>
        <li>Le droit de déposer une plainte auprès des autorités de contrôle</li>
      </ul>

      <h2>10. Modifications de cette politique</h2>
      <p>
        Nous pouvons mettre à jour cette politique de temps à autre. Nous vous
        informerons de tout changement en :
      </p>
      <ul>
        <li>Publiant la nouvelle politique dans l'application</li>
        <li>Vous envoyant une notification par e-mail</li>
        <li>Mettant à jour la date « Dernière mise à jour »</li>
      </ul>

      <h2>11. Informations de contact</h2>
      <dl className="legal-meta">
        <dt>Confidentialité</dt>
        <dd>
          <a href="mailto:confidentialite@tembas.com">
            confidentialite@tembas.com
          </a>
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

      <h2>12. Base légale du traitement (utilisateurs UE)</h2>
      <p>Nous traitons vos données personnelles sur la base de :</p>
      <ul>
        <li>
          <strong>Consentement :</strong> pour les communications marketing et
          les fonctionnalités optionnelles
        </li>
        <li>
          <strong>Contrat :</strong> pour fournir nos services et traiter les
          paiements
        </li>
        <li>
          <strong>Intérêt légitime :</strong> pour améliorer nos services et
          prévenir la fraude
        </li>
        <li>
          <strong>Obligation légale :</strong> pour se conformer aux lois et
          réglementations applicables
        </li>
      </ul>

      <h2>13. Politique relative aux cookies</h2>
      <p>Notre application utilise des cookies et technologies similaires pour :</p>
      <ul>
        <li>Mémoriser vos préférences</li>
        <li>Analyser l'utilisation de l'application</li>
        <li>Fournir du contenu personnalisé</li>
        <li>Assurer la sécurité et la fonctionnalité</li>
      </ul>
      <p>
        Vous pouvez contrôler les paramètres des cookies dans votre navigateur
        ou via les paramètres de votre appareil. Voir aussi notre{' '}
        <a href="/cookies">politique de cookies</a>.
      </p>

      <h2>14. Conformité iOS App Store</h2>
      <h3>14.1 Permissions iOS</h3>
      <ul>
        <li>
          <strong>Caméra :</strong> pour scanner les codes QR de vos billets
        </li>
        <li>
          <strong>Localisation :</strong> pour vous proposer des événements à
          proximité et vous guider
        </li>
        <li>
          <strong>Microphone :</strong> pour les fonctionnalités audio lors
          d'événements virtuels
        </li>
        <li>
          <strong>Galerie photos :</strong> pour télécharger et partager vos
          billets
        </li>
      </ul>
      <h3>14.2 App Tracking Transparency</h3>
      <ul>
        <li>
          Nous respectons les directives d'App Tracking Transparency d'Apple
        </li>
        <li>Nous ne suivons pas votre activité sur d'autres applications</li>
        <li>
          Nous ne partageons pas vos données avec des réseaux publicitaires
        </li>
        <li>
          Vous pouvez contrôler les permissions de suivi dans les paramètres
          iOS
        </li>
      </ul>
      <h3>14.3 App Store Connect</h3>
      <ul>
        <li>Notre application est conforme aux directives de l'App Store</li>
        <li>Nous fournissons des informations de support claires</li>
        <li>Nous maintenons une politique de confidentialité accessible</li>
        <li>Nous répondons aux demandes de suppression de données</li>
      </ul>

      <hr />
      <p>
        <em>
          En utilisant Temba, vous acceptez cette politique de confidentialité.
          Si vous n'êtes pas d'accord, n'utilisez pas notre application.
        </em>
      </p>
    </LegalShell>
  );
}
