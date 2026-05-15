import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import LegalShell from '../components/legal/LegalShell';
import PageSEO from '../components/SEO/PageSEO';

export default function Privacy() {
  return (
    <>
    <PageSEO
      title="Politique de confidentialité · Privacy"
      description="Politique de confidentialité Temba (site web, application mobile et Temba Scanner) : données collectées, finalités, droits et conservation."
      canonicalUrl="https://tembas.com/privacy"
    />
    <LegalShell
      eyebrow="Document légal"
      title="Politique de confidentialité"
      subtitle="Site web, application Temba (grand public) et Temba Scanner (contrôle d'accès) : même engagement sur vos données."
      lastUpdated="15 mai 2026"
      effectiveDate="15 mai 2026"
      appVersion="1.0.7"
      legalEntity="EZSTAY LLC"
    >
      <div className="callout callout-info">
        <ShieldCheck className="w-5 h-5 text-brand" strokeWidth={2.2} />
        <div>
          <p>
            Vos données vous appartiennent. On ne les vend pas. On ne les
            partage qu'avec les prestataires qui nous permettent de vous livrer
            le service (paiement, validation des billets, contrôle d&apos;accès
            via Temba Scanner, hébergement) — listés ci-dessous, sans surprise.
          </p>
        </div>
      </div>

      <h2>1. Introduction</h2>
      <p>
        Bienvenue chez Temba (« nous », « notre » ou « nos »). Nous respectons
        votre vie privée et nous nous engageons à protéger vos données
        personnelles. Cette politique explique comment nous collectons,
        utilisons et protégeons vos informations lorsque vous utilisez notre
        site web, notre application mobile grand public et l&apos;application{' '}
        <strong>Temba Scanner</strong> (contrôle d&apos;accès pour les équipes
        organisateur / scanneur).
      </p>

      <h2>2. Informations que nous collectons</h2>
      <h3>2.1 Informations personnelles</h3>
      <ul>
        <li>
          <strong>Compte :</strong> nom, adresse e-mail, numéro de téléphone
          (optionnel) ; pour les comptes avec rôle{' '}
          <strong>organisateur / scanneur</strong>, les informations
          d&apos;organisation ou d&apos;équipe liées à votre accès (y compris
          dans Temba Scanner)
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
        <li>
          <strong>Temba Scanner :</strong> événements et sessions auxquels vous
          êtes autorisé, actions de contrôle (scans, refus, recherches
          manuelles le cas échéant), horodatages associés
        </li>
      </ul>

      <h3>2.3 Informations sur l'appareil</h3>
      <ul>
        <li>
          <strong>Localisation :</strong> coordonnées GPS (avec votre
          consentement) pour les recommandations à proximité sur l&apos;app
          grand public ; Temba Scanner peut traiter des libellés de lieu ou
          points de contrôle fournis par l&apos;organisateur sans nécessiter
          le GPS selon la configuration
        </li>
        <li>
          <strong>Permissions :</strong> caméra (lecture de codes QR), stockage
          (sauvegarde de billets sur l&apos;app grand public) ; Temba Scanner
          utilise en principe la <strong>caméra</strong> et une{' '}
          <strong>connexion réseau</strong> pour la validation côté serveur
        </li>
        <li>
          <strong>Données techniques :</strong> type d'appareil, OS, version de
          l'application
        </li>
      </ul>

      <h3>2.4 Application Temba Scanner (contrôle d&apos;accès)</h3>
      <p>
        Si vous utilisez Temba Scanner pour valider des billets à l&apos;entrée
        d&apos;un événement, nous traitons notamment :
      </p>
      <ul>
        <li>
          <strong>Compte opérateur :</strong> identifiant de connexion, nom ou
          libellé affiché, coordonnées associées au compte (e-mail ou téléphone
          selon la méthode d&apos;inscription).
        </li>
        <li>
          <strong>Caméra :</strong> utilisée pour lire le code QR du billet ; le
          traitement vise à décoder le billet et vérifier son statut auprès de
          nos serveurs.
        </li>
        <li>
          <strong>Activité de scan :</strong> résultat du contrôle (entrée
          autorisée ou refus), horodatage, billet ou jeton concerné, identifiant
          de l&apos;opérateur lorsque disponible, et informations de point de
          contrôle si votre organisation les configure.
        </li>
      </ul>

      <h2>3. Comment nous utilisons vos informations</h2>
      <h3>3.1 Fourniture de services</h3>
      <ul>
        <li>Traiter les achats de billets et les paiements</li>
        <li>Fournir des recommandations d'événements et des notifications</li>
        <li>Générer et valider les codes QR pour les billets</li>
        <li>
          Permettre le contrôle d&apos;accès sur place via Temba Scanner
          (validation côté serveur, journalisation anti-fraude)
        </li>
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
      <h3>3.4 Sécurité des événements (Temba Scanner)</h3>
      <ul>
        <li>
          Détecter les usages frauduleux ou les tentatives de contournement des
          règles d&apos;entrée
        </li>
        <li>
          Fournir des journaux d&apos;audit exploitables par l&apos;organisateur
          et, le cas échéant, par les autorités compétentes
        </li>
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
      <p>
        Pour le contrôle d&apos;accès, certaines données de scan et
        d&apos;identification d&apos;opérateur peuvent être mises à disposition
        des <strong>organisateurs d&apos;événements</strong> et de leurs équipes
        habilitées, dans la limite nécessaire à la sécurité de l&apos;événement
        et au traitement des litiges liés aux billets.
      </p>
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
      <h3>6.4 Données liées au contrôle d&apos;accès (Temba Scanner)</h3>
      <p>
        Les journaux de validation peuvent concerner des tiers (porteurs de
        billets). Pour toute demande portant sur ces traitements (accès,
        rectification, opposition dans les limites légales), vous pouvez nous
        écrire à{' '}
        <a href="mailto:confidentialite@tembas.com">confidentialite@tembas.com</a>
        ; nous traiterons votre demande conformément au droit applicable et, le
        cas échéant, en coordination avec l&apos;organisateur concerné.
      </p>

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
        <li>
          <strong>Contrôle d&apos;accès (Temba Scanner) :</strong> journaux de
          validation conservés le temps nécessaire au bon déroulement de
          l&apos;événement, à la prévention de la fraude et aux obligations
          légales ou comptables applicables.
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
        Les applications Temba grand public ne sont pas destinées aux enfants
        de moins de 13 ans. Nous ne collectons pas sciemment d&apos;informations
        personnelles auprès d&apos;enfants de moins de 13 ans. Si vous êtes
        parent et pensez que votre enfant nous a fourni des informations
        personnelles, contactez-nous.
      </p>
      <p>
        <strong>Temba Scanner</strong> s&apos;adresse aux personnes habilitées
        par un organisateur (contrôle d&apos;accès professionnel) ; elle n&apos;est
        pas conçue comme un service destiné aux mineurs. Pour l&apos;Espace
        économique européen, nous ne ciblons pas les mineurs de moins de 16 ans
        à des fins de traitement autonome de leurs données dans cette
        application.
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
          paiements ; pour Temba Scanner, l&apos;exécution des mesures
          précontractuelles ou contractuelles avec l&apos;organisateur et
          l&apos;accès sécurisé aux événements
        </li>
        <li>
          <strong>Intérêt légitime :</strong> pour améliorer nos services et
          prévenir la fraude ; pour Temba Scanner, sécurité des événements,
          intégrité des billets et journalisation proportionnée
        </li>
        <li>
          <strong>Obligation légale :</strong> pour se conformer aux lois et
          réglementations applicables
        </li>
      </ul>

      <h2>13. Politique relative aux cookies</h2>
      <p>
        Le site <strong>tembas.com</strong> et les pages légales ouvertes dans
        le navigateur ou dans une <strong>vue intégrée</strong> (WebView)
        depuis l&apos;application Temba ou <strong>Temba Scanner</strong>{' '}
        peuvent déposer des cookies ou stockages locaux similaires. Ils servent
        notamment à :
      </p>
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
          <strong>Caméra :</strong> pour lire les codes QR (billets sur l&apos;app
          grand public ; validation d&apos;entrée dans Temba Scanner)
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

      <h3>14.4 Android et Google Play (dont Temba Scanner)</h3>
      <ul>
        <li>
          Les applications distribuées sur Google Play (y compris{' '}
          <strong>Temba Scanner</strong>) déclarent les autorisations et
          pratiques de données conformément au formulaire « Sécurité des
          données » (Data safety) ; celui-ci doit être cohérent avec cette
          politique et le fonctionnement réel des applis.
        </li>
        <li>
          <strong>Réseau :</strong> une connexion Internet est en principe
          nécessaire pour authentifier les opérateurs et valider les billets en
          temps réel.
        </li>
        <li>
          <strong>Caméra :</strong> utilisée pour la lecture des codes QR à
          l&apos;entrée ; les traitements décrits en section 2.4 s&apos;appliquent.
        </li>
        <li>
          La politique de confidentialité à communiquer dans la fiche Play est
          celle publiée à l&apos;adresse{' '}
          <a href="https://tembas.com/privacy">https://tembas.com/privacy</a>{' '}
          (page dédiée, distincte des conditions générales et de la politique
          cookies).
        </li>
      </ul>

      <h2>15. Documents connexes</h2>
      <p>
        <a href="/terms">Conditions d&apos;utilisation</a>
        {' · '}
        <a href="/cookies">Politique de cookies</a>
      </p>

      <hr />
      <p>
        <em>
          En utilisant Temba (y compris Temba Scanner), vous acceptez cette
          politique de confidentialité. Si vous n&apos;êtes pas d&apos;accord,
          n&apos;utilisez pas nos services ou applications.
        </em>
      </p>
    </LegalShell>
    </>
  );
}
