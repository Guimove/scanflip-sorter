# ScanFlip Sorter - Extension Chrome

Extension Chrome pour trier les extensions Yu-Gi-Oh! par pourcentage de possession sur ScanFlip.

## Installation

1. Ouvrez Chrome et allez dans `chrome://extensions/`
2. Activez le "Mode développeur" en haut à droite
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `scanflip-sorter`

## Utilisation

1. Allez sur https://www.scanflip.fr/fr/yugioh/expansions
2. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
3. Choisissez le type de tri :
   - **⬇ Trier par % décroissant** : Affiche d'abord les extensions que vous possédez le plus
   - **⬆ Trier par % croissant** : Affiche d'abord les extensions que vous possédez le moins

## Note sur les icônes

L'extension utilise des icônes par défaut. Pour personnaliser :
- Ajoutez vos propres images `icon16.png`, `icon48.png`, et `icon128.png` dans le dossier
- Ou supprimez les références aux icônes dans `manifest.json`

## Dépannage

Si l'extension ne fonctionne pas :
- Vérifiez que vous êtes bien sur scanflip.fr
- Vérifiez que vous êtes sur la page des extensions (/yugioh/expansions)
- Ouvrez la console développeur (F12) pour voir les logs
- Rechargez l'extension dans chrome://extensions/
