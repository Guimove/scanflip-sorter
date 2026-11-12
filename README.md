# ScanFlip Sorter - Extension Chrome

Extension Chrome pour ScanFlip (Yu-Gi-Oh! et Pokémon) : tri des extensions par pourcentage de possession, export CSV, regroupement des cartes en pages de classeur et copie des listes de cartes.

## Installation

1. Ouvrez Chrome et allez dans `chrome://extensions/`
2. Activez le "Mode développeur" en haut à droite
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `scanflip-sorter`

## Utilisation

### Page des extensions

Sur https://www.scanflip.fr/fr/yugioh/expansions (ou /fr/pokemon/expansions), cliquez sur l'icône de l'extension :
- **⬇ Trier par % décroissant** : Affiche d'abord les extensions que vous possédez le plus
- **⬆ Trier par % croissant** : Affiche d'abord les extensions que vous possédez le moins
- **📥 Télécharger le CSV** : Exporte les extensions (nom, ID, % de complétion, cartes possédées, total, date de sortie). Les colonnes sont séparées par `$` (les valeurs contenant `$` ou `"` sont entre guillemets). Les dates sont reconnues quelle que soit la langue du site.

### Page des cartes

Sur une page de cartes (/fr/yugioh/cards ou /fr/pokemon/cards) :
- **📑 Grouper par pages** : Répartit les cartes en pages de classeur selon la largeur et la hauteur choisies. « Commencer à la case » permet de sauter les cases déjà occupées sur la première page.
- **↩ Réinitialiser** : Rétablit l'affichage d'origine. Le popup indique si un classeur est actif.
- **📋 Copier liste des cartes** : Copie toutes les cartes (`Nom CODE`) dans le presse-papiers
- **📋 Copier cartes manquantes** : Copie uniquement les cartes non possédées (détectées via le badge « Modifier dans ma collection », indépendamment du réglage « griser les cartes »)
- **🛒 Manquantes → Cardmarket** : Copie les cartes manquantes au format de la liste d'achat Cardmarket (`1 Nom (SET)` pour Yu-Gi-Oh, `1 Nom (Nom de l'extension)` pour Pokémon)

Seule la page de résultats affichée est traitée : si les résultats sont paginés, un avertissement s'affiche.

## Développement et CI

```bash
npm ci
npm run check   # lint + validation du manifest + zip dans dist/
```

La CI GitHub Actions lance ces étapes sur chaque push et pull request, et garde le zip en artefact.
Pour publier une version : mettre à jour `version` dans `manifest.json`, puis pousser un tag `vX.Y` identique. La CI crée alors une release GitHub avec le zip.

Publication automatique sur le Chrome Web Store (optionnelle) : ajouter les secrets `CWS_EXTENSION_ID`, `CWS_PUBLISHER_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET` et `CWS_REFRESH_TOKEN` dans l'environnement GitHub `chrome-web-store`. Cet environnement n'accepte que les tags `v*` et demande une approbation manuelle. Sans ces secrets, l'étape est ignorée.

### Sécurité de la CI

- Actions verrouillées par le lockfile `.github/workflows/actions.lock` ([gh-actions-lock](https://github.com/github/gh-actions-lock)) : le runner exécute le commit verrouillé et un job CI vérifie le lockfile. Après tout ajout ou changement d'action : `gh actions-lock`, puis commiter le workflow et le lockfile ensemble. Seules les actions GitHub officielles sont autorisées.
- `permissions: {}` par défaut, droits minimaux par job, `persist-credentials: false`.
- `npm ci --ignore-scripts` (et `.npmrc`) : aucun script d'installation (`postinstall`…) n'est exécuté ; versions exactes dans `package.json`.
- Pas de cache dans la chaîne qui produit le zip publié.
- Audit [zizmor](https://zizmor.sh/) à chaque push : `pipx run zizmor==1.32.0 --persona=pedantic .github/workflows`.
- Dependabot avec un délai de 7 jours avant de proposer une nouvelle version.
- Tags `v*` et releases immuables, `main` protégée contre la suppression et le force-push.

## Note sur les icônes

L'extension utilise des icônes par défaut. Pour personnaliser :
- Ajoutez vos propres images `icon16.png`, `icon48.png`, et `icon128.png` dans le dossier
- Ou supprimez les références aux icônes dans `manifest.json`

## Dépannage

Si l'extension ne fonctionne pas :
- Vérifiez que vous êtes bien sur scanflip.fr
- Vérifiez que vous êtes sur la bonne page : extensions (/expansions) pour le tri et l'export, cartes (/cards) pour le groupement et la copie
- Ouvrez la console développeur (F12) pour voir les logs
- Rechargez l'extension dans chrome://extensions/
