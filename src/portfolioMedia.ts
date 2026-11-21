import portrait from './images/portrait-bayu.webp';

export type SocialLink = { platform: 'instagram' | 'linkedin' | 'vimeo'; url?: string };
export type PortfolioMedia = { portrait: string; socials: readonly SocialLink[] };

export const portfolioMedia = {
  bayu: { portrait, socials: [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'vimeo' }] },
} satisfies Record<string, PortfolioMedia>;
