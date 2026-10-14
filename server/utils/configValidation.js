/**
 * Server-side configuration validation helpers for GoogleMe.
 * Enforces key allowlist, safe URI protocols, scalar boundaries,
 * and structured object validation before persistence.
 */

const RECOGNIZED_CONFIG_KEYS = new Set([
  'profile',
  'socialLinks',
  'githubUsername',
  'resumeUrl',
  'avatarUrl',
  'profilePhotoUrl',
  'knowledgeSkills',
  'bioParagraphs',
  'education',
  'experience',
  'certifications',
  'skills',
  'tools',
  'mediumUsername',
  'blogPostsPerPage',
  'pageVisibility',
  'defaultTheme',
  'contactInfo',
  'customSetting',
]);

const HEX6_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const GITHUB_REPO_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;
const MEDIUM_USERNAME_REGEX = /^@?[a-zA-Z0-9_.-]{1,50}$/;

const RECOGNIZED_SOCIAL_KEYS = new Set([
  'github',
  'linkedin',
  'twitter',
  'leetcode',
  'codechef',
  'email',
  'alternatePortfolio',
  'mailto',
  'resume',
]);

const ALLOWED_THEMES = new Set(['light', 'dark', 'system']);

/**
 * Validates external and local URLs.
 * Rejects javascript:, data:, vbscript: and malformed URIs.
 */
function isSafeUrl(url, { allowEmpty = true, allowLocal = false } = {}) {
  if (url === undefined || url === null || url === '') {
    return allowEmpty;
  }
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return allowEmpty;
  }
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }
  if (allowLocal && trimmed.startsWith('/') && trimmed.length <= 1000) {
    if (trimmed.startsWith('//') || /[\r\n\t]/.test(trimmed)) {
      return false;
    }
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validates email address format.
 */
function isSafeEmail(email, { allowEmpty = true } = {}) {
  if (email === undefined || email === null || email === '') {
    return allowEmpty;
  }
  if (typeof email !== 'string') {
    return false;
  }
  const trimmed = email.trim();
  if (trimmed === '') {
    return allowEmpty;
  }
  if (trimmed.length > 254) {
    return false;
  }
  return EMAIL_REGEX.test(trimmed);
}

function validateMediumUsername(value) {
  if (typeof value !== 'string') {
    return 'mediumUsername must be a string';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 'mediumUsername cannot be empty';
  }
  if (!MEDIUM_USERNAME_REGEX.test(trimmed)) {
    return 'mediumUsername contains invalid characters or exceeds 50 characters';
  }
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return 'mediumUsername cannot contain path characters';
  }
  return null;
}

function validateGithubUsername(value) {
  if (typeof value !== 'string') {
    return 'githubUsername must be a string';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 'githubUsername cannot be empty';
  }
  if (!GITHUB_USERNAME_REGEX.test(trimmed)) {
    return 'githubUsername must be 1-39 characters consisting of alphanumeric characters and single hyphens';
  }
  return null;
}

function validateDefaultTheme(value) {
  if (typeof value !== 'string' || !ALLOWED_THEMES.has(value.trim())) {
    return 'defaultTheme must be one of: light, dark, system';
  }
  return null;
}

function validateBlogPostsPerPage(value) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 50) {
    return 'blogPostsPerPage must be an integer between 1 and 50';
  }
  return null;
}

function validateProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'profile must be an object';
  }
  if (value.name !== undefined && (typeof value.name !== 'string' || value.name.length > 100)) {
    return 'profile.name must be a string up to 100 characters';
  }
  if (value.title !== undefined && (typeof value.title !== 'string' || value.title.length > 100)) {
    return 'profile.title must be a string up to 100 characters';
  }
  if (value.statusText !== undefined && (typeof value.statusText !== 'string' || value.statusText.length > 100)) {
    return 'profile.statusText must be a string up to 100 characters';
  }
  if (value.footerDate !== undefined && (typeof value.footerDate !== 'string' || value.footerDate.length > 50)) {
    return 'profile.footerDate must be a string up to 50 characters';
  }
  if (value.statusOn !== undefined && typeof value.statusOn !== 'boolean') {
    return 'profile.statusOn must be a boolean';
  }
  if (value.education !== undefined && value.education !== null) {
    if (typeof value.education !== 'object' || Array.isArray(value.education)) {
      return 'profile.education must be an object';
    }
    const edu = value.education;
    if (edu.institution !== undefined && (typeof edu.institution !== 'string' || edu.institution.length > 150)) {
      return 'profile.education.institution must be a string up to 150 characters';
    }
    if (edu.degree !== undefined && (typeof edu.degree !== 'string' || edu.degree.length > 150)) {
      return 'profile.education.degree must be a string up to 150 characters';
    }
    if (edu.degreeShort !== undefined && (typeof edu.degreeShort !== 'string' || edu.degreeShort.length > 50)) {
      return 'profile.education.degreeShort must be a string up to 50 characters';
    }
    if (edu.years !== undefined && (typeof edu.years !== 'string' || edu.years.length > 50)) {
      return 'profile.education.years must be a string up to 50 characters';
    }
    if (edu.cgpa !== undefined && (typeof edu.cgpa !== 'string' || edu.cgpa.length > 20)) {
      return 'profile.education.cgpa must be a string up to 20 characters';
    }
    if (edu.detail !== undefined && (typeof edu.detail !== 'string' || edu.detail.length > 150)) {
      return 'profile.education.detail must be a string up to 150 characters';
    }
  }
  return null;
}

