import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import SearchResult from "../components/SearchResult";
import FilterSort from "../components/FilterSort";
import SEO from "../components/SEO";
import { ABOUT_QA } from "../data/allPageData";
import { SKILLS as DEFAULT_SKILLS, EDUCATION as DEFAULT_EDUCATION, EXPERIENCE as DEFAULT_EXPERIENCE, CERTIFICATIONS as DEFAULT_CERTIFICATIONS } from "../data/aboutData";
import { LINKS } from "../config/links";
import { useConfig } from "../hooks/useConfig";
import { useImagesPageEnabled } from "../hooks/useImagesPageEnabled";

const SECTIONS = ["Bio", "Skills", "Education", "Experience", "Certifications"];
const SORT_OPTS = [
  { value: "relevance", label: "Relevance" },
  { value: "az", label: "A \u2192 Z" },
];

/* ── Sitelinks strip ────────────────────────────────── */
function Sitelinks({ links, onLinkClick }) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
      {links.map(({ label, to, key }) => (
        <a
          key={label}
          href={to}
          onClick={(event) => {
            if (to.startsWith("#")) {
              onLinkClick?.(event, { label, to, key });
            }
          }}
          className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline py-1.5
                      border-b border-[#e8eaed] dark:border-[#3c4043] truncate"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────── */
export default function About() {
  const imagesEnabled = useImagesPageEnabled();
  const cfg = useConfig();

  // Fall back to hardcoded data if nothing saved in DB yet
  const SKILLS       = cfg.skills        ?? DEFAULT_SKILLS;
  const EDUCATION    = cfg.education     ?? DEFAULT_EDUCATION;
  const EXPERIENCE   = cfg.experience    ?? DEFAULT_EXPERIENCE;
  const CERTIFICATIONS = cfg.certifications ?? DEFAULT_CERTIFICATIONS;
  const bioParagraphs = cfg.bioParagraphs ?? null; // null = use inline JSX below
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState("relevance");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [expanded, setExpanded] = useState({
    bio: false,
    skills: false,
    edu: false,
    exp: false,
    certs: false,
  });
  const openSection = (key) => {
    if (!key) return;
    setExpanded({
      bio: key === "bio",
      skills: key === "skills",
      edu: key === "edu",
      exp: key === "exp",
      certs: key === "certs",
    });
  };
  const handleSectionLink = (event, sectionId) => {
    if (!sectionId) return;
    event.preventDefault();
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const downloadResume = () => {
    const link = document.createElement("a");
    link.href = "/Resume_aj.pdf";
    link.download = "Resume_aj.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const aboutMenuItems = [
    {
      label: "Download Resume",
      icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
      action: downloadResume,
    },
    {
      label: "Copy page link",
      icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
      action: () => {
        navigator.clipboard.writeText(`${window.location.origin}/about`);
        toast.success("Page link copied");
      },
    },
    {
      label: "View on LinkedIn",
      icon: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
      action: () => window.open(LINKS.linkedin, "_blank", "noopener,noreferrer"),
    },
  ];

  const aboutSummaryById = {
    Bio: ABOUT_QA[0],
    Skills: ABOUT_QA[1],
    Experience: ABOUT_QA[2],
  };

  const ALL = [
    { id: "Bio", delay: 0.05 },
    { id: "Education", delay: 0.1 },
    { id: "Skills", delay: 0.15 },
    { id: "Experience", delay: 0.2 },
    { id: "Certifications", delay: 0.25 },
  ];

  let visible =
    filters.length === 0 ? ALL : ALL.filter((r) => filters.includes(r.id));

  if (sort === "az")
    visible = [...visible].sort((a, b) => a.id.localeCompare(b.id));

  const renderResult = ({ id, delay }) => {
    if (id === "Bio") {
      return (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <SearchResult
            url="anuragjaiswal.me/about/bio"
            title="About Me | Anurag Jaiswal"
            snippet={aboutSummaryById.Bio.answer}
            onTitleClick={() => openSection("bio")}
            faviconBg="#4285F4"
            faviconLetter="A"
            menuItems={aboutMenuItems}
          >
            <AnimatePresence initial={false}>
              {expanded.bio && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {(bioParagraphs ?? [
                    "I enjoy building scalable full-stack web applications and exploring how machine learning can power intelligent, data-driven systems. My work involves developing applications using JavaScript, the MERN stack, Python, MongoDB, and MySQL, while also experimenting with machine learning models and data analysis.",
                    "Alongside development and ML, I actively strengthen my problem-solving skills through Data Structures and Algorithms, focusing on writing efficient and optimized solutions.",
                    "I enjoy learning new technologies, building projects, and continuously improving my ability to create scalable, intelligent software systems.",
                  ]).map((para, i) => (
                    <p key={i} className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed mt-2">{para}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <Sitelinks
              links={[
                { label: "Skills", to: "#skills", key: "skills" },
                { label: "Education", to: "#education", key: "edu" },
                { label: "Experience", to: "#experience", key: "exp" },
                { label: "Certifications", to: "#certifications", key: "certs" },
                { label: "Projects", to: "/projects" },
                { label: "Contact", to: "/contact" },
                { label: "Blog", to: "/blog" },
              ]}
              onLinkClick={(event, link) =>
                handleSectionLink(event, link.to.slice(1))
              }
            />
          </SearchResult>
        </motion.div>
      );
    }

    if (id === "Education") {
      return (
        <motion.div
          key={id}
          id="education"
          className="scroll-mt-36"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <SearchResult
            url="anuragjaiswal.me/about/education"
            title="Education | Academic Timeline"
            snippet="Bachelor of Engineering in Information Science & Engineering at JSS Academy of Technical Education, Bengaluru with a CGPA of 9.1. Pursued Pre-University in PCM and High School from J.B.P.I.C with 91% and 90% respectively."
            onTitleClick={() => openSection("edu")}
            faviconBg="#4285F4"
            faviconLetter="E"
            menuItems={aboutMenuItems}
          >
            <AnimatePresence initial={false}>
              {expanded.edu && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-4">
                    {EDUCATION.map(
                      ({ year, degree, school, detail, color }, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
                              {degree} ({year})
                            </p>
                            <p className="text-sm text-[#1a73e8] dark:text-[#8ab4f8]">
                              {school}
                            </p>
                            <p className="text-xs text-[#133780] dark:text-[#bdc1c6] mt-0.5">
                              {detail}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SearchResult>
        </motion.div>
      );
    }

    if (id === "Skills") {
      return (
        <motion.div
          key={id}
          id="skills"
          className="scroll-mt-36"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <SearchResult
            url="anuragjaiswal.me/about/skills"
            title="Skills & Technologies | My Tech Stack"
            snippet={aboutSummaryById.Skills.answer}
            onTitleClick={() => openSection("skills")}
            faviconBg="#4285F4"
            faviconLetter="S"
            menuItems={aboutMenuItems}
          >
            <AnimatePresence initial={false}>
              {expanded.skills && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                    {SKILLS.map(({ cat, list }) => (
                      <div
                        key={cat}
                        className="border-l-2 border-[#dadce0] dark:border-[#3c4043] pl-3"
                      >
                        <p className="text-xs font-semibold text-[#133780] dark:text-[#bdc1c6] mb-1.5 uppercase tracking-wide">
                          {cat}
                        </p>
                        {list.map((s) => (
                          <p
                            key={s}
                            className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.7]"
                          >
                            {s}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SearchResult>
        </motion.div>
      );
    }

    if (id === "Experience") {
      return (
        <motion.div
          key={id}
          id="experience"
          className="scroll-mt-36"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <SearchResult
            url="anuragjaiswal.me/about/experience"
            title="Experience | Work & Internships"
            snippet={aboutSummaryById.Experience.answer}
            onTitleClick={() => openSection("exp")}
            faviconBg="#4285F4"
            faviconLetter="E"
            menuItems={aboutMenuItems}
          >
            <AnimatePresence initial={false}>
              {expanded.exp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-4">
                    {EXPERIENCE.map(
                      ({ period, role, company, detail, color }, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
                              {role}
                            </p>
                            <p className="text-sm text-[#1a73e8] dark:text-[#8ab4f8]">
                              {company}
                            </p>
                            <p className="text-xs text-[#133780] dark:text-[#bdc1c6] mt-0.5">
                              {period}
                            </p>
                            <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mt-1 leading-relaxed">
                              {detail}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SearchResult>
        </motion.div>
      );
    }

    if (id === "Certifications") {
      return (
        <motion.div
          key={id}
          id="certifications"
          className="scroll-mt-36"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <SearchResult
            url="anuragjaiswal.me/about/certifications"
            title="Certifications & Courses | Verified Learning"
            snippet={`${CERTIFICATIONS.length} verified certifications from platforms including Udemy, Coursera, and IBM covering web development, Python, machine learning, and data structures.`}
            onTitleClick={() => openSection("certs")}
            faviconBg="#FBBC05"
            faviconLetter="C"
            menuItems={aboutMenuItems}
          >
            <AnimatePresence initial={false}>
              {expanded.certs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    {CERTIFICATIONS.map(({ title, issuer, year, credential, color }, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] leading-snug">
                            {title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-sm text-[#1a73e8] dark:text-[#8ab4f8]">{issuer}</p>
                            <span className="text-xs text-[#9aa0a6]">·</span>
                            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{year}</p>
                            {credential && (
                              <a
                                href={credential}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
                              >
                                View credential
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SearchResult>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">
      <SEO
        title="About"
        description="Learn about Anurag Jaiswal — Full-Stack Developer, B.Tech ISE student, MERN stack specialist. Bio, skills, education, experience, and certifications."
        path="/about"
      />
      {/* Stats + controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          About 5 results (0.42 seconds)
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
          {visible.map((item, idx) => (
            <div key={item.id}>
              {renderResult(item)}
              {/* People also ask — rendered after Education */}
              {item.id === 'Education' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="max-w-[680px] border border-[#dadce0] dark:border-[#3c4043] rounded-xl overflow-hidden mb-6">
                    <div className="px-5 py-3 border-b border-[#e8eaed] dark:border-[#3c4043]">
                      <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed]">
                        People also ask
                      </p>
                    </div>
                    {[
                      {
                        q: "Are you available for freelance work?",
                        a: "Yes. I am open to freelance projects, collaborations, and internship opportunities related to web development, backend systems, and machine learning. You can reach out through the Contact page.",
                      },
                      {
                        q: "Do you work on Machine Learning projects?",
                        a: "Yes. I explore machine learning concepts and build ML experiments using Python with libraries such as NumPy, Pandas, Scikit-learn, and Matplotlib.",
                      },
                      {
                        q: "Do you practice Data Structures & Algorithms?",
                        a: "Yes. I regularly practice Data Structures & Algorithms to improve my problem-solving skills and to design efficient and optimized solutions.",
                      },
                      {
                        q: "How do you approach learning new technologies?",
                        a: "I usually learn new technologies by building small projects and experimenting with practical implementations to understand how systems work in real-world scenarios.",
                      },
                      {
                        q: "What are you currently learning or exploring?",
                        a: "I am currently exploring advanced Machine Learning concepts, improving backend architecture knowledge, and strengthening my problem-solving skills through DSA.",
                      },
                    ].map(({ q, a }, i) => (
                      <div
                        key={q}
                        className="border-b last:border-b-0 border-[#e8eaed] dark:border-[#3c4043]"
                      >
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="w-full flex items-center justify-between px-5 py-3 cursor-pointer text-left
                                     text-sm font-medium text-[#202124] dark:text-[#e8eaed]
                                     hover:bg-[#f8f9fa] dark:hover:bg-[#303134] transition-colors"
                        >
                          {q}
                          <svg
                            className={`w-4 h-4 shrink-0 text-[#70757a] transition-transform duration-200 ${
                              openFaq === i ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <AnimatePresence initial={false}>
                          {openFaq === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-5 pb-4 pt-3 text-sm text-[#133780] dark:text-[#bdc1c6] leading-relaxed
                                            border-t border-[#e8eaed] dark:border-[#3c4043]"
                              >
                                {a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* People also search for */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="max-w-[680px] mt-4 border-t border-[#e8eaed] dark:border-[#3c4043] pt-6">
        <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">People also search for</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Open source projects and GitHub', to: '/projects' },
            { label: 'Skills and tech stack', to: '/tools' },
            { label: 'Blog posts and articles', to: '/blog' },
            imagesEnabled
              ? { label: 'Images and gallery', to: '/images' }
              : { label: 'Get in touch', to: '/contact' },
          ].map(({ label, to }) => (
            <a key={label} href={to}
               className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                          text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
