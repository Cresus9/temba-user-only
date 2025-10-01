# Temba

Temba est une plateforme moderne de billetterie d'événements conçue pour le marché africain, permettant une découverte fluide des événements, la réservation de billets et leur gestion.

## Fonctionnalités

- 🎫 Billetterie et gestion d'événements
- 👥 Authentification et profils utilisateurs
- 💳 Traitement sécurisé des paiements (Mobile Money & Carte)
- 📱 Notifications en temps réel
- 💬 Système de support client avec chat en direct
- 📝 Système de gestion de contenu
- 🌍 Support multi-devises (XOF, GHS, USD, EUR, NGN)

## Stack Technique

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase
- **Base de données**: PostgreSQL (via Supabase)
- **Temps réel**: Supabase Realtime
- **Authentification**: Supabase Auth
- **Paiements**: Mobile Money & Traitement de cartes
- **Hébergement**: Netlify

## Démarrage

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

1. Clonez le dépôt:
```bash
git clone https://github.com/Cresus9/Ticket.git
cd Ticket
```

2. Installez les dépendances:
```bash
npm install
```

3. Configurez les variables d'environnement:
Créez un fichier `.env` avec:

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_supabase
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

4. Démarrez le serveur de développement:
```bash
npm run dev
```

## Structure du Projet

```
├── src/
│   ├── components/     # Composants réutilisables
│   ├── context/       # Fournisseurs de contexte React
│   ├── hooks/         # Hooks React personnalisés
│   ├── pages/         # Composants de pages
│   ├── services/      # Services API
│   ├── types/         # Types TypeScript
│   └── utils/         # Fonctions utilitaires
├── public/            # Ressources statiques
├── docs/             # Documentation
└── supabase/         # Migrations et schéma de base de données
```

## Documentation des Fonctionnalités

### Gestion des Événements
- Création et gestion d'événements
- Types de billets multiples
- Disponibilité des billets en temps réel
- Génération de billets avec code QR
- Système de validation des billets

### Fonctionnalités Utilisateur
- Profils utilisateurs et authentification
- Réservation et gestion des billets
- Notifications en temps réel
- Système de tickets de support
- Historique des paiements

## Sécurité

- Politiques RLS Supabase
- Authentification JWT
- Contrôle d'accès basé sur les rôles
- Validation des entrées
- Protection XSS
- Limitation de débit

## Déploiement

L'application est déployée sur Netlify. Les déploiements automatiques sont déclenchés lorsque des modifications sont poussées vers la branche principale.

### Déploiement Manuel

```bash
npm run build
```

Les fichiers compilés seront dans le répertoire `dist`, prêts à être déployés.

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Support

Pour obtenir de l'aide:
- Email: info@tembas.com
- Créez une issue dans le dépôt
- Utilisez le système de chat de support intégré à l'application