function validateSocialLinks(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'socialLinks must be an object';
  }
  for (const [k, v] of Object.entries(value)) {
    if (!RECOGNIZED_SOCIAL_KEYS.has(k)) {
      return `Unknown socialLinks key "${k}"`;
    }
    if (k === 'email') {
      if (!isSafeEmail(v, { allowEmpty: true })) {
        return `socialLinks.${k} must be a valid email address or empty string`;
      }
    } else if (k === 'mailto') {
      if (typeof v !== 'string') {
        return `socialLinks.${k} must be a string`;
      }
      const trimmed = v.trim();
      if (!trimmed || trimmed === 'mailto:') {
        continue;
      }
      if (!trimmed.startsWith('mailto:')) {
        return `socialLinks.${k} must begin with mailto: or be empty`;
      }
      const address = trimmed.slice(7).trim();
      if (!address || !isSafeEmail(address, { allowEmpty: false })) {
        return `socialLinks.${k} must contain a valid email address`;
      }
    } else if (k === 'resume') {
      if (!isSafeUrl(v, { allowEmpty: true, allowLocal: true })) {
        return `socialLinks.${k} must be a valid URL or empty string`;
      }
    } else {
      if (!isSafeUrl(v, { allowEmpty: true, allowLocal: false })) {
        return `socialLinks.${k} must be a valid HTTP/HTTPS URL or empty string`;
      }
    }
  }
  return null;
}

function validateContactInfo(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'contactInfo must be an object';
  }
  if (value.email !== undefined && !isSafeEmail(value.email, { allowEmpty: true })) {
    return 'contactInfo.email must be a valid email address or empty string';
  }
  if (value.phone !== undefined && (typeof value.phone !== 'string' || value.phone.length > 50)) {
    return 'contactInfo.phone must be a string up to 50 characters';
  }
  if (value.location !== undefined && (typeof value.location !== 'string' || value.location.length > 100)) {
    return 'contactInfo.location must be a string up to 100 characters';
  }
  return null;
}

function validateKnowledgeSkills(value) {
  if (!Array.isArray(value)) {
    return 'knowledgeSkills must be an array';
  }
  if (value.length > 30) {
    return 'knowledgeSkills cannot exceed 30 items';
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `knowledgeSkills item at index ${i} must be an object`;
    }
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 50) {
      return `knowledgeSkills item at index ${i} requires a non-empty name up to 50 characters`;
    }
    const pct = typeof item.pct === 'number' ? item.pct : Number(item.pct);
    if (typeof pct !== 'number' || isNaN(pct) || pct < 0 || pct > 100) {
      return `knowledgeSkills item "${item.name}" requires a percentage (pct) between 0 and 100`;
    }
    if (item.color !== undefined && (typeof item.color !== 'string' || !HEX6_COLOR_REGEX.test(item.color.trim()))) {
      return `knowledgeSkills item "${item.name}" requires a valid 6-digit hex color (e.g. #4285F4)`;
    }
  }
  return null;
}

function validateBioParagraphs(value) {
  if (typeof value === 'string') {
    if (value.length > 5000) {
      return 'bioParagraphs string cannot exceed 5000 characters';
    }
    return null;
  }
  if (!Array.isArray(value)) {
    return 'bioParagraphs must be an array of strings or a string';
  }
  if (value.length > 20) {
    return 'bioParagraphs cannot exceed 20 paragraphs';
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      return `bioParagraphs item at index ${i} must be a string`;
    }
    if (value[i].length > 2000) {
      return `bioParagraphs item at index ${i} cannot exceed 2000 characters`;
    }
  }
  return null;
}

