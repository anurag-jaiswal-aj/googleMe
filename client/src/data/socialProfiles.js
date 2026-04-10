import { LINKS, stripProtocol } from '../config/links';

/**
 * Returns social profile cards with URLs from cfg.socialLinks (admin-controlled),
 * falling back to hardcoded LINKS defaults.
 */
export function getSocialProfiles(cfg = {}) {
  const sl = cfg.socialLinks ?? {};
  const mediumUrl = cfg.mediumUsername
    ? `https://medium.com/@${cfg.mediumUsername.replace(/^@/, '')}`
    : (sl.medium ?? LINKS.medium);

  return [
    {
      name: 'LinkedIn',
      url: stripProtocol(sl.linkedin ?? LINKS.linkedin),
      title: 'LinkedIn Profile',
      snippet: 'View my professional profile including experience, education, technical skills, and project work. Connect with me for networking, collaborations, and career opportunities in software development and related fields.',
      href: sl.linkedin ?? LINKS.linkedin,
      faviconBg: '#0a66c2',
      faviconLetter: 'in',
    },
    {
      name: 'GitHub',
      url: stripProtocol(sl.github ?? LINKS.github),
      title: 'GitHub Profile',
      snippet: 'Explore my GitHub profile featuring open-source projects and code repositories. Includes full-stack applications, experiments, and development work built while learning and building real-world software projects.',
      href: sl.github ?? LINKS.github,
      faviconBg: '#24292e',
      faviconLetter: 'G',
    },
    {
      name: 'Twitter / X',
      url: stripProtocol(sl.twitter ?? LINKS.twitter),
      title: 'Twitter / X Profile',
      snippet: 'Posts and updates from my account on X covering a mix of thoughts, ideas, projects, and everyday moments. Sharing things I find interesting, observations, and occasional updates from my developer journey.',
      href: sl.twitter ?? LINKS.twitter,
      faviconBg: '#1DA1F2',
      faviconLetter: 'X',
    },
    {
      name: 'Medium',
      url: stripProtocol(mediumUrl),
      title: 'Medium Profile',
      snippet: 'Read my writing on Medium covering technology, ideas, personal experiences, and topics I find interesting. Articles from my learning journey, project experiences, and reflections while exploring new concepts.',
      href: mediumUrl,
      faviconBg: '#00632b',
      faviconLetter: 'M',
    },
    {
      name: 'LeetCode',
      url: stripProtocol(sl.leetcode ?? LINKS.leetcode),
      title: 'LeetCode - Profile',
      snippet: 'Solving Data Structures and Algorithms problems with a focus on optimized solutions and contest preparation.',
      href: sl.leetcode ?? LINKS.leetcode,
      faviconBg: '#FFA116',
      faviconLetter: 'L',
    },
    {
      name: 'CodeChef',
      url: stripProtocol(sl.codechef ?? LINKS.codechef),
      title: 'CodeChef - Profile',
      snippet: 'Competitive programming profile with contest participation and problem-solving across multiple domains.',
      href: sl.codechef ?? LINKS.codechef,
      faviconBg: '#5B4638',
      faviconLetter: 'C',
    },
  ];
}

// Keep backward-compatible static export for any remaining direct usages
export const SOCIAL_PROFILES = getSocialProfiles();
