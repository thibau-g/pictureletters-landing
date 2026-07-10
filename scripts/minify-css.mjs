import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'styles.css');
const output = path.join(root, 'styles.min.css');

const source = fs.readFileSync(input, 'utf8');
const result = new CleanCSS({ level: 2 }).minify(source);

if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}

fs.writeFileSync(output, result.styles);
console.log(
  `styles.min.css ${(result.styles.length / 1024).toFixed(1)}KB ` +
    `(from ${(source.length / 1024).toFixed(1)}KB)`
);
