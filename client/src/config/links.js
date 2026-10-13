export const LINKS = {
    github: 'https://github.com/anurag-jaiswal-aj',
    linkedin: 'https://www.linkedin.com/in/therightrag/',
    twitter: 'https://x.com/therightrag',
    leetcode: 'https://leetcode.com/u/therightrag/',
    codechef: 'https://www.codechef.com/users/the_rightrag',
    medium: 'https://medium.com/@therightrag',
    gmailWeb: 'https://mail.google.com',
    email: 'janurag582004@gmail.com',
    mailto: 'mailto:janurag582004@gmail.com',
    resume: 'https://res.cloudinary.com/dgsstziwz/raw/upload/v1791779439/gfolio/resume_1791779438123.pdf',

    alternatePortfolio: '',
};

export const stripProtocol = (url) =>
    (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/**
 * Returns a configured alternate portfolio URL, or null if unconfigured/invalid.
 * Does not fall back to the GitHub profile.
 */
export function getAlternatePortfolioUrl(cfg) {
    const candidate = cfg?.socialLinks?.alternatePortfolio;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
        const trimmed = candidate.trim();
        if (!trimmed.includes('github.com')) {
            return trimmed;
        }
    }
    return null;
}
