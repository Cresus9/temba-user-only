import React from 'react';
import { Cookie } from 'lucide-react';
import LegalShell from '../components/legal/LegalShell';

export default function Cookies() {
  return (
    <LegalShell
      eyebrow="Document légal"
      title="Politique de cookies"
      subtitle="Ce que nous stockons côté navigateur, pourquoi, et comment vous gardez la main."
      lastUpdated="24 juillet 2024"
      legalEntity="EZSTAY LLC"
    >
      <div className="callout callout-info">
        <Cookie className="w-5 h-5 text-brand" strokeWidth={2.2} />
        <div>
          <p>
            Les cookies que Temba utilise servent à <strong>vous garder
            connecté</strong>, à <strong>retenir vos préférences</strong> et à{' '}
            <strong>améliorer le service</strong>. Pas de profilage publicitaire
            tiers — pas de revente.
          </p>
        </div>
      </div>

      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Les cookies sont de petits fichiers texte stockés sur votre ordinateur
        ou appareil mobile lorsque vous visitez notre site web. Ils nous aident
        à améliorer le fonctionnement du site et la qualité de nos services.
      </p>

      <h2>2. Comment nous utilisons les cookies</h2>
      <p>Nous utilisons les cookies pour plusieurs raisons :</p>
      <ul>
        <li>
          <strong>Cookies essentiels :</strong> nécessaires au fonctionnement
          du site (connexion, panier, sécurité)
        </li>
        <li>
          <strong>Cookies d'authentification :</strong> pour vous maintenir
          connecté entre les sessions
        </li>
        <li>
          <strong>Cookies de préférence :</strong> pour mémoriser vos
          paramètres (langue, thème, devise)
        </li>
        <li>
          <strong>Cookies d'analyse :</strong> pour comprendre comment les
          visiteurs utilisent le site et l'améliorer
        </li>
      </ul>

      <h2>3. Types de cookies utilisés</h2>
      <h3>3.1 Cookies essentiels</h3>
      <p>
        Ces cookies sont nécessaires au bon fonctionnement du site. Ils
        activent des fonctionnalités de base comme la sécurité, la gestion du
        réseau et l'accessibilité. Ils ne peuvent pas être désactivés depuis
        nos systèmes.
      </p>
      <h3>3.2 Cookies d'analyse</h3>
      <p>
        Nous utilisons des cookies d'analyse pour comprendre comment les
        visiteurs interagissent avec notre site, ce qui nous aide à améliorer
        nos services. Les données collectées sont agrégées et anonymisées.
      </p>

      <h2>4. Gestion des cookies</h2>
      <p>
        La plupart des navigateurs vous permettent de contrôler les cookies via
        leurs paramètres. Cependant, restreindre les cookies peut affecter
        votre expérience sur notre site.
      </p>
      <ul>
        <li>
          <strong>Chrome :</strong> Paramètres → Confidentialité et sécurité →
          Cookies
        </li>
        <li>
          <strong>Safari :</strong> Réglages → Confidentialité → Gérer les
          données du site web
        </li>
        <li>
          <strong>Firefox :</strong> Paramètres → Vie privée et sécurité →
          Cookies et données de site
        </li>
        <li>
          <strong>Edge :</strong> Paramètres → Cookies et autorisations de
          site
        </li>
      </ul>

      <h2>5. Mises à jour de cette politique</h2>
      <p>
        Nous pouvons mettre à jour cette politique de cookies de temps à autre.
        Toute modification sera publiée sur cette page avec une date de
        révision mise à jour.
      </p>

      <h2>6. Contact</h2>
      <p>
        Si vous avez des questions sur notre politique de cookies, écrivez-nous
        à <a href="mailto:info@tembas.com">info@tembas.com</a>.
      </p>
      <p>
        Pour en savoir plus sur la façon dont nous traitons vos données,
        consultez notre{' '}
        <a href="/privacy">politique de confidentialité</a>.
      </p>
    </LegalShell>
  );
}
