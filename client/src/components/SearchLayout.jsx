import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import KnowledgePanel from "./KnowledgePanel";
import { LINKS } from "../config/links";
import { submitFeedback } from "../api";
import { useConfig } from "../hooks/useConfig";

const TABS = [
  { label: "All",     to: "/all",      query: "anurag developer portfolio" },
  { label: "About",   to: "/about",    query: "anurag about me" },
  { label: "Projects",to: "/projects", query: "anurag projects github" },
  { label: "Blog",    to: "/blog",     query: "anurag blog posts" },
  { label: "Toolkit", to: "/tools",    query: "anurag tools stack" },
  { label: "Images",  to: "/images",   query: "anurag images gallery" },
  { label: "Contact", to: "/contact",  query: "contact anurag" },
];

const FOOTER_CYCLE = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Projects", to: "/projects" },
  { label: "Blog", to: "/blog" },
  { label: "Toolkit", to: "/tools" },
  { label: "Images", to: "/images" },
  { label: "All", to: "/all" },
];

const SUGGESTIONS = [
  { label: "developer portfolio", to: "/all" },
  { label: "about me", to: "/about" },
  { label: "projects on github", to: "/projects" },
  { label: "contact", to: "/contact" },
  { label: "blog posts", to: "/blog" },
];

// Keyword → route map for fuzzy search
const KEYWORD_ROUTES = [
  { keys: ["all", "everything", "overview", "portfolio", "home"], to: "/all" },
  {
    keys: [
      "about",
      "me",
      "who",
      "bio",
      "background",
      "info",
      "skills",
      "resume",
      "cv",
    ],
    to: "/about",
  },
  {
    keys: [
      "projects",
      "project",
      "github",
      "work",
      "code",
      "open source",
      "repos",
      "apps",
    ],
    to: "/projects",
  },
  {
    keys: ["contact", "email", "hire", "message", "reach", "connect", "talk"],
    to: "/contact",
  },
  {
    keys: [
      "blog",
      "blogs",
      "post",
      "posts",
      "article",
      "articles",
      "writing",
      "read",
    ],
    to: "/blog",
  },
];

function fuzzyRoute(q) {
  const lower = q.toLowerCase().trim();
  for (const { keys, to } of KEYWORD_ROUTES) {
    if (keys.some((k) => lower.includes(k))) return to;
  }
  return null;
}

const LOGO = [
  { char: "A", color: "#4285F4" },
  { char: "n", color: "#EA4335" },
  { char: "u", color: "#FBBC05" },
  { char: "r", color: "#4285F4" },
  { char: "a", color: "#34A853" },
  { char: "g", color: "#EA4335" },
];

