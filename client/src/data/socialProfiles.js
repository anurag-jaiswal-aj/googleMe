import { LINKS, stripProtocol } from '../config/links';

export const SOCIAL_PROFILES = [
  {
    name: 'LinkedIn',
    url: stripProtocol(LINKS.linkedin),
    title: 'LinkedIn Profile',
    snippet: 'View my professional profile including experience, education, technical skills, and project work. Connect with me for networking, collaborations, and career opportunities in software development and related fields.',
    href: LINKS.linkedin,
    faviconBg: '#0a66c2',
    faviconLetter: 'in',
  },
  {
    name: 'Twitter / X',
    url: stripProtocol(LINKS.twitter),
    title: 'Twitter / X Profile',
    snippet: 'Posts about technology, coding, projects, and random thoughts. Occasionally sharing updates, opinions, and things I am currently exploring in software development and beyond.',
    href: LINKS.twitter,
    faviconBg: '#1DA1F2',
    faviconLetter: 'X',
  },
  {
    name: 'GitHub',
    url: stripProtocol(LINKS.github),
    title: 'GitHub Profile',
    snippet: 'Explore my open-source projects, code contributions, and collaborations. View repositories showcasing my work in software development and problem-solving.',
    href: LINKS.github,
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    name: 'Medium',
    url: stripProtocol(LINKS.medium),
    title: 'Medium Profile',
    snippet: 'Read my writing on Medium covering technology, ideas, personal experiences, and lessons from building projects.',
    href: LINKS.medium,
    faviconBg: '#00632b',
    faviconLetter: 'M',
  },
  {
    name: 'LeetCode',
    url: stripProtocol(LINKS.leetcode),
    title: 'LeetCode - Profile',
    snippet: 'Solving Data Structures and Algorithms problems with a focus on optimized solutions and contest preparation.',
    href: LINKS.leetcode,
    faviconBg: '#FFA116',
    faviconLetter: 'L',
  },
  {
    name: 'CodeChef',
    url: stripProtocol(LINKS.codechef),
    title: 'CodeChef - Profile',
    snippet: 'Competitive programming profile with contest participation and problem-solving across multiple domains.',
    href: LINKS.codechef,
    faviconBg: '#5B4638',
    faviconLetter: 'C',
  }
];
