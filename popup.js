const EXPANSIONS_SELECTOR = '.grid.grid-cols-2.sm\\:grid-cols-2.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4.gap-2.lg\\:gap-4';
const CARDS_SELECTOR = '.grid.grid-cols-2.md\\:grid-cols-4.lg\\:grid-cols-4.xl\\:grid-cols-5.gap-4';

// Locale optionnelle : /fr/pokemon/cards comme /pokemon/cards
const SUPPORTED_GAMES = 'yugioh|pokemon';
const EXPANSIONS_URL = new RegExp(`scanflip\\.fr/(?:[a-z]{2}/)?(${SUPPORTED_GAMES})/expansions`);
const CARDS_URL = new RegExp(`scanflip\\.fr/(?:[a-z]{2}/)?(${SUPPORTED_GAMES})/cards`);

let statusTimeout;

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'error' : 'success';
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => { status.className = ''; }, isError ? 5000 : 3000);
}

// Injecte page-helpers.js puis la fonction. Les fonctions injectées renvoient { ok, error?, warning?, ... }.
// Renvoie { value, game } ou null si la page ne correspond pas ou si l'action a échoué (statut déjà affiché).
async function runOnTab(urlPattern, errorMessage, func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const match = tab && tab.url ? tab.url.match(urlPattern) : null;
  if (!match) {
    showStatus(errorMessage, true);
    return null;
  }
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['page-helpers.js'] });
  const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args });
  const value = injection ? injection.result : null;
  if (!value || !value.ok) {
    showStatus((value && value.error) || 'Erreur inconnue sur la page', true);
    return null;
  }
  return { value, game: match[1] };
}

function withWarning(message, value) {
  return value.warning ? `${message} ⚠ ${value.warning}` : message;
}

// --- Fonctions exécutées dans le contexte de la page (ScanFlipHelpers est injecté avant) ---

function sortExtensions(ascending, selector) {
  const H = globalThis.ScanFlipHelpers;
  const container = H.findExpansionsGrid(selector);
  if (!container) return { ok: false, error: 'Impossible de trouver le conteneur des extensions' };

  const cards = H.getExpansionCards(container);
  if (cards.length === 0) return { ok: false, error: 'Aucune extension trouvée sur cette page' };

  cards
    .map(card => ({ element: card, percent: H.getPercent(card) }))
    .sort((a, b) => ascending ? a.percent - b.percent : b.percent - a.percent)
    .forEach(item => container.appendChild(item.element));

  return { ok: true, count: cards.length };
}

function extractExtensionsData(selector) {
  const H = globalThis.ScanFlipHelpers;

  // Mois dans la langue de la page (+ fr/en par défaut), sans dépendre de libellés traduits
  const monthMap = {};
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.$/, '');
  const langs = [document.documentElement.lang || 'fr', 'fr', 'en'];
  langs.forEach(lang => {
    ['long', 'short'].forEach(style => {
      try {
        const fmt = new Intl.DateTimeFormat(lang, { month: style });
        for (let m = 0; m < 12; m++) {
          const label = fmt.format(new Date(2000, m, 1)).toLowerCase();
          monthMap[strip(label)] = String(m + 1).padStart(2, '0');
        }
      } catch (e) { /* locale inconnue */ }
    });
  });

  const container = H.findExpansionsGrid(selector);
  if (!container) return { ok: false, error: 'Impossible de trouver le conteneur des extensions' };

  const data = H.getExpansionCards(container).map(card => {
    const percent = H.getPercent(card);

    // "12 / 120 Complet", "12 / 120 Complete"... : premier texte "nombre / nombre"
    const countEl = Array.from(card.querySelectorAll('p, div, span'))
      .find(el => el.children.length === 0 && /^\s*\d+\s*\/\s*\d+/.test(el.textContent))
      || Array.from(card.querySelectorAll('p')).find(p => /\d+\s*\/\s*\d+/.test(p.textContent));
    const countMatch = countEl ? countEl.textContent.match(/(\d+)\s*\/\s*(\d+)/) : null;
    const owned = countMatch ? parseInt(countMatch[1]) : 0;
    const total = countMatch ? parseInt(countMatch[2]) : 0;

    const nameEl = card.querySelector('.font-bold');
    const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

    const linkEl = card.querySelector('a[href*="expansion="]');
    const href = linkEl ? linkEl.getAttribute('href') : '';
    const idMatch = href.match(/expansion=([^&]+)/);
    const id = idMatch ? idMatch[1] : '';

    // Date : texte "mois AAAA" dont le mois est reconnu, quel que soit le libellé qui le précède
    let date = '';
    for (const el of card.querySelectorAll('div, span, p')) {
      if (el.children.length > 0) continue;
      const parts = el.textContent.trim().match(/^(\S+)\s+(\d{4})$/);
      const month = parts ? monthMap[strip(parts[1].toLowerCase())] : null;
      if (month) { date = `${parts[2]}/${month}`; break; }
    }

    return { name, id, percent, owned, total, date };
  });

  return { ok: true, data };
}

