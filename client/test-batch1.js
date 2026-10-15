import test from 'node:test';
import assert from 'node:assert';
import { LINKS } from './src/config/links.js';
import { getContactDetails } from './src/data/contactData.js';
import {
  SKILLS,
  EDUCATION,
  EXPERIENCE,
  SKILLS_SNIPPET,
  EXPERIENCE_SNIPPET,
  getEffectiveSkills,
  getEffectiveEducation,
  getEffectiveExperience,
  getEffectiveCertifications,
  getExpandedBioParagraphs,
  getSkillsSnippet,
  getExperienceSnippet,
  getBioSnippet,
} from './src/data/aboutData.js';
import {
  DEFAULT_BLOG_POSTS_PER_PAGE,
  MIN_BLOG_POSTS_PER_PAGE,
  MAX_BLOG_POSTS_PER_PAGE,
  getEffectiveBlogPostsPerPage,
  FALLBACK_BLOG_POSTS,
} from './src/data/blogPosts.js';
import { ABOUT_QA, getQASnippet } from './src/data/allPageData.js';

// ── Contact configuration tests ──────────────────────────────────────────────

test('Contact: Configured contactInfo email takes precedence over socialLinks and LINKS', () => {
  const cfg = {
    contactInfo: { email: 'custom-contact@example.com', phone: '+91 98765 43210', location: 'Bengaluru, India' },
    socialLinks: { email: 'social-profile@example.com' },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.email, 'custom-contact@example.com');
  assert.strictEqual(details.phone, '+91 98765 43210');
  assert.strictEqual(details.location, 'Bengaluru, India');
});

test('Contact: Missing contactInfo email falls back to socialLinks.email', () => {
  const cfg = {
    contactInfo: { email: '', phone: '', location: '' },
    socialLinks: { email: 'social-profile@example.com' },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.email, 'social-profile@example.com');
  assert.strictEqual(details.phone, '');
  assert.strictEqual(details.location, '');
});

test('Contact: Missing both contactInfo and socialLinks emails falls back to LINKS.email', () => {
  const cfg = {};
  const details = getContactDetails(cfg);
  assert.strictEqual(details.email, LINKS.email);
  assert.strictEqual(details.phone, '');
  assert.strictEqual(details.location, '');
});

test('Contact: Whitespace in email, phone, and location is trimmed properly', () => {
  const cfg = {
    contactInfo: {
      email: '   trimmed@example.com   ',
      phone: '   +1 555-0199   ',
      location: '   San Francisco, CA   ',
    },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.email, 'trimmed@example.com');
  assert.strictEqual(details.phone, '+1 555-0199');
  assert.strictEqual(details.location, 'San Francisco, CA');
});

test('Contact: Phone and location return empty string when omitted or whitespace-only', () => {
  const cfg = {
    contactInfo: {
      email: 'person@example.com',
      phone: '   ',
      location: '',
    },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.phone, '');
  assert.strictEqual(details.location, '');
});

test('Contact: Malformed or non-object contactInfo safely falls back to defaults without throwing', () => {
  assert.doesNotThrow(() => {
    const d1 = getContactDetails(null);
    assert.strictEqual(d1.email, LINKS.email);
    assert.strictEqual(d1.phone, '');
    assert.strictEqual(d1.location, '');

    const d2 = getContactDetails({ contactInfo: 'invalid-string', socialLinks: 123 });
    assert.strictEqual(d2.email, LINKS.email);
    assert.strictEqual(d2.phone, '');
    assert.strictEqual(d2.location, '');
  });
});

// ── /all Q&A data consistency tests ──────────────────────────────────────────

test('Q&A /all: getEffectiveSkills returns configured skills when present and valid', () => {
  const customSkills = [
    { cat: 'Cloud & DevOps', list: ['AWS', 'Docker', 'Kubernetes'] },
    { cat: 'Languages', list: ['Go', 'Rust'] },
  ];
  const effective = getEffectiveSkills(customSkills);
  assert.strictEqual(effective.length, 2);
  assert.strictEqual(effective[0].cat, 'Cloud & DevOps');
  assert.deepStrictEqual(effective[0].list, ['AWS', 'Docker', 'Kubernetes']);
  assert.strictEqual(effective[1].cat, 'Languages');
  assert.deepStrictEqual(effective[1].list, ['Go', 'Rust']);
});

