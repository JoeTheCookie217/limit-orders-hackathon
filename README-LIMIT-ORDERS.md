# 📈 Dusa-style Limit Orders Implementation

Ce projet implémente un système de limit orders avancé basé sur l'interface Dusa, avec auto-incrémentation des prix via binStep/binId et récupération automatique des ordres depuis le backend.

## 🎯 Fonctionnalités Implémentées

### ✅ Système de Prix Automatique

- **Auto-incrémentation via flèches directionnelles** : Utilisez ↑/↓ pour ajuster le prix par binStep
- **Affichage automatique du prix** basé sur activeId/targetId
- **Gestion de l'inversion de prix** (isPriceInverted) pour l'affichage
- **Calculs de prix avancés** avec ajustement décimal token-specific
- **Bouton "MARKET"** pour reset au prix du marché
- **Affichage du pourcentage** de différence vs prix actuel

### ✅ Backend et Pools

- **Pools supportant les limit orders** configurés dans `poolsV2WithLO`
- **Système de récupération des ordres** depuis le backend (TRPC mockée)
- **Validation automatique** des pairs supportées
- **Modal des pools supportés** avec affichage binStep et version

### ✅ Interface Utilisateur Avancée

- **Composant PriceInput** avec logique binStep intégrée
- **Gestion des dates d'expiration** avec UI intuitive
- **Messages d'erreur contextuels** avec liens vers pools supportés
- **Support du dark/light mode**

## 🏗️ Architecture

### Composants Clés

```
src/
├── components/
│   ├── PriceInput/                 # Composant prix avec auto-increment
│   ├── LimitOrderCard/             # Interface principale
│   └── Skeleton/                   # Composant de loading
├── hooks/
│   ├── useAdvancedManageOrders.ts  # Hook principal (copié de l'interface)
│   └── useFetchOrders.ts           # Récupération ordres backend
└── utils/
    ├── methods.ts                  # Utilitaires prix/binId
    ├── pools.ts                    # Configuration pools LO
    └── trpc.ts                     # Client TRPC mockée
```

### Hooks Principaux

#### `useAdvancedManageOrders`

Hook principal copié et adapté de l'interface Dusa avec :

- Gestion des prix avec ajustement décimal
- Auto-calcul des montants basé sur targetPrice
- Logique de validation des ordres (above/below market)
- Intégration avec la logique allowance

#### `useFetchOrders`

Hook pour récupérer les ordres depuis le backend :

- Connexion aux contrats smart contracts
- Polling automatique des ordres actifs
- Gestion des états de loading/erreur

## 🚀 Utilisation

### Démarrage Rapide

```bash
cd limit-orders-app
pnpm install
pnpm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Créer un Limit Order

1. **Connecter le wallet** : Cliquez sur "Connect Wallet"
2. **Sélectionner les tokens** : FROM → TO (seuls les pairs supportées fonctionnent)
3. **Entrer le montant** : Dans le champ FROM
4. **Ajuster le prix** :
   - Le prix se calcule automatiquement
   - Utilisez ↑/↓ pour incrémenter par binStep
   - Cliquez "MARKET" pour reset au prix du marché
   - Toggle l'inversion avec le bouton ⇄
5. **Configurer l'expiration** (optionnel) : Cliquez l'icône calendrier
6. **Créer l'ordre** : Cliquez "Create BUY/SELL Order"

### Fonctionnalités Avancées

#### Auto-incrémentation des Prix

- **Flèche Haut (↑)** : Augmente le prix d'un binStep
- **Flèche Bas (↓)** : Diminue le prix d'un binStep
- **Logique intelligente** : Tient compte de l'inversion et du type d'ordre

#### Gestion des Pools

- Les limit orders ne fonctionnent que sur les pools configurés
- Modal "View supported pools" pour voir les pairs disponibles
- Validation automatique avec messages d'erreur explicites

## 🔧 Configuration

### Ajouter de Nouveaux Pools

Dans `src/utils/pools.ts` :

```typescript
export const poolsV2WithLO: PoolV2WithLO[] = [
  {
    token0: TOKEN_A,
    token1: TOKEN_B,
    binStep: 20,
    pairAddress: "AS12...", // Adresse du pair
    version: "V2",
    loSC: "AS1G...", // Adresse du contrat limit order
  },
  // Ajouter d'autres pools ici
];
```

### Backend TRPC

Le fichier `src/utils/trpc.ts` contient une implémentation mockée. Pour l'intégration réelle :

```typescript
// Remplacer la mock par un vrai client TRPC
export const trpc = createTRPCReact<AppRouter>();
```

## 🧪 Tests et Build

```bash
# Test TypeScript
pnpm run build

# Linter (si configuré)
pnpm run lint

# Tests (si configurés)
pnpm run test
```

## 📋 Différences avec l'Interface Dusa

### Adaptations Effectuées

1. **Structure simplifiée** : Pas de routing complexe
2. **TRPC mockée** : Pas de backend réel connecté
3. **Tokens limités** : Seuls les tokens de test buildnet
4. **Smart contracts mockés** : Pas de transactions réelles

### Fonctionnalités Identiques

1. **Logique des prix** : 100% identique (getPriceFromId, handleKeyDown, etc.)
2. **Interface utilisateur** : Même UX/UI que Dusa
3. **Validation des ordres** : Même logique métier
4. **Gestion des erreurs** : Messages identiques

## 🎨 Personnalisation

### Thème et Styles

- Variables CSS dans `src/assets/scss/`
- Support dark/light mode automatique
- Composants modulaires et réutilisables

### Ajout de Fonctionnalités

Le code est structuré pour faciliter l'extension :

- Nouveaux types d'ordres
- Stratégies de trading avancées
- Intégrations supplémentaires

### Erreurs Communes

1. **"Invalid pair for limit order"** : Pool pas configuré dans poolsV2WithLO
2. **"Prix ne s'affiche pas"** : activeId pas initialisé
3. **"Flèches ne marchent pas"** : onKeyDown pas configuré sur l'input

## 📚 Resources

- [Interface Dusa](https://github.com/dusa-repository/interface) - Code source original
- [@dusalabs/sdk](https://www.npmjs.com/package/@dusalabs/sdk) - SDK utilisé
- [Massa Docs](https://docs.massa.net/) - Documentation Massa

---

## 🎉 Résultat Final

Cette implémentation reproduit fidèlement le comportement de l'interface Dusa avec :

- ✅ Auto-incrémentation des prix via binStep/binId
- ✅ Affichage automatique des prix
- ✅ Récupération des ordres depuis le backend
- ✅ Interface utilisateur identique
- ✅ Validation et gestion d'erreurs complètes

Le système est prêt pour l'intégration avec un vrai backend TRPC et des contrats smart contracts réels.
