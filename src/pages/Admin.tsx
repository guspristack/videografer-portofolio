import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, LockKeyhole, LogOut, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { durationLabel, type Film } from '../../shared/content';
import { api, ApiError, errorText } from '../api';
import { ProjectCredit, ResourceState } from '../components';
import { CreditForm, FilmForm, FilmMedia, type StudioRequest } from './StudioForms';
import styles from './Admin.module.css';

type View = { step: 'loading' | 'login' } | { step: 'error'; message: string } | { step: 'ready'; films: Film[] };
const tabs = ['Film', 'Media', 'Kredit produksi'] as const;
const byPosition = (a: { position: number; id: number }, b: { position: number; id: number }) => a.position - b.position || a.id - b.id;

function Login({ onLogin }: { onLogin: (films: Film[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/admin/login', { method: 'POST', data });
      onLogin(await api<Film[]>('/admin/films'));
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return (
    <div className={styles.page}>
      <main className={styles.loginShell}>
        <Link className={styles.back} to="/">Portofolio Bayu <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <section className={styles.login} aria-labelledby="login-heading">
          <span className={styles.loginIcon}><LockKeyhole size={21} aria-hidden="true" /></span>
          <h1 id="login-heading">Masuk ke studio</h1><p>Kelola film, media, dan kredit produksi.</p>
          <form onSubmit={submit}>
            <fieldset className={styles.fields} disabled={busy}>
              <label>Email admin<input type="email" name="email" autoComplete="username" maxLength={254} required /></label>
              <label>Kata sandi<input type="password" name="password" autoComplete="current-password" maxLength={256} required /></label>
              <button className={styles.primary} type="submit">{busy ? 'Memeriksa…' : 'Masuk'}</button>
            </fieldset>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </form>
        </section>
        <footer className={styles.footer}><ProjectCredit /></footer>
      </main>
    </div>
  );
}

export default function Admin() {
  const [view, setView] = useState<View>({ step: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<number | 'new' | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Film');
  const [creditEditor, setCreditEditor] = useState<number | 'new' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<Film[]>('/admin/films', { signal: controller.signal }).then((films) => {
      if (!controller.signal.aborted) setView({ step: 'ready', films });
    }, (cause) => {
      if (!controller.signal.aborted) setView(cause instanceof ApiError && cause.status === 401 ? { step: 'login' } : { step: 'error', message: errorText(cause) });
    });
    return () => controller.abort();
  }, [attempt]);

  const request: StudioRequest = useCallback(async <T,>(path: string, options?: { method?: string; data?: unknown }) => {
    try { return await api<T>(path, options); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setActive(null);
        setView({ step: 'login' });
      }
      throw cause;
    }
  }, []);

  function open(id: number | 'new' | null) {
    setActive(id);
    setTab('Film');
    setCreditEditor(null);
    setNote('');
    setError('');
  }
  function saveFilm(film: Film, message: string) {
    setView((old) => old.step === 'ready' ? { step: 'ready', films: [...old.films.filter(({ id }) => id !== film.id), film].sort(byPosition) } : old);
    setActive(film.id);
    setNote(message);
  }
  function editCredits(id: number, update: (credits: Film['credits']) => Film['credits'], message: string) {
    setView((old) => old.step === 'ready' ? { step: 'ready', films: old.films.map((film) => film.id === id ? { ...film, credits: update(film.credits) } : film) } : old);
    setCreditEditor(null);
    setNote(message);
  }
  async function logout() {
    setBusy(true);
    setError('');
    try { await request('/admin/logout', { method: 'POST' }); setView({ step: 'login' }); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  if (view.step === 'login') return <Login onLogin={(films) => { open(null); setView({ step: 'ready', films }); }} />;
  if (view.step !== 'ready') return <ResourceState loading="Memuat studio…" error={view.step === 'error' ? view.message : undefined}
    retry={() => { setView({ step: 'loading' }); setAttempt((count) => count + 1); }} />;
  const { films } = view;
  const film = films.find(({ id }) => id === active);
  const editing = Boolean(film) || active === 'new';
  return (
    <div className={styles.page}>
      <header className={styles.topBar}><div className={styles.shell}>
        <span className={styles.wordmark}>Studio Bayu</span>
        <div className={styles.actions}>
          <Link className={styles.back} to="/" target={editing ? '_blank' : undefined} rel={editing ? 'noopener' : undefined}>Portofolio <ArrowUpRight size={15} aria-hidden="true" /></Link>
          {!editing && <button className={styles.secondary} type="button" disabled={busy} onClick={logout}><LogOut size={16} aria-hidden="true" /> Keluar</button>}
        </div>
      </div></header>
      <main className={styles.shell + ' ' + styles.dashboard} onSubmitCapture={() => setNote('')}>
        {editing && <button className={styles.back} type="button" onClick={() => open(null)}><ArrowLeft size={16} aria-hidden="true" /> Daftar film</button>}
        <div className={styles.dashboardHead}>
          <div><h1>{film?.name ?? (editing ? 'Film baru' : 'Film Bayu')}</h1>
            {film && <p className={styles.meta}>{film.published ? 'Tampil' : 'Draf'}{film.hasVideo ? ' · ' + durationLabel(film.duration) : ''}</p>}</div>
          {!editing && <button className={styles.primary} type="button" onClick={() => open('new')}><Plus size={17} aria-hidden="true" /> Buat film</button>}
          {film?.published && <Link className={styles.secondary} to={'/?film=' + film.slug} target="_blank" rel="noopener">Lihat film <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </div>
        {film && <nav className={styles.tabs} aria-label="Bagian film">{tabs.map((item) => (
          <button key={item} type="button" aria-current={item === tab ? 'page' : undefined} onClick={() => { setTab(item); setCreditEditor(null); setNote(''); }}>{item}</button>
        ))}</nav>}
        {note && <p className={styles.notice} role="status">{note}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!editing ? (
          films.length ? <ul className={styles.series}>{films.map((item) => (
            <li key={item.id}><div><h2>{item.name}</h2><p className={styles.meta}>{item.placement} · {item.published ? 'Tampil' : 'Draf'}{item.hasVideo ? ' · ' + durationLabel(item.duration) : ''}</p></div>
              <button className={styles.secondary} type="button" aria-label={'Kelola ' + item.name} onClick={() => open(item.id)}><Pencil size={15} aria-hidden="true" /> Kelola</button>
            </li>
          ))}</ul> : <p className={styles.empty}>Belum ada film.</p>
        ) : tab === 'Film' ? (
          <FilmForm key={film ? film.id + ':' + film.revision : 'new'} film={film} request={request}
            nextPosition={Math.min(9999, (films.at(-1)?.position ?? 0) + 10)}
            onSaved={(item) => saveFilm(item, 'Film disimpan.')}
            onRemoved={() => {
              setView({ step: 'ready', films: films.filter(({ id }) => id !== active) });
              open(null);
              setNote('Film dihapus.');
            }} />
        ) : film && tab === 'Media' ? (
          <FilmMedia key={film.id + ':' + film.revision} film={film} request={request} onSaved={saveFilm} />
        ) : film && (
          creditEditor ? <CreditForm key={creditEditor} film={film} credit={film.credits.find(({ id }) => id === creditEditor)}
            request={request} onClose={() => setCreditEditor(null)}
            onSaved={(credit) => editCredits(film.id, (list) => [...list.filter(({ id }) => id !== credit.id), credit].sort(byPosition), 'Kredit disimpan.')}
            onRemoved={(id) => editCredits(film.id, (list) => list.filter((credit) => credit.id !== id), 'Kredit dihapus.')} /> : (
            <>
              <button className={styles.primary} type="button" onClick={() => { setCreditEditor('new'); setNote(''); }}><Plus size={16} aria-hidden="true" /> Tambah kredit</button>
              {film.credits.length ? <ul className={styles.series}>{film.credits.map((credit) => (
                <li key={credit.id}><div><h2>{credit.name}</h2><p className={styles.meta}>{[credit.role, credit.studio].filter(Boolean).join(' · ')}</p></div>
                  <button className={styles.secondary} type="button" aria-label={'Sunting kredit ' + credit.name} onClick={() => { setCreditEditor(credit.id); setNote(''); }}>Sunting</button>
                </li>
              ))}</ul> : <p className={styles.empty}>Belum ada kredit produksi.</p>}
            </>
          )
        )}
      </main>
      <footer className={styles.shell + ' ' + styles.footer}><ProjectCredit /></footer>
    </div>
  );
}
