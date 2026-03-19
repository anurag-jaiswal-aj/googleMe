// ─── About / Q&A cards shown on the All page ─────────────────────────────────
// Original 3 items preserved exactly as they were.
// Only `type` and `pageName` added as metadata for All.jsx expanded rendering.

export const ABOUT_QA = [
  {
    url: "anurag.dev/about",
    question: "Who am I?",
    answer:
      "I am a B.Tech Information Science and Engineering student and full-stack developer specialising in the MERN stack. I care deeply about clean UI, developer tooling, and building practical products.",
    type: "bio",
    to: "/about",
    pageName: "About",
    faviconBg: "#00BCD4",
    faviconLetter: "A",
  },
  {
    url: "anurag.dev/toolkit",
    question: "What technologies do I work with?",
    answer:
      "JavaScript and Python are my primary languages. On the frontend I use React, TailwindCSS, and Framer Motion. Backend is Node.js and Express with MongoDB. I also work with NumPy, Pandas, Scikit-learn, and TensorFlow for machine learning.",
    type: "skills",
    to: "/tools",
    pageName: "Toolkit",
    faviconBg: "#8B5CF6",
    faviconLetter: "S",
  },
  {
    url: "anurag.dev/about",
    question: "Where have I worked?",
    answer:
      "I have internship and freelance experience building production web features, improving API performance, and contributing to open-source projects on GitHub.",
    type: "experience",
    to: "/about",
    pageName: "About",
    faviconBg: "#00BCD4",
    faviconLetter: "A",
  },
];

// ─── People Also Ask accordion (bottom of All page) ──────────────────────────

export const PEOPLE_ALSO_ASK = [
  {
    q: "How can I hire or contact Anurag quickly?",
    a: "Use the Contact page form for project discussions, freelance work, or full-time opportunities. You can also reach out via LinkedIn or email from the profile cards.",
  },
  {
    q: "Which projects best represent his full-stack skills?",
    a: "Check the Projects section for repositories with React frontend, Node/Express backend, database integration, and live demos.",
  },
  {
    q: "Does he write technical blogs and tutorials?",
    a: "Yes. The Blog page includes Medium articles with practical write-ups on React, MERN architecture, performance, and developer workflows.",
  },
  {
    q: "What is his strongest tech stack?",
    a: "MERN is the primary stack (MongoDB, Express, React, Node.js), supported by TailwindCSS, Docker, and modern API tooling.",
  },
  {
    q: "Where can I see coding profiles and problem-solving activity?",
    a: "The Profiles section links to GitHub, LeetCode, CodeChef, Codeforces, and HackerRank so you can verify coding consistency and depth.",
  },
];
