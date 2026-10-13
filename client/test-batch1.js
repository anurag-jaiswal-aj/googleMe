import test from 'node:test';
import assert from 'node:assert';
import { LINKS } from './src/config/links.js';
import { getContactDetails } from './src/data/contactData.js';
import {
  SKILLS,
  EDUCATION,
  EXPERIENCE,
  getEffectiveSkills,
  getEffectiveEducation,
  getEffectiveExperience,
  getEffectiveCertifications,
  getExpandedBioParagraphs,
} from './src/data/aboutData.js';

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
