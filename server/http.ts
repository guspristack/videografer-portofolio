import { Router, type NextFunction, type Request, type Response } from 'express';
import pgSession from 'connect-pg-simple';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginSchema } from '../shared/content';
import { pool, prisma } from './database';
import { hashPassword, verifyPassword } from './password';

declare module 'express-session' {
  interface SessionData {
    ownerId?: number;
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const key = issue.path.join('.');
  throw new HttpError(400, key ? `Periksa isian ${key}. ${issue.message}` : 'Periksa isian yang dikirim.');
}

export function contentId(raw: string | string[]) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw)) throw new HttpError(404, 'Data tidak ditemukan.');
  const id = Number(raw);
  if (id > 2147483647) throw new HttpError(404, 'Data tidak ditemukan.');
  return id;
}

export function sameOrigin(origin: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('origin') !== origin) return next(new HttpError(403, 'Asal permintaan tidak diizinkan.'));
    next();
  };
}

export function limitRequests(max: number, windowMs: number, message: string) {
  return rateLimit({ windowMs, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: message } });
}

export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.ownerId) return next(new HttpError(401, 'Masuk sebagai admin untuk melanjutkan.'));
  next();
}

export function authRoutes(secret: string, secure: boolean) {
  const router = Router();
  const Store = pgSession(session);
  const cookieName = secure ? '__Host-bayu-session' : 'bayu-session';
  const cookie = { path: '/', httpOnly: true, secure, sameSite: 'lax' as const };
  const dummyHash = hashPassword('unused-login-placeholder');

  router.use(session({
    name: cookieName,
    secret,
    store: new Store({ pool, tableName: 'session' }),
    resave: false,
    saveUninitialized: false,
    cookie: { ...cookie, maxAge: 8 * 60 * 60 * 1000 },
  }));

  router.post('/login', limitRequests(8, 15 * 60 * 1000, 'Terlalu banyak percobaan masuk. Coba lagi nanti.'), async (req, res) => {
    const { email, password } = validate(loginSchema, req.body);
    const admin = await prisma.admin.findUnique({ where: { email } });
    const matches = await verifyPassword(password, admin?.passwordHash ?? await dummyHash);
    if (!admin || !matches) throw new HttpError(401, 'Email atau kata sandi salah.');

    await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.ownerId = admin.id;
    await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.json({ authenticated: true });
  });

  router.use(requireOwner);
  router.get('/session', (_req, res) => res.json({ authenticated: true }));
  router.post('/logout', async (req, res) => {
    await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie(cookieName, cookie).sendStatus(204);
  });

  return router;
}