test('Q&A /all: getEffectiveSkills falls back to default SKILLS on missing or invalid data', () => {
  assert.strictEqual(getEffectiveSkills(null), SKILLS);
  assert.strictEqual(getEffectiveSkills(undefined), SKILLS);
  assert.strictEqual(getEffectiveSkills([]), SKILLS);
  assert.strictEqual(getEffectiveSkills('invalid'), SKILLS);
  assert.strictEqual(getEffectiveSkills([{ cat: '', list: [] }]), SKILLS);
  assert.strictEqual(getEffectiveSkills([{ cat: 'Empty', list: [] }]), SKILLS);
});

test('Q&A /all: getEffectiveEducation returns configured education timeline when present and valid', () => {
  const customEdu = [
    {
      year: '2024 - 2028',
      degree: 'Master of Science in Software Engineering',
      school: 'Carnegie Mellon University',
      detail: 'GPA 3.9',
      color: '#34A853',
    },
  ];
  const effective = getEffectiveEducation(customEdu);
  assert.strictEqual(effective.length, 1);
  assert.strictEqual(effective[0].degree, 'Master of Science in Software Engineering');
  assert.strictEqual(effective[0].school, 'Carnegie Mellon University');
  assert.strictEqual(effective[0].year, '2024 - 2028');
  assert.strictEqual(effective[0].color, '#34A853');
});

test('Q&A /all: getEffectiveEducation falls back to default EDUCATION on missing or invalid data', () => {
  assert.strictEqual(getEffectiveEducation(null), EDUCATION);
  assert.strictEqual(getEffectiveEducation(undefined), EDUCATION);
  assert.strictEqual(getEffectiveEducation([]), EDUCATION);
  assert.strictEqual(getEffectiveEducation('not-an-array'), EDUCATION);
  assert.strictEqual(getEffectiveEducation([{ year: '', degree: '', school: '' }]), EDUCATION);
});

test('Q&A /all: getEffectiveExperience returns configured experience timeline when present and valid', () => {
  const customExp = [
    {
      period: '2025 - Present',
      role: 'Senior Frontend Architect',
      company: 'Acme Corp',
      detail: 'Leading design systems and microfrontends.',
      color: '#EA4335',
    },
  ];
  const effective = getEffectiveExperience(customExp);
  assert.strictEqual(effective.length, 1);
  assert.strictEqual(effective[0].role, 'Senior Frontend Architect');
  assert.strictEqual(effective[0].company, 'Acme Corp');
  assert.strictEqual(effective[0].period, '2025 - Present');
  assert.strictEqual(effective[0].color, '#EA4335');
});

test('Q&A /all: getEffectiveExperience falls back to default EXPERIENCE on missing or invalid data', () => {
  assert.strictEqual(getEffectiveExperience(null), EXPERIENCE);
  assert.strictEqual(getEffectiveExperience(undefined), EXPERIENCE);
  assert.strictEqual(getEffectiveExperience([]), EXPERIENCE);
  assert.strictEqual(getEffectiveExperience(12345), EXPERIENCE);
  assert.strictEqual(getEffectiveExperience([{ period: '', role: '', company: '' }]), EXPERIENCE);
});

test('Q&A /all: Malformed entries in skills, education, and experience do not crash rendering', () => {
  // Test with messy input containing nulls, non-strings, missing fields
  const messySkills = [
    null,
    { cat: 'Valid Category', list: ['Valid Skill', 123, '  Another Skill  '] },
    { cat: 'No list' },
  ];
  const effectiveSkills = getEffectiveSkills(messySkills);
  assert.strictEqual(effectiveSkills.length, 1);
  assert.strictEqual(effectiveSkills[0].cat, 'Valid Category');
  assert.deepStrictEqual(effectiveSkills[0].list, ['Valid Skill', '123', 'Another Skill']);

  const messyEdu = [
    undefined,
    { degree: 'Valid Degree', school: 'Valid School', color: '' },
  ];
  const effectiveEdu = getEffectiveEducation(messyEdu);
  assert.strictEqual(effectiveEdu.length, 1);
  assert.strictEqual(effectiveEdu[0].degree, 'Valid Degree');
  assert.strictEqual(effectiveEdu[0].color, '#4285F4'); // Default fallback color

  const messyExp = [
    { role: 'Engineer', company: 'Company', detail: null },
  ];
  const effectiveExp = getEffectiveExperience(messyExp);
  assert.strictEqual(effectiveExp.length, 1);
  assert.strictEqual(effectiveExp[0].role, 'Engineer');
  assert.strictEqual(effectiveExp[0].detail, '');
});

