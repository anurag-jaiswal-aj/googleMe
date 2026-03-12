import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SearchResult from '../components/SearchResult';

/* ── Q&A accordion item ─────────────────────────────── */
function QAResult({ url, question, answer, to, faviconBg, faviconLetter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-[680px] mb-8">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center
                        text-white text-[9px] font-bold shrink-0"
             style={{ backgroundColor: faviconBg }}>
          {faviconLetter}
        </div>
        <span className="text-sm text-[#4d5156] dark:text-[#bdc1c6]">{url}</span>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <span className="block text-[20px] leading-[1.3] font-normal text-[#1a73e8] dark:text-[#8ab4f8] hover:underline mb-1">
          {question}
        </span>
      </button>

      <p className={`text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed ${open ? '' : 'line-clamp-2'}`}>
        {answer}
      </p>

      <button
        onClick={() => setOpen(o => !o)}
        className="mt-1 text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
      >
        {open ? 'See less' : 'See more'}
      </button>
    </div>
  );
}

/* ── People also ask accordion ───────────────────────── */
const PAA = [
  {
    q: 'What is your professional background?',
    a: 'I am a full-stack developer and B.Tech ISE student. I have experience in both freelance contracting and in-house internship roles. I build modern web applications with a focus on performance, clean code, and good UX.',
  },
  {
    q: 'What technologies do you work with?',
    a: 'JavaScript, TypeScript, Python. Frontend: React 18, Next.js, TailwindCSS. Backend: Node.js, Express, GraphQL, REST APIs. Databases: MongoDB, PostgreSQL, Redis. DevOps: Docker, Git, GitHub Actions, Linux.',
  },
  {
    q: 'Where have you worked in the past?',
    a: 'I completed a Full-Stack Web Development internship at Infosys Ltd. (Bengaluru, 2024) and have contributed to multiple open-source repositories on GitHub. Check the About page for the full timeline.',
  },
  {
    q: 'What kind of work do you do?',
    a: 'I am open to both freelance (contracting) and full-time opportunities. I specialise in building MERN stack web apps — from idea and design through to deployment. Whether it is a new product or an existing codebase that needs help, I can contribute.',
  },
];

