# Contributing to ScanFlip Sorter

Merci de votre intérêt pour contribuer à ScanFlip Sorter ! 🎉

## Comment contribuer

### Signaler un bug

Si vous trouvez un bug, veuillez créer une issue avec :
- Une description claire du problème
- Les étapes pour reproduire le bug
- Le comportement attendu vs le comportement actuel
- Des captures d'écran si applicable
- Votre version de Chrome et du système d'exploitation

### Proposer une fonctionnalité

Pour proposer une nouvelle fonctionnalité :
1. Vérifiez d'abord qu'une issue similaire n'existe pas déjà
2. Créez une issue décrivant la fonctionnalité souhaitée
3. Expliquez pourquoi cette fonctionnalité serait utile
4. Si possible, proposez une implémentation

### Soumettre une Pull Request

1. **Fork** le repository
2. **Clone** votre fork localement
3. **Créez une branche** pour votre fonctionnalité ou correction :
   ```bash
   git checkout -b feature/ma-super-fonctionnalite
   ```
4. **Faites vos modifications** en suivant les conventions du projet
5. **Testez** vos modifications :
   - Chargez l'extension dans Chrome en mode développeur
   - Testez sur https://www.scanflip.fr/fr/yugioh/expansions
   - Vérifiez que le tri fonctionne correctement
   - Vérifiez que le style de la page est préservé
6. **Commit** vos modifications avec un message clair
7. **Push** vers votre fork
8. Ouvrez une **Pull Request** vers la branche `main`

### Standards de code

- Utilisez des noms de variables et fonctions descriptifs en français
- Commentez le code complexe
- Respectez l'indentation (2 espaces)
- Testez votre code avant de soumettre

### Structure du projet

```
scanflip-sorter/
├── manifest.json       # Configuration de l'extension Chrome
├── popup.html          # Interface utilisateur
├── popup.js            # Logique de l'extension
├── icon*.png           # Icônes de l'extension
├── create-icons.html   # Générateur d'icônes
└── README.md           # Documentation
```

### Tests

Avant de soumettre votre PR, testez :
- ✅ Le tri décroissant fonctionne
- ✅ Le tri croissant fonctionne
- ✅ Le style de la page est préservé
- ✅ Aucune erreur dans la console
- ✅ L'extension fonctionne sur la page des extensions ScanFlip

### Questions ?

N'hésitez pas à ouvrir une issue si vous avez des questions !

## Code of Conduct

Ce projet adhère au [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). En participant, vous acceptez de respecter ses termes.
