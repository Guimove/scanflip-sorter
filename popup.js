function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'error' : 'success';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

async function sortCards(ascending = false) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('scanflip.fr/fr/yugioh/expansions')) {
      showStatus('Le tri fonctionne uniquement sur la page des extensions', true);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: sortExtensions,
      args: [ascending]
    });

    showStatus('✓ Extensions triées !');
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

function sortExtensions(ascending) {
  // Trouve le conteneur grid avec un sélecteur plus précis
  const container = document.querySelector('.grid.grid-cols-2.sm\\:grid-cols-2.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4.gap-2.lg\\:gap-4');

  if (!container) {
    alert('Impossible de trouver le conteneur des extensions');
    return;
  }

  // Récupère toutes les cartes d'extensions (enfants directs du grid)
  const cards = Array.from(container.children).filter(child =>
    child.classList.contains('sfcard') || child.querySelector('.sfcard')
  );

  if (cards.length === 0) {
    alert('Aucune extension trouvée sur cette page');
    return;
  }

  console.log(`Nombre de cartes trouvées: ${cards.length}`);

  // Extrait les données et trie par pourcentage
  const sortedCards = cards.map(card => {
    // Cherche le texte qui contient le pourcentage
    const allText = card.textContent;

    // Cherche un pattern comme "X/Y Complet (Z%)" ou juste "(Z%)"
    const percentMatch = allText.match(/\((\d+(?:\.\d+)?)\s*%\)/);
    const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;

    // Extrait le nom de l'extension
    const nameElement = card.querySelector('.font-bold');
    const name = nameElement ? nameElement.textContent.trim() : 'Unknown';

    return { element: card, percent, name };
  })
  .sort((a, b) => ascending ? a.percent - b.percent : b.percent - a.percent);

  console.log('Réorganisation des cartes...');

  // Réorganise les éléments en les insérant dans le bon ordre
  // On insère chaque élément avant le suivant dans la liste triée
  sortedCards.forEach((item, index) => {
    const currentPosition = Array.from(container.children).indexOf(item.element);

    if (currentPosition !== index) {
      // Si l'élément n'est pas à la bonne position, on le déplace
      if (index === 0) {
        container.insertBefore(item.element, container.firstChild);
      } else {
        const previousElement = sortedCards[index - 1].element;
        container.insertBefore(item.element, previousElement.nextSibling);
      }
    }
  });

  console.log('✓ Tri effectué !');
  console.log('\n=== TOP 10 ===');
  sortedCards.slice(0, 10).forEach((item, i) => {
    console.log(`${i+1}. ${item.percent}% - ${item.name}`);
  });
}

