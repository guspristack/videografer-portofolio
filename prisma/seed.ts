import { copyFile, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { disconnectDatabase, prisma } from '../server/database';
import { discard, generatedName, mediaPath, prepareStorage, readCaptions, readVideo, writePoster } from '../server/media';
import { films, reel, shortFilm } from './fixtures';

try {
  await prepareStorage();
  for (const [index, item] of [reel, shortFilm, ...films].entries()) {
    if (await prisma.film.findUnique({ where: { slug: item.id }, select: { id: true } })) continue;
    const videoSource = fileURLToPath(new URL('../src/media/' + item.video + '.mp4', import.meta.url));
    const posterSource = fileURLToPath(new URL('../src/images/' + item.still + '.webp', import.meta.url));
    const mainShort = item.id === shortFilm.id;
    const videoFile = generatedName('mp4');
    const posterFile = generatedName('webp');
    const metadata = await readVideo(videoSource);
    const captions = mainShort ? await readCaptions(fileURLToPath(new URL('../src/media/lampu-terakhir.vtt', import.meta.url))) : '';
    try {
      await copyFile(videoSource, mediaPath(videoFile), constants.COPYFILE_EXCL);
      await writePoster(posterSource, mediaPath(posterFile));
      await prisma.film.create({ data: {
        slug: item.id, name: item.name, type: item.type, description: item.description, language: 'id',
        posterAlt: 'alt' in item && typeof item.alt === 'string' ? item.alt : 'Pedagang pasar malam dan lampu gerobaknya.',
        position: (index + 1) * 10, published: true, placement: index === 0 ? 'Showreel' : mainShort ? 'Film unggulan' : 'Klip',
        visualSource: 'Animatik dari gambar diam yang dibuat dengan ImageGen.',
        soundCredit: mainShort ? 'Desain suara orisinal sintetis. Hujan, desis wajan, dan suasana jalan.' : '',
        videoFile, posterFile, captions, ...metadata,
        credits: { create: { name: 'Bayu Pradana', role: item.role, studio: '', position: 10 } },
      } });
    } catch (error) {
      const saved = await prisma.film.findUnique({ where: { slug: item.id }, select: { videoFile: true } });
      if (saved?.videoFile !== videoFile) {
        await discard(mediaPath(videoFile));
        await discard(mediaPath(posterFile));
      }
      throw error;
    }
  }
  console.log('Lima video dan poster contoh tersedia.');
} finally {
  await disconnectDatabase();
}
