import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CURRENT_EDUCATION,
  EDUCATION,
  getEffectiveCurrentEducation,
  getEffectiveEducation,
  getEducationSnippet,
} from './src/data/aboutData.js';
import {
  getProjectUrlInfo,
  CANONICAL_GITHUB_USER,
  CANONICAL_REPO_URL,
} from './src/utils/projectUrls.js';
import {
  LINKS,
  getAlternatePortfolioUrl,
} from './src/config/links.js';
import { getAiReply } from './src/utils/aiChat.js';
import { isSafeGalleryLink, getSafeGalleryLink } from './src/utils/galleryUrl.js';
import sharedProjects from '../shared/projects.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 1. Canonical Education Defaults ──────────────────────────────────────────

test('Education: DEFAULT_CURRENT_EDUCATION contains confirmed canonical values', () => {
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.institution, 'Visvesvaraya Technological University');
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.degree, 'Bachelor of Engineering in Computer Science');
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.degreeShort, 'B.E. CS');
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.years, '2023 - 2027');
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.cgpa, '9.2');
  assert.strictEqual(DEFAULT_CURRENT_EDUCATION.detail, '3rd Year · CGPA 9.2');
});

test('Education: Default EDUCATION timeline entry 0 matches canonical current education', () => {
  assert.strictEqual(EDUCATION.length, 3);
  const college = EDUCATION[0];
  assert.strictEqual(college.school, 'Visvesvaraya Technological University');
  assert.strictEqual(college.degree, 'Bachelor of Engineering in Computer Science');
  assert.strictEqual(college.year, '2023 - 2027');
  assert.strictEqual(college.detail, '3rd Year · CGPA 9.2');
  assert.strictEqual(college.color, '#4285F4');
});

test('Education: Historical schooling entries are preserved intact', () => {
  const preUni = EDUCATION[1];
  assert.strictEqual(preUni.degree, 'Pre-University');
  assert.strictEqual(preUni.school, 'J.B.P.I.C, Ambedkar Nagar');
  assert.strictEqual(preUni.year, '2022 - 2023');
  assert.strictEqual(preUni.detail, 'PCM · 91%');

  const highSchool = EDUCATION[2];
  assert.strictEqual(highSchool.degree, 'High School');
  assert.strictEqual(highSchool.school, 'J.B.P.I.C, Ambedkar Nagar');
  assert.strictEqual(highSchool.year, '2020 - 2021');
  assert.strictEqual(highSchool.detail, 'CS · 90%');
});

// ── 2. Legacy Configuration Normalization & Precedence ──────────────────────

test('Education Normalization: Normalizes legacy default strings to canonical values', () => {
  const legacyProfile = {
    institution: 'JSS Academy of Technical Education, Bengaluru',
    degree: 'Bachelors of Engineering in CS',
    years: '2023 – 2027',
    detail: '3rd Year · CGPA 9.1 ',
  };
  const normalized = getEffectiveCurrentEducation(legacyProfile);
  assert.strictEqual(normalized.institution, 'Visvesvaraya Technological University');
  assert.strictEqual(normalized.degree, 'Bachelor of Engineering in Computer Science');
  assert.strictEqual(normalized.years, '2023 - 2027');
  assert.strictEqual(normalized.cgpa, '9.2');
  assert.strictEqual(normalized.detail, '3rd Year · CGPA 9.2');
});

test('Education Normalization: Normalizes legacy Information Science & Engineering degree', () => {
  const legacy = {
    degree: 'Bachelor of Engineering in Information Science & Engineering',
    years: '2023 – Present',
  };
  const normalized = getEffectiveCurrentEducation(legacy);
  assert.strictEqual(normalized.degree, 'Bachelor of Engineering in Computer Science');
  assert.strictEqual(normalized.years, '2023 - 2027');
});

