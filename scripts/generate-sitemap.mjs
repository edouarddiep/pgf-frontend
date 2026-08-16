import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const SITE_ORIGIN = 'https://www.pierrette-gonsethfavre.ch';
const BROWSER_DIR = 'dist/pgf-frontend/browser';
const CANONICAL_PATTERN = /<link rel="canonical" href="([^"]+)"/;
const ALTERNATE_PATTERN = /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g;
const NOINDEX_PATTERN = /<meta name="robots" content="noindex/;

async function findIndexFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return findIndexFiles(path);
    }
    return entry.name === 'index.html' ? [path] : [];
  }));
  return files.flat();
}

function toUrl(file) {
  const dir = relative(BROWSER_DIR, file).split(sep).slice(0, -1).join('/');
  return `${SITE_ORIGIN}${dir ? `/${dir}` : ''}`;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const files = await findIndexFiles(BROWSER_DIR);
const entries = [];
let skipped = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const canonical = html.match(CANONICAL_PATTERN)?.[1];
  const url = toUrl(file);

  // On ne référence que les pages canoniques d'elles-mêmes et indexables : les doublons
  // (une œuvre présente dans plusieurs catégories), la racine de redirection et la 404 sont écartés.
  if (!canonical || canonical !== url || NOINDEX_PATTERN.test(html)) {
    skipped++;
    continue;
  }

  const alternates = [...html.matchAll(ALTERNATE_PATTERN)]
    .map(([, hreflang, href]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`);

  entries.push(`  <url>\n    <loc>${escapeXml(url)}</loc>\n${alternates.join('\n')}\n  </url>`);
}

entries.sort();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

await writeFile(join(BROWSER_DIR, 'sitemap.xml'), sitemap);
console.log(`sitemap.xml : ${entries.length} URLs canoniques (${skipped} écartées)`);

// Vercel sert automatiquement 404.html, avec le bon code HTTP, sur toute URL sans fichier correspondant.
const notFound = await readFile(join(BROWSER_DIR, '404', 'index.html'), 'utf8');
await writeFile(join(BROWSER_DIR, '404.html'), notFound);
console.log('404.html : page personnalisée générée');

// Angular génère à la racine un index.html de redirection méta vers /fr-ch. Vercel s'en sert
// comme fallback SPA et répond 200 sur toute URL inconnue, ce qui masque les 404. La racine étant
// déjà traitée par la redirection 308 de vercel.json, ce fichier est inutile : on le supprime.
await rm(join(BROWSER_DIR, 'index.html'), { force: true });
console.log('index.html racine supprimé (fallback SPA qui masquait les 404)');
