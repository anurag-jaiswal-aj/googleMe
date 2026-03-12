import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { submitContact } from '../api';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';

const SOCIAL = [
  {
    name: 'LinkedIn',
    url: 'linkedin.com › in › anurag-dev',
    title: 'Anurag — LinkedIn',
    snippet: 'View Anurag\'s professional profile on LinkedIn. B.Tech ISE student, Full-Stack Developer, open to opportunities.',
    href: 'https://linkedin.com/in/anurag-2911',
    faviconBg: '#0a66c2',
    faviconLetter: 'in',
  },
  {
    name: 'GitHub',
    url: 'github.com › anurag-2911',
    title: 'Anurag (@anurag-2911) — GitHub',
    snippet: 'Full-Stack Developer · B.Tech ISE · Repositories, contributions, and open-source projects. Star count and contributions since 2022.',
    href: 'https://github.com/anurag-2911',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    name: 'Twitter / X',
    url: 'x.com › anurag_dev',
    title: 'Anurag (@anurag_dev) on X',
    snippet: 'Tweeting about web development, open source, and student life. Full-Stack Developer & B.Tech ISE.',
    href: 'https://twitter.com/anurag_dev',
    faviconBg: '#1d9bf0',
    faviconLetter: 'X',
  },
  {
    name: 'Email',
    url: 'mail.google.com',
    title: 'Email Anurag — anurag.dev@gmail.com',
    snippet: 'Send a direct email to discuss projects, collaborations, or opportunities. Typical response time: within 24 hours.',
    href: 'mailto:anurag.dev@gmail.com',
    faviconBg: '#EA4335',
    faviconLetter: 'M',
  },
];

const initialForm = { name: '', email: '', message: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.trim().length > 100) errors.name = 'Name too long';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email';
  if (!form.message.trim()) errors.message = 'Message is required';
  else if (form.message.trim().length > 2000) errors.message = 'Message too long';
  return errors;
}

/* Featured Snippet — the contact form inside a Google-style featured answer box */
function FeaturedSnippet() {
  const [form,       setForm]       = useState(initialForm);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent,       setSent]       = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await submitContact(form);
      setSent(true);
      setForm(initialForm);
      toast.success("Message sent! I'll get back to you soon.");
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.error ||
        'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[680px] mb-8">
      {/* URL row */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-[18px] h-[18px] rounded-full bg-[#4285F4] flex items-center justify-center text-white text-[9px] font-bold shrink-0">A</div>
        <span className="text-sm text-[#133780] dark:text-[#bdc1c6]">anurag.dev › contact</span>
        <button className="ml-0.5 text-[#70757a]" tabIndex={-1} aria-label="More">
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* Title */}
      <span className="block text-[20px] leading-[1.3] font-normal text-[#1a73e8] dark:text-[#8ab4f8] mb-2">
        Contact Anurag — Portfolio
      </span>

      {/* Featured snippet box */}
      <div className="border-l-4 border-[#1a73e8] dark:border-[#8ab4f8]
                      bg-[#f8f9fa] dark:bg-[#303134] rounded-r-xl p-5">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="flex justify-center mb-3">
              <svg className="w-10 h-10 text-[#1a73e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p className="text-[#202124] dark:text-[#e8eaed] font-medium mb-1">Message sent!</p>
            <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-4">
              Thanks for reaching out. I'll get back to you within 24 hours.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-3">
              Fill out the form below — I typically respond within <strong className="text-[#202124] dark:text-[#e8eaed]">24 hours</strong>.
            </p>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                Your Name <span className="text-[#c5221f]">*</span>
              </label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Anurag Sharma"
                autoComplete="name"
                className={`w-full px-4 py-2 rounded-full border text-sm bg-white dark:bg-[#202124]
                            text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6]
                            outline-none transition-all focus:ring-2 focus:ring-[#1a73e8]
                            ${errors.name ? 'border-[#c5221f]' : 'border-[#dadce0] dark:border-[#5f6368]'}`}
              />
              {errors.name && <p className="text-xs text-[#c5221f] mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                Email Address <span className="text-[#c5221f]">*</span>
              </label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2 rounded-full border text-sm bg-white dark:bg-[#202124]
                            text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6]
                            outline-none transition-all focus:ring-2 focus:ring-[#1a73e8]
                            ${errors.email ? 'border-[#c5221f]' : 'border-[#dadce0] dark:border-[#5f6368]'}`}
              />
              {errors.email && <p className="text-xs text-[#c5221f] mt-1">{errors.email}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                Message <span className="text-[#c5221f]">*</span>
              </label>
              <textarea
                name="message" value={form.message} onChange={handleChange} rows={4}
                placeholder="Tell me about your project or just say hi..."
                className={`w-full px-4 py-2 rounded-2xl border text-sm bg-white dark:bg-[#202124]
                            text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6]
                            outline-none transition-all focus:ring-2 focus:ring-[#1a73e8] resize-none
                            ${errors.message ? 'border-[#c5221f]' : 'border-[#dadce0] dark:border-[#5f6368]'}`}
              />
              <div className="flex justify-between mt-0.5">
                {errors.message
                  ? <p className="text-xs text-[#c5221f]">{errors.message}</p>
                  : <span />}
                <span className={`text-xs ${form.message.length > 1800 ? 'text-[#c5221f]' : 'text-[#9aa0a6]'}`}>
                  {form.message.length}/2000
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium
                         bg-[#1a73e8] hover:bg-[#1557b0] text-white
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-colors"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────── */
const PLATFORMS = ['LinkedIn', 'GitHub', 'Twitter / X', 'Email'];
const SORT_OPTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'az',        label: 'A → Z' },
];

export default function Contact() {
  const [filters,    setFilters]    = useState([]);
  const [sort,       setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);

  let visibleSocial = filters.length === 0
    ? SOCIAL
    : SOCIAL.filter(s => filters.includes(s.name));
  if (sort === 'az') visibleSocial = [...visibleSocial].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">

      {/* Stats + FilterSort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          About {(SOCIAL.length + 1).toLocaleString()} results (0.18 seconds)
        </p>
        <FilterSort
          filterOptions={PLATFORMS}
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

      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

      {/* Featured snippet — contact form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <FeaturedSnippet />
      </motion.div>

      {/* Social link results */}
      <AnimatePresence mode="wait">
        <motion.div key={filters.join() + sort} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {visibleSocial.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <SearchResult
                url={item.url}
                title={item.title}
                snippet={item.snippet}
                href={item.href}
                faviconBg={item.faviconBg}
                faviconLetter={item.faviconLetter}
              >
                <a
                  href={item.href}
                  target={item.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
                >
                  Visit {item.name}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </a>
              </SearchResult>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
