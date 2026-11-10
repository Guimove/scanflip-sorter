// Utilitaires partagés, injectés dans la page avant chaque action du popup.
// Ils vivent dans le monde isolé de l'extension et sont accessibles via globalThis.ScanFlipHelpers.

globalThis.ScanFlipHelpers = {
  // Grille des extensions : sélecteur Yu-Gi-Oh, sinon la grille dont la majorité des enfants affiche un %
  findExpansionsGrid(selector) {
    const direct = document.querySelector(selector);
    if (direct) return direct;
    return Array.from(document.querySelectorAll('.grid')).find(grid => {
      const children = Array.from(grid.children);
      return children.length > 1 &&
        children.filter(c => /\d\s*%/.test(c.textContent)).length >= children.length / 2;
    }) || null;
  },

  getExpansionCards(container) {
    const cards = Array.from(container.children).filter(child =>
      child.classList.contains('sfcard') || child.querySelector('.sfcard')
    );
    return cards.length > 0 ? cards : Array.from(container.children);
  },

  getPercent(card) {
    const match = card.textContent.match(/\((\d+(?:[.,]\d+)?)\s*%\)/) || card.textContent.match(/(\d+(?:[.,]\d+)?)\s*%/);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
  },

  // Conteneur des cartes : celui du classeur actif s'il existe
  findCardsContainer(selector) {
    return document.querySelector('[data-binder-mode="active"]') || document.querySelector(selector);
  },

  isBinderPart(el) {
    return el.classList.contains('binder-placeholder') ||
      el.classList.contains('binder-page-label') ||
      el.classList.contains('binder-page-separator') ||
      el.classList.contains('binder-page-wrapper');
  },

  // Cartes réelles, que le classeur soit actif ou non
  getCards(container) {
    if (container.dataset.binderMode === 'active') {
      return Array.from(container.querySelectorAll('.binder-page-wrapper > *'))
        .filter(el => !this.isBinderPart(el));
    }
    return Array.from(container.children).filter(el => !this.isBinderPart(el));
  },

  // Une pagination visible signifie que seule une partie des résultats est affichée
  hasPagination() {
    return !!document.querySelector('nav[aria-label*="pagination" i], [data-slot="pagination"], [role="navigation"][aria-label*="page" i]');
  }
};
