import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';

/* ── Dummy data ─────────────────────────────────────── */
const SKILLS = [
  { cat: 'Languages',  list: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++'] },
  { cat: 'Frontend',   list: ['React', 'Next.js', 'TailwindCSS', 'HTML5', 'CSS3'] },
  { cat: 'Backend',    list: ['Node.js', 'Express', 'REST APIs', 'GraphQL'] },
  { cat: 'Database',   list: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'] },
  { cat: 'DevOps',     list: ['Docker', 'Git', 'GitHub Actions', 'Linux'] },
];

const EDUCATION = [
  {
    year: '2022 – Present',
    degree: 'B.Tech — Information Science & Engineering',
    school: 'RV College of Engineering, Bengaluru',
    detail: '3rd Year · 5th Semester · CGPA 8.5 / 10',
    color: '#4285F4',
  },
  {
    year: '2020 – 2022',
    degree: 'Higher Secondary (12th Grade)',
    school: 'Delhi Public School, New Delhi',
    detail: 'Science Stream (PCM + CS) · 92.4%',
    color: '#34A853',
  },
  {
    year: '2008 – 2020',
    degree: 'Secondary School (1st – 10th Grade)',
    school: 'Delhi Public School, New Delhi',
    detail: 'CBSE · 94%',
    color: '#FBBC05',
  },
];

const EXPERIENCE = [
  {
    period: 'May – Jul 2024',
    role: 'Full-Stack Web Development Intern',
    company: 'Infosys Ltd. · Bengaluru (On-site)',
    detail: 'Built and shipped three production features using React + Node.js. Reduced API response time by 30% through query optimisation. Worked in a 6-person Agile squad with 2-week sprints.',
    color: '#EA4335',
  },
  {
    period: 'Dec 2023 – Feb 2024',
    role: 'Open-Source Contributor',
    company: 'Various GitHub Repositories',
    detail: 'Contributed bug-fixes and documentation improvements to two mid-sized open-source projects (combined 2k+ stars). Pull requests merged within 48 hrs on average.',
    color: '#1a73e8',
  },
];

const SECTIONS = ['Bio', 'Skills', 'Education', 'Experience'];
const SORT_OPTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'az',        label: 'A \u2192 Z' },
];

