// ─── Single source of truth for About page data ──────────────────────────────
// Imported by both About.jsx and All.jsx so there is no duplication.

// Short snippet used as the search-result snippet on About + All pages
export const BIO_SNIPPET =
  'I am a B.E. CS student and full-stack developer specialising in the MERN stack. I care deeply about clean UI, developer tooling, and building practical products.';

// Full bio shown when the "About Me" card is expanded
export const BIO_PARAGRAPHS = [
  'I enjoy building scalable full-stack web applications and exploring how machine learning can power intelligent, data-driven systems. My work involves developing applications using JavaScript, the MERN stack, Python, MongoDB, and MySQL, while also experimenting with machine learning models and data analysis.',
  'Alongside development and ML, I actively strengthen my problem-solving skills through Data Structures and Algorithms, focusing on writing efficient and optimized solutions.',
  'I enjoy learning new technologies, building projects, and continuously improving my ability to create scalable, intelligent software systems.',
];

/**
 * Returns saved bio paragraphs if available and non-empty,
 * falling back to the default BIO_PARAGRAPHS.
 */
export function getBioParagraphs(saved) {
  if (Array.isArray(saved)) {
    const valid = saved
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim());
    if (valid.length > 0) return valid;
  } else if (typeof saved === 'string' && saved.trim().length > 0) {
    return [saved.trim()];
  }
  return BIO_PARAGRAPHS;
}

/**
 * Derives the short search-result snippet from the first non-empty
 * saved bio paragraph, falling back to the existing static default.
 */
export function getBioSnippet(saved, fallback = BIO_SNIPPET) {
  if (Array.isArray(saved)) {
    const first = saved.find((p) => typeof p === 'string' && p.trim().length > 0);
    if (first) return first.trim();
  } else if (typeof saved === 'string' && saved.trim().length > 0) {
    return saved.trim();
  }
  return fallback;
}

/**
 * Returns paragraphs to display in the expanded bio view.
 * If the search-result snippet already displays the first paragraph,
 * returns the subsequent paragraphs to avoid consecutive duplication
 * while keeping the complete bio readable across snippet and body.
 * If the snippet does not match the first paragraph (e.g. static fallback),
 * returns all paragraphs.
 */
export function getExpandedBioParagraphs(saved, snippet) {
  const paragraphs = getBioParagraphs(saved);
  if (
    paragraphs.length > 0 &&
    typeof snippet === 'string' &&
    paragraphs[0].trim() === snippet.trim()
  ) {
    return paragraphs.slice(1);
  }
  return paragraphs;
}


export const SKILLS = [
  {
    cat: 'Languages',
    list: ['JavaScript', 'Python', 'Java', 'C++', 'C'],
  },
  {
    cat: 'Frontend',
    list: ['React', 'HTML5', 'CSS3', 'TailwindCSS', 'Bootstrap'],
  },
  {
    cat: 'Backend',
    list: ['Node.js', 'Express.js', 'REST APIs', 'JDBC'],
  },
  {
    cat: 'Database',
    list: ['MongoDB', 'MySQL', 'Supabase'],
  },
  {
    cat: 'Machine Learning',
    list: ['NumPy', 'Pandas', 'Scikit-learn', 'Matplotlib'],
  },
  {
    cat: 'Tools',
    list: ['Git', 'GitHub', 'Linux', 'VS Code'],
  },
];

export const DEFAULT_CURRENT_EDUCATION = {
  institution: 'Visvesvaraya Technological University',
  degree: 'Bachelor of Engineering in Computer Science',
  degreeShort: 'B.E. CS',
  years: '2023 - 2027',
  cgpa: '9.2',
  detail: '3rd Year · CGPA 9.2',
};

export const EDUCATION = [
  {
    year: '2023 - 2027',
    degree: 'Bachelor of Engineering in Computer Science',
    school: 'Visvesvaraya Technological University',
    detail: '3rd Year · CGPA 9.2',
    color: '#4285F4',
  },
  {
    year: '2022 - 2023',
    degree: 'Pre-University',
    school: 'J.B.P.I.C, Ambedkar Nagar',
    detail: 'PCM · 91%',
    color: '#4285F4',
  },
  {
    year: '2020 - 2021',
    degree: 'High School',
    school: 'J.B.P.I.C, Ambedkar Nagar',
    detail: 'CS · 90%',
    color: '#4285F4',
  },
];

export const CERTIFICATIONS = [
  {
    title: "The Complete 2024 Web Development Bootcamp",
    issuer: "Udemy",
    year: "2024",
    credential: "",
    color: "#EA4335",
  },
  {
    title: "Python for Data Science, AI & Development",
    issuer: "IBM / Coursera",
    year: "2024",
    credential: "",
    color: "#4285F4",
  },
  {
    title: "Machine Learning Specialization",
    issuer: "DeepLearning.AI / Coursera",
    year: "2024",
    credential: "",
    color: "#34A853",
  },
  {
    title: "Data Structures and Algorithms",
    issuer: "Udemy",
    year: "2023",
    credential: "",
    color: "#FBBC05",
  },
];