function PeopleAlsoAsk() {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = i => setOpenIdx(prev => (prev === i ? null : i));
  return (
    <div className="max-w-[680px] mb-8">
      <h2 className="text-[20px] font-normal text-[#202124] dark:text-[#e8eaed] mb-3">
        People also ask
      </h2>
      <div className="border border-[#e8eaed] dark:border-[#3c4043] rounded-lg overflow-hidden">
        {PAA.map((item, i) => (
          <div key={item.q} className="border-b border-[#e8eaed] dark:border-[#3c4043] last:border-b-0">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-5 py-4
                         text-left text-sm font-medium text-[#202124] dark:text-[#e8eaed]
                         hover:bg-[#f8f9fa] dark:hover:bg-[#303134] transition-colors"
            >
              <span>{item.q}</span>
              <svg
                className={`w-4 h-4 shrink-0 ml-4 text-[#70757a] transition-transform duration-200 ${
                  openIdx === i ? 'rotate-180' : ''
                }`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4 text-sm text-[#133780] dark:text-[#bdc1c6] leading-relaxed
                              border-t border-[#e8eaed] dark:border-[#3c4043] pt-3">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Data ───────────────────────────────────────────── */
const QA = [
  {
    url: 'anurag.dev › about',
    question: 'Who am I?',
    answer: 'I am a B.Tech Information Science & Engineering student at RV College of Engineering, Bengaluru. I am a full-stack developer specialising in the MERN stack — React, Node.js, Express and MongoDB. I am passionate about clean UI, developer tooling, and open-source. I interned at Infosys in 2024, building production features in React and Node.js, reducing API response time by 30%. Currently open to freelance and full-time opportunities.',
    to: '/about',
    faviconBg: '#00BCD4',
    faviconLetter: 'A',
  },
  {
    url: 'anurag.dev › tools',
    question: 'What technologies do I work with?',
    answer: 'JavaScript, TypeScript, Python. Frontend: React 18, Next.js, TailwindCSS, HTML5, CSS3. Backend: Node.js, Express, REST APIs, GraphQL. Databases: MongoDB, PostgreSQL, MySQL, Redis. DevOps: Docker, Git, GitHub Actions, Linux. Also experienced with Framer Motion, Vite, Jest, and Postman.',
    to: '/tools',
    faviconBg: '#8B5CF6',
    faviconLetter: 'T',
  },
  {
    url: 'anurag.dev › about',
    question: 'Where have I worked?',
    answer: 'I completed a Full-Stack Web Development internship at Infosys Ltd. (Bengaluru, May–Jul 2024), where I built and shipped three production features and improved API performance by 30%. I have also contributed to open-source projects on GitHub — fixing bugs, writing documentation, and submitting pull requests to active repositories. Check the About page for the full experience timeline.',
    to: '/about',
    faviconBg: '#00BCD4',
    faviconLetter: 'A',
  },
];

const PROJECTS = [
  {
    url: 'github.com › anurag-2911 › gfolio',
    title: 'gfolio — Google-Inspired Portfolio',
    snippet: 'A MERN stack portfolio reimagining Google Search for personal branding. Features a responsive SERP UI, dark mode, AI search mode, animated suggestions, and a knowledge panel. Built with React, Node.js, MongoDB, Express, and TailwindCSS.',
    href: 'https://github.com/anurag-2911/gfolio',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    url: 'github.com › anurag-2911 › devboard',
    title: 'DevBoard — Developer Dashboard',
    snippet: 'Real-time developer productivity dashboard with GitHub stats integration, task tracking, and a Pomodoro timer. Connects to the GitHub REST API and renders live repo stats and contribution graphs.',
    href: 'https://github.com/anurag-2911/devboard',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    url: 'github.com › anurag-2911 › shopcart',
    title: 'ShopCart — Full-Stack E-Commerce Platform',
    snippet: 'E-commerce app with JWT auth, product catalog, cart management, Stripe payment integration, and an admin dashboard for order management. Built with React, Node.js, Express, and MongoDB.',
    href: 'https://github.com/anurag-2911/shopcart',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    url: 'github.com › anurag-2911 › chatapp',
    title: 'ChatApp — Real-Time Messaging',
    snippet: 'Real-time group and private chat using Socket.io, with rooms, typing indicators, online presence, and persistent message history stored in MongoDB.',
    href: 'https://github.com/anurag-2911/chatapp',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
];

const POSTS = [
  {
    url: 'anurag.dev › blog › mern-portfolio',
    title: 'Building a Google Search-Inspired Portfolio with MERN Stack',
    snippet: 'A deep-dive into how this very portfolio was designed and built — Google SERP layout, dark mode, AI search mode, animated suggestions, knowledge panel, and a Node.js + MongoDB backend. Every design decision explained.',
    to: '/blog',
    faviconBg: '#4285F4',
    faviconLetter: 'B',
  },
  {
    url: 'anurag.dev › blog › react-useeffect-guide',
    title: 'React useEffect: The Complete Guide to Avoiding Infinite Loops',
    snippet: 'Most React bugs trace back to useEffect misuse. Covers dependency arrays, cleanup functions, stale closures, and the mental model you need to write effects that actually work.',
    to: '/blog',
    faviconBg: '#34A853',
    faviconLetter: 'B',
  },
  {
    url: 'anurag.dev › blog › mongodb-indexing',
    title: 'MongoDB Indexing Deep Dive — Speed Up Your Queries by 10×',
    snippet: 'Explains compound indexes, the ESR rule, covered queries, and index intersection. Includes real benchmark data showing before-and-after query times on a 2M-document collection.',
    to: '/blog',
    faviconBg: '#FBBC05',
    faviconLetter: 'B',
  },
];

const SOCIALS = [
  {
    url: 'linkedin.com › in › anurag-2911',
    title: 'My LinkedIn Profile',
    snippet: 'Connect with me for professional opportunities and collaborations. View my work experience, skills, education, and recommendations.',
    href: 'https://linkedin.com/in/anurag-2911',
    faviconBg: '#0a66c2',
    faviconLetter: 'in',
  },
  {
    url: 'github.com › anurag-2911',
    title: 'My GitHub Profile',
    snippet: 'Explore my open-source projects, repositories, and contribution activity. React, Node.js, MongoDB, Python and more.',
    href: 'https://github.com/anurag-2911',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
];

const TOTAL = QA.length + PROJECTS.length + POSTS.length + SOCIALS.length;

/* ── Section heading ─────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <p className="max-w-[680px] text-xs font-medium uppercase tracking-wider
                  text-[#133780] dark:text-[#bdc1c6] mb-3 mt-0">
      {label}
    </p>
  );
}

export default function All() {
  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">

      {/* Stats */}
      <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-4">
        About {TOTAL.toLocaleString()} results (0.67 seconds)
      </p>

      {/* Divider */}
      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-6" />

      {/* Q&A cards */}
      {QA.map((item, i) => (
        <motion.div key={item.question}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.28 }}>
          <QAResult {...item} />
        </motion.div>
      ))}

      {/* People also ask */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: QA.length * 0.05 + 0.05, duration: 0.28 }}
      >
        <PeopleAlsoAsk />
      </motion.div>

      {/* Projects */}
      <SectionLabel label="Projects" />
      {PROJECTS.map((r, i) => (
        <motion.div key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (QA.length + i) * 0.05, duration: 0.28 }}>
          <SearchResult
            url={r.url}
            title={r.title}
            snippet={r.snippet}
            href={r.href}
            faviconBg={r.faviconBg}
            faviconLetter={r.faviconLetter}
          />
        </motion.div>
      ))}

      {/* Blog */}
      <SectionLabel label="From the blog" />
      {POSTS.map((r, i) => (
        <motion.div key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (QA.length + PROJECTS.length + i) * 0.05, duration: 0.28 }}>
          <SearchResult
            url={r.url}
            title={r.title}
            snippet={r.snippet}
            to={r.to}
            faviconBg={r.faviconBg}
            faviconLetter={r.faviconLetter}
          />
        </motion.div>
      ))}

      {/* Socials */}
      <SectionLabel label="Profiles" />
      {SOCIALS.map((r, i) => (
        <motion.div key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (QA.length + PROJECTS.length + POSTS.length + i) * 0.05, duration: 0.28 }}>
          <SearchResult
            url={r.url}
            title={r.title}
            snippet={r.snippet}
            href={r.href}
            faviconBg={r.faviconBg}
            faviconLetter={r.faviconLetter}
          />
        </motion.div>
      ))}
    </div>
  );
}
