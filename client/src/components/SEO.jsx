import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://anuragjaiswal.me';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`; // place a 1200×630 jpg in /public
const AUTHOR = 'Anurag Jaiswal';
const TWITTER_HANDLE = '@therightrag';

/**
 * SEO — drop this at the top of any page component.
 *
 * Props:
 *   title       — page title (appended with " | Anurag")
 *   description — meta description (max ~155 chars)
 *   path        — URL path e.g. "/about"
 *   image       — absolute OG image URL (defaults to og-image.jpg)
 *   noIndex     — set true for admin/private pages
 */
export default function SEO({ title, description, path = '/', image, noIndex = false }) {
  const fullTitle = title ? `${title} | ${AUTHOR}` : `${AUTHOR} — Full-Stack Developer`;
  const url = `${SITE_URL}${path}`;
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph (LinkedIn, Facebook, Slack, WhatsApp) */}
      <meta property="og:type"        content="website" />
      <meta property="og:url"         content={url} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name"   content={`${AUTHOR} Portfolio`} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:creator"     content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />

      {/* Author */}
      <meta name="author" content={AUTHOR} />
    </Helmet>
  );
}
