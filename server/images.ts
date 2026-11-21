import sharp from 'sharp';

export async function preparePhoto(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 30000000, failOn: 'error' });
  const { format, pages } = await image.metadata();
  if (!format || !['jpeg', 'png', 'webp'].includes(format) || (pages ?? 1) > 1) {
    throw new Error('Expected a single JPEG, PNG or WebP image');
  }
  const full = await image.rotate().resize({ width: 2500, height: 2500, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
  const thumbnail = await sharp(full.data).resize({ width: 820, height: 820, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer();
  return { full: full.data, thumbnail, width: full.info.width, height: full.info.height };
}
