import { useEffect, useRef, useState } from "react";
import {
  BIO_PARAGRAPHS,
  SKILLS,
  EDUCATION,
  EXPERIENCE,
} from "../data/aboutData";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SearchResult from "../components/SearchResult";
import sharedProjects from "../../../shared/projects.json";
import api from "../api";
import { LINKS } from "../config/links";
import { getBlogCards } from "../data/blogPosts";
import { SOCIAL_PROFILES } from "../data/socialProfiles";
import { getToolCards } from "../data/toolsData";
import { ABOUT_QA, PEOPLE_ALSO_ASK } from "../data/allPageData";

/* ── People also ask accordion ───────────────────────── */
const PAA = PEOPLE_ALSO_ASK;

function PeopleAlsoAsk() {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = (i) => setOpenIdx((prev) => (prev === i ? null : i));
  return (
    <div className="max-w-[680px] mb-8">
      <h2 className="text-[20px] font-normal text-[#202124] dark:text-[#e8eaed] mb-3">
        People also ask
      </h2>
      <div className="border border-[#e8eaed] dark:border-[#3c4043] rounded-lg overflow-hidden">
        {PAA.map((item, i) => (
          <div
            key={item.q}
            className="border-b border-[#e8eaed] dark:border-[#3c4043] last:border-b-0"
          >
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-5 py-4
                         text-left text-sm font-medium text-[#202124] dark:text-[#e8eaed]
                         hover:bg-[#f8f9fa] dark:hover:bg-[#303134] transition-colors"
            >
              <span>{item.q}</span>
              <svg
                className={`w-4 h-4 shrink-0 ml-4 text-[#70757a] transition-transform duration-200 ${
                  openIdx === i ? "rotate-180" : ""
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
            {openIdx === i && (
              <div
                className="px-5 pb-4 text-sm text-[#133780] dark:text-[#bdc1c6] leading-relaxed
                              border-t border-[#e8eaed] dark:border-[#3c4043] pt-3"
              >
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Inline expanded content for Q&A cards ──────────── */
function QAExpanded({ type }) {
  /* Bio — paragraphs from aboutData */
  if (type === "bio") {
    return (
      <div className="mt-3 space-y-2">
        {BIO_PARAGRAPHS.map((para, i) => (
          <p
            key={i}
            className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed"
          >
            {para}
          </p>
        ))}
      </div>
    );
  }

  /* Skills — compact category + pill rows from aboutData */
  if (type === "skills") {
    return (
      <div className="mt-3 space-y-1.5">
        {SKILLS.map(({ cat, list }) => (
          <div key={cat} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide w-28 shrink-0 text-[#133780] dark:text-[#bdc1c6]">
              {cat}
            </span>
            {list.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full border border-[#e8eaed] dark:border-[#3c4043]
                           bg-[#f8f9fa] dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed]"
              >
                {tag}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  /* Education — compact timeline rows from aboutData */
  if (type === "education") {
    return (
      <div className="mt-3 space-y-2.5">
        {EDUCATION.map(({ year, degree, school, detail, color }, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
              <span className="text-[11px] text-[#70757a] dark:text-[#9aa0a6] tabular-nums">
                {year}
              </span>
              <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] leading-snug">
                {degree}
              </p>
              <p className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] leading-snug">
                {school}
              </p>
              <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6]">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Experience — compact timeline rows from aboutData */
  if (type === "experience") {
    return (
      <div className="mt-3 space-y-3">
        {EXPERIENCE.map(({ period, role, company, detail, color }, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
              <span className="text-[11px] text-[#70757a] dark:text-[#9aa0a6] tabular-nums">
                {period}
              </span>
              <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] leading-snug">
                {role}
              </p>
              <p className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] leading-snug">
                {company}
              </p>
              <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] mt-0.5 leading-relaxed">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/* ── Data ───────────────────────────────────────────── */
const QA = ABOUT_QA;

const toSlug = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const PROJECTS = sharedProjects.map((project) => ({
  url: `github.com/anurag-2911/${toSlug(project.title)}`,
  title: `${project.title} | GitHub`,
  snippet: project.description,
  href: project.repoUrl || project.demoUrl || "#",
  faviconBg: "#24292e",
  faviconLetter: "G",
}));

const TOOLS = getToolCards();
const SOCIALS = SOCIAL_PROFILES;

/* ── Section heading ─────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <p
      className="max-w-[680px] text-xs font-medium uppercase tracking-wider
                  text-[#133780] dark:text-[#bdc1c6] mb-3 mt-0"
    >
      {label}
    </p>
  );
}

function ArticleReader({ post, onClose }) {
  const scrollRef = useRef(null);

  const sanitise = (html = "") =>
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/href="(\/[^"]+)"/g, 'href="https://medium.com$1"')
      .replace(/<img[^>]*src=["']["'][^>]*>/gi, "")
      .replace(/<img(?![^>]*src=["']https?:)[^>]*>/gi, "")
      .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, "")
      .replace(/<img[^>]*\s(?:width|height)=[\"']1[\"'][^>]*>/gi, "")
      .replace(
        /<figure[^>]*>[\s]*<img[^>]*src=["']["'][^>]*>[\s\S]*?<\/figure>/gi,
        "",
      )
      .replace(
        /<figure[^>]*class="[^"]*graf--layoutOutsetLeft[^"]*"[\s\S]*?<\/figure>/gi,
        "",
      )
      .replace(/<div class="[^"]*section-content[^"]*">/gi, "")
      .replace(/<div class="[^"]*section-inner[^"]*">/gi, "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      key="reader-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-white dark:bg-[#1a1a1a] overflow-y-auto"
      ref={scrollRef}
    >
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#e8eaed] dark:border-[#333]">
        <div className="max-w-[728px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#00ab6c] flex items-center justify-center text-white text-xs font-bold">
              M
            </div>
            <span className="text-sm font-medium text-[#292929] dark:text-[#e6e6e6] hidden sm:block">
              Medium
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#6b6b6b] dark:text-[#999] px-3 py-1.5 rounded-full border border-[#e8eaed] dark:border-[#444] hover:border-[#292929] dark:hover:border-[#888] transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View on Medium
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#6b6b6b] dark:text-[#999] hover:bg-[#f2f2f2] dark:hover:bg-[#333] transition-colors"
              aria-label="Close reader"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-[728px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">
        {(post.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a] text-[#6b6b6b] dark:text-[#999]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1
          style={{ fontFamily: "'Georgia', 'Charter', serif" }}
          className="text-[42px] font-bold leading-[1.18] tracking-[-0.5px] text-[#292929] dark:text-[#e6e6e6] mb-4"
        >
          {post.title}
        </h1>

        <div className="flex items-center gap-3 py-5 mb-2 border-t border-b border-[#e8eaed] dark:border-[#333]">
          <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-base font-semibold shrink-0">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-[#292929] dark:text-[#e6e6e6]">
              Anurag
            </p>
            <p className="text-xs text-[#6b6b6b] dark:text-[#999]">
              {post.date} · {post.readTime}
            </p>
          </div>
        </div>

        <div
          className="mt-8 medium-body"
          dangerouslySetInnerHTML={{ __html: sanitise(post.content || "") }}
        />

        <div className="mt-8 pt-6 border-t border-[#e8eaed] dark:border-[#333] text-center">
          <p className="text-sm text-[#6b6b6b] dark:text-[#999] mb-4">
            For more such articles, follow me on Medium.
          </p>
          <a
            href={LINKS.medium}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#292929] dark:bg-[#e6e6e6] text-white dark:text-[#292929] text-sm font-medium hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors"
          >
            <div className="w-4 h-4 rounded-full bg-[#00ab6c] flex items-center justify-center text-white text-[9px] font-bold">
              M
            </div>
            Follow on Medium
          </a>
        </div>
      </article>
    </motion.div>
  );
}

export default function All() {
  const navigate = useNavigate();
  const [expandedQA, setExpandedQA] = useState(null);
  const [blogPosts, setBlogPosts] = useState(
    getBlogCards(3).map((post) => ({
      ...post,
      href: LINKS.medium,
      content: "",
      tags: [],
      date: "",
      readTime: "",
    })),
  );
  const [reading, setReading] = useState(null);

  useEffect(() => {
    api
      .get("/medium")
      .then((response) => {
        if (!Array.isArray(response.data) || response.data.length === 0) return;
        setBlogPosts(response.data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const total =
    QA.length +
    PROJECTS.length +
    blogPosts.length +
    TOOLS.length +
    SOCIALS.length;

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">
      <AnimatePresence>
        {reading && (
          <ArticleReader post={reading} onClose={() => setReading(null)} />
        )}
      </AnimatePresence>

      {/* Stats */}
      <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-4">
        About {total.toLocaleString()} results (0.67 seconds)
      </p>

      {/* Divider */}
      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-6" />

      {/* Q&A cards */}
      {QA.map((item, i) => {
        const isOpen = expandedQA === item.question;
        return (
          <motion.div
            key={item.question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.28 }}
          >
            <SearchResult
              url={item.url}
              title={item.question}
              snippet={item.answer}
              onTitleClick={() => setExpandedQA(isOpen ? null : item.question)}
              faviconBg={item.faviconBg}
              faviconLetter={item.faviconLetter}
              menuItems={[
                {
                  label: `Open ${item.pageName}`,
                  icon: "↗",
                  action: () => navigate(item.to),
                },
                {
                  label: "Copy link",
                  icon: "🔗",
                  action: () =>
                    navigator.clipboard.writeText(`https://${item.url}`),
                },
              ]}
            >
              {/* Inline expanded content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="expanded"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <QAExpanded type={item.type} />
                  </motion.div>
                )}
              </AnimatePresence>
            </SearchResult>
          </motion.div>
        );
      })}

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
        <motion.div
          key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (QA.length + i) * 0.05, duration: 0.28 }}
        >
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
      {blogPosts.map((post, i) => (
        <motion.div
          key={post.id || post.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: (QA.length + PROJECTS.length + i) * 0.05,
            duration: 0.28,
          }}
        >
          <SearchResult
            url={post.url}
            title={post.title}
            snippet={post.snippet}
            to={post.content ? undefined : "/blog"}
            onTitleClick={post.content ? () => setReading(post) : undefined}
            faviconBg={post.faviconBg || "#4285F4"}
            faviconLetter="B"
          />
        </motion.div>
      ))}

      {/* Tools */}
      <SectionLabel label="Tools & technologies" />
      {TOOLS.map((r, i) => (
        <motion.div
          key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: (QA.length + PROJECTS.length + blogPosts.length + i) * 0.05,
            duration: 0.28,
          }}
        >
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
        <motion.div
          key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay:
              (QA.length +
                PROJECTS.length +
                blogPosts.length +
                TOOLS.length +
                i) *
              0.05,
            duration: 0.28,
          }}
        >
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
