import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { LINKS } from "../config/links";

const LANGUAGES = [
  { label: "हिन्दी", code: "hi" },
  { label: "বাংলা", code: "bn" },
  { label: "తెలుగు", code: "te" },
  { label: "मराठी", code: "mr" },
  { label: "தமிழ்", code: "ta" },
  { label: "ગુજરાતી", code: "gu" },
  { label: "ಕನ್ನಡ", code: "kn" },
  { label: "മലയാളം", code: "ml" },
  { label: "ਪੰਜਾਬੀ", code: "pa" },
];

const TRANSLATIONS = {
  en: {
    offeredIn: "Portfolio offered in:",
    search: "Search Portfolio",
    lucky: "I'm Feeling Lucky",
    earth: "Earth",
    about: "About",
    projects: "Projects",
    contact: "Contact",
  },
  hi: {
    offeredIn: "पोर्टफोलियो उपलब्ध है:",
    search: "पोर्टफोलियो खोजें",
    lucky: "मैं भाग्यशाली हूँ",
    earth: "पृथ्वी",
    about: "परिचय",
    projects: "प्रोजेक्ट्स",
    contact: "संपर्क",
  },
  bn: {
    offeredIn: "পোর্টফোলিও পাওয়া যাচ্ছে:",
    search: "পোর্টফোলিও খুঁজুন",
    lucky: "আমি ভাগ্যবান",
    earth: "পৃথিবী",
    about: "পরিচয়",
    projects: "প্রজেক্টস",
    contact: "যোগাযোগ",
  },
  te: {
    offeredIn: "పోర్ట్‌ఫోలియో అందుబాటులో:",
    search: "పోర్ట్‌ఫోలియో వెతకండి",
    lucky: "నేను అదృష్టవంతుడిని",
    earth: "భూమి",
    about: "పరిచయం",
    projects: "ప్రాజెక్టులు",
    contact: "సంప్రదించు",
  },
  mr: {
    offeredIn: "पोर्टफोलिओ उपलब्ध आहे:",
    search: "पोर्टफोलिओ शोधा",
    lucky: "मी नशीबवान आहे",
    earth: "पृथ्वी",
    about: "माझ्याबद्दल",
    projects: "प्रोजेक्ट्स",
    contact: "संपर्क",
  },
  ta: {
    offeredIn: "போர்ட்ஃபோலியோ கிடைக்கிறது:",
    search: "போர்ட்ஃபோலியோ தேடுங்கள்",
    lucky: "நான் அதிர்ஷ்டசாலி",
    earth: "பூமி",
    about: "என்னைப் பற்றி",
    projects: "திட்டங்கள்",
    contact: "தொடர்பு",
  },
  gu: {
    offeredIn: "પોર્ટફોલિયો ઉપલબ્ધ છે:",
    search: "પોર્ટફોલિયો શોધો",
    lucky: "હું નસીબદાર છું",
    earth: "પૃથ્વી",
    about: "મારા વિશે",
    projects: "પ્રોજેક્ટ્સ",
    contact: "સંપર્ક",
  },
  kn: {
    offeredIn: "ಪೋರ್ಟ್‌ಫೋಲಿಯೋ ಲಭ್ಯವಿದೆ:",
    search: "ಪೋರ್ಟ್‌ಫೋಲಿಯೋ ಹುಡುಕಿ",
    lucky: "ನಾನು ಅದೃಷ್ಟಶಾಲಿ",
    earth: "ಭೂಮಿ",
    about: "ನನ್ನ ಬಗ್ಗೆ",
    projects: "ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು",
    contact: "ಸಂಪರ್ಕ",
  },
  ml: {
    offeredIn: "പോർട്ട്ഫോളിയോ ലഭ്യമാണ്:",
    search: "പോർട്ട്ഫോളിയോ തിരയുക",
    lucky: "ഞാൻ ഭാഗ്യവാൻ",
    earth: "ഭൂമി",
    about: "എന്നെക്കുറിച്ച്",
    projects: "പ്രൊജക്ടുകൾ",
    contact: "ബന്ധപ്പെടുക",
  },
  pa: {
    offeredIn: "ਪੋਰਟਫੋਲੀਓ ਉਪਲਬਧ ਹੈ:",
    search: "ਪੋਰਟਫੋਲੀਓ ਖੋਜੋ",
    lucky: "ਮੈਂ ਖੁਸ਼ਕਿਸਮਤ ਹਾਂ",
    earth: "ਧਰਤੀ",
    about: "ਮੇਰੇ ਬਾਰੇ",
    projects: "ਪ੍ਰੋਜੈਕਟ",
    contact: "ਸੰਪਰਕ",
  },
};

// Google-style coloured logo letters
const LOGO_LETTERS = [
  { char: "A", color: "#4285F4" },
  { char: "n", color: "#EA4335" },
  { char: "u", color: "#FBBC05" },
  { char: "r", color: "#4285F4" },
  { char: "a", color: "#34A853" },
  { char: "g", color: "#EA4335" },
];

