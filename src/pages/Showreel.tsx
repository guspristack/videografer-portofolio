import { ArrowUpRight, LockKeyhole, Mail, Play, X } from 'lucide-react';
import { Link } from 'react-router';
import { durationLabel, mediaUrl, type Film } from '../../shared/content';
import { useResource } from '../api';
import { CopyWorkLink, Overlay, ProjectCredit, ResourceState, scrollToSection, SectionNav } from '../components';
import { PortraitPanel, ProfileAvatar, SocialLinks } from '../PortfolioIdentity';
import { portfolioMedia } from '../portfolioMedia';
import { useWorkDialog } from '../useWorkDialog';
import styles from './Showreel.module.css';

const navigation = [
  { title: 'Profil', target: 'bayu-profil' },
  { title: 'Pengalaman', target: 'bayu-pengalaman' },
  { title: 'Film', target: 'bayu-film' },
  { title: 'Kontak', target: 'bayu-kontak' },
];
const contactEmail = 'bayu@ruangkarya.example';
const media = portfolioMedia.bayu;

export function Showreel() {
  const { params, openedHere, openWork, closeWork } = useWorkDialog('film');
  const { data, error, retry } = useResource<Film[]>('/films');
  if (!data) return <ResourceState loading="Memuat film Bayu…" error={error} retry={retry} />;
  const slug = params.get('film');
  const playing = data.find((film) => film.slug === slug);
  const reel = data.find((film) => film.placement === 'Showreel');
  const feature = data.find((film) => film.placement === 'Film unggulan');
  const hero = reel ?? feature ?? data[0];
  const heroPoster = hero?.hasPoster ? hero : data.find(({ hasPoster }) => hasPoster);
  const clips = data.filter(({ id }) => id !== reel?.id && id !== feature?.id);
  return (
    <div className={styles.page}>
      <header className={styles.header} id="bayu-awal" tabIndex={-1}>
        <div className={styles.shell}>
          <span className={styles.brand}><ProfileAvatar portrait={media.portrait} /> Bayu Pradana</span>
          <SectionNav label="Navigasi portofolio Bayu" items={navigation} />
          <Link to="/admin" className={styles.back}><LockKeyhole size={15} aria-hidden="true" /> Admin</Link>
        </div>
      </header>
      <main tabIndex={-1} data-title="Showreel Videografer">
        <section className={styles.hero} aria-labelledby="bayu-title">
          {heroPoster && <img src={mediaUrl(heroPoster, 'poster')} alt="" fetchPriority="high" />}
          <div className={styles.heroShade} />
          <div className={styles.heroBody + ' ' + styles.shell}>
            <p className={styles.kicker}>Bayu Pradana · Videografer &amp; editor</p>
            <h1 id="bayu-title">Cerita dalam<br /><em>gerak.</em></h1>
            <p className={styles.intro}>Berbasis di Jakarta, dengan fokus pada dokumenter pendek, cerita perjalanan, dan penyuntingan video.</p>
            <div className={styles.actions}>
              {hero && <button className={styles.play} type="button" onClick={() => openWork({ film: hero.slug })}><Play size={17} fill="currentColor" aria-hidden="true" /> {reel ? 'Putar showreel' : 'Putar ' + hero.name}</button>}
              <button className={styles.secondary} type="button" onClick={() => scrollToSection('bayu-kontak')}>Hubungi Bayu</button>
            </div>
          </div>
        </section>
        <section className={styles.works + ' ' + styles.shell} aria-labelledby="bayu-film">
          <div className={styles.sectionHead}><h2 id="bayu-film" tabIndex={-1}>Film pilihan</h2><span>Putar klip untuk melihat kreditnya.</span></div>
          {feature && <div className={styles.featureFilm + (feature.hasPoster ? '' : ' ' + styles.featureTextOnly)}>
            {feature.hasPoster && <img src={mediaUrl(feature, 'poster')} alt={feature.posterAlt} loading="lazy" />}
            <div>
              <p className={styles.kicker}>{feature.type} · {durationLabel(feature.duration)}</p>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
              <button className={styles.play} type="button" onClick={() => openWork({ film: feature.slug })}><Play size={16} fill="currentColor" aria-hidden="true" /> Putar {feature.name}</button>
            </div>
          </div>}
          {!data.length && <p role="status">Belum ada film yang ditampilkan.</p>}
          <div className={styles.grid}>
            {clips.map((film) => (
              <button type="button" key={film.id} className={styles.film} onClick={() => openWork({ film: film.slug })} aria-label={'Putar ' + film.name}>
                <span className={styles.still}>
                  {film.hasPoster ? <img src={mediaUrl(film, 'poster')} alt={film.posterAlt} loading="lazy" /> : <i className={styles.stillPlaceholder} aria-hidden="true" />}
                  <span><Play size={18} fill="currentColor" aria-hidden="true" /></span>
                </span>
                <span className={styles.filmTitle}>{film.name}</span>
                <span className={styles.filmType}>{film.type} · {durationLabel(film.duration)}</span>
                {film.credits[0] && <span className={styles.filmRole}>{film.credits[0].role}</span>}
              </button>
            ))}
          </div>
        </section>
        <section className={styles.profile + ' ' + styles.shell} aria-labelledby="bayu-profil">
          <PortraitPanel portrait={media.portrait} name="Bayu Pradana">
            <h2 id="bayu-profil" tabIndex={-1}>Tentang Bayu</h2><p>Videografer &amp; editor · Jakarta, Indonesia</p>
          </PortraitPanel>
          <div>
            <p>Saya tertarik pada cerita sehari-hari yang bisa disampaikan lewat detail kecil, dari cahaya di jalan basah hingga gerak tangan pengrajin. Dalam penyuntingan, saya memperhatikan ritme, transisi, dan kesinambungan warna.</p>
            <dl className={styles.facts}>
              <div><dt>Fokus</dt><dd>Dokumenter pendek dan cerita perjalanan</dd></div>
              <div><dt>Lingkup kerja</dt><dd>Konsep visual, penyuntingan, dan penataan warna</dd></div>
            </dl>
          </div>
        </section>
        <section className={styles.profile + ' ' + styles.shell} aria-labelledby="bayu-pengalaman">
          <div><h2 id="bayu-pengalaman" tabIndex={-1}>Pengalaman</h2><p>Riwayat contoh untuk profil fiktif.</p></div>
          <ol className={styles.timeline}>
            <li><span>Mar–Okt 2026</span><div><h3>Studi dokumenter pendek · Proyek mandiri</h3><p>Menyusun arah visual untuk Cahaya kota dan Tangan dan tanah, lalu merangkai keduanya dalam showreel.</p></div></li>
            <li><span>Agu–Des 2025</span><div><h3>Latihan penyuntingan film perjalanan</h3><p>Mengeksplorasi ritme, arah gerak gambar, dan kesinambungan warna untuk konsep Arus selatan.</p></div></li>
          </ol>
        </section>
        <section className={styles.contact + ' ' + styles.shell} aria-labelledby="bayu-kontak">
          <div><h2 id="bayu-kontak" tabIndex={-1}>Kontak</h2><p>Terbuka untuk dokumenter pendek, konten merek, dan penyuntingan video.</p></div>
          <div>
            <a href={'mailto:' + contactEmail} aria-describedby="bayu-email-note"><Mail size={17} aria-hidden="true" />{contactEmail}</a>
            <p id="bayu-email-note">Alamat email contoh untuk prototipe.</p>
            <SocialLinks name="Bayu Pradana" id="bayu" links={media.socials} />
          </div>
        </section>
      </main>
      <footer className={styles.footer + ' ' + styles.shell}><div><span>Portofolio videografer fiktif</span><ProjectCredit /></div><button type="button" onClick={() => scrollToSection('bayu-awal')}>Kembali ke atas <ArrowUpRight size={16} aria-hidden="true" /></button></footer>
      {playing ? (
        <Overlay className={styles.dialog} label={playing.name} onClose={closeWork}>
          <div className={styles.player}>
            <div className={styles.playerHead}><div><h2>{playing.name}</h2><p>{playing.type} · {durationLabel(playing.duration)} · {playing.hasAudio ? 'Dengan audio' : 'Tanpa audio'}</p></div><button type="button" aria-label="Tutup pemutar video" onClick={closeWork} autoFocus><X size={22} aria-hidden="true" /></button></div>
            <video key={playing.id + ':' + playing.revision} controls autoPlay={openedHere} muted={!playing.hasAudio} playsInline preload="metadata"
              poster={playing.hasPoster ? mediaUrl(playing, 'poster') : undefined} src={mediaUrl(playing, 'video')} aria-label={playing.name}>
              {playing.hasCaptions && <track default kind="captions" src={mediaUrl(playing, 'captions')} srcLang={playing.language}
                label={playing.language === 'id' ? 'Bahasa Indonesia' : 'English'} />}
            </video>
            <div className={styles.filmCredits}>
              <p>{playing.description}</p>
              <dl className={styles.facts}>
                {playing.credits.map((credit) => <div key={credit.id}><dt>{credit.role}</dt><dd>{[credit.name, credit.studio].filter(Boolean).join(' · ')}</dd></div>)}
                {playing.visualSource && <div><dt>Sumber visual</dt><dd>{playing.visualSource}</dd></div>}
                {playing.soundCredit && <div><dt>Tata suara</dt><dd>{playing.soundCredit}</dd></div>}
              </dl>
              <CopyWorkLink key={playing.id} label="Salin tautan film" />
            </div>
          </div>
        </Overlay>
      ) : slug && <Overlay className={styles.dialog} label="Pemutar film" onClose={closeWork}>
        <div className={styles.playerHead}><p role="alert">Film tidak tersedia.</p><button type="button" aria-label="Tutup pemutar video" onClick={closeWork} autoFocus><X size={22} aria-hidden="true" /></button></div>
      </Overlay>}
    </div>
  );
}