/* ── Sitelinks strip ────────────────────────────────── */
function Sitelinks({ links }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-0">
      {links.map(({ label, to }) => (
        <a key={label} href={to}
           className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline py-1.5
                      border-b border-[#e8eaed] dark:border-[#3c4043] truncate">
          {label}
        </a>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────── */
export default function About() {
  const [filters,    setFilters]    = useState([]);
  const [sort,       setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);

  const ALL = [
    { id: 'Bio',        delay: 0.05 },
    { id: 'Skills',     delay: 0.10 },
    { id: 'Education',  delay: 0.15 },
    { id: 'Experience', delay: 0.20 },
  ];

  let visible = filters.length === 0
    ? ALL
    : ALL.filter(r => filters.includes(r.id));

  if (sort === 'az') visible = [...visible].sort((a, b) => a.id.localeCompare(b.id));

  const show = id => visible.some(r => r.id === id);

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">

      {/* Stats + controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          About 4 results (0.42 seconds)
        </p>
        <FilterSort
          filterOptions={SECTIONS}
          filters={filters}
          onFilterChange={setFilters}
          sortOptions={SORT_OPTS}
          sort={sort}
          onSortChange={setSort}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
        />
      </div>

      {/* Divider */}
      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

      <AnimatePresence mode="wait">
        <motion.div
          key={filters.join() + sort}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >

          {/* Result 1 - Bio */}
          {show('Bio') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <SearchResult
                url="yourname.dev \u203a about"
                title="About Me \u2014 Your Name | Full-Stack Developer"
                snippet="Hi! I'm a 3rd-year B.Tech student in Information Science & Engineering passionate about building full-stack web applications. I love clean UI, fast tooling, and solving real-world problems with code. Currently open to internships and full-time opportunities."
                faviconBg="#4285F4"
                faviconLetter="A"
              >
                <a
                  href="/resume.pdf"
                  download
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Resume (PDF)
                </a>
                <Sitelinks links={[
                  { label: 'Skills',     to: '#skills'     },
                  { label: 'Education',  to: '#education'  },
                  { label: 'Experience', to: '#experience' },
                  { label: 'Projects',   to: '/projects'   },
                  { label: 'Contact',    to: '/contact'    },
                  { label: 'Blog',       to: '/blog'       },
                ]} />
              </SearchResult>
            </motion.div>
          )}

          {/* Result 2 - Skills */}
          {show('Skills') && (
            <motion.div
              id="skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.10 }}
            >
              <SearchResult
                url="yourname.dev \u203a about \u203a skills"
                title="Skills & Technologies \u2014 Your Name"
                snippet="Full-stack skill set spanning JavaScript, TypeScript, React, Node.js, MongoDB, PostgreSQL, Docker, and more. 2+ years hands-on project experience."
                faviconBg="#34A853"
                faviconLetter="S"
              >
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                  {SKILLS.map(({ cat, list }) => (
                    <div key={cat} className="border-l-2 border-[#dadce0] dark:border-[#3c4043] pl-3">
                      <p className="text-xs font-semibold text-[#133780] dark:text-[#bdc1c6] mb-1.5 uppercase tracking-wide">
                        {cat}
                      </p>
                      {list.map(s => (
                        <p key={s} className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.7]">{s}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </SearchResult>
            </motion.div>
          )}

          {/* Result 3 - Education */}
          {show('Education') && (
            <motion.div
              id="education"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <SearchResult
                url="yourname.dev \u203a about \u203a education"
                title="Education \u2014 Your Name | Academic Timeline"
                snippet="B.Tech in Information Science & Engineering at RV College of Engineering, Bengaluru (2022\u2013Present). CGPA 8.5 / 10. Previously 12th grade at DPS with 92.4% in PCM + CS."
                faviconBg="#FBBC05"
                faviconLetter="E"
              >
                <div className="mt-3 space-y-4">
                  {EDUCATION.map(({ year, degree, school, detail, color }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{degree}</p>
                        <p className="text-sm text-[#1a73e8] dark:text-[#8ab4f8]">{school}</p>
                        <p className="text-xs text-[#133780] dark:text-[#bdc1c6] mt-0.5">{year} \u00b7 {detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SearchResult>
            </motion.div>
          )}

          {/* Result 4 - Experience */}
          {show('Experience') && (
            <motion.div
              id="experience"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.20 }}
            >
              <SearchResult
                url="yourname.dev \u203a about \u203a experience"
                title="Experience \u2014 Your Name | Work & Internships"
                snippet="Full-Stack Web Development Intern at Infosys Ltd. (Summer 2024). Shipped three production features, cut API latency by 30%, and contributed to two open-source projects on GitHub."
                faviconBg="#EA4335"
                faviconLetter="W"
              >
                <div className="mt-3 space-y-4">
                  {EXPERIENCE.map(({ period, role, company, detail, color }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{role}</p>
                        <p className="text-sm text-[#1a73e8] dark:text-[#8ab4f8]">{company}</p>
                        <p className="text-xs text-[#133780] dark:text-[#bdc1c6] mt-0.5">{period}</p>
                        <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mt-1 leading-relaxed">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SearchResult>
            </motion.div>
          )}

          {/* People also ask */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="max-w-[680px] border border-[#dadce0] dark:border-[#3c4043] rounded-xl overflow-hidden mb-8">
              <div className="px-5 py-3 border-b border-[#e8eaed] dark:border-[#3c4043]">
                <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed]">People also ask</p>
              </div>
              {[
                {
                  q: 'What technologies does Your Name know?',
                  a: 'React, Node.js, Express, MongoDB, TailwindCSS, TypeScript, Python, Docker, and more. See the Skills section above for the full list.',
                },
                {
                  q: 'Is Your Name available for freelance work?',
                  a: 'Yes! Open to freelance projects, internships, and full-time roles. Use the Contact page to get in touch — typical response within 24 hours.',
                },
                {
                  q: "Where can I see Your Name's projects?",
                  a: 'Visit the Projects page for case studies with demos, or check github.com/yourname for source code and open-source contributions.',
                },
                {
                  q: 'What is Your Name currently studying?',
                  a: 'B.Tech in Information Science & Engineering at RV College of Engineering, Bengaluru (2022\u2013Present). Currently in 3rd year, 5th semester with CGPA 8.5 / 10.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="group border-b last:border-b-0 border-[#e8eaed] dark:border-[#3c4043]">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none
                                      text-sm font-medium text-[#202124] dark:text-[#e8eaed]
                                      hover:bg-[#f8f9fa] dark:hover:bg-[#303134]">
                    {q}
                    <svg className="w-4 h-4 shrink-0 text-[#70757a] group-open:rotate-180 transition-transform"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 pt-3 text-sm text-[#133780] dark:text-[#bdc1c6] leading-relaxed
                                  border-t border-[#e8eaed] dark:border-[#3c4043]">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