test('Q&A /all & /about Parity: Both pages consume identical effective data structures', () => {
  const sampleConfig = {
    skills: [{ cat: 'Backend', list: ['Node.js', 'PostgreSQL'] }],
    education: [{ year: '2025', degree: 'B.S.', school: 'State University', detail: 'Honors', color: '#4285F4' }],
    experience: [{ period: '2025', role: 'Developer', company: 'Startup', detail: 'Built apps', color: '#34A853' }],
  };

  const aboutSkills = getEffectiveSkills(sampleConfig.skills);
  const allSkills = getEffectiveSkills(sampleConfig.skills);
  assert.deepStrictEqual(aboutSkills, allSkills);

  const aboutEdu = getEffectiveEducation(sampleConfig.education);
  const allEdu = getEffectiveEducation(sampleConfig.education);
  assert.deepStrictEqual(aboutEdu, allEdu);

  const aboutExp = getEffectiveExperience(sampleConfig.experience);
  const allExp = getEffectiveExperience(sampleConfig.experience);
  assert.deepStrictEqual(aboutExp, allExp);
});

// ── SEC-13 Blog Pagination Tests ─────────────────────────────────────────────

test('Blog Pagination: getEffectiveBlogPostsPerPage returns configured integer within approved range [1, 50]', () => {
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 1 }), 1);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 6 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 10 }), 10);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 50 }), 50);
});

test('Blog Pagination: getEffectiveBlogPostsPerPage coerces valid integer strings within range', () => {
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: '1' }), 1);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: '12' }), 12);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: '50' }), 50);
});

test('Blog Pagination: getEffectiveBlogPostsPerPage falls back to default 6 on missing, null, or undefined', () => {
  assert.strictEqual(getEffectiveBlogPostsPerPage(null), DEFAULT_BLOG_POSTS_PER_PAGE);
  assert.strictEqual(getEffectiveBlogPostsPerPage(undefined), DEFAULT_BLOG_POSTS_PER_PAGE);
  assert.strictEqual(getEffectiveBlogPostsPerPage({}), DEFAULT_BLOG_POSTS_PER_PAGE);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: undefined }), DEFAULT_BLOG_POSTS_PER_PAGE);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: null }), DEFAULT_BLOG_POSTS_PER_PAGE);
});

test('Blog Pagination: getEffectiveBlogPostsPerPage rejects out-of-range values and falls back to 6', () => {
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 0 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: -1 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: -100 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 51 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 1000 }), 6);
});

test('Blog Pagination: getEffectiveBlogPostsPerPage rejects non-integers, NaN, and invalid types', () => {
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 4.5 }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: NaN }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: Infinity }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: 'invalid' }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: '' }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: ' ' }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: [] }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: {} }), 6);
  assert.strictEqual(getEffectiveBlogPostsPerPage({ blogPostsPerPage: true }), 6);
});

test('Blog Pagination: Pagination slice and page count reflect effective blogPostsPerPage', () => {
  const posts = FALLBACK_BLOG_POSTS; // 6 fallback posts
  const perPage2 = getEffectiveBlogPostsPerPage({ blogPostsPerPage: 2 });
  const totalPages2 = Math.ceil(posts.length / perPage2);
  assert.strictEqual(perPage2, 2);
  assert.strictEqual(totalPages2, 3);
  assert.strictEqual(posts.slice(0, perPage2).length, 2);
  assert.strictEqual(posts.slice(2, 4).length, 2);
  assert.strictEqual(posts.slice(4, 6).length, 2);

  const perPage10 = getEffectiveBlogPostsPerPage({ blogPostsPerPage: 10 });
  const totalPages10 = Math.ceil(posts.length / perPage10);
  assert.strictEqual(perPage10, 10);
  assert.strictEqual(totalPages10, 1);
  assert.strictEqual(posts.slice(0, perPage10).length, 6);
});

