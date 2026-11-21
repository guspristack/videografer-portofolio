import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { durationLabel, mediaLimits, mediaUrl, placements, type Film, type FilmCredit, type MediaKind } from '../../shared/content';
import { slugFromTitle } from '../../shared/content';
import { ApiError, errorText } from '../api';
import styles from './Admin.module.css';

export type StudioRequest = <T>(path: string, options?: { method?: string; data?: unknown }) => Promise<T>;
const value = (form: FormData, name: string) => String(form.get(name) ?? '');

function Field({ name, label, initial, max, required, rows }: {
  name: string; label: string; initial?: string; max: number; required?: boolean; rows?: number;
}) {
  const id = useId();
  return <label><span id={id}>{label}</span>{rows ? <textarea name={name} aria-labelledby={id} defaultValue={initial} maxLength={max} required={required} rows={rows} />
    : <input name={name} aria-labelledby={id} defaultValue={initial} maxLength={max} required={required} />}</label>;
}

function Editor({ children, onSave, onRemove, removePrompt, onClose, submitLabel }: {
  children: ReactNode; onSave: (data: FormData) => Promise<void>; onRemove?: () => Promise<void>; removePrompt?: string;
  onClose?: () => void; submitLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await action(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => onSave(form));
  }
  return (
    <form className={styles.editor} onSubmit={submit}>
      <fieldset className={styles.fields} disabled={busy}>
        {children}
        <div className={styles.actions}>
          <button className={styles.primary} type="submit">{busy ? 'Memproses…' : submitLabel}</button>
          {onClose && <button className={styles.secondary} type="button" onClick={onClose}>Batal</button>}
          {onRemove && <button className={styles.danger} type="button" onClick={() => {
            if (window.confirm(removePrompt ?? 'Hapus entri ini?')) void run(onRemove);
          }}><Trash2 size={16} aria-hidden="true" /> Hapus</button>}
        </div>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}

function Position({ initial }: { initial: number }) {
  return <label>Urutan tampil<input name="position" type="number" min={0} max={9999} defaultValue={initial} required /></label>;
}

export function FilmForm({ film, nextPosition, request, onSaved, onRemoved }: {
  film?: Film; nextPosition: number; request: StudioRequest; onSaved: (film: Film) => void; onRemoved: () => void;
}) {
  const [name, setName] = useState(film?.name ?? '');
  const [slugEdit, setSlugEdit] = useState<string>();
  const slug = film?.slug ?? slugEdit ?? slugFromTitle(name);
  const path = '/admin/films' + (film ? '/' + film.id : '');
  return (
    <Editor submitLabel="Simpan film" onSave={async (form) => {
      onSaved(await request<Film>(path, {
        method: film ? 'PUT' : 'POST',
        data: {
          name, type: value(form, 'type'), description: value(form, 'description'), posterAlt: value(form, 'posterAlt'),
          placement: value(form, 'placement'), language: value(form, 'language'), position: Number(value(form, 'position')),
          published: form.has('published'), visualSource: value(form, 'visualSource'), soundCredit: value(form, 'soundCredit'),
          ...(film ? { revision: film.revision } : { slug }),
        },
      }));
    }} removePrompt="Hapus film, berkas media, dan kredit produksinya?" onRemove={film && !film.published ? async () => {
      await request(path, { method: 'DELETE', data: { revision: film.revision } });
      onRemoved();
    } : undefined}>
      <div className={styles.columns}>
        <label>Judul film<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label>Alamat film<input value={slug} onChange={(event) => setSlugEdit(event.target.value)} readOnly={!!film}
          minLength={2} maxLength={90} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
        <Field name="type" label="Jenis film" initial={film?.type} max={90} />
        <label htmlFor="film-placement">Posisi galeri<select name="placement" id="film-placement" defaultValue={film?.placement ?? 'Klip'}>
          {placements.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <Field name="posterAlt" label="Teks alternatif poster" initial={film?.posterAlt} max={220} />
        <label htmlFor="caption-language">Bahasa takarir<select name="language" id="caption-language" defaultValue={film?.language ?? 'id'}>
          <option value="id">Bahasa Indonesia</option><option value="en">English</option>
        </select></label>
        <Position initial={film?.position ?? nextPosition} />
      </div>
      <Field name="description" label="Deskripsi film" initial={film?.description} max={2300} rows={4} />
      <div className={styles.columns}>
        <Field name="visualSource" label="Sumber visual" initial={film?.visualSource} max={250} />
        <Field name="soundCredit" label="Keterangan audio" initial={film?.soundCredit} max={250} />
      </div>
      <label className={styles.checkbox}><input name="published" type="checkbox" defaultChecked={film?.published} /> Tampilkan film</label>
    </Editor>
  );
}

const formats = [
  { kind: 'video', label: 'Video', format: 'MP4 H.264 · maksimal 100 MB', accept: 'video/mp4,.mp4', present: 'hasVideo' },
  { kind: 'poster', label: 'Poster', format: 'JPEG, PNG, WebP · maksimal 12 MB', accept: 'image/jpeg,image/png,image/webp', present: 'hasPoster' },
  { kind: 'captions', label: 'Takarir', format: 'WebVTT · maksimal 256 KB', accept: '.vtt,text/vtt', present: 'hasCaptions' },
] as const;

export function FilmMedia({ film, request, onSaved }: { film: Film; request: StudioRequest; onSaved: (film: Film, message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(kind: MediaKind, data?: FormData) {
    setBusy(true);
    setError('');
    try {
      if (data) {
        const file = data.get('file');
        if (!(file instanceof File) || !file.size) throw new ApiError(400, 'Pilih satu file untuk diunggah.');
        if (file.size > mediaLimits[kind]) throw new ApiError(413, 'Ukuran berkas melebihi batas.');
        data.set('revision', String(film.revision));
      }
      const result = await request<Film>('/admin/films/' + film.id + '/media/' + kind, {
        method: data ? 'PUT' : 'DELETE', data: data ?? { revision: film.revision },
      });
      onSaved(result, data ? 'Media disimpan.' : 'Media dihapus.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return (
    <section className={styles.media} aria-label="Media film">
      {(film.hasVideo || film.hasPoster) && <figure className={styles.preview}>
        {film.hasVideo ? <video controls playsInline preload="metadata"
          src={mediaUrl(film, 'video', true)} poster={film.hasPoster ? mediaUrl(film, 'poster', true) : undefined} aria-label="Pratinjau video">
          {film.hasCaptions && <track default kind="captions" src={mediaUrl(film, 'captions', true)} srcLang={film.language} label={film.language === 'id' ? 'Bahasa Indonesia' : 'English'} />}
        </video> : <img src={mediaUrl(film, 'poster', true)} alt={film.posterAlt} />}
        <figcaption>{film.hasVideo ? durationLabel(film.duration) + (film.hasAudio ? ' · Dengan audio' : ' · Tanpa audio') : 'Pratinjau poster'}</figcaption>
      </figure>}
      <div className={styles.mediaGrid}>
        {formats.map(({ kind, label, format, accept, present }) => (
          <form className={styles.editor} key={kind} onSubmit={(event) => {
            event.preventDefault();
            void run(kind, new FormData(event.currentTarget));
          }}>
            <fieldset className={styles.fields} disabled={busy}>
              <h2>{label}</h2>
              <p className={styles.meta}>{format}</p>
              <label htmlFor={'upload-' + kind}>File {label.toLowerCase()}</label>
              <input id={'upload-' + kind} name="file" type="file" accept={accept} required />
              <div className={styles.actions}>
                <button className={styles.primary} type="submit">{film[present] ? 'Ganti ' : 'Unggah '}{label.toLowerCase()}</button>
                {film[present] && (kind !== 'video' || !film.published) && (
                  <button className={styles.danger} type="button" onClick={() => {
                    if (window.confirm('Hapus ' + label.toLowerCase() + ' dari film?')) void run(kind);
                  }}>Hapus {label.toLowerCase()}</button>
                )}
              </div>
            </fieldset>
          </form>
        ))}
      </div>
      {busy && <p className={styles.meta} role="status">Memproses media…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}

export function CreditForm({ film, credit, request, onSaved, onRemoved, onClose }: {
  film: Film; credit?: FilmCredit; request: StudioRequest; onSaved: (credit: FilmCredit) => void;
  onRemoved: (id: number) => void; onClose: () => void;
}) {
  const path = '/admin/films/' + film.id + '/credits' + (credit ? '/' + credit.id : '');
  return (
    <Editor submitLabel="Simpan kredit" onClose={onClose} onSave={async (form) => {
      onSaved(await request<FilmCredit>(path, { method: credit ? 'PUT' : 'POST', data: {
        name: value(form, 'name'), role: value(form, 'role'), studio: value(form, 'studio'), position: Number(value(form, 'position')),
      } }));
    }} onRemove={credit ? async () => {
      await request(path, { method: 'DELETE' });
      onRemoved(credit.id);
    } : undefined}>
      <div className={styles.columns}>
        <Field name="name" label="Nama anggota" initial={credit?.name} max={100} required />
        <Field name="role" label="Peran produksi" initial={credit?.role} max={140} required />
        <Field name="studio" label="Studio atau organisasi" initial={credit?.studio} max={100} />
        <Position initial={credit?.position ?? Math.min(9999, (film.credits.at(-1)?.position ?? 0) + 10)} />
      </div>
    </Editor>
  );
}
