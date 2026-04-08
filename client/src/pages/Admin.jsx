import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api, {
  fetchGithubRepos, saveGithubSelection,
  fetchImages, uploadImage, updateImage, deleteImage,
  fetchConfig, saveConfig, saveConfigBulk, uploadResume,
  adminLogin, adminVerify,
} from '../api';
import { LINKS } from '../config/links';
import { clearConfigCache } from '../hooks/useConfig';
import SEO from '../components/SEO';

/* ══════════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════════ */

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      {label && <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">{label}</span>}
      <button
        onClick={() => onChange(!value)}
        className={`relative rounded-full transition-colors duration-200 focus:outline-none shrink-0
          ${value ? 'bg-[#1a73e8]' : 'bg-[#dadce0] dark:bg-[#5f6368]'}`}
        style={{ width: 40, height: 22 }}
        aria-label={label}
      >
        <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200
          ${value ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-[#202124] dark:text-[#e8eaed]">{title}</h2>
      {subtitle && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors";
const textareaCls = `${inputCls} resize-none`;

function SaveBar({ saving, saved, onSave, error }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#e8eaed] dark:border-[#3c4043]">
      {saved ? (
        <span className="text-sm text-[#34A853] flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          Saved
        </span>
      ) : error ? (
        <span className="text-sm text-[#d93025]">{error}</span>
      ) : <span />}
      <button
        disabled={saving}
        onClick={onSave}
        className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-normal hover:bg-[#1967d2] disabled:opacity-50 transition-colors"
      >
        {saving && (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        )}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   EXTRA TAGS EDITOR (Projects tab)
══════════════════════════════════════════════════════ */
function ExtraTagsEditor({ tags, onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (!val || tags.includes(val)) { setInput(''); return; }
    onChange([...tags, val]);
    setInput('');
  };
  const remove = (tag) => onChange(tags.filter(t => t !== tag));
  return (
    <div className="mt-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8] border border-[#c5d7f7] dark:border-[#2a4080]">
              {tag}
              <button type="button" onClick={() => remove(tag)} className="text-[#1a73e8] hover:text-[#c5221f] leading-none ml-0.5">x</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add tag…"
          className="flex-1 px-2 py-1 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
        <button type="button" onClick={add} className="px-2 py-1 text-xs rounded-lg bg-[#1a73e8] text-white hover:bg-[#1967d2] transition-colors">Add</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: PROFILE
══════════════════════════════════════════════════════ */
function ProfileTab({ cfg, onSaved }) {
  const [form, setForm] = useState({
    name:       cfg.profile?.name       ?? 'Anurag Jaiswal',
    title:      cfg.profile?.title      ?? 'Engineering Student',
    statusText: cfg.profile?.statusText ?? 'Open to Work',
    statusOn:   cfg.profile?.statusOn   ?? true,
    footerDate: cfg.profile?.footerDate ?? 'March 2026',
    education: {
      institution: cfg.profile?.education?.institution ?? 'Visvesvaraya Technological University',
      degree:      cfg.profile?.education?.degree      ?? 'Bachelors of Engineering in CS',
      years:       cfg.profile?.education?.years       ?? '2023 – 2027',
    },
  });
  const [links, setLinks] = useState({
    github:             cfg.socialLinks?.github             ?? LINKS.github,
    linkedin:           cfg.socialLinks?.linkedin           ?? LINKS.linkedin,
    twitter:            cfg.socialLinks?.twitter            ?? LINKS.twitter,
    leetcode:           cfg.socialLinks?.leetcode           ?? LINKS.leetcode,
    codechef:           cfg.socialLinks?.codechef           ?? LINKS.codechef,
    email:              cfg.socialLinks?.email              ?? LINKS.email,
    alternatePortfolio: cfg.socialLinks?.alternatePortfolio ?? LINKS.alternatePortfolio,
  });
  const [githubUsername, setGithubUsername] = useState(cfg.githubUsername ?? 'anurag-jaiswal-aj');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState(cfg.resumeUrl ?? '');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };
  const setEdu = (k, v) => { setForm(f => ({ ...f, education: { ...f.education, [k]: v } })); setSaved(false); };
  const setLink = (k, v) => { setLinks(l => ({ ...l, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfigBulk([
        { key: 'profile',       value: form },
        { key: 'socialLinks',   value: { ...links, mailto: `mailto:${links.email}` } },
        { key: 'githubUsername', value: githubUsername },
        { key: 'resumeUrl',     value: resumeUrl },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Profile" subtitle="Your identity — shown in the Knowledge Panel and throughout the site." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name">
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your Name" />
        </Field>
        <Field label="Title / Subtitle">
          <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Engineering Student" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <Field label="Status Badge Text">
          <input className={inputCls} value={form.statusText} onChange={e => set('statusText', e.target.value)} placeholder="e.g. Open to Work" />
        </Field>
        <div className="flex items-center gap-3 pb-1">
          <Toggle value={form.statusOn} onChange={v => set('statusOn', v)} label="Show status badge" />
        </div>
      </div>

      <Field label="Footer 'Updated' Date">
        <input className={inputCls} value={form.footerDate} onChange={e => set('footerDate', e.target.value)} placeholder="e.g. March 2026" />
      </Field>

      <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-4">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-3">Education (Knowledge Panel)</p>
        <div className="space-y-3">
          <Field label="Institution">
            <input className={inputCls} value={form.education.institution} onChange={e => setEdu('institution', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Degree">
              <input className={inputCls} value={form.education.degree} onChange={e => setEdu('degree', e.target.value)} />
            </Field>
            <Field label="Years">
              <input className={inputCls} value={form.education.years} onChange={e => setEdu('years', e.target.value)} placeholder="2023 – 2027" />
            </Field>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-4">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-3">Social Links</p>
        <div className="space-y-3">
          {[
            { key: 'github',             label: 'GitHub URL' },
            { key: 'linkedin',           label: 'LinkedIn URL' },
            { key: 'twitter',            label: 'Twitter / X URL' },
            { key: 'leetcode',           label: 'LeetCode URL' },
            { key: 'codechef',           label: 'CodeChef URL' },
            { key: 'email',              label: 'Email Address' },
            { key: 'alternatePortfolio', label: 'Alternate Portfolio URL' },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <input className={inputCls} value={links[key]} onChange={e => setLink(key, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>

      <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-4">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-3">GitHub (Projects Page)</p>
        <Field label="GitHub Username">
          <input className={inputCls} value={githubUsername} onChange={e => { setGithubUsername(e.target.value); setSaved(false); }} placeholder="your-github-username" />
        </Field>
      </div>

      <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-4">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-3">Resume</p>
        <Field label="Resume URL (Google Drive or any public PDF link)">
          <input
            className={inputCls}
            value={resumeUrl}
            onChange={e => { setResumeUrl(e.target.value); setSaved(false); }}
            placeholder="https://drive.google.com/file/d/FILE_ID/view"
          />
        </Field>
        <p className="text-xs text-[#9aa0a6] mt-1">Tip: use a Google Drive share link — set access to "Anyone with the link"</p>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: KNOWLEDGE PANEL (skills bars)
══════════════════════════════════════════════════════ */
const SKILL_COLORS = ['#4285F4','#34A853','#FBBC05','#EA4335','#9c27b0','#ff5722','#00bcd4','#607d8b'];

function KnowledgePanelTab({ cfg, onSaved }) {
  const defaultSkills = [
    { name: 'Machine Learning',               pct: 88, color: '#4285F4' },
    { name: 'Web Development',                pct: 82, color: '#34A853' },
    { name: 'Data Structures and Algorithms', pct: 75, color: '#FBBC05' },
    { name: 'Data Science',                   pct: 70, color: '#EA4335' },
  ];
  const [skills, setSkills] = useState(cfg.knowledgeSkills ?? defaultSkills);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const update = (i, field, val) => {
    setSaved(false);
    setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === 'pct' ? Math.min(100, Math.max(0, Number(val))) : val } : s));
  };
  const add    = () => { setSaved(false); setSkills(prev => [...prev, { name: 'New Skill', pct: 50, color: SKILL_COLORS[prev.length % SKILL_COLORS.length] }]); };
  const remove = (i) => { setSaved(false); setSkills(prev => prev.filter((_, idx) => idx !== i)); };

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfig('knowledgeSkills', skills);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Knowledge Panel Skills" subtitle="The skill bars shown in the right-side panel." />
      <div className="space-y-3">
        {skills.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="color" value={s.color} onChange={e => update(i, 'color', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-[#dadce0] dark:border-[#5f6368] shrink-0" />
            <input className={`${inputCls} flex-1`} value={s.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Skill name" />
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" min={0} max={100} value={s.pct} onChange={e => update(i, 'pct', e.target.value)}
                className="w-16 px-2 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors text-center" />
              <span className="text-xs text-[#9aa0a6]">%</span>
            </div>
            <button onClick={() => remove(i)} className="p-1.5 rounded-full text-[#9aa0a6] hover:text-[#d93025] hover:bg-[#fce8e6] transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Add skill
      </button>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: ABOUT
══════════════════════════════════════════════════════ */
import { BIO_PARAGRAPHS as DEFAULT_BIO, SKILLS as DEFAULT_SKILLS_DATA, EDUCATION as DEFAULT_EDU, EXPERIENCE as DEFAULT_EXP, CERTIFICATIONS as DEFAULT_CERTS } from '../data/aboutData';

function AboutTab({ cfg, onSaved }) {
  const [bio, setBio]     = useState(cfg.bioParagraphs ?? DEFAULT_BIO);
  const [edu, setEdu]     = useState(cfg.education     ?? DEFAULT_EDU);
  const [exp, setExp]     = useState(cfg.experience    ?? DEFAULT_EXP);
  const [certs, setCerts] = useState(cfg.certifications ?? DEFAULT_CERTS);
  const [skills, setSkills] = useState(cfg.skills      ?? DEFAULT_SKILLS_DATA);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');
  const [section, setSection] = useState('bio');

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfigBulk([
        { key: 'bioParagraphs',  value: bio },
        { key: 'education',      value: edu },
        { key: 'experience',     value: exp },
        { key: 'certifications', value: certs },
        { key: 'skills',         value: skills },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  const SECTIONS = [
    { id: 'bio',   label: 'Bio' },
    { id: 'edu',   label: 'Education' },
    { id: 'exp',   label: 'Experience' },
    { id: 'certs', label: 'Certifications' },
    { id: 'skills',label: 'Skills' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="About Page" subtitle="Edit all content shown on the About page." />

      {/* Sub-nav */}
      <div className="flex gap-1 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${section === s.id ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Bio */}
      {section === 'bio' && (
        <div className="space-y-3">
          {bio.map((para, i) => (
            <div key={i} className="flex gap-2">
              <textarea rows={3} className={`${textareaCls} flex-1`} value={para}
                onChange={e => { setSaved(false); setBio(prev => prev.map((p, idx) => idx === i ? e.target.value : p)); }} />
              <button onClick={() => { setSaved(false); setBio(prev => prev.filter((_, idx) => idx !== i)); }}
                className="p-1.5 rounded-full text-[#9aa0a6] hover:text-[#d93025] hover:bg-[#fce8e6] transition-colors shrink-0 self-start mt-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
          <button onClick={() => { setSaved(false); setBio(prev => [...prev, '']); }}
            className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add paragraph
          </button>
        </div>
      )}

      {/* Education */}
      {section === 'edu' && (
        <div className="space-y-4">
          {edu.map((e, i) => (
            <div key={i} className="p-3 border border-[#e8eaed] dark:border-[#3c4043] rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">Entry {i + 1}</span>
                <button onClick={() => { setSaved(false); setEdu(prev => prev.filter((_, idx) => idx !== i)); }}
                  className="text-xs text-[#d93025] hover:underline">Remove</button>
              </div>
              {[['year','Year / Period'],['degree','Degree'],['school','School / Institution'],['detail','Detail']].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input className={inputCls} value={e[field] ?? ''} onChange={ev => { setSaved(false); setEdu(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: ev.target.value } : x)); }} />
                </Field>
              ))}
            </div>
          ))}
          <button onClick={() => { setSaved(false); setEdu(prev => [...prev, { year: '', degree: '', school: '', detail: '', color: '#4285F4' }]); }}
            className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add entry
          </button>
        </div>
      )}

      {/* Experience */}
      {section === 'exp' && (
        <div className="space-y-4">
          {exp.map((e, i) => (
            <div key={i} className="p-3 border border-[#e8eaed] dark:border-[#3c4043] rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">Entry {i + 1}</span>
                <button onClick={() => { setSaved(false); setExp(prev => prev.filter((_, idx) => idx !== i)); }}
                  className="text-xs text-[#d93025] hover:underline">Remove</button>
              </div>
              {[['period','Period'],['role','Role'],['company','Company']].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input className={inputCls} value={e[field] ?? ''} onChange={ev => { setSaved(false); setExp(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: ev.target.value } : x)); }} />
                </Field>
              ))}
              <Field label="Detail">
                <textarea rows={3} className={textareaCls} value={e.detail ?? ''} onChange={ev => { setSaved(false); setExp(prev => prev.map((x, idx) => idx === i ? { ...x, detail: ev.target.value } : x)); }} />
              </Field>
            </div>
          ))}
          <button onClick={() => { setSaved(false); setExp(prev => [...prev, { period: '', role: '', company: '', detail: '', color: '#4285F4' }]); }}
            className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add entry
          </button>
        </div>
      )}

      {/* Certifications */}
      {section === 'certs' && (
        <div className="space-y-4">
          {certs.map((c, i) => (
            <div key={i} className="p-3 border border-[#e8eaed] dark:border-[#3c4043] rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">Cert {i + 1}</span>
                <button onClick={() => { setSaved(false); setCerts(prev => prev.filter((_, idx) => idx !== i)); }}
                  className="text-xs text-[#d93025] hover:underline">Remove</button>
              </div>
              {[['title','Title'],['issuer','Issuer'],['year','Year'],['credential','Credential URL (optional)']].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input className={inputCls} value={c[field] ?? ''} onChange={ev => { setSaved(false); setCerts(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: ev.target.value } : x)); }} />
                </Field>
              ))}
            </div>
          ))}
          <button onClick={() => { setSaved(false); setCerts(prev => [...prev, { title: '', issuer: '', year: '', credential: '', color: '#4285F4' }]); }}
            className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add certification
          </button>
        </div>
      )}

      {/* Skills */}
      {section === 'skills' && (
        <div className="space-y-4">
          {skills.map((cat, i) => (
            <div key={i} className="p-3 border border-[#e8eaed] dark:border-[#3c4043] rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <input className={`${inputCls} flex-1`} value={cat.cat} placeholder="Category name"
                  onChange={e => { setSaved(false); setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, cat: e.target.value } : x)); }} />
                <button onClick={() => { setSaved(false); setSkills(prev => prev.filter((_, idx) => idx !== i)); }}
                  className="text-xs text-[#d93025] hover:underline shrink-0">Remove</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.list.map((item, j) => (
                  <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#f1f3f4] dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed]">
                    {item}
                    <button onClick={() => { setSaved(false); setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, list: x.list.filter((_, jj) => jj !== j) } : x)); }}
                      className="text-[#9aa0a6] hover:text-[#d93025] leading-none">x</button>
                  </span>
                ))}
                <input
                  placeholder="Add…"
                  className="px-2 py-0.5 text-[11px] border border-dashed border-[#dadce0] dark:border-[#5f6368] rounded bg-transparent text-[#202124] dark:text-[#e8eaed] focus:outline-none w-20"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setSaved(false);
                      const val = e.target.value.trim();
                      setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, list: [...x.list, val] } : x));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          ))}
          <button onClick={() => { setSaved(false); setSkills(prev => [...prev, { cat: 'New Category', list: [] }]); }}
            className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add category
          </button>
        </div>
      )}

      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: PROJECTS (GitHub picker — existing logic)
══════════════════════════════════════════════════════ */
function ProjectsTab() {
  const [allRepos, setAllRepos]       = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [reposLoading, setReposLoading]   = useState(false);
  const [reposError, setReposError]       = useState('');
  const [reposSaving, setReposSaving]     = useState(false);
  const [reposSaved, setReposSaved]       = useState(false);
  const [repoSearch, setRepoSearch]       = useState('');

  useEffect(() => { loadRepos(); }, []);

  const loadRepos = async () => {
    setReposLoading(true); setReposError('');
    try {
      const { repos, selected } = await fetchGithubRepos();
      setAllRepos(repos);
      setSelectedRepos(selected.map(s => typeof s === 'string' ? { name: s, featured: false, extraTags: [] } : { extraTags: [], ...s }));
    } catch { setReposError('Could not load GitHub repos.'); }
    finally { setReposLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="GitHub Repos" subtitle="Select which repos appear on the Projects page. Order = selection order." />
        <button onClick={loadRepos} disabled={reposLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1a73e8] border border-[#dadce0] dark:border-[#5f6368] rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${reposLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {reposError && <div className="text-sm text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">{reposError}</div>}

      {!reposLoading && allRepos.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <input type="text" value={repoSearch} onChange={e => setRepoSearch(e.target.value)} placeholder="Filter repos…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
          </div>
          <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6] shrink-0">{selectedRepos.length} selected</span>
        </div>
      )}

      {reposLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-lg bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse"/>)}</div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {allRepos
            .filter(r => !repoSearch || r.name.toLowerCase().includes(repoSearch.toLowerCase()) || (r.description || '').toLowerCase().includes(repoSearch.toLowerCase()))
            .map(repo => {
              const entry    = selectedRepos.find(s => s.name === repo.name);
              const isSelected = !!entry;
              const isFeatured = entry?.featured ?? false;
              const selIdx   = selectedRepos.findIndex(s => s.name === repo.name);
              return (
                <div key={repo.name}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors
                    ${isSelected ? 'border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1a2744] dark:border-[#4285F4]' : 'border-[#e8eaed] dark:border-[#3c4043] hover:bg-[#f8f9fa] dark:hover:bg-[#2d2e30]'}`}>
                  <input type="checkbox" checked={isSelected}
                    onChange={() => { setReposSaved(false); setSelectedRepos(prev => isSelected ? prev.filter(s => s.name !== repo.name) : [...prev, { name: repo.name, featured: false, extraTags: [] }]); }}
                    className="mt-1 shrink-0 accent-[#1a73e8]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] truncate">{repo.name}</span>
                      {isSelected && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1a73e8] text-white shrink-0">#{selIdx + 1}</span>}
                      {repo.language && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] shrink-0">{repo.language}</span>}
                      {repo.stars > 0 && (
                        <span className="text-[11px] text-[#9aa0a6] flex items-center gap-0.5 shrink-0">
                          <svg className="w-3 h-3 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          {repo.stars}
                        </span>
                      )}
                    </div>
                    {repo.description && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 truncate">{repo.description}</p>}
                    {isSelected && (
                      <ExtraTagsEditor tags={entry?.extraTags ?? []}
                        onChange={tags => { setReposSaved(false); setSelectedRepos(prev => prev.map(s => s.name === repo.name ? { ...s, extraTags: tags } : s)); }} />
                    )}
                  </div>
                  {isSelected && (
                    <button title={isFeatured ? 'Remove featured' : 'Mark as featured'}
                      onClick={() => { setReposSaved(false); setSelectedRepos(prev => prev.map(s => s.name === repo.name ? { ...s, featured: !s.featured } : s)); }}
                      className="shrink-0 p-1 rounded-full hover:bg-white/60 dark:hover:bg-black/20 transition-colors">
                      <svg className={`w-4 h-4 ${isFeatured ? 'text-[#FBBC05]' : 'text-[#dadce0] dark:text-[#5f6368]'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {!reposLoading && (
        <div className="flex items-center justify-between pt-2 border-t border-[#e8eaed] dark:border-[#3c4043]">
          {reposSaved ? (
            <span className="text-sm text-[#34A853] flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              Saved. Projects page updated
            </span>
          ) : <span />}
          <button disabled={reposSaving}
            onClick={async () => {
              setReposSaving(true); setReposSaved(false);
              try { await saveGithubSelection(selectedRepos); setReposSaved(true); }
              catch { setReposError('Failed to save selection.'); }
              finally { setReposSaving(false); }
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] disabled:opacity-50 transition-colors">
            {reposSaving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {reposSaving ? 'Saving…' : 'Save Selection'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: BLOG
══════════════════════════════════════════════════════ */
function BlogTab({ cfg, onSaved }) {
  const [mediumUsername, setMediumUsername] = useState(cfg.mediumUsername ?? 'janurag582004');
  const [postsPerPage, setPostsPerPage]     = useState(cfg.blogPostsPerPage ?? 6);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfigBulk([
        { key: 'mediumUsername',  value: mediumUsername },
        { key: 'blogPostsPerPage', value: Number(postsPerPage) },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Blog Settings" subtitle="Controls for the Blog page." />
      <Field label="Medium Username">
        <div className="flex items-center">
          <span className="px-3 py-2 text-sm border border-r-0 border-[#dadce0] dark:border-[#5f6368] rounded-l-lg bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">@</span>
          <input className="flex-1 px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-r-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors"
            value={mediumUsername} onChange={e => { setMediumUsername(e.target.value); setSaved(false); }} placeholder="your-medium-username" />
        </div>
        <p className="text-xs text-[#9aa0a6] mt-1">Used to fetch your posts via Medium RSS feed.</p>
      </Field>
      <Field label="Posts per page">
        <input type="number" min={1} max={20} className={`${inputCls} w-24`} value={postsPerPage}
          onChange={e => { setPostsPerPage(e.target.value); setSaved(false); }} />
      </Field>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: SITE (toggles)
══════════════════════════════════════════════════════ */
function SiteTab({ cfg, onSaved }) {
  const [imagesEnabled, setImagesEnabled] = useState(() => localStorage.getItem('imagesPageEnabled') !== 'false');
  const [blogEnabled,   setBlogEnabled]   = useState(() => localStorage.getItem('blogPageEnabled')   !== 'false');
  const [toolsEnabled,  setToolsEnabled]  = useState(() => localStorage.getItem('toolsPageEnabled')  !== 'false');
  const [defaultTheme,  setDefaultTheme]  = useState(cfg.defaultTheme ?? 'system');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const toggle = (key, val, setter, event) => {
    setter(val);
    localStorage.setItem(key, val ? 'true' : 'false');
    window.dispatchEvent(new Event(event));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfig('defaultTheme', defaultTheme);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Site Settings" subtitle="Toggle pages and set site-wide defaults." />

      <div className="space-y-4">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide">Page Visibility</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#f1f3f4] dark:border-[#3c4043]">
            <div>
              <p className="text-sm text-[#202124] dark:text-[#e8eaed]">Images tab</p>
              <p className="text-xs text-[#9aa0a6]">Show or hide the Images page in navigation</p>
            </div>
            <Toggle value={imagesEnabled} onChange={v => toggle('imagesPageEnabled', v, setImagesEnabled, 'imagesPageToggled')} />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#f1f3f4] dark:border-[#3c4043]">
            <div>
              <p className="text-sm text-[#202124] dark:text-[#e8eaed]">Blog tab</p>
              <p className="text-xs text-[#9aa0a6]">Show or hide the Blog page in navigation</p>
            </div>
            <Toggle value={blogEnabled} onChange={v => toggle('blogPageEnabled', v, setBlogEnabled, 'blogPageToggled')} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[#202124] dark:text-[#e8eaed]">Toolkit tab</p>
              <p className="text-xs text-[#9aa0a6]">Show or hide the Toolkit page in navigation</p>
            </div>
            <Toggle value={toolsEnabled} onChange={v => toggle('toolsPageEnabled', v, setToolsEnabled, 'toolsPageToggled')} />
          </div>
        </div>
      </div>

      <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-4 space-y-3">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide">Default Theme</p>
        <div className="flex gap-2">
          {['light','dark','system'].map(t => (
            <button key={t} onClick={() => { setDefaultTheme(t); setSaved(false); }}
              className={`px-4 py-2 rounded-full text-sm border transition-colors capitalize
                ${defaultTheme === t ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:border-[#1a73e8]'}`}>
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#9aa0a6]">Applies to new visitors. Returning visitors keep their saved preference.</p>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: IMAGES (existing gallery logic)
══════════════════════════════════════════════════════ */
function ImagesTab() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError]     = useState('');
  const [imgUploading, setImgUploading]     = useState(false);
  const [imgForm, setImgForm] = useState({ title: '', category: 'Projects', description: '', link: '' });
  const [imgFile, setImgFile]     = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const imgFileRef = useRef(null);
  const [editingImg, setEditingImg] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadGallery(); }, []);

  const loadGallery = async () => {
    setGalleryLoading(true); setGalleryError('');
    try { setGalleryImages(await fetchImages()); }
    catch { setGalleryError('Could not load images.'); }
    finally { setGalleryLoading(false); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Gallery Images" subtitle="Upload and manage images shown on the Images page." />

      {/* Upload form */}
      <div className="border border-[#dadce0] dark:border-[#5f6368] rounded-xl p-4 space-y-4">
        <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">Upload new image</p>
        <div onClick={() => imgFileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors border-[#dadce0] dark:border-[#5f6368] hover:border-[#1a73e8] hover:bg-[#f8fafe] dark:hover:bg-[#1a3a5c]/10">
          {imgPreview ? (
            <img src={imgPreview} alt="preview" className="max-h-32 rounded-lg object-contain" />
          ) : (
            <>
              <svg className="w-8 h-8 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]"><span className="text-[#1a73e8]">Click to select</span> an image (max 5 MB)</p>
            </>
          )}
          <input ref={imgFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files[0]; if (!f) return; setImgFile(f); setImgPreview(URL.createObjectURL(f)); e.target.value = ''; }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Title *</label>
            <input type="text" value={imgForm.title} onChange={e => setImgForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Portfolio Screenshot" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Category</label>
            <select value={imgForm.category} onChange={e => setImgForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
              {['Projects','Certificates','UI Work','Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Link (optional)</label>
          <input type="url" value={imgForm.link} onChange={e => setImgForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Description (optional)</label>
          <input type="text" value={imgForm.description} onChange={e => setImgForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" className={inputCls} />
        </div>
        {galleryError && <p className="text-sm text-[#d93025]">{galleryError}</p>}
        <div className="flex justify-end">
          <button disabled={imgUploading || !imgFile || !imgForm.title.trim()}
            onClick={async () => {
              if (!imgFile || !imgForm.title.trim()) return;
              setImgUploading(true); setGalleryError('');
              try {
                const fd = new FormData();
                fd.append('image', imgFile); fd.append('title', imgForm.title);
                fd.append('category', imgForm.category); fd.append('description', imgForm.description); fd.append('link', imgForm.link);
                await uploadImage(fd);
                setImgForm({ title: '', category: 'Projects', description: '', link: '' });
                setImgFile(null); setImgPreview(null);
                await loadGallery();
              } catch (err) { setGalleryError(err?.response?.data?.error || 'Upload failed.'); }
              finally { setImgUploading(false); }
            }}
            className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-normal hover:bg-[#1967d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {imgUploading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {imgUploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Existing images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">Uploaded images ({galleryImages.length})</p>
          <button onClick={loadGallery} disabled={galleryLoading} className="text-xs text-[#1a73e8] hover:underline disabled:opacity-50">Refresh</button>
        </div>
        {galleryLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="rounded-xl bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse" style={{ aspectRatio: '4/3' }} />)}</div>
        ) : galleryImages.length === 0 ? (
          <p className="text-sm text-[#9aa0a6] text-center py-8">No images yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {galleryImages.map(img => (
              <div key={img._id} className="group">
                <div className="relative rounded-xl overflow-hidden bg-[#f1f3f4] dark:bg-[#303134]">
                  <img src={img.imageData} alt={img.title} className="w-full object-cover" style={{ aspectRatio: '4/3' }} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-start justify-end gap-1.5 p-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setEditingImg({ _id: img._id, title: img.title, category: img.category, description: img.description || '', link: img.link || '' })}
                      className="p-1.5 rounded-full bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z"/></svg>
                    </button>
                    <button onClick={async () => { if (!confirm(`Delete "${img.title}"?`)) return; try { await deleteImage(img._id); setGalleryImages(prev => prev.filter(i => i._id !== img._id)); } catch { setGalleryError('Delete failed.'); } }}
                      className="p-1.5 rounded-full bg-[#d93025] text-white hover:bg-[#b31412] transition-colors" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 px-0.5">
                  <p className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] truncate">{img.title}</p>
                  <p className="text-[11px] text-[#9aa0a6]">{img.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setEditingImg(null)}>
          <div className="bg-white dark:bg-[#303134] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[#202124] dark:text-[#e8eaed]">Edit image</p>
              <button onClick={() => setEditingImg(null)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Title *</label>
                <input type="text" value={editingImg.title} onChange={e => setEditingImg(v => ({ ...v, title: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Category</label>
                <select value={editingImg.category} onChange={e => setEditingImg(v => ({ ...v, category: e.target.value }))} className={inputCls}>
                  {['Projects','Certificates','UI Work','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <div><label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Link (optional)</label>
              <input type="url" value={editingImg.link} onChange={e => setEditingImg(v => ({ ...v, link: e.target.value }))} placeholder="https://..." className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Description (optional)</label>
              <input type="text" value={editingImg.description} onChange={e => setEditingImg(v => ({ ...v, description: e.target.value }))} placeholder="Short description" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditingImg(null)} className="px-4 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg transition-colors">Cancel</button>
              <button disabled={editSaving || !editingImg.title.trim()}
                onClick={async () => {
                  setEditSaving(true);
                  try { const updated = await updateImage(editingImg._id, { title: editingImg.title, category: editingImg.category, description: editingImg.description, link: editingImg.link }); setGalleryImages(prev => prev.map(i => i._id === updated._id ? updated : i)); setEditingImg(null); }
                  catch { setGalleryError('Update failed.'); }
                  finally { setEditSaving(false); }
                }}
                className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-normal hover:bg-[#1967d2] disabled:opacity-50 transition-colors">
                {editSaving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: CONTACT
══════════════════════════════════════════════════════ */
function ContactTab({ cfg, onSaved }) {
  const [form, setForm] = useState({
    email:    cfg.contactInfo?.email    ?? LINKS.email,
    phone:    cfg.contactInfo?.phone    ?? '',
    location: cfg.contactInfo?.location ?? 'Bengaluru, India',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfig('contactInfo', form);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Contact Info" subtitle="Displayed on the Contact page." />
      <Field label="Email Address">
        <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
      </Field>
      <Field label="Phone (optional)">
        <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
      </Field>
      <Field label="Location">
        <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, Country" />
      </Field>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN COMPONENT
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'profile',   label: 'Profile' },
  { id: 'panel',     label: 'Knowledge Panel' },
  { id: 'about',     label: 'About' },
  { id: 'projects',  label: 'Projects' },
  { id: 'blog',      label: 'Blog' },
  { id: 'site',      label: 'Site' },
  { id: 'images',    label: 'Images' },
  { id: 'contact',   label: 'Contact' },
];

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [cfg, setCfg] = useState({});
  const [cfgLoading, setCfgLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    // Verify token is still valid with the server
    adminVerify()
      .then(() => { setIsAuthenticated(true); loadCfg(); })
      .catch(() => { localStorage.removeItem('adminToken'); });
  }, []);

  const loadCfg = async () => {
    setCfgLoading(true);
    try { setCfg(await fetchConfig()); } catch {}
    finally { setCfgLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError('');
    try {
      const { token } = await adminLogin(password);
      localStorage.setItem('adminToken', token);
      setIsAuthenticated(true);
      loadCfg();
    } catch (err) {
      setAuthError(err?.response?.data?.error || 'Invalid password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
  };

  // ── Login screen ──────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex flex-col">
        <SEO title="Admin" description="Admin panel" path="/admin" noIndex />
        <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
          <div className="max-w-[680px] mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-1">
              {['A','d','m','i','n'].map((c, i) => (
                <span key={i} className="text-[26px] font-normal" style={{ color: ['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853'][i] }}>{c}</span>
              ))}
            </div>
            <div className="flex-1" />
            <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">Portfolio</a>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
            <div className="bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">A</div>
                <h1 className="text-2xl font-normal text-[#202124] dark:text-[#e8eaed] mb-2">Admin Access</h1>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Sign in to access admin panel</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                    placeholder="Enter your password" required />
                </div>
                {authError && <div className="text-sm text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">{authError}</div>}
                <button type="submit" disabled={authLoading}
                  className="w-full bg-[#1a73e8] text-white py-3 rounded-lg font-normal hover:bg-[#1967d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {authLoading ? 'Signing in...' : 'Next'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">Back to Portfolio</a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Authenticated ─────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124]">
      {/* Header */}
      <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
        <div className="max-w-[780px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-1">
            {['A','d','m','i','n'].map((c, i) => (
              <span key={i} className="text-[20px] font-normal" style={{ color: ['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853'][i] }}>{c}</span>
            ))}
          </div>
          <h1 className="text-xl font-normal text-[#202124] dark:text-[#e8eaed] flex-1">Admin Panel</h1>
          <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">Portfolio</a>
          <button onClick={handleLogout} className="px-4 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-full transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar tabs */}
        <nav className="hidden sm:flex flex-col gap-0.5 w-40 shrink-0 pt-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${activeTab === t.id
                  ? 'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] font-medium'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile tab strip */}
        <div className="sm:hidden w-full mb-4">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap
                  ${activeTab === t.id ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] dark:text-[#9aa0a6] border border-[#dadce0] dark:border-[#5f6368]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-sm border border-[#dadce0] dark:border-[#5f6368] p-5">
            {cfgLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse" />)}</div>
            ) : (
              <>
                {activeTab === 'profile'  && <ProfileTab        cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'panel'    && <KnowledgePanelTab cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'about'    && <AboutTab          cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'projects' && <ProjectsTab />}
                {activeTab === 'blog'     && <BlogTab           cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'site'     && <SiteTab           cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'images'   && <ImagesTab />}
                {activeTab === 'contact'  && <ContactTab        cfg={cfg} onSaved={loadCfg} />}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