function validateEducation(value) {
  if (!Array.isArray(value)) {
    return 'education must be an array';
  }
  if (value.length > 25) {
    return 'education cannot exceed 25 entries';
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `education entry at index ${i} must be an object`;
    }
    const hasSchool = typeof item.school === 'string' && item.school.trim().length > 0;
    const hasDegree = typeof item.degree === 'string' && item.degree.trim().length > 0;
    if (!hasSchool && !hasDegree) {
      return `education entry at index ${i} requires either a school or degree`;
    }
    if (item.school !== undefined && (typeof item.school !== 'string' || item.school.length > 150)) {
      return `education entry at index ${i} school must be a string up to 150 characters`;
    }
    if (item.degree !== undefined && (typeof item.degree !== 'string' || item.degree.length > 150)) {
      return `education entry at index ${i} degree must be a string up to 150 characters`;
    }
    if (item.year !== undefined && (typeof item.year !== 'string' || item.year.length > 50)) {
      return `education entry at index ${i} year must be a string up to 50 characters`;
    }
    if (item.detail !== undefined && (typeof item.detail !== 'string' || item.detail.length > 200)) {
      return `education entry at index ${i} detail must be a string up to 200 characters`;
    }
    if (item.color !== undefined && item.color !== '') {
      if (typeof item.color !== 'string' || !HEX6_COLOR_REGEX.test(item.color.trim())) {
        return `education entry at index ${i} color must be a valid 6-digit hex color`;
      }
    }
  }
  return null;
}

function validateExperience(value) {
  if (!Array.isArray(value)) {
    return 'experience must be an array';
  }
  if (value.length > 25) {
    return 'experience cannot exceed 25 entries';
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `experience entry at index ${i} must be an object`;
    }
    const hasRole = typeof item.role === 'string' && item.role.trim().length > 0;
    const hasCompany = typeof item.company === 'string' && item.company.trim().length > 0;
    if (!hasRole && !hasCompany) {
      return `experience entry at index ${i} requires either a role or company`;
    }
    if (item.role !== undefined && (typeof item.role !== 'string' || item.role.length > 100)) {
      return `experience entry at index ${i} role must be a string up to 100 characters`;
    }
    if (item.company !== undefined && (typeof item.company !== 'string' || item.company.length > 100)) {
      return `experience entry at index ${i} company must be a string up to 100 characters`;
    }
    if (item.period !== undefined && (typeof item.period !== 'string' || item.period.length > 50)) {
      return `experience entry at index ${i} period must be a string up to 50 characters`;
    }
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 2000)) {
      return `experience entry at index ${i} description must be a string up to 2000 characters`;
    }
    if (item.color !== undefined && item.color !== '') {
      if (typeof item.color !== 'string' || !HEX6_COLOR_REGEX.test(item.color.trim())) {
        return `experience entry at index ${i} color must be a valid 6-digit hex color`;
      }
    }
    if (item.badges !== undefined) {
      if (!Array.isArray(item.badges)) {
        return `experience entry at index ${i} badges must be an array of strings`;
      }
      for (let b = 0; b < item.badges.length; b++) {
        if (typeof item.badges[b] !== 'string' || item.badges[b].length > 50) {
          return `experience entry at index ${i} badge at index ${b} must be a string up to 50 characters`;
        }
      }
    }
  }
  return null;
}

function validateCertifications(value) {
  if (!Array.isArray(value)) {
    return 'certifications must be an array';
  }
  if (value.length > 35) {
    return 'certifications cannot exceed 35 entries';
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `certifications entry at index ${i} must be an object`;
    }
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 150) {
      return `certifications entry at index ${i} requires a non-empty name up to 150 characters`;
    }
    if (item.issuer !== undefined && (typeof item.issuer !== 'string' || item.issuer.length > 100)) {
      return `certifications entry at index ${i} issuer must be a string up to 100 characters`;
    }
    if (item.year !== undefined && (typeof item.year !== 'string' || item.year.length > 50)) {
      return `certifications entry at index ${i} year must be a string up to 50 characters`;
    }
    if (item.color !== undefined && item.color !== '') {
      if (typeof item.color !== 'string' || !HEX6_COLOR_REGEX.test(item.color.trim())) {
        return `certifications entry at index ${i} color must be a valid 6-digit hex color`;
      }
    }
    if (item.link !== undefined && !isSafeUrl(item.link, { allowEmpty: true, allowLocal: false })) {
      return `certifications entry at index ${i} link must be a valid HTTP/HTTPS URL or empty`;
    }
  }
  return null;
}

