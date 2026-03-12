import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { submitContact } from '../api';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';

const SOCIAL = [
  {
    name: 'LinkedIn',
    url: 'linkedin.com › in › anurag-2911',
    title: 'Anurag — LinkedIn',
    snippet: 'View professional profile on LinkedIn. B.Tech ISE student, Full-Stack Developer, open to job opportunities and collaborations.',
    href: 'https://linkedin.com/in/anurag-2911',
    faviconBg: '#0a66c2',
    faviconLetter: 'in',
  },
  {
    name: 'GitHub',
    url: 'github.com › anurag-2911',
    title: 'Anurag (@anurag-2911) — GitHub',
    snippet: 'Full-Stack Developer · B.Tech ISE · Repositories, contributions, and open-source projects. Public work since 2022.',
    href: 'https://github.com/anurag-2911',
    faviconBg: '#24292e',
    faviconLetter: 'G',
  },
  {
    name: 'Medium',
    url: 'medium.com › @janurag582004',
    title: 'Anurag (@janurag582004) — Medium',
    snippet: 'Technical articles on software engineering, documentation, and developer experiences. Published on Medium.',
    href: 'https://medium.com/@janurag582004',
    faviconBg: '#00ab6c',
    faviconLetter: 'M',
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
];

const SUBJECTS = ['Job Opportunity', 'Collaboration', 'Project Inquiry', 'General Question', 'Feedback', 'Other'];

const fmtSize = b => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const FILE_ICON_COLORS = {
  'image': '#34A853', 'pdf': '#EA4335', 'doc': '#4285F4',
  'zip': '#FBBC05', 'text': '#5f6368', 'other': '#9aa0a6',
};
const fileIconColor = (type) => {
  if (type.startsWith('image/')) return FILE_ICON_COLORS.image;
  if (type === 'application/pdf') return FILE_ICON_COLORS.pdf;
  if (type.includes('word') || type.includes('doc')) return FILE_ICON_COLORS.doc;
  if (type.includes('zip') || type.includes('compressed')) return FILE_ICON_COLORS.zip;
  if (type.startsWith('text/')) return FILE_ICON_COLORS.text;
  return FILE_ICON_COLORS.other;
};

/* ── Contact Form ─────────────────────────────────── */
function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} exceeds 5 MB limit`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid].slice(0, 3));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(ev => ({ ...ev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length > 100) errs.name = 'Name too long';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.message.trim()) errs.message = 'Message is required';
    else if (form.message.trim().length > 2000) errs.message = 'Too long (max 2000)';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await submitContact({ ...form, files });
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      setFiles([]);
      toast.success("Message sent! I'll get back to you soon.");
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.msg || err?.response?.data?.error || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field) =>
    `w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-[#202124]
     text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6]
     outline-none transition-all focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
     ${errors[field] ? 'border-[#c5221f] ring-1 ring-[#c5221f]' : 'border-[#dadce0] dark:border-[#5f6368]'}`;

  return (
    <div className="max-w-[680px] mb-8">
      {/* URL breadcrumb */}
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
      <h2 className="text-[20px] font-normal text-[#1a73e8] dark:text-[#8ab4f8] mb-1">Contact Anurag</h2>

      {/* Card */}
      <div className="bg-white dark:bg-[#292a2d] rounded-2xl border border-[#dadce0] dark:border-[#5f6368] overflow-hidden shadow-sm">

        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-12 px-8">
            <div className="w-14 h-14 rounded-full bg-[#e6f4ea] dark:bg-[#1e3a28] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#34A853]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-1">Message sent!</p>
            <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mb-5">
              Thanks for reaching out. I'll reply within 24 hours.
            </p>
            <button onClick={() => setSent(false)}
              className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
              Send another message
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Header strip */}
            <div className="px-3 sm:px-6 pt-2 sm:pt-3 pb-1 sm:pb-2 border-b border-[#f1f3f4] dark:border-[#3c4043]">
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                I typically respond within <span className="font-medium text-[#202124] dark:text-[#e8eaed]">24 hours</span>.
                All fields marked <span className="text-[#c5221f]">*</span> are required.
              </p>
            </div>

            <div className="px-3 sm:px-6 py-2 sm:py-3 space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1.5">
                  What's this about?
                </label>
                <div className="flex flex-wrap gap-1">
                  {SUBJECTS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(f => ({ ...f, subject: f.subject === s ? '' : s }))}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors
                        ${form.subject === s
                          ? 'bg-[#e8f0fe] dark:bg-[#1a3a5c] border-[#1a73e8] text-[#1a73e8] dark:text-[#8ab4f8]'
                          : 'border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:border-[#1a73e8] hover:text-[#1a73e8]'
                        }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                    Your Name <span className="text-[#c5221f]">*</span>
                  </label>
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="e.g. Anurag Sharma" autoComplete="name"
                    className={inputCls('name')} />
                  {errors.name && <p className="text-xs text-[#c5221f] mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                    Email Address <span className="text-[#c5221f]">*</span>
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" autoComplete="email"
                    className={inputCls('email')} />
                  {errors.email && <p className="text-xs text-[#c5221f] mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                  Message <span className="text-[#c5221f]">*</span>
                </label>
                <textarea name="message" value={form.message} onChange={handleChange}
                  rows={5} placeholder="Tell me about your project, idea, or just say hi…"
                  className={`${inputCls('message')} resize-none`} />
                <div className="flex justify-between mt-1">
                  {errors.message
                    ? <p className="text-xs text-[#c5221f]">{errors.message}</p>
                    : <span />}
                  <span className={`text-xs ml-auto ${form.message.length > 1800 ? 'text-[#c5221f]' : 'text-[#9aa0a6]'}`}>
                    {form.message.length}/2000
                  </span>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                  Attachments <span className="text-[#9aa0a6] font-normal">(Optional · max 3 files · 5 MB each)</span>
                </label>

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                  className={`flex flex-col items-center justify-center gap-1.5 px-4 py-5
                             rounded-xl border-2 border-dashed cursor-pointer transition-colors
                             ${dragOver
                               ? 'border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1a3a5c]/30'
                               : 'border-[#dadce0] dark:border-[#5f6368] hover:border-[#1a73e8] hover:bg-[#f8fafe] dark:hover:bg-[#1a3a5c]/20'
                             }`}>
                  <svg className="w-6 h-6 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    <span className="text-[#1a73e8] dark:text-[#8ab4f8]">Click to attach</span> or drag & drop
                  </p>
                  <input ref={fileRef} type="file" multiple className="hidden"
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                </div>

                {/* File chips */}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((f, i) => (
                      <div key={i}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                                   bg-[#f1f3f4] dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed]">
                        <span style={{ color: fileIconColor(f.type) }}>●</span>
                        <span className="max-w-[140px] truncate">{f.name}</span>
                        <span className="text-[#9aa0a6]">{fmtSize(f.size)}</span>
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="ml-0.5 text-[#9aa0a6] hover:text-[#c5221f] leading-none">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-6 py-2 bg-[#f8f9fa] dark:bg-[#202124] border-t border-[#f1f3f4] dark:border-[#3c4043] flex items-center justify-between gap-3">
              <p className="text-xs text-[#9aa0a6]">
                Your message is saved securely and only used to respond to you.
              </p>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
                           bg-[#1a73e8] hover:bg-[#1557b0] text-white
                           disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0">
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────── */
const PLATFORMS = ['LinkedIn', 'GitHub', 'Medium', 'Twitter / X'];
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

      {/* Contact form card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <ContactForm />
      </motion.div>

      {/* Social / profile results */}
      <AnimatePresence mode="wait">
        <motion.div key={filters.join() + sort} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {visibleSocial.map((item, i) => (
            <motion.div key={item.name}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}>
              <SearchResult
                url={item.url}
                title={item.title}
                snippet={item.snippet}
                href={item.href}
                faviconBg={item.faviconBg}
                faviconLetter={item.faviconLetter}>
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
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
