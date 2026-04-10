import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { submitContact } from '../api';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';
import SEO from '../components/SEO';
import { LINKS } from '../config/links';
import { getSocialProfiles } from '../data/socialProfiles';
import { useConfig } from '../hooks/useConfig';
import { useImagesPageEnabled } from '../hooks/useImagesPageEnabled';

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
  const cfg = useConfig();
  const emailAddr = cfg.socialLinks?.email ?? LINKS.email;
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

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
        <span className="min-w-0 flex-1 text-sm text-[#133780] dark:text-[#bdc1c6] truncate">anuragjaiswal.me/contact</span>
        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="p-0.5 rounded-full text-[#70757a] dark:text-[#9aa0a6]
                       hover:text-[#202124] dark:hover:text-[#e8eaed]
                       hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
            aria-label="More options"
          >
            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 w-max rounded-xl
                            bg-white dark:bg-[#303134]
                            border border-[#e8eaed] dark:border-[#5f6368]
                            shadow-[0_4px_16px_rgba(0,0,0,0.15)] overflow-hidden">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/contact`);
                  toast.success('Contact page link copied');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 text-left whitespace-nowrap
                           text-[13px] text-[#202124] dark:text-[#e8eaed]
                           hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
              >
                <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy page link
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(emailAddr);
                  toast.success('Email copied');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 text-left whitespace-nowrap
                           text-[13px] text-[#202124] dark:text-[#e8eaed]
                           hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
              >
                <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Copy email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-[20px] font-normal text-[#1a73e8] dark:text-[#8ab4f8] mb-1">Contact Me</h2>

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
                I typically respond within 24 hours.
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
                    placeholder="e.g. Rahul Kumar" autoComplete="name"
                    className={inputCls('name')} />
                  {errors.name && <p className="text-xs text-[#c5221f] mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
                    Email Address <span className="text-[#c5221f]">*</span>
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="rahulKumar@example.com" autoComplete="email"
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
                  rows={4} placeholder="Tell me about your project, idea, or just say hi…"
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

const PEOPLE_ALSO_SEARCH = [
  { label: 'Projects and open source work', to: '/projects' },
  { label: 'Skills and tech stack',         to: '/tools' },
  { label: 'Background and bio',            to: '/about' },
  { label: 'Blog posts and articles',       to: '/blog' },
];

export default function Contact() {
  const navigate = useNavigate();
  const cfg = useConfig();
  const emailAddr = cfg.socialLinks?.email ?? LINKS.email;
  const imagesEnabled = useImagesPageEnabled();
  const SOCIAL = getSocialProfiles(cfg).filter((p) =>
    ['LinkedIn', 'Twitter / X', 'GitHub', 'Medium'].includes(p.name)
  );
  const [filters,    setFilters]    = useState([]);
  const [sort,       setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);

  let visibleSocial = filters.length === 0
    ? SOCIAL
    : SOCIAL.filter(s => filters.includes(s.name));
  if (sort === 'az') visibleSocial = [...visibleSocial].sort((a, b) => a.name.localeCompare(b.name));

  const getMenuItems = (item) => [
    {
      label: 'Open profile',
      icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
      action: () => window.open(item.href, '_blank', 'noopener,noreferrer'),
    },
    {
      label: 'Copy profile link',
      icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
      action: () => {
        navigator.clipboard.writeText(item.href);
        toast.success(`${item.name} link copied`);
      },
    },
    {
      label: 'Share profile',
      icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
      action: () => {
        if (navigator.share) navigator.share({ title: item.name, url: item.href });
        else { navigator.clipboard.writeText(item.href); toast.success('Link copied'); }
      },
    },
  ];

  return (
    <div className="px-4 sm:pl-[120px] md:pl-[176px] sm:pr-6 md:pr-8 pt-3 pb-10">
      <SEO
        title="Contact"
        description="Get in touch with Anurag Jaiswal — open to job opportunities, collaborations, and project inquiries. Send a message or connect on LinkedIn and GitHub."
        path="/contact"
      />
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
                faviconLetter={item.faviconLetter}
                menuItems={getMenuItems(item)}>
                {/* 
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                  Visit {item.name}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </a>
                */}
              </SearchResult>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* People also search for */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-8 max-w-[680px] border-t border-[#e8eaed] dark:border-[#3c4043] pt-6">
        <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">People also search for</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ...PEOPLE_ALSO_SEARCH.slice(0, imagesEnabled ? 3 : 4),
            ...(imagesEnabled ? [{ label: 'Images and gallery', to: '/images' }] : []),
          ].map(({ label, to, href }) => (
            <button key={label}
              onClick={() => to ? navigate(to) : window.open(href, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-left
                         border border-[#dadce0] dark:border-[#5f6368]
                         text-sm text-[#202124] dark:text-[#e8eaed]
                         hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