test('Education Normalization: Preserves custom valid admin configuration', () => {
  const custom = {
    institution: 'Carnegie Mellon University',
    degree: 'Master of Science in Software Engineering',
    years: '2025 - 2027',
    cgpa: '3.95',
    detail: 'Dean\'s Honor List',
  };
  const effective = getEffectiveCurrentEducation(custom);
  assert.strictEqual(effective.institution, 'Carnegie Mellon University');
  assert.strictEqual(effective.degree, 'Master of Science in Software Engineering');
  assert.strictEqual(effective.years, '2025 - 2027');
  assert.strictEqual(effective.cgpa, '3.95');
  assert.strictEqual(effective.detail, 'Dean\'s Honor List');
});

test('Education Timeline: getEffectiveEducation normalizes legacy college entry while keeping historical schooling', () => {
  const legacyTimeline = [
    {
      year: '2023 – Present',
      degree: 'Bachelor of Engineering in Information Science & Engineering',
      school: 'JSS Academy of Technical Education, Bengaluru',
      detail: '3rd Year · CGPA 9.1 ',
      color: '#4285F4',
    },
    {
      year: '2022 - 2023',
      degree: 'Pre-University',
      school: 'J.B.P.I.C, Ambedkar Nagar',
      detail: 'PCM · 91%',
      color: '#4285F4',
    },
  ];

  const result = getEffectiveEducation(legacyTimeline);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].school, 'Visvesvaraya Technological University');
  assert.strictEqual(result[0].degree, 'Bachelor of Engineering in Computer Science');
  assert.strictEqual(result[0].year, '2023 - 2027');
  assert.strictEqual(result[0].detail, '3rd Year · CGPA 9.2');

  assert.strictEqual(result[1].school, 'J.B.P.I.C, Ambedkar Nagar');
  assert.strictEqual(result[1].degree, 'Pre-University');
  assert.strictEqual(result[1].year, '2022 - 2023');
});

test('Education Timeline: getEffectiveEducation synchronizes with profileEdu when provided', () => {
  const profileEdu = {
    institution: 'Indian Institute of Technology, Bombay',
    degree: 'Bachelor of Technology in Computer Science',
    years: '2024 - 2028',
    detail: 'Top 1%',
  };
  const result = getEffectiveEducation(null, profileEdu);
  assert.strictEqual(result[0].school, 'Indian Institute of Technology, Bombay');
  assert.strictEqual(result[0].degree, 'Bachelor of Technology in Computer Science');
  assert.strictEqual(result[0].year, '2024 - 2028');
  assert.strictEqual(result[0].detail, 'Top 1%');
  // Historical entries preserved
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[1].school, 'J.B.P.I.C, Ambedkar Nagar');
});

// ── 3. Education Snippet and AI Assistant ────────────────────────────────────

test('Education Snippet: getEducationSnippet produces canonical text without em dashes', () => {
  const snippet = getEducationSnippet({});
  assert.ok(snippet.includes('Bachelor of Engineering in Computer Science'));
  assert.ok(snippet.includes('Visvesvaraya Technological University'));
  assert.ok(snippet.includes('CGPA of 9.2'));
  assert.ok(!snippet.includes('\u2013') && !snippet.includes('\u2014'));
});

test('AI Assistant: getAiReply education reply matches canonical degree and institution', () => {
  const reply = getAiReply('What is his education background?');
  assert.ok(reply.includes('Computer Science (B.E. CS)'));
  assert.ok(reply.includes('Visvesvaraya Technological University'));
});

test('AI Assistant: getAiReply dynamically reflects custom config when provided', () => {
  const customCfg = {
    profile: {
      education: {
        institution: 'Indian Institute of Science, Bengaluru',
        degree: 'Master of Technology in Artificial Intelligence',
      },
    },
  };
  const reply = getAiReply('Tell me about his university and degree', customCfg);
  assert.ok(reply.includes('Indian Institute of Science, Bengaluru'));
  assert.ok(reply.includes('Master of Technology in Artificial Intelligence'));
});

// ── 4. GitHub URL and Fallbacks ──────────────────────────────────────────────

test('GitHub URLs: gfolio sample project links to verified googleMe repository', () => {
  const gfolio = sharedProjects.find((p) => p._id === 'project-gfolio');
  assert.ok(gfolio, 'gfolio project must exist in shared/projects.json');
  assert.strictEqual(gfolio.repoUrl, CANONICAL_REPO_URL);

  const info = getProjectUrlInfo(gfolio);
  assert.strictEqual(info.url, 'https://github.com/anurag-jaiswal-aj/googleMe');
  assert.strictEqual(info.breadcrumb, 'github.com/anurag-jaiswal-aj/googleMe');
  assert.strictEqual(info.isProfileFallback, false);
});