function validateSkills(value) {
  if (!Array.isArray(value)) {
    return 'skills must be an array of category objects';
  }
  if (value.length > 25) {
    return 'skills cannot exceed 25 categories';
  }
  for (let i = 0; i < value.length; i++) {
    const cat = value[i];
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      return `skills category at index ${i} must be an object`;
    }
    if (typeof cat.category !== 'string' || !cat.category.trim() || cat.category.length > 50) {
      return `skills category at index ${i} requires a non-empty category name up to 50 characters`;
    }
    if (!Array.isArray(cat.items)) {
      return `skills category "${cat.category}" items must be an array of strings`;
    }
    if (cat.items.length > 50) {
      return `skills category "${cat.category}" cannot exceed 50 items`;
    }
    for (let j = 0; j < cat.items.length; j++) {
      if (typeof cat.items[j] !== 'string' || cat.items[j].length > 50) {
        return `skills category "${cat.category}" item at index ${j} must be a string up to 50 characters`;
      }
    }
  }
  return null;
}

function validateResumeUrl(value) {
  if (typeof value !== 'string') {
    return 'resumeUrl must be a string';
  }
  if (value.length > 1000) {
    return 'resumeUrl cannot exceed 1000 characters';
  }
  if (!isSafeUrl(value, { allowEmpty: true, allowLocal: true })) {
    return 'resumeUrl must be a valid URL or local PDF path';
  }
  return null;
}

function validateAvatarUrl(value, field = 'avatarUrl') {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    return `${field} must be a string`;
  }
  if (value.length > 1000) {
    return `${field} cannot exceed 1000 characters`;
  }
  if (!isSafeUrl(value, { allowEmpty: true, allowLocal: true })) {
    return `${field} must be a valid URL`;
  }
  return null;
}

/**
 * Validates a single configuration entry.
 * Returns null if valid, or an error message string if invalid.
 */
function validateConfigEntry(key, value) {
  if (typeof key !== 'string' || !key.trim()) {
    return 'key must be a non-empty string';
  }
  const cleanKey = key.trim();
  if (!RECOGNIZED_CONFIG_KEYS.has(cleanKey)) {
    return `Unknown configuration key "${cleanKey}". Allowed keys: ${Array.from(RECOGNIZED_CONFIG_KEYS).sort().join(', ')}`;
  }
  switch (cleanKey) {
    case 'mediumUsername':
      return validateMediumUsername(value);
    case 'githubUsername':
      return validateGithubUsername(value);
    case 'defaultTheme':
      return validateDefaultTheme(value);
    case 'blogPostsPerPage':
      return validateBlogPostsPerPage(value);
    case 'profile':
      return validateProfile(value);
    case 'socialLinks':
      return validateSocialLinks(value);
    case 'contactInfo':
      return validateContactInfo(value);
    case 'knowledgeSkills':
      return validateKnowledgeSkills(value);
    case 'bioParagraphs':
      return validateBioParagraphs(value);
    case 'education':
      return validateEducation(value);
    case 'experience':
      return validateExperience(value);
    case 'certifications':
      return validateCertifications(value);
    case 'skills':
      return validateSkills(value);
    case 'resumeUrl':
      return validateResumeUrl(value);
    case 'avatarUrl':
    case 'profilePhotoUrl':
      return validateAvatarUrl(value, cleanKey);
    case 'customSetting':
      return null;
    default:
      return null;
  }
}

/**
 * Validates github selectedRepos payload.
 */
function validateGithubSelection(selectedRepos) {
  if (!Array.isArray(selectedRepos)) {
    return 'selectedRepos must be an array';
  }
  if (selectedRepos.length > 100) {
    return 'selectedRepos cannot exceed 100 repositories';
  }
  for (let i = 0; i < selectedRepos.length; i++) {
    const item = selectedRepos[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `Repository item at index ${i} must be an object`;
    }
    if (typeof item.name !== 'string' || !item.name.trim()) {
      return `Repository item at index ${i} requires a non-empty name`;
    }
    const cleanName = item.name.trim();
    if (!GITHUB_REPO_NAME_REGEX.test(cleanName)) {
      return `Repository "${cleanName}" has an invalid name format`;
    }
    if (item.featured !== undefined && typeof item.featured !== 'boolean') {
      return `Repository "${cleanName}" featured must be a boolean`;
    }
    if (item.extraTags !== undefined) {
      if (!Array.isArray(item.extraTags)) {
        return `Repository "${cleanName}" extraTags must be an array of strings`;
      }
      if (item.extraTags.length > 20) {
        return `Repository "${cleanName}" extraTags cannot exceed 20 tags`;
      }
      for (let t = 0; t < item.extraTags.length; t++) {
        if (typeof item.extraTags[t] !== 'string' || item.extraTags[t].length > 50) {
          return `Repository "${cleanName}" tag at index ${t} must be a string up to 50 characters`;
        }
      }
    }
  }
  return null;
}

module.exports = {
  RECOGNIZED_CONFIG_KEYS,
  isSafeUrl,
  isSafeEmail,
  validateConfigEntry,
  validateGithubSelection,
};
