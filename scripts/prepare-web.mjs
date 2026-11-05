import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist-web');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const ITEMS = ['index.html', 'styles', 'src', 'assets'];

for (const item of ITEMS) {
  const srcPath = path.join(ROOT, item);
  const dstPath = path.join(OUT, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, dstPath, { recursive: true });
  }
}

console.log('dist-web preparado correctamente en:', OUT);