// ── SEC-13 Contact Location Tests ────────────────────────────────────────────

test('Contact Location: getContactDetails extracts non-empty location from contactInfo', () => {
  const cfg = {
    contactInfo: { location: 'Bengaluru, India' },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.location, 'Bengaluru, India');
});

test('Contact Location: getContactDetails trims surrounding whitespace from location', () => {
  const cfg = {
    contactInfo: { location: '   New Delhi, India   ' },
  };
  const details = getContactDetails(cfg);
  assert.strictEqual(details.location, 'New Delhi, India');
});

test('Contact Location: getContactDetails returns empty string when location is absent or empty', () => {
  assert.strictEqual(getContactDetails({}).location, '');
  assert.strictEqual(getContactDetails({ contactInfo: {} }).location, '');
  assert.strictEqual(getContactDetails({ contactInfo: { location: '' } }).location, '');
  assert.strictEqual(getContactDetails({ contactInfo: { location: '   ' } }).location, '');
  assert.strictEqual(getContactDetails({ contactInfo: { location: null } }).location, '');
  assert.strictEqual(getContactDetails({ contactInfo: { location: 12345 } }).location, '');
});

// ── SEC-13 Collapsed Skills & Experience Previews Tests ─────────────────────

test('Skills Preview: getSkillsSnippet derives concise summary from configured skills', () => {
  const configuredSkills = [
    { cat: 'Languages', list: ['TypeScript', 'Python', 'Go'] },
    { cat: 'Cloud & DevOps', list: ['AWS', 'Docker', 'Kubernetes'] },
  ];
  const snippet = getSkillsSnippet(configuredSkills);
  assert.strictEqual(snippet, 'Languages: TypeScript, Python, Go. Cloud & DevOps: AWS, Docker, Kubernetes.');
});

test('Skills Preview: getSkillsSnippet ignores empty categories and whitespace-only items', () => {
  const configuredSkills = [
    { cat: 'Backend', list: ['Node.js', '  Express  ', ''] },
    { cat: '   ', list: ['Ignored'] },
    { cat: 'Empty Category', list: [] },
  ];
  const snippet = getSkillsSnippet(configuredSkills);
  assert.strictEqual(snippet, 'Backend: Node.js, Express.');
});

test('Skills Preview: getSkillsSnippet falls back to static default when config is absent or empty', () => {
  assert.strictEqual(getSkillsSnippet(null), SKILLS_SNIPPET);
  assert.strictEqual(getSkillsSnippet(undefined), SKILLS_SNIPPET);
  assert.strictEqual(getSkillsSnippet([]), SKILLS_SNIPPET);
  assert.strictEqual(getSkillsSnippet([{ cat: '', list: [] }]), SKILLS_SNIPPET);
  assert.strictEqual(getSkillsSnippet('invalid'), SKILLS_SNIPPET);

  const customFallback = ABOUT_QA[1].answer;
  assert.strictEqual(getSkillsSnippet(null, customFallback), customFallback);
  assert.strictEqual(getSkillsSnippet([], customFallback), customFallback);
});

test('Experience Preview: getExperienceSnippet derives concise summary from multiple configured roles', () => {
  const configuredExperience = [
    {
      period: '2025 - Present',
      role: 'Staff Software Engineer',
      company: 'Tech Giant Corp',
      detail: 'Architecting distributed backend platforms.',
    },
    {
      period: '2023 - 2025',
      role: 'Full-Stack Developer',
      company: 'High Growth Startup',
      detail: 'Built React apps and Node microservices.',
    },
  ];
  const snippet = getExperienceSnippet(configuredExperience);
  assert.strictEqual(
    snippet,
    'Staff Software Engineer at Tech Giant Corp (2025 - Present). Full-Stack Developer at High Growth Startup (2023 - 2025).'
  );
});