export const EXPERIENCE = [
  {
    period: '2024 – Present',
    role: 'Freelance Web Developer',
    company: 'Independent',
    detail:
      'Developed and delivered custom web applications for clients using React, Node.js, MongoDB, and MySQL. Built responsive interfaces, backend APIs, and scalable full-stack solutions.',
    color: '#4285F4',
  },
  {
    period: '2023 – Present',
    role: 'Open-Source Contributor',
    company: 'Independent',
    detail:
      'Contributed to open-source repositories through bug fixes, feature improvements, and documentation updates. Collaborated with developers through pull requests and issue discussions.',
    color: '#4285F4',
  },
  {
    period: '2023 – Present',
    role: 'Personal Projects Developer',
    company: 'Independent',
    detail:
      'Built multiple full-stack and machine learning projects using MERN stack, Java, MongoDB, MySQL, and Python. Worked on data analysis, ML models, and scalable web applications.',
    color: '#4285F4',
  },
];

/**
 * Returns normalized skills categories if saved is valid and non-empty,
 * falling back to default SKILLS.
 */
export function getEffectiveSkills(saved) {
  if (Array.isArray(saved) && saved.length > 0) {
    const valid = saved
      .filter(
        (c) =>
          c &&
          typeof c === 'object' &&
          typeof c.cat === 'string' &&
          c.cat.trim().length > 0 &&
          Array.isArray(c.list)
      )
      .map((c) => ({
        cat: c.cat.trim(),
        list: c.list
          .map((s) => (typeof s === 'string' ? s.trim() : String(s)))
          .filter(Boolean),
      }))
      .filter((c) => c.list.length > 0);
    if (valid.length > 0) return valid;
  }
  return SKILLS;
}

/**
 * Normalizes current education object from cfg.profile.education,
 * handling legacy values and falling back to canonical defaults.
 */
export function getEffectiveCurrentEducation(profileEdu) {
  if (!profileEdu || typeof profileEdu !== 'object') {
    return { ...DEFAULT_CURRENT_EDUCATION };
  }

  const rawInstitution = typeof profileEdu.institution === 'string' ? profileEdu.institution.trim() : '';
  const rawDegree = typeof profileEdu.degree === 'string' ? profileEdu.degree.trim() : '';
  const rawYears = typeof profileEdu.years === 'string' ? profileEdu.years.trim() : '';
  const rawCgpa = typeof profileEdu.cgpa === 'string' ? profileEdu.cgpa.trim() : '';
  const rawDetail = typeof profileEdu.detail === 'string' ? profileEdu.detail.trim() : '';

  // Deterministically normalize legacy values to canonical defaults:
  const isLegacyInstitution =
    rawInstitution === 'JSS Academy of Technical Education, Bengaluru' ||
    rawInstitution === '';
  const institution = isLegacyInstitution
    ? DEFAULT_CURRENT_EDUCATION.institution
    : rawInstitution;

  const isLegacyDegree =
    rawDegree === 'Bachelors of Engineering in CS' ||
    rawDegree === 'Bachelor of Engineering in Information Science & Engineering' ||
    rawDegree.includes('Information Science') ||
    rawDegree === '';
  const degree = isLegacyDegree
    ? DEFAULT_CURRENT_EDUCATION.degree
    : rawDegree;

  const isLegacyYears =
    rawYears === '2023 – 2027' ||
    rawYears === '2023 – Present' ||
    rawYears === '2023 - Present' ||
    rawYears === '';
  const years = isLegacyYears
    ? DEFAULT_CURRENT_EDUCATION.years
    : rawYears;

  const isLegacyDetail =
    rawDetail === '3rd Year · CGPA 9.1 ' ||
    rawDetail === '3rd Year · CGPA 9.1' ||
    rawDetail === '';
  const detail = isLegacyDetail
    ? DEFAULT_CURRENT_EDUCATION.detail
    : rawDetail;

  const cgpa = (rawCgpa && rawCgpa !== '9.1') ? rawCgpa : DEFAULT_CURRENT_EDUCATION.cgpa;

  return {
    institution,
    degree,
    degreeShort: DEFAULT_CURRENT_EDUCATION.degreeShort,
    years,
    cgpa,
    detail,
  };
}

/**
 * Returns normalized education timeline if saved is valid and non-empty,
 * falling back to default EDUCATION. Synchronizes current college entry
 * with authoritative profile education when present.
 */
