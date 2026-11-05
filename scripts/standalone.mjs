/** Bundle dist into a single offline HTML (best-effort). */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

function walk(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = join(base, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, rel));
    else out.push({ abs: p, rel: rel.replace(/\\/g, '/') });
  }
  return out;
}

const files = walk(dist).filter((f) => f.rel !== 'index.html');
for (const f of files) {
  if (f.rel.endsWith('.js')) {
    const js = readFileSync(f.abs, 'utf8');
    // replace script src
    html = html.replace(
      new RegExp(`<script[^>]+src="[^"]*${f.rel.split('/').pop()}[^"]*"[^>]*></script>`),
      `<script type="module">\n${js}\n</script>`
    );
  }
  if (f.rel.endsWith('.css')) {
    const css = readFileSync(f.abs, 'utf8');
    html = html.replace(
      new RegExp(`<link[^>]+href="[^"]*${f.rel.split('/').pop()}[^"]*"[^>]*>`),
      `<style>\n${css}\n</style>`
    );
  }
}
writeFileSync(join(dist, 'standalone.html'), html);
console.log('Wrote dist/standalone.html');
