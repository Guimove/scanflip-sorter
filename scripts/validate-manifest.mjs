// Vérifie le manifest : MV3, version valide, fichiers référencés présents,
// et version égale au tag Git quand la CI tourne sur un tag (vX.Y[.Z]).
import { readFileSync, existsSync } from 'node:fs';

const errors = [];
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

if (manifest.manifest_version !== 3) errors.push('manifest_version doit être 3');
for (const key of ['name', 'version', 'description']) {
  if (!manifest[key]) errors.push(`champ "${key}" manquant`);
}
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version || '')) errors.push(`version invalide : ${manifest.version}`);
if ((manifest.description || '').length > 132) errors.push('description > 132 caractères (limite Chrome Web Store)');

const files = new Set([
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  manifest.action?.default_popup
].filter(Boolean));

// Scripts chargés par les pages HTML et fichiers injectés via chrome.scripting
for (const html of [...files].filter(f => f.endsWith('.html'))) {
  if (!existsSync(html)) continue;
  for (const [, src] of readFileSync(html, 'utf8').matchAll(/<script[^>]+src="([^"]+)"/g)) files.add(src);
}
for (const [, f] of readFileSync('popup.js', 'utf8').matchAll(/files:\s*\[\s*'([^']+)'/g)) files.add(f);

for (const f of files) if (!existsSync(f)) errors.push(`fichier référencé introuvable : ${f}`);

const ref = process.env.GITHUB_REF || '';
if (ref.startsWith('refs/tags/v')) {
  const tagVersion = ref.slice('refs/tags/v'.length);
  if (tagVersion !== manifest.version) errors.push(`tag v${tagVersion} ≠ version du manifest ${manifest.version}`);
}

if (errors.length) {
  console.error('Manifest invalide :\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`Manifest OK (v${manifest.version}, ${files.size} fichiers référencés)`);
