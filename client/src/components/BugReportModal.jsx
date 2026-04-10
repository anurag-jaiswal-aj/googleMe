import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitFeedback } from '../api';

const TYPES = [
  { id: 'bug',        label: '🐛 Bug',           color: '#EA4335' },
  { id: 'feature',    label: '✨ Feature',        color: '#4285F4' },
  { id: 'suggestion', label: '💡 Suggestion',     color: '#34A853' },
  { id: 'typo',       label: '✏️ Typo / Content', color: '#FBBC05' },
  { id: 'compliment', label: '🌟 Compliment',     color: '#34A853' },
  { id: 'other',      label: '💬 Other',          color: '#9aa0a6' },
];

const PLACEHOLDERS = {
  bug:        'Describe what went wrong…',
  feature:    'Describe the feature you\'d like…',
  suggestion: 'Share your idea…',
  typo:       'What\'s incorrect and where?',
  compliment: 'Say something nice 😊',
  other:      'Your message…',
};

const GOOGLE_BAR = (
  <div className="h-1.5 w-full flex">
    <div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#EA4335]" />
    <div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
  </div>
);

/**
 * Reusable bug/feedback modal.
 * Props:
 *   open     — boolean
 *   onClose  — () => void
 *   initial  — optional initial form values { type, message, name, email, attachment }
 */
export default function BugReportModal({ open, onClose, initial }) {
  const [form, setForm] = useState(
    initial ?? { type: 'bug', message: '', name: '', email: '', attachment: null }
  );
  const [sent,       setSent]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({ type: 'bug', message: '', name: '', email: '', attachment: null });
    setSent(false);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await submitFeedback({
        type:       form.type,
        message:    form.message,
        name:       form.name,
        email:      form.email,
        attachment: form.attachment,
        page:       typeof window !== 'undefined' ? window.location.pathname : '',
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bug-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/65 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[480px] bg-white dark:bg-[#202124] rounded-3xl shadow-2xl overflow-hidden"
          >
            {GOOGLE_BAR}

            {sent ? (
              <div className="px-8 py-10 flex flex-col items-center gap-3 text-center">
                <svg className="w-14 h-14 mb-1" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="28" fill="#e8f5e9"/>
                  <path d="M16 28l8 8 16-16" stroke="#34A853" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[17px] font-medium text-[#202124] dark:text-[#e8eaed]">Thanks for the feedback!</p>
                <p className="text-[13px] text-[#5f6368] dark:text-[#9aa0a6]">Your message has been noted. Anurag will look into it.</p>
                <button onClick={handleClose} className="mt-3 px-7 py-2 rounded-full bg-[#1a73e8] text-white text-[13.5px] font-medium hover:bg-[#1557b0] transition-colors">Done</button>
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
                  <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                    <svg className="w-5 h-5 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* Type chips */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TYPES.map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => set('type', id)}
                      style={form.type === id ? { borderColor: color, color, backgroundColor: color + '18' } : {}}
                      className={`py-1.5 px-2 rounded-full text-[11.5px] font-medium border transition-all text-center
                        ${form.type === id ? 'border-current' : 'border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'}`}
                    >{label}</button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder={PLACEHOLDERS[form.type] ?? 'Your message…'}
                  className="w-full rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#303134]
                             px-4 py-3 text-[13.5px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]
                             outline-none focus:border-[#1a73e8] focus:bg-white dark:focus:bg-[#3c4043] resize-none transition-all"
                />

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {['name', 'email'].map((field) => (
                    <input
                      key={field}
                      type={field === 'email' ? 'email' : 'text'}
                      value={form[field]}
                      onChange={(e) => set(field, e.target.value)}
                      placeholder={`${field.charAt(0).toUpperCase() + field.slice(1)} (optional)`}
                      className="rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#303134]
                                 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]
                                 outline-none focus:border-[#1a73e8] focus:bg-white dark:focus:bg-[#3c4043] transition-all"
                    />
                  ))}
                </div>

                {/* Attachment */}
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                                    text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      {form.attachment ? form.attachment.name : 'Attach a file (optional)'}
                    </div>
                    {form.attachment && (
                      <button type="button"
                        onClick={(e) => { e.preventDefault(); set('attachment', null); }}
                        className="text-[#EA4335] hover:text-[#c5221f] text-[11px] font-medium"
                      >Remove</button>
                    )}
                    <input type="file" className="hidden" accept="image/*,.pdf,.txt,.log"
                      onChange={(e) => { set('attachment', e.target.files?.[0] || null); e.target.value = ''; }}
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-[#9aa0a6]">Images, PDF, TXT (max 5 MB)</p>
                </div>

                {error && (
                  <p className="mt-2 text-[12px] text-[#EA4335] flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {error}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-[11px] text-[#9aa0a6]">
                    Page: <span className="font-mono">{typeof window !== 'undefined' ? window.location.pathname : ''}</span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleClose}
                      className="px-5 py-2 rounded-full text-[13px] font-medium text-[#5f6368] dark:text-[#9aa0a6]
                                 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                    >Cancel</button>
                    <button
                      disabled={!form.message.trim() || submitting}
                      onClick={handleSubmit}
                      className="px-5 py-2 rounded-full bg-[#1a73e8] text-white text-[13px] font-medium
                                 hover:bg-[#1557b0] disabled:opacity-40 disabled:cursor-default transition-colors flex items-center gap-2"
                    >
                      {submitting && (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      )}
                      {submitting ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {GOOGLE_BAR}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
