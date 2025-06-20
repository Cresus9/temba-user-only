import React from 'react';

export default function Privacy() {
  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose prose-indigo max-w-none">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Politique de Confidentialité</h1>
          
          <p className="text-lg text-gray-500 mt-4">Dernière mise à jour : 24 Juillet 2024</p>

          <p>
            Votre vie privée est importante pour nous. Cette Politique de Confidentialité explique comment Temba collecte, utilise et protège vos informations personnelles.
          </p>

          <h2>1. Informations que nous collectons</h2>
          <p>
            Nous collectons les informations que vous nous fournissez lors de la création d'un compte ou de l'achat de billets, telles que votre nom, votre adresse e-mail et vos informations de paiement. Nous collectons également des données sur votre utilisation de notre plateforme.
          </p>
          
          <h2>2. Utilisation de vos informations</h2>
          <p>
            Nous utilisons vos informations pour fournir et améliorer nos services, traiter vos transactions, communiquer avec vous et personnaliser votre expérience. Nous ne partageons pas vos informations personnelles avec des tiers à des fins de marketing sans votre consentement.
          </p>

          <h2>3. Partage avec les Organisateurs</h2>
          <p>
            Lorsque vous achetez un billet, nous partageons les informations nécessaires (telles que votre nom) avec l'organisateur de l'événement pour faciliter votre entrée et à des fins de communication liées à l'événement.
          </p>

          <h2>4. Sécurité des données</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos informations personnelles contre l'accès non autorisé, la divulgation ou la destruction.
          </p>

          <h2>5. Vos droits</h2>
          <p>
            Vous avez le droit d'accéder, de rectifier ou de supprimer vos informations personnelles. Vous pouvez gérer les informations de votre compte directement depuis votre profil ou en nous contactant.
          </p>

          <h2>6. Contact</h2>
          <p>
            Pour toute question concernant cette politique de confidentialité, veuillez nous contacter à <a href="mailto:support@temba.com">support@temba.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}