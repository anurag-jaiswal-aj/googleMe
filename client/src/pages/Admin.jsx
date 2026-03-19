import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api, { fetchGithubRepos, saveGithubSelection, fetchImages, uploadImage, updateImage, deleteImage } from '../api';
import { LINKS } from '../config/links';

/* ── Extra Tags Editor ─────────────────────────────── */
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
            <span key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]
                         bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]
                         border border-[#c5d7f7] dark:border-[#2a4080]">
              {tag}
              <button type="button" onClick={() => remove(tag)}
                className="text-[#1a73e8] hover:text-[#c5221f] leading-none ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add tag…"
          className="flex-1 px-2 py-1 text-xs border border-[#dadce0] dark:border-[#5f6368] rounded-lg
                     bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed]
                     focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors"
        />
        <button type="button" onClick={add}
          className="px-2 py-1 text-xs rounded-lg bg-[#1a73e8] text-white hover:bg-[#1967d2] transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Content states
  const [aboutContent, setAboutContent] = useState('');
  // GitHub repo picker
  const [allRepos, setAllRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState('');
  const [reposSaving, setReposSaving] = useState(false);
  const [reposSaved, setReposSaved] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [contactInfo, setContactInfo] = useState({
    email: LINKS.email,
    phone: '+91 XXXXX XXXXX',
    address: 'Bengaluru, India'
  });
  const [activeTab, setActiveTab] = useState('about');

  // Images gallery
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgForm, setImgForm] = useState({ title: '', category: 'Projects', description: '', link: '' });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const imgFileRef = useRef(null);
  const [editingImg, setEditingImg] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [imagesPageEnabled, setImagesPageEnabled] = useState(
    () => localStorage.getItem('imagesPageEnabled') !== 'false'
  );

  const toggleImagesPage = (val) => {
    setImagesPageEnabled(val);
    localStorage.setItem('imagesPageEnabled', val ? 'true' : 'false');
    // Dispatch so SearchLayout reacts without a page reload
    window.dispatchEvent(new Event('imagesPageToggled'));
  };

  // Check authentication on mount
  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
      loadContent();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'images') loadGallery();
  }, [isAuthenticated, activeTab]);

  const loadContent = async () => {
    try {
      setReposLoading(true);
      setReposError('');
      const { repos, selected } = await fetchGithubRepos();
      setAllRepos(repos);
      setSelectedRepos(
        selected.map((s) => (typeof s === 'string' ? { name: s, featured: false, extraTags: [] } : { extraTags: [], ...s }))
      );
    } catch (err) {
      setReposError('Could not load GitHub repos. Check GITHUB_USERNAME env var or network.');
    } finally {
      setReposLoading(false);
    }
  };

  const loadGallery = async () => {
    setGalleryLoading(true);
    setGalleryError('');
    try {
      const data = await fetchImages();
      setGalleryImages(data);
    } catch {
      setGalleryError('Could not load images.');
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple password authentication (in production, use proper JWT)
    if (password === 'admin123') { // Change this to a secure password
      localStorage.setItem('adminAuth', 'authenticated');
      setIsAuthenticated(true);
      loadContent();
    } else {
      setError('Invalid password');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setPassword('');
  };

  const saveAbout = async () => {
    try {
      // await api.post('/admin/about', { content: aboutContent });
      alert('About content saved successfully!');
    } catch (err) {
      alert('Failed to save about content');
    }
  };

  const saveContact = async () => {
    try {
      // await api.post('/admin/contact', contactInfo });
      alert('Contact info saved successfully!');
    } catch (err) {
      alert('Failed to save contact info');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex flex-col">
        {/* Google-style header */}
        <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
          <div className="max-w-[680px] mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Google-style logo */}
              <div className="flex items-center gap-1">
                <span className="text-[26px] font-normal" style={{ color: '#4285F4' }}>A</span>
                <span className="text-[26px] font-normal" style={{ color: '#EA4335' }}>d</span>
                <span className="text-[26px] font-normal" style={{ color: '#FBBC05' }}>m</span>
                <span className="text-[26px] font-normal" style={{ color: '#4285F4' }}>i</span>
                <span className="text-[26px] font-normal" style={{ color: '#34A853' }}>n</span>
              </div>
              <div className="flex-1" />
              <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                Portfolio
              </a>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  A
                </div>
                <h1 className="text-2xl font-normal text-[#202124] dark:text-[#e8eaed] mb-2">Admin Access</h1>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Sign in to access admin panel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a73e8] text-white py-3 rounded-lg font-normal hover:bg-[#1967d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Signing in...' : 'Next'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                  ← Back to Portfolio
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124]">
      {/* Google-style Header */}
      <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
        <div className="max-w-[680px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Google-style logo */}
            <div className="flex items-center gap-1">
              <span className="text-[20px] font-normal" style={{ color: '#4285F4' }}>A</span>
              <span className="text-[20px] font-normal" style={{ color: '#EA4335' }}>d</span>
              <span className="text-[20px] font-normal" style={{ color: '#FBBC05' }}>m</span>
              <span className="text-[20px] font-normal" style={{ color: '#4285F4' }}>i</span>
              <span className="text-[20px] font-normal" style={{ color: '#34A853' }}>n</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-normal text-[#202124] dark:text-[#e8eaed]">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                Portfolio
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-full transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-sm border border-[#dadce0] dark:border-[#5f6368] mb-6">
          <div className="flex space-x-1 p-1">
            {['about', 'projects', 'contact', 'images'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-normal transition-colors ${
                  activeTab === tab
                    ? 'bg-[#1a73e8] text-white'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-[#303134] rounded-lg shadow-sm border border-[#dadce0] dark:border-[#5f6368] p-6"
        >
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">About Content</h2>
                <textarea
                  value={aboutContent}
                  onChange={(e) => setAboutContent(e.target.value)}
                  className="w-full h-64 px-4 py-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors font-mono text-sm"
                  placeholder="Enter your about content here..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveAbout}
                  className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed]">GitHub Repos</h2>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                    Select which repos appear on the Projects page. Order = selection order.
                  </p>
                </div>
                <button
                  onClick={loadContent}
                  disabled={reposLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1a73e8] border border-[#dadce0] dark:border-[#5f6368] rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${reposLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
              </div>

              {reposError && (
                <div className="text-sm text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">{reposError}</div>
              )}

              {/* Selected count + search */}
              {!reposLoading && allRepos.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    <input
                      type="text"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Filter repos…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors"
                    />
                  </div>
                  <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6] shrink-0">
                    {selectedRepos.length} selected
                  </span>
                </div>
              )}

              {/* Repo list */}
              {reposLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse"/>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {allRepos
                    .filter(r => !repoSearch || r.name.toLowerCase().includes(repoSearch.toLowerCase()) || (r.description || '').toLowerCase().includes(repoSearch.toLowerCase()))
                    .map((repo) => {
                      const entry = selectedRepos.find((s) => s.name === repo.name);
                      const isSelected = !!entry;
                      const isFeatured = entry?.featured ?? false;
                      const selIdx = selectedRepos.findIndex((s) => s.name === repo.name);
                      return (
                        <div
                          key={repo.name}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors
                            ${isSelected
                              ? 'border-[#1a73e8] bg-[#e8f0fe] dark:bg-[#1a2744] dark:border-[#4285F4]'
                              : 'border-[#e8eaed] dark:border-[#3c4043] hover:bg-[#f8f9fa] dark:hover:bg-[#2d2e30]'
                            }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setReposSaved(false);
                              setSelectedRepos(prev =>
                                isSelected
                                  ? prev.filter(s => s.name !== repo.name)
                                  : [...prev, { name: repo.name, featured: false, extraTags: [] }]
                              );
                            }}
                            className="mt-1 shrink-0 accent-[#1a73e8]"
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] truncate">{repo.name}</span>
                              {isSelected && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1a73e8] text-white shrink-0">
                                  #{selIdx + 1}
                                </span>
                              )}
                              {repo.language && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] shrink-0">
                                  {repo.language}
                                </span>
                              )}
                              {repo.stars > 0 && (
                                <span className="text-[11px] text-[#9aa0a6] flex items-center gap-0.5 shrink-0">
                                  <svg className="w-3 h-3 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                  {repo.stars}
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 truncate">{repo.description}</p>
                            )}
                            {/* Extra tags — only when selected */}
                            {isSelected && (
                              <ExtraTagsEditor
                                tags={entry?.extraTags ?? []}
                                onChange={(tags) => {
                                  setReposSaved(false);
                                  setSelectedRepos(prev =>
                                    prev.map(s => s.name === repo.name ? { ...s, extraTags: tags } : s)
                                  );
                                }}
                              />
                            )}
                          </div>

                          {/* Featured star toggle — only visible when selected */}
                          {isSelected && (
                            <button
                              title={isFeatured ? 'Remove featured' : 'Mark as featured'}
                              onClick={() => {
                                setReposSaved(false);
                                setSelectedRepos(prev =>
                                  prev.map(s => s.name === repo.name ? { ...s, featured: !s.featured } : s)
                                );
                              }}
                              className="shrink-0 p-1 rounded-full hover:bg-white/60 dark:hover:bg-black/20 transition-colors"
                            >
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

              {/* Save button */}
              {!reposLoading && (
                <div className="flex items-center justify-between pt-2 border-t border-[#e8eaed] dark:border-[#3c4043]">
                  {reposSaved ? (
                    <span className="text-sm text-[#34A853] flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      Saved — Projects page updated
                    </span>
                  ) : <span />}
                  <button
                    disabled={reposSaving}
                    onClick={async () => {
                      setReposSaving(true);
                      setReposSaved(false);
                      try {
                        await saveGithubSelection(selectedRepos);
                        setReposSaved(true);
                      } catch {
                        setReposError('Failed to save selection. Try again.');
                      } finally {
                        setReposSaving(false);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] disabled:opacity-50 transition-colors"
                  >
                    {reposSaving && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    )}
                    {reposSaving ? 'Saving…' : 'Save Selection'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                  Address
                </label>
                <textarea
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo({...contactInfo, address: e.target.value})}
                  className="w-full h-24 px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={saveContact}
                  className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] transition-colors"
                >
                  Save Contact Info
                </button>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed]">Gallery Images</h2>
                {/* Page visibility toggle */}
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                    {imagesPageEnabled ? 'Page visible' : 'Page hidden'}
                  </span>
                  <button
                    onClick={() => toggleImagesPage(!imagesPageEnabled)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none
                      ${imagesPageEnabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0] dark:bg-[#5f6368]'}`}
                    style={{ width: 40, height: 22 }}
                    aria-label="Toggle images page"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200
                      ${imagesPageEnabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Upload form */}
              <div className="border border-[#dadce0] dark:border-[#5f6368] rounded-xl p-4 space-y-4">
                <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">Upload new image</p>

                {/* File picker */}
                <div
                  onClick={() => imgFileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                             border-[#dadce0] dark:border-[#5f6368] hover:border-[#1a73e8] hover:bg-[#f8fafe] dark:hover:bg-[#1a3a5c]/10"
                >
                  {imgPreview ? (
                    <img src={imgPreview} alt="preview" className="max-h-32 rounded-lg object-contain" />
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                        <span className="text-[#1a73e8]">Click to select</span> an image (max 5 MB)
                      </p>
                    </>
                  )}
                  <input ref={imgFileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setImgFile(f);
                      setImgPreview(URL.createObjectURL(f));
                      e.target.value = '';
                    }} />
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Title *</label>
                    <input type="text" value={imgForm.title}
                      onChange={e => setImgForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Portfolio Screenshot"
                      className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Category</label>
                    <select value={imgForm.category}
                      onChange={e => setImgForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors">
                      {['Projects', 'Certificates', 'UI Work', 'Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Link (optional)</label>
                  <input type="url" value={imgForm.link}
                    onChange={e => setImgForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://github.com/... or credential URL"
                    className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Description (optional)</label>
                  <input type="text" value={imgForm.description}
                    onChange={e => setImgForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Short description"
                    className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                </div>

                {galleryError && <p className="text-sm text-[#d93025]">{galleryError}</p>}

                <div className="flex justify-end">
                  <button
                    disabled={imgUploading || !imgFile || !imgForm.title.trim()}
                    onClick={async () => {
                      if (!imgFile || !imgForm.title.trim()) return;
                      setImgUploading(true);
                      setGalleryError('');
                      try {
                        const fd = new FormData();
                        fd.append('image', imgFile);
                        fd.append('title', imgForm.title);
                        fd.append('category', imgForm.category);
                        fd.append('description', imgForm.description);
                        fd.append('link', imgForm.link);
                        await uploadImage(fd);
                        setImgForm({ title: '', category: 'Projects', description: '', link: '' });
                        setImgFile(null);
                        setImgPreview(null);
                        await loadGallery();
                      } catch (err) {
                        setGalleryError(err?.response?.data?.error || 'Upload failed. Try again.');
                      } finally {
                        setImgUploading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-normal hover:bg-[#1967d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {imgUploading && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    )}
                    {imgUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              </div>

              {/* Existing images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
                    Uploaded images ({galleryImages.length})
                  </p>
                  <button onClick={loadGallery} disabled={galleryLoading}
                    className="text-xs text-[#1a73e8] hover:underline disabled:opacity-50">
                    Refresh
                  </button>
                </div>

                {galleryLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="rounded-xl bg-[#f1f3f4] dark:bg-[#2d2e30] animate-pulse" style={{ aspectRatio: '4/3' }} />
                    ))}
                  </div>
                ) : galleryImages.length === 0 ? (
                  <p className="text-sm text-[#9aa0a6] text-center py-8">No images yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryImages.map(img => (
                      <div key={img._id} className="group">
                        {/* Thumbnail */}
                        <div className="relative rounded-xl overflow-hidden bg-[#f1f3f4] dark:bg-[#303134]">
                          <img src={img.imageData} alt={img.title}
                            className="w-full object-cover" style={{ aspectRatio: '4/3' }} />
                          {/* Action buttons on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-start justify-end gap-1.5 p-2 opacity-0 group-hover:opacity-100">
                            {/* Edit */}
                            <button
                              onClick={() => setEditingImg({ _id: img._id, title: img.title, category: img.category, description: img.description || '', link: img.link || '' })}
                              className="p-1.5 rounded-full bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z"/>
                              </svg>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${img.title}"?`)) return;
                                try {
                                  await deleteImage(img._id);
                                  setGalleryImages(prev => prev.filter(i => i._id !== img._id));
                                } catch { setGalleryError('Delete failed.'); }
                              }}
                              className="p-1.5 rounded-full bg-[#d93025] text-white hover:bg-[#b31412] transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        {/* Info below */}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                     onClick={() => setEditingImg(null)}>
                  <div className="bg-white dark:bg-[#303134] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
                       onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-[#202124] dark:text-[#e8eaed]">Edit image</p>
                      <button onClick={() => setEditingImg(null)}
                        className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Title *</label>
                        <input type="text" value={editingImg.title}
                          onChange={e => setEditingImg(v => ({ ...v, title: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Category</label>
                        <select value={editingImg.category}
                          onChange={e => setEditingImg(v => ({ ...v, category: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors">
                          {['Projects', 'Certificates', 'UI Work', 'Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Link (optional)</label>
                      <input type="url" value={editingImg.link}
                        onChange={e => setEditingImg(v => ({ ...v, link: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1">Description (optional)</label>
                      <input type="text" value={editingImg.description}
                        onChange={e => setEditingImg(v => ({ ...v, description: e.target.value }))}
                        placeholder="Short description"
                        className="w-full px-3 py-2 text-sm border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-colors" />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setEditingImg(null)}
                        className="px-4 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button
                        disabled={editSaving || !editingImg.title.trim()}
                        onClick={async () => {
                          setEditSaving(true);
                          try {
                            const updated = await updateImage(editingImg._id, {
                              title: editingImg.title,
                              category: editingImg.category,
                              description: editingImg.description,
                              link: editingImg.link,
                            });
                            setGalleryImages(prev => prev.map(i => i._id === updated._id ? updated : i));
                            setEditingImg(null);
                          } catch { setGalleryError('Update failed.'); }
                          finally { setEditSaving(false); }
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-normal hover:bg-[#1967d2] disabled:opacity-50 transition-colors"
                      >
                        {editSaving && (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        )}
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