function groupCardsByPages(width, height, startPosition, selector) {
  const H = globalThis.ScanFlipHelpers;
  const container = H.findCardsContainer(selector);
  if (!container) return { ok: false, error: "Impossible de trouver le conteneur des cartes. Assurez-vous d'être sur une page /cards (Yu-Gi-Oh ou Pokémon)" };

  const isRegroup = container.dataset.binderMode === 'active';
  const cards = H.getCards(container);
  if (cards.length === 0) return { ok: false, error: 'Aucune carte trouvée sur cette page' };

  container.querySelectorAll('.binder-page-separator, .binder-page-wrapper, .binder-placeholder').forEach(el => el.remove());

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
      const title = document.createElement('div');
      title.style.cssText = 'color: white; font-weight: bold; font-size: 16px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);';
      title.textContent = `📄 Page ${page + 1} / ${totalPages}`;
      separator.appendChild(title);
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

  return {
    ok: true,
    count: cards.length,
    pages: totalPages,
    warning: H.hasPagination() ? 'Seule la page de résultats affichée est groupée.' : undefined
  };
}

function removePageSeparators() {
  const H = globalThis.ScanFlipHelpers;
  const container = document.querySelector('[data-binder-mode="active"]');
  if (!container) return { ok: false, error: 'Aucun groupement actif sur cette page' };

  const cards = H.getCards(container);

  if (container.dataset.originalGridStyles !== undefined) container.className = container.dataset.originalGridStyles;
  container.style.cssText = container.dataset.originalStyles || '';
  delete container.dataset.binderMode;
  delete container.dataset.originalGridStyles;
  delete container.dataset.originalStyles;

  cards.forEach(card => {
    card.style.maxWidth = '';
    card.style.margin = '';
  });
  container.replaceChildren(...cards);

  return { ok: true, count: cards.length };
}

function getBinderState() {
  const container = document.querySelector('[data-binder-mode="active"]');
  return {
    ok: true,
    active: !!container,
    pages: container ? container.querySelectorAll('.binder-page-wrapper').length : 0
  };
}

function extractCardData(selector) {
  const H = globalThis.ScanFlipHelpers;
  const container = H.findCardsContainer(selector);
  if (!container) return { ok: false, error: 'Impossible de trouver le conteneur des cartes' };

  const cards = H.getCards(container);
  const OWNED_BADGE = '[title="Modifier dans ma collection"]';
  // Le badge "Modifier dans ma collection" ne dépend pas du réglage "griser les cartes non possédées".
  // Sans aucun badge (déconnecté, ou rien de possédé), on retombe sur l'image grisée.
  const useBadge = !!container.querySelector(OWNED_BADGE);

  const data = cards.map(card => {
    const nameEl = card.querySelector('.font-bold');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const codeEl = card.querySelector('span.min-w-fit.text-xs.text-muted-foreground.font-bold');
    const code = codeEl ? codeEl.textContent.trim() : '';
    const setEl = card.querySelector('.italic.text-muted-foreground');
    const setName = setEl ? setEl.textContent.trim() : '';

    let owned;
    if (useBadge) {
      const badge = card.querySelector(OWNED_BADGE);
      const qty = badge ? parseInt(badge.textContent.replace(/\D/g, ''), 10) : 0;
      owned = !!badge && (isNaN(qty) || qty > 0);
    } else {
      const img = card.querySelector('img[class*="aspect-"]');
      owned = img ? !img.classList.contains('grayscale-100') : false;
    }

    return name && code ? { name, code, setName, owned } : null;
  }).filter(Boolean);

  return {
    ok: true,
    data,
    warning: H.hasPagination() ? 'Seule la page de résultats affichée est copiée.' : undefined
  };
}

// --- Actions du popup ---

