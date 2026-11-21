import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { MulterError } from 'multer';
import { adminRoutes, publicRoutes } from './contentRoutes';
import { disconnectDatabase } from './database';
import { authRoutes, HttpError, sameOrigin } from './http';
import { prepareStorage } from './media';

const origin = process.env.APP_ORIGIN;
const secret = process.env.SESSION_SECRET;
if (!origin || !/^https?:\/\//.test(origin) || new URL(origin).origin !== origin) {
  throw new Error('APP_ORIGIN harus berisi origin HTTP(S) tanpa path atau garis miring di akhir.');
}
if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Isi SESSION_SECRET dengan nilai acak minimal 32 byte.');
const secure = origin.startsWith('https:');
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isSafeInteger(proxyHops) || proxyHops < 0) throw new Error('TRUST_PROXY_HOPS harus berupa bilangan bulat nonnegatif.');
const port = Number(process.env.PORT || 4180);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT tidak valid.');
const host = process.env.HOST || '127.0.0.1';

const app = express();
app.disable('x-powered-by');
if (proxyHops) app.set('trust proxy', proxyHops);
app.use(helmet({
  contentSecurityPolicy: secure ? undefined : { directives: { upgradeInsecureRequests: null } },
  strictTransportSecurity: secure,
}));

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', sameOrigin(origin), express.json({ limit: '256kb' }));
app.use('/api/admin', authRoutes(secret, secure), adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const index = fileURLToPath(new URL('../dist/index.html', import.meta.url));
app.use('/assets', express.static(fileURLToPath(new URL('../dist/assets/', import.meta.url)), { immutable: true, maxAge: '1y' }));
app.use(express.static(dist, { index: false }));
app.get(['/', '/admin'], (_req, res) => res.sendFile(index, { maxAge: 0 }));
app.use((_req, res) => res.status(404).type('text').send('Halaman tidak ditemukan.'));

const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const details = error as { code?: string; type?: string; name?: string };
  if (details?.code === 'P2002') {
    res.status(409).json({ error: 'Alamat film sudah digunakan.' });
    return;
  }
  if (details?.code === 'P2003') {
    res.status(409).json({ error: 'Film yang terkait sudah berubah.' });
    return;
  }
  if (error instanceof MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran berkas melebihi batas untuk jenis media ini.' : 'Periksa format unggahan dan pilih satu file.' });
    return;
  }
  if (details?.code === 'P2025') {
    res.status(404).json({ error: 'Data tidak ditemukan.' });
    return;
  }
  if (details?.type === 'entity.parse.failed' || details?.type === 'entity.too.large') {
    res.status(details.type === 'entity.too.large' ? 413 : 400).json({ error: 'Format atau ukuran permintaan tidak valid.' });
    return;
  }
  console.error('Permintaan gagal.', details?.name, details?.code);
  res.status(500).json({ error: 'Terjadi kesalahan pada server. Coba lagi nanti.' });
};
app.use(handleError);

await prepareStorage();
const server = app.listen(port, host, () => console.log(`Server Bayu berjalan di http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => {
    void disconnectDatabase().catch(() => { process.exitCode = 1; }).finally(() => process.exit());
  }));
}
