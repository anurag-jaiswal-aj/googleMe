// ─── Single source of truth for About page data ──────────────────────────────
// Imported by both About.jsx and All.jsx so there is no duplication.

// Short snippet used as the search-result snippet on About + All pages
export const BIO_SNIPPET =
  'I am a B.Tech Information Science and Engineering student and full-stack developer specialising in the MERN stack. I care deeply about clean UI, developer tooling, and building practical products.';

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

export const EDUCATION = [
  {
    year: '2023 – Present',
    degree: 'Bachelor of Engineering in Information Science & Engineering',
    school: 'JSS Academy of Technical Education, Bengaluru',
    detail: '3rd Year · CGPA 9.1 ',
    color: '#4285F4',
  },
  {
    year: '2022 – 2023',
    degree: 'Pre-University',
    school: 'J.B.P.I.C, Ambedkar Nagar',
    detail: 'PCM · 91%',
    color: '#4285F4',
  },
  {
    year: '2020 – 2021',
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
