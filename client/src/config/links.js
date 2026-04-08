export const LINKS = {
    github: 'https://github.com/anurag-jaiswal-aj',
    linkedin: 'https://www.linkedin.com/in/anuragjaiswal5826/',
    twitter: 'https://x.com/therightrag',
    leetcode: 'https://leetcode.com/u/therightrag/',
    codechef: 'https://www.codechef.com/users/the_rightrag',
    codeforces: 'https://codeforces.com/profile/anurag_aj',
    hackerrank: 'https://www.hackerrank.com/profile/anurag_aj',
    medium: 'https://medium.com/@janurag582004',
    gmailWeb: 'https://mail.google.com',
    email: 'janurag582004@gmail.com',
    mailto: 'mailto:janurag582004@gmail.com',
    resume: '/Resume_aj.pdf',

    alternatePortfolio: 'https://html5up.net/read-only/demo',
};

export const stripProtocol = (url) =>
    (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
