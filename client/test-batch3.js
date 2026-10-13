import test from 'node:test';
import assert from 'node:assert';
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
import sharedProjects from '../shared/projects.json' with { type: 'json' };

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
