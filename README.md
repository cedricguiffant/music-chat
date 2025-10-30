# 🎵 Music DJ Chat

Une application de chat musical en temps réel inspirée de Spotify, où plusieurs personnes peuvent chatter et une personne (le DJ) peut contrôler la musique.

## ✨ Fonctionnalités

- 💬 Chat en temps réel via Socket.IO
- 🎧 Lecteur de musique intégré (YouTube et MP3)
- 🎛️ Système de rôle DJ avec bouton de demande
- 🎨 Interface moderne inspirée de Spotify
- 🔄 Synchronisation automatique entre tous les utilisateurs

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Configuration de la base de données

```bash
# Définir l'URL de la base de données
$env:DATABASE_URL="file:./prisma/dev.db"

# Initialiser et synchroniser Prisma
npx prisma db push
```

### Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🎮 Utilisation

1. **Discuter** : Écrivez votre message et appuyez sur Entrée pour envoyer
2. **Devenir DJ** : Cliquez sur le "Bouton DJ" pour prendre le contrôle de la musique
3. **Changer la musique** : En tant que DJ, collez une URL YouTube ou MP3 et cliquez sur "Changer la musique"

## 🛠️ Technologies

- [Next.js 16](https://nextjs.org/) - Framework React
- [Socket.IO](https://socket.io/) - Communication en temps réel
- [Prisma](https://www.prisma.io/) - ORM et base de données
- [TypeScript](https://www.typescriptlang.org/) - Typage statique
- [Tailwind CSS](https://tailwindcss.com/) - Styles

## 📝 Structure du projet

```
music-dj-chat/
├── prisma/
│   └── schema.prisma          # Schéma de base de données
├── src/
│   └── app/
│       ├── page.tsx           # Page principale du chat
│       ├── layout.tsx         # Layout global
│       └── globals.css        # Styles globaux
├── server.js                  # Serveur Socket.IO
└── package.json              # Dépendances
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT
