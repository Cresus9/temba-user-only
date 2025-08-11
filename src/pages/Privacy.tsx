import React from 'react';

export default function Privacy() {
  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose prose-indigo max-w-none">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Politique de Confidentialité - Application TEMBA</h1>
          
          <p className="text-lg text-gray-500 mt-4">
            <strong>Dernière mise à jour :</strong> 19 décembre 2024<br />
            <strong>Version de l'application :</strong> 1.0.7<br />
            <strong>Date d'effet :</strong> 19 décembre 2024
          </p>

          <h2>1. Introduction</h2>
          <p>
            Bienvenue chez TEMBA ("nous," "notre," ou "nos"). Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre application mobile TEMBA.
          </p>

          <h2>2. Informations que nous collectons</h2>
          
          <h3>2.1 Informations personnelles</h3>
          <ul>
            <li><strong>Informations de compte :</strong> Nom, adresse e-mail, numéro de téléphone (optionnel)</li>
            <li><strong>Données de profil :</strong> Biographie, préférences de localisation, image de profil</li>
            <li><strong>Informations de contact :</strong> E-mail pour les notifications et le support</li>
          </ul>

          <h3>2.2 Informations d'utilisation</h3>
          <ul>
            <li><strong>Données d'événements :</strong> Préférences d'événements, achats de billets, historique de participation</li>
            <li><strong>Informations de paiement :</strong> Traitées de manière sécurisée via Stripe (nous ne stockons pas les détails de paiement)</li>
            <li><strong>Utilisation de l'application :</strong> Utilisation des fonctionnalités, préférences, paramètres</li>
          </ul>

          <h3>2.3 Informations sur l'appareil</h3>
          <ul>
            <li><strong>Données de localisation :</strong> Coordonnées GPS (avec votre consentement) pour les recommandations d'événements à proximité</li>
            <li><strong>Permissions de l'appareil :</strong> Caméra (scan de codes QR), stockage (sauvegarde de billets)</li>
            <li><strong>Données techniques :</strong> Type d'appareil, système d'exploitation, version de l'application</li>
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
            <li>Envoyer des communications marketing (avec votre consentement)</li>
          </ul>

          <h3>3.3 Amélioration de l'application</h3>
          <ul>
            <li>Analyser les modèles d'utilisation pour améliorer les fonctionnalités</li>
            <li>Corriger les bugs et les problèmes techniques</li>
            <li>Développer de nouvelles fonctionnalités et services</li>
          </ul>

          <h2>4. Partage de données et tiers</h2>
          
          <h3>4.1 Fournisseurs de services</h3>
          <ul>
            <li><strong>Supabase :</strong> Services d'hébergement de base de données et d'authentification</li>
            <li><strong>Stripe :</strong> Traitement sécurisé des paiements</li>
            <li><strong>Google Maps :</strong> Services de localisation et d'itinéraires</li>
          </ul>

          <h3>4.2 Exigences légales</h3>
          <p>Nous pouvons divulguer vos informations si la loi l'exige ou pour protéger nos droits et notre sécurité.</p>

          <h3>4.3 Transferts d'entreprise</h3>
          <p>En cas de fusion, d'acquisition ou de vente d'actifs, vos informations peuvent être transférées.</p>

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
            <li><strong>Supabase :</strong> Certifié SOC 2 Type II, conforme au RGPD</li>
            <li><strong>Stripe :</strong> Certifié PCI DSS Level 1, SOC 1 et SOC 2</li>
          </ul>

          <h2>6. Vos droits et choix</h2>
          
          <h3>6.1 Accès et contrôle</h3>
          <ul>
            <li>Consulter et mettre à jour vos informations personnelles</li>
            <li>Supprimer votre compte et les données associées</li>
            <li>Se désabonner des communications marketing</li>
            <li>Contrôler les permissions de partage de localisation</li>
          </ul>

          <h3>6.2 Portabilité des données</h3>
          <ul>
            <li>Exporter vos données personnelles dans un format lisible par machine</li>
            <li>Transférer vos données vers un autre service</li>
          </ul>

          <h3>6.3 Suppression de compte</h3>
          <ul>
            <li>Demander la suppression complète de votre compte et de vos données</li>
            <li>Les données seront définitivement supprimées dans les 30 jours</li>
          </ul>

          <h2>7. Conservation des données</h2>
          
          <h3>7.1 Périodes de conservation</h3>
          <ul>
            <li><strong>Données de compte :</strong> Conservées tant que votre compte est actif</li>
            <li><strong>Données d'événements :</strong> Conservées pendant 2 ans après la fin de l'événement</li>
            <li><strong>Données de paiement :</strong> Conservées selon les exigences des réglementations financières</li>
            <li><strong>Données d'analyse :</strong> Conservées pendant 1 an sous forme anonymisée</li>
          </ul>

          <h3>7.2 Suppression</h3>
          <ul>
            <li>Les données sont automatiquement supprimées après les périodes de conservation</li>
            <li>Vous pouvez demander la suppression immédiate de votre compte</li>
          </ul>

          <h2>8. Protection des enfants</h2>
          <p>
            Notre application n'est pas destinée aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d'informations personnelles auprès d'enfants de moins de 13 ans. Si vous êtes un parent et que vous pensez que votre enfant nous a fourni des informations personnelles, veuillez nous contacter.
          </p>

          <h2>9. Transferts internationaux de données</h2>
          
          <h3>9.1 Stockage des données</h3>
          <ul>
            <li>Les données sont stockées dans une infrastructure cloud sécurisée</li>
            <li>Peuvent être transférées vers des pays ayant des lois différentes sur la confidentialité</li>
            <li>Nous assurons une protection adéquate pour les transferts internationaux</li>
          </ul>

          <h3>9.2 Conformité RGPD</h3>
          <p>Si vous êtes dans l'Union européenne, vous avez des droits supplémentaires selon le RGPD :</p>
          <ul>
            <li>Droit à l'oubli</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition au traitement</li>
            <li>Droit de déposer une plainte auprès des autorités de contrôle</li>
          </ul>

          <h2>10. Modifications de cette politique</h2>
          <p>Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement en :</p>
          <ul>
            <li>Publiant la nouvelle politique dans l'application</li>
            <li>Vous envoyant une notification par e-mail</li>
            <li>Mettant à jour la date "Dernière mise à jour"</li>
          </ul>

          <h2>11. Informations de contact</h2>
          <p>Si vous avez des questions sur cette politique de confidentialité ou nos pratiques en matière de données, veuillez nous contacter :</p>
          <ul>
            <li><strong>E-mail :</strong> <a href="mailto:confidentialite@temba.app">confidentialite@temba.app</a></li>
            <li><strong>E-mail de support :</strong> <a href="mailto:support@temba.app">support@temba.app</a></li>
            <li><strong>Téléphone :</strong> +221777889900</li>
          </ul>

          <h2>12. Base légale du traitement (Utilisateurs UE)</h2>
          <p>Nous traitons vos données personnelles sur la base de :</p>
          <ul>
            <li><strong>Consentement :</strong> Pour les communications marketing et les fonctionnalités optionnelles</li>
            <li><strong>Contrat :</strong> Pour fournir nos services et traiter les paiements</li>
            <li><strong>Intérêt légitime :</strong> Pour améliorer nos services et prévenir la fraude</li>
            <li><strong>Obligation légale :</strong> Pour se conformer aux lois et réglementations applicables</li>
          </ul>

          <h2>13. Politique relative aux cookies</h2>
          <p>Notre application peut utiliser des cookies et des technologies similaires pour :</p>
          <ul>
            <li>Mémoriser vos préférences</li>
            <li>Analyser l'utilisation de l'application</li>
            <li>Fournir du contenu personnalisé</li>
            <li>Assurer la sécurité et la fonctionnalité</li>
          </ul>
          <p>Vous pouvez contrôler les paramètres des cookies via les paramètres de votre appareil.</p>

          <hr className="my-8" />
          
          <p className="text-sm text-gray-600 italic">
            <strong>En utilisant TEMBA, vous acceptez cette politique de confidentialité. Si vous n'êtes pas d'accord, veuillez ne pas utiliser notre application.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
