import { LINKS } from '../config/links.js';

export const CANONICAL_GITHUB_USER = 'anurag-jaiswal-aj';
export const CANONICAL_REPO_URL = 'https://github.com/anurag-jaiswal-aj/googleMe';

/**
 * Normalizes project URL and breadcrumb representation.
 * - Genuine repositories (e.g. googleMe) retain their repository URL and repo breadcrumb.
 * - Unverified sample projects (DevBoard, ShopCart, ChatApp, CodeSnip) link to the GitHub profile.
 * - Falsy or missing repoUrl values safely fall back to the GitHub profile without malformed slugs.
 * - Breadcrumbs always reflect the actual destination URL.
 */
export function getProjectUrlInfo(project, cfg = null) {
  const profileUrl = (
    cfg?.socialLinks?.github ||
    LINKS.github ||
    `https://github.com/${CANONICAL_GITHUB_USER}`
  ).trim();
  const canonicalUser = (cfg?.githubUsername || CANONICAL_GITHUB_USER).trim();
  const cleanProfileUrl = profileUrl.replace(/\/+$/, '');
  const profileBreadcrumb = cleanProfileUrl.replace(/^https?:\/\//, '');

  const rawRepo = (project?.repoUrl || '').trim();

  if (rawRepo) {
    const cleanRepo = rawRepo.replace(/\/+$/, '');

    // Check if the URL points to the GitHub profile root rather than a repository
    const isProfileUrl =
      cleanRepo === cleanProfileUrl ||
      cleanRepo === `https://github.com/${canonicalUser}` ||
      cleanRepo === `http://github.com/${canonicalUser}` ||
      cleanRepo === `github.com/${canonicalUser}` ||
      cleanRepo === `https://github.com/${CANONICAL_GITHUB_USER}` ||
      cleanRepo === `github.com/${CANONICAL_GITHUB_USER}`;

    if (isProfileUrl) {
      return {
        url: cleanProfileUrl,
        breadcrumb: profileBreadcrumb,
        isProfileFallback: true,
      };
    }

    return {
      url: cleanRepo,
      breadcrumb: cleanRepo.replace(/^https?:\/\//, ''),
      isProfileFallback: false,
    };
  }

  // Fallback for missing/empty repoUrl: link to GitHub profile
  return {
    url: cleanProfileUrl,
    breadcrumb: profileBreadcrumb,
    isProfileFallback: true,
  };
}
