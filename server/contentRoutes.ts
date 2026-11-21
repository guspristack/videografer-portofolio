import { rename } from 'node:fs/promises';
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { creditSchema, filmSchema, mediaKinds, mediaLimits, revision, slugSchema, type MediaKind } from '../shared/content';
import type { Film, FilmCredit, Prisma } from './generated/prisma/client';
import { prisma } from './database';
import { contentId, HttpError, limitRequests, validate } from './http';
import { discard, generatedName, mediaPath, mediaRoot, readCaptions, readVideo, stagingRoot, writePoster } from './media';

const order = [{ position: 'asc' as const }, { id: 'asc' as const }];
const creditMeta = { id: true, name: true, role: true, studio: true, position: true };
const include = { credits: { orderBy: order, select: creditMeta } };
const mediaKind = z.enum(mediaKinds);
const getVersion = z.strictObject({ revision: z.coerce.number().pipe(revision) });
const uploadLimit = limitRequests(24, 10 * 60 * 1000, 'Terlalu banyak unggahan. Coba lagi nanti.');
const uploads = {
  video: mediaUpload('video'), poster: mediaUpload('poster'), captions: mediaUpload('captions'),
};

function mediaUpload(kind: MediaKind) {
  return multer({
    dest: stagingRoot,
    limits: { fileSize: mediaLimits[kind], files: 1, fields: 1, fieldSize: 50, parts: 4 },
  }).single('file');
}

function metadata(row: Film & { credits: Omit<FilmCredit, 'filmId'>[] }) {
  const { videoFile, posterFile, captions, ...fields } = row;
  return { ...fields, hasVideo: Boolean(videoFile), hasPoster: Boolean(posterFile), hasCaptions: Boolean(captions) };
}

async function resultFor(id: number) {
  return metadata(await prisma.film.findUniqueOrThrow({ where: { id }, include }));
}

function serve(publicOnly: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = contentId(req.params.id);
    const kind = validate(mediaKind, req.params.kind);
    const row = await prisma.film.findFirst({
      where: { id, ...(publicOnly ? { published: true } : {}) },
      select: { revision: true, videoFile: true, posterFile: true, captions: true },
    });
    if (!row || (req.query.v !== undefined && req.query.v !== String(row.revision))) throw new HttpError(404, 'Media film tidak tersedia pada versi ini.');
    if (kind === 'captions') {
      if (!row.captions) throw new HttpError(404, 'Takarir belum tersedia.');
      res.type('text/vtt').send(row.captions);
      return;
    }
    const filename = kind === 'video' ? row.videoFile : row.posterFile;
    if (!filename) throw new HttpError(404, 'Media belum tersedia.');
    res.type(kind === 'video' ? 'video/mp4' : 'image/webp');
    res.sendFile(filename, { root: mediaRoot, cacheControl: false, acceptRanges: true }, (error) => {
      if (!error) return;
      if (res.headersSent) { next(error); return; }
      res.removeHeader('Content-Type');
      const failure = error as Error & { status?: number; headers?: Record<string, string> };
      if (failure.status === 416) {
        const range = failure.headers?.['Content-Range'] ?? failure.headers?.['content-range'];
        if (range) res.set('Content-Range', String(range));
        next(new HttpError(416, 'Rentang video tidak tersedia.'));
      } else if (failure.status === 404) next(new HttpError(404, 'Berkas media tidak tersedia.'));
      else next(error);
    });
  };
}

export const publicRoutes = Router();
publicRoutes.get('/films', async (_req, res) => {
  const films = await prisma.film.findMany({ where: { published: true, videoFile: { not: null } }, include, orderBy: order });
  res.json(films.map(metadata));
});
publicRoutes.get('/films/:id/media/:kind', serve(true));

export const adminRoutes = Router();
adminRoutes.get('/films', async (_req, res) => {
  res.json((await prisma.film.findMany({ include, orderBy: order })).map(metadata));
});
adminRoutes.get('/films/:id/media/:kind', serve(false));
adminRoutes.post('/films', async (req, res) => {
  const data = validate(filmSchema.extend({ slug: slugSchema }), req.body);
  if (data.published) throw new HttpError(400, 'Simpan draf dan unggah video sebelum menerbitkan.');
  res.status(201).json(metadata(await prisma.film.create({ data, include })));
});
adminRoutes.put('/films/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: version, ...data } = validate(filmSchema.extend({ revision }), req.body);
  const result = await prisma.$transaction(async (db) => {
    const current = await db.film.findUnique({ where: { id }, select: { videoFile: true, posterFile: true } });
    if (!current) throw new HttpError(404, 'Film tidak tersedia.');
    if (data.published && (!current.videoFile || !data.type || !data.description)) throw new HttpError(400, 'Lengkapi video, jenis, dan deskripsi sebelum menerbitkan.');
    if (current.posterFile && !data.posterAlt) throw new HttpError(400, 'Isi teks alternatif poster.');
    const saved = await db.film.updateMany({ where: { id, revision: version }, data: { ...data, revision: { increment: 1 } } });
    if (!saved.count) throw new HttpError(409, 'Film sudah berubah. Buka ulang studio.');
    return db.film.findUniqueOrThrow({ where: { id }, include });
  });
  res.json(metadata(result));
});
adminRoutes.delete('/films/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: version } = validate(z.strictObject({ revision }), req.body);
  const rows = await prisma.$transaction(async (db) => {
    const current = await db.film.findUnique({ where: { id }, select: { videoFile: true, posterFile: true } });
    const result = await db.film.deleteMany({ where: { id, revision: version, published: false } });
    if (!result.count) throw new HttpError(409, 'Sembunyikan film atau buka ulang sebelum menghapusnya.');
    return current;
  });
  for (const filename of [rows?.videoFile, rows?.posterFile]) if (filename) await discard(mediaPath(filename));
  res.sendStatus(204);
});