export default function Home() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const SUGGESTIONS = [
    { icon: "clock", text: "Who is Anurag?", to: "/about" },
    { icon: "clock", text: "Anurag projects", to: "/projects" },
    { icon: "clock", text: "Anurag tech stack", to: "/about" },
    { icon: "clock", text: "Hire Anurag", to: "/contact" },
    { icon: "clock", text: "Anurag blog", to: "/blog" },
    { icon: "search", text: "Anurag portfolio", to: "/projects" },
    { icon: "search", text: "Anurag full-stack developer", to: "/about" },
    { icon: "search", text: "Anurag open source", to: "/projects" },
    { icon: "search", text: "Anurag MERN stack", to: "/about" },
    { icon: "search", text: "Anurag GitHub", to: LINKS.github, external: true },
    { icon: "search", text: "Anurag contact", to: "/contact" },
    { icon: "search", text: "Anurag resume", to: "/contact" },
  ];

  const filtered = query.trim()
    ? SUGGESTIONS.filter((s) =>
        s.text.toLowerCase().includes(query.toLowerCase()),
      )
    : SUGGESTIONS;
  const [lang, setLang] = useState("en");
  const [appsOpen, setAppsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [micState, setMicState] = useState("idle"); // idle | listening | result | error
  const [micTranscript, setMicTranscript] = useState("");
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef(null);
  const [lensOpen, setLensOpen] = useState(false);
  const [lensImage, setLensImage] = useState(null);
  const [lensDrag, setLensDrag] = useState(false);
  const [lensUrl, setLensUrl] = useState("");
  const lensFileRef = useRef(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSection, setHelpSection] = useState(0);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const aiEndRef = useRef(null);
  const aiInputRef = useRef(null);

  // Clock & weather
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const t = TRANSLATIONS[lang];

  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const appsRef = useRef(null);

  const avatarRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setFocused(false);
      setActiveIdx(-1);
    } else if (e.key === "Enter") {
      const suggestion = activeIdx >= 0 ? filtered[activeIdx] : null;
      const text = suggestion ? suggestion.text : query;
      if (text.trim()) {
        setQuery(text);
        setFocused(false);
        setActiveIdx(-1);
        if (suggestion?.external)
          window.open(suggestion.to, "_blank", "noopener,noreferrer");
        else navigate(suggestion?.to ?? "/about");
      }
    }
  };

  const AI_REPLIES = {
    who: "Anurag is a full-stack developer specialising in the MERN stack: React, Node.js, Express and MongoDB. He loves clean UI and fast developer tooling. Visit the About section for the full story!",
    projects:
      "Anurag has shipped several web apps and open-source projects. Head to the Projects section for deep-dives, or check out his GitHub for the source code.",
    hire: "Anurag is open to freelance and full-time opportunities. Drop him a message through the Contact page, there's an email form and links to all his socials.",
    stack:
      "Primary stack: React, Node.js, Express, MongoDB, TailwindCSS. He's also comfortable with TypeScript, Docker, REST and GraphQL APIs, and Vite.",
    blog: "Anurag writes about web development, design systems, and side-project journeys. Browse the Blog section to catch his latest posts.",
    experience:
      "Anurag has hands-on experience building full-stack web applications, working with REST APIs, and contributing to team projects. Check the Projects section for detailed case studies.",
    opensource:
      "Yes! Anurag actively contributes to open-source projects and publishes all his own work on GitHub. Visit his profile to explore repositories and contributions.",
    education:
      "Anurag is studying Information Science & Engineering. He complements his academics with self-driven learning in modern web dev, system design, and software engineering.",
    contact:
      "Reach Anurag through the Contact page. There's a direct email form and links to all his social profiles. He typically responds within 24 hours.",
    github:
      "All of Anurag's code lives on GitHub. You'll find the link in the top-right corner of every page, feel free to explore and star his repos!",
    greet:
      "Hey! I'm an AI assistant built into Anurag's portfolio. Ask me about his background, projects, tech stack, blog, or how to get in touch!",
  };

  const getAiReply = (input) => {
    const q = input.toLowerCase();
    // Greeting
    if (/\b(hello|hi|hey|howdy)\b/.test(q)) return AI_REPLIES.greet;
    // Education — checked before generic "who/about" to avoid `background` collision
    if (/education|studying|degree|university|college|academic/.test(q))
      return AI_REPLIES.education;
    // Who / About
    if (/who|about|yourself|introduce|bio|background/.test(q))
      return AI_REPLIES.who;
    // Open source — before projects so "open source" isn't eaten by "code"
    if (/open.?source|contribut/.test(q)) return AI_REPLIES.opensource;
    // Projects
    if (/project|built|portfolio|app|code/.test(q)) return AI_REPLIES.projects;
    // GitHub
    if (/github/.test(q)) return AI_REPLIES.github;
    // Blog
    if (/blog|article|post|writ/.test(q)) return AI_REPLIES.blog;
    // Hire / Contact
    if (/hire|freelance|opportunit|availab/.test(q)) return AI_REPLIES.hire;
    if (/contact|email|touch|reach|message|connect/.test(q))
      return AI_REPLIES.contact;
    // Tech stack
    if (/skill|tech|stack|language|framework|tool|work with|use/.test(q))
      return AI_REPLIES.stack;
    // Experience
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

  // auto-scroll when messages update or typing indicator appears
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiTyping]);

  // focus input when modal opens
  useEffect(() => {
    if (aiOpen) setTimeout(() => aiInputRef.current?.focus(), 80);
  }, [aiOpen]);

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("SpeechRecognition API not found. Try Chrome or Edge.");
      setMicState("error");
      setMicOpen(true);
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    setMicTranscript("");
    setMicError("");
    setMicState("listening");
    setMicOpen(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setMicTranscript(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setMicState("result");
        setQuery(transcript);
      }
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech") {
        // not fatal — onend will fire and reset to idle
        return;
      } else if (
        e.error === "not-allowed" ||
        e.error === "service-not-allowed"
      ) {
        setMicError(
          "Microphone access denied. Please allow mic access and try again.",
        );
        setMicState("error");
      } else if (e.error === "network") {
        // Transient browser bug — silently retry once
        setMicState("retrying");
        setTimeout(() => {
          try {
            const r2 = new SR();
            recognitionRef.current = r2;
            r2.lang = "en-US";
            r2.interimResults = true;
            r2.continuous = false;
            r2.maxAlternatives = 1;
            r2.onresult = recognition.onresult;
            r2.onerror = () => {
              setMicError(
                "Speech service unavailable. Check your internet and try again.",
              );
              setMicState("error");
            };
            r2.onend = () =>
              setMicState((s) => (s === "listening" ? "idle" : s));
            r2.start();
            setMicState("listening");
          } catch (_) {
            setMicError("Speech service unavailable. Try again.");
            setMicState("error");
          }
        }, 400);
      } else {
        setMicError(`Something went wrong (${e.error}). Try again.`);
        setMicState("error");
      }
    };
    recognition.onend = () => {
      setMicState((s) => (s === "listening" ? "idle" : s));
    };
    try {
      recognition.start();
    } catch (err) {
      setMicError(`Could not start: ${err.message}`);
      setMicState("error");
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.abort();
    setMicOpen(false);
    setMicState("idle");
  };

  // Clock — tick every second
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Weather — geolocation + Open-Meteo (no API key)
  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const WMO = {
            0: "☀️",
            1: "🌤️",
            2: "⛅",
            3: "☁️",
            45: "🌫️",
            48: "🌫️",
            51: "🌦️",
            53: "🌦️",
            55: "🌧️",
            61: "🌧️",
            63: "🌧️",
            65: "🌧️",
            71: "🌨️",
            73: "🌨️",
            75: "❄️",
            80: "🌦️",
            81: "🌧️",
            82: "⛈️",
            95: "⛈️",
          };
          const [meteo, geo] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`,
            ).then((r) => r.json()),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            ).then((r) => r.json()),
          ]);
          setWeather({
            temp: Math.round(meteo.current_weather.temperature),
            icon: WMO[meteo.current_weather.weathercode] ?? "🌡️",
            city:
              geo.address?.city ||
              geo.address?.town ||
              geo.address?.village ||
              geo.address?.county ||
              "",
          });
        } catch (_) {}
        setWeatherLoading(false);
      },
      () => setWeatherLoading(false),
      { timeout: 8000 },
    );
  }, []);

  // Close on outside click
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

  return (
    <div className="relative min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Top bar */}
      <header className="flex justify-between items-center gap-3 px-7 py-5">
        {/* Left — Clock & Weather (both reveal together once weather loads) */}
        <div className="flex items-center gap-3 select-none">
          {!weatherLoading && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] tabular-nums leading-none">
                  {time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-none mt-0.5">
                  {time.toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              {weather && (
                <>
                  <div className="h-7 w-px bg-[#e8eaed] dark:bg-[#5f6368]" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl leading-none">{weather.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] leading-none tabular-nums">
                        {weather.temp}°C
                      </p>
                      {weather.city && (
                        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-none mt-0.5 max-w-[110px] truncate">
                          {weather.city}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <a
            href={LINKS.mailto}
            className="text-sm text-[#202124] dark:text-[#e8eaed] hover:underline px-3 py-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            Gmail
          </a>
          {/*
        <a
          href={LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#202124] dark:text-[#e8eaed] hover:underline px-3 py-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
        >
          GitHub
        </a>
        */}

          {/* Apps grid */}
          <div className="relative ml-2 mr-2" ref={appsRef}>
            <button
              onClick={() => setAppsOpen((o) => !o)}
              className={`p-2 rounded-full transition-colors text-[#5f6368] dark:text-[#9aa0a6]
              ${appsOpen ? "bg-[#e8eaed] dark:bg-[#3c4043]" : "hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"}`}
              aria-label="Apps"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
                  className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl
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
                        label: "Gmail",
                        action: () => {
                          navigate("/contact");
                          setAppsOpen(false);
                        },
                        icon: (
                          <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                            <svg viewBox="52 42 88 66" className="w-9 h-9">
                              <path
                                fill="#4285f4"
                                d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"
                              />
                              <path
                                fill="#34a853"
                                d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"
                              />
                              <path
                                fill="#fbbc04"
                                d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"
                              />
                              <path
                                fill="#ea4335"
                                d="M72 74V48l24 18 24-18v26L96 92"
                              />
                              <path
                                fill="#c5221f"
                                d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"
                              />
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
                          <div className="w-12 h-12 rounded-xl bg-[#546E7A] flex items-center justify-center">
                            <svg
                              className="w-7 h-7 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.46 1 12 1S6 2.53 6 4.64c0 .48.11.92.18 1.36H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-8-3c1.9 0 3.36.72 3.7 1.64H8.3C8.64 3.72 10.1 3 12 3zM12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                            </svg>
                          </div>
                        ),
                      },
                      {
                        label: "Blog",
                        action: () => {
                          navigate("/blog");
                          setAppsOpen(false);
                        },
                        icon: (
                          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                            <svg className="w-10 h-10" viewBox="0 0 48 48">
                              <rect
                                x="4"
                                y="8"
                                width="40"
                                height="32"
                                rx="3"
                                fill="#fff9c4"
                              />
                              <rect
                                x="8"
                                y="14"
                                width="20"
                                height="3"
                                rx="1.5"
                                fill="#e53935"
                              />
                              <rect
                                x="8"
                                y="20"
                                width="32"
                                height="2"
                                rx="1"
                                fill="#9e9e9e"
                              />
                              <rect
                                x="8"
                                y="25"
                                width="28"
                                height="2"
                                rx="1"
                                fill="#9e9e9e"
                              />
                              <rect
                                x="8"
                                y="30"
                                width="22"
                                height="2"
                                rx="1"
                                fill="#9e9e9e"
                              />
                              <rect
                                x="30"
                                y="14"
                                width="10"
                                height="10"
                                rx="1"
                                fill="#ffe082"
                              />
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
                          <div className="w-12 h-12 rounded-[10px] bg-[#0A66C2] flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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
                            <svg
                              className="w-8 h-8 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
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
                          <div className="w-12 h-12 rounded-full bg-[#00BCD4] flex items-center justify-center">
                            <svg
                              className="w-7 h-7 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
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
                            <img
                              src="https://cdn.simpleicons.org/leetcode/ffffff"
                              className="w-8 h-8"
                              alt="LeetCode"
                            />
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
                            <img
                              src="https://cdn.simpleicons.org/codechef/ffffff"
                              className="w-8 h-8"
                              alt="CodeChef"
                            />
                          </div>
                        ),
                      },
                    ].map(({ label, action, icon }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl
                                 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors group"
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
                       text-white text-sm font-medium cursor-pointer select-none
                       ring-2 ring-[#EA4335] ring-offset-1 ring-offset-white dark:ring-offset-gray-950"
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
                  {/* Top: avatar + name + email */}
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
                      href={LINKS.alternatePortfolio}
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
                    <button
                      onClick={() => {
                        navigate("/admin");
                        setAvatarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5
                               text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                               hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                    >
                      <span className="flex-1 text-left">Admin Access</span>
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </button>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* end right side */}
      </header>

      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        {/* Animated name logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 select-none"
        >
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight leading-none">
            {LOGO_LETTERS.map(({ char, color }, i) => (
              <motion.span
                key={i}
                style={{ color }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </h1>
        </motion.div>

        {/* Search bar */}
        <motion.div
          ref={wrapperRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-xl relative"
        >
          {/* Input */}
          <div
            className={`flex items-center gap-2 pl-4 pr-3 py-2 rounded-full border transition-all duration-200
              bg-white dark:bg-[#303134]
              ${
                focused
                  ? "border-transparent shadow-[0_4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
                  : "border-gray-300 dark:border-[#5f6368] hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:border-gray-400 dark:hover:border-[#9aa0a6]"
              }
              rounded-full`}
          >
            {/* + icon */}
            <button
              onClick={() => inputRef.current?.focus()}
              className="text-[#9aa0a6] hover:text-[#5f6368] dark:hover:text-[#e8eaed] transition-colors shrink-0 text-xl leading-none font-light"
              aria-label="Search"
              tabIndex={-1}
            >
              <svg
                className="w-5 h-5"
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
            </button>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(-1);
              }}
              onFocus={() => {
                setFocused(true);
                setActiveIdx(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder=""
              className="flex-1 bg-transparent text-[#202124] dark:text-[#e8eaed] text-base outline-none min-w-0 caret-[#4285F4]"
              autoComplete="off"
              spellCheck={false}
            />

            {/* Right icons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Mic icon — Google Voice Search style */}
              <div className="relative group/mic">
                <button
                  onClick={startVoiceSearch}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="Voice search"
                  tabIndex={-1}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <defs>
                      <clipPath id="home-mic-clip">
                        <path d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3z" />
                      </clipPath>
                    </defs>
                    <rect
                      x="9"
                      y="3"
                      width="3"
                      height="4.5"
                      fill="#4285F4"
                      clipPath="url(#home-mic-clip)"
                    />
                    <rect
                      x="12"
                      y="3"
                      width="3"
                      height="4.5"
                      fill="#EA4335"
                      clipPath="url(#home-mic-clip)"
                    />
                    <rect
                      x="9"
                      y="7.5"
                      width="3"
                      height="4.5"
                      fill="#FBBC05"
                      clipPath="url(#home-mic-clip)"
                    />
                    <rect
                      x="12"
                      y="7.5"
                      width="3"
                      height="4.5"
                      fill="#34A853"
                      clipPath="url(#home-mic-clip)"
                    />
                    <path
                      fill="#4285F4"
                      d="M6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6z"
                    />
                    <path fill="#4285F4" d="M11.25 17v2.5h1.5V17h-1.5z" />
                    <path fill="#4285F4" d="M8.5 19.5h7v1h-7z" />
                  </svg>
                </button>
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                opacity-0 group-hover/mic:opacity-100 transition-opacity duration-150"
                >
                  <div
                    className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124]
                                  text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg"
                  >
                    Voice search
                  </div>
                  <div
                    className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45
                                  absolute left-1/2 -translate-x-1/2 -bottom-1"
                  />
                </div>
              </div>
              {/* Lens icon — Google Lens style */}
              <div className="relative group/lens">
                <button
                  onClick={() => {
                    setLensImage(null);
                    setLensUrl("");
                    setLensOpen(true);
                  }}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="Search by image"
                  tabIndex={-1}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3 3h7v2H5v5H3V3z" />
                    <path fill="#EA4335" d="M21 3h-7v2h5v5h2V3z" />
                    <path fill="#FBBC05" d="M3 21h7v-2H5v-5H3v7z" />
                    <path fill="#34A853" d="M21 21h-7v-2h5v-5h2v7z" />
                    <circle
                      cx="12"
                      cy="12"
                      r="3.5"
                      fill="none"
                      stroke="#4285F4"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                opacity-0 group-hover/lens:opacity-100 transition-opacity duration-150"
                >
                  <div
                    className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124]
                                  text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg"
                  >
                    Search by image
                  </div>
                  <div
                    className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45
                                  absolute left-1/2 -translate-x-1/2 -bottom-1"
                  />
                </div>
              </div>
              {/* AI Mode — Gemini-style button */}
              <div className="relative group/ai ml-0.5">
                <button
                  onClick={() => setAiOpen(true)}
                  className="relative p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  aria-label="AI Mode"
                  tabIndex={-1}
                >
                  <svg className="w-6 h-6" viewBox="0 0 28 28" fill="none">
                    <defs>
                      <linearGradient id="gem-a" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4285F4" />
                        <stop offset="100%" stopColor="#0d47a1" />
                      </linearGradient>
                      <linearGradient id="gem-b" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9C27B0" />
                        <stop offset="100%" stopColor="#4285F4" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M14 2C14 2 15.3 9.5 20 14C15.3 18.5 14 26 14 26C14 26 12.7 18.5 8 14C12.7 9.5 14 2 14 2Z"
                      fill="url(#gem-a)"
                    />
                    <path
                      d="M2 14C2 14 9.5 15.3 14 20C18.5 15.3 26 14 26 14C26 14 18.5 12.7 14 8C9.5 12.7 2 14 2 14Z"
                      fill="url(#gem-b)"
                    />
                  </svg>
                </button>
                {/* Tooltip */}
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                opacity-0 group-hover/ai:opacity-100 transition-opacity duration-150"
                >
                  <div
                    className="bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124]
                                  text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg"
                  >
                    AI Mode
                  </div>
                  <div
                    className="w-2 h-2 bg-[#202124] dark:bg-[#e8eaed] rotate-45
                                  absolute left-1/2 -translate-x-1/2 -bottom-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {focused && filtered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-50
                           bg-white dark:bg-[#303134] rounded-2xl
                           shadow-[0_4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]
                           border border-[#e8eaed] dark:border-[#5f6368] overflow-hidden"
              >
                <div
                  className="py-1 overflow-y-auto"
                  style={{ maxHeight: "calc(5 * 41px)" }}
                >
                  {filtered.map((s, i) => (
                    <button
                      key={s.text}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(s.text);
                        setFocused(false);
                        setActiveIdx(-1);
                        if (s.external)
                          window.open(s.to, "_blank", "noopener,noreferrer");
                        else navigate(s.to);
                      }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                                  text-[#202124] dark:text-[#e8eaed] transition-colors
                                  ${activeIdx === i ? "bg-[#f1f3f4] dark:bg-[#3c4043]" : "hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"}`}
                    >
                      {s.icon === "clock" ? (
                        <svg
                          className="w-4 h-4 text-[#9aa0a6] shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-[#9aa0a6] shrink-0"
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
                      )}
                      <span className="flex-1 truncate">
                        {query.trim() ? (
                          s.text
                            .toLowerCase()
                            .startsWith(query.toLowerCase()) ? (
                            <>
                              <span className="font-medium">
                                {s.text.slice(0, query.length)}
                              </span>
                              {s.text.slice(query.length)}
                            </>
                          ) : (
                            s.text
                          )
                        ) : (
                          s.text
                        )}
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0 rotate-[-45deg]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setQuery(s.text);
                          inputRef.current?.focus();
                        }}
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
        </motion.div>

        {/* Google Search + Feeling Lucky buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mt-7"
        >
          <button
            onClick={() => navigate("/all")}
            className="px-5 py-2.5 rounded text-sm font-medium
                       bg-[#f8f9fa] dark:bg-[#303134]
                       text-[#3c4043] dark:text-[#e8eaed]
                       border border-[#f8f9fa] dark:border-[#303134]
                       hover:border-[#dadce0] dark:hover:border-[#5f6368]
                       hover:shadow-sm transition-all"
          >
            {t.search}
          </button>
          <button
            onClick={() => {
              const pages = ["/about", "/projects", "/contact", "/blog"];
              navigate(pages[Math.floor(Math.random() * pages.length)]);
            }}
            className="px-5 py-2.5 rounded text-sm font-medium
                       bg-[#f8f9fa] dark:bg-[#303134]
                       text-[#3c4043] dark:text-[#e8eaed]
                       border border-[#f8f9fa] dark:border-[#303134]
                       hover:border-[#dadce0] dark:hover:border-[#5f6368]
                       hover:shadow-sm transition-all"
          >
            {t.lucky}
          </button>
        </motion.div>

        {/* Language line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-8 text-sm text-[#70757a] dark:text-[#9aa0a6] text-center"
        >
          {t.offeredIn}{" "}
          {LANGUAGES.map(({ label, code }, i) => {
            const isActive = lang === code;
            const display = isActive ? "English" : label;
            const target = isActive ? "en" : code;
            return (
              <span key={code}>
                <button
                  onClick={() => setLang(target)}
                  className="text-[#1a73e8] dark:text-[#8ab4f8] hover:underline transition-colors"
                >
                  {display}
                </button>
                {i < LANGUAGES.length - 1 && " "}
              </span>
            );
          })}
        </motion.p>
      </main>

      {/* ── Voice search modal ───────────────────────────── */}
      <AnimatePresence>
        {micOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center
                       bg-white dark:bg-gray-950"
          >
            {/* Close */}
            <button
              onClick={stopVoice}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
            >
              <svg
                className="w-6 h-6 text-[#5f6368] dark:text-[#9aa0a6]"
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

            {/* Status text */}
            <p className="text-2xl text-[#5f6368] dark:text-[#9aa0a6] mb-12 select-none text-center px-6">
              {micState === "listening" && "Listening…"}
              {micState === "retrying" && "Connecting…"}
              {micState === "result" && (micTranscript || "Didn't catch that")}
              {micState === "error" && (micError || "Something went wrong")}
              {micState === "idle" && "Tap the mic to speak"}
            </p>

            {/* Big mic button */}
            <button
              onClick={() =>
                micState === "listening"
                  ? stopVoice()
                  : micState !== "retrying" && startVoiceSearch()
              }
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all
                ${
                  micState === "listening" || micState === "retrying"
                    ? "bg-[#EA4335] scale-110"
                    : "bg-[#f1f3f4] dark:bg-[#303134] hover:shadow-xl"
                }`}
            >
              {micState === "listening" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-[#EA4335] opacity-30" />
              )}
              <svg className="w-12 h-12" viewBox="0 0 24 24">
                {micState === "listening" ? (
                  <path
                    fill="white"
                    d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3zM6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6zM11.25 17v2.5h1.5V17h-1.5zM8.5 19.5h7v1h-7z"
                  />
                ) : (
                  <>
                    <defs>
                      <clipPath id="modal-mic-clip">
                        <path d="M12 3C10.34 3 9 4.34 9 6v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3z" />
                      </clipPath>
                    </defs>
                    <rect
                      x="9"
                      y="3"
                      width="3"
                      height="4.5"
                      fill="#4285F4"
                      clipPath="url(#modal-mic-clip)"
                    />
                    <rect
                      x="12"
                      y="3"
                      width="3"
                      height="4.5"
                      fill="#EA4335"
                      clipPath="url(#modal-mic-clip)"
                    />
                    <rect
                      x="9"
                      y="7.5"
                      width="3"
                      height="4.5"
                      fill="#FBBC05"
                      clipPath="url(#modal-mic-clip)"
                    />
                    <rect
                      x="12"
                      y="7.5"
                      width="3"
                      height="4.5"
                      fill="#34A853"
                      clipPath="url(#modal-mic-clip)"
                    />
                    <path
                      fill="#4285F4"
                      d="M6 11a6 6 0 0012 0h-1.5a4.5 4.5 0 01-9 0H6z"
                    />
                    <path fill="#4285F4" d="M11.25 17v2.5h1.5V17h-1.5z" />
                    <path fill="#4285F4" d="M8.5 19.5h7v1h-7z" />
                  </>
                )}
              </svg>
            </button>

            {/* Use result */}
            {micState === "result" && micTranscript && (
              <button
                onClick={() => {
                  setMicOpen(false);
                  navigate("/about");
                }}
                className="mt-10 px-6 py-2.5 rounded-full bg-[#1a73e8] text-white text-sm font-medium
                           hover:bg-[#1557b0] transition-colors"
              >
                Search "{micTranscript}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lens / image search modal ──────────────────────────── */}
      <AnimatePresence>
        {lensOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 dark:bg-black/75 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLensOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="bg-white dark:bg-[#202124] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-medium text-[#202124] dark:text-[#e8eaed]">
                  Search by image
                </h2>
                <button
                  onClick={() => setLensOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-[#5f6368]"
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

              {/* URL input */}
              <div className="px-5 pb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lensUrl}
                    onChange={(e) => setLensUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && lensUrl.trim())
                        setLensImage(lensUrl.trim());
                    }}
                    placeholder="Paste image URL"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#dadce0] dark:border-[#5f6368]
                               bg-transparent text-sm text-[#202124] dark:text-[#e8eaed]
                               placeholder:text-[#9aa0a6] outline-none
                               focus:border-[#1a73e8] dark:focus:border-[#8ab4f8]"
                  />
                  <button
                    onClick={() => {
                      if (lensUrl.trim()) setLensImage(lensUrl.trim());
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-sm font-medium
                               hover:bg-[#1557b0] transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 pb-3">
                <div className="flex-1 h-px bg-[#e8eaed] dark:bg-[#3c4043]" />
                <span className="text-xs text-[#70757a] dark:text-[#9aa0a6]">
                  OR
                </span>
                <div className="flex-1 h-px bg-[#e8eaed] dark:bg-[#3c4043]" />
              </div>

              {/* Drop zone / preview */}
              {lensImage ? (
                <div className="mx-5 mb-5 relative rounded-xl overflow-hidden border border-[#dadce0] dark:border-[#5f6368]">
                  <img
                    src={lensImage}
                    alt="preview"
                    className="w-full max-h-64 object-contain bg-[#f8f9fa] dark:bg-[#303134]"
                  />
                  <button
                    onClick={() => {
                      setLensImage(null);
                      setLensUrl("");
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-[#303134] shadow
                               hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-[#5f6368]"
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
                  <p className="text-center text-xs text-[#70757a] py-2">
                    Image loaded, visual search coming soon
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setLensDrag(true);
                  }}
                  onDragLeave={() => setLensDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setLensDrag(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) {
                      setLensImage(URL.createObjectURL(file));
                    }
                  }}
                  onClick={() => lensFileRef.current?.click()}
                  className={`mx-5 mb-5 rounded-xl border-2 border-dashed cursor-pointer
                             flex flex-col items-center justify-center gap-3 py-10 transition-colors
                             ${
                               lensDrag
                                 ? "border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1e3a5f]"
                                 : "border-[#dadce0] dark:border-[#5f6368] hover:border-[#1a73e8] hover:bg-[#f8f9fa] dark:hover:bg-[#303134]"
                             }`}
                >
                  <svg className="w-10 h-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3 3h7v2H5v5H3V3z" />
                    <path fill="#EA4335" d="M21 3h-7v2h5v5h2V3z" />
                    <path fill="#FBBC05" d="M3 21h7v-2H5v-5H3v7z" />
                    <path fill="#34A853" d="M21 21h-7v-2h5v-5h2v7z" />
                    <circle
                      cx="12"
                      cy="12"
                      r="3.5"
                      fill="none"
                      stroke="#4285F4"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] text-center">
                    Drag an image here
                    <br />
                    <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium">
                      or click to upload
                    </span>
                  </p>
                </div>
              )}

              <input
                ref={lensFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setLensImage(URL.createObjectURL(file));
                  e.target.value = "";
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Mode modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/65 p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAiOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043]
                         w-full sm:max-w-[640px] sm:rounded-2xl rounded-t-3xl
                         shadow-[0_12px_40px_rgba(0,0,0,0.24)] flex flex-col overflow-hidden"
              style={{ height: "min(78vh, 640px)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full bg-[#e8f0fe] dark:bg-[#1a3a5c]/45
                                  border border-[#d2e3fc] dark:border-[#355a86]
                                  flex items-center justify-center shrink-0"
                  >
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                      <path
                        fill="#1a73e8"
                        d="M12 2l2.09 6.26L20.5 10l-6.41 1.74L12 18l-2.09-6.26L3.5 10l6.41-1.74L12 2z"
                      />
                      <path
                        fill="#5f9df5"
                        d="M19 2l.75 2.25L22 5l-2.25.75L19 8l-.75-2.25L16 5l2.25-.75L19 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">
                      AI Mode
                    </p>
                    <p className="text-[11px] text-[#9aa0a6] leading-tight">
                      Powered by Anurag's portfolio
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {aiMessages.length > 0 && (
                    <button
                      onClick={() => setAiMessages([])}
                      className="px-2.5 py-1 rounded-full text-[12px] font-medium text-[#5f6368] dark:text-[#9aa0a6]
                                 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setAiOpen(false)}
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
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
                {/* Empty / welcome state */}
                {aiMessages.length === 0 && !aiTyping && (
                  <div className="flex flex-col items-center justify-start min-h-full pt-8 gap-4 text-center px-2">
                    <div
                      className="w-[56px] h-[56px] rounded-2xl bg-[#e8f0fe] dark:bg-[#1a3a5c]/45
                                    border border-[#d2e3fc] dark:border-[#355a86]
                                    flex items-center justify-center"
                    >
                      <svg className="w-7 h-7" viewBox="0 0 24 24">
                        <path
                          fill="#1a73e8"
                          d="M12 2l2.09 6.26L20.5 10l-6.41 1.74L12 18l-2.09-6.26L3.5 10l6.41-1.74L12 2z"
                        />
                        <path
                          fill="#5f9df5"
                          d="M19 2l.75 2.25L22 5l-2.25.75L19 8l-.75-2.25L16 5l2.25-.75L19 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[28px] sm:text-[32px] font-normal text-[#202124] dark:text-[#e8eaed] leading-tight">
                        How can I help?
                      </p>
                      <p className="text-[12px] text-[#9aa0a6] mt-1">
                        I know his work, skills, projects & more.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { label: "Who is he?", q: "Who is Anurag?" },
                        { label: "Projects", q: "What projects has he built?" },
                        {
                          label: "Hire him",
                          q: "Is Anurag available to hire?",
                        },
                        { label: "Tech stack", q: "What is his tech stack?" },
                        { label: "Blog", q: "Does he have a blog?" },
                        { label: "Experience", q: "What is his experience?" },
                        {
                          label: "Open source",
                          q: "Does he contribute to open source?",
                        },
                        {
                          label: "Education",
                          q: "What is his educational background?",
                        },
                        { label: "Contact", q: "How can I contact Anurag?" },
                        { label: "GitHub", q: "Where can I find his GitHub?" },
                      ].map(({ label, q }) => (
                        <button
                          key={q}
                          onClick={() => handleAiSend(q)}
                          className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#303134]
                                     border border-[#dadce0] dark:border-[#5f6368]
                                     text-[12.5px] text-[#202124] dark:text-[#e8eaed]
                                     hover:border-[#1a73e8] dark:hover:border-[#8ab4f8]
                                     hover:bg-[#f8fbff] dark:hover:bg-[#1a3a5c]/40
                                     transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {aiMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "ai" && (
                      <div
                        className="w-6 h-6 rounded-lg bg-[#e8f0fe] dark:bg-[#1a3a5c]/45
                                      border border-[#d2e3fc] dark:border-[#355a86]
                                      flex items-center justify-center shrink-0 mt-1"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path
                            fill="#1a73e8"
                            d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed
                      ${
                        msg.role === "user"
                          ? "bg-[#1a73e8] text-white rounded-2xl rounded-br-sm"
                          : "bg-[#f1f3f4] dark:bg-[#2d2e30] text-[#202124] dark:text-[#e8eaed] rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                <AnimatePresence>
                  {aiTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-2.5 justify-start"
                    >
                      <div
                        className="w-6 h-6 rounded-lg bg-[#e8f0fe] dark:bg-[#1a3a5c]/45
                                      border border-[#d2e3fc] dark:border-[#355a86]
                                      flex items-center justify-center shrink-0 mt-1"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path
                            fill="#1a73e8"
                            d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
                          />
                        </svg>
                      </div>
                      <div className="bg-[#f1f3f4] dark:bg-[#2d2e30] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        {[0, 1, 2].map((d) => (
                          <motion.span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-[#9aa0a6] block"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.55,
                              delay: d * 0.15,
                              repeat: Infinity,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={aiEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                <div
                  className="flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                                bg-white dark:bg-[#303134] pl-4 pr-1.5 py-1.5"
                >
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAiSend();
                    }}
                    placeholder="Ask about Anurag…"
                    disabled={aiTyping}
                    className="flex-1 bg-transparent py-1.5 text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                               placeholder:text-[#9aa0a6] outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleAiSend()}
                    disabled={!aiInput.trim() || aiTyping}
                    className="p-2 rounded-full bg-[#1a73e8] text-white
                               disabled:opacity-35 disabled:cursor-default
                               hover:bg-[#1557b0] transition-all shrink-0"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Help Modal ────────────────────────────────────────── */}
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
                    desc: "Type any keyword like name, skill, project, or topic to search across the entire portfolio. Press Enter or click the Search button to see results.",
                  },
                  {
                    title: "Smart Suggestions",
                    icon: "💡",
                    desc: "As you type, suggestions appear below the search bar. Use ↑ ↓ arrow keys to navigate, Enter to select, or Escape to dismiss.",
                  },
                  {
                    title: "I'm Feeling Lucky",
                    icon: "🎲",
                    desc: "Clicks to the most relevant page for your query instantly, just like Google's famous button.",
                  },
                  {
                    title: "Voice Search (Mic)",
                    icon: "🎤",
                    desc: "Click the microphone icon inside the search bar to speak your query. Requires microphone permission. The transcript is filled in automatically.",
                  },
                  {
                    title: "Google Lens (Camera)",
                    icon: "📷",
                    desc: "Click the camera icon to open Lens. Drag & drop or paste an image, or enter an image URL, to perform a visual search within the portfolio.",
                  },
                  {
                    title: "AI Mode",
                    desc: "Click the sparkle icon in the search bar to open AI Mode, a conversational assistant that answers any question about Anurag, his skills, projects, and experience.",
                  },
                  {
                    title: "Apps Grid",
                    desc: "Click the 9-dot grid icon in the top-right corner to open quick-access tiles: Search, Gmail, Works, Blog, LinkedIn, GitHub, About, LeetCode, CodeChef.",
                  },
                  {
                    title: "Avatar & Profile",
                    icon: "👤",
                    desc: 'Click the "A" avatar button to see account info, copy email, toggle dark/light mode, or open this Help guide.',
                  },
                  {
                    title: "Weather & Clock",
                    icon: "🌤",
                    desc: "The top-left widget shows the current local time and live weather (temperature + condition) fetched automatically using your location, no API key needed.",
                  },
                  {
                    title: "Language Switcher",
                    icon: "🌐",
                    desc: "Below the search buttons, click any Indian language to translate the UI labels into that language instantly.",
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
                    desc: "Anurag is a full-stack developer specialising in the MERN stack (MongoDB, Express, React, Node.js). The About page details his background, education, and personality.",
                  },
                  {
                    title: "Skills & Tech Stack",
                    icon: "⚙️",
                    desc: "Browse the complete list of technologies: React, Node.js, MongoDB, TypeScript, Docker, AWS, and more, displayed as interactive skill cards.",
                  },
                  {
                    title: "Experience Timeline",
                    icon: "📅",
                    desc: "A chronological timeline of work experience, internships, and key milestones, displayed in a Google-style card layout.",
                  },
                  {
                    title: "Education",
                    icon: "🎓",
                    desc: "Anurag's academic background, degrees, and institutions are listed in the Education section of the About page.",
                  },
                  {
                    title: "Download Resume",
                    icon: "📄",
                    desc: "A resume download button is available on the About page to get a PDF copy of the complete CV.",
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
                    desc: "The Projects page shows all portfolio projects as Google search result–style cards with title, description, tags, and quick links.",
                  },
                  {
                    title: "Filter & Sort",
                    icon: "🔧",
                    desc: "Use the filter chips at the top to narrow projects by technology (React, Node, MongoDB, etc.) or sort by newest, oldest, or featured.",
                  },
                  {
                    title: "Live Demo & GitHub",
                    icon: "🚀",
                    desc: 'Each project card has two action buttons: "Live" to open the deployed site and "GitHub" to view the source code repository.',
                  },
                  {
                    title: "Knowledge Panel",
                    icon: "📊",
                    desc: "Clicking a project opens a detailed knowledge panel on the right side (or bottom on mobile) with full description, tech stack, and screenshots.",
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
                    desc: "The Blog page fetches Anurag's real published articles from Medium (via RSS feed) and displays them as Google search results, 6 articles per page.",
                  },
                  {
                    title: "Pagination",
                    icon: "📖",
                    desc: "Navigate through articles using the Google-style numbered page controls at the bottom. Each page shows exactly 8 articles.",
                  },
                  {
                    title: "Article Reader",
                    icon: "📰",
                    desc: "Click any article title to open the full-screen Medium-style reader with proper typography (Georgia serif, 20px text, 1.8 line-height), no need to leave the portfolio.",
                  },
                  {
                    title: "3-Dot Article Menu",
                    icon: "⋮",
                    desc: "Hover any article card to reveal a 3-dot menu. Options include: Open on Medium, Copy link, and Save (bookmark).",
                  },
                  {
                    title: "People Also Search For",
                    icon: "🔗",
                    desc: 'Below the articles list, a "People also search for" row shows topic chips derived from real article titles for quick navigation.',
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
                    desc: "Fill out the contact form, choose a subject chip, enter your name and email, write a message, and hit Send. The message is saved to the database and emailed to Anurag.",
                  },
                  {
                    title: "File Attachments",
                    icon: "📎",
                    desc: "Attach up to 3 files (max 5 MB each) by dragging them onto the attachment zone or clicking to browse. Supported formats: PDF, DOC, images, and more.",
                  },
                  {
                    title: "Subject Chips",
                    icon: "🏷️",
                    desc: "Click a subject chip (Hire Me, Collaboration, Feedback, General, Bug Report) to pre-fill the subject line of your message.",
                  },
                  {
                    title: "Social Profiles",
                    icon: "🌐",
                    desc: "Below the form, find quick links to LinkedIn, GitHub, Medium, and Twitter/X, styled as Google search result cards.",
                  },
                ],
              },
              {
                id: "tools",
                label: "Tools",
                color: "#00BCD4",
                icon: (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
                  </svg>
                ),
                items: [
                  {
                    title: "Developer Tools",
                    icon: "🛠️",
                    desc: "The Tools page hosts a collection of utility tools built by Anurag, including converters, formatters, generators, and other developer helpers.",
                  },
                  {
                    title: "Use Freely",
                    icon: "✅",
                    desc: "All tools are free to use directly in the browser, no login required. Each tool is self-contained and runs entirely on the client side.",
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
                    desc: "Click the LeetCode tile in the Apps Grid to visit Anurag's LeetCode profile. Track his problem-solving progress, streak, and contest ratings.",
                  },
                  {
                    title: "CodeChef",
                    icon: "🍴",
                    desc: "Click the CodeChef tile in the Apps Grid to visit Anurag's CodeChef profile, ratings, solved problems, and contest history.",
                  },
                  {
                    title: "GitHub",
                    icon: "🐙",
                    desc: "Access the GitHub profile directly from the Apps Grid or the footer. Browse open-source contributions, repositories, and commit history.",
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
                  className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043]
                           w-full sm:max-w-[780px] rounded-t-2xl sm:rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.24)]
                           flex flex-col overflow-hidden"
                  style={{ height: "min(92vh, 680px)" }}
                >
                  {/* Header */}
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

                  {/* Body: sidebar + content */}
                  <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
                    {/* Sidebar */}
                    <nav
                      className="w-full sm:w-[180px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#e8eaed] dark:border-[#3c4043]
                                  overflow-x-auto sm:overflow-y-auto py-2 sm:py-3 px-2 sm:px-0 flex flex-row sm:flex-col gap-1 sm:gap-0.5"
                    >
                      {HELP_SECTIONS.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setHelpSection(i)}
                          className={`shrink-0 sm:shrink flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium
                                   transition-colors text-left rounded-full sm:rounded-none w-auto sm:w-full
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

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
                      {/* Section header */}
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

                      {/* Topic cards */}
                      <div className="flex flex-col gap-3">
                        {sec.items.map((item, idx) => (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="rounded-xl border border-[#e8eaed] dark:border-[#3c4043]
                                     bg-white dark:bg-[#2a2b2c]
                                     px-4 py-3.5"
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

                      {/* Bottom tip */}
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
                          <strong>Tip:</strong> Have more questions? Use{" "}
                          <strong>AI Mode</strong> in the search bar to ask
                          anything about Anurag or this portfolio.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-[#3c4043] bg-[#f2f2f2] dark:bg-[#171717]">
        {/* Location bar */}
        <div
          className="px-6 py-3 border-b border-gray-200 dark:border-[#3c4043]
                        text-sm text-[#70757a] dark:text-[#9aa0a6]"
        >
          {t.earth}
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
            {[
              { label: t.about, to: "/about" },
              { label: t.contact, to: "/contact" },
            ].map(({ label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
