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
    resume: '/Resume_aj.pdf',

    alternatePortfolio: 'https://github.com/anurag-jaiswal-aj',
};

export const stripProtocol = (url) =>
    (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
