import { faVimeoV, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import type { ReactNode } from 'react';
import type { SocialLink } from './portfolioMedia';
import styles from './PortfolioIdentity.module.css';

const platforms = {
  instagram: { name: 'Instagram', website: 'https://www.instagram.com/', icon: faInstagram },
  linkedin: { name: 'LinkedIn', website: 'https://www.linkedin.com/', icon: faLinkedin },
  vimeo: { name: 'Vimeo', website: 'https://vimeo.com/', icon: faVimeoV },
};

export function ProfileAvatar({ portrait }: { portrait: string }) {
  return <img className={styles.avatar} src={portrait} alt="" width="40" height="40" />;
}

export function PortraitPanel({ portrait, name, children }: { portrait: string; name: string; children: ReactNode }) {
  return <div className={styles.portraitPanel}><img src={portrait} alt={'Potret generatif ' + name} width="120" height="150" loading="lazy" /> <div>{children}</div></div>;
}

export function SocialLinks({ name, id, links }: { name: string; id: string; links: readonly SocialLink[] }) {
  const note = links.some(({ url }) => !url) ? id + '-social-note' : undefined;
  return (
    <div className={styles.socials}>
      <h3>Media sosial</h3>
      <ul aria-label={'Media sosial ' + name} aria-describedby={note}>
        {links.map(({ platform, url }) => {
          const { name, website, icon } = platforms[platform];
          const [width, height, , , pathData] = icon.icon;
          const paths = Array.isArray(pathData) ? pathData : [pathData];
          return (
            <li key={platform}>
              <a href={url || website} aria-label={name} title={name} target="_blank" rel="noopener noreferrer">
                <svg viewBox={`0 0 ${width} ${height}`} width="19" height="19" fill="currentColor" aria-hidden="true">
                  {paths.map((path) => <path key={path} d={path} />)}
                </svg>
              </a>
            </li>
          );
        })}
      </ul>
      {note && <p id={note}>Tautan menuju laman platform sebagai contoh.</p>}
    </div>
  );
}
