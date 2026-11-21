import { z } from 'zod';

export const placements = ['Showreel', 'Film unggulan', 'Klip'] as const;
export const mediaKinds = ['video', 'poster', 'captions'] as const;
export const mediaLimits = { video: 100 * 1024 * 1024, poster: 12 * 1024 * 1024, captions: 256 * 1024 };
const line = (max: number) => z.string().trim().min(1).max(max);
const text = (max: number) => z.string().trim().max(max);
const position = z.number().int().min(0).max(9999);
export const filmSchema = z.strictObject({
  name: line(100), type: text(90), description: text(2300), posterAlt: text(220),
  placement: z.enum(placements), language: z.enum(['id', 'en']), position, published: z.boolean(),
  visualSource: text(250), soundCredit: text(250),
});
export const creditSchema = z.strictObject({ name: line(100), role: line(140), studio: text(100), position });
export const revision = z.number().int().min(1).max(2147483646);
export const slugSchema = z.string().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung.');
export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(1).max(256),
});
export type FilmInput = z.infer<typeof filmSchema>;
export type FilmCredit = z.infer<typeof creditSchema> & { id: number };
export type MediaKind = (typeof mediaKinds)[number];
export type Film = FilmInput & {
  id: number; slug: string; revision: number; duration: number; hasAudio: boolean; hasVideo: boolean;
  hasPoster: boolean; hasCaptions: boolean; credits: FilmCredit[];
};

export function slugFromTitle(title: string) {
  return title.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90).replace(/-$/, '');
}

export function mediaUrl(film: { id: number; revision: number }, kind: MediaKind, admin = false) {
  return '/api/' + (admin ? 'admin/' : '') + 'films/' + film.id + '/media/' + kind + '?v=' + film.revision;
}

export function durationLabel(seconds: number) {
  return seconds < 60 ? seconds + ' detik' : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
