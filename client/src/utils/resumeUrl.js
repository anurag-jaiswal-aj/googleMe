/**
 * Normalises a resume URL for inline viewing in a new tab.
 * - Google Drive share links → /preview for embedded viewing
 * - Everything else → as-is
 */
export function inlineResumeUrl(url = '') {
  if (!url) return url;
  // Convert Google Drive share/view/open link to preview
  const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/([^/?#]+)|(?:open|uc)[/?]?(?:.*?[?&])?id=([^&#]+))/);
  if (driveMatch) {
    const fileId = driveMatch[1] || driveMatch[2];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
}