test('Experience Preview: getExperienceSnippet formats single entry with detail when present', () => {
  const singleExperience = [
    {
      period: '2024 - Present',
      role: 'Lead Architect',
      company: 'Acme Solutions',
      detail: 'Leading core web platform development and mentoring engineers.',
    },
  ];
  const snippet = getExperienceSnippet(singleExperience);
  assert.strictEqual(
    snippet,
    'Lead Architect at Acme Solutions (2024 - Present). Leading core web platform development and mentoring engineers.'
  );
});

test('Experience Preview: getExperienceSnippet handles missing company or period gracefully', () => {
  const partialExperience = [
    {
      period: '2025',
      role: 'Independent Open Source Maintainer',
      company: '',
    },
    {
      period: '',
      role: 'Frontend Consultant',
      company: 'Digital Agency',
    },
  ];
  const snippet = getExperienceSnippet(partialExperience);
  assert.strictEqual(
    snippet,
    'Independent Open Source Maintainer (2025). Frontend Consultant at Digital Agency.'
  );
});

test('Experience Preview: getExperienceSnippet falls back to static default when config is absent or empty', () => {
  assert.strictEqual(getExperienceSnippet(null), EXPERIENCE_SNIPPET);
  assert.strictEqual(getExperienceSnippet(undefined), EXPERIENCE_SNIPPET);
  assert.strictEqual(getExperienceSnippet([]), EXPERIENCE_SNIPPET);
  assert.strictEqual(getExperienceSnippet([{ role: '', company: '' }]), EXPERIENCE_SNIPPET);
  assert.strictEqual(getExperienceSnippet('invalid'), EXPERIENCE_SNIPPET);

  const customFallback = ABOUT_QA[2].answer;
  assert.strictEqual(getExperienceSnippet(null, customFallback), customFallback);
  assert.strictEqual(getExperienceSnippet([], customFallback), customFallback);
});

test('Q&A /all: getQASnippet routes each card type to dynamic configuration and preserves safe fallback', () => {
  const customConfig = {
    bioParagraphs: ['Custom bio paragraph for Q&A.'],
    skills: [{ cat: 'Languages', list: ['Rust', 'Zig'] }],
    experience: [{ period: '2026', role: 'Systems Engineer', company: 'Embedded Inc' }],
  };

  const bioCard = ABOUT_QA[0];
  const skillsCard = ABOUT_QA[1];
  const expCard = ABOUT_QA[2];

  assert.strictEqual(getQASnippet(bioCard, customConfig), 'Custom bio paragraph for Q&A.');
  assert.strictEqual(getQASnippet(skillsCard, customConfig), 'Languages: Rust, Zig.');
  assert.strictEqual(getQASnippet(expCard, customConfig), 'Systems Engineer at Embedded Inc (2026).');

  // When config is empty, falls back safely to item.answer
  assert.strictEqual(getQASnippet(bioCard, {}), bioCard.answer);
  assert.strictEqual(getQASnippet(skillsCard, {}), skillsCard.answer);
  assert.strictEqual(getQASnippet(expCard, {}), expCard.answer);
});

test('Q&A Snippet Parity: /all and /about derive identical dynamic snippets for the same configuration', () => {
  const config = {
    bioParagraphs: ['Shared bio statement.'],
    skills: [{ cat: 'Full-Stack', list: ['React', 'Node.js'] }],
    experience: [{ period: '2025 - Present', role: 'Full-Stack Engineer', company: 'Global Tech' }],
  };

  const aboutBioSnippet = getBioSnippet(config.bioParagraphs, ABOUT_QA[0].answer);
  const allBioSnippet = getQASnippet(ABOUT_QA[0], config);
  assert.strictEqual(aboutBioSnippet, allBioSnippet);

  const aboutSkillsSnippet = getSkillsSnippet(config.skills, ABOUT_QA[1].answer);
  const allSkillsSnippet = getQASnippet(ABOUT_QA[1], config);
  assert.strictEqual(aboutSkillsSnippet, allSkillsSnippet);

  const aboutExpSnippet = getExperienceSnippet(config.experience, ABOUT_QA[2].answer);
  const allExpSnippet = getQASnippet(ABOUT_QA[2], config);
  assert.strictEqual(aboutExpSnippet, allExpSnippet);
});
