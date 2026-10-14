import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, {
  fetchGithubRepos, saveGithubSelection,
  fetchImages, uploadImage, updateImage, deleteImage,
  fetchConfig, saveConfig, saveConfigBulk,
  adminLogin, adminVerify,
  fetchAdminFeedback, updateFeedbackStatus, deleteFeedback,
} from '../api';
import { LINKS } from '../config/links';
import { clearConfigCache } from '../hooks/useConfig';
import { getPageVisibility } from '../data/pageVisibility';
import { setVerifiedAdminToken, clearVerifiedAdminSession } from '../utils/adminAuth';
import SEO from '../components/SEO';
import Avatar from '../components/Avatar';
import { clearProjectCache } from '../utils/prefetch';
import {
  DEFAULT_TOOLS,
  VALID_LEVELS,
  isValidHexColor,
} from '../data/toolsData';
import {
  DEFAULT_CURRENT_EDUCATION,
  getEffectiveCurrentEducation,
  getEffectiveEducation,
} from '../data/aboutData';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function SaveBar({ saving, saved, onSave, error, disabled }) {
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
        disabled={saving || disabled}
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
  const currentEdu = getEffectiveCurrentEducation(cfg.profile?.education);
  const [form, setForm] = useState({
    name:       cfg.profile?.name       ?? 'Anurag Jaiswal',
    title:      cfg.profile?.title      ?? 'Engineering Student',
    statusText: cfg.profile?.statusText ?? 'Open to Work',
    statusOn:   cfg.profile?.statusOn   ?? true,
    footerDate: cfg.profile?.footerDate ?? 'March 2026',
    education: {
      institution: currentEdu.institution,
      degree:      currentEdu.degree,
      years:       currentEdu.years,
    },
  });
  const [links, setLinks] = useState({
    github:             cfg.socialLinks?.github             ?? LINKS.github,
    linkedin:           cfg.socialLinks?.linkedin           ?? LINKS.linkedin,
    twitter:            cfg.socialLinks?.twitter            ?? LINKS.twitter,
    leetcode:           cfg.socialLinks?.leetcode           ?? LINKS.leetcode,
    codechef:           cfg.socialLinks?.codechef           ?? LINKS.codechef,
    email:              cfg.socialLinks?.email              ?? LINKS.email,
    alternatePortfolio: cfg.socialLinks?.alternatePortfolio ?? '',
  });
  const [githubUsername, setGithubUsername] = useState(cfg.githubUsername ?? 'anurag-jaiswal-aj');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(cfg.avatarUrl || cfg.profilePhotoUrl || '');
  const [avatarMode, setAvatarMode] = useState('upload');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const avatarFileInputRef = useRef(null);
  const [resumeUrl, setResumeUrl] = useState(cfg.resumeUrl ?? '');
  const [resumeMode, setResumeMode] = useState('external');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg('File size must be under 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarMsg('Only image files are allowed');
      return;
    }
    setUploadingAvatar(true);
    setAvatarMsg('Uploading...');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/config/avatar-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarUrl(data.avatarUrl);
      clearConfigCache();
      setAvatarMsg('Profile photo uploaded successfully!');
      setSaved(true);
    } catch (err) {
      setAvatarMsg(err.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    setAvatarMsg('Profile photo removed.');
    try {
      await saveConfigBulk([
        { key: 'avatarUrl', value: '' },
        { key: 'profilePhotoUrl', value: '' },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove profile photo.');
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg('File size must be under 5MB');
      return;
    }
    if (file.type !== 'application/pdf') {
      setUploadMsg('Only PDF files are allowed');
      return;
    }
    setUploadingResume(true);
    setUploadMsg('Uploading...');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post('/config/resume-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResumeUrl(data.resumeUrl);
      clearConfigCache();
      setUploadMsg('Resume uploaded successfully!');
      setSaved(true);
    } catch (err) {
      setUploadMsg(err.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };
  const setEdu = (k, v) => { setForm(f => ({ ...f, education: { ...f.education, [k]: v } })); setSaved(false); };
  const setLink = (k, v) => { setLinks(l => ({ ...l, [k]: v })); setSaved(false); };

  const save = async () => {
    if (saving || uploadingResume || uploadingAvatar) return;
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfigBulk([
        { key: 'profile',         value: form },
        { key: 'socialLinks',     value: { ...links, mailto: `mailto:${links.email}` } },
        { key: 'githubUsername',   value: githubUsername },
        { key: 'resumeUrl',       value: resumeUrl },
        { key: 'avatarUrl',       value: avatarUrl },
        { key: 'profilePhotoUrl', value: avatarUrl },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch (err) { setError(err.response?.data?.error || 'Save failed. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Profile" subtitle="Your identity — shown in the Knowledge Panel and throughout the site." />

      {/* Profile Photo Section */}
      <div className="border border-[#dadce0] dark:border-[#3c4043] rounded-xl p-4 bg-[#f8f9fa] dark:bg-[#202124]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar
                url={avatarUrl}
                name={form.name || 'Anurag'}
                size="lg"
                ringClassName="ring-2 ring-[#EA4335] ring-offset-2 ring-offset-white dark:ring-offset-[#202124]"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">Profile Photo</h3>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                {avatarUrl
                  ? 'Configured photo flips to letter "A" on hover. Visible in header, search, and knowledge panel.'
                  : 'No photo configured. Showing the standard letter "A" circular avatar.'}
              </p>
            </div>
          </div>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="px-3 py-1.5 text-xs font-medium text-[#d93025] hover:bg-[#fce8e6] dark:hover:bg-[#d93025]/20 rounded-lg border border-[#f5c6cb] dark:border-[#5c1d1d] transition-colors shrink-0"
            >
              Remove Photo
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-3 border-t border-[#e8eaed] dark:border-[#3c4043] pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#202124] dark:text-[#e8eaed] cursor-pointer">
            <input
              type="radio"
              name="avatarMode"
              value="upload"
              checked={avatarMode === 'upload'}
              onChange={() => setAvatarMode('upload')}
            />
            Upload Image
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-[#202124] dark:text-[#e8eaed] cursor-pointer">
            <input
              type="radio"
              name="avatarMode"
              value="external"
              checked={avatarMode === 'external'}
              onChange={() => setAvatarMode('external')}
            />
            Image URL
          </label>
        </div>

        {avatarMode === 'upload' ? (
          <div>
            <input
              type="file"
              accept="image/*"
              ref={avatarFileInputRef}
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
              className="block w-full text-sm text-[#5f6368] dark:text-[#9aa0a6]
                         file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0
                         file:text-xs file:font-semibold file:bg-[#e8f0fe] file:text-[#1a73e8]
                         dark:file:bg-[#3c4043] dark:file:text-[#8ab4f8]
                         hover:file:bg-[#d2e3fc] dark:hover:file:bg-[#5f6368] transition-colors"
            />
            {avatarMsg && (
              <p
                className={`text-xs mt-2 ${
                  avatarMsg.includes('successfully') || avatarMsg.includes('removed')
                    ? 'text-[#137333] dark:text-[#81c995]'
                    : avatarMsg === 'Uploading...'
                    ? 'text-[#1a73e8] dark:text-[#8ab4f8]'
                    : 'text-[#d93025] dark:text-[#f28b82]'
                }`}
              >
                {avatarMsg}
              </p>
            )}
          </div>
        ) : (
          <div>
            <Field label="Direct Image URL (HTTP/HTTPS)">
              <input
                className={inputCls}
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setSaved(false);
                  setAvatarMsg('');
                }}
                placeholder="https://res.cloudinary.com/... or https://example.com/photo.jpg"
              />
            </Field>
          </div>
        )}
      </div>

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
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-3">Current Education (Canonical)</p>
        <div className="space-y-3">
          <Field label="Institution">
            <input className={inputCls} value={form.education.institution} onChange={e => setEdu('institution', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Degree">
              <input className={inputCls} value={form.education.degree} onChange={e => setEdu('degree', e.target.value)} />
            </Field>
            <Field label="Years">
              <input className={inputCls} value={form.education.years} onChange={e => setEdu('years', e.target.value)} placeholder="2023 - 2027" />
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
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-[#202124] dark:text-[#e8eaed] cursor-pointer">
            <input type="radio" name="resumeMode" value="upload" checked={resumeMode === 'upload'} onChange={() => setResumeMode('upload')} />
            Upload PDF
          </label>
          <label className="flex items-center gap-2 text-sm text-[#202124] dark:text-[#e8eaed] cursor-pointer">
            <input type="radio" name="resumeMode" value="external" checked={resumeMode === 'external'} onChange={() => setResumeMode('external')} />
            External URL
          </label>
        </div>

        {resumeMode === 'upload' ? (
          <div className="bg-[#f8f9fa] dark:bg-[#202124] p-4 rounded-xl border border-[#e8eaed] dark:border-[#3c4043]">
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleResumeUpload}
              disabled={uploadingResume}
              className="block w-full text-sm text-[#5f6368] dark:text-[#9aa0a6]
                         file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                         file:text-sm file:font-semibold file:bg-[#e8f0fe] file:text-[#1a73e8]
                         dark:file:bg-[#3c4043] dark:file:text-[#8ab4f8]
                         hover:file:bg-[#d2e3fc] dark:hover:file:bg-[#5f6368] transition-colors"
            />
            {uploadMsg && (
              <p className={`text-xs mt-3 ${uploadMsg.includes('success') ? 'text-[#137333] dark:text-[#81c995]' : uploadMsg === 'Uploading...' ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-[#d93025] dark:text-[#f28b82]'}`}>
                {uploadMsg}
              </p>
            )}
            {resumeUrl && resumeUrl.includes('cloudinary') && !uploadingResume && (
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2">
                Active Resume: <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-[#1a73e8] hover:underline">View Uploaded PDF</a>
              </p>
            )}
          </div>
        ) : (
          <div>
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
        )}
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={save} disabled={uploadingResume || uploadingAvatar} />
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
  const currentEdu = getEffectiveCurrentEducation(cfg?.profile?.education);
  const [bio, setBio]     = useState(cfg.bioParagraphs ?? DEFAULT_BIO);
  const [edu, setEdu]     = useState(() => getEffectiveEducation(cfg.education, cfg?.profile?.education));
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
      const normalizedEdu = edu.map((e, idx) => {
        if (idx === 0) {
          return {
            ...e,
            year: currentEdu.years,
            degree: currentEdu.degree,
            school: currentEdu.institution,
            detail: e.detail || currentEdu.detail,
          };
        }
        return e;
      });
      await saveConfigBulk([
        { key: 'bioParagraphs',  value: bio },
        { key: 'education',      value: normalizedEdu },
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
                <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
                  {i === 0 ? 'Entry 1 (Current College - Synchronized with Profile tab)' : `Entry ${i + 1}`}
                </span>
                {i > 0 && (
                  <button onClick={() => { setSaved(false); setEdu(prev => prev.filter((_, idx) => idx !== i)); }}
                    className="text-xs text-[#d93025] hover:underline">Remove</button>
                )}
              </div>
              {[['year','Year / Period'],['degree','Degree'],['school','School / Institution'],['detail','Detail']].map(([field, label]) => (
                <Field key={field} label={`${label}${i === 0 && field !== 'detail' ? ' (Managed in Profile tab)' : ''}`}>
                  <input
                    className={`${inputCls} ${i === 0 && field !== 'detail' ? 'opacity-70 bg-[#f1f3f4] dark:bg-[#2d2e30]' : ''}`}
                    disabled={i === 0 && field !== 'detail'}
                    value={e[field] ?? ''}
                    onChange={ev => { setSaved(false); setEdu(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: ev.target.value } : x)); }}
                  />
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
   TAB: TOOLKIT (Configurable categories and skills)
══════════════════════════════════════════════════════ */
let _toolkitIdCounter = 0;
const generateToolkitId = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${(++_toolkitIdCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function toEditableCategories(raw) {
  const list = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_TOOLS;
  return list.map((cat, ci) => ({
    id: cat.id || generateToolkitId(`cat_${ci}`),
    category: cat.category || '',
    title: cat.title || cat.category || '',
    color: isValidHexColor(cat.color) ? cat.color.trim() : '#4285F4',
    snippet: cat.snippet || '',
    items: (cat.items || []).map((s, si) => ({
      id: s.id || generateToolkitId(`skill_${ci}_${si}`),
      name: s.name || '',
      level: VALID_LEVELS.includes(s.level) ? s.level : 'Intermediate',
      desc: s.desc || '',
    })),
  }));
}

const PRESET_TOOL_COLORS = [
  '#4285F4',
  '#34A853',
  '#FBBC05',
  '#EA4335',
  '#00897B',
  '#F4511E',
  '#8E24AA',
  '#546E7A',
];

function SortableSkillItem({
  skill,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-[#9aa0a6] hover:text-[#1a73e8] transition-colors"
            title="Drag to reorder skill"
            aria-label="Drag to reorder skill"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-1 text-[#9aa0a6] hover:text-[#1a73e8] disabled:opacity-30 disabled:hover:text-[#9aa0a6]"
              title="Move up"
              aria-label="Move skill up"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveDown}
              className="p-1 text-[#9aa0a6] hover:text-[#1a73e8] disabled:opacity-30 disabled:hover:text-[#9aa0a6]"
              title="Move down"
              aria-label="Move skill down"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
            Skill {index + 1}
          </span>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#d93025]">Delete skill?</span>
            <button
              type="button"
              onClick={onDelete}
              className="px-2 py-0.5 text-xs bg-[#d93025] text-white rounded hover:bg-[#b31412] transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-0.5 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (skill.name.trim() || skill.desc.trim()) {
                setConfirmDelete(true);
              } else {
                onDelete();
              }
            }}
            className="text-xs text-[#d93025] hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
            Skill Name
          </label>
          <input
            className={inputCls}
            placeholder="e.g. JavaScript (ES2023)"
            value={skill.name}
            onChange={(e) => onUpdate({ ...skill, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
            Proficiency Level
          </label>
          <select
            className={inputCls}
            value={skill.level}
            onChange={(e) => onUpdate({ ...skill, level: e.target.value })}
          >
            {VALID_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
          Description
        </label>
        <textarea
          rows={2}
          className={textareaCls}
          placeholder="Brief description of experience and usage..."
          value={skill.desc}
          onChange={(e) => onUpdate({ ...skill, desc: e.target.value })}
        />
      </div>
    </div>
  );
}

function SortableCategoryCard({
  category,
  index,
  total,
  isExpanded,
  onToggleExpand,
  onUpdateCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  sensors,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDragEndSkill = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIdx = category.items.findIndex((s) => s.id === active.id);
      const newIdx = category.items.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(category.items, oldIdx, newIdx);
      onUpdateCategory({ ...category, items: reordered });
    }
  };

  const handleAddSkill = () => {
    const newSkill = {
      id: generateToolkitId('skill'),
      name: '',
      level: 'Intermediate',
      desc: '',
    };
    onUpdateCategory({ ...category, items: [...category.items, newSkill] });
  };

  const handleUpdateSkill = (skillIndex, updatedSkill) => {
    const nextSkills = category.items.map((s, si) => (si === skillIndex ? updatedSkill : s));
    onUpdateCategory({ ...category, items: nextSkills });
  };

  const handleDeleteSkill = (skillIndex) => {
    const nextSkills = category.items.filter((_, si) => si !== skillIndex);
    onUpdateCategory({ ...category, items: nextSkills });
  };

  const handleMoveSkill = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= category.items.length) return;
    const nextSkills = arrayMove(category.items, fromIndex, toIndex);
    onUpdateCategory({ ...category, items: nextSkills });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-[#e8eaed] dark:border-[#3c4043] rounded-xl bg-[#f8f9fa] dark:bg-[#202124] overflow-hidden"
    >
      {/* Category Header */}
      <div className="p-3 bg-white dark:bg-[#303134] flex items-center justify-between gap-3 border-b border-[#e8eaed] dark:border-[#3c4043]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#1a73e8] transition-colors shrink-0"
            title="Drag to reorder category"
            aria-label="Drag to reorder category"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveCategoryUp}
              className="p-1 text-[#9aa0a6] hover:text-[#1a73e8] disabled:opacity-30 disabled:hover:text-[#9aa0a6]"
              title="Move category up"
              aria-label="Move category up"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveCategoryDown}
              className="p-1 text-[#9aa0a6] hover:text-[#1a73e8] disabled:opacity-30 disabled:hover:text-[#9aa0a6]"
              title="Move category down"
              aria-label="Move category down"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: category.color || '#4285F4' }}
          />
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-left truncate flex-1 hover:text-[#1a73e8] transition-colors"
          >
            <span className="font-semibold text-sm text-[#202124] dark:text-[#e8eaed] truncate">
              {category.category.trim() || 'Untitled Category'}
            </span>
            {category.title && category.title !== category.category && (
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] hidden sm:inline truncate">
                ({category.title})
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] font-medium shrink-0">
              {category.items.length} {category.items.length === 1 ? 'skill' : 'skills'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#1a73e8] transition-colors"
            title={isExpanded ? 'Collapse category' : 'Expand category'}
            aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category Name">
              <input
                className={inputCls}
                placeholder="e.g. Languages"
                value={category.category}
                onChange={(e) => onUpdateCategory({ ...category, category: e.target.value })}
              />
            </Field>
            <Field label="Page Title / Heading">
              <input
                className={inputCls}
                placeholder="e.g. Languages I Code In"
                value={category.title}
                onChange={(e) => onUpdateCategory({ ...category, title: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">
              Category Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124]">
                <input
                  type="color"
                  value={isValidHexColor(category.color) ? category.color : '#4285F4'}
                  onChange={(e) => onUpdateCategory({ ...category, color: e.target.value })}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                  aria-label="Color picker"
                />
                <input
                  className="w-20 text-xs px-1.5 py-1 font-mono uppercase bg-transparent text-[#202124] dark:text-[#e8eaed] focus:outline-none"
                  value={category.color}
                  onChange={(e) => onUpdateCategory({ ...category, color: e.target.value })}
                  placeholder="#4285F4"
                  maxLength={7}
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_TOOL_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdateCategory({ ...category, color: preset })}
                    style={{ backgroundColor: preset }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      category.color.toLowerCase() === preset.toLowerCase()
                        ? 'border-[#202124] dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={preset}
                    aria-label={`Select color ${preset}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <Field label="Summary Snippet (Search result text)">
            <textarea
              rows={3}
              className={textareaCls}
              placeholder="Descriptive overview of this category..."
              value={category.snippet}
              onChange={(e) => onUpdateCategory({ ...category, snippet: e.target.value })}
            />
          </Field>

          {/* Skills Section */}
          <div className="pt-2 border-t border-[#dadce0] dark:border-[#3c4043] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#202124] dark:text-[#e8eaed] uppercase tracking-wide">
                Skills in this category ({category.items.length})
              </span>
              <button
                type="button"
                onClick={handleAddSkill}
                className="flex items-center gap-1 text-xs text-[#1a73e8] font-medium hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Skill
              </button>
            </div>

            {category.items.length === 0 ? (
              <p className="text-xs text-[#9aa0a6] italic p-3 text-center border border-dashed border-[#dadce0] dark:border-[#5f6368] rounded-lg">
                No skills added to this category yet. Click Add Skill above.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSkill}>
                <SortableContext items={category.items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {category.items.map((skill, si) => (
                      <SortableSkillItem
                        key={skill.id}
                        skill={skill}
                        index={si}
                        total={category.items.length}
                        onUpdate={(updated) => handleUpdateSkill(si, updated)}
                        onDelete={() => handleDeleteSkill(si)}
                        onMoveUp={() => handleMoveSkill(si, si - 1)}
                        onMoveDown={() => handleMoveSkill(si, si + 1)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Delete Category Confirmation */}
          <div className="pt-3 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#d93025] font-medium">
                  Delete "{category.category || 'Untitled'}" and all its skills?
                </span>
                <button
                  type="button"
                  onClick={onDeleteCategory}
                  className="px-2.5 py-1 text-xs bg-[#d93025] text-white rounded hover:bg-[#b31412] transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-[#d93025] hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Category
              </button>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
            >
              Done Editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolkitTab({ cfg, onSaved }) {
  const [categories, setCategories] = useState(() => toEditableCategories(cfg?.tools));
  const [expandedCatId, setExpandedCatId] = useState(() => categories[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndCategory = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        setSaved(false);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddCategory = () => {
    const newId = generateToolkitId('cat');
    const newCategory = {
      id: newId,
      category: 'New Category',
      title: 'New Category Title',
      color: '#4285F4',
      snippet: 'Overview description of this skill category.',
      items: [
        {
          id: generateToolkitId('skill'),
          name: '',
          level: 'Intermediate',
          desc: '',
        },
      ],
    };
    setSaved(false);
    setCategories((prev) => [...prev, newCategory]);
    setExpandedCatId(newId);
  };

  const handleUpdateCategory = (catIndex, updatedCat) => {
    setSaved(false);
    setError('');
    setCategories((prev) => prev.map((c, i) => (i === catIndex ? updatedCat : c)));
  };

  const handleDeleteCategory = (catIndex) => {
    setSaved(false);
    setError('');
    setCategories((prev) => prev.filter((_, i) => i !== catIndex));
  };

  const handleMoveCategory = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= categories.length) return;
    setSaved(false);
    setCategories((prev) => arrayMove(prev, fromIndex, toIndex));
  };

  const handleResetToDefaults = () => {
    const freshDefaults = toEditableCategories(DEFAULT_TOOLS);
    setCategories(freshDefaults);
    setExpandedCatId(freshDefaults[0]?.id || null);
    setConfirmReset(false);
    setSaved(false);
    setError('');
  };

  const save = async () => {
    if (saving) return;
    setError('');

    // Validation
    if (categories.length === 0) {
      setError('Toolkit must contain at least one category.');
      return;
    }

    const seenCategories = new Set();
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci];
      const catName = cat.category.trim();
      if (!catName) {
        setError(`Category at position ${ci + 1} requires a category name.`);
        return;
      }
      const normalizedCat = catName.toLowerCase();
      if (seenCategories.has(normalizedCat)) {
        setError(`Duplicate category name "${catName}". Category names must be unique.`);
        return;
      }
      seenCategories.add(normalizedCat);
      if (!cat.title.trim()) {
        setError(`Category "${catName}" requires a title.`);
        return;
      }
      if (!isValidHexColor(cat.color)) {
        setError(`Category "${catName}" requires a valid 6-digit hex color (e.g. #4285F4).`);
        return;
      }
      if (!cat.snippet.trim()) {
        setError(`Category "${catName}" requires a snippet.`);
        return;
      }
      if (!Array.isArray(cat.items) || cat.items.length === 0) {
        setError(`Category "${catName}" must contain at least one skill.`);
        return;
      }
      for (let si = 0; si < cat.items.length; si++) {
        const skill = cat.items[si];
        if (!skill.name.trim()) {
          setError(`Skill at position ${si + 1} in "${catName}" requires a name.`);
          return;
        }
        if (!VALID_LEVELS.includes(skill.level)) {
          setError(`Skill "${skill.name}" in "${catName}" has an invalid level.`);
          return;
        }
        if (!skill.desc.trim()) {
          setError(`Skill "${skill.name}" in "${catName}" requires a description.`);
          return;
        }
      }
    }

    // Normalized payload
    const payload = categories.map((cat) => ({
      category: cat.category.trim(),
      title: cat.title.trim(),
      color: cat.color.trim(),
      snippet: cat.snippet.trim(),
      items: cat.items.map((s) => ({
        name: s.name.trim(),
        level: s.level,
        desc: s.desc.trim(),
      })),
    }));

    setSaving(true);
    setSaved(false);

    try {
      await saveConfig('tools', payload);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      setError(serverMsg || 'Failed to save Toolkit configuration.');
    } finally {
      setSaving(false);
    }
  };

  const totalSkillsCount = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <SectionHeader
            title="Toolkit Page"
            subtitle="Manage skill categories, proficiency levels, descriptions, and colors shown on /tools and /all."
          />
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] -mt-2">
            Currently configured: {categories.length} categories, {totalSkillsCount} total skills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {confirmReset ? (
            <div className="flex items-center gap-1.5 p-1 border border-[#d93025] rounded-lg bg-[#fce8e6] dark:bg-[#3a1d1d]">
              <span className="text-xs text-[#d93025] font-medium px-1">Reset to defaults?</span>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-2 py-0.5 text-xs bg-[#d93025] text-white rounded font-medium hover:bg-[#b31412]"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-0.5 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3 py-1.5 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-lg text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
            >
              Reset to Defaults
            </button>
          )}

          <button
            type="button"
            onClick={handleAddCategory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a73e8] text-white rounded-lg font-medium hover:bg-[#1967d2] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Sortable Categories List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategory}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {categories.map((cat, ci) => (
              <SortableCategoryCard
                key={cat.id}
                category={cat}
                index={ci}
                total={categories.length}
                isExpanded={expandedCatId === cat.id}
                onToggleExpand={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)}
                onUpdateCategory={(updated) => handleUpdateCategory(ci, updated)}
                onDeleteCategory={() => handleDeleteCategory(ci)}
                onMoveCategoryUp={() => handleMoveCategory(ci, ci - 1)}
                onMoveCategoryDown={() => handleMoveCategory(ci, ci + 1)}
                sensors={sensors}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <SaveBar
        saving={saving}
        saved={saved}
        error={error}
        onSave={save}
        disabled={saving}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB: PROJECTS (GitHub picker — existing logic)
══════════════════════════════════════════════════════ */
function SortableRepoItem({ repo, entry, selIdx, onToggle, onToggleFeatured, onUpdateTags }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: repo.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isFeatured = entry?.featured ?? false;

  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors mb-2 border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1a2744] dark:border-[#4285F4]`}>
      <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-[#1a73e8] hover:text-[#1967d2] transition-colors" title="Drag to reorder" aria-label="Drag to reorder">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16"/></svg>
      </button>
      <input type="checkbox" checked={true} onChange={onToggle} className="mt-1.5 shrink-0 accent-[#1a73e8]" aria-label={`Deselect ${repo.name}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] truncate">{repo.name}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1a73e8] text-white shrink-0">#{selIdx + 1}</span>
          {repo.language && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] shrink-0">{repo.language}</span>}
          {repo.stars > 0 && (
            <span className="text-[11px] text-[#9aa0a6] flex items-center gap-0.5 shrink-0">
              <svg className="w-3 h-3 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {repo.stars}
            </span>
          )}
        </div>
        {repo.description && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 truncate">{repo.description}</p>}
        <ExtraTagsEditor tags={entry?.extraTags ?? []} onChange={onUpdateTags} />
      </div>
      <button title={isFeatured ? 'Remove featured' : 'Mark as featured'}
        onClick={onToggleFeatured}
        className="shrink-0 p-1 rounded-full hover:bg-white/60 dark:hover:bg-black/20 transition-colors">
        <svg className={`w-4 h-4 ${isFeatured ? 'text-[#FBBC05]' : 'text-[#dadce0] dark:text-[#5f6368]'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
  );
}

function ProjectsTab() {
  const [allRepos, setAllRepos]       = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [reposLoading, setReposLoading]   = useState(false);
  const [reposError, setReposError]       = useState('');
  const [reposSaving, setReposSaving]     = useState(false);
  const [reposSaved, setReposSaved]       = useState(false);
  const [repoSearch, setRepoSearch]       = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedRepos((items) => {
        const oldIndex = items.findIndex(i => i.name === active.id);
        const newIndex = items.findIndex(i => i.name === over.id);
        setReposSaved(false);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const selectedRepoNames = selectedRepos.map(s => s.name);
  const unselectedRepos = allRepos.filter(r => !selectedRepoNames.includes(r.name) &&
    (!repoSearch || r.name.toLowerCase().includes(repoSearch.toLowerCase()) || (r.description || '').toLowerCase().includes(repoSearch.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="GitHub Repos" subtitle="Select and reorder repos to appear on the Projects page. Drag to change order." />
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
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {/* Selected Repositories - Sortable */}
          {selectedRepos.length > 0 && (
            <div className="space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedRepoNames} strategy={verticalListSortingStrategy}>
                  {selectedRepos.map((entry, selIdx) => {
                    const repo = allRepos.find(r => r.name === entry.name);
                    if (!repo) return null;
                    return (
                      <SortableRepoItem
                        key={repo.name}
                        repo={repo}
                        entry={entry}
                        selIdx={selIdx}
                        onToggle={() => { setReposSaved(false); setSelectedRepos(prev => prev.filter(s => s.name !== repo.name)); }}
                        onToggleFeatured={() => { setReposSaved(false); setSelectedRepos(prev => prev.map(s => s.name === repo.name ? { ...s, featured: !s.featured } : s)); }}
                        onUpdateTags={(tags) => { setReposSaved(false); setSelectedRepos(prev => prev.map(s => s.name === repo.name ? { ...s, extraTags: tags } : s)); }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Unselected Repositories - Normal List */}
          {unselectedRepos.length > 0 && (
            <div>
              {selectedRepos.length > 0 && <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wide mb-2 mt-4">Other Repositories</p>}
              <div className="space-y-2">
                {unselectedRepos.map(repo => (
                  <div key={repo.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#e8eaed] dark:border-[#3c4043] hover:bg-[#f8f9fa] dark:hover:bg-[#2d2e30] transition-colors">
                    <input type="checkbox" checked={false}
                      onChange={() => { setReposSaved(false); setSelectedRepos(prev => [...prev, { name: repo.name, featured: false, extraTags: [] }]); }}
                      className="mt-1 shrink-0 accent-[#1a73e8]" aria-label={`Select ${repo.name}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] truncate">{repo.name}</span>
                        {repo.language && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] shrink-0">{repo.language}</span>}
                        {repo.stars > 0 && (
                          <span className="text-[11px] text-[#9aa0a6] flex items-center gap-0.5 shrink-0">
                            <svg className="w-3 h-3 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            {repo.stars}
                          </span>
                        )}
                      </div>
                      {repo.description && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 truncate">{repo.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              try {
                await saveGithubSelection(selectedRepos);
                clearProjectCache();
                setReposSaved(true);
              }
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
  const initialVisibility = getPageVisibility(cfg);
  const [imagesEnabled, setImagesEnabled] = useState(initialVisibility.images);
  const [blogEnabled,   setBlogEnabled]   = useState(initialVisibility.blog);
  const [toolsEnabled,  setToolsEnabled]  = useState(initialVisibility.tools);
  const [defaultTheme,  setDefaultTheme]  = useState(cfg.defaultTheme ?? 'system');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveConfigBulk([
        {
          key: 'pageVisibility',
          value: {
            blog: blogEnabled,
            tools: toolsEnabled,
            images: imagesEnabled,
          },
        },
        { key: 'defaultTheme', value: defaultTheme },
      ]);
      clearConfigCache();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
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
            <Toggle value={imagesEnabled} onChange={v => { setImagesEnabled(v); setSaved(false); }} />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#f1f3f4] dark:border-[#3c4043]">
            <div>
              <p className="text-sm text-[#202124] dark:text-[#e8eaed]">Blog tab</p>
              <p className="text-xs text-[#9aa0a6]">Show or hide the Blog page in navigation</p>
            </div>
            <Toggle value={blogEnabled} onChange={v => { setBlogEnabled(v); setSaved(false); }} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[#202124] dark:text-[#e8eaed]">Toolkit tab</p>
              <p className="text-xs text-[#9aa0a6]">Show or hide the Toolkit page in navigation</p>
            </div>
            <Toggle value={toolsEnabled} onChange={v => { setToolsEnabled(v); setSaved(false); }} />
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
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]"><span className="text-[#1a73e8]">Click to select</span> an image (max 10 MB)</p>
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
    email:    cfg.contactInfo?.email    ?? cfg.socialLinks?.email ?? LINKS.email,
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
   FEEDBACK INBOX HELPERS & COMPONENTS
══════════════════════════════════════════════════════ */
const FEEDBACK_TYPES = {
  bug:        { label: 'Bug',            color: '#EA4335', bg: '#fce8e6', textDark: '#f28b82' },
  feature:    { label: 'Feature',        color: '#4285F4', bg: '#e8f0fe', textDark: '#8ab4f8' },
  suggestion: { label: 'Suggestion',     color: '#34A853', bg: '#e6f4ea', textDark: '#81c995' },
  typo:       { label: 'Typo / Content', color: '#FBBC05', bg: '#fef7e0', textDark: '#fdd663' },
  compliment: { label: 'Compliment',     color: '#34A853', bg: '#e6f4ea', textDark: '#81c995' },
  other:      { label: 'Other',          color: '#9aa0a6', bg: '#f1f3f4', textDark: '#bdc1c6' },
};

const FEEDBACK_STATUSES = {
  new: {
    id: 'new',
    label: 'New',
    badgeCls: 'bg-[#e8f0fe] text-[#1a73e8] border-[#c5d7f7] dark:bg-[#1a2744] dark:text-[#8ab4f8] dark:border-[#2a4080]',
  },
  'in-progress': {
    id: 'in-progress',
    label: 'In Progress',
    badgeCls: 'bg-[#fef7e0] text-[#b06000] border-[#fce8b2] dark:bg-[#3d3214] dark:text-[#fdd663] dark:border-[#604e18]',
  },
  resolved: {
    id: 'resolved',
    label: 'Resolved',
    badgeCls: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] dark:bg-[#133320] dark:text-[#81c995] dark:border-[#1e5233]',
  },
};

function formatFeedbackFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFeedbackDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function isSafeAttachmentUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatFeedbackPage(page) {
  if (!page || typeof page !== 'string') return '/';
  const trimmed = page.trim();
  if (!trimmed) return '/';
  const normalized = trimmed
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
  return normalized || '/';
}

function FeedbackDetailModal({ item, onClose, onStatusChange, updating, onDelete, deleting }) {
  if (!item) return null;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const typeConfig = FEEDBACK_TYPES[item.type] || FEEDBACK_TYPES.other;
  const statusConfig = FEEDBACK_STATUSES[item.status] || FEEDBACK_STATUSES.new;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !deleting) onClose();
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleteError('');
    try {
      await onDelete(item._id);
    } catch (err) {
      setDeleteError(err?.response?.data?.error || err.message || 'Failed to delete feedback');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white dark:bg-[#303134] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#5f6368] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Top Google Bar */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-[#e8eaed] dark:border-[#3c4043] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: typeConfig.bg,
                  color: typeConfig.color,
                  borderColor: `${typeConfig.color}40`,
                }}
              >
                {typeConfig.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.badgeCls}`}>
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#202124] dark:text-[#e8eaed]">
              Feedback Submission Details
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
              Submitted on {formatFeedbackDate(item.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Switcher Bar */}
          <div className="bg-[#f8f9fa] dark:bg-[#202124] p-3.5 rounded-xl border border-[#dadce0] dark:border-[#5f6368] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
              Update Status:
            </span>
            <div className="flex items-center gap-1.5">
              {['new', 'in-progress', 'resolved'].map((stKey) => {
                const st = FEEDBACK_STATUSES[stKey];
                const isActive = item.status === stKey;
                return (
                  <button
                    key={stKey}
                    disabled={updating || deleting}
                    onClick={() => onStatusChange(item._id, stKey)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border
                      ${isActive
                        ? `${st.badgeCls} shadow-sm ring-1 ring-current`
                        : 'border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-white dark:hover:bg-[#303134]'}`}
                  >
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sender & Context Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043]">
              <span className="block font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Sender</span>
              <p className="font-semibold text-[#202124] dark:text-[#e8eaed]">
                {item.name || <span className="italic text-[#9aa0a6] font-normal">Anonymous</span>}
              </p>
              {item.email ? (
                <a
                  href={`mailto:${item.email}`}
                  className="text-[#1a73e8] dark:text-[#8ab4f8] hover:underline break-all mt-0.5 block"
                >
                  {item.email}
                </a>
              ) : (
                <span className="italic text-[#9aa0a6] text-[11px]">No email provided</span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043]">
              <span className="block font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Page Context</span>
              <code className="px-2 py-1 rounded bg-white dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed] font-mono text-[11px] border border-[#e8eaed] dark:border-[#5f6368] block w-fit max-w-full truncate">
                {formatFeedbackPage(item.page)}
              </code>
            </div>
          </div>

          {/* Message Box */}
          <div>
            <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1.5">
              Message Content
            </label>
            <div className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#202124] dark:text-[#e8eaed] whitespace-pre-wrap leading-relaxed select-text">
              {item.message}
            </div>
          </div>

          {/* Attachment Info (when available) */}
          {item.attachment && (item.attachment.filename || item.attachment.url) && (
            <div>
              <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1.5">
                Attachment
              </label>
              <div className="p-3.5 rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#202124] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] truncate">
                      {item.attachment.filename || 'Attached file'}
                    </p>
                    <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                      {item.attachment.size ? formatFeedbackFileSize(item.attachment.size) : ''}
                      {item.attachment.contentType ? ` • ${item.attachment.contentType}` : ''}
                    </p>
                  </div>
                </div>

                {isSafeAttachmentUrl(item.attachment.url) ? (
                  <a
                    href={item.attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1967d2] text-white text-xs font-normal transition-colors shrink-0"
                  >
                    <span>View / Download</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] italic">
                    Delivered via notification email
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#f8f9fa] dark:bg-[#202124] border-t border-[#e8eaed] dark:border-[#3c4043] flex items-center justify-between gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={updating || deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d93025] dark:text-[#f28b82] hover:bg-[#fce8e6] dark:hover:bg-[#3c1e1e] border border-transparent hover:border-[#f5c2be] dark:hover:border-[#602525] transition-colors disabled:opacity-40"
            title="Delete this submission permanently"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Feedback</span>
          </button>

          <button
            onClick={onClose}
            disabled={deleting}
            className="px-5 py-2 rounded-lg bg-[#dadce0] dark:bg-[#5f6368] hover:bg-[#bdc1c6] dark:hover:bg-[#4a4d51] text-[#202124] dark:text-[#e8eaed] text-xs font-medium transition-colors disabled:opacity-40"
          >
            Close
          </button>
        </div>

        {/* Confirmation Overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#303134]/95 backdrop-blur-sm z-20 flex flex-col justify-center items-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fce8e6] dark:bg-[#3c1e1e] text-[#d93025] dark:text-[#f28b82] flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-[#202124] dark:text-[#e8eaed] mb-1">
              Delete Feedback Permanently?
            </h4>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-md mb-3">
              This action is permanent and cannot be undone. The feedback record and its associated data will be deleted from the database.
            </p>

            {/* Identifying record detail */}
            <div className="w-full max-w-md p-3 mb-4 rounded-lg bg-[#f8f9fa] dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] text-left text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                <span className="font-medium text-[#202124] dark:text-[#e8eaed]">
                  {item.name || 'Anonymous'}{item.email ? ` (${item.email})` : ''}
                </span>
                <span>{formatFeedbackDate(item.createdAt)}</span>
              </div>
              <p className="text-xs text-[#202124] dark:text-[#e8eaed] line-clamp-2 italic">
                "{item.message}"
              </p>
              {item.attachment && (item.attachment.filename || item.attachment.url) && (
                <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                  Attachment: {item.attachment.filename || 'Attached file'}
                </p>
              )}
            </div>

            {deleteError && (
              <div className="w-full max-w-md p-2.5 mb-3 rounded-lg bg-[#fce8e6] dark:bg-[#3c1e1e] border border-[#f5c2be] dark:border-[#602525] text-xs text-[#d93025] dark:text-[#f28b82]">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[#dadce0] dark:border-[#5f6368] text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[#d93025] hover:bg-[#b3261e] text-white text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function FeedbackInboxTab({ onCountsUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ all: 0, new: 0, 'in-progress': 0, resolved: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [inboxNotice, setInboxNotice] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        status: statusFilter,
        type: typeFilter,
      };
      if (debouncedSearch) params.search = debouncedSearch;

      const data = await fetchAdminFeedback(params);
      setItems(data.feedback || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.counts) {
        setCounts(data.counts);
        onCountsUpdate?.(data.counts);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load feedback inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await updateFeedbackStatus(id, newStatus);
      const updated = res.feedback;
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: updated.status } : item))
      );
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem((prev) => ({ ...prev, status: updated.status }));
      }
      // Refresh count breakdown
      const countData = await fetchAdminFeedback({ limit: 1 });
      if (countData.counts) {
        setCounts(countData.counts);
        onCountsUpdate?.(countData.counts);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await deleteFeedback(id);
      setItems((prev) => prev.filter((it) => it._id !== id));
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem(null);
      }

      if (res?.attachmentCleanup?.warning) {
        setInboxNotice({
          type: 'warning',
          message: `Feedback deleted. Warning: ${res.attachmentCleanup.warning}`,
        });
      } else {
        setInboxNotice({
          type: 'success',
          message: 'Feedback submission deleted permanently.',
        });
      }

      // Refresh count breakdown
      const countData = await fetchAdminFeedback({ limit: 1 }).catch(() => null);
      if (countData?.counts) {
        setCounts(countData.counts);
        onCountsUpdate?.(countData.counts);
      }

      // If this was the last item on a page > 1, go back one page
      if (items.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        loadFeedback();
      }

      return res;
    } catch (err) {
      throw err;
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Feedback Inbox"
          subtitle="Review bug reports, feature suggestions, and visitor feedback submitted from the portfolio."
        />
        <button
          onClick={loadFeedback}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg border border-[#dadce0] dark:border-[#5f6368] transition-colors"
          title="Refresh Inbox"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Notice Banner */}
      {inboxNotice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 border ${
            inboxNotice.type === 'warning'
              ? 'bg-[#fef7e0] dark:bg-[#3d3214] text-[#b06000] dark:text-[#fdd663] border-[#fce8b2] dark:border-[#604e18]'
              : 'bg-[#e6f4ea] dark:bg-[#133320] text-[#137333] dark:text-[#81c995] border-[#ceead6] dark:border-[#1e5233]'
          }`}
        >
          <span>{inboxNotice.message}</span>
          <button
            onClick={() => setInboxNotice(null)}
            className="text-xs font-semibold hover:opacity-80 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all',         label: 'All Submissions', count: counts.all },
          { id: 'new',         label: 'New',             count: counts.new,         highlight: counts.new > 0 },
          { id: 'in-progress', label: 'In Progress',     count: counts['in-progress'] },
          { id: 'resolved',    label: 'Resolved',        count: counts.resolved },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => { setStatusFilter(st.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 border
              ${statusFilter === st.id
                ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-sm'
                : 'bg-white dark:bg-[#202124] text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f8f9fa] dark:hover:bg-[#2a2b2e]'}`}
          >
            <span>{st.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold
                ${statusFilter === st.id
                  ? 'bg-white/20 text-white'
                  : st.highlight
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-[#f1f3f4] dark:bg-[#303134] text-[#5f6368] dark:text-[#9aa0a6]'}`}
            >
              {st.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Category Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by message, sender name, email, or page..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          />
          <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[#9aa0a6] hover:text-[#5f6368] dark:hover:text-[#e8eaed]"
            >
              ✕
            </button>
          )}
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="suggestion">Suggestion</option>
            <option value="typo">Typo / Content</option>
            <option value="compliment">Compliment</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-lg bg-[#fce8e6] dark:bg-[#3c1e1e] border border-[#f5c2be] dark:border-[#602525] text-xs text-[#d93025] dark:text-[#f28b82] flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={loadFeedback} className="font-semibold underline ml-2">Retry</button>
        </div>
      )}

      {/* Submissions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dadce0] dark:border-[#5f6368] bg-[#f8f9fa] dark:bg-[#202124]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e8f0fe] dark:bg-[#1a2744] flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed] mb-1">
            No feedback submissions found
          </h3>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search criteria or clearing your filters.'
              : 'Your inbox is clear! Submissions will appear here when users submit feedback.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setPage(1); }}
              className="mt-3 text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const typeConfig = FEEDBACK_TYPES[item.type] || FEEDBACK_TYPES.other;
            const statusConfig = FEEDBACK_STATUSES[item.status] || FEEDBACK_STATUSES.new;
            const isUpdating = updatingId === item._id;

            return (
              <div
                key={item._id}
                className="p-4 rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] hover:border-[#1a73e8]/50 dark:hover:border-[#8ab4f8]/50 transition-all shadow-sm space-y-3"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                      style={{
                        backgroundColor: typeConfig.bg,
                        color: typeConfig.color,
                        borderColor: `${typeConfig.color}40`,
                      }}
                    >
                      {typeConfig.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusConfig.badgeCls}`}>
                      {statusConfig.label}
                    </span>
                    {item.status === 'new' && (
                      <span className="w-2 h-2 rounded-full bg-[#1a73e8]" title="Unresolved" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                    {formatFeedbackDate(item.createdAt)}
                  </span>
                </div>

                {/* Message snippet */}
                <p className="text-sm text-[#202124] dark:text-[#e8eaed] line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                {/* Metadata & Actions row */}
                <div className="pt-2 border-t border-[#f1f3f4] dark:border-[#3c4043] flex items-center justify-between gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-3 text-[#5f6368] dark:text-[#9aa0a6] flex-wrap">
                    <span className="font-medium text-[#202124] dark:text-[#e8eaed]">
                      {item.name || 'Anonymous'}
                    </span>
                    {item.email && (
                      <span className="text-[11px] truncate max-w-[160px]" title={item.email}>
                        {item.email}
                      </span>
                    )}
                    {item.page && (
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1f3f4] dark:bg-[#303134] text-[#5f6368] dark:text-[#9aa0a6] font-mono">
                        {formatFeedbackPage(item.page)}
                      </code>
                    )}
                    {item.attachment && (item.attachment.filename || item.attachment.url) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#1a73e8] dark:text-[#8ab4f8]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {item.attachment.filename || 'Attachment'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      className="px-2 py-1 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                    >
                      <option value="new">New</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1 rounded-md bg-[#e8f0fe] dark:bg-[#1a2744] hover:bg-[#d2e3fc] dark:hover:bg-[#24355a] text-[#1a73e8] dark:text-[#8ab4f8] text-xs font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-3 border-t border-[#e8eaed] dark:border-[#3c4043] flex items-center justify-between gap-3 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} submissions
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2 text-xs font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <FeedbackDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onStatusChange={handleStatusChange}
            updating={updatingId === selectedItem._id}
            onDelete={handleDelete}
            deleting={deletingId === selectedItem._id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN COMPONENT
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'profile',   label: 'Profile' },
  { id: 'inbox',     label: 'Feedback Inbox' },
  { id: 'panel',     label: 'Knowledge Panel' },
  { id: 'about',     label: 'About' },
  { id: 'toolkit',   label: 'Toolkit' },
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
  const [inboxCounts, setInboxCounts] = useState({ all: 0, new: 0, 'in-progress': 0, resolved: 0 });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    // Verify token is still valid with the server
    adminVerify()
      .then(() => {
        setVerifiedAdminToken(token);
        setIsAuthenticated(true);
        loadCfg();
        fetchAdminFeedback({ limit: 1 }).then(d => { if (d.counts) setInboxCounts(d.counts); }).catch(() => {});
      })
      .catch(() => {
        localStorage.removeItem('adminToken');
        clearVerifiedAdminSession();
      });
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
      setVerifiedAdminToken(token);
      setIsAuthenticated(true);
      loadCfg();
      fetchAdminFeedback({ limit: 1 }).then(d => { if (d.counts) setInboxCounts(d.counts); }).catch(() => {});
    } catch (err) {
      setAuthError(err?.response?.data?.error || 'Invalid password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    clearVerifiedAdminSession();
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

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar tabs */}
        <nav className="hidden sm:flex flex-col gap-0.5 w-44 shrink-0 pt-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                ${activeTab === t.id
                  ? 'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] font-medium'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'}`}>
              <span>{t.label}</span>
              {t.id === 'inbox' && inboxCounts?.new > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#1a73e8] text-white">
                  {inboxCounts.new}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Mobile tab strip */}
        <div className="sm:hidden w-full mb-4">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5
                  ${activeTab === t.id ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] dark:text-[#9aa0a6] border border-[#dadce0] dark:border-[#5f6368]'}`}>
                <span>{t.label}</span>
                {t.id === 'inbox' && inboxCounts?.new > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === t.id ? 'bg-white text-[#1a73e8]' : 'bg-[#1a73e8] text-white'}`}>
                    {inboxCounts.new}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-sm border border-[#dadce0] dark:border-[#5f6368] p-5">
            {activeTab === 'inbox' ? (
              <FeedbackInboxTab onCountsUpdate={setInboxCounts} />
            ) : cfgLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse" />)}</div>
            ) : (
              <>
                {activeTab === 'profile'  && <ProfileTab        cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'panel'    && <KnowledgePanelTab cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'about'    && <AboutTab          cfg={cfg} onSaved={loadCfg} />}
                {activeTab === 'toolkit'  && <ToolkitTab        cfg={cfg} onSaved={loadCfg} />}
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
