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
