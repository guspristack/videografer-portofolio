import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { FilePathSource, Input, MP4 } from 'mediabunny';
import sharp from 'sharp';
import { HttpError } from './http';

export const mediaRoot = resolve(process.env.MEDIA_ROOT || '.media');
export const stagingRoot = join(mediaRoot, 'incoming');
export const generatedName = (extension: 'mp4' | 'webp') => randomUUID() + '.' + extension;
export const mediaPath = (filename: string) => join(mediaRoot, filename);

export async function prepareStorage() {
  await mkdir(stagingRoot, { recursive: true });
}

export async function discard(path: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rm(path, { force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(code ?? '') || attempt === 4) break;
      await wait(100 * (attempt + 1));
    }
  }
  console.error('Berkas lama belum bisa dibersihkan.');
}

export async function readVideo(path: string) {
  const source = new Input({ formats: [MP4], source: new FilePathSource(path) });
  try {
    const track = await source.getPrimaryVideoTrack();
    if (!track || await track.getCodec() !== 'avc') throw new Error('Unsupported MP4 video');
    const audio = await source.getAudioTracks();
    if ((await Promise.all(audio.map((stream) => stream.getCodec()))).some((codec) => codec !== 'aac')) {
      throw new Error('Unsupported MP4 audio');
    }
    const seconds = await source.getDurationFromMetadata() ?? await source.computeDuration();
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) throw new Error('Invalid video duration');
    return { duration: Math.max(1, Math.round(seconds)), hasAudio: audio.length > 0 };
  } catch {
    throw new HttpError(415, 'Unggah MP4 dengan video H.264 dan audio AAC jika ada.');
  } finally {
    source.dispose();
  }
}

export async function writePoster(input: string, output: string) {
  let poster: Buffer;
  try {
    const source = sharp(await readFile(input), { limitInputPixels: 30000000, failOn: 'error' });
    const { format, pages } = await source.metadata();
    if (!format || !['jpeg', 'png', 'webp'].includes(format) || (pages ?? 1) > 1) throw new Error('Unsupported poster');
    poster = await source.rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 }).toBuffer();
  } catch {
    throw new HttpError(415, 'Poster harus berupa JPEG, PNG, atau WebP statis, maksimal 30 megapiksel.');
  }
  await writeFile(output, poster, { flag: 'wx' });
}

const cueTime = '(?:\\d{2,}:)?[0-5]\\d:[0-5]\\d\\.\\d{3}';
const cueLine = new RegExp('^(' + cueTime + ')[ \\t]+-->[ \\t]+(' + cueTime + ')(?:[ \\t]+[^\\n]*)?$');
const timestamp = (value: string) => value.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0);

export async function readCaptions(path: string) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)).replace(/\r\n?/g, '\n').trimEnd();
    if (text.includes('\0')) throw new Error('Invalid characters');
    const [header, ...blocks] = text.split(/\n[ \t]*\n+/);
    if (!/^WEBVTT(?:[ \t][^\n]*)?(?:\n|$)/.test(header)) throw new Error('Invalid WebVTT header');
    const cues = blocks.filter((block) => !/^NOTE(?:[ \t]|\n|$)/.test(block));
    if (!cues.length) throw new Error('Missing WebVTT cues');
    for (const block of cues) {
      const lines = block.split('\n');
      const index = lines[0].includes('-->') ? 0 : 1;
      const match = cueLine.exec(lines[index] ?? '');
      if (!match || timestamp(match[2]) <= timestamp(match[1]) || !lines.slice(index + 1).some((line) => line.trim())) {
        throw new Error('Invalid WebVTT cue');
      }
    }
    return text + '\n';
  } catch {
    throw new HttpError(415, 'Unggah file WebVTT UTF-8 dengan takarir dan waktu yang valid.');
  }
}