export default function SearchLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = useConfig();
  const altPortfolioUrl = cfg.socialLinks?.alternatePortfolio ?? LINKS.alternatePortfolio;
  const { isDark, toggle } = useTheme();

  const [imagesPageEnabled, setImagesPageEnabled] = useState(
    () => localStorage.getItem('imagesPageEnabled') !== 'false'
  );
  const [blogPageEnabled, setBlogPageEnabled] = useState(
    () => localStorage.getItem('blogPageEnabled') !== 'false'
  );
  const [toolsPageEnabled, setToolsPageEnabled] = useState(
    () => localStorage.getItem('toolsPageEnabled') !== 'false'
  );

  useEffect(() => {
    const handler = () => setImagesPageEnabled(localStorage.getItem('imagesPageEnabled') !== 'false');
    window.addEventListener('imagesPageToggled', handler);
    return () => window.removeEventListener('imagesPageToggled', handler);
  }, []);

  useEffect(() => {
    const handler = () => setBlogPageEnabled(localStorage.getItem('blogPageEnabled') !== 'false');
    window.addEventListener('blogPageToggled', handler);
    return () => window.removeEventListener('blogPageToggled', handler);
  }, []);

  useEffect(() => {
    const handler = () => setToolsPageEnabled(localStorage.getItem('toolsPageEnabled') !== 'false');
    window.addEventListener('toolsPageToggled', handler);
    return () => window.removeEventListener('toolsPageToggled', handler);
  }, []);

  const visibleTabs = TABS.filter(t => {
    if (t.to === '/images') return imagesPageEnabled;
    if (t.to === '/blog')   return blogPageEnabled;
    if (t.to === '/tools')  return toolsPageEnabled;
    return true;
  });

  const currentTab = TABS.find((t) => t.to === location.pathname);
  const footerIndex = FOOTER_CYCLE.findIndex(
    (item) => item.to === location.pathname,
  );
  const safeFooterIndex = footerIndex === -1 ? 0 : footerIndex;
  const nextFooterLinks = [
    FOOTER_CYCLE[(safeFooterIndex + 1) % FOOTER_CYCLE.length],
    FOOTER_CYCLE[(safeFooterIndex + 2) % FOOTER_CYCLE.length],
  ];
  const [query, setQuery] = useState(currentTab?.query ?? "");
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [appsOpen, setAppsOpen] = useState(false);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSection, setHelpSection] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugForm, setBugForm] = useState({ type: "bug", message: "", name: "", email: "", attachment: null });
  const [bugSent, setBugSent] = useState(false);
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugError, setBugError] = useState("");
  const [micOpen, setMicOpen] = useState(false);
  const [micState, setMicState] = useState("idle");
  const [micTranscript, setMicTranscript] = useState("");
  const [micError, setMicError] = useState("");
  const [lensOpen, setLensOpen] = useState(false);
  const [lensImage, setLensImage] = useState(null);
  const [lensDrag, setLensDrag] = useState(false);
  const [lensUrl, setLensUrl] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const recognitionRef = useRef(null);
  const lensFileRef = useRef(null);
  const aiEndRef = useRef(null);
  const aiInputRef = useRef(null);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const appsRef = useRef(null);

  const avatarRef = useRef(null);

  // Sync search bar text with active page label
  useEffect(() => {
    const tab = TABS.find((t) => t.to === location.pathname);
    setQuery(tab?.label ?? "");
  }, [location.pathname]);

  const filtered = query.trim()
    ? SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase()),
      )
    : SUGGESTIONS;
  const showDropdown = focused && filtered.length > 0;

  const handleSelect = useCallback(
    (to) => {
      setFocused(false);
      navigate(to);
    },
    [navigate],
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) {
        handleSelect(filtered[highlighted].to);
      } else {
        const route = fuzzyRoute(query) ?? filtered[0]?.to;
        if (route) handleSelect(route);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSearch = () => {
    const route = fuzzyRoute(query) ?? filtered[0]?.to;
    if (route) handleSelect(route);
  };

  const AI_REPLIES = {
    who: "Anurag is a full-stack developer specialising in the MERN stack: React, Node.js, Express and MongoDB. He loves clean UI and fast developer tooling. Visit the About section for the full story!",
    projects: "Anurag has shipped several web apps and open-source projects. Head to the Projects section for deep-dives, or check out his GitHub for the source code.",
    hire: "Anurag is open to freelance and full-time opportunities. Drop him a message through the Contact page, there's an email form and links to all his socials.",
    stack: "Primary stack: React, Node.js, Express, MongoDB, TailwindCSS. He's also comfortable with TypeScript, Docker, REST and GraphQL APIs, and Vite.",
    blog: "Anurag writes about web development, design systems, and side-project journeys. Browse the Blog section to catch his latest posts.",
    experience: "Anurag has hands-on experience building full-stack web applications, working with REST APIs, and contributing to team projects. Check the Projects section for detailed case studies.",
    opensource: "Yes! Anurag actively contributes to open-source projects and publishes all his own work on GitHub. Visit his profile to explore repositories and contributions.",
    education: "Anurag is studying Information Science and Engineering. He complements his academics with self-driven learning in modern web dev, system design, and software engineering.",
    contact: "Reach Anurag through the Contact page. There's a direct email form and links to all his social profiles. He typically responds within 24 hours.",
    github: "All of Anurag's code lives on GitHub. You'll find the link in the top-right corner of every page, feel free to explore and star his repos!",
    greet: "Hey! I'm an AI assistant built into Anurag's portfolio. Ask me about his background, projects, tech stack, blog, or how to get in touch!",
  };

  const getAiReply = (input) => {
    const q = input.toLowerCase();
    if (/\b(hello|hi|hey|howdy)\b/.test(q)) return AI_REPLIES.greet;
    if (/education|studying|degree|university|college|academic/.test(q)) return AI_REPLIES.education;
    if (/who|about|yourself|introduce|bio|background/.test(q)) return AI_REPLIES.who;
    if (/open.?source|contribut/.test(q)) return AI_REPLIES.opensource;
    if (/project|built|portfolio|app|code/.test(q)) return AI_REPLIES.projects;
    if (/github/.test(q)) return AI_REPLIES.github;
    if (/blog|article|post|writ/.test(q)) return AI_REPLIES.blog;
    if (/hire|freelance|opportunit|availab/.test(q)) return AI_REPLIES.hire;
    if (/contact|email|touch|reach|message|connect/.test(q)) return AI_REPLIES.contact;
    if (/skill|tech|stack|language|framework|tool|work with|use/.test(q)) return AI_REPLIES.stack;
    if (/experience|work history|career/.test(q)) return AI_REPLIES.experience;
    return "Hmm, not sure about that one. Try one of the suggestion chips or ask about Anurag's projects, stack, blog, or contact info!";
  };

  const handleAiSend = (preset) => {
    const text = (preset ?? aiInput).trim();
    if (!text || aiTyping) return;
    setAiInput("");
    setAiMessages((m) => [...m, { role: "user", text }]);
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      setAiMessages((m) => [...m, { role: "ai", text: getAiReply(text) }]);
    }, 720);
  };

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages, aiTyping]);
  useEffect(() => { if (aiOpen) setTimeout(() => aiInputRef.current?.focus(), 80); }, [aiOpen]);

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("SpeechRecognition API not found. Try Chrome or Edge."); setMicState("error"); setMicOpen(true); return; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (_) {} }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    setMicTranscript(""); setMicError(""); setMicState("listening"); setMicOpen(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setMicTranscript(transcript);
      if (e.results[e.results.length - 1].isFinal) { setMicState("result"); setQuery(transcript); }
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech") return;
      else if (e.error === "not-allowed" || e.error === "service-not-allowed") { setMicError("Microphone access denied. Please allow mic access and try again."); setMicState("error"); }
      else { setMicError(`Something went wrong (${e.error}). Try again.`); setMicState("error"); }
    };
    recognition.onend = () => { setMicState((s) => (s === "listening" ? "idle" : s)); };
    try { recognition.start(); } catch (err) { setMicError(`Could not start: ${err.message}`); setMicState("error"); }
  };

  const stopVoice = () => { recognitionRef.current?.abort(); setMicOpen(false); setMicState("idle"); };

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target)) {
        setAppsOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setHighlighted(-1);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      // Ctrl+Shift+A → Admin (always)
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        navigate("/admin");
        return;
      }
      // Ctrl+Shift+H → Help modal
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        setHelpOpen(true);
        setHelpSection(0);
        return;
      }
      // Ctrl+Shift+K → Keyboard shortcuts modal
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      // Ctrl+Shift+D → toggle dark/light
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggle();
        return;
      }
      if (isTyping) return;
      // / → focus search bar
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      // G then shortcuts (navigation)
      if (e.key === "g") {
        const next = (e2) => {
          document.removeEventListener("keydown", next);
          if (e2.key === "h") navigate("/");
          else if (e2.key === "a") navigate("/about");
          else if (e2.key === "p") navigate("/projects");
          else if (e2.key === "b") navigate("/blog");
          else if (e2.key === "c") navigate("/contact");
          else if (e2.key === "t") navigate("/tools");
        };
        document.addEventListener("keydown", next, { once: true });
        return;
      }
      // Esc → close any open modal/dropdown
      if (e.key === "Escape") {
        setFocused(false);
        setAppsOpen(false);
        setAvatarOpen(false);
        setAiOpen(false);
        setMicOpen(false);
        setLensOpen(false);
        setHelpOpen(false);
        setShortcutsOpen(false);
        setBugOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, toggle]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#202124]">
      {/* ── Sticky SERP header ─────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-[#202124]">
        {/* Row 1 — logo · search · actions */}
        <div className="flex items-center gap-2 sm:gap-7 px-3 sm:px-4 pt-3 sm:pt-6 pb-1.5">
          {/* Logo — links home */}
          <Link
            to="/"
            className="shrink-0 select-none w-[84px] sm:w-[112px] ml-0 sm:ml-4"
          >
            <span className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-none">
              {LOGO.map(({ char, color }, i) => (
                <span key={i} style={{ color }}>
                  {char}
                </span>
              ))}
            </span>
          </Link>

          {/* Search bar */}
          <div
            ref={wrapperRef}
            className="relative flex-1 min-w-0 max-w-[584px]"
          >
            <div
              className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#303134]
                border rounded-full transition-all duration-150
                ${
                  focused
                    ? "border-transparent shadow-[0_1px_6px_rgba(32,33,36,0.28)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    : "border-gray-300 dark:border-[#5f6368] hover:shadow-[0_1px_6px_rgba(32,33,36,0.2)] dark:hover:shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
                }
              `}
            >
              {/* Search icon — clickable */}
              <button
                onClick={handleSearch}
                className="shrink-0 text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                aria-label="Search"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                  />
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#202124] dark:text-[#e8eaed]
                           placeholder-[#9aa0a6] outline-none"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search portfolio"
              />

              {/* Clear */}
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 text-[#70757a] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  aria-label="Clear"
                >
                  <svg
                    className="w-4 h-4"
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
              )}

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-[#dadce0] dark:bg-[#5f6368] shrink-0 mx-0.5" />

              {/* Mic */}
              <div className="relative group/mic">
                <button
                  onClick={startVoiceSearch}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="Voice search"
                  tabIndex={-1}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <defs>
                      <clipPath id="serp-mic-clip">
                        <path d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3z"/>
                      </clipPath>
                    </defs>
                    <rect x="9" y="3" width="3" height="4.5" fill="#4285F4" clipPath="url(#serp-mic-clip)"/>
                    <rect x="12" y="3" width="3" height="4.5" fill="#EA4335" clipPath="url(#serp-mic-clip)"/>
                    <rect x="9" y="7.5" width="3" height="4.5" fill="#FBBC05" clipPath="url(#serp-mic-clip)"/>
                    <rect x="12" y="7.5" width="3" height="4.5" fill="#34A853" clipPath="url(#serp-mic-clip)"/>
                    <path fill="#4285F4" d="M6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6z"/>
                    <path fill="#4285F4" d="M11.25 17v2.5h1.5V17h-1.5z"/>
                    <path fill="#4285F4" d="M8.5 19.5h7v1h-7z"/>
                  </svg>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/mic:opacity-100 transition-opacity duration-150">
                  <div className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124] text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">Voice search</div>
                  <div className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"/>
                </div>
              </div>

              {/* Lens */}
              <div className="hidden sm:block relative group/lens">
                <button
                  onClick={() => { setLensImage(null); setLensUrl(""); setLensOpen(true); }}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="Search by image"
                  tabIndex={-1}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3 3h7v2H5v5H3V3z"/>
                    <path fill="#EA4335" d="M21 3h-7v2h5v5h2V3z"/>
                    <path fill="#FBBC05" d="M3 21h7v-2H5v-5H3v7z"/>
                    <path fill="#34A853" d="M21 21h-7v-2h5v-5h2v7z"/>
                    <circle cx="12" cy="12" r="3.5" fill="none" stroke="#4285F4" strokeWidth="1.5"/>
                  </svg>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/lens:opacity-100 transition-opacity duration-150">
                  <div className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124] text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">Search by image</div>
                  <div className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"/>
                </div>
              </div>

              {/* AI */}
              <div className="hidden sm:block relative group/ai">
                <button
                  onClick={() => setAiOpen(true)}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="AI Mode"
                  tabIndex={-1}
                >
                  <svg className="w-5 h-5" viewBox="0 0 28 28" fill="none">
                    <defs>
                      <linearGradient id="serp-gem-a" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#3b82f6"/>
                        <stop offset="50%" stopColor="#8b5cf6"/>
                        <stop offset="100%" stopColor="#3b82f6"/>
                      </linearGradient>
                    </defs>
                    <path d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z" fill="url(#serp-gem-a)"/>
                    <path d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z" fill="url(#serp-gem-a)"/>
                  </svg>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/ai:opacity-100 transition-opacity duration-150">
                  <div className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124] text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">AI Mode</div>
                  <div className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"/>
                </div>
              </div>
            </div>

            {/* Dropdown suggestions */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50
                             bg-white dark:bg-[#303134] rounded-2xl
                             shadow-[0_4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]
                             border border-[#e8eaed] dark:border-[#5f6368] overflow-hidden"
                  role="listbox"
                >
                  <div
                    className="py-1"
                    style={{ maxHeight: "calc(5 * 41px)", overflowY: "auto" }}
                  >
                    {filtered.map((s, i) => (
                      <button
                        key={s.to}
                        role="option"
                        aria-selected={highlighted === i}
                        onMouseEnter={() => setHighlighted(i)}
                        onMouseLeave={() => setHighlighted(-1)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(s.to)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                          text-[#202124] dark:text-[#e8eaed] transition-colors cursor-pointer
                          ${highlighted === i ? "bg-[#f1f3f4] dark:bg-[#3c4043]" : "hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"}`}
                      >
                        <svg
                          className="w-4 h-4 shrink-0 text-[#9aa0a6]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                          />
                        </svg>
                        <span className="flex-1 truncate">{s.label}</span>
                        <svg
                          className="w-3.5 h-3.5 shrink-0 text-[#9aa0a6] rotate-[-45deg]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 12h14M12 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right icons */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 mr-1 sm:mr-4 shrink-0">
            {/* Apps grid — hidden on mobile */}
            <div className="hidden sm:block relative" ref={appsRef}>
              <button
                onClick={() => setAppsOpen((o) => !o)}
                className={`p-2 rounded-full transition-colors text-[#5f6368] dark:text-[#9aa0a6]
                  ${appsOpen ? "bg-[#e8eaed] dark:bg-[#3c4043]" : "hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]"}`}
                aria-label="Apps"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 8a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zM6 14a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zM6 20a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>

              <AnimatePresence>
                {appsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[288px] rounded-2xl shadow-xl
                               bg-white dark:bg-[#202124] border border-gray-200 dark:border-[#3c4043]
                               z-50 p-4"
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        {
                          label: "Search",
                          action: () => {
                            navigate("/");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8">
                                <path
                                  fill="#4285F4"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "Mail",
                          action: () => {
                            navigate("/contact");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg viewBox="52 42 88 66" className="w-8 h-8">
                                <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                                <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                                <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                                <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                                <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "About",
                          action: () => {
                            navigate("/about");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="8" r="3.5" fill="#4285F4"/>
                                <path d="M5 19c0-3.314 3.134-6 7-6s7 2.686 7 6" fill="#34A853"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "Works",
                          action: () => {
                            navigate("/projects");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="7" width="20" height="14" rx="2" fill="#FBBC05"/>
                                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
                                <circle cx="12" cy="14" r="2" fill="#fff"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "Blogs",
                          action: () => {
                            navigate("/blog");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="16" rx="2" fill="#34A853"/>
                                <rect x="6" y="8" width="8" height="1.8" rx="0.9" fill="#fff"/>
                                <rect x="6" y="11.5" width="12" height="1.5" rx="0.75" fill="#fff" opacity="0.8"/>
                                <rect x="6" y="14.5" width="10" height="1.5" rx="0.75" fill="#fff" opacity="0.6"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "Twitter",
                          action: () => {
                            window.open(LINKS.twitter, "_blank");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "LinkedIn",
                          action: () => {
                            window.open(LINKS.linkedin, "_blank");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#0A66C2] flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "GitHub",
                          action: () => {
                            window.open(LINKS.github, "_blank");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#1b1f23] flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: "LeetCode",
                          action: () => {
                            window.open(LINKS.leetcode, "_blank");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#FFA116] flex items-center justify-center">
                              <img src="https://cdn.simpleicons.org/leetcode/ffffff" className="w-8 h-8" alt="LeetCode"/>
                            </div>
                          ),
                        },
                        {
                          label: "CodeChef",
                          action: () => {
                            window.open(LINKS.codechef, "_blank");
                            setAppsOpen(false);
                          },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#5B4638] flex items-center justify-center">
                              <img src="https://cdn.simpleicons.org/codechef/ffffff" className="w-8 h-8" alt="CodeChef"/>
                            </div>
                          ),
                        },
                      ].map(({ label, action, icon }) => (
                        <button
                          key={label}
                          onClick={action}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl
                                     hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                        >
                          <div className="flex items-center justify-center w-14 h-14">
                            {icon}
                          </div>
                          <span className="text-xs text-[#202124] dark:text-[#e8eaed] font-medium">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center
                            text-white text-sm font-medium cursor-pointer select-none ml-1
                            ring-2 ring-[#EA4335] ring-offset-1 ring-offset-white dark:ring-offset-[#202124]"
              >
                A
              </button>
              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.13 }}
                    className="absolute right-0 mt-2.5 w-72 rounded-3xl shadow-2xl
                               bg-white dark:bg-[#1e1f20] border border-[#e8eaed] dark:border-[#3c4043]
                               z-50 overflow-hidden"
                  >
                    {/* Top: avatar + name + subtitle */}
                    <div className="flex flex-col items-center px-5 pt-6 pb-4 gap-2">
                      <div
                        className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center
                                      text-white text-2xl font-semibold
                                      ring-2 ring-[#EA4335] ring-offset-2 ring-offset-white dark:ring-offset-[#1e1f20] shrink-0"
                      >
                        A
                      </div>
                      <div className="text-center">
                        <p className="text-[15px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-snug">
                          Anurag
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(LINKS.email);
                            setCopiedEmail(true);
                            setTimeout(() => setCopiedEmail(false), 2000);
                          }}
                          className="text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] leading-snug hover:underline cursor-pointer"
                        >
                          {copiedEmail ? "Copied!" : LINKS.email}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          navigate("/about");
                          setAvatarOpen(false);
                        }}
                        className="mt-1 px-5 py-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                                   text-[13px] font-medium text-[#1a73e8] dark:text-[#8ab4f8]
                                   hover:bg-[#e8f0fe] dark:hover:bg-[#1a3a5c]/40 transition-colors"
                      >
                        View profile
                      </button>
                    </div>

                    <div className="border-t border-[#e8eaed] dark:border-[#3c4043] mx-3" />

                    {/* Alt Portfolio + Resume + Copy Email */}
                    <div className="py-1.5">
                      <a
                        href={LINKS.resume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <span className="flex-1 text-left">Resume</span>
                        <svg
                          className="w-3.5 h-3.5 text-[#9aa0a6]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </a>
                      <a
                        href={altPortfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <span className="flex-1 text-left">
                          Alternate Portfolio
                        </span>
                        <svg
                          className="w-3.5 h-3.5 text-[#9aa0a6]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </a>
                    </div>

                    <div className="border-t border-[#e8eaed] dark:border-[#3c4043] mx-3" />

                    {/* Dark/Light + Help */}
                    <div className="px-4 py-3.5 flex gap-2">
                      <button
                        onClick={() => {
                          toggle();
                          setAvatarOpen(false);
                        }}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-full
                                   border border-[#dadce0] dark:border-[#5f6368]
                                   text-[#202124] dark:text-[#e8eaed]
                                   text-[13px] font-medium hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        {isDark ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 6.343l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                        )}
                        {isDark ? "Light mode" : "Dark mode"}
                      </button>
                      <button
                        onClick={() => {
                          setHelpOpen(true);
                          setHelpSection(0);
                          setAvatarOpen(false);
                        }}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-full
                                   border border-[#dadce0] dark:border-[#5f6368]
                                   text-[#202124] dark:text-[#e8eaed]
                                   text-[13px] font-medium hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Help
                      </button>
                    </div>

                    <div className="border-t border-[#e8eaed] dark:border-[#3c4043] mx-3" />

                    {/* Others */}
                    <div className="py-1.5">
                      <button
                        onClick={() => { setShortcutsOpen(true); setAvatarOpen(false); }}
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="2" y="6" width="4" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="8" y="6" width="4" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="14" y="6" width="8" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="2" y="12" width="8" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="12" y="12" width="4" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="18" y="12" width="4" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="2" y="18" width="4" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="8" y="18" width="12" height="3" rx="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="flex-1 text-left">Keyboard shortcuts</span>
                      </button>
                      <button
                        onClick={() => { setBugSent(false); setBugForm({ type: "bug", message: "", name: "", email: "", attachment: null }); setBugOpen(true); setAvatarOpen(false); }}
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        <span className="flex-1 text-left">Report a bug / Feedback</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Row 2 — tab navigation */}
        <div className="flex items-end overflow-x-auto scrollbar-hide border-b border-[#e8eaed] dark:border-[#3c4043] -mb-px px-1">
          {/* Invisible spacer matching logo width + gap = same as row 1 */}
          <div className="hidden sm:block shrink-0 w-[112px] mr-10 sm:mr-12" />
          {/* "All" tab */}
          <Link
            to="/all"
            onClick={() => { if (location.pathname === "/all") window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 mr-0.5
                       text-sm border-b-2 transition-colors whitespace-nowrap
                       ${
                         location.pathname === "/all"
                           ? "border-[#1a73e8] dark:border-[#8ab4f8] text-[#1a73e8] dark:text-[#8ab4f8]"
                           : "border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:border-[#dadce0] dark:hover:border-[#5f6368]"
                       }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            All
          </Link>

          {visibleTabs.filter((t) => t.to !== "/all").map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => { if (location.pathname === to) window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 mr-0.5
                text-sm border-b-2 transition-colors whitespace-nowrap
                ${
                  location.pathname === to
                    ? "border-[#1a73e8] dark:border-[#8ab4f8] text-[#1a73e8] dark:text-[#8ab4f8]"
                    : "border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:border-[#dadce0] dark:hover:border-[#5f6368]"
                }`}
            >
              {label === "About" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
              {label === "Projects" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              )}
              {label === "Contact" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              )}
              {label === "Blog" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z"
                  />
                </svg>
              )}
              {label === "Toolkit" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              )}
              {label === "Images" && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Content + sticky sidebar ────────────────────── */}
      <div className="flex flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="flex flex-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Page content */}
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>

            {/* Sticky knowledge panel — scrolls up naturally when footer arrives */}
            <div className="hidden xl:block w-[420px] shrink-0">
              <div className="sticky top-[152px] w-[380px] pt-3 mb-6 max-h-[calc(100vh-168px)] overflow-y-auto ml-[-40px] mt-10">
                <KnowledgePanel />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Keyboard Shortcuts Modal ────────────────────────────── */}
      <AnimatePresence>
        {shortcutsOpen && (
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/65 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShortcutsOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-white dark:bg-[#202124] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="h-1.5 w-full flex">
                <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eaed] dark:border-[#3c4043]">
                <span className="text-[15px] font-medium text-[#202124] dark:text-[#e8eaed]">Keyboard Shortcuts</span>
                <button onClick={() => setShortcutsOpen(false)} className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                  <svg className="w-5 h-5 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="px-5 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
                {[
                  { group: "Navigation" },
                  { keys: ["/"], desc: "Focus search bar" },
                  { keys: ["g", "h"], desc: "Go to Home" },
                  { keys: ["g", "a"], desc: "Go to About" },
                  { keys: ["g", "p"], desc: "Go to Projects" },
                  { keys: ["g", "b"], desc: "Go to Blog" },
                  { keys: ["g", "c"], desc: "Go to Contact" },
                  { keys: ["g", "t"], desc: "Go to Tools" },
                  { group: "Search" },
                  { keys: ["↑", "↓"], desc: "Navigate suggestions" },
                  { keys: ["Enter"], desc: "Select suggestion / search" },
                  { keys: ["Esc"], desc: "Dismiss dropdown / close modal" },
                  { group: "UI" },
                  { keys: ["Ctrl", "Shift", "D"], desc: "Toggle dark / light mode" },
                  { keys: ["Ctrl", "Shift", "H"], desc: "Open Help" },
                  { keys: ["Ctrl", "Shift", "K"], desc: "Open Keyboard shortcuts" },
                  { keys: ["Ctrl", "Shift", "A"], desc: "Open Admin panel" },
                ].map((item, i) =>
                  item.group ? (
                    <p key={i} className="pt-3 pb-1 text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider first:pt-0">{item.group}</p>
                  ) : (
                    <div key={item.desc} className="flex items-center justify-between py-2 border-b border-[#f1f3f4] dark:border-[#2d2e30] last:border-0">
                      <span className="text-[13px] text-[#202124] dark:text-[#e8eaed]">{item.desc}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, j) => (
                          <span key={j} className="px-2 py-0.5 rounded-md bg-[#f1f3f4] dark:bg-[#303134] text-[11.5px] font-mono font-medium text-[#202124] dark:text-[#e8eaed] border border-[#dadce0] dark:border-[#5f6368]">{k}</span>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="h-1.5 w-full flex">
                <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report a Bug / Feedback Modal ───────────────────────── */}
      <AnimatePresence>
        {bugOpen && (
          <motion.div
            key="bug-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/65 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setBugOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-[480px] bg-white dark:bg-[#202124] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="h-1.5 w-full flex">
                <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>

              {bugSent ? (
                <div className="px-8 py-10 flex flex-col items-center gap-3 text-center">
                  <svg className="w-14 h-14 mb-1" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="28" fill="#e8f5e9"/>
                    <path d="M16 28l8 8 16-16" stroke="#34A853" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[17px] font-medium text-[#202124] dark:text-[#e8eaed]">Thanks for the feedback!</p>
                  <p className="text-[13px] text-[#5f6368] dark:text-[#9aa0a6]">Your message has been noted. Anurag will look into it.</p>
                  <button onClick={() => setBugOpen(false)} className="mt-3 px-7 py-2 rounded-full bg-[#1a73e8] text-white text-[13.5px] font-medium hover:bg-[#1557b0] transition-colors">Done</button>
                </div>
              ) : (
                <div className="px-6 pt-5 pb-6 max-h-[85vh] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-[15px] font-medium text-[#202124] dark:text-[#e8eaed]">Send feedback</span>
                    </div>
                    <button onClick={() => setBugOpen(false)} className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                      <svg className="w-5 h-5 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>

                  {/* Type chips — 2 rows of 3 */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { id: "bug",        label: "🐛 Bug",           color: "#EA4335" },
                      { id: "feature",    label: "✨ Feature",        color: "#4285F4" },
                      { id: "suggestion", label: "💡 Suggestion",     color: "#34A853" },
                      { id: "typo",       label: "✏️ Typo / Content", color: "#FBBC05" },
                      { id: "compliment", label: "🌟 Compliment",     color: "#34A853" },
                      { id: "other",      label: "💬 Other",          color: "#9aa0a6" },
                    ].map(({ id, label, color }) => (
                      <button
                        key={id}
                        onClick={() => setBugForm((f) => ({ ...f, type: id }))}
                        style={bugForm.type === id ? { borderColor: color, color, backgroundColor: color + "18" } : {}}
                        className={`py-1.5 px-2 rounded-full text-[11.5px] font-medium border transition-all text-center
                          ${bugForm.type === id ? "border-current" : "border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]"}`}
                      >{label}</button>
                    ))}
                  </div>

                  {/* Message */}
                  <textarea
                    rows={3}
                    value={bugForm.message}
                    onChange={(e) => setBugForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder={
                      bugForm.type === "bug"        ? "Describe what went wrong…"
                      : bugForm.type === "feature"    ? "Describe the feature you'd like…"
                      : bugForm.type === "suggestion" ? "Share your idea…"
                      : bugForm.type === "typo"       ? "What's incorrect and where?"
                      : bugForm.type === "compliment" ? "Say something nice 😊"
                      : "Your message…"
                    }
                    className="w-full rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#303134]
                               px-4 py-3 text-[13.5px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]
                               outline-none focus:border-[#1a73e8] focus:bg-white dark:focus:bg-[#3c4043] resize-none transition-all"
                  />

                  {/* Optional name + email */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <input
                      type="text"
                      value={bugForm.name}
                      onChange={(e) => setBugForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Name (optional)"
                      className="rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#303134]
                                 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]
                                 outline-none focus:border-[#1a73e8] focus:bg-white dark:focus:bg-[#3c4043] transition-all"
                    />
                    <input
                      type="email"
                      value={bugForm.email}
                      onChange={(e) => setBugForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Email (optional)"
                      className="rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#303134]
                                 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]
                                 outline-none focus:border-[#1a73e8] focus:bg-white dark:focus:bg-[#3c4043] transition-all"
                    />
                  </div>

                  {/* Attachment */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer group w-fit">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                                      text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                        {bugForm.attachment ? bugForm.attachment.name : "Attach a file (optional)"}
                      </div>
                      {bugForm.attachment && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setBugForm((f) => ({ ...f, attachment: null })); }}
                          className="text-[#EA4335] hover:text-[#c5221f] text-[11px] font-medium"
                        >Remove</button>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.txt,.log"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBugForm((f) => ({ ...f, attachment: file }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-[#9aa0a6]">Images, PDF, TXT — max 5 MB</p>
                  </div>

                  {bugError && (
                    <p className="mt-2 text-[12px] text-[#EA4335] flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      {bugError}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[11px] text-[#9aa0a6]">
                      Page: <span className="font-mono">{typeof window !== "undefined" ? window.location.pathname : ""}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBugOpen(false)}
                        className="px-5 py-2 rounded-full text-[13px] font-medium text-[#5f6368] dark:text-[#9aa0a6]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >Cancel</button>
                      <button
                        disabled={!bugForm.message.trim() || bugSubmitting}
                        onClick={async () => {
                          setBugError("");
                          setBugSubmitting(true);
                          try {
                            await submitFeedback({
                              type: bugForm.type,
                              message: bugForm.message,
                              name: bugForm.name,
                              email: bugForm.email,
                              attachment: bugForm.attachment,
                              page: window.location.pathname,
                            });
                            setBugSent(true);
                          } catch {
                            setBugError("Something went wrong. Please try again.");
                          } finally {
                            setBugSubmitting(false);
                          }
                        }}
                        className="px-5 py-2 rounded-full bg-[#1a73e8] text-white text-[13px] font-medium
                                   hover:bg-[#1557b0] disabled:opacity-40 disabled:cursor-default transition-colors flex items-center gap-2"
                      >
                        {bugSubmitting && (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        )}
                        {bugSubmitting ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="h-1.5 w-full flex">
                <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Help Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {helpOpen &&
          (() => {
            const HELP_SECTIONS = [
              {
                id: "home",
                label: "Home",
                color: "#4285F4",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Search Bar",
                    icon: "🔍",
                    desc: "Type any keyword like name, skill, project, or topic to search across the portfolio. Press Enter or use the search button to navigate.",
                  },
                  {
                    title: "Smart Suggestions",
                    icon: "💡",
                    desc: "Suggestions appear as you type. Use arrow keys to navigate them, Enter to select, or Escape to dismiss.",
                  },
                  {
                    title: "Voice Search (Mic)",
                    icon: "🎤",
                    desc: "Click the microphone icon in the Home search bar to speak your query. Requires microphone permission.",
                  },
                  {
                    title: "AI Mode",
                    icon: "✦",
                    desc: "Click the sparkle icon in the Home search bar to open AI Mode, a conversational assistant that answers anything about Anurag.",
                  },
                  {
                    title: "Apps Grid",
                    icon: "⠿",
                    desc: "Click the 9-dot icon (top-right) to open quick-access tiles: Search, Gmail, Works, Blog, LinkedIn, GitHub, About, LeetCode, CodeChef.",
                  },
                  {
                    title: "Avatar & Profile",
                    icon: "👤",
                    desc: 'Click the "A" avatar to see account info, copy email, toggle dark/light mode, or open this Help guide.',
                  },
                  {
                    title: "Admin Panel",
                    icon: "🔐",
                    desc: "Press Ctrl + Shift + A anywhere on the site to open the Admin panel. This shortcut works on both the home page and all search result pages.",
                  },
                  {
                    title: "Weather & Clock",
                    icon: "🌤",
                    desc: "The Home page top-left shows live time and weather fetched from your location automatically, no API key needed.",
                  },
                  {
                    title: "Language Switcher",
                    icon: "🌐",
                    desc: "Below the Home search buttons, click any Indian language to translate UI labels instantly.",
                  },
                ],
              },
              {
                id: "about",
                label: "About",
                color: "#34A853",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Who is Anurag?",
                    icon: "🧑‍💻",
                    desc: "Full-stack developer specialising in the MERN stack. The About page covers background, education, and personality.",
                  },
                  {
            title: "Skills & Toolkit",
                    icon: "⚙️",
                    desc: "Browse all technologies: React, Node.js, MongoDB, TypeScript, Docker, AWS, and more, shown as interactive skill cards.",
                  },
                  {
                    title: "Experience Timeline",
                    icon: "📅",
                    desc: "Chronological timeline of work experience, internships, and key milestones.",
                  },
                  {
                    title: "Education",
                    icon: "🎓",
                    desc: "Anurag's academic background, degrees, and institutions.",
                  },
                  {
                    title: "Download Resume",
                    icon: "📄",
                    desc: "A resume download button is available on the About page for a PDF copy of the full CV.",
                  },
                ],
              },
              {
                id: "projects",
                label: "Projects",
                color: "#FBBC05",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Browse Projects",
                    icon: "🗂️",
                    desc: "All portfolio projects displayed as Google search-result–style cards with title, description, tags, and quick links.",
                  },
                  {
                    title: "Filter & Sort",
                    icon: "🔧",
                    desc: "Filter chips narrow projects by technology (React, Node, MongoDB, etc.) or sort by newest, oldest, or featured.",
                  },
                  {
                    title: "Live Demo & GitHub",
                    icon: "🚀",
                    desc: 'Each card has a "Live" button (opens deployed site) and a "GitHub" button (opens source code).',
                  },
                  {
                    title: "Knowledge Panel",
                    icon: "📊",
                    desc: "Clicking a project opens a detailed panel on the right with full description, tech stack, and screenshots.",
                  },
                ],
              },
              {
                id: "blog",
                label: "Blog",
                color: "#EA4335",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Medium Articles",
                    icon: "📝",
                    desc: "Real published articles fetched from Anurag's Medium RSS feed, 6 per page, displayed as Google search results.",
                  },
                  {
                    title: "Pagination",
                    icon: "📖",
                    desc: "Navigate with Google-style numbered page controls at the bottom. Exactly 8 articles per page.",
                  },
                  {
                    title: "Article Reader",
                    icon: "📰",
                    desc: "Click any title to open full-screen Medium-style reader with proper typography, no need to leave the portfolio.",
                  },
                  {
                    title: "3-Dot Article Menu",
                    icon: "⋮",
                    desc: "Hover a card to reveal a 3-dot menu: Open on Medium, Copy link, Save.",
                  },
                  {
                    title: "People Also Search For",
                    icon: "🔗",
                    desc: "Topic chips below the list are derived from real article titles for quick navigation.",
                  },
                ],
              },
              {
                id: "contact",
                label: "Contact",
                color: "#9C27B0",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Contact Form",
                    icon: "📬",
                    desc: "Choose a subject chip, enter name & email, write a message, and hit Send. Saved to DB and emailed to Anurag.",
                  },
                  {
                    title: "File Attachments",
                    icon: "📎",
                    desc: "Attach up to 3 files (max 5 MB each) by dragging onto the zone or clicking to browse.",
                  },
                  {
                    title: "Subject Chips",
                    icon: "🏷️",
                    desc: "Click Hire Me, Collaboration, Feedback, General, or Bug Report to pre-fill the subject line.",
                  },
                  {
                    title: "Social Profiles",
                    icon: "🌐",
                    desc: "Below the form, quick links to LinkedIn, GitHub, Medium, and Twitter/X as Google-style cards.",
                  },
                ],
              },
              {
                id: "coding",
                label: "Coding",
                color: "#FF5722",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                  </svg>
                ),
                items: [
                  {
                    title: "LeetCode",
                    icon: "🟡",
                    desc: "Apps Grid → LeetCode tile opens Anurag's LeetCode profile. Track problem-solving progress, streak, and contest ratings.",
                  },
                  {
                    title: "CodeChef",
                    icon: "🍴",
                    desc: "Apps Grid -> CodeChef tile opens Anurag's CodeChef profile, ratings, solved problems, and contest history.",
                  },
                  {
                    title: "GitHub",
                    icon: "🐙",
                    desc: "Access GitHub from the Apps Grid or the footer. Browse open-source repos and commit history.",
                  },
                ],
              },
            ];
            const sec = HELP_SECTIONS[helpSection];
            return (
              <motion.div
                key="help-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/65 p-0 sm:p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setHelpOpen(false);
                }}
              >
                <motion.div
                  initial={{ y: 32, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 32, opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  className="bg-white dark:bg-[#202124]
                           w-full sm:max-w-[780px] rounded-t-2xl sm:rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.24)]
                           flex flex-col overflow-hidden"
                  style={{ height: "min(92vh, 680px)" }}
                >
                  {/* Top stripe */}
                  <div className="h-1.5 w-full flex shrink-0">
                    <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                    <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full bg-[#e8f0fe] dark:bg-[#1a3a5c]/45
                                    border border-[#d2e3fc] dark:border-[#355a86]
                                    flex items-center justify-center"
                      >
                        <svg
                          className="w-4 h-4 text-[#1a73e8]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <span className="text-[15px] font-medium text-[#202124] dark:text-[#e8eaed]">
                        Portfolio Help Centre
                      </span>
                    </div>
                    <button
                      onClick={() => setHelpOpen(false)}
                      className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                    >
                      <svg
                        className="w-[18px] h-[18px] text-[#5f6368]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
                    <nav
                      className="w-full sm:w-[180px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#e8eaed] dark:border-[#3c4043]
                                  overflow-x-auto sm:overflow-y-auto py-2 sm:py-3 px-2 sm:px-0 flex flex-row sm:flex-col gap-1 sm:gap-0.5"
                    >
                      {HELP_SECTIONS.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setHelpSection(i)}
                          className={`shrink-0 sm:shrink flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px]
                          font-medium transition-colors text-left w-auto sm:w-full rounded-full sm:rounded-none
                          ${
                            helpSection === i
                              ? "bg-[#e8f0fe] dark:bg-[#28355c] text-[#1a73e8] dark:text-[#8ab4f8]"
                              : "text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]"
                          }`}
                        >
                          <span
                            style={{
                              color: helpSection === i ? s.color : "#9aa0a6",
                            }}
                          >
                            {s.icon}
                          </span>
                          {s.label}
                          {helpSection === i && (
                            <span
                              className="ml-auto w-1 h-4 rounded-full shrink-0"
                              style={{ background: s.color }}
                            />
                          )}
                        </button>
                      ))}
                    </nav>
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: sec.color + "1A",
                            color: sec.color,
                          }}
                        >
                          {sec.icon}
                        </div>
                        <div>
                          <h2 className="text-[15px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">
                            {sec.label}
                          </h2>
                          <p className="text-[12px] text-[#9aa0a6] leading-tight">
                            {sec.items.length} topic
                            {sec.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        {sec.items.map((item, idx) => (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="rounded-xl border border-[#e8eaed] dark:border-[#3c4043] bg-white dark:bg-[#2a2b2c] px-4 py-3.5"
                          >
                            <div>
                              <p className="text-[13.5px] font-semibold text-[#202124] dark:text-[#e8eaed] mb-0.5">
                                {item.title}
                              </p>
                              <p className="text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                                {item.desc}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-5 px-4 py-3 rounded-xl bg-[#fef7e0] dark:bg-[#3b3524] border border-[#fce8b2] dark:border-[#6b5c2f] flex gap-2.5 items-start">
                        <svg
                          className="w-4 h-4 mt-0.5 shrink-0 text-[#b06000] dark:text-[#fbbc04]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-[12px] text-[#8d4b00] dark:text-[#fbbc04] leading-relaxed">
                          <strong>Tip:</strong> Use <strong>AI Mode</strong> in
                          the Home search bar to ask anything about Anurag or
                          this portfolio.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Bottom stripe */}
                  <div className="h-1.5 w-full flex shrink-0">
                    <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
                    <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* ── SERP footer ────────────────────────────────────── */}
      <footer
        className="border-t border-gray-200 dark:border-[#3c4043]
                         bg-[#f2f2f2] dark:bg-[#171717]"
      >
        {/* Location bar */}
        <div
          className="px-6 py-3 border-b border-gray-200 dark:border-[#3c4043]
                        text-sm text-[#70757a] dark:text-[#9aa0a6]"
        >
          Earth
        </div>
        {/* Links bar */}
        <div
          className="px-6 py-4 flex flex-wrap items-center justify-between gap-4
                        text-sm text-[#70757a] dark:text-[#9aa0a6]"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
            >
              GitHub
            </a>
            <a
              href={LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
            >
              LinkedIn
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {nextFooterLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Voice search modal ─────────────────────────── */}
      <AnimatePresence>
        {micOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-[#202124]"
          >
            <button onClick={stopVoice} className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-6 h-6 text-[#5f6368] dark:text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <p className="text-2xl text-[#5f6368] dark:text-[#9aa0a6] mb-12 select-none text-center px-6">
              {micState === "listening" && "Listening…"}
              {micState === "result" && (micTranscript || "Didn't catch that")}
              {micState === "error" && (micError || "Something went wrong")}
              {micState === "idle" && "Tap the mic to speak"}
            </p>
            <button
              onClick={() => micState === "listening" ? stopVoice() : micState !== "retrying" && startVoiceSearch()}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all
                ${micState === "listening" ? "bg-[#EA4335] scale-110" : "bg-[#f1f3f4] dark:bg-[#303134] hover:shadow-xl"}`}
            >
              {micState === "listening" && <span className="absolute inset-0 rounded-full animate-ping bg-[#EA4335] opacity-30"/>}
              <svg className="w-12 h-12" viewBox="0 0 24 24">
                {micState === "listening" ? (
                  <path fill="white" d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3zM6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6zM11.25 17v2.5h1.5V17h-1.5zM8.5 19.5h7v1h-7z"/>
                ) : (
                  <>
                    <defs><clipPath id="serp-modal-mic-clip"><path d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3z"/></clipPath></defs>
                    <rect x="9" y="3" width="3" height="4.5" fill="#4285F4" clipPath="url(#serp-modal-mic-clip)"/>
                    <rect x="12" y="3" width="3" height="4.5" fill="#EA4335" clipPath="url(#serp-modal-mic-clip)"/>
                    <rect x="9" y="7.5" width="3" height="4.5" fill="#FBBC05" clipPath="url(#serp-modal-mic-clip)"/>
                    <rect x="12" y="7.5" width="3" height="4.5" fill="#34A853" clipPath="url(#serp-modal-mic-clip)"/>
                    <path fill="#4285F4" d="M6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6z"/>
                    <path fill="#4285F4" d="M11.25 17v2.5h1.5V17h-1.5z"/>
                    <path fill="#4285F4" d="M8.5 19.5h7v1h-7z"/>
                  </>
                )}
              </svg>
            </button>
            {micState === "result" && micTranscript && (
              <button onClick={() => { setMicOpen(false); navigate("/about"); }}
                className="mt-10 px-6 py-2.5 rounded-full bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1557b0] transition-colors">
                Search "{micTranscript}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lens modal ─────────────────────────────────── */}
      <AnimatePresence>
        {lensOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 dark:bg-black/75 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setLensOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="bg-white dark:bg-[#202124] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-medium text-[#202124] dark:text-[#e8eaed]">Search by image</h2>
                <button onClick={() => setLensOpen(false)} className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                  <svg className="w-5 h-5 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="px-5 pb-3">
                <div className="flex gap-2">
                  <input type="text" value={lensUrl} onChange={(e) => setLensUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && lensUrl.trim()) setLensImage(lensUrl.trim()); }}
                    placeholder="Paste image URL"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-transparent text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6] outline-none focus:border-[#1a73e8]"/>
                  <button onClick={() => { if (lensUrl.trim()) setLensImage(lensUrl.trim()); }}
                    className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1557b0] transition-colors">Search</button>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 pb-3">
                <div className="flex-1 h-px bg-[#e8eaed] dark:bg-[#3c4043]"/>
                <span className="text-xs text-[#70757a] dark:text-[#9aa0a6]">OR</span>
                <div className="flex-1 h-px bg-[#e8eaed] dark:bg-[#3c4043]"/>
              </div>
              {lensImage ? (
                <div className="mx-5 mb-5 relative rounded-xl overflow-hidden border border-[#dadce0] dark:border-[#5f6368]">
                  <img src={lensImage} alt="preview" className="w-full max-h-64 object-contain bg-[#f8f9fa] dark:bg-[#303134]"/>
                  <button onClick={() => { setLensImage(null); setLensUrl(""); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-[#303134] shadow hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                    <svg className="w-4 h-4 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                  <p className="text-center text-xs text-[#70757a] py-2">Image loaded, visual search coming soon</p>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setLensDrag(true); }}
                  onDragLeave={() => setLensDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setLensDrag(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith("image/")) setLensImage(URL.createObjectURL(file)); }}
                  onClick={() => lensFileRef.current?.click()}
                  className={`mx-5 mb-5 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-colors
                    ${lensDrag ? "border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1e3a5f]" : "border-[#dadce0] dark:border-[#5f6368] hover:border-[#1a73e8] hover:bg-[#f8f9fa] dark:hover:bg-[#303134]"}`}
                >
                  <svg className="w-10 h-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3 3h7v2H5v5H3V3z"/>
                    <path fill="#EA4335" d="M21 3h-7v2h5v5h2V3z"/>
                    <path fill="#FBBC05" d="M3 21h7v-2H5v-5H3v7z"/>
                    <path fill="#34A853" d="M21 21h-7v-2h5v-5h2v7z"/>
                    <circle cx="12" cy="12" r="3.5" fill="none" stroke="#4285F4" strokeWidth="1.5"/>
                  </svg>
                  <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] text-center">
                    Drag an image here<br/>
                    <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium">or click to upload</span>
                  </p>
                </div>
              )}
              <input ref={lensFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) setLensImage(URL.createObjectURL(file)); e.target.value = ""; }}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Mode modal ──────────────────────────────── */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/65 p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false); }}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] w-full sm:max-w-[640px] sm:rounded-2xl rounded-t-3xl shadow-[0_12px_40px_rgba(0,0,0,0.24)] flex flex-col overflow-hidden"
              style={{ height: "min(78vh, 640px)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] dark:bg-[#1a3a5c]/45 border border-[#d2e3fc] dark:border-[#355a86] flex items-center justify-center shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 28 28" fill="none">
                      <defs>
                        <linearGradient id="serp-gem-hdr" x1="0.5" y1="0" x2="0.5" y2="1">
                          <stop offset="0%" stopColor="#3b82f6"/>
                          <stop offset="50%" stopColor="#8b5cf6"/>
                          <stop offset="100%" stopColor="#3b82f6"/>
                        </linearGradient>
                      </defs>
                      <path d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z" fill="url(#serp-gem-hdr)"/>
                      <path d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z" fill="url(#serp-gem-hdr)"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">AI Mode</p>
                    <p className="text-[11px] text-[#9aa0a6] leading-tight">Powered by Anurag's portfolio</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {aiMessages.length > 0 && (
                    <button onClick={() => setAiMessages([])} className="px-2.5 py-1 rounded-full text-[12px] font-medium text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">Clear</button>
                  )}
                  <button onClick={() => setAiOpen(false)} className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                    <svg className="w-[18px] h-[18px] text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
                {aiMessages.length === 0 && !aiTyping && (
                  <div className="flex flex-col items-center justify-start min-h-full pt-8 gap-4 text-center px-2">
                    <div className="w-[56px] h-[56px] rounded-2xl bg-[#e8f0fe] dark:bg-[#1a3a5c]/45 border border-[#d2e3fc] dark:border-[#355a86] flex items-center justify-center">
                      <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                        <defs>
                          <linearGradient id="serp-gem-welcome" x1="0.5" y1="0" x2="0.5" y2="1">
                            <stop offset="0%" stopColor="#3b82f6"/>
                            <stop offset="50%" stopColor="#8b5cf6"/>
                            <stop offset="100%" stopColor="#3b82f6"/>
                          </linearGradient>
                        </defs>
                        <path d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z" fill="url(#serp-gem-welcome)"/>
                        <path d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z" fill="url(#serp-gem-welcome)"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[28px] sm:text-[32px] font-normal text-[#202124] dark:text-[#e8eaed] leading-tight">How can I help?</p>
                      <p className="text-[12px] text-[#9aa0a6] mt-1">I know his work, skills, projects and more.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { label: "Who is he?", q: "Who is Anurag?" },
                        { label: "Projects", q: "What projects has he built?" },
                        { label: "Hire him", q: "Is Anurag available to hire?" },
                        { label: "Tech stack", q: "What is his tech stack?" },
                        { label: "Blog", q: "Does he have a blog?" },
                        { label: "Experience", q: "What is his experience?" },
                        { label: "Open source", q: "Does he contribute to open source?" },
                        { label: "Education", q: "What is his educational background?" },
                        { label: "Contact", q: "How can I contact Anurag?" },
                        { label: "GitHub", q: "Where can I find his GitHub?" },
                      ].map(({ label, q }) => (
                        <button key={q} onClick={() => handleAiSend(q)}
                          className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368] text-[12.5px] text-[#202124] dark:text-[#e8eaed] hover:border-[#1a73e8] dark:hover:border-[#8ab4f8] hover:bg-[#f8fbff] dark:hover:bg-[#1a3a5c]/40 transition-colors">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <div className="w-6 h-6 rounded-lg bg-[#e8f0fe] dark:bg-[#1a3a5c]/45 border border-[#d2e3fc] dark:border-[#355a86] flex items-center justify-center shrink-0 mt-1">
                        <svg className="w-3 h-3" viewBox="0 0 28 28" fill="none">
                          <defs>
                            <linearGradient id="serp-gem-bubble" x1="0.5" y1="0" x2="0.5" y2="1">
                              <stop offset="0%" stopColor="#3b82f6"/>
                              <stop offset="50%" stopColor="#8b5cf6"/>
                              <stop offset="100%" stopColor="#3b82f6"/>
                            </linearGradient>
                          </defs>
                          <path d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z" fill="url(#serp-gem-bubble)"/>
                          <path d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z" fill="url(#serp-gem-bubble)"/>
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed
                      ${msg.role === "user" ? "bg-[#1a73e8] text-white rounded-2xl rounded-br-sm" : "bg-[#f1f3f4] dark:bg-[#2d2e30] text-[#202124] dark:text-[#e8eaed] rounded-2xl rounded-bl-sm"}`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {aiTyping && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 justify-start">
                      <div className="w-6 h-6 rounded-lg bg-[#e8f0fe] dark:bg-[#1a3a5c]/45 border border-[#d2e3fc] dark:border-[#355a86] flex items-center justify-center shrink-0 mt-1">
                        <svg className="w-3 h-3" viewBox="0 0 28 28" fill="none">
                          <defs>
                            <linearGradient id="serp-gem-typing" x1="0.5" y1="0" x2="0.5" y2="1">
                              <stop offset="0%" stopColor="#3b82f6"/>
                              <stop offset="50%" stopColor="#8b5cf6"/>
                              <stop offset="100%" stopColor="#3b82f6"/>
                            </linearGradient>
                          </defs>
                          <path d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z" fill="url(#serp-gem-typing)"/>
                          <path d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z" fill="url(#serp-gem-typing)"/>
                        </svg>
                      </div>
                      <div className="bg-[#f1f3f4] dark:bg-[#2d2e30] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-[#9aa0a6] block"
                            animate={{ y: [0, -5, 0] }} transition={{ duration: 0.55, delay: d * 0.15, repeat: Infinity }}/>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={aiEndRef}/>
              </div>

              <div className="px-4 py-3 border-t border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                <div className="flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#303134] pl-4 pr-1.5 py-1.5">
                  <input ref={aiInputRef} type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAiSend(); }}
                    placeholder="Ask about Anurag…" disabled={aiTyping}
                    className="flex-1 bg-transparent py-1.5 text-[13.5px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6] outline-none disabled:opacity-50"/>
                  <button onClick={() => handleAiSend()} disabled={!aiInput.trim() || aiTyping}
                    className="p-2 rounded-full bg-[#1a73e8] text-white disabled:opacity-35 disabled:cursor-default hover:bg-[#1557b0] transition-all shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