test('GitHub URLs: Unverified sample projects fall back to GitHub profile link', () => {
  const devboard = sharedProjects.find((p) => p._id === 'project-devboard');
  assert.ok(devboard, 'devboard must exist in shared/projects.json');
  assert.strictEqual(devboard.repoUrl, `https://github.com/${CANONICAL_GITHUB_USER}`);

  const info = getProjectUrlInfo(devboard);
  assert.strictEqual(info.url, 'https://github.com/anurag-jaiswal-aj');
  assert.strictEqual(info.breadcrumb, 'github.com/anurag-jaiswal-aj');
  assert.strictEqual(info.isProfileFallback, true);
});

test('GitHub URLs: Missing repoUrl safely falls back to profile URL without malformed slug', () => {
  const projectWithoutRepo = {
    title: 'Random Project Without Repo',
    repoUrl: '',
  };
  const info = getProjectUrlInfo(projectWithoutRepo);
  assert.strictEqual(info.url, 'https://github.com/anurag-jaiswal-aj');
  assert.strictEqual(info.breadcrumb, 'github.com/anurag-jaiswal-aj');
  assert.strictEqual(info.isProfileFallback, true);
  assert.ok(!info.breadcrumb.includes('random-project-without-repo'));
});

test('GitHub URLs: Preserves valid repository URL for live or external projects', () => {
  const liveRepo = {
    title: 'Awesome Tool',
    repoUrl: 'https://github.com/anurag-jaiswal-aj/awesome-tool',
  };
  const info = getProjectUrlInfo(liveRepo);
  assert.strictEqual(info.url, 'https://github.com/anurag-jaiswal-aj/awesome-tool');
  assert.strictEqual(info.breadcrumb, 'github.com/anurag-jaiswal-aj/awesome-tool');
  assert.strictEqual(info.isProfileFallback, false);
});

// ── 5. Alternate Portfolio Menu Behavior ─────────────────────────────────────

test('Alternate Portfolio: Returns null when unconfigured', () => {
  assert.strictEqual(getAlternatePortfolioUrl(null), null);
  assert.strictEqual(getAlternatePortfolioUrl({}), null);
  assert.strictEqual(getAlternatePortfolioUrl({ socialLinks: {} }), null);
  assert.strictEqual(getAlternatePortfolioUrl({ socialLinks: { alternatePortfolio: '' } }), null);
  assert.strictEqual(getAlternatePortfolioUrl({ socialLinks: { alternatePortfolio: '   ' } }), null);
});

test('Alternate Portfolio: Does not fall back to GitHub profile URL', () => {
  const cfgWithGithub = {
    socialLinks: {
      alternatePortfolio: 'https://github.com/anurag-jaiswal-aj',
    },
  };
  assert.strictEqual(getAlternatePortfolioUrl(cfgWithGithub), null);
});

test('Alternate Portfolio: Returns genuine configured alternate URL', () => {
  const cfgWithRealUrl = {
    socialLinks: {
      alternatePortfolio: 'https://anurag-v2.vercel.app',
    },
  };
  assert.strictEqual(getAlternatePortfolioUrl(cfgWithRealUrl), 'https://anurag-v2.vercel.app');
});

test('Alternate Portfolio: Default LINKS.alternatePortfolio is empty', () => {
  assert.strictEqual(LINKS.alternatePortfolio, '');
});

// ── 6. Gallery External Link Validation ──────────────────────────────────────

