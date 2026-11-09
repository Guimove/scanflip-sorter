const EXPANSIONS_SELECTOR = '.grid.grid-cols-2.sm\\:grid-cols-2.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4.gap-2.lg\\:gap-4';
const CARDS_SELECTOR = '.grid.grid-cols-2.md\\:grid-cols-4.lg\\:grid-cols-4.xl\\:grid-cols-5.gap-4';

const SUPPORTED_GAMES = 'yugioh|pokemon';
const EXPANSIONS_URL = new RegExp(`scanflip\\.fr/[a-z]{2}/(${SUPPORTED_GAMES})/expansions`);
const CARDS_URL = new RegExp(`scanflip\\.fr/[a-z]{2}/(${SUPPORTED_GAMES})/cards`);

let statusTimeout;

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'error' : 'success';
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => { status.className = ''; }, 3000);
}

async function runOnTab(urlPattern, errorMessage, func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!urlPattern.test(tab.url)) {
    showStatus(errorMessage, true);
    return null;
  }
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
    args
  });
  return result;
}

// --- Fonctions exécutées dans le contexte de la page ---

function sortExtensions(ascending, selector) {
  let container = document.querySelector(selector);
  if (!container) {
    // Fallback (Pokémon, changements de layout) : la grille dont la majorité des enfants affiche un %
    container = Array.from(document.querySelectorAll('.grid')).find(grid => {
      const children = Array.from(grid.children);
      return children.length > 1 &&
        children.filter(c => /\d\s*%/.test(c.textContent)).length >= children.length / 2;
    });
  }
  if (!container) { alert('Impossible de trouver le conteneur des extensions'); return; }

  let cards = Array.from(container.children).filter(child =>
    child.classList.contains('sfcard') || child.querySelector('.sfcard')
  );
  if (cards.length === 0) cards = Array.from(container.children);
  if (cards.length === 0) { alert('Aucune extension trouvée sur cette page'); return; }

  const sorted = cards
    .map(card => {
      const match = card.textContent.match(/\((\d+(?:[.,]\d+)?)\s*%\)/) || card.textContent.match(/(\d+(?:[.,]\d+)?)\s*%/);
      return { element: card, percent: match ? parseFloat(match[1].replace(',', '.')) : 0 };
    })
    .sort((a, b) => ascending ? a.percent - b.percent : b.percent - a.percent);

  sorted.forEach(item => container.appendChild(item.element));
}

function extractExtensionsData(selector) {
  const MONTH_MAP = {
    janvier: '01', 'février': '02', mars: '03', avril: '04', mai: '05', juin: '06',
    juillet: '07', 'août': '08', septembre: '09', octobre: '10', novembre: '11', 'décembre': '12'
  };

  let container = document.querySelector(selector);
  if (!container) {
    // Fallback (Pokémon, changements de layout) : la grille dont la majorité des enfants affiche un %
    container = Array.from(document.querySelectorAll('.grid')).find(grid => {
      const children = Array.from(grid.children);
      return children.length > 1 &&
        children.filter(c => /\d\s*%/.test(c.textContent)).length >= children.length / 2;
    });
  }
  if (!container) return [];

  let cards = Array.from(container.children).filter(child =>
    child.classList.contains('sfcard') || child.querySelector('.sfcard')
  );
  if (cards.length === 0) cards = Array.from(container.children);

  return cards.map(card => {
    const percentMatch = card.textContent.match(/\((\d+(?:[.,]\d+)?)\s*%\)/) || card.textContent.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const percent = percentMatch ? parseFloat(percentMatch[1].replace(',', '.')) : 0;

    const completionP = Array.from(card.querySelectorAll('p')).find(p => /Complet/i.test(p.textContent));
    const countMatch = completionP ? completionP.textContent.match(/(\d+)\s*\/\s*(\d+)\s*Complet/i) : null;
    const owned = countMatch ? parseInt(countMatch[1]) : 0;
    const total = countMatch ? parseInt(countMatch[2]) : 0;

    const nameEl = card.querySelector('.font-bold');
    const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

    const linkEl = card.querySelector('a[href*="expansion="]');
    const href = linkEl ? linkEl.getAttribute('href') : '';
    const idMatch = href.match(/expansion=([^&]+)/);
    const id = idMatch ? idMatch[1] : '';

    const dateLabel = Array.from(card.querySelectorAll('div')).find(d => d.textContent.trim() === 'A débuté en');
    const rawDate = dateLabel && dateLabel.nextElementSibling ? dateLabel.nextElementSibling.textContent.trim() : '';
    const dateParts = rawDate.match(/(\S+)\s+(\d{4})/);
    const date = dateParts ? `${dateParts[2]}/${MONTH_MAP[dateParts[1].toLowerCase()] || '00'}` : '';

    return { name, id, percent, owned, total, date };
  });
}