export function getEffectiveEducation(saved, profileEdu = null) {
  const currentEdu = getEffectiveCurrentEducation(profileEdu);

  if (Array.isArray(saved) && saved.length > 0) {
    const valid = saved
      .filter(
        (e) =>
          e &&
          typeof e === 'object' &&
          ((typeof e.degree === 'string' && e.degree.trim().length > 0) ||
            (typeof e.school === 'string' && e.school.trim().length > 0))
      )
      .map((e, idx) => {
        const rawSchool = typeof e.school === 'string' ? e.school.trim() : '';
        const rawDegree = typeof e.degree === 'string' ? e.degree.trim() : '';
        const rawYear = typeof e.year === 'string' ? e.year.trim() : '';
        const rawDetail = typeof e.detail === 'string' ? e.detail.trim() : '';
        const color =
          typeof e.color === 'string' && e.color.trim().length > 0
            ? e.color.trim()
            : '#4285F4';

        // Entry 0 represents current college education
        if (idx === 0) {
          const isLegacyOrCollege =
            rawSchool === 'JSS Academy of Technical Education, Bengaluru' ||
            rawSchool === 'Visvesvaraya Technological University' ||
            rawDegree.includes('Information Science') ||
            rawDegree.includes('Computer Science') ||
            rawDegree === 'Bachelors of Engineering in CS' ||
            rawDegree === 'Bachelor of Engineering in Computer Science' ||
            !rawSchool;

          if (isLegacyOrCollege) {
            const isLegacyDetail =
              rawDetail === '3rd Year · CGPA 9.1 ' ||
              rawDetail === '3rd Year · CGPA 9.1' ||
              !rawDetail;
            return {
              year: currentEdu.years,
              degree: currentEdu.degree,
              school: currentEdu.institution,
              detail: isLegacyDetail ? currentEdu.detail : rawDetail,
              color,
            };
          }
        }

        return {
          year: rawYear,
          degree: rawDegree,
          school: rawSchool,
          detail: rawDetail,
          color,
        };
      });
    if (valid.length > 0) return valid;
  }

  // If saved is not a valid timeline array, but profileEdu was explicitly provided
  if (profileEdu && typeof profileEdu === 'object') {
    return [
      {
        year: currentEdu.years,
        degree: currentEdu.degree,
        school: currentEdu.institution,
        detail: currentEdu.detail,
        color: '#4285F4',
      },
      ...EDUCATION.slice(1),
    ];
  }

  return EDUCATION;
}

/**
 * Returns dynamic search-result snippet for Education on About page,
 * synchronized with authoritative current education record.
 */
export function getEducationSnippet(cfg) {
  const currentEdu = getEffectiveCurrentEducation(cfg?.profile?.education);
  return `${currentEdu.degree} at ${currentEdu.institution} with a CGPA of ${currentEdu.cgpa || '9.2'}. Pursued Pre-University in PCM and High School from J.B.P.I.C with 91% and 90% respectively.`;
}

/**
 * Returns normalized experience timeline if saved is valid and non-empty,
 * falling back to default EXPERIENCE.
 */
export function getEffectiveExperience(saved) {
  if (Array.isArray(saved) && saved.length > 0) {
    const valid = saved
      .filter(
        (e) =>
          e &&
          typeof e === 'object' &&
          ((typeof e.role === 'string' && e.role.trim().length > 0) ||
            (typeof e.company === 'string' && e.company.trim().length > 0))
      )
      .map((e) => ({
        period: typeof e.period === 'string' ? e.period.trim() : '',
        role: typeof e.role === 'string' ? e.role.trim() : '',
        company: typeof e.company === 'string' ? e.company.trim() : '',
        detail: typeof e.detail === 'string' ? e.detail.trim() : '',
        color:
          typeof e.color === 'string' && e.color.trim().length > 0
            ? e.color.trim()
            : '#4285F4',
      }));
    if (valid.length > 0) return valid;
  }
  return EXPERIENCE;
}

/**
 * Returns normalized certifications if saved is valid and non-empty,
 * falling back to default CERTIFICATIONS.
 */
export function getEffectiveCertifications(saved) {
  if (Array.isArray(saved) && saved.length > 0) {
    const valid = saved
      .filter(
        (c) =>
          c &&
          typeof c === 'object' &&
          typeof c.title === 'string' &&
          c.title.trim().length > 0
      )
      .map((c) => ({
        title: c.title.trim(),
        issuer: typeof c.issuer === 'string' ? c.issuer.trim() : '',
        year: typeof c.year === 'string' ? c.year.trim() : '',
        credential:
          typeof c.credential === 'string' ? c.credential.trim() : '',
        color:
          typeof c.color === 'string' && c.color.trim().length > 0
            ? c.color.trim()
            : '#4285F4',
      }));
    if (valid.length > 0) return valid;
  }
  return CERTIFICATIONS;
}