adminRoutes.put('/films/:id/media/:kind', uploadLimit, (req, res, next) => {
  uploads[validate(mediaKind, req.params.kind)](req, res, next);
}, async (req, res) => {
  const file = req.file;
  let newFile: string | undefined;
  let cleanup = true;
  try {
    if (!file?.size) throw new HttpError(400, 'Pilih satu file untuk diunggah.');
    const id = contentId(req.params.id);
    const kind = validate(mediaKind, req.params.kind);
    const { revision: version } = validate(getVersion, req.body);
    const existing = await prisma.film.findUnique({
      where: { id, revision: version }, select: { videoFile: true, posterFile: true, posterAlt: true },
    });
    if (!existing) throw new HttpError(409, 'Film sudah berubah. Buka ulang studio.');
    let prior: string | null = null;
    let data: Prisma.FilmUpdateManyMutationInput;
    if (kind === 'video') {
      const info = await readVideo(file.path);
      newFile = generatedName('mp4');
      await rename(file.path, mediaPath(newFile));
      prior = existing.videoFile;
      data = { videoFile: newFile, ...info };
    } else if (kind === 'poster') {
      if (!existing.posterAlt) throw new HttpError(400, 'Isi teks alternatif poster di tab Film sebelum mengunggah.');
      newFile = generatedName('webp');
      await writePoster(file.path, mediaPath(newFile));
      prior = existing.posterFile;
      data = { posterFile: newFile };
    } else {
      data = { captions: await readCaptions(file.path) };
    }
    // Preserve the new blob if a database connection fails after the write may have committed.
    cleanup = false;
    const saved = await prisma.film.updateMany({ where: { id, revision: version }, data: { ...data, revision: { increment: 1 } } });
    if (!saved.count) {
      cleanup = true;
      throw new HttpError(409, 'Film sudah berubah. Buka ulang studio.');
    }
    if (prior) await discard(mediaPath(prior));
    res.json(await resultFor(id));
  } finally {
    if (file) await discard(file.path);
    if (cleanup && newFile) await discard(mediaPath(newFile));
  }
});

adminRoutes.delete('/films/:id/media/:kind', async (req, res) => {
  const id = contentId(req.params.id);
  const kind = validate(mediaKind, req.params.kind);
  const { revision: version } = validate(z.strictObject({ revision }), req.body);
  const existing = await prisma.film.findUnique({
    where: { id, revision: version }, select: { videoFile: true, posterFile: true, published: true },
  });
  if (!existing) throw new HttpError(409, 'Film sudah berubah. Buka ulang studio.');
  if (kind === 'video' && existing.published) throw new HttpError(409, 'Sembunyikan film sebelum menghapus videonya.');
  const data = kind === 'video' ? { videoFile: null, duration: 0, hasAudio: false }
    : kind === 'poster' ? { posterFile: null } : { captions: '' };
  const saved = await prisma.film.updateMany({ where: { id, revision: version }, data: { ...data, revision: { increment: 1 } } });
  if (!saved.count) throw new HttpError(409, 'Film sudah berubah. Buka ulang studio.');
  const prior = kind === 'video' ? existing.videoFile : kind === 'poster' ? existing.posterFile : null;
  if (prior) await discard(mediaPath(prior));
  res.json(await resultFor(id));
});

adminRoutes.post('/films/:filmId/credits', async (req, res) => {
  const filmId = contentId(req.params.filmId);
  const data = validate(creditSchema, req.body);
  res.status(201).json(await prisma.filmCredit.create({ data: { ...data, filmId }, select: creditMeta }));
});
adminRoutes.put('/films/:filmId/credits/:id', async (req, res) => {
  const where = { filmId: contentId(req.params.filmId), id: contentId(req.params.id) };
  res.json(await prisma.filmCredit.update({ where, data: validate(creditSchema, req.body), select: creditMeta }));
});
adminRoutes.delete('/films/:filmId/credits/:id', async (req, res) => {
  await prisma.filmCredit.delete({ where: { filmId: contentId(req.params.filmId), id: contentId(req.params.id) } });
  res.sendStatus(204);
});