function groupCardsByPages(width, height, startPosition, selector) {
  // Si un groupement est actif, on réutilise son conteneur
  const container = document.querySelector('[data-binder-mode="active"]') || document.querySelector(selector);
  if (!container) { alert('Impossible de trouver le conteneur des cartes. Assurez-vous d\'être sur une page /cards (Yu-Gi-Oh ou Pokémon)'); return; }

  // Si un groupement est déjà actif, récupère les cartes depuis les pages existantes
  const isRegroup = container.dataset.binderMode === 'active';
  const cards = isRegroup
    ? Array.from(container.querySelectorAll('.binder-page-wrapper > *')).filter(el =>
        !el.classList.contains('binder-placeholder') && !el.classList.contains('binder-page-label'))
    : Array.from(container.children);

  document.querySelectorAll('.binder-page-separator, .binder-page-wrapper, .binder-placeholder').forEach(el => el.remove());

  if (cards.length === 0) { alert('Aucune carte trouvée sur cette page'); return; }

  const cardsPerPage = width * height;
  const offset = startPosition - 1;
  const totalPages = Math.ceil((cards.length + offset) / cardsPerPage);

  // Sauvegarde les styles originaux du conteneur (une seule fois)
  if (!isRegroup) {
    container.dataset.originalGridStyles = container.className;
    container.dataset.originalStyles = container.style.cssText;
  }
  container.dataset.binderMode = 'active';

  container.style.cssText = `
    display: grid !important;
    grid-template-columns: repeat(${width}, 1fr) !important;
    gap: 8px !important;
    width: 100% !important;
  `;

  function createPlaceholder(type) {
    const el = document.createElement('div');
    el.className = 'binder-placeholder';
    if (type === 'occupied') {
      el.style.cssText = `
        aspect-ratio: 0.7; border: 2px solid rgba(200, 100, 100, 0.3);
        background: rgba(200, 100, 100, 0.05); border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        color: rgba(200, 100, 100, 0.4); font-size: 12px; font-weight: bold;
      `;
      el.textContent = '✕';
    } else {
      el.style.cssText = `
        aspect-ratio: 0.7; border: 2px dashed rgba(0, 0, 0, 0.1);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        color: rgba(0, 0, 0, 0.2); font-size: 24px;
      `;
      el.textContent = '○';
    }
    return el;
  }

  let cardIndex = 0;

  for (let page = 0; page < totalPages; page++) {
    const pageStart = page * cardsPerPage;

    if (page > 0) {
      const separator = document.createElement('div');
      separator.className = 'binder-page-separator';
      separator.style.cssText = `
        grid-column: 1 / -1; display: flex; align-items: center; justify-content: center;
        gap: 15px; margin: 30px 0 20px 0; padding: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;
      separator.innerHTML = `
        <div style="color: white; font-weight: bold; font-size: 16px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
          📄 Page ${page + 1} / ${totalPages}
        </div>
      `;
      container.appendChild(separator);
    }

    const isEvenPage = page % 2 === 0;
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'binder-page-wrapper';
    pageWrapper.style.cssText = `
      grid-column: 1 / -1; display: grid; grid-template-columns: repeat(${width}, 1fr);
      gap: 8px; padding: 15px;
      background: ${isEvenPage ? 'rgba(102, 126, 234, 0.05)' : 'rgba(118, 75, 162, 0.05)'};
      border-radius: 10px; position: relative;
      border: 2px solid ${isEvenPage ? 'rgba(102, 126, 234, 0.2)' : 'rgba(118, 75, 162, 0.2)'};
    `;

    let realCardsOnPage = 0;

    for (let i = 0; i < cardsPerPage; i++) {
      const absPos = pageStart + i;

      if (absPos < offset) {
        const ph = createPlaceholder('occupied');
        ph.title = `Case ${absPos + 1} (occupée)`;
        pageWrapper.appendChild(ph);
      } else if (cardIndex < cards.length) {
        const card = cards[cardIndex];
        card.style.maxWidth = '200px';
        card.style.margin = '0 auto';
        pageWrapper.appendChild(card);
        cardIndex++;
        realCardsOnPage++;
      } else {
        pageWrapper.appendChild(createPlaceholder('empty'));
      }
    }

    const pageLabel = document.createElement('div');
    pageLabel.className = 'binder-page-label';
    pageLabel.style.cssText = `
      position: absolute; top: -12px; left: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 4px 12px; border-radius: 12px;
      font-size: 12px; font-weight: bold; z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    pageLabel.textContent = `Page ${page + 1} (${realCardsOnPage} cartes)`;
    pageWrapper.appendChild(pageLabel);

    container.appendChild(pageWrapper);
  }
}

function removePageSeparators() {
  const container = document.querySelector('[data-binder-mode="active"]');
  if (!container) return;

  const cards = [];
  container.querySelectorAll('.binder-page-wrapper').forEach(wrapper => {
    Array.from(wrapper.children)
      .filter(child => !child.classList.contains('binder-placeholder') && !child.classList.contains('binder-page-label'))
      .forEach(card => cards.push(card));
  });

  if (container.dataset.originalGridStyles !== undefined) container.className = container.dataset.originalGridStyles;
  container.style.cssText = container.dataset.originalStyles || '';
  delete container.dataset.binderMode;
  delete container.dataset.originalGridStyles;
  delete container.dataset.originalStyles;

  container.innerHTML = '';
  cards.forEach(card => {
    card.style.maxWidth = '';
    card.style.margin = '';
    container.appendChild(card);
  });
}

// --- Actions du popup ---

async function sortCards(ascending = false) {
  try {
    if (!await runOnTab(EXPANSIONS_URL, 'Le tri fonctionne uniquement sur la page des extensions', sortExtensions, [ascending, EXPANSIONS_SELECTOR])) return;
    showStatus('✓ Extensions triées !');
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

async function exportCsv() {
  try {
    const result = await runOnTab(EXPANSIONS_URL, "L'export fonctionne uniquement sur la page des extensions", extractExtensionsData, [EXPANSIONS_SELECTOR]);
    if (!result) return;

    const data = result.result;
    if (!data || data.length === 0) { showStatus('Aucune donnée à exporter', true); return; }

    const separator = '$';
    const header = ['Nom', 'ID', 'Completion (%)', 'Possédées', 'Total', 'Date de sortie'].join(separator);
    const lines = data.map(item =>
      [item.name, item.id, item.percent, item.owned, item.total, item.date].join(separator)
    );
    const csvContent = [header, ...lines].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scanflip-extensions.csv';
    a.click();
    URL.revokeObjectURL(url);

    showStatus(`✓ CSV exporté (${data.length} extensions) !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

async function groupByBinderPages() {
  try {
    const width = parseInt(document.getElementById('binderWidth').value);
    const height = parseInt(document.getElementById('binderHeight').value);
    const startPosition = parseInt(document.getElementById('startPosition').value);

    if (!width || !height || width < 1 || height < 1) { showStatus('Veuillez entrer des dimensions valides', true); return; }
    if (!startPosition || startPosition < 1) { showStatus('La position de départ doit être au minimum 1', true); return; }

    if (!await runOnTab(CARDS_URL, 'Le groupement fonctionne uniquement sur la page des cartes', groupCardsByPages, [width, height, startPosition, CARDS_SELECTOR])) return;
    showStatus(`✓ Cartes groupées par pages de ${width}x${height} (départ: case ${startPosition}) !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

async function resetGrouping() {
  try {
    if (!await runOnTab(CARDS_URL, 'Le groupement fonctionne uniquement sur la page des cartes', removePageSeparators)) return;
    showStatus('✓ Groupement réinitialisé !');
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

function extractCardData(selector) {
  const container = document.querySelector(selector);
  if (!container) return [];

  // Si un groupement est actif, les cartes sont dans les pages du classeur
  const cards = container.dataset.binderMode === 'active'
    ? Array.from(container.querySelectorAll('.binder-page-wrapper > *')).filter(el =>
        !el.classList.contains('binder-placeholder') && !el.classList.contains('binder-page-label'))
    : Array.from(container.children);

  return cards.map(card => {
    const nameEl = card.querySelector('.font-bold');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const codeEl = card.querySelector('span.min-w-fit.text-xs.text-muted-foreground.font-bold');
    const code = codeEl ? codeEl.textContent.trim() : '';
    const img = card.querySelector('img[class*="aspect-"]');
    const owned = img ? !img.classList.contains('grayscale-100') : false;
    return name && code ? { name, code, owned } : null;
  }).filter(Boolean);
}

async function copyCards(mode) {
  try {
    const result = await runOnTab(CARDS_URL, 'Cette fonction fonctionne uniquement sur la page des cartes', extractCardData, [CARDS_SELECTOR]);
    if (!result) return;

    let cards = result.result;
    if (!cards || cards.length === 0) { showStatus('Aucune carte trouvée', true); return; }

    if (mode === 'missing' || mode === 'cardmarket') {
      cards = cards.filter(c => !c.owned);
    }

    if (cards.length === 0) { showStatus('Aucune carte manquante !', false); return; }

    let lines;
    if (mode === 'cardmarket') {
      lines = cards.map(c => `1 ${c.name} (${c.code.split('-')[0]})`);
    } else {
      lines = cards.map(c => `${c.name} ${c.code}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    const label = mode === 'all' ? 'cartes' : 'cartes manquantes';
    showStatus(`✓ ${lines.length} ${label} copiées !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

// --- Event listeners ---

document.getElementById('sortDesc').addEventListener('click', () => sortCards(false));
document.getElementById('sortAsc').addEventListener('click', () => sortCards(true));
document.getElementById('exportCsv').addEventListener('click', exportCsv);
document.getElementById('groupByPages').addEventListener('click', groupByBinderPages);
document.getElementById('resetGrouping').addEventListener('click', resetGrouping);
document.getElementById('copyCardList').addEventListener('click', () => copyCards('all'));
document.getElementById('copyMissing').addEventListener('click', () => copyCards('missing'));
document.getElementById('copyMissingCM').addEventListener('click', () => copyCards('cardmarket'));
