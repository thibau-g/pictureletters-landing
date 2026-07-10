import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const jobs = [
  {
    dir: 'assets/samples',
    files: ['son.png', '18.png', 'mum.png', 'heart.png', 'family.png', 'liz.png'],
    widths: [480, 800],
  },
  {
    dir: 'assets/tiles',
    files: ['funerals.jpg', 'birthdays.jpg', 'weddings.jpg', 'just-because.jpg'],
    widths: [400, 640, 800, 1024],
  },
];

async function optimizeOne(inputPath, outDir, baseName, width) {
  const image = sharp(inputPath).rotate();
  const meta = await image.metadata();
  const targetWidth = Math.min(width, meta.width || width);

  const resized = image.clone().resize({
    width: targetWidth,
    withoutEnlargement: true,
  });

  const webpPath = path.join(outDir, `${baseName}-${width}.webp`);
  const jpgPath = path.join(outDir, `${baseName}-${width}.jpg`);

  await resized
    .clone()
    .webp({ quality: 68, effort: 6 })
    .toFile(webpPath);

  await resized
    .clone()
    .jpeg({ quality: 68, mozjpeg: true })
    .toFile(jpgPath);

  const [webpStat, jpgStat] = await Promise.all([
    fs.stat(webpPath),
    fs.stat(jpgPath),
  ]);

  const outMeta = await sharp(webpPath).metadata();
  console.log(
    `  ${path.basename(webpPath)} ${outMeta.width}x${outMeta.height} ${(webpStat.size / 1024).toFixed(1)}KB | ` +
      `${path.basename(jpgPath)} ${(jpgStat.size / 1024).toFixed(1)}KB`
  );

  return { width: outMeta.width, height: outMeta.height };
}

async function main() {
  const dimensions = {};

  for (const job of jobs) {
    const dir = path.join(root, job.dir);
    console.log(`\n${job.dir}`);

    for (const file of job.files) {
      const inputPath = path.join(dir, file);
      const baseName = path.parse(file).name;
      console.log(`\n${file}`);

      let dims = null;
      for (const width of job.widths) {
        dims = await optimizeOne(inputPath, dir, baseName, width);
      }

      // Prefer largest generated size for intrinsic HTML attributes
      dimensions[`${job.dir}/${baseName}`] = dims;
    }
  }

  const manifestPath = path.join(root, 'scripts/image-dimensions.json');
  await fs.writeFile(manifestPath, JSON.stringify(dimensions, null, 2) + '\n');
  console.log(`\nWrote ${path.relative(root, manifestPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
