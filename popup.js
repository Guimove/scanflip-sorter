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

    if (!tab.url.includes('scanflip.fr')) {
      showStatus('Cette extension fonctionne uniquement sur scanflip.fr', true);
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

// Event listeners
document.getElementById('sortDesc').addEventListener('click', () => sortCards(false));
document.getElementById('sortAsc').addEventListener('click', () => sortCards(true));