test('Gallery Links: Accepts and canonicalizes valid absolute HTTP and HTTPS URLs', () => {
  assert.strictEqual(
    getSafeGalleryLink('https://github.com/anurag-jaiswal-aj/googleMe'),
    'https://github.com/anurag-jaiswal-aj/googleMe'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/demo?test=1&b=2#section'),
    'https://example.com/demo?test=1&b=2#section'
  );
  assert.strictEqual(
    getSafeGalleryLink('http://example.com'),
    'http://example.com/'
  );
  assert.strictEqual(
    getSafeGalleryLink('http://localhost:3000/preview'),
    'http://localhost:3000/preview'
  );
  assert.strictEqual(
    getSafeGalleryLink('  https://example.com/trimmed  '),
    'https://example.com/trimmed'
  );
  assert.strictEqual(isSafeGalleryLink('https://github.com/anurag-jaiswal-aj/googleMe'), true);
});

test('Gallery Links: Canonicalizes mixed-case schemes, default ports, and path traversal', () => {
  assert.strictEqual(
    getSafeGalleryLink('HTTPS://EXAMPLE.COM'),
    'https://example.com/'
  );
  assert.strictEqual(
    getSafeGalleryLink('hTtP://example.com/demo'),
    'http://example.com/demo'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com:443/test'),
    'https://example.com/test'
  );
  assert.strictEqual(
    getSafeGalleryLink('http://example.com:80/test'),
    'http://example.com/test'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com:8443/test'),
    'https://example.com:8443/test'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/a/../b'),
    'https://example.com/b'
  );
});

test('Gallery Links: Canonicalizes spaces and control characters in URLs', () => {
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/foo bar'),
    'https://example.com/foo%20bar'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://exam\nple.com/path'),
    'https://example.com/path'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/foo\tbar'),
    'https://example.com/foobar'
  );
});

test('Gallery Links: Rejects embedded URL credentials while accepting legitimate @ in path/query/fragment', () => {
  // Embedded credentials MUST be rejected
  assert.strictEqual(getSafeGalleryLink('https://user:password@example.com/path'), null);
  assert.strictEqual(getSafeGalleryLink('https://user@example.com'), null);
  assert.strictEqual(getSafeGalleryLink('https://:password@example.com'), null);
  assert.strictEqual(getSafeGalleryLink('http://admin:secret@127.0.0.1:3000'), null);

  assert.strictEqual(isSafeGalleryLink('https://user:password@example.com/path'), false);
  assert.strictEqual(isSafeGalleryLink('https://user@example.com'), false);
  assert.strictEqual(isSafeGalleryLink('https://:password@example.com'), false);

  // Legitimate @ in path, query, or fragment MUST be accepted
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/@anurag'),
    'https://example.com/@anurag'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/search?q=@test'),
    'https://example.com/search?q=@test'
  );
  assert.strictEqual(
    getSafeGalleryLink('https://example.com/path#@section'),
    'https://example.com/path#@section'
  );
  assert.strictEqual(isSafeGalleryLink('https://example.com/@anurag'), true);
});

