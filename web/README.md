# PIA Web — Application Logisticien / Contrôleur Terminal

Interface web du projet PIA (Traçabilité des conteneurs).

## Rôle

Cette application est destinée aux :
- **Logisticiens** : gestion complète des conteneurs, tableaux de bord, rapports.
- **Contrôleurs LCT / Togo Terminal** : validation des arrivées, départs, déchargements sous palan.
- **Clients** (optionnel) : suivi web des conteneurs associés.

## Stack

- React 19
- Vite 6
- TypeScript 5
- Tailwind CSS 4
- TanStack Query
- React Router
- Axios
- Recharts

## Démarrage

```bash
cd /Users/agbotsemarcel/SUIVIPIA/web
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

Le proxy Vite redirige les appels `/api` vers `http://localhost:3000` (backend).

## Comptes de test

- Logisticien : `logisticien@pia.tg` / `password123`
- Client : `client@example.tg` / `password123`
