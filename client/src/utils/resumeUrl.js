/**
 * Normalises a resume URL for inline viewing in a new tab.
 * - Google Drive share links → /preview for embedded viewing
 * - Everything else → as-is
 */
export function inlineResumeUrl(url = '') {
  if (!url) return url;
  // Convert Google Drive share/view link to preview
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return url;
}
