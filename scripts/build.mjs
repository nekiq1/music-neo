// Сборка без Vite: esbuild (JS/TSX) + Tailwind v4 (compile API) → dist/
// Запуск: npm run build   |   npm run dev (watch)
import { build, transform } from 'esbuild';
import { compile } from 'tailwindcss';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const require = createRequire(import.meta.url);
const watching = process.argv.includes('--watch');
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 10);

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}

// --- Tailwind: ищем кандидатов-классов в исходниках и компилируем src/styles.css ---
async function buildCss() {
  const input = await readFile(join(root, 'src/styles.css'), 'utf8');
  const twDir = dirname(require.resolve('tailwindcss/package.json'));
  const compiler = await compile(input, {
    base: join(root, 'src'),
    onDependency: () => {},
    async loadStylesheet(id, base) {
      let path;
      if (id === 'tailwindcss') path = join(twDir, 'index.css');
      else if (id.startsWith('tailwindcss/')) { path = join(twDir, id.slice(12)); if (!extname(path)) path += '.css'; }
      else path = resolve(base, id);
      return { path, base: dirname(path), content: await readFile(path, 'utf8') };
    },
    async loadModule() { throw new Error('Плагины Tailwind не используются'); },
  });
  const files = [...(await walk(join(root, 'src'))).filter(f => /\.(tsx?|css)$/.test(f)), join(root, 'index.html')];
  const cand = new Set();
  for (const f of files) for (const m of (await readFile(f, 'utf8')).matchAll(/[^<>"'`\s]*[^<>"'`\s:]/g)) cand.add(m[0]);
  const css = compiler.build([...cand]);
  const out = await transform(css, { loader: 'css', minify: !watching, target: ['safari15', 'chrome90', 'firefox90'] });
  return out.code;
}

async function run() {
  const t0 = Date.now();
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, 'assets'), { recursive: true });

  const js = await build({
    entryPoints: [join(root, 'src/main.tsx')], bundle: true, write: false, format: 'esm', outdir: join(dist, 'assets'),
    minify: !watching, sourcemap: false, jsx: 'automatic', target: ['safari15', 'chrome90', 'firefox90'],
    define: { 'process.env.NODE_ENV': watching ? '"development"' : '"production"' }, logLevel: 'warning',
    alias: { '@': join(root, 'src') },
  });
  const jsCode = js.outputFiles[0].text, jsName = `app-${hash(jsCode)}.js`;
  const cssCode = await buildCss(), cssName = `app-${hash(cssCode)}.css`;
  await writeFile(join(dist, 'assets', jsName), jsCode);
  await writeFile(join(dist, 'assets', cssName), cssCode);

  // статика (иконки, manifest, sw.js); в sw.js подставляем версию сборки
  await cp(join(root, 'public'), dist, { recursive: true });
  const swPath = join(dist, 'sw.js');
  try { await writeFile(swPath, (await readFile(swPath, 'utf8')).replace('__BUILD__', hash(jsCode + cssCode))); } catch {}

  let html = await readFile(join(root, 'index.html'), 'utf8');
  html = html.replace('</head>', `<link rel="stylesheet" href="/assets/${cssName}">\n</head>`)
    .replace('</body>', `<script type="module" src="/assets/${jsName}"></script>\n</body>`);
  await writeFile(join(dist, 'index.html'), html);

  const kb = async n => ((await stat(join(dist, 'assets', n))).size / 1024).toFixed(1);
  console.log(`build ok in ${Date.now() - t0} ms · ${jsName} ${await kb(jsName)} KB · ${cssName} ${await kb(cssName)} KB`);
}

await run();
if (watching) {
  let timer;
  const again = () => { clearTimeout(timer); timer = setTimeout(() => run().catch(e => console.error(e.message)), 150); };
  for (const d of ['src', 'public']) watch(join(root, d), { recursive: true }, again);
  watch(join(root, 'index.html'), again);
  console.log('watching…');
}
