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

    alternatePortfolio: 'https://github.com/anurag-jaiswal-aj',
};

export const stripProtocol = (url) =>
    (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