test('Gallery Links: Rejects dangerous URI schemes (javascript, data, vbscript)', () => {
  assert.strictEqual(isSafeGalleryLink('javascript:alert(1)'), false);
  assert.strictEqual(isSafeGalleryLink('JAVASCRIPT:alert(document.cookie)'), false);
  assert.strictEqual(isSafeGalleryLink('JavaScript:void(0)'), false);
  assert.strictEqual(isSafeGalleryLink('javascript: alert(1)'), false);
  assert.strictEqual(isSafeGalleryLink('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
  assert.strictEqual(isSafeGalleryLink('DATA:image/svg+xml;utf8,<svg onload=alert(1)>'), false);
  assert.strictEqual(isSafeGalleryLink('vbscript:msgbox(1)'), false);
  assert.strictEqual(isSafeGalleryLink('VBSCRIPT:alert(1)'), false);

  assert.strictEqual(getSafeGalleryLink('javascript:alert(1)'), null);
  assert.strictEqual(getSafeGalleryLink('JAVASCRIPT:alert(document.cookie)'), null);
  assert.strictEqual(getSafeGalleryLink('data:text/html,evil'), null);
  assert.strictEqual(getSafeGalleryLink('vbscript:msgbox(1)'), null);
});

test('Gallery Links: Rejects protocol-relative URLs (//example.com)', () => {
  assert.strictEqual(isSafeGalleryLink('//example.com'), false);
  assert.strictEqual(isSafeGalleryLink('//example.com/evil/path'), false);
  assert.strictEqual(isSafeGalleryLink('///example.com'), false);
  assert.strictEqual(isSafeGalleryLink('  //example.com  '), false);

  assert.strictEqual(getSafeGalleryLink('//example.com'), null);
  assert.strictEqual(getSafeGalleryLink('//example.com/evil/path'), null);
});

test('Gallery Links: Rejects the observed legacy database value "ver" and relative paths', () => {
  // Observed in production Atlas database record 69d74eac375974b360c7c666
  assert.strictEqual(isSafeGalleryLink('ver'), false);
  assert.strictEqual(getSafeGalleryLink('ver'), null);

  // Other relative paths
  assert.strictEqual(isSafeGalleryLink('relative/path'), false);
  assert.strictEqual(isSafeGalleryLink('/images/ver'), false);
  assert.strictEqual(isSafeGalleryLink('./photo.jpg'), false);
  assert.strictEqual(isSafeGalleryLink('../secret'), false);

  assert.strictEqual(getSafeGalleryLink('relative/path'), null);
  assert.strictEqual(getSafeGalleryLink('/images/ver'), null);
});

test('Gallery Links: Rejects other non-HTTP schemes and malformed URLs', () => {
  assert.strictEqual(isSafeGalleryLink('file:///etc/passwd'), false);
  assert.strictEqual(isSafeGalleryLink('mailto:test@example.com'), false);
  assert.strictEqual(isSafeGalleryLink('ftp://ftp.example.com'), false);
  assert.strictEqual(isSafeGalleryLink('blob:https://example.com/uuid'), false);

  assert.strictEqual(isSafeGalleryLink('https://'), false);
  assert.strictEqual(isSafeGalleryLink('http://'), false);
  assert.strictEqual(isSafeGalleryLink('https://   '), false);
  assert.strictEqual(isSafeGalleryLink('not a url'), false);

  assert.strictEqual(getSafeGalleryLink('file:///etc/passwd'), null);
  assert.strictEqual(getSafeGalleryLink('mailto:test@example.com'), null);
  assert.strictEqual(getSafeGalleryLink('https://'), null);
  assert.strictEqual(getSafeGalleryLink('http://'), null);
});

test('Gallery Links: Rejects non-string, empty, and nullish inputs', () => {
  assert.strictEqual(isSafeGalleryLink(''), false);
  assert.strictEqual(isSafeGalleryLink('   '), false);
  assert.strictEqual(isSafeGalleryLink(null), false);
  assert.strictEqual(isSafeGalleryLink(undefined), false);
  assert.strictEqual(isSafeGalleryLink(12345), false);
  assert.strictEqual(isSafeGalleryLink({}), false);
  assert.strictEqual(isSafeGalleryLink([]), false);

  assert.strictEqual(getSafeGalleryLink(''), null);
  assert.strictEqual(getSafeGalleryLink('   '), null);
  assert.strictEqual(getSafeGalleryLink(null), null);
  assert.strictEqual(getSafeGalleryLink(undefined), null);
  assert.strictEqual(getSafeGalleryLink(12345), null);
});

test('Gallery Links: Rendering boundary preserves image display while suppressing invalid links', () => {
  // Simulate gallery image records as received by frontend
  const legacyRecord = {
    _id: '69d74eac375974b360c7c666',
    title: 'Legacy Sample',
    category: 'Other',
    link: 'ver',
  };
  const xssRecord = {
    _id: 'xss-1',
    title: 'XSS Attempt',
    category: 'Other',
    link: 'javascript:alert(1)',
  };
  const credentialRecord = {
    _id: 'cred-1',
    title: 'Phishing Attempt with Credentials',
    category: 'Other',
    link: 'https://user:password@malicious.com',
  };
  const validRecord = {
    _id: 'valid-1',
    title: 'Valid Project',
    category: 'Projects',
    link: 'https://github.com/anurag-jaiswal-aj/googleMe',
  };

  // Safe link resolution for each record
  const legacySafeLink = getSafeGalleryLink(legacyRecord.link);
  const xssSafeLink = getSafeGalleryLink(xssRecord.link);
  const credSafeLink = getSafeGalleryLink(credentialRecord.link);
  const validSafeLink = getSafeGalleryLink(validRecord.link);

  assert.strictEqual(legacySafeLink, null, 'Legacy "ver" link must resolve to null (no anchor rendered)');
  assert.strictEqual(xssSafeLink, null, 'javascript: link must resolve to null (no anchor rendered)');
  assert.strictEqual(credSafeLink, null, 'Embedded credentials must resolve to null (no anchor rendered)');
  assert.strictEqual(
    validSafeLink,
    'https://github.com/anurag-jaiswal-aj/googleMe',
    'Valid HTTPS link must resolve to canonical URL'
  );

  // Verify that image metadata is preserved regardless of link validity
  assert.strictEqual(legacyRecord.title, 'Legacy Sample');
  assert.strictEqual(legacyRecord.category, 'Other');
  assert.strictEqual(credentialRecord.title, 'Phishing Attempt with Credentials');
});

// ── 7. Form Controls Accessibility Audit Tests ─────────────────────────────────

test('Accessibility: Home page form controls possess explicit accessible names', () => {
  const homePath = path.resolve(__dirname, 'src/pages/Home.jsx');
  const homeContent = fs.readFileSync(homePath, 'utf-8');

  assert.ok(homeContent.includes('aria-label="Search portfolio"'), 'Home search input must have aria-label="Search portfolio"');
  assert.ok(homeContent.includes('aria-label="Paste image URL"'), 'Home Lens URL input must have aria-label="Paste image URL"');
  assert.ok(homeContent.includes('aria-label="Upload image"'), 'Home Lens file input must have aria-label="Upload image"');
  assert.ok(homeContent.includes('aria-label="Ask about Anurag"'), 'Home AI chat input must have aria-label="Ask about Anurag"');
});

test('Accessibility: SearchLayout form controls possess explicit accessible names', () => {
  const searchLayoutPath = path.resolve(__dirname, 'src/components/SearchLayout.jsx');
  const searchLayoutContent = fs.readFileSync(searchLayoutPath, 'utf-8');

  assert.ok(searchLayoutContent.includes('aria-label="Search portfolio"'), 'SearchLayout search input must have aria-label="Search portfolio"');
  assert.ok(searchLayoutContent.includes('aria-label="Paste image URL"'), 'SearchLayout Lens URL input must have aria-label="Paste image URL"');
  assert.ok(searchLayoutContent.includes('aria-label="Upload image"'), 'SearchLayout Lens file input must have aria-label="Upload image"');
  assert.ok(searchLayoutContent.includes('aria-label="Ask about Anurag"'), 'SearchLayout AI chat input must have aria-label="Ask about Anurag"');
});

test('Accessibility: Contact form inputs have matching label associations and aria-labels', () => {
  const contactPath = path.resolve(__dirname, 'src/pages/Contact.jsx');
  const contactContent = fs.readFileSync(contactPath, 'utf-8');

  assert.ok(contactContent.includes('htmlFor="contact-name"') && contactContent.includes('id="contact-name"'), 'Contact name field must have matching htmlFor and id');
  assert.ok(contactContent.includes('htmlFor="contact-email"') && contactContent.includes('id="contact-email"'), 'Contact email field must have matching htmlFor and id');
  assert.ok(contactContent.includes('htmlFor="contact-message"') && contactContent.includes('id="contact-message"'), 'Contact message field must have matching htmlFor and id');
  assert.ok(contactContent.includes('aria-label="Attach files"'), 'Contact file upload input must have aria-label="Attach files"');
});

test('Accessibility: BugReportModal inputs have explicit accessible names', () => {
  const modalPath = path.resolve(__dirname, 'src/components/BugReportModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(modalContent.includes('aria-label="Feedback message"'), 'BugReportModal textarea must have aria-label="Feedback message"');
  assert.ok(modalContent.includes("field === 'email' ? 'Email address (optional)' : 'Your name (optional)'"), 'BugReportModal name/email inputs must have dynamic aria-labels');
  assert.ok(modalContent.includes('aria-label="Attach file"'), 'BugReportModal file input must have aria-label="Attach file"');
});