async function groupByBinderPages() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('scanflip.fr/fr/yugioh/cards')) {
      showStatus('Le groupement fonctionne uniquement sur la page des cartes', true);
      return;
    }

    const width = parseInt(document.getElementById('binderWidth').value);
    const height = parseInt(document.getElementById('binderHeight').value);
    const startPosition = parseInt(document.getElementById('startPosition').value);

    if (!width || !height || width < 1 || height < 1) {
      showStatus('Veuillez entrer des dimensions valides', true);
      return;
    }

    if (!startPosition || startPosition < 1) {
      showStatus('La position de départ doit être au minimum 1', true);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: groupCardsByPages,
      args: [width, height, startPosition]
    });

    showStatus(`✓ Cartes groupées par pages de ${width}x${height} (départ: case ${startPosition}) !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

async function resetGrouping() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('scanflip.fr/fr/yugioh/cards')) {
      showStatus('Le groupement fonctionne uniquement sur la page des cartes', true);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removePageSeparators
    });

    showStatus('✓ Groupement réinitialisé !');
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

function groupCardsByPages(width, height, startPosition = 1) {
  // Cherche le conteneur grid des cartes Yu-Gi-Oh
  const container = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-4.lg\\:grid-cols-4.xl\\:grid-cols-5.gap-4');

  if (!container) {
    alert('Impossible de trouver le conteneur des cartes. Assurez-vous d\'être sur la page /fr/yugioh/cards');
    return;
  }

  // Supprime les séparateurs et wrapper existants
  document.querySelectorAll('.binder-page-separator, .binder-page-wrapper, .binder-placeholder').forEach(elem => elem.remove());

  // Récupère toutes les cartes (enfants directs du conteneur)
  const cards = Array.from(container.children);

  if (cards.length === 0) {
    alert('Aucune carte trouvée sur cette page');
    return;
  }

  const cardsPerPage = width * height;
  const offset = startPosition - 1; // Nombre de cases vides au début
  const totalCardsWithOffset = cards.length + offset;
  const totalPages = Math.ceil(totalCardsWithOffset / cardsPerPage);

  // Sauvegarde les styles originaux du conteneur
  const originalGridStyles = container.className;
  const originalStyles = container.style.cssText;

  // Modifie le conteneur pour afficher en grille selon les dimensions du classeur
  container.style.cssText = `
    display: grid !important;
    grid-template-columns: repeat(${width}, 1fr) !important;
    gap: 8px !important;
    width: 100% !important;
  `;

  // Sauvegarde les données pour la restauration
  container.dataset.originalGridStyles = originalGridStyles;
  container.dataset.originalStyles = originalStyles;
  container.dataset.binderMode = 'active';

  // Réorganise les cartes par pages
  let cardIndex = 0; // Index de la carte actuelle dans le tableau

  for (let page = 0; page < totalPages; page++) {
    const pageStartPosition = page * cardsPerPage; // Position absolue du début de la page
    const pageEndPosition = pageStartPosition + cardsPerPage; // Position absolue de fin de la page

    // Ajoute un séparateur de page (sauf avant la première page)
    if (page > 0) {
      const separator = document.createElement('div');
      separator.className = 'binder-page-separator';
      separator.style.cssText = `
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin: 30px 0 20px 0;
        padding: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;
      separator.innerHTML = `
        <div style="color: white; font-weight: bold; font-size: 16px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
          📄 Page ${page + 1} / ${totalPages}
        </div>
      `;
      container.appendChild(separator);
    }

    // Ajoute un wrapper pour cette page
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'binder-page-wrapper';
    pageWrapper.style.cssText = `
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(${width}, 1fr);
      gap: 8px;
      padding: 15px;
      background: ${page % 2 === 0 ? 'rgba(102, 126, 234, 0.05)' : 'rgba(118, 75, 162, 0.05)'};
      border-radius: 10px;
      border: 2px solid ${page % 2 === 0 ? 'rgba(102, 126, 234, 0.2)' : 'rgba(118, 75, 162, 0.2)'};
      position: relative;
    `;

    // Compte le nombre de cartes réelles sur cette page
    let realCardsOnPage = 0;

    // Remplit la page case par case
    for (let i = 0; i < cardsPerPage; i++) {
      const absolutePosition = pageStartPosition + i;

      if (absolutePosition < offset) {
        // Cases avant la position de départ (déjà occupées)
        const placeholder = document.createElement('div');
        placeholder.className = 'binder-placeholder';
        placeholder.style.cssText = `
          aspect-ratio: 0.7;
          border: 2px solid rgba(200, 100, 100, 0.3);
          background: rgba(200, 100, 100, 0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(200, 100, 100, 0.4);
          font-size: 12px;
          font-weight: bold;
        `;
        placeholder.textContent = '✕';
        placeholder.title = `Case ${absolutePosition + 1} (occupée)`;
        pageWrapper.appendChild(placeholder);
      } else if (cardIndex < cards.length) {
        // Ajoute une carte réelle
        const card = cards[cardIndex];
        card.style.maxWidth = '200px';
        card.style.margin = '0 auto';
        pageWrapper.appendChild(card);
        cardIndex++;
        realCardsOnPage++;
      } else {
        // Cases vides après les cartes
        const placeholder = document.createElement('div');
        placeholder.className = 'binder-placeholder';
        placeholder.style.cssText = `
          aspect-ratio: 0.7;
          border: 2px dashed rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 0, 0, 0.2);
          font-size: 24px;
        `;
        placeholder.textContent = '○';
        pageWrapper.appendChild(placeholder);
      }
    }

    // Ajoute un indicateur de page en haut à gauche
    const pageLabel = document.createElement('div');
    pageLabel.style.cssText = `
      position: absolute;
      top: -12px;
      left: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    pageLabel.textContent = `Page ${page + 1} (${realCardsOnPage} cartes)`;
    pageWrapper.appendChild(pageLabel);

    container.appendChild(pageWrapper);
  }

  console.log(`✓ Cartes réorganisées en ${totalPages} pages de ${width}x${height} (${cardsPerPage} cases par page, départ: case ${startPosition})`);
}

function removePageSeparators() {
  // Cherche le conteneur avec le mode classeur actif
  const container = document.querySelector('[data-binder-mode="active"]');

  if (!container) {
    console.log('Aucun groupement actif à supprimer');
    return;
  }

  // Récupère toutes les vraies cartes (pas les placeholders) des wrappers
  const wrappers = container.querySelectorAll('.binder-page-wrapper');
  const cards = [];

  wrappers.forEach(wrapper => {
    const wrapperCards = Array.from(wrapper.children).filter(child =>
      !child.classList.contains('binder-placeholder') &&
      child.tagName === 'A' // Les cartes sont des liens <a>
    );
    cards.push(...wrapperCards);
  });

  // Restaure les styles originaux
  if (container.dataset.originalGridStyles) {
    container.className = container.dataset.originalGridStyles;
  }
  if (container.dataset.originalStyles) {
    container.style.cssText = container.dataset.originalStyles;
  }

  // Supprime les attributs de données
  delete container.dataset.binderMode;
  delete container.dataset.originalGridStyles;
  delete container.dataset.originalStyles;

  // Vide le conteneur
  container.innerHTML = '';

  // Réinsère uniquement les vraies cartes et restaure leurs styles
  cards.forEach(card => {
    card.style.maxWidth = '';
    card.style.margin = '';
    container.appendChild(card);
  });

  console.log('✓ Mode classeur désactivé, grille originale restaurée');
}

// Event listeners
document.getElementById('sortDesc').addEventListener('click', () => sortCards(false));
document.getElementById('sortAsc').addEventListener('click', () => sortCards(true));
document.getElementById('groupByPages').addEventListener('click', groupByBinderPages);
document.getElementById('resetGrouping').addEventListener('click', resetGrouping);
