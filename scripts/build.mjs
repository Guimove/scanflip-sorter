// Construit dist/scanflip-sorter-<version>.zip avec uniquement les fichiers de l'extension.
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILES = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'page-helpers.js',
  'icon16.png',
  'icon48.png',
  'icon128.png'
];

const { version } = JSON.parse(readFileSync('manifest.json', 'utf8'));
const out = `dist/scanflip-sorter-${version}.zip`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
execFileSync('zip', ['-q', '-X', out, ...FILES], { stdio: 'inherit' });
console.log(out);
