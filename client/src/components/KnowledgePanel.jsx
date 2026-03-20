import { motion } from "framer-motion";
import { LINKS } from "../config/links";
import { useConfig } from "../hooks/useConfig";

// ── Defaults (used when DB config is empty) ──────────
const DEFAULT_PROFILE = {
  name:       "Anurag Jaiswal",
  title:      "Engineering Student",
  statusText: "Open to Work",
  statusOn:   true,
  education:  {
    institution: "Visvesvaraya Technological University",
    degree:      "Bachelors of Engineering in CS",
    years:       "2023 – 2027",
  },
  footerDate: "March 2026",
};

const DEFAULT_SKILLS = [
  { name: "Machine Learning",                pct: 88, color: "#4285F4" },
  { name: "Web Development",                 pct: 82, color: "#34A853" },
  { name: "Data Structures and Algorithms",  pct: 75, color: "#FBBC05" },
  { name: "Data Science",                    pct: 70, color: "#EA4335" },
];

const DEFAULT_LINKS = {
  linkedin:  LINKS.linkedin,
  github:    LINKS.github,
  leetcode:  LINKS.leetcode,
  codechef:  LINKS.codechef,
  twitter:   LINKS.twitter,
  email:     LINKS.email,
  mailto:    LINKS.mailto,
};

const DIVIDER = (
  <div className="h-px bg-[#e8eaed] dark:bg-[#3c4043] my-3 mx-5" />
);

export default function KnowledgePanel() {
  const cfg = useConfig();

  const profile = { ...DEFAULT_PROFILE,   ...(cfg.profile   ?? {}) };
  const skills  = cfg.knowledgeSkills ?? DEFAULT_SKILLS;
  const links   = { ...DEFAULT_LINKS,     ...(cfg.socialLinks ?? {}) };

  const edu = { ...DEFAULT_PROFILE.education, ...(profile.education ?? {}) };

  // ── Circle profiles (row 1) ──────────────────────
  const CIRCLE_PROFILES = [
    {
      name: "LinkedIn",
      href: links.linkedin,
      bg: "#0a66c2",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      href: links.github,
      bg: "#24292e",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      ),
    },
    {
      name: "LeetCode",
      href: links.leetcode,
      bg: "#FFA116",
      icon: (
        <img src="https://cdn.simpleicons.org/leetcode/ffffff" className="w-5 h-5" alt="LeetCode" />
      ),
    },
    {
      name: "CodeChef",
      href: links.codechef,
      bg: "#5B4638",
      icon: (
        <img src="https://cdn.simpleicons.org/codechef/ffffff" className="w-5 h-5" alt="CodeChef" />
      ),
    },
  ];

  const CARD_PROFILES = [
    {
      name: "Twitter/X",
      handle: links.twitter ? links.twitter.replace(/^https?:\/\/(www\.)?x\.com\//, "@").replace(/^https?:\/\/(www\.)?twitter\.com\//, "@") : "@therightrag",
      href: links.twitter,
      color: "#1d9bf0",
      icon: (
        <img src="https://cdn.simpleicons.org/x/1d9bf0" className="w-5 h-5" alt="X" />
      ),
    },
    {
      name: "Email",
      handle: links.email,
      href: links.mailto || `mailto:${links.email}`,
      color: "#EA4335",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-full md:w-[360px] shrink-0">
      <div className="border border-[#dadce0] dark:border-[#3c4043] rounded-2xl overflow-hidden bg-white dark:bg-[#202124] shadow-sm">

        {/* Header */}
        <div className="px-5 pt-5 pb-1 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#4285F4] flex items-center justify-center shadow-md ring-[3px] ring-[#EA4335] ring-offset-2 ring-offset-white dark:ring-offset-[#202124]">
              <img
                src={cfg.avatarUrl || "/avatar.jpg"}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <span className="hidden w-full h-full items-center justify-center text-white text-2xl font-bold select-none">
                {profile.name?.charAt(0) ?? "A"}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">
              {profile.name}
            </h2>
            <p className="text-sm text-[#70757a] dark:text-[#9aa0a6]">{profile.title}</p>
            {profile.statusOn && (
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-[#34A853]">
                <span className="w-2 h-2 rounded-full bg-[#34A853] inline-block" />
                {profile.statusText}
              </span>
            )}
          </div>
        </div>

        {DIVIDER}

        {/* Education */}
        <div className="px-5 space-y-2.5">
          <div className="flex items-start gap-3">
            <div>
              <p className="text-[11px] text-[#70757a] dark:text-[#9aa0a6] uppercase tracking-wide mb-0.5">Education</p>
              <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{edu.institution}</p>
              <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6]">{edu.degree} ({edu.years})</p>
            </div>
          </div>
        </div>

        {DIVIDER}

        {/* Top Skills */}
        <div className="px-5">
          <p className="text-[11px] text-[#70757a] dark:text-[#9aa0a6] uppercase tracking-wide mb-0.5">Top Skills</p>
          <div className="space-y-2">
            {skills.map(({ name, pct, color }) => (
              <div key={name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-[#202124] dark:text-[#e8eaed]">{name}</span>
                  <span className="text-xs text-[#70757a] dark:text-[#9aa0a6]">{pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#e8eaed] dark:bg-[#3c4043] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {DIVIDER}

        {/* Profiles & Contact */}
        <div className="px-5">
          <p className="text-[11px] text-[#70757a] dark:text-[#9aa0a6] uppercase tracking-wide mb-2">Profiles &amp; Contact</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {CIRCLE_PROFILES.map(({ name, href, bg, icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group" title={name}>
                <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-opacity group-hover:opacity-80"
                  style={{ backgroundColor: bg }}>
                  {icon}
                </span>
                <span className="text-[10px] text-[#70757a] dark:text-[#9aa0a6] text-center leading-tight">{name}</span>
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {CARD_PROFILES.map(({ name, handle, href, color, icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#e8eaed] dark:border-[#3c4043]
                           hover:border-[#dadce0] dark:hover:border-[#5f6368] hover:bg-[#f8f9fa] dark:hover:bg-[#303134] transition-colors">
                <span style={{ color }} className="shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] leading-tight">{name}</p>
                  <p className="text-[10px] text-[#70757a] dark:text-[#9aa0a6] truncate">{handle}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="px-5 pt-3 pb-3 text-[11px] text-[#70757a] dark:text-[#9aa0a6] text-center">
          Built &amp; maintained by {profile.name?.split(" ")[0] ?? "Anurag"} · Updated {profile.footerDate}
        </p>
      </div>
    </aside>
  );
}