async function sortCards(ascending = false) {
  try {
    const res = await runOnTab(EXPANSIONS_URL, 'Le tri fonctionne uniquement sur la page des extensions', sortExtensions, [ascending, EXPANSIONS_SELECTOR]);
    if (!res) return;
    showStatus(`✓ ${res.value.count} extensions triées !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

function csvField(value, separator) {
  const text = String(value ?? '');
  return text.includes(separator) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function exportCsv() {
  try {
    const res = await runOnTab(EXPANSIONS_URL, "L'export fonctionne uniquement sur la page des extensions", extractExtensionsData, [EXPANSIONS_SELECTOR]);
    if (!res) return;

    const data = res.value.data;
    if (!data || data.length === 0) { showStatus('Aucune donnée à exporter', true); return; }

    const separator = '$';
    const toLine = fields => fields.map(f => csvField(f, separator)).join(separator);
    const header = toLine(['Nom', 'ID', 'Completion (%)', 'Possédées', 'Total', 'Date de sortie']);
    const lines = data.map(item => toLine([item.name, item.id, item.percent, item.owned, item.total, item.date]));
    const csvContent = [header, ...lines].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanflip-${res.game}-extensions.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus(`✓ CSV exporté (${data.length} extensions) !`);
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  }
}

async function refreshBinderState() {
  const el = document.getElementById('binderState');
  const resetBtn = document.getElementById('resetGrouping');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !CARDS_URL.test(tab.url)) {
      el.textContent = '';
      resetBtn.disabled = true;
      return;
    }
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getBinderState });
    const state = injection && injection.result;
    const active = !!(state && state.active);
    el.textContent = active ? `● Classeur actif (${state.pages} pages)` : '○ Aucun classeur actif';
    el.className = active ? 'active' : '';
    resetBtn.disabled = !active;
  } catch (error) {
    el.textContent = '';
    resetBtn.disabled = false;
  }
}

async function groupByBinderPages() {
  try {
    const width = parseInt(document.getElementById('binderWidth').value);
    const height = parseInt(document.getElementById('binderHeight').value);
    const startPosition = parseInt(document.getElementById('startPosition').value);

    if (!width || !height || width < 1 || height < 1) { showStatus('Veuillez entrer des dimensions valides', true); return; }
    if (!startPosition || startPosition < 1) { showStatus('La position de départ doit être au minimum 1', true); return; }

    const res = await runOnTab(CARDS_URL, 'Le groupement fonctionne uniquement sur la page des cartes', groupCardsByPages, [width, height, startPosition, CARDS_SELECTOR]);
    if (!res) return;
    showStatus(withWarning(`✓ ${res.value.count} cartes en ${res.value.pages} pages de ${width}x${height} (départ: case ${startPosition}) !`, res.value));
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  } finally {
    refreshBinderState();
  }
}

async function resetGrouping() {
  try {
    const res = await runOnTab(CARDS_URL, 'Le groupement fonctionne uniquement sur la page des cartes', removePageSeparators);
    if (!res) return;
    showStatus('✓ Groupement réinitialisé !');
  } catch (error) {
    showStatus('Erreur: ' + error.message, true);
  } finally {
    refreshBinderState();
  }
}

// Format "liste d'achat" Cardmarket : 1 Nom (Extension)
function cardmarketLine(card, game) {
  if (game === 'yugioh') return `1 ${card.name} (${card.code.split('-')[0]})`;
  // Pokémon : le code est "012/128", sans code d'extension ; on utilise le nom de l'extension
  return card.setName ? `1 ${card.name} (${card.setName})` : `1 ${card.name}`;
}

async function copyCards(mode) {
  try {
    const res = await runOnTab(CARDS_URL, 'Cette fonction fonctionne uniquement sur la page des cartes', extractCardData, [CARDS_SELECTOR]);
    if (!res) return;

    let cards = res.value.data;
    if (!cards || cards.length === 0) { showStatus('Aucune carte trouvée', true); return; }

    if (mode === 'missing' || mode === 'cardmarket') {
      cards = cards.filter(c => !c.owned);
    }

    if (cards.length === 0) { showStatus('Aucune carte manquante !'); return; }

    const lines = mode === 'cardmarket'
      ? cards.map(c => cardmarketLine(c, res.game))
      : cards.map(c => `${c.name} ${c.code}`);

    await navigator.clipboard.writeText(lines.join('\n'));
    const label = mode === 'all' ? 'cartes' : 'cartes manquantes';
    showStatus(withWarning(`✓ ${lines.length} ${label} copiées !`, res.value));
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

refreshBinderState();
