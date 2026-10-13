import { LINKS } from '../config/links.js';

/**
 * Returns normalized contact details from saved site configuration,
 * preferring contactInfo, then socialLinks, then LINKS static defaults.
 *
 * Precedence for email:
 * 1. cfg.contactInfo.email (if non-empty string)
 * 2. cfg.socialLinks.email (if non-empty string)
 * 3. LINKS.email (static fallback)
 *
 * Phone and location are returned only when non-empty strings are provided.
 */
export function getContactDetails(cfg = {}) {
  const info = cfg?.contactInfo && typeof cfg.contactInfo === 'object' ? cfg.contactInfo : {};
  const social = cfg?.socialLinks && typeof cfg.socialLinks === 'object' ? cfg.socialLinks : {};

  const infoEmail = typeof info.email === 'string' ? info.email.trim() : '';
  const socialEmail = typeof social.email === 'string' ? social.email.trim() : '';
  const email = infoEmail || socialEmail || LINKS.email;

  const phone = typeof info.phone === 'string' ? info.phone.trim() : '';
  const location = typeof info.location === 'string' ? info.location.trim() : '';

  return { email, phone, location };
}